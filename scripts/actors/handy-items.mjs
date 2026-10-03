/**
 * Neuroshima 5e — Przedmioty podręczne (sloty przy pasie). Model; UI paska w nagłówku karty:
 * `actors/handy-belt.mjs`. Plan: `PLAN_przedmioty_podreczne_v2.md`.
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
 * **Egzekwujemy limit** — trzy z RAW, plus sloty z założonego ekwipunku (WKK: Kamizelka
 * taktyczna, flaga `handySlots`). Limit jest egzekwowany **na wejściu**: nie da się położyć na
 * pas sztuki ponad limit. Utrata slotu (zdjęta kamizelka) niczego nie zrzuca — nadmiar jest
 * pokazany na czerwono, a decyzja należy do MG.
 *
 * **Co może leżeć przy pasie** (decyzja MG 2026-09-25): wszystko, czego RAW każe używać w walce —
 * opis wspomina Akcję, Akcję Bonusową albo Używanie. RAW-owe „np." to przykłady, nie lista.
 * Rodziny poniżej (`FAMILIES`) to wynik przeglądu rozdziału Ekwipunek; przedmiot spoza nich MG
 * może dopuścić flagą `handy: true`. Broń i pancerz — nie: RAW ma dla broni osobne limity
 * „pod ręką", a pancerz się nosi, nie wyciąga.
 *
 * **Liczymy sztuki, nie stosy** (decyzja MG, 2026-09-24): siedem Relanium przy pasie to siedem
 * przedmiotów. Stos nie jest dzielony na dokumenty.
 *
 * ## Dane: sloty lalki
 *
 * Pas to pierwsza część postaci ze slotami — lalka (`actors/doll.mjs`, `PLAN_paper_doll.md`)
 * uogólniła go na ręce, pochwy, kabury i noszone. Od lalki pas nie ma własnej flagi: sztuki leżą
 * w tej samej flagi `slots` co wszystko inne, jako `belt.N` (`["belt.0", "belt.2"]` = dwie
 * sztuki, w slocie 1 i 3). Kolejność na pasie jest wolna — gracz ją ustawia przeciąganiem
 * (decyzja MG 2026-09-25). Stara flaga `atHand` (lista pozycji z v2.0, liczba albo `true` z v1)
 * jest czytana przez lalkę i przepisywana przy pierwszym zapisie (`migrateDoll`).
 *
 * Zapis idzie **przez lejek lalki** (`place`): położenie na zajęty slot zamienia (D5 — nowy
 * wjeżdża, poprzedni idzie na wolny slot pasa albo do plecaka); utrata slotu po zdjęciu kamizelki
 * odsyła nadmiar do plecaka (nadmiar nie może trwać). Jedyna odmowa, która została: dokładanie
 * „gdziekolwiek" (✋) na pełny pas — tam nie ma kogo zamienić.
 *
 * **Zużycie schodzi najpierw z pasa.** Gdy ilość spada, `preUpdateItem` lalki zdejmuje sztukę
 * w tej samej aktualizacji — tę z klikniętego kafelka (`withConsumeHint`), inaczej najwyższą.
 * Dlatego pigułka „skąd to przyszło" jest liczona **przed** zużyciem.
 *
 * **Nie zabraniamy sięgnięcia do plecaka.** RAW (*Tworzenie postaci*, **Plecak**): „Wyciągnięcie
 * przedmiotu z plecaka zabiera **zazwyczaj** jedną akcję." Zazwyczaj — więc sięgnięcie jest
 * **oznaczane, nie blokowane**; MG decyduje, czy to kosztowało akcję. Ta sama doktryna, co
 * w całym module: **automatyzujemy wykrywanie, nigdy zastosowanie.**
 */

import { GRENADE_MAP } from "../config/ammo-data.mjs";
import { MAG_SUBTYPES } from "../config/magazines-data.mjs";
import { dollState, place, commitMoves, withConsumeHint as dollConsumeHint } from "./doll.mjs";
import { slotId, groupOf, parseSlot } from "./doll-model.mjs";
import { freeHandPill } from "../combat/grip.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na ekwipunku: ile slotów dokłada, gdy założony (WKK: Kamizelka taktyczna). */
export const HANDY_SLOTS_FLAG = "handySlots";

/** Flaga opt-in: MG dopuszcza przedmiot spoza rodzin do pasa. */
export const HANDY_OPT_IN_FLAG = "handy";

