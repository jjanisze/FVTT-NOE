/**
 * Neuroshima 5e — Lalka (paper doll): czysty model slotów.
 *
 * Plan i decyzje MG: `PLAN_paper_doll.md` (D1–D38). Warstwa Foundry — lejek zapisu, przechwyty
 * `system.equipped`, użycie przedmiotu: `actors/doll.mjs`. Panel: `actors/doll-panel.mjs`.
 *
 * **Bez globali Foundry.** Ten plik operuje na zwykłych obiektach (`DollItem`, niżej) — warstwa
 * Foundry tłumaczy na nie przedmioty aktora i z powrotem. Dzięki temu cała logika „co gdzie
 * ląduje" testuje się tanio, na tablicach przypadków (TESTING.md, warstwa 4).
 *
 * ## Skąd ten model (RAI)
 *
 * NOE wciąż odwołuje się do fizycznego ekwipunku — dwie ręce, cztery egzemplarze broni białej
 * i trzy dystansowej „pod ręką" (Tworzenie postaci, s. 53–54), trzy przedmioty podręczne,
 * jeden pancerz, hełm, para ochraniaczy — ale nigdzie nie spisuje go jako systemu, bo na
 * papierze żyje w głowach graczy. Autor systemu zgodził się na metodę (2026-10-02): tam, gdzie
 * RAW zostawia MG pole do myślenia, zautomatyzowana karta może wypełnić luki, o ile nie
 * zaprzecza RAW i nie zmienia balansu. Wszystko poniżej, czego nie ma wprost w podręczniku
 * (geometria slotów, ręka ⟂ kabura, Głowa/Twarz/Ramię/Strój, automatyczne rozmieszczanie,
 * wypieranie, superpozycja chwytu), to taki RAI — tabela RAI w `scripts/wkk/README.md`.
 *
 * ## Dane
 *
 * Przedmiot ma **jedną flagę** `slots`: listę slotów zajętych przez jego sztuki
 * (`["hand.0"]`, `["ranged.0", "ranged.1"]` — dwa noże do rzucania z jednego stosu,
 * `["belt.2"]`). Sztuki spoza listy leżą w plecaku. Wielosłotowość (ciężki pancerz blokuje
 * ochraniacze) jest **wyprowadzana** z danych przedmiotu — zapisany jest tylko slot główny.
 */

/* -------------------------------------------- */
/*  Sloty                                        */
/* -------------------------------------------- */

/**
 * Grupy slotów. `tier`: `hand` (ręce), `stowed` (pas, pochwy, kabury — przy sobie, ale nie
 * w użyciu), `worn` (noszone). `system.equipped` = aktywny = `hand` albo `worn` (§4 planu).
 */
export const SLOT_GROUPS = Object.freeze({
  hand:     { label: "Ręka", plural: "Ręce", base: 2, tier: "hand" },
  belt:     { label: "Pas", plural: "Pas", base: 3, tier: "stowed" },
  melee:    { label: "Pochwa", plural: "Pochwy", base: 4, tier: "stowed" },
  ranged:   { label: "Kabura", plural: "Kabury", base: 3, tier: "stowed" },
  body:     { label: "Pancerz", plural: "Pancerz", base: 1, tier: "worn" },
  outfit:   { label: "Strój", plural: "Strój", base: 1, tier: "worn" },
  head:     { label: "Hełm", plural: "Hełm", base: 1, tier: "worn" },
  headGear: { label: "Głowa", plural: "Głowa", base: 1, tier: "worn" },
  faceGear: { label: "Twarz", plural: "Twarz", base: 1, tier: "worn" },
  shoulder: { label: "Ramię", plural: "Ramię", base: 1, tier: "worn" },
  arms:     { label: "Ochraniacze rąk", plural: "Ochraniacze rąk", base: 1, tier: "worn" },
  legs:     { label: "Ochraniacze nóg", plural: "Ochraniacze nóg", base: 1, tier: "worn" }
});

/**
 * Ręce widziane od przodu (D32): `hand.0` to prawa ręka postaci — na manekinie po lewej stronie
 * patrzącego; `hand.1` to lewa ręka — po prawej.
 */
export const HAND_LABELS = Object.freeze(["Prawa ręka", "Lewa ręka"]);
export const HAND_SHORT = Object.freeze(["P", "L"]);

/** Kolejność „najbardziej pod ręką" — z niej liczy się lokalizacja stosu i zużycie (§4). */
const ACCESS_ORDER = ["hand", "belt", "melee", "ranged", "shoulder", "headGear", "faceGear",
  "head", "outfit", "arms", "legs", "body"];

export function slotId(group, index) {
  return `${group}.${index}`;
}

/** `"hand.1"` → `{group: "hand", index: 1}`; nieznana grupa albo śmieci → `null`. */
export function parseSlot(id) {
  const m = /^([A-Za-z]+)\.(\d+)$/.exec(String(id ?? ""));
  if (!m || !SLOT_GROUPS[m[1]]) return null;
  return { group: m[1], index: Number(m[2]) };
}

export function groupOf(id) {
  return parseSlot(id)?.group ?? null;
}

export function tierOf(id) {
  const g = groupOf(id);
  return g ? SLOT_GROUPS[g].tier : null;
}

/** Ręka albo noszone — przedmiot w takim slocie jest „założony" w sensie dnd5e. */
export function isActiveSlot(id) {
  const t = tierOf(id);
  return t === "hand" || t === "worn";
}

