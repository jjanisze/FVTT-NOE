# Plan: Egzekwowanie Właściwości Broni (Weapon Properties)

> Plik projektowy. Źródło zasad: `Tabele/Bronie/` + podręcznik.
> Definicje i filtrowanie właściwości: `scripts/config/weapons.mjs`.
> Wzorzec automatyzacji "save z karty czatu": `scripts/combat/obalajaca.mjs`.

---

## 0. Kontekst i filozofia

Wszystkie właściwości Neuroshimy są **zdefiniowane** w `NEURO_WEAPON_PROPERTIES`, **filtrowane
per typ broni** (`WEAPON_TYPE_PROPERTIES`) i mają **tooltipy** (`WEAPON_PROPERTY_TOOLTIPS`).
To znaczy, że pojawiają się jako chipy na arkuszu i w chat cardzie. **Brakuje jedynie
automatyzacji mechanicznej** dla części z nich.

Zasada: **nie automatyzuj na siłę.** Wiele właściwości to flavor lub rzeczy, które MG i tak
rozstrzyga ręcznie szybciej niż klikając przez dialog. Automatyzujemy tylko tam, gdzie:
1. efekt jest częsty i powtarzalny w walce, **oraz**
2. dnd5e/Foundry daje czysty punkt zaczepienia (hook, status effect, save).

Wzorzec referencyjny (`obalajaca.mjs`): po rzucie ataku wstrzykujemy przycisk do karty czatu →
klik wymusza RO na zaznaczonych celach (`actor.rollSavingThrow({ ability, targetValue }, { configure:false })`)
→ przy porażce nakładamy status (`toggleStatusEffect`). Sprawdzamy rozmiar celu
(`actor.system.traits.size`). Ten sam scaffolding pokrywa większość "to-do".

---

## 1. Status zbiorczy

Legenda: ✅ egzekwowane · 🟡 częściowe · ⚙️ do zrobienia (sensowne) · 🚫 poza zakresem (flavor/ręczne)

| Właściwość | Efekt RAW (skrót) | Status | Gdzie / dlaczego |
|-----------|-------------------|:------:|------------------|
| `obalajaca` | RO Siła ST10 albo Powalenie (cel ≤ Śr) | ✅ | `obalajaca.mjs` — przycisk + save + prone + sprawdzenie rozmiaru |
| `tryb_p/ks/ds/ms/oz` | Tryby ognia | ✅ | `fire-modes.mjs` — aktywności, koszty amunicji, RO, szablony |
| `wmag` / `beb` | Magazynek wewn. / bębenek | ✅ | `magazine.mjs` — model przeładowania (load-one, speedloader) |
| `ladowanie` / `przeladowanie` | Akcja/BA na załadowanie | ✅ | `magazine.mjs` — aktywności neuroLoadOne/neuroReload |
| `jednorazowa` | Strzał jednorazowy | 🟡 | `magazine.mjs` traktuje jako nietrackowaną; brak twardej blokady reloadu |
| `sm` | Szyna montażowa | ✅ | `addons.mjs` — sloty SM (max 3) |
| `burzaca` | Podwójne obrażenia obiektom | 🟡 | tylko detekcja **dźwięku** (`sounds.mjs`); obrażenia ręcznie (×2 w Apply Damage) |
| `ppanc` | Ignoruje Odporności i Próg obrażeń | ⚙️ | brak; warto wpiąć w pipeline obrażeń + `damage-reduction.mjs` |
| `przebijajaca` | jw. (wersja biała) | ⚙️ | jak `ppanc` |
| `porazajaca` | RO Kondycja ST10 albo Powalenie | ✅ | `weapon-save-properties.mjs` — przycisk + save `con` ST10 + prone |
| `powalajaca` | obuchowe, cel ≤ Duży, RO Siła (ST 8+SIŁ+PB) albo Powalenie | ✅ | `weapon-save-properties.mjs` — save `str` ST 8+SIŁ+PB + prone + limit rozmiaru |
| `unieruchamiajaca` | RO Zręczność albo Unieruchomienie | ✅ | `weapon-save-properties.mjs` — save `dex` ST 8+SIŁ+PB + restrained + limit rozmiaru |
| `dluga` | Utrudnienie do celów w 3m | ⚙️(opc.) | brak; addony manipulują flagą, ale nie ma kary za bliski dystans |
| `ciezka` | Wymaga dwójnogu/SIŁ15, inaczej Utrudnienie | ⚙️(opc.) | brak; możliwy check przy rzucie ataku |
| `dublet` | 2 pociski, 1 test, podwójne kości | ⚙️(opc.) | brak; możliwa osobna aktywność |
| `karczujaca` | Podwójne obrażenia roślinom/drewnu | 🚫 | jak `burzaca`, ale węższe — brak natywnego typu "obiekt/roślina" |
| `cicha` | Nie zdradza pozycji / Niewidoczność | 🚫 | brak systemu skradania/widoczności w module — ręcznie |
| `poreczna` | Strzał jedną ręką bez Utrudnienia | 🚫 | nie egzekwujemy kary "jedna ręka", więc nie ma czego znosić |
| `powracajaca` | Broń wraca na końcu tury | 🚫 | flavor/ekwipunek — niski zysk, ręcznie |
| `spalinowa` | Wymaga paliwa (0.5l / 30min) | 🟡 | `engine.mjs` — start/stop + pętla dźwięku (Sequencer); **zasób paliwa nietrackowany**, zarządzany ręcznie przez gracza+MG |
| `zasilana` | Wymaga prądu (~5 ataków/bateria) | 🚫(odroczone) | jak `spalinowa` |
| `co` | Fabryczny celownik optyczny | 🚫 | flavor + interakcja z addonami (już działa kontekstowo) |

