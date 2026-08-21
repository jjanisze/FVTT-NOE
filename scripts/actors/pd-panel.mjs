/**
 * Neuroshima 5e — Punkty Doświadczenia (PD) panel.
 *
 * Neuroshima splits XP between GM-assigned group PD and personal PD that each
 * player tracks themselves (rules § 7.1). The sheet needs both, plus a log of what
 * earned the personal points, because two of the three categories require naming
 * the thing that triggered them.
 *
 * Personal categories (5 PD each):
 *   Pierwsze Spotkanie   a new enemy type that forced an RO na Mądrość — name it
 *   Nowy obszar          a named significant location visited — name it
 *   Stopień Zranienia    an injury taken in combat (auto-awarded, see below)
 *
 * Group PD is entered by the GM: 10–50 per session, or a flat 10 per hour.
 * Przechwałki (10 PD each, max 30/session) and Nagroda publiczności are logged the
 * same way. A GM running milestone levelling can simply ignore the whole panel.
 *
 * Storage: `flags.neuroshima-2026-overrides.pd = { total, log: [...] }`
 */

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "pd";

/** Rules § 19.1 — hard cap at 12. */
export const PD_THRESHOLDS = [
  0, 50, 150, 300, 500, 800, 1100, 1400, 1900, 2400, 2900, 3400
];

export const PD_SOURCES = {
  spotkanie:   { label: "Pierwsze Spotkanie", value: 5,  needsNote: true,
                 hint: "Nowy typ wroga, który wymusił RO na Mądrość" },
  obszar:      { label: "Nowy obszar",        value: 5,  needsNote: true,
                 hint: "Odwiedzona, nazwana znacząca lokacja" },
  zranienie:   { label: "Stopień Zranienia",  value: 5,  needsNote: false,
                 hint: "Zranienie otrzymane w walce" },
  przechwalki: { label: "Przechwałki",        value: 10, needsNote: true,
                 hint: "Unikalna przechwałka (max 30 PD na sesję)" },
  publicznosc: { label: "Nagroda publiczności", value: 10, needsNote: false,
                 hint: "Głosowanie współgraczy" },
  grupowe:     { label: "PD grupowe",         value: 0,  needsNote: false,
                 hint: "Przyznane przez MG za postęp misji (10–50 / sesja)" }
};

/* -------------------------------------------- */
/*  Data                                         */
/* -------------------------------------------- */

export function getPD(actor) {
  const raw = actor?.getFlag(MODULE_ID, FLAG) ?? {};
  return { total: Number(raw.total) || 0, log: Array.isArray(raw.log) ? raw.log : [] };
}

/** Level implied by a PD total (1–12). */
export function levelForPD(pd) {
  let level = 1;
  for (let i = 0; i < PD_THRESHOLDS.length; i++) if (pd >= PD_THRESHOLDS[i]) level = i + 1;
  return level;
}

/** Progress toward the next level. */
export function pdProgress(pd) {
  const level = levelForPD(pd);
  if (level >= 12) return { level, next: null, into: 0, span: 0, pct: 100 };
  const floor = PD_THRESHOLDS[level - 1];
  const next = PD_THRESHOLDS[level];
  const span = next - floor;
  const into = pd - floor;
  return { level, next, into, span, pct: Math.round((into / span) * 100) };
}

export async function awardPD(actor, sourceKey, { note = "", value = null } = {}) {
  const source = PD_SOURCES[sourceKey];
  if (!source) return null;

  const amount = Number(value ?? source.value) || 0;
  if (!amount) return null;

  const { total, log } = getPD(actor);
  const entry = {
    id: foundry.utils.randomID(),
    source: sourceKey,
    label: source.label,
    value: amount,
    note: String(note ?? "").trim(),
    at: Date.now(),
    by: game.user.name
  };

  const nextTotal = Math.max(0, total + amount);
  await actor.setFlag(MODULE_ID, FLAG, { total: nextTotal, log: [...log, entry] });

  const before = levelForPD(total);
  const after = levelForPD(nextTotal);
  if (after > before) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-pd-levelup"><strong>${actor.name}</strong> osiąga `
        + `<strong>${after}. poziom</strong>! (${nextTotal} PD)</div>`
    });
  }
  return entry;
}

export async function removePDEntry(actor, entryId) {
  const { total, log } = getPD(actor);
  const entry = log.find(e => e.id === entryId);
  if (!entry) return false;
  await actor.setFlag(MODULE_ID, FLAG, {
    total: Math.max(0, total - entry.value),
    log: log.filter(e => e.id !== entryId)
  });
  return true;
}

/* -------------------------------------------- */
/*  Sheet injection                              */
/* -------------------------------------------- */