export function slotLabel(id) {
  const s = parseSlot(id);
  if (!s) return id === "ground" ? "ziemia" : "plecak";
  if (s.group === "hand") return HAND_LABELS[s.index] ?? `Ręka ${s.index + 1}`;
  const g = SLOT_GROUPS[s.group];
  return g.base > 1 || s.index > 0 ? `${g.label} ${s.index + 1}` : g.label;
}

/* -------------------------------------------- */
/*  Rodziny przedmiotów                          */
/* -------------------------------------------- */

/**
 * Rodzina = jakie grupy slotów przyjmują przedmiot (`groups`) i w jakiej kolejności szuka ich
 * automatyczne rozmieszczenie przy kliknięciu „Załóż" (`auto`, §4: najpierw wolny slot
 * w kolejności, potem zamiana z pierwszą grupą listy).
 *
 * Latarka idzie na Ramię, potem do wolnej ręki — gracze nie chcą tracić rąk. Na Głowę trafia
 * tylko przeciągnięta (§4), z jednym wyjątkiem: czołówka, która jest opaską na głowę z samej
 * nazwy (`headLight` — D31: oczywisty ruch).
 */
export const DOLL_FAMILIES = Object.freeze({
  meleeWeapon:  { label: "broń biała", groups: ["hand", "melee"], auto: ["hand", "melee"], weapon: true, holster: "melee" },
  rangedWeapon: { label: "broń dystansowa", groups: ["hand", "ranged"], auto: ["hand", "ranged"], weapon: true, holster: "ranged" },
  handOnly:     { label: "tylko w ręce", groups: ["hand"], auto: ["hand"] },
  light:        { label: "latarka", groups: ["shoulder", "hand", "headGear"], auto: ["shoulder", "hand"] },
  headLight:    { label: "latarka czołówka", groups: ["headGear", "shoulder", "hand"], auto: ["headGear", "shoulder", "hand"] },
  device:       { label: "urządzenie", groups: ["shoulder", "hand"], auto: ["shoulder", "hand"] },
  vision:       { label: "noktowizor / termowizor", groups: ["headGear"], auto: ["headGear"] },
  bodyArmor:    { label: "pancerz", groups: ["body"], auto: ["body"], bodyArmor: true },
  outfit:       { label: "strój", groups: ["outfit"], auto: ["outfit"] },
  helmet:       { label: "hełm", groups: ["head"], auto: ["head"] },
  face:         { label: "maska", groups: ["faceGear"], auto: ["faceGear"] },
  armGuards:    { label: "ochraniacze rąk", groups: ["arms"], auto: ["arms"] },
  legGuards:    { label: "ochraniacze nóg", groups: ["legs"], auto: ["legs"] },
  belt:         { label: "przedmiot podręczny", groups: ["belt"], auto: ["belt"] }
});

/**
 * Rodziny, którym lalka **wyprowadza** `system.equipped`. Pas ma własną semantykę (przedmioty
 * podręczne to amunicja, granaty, leki, zestawy narzędzi — „założony" nic dla nich nie znaczy
 * w dnd5e) i jego `equipped` zostaje nietknięty.
 */
export function governsEquipped(family) {
  return !!DOLL_FAMILIES[family] && family !== "belt";
}

export function accepts(family, group) {
  return !!DOLL_FAMILIES[family]?.groups.includes(group);
}

/* -------------------------------------------- */
/*  Klasyfikacja                                 */
/* -------------------------------------------- */

const MODULE_ID = "neuroshima-2026-overrides";

/** Typy broni modułu (`config/weapons.mjs`). Reszta (dnd5e `simpleM`…) to zaślepki — bez slotu. */
const MELEE_TYPES = new Set(["biala"]);
const RANGED_TYPES = new Set(["miotana", "palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka", "specjalna"]);
const BODY_ARMOR_TYPES = new Set(["light", "medium", "heavy"]);

/**
 * Atak bez broni z Roll20 jest wpisany jako broń biała („Bez broni", „Atak głową"). To nie
 * przedmiot, który się trzyma — zostaje poza lalką.
 */
const UNARMED = /^\s*(bez\s*broni|atak\s+g[łl]ow|pi[ęe][śs][ćc]|unarmed|cios\s+tarcz)/i;

/** Pancerze wspomagane (D23) — `config/armor-data.mjs`. */
export const POWER_ARMOR_IDS = Object.freeze(["pancerz-stalowej-policji", "wojskowy-pancerz-hydrauliczny"]);

/**
 * Ciężki pancerz blokuje ochraniacze — NOE, s. 115: „nie działają razem z ciężkim pancerzem".
 * Pancerz wspomagany to też ciężki pancerz, więc ta sama reguła; hełm wolno (D23, NOE).
 */
export const HEAVY_ARMOR_BLOCKS_RAW = Object.freeze(["arms", "legs"]);

const _flags = item => item?.flags?.[MODULE_ID] ?? {};

/** Id pancerza z katalogu: flaga `armorId` (nowe egzemplarze), inaczej nazwa pliku ikony. */
export function armorIdOf(item) {
  const flagged = _flags(item).armorId;
  if (flagged) return flagged;
  const m = /\/icons\/armor\/([a-z0-9-]+)\.svg$/i.exec(String(item?.img ?? ""));
  return m ? m[1] : null;
}

/**
 * Rodzina przedmiotu albo `null` (furtka: przedmiot bez rodziny zachowuje natywny przełącznik
 * dnd5e i lalka go nie dotyka). **Nieznane nigdy nie jest zgadywane** (§3) — rozpoznajemy
 * wyłącznie po typie broni, kategorii pancerza i flagach katalogowych modułu.
 *
 * @param {object} item            Przedmiot (dokument albo `toObject()`).
 * @param {object} [options]
 * @param {(item: object) => string|null} [options.handyFamily]  `handyFamilyOf` z modelu pasa.
 * @returns {string|null}
 */
