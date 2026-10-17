# Hand-off — drobiazgi przed migracją (Foundry 14.369, dnd5e 6.0)

Napisane 2026-10-17. Dla agenta, który domyka drobne sprawy, zanim zacznie się migracja na Foundry 14.369 i
dnd5e 6.0.x. **Migracji nie zaczynaj** — jej plan powstanie po tym hand-offie, na czystym punkcie, który tu
zostawisz. Repozytorium jest publiczne: zasady z `AGENTS.md`.

---

## 0. Zanim zaczniesz

- `npm run fvtt -- doctor`. Tryb `runtime` = wieczór gry: żadnych komend cyklu życia ani testów, czekaj na MG.
- Kampania i Poligon chodzą u MG. Testujesz w piaskownicy (`fvtt world:create`, `fvtt e2e`), nigdy w kampanii. Na
  Poligonie tylko czytasz i zamykasz znaleziska (Z1); stanowisk nie resetujesz.
- **Równolegle pracuje Codex nad assetami** (`dev/icons/MISSING.md`). Jego ścieżki: `dev/icons/**`, `dev/art/**`,
  `icons/**`, pliki obrazów w `ui/**` i `tokens/**`, `sounds/**`, `vfx/**`, `CREDITS.md`. Niezacommitowane pliki w
  drzewie (dziś m.in. `dev/icons/review/candidates/batch-108/`, `batch-109/`, `dev/icons/style-pass/`, raporty
  pokrycia ikon) są jego — nie dotykaj, nie commituj. Gdy zadanie wymaga pliku w jego ścieżkach (Z3), sprawdź
  `git status` tego pliku i zrób to jednym małym commitem.
- Git: commit tylko jawnych ścieżek (`git commit -- <ścieżki>`). Żadnego `add -A`, `stash`, `reset`, `restore`,
  `clean`, `rebase`, `push`. Push i tagi — MG.
- Przebudowa paczek (`fvtt packs`) tylko wtedy, gdy nikt nie jest podłączony (`doctor`); inaczej zostaw ją MG i
  zapisz w §5.

## 1. Stan na 2026-10-17 — sprawdzone, nie odkrywaj ponownie

- **v0.19.0** (M3 + M5): tag na `0bebbd0`; bramka zielona — e2e 20/20 w świecie gołym i zalecanym, Quench 1184/1184
  (`logs/release/v0.19.0-handoff.md`). To jest **punkt odniesienia dla migracji** — nie powtarzaj bramki dla pomiaru.
- Od tagu zmieniły się tylko ikony (praca Codexa, ~400 plików w `icons/`); `scripts/`, `templates/`, `styles/`,
  `packs/` — bez zmian.
- Sypanie się suite'ów M5 uruchamianych jeden po drugim (`PLAN_m5_postoj.md` §11, „Po E11”) naprawiono w `0bebbd0`;
  bramka przeszła 20 suite'ów w jednym przebiegu. Wracaj do tego tylko, jeśli problem wróci.
- **Weto:** MG przeszedł M3 i M5 slice po slice'ie przy wdrażaniu. Formalnego przejścia sond (Hangar ~45, U1–U58 M5)
  przed migracją nie będzie — „musi wystarczyć”.
- **M4 (pojazdy):** miejsce w kolejności czeka na decyzję MG (przed betą, po migracji — albo `PLAN_beta.md` §4 „po becie”). Nie
  rozstrzygaj.

## 2. Zadania

### Z1 — dwa otwarte znaleziska Poligonu

`npm run fvtt -- poligon:findings --open` pokazuje dwa błędy z Hangaru (2026-10-12): Cichy krok tworzony z klienta
gracza; zasilanie drona pisze do skasowanego aktora. Oba naprawione w `1d4cf2e` (bramka `isActiveGM` w
`actors/cichy-krok.mjs`, `isDocumentLive` w `actors/drony-stan.mjs`) z testami regresji; `IMPLEMENTATION.md` (v0.19.0)
już to opisuje, a bramka dodała sondy MG (Kreator → `cichy-krok`, Hangar → `usun-drona`). Zostało zamknąć wpisy z
odnośnikiem do commitu — jak zmienia się status uwagi, sprawdź w `dev/poligon/README.md`. Jeśli to wymaga ręki MG,
wypisz je w §5.

**Gotowe gdy:** `poligon:findings --open` zwraca 0 albo reszta jest w §5.

