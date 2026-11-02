/**
 * Neuroshima 5e — Sztuczki z własnymi atakami i przyciskami (PLAN_beta §0 krok 8b, 2026-11-02): czyste zasady.
 *
 * | Sztuczka | s. | Co liczy moduł |
 * |---|---|---|
 * | Karateka | 104 | ataki ręką i nogą 1k6 obuch. z SIŁ albo ZRC; Szybki cios [B] |
 * | Barbarka | 102 | atak głową 1k4; Z baśki [B] — trafienie = obrażenia krytyczne; Wyjaśnić ci? — RO SIŁ albo Powalenie |
 * | Nożownik | 105 | po trafieniu nożem w swojej turze [B] drugi atak nożem w ten cel — trafienie = obrażenia krytyczne |
 * | Robin Hood | 106 | Stalowe palce — ładowanie broni miotanej bez osobnej akcji; Celowanie [B] — Ułatwienie w następnym ataku z łuku lub kuszy w ten cel |
 * | Jest zajebiście | 103 | sporny test Oszustwa z Intuicją drużyny; oblani — Ułatwienie w najbliższym Teście |
 * | Benzyna zamiast krwi | 102 | TT prowadzonego pojazdu + mod. MDR; Unikanie kierowcy chroni też pojazd |
 * | Plug & Play | 105 | podpowiedź Ułatwienia w teście INT przy przejmowaniu panelu |
 *
 * „Nóż” — wszystkie cztery z katalogu, także rzut nożem do rzucania (decyzja MG 2026-11-02, D19).
 */

/** Nożownik (D19): modele katalogu, które są nożem. */
export const NOZE = Object.freeze(["noz-taktyczny", "kamienny-noz", "noz-do-rzucania", "sztylet"]);

/** Robin Hood, Celowanie: łuki i kusze z katalogu. */
export const LUKI_I_KUSZE = Object.freeze(["luk-bloczkowy", "luk-tradycyjny", "kusza-bloczkowa", "kusza-automatyczna-pistoletowa", "kusza-automatyczna-cobra"]);

/** Karateka (Stalowe pięści): kość obrażeń; cecha — SIŁ albo ZRC, wyższa podpowiadana w oknie. */
export const KARATEKA_KOSC = 6;
export const KARATEKA_CECHY = Object.freeze(["str", "dex"]);
/** Barbarka (Kamienne czoło): kość ataku głową. */
export const BARBARKA_KOSC = 4;

/** Kolejność rozmiarów dnd5e (od najmniejszego). */
const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];

/** Barbarka, Wyjaśnić ci?: cel twojego rozmiaru albo mniejszy (nieznany rozmiar — średni). */
export function mozeObalic(rozmiarAtakujacego, rozmiarCelu) {
  const a = ROZMIARY.indexOf(rozmiarAtakujacego ?? "med");
  const c = ROZMIARY.indexOf(rozmiarCelu ?? "med");
  return (c < 0 ? 2 : c) <= (a < 0 ? 2 : a);
}

/** ST RO na Siłę przeciw Powaleniu z Wyjaśnić ci?: 8 + PB + mod. SIŁ. */
export const stWyjasnicCi = ({ pb, sila }) => 8 + (Number(pb) || 0) + (Number(sila) || 0);

/** Jest zajebiście: członek drużyny oblał sporny test, gdy jego Intuicja jest niższa (remis — stan bez zmian). */
export const oblalGadke = (intuicja, oszustwo) => Number(intuicja) < Number(oszustwo);

/**
 * Zapowiedziany atak (Nożownik, Celowanie): wpis na atakującym dotyczy tego ataku, gdy cel się zgadza, a broń jest na
 * liście (pusta lista — każda broń).
 * @param {{cel: string, bronie?: string[]}} wpis
 * @param {{celUuid: string|null, bronId: string|null}} atak
 */
export function zapowiedzPasuje(wpis, { celUuid, bronId }) {
  if (!wpis || !celUuid || wpis.cel !== celUuid) return false;
  return !wpis.bronie?.length || wpis.bronie.includes(bronId);
}

/** Benzyna zamiast krwi (Grigorij): premia do TT pojazdu — mod. MDR kierowcy, nigdy ujemna. */
export const grigorij = modMdr => Math.max(0, Number(modMdr) || 0);
