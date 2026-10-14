/**
 * Uwagi — findings captured in the moment, with their context (PLAN_human_testing.md §3.7).
 *
 * [Uwaga] (panel, a probe's ❌/💬, or the keybinding) opens a small form: severity (blokuje / błąd /
 * brzydkie / pomysł), text, an optional screenshot — the canvas, or the whole tab through the browser's
 * own consent prompt (`getDisplayMedia`). Context is attached automatically. Each finding is a page of
 * the journal "Poligon · Uwagi" (structured context in flags), so the GM can edit and link it in
 * Foundry; `fvtt poligon:findings` reads them out for agents, and triage stamps `status`.
 */

import { MODULE_ID } from "./guard.mjs";
import { stan, stamp } from "./state.mjs";

export const SEVERITIES = {
  blokuje: { label: "Blokuje", icon: "🛑", hint: "nie da się grać / testować dalej" },
  blad: { label: "Błąd", icon: "🐞", hint: "działa źle" },
  brzydkie: { label: "Brzydkie", icon: "🎨", hint: "działa, ale wygląda / czuje się źle" },
  pomysl: { label: "Pomysł", icon: "💡", hint: "a gdyby…" }
};

const JOURNAL_NAME = "Poligon · Uwagi";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));

/**
 * Owned by everyone: a player's seat files its own findings (only the GM can create the journal, so a
 * player's first Uwaga waits for the GM to have opened the Poligon once — `createApi` makes it).
 */
export async function journal() {
  const existing = game.journal.find(j => j.flags?.[MODULE_ID]?.poligon?.uwagi);
  if (existing) return existing;
  if (!game.user.isGM) throw new Error("Dziennik uwag jeszcze nie istnieje — MG musi raz otworzyć Poligon.");
  return JournalEntry.implementation.create({
    name: JOURNAL_NAME, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: { [MODULE_ID]: { poligon: { uwagi: true } } }
  });
}

/** Everything the GM would otherwise have to retype (§3.7). */
export async function context(extra = {}) {
  const s = stan();
  const st = await stamp();
  const controlled = canvas.tokens?.controlled ?? [];
  const core = new Set(["Sidebar", "Players", "Hotbar", "SceneControls", "SceneNavigation", "GamePause", "HeadsUpDisplayContainer", "MainMenu"]);
  const windows = [...foundry.applications.instances.values()]
    .filter(a => a.rendered && !core.has(a.constructor.name) && !/Directory|ChatLog|Tracker|Settings|DsnSidebar|PlaceableDirectory|TokenTab/.test(a.constructor.name))
    .map(a => `${a.constructor.name}: ${a.title ?? ""}`.trim());
  const ui = game.settings.get("core", "uiConfig");
  return {
    station: s.active ?? null,
    probe: extra.probe ?? null,
    scene: canvas.scene ? { id: canvas.scene.id, name: canvas.scene.name } : null,
    selected: controlled.map(t => t.name),
    actor: controlled[0]?.actor?.name ?? game.user.character?.name ?? null,
    targets: [...(game.user.targets ?? [])].map(t => t.name),
    windows,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    zoom: canvas.stage ? Math.round(canvas.stage.scale.x * 100) / 100 : null,
    theme: ui?.colorScheme ?? null, uiScale: ui?.uiScale ?? null,
    kobalt: game.settings.get(MODULE_ID, "kobaltEnabled"),
    combat: game.combat?.started ? { round: game.combat.round, turn: game.combat.combatant?.name ?? null } : null,
    user: game.user.name, role: game.user.role,
    module: game.modules.get(MODULE_ID)?.version ?? null, foundry: game.version, dnd5e: game.system.version,
    commit: st?.commit ?? null, dirty: st?.dirty ?? null, packsBuiltAt: st?.packs?.builtAt ?? null,
    worldTime: game.time.worldTime
  };
}

/* -------------------------------------------- */
/*  Screenshots                                  */
/* -------------------------------------------- */