---

## 2. Zrobione (jak)

- **`obalajaca`** — `renderChatMessageHTML` wstrzykuje przycisk "Cecha: Obalająca [ST X]".
  Klik: dla każdego zaznaczonego celu sprawdza `system.traits.size`; cele > Średni → dialog
  potwierdzenia; `rollSavingThrow({ ability:"str", targetValue })`; porażka → status `prone`.
  Uwzględnia addon `dociazone` (Utrudnienie na RO). Czyta właściwość z broni **i** z amunicji.
- **Tryby ognia, magazynki, SM, ulepszenia** — patrz `IMPLEMENTATION.md` §1.7/§1.8/§1.18.
- **`porazajaca` / `powalajaca` / `unieruchamiajaca`** — `weapon-save-properties.mjs`. Generyczny
  słownik `SAVE_PROPERTIES` + jeden hook wstrzykujący przycisk i jeden handler kliknięcia
  (uogólnienie wzorca `obalajaca.mjs`). Per cecha: cecha RO, ST (stałe albo `8+SIŁ+PB`
  napastnika), limit rozmiaru (dialog potwierdzenia poza zakresem), status przy porażce
  (`prone`/`restrained`). **Odporności** (`system.traits.ci.value`) respektowane — cel odporny
  nie wykonuje RO, dostaje komunikat o odporności. Czyta właściwość z broni i z amunicji.
  Zweryfikowane na żywo (oba wyniki RO + przypadek odporności).

---

## 3. Do zrobienia (jak)

### 3.1 Grupa "save z karty czatu" — ✅ ZROBIONE (`weapon-save-properties.mjs`)

Generyczny słownik `SAVE_PROPERTIES` obsługujący wszystkie trzy cechy.
Parametryzacja per wpis: `ability`, `dc` (`{mode:"fixed"}` vs `{mode:"attacker", base:8}`
= `8+SIŁ+PB`), `sizes` (dozwolone rozmiary; poza zakresem → dialog), `status`, `statusLabel`.