/** RAW: „maksymalnie trzy przedmioty podręczne". Baza, zanim dojdzie ekwipunek. */
export const HANDY_LIMIT = 3;

/* -------------------------------------------- */
/*  Rodziny                                      */
/* -------------------------------------------- */

const _flag = (item, key) => item?.getFlag?.(MODULE_ID, key);

/**
 * Rodziny przedmiotów, które mogą leżeć przy pasie. Kolejność = kolejność sprawdzania.
 * `use`/`caption` dopisują moduły-właściciele przez `registerHandyFamily()` — model nie importuje
 * paneli (granaty, leki, magazynki importują ten plik, więc odwrotny import byłby cykliczny).
 */
const FAMILIES = [
  {
    id: "magazine", label: "magazynki (z szybkoładowarką)",
    match: i => i.type === "consumable" && i.system?.type?.value === "ammo"
      && MAG_SUBTYPES.includes(i.system.type.subtype)
  },
  {
    id: "grenade", label: "granaty i ładunki",
    match: i => i.type === "consumable" && i.system?.type?.value === "ammo"
      && !!GRENADE_MAP[i.system.type.subtype]
  },
  {
    id: "medicine", label: "leki i używki",
    match: i => i.type === "consumable" && i.system?.type?.value === "lekarstwo"
  },
  {
    // RAW: każdy zestaw narzędzi ma w opisie „Używanie: …" — instrumenty i gry też są `tool`.
    id: "tool", label: "zestawy narzędzi",
    match: i => i.type === "tool"
  },
  {
    // Różności z RAW-owym użyciem w akcji, które moduł rozpoznaje po własnej fladze.
    // Reszta z przeglądu (gwizdek, lina, staza, trucizna…) nie istnieje jako przedmioty modułu —
    // kiedy powstaną, dostają `handy: true` w katalogu.
    id: "gear", label: "sprzęt używany w walce (kolczatki, flara, kwas, sprzęt do wspinaczki…)",
    match: i => _flag(i, "kolczatka") != null || _flag(i, "flara") != null
      || _flag(i, "gearId") === "sprzet_wspinaczkowy" || _flag(i, HANDY_OPT_IN_FLAG) === true
  }
];

/**
 * Moduł-właściciel dopina zachowanie rodziny. `use(item, ctx)` — klik w kafelek; `caption(item)` —
 * podpis kafelka; `refuse(item)` — powód odmowy położenia na pas („wpięty w broń") albo null.
 * @param {string} id
 * @param {{use?: Function, caption?: Function, refuse?: Function}} def
 */
export function registerHandyFamily(id, def) {
  const family = FAMILIES.find(f => f.id === id);
  if (!family) throw new Error(`Unknown handy family "${id}"`);
  Object.assign(family, def);
}

/** Id rodziny albo `null`, gdy przedmiot nie może leżeć przy pasie. */
export function handyFamilyOf(item) {
  if (!item) return null;
  return FAMILIES.find(f => f.match(item))?.id ?? null;
}

/** Etykiety rodzin do komunikatów („magazynki, granaty…"). */
export function handyFamilyLabels() {
  return FAMILIES.map(f => f.label);
}

/** Czy item w ogóle może zająć slot podręczny. */
export function isHandyCandidate(item) {
  return handyFamilyOf(item) !== null;
}

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

function _quantity(item) {
  return Math.max(0, Math.floor(Number(item?.system?.quantity ?? 0)) || 0);
}

/** Pozycje pasa (`[0, 2]`) zajęte przez sztuki tego stosu — ze slotów lalki. */
function _beltPositions(state, item) {
  const d = state.items.find(x => x.id === item?.id);
  return (d?.slots ?? []).filter(s => groupOf(s) === "belt").map(s => parseSlot(s).index).sort((a, b) => a - b);
}

/** Ile sztuk tego stosu leży przy pasie — zawsze w zakresie 0…ilość. */
export function beltCount(item) {
  if (!isHandyCandidate(item) || !item.actor) return 0;
  return Math.min(_beltPositions(dollState(item.actor), item).length, _quantity(item));
}

/** Czy przynajmniej jedna sztuka leży przy pasie (Darmowa Interakcja), a nie w plecaku. */
export function isAtHand(item) {
  return beltCount(item) > 0;
}

function _beltItems(actor) {
  const state = dollState(actor);
  return state.items.filter(d => d.family === "belt" && d.slots.some(s => groupOf(s) === "belt"));
}

