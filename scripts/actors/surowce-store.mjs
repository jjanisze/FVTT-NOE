/**
 * Neuroshima 5e — jeden lejek surowców (PLAN_produkcja §8).
 *
 * Produkcja liczy w **gamblach**, ekwipunek trzyma **kilogramy** w stosach o dowolnej wadze
 * jednostki: „Chemia (CH)” po 100 g, „Komponenty Amunicji” po 50 g, „Materiały konstrukcyjne”
 * na pojeździe jedną sztuką 20 kg. Wartość stosu to zawsze `waga × ilość × gbPerKg`
 * (NOE s. 144) — nazwa i cena na przedmiocie nie mają znaczenia.
 *
 * Każde zużycie, zwrot i przeniesienie surowców idzie tędy: start Roboty, zwrot przy
 * porzuceniu, Szybka produkcja, naprawa, doładowanie pochodni, „Przekaż do pojazdu”.
 * Dwie rzeczy, których nie da się zrobić wprost na przedmiotach:
 *
 * - **`system.quantity` jest całkowite** (`physical-item.mjs`, `integer: true`) — ułamek jest
 *   po cichu zaokrąglany. Bierzemy więc całe jednostki, a nadwyżkę oddajemy „resztą”
 *   w jednostkach kanonicznych (1 gb = 100 g albo 1 kg). Reszta poniżej 1 gb przepada —
 *   to okruchy ze stosów o nietypowej wadze jednostki, nie realna strata.
 * - **Dwa kliknięcia pod rząd** nie mogą wydać tego samego dwa razy: każda operacja na aktorze
 *   czeka na poprzednią (kolejka per aktor, jak `_syncChain` w `bez-dna.mjs`).
 */

import { SUROWCE_TYPES, SUROWCE_BY_CODE, SUROWCE_ICON_DIR, getSurowiecType, surowiecUnitKg } from "../config/surowce-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const EPS = 1e-6;

/** Kody w kolejności wyświetlania. */
export const SUROWCE_CODES = Object.freeze(SUROWCE_TYPES.map(t => t.code));

/* -------------------------------------------- */
/*  Odczyt                                      */
/* -------------------------------------------- */

const TO_KG = Object.freeze({ kg: 1, g: 0.001, Mg: 1000, lb: 0.45359237, tn: 907.18474 });

/** Waga jednej sztuki przedmiotu w kg (obiekt `{value, units}` z dnd5e albo gołe liczby). */
export function itemUnitKg(item) {
  const w = item?.system?.weight;
  const value = Number(w?.value ?? (typeof w === "number" ? w : 0)) || 0;
  return value * (TO_KG[w?.units ?? "kg"] ?? 1);
}

/** Stosy danego surowca: `[{ item, unitKg, qty }]`, tylko te z czymś w środku. */
export function stacksOf(actor, code) {
  return (actor?.items?.contents ?? [])
    .filter(i => getSurowiecType(i)?.code === code)
    .map(item => ({ item, unitKg: itemUnitKg(item), qty: Number(item.system.quantity) || 0 }))
    .filter(s => s.unitKg > 0 && s.qty > 0);
}

/** Wartość zapasu jednego surowca u aktora, w gamblach. */
export function gbOf(actor, code) {
  const perKg = SUROWCE_BY_CODE[code]?.gbPerKg ?? 0;
  const gb = stacksOf(actor, code).reduce((s, x) => s + x.unitKg * x.qty * perKg, 0);
  return Math.round(gb * 1e6) / 1e6;
}

/** `{ CH, CE, CZ, MK, MO }` w gamblach. */
export function allGb(actor) {
  return Object.fromEntries(SUROWCE_CODES.map(c => [c, gbOf(actor, c)]));
}

/* -------------------------------------------- */
/*  Plan zużycia — czysta funkcja               */
/* -------------------------------------------- */

/**
 * Które stosy i ile sztuk zużyć, żeby pokryć `needGb`.
 *
 * Najpierw stosy kanoniczne (dokładnie 1 gb za sztukę — zero reszty), potem od najlżejszej
 * jednostki, żeby reszta była jak najmniejsza.
 *
 * @param {{id: string, unitKg: number, qty: number}[]} stacks
 * @param {number} needGb
 * @param {number} gbPerKg
 * @returns {{ ok: boolean, haveGb: number, updates: {id: string, qty: number, units: number}[], changeGb: number }}
 */