export function classifyItem(item, { handyFamily = null } = {}) {
  if (!item) return null;
  const f = _flags(item);

  // Jawny wpis — katalog albo MG (`flags.<mod>.dollSlot`). "none" wyłącza lalkę dla przedmiotu.
  if (f.dollSlot === "none") return null;
  if (f.dollSlot && DOLL_FAMILIES[f.dollSlot]) return f.dollSlot;

  if (handyFamily?.(item)) return "belt";

  const sub = item.system?.type?.value;
  if (item.type === "weapon") {
    if (sub === "natural" || UNARMED.test(item.name ?? "")) return null;
    // Pochodnia (WKK): światło w ręce. W pochwie płonąca żagiew nie ma sensu, a zgaszona
    // to i tak drąg — trzyma się ją albo nosi w plecaku.
    if (f.pochodniaVariant) return "handOnly";
    if (MELEE_TYPES.has(sub)) return "meleeWeapon";
    if (RANGED_TYPES.has(sub)) return "rangedWeapon";
    return null;
  }

  if (item.type === "equipment") {
    if (sub === "shield") return "handOnly";
    if (BODY_ARMOR_TYPES.has(sub)) return "bodyArmor";
    if (f.latarkaForm) return f.latarkaForm === "czolowa" ? "headLight" : "light";
    // Noktowizor i termowizor na Głowie — świadome odstępstwo od RAW, który wśród form wymienia
    // montaż na hełmie. Bez wpływu na koszt i działanie (plan §11).
    if (f.gogleWariant) return "vision";
    if (f.nomex) return "outfit";
    const armorId = armorIdOf(item);
    if (armorId === "helm") return "helmet";
    if (armorId === "ochraniacze-rak") return "armGuards";
    if (armorId === "ochraniacze-nog") return "legGuards";
  }
  return null;
}

/**
 * Grupy, które przedmiot blokuje, gdy jest założony (wielosłotowość, §3). Liczone z danych,
 * nigdy nie zapisywane.
 * @param {object} item
 * @param {string|null} family
 * @param {object} [options]
 * @param {string[]} [options.powerArmorKobalt]  WKK (D23) — dodatkowe grupy pancerza
 *   wspomaganego; przekazuje warstwa Foundry z `wkk/config/doll-kobalt.mjs`, gdy Kobalt włączony.
 */
export function blocksOf(item, family, { powerArmorKobalt = [] } = {}) {
  if (family !== "bodyArmor") return [];
  if (item.system?.type?.value !== "heavy") return [];
  const out = [...HEAVY_ARMOR_BLOCKS_RAW];
  if (POWER_ARMOR_IDS.includes(armorIdOf(item))) out.push(...powerArmorKobalt);
  return [...new Set(out)];
}

/**
 * Sloty dokładane przez aktywny przedmiot (§4, źródła pojemności): `handySlots` (pas —
 * WKK Kamizelka taktyczna), `meleeSlots`, `rangedSlots` (pochwy, kabury, pasy nośne — WKK).
 */
export function capacityBonusOf(item) {
  const f = _flags(item);
  const out = {};
  for (const [flag, group] of [["handySlots", "belt"], ["meleeSlots", "melee"], ["rangedSlots", "ranged"]]) {
    const n = Math.floor(Number(f[flag]) || 0);
    if (n > 0) out[group] = n;
  }
  return out;
}

/* -------------------------------------------- */
/*  Odczyt stanu                                 */
/* -------------------------------------------- */

/**
 * @typedef {object} DollItem
 * @property {string} id
 * @property {string} family        Klucz `DOLL_FAMILIES`.
 * @property {number} quantity
 * @property {string[]} slots       Sloty zajęte przez sztuki (jeden wpis = jedna sztuka).
 * @property {string[]} [blocks]    Grupy blokowane, gdy założony.
 * @property {object} [capacity]    `{belt: 1}` — sloty dokładane, gdy aktywny.
 * @property {string} [name]
 */

/** Surowa flaga → poprawne, unikalne sloty (najwyżej tyle, ile sztuk). */
export function readSlots(raw, quantity = Infinity) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const s of raw) {
    if (parseSlot(s) && !out.includes(s)) out.push(String(s));
  }
  return out.slice(0, Math.max(0, quantity));
}

function _clone(items) {
  return items.map(i => ({ ...i, slots: [...(i.slots ?? [])], blocks: [...(i.blocks ?? [])] }));
}

/** Pojemność grup: baza + sloty z aktywnych przedmiotów. */
export function capacityOf(items) {
  const cap = Object.fromEntries(Object.entries(SLOT_GROUPS).map(([g, d]) => [g, d.base]));
  for (const it of items) {
    if (!it.capacity || !it.slots?.some(isActiveSlot)) continue;
    for (const [g, n] of Object.entries(it.capacity)) {
      if (cap[g] != null) cap[g] += Math.max(0, Math.floor(Number(n) || 0));
    }
  }
  return cap;
}