/** Wszystkie stosy aktora, z których coś leży przy pasie. */
export function handyItems(actor) {
  return _beltItems(actor).map(d => actor.items.get(d.id)).filter(Boolean);
}

/** Ile slotów zajętych — suma sztuk przy pasie, nie liczba stosów. */
export function handyCount(actor) {
  return _beltItems(actor).reduce((n, d) => n + d.slots.filter(s => groupOf(s) === "belt").length, 0);
}

/**
 * Pojemność pasa z listy przedmiotów dających sloty. Czyste — testowane przez `__testing`.
 * @param {Array<{equipped: boolean, slots: number}>} worn
 */
export function handyCapacity(worn) {
  return HANDY_LIMIT + worn.reduce((n, w) => n + (w.equipped ? Math.max(0, Number(w.slots) || 0) : 0), 0);
}

/** Założone przedmioty, które dokładają sloty — do dymka licznika („+1 — Kamizelka taktyczna"). */
export function handySlotSources(actor) {
  return (actor?.items ?? [])
    .filter(i => Number(_flag(i, HANDY_SLOTS_FLAG)) > 0 && i.system?.equipped)
    .map(i => ({ name: i.name, slots: Number(_flag(i, HANDY_SLOTS_FLAG)) }));
}

/** Limit pasa: 3 z RAW + sloty z aktywnego ekwipunku (pojemność grupy `belt` lalki). */
export function handyLimit(actor) {
  if (!actor) return HANDY_LIMIT;
  return dollState(actor).layout.capacity.belt ?? HANDY_LIMIT;
}

/** Ile slotów wolnych. */
export function handyFree(actor) {
  return Math.max(0, handyLimit(actor) - handyCount(actor));
}

/**
 * Pas aktora slot po slocie: `[{slot, item|null, overflow}]`. To czyta pasek w nagłówku.
 * `overflow` — sztuka ponad pojemność; lalka sprząta ją do plecaka przy następnym zapisie,
 * więc to stan przejściowy (np. kamizelka skasowana z ekwipunku ręką MG).
 */
export function beltSlots(actor) {
  const { layout } = dollState(actor);
  const limit = layout.capacity.belt ?? HANDY_LIMIT;
  const out = [];
  for (let i = 0; i < limit; i++) {
    out.push({ slot: i, item: actor.items.get(layout.slots.get(slotId("belt", i))) ?? null, overflow: false });
  }
  for (const c of layout.conflicts) {
    const p = parseSlot(c.slot);
    if (p.group === "belt" && p.index >= limit) out.push({ slot: p.index, item: actor.items.get(c.itemId) ?? null, overflow: true });
  }
  return out;
}

/* -------------------------------------------- */
/*  Zapis — przez lejek lalki                    */
/* -------------------------------------------- */

function _warnFull(actor, limit) {
  const names = handyItems(actor).map(i => `${i.name}${beltCount(i) > 1 ? ` ×${beltCount(i)}` : ""}`).join(", ");
  ui.notifications.warn(`${actor.name}: wszystkie ${limit} sloty podręczne zajęte (${names}). `
    + `Odłóż coś do plecaka albo przeciągnij przedmiot na zajęty slot, żeby zamienić.`);
}

/**
 * Kładzie jedną sztukę na pas. Ze wskazanym slotem — zawsze (zajęty: zamiana, D5); bez slotu —
 * w pierwszy wolny, a gdy pas pełny, odmowa z listą tego, co na nim leży.
 * @returns {Promise<boolean>} false = odmowa (z komunikatem)
 */
export async function addToBelt(item, { slot } = {}) {
  const actor = item?.actor;
  if (!actor) return false;
  if (!isHandyCandidate(item)) {
    ui.notifications.warn(`${item.name}: tego nie nosi się przy pasie. Przedmioty podręczne to: `
      + `${handyFamilyLabels().join("; ")}.`);
    return false;
  }
  if (beltCount(item) >= _quantity(item)) {
    ui.notifications.warn(`${item.name}: w stosie jest ${_quantity(item)} szt. — wszystkie już przy pasie.`);
    return false;
  }
  const refusal = FAMILIES.find(f => f.match(item))?.refuse?.(item);
  if (refusal) {
    ui.notifications.warn(`${item.name}: ${refusal}`);
    return false;
  }
  const limit = handyLimit(actor);
  if (Number.isInteger(slot) && slot >= 0 && slot < limit) {
    return place(actor, item, slotId("belt", slot), { from: "pack" });
  }
  if (handyCount(actor) >= limit) { _warnFull(actor, limit); return false; }
  return place(actor, item, "belt", { from: "pack" });
}

