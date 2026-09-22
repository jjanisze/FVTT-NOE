/**
 * Neuroshima 5e — Przedmioty podręczne (trzy sloty przy pasie).
 *
 * RAW, *Tworzenie postaci*, **Przedmioty podręczne**:
 *
 * > Tu wpisujesz drobne przedmioty, które nosisz przy pasie lub w kieszeni, np. medpak, granat
 * > czy zapasowy magazynek. Możesz je wyciągnąć w ramach Darmowej Interakcji [I], ale już
 * > skorzystanie z nich wymaga akcji Używanie. Możesz mieć przy sobie maksymalnie **trzy**
 * > przedmioty podręczne.
 *
 * ## Co egzekwujemy, a czego nie — i dlaczego
 *
 * **Egzekwujemy limit trzech.** To liczba z podręcznika i jedyna rzecz, którą da się sprawdzić
 * bez zgadywania. Sloty są **wspólne** dla magazynków, granatów i leków, bo RAW wymienia je
 * w jednym zdaniu — medpak zajmuje slot, który mógłby zająć magazynek, i to jest cała decyzja
 * taktyczna, jaką ten limit wnosi.
 *
 * **Nie zabraniamy sięgnięcia do plecaka.** RAW nie mówi, że z plecaka nie wolno — mówi tylko,
 * że Darmowa Interakcja obejmuje przedmioty przy pasie. Ile dokładnie trwa rozpięcie plecaka
 * w środku wymiany ognia, to pytanie, na które szczera odpowiedź brzmi „MG zdecyduje przy
 * stole", a nie liczba, którą wpiszemy w kod. Więc sięgnięcie do plecaka jest **oznaczane,
 * nie blokowane**: karta czatu mówi wprost, skąd przedmiot przyszedł, kolorem, którego nie da
 * się przeoczyć, a MG decyduje, czy to kosztowało coś więcej.
 *
 * To ta sama doktryna, co w całym module: **automatyzujemy wykrywanie, nigdy zastosowanie.**
 * Reguła, którą kod cicho wymusza, jest regułą, o której stół zapomina; reguła, którą kod
 * pokazuje na karcie, jest regułą, o której stół rozmawia.
 *
 * Dobywanie z plecaka nie jest też śledzone co do sztuki — jest umowne. Nie ma licznika
 * „ile razy sięgnąłeś", bo nie ma reguły, którą taki licznik by obsługiwał.
 */

import { GRENADE_MAP } from "../config/ammo-data.mjs";
import { MAG_SUBTYPES } from "../config/magazines-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na itemie: czy leży przy pasie. Brak flagi = w plecaku. */
export const AT_HAND_FLAG = "atHand";

/** RAW: „maksymalnie trzy przedmioty podręczne". Wspólne dla wszystkich rodzin. */
export const HANDY_LIMIT = 3;

/* -------------------------------------------- */
/*  Które przedmioty mogą leżeć przy pasie       */
/* -------------------------------------------- */

/**
 * Rodziny wymienione w RAW: „medpak, granat czy zapasowy magazynek".
 *
 * Lista jest zamknięta celowo. Gdyby każdy drobny przedmiot mógł zająć slot, limit trzech
 * przestałby cokolwiek znaczyć — a RAW nie daje żadnego kryterium „drobności", którym dałoby
 * się to rozstrzygnąć poza wyliczeniem.
 */
export function handyFamilyOf(item) {
  if (!item || item.type !== "consumable") return null;
  const type = item.system?.type ?? {};
  if (type.value === "ammo") {
    if (MAG_SUBTYPES.includes(type.subtype)) return "magazine";
    if (GRENADE_MAP[type.subtype]) return "grenade";
    return null;                                  // luźne naboje — nie są przedmiotem podręcznym
  }
  if (type.value === "lekarstwo") return "medicine";
  return null;
}

/** Czy item w ogóle może zająć slot podręczny. */
export function isHandyCandidate(item) {
  return handyFamilyOf(item) !== null;
}

/** Czy item leży przy pasie (Darmowa Interakcja), a nie w plecaku. */
export function isAtHand(item) {
  return item?.getFlag?.(MODULE_ID, AT_HAND_FLAG) === true;
}

/** Wszystkie przedmioty podręczne aktora, we wszystkich rodzinach. */
export function handyItems(actor) {
  return (actor?.items ?? []).filter(i => isHandyCandidate(i) && isAtHand(i));
}

/** Ile slotów zajętych. */
export function handyCount(actor) {
  return handyItems(actor).length;
}

/** Ile slotów wolnych. */
export function handyFree(actor) {
  return Math.max(0, HANDY_LIMIT - handyCount(actor));
}

