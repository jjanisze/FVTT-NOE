/**
 * Neuroshima 5e — definicje magazynków, taśm, kołczanów i szybkoładowarek.
 *
 * Projekt: PLAN_magazynki.md. Model kwantowy (magazynek bez własnej zawartości + licznik
 * „gotowych") jest wycofany — magazynek jest fizycznym pojemnikiem z uporządkowaną kolejką
 * naboi, przypisanym do konkretnego **magwella**.
 *
 * ## Dlaczego to jest generowane, a nie wpisane ręcznie
 *
 * 28 wpisów przepisanych z `weapons-data.mjs` to 28 okazji do rozjechania kalibru albo
 * pojemności między bronią a jej magazynkiem — a rozjechany magazynek nie pasuje do niczego
 * i nie mówi dlaczego. Podstawa leci więc z tabeli broni (`MAGAZINES` niżej), a ręcznie
 * dopisujemy tylko to, czego z broni wyprowadzić nie da się: warianty pojemności
 * (`CAPACITY_VARIANTS`) i dwa uniwersalne kołczany.
 *
 * ## Pola wpisu
 *   id        — slug; klucz w `flags.<mod>.magazine.id` na instancji i `idFor("magazine", id)` w packu
 *   name      — nazwa przedmiotu
 *   kind      — "mag" | "belt" | "quiver" | "speedloader"; steruje tym, JAK pojemnik wchodzi do broni
 *   magwell   — gniazdo, do którego pasuje (patrz `magwellOf()` w weapons-data.mjs).
 *               `null` dla szybkoładowarek — te dobierają się po kalibrze, nie po gnieździe
 *   caliber   — id z ammo-data.mjs; ogranicza, co wolno do środka (`familyCalibers`)
 *   capacity  — ile naboi mieści
 *   cls       — klasa rozmiaru: ikona, cena, waga (patrz `MAG_CLASSES`)
 *   variant   — true dla wariantów spoza standardu modelu (usługa rusznikarska)
 *
 * `magwell` i `caliber` NIE są duplikowane na instancję przedmiotu — instancja niesie tylko
 * `{ id, rounds }`, a reszta jest rozwiązywana z tego pliku w runtime. Ten sam wzorzec co broń.
 */

import { WEAPONS, magwellOf } from "./weapons-data.mjs";
import { AMMO_CALIBER_MAP } from "./ammo-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Klasy rozmiaru — ikony, ceny, wagi           */
/* -------------------------------------------- */

/**
 * Ceny i dostępności wprost z `Tabele/Bronie/Amunicja.md`, sekcja *Magazynki Wymienne*;
 * wagi z `Tabele/Sklepy/Dostepnosc.md` (wiersze 137–141). To **zastępuje** `MAG_PRICES`
 * z systemu kwantowego (10/15/20/40/5/8), które nie miały podstawy w RAW.
 *
 * Klasa rozmiaru jest odtąd wyłącznie kosmetyką i cennikiem — **nie jest kluczem
 * kompatybilności**. Tym jest `magwell` (dla magazynków) albo kaliber (dla szybkoładowarek).
 * Ikon jest sześć i tyle zostaje: „Magazynek do AR" bierze karabinową, „do Desert Eagle"
 * pistoletową. Alternatywa to 28 dedykowanych ikon na przedmioty, które i tak wyglądają
 * tak samo.
 *
 * RAW nie zna osobnej pozycji cenowej dla szybkoładowarki — wchodzi pod „broń palna krótka".
 */
export const MAG_CLASSES = Object.freeze({
  short:       { subtype: "magazine-short",       label: "Krótki magazynek",        icon: "mag_handgun.svg",          price: 20, weight: 0.2, avail: 60 },
  medium:      { subtype: "magazine-medium",      label: "Pośredni magazynek",      icon: "mag_machine_pistol.svg",   price: 30, weight: 0.3, avail: 50 },
  long:        { subtype: "magazine-long",        label: "Długi magazynek",         icon: "mag_assault_rifle.svg",    price: 35, weight: 0.4, avail: 40 },
  heavy:       { subtype: "magazine-heavy",       label: "Ciężki magazynek / taśma", icon: "mag_machine_gun_belt.svg", price: 50, weight: 0.5, avail: 10 },
  quiver:      { subtype: "magazine-quiver",      label: "Kołczan",                 icon: "quiver.svg",               price: 15, weight: 0.5, avail: 60 },
  speedloader: { subtype: "magazine-speedloader", label: "Szybkoładowarka",         icon: "speedloader.svg",          price: 20, weight: 0.2, avail: 60 }
});

/** Podtypy `system.type.subtype` magazynków — filtr `isMagazineItem()`. */
export const MAG_SUBTYPES = Object.freeze(Object.values(MAG_CLASSES).map(c => c.subtype));

