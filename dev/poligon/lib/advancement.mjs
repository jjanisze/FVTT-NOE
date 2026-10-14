/**
 * Characters through dnd5e's real advancement path (PLAN_human_testing.md §3.4) — the same
 * AdvancementManager a player walks when dropping a class on the sheet, driven step by step the way
 * the `postac` e2e suite drives it (`dev/e2e/suites/postac.mjs`, factored here), plus the Subclass step
 * a profession needs. A persona built this way carries exactly what a table-made character carries:
 * Kość Wytrzymałości, skill choices, granted and chosen features, scale values, the profession's picks.
 *
 * `picks[stepTitle]` names what to choose: skill labels in a Trait step, item names in an ItemChoice
 * step, the subclass name in the Subclass step; anything unnamed takes the first options. Returns every
 * step seen as "Type:title" — what the Obsada build log shows.
 */

/**
 * Waits that survive a hidden tab. Chrome throttles timers in background windows to once a second, and
 * after five minutes hidden to once a minute — the e2e suite's GM window built 15 personas in ten
 * minutes instead of 42 in five. A MessageChannel round-trip is not throttled, so while the page is
 * hidden a wait yields through it instead of a timer.
 */
const yieldOnce = () => new Promise(r => {
  const c = new MessageChannel();
  c.port1.onmessage = () => r();
  c.port2.postMessage(null);
});

export async function sleep(ms) {
  if (!document.hidden) return new Promise(r => setTimeout(r, ms));
  const end = performance.now() + ms;
  while (performance.now() < end) await yieldOnce();
}

async function until(fn, { timeoutMs = 10_000, intervalMs = 100, message = "condition" } = {}) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Poligon advancement: timed out waiting for ${message}`);
    await sleep(intervalMs);
  }
}

const managers = () => [...foundry.applications.instances.values()].filter(x => x.constructor.name === "AdvancementManager");

/** Start a manager for a new item on `actor` (class, subclass, background…) and walk it. */
export async function addWithAdvancement(actor, itemData, { picks = {} } = {}) {
  const AM = dnd5e.applications.advancement.AdvancementManager;
  const before = new Set(managers());
  const mgr = AM.forNewItem(actor, itemData);
  if (!mgr.steps.length) {
    // Nothing to advance (a Sztuczka, a plain feat): the manager would do nothing — create directly.
    const [doc] = await actor.createEmbeddedDocuments("Item", [itemData]);
    return { steps: [], item: doc?.id ?? null };
  }
  mgr.render(true);
  return { steps: await walk(mgr, picks, before) };
}

/** Raise a class by `delta` levels through the manager (what the sheet's level-up button does). */
export async function levelUp(actor, classItem, delta, { picks = {} } = {}) {
  const AM = dnd5e.applications.advancement.AdvancementManager;
  const before = new Set(managers());
  const mgr = AM.forLevelChange(actor, classItem.id, delta);
  if (!mgr.steps.length) {
    await classItem.update({ "system.levels": classItem.system.levels + delta });
    return { steps: [] };
  }
  mgr.render(true);
  return { steps: await walk(mgr, picks, before) };
}

async function walk(mgr, picks, before) {
  const seen = [];
  await until(() => mgr.rendered, { message: "the advancement window", timeoutMs: 15_000 });
  for (let i = 0; i < 60; i++) {
    // Automatic steps run themselves on render; when the manager closes, we are done.
    if (!mgr.rendered && !mgr.step) return seen;
    await until(() => !mgr.rendered || mgr.step?.flow?.form?.isConnected || mgr.step?.flow?.element?.isConnected,
      { timeoutMs: 15_000, message: "the step's form" });
    if (!mgr.rendered) return seen;
    await sleep(120);
    const flow = mgr.step?.flow;
    const type = flow?.advancement?.constructor?.name ?? "?";
    const title = flow?.title ?? flow?.advancement?.title ?? "?";
    seen.push(`${type.replace("Advancement", "")}:${title}`);
    const want = [picks[title] ?? []].flat();
    const el = mgr.element;

    if (type === "TraitAdvancement") {
      for (let k = 0; k < 12; k++) {
        const sel = mgr.element.querySelector('select[name="added"]');
        const options = sel ? [...sel.options].filter(o => o.value && !o.disabled) : [];
        if (!options.length) break;
        const opt = options.find(o => want.includes(o.textContent.trim())) ?? options[0];
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(250);
      }
    } else if (type === "ItemChoiceAdvancement") {
      const count = flow.advancement.configuration.choices?.[flow.level]?.count ?? 1;
      const rows = [...el.querySelectorAll("[data-uuid]")].filter(r => r.querySelector("dnd5e-checkbox"));
      const ordered = [...want.flatMap(w => rows.filter(r => r.innerText.includes(w))), ...rows];
      const chosen = new Set();
      for (const row of ordered) {
        if (chosen.size >= count) break;
        if (chosen.has(row)) continue;
        const box = row.querySelector("dnd5e-checkbox");
        if (box.checked || box.disabled) continue;
        box.checked = true;
        box.dispatchEvent(new Event("change", { bubbles: true }));
        chosen.add(row);
        await sleep(200);
      }
    } else if (type === "HitPointsAdvancement") {
      // Above level 1 dnd5e wants a roll or "Take average"; the module's PW are flat anyway (actors/pw.mjs).
      const avg = el.querySelector('dnd5e-checkbox[name="useAverage"]');
      if (avg && !avg.checked) {
        avg.checked = true;
        avg.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(250);
      }
    } else if (type === "SubclassAdvancement") {
      const uuid = await subclassUuid(flow.item ?? flow.advancement.item, want[0]);
      if (!uuid) throw new Error(`Poligon advancement: no subclass for ${flow.advancement.item?.name} (${want[0] ?? "first"})`);
      await flow.advancement.apply(flow.level, { uuid });
      await flow.render();
      await sleep(250);
    }

    const btn = mgr.element.querySelector('button[data-action="complete"]') ?? mgr.element.querySelector('button[data-action="next"]');
    if (!btn) throw new Error(`Poligon advancement: no Next/Complete on step ${type}:${title}`);
    btn.click();
    // "Complete" is not always the end: a subclass's own picks are synthesized only after its step is
    // applied, so the manager may move on instead of closing. dnd5e keeps the manager on a step it
    // refused and stores why — report that, not a timeout.
    const refused = () => (mgr.step?.error ? mgr.step.error.message : null);
    await until(() => !mgr.rendered || refused() || (mgr.step?.flow && mgr.step.flow !== flow),
      { timeoutMs: 20_000, message: `the step after ${type}:${title}` });
    if (!mgr.rendered) return seen;
    if (refused() && mgr.step?.flow === flow) throw new Error(`Poligon advancement: ${type}:${title} refused — ${refused()}`);
    await sleep(150);
  }
  throw new Error(`Poligon advancement did not finish: ${seen.join(" → ")}`);
}

/** A profession (dnd5e subclass) of `classItem` from the module's `profesje` pack, by name or first. */
async function subclassUuid(classItem, name) {
  const pack = game.packs.get("neuroshima-2026-overrides.profesje");
  const index = await pack.getIndex({ fields: ["system.classIdentifier"] });
  const own = index.filter(e => e.system?.classIdentifier === classItem.system.identifier);
  const hit = (name && own.find(e => e.name.toLowerCase() === String(name).toLowerCase())) ?? own[0];
  return hit?.uuid ?? null;
}
