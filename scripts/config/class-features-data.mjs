/**
 * Neuroshima 5e — Class & profession ability definitions (GENERATED).
 *
 * ⚠ DO NOT EDIT BY HAND. Regenerate with `dev/classes/gen_features.py`.
 *
 * Ability text is verbatim from the rulebook PDF text dump
 * (`Podrecznik/source.txt`), including the [A]/[B]/[R] action tags.
 * `uses` / `toggle` / `hotbar` metadata is hand-authored in the generator and
 * justified by a quote from the ability's own text.
 *
 * Fields:
 *   id            stable slug, referenced from `classes-data.mjs` level tables
 *   source        "klasa" | "profesja"
 *   owner         class identifier, or profession identifier
 *   alsoOwnedBy   other classes granting the same feature (e.g. Drugi atak)
 *   level         class level it is granted at (null for profession picks)
 *   action        "A" | "B" | "R" | null (passive)
 *   uses          { max: <roll-data formula>, period: "sr" | "lr" | "combat" }
 *   toggle        stateful abilities — see actors/class-state.mjs
 *   hotbar        gets an auto-managed macro — see actors/ability-hotbar.mjs
 *   exclusiveGroup non-stacking family (multiclass rule) — see actors/class-rules.mjs
 */

export const CLASS_FEATURES = {
  "berserk": {
    id: "berserk",
    source: "klasa",
    owner: "brutal",
    level: 1,
    label: "Berserk",
    action: "B",
    uses: { max: "@scale.brutal.berserki", period: "lr" },
    hotbar: true,
    toggle: { effect: "neuro-berserk", duration: { rounds: 10 }, breaksOn: ["unconscious", "incapacitated", "charmed"], afterEnd: "noActionNextTurn" },
    text: "W Akcji Bonusowej możesz wpaść w Berserk. W tym swoistym szale otrzymujesz następujące korzyści: Siła Berserkera. Masz Ułatwienie w testach Siły i RO na Siłę. Obrażenia Berserkera. Kiedy wykonujesz atak oparty na Sile — bronią lub bez broni i zadajesz obrażenia, dorzucasz dodatkową kość obrażeń rosnącą wraz z poziomem Brutala, zgodnie z kolumną Obrażenia Berserkera w tabeli Zdolności Klasowych Brutala. Szarża Berserkera [B]. Jeśli przeznaczysz całą swoją Szybkość na zbliżenie się do przeciwnika, którego widzisz lub słyszysz, możesz w Akcji Bonusowej wykonać Przyspieszenie w jego kierunku. Obłęd Berserkera. Jeśli nie nosisz żadnego pancerza, hełmu ani tarczy, twoja TT rośnie o wartość modyfikatora Siły. Czas trwania. Berserk trwa 10 rund (do końca twojej ostatniej tury), chyba że otrzymasz stan Nieprzytomność, Obezwładnienie czy Zauroczenie, które go przerywają. Kiedy Berserk się zakończy, zmęczenie sprawia, że nie wykonujesz żadnej akcji do końca twojej następnej tury. Liczbę dostępnych na danym poziomie Berserków, znajdziesz w tabeli Zdolności klasowe Brutala. Liczba ta odnawia się po odbyciu Długiego odpoczynku."
  },
  "gola-klata": {
    id: "gola-klata",
    source: "klasa",
    owner: "brutal",
    level: 1,
    label: "Goła klata",
    action: null,
    passive: true,
    acFormula: "10 + @abilities.dex.mod + @abilities.con.mod",
    exclusiveGroup: "unarmoredAc",
    text: "Kiedy nie nosisz żadnego pancerza, hełmu ani tarczy twoja Trudność Trafienia wynosi 10 + twoje modyfikatory Zręczności i Kondycji. Ta zdolność nie łączy się z podobnie działającymi zdolnościami innych klas."
  },
  "wsciekly-cios": {
    id: "wsciekly-cios",
    source: "klasa",
    owner: "brutal",
    level: 2,
    label: "Wściekły cios",
    action: null,
    uses: { max: "@classes.brutal.levels", period: "lr" },
    resource: { die: "1d6", label: "Kości Wściekłego ciosu" },
    hotbar: true,
    text: "Raz w rundzie, kiedy trafisz atakiem opartym na Sile, możesz dodać do obrażeń kości Wściekłego ciosu. Masz ich tyle, ile poziomów Brutala, a każda z nich zadaje dodatkowo 1k6 obrażeń."
  },
  "z-bara": {
    id: "z-bara",
    source: "klasa",
    owner: "brutal",
    level: 2,
    label: "Z bara!",
    action: "B",
    hotbar: true,
    requiresState: "neuro-berserk",
    text: "Kiedy jesteś pod wpływem zdolności Berserk, to w Akcji Bonusowej możesz wykonać Odepchnięcie istoty dużej lub mniejszej od ciebie. Cel musi zdać RO na Siłę lub Zręczność, inaczej go odpychasz o 1,5 metra od siebie lub przewracasz, nakładając na niego stan Powalenie. Stopień Trudności RO wynosi 8 plus twój modyfikator Siły i Premia Biegłości."
  },
  "szosty-zmysl": {
    id: "szosty-zmysl",
    source: "klasa",
    owner: "brutal",
    level: 3,
    label: "Szósty zmysł",
    action: null,
    text: "Masz pierwsze objawy paranoi. Wszędzie widzisz niebezpieczeństwo, ale dzięki temu łatwiej ci uniknąć zagrożenia. Otrzymujesz Ułatwienie w RO na Zręczność przeciw zagrożeniom, które jesteś w stanie zarejestrować zmysłami, np. pułapki, śliska nawierzchnia, spadający sufit, granat czy długa seria z karabinu maszynowego. Szósty zmysł nie działa, jeśli jesteś pod wpływem stanu Oślepienie, Ogłuszenie lub Nieprzytomność."
  },
  "brutalny-cios": {
    id: "brutalny-cios",
    source: "klasa",
    owner: "brutal",
    level: 5,
    label: "Brutalny cios",
    action: null,
    uses: { max: "@classes.brutal.levels", period: "lr" },
    hotbar: true,
    text: "Kiedy używasz kości Wściekłego ciosu w ataku wręcz, możesz nałożyć na cel jeden dodatkowy efekt zgodny z poniższą tabelą. Efekty o tym samym działaniu się nie kumulują. PRZYKŁAD: Na 5. poziomie Brutala masz 5 kości Wściekłego ciosu. Do pojedynczego ataku możesz dodać maksymalnie 3 kości Wściekłego ciosu. Kości tej zdolności odnawiają się po odbyciu Długiego odpoczynku."
  },
  "drugi-atak": {
    id: "drugi-atak",
    source: "klasa",
    owner: "brutal",
    alsoOwnedBy: ["twardziel", "zwiadowca"],
    level: 5,
    label: "Drugi atak",
    action: null,
    passive: true,
    exclusiveGroup: "extraAttack",
    text: "Kiedy wykonujesz w swojej turze akcję Atakowanie, możesz zaatakować dwukrotnie."
  },
  "solowa": {
    id: "solowa",
    source: "klasa",
    owner: "brutal",
    level: 7,
    label: "Solówa",
    action: "B",
    hotbar: true,
    text: "W Akcji Bonusowej możesz wybrać istotę, którą widzisz w zasięgu 18 metrów. Prowokujesz ją do atakowania tylko ciebie, jeśli nie zda ona RO na Inteligencję o ST 8 plus twoja Premia Biegłości i modyfikator Siły. Efekt trwa, dopóki istota cię widzi lub zda Rzut Obronny na końcu swojej następnej tury."
  },
  "szalencza-szarza": {
    id: "szalencza-szarza",
    source: "klasa",
    owner: "brutal",
    level: 7,
    label: "Szaleńcza szarża",
    action: null,
    text: "Twoja szybkość rośnie o 3 m, a jeśli wykonasz akcję Przyspieszenie, przeciwnicy mają Utrudnienie do Testów Ataków dystansowych przeciw tobie, do początku twojej następnej tury."
  },
  "paranoja": {
    id: "paranoja",
    source: "klasa",
    owner: "brutal",
    level: 9,
    label: "Paranoja",
    action: null,
    text: "Twój lęk przed zagrożeniem jest tak wielki, że wszędzie spodziewasz się zasadzki. Nikt nie jest w stanie cię zaskoczyć i otrzymujesz Ułatwienie w testach Inicjatywy. 000 68 TYP OBRAŻEŃ EFEKT Obuchowe Powalenie. Automatyczne powalenie istoty, maksymalnie o jeden rozmiar większej od ciebie. Cięte Osłabienie. Cel otrzymuje karę -1k4 do Testów Ataku (tj. jego wynik pomniejszany jest o 1k4) do początku twojej następnej tury. Kłute Okulawienie. Szybkość istoty spada o 6 m, do początku twojej następnej tury.KLASY"
  },
  "zabojczy-cios": {
    id: "zabojczy-cios",
    source: "klasa",
    owner: "brutal",
    level: 11,
    label: "Zabójczy cios",
    action: null,
    text: "Wiesz już gdzie uderzać, żeby wyrządzić największe szkody. Kiedy trafiasz krytycznie atakiem wręcz, zamiast podwajać, potrajasz kostki obrażeń."
  },
  "motywacja": {
    id: "motywacja",
    source: "klasa",
    owner: "cwaniak",
    level: 1,
    label: "Motywacja",
    action: "R",
    uses: { max: "@abilities.cha.mod", period: "sr" },
    resource: { die: "@scale.cwaniak.motywacja" },
    hotbar: true,
    text: "Motywujesz towarzysza za pomocą słów lub muzyki. Kiedy twój sojusznik wykonuje dowolny test, możesz w swojej Reakcji zwiększyć jego szanse na sukces. Sojusznik musi się znajdować w zasięgu 18 metrów od ciebie, a twoja Reakcja musi nastąpić przed poznaniem efektu testu. Sojusznik dodaje kość Motywacji, do swojego Testu k20. Wartość kości Motywacji określa tabela Zdolności klasowych Cwaniaka. Możesz użyć tej zdolność tyle razy, ile wynosi twój modyfikator Charyzmy. Zdolność odnawia się po Krótkim odpoczynku."
  },
  "szczescie": {
    id: "szczescie",
    source: "klasa",
    owner: "cwaniak",
    level: 1,
    label: "Szczęście",
    action: null,
    uses: { max: "@scale.cwaniak.szczescie", period: "lr" },
    hotbar: true,
    text: "Raz w rundzie możesz powtórzyć dowolny test, którego wynik ci nie odpowiada. Powtórzony test zawiera takie samo Ułatwienie lub Utrudnienie, jak test pierwotny. Wynik, który otrzymasz w przerzucie, musisz zaakceptować. Możesz użyć tej zdolności tyle razy, ile wskazuje kolumna Szczęście w tabeli Zdolności klasowych Cwaniaka. Zdolność Szczęście odnawia się po Długim odpoczynku."
  },
  "kolejka": {
    id: "kolejka",
    source: "klasa",
    owner: "cwaniak",
    level: 2,
    label: "Kolejka",
    action: null,
    restActivity: "sr",
    resource: { die: "@scale.cwaniak.kolejka" },
    text: "Podczas Krótkiego odpoczynku, puszczasz wśród towarzyszy kolejkę z napitkiem własnej roboty. Każdy, kto pije, odzyskuje dodatkowo +1k4 PW za każdą wydaną Kość Wytrzymałości, podczas tego odpoczynku. Pokrzepiająca siła płynąca ze zdolności Kolejka rośnie zgodnie z ostatnią kolumną w tabeli Zdolności klasowych Cwaniaka."
  },
  "spieprzysz-to": {
    id: "spieprzysz-to",
    source: "klasa",
    owner: "cwaniak",
    level: 2,
    label: "Spieprzysz to!",
    action: "R",
    uses: { max: "@abilities.cha.mod", period: "sr" },
    hotbar: true,
    text: "Potrafisz każdego wytrącić z równowagi. Kiedy istota, którą widzisz w promieniu 18 m, wykonała udany Test Ataku lub Rzut Obronny, możesz w swojej Reakcji sprawić, by powtórzyła rzut i wybrała gorszy wynik. Tej zdolności możesz użyć tyle razy, ile wynosi twój modyfikator Charyzmy. Zdolność odnawia się po ukończeniu Krótkiego odpoczynku."
  },
  "szybka-gadka": {
    id: "szybka-gadka",
    source: "klasa",
    owner: "cwaniak",
    level: 3,
    label: "Szybka gadka",
    action: "B",
    hotbar: true,
    text: "W czasie walki możesz wykonać akcję Wpływanie w swojej Akcji Bonusowej. Swoimi błyskawicznymi i celnymi słowami, możesz np. oszukać przeciwnika, zdezorientować go lub przekonać do wycofania się. PRZYKŁAD: Wykonując Test Charyzmy (Zastraszanie) o ST 15, próbujesz nastraszyć gangusa, żeby uciekł z pola walki. Albo wykonując Test Charyzmy (Oszustwo) o ST 15, próbujesz przekonać mutanta, żeby nie robił ci krzywdy, bo też jesteś mutantem. Lub wykonując test Mądrości (Tresura) o ST 15, próbujesz uspokoić rozwścieczonego neoniedźwiedzia. Po więcej szczegółów zajrzyj do podrozdziału Interakcje z istotami (str XXX)."
  },
  "ekspert": {
    id: "ekspert",
    source: "klasa",
    owner: "cwaniak",
    level: 4,
    label: "Ekspert",
    action: null,
    text: "Wybierasz dwie umiejętności lub jedną umiejętność i jedno narzędzie, w których masz biegłość. Od tej pory specjalizujesz się w nich, więc Premia Biegłości ulega podwojeniu."
  },
  "cwaniacki-zwod": {
    id: "cwaniacki-zwod",
    source: "klasa",
    owner: "cwaniak",
    level: 5,
    label: "Cwaniacki zwód",
    action: "B",
    hotbar: true,
    text: "Jeśli nie nosisz ciężkiego pancerza, to w Akcji Bonusowej możesz wykonać akcję Odstąpienie i przemieścić się przez obszar zajmowany przez przeciwników, nie prowokując ataków okazyjnych."
  },
  "obelga": {
    id: "obelga",
    source: "klasa",
    owner: "cwaniak",
    level: 5,
    label: "Obelga",
    action: "A",
    uses: { max: "@prof", period: "sr" },
    hotbar: true,
    text: "Zamiast wykonywać akcję Atakowanie, możesz obrazić istotę w zasięgu 18 metrów, która cię widzi i słyszy. Istota nie musi cię rozumieć, ponieważ sam ton twojego głosu ocieka pogardą. Jeżeli do końca twojej następnej tury cel zaatakuje kogoś innego niż ty, wykonuje Testy Ataku z Utrudnieniem. Tej zdolności możesz użyć tyle razy, ile wynosi twoja Premia Biegłości. Zdolność odnawia się po ukończeniu Krótkiego odpoczynku."
  },
  "glowa-do-gory": {
    id: "glowa-do-gory",
    source: "klasa",
    owner: "cwaniak",
    level: 7,
    label: "Głowa do góry!",
    action: "A",
    hotbar: true,
    text: "Kiedy ty lub twoi towarzysze jesteście pod wpływem stanu Przerażenie, możesz wlać odwagę w wasze serca. W swojej akcji rozpoczynasz występ (deklamację, przemowę, modlitwę, grę na instrumencie) trwający do końca twojej następnej tury. Ty i wszyscy słyszący cię sojusznicy w zasięgu 18 metrów automatycznie zdajecie RO przeciw Przerażeniu."
  },
  "samouk": {
    id: "samouk",
    source: "klasa",
    owner: "cwaniak",
    level: 7,
    label: "Samouk",
    action: null,
    text: "Otrzymujesz biegłość w dwóch wybranych umiejętnościach lub jednej wybranej umiejętności i jednym dowolnym zestawie narzędzi."
  },
  "smiertelna-obelga": {
    id: "smiertelna-obelga",
    source: "klasa",
    owner: "cwaniak",
    level: 11,
    label: "Śmiertelna obelga",
    action: null,
    text: "Kiedy rzucasz Obelgę, twoje słowa zadają dodatkowo 1k6 x twój modyfikator Charyzmy obrażeń psychicznych, osłabiających wolę walki przeciwnika. Jeśli twoja zdolność Obelga zmniejszy PW celu do 0, upada on i osuwa się w bezdenną otchłań rozpaczy. 000 73"
  },
  "dobra-rada": {
    id: "dobra-rada",
    source: "klasa",
    owner: "spec",
    level: 1,
    label: "Dobra rada",
    action: "B",
    uses: { max: "@prof", period: "sr" },
    hotbar: true,
    text: "W Akcji Bonusowej możesz wybrać jednego sojusznika, który cię słyszy i dać mu dobrą radę. Do początku twojej następnej tury otrzymuje premię do Testu Cechy, Ataku lub Rzutu Obronnego, równą twojemu modyfikatorowi Inteligencji. Możesz użyć tej zdolności tyle razy, ile wynosi twoja Premia Biegłości. Zdolność odnawia się po odbyciu Krótkiego odpoczynku."
  },
  "inteligentna-obrona": {
    id: "inteligentna-obrona",
    source: "klasa",
    owner: "spec",
    level: 1,
    label: "Inteligentna obrona",
    action: "R",
    uses: { max: "@abilities.int.mod", period: "sr" },
    hotbar: true,
    text: "Kiedy zostajesz trafiony atakiem, przed poznaniem ilości obrażeń, możesz w Reakcji zwiększyć swoją Trudność Trafienia o wartość modyfikatora Inteligencji, do początku swojej następnej tury, by w ten sposób uniknąć trafienia. Możesz użyć tej zdolności tyle razy, ile wynosi twój modyfikator Inteligencji. Zdolność odnawia się po odbyciu Krótkiego odpoczynku."
  },
  "szybkie-badanie": {
    id: "szybkie-badanie",
    source: "klasa",
    owner: "spec",
    level: 2,
    label: "Szybkie badanie",
    action: "B",
    hotbar: true,
    text: "W czasie walki możesz wykonać akcję Badanie w swojej Akcji Bonusowej. Jesteś w stanie bardzo szybko zdobyć cenne informacje dotyczące np. miejsca walki, najbliższych urządzeń lub wybranych statystyk przeciwnika, zależnie od używanej umiejętności (patrz akcja Badanie w rozdziale Eksploracja str. XXX). PRZYKŁAD: Wykonując Test Inteligencji (Technika) o ST 15, dotyczący wrogiej maszyny Molocha, możesz się dowiedzieć, ile ma PW lub jak wysoka jest jej TT."
  },
  "leb-jak-sklep": {
    id: "leb-jak-sklep",
    source: "klasa",
    owner: "spec",
    level: 2,
    label: "Łeb jak sklep",
    action: null,
    uses: { max: "@prof", period: "lr" },
    resource: { die: "@scale.spec.lebJakSklep" },
    hotbar: true,
    text: "Miewasz przebłyski prawdziwego geniuszu. Kiedy wykonujesz Test Inteligencji lub dowolnego zestawu narzędzi, możesz dorzucić 1k4 do wyniku. Masz tyle tych kostek, ile wynosi twoja Premia Biegłości. Im masz wyższy poziom, tym wartość kostek rośnie, zgodnie z kolumną Łeb jak sklep w poniższej tabeli Zdolności klasowych Speca. Zdolność odnawia się po Długim odpoczynku."
  },
  "szybka-produkcja": {
    id: "szybka-produkcja",
    source: "klasa",
    owner: "spec",
    level: 3,
    label: "Szybka produkcja",
    action: null,
    uses: { max: 1, period: "sr" },
    text: "Raz na Krótki lub Długi odpoczynek, poza normalnymi zasadami produkcji, możesz stworzyć niewielkie przedmioty, jeśli masz odpowiednie narzędzia, surowce i schematy. Sumaryczna wartość tych przedmiotów nie może przekraczać 25 gb, a czas produkcji to 1 minuta x 1 gb wartości. PRZYKŁAD: Potrzebujesz 20 minut, żeby wyprodukować samoróbkę (20 gb), granat improwizowany (20 gb), medpak (20 gb), 2 noże do rzucania (2 x 10 gb) lub 12 naboi 9 mm (10 x 2 gb). Na poziomie 11 możesz szybko wyprodukować przedmioty warte sumarycznie 50 gb (patrz podrozdział Produkcja przedmiotów str. XXX)."
  },
  "szybkie-rece": {
    id: "szybkie-rece",
    source: "klasa",
    owner: "spec",
    level: 4,
    label: "Szybkie ręce",
    action: null,
    uses: { max: "@abilities.dex.mod", period: "sr" },
    hotbar: true,
    text: "Wczasie walki jesteś w stanie robić dwie rzeczy naraz. W swojej turze możesz wykonać jedną akcję więcej oprócz zwykłej akcji i możliwej Akcji Bonusowej. Akcja ta może być przeznaczona jedynie na akcję Używanie. Tej zdolności możesz użyć tyle razy, ile wynosi twój modyfikator Zręczności. Zdolność odnawia się po odbyciu Krótkiego odpoczynku."
  },
  "wyksztalciuch": {
    id: "wyksztalciuch",
    source: "klasa",
    owner: "spec",
    level: 5,
    label: "Wykształciuch",
    action: null,
    text: "Jeśli jeszcze nie wiesz wszystkiego, to dobierz sobie dwie umiejętności lub dwie biegłości w narzędziach. Jesteś Specem, ty zawsze wiesz wszystko!"
  },
  "specjalizacja-spec": {
    id: "specjalizacja-spec",
    source: "klasa",
    owner: "spec",
    level: 7,
    label: "Specjalizacja",
    action: null,
    text: "Wybierasz dwie ze swoich biegłości w umiejętnościach albo dwie biegłości w narzędziach, lub jedną biegłość w umiejętności i jedną biegłość w narzędziach. W każdym teście wykonywanym z ich użyciem Premia Biegłości liczy się podwójnie."
  },
  "trajektoria": {
    id: "trajektoria",
    source: "klasa",
    owner: "spec",
    level: 7,
    label: "Trajektoria",
    action: null,
    uses: { max: "@prof", period: "lr" },
    hotbar: true,
    text: "Kiedy wykonujesz Test Ataku dystansowego, możesz dodać do niego swój modyfikator Inteligencji. Tej zdolności możesz użyć tyle razy, ile wynosi twoja Premia Biegłości. Zdolność odnawia się po odbyciu Długiego odpoczynku."
  },
  "bystrzacha": {
    id: "bystrzacha",
    source: "klasa",
    owner: "spec",
    level: 9,
    label: "Bystrzacha",
    action: null,
    text: "Dodajesz połowę swojej Premii Biegłości (zaokrągloną w dół) do wszystkich umiejętności, w których nie masz biegłości."
  },
  "w-czuly-punkt": {
    id: "w-czuly-punkt",
    source: "klasa",
    owner: "spec",
    level: 11,
    label: "W czuły punkt",
    action: null,
    text: "Do wszystkich obrażeń, które zadajesz, możesz dodać swój modyfikator Inteligencji. 000 79"
  },
  "kondycha": {
    id: "kondycha",
    source: "klasa",
    owner: "twardziel",
    level: 1,
    label: "Kondycha",
    action: "B",
    uses: { max: "@abilities.con.mod", period: "lr" },
    hotbar: true,
    toggle: { effect: "neuro-kondycha", duration: { rounds: null } },
    text: "Kiedy brakuje ci sił, bierzesz głęboki oddech i walczysz dalej. W Akcji Bonusowej możesz odzyskać Punkty Wytrzymałości w liczbie 1k8 + twój poziom Twardziela. Możesz skorzystać z tej zdolności tyle razy, ile wynosi twój modyfikator Kondycji. Zdolność odnawia się po ukończeniu Długiego odpoczynku."
  },
  "ulubiona-bron-twardziel": {
    id: "ulubiona-bron-twardziel",
    source: "klasa",
    owner: "twardziel",
    level: 1,
    label: "Ulubiona broń",
    action: "B",
    hotbar: true,
    picks: { scale: "@scale.twardziel.ulubionaBron" },
    text: "Wybierz jeden model broni (np. Peacemaker), której lubisz używać. Od tej pory, jeśli wykonujesz ulubioną bronią akcję Atakowanie, możesz w Akcji Bonusowej wykonać nią jeszcze jeden atak (broń dystansowa musi mieć załadowaną amunicję). Na wyższych poziomach Twardziela, liczba twoich ulubionych broni rośnie zgodnie z kolumną Ulubiona broń w tabeli Zdolności klasowych Twardziela. Możesz zmienić jedną Ulubioną broń na inną w czasie Długiego odpoczynku, poświęcając godzinę na trening."
  },
  "wyjadacz": {
    id: "wyjadacz",
    source: "klasa",
    owner: "twardziel",
    level: 1,
    label: "Wyjadacz",
    action: null,
    text: "Twardziel to zawodowiec, jeśli chodzi o obsługę broni i pancerzy. Wybierz jedną zdolność z poniższej listy, która podkreśli ten fakt. Na 7. poziomie Twardziela możesz wybrać kolejną zdolność z listy, ale każdą z nich wybierasz tylko raz. Obsługa pancerza Kiedy nosisz pancerz, otrzymujesz +2 do TT. Rzeźnik Kiedy atakujesz dowolną bronią, nie trzymając w drugiej ręce innej broni, otrzymujesz modyfikator +3 do obrażeń zadawanych tą bronią. Sokole oko Otrzymujesz modyfikator +3 do Testów Ataku bronią palną, dystansową i rzucaną. Stalowy nadgarstek Kiedy strzelasz z broni palnej krótkiej i pistoletów maszynowych jedną ręką, nie otrzymujesz związanego z tym Utrudnienia do Testów Ataku (tak jakby miały właściwość poręczna). Dodatkowo każda broń palna krótka w twoich rękach zyskuje właściwość lekka."
  },
  "przycelowanie": {
    id: "przycelowanie",
    source: "klasa",
    owner: "twardziel",
    level: 2,
    label: "Przycelowanie",
    action: "B",
    hotbar: true,
    text: "Możesz użyć Akcji Bonusowej, żeby przed atakiem wycelować w konkretną kończynę żywej istoty lub element maszyny Molocha. TT celu zostaje zwiększona, ale jeśli uzyskasz trafienie, nakładasz na cel efekty zgodne z poniższą tabelą."
  },
  "zryw": {
    id: "zryw",
    source: "klasa",
    owner: "twardziel",
    level: 2,
    label: "Zryw",
    action: null,
    text: "000 86KLASY Wspinasz się na szczyt swoich możliwości. W swojej turze możesz wykonać jeszcze jedną Akcję lub Akcję Bonusową. Po użyciu tej zdolności musisz ukończyć Krótki lub Długi odpoczynek, zanim będziesz mógł jej ponownie użyć."
  },
  "twardosc": {
    id: "twardosc",
    source: "klasa",
    owner: "twardziel",
    level: 3,
    label: "Twardość",
    action: null,
    uses: { max: "@abilities.con.mod", period: "lr" },
    resource: { die: "@scale.twardziel.twardosc" },
    hotbar: true,
    text: "Posiadasz wrodzoną „odporność na śmierć” i ogromną ilość szczęścia. Do każdego Rzutu Obronnego (oraz do Rzutu Przeciw Śmierci), którego nie zdasz, możesz dodać wynik z jednej kości Twardości, zgodnie z kolumną Twardość w tabeli Zdolności klasowych Twardziela. Masz tych kości tyle, ile wynosi twój modyfikator Kondycji. Pula kości Twardości odnawia się po ukończeniu Długiego odpoczynku."
  },
  "nie-klekam": {
    id: "nie-klekam",
    source: "klasa",
    owner: "twardziel",
    level: 9,
    label: "Nie klękam",
    action: null,
    text: "Twoje doświadczenie bojowe pozwala ci przetrwać w najtrudniejszych sytuacjach. Masz biegłość we wszystkich Rzutach Obronnych."
  },
  "trzeci-atak": {
    id: "trzeci-atak",
    source: "klasa",
    owner: "twardziel",
    level: 10,
    label: "Trzeci atak",
    action: null,
    passive: true,
    exclusiveGroup: "extraAttack",
    text: "Kiedy wykonujesz w swojej turze akcję Atakowanie, możesz zaatakować trzykrotnie. 000 87"
  },
  "bolesny-atak": {
    id: "bolesny-atak",
    source: "klasa",
    owner: "zlodziej",
    level: 1,
    label: "Bolesny atak",
    action: null,
    passive: true,
    resource: { die: "@scale.zlodziej.bolesnyAtak" },
    oncePerTurn: true,
    text: "Potrafisz wykorzystać każdą słabość przeciwnika, żeby wykonać Bolesny atak. Raz na turę, kiedy atakujesz bronią z Ułatwieniem, używając Zręczności, możesz zadać jednemu celowi dodatkowo 1k6 obrażeń. Nie musisz mieć Ułatwienia w tym ataku, jeśli cel stoi w zasięgu 1,5 metra od twojego sojusznika, który nie jest pod wpływem stanu Obezwładnienie, a ty nie masz Utrudnienia w Teście Ataku. Dodatkowe obrażenia zwiększają się w miarę twojego rozwoju w klasie Złodzieja, zgodnie z kolumną Bolesny atak w tabeli Zdolności klasowych Złodzieja."
  },
  "specjalizacja-zlodziej": {
    id: "specjalizacja-zlodziej",
    source: "klasa",
    owner: "zlodziej",
    level: 1,
    label: "Specjalizacja",
    action: null,
    text: "Wybierasz jedną ze swoich biegłości w umiejętnościach i jedną z biegłości w używaniu narzędzi. W każdym teście wykonywanym z ich użyciem Premia Biegłości liczy się podwójnie. Na 5. poziomie wybierasz kolejną biegłość w umiejętnościach lub w narzędziach i zyskujesz dla niej ten sam efekt."
  },
  "szybkie-nogi": {
    id: "szybkie-nogi",
    source: "klasa",
    owner: "zlodziej",
    level: 1,
    label: "Szybkie nogi",
    action: "B",
    hotbar: true,
    text: "Łączysz swoją zwinność i szybkość, w celu zwiększenia szansy przetrwania na polu walki. Możesz w Akcji Bonusowej wykonać Odstąpienie, Przyspieszenie lub Ukrywanie się."
  },
  "kocie-kosci": {
    id: "kocie-kosci",
    source: "klasa",
    owner: "zlodziej",
    level: 2,
    label: "Kocie kości",
    action: null,
    uses: { max: "@abilities.dex.mod", period: "lr" },
    resource: { die: "@scale.zlodziej.kocieKosci" },
    hotbar: true,
    text: "Kot zawsze spada na cztery łapy tak jak ty. Możesz użyć jednej lub więcej Kocich kości w Reakcji na niekorzystny obrót spraw w poniższych sytuacjach: Ciche łapy [R]. Podczas akcji Ukrywania się, kiedy przeciwnik odkryje twoją obecność, możesz w Reakcji dorzucić je do wyniku swojego testu. Cztery łapy [R]. Kiedy spadasz z dużej wysokości, możesz w Reakcji wykorzystać je, żeby zmniejszyć obrażenia od upadku. Otrzymane obrażenia zmniejszają się o wynik, który wypadł na użytych Kocich kościach. 000 91"
  },
  "ulubiona-bron-zlodziej": {
    id: "ulubiona-bron-zlodziej",
    source: "klasa",
    owner: "zlodziej",
    level: 2,
    label: "Ulubiona broń",
    action: "B",
    hotbar: true,
    text: "Wybierz jeden model broni (np. szoker), w którym masz biegłość. Od tej pory, jeśli wykonujesz tą bronią akcję Atakowanie, możesz w Akcji Bonusowej wykonać nią jeszcze jeden atak (broń dystansowa musi mieć załadowaną amunicję). Możesz zmienić Ulubioną broń na inną w czasie Długiego odpoczynku, poświęcając godzinę na trening."
  },
  "podstepny-atak": {
    id: "podstepny-atak",
    source: "klasa",
    owner: "zlodziej",
    level: 3,
    label: "Podstępny atak",
    action: null,
    text: "Twoje ataki są nie tylko bolesne, ale i upierdliwe. Kiedy zadajesz obrażenia, używając Bolesnego ataku, możesz zamiast dodatkowych obrażeń nałożyć specjalny efekt (wymieniony poniżej) na cel. Kilka takich samych efektów się nie kumuluje. Krwawienie. Żywa istota otrzymuje 1k8 obrażeń na początku swojej tury. Krwawienie ustaje po opatrzeniu rany. Spowolnienie. Szybkość celu spada o 1k6 x 1,5 m do końca twojej następnej tury. Oślepienie. Cel zostaje Oślepiony do końca twojej następnej tury."
  },
  "elektronik": {
    id: "elektronik",
    source: "klasa",
    owner: "zlodziej",
    level: 4,
    label: "Elektronik",
    action: null,
    text: "Elektroniczne zabezpieczenia rozgryzasz równie łatwo, co te tradycyjne. A nawet łatwiej. Zawsze, kiedy mierzysz się z elektronicznym systemem zabezpieczeń, otrzymujesz Ułatwienie do testu narzędzi małego ślusarza lub małego elektronika."
  },
  "szybkosc-kota": {
    id: "szybkosc-kota",
    source: "klasa",
    owner: "zlodziej",
    level: 5,
    label: "Szybkość kota",
    action: null,
    text: "Uczysz się unikać kul i ataków wręcz, jak na przedwojennych filmach akcji. Odskok [R]. Kiedy otrzymujesz obrażenia w wyniku bezpośredniego ataku, możesz w Reakcji zmniejszyć je o połowę (zaokrąglając w dół). Odskok nie działa, kiedy otrzymujesz obrażenia psychiczne. Szybkie łapy. Twoja Szybkość rośnie o 3 metry. Refleks. Możesz dorzucić jedną Kocią kość do testu Inicjatywy."
  },
  "matrix": {
    id: "matrix",
    source: "klasa",
    owner: "zlodziej",
    level: 7,
    label: "Matrix",
    action: null,
    uses: { max: "@prof", period: "lr" },
    hotbar: true,
    text: "Zyskujesz niezwykłą zdolność unikania seryjnego ostrzału, wybuchów granatów czy miotaczy ognia. Kiedy jesteś w polu rażenia ataku obszarowego, który umożliwia ci wykonanie Rzutu Obronnego na Zręczność, żeby zmniejszyć obrażenia o połowę, to po udanym RO, nie otrzymujesz żadnych obrażeń, a w przypadku niepowodzenia — tylko połowę (zaokrągloną w dół). Tej zdolności możesz użyć tyle razy, ile wynosi twoja Premia Biegłości. Matrix odnawia się po odbyciu Długiego odpoczynku."
  },
  "dziewiec-zyc": {
    id: "dziewiec-zyc",
    source: "klasa",
    owner: "zlodziej",
    level: 9,
    label: "Dziewięć żyć",
    action: null,
    text: "Łatwiej ustrzelić nocą czarnego kota niż cię trafić. Zyskujesz nowe sposoby na wykorzystanie Kocich kości."
  },
  "saper": {
    id: "saper",
    source: "klasa",
    owner: "zlodziej",
    level: 11,
    label: "Saper",
    action: null,
    uses: { max: 1, period: "sr" },
    text: "Jesteś jak saper, tyle że ty się nie mylisz, nawet raz. Przy każdym teście umiejętności, w której masz Specjalizację, możesz traktować każdy wynik 9 lub mniej na k20, jak 10. Ta zdolność odnawia się po ukończeniu Krótkiego lub Długiego odpoczynku."
  },
  "moj-biom": {
    id: "moj-biom",
    source: "klasa",
    owner: "zwiadowca",
    level: 1,
    label: "Mój biom",
    action: null,
    passive: true,
    resource: { value: "@scale.zwiadowca.mojBiom" },
    text: "Twoje doświadczenie i naturalny talent sprawiają, że umiesz przetrwać tam, gdzie innych zjadają mrokoszczury. Wybierz dwa ulubione biomy z listy: Bagna, Góry, Las, Miasto, Neodżungla, Podziemia, Preria, Pustynia, Ruiny, Tereny Maszyn. W Testach Inteligencji i Mądrości związanych z tymi biomami masz Ułatwienie. Podróżując przez te specyficzne obszary, otrzymujesz dodatkowe korzyści: • Kiedy poruszacie się pieszo, trudny teren nie spowalnia cię, ani twojej drużyny, • Nikt i nic nie jest w stanie cię zaskoczyć. • Kiedy podróżujesz samotnie, możesz się skradać w tempie normalnego ruchu. • Jeśli poświęcisz 8 godzin na szukanie wody i pożywienia, jesteś w stanie wyżywić cztery osoby przez jedną dobę. • Tropiąc istoty, poznajesz ich dokładną liczebność, rozmiar i wiesz, kiedy zostawiły ślady. Wraz z awansem na kolejne poziomy Zwiadowcy, następne rodzaje biomów stają się dla ciebie swojskie i znane. Ich liczba podana jest w kolumnie Mój biom w tabeli Zdolności klasowych Zwiadowcy. 000 96KLASY"
  },
  "moj-wrog": {
    id: "moj-wrog",
    source: "klasa",
    owner: "zwiadowca",
    level: 1,
    label: "Mój wróg",
    action: null,
    passive: true,
    resource: { value: "@scale.zwiadowca.mojWrog" },
    text: "Masz doświadczenie w zabijaniu określonego typu przeciwników. Wybierasz, czy specjalizujesz się w tropieniu i zabijaniu Ludzi, Maszyn, Mutantów, Potworów czy Zwierząt. Masz Ułatwienie w Testach Mądrości (Survival), kiedy tropisz swoich wrogów i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg w tabeli Zdolności klasowych Zwiadowcy. PRZYKŁAD: Pierwszopoziomowy Zwiadowca, którego wrogiem są Potwory, dodaje +1 do Testów Ataków wykonywanych przeciwko wszelkim potworom oraz każdy jego atak zadaje im dodatkowo 1k6 obrażeń. Na 5. i 9. poziomie, możesz wybrać kolejny typ wroga."
  },
  "ulubiona-bron-zwiadowca": {
    id: "ulubiona-bron-zwiadowca",
    source: "klasa",
    owner: "zwiadowca",
    level: 1,
    label: "Ulubiona broń",
    action: "B",
    hotbar: true,
    text: "Wybierz jeden konkretny model broni, której lubisz używać (np. nóż taktyczny lub pistolet G17). Od tej pory, jeśli wykonujesz Ulubioną bronią akcję Atakowanie, możesz w Akcji Bonusowej wykonać nią jeszcze jeden atak (broń dystansowa musi mieć załadowaną amunicję). Możesz zmienić ulubioną broń na inną w czasie Długiego odpoczynku, poświęcając godzinę na trening. Na 9. poziomie możesz mieć jednocześnie dwie ulubione bronie."
  },
  "klusownik": {
    id: "klusownik",
    source: "klasa",
    owner: "zwiadowca",
    level: 2,
    label: "Kłusownik",
    action: null,
    text: "Masz doświadczenie w zakładaniu pułapek. Wystarczy chwila, żeby z tego, co masz pod ręką, zmontować coś przydatnego. Jeśli masz zestaw narzędzi małego kłusownika, poświęcisz minutę i wykonasz Test Survivalu lub narzędzi małego kłusownika, możesz zbudować pułapkę. Skonsultuj jej szczegóły i działanie z MG. ST zauważenia pułapki, wyzwolenia się z niej lub uniknięcia części obrażeń, to 8 plus twój modyfikator Mądrości i Premia Biegłości. ST zakładania i działanie przykładowych pułapek podajemy w tabeli poniżej."
  },
  "wyjadacz-zwiadowca": {
    id: "wyjadacz-zwiadowca",
    source: "klasa",
    owner: "zwiadowca",
    level: 2,
    label: "Wyjadacz",
    action: null,
    text: "Zwiadowca to prawdziwy zawodowiec. Wybierz jedną z poniższych zdolności, która podkreśli ten fakt. Na 11. poziomie możesz wybrać kolejną zdolność z tej listy, ale każdą z nich możesz wybrać tylko raz. Jeździec Kiedy dosiadasz wierzchowca, nie musisz używać rąk, żeby nim kierować. Nie otrzymujesz Utrudnienia do Testów Ataków dystansowych związanego z niestabilnym podłożem, kiedy na nim jedziesz. Wsiadanie i zsiadanie z wierzchowca kosztuje cię tylko 1,5 metra ruchu. Trudność Trafienia twojego wierzchowca zwiększa się o wartość twojej Premii Biegłości."
  },
  "cichy-krok": {
    id: "cichy-krok",
    source: "klasa",
    owner: "zwiadowca",
    level: 3,
    label: "Cichy krok",
    action: null,
    text: "Nie otrzymujesz Utrudnienia do testów Skradania się za noszenie pancerza. Otrzymujesz Ułatwienie w Testach Ukrywania się, jeśli nie nosisz ciężkiego pancerza. Trudny teren nie spowalnia twojego ruchu."
  },
  "sportowiec": {
    id: "sportowiec",
    source: "klasa",
    owner: "zwiadowca",
    level: 7,
    label: "Sportowiec",
    action: null,
    text: "Twoja Szybkość rośnie o 3 metry. Zyskujesz również Ułatwienie w testach Atletyki, kiedy się wspinasz, pływasz lub skaczesz."
  },
  "wyczulone-zmysly": {
    id: "wyczulone-zmysly",
    source: "klasa",
    owner: "zwiadowca",
    level: 7,
    label: "Wyczulone zmysły",
    action: null,
    text: "Masz stałe Ułatwienie do testów Percepcji, więc twoja Pasywna Percepcja rośnie o 5."
  },
  "pogon": {
    id: "pogon",
    source: "klasa",
    owner: "zwiadowca",
    level: 11,
    label: "Pogoń",
    action: null,
    text: "Rzuty Obronne, w których porażka oznacza otrzymanie stanu Wyczerpanie, wykonujesz z Ułatwieniem."
  },
  "dwoch-na-jednego": {
    id: "dwoch-na-jednego",
    source: "profesja",
    owner: "ganger",
    klasa: "brutal",
    level: null,
    label: "Dwóch na jednego",
    action: null,
    text: "Uwielbiasz kopać leżącego frajera wspólnie z kumplami. Jeśli zaatakujesz wręcz istotę, która została zaatakowana w ten sam sposób przez twojego sojusznika, otrzymujesz +2 do Testów Ataku wręcz przeciwko niej, do końca twojej tury."
  },
  "ja-i-moj-gang": {
    id: "ja-i-moj-gang",
    source: "profesja",
    owner: "ganger",
    klasa: "brutal",
    level: null,
    label: "Ja i mój gang!",
    action: null,
    requiresState: "neuro-berserk",
    text: "Kiedy jesteś w Berserku, twoi towarzysze stają się twoim gangiem, walczącym niczym wataha zmutowanych wilków. Jeśli sojusznicy stoją w promieniu 3 metrów od ciebie, otrzymują Ułatwienie w Testach Ataku przeciw wrogim istotom, które widzisz. Zawsze prowadzisz swój gang do krwawego zwycięstwa!"
  },
  "jeden-z-nich": {
    id: "jeden-z-nich",
    source: "profesja",
    owner: "ganger",
    klasa: "brutal",
    level: null,
    label: "Jeden z nich",
    action: null,
    text: "Tatuujesz sobie symbol przynależności do siejącego grozę gangu. Byle kto ci nie podskoczy, a reszta nie ma odwagi się z tobą sprzeczać. Postrach okolicy. Otrzymujesz biegłość w umiejętności Zastraszanie. Jeśli już ją masz, otrzymujesz zamiast tego Specjalizację. Sami swoi. Bandziory traktują cię jak swojego. Masz Ułatwienie w testach opartych na Charyzmie, kiedy gadasz z typami twojego pokroju."
  },
  "odwazny-czy-glupi": {
    id: "odwazny-czy-glupi",
    source: "profesja",
    owner: "ganger",
    klasa: "brutal",
    level: null,
    label: "Odważny czy głupi",
    action: null,
    text: "Nie ma na tym świecie istot, które byłyby w stanie ci zagrozić. Głupi. Zyskujesz niewrażliwość na stan Przerażenie. Odważny. Wszyscy sojusznicy w odległości 9 metrów od ciebie, otrzymują premię +1k4 do RO przeciwko Przerażeniu. GLADIATOR Wysportowana blondynka o stalowym spojrzeniu, mocnym makijażu i z pieszczochem na szyi, stoi na środku areny. Jej topór ocieka krwią zmutowanych psów, które na nią wypuszczono w ramach rozgrzewki. Krata się unosi i na arenę wjeżdża przeciwnik, z piłami tarczowymi zamiast rąk. Widownia wyje, łaknąc krwi."
  },
  "nie-do-zdarcia": {
    id: "nie-do-zdarcia",
    source: "profesja",
    owner: "gladiator",
    klasa: "brutal",
    level: null,
    label: "Nie do zdarcia",
    action: null,
    text: "Każde trafienie, które zadałoby ci obrażenia krytyczne, zadaje zamiast tego normalne obrażenia. To nic, że obrywasz siekierą w głowę lub kulką prosto w serce. To wcale nie było w głowę tylko w ucho, a serce masz po drugiej stronie!"
  },
  "lyzeczka": {
    id: "lyzeczka",
    source: "profesja",
    owner: "gladiator",
    klasa: "brutal",
    level: null,
    label: "Łyżeczka",
    action: null,
    text: "Długopis, felga, wąż ogrodowy, hydrant, kula bilardowa czy mała zardzewiała łyżeczka, stanowi broń, w której masz biegłość. Możesz tym przedmiotem walczyć wręcz lub nim rzucać na dystans do 6 metrów. Maksymalna waga tej tzw. „łyżeczki” to wartość twojej Siły. Kość i typ obrażeń zależne są od wagi i rodzaju przedmiotu (ustal to z MG). Jeśli w Teście ataku „łyżeczką” wypadnie naturalna 1, rozpada się ona na dwie równe części. 000 69"
  },
  "zew-areny": {
    id: "zew-areny",
    source: "profesja",
    owner: "gladiator",
    klasa: "brutal",
    level: null,
    label: "Zew areny",
    action: null,
    requiresState: "neuro-berserk",
    text: "Podczas walki słyszysz doping widzów, nawet jeśli ich wokół ciebie nie ma. Kiedy jesteś w Berserku, zyskujesz: Doping. Otrzymujesz niewrażliwość na stan Przerażenie. Praca nóg. Przeciwnicy mają Utrudnienie w testach ataków okazyjnych przeciw tobie. Skok Gladiatora. Maksymalna wysokość i odległość twojego skoku ulega podwojeniu. Jeśli twój skok zakończy się na polu istoty nie większej od ciebie o więcej niż jeden rozmiar, musi ona zdać RO na Siłę, inaczej otrzyma stan Powalenie oraz 1k6 obrażeń obuchowych za każde 3 metry długości lub wysokości twojego skoku. ST Rzutu Obronnego to 8 plus twój modyfikator Siły plus Premia Biegłości."
  },
  "zawolajcie-kolegow": {
    id: "zawolajcie-kolegow",
    source: "profesja",
    owner: "gladiator",
    klasa: "brutal",
    level: null,
    label: "Zawołajcie kolegów",
    action: null,
    text: "Jeśli w zasięgu 1,5 metra od ciebie znajduje się co najmniej dwóch przeciwników, otrzymujesz Ułatwienie do Testów Ataków wręcz. NAJEMNIK Umięśniony brunet odziany w skóry i łańcuchy, dźwigający minimi jak zabawkę, z radością na poparzonej twarzy biegnie przez skąpane w ogniu pole bitwy. Zza wzgórza wyłania się juggernaut, któremu ten gość wpakuje pięćdziesiąt kilo ołowiu prosto w jego niebieski ryj."
  },
  "maszyna-do-zabijania": {
    id: "maszyna-do-zabijania",
    source: "profesja",
    owner: "najemnik",
    klasa: "brutal",
    level: null,
    label: "Maszyna do zabijania",
    action: null,
    oncePerTurn: true,
    requiresState: "neuro-berserk",
    text: "Kiedy jesteś w Berserku, zyskujesz: Promocja [B]. Możesz wykonać dodatkowo jeden Atak wręcz w Akcji Bonusowej. Zwód. Raz w rundzie możesz wykonać jeden Atak wręcz oparty na Sile z Ułatwieniem."
  },
  "reputacja": {
    id: "reputacja",
    source: "profesja",
    owner: "najemnik",
    klasa: "brutal",
    level: null,
    label: "Reputacja",
    action: null,
    text: "Ty nie nawalasz. Zawsze kończysz podjęte zlecenie. Twoja reputacja podąża za tobą krok w krok. Kiedy negocjujesz stawkę, masz Ułatwienie w testach Wpływania. A kiedy zadanie zostanie wykonane, otrzymujesz premię 1k4 x 10% wynegocjowanej stawki."
  },
  "skuteczny-cios": {
    id: "skuteczny-cios",
    source: "profesja",
    owner: "najemnik",
    klasa: "brutal",
    level: null,
    label: "Skuteczny cios",
    action: null,
    hotbar: true,
    text: "Twoje Wściekłe ciosy stają się skuteczniejsze, ale kosztem siły uderzenia. Możesz zużyć jedną kostkę Wściekłego ciosu, żeby zyskać jedną z poniższych przewag w walce. Potężny cios! Kiedy trafisz istotę atakiem wręcz, możesz w jego ramach wykonać Odepchnięcie. Sprytny cios! Kiedy trafisz istotę atakiem wręcz, możesz w jego ramach wykonać Wytrącenie. Zamaszysty cios! Jeśli w zasięgu 1,5 m od trafionej przez ciebie istoty, znajduje się druga istota, znajdująca się w zasięgu twojego ataku wręcz, możesz wykonać przeciw niej dodatkowo jeden atak wręcz. 000 70 WAGA PRZEDMIOTU OBRAŻENIA WŁADANIE do 5 kg 1k6 Jednoręczne 6 - 11 kg 2k6 Oburęczne 12 -17 kg 3k6 Oburęczne 18 - 20 kg 4k6 OburęczneKLASY CWANIAK Niezależnie od tego, czy cwaniak działa z egoistycznych pobudek, czy robi coś dla dobra ogółu, ma nieprawdopodobny wpływ na ludzi i swoje cwaniackie szczęście. Swój dar może wykorzystać do wyciągnięcia ostatniej kromki od bezdomnego, przejęcia władzy w okolicy czy poprowadzenia ludzi do beznadziejnej walki. Cwaniak to urodzony lider, który wykorzysta każdego, żeby dotrzeć na szczyt. 000 71"
  },
  "kakofonia": {
    id: "kakofonia",
    source: "profesja",
    owner: "gwiazda",
    klasa: "cwaniak",
    level: null,
    label: "Kakofonia",
    action: "A",
    hotbar: true,
    text: "W swojej Akcji możesz wydobyć ze swojego instrumentu lub z gardła zestaw głośnych nieharmonicznych dźwięków, który może zdezorientować twoich wrogów. Każda słysząca istota w promieniu 9 metrów wokół ciebie, wykonuje RO na Kondycję o ST równym 8 plus twój modyfikator Charyzmy i twoja Premia Biegłości. Porażka w Rzucie Obronnym oznacza Obezwładnienie istoty do początku twojej następnej tury. Twoi sojusznicy mają Ułatwienie w tym RO."
  },
  "lets-rock": {
    id: "lets-rock",
    source: "profesja",
    owner: "gwiazda",
    klasa: "cwaniak",
    level: null,
    label: "Let’s rock!",
    action: "A",
    hotbar: true,
    text: "Potrafisz swoją muzyką lub śpiewem zagrzewać towarzyszy do boju. W swojej akcji wykonujesz „bojowy kawałek”, który pomaga się skupić i dodaje sił. Wszyscy sojusznicy, którzy cię słyszą i są w zasięgu 27 metrów od ciebie, otrzymują premię do Testów Ataku lub Rzutów Obronnych, zależną od wyniku testu umiejętności Występy lub instrumentu muzycznego. Premia działa do początku twojej następnej tury. Zdolność Let’s rock możesz powtarzać w nieskończoność, za każdym razem ponownie testując umiejętność Występy. Jeśli w czasie występu otrzymasz stan Nieprzytomność, Obezwładnienie lub Ogłuchnięcie, efekt natychmiast się kończy."
  },
  "stylowa": {
    id: "stylowa",
    source: "profesja",
    owner: "gwiazda",
    klasa: "cwaniak",
    level: null,
    label: "Stylówa",
    action: null,
    text: "Wygląd jest twoją wizytówką, ma robić wrażenie i podkreślać wyjątkowość twojego charakteru. Ubierasz się w drogie ciuchy, nosisz na widoku cenne gadżety i drogą biżuterię. Te błyskotki mogą przyciągać złodziei, ale kij im w oko, bo to robi ci imidż na dzielni. Każde 50 gambli towarów luksusowych, które nosisz na sobie, zapewnia ci premię +1 do testów Wpływania."
  },
  "za-garsc-gambli": {
    id: "za-garsc-gambli",
    source: "profesja",
    owner: "gwiazda",
    klasa: "cwaniak",
    level: null,
    label: "Za garść gambli",
    action: null,
    text: "Każda dziura i miasteczko w Podzielonych Stanach potrzebuje muzyki. Każdy klub i śmierdzący bar bez okien, przyjmie twoje usługi zapewniające rozrywkę stałej klienteli. Zawsze dostaniesz dach nad głową i żarcie, a może i będzie za co się napić. Raz dziennie dajesz czterogodzinny koncert w lokalnej knajpie lub klubie, a od twoich umiejętności zależy, ile zarobisz (patrz tabela poniżej). Po skończeniu koncertu otrzymujesz jeden poziom Wyczerpania. PRZYKŁAD: Siadasz przy ruchliwej ulicy, wyciągasz saksofon i po czterech godzinach koncertu wykonujesz test Zręczności (Saksofon). Twój wynik to 15, więc do czapki wpadła ci równowartość ok. 7 gambli. Gdybyś dał koncert w drogim klubie, zgarnąłbyś 6 razy tyle. 000 74 WYNIK TESTU PREMIA DO TESTÓW SOJUSZNIKÓW 5 – 9 +1 10 – 14 +2 15 – 19 +3 20 – 24 +4 25 + +5 MIEJSCE KONCERTU MNOŻNIK WYNIKU TESTU CHARYZMA (WYSTĘPY) LUB TESTU INSTRUMENTU Ulica x 0,5 gb Tania knajpa x 1 gb Dobra knajpa x 2 gb Drogi klub x 3 gbKLASY KAZNODZIEJA NOWEJ ERY Dziewczyna w czerwieni przynosi nadzieję do upadającej wioski. Bogini zapewnia ochronę przed mutacją i Molochem. Pani obdarzy wiernych plonami, jeśli najstarszy członek społeczności złoży się w dobrowolnej ofierze, a swoje dobra odda na rzecz świątyni. Dziewczyna w czerwieni na objuczonym osiołku zmierza do kolejnej osady, pozostawiając za sobą dopalający się stos..."
  },
  "amen": {
    id: "amen",
    source: "profesja",
    owner: "kaznodzieja-nowej-ery",
    klasa: "cwaniak",
    level: null,
    label: "Amen",
    action: null,
    uses: { max: "@abilities.cha.mod", period: "lr" },
    hotbar: true,
    text: "Kiedy odniesiesz porażkę w Teście Cechy, Ataku lub Rzucie Obronnym, wypowiadasz słowo AMEN i dorzucasz do wyniku testu 1k6. Musisz zaakceptować nowy wynik. Tej zdolności możesz użyć tyle razy, ile wynosi twój modyfikator Charyzmy. Zdolność odnawia się po Długim odpoczynku."
  },
  "laska-boza": {
    id: "laska-boza",
    source: "profesja",
    owner: "kaznodzieja-nowej-ery",
    klasa: "cwaniak",
    level: null,
    label: "Łaska boża",
    action: "B",
    hotbar: true,
    text: "W Akcji Bonusowej możesz natchnąć swoich sojuszników w promieniu 18 metrów łaską bożą. Sojusznicy muszą słyszeć twój głos. Obdarzony Łaską bożą otrzymuje +1k4 do Testów Ataków i Rzutów Obronnych, do początku twojej następnej tury. Możesz obdarzyć tą premią tylu sojuszników, ile masz poziomów Cwaniaka."
  },
  "moj-bog-kule-nosi": {
    id: "moj-bog-kule-nosi",
    source: "profesja",
    owner: "kaznodzieja-nowej-ery",
    klasa: "cwaniak",
    level: null,
    label: "Mój bóg kule nosi",
    action: null,
    oncePerTurn: true,
    text: "Twoja broń prowadzona jest ręką bóstwa, by skuteczniej wykańczać grzeszników. Raz na turę, kiedy zadasz obrażenia w Teście Ataku bronią palną, możesz dodać 1k10 obrażeń."
  },
  "tarcza-wiary": {
    id: "tarcza-wiary",
    source: "profesja",
    owner: "kaznodzieja-nowej-ery",
    klasa: "cwaniak",
    level: null,
    label: "Tarcza wiary",
    action: null,
    passive: true,
    exclusiveGroup: "unarmoredAc",
    text: "Jeśli nie nosisz pancerza, możesz dodać modyfikator Charyzmy do swojej Trudności Trafienia. Tej zdolności nie można łączyć z innymi podobnymi (np. Goła Klata). MAFIOZO Masz idealnie skrojony garnitur, mokasyny ze skóry aligatora i rolexa na ręce. Odliczasz sekundy do wdrożenia planu. Za 8 sekund eksplodują ładunki. Za 16 sekund do hangaru wkroczy ekipa. Za 64 sekundy wchodzisz ty i składasz Grubemu propozycję nie do odrzucenia."
  },
  "bezlitosny-przywodca": {
    id: "bezlitosny-przywodca",
    source: "profesja",
    owner: "mafiozo",
    klasa: "cwaniak",
    level: null,
    label: "Bezlitosny przywódca",
    action: null,
    text: "Twoja mafia to twoja rodzina. Zabijesz każdego, kto choćby krzywo spojrzy na twojego brata, siostrę, matkę czy psa. Wszyscy, którzy noszą wytatuowany symbol twojej mafijnej rodziny, są pod twoją ochroną i twoim skutecznym przywództwem. Vendetta: Otrzymujesz Ułatwienie w Teście Ataku przeciw istocie, która zadała obrażenia członkowi twojej mafii w przeciągu ostatniej rundy. Szef każe [B]: W Akcji Bonusowej możesz wydać rozkaz ataku członkowi swojej grupy. Ten w Reakcji, może zaatakować wskazaną przez ciebie istotę, znajdującą się w zasięgu jego ataku."
  },
  "renoma": {
    id: "renoma",
    source: "profesja",
    owner: "mafiozo",
    klasa: "cwaniak",
    level: null,
    label: "Renoma",
    action: null,
    text: "Nie można strzelić człowiekowi w głowę, mając ubłocone buty. Chciałbyś, żeby ktoś cię potrącił nieumytym pontiakiem? Trzeba szanować klientów i wrogów. Trudno nie uwierzyć człowiekowi takiemu jak ty. Człowiekowi, który ma swoją renomę i wie, że ubiór świadczy o szacunku. Każde 50 gambli towarów luksusowych, które nosisz na sobie, daje ci premię +1 do testów Wpływania."
  },
  "moja-prawa-reka": {
    id: "moja-prawa-reka",
    source: "profesja",
    owner: "mafiozo",
    klasa: "cwaniak",
    level: null,
    label: "Moja prawa ręka",
    action: null,
    companion: true,
    text: "Zaczynasz budować własną mafię. Werbujesz obiecującego człowieka, który wykonuje twoje polecenia aż po grób. Skąd go wziąć? Wyrzutka, który potrzebuje szefa, znajdziesz w każdej dziurze i ruinie. Wystarczy obiecać mu lepsze życie, dać spluwę do ręki, wydziarać tatuaż i wcielić do twojej mafijnej rodziny. Będzie robić, co każesz. Nosić plecak, pociągać za spust i nadstawiać tyłka. Ty zapewniasz mu wikt i dziesiątą część swojej doli. Jeśli nie masz odpowiedniego kandydata lub ostatni zginął, możesz poświęcić 24 godziny na szukanie nowego w miejscowości, w której przebywasz. Prawa ręka działa natychmiast po twojej turze, ale masz pełną kontrolę nad akcjami tej postaci. 000 75"
  },
  "smakuje-jak-arszenik": {
    id: "smakuje-jak-arszenik",
    source: "profesja",
    owner: "chemik",
    klasa: "spec",
    level: null,
    label: "Smakuje jak arszenik",
    action: null,
    text: "Lata babrania się w toksycznych świństwach zrobiły swoje. Zyskujesz odporność na obrażenia od kwasu i trucizny. Masz też Ułatwienie w Rzutach Obronnych na Kondycję, przeciw działaniu kwasów, trucizn i skażenia radioaktywnego."
  },
  "pirotechnika": {
    id: "pirotechnika",
    source: "profesja",
    owner: "chemik",
    klasa: "spec",
    level: null,
    label: "Pirotechnika",
    action: null,
    text: "Zupełnie ci już odwaliło i bierzesz się za robienie BUM. Dynamit i granaty, czego chcieć więcej? Potrzebne ci tylko narzędzia małego chemika, małego rusznikarza, surowce i czas. Otrzymujesz wylistowane obok schematy pirotechniczne. SUROWCE CH - Chemia CE - Części elektroniczne CZ - Części zamienne MK - Materiały konstrukcyjne MO - Materiały organiczne 000 80 SCHEMATY PIROTECHNICZNE NAZWA ST PRODUKCJA SUROWCE Dynamit (laska) 15 20 godzin 19 CH, 1 MK Granat dymny 15 20 godzin 15 CH, 4 CZ, 1 MK Granat gazowy 20 30 godzin 25 CH, 4 CZ, 1 MK Granat hukowy 20 30 godzin 25 CH, 4 CZ, 1 MK Granat improwizowany 10 10 godzin 9 CH, 1 MK/MO Granat odłamkowy 20 35 godzin 30 CH, 4 CZ, 1 MK Granat zapalający 20 35 godzin 30 CH, 4 CZ, 1 MK Granat 40 mm 15 15 godzin 10 CH, 3 CZ, 2 MK IED 15 20 godzin 5 CE, 10 CH, 4 CZ, 1 MK Koktajl Mołotowa 5 1 minuta 4 CH, 1 MK Mina przeciwpiechotna 25 40 godzin 30 CH, 5 CZ, 5 MK Mina przeciwpancerna 25 60 godzin 5 CE, 40 CH, 5 CZ, 10 MK Plastik C4 (100 g) 25 50 godzin 50 CH Pocisk 60 mm 20 30 godzin 25 CH, 1 CZ, 4 MK Proch czarny (20 g) 10 5 godzin 2 CH, 3 MK/MO Proch strzelniczy (20 g) 15 10 godzin 5 CH, 5 MK/MOKLASY"
  },
  "rusznikarstwo": {
    id: "rusznikarstwo",
    source: "profesja",
    owner: "chemik",
    klasa: "spec",
    level: null,
    label: "Rusznikarstwo",
    action: null,
    text: "Nie ma nic lepszego niż zapach prochu o poranku. Broń palna to twoja największa miłość. Potrafisz ją wytwarzać i ulepszać. Potrzebne ci tylko narzędzia małego kowala i małego rusznikarza, surowce i czas. Otrzymujesz wylistowane poniżej schematy rusznikarskie. MEDYK Niska, szarowłosa dziewczyna w poplamionym krwią fartuchu biega po polu bitwy, taszcząc ciężką torbę. Wśród eksplozji i świstu kul, szuka umierających żołnierzy, którzy nie stracili żadnej kończyny. Znajduje jednego i aplikuje mu mieszankę painkillerów, adrenaliny i narkotyków. Żołnierz wstaje, podnosi karabin i biegnie na spotkanie z Molochem."
  },
  "doktor-brain": {
    id: "doktor-brain",
    source: "profesja",
    owner: "medyk",
    klasa: "spec",
    level: null,
    label: "Doktor Brain",
    action: null,
    text: "Chcesz być jajogłowym mutantem geniuszem? Proszę bardzo. Znajdujesz martwego mutanta i tworzysz serum z jego rdzenia mózgowego, które sobie aplikujesz. Wartość twojej Cechy Inteligencja rośnie na stałe o 4 (do maksymalnie 20). Twój organizm płaci jednak za to wielką cenę. Zmniejsz na stałe swoją Kondycję lub Zręczność o 2."
  },
  "krwawy-aniol": {
    id: "krwawy-aniol",
    source: "profesja",
    owner: "medyk",
    klasa: "spec",
    level: null,
    label: "Krwawy anioł",
    action: null,
    text: "Potrafisz używać leków skuteczniej niż ktokolwiek inny. Wiesz, gdzie wbić strzykawkę, żeby pacjent szybko stanął na nogi i zyskał więcej energii do walki. Od tej pory, kiedy używasz zestawu małego medyka, przywracasz więcej Punktów Wytrzymałości. Zamiast kostki k4 używasz na 3. poz. - k6, na 6. poz. - k8, na 9. poz. - k10, a na 12. poz. - k12."
  },
  "lapiduch": {
    id: "lapiduch",
    source: "profesja",
    owner: "medyk",
    klasa: "spec",
    level: null,
    label: "Łapiduch",
    action: null,
    text: "Kiedy inni tracą nadzieję, ty wciąż walczysz o życie pacjenta. Podejmujesz reanimację i liczysz na cud, uciskając serce i robiąc usta-usta. Reanimacja trwa 1 minutę, a jej sukces zależy od twoich umiejętności i czasu, który upłynął od zatrzymania akcji serca. Udana akcja reanimacji przywraca pacjentowi funkcje życiowe, lecz jego stan wciąż nie jest stabilny. Ta zdolność nie działa na pacjenta, który otrzymał Olbrzymie obrażenia (patrz rozdział Walka str. XXX). 000 81"
  },
  "farmacja": {
    id: "farmacja",
    source: "profesja",
    owner: "medyk",
    klasa: "spec",
    level: null,
    label: "Farmacja",
    action: null,
    text: "Podobno medyk to nie jest maszynka do skręcania leków z piasku. Ale ty znasz się na chemii i farmakologii, więc wiesz, że lekarstwa można ukręcić ze wszystkiego innego. Zyskujesz biegłość w narzędziach małego aptekarza. Potrafisz produkować leki i substancje leczące, używając składników chemicznych, jak i organicznych. Potrzebne ci narzędzia małego chemika, małego aptekarza, surowce i czas. Otrzymujesz wylistowane poniżej schematy farmaceutyczne. MONTER Doświadczona hakerka w hawajskiej koszuli i w różowych okularach na nosie, wstukuje linie kodu maszynowego w rdzeń pamięci uszkodzonego Łowcy. Wprowadza kroplę swojej krwi do pokładowego analizatora DNA i próbuje uruchomić autorski tryb defensywny. Do drzwi jej skromnej klitki dobija się zdenerwowany klient, któremu sprzedała felerny silnik. Diody Łowcy zaczynają mrugać czerwonym blaskiem."
  },
  "mechanika": {
    id: "mechanika",
    source: "profesja",
    owner: "monter",
    klasa: "spec",
    level: null,
    label: "Mechanika",
    action: null,
    text: "Smar zastępuje ci krem do rąk, benzyna pachnie jak najlepsze perfumy, a dźwięk dobrze pracującego silnika jest milszy niż miłosne szepty. Jesteś w stanie zbudować swój własny pojazd i zabrać go na rajd! Otrzymujesz biegłość w narzędziach małego mechanika. Potrafisz naprawiać, ulepszać i budować pojazdy, a nawet konstruować mechaniczne pancerze. Potrzebne ci narzędzia małego mechanika i małego kowala, surowce i czas. Otrzymujesz wylistowane poniżej schematy mechaniczne. 000 82 SCHEMATY FARMACEUTYCZNE NAZWA ST PRODUKCJA SUROWCE Antybiotyk (10 dawek) 10 20 godzin 20 CH/MO Alkohol tani (1 l) 10 3 godziny 3 CH/MO AR 23 (1 szt) 25 35 godzin 33 CH, 1 CZ, 1 MK AR-35 BETA (1 szt) 25 50 godzin 49 CH, 1 CZ,1 MK Deadline (1 szt) 20 25 godzin 25 CH/MO, 1 MK Detoks (5 fiolek) 10 20 godzin 20 CH/MO Medpak (1 szt) 15 13 godzin 11 CH/MO, 1 CZ, 1 MK Nitrogliceryna (20 g) 15 10 godzin 10 CH/MO Painkiller (10 tabletek) 10 10 godzin 10 CH/ MO Pocisk - strzykawka (1 szt) 10 3 godziny 2 CZ, 1 MK Proch czarny (20 g) 10 5 godzin 2 CH, 3 MK/MO Proch strzelniczy (20 g) 15 10 godzin 5 CH, 5 MK/MO RadOff (1 szt) 15 15 godzin 14 CH/MO, 1 MK Środki dezynfekujące (1 l) 10 5 godzin 5 CH/MO Środek usypiający (1 fiol.) 10 10 godzin 10 CH/MO Tornado (1 działka) 25 50 godzin 50 CH/MO Trybiotyl (1 porcja) 15 15 godzin 15 CH/MO Trucizna (1 fiolka) 10 10 godzin 10 CH/MO Uzupełnienie zestawu małego medyka (1 użycie) 10 5 godzin 5 CH/MO, 1 MK WD-TABS (10 tabletek) 10 10 godzin 10 CH/MO Zamiennik dowolnego leku (5 dawek) 20 10 godzin 10 CH/MO SCHEMATY MECHANICZNE NAZWA ST PRODUKCJA SUROWCE Buggy 20 500 godzin 50 CZ, 200 MK Deskorolka 5 20 godzin 5 CZ, 5 MK Motorower 20 200 godzin 50 CZ, 50 MK Motocykl 25 300 godzin 50 CZ, 100 MK Osobówka (składak) 20 1000 godzin 100 CZ, 400 MK Paralotnia 25 100 godzin 20 CZ, 30 MK Pancerz wspomagany 30 1000 godzin 100 CE, 100 CZ, 300 MK Rower 10 40 godzin 10 CZ, 10 MK Traktor (mały) 20 1000 godzin 100 CZ, 400 MK Wózek typu dwukółka 10 20 godzin 1 CZ, 19 MKKLASY"
  },
  "hakerstwo": {
    id: "hakerstwo",
    source: "profesja",
    owner: "monter",
    klasa: "spec",
    level: null,
    label: "Hakerstwo",
    action: null,
    text: "Czerwone oczy, blada cera, skrzywione plecy i słownictwo, którego nikt nie rozumie. Już raz pomylili cię z mutantem i drogo za to zapłacili. W Posterunku byłbyś szychą, ale nie przyjmujesz rozkazów od głupszych od siebie. Otrzymujesz biegłość w narzędziach małego hakera. Potrafisz produkować sprzęt komputerowy i drony, ale potrzebujesz do tego narzędzi małego hakera, małego elektronika, surowców i czasu. Otrzymujesz wylistowane poniżej schematy hakerskie. Drony. Jako Haker możesz zbudować własnego drona, który działa według poniższych zasad. Kierowanie. Aby móc kierować dronem, potrzebny jest kontroler zdalnego sterowania. W Akcji Bonusowej możesz wydawać proste polecenia, tj., broń się, idź tam, podążaj za mną, podnieś to, upuść to, zostań. Dron nie atakuje samodzielnie. W Akcji możesz przejąć pełne sterowanie i używając zamontowanych kamer, wykorzystać wszystkie jego zdolności. Naprawianie. Poświęcając godzinę pracy, możesz przy pomocy odpowiednich narzędzi przywrócić swojej maszynie PW, w ilości 2k6 + twój modyfikator Inteligencji. Zasilanie. Akumulator 24V wystarcza na 1 godzinę pracy średniego drona i 4 godziny pracy małego. Instalacja agregatu prądotwórczego pozwala na dodatkowe zasilanie spalinowe (0,5 l paliwa/1 h). SIŁ ZRC KON INT MDR CHA 14 (+2) 14 (+2) 10 (+0) – – – DRON KROCZĄCY Średnia maszyna TT: 10 plus mod. Inteligencji i Premia Biegłości twórcy PW: 10 x modyfikator Inteligencji twórcy; PRÓG OBRAŻEŃ 5 PRÓG AWARII 15. SZYBKOŚĆ: 9 m NIEWRAŻLIWOŚĆ NA OBRAŻENIA psychiczne, od trucizny NIEWRAŻLIWOŚĆ NA STANY Przerażenie, Zatrucie, Zauroczenie ZMYSŁY Noktowizja 18 m ZDOLNOŚCI Modyfikacje. Dron może mieć zainstalowane liczne urządzenia tj. broń, kamery, oświetlenie czy skomplikowane urządzenia elektroniczne. Dokładne modyfikacje oraz ich koszt, należy ustalić z MG. Udźwig. Użytkowy: 70 kg. Maksymalny: 140 kg. AKCJE Atak. Dron może wykonać w swojej akcji jeden atak, którego zasięg i obrażenia zależą od zamontowanej broni. Wzór premii ataku drona. 2 plus Premia Biegłości twórcy i modyfikator Zręczności operatora. Wzór na obrażenia drona. Kość zamontowanej broni plus modyfikator Inteligencji twórcy. Wzór na RO w przypadku ataku obszarowego. 8 plus Premia Biegłości twórcy i modyfikator Zręczności operatora. 000 83"
  },
  "serwisowanie": {
    id: "serwisowanie",
    source: "profesja",
    owner: "monter",
    klasa: "spec",
    level: null,
    label: "Serwisowanie",
    action: null,
    text: "Kiedyś był taki serial o kolesiu, który ze sreberka, spinacza i butelki po denaturacie robił telefon. Otrzymujesz biegłość w narzędziach małego elektronika. Potrafisz naprawiać i produkować urządzenia elektroniczne i drobne mechanizmy. Potrzebne ci tylko narzędzia małego chemika, małego elektronika, surowce i czas. Otrzymujesz wylistowane poniżej schematy elektroniczne. 000 84 SCHEMATY ELEKTRONICZNE NAZWA ST PRODUKCJA SUROWCE Agregat 20 50 godzin 1 CE, 15 CZ, 9 MK Akumulator 15 40 godzin 5 CH, 10 CZ, 5 MK Alternator 15 40 godzin 15 CZ, 1 CE, 4 MK Baterie 10 20 godzin 9 CH, 1 MK Celownik optyczny 15 20 godzin 5 CE, 5 CZ, 10 MK Defibrylator 20 60 godzin 5 CE, 20 CZ, 5 MK Detektor ruchu 25 80 godzin 30 CE, 5 CZ, 5 MK Krótkofalówka 10 24 godziny 1 CE, 10 CZ, 1 MK Kompas 5 4 godziny 1 CZ, 1 MK Laserowy wskaźnik celu 20 60 godzin 9 CE, 20 CZ, 1 MK Latarka 10 20 godzin 9 CZ, 1 MK Miernik skażenia chemicznego 20 50 godzin 5 CE, 5 CH, 10 CZ, 5 MK Miernik promieniowania 15 30 godzin 3 CE, 2 CH, 8 CZ, 2 MK Noktowizor 20 70 godzin 25 CE, 7 CZ, 3 MK Palnik acetylenowo-tlenowy 10 20 godzin 2 CH, 5 CZ, 3 MK Odtwarzacz CD 15 40 godzin 15 CE, 4 CZ, 1 MK Powiększalnik 20 60 godzin 9 CE, 20 CZ, 1 MK Radio 10 15 godzin 3 CE, 3 CZ, 1 MK Termowizor 30 200 godzin 90 CE, 5 CZ, 5 MK Turbina wiatrowa/wodna 20 60 godzin 5 CE, 10 CZ, 15 MK Wykrywacz metalu 15 30 godzin 5 CE, 5 CZ, 5 MK Wytrychy elektroniczne 20 50 godzin 20 CE, 4 CZ, 1 MK Zapalnik elektryczny 5 5 godzin 5 CZ Zegarek 10 20 godzin 9 CZ, 1MKKLASY TWARDZIEL Bycie twardzielem, to nie tylko napinanie muskułów, noszenie ciężkich pancerzy i szpanowanie po okolicy fajnym gnatem. Prawdziwy Twardziel sam podejmuje największe ryzyko, robiąc rzeczy, od których inni wymiękają. To ktoś w stylu: Ja tego nie zrobię? Potrzymaj mi piwo. Twardziele są wyspecjalizowani w używaniu wszystkich kategorii broni i pancerzy, które mogą zmaksymalizować ich siłę ognia i defensywę na polu walki. Potrafią celnie wystrzelić największą ilość kul i używać pojazdów, jako broni. Jednej rzeczy nie cierpią najbardziej. Przegrywać. 000 85"
  },
  "clint": {
    id: "clint",
    source: "profesja",
    owner: "kowboj",
    klasa: "twardziel",
    level: null,
    label: "Clint",
    action: null,
    uses: { max: 1, period: "combat" },
    hotbar: true,
    text: "Poprawka. Raz na walkę możesz powtórzyć jeden Test Ataku bronią palną. Zabójcza spluwa. Rewolwery w twoich rękach zadają jedną dodatkową kość obrażeń. PRZYKŁAD: Peacemaker w twoich dłoniach zadaje 2k8, zamiast 1k8 obrażeń."
  },
  "rewolwerowiec": {
    id: "rewolwerowiec",
    source: "profesja",
    owner: "kowboj",
    klasa: "twardziel",
    level: null,
    label: "Rewolwerowiec",
    action: null,
    text: "Wyciągasz rewolwer i strzelasz, zanim ktokolwiek zdąży mrugnąć okiem. Dobywanie. Jeśli nosisz jeden lub dwa rewolwery w kaburach, możesz je dobyć lub schować, bez zużywania darmowej interakcji z przedmiotem. Niezawodny. Rewolwer w twoich rękach nigdy się nie zacina. Jednoręki. Możesz strzelać z rewolweru jedną ręką, bez otrzymywania Utrudnienia do ataku z tego tytułu. Rewolwery traktujesz jako broń o właściwości lekka i poręczna. Strzał z biodra. Otrzymujesz +5 do testów Inicjatywy, jeśli trzymasz w ręce lub będziesz dobywać rewolwer. Szybkoładowacz [B]. Jeśli masz wolną rękę, to w Akcji Bonusowej, możesz z pomocą pełnego szybkoładowcza (aka speedloadera) uzupełnić pusty bębenek rewolweru."
  },
  "zawsze-w-siodle": {
    id: "zawsze-w-siodle",
    source: "profesja",
    owner: "kowboj",
    klasa: "twardziel",
    level: null,
    label: "Zawsze w siodle",
    action: null,
    text: "Prawdziwy kowboj piechotą chodzi tylko do kibla, baru i burdelu. Jeśli nie masz konia lub motocykla, los zsyła ci okazję do jego zdobycia na najbliższym Długim odpoczynku. Porzucony harley lub koń bez jeźdźca, to coś, co po prostu ci się przydarza. Pamiętaj, żeby nadać mu imię i módl się do zapomnianych bogów, żeby nie spotkać jego prawowitego właściciela. I pamiętaj - nie możesz go nikomu sprzedać. WOJOWNIK AUTOSTRADY Stuningowany Dodge Challenger wzbija tumany pyłu, ścigany przez foodtrackowców z gangu Pikantnych Kiełbasek. Nazwę mają debilną, ale zmonopolizowali rynek mięsny w Vegas, mieląc (dosłownie) swoją konkurencję na parówki. Ostrzeliwują Challengera, którego kierowca wjechał na dawno zbombardowany węzeł nr 95 na międzystanowej 15. Zbiornik w jego bagażniku otwiera się, rozlewając stary olej z frytkownicy. Ścigany wyciska siódme poty z ukochanej maszyny i skacze nad brakującym fragmentem estakady. Kiedy ląduje, foodtrackowcy jeszcze lecą. Ostatni raz podali mu zimne frytki."
  },
  "drzwi-w-drzwi": {
    id: "drzwi-w-drzwi",
    source: "profesja",
    owner: "wojownik-autostrady",
    klasa: "twardziel",
    level: null,
    label: "Drzwi w drzwi",
    action: null,
    text: "Twój pojazd to twoja broń. Samochód, motor czy autobus to równie zabójcze zabawki, co twój gnat. Rajdowiec. Podczas walki, wyścigu i pościgu wykonujesz wszystkie Testy Mądrości (Pojazdy) z Ułatwieniem. Szybkość twojego pojazdu rośnie o 50%. Konwojent. Nie otrzymujesz Utrudnienia do Testów Ataków, wynikających z niestabilnego podłoża, kiedy jedziesz pojazdem, zarówno jako pasażer, jak i kierowca. Taranowanie. Istoty, które taranujesz swoim pojazdem, otrzymują Utrudnienie do RO na Zręczność."
  },
  "kaskader": {
    id: "kaskader",
    source: "profesja",
    owner: "wojownik-autostrady",
    klasa: "twardziel",
    level: null,
    label: "Kaskader",
    action: null,
    text: "Twoje wyczyny za kierownicą przerażają twoich pasażerów. Kierując dowolnym pojazdem silnikowym, potrafisz wykonywać triki jak filmowy kaskader. Schody to też jezdnia. Potrafisz jeździć pojazdem po schodach (jeśli się zmieścisz wszerz i na zakrętach) z pełną Szybkością pojazdu. Skoczek. Przeskakujesz pojazdem przez dziury i przepaści o czterokrotnej długości twojego pojazdu, jeśli się rozpędzisz na odległości 60 metrów. 000 88KLASY Na dwóch kółkach. Umiesz jechać na dwóch bocznych kołach, żeby zmieścić się w wąskiej uliczce lub pomiędzy dwiema ciężarówkami. Każda z tych czynności wymaga Testu Mądrości (Pojazdy) o ST 15, który wykonujesz z Ułatwieniem. Porażka w teście oznacza, że pojazd uległ małym uszkodzeniom. Porażka o 5 i więcej, oznacza awarię pojazdu i obrażenia u pasażerów."
  },
  "pancerna-fura": {
    id: "pancerna-fura",
    source: "profesja",
    owner: "wojownik-autostrady",
    klasa: "twardziel",
    level: null,
    label: "Pancerna fura",
    action: null,
    text: "Twoja maszyna jest twoją twierdzą. OC. Jeśli prowadzisz pojazd mechaniczny, który daje jakąś Osłonę pasażerom, to ty i twoi pasażerowie otrzymujecie dodatkową premię do Trudności Trafienia, równą twojemu modyfikatorowi Mądrości. Premia działa, tylko kiedy pojazd jest w ruchu. AC [B]. W Akcji Bonusowej możesz uruchomić lub zatrzymać pojazd, wykonać nim Przyspieszenie, Odstąpienie lub Unikanie. ŻOŁNIERZ Major piechoty wydaje rozkaz bandzie żółtodziobów. Mundur z zapomnianą przez większość ludzi flagą na ramieniu, poplamiony jest smarem i prochem strzelniczym. Cudem wyremontowane działo artyleryjskie bije aż miło w pozycje maszerujących oddziałów Molocha. W okopach kryje się setka ochotników, którzy stawią im zaciekły opór. Major z dumą pójdzie z nimi wprost do piekła."
  },
  "jak-dbasz-tak-masz": {
    id: "jak-dbasz-tak-masz",
    source: "profesja",
    owner: "zolnierz",
    klasa: "twardziel",
    level: null,
    label: "Jak dbasz, tak masz",
    action: "B",
    legacyAbilityKey: "jakDbaszTakMasz",
    text: "Nikt nie potrafi składać, rozkładać i czyścić broni szybciej od ciebie. Robisz to z zamkniętymi oczami, paląc papierosa i śpiewając Oh my darling. Broń palna w twoich rękach nigdy się nie zacina, a jeśli już masz taką w dłoniach, wystarczy ci Akcja Bonusowa, żeby ją naprawić. Z kolei uszkodzoną broń białą, naprawiasz w czasie Krótkiego odpoczynku."
  },
  "rutyna": {
    id: "rutyna",
    source: "profesja",
    owner: "zolnierz",
    klasa: "twardziel",
    level: null,
    label: "Rutyna",
    action: null,
    text: "Kiedy inni panikują, ty wykonujesz rutynowe działania na polu walki. Ostrzał artylerii, eksplodujące granaty, czy seria z karabinu, to tylko elementy taktyczne, utrudniające wykonanie misji. Kalkulujesz i oceniasz ryzyko, będąc tam, gdzie są największe szanse na przeżycie. W czasie walki masz Ułatwienie w Rzutach Obronnych na Zręczność i Mądrość."
  },
  "trening-w-zbroi": {
    id: "trening-w-zbroi",
    source: "profesja",
    owner: "zolnierz",
    klasa: "twardziel",
    level: null,
    label: "Trening w zbroi",
    action: null,
    text: "Robienie pompek w pancerzu i z kowadłem na plecach, to twoje codzienne zajęcie. Nie otrzymujesz kar do Testów Zręczności (Skradanie się) wynikających z noszenia pancerza. Twoja maksymalna premia ze Zręczności do Trudności Trafienia wynikająca z ograniczeń noszonego pancerza, zwiększa się o 1. 000 89"
  },
  "skrytka": {
    id: "skrytka",
    source: "profesja",
    owner: "kurier",
    klasa: "zlodziej",
    level: null,
    label: "Skrytka",
    action: null,
    text: "Potrafisz schować kontrabandę w wozie tak, żeby żaden pies jej nie wyniuchał, i ukryć niewielką broń tak, żeby obmacujący cię zbok niczego nie wymacał. Kiedy ukrywasz przedmiot lub istotę o rozmiarze nie większym niż mały, testujesz swoją umiejętność Skradanie się i wykonujesz test z Ułatwieniem. Przedmiot lub istota otrzymuje stan Niewidoczność."
  },
  "slang": {
    id: "slang",
    source: "profesja",
    owner: "kurier",
    klasa: "zlodziej",
    level: null,
    label: "Slang",
    action: null,
    text: "Wiesz, jak gadać z tubylcami w każdym zakątku Podzielonych Stanów. Szybko rozpoznajesz lokalnych złodziejaszków, prawidłowo oceniasz zakapiorów i wiesz, co powiedzieć, żeby zrobić jakiś biznes. W kilka chwil zdobywasz informacje o tym, kto tu rządzi, jakie ma problemy i z kim lepiej nie zadzierać. Na to wszystko wystarczy ci godzina i kilka fajek. A kiedy MG prosi cię o testy Perswazji lub Śledztwa związane z tym półświatkiem, masz w nich Ułatwienie. Dlaczego? Bo jesteś: spoko ziom, swój na każdej dzielni, co złego to nie ja."
  },
  "znajomosci": {
    id: "znajomosci",
    source: "profesja",
    owner: "kurier",
    klasa: "zlodziej",
    level: null,
    label: "Znajomości",
    action: null,
    text: "Podzielone Stany to twój dom i prawie wszędzie masz jakiegoś znajomka. Kiedy jesteś w cywilizowanym miejscu, wykonaj Test Charyzmy. Im lepszy wynik, tym bardziej znaczący w lokalnej społeczności jest twój znajomy. SZCZUR Nikt nie zwraca uwagi na brudnego pijaczynę w ciuchach śmierdzących szambem. Nikt nie dostrzega zwinnych dłoni, sprawnie zbierających gamble w tłumie. Nikt nie zauważył plecaka pozostawionego pod autocysterną, zaparkowaną pod więzieniem. Za 60 sekund na miasto tych religijnych popaprańców, spadnie ognisty deszcz."
  },
  "a-co-mi-tam": {
    id: "a-co-mi-tam",
    source: "profesja",
    owner: "szczur",
    klasa: "zlodziej",
    level: null,
    label: "A co mi tam!",
    action: null,
    text: "Masz Ułatwienie w Rzutach Obronnych przeciw chorobom, truciznom i radiacji. Masz również odporność na obrażenia od trucizn, chorób i promieniowania. Tak, na alkohol niestety też, bo to przecież trucizna. Jeśli masz chorobę przewlekłą, nie doznasz jednak cudownego ozdrowienia. 000 93"
  },
  "szary": {
    id: "szary",
    source: "profesja",
    owner: "szczur",
    klasa: "zlodziej",
    level: null,
    label: "Szary",
    action: null,
    text: "Szczurów jest pełno. Żebracy, włóczędzy, ludzkie wraki. Nikt z nimi nie gada. Nikt nie zwraca na nich uwagi. Jeśli zachowujesz się inteligentnie, wykorzystując ludzką pogardę, potrafisz stać się niezauważalny (otrzymujesz stan Niewidoczność). Mądra kryjówka. Dodajesz modyfikator Inteligencji lub Mądrości do testów Skradania się. Nie widzisz mnie. Możesz próbować ukrywać się na otwartym terenie, nawet w jasnym świetle dnia, czy na środku pustego hangaru, np. jako zwykły żul szukający złomu. Jeśli nic nie mówisz i nie robisz hałasu, masz Ułatwienie w Testach Ukrywania się, dopóki kogoś nie zaatakujesz lub nie zrobisz czegoś głośnego."
  },
  "truciciel": {
    id: "truciciel",
    source: "profesja",
    owner: "szczur",
    klasa: "zlodziej",
    level: null,
    label: "Truciciel",
    action: "B",
    hotbar: true,
    text: "Jeśli posiadasz narzędzia małego chemika, możesz w czasie Długiego odpoczynku wyprodukować jedną porcję trucizny. Ta porcja zawiera 10 ml trującego olejku. W Akcji Bonusowej możesz nałożyć ją na ostrze broni lub na maksymalnie trzy groty. Trucizna pozostaje aktywna przez 1 minutę lub do momentu aplikacji, zależnie od tego, co wydarzy się pierwsze. Cel trafiony zatrutą bronią lub pociskiem musi zdać RO na Kondycję (ST 8 plus twój modyfikator Inteligencji i Premia Biegłości), lub otrzymuje stan Zatrucie na 1 minutę. Cel powtarza Rzut Obronny na końcu swojej tury."
  },
  "zwinnosc-szczura": {
    id: "zwinnosc-szczura",
    source: "profesja",
    owner: "szczur",
    klasa: "zlodziej",
    level: null,
    label: "Zwinność szczura",
    action: null,
    text: "Wspinacz. Potrafisz szybko i efektywnie się wspinać. Otrzymujesz Szybkość wspinania równą twojej Szybkości ruchu. Skoczek. Kiedy skaczesz, możesz testować Akrobatykę zamiast Atletyki. Maksymalną odległość skoku wyliczasz, uwzględniając wartość Zręczności, a nie Siły. ZABÓJCA Zdjęcie po cichu patrolu gangusów i zajęcie ich miejscówki na klifie było formalnością. U dołu rozciąga się obóz wyznawców Bano, gdzie przetrzymują jeńców złapanych w poprzednim rajdzie. Na centralny plac właśnie wyciągają ogromnego mutasa zakutego w kajdany. Jest zły, poraniony i gotowy zabijać. Przestrzelenie kłódki w jego kajdanach też będzie formalnością. Jeszcze tylko chwilka. Zakontraktowany cel powinien zaraz się pojawić."
  },
  "jeden-strzal": {
    id: "jeden-strzal",
    source: "profesja",
    owner: "zabojca",
    klasa: "zlodziej",
    level: null,
    label: "Jeden strzał",
    action: null,
    text: "Potrafisz się przygotować do zabijania lepiej niż ktokolwiek inny. Jeśli atakujesz bronią finezyjną lub strzelasz ogniem pojedynczym, otrzymujesz nowe możliwości. Pierwszy atak. W pierwszej rundzie walki, jeśli wykonujesz atak przed turą swojego celu, otrzymujesz Ułatwienie do pierwszego Testu Ataku przeciwko temu celowi. Celowanie [B]. W czasie walki i poza nią możesz zastygnąć w bezruchu i lepiej wycelować. Jeśli w swojej turze nie wykonasz ruchu, możesz poświęcić Akcję Bonusową na lepsze wycelowanie i wykonać jeden atak z Ułatwieniem."
  },
  "kamuflaz": {
    id: "kamuflaz",
    source: "profesja",
    owner: "zabojca",
    klasa: "zlodziej",
    level: null,
    label: "Kamuflaż",
    action: null,
    text: "Jesteś w stanie przygotować sobie kamuflaż tak dobrze pasujący do otoczenia, że nawet po oddaniu strzału, trudno cię dostrzec. Ghillie. Jeśli przygotujesz sobie strój maskujący i pomalujesz twarz zgodnie z barwami otoczenia, otrzymujesz Ułatwienie do Testów Skradania się. Niewidoczny. Jeśli przed strzałem z broni dystansowej lub rzucanej, masz stan Niewidoczność, to nie stajesz się widoczny po wykonaniu ataku, dopóki się nie przemieścisz. Warunkiem jest noszenie stroju maskującego i malowanie twarzy, które pasują do otoczenia. Cel pozna jedynie kierunek, z którego wykonano atak, chyba że używasz broni o właściwości cicha."
  },
  "strzelec": {
    id: "strzelec",
    source: "profesja",
    owner: "zabojca",
    klasa: "zlodziej",
    level: null,
    label: "Strzelec",
    action: null,
    text: "Jedni lubią zabijać nożem, inni cenią truciznę, a ty wolisz zabijać z daleka. Jeżeli przygotujesz stanowisko snajperskie z bronią z celownikiem optycznym i poświęcisz 5 rund na precyzyjne mierzenie do celu, to dopóki się nie poruszysz, zyskujesz dwie poniższe, dodatkowe korzyści. Powiększenie. Trzykrotne zwiększenie maksymalnego zasięgu dla tej broni. Przewaga balistyczna. Brak Utrudnienia za strzelanie na dalekim dystansie tą bronią. 000 94KLASY ZWIADOWCA Z dala od miast i resztek cywilizacji, tam, gdzie dominują mutanci, maszyny Molocha i zdziczali ludzie, oczy czujnych zwiadowców szukają zwierzyny. Przemierzają niezmierzone dystanse, żywiąc się tym, co znajdą lub upolują. Każdy zwiadowca to wyspecjalizowany drapieżnik, którego napędza nienawiść, obowiązek lub jakiś pokręcony kodeks. Zwiadowcy to odludki, które lepiej dogadują się ze zwierzętami niż z ludźmi, choć często zarabiają jako przewodnicy, zabójcy potworów lub strażnicy. 000 95"
  },
  "bez-tajemnic": {
    id: "bez-tajemnic",
    source: "profesja",
    owner: "lowca-mutantow",
    klasa: "zwiadowca",
    level: null,
    label: "Bez tajemnic",
    action: "A",
    hotbar: true,
    text: "Znasz się na mutantach i potworach jak nikt inny. Jeśli spotkasz mutanta lub potwora i zdasz Test Inteligencji (Przyroda), zyskujesz wiedzę na jego temat. MG zdradza ci jego zwyczajową nazwę (ST 10), słabe punkty (ST 15) i trzy wybrane współczynniki (ST 20)."
  },
  "mutant-na-sniadanie": {
    id: "mutant-na-sniadanie",
    source: "profesja",
    owner: "lowca-mutantow",
    klasa: "zwiadowca",
    level: null,
    label: "Mutant na śniadanie",
    action: null,
    oncePerTurn: true,
    text: "Trochę tego tałatajstwa już zdechło dzięki tobie. Wiesz najlepiej, jak z nimi walczyć i jak się przed nimi bronić. Refleks łowcy. Kiedy rozpoczynasz walkę z mutantem lub potworem, zyskujesz premię do Inicjatywy, równą twojej Premii Biegłości. Zabójca mutantów. Kiedy walczysz z mutantem lub potworem, możesz raz w rundzie zaatakować go z Ułatwieniem. Unik łowcy [R]. Jeśli zostajesz trafiony atakiem przez mutanta lub potwora, możesz użyć Reakcji, żeby wobec tego ataku podnieść swoją TT o wartość twojej Premii Biegłości. 000 98KLASY Nazwa: Pogromca Tryb ognia: Pojedynczy Magazynek: 1 Obrażenia: 4k6 od trucizny/kwasu/ognia Zasięg: 9/18 metrów Właściwości: Ładowanie Koszt produkcji: 10 MK, 10 CE, 80 CZ Koszt produkcji pocisku: 1 MK, 1 CZ, 8 CH"
  },
  "pogromca": {
    id: "pogromca",
    source: "profesja",
    owner: "lowca-mutantow",
    klasa: "zwiadowca",
    level: null,
    label: "Pogromca",
    action: null,
    text: "Jeśli wydasz 100 gambli na surowce i poświęcisz 100 godzin pracy, to zbudujesz strzelbę na mutanty i potwory o wdzięcznej nazwie Pogromca. Strzela ona nabojami przypominającymi małe strzykawki napełnione chemikaliami. W czasie Długiego odpoczynku możesz stworzyć tyle naboi, ile wynosi twoja Premia Biegłości. Koszt stworzenia jednego takiego naboju to 10 gb, a trafiony nim mutant lub potwór otrzymuje obrażenia krytyczne. Naboje mogą zawierać truciznę, kwas lub po prostu eksplodować. Tylko Łowca mutantów jest biegły w używaniu Pogromcy. SIŁ SIŁ ZRC ZRC KON KON INT INT MDR MDR CHA CHA 8 (-1) 18 (+4) 18 (+4) 12 (+1) 14 (+2) 12 (+1) 4 (-3) 6 (-2) 16 (+3) 14 (+2) 4 (-3) 4 (-3) ZMUTOWANY OWAD Małe zwierzę TT: 14 plus twoja Premia Biegłości INICJATYWA +6 (16) PW: 3 plus 10 x twój modyfikator Mądrości SZYBKOŚĆ: 9 m, wspinanie 9 m, kopanie 4,5 m STOPIEŃ ZRANIENIA O O O O KW k6 x ½ twojego poziomu Zwiadowcy ZMUTOWANY SSAK Duże zwierzę TT: 11 plus twoja Premia Biegłości INICJATYWA -1 (9) PW: 9 plus 10 x twój modyfikator Mądrości SZYBKOŚĆ: 12 m, wspinanie 6 m STOPIEŃ ZRANIENIA O O O O KW k10 x ½ twojego poziomu Zwiadowcy UMIEJĘTNOŚCI Skradanie się +6 NIEWRAŻLIWOŚĆ NA OBRAŻENIA radioaktywne, od trucizny ZMYSŁY Ślepowidzenie 9 m, Pasywna Percepcja 13 ZDOLNOŚCI Kopacz. Kiedy zakopuje się w piachu lub w ziemi, nie prowokuje ataków okazyjnych. Pajęcza wspinaczka. Może chodzić po każdej chropowatej powierzchni, nawet do góry nogami. Udźwig. Użytkowy: 16 kg. Maksymalny: 32 kg. AKCJE Ukąszenie. Atak wręcz: +4 plus twoja Premia Biegłości; zasięg 1,5 m; Obrażenia: 6 (1k4 + 4) kłute. UMIEJĘTNOŚCI Atletyka +6 ZMYSŁY Noktowizja 18 m, Pasywna Percepcja 12 ZDOLNOŚCI Doskonałe zmysły. Ma Ułatwienie w Testach Mądrości (Percepcja) opartych na węchu i słuchu. Współpraca. Jeśli w zasięgu do 1,5 metra od przeciwnika znajduje się przytomny sojusznik, otrzymuje Ułatwienie do Testów Ataku wręcz. Udźwig. Użytkowy: 180 kg. Maksymalny: 360 kg. AKCJE Atak kończyną. Atak wręcz: +4 plus twoja Premia Biegłości; zasięg 1,5 m; Obrażenia: 10 (2k6 + 4) obuchowe i trafiony cel otrzymuje stan Powalenie, jeśli jest rozmiaru średniego lub mniejszego."
  },
  "oswajanie-zwierzat": {
    id: "oswajanie-zwierzat",
    source: "profesja",
    owner: "lowca-mutantow",
    klasa: "zwiadowca",
    level: null,
    label: "Oswajanie zwierząt",
    action: null,
    companion: true,
    text: "Znajdujesz zmutowanego zwierzaka i sprawiasz, żeby łaził za tobą i wykonywał twoje polecenia. W czasie walki działa natychmiast po twojej turze, jeśli przeznaczysz swoją Akcję Bonusową na wydanie mu polecenia. Oswojone zwierzę wykonuje pełny zakres swoich akcji i walczy do utraty przytomności. Jeśli nie otrzyma żadnego polecenia, nie przemieszcza się i używa akcji Unikanie. Oswajanie zwierzęcia. Jeśli nie posiadasz żadnego oswojonego zwierzęcia, możesz poświęcić 24 godziny na szukanie odpowiedniego kandydata. Rzuć 1k6, żeby dowiedzieć się, jakie stworzenie znajdujesz (1-2: zmutowany owad, 3-4: zmutowany ssak, 5-6: zmutowany gad). Jest to zwykle osobnik słaby, ranny lub odtrącony przez swoje stado. Czas leczenia i oswajania trwa 3 dni. Oswojonemu zwierzęciu musisz nadać imię i nie możesz go nikomu sprzedać ani oddać. Musisz mu zapewniać wodę i pożywienie. 000 99"
  },
  "jeden-z-nas": {
    id: "jeden-z-nas",
    source: "profesja",
    owner: "sedzia",
    klasa: "zwiadowca",
    level: null,
    label: "Jeden z nas",
    action: null,
    text: "Nie musisz się za każdym razem tłumaczyć miejscowym stróżom prawa, kiedy ubijesz jakiegoś gangusa lub złodzieja. Nie tracisz czasu na dyskusje, mówisz, że jesteś z „policji” i że to było konieczne, a oni tylko kiwają głowami. Jesteś jednym z nich. Dodatkowo, kiedy próbujesz przekonać do czegoś lokalnych stróżów prawa, otrzymujesz Ułatwienie w testach Wpływania."
  },
  "rzuc-bron-i-gleba": {
    id: "rzuc-bron-i-gleba",
    source: "profesja",
    owner: "sedzia",
    klasa: "zwiadowca",
    level: null,
    label: "Rzuć broń i gleba!",
    action: "B",
    hotbar: true,
    text: "Siła twojego głosu potrafi zmusić największego cwaniaka do upuszczenia broni. W Akcji Bonusowej możesz krzyknąć polecenie do wybranego człowieka w zasięgu 9 metrów i zmusić go do poddania się. Przeciwnik wykonuje Rzut Obronny na Mądrość o ST równym 8 plus twój modyfikator Charyzmy i Premia Biegłości. Porażka w teście oznacza, że natychmiast upuszcza broń, kładzie się na ziemię i jest pod wpływem stanu Przerażenie do końca twojej następnej tury."
  },
  "partner": {
    id: "partner",
    source: "profesja",
    owner: "sedzia",
    klasa: "zwiadowca",
    level: null,
    label: "Partner",
    action: null,
    companion: true,
    text: "Wierny uczeń lub ulubione zwierzę to idealni partnerzy Sędziego. W tym świecie nikt nie przetrwa samotnie. Twój partner ma imię, wykonuje twoje polecenia, nawet walczy u twego boku, jeśli tylko potrafi. Może jednak zginąć, a wtedy będziesz szukać nowego. Sędzia zwykle ciągnie ze sobą młodego człowieka, który chce nauczyć się fachu… albo psa. Partner ma swoją turę zawsze po twojej turze. Nie może dziaSIŁ ZRC KON INT MDR CHA 14 (+2) 14 (+2) 18 (+4) 4 (-3) 12 (+1) 4 (-3) ZMUTOWANY GAD Średnie zwierzę TT: 12 plus twoja Premia Biegłości INICJATYWA +2 (12) PW: 6 plus 10 x twój modyfikator Mądrości SZYBKOŚĆ: 9 m, pływanie 18 m STOPIEŃ ZRANIENIA O O O O KW k8 x ½ twojego poziomu Zwiadowcy. UMIEJĘTNOŚCI Percepcja +3 ZMYSŁY Termowizja 18 m, Pasywna Percepcja 13 ZDOLNOŚCI Ziemnowodny. Potrafi oddychać zarówno na lądzie, jak i pod wodą. Udźwig. Użytkowy: 70 kg. Maksymalny: 140 kg. AKCJE Ugryzienie. Atak wręcz: +2 plus twoja Premia Biegłości; zasięg 1,5 m; Obrażenia: 5 (1k6 + 2) kłute. Trafiona istota musi zdać RO na Kondycję o ST 10, inaczej zostanie Zatruta na 1 minutę. Cel wykonuje ponowny RO na końcu swojej tury. 000 100KLASY LUDZKI PARTNER Tworzysz partnera na czystej karcie postaci. Cechy: Wartości Cech Bazowych do przydzielenia: 14,14,12,12,10,8 lub 24 punkty do dowolnego rozdzielenia. Pochodzenie: Otrzymuje Pochodzenie zgodne z miejscem jego werbunku. Punkty Wytrzymałości. 5 x twój poziom Zwiadowcy. Kości Wytrzymałości partnera to k6 i ma ich tyle, ile ty masz poziomów Zwiadowcy. Wyszkolenie w pancerzu: Może korzystać z tych pancerzy, w których ty masz wyszkolenie. Premia Biegłości: +2 (nie rośnie). Rzuty Obronne: Ma biegłość w dwóch RO wybranych przez ciebie. Atak: Może korzystać z każdej broni, w której masz biegłość. Obrażenia. Zależne od broni i jego modyfikatorów Cech Bazowych. Sztuczki. Zna jedną, wybraną przez ciebie Sztuczkę, której wymagania spełnia. Umiejętności. Ma biegłość w dwóch wybranych przez ciebie umiejętnościach lub zestawach narzędzi. Śmierć: Umiera na takich samych zasadach, jak BG, czyli stosuje Stopnie Zranienia i korzysta z Rzutów Przeciw Śmierci. łać samodzielnie, więc w swojej Akcji Bonusowej wydajesz mu komendę. Jeśli nie wydasz mu żadnego polecenia, unika walki, broni się akcją Unikanie i szuka osłony. Szukanie partnera. Jeśli nie masz partnera, możesz poświęcić 24 godziny na szukanie odpowiedniego kandydata. Na zbłąkanego kundla lub pełnego ideałów człowieka natkniesz się zarówno w mieście, jak i w dowolnej, zabitej dechami dziurze. Partnera nie możesz nikomu odstąpić (lub sprzedać w przypadku psa) oraz musisz mu zapewnić wodę i pożywienie."
  },
  "emiter-emp": {
    id: "emiter-emp",
    source: "profesja",
    owner: "zabojca-maszyn",
    klasa: "zwiadowca",
    level: null,
    label: "Emiter EMP",
    action: null,
    text: "Jeśli wydasz 100 gambli na surowce i poświęcisz 100 godzin pracy, to zbudujesz ciężką, nieporęczną broń wyspecjalizowaną w niszczeniu maszyn. Emiter strzela impulsem elektromagnetycznym, który zakłóca działanie lub niszczy niemal każdą maszynę. Nie działa na istoty żywe i urządzenia, które nie używają mikroprocesorów. Emiter EMP ładuje się prądem elektrycznym 230 V, a akumulator starcza na 6 wystrzałów. Ta broń ignoruje TT pochodzącą z opancerzenia maszyny. Tylko Zabójca Maszyn jest biegły w używaniu tej specyficznej broni. Nazwa: Emiter EMP Tryb ognia: Pojedynczy Magazynek: 6 Obrażenia: 8k6 od elektryczności Zasięg: 9/15 metrów Właściwości: Ładowanie Porażenie: Trafiony cel wykonuje Rzut Obronny na Kondycję o ST 15 inaczej otrzymuje stan Obezwładnienie do końca twojej następnej tury Koszt produkcji: 20 MK, 40 CE, 40 CZ"
  },
  "empiryk": {
    id: "empiryk",
    source: "profesja",
    owner: "zabojca-maszyn",
    klasa: "zwiadowca",
    level: null,
    label: "Empiryk",
    action: "R",
    hotbar: true,
    text: "Nikt nie wie, jak to robisz, ale potrafisz przewidzieć zachowanie każdej maszyny. Jeśli zostajesz trafiony przez maszynę, możesz użyć Reakcji, żeby wobec tego ataku podnieść swoją TT o wartość twojej Premii Biegłości. Zyskujesz również Ułatwienie w Rzutach Obronnych na efekty wywoływane przez maszyny."
  },
  "slaby-punkt": {
    id: "slaby-punkt",
    source: "profesja",
    owner: "zabojca-maszyn",
    klasa: "zwiadowca",
    level: null,
    label: "Słaby punkt",
    action: "A",
    hotbar: true,
    oncePerTurn: true,
    text: "Każda maszyna ma swój słaby punkt. Wystarczy w niego trafić, żeby idealnie spasowane trybiki, przekładnie, pasy transmisyjne i kable zasilające szlag trafił. Jeśli w czasie walki z maszyną lub tuż przed nią, poświęcisz akcję na Test Inteligencji (Technika) o ST zależnym od jej rozmiaru, MG może ci zdradzić 3 wybrane współczynniki wskazanej maszyny. Mała i malutka (ST 5), średnia (ST 10), duża (ST 15), wielka (20), ogromna (25). Sukces oznacza również, że możesz raz w rundzie zaatakować ją z Ułatwieniem. ZABÓJCA MASZYN Siwobrody weteran zarzucił na plecy starą kapotę maskującą i zakamuflował wierną Light Fifty, załadowaną amunicją przeciwpancerną. Kilkanaście godzin spędzonych w radioaktywnym piachu w końcu się opłaciło. Cel wyjechał z bazy w licznej obstawie. Juggernaut ma tylko jeden słaby punkt. Karabin szarpnął jak diabli, a powietrzem wstrząsnęła eksplozja. Cel zlikwidowany. Pora się zwijać. 000 101"
  },
  "obsluga-pancerza": {
    id: "obsluga-pancerza",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Obsługa pancerza",
    action: null,
    text: "Kiedy nosisz pancerz, otrzymujesz +2 do Trudności Trafienia."
  },
  "rzeznik": {
    id: "rzeznik",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Rzeźnik",
    action: null,
    text: "Kiedy atakujesz dowolną bronią, nie trzymając w drugiej ręce innej broni, otrzymujesz modyfikator +3 do obrażeń zadawanych tą bronią."
  },
  "sokole-oko": {
    id: "sokole-oko",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Sokole oko",
    action: null,
    text: "Otrzymujesz modyfikator +3 do Testów Ataku bronią palną, dystansową i rzucaną."
  },
  "stalowy-nadgarstek": {
    id: "stalowy-nadgarstek",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Stalowy nadgarstek",
    action: null,
    text: "Kiedy strzelasz z broni palnej krótkiej i pistoletów maszynowych jedną ręką, nie otrzymujesz związanego z tym Utrudnienia do Testów Ataku (tak jakby miały właściwość poręczna). Dodatkowo każda broń palna krótka w twoich rękach zyskuje właściwość lekka."
  },
  "jezdziec": {
    id: "jezdziec",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Jeździec",
    action: null,
    text: "Kiedy dosiadasz wierzchowca, nie musisz używać rąk, żeby nim kierować. Nie otrzymujesz Utrudnienia do Testów Ataków dystansowych związanego z niestabilnym podłożem, kiedy na nim jedziesz. Wsiadanie i zsiadanie z wierzchowca kosztuje cię tylko 1,5 metra ruchu. Trudność Trafienia twojego wierzchowca zwiększa się o wartość twojej Premii Biegłości."
  },
  "zasadzka": {
    id: "zasadzka",
    source: "opcja",
    owner: "wyjadacz-option",
    level: null,
    label: "Zasadzka",
    action: null,
    text: "Jeśli twój przeciwnik jest zaskoczony lub w pierwszej turze walki działasz przed nim, otrzymujesz Ułatwienie w Testach Ataku przeciwko niemu, do końca swojej tury."
  },
  "moj-wrog-ludzie": {
    id: "moj-wrog-ludzie",
    source: "opcja",
    owner: "moj-wrog-option",
    level: null,
    label: "Mój wróg: Ludzie",
    action: null,
    text: "Twoim wrogiem są Ludzie. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg."
  },
  "moj-wrog-maszyny": {
    id: "moj-wrog-maszyny",
    source: "opcja",
    owner: "moj-wrog-option",
    level: null,
    label: "Mój wróg: Maszyny",
    action: null,
    text: "Twoim wrogiem są Maszyny. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg."
  },
  "moj-wrog-mutanty": {
    id: "moj-wrog-mutanty",
    source: "opcja",
    owner: "moj-wrog-option",
    level: null,
    label: "Mój wróg: Mutanty",
    action: null,
    text: "Twoim wrogiem są Mutanty. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg."
  },
  "moj-wrog-potwory": {
    id: "moj-wrog-potwory",
    source: "opcja",
    owner: "moj-wrog-option",
    level: null,
    label: "Mój wróg: Potwory",
    action: null,
    text: "Twoim wrogiem są Potwory. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg."
  },
  "moj-wrog-zwierzeta": {
    id: "moj-wrog-zwierzeta",
    source: "opcja",
    owner: "moj-wrog-option",
    level: null,
    label: "Mój wróg: Zwierzęta",
    action: null,
    text: "Twoim wrogiem są Zwierzęta. Masz Ułatwienie w Testach Mądrości (Survival), kiedy ich tropisz, i w Testach Inteligencji, kiedy przypominasz sobie fakty na ich temat. Kiedy ich atakujesz, otrzymujesz modyfikator do ataku i obrażeń zgodny z kolumną Mój wróg."
  },
};