/**
 * Rozkład: kto siedzi w którym slocie, co jest zablokowane, co jest w stanie błędu.
 *
 * Kolejność `items` rozstrzyga kolizje (pierwszy wygrywa). Błędy (`conflicts`) to sztuki, które
 * nie mają prawa tam być: zajęty slot, slot ponad pojemność, grupa spoza rodziny, slot
 * zablokowany przez pancerz. Warstwa Foundry odsyła je do plecaka — nadmiar nie może trwać (D5).
 *
 * @param {DollItem[]} items
 * @param {object} [options]
 * @param {Object<string, object>} [options.occupants]  Nieprzedmiotowi „lokatorzy" rąk
 *   (`{"hand.1": {label: "trzyma: Bandyta"}}`) — pochwycenie, kierownica (§5).
 * @returns {{slots: Map<string, string>, blocked: Map<string, string>, capacity: object,
 *   conflicts: Array<{itemId: string, slot: string}>, occupants: object}}
 */
export function layoutOf(items, { occupants = {} } = {}) {
  const capacity = capacityOf(items);
  const slots = new Map();
  const blocked = new Map();
  const conflicts = [];

  // Najpierw blokady: pancerz założony w swoim slocie głównym.
  for (const it of items) {
    if (!it.blocks?.length) continue;
    if (!it.slots.some(s => DOLL_FAMILIES[it.family]?.groups.includes(groupOf(s)))) continue;
    for (const g of it.blocks) {
      for (let i = 0; i < (capacity[g] ?? 0); i++) if (!blocked.has(slotId(g, i))) blocked.set(slotId(g, i), it.id);
    }
  }

  for (const it of items) {
    for (const s of it.slots) {
      const { group, index } = parseSlot(s);
      const bad = !accepts(it.family, group) || index >= capacity[group] || slots.has(s)
        || (blocked.has(s) && blocked.get(s) !== it.id) || occupants[s];
      if (bad) conflicts.push({ itemId: it.id, slot: s });
      else slots.set(s, it.id);
    }
  }
  return { slots, blocked, capacity, conflicts, occupants };
}

/** Sztuki stosu w plecaku. */
export function packCount(it) {
  return Math.max(0, (it.quantity ?? 0) - (it.slots?.length ?? 0));
}

/**
 * Najbardziej „pod ręką" lokalizacja stosu: ręka > pas > pochwa/kabura > noszone > plecak.
 * @returns {{kind: "hand"|"belt"|"holster"|"worn"|"pack", slots: string[], count: number}}
 */
export function locationOf(it) {
  const slots = it?.slots ?? [];
  const by = kind => slots.filter(s => {
    const g = groupOf(s);
    if (kind === "holster") return g === "melee" || g === "ranged";
    if (kind === "worn") return tierOf(s) === "worn";
    return g === kind;
  });
  for (const kind of ["hand", "worn", "belt", "holster"]) {
    const hit = by(kind);
    if (hit.length) return { kind, slots: hit, count: slots.length };
  }
  return { kind: "pack", slots: [], count: 0 };
}

/* -------------------------------------------- */
/*  Chwyt (§5)                                   */
/* -------------------------------------------- */

/**
 * Superpozycja chwytu (D2): przedmiot trzymany w ręce **może** być chwycony oburącz wtedy
 * i tylko wtedy, gdy druga ręka jest pusta. Chwytu się nie zapisuje — wybiera się go w chwili
 * użycia, więc zapisany chwyt byłby zbędnym stanem.
 *
 * @param {DollItem[]} items
 * @param {string} itemId
 * @param {object} [options]
 * @param {Object<string, object>} [options.occupants]
 * @returns {{held: boolean, hand: string|null, other: string|null, otherItemId: string|null,
 *   otherOccupant: object|null, grips: number[]}}
 */
export function gripOf(items, itemId, { occupants = {} } = {}) {
  const it = items.find(i => i.id === itemId);
  const hand = it?.slots.find(s => groupOf(s) === "hand") ?? null;
  if (!hand) return { held: false, hand: null, other: null, otherItemId: null, otherOccupant: null, grips: [] };
  const { slots } = layoutOf(items, { occupants });
  const other = hand === "hand.0" ? "hand.1" : "hand.0";
  const otherItemId = slots.get(other) ?? null;
  const otherOccupant = occupants[other] ?? null;
  const free = !otherItemId && !otherOccupant;
  return { held: true, hand, other, otherItemId, otherOccupant, grips: free ? [1, 2] : [1] };
}

/* -------------------------------------------- */
/*  Rozstrzyganie ruchu (§4)                     */
/* -------------------------------------------- */

/**
 * @typedef {object} DollMove
 * @property {string} itemId
 * @property {string} from   Slot, `"pack"` albo `"ground"`.
 * @property {string} to     Slot, `"pack"` albo `"ground"`.
 * @property {boolean} [displaced]  Ruch wymuszony cudzym położeniem (wypchnięty przedmiot).
 */

/**
 * @typedef {object} DollQuestion
 * @property {"displace"|"whichHand"|"confirmArmor"} kind
 * @property {string} [itemId]
 * @property {Array<object>} [options]
 */

const PACK = "pack";
const GROUND = "ground";

function _freeSlots(group, lay, taken) {
  const out = [];
  for (let i = 0; i < (lay.capacity[group] ?? 0); i++) {
    const s = slotId(group, i);
    if (!lay.slots.has(s) && !lay.blocked.has(s) && !lay.occupants[s] && !taken.has(s)) out.push(s);
  }
  return out;
}