/** Ścieżka ikony dla klasy rozmiaru. */
export function magIconPath(cls) {
  const icon = MAG_CLASSES[cls]?.icon ?? MAG_CLASSES.short.icon;
  return `modules/${MODULE_ID}/icons/magazines/${icon}`;
}

/** Kategoria broni → klasa rozmiaru magazynka. Taśmy i Light Fifty lądują w `heavy`. */
const WEAPON_TYPE_TO_CLASS = Object.freeze({
  palnaKrotka: "short",
  palnaPosr:   "medium",
  palnaDluga:  "long",
  palnaCiezka: "heavy"
});

/* -------------------------------------------- */
/*  Nazwy — dopełniacz tam, gdzie trzeba        */
/* -------------------------------------------- */

/**
 * „Magazynek do <model>". Większość modeli to nazwy nieodmienne (AR, Scar, HK G3, XM-8),
 * więc goła nazwa jest poprawna. Tu siedzą wyłącznie te, które trzeba odmienić albo obciąć —
 * dopisanie pola `genitive` do `weapons-data.mjs` zanieczyściłoby tabelę broni polską
 * gramatyką na użytek jednego generatora.
 */
const WEAPON_GENITIVE = Object.freeze({
  "jedenastka":   "Jedenastki",
  "empepiatka":   "Empepiątki",
  "ak-kalach":    "AK",           // „AK (Kałach)" → nawias nie ma czego robić w nazwie magazynka
  "the-pig":      "The Piga",
  "sp12-tactical": "SP12 Tactical"
});

function weaponLabel(w) {
  return WEAPON_GENITIVE[w.id] ?? w.name;
}

/* -------------------------------------------- */
/*  Generowana podstawa                          */
/* -------------------------------------------- */

/**
 * Bronie, których wariant (`magwell` ≠ `id`) dzieli magazynki z bronią bazową, są z generacji
 * **pominięte** — inaczej dostalibyśmy „Magazynek do Złotego Desert Eagle" obok normalnego,
 * mimo że to fizycznie ten sam magazynek. Asercja spójności (`magwellGroups()`) pilnuje, że
 * dzielące gniazdo bronie mają zgodny kaliber i pojemność.
 */
function generatedMagazines() {
  const out = [];

  /* ── Magazynki wymienne: jeden na model ── */
  for (const w of WEAPONS) {
    if (w.mag?.kind !== "mag") continue;
    if (w.magwell) continue;                       // wariant — dzieli magazynek z bronią bazową
    out.push({
      id: `mag-${w.id}`,
      name: `Magazynek do ${weaponLabel(w)}`,
      kind: "mag",
      magwell: magwellOf(w),
      caliber: w.caliber,
      capacity: w.mag.max,
      cls: WEAPON_TYPE_TO_CLASS[w.type] ?? "short"
    });
  }

  /* ── Taśmy: jedna na broń. `mag.kind`, nigdy `caliber` — `caliber: "belt"` to BEŁT
        (kusza), a `mag.kind: "belt"` to TAŚMA. Ten sam string, dwa różne pola. ── */
  for (const w of WEAPONS) {
    if (w.mag?.kind !== "belt") continue;
    if (w.magwell) continue;
    out.push({
      id: `belt-${w.id}`,
      name: `Taśma do ${weaponLabel(w)}`,
      kind: "belt",
      magwell: magwellOf(w),
      caliber: w.caliber,
      capacity: w.mag.max,
      cls: "heavy"
    });
  }

  /* ── Szybkoładowarki: jedna na kaliber rewolwerowy, nie na model.
        Pierścień naboi pasuje do każdego bębenka tego kalibru o tej samej liczbie komór,
        więc kluczem kompatybilności jest tu kaliber + pojemność, a nie `magwell`. MGL1S
        (`beb`, 40 mm) świadomie nie dostaje żadnej — granatnik bębenkowy ładuje się
        pociskiem na akcję. ── */
  const revolvers = new Map();
  for (const w of WEAPONS) {
    if (w.mag?.kind !== "beb") continue;
    if (w.type !== "palnaKrotka") continue;        // wyklucza MGL1S (palnaCiezka)
    const key = `${w.caliber}:${w.mag.max}`;
    if (!revolvers.has(key)) revolvers.set(key, w);
  }
  for (const w of revolvers.values()) {
    const label = AMMO_CALIBER_MAP[w.caliber]?.label ?? w.caliber;
    out.push({
      id: `speedloader-${w.caliber}`,
      name: `Szybkoładowarka ${label}`,
      kind: "speedloader",
      magwell: null,                               // dobiera się po kalibrze, patrz wyżej
      caliber: w.caliber,
      capacity: w.mag.max,
      cls: "speedloader"
    });
  }

  return out;
}

/* -------------------------------------------- */
/*  Wpisy ręczne                                 */
/* -------------------------------------------- */

