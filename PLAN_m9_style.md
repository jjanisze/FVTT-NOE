# M9 — Przebudowa wizualna NOE przed betą

> **Status 2026-11-17: E1b, E2 i wycinek E3 wdrożone, czekają na ocenę MG** (§9 — „Stan wdrożenia”).
> O2 zatwierdzone (2026-11-17). Do decyzji: makieta K1–K18 ([dev/visual/m9-components/](dev/visual/m9-components/index.html)), pilot ikon i banerów
> (`npm run build:finish -- --preview`), wycinek na karcie (Poligon · Garderoba, sondy „Wygląd M9”). E4–E6 po tej ocenie.
> Kierunek MG: **pragmatyzm Jagged Alliance 2 z affordancjami współczesnego oprogramowania** (JA 1.13 / BG3).
> Funkcja, użyteczność i czytelność mają pierwszeństwo; grafit i metal blisko obecnego ciemnego motywu.
>
> **Ten plan jest specyfikacją wykonawczą dla agenta implementującego.** Cel: NOE ma wyglądać jak własny
> produkt, a nie przemalowana karta 5e, z **jednym językiem wizualnym w całym FVTT-NOE**. Kolejność czytania:
> decyzje (§0) → zasady (§2) → informacja (§3) → tokeny i komponenty (§4) → co się zmienia na każdej
> powierzchni (§5) → grafika (§6) → silnik wykończeń (§7) → egzekwowanie (§8) → etapy i odbiór (§9–§10).
> Historia przeglądów (D1–D10, warianty V1–V12, palety wersji 04–06, grafika 01–03):
> [dev/art/m9/HISTORIA.md](dev/art/m9/HISTORIA.md) — kontekst decyzji, nie otwarte pytania.
>
> Część [drogi do bety](PLAN_beta.md); rozwija [studium ikon](PLAN_icon_design.md); inwentarz:
> [33 rodziny UI i 14 zrzutów „przed”](AUDIT_m9_ui.md). **Zależność od M8:** mechanika kosztów i budżetów
> należy do [M8](PLAN_m8_ruch_i_ekonomia_akcji.md) (gałąź `m8-ruch-ekonomia`). E3+ zaczyna od kodu po scaleniu M8;
> panel M8, plakietki kosztu na kartach użycia i linijka ruchu to konsumenci do przestylowania, bez zmiany zachowania.

<a id="locked-style"></a>
## 0. Zamknięte decyzje

### 0.1. Profil ikon i paleta — 2026-11-15

**MG: „Choices locked in, commit to plan”**, na podstawie eksportu **NOE M9 — review proposal 07**.
Ta sekcja i wersjonowany [profil `noe-m9-r07-v1`](dev/icons/finish/style-profile.json) są źródłem prawdy
dla implementacji. Wcześniejsze warianty i porównania: [HISTORIA.md](dev/art/m9/HISTORIA.md).

| Ustawienie | Wybór zatwierdzony |
| --- | --- |
| Source palette | **Bone Pochodzenia** (`bone`) |
| Unavailable | **Red slash · dark outline** (`dark`) |
| Paintjob | **Neutral graphite** (`graphite`) |
| Glyph | **Colored ground** (`ground`) dla tożsamości i zdolności postaci |
| Frame | **No housing** (`bare`) — bez ramki, grubego paska źródła i bevelu |
| Size | **44 CSS px**, wobec dotychczasowej referencji 32 px |
| Information | **row** — koszt, licznik i powód w wierszu / podpisie skrótu |
| Action costs | **shapes** — kształt + kolor + litera A/B/R/I, zgodnie z wybraną opcją tablicy |
| Palette coverage | **Wszystkie 19 proponowanych rodzin treści**; profesje dziedziczą klasę |
| Sprzęt fizyczny | Wcześniej ustalony podział: goły kolorowy glif rodziny sprzętu |
| Sztuczki / ogólne zdolności | Wspólne tło **Generic**, niezależne od klasy właściciela |
| Filtr i stany | Bez filtra całej karty; glif ma pełną nieprzezroczystość we wszystkich stanach |
| Tło głównej karty postaci | **Oryginalny Field kit — fizyczny nylon**, osobna decyzja MG poniżej |

`Colored ground` zamyka recepturę zdolności/tożsamości, zachowując podział sprzęt/zdolności z rozmowy.
Zwykłe czynności i kontrolki używają gołego glifu w kolorze tekstu motywu. Aktywna, pasywna i mieszana zdolność
dzielą ten sam język źródła. Czerwony skos jest celową nakładką niedostępności operacji.

#### Osiem źródeł — wartości zatwierdzone

| Źródło | Tło | Glif | Akcent źródła |
| --- | --- | --- | --- |
| Brutal | `#6d2623` | `#ffffff` | `#d57362` |
| Cwaniak | `#4f4100` | `#ffffff` | `#ddc052` |
| Spec | `#00484e` | `#ffffff` | `#56c5ce` |
| Twardziel | `#263574` | `#ffffff` | `#7999ef` |
| Złodziej | `#4e2b6d` | `#ffffff` | `#bb85ea` |
| Zwiadowca | `#28481e` | `#ffffff` | `#9dc96a` |
| Generic | `#383e45` | `#ffffff` | `#b8c1c9` |
| Pochodzenia | **`#dfd1b1`** | **`#161b20`** | `#dfd1b1` |

Neutral graphite: powierzchnia `#191e23`, panel `#293038`, tekst `#edf0f2`, tekst drugorzędny `#b2bdc6`,
linie `#454f58`, akcent interfejsu `#bdc6cd`. Kolory sprzętu i mapowanie wszystkich 19 rodzin są w profilu.
Zatwierdzone pary pełnych kolorów glif/tło mają co najmniej 10:1 przed maską, zmniejszeniem i końcowym renderem.

#### Koszt i dostępność

A: zielone koło `#68c585`; B: pomarańczowy trójkąt `#f5ad49`; R: czteroramienna gwiazda `#e3a0e9`;
I: niebieski kwadrat `#83c8ed`. Litery pozostają przy figurach (`shapes`, nie wariant `compact`).

Niedostępność: czerwony skos `#ff554d`, ciemny obrys `#10161b`, bez dodatkowej jasnej krawędzi.
Geometria wybrana na tablicy: −45°, długość 112% ikony, grubość `clamp(2px, 5.5% rozmiaru, 4px)`, obrys 1 CSS px.
Glifu nie przyciemniamy. Powód i licznik pozostają widoczne. Samo ostrzeżenie budżetu M8 oraz brak danych
nie dostają skosu; aktywny efekt i brak kolejnych użyć pozostają odrębnymi informacjami. W zdolności mieszanej
znak dotyczy niedostępnej operacji, a korzyści stałe pozostają czytelne.

<a id="locked-pc-background"></a>
### 0.2. Tło głównej karty postaci — wybór zamknięty przez MG

**MG wskazał konkretny plik `exec-8ccae121-0700-4316-892a-2dd037b3a8df.png` jako BG głównej karty postaci.**
To **oryginalny Field kit z przeglądu 02**, nie Rip-stop, MOLLE, Reinforced ani Field pouch z przeglądu 03.
Źródło prawdy: [zapis wyboru](dev/art/m9/selection.json).

- Master w repo: [r02/sources/field-kit.png](dev/art/m9/r02/sources/field-kit.png), **2172 × 724 px**.
- SHA-256: `bf223634f0be028e6551c4f5b3c15117fab3eb159323f9789fa5d3230a99b731`.
  Kopia w repo została porównana z dokładnie wskazanym przez MG plikiem i jest identyczna bajtowo.
- Istniejący [WEBP do przeglądu](dev/art/m9/r02/field-kit-v1.webp) i [próba na karcie](dev/art/m9/r03/previews/field-kit-features.webp)
  pokazują wybrany obraz. Dostarczany WEBP ma powstać z tego mastera.
- Zachować tożsamość obrazu i proporcje. Bez regeneracji, przerysowania ani podmiany na późniejszy wariant.
  Kadr, skalowanie, maska i kompresja należą do integracji E3; nie otwierają ponownie wyboru grafiki.

Decyzja dotyczy **głównej karty postaci**; pozostałe karty — D14. Wdrożenie produkcyjnego tła jest przed nami.

<a id="decisions-2026-11-16"></a>
### 0.3. Decyzje wdrożeniowe — 2026-11-16

Rozmowa MG z agentem przeglądającym plan. Uzupełniają §0.1–0.2; profil `noe-m9-r07-v1` pozostaje bez zmian.