/** Źródło sztuki do przeniesienia, gdy wywołujący go nie podał (§4). */
function _pickSource(it, targetGroup) {
  const placed = it.slots.filter(s => groupOf(s) !== targetGroup);
  const rank = s => ACCESS_ORDER.indexOf(groupOf(s));
  const sorted = [...placed].sort((a, b) => rank(a) - rank(b));
  const pack = packCount(it) > 0 ? [PACK] : [];
  if (targetGroup === PACK || targetGroup === GROUND) return sorted[0] ?? (pack[0] ?? null);
  const tier = SLOT_GROUPS[targetGroup]?.tier;
  const stowed = sorted.filter(s => tierOf(s) === "stowed");
  const active = sorted.filter(s => tierOf(s) !== "stowed");
  // Do ręki/na siebie: najpierw z kabury (Darmowa Interakcja), potem z plecaka (akcja).
  if (tier === "hand" || tier === "worn") return stowed[0] ?? pack[0] ?? active[0] ?? null;
  // Do kabury/na pas: najpierw z plecaka, potem z ręki.
  return pack[0] ?? active[0] ?? stowed[0] ?? null;
}

/**
 * Rozstrzyga jedno położenie przedmiotu: lista ruchów sztuk albo pytania do gracza.
 *
 * Zasady (D5, D11, D27, D31; §4):
 *   - nie ma odmów za zajęty slot — kładziony przedmiot wjeżdża, poprzedni wyjeżdża;
 *   - wypchnięta broń z ręki: najpierw zwolniony slot (zamiana), potem wolna pasująca
 *     pochwa/kabura, inaczej **Upuść** albo **Do plecaka** — pytanie w walce, plecak poza nią;
 *   - noszone i podręczne: zwolniony slot (zamiana) albo wolny slot tej samej grupy, inaczej plecak;
 *   - zdjęcie pancerza przez konflikt wielosłotowy pyta o zgodę (D27) — jedyne potwierdzenie;
 *   - utrata źródła pojemności wysypuje nadmiar do plecaka („ładownice odchodzą z kamizelką").
 *
 * @param {DollItem[]} items
 * @param {object} request
 * @param {string} request.itemId
 * @param {string} request.to       Slot, grupa, `"auto"`, `"pack"` albo `"ground"`.
 * @param {string} [request.from]   Slot albo `"pack"` — która sztuka; domyślnie najrozsądniejsza.
 * @param {object} [options]
 * @param {boolean} [options.inCombat]
 * @param {object} [options.answers]  `{displace: {[itemId]: "ground"|"pack"}, hand: {slot, dest},
 *   confirm: true}` — odpowiedzi na wcześniejsze pytania.
 * @param {Object<string, object>} [options.occupants]
 * @returns {{moves: DollMove[], questions: DollQuestion[], refusal: string|null, target: string|null}}
 */