### Z2 — Złomiarz nie daje Ułatwienia przy szabrowaniu (błąd)

`postoj/szabrowanie.mjs` (`ulatwieniaSzabrowania`) szuka zdolności `smieciarz` albo przedmiotu „Śmieciarz”, a
Sztuczka w danych modułu to **Złomiarz** (`config/sztuczki-data.mjs`, id `zlomiarz`; RAW s. 108 — Śmieciarz i
Antykwariusz to jej dwie części). Postać ze Złomiarzem z paczki nie dostaje Ułatwienia.

- Wykrywanie po Sztuczce Złomiarz tak, jak robią to automatyczne Sztuczki w `sztuczki-data.mjs`; „Śmieciarz” zostaje
  jako alias.
- Linia w oknie i na karcie szabrowania: „Złomiarz”.
- Plakietka pokrycia (`zlomiarz.auto`): szabrowanie (Ułatwienie MDR/INT) — automatyczne; wycena (Antykwariusz) — T0,
  wycenia MG (`PLAN_m5_postoj.md` D4). Przebudowa paczki: `fvtt packs --only=sztuczki`.
- Quench `szabrowanie`: postać ze Sztuczką Złomiarz z paczki → Ułatwienie (dziś test zna tylko przedmiot o nazwie
  „Śmieciarz”).

### Z3 — brakujące obrazy z bramki v0.19.0

Lista w `logs/release/v0.19.0-asset-notes.json`:

- `icons/svg/search.svg` — nie ma go w rdzeniu v14; używa go karta zamówienia (`postoj/zamowienie.mjs`). Zamień na
  plik, który istnieje (rdzeń `public/icons/` albo ikona akcji modułu `icons/actions/handel.*`, jeśli już jest).
- Dwa portrety Bestiariusza (Cywil 2, Gangus — żołnierz) wskazują na ścieżkę świata kampanii
  (`worlds/<świat>/characters/…`) — w czystej instalacji to 404. Ustal, czemu te dwa nie przeszły tak jak reszta
  (`PORTRAIT_ALIASES` w `dev/packs/build-packs.mjs`, zasady pochodzenia grafik w `tokens/README.md`), i napraw tą
  samą drogą. Gdy pochodzenie grafiki jest niejasne — zaślepka i pytanie do MG w §5. Ścieżki świata kampanii nie
  mogą trafiać do paczek.
- Dodaj sprawdzenie do `validate-packs`: żaden obraz w paczkach nie wskazuje na `worlds/`.
- Przebudowa paczek razem z Z2.

### Z4 — ostrzeżenia CI

Przebieg `.github/workflows/release.yml` przy v0.19.0 zgłosił przestarzały runtime akcji i migrację obrazu runnera
(sam job przeszedł). Podnieś wersje akcji i obrazu zgodnie z ostrzeżeniami. Sprawdzi się przy następnym pushu MG —
w §5 opisz, czego się spodziewać.

### Z5 — dokumenty

- `PLAN_beta.md`: nagłówek (v0.19.0 z 2026-10-15 z M3 i M5; Poligon istnieje; etap; bramki) i nowa sekcja
  „Kolejność do bety (od 2026-10-17)”, z diagramem:
  1. drobiazgi — ten hand-off;
  2. migracja Foundry 14.369 + dnd5e 6.0.x — osobny plan (napisze go następny agent; nie twórz go);
  3. M6 z Biegłościami profesji (dziura B6) — po migracji, bo awans w dnd5e się zmienia;
  4. M4 — decyzja MG;
  5. style i motywy (stanowiska Garderoba i Galeria, reszta ilustracji M5);
  6. wydanie bety — migracja zeruje zegar B2, więc dwie rozegrane sesje na nowej wersji przed nazwaniem bety.
- `PLAN_m5_postoj.md`: status „PROJEKT” → wdrożone (E0–E11, 2026-10-12; v0.19.0); weto — przejście MG po slice'ach,
  formalne przejście sond odłożone.
- `PLAN_m3_towarzysze.md` (status, §11) i `PLAN_human_testing.md` (status, §5.0): to samo zdanie o wecie.
- `IMPLEMENTATION.md`: wpis w changelogu po v0.19.0 dla Z2–Z4.

### Z6 — inwentarz przed migracją (tylko odczyt)