| ID | Decyzja MG | Konsekwencja dla implementacji |
| --- | --- | --- |
| D11 | **Typografia: rodzina Roboto.** Roboto Condensed — tytuły, nagłówki, przyciski; Roboto — nazwy i tekst; Roboto Mono — liczby, liczniki, koszty, etykiety techniczne | Condensed i Roboto dostarcza dnd5e, tylko w wagach 400/700. Roboto Mono (Apache-2.0) dołączamy w `fonts/roboto-mono/`: WOFF2 400 i 700, podzbiór latin + latin-ext, wpis w CREDITS. Roboto Slab, Modesto i Amiri znikają z powierzchni w zakresie |
| D12 | **Wymuszony ciemny motyw** dla okien i kart NOE, natywnych okien dnd5e (użycie, rzut, rozwój, edytory AE i aktywności), kart czatu (samodzielne ciemne bloki), HUD-ów, tooltipów i menu NOE | Bez jasnego wariantu tokenów i grafiki. Wybór motywu arkusza w Foundry nie działa na te okna — opisać w `docs/`. `lightEquipmentInk` profilu pozostaje uśpione |
| D13 | **Zasięg: tylko okna NOE/dnd5e, karty czatu i nasze HUD-y** | Rama rdzenia (sidebar, log czatu, pasek makr, kontrolki sceny, lista graczy, powiadomienia) zostaje Foundry. Nie zmieniamy globalnych `--color-*`/`--font-*` rdzenia |
| D14 | **Tła kart:** PC — Field kit (§0.2), BN — Field kit, pojazd — Workshop, drużyna — Survey, przedmioty — Workshop | Dialogi, czat i małe okna: gładki grafit bez banera. Mastery i hashe w §6 |
| D15 | **Ikony treści: wypalony WEBP bezstratny**, 128 px dla treści, 256 px dla tożsamości (klasa, profesja, Pochodzenie) | Jeden typ konsumenta (`<img>`) na karcie, w czacie, kompendium i canvas; po dekodowaniu 64 KiB zamiast 256 KiB na ikonę. Białe mastery 256 bez zmian; SVG z `--icon-fill` tylko dla glifów kontrolek UI |
| D16 | **Silnik wykończeń** obejmuje ikony treści, banery/tła, tekstury bez szwu, znaki UI (A/B/R/I, skos, „?”) i ikony stanów | Portrety/żetony i placeholdery klas/pojazdów zostają przy istniejących generatorach. Tabliczki odczytu (D18) są komponentem CSS bez assetu |
| D17 | **Egzekwowanie: zapadka w `npm test`**; przed betą zero surowych kolorów i krojów w CSS widocznym dla gracza | Liczniki mogą tylko maleć; allowlista z powodem dla canvas/VFX/OSD/debug — §8 |
| D18 | **Odznaki 5e → płaskie tabliczki odczytu** | TT, inicjatywa, szybkość, biegłość, poziom: prostokąt, liczba mono, mała etykieta. Bez tarcz, heksów, wieńców |
| D19 | **Głębokość ingerencji:** CSS → zmienne dnd5e → hooki renderu / wstrzykiwanie DOM (wzorzec `sheet-shell.mjs`); fork szablonu dnd5e tylko z uzasadnieniem w audycie | Każdy fork zapisuje szablon, powód i wersję dnd5e oraz ma kontrolę różnic przy aktualizacji systemu |
| D20 | **Historia przeglądów poza planem** | [HISTORIA.md](dev/art/m9/HISTORIA.md) |

### 0.4. Co pozostaje otwarte

| ID | Punkt | Kiedy |
| --- | --- | --- |
| O1 | **Dymki mowy na canvas** (audyt, ID 27) to komponent rdzenia (`ChatBubbles`). D13 wyłącza rdzeń, a wcześniejszy zakres E5 je obejmował | MG przed E5; do tego czasu poza zakresem |
| O2 | Wartości tokenów semantycznych: ok / ostrzeżenie / zagrożenie / informacja (§4.1). **Zatwierdzone przez MG 2026-11-17:** `#b5e48c` / `#ffe08a` / `#ff9e94` / `#a9b8e8` (`styles/noe/tokens.css`) | rozstrzygnięte |
| O3 | Kadry banerów w pięciu slotach; tekstury bez szwu (G2) tylko wtedy, gdy wycinek E3 pokaże potrzebę | E2–E3 |
| O4 | Strony dziennika (journal) w stylu dnd5e — treść świata, nie okno NOE | Domyślnie poza zakresem; MG może dopisać |

**E0 zakończone.** Zamknięcie projektu nie oznacza gotowych assetów, wdrożonego potoku ani zakończonego M9.
Kolejne przeglądy oceniają jakość eksportów, kadry i integrację na kartach — nie są ponownym wyborem
palety, receptur, rozmiaru, krojów ani tła PC.

## 1. Cel i granice

1. Szybko odróżniamy przedmiot, zdolność, czynność i stałą korzyść oraz A/B/R/I, użycia i dostępność.
2. Te same sygnały znaczą to samo na karcie, pasku, w kompendium i czacie.
3. NOE ma własną, użytkową tożsamość wizualną; karta przestaje polegać na domyślnej oprawie 5e.
4. Zmiany wizualne zachowują mechanikę i znane ścieżki obsługi. Przebudowa układu musi rozwiązywać
   konkretny problem znaleziony w audycie, z pokazanym przed/po.

M9 odpowiada za prezentację stanu. [M8](PLAN_m8_ruch_i_ekonomia_akcji.md) odpowiada za ekonomię akcji,
budżety, koszty, grupowanie ataków i ich zapis. M9 korzysta z tego kontraktu, bez drugiego licznika.
Ostrzeżenie budżetu pozostaje ostrzeżeniem: nowa ramka nie może zmienić go w blokadę.
Stany zakazu, warunku, wyczerpania i nieznanego wyniku pokazujemy z konkretną przyczyną.

## 2. Język projektowy NOE — zasady

Zasady obowiązują każdą powierzchnię w zakresie (D13) i każdy nowy kod UI, także po M9.
Uzasadnienie — brief MG D1–D10 w [historii przeglądów](dev/art/m9/HISTORIA.md).

| ID | Zasada | W praktyce |
| --- | --- | --- |
| P1 | **Funkcja przed ozdobą** | Każdy element odpowiada na pytanie gracza z §3. Ornamenty 5e (złote ramki, tarcze, heksy, wieńce, filigran, pergamin, bordowe belki) usuwamy, a nie przemalowujemy |
| P2 | **Spokojne powierzchnie, głośne stany** | Grafit, linie 1 px, prawie bez cieni. Nasycony kolor tylko dla tła źródła ikony, kosztów A/B/R/I, stanów, ostrzeżeń i zagrożeń |
| P3 | **Jeden sygnał — jedno znaczenie, wszędzie** | Ten sam token i komponent na karcie, pasku, w czacie, kompendium i HUD. Nowy sygnał to nowy token/komponent w §4, nie lokalny kolor |
| P4 | **Kolor nigdy sam** | Koszt: kształt + litera; niedostępność: skos + powód; ostrzeżenie: ikona + tekst; wynik: słowo + kolor. Znaczenie przetrwa skalę szarości |
| P5 | **Tożsamość ≠ operacja ≠ stan** | Tło ikony mówi, skąd coś pochodzi; znak kosztu — ile kosztuje; licznik, plakietka i skos — czy da się teraz i dlaczego nie |
| P6 | **Dane na żywo, grafika stała** | Liczby, koszty i stany nie są wypalane w assetach; jedna grafika na temat |
| P7 | **Liczby to narzędzie** | Roboto Mono, cyfry tabelaryczne, wyrównanie do prawej w kolumnach; etykiety techniczne mono, wersalikami |
| P8 | **Ruch tylko dla „działaj teraz”** | Animacja wyłącznie dla stanu wymagającego reakcji (zacięcie, zegar gotowości). `prefers-reduced-motion` ją wyłącza |
| P9 | **Klawiatura i powód bez hover** | Widoczny `:focus-visible` na każdej kontrolce; powód niedostępności widoczny w wierszu, tooltip go tylko rozwija |
| P10 | **Znajome ścieżki** | Kontrolki zostają tam, gdzie gracze ich szukają; przeniesienie wymaga problemu z audytu i pary zrzutów przed/po |

Charakter JA2 dają materiały sprzętu w banerach (nylon, blacha, mapa), techniczna typografia mono, płaskie
tabliczki odczytu i dyscyplina kolorów. Nie dają go nity, bevel, udawany metal ani dekoracyjne ramki („no housing”).

## 3. Język informacji

| Pytanie gracza | Kanał | Reguła |
| --- | --- | --- |
| Co to jest? | Sylwetka + nazwa | Zachowujemy zatwierdzone glify i rozpoznawalny temat |
| Skąd pochodzi? | Spokojny akcent w UI + podpis źródła | Tożsamość klasy/rodziny, nie kolor aktualnego właściciela; akcent nie zabiera obszaru glifu |
| Co mogę wykonać? | Wiersz/przycisk operacji | Opis przedmiotu i wykonanie czynności mają różne affordancje |
| Ile kosztuje? | Znak kształt/kolor + A / B / R / I w etykiecie operacji | Poza glifem. Inne czasy wypisane; zdolność z kilkoma operacjami nie dostaje jednej mylącej litery |
| Ile zostało? | Liczba pozostałe/pojemność | Zasób użyć niezależny od budżetu A/B/R/I; oba mogą wystąpić jednocześnie |
| Czy efekt działa? | „WŁ.” w obszarze stanu | Aktywność efektu niezależna od gotowości kolejnego użycia; bez obrysu nachodzącego na glif |
| Dlaczego niegotowe? | Znacznik + konkretna przyczyna | Zużyty budżet, 0 użyć, zakaz, brak warunku i brak danych są odrębne |
| Co jest wybrane? | Zaznaczenie kontrolki | Inne niż stan aktywnego efektu; focus klawiatury czytelny niezależnie |

Na tablicy przeglądu wszystkie liczby i stany to **niezależne przykłady**. Makieta pojedynczej karty musi mieć spójny
wspólny budżet. Projekt nie udaje pomiaru dostępności z działającego Foundry.

Przypadki obowiązkowe: Aramis (stałe + Wytrącenie B), zdolność z wyzwalaczem bez prostej litery akcji
(np. Wściekły cios), wiele aktywności o różnych kosztach, brak aktywności, nieznany stan, 0 użyć,
duża liczba użyć, aktywne i zarazem wyczerpane, zakaz mimo niewydanej puli, ostrzeżenie M8 mimo pozostałych użyć.
Pasywności nie wyprowadzamy z samego `action: null` ani koloru obrazka.

Zwykły wiersz ma **44 px** (zamknięte). Nie pomniejszamy gęstego glifu
wyłącznie po to, żeby zachować starą wysokość wiersza. 64/48 px dla tożsamości i nagłówków; 24/16 px pozostają
próbami granic czytelności i konsumentami wymagającymi uproszczonego symbolu albo nazwy, a nie dowodem, że glif działa.
Informację operacyjną trzymamy poza grafiką we wszystkich rozmiarach.
Glif zachowuje pełną nieprzezroczystość także przy braku warunku lub wyczerpaniu zasobu, niezależnie od wariantu
obudowy. Stan opisują tekst/znak i licznik; przyciemnianie gęstej sylwetki obniża jej rozpoznawalność.
**D10 — celowy wyjątek od ochrony powierzchni glifu:** niedostępna operacja dostaje wąską czerwoną ukośną kreskę
na istniejącym rysunku, z obrysem oddzielającym ją od jasnego glifu i kolorowego tła. Koszty i liczniki nadal są obok.
Samo wydanie puli z ostrzeżeniem M8 nie uruchamia czerwonego skosu. Brak danych pozostaje znakiem zapytania.
Aktywny efekt może mieć jednocześnie 0 kolejnych użyć: stan WŁ. pozostaje, kreska dotyczy kolejnego użycia.
Zdolność mieszana nie traci korzyści stałych; niedostępność jej operacji pokazujemy przy tej operacji, zamiast
przekreślać rodzica i sugerować utratę wszystkich korzyści. Docelowa projekcja korzysta z jawnej dostępności
operacji; odczyt demonstracyjnego `0/3` na tablicy nie jest projektem reguł wykonania.
Nazwy i powody pozostają dostępne bez hover; tooltip może je rozwijać. Kolor zawsze ma odpowiednik w znaku/tekście.
Kolory istniejących stanów pochodzą nadal z [state-colors.mjs](scripts/config/state-colors.mjs).