async function shrink(source, maxW = 1600) {
  const w = source.width;
  const h = source.height;
  const k = Math.min(1, maxW / w);
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext("2d").drawImage(source, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/jpeg", 0.8));
}

/**
 * The canvas as the viewer sees it now (no UI). `renderer.extract` on the stage renders the stage's own
 * bounds, not the view (a corner of the map, the first try); copying the WebGL view right after a
 * render, in the same task, gets the frame before the browser clears the drawing buffer.
 */
export async function shotCanvas() {
  const view = canvas.app?.view;
  if (!view) return null;
  const c = document.createElement("canvas");
  c.width = view.width;
  c.height = view.height;
  canvas.app.render();
  c.getContext("2d").drawImage(view, 0, 0);
  return shrink(c);
}

/** The whole tab (sheets, cards, OSD) — the browser asks for consent; one frame. */
export async function shotTab() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" }, preferCurrentTab: true, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise(r => setTimeout(r, 250));
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    return shrink(c);
  } finally {
    for (const t of stream.getTracks()) t.stop();
  }
}

/**
 * Upload into `worlds/<world>/uwagi/`; when the server refuses (a session without upload rights —
 * found in §8), keep the image inline as a data URI instead of losing it.
 */
async function store(blob, name) {
  const dir = `worlds/${game.world.id}/uwagi`;
  try {
    const FP = foundry.applications.apps.FilePicker.implementation;
    try { await FP.createDirectory("data", dir, {}); } catch { /* exists */ }
    const file = new File([blob], name, { type: "image/jpeg" });
    const res = await FP.upload("data", dir, file, {}, { notify: false });
    if (res?.path) return { path: res.path, inline: false };
  } catch (err) {
    console.warn("Poligon | upload refused, keeping the screenshot inline", err);
  }
  const data = await new Promise(r => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result);
    fr.readAsDataURL(blob);
  });
  return { path: data, inline: true };
}

/* -------------------------------------------- */
/*  Create, read, mark                           */
/* -------------------------------------------- */

export async function create({ severity = "blad", text, probe = null, shot = null, ctx = null } = {}) {
  if (!text?.trim()) throw new Error("Uwaga bez treści");
  const j = await journal();
  const c = ctx ?? await context({ probe });
  const at = new Date();
  let image = null;
  if (shot) image = await store(shot, `uwaga-${at.toISOString().replace(/[:.]/g, "-")}.jpg`);
  const sev = SEVERITIES[severity] ?? SEVERITIES.blad;
  const rows = Object.entries(c).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === "object" ? JSON.stringify(v) : v)}</td></tr>`).join("");
  const content = `<p><strong>${sev.icon} ${esc(sev.label)}</strong>${c.station ? ` · stanowisko <em>${esc(c.station)}</em>` : ""}${c.probe ? ` · próba <em>${esc(c.probe)}</em>` : ""}</p>`
    + `<p>${esc(text).replace(/\n/g, "<br>")}</p>`
    + (image ? `<p><img src="${esc(image.path)}" style="max-width:100%"></p>` : "")
    + `<details><summary>Kontekst</summary><table>${rows}</table></details>`;
  const name = `${sev.icon} ${text.trim().split("\n")[0].slice(0, 70)}`;
  const [page] = await j.createEmbeddedDocuments("JournalEntryPage", [{
    name, type: "text", text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
    flags: { [MODULE_ID]: { poligon: { uwaga: { severity, text, context: c, status: null, createdAt: at.toISOString(), user: game.user.name, shot: image ? (image.inline ? "inline" : image.path) : null } } } }
  }]);
  ui.notifications.info(`Poligon: uwaga zapisana (${sev.label}).`);
  return page;
}

export async function list({ since = null, open = false } = {}) {
  const j = game.journal.find(x => x.flags?.[MODULE_ID]?.poligon?.uwagi);
  if (!j) return [];
  return j.pages.contents.map(p => ({ page: p, u: p.flags?.[MODULE_ID]?.poligon?.uwaga }))
    .filter(({ u }) => u && (!since || u.createdAt >= since) && (!open || !u.status))
    .sort((a, b) => a.u.createdAt.localeCompare(b.u.createdAt))
    .map(({ page, u }) => ({
      id: page.id, uuid: page.uuid, name: page.name, createdAt: u.createdAt, user: u.user, severity: u.severity,
      text: u.text, status: u.status, shot: u.shot, context: u.context
    }));
}

/** Triage stamp: `oznacz(id, "→ PLAN_m3_towarzysze §11")`; `null` reopens. */
export async function oznacz(id, status) {
  const j = game.journal.find(x => x.flags?.[MODULE_ID]?.poligon?.uwagi);
  const page = j?.pages.get(id);
  if (!page) throw new Error(`No finding ${id}`);
  await page.setFlag(MODULE_ID, "poligon.uwaga.status", status);
  return { id, status };
}

/** For `fvtt poligon:findings`: JSON plus a Markdown digest (image data URIs never go to Markdown). */
export async function exportFindings({ since = null, open = false } = {}) {
  const findings = (await list({ since, open })).map(f => ({ ...f, shot: f.shot === "inline" ? "inline (w dzienniku)" : f.shot }));
  const md = [`# Poligon — uwagi (${new Date().toISOString().slice(0, 16).replace("T", " ")})`, ""];
  for (const f of findings) {
    const sev = SEVERITIES[f.severity] ?? {};
    md.push(`## ${sev.icon ?? ""} ${f.name.replace(/^\S+\s/, "")}`, "",
      `- **${sev.label ?? f.severity}** · ${f.createdAt} · ${f.user}${f.context?.station ? ` · stanowisko ${f.context.station}` : ""}${f.context?.probe ? ` · próba ${f.context.probe}` : ""}`,
      `- status: ${f.status ?? "otwarta"} · id \`${f.id}\``, "", f.text, "",
      `<details><summary>Kontekst</summary>\n\n\`\`\`json\n${JSON.stringify(f.context, null, 2)}\n\`\`\`\n</details>`, "");
  }
  return { findings, markdown: md.join("\n") };
}

