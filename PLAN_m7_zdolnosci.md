# PLAN — M7: Automatyka zdolności — poziomy 1–3, Sztuczki i Pochodzenia drużyny

> Status: **PROJEKT** (2026-10-25). Decyzje MG D1–D5 (§5.1); ustalenia U1–U30 do weta (§5.2); otwarte P1–P7 (§5.3).
> Wywołanie: `PLAN_beta.md` §3 M7 („ciągłe”) — **zakres przed betą rozszerzony decyzją D2**. Bramka B5 (plakietka na
> każdej zdolności) jest spełniona od 2026-10-03; ten plan podnosi samo pokrycie. Rozmiar: **XL** (≈ 120 pozycji,
> z czego ~65 do automatyki; po 2026-10-25 bez Szybkich nóg, Skoku Gladiatora, Skoczka i Jeźdźca — przeszły do
> `HANDOFF_movement_hotbar.md` i `PLAN_m4_pojazdy.md` §6.3). Zależności — §4 (M6, M4, handoff ruchu). Nie implementować
> przed przejściem MG przez §5.
>
> **Metoda.** Zdolność to nie moduł kodu, tylko **wiersz w rodzinie**: dziesięć silników (§3) pokrywa ~120 zdolności.
> Dla każdej rodziny: *jak robi to stock dnd5e* → *czego dnd5e nie wie i dlatego zostawia stołowi* → *co my wiemy* →
> *ile automatyki*. Zasady z `PLAN_beta.md` §2 bez zmian: oznaczać, nie zakazywać; wykrycie, nie zastosowanie, gdy RAW
> zostawia decyzję MG; jeden magazyn stanu, jeden lejek zapisu; każda reguła — czysta funkcja + test warstwy 1.
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (październik), `s. N` = strona drukowana; dnd5e = źródła 6.0.6; rdzeń = 14.369.
> Repozytorium jest publiczne: parafrazy i numery stron, bez cytatów z podręcznika i bez fabuły.

---

## 0. W skrócie

| Filar | Co dostaje stół | § |
|---|---|---|
| **Fundament** | znacznik „Reakcja zużyta” z dźwiękiem naruszenia (D5); rejestr „po rzucie”; rejestr warunkowych Ułatwień w RO i testach; bramki raz na turę/rundę; zapamiętane wybory na zdolności | §3.0 |
| **Po rzucie** | Motywacja dla sojusznika, Szczęście, Amen, Łeb jak sklep, Spieprzysz to!, Twardość, Fart… — przyciski pod rzutem, werdykt przelicza się sam (D4) | R3 |
| **Wsparcie** | Dobra rada, Łaska boża, Let's rock — efekt ląduje na sojuszniku i wygasa sam na początku tury dającego | R7 |
| **Dane, nie kod** | Sokole oko, Ja już swoje odchorowałem, biegłości i +1 do Cech ze Sztuczek i Pochodzeń — stockowe Efekty Aktywne i awanse na featach | R1, R2 |
| **Walka z kontekstem** | Ulubiona broń (3 klasy), Mój wróg, Rzeźnik (lalka wie, co w drugiej ręce), Zawołajcie kolegów, Zasadzka, Bolesny atak… | R4, R5, R6 |
| **Przycelowanie** | „Celuję w…” w oknie ataku: TT celu rośnie, trafienie nakłada skutek z tabeli | R8 |

---

## 1. Filozofia stock dnd5e — jak buduje zdolności i czego nie robi

**Jak.** Zdolność to przedmiot `feat` (typ `class`), który niesie:
- **aktywności** (`utility`, `attack`, `damage`, `heal`, `save`, `check`, `enchant`, `forward`, `summon`) — przycisk na
  karcie i w czacie;
- **użycia** z odnawianiem (`CONFIG.DND5E.limitedUsePeriods`: `lr`, `sr`, `day`, `dawn`, `dusk`, `initiative`,
  `turnStart`, `turnEnd`, `turn`; odnawia je `Combat5e#_recoverUses` w `documents/combat.mjs`);
- **wartości skali** (`@scale.rogue.sneak-attack`);
- **Efekty Aktywne** przenoszone na aktora (`system.bonuses.*`, `system.abilities.<x>.save.roll.mode`,
  `system.skills.<x>.roll.mode`, `system.traits.dr/ci`, `system.attributes.movement.*`);
- **flagi specjalne** (`CONFIG.DND5E.characterFlags`: `halflingLucky`, `tavernBrawlerFeat`, `jackOfAllTrades`,
  `remarkableAthlete`, `reliableTalent`, `weaponCriticalThreshold`, `meleeCriticalDamageDice`…);
- **awanse** — także na featach (`data/item/feat.mjs` miesza `AdvancementTemplate`): ASI, `Trait`, `ItemChoice`;
- **reguły Efektów Aktywnych (nowość 6.0)** — zmiany typu `dnd5e.advantage`, `dnd5e.bonus`, `dnd5e.minimum`,
  `dnd5e.maximum` na kategoriach `attack`, `check`, `save`, `d20`, `damage`, `healing`, liczone **w chwili rzutu**
  (`documents/applied-rules.mjs`, `D20RollModificationField.combineFields`) i filtrowane **warunkami na danych rzutu**
  (`roll.ability`, `roll.skill`, `roll.tool`, `roll.type`, `roll.attack.type/mode/classification`,
  `roll.damage.type`, `roll.item`, plus dane aktora, np. `statuses`) — wiki `Active-Effect-Rules.md`, `Filters.md`.
  Warunek na całym efekcie wygasza efekt (np. „tylko w Berserku”);
- **pseudo-wygasanie** `sourceStart` / `sourceEnd` / `targetStart` / `targetEnd` („do początku następnej tury
  dającego”) przy nakładaniu z tacy efektów (`ActiveEffect5e.PSEUDO_EXPIRIES`);
- **tace** w karcie czatu — obrażeń i efektów (`applications/components/effect-application.mjs`): kto ma cele, ten
  nakłada.