## 4. Tokeny i komponenty

### 4.1. Tokeny

Każdy kolor, krój, odstęp i rozmiar w CSS widocznym dla gracza pochodzi z tokenów `--noe-*`. Dwa pliki
ładowane jako pierwsze w `module.json` → `styles`:

- `styles/noe/tokens.generated.css` — **generowany z profilu** (`npm run build:finish -- --only=tokens`, §7);
  nigdy edytowany ręcznie. Zawiera źródła, sprzęt, koszty, niedostępność i motyw grafitowy.
- `styles/noe/tokens.css` — ręczny: typografia (z `@font-face` Roboto Mono), odstępy, promienie, obrysy, rozmiary,
  ruch, pochodne powierzchnie i tokeny semantyczne. Jedyny ręczny plik z surowymi wartościami kolorów.

Kolory stanów zostają w [state-colors.mjs](scripts/config/state-colors.mjs), który publikuje `--neuro-color-*`
na `:root` w `init`; komponenty używają ich bezpośrednio.

| Grupa | Tokeny | Wartość / źródło |
| --- | --- | --- |
| Powierzchnie | `--noe-surface`, `--noe-panel` | `#191e23`, `#293038` (profil) |
| Powierzchnie pochodne | `--noe-raised` (hover, wybór), `--noe-inset` (pola, tory mierników) | `color-mix()` z powyższych; wartość potwierdza makieta E1b |
| Tekst | `--noe-text`, `--noe-text-muted`, `--noe-text-disabled` | `#edf0f2`, `#b2bdc6` (profil); disabled pochodny, tylko dla nieaktywnych pól formularza, nigdy dla glifu |
| Linie i akcent | `--noe-line`, `--noe-accent`, `--noe-focus` | `#454f58`, `#bdc6cd`; focus = akcent |
| Semantyczne | `--noe-ok`, `--noe-warn`, `--noe-danger`, `--noe-info` | **O2.** Punkt wyjścia: kolory, których dziś używa M8 (`#7fe08f`, `#f3d98b`, `#ff7b6e`, `#b9c7d6`). Warunki: odróżnialne od A/B/R/I i od czerwieni skosu; zawsze z tekstem lub ikoną (P4) |
| Źródła | `--noe-src-<źródło>-ground`, `-glyph`, `-accent` | profil, osiem źródeł |
| Sprzęt | `--noe-eq-<rodzina>` | profil, dziewięć rodzin |
| Koszty | `--noe-cost-a`, `-b`, `-r`, `-i` | profil |
| Niedostępność | `--noe-unavail`, `--noe-unavail-outline` | `#ff554d`, `#10161b` (profil) |
| Kroje | `--noe-font-ui`, `--noe-font-label`, `--noe-font-num` | Roboto, Roboto Condensed, Roboto Mono (D11) |
| Rozmiary tekstu | `--noe-fs-10` … `--noe-fs-24` | 10, 11, 12, 13, 14, 16, 20, 24 px; tylko wagi 400 i 700 |
| Odstępy | `--noe-sp-1` … `--noe-sp-6` | siatka 4 px: 2, 4, 8, 12, 16, 24 |
| Promienie | `--noe-r-chip`, `--noe-r-glyph`, `--noe-r-panel` | 2, 3 (tło ikony przy 44 px, profil), 4 px |
| Obrysy | `--noe-border`, `--noe-border-select` | 1 px linia; 2 px wybór i aktywna zakładka |
| Rozmiary | `--noe-glyph-row`, `--noe-glyph-id`, `--noe-row-min`, `--noe-hit-min` | 44, 64, 52, 24 px |
| Ruch | `--noe-t-fast` | 120 ms dla hover i focus; animacje tylko według P8 |

Tokeny semantyczne nie zastępują kolorów kosztów: zielone koło A nie znaczy „gotowe” (§3).

| Rola tekstu | Krój | Rozmiar / waga | Uwagi |
| --- | --- | --- | --- |
| Imię postaci, tytuł karty | Roboto Condensed | 24 / 700, wersaliki | Jak dziś na PC i BN |
| Tytuł okna i dialogu | Roboto Condensed | 14 / 700 | |
| Podtytuł (klasa · poziom, typ przedmiotu) | Roboto Condensed | 13 / 400, muted | |
| Etykieta sekcji i kolumny | Roboto Mono | 10–11 / 400, wersaliki, rozstrzelenie 1 px, muted | Jak na tablicy przeglądu |
| Nazwa w wierszu | Roboto | 13 / 700 | Zamiast dzisiejszego Roboto Slab |
| Podpis wiersza | Roboto | 11 / 400, muted | Rodzaj · źródło |
| Liczby, liczniki, koszty, odczyty | Roboto Mono | 11–20 / 700 | |
| Tekst opisu | Roboto | 13 / 400 | Opisy i ProseMirror |
| Przycisk | Roboto Condensed | 12 / 700, wersaliki | |

### 4.2. Komponenty

Jeden komponent = jedna implementacja: klasa `noe-*` w `styles/noe/components.css` oraz, gdzie znaczniki
powstają w JS, mały pomocnik w `scripts/ui/` (znak kosztu, licznik, plakietka stanu, glif z opakowaniem skosu).
Karta, pasek, panel M8, okna i producenci czatu używają tych pomocników zamiast własnych znaczników dla tych
samych sygnałów. Tablica przeglądu (vault kampanii, `Integracje/icon-design-2026-10-18/`, poza repo) jest
referencją wyglądu wiersza i znaków kosztów, nie kodem do skopiowania.

| ID | Komponent | Anatomia i stany | Zastępuje w 5e |
| --- | --- | --- | --- |
| K1 | Rama okna | `--noe-surface`, nagłówek okna bez złota, tytuł według ról; baner karty według D14 w slocie dnd5e, z maską zaniku | Denim, pergamin, banery `ui/official/*` |
| K2 | Nagłówek karty | Imię, podtytuł, linia 1 px w akcencie źródła klasy (BN: neutralny akcent), portret bez złotej ramki | Czerwona kreska pod imieniem, złote ramki |
| K3 | Tabliczka odczytu (D18) | Prostokąt `--noe-panel`, linia 1 px; etykieta mono 10 wersalikami nad wartością mono 16–20/700. Wartość zmieniona efektem: znak `±` przy liczbie, źródło w tooltipie. Edycja jak dziś | Tarcza TT, heksy inicjatywy/szybkości/biegłości, pierścień poziomu |
| K4 | Zakładki | Pionowa szyna: grafit, ikona muted; aktywna: `--noe-text` i pasek 2 px akcentu. Poziome (ItemSheet, dialogi): tekst i podkreślenie 2 px | Złote i pergaminowe zakładki |
| K5 | Nagłówek sekcji | Pas `--noe-panel`, etykieta mono wersalikami, nagłówki kolumn tą samą typografią; sekcja klasy lub Pochodzenia ma po lewej pasek 2 px w akcencie źródła | Bordowe belki `--dnd5e-card-header-*` |
| K6 | Wiersz treści | Glif 44 px bez obudowy · znaki kosztu przed nazwą · nazwa i podpis · prawa kolumna: licznik i powód/stan. Hover: tło akcentu 8%; wybór: obrys 1 px akcentu; aktywny efekt: K9 „WŁ.”; niedostępna operacja: K10 + powód | Wiersze z `gold-icon` |
| K7 | Znak kosztu | Figura 12 px w kolorze profilu + litera mono 11/700. Kilka operacji = znak przy każdej operacji, nie jeden przy rodzicu. 0/1 nie zmienia figury; I 0/1 wskazuje kolejne Używanie A (M8) | Tekst „Akcja dodatkowa” w podpisie |
| K8 | Licznik | `pozostałe/pojemność`, mono, wyrównanie do prawej, min. 5ch; duże liczby nie łamią wiersza; 0 zawsze z powodem | Kolumna „Użycia” |
| K9 | Plakietka stanu | Tekst + ikona: WŁ. (aktywny efekt), Ostrzeżenie (budżet M8, `--noe-warn`, bez skosu), Warunek, Zakaz, Brak danych („?”) | — |
| K10 | Skos niedostępności | Geometria z profilu; `::after` na opakowaniu `.noe-glyph` wokół `<img>`, bo ani `<img>`, ani `<dnd5e-icon>` nie mają pseudoelementów; glif bez przyciemnienia | `opacity` i filtry na glifie |
| K11 | Miernik i tor | Tor `--noe-inset`, wypełnienie tokenem zasobu, liczba mono; bez gradientów i tekstur. Pipki panelu Stan zachowują `--neuro-color-*` | Kapsuły PW/KW, `--dnd5e-color-hp-*` |
| K12 | Przycisk | Podstawowy (akcent), drugorzędny (panel + linia), niebezpieczny (obrys i tekst `--noe-danger`), ikonowy. Wysokość 28 px. Nieaktywny: tekst disabled i powód w tooltipie | Złote przyciski czatu, `--control-button-text-color` |
| K13 | Pola formularza | Input, select, checkbox, slide-toggle przez zmienne rdzenia/dnd5e (`--input-*`, `--checkbox-*`, `--slide-toggle-*`): `--noe-inset` + linia; zaznaczenie w akcencie | Złoty slide-toggle i legendy |
| K14 | Tooltip, popover, menu | `--noe-panel`, linia 1 px, 12 px, maks. 320 px; liczby i powody jak w wierszu. Menu kontekstowe dziedziczy `.themed` z okna (rdzeń szuka najbliższego `.themed`) | Pergaminowe tooltipy dnd5e |
| K15 | Powłoka dialogu | DialogV2 przez wspólny wrapper NOE (klasy `noe themed theme-dark`); nagłówek jak K1, stopka z K12; akcja nieodwracalna w wariancie niebezpiecznym | 126 wywołań DialogV2 z różną oprawą |
| K16 | Karta czatu | Samodzielny ciemny blok: nagłówek (ikona 36 px, nazwa, podpis), treść, blok wyniku (suma mono 24/700, sukces/porażka słowem i kolorem semantycznym), wiersz akcji K12, adnotacje (Fuksy, Forsowanie) jako K9/K11. Zwinięta karta zachowuje wynik i adnotacje (PM13) | Denim, bordowe nagłówki, złote przyciski |
| K17 | Pusty stan / strefa upuszczania | Linia przerywana 1 px `--noe-line`, tekst muted, ikona | „UPUŚĆ TU ULUBIONE” |
| K18 | Chip, pill, tag | Płaski, linia 1 px, `--noe-r-chip`, bez mieszania warstw | Pills z `--pill-underlay-*` |