/* -------------------------------------------- */
/*  The form                                     */
/* -------------------------------------------- */

/** The [Uwaga] form. `probe` = "<station>/<probe id>" when opened from a probe card. */
export async function form({ probe = null, severity = "blad", text = "" } = {}) {
  const ctx = await context({ probe });
  let blob = null;
  const radios = Object.entries(SEVERITIES).map(([k, s]) =>
    `<label title="${esc(s.hint)}"><input type="radio" name="severity" value="${k}" ${k === severity ? "checked" : ""}> ${s.icon} ${esc(s.label)}</label>`).join("");
  const content = `<div class="poligon-uwaga">
    <div class="poligon-severity">${radios}</div>
    <textarea name="text" placeholder="Co widzisz? Co powinno być?">${esc(text)}</textarea>
    <div class="poligon-actions">
      <button type="button" data-shot="canvas"><i class="fa-solid fa-map"></i> Zrzut kanwy</button>
      <button type="button" data-shot="tab"><i class="fa-solid fa-desktop"></i> Zrzut karty (zgoda przeglądarki)</button>
    </div>
    <div class="poligon-shot-preview"></div>
    <p class="poligon-muted">Kontekst dołączy się sam: ${esc([ctx.station && `stanowisko ${ctx.station}`, ctx.scene?.name, ctx.selected.length && `zaznaczone: ${ctx.selected.join(", ")}`, `Kobalt ${ctx.kobalt ? "wł." : "wył."}`, ctx.commit && `commit ${ctx.commit}${ctx.dirty ? ` +${ctx.dirty}` : ""}`].filter(Boolean).join(" · "))}</p>
  </div>`;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: probe ? `Uwaga — ${probe}` : "Poligon — uwaga", icon: "fa-solid fa-flag" },
    position: { width: 480 },
    content,
    render: (event, dialog) => {
      const root = dialog.element;
      for (const b of root.querySelectorAll("[data-shot]")) {
        b.addEventListener("click", async () => {
          try {
            if (b.dataset.shot === "canvas") {
              blob = await shotCanvas();
            } else {
              dialog.element.style.visibility = "hidden";
              try { blob = await shotTab(); } finally { dialog.element.style.visibility = ""; }
            }
            const img = document.createElement("img");
            img.className = "poligon-shot";
            img.src = URL.createObjectURL(blob);
            root.querySelector(".poligon-shot-preview").replaceChildren(img);
          } catch (err) {
            ui.notifications.warn(`Poligon: zrzut się nie udał — ${err.message}`);
          }
        });
      }
    },
    buttons: [
      { action: "save", label: "Zapisz uwagę", icon: "fa-solid fa-floppy-disk", default: true,
        callback: (event, button) => ({ severity: button.form.elements.severity.value, text: button.form.elements.text.value }) },
      { action: "cancel", label: "Anuluj", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!result || result === "cancel" || !result.text?.trim()) return null;
  return create({ ...result, probe, shot: blob, ctx });
}