Karta pokazuje to w zakładce cech (licznik użyć, przyciski aktywności) i w Ulubionych (zasoby pod ręką). U nas analog
Ulubionych to pasek zdolności (`actors/ability-hotbar.mjs`).

**Przykłady z paczek dnd5e** (`packs/_source/…`):

| Zdolność 2024 | Budowa | Czego system nie robi |
|---|---|---|
| Sneak Attack (`classes24/rogue/class-features/sneak-attack.yml`) | aktywność `damage` z `@scale.rogue.sneak-attack`, 1 użycie | warunku (Ułatwienie albo sojusznik obok) nie sprawdza; „raz na turę” tylko w opisie |
| Bardic Inspiration (`classes24/bard/class-features/bardic-inspiration.yml`) | `utility` w Akcji Bonusowej, użycia `max(1, @abilities.cha.mod)`, rzut kością skali na karcie barda | kość nie trafia do rzutu sojusznika — ten dodaje ją ręcznie |
| Danger Sense (`classes24/barbarian/class-features/danger-sense.yml`) | Efekt Aktywny: `roll.mode` +1 w RO na ZRC | warunku „nie Obezwładniony” nie egzekwuje |
| Lucky (`races/halfling/halfling-features/lucky.yml`) | flaga `halflingLucky`: `D20Roll` przerzuca 1 automatycznie | — (bez limitu użyć, więc może być automatyczna) |

**Filozofia:** dane najpierw; system daje liczbę i przycisk, **kontekst ocenia stół**, bo dnd5e nie wie, gdzie stoją
żetony, co kto trzyma, jakiego typu jest cel ani czy atak trafił.

**Co my wiemy, a dnd5e nie:** lalka — ręce i chwyt (`actors/doll*.mjs`); kategoria istoty — Ludzie/Maszyny/Mutanty/
Potwory/Zwierzęta (`config/creature-types.mjs`); werdykt trafienia z TT (`combat/trafienie.mjs`, `actors/tt.mjs`);
sąsiedztwo i stany (`combat/okolicznosci.mjs`); Berserk i stany klasowe (`actors/class-state.mjs`); skład drużyny i
biom (`actors/party-travel.mjs`); przerzuty z ponownym rozstrzygnięciem (`combat/rerolls.mjs`, hak
`neuroshima.rerolled`); przekaźnik zapisów przez MG (`postoj/przekaznik.mjs`).

**Reguła wyboru narzędzia:** stockowy klocek (reguła Efektu Aktywnego z warunkiem, Efekt Aktywny, flaga, awans,
użycia z odnawianiem, pseudo-wygasanie), gdzie wystarczy — najtańszy, przeżywa aktualizacje dnd5e, widać go na karcie i
w oknie rzutu. Silnik rodziny — tylko tam, gdzie potrzebny kontekst spoza danych rzutu (cel, scena, lalka, werdykt,
źródło RO). **Moduł nie używa dziś reguł 6.0 ani pseudo-wygasania** — Samuraj liczy premie hakiem `preRollAttack`;
M7 przechodzi na reguły tam, gdzie warunek mieści się w danych rzutu (spike w E0).

---

## 2. Zakres i kolejność

### 2.1 Zakres (D2)

- **Zdolności klasowe poziomów 1–3** sześciu klas — 33.
- **Wszystkie zdolności 18 profesji** (każda wybierana na 3. poziomie) — 62 (z WKK Pistolero).
- **Opcje** (Wyjadacz Twardziela i Zwiadowcy, Mój wróg ×5) — 11.
- **Zdolności Pochodzeń i Sztuczki** drużyny kampanii i pregenów Jazdy Próbnej — 11 Pochodzeń, 6 Sztuczek (+ Sztuczki
  pregenów, gdy MG je wybierze — P4).

**Stan w zakresie (2026-10-25):** 10 pełnych, 24 częściowe, 72 bez automatyki (106 klasowych); Pochodzenia i Sztuczki
drużyny: 1 pełna, 3 częściowe, 13 bez.

**Znaleziska przy inwentarzu:**
- Kopie zdolności na kartach mają nieaktualne plakietki (np. Samuraj u Victora: „brak”, rejestr: częściowa) — potrzebny
  `game.neuroshima.zdolnosci.resync({ commit: true })` i odpowiedniki dla Sztuczek i Pochodzeń (E8, za zgodą MG).
- Pregen Iris (Spec 1) ma Trajektorię zamiast zdolności 1. poziomu Speca (Dobra rada, Inteligentna obrona) — do
  hand-offu biegłości z M6 (D4 tamtego planu), który i tak audytuje pregeny.
- Czat kampanii nie ma ani jednego użycia zdolności (108 wiadomości od 2026-09-25) — jedynym źródłem częstotliwości jest
  transkrypt sesji 12: **Motywacja** (wielokrotnie, „kość dla sojusznika do k20”) i **Dobra rada** (dwukrotnie).

### 2.2 Kolejność — drużyna kampanii najpierw (D1)

| Zdolność | Kto (kampania) | Rodzina | Etap |
|---|---|---|---|
| Motywacja, Szczęście, Spieprzysz to!, Amen | Laffitte | R3 | E1 |
| Łeb jak sklep | Raynald | R3 | E1 |
| Czas patriotów | Evie | R3 | E1 |
| Fart | Laffitte | R3 | E1 |
| Dobra rada | Raynald | R7 | E2 |
| Kolejka | Laffitte | R7 | E2 |
| Sokole oko | Alan, Lorentz | R1 | E3 |
| Ja już swoje odchorowałem, Telepata | Lorentz, Laffitte | R1+R2 | E3 |
| Ćwiczenie czyni mistrza, Patriota, Samuraj (+1), Pakowanie (+1), Przycelowanie (+1 ZRC) | Lorentz, Laffitte, Victor, Raynald, Evie | R2 | E3 |
| Serwisowanie (biegłość), Jeśli ma silnik, to ruszy, Siódme poty | Raynald, Alan, Victor | R2 (+M4) | E3 |
| Ulubiona broń | Alan, Lorentz, Victor | R5 | E4 |
| Mój wróg (Potwory, Ludzie) | Alan, Victor | R4 | E4 |
| Rzeźnik | Victor | R4 | E4 |
| Mutant na śniadanie (reszta) | Alan | R4 | E4 |
| Mój biom (reszta) | Victor | R4 (§3.0.3) | E4 |
| Szybka gadka, Szybkie badanie | Laffitte, Raynald | R5 | E4 |
| Przycelowanie (klasowe i Sztuczka) | Lorentz, Evie | R8 | E6 |
| Zryw, Coś mi tu śmierdzi, Kłusownik | Lorentz, Raynald, Alan, Victor | R9 | E7 |

