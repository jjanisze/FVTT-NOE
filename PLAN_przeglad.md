# PLAN — Przegląd ludzki całej treści (przed betą i w becie)

> Status: **PROJEKT** (2026-11-22, decyzje MG P-D1–P-D11 w §1). Właściciel przeglądu: MG; agenci budują rejestr,
> przygotowują kolejki, triażują wyniki i poprawiają. **Przegląd nie blokuje bety** (P-D2) — kandydat publikuje listę
> tego, czego człowiek jeszcze nie widział. Droga do bety: [PLAN_beta.md](PLAN_beta.md) §0.
>
> Repozytorium jest publiczne: w rejestrze tylko identyfikatory, statusy i krótkie notatki — bez cytatów NOE (liczby,
> parafrazy i numery stron), bez fabuły kampanii.

---

## 0. Po co

Prawie całą treść modułu napisali agenci: kod, dane paczek przepisane z NOE, opisy zdolności, zasady WKK, odczyty RAI,
dokumentację dla graczy i wygląd. Testy (Quench 1663, 54 paczki e2e) dowodzą, że kod robi to, co agent zrozumiał —
nie dowodzą, że to zgadza się z lekturą MG, dobrze się gra i czyta. Formalnego przejścia na Poligonie nie miał żaden
kamień: M3 i M5 MG przeszedł wycinkami przy wdrożeniu, weto M4 (Garaż, Pościg, Stajnia), obchód „Sali prób” (M7),
stanowisko `ruch` (M8) i Garderoba/Galeria (M9) czekają. Ten plan daje **jedną listę wszystkiego** ze statusem,
kolejność według stycznia, protokół sesji i pętlę agentów po sesji.

---

## 1. Decyzje MG (2026-11-22)

| ID | Decyzja |
|---|---|
| P-D1 | **Zakres: wszystko.** Mechanika i UX na Poligonie, treść kompendiów względem NOE, zasady WKK i odczyty RAI, dokumentacja dla graczy, wygląd M9 w kontekście, higiena publicznego repo, `README.md` i strona startowa huba (`fvtt hub`) |
| P-D2 | **Przegląd nie blokuje bety.** Beta wychodzi z publiczną listą pozycji nieprzejrzanych (§3.7) |
| P-D3 | Termin bety bez zmian: kandydat na początku grudnia, beta w połowie grudnia; tniemy zakres, nie termin |
| P-D4 | Budżet MG: **mniej niż 5 h tygodniowo**, na razie bez innych przeglądających (zmieni się później) |
| P-D5 | **Rejestr w repo** (`dev/review/`), generowany z paczek, rejestrów pokrycia i prób Poligonu; widok w hubie; triaż robią agenci |
| P-D6 | **Kolejność według potrzeb styczniowej kampanii „Za garść gambli”**: tworzenie postaci poz. 1–3, walka, handel, postój |
| P-D7 | Treść i zasady przegląda się **w hubie**: rekord modułu obok źródła NOE (czytanego z prywatnego vaultu w chwili wyświetlenia, nigdy nie commitowanego), przyciski jak w przeglądzie ikon |
| P-D8 | Drobne decyzje (M8, M9) — **domyślne agenta teraz**, MG ocenia je w rejestrze (§7) |
| P-D9 | M9 E4–E5 idą bez czekania na podpis E3; E3 i reszta wyglądu wchodzą do rejestru |
| P-D10 | Wydanie v0.22.0 z całą bieżącą pracą (M7, M8, M9 w toku) — stabilna baza przeglądu |
| P-D11 | Zakończone i zastąpione plany idą do `archive/` (bez kasowania) |

---

## 2. Co jest do przejrzenia — skala

