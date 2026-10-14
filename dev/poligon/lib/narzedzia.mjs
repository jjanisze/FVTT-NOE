/**
 * The panel's small tools (PLAN_human_testing.md §3.5): Kości, Liczniki, Świeżość, Wariant, Czas.
 * Everything here is client-local or goes through the module's own funnels.
 */

import { MODULE_ID } from "./guard.mjs";
import { setBadge } from "./banner.mjs";
import { stamp } from "./state.mjs";

/* -------------------------------------------- */
/*  Kości — rigged dice on THIS client           */
/* -------------------------------------------- */

/**
 * The next die of a size lands on a chosen face: `rig([20])`, `rig([1], 20)`, `rig([6, 6], 6)`.
 * Unlike the e2e `forceD20` (one global queue over `randomUniform`), each entry waits for a die of its
 * own size, so a d6 rolled first does not eat the d20's face. Consumed once; badge while armed.
 * Client-local by nature: it rigs the dice rolled in this browser — at a player's seat, rig there.
 */
const queue = [];
let original = null;

export function installDice() {
  if (original) return;
  const DT = foundry.dice.terms.DiceTerm;
  original = DT.prototype.randomFace;
  DT.prototype.randomFace = function poligonRandomFace() {
    const i = queue.findIndex(q => q.faces === this.faces);
    if (i < 0) return original.call(this);
    const [q] = queue.splice(i, 1);
    badge();
    console.log(`Poligon | Kości: k${q.faces} → ${q.face} (ustawione)`);
    return q.face;
  };
}

function badge() {
  setBadge("kosci", queue.length ? `KOŚCI: ${queue.map(q => (q.faces === 20 ? q.face : `${q.face}/k${q.faces}`)).join(", ")}` : null);
}

export const kosci = {
  rig(faces, size = 20) {
    for (const f of [faces].flat()) queue.push({ face: Math.max(1, Math.min(size, Number(f))), faces: size });
    badge();
    return [...queue];
  },
  clear() {
    queue.length = 0;
    badge();
  },
  queue: () => [...queue]
};

/* -------------------------------------------- */
/*  Liczniki — what a click costs                */
/* -------------------------------------------- */

const counters = { since: Date.now(), messages: 0, writes: 0, byType: {}, frames: [], sampling: false };
let tickerFn = null;

export function installCounters() {
  if (counters.installed) return;
  counters.installed = true;
  Hooks.on("createChatMessage", () => { counters.messages++; });
  const SI = foundry.helpers.SocketInterface;
  const dispatch = SI.dispatch;
  SI.dispatch = function (eventName, request) {
    if (eventName === "modifyDocument") {
      for (const r of [request].flat()) {
        const n = r?.operation?.data?.length ?? r?.operation?.updates?.length ?? r?.operation?.ids?.length ?? 1;
        counters.writes += n;
        const k = `${r?.action ?? "?"} ${r?.type ?? "?"}`;
        counters.byType[k] = (counters.byType[k] ?? 0) + n;
      }
    }
    return dispatch.call(this, eventName, request);
  };
}

export const liczniki = {
  reset() {
    Object.assign(counters, { since: Date.now(), messages: 0, writes: 0, byType: {}, frames: [] });
  },
  read() {
    const f = [...counters.frames].sort((a, b) => a - b);
    const p = q => (f.length ? f[Math.min(f.length - 1, Math.floor(q * f.length))] : null);
    return {
      since: new Date(counters.since).toISOString(), seconds: Math.round((Date.now() - counters.since) / 1000),
      messages: counters.messages, writes: counters.writes,
      top: Object.entries(counters.byType).sort((a, b) => b[1] - a[1]).slice(0, 6),
      frames: counters.sampling || f.length ? { n: f.length, p50: p(0.5), p95: p(0.95), max: f.at(-1) ?? null } : null,
      sampling: counters.sampling
    };
  },
  /** Frame time sampling on the canvas ticker (ms per frame), toggled. */
  frames(on = !counters.sampling) {
    const ticker = canvas.app?.ticker;
    if (!ticker) return false;
    if (on && !tickerFn) {
      tickerFn = () => {
        counters.frames.push(ticker.deltaMS);
        if (counters.frames.length > 3000) counters.frames.shift();
      };
      ticker.add(tickerFn);
    } else if (!on && tickerFn) {
      ticker.remove(tickerFn);
      tickerFn = null;
    }
    counters.sampling = Boolean(tickerFn);
    return counters.sampling;
  }
};

/* -------------------------------------------- */
/*  Świeżość — is what I judge what is current?  */
/* -------------------------------------------- */