Pozostałe pozycje zakresu idą w tych samych etapach, w kolejności rodzin.

---

## 3. Rodziny

### 3.0 Fundament (E0)

**3.0.1 Lekka ekonomia akcji i sygnał naruszenia (D5).** **Warstwa akcji jest wspólna z `HANDOFF_movement_hotbar.md`
§4** (jedna definicja i jeden lejek deklaracji: `actions-data.mjs` / `actions.mjs`, publicznie `game.neuroshima.actions`;
tam powstaje zapis deklaracji A/B dla ruchu). M7 dokłada do niej jedno: status „Reakcja zużyta” na aktorze,
zdejmowany na początku jego tury (efekt z `duration` i `expiry: turnStart`, rdzeń v14 —
`client/documents/active-effect.mjs` `isExpiryEvent`). Każdy przycisk [R] go nakłada; drugi raz w rundzie — **dźwięk
negatywny (buzz) i szept do MG i gracza**, działanie idzie dalej. Jedno API `sygnalNaruszenia(aktor, powod)` (dźwięk
przez `foundry.audio.AudioHelper`, bez wymogu Sequencera; plik dźwięku — zamówienie w liście oprawy). Używają go też M6
(wspinaczka bez wolnych rąk, `ciężka` bez oparcia), handoff ruchu (czerwona trasa, skok za daleko — jeśli tamten §10
wybierze sygnał) i Ulubiona broń bez amunicji. Akcja bonusowa — P1: z deklaracji B, które warstwa akcji i tak zapisuje.
Handoff świadomie nie robi ogólnego audytora A/B/R/I — ten znacznik też nim nie jest: oznacza, nie liczy budżetu akcji.

**3.0.2 Rejestr „po rzucie” (D4).** Uogólnienie `combat/rerolls.mjs` (Forsowanie, Fuks) do tabeli źródeł:

```js
// jeden wiersz = jedna zdolność; przycisk pod rzutem k20 (albo pod rzutem obrażeń)
{ id: "motywacja", zdolnosc: "motywacja",
  widzi: "zrodlo-w-zasiegu",   // właściciel rzutu | właściciel źródła w zasięgu | MG
  zasieg: 18, kiedy: { rzut: ["check", "save", "attack", "skill", "tool"], wynik: "dowolny" },
  dzialanie: { typ: "kosc", formula: "@scale.cwaniak.motywacja" },  // przerzut | przerzutGorszy | kosc | stala
  koszt: { uzycia: 1, reakcja: true }, limit: "raz-na-rzut" }
```

Zasady: jedno użycie danego źródła na rzut; modyfikacje się sumują w kolejności klikania; przerzut zastępuje wynik i
kasuje wcześniejsze dodatki (jak Fuks dziś). **Przelicz werdykt:** hak `neuroshima.rollModified` (dzisiejszy
`neuroshima.rerolled` zostaje aliasem); E0 robi inwentarz konsumentów — werdykt trafienia (`trafienie.mjs`, już
słucha), karty RO właściwości broni (`weapon-save-properties.mjs`, `obalajaca.mjs`), zagrożenia
(`actors/zagrozenia.mjs`), rzuty przeciw śmierci (`combat/umieranie.mjs` — Twardość działa też na RPŚ), Robota
(`production/robota.mjs`, już słucha), Regiony `skok`/`trudnePrzejscie` i woda (M6). **Cudza karta:** przycisk
Motywacji klika właściciel Cwaniaka na karcie sojusznika, Spieprzysz to! — na karcie BN; zapis idzie przez przekaźnik
MG (wzorzec z `rerolls.mjs`: znacznik na aktorze, gdy klikający nie jest autorem). Idempotentnie — dwa kliknięcia
nie zużywają dwóch kości.

**3.0.3 Warunkowe Ułatwienia i premie w RO i testach — stock najpierw.** Gdy warunek mieści się w danych rzutu albo
aktora — **reguła Efektu Aktywnego z warunkiem** (§1): np. Ułatwienie w RO na KON = `save` / `dnd5e.advantage` / `+1`,
warunek `roll.ability = con`; Ułatwienie w Medycynie = `check`, warunek `roll.skill = med`; „tylko w Berserku” —
warunek efektu na statusie Berserka (efekt z `actors/class-state.mjs` dostaje status, jeśli go nie ma). Gdy warunek
wymaga kontekstu, którego dnd5e w danych rzutu nie ma — **nasz rejestr**: wiersze `{zdolnosc, rzut: "save:dex" |
"check:int" | "skill:sur" | "save:*", gdy(ctx), rodzaj: "ulatwienie" | "premia", wartosc}` liczone w
`dnd5e.preRollD20Test` (wspólny hak testów i RO — nazwy haków buduje `dice/basic-roll.mjs` z `hookNames`) i wstawiane
do okna rzutu **jako domyślne, nadpisywalne** (wzorzec silnika okoliczności ataku). Kontekst `ctx`: walka trwa,
**źródło RO** (kwas, trucizna, skażenie, maszyna, Przerażenie — karty żądające RO dostają pole `kontekst`, E0 dopisuje
je w istniejących ścieżkach), kategoria celu, biom drużyny. Spike E0: reguły działają w ścieżkach rzutu modułu (okno
ataku z okolicznościami, karty RO, Fuks), a `statuses` i flagi aktora są w danych warunku.