/**
 * Kołczan — jedyny prawdziwie uniwersalny pojemnik, i to z RAW, nie z uproszczenia:
 * *„Strzała — amunicja do **wszystkich** łuków"*, *„Bełt — amunicja do **wszystkich** kusz"*,
 * a `Amunicja.md` wycenia „Kołczan na bełty/strzały" jedną pozycją (15 gb / 60%).
 *
 * W kodzie to nie wyjątek, tylko dwa wpisy: wszystkie łuki mają `magwell: "luk"`, wszystkie
 * kusze niepowtarzalne `magwell: "kusza"`. Mechanizm z §3 obsługuje to bez linijki więcej.
 *
 * **Pojemność 20 jest decyzją MG, nie RAW** — tabela nie podaje dla łuków Mag./Bęb. w ogóle,
 * bo RAW nie liczy strzał. Kołczan jest tym, co wprowadza je do systemu: bez niego łuk nie ma
 * źródła zasilania i strzały nie są liczone wcale (tak było do 2026-09-22).
 *
 * Kusze automatyczne (pistoletowa, Cobra) kołczana **nie** biorą — mają `wmag`, czyli własny
 * magazynek na szynie, uzupełniany z luźnej puli bełtów.
 */
const QUIVERS = [
  {
    id: "kolczan-strzaly", name: "Kołczan na strzały",
    kind: "quiver", magwell: "luk", caliber: "strzala", capacity: 20, cls: "quiver"
  },
  {
    id: "kolczan-belty", name: "Kołczan na bełty",
    kind: "quiver", magwell: "kusza", caliber: "belt", capacity: 20, cls: "quiver"
  }
];

/**
 * Warianty pojemności. **To jest RAW, nie funkcja na przyszłość** — `Tabele/Narzedzia.md`
 * ma gotową usługę rusznikarską „Zmiana pojemności magazynka" (magazynki wymienne + mały
 * rusznikarz, ST 15, 20 gb) z dozwolonymi pojemnościami BPK: 5/10/20/30, BPP i BPD: 30/50/100.
 * Mechanizm musi być gotowy od początku, bo dorabianie go później to migracja.
 *
 * **Ale generujemy tylko jeden.** Pełna siatka (`magwell` × dozwolona pojemność) to
 * kilkadziesiąt wpisów w packu i w Zbrojowni, zanim ktokolwiek zapłacił rusznikarzowi za
 * pierwszy. Jeden wystarczy jako smoke test całej ścieżki: definicja → pack → instancja →
 * `capacity` czytane z magazynka → `max` na karcie broni.
 *
 * H&K G3 to broń Alana, a 50 to środkowa z RAW-owych opcji dla BPD — widać różnicę względem
 * standardowej trzydziestki, a nie wygląda absurdalnie jak bęben na 100. Wpis jest
 * RAW-legalny, więc **NOE, nie WKK**; to, że akurat Alan dostał taką sztukę, jest zdarzeniem
 * w świecie, nie treścią modułu.
 */
const CAPACITY_VARIANTS = [
  {
    id: "mag-hk-g3-50", name: "Magazynek do HK G3 (50)",
    kind: "mag", magwell: "hk-g3", caliber: "762", capacity: 50, cls: "long", variant: true
  }
];

/* -------------------------------------------- */
/*  Eksport                                      */
/* -------------------------------------------- */

/** Wszystkie pojemniki na naboje: generowana podstawa + kołczany + warianty pojemności. */
export const MAGAZINES = Object.freeze([
  ...generatedMagazines(),
  ...QUIVERS,
  ...CAPACITY_VARIANTS
].map(Object.freeze));

/** Szybkie wyszukanie po id. */
export const MAGAZINE_MAP = Object.freeze(
  Object.fromEntries(MAGAZINES.map(m => [m.id, m]))
);

/**
 * Definicja magazynka o danym id, albo `null`. Magazynek o nierozpoznanym id jest **inertny** —
 * tak samo jak broń o nierozpoznanym modelu. Nie zgadujemy po nazwie ani po podtypie.
 */
export function magazineDef(id) {
  return MAGAZINE_MAP[id] ?? null;
}

/**
 * Standardowy pojemnik dla tego gniazda — ten, którego pojemność zgadza się z `mag.max`
 * broni. Używany przez migrację i przez Zbrojownię; wariantów rusznikarskich nie wybiera
 * nigdy, bo te są zdarzeniem w świecie, nie stanem domyślnym.
 */
export function standardMagazineFor(magwell) {
  return MAGAZINES.find(m => (m.magwell === magwell) && !m.variant) ?? null;
}

/** Wszystkie pojemniki pasujące do tego gniazda, standardowe przed wariantami. */
export function magazinesForMagwell(magwell) {
  if (!magwell) return [];
  return MAGAZINES.filter(m => m.magwell === magwell)
    .sort((a, b) => (a.variant ? 1 : 0) - (b.variant ? 1 : 0));
}

