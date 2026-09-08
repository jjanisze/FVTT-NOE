# Hand-off — Audyt builda i ekwipunku: **pozostali Piekarz i Kier**

Przepisane 2026-09-07 po wykonaniu audytu dla Victora, Alana, Lorentza, Laffitte'a i
Raynalda — patrz **IMPLEMENTATION.md (21)** po pełny opis tego, co zrobiono i dlaczego.
Poprzednia wersja tego pliku (opisująca całą szóstkę) jest już nieaktualna i została
zastąpiona; historia siedzi w `git log`.

**Zostały dwie postaci.** Użytkownik wyłączył je ze zlecenia w trakcie sesji
(„Zignoruj Piekarza", a przy pytaniu o Kiera: „Pomiń Kiera, tak jak Piekarza") — to była
decyzja o zakresie tamtej sesji, nie o tym, że te postaci są nieważne na zawsze. Jeśli
kiedyś wrócą do gry, ten plik mówi, od czego zacząć.

---

## 0. Przeczytaj najpierw

- **IMPLEMENTATION.md (21)** — metoda, która się sprawdziła na pozostałej piątce, plus
  wszystkie znalezione wzorce błędów. Nie wymyślaj tego od nowa.
- **`TODO_mechanika.md`** — otwarte sprawy mechaniczne z tamtego audytu. Kilka z nich
  (paczki emitujące `gp`, `ALIASES`) dotknie też Piekarza/Kiera.
- **`HANDOFF_ekwipunek.md`** — starszy, wciąż otwarty wątek (ikony/aliasy). Nie duplikuj.

## 1. Najważniejsza rzecz, której poprzedni audyt o mało nie przeoczył