**3.0.4 Bramki raz na turę, rundę, walkę.** Stock najpierw: `uses` z `recovery: [{period: "turnStart"}]` (Bolesny atak,
Mój bóg kule nosi). Gdzie limit nie jest zasobem (Ułatwienie „raz w rundzie” z Mutanta na śniadanie, Słabego punktu,
Zwodu) — wspólny pomocnik z `class-resource-dice.mjs` (`resourceDiceRound` uogólniony do `{zdolnosc, zakres, combatId,
round, turn}`). „Raz na walkę” (Clint) — okres `combat` z `class-state.mjs`.

**3.0.5 Zapamiętane wybory.** Ulubiona broń — konkretny model (przedmiot katalogu albo nazwa) wybierany oknem przy
pierwszym użyciu i zmieniany w oknie Długiego odpoczynku (RAW); Specjalizacja Złodzieja — awans `Trait` w trybie
`expertise` (stock); Mój wróg — przedmioty-opcje (już są).

**3.0.6 Kontrakt plakietek.** Każdy etap aktualizuje `auto`/`manual` (`dev/classes/gen_features.py` `COVERAGE`,
`config/sztuczki-data.mjs`, `config/pochodzenia-data.mjs`), przebudowuje paczki (`fvtt packs`) i dopisuje testy.
Kopie na kartach — E8.

### R1 — Premie stałe i warunkowe: Efekty Aktywne i reguły 6.0 (stock)

Efekt Aktywny `transfer: true` na przedmiocie zdolności w paczce (builder już zapisuje efekty osobnymi kluczami —
`dev/packs/build-packs.mjs` `writePack`), z regułą i warunkiem tam, gdzie zdolność działa tylko w części rzutów.
Zdolności: **Sokole oko** (`attack` / `dnd5e.bonus` / `3`, warunek `roll.attack.type = ranged` — w dnd5e 6 rzut bronią
rzucaną to atak dystansowy), **Ja już swoje odchorowałem** (`save` / `dnd5e.advantage` / `+1`, `roll.ability = con`),
**Telepata** i **Doktor Quinn** (`check` / `dnd5e.advantage`, `roll.skill = ins` / `med`; biegłość — R2), **Głupi** z
Odważny czy głupi (`traits.ci` frightened), **Zew areny — Doping** (to samo z warunkiem efektu „w Berserku”),
**Smakuje jak arszenik** (`traits.dr` kwas, trucizna), **A co mi tam** (odporności: trucizna, radioaktywne; choroba —
przez zdrowie modułu), **Zwinność szczura — Wspinacz** (`movement.climb` = Szybkość). Połowy warunkowe wymagające
źródła RO (Ułatwienie przeciw truciznom, kwasom, skażeniu) — nasz rejestr §3.0.3.

### R2 — Biegłości i Cechy z awansu na featach (stock)

Ten sam tor co biegłości profesji w M6 (§5.1 tamtego planu, reguła D1: biegłość → Specjalizacja → ostrzeżenie):
- **ASI** na Sztuczkach z „+1 do Cechy” (dziś „dopisuje gracz”): Ćwiczenie czyni mistrza (2 punkty, maks. 20 — stockowy
  ASI 2024), Patriota (+1 i `ItemChoice` z puli Pochodzeń — wzorzec `buildPochodzenie`), Samuraj, Pakowanie,
  Przycelowanie, Muzyk… — **jednym przejściem dla wszystkich 53 Sztuczek** (P4);
- **`Trait`** na zdolnościach dających biegłość: Serwisowanie (elektronik), Jeśli ma silnik, to ruszy (mechanik),
  Siódme poty (Pojazdy), Na symulatorach to działało (2 z listy), Doktor Quinn (Medycyna), Telepata (Intuicja), Jeden z
  nich (Zastraszanie — `upgrade`), Specjalizacja Złodzieja (`expertise`, 1 umiejętność + 1 narzędzie).

**Uwaga retro:** postaci, które już mają te zdolności, dopisały sobie Cechy i biegłości ręcznie. Podmiana kopii nie
może uruchomić awansu ponownie — `resync` zmienia dane przedmiotu, nie aktora; braki uzupełnia hand-off biegłości z M6.

### R3 — Modyfikatory po rzucie (§3.0.2)

| Zdolność | Działanie | Kto widzi | Koszt / limit |
|---|---|---|---|
| Motywacja (Cwaniak 1) | + kość Motywacji do testu sojusznika | właściciel Cwaniaka, sojusznik ≤ 18 m | użycie + Reakcja |
| Szczęście (Cwaniak 1) | przerzut własnego testu, nowy wynik obowiązuje | właściciel | użycie (skala /DO), raz na rundę |
| Spieprzysz to! (Cwaniak 2) | udany atak albo RO istoty ≤ 18 m → przerzut, gorszy wynik | właściciel Cwaniaka; P6 | użycie (CHA /KO) + Reakcja |
| Łeb jak sklep (Spec 2) | + kość skali do testu INT albo narzędzi | właściciel | użycie (PB /DO) |
| Amen (Kaznodzieja) | porażka testu, ataku albo RO → +1k6, nowy wynik obowiązuje | właściciel, tylko po porażce (U4) | użycie (CHA /DO) |
| Twardość (Twardziel 3) | nieudany RO albo RPŚ → + kość Twardości | właściciel | pula (KON /DO) |
| Poprawka z Clinta (Kowboj) | przerzut Testu Ataku bronią palną | właściciel | raz na walkę |
| Czas patriotów (Nowy Jork) | +5 do testu cechy albo RO | właściciel | 1 /DO |
| Fart (Vegas) | naturalna 1 na k20 → przerzut; **proponowany**, nie automatyczny jak stockowy `halflingLucky` (limit użyć) | właściciel | 1 /KO |
| Urodzony morderca (Hegemonia) | 1 na kości obrażeń → jednorazowy przerzut tej kości | właściciel, karta obrażeń | — |
| Kocie kości (Złodziej 2) | Ciche łapy: + kości do testu ukrywania; Cztery łapy: − kości z obrażeń od upadku (karta upadku dnd5e 6) | właściciel | pula (ZRC /DO) + Reakcja |

