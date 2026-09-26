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
 * ## Dane: pozycje slotów na itemie
 *
 * Flaga `atHand` to **lista numerów slotów** zajętych przez sztuki tego stosu (`[0, 2]` = dwie
 * sztuki, w slocie 1 i 3). Długość listy to liczba sztuk przy pasie; kolejność na pasie jest
 * wolna — gracz ją ustawia przeciąganiem (decyzja MG 2026-09-25: gracze będą przestawiać pas
 * przed każdą walką). Jedno źródło prawdy, bez tablicy slotów na aktorze, którą trzeba by
 * synchronizować przy każdej zmianie ilości. Stare postacie flagi (liczba albo `true`, v1) są
 * czytane jako tyle sztuk bez pozycji — dostają pierwsze wolne sloty.
 *
 * **Zużycie schodzi najpierw z pasa.** Gdy ilość spada, `preUpdateItem` zdejmuje pozycje w tej
 * samej aktualizacji — tę z klikniętego kafelka (`withConsumeHint`), inaczej najwyższą. Dlatego
 * pigułka „skąd to przyszło" jest liczona **przed** zużyciem.
 *
 * **Nie zabraniamy sięgnięcia do plecaka.** RAW (*Tworzenie postaci*, **Plecak**): „Wyciągnięcie
 * przedmiotu z plecaka zabiera **zazwyczaj** jedną akcję." Zazwyczaj — więc sięgnięcie jest
 * **oznaczane, nie blokowane**; MG decyduje, czy to kosztowało akcję. Ta sama doktryna, co
 * w całym module: **automatyzujemy wykrywanie, nigdy zastosowanie.**
 */

import { GRENADE_MAP } from "../config/ammo-data.mjs";
import { MAG_SUBTYPES } from "../config/magazines-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na itemie: lista slotów zajętych przez sztuki tego stosu. */
export const AT_HAND_FLAG = "atHand";

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

/**
 * Surowa flaga → `{positions, legacy}`. `positions` — posortowane, unikalne, nieujemne; `legacy` —
 * liczba sztuk bez pozycji (flaga z v1). Bez przycinania do ilości — to robi `beltCount`.
 */
function _readBelt(raw) {
  if (Array.isArray(raw)) {
    const positions = [...new Set(raw.map(n => Math.floor(Number(n))).filter(n => Number.isFinite(n) && n >= 0))]
      .sort((a, b) => a - b);
    return { positions, legacy: 0 };
  }
  if (raw === true) return { positions: [], legacy: 1 };
  const n = Math.floor(Number(raw)) || 0;
  return { positions: [], legacy: Math.max(0, n) };
}

/** Ile sztuk tego stosu leży przy pasie — zawsze w zakresie 0…ilość. */
export function beltCount(item) {
  if (!isHandyCandidate(item)) return 0;
  const { positions, legacy } = _readBelt(_flag(item, AT_HAND_FLAG));
  return Math.min(positions.length + legacy, _quantity(item));
}

/** Czy przynajmniej jedna sztuka leży przy pasie (Darmowa Interakcja), a nie w plecaku. */
export function isAtHand(item) {
  return beltCount(item) > 0;
}

/** Wszystkie stosy aktora, z których coś leży przy pasie. */
export function handyItems(actor) {
  return (actor?.items ?? []).filter(i => beltCount(i) > 0);
}

