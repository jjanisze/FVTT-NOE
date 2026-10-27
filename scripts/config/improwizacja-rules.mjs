/**
 * Neuroshima 5e — broń improwizowana: czyste zasady (NOE s. 253; Łyżeczka s. 69–70; PLAN_m6 §5.2, §5.2.1).
 *
 * Czysty: bez `game`, bez dokumentów — wejście to waga i rodzaj przedmiotu, wyjście to liczby bliźniaka (ukrytej
 * broni, którą `actors/improwizacja.mjs` trzyma na postaci dla przedmiotu w ręce).
 *
 *   - **RAW (s. 253):** 1k4 obrażeń typu wg MG, rzut 3/9 m, bez PB (chyba że biegłość w broni improwizowanej —
 *     Gladiator), broń biała i palna użyta inaczej (kolbą, rękojeścią) — też improwizowana, bez właściwości (U6).
 *     **Odpowiednik broni białej** („działa jak…”, MG) — tylko wzorce do 1k6 (autor, 2026-10-27: broń improwizowana
 *     nie daje 1k8 i więcej; nie Kafar, nie Piłomiecz), bez broni z silnikiem i zasilaniem.
 *   - **Chwyt (U3, MG):** poniżej 2 kg jednoręczna, od 2 kg oburęczna.
 *   - **Typ obrażeń (U5):** każdy przedmiot ma typ — flaga katalogu `obrazeniaImprowizowane`, inaczej obuchowe;
 *     w oknie obrażeń gracz wybiera inny (dnd5e pokazuje wybór, gdy część ma kilka typów).
 *   - **Łyżeczka (s. 70)** — osobny zestaw zasad, **rozłączny** z regułami broni improwizowanej (autor, 2026-10-27):
 *     kość i chwyt z tabeli wagi (tylko dla posiadacza Łyżeczki), rzut do 6 m, maks. waga = SIŁ kg, biegłość, naturalna
 *     1 — przedmiot pęka na dwie równe części. Bez wzmocnień Kobaltu: tabela już czyni z łyżeczki najlepszą broń wręcz.
 */

const _f = Object.freeze;
const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga bliźniaka na ukrytej broni: `{zrodlo: itemId, reka: slot, jak: weaponId|null}`. */
export const FLAGA_BLIZNIAKA = "improwizacja";

/**
 * Bliźniak — ukryta broń improwizowana (PLAN_m6 §5.2). Jeden predykat dla każdego widoku, który ma go nie widzieć:
 * karta, Oporządzenie, handel, stół wymiany, audyty, rozbiórka.
 */
export function jestBlizniakiem(item) {
  return !!item?.flags?.[MODULE_ID]?.[FLAGA_BLIZNIAKA];
}

/**
 * Flaga na przedmiocie-źródle: wybory dla niego (`jak` — „działa jak…” MG, `zwykla` — posiadacz Łyżeczki atakuje nim
 * jak zwykłą bronią improwizowaną).
 */
export const FLAGA_ZRODLA = "improwizacjaZrodlo";

/** Przedmiot, który bliźniak reprezentuje, albo null. */
export function zrodloBlizniaka(item) {
  if (!jestBlizniakiem(item)) return null;
  return item.actor?.items?.get?.(item.flags[MODULE_ID][FLAGA_BLIZNIAKA].zrodlo) ?? null;
}

/** Bliźniak przedmiotu (gdy już powstał) albo null. */
export function blizniakPrzedmiotu(item) {
  if (!item?.actor?.items) return null;
  return item.actor.items.find(i => jestBlizniakiem(i) && i.flags[MODULE_ID][FLAGA_BLIZNIAKA].zrodlo === item.id) ?? null;
}

/** RAW s. 253: kość i zasięg rzutu broni improwizowanej. */
export const IMPROWIZOWANA = _f({ kosc: _f({ number: 1, faces: 4 }), zasieg: _f({ value: 3, long: 9 }), typ: "bludgeoning" });

/** U3 (MG, 2026-10-26): od tej wagi przedmiot trzyma się oburącz. */
export const PROG_OBURECZNEJ_KG = 2;

/** Typy obrażeń do wyboru w oknie (pierwszy — domyślny przedmiotu). */
export const TYPY_IMPROWIZOWANE = _f(["bludgeoning", "slashing", "piercing"]);

