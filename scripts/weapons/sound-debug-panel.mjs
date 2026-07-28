/**
 * Neuroshima 5e — GM-only weapon-sound audition panel.
 *
 * Open with `game.neuroshima.sounds.panel()`, or the "Dźwięki broni" button in
 * the Token scene-controls toolbar (GM only — see registerSoundDebugPanelControls).
 *
 * WHY THIS EXISTS
 * ---------------
 * The Fallout 2 sound library was decoded by ear into
 * `dev/audio/lib/f2/DECODED_SOUND_MAP.md`, but several identifications are
 * explicitly flagged as uncertain, and two contradict the summary table
 * outright (symbols `#` and `@` — see the header of `sound-banks.mjs`). Those
 * calls can only be settled by hearing the sounds in context, against each
 * other, at playback volume. Reading filenames is not enough — this library has
 * already produced sounds whose names were wrong.
 *
 * Three tabs:
 *   BANKI     — every bank, every slot, every alternate take, played individually.
 *               Confidence badge per bank; "audition" = needs your ear.
 *   KALIBRY   — plays what a caliber ACTUALLY resolves to per fire mode, through
 *               the real resolution path (bank → generic fallback), so it audits
 *               the mapping and not just the files.
 *   NIEZNANE  — the never-decoded files under sounds/audition/, wired to nothing.
 *
 * Deliberately plays LOCAL-ONLY (`foundry.audio.AudioHelper.play`) rather than
 * going through playWeaponSound(): auditioning is a private activity and should
 * not broadcast dozens of gunshots to every connected player.
 */

import {
  BANK_INFO,
  CALIBER_BANKS,
  IMPACT_MATERIALS,
  MATERIAL_LABELS,
  caliberHasMode,
  listBanks,
  listSlots,
  slotTakes,
  bankFileTake,
  bankFireFile,
  bankUtilityFile,
  bankImpactFile,
  resolveBank,
} from "../config/sound-banks.mjs";
import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";

const PANEL_ID = "neuro-sound-audition-panel";
const MODULE_ID = "neuroshima-2026-overrides";
const AUDITION_BASE = `modules/${MODULE_ID}/sounds/audition`;

/** Which tab is showing. */
let _tab = "banks";

/** Last-played path, echoed in the footer so an odd sound can be traced back. */
let _lastPath = "";

/**
 * Files under sounds/audition/, produced by dev/audio/build_audition_set.ps1.
 *
 * Hardcoded rather than directory-scanned: FilePicker.browse is async and
 * GM-permission-dependent, and this list changes only when that script does.
 * `note` carries the provenance so you know what you're being asked about.
 */
const AUDITION_FILES = [
  { file: "reload-pistol-maginsert.ogg",   note: "PISTOL.wav — wsuwanie magazynka (NIE strzał)" },
  { file: "reload-rifle-singleround.ogg",  note: "RIFLE.wav — ładowanie 1 naboju; kandydat na RELOAD_SINGLE" },
  { file: "reload-uzi-smg.ogg",            note: "UZI.wav — przeładowanie UZI" },
  { file: "click-short-minigun.ogg",       note: "MINIGUN.wav — krótki klik; wg notatek nieprzydatny" },
  { file: "ambience-distant-shots-4.ogg",  note: "SHOTS.wav — 4 odległe strzały, tło" },
  { file: "ambience-distant-shots-alt.ogg",note: "SHOTS1.wav — jak wyżej, wariant" },
  { file: "unknown-howitzer.ogg",          note: "HOWITZER.wav — NIEROZPOZNANY; kandydat: 120 mm moździerz" },
  { file: "unknown-magunnlc.ogg",          note: "MAGUNNLC.wav — NIEROZPOZNANY; 'machine gun'?" },
  { file: "unknown-magun2ao.ogg",          note: "magun2ao.wav — NIEROZPOZNANY; 'machine gun'?" },
  { file: "unknown-rlaunch.ogg",           note: "RLAUNCH.wav — NIEROZPOZNANY; wystrzał rakiety?" },
  { file: "unknown-flamethr.ogg",          note: "FLAMETHR.wav — NIEROZPOZNANY; miotacz ognia?" },
  { file: "unknown-spear.ogg",             note: "SPEAR.wav — NIEROZPOZNANY; włócznia/rzut?" },
  { file: "unknown-knife.ogg",             note: "KNIFE.wav — NIEROZPOZNANY; nóż?" },
  { file: "unknown-flare.ogg",             note: "FLARE.wav — NIEROZPOZNANY; raca?" },
  { file: "unknown-wepnbox.ogg",           note: "WEPNBOX.wav — NIEROZPOZNANY; dźwięk UI?" },
  { file: "gunshot-normalized.ogg",        note: "WWHNXXX2.wav po loudnorm — czy już używalny?" },
];