| Rodzaj | Ile (2026-11-22) | Gdzie MG ogląda | Skąd pozycje |
|---|---|---|---|
| Próby Poligonu | **285** w 28 stanowiskach: Garaż 50, Ruch 39, Pościg 33, Hangar 28, Garderoba 16, Poziomy 16, Stajnia 12, Strzelnica 12, Sala prób 12, Arena 11, Lazaret 8, Kreator 7, Kuźnia 6, Bazar 6, Ciemnia 6, Galeria 6, Droga 5, Złomowisko 5, Bestiariusz 3, Magazyn 3, Plac 1 | panel Poligonu (✅/❌/💬 z commitem — już istnieje) | `dev/poligon/stations/*.mjs` |
| Treść kompendiów | 19 paczek, ok. 1835 rekordów: 6 klas, 18 profesji, 133 zdolności klas i profesji, 53 Sztuczki, 12 Pochodzeń i 36 ich zdolności, 51 istot (260 zdolności), 14 pojazdów, 6 szablonów towarzyszy, 26 tabel (407 wyników), broń, pancerze, amunicja, magazynki, granaty, leki, narzędzia, sprzęt, schematy | hub: rekord obok NOE | budowniczy paczek, rejestry pokrycia |
| Zasady i odczyty | 47 zasad WKK (`docs/Kobalt.md`), tabela RAI (`scripts/wkk/README.md`), 17 pytań do autora i D15 (`PLAN_tt.md`) | hub | te pliki |
| Dokumentacja | 19 plików `docs/`, `README.md`, strona startowa huba | hub (sekcja po sekcji) | nagłówki `##` |
| Wygląd | 33 rodziny UI (`AUDIT_m9_ui.md`), karty czatu; 782 ikony — biblioteka zatwierdzona 2026-11-18, w kontekście jeszcze nie | Poligon (Garderoba, Galeria) i hub | audyt M9 |
| Higiena repo | cały `git ls-files` | raport agenta, MG wyrywkowo | skan (§8) |

**Pojemność.** Przy < 5 h tygodniowo i trzech tygodniach do bety MG ma ok. 12–15 h. To wystarcza na falę A (§4) —
kilkadziesiąt prób i kilkaset rekordów obejrzanych obok NOE — nie na całość. Reszta idzie w becie (fala B) albo
zostaje przy testach (fala C). Dlatego rejestr musi pozwalać przejrzeć rekord w kilkadziesiąt sekund: bez szukania
strony NOE, bez otwierania Foundry dla danych, z klawiaturą.

---

## 3. Rejestr przeglądu (`dev/review/`)

### 3.1. Pozycja

Najmniejsza rzecz, którą MG może uznać za dobrą albo złą. Identyfikator stały i czytelny:

| Rodzaj | Id | Przykład |
|---|---|---|
| próba | `proba:<stanowisko>/<próba>` | `proba:ruch/szablon-paska` |
| rekord paczki | `paczka:<paczka>/<id dokumentu>` | `paczka:sztuczki/<id>` |
| zasada WKK | `wkk:<nr>` | `wkk:32` |
| odczyt RAI | `rai:<kamień>/<n>` | `rai:m5/4` |
| pytanie do autora | `autor:<n>` | `autor:7` |
| sekcja dokumentacji | `doc:<plik>#<kotwica>` | `doc:Ruch-i-teren#skok` |
| rodzina UI | `ui:<ID z AUDIT_m9_ui>` | `ui:26` |

Pola: id, rodzaj, tytuł, plik i rekord źródłowy, strona NOE (`s. N`, gdzie wiadomo), warstwa (NOE / RAI / WKK),
fala (A/B/C, §4), **odcisk** (hash znormalizowanej treści — §3.3).

### 3.2. Pliki

- `dev/review/items.json` — **generowany** (`npm run build:review`), nigdy ręcznie; śledzony w git, żeby diff pokazał,
  co przybyło.
- `dev/review/ledger.json` — statusy; pisze go **jeden pisarz**: hub (przyciski) albo importer w zadaniu huba (§3.5).
- Tekst NOE nigdy nie trafia do repo: hub czyta go z vaultu (rejestr huba, `roots`) przy wyświetleniu. Test pilnuje,
  że notatki w `ledger.json` są krótkie (limit znaków) i nie zawierają długich cytatów.

### 3.3. Statusy i odcisk

