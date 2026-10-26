/** Presentation of one seat, independent of cover, mounted weapons and riding mechanics. */
import { jazdaZetonu, miejsceOId, pojazdJadacego } from "./stan.mjs";

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
  const pojazd = pojazdJadacego(doc);
  if (!pojazd) return null;
  const miejsce = miejsceOId(pojazd.actor, jazdaZetonu(doc).miejsce);
  return { pojazd, miejsce, ...prezentacjaMiejsca(miejsce) };
}

/** Seeing a figure does not confer ownership or access to the rest of the crew. */
export function rozpoznawalnyJadacy(miejsce, jadacy, dostepDoWnetrza) {
  return !!jadacy && (dostepDoWnetrza || (otwarteMiejsce(miejsce) && !!jadacy.object?.isVisible));
}

/** Derive display order locally; preserve the original document sort for exit, paste and undo. */
export function sortJadacego(sort, sortPojazdu, prezentacja) {
  const bazowy = Number(sort) || 0, nosnik = Number(sortPojazdu) || 0;
  return prezentacja.warstwa === "pod" ? Math.min(bazowy, nosnik - 1) : Math.max(bazowy, nosnik + 1);
}