/**
 * Przekłada przedmiot z plecaka na pas albo odwrotnie.
 *
 * Jedyne miejsce, gdzie limit jest twardo egzekwowany — i egzekwowany **na wejściu**, nie
 * w momencie użycia: nie da się oznaczyć czwartego przedmiotu jako podręcznego. Tak limit
 * pozostaje decyzją podjętą na spokojnie, przed walką, czym w fikcji jest.
 *
 * @returns {Promise<boolean>} false = odmowa (brak wolnego slotu)
 */
export async function toggleAtHand(item) {
  if (!isHandyCandidate(item)) return false;
  const actor = item.actor;
  if (isAtHand(item)) {
    await item.unsetFlag(MODULE_ID, AT_HAND_FLAG);
    return true;
  }
  if (actor && handyFree(actor) <= 0) {
    const names = handyItems(actor).map(i => i.name).join(", ");
    ui.notifications.warn(
      `${actor.name}: wszystkie ${HANDY_LIMIT} sloty podręczne zajęte (${names}). `
      + `Odłóż coś do plecaka, żeby zrobić miejsce.`
    );
    return false;
  }
  await item.setFlag(MODULE_ID, AT_HAND_FLAG, true);
  return true;
}

/* -------------------------------------------- */
/*  Pigułka na kartę czatu                       */
/* -------------------------------------------- */

/**
 * „Skąd to przyszło" jako pigułka do wklejenia w kartę czatu.
 *
 * Dwa jawnie różne komunikaty, bo mają dwie różne funkcje przy stole:
 *   - **podręczny** — spokojne potwierdzenie: przedmiot był przy pasie, wyciągnięcie było
 *     Darmową Interakcją, nie ma o czym rozmawiać;
 *   - **z plecaka** — widoczne ostrzeżenie: RAW nie daje na to Darmowej Interakcji, więc MG
 *     może uznać, że to kosztowało akcję, turę albo że po prostu się nie udało.
 *
 * Poza walką pigułka się nie pokazuje: „sięgnąłem do plecaka" bez presji czasu nie jest
 * informacją, tylko szumem na każdej karcie w grze.
 *
 * @param {Item5e} item
 * @param {object} [options]
 * @param {boolean} [options.force]  Pokaż także poza walką (do testów i podglądu).
 * @returns {string} HTML albo "" gdy nie ma czego pokazywać
 */
export function provenanceBadge(item, { force = false } = {}) {
  if (!isHandyCandidate(item)) return "";
  const actor = item.actor;
  if (!force && !actor?.inCombat) return "";

  return isAtHand(item)
    ? `<span class="neuro-handy-pill is-at-hand" data-tooltip="Przedmiot podręczny — wyciągnięcie w ramach Darmowej Interakcji [I].">`
      + `<i class="fa-solid fa-hand" inert></i> podręczny</span>`
    : `<span class="neuro-handy-pill is-from-pack" data-tooltip="RAW daje Darmową Interakcję tylko na przedmioty przy pasie. Czy sięgnięcie do plecaka było darmowe — decyzja MG.">`
      + `<i class="fa-solid fa-boxes-packing" inert></i> z plecaka</span>`;
}

/* -------------------------------------------- */
/*  Przełącznik w panelach ekwipunku             */
/* -------------------------------------------- */

/**
 * HTML przycisku „przy pasie / w plecaku" — jeden kształt dla wszystkich trzech paneli
 * (magazynki, granaty, leki), żeby slot znaczył to samo niezależnie od tego, gdzie się go klika.
 */
export function handyToggleHtml(item) {
  if (!isHandyCandidate(item)) return "";
  const on = isAtHand(item);
  return `<button type="button" class="unbutton item-control neuro-handy-toggle${on ? " is-on" : ""}"
    data-tooltip="${on
      ? "Przy pasie — wyciągnięcie w ramach Darmowej Interakcji [I]."
      : `W plecaku. Kliknij, żeby przełożyć na pas (maks. ${HANDY_LIMIT} przedmiotów podręcznych łącznie).`}"
    ><i class="fas fa-hand" inert></i></button>`;
}

/** Podpina `handyToggleHtml()` w podanym wierszu. Bezpieczne, gdy przycisku nie ma. */
export function bindHandyToggle(row, item) {
  row.querySelector(".neuro-handy-toggle")?.addEventListener("click", async ev => {
    ev.preventDefault();
    await toggleAtHand(item);
  });
}

export const __testing = Object.freeze({
  handyFamilyOf,
  HANDY_LIMIT
});