`nowe` (nieprzejrzane) · `ok` · `do poprawy` (z odnośnikiem: uwaga Poligonu, commit, § planu) · `pytanie` (do autora
albo decyzja MG) · `pominięte` (świadomie, z powodem) · `nieaktualne` — odcisk zmienił się po `ok`, pozycja wraca do
kolejki. Ten sam mechanizm co „zmiany od werdyktu” w panelu Poligonu, ale po treści, nie po commicie: przebudowa
paczek bez zmian w rekordzie nie może wyrzucić całej listy (odcisk pomija pola zmienne — `_stats`, kolejność, ścieżki
obrazów spoza tematu).

### 3.4. Generator

Źródła, każde w osobnym module z testem: budowniczy paczek (`dev/packs/build-packs.mjs --out=<tmp>`), rejestry pokrycia
(`config/class-features-coverage.mjs`, Sztuczki, Pochodzenia), stanowiska Poligonu (wpisy `p(...)`), `docs/Kobalt.md`
(numerowane zasady — ten sam parser co `kobalt-doc-check`), tabela RAI, `docs/Pytania-do-autora.md`, nagłówki `docs/`,
`AUDIT_m9_ui.md`. Mapowanie rekord → strona NOE: z pól, które budowniczy już ma (Bestiariusz i klasy idą z Markdownu
NOE), dla reszty z tabeli w generatorze; brak strony to pozycja z oznaczeniem „bez źródła”, nie zgadywanie.

### 3.5. Import tego, co już jest

- Werdykty prób z ustawienia świata Poligonu `poligonWerdykty` i uwagi z dziennika „Poligon · Uwagi” →
  `fvtt review:sync` (zadanie huba; Poligon musi działać albo jest eksport z `poligon:findings`).
- Biblioteka ikon: `dev/icons/m9-pass/finish-approval.json` → pozycje ikon jako `ok` (zatwierdzone 2026-11-18).
- Werdykty MG zapisane wcześniej w planach (D/U przyjęte w rundach) **nie** stają się `ok` dla treści — to decyzje
  projektowe, nie przegląd wyniku.

### 3.6. Widok w hubie

Strona „Przegląd”: kolejka z filtrami (fala, rodzaj, status, stanowisko/paczka), licznik fali. Rekord: po lewej to, co
zobaczy gracz (opis, liczby, aktywności, efekty, plakietka pokrycia), po prawej fragment NOE ze wskazanej strony;
przyciski ✅ ok · ❌ do poprawy · ❓ pytanie · ⏭ pomiń z krótką notatką; klawiatura (następny/poprzedni, 1–4). Dla prób
— skrót do panelu Poligonu zamiast duplikowania werdyktu. Hub zostaje narzędziem deweloperskim: poza `module.zip`.

### 3.7. Raport

`fvtt review:status [--md]` — stan na fale i rodzaje. Przy kandydacie generowany `docs/Stan-przegladu.md`: publiczna
lista tego, co człowiek przejrzał, a czego nie (P-D2) — sama lista identyfikatorów i tytułów.

---

## 4. Fale — kolejność według stycznia (P-D6)

**Fala A — przed betą** (to, czego dotknie stół „Za garść gambli”):

| # | Obszar | Poligon | Treść i dokumentacja |
|---|---|---|---|
| A1 | Tworzenie postaci poz. 1–3 | Kreator (7), Sala prób (12) | 6 klas, 18 profesji z biegłościami, zdolności poziomów 1–3 (zakres D2 M7), 53 Sztuczki, 12 Pochodzeń i 36 zdolności; `Pierwsze-kroki`, `Zdolnosci` |
| A2 | Walka | Strzelnica (12), Arena (11), Lazaret (8), Ruch (wybór ~15 z 39, w tym `szablon-paska`) | broń, amunicja, magazynki, granaty i pancerze, których używają pregeni i scenariusz; istoty ze scenariusza; `TT-i-reakcje`, `Umieranie-i-zdrowie`, `Ruch-i-teren` |
| A3 | Handel i postój | Bazar (6), Droga (5) | tabele handlu, leki, sprzęt; `Handel-i-postoj` |
| A4 | Wygląd po stronie gracza | Garderoba (16) — wycinek E3, karty czatu | decyzje domyślne z §7 |
| A5 | Wejście | — | `README.md`, `docs/README.md`, strona startowa huba |