| Właściwość | ability | ST | Limit rozmiaru | Status przy porażce | Uwaga |
|-----------|:-------:|----|----------------|---------------------|-------|
| `porazajaca` | `con` | 10 (stałe) | — (każdy) | `prone` | — |
| `powalajaca` | `str` | `8 + SIŁ + PB` napastnika | tiny–lg (`huge`/`grg` → dialog) | `prone` | wg RAW broń obuchowa; ufamy właściwości w danych |
| `unieruchamiajaca` | `dex` | `8 + SIŁ + PB` napastnika | med–lg (poza → dialog) | `restrained` | zamiast obrażeń (info dla MG); Escape DC ten sam |

Odporności: `_isImmuneToCondition` czyta `system.traits.ci.value` (Set/array). dnd5e i tak
usuwa stan odporny w `prepareResistImmune`, więc proaktywnie pomijamy RO i raportujemy odporność.

### 3.2 `ppanc` / `przebijajaca` — pipeline obrażeń (wysoki zysk, średni koszt)

Efekt: ignoruje **Odporności** (dnd5e `dr`) oraz **Próg obrażeń** (nasza redukcja materiałowa
w `damage-reduction.mjs`).

Plan:
1. Przy rzucie obrażeń z broni `ppanc`/`przebijajaca` oznacz wiadomość flagą
   `flags[MODULE_ID].bypassReduction = true` (analogicznie jak robią to bronie obszarowe).
2. `damage-reduction.mjs` (panel Apply Damage) — gdy flaga ustawiona, **pomiń** materiałową
   redukcję / Próg obrażeń (wyzeruj opcje redukcji lub pokaż "Ppanc — ignoruje próg").
3. Odporności dnd5e: ustaw mnożniki `ignore.resistance` w konfiguracji Apply Damage, jeśli
   dnd5e 5.3 to wspiera w panelu (do weryfikacji w API — `DamageApplicationElement`).

> Zależność: zweryfikować, jak `damage-reduction.mjs` wstrzykuje redukcję i czy da się ją
> warunkowo wyłączyć per-wiadomość. To jedyny realny "koszt" tej właściwości.

### 3.3 Opcjonalne — kontekst rzutu ataku (średni zysk)

- **`dluga`** — przy `dnd5e.preRollAttack`/`postBuildAttackRollConfig` zmierz dystans do celu
  (`token.center` ↔ `target.center`, `canvas.grid.measureDistance`); ≤ 3 m i cel ma Szybkość > 0
  → dorzuć Utrudnienie. Reużyć logikę wstrzykiwania bonusów z `addons.mjs`.
- **`ciezka`** — przy rzucie ataku sprawdź `actor.system.abilities.str.value >= 15` **lub**
  aktywny dwójnóg/trójnóg (`flags.setup` / addon). Brak → Utrudnienie (+ cel ma Ułatwienie do
  RO przeciw seriom — to drugie trudniejsze, można pominąć w v1).
- **`dublet`** — osobna aktywność (jak tryby ognia): 1 test ataku, podwójne kości obrażeń,
  zużycie 2 nabojów. Reużyć wzorzec `fire-modes.mjs` (sync aktywności).

---

## 4. Poza zakresem (dlaczego)

- **`burzaca` / `karczujaca` — podwójne obrażenia obiektom/roślinom.** Patrz §5 — brak natywnego
  rozróżnienia obiekt/istota w dnd5e 5.3. Pozostaje ręczny mnożnik ×2 w panelu Apply Damage
  (już istnieje). `karczujaca` dodatkowo wymaga rozpoznania "drewno/rośliny" — jeszcze węższe.
- **`cicha`.** Moduł nie ma systemu skradania/widoczności (Niewidoczność, detekcja pozycji).
  Bez tego nie ma czego automatyzować — MG stosuje opisowo. Do rozważenia dopiero gdyby powstał
  podsystem stealth.
- **`poreczna`.** Znosi karę za strzał jedną ręką — ale tej kary **nie egzekwujemy** (nie ma
  trackingu "ile rąk"). Bez kary bazowej właściwość nie ma efektu do automatyzacji.
- **`powracajaca`.** Czysto ekwipunkowe/narracyjne; niski zysk względem kosztu (śledzenie rzutu
  i zwrotu broni miotanej). Ręcznie.