/** Module and Poligon scripts this page loaded whose file is newer than the page (→ Ctrl+Shift+R). */
async function changedScripts() {
  const loadedAt = performance.timeOrigin;
  const urls = [...new Set(performance.getEntriesByType("resource").map(e => e.name)
    .filter(u => /\/(modules\/neuroshima-2026-overrides|agent-poligon)\/.+\.(mjs|js|css|hbs)(\?|$)/.test(u))
    .map(u => u.split("?")[0]))];
  const changed = [];
  let unknown = 0;
  await Promise.all(urls.map(async u => {
    try {
      const r = await fetch(u, { method: "HEAD", cache: "no-store" });
      const lm = Date.parse(r.headers.get("last-modified") ?? "");
      if (Number.isNaN(lm)) unknown++;
      else if (lm > loadedAt + 1000) changed.push(new URL(u).pathname);
    } catch {
      unknown++;
    }
  }));
  return { checked: urls.length, changed: changed.sort(), unknown };
}

export const swiezosc = {
  async check({ scripts = true } = {}) {
    const s = await stamp();
    const out = {
      loadedAt: new Date(performance.timeOrigin).toISOString(),
      commit: s?.commit ?? null, subject: s?.subject ?? null, dirty: s?.dirty ?? null, stampAt: s?.at ?? null,
      packs: s?.packs ?? null, classData: s?.classData ?? null,
      module: game.modules.get(MODULE_ID)?.version ?? null
    };
    if (scripts) out.scripts = await changedScripts();
    return out;
  }
};

/* -------------------------------------------- */
/*  Wariant — NOE / WKK and the client's look    */
/* -------------------------------------------- */

/** World-scope boolean settings of the module that the GM may flip (Kobalt and its sub-switches first). */
export function przelaczniki() {
  const list = [...game.settings.settings.values()]
    .filter(s => s.namespace === MODULE_ID && s.scope === "world" && s.config && (s.type === Boolean || s.type?.name === "Boolean"));
  const order = k => (k === "kobaltEnabled" ? 0 : k.startsWith("kobalt") ? 1 : 2);
  return list.sort((a, b) => order(a.key) - order(b.key) || a.key.localeCompare(b.key))
    .map(s => ({ key: s.key, name: game.i18n.localize(s.name ?? s.key), value: game.settings.get(MODULE_ID, s.key) }));
}

export const wariant = {
  przelaczniki,
  current() {
    const k = game.settings.get(MODULE_ID, "kobaltEnabled");
    return k ? "WKK" : "NOE";
  },
  /**
   * NOE: Kobalt and its sub-switches off (`kobalt*`, anything named "(WKK)") · WKK: all on. Optional NOE rules
   * (Wytrzymałość pancerzy, s. 115) are not house rules and stay as they are; RAI is never gated
   * (scripts/wkk/README.md).
   */
  async preset(name) {
    const on = String(name).toUpperCase() === "WKK";
    for (const s of przelaczniki().filter(x => x.key.startsWith("kobalt") || /\(WKK\)/.test(x.name))) {
      if (s.value !== on) await game.settings.set(MODULE_ID, s.key, on);
    }
    wariant.badge();
    return wariant.current();
  },
  async set(key, value) {
    await game.settings.set(MODULE_ID, key, value);
    wariant.badge();
  },
  badge() {
    setBadge("wariant", wariant.current(), "wariant");
  },
  /** This client's colour scheme and scale (core uiConfig, client scope). */
  async ui({ scheme, uiScale, fontScale } = {}) {
    const cfg = foundry.utils.deepClone(game.settings.get("core", "uiConfig"));
    if (scheme !== undefined) cfg.colorScheme = { applications: scheme, interface: scheme };
    if (uiScale !== undefined) cfg.uiScale = uiScale;
    if (fontScale !== undefined) cfg.fontScale = fontScale;
    await game.settings.set("core", "uiConfig", cfg);
    return cfg;
  }
};

/* -------------------------------------------- */
/*  Czas — the clock and the turn                */
/* -------------------------------------------- */

export const czas = {
  /** Minutes, through the module's clock funnel (world-clock.mjs: chat line + tick) — every time hook sees it. */
  async advance(minutes) {
    const t = game.neuroshima?.time;
    if (t?.advance) return t.advance(minutes);
    return game.time.advance(minutes * 60);
  },
  async runda() {
    if (game.combat?.started) return game.combat.nextRound();
    return game.time.advance(CONFIG.time?.roundTime ?? 6);
  },
  async tura() {
    if (game.combat?.started) return game.combat.nextTurn();
    return null;
  },
  /** dnd5e rests on the GM's chosen actors (the selected tokens, else the party), the native windows. */
  async odpoczynek(type) {
    const actors = canvas.tokens?.controlled.map(t => t.actor).filter(a => a?.type === "character");
    const list = actors?.length ? actors : (game.actors.party?.system.members.map(m => m.actor ?? game.actors.get(m)).filter(Boolean) ?? []);
    if (!list.length) return ui.notifications.warn("Poligon: zaznacz żetony postaci (albo ustaw Drużynę Poligonu).");
    for (const a of list) await (type === "long" ? a.longRest() : a.shortRest());
    return list.length;
  },
  /** Zachód słońca — the module's daily disease check (health panel), for the party or the selection. */
  async zachod() {
    const h = game.neuroshima?.health;
    if (!h?.sunsetCheck) return ui.notifications.warn("Poligon: brak game.neuroshima.health.sunsetCheck.");
    return h.sunsetCheck();
  }
};