/** Fire modes offered in the caliber tab. */
const FIRE_MODES = [
  ["p",  "P — strzał"],
  ["ks", "KS — krótka"],
  ["ds", "DS — długa"],
  ["ms", "MS — miażdżąca"],
  ["oz", "OZ — zaporowy"],
];

/* -------------------------------------------- */
/*  Playback                                      */
/* -------------------------------------------- */

/**
 * Play one file locally at the module's configured volume.
 * Local-only by design — see the file header.
 */
function _audition(src, el) {
  if (!src) return ui.notifications?.warn("Brak pliku dla tego slotu.");
  const raw = game.settings.get(MODULE_ID, "weaponSoundVolume") ?? 0.5;
  // Same exponential curve as sounds.mjs, so what you hear here is what the
  // table hears in play.
  const vol = Math.pow(raw, 2);
  foundry.audio.AudioHelper.play({ src, volume: vol, loop: false }).catch(err => {
    ui.notifications?.error(`Nie udało się odtworzyć: ${src}`);
    console.warn("Neuroshima 5e | audition playback failed:", src, err);
  });
  _lastPath = src;
  const foot = el?.querySelector(".nsa-last");
  if (foot) foot.textContent = src.replace(`modules/${MODULE_ID}/sounds/`, "");
}

/* -------------------------------------------- */
/*  Rendering                                     */
/* -------------------------------------------- */