### R4 — Premie sytuacyjne do ataku i obrażeń (silnik okoliczności + `preRollAttack`/`preRollDamage`)

Ułatwienia i Utrudnienia z celu i sceny — źródła `zarejestrujZrodloOkolicznosci` (`combat/okolicznosci.mjs`, z
powodem w dymku); premie liczbowe — reguły 6.0 (`attack`/`damage` z warunkiem), gdy warunek mieści się w danych
rzutu; gdy zależy od celu, lalki albo sceny — części rzutu w `dnd5e.preRollAttack` / `preRollDamage` (wzorzec
Samuraja, już działa). Zdolności:
- **Mój wróg** (+ opcje): premia skali do ataku i obrażeń przeciw kategorii celu (`creature-types.mjs`); Ułatwienie w
  tropieniu i przypominaniu faktów — §3.0.3, kontekst „temat: kategoria” wybierany w oknie testu.
- **Rzeźnik**: +3 do obrażeń, gdy druga ręka nie trzyma broni (lalka; tarcza nie jest bronią; chwyt oburęczny tej samej
  broni — U9).
- **Zawołajcie kolegów**: ≥ 2 wrogów ≤ 1,5 m → Ułatwienie w atakach wręcz.
- **Dwóch na jednego**: cel zaatakowany wręcz przez sojusznika w tej rundzie → +2 do ataków wręcz do końca tury
  (dziennik ataków rundy z kart trafienia).
- **Ja i mój gang**: sojusznik ≤ 3 m od Brutala w Berserku → Ułatwienie przeciw wrogom, których Brutal widzi.
- **Zasadzka** (Wyjadacz Zwiadowcy), **Jeden strzał — Pierwszy atak**: cel zaskoczony (stan `ambush`) albo pierwsza
  runda i działasz przed celem → Ułatwienie.
- **Mutant na śniadanie**: Zabójca mutantów — raz w rundzie Ułatwienie przeciw mutantowi albo potworowi; Refleks łowcy —
  +PB do Inicjatywy, gdy w walce jest wrogi mutant/potwór (domyślnie w oknie Inicjatywy).
- **Słaby punkt**: udany test INT (Technika) ze ST z rozmiaru → flaga na celu → raz w rundzie Ułatwienie przeciw tej
  maszynie; ujawnienie 3 współczynników — karta MG (R9).
- **Maszyna do zabijania — Zwód**: w Berserku raz w rundzie Ułatwienie w ataku wręcz opartym na SIŁ.
- **Trajektoria**: przełącznik w oknie ataku dystansowego „+INT (zużywa 1)”.
- **Clint — Zabójcza spluwa**: rewolwer w ręce właściciela → +1 kość obrażeń (część obrażeń).
- **Strzelec**: status „Stanowisko snajperskie” (HUD, po 5 rundach mierzenia; ruch go zdejmuje) → zasięg ×3, bez
  Utrudnienia za daleki zasięg (wiersz silnika).
- **Mój biom**: Ułatwienie w testach INT/MDR w biomie drużyny (§3.0.3, biom z `party-travel.mjs`).

### R5 — Akcje bonusowe i dodatkowe ataki

- **Ulubiona broń** (Twardziel, Złodziej, Zwiadowca): po akcji Atakowania tą bronią w tej turze karta ataku dostaje
  przycisk „Ulubiona broń [B]”; amunicja sprawdzana z magazynka (`weapons/magazine-model.mjs`) — pusto → sygnał
  naruszenia; raz na turę (§3.0.4). Atak to zwykły atak tą bronią (cały potok).
- **Maszyna do zabijania — Promocja**: w Berserku dodatkowy atak wręcz [B] — ten sam przycisk.
- **Szybkie nogi** (Złodziej 1: Przyspieszenie, Odstąpienie, Ukrywanie w [B]) — **w `HANDOFF_movement_hotbar.md`**
  (paleta Ruch, deklaracje A/B z przydziałem ruchu); M7 dopisuje tylko plakietkę. **Szybka gadka** (Wpływanie),
  **Szybkie badanie** (Badanie): wpisy w warstwie akcji z handoffu (grupa „Czynności”) z rzutem właściwej umiejętności —
  aktywności `utility` [B] jako stockowy nośnik przycisku na karcie.

### R6 — Kości obrażeń raz na turę (`class-resource-dice.mjs`)

Silnik już działa dla Wściekłego ciosu; brakuje **automatycznego wykrycia spustu** — mamy je z werdyktu i okoliczności:
- **Bolesny atak** (Złodziej 1): raz na turę, atak bronią z ZRC i (Ułatwienie **albo** sojusznik nieobezwładniony ≤ 1,5 m
  od celu i brak Utrudnienia) → przycisk „Bolesny atak +Nk6” na karcie trafienia; kości ze skali.
- **Podstępny atak** (Złodziej 3): zamiast kości — Krwawienie (stan modułu), Spowolnienie (Efekt: Szybkość − 1k6 × 1,5 m
  do końca twojej następnej tury), Oślepienie (do końca twojej następnej tury); bez kumulacji.
- **Mój bóg kule nosi** (Kaznodzieja): raz na turę, trafienie bronią palną → +1k10.
- **Skuteczny cios** (Najemnik): kość Wściekłego ciosu zamiast obrażeń → Odepchnięcie / Wytrącenie / dodatkowy atak
  (`combat/melee-maneuvers.mjs`).

### R7 — Wsparcie sojusznika (efekt na innym aktorze)

Stock: aktywność z efektem i taca nakładania efektów; efekt wygasa **na początku następnej tury dającego**
pseudo-wygasaniem dnd5e 6 (`sourceStart`). Nasze dopowiedzenie: gdy gracz nie jest właścicielem celu, efekt nakłada
przekaźnik MG (`postoj/przekaznik.mjs`) zamiast czekać na klik odbiorcy w tacy.
- **Dobra rada** (Spec 1) [B]: wybrany sojusznik — reguła `d20` / `dnd5e.bonus` / mod. INT dającego (zamiana wartości
  „źródło” przy nakładaniu) do jednego testu cechy, ataku albo RO (U12); nasz hak zdejmuje efekt po pierwszym pasującym
  rzucie.
