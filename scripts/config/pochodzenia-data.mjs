/**
 * Neuroshima 5e — Pochodzenia i ich zdolności.
 *
 * Każda postać wybiera (lub losuje k12) jedno z 12 Pochodzeń. Daje ono premię do
 * dwóch Cech Bazowych i jedną zdolność z listy trzech (lub losowaną k6). Spec na
 * poz. 5 dobiera drugą, a Sztuczka `Patriota` kolejną.
 *
 * **Zakres tego modułu.** Trzyma dane: 12 regionów z premiami i 36 zdolności.
 * Zdolności jadą do packa `zdolnosci-pochodzenia` jako opisowe `feat`y — dokładnie
 * tak, jak Sztuczki. Same Pochodzenia jadą do packa `pochodzenia` jako itemy typu
 * `background`: to natywny slot dnd5e, który w regułach 2024 robi dokładnie to samo
 * co Pochodzenie w Neuroshimie — podbija Cechy i daje jedną zdolność z listy.
 * Premie (+1/+1) nakłada advancement `AbilityScoreImprovement` z `fixed`, wybór
 * zdolności — `ItemChoice` z pulą trzech pozycji danego regionu. Zero własnego kodu.
 *
 * Mechanikę ma dziś 1 z 36: `Wychuchana spluwa` (`weapons/jams.mjs`). Reszta to
 * uczciwy opis — ten moduł powstał, zanim Pochodzenia dostały własny przebieg,
 * bo `Wychuchana spluwa` była jedyną zdolnością spoza klas i Sztuczek, którą kod
 * naprawdę egzekwuje, a bez realnego itemu jedynym sposobem jej włączenia był
 * prototypowy panel na karcie aktora.
 *
 * Źródło prozy: `Tabele/Pochodzenie.md` — `text`, `roll` i premie cytują tę tabelę.
 */

import { createCoverageLedger } from "./coverage-ledger.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Nazwy Cech Bazowych po polsku. Builder packów nie ma `game.i18n`. */
const ATTR_PL = Object.freeze({
  str: "Siła", dex: "Zręczność", con: "Kondycja",
  int: "Inteligencja", wis: "Mądrość", cha: "Charyzma"
});

/** Gdzie w materiale źródłowym leżą reguły Pochodzeń. */
export const POCHODZENIA_SOURCE = "Tabele/Pochodzenie.md";

/**
 * @typedef {object} PochodzenieDef
 * @property {string} label
 * @property {string} roll     Wynik k12 z tabeli Pochodzeń.
 * @property {string[]} attrs  Dwie Cechy po +1 (klucze dnd5e).
 * @property {string} flavour  Jedno zdanie opisu, z tabeli.
 */