function _css() {
  return `
    #${PANEL_ID}{position:fixed;top:80px;left:20px;width:420px;max-height:84vh;overflow:hidden;
      background:#12100dEE;border:1px solid #6b5a3a;border-radius:6px;z-index:100000;
      font-family:'Roboto Condensed',sans-serif;color:#e8dcc0;box-shadow:0 6px 24px #000A;
      display:flex;flex-direction:column;}
    #${PANEL_ID} .nsa-head{cursor:move;padding:6px 10px;background:#2a2113;border-bottom:1px solid #6b5a3a;
      display:flex;justify-content:space-between;align-items:center;font-weight:bold;letter-spacing:.5px;}
    #${PANEL_ID} .nsa-head .nsa-x{cursor:pointer;padding:0 4px;color:#c9a24a;}
    #${PANEL_ID} .nsa-tabs{display:flex;border-bottom:1px solid #3a2f1a;background:#0d0b08;}
    #${PANEL_ID} .nsa-tabs button{flex:1;background:none;border:none;color:#8a7c5c;padding:6px 4px;
      cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:.5px;border-bottom:2px solid transparent;}
    #${PANEL_ID} .nsa-tabs button.on{color:#e8dcc0;border-bottom-color:#c9662a;background:#1c1710;}
    #${PANEL_ID} .nsa-body{overflow-y:auto;padding:8px 10px;font-size:11px;}
    #${PANEL_ID} .nsa-bank{margin-bottom:10px;border:1px solid #3a2f1a;border-radius:4px;overflow:hidden;}
    #${PANEL_ID} .nsa-bank-h{background:#1c1710;padding:4px 7px;display:flex;justify-content:space-between;
      align-items:center;gap:6px;}
    #${PANEL_ID} .nsa-bank-h b{color:#e8dcc0;font-weight:600;}
    #${PANEL_ID} .nsa-sym{color:#7d6f52;font-size:10px;}
    #${PANEL_ID} .nsa-badge{font-size:9px;padding:1px 5px;border-radius:8px;text-transform:uppercase;
      letter-spacing:.5px;white-space:nowrap;}
    #${PANEL_ID} .nsa-badge.high{background:#1e3a1e;color:#8fd08a;}
    #${PANEL_ID} .nsa-badge.medium{background:#3a3218;color:#d0c07a;}
    #${PANEL_ID} .nsa-badge.audition{background:#4a2118;color:#e59a72;}
    /* Derived, not decoded — visually distinct from the confidence levels so a
       synthesized bank is never mistaken for source material. */
    #${PANEL_ID} .nsa-badge.synth{background:#1e2f3a;color:#7ab8d0;}
    #${PANEL_ID} .nsa-slots{padding:5px 7px;display:flex;flex-wrap:wrap;gap:4px;}
    #${PANEL_ID} .nsa-slot{display:flex;align-items:center;gap:2px;background:#241d12;border:1px solid #4a3d22;
      border-radius:3px;padding:1px 3px;}
    #${PANEL_ID} .nsa-slot span{color:#a89878;font-size:10px;padding:0 2px;}
    #${PANEL_ID} .nsa-slot button{background:#3a2a12;color:#e8dcc0;border:1px solid #6b5a3a;border-radius:2px;
      min-width:17px;padding:1px 3px;cursor:pointer;font-size:10px;font-family:inherit;}
    #${PANEL_ID} .nsa-slot button:hover{background:#7a5520;}
    #${PANEL_ID} .nsa-row{display:flex;align-items:center;gap:6px;margin:3px 0;padding:3px 5px;
      border:1px solid #3a2f1a;border-radius:3px;background:#181309;}
    /* Label must be allowed to shrink (min-width:0) but not to hog the row, or
       the button group collapses to its narrowest width and wraps one per line. */
    #${PANEL_ID} .nsa-row .nsa-lbl{flex:1 1 40%;min-width:0;}
    #${PANEL_ID} .nsa-row .nsa-btns{display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;
      flex:1 1 auto;}
    #${PANEL_ID} .nsa-row .nsa-note{display:block;color:#7d6f52;font-size:10px;}
    #${PANEL_ID} .nsa-row .nsa-res{display:block;color:#9a8a68;font-size:10px;font-family:monospace;
      word-break:break-all;}
    #${PANEL_ID} .nsa-row button{background:#3a2a12;color:#e8dcc0;border:1px solid #6b5a3a;border-radius:3px;
      padding:3px 8px;cursor:pointer;font-size:11px;font-family:inherit;flex-shrink:0;}
    #${PANEL_ID} .nsa-row button:hover{background:#7a5520;}
    #${PANEL_ID} .nsa-warn{color:#e59a72;}
    /* Mode the caliber cannot fire: present for layout stability, but clearly
       not a gap. Still clickable — hearing the fallback is sometimes useful. */
    #${PANEL_ID} .nsa-na{opacity:.3;}
    #${PANEL_ID} .nsa-na-legend{opacity:.45;}
    #${PANEL_ID} .nsa-ctl{padding:6px 10px;border-top:1px solid #3a2f1a;background:#0d0b08;display:flex;
      gap:6px;align-items:center;flex-wrap:wrap;}
    #${PANEL_ID} .nsa-ctl select{background:#1c1710;color:#e8dcc0;border:1px solid #6b5a3a;border-radius:3px;
      padding:2px;font-family:inherit;font-size:11px;flex:1;min-width:90px;}
    #${PANEL_ID} .nsa-ctl label{color:#c9a24a;font-size:10px;}
    #${PANEL_ID} .nsa-foot{padding:3px 10px;border-top:1px solid #3a2f1a;background:#0d0b08;color:#7d6f52;
      font-size:10px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #${PANEL_ID} .nsa-hint{color:#7d6f52;font-size:10px;margin:0 0 7px;line-height:1.4;}
  `;
}

/** BANKI tab — every bank, slot and take. */
function _renderBanks() {
  const rows = listBanks().map(bank => {
    const info = BANK_INFO[bank] ?? {};
    const conf = info.confidence ?? "medium";
    const slots = listSlots(bank).map(slot => {
      const n = slotTakes(bank, slot);
      // One button per take, so a bad individual take can be identified.
      const takes = Array.from({ length: n }, (_, i) =>
        `<button data-bank="${bank}" data-slot="${slot}" data-take="${i + 1}"
                 title="${bank}/${slot}_v${i + 1}.ogg">${i + 1}</button>`).join("");
      return `<div class="nsa-slot"><span>${slot}</span>${takes}</div>`;
    }).join("");

    return `<div class="nsa-bank">
      <div class="nsa-bank-h">
        <b>${info.label ?? bank}</b>
        <span class="nsa-sym">${bank} · sym ${info.symbol ?? "?"}</span>
        <span class="nsa-badge ${conf}">${conf}</span>
      </div>
      <div class="nsa-slots">${slots}</div>
    </div>`;
  }).join("");

  return `<p class="nsa-hint">Każdy przycisk = jedno konkretne nagranie (take).
    Znacznik <b>audition</b> = identyfikacja niepotwierdzona, wymaga Twojego ucha.</p>${rows}`;
}

