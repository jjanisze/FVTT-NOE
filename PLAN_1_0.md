# PLAN — Wydanie 1.0 (po becie)

> Status: **ZBIÓR** (od 2026-10-26, MG). Tu trafiają pozycje świadomie odłożone za betę, które mają już projekt albo
> przynajmniej opis zakresu — żeby nie ginęły w tabelach „otwarte” planów etapów. Kolejność i termin ustali MG po
> styczniowej kampanii testowej (`PLAN_beta.md` §0 krok 9). Krótka lista „świadomie po becie” bez projektu zostaje w
> `PLAN_beta.md` §4; pozycja przenosi się tutaj, gdy dostaje opis.
>
> Repozytorium jest publiczne: liczby, parafrazy i numery stron NOE, bez cytatów i bez fabuły.

---

## 1. Zasady

- Nic stąd nie blokuje bramek bety (`PLAN_beta.md` §1). Pozycja, która zmieni zapisane dane, wymaga migracji — po
  becie nie ma już zamrożenia modeli z B2, ale jest kampania na żywo.
- Każda pozycja ma pochodzenie (plan i numer decyzji), zakres i to, co już jest przygotowane.

---

## 2. Materiał przegród z encji CDDA (z `PLAN_m6_drobne_zasady.md` P5)

**Skąd.** M6 (§5.4) daje MG „fizyczność na żądanie”: narzędzie „Ufizycznij” nakłada licznik PW i odporności na
drzwi, okno czy płot z eksportu map. Domyślny materiał i rozmiar bierze z **klasy przegrody** (U10: drzwi — Średni,
drewno, wytrzymały; okno — Duży, szkło, kruchy; płot — Duży, cienka blacha…), bo eksporter zna tylko klasę.
MG poprawia w oknie. P5 pytał o krok dalej; MG (2026-10-26): do jawnego planu 1.0.

**Co wiadomo.** Eksporter (`Maps/tools/wall_rules.py`) zamienia teren CDDA z `move_cost == 0` na klasy przegród
(`wall`, `door`, `door_locked`, `window`, `fence`, `gate`, `railing`, `secret_door`…) na podstawie faktów z
leksykonu, nie prefiksów. Sam identyfikator encji niesie materiał, którego klasa nie widzi: `t_door_c` i
`t_door_metal_c`, `t_window` i `t_reinforced_glass`, `t_chainfence` i `t_fence` (drewniany), `t_wall_wood` i
`t_concrete_wall`.

**Zakres.**
1. Tabela w repo Map: encja CDDA → materiał NOE (wiersz tabeli TT obiektów, NOE s. 253: ubranie/papier 11 … chrom 23)
   i kruchość (kolumna tabeli PW). Domyślnie z leksykonu (`material` encji, flagi), nadpisania jak w `NADPISANIA`.
2. Eksporter wpisuje `material` i `kruchosc` do flagi ściany (pole `material` zarezerwowane w M6) i kafla rekwizytu.
3. „Ufizycznij” czyta domyślne wartości z flagi, a szablony klas (U10) zostają tylko na przegrody bez materiału —
   rysowane ręcznie na warstwie `__WALLS`.
4. Raport eksportu: ile przegród dostało materiał, ile spadło na szablon klasy.

**Gotowe z M6.** Model obiektu (aktor bazowy, żeton niepowiązany z deltą, natywny `hp.dt`), okno z tabelami TT i PW,
pamięć zniszczeń, przycisk „Zniszczenia”. P5 zmienia tylko źródło wartości domyślnych.

**Czego nie robimy nawet tu.** Automatycznego niszczenia terenu przez efekty obszarowe bez „Ufizycznij” — wymagałoby
fizyczności każdego kafla (odrzucone w M6 D5).