/** @type {Readonly<Record<string, PochodzenieDef>>} */
export const POCHODZENIA = Object.freeze({
  asgard: {
    label: "Asgard",
    roll: "1",
    attrs: ["con", "int"],
    flavour: "Potomkowie elitarnych bunkrów projektu Ragnarok. Technologicznie zaawansowani, "
      + "naiwni wobec realiów pustkowi."
  },
  "czlowiek-pustyni": {
    label: "Człowiek Pustyni",
    roll: "2",
    attrs: ["con", "wis"],
    flavour: "Indywidualiści zdolni przeżyć tam, gdzie inni giną. Zaradni, gardzący miejskim życiem."
  },
  detroit: {
    label: "Detroit",
    roll: "3",
    attrs: ["dex", "wis"],
    flavour: "Uzależnieni od adrenaliny kierowcy i mechanicy. Życie kręci się wokół samochodów."
  },
  appalachy: {
    label: "Federacja Appalachów",
    roll: "4",
    attrs: ["str", "cha"],
    flavour: "Górnicy i zarządcy kopalń. Twardzi lub szlachetni — rzadko coś pomiędzy."
  },
  miami: {
    label: "Miami",
    roll: "5",
    attrs: ["str", "dex"],
    flavour: "Zawadiaccy i odporni mieszkańcy bagien. Piraci, śmiałkowie i ci, którym Neodżungla "
      + "nie robi wrażenia."
  },
  missisipi: {
    label: "Missisipi",
    roll: "6",
    attrs: ["str", "wis"],
    flavour: "Najlepsi łowcy mutantów w Stanach. Skażeni, uodpornieni, fanatycznie nienawidzący "
      + "wynaturzeń."
  },
  "nowy-jork": {
    label: "Nowy Jork",
    roll: "7",
    attrs: ["int", "cha"],
    flavour: "Optymistyczni, wyedukowani i nastawieni na handel. Mają lepszy dostęp do wiedzy "
      + "niż większość świata."
  },
  hegemonia: {
    label: "Południowa Hegemonia",
    roll: "8",
    attrs: ["str", "con"],
    flavour: "Twardzi jak skała, lojalni jak psy. Potomkowie kryminalistów, którzy znaleźli sens "
      + "w walce za Bano."
  },
  posterunek: {
    label: "Posterunek",
    roll: "9",
    attrs: ["int", "wis"],
    flavour: "Najlepsi specjaliści od walki z Molochem. Zdyscyplinowani eksperci od elektroniki, "
      + "wszczepów i cybernetyki."
  },
  "salt-lake-city": {
    label: "Salt Lake City",
    roll: "10",
    attrs: ["wis", "cha"],
    flavour: "Wierzący fanatycy, charyzmatyczni kaznodzieje, znawcy historii sprzed wojny."
  },
  teksas: {
    label: "Teksas",
    roll: "11",
    attrs: ["con", "cha"],
    flavour: "Uparci, tradycyjni, zdrowi. Ziemia, konie i bydło to ich świat. SMART-a nienawidzą "
      + "szczególnie."
  },
  vegas: {
    label: "Vegas",
    roll: "12",
    attrs: ["dex", "cha"],
    flavour: "Gładcy, cwani, uśmiechnięci. Czytają w myślach, blefują doskonale. Nie siadaj z nimi "
      + "do kart."
  }
});

/**
 * @typedef {object} OriginAbilityDef
 * @property {string} id                Slug — `_id` w packu i klucz ikony.
 * @property {string} origin            Klucz w `POCHODZENIA`.
 * @property {string} roll              Wynik k6 z tabeli Pochodzenia.
 * @property {string} label
 * @property {string} text              Opis, dosłownie z tabeli.
 * @property {string} [legacyAbilityKey] Klucz w `ABILITY_KEYS` (`actors/abilities.mjs`).
 * @property {{what: string, where: string}[]} auto  Co system realnie egzekwuje.
 * @property {string} [manual]          Co zostaje po stronie MG mimo częściowej automatyki.
 */