/** KALIBRY tab — what a caliber actually resolves to, through the real path. */
function _renderCalibers() {
  const caliberIds = Object.keys(CALIBER_BANKS);

  const rows = caliberIds.map(id => {
    const label = AMMO_CALIBER_MAP[id]?.label ?? id;

    const modeBtns = FIRE_MODES.map(([mode, modeLabel]) => {
      const src = bankFireFile({ caliberId: id, fireMode: mode });
      const bank = resolveBank({ caliberId: id, fireMode: mode });
      // Three distinct states, and conflating them is what made the panel look
      // gappier than it is:
      //   n/a      — this caliber cannot fire this mode at all. Not a gap.
      //   warn     — it CAN, but no bank sound exists. A real gap.
      //   normal   — covered by a bank.
      const available = caliberHasMode(id, mode);
      const cls = !available ? "nsa-na" : (src ? "" : "nsa-warn");
      const title = !available
        ? `${modeLabel} — niedostępny dla tego kalibru`
        : (src ? `${bank}: ${src.split("/").pop()}`
               : "LUKA: brak nagrania w banku, zagra dźwięk ogólny");
      return `<button data-caliber="${id}" data-mode="${mode}" title="${title}"
                ${cls ? `class="${cls}"` : ""}>${modeLabel.split(" ")[0]}</button>`;
    }).join("");

    const utilBtns = ["reload", "click"].map(slot => {
      const src = bankUtilityFile(slot, { caliberId: id });
      return `<button data-caliber="${id}" data-util="${slot}"
                title="${src ?? "brak w banku"}" ${src ? "" : 'class="nsa-warn"'}>${slot}</button>`;
    }).join("");

    // Single-round impacts and burst impacts are separate recordings, so both
    // are auditioned: "F" = one round into flesh, "F⋮" = a burst string into it.
    const impactBtns = IMPACT_MATERIALS.flatMap(m => ["p", "ds"].map(fm => {
      const src = bankImpactFile({ caliberId: id, material: m, fireMode: fm });
      const mark = fm === "p" ? m : `${m}⋮`;
      const kind = fm === "p" ? "pojedynczy" : "seria";
      return `<button data-caliber="${id}" data-impact="${m}" data-impact-mode="${fm}"
                title="${MATERIAL_LABELS[m]} (${kind}): ${src ?? "brak"}"
                ${src ? "" : 'class="nsa-warn"'}>${mark}</button>`;
    })).join("");

    const bankName = resolveBank({ caliberId: id, fireMode: "p" }) ?? "—";

    return `<div class="nsa-row">
      <span class="nsa-lbl"><b>${label}</b>
        <span class="nsa-note">bank: ${bankName}</span></span>
      <span class="nsa-btns">${modeBtns}</span>
    </div>
    <div class="nsa-row" style="margin-top:-2px;opacity:.85">
      <span class="nsa-lbl"><span class="nsa-note">przeładowanie / klik / trafienie (⋮ = seria)</span></span>
      <span class="nsa-btns">${utilBtns} ${impactBtns}</span>
    </div>`;
  }).join("");

  return `<p class="nsa-hint">Odtwarza to, co <b>naprawdę</b> wybierze silnik dla danego kalibru
    i trybu ognia — więc sprawdza mapowanie, nie tylko pliki.<br>
    <span class="nsa-warn">Pomarańczowy</span> = prawdziwa luka (tryb dostępny, brak nagrania).
    <span class="nsa-na-legend">Wyszarzony</span> = tryb niedostępny dla tego kalibru — to nie luka.</p>${rows}`;
}

/** NIEZNANE tab — never-decoded files, wired to nothing. */
function _renderUnknown() {
  const rows = AUDITION_FILES.map(({ file, note }) => `
    <div class="nsa-row">
      <span class="nsa-lbl"><b>${file.replace(/\.ogg$/, "")}</b>
        <span class="nsa-note">${note}</span></span>
      <span class="nsa-btns"><button data-audition="${file}">▶</button></span>
    </div>`).join("");

  return `<p class="nsa-hint">Pliki, których nie ma w żadnym banku — nierozpoznane albo
    odłożone. Jeśli któryś pasuje do konkretnej roli, powiedz który i do czego,
    a wpiszę go do banku.</p>${rows}`;
}