/** Zdejmuje jedną sztukę z pasa (z podanego slotu, inaczej z najwyższego) do plecaka. */
export async function removeFromBelt(item, { slot } = {}) {
  const actor = item?.actor;
  if (!actor) return false;
  const positions = _beltPositions(dollState(actor), item);
  if (!positions.length) return false;
  const drop = positions.includes(slot) ? slot : positions[positions.length - 1];
  return place(actor, item, "pack", { from: slotId("belt", drop) });
}

/** Cały stos do plecaka. */
export async function clearBelt(item) {
  const actor = item?.actor;
  if (!actor || !isAtHand(item)) return false;
  const positions = _beltPositions(dollState(actor), item);
  return commitMoves(actor, positions.map(p => ({ itemId: item.id, from: slotId("belt", p), to: "pack" })));
}

/**
 * Przestawia sztukę ze slotu `from` na `to` (w limicie). Zajęty `to` — zamiana miejscami
 * (lalka oddaje wypchniętej sztuce zwolniony slot).
 */
export async function moveBeltPiece(actor, from, to) {
  const limit = handyLimit(actor);
  if (from === to || !Number.isInteger(to) || to < 0 || to >= limit) return false;
  const moving = beltSlots(actor)[from]?.item;
  if (!moving) return false;
  return place(actor, moving, slotId("belt", to), { from: slotId("belt", from), quiet: true });
}

/**
 * Ustawia liczbę sztuk przy pasie. Dokłada w pierwsze wolne sloty, zdejmuje od najwyższego.
 */
export async function setBeltCount(item, count) {
  if (!isHandyCandidate(item)) return false;
  const target = Math.max(0, Math.floor(Number(count)) || 0);
  if (target > _quantity(item)) {
    ui.notifications.warn(`${item.name}: w stosie jest tylko ${_quantity(item)} szt.`);
    return false;
  }
  const live = () => item.actor?.items.get(item.id) ?? item;
  while (beltCount(live()) < target) if (!await addToBelt(live())) return false;
  while (beltCount(live()) > target) if (!await removeFromBelt(live())) return false;
  return true;
}

/**
 * Klik w przełącznik pasa w wierszu: dołóż jedną sztukę na pas; gdy już się nie da (cały stos
 * przy pasie albo brak slotu), odłóż wszystko. Dla ilości 1 to dokładnie włącz/wyłącz.
 */
export async function toggleAtHand(item) {
  if (!isHandyCandidate(item)) return false;
  const current = beltCount(item);
  const canAdd = current < _quantity(item) && handyFree(item.actor) > 0;
  if (canAdd) return addToBelt(item);
  if (current > 0) return clearBelt(item);
  return addToBelt(item); // nic przy pasie, brak slotu — addToBelt powie dlaczego
}

/* -------------------------------------------- */
/*  Zużycie                                      */
/* -------------------------------------------- */

/**
 * Uruchamia `fn` z informacją, z którego slotu pasa zeszła sztuka (klik w kafelek paska).
 * Samo przeliczenie slotów przy spadku ilości robi `preUpdateItem` lalki (`slotsAfterSpend`).
 */
export async function withConsumeHint(item, slot, fn) {
  return dollConsumeHint(item, slotId("belt", slot), fn);
}

/* -------------------------------------------- */
/*  Użycie z paska                               */
/* -------------------------------------------- */

/** Główne działanie przedmiotu — to, co robi klik w kafelek paska. */
export async function handyUse(item, { slot = null, event = null } = {}) {
  const family = FAMILIES.find(f => f.match(item));
  const run = async () => {
    if (family?.use) return family.use(item, { event, slot });
    const activities = [...(item.system?.activities?.values?.() ?? [])];
    if (activities.length) return item.use({ event });
    return item.sheet.render(true);
  };
  return slot == null ? run() : withConsumeHint(item, slot, run);
}