- **`spalinowa` (zasób) / `zasilana` (całość).** Zasób paliwa/baterii — pasuje do warstwy
  survival (Phase 4), modelowalne jak Dozownik (zasób dawek). Odroczone, nie blokuje walki.
  Start/stop silnika i pętla dźwięku dla `spalinowa` **są** zaimplementowane (`engine.mjs`) —
  tylko zużycie paliwa zostaje ręczne.
- **`co`.** Fabryczny celownik — flavor; interakcje (np. brak celownika dla bonusu) są już
  obsługiwane kontekstowo przez system ulepszeń.

---

## 5. Burząca — analiza wykonalności automatyzacji

**Wniosek: minimalna automatyzacja. Podwójne obrażenia obiektom zostają ręczne (mnożnik ×2 w
panelu Apply Damage, który już istnieje).**

Dlaczego nie pełna automatyzacja:

- dnd5e 5.3 ma tylko typy aktorów: **`character`, `npc`, `vehicle`, `group`** (`system.json`).
  **Nie ma typu "obiekt".**
- `CONFIG.DND5E.creatureTypes` (humanoid, construct, beast, …) również **nie zawiera "obiektu"**.
- Bariery/ściany/przeszkody na scenie często **nie są aktorami** (to `Wall`/`Tile`/`Drawing`),
  więc nie mają `actor`, RO ani HP do rozróżnienia po stronie ataku.

Co realnie możemy zrobić (opcjonalnie, niski koszt) — **podpowiedź, nie wymuszenie**:

- Przy rzucie atakiem bronią `burzaca`, jeśli zaznaczony cel ma `actor?.type === "vehicle"`
  (najbliższy natywny odpowiednik "obiektu/konstrukcji" w dnd5e), wstrzyknąć do karty czatu
  delikatną notkę/przycisk: *"Cel jest obiektem (pojazd) — Burząca: rozważ podwójne obrażenia"*.
- Dla wszystkich pozostałych celów (istoty) — **nie** sugerować nic; MG i tak rozstrzyga.
- Mnożnika **nie** narzucamy automatycznie — gracz/MG wybiera ×2 w Apply Damage.

To jest cała wartość, jaką da się uzyskać bez własnego systemu znaczników "to jest obiekt".
Jeśli w przyszłości powstanie typ/flaga "obiekt" (np. aktorzy-konstrukcje z `system.traits.type`
ustawionym ręcznie albo dedykowana flaga modułu na tokenie), heurystykę można rozszerzyć.

### 5.1 Minimalny zakres do (ewentualnej) implementacji

1. Hook `renderChatMessageHTML` (jak w `obalajaca.mjs`): jeśli broń/amunicja ma `burzaca`
   **i** istnieje zaznaczony/wycelowany cel typu `vehicle` → pokaż notkę-podpowiedź.
2. Brak nowych statusów, brak modyfikacji obrażeń, brak dialogów wymuszających.
3. Koszt: ~30–40 linii, zero ryzyka dla pipeline'u obrażeń.

> Decyzja do potwierdzenia z MG: czy w ogóle chcemy notkę-podpowiedź dla `vehicle`, czy zostawiamy
> `burzaca` jako czysty tooltip (status 🟡 → 🚫). Domyślnie rekomendacja: **notka-podpowiedź**,
> bo jest tania i nie przeszkadza.

---

## 6. Rekomendowana kolejność

1. **§3.1** porazajaca / powalajaca / unieruchamiajaca — wspólny helper (najlepszy stosunek
   zysk/koszt, reużywa sprawdzony wzorzec `obalajaca`).
2. **§3.2** ppanc / przebijajaca — realnie wpływa na balans (przebijanie pancerzy/progów).
3. **§5** Burząca — tania notka-podpowiedź dla `vehicle` (lub świadome zostawienie jako tooltip).
4. **§3.3** dluga / ciezka / dublet — opcjonalne, gdy reszta zamknięta.
5. Reszta — poza zakresem / odroczone (§4).