/**
 * Choice pools — an ability that says "wybierz jedną z poniższych".
 * Rendered as an `ItemChoice` advancement over these feature ids.
 */
export const CHOICE_POOLS = {
  "wyjadacz": ["obsluga-pancerza", "rzeznik", "sokole-oko", "stalowy-nadgarstek"],
  "wyjadacz-zwiadowca": ["jezdziec", "obsluga-pancerza", "rzeznik", "sokole-oko", "stalowy-nadgarstek", "zasadzka"],
  "moj-wrog": ["moj-wrog-ludzie", "moj-wrog-maszyny", "moj-wrog-mutanty", "moj-wrog-potwory", "moj-wrog-zwierzeta"],
};

/**
 * Repeat entries — a later level re-opens an earlier choice ("Wyjadacz (2)"),
 * or is a pure numeric upgrade already described by the base ability's text
 * ("Szybka produkcja (2)": the 25 gb cap becomes 50 gb).
 *
 *   kind "choice"  -> ItemChoice over CHOICE_POOLS[repeatOf], excluding already-taken
 *   kind "trait"   -> Trait advancement (another skill Specjalizacja)
 *   kind "upgrade" -> no item granted; the base feature's behaviour changes
 */
export const FEATURE_REPEATS = {
  "wyjadacz-2": { repeatOf: "wyjadacz", kind: "choice" },
  "wyjadacz-zwiadowca-2": { repeatOf: "wyjadacz-zwiadowca", kind: "choice" },
  "moj-wrog-2": { repeatOf: "moj-wrog", kind: "choice" },
  "moj-wrog-3": { repeatOf: "moj-wrog", kind: "choice" },
  "specjalizacja-zlodziej-2": { repeatOf: "specjalizacja-zlodziej", kind: "trait" },
  "ulubiona-bron-zwiadowca-2": { repeatOf: "ulubiona-bron-zwiadowca", kind: "upgrade" },
  "szybka-produkcja-2": { repeatOf: "szybka-produkcja", kind: "upgrade" },
};