/** @type {Readonly<Record<string, OriginAbilityDef>>} */
export const ORIGIN_ABILITIES = Object.freeze({
  /* --- Asgard --- */
  "nowka-sztuka": {
    id: "nowka-sztuka",
    origin: "asgard",
    roll: "1–2",
    label: "Nówka sztuka",
    text: "Zabierasz z bunkra 1 dowolny przedmiot warty maks. 100 gb.",
    auto: []
  },
  "przedwojenna-edukacja": {
    id: "przedwojenna-edukacja",
    origin: "asgard",
    roll: "3–4",
    label: "Przedwojenna edukacja",
    text: "Ułatwienie w Testach INT dot. wiedzy sprzed Molocha + biegłość w 1 zestawie narzędzi.",
    auto: []
  },
  "nano-tech": {
    id: "nano-tech",
    origin: "asgard",
    roll: "5–6",
    label: "Nano-Tech",
    text: "Ułatwienie przy konstruowaniu/naprawianiu urządzeń elektronicznych + biegłość "
      + "w narzędziach małego elektronika.",
    auto: []
  },

  /* --- Człowiek Pustyni --- */
  "dieta-cud": {
    id: "dieta-cud",
    origin: "czlowiek-pustyni",
    roll: "1–2",
    label: "Dieta cud",
    text: "Potrzebujesz tylko 1 l wody i 250 g jedzenia dziennie; środki lecznicze przywracają "
      + "2× więcej PW + biegłość m. kucharz.",
    auto: []
  },
  "duch-pustyni": {
    id: "duch-pustyni",
    origin: "czlowiek-pustyni",
    roll: "3–4",
    label: "Duch pustyni",
    text: "Ułatwienie do Skradania się i Survivalu na pustyni i piaszczystym terenie.",
    auto: []
  },
  "polegam-tylko-na-sobie": {
    id: "polegam-tylko-na-sobie",
    origin: "czlowiek-pustyni",
    roll: "5–6",
    label: "Polegam tylko na sobie",
    text: "Biegłość m. kowal; własnoręcznie wykonana broń biała/miotana: +1 do Testów Ataku "
      + "i obrażeń.",
    auto: []
  },

  /* --- Detroit --- */
  "siodme-poty": {
    id: "siodme-poty",
    origin: "detroit",
    roll: "1–2",
    label: "Siódme poty",
    text: "Biegłość w Pojazdach; pojazdy którymi jeździsz poruszają się o 50% szybciej.",
    auto: []
  },
  "jesli-ma-silnik-to-ruszy": {
    id: "jesli-ma-silnik-to-ruszy",
    origin: "detroit",
    roll: "3–4",
    label: "Jeśli ma silnik, to ruszy",
    text: "Ułatwienie przy konstruowaniu/naprawianiu pojazdów + biegłość m. mechanik.",
    auto: []
  },
  "ale-jazda": {
    id: "ale-jazda",
    origin: "detroit",
    roll: "5–6",
    label: "Ale jazda!",
    text: "Brak Utrudnienia do Testów Ataku przy strzelaniu z jadącego pojazdu / wierzchowca / "
      + "podczas spadania.",
    auto: []
  },

  /* --- Federacja Appalachów --- */
  "gornik-z-dziada-pradziada": {
    id: "gornik-z-dziada-pradziada",
    origin: "appalachy",
    roll: "1–2",
    label: "Górnik z dziada pradziada",
    text: "Ułatwienie w Testach SIŁ (Atletyka) + Udźwig ×2.",
    auto: []
  },
  "wychuchana-spluwa": {
    id: "wychuchana-spluwa",
    origin: "appalachy",
    roll: "3–4",
    label: "Wychuchana spluwa",
    text: "Wybrany egzemplarz broni palnej nigdy się nie zatnie; można zmienić po Długim "
      + "odpoczynku + biegłość m. rusznikarz.",
    legacyAbilityKey: "wychuchanaSpluwa",
    auto: [{
      what: "Oznaczenie jednej broni palnej jako wychuchanej (zmiana tylko poza walką, "
        + "jedna naraz) i pełna odporność tego egzemplarza na zacięcia.",
      where: "weapons/jams.mjs"
    }],
    manual: "Biegłość w narzędziach rusznikarza nadaje MG — nic nie sprawdza, czy postać "
      + "ma ją z Pochodzenia."
  },
  "szlachetne-urodzenie": {
    id: "szlachetne-urodzenie",
    origin: "appalachy",
    roll: "5–6",
    label: "Szlachetne urodzenie",
    text: "2 biegłości z listy: Historia, Oszustwo, Perswazja, Zastraszanie.",
    auto: []
  },

  /* --- Miami --- */
  "czlowiek-aligator": {
    id: "czlowiek-aligator",
    origin: "miami",
    roll: "1–2",
    label: "Człowiek-aligator",
    text: "Szybkość pływania = bazowa Szybkość.",
    auto: []
  },
  "ja-juz-swoje-odchorowalem": {
    id: "ja-juz-swoje-odchorowalem",
    origin: "miami",
    roll: "3–4",
    label: "Ja już swoje odchorowałem",
    text: "Ułatwienie w Rzutach Obronnych na Kondycję.",
    auto: []
  },
  wloczykij: {
    id: "wloczykij",
    origin: "miami",
    roll: "5–6",
    label: "Włóczykij",
    text: "Podmokłe tereny i rozległe piaski to nie trudny teren + biegłość m. kartograf.",
    auto: []
  },

  /* --- Missisipi --- */
  "cos-mi-tu-smierdzi": {
    id: "cos-mi-tu-smierdzi",
    origin: "missisipi",
    roll: "1–2",
    label: "Coś mi tu śmierdzi",
    text: "Automatyczne wyczucie mutantów w zasięgu 9 m; Test Percepcji ST 15 → wskazanie "
      + "konkretnej istoty.",
    auto: []
  },
  "kwas-w-zylach": {
    id: "kwas-w-zylach",
    origin: "missisipi",
    roll: "3–4",
    label: "Kwas w żyłach",
    text: "Ułatwienie w RO przeciw truciznom i kwasom.",
    auto: []
  },
  "chodzmy-na-pewno-juz-utonal": {
    id: "chodzmy-na-pewno-juz-utonal",
    origin: "missisipi",
    roll: "5–6",
    label: "Chodźmy, na pewno już utonął",
    text: "Wstrzymanie oddechu 2 min × mod. KON; Ułatwienie w Testach SIŁ (Atletyka) "
      + "przy pływaniu.",
    auto: []
  },

  /* --- Nowy Jork --- */
  edukacja: {
    id: "edukacja",
    origin: "nowy-jork",
    roll: "1–2",
    label: "Edukacja",
    text: "2 biegłości z listy: Przyroda, Medycyna, Historia, Technika, dowolne narzędzia.",
    auto: []
  },
  "gambling-we-krwi": {
    id: "gambling-we-krwi",
    origin: "nowy-jork",
    roll: "3–4",
    label: "Gambling we krwi",
    text: "Nigdy nie męczysz się gamblingiem; +5% do dostępności towarów.",
    auto: []
  },
  "czas-patriotow": {
    id: "czas-patriotow",
    origin: "nowy-jork",
    roll: "5–6",
    label: "Czas patriotów",
    text: "1×/Długi Odpoczynek: +5 do dowolnego Testu Cechy lub Rzutu Obronnego.",
    auto: []
  },

  /* --- Południowa Hegemonia --- */
  "urodzony-morderca": {
    id: "urodzony-morderca",
    origin: "hegemonia",
    roll: "1–2",
    label: "Urodzony morderca",
    text: "Jeśli na kości obrażeń wypadnie 1, możesz raz powtórzyć rzut tą kością.",
    auto: []
  },
  "zjadlem-wlasnego-psa": {
    id: "zjadlem-wlasnego-psa",
    origin: "hegemonia",
    roll: "3–4",
    label: "Wiesz, zjadłem własnego psa",
    text: "Biegłość w Zastraszaniu + Ułatwienie w Testach Zastraszania + biegłość m. rzeźnik.",
    auto: []
  },
  "zawziety-sukinkot": {
    id: "zawziety-sukinkot",
    origin: "hegemonia",
    roll: "5–6",
    label: "Zawzięty sukinkot",
    text: "1×/Długi Odpoczynek: gdy PW → 0, na początku następnej tury wstajesz z 1 PW "
      + "i przeprowadzasz turę normalnie.",
    auto: []
  },

  /* --- Posterunek --- */
  "na-symulatorach-to-dzialalo": {
    id: "na-symulatorach-to-dzialalo",
    origin: "posterunek",
    roll: "1–2",
    label: "Na symulatorach to działało",
    text: "2 biegłości z listy: Pojazdy, Technika, m. mechanik, m. elektronik.",
    auto: []
  },
  "hi-tech": {
    id: "hi-tech",
    origin: "posterunek",
    roll: "3–4",
    label: "Hi-Tech",
    text: "Ułatwienie do każdego Testu Cechy związanego z obsługą urządzenia elektronicznego.",
    auto: []
  },
  "moloch-cos-slyszalem": {
    id: "moloch-cos-slyszalem",
    origin: "posterunek",
    roll: "5–6",
    label: "Moloch? Coś słyszałem",
    text: "Ułatwienie w Testach INT o maszynach Molocha + Ułatwienie w RO przeciw ich "
      + "zdolnościom i atakom obszarowym.",
    auto: []
  },

  /* --- Salt Lake City --- */
  "cholerny-kaznodzieja": {
    id: "cholerny-kaznodzieja",
    origin: "salt-lake-city",
    roll: "1–2",
    label: "Cholerny kaznodzieja",
    text: "Biegłość w Perswazji + Ułatwienie przy przekonywaniu do wiary; Ułatwienie w testach "
      + "Wpływania na wyznawców.",
    auto: []
  },
  "przed-wojna-wszystko-bylo-lepiej": {
    id: "przed-wojna-wszystko-bylo-lepiej",
    origin: "salt-lake-city",
    roll: "3–4",
    label: "Przed wojną wszystko było lepiej",
    text: "Biegłość w Historii i Medycynie + Ułatwienie w testach o wiedzy sprzed wojny.",
    auto: []
  },
  wierze: {
    id: "wierze",
    origin: "salt-lake-city",
    roll: "5–6",
    label: "Wierzę",
    text: "1×/Długi Odpoczynek: wymyślasz drobny przedmiot (maks. 5 gb) — MG musi wprowadzić "
      + "go do gry. Musi być łatwy do zabrania i przypadkowy.",
    auto: []
  },

  /* --- Teksas --- */
  "czlowiek-zwany-koniem": {
    id: "czlowiek-zwany-koniem",
    origin: "teksas",
    roll: "1–2",
    label: "Człowiek zwany koniem",
    text: "2 biegłości z listy: Atletyka, Tresura, Medycyna.",
    auto: []
  },
  "doktor-quinn": {
    id: "doktor-quinn",
    origin: "teksas",
    roll: "3–4",
    label: "Doktor Quinn",
    text: "Biegłość w Medycynie + Ułatwienie w Testach Medycyny.",
    auto: []
  },
  "zdrowa-okolica": {
    id: "zdrowa-okolica",
    origin: "teksas",
    roll: "5–6",
    label: "Zdrowa okolica",
    text: "Biegłość w RO na Kondycję + Ułatwienie w Rzutach Obronnych na Kondycję.",
    auto: []
  },

  /* --- Vegas --- */
  hazardzista: {
    id: "hazardzista",
    origin: "vegas",
    roll: "1–2",
    label: "Hazardzista",
    text: "Biegłość w Zwinnych dłoniach i Oszustwie.",
    auto: []
  },
  telepata: {
    id: "telepata",
    origin: "vegas",
    roll: "3–4",
    label: "Telepata",
    text: "Biegłość w Intuicji + Ułatwienie w Testach Intuicji.",
    auto: []
  },
  fart: {
    id: "fart",
    origin: "vegas",
    roll: "5–6",
    label: "Fart",
    text: "Naturalne 1 na k20 → powtórz rzut (wynik nowego obowiązuje). Odnawia się "
      + "po Krótkim odpoczynku.",
    auto: []
  }
});


