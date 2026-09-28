/**
 * Neuroshima 5e — Pula i Miejsca (PLAN_produkcja §8, D6).
 *
 * **Pula** to wspólne zasoby, **z których się przenosi**, nie produkuje: dla każdej drużyny,
 * do której należy aktor — jej `primaryVehicle`, pojazdy będące członkami i Miejsca. Plecaki
 * innych BG się nie liczą (D6), a ekwipunek aktora-grupy to worek łupu do podziału
 * (`actors/party-loot-lock.mjs`), nie bank — też nie.
 *
 * **Miejsce** to aktor typu `vehicle` z flagą `miejsce` — warsztat, baza: kontener na Roboty,
 * których nikt nie nosi. Tworzy je MG (E4).
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga aktora-Miejsca: `{ druzyna: groupActorId | null }`. */
export const MIEJSCE_FLAG = "miejsce";

export function isMiejsce(actor) {
  return !!actor?.getFlag?.(MODULE_ID, MIEJSCE_FLAG);
}

/** Drużyny (aktorzy `group`), do których należy aktor. */
export function druzynyAktora(actor) {
  if (!actor) return [];
  return game.actors.filter(g => g.type === "group"
    && (g.system.members ?? []).some(m => m.actor === actor || m.actor?.id === actor.id));
}

/**
 * Aktorzy puli danego aktora (bez niego samego), w kolejności: pojazd drużyny, pojazdy-członkowie,
 * Miejsca. Miejsce bez przypisanej drużyny należy do puli każdego.
 * @returns {Actor[]}
 */
export function pulaAktora(actor) {
  const druzyny = druzynyAktora(actor);
  const ids = new Set(druzyny.map(g => g.id));
  const out = [];
  for (const g of druzyny) {
    if (g.system.primaryVehicle) out.push(g.system.primaryVehicle);
    for (const m of g.system.members ?? []) if (m.actor?.type === "vehicle") out.push(m.actor);
  }
  for (const a of game.actors) {
    if (!isMiejsce(a)) continue;
    const d = a.getFlag(MODULE_ID, MIEJSCE_FLAG)?.druzyna ?? null;
    if (!d || ids.has(d) || druzyny.length === 0) out.push(a);
  }
  return out.filter((a, i, arr) => a && a !== actor && arr.indexOf(a) === i);
}