export function resolve(items, request, { inCombat = false, answers = {}, occupants = {} } = {}) {
  const work = _clone(items);
  const byId = new Map(work.map(i => [i.id, i]));
  const it = byId.get(request.itemId);
  const out = { moves: [], questions: [], refusal: null, target: null };
  if (!it) { out.refusal = "Nie ma takiego przedmiotu."; return out; }
  const fam = DOLL_FAMILIES[it.family];
  if (!fam) { out.refusal = "Tego się nie nosi ani nie trzyma w ręku — zostaje w plecaku."; return out; }

  const lay = layoutOf(work, { occupants });
  const taken = new Set();              // sloty obiecane w tym rozstrzygnięciu
  const vacated = [];                   // sloty zwolnione w tym rozstrzygnięciu
  const to = request.to ?? "auto";

  /* ---- Do plecaka / na ziemię ---- */
  if (to === PACK || to === GROUND) {
    const from = request.from ?? _pickSource(it, to);
    if (!from || (from === PACK && to === PACK)) { out.refusal = "Już w plecaku."; return out; }
    if (from !== PACK && !it.slots.includes(from)) { out.refusal = "Tej sztuki tam nie ma."; return out; }
    out.moves.push({ itemId: it.id, from, to });
    out.target = to;
    _apply(work, out.moves);
    _spill(work, out, lay.capacity);
    return out;
  }

  /* ---- Wybór slotu docelowego ---- */
  let target = null;
  let group = null;
  const explicit = parseSlot(to);
  if (explicit) {
    group = explicit.group;
    if (!accepts(it.family, group)) {
      out.refusal = `${SLOT_GROUPS[group].label}: tu nie pasuje ${fam.label}.`;
      return out;
    }
    if (explicit.index >= lay.capacity[group]) { out.refusal = `${slotLabel(to)}: brak takiego slotu.`; return out; }
    if (occupants[to]) { out.refusal = `${slotLabel(to)} zajęta: ${occupants[to].label}.`; return out; }
    target = to;
  }

  // „Załóż" bierze sztukę z plecaka, jeśli jest; inaczej — jak dobycie.
  const from = request.from
    ?? (to === "auto" && packCount(it) > 0 ? PACK : _pickSource(it, group ?? (to === "auto" ? fam.auto[0] : to)));
  if (!from) { out.refusal = "Brak wolnej sztuki do przełożenia."; return out; }
  if (from !== PACK && !it.slots.includes(from)) { out.refusal = "Tej sztuki tam nie ma."; return out; }
  if (from === PACK && packCount(it) <= 0) { out.refusal = "Wszystkie sztuki są już poza plecakiem."; return out; }
  if (to === "auto" && from !== PACK && isActiveSlot(from)) { out.refusal = "Już założone."; return out; }
  if (from !== PACK) { vacated.push(from); lay.slots.delete(from); }

  if (!target) {
    let groups = to === "auto" ? fam.auto : [to];
    for (const g of groups) {
      if (!SLOT_GROUPS[g] || !accepts(it.family, g)) { out.refusal = `Tu nie pasuje ${fam.label}.`; return out; }
    }
    // „Załóż" na schowanej sztuce to dobycie — tylko grupy aktywne.
    if (to === "auto" && from !== PACK) groups = groups.filter(g => SLOT_GROUPS[g].tier !== "stowed");
    for (const g of groups) {
      const free = _freeSlots(g, lay, taken).filter(s => s !== from);
      if (free.length) { target = free[0]; group = g; break; }
    }
    if (!target) {
      group = groups[0];
      if (group === "hand") {
        const pick = _pickHand(work, lay, it, from, { inCombat, answers, occupants, vacated });
        if (pick.question) { out.questions.push(pick.question); return out; }
        if (pick.refusal) { out.refusal = pick.refusal; return out; }
        target = pick.slot;
        if (pick.dest) answers = { ...answers, displace: { ...(answers.displace ?? {}), [pick.occupantId]: pick.dest } };
      } else {
        // Pełna grupa: zamiana z ostatnim slotem (deterministycznie; D31 — bez sprytu).
        const cap = lay.capacity[group];
        for (let i = cap - 1; i >= 0 && !target; i--) {
          const s = slotId(group, i);
          if (!lay.occupants[s] && s !== from) target = s;
        }
        if (!target) { out.refusal = `${SLOT_GROUPS[group].plural}: brak miejsca.`; return out; }
      }
    }
  }

  if (target === from) { out.refusal = "Już tam jest."; return out; }
  out.target = target;
  const occupantId = lay.slots.get(target);
  if (occupantId === it.id) {
    // Druga sztuka tego samego stosu — przestawienie niczego nie zmienia.
    out.refusal = "Ta sama rzecz już tam jest.";
    return out;
  }

  /* ---- Ruch główny ---- */
  out.moves.push({ itemId: it.id, from, to: target });
  taken.add(target);

  /* ---- Pancerz założony na slot, który coś blokuje (D27) ---- */
  const blockerId = lay.blocked.get(target);
  if (blockerId && blockerId !== it.id) {
    const blocker = byId.get(blockerId);
    if (DOLL_FAMILIES[blocker.family]?.bodyArmor && !answers.confirm) {
      out.questions.push({ kind: "confirmArmor", itemId: blockerId, options: [true, false] });
      out.moves = [];
      return out;
    }
    for (const s of blocker.slots.filter(s => tierOf(s) === "worn")) {
      out.moves.push({ itemId: blockerId, from: s, to: PACK, displaced: true });
    }
  }

  /* ---- Wypchnięcie lokatora ---- */
  const pending = [];
  if (occupantId) pending.push({ itemId: occupantId, from: target });

  /* ---- Blokady kładzionego przedmiotu (ciężki pancerz zrzuca ochraniacze) ---- */
  const placingActive = tierOf(target) === "worn" && it.blocks?.length;
  if (placingActive) {
    const cap = lay.capacity;
    for (const g of it.blocks) {
      for (let i = 0; i < (cap[g] ?? 0); i++) {
        const s = slotId(g, i);
        const occ = lay.slots.get(s);
        if (occ && occ !== it.id) pending.push({ itemId: occ, from: s, toPack: true });
      }
    }
  }

  for (const p of pending) {
    const dest = _displace(byId.get(p.itemId), p.from, {
      lay, taken, vacated, inCombat, answers, toPack: p.toPack, occupants
    });
    if (dest.question) { out.questions.push(dest.question); continue; }
    out.moves.push({ itemId: p.itemId, from: p.from, to: dest.to, displaced: true });
    if (parseSlot(dest.to)) taken.add(dest.to);
  }
  if (out.questions.length) { out.moves = []; return out; }

  _apply(work, out.moves);
  _spill(work, out, lay.capacity);
  return out;
}

/**
 * Dokąd idzie wypchnięta sztuka. Kolejność: slot zwolniony w tym ruchu (zamiana miejscami),
 * wolny slot pasującej grupy (broń: pochwa/kabura; pas: pas), dalej ziemia albo plecak.
 */
function _displace(it, fromSlot, { lay, taken, vacated, inCombat, answers, toPack, occupants }) {
  if (!toPack) {
    for (const v of vacated) {
      if (accepts(it.family, groupOf(v)) && !taken.has(v) && !occupants[v]) return { to: v };
    }
    const fam = DOLL_FAMILIES[it.family];
    const stowGroup = fam.holster ?? (it.family === "belt" ? "belt" : null);
    if (stowGroup) {
      const free = _freeSlots(stowGroup, lay, taken);
      if (free.length) return { to: free[0] };
    }
  }
  // Z ręki w walce: Upuść ([I]) albo Do plecaka (akcja) — decyduje gracz (D11).
  if (!toPack && inCombat && groupOf(fromSlot) === "hand") {
    const answer = answers.displace?.[it.id];
    if (answer === GROUND || answer === PACK) return { to: answer };
    return { question: { kind: "displace", itemId: it.id, from: fromSlot, options: [GROUND, PACK] } };
  }
  return { to: PACK };
}

/**
 * Obie ręce zajęte, a coś ma trafić do ręki (Dobądź, Załóż) — §4, „Dobądź z pełnymi rękami":
 *   1. wolna ręka → tam (obsłużone wyżej);
 *   2. dokładnie jeden trzymany przedmiot mieści się w wolnej kaburze (licząc zwalniany slot) →
 *      on idzie do kabury, nowy zajmuje jego rękę;
 *   3. inaczej jedno pytanie: która ręka ustępuje, z celem na przycisku — nigdy dwa pytania z rzędu.
 */