/* -------------------------------------------- */
/*  Rejestr automatyki                           */
/* -------------------------------------------- */

const LEDGER = createCoverageLedger({
  entries: ORIGIN_ABILITIES,
  cssPrefix: "neuro-pochodzenie",
  noneHtml: "Bez automatyki — efekt rozstrzyga MG przy stole.",
  title: "Pochodzenia"
});

/** @returns {"auto"|"partial"|"none"} */
export const originAbilityStatus = LEDGER.status;

/** @returns {{auto: string[], partial: string[], none: string[]}} */
export const pochodzeniaCoverage = LEDGER.coverage;

/** Wypisz rejestr — które zdolności z Pochodzeń wciąż czekają na kod. */
export const reportPochodzenia = LEDGER.report;

/** Zdolności jednego Pochodzenia, w kolejności rzutu k6. */
export function abilitiesOf(originKey) {
  return Object.values(ORIGIN_ABILITIES).filter(a => a.origin === originKey);
}

/* -------------------------------------------- */
/*  Item data                                    */
/* -------------------------------------------- */

/** Premia do Cech jako `{con: 1, int: 1}` — wprost do `AbilityScoreImprovement.fixed`. */
export function attrBonus(originKey) {
  return Object.fromEntries((POCHODZENIA[originKey]?.attrs ?? []).map(a => [a, 1]));
}