**Każda postać ma prawo do jednej startowej Sztuczki** (`Tabele/Sztuczki.md`: „Na starcie
postać może wybrać **jedną Sztuczkę** … lub **50 gambli**"). Żadna klasa nie daje Sztuczki
na 1 poziomie, więc przy sprawdzaniu „czy poziom 3 się zgadza" ta Sztuczka wygląda na
nadmiar i kusi, żeby ją skasować. **Nie kasuj.**

Gorzej: import z Roll20 potrafi rozbić jedną Sztuczkę na **osobno nazwane klauzule**
(Samuraj → Osełka + Dobycie + Zasłona; Pakowanie → Mam pod ręką + Bez dna) — dokładnie tak,
jak rozbity Berserk w `ALIASES`. Nazwy tych fragmentów **nie występują w żadnym kompendium**,
więc wyszukiwanie po nazwie zwróci zero i wygląda to na homebrew.

**Metoda, która to rozwiązuje** — szukaj tekstu feata *wewnątrz opisów* dokumentów w paczkach:

```js
const strip = h => (h||"").replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/\s+/g," ");
const sz = await game.packs.get("neuroshima-2026-overrides.sztuczki").getDocuments();
// szukaj charakterystycznej FRAZY z opisu feata, nie jego nazwy
sz.filter(d => strip(d.system.description?.value).includes("aura szacunku")).map(d => d.name);
```

Piekarz ma feat `Młynek` — a `Młynek [B]` jest klauzulą Sztuczki **`Rozróba`**. To niemal na
pewno jego startowa Sztuczka w dokładnie tym samym rozbitym kształcie. Sprawdź, zanim uznasz
`Młynek` za homebrew.

## 2. Piekarz (`MDczZGFlMTBkMWQ5`) — Brutal 3 / Gladiator, 38 itemów

Postać **martwa w fikcji** (Sesja 12 — Laffitte ją zastąpił), więc priorytet niski, ale
danych najwięcej. Konkretne, potwierdzone tropy:

- **`dd` typu `spell`** — item nazwany „dd", typ `spell`, bez opisu, z ikoną-awatarem.
  Neuroshima nie ma zaklęć (`config/spellcasting.mjs` je wycina). To czysty śmieć z importu.
- **Duplikaty broni**: `Nadziak` ×2 i `Obrzyn` ×2. **Uwaga — to NIE jest ten sam przypadek co
  duplikaty Lorentza.** Tutaj egzemplarze *różnią się mechanicznie*: jeden Nadziak ma dodatek
  `naostrzenie` (+1/+1) i cenę w `gb`, drugi nie ma dodatków i miał `gp`; Obrzyny mają różną
  amunicję (`12ga_b` vs `12ga_s`) i różne obrażenia (2k6 obuchowe vs 2k4 kłute). Zanim
  cokolwiek skasujesz, ustal który jest prawdziwy — u Lorentza wystarczyło porównać opisy,
  tu nie wystarczy.
- `Latarka ręczna` ×2 (różne `latarkaChargeMaxMin`: 180 vs 420) i `Baterie` ×2 (qty 1 i 2) —
  też do zdecydowania, czy to duplikaty czy realnie dwie sztuki.
- `Powojenne zdjęcie kobiety` — bez wagi i ceny **i tak ma zostać**, patrz
  `HANDOFF_ekwipunek.md` §2 (pamiątka bez wartości handlowej).
- `auditWeapons()` zgłasza jego `Nadziak` (bonus obrażeń `1` vs katalogowe „brak") — ale to
  właśnie ten z dodatkiem `naostrzenie`, więc bonus jest prawdopodobnie **poprawny**, a
  zgłoszenie fałszywe. Nie „naprawiaj" go odruchowo.

## 3. Kier (`ZDI4OGZiMGY0NzMz`) — `<unknown class>` 2, 4 itemy

- `migrateClasses({actors:["Kier"]})` **nie rozpozna klasy sam** — sprawdzone, wszystkie
  sześć wyników punktowych to 0 (ma tylko jeden feat, i to z Pochodzenia). Wymaga ręcznego
  przypisania.
- `Postacie/BG/Kier.md` mówi **„Klasa: Cwaniak"** — ale ten plik jest niespójny: jego pierwsza
  linia to wklejka z karty Lorentza (imię „Lorentz", wiek 25, Pochodzenie Miami), a dopiero
  pola niżej opisują Kiera (Cwaniak, Vegas, 45 lat). Traktuj pierwszą linię jako śmieć.
- **Konflikt do rozstrzygnięcia**: plik deklaruje Pochodzenie **Vegas**, a żywy aktor ma
  background **Miami** i feat `Ja już swoje odchorowałem` (zdolność Miami). Użytkownikowi
  przedstawiono ten konflikt i wybrał wtedy „pomiń" zamiast którejkolwiek opcji — więc to
  **nadal otwarte pytanie do MG**, nie coś do wydedukowania z danych.
- `Bagnet` jest typu `loot` i **tak jest dobrze** — to dodatek do broni (`ulepszenie: "bagnet"`),
  nie broń. Nie konwertuj go na `weapon`.
- `Bejsbol` ma generyczną ikonę rdzenia dnd5e (`systems/dnd5e/icons/svg/items/weapon.svg`),
  choć katalog ma `iron_pipe_club.svg` dla `Bejsbol/Rurka`. To naprawa w miejscu
  (przepięcie wskaźnika), nie pozycja do kolejki ikon.

## 4. Czego NIE robić

- Nie ruszaj ikon featów/Sztuczek — osobny, duży przebieg (`dev/icons/MISSING.md`).
- Nie migruj waluty; to już zrobione dla całego świata w (21). Ale **paczki nadal emitują
  `gp`** (`TODO_mechanika.md` §6), więc przedmiot świeżo przeciągnięty z kompendium przyjdzie
  z `gp` — popraw taki punktowo, dopóki paczki nie zostaną przebudowane.
- Nie zdejmuj bonusów obrażeń z broni NPC-ów — patrz `TODO_mechanika.md` §9.

---

**Skasuj ten plik**, gdy Piekarz i Kier będą rozliczeni (albo gdy MG zdecyduje, że nigdy nie
będą) — konwencja repo, patrz ARCHITECTURE.md → „Dokumentacja towarzysząca".