Focus wszystkich kontrolek: `outline: 2px solid var(--noe-focus); outline-offset: 2px` na `:focus-visible`.

## 5. Powierzchnie — jak język się stosuje i co się zmienia

### 5.1. Zweryfikowany inwentarz — 2026-11-15

[Audyt M9](AUDIT_m9_ui.md) rozpisuje **33 rodziny przeglądu** z właścicielami i stanem dowodów.
Chrome wykorzystano początkowo do tablicy ikon; obecny audyt dodaje **14 rzeczywistych widoków w piaskownicy**
([galeria „przed”](dev/visual/reference/2026-11-15/index.html)). Obejmuje próbki czterech kart aktorów,
wariantów BN, ItemSheet, edytora aktywności i samej powłoki użycia; pełne przepływy wymagają dalszych prób.

- **4 karty aktorów:** PC, BN, pojazd i **drużyna**, łącznie 27 deklarowanych zakładek (część warunkowa).
- **9 typów treści Item** na wspólnej karcie; edytory aktywności, efektów i rozwoju postaci.
- **11 własnych dodatkowych okien:** lalka, kalendarzyk zdrowia, miejsca i paleta pojazdu, siedem okien postoju/handlu.
- Dialogi użycia/rzutu/odpoczynku i wspólne formularze NOE: **126 punktów DialogV2 w 67 plikach**, nie 126 odmiennych projektów.
- Czat: **232 miejsca tworzenia wiadomości i 52 hooki renderu**; osobno **dymki mowy na canvas**.
- Paski/panel walki, HUD stanów, pościg, OSD drona, tooltipy/menu/komunikaty oraz kompendia/sidebar.

Kompendia zawierają **934 rekordy w 19 paczkach**, odwołujące się do **518 różnych ścieżek ikon modułu**
na poziomie indeksów. Biblioteka `icons/` ma 1716 plików / 954 ścieżki po pominięciu rozszerzenia.
Żadna z tych liczb nie jest jeszcze liczbą niezależnych tematów do wykończenia: manifest E1b obejmie
także embedded Items, aktywności, lookupy, wrappery i warianty.

### 5.2. Mechanizm: zakres, wymuszony ciemny motyw i most do dnd5e

- **Klasa zakresu.** Element główny każdej powierzchni w zakresie dostaje `noe themed theme-dark`. Reguły M9
  działają pod `.noe`, więc nie wyciekają do rdzenia (D13). Wariant sci-fi rdzenia nie zmienia okien NOE.
- **Gdzie dodajemy klasy (D12):**
  - karty NOE (`NeuroshimaCharacterSheet`, `NeuroshimaNPCSheet`, `KartaPojazdu`, `NeuroshimaGroupSheet`) i 11 okien
    ApplicationV2 — w opcjach klasy. Rdzeń dopisuje `themed theme-<x>` z ustawienia `core.sheetThemes` tylko wtedy,
    gdy `themed` jeszcze nie ma (`client/applications/api/document-sheet.mjs`), więc nasze klasy wygrywają;
  - natywne okna dnd5e (element z `.dnd5e2`: ItemSheet, edytory aktywności i AE, użycie, rzuty, rozwój,
    przeglądarka kompendium) — jeden hook `renderApplicationV2`: zdjąć `theme-light`, dodać `noe themed theme-dark`;
  - DialogV2 NOE — wspólny wrapper (K15);
  - karty czatu — hook renderu wiadomości oznacza blok karty; log czatu zostaje rdzenia;
  - HUD-y, tooltipy i menu NOE — klasy przy tworzeniu elementu.
- **Kaskada.** Serwer Foundry nadaje stylom systemu warstwę `system`, a stylom modułów `modules`, gdy manifest jej
  nie podaje (`dist/server/views/view.mjs`). Kolejność rdzenia to `… applications, compatibility, layouts, system,
  modules, exceptions`, więc reguła NOE wygrywa z każdą regułą dnd5e bez względu na specyficzność (poza `!important`);
  przegrywa tylko z warstwą `exceptions` rdzenia i stylami spoza warstw. Specyficzność liczy się wyłącznie wobec innych
  modułów. Mimo to najpierw zmieniamy zmienne, a selektory tylko tam, gdzie zmiennej brakuje — mniej reguł i mniejsze
  ryzyko przy aktualizacji dnd5e. Komentarz na początku `neuroshima.css` („ten plik jest poza warstwą”) jest nieścisły
  i do poprawy w E3.
- **Most zmiennych.** `styles/noe/dnd5e-bridge.css` przypisuje tokeny NOE zmiennym dnd5e i rdzenia wewnątrz `.noe`
  (deklaracje na `.noe.dnd5e2` i `.noe .dnd5e2`, bo dnd5e deklaruje je na `.dnd5e2` w `@scope (.theme-dark)`).
  Pełną mapę E1b wyprowadza z `less/variables/dark.less` dnd5e 6.0.6. Punkt startu:

| Zmienne dnd5e / rdzenia | Po moście |
| --- | --- |
| `--dnd5e-color-gold`, `--color-text-title`, `--activity-icon-color`, `--item-control-active-color`, `--filter-control-active-color`, `--fieldset-legend-color`, `--control-button-text-color`, `--slide-toggle-track-color-checked`, `--npc-portrait-toggle-on` | `--noe-accent` / `--noe-text` |
| `--dnd5e-border-gold`, `--dnd5e-gold-icon-background` | Brak obudowy ikon (no housing) |
| `--dnd5e-card-header-1/2`, `--dnd5e-color-table-header-1/2` | `--noe-panel` |
| `--dnd5e-application-background`, `--dnd5e-background-card`, `--dnd5e-background-parchment`, `--dnd5e-chat-background`, `--dnd5e-background-texture-denim` | `--noe-surface` / `--noe-panel` |
| `--dnd5e-character-background-image`, `--dnd5e-npc-header-image`, `--dnd5e-vehicle-header-image`, `--dnd5e-group-header-image`, `--dnd5e-item-header-image` | Banery D14 z silnika (§6, §7) |
| `--pill-underlay-*`, `--pill-background-blend-mode`, `--group-underlay-*`, `--filigree-*`, `--dnd5e-ability-tab` | Wyłączone lub płaskie |
| `--dnd5e-font-roboto-slab`, `--dnd5e-font-modesto`, `--font-serif` (w `.noe`) | `--noe-font-ui` / `--noe-font-label` |
| `--advancement-icon-filter`, `--npc-ability-score-filter`, `--dnd5e-roll-icon-filter` | Neutralne; bez przekolorowania „czarny → złoty” |
| `--dnd5e-color-hp-*`, `--dnd5e-color-hd-*`, `--meter-background` | Tokeny K11 |

- **Ikony.** Helper `dnd5e-icon` wybiera `<img>` dla rastrów, więc przy D15 wiersze, czat i kompendium dostają ten sam
  element. `.gold-icon` traci ramkę przez most. Skos K10 wymaga opakowania `.noe-glyph` wstrzykiwanego przy operacjach.
- **Szablony (D19).** Kolejność: zmienna → selektor → hook/DOM. Fork szablonu dnd5e tylko z wpisem w
  [AUDIT_m9_ui.md](AUDIT_m9_ui.md) (szablon, powód, wersja dnd5e) i kontrolą różnic przy aktualizacji systemu.

### 5.3. Zmiany wspólne dla wszystkich powierzchni w zakresie

1. Filtr PC `sepia(.15) contrast(1.05) brightness(.85)` usunięty (audyt: tylko PC go miał); powierzchnie z tokenów.
2. Złoto 5e znika: akcent `--noe-accent`, ramki ikon wyłączone, przyciski K12.
3. Kroje D11: nazwy w Roboto 700 zamiast Roboto Slab, etykiety i liczby w Roboto Mono.
4. Ornamenty (G4) usunięte; odznaki statystyk → K3.
5. Banery według D14; dialogi, czat i małe okna bez banera.
6. Ikony treści z silnika (D15), 44 px w wierszach; istniejące obejścia skali i kontrastu ikon narzędzi usunięte,
   żeby obrazek nie dostał dwóch sprzecznych obudów.
7. Kolory lokalne → tokeny. Dziś trzy arkusze mają **177 różnych wartości hex** (484 literały + 235 `rgb()`), np.
   `#c0392b`, `#e74c3c` i `#ff7b6e` dla tego samego „źle” oraz `#9f9275`/`#b8860b` jako złoto 5e (§8).
8. 17 deklaracji `animation` przejrzanych według P8; każda z wyłączeniem pod `prefers-reduced-motion` (dziś 3 miejsca).

### 5.4. Rodziny powierzchni — co się zmienia

Numeracja według [audytu](AUDIT_m9_ui.md). Każdy ID kończy się parą zrzutów przed/po albo jawnym wynikiem
„bez zmian, bo …”.