Wejście dla planu migracji, nie analiza. Zapisz w §5:

- wersje: zainstalowany Foundry, dnd5e, każdy moduł aktywny w kampanii, na Poligonie i w świecie „zalecanym” bramki
  wydania; dla każdego — najnowsze wydanie i deklarowana zgodność z Foundry 14.369 i dnd5e 6.0 (manifest, strona
  wydań);
- osobno: czy Quench, Sequencer i Splatter mają wersje zgodne z dnd5e 6.0 — bez nich nie przejdzie bramka wydania;
- jak dziś robi się kopię zapasową świata kampanii (narzędzie, dokąd trafia) — nie rób jej, tylko opisz.

### Z7 — v0.19.1 (tylko na słowo MG)

Jeśli MG chce wypuścić ikony zebrane od v0.19.0 przed migracją: `npm run release:check -- --tag` wg `RELEASING.md`,
gdy Codex nie ma niezacommitowanych zmian w `icons/`; tag i push robi MG. Bez słowa MG — pomiń.

## 3. Poza zakresem

Cokolwiek z dnd5e 6 (także `compatibility` w `module.json`), M4, M6, style i motywy, doradcze progi wydajności
Pościgu z bramki v0.19.0, kolejka Codexa.

## 4. Gotowe gdy

Z1–Z6 zrobione albo wypisane dla MG; `npm test` i pełny Quench zielone; e2e `szabrowanie`, `handel` i `boot` zielone
w piaskownicy; `fvtt doctor` bez problemów; drzewo czyste w twoich ścieżkach.

## 5. Wynik (wypełnia agent)

Agent: Claude Code, 2026-10-17. Commity: `e2fa759` (Z2), `6a4c7c8` i `a3e9ec3` (Z3), `df95e94` (Z4), `e4fd268`
(Z5), a portrety po decyzji MG (Z3) — commit z tą wersją pliku. Nic nie wypchnięte.

Testy: `npm test` zielone; `validate-packs` zielone (na buildzie sprzed zmiany — 37 błędów `worlds/`, jak ma być);
pełny Quench w piaskownicy **1185/1185** (o jeden więcej niż v0.19.0 — nowy test Złomiarza); e2e w piaskownicy:
`boot` i `szabrowanie` zielone, `handel` zielony osobno, `poligon` zielony osobno (807 s; buduje całą Obsadę). W przebiegu łańcuchowym
`boot,szabrowanie,handel,poligon` `handel` i `poligon` były czerwone **tylko** od błędów konsoli rdzenia (`#postNotification`
na `null`, `PreciseText.destroy` w `createScrollingText`) — wszystkie kroki zielone, a niezmiennik Obsady (każda
automatyczna zdolność na personie) przeszedł. Wszystko szło 3–15× wolniej niż w bramce (szabrowanie 65 s zamiast 10 s,
zamówienie 44–105 s zamiast 6 s) — dławienie timerów ukrytych kart (noc, okna Chrome w tle); te same błędy rdzenia
przy przejściach między paczkami to znany objaw z `PLAN_m5_postoj.md` §11 („Po E11”). Jeśli wrócą przy oknach na
wierzchu — wtedy wracać do tego, nie wcześniej. `fvtt doctor`: bez problemów; brudne w drzewie tylko ścieżki Codexa (`icons/abilities`, `icons/pochodzenia`, `dev/icons`).

- **Z1:** zrobione. Obie uwagi Hangaru mają status `→ poprawione: 1d4cf2e (…); v0.19.0` (bramka `isActiveGM` /
  `isDocumentLive`, regresje i sondy jak w opisie). `poligon:findings --open` → 0.
- **Z2:** zrobione. Złomiarz idzie mostem zdolności jak automatyczne Sztuczki: klucz `ZLOMIARZ` w
  `actors/abilities.mjs` (aliasy „złomiarz”, dokładne „śmieciarz”), `legacyAbilityKeys: ["zlomiarz"]` w
  `sztuczki-data.mjs`, `hasAbility` w `ulatwieniaSzabrowania` (pole `smieciarz` → `zlomiarz`). Okno MG i prośba
  gracza: „Złomiarz”. Plakietka `partial` — szabrowanie automatyczne, wycena (Antykwariusz) MG (D4); Sztuczki 19/53
  (macierz w IMPLEMENTATION.md poprawiona). Quench `szabrowanie`: alias „Śmieciarz” + Sztuczka z paczki. Paczka
  `sztuczki` przebudowana w kampanii. Niezmiennik Obsady wymaga, by automatyczna Sztuczka siedziała na personie:
  **Szczur (5) dostaje Złomiarza** zamiast Pulp Fiction (ta zostaje na Cwaniaku (1)); rotacja reszty bez zmian.
  Opis Złomowiska i sonda `szabrowanie` mówią o tym.