/** Ile slotów zajętych — suma sztuk przy pasie, nie liczba stosów. */
export function handyCount(actor) {
  return handyItems(actor).reduce((n, i) => n + beltCount(i), 0);
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

/** Limit pasa: 3 z RAW + sloty z założonego ekwipunku. */
export function handyLimit(actor) {
  return handyCapacity(handySlotSources(actor).map(s => ({ equipped: true, slots: s.slots })));
}

/** Ile slotów wolnych. */
export function handyFree(actor) {
  return Math.max(0, handyLimit(actor) - handyCount(actor));
}

/**
 * Rozkład slotów. Czyste — testowane przez `__testing`.
 *
 * Sztuki z pozycją lądują na swoich slotach (kolizja → jak bez pozycji); sztuki bez pozycji
 * (stara flaga) i nadwyżki wypełniają pierwsze wolne sloty. Wynik ma długość co najmniej
 * `limit`; slot ≥ `limit` to nadmiar (np. po zdjęciu kamizelki).
 *
 * @param {Array<{id: string, positions: number[], legacy: number, quantity: number}>} entries
 * @param {number} limit
 * @returns {Array<string|null>}  id itemu na slot albo null
 */
export function layoutSlots(entries, limit) {
  const slots = [];
  const loose = [];
  for (const e of entries) {
    const keep = Math.min(e.positions.length + e.legacy, e.quantity);
    const placed = e.positions.slice(0, keep);
    for (const p of placed) {
      if (slots[p] == null) slots[p] = e.id;
      else loose.push(e.id);
    }
    for (let n = placed.length; n < keep; n++) loose.push(e.id);
  }
  for (const id of loose) {
    let i = 0;
    while (slots[i] != null) i++;
    slots[i] = id;
  }
  const length = Math.max(limit, slots.length);
  return Array.from({ length }, (_, i) => slots[i] ?? null);
}

function _entries(actor) {
  return (actor?.items ?? []).filter(isHandyCandidate).map(i => {
    const { positions, legacy } = _readBelt(_flag(i, AT_HAND_FLAG));
    return { id: i.id, positions, legacy, quantity: _quantity(i) };
  }).filter(e => e.positions.length + e.legacy > 0 && e.quantity > 0)
    .sort((a, b) => (a.positions[0] ?? Infinity) - (b.positions[0] ?? Infinity));
}

/** Pas aktora slot po slocie: `[{slot, item|null, overflow}]`. To czyta pasek w nagłówku. */
export function beltSlots(actor) {
  const limit = handyLimit(actor);
  return layoutSlots(_entries(actor), limit).map((id, slot) => ({
    slot, item: id ? actor.items.get(id) : null, overflow: slot >= limit
  }));
}

/* -------------------------------------------- */
/*  Zapis                                        */
/* -------------------------------------------- */

/** Pozycje itemu według bieżącego rozkładu (stara flaga dostaje tu swoje miejsca). */
function _positionsOf(actor, item) {
  return beltSlots(actor).filter(s => s.item?.id === item.id).map(s => s.slot);
}

function _beltUpdate(itemId, positions) {
  return { _id: itemId, [`flags.${MODULE_ID}.${AT_HAND_FLAG}`]: [...positions].sort((a, b) => a - b) };
}

function _warnFull(actor, limit) {
  const names = handyItems(actor).map(i => `${i.name}${beltCount(i) > 1 ? ` ×${beltCount(i)}` : ""}`).join(", ");
  ui.notifications.warn(`${actor.name}: wszystkie ${limit} sloty podręczne zajęte (${names}). `
    + `Odłóż coś do plecaka, żeby zrobić miejsce.`);
}

/**
 * Kładzie jedną sztukę na pas — w podany slot, jeśli jest wolny i w limicie, inaczej w pierwszy
 * wolny.
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
  if (handyCount(actor) >= limit) { _warnFull(actor, limit); return false; }

  const slots = beltSlots(actor);
  let target = Number.isInteger(slot) && slot >= 0 && slot < limit && !slots[slot]?.item ? slot : -1;
  if (target < 0) target = slots.findIndex((s, i) => i < limit && !s.item);
  if (target < 0) { _warnFull(actor, limit); return false; }

  await actor.updateEmbeddedDocuments("Item", [_beltUpdate(item.id, [..._positionsOf(actor, item), target])]);
  return true;
}

/** Zdejmuje jedną sztukę z pasa (z podanego slotu, inaczej z najwyższego) do plecaka. */
export async function removeFromBelt(item, { slot } = {}) {
  const actor = item?.actor;
  if (!actor) return false;
  const positions = _positionsOf(actor, item);
  if (!positions.length) return false;
  const drop = positions.includes(slot) ? slot : positions[positions.length - 1];
  await actor.updateEmbeddedDocuments("Item", [_beltUpdate(item.id, positions.filter(p => p !== drop))]);
  return true;
}

/** Cały stos do plecaka. */
export async function clearBelt(item) {
  if (!item?.actor || !isAtHand(item)) return false;
  await item.actor.updateEmbeddedDocuments("Item", [_beltUpdate(item.id, [])]);
  return true;
}

/**
 * Przestawia sztukę ze slotu `from` na `to` (w limicie). Zajęty `to` — zamiana miejscami.
 * Jedna aktualizacja dla obu itemów.
 */
export async function moveBeltPiece(actor, from, to) {
  const limit = handyLimit(actor);
  if (from === to || !Number.isInteger(to) || to < 0 || to >= limit) return false;
  const slots = beltSlots(actor);
  const moving = slots[from]?.item;
  if (!moving) return false;
  const other = slots[to]?.item ?? null;
  if (other?.id === moving.id) return false; // dwie sztuki tego samego stosu — nic się nie zmienia

  const a = _positionsOf(actor, moving);
  a[a.indexOf(from)] = to;
  const updates = [_beltUpdate(moving.id, a)];
  if (other) {
    const b = _positionsOf(actor, other);
    b[b.indexOf(to)] = from;
    updates.push(_beltUpdate(other.id, b));
  }
  await actor.updateEmbeddedDocuments("Item", updates);
  return true;
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
  while (beltCount(live()) > target) await removeFromBelt(live());
  return true;
}

/**
 * Klik w ✋: dołóż jedną sztukę na pas; gdy już się nie da (cały stos przy pasie albo brak
 * slotu), odłóż wszystko. Dla ilości 1 to dokładnie włącz/wyłącz.
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
 * Nowe pozycje po zmianie ilości. Czyste — testowane przez `__testing`.
 * Ubytek zdejmuje najpierw slot-podpowiedź (kliknięty kafelek), potem najwyższe; przybytek idzie
 * do plecaka. Wynik nigdy nie jest dłuższy niż nowa ilość.
 */
export function positionsAfterSpend(positions, oldQty, newQty, hint = null) {
  let left = [...positions].sort((a, b) => a - b);
  let spent = Math.max(0, oldQty - newQty);
  if (spent && hint != null && left.includes(hint)) {
    left = left.filter(p => p !== hint);
    spent--;
  }
  left = left.slice(0, Math.max(0, left.length - spent));
  return left.slice(0, Math.max(0, newQty));
}

/** Liczbowy odpowiednik `positionsAfterSpend` — dla starej flagi (v1) i testów. */
export function beltAfterQuantityChange(belt, oldQty, newQty) {
  return positionsAfterSpend(Array.from({ length: belt }, (_, i) => i), oldQty, newQty).length;
}

const _consumeHints = new Map();

/** Uruchamia `fn` z informacją, z którego slotu zeszła sztuka (klik w kafelek paska). */
export async function withConsumeHint(item, slot, fn) {
  _consumeHints.set(item.id, slot);
  try { return await fn(); } finally { _consumeHints.delete(item.id); }
}

function _onPreUpdateItem(item, changes) {
  const newQty = foundry.utils.getProperty(changes, "system.quantity");
  if (newQty === undefined || !isHandyCandidate(item)) return;
  const raw = _flag(item, AT_HAND_FLAG);
  if (raw == null) return;
  const oldQty = _quantity(item);
  const nextQty = Math.max(0, Math.floor(Number(newQty)) || 0);
  if (nextQty >= oldQty) return;

  const { positions, legacy } = _readBelt(raw);
  let next;
  if (legacy) {
    next = beltAfterQuantityChange(Math.min(legacy, oldQty), oldQty, nextQty);
    if (next === legacy) return;
  } else {
    next = positionsAfterSpend(positions.slice(0, oldQty), oldQty, nextQty, _consumeHints.get(item.id) ?? null);
    if (next.length === positions.length) return;
  }
  foundry.utils.setProperty(changes, `flags.${MODULE_ID}.${AT_HAND_FLAG}`, next);
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

export function registerHandyItems() {
  Hooks.on("preUpdateItem", _onPreUpdateItem);
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

  return (atHand ?? isAtHand(item))
    ? `<span class="neuro-handy-pill is-at-hand" data-tooltip="Przedmiot podręczny — wyciągnięcie w ramach Darmowej Interakcji [I].">`
      + `<i class="fa-solid fa-hand" inert></i> podręczny</span>`
    : `<span class="neuro-handy-pill is-from-pack" data-tooltip="Z plecaka. RAW: wyciągnięcie przedmiotu z plecaka zabiera zazwyczaj jedną akcję — ile kosztowało tym razem, decyduje MG.">`
      + `<i class="fa-solid fa-boxes-packing" inert></i> z plecaka</span>`;
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
    ><i class="fas fa-hand" inert></i>${stack && belt ? `<span class="neuro-handy-count">${belt}</span>` : ""}</button>`;
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
  beltAfterQuantityChange,
  positionsAfterSpend,
  layoutSlots,
  handyCapacity,
  readBelt: _readBelt,
  HANDY_LIMIT
});