export const FEATURE_IDS = Object.keys(CLASS_FEATURES);

/**
 * Resolve a level-table entry, which may be:
 *   - a plain feature                       -> { type: "feature" }
 *   - a feature that also opens a choice    -> { type: "featureWithChoice" }
 *     (e.g. "wyjadacz" grants the descriptive feature AND offers its 4 variants;
 *      "moj-wrog" grants the feature AND picks an enemy group)
 *   - a bare choice pool                    -> { type: "choice" }
 *   - a repeat of an earlier choice/upgrade -> { type: "repeat" }
 */
export function resolveGrant(id) {
  const feature = CLASS_FEATURES[id] ?? null;
  const pool = CHOICE_POOLS[id] ?? null;
  if ( feature && pool ) return { type: "featureWithChoice", feature, pool };
  if ( feature ) return { type: "feature", feature };
  if ( pool ) return { type: "choice", pool };
  const repeat = FEATURE_REPEATS[id];
  if ( repeat ) return { type: "repeat", ...repeat, pool: CHOICE_POOLS[repeat.repeatOf] ?? null };
  return null;
}

/** Features granted by a class at a given level. */
export function featuresFor(classId, level) {
  return Object.values(CLASS_FEATURES).filter(
    f => f.source === "klasa" && f.level === level
      && (f.owner === classId || f.alsoOwnedBy?.includes(classId))
  );
}

/** Ability pool offered by a profession. */
export function featuresOfProfession(professionId) {
  return Object.values(CLASS_FEATURES).filter(
    f => f.source === "profesja" && f.owner === professionId
  );
}

/** Every feature that should get an auto-managed hotbar macro. */
export function hotbarFeatures() {
  return Object.values(CLASS_FEATURES).filter(f => f.hotbar === true);
}
