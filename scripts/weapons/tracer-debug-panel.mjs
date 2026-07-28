/**
 * Neuroshima 5e — GM-only tracer VFX debug/tuning panel.
 *
 * A lightweight draggable HTML panel (no ApplicationV2 dependency) that lets the GM
 * tune the procedural tracer engine live: edit parameters, re-bake textures, fire test
 * volleys per fire-mode, and watch performance counters.
 *
 * Open with `game.neuroshima.vfx.panel()`, or via the "Tracer VFX" button in the Token
 * scene-controls toolbar (only rendered for the GM — see registerTracerDebugPanelControls()).
 *
 * TWO EDIT SCOPES, shown in the strip under the perf readout:
 *   no caliber selected → sliders write to the global TUNE (all weapons)
 *   caliber selected    → sliders write to THAT caliber's `visual` override in
 *                         CALIBER_VFX, and a ● marks each field it overrides
 *
 * The split exists because every caliber now ships real visual defaults. A
 * slider permanently bound to TUNE would look broken for any overridden field,
 * since the override always wins at bake time.
 *
 * Edits are IN-MEMORY. `caliber-vfx.mjs` remains the source of truth — press
 * "Eksport" to copy a paste-ready block (minimal delta vs TUNE) for that file.
 * Texture-affecting values re-bake automatically: `rebake()` for global edits,
 * the cheaper `invalidateVisualCache()` for per-caliber ones.
 */

