# Hand-off — podręcznik z października: co w module jest nieaktualne

2026-09-26. RAW ma od dziś jedno źródło: `Neuro 5e/Podrecznik/NOE/` — konwersja PDF-a z października
(„NOE s. N” = strona drukowana). Marcowy PDF, `source.txt`, `source_japierdole.txt`, `podrecznik.md`,
`agent-md/` i ręcznie przepisane pliki `Podrecznik/Bestiariusz/*.md` poszły do Kosza. Pełna lista
zmian między wydaniami: `Neuro 5e/Podrecznik/CHANGELOG.md` (poza repo — tekst podręcznika nie trafia
do publicznego gita).

**Ta sesja zmieniła tylko cytowania, komentarze i narzędzia — ŻADNYCH danych.** Wszystko niżej
to lista rzeczy do zrobienia, z decyzjami zostawionymi MG.

---

## 1. Ekstraktory przepięte na NOE (gotowe, zweryfikowane)

| Skrypt | Źródło teraz | Weryfikacja |
| --- | --- | --- |
| `dev/classes/extract_classes.py` | `NOE/07 KLASY/*.md` (przez `dev/classes/noe_source.py`) | 13/13/14/11/13/12 zdolności, jak dotąd |
| `dev/classes/extract_professions.py` | j.w. | wszystkie `EXPECTED` znalezione, 0 problemów |
| `dev/bestiary/extract_bestiary.py` | `NOE/13 NOTATNIK ŁOWCY/*/*.md` + `dev/bestiary/lore-extras.json` | 52 istoty, 0 błędów, id bez zmian |

- Wszystkie trzy mają `--out` — uruchamiaj najpierw do pliku tymczasowego i porównuj z commitowanym
  JSON-em. Bez `--out` nadpisują dane (a `npm run build:bestiary` robi to od razu).
- `extract_bestiary.py` ma warstwę `legacy_text()`, która tłumaczy układ NOE na dawny układ
  plików Obsidiana — parser (`parse_text`) jest nietknięty poza tolerancją na interpunkcję.
  Id istoty = slug nagłówka lore; wyjątki w `ID_ALIASES` (`bit-boys-aka-croats` → `bit-boys`).
- `lore-extras.json` (nowy) trzyma tagi krwi dla Splattera (`{id: {krewTag, krew}}`) — podręcznik
  nie ma takiego pola, więc nie może żyć w NOE. Wygenerowany z obecnego `bestiary.json`.
- Nowe **ostrzeżenia źródła** (podręcznik, nie parser): interpunkcja ataków u Konwojenta, Kanibala,
  Pająka, Obrońcy, Kurczaka, Alahamy; brak typu obrażeń u Widłów Cywila; zapis `10 (0)` zamiast
  `10 (+0)` u Pulsera. Parser je przyjmuje i zgłasza — nie trzeba nic poprawiać.

## 2. Bestiariusz — nieaktualne dane (`bestiary.json` → `bestiary-data.mjs` → pack)

Regeneracja: `npm run build:bestiary`, potem przegląd diffu `bestiary-data.mjs`.

**Zmiany wydania** (październik ≠ marzec):
- Obrońca (s. 223): PB +5 (było +4); wyzwolenie z Chwytaka ST 17 (było 16).
- Grubas (s. 228): Siła przeciwnika 16 (było 14).
- Zombie — nakładka Death Breath (s. 242): cięte/kłute/obuchowe z `immunities` do `resistances`.
  Sprawdź, czy `gen_bestiary.py`/`AUTOMATION` nie zakłada gdzieś niewrażliwości.
- Uzupełnione „str. XXX” (Genotyp wilczy → s. 238, Mrokoszczur → s. 111, Mesmeryta → s. 164).
- Nazwy mutantów: „GENERACJA I. NOCNY GHUL” → „GENERACJA I – NOCNY GHUL” (×7). Id bez zmian,
  ale nazwy aktorów w packu się zmienią.