| ID | Powierzchnia | Co się zmienia | Dowód odbioru |
| --- | --- | --- | --- |
| 01 | Karta PC | Smok → Field kit (start z próby: góra/środek, `cover`, 300 CSS px, maska pełna do 36% wysokości i zanik do 100%); nagłówek K2; tarcza TT, heksy i pierścień → K3; szyna zakładek K4; bordowe belki → K5 z akcentem klasy; zdolności i ekwipunek K6–K10; PW/KW → K11; panel Stan na tokenach, znaczenia bez zmian; pas podręczny i lalka bez złota; ulubione K17. Zrzut z próby pokazał angielskie nagłówki sekcji („Twardziel Features”, „Background Features”, „Special”) — K5 potrzebuje polskich etykiet, sprawdzić `lang/` | Ta sama postać w widoku codziennym i w walce; długa lista sprzętu; okno 820 px |
| 02 | BN, towarzysz, dron, wierzchowiec | Baner → Field kit (osobny kadr); statystyki BN → K3; akcje i cechy K6; `--npc-ability-score-filter` wyłączony | BN, dron i koń; edycja statystyk |
| 03 | Pojazd | Baner → Workshop; paliwo, załoga, ładownia → K11/K6; awarie → K9 | Pojazd uzbrojony, z załogą |
| 04 | Drużyna | Baner → Survey; członkowie K6 z portretem 64 px; podróż i zapasy K11/K8; podkłady `--group-underlay-*` wyłączone | Drużyna z PC/BN/pojazdem; dzień postoju |
| 05–06 | Przedmiot, edytor aktywności | Baner → Workshop; nagłówek K2 z ikoną 64 px; zakładki poziome K4; fieldsety K13 z legendami mono; lista aktywności K6 z K7 | Broń z wieloma aktywnościami, narzędzie, medycyna, zdolność mieszana |
| 07–08 | Rozwój postaci, edytor AE | Wymuszony ciemny; wybory klasy, profesji, Pochodzenia i Sztuczki jako K6 z tożsamością 64 px; filtr ikon awansu neutralny; listy zmian AE w K13 | Pełny kreator z cofnięciem; duża ilustracja i mały wiersz tego samego wpisu |
| 09–13 | Użycie, rzuty, odpoczynek (natywne dnd5e) | Powłoka K15; Ułatwienie/Utrudnienie i tryby jako przełączniki K12; zasoby K13; podsumowanie K8 | Atak, obrażenia, test i odpoczynek — gracz i MG |
| 14–24 | Okna NOE: lalka, zdrowie, pojazd, postój, handel | Powłoka K15; tabele z etykietami i liczbami mono; denim lalki (`ui/denim075.png`) → grafit; kolory cennika i handlu → tokeny semantyczne | Każde okno raz, gracz i MG |
| 25 | Formularze i potwierdzenia NOE | Wrapper K15; treść bez kolorów inline | Próbka z każdej grupy przepływów |
| 26 | Czat | K16 dla kart NOE i dnd5e; tacka obrażeń przez zmienne; przycisk „Obrażenia” K12 (wariant czerwony → niebezpieczny + powód tekstem); pasek pustego magazynka → K9 | Pełna i zwinięta karta; szept; uprawnienia gracza; Fuksy i Forsowanie widoczne (PM13) |
| 27 | Dymki mowy | **O1** — rdzeń, poza zakresem do decyzji MG | — |
| 28 | Pasek zdolności, panel M8, linijka ruchu, panel gotowości | Kafle paska: glif 44 px, koszt i licznik w podpisie skrótu (`row`), K9/K10 jak w wierszu; kolory `.neuro-m8-*`, `.waypoint-label` i `#neuro-gotowosc` → tokeny semantyczne; zachowanie M8 bez zmian | 0 użyć, aktywny efekt, B 0/1 z ostrzeżeniem, R poza turą, brak danych |
| 29 | Token HUD i stany | Ikony stanów z silnika (D16) w `--neuro-color-*`; przyciski HUD NOE jako ikonowe K12; HUD rdzenia bez zmian | Tekstury canvas, rastry i SVG |
| 30 | Pościg | Legenda i panele DOM → K14/K9; rysunek canvas na allowliście (§8), tylko spójność kolorów semantycznych | Plansza pościgu w turze |
| 31 | OSD drona | Celowo zostaje stylistyka OSD (font Betaflight); allowlista; sprawdzamy kontrast | Lot i celowanie |
| 32 | Tooltipy, popovery i menu NOE | K14; `.neuro-stan-tip` → K14; powiadomienia rdzenia poza zakresem | Klawiatura, długi polski tekst, powód bez hover |
| 33 | Kompendia i sidebar | Rdzeń poza zakresem (D13): zyskują tylko ikony z silnika. Przeglądarka kompendium dnd5e jest oknem dnd5e → wymuszony ciemny i K6 | Miniatury 16/24/32 px w sidebarze |

## 6. Grafika (G1–G7)

M9 obejmuje zamówienie, przegląd i wdrożenie grafiki, nie tylko CSS i ikony. Kandydaci, próby na kartach i ich
historia: [HISTORIA.md §6](dev/art/m9/HISTORIA.md).

### 6.1. Banery kart (G1) — D14

| Karta | Grafika | Master w `dev/art/m9/` | SHA-256 mastera | Slot dnd5e | Stockowy baner (orientacja) |
| --- | --- | --- | --- | --- | --- |
| PC | Field kit | `r02/sources/field-kit.png`, 2172 × 724 | `bf223634f0be028e6551c4f5b3c15117fab3eb159323f9789fa5d3230a99b731` | `--dnd5e-character-background-image` + `.window-content::before` | 1391 × 510 |
| BN | Field kit, osobny kadr | jak PC | jak PC | `--dnd5e-npc-header-image` | 1229 × 439 |
| Pojazd | Workshop | `sources/workshop-v1.png`, 2172 × 724 | `c38e80047e0cf8521945fbb753b46396b20b92add0757cb9772a3b6d00dad424` | `--dnd5e-vehicle-header-image` | 1000 × 373 |
| Drużyna | Survey | `r02/sources/pittsburgh-usgs.jpg` + receptura `survey` z [manifestu r02](dev/art/m9/r02/manifest.json) | `c4b2a495ae6c6c7e11d0182ffa1f68e296725c603f88766879d2c5d38aa32e78` | `--dnd5e-group-header-image` | 744 × 323 |
| Przedmioty | Workshop | jak pojazd | jak pojazd | `--dnd5e-item-header-image` | 498 × 200 |

- Zachować tożsamość obrazu i proporcje: bez regeneracji, przerysowania i podmiany. Kadr, skala, maska i kompresja
  należą do integracji. Survey to autentyczne archiwum (USGS, domena publiczna, [CREDITS r02](dev/art/m9/r02/CREDITS.md)):
  tylko kadr, skala i ton, geometria mapy bez zmian.
- Eksport: WEBP stratny (materiał fotograficzny), szerokość 2× maksymalnej szerokości CSS slotu zmierzonej w E1b;
  jakość dobrana w pilocie E2 na podstawie czytelności i rozmiaru pliku. Ikony są bezstratne, banery nie.
- Tekst i kontrolki na banerze mają bezpieczny obszar. Maska zaniku zamiast rozciągania rastra na listę; start PC:
  góra/środek, `cover`, 300 CSS px, opacity 1, maska pełna do 36% wysokości i zanik do 100%.
- Baner nie jest teksturą: pełna powierzchnia karty nie powtarza banera z taśmami i mocowaniami.
- Mora splotu Field kit sprawdzana przy DPR 1 i 2 oraz w małym oknie.
- [CREDITS.md](CREDITS.md) modułu dostaje wpis każdej wysłanej grafiki.

### 6.2. Pozostałe grupy

| ID | Grupa | Decyzja / praca M9 |
| --- | --- | --- |
| G2 | Materiały powierzchni: denim, pergamin, podkłady paneli | Wspólna gładka baza grafitowa z tokenów. Tekstura bez szwu tylko wtedy, gdy E3 pokaże potrzebę (O3): nowy master tileable i test szwu w silniku |
| G3 | Odznaki TT, poziomu, CR | K3 (D18) — komponent CSS, bez assetu |
| G4 | Ornamenty, złote ramki, separatory i znaki 5e | Usunąć ramki `.gold-icon`, `--filigree-*`, `--dnd5e-ability-tab`, tekstury pergaminu, bordowe gradienty nagłówków i ozdobne separatory. Własny znak NOE tylko po osobnej próbce i decyzji MG |
| G5 | Podkłady `--underlay-*` (stock: 12 klas, 14 typów BN, 4 pojazdu) | Klasy: tożsamości NOE 256 px z silnika albo brak; typy BN i pojazdy: brak (grafit), chyba że E3 pokaże potrzebę |
| G6 | Zastępcze portrety, puste stany, sylwetka lalki | Lista „zachować / poprawić / zamówić” z próbką w docelowym rozmiarze; bez nowej biblioteki portretów |
| G7 | Czat, dymki, małe okna | Komponenty K14–K16, bez bitmap. Wynik, koszt i dostępność pochodzą z danych |

### 6.3. Zasady assetów

- AI nie tworzy formalnych rysunków, schematów, map ani udawanego pisma technicznego. Takie motywy pochodzą
  z autentycznych źródeł (kadr, jednolita skala, filtr, kompozycja; geometria bez zmian). Materiały (nylon, blacha)
  mogą być generacjami `image_gen`.
- Każdy wysłany asset ma: master i hash, prompt lub źródło, status decyzji MG, slot i kadr, bezpieczny obszar tekstu,
  zachowanie przy braku obrazu. Wysyłamy WEBP. Pliki w `dev/art/m9/` to kandydaci przeglądu, nie paczka wydania.

## 7. Silnik wykończeń (`build:finish`)

Obecny [Pipeline.md](dev/icons/Pipeline.md) dalej produkuje zatwierdzane białe glify. Silnik to następny,
deterministyczny etap: z zatwierdzonych źródeł i profilu robi wszystkie wykończone assety NOE (D16).