- **Łaska boża** (Kaznodzieja) [B]: do poziom-Cwaniaka sojuszników ≤ 18 m — reguła `d20` / `dnd5e.bonus` / `1d4`,
  warunek `roll.type` ∈ {atak, RO} (jak stockowy Bless).
- **Let's rock** (Gwiazda) [A]: test Występów → premia z tabeli do ataków **albo** RO (wybór grającego) dla sojuszników
  ≤ 27 m; kończy się przy Nieprzytomności, Obezwładnieniu, Ogłuchnięciu wykonawcy.
- **Odważny** (Ganger): aura 9 m, +1k4 do RO przeciw Przerażeniu (§3.0.3, kontekst źródła).
- **Kolejka** (Cwaniak 2): w oknie Krótkiego odpoczynku przełącznik „pije Kolejkę” dla sojuszników; każda wydana Kość
  Wytrzymałości +kość skali (`dnd5e.preRollHitDieV2`). Stockowy odpowiednik (Song of Rest 2014) nie ma automatyki.
- **Kakofonia** (Gwiazda) [A]: RO KON ST 8 + CHA + PB w promieniu 9 m, porażka — Obezwładnienie do początku twojej tury;
  sojusznicy z Ułatwieniem — wzorzec karty RO z `weapon-save-properties.mjs`.
- **Rzuć broń i gleba** (Sędzia) [B]: człowiek ≤ 9 m, RO MDR → upuszcza broń (lalka, jak Wytrącenie), Powalenie,
  Przerażenie do końca twojej następnej tury.

### R8 — Przycelowanie (Twardziel 2, Sztuczka)

Okno ataku dostaje wybór „Celuję w…” (część ciała / element maszyny z tabeli RAW). Silnik TT dodaje premię celu tylko
do tego ataku; werdykt „trafienie” nakłada skutek: upuszczenie (lalka, ścieżka Wytrącenia), Powalenie, Trafienie
Krytyczne (werdykt — także Stopień Zranienia), Spowolnienie opony/gąsienicy (pojazdy M4, do naprawy) itd. Żywa istota
albo maszyna Molocha — filtr z kategorii celu. Koszt [B] — znacznik przy P1.

### R9 — Karty MG i zasoby bez automatyki efektu

Zryw (użycie + ogłoszenie), Kłusownik (karta pułapki: test, ST, skutek wpisuje MG), Wierzę (1 /DO, karta do MG),
Bez tajemnic i Słaby punkt (karta MG „ujawnij”: nazwa, słabe punkty, 3 współczynniki z Bestiariusza — szept do gracza),
Coś mi tu śmierdzi (mutant ≤ 9 m przy ruchu albo początku tury → szept **do MG** z [Powiedz graczowi] (P3); test
Percepcji ST 15 wskazuje istotę), Łapiduch (reanimacja: przycisk na karcie „Śmierć”, ST z czasu od śmierci z zegara
świata; nie po Olbrzymich obrażeniach), Krwawy anioł (kość zestawu małego medyka wg poziomu — `items/toolkit-medyk.mjs`).
Narracyjne (tylko „Nie automatyzujemy: …”): Reputacja, Renoma, Stylowa, Slang, Znajomości, Skrytka, Szary, Jeden z nas,
Kamuflaż, Doktor Brain, Bezlitosny przywódca. Zawsze w siodle — karta „los zsyła wierzchowca” przy Długim odpoczynku
(MG decyduje) razem z wierzchowcami w `PLAN_m4_pojazdy.md` §6.3, W5.

### R10 — Śmierć, krytyki, odporności

- **Nie do zdarcia** (Gladiator): krytyk przeciw właścicielowi → zwykłe trafienie: rozstrzygacz zdejmuje krytyk przed
  kartą obrażeń, więc nie ma podwójnych kości **ani Stopnia Zranienia** — w NOE to duża rzecz.
- **Zawzięty sukinkot** (Hegemonia): 1 /DO, przy 0 PW karta „wstanę” → na początku następnej tury 1 PW, koniec
  Nieprzytomności, tura normalnie (`combat/umieranie.mjs`).
- **Zew areny** (Gladiator): w Berserku niewrażliwość na Przerażenie (reguła z warunkiem efektu, R1); Skok Gladiatora
  (×2 i lądowanie na istocie — RO SIŁ, Powalenie, 1k6 za 3 m) — **w `HANDOFF_movement_hotbar.md`** (Skok jako operacja
  ruchu czyta posiadane zdolności); Praca nóg (ataki okazyjne) — notka (moduł ich nie liczy).
- **Rutyna** (Żołnierz), **Szósty zmysł** (Brutal 3): §3.0.3 (walka; zagrożenie, które postać rejestruje — domyślnie
  włączone w RO ZRC, MG wyłącza).

---

## 4. Zależności od M6, M4 i handoffu ruchu

| M7 | Potrzebuje |
|---|---|
| R2 (biegłości ze zdolności) | tor awansów i reguła D1 (`PLAN_m6_drobne_zasady.md` §5.1, E1) |
| Łyżeczka (Gladiator) | bliźniak improwizacji (M6 §5.2, E3) |
| Jeździec (Wyjadacz Zwiadowcy), Rodeo, Zawsze w siodle | wierzchowce (`PLAN_m4_pojazdy.md` §6.3, W2–W5) — plakietki zamyka W5 |
| Szybkie nogi, Zwinność szczura (Skoczek), Zew areny (Skok Gladiatora), Szarża Berserkera (reszta Berserka) | warstwa akcji i paleta Ruch (`HANDOFF_movement_hotbar.md`, kroki 3 i 5) |
| §3.0.1 znaczniki akcji | warstwa akcji z handoffu ruchu (krok 3) — M7 E0 idzie po nim albo razem z nim |
| Kocie kości (Cztery łapy) | karta upadku dnd5e 6 — już jest; M6 E5 nie zmienia jej kształtu |