function _pickHand(work, lay, it, from, { inCombat, answers, occupants, vacated }) {
  const hands = [0, 1].map(i => slotId("hand", i)).filter(h => h !== from);
  if (answers.hand?.slot && hands.includes(answers.hand.slot)) {
    const occ = lay.slots.get(answers.hand.slot);
    return { slot: answers.hand.slot, occupantId: occ, dest: answers.hand.dest ?? null };
  }
  const options = [];
  for (const h of hands) {
    if (occupants[h]) continue;
    const occId = lay.slots.get(h);
    const occ = work.find(i => i.id === occId);
    if (!occ) return { slot: h };
    const dest = _displace(occ, h, {
      lay, taken: new Set(), vacated, inCombat: false, answers: {}, toPack: false, occupants
    });
    const holstered = parseSlot(dest.to) && tierOf(dest.to) === "stowed";
    options.push({ slot: h, occupantId: occId, dest: dest.to, holstered });
  }
  if (!options.length) return { refusal: "Obie ręce zajęte i nie da się ich zwolnić." };
  const fits = options.filter(o => o.holstered);
  if (fits.length === 1) return { slot: fits[0].slot, occupantId: fits[0].occupantId, dest: fits[0].dest };

  // Pytanie z celem na przycisku. W walce bez wolnej kabury: osobno „upuść" i „do plecaka".
  const choices = [];
  for (const o of options) {
    if (o.holstered) choices.push({ slot: o.slot, itemId: o.occupantId, dest: o.dest });
    else if (inCombat) {
      choices.push({ slot: o.slot, itemId: o.occupantId, dest: GROUND });
      choices.push({ slot: o.slot, itemId: o.occupantId, dest: PACK });
    } else choices.push({ slot: o.slot, itemId: o.occupantId, dest: PACK });
  }
  return { question: { kind: "whichHand", itemId: it.id, options: choices } };
}

/** Stosuje ruchy do roboczej kopii (mutuje). */
function _apply(work, moves) {
  const byId = new Map(work.map(i => [i.id, i]));
  for (const m of moves) {
    const it = byId.get(m.itemId);
    if (!it) continue;
    if (parseSlot(m.from)) {
      const k = it.slots.indexOf(m.from);
      if (k >= 0) it.slots.splice(k, 1);
    }
    if (parseSlot(m.to)) it.slots.push(m.to);
    if (m.to === GROUND) it.quantity = Math.max(0, (it.quantity ?? 1) - 1);
  }
}

/**
 * Po ruchach: jeśli zmalała pojemność (zdjęta kamizelka), nadmiar — od najwyższego slotu — idzie
 * do plecaka (D5: nadmiar nie może trwać). Mutuje `work` i dopisuje ruchy do `out`.
 */
function _spill(work, out, before) {
  const after = capacityOf(work);
  for (const g of Object.keys(after)) {
    if (after[g] >= (before[g] ?? after[g])) continue;
    const over = [];
    for (const it of work) for (const s of it.slots) {
      const p = parseSlot(s);
      if (p.group === g && p.index >= after[g]) over.push({ itemId: it.id, slot: s, index: p.index });
    }
    over.sort((a, b) => b.index - a.index);
    const moves = over.map(o => ({ itemId: o.itemId, from: o.slot, to: PACK, displaced: true }));
    _apply(work, moves);
    out.moves.push(...moves);
  }
}

/**
 * Wynik ruchów: nowe sloty każdego zmienionego przedmiotu.
 * @param {DollItem[]} items
 * @param {DollMove[]} moves
 * @returns {Map<string, string[]>}
 */
export function applyMoves(items, moves) {
  const work = _clone(items);
  _apply(work, moves);
  const changed = new Set(moves.map(m => m.itemId));
  return new Map(work.filter(i => changed.has(i.id)).map(i => [i.id, i.slots]));
}

/**
 * Ruchy, które sprzątają stan błędu (kolizje, sloty ponad pojemność, blokady) — wszystko do
 * plecaka. Puste, gdy stan jest poprawny.
 * @param {DollItem[]} items
 */
export function normalizeMoves(items, { occupants = {} } = {}) {
  return layoutOf(items, { occupants }).conflicts
    .map(c => ({ itemId: c.itemId, from: c.slot, to: PACK, displaced: true }));
}

/* -------------------------------------------- */
/*  Zużycie (§4)                                 */
/* -------------------------------------------- */

/**
 * Sloty po spadku ilości. Najpierw sztuka-podpowiedź (kliknięty kafelek, ręka, która rzuciła),
 * potem najbardziej pod ręką: ręka, pas, pochwy/kabury, noszone — a w obrębie grupy od
 * najwyższego slotu (tak liczył pas od v1). Przyrost idzie do plecaka. Wynik nigdy nie jest
 * dłuższy niż nowa ilość.
 *
 * @param {string[]} slots
 * @param {number} oldQty
 * @param {number} newQty
 * @param {string|null} [hint]
 * @returns {string[]}
 */
export function slotsAfterSpend(slots, oldQty, newQty, hint = null) {
  let left = [...slots];
  let spent = Math.max(0, oldQty - newQty);
  if (spent && hint != null && left.includes(hint)) {
    left = left.filter(s => s !== hint);
    spent--;
  }
  const rank = s => {
    const p = parseSlot(s);
    return ACCESS_ORDER.indexOf(p.group) * 1000 - p.index;
  };
  const order = [...left].sort((a, b) => rank(a) - rank(b));
  const drop = new Set(order.slice(0, spent));
  left = left.filter(s => !drop.has(s));
  return left.slice(0, Math.max(0, newQty));
}

/* -------------------------------------------- */
/*  Koszt ruchu (§6)                             */
/* -------------------------------------------- */

