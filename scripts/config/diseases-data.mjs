/**
 * Neuroshima 5e — Choroby (diseases).
 *
 * Single source of truth for the disease layer. Text is quoted from the
 * rulebook chapter "Choroby i Fobie" (str. 108–111); the panel in
 * `actors/health-panel.mjs` renders it and the pack builder does not touch it
 * (diseases are actor flags, not items — see PLAN below).
 *
 * ## Data model on the actor
 * `flags["neuroshima-2026-overrides"].choroby` is an array of entries:
 *   {
 *     id:        string,          // random, stable per entry
 *     key:       string|null,     // CHRONIC_DISEASES / COMMON_DISEASES key, null = custom
 *     name:      string,          // display name (editable even for known diseases)
 *     stage:     number,          // index into the entry's stage list, 0 = przewlekły
 *     stages:    string[]|null,   // custom entries only — own stage descriptions
 *     medicine:  string,          // free text medicine name (prefilled from data)
 *     itemId:    string|null,     // linked consumable on the actor, if any
 *     lastDose:  number|null,     // worldTime (seconds) of the last dose taken
 *     notes:     string           // GM/player scratch text
 *   }
 *
 * A "custom" entry is authored entirely by the player; a known one prefills from
 * here but stays editable, because table rulings drift from RAW.
 */

/** Stage ladder shared by all multi-stage diseases. */
export const DISEASE_STAGES = Object.freeze([
  { key: "przewlekly", label: "Przewlekły", short: "PRZ", color: "#c9a96e" },
  { key: "ostry",      label: "Ostry",      short: "OST", color: "#e67e22" },
  { key: "krytyczny",  label: "Krytyczny",  short: "KRY", color: "#c0392b" }
]);

/**
 * Chronic diseases — the k8 table rolled at character creation.
 * `stages` is ordered przewlekły → ostry → krytyczny. A one-element `stages`
 * means the disease has only a "stan ogólny" and therefore never requires the
 * sunset RO na Kondycję (RAW, str. 109).
 */
