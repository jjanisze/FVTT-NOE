/** Reversible mesh-only motion, after Foundry animations and before the same frame renders. */
import { poscigFlag, LANE_W } from "./poscig.mjs";
import { przyciagnietyDoToru, wPasiePoscigu, rotationNaPrawo, ziarnoPionka, kolysanie, rytmKolysania, kolysanieZegara } from "./poscig-motion-model.mjs";
import { jadacyPojazdu, jazdaZetonu } from "../pojazdy/stan.mjs";
import { DERIVED_UPDATE } from "../canvas-history.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const SETTING_SWAY = "poscigVehicleSway";
const entries = new Map();
const NO_CHANGES = Object.freeze({});
/** Seconds for the sway to settle into a new size after a QuickScale step. */
const SIZE_EASE_S = .6;
let active = [];
let ticker = null, cost = 0, frames = 0, enabled = true;

function geometry(doc, changes = NO_CHANGES, out = {}) {
  out.poscig = Boolean(poscigFlag(doc.parent));
  out.gridSize = doc.parent?.grid?.size ?? LANE_W;
  out.tory = poscigFlag(doc.parent)?.tory ?? 0;
  out.x = changes.x ?? doc.x; out.y = changes.y ?? doc.y;
  out.width = changes.width ?? doc.width; out.height = changes.height ?? doc.height;
  return out;
}

function facing(doc, changes = {}) {
  // Jadący obraca się z pojazdem (obrót pojazdu + własny, `pojazdy/zeton.mjs`) — plansza go nie ustawia.
  if (jazdaZetonu(doc) || !wPasiePoscigu(geometry(doc, changes))) return null;
  return rotationNaPrawo(doc.actor?.getFlag(MODULE_ID, "poscigFacingOffset") ?? 0);
}

function preCreate(doc) {
  const rotation = facing(doc);
  if (rotation !== null) doc.updateSource({ rotation, lockRotation: false });
}

function preUpdate(doc, changes) {
  const rotation = facing(doc, changes);
  if (rotation === null) return;
  // Rotation is NOT a v14 MOVEMENT_FIELD: rewriting it preserves the resolved movement path.
  if (changes.rotation !== undefined || doc._source.rotation !== rotation) changes.rotation = rotation;
  if (changes.lockRotation || doc.lockRotation) changes.lockRotation = false;
}

/** Jadący jadą z kołysaniem pojazdu: to samo przesunięcie i obrót wokół środka nadwozia. */
function restoreRiders(entry) {
  for (const r of entry.riders ?? []) {
    const m = r.mesh;
    if (!m || m.destroyed) continue;
    if (m.x === r.appliedX) m.x = r.baseX;
    if (m.y === r.appliedY) m.y = r.baseY;
    if (m.rotation === r.appliedRotation) m.rotation = r.baseRotation;
  }
  entry.riders = null;
}

function swayRiders(entry, sway) {
  const cos = Math.cos(sway.rotation), sin = Math.sin(sway.rotation);
  const riders = [];
  for (const doc of jadacyPojazdu(entry.token.document)) {
    const m = doc.object?.mesh;
    if (!m || m.destroyed) continue;
    const dx = m.x - entry.baseX, dy = m.y - entry.baseY;
    const r = { mesh: m, baseX: m.x, baseY: m.y, baseRotation: m.rotation,
      appliedX: entry.baseX + sway.x + dx * cos - dy * sin, appliedY: entry.baseY + sway.y + dx * sin + dy * cos,
      appliedRotation: m.rotation + sway.rotation };
    m.position.set(r.appliedX, r.appliedY); m.rotation = r.appliedRotation;
    riders.push(r);
  }
  entry.riders = riders;
}

function restore(entry) {
  restoreRiders(entry);
  const mesh = entry.mesh;
  if (!entry.applied || !mesh || mesh.destroyed) { entry.applied = false; return; }
  // A render flag may have already replaced one component; never subtract from a fresh value.
  if (mesh.x === entry.appliedX) mesh.x = entry.baseX;
  if (mesh.y === entry.appliedY) mesh.y = entry.baseY;
  if (mesh.rotation === entry.appliedRotation) mesh.rotation = entry.baseRotation;
  entry.applied = false;
}

function restoreAll() { for (let i = 0; i < active.length; i++) restore(active[i]); }
function beforeFrame() { if (!game.paused) restoreAll(); }