```text
zatwierdzone źródło + hash  →  manifest semantyczny (rodzina, rola, źródło, receptura, konsumenci)
  →  receptura z profilu  →  eksport  →  walidacja pikseli  →  podgląd w skalach
  →  akceptacja MG (hash źródła + profil + hash pikseli)  →  integracja w builderach/configach  →  fvtt packs
```

### 7.1. Kontrakt

- **Jedno polecenie:** `npm run build:finish -- [--only=tokens,icons,signs,status,banners,textures] [--ids=…]
  [--dry-run] [--preview] [--check]`. Implementacja dopisuje wiersz do tabeli „Pipelines” w [AGENTS.md](AGENTS.md)
  (wyniki nigdy edytowane ręcznie) i podpina `--check` pod `npm run release:check`.
- **Wejścia, tylko do odczytu:** profil [`noe-m9-r07-v1`](dev/icons/finish/style-profile.json), zatwierdzone białe
  mastery 256 px, mastery grafiki z `dev/art/m9/`, [state-colors.mjs](scripts/config/state-colors.mjs), manifest
  semantyczny. Zmiana receptury wizualnej wymaga nowej jawnej wersji profilu.
- **Stos:** raster w Pythonie z Pillow (`.venv`, Pillow 12.2 z WEBP — jak `normalize_icons.py` i
  `dev/art/creatures/prepare.py`); SVG i CSS w Node bez zależności (jak `gen_status_numerals.mjs`). Orkiestrator
  w Node woła Pythona. Bez nowych zależności npm.
- **Determinizm:** stałe parametry eksportu; zmniejszanie Lanczos na alfie premultiplikowanej. `--check` porównuje
  **zdekodowane piksele** rastrów i tekst SVG/CSS, nie bajty. Manifest zapisuje wersje Pillow i libwebp.
- **Wyjścia** w istniejących katalogach najwyższego poziomu (nowy katalog wymagałby `fvtt sandbox:init`):

| Rodzaj | Ścieżka |
| --- | --- |
| tokens | `styles/noe/tokens.generated.css` |
| icons | `icons/finished/<rodzina>/<id>.webp` |
| signs | `ui/noe/signs/*.svg` |
| status | dotychczasowe wyjścia `gen_status_numerals.mjs`, bez zmiany ścieżek |
| banners | `ui/noe/banners/<karta>.webp` |
| textures | `ui/noe/textures/<id>.webp` |

- **Granice:** generacja nie zmienia paczek, świata ani źródeł. Źródłowych SVG/WEBP i zatwierdzonych sylwetek
  nie nadpisujemy. Integracja to osobny krok (§7.5).

### 7.2. Manifest semantyczny

**Aktualizacja 2026-11-17:** MG wybrał proponowane rodziny brakujących przypisań.
Aktywny profil `noe-m9-r07-v2` zachowuje paletę i geometrię r07/v1, dodając `creature`
(neutralny generic), `devices` (kolor tools) i `documents` (kolor salvage); pięć zdolności
wieloklasowych trafia do istniejącego `shared`. Przedmioty medyczne / chemiczne / zapalniki
zachowują swoje role, a czynności sprzętu mają `utility`. Manifest ma **782 tematy, 22 rodziny,
zero luk**; manekin i ramka celu są jawnymi wyjątkami. [Decyzja](dev/icons/m9-pass/family-approval.json),
  [zatwierdzony zestaw pikseli](dev/icons/m9-pass/finish-review.json). MG zatwierdził całość pod
  warunkiem poprawy Neodrugs, wszystkich Narkotyków i Cygaro; Batch 127 wykonał pięć poprawek
  (w tym Tornado), bez awaryjnego przycinania. **2026-11-18: 782 eksporty gotowe, paczki piaskownicy
  i kampanii przebudowane i zwalidowane.** [Decyzja](dev/icons/m9-pass/finish-approval.json),
  [sprawdzenia](dev/icons/m9-pass/rollout-verification.json). Profil v1 zachowany w `dev/icons/finish/profiles/`.

`dev/finish/manifest.json`, schemat `noe-finish-manifest/v1`, jeden wpis na temat:

| Pole | Znaczenie |
| --- | --- |
| `id` | Stabilny identyfikator tematu |
| `kind` | `icon`, `banner`, `texture`, `sign` albo `status` |
| `source`, `sourceSha256` | Względna ścieżka mastera i jego hash |
| `family`, `role` | Rodzina z `contentFamilies` profilu i rola: `character`, `equipment` albo `operation` |
| `canonicalSource` | Klasa, Pochodzenie albo `generic`; profesja dziedziczy klasę |
| `recipe` | `<id profilu>#<receptura>` |
| `opticalCorrection` | Opcjonalna, zatwierdzona korekta skali lub przesunięcia |
| `outputs` | Ścieżki i rozmiary (128 / 256) |
| `consumers` | Buildery, configi, lookupy cech i awansu, pasek — z audytu E1b |
| `review` | Status, data, notatki MG |
| `outputPixelSha256` | Hash zdekodowanych pikseli wyniku |

Reguły przypisania, rozstrzygnięte w przeglądach:

- Rodzina pochodzi z danych (typ i źródło w builderze/configu), **nigdy z nazwy pliku**. Brak przypisania albo kilka
  możliwych rodzin to błąd w raporcie, nie zgadywanie.
- Rola jest semantyczna: dokument `Item` może być sprzętem, a feat operacją sprzętu. Współdzielona czynność
  podstawowa i ogólna zdolność postaci to różne role.
- Źródło jest stałe: Sztuczka (np. Aramis) ma tło Generic niezależnie od klasy właściciela; zdolność nadana przez
  przedmiot zachowuje jawne źródło. Operacja broni zostaje operacją przy sprzęcie; samo wyposażenie nie zmienia receptury.
- Korzyść stała, zdolność mieszana i aktywowana mają tę samą recepturę — tło oznacza tożsamość, nie aktywność.
  Pasywności nie wyprowadzamy z `action: null` ani z koloru obrazka.

### 7.3. Receptury

| Rodzaj | Wejście | Operacja | Wyjście |
| --- | --- | --- | --- |
| icon · character | Biały master 256 (maska alfa) | Tło `ground` źródła z zaokrągleniem 3/44 boku + glif w kolorze `glyph` źródła; marginesy mastera bez zmian. Pochodzenia: tło `#dfd1b1`, glif `#161b20` | WEBP bezstratny: 128 px dla zdolności, 256 px dla klasy, profesji i Pochodzenia |
| icon · equipment | Jak wyżej | Glif w kolorze rodziny sprzętu, przezroczyste tło | WEBP bezstratny 128 px |
| icon · operation | Jak wyżej | Glif `#edf0f2`, przezroczyste tło | WEBP bezstratny 128 px; glify kontrolek UI zostają SVG z `--icon-fill` |
| sign | Profil | Figury A/B/R/I, skos niedostępności, „?” braku danych; geometria i kolory z profilu | SVG |
| status | `state-colors.mjs` | Istniejący `gen_status_numerals.mjs` pod orkiestratorem i `--check` | Bez zmiany ścieżek |
| banner | Master + receptura: kadr, punkt ogniskowy, ton dla archiwaliów | Kadr i skala bez zmiany geometrii źródła | WEBP stratny, szerokość 2× slotu |
| texture | Master bez szwu | Test szwu (przesunięcie o pół kafla), kafel 512 px | WEBP |
| tokens | Profil | CSS custom properties z §4.1 | `tokens.generated.css` |

Nie dodajemy obudowy, bevelu ani obrysu. **Koszty, użycia i stany pozostają na żywo** — bez bitmapy dla liczby,
klasy właściciela czy sytuacji bojowej. Dwukolorowość obiektowa wymagałaby autorskich masek; biały glif nie niesie
informacji o skórze, metalu i tkaninie — poza zakresem M9.

### 7.4. Walidacja i przegląd

- Po eksporcie, na pikselach: marginesy, alfa, obcięcie, rozmiar, kontrast pełnych kolorów ≥ 10:1 dla receptury character.
- `--preview` buduje stronę offline (jak `dev/visual/build-gallery.mjs`): każdy wynik przy 64/44/32/24/16 px,
  DPR 1 i 2, na `--noe-surface` i `--noe-panel`, także w skali szarości. Metryki i próbki kolorów nie dowodzą czytelności.
- `--check`: nieaktualne wyniki, brakujące lub podwójne przypisania, osierocone pliki, rozbieżne hashe → kod wyjścia 1.
- Walidator białych masterów nadal wymaga bieli; wykończenia mają osobny profil walidacji.
- Akceptacja wykończenia w kolejce `npm run review:icons` jako osobny rodzaj wpisu; wiąże hash źródła, id profilu
  i hash pikseli. Akceptacja glifu, geometrii i wykończenia są rozdzielne; dotychczasowe decyzje i notatki zostają.

### 7.5. Integracja

- Buildery i configi (`scripts/config/*-data.mjs`, lookupy cech i awansu, pasek) wskazują wyniki przez id manifestu;
  potem `npm run fvtt -- packs` i `validate-packs`. Paczek nie edytujemy ręcznie.
- Brak wykończenia → dotychczasowy biały master, nigdy pusty obrazek. ID i UUID dokumentów bez zmian.
- Świat: raport dokumentów ze starymi ścieżkami (m.in. embedded items aktorów) i migracja z kopią zapasową na wzór
  `dev/icons/apply_live_world_icon_repoints.mjs`. W świecie kampanii tylko na polecenie MG.
- **Pilot E2:** 24 tematy (6 klas, 2 profesje, 2 Pochodzenia, 2 zdolności Pochodzeń, 3 Sztuczki, 3 zdolności klasowe,
  4 rodziny sprzętu, 2 czynności broni), osobno przykłady stanów, banery pięciu kart i komplet znaków. Co najmniej
  jeden konsument przez config/trait lookup, nie tylko `item.img`. Kolejność: porównanie eksportu → karta
  w piaskownicy → cała biblioteka.

## 8. Egzekwowanie języka

Spójność ma przetrwać M9 i kolejne funkcje. Pięć mechanizmów:

1. **Trwały dokument.** Po akceptacji E3 treść §2–§4 przechodzi do `DESIGN.md` w katalogu głównym, obok DEV_GUIDE:
   zasady, tokeny, komponenty i checklista. Ten plan zostaje zapisem wdrożenia. AGENTS.md (Rules) dostaje jedną linię:
   UI wyłącznie z tokenów i komponentów `DESIGN.md`, zapadka w `npm test`.
2. **Zapadka w `npm test`** — `dev/style/ratchet.mjs`, bez zależności:
   - w `styles/**/*.css` poza `styles/noe/tokens*.css` liczy literały kolorów (hex, `rgb()`/`rgba()`, `hsl()`,
     nazwy kolorów), `font-family` z nazwą kroju i `animation` bez obsługi `prefers-reduced-motion`;
   - w `scripts/**/*.mjs` i `templates/**/*.hbs` liczy atrybuty `style="…"` z kolorem, tłem, obramowaniem lub krojem;
     dynamiczne wymiary (`width:${x}px`) są dozwolone;
   - baza `dev/style/baseline.json` per plik; test pada, gdy licznik rośnie albo nowy plik ma więcej niż 0;
     `--update` tylko obniża bazę;
   - allowlista `dev/style/allowlist.json`, każdy wpis z powodem: rysunek canvas/PIXI (`poscig-art`, `poscig-themes`,
     `caliber-vfx`, tracery), OSD drona, panele debug (`sound-debug-panel`, `tracer-debug-panel`), panele Poligonu;
   - selektory rdzenia (`#sidebar`, `#chat-log`, `#hotbar`, `#controls`, `#players`, `#notifications`) w nowym CSS
     wymagają wpisu w allowliście (D13); istniejące wyjątki (`#pause`, `.waypoint-label`) dostają wpis z powodem.

   Stan wyjściowy bazy: CSS — 484 hex + 235 `rgb()` w trzech arkuszach (177 różnych wartości); `.mjs` — 353 `style="`.
   **Bramka bety (D17): 0 dla CSS widocznego dla gracza poza allowlistą.** Inline w `.mjs` maleje z każdą
   przestylowaną powierzchnią.
3. **Kontrakt stylu w Quench.** Dla każdej otwartej powierzchni w zakresie: `.noe.themed.theme-dark` na elemencie
   głównym także przy jasnym interfejsie; żaden widoczny element nie ma wyliczonego `font-family` z Modesto, Amiri
   ani Roboto Slab; brak widocznej ramki `.gold-icon`; brak tła z `ui/official/banner-`; brak `filter` na karcie PC.
   Rdzeń pozostaje nietknięty: sidebar i log czatu nie mają `.noe`.
4. **Dowody wizualne.** `dev/visual/capture-audit.mjs`: pary przed/po dla każdego ID z §5.4 w galerii z datą;
   warstwa 6 dla zmian UI ([TESTING.md](TESTING.md) §3); sondy Garderoby i Galerii aktualizowane razem z powierzchnią.
5. **Checklista hand-off** (w `DESIGN.md`): tylko tokeny i komponenty; sygnały z §3 przez pomocniki `scripts/ui/`;
   kolor nigdy sam (P4); focus i powód bez hover; wymuszony ciemny; zrzut przed/po; zapadka zielona.

<a id="delivery"></a>
## 9. Etapy

| Etap | Rezultat | Warunek przejścia |
| --- | --- | --- |
| E0 — tablica i decyzje | **Zakończone:** proposal 07 i profil `noe-m9-r07-v1` (§0.1, 2026-11-15), tło PC (§0.2), decyzje wdrożeniowe (§0.3, 2026-11-16) | Spełnione |
| E1a — inwentarz | **Zakończone:** [33 rodziny, 14 zrzutów](AUDIT_m9_ui.md) | Spełnione |
| E1b — specyfikacja | (1) manifest semantyczny ikon z konsumentami i raportem braków; (2) pełna mapa mostu dnd5e z `dark.less`; (3) makieta tokenów i K1–K18 (statyczny HTML w `dev/visual/`) z wartościami semantycznymi (O2); (4) baza zapadki; (5) selektory i hooki dla każdego ID z §5.4 oraz lista forków (D19) | MG akceptuje makietę tokenów i komponentów; brak sprzeczności z M8 |
| E2 — silnik i pilot | `build:finish` dla tokens, icons, signs, status i banners (textures tylko przy O3); pilot 24 ikon, pięć banerów, znaki; `--check` w `release:check`; wiersz w AGENTS | Jakość rzeczywistych eksportów przy 44 px i pozostałych skalach; receptur nie wybieramy ponownie |
| E3 — pionowy wycinek | Po scaleniu M8: Roboto Mono, `tokens*.css`, most, `components.css`, wymuszony ciemny motyw; PC (ekwipunek + zdolności), jeden pełny przepływ użycia i rzutu, karta czatu; kontrakt stylu w Quench; zapadka w `npm test` | MG ocenia całość, kadr i siłę grafiki; warstwa 6 i zrzuty przed/po; zgoda na rollout; potem `DESIGN.md` |
| E4 — karty i okna | ID 01–25 i 28 z §5.4 | Długie polskie teksty, edycja, drag/drop i dostęp gracza działają; zrzuty przed/po |
| E5 — czat, biblioteka, HUD | ID 26 i 29–33; pełna biblioteka ikon z manifestu; migracja świata na polecenie MG | Fuksy, Forsowanie i adnotacje zachowane; ID stabilne; każda rodzina ma dowód lub jawny wynik przeglądu |
| E6 — odbiór bety | Macierz §10, Poligon, `docs/` (z informacją, że motyw arkusza nie działa na okna NOE), zdjęcia do zwiastuna; zapadka = 0 dla CSS gracza | MG akceptuje M9; bramki wydania zielone |

Szacunek wdrożenia po E1b. Liczba przeglądów jakości i zakres zmian układu decydują o koszcie; wcześniejsze
„1–2 tygodnie stylów” w drodze do bety to orientacja, nie zobowiązanie.

<a id="progress"></a>
### Stan wdrożenia — aktualizacja 2026-11-18

**Bieżący stan grafiki:** 782 zatwierdzone eksporty, 22 rodziny, zero luk. Batch 128 zamyka kropkę
Trucizny i dwie pozostałe poprawki broni zatwierdzonym normalizerem po odrzuceniu usługi obrazu.
Brak otwartych potwierdzonych zleceń grafiki M9; nie regenerować całej biblioteki.

**Poligon odświeżony 2026-11-18:** kopia `2026-11-18_poligon-przed-m9` (pełna, sprawdzona) → `poligon:init`
(moduł, `module.json`, loader, własne paczki, walidacja; świat zachowany) → siedzenia MG + Gracz 1–3. Style,
pięć banerów i Roboto Mono ładują się; karty PC/BN/pojazdu/drużyny/przedmiotu ciemne także przy jasnym
interfejsie, rama rdzenia poza zakresem; karty czatu w zakresie u MG i gracza. Istniejące dokumenty:
`npm run poligon:ikony` (plan → `--apply` z dziennikiem cofnięcia) — 6002 pola obrazów w 6345 przedmiotach
(osoby, BN, delty żetonów, Poligon · Obsada; 5640 z wiązań manifestu, 362 z reguły runtime), drugi przebieg 0.
65 pól zostaje na białych masterach — 15 obrazów bez żadnego eksportu (prowiant, pięć Surowców, strzały,
sprzęt WKK) plus czynność kaczuszki i Robota-pałka (niejednoznaczne): realne braki przypisań przedmiotów
tworzonych w runtime, raport `logs/poligon/ikony-m9/`. Galeria odświeżona w miejscu (44 px, pokrycie, 22 strony
rodzin, 81 wspólnych glifów); sonda `m9-finish-routing` obejmuje poprawki partii 128. Stanowiska nie resetowane.
Dalej otwarte: decyzja MG o 15 obrazach bez eksportu, E3 (szerszy odbiór), E4–E6 i błąd testu UI ResizeObserver.
[Handoff dla agenta kodującego](HANDOFF_m9_graphics_to_code.md).

Poniższa tabela opisuje historyczny wycinek z 2026-11-17; liczby 488 tematów / 24 piloty oraz
dawne braki przypisań nie są bieżącymi zadaniami grafiki.

Kolejność planu zachowana co do treści, ale E3 nie czekało na formalną akceptację makiety: wycinek jest próbą
tych samych tokenów na prawdziwej karcie, a wszystkie wartości do decyzji MG są w jednym pliku (`styles/noe/tokens.css`).
M8 jest już na gałęzi `m8-ruch-ekonomia`, na której powstał wycinek.

| Etap | Zrobione | Otwarte |
| --- | --- | --- |
| E1b | (1) manifest `dev/finish/manifest.json` (488 tematów, rodziny z danych paczek) + [REPORT.md](dev/finish/REPORT.md) braków; (2) most `styles/noe/dnd5e-bridge.css` z mapą `dark.less`/`base.less` dnd5e 6.0.6; (3) [makieta K1–K18 i O2](dev/visual/m9-components/index.html) z prawdziwych arkuszy i pomocników; (4) zapadka `dev/style/` z bazą i allowlistą; (5) hooki: `scripts/ui/theme.mjs` (zakres), `scripts/ui/sheet-rows.mjs` (K6–K10). Forków szablonów dnd5e: zero | O2 zatwierdzone 2026-11-17. **MG:** kolory mierników PW/KW, akceptacja K1–K18. ~~Braki manifestu~~ rozstrzygnięte profilem `noe-m9-r07-v2` (782 tematy, 22 rodziny) |
| E2 | `npm run build:finish` (tokens, signs, status, icons, banners; `--check`, `--preview`, `--dry-run`, `--ids`); pilot 24 ikon WEBP bezstratnych; pięć banerów D14 (WEBP q80, 2× slotu); znaki A/B/R/I, skos, „?”; podpięcie pod paczki po id dokumentu i pod lookup kodu (`finished-icons.mjs`); wiersz w AGENTS; `--check` w `release:check` | **MG:** ocena eksportów w podglądzie (44 px i pozostałe skale) i kadrów banerów; tekstury (O3) niepotrzebne w wycinku |
| E3 | Roboto Mono (`fonts/roboto-mono/`, OFL), `tokens*.css`, most, `components.css`, wymuszony ciemny motyw (karty, okna dnd5e, karty czatu); karta PC (nagłówek K2, tabliczki K3, szyna K4, sekcje K5 z akcentem klasy i polskimi etykietami, wiersze K6–K10, mierniki K11, panel Stan i pas na tokenach, filtr PC usunięty); okno rzutu ataku; karty czatu K16 i pasek po rzucie jako K12; Quench `styl-m9` 14/14; zapadka w `npm test`; zrzuty „po” `dev/visual/reference/2026-11-17/` (para do 2026-11-15); sondy Garderoby „Wygląd M9” | **MG:** ocena całości, kadru i siły grafiki → zgoda na rollout; potem `DESIGN.md`. Warstwa 6, 2026-11-17: `postac`, `zdolnosci-karty`, `zdolnosci-po-rzucie`, `combat` zielone; `boot` czerwony wyłącznie przez okno testowe 1024 × 749 (Foundry wymaga 768 px wysokości) — środowisko, do powtórzenia; pełna bramka wydania przed rolloutem |