/** Szybkoładowarki pasujące do bębenka o tym kalibrze i tej liczbie komór. */
export function speedloadersFor(caliber, chambers) {
  return MAGAZINES.filter(m =>
    (m.kind === "speedloader") && (m.caliber === caliber) && (m.capacity === chambers)
  );
}

/** Cena / waga / dostępność / ikona pojemnika, z jego klasy rozmiaru. */
export function magClass(def) {
  return MAG_CLASSES[def?.cls] ?? MAG_CLASSES.short;
}

/**
 * Waga pojemnika **z zawartością**. Pusty i pełny magazynek nie mogą ważyć tyle samo —
 * `actors/encumbrance-breakdown.mjs` liczy wagę własnych paneli i bez tego 8 pełnych
 * magazynków do AR ważyłoby tyle, co 8 pustych.
 *
 * @param {object} def        Wpis z `MAGAZINES`.
 * @param {string[]} rounds   Kolejka kalibrów w środku.
 */
export function magazineWeight(def, rounds = []) {
  const empty = magClass(def).weight;
  let ammo = 0;
  for (const id of rounds) ammo += AMMO_CALIBER_MAP[id]?.weight ?? 0;
  return Math.round((empty + ammo) * 1000) / 1000;
}

/**
 * Kształt itemu `consumable` dla pojemnika — wspólny dla kompendium (`dev/packs/build-packs.mjs`)
 * i dla tworzenia instancji w runtime (zakup, Zbrojownia, migracja).
 *
 * `system.quantity` zostaje na 1 i **nie wolno tego zmieniać**: dwa magazynki 5,56 o różnej
 * zawartości to dwa osobne dokumenty Item. To bezpośrednia konsekwencja kolejki naboi —
 * `quantity: 2` nie ma gdzie trzymać dwóch różnych kolejek.
 *
 * @param {object} def                Wpis z `MAGAZINES`.
 * @param {object} [options]
 * @param {string[]} [options.rounds] Zawartość początkowa, w kolejności wystrzału.
 * @param {object} [extra]            Doklejane na wierzch (np. `_id` dla packa).
 */
export function buildMagazineItemData(def, { rounds = [] } = {}, extra = {}) {
  const cls = magClass(def);
  const caliberLabel = AMMO_CALIBER_MAP[def.caliber]?.label ?? def.caliber;
  const kindLabel = {
    mag: "Magazynek wymienny", belt: "Taśma amunicyjna",
    quiver: "Kołczan", speedloader: "Szybkoładowarka"
  }[def.kind] ?? "Magazynek";

  const desc = [
    `<p><strong>Typ:</strong> ${kindLabel}</p>`,
    `<p><strong>Nabój:</strong> ${caliberLabel}</p>`,
    `<p><strong>Pojemność:</strong> ${def.capacity}</p>`,
    def.kind === "speedloader"
      ? `<p>Nabija się poza walką. W walce jedna akcja Używanie przelewa całą zawartość do bębenka.</p>`
      : `<p>Ładuje się i rozładowuje wyłącznie poza walką. W walce można go tylko wymienić na inny albo wypiąć.</p>`,
    def.variant
      ? `<p><em>Wariant pojemności — usługa rusznikarska (Zmiana pojemności magazynka, ST 15).</em></p>`
      : ""
  ].join("");

  return {
    name: def.name,
    type: "consumable",
    img: magIconPath(def.cls),
    system: {
      description: { value: desc, chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "ammo", subtype: cls.subtype },
      quantity: 1,
      weight: { value: magazineWeight(def, rounds), units: "kg" },
      price: { value: cls.price, denomination: "gb" },
      properties: [],
      uses: { max: "", spent: 0, recovery: [], autoDestroy: false },
      activities: {}
    },
    flags: {
      [MODULE_ID]: {
        magazine: { id: def.id, rounds: [...rounds] },
        availability: cls.avail
      }
    },
    ...extra
  };
}

/* -------------------------------------------- */
/*  Asercje na danych (dla testów Quench)        */
/* -------------------------------------------- */

/**
 * Bronie pogrupowane po gnieździe magazynka. Bronie dzielące `magwell` **muszą** mieć zgodny
 * `caliber` i `mag.max` — różna pojemność albo różny nabój znaczyłyby, że fizycznie nie mogą
 * dzielić magazynka, a `magwell` kłamie. Sprawdzane w `tests/magazynki.test.mjs`.
 */
export function magwellGroups() {
  const groups = new Map();
  for (const w of WEAPONS) {
    if (!["mag", "belt", "quiver"].includes(w.mag?.kind)) continue;
    const well = magwellOf(w);
    if (!groups.has(well)) groups.set(well, []);
    groups.get(well).push(w);
  }
  return groups;
}