export const CHRONIC_DISEASES = Object.freeze({
  hemofilia: {
    roll: 1,
    label: "Hemofilia",
    medicine: "Desmopresyna",
    medicineAlt: ["Preparaty krwiopochodne"],
    flavor: "Słyszałem o gościu, który zaciął się przy goleniu i się wykrwawił. "
      + "Lepiej się przyzwyczaj do zarostu.",
    stages: [
      "Stan ogólny. Jeśli otrzymasz obrażenia cięte lub kłute, zaczynasz krwawić. Na koniec tury "
      + "wykonujesz Rzut Obronny na Kondycję o ST 10. Porażka oznacza otrzymanie 1k4 obrażeń. "
      + "Powtarzasz ten Test na końcu każdej tury, aż krwawienie zostanie powstrzymane lub nie "
      + "umrzesz. Powstrzymać krwawienie może wstrzyknięcie lekarstwa, Test Medycyny o ST 15 "
      + "z użyciem narzędzi małego medyka lub 3 sukcesy pod rząd w RO na Kondycję o ST 10."
    ]
  },
  niewydolnoscKrazenia: {
    roll: 2,
    label: "Niewydolność krążenia",
    medicine: "Aspiryna K",
    flavor: "Podobno przed wojną, kiedy ktoś miał słabe serce, to mogli mu przeszczepić nowe. "
      + "Słyszałem, że teraz też jest lekarz, który wykonuje podobne zabiegi. Nazywa się dr Moloch.",
    stages: [
      "Utrudnienie w Testach Cech opartych na Sile i Kondycji.",
      "Utrudnienie w Testach Cech i RO na Siłę i Kondycję. Utrudnienie w Testach Ataku opartych na Sile.",
      "Utrudnienie we wszystkich Testach. Twoja Szybkość spada do 0 i masz stan Powalenie, "
      + "póki twoje zdrowie się nie poprawi."
    ]
  },
  syndromDraculi: {
    roll: 3,
    label: "Syndrom Draculi",
    medicine: "Dracophen",
    flavor: "Miałam kiedyś kumpelę w Los Angeles, którą można było spotkać tylko nocą. Twierdziła, "
      + "że jej skóra nie lubi słońca, więc na plażę chodziłyśmy w blasku księżyca.",
    stages: [
      "Masz Utrudnienie w Testach Ataku i Testach Mądrości (Percepcja) opartych na wzroku, kiedy "
      + "przebywasz w świetle dziennym. Widzisz za to w ciemności na odległość 18 metrów.",
      "Otrzymujesz 1k4 obrażeń na minutę, jeśli choć fragment twojego ciała jest wystawiony "
      + "na promienie słoneczne.",
      "Otrzymujesz 1k6 obrażeń na minutę od każdego źródła światła."
    ]
  },
  syndromThurmana: {
    roll: 4,
    label: "Syndrom Thurmana",
    medicine: "Reminex",
    flavor: "Mam przyjaciela. Nigdy nie miał wiele rozumu, ale kiedy zabrakło mu leków, zmienił się "
      + "w Neandertalczyka. Wciąż pijemy razem whisky, ale stał się jakby mniej gadatliwy.",
    stages: [
      "Masz Utrudnienie we wszystkich Testach opartych na Inteligencji.",
      "Wartość twojej Inteligencji spada do 6. Otrzymujesz Utrudnienie do Testów opartych na Charyzmie.",
      "Wartość twojej Inteligencji spada do 2. W walce używasz tylko broni improwizowanej lub ataków "
      + "bez broni. Zyskujesz niewrażliwość na Przerażenie."
    ]
  },
  szalenstwoBostonskie: {
    roll: 5,
    label: "Szaleństwo bostońskie",
    medicine: "Relanium",
    flavor: "Mam klientkę, która jest szefową gangu. Spokojna i zorganizowana dziewczyna, której "
      + "przywożę relanium. Gdybyś ty widział, jak te wszystkie bandziory wokół niej dbają, żeby "
      + "wzięła codzienną dawkę.",
    stages: [
      "Masz Utrudnienie w Testach umiejętności Perswazja i Oszustwo, oraz Ułatwienie w Zastraszaniu.",
      "Masz Utrudnienie w Testach Cech opartych na Inteligencji i Charyzmie. Jeśli poniesiesz porażkę "
      + "w takim teście, masz 50% szans, że wpadasz w szał i atakujesz źródło frustracji, póki go nie zniszczysz.",
      "Każda porażka, to powód do furii. Wpadasz w szał zniszczenia po każdej porażce, atakujesz "
      + "wszystkich wokół, a uspokajasz się dopiero po utracie przytomności."
    ]
  },
  osteoporoza: {
    roll: 6,
    label: "Osteoporoza",
    medicine: "Wapniak",
    flavor: "Mój brat zawsze był chudy i ciągle łamał kości. Kiedyś spadł z drabiny i połamał się "
      + "po raz ostatni.",
    stages: [
      "Otrzymujesz podwójne obrażenia od upadku.",
      "Masz Utrudnienie w Testach Cech, Ataków i Rzutach Obronnych opartych na Sile.",
      "Twoja Szybkość spada o połowę. Otrzymujesz poczwórne obrażenia od upadku."
    ]
  },
  paranoja: {
    roll: 7,
    label: "Paranoja",
    medicine: "Psychotropy",
    flavor: "Spotkałem kiedyś strasznie wystrachanego złodzieja. Wszędzie wyczuwał spisek i myślał, "
      + "że chcę go oszukać. Miał rację skubany, więc go zastrzeliłem.",
    stages: [
      "Masz Ułatwienie w Testach Intuicji i Percepcji, ale i Utrudnienie w testach Oszustwa i Perswazji.",
      "Masz Utrudnienie w Testach i Rzutach Obronnych opartych na Inteligencji i Mądrości oraz "
      + "Utrudnienie w testach Wpływania.",
      "Otrzymujesz stan Przerażenie i jedyną akcją, jaką możesz wykonać w walce, jest Unikanie."
    ]
  },
  zaburzeniaBledinka: {
    roll: 8,
    label: "Zaburzenia błędnika",
    medicine: "Actinix",
    flavor: "Koleżanka miała chorobę lokomocyjną, która magicznie znikała, kiedy siadała za kierownicę.",
    stages: [
      "Kiedy jedziesz pojazdem jako pasażer, masz Utrudnienie we wszystkich Testach Cech, Ataków "
      + "i w Rzutach Obronnych.",
      "Nie potrafisz przejść więcej niż 3 metry w linii prostej. Masz Utrudnienie we wszystkich "
      + "Testach Ataków.",
      "Masz Utrudnienie do wszystkich Testów, a twoja Szybkość spada do 0."
    ]
  }
});