export function planTake(stacks, needGb, gbPerKg) {
  const canonKg = 1 / gbPerKg;
  const haveGb = stacks.reduce((s, x) => s + x.unitKg * x.qty * gbPerKg, 0);
  if (needGb <= EPS) return { ok: true, haveGb, updates: [], changeGb: 0 };
  if (haveGb + EPS < needGb) return { ok: false, haveGb, updates: [], changeGb: 0 };

  const ordered = [...stacks].sort((a, b) => {
    const ca = Math.abs(a.unitKg - canonKg) < EPS ? 0 : 1;
    const cb = Math.abs(b.unitKg - canonKg) < EPS ? 0 : 1;
    return ca - cb || a.unitKg - b.unitKg;
  });

  let remainingKg = needGb / gbPerKg;
  let takenKg = 0;
  const updates = [];
  for (const s of ordered) {
    if (remainingKg <= EPS) break;
    const units = Math.min(s.qty, Math.ceil(remainingKg / s.unitKg - EPS));
    if (units <= 0) continue;
    updates.push({ id: s.id, qty: s.qty - units, units });
    takenKg += units * s.unitKg;
    remainingKg -= units * s.unitKg;
  }
  const changeGb = Math.max(0, Math.floor((takenKg - needGb / gbPerKg) * gbPerKg + EPS));
  return { ok: true, haveGb, updates, changeGb };
}

/* -------------------------------------------- */
/*  Zapis — przez kolejkę per aktor             */
/* -------------------------------------------- */

const _chain = new Map();

/** Wykonuje `fn` po zakończeniu poprzedniej operacji na tym samym aktorze. */
function _serial(actor, fn) {
  const key = actor.uuid;
  const prev = _chain.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  _chain.set(key, next);
  next.finally(() => { if (_chain.get(key) === next) _chain.delete(key); });
  return next;
}

/** Dane nowego stosu kanonicznego: „Chemia (CH)”, 100 g za sztukę, 1 gb za sztukę. */
export function buildSurowiecItemData(code, quantity) {
  const t = SUROWCE_BY_CODE[code];
  return {
    name: `${t.label} (${t.code})`,
    type: "consumable",
    img: `${SUROWCE_ICON_DIR}/${t.icon}`,
    system: {
      type: { value: "trinket", subtype: "" },
      quantity,
      weight: { value: surowiecUnitKg(code), units: "kg" },
      price: { value: 1, denomination: "gb" }
    },
    flags: { [MODULE_ID]: { surowiec: code } }
  };
}

/** Stos, do którego dokładamy: nasz (flaga), potem dowolny o kanonicznej wadze jednostki. */
function _canonicalStack(actor, code) {
  const canonKg = surowiecUnitKg(code);
  const all = (actor.items?.contents ?? []).filter(i => getSurowiecType(i)?.code === code);
  return all.find(i => i.getFlag(MODULE_ID, "surowiec") === code)
    ?? all.find(i => Math.abs(itemUnitKg(i) - canonKg) < EPS)
    ?? null;
}

async function _give(actor, code, gb) {
  const units = Math.floor(gb + EPS);
  if (units <= 0) return 0;
  const stack = _canonicalStack(actor, code);
  if (stack) await stack.update({ "system.quantity": (Number(stack.system.quantity) || 0) + units });
  else await actor.createEmbeddedDocuments("Item", [buildSurowiecItemData(code, units)]);
  return units;
}