**Runda uwag MG, 2026-11-17** (na zrzutach): O2 zatwierdzone. Edytor aktywności — druga kreska pod napisem
aktywnej zakładki (złote 3 px dnd5e na `span`/`label`) usunięta. Karta BN — szare pudełko TT zastąpione jedną
stalową ramą „dwóch zrośniętych pęcherzy” wokół portretu i TT (`ui/noe/signs/npc-frame.svg`, geometria
`NPC_FRAME` w `dev/finish/signs.mjs`); pasek PW wychodzi spod małego pęcherza pod portretem, nie przez obraz
(nagłówek +40 px). Karta PC (prostokątny portret): TT, Inicjatywa, Szybkość, Biegłość w jednym rzędzie czterech
tabliczek (TT sam w rzędzie zostawiał dwie puste połówki; etykiety wąskim krojem); panel Stan — wspólny wcięty brzeg
etykiet i jedna podziałka pipek (14 px w komórce 20 px, BN 11/14 px), więc tory i kreski Skażenia stoją w tych
samych kolumnach; Skażenie czytelne (było `#3d3d3d` z szarości dnd5e na grafitowym panelu), kreski większe i na
tokenach (pusta = pusta pipka, trzecia w kolorze zagrożenia). Nagłówki sekcji (K5) jednym językiem na
każdej karcie: uniesiony grafit, pogrubiony tytuł, pasek 3 px i kreska u dołu w akcencie — klasy, rodziny
sprzętu (`data-noe-family`: sekcje dnd5e po typie dokumentu, Zasoby po panelu) albo neutralnej stali; czerwone
i zielone tła Zasobów (style w atrybutach skryptów `*-inventory.mjs`) usunięte razem z barwionymi wierszami i
przyciskami „Dodaj …” (wspólne klasy `noe-zasoby-*`). Kość Inicjatywy BN nad ramą; podpowiedzi pól mierników
(TYMCZ., +MAKS.) wąskim krojem 10 px — mieszczą się. Karta PC: jedno wcięcie 8 px — portret w stalowej ramce
(wcześniej obraz wystawał poza nią do krawędzi karty), tabliczki i paski PW/KW na tych samych krawędziach, 8 px
oddechu pod paskiem KW. Do decyzji MG: wariant ramy rysowany vs. teksturowany
(prompt do generatora obrazów w odpowiedzi agenta), kolory mierników (tekst na wypełnieniu 3,2–3,8 : 1 < 4,5 : 1 —
propozycja przyciemnienia), reguły rodzin dla braków manifestu. Quench `styl-m9` w świecie `agent-e2e-20261117`:
13/14 przez „ResizeObserver loop” przy karcie PC w trybie jasnym — tak samo bez zmian tej rundy (środowisko/świat).

Zapadka po wycinku: kolory 749 → 705 → 688 (rundy uwag), kroje 21 → 19 → 18, inline 158 → 130 (nagłówki, wiersze i przyciski Zasobów; reszta — E4/E5). Migracja świata kampanii:
nie wykonana i niepotrzebna dla wycinka (istniejące dokumenty zachowują białe mastery; nowe i odbudowane paczki
dostają wykończenia) — tylko na polecenie MG (§7.5).

<a id="acceptance"></a>
## 10. Macierz odbioru i definicja końca

| Sprawdzamy | Wymagany rezultat / dowód |
| --- | --- |
| Rozpoznanie | Zadania: znajdź B, odróżnij R od korzyści stałej, wskaż brak użyć i ostrzeżenie budżetu. Porównanie z dotychczasowym UI; obserwacje MG/gracza, bez deklarowania niezmierzonej poprawy szybkości |
| Czytelność | 44 CSS px jako rozmiar roboczy; 16/24/32/48/64 jako dodatkowe skale i fallback konsumentów. Normalne powiększenie, DPR 1/2, na `--noe-surface`, `--noe-panel` i nad banerem, w skali szarości; znaczenie bez odczytania koloru |
| Stany | Gotowe, aktywne, pasywne, mieszane, wyzwalacz, brak danych, 0 użyć, >99 użyć, zakaz i przekroczony budżet; także kombinacja aktywne + 0 użyć |
| Kontrolki | Widoczny hover, focus i wybór; klawiatura; opis i powód bez hover; brak blokady z samego ostrzeżenia M8 |
| Karty | PC, BN, przedmiot i próbki rodzin z §5.4; długie nazwy i diakrytyki, małe okno, długa lista; selekcja, edycja, rozwijanie i przeciąganie działają |
| Czat / PM13 | Pełna i zwinięta karta; pasek Fuksa/Forsowania, adnotacje i powiązany rzut widoczne; brak zduplikowanych kontrolek |
| Wymuszony ciemny motyw | Przy jasnym interfejsie Foundry wszystkie powierzchnie z D12 są ciemne; menu kontekstowe dziedziczy motyw; rama rdzenia bez zmian |
| Spójność | Zapadka = 0 dla CSS widocznego dla gracza; kontrakt stylu w Quench zielony; `DESIGN.md` opisuje zasady, tokeny, komponenty i checklistę; AGENTS wskazuje na niego |
| Integracja ikon | Manifest bez zgadywanych mapowań; białe mastery nienaruszone; wykończenia WEBP 128/256 zgodnie z D15, z akceptacją i hashem; brak podwójnych ramek |
| Grafika | Banery D14 w pięciu slotach; jawne decyzje G2–G7; tekst i kontrolki czytelne, kadry sprawdzone w małym oknie; mastery, pochodzenie i CREDITS; brak stockowego smoka i innych niezamierzonych motywów 5e |
| Dane i odtwarzanie | `build:finish` odtwarza wynik, `--check` zielone, walidacje paczek zielone; brak zmiany ID i niezamierzonej migracji świata |
| Regresja | Dla zmienionego UI sandbox i warstwa 6 ze zrzutami zgodnie z TESTING; właściwe testy statyczne i pełna bramka wydania przed betą |
| Odbiór MG | Uzupełnione sondy Garderoby i Galerii; po zmianach czatu również właściwe sondy rzutów; reseed wyłącznie na prośbę MG |
| Materiały | `docs/` opisuje nowe sygnały; IMPLEMENTATION zgodne; reprezentatywne zdjęcia karty, ekwipunku, zdolności, walki i czatu do zwiastuna |

M9 kończy się po akceptacji wspólnego języka i wdrożonych powierzchni przedbetowych, z dowodami macierzy.
Tablica, plan i sam eksport ikon nie zamykają etapu. Grafika G1–G7 jest częścią M9. Ponowne ilustracje całej
biblioteki, dodatkowe ozdobne tekstury, animowany HUD, jasny motyw i pełna wymiana układu 5e nie są wymaganiami.

## 11. Wejścia techniczne

- [Historia przeglądów](dev/art/m9/HISTORIA.md), [studium ikon i normalizacji](PLAN_icon_design.md),
  [potok białych glifów](dev/icons/Pipeline.md), [kontrakt przeglądu](dev/icons/review/README.md),
  [braki grafiki](dev/icons/MISSING.md).
- [Style](styles/neuroshima.css), [pasek](scripts/actors/ability-hotbar.mjs),
  [ekonomia akcji i ruch](PLAN_m8_ruch_i_ekonomia_akcji.md), [state-colors.mjs](scripts/config/state-colors.mjs).
- [PM13 i D8](PLAN_migracja_dnd5e6.md), [testy i wymagania UI](TESTING.md),
  [Garderoba](dev/poligon/stations/garderoba.mjs), [Galeria](dev/poligon/stations/galeria.mjs).
- [Inwentarz 33 rodzin UI](AUDIT_m9_ui.md), [źródła i narzędzia audytu](dev/visual/README.md),
  [galeria rzeczywistych kart przed przebudową](dev/visual/reference/2026-11-15/index.html).
- Grafika: [przegląd 01](dev/art/m9/index.html), [02](dev/art/m9/r02/index.html), [03](dev/art/m9/r03/index.html),
  [manifest r02 z recepturą Survey](dev/art/m9/r02/manifest.json), [zapis wyboru PC](dev/art/m9/selection.json).
- dnd5e 6.0.6 (folder „dnd5e Source”): `less/variables/dark.less` (zmienne do mostu),
  `module/applications/components/icon.mjs` (`<dnd5e-icon>`), `module/utils.mjs` (`generateIcon`: SVG → `<dnd5e-icon>`,
  raster → `<img>`), `templates/inventory/inventory.hbs`, `templates/chat/parts/card-header.hbs`.
- Rdzeń v14: `client/applications/api/document-sheet.mjs` (motyw arkusza), `client/applications/ux/context-menu.mjs`
  (dziedziczenie `.themed`), `public/css/foundry2.css` (kolejność warstw), `dist/server/views/view.mjs` (domyślne
  warstwy `system`/`modules` dla stylów pakietów).
- Tablica przeglądu M9: vault kampanii, `Integracje/icon-design-2026-10-18/` (poza repo); eksport przeglądu ma schemat
  `noe-m9-style-review/v1`. Prototyp CSS z zatwierdzonych glifów, nie generator assetów.