Listę „treść, której używa scenariusz” agent składa z planu modułu treści w repo map (`PLAN_Za_Garsc_Gambli_Module.md`)
i prywatnego tekstu scenariusza; MG ją potwierdza przed pierwszą sesją (R1).

**Fala B — w becie** (grudzień–styczeń): pojazdy, pościg, wierzchowce (Garaż 50, Pościg 33, Stajnia 12), towarzysze i
drony (Hangar 28), produkcja (Kuźnia), szabrowanie i bebeszenie (Złomowisko), Poziomy, Ciemnia, Bestiariusz (51 istot),
47 zasad WKK, tabela RAI, reszta `docs/` i reszta treści paczek, okna M9 z E4–E5.

**Fala C — zaufanie do testów albo próbka**: domknięcie tabel (`validate-packs`), biblioteka ikon (zatwierdzona),
migracje, okna tylko dla MG; MG ogląda próbkę, nie całość.

Kolejność wewnątrz fali A ustala agent na każdą sesję (§5) tak, żeby jedna sesja zamykała jeden obszar.

---

## 5. Sesja przeglądu — protokół

**Przed (agent):** Poligon na bieżącym commicie (`fvtt poligon:init`, gdy `doctor` mówi „stale”; bez resetu stanowisk),
kolejka sesji w hubie (tyle, ile zmieści się w ~1,5 h), na górze „co się zmieniło od ostatniej sesji” i znane błędy.

**W trakcie (MG):** `fvtt hub` → „Przegląd” → start. Poligon z huba (`poligon:start --seats=N`), werdykty w panelu,
treść w hubie; rzeczy złożone — Uwaga ze zrzutem.

**Po (agent, przed następną sesją):** `fvtt review:sync` i triaż każdego ❌, ❓ i Uwagi:

- poprawka → commit z identyfikatorem pozycji w treści; odcisk się zmienia, pozycja wraca do kolejki jako `nieaktualne`
  (MG potwierdza poprawkę jednym kliknięciem);
- po becie → `PLAN_1_0.md` z odnośnikiem; pytanie do autora → `docs/Pytania-do-autora.md`;
- uwaga Poligonu oznaczona (`game.poligon.uwagi.oznacz`), w rejestrze link.

**Co blokuje betę mimo P-D2:** zmiana modelu danych (B2), utrata danych, awaria w obszarze fali A. Reszta to poprawki
w wydaniach bety.

---

## 6. Etapy wdrożenia (agenci)

| Etap | Rezultat | Gotowe gdy |
|---|---|---|
| R0 | `dev/review/`: generator (`build:review`), `ledger.json`, strona „Przegląd” w hubie, `fvtt review:status`, `npm run test:review` (w `npm test`) | MG przegląda 10 rekordów w kilka minut bez pomocy agenta |
| R1 | Fale: reguły przypisania, lista treści scenariusza | MG potwierdza falę A |
| R2 | Import: werdykty i uwagi Poligonu, biblioteka ikon; zamknięcie nieaktualnych uwag (dwie z 2026-10-12 — Cichy krok i zasilanie drona — są naprawione w kodzie, w dzienniku nadal „otwarta”) | `review:status` zgadza się z panelem Poligonu |
| R3 | `docs/Stan-przegladu.md` przy kandydacie | lista w wydaniu kandydującym |
| R4 | W becie: zgłoszenia testerów (GitHub Issues) z odnośnikiem do pozycji | gdy dojdą inni przeglądający (P-D4) |

R0 i R1 idą przed pierwszą sesją fali A; do tego czasu MG może przechodzić próby Poligonu tak jak dziś — werdykty
zostaną zaimportowane.

---

## 7. Kolejka decyzji MG — wartości domyślne (P-D8)