/**
 * Popular / acquired diseases (str. 110–111). These are not on the k8 table and
 * have their own save cadence, so they carry `saveDC` / `saveNote` instead of a
 * stage ladder driven by the standard sunset rule.
 */
export const COMMON_DISEASES = Object.freeze({
  popromienna: {
    label: "Choroba popromienna",
    medicine: "RadOff",
    medicineAlt: ["RadMov"],
    onset: "Po 24 godzinach",
    saveDC: 20,
    saveNote: "RO na Kondycję ST 20 na koniec dnia. Sukces: choroba popromienna zamienia się "
      + "w chorobę przewlekłą (wylosuj którą). Porażka: brak korzyści z Długiego i Krótkiego "
      + "odpoczynku oraz poziom Wyczerpania.",
    stages: [
      "Nudności, wymioty, biegunka, gorączka, osłabienie i wypadanie włosów. Lekarstwo: RadOff "
      + "przyjmowany 10 dni z rzędu. RadMov zapewnia Ułatwienie w RO na Kondycję przeciw tej chorobie."
    ]
  },
  szczurzaGoraczka: {
    label: "Szczurza gorączka",
    medicine: "Antybiotyk",
    onset: "Po 24 godzinach",
    saveDC: 15,
    saveNote: "RO na Kondycję ST 15 na koniec dnia. Sukces: wyleczenie. Porażka: brak korzyści "
      + "z Długiego i Krótkiego odpoczynku oraz poziom Wyczerpania.",
    stages: [
      "Gorączka, grudkowata wysypka i zapalenie stawów; bóle głowy i mięśni, dreszcze, wymioty. "
      + "Lekarstwo: Antybiotyki przyjmowane 10 dni z rzędu."
    ]
  },
  zakazna: {
    label: "Choroba zakaźna",
    medicine: "Antybiotyk",
    saveDC: 10,
    saveNote: "Przebywanie w pomieszczeniu z zarażonym: RO na Kondycję ST 10 albo zarażenie.",
    stages: [
      "Antybiotykoterapia trwająca co najmniej 10 dni leczy chorobę. Po 3 dniach efekty znikają, "
      + "po dziesięciu chory przestaje zarażać."
    ]
  },
  deathBreath: {
    label: "Death Breath",
    medicine: "",
    onset: "Po 1k4 godzinach",
    saveDC: 10,
    saveNote: "RO na Kondycję ST 10, inaczej w ciągu kilku godzin przemiana w zombie.",
    stages: [
      "Wirus przenosi się przez kontakt z krwią lub śliną zarażonego. Lekarstwo: brak. Zakażonemu "
      + "można pomóc przez dekapitację, zniszczenie mózgu lub spalenie."
    ]
  }
});

/** Sunset check constants (RAW str. 109). */
export const SUNSET_SAVE = Object.freeze({ ability: "con", dc: 10 });

/** All diseases, chronic first, as a flat lookup. */
export const ALL_DISEASES = Object.freeze({ ...CHRONIC_DISEASES, ...COMMON_DISEASES });

/** @returns {object|null} the disease definition for a key, or null for custom entries. */
export function getDisease(key) {
  return key ? (ALL_DISEASES[key] ?? null) : null;
}

/** @returns {string[]} stage descriptions for an entry (custom entries carry their own). */
export function diseaseStages(entry) {
  if (!entry) return [];
  const def = getDisease(entry.key);
  return def?.stages ?? entry.stages ?? [];
}

/** True when the disease has a stage ladder and so participates in the sunset RO. */
export function hasStageLadder(entry) {
  return diseaseStages(entry).length > 1;
}

/** Options for the "select a disease" dropdown, grouped for an <optgroup> render. */
export function diseaseOptions() {
  return [
    {
      group: "Choroby przewlekłe (k8)",
      options: Object.entries(CHRONIC_DISEASES)
        .sort((a, b) => a[1].roll - b[1].roll)
        .map(([key, d]) => ({ key, label: `${d.roll}. ${d.label}` }))
    },
    {
      group: "Choroby popularne",
      options: Object.entries(COMMON_DISEASES).map(([key, d]) => ({ key, label: d.label }))
    }
  ];
}
