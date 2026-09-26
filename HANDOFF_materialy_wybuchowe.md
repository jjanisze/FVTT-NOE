# Hand-off — Materiały wybuchowe i drobiazgi ekwipunku

Napisane 2026-09-24 przez poprzedniego agenta, po `v0.16.0` (commit „Grenades: …" — ten plik
wszedł w tym samym commicie). Wszystko w §1 jest **zweryfikowane na żywym świecie** (Chrome
DevTools MCP, Piekarz vs Camel w walce), nie zgadywane. Pełny opis zmian: IMPLEMENTATION.md,
wpisy z 2026-09-23. Skasuj ten plik, kiedy wszystko z §2 będzie zamknięte albo przeniesione. Zaktualizowane
2026-09-24 przez drugą sesję tego dnia — §2 przepisane.

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

**Zamknięte 2026-09-24 (druga sesja)** — szczegóły w IMPLEMENTATION.md, trzy wpisy z tą datą:
wiersz „Materiały wybuchowe" w jednej linii (dawne §2.1), sloty liczą sztuki (§2.2), katalog
min/ładunków wg RAW + „burzące" + błąd parsera (§2.5), builder paczek w kształtach v14 (§2.6).
Testy: **468/468**.

1. ~~`npm run build:packs`~~ — **zrobione 2026-09-24 wieczorem.** Po starcie Foundry: w logu
   serwera zero wpisów „Migrated/Persisting migrated" dla paczek modułu (ostatnie: 01:12 tego
   dnia, sprzed poprawki), nowe `.log` każdej paczki mają 0 B. Pliki w `packs/` i tak się
   zmieniły — to sprzątanie samego LevelDB przy otwarciu (log → `.ldb`, rotacja MANIFEST/LOG),
   nie treść. Czy kolejne starty są już bez zmian — sprawdź `git status packs/` po następnym.
2. **Grafika leżącej butelki** — w kolejce `dev/icons/MISSING.md`, klasa B (nowa klasa: kolorowe
   obiekty z góry). Kod już gotowy: Tile bierze `vfx/<subtype>.webp`, jeśli istnieje
   (`_pendingTileTexture()`), proporcje z obrazu. Obróbka: `dev/icons/normalize_world_assets.py`.
3. **Detonacja inna niż „koniec tury".** RAW (*Sprzęt*, `8 SZTUCZKI/czesc-01.md`):
   - **Dynamit (laska)** — rzucany jak granat, ale najpierw **podpalany** (Używanie / Akcja
     Bonusowa + źródło ognia). Uogólnić `molotov.mjs` do „wymaga podpalenia", bez pęknięcia.
   - **C4, IED, miny** — **podkładane**. RAW: podłożenie = Test ZR (Zwinne dłonie / narzędzia
     ślusarza lub rusznikarza) albo MDR (Survival) ST 10; porażka = brak eksplozji, porażka o 5+
     = wybuch przy zakładaniu. Rozbrojenie ZR ST 15. Łączenie ładunków — w `note`, bez UI.
   - **Decyzje MG (2026-09-24):** zasięg podkładania **3 m**; przycisk „Detonuj" widzi
     **wyłącznie MG**; czas IED **ustawiany**, maks. **24 h czasu gry**, **globalny nasłuch**
     (`updateWorldTime`, wszystkie sceny — MG dostaje wiadomość o upływie także spoza sceny);
     **wyzwalacz/pułapka odpala MG ręcznie** (nie automatyzujemy).
   - **Podział IED — zdecydowane (MG 2026-09-25): bez podziału.** Zdalna detonacja = posiadanie
     RAW-owego **Detonatora radiowego** (Elektronika: 50 gb, 1 kg, 10%, pilot + 10 zapalników
     radiowych, 200 m); każde użycie zużywa 1 zapalnik; działa dla IED, C4 i innych ładunków.
     IED bez detonatora: czasowy (≤ 24 h) albo wyzwalacz/pułapka (odpala MG). Zapalnik
     elektryczny (5 gb, 10 m kabla) — to RAW-owa detonacja C4.
   - **Zdecydowane (MG 2026-09-25): wariant A + rozdzielony zestaw.** „Radiowy" wybiera się
     **przy podkładaniu** (dialog: czasowy / wyzwalacz / radiowy — „radiowy" tylko, gdy
     podkładający ma zapalnik radiowy). Detonator radiowy = **dwa przedmioty**: pilot + stos
     „Zapalnik radiowy ×10" (zakup daje oba). „A składa, B podkłada" zostaje: A oddaje B
     zapalnik (przez MG — gracze nie przekazują sobie przedmiotów bezpośrednio: brak praw do
     cudzej karty, worek drużyny pauzuje grę), B podkłada, pilot zostaje u A.
   - **Zmiana decyzji MG (2026-09-25): „Detonuj" nie jest tylko dla MG.** Gracz z **pilotem**
     detonuje zdalnie swoje ładunki radiowe. MG może zdetonować **każdy** ładunek, bez względu
     na typ i sposób odpalenia (np. rabuś grzebie przy ładunku, MG rzuca rozbrojenie poza
     systemem, porażka → MG odpala ręcznie).
   - **Czas IED (MG 2026-09-25):** długość wybiera gracz; liczy **zegar świata**. Jeśli scena
     z ładunkiem jest oglądana — wybuch z efektami jak zwykle. Jeśli nie — tylko wiadomość do
     MG („wybuchł"); MG sam decyduje, czy gracze słyszą (stłumiony, daleki huk) czy nic.
   - **Wdrożone 2026-09-25** (IMPLEMENTATION.md, wpis „Podkładanie min i ładunków…"): miny, C4
     i IED podkładane, wszystkie sposoby, pilot + zapalniki, zapalnik elektryczny, detonacja
     gracza i MG, wybuch bez graczy → wiadomość dla MG. **Zostało z §2.3:** dynamit (podpalanie
     przez uogólnione `molotov.mjs`); łączenie ładunków (C4 +100 g, wiązka dynamitu) — dalej
     tylko w `note`; rozbrojenie (ST 15) — MG rzuca poza systemem i usuwa Tile (albo odpala).
     Paczka `sprzet` do przebudowy przy zamkniętym Foundry (pilot + zapalnik elektryczny).
4. ~~777 starych wiadomości Quench~~ — czat wyczyszczony (1835 → 0). Do wznowienia kampanii czat
   jest jednorazowy — wolno kasować bez pytania (decyzja MG 2026-09-24).
5. **Przedmioty podręczne v2** — **wdrożone 2026-09-25** (pas w nagłówku karty). Co weszło i co
   otwarte: `PLAN_przedmioty_podreczne_v2.md` §13. Testy 474/474.

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
- **Zapisz też listę `flags.neuroshima-2026-overrides.activeScorchMarks` sceny PRZED testem** i przy
  sprzątaniu usuń tylko nazwy spoza tej listy. Ślad po wybuchu żyje rok czasu gry, więc filtr
  „wygasa za ~365 dni" łapie też ślady z poprzednich sesji: 2026-09-25 tak zeszło 9 śladów ze
  sceny Start, w tym co najmniej 3 sprzed tej sesji (efektów Sequencera nie da się przywrócić).
