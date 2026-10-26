# Hand-off — biegłości istniejących postaci (M6 D4)

> Dla agenta LLM. Powstał na końcu etapu E1 `PLAN_m6_drobne_zasady.md` (2026-10-27). Od E1 postać tworzona od zera
> dostaje komplet biegłości awansami dnd5e: klasa (zestaw startowy albo wieloklasowy, s. 59), profesja („BIEGŁOŚCI
> <PROFESJI>”), Sztuczka Muzyk, instrumenty. **Postacie zrobione wcześniej tych awansów nie przeszły** — i, jak pokazał
> audyt, mają też starsze dziury. MG (D4): uzupełnianie to osobna robota, ten plik ją opisuje. Nic tu nie dzieje się
> samo: każda zmiana na postaci kampanii — za zgodą MG, po kopii zapasowej.

## 0. Przeczytaj najpierw

- `PLAN_m6_drobne_zasady.md` §5.1 (tryby nadań, D1 — biegłość → Specjalizacja, D3 — wolne wybory tylko z
  nieposiadanych) i §11 (E0, E1).
- `scripts/actors/bieglosci.mjs` — audyt i ostrzeżenie D1; `scripts/config/classes-data.mjs` — dane profesji
  (`bieglosci`) i wieloklasowe (`multiclass`).
- `HANDOFF_party_build_audit.md` — starszy audyt ekwipunku tych samych postaci (Kier i Piekarz otwarci). Nie dubluj.

## 1. Narzędzie

```js
await game.neuroshima.bieglosci.audyt(game.actors.getName("Lorentz"))   // tylko odczyt; console.table + raport
```

Porównuje postać z awansami `Trait` z **kompendium** (nie z kopii przedmiotów na postaci). Rodzaje pozycji:

| `rodzaj` | Znaczy | Co z tym |
|---|---|---|
| `stary klucz` | biegłość zapisana pod kluczem stock dnd5e (`ath`, `itm`, `ins`…) albo spoza kategorii NOE — **na karcie jej nie ma, rzut idzie bez PB** | §2 krok 1 — przenieść na klucz NOE (mapa w `STARE_KLUCZE_UMIEJETNOSCI`) |
| `nadanie` + `brak` | stałe nadanie klasy albo profesji, którego postać nie ma (rzut obronny, kategoria broni, pancerz, zestaw) | §2 krok 2 — nadać |
| `wybór` + `brak (x z n)` | z puli wyboru postać ma mniej niż `n` | §2 krok 3 — **zapytać**, nie zgadywać |
| `wybór` + `nie wiadomo, co wybrał` | liczba się zgadza; nie da się sprawdzić, czy to te same wybory | nic, chyba że MG każe |
| `nadmiar?` | druga klasa sprzed Z14 dostała pełny zestaw startowy | §2 krok 4 — MG decyduje |
| `staraKopia` | przedmiot klasy/profesji na postaci jest sprzed M6 (nie ma tego awansu) | informacyjnie: biegłość się liczy z wartości na postaci, nie z kopii awansu |

Uruchomienie dla wszystkich naraz: pętla po `game.actors.filter(a => a.type === "character" && a.items.some(i => i.type
=== "class"))`. Postacie z klasą spoza paczki (`<unknown-class>` z importu Roll20) audyt pomija — §4.

## 2. Zasady uzupełniania (kolejność ma znaczenie)

1. **Stare klucze najpierw.** `system.skills.<stary>.value` → `system.skills.<noe>.value` (większa z dwóch wartości,
   Specjalizacja zostaje Specjalizacją), stary wpis wyzerować. Bez odpowiednika (`arc` — Wiedza tajemna, `rel` —
   Religia): **pytać MG** — nie ma ich w NOE; zwykle znaczy to, że gracz wybrał je w kreatorze 5e i powinien wybrać
   coś z listy klasy. Po tym kroku **puścić audyt jeszcze raz** — wiele „braków” w wyborach to te same biegłości pod
   starymi kluczami (Piekarz: Atletyka i Zastraszanie).
