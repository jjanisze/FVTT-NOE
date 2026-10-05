import { LANE_W, FREEFORM_Y, torX, xNaTor } from "./poscig.mjs";

/** Pure geometry: the token's centre decides which side of the boundary it occupies. */
export function wPasiePoscigu({ poscig = false, y, height = 1, gridSize = LANE_W }) {
  return Boolean(poscig && Number.isFinite(y) && y + height * gridSize / 2 < FREEFORM_Y);
}

/** Shift placement is inferred from geometry; no stored, potentially stale lane flag. */
export function przyciagnietyDoToru(data, tolerance = 1) {
  if (!wPasiePoscigu(data)) return false;
  const center = data.x + (data.width ?? 1) * (data.gridSize ?? LANE_W) / 2;
  const lane = xNaTor(center);
  return lane >= 1 && lane <= data.tory && Math.abs(center - torX(lane)) <= tolerance;
}

/** Correction for native artwork: south = 0, east = +90, north = +180. */
export function rotationNaPrawo(offset = 0) {
  return ((270 + (Number(offset) || 0)) % 360 + 360) % 360;
}

export function ziarnoPionka(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

const predkosc = tempo => Math.max(0, Math.min(Number(tempo) || 0, 4));

/** Rendered vehicle length in lanes (1 = the tuned reference); QuickScale reaches 0.3–10 on a 1×1 token. */
export function dlugoscPojazdu(size = 1) {
  return Math.max(.25, Math.min(Number(size) || 1, 6));
}

/**
 * Sway clock speed. A faster road quickens the rhythm; a longer chassis is a slower pendulum
 * (period ∝ √length) — a motorcycle twitches, a battle-bus wallows.
 */
export function rytmKolysania(tempo = 1, size = 1) {
  const speed = predkosc(tempo);
  return speed && (0.65 + speed * .35) / Math.sqrt(dlugoscPojazdu(size));
}

/**
 * Offsets at an already-integrated `clock` (seconds × rytmKolysania). The runtime integrates it per
 * token, so a live resize or tempo change bends the rhythm instead of jumping its phase.
 * Larger vehicles: the slow drift grows with length, pothole bounce only with √length (heavy
 * suspension soaks it up), the yaw angle shrinks slightly (the long body still sweeps further).
 */
export function kolysanieZegara(seed, clock, tempo = 1, size = 1, out = {}) {
  const speed = predkosc(tempo);
  if (!speed) { out.x = out.y = out.rotation = 0; return out; }
  const k = dlugoscPojazdu(size), bump = Math.sqrt(k);
  const phase = (seed >>> 0) / 4294967296 * Math.PI * 2;
  const t = clock;
  const amplitude = Math.min(speed, 1.5);
  out.x = Math.sin(t * 13.1 + phase * 3) * .75 * bump * amplitude;
  out.y = (Math.sin(t * 1.7 + phase) * 3.2 * k + Math.sin(t * 17.3 + phase * 2) * .65 * bump) * amplitude;
  out.rotation = (Math.sin(t * 1.1 + phase) * .023 / Math.sqrt(bump) + Math.sin(t * 11.7 + phase * 4) * .003 / bump) * amplitude;
  return out;
}

/** Constant tempo and size. Optional reusable result makes the runtime ticker allocate nothing per token/frame. */
export function kolysanie(seed, seconds, tempo = 1, enabled = true, out = {}, size = 1) {
  const speed = enabled ? tempo : 0;
  return kolysanieZegara(seed, seconds * rytmKolysania(speed, size), speed, size, out);
}
