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

/** Optional reusable result makes the runtime ticker allocate nothing per token/frame. */
export function kolysanie(seed, seconds, tempo = 1, enabled = true, out = {}) {
  const speed = enabled ? Math.max(0, Math.min(Number(tempo) || 0, 4)) : 0;
  if (!speed) { out.x = out.y = out.rotation = 0; return out; }
  const phase = (seed >>> 0) / 4294967296 * Math.PI * 2;
  const t = seconds * (0.65 + speed * .35);
  const amplitude = Math.min(speed, 1.5);
  out.x = Math.sin(t * 13.1 + phase * 3) * .75 * amplitude;
  out.y = (Math.sin(t * 1.7 + phase) * 3.2 + Math.sin(t * 17.3 + phase * 2) * .65) * amplitude;
  out.rotation = (Math.sin(t * 1.1 + phase) * .023 + Math.sin(t * 11.7 + phase * 4) * .003) * amplitude;
  return out;
}
