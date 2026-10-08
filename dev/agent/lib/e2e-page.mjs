/**
 * `window.__e2e` — the helpers every layer-6 client carries, so suite functions (serialised into
 * the browser, no closures) stop re-writing the same loops. Installed by the e2e harness after
 * each (re)load, idempotent. Field test 2026-10-07, PLAN_agentic_improvements.md §9 items 3, 6, 7,
 * 9–11:
 *
 *   __e2e.forceD20([20, 3])          next dice land on these d20 faces (then `fallback`, default the
 *                                    real generator); restoreDice() undoes it. v14 rolls
 *                                    face = ceil((1 − u) · faces) — `u(face)` does the inversion
 *   __e2e.pressRollDialog("normal")  press a button in dnd5e's roll configuration window
 *   __e2e.clickDialog({title}, "ok") click an action in a dialog found by title, never one already
 *                                    clicked (a closing window keeps `rendered` for a moment)
 *   __e2e.clickChat(id, selector)    click a button inside one chat card of this client's log
 *   __e2e.until(fn), timeout(p, ms)  bounded waits — `timeout` for calls that can hang on a fresh
 *                                    client (ui.controls.activate did)
 *   __e2e.quiet()                    no socket request in flight, no canvas animation, for a moment
 *   __e2e.writes                     with tracing on: every document write, with a short stack
 */

/* Runs in the page: no references to anything outside this function. */
export function installE2E({ trace = false } = {}) {
  const VERSION = 2;
  if (window.__e2e?.version === VERSION) {
    window.__e2e.trace = trace;
    return { installed: false, trace };
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const apps = () => [...foundry.applications.instances.values()];
  const titleOf = app => String(app.title ?? app.options?.window?.title ?? "");
  const clicked = new WeakSet();

  const e = {
    version: VERSION, trace, pending: 0, writes: [], lastActivity: Date.now(), originalUniform: null,
    sleep,

    async until(fn, { timeoutMs = 10_000, intervalMs = 100, message = "condition" } = {}) {
      const end = Date.now() + timeoutMs;
      let last;
      while (Date.now() < end) {
        last = await fn();
        if (last) return last;
        await sleep(intervalMs);
      }
      throw new Error(`__e2e.until: timed out after ${timeoutMs} ms waiting for ${message}`);
    },

    /** Resolve with `value` instead of hanging when `promise` does not settle within `ms`. */
    timeout(promise, ms, value = "timeout") {
      return Promise.race([promise, sleep(ms).then(() => value)]);
    },

    /** The randomUniform value that makes a `faces`-sided die land on `face` (v14 core). */
    u(face, faces = 20) {
      return (faces - face + 0.5) / faces;
    },

    /**
     * Queue d20 faces for the next dice rolled in this client — every die draws from the queue in
     * roll order, so put only d20s where only d20s roll. Empty queue → `fallback` (a face) or the
     * real generator.
     */
    forceD20(faces, { fallback = null } = {}) {
      e.originalUniform ??= CONFIG.Dice.randomUniform;
      const queue = [...faces];
      CONFIG.Dice.randomUniform = () => (queue.length ? e.u(queue.shift())
        : fallback !== null ? e.u(fallback) : e.originalUniform());
      return queue.length;
    },

    restoreDice() {
      if (e.originalUniform) CONFIG.Dice.randomUniform = e.originalUniform;
      e.originalUniform = null;
    },

    /** Apps (ApplicationV2) currently rendered that match {title, className, action}. */
    findApps({ title = null, className = null, action = null } = {}) {
      return apps().filter(app => app.rendered && app.element && !clicked.has(app)
        && (!title || (title instanceof RegExp ? title.test(titleOf(app)) : titleOf(app).includes(title)))
        && (!className || new RegExp(className).test(app.constructor.name))
        && (!action || app.element.querySelector(`[data-action="${action}"]`)));
    },

    /** Wait for a dialog and click one of its actions; returns its title, or null when none came. */
    async clickDialog(match, action, { timeoutMs = 8000 } = {}) {
      const app = await e.until(() => e.findApps({ ...match, action })[0], { timeoutMs, message: `dialog ${JSON.stringify(match)} with ${action}` })
        .catch(() => null);
      if (!app) return null;
      clicked.add(app);
      app.element.querySelector(`[data-action="${action}"]`).click();
      await e.until(() => !app.rendered, { timeoutMs: 3000 }).catch(() => {});
      return titleOf(app);
    },

    /** dnd5e's roll configuration window (attack, check, save, damage): press `button`. */
    async pressRollDialog(button = "normal", { timeoutMs = 8000 } = {}) {
      return Boolean(await e.clickDialog({ className: "RollConfigurationDialog" }, button, { timeoutMs }));
    },

    /** Click `selector` inside chat message `messageId` in this client's own log (waits for it). */
    async clickChat(messageId, selector, { timeoutMs = 8000 } = {}) {
      const btn = await e.until(() => {
        const b = (ui.chat.element ?? document).querySelector(`[data-message-id="${messageId}"] ${selector}`);
        return b && !b.disabled ? b : null;
      }, { timeoutMs, message: `${selector} on message ${messageId}` }).catch(() => null);
      if (!btn) return false;
      btn.click();
      return true;
    },

    /** Nothing in flight: no socket request, no canvas animation, quiet for `idleMs`. */
    async quiet({ idleMs = 400, timeoutMs = 10_000 } = {}) {
      const animations = () => Object.keys(foundry.canvas?.animation?.CanvasAnimation?.animations ?? {}).length;
      const t0 = Date.now();
      await e.until(() => e.pending === 0 && !animations() && Date.now() - e.lastActivity >= idleMs,
        { timeoutMs, intervalMs: 50, message: "quiet" }).catch(() => {});
      return { pending: e.pending, animations: animations(), ms: Date.now() - t0 };
    }
  };

  // Every document write goes through SocketInterface.dispatch (client-backend.mjs) — counted for
  // quiet(), recorded with a short stack when tracing (the "who writes to the dead scene" probe).
  const SI = foundry.helpers.SocketInterface;
  const dispatch = SI.dispatch;
  SI.dispatch = function (eventName, request) {
    e.pending++;
    e.lastActivity = Date.now();
    if (e.trace) {
      const reqs = Array.isArray(request) ? request : [request];
      e.writes.push({
        at: new Date().toISOString(), event: eventName,
        ops: reqs.map(r => `${r?.action ?? "?"} ${r?.type ?? "?"}${r?.operation?.parentUuid ? ` in ${r.operation.parentUuid}` : ""}`),
        // Paths only: an origin carries host and port, which never go into a file.
        stack: (new Error().stack ?? "").split("\n").slice(2, 10).map(s => s.trim().replace(/https?:\/\/[^/\s)]+/g, "")).join(" | ")
      });
      if (e.writes.length > 500) e.writes.splice(0, e.writes.length - 500);
    }
    return dispatch.call(this, eventName, request).finally(() => {
      e.pending--;
      e.lastActivity = Date.now();
    });
  };

  window.__e2e = e;
  return { installed: true, trace };
}