import { TUNE, rebake, invalidateVisualCache, tracerFire, tracerFireArea, stats, clearAll, visibleTracerCount } from "./tracer-vfx.mjs";
import { playShotSound, playBurstSound } from "./sounds.mjs";
import { buildCaliberSelect, AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";
import { CALIBER_VFX } from "../config/caliber-vfx.mjs";

const PANEL_ID = "neuro-tracer-vfx-panel";

/**
 * Caliber currently being edited, "" for the global defaults.
 *
 * When a caliber is picked, the sliders below stop editing the global TUNE and
 * start editing THAT caliber's `visual` override in CALIBER_VFX. That is the
 * only arrangement that works now that every caliber ships real overrides: a
 * slider bound to TUNE appears dead for any field the selected caliber
 * overrides, because the override always wins at bake time.
 *
 * Edits are IN-MEMORY only — `caliber-vfx.mjs` stays the source of truth. Use
 * "Eksport" to copy a ready-made replacement block for that file.
 */
let _previewCaliber = "";

/** Params that require a texture re-bake when changed. */
const TEXTURE_PARAMS = new Set([
  "tracerLength", "tracerThickness", "coreColor", "glowColor", "glowBlur",
  "muzzleSize", "muzzleColor",
]);

/** Field definitions: [key, label, type, min, max, step]. */
const FIELDS = [
  ["tracerLength", "Tracer length (px)", "range", 40, 600, 5],
  ["tracerThickness", "Tracer thickness (px)", "range", 1, 24, 1],
  ["coreColor", "Core color", "color"],
  ["glowColor", "Glow color", "color"],
  ["glowBlur", "Glow blur (px)", "range", 0, 30, 1],
  ["speed", "Speed (px/s)", "range", 800, 12000, 100],
  ["spreadPx", "Burst spread (px)", "range", 0, 120, 2],
  ["staggerMs", "Stagger (ms)", "range", 0, 120, 1],
  ["missVeerDeg", "Miss veer (°)", "range", 0, 60, 1],
  ["missVeerJitter", "Miss veer jitter (°)", "range", 0, 30, 1],
  ["missOvershoot", "Miss overshoot (×)", "range", 1, 3, 0.05],
  ["missFadeMs", "Miss fade (ms)", "range", 40, 800, 10],
  ["muzzleSize", "Muzzle size (px)", "range", 24, 240, 4],
  ["muzzleColor", "Muzzle color", "color"],
  ["muzzleScale", "Muzzle scale (×)", "range", 0.2, 2.5, 0.05],
  ["muzzleDurMs", "Muzzle duration (ms)", "range", 20, 300, 5],
  ["areaMsPerRound", "Obszar: ms / nabój", "range", 0, 300, 5],
  ["areaMinMs", "Obszar: min. czas (ms)", "range", 200, 6000, 100],
  ["areaMaxMs", "Obszar: maks. czas (ms)", "range", 500, 12000, 100],
  ["areaSpeedScale", "Obszar: mnożnik prędkości", "range", 0.2, 1.5, 0.05],
  ["maxParticles", "Max particles (cap)", "range", 10, 2000, 10],
  ["mapKnee", "Map: 1:1 knee (rounds)", "range", 1, 20, 1],
  ["mapCompression", "Map: compression", "range", 20, 600, 10],
];

/**
 * Test-fire buttons: [label, rounds, hit, fireMode, area].
 *
 * `area: true` fires into the last template placed on the scene, which is the
 * only way to preview DS/MS/OZ as they actually play — their pacing comes from
 * the area block in TUNE and is much slower than the targeted cadence, so
 * previewing them through tracerFire() would show the wrong thing entirely.
 */
const FIRE_BUTTONS = [
  ["Strzał ✓", 1, true, "p", false],
  ["Strzał ✗", 1, false, "p", false],
  ["KS (3)", 3, true, "ks", false],
  ["DS obszar (30)", 30, true, "ds", true],
  ["MS obszar (200)", 200, true, "ms", true],
  ["OZ obszar (6)", 6, true, "oz", true],
];

let _perfTimer = null;

/**
 * The object the sliders currently write to: a caliber's `visual` block, or the
 * global TUNE. Creates the `visual` object on demand so a caliber that ships
 * without one can still be authored live.
 */
function _editTarget() {
  if (!_previewCaliber) return TUNE;
  const entry = (CALIBER_VFX[_previewCaliber] ??= {});
  return (entry.visual ??= {});
}

/** Effective value of `key` for the current edit target, falling back to TUNE. */
function _effective(key) {
  const t = _editTarget();
  return t[key] ?? TUNE[key];
}

/** True when the selected caliber explicitly overrides `key`. */
function _isOverridden(key) {
  return !!_previewCaliber && Object.hasOwn(_editTarget(), key);
}

/**
 * Render the slider rows for whatever is currently being edited.
 * Re-run on caliber change: the values shown, and which fields are marked as
 * overridden, both depend on the edit target.
 */
function _buildRows() {
  return FIELDS.map(([key, label, type, min, max, step]) => {
    const v = _effective(key);
    const over = _isOverridden(key) ? ' <span class="ntv-ov" title="nadpisane przez ten kaliber">●</span>' : "";
    if (type === "color") {
      return `<div class="ntv-row"><label>${label}${over}</label>
        <input type="color" data-key="${key}" value="${v}"></div>`;
    }
    return `<div class="ntv-row"><label>${label}${over}<span class="ntv-val" id="ntv-v-${key}">${v}</span></label>
      <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
  }).join("");
}

/**
 * Emit the selected caliber's override as a paste-ready block for
 * caliber-vfx.mjs. Only keys that actually differ from TUNE are written, so an
 * exported block stays a minimal delta rather than a full copy of the defaults.
 */
function _exportCaliber() {
  if (!_previewCaliber) return ui.notifications?.warn("Wybierz kaliber, aby wyeksportować.");
  const visual = _editTarget();
  const keys = FIELDS.map(([k]) => k).filter(k => Object.hasOwn(visual, k) && visual[k] !== TUNE[k]);
  if (!keys.length) return ui.notifications?.warn("Brak różnic wobec wartości domyślnych.");

  const label = AMMO_CALIBER_MAP[_previewCaliber]?.label ?? _previewCaliber;
  const body = keys.map(k => {
    const v = visual[k];
    return `      ${k}: ${typeof v === "string" ? `"${v}"` : v},`;
  }).join("\n");
  const snippet = `  // ${label}
  "${_previewCaliber}": {
    visual: {
${body}
    },
  },`;

  console.log(`Neuroshima 5e | CALIBER_VFX export for "${_previewCaliber}":
${snippet}`);
  // Clipboard can reject without a user gesture or over http; the console copy
  // above is the guaranteed path, so a failure here is a warning, not an error.
  navigator.clipboard?.writeText(snippet)
    .then(() => ui.notifications?.info(`Skopiowano blok dla ${label} (jest też w konsoli F12).`))
    .catch(() => ui.notifications?.warn("Schowek niedostępny — blok jest w konsoli (F12)."));
}

function _resolveShooterTarget() {
  const controlled = canvas.tokens?.controlled?.[0];
  const targeted = game.user?.targets?.first();
  const toks = canvas.tokens?.placeables ?? [];
  const shooter = controlled ?? toks[0] ?? null;
  const target = targeted ?? (toks.find(t => t !== shooter)) ?? null;
  return { shooter, target };
}

function _css() {
  return `
    #${PANEL_ID}{position:fixed;top:80px;right:20px;width:300px;max-height:80vh;overflow:hidden;
      background:#12100dEE;border:1px solid #6b5a3a;border-radius:6px;z-index:100000;
      font-family:'Roboto Condensed',sans-serif;color:#e8dcc0;box-shadow:0 6px 24px #000A;display:flex;flex-direction:column;}
    #${PANEL_ID} .ntv-head{cursor:move;padding:6px 10px;background:#2a2113;border-bottom:1px solid #6b5a3a;
      display:flex;justify-content:space-between;align-items:center;font-weight:bold;letter-spacing:.5px;}
    #${PANEL_ID} .ntv-head .ntv-x{cursor:pointer;padding:0 4px;color:#c9a24a;}
    #${PANEL_ID} .ntv-body{overflow-y:auto;padding:8px 10px;}
    #${PANEL_ID} .ntv-perf{font-size:11px;color:#9fd08a;padding:4px 10px;border-bottom:1px solid #3a2f1a;
      display:flex;gap:10px;flex-wrap:wrap;background:#0d0b08;}
    #${PANEL_ID} .ntv-perf b{color:#e8dcc0;}
    #${PANEL_ID} .ntv-row{margin:5px 0;font-size:11px;}
    #${PANEL_ID} .ntv-row label{display:flex;justify-content:space-between;margin-bottom:1px;}
    #${PANEL_ID} .ntv-row .ntv-val{color:#c9a24a;font-variant-numeric:tabular-nums;}
    #${PANEL_ID} input[type=range]{width:100%;accent-color:#c9662a;height:14px;}
    #${PANEL_ID} input[type=color]{width:100%;height:22px;background:none;border:1px solid #6b5a3a;}
    #${PANEL_ID} .ntv-fire{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:8px 10px;border-top:1px solid #3a2f1a;}
    #${PANEL_ID} .ntv-fire button, #${PANEL_ID} .ntv-tools button{background:#3a2a12;color:#e8dcc0;border:1px solid #6b5a3a;
      border-radius:4px;padding:5px;cursor:pointer;font-size:11px;font-family:inherit;}
    #${PANEL_ID} .ntv-fire button:hover,#${PANEL_ID} .ntv-tools button:hover{background:#5a3f18;}
    #${PANEL_ID} .ntv-fire button:last-child{grid-column:1/3;}
    #${PANEL_ID} .ntv-tools{display:flex;gap:5px;padding:0 10px 8px;}
    #${PANEL_ID} .ntv-tools button{flex:1;}
    #${PANEL_ID} .ntv-caliber{padding:8px 10px 0;border-top:1px solid #3a2f1a;font-size:11px;}
    #${PANEL_ID} .ntv-caliber label{display:block;margin-bottom:3px;color:#c9a24a;}
    #${PANEL_ID} .ntv-caliber select{width:100%;background:#1c1710;color:#e8dcc0;border:1px solid #6b5a3a;
      border-radius:4px;padding:3px;font-family:inherit;font-size:11px;}
    /* Which object the sliders write to. Highlighted when it is NOT the global
       defaults, so a per-caliber edit is never made by accident. */
    #${PANEL_ID} .ntv-scope{padding:3px 10px;font-size:10px;color:#8a7c5c;background:#0d0b08;
      border-bottom:1px solid #3a2f1a;}
    #${PANEL_ID} .ntv-scope.on{color:#e8dcc0;background:#2a1b0d;}
    #${PANEL_ID} .ntv-scope b{color:#c9a24a;}
    #${PANEL_ID} .ntv-ov{color:#c9662a;font-size:9px;}
  `;
}

export function openTracerDebugPanel() {
  if (!game.user?.isGM) return ui.notifications?.warn("Panel VFX: tylko MG.");
  closeTracerDebugPanel();

  const style = document.createElement("style");
  style.id = `${PANEL_ID}-style`;
  style.textContent = _css();
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.id = PANEL_ID;

  const rows = _buildRows();

  const fireBtns = FIRE_BUTTONS.map(([label, rounds], i) =>
    `<button data-fire="${i}">${label}${rounds > 3 ? ` → ${visibleTracerCount(rounds)}` : ""}</button>`).join("");

  el.innerHTML = `
    <div class="ntv-head"><span>⌖ Tracer VFX — strojenie</span><span class="ntv-x" title="Zamknij">✕</span></div>
    <div class="ntv-perf">
      <span>FPS <b id="ntv-fps">–</b></span>
      <span>aktywne <b id="ntv-active">0</b></span>
      <span>szczyt <b id="ntv-peak">0</b></span>
      <span>pula <b id="ntv-pool">0</b></span>
    </div>
    <div class="ntv-scope"></div>
    <div class="ntv-body">${rows}</div>
    <div class="ntv-tools"><button data-tool="rebake">Prze-bake</button><button data-tool="clear">Wyczyść</button>
      <button data-tool="export" title="Skopiuj blok CALIBER_VFX dla wybranego kalibru">Eksport</button></div>
    <div class="ntv-caliber">
      <label>Kaliber — podgląd i EDYCJA nadpisań</label>
      ${buildCaliberSelect(_previewCaliber, false, "")}
    </div>
    <div class="ntv-fire">${fireBtns}</div>
  `;
  document.body.appendChild(el);

  // Param inputs
  _bindInputs(el);

  // Caliber preview selector — never writes to any registry, only changes
  // which caliber's sound/visual profile the fire buttons below preview.
  const caliberSelect = el.querySelector(".ntv-caliber select");
  caliberSelect?.addEventListener("change", () => {
    _previewCaliber = caliberSelect.value;
    // The sliders now point at a different object — re-render so they show that
    // caliber's values and its overridden-field markers, then rebind them.
    const body = el.querySelector(".ntv-body");
    body.innerHTML = _buildRows();
    _bindInputs(el);
    _updateScopeLabel(el);
    _refreshFireLabels(el);
  });

  // Fire buttons
  el.querySelectorAll("button[data-fire]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [, rounds, hit, fireMode, area] = FIRE_BUTTONS[Number(btn.dataset.fire)];
      const { shooter, target } = _resolveShooterTarget();
      if (!shooter) return ui.notifications?.warn("Brak żetonu strzelca (zaznacz token).");
      const template = area ? canvas.templates?.placeables.at(-1)?.document : null;
      if (area && !template) {
        return ui.notifications?.warn("Postaw najpierw szablon (linia/strefa) na scenie — tryby obszarowe strzelają w szablon.");
      }
      const caliberId = _previewCaliber || null;
      // item=null is intentional: with no weapon identifier there is no
      // per-weapon override, so this resolves exactly as real gameplay would
      // for that caliber+mode — bank sound if one is assigned, generic tier
      // otherwise.
      if (fireMode === "p") playShotSound(null, { caliberId, token: shooter });
      else playBurstSound(null, fireMode, { caliberId, token: shooter });
      if (area) tracerFireArea({ shooter, template, rounds, caliber: caliberId });
      else tracerFire({ shooter, target, hit, rounds, caliber: caliberId });
    });
  });

  // Tools
  el.querySelector('[data-tool="rebake"]').addEventListener("click", () => rebake());
  el.querySelector('[data-tool="clear"]').addEventListener("click", () => clearAll());
  el.querySelector('[data-tool="export"]').addEventListener("click", () => _exportCaliber());

  _updateScopeLabel(el);

  // Close
  el.querySelector(".ntv-x").addEventListener("click", closeTracerDebugPanel);

  _makeDraggable(el, el.querySelector(".ntv-head"));

  // Perf readout
  _perfTimer = setInterval(() => {
    const s = stats();
    const set = (id, v) => { const n = el.querySelector(id); if (n) n.textContent = v; };
    set("#ntv-fps", Math.round(s.fps));
    set("#ntv-active", s.active);
    set("#ntv-peak", s.peakActive);
    set("#ntv-pool", s.pooled);
  }, 250);
}

/** (Re)bind the slider/colour inputs to whatever _editTarget() currently is. */
function _bindInputs(el) {
  el.querySelectorAll("input[data-key]").forEach(inp => {
    inp.addEventListener("input", () => {
      const key = inp.dataset.key;
      const val = inp.type === "color" ? inp.value : Number(inp.value);
      _editTarget()[key] = val;
      const valEl = el.querySelector(`#ntv-v-${key}`);
      if (valEl) valEl.textContent = val;

      if (_previewCaliber) {
        // Only the per-caliber bakes are stale; the global textures are
        // untouched, so a full rebake() would be wasted work every slider tick.
        if (TEXTURE_PARAMS.has(key)) invalidateVisualCache();
      } else if (TEXTURE_PARAMS.has(key)) {
        rebake();
      }
      if (["maxParticles", "mapKnee", "mapCompression",
           "areaMsPerRound", "areaMinMs", "areaMaxMs"].includes(key)) _refreshFireLabels(el);
    });
  });
}