/** Krótki podpis kafelka (naboje w magazynku, rundy płonącej butelki, dawki) albo "". */
export function handyCaption(item) {
  const family = FAMILIES.find(f => f.match(item));
  try { return family?.caption?.(item) ?? ""; } catch (_e) { return ""; }
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
 * Liczona **przed** zużyciem: po nim ostatnia sztuka z pasa jest już zdjęta, więc wywołujący,
 * który zużywa przedmiot, zapamiętuje `isAtHand(item)` wcześniej i podaje go jako `atHand`.
 *
 * @param {Item5e} item
 * @param {object} [options]
 * @param {boolean} [options.force]   Pokaż także poza walką (do testów i podglądu).
 * @param {boolean} [options.atHand]  Pochodzenie ustalone przed zużyciem; domyślnie stan bieżący.
 * @returns {string} HTML albo "" gdy nie ma czego pokazywać
 */
export function provenanceBadge(item, { force = false, atHand } = {}) {
  if (!isHandyCandidate(item)) return "";
  const actor = item.actor;
  if (!force && !actor?.inCombat) return "";

  const where = (atHand ?? isAtHand(item))
    ? `<span class="neuro-handy-pill is-at-hand" data-tooltip="Przedmiot podręczny — wyciągnięcie w ramach Darmowej Interakcji [I].">`
      + `<i class="fa-solid fa-sack" inert></i> podręczny</span>`
    : `<span class="neuro-handy-pill is-from-pack" data-tooltip="Z plecaka. RAW: wyciągnięcie przedmiotu z plecaka zabiera zazwyczaj jedną akcję — ile kosztowało tym razem, decyduje MG.">`
      + `<i class="fa-solid fa-boxes-packing" inert></i> z plecaka</span>`;
  // Lalka (§5): przedmiot trzeba czymś wyciągnąć — uwaga dopiero przy dwóch ZAJĘTYCH rękach
  // (karabin trzymany „oburącz" nie blokuje granatu: robi to ręka z kolby).
  return where + freeHandPill(actor, { need: 1, what: item.name });
}

/* -------------------------------------------- */
/*  Przełącznik w panelach ekwipunku             */
/* -------------------------------------------- */

/**
 * HTML przycisku „przy pasie / w plecaku" — jeden kształt dla wszystkich paneli, żeby slot
 * znaczył to samo niezależnie od tego, gdzie się go klika. Ścieżka zapasowa: główna to
 * przeciąganie na pasek w nagłówku (`actors/handy-belt.mjs`).
 */
export function handyToggleHtml(item) {
  if (!isHandyCandidate(item)) return "";
  const belt = beltCount(item);
  const qty = _quantity(item);
  const stack = qty > 1;
  const limit = handyLimit(item.actor);
  const tip = belt
    ? `Przy pasie${stack ? `: ${belt} z ${qty} szt.` : ""} — wyciągnięcie w ramach Darmowej Interakcji [I].`
      + ` Klik: ${belt < qty ? "dołóż sztukę na pas (gdy nie ma miejsca — odłóż wszystko)" : "odłóż wszystko do plecaka"}.`
      + `${stack ? " PPM: odłóż jedną." : ""}`
    : `W plecaku. Klik albo przeciągnięcie na pasek w nagłówku: przełóż ${stack ? "sztukę " : ""}na pas `
      + `(maks. ${limit} przedmiotów podręcznych łącznie, liczone w sztukach).`;
  return `<button type="button" class="unbutton item-control neuro-handy-toggle${belt ? " is-on" : ""}"
    data-tooltip="${tip}"
    ><i class="fas fa-sack" inert></i>${stack && belt ? `<span class="neuro-handy-count">${belt}</span>` : ""}</button>`;
}

/** Podpina `handyToggleHtml()` w podanym wierszu i robi wiersz przeciągalnym na pasek. */
export function bindHandyToggle(row, item) {
  makeBeltDraggable(row, item);
  const btn = row.querySelector(".neuro-handy-toggle");
  if (!btn) return;
  btn.addEventListener("click", async ev => {
    ev.preventDefault();
    await toggleAtHand(item);
  });
  btn.addEventListener("contextmenu", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    if (beltCount(item) > 0) await removeFromBelt(item);
  });
}

/**
 * Wiersz wstrzyknięty po związaniu DragDrop przez dnd5e nie jest przeciągalny — dopinamy
 * standardowy ładunek `{type: "Item", uuid}`, więc działa też przeciąganie na innego aktora.
 */
export function makeBeltDraggable(row, item) {
  if (!row || row.dataset.neuroDraggable || !isHandyCandidate(item)) return;
  row.dataset.neuroDraggable = "1";
  row.setAttribute("draggable", "true");
  row.addEventListener("dragstart", ev => {
    if (ev.target.closest?.("input, button, a")) return;
    ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
    ev.dataTransfer.effectAllowed = "copyMove";
  });
}

export const __testing = Object.freeze({
  handyFamilyOf,
  handyCapacity,
  HANDY_LIMIT
});
