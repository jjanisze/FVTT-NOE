# Hand-off — Materiały wybuchowe i drobiazgi ekwipunku

Napisane 2026-09-24 przez poprzedniego agenta, po `v0.16.0` (commit „Grenades: …" — ten plik
wszedł w tym samym commicie). Wszystko w §1 jest **zweryfikowane na żywym świecie** (Chrome
DevTools MCP, Piekarz vs Camel w walce), nie zgadywane. Pełny opis zmian: IMPLEMENTATION.md,
wpisy z 2026-09-23. Skasuj ten plik, kiedy wszystko z §2 będzie zamknięte albo przeniesione.

---

## 1. Co jest zamknięte — nie zaczynaj od nowa

- **Karta aktora nie skacze przy +/-** — `sheet-shell.mjs`, `_preRender`/`_postRender` pamiętają
  przewinięcie `.main-content`. Stara łata `sheet-position-stability.mjs` skasowana.
- **Leki**: ±Ilość jak w Prowiancie, jeden wiersz przy 800 px. Sztuki leków są wymienne (stan
  dawkowania siedzi na aktorze, nie na itemie).
- **Celowanie z podglądem** — `scenes/area-picker.mjs`, jeden picker dla granatów, min, kolczatki,
  flary i racy. PPM/ESC anulują, klik nie zaznacza żetonu, ESC nie zamyka karty.
- **Zasięg rzutu**: `9 + max(9, 9 × mod. SIŁ)` — minimum 18 m. **RAI** (sprzeczność reguła/przykład
  w podręczniku rozstrzygnięta z autorem; w kodzie bez nazwiska — repo jest publiczne). Dwa pasma
  (w zasięgu / poza), przekroczenie oznaczane, nie blokowane.
- **Wybuch na końcu tury** (RAW) — ładunek leży jako Tile z flagą `pendingCharge`, pulsujący obrys
  + podpis przez Sequencer. Wybucha przy pierwszym z: zmiana tury/rundy (też wstecz), walka
  skasowana/zatrzymana, aktywny uczestnik usunięty, czas świata +6 s, przegląd przy `ready`.
  Rzut poza własną turą → koniec **bieżącej** tury (decyzja MG). Poza walką — od razu. Miny bez zmian.
- **Koktajl Mołotowa wg RAW** — dane, podpalanie **i rzut jako dwa osobne kliknięcia** (jeden
  przycisk zmienia się ze stanem), pęknięcie po 3 rundach **w pełni automatyczne** z Podpaleniem
  trzymającego (świadomy wyjątek od doktryny GM-in-the-loop — RAW nie zostawia decyzji), brak
  gaszenia. **Światło butelki to reguła WKK** (`wkk/config/molotov-light.mjs`, tylko przy
  `isKobaltEnabled()`).
- **Obrażenia z typami** — `_parseDamageSpec().parts`; rzut z karty to kilka `DamageRoll` w jednej
  wiadomości. Podpalenie z karty: przycisk „Podpal zaznaczonych" + karta „nie zdali RO".
- Paczka `granaty` przebudowana. Testy: **461/461**.

## 2. Co jest OTWARTE

1. **Wiersz „Materiały wybuchowe" zawija się przy minimalnej szerokości karty.** Zmierzone przy
   800 px (wiersz 522 px): 93 px wysokości, ~800 px potrzeby — kolumny Obszar (150) i RO (130).
   Propozycja z sesji: przenieść Obszar/RO do podpisu pod nazwą, jak dawki w Lekach
   (`leki-inventory.mjs`). Pomiar: `app.setPosition({width: 100})` (klamruje do minimum) i
   porównanie `top` dzieci `.item-row`. **Czeka na zgodę MG.**