/**
 * Update the header strip that says what the sliders are currently editing.
 * Without it, an edit silently lands on a caliber the user forgot was selected.
 */
function _updateScopeLabel(el) {
  const n = el.querySelector(".ntv-scope");
  if (!n) return;
  if (_previewCaliber) {
    const label = AMMO_CALIBER_MAP[_previewCaliber]?.label ?? _previewCaliber;
    n.innerHTML = `edytujesz: <b>${label}</b> <span class="ntv-ov">●</span> = nadpisane`;
    n.classList.add("on");
  } else {
    n.innerHTML = "edytujesz: <b>wartości globalne (TUNE)</b>";
    n.classList.remove("on");
  }
}

function _refreshFireLabels(el) {
  el.querySelectorAll("button[data-fire]").forEach(btn => {
    const [label, rounds, , , area] = FIRE_BUTTONS[Number(btn.dataset.fire)];
    let suffix = rounds > 3 ? ` → ${visibleTracerCount(rounds)}` : "";
    // Area modes also show how long the burst will run, since that is the whole
    // point of the area block and is otherwise invisible until you fire.
    if (area) {
      const t = _editTarget();
      const ms = Math.min(t.areaMaxMs ?? TUNE.areaMaxMs,
        Math.max(t.areaMinMs ?? TUNE.areaMinMs, rounds * (t.areaMsPerRound ?? TUNE.areaMsPerRound)));
      suffix += ` / ${(ms / 1000).toFixed(1)} s`;
    }
    btn.textContent = label + suffix;
  });
}