function afterFrame() {
  // Retain the last applied pose and phase while time is stopped.
  if (game.paused) return;
  const begin = performance.now();
  const tempo = poscigFlag()?.tempoTla ?? 2;
  const dt = Math.min(ticker.deltaMS, 50) / 1000, ease = 1 - Math.exp(-dt / SIZE_EASE_S);
  for (let i = 0; i < active.length; i++) {
    const entry = active[i];
    const token = entry.token, mesh = token.mesh;
    // Originals stay animated while dragged; preview tokens never enter this cache.
    if (!enabled || !mesh || mesh.destroyed || token.isPreview || token._original
      || !przyciagnietyDoToru(geometry(token.document, NO_CHANGES, entry.geometry))) continue;
    entry.mesh = mesh;
    // Rendered length, not footprint: QuickScale scales the artwork and leaves width/height alone.
    const size = Math.max(mesh.width, mesh.height) / entry.geometry.gridSize;
    entry.size = entry.size ? entry.size + (size - entry.size) * ease : size;
    entry.clock += dt * rytmKolysania(tempo, entry.size);
    const sway = kolysanieZegara(entry.seed, entry.clock, tempo, entry.size, entry.sway);
    if (!(sway.x || sway.y || sway.rotation)) continue;
    entry.baseX = mesh.x; entry.baseY = mesh.y; entry.baseRotation = mesh.rotation;
    entry.appliedX = mesh.x + sway.x; entry.appliedY = mesh.y + sway.y;
    entry.appliedRotation = mesh.rotation + sway.rotation;
    mesh.position.set(entry.appliedX, entry.appliedY); mesh.rotation = entry.appliedRotation;
    entry.applied = true;
    swayRiders(entry, sway);
  }
  cost += performance.now() - begin; frames++;
}

function remember(token) {
  if (!token || token.isPreview || token._original || !poscigFlag(token.document.parent)) return;
  if (!entries.has(token.id)) {
    const entry = { token, mesh: token.mesh, seed: ziarnoPionka(token.id), geometry: {}, sway: {}, size: 0, clock: 0, applied: false };
    entries.set(token.id, entry); active.push(entry);
  }
}

function stop() {
  restoreAll(); entries.clear(); active = [];
  ticker?.remove(beforeFrame, null); ticker?.remove(afterFrame, null); ticker = null;
}

async function start() {
  stop();
  if (!poscigFlag()) return;
  enabled = game.settings.get(MODULE_ID, SETTING_SWAY);
  for (const token of canvas.tokens.placeables) remember(token);
  ticker = canvas.app.ticker;
  // Core animations run at LOW + 1; canvas rendering runs at LOW.
  ticker.add(beforeFrame, null, PIXI.UPDATE_PRIORITY.HIGH + 1);
  ticker.add(afterFrame, null, PIXI.UPDATE_PRIORITY.LOW + .5);
  // Bring old boards into the same document rule once, without a per-frame GM relay.
  if (game.user.isActiveGM) {
    const updates = canvas.scene.tokens.map(doc => ({ doc, rotation: facing(doc) }))
      .filter(({doc, rotation}) => rotation !== null && (doc.rotation !== rotation || doc.lockRotation))
      .map(({doc, rotation}) => ({ _id: doc.id, rotation, lockRotation: false }));
    if (updates.length) await canvas.scene.updateEmbeddedDocuments("Token", updates, { animate: false, [DERIVED_UPDATE]: true });
  }
}

export function resetPoscigSway() {
  // v14 broadcasts user Setting documents to every client and runs onChange there too.
  // Read this user's value rather than adopting the other user's callback argument.
  enabled = game.settings.get(MODULE_ID, SETTING_SWAY);
  restoreAll();
}

export function registerPoscigMotion() {
  Hooks.on("preCreateToken", preCreate);
  Hooks.on("preUpdateToken", preUpdate);
  Hooks.on("canvasReady", start);
  Hooks.on("canvasTearDown", stop);
  Hooks.on("drawToken", remember);
  Hooks.on("destroyToken", token => { const entry = entries.get(token.id); if (entry?.token === token) { restore(entry); entries.delete(token.id); active = active.filter(e => e !== entry); } });
  Hooks.on("updateScene", (scene, changes) => {
    if (scene.id !== canvas.scene?.id) return;
    const changed = changes.flags?.[MODULE_ID];
    // Deleted: the v14 operator under the key, or (older callers) a `-=` key.
    if (changed?.["-=poscig"] !== undefined || changed?.poscig instanceof foundry.data.operators.ForcedDeletion) stop();
    else if (changed?.poscig && !ticker && canvas.ready) start();
    if (changed?.poscig?.tempoTla === 0) restoreAll();
  });
  start();
}

export const poscigMotionApi = {
  przyciagnietyDoToru, wPasiePoscigu, rotationNaPrawo, kolysanie, rytmKolysania, kolysanieZegara,
  stats(reset = false) {
    const result = { frames, averageMs: frames ? cost / frames : 0, tokens: entries.size };
    if (reset) cost = frames = 0;
    return result;
  }
};