| Decyzja | Domyślne agenta (obowiązuje od 2026-11-22) | Gdzie MG ocenia |
|---|---|---|
| M8: sześć list decyzji klasowych paska | obecne `SZABLONY` (`config/pasek-data.mjs`) | `proba:ruch/szablon-paska` |
| M9: kolory mierników PW/KW (tekst 3,2–3,8 : 1) | przyciemnione wypełnienie do ≥ 4,5 : 1 | Garderoba `m9-karta` |
| M9: rama BN — rysowana czy teksturowana | rysowana (`ui/noe/signs/npc-frame.svg`) | Garderoba |
| M9: 15 obrazów bez eksportu (prowiant, pięć Surowców, strzały, sprzęt WKK) i dwa niejednoznaczne (czynność kaczuszki, Robota-pałka) | reguły rodzin, bez nowej grafiki | Galeria |
| M9 O1: dymki mowy (rdzeń) | poza zakresem (D13) | — |
| M9 O4: dzienniki w stylu NOE | poza zakresem | — |
| D15: krytyk bez obrażeń a Stopień Zranienia | bez Stopnia (obecny odczyt) | pytanie do autora |
| 17 pytań do autora | obowiązują odczyty modułu z `docs/Pytania-do-autora.md` | `autor:*` |

---

## 8. Rozjazdy znalezione przy syntezie (2026-11-22)

| Rozjazd | Stan |
|---|---|
| Macierz IMPLEMENTATION: Skakanie ❌, wiersz M8 „Zostaje: Nożownik bez celu…”, Bieganie „moduł nie pilnuje ruchu” | poprawione 2026-11-22 |
| `docs/FAQ.md`, `docs/Zmiany-wzgledem-dnd5e.md` — twierdziły, że nie ma towarzyszy, dronów, handlu i pojazdów | poprawione 2026-11-22 |
| Quench `styl-m9` 13/14 — „ResizeObserver loop” z `InventoryElement#_onResize` dnd5e przy każdym otwarciu karty postaci | poprawione — podkładka w `config/dnd5e-fixes.mjs` |
| Quench `produkcja` oczekiwał ikony SVG, a paczki dają wykończenie WEBP | poprawione |
| `lang/pl.json`: `SizeHuge` „Ogromny”, `SizeGargantuan` „Gigantyczny” — NOE i tabele modułu mówią Wielki / Ogromny | kandydat (PLAN_beta §0, K5) |
| Komentarz `tokens/aliases.json` („aliases win”) przeczy budowniczemu; martwe aliasy | kandydat (K5) |
| Ścieżki osobiste w publicznym repo: `dev/icons/gen_status_numerals.mjs` (ścieżka profilu użytkownika), odnośnik do vaultu w `PLAN_toolkits.md` | kandydat (K5, B8) — historia zostaje, poprawiamy na przyszłość |
| Brak dokumentu gracza o pojazdach poza pościgiem, wierzchowcach i mechanice pościgu | kandydat (K4, B7) |
| Dwie uwagi Poligonu z 2026-10-12 naprawione, a otwarte | R2 |

---

## 9. Ryzyka

- **Budżet MG.** Fala A musi się mieścić w budżecie; agenci przygotowują kolejki tak, żeby MG nigdy nie czekał na
  narzędzia ani nie szukał strony w podręczniku.
- **Lawina „nieaktualnych”.** Zbyt czuły odcisk (kolejność, `_stats`, ścieżki ikon) wyrzuci całą kolejkę po każdej
  przebudowie paczek. Odcisk liczony z treści widocznej dla gracza, z testem na dwóch kolejnych buildach.
- **Tekst NOE w repo.** Hub czyta vault w chwili wyświetlenia; test rejestru pilnuje limitu notatek.
- **Dwóch pisarzy.** Hub i importer piszą `ledger.json` tylko przez kolejkę zadań huba.
- **Rozjazd z Poligonem.** Werdykt próby żyje w świecie Poligonu; rejestr jest jego kopią po `review:sync`, nie
  drugim źródłem prawdy.