- **Z3:** zrobione, szerzej niż w opisie.
  - Rdzeń v14: poza `search.svg` (karta zamówienia → `icons/actions/handel.webp` modułu) brakowało jeszcze ośmiu
    plików: `anvil.svg` (rozbiórka), `clover.svg` (Fuksy, zapas Fantu), `gears.svg` (usługi w produkcji),
    `wheel.svg` (pickup Poligonu) i czterech ikon umiejętności w `config/skills.mjs` (Pojazdy, Przyroda, Technika,
    jedna walki) — wszystkie zamienione na istniejące; każde odwołanie `icons/…` w `scripts/`, `templates/`,
    `dev/packs/`, `dev/poligon/` sprawdzone z instalacją.
  - Portrety: „czemu te dwa” — nie te dwa. **37 z 51** aktorów Bestiariusza miało `img` w `worlds/output/characters/…`;
    bramka zobaczyła tylko dwa, bo tylko one trafiły na ekran w tamtej próbie. Wydane `module.zip` v0.19.0 ma te 37
    ścieżek — u każdego poza kampanią to 404. Builder nie czyta już świata, zaszyte ścieżki `C:/Users/…` usunięte
    (katalog danych liczony z położenia modułu); portret = `tokens/portraits/<id>.webp`, a bez niego grafika żetonu.
    **Decyzja MG (2026-10-17): portrety idą do modułu**, bez prywatnego modułu grafik. Przegląd 37: 24 ilustracje z
    podręcznika, 11 grafik AI MG (OpenAI, trochę Gemini), 2 grafiki z sieci bez licencji (genotyp wilczy, gigantyczny
    pająk) — te dwie zostają poza modułem, zastąpi je później grafika fana. **35** portretów w `tokens/portraits/`
    (WEBP ≤ 1536 px, razem 6 MB), źródła i warunki w `CREDITS.md` („Bestiariusz portraits”). Paczka `bestiariusz`:
    35 rekordów różni się od `HEAD` tylko polem `img`.
  - `validate-packs`: każdy obraz w każdej paczce (pola i `<img src>`) musi być w module, `systems/dnd5e/` albo
    rdzennym `icons/` i istnieć; `worlds/` zawsze odrzucone. Na starym buildzie: 37 błędów, na nowym zielono. W CI
    sprawdza ścieżki i pliki modułu; rdzeń i dnd5e tylko lokalnie (runner ich nie ma).
  - Paczka `bestiariusz` przebudowana w kampanii (razem z `sztuczki`); wszystkie 179 plików modułu, na które
    wskazują obie paczki, są w gicie.
- **Z4:** zrobione. `checkout@v7`, `setup-node@v7`, `setup-python@v7`, `action-gh-release@v3` (wszystkie `node24`;
  przejrzane zmiany łamiące — żadna nas nie dotyczy: nie używamy cache ani `pip-install`, brak `packageManager`
  w `package.json`), `runs-on: ubuntu-26.04` (etykieta `ubuntu-latest` przechodzi na 26.04 od 2026-10-19 do 2026-11-19;
  przypięte jawnie, żeby nie zmieniła się w trakcie migracji). **Czego się spodziewać:** workflow rusza tylko przy
  pushu taga `v*.*.*`, więc sprawdzi się przy następnym wydaniu. Oczekiwane: brak ostrzeżenia o Node 20 i notki o
  obrazie runnera, job zielony jak przy v0.19.0. Ryzyko: pierwszy przebieg na 26.04 — Python 3.13 jest w manifeście
  `setup-python` dla 26.04 x64, `classic-level@3` i Pillow mają gotowe binaria; gdyby job padł na przygotowaniu
  środowiska, `runs-on: ubuntu-24.04` to bezpieczny powrót.