2. **Sloty podręczne liczą stosy, nie sztuki.** `handyCount()` w `handy-items.mjs` liczy dokumenty:
   7× Relanium przy pasie = 1 slot z 3, tak samo stos granatów. RAW („maksymalnie trzy przedmioty
   podręczne") czytany dosłownie to trzy fizyczne rzeczy. Przed ±Ilość w Lekach też tak było.
   **Pytanie do MG, nierozstrzygnięte**: zamierzone? liczyć sztuki? ograniczać stos przy pasie?
3. **Grafika leżącej butelki.** Rzucony koktajl leży z grafiką granatu
   (`PENDING_TILE_TEXTURE` w `grenade-inventory.mjs` — jedna tekstura dla wszystkich). Trzeba
   tekstury per podtyp. Grafikę dostarcza MG do `dev/icons/in/`; konwersja do WEBP (~128 px wys.)
   jak `vfx/grenade-thrown.webp` — patrz pamięć „WEBP, not PNG".
4. **Zdalny C4/dynamit i pipebomb z lontem.** Dziś wybuchają jak granaty (na końcu tury / od
   razu). Infrastruktura jest gotowa: Tile `pendingCharge` + `_detonate()`. Brakuje uogólnienia
   `anchor` do warunku: `endOfTurn` (jest) / `remote` (przycisk „Detonuj" dla rzucającego/MG) /
   `fuse` (N rund). **Uwaga na RAW**: dynamit w podręczniku to „laska", którą się **podpala**
   (Akcja Bonusowa/Używanie + źródło ognia — jak koktajl), a nie „det. zdalny" jak w katalogu;
   C4 ma „Detonator elektryczny"; IED — „zdalna, czasowa lub wyzwalacz". Zacznij od RAW.
5. **Audyt katalogu materiałów wybuchowych względem RAW** (`GRENADE_TYPES` w
   `config/ammo-data.mjs` vs `8 SZTUCZKI/czesc-01.md`). Znane rozjazdy (niesprawdzone, które są
   decyzjami MG): mina przeciwpiechotna — RAW 1,5 m / 8k6 / ZR ST 15, katalog 3 m / 4k6+2k6;
   przeciwpancerna — RAW 3 m / 15k6 / KON 15, katalog 6 m / 8k6 (+4k6 pojazdy); C4 — RAW 3 m /
   10k6 / KON 15, katalog 6 m / 8k6 (+4k6). Do tego **błąd parsera**: „pojazdy: +4k6" to obrażenia
   warunkowe, a `_parseDamageSpec` dodaje je do sumy (test to dziś tylko dokumentuje — człon
   dziedziczy typ). Po zmianie katalogu: waga/cena/opis są **wypiekane w itemy** — istniejące kopie
   trzeba zsynchronizować (precedens: koktajl, jednorazowy skrypt), potem `npm run build:packs`
   przy zamkniętym Foundry.

## 3. Pułapki znalezione w tej sesji — nie odkrywaj ponownie

- **Sequencer `.shape("rectangle")` rysuje od rogu**; opcja `anchor` kształtu nic nie robi.
  Środek: `offset: {x: -w/2, y: -h/2, gridUnits: true}`. Koło rysuje od środka.
- **Sequencer `.text()` mnoży `fontSize` przez `150 / grid.size`** — żeby dostać N px na mapie,
  podaj `N × grid / 150`. Tekst ma własne `anchor` (względem swoich wymiarów).
- **`actor.getActiveTokens(true, true)` zwraca `TokenDocument`** (bez `.center`) — granaty padały
  na tym po cichu, gdy rzucający nie miał zaznaczonego żetonu. Bierz placeable: `getActiveTokens(true)`.
- **Panel „Apply Damage" dnd5e** buduje listę celów dopiero przy rozwinięciu (`_onOpen`) — przy
  skryptowym zaznaczaniu pokazuje „No Tokens Selected". To nie błąd modułu; w testach bierz
  `damageApplication.damages` i `actor.applyDamage(...)`.
- **`location.reload()` może wylogować** (tu: po północy, najpewniej wygasła sesja) — skrypt po
  reloadzie sprawdza `location.pathname === "/game"`; logowanie robi wyłącznie użytkownik.
- Testy Quench zostawiają otwarte okno „[Quench] drużyna testowa" i ~10 wiadomości na czacie —
  zamknij/skasuj po przebiegu, jeśli robisz zrzuty ekranu.

## 4. Środowisko

- Testowa walka (bez sceny): Camel (niepołączony, 17 PW) i Piekarz (33 PW), na scenie „Start".
  Piekarz ma 6 koktajli. Siatka 70 px = 1,5 m. Kolor Kobaltu włączony.
- Czyszczenie po testach na żywo: zapamiętaj `game.time.worldTime`, stan walki, PW, znacznik czasu
  wiadomości — i przywróć (tak robiła ta sesja).