/**
 * Koszt ruchu w ekonomii akcji — **pokazywany, nigdy liczony ani blokowany** (D7).
 *
 * | Ruch | Koszt | Źródło |
 * |---|---|---|
 * | kabura → ręka, ręka → kabura, ziemia → ręka | [I] | Walka, Dobywanie i chowanie broni |
 * | ręka → ziemia | [I] (Używanie, gdy [I] zużyta); WKK: darmo z opcją D19 | jw. |
 * | plecak → gdziekolwiek, gdziekolwiek → plecak | Akcja | Tworzenie postaci, Plecak; RAI (symetria) |
 * | pancerz | 1 / 2 / 4 Akcje | Pancerze |
 * | Hełm, Ochraniacze, Tarcza | 1 Akcja | Pancerze, Akcesoria |
 * | Głowa, Twarz, Ramię, Strój | 1 Akcja | RAI — jak akcesoria |
 * | ręka ↔ ręka, zmiana chwytu, przestawienie w obrębie pasa/kabur | darmo | — |
 * | mimowolne (Wytrącenie, „Poddaj się!") | brak | to nie akcja postaci |
 *
 * @param {DollMove} move
 * @param {object} [ctx]
 * @param {string} [ctx.family]
 * @param {number} [ctx.donTime]        Akcje na pancerz (flaga `donTime`).
 * @param {boolean} [ctx.involuntary]
 * @param {boolean} [ctx.freeDrop]      WKK „Darmowe upuszczanie" (D19), dla broni.
 * @param {string[]} [ctx.freeDraw]     Zdolności zwalniające dobycie/schowanie tej sztuki z [I]
 *   („Dobywanie (Rewolwerowiec)", „Dobycie (Samuraj)").
 * @param {boolean} [ctx.mamPodReka]    Pakowanie, „Mam pod ręką" — plecak → [I].
 * @param {boolean} [ctx.shield]        Tarcza — akcesorium pancerza (1 Akcja), nie broń.
 * @returns {{kind: "none"|"free"|"interaction"|"action", actions: number, label: string, why: string, notes: string[]}}
 */
export function moveCost(move, ctx = {}) {
  const res = (kind, actions, why, notes = []) => ({
    kind, actions, why, notes,
    label: kind === "none" ? "bez kosztu" : kind === "free" ? "darmo"
      : kind === "interaction" ? "[I]"
      : actions === 1 ? "Akcja" : `${actions} Akcje`
  });
  const { from, to } = move;
  if (from === to) return res("free", 0, "bez zmiany");
  if (ctx.involuntary) return res("none", 0, "mimowolnie — to nie akcja postaci");

  const fg = groupOf(from), tg = groupOf(to);
  const ft = tierOf(from), tt = tierOf(to);
  const fam = DOLL_FAMILIES[ctx.family] ?? {};
  const wornAction = group => {
    if (group === "body") {
      return res("action", Math.max(1, Math.floor(Number(ctx.donTime) || 1)), "zakładanie i zdejmowanie pancerza");
    }
    if (["head", "arms", "legs"].includes(group)) return res("action", 1, "akcesoria pancerza");
    return res("action", 1, "jak akcesoria pancerza (RAI)");
  };

  // Plecak.
  if (from === PACK || to === PACK) {
    const other = from === PACK ? tg : fg;
    if (to === GROUND) return res("action", 1, "wyciągnięcie z plecaka");
    if (other && SLOT_GROUPS[other]?.tier === "worn") return wornAction(other);
    if (ctx.shield) return res("action", 1, "tarcza — akcesorium pancerza");
    if (from === PACK && ctx.mamPodReka) return res("interaction", 0, "Mam pod ręką (Pakowanie)");
    return res("action", 1, from === PACK ? "wyciągnięcie z plecaka" : "schowanie do plecaka (RAI)");
  }

  // Ziemia.
  if (to === GROUND) {
    if (ctx.freeDrop && fam.weapon) return res("free", 0, "Darmowe upuszczanie (WKK)", ["k6: 1–2 — uszkodzenie broni"]);
    return res("interaction", 0, "upuszczenie", ["Używanie, gdy Darmowa Interakcja już wykorzystana"]);
  }
  if (from === GROUND) return res("interaction", 0, "podniesienie");

  // Ręka ↔ ręka, przestawienia w obrębie tej samej grupy.
  if (fg === tg || (ft === "hand" && tt === "hand")) return res("free", 0, "przełożenie");
  if (ft === "stowed" && tt === "stowed") return res("free", 0, "przełożenie");

  // Ręka ↔ kabura/pochwa/pas.
  if ((ft === "hand" && tt === "stowed") || (ft === "stowed" && tt === "hand")) {
    if (ctx.freeDraw?.length) return res("free", 0, ctx.freeDraw.join(", "));
    return res("interaction", 0, tt === "hand" ? "dobycie" : "schowanie");
  }
  if (ft === "stowed" && tt === "worn") return wornAction(tg);
  if (ft === "worn" && tt === "stowed") return wornAction(fg);

  // Noszone ↔ ręka, noszone ↔ noszone (latarka z ręki na ramię).
  if (tt === "worn") return wornAction(tg);
  if (ft === "worn") return wornAction(fg);
  return res("free", 0, "przełożenie");
}

export const __testing = Object.freeze({
  resolve, applyMoves, layoutOf, capacityOf, classifyItem, blocksOf, locationOf, gripOf,
  slotsAfterSpend, moveCost, normalizeMoves, readSlots, parseSlot, pickSource: _pickSource,
  SLOT_GROUPS, DOLL_FAMILIES
});