function _panelHtml(actor) {
  const { total, log } = getPD(actor);
  const p = pdProgress(total);
  const isGM = game.user.isGM;

  const rows = [...log].reverse().slice(0, 12).map(e => `
    <li class="neuro-pd-entry" data-entry-id="${e.id}">
      <span class="neuro-pd-entry-val">+${e.value}</span>
      <span class="neuro-pd-entry-label">${foundry.utils.escapeHTML(e.label)}</span>
      ${e.note ? `<span class="neuro-pd-entry-note">${foundry.utils.escapeHTML(e.note)}</span>` : ""}
      <a class="neuro-pd-remove" data-entry-id="${e.id}" data-tooltip="Usuń wpis">
        <i class="fas fa-times"></i></a>
    </li>`).join("");

  const buttons = Object.entries(PD_SOURCES)
    .filter(([key]) => key !== "grupowe" || isGM)
    .map(([key, s]) => `
      <button type="button" class="neuro-pd-add" data-source="${key}"
              data-tooltip="${foundry.utils.escapeHTML(s.hint)}">
        ${foundry.utils.escapeHTML(s.label)}${s.value ? ` +${s.value}` : ""}
      </button>`).join("");

  return `
    <div class="neuro-pd-panel">
      <header class="neuro-pd-head">
        <h3>Punkty Doświadczenia</h3>
        <span class="neuro-pd-total">${total} PD</span>
      </header>
      <div class="neuro-pd-progress" data-tooltip="${
        p.next === null ? "Maksymalny poziom" : `${p.into} / ${p.span} PD do ${p.level + 1}. poziomu`}">
        <div class="neuro-pd-bar" style="width:${p.pct}%"></div>
        <span class="neuro-pd-progress-label">
          poz. ${p.level}${p.next === null ? " — maks." : ` · ${p.next - total} PD do ${p.level + 1}`}
        </span>
      </div>
      <div class="neuro-pd-buttons">${buttons}</div>
      ${log.length ? `<ul class="neuro-pd-log">${rows}</ul>` : `<p class="neuro-pd-empty">Brak wpisów.</p>`}
    </div>`;
}

async function _promptNote(source) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: source.label },
    content: `<p>${foundry.utils.escapeHTML(source.hint)}</p>
      <input type="text" name="note" placeholder="Nazwa (np. Gangus Kapo / Ruiny Detroit)" autofocus>`,
    ok: {
      label: "Dodaj",
      callback: (_ev, button) => button.form.elements.note.value
    },
    rejectClose: false
  });
}

async function _promptAmount() {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: "PD grupowe" },
    content: `<p>Ile PD przyznajesz? (10–50 za postęp misji lub 10 za godzinę gry)</p>
      <input type="number" name="value" value="10" min="0" step="5" autofocus>`,
    ok: {
      label: "Przyznaj",
      callback: (_ev, button) => Number(button.form.elements.value.value) || 0
    },
    rejectClose: false
  });
}

function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".neuro-pd-panel")) return;

  const anchor = root.querySelector("section[data-tab='details'], .tab[data-tab='details']")
    ?? root.querySelector("section[data-tab='biography'], .tab[data-tab='biography']");
  if (!anchor) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = _panelHtml(actor);
  const panel = wrap.firstElementChild;

  panel.querySelectorAll(".neuro-pd-add").forEach(btn => {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const key = ev.currentTarget.dataset.source;
      const source = PD_SOURCES[key];
      if (!source) return;

      let note = "";
      let value = null;
      if (key === "grupowe") {
        value = await _promptAmount();
        if (!value) return;
      } else if (source.needsNote) {
        note = await _promptNote(source);
        if (note === null || note === undefined) return;
      }
      await awardPD(actor, key, { note, value });
      app.render(false);
    });
  });

  panel.querySelectorAll(".neuro-pd-remove").forEach(a => {
    a.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      await removePDEntry(actor, ev.currentTarget.dataset.entryId);
      app.render(false);
    });
  });

  anchor.prepend(panel);
}

/* -------------------------------------------- */

export function registerPDPanel() {
  for (const hook of ["renderCharacterActorSheet", "renderActorSheet"]) {
    Hooks.on(hook, _onRenderSheet);
  }

  // Auto-award for Stopień Zranienia — the one personal category the system can
  // observe directly. `zranienie.mjs` raises the level; award once per increase.
  Hooks.on("updateActor", async (actor, changed, _opts, userId) => {
    if (game.user.id !== userId) return;
    if (actor.type !== "character") return;
    const level = foundry.utils.getProperty(changed, `flags.${MODULE_ID}.zranienie.level`);
    if (!Number.isInteger(level) || level <= 0) return;
    if (!game.combat) return;      // rules: only injuries taken in combat count
    await awardPD(actor, "zranienie", { note: `Stopień ${level}` });
  });

  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.pd = { getPD, awardPD, removePDEntry, levelForPD, pdProgress, PD_THRESHOLDS };
  }

  console.log(`${MODULE_ID} | PD panel registered`);
}