2. **Stałe nadania** (klasa: rzuty obronne, kategorie broni, pancerze, zestaw Zwiadowcy/Złodzieja; profesja: nadania)
   — RAW nie zostawia wyboru, więc nadać wprost: `system.abilities.<x>.proficient = 1`,
   `system.traits.weaponProf.value` / `armorProf.value` (dopisać klucz), `system.tools.<klucz> = {value, ability}`
   (cecha z `CONFIG.DND5E.tools[klucz].ability`). Nadanie profesji w trybie `upgrade` (`classes-data.mjs`): jeśli
   postać już ma biegłość — Specjalizacja (2), jeśli ma Specjalizację — zostaje, w raporcie dla MG (D1).
3. **Wybory z brakiem** — lista pytań do MG (i przez MG do graczy): co postać wybrała przy tworzeniu / przy profesji.
   Pula jest w raporcie (`klucz`). Wolne wybory tylko z tego, czego postać nie ma (D3). Instrumenty (Cwaniak 2,
   Kowboj 1, Sztuczka Muzyk 2) istnieją od M6 — tu gracz wybiera po raz pierwszy.
4. **Nadmiar wieloklasowy** — w kampanii w chwili audytu brak postaci wieloklasowych; gdyby się pojawiła, MG decyduje,
   czy zabrać to, czego zestaw wieloklasowy nie daje (s. 59).

Zapis: `actor.update({...})` w świecie kampanii, jedna postać naraz, jedna partia na postać. Przed pierwszą zmianą
kopia zapasowa świata (`npm run fvtt -- backup --profile=campaign --world=output --reason=bieglosci`, serwer
zatrzymany). Po zmianach: audyt każdej postaci jeszcze raz, wynik do raportu dla MG.

## 3. Wynik audytu z 2026-10-27 (moduł po E1)

Braki (`ok` i „nie wiadomo” pominięte). ¹ — przedmiot profesji na postaci sprzed M6. Wybory skrócone; pełna pula w
raporcie audytu.