/** Łyżeczka (s. 70): waga → kość i chwyt. Granice z RAW („do 5”, „6–11”…) — między nimi liczy się wyższy wiersz. */
export const LYZECZKA_TABELA = _f([
  _f({ doKg: 5, kosc: _f({ number: 1, faces: 6 }), chwyt: 1 }),
  _f({ doKg: 11, kosc: _f({ number: 2, faces: 6 }), chwyt: 2 }),
  _f({ doKg: 17, kosc: _f({ number: 3, faces: 6 }), chwyt: 2 }),
  _f({ doKg: 20, kosc: _f({ number: 4, faces: 6 }), chwyt: 2 })
]);

/** Łyżeczka (s. 70): „rzucać na dystans do 6 metrów” — jeden zasięg, bez dalekiego. */
export const LYZECZKA_ZASIEG = _f({ value: 6, long: null });

/** Liczba albo null — `null`, `undefined` i "" to „nieznane”, nie 0 (`Number(null) === 0`). */
const _num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** Odpowiednik broni białej (s. 253): najwyżej tyle obrażeń z kości wzorca (autor: „max 1k6”). */
export const MAKS_ODPOWIEDNIKA = 6;
const BEZ_ODPOWIEDNIKA = _f(["spalinowa", "zasilana"]);

/**
 * Czy broń z katalogu może być wzorcem „działa jak…” — biała, kość do 1k6, bez silnika i zasilania.
 * @param {{type: string, damage?: {number?: number, denomination?: number}, props?: string[]}} w  wpis `WEAPONS`
 */
export function dozwolonyOdpowiednik(w) {
  if (w?.type !== "biala") return false;
  const max = (Number(w.damage?.number) || 1) * (Number(w.damage?.denomination) || 0);
  if (!(max > 0) || max > MAKS_ODPOWIEDNIKA) return false;
  return !(w.props ?? []).some(p => BEZ_ODPOWIEDNIKA.includes(p));
}

/** Wiersz tabeli Łyżeczki dla wagi (indeks 0–3). Ponad 20 kg — ostatni (i tak ponad SIŁ, MG). */
export function wierszLyzeczki(kg) {
  const w = Math.max(0, _num(kg) ?? 0);
  const i = LYZECZKA_TABELA.findIndex(r => w <= r.doKg);
  return i === -1 ? LYZECZKA_TABELA.length - 1 : i;
}

/** Typy obrażeń: domyślny przedmiotu na pierwszym miejscu, potem reszta do wyboru. */
export function typyObrazen(domyslny = IMPROWIZOWANA.typ) {
  const pierwszy = TYPY_IMPROWIZOWANE.includes(domyslny) ? domyslny : IMPROWIZOWANA.typ;
  return [pierwszy, ...TYPY_IMPROWIZOWANE.filter(t => t !== pierwszy)];
}

/**
 * Liczby bliźniaka — zasady Łyżeczki **albo** broni improwizowanej, nigdy obie naraz.
 * @param {{waga?: number, typ?: string}} przedmiot  waga w kg (z zawartością, jeśli pojemnik — P2), domyślny typ
 * @param {object} [opts]
 * @param {boolean} [opts.lyzeczka]  atak techniką Łyżeczki (posiadacz zdolności, bez „działa jak…”)
 * @param {number|null} [opts.sila]  wartość SIŁ (maks. waga łyżeczki)
 * @returns {{kosc: {number: number, faces: number}, chwyt: 1|2, zasieg: {value: number, long: number|null},
 *   typy: string[], ponadSile: boolean, wiersz: number|null}}
 */
export function improwizacjaZ(przedmiot = {}, { lyzeczka = false, sila = null } = {}) {
  const waga = Math.max(0, _num(przedmiot.waga) ?? 0);
  const typy = typyObrazen(przedmiot.typ);
  if (lyzeczka) {
    const s = _num(sila);
    const wiersz = wierszLyzeczki(waga);
    const r = LYZECZKA_TABELA[wiersz];
    return { kosc: { ...r.kosc }, chwyt: r.chwyt, zasieg: { ...LYZECZKA_ZASIEG }, typy, ponadSile: s !== null && waga > s, wiersz };
  }
  return {
    kosc: { ...IMPROWIZOWANA.kosc },
    chwyt: waga >= PROG_OBURECZNEJ_KG ? 2 : 1,
    zasieg: { ...IMPROWIZOWANA.zasieg },
    typy, ponadSile: false, wiersz: null
  };
}

/** Łyżeczka, naturalna 1 (s. 70): dwie równe części — waga każdej. */
export function polowaWagi(kg) {
  return Math.round(Math.max(0, _num(kg) ?? 0) * 50) / 100;
}

export const __testing = _f({ improwizacjaZ, wierszLyzeczki, typyObrazen, polowaWagi, dozwolonyOdpowiednik });
