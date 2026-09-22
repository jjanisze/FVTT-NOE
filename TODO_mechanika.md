# TODO — mechaniki z audytu drużyny

Lista spisana przy audycie (IMPLEMENTATION.md (21), 2026-09-07), zrealizowana w (22)
(2026-09-08). **Prawie wszystko zamknięte** — zostały trzy rzeczy, opisane na dole.

Zakres: Victor, Alan, Lorentz, Laffitte, Raynald. Piekarz i Kier wyłączeni przez użytkownika
(patrz `HANDOFF_party_build_audit.md`).

---

## ✅ Zamknięte w (22)

| # | Temat | Rozstrzygnięcie |
|---|---|---|
| 1 | Automatyka Sztuczek startowych | **Samuraj** zaimplementowany (`actors/samuraj.mjs`), `none` → `partial`. Alan (Szybkie palce) działał od początku. Pakowanie, Patriota i Ćwiczenie czyni mistrza zostają ręczne — z uzasadnieniem w `sztuczki-data.mjs`, nie przez przeoczenie. |
| 2 | Laffitte — brakujący `Fart` | Dograny z paczki. Karta zgadza się z Roll20 co do pozycji. |
| 3 | Mizoofobia / Schizofrenia paranoidalna | Treść **Koloru Kobaltu**, w osobnych mapach `KOBALT_PHOBIAS` / `KOBALT_DISEASES`, w pickerze tylko przy włączonym przełączniku. Tabele podręcznikowe (k8) nietknięte. Tabelka „Lekarz i farmaceuta" jest teraz danymi i da się ją rzucić. |
| 4 | Bronie homebrew poza katalogiem | `miecz` i `laska` dopisane do `WEAPONS` — `auditWeapons()` je widzi. |
| 5 | Surowce | **Nie było problemu.** Wszystkie cztery pozycje mają kanoniczne ikony i typ `consumable`, więc `getSurowiecType()` je rozpoznaje. Wpis w wersji (21) był błędny. |
| 6 | Paczki emitujące `gp` | Przebudowane przy zamkniętym Foundry. `gp = 0` w bazie, `Miecz`/`Laska` obecne, flaga Samuraja odświeżona. |
| 7 | Rewolwerowiec — aliasy | `jednoreki` / `lekka spluwa` → `rewolwerowiec` w `ALIASES`. |
| 8 | `ALIASES` „siodme poty" | Wyjaśnione: to zdolność Pochodzenia **Detroit**, nie homebrew. Victor przeniesiony na Detroit (patrz (22)). |
| 9 | Dryf obrażeń broni NPC-ów | Decyzja MG: **to tuning, nie ruszać.** Zapisane, żeby kolejny audyt nie zgłosił tego jako nowego. |
| 10 | Raynald — biegłość `med` | Przywrócona decyzją MG. |

---

## ⏳ Zostało

### ~~1. Migracja danych na dwóch aktorach~~ — ✅ zrobione w (23)

Raynald przepięty na `schizofreniaParanoidalna` (Active Effect przeżył), Laffitte ma
`Mizoofobia` jako prawdziwą fobię zamiast feata. Wykonane na żywym świecie przez Chrome DevTools
MCP, po naprawieniu przyczyny blokady w `Integracje/foundry-mcp` — szczegóły w (23).

W `worlds/output/data/_backups/` zostały **dwie niepełne kopie z 2026-09-08** (bez `LOCK`,
`LOG`, `MANIFEST`), pozostałość po nieudanych zapisach. Nie są wiarygodnymi backupami — można
je skasować.

### 1. Statystyki `Laski` do zatwierdzenia

1k6 obuchowe, finezyjna, 1 kg, 15 gb — wartości nadane przeze mnie, gdy okazało się, że broń
nie ma w ogóle kości obrażeń. Nikt ich nie zatwierdził.

### 2. Rewolwerowiec u Lorentza działa na całą Broń Palną Krótką

Ustalenie MG, nigdzie nie zakodowane — kanoniczny tekst mówi tylko o rewolwerach. Żyje wyłącznie
jako umowa przy stole. Jeśli ma przetrwać kolejną migrację, potrzebuje flagi na przedmiocie albo
wariantu homebrew.

---

## Do sprawdzenia przy okazji

`exhaustionSources` Raynalda ma **trzy identyczne wpisy** „Bezsenność" z tym samym `addedAt`
(1777243420767) — wygląda na potrójne zapisanie tego samego zdarzenia. Zauważone przy audycie
Kobaltu, nie ruszane, bo poza zakresem.


---

## Dopisane 2026-09-22 (magazynki symulacyjne)

### Wepchnięcie pojedynczego naboju do broni z wymiennym magazynkiem — WKK

**Skąd:** konsultacja z autorem mechaniki (Marcin Kubiesa). RAW tego nie przewiduje — przewiduje
ładowanie po jednym naboju wyłącznie dla `wmag` i `beb`. Autor dopuszcza to jako **wadę** broni
z wymiennym magazynkiem, okupioną testem **Zwinnych dłoni** (`zwi`).

**Klasyfikacja:** WKK, nie RAI. Pomysł jest autora, ale liczby będą nasze — decyzja MG
(2026-09-22). Przypis dla Marcina za pomysł należy się w komentarzu.

**ST zależny od kalibru** — decyzja MG: im większy nabój, tym trudniej wepchnąć go pojedynczo
w gniazdo magazynka. Propozycja siatki do zatwierdzenia, oparta na kategoriach, które już
istnieją w `AMMO_CALIBERS[].category`:

| Kategoria kalibru | ST | Uzasadnienie |
|---|---|---|
| Pistoletowa (.22 LR … .44 Mag) | 12 | krótki nabój, płytkie gniazdo — wykonalne pod presją |
| Śrutowa (.12 Ga) | 14 | długa łuska, ale magazynki rurowe są wyrozumiałe |
| Karabinowa (5,56 … .30-06) | 15 | długi nabój, sprężyna pod pełnym naciskiem |
| .50 BMG i cięższe | 18 | rozmiar naboju czyni z tego głównie deklarację intencji |

**Jak to wpiąć, gdy wejdzie:** ścieżka już istnieje i jest pusta z premedytacją —
`_performLoadOneAction()` w `weapons/magazine.mjs` odrzuca dziś broń z wymiennym źródłem
komunikatem „do wymiennego magazynka nie wkłada się naboi po jednym". To jest miejsce, w którym
ma stanąć test; samo ładowanie obsługuje już `loadSingleRound()`, tylko jest bramkowane na
`kind === "internal"`. Plik z regułą trafia do `scripts/wkk/`.

**Otwarte pytanie:** co się dzieje przy porażce — akcja przepada (propozycja) czy nabój wypada
i przepada? Pierwsze jest łagodniejsze i szybsze przy stole.