**Błędy starej ręcznej transkrypcji** (w obu wydaniach tak samo — naprawia je sama regeneracja):
- Cyngiel ma Stopień Zranienia (`usesZranienie: true`) — stary plik go gubił.
- Gigamut: brakowało ataku *Rogi*; Udźwig 1400/2800 kg teraz trafia do `carry`, nie do cechy.
- Taran: ucięte ostatnie zdanie *Taktyki*; Cywil: ucięty drugi akapit *Informacji*.

**Do decyzji MG:**
- Widły Cywila: październik gubi typ obrażeń (marzec: kłute). Po regeneracji `damage.type = null`.
  Albo zostawić RAW, albo przywrócić `piercing` wpisem w `AUTOMATION`.
- Harpie: „Atak Wielokrotny” wielką literą w podręczniku — kosmetyka; id cechy jest slugiem,
  więc `RULES` nadal działa.

## 3. Klasy i profesje (`classes.json`, `professions.json` → `class-features-data.mjs`)

Regeneracja: `extract_classes.py` + `extract_professions.py` → `gen_features.py`.
- Progresja bez zmian — ani poziomy, ani PB, ani kolumny tabel klasowych (`classes-data.mjs` aktualne).
- Tekst: odsyłacze „str. XXX” w podręczniku są już uzupełnione (Sztuczki s. 102, Badanie,
  Produkcja przedmiotów, Pochodzenie, Olbrzymie obrażenia); `professions.json` ma też śmieć z
  numeracji stron („000 81” w Reanimacji Medyka). Znika po regeneracji.
- Nagłówek `class-features-data.mjs` ma notę „This build still carries text from the March 2026
  dump” — generator jej nie emituje, więc regeneracja sama ją usunie.

## 4. Dane ręczne, które rozjechały się z NOE

| Plik | Co | NOE | Charakter |
| --- | --- | --- | --- |
| `scripts/config/sztuczki-data.mjs` (`muzyk`) | Fuks dla „tylu sojuszników co mod. CHA” | **1 +** mod. CHA (s. 105) | tekst; `auto: []` |
| `scripts/config/addons-data.mjs` (`przekucie`) | dowolna broń biała; zdejmuje `two` | tylko broń **jednoręczna** (s. 128) — dwuręczna się nie kwalifikuje | **mechanika**: dodać wymóg braku `two`, `removeProperties` przestaje mieć sens |
| `scripts/config/damage-types.mjs` (`slashing`) | etykieta „Sieczne” | „Cięte” (tabela typów obrażeń s. 256) | etykieta; to samo w `actors/grenade-inventory.mjs:1542` i opisach Samuraja (`sztuczki-data.mjs`, `actors/samuraj.mjs`) |
| `scripts/config/gear-data.mjs:226` | „Części zamiennych (CZ)” | „Części zapasowe (CZ)” (s. 144) | tekst |

Uwaga do „cięte”: podręcznik sam nie jest konsekwentny — *Naostrzenie* wciąż wymaga broni
„siecznej i kłutej” (s. 128). Mechanika Samuraja (typ `slashing`) jest zgodna z NOE; zmienia się
tylko słowo.

## 5. Bez zmian — sprawdzone automatycznie

- `weapons-data.mjs`: kości obrażeń, waga, cena, dostępność — każda pozycja zgodna z tabelami
  NOE s. 116–124 (różnice tylko w zapisie: śrut/breneka strzelb, „2K6” w XM-8).
- `armor-data.mjs`: TT, limit ZRC, Siła, skradanie, waga, cena, dostępność — zgodne z s. 113.
- `falling.mjs` (upadek do cieczy ST 10, sukces bez obrażeń — s. 259), modyfikatory
  dostępności (s. 43), tabele progresji klas.

## 6. Poza kodem (na przyszłość)

- *Kolory Neuroshimy* (s. 201–202): krwawienie w Rdzy/Rtęci/Stali tamuje się teraz akcją
  Pomaganie + test INT (Medycyna) ST 10 (było: narzędzia małego medyka). Moduł Kolorów nie
  implementuje (`config/settings.mjs`), więc nic nie jest nieaktualne — ale przy implementacji
  bierz wersję z października.
- Nowa tabela skrótów (s. 23); opis [A]/[B]/[I]/[R] przeniesiony do sekcji Akcje (s. 21).