| Postać | Klasa / profesja | Stare klucze → NOE | Stałe nadania — brak | Wybory — brak (ma z potrzebnych) |
|---|---|---|---|---|
| Alan | zwiadowca 3 / lowca-mutantow | ani → tre; ins → int; inv → sle; nat → prz; ste → skr | Narzędzia małego kłusownika | Atletyka / Intuicja / Percepcja / Przyroda / … (2 z 3); Narzędzia małego kowala / Narzędzia małego me… (0 z 1); Przyroda / Tresura (0 z 1) ¹; dowolne: Zestawy narzędzi (0 z 1) ¹ |
| Laffitte | cwaniak 3 / kaznodzieja | dec → osz; ins (Spec.) → int; inv → sle; slt → zwi | Charyzma; Zręczność; Broń palna długa ¹ | Akrobatyka / Skradanie się / Historia / Oszus… (1 z 4); dowolne: Instrumenty muzyczne (0 z 2); dowolne: Zestawy narzędzi (0 z 1); dowolne: Zestawy narzędzi (0 z 1) ¹ |
| Lorentz | twardziel 3 / kowboj | ins → int | Kondycja; Zręczność; Narzędzia małego kowala ¹ | Akrobatyka / Atletyka / Intuicja / Percepcja … (1 z 2); Pojazdy / Tresura (0 z 1) ¹; dowolne: Instrumenty muzyczne (0 z 1) ¹ |
| Piekarz | brutal 3 / gladiator | ath (Spec.) → atl; itm → zas | Broń biała; Broń palna krótka; Pancerz lekki; Pancerz średni; Tarcze; Broń improwizowana ¹ | Atletyka / Tresura / Percepcja / Przyroda / S… (0 z 2); Atletyka / Akrobatyka (0 z 1) ¹ |
| Raynald of Châtillon | spec 3 / monter | arc → —; inv → sle; nat → prz; rel (Spec.) → — | Inteligencja; Mądrość; Technika ¹ | Historia / Intuicja / Medycyna / Pojazdy / Pr… (1 z 4) |
| Victor von Blitz | zwiadowca 3 / sedzia | ins → int | Narzędzia małego kłusownika; Śledztwo ¹; Zastraszanie ¹ | Atletyka / Intuicja / Percepcja / Przyroda / … (2 z 3); Narzędzia małego kowala / Narzędzia małego me… (0 z 1); dowolne: Zestawy narzędzi (0 z 1) ¹ |
| Buźka | cwaniak 1 | dec → osz; prf → wys; rel → — | Broń biała; Broń palna krótka; Pancerz lekki | Akrobatyka / Skradanie się / Historia / Oszus… (1 z 4); dowolne: Instrumenty muzyczne (0 z 2); dowolne: Zestawy narzędzi (0 z 1) |
| Carson | zwiadowca 1 | rel → —; ste → skr | Broń biała; Broń miotana; Broń palna krótka; Broń palna długa; Pancerz lekki; Pancerz średni; Narzędzia małego kłusownika | Atletyka / Intuicja / Percepcja / Przyroda / … (2 z 3); Narzędzia małego kowala / Narzędzia małego me… (0 z 1) |
| Dante | brutal 1 | ath → atl; itm → zas | Broń biała; Broń palna krótka; Pancerz lekki; Pancerz średni; Tarcze | Atletyka / Tresura / Percepcja / Przyroda / S… (0 z 2) |
| Góra | twardziel 1 | ath → atl; itm → zas | Zręczność; Broń biała; Broń miotana; Broń palna krótka; Broń palna pośrednia; Broń palna długa; Broń palna ciężka; Broń specjalna; Pancerz lekki; Pancerz średni; Pancerz ciężki; Tarcze | Akrobatyka / Atletyka / Intuicja / Percepcja … (0 z 2) |
| Iris | spec 1 | arc → —; inv → sle; rel → — | Broń biała; Broń palna krótka; Pancerz lekki | Historia / Intuicja / Medycyna / Pojazdy / Pr… (1 z 4); dowolne: Zestawy narzędzi (0 z 2) |

Wnioski dla MG:

- **Każda postać ma martwe biegłości pod kluczami stock dnd5e** — to nie jest skutek M6, tylko importu; do E1 nikt
  tego nie sprawdzał. Te umiejętności rzucają dziś bez PB (np. Specjalizacja Piekarza w Atletyce, Laffitte'a w
  Intuicji).
- Lorentz, Laffitte i Raynald nie mają rzutów obronnych klasy; Piekarz — broni i pancerzy klasy.
- Pregeny Jazdy Próbnej (Buźka, Carson, Dante, Góra, Iris — postacie jednostrzałowe, folder „PC”) mają te same
  wzorce; MG zdecyduje, czy je poprawiać, czy zbudować od nowa awansem (przy M7 i tak zmieniają się zdolności).

## 4. Poza audytem — pytania do MG

- **Kier** (Postacie) oraz **Adam, Bob, Meksyk, Przydupas** (TST1) mają klasę `<unknown-class>` z importu — audyt ich
  pomija. Kier był świadomie odłożony w `HANDOFF_party_build_audit.md`; TST1 wygląda na postacie testowe z Roll20.
- `arc`/`rel` bez odpowiednika (§2 krok 1).
- Wszystkie wybory z §3 — co postać wybrała.
- Kowboj Lorentza i Kaznodzieja/Cwaniak Laffitte'a: instrumenty — nowe, gracze wybierają.

## 5. Gotowe, gdy

Audyt każdej postaci z §3 nie ma pozycji `stary klucz` ani `nadanie` ze stanem `brak`; wybory z brakiem rozstrzygnął
MG (zapisane albo świadomie pominięte); raport z listą zmian per postać w odpowiedzi dla MG (bez wpisu do
publicznego repo poza aktualizacją tego pliku: „zrobione <data>”).
