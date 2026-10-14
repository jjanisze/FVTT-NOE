/**
 * The Poligon's own persistent state — two hidden world settings in the `world` namespace (a world's
 * own scripts register there; nothing of this exists in the campaign):
 *
 *   world.poligonStan       per station: built at, commit, seats, summary, active station
 *   world.poligonWerdykty   per probe: ✅ / ❌ / 💬 with the commit and time it was given on (§3.5 Karta prób)
 */

export const NS = "world";

export function registerStateSettings() {
  game.settings.register(NS, "poligonStan", { scope: "world", config: false, type: Object, default: { stations: {}, active: null } });
  game.settings.register(NS, "poligonWerdykty", { scope: "world", config: false, type: Object, default: {} });
}

export function stan() {
  return foundry.utils.deepClone(game.settings.get(NS, "poligonStan") ?? { stations: {}, active: null });
}

export async function zapiszStan(mutate) {
  const s = stan();
  s.stations ??= {};
  mutate(s);
  await game.settings.set(NS, "poligonStan", s);
  return s;
}

export function werdykty() {
  return foundry.utils.deepClone(game.settings.get(NS, "poligonWerdykty") ?? {});
}

/** `verdict`: "ok" | "bad" | "note" | null (clears). */
export async function ustawWerdykt(stationId, probeId, verdict, { note = null, commit = null } = {}) {
  const all = werdykty();
  const key = `${stationId}/${probeId}`;
  if (!verdict) delete all[key];
  else all[key] = { verdict, note, commit, at: new Date().toISOString(), user: game.user.name };
  await game.settings.set(NS, "poligonWerdykty", all);
  return all[key] ?? null;
}

/** The freshness stamp `fvtt` writes on every poligon:start/reset/packs (`Data/agent-poligon-state/stamp.json`). */
export async function stamp() {
  try {
    const r = await fetch(foundry.utils.getRoute("agent-poligon-state/stamp.json"), { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