Kolejność łączna: M6 E0–E1 → handoff ruchu kroki 1–3 → M7 E0 → M7 E1–E4 równolegle z M6 E2–E6 → M7 E5–E7 → M7 E8
(po M6 E8). Wierzchowce (M4 §6.3) idą własnym torem i nie blokują M7.

---

## 5. Rozstrzygnięcia

### 5.1 Decyzje MG (2026-10-25)

| # | Pytanie | Decyzja |
|---|---|---|
| D1 | Czyja drużyna wyznacza kolejność | **Drużyna kampanii** |
| D2 | Ile M7 przed betą | **Wszystko z poziomów 1–3 wszystkich klas i profesji + Sztuczki i Pochodzenia pregenów** |
| D3 | Do jakiego poziomu dojdą testerzy w styczniu | **3** (każda z 18 profesji może się pojawić) |
| D4 | Motywacja (Reakcja „przed poznaniem efektu”), Amen, Łeb jak sklep | **Po rzucie, przyciskiem na karcie; werdykt przelicza się** (jak przy Fuksie). RAI: „efekt” = rozstrzygnięcie, nie liczba na kości — tak grał stół w sesji 12 |
| D5 | Reakcje | **Znacznik „Reakcja zużyta” + dźwięk negatywny (buzz), gdy coś złego się stało; MG może zignorować** |

### 5.2 Ustalenia projektu — do weta MG

| # | Ustalenie | Warstwa |
|---|---|---|
| U1 | Przycisk po rzucie znika, gdy właściciel źródła nie ma użyć, Reakcji (tylko sygnał, nie znika) ani zasięgu (szary z dymkiem) | — |
| U2 | Modyfikacje jednego rzutu: kolejność klikania; przerzut kasuje dodane kości (jak Fuks) | RAI |
| U3 | Motywacja: zasięg 18 m mierzony jak w silniku okoliczności, „słyszy” — nie sprawdzamy | NOE |
| U4 | Amen: przycisk tylko przy porażce wobec znanego ST/TT; przy rzucie bez ST — zawsze, gracz decyduje | RAI |
| U5 | Szczęście: tylko własne testy (RAW „dowolny test, którego wynik ci nie odpowiada”), także ataki i RO | NOE |
| U6 | Spieprzysz to!: także na rzutach MG za BN, gdy karta jest jawna; przy ukrytej — MG dostaje szept z przyciskiem | RAI (P6) |
| U7 | Twardość działa na RPŚ także przy czystej k20 (wyjątek od D1 z `PLAN_m1_walka.md`, bo RAW wprost wymienia RPŚ) | NOE |
| U8 | Fart proponowany, nie automatyczny (limit 1 /KO) | — |
| U9 | Rzeźnik: chwyt oburęczny tej samej broni nie wyklucza premii; tarcza nie jest bronią | RAI |
| U10 | Dwóch na jednego: „zaatakowana w ten sam sposób” = atak wręcz w tej rundzie, trafiony czy nie | RAI |
| U11 | Ulubiona broń: „ta sama broń” = ten sam model z katalogu (dowolny egzemplarz) | NOE |
| U12 | Dobra rada: jeden rzut — pierwszy pasujący po nadaniu | RAI |
| U13 | Łaska boża: wszystkie ataki i RO do początku tury dającego | NOE |
| U14 | Let's rock: wykonawca wybiera ataki **albo** RO dla wszystkich naraz | RAI |
| U15 | Kolejka: przełącznik w oknie KO, kość ze skali Cwaniaka | NOE |
| U16 | Bolesny atak: „z Ułatwieniem” = tryb rzutu po zniesieniu (5e: Ułatwienie i Utrudnienie się znoszą) | NOE |
| U17 | Podstępny atak: wybór efektu na karcie zamiast przycisku kości | NOE |
| U18 | Słaby punkt: flaga na celu na czas walki; poza walką do Długiego odpoczynku | RAI |
| U19 | Mutant na śniadanie — Refleks łowcy: premia do Inicjatywy domyślnie włączona, gdy w walce jest wrogi mutant/potwór | RAI |
| U20 | Strzelec: 5 rund mierzenia liczy MG (przycisk w HUD), ruch zdejmuje status | RAI |
| U21 | Przycelowanie: tabela RAW jako dane; efekt „jednorazowy” znika po zastosowaniu | NOE |
| U22 | Nie do zdarcia nie zdejmuje automatycznego krytyka z Nieprzytomności — zdejmuje każdy | NOE |
| U23 | Zawzięty sukinkot: rzuty przeciw śmierci zerowane przy wstaniu | RAI |
| U24 | Łapiduch: czas od śmierci z zegara świata (karta „Śmierć” zapisuje chwilę) | RAI |
| U25 | Coś mi tu śmierdzi: szept do MG, nie do gracza (P3) | — |
| U26 | Zew areny — Praca nóg: tylko notka (ataków okazyjnych moduł nie liczy) | — |
| U27 | Rutyna: Ułatwienie w RO ZRC i MDR tylko w trwającej walce | NOE |
| U28 | Szósty zmysł: domyślnie włączone w RO ZRC przeciw efektom obszarowym, pułapkom i upadkom; MG wyłącza | RAI |
| U29 | Sokole oko: każdy atak dystansowy (także rzucana broń biała) | NOE |
| U30 | ASI ze Sztuczek: pola stałe tam, gdzie Sztuczka nie daje wyboru; wybór — tam, gdzie RAW mówi „lub” | NOE |

### 5.3 Otwarte