function _renderBody() {
  if (_tab === "calibers") return _renderCalibers();
  if (_tab === "unknown") return _renderUnknown();
  return _renderBanks();
}

/* -------------------------------------------- */
/*  Panel lifecycle                               */
/* -------------------------------------------- */

export function openSoundDebugPanel() {
  if (!game.user?.isGM) return ui.notifications?.warn("Panel dźwięków: tylko MG.");
  closeSoundDebugPanel();

  const style = document.createElement("style");
  style.id = `${PANEL_ID}-style`;
  style.textContent = _css();
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.id = PANEL_ID;
  el.innerHTML = `
    <div class="nsa-head"><span>♪ Dźwięki broni — przesłuchanie</span>
      <span class="nsa-x" title="Zamknij">✕</span></div>
    <div class="nsa-tabs">
      <button data-tab="banks">BANKI</button>
      <button data-tab="calibers">KALIBRY</button>
      <button data-tab="unknown">NIEZNANE</button>
    </div>
    <div class="nsa-body"></div>
    <div class="nsa-foot">Ostatnio: <span class="nsa-last">—</span></div>
  `;
  document.body.appendChild(el);

  _paint(el);
  _makeDraggable(el, el.querySelector(".nsa-head"));
  el.querySelector(".nsa-x").addEventListener("click", closeSoundDebugPanel);

  el.querySelectorAll("button[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => { _tab = btn.dataset.tab; _paint(el); });
  });
}

/** Redraw the body for the current tab and rebind its buttons. */
function _paint(el) {
  el.querySelectorAll("button[data-tab]").forEach(b =>
    b.classList.toggle("on", b.dataset.tab === _tab));

  const body = el.querySelector(".nsa-body");
  body.innerHTML = _renderBody();

  // BANKI: an exact take.
  body.querySelectorAll("button[data-bank]").forEach(btn => {
    btn.addEventListener("click", () => _audition(
      bankFileTake(btn.dataset.bank, btn.dataset.slot, Number(btn.dataset.take)), el));
  });

  // KALIBRY: fire modes — resolved live, so each click can pick a new take.
  body.querySelectorAll("button[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => _audition(
      bankFireFile({ caliberId: btn.dataset.caliber, fireMode: btn.dataset.mode }), el));
  });
  body.querySelectorAll("button[data-util]").forEach(btn => {
    btn.addEventListener("click", () => _audition(
      bankUtilityFile(btn.dataset.util, { caliberId: btn.dataset.caliber }), el));
  });
  body.querySelectorAll("button[data-impact]").forEach(btn => {
    btn.addEventListener("click", () => _audition(
      bankImpactFile({
        caliberId: btn.dataset.caliber,
        material: btn.dataset.impact,
        fireMode: btn.dataset.impactMode,
      }), el));
  });

  // NIEZNANE
  body.querySelectorAll("button[data-audition]").forEach(btn => {
    btn.addEventListener("click", () => _audition(
      `${AUDITION_BASE}/${btn.dataset.audition}`, el));
  });

  const last = el.querySelector(".nsa-last");
  if (last && _lastPath) last.textContent = _lastPath.replace(`modules/${MODULE_ID}/sounds/`, "");
}

export function closeSoundDebugPanel() {
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(`${PANEL_ID}-style`)?.remove();
}

/**
 * Registers the "Dźwięki broni" toggle in the Token scene-controls toolbar.
 * `visible: isGM` keeps it out of players' UI entirely, matching the tracer panel.
 */
export function registerSoundDebugPanelControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) return;
    tokenTools.neuroshimaSoundAudition = {
      name: "neuroshimaSoundAudition",
      title: "Dźwięki broni — przesłuchanie (MG)",
      icon: "fa-solid fa-volume-high",
      order: Object.keys(tokenTools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => {
        if (document.getElementById(PANEL_ID)) closeSoundDebugPanel();
        else openSoundDebugPanel();
      }
    };
  });
}

function _makeDraggable(el, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener("pointerdown", e => {
    if (e.target.classList.contains("nsa-x")) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect();
    ox = r.left; oy = r.top;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", e => {
    if (!dragging) return;
    el.style.left = `${ox + (e.clientX - sx)}px`;
    el.style.top = `${oy + (e.clientY - sy)}px`;
  });
  handle.addEventListener("pointerup", e => { dragging = false; handle.releasePointerCapture(e.pointerId); });
}