- **Z5:** zrobione. `PLAN_beta.md`: nagłówek i nowa **§0 „Kolejność do bety (od 2026-10-17)”** z diagramem
  (numer 0, żeby odwołania „§4 po becie” się nie przesunęły); M5 oznaczone jak M3. `PLAN_m5_postoj.md`: PROJEKT →
  WDROŻONE + weto. `PLAN_m3_towarzysze.md`: status + wpis w §11. `PLAN_human_testing.md`: status + §5.0 (i w §11
  decyzja o portretach, reguła `validate-packs`, zaszyta ścieżka). `IMPLEMENTATION.md`: wpis „Po
  v0.19.0” w changelogu, licznik Sztuczek, portret w Bestiariuszu. Też `AGENTS.md`, `DEV_GUIDE.md` §11.7,
  `tokens/README.md` (źródło portretu). `check_doc_paths.mjs`: 0 martwych.
- **Z6 — inwentarz** (stan 2026-10-17; zgodność = deklaracja w manifeście najnowszego wydania):

  | Pakiet | Zainstalowane | Najnowsze | Foundry (min / verified / max) | Gdzie aktywne |
  |---|---|---|---|---|
  | Foundry | 14.364 (stable) | **14.369** = V14 Stable 11, 2026-10-08 | — | — |
  | dnd5e | 5.3.0 (kampania, Poligon, piaskownica, piaskownica wydania — każda swoja kopia) | **6.0.6** (2026-10-06; 6.0.0 z 2026-09-10); w linii 5.3 jest też 5.3.3 | 6.0.6: **14.367** / 14 | wszędzie |
  | neuroshima-2026-overrides | 0.19.0 | — | 14 / 14; dnd5e 5.3.0 / 5.3.0, bez maksimum | wszędzie |
  | dice-so-nice | 6.3.1 | 6.4.4 | 14 / 14.368 | kampania, Poligon |
  | JB2A_DnD5e | 0.9.0 | 0.9.4 | 10 / 14 | kampania, Poligon |
  | quench | 0.10.0 | 0.10.0 (2025-04-30) | 13.341 / 13 | kampania, Poligon, zalecany, e2e |
  | quickscale | 1.7.0 | 1.7.0 | 13 / 14 | kampania, Poligon |
  | sequencer | 4.2.2 | 4.3.0 (2026-10-11) | 13 / 14 / **14** | kampania, Poligon, zalecany |
  | splatter | 6.0.1 | 6.0.2 (2026-09-30) | 14 / 14 / **14** | kampania, Poligon, zalecany |

  Kampania (`output`) i Poligon mają ten sam zestaw siedmiu modułów (odczyt `core.moduleConfiguration` z kopii bazy
  ustawień); świat „zalecany” bramki = moduł + Quench, Sequencer, Splatter; „goły” = sam moduł; e2e domyślnie moduł +
  Quench. Żaden moduł nie deklaruje zależności od systemu, więc o dnd5e 6.0 manifesty nic nie mówią.

  **Quench, Sequencer, Splatter a dnd5e 6.0:** żaden nie deklaruje ani nie testuje zgodności z dnd5e 6 (notatki
  wydań milczą). Quench nie dotyka danych systemu — ryzyko tylko po stronie Foundry (verified 13, bez maksimum; działa
  na 14.364). Sequencer jest niezależny od systemu; 4.3.0 to poprawki v14. Splatter czyta z dnd5e
  `details.type.value`, `details.type.custom`, `attributes.hp.value`, `attributes.hp.max` — wszystkie cztery są w
  modelu NPC dnd5e 6.0.6 (`CreatureTypeField`, `AttributesFields.hitPoints`). Wniosek: zgodne na poziomie kodu,
  niesprawdzone — potwierdzi dopiero bramka wydania w piaskownicy wydania z dnd5e 6. Dla planu migracji: 14.369 „nie
  ładuje już po cichu niezgodnych powiązanych modułów” (notatki wydania) — `maximum: 14` Sequencera i Splattera
  pasuje, nasz moduł nie ma maksimum dla dnd5e.

  **Kopia zapasowa kampanii dziś:** narzędzia nie ma. (1) Wbudowane kopie Foundry (Setup → Backups) trafiają do
  `%LOCALAPPDATA%\FoundryVTT\Backups\worlds\output\` — **ostatnia z 2026-05-08** (ponad 5 miesięcy; świat ma dziś
  ~709 MB). (2) foundry-mcp robi kopię kolekcji przed każdym zapisem offline do `worlds/output/data/_backups/`
  (ostatnie 2026-09-08/10). (3) Ręczne zrzuty JSON przed migracjami danych w `worlds/output/backups/` (ostatni
  2026-09-22, magazynki). (4) `fvtt poligon:clone` — pełna kopia świata na ścieżkę Poligonu (ostatnia 2026-10-12),
  ale to robocza kopia do prób, nadpisywana przez `--refresh`, nie kopia zapasowa. Świat nie jest w gicie ani w
  synchronizacji. `guards.COMMAND_CLASS` ma klasę dla polecenia `backup`, którego `fvtt` nie implementuje.
- **Z7:** zrobione na słowo MG. `release: v0.19.1` (`703d277`), bramka zielona i tag **`v0.19.1` na `11b32d7`**
  (zip `972f629dc9ec`): statyka, generatory, zip, paczki, wersje, piaskownica wydania 40/40 e2e, Quench 1185/1185.
  Po drodze dwie poprawki: kaskada okien e2e (`93137d4`) i wyścig w Quench autodestrukcji (`11b32d7`). **Push — MG:**
  `git push origin master v0.19.1`. Potem: testy w oknach w tle jako domyślne (wpis „Po v0.19.1” w changelogu).
- **Dla MG:**
  1. ~~Prywatny moduł grafik Bestiariusza~~ — rozstrzygnięte: portrety w module (Z3).
  2. ~~Paczka `pochodzenia` nieaktualna~~ — przebudowana przez MG po zakończeniu pracy Codexa (`2881386`).
  3. **Poligon:** paczki przebudowane z drzewa (offline, 2026-10-17, z portretami). Zostaje przebudowa Obsady w
     przeglądarce (Świeżość → Obsada → Przebuduj albo `fvtt poligon:obsada --rebuild --only=szczur-5`). Sonda:
     Złomowisko → `szabrowanie` (Szczur ma Ułatwienie do Percepcji i Śledztwa, Łowca nie).
  4. ~~Kopia zapasowa kampanii przed migracją~~ — **zrobiona 2026-10-17** przy zatrzymanym serwerze: świat, dnd5e
     5.3.0, moduły innych autorów, `Data\assets`, aplikacja Foundry 14.364 i `options.json`, na osobnym dysku kopii;
     sprawdzona (CRC, świat rozpakowany i otwarty). Miejsce, odtwarzanie i skrypty: vault, `Integracje/backups/`.
     `fvtt backup` (klasa czeka w `guards`) — kandydat do planu migracji.
  5. **Przygotowanie do aktualizacji** (wejście dla planu migracji):
     - Rdzeń Foundry to jedna instalacja dla wszystkich ścieżek danych (kampania, Poligon, piaskownica, piaskownica
       wydania) — jego aktualizacja dotyka wszystkich naraz. dnd5e jest osobną kopią na każdej ścieżce.
     - dnd5e 6.0.6 wymaga Foundry ≥ 14.367, więc kolejność: (a) rdzeń 14.364 → 14.369, wszędzie jeszcze dnd5e 5.3.0,
       bramka wydania v0.19.1 na 14.369; (b) dnd5e 6.0.x najpierw tylko w piaskownicy wydania (RELEASING.md, „Version
       policy”) — tu cała praca migracyjna; (c) kampania na końcu, po zielonej bramce.
     - Cofnięcie każdego kroku: kopia z 2026-10-17 ma aplikację 14.364 i dnd5e 5.3.0 (instalator niepotrzebny).
     - Źródła: klon referencyjny dnd5e ma już tagi `release-6.0.0`…`release-6.0.6` (5.3.0 → 6.0.6: 400 plików w
       `module/`, +22,7 tys. / −7,9 tys. linii), wiki odświeżone; notatki wydań 6.0.x — `gh api repos/foundryvtt/dnd5e/releases`.
       Po aktualizacji: `node dev/agent/index-sources.mjs` (mapa „klasa → plik”).
     - Nasze `module.json`: dnd5e `minimum` = `verified` = 5.3.0, bez maksimum; 14.369 nie ładuje po cichu niezgodnych
       powiązanych modułów (Z6) — podniesienie zgodności to część planu, nie tego hand-offu.
     - Testy: domyślnie okna w tle (TESTING.md, warstwa 6); Chrome z launchera vaultu.