| # | Pytanie | Propozycja |
|---|---|---|
| P1 | Znacznik „Akcja bonusowa zużyta” obok Reakcji | **Tak** — Ulubiona broń, Dobra rada, Łaska boża, Przycelowanie, Promocja, Szybkie nogi i Berserk konkurują o tę samą akcję co rundę; ten sam mechanizm i dźwięk, a źródłem są deklaracje B z warstwy akcji handoffu ruchu |
| P2 | Licznik Motywacji „na sojuszniku” (kość podarowana zawczasu, jak Bardic Inspiration 2024) zamiast Reakcji przy rzucie | Nie — RAW to Reakcja przy rzucie |
| P3 | Coś mi tu śmierdzi — szept do MG czy wprost do gracza | Do MG z [Powiedz graczowi] (MG kontroluje niespodzianki) |
| P4 | ASI i biegłości dla wszystkich 53 Sztuczek jednym przejściem czy tylko dla drużyny i pregenów | Wszystkie — to ta sama zmiana buildera, koszt w danych |
| P5 | Sztuczki pregenów (dziś brak — wycięte 2026-09-25) | MG wybiera; plan obejmuje je z automatu, bo P4 |
| P6 | Spieprzysz to! na ukrytych rzutach BN | Szept do MG (U6) |
| P7 | Pregeny na poziomach 2–3 (wybory profesji) przed styczniem | Poza M7 — robi MG albo testerzy przy stole |

---

## 6. Etapy

| Etap | Zakres | Rozmiar | Zależy od | Gotowe gdy |
|---|---|---|---|---|
| **E0** | Fundament §3.0: znacznik Reakcji (+ BA przy P1) i `sygnalNaruszenia`; rejestr „po rzucie” z `neuroshima.rollModified` i inwentarzem konsumentów; rejestr §3.0.3 z polem `kontekst` w kartach RO; bramki; zapamiętane wybory. Spiki: (a) awans na Sztuczce wybranej w `ItemChoice` klasy uruchamia własny ASI w tym samym oknie awansu; (b) reguły 6.0 (`dnd5e.advantage`/`bonus` z warunkiem) działają w ścieżkach rzutu modułu, a status Berserka jest widoczny w warunku efektu; (c) pseudo-wygasanie `sourceStart` z efektu nałożonego przez przekaźnik, nie z tacy | M | M6 E0a, handoff ruchu krok 3 (warstwa akcji) | Testy warstwy 1 rejestrów; Fuks i Forsowanie przechodzą przez rejestr bez zmiany zachowania (regresja e2e); notatka tak/nie per spike w §8 |
| **E1** | R3 — 11 zdolności | M | E0 | e2e `zdolnosci-po-rzucie`: Laffitte daje Motywację sojusznikowi (drugi klient), werdykt zmienia się z chybienia na trafienie; Spieprzysz to! na rzucie BN |
| **E2** | R7 — 7 zdolności | M | E0 | e2e `zdolnosci-wsparcie`: Dobra rada na cudzym aktorze, wygasa na początku tury dającego |
| **E3** | R1 + R2 — Efekty i awanse (z P4: wszystkie Sztuczki) | S–M | M6 E1, E0 | `validate-packs`: każdy wpis z „+1 do Cechy” ma ASI; e2e `postac` ze Sztuczką |
| **E4** | R4 + R5 — ~20 zdolności | M–L | E0 | testy wierszy w `okolicznosci.test.mjs`; e2e `zdolnosci-walka` (Ulubiona broń, Mój wróg, Rzeźnik) |
| **E5** | R6 — 4 zdolności na `class-resource-dice.mjs` z wykrywaniem spustu | M | E0, E4 | Bolesny atak sam proponuje kości przy sojuszniku obok celu |
| **E6** | R8 — Przycelowanie | M | E0 | e2e: kończyna dolna → Powalenie; głowa → krytyk i Stopień Zranienia |
| **E7** | R9 + R10 i zdolności zależne od M6 (Łyżeczka) i od handoffu ruchu (Zew areny, Zwinność szczura — plakietki po kroku 3 handoffu); Jeździec, Rodeo, Zawsze w siodle — plakietki w M4 W5 | M | M6 E3, handoff ruchu | wpisy z plakietką „pełne” albo „częściowe” z opisem ręcznej reszty |
| **E8** | Domknięcie: plakietki w paczkach, **`resync` kopii w kampanii za zgodą MG** (Zdolności, Sztuczki, Pochodzenia), `docs/Zdolnosci.md` (dla graczy: co robi automat, gdzie przycisk, co rozstrzyga stół), macierz w `IMPLEMENTATION.md`, tabela RAI w `scripts/wkk/README.md` (D4, U2, U4, U6, U9, U10, U12, U14, U18–U20, U23, U24, U28), persony Poligonu (`dev/poligon/roster.mjs`) z tymi zdolnościami i stanowisko „Sala prób” | S–M | wszystkie | Pokrycie w zakresie: każda zdolność drużyny kampanii ≥ częściowa; w całym zakresie ≥ 75 % pełnych albo częściowych |

### Testy

- **Warstwa 1:** rejestr „po rzucie” (kto widzi, limity, kolejność, przerzut kasuje dodatki); rejestr §3.0.3 (warunki);
  wiersze silnika okoliczności (R4); spust Bolesnego ataku; tabela Przycelowania; wygasanie efektów R7 jako dane.
- **Warstwy 2–5 (Quench):** efekty R1 na aktorze testowym; awanse R2; przekaźnik dla cudzej karty; `rollModified` z
  każdym konsumentem z inwentarza E0.
- **Warstwa 6 (e2e):** `zdolnosci-po-rzucie`, `zdolnosci-wsparcie`, `zdolnosci-walka`, rozszerzone `postac` i `combat`;
  regresja `rekonwalescencja`, `umieranie` (Twardość, Zawzięty sukinkot).
- **Warstwa 7 (Poligon):** persony z drużyny kampanii (kopie testowe, nie aktorzy kampanii) na stanowisku „Sala prób”.

---

## 7. Poza planem

Zdolności poziomów 4–12 (Drugi atak, Trzeci atak, Brutalny cios, Szaleńcza szarża…), zdolności Bestiariusza, ataki
okazyjne jako mechanika, pełna ekonomia akcji (blokowanie), pościg (Drzwi w drzwi, Kaskader — M4 część 2).

## 8. Postęp

*(pusto — wpisy po etapach)*