async function _take(actor, code, gb) {
  const t = SUROWCE_BY_CODE[code];
  const stacks = stacksOf(actor, code).map(s => ({ id: s.item.id, unitKg: s.unitKg, qty: s.qty, item: s.item }));
  const plan = planTake(stacks, gb, t.gbPerKg);
  if (!plan.ok) return { ok: false, haveGb: plan.haveGb };

  const deletes = [];
  const updates = [];
  for (const u of plan.updates) {
    const item = actor.items.get(u.id);
    // Opróżniony stos, który sami stworzyliśmy, znika; stos gracza (z własną nazwą, opisem)
    // zostaje na zero — ten sam wybór co panel Surowców: nie kasujemy cudzych rzeczy.
    if (u.qty <= 0 && item?.getFlag(MODULE_ID, "surowiec")) deletes.push(u.id);
    else updates.push({ _id: u.id, "system.quantity": Math.max(0, u.qty) });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  if (deletes.length) await actor.deleteEmbeddedDocuments("Item", deletes);
  if (plan.changeGb > 0) await _give(actor, code, plan.changeGb);
  return { ok: true, haveGb: plan.haveGb, changeGb: plan.changeGb };
}

/**
 * Zdejmuje `gb` gambli jednego surowca. Nie ruszy niczego, jeśli zapasu jest za mało.
 * @returns {Promise<{ok: boolean, haveGb: number}>}
 */
export function takeSurowce(actor, code, gb) {
  return _serial(actor, () => _take(actor, code, gb));
}

/** Dokłada `gb` gambli (całe jednostki) do stosu kanonicznego. */
export function giveSurowce(actor, code, gb) {
  return _serial(actor, () => _give(actor, code, gb));
}

/**
 * Brakujące gamble per typ wobec żądania `{ CH: 30, MK: 1 }` — pusty obiekt znaczy „starczy”.
 * @returns {Record<string, number>}
 */
export function shortfall(actor, want) {
  const out = {};
  for (const [code, gb] of Object.entries(want)) {
    const miss = gb - gbOf(actor, code);
    if (miss > EPS) out[code] = Math.ceil(miss - EPS);
  }
  return out;
}

/**
 * Zdejmuje kilka surowców naraz albo żadnego: najpierw sprawdza całość, potem zużywa.
 * Twarda blokada — obejście tworzyłoby przedmioty z niczego (PLAN_produkcja §1.5).
 * @param {Actor} actor
 * @param {Record<string, number>} want  `{ CH: 30, CZ: 4, MK: 1 }`
 * @returns {Promise<{ok: boolean, brak?: Record<string, number>}>}
 */
export function takeManySurowce(actor, want) {
  return _serial(actor, async () => {
    const brak = shortfall(actor, want);
    if (Object.keys(brak).length) return { ok: false, brak };
    for (const [code, gb] of Object.entries(want)) {
      if (gb > 0) await _take(actor, code, gb);
    }
    return { ok: true };
  });
}

/** Dokłada kilka surowców naraz. */
export function giveManySurowce(actor, give) {
  return _serial(actor, async () => {
    for (const [code, gb] of Object.entries(give)) if (gb > 0) await _give(actor, code, gb);
  });
}

/**
 * Przenosi `gb` gambli jednego surowca z `from` do `to` (pula → wykonawca, §8).
 * Najpierw zdejmuje, potem dokłada — przerwany ruch może zgubić, nigdy nie podwoi.
 */
export async function moveSurowce(from, to, code, gb) {
  const r = await takeSurowce(from, code, gb);
  if (!r.ok) return r;
  await giveSurowce(to, code, gb);
  return { ok: true };
}

/**
 * Przenosi całe stosy (z nazwą i opisem) do innego aktora, do limitu `maxKg` —
 * „Przekaż do pojazdu” z panelu Surowców. Stos o tej samej nazwie u celu jest powiększany.
 * @returns {Promise<{movedKg: number, movedUnits: number, totalUnits: number}>}
 */
export function transferAllSurowce(source, dest, { maxKg = Infinity } = {}) {
  return _serial(source, async () => {
    const stacks = source.items.contents
      .filter(i => getSurowiecType(i) && (i.system.quantity ?? 0) > 0)
      .sort((a, b) => getSurowiecType(a).order - getSurowiecType(b).order);
    const totalUnits = stacks.reduce((s, i) => s + (i.system.quantity ?? 0), 0);

    let remainingKg = maxKg;
    const toCreate = [];
    const toUpdateDest = [];
    const toUpdateSource = [];
    let movedKg = 0;
    let movedUnits = 0;

    for (const item of stacks) {
      const unitKg = itemUnitKg(item);
      const have = item.system.quantity ?? 0;
      const fit = unitKg > 0 ? Math.floor(remainingKg / unitKg) : have;
      const move = Math.max(0, Math.min(have, fit));
      if (move <= 0) continue;

      const existing = dest.items.find(v => v.type === item.type && v.name === item.name);
      if (existing) {
        toUpdateDest.push({ _id: existing.id, "system.quantity": (existing.system.quantity ?? 0) + move });
      } else {
        const data = item.toObject();
        delete data._id;
        delete data.folder;
        data.system.quantity = move;
        if ("equipped" in data.system) data.system.equipped = false;
        toCreate.push(data);
      }
      toUpdateSource.push({ _id: item.id, "system.quantity": have - move });

      movedKg += unitKg * move;
      movedUnits += move;
      remainingKg -= unitKg * move;
      if (remainingKg <= 0) break;
    }

    if (toCreate.length) await dest.createEmbeddedDocuments("Item", toCreate);
    if (toUpdateDest.length) await dest.updateEmbeddedDocuments("Item", toUpdateDest);
    if (toUpdateSource.length) await source.updateEmbeddedDocuments("Item", toUpdateSource);
    return { movedKg, movedUnits, totalUnits };
  });
}

export const surowceApi = Object.freeze({
  gbOf, allGb, shortfall, take: takeSurowce, give: giveSurowce,
  takeMany: takeManySurowce, giveMany: giveManySurowce, move: moveSurowce
});

export const __testing = Object.freeze({ planTake });