/**
 * Build the `background` item data for one Pochodzenie.
 *
 * Advancementy dokleja builder packów (`dev/packs/build-packs.mjs`), bo to on zna
 * UUID-y zdolności. Tu jest tylko treść karty.
 *
 * @param {string} key
 * @param {object} [options]
 * @param {string} [options._id]
 * @returns {object} Item creation data.
 */
export function pochodzenieItemData(key, { _id } = {}) {
  const def = POCHODZENIA[key];
  if (!def) throw new Error(`Unknown origin "${key}"`);

  const bonus = def.attrs.map(a => `${ATTR_PL[a] ?? a} +1`).join(", ");
  const rows = abilitiesOf(key)
    .map(a => `<tr><td>${a.roll}</td><td><strong>${a.label}</strong></td><td>${a.text}</td></tr>`)
    .join("");

  const data = {
    name: def.label,
    type: "background",
    img: "icons/svg/village.svg",
    system: {
      description: {
        value: `<p><em>${def.flavour}</em></p>`
          + `<p><strong>Premia do Cech Bazowych:</strong> ${bonus}.</p>`
          + `<p><strong>Zdolność:</strong> jedna z poniższych — wybrana albo wylosowana k6.`
          + ` Spec na poz. 5 dobiera drugą, Sztuczka <em>Patriota</em> kolejną.</p>`
          + `<table><thead><tr><th>k6</th><th>Zdolność</th><th>Opis</th></tr></thead>`
          + `<tbody>${rows}</tbody></table>`,
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      identifier: key,
      advancement: [],
      startingEquipment: [],
      wealth: ""
    },
    flags: { [MODULE_ID]: { originId: key, roll: def.roll } }
  };

  if (_id) data._id = _id;
  return data;
}

/**
 * Build the `feat` item data for one origin ability.
 *
 * Kształt `feat`a jest celowo taki sam jak u Sztuczek: opisowy przedmiot bez
 * aktywności, bo mechanika siedzi w module, który się nim steruje. Flaga
 * `originAbilityId` jest tym, czego szuka resolver w `actors/abilities.mjs` —
 * nazwa itemu może się w świecie rozjechać, flaga nie.
 *
 * @param {string} key
 * @param {object} [options]
 * @param {string} [options._id]
 * @returns {object} Item creation data.
 */
export function originAbilityItemData(key, { _id } = {}) {
  const def = ORIGIN_ABILITIES[key];
  if (!def) throw new Error(`Unknown origin ability "${key}"`);

  const origin = POCHODZENIA[def.origin]?.label ?? def.origin;

  const data = {
    name: def.label,
    type: "feat",
    img: "icons/svg/upgrade.svg",
    system: {
      description: {
        value: `<p>${def.text}</p><p><em>Pochodzenie: ${origin} (k6: ${def.roll}).</em></p>`
          + LEDGER.html(key),
        chat: ""
      },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: "feat", subtype: "" },
      requirements: `Pochodzenie: ${origin}`,
      properties: [],
      prerequisites: { repeatable: false },
      uses: { max: "", spent: 0, recovery: [] },
      activities: {}
    },
    flags: {
      [MODULE_ID]: {
        originAbilityId: def.id,
        origin: def.origin,
        coverage: originAbilityStatus(key)
      }
    }
  };

  if (_id) data._id = _id;
  return data;
}

/** Public API, exposed on `game.neuroshima.pochodzenia`. */
export const pochodzeniaApi = {
  all: POCHODZENIA,
  abilities: ORIGIN_ABILITIES,
  of: abilitiesOf,
  bonus: attrBonus,
  status: originAbilityStatus,
  coverage: pochodzeniaCoverage,
  report: reportPochodzenia
};