export function closeTracerDebugPanel() {
  if (_perfTimer) { clearInterval(_perfTimer); _perfTimer = null; }
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(`${PANEL_ID}-style`)?.remove();
}

/**
 * Registers the "Tracer VFX" toggle button in the Token scene-controls toolbar.
 * `visible: game.user.isGM` keeps the button (and thus the panel) out of players' UI
 * entirely — it never even renders for non-GMs, rather than just being GM-gated once opened.
 */
export function registerTracerDebugPanelControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) return;
    tokenTools.neuroshimaTracerVfx = {
      name: "neuroshimaTracerVfx",
      title: "Tracer VFX — strojenie (MG)",
      icon: "fa-solid fa-crosshairs",
      order: Object.keys(tokenTools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => {
        if (document.getElementById(PANEL_ID)) closeTracerDebugPanel();
        else openTracerDebugPanel();
      }
    };
  });
}

function _makeDraggable(el, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener("pointerdown", e => {
    if (e.target.classList.contains("ntv-x")) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect();
    ox = r.left; oy = r.top;
    el.style.right = "auto";
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", e => {
    if (!dragging) return;
    el.style.left = `${ox + (e.clientX - sx)}px`;
    el.style.top = `${oy + (e.clientY - sy)}px`;
  });
  handle.addEventListener("pointerup", e => { dragging = false; handle.releasePointerCapture(e.pointerId); });
}
