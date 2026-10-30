/** Presentation of one seat, independent of cover, mounted weapons and riding mechanics. */
import { jazdaZetonu, miejsceNosnika, nosnikJadacego } from "./stan.mjs";

export function prezentacjaMiejsca(miejsce) {
  const p = miejsce?.prezentacja;
  return {
    widocznosc: p?.widocznosc === "otwarta" ? "otwarta" : "zakryta",
    // Relative to the complete carrier image; a separate roof/mask is outside this model.
    warstwa: p?.warstwa === "pod" ? "pod" : "nad"
  };
}

export function otwarteMiejsce(miejsce) {
  return prezentacjaMiejsca(miejsce).widocznosc === "otwarta";
}

export function prezentacjaJadacego(doc) {
  const pojazd = nosnikJadacego(doc);
  if (!pojazd) return null;
  const miejsce = miejsceNosnika(pojazd, jazdaZetonu(doc).miejsce);
  return { pojazd, miejsce, ...prezentacjaMiejsca(miejsce) };
}

/** Seeing a figure does not confer ownership or access to the rest of the crew. */
export function rozpoznawalnyJadacy(miejsce, jadacy, dostepDoWnetrza) {
  return !!jadacy && (dostepDoWnetrza || (otwarteMiejsce(miejsce) && !!jadacy.object?.isVisible));
}

/**
 * Derive display order locally; preserve the original document sort for exit, paste and undo. Riders drawn at their
 * outside size overlap on a saddle (S1), so the front seat (larger `y`) draws over the rear one: a fraction in [0, 1)
 * keeps the whole crew between the carrier and the next whole sort value.
 */
export function sortJadacego(sort, sortPojazdu, prezentacja, miejsce = null) {
  const bazowy = Number(sort) || 0, nosnik = Number(sortPojazdu) || 0;
  const y = Number(miejsce?.y);
  const przod = Number.isFinite(y) ? Math.min(0.999, Math.max(0, (y + 10) / 20)) : 0;
  return (prezentacja.warstwa === "pod" ? Math.min(bazowy, nosnik - 1) : Math.max(bazowy, nosnik + 1)) + przod;
}
