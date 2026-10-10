# PLAN — M3: Towarzysze i drony

> Status: **PROJEKT ZAMKNIĘTY** (2026-10-08; rundy trzecia–szósta i przegląd spójności 2026-10-09).
> Decyzje MG D1–D39 (§6.1); otwartych pytań brak (§6.3).
> Następny krok E0. Rozmiar: **L–XL** (`PLAN_beta.md` zakładał M — drony
> urosły do pełnego wsparcia z trybem zdalnego sterowania, D6, a przegląd znalazł lukę M1 w RAW s. 205,
> D3). Wywołanie: `PLAN_beta.md` M3.
>
> **Dlaczego teraz (zmiana kolejności z M5 na M3).** Bramka B2 wymaga modeli danych, które przez dwie
> sesje nie są przepisywane; każdy nowy model zeruje ten zegar. M3 (aktor powiązany z właścicielem,
> dron jako aktor z uchwytem w ekwipunku) i M4 (karta pojazdu) to nowe modele, M5 to głównie tabele,
> okna i akcje karty drużyny — dlatego ciężkie modelowo plastry idą pierwsze. Victor ma dziś pół postaci
> (Partner prowadzony ręcznie), Raynald (Monter, Serwisowanie) jest o krok od Hakerstwa. M3 stoi na
> świeżym kodzie M1 (umieranie, Stopnie, Regeneracja) i jest najbardziej ryzykowny — lepiej teraz.
>
> **Metoda (prośba MG).** Najpierw RAW, potem RAI, a gdy wszystko zawiedzie — WKK. Dla każdej reguły:
> *co robi dnd5e 5.3 i dlaczego* → *czy ten powód dotyczy nas* → *ile automatyki i za jaką cenę*.
> Przykład z poprzedniego planu: auto-rzut obrażeń po ataku był błędem, bo między atakiem a obrażeniami
> są reakcje i modyfikatory. Tu analogicznie: tura towarzysza nie startuje sama, tylko z karty Komendy.
>
> **Przypadek testowy:** Evie (Ludzki partner Victora) — jedyna migracja. Pozostałe rodzaje
> (pies, zwierzęta, Prawa ręka, drony) wchodzą w pełni, ale bez aktorów do przenoszenia.
> **Termin:** brak twardego — najpierw wydanie bety karty, potem test przy stole (D20).
>
> RAW = `Neuro 5e/Podrecznik/NOE/` (październik), `s. N` = strona drukowana. dnd5e = źródła 5.3.0
> (`module/…` względem repozytorium systemu). Warstwy: **NOE** (RAW), **RAI** (drzewo NOE z komentarzem
> o pochodzeniu), **WKK** (`scripts/wkk/`, za przełącznikiem Kobalt) — `scripts/wkk/README.md`.
> Repozytorium jest publiczne: wątki fabularne Evie to sprawa MG, tu tylko mechanika.

---

## 1. Skala automatyki i kryteria

Bez zmian względem `PLAN_m1_walka.md` §1:

| Poziom | Nazwa | Co robi moduł | Kto rozstrzyga |
|---|---|---|---|
| T0 | Odnośnik | tekst RAW w opisie, dymku, plakietce | stół |
| T1 | Przycisk MG | MG wyzwala; moduł rzuca i prowadzi księgowość | MG |
| T2 | Wykrycie + karta | moduł wykrywa, karta czatu z przyciskiem; stosuje człowiek | MG / gracz |
| T3 | Domyślne | wartość domyślna z widocznym powodem, do zmiany | gracz / MG |
| T4 | Automat | bezwarunkowy skutek RAW stosowany od razu, z linią na czacie | RAW |

Doktryna (`PLAN_beta.md` §2, pamięć projektu): oznaczane, nie blokowane; ekonomii akcji nie liczymy i
nie blokujemy — ale **zdarzenie z karty jest sygnałem**, na którym wolno się zatrzasnąć (D2); BN-y
zwolnione z realizmu ekwipunku, towarzysze włączani flagą; T4 tylko tam, gdzie RAW nie zostawia wyboru.

**Korzyść:** częstość · łatwo przeoczyć · koszt pomyłki · różnica względem 5e · księgowość ·
nieoczywisty rachunek (wzory z cudzych statystyk). **Koszt:** kod i testy · przygotowanie MG · UI ·
ryzyko złej automatyki (fałszywe wykrycie uczy stół ignorować karty).

---

## 2. dnd5e 5.3 — co robi, czego nie robi, dlaczego

### 2.1 Inwentarz

| Potrzeba | dnd5e 5.3 | Gdzie |
|---|---|---|
| Trwały towarzysz powiązany z właścicielem | ❌ — brak pojęcia „właściciel”. Jedyne narzędzie to **aktywność Przywołanie** (`SummonActivity`) | `documents/activity/summon.mjs` |
| Statystyki z cudzego aktora | 🟡 **jednorazowo, w chwili przywołania**: `getChanges()` liczy wzory na roll data przywołującego i **stempluje** wynik efektami o stałych id (`dnd5eMatchProficiency`, `dnd5eACBonus`, `dnd5eHPBonus`, `dnd5eHDBonus`, enchant `dnd5eItemChanges` na atakach i ST). Ponowne przywołanie aktora połączonego nadpisuje te same efekty — „odświeżenie przez ponowne przywołanie” | `summon.mjs` `getChanges` |
| Flaga pochodzenia | `flags.dnd5e.summon = { level, mod, origin: <uuid przedmiotu>, activity, profile }`; rejestr `dnd5e.registry.summons` śledzi **tylko aktorów żetonów** (niepołączonych) w pamięci klienta; `actor.summonedCreatures` | `actor.mjs` `prepareDerivedData`, `registry.mjs` `SummonRegistry` |
| `@summoner` w roll data przywołanego | ❌ — wzory liczy przywołujący, przywołany nie zna swojego pana | — |
| Haki | `dnd5e.preSummon`, `preSummonToken`, `summonToken`, `postSummon` | `summon.mjs` |
| Rozmieszczenie żetonu | `TokenPlacement.place()` — interaktywny podgląd po stronie użytkownika | `canvas/token-placement.mjs` |
| „Ważny BN” umierający jak BG | ✅ `traits.important` (albo klasa na BN) → karta BN pokazuje rzuty przeciw śmierci przy 0 PW i lojalność; `rollDeathSave` działa na każdym aktorze z `attributes.death` | `npc-sheet.mjs:140, 294`, `actor.mjs` `rollDeathSave` |
| KW BN | ✅ `attributes.hd`: maks. i kość z `hp.formula` + poziomy klas; `spent`; przyciski odpoczynku na karcie BN (MG albo właściciel przy `allowRests`) | `data/actor/npc.mjs` `prepareBaseData`, `npc-sheet.mjs:298` |
| PB postaci / BN | postać: z sumy poziomów klas; BN: z SP/poziomu. Nadpisanie efektem `OVERRIDE` na `system.attributes.prof` — tak robi Przywołanie | `character.mjs`, `npc.mjs:380` |
| Wspólna inicjatywa | ✅ `CombatantGroup` (v14) — członek dziedziczy inicjatywę grupy (`Combatant#_prepareGroup`); dnd5e rysuje grupę jako zwijany wiersz (`getGroupingKey` → `group.id`), `rollAll` rzuca za `group.activeCombatant` (= **najniższe id**), zmiana inicjatywy członka synchronizuje grupę | `client/documents/combatant.mjs:203`, dnd5e `combatant.mjs`, `combatant-group.mjs`, `combat.mjs:38` |
| Kolejność przy remisie | dnd5e: różni aktorzy bazowi → **alfabetycznie** po nazwie; inaczej po nazwie uczestnika | dnd5e `combat.mjs:72` |
| Tura „zaraz po mnie” | ❌ | — |
| Podążanie żetonu za żetonem | ❌ (ani w rdzeniu v14) | — |
| Tworzenie żetonów przez graczy | ❌ domyślnie — `TOKEN_CREATE`/`TOKEN_DELETE` od roli Asystent | `common/constants.mjs:1381` |
| Kreator postaci | ✅ `AdvancementManager` (Trait, ItemChoice, ASI…) — jedyna droga, przez którą zapisują się awanse | `applications/advancement/` |

### 2.2 Hipotezy — dlaczego

- **R1 Towarzysze 5e to głównie czary.** Przywołane istoty żyją godzinę, skalują się poziomem miejsca
  czaru *w chwili rzucenia* — więc stempel w chwili przywołania to po prostu RAW 5e. SRD 5.2 nie ma
  trwałych towarzyszy klasowych (Pan Zwierząt, Stalowy Obrońca są w treściach płatnych i też jadą na
  Przywołaniu).
- **R2 Wiele kopii.** Pięć wilków z jednego czaru = pięć żetonów niepołączonych, każdy świeży. Nic nie
  trzeba utrwalać.
- **R3 Przygotowanie danych jest per dokument.** Foundry nie ma unieważniania „zmienił się aktor A,
  przelicz aktora B”, a kolejność przygotowania aktorów przy starcie nie jest gwarantowana. Stempel
  omija oba problemy.
- **R4 Uprawnienia.** Przywołanie tworzy żetony i pisze do aktorów — robi to klient przywołującego, więc
  dnd5e trzyma się jednego zdarzenia i jednego zapisu.
- **R5 Ogólność.** Tysiące stołów i reguł domowych — wzory na profilu przywołania, nie w kodzie.
- **R6 Kreator przez awanse.** Wszystko, co zapisuje się „na stałe” w postaci, idzie przez
  `AdvancementManager`, żeby dało się to cofnąć.

### 2.3 Które powody dotyczą nas — i co bierzemy

| Powód | Dotyczy nas? | Dlaczego |
|---|---|---|
| R1 Czary | **nie** dla towarzyszy, **tak** dla twórcy drona | Towarzysze są trwali i mają imię; RAW liczy ich statystyki z **bieżących** wartości właściciela („twój poziom Zwiadowcy”, „twoja Premia Biegłości”) — stempel by się rozjeżdżał przy każdym awansie. Dron powstaje raz, z rąk konkretnego twórcy — tu stempel w chwili budowy jest właściwym modelem (D23) |
| R2 Wiele kopii | **nie** | Jeden towarzysz = jeden aktor połączony (dron też) |
| R3 Przygotowanie per dokument | **tak** | To koszt, który płacimy: przeliczenie towarzyszy po zmianie właściciela (bez zapisu) i przegląd przy `ready` (§7.3) |
| R4 Uprawnienia | **tak** | Żetony i uczestnicy walki — przekaźnik MG (wzorzec `flara.mjs` / prośba `umieranie.mjs`) |
| R5 Ogólność | **nie** | Jeden system; wzory RAW w danych generowanych z NOE |
| R6 Kreator przez awanse | **tak** | Ludzki towarzysz powstaje przez `AdvancementManager` (D17) |

**Bierzemy z dnd5e:** stały efekt `OVERRIDE` na PB (wzorzec `dnd5eMatchProficiency`) dla „+2 nie rośnie”;
`traits.important` dla natywnego toru rzutów przeciw śmierci na karcie BN; `CombatantGroup` dla wspólnej
inicjatywy; ocenę wzorów na roll data (rozszerzonej o `@wlasciciel`, `@tworca`, `@operator`);
`TokenPlacement` do podglądu rozłożenia drona; `AdvancementManager` do tworzenia; **stempel** — ale
tylko dla twórcy drona (D23).
**Nie bierzemy:** stempla dla towarzyszy (R1, R2) i rejestru przywołań (śledzi tylko żetony niepołączone).

**Wniosek.** Jak przy lalce: dnd5e nie ma trwałych towarzyszy nie dlatego, że byłyby zbędne, tylko
dlatego, że jego towarzysze to czary. Nas to nie wiąże. Granicę wyznaczają R3 i R4.

---

## 3. RAW — inwentarz M3

### 3.1 Kto ma towarzysza

| Zdolność | Klasa / profesja | Poziom | s. | Rodzaj |
|---|---|---|---|---|
| Oswajanie zwierząt | Zwiadowca / Łowca Mutantów | 3, 6 lub 10 | 99–100 | zmutowany owad / ssak / gad (k6) |
| Partner | Zwiadowca / Sędzia | 3, 6 lub 10 | 100–101 | Psi partner albo Ludzki partner |
| Moja prawa ręka | Cwaniak / Mafiozo | 3, 6 lub 10 | 75–76 | człowiek (zasady jak Ludzki partner) |
| Hakerstwo → Drony | Spec / Monter | 3, 6 lub 10 | 83–84 | dron kroczący (średni), latający (mały) |
| Emiter EMP | Zwiadowca / Zabójca Maszyn | 3, 6 lub 10 | 101 | broń przeciw maszynom |

Przyległe, poza M3: Dżokej, Rodeo, Kawalerzysta, walka na wierzchowcu (s. 107, 257 — M6); Szef każe
(Mafiozo, Bezlitosny przywódca — M7).

### 3.2 Statblocki i wzory

| Rodzaj | TT | PW | KW | Atak | Inne |
|---|---|---|---|---|---|
| Zmutowany owad (mały) | 14 + PB wł. | 3 + 10 × mod. MDR wł. | k6 × ½ poz. Zwiadowcy | +4 + PB wł., 1k4+4 kłute | Skradanie +6; niewrażliwy: radioakt., trucizna; Ślepowidzenie 9 m; Kopacz, Pajęcza wspinaczka; udźwig 16/32 kg |
| Zmutowany ssak (duży) | 11 + PB wł. | 9 + 10 × mod. MDR wł. | k10 × ½ poz. | +4 + PB wł., 2k6+4 obuch. + Powalenie (≤ średni) | Atletyka +6; Noktowizja 18 m; Doskonałe zmysły, **Współpraca**; 180/360 kg |
| Zmutowany gad (średni) | 12 + PB wł. | 6 + 10 × mod. MDR wł. | k8 × ½ poz. | +2 + PB wł., 1k6+2 kłute + RO KON ST 10 / Zatrucie 1 min | Percepcja +3; Termowizja 18 m; Ziemnowodny; 70/140 kg |
| Psi partner (mały) | 12 + PB wł. | 10 + 10 × mod. MDR wł. | k6 × poz. Zwiadowcy | +2 + PB wł., 1k6+2 kłute + Pochwycenie (≤ średni) | RO ZRC +4, MDR +4; Percepcja +4, Skradanie +4; Noktowizja 18 m; Doskonałe zmysły, **Współpraca**, Psi bohater; 28/48 kg |
| Ludzki partner / Prawa ręka | z pancerza | **5 × poz. klasy wł.** | **k6 × poz. klasy wł.** | broń, w której **właściciel** ma biegłość; obrażenia z własnych cech | cechy 14,14,12,12,10,8 albo 24 pkt; Pochodzenie z miejsca werbunku; **PB +2 (nie rośnie)**; 2 RO; 2 umiejętności lub zestawy narzędzi; 1 Sztuczka (spełnia wymagania); pancerze jak właściciel |
| Dron kroczący (średnia maszyna) | 10 + mod. INT tw. + PB tw. | 10 × mod. INT tw. | — | 2 + PB tw. + mod. ZRC **operatora**; kość broni + mod. INT tw.; ST obszarowe 8 + PB tw. + mod. ZRC op. | **Próg obrażeń 5, Próg awarii 15**; SIŁ 14 ZRC 14 KON 10; 9 m; niewrażliwy: psych., trucizna; Przerażenie, Zatrucie, Zauroczenie; Noktowizja 18 m; Modyfikacje (MG); 70/140 kg |
| Dron latający (mała maszyna) | jw. | **5** × mod. INT tw. | — | **3** + PB tw. + mod. ZRC op.; jw. | **Próg awarii 10** (bez Progu obrażeń); ZRC 16; lot 18 m; reszta jw.; 15/30 kg |

wł. = właściciel, tw. = twórca, op. = operator. Statblocki zwierząt drukują umiejętności i RO jako liczby
policzone przy PB +2 (pies: Percepcja +4 = MDR +2 + 2) — tylko TT i atak piszą „plus twoja PB” (D4).

### 3.3 Tura i komendy

| Rodzaj | RAW | s. |
|---|---|---|
| Partner (pies, człowiek) | „Partner ma swoją turę zawsze po twojej turze. Nie może działać samodzielnie, więc w swojej Akcji Bonusowej wydajesz mu komendę. Jeśli nie wydasz mu żadnego polecenia, unika walki, broni się akcją Unikanie i szuka osłony.” | 100 |
| Oswojone zwierzę | „działa natychmiast po twojej turze, jeśli przeznaczysz swoją Akcję Bonusową na wydanie mu polecenia […] wykonuje pełny zakres swoich akcji i walczy do utraty przytomności. Jeśli nie otrzyma żadnego polecenia, nie przemieszcza się i używa akcji Unikanie.” | 99 |
| Prawa ręka | „działa natychmiast po twojej turze, ale masz **pełną kontrolę** nad akcjami tej postaci” — **bez** Akcji Bonusowej i bez reguły „bez polecenia” | 75 |
| Dron | „W Akcji Bonusowej możesz wydawać proste polecenia, tj. *broń się, idź tam, podążaj za mną, podnieś to, upuść to, zostań*. **Dron nie atakuje samodzielnie.** W Akcji możesz przejąć pełne sterowanie i używając zamontowanych kamer, wykorzystać wszystkie jego zdolności.” Potrzebny kontroler. **Brak** reguły „bez polecenia → Unikanie” — „broń się” to polecenie | 83 |

Dron jest więc nadzbiorem towarzysza (Komenda **i** sterowanie), ale bez domyślnego unikania — przez to
bardziej kruchy (potwierdzone z RAW na prośbę MG). Dron ma własną akcję („może wykonać w swojej akcji
jeden atak”), ale RAW nie daje mu tury ani inicjatywy — inaczej niż Partnerowi, a pojazdy mają
„INICJATYWA: kierowcy” (s. 262). Dron działa więc w turze operatora, za jego Akcję albo Akcję
Bonusową (D35).

### 3.4 Śmierć, Stopnie, zdrowie

| Reguła | s. |
|---|---|
| Psi partner, Ludzki partner, Prawa ręka: „umiera na takich samych zasadach jak BG” (Stopnie + rzuty przeciw śmierci) | 75, 100, 101 |
| **„Istota, która posiada Stopień Zranienia, jest traktowana jak BG, czyli otrzymuje kary za otrzymanie Trafienia Krytycznego oraz wykonuje Rzuty Przeciw Śmierci.”** Statblocki zwierząt mają STOPIEŃ ZRANIENIA O O O O — więc oswojone zwierzęta też umierają jak BG, **z RAW**, nie RAI (D3) | 205 |
| Przeciwnicy domyślnie giną przy 0 PW; MG może traktować ważnych BN jak BG | 34 |
| Olbrzymie obrażenia: jedno zdarzenie ≥ 2× maks. PW → śmierć na miejscu (dotyczy każdego, także maszyn) | 34 |
| Maszyny nie otrzymują Stopni Zranienia; przekroczenie Progu awarii albo krytyk → k20 na Tabeli awarii maszyn; pozycja niepasująca → kolejna | 205, 214 |
| Próg obrażeń: obrażenia poniżej progu nic nie robią | 205 |
| Dron — naprawa: „Poświęcając godzinę pracy, możesz przy pomocy odpowiednich narzędzi przywrócić swojej maszynie PW, w ilości 2k6 + twój modyfikator Inteligencji.” | 83 |
| Zwierzęta (pies): „Pojenie skażoną wodą i nieodpowiednie karmienie może pogorszyć jego zdrowie.” | 100 |

### 3.5 Utrzymanie, utrata, nowy towarzysz

| Reguła | s. |
|---|---|
| Partner: 24 h szukania, „zarówno w mieście, jak i w dowolnej, zabitej dechami dziurze”; nie można odstąpić ani sprzedać; woda i pożywienie | 101 |
| Oswajanie: 24 h szukania, k6 (1–2 owad, 3–4 ssak, 5–6 gad), 3 dni leczenia i oswajania; imię; nie sprzedasz | 99 |
| Prawa ręka: 24 h „w miejscowości, w której przebywasz”; wikt i 1/10 doli | 75 |
| Długi postój: zwierzęcy podwładni — woda i jedzenie wg Niedożywienia i Odwodnienia (s. 258), **mogą pić brudną wodę**, jedzenie normalnej jakości; ludzcy — można im znaleźć robotę | 47 |
| Zapotrzebowanie wg rozmiaru (mały 0,25 kg / 1 l, średni 0,5 / 2, duży 2 / 30 …) | 258 |
| Cechy PC: jeden z trzech gotowych zestawów albo 27 pkt z tabeli Kupowania cech (8–15, koszt jak w 5e). Towarzysz: 14,14,12,12,10,8 albo „24 punkty do dowolnego rozdzielenia” — czytamy jako tę samą tabelę kupowania z budżetem 24 (Evie przed +1 INT / +1 CHA Nowego Jorku: 8/15/12/8/15/10 = dokładnie 24 pkt) | 48, 76, 101 |

### 3.6 Drony

| Reguła | s. |
|---|---|
| Produkcja: Haker z narzędziami małego hakera **i** małego elektronika; kroczący ST 20 / 70 h / 15 CE, 1 CH, 10 CZ, 9 MK; latający ST 25 / 90 h / 10 CE, 1 CH, 29 CZ, 5 MK | 83 |
| Kontroler zdalnego sterowania: rozdział Sprzęt — 300 m na otwartej przestrzeni, 50 m pod ziemią albo przez ściany, 40 gb, 2 kg, dost. 30% (s. 130–131); schemat Hakera — „zasięg 100 m”, 40 h, czyli też 40 gb (s. 83). Czytane dosłownie jako **dwa przedmioty**: fabryczny 300 / 50 m i domowej roboty 100 / 20 m (D32); WKK — dost. fabrycznego 10% (D33) | 83, 130–131 |
| Zasilanie: akumulator 24 V — 1 h średniego, 4 h małego; agregat — dodatkowo spalinowo, 0,5 l/h | 83 |
| Modyfikacje: broń, kamery, oświetlenie, elektronika — „Dokładne modyfikacje oraz ich koszt, należy ustalić z MG.” | 83–84 |
| Waga i cena złożonego drona — **brak** (cena wynika z czasu produkcji: 70 / 90 gb, s. 145) | — |

### 3.7 Emiter EMP (s. 101)

100 gb surowców (20 MK, 40 CE, 40 CZ) i 100 h; pojedynczy; magazynek 6; 8k6 od elektryczności; 9/15 m;
Ładowanie; Porażenie: RO KON ST 15 albo Obezwładnienie do końca twojej następnej tury; ładowany 230 V;
nie działa na istoty żywe ani urządzenia bez mikroprocesorów; **ignoruje TT z opancerzenia maszyny**;
biegły tylko Zabójca Maszyn.

### 3.8 Niejasności RAW → gdzie rozstrzygnięte

| Niejasność | Rozstrzygnięcie |
|---|---|
| Śmierć oswojonego zwierzęcia | RAW s. 205 (D3) |
| Co skaluje się z PB właściciela u zwierząt | D4 |
| Dron bez polecenia | RAW: nic — bez aktywacji w tej turze dron stoi (D35) |
| Co dron robi za Akcję Bonusową, a co za Akcję | [B]: ruch, unik, odwrót, przedmiot; [A]: wszystko (D36) |
| Dron na 0 PW | D7 |
| Naprawa awarii „do czasu naprawy” | D9 (NOE: MG; WKK: tabela §7.11) |
| „½ poziomu Zwiadowcy” przy KW | w dół, min. 1 (U6, RAI) |
| „24 punkty” cech | tabela kupowania, budżet 24 (U5, RAI) |
| Twórca drona: statystyki na żywo czy z chwili budowy | z chwili budowy (D23) |
| Waga/cena drona, kontroler w ręce, utrata sygnału | D21, D22, D24 |
| „TT z opancerzenia maszyny” (EMP) | nota pancerza w statblocku (D27) |
| Zasięg kontrolera: 300 m czy 100 m | dwa przedmioty — 300 / 50 m i 100 / 20 m (D32) |
| Dron latający, który stanął w powietrzu | RAW s. 253 (D29) |
| Towarzysz zmarłego właściciela | postać zapasowa (D31) |

---

## 4. Stan kodu — znaleziska

- **F1 — RAW s. 205 nieczytany.** Ekstraktor Bestiariusza zapisuje `usesZranienie` (20 istot ma
  `true`), builder kładzie go do flag — **żaden skrypt go nie czyta**. `wMaszynie()`
  (`combat/umieranie.mjs:129`) wpuszcza tylko `character` i BN z flagą `bn` (D2 M1), więc istota ze
  Stopniem Zranienia w statblocku ginie przy 0 PW zamiast rzucać przeciw śmierci.
- **F2 — krytyk rani każdego.** `combat/zranienie.mjs` `onApplyDamage` nakłada Stopień przy krytyku
  na **dowolnym** aktorze — także na maszynach (s. 214: „nie otrzymują Stopni”) i istotach bez tej
  statystyki (s. 205: kary za krytyk tylko dla mających Stopień).
- **F3 — Evie jest zbudowana ręcznie.** Typ `character`; własna klasa „Partner” (`partner-evie`,
  poziom 3, k6, bez awansów) — PB urośnie do +3 przy 5. poziomie (RAW: +2 na stałe); `hp.max` wpisane
  ręcznie (15); **Percepcja i Śledztwo liczone z ZRC** (`ability: "dex"` w źródle — błąd danych);
  nie jest członkiem drużyny → nie je, nie pije i nie wchodzi do okna rekonwalescencji; rzuca własną
  inicjatywę (+5 z Pierwotnego instynktu); ma Fuksy i panel PD jak BG.
- **F4 — Victor.** Biegłości w broni = tylko bazowe Zwiadowcy (biała, miotana, palna krótka, palna długa);
  kategoria z „Biegłości Sędziego” nie została wybrana → AR Evie (`palnaPosr`) jest dziś bez biegłości.
  Kopia zdolności Partner na jego karcie ma sklejony tekst sprzed poprawki ekstraktora (statblock Gada i
  ramka Ludzkiego partnera w środku zdania) — `zdolnosci.resync`.
- **F5 — bramki „BG” po typie aktora.** Ludzki towarzysz to `character`, więc dostaje wszystko, co
  bramkuje `type === "character"`: `rerolls.mjs` (Fuksy), `fuks-pips.mjs`, `pd-panel.mjs`,
  `ability-hotbar.mjs`, `class-rules.mjs`, `disease-effects.mjs`, `bleeding.mjs`, `magazine-model.mjs`,
  `doll.mjs`, `tt.mjs`, `pw.mjs`, `rest-activities.mjs`, `health-panel.mjs`, `rekonwalescencja.mjs`,
  `production/*`, `character-defaults.mjs`, `party-loot-lock.mjs`. Pies jako `npc` — odwrotnie. Każda
  bramka dostaje decyzję (D5, U10).
- **F6 — pule „drużyny” po typie i członkostwie.** `rekonwalescencja.mjs:96` i `health-panel.mjs:507`
  biorą członków drużyny typu `character`; `party-supplies.mjs` `creatures()` — wszystkich członków poza
  pojazdami. Pies-BN wypada z Regeneracji, Evie (nie-członek) — ze wszystkiego.
- **F7 — Tabela awarii to sam tekst.** `combat/bestiary-thresholds.mjs`: wykrycie (krytyk albo ≥ próg)
  → szept do MG → k20 → opis. Bez skutków, bez pomijania niepasujących pozycji, bez naprawy. Progi
  czytane tylko z `flags.<mod>.bestiary`.
- **F8 — dron z produkcji to karta.** `recipes-data.mjs:452` `wynik: "aktor"` → `production/wynik.mjs`
  zwraca `null` → karta MG; plakietka Hakerstwa mówi to samo. Kontroler i akumulator istnieją jako
  przedmioty (`items/production-gear.mjs`).
- **F9 — grupa dnd5e postawi Evie przed Victorem.** Remis inicjatywy różnych aktorów → alfabetycznie
  („Evie” < „Victor…”); `activeCombatant` = najniższe id → rzut może pójść z premią Evie.
- **F10 — potok danych.** Parser Bestiariusza jest ścisły i nie zna wzorów („14 plus twoja Premia
  Biegłości”); `extract_professions.py` już rozpoznaje statblocki towarzyszy jako nie-zdolności.
- **F11 — gracze nie tworzą żetonów** (`TOKEN_CREATE` = Asystent) — rozłożenie drona przez przekaźnik.
- **F12 — Współpraca działa z deskryptora** `packTactics` (`combat/pack-tactics.mjs`) — szablony
  zbudowane builderem Bestiariusza dostaną ją za darmo (pies i ssak ją mają).
- **F13 — jeden kontroler na trzy drogi.** `raw:kontroler` (`config/recipes-data.mjs`) to jednocześnie
  pozycja cennika (40 gb, 2 kg), cel przepisu standardowego ze wzoru i wynik wiersza Hakerstwa
  „(zasięg 100 m)”; opis w `items/production-gear.mjs` mówi 100 m. Wzorzec standardowy przy 40 gb daje
  te same ST 15 / 40 h co wiersz Hakerstwa — po rozdzieleniu na dwa przedmioty (D32) domowy byłby
  zdominowany, jeśli fabryczny da się zbudować ze wzoru (rozstrzygnięte: D37).
- **F14 — PD i nagrody.** `pd-panel.mjs` przyznaje PD za każdy Stopień aktorom `character` — Evie
  dostawałaby PD; członkostwo w drużynie (D19) włącza towarzyszy także do podziałów nagród (U22).
- **F15 — klon uchwytu.** Przeciągnięcie przedmiotu między aktorami to w dnd5e kopia; dwa uchwyty
  jednego drona = dwa drony do rozłożenia. Ten sam problem rozwiązały Roboty (lejek przenoszenia,
  D21 produkcji) — U11.
- **F16 — opancerzenie maszyn jest w danych.** Statblocki podają je w nawiasie przy TT, a
  `dev/bestiary/bestiary.json` trzyma to jako `ac.note` (Juggernaut, Obrońca, Pająk) — podstawa D27.
- **F17 — tiki tury nie znają kierunku.** Rdzeń v14 i dnd5e odpalają zdarzenia tury tylko naprzód
  (`Combat#_manageTurnEvents` → `#triggerTurnEvents`), ale haki `combatTurnChange` i `updateCombat`
  idą przy każdej zmianie, także wstecz. Nasze tiki używają ich bez sprawdzenia kierunku: krwawienie
  (`combat/bleeding.mjs`), podpalenie (`combat/podpalenie.mjs`), regeneracja i szał (`items/chemia.mjs`),
  duszenie (`actors/zagrozenia.mjs`). MG cofający turę — dziś zwykłym przyciskiem, w M3 także [Cofnij]
  z U8 — zadaje 1k4 od ognia, RO krwawienia albo regenerację drugi raz, a ponowne „naprzód” trzeci.
  Naprawa: pamięć ostatniego tiku per aktor (walka, runda, uczestnik, krawędź) — każdy tik najwyżej
  raz na turę.

---

## 5. Ocena per reguła

| Reguła | dnd5e | Powód | Częstość | Koszt błędu | Poziom | Koszt |
|---|---|---|---|---|---|---|
| Statystyki pochodne od właściciela (PW, KW, TT, atak, PB, biegłości) | 🟡 stempel | R1, R3 | stale | średni — cicho złe liczby po awansie | **T4** liczone, bez zapisu | M |
| Tura zaraz po właścicielu, wspólna inicjatywa | 🟡 grupa | — | każda walka | średni | **T4** | S–M |
| Komenda → tura; bez komendy → Unikanie i pominięcie | ❌ | — | każda tura towarzysza | niski, ale żmudny | **T2→T4** z karty Komendy, [Cofnij] | S–M |
| Śmierć jak BG (towarzysze; Bestiariusz ze Stopniem) | 🟡 `important` | R1 | każda ciężka walka | wysoki — nieodwracalne | **T4** wejście w maszynę M1 | S |
| Krytyk → Stopień tylko dla mających Stopnie; maszyny → Próg awarii | ❌ | — | każdy krytyk | średni | **T4** | S |
| Tabela awarii: skutki | ❌ | R1 | rzadko, ale wtedy decyduje | średni | **T2** [Zastosuj], auto-pominięcie | M |
| Dron 0 PW → Wyłączony; Olbrzymie → zniszczony | ❌ | — | rzadko | wysoki (70–90 h pracy) | **T4** Wyłączony, **T2** zniszczenie (karta D1 M1) | S |
| Naprawa PW drona (1 h → 2k6 + INT) | ❌ | — | po każdej walce z dronem | niski | **T1** z przedmiotu | S |
| Naprawa awarii | ❌ | — | rzadko | niski | NOE **T1** (MG), WKK **T2** z tabeli | S–M |
| Rozłożenie/złożenie drona | ❌ | R4 | często | niski | **T1** akcja z ekwipunku | M |
| Tryb zdalnego sterowania (wizja kamery, sygnał, OSD) | ❌ | — | każda tura sterowania | niski — ale to „sedno” profesji | **T1** wejście; obraz **T4** | L |
| Zasilanie drona | ❌ | R4 | każda sesja z dronem | niski, ale nikt nie pamięta | **T4** na zegarze | S |
| Formuły ataku drona (twórca + operator) | ❌ | — | każdy atak | średni | **T4** w roll data | S |
| Utrzymanie (jedzenie/woda) | — | — | codziennie | średni | **T4** przez członkostwo | S |
| Szukanie nowego towarzysza | ❌ | — | rzadko | niski | **T0** w M3 (podpowiedź); zajęcie Postoju — M5 (D30) | S |
| Tworzenie towarzysza | 🟡 awanse | R6 | rzadko | średni — złe liczby na lata | **T1** narzędzie MG + kreator gracza | M |
| Emiter EMP | — | — | rzadko | niski | broń + przepis + filtr celu **T3** | S–M |

---

## 6. Rozstrzygnięcia

### 6.1 Decyzje MG (2026-10-08)

**D1 — Tura: własny uczestnik walki w grupie z właścicielem.** Wspólna inicjatywa, rzuca właściciel,
towarzysz zawsze tuż po nim. Dotyczy wszystkich rodzajów, łącznie z dronami („dron to nadzbiór
towarzysza”). *Dla dronów zastąpione przez D35 — dron działa w turze operatora.*

**D2 — Komenda jako zatrzask, nie licznik.** Ekonomii akcji nie liczymy (zero czy dwadzieścia AB —
nie nasza sprawa), ale gracz ma użyć zdolności i zostawić kartę — i na tej karcie się zatrzaskujemy.
Komenda wydana → tura towarzysza się odbywa; brak → tura pominięta z Unikaniem. Rozróżnienie z RAW (§3.3):
- **Partner (pies, człowiek), oswojone zwierzę:** jak wyżej.
- **Prawa ręka:** pełna kontrola bez AB — tura zawsze się odbywa, bez zatrzasku.
- **Dron:** bez zatrzasku tury i bez własnej tury — Komenda [B] albo Steruj [A] w turze operatora
  (D35, D36); bez aktywacji stoi i **nie** unika; atak poza [A] — plakietka na karcie ataku, bez blokady.

**D3 — Śmierć: Stopień Zranienia = BG (RAW s. 205).** Towarzysze-istoty (pies, zwierzęta, ludzie)
wchodzą w maszynę umierania M1. Naprawiamy przy tym lukę M1 (F1): istoty Bestiariusza ze Stopniem
Zranienia wchodzą w maszynę automatycznie; karta „BN pada” (D2 M1) zostaje dla istot bez tej
statystyki. Maszyny Stopni nie mają (F2). Uwaga MG: zwierzę na zasadach „zarezerwowanych dla BG” to
przypadek brzegowy, ale nie problem — gracze nie muszą widzieć uproszczenia; psu nie robimy lalki.

**D4 — Zwierzęta: z PB właściciela tylko to, co RAW pisze wprost** (TT, atak). Umiejętności i RO jak
w druku.

**D5 — Ludzcy towarzysze a mechaniki BG.** Tak: lalka, magazynki, udźwig; choroby; Forsowanie;
zakładka Produkcja (pomocnik / wykonawca). Nie: Fuksy (RAW: Fant daje Fuksa bohaterowi); panel PD i
własny awans (poziom idzie za właścicielem).

**D6 — Drony: pełne wsparcie.** Raynald (Spec, Monter) ma Serwisowanie; Hakerstwo jest następne —
zakładamy, że tuż-tuż. Operator i jego zmiana, tryb zdalnego sterowania z obrazem kamery (wersja
efektów z noktowizji/termowizji), rozważnie — sterowanie z klawiatury. „Ma być dobre, grywalne i
wyglądać świetnie.”

**D7 — Dron na 0 PW (odczyt MG, przyjęty).** Olbrzymie obrażenia (s. 34) → zniszczony na miejscu.
Awarie (s. 214) z Progu awarii i krytyków. Jeśli żadne z nich — na 0 PW dron **przestaje działać** i
wymaga naprawy (stan Wyłączony — ten sam co awaria 19). Wpis RAI.

**D8 — Model drona (delegowane: „co technicznie lepsze i bliższe Foundry; remis → przedmiot jako
uchwyt”).** Rozstrzygnięcie badaniem — **trwały aktor jest magazynem stanu, przedmiot w ekwipunku jest
jego uchwytem** (§7.9). Powody: żeton musi mieć aktora (nawet niepołączony ma bazowego); wszystkie
systemy modułu (umieranie, awarie, statusy, magazynki, światło, wizja, TT, ataki) działają na aktorze
bez zmian; model „przedmiot jako magazyn” wymagałby serializacji efektów i osadzonych przedmiotów
(broń z magazynkami) przy każdym rozłożeniu — kopie, nowe id i zerwane odwołania magazynków. Zgadza
się z intuicją MG na remis.

**D9 — Naprawa drona.** PW — RAW (1 h, narzędzia, 2k6 + mod. INT naprawiającego). Awarie: **NOE** —
pyta MG (karta T1); **WKK** — tabela napraw awarii „ma mieć sens”: uwzględnia rozmiar szkody i to, że
niektórych szkód nie opłaca się naprawiać (§7.11; D25, D28).

**D10 — Tabela awarii: moduł stosuje, co umie,** przyciskiem MG [Zastosuj] (statusy, ½ Szybkości,
−2/−4 do ataku, TT −2, ogień, wyłączenie); pozycje niepasujące pomijane automatycznie (RAW „wybierz
kolejną pozycję”). Dotyczy też maszyn Bestiariusza.

**D11 — Tryb zdalnego sterowania na rdzeniu Foundry.** Kontrola tylko drona, kamera podąża, obraz z
kamery. **Wizja drona jest gorsza** niż oka — nie dramatycznie, ale wyraźnie niższa rozdzielczość, także
w noktowizji; **degraduje się z odległością**, jak analogowy obraz FPV. (Pytanie MG „mamy termowizję?” —
tak: moduł ma Gogle noktowizyjne i Termowizor z trybem wykrywania; dron z RAW ma Noktowizję 18 m,
termowizja tylko jako modyfikacja.)

**D12 — Operator: każdy z Kontrolerem w zasięgu** (w ręce — D22; „Przejmij sterowanie”); na czas sterowania OWNER
przez przekaźnik MG; twórca zachowuje swoje.

**D13 — Żetony.** Jednorazowe fabularne wejście Evie to sprawa MG. Poza tym żeton towarzysza stawia MG
razem z żetonem właściciela. Drony: złożone w ekwipunku, rozkładane i składane — **akcja** (RAI);
uchwyt w ekwipunku upraszcza naprawy.

**D14 — AR Evie:** Victor wybiera broń palną pośrednią jako kategorię Sędziego (naprawa danych, F4) —
Evie biegła przez regułę „broń, w której masz biegłość”.

**D15 — Sztuczka Evie:** gracz wybiera z krótkiej listy po polsku przy migracji (§7.14).

**D16 — Karta właściciela:** zwarty pasek towarzysza w sidebarze pod panelem Stan.

**D17 — Tworzenie: narzędzie MG + kreator gracza.** MG tworzy czystą kartę, wiąże ją jako towarzysza
(drużyna, własność, folder), gracz przeklikuje rozwój: klasa „Towarzysz” w `AdvancementManager`
(2 RO, 2 umiejętności lub zestawy narzędzi, Sztuczka), upuszczenie Pochodzenia, nasz krok cech.

**D18 — Utrata i nowy towarzysz: zajęcie Postoju (Długi), przyrostowe,** z podpowiedzią „Zapytaj MG,
czy w tym miejscu da się szukać”. Po ukończeniu udział MG jest w porządku — karta MG uruchamia
narzędzie z D17. Bez pełnej automatyki. Realizacja w następnym plastrze Postoju (D30).

**D19 — Wyżywienie przez członkostwo.** Evie nie jest członkiem drużyny z niedopatrzenia. Narzędzie z
D17 dopisuje towarzysza do drużyny — od tej chwili jedzenie i woda działają wg rozmiaru.

**D20 — Termin.** Najpierw wydanie bety karty, potem test przy stole — sesja przestaje być testem
podręcznika, a staje się testem karty. Evie pierwszym przypadkiem.

**Trzecia runda (2026-10-09)**

**D21 — Dron złożony: waga i cena (RAI).** Kroczący 25 kg / 70 gb, latający 4 kg / 90 gb (cena z czasu
produkcji, s. 145).

**D22 — Kontroler w ręce** do Komendy [B] i Steruj [A]. Logiczne, a przegląd nie znalazł powodu
przeciw. Wynika z tego:
- ręce liczy lalka: Komenda/Steruj z kontrolerem w plecaku daje **[Weź do ręki]** — przeniesienie
  lalki z wypieraniem (doktryna: nie odmawiamy; Darmowej Interakcji nie liczymy);
- dron bez aktywacji nie wymaga rąk — stoi bez trzymania pada (D35);
- BN-operatorzy zwolnieni (doktryna ekwipunku BN);
- kontroler wypada z ręki (0 PW → `ground-items.mjs`, Wytrącenie) = utrata sterowania jak przy utracie
  sygnału (D24);
- koszt przy stole: operator z bronią dwuręczną musi wybrać — zamierzone, to decyzja taktyczna.

**D23 — Twórca zamrożony w chwili budowy.** Realistyczniej, a dla nas bez kosztu — wręcz prościej, bo
bez żywej zależności od twórcy. Stempel na dronie: PB i mod. INT twórcy, jego imię, data uruchomienia;
na karcie drona i przy wejściu w tryb zdalny linia w rodzaju „System ruszył 4 sierpnia 2051 roku.”
(data z kalendarza świata). Tu dnd5e ma rację (R1, §2.3): dron powstaje raz. Operator zostaje na żywo.

**D24 — Utrata sygnału.** Obraz wraca do operatora, sterowanie przepada (wyjście z trybu zdalnego,
kontrola wraca na jego żeton). Dron staje. Ponowna próba: podejść bliżej i znowu Komenda [B] albo
Steruj [A] — jeśli zostały akcje (nie liczymy, gracz wie).

**D25 — Naprawy awarii WKK rozpisane na konkretne surowce** (np. wyciek płynów → Chemia). Tabela
§7.11 przerobiona.

**Czwarta runda (2026-10-09)**

**D26 — Kontroler: 100 m, przez ściany i pod ziemią 50 m** — *zastąpione przez D32 (dwa kontrolery).*
Zasięg, którego nigdy się nie przekracza, to tylko ozdobnik dla „nieskończoności” — mapa, na której
liczy się 300 m, jest wyjątkowo ogromna i rzadka. Jeden przedmiot (ten z produkcji, w sklepie ten sam).
Odczyt MG przy sprzecznym RAW; pytanie do autora zostaje (§10).

**D27 — EMP a opancerzenie: przyjęta propozycja.** RAW sam oznacza opancerzenie — statblocki maszyn
podają je w nawiasie przy TT (F16). Cel z notą → EMP atakuje przeciw **10 + mod. ZRC**; cel bez noty
→ pełna TT; nigdy więcej niż pełna TT. Dron: pełna TT, chyba że MG zamontował pancerz jako
modyfikację — wtedy odpada jego premia. Juggernaut 22 → 10, Obrońca 20 → 10, Pająk 15 → 13.
Odrzucone „zawsze 10 + ZRC” — karałoby maszyny, których TT nie jest pancerzem (Gladiator 18 → 12). RAI.

**D28 — Naprawy WKK: chodzi o różnorodność części, nie o kwotę.** Ilości mogą być małe — ważne jest
poczucie, że trzeba zdobyć konkretne części, i odgrywanie tego. Ilości obniżone mniej więcej o połowę
względem naprawy M2, różnorodność surowców zostaje (§7.11).

**D29 — Dron latający, który staje w powietrzu, spada — RAW** (s. 253): Nieprzytomność albo Szybkość 0
→ natychmiast spada i otrzymuje obrażenia od upadku (Spadanie, s. 259); Powalenie → opada pionowo bez
obrażeń. Dla drona: Wyłączony, Sparaliżowanie (awaria 5), utrata zasilania → upadek z obrażeniami;
awaria 12 (Powalenie) → bez obrażeń. Karta T2 z wysokością żetonu.

**D30 — Szukanie nowego towarzysza należy do następnego plastra Postoju i odpoczynku** (M5). Gracz sam
dzieli 24 h — przy stole to ogłoszenia, wypytywanie ludzi, cokolwiek; podobne do produkcji, ale nie to
samo. W M3 tylko podpowiedź na pasku (T0) i narzędzie MG z D17, które kończy szukanie.

**D31 — Towarzysz zmarłego właściciela zostaje postacią zapasową gracza (RAI — autor systemu,
Nicram, 2026-10-09).** Bez automatyki: nowa karta od zera, ekwipunek, żeton i portret przenoszone
ręcznie. Narzędzie z D17 ma [Odłącz] (zdejmuje flagę U1) — to samo, którego MG użyje, gdy towarzysz
odchodzi z fabuły. Kodu nie dokłada: zapis tylko w dokumentacji gracza (§10) — tabela RAI w
`scripts/wkk/README.md` mapuje kod, a tu kodu nie ma.

**Piąta runda (2026-10-09)**

**D32 — Dwa kontrolery (zastępuje D26, zamyka P11).** Autor nie rozstrzygnął, więc wracamy do
odczytu dosłownego: RAW opisuje dwa przedmioty, a nawias w nazwie schematu je odróżnia.
- **Fabryczny** (Sprzęt, s. 130–131): 300 m na otwartej przestrzeni, 50 m przez ściany i pod ziemią;
  40 gb, 2 kg, dost. 30%.
- **Domowej roboty** (schemat Hakera, s. 83): 100 m, **20 m** przez ściany i pod ziemią (odczyt MG —
  RAW podaje tylko 100 m); 40 gb (40 h, s. 145), 2 kg.

Na lochach to różnica między salą obok a większością poziomu: UPPER ma 109,5 × 51 m, LOWER
136,5 × 76,5 m, typowa sala 13,5 m (9 × 9 pól). 50 m ze środkowego korytarza obejmuje prawie cały
UPPER i główny blok LOWER (poza zachodnim skrzydłem ze schodami i salą 13); 20 m — sąsiednią salę.
W pościgu: fabryczny = 8 znaczników, cały pościg aż do ucieczki (7); domowy = 2.

**D33 — WKK: dostępność fabrycznego kontrolera 10%** (NOE 30%). Przez to domowy staje się zwykłą
drogą, a fabryczny — znaleziskiem. Moduł nie ma jeszcze handlarza (M5, Gambling): dostępność to dana
na przedmiocie, więc nadpisanie WKK to mała tabela w `wkk/config/` czytana przez jednego pomocnika
(pole Dostępność na karcie przedmiotu teraz, okno handlarza w M5).

**D34 — Obraz jak analogowe FPV, OSD wyłącznie funkcjonalne.** Wymagania MG:
- obraz analogowego kanału FPV;
- tryb lotu: stałe ACRO dla latającego, WALK dla kroczącego (D38);
- licznik amunicji z migającym ARMED;
- czcionka kontrolerów lotu;
- licznik PW;
- RSSI „nieuczciwe” — wartość i kreski pływają w marginesie, gracz zgaduje prawdziwą;
- **bez** sztucznego horyzontu i środkowych szewronów: element, który jest *tylko* ozdobą, zabiera
  cenne miejsce.

Rozpisane w §7.10. Wynika z tego zmiana D11/U16: „gorsze oko” to w analogu ograniczone pasmo i
szum, nie piksele — pikselizacja jest cechą cyfrowego obrazu.

**Szósta runda (2026-10-09)**

**D35 — Dron działa w turze operatora (zamyka P12; dla dronów zastępuje D1).** RAW nie daje dronowi
tury ani inicjatywy (§3.3), więc dron nie jest uczestnikiem walki.
- **Jedna aktywacja na rundę:** Komenda [B] albo Steruj [A], w turze operatora, jako **jeden ciągły
  kawałek** — wejście w tryb zdalny, ruch drona i jedna jego akcja, wyjście. Wolno: ruch → Akcja
  operatora → [B] → ruch. Nie wolno dzielić drona na raty: [B] → Akcja operatora → [B]. Intuicja MG:
  jedna akcja oddana dronowi zużywa jego użyteczność w tej turze.
- **Reakcja:** Reakcja operatora może być reakcją drona — Atak okazyjny (RAW: tylko wręcz) albo
  wyczekana akcja przygotowana w [A] (Wyczekanie). Dla bilansu to suma zerowa: operator wydaje Reakcję,
  której nie użyje sam. Zysk jest wyłącznie pozycyjny — dron z bronią pilnuje drzwi, których operator
  nie widzi. To sedno drona, nie dziura.
- **Bez aktywacji dron stoi:** nie unika, nie strzela; poleceń stałych w walce nie ma.
- Drugi operator w tej samej rundzie (przekazany kontroler) to druga aktywacja — plakietka; dron ma
  jedną akcję na rundę.

**D36 — Jedno zdanie: [B] — ruch, unik, odwrót, przedmiot; [A] — wszystko.** Każda aktywacja daje
dronowi jego ruch i jedną akcję. Lista RAW z Akcji Bonusowej (s. 83) przekłada się na akcje NOE bez
rzutu i niewymierzone w nikogo:
- *broń się* → Unikanie albo Odstąpienie (wybiera gracz; „szukaj osłony” to sam ruch);
- *idź tam*, *podążaj za mną* → ruch, także Przyspieszenie, a kroczący — Bieganie;
- *podnieś to*, *upuść to* → Interakcja z przedmiotem;
- *zostań* → nic.

[A] dokłada wszystko, co ma rzut albo jest wymierzone w kogoś: Atakowanie, Pochwycenie, Odepchnięcie,
Wytrącenie, Pomaganie, Wyczekanie, Ukrywanie się, Szukanie, Używanie (zamontowane urządzenia).
**[A] i [B] wchodzą w ten sam tryb zdalny** z obrazem z kamery: kontroler ma ekran (s. 131), więc
Akcja kupuje precyzję sterowania, nie obraz. Egzekwuje MG (miękko); moduł pokazuje tryb i dozwolone
akcje na OSD (§7.10) i dokłada plakietki: atak drona w [B] albo bez aktywacji, druga aktywacja w
rundzie. Odczyt MG listy RAW (RAI).

**D37 — WKK: fabrycznego kontrolera nie da się zbudować (zamyka P13).** W NOE się da: tabele
profesji stoją obok przepisu standardowego ze wzoru, nie zamiast niego (`PLAN_produkcja.md` D22,
potwierdzone przez autora), a fabryczny jest w cenniku. Pod Kobaltem przepis standardowy fabrycznego
znika (`wkk/config/production-kobalt.mjs`, bliźniak `_RAW`); jedyną drogą zostaje schemat Hakera.

**D38 — OSD (zamyka P14).** Tryby WALK (kroczący) i ACRO (latający). Język mieszany, angielski i
polski, bez polskich liter. RSSI po angielsku, z ikoną anteny jak w Betaflight. Biały tekst z czarną
obwódką jak w Betaflight — czytelność na każdym tle to problem rozwiązany. Kolor obrazu wg
rekomendacji z P14 (kolor w świetle; czerń i biel w ciemności i przy słabym sygnale) — przyjęty
domyślnie, do weta MG.

**D39 — Czcionka OSD: oryginał Betaflight jako wydzielony zasób GPL-3; moduł zostaje na MIT.**
Czcionka pochodzi z konfiguratora Betaflight (GPL-3) i leży w osobnym folderze `fonts/osd/`, który
zawiera:
- pełny tekst GPL-3 we własnym `LICENSE`;
- notę pochodzenia: repozytorium, ścieżka, tag;
- oryginalny `.mcm` — formę źródłową;
- atlas WEBP z generatora w `dev/` (skrypt w repozytorium to „skrypty kompilacji” z §1 GPL-3).

Kod czyta atlas jak dane — jak dźwięk albo obraz, **nie jak bibliotekę**. Analogia z DLL byłaby
myląca: konsolidacja z biblioteką GPL (nie LGPL) to dokładnie przypadek, który GPL obejmuje. Granica
trzyma, dopóki czcionka jest osobnym plikiem — glifów nigdy nie wklejamy do `.mjs` (base64, tablice
bitów). Zasada ogólna dla repozytorium: zasób na innej licencji to osobny folder z własną licencją,
wpis w `CREDITS.md` i ścieżka w liście wydania.

### 6.2 Ustalone w projekcie (jedno sensowne wyjście)

- **U1 Jeden magazyn powiązania** — flaga na towarzyszu: `flags.<mod>.towarzysz = { wlasciciel:
  <uuid aktora>, rodzaj, klasa }` (`klasa` — identyfikator klasy właściciela, od której liczy się
  poziom: `zwiadowca`, `cwaniak`, `spec`). Dla drona dodatkowo `tworca`, `operator`. Odwrotny indeks
  (towarzysze właściciela) liczony w pamięci, nigdy nie zapisywany.
- **U2 Wartości pochodne liczone, nie zapisywane** (§7.3). Rozszerzenie roll data o `@wlasciciel` i
  `@operator` (zwarta migawka: PB, cechy, poziomy klas, poziom postaci — na żywo) oraz `@tworca` (ze
  stempla na dronie, D23) + owinięcie danych
  pochodnych dla PW i KW (wzorzec `actors/pw.mjs`). Po każdej zmianie właściciela albo operatora każdy
  klient przelicza jego towarzyszy (`reset()`), bez zapisu; przegląd przy `ready` naprawia kolejność startu.
  Brak właściciela → wartości z szablonu + plakietka „brak właściciela”.
- **U3 „PB +2 (nie rośnie)”** — efekt o stałym id `OVERRIDE system.attributes.prof = 2` (wzorzec
  `dnd5eMatchProficiency`), widoczny na karcie, a nie ukryty w kodzie.
- **U4 Biegłości ludzkiego towarzysza w broni i pancerzu = właściciela, na żywo** — suma z własnymi
  (np. ze Sztuczki Szkolenie w broni), dokładana w danych bazowych, zanim przedmioty policzą biegłość.
- **U5 Ludzki towarzysz:** PW = 5 × poziom klasy właściciela, bez KON (gałąź w `pw.mjs`); KW k6 —
  klasa „Towarzysz”, poziomy = poziom klasy właściciela, zapisywane przy awansie właściciela (jedyny
  zapis — KW postaci dnd5e liczy z przedmiotów klas); bieżące PW rosną o deltę maks. (wzorzec
  `pwGainOnAdvancement`). Cechy: zestaw albo 24 pkt z tabeli Kupowania cech (s. 48) — RAI.
- **U6 Zwierzęta = BN** (karta BN, bez lalki), `traits.important = true` (natywny tor rzutów przeciw
  śmierci), KW: `hd.max`/`hd.denomination` nadpisane pochodnie; „½ poziomu” w dół, min. 1 — RAI.
  TT: `ac.calc = "custom"`, wzór z `@wlasciciel.prof`. Atak: `flat` + wzór z `@wlasciciel.prof`.
- **U7 Kolejność w grupie.** Owinięcie `Combat#_sortCombatants`: towarzysz porównywany jak właściciel
  (kotwica), w parze właściciel pierwszy; `CombatantGroup#activeCombatant` = właściciel; grupa
  rozwinięta domyślnie; przy dodaniu właściciela do walki towarzysz z żetonem na tej scenie dołącza do
  grupy (u aktywnego MG). Do weta MG.
- **U8 Zatrzask Komendy.** Karta Komendy wydana od początku tury właściciela ustawia zatrzask na
  towarzyszu (`komenda: { combatId, runda }`). Początek tury towarzysza (`combatTurnChange`, aktywny MG):
  zatrzask → zwykła tura; brak → Unikanie do początku następnej tury towarzysza, linia na czacie
  „bez komendy: Unikanie, nie rusza się, szuka osłony”, `nextTurn()`; karta ma **[Cofnij — była
  komenda]** (zdejmuje Unikanie, cofa turę). Poza walką karta Komendy to tylko karta. Do weta MG.
- **U9 Bez aktywacji dron stoi** (D35) — w walce nie ma poleceń stałych. Unikanie z *broń się* trwa jak
  w RAW, do początku następnej tury operatora (U20). Poza walką tur nie ma: gracz prowadzi drona sam.
- **U10 Jeden predykat `maStopnieZranienia(actor)`**: BG; towarzysz nie-maszyna; Bestiariusz z
  `usesZranienie`; BN wprowadzony kartą D2 M1. Czytają go maszyna umierania (`wMaszynie`) i krytyk →
  Stopień. Maszyny: krytyk → Próg awarii (już jest), nie Stopień. Bramki BG z F5: Fuksy, PD, panel
  PD — `!jestTowarzyszem(actor)`; reszta zostaje (D5).
- **U11 Dron = aktor BN** (typ istoty „maszyna”, żeton połączony, folder „Drony”), uchwyt = przedmiot z
  flagą `dron: { aktor: <uuid> }` — wskaźnik tylko w tę stronę (id przedmiotu zmienia się przy każdym
  przeniesieniu między aktorami). Trzy role: **posiadacz** (czyj ekwipunek trzyma uchwyt — liczone),
  **operator** (kto steruje — flaga, na żywo), **twórca** (stempel, D23). Złożony: waży 25 / 4 kg (D21),
  żetonu nie ma. Rozłożony: `rozlozony: true`, poza udźwigiem. Uchwyt nie do sklonowania — lejek
  przenoszenia Robot (D21 produkcji; F15). Zniszczony: aktor `zniszczony`, uchwyt staje się „Wrak drona”
  (złom/surowce — M5).
- **U12 Rozłożenie/złożenie przez przekaźnik MG** (wzorzec `wkk/items/flara.mjs`): gracz wskazuje
  miejsce podglądem `TokenPlacement`, kładzie prośbę na własnym aktorze, aktywny MG tworzy/usuwa żeton
  (bez uczestnika walki — D35). Rozłożył z kontrolerem w ręce → zostaje operatorem; bez
  kontrolera dron stoi bez operatora. Złożenie: ≤ 1,5 m (ostrzeżenie, bez blokady).
- **U13 Formuły drona przez roll data** (`@tworca` ze stempla, `@operator` na żywo): TT
  `10 + @tworca.abilities.int.mod + @tworca.prof`; atak
  `flat` `2|3 + @tworca.prof + @operator.abilities.dex.mod`; obrażenia — kość broni +
  `@tworca.abilities.int.mod` (zamiast modyfikatora cechy drona); ST obszarowe
  `8 + @tworca.prof + @operator.abilities.dex.mod`. PW: `10|5 × @tworca.abilities.int.mod`, min. 1.
- **U14 Broń drona z amunicją:** biała lista magazynków (`magazine-model.mjs`) rozszerzona o drony;
  lalka nie. Przeładowanie robi ktoś obok (przeciągnięcie magazynka) — RAW milczy.
- **U15 Zasilanie** przez `items/power-source.mjs`: akumulator 1 h / 4 h, agregat 0,5 l/h z paliwa;
  zużycie na zegarze świata tylko rozłożony i nie Wyłączony; wyczerpanie → Wyłączony (brak zasilania).
- **U16 Obraz kamery.** Żeton drona ma na stałe jeden tryb wizji „Kamera drona” — każdy, kto patrzy
  przez drona, widzi obraz kamery (analogowe FPV, D34, D38); Noktowizja 18 m z RAW
  jako `sight.range` (mechanika), ten sam obraz w ciemności („w czerni i bieli”, s. 205). Termowizja
  tylko modyfikacją (provider `vision-sources.mjs`). Shader w `vision.background.shader` (wzorzec
  Noktowizji z ziarnem), uniform sygnału per źródło wizji.
- **U17 Sygnał.** Zasięg z kontrolera w ręce operatora (D32): fabryczny 300 m, domowy 100 m, mierzony
  od żetonu operatora; ściana między żetonami (test kolizji wzroku) albo scena oznaczona „pod ziemią”
  (pole sceny, ustawia MG) → 50 m / 20 m. Jakość
  obrazu = funkcja odległości/zasięgu. Poza zasięgiem — D24. Na scenie pościgu odległość z torów:
  `|tor operatora − tor drona| × 36 m` (`PLAN_poscigi.md` §2.4), nie linijką.
- **U18 Dane i paczki.** Statblocki towarzyszy z NOE: `extract_professions.py` → `dev/classes/companions.json`
  → generator ze ścisłą gramatyką wzorów (nieznana fraza = błąd budowy) → `config/towarzysze-data.mjs`.
  Nowa paczka aktorów `towarzysze` (szablony zwierząt i dronów, builder Bestiariusza); klasy „Towarzysz”
  w paczce `klasy`, w folderze „Towarzysze”, pomijane przez wybór klasy BG.
- **U19 Migracja** — skrypt z próbą na sucho domyślnie, manifest kopii w `dev/backup/`, przebieg w
  piaskownicy przed kampanią; kampania przy MG.
- **U20 Tura drona = tura operatora** (D35). Jeden rozwiązywacz `turaDrona(dron)` → uczestnik walki
  operatora; bez operatora — posiadacza uchwytu; bez obu — brak (czasy liczone w rundach). Czytają go
  miejsca, które kotwiczą skutki do tury: `tt.mjs` (Unikanie, Bieganie), `fire-modes.mjs` (źródło ognia
  zaporowego i serii), tik `podpalenie.mjs`, czasy awarii z [Zastosuj]; na początku tury operatora
  czyści się też historia ruchu żetonu drona. Aktywacja to zatrzask `{ combatId, runda, tryb }` na
  dronie — z niego OSD bierze tryb, a plakietki — „druga aktywacja w rundzie”.
- **U21 Komenda [B], Steruj [A] i Reaguj [R] drona to aktywności Kontrolera**, nie Hakerstwa —
  operatorem bywa każdy z kontrolerem w ręce (D12, D22). Kilka dronów w zasięgu → wybór, domyślnie
  ostatnio sterowany. [R] to karta i rzut drona bez wchodzenia w tryb zdalny — dzieje się w cudzej turze.
  Komenda towarzyszy-istot zostaje na zdolności źródłowej.
- **U22 PD tylko dla BG:** automatyczne PD za Stopień (`pd-panel.mjs`) i podziały nagród drużyny
  pomijają towarzyszy — członkostwo z D19 nie zabiera graczom udziału (F14).
- **U23 Klasa „Towarzysz” tylko na towarzyszu:** upuszczona na BG — ostrzeżenie z potwierdzeniem
  (sam folder w paczce `klasy` nie chroni przed przeciągnięciem).

### 6.3 Otwarte

P1–P14 zamknięte jako D21–D38 (2026-10-09). Nowe pytania z wdrożenia trafiają do §11.

---

## 7. Projekt

### 7.1 Czyste zasady — `config/towarzysze-rules.mjs` (bez Foundry, warstwa 1)

- `wartosciPochodne(rodzaj, { wlasciciel, tworca, operator })` → `{ tt, pwMaks, kw: {kosc, ile}, pb,
  atak, obrazeniaPremia, stObszarowe }` — z danych `towarzysze-data.mjs`; `½` w dół, min. 1.
- `kupowanieCech(rozklad, budzet = 24)` → poprawność + wydane punkty; `zestawCech` = 14,14,12,12,10,8.
- `porownajUczestnikow(a, b, kotwica)` — kolejność w walce (U7) na czystych danych.
- `decyzjaTury(rodzaj, { zatrzask })` → `"tura" | "unikanie"` — istoty (D2, U8); drony tury nie mają
  (D35).
- `zakresAktywacji(tryb, dron)` → akcje dozwolone dla `"A" | "B" | "R"` (D36), przycięte do drona
  (latający bez Biegania, bez manipulatora bez Interakcji, bez broni bez Ataku) — źródło listy na OSD
  i plakietek.
- `stopnieZranienia(aktorOpis)` → bool (U10) — tablica przypadków z s. 205 i 214.
- `awaria(k20, maszyna)` → pozycja po pominięciu niepasujących + skutki do zastosowania (D10).
- `naprawaPW(k2k6, modInt)`; `naprawaAwarii(pozycja, rodzajDrona, warstwa)` → stopień + surowce (D9, D28, §7.11).
- `sygnal({ odleglosc, sciana, podZiemia, kontroler })` → `{ jakosc: 0..1, utracony }` (U17, D32).
- `rssiOsd(jakosc, stan)` → `{ wartosc: 0..99, kreski: 0..4, stan }` — szum wokół prawdziwej
  jakości (D34); stan jawny, żeby test był deterministyczny.
- `upadekDrona({ stan, wysokosc })` → `{ spada, obrazenia: bool }` (D29).
- `zuzycieZasilania({ rozmiar, minuty, agregat })` (U15).

### 7.2 Dane — `config/towarzysze-data.mjs` (generowany)

Wpis na rodzaj: `typAktora` (`character` / `npc`), statblock (cechy, umiejętności, zmysły, odporności,
zdolności z deskryptorami automatyki jak w Bestiariuszu — `packTactics` dla Współpracy), **wzory** w
składni roll data (`12 + @wlasciciel.prof`, `10 + 10 * @wlasciciel.abilities.wis.mod`), KW
(`{ kosc: 6, poziom: "zwiadowca", mnoznik: 0.5 }`), reguła tury (§3.3), zdolność źródłowa (`partner`,
`oswajanie-zwierzat`, `moja-prawa-reka`, `hakerstwo`), zasady szukania (§3.5). Ludzcy: tylko reguły
(cechy, PB, PW, KW, biegłości), bez statblocku.

### 7.3 Wartości pochodne — `actors/towarzysze.mjs`

- **Roll data:** owinięcie `Actor5e#getRollData` — tylko dla aktorów z flagą `towarzysz` dokłada
  `wlasciciel` / `tworca` / `operator` jako zwartą migawkę (nie całe roll data — bez cykli, tanio).
  Natywne pola dnd5e liczą resztę: TT `custom`, bonus ataku `flat`, premia obrażeń, ST.
- **PW i KW:** owinięcie danych pochodnych po `pw.mjs` (kolejność rejestracji ma znaczenie): ludzki —
  5 × poziom; zwierzę — wzór; dron — wzór; KW zwierząt nadpisane w `attributes.hd`.
- **PB:** efekt U3 (ludzki). Zwierzęta: PB z SP +2 bez zmian (D4).
- **Biegłości:** U4 w danych bazowych.
- **Przeliczanie:** `updateActor`/`updateItem`/`*ActiveEffect` na właścicielu albo operatorze →
  `towarzysz.reset()` + odświeżenie karty i pasków żetonu (twórca nie — stempel, D23). `ready` →
  przegląd wszystkich towarzyszy.
- **Spike w E0:** `reset()` na aktorze dnd5e 5.3 bez pułapki „Cannot redefine property: darkvision”
  (pamięć projektu); kolejność owinięć z `pw.mjs`.

### 7.4 Śmierć i Stopnie

- `maStopnieZranienia` (U10) w jednym miejscu; `wMaszynie` = `maStopnieZranienia(actor) || flaga bn`.
- `zranienie.mjs` `onApplyDamage`: krytyk → Stopień tylko dla `maStopnieZranienia`.
- Bestiariusz ze Stopniem: przy 0 PW — Stopień + umieranie, bez karty „BN pada” (D3).
- Towarzysz-BN: `traits.important`, karta „Umiera” jak u BG; Regeneracja i Pomoc medyczna przez
  `rekonwalescencja.mjs` (pula = członkowie drużyny **i** ich towarzysze, bez filtra typu — F6).
- Maszyny (drony): 0 PW → status **Wyłączony** (nowy, z ikoną: brak akcji i ruchu; ten sam co awaria
  19); Olbrzymie obrażenia → karta „Śmierć” M1 z przyczyną „zniszczony” (potwierdza MG). Bez rzutów
  przeciw śmierci. Naprawa ponad 0 PW zdejmuje Wyłączony (chyba że zostaje awaria 19).
- Dron latający (D29): Wyłączony, Sparaliżowanie albo Szybkość 0 na wysokości > 0 → karta T2 „Spada”
  z obrażeniami od upadku z wysokości żetonu (Spadanie, s. 259 — `combat/falling.mjs`) i
  wysokość → 0; Powalenie → wysokość → 0 bez obrażeń. Upadek może być Olbrzymimi obrażeniami.

### 7.5 Walka — grupa, kolejność, Komenda

- **Grupa (D1, U7):** `CombatantGroup` właściciel + towarzysze-istoty (drony nie — D35), nazwa grupy =
  właściciel; inicjatywa grupy z rzutu właściciela; sortowanie i `activeCombatant` owinięte.
- **Komenda (D2):** zdolność źródłowa istoty dostaje aktywność „Komenda [B]” (Partner, Oswajanie);
  karta z opcjonalnym poleceniem. Drony — aktywności **Kontrolera** (U21): „Komenda [B]” i „Steruj [A]”
  wchodzą w ten sam tryb zdalny (§7.10) i różnią się zakresem (D36); „Reaguj [R]” — reakcja drona za
  Reakcję operatora (D35); wszystkie z kontrolerem w ręce (D22). Prawa ręka — bez aktywności (pełna kontrola). Przycisk Komendy jest też w
  pasku towarzysza (§7.6) i na pasku skrótów zdolności.
- **Początek tury towarzysza:** wg `decyzjaTury` — istoty U8; drony tury nie mają (D35). Plakietki na
  karcie ataku drona: „atak wymaga Steruj [A] (s. 83)” — w aktywacji [B] albo bez aktywacji; „druga
  aktywacja drona w tej rundzie” — przy ponownym wejściu w tryb zdalny albo drugim operatorze.
- **Akcja czy Akcja Bonusowa (pytanie MG, 2026-10-09).** Kosztu nie liczymy (doktryna) — [A] i [B] to
  etykiety typu aktywacji dnd5e na karcie. Oba wchodzą w ten sam tryb zdalny; różni je zakres (D36),
  który widać na OSD i który egzekwuje MG — moduł tylko oznacza. W trybie zdalnym operator nie
  kontroluje własnego żetonu, więc aktywacja jest naturalnie jednym kawałkiem (D35). Czy gracz miał
  jeszcze Akcję, widzi stół: karty są na czacie.
- **Kto działa kiedy.** Towarzysze-istoty (zwierzę, Partner, Prawa ręka) to osobne pionki z własną
  turą tuż po właścicielu (D1): właściciel wydaje Komendę w swojej turze, towarzysz działa w swojej.
  Dron tury nie ma — działa w turze operatora, w jednej aktywacji (D35). Operatorem jest ten, kto
  trzyma kontroler — niekoniecznie Spec, który drona zbudował (D12). Wyjątki: poza walką tur nie ma;
  wierzchowiec działa w turze jeźdźca (§9, M6); w pościgu pasażer może przesunąć turę za kierowcę
  (s. 266) i jego grupa idzie z nim.

### 7.6 Karty

- **Pasek towarzysza na karcie właściciela (D16):** pod panelem Stan; portret, PW (pasek), Stopień
  (pipki), statusy; przyciski: [Karta], [Komenda], [Pokaż żeton], dla dronów
  [Steruj], [Rozłóż/Złóż], zasilanie. Dron pokazuje się na karcie posiadacza i operatora (U11). Gdy
  właściciel ma zdolność, a nie ma towarzysza: dla MG [Nowy towarzysz], dla gracza podpowiedź
  „Szukanie: 24 h (s. 75 / 99 / 101) — zapytaj MG, czy w tym miejscu da się szukać” (D30).
- **Karta towarzysza:** plakietka „Towarzysz: Victor” w nagłówku; dymki z rozkładem („TT 14 = 12 + PB
  Victora 2”). Ludzki: karta BG bez Fuksów i PD (D5). Zwierzę: karta BN bez lalki. Dron: karta BN z
  sekcją Modyfikacje (zamontowane przedmioty), zasilaniem i stemplem twórcy
  („System ruszył …”, D23).
- **Karta drużyny:** towarzysze w liście członków pod właścicielem, z dopiskiem rodzaju.

### 7.7 Drużyna

Członkostwo przez narzędzie D17 (D19). Jedzenie i woda wg rozmiaru — `party-supplies.mjs` bez zmian
modelu; zwierzęta mogą pić brudną wodę (T0 w podsumowaniu dnia; jakości wody moduł nie modeluje).
Drony nie są członkami (zasilanie zamiast jedzenia). Koszt utrzymania na Długim postoju, 1/10 doli
Prawej ręki — M5 (T0 w opisie).

### 7.8 Tworzenie i odtwarzanie

- **Narzędzie MG „Nowy towarzysz”** (pasek właściciela, panel MG): rodzaj z jego zdolności (Partner:
  pies / człowiek; Oswajanie: k6 albo wybór MG; Prawa ręka: człowiek), tworzy czystego aktora (zwierzę —
  z szablonu paczki `towarzysze`; człowiek — pusta postać), flaga U1, własność graczy właściciela,
  drużyna, folder „Towarzysze”, otwiera kartę graczowi. [Odłącz] zdejmuje flagę U1 (D31).
- **Kreator ludzki (D17):** klasa „Towarzysz (Ludzki partner / Prawa ręka)” z awansami poziomu 1:
  `Trait` 2 RO; `Trait` 2 z puli umiejętności + narzędzi (wzorzec atutu Skilled z dnd5e); `ItemChoice`
  1 Sztuczka (z plakietką wymagań). Pochodzenie — upuszczenie tła z paczki `pochodzenia` (+1/+1 i
  zdolność regionu działają jak u BG). Krok cech: zestaw albo 24 pkt (`kupowanieCech`), okienko modułu
  przed kreatorem. Brak `HitPoints` — PW liczy moduł (U5).
- **Zwierzę:** imię, portret, żeton; reszta z szablonu.
- **Szukanie (D18, D30):** w M3 tylko podpowiedź na pasku; zajęcie Postoju — następny plaster (M5).
- **Śmierć właściciela (D31):** bez automatyki — towarzysz może zostać postacią zapasową gracza.

### 7.9 Drony — model, produkcja, rozłożenie, zasilanie, broń

- **Model (D8, U11):** aktor BN „maszyna” + uchwyt w ekwipunku.
- **Produkcja:** wynik `aktor` → nowy wynik `dron`: aktor z szablonu ze stemplem twórcy (D23: kierownik
  Roboty — imię, PB, mod. INT; `zbudowano` = czas świata), uchwyt złożony (25 / 4 kg, 70 / 90 gb — D21)
  w ekwipunku wykonawcy. Plakietka Hakerstwa przestaje mówić „karta dla MG”.
- **Rozkłóż [A] / Złóż [A]** — aktywności uchwytu (U12).
- **Kontrolery (D32, D33):** `raw:kontroler` rozdzielony na fabryczny (cennik, 300 / 50 m, dost. 30%,
  WKK 10%; pod Kobaltem bez przepisu standardowego — D37) i domowy (wynik wiersza Hakerstwa, 100 / 20 m); zasięgi we
  flagach przedmiotu, opisy w `items/production-gear.mjs`. Na obu aktywności Komenda [B] i Steruj [A]
  (U21).
- **Zasilanie (U15):** gniazdo akumulatora na uchwycie (aktywność „Włóż akumulator”, akumulator z
  produkcji/sprzętu), agregat jako modyfikacja ze zbiornikiem; stan w `power-source.mjs`, widok na
  uchwycie i w OSD.
- **Modyfikacje (RAW: z MG):** przedmioty na aktorze drona z flagą `zamontowane` — broń (U13, U14),
  latarka (provider `light-sources.mjs` działa na każdym aktorze), kamera noktowizyjna / termowizyjna
  (provider `vision-sources.mjs`). Koszt i dopuszczalność — MG (T0 w opisie). Udźwig drona liczy masę
  zamontowanych.

### 7.10 Drony — tryb zdalnego sterowania

- **Wejście:** „Steruj [A]”, „Komenda [B]” albo — poza walką — „Przejmij sterowanie” z Kontrolera w ręce
  (D12, D22, D36, U21; zasięg U17;
  przekaźnik MG ustawia `operator` i OWNER). Klient operatora: zapamiętuje kontrolowane żetony, kontroluje
  **tylko** drona (rdzeń: gracz widzi wtedy wyłącznie przez kontrolowany żeton), kamera podąża
  (`canvas.animatePan` przy ruchu drona), ruch — WASD rdzenia v14 (strzałki przesuwają tylko widok; bez własnego
  schematu).
- **Obraz (D11, D34, U16):** tryb wizji „Kamera drona” udaje analogowy kanał FPV. Stałe „gorsze
  oko” to ograniczone pasmo (poziome rozmycie, miękkie krawędzie), śnieg i przeplot. Uniform
  `sygnal` per źródło wizji prowadzi degradację w kolejności prawdziwego analogu: więcej śniegu →
  zanik koloru → rwanie i przesuwanie linii → toczenie się obrazu → sam szum. Dron Wyłączony albo
  Oślepiony (awaria 8) — sam szum. Kolor — D38.
- **Wyjście** — kontrola i widok wracają na żeton operatora, dron staje (D35): Esc; utrata sygnału
  (D24 — FAILSAFE na OSD, potem cięcie); kontroler poza ręką (D22); operator
  nieprzytomny; dron Wyłączony. Zasięg sprawdzany przy ruchu drona i operatora — pozycje z
  `_source`/`changes`, nie z animowanych pól żetonu (pułapka v14: w `updateToken` `x/y` są o ruch w tyle).
- **OSD (D34)** zamiast HUD-a. Rysowane w kanwie pod tym samym filtrem co obraz — kontroler lotu
  wkleja OSD do sygnału, więc przy słabym sygnale trzęsie się i rwie razem z obrazem. Czcionka
  Betaflight (znaki MAX7456 12 × 18, białe z czarną obwódką) jako wydzielony zasób GPL-3 w
  `fonts/osd/` (D39); kod czyta atlas WEBP jak dane. Język mieszany, bez
  polskich liter (D38): słownictwo firmware po angielsku (RSSI, ARMED, FAILSAFE, BAT LOW), reszta po
  polsku (PW, AKCJA, BONUS, nazwy akcji). Każdy element ma funkcję:
  - **nazwa drona** — który dron, gdy jest ich kilka;
  - **RSSI** — ikona anteny jak w Betaflight, liczba 0–99 i kreski: prawdziwa jakość z U17 plus wolno
    płynący szum (`rssiOsd`,
    ok. ±5 przy pełnym sygnale, do ±15 przy krawędzi zasięgu), odświeżany kilka razy na sekundę jak
    prawdziwe OSD; utrata (D24) liczy się wyłącznie z prawdziwej wartości;
  - **tryb i aktywacja** — ACRO (latający) albo WALK (kroczący) oraz AKCJA, BONUS albo REAKCJA (D36);
    to samo pole miga ostrzeżeniami: FAILSAFE (utrata sygnału), RSSI LOW, BAT LOW, skróty awarii z
    [Zastosuj];
  - **lista akcji** — dwie linie przewijane co ok. sekundę: co wolno w tej aktywacji
    (`zakresAktywacji`, przycięte do drona), np. dla BONUS: RUCH, UNIK, ODSTAPIENIE, PRZYSPIESZENIE,
    PODNIES, UPUSC. Poza walką listy nie ma;
  - **ARMED + licznik amunicji** — ARMED miga, póki dron ma w tym sterowaniu atak do wykonania, po
    ataku gaśnie; licznik to naboje w magazynku zamontowanej broni (`magazine-model.mjs`), 0 miga; bez
    broni nie ma elementu;
  - **PW** — bieżące / maks.;
  - **zasilanie** — pozostały czas akumulatora (U15): funkcjonalny odpowiednik napięcia z prawdziwego
    OSD.

  Bez sztucznego horyzontu, szewronów i celownika. Linia „System ruszył …” (D23) to ekran powitalny
  kontrolera przy wejściu. „Esc — wyjdź” jest podpowiedzią Foundry poza obrazem, nie w OSD. Wyjście
  przywraca poprzednią kontrolę.
- **Oprawa (opcjonalnie):** dźwięk startu i szumu przy utracie sygnału — Freesound CC0, potok dźwięków
  produkcji (`PLAN_produkcja.md` §12).
- **Rozważone i odłożone:** własny schemat jazdy (W naprzód, A/D obrót) dla drona latającego — konflikt
  z przypisaniami rdzenia, siatką i API ruchu v14; wraca, jeśli rdzeń okaże się przy stole za słaby (§9).
- **Spike w E0:** uniform per źródło wizji (`token.vision` → warstwa tła), artefakty analogowe w
  shaderze tła i OSD pod tym samym filtrem.

### 7.11 Maszyny — awarie i naprawa

- **Awarie (D10):** karta MG po k20: pozycja po pominięciu niepasujących (np. dron bez broni → 1 i 6
  dalej; latający bez ataków wręcz → 15, 16 dalej), przycisk [Zastosuj] z efektem: 2 — Szybkość ½;
  3/14 — −2/−4 do ataku; 4 — znacznik „brak AB”; 5 — Sparaliżowanie do końca następnej tury; 6 — 50
  obrażeń przez tackę + amunicja na 0; 7 — znacznik „−1 atak”; 8 — Oślepienie do naprawy; 9 — znacznik
  „brak reakcji”; 10 — Obezwładnienie do końca następnej tury; 11 — Podpalenie (istniejący mechanizm);
  12 — Powalenie do końca następnej tury; 13 — TT −2; 15/16 — znaczniki wręcz; 17 — „wraca do
  operatora”; 18 — sterowanie przechodzi na MG do naprawy (awaria wygrywa z „dron nie atakuje
  samodzielnie”); 19 — Wyłączony do naprawy; 20 — karta „Śmierć” (zniszczony). Trwałe skutki („do czasu
  naprawy”) to efekty z flagą `awaria`, zdejmowane naprawą. Uwaga na 6: 50 obrażeń to Olbrzymie
  obrażenia dla każdego drona z maks. PW ≤ 25 (latający przy INT +4 ma 20) — zniszczony.
- **Naprawa PW (D9, RAW):** aktywność uchwytu „Napraw (1 h)”, zegar +1 h, 2k6 + mod. INT naprawiającego;
  w Postoju jako zajęcie w budżecie pracy. Narzędzia jak przy produkcji drona (hakera i elektronika;
  brak — ⚠ i przeklikanie, D23 produkcji). RAW mówi „swojej maszynie” — RAI: każdy z narzędziami
  (naprawa M2 nie wymaga Wprawy). Naprawa ponad 0 PW zdejmuje Wyłączony (§7.4).
- **Naprawa awarii — NOE:** karta T1, MG wybiera stopień z naprawy M2 albo „naprawione”.
- **Naprawa awarii — WKK (D25, D28):** Robota naprawy M2 z celem = uchwyt drona (`PLAN_produkcja.md`
  §11: ST i czas wg stopnia — Drobnostka ST 10 / 1k4 min, Trochę roboty ST 15 / 1k4 h, Skomplikowana
  harówa ST 20 / 2k4 h; porażka — czas przepada, surowce zostają, L15). Zmiana względem M2: zamiast
  „% ceny, podział jak przy produkcji celu” — **konkretne części wg tego, co się zepsuło**, w małych
  ilościach (D28). Reguła: każdy wymieniony surowiec w ułamku jego ilości w przepisie drona —
  Drobnostka ⅕, Trochę roboty ½, Skomplikowana harówa ¾ (w górę, min. 1); Chemia (w przepisie 1)
  stała: 2 / 3 / 4. Wychodzi mniej więcej o ⅓–½ taniej niż naprawa M2. MG może ilości edytować jak w
  produkcji.

  | k20 | Awaria | Naprawa WKK | Kroczący (15 CE, 1 CH, 10 CZ, 9 MK) | Latający (10 CE, 1 CH, 29 CZ, 5 MK) |
  |---|---|---|---|---|
  | 1 | broń zniszczona | **wymiana broni** + montaż: Drobnostka | 2 MK, 2 CZ | 1 MK, 6 CZ |
  | 2 | napęd | Skomplikowana harówa | 8 CZ, 7 MK, 4 CH (smar) | 22 CZ, 4 MK, 4 CH |
  | 3 | celowanie −2 | Trochę roboty | 8 CE, 5 CZ | 5 CE, 15 CZ |
  | 4 | procesor | Skomplikowana harówa | 12 CE | 8 CE |
  | 5, 10, 12 | zasilanie / reset / żyroskop | — przemijające | — | — |
  | 6 | eksplozja amunicji | mocowanie broni: Trochę roboty (+ PW naprawą RAW, nowa amunicja) | 5 MK, 5 CZ | 3 MK, 15 CZ |
  | 7 | manipulator | Trochę roboty | 5 CZ, 5 MK | 15 CZ, 3 MK |
  | 8 | optyka | Trochę roboty | 8 CE, 5 CZ (soczewki, matryca) | 5 CE, 15 CZ |
  | 9 | wyciek płynów | Drobnostka | 2 CH (płyny) | 2 CH |
  | 11 | samozapłon | okablowanie: Drobnostka (+ PW naprawą RAW) | 3 CE, 2 CH | 2 CE, 2 CH |
  | 13 | pancerz TT −2 | Trochę roboty | 5 MK, 5 CZ (blachy) | 3 MK, 15 CZ |
  | 14 | celowanie −4 | Skomplikowana harówa | 12 CE, 8 CZ | 8 CE, 22 CZ |
  | 15 | siłowniki | Trochę roboty | 5 CZ, 3 CH (hydraulika) | — (bez ataków wręcz: pominięte) |
  | 16 | siłowniki zniszczone | **wymiana:** Skomplikowana harówa | 8 CZ, 7 MK, 4 CH | — (jw.) |
  | 17 | uszkodzenie pamięci | Drobnostka | 3 CE | 2 CE |
  | 18 | błąd pamięci | Trochę roboty (wgranie od nowa) | 8 CE | 5 CE |
  | 19 | zasilanie / paliwo | Trochę roboty | 8 CE, 3 CH (elektrolit, paliwo) | 5 CE, 3 CH |
  | 20 | autodestrukcja | **nienaprawialne** — wrak (U11) | — | — |

  „Rozmiar szkody”: dron z PW ≤ ½ maks. podnosi stopień o jeden (Drobnostka → Trochę roboty →
  Skomplikowana harówa); Skomplikowana harówa w górę — pełna ilość z przepisu. „Nie opłaca się
  naprawiać”: wymiana (1, 16) i wrak (20). Ułamki w `wkk/config/naprawa-awarii-kobalt.mjs`.

### 7.12 Emiter EMP

Broń w `bron` (kategoria specjalna, biegłość z samej zdolności Emiter EMP), przepis profesji jak
Pogromca (D35 produkcji: 100 h / 100 gb, bez testu). Magazynek 6, „Naładuj (230 V)” — T1. Cel nie-maszyna
→ T3: obrażenia 0 z plakietką „EMP nie działa na istoty żywe” (do nadpisania). Porażenie: RO KON ST 15
→ Obezwładnienie do końca następnej tury atakującego
(wzorzec `weapon-save-properties.mjs`). Maszyna trafiona — normalnie Próg awarii. TT celu-maszyny wg
D27 (nota pancerza → 10 + mod. ZRC, bez noty → pełna TT; flaga z `ac.note` przez builder Bestiariusza)
jako źródło silnika TT (`PLAN_tt.md`), aktywne tylko dla tej broni.

### 7.13 Paczki i potok

- `dev/classes/extract_professions.py` → `dev/classes/companions.json` (statblocki i ramki z s. 75–76,
  83–84, 99–101); gramatyka wzorów ścisła.
- `npm run build:classes` → `config/towarzysze-data.mjs`; `fvtt packs` → paczki `towarzysze` (nowa,
  Actor) i `klasy` (klasy Towarzysz), uchwyty dronów w `sprzet` (bez dostępności w sklepie).
- Rejestr pokrycia: Partner, Oswajanie zwierząt, Moja prawa ręka, Hakerstwo, Emiter EMP — plakietki
  zmienione; `zdolnosci.resync({ commit: true })` na kartach.
- Grafika: żetony z góry dla psa, owada, ssaka, gada i obu dronów, ikony uchwytów — zamówienia w
  `dev/icons/MISSING.md`, WEBP; do tego czasu `tokens/_placeholder/` jak w Bestiariuszu.

### 7.14 Migracja Evie (i poprawka Victora)

Skrypt `scripts/migration/migrate-towarzysze.mjs`, próba na sucho domyślnie, manifest w `dev/backup/`:

1. **Victor:** biegłość w broni palnej pośredniej jako kategoria Sędziego (D14); `zdolnosci.resync` dla
   Partnera (F4).
2. **Evie:** flaga U1 (`wlasciciel` = Victor, `rodzaj: "ludzki-partner"`, `klasa: "zwiadowca"`); klasa
   `partner-evie` → klasa „Towarzysz (Ludzki partner)” poziom 3, **bez** uruchamiania kreatora (jej
   wybory zostają, awanse zapisane jako już dokonane); efekt PB +2 (U3); `hp.max` źródła → `null`
   (liczy moduł, 5 × 3 = 15 — bez zmiany liczby); Percepcja → MDR, Śledztwo → INT (F3); członek
   drużyny (D19); własność — gracz Victora; usunięcie notki „brak automatyzacji przywołania” z biografii.
3. **Sztuczka (D15)** — gracz wybiera przy migracji; krótka lista (wymagania spełnione przy jej cechach
   i biegłościach):
   - **Ukryty cel** — ignorujesz osłonę ½ i ¾ celu oraz Utrudnienie od Unikania. Wsparcie ogniowe z AR.
   - **Przycelowanie** — +1 ZRC; „Celuję w…” [B]: strzał w wybraną kończynę lub element.
   - **Szybkie palce** — +1 ZRC; zmiana magazynka w Akcji Bonusowej.
   - **Aramis** — +1 SIŁ lub ZRC; Wytrącenie broni w Akcji Bonusowej, cel rozbrajany z Utrudnieniem.
   - **Patriota** — +1 do dowolnej Cechy; dodatkowa zdolność z listy Nowego Jorku.
   - **Szkolenie w broni** — +1 SIŁ lub ZRC; biegłość w wybranej kategorii broni (własna, niezależna od
     Victora).
   - **Ćwiczenie czyni mistrza** — +1 do dwóch Cech albo +2 do jednej.
   - **Pierwotny instynkt** (obecna) — +5 do Percepcji; +5 do Inicjatywy nic nie daje, bo Evie działa w
     turze po Victorze.
4. **Weryfikacja:** grupa inicjatywy z Victorem, Komenda i pominięcie z Unikaniem, PW 15 / KW 3k6 /
   PB +2, AR z biegłością, wejście w umieranie, Regeneracja na DO, dzienne zapotrzebowanie drużyny.
5. Notatka kampanii o Evie (sekcja Mechanika) — aktualizuje MG w vaulcie.

---

## 8. Etapy

Kolejność: Evie najpierw (jedyna migracja), potem pozostałe istoty na tym samym rdzeniu, potem drony.
Spike'i ryzyk technicznych w E0.

| Etap | Zakres | Rozmiar | Gotowe gdy |
|---|---|---|---|
| **E0** | Czyste zasady §7.1 + testy warstwy 1; spike'i: `reset()` i kolejność owinięć (§7.3), grupa + sortowanie (§7.5), uniform per źródło wizji, artefakty analogowe i OSD pod filtrem (§7.10) | M | `npm test` i Quench zielone; notatka ze spike'ów w §11 |
| **E1** | Rdzeń: flaga U1, roll data, PW/KW/PB/biegłości (§7.3); `maStopnieZranienia` i luka s. 205 (§7.4, F1–F2); bramki BG i PD (U10, U22) | M | Quench `towarzysze`; Bestiariusz ze Stopniem → umieranie, maszyna → bez Stopnia |
| **E2** | Walka §7.5: grupa, kolejność, rzut właściciela, dołączanie; Komenda i początek tury; tiki raz na turę (F17 — przed [Cofnij]; może wejść wcześniej osobnym commitem, to błąd M1); [Cofnij] | M | e2e `towarzysz` (walka; cofnięcie tury płonącego bez drugiego 1k4) |
| **E3** | Karty §7.6, drużyna §7.7, pule rekonwalescencji (F6) | M | e2e `towarzysz` (karta, DO, zapotrzebowanie) |
| **E4** | Tworzenie §7.8: klasa Towarzysz (z ochroną U23), krok cech, narzędzie MG z [Odłącz], zwierzęta z szablonów, podpowiedź szukania | M | e2e `towarzysz` (MG tworzy, gracz przeklikuje kreator w osobnym logowaniu) |
| **E5** | Migracja Evie §7.14 — piaskownica, potem kampania z MG; wybór Sztuczki | S | lista z §7.14 pkt 4 odhaczona na żywo, zrzut ekranu |
| **E6** | Potok §7.13 dla istot: ekstrakcja, generator, paczka `towarzysze`, rejestr pokrycia | S–M | `npm run release:check` zielony |
| **E7** | Drony I §7.9 + §7.4 (maszyny): model z uchwytem bez klonów, stempel twórcy, produkcja, rozłóż/złóż, Kontrolery (300/50 i 100/20 m — D32, dostępność WKK — D33, Komenda w ręce), aktywacje drona (D35, D36), formuły, amunicja, zasilanie, Wyłączony, Olbrzymie, upadek latającego (D29), awarie [Zastosuj] (także Bestiariusz) | L | e2e `dron` (produkcja → rozłożenie → Komenda → atak → awaria → 0 PW → złożenie) |
| **E8** | Drony II §7.10: tryb zdalny, obraz analogowy z degradacją, sygnał, wyjścia (D22, D24), OSD (D34) z czcionką Betaflight (D39: `fonts/osd/`, generator `.mcm` → WEBP), operator i przejęcie | L | e2e `dron` (sterowanie, sygnał na 3 odległościach, utrata → widok wraca, przejęcie przez drugiego gracza); zrzuty obrazu |
| **E9** | Drony III §7.11: naprawa PW (RAW), awarie NOE (karta) i WKK (tabela), wrak | M | testy warstwy 1–3; e2e `dron` z Kobaltem i bez |
| **E10** | Emiter EMP §7.12 | S–M | Quench + krok e2e `combat` (maszyna / istota żywa) |
| **E11** | Dokumentacja i porządki §10 | S | B7 dla tych wierszy |

**Sesje: E0–E2, E3–E5 (Evie gotowa do bety karty), E6–E7, E8 (osobna — obraz i sterowanie), E9–E11.**

### Testy

- **Warstwa 1:** każda funkcja §7.1 — tablice z RAW (statblocki §3.2 przy PB 2/3/4 i MDR +1…+4, wzory
  dronów przy INT +2…+5, ½ poziomu w dół z min. 1), kupowanie 24 pkt (Evie: 8/15/12/8/15/10 = 24),
  kolejność z remisami trzech stron, decyzja tury istot (U8), zakres aktywacji drona dla A/B/R (D36),
  s. 205 i 214 jako przypadki, tabela awarii z pomijaniem, krzywa sygnału (ściana, „pod ziemią”),
  zasilanie, ilości napraw WKK (oba drony, próg ½ PW), TT celu dla EMP (D27), upadek drona (D29).
- **Warstwy 2–4 (Quench):** prawdziwy właściciel i towarzysz (`scratchActor`) — awans właściciela
  zmienia PW/KW/TT bez zapisu na towarzyszu; brak właściciela → szablon + plakietka; walka ze stubem
  (`game.combat`, pamięć projektu).
- **Warstwa 6 (e2e, piaskownica, `dev/e2e/`):**
  - **`towarzysz`** — MG tworzy Ludzkiego partnera dla gracza, gracz (osobne logowanie) przeklikuje
    kreator; walka: rzut właściciela, grupa, Komenda → tura; bez Komendy → Unikanie i pominięcie;
    [Cofnij]; pies do 0 PW → „Umiera”; DO → Regeneracja liczy towarzysza; dzień → jedzenie i woda;
    Stopień towarzysza nie daje PD.
  - **`dron`** — Robota → uchwyt z linią „System ruszył …”; kopia uchwytu przeciągnięciem odrzucona;
    rozłożenie przez gracza (przekaźnik); Komenda z kontrolerem w plecaku → [Weź do ręki]; [B] → atak →
    plakietka, ponowne wejście → plakietka „druga aktywacja”; Steruj → tylko dron kontrolowany, tryb wizji aktywny, sygnał na trzech odległościach i za
    ścianą, utrata → widok i kontrola wracają do operatora; drugi gracz z Kontrolerem przejmuje; [R] →
    atak okazyjny drona za Reakcję operatora; atak z formułą twórcy i operatora, magazynek schodzi; kontroler wytrącony → wyjście;
    krytyk → awaria → [Zastosuj]; 0 PW → Wyłączony; latający Wyłączony w powietrzu → karta „Spada”;
    naprawa z uchwytu; zegar → akumulator schodzi.
  - **`combat`** — rozszerzenie: istota Bestiariusza ze Stopniem → rzuty przeciw śmierci; maszyna —
    krytyk bez Stopnia; EMP.
- Każdy etap z UI: zrzut ekranu w przekazaniu (`TESTING.md` §3).

---

## 9. Poza planem

- Automatyczne podążanie żetonu za żetonem — dron rusza się w aktywacji (D35), zwierzę w swojej turze;
  ruch prowadzi gracz.
- Własny schemat jazdy dronem (W/A/D) — po teście rdzenia przy stole (§7.10).
- Szef każe (Mafiozo), Bezlitosny przywódca — M7.
- Walka na wierzchowcu, Dżokej, Rodeo, Kawalerzysta — M6. Uwaga: towarzysz użyty jako wierzchowiec
  (zmutowany ssak jest Duży) przechodzi na model wierzchowca z RAW — działa w turze jeźdźca, tylko
  Bieganie / Przyspieszenie / Odstąpienie / Unikanie (s. 257). To odwrotność D1, rozstrzyga M6.
- Dron w pościgu — M4: ruch ≥ 36 m to +1 znacznik, więc dron latający z Przyspieszeniem (36 m) trzyma
  tempo osobówki bez manewrów Gazu — wystarczy Komenda [B] (D36), operatorowi zostaje Akcja; dron w tej
  turze nie atakuje; rozłożenie z jadącego pojazdu na
  znacznik pojazdu (RAI); zasięg — D32 (fabryczny 8 znaczników, domowy 2).
- Koszt utrzymania na Długim postoju, robota dla ludzkich podwładnych, 1/10 doli — M5.
- Szukanie nowego towarzysza jako zajęcie Postoju (24 h dzielone przez gracza, oswajanie 3 dni) — M5 (D30).
- Przeniesienie towarzysza w postać zapasową po śmierci właściciela — ręcznie (D31).
- Hakowanie cudzych dronów i maszyn (Przeprogramowanie maszyn Molocha to przepis produkcji M2).
- Przebudowa drona przez innego twórcę (nowy stempel) — Robota, gdy ktoś o to poprosi.
- EMP przeciw pojazdom (M4) i elektronice w ekwipunku (gogle, kontroler, latarka) — MG.
- Jakość wody (brudna / skażona) w zapasach drużyny.

## 10. Po wdrożeniu — do zaktualizowania

- `IMPLEMENTATION.md`: macierz — wiersz „Towarzysze i drony” (❌ → ✅/🟡), umieranie Bestiariusza
  (s. 205), maszyny (awarie); tabela plików; changelog.
- `PLAN_beta.md` M3 — zakres (drony pełne, s. 205, EMP), rozmiar, odhaczenie; M5 — dopisać Szukanie
  towarzysza (D30).
- `scripts/wkk/README.md`: RAI — dron na 0 PW Wyłączony (D7), rozłożenie drona = akcja (D13), waga i
  cena drona (D21), kontroler w ręce (D22), twórca zamrożony (D23), EMP i opancerzenie (D27),
  „½ poziomu” w dół z min. 1, „24 punkty” = tabela kupowania, zakres [B]/[A] drona (D36);
  odczyt MG — 20 m domowego kontrolera przez ściany (D32); WKK — tabela napraw awarii (D25, D28;
  `wkk/config/naprawa-awarii-kobalt.mjs`, wzorzec `wkk/config/rekonwalescencja-kobalt.mjs`),
  dostępność fabrycznego kontrolera 10% (D33), fabryczny niebudowalny (D37).
- Pytania do autora systemu (obok `docs/Errata-produkcja.md`): EMP i
  opancerzenie (D27), RAW s. 205 a umieranie przeciwników (s. 34) — potwierdzenie odczytu D3.
- `docs/`: strona gracza „Towarzysze i drony” (Komenda, tura; dron: jedna aktywacja na rundę i zdanie
  „[B] — ruch, unik, odwrót, przedmiot; [A] — wszystko” — D35, D36; naprawa, Szukanie, towarzysz zmarłego właściciela — D31, autor systemu);
  `docs/Pierwsze-kroki.md` — towarzysz przy tworzeniu Sędziego / Łowcy / Mafiozo.
- `config/class-features-coverage.mjs` / `dev/classes/gen_features.py` — plakietki pokrycia (B5).
- Czcionka OSD (D39): `CREDITS.md` — sekcja „Czcionki” (Betaflight, GPL-3, ścieżka i tag źródła);
  `README.md` — czcionki na liście zasobów o odrębnych warunkach; `dev/release/build-zip.mjs` —
  `fonts` w `INCLUDE_DIRS` (z `LICENSE` i `.mcm`); `AGENTS.md` — wiersz generatora atlasu w tabeli
  potoków.
- Notatka kampanii o Evie (vault, poza repozytorium) — MG.

## 11. Postęp

**2026-10-09 — trzecia runda i przegląd spójności (przed E0).** P1–P4 i kierunek P6 zamknięte jako
D21–D25; P5 z propozycją na życzenie MG. Przegląd znalazł:
- **konflikt** — Komenda i Steruj na zdolności Hakerstwa kłóciły się z D12 (operatorem bywa każdy z
  kontrolerem): przeniesione na Kontroler (U21);
- **konflikt** — „dwa różne kontrolery” w §3.6 były założeniem; RAW podaje dwa zasięgi przy tej
  samej cenie i czasie, moduł ma jeden wariant (F13, P10);
- **luki** — tura drona bez polecenia (U20), role drona: posiadacz / operator / twórca (U11), klon
  uchwytu (F15), PD i podziały nagród dla towarzyszy-członków (F14, U22), klasa Towarzysz na BG
  (U23), scena „pod ziemią” dla zasięgu (U17), wyjścia z trybu zdalnego (§7.10), awaria 18 a „dron nie
  atakuje samodzielnie” i awaria 6 jako Olbrzymie obrażenia (§7.11), grafika (§7.13);
- **uproszczenie** — jeden tryb wizji kamery zamiast dziennego i nocnego (U16).

**2026-10-09 — czwarta runda, plan zamknięty.** P5–P10 → D26–D31. Skutki w planie: jeden Kontroler
100 m / 50 m (§7.9, U17); EMP wg noty pancerza (§7.12); tabela napraw WKK przeliczona na małe ilości
konkretnych części (§7.11); upadek drona latającego z RAW s. 253 (§7.4); Szukanie wychodzi z M3 do
M5 — w E4 zostaje podpowiedź (§7.8); postać zapasowa po śmierci właściciela bez automatyki, narzędzie
MG dostaje [Odłącz] (D31).

**2026-10-09 — piąta i szósta runda, plan zamknięty ponownie.** P11–P14 → D32–D38. Najważniejsza
zmiana modelu: dron nie ma tury (D35) — znikają drony w grupie inicjatywy, polecenia stałe i stara
postaci U20; w zamian jeden rozwiązywacz „tura drona = tura operatora” i zakres aktywacji [A]/[B]/[R]
(D36) widoczny na OSD. Poza tym dwa kontrolery (D32, D33, D37), obraz analogowy i OSD (D34, D38),
F17 (tiki tury przy cofaniu) do E2.

**2026-10-10 — E0 zrobione.** `config/towarzysze-rules.mjs` (wszystkie funkcje §7.1 plus `ttCeluEmp` z
D27), `config/towarzysze-data.mjs`, `wkk/config/naprawa-awarii-kobalt.mjs`; paczka Quench `towarzysze-zasady`
(53) zielona w kampanii. Tabela §7.11 wychodzi z reguły ułamków co do sztuki, dla obu dronów — plan i kod
zgadzają się niezależnie. `towarzysze-data.mjs` jest do E6 pisany ręcznie; generator ma odtworzyć jego kształt,
a paczka pilnuje liczb z RAW bez względu na autora.

- **Spike `reset()` (§7.3):** przelicza towarzysza w ~2,4 ms, wielokrotnie, bez „Cannot redefine property:
  darkvision” — `reset()` buduje dane od nowa ze źródła (`_initialize` → `_safePrepareData`), więc shim
  zmysłów dnd5e dostaje świeży obiekt; pułapka dotyczy tylko ręcznego drugiego `prepareData()`. Zmiana
  właściciela bez `reset()` nie dochodzi do towarzysza (R3 potwierdzone). Owinięcie zarejestrowane po
  `registerPW` jest zewnętrzne i widzi wartość ze źródła (BN) albo 0 (postać bez klasy z `CLASSES` —
  `pw.mjs` wtedy nic nie robi). **Postać bez klasy ma u dnd5e PB +1** — efekt U3 jest konieczny, nie ozdobny.
- **Spike grupa i kolejność (§7.5):** przy remisie trzech stron dnd5e postawił towarzysza (`Abel Pies`) przed
  BN-em, a właściciela na końcu — gorzej niż F9: między nimi wróg. Owinięcie `_sortCombatants` działa, ale rdzeń
  woła je **bez `this`** (`contents.sort(this._sortCombatants)`); kotwice porównuje oryginał dnd5e.
  `activeCombatant` = najniższe id (owinąć). **Nowe znalezisko:** gracz rzucający inicjatywę za właściciela w
  grupie dostaje „lacks permission to update CombatantGroup” — dnd5e (`Combatant5e._onUpdateOperation`)
  zapisuje inicjatywę grupy jako rzucający, a `_prepareGroup` nadpisuje rzut członka inicjatywą grupy, więc
  rzut ginie po cichu. Naprawa sprawdzona: grupa tworzona z `ownership` OWNER dla graczy właściciela (grupa ma
  własne pole własności) — rzut gracza przechodzi na grupę i towarzysza. Tracker dnd5e rysuje grupę
  **zwiniętą** jako „<pierwszy żeton> Group” — rozwinięcie U7 przez `combat.expandedGroups` u klienta przy
  pierwszym zobaczeniu grupy.
- **Spike uniform per źródło wizji (§7.10):** każde źródło wizji ma własną instancję `BackgroundVisionShader`;
  własny uniform przeżywa odświeżenie percepcji (ta sama instancja, nowa dopiero przy zmianie trybu wizji).
- **Spike obraz analogowy i OSD pod jednym filtrem (§7.10):** `PIXI.Filter` w przestrzeni ekranu na
  `canvas.stage`, OSD jako kontener w `canvas.stage` przeliczany co klatkę na ekran — OSD rozmywa się, rwie i
  toczy razem z obrazem; 142 FPS. Zrzuty przy sygnale 1,0 / 0,5 / 0,15 w przekazaniu sesji.
  **Wniosek do E8 (do weta MG):** degradacja z sygnałem (rwanie, toczenie, śnieg, zanik koloru) jako filtr
  ekranu **u operatora**, nie w shaderze tła — shader tła maluje tylko wnętrze wielokąta wizji, więc mgła,
  krawędzie i OSD nie rwałyby się ani nie toczyły. Shader tła trybu „Kamera drona” zostaje dla stałego wyglądu
  kamery (pasmo, czerń i biel w ciemności), który widzi każdy patrzący przez drona; uniform per źródło nie jest
  wtedy potrzebny do sygnału. Krzywa do strojenia: przy 0,5 OSD już ledwo czytelne — śnieg za mocny w połowie.
- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *„Awaria nie dotyczy maszyny”* (s. 214): 1 wymaga broni, 6 amunicji, 3/7/14/18 ataków, 15/16 ataków
    wręcz. Dron bez broni: 6 → 8 (7 też pominięte), 18 → 19. Plan wymieniał przykładowo tylko 1 i 6.
  - *Chemia przy harówie podniesionej* (PW ≤ ½): 4, nie 1 z przepisu — „pełna ilość z przepisu” obniżyłaby ją.
  - *PW min. 1* dla każdego wzoru — ujemny modyfikator nie jest przyczyną śmierci (maks. PW 0, s. 34).
  - *[A] z manipulatorem:* Pochwycenie i Wytrącenie; Odepchnięcie ma każdy dron.
  - *Krzywa sygnału:* zapas 12 dB przy tłumieniu 20 dB na dekadę — czysto do ¼ zasięgu, 0,5 w połowie, sam
    szum na krawędzi, utrata za zasięgiem.

**2026-10-10 — E1 zrobione.** `actors/towarzysze.mjs` (flaga U1, odwrotny indeks w pamięci, roll data
`@wlasciciel`/`@tworca`/`@operator`, KW zwierzęcia i biegłości ludzkiego w danych bazowych, maks. PW w
pochodnych, `reset()` zależnych po każdej zmianie właściciela i przegląd przy `ready`, efekt U3,
`maStopnieZranienia`). `wMaszynie` = `maStopnieZranienia` (F1), krytyk → Stopień tylko dla mających Stopnie
(F2), Fuksy i PD bez towarzyszy, okno nagrody dnd5e bez towarzyszy (U22). Paczka Quench `towarzysze` (16) —
F1 i F2 sprawdzone mutacjami; cały Quench 966/966 w piaskownicy; e2e `umieranie` i `combat` zielone.

- **Zmiana widoczna przy stole:** 20 istot Bestiariusza ze STOPNIEM ZRANIENIA (m.in. Gangus Boss i Kapo, Szeryf,
  Cyngiel, Żołnierz Posterunku, Gigamut, Neoniedźwiedź) przy 0 PW wchodzi w umieranie zamiast ginąć, a krytyk
  na istocie bez Stopnia (zwykły BN, maszyna) Stopnia już nie daje. Żadna maszyna nie ma Stopnia w statblocku.
- **e2e `combat`:** krok „krytyk → Stopień” strzelał w GANGUSA ŻOŁNIERZA, który Stopnia nie ma — zapisywał F2
  jako wymaganie. Teraz cel gra istotę ze Stopniem, a nowy krok sprawdza krytyk na CYWILU bez Stopnia.
- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Ręcznie wpisane maks. PW* ludzkiego towarzysza wygrywa, jak w `pw.mjs`; BN (zwierzę) trzyma maks. w źródle
    zawsze, więc przy żywym właścicielu liczy moduł; wyłącznik `pwOverride: false` jak u BG.
  - *Bieżące PW* nie rosną same, gdy wzór podniesie maks. (zmiana MDR, awans) — zostaje źródło; przyrost o deltę
    przy awansie właściciela (U5) idzie z synchronizacją poziomów klasy „Towarzysz” w E4, bo bez tej klasy nie
    ma czego zapisać. KW ludzkiego towarzysza — też E4 (z klasy).
  - *Okno nagrody* nie pokazuje towarzyszy wcale (gamble i PD); 1/10 doli Prawej ręki to M5.

**2026-10-10 — E2 zrobione.** `combat/towarzysze-walka.mjs` (grupa z właścicielem i jej własność, kolejność,
`activeCombatant`, rzut towarzysza na właściciela, grupa rozwinięta, Komenda i jej zatrzask, początek tury
z Unikaniem i kartą, [Cofnij — była komenda]), `combat/tiki.mjs` (F17: krwawienie, podpalenie, regeneracja
i szał z chemii, Uduszenie — tylko krok naprzód, pamięć ostatniego tiku na aktorze). Komenda [B] to
aktywność zdolności Partner i Oswajanie zwierząt z potoku klas (`komenda: true` w generatorze; karta użycia
ma jedną linię zamiast całej zdolności ze statblockami). e2e `towarzysz` (8 kroków) — kolejność, własność
grupy i F17 sprawdzone mutacjami.

- **Znalezione przy wdrożeniu:** dwa przebiegi porządkowania grupy szły równolegle — uczestnik towarzysza
  dodany przez pierwszy planował drugi, zanim pierwszy utworzył grupę; wychodziły dwie grupy, jedna pusta.
  Przebiegi idą teraz w kolejce (złapała to paczka e2e).
- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Dołączanie:* właściciel dodany do walki ciągnie towarzysza, który ma żeton na tej scenie; towarzysz
    dodany sam dołącza do grupy, jeśli właściciel już walczy.
  - *Rzut za towarzysza* w grupie rzuca za właściciela, jeśli ten jeszcze nie rzucał; inaczej nic („działa
    po X”) — towarzysz nigdy nie ma własnej inicjatywy.
  - *Komenda poza turą właściciela* albo poza walką — tylko karta, bez zatrzasku. Komenda zdolności
    zatrzaskuje tylko jej rodzaje (Partner — pies i człowiek, Oswajanie — zwierzęta).
  - *Towarzysz przy 0 PW* ma turę zawsze — na Rzut Przeciw Śmierci; bez Unikania i bez pominięcia.
  - *Karta „bez komendy”* jest jawna (stół widzi, czemu partner stoi), [Cofnij] tylko dla MG; wraca do tury
    towarzysza także z następnej rundy.
  - *Kampania:* aktywność Komenda trafi na kartę Victora dopiero przez `zdolnosci.resync` — w migracji E5.

**2026-10-10 — E3 zrobione.** `actors/towarzysze-karta.mjs`: pasek towarzyszy pod panelem Stan na karcie
właściciela (portret, PW, Stopień, stany, [Karta], [Komenda], [Pokaż żeton]; bez towarzysza — [Nowy
towarzysz] dla MG albo podpowiedź szukania dla gracza), plakietka „<rodzaj> · <właściciel>” w nagłówku karty
towarzysza z dymkiem rozkładu (`rozpiszWzor`), towarzysze pod właścicielem na karcie drużyny, pula medyków
z towarzyszami (F6), przypomnienie o brudnej wodzie dla zwierząt w dziennym zapotrzebowaniu, maszyny poza
racjami. e2e `towarzysz` dostała trzy kroki (karta, drużyna, DO).

- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Pasek* buduje `sheet-shell.mjs` zaraz po panelu Stan — jego słuchacz renderu musi zostać ostatni.
  - *Rozkład w dymku* mówi „PB właściciela”, nie „PB Victora” — polskich imion nie odmieniamy automatem;
    imię właściciela jest w samej plakietce.
  - *Pula medyków* — postacie drużyny i towarzysze-postacie (ludzki partner z Medycyną opatrzy); zwierzę nie.
  - *Zachód słońca* (choroby) dalej liczy postacie graczy: ludzki towarzysz już w nim jest, zwierzę nie —
    chorób zwierząt RAW nie rozpisuje.
  - *Kolor PW na pasku* — zielony / bursztynowy / czerwony od połowy i ćwierci, nie czerwony zawsze.
- **Narzędzia:** `fvtt e2e --suites=boot` padał na „module version 0.17.1” — kopia `module.json` w
  piaskownicy sprzed wydania v0.18.0; `fvtt sandbox:init` ją odświeża. Do zrobienia w narzędziach: wykrywać
  rozjazd wersji w `doctor` albo przed e2e.

**2026-10-10 — E4 zrobione.** `actors/towarzysze-tworzenie.mjs` (narzędzie MG „Nowy towarzysz”, [Odłącz],
kreator ludzkiego towarzysza w nagłówku karty: Cechy → Pochodzenie → klasa „Towarzysz”, poziomy za
właścicielem z przyrostem PW, ochrona klasy U23), `dev/packs/build-towarzysze.mjs` (klasa „Towarzysz” w paczce
`klasy`, folder „Towarzysze”; nowa paczka `towarzysze` z szablonami czterech zwierząt przez builder
Bestiariusza), statblocki zwierząt w `config/towarzysze-data.mjs` (`STATBLOKI`, ręcznie do E6),
`validate-packs` zna klasę i szablony. e2e `towarzysz-tworzenie` (7 kroków; MG tworzy, gracz przeklikuje
kreator w swoim logowaniu) — poziomy za właścicielem i U23 sprawdzone mutacjami.

- **Paczka `towarzysze` weszła w E4, nie w E6:** narzędzie MG tworzy zwierzę z szablonu, więc szablon musiał
  być teraz. Źródłem są ręczne `STATBLOKI`; E6 dokłada ekstrakcję z NOE i generator, który je zastąpi —
  walidator paczek i Quench pilnują liczb niezależnie.
- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Kolejność kreatora:* Cechy → Pochodzenie → klasa. Pochodzenie dokłada +1/+1 do już ustalonych cech (w
    odwrotnej kolejności okno cech by je nadpisało), a Sztuczka wybierana na końcu widzi ostateczne cechy
    („której wymagania spełnia”).
  - *Jedna klasa „Towarzysz”* dla Ludzkiego partnera i Prawej ręki — te same zasady tworzenia (s. 76, 101).
  - *Narzędzie przy Oswajaniu* domyślnie rzuca k6 (rzut tylko dla MG); MG może wybrać zwierzę wprost.
  - *Szept po utworzeniu* idzie do graczy właściciela i MG; karta otwiera się MG (Foundry nie otwiera okien
    na cudzym kliencie).
  - *Szablon bez właściciela* pokazuje TT bez PB (formuła z pustym `@wlasciciel`) i PW z szablonu — to widok
    w kompendium, nie towarzysz.
  - *Migracja klas* (`migrate-classes`, ręczna) pomija towarzyszy — klasa „Towarzysz” nie jest zaślepką.

**2026-10-10 — E5 zrobione (kampania przy MG).** `scripts/migration/migrate-towarzysze.mjs`
(`game.neuroshima.towarzysze.migruj({ wlasciciel, towarzysz, broniWlasciciela, sztuczka, commit })`, na sucho
domyślnie, idempotentna). Kopie Victora i Evie z kampanii przeszły migrację w piaskownicy; lista z §7.14 pkt 4
na żywo: PW 15/15, KW 3k6, PB +2, klasa Towarzysz 3, Percepcja na MDR, Śledztwo na INT, AR z biegłością (palna
pośrednia u Victora), Komenda [B] na Partnerze, grupa inicjatywy z Victorem, tura z Komendą, pominięcie z
Unikaniem i kartą bez niej, umieranie ze Stopniem, licznik Regeneracji po DO, dzienne zapotrzebowanie drużyny.
Drugi przebieg nic nie planuje. Próba na sucho w kampanii daje ten sam plan.

- **Kampania (decyzje MG 2026-10-10):** migracja wykonana; Sztuczka Evie — **Przycelowanie** (D15) zamiast
  Pierwotnego instynktu, z +1 ZRC (15 → 16; Sztuczki nie niosą automatyki cech, premię podaje migracja —
  `premiaCechy`, tylko przy faktycznej zamianie). Lista §7.14 pkt 4 w kampanii bez kroków zmieniających stan
  (wartości, AR z biegłością, Komenda, drużyna, pasek u Victora, plakietka, brak Fuksów i kreatora) — walka,
  umieranie, DO i dzień sprawdzone na kopiach w piaskownicy. Zrzut obu kart w przekazaniu sesji.
- **Znalezione w kampanii:** Evie miała Szybkość 0 — postać sprzed `character-defaults.mjs` bez gatunku (dnd5e
  bierze Szybkość z gatunku). Migracja dopisuje 9 m, gdy jej nie ma; inne postacie bez gatunku — MG (uwaga z B6).
- **Pkt 5 §7.14** (notatka kampanii o Evie, sekcja Mechanika) — MG w vaulcie.

- **Kopia (U19) poza repozytorium:** plan mówił „manifest w `dev/backup/`”, ale kopia aktora to treść kampanii
  (biografia), a repozytorium jest publiczne — kopia leży w folderze świata (`worlds/<świat>/neuro-backups/`).
- **Znalezione przy migracji:** profesje nie nadają swoich biegłości (umiejętności, zestawu narzędzi, kategorii
  broni) — `professions.json` ma ich tekst, ale builder nie robi z niego awansów. Dotyczy wszystkich 18 profesji
  i każdej postaci, nie tylko Victora (brak mu Śledztwa i Zastraszania z biegłości Sędziego). Poza zakresem M3 —
  decyzja MG: pozycja „Biegłości profesji” w M6 `PLAN_beta.md`, z uwagą przy bramce B6.

**2026-10-10 — E6 zrobione (bez zielonej bramki wydania — niżej).** `dev/classes/extract_companions.py`
(NOE → `dev/classes/companions.json`: sześć statblocków, dwie ramki tworzenia, szukanie, zasilanie drona; słowniki
parsera Bestiariusza, nieznane słowo = błąd), `dev/classes/gen_companions.py` (frazy podręcznika → wzory roll data
ścisłą gramatyką; decyzje bez własnego zdania w RAW w tabeli generatora) → `config/towarzysze-data.mjs` jest teraz
generowany (`npm run build:classes`, bramka `release:check` porównuje oba kroki). Wynik zgadza się z ręczną wersją
co do liczby; różnice tylko dwie i obie na plus — dosłowny tekst cech psa („Pies ma Ułatwienie…”) i strona drona
kroczącego (s. 83). Plakietki pokrycia: Partner, Oswajanie zwierząt, Moja prawa ręka (31/133 zdolności z
automatyką); `zdolnosci.resync` w kampanii — tylko Partner Victora. Grafika: sekcja E w `dev/icons/MISSING.md`
(żetony z góry dla czterech zwierząt i dwóch dronów).

- **Bramka wydania nie jest zielona — z powodu cudzej pracy w drzewie:** krok `zip` odmawia przy niezatwierdzonych
  zmianach w plikach wydania (`icons/abilities/*` z partii ikon 54–57 i zmieniony `slaby-punkt.svg`), krok `packs`
  widzi różnicę Bestiariusza z niezatwierdzonego fragmentu `build-packs.mjs` tej samej partii. Moje pliki i paczki
  są zatwierdzone. Do decyzji MG: zatwierdzić albo odłożyć partię ikon, potem `fvtt packs` + `release:check`.
- Hakerstwo i Emiter EMP dostaną plakietki w E7 i E10, razem z automatyką.

**2026-10-10 — E7a zrobione (model, produkcja, rozłożenie).** E7 idzie w trzech kawałkach: E7a (ten),
E7b (Kontrolery i aktywacje), E7c (zasilanie, Wyłączony, Olbrzymie, upadek, awarie). `actors/drony.mjs`: dron =
aktor-maszyna z szablonu paczki `towarzysze` (dwa nowe szablony — builder bez Stopni, „krew” smar, Próg awarii
ze statblocku) ze stemplem twórcy (D23) i uchwytem w ekwipunku (25 / 4 kg, 70 / 90 gb — D21). Produkcja:
ukończona Robota z wynikiem `tabela:dron-*` tworzy oba — u gracza przez przekaźnik MG. Rozłóż [A] / Złóż [A]:
podgląd żetonu dnd5e (`TokenPlacement`), prośba flagą, aktywny MG tworzy albo usuwa żeton. Pasek u posiadacza
(wiersz drona z [Rozłóż]/[Złóż]), plakietka drona (twórca, posiadacz, „System ruszył …”), plakietka Hakerstwa.
Quench `drony` (18), e2e `dron` (produkcja u gracza → pasek → Rozłóż prawdziwym kliknięciem → Złóż).

- **Stan uchwytu wynika z żetonów** (doprecyzowanie U12): rozłożony ⟺ dron ma żeton na którejś scenie. Aktywny
  MG poprawia uchwyt po każdym utworzeniu i usunięciu żetonu drona — także gdy MG przeciągnie drona z katalogu,
  skasuje żeton albo całą scenę. Bez tego ręczny ruch MG rozjeżdżał wagę i stan uchwytu z kanwą.
- **Prośby jako kolejka** (`dronProsby.<nonce>` na aktorze gracza), nie jedna flaga jak we Flarze — `setFlag`
  scala obiekty, więc druga prośba przed obsłużeniem pierwszej mieszała ich pola.
- **Własność drona idzie za posiadaczem uchwytu** (przeniesienie zmienia właścicieli). Gracz-właściciel widzi
  przez żeton drona także poza trybem zdalnym, gdy nie kontroluje innego żetonu — bramka wizji należy do E8
  (tryb „Kamera drona”).
- **Pod Kobaltem** Haker buduje drona z przepisu standardowego, który odblokowuje lista profesji — tabela profesji
  jest wyłączona (`zrodlaDostepu`). Wynik ten sam.
- **Harness e2e — trzy błędy znalezione przy tej paczce** (`dev/agent/lib/e2e.mjs`, `dev/e2e/fixtures/`):
  `clickCanvas` klikał tam, gdzie widok był przed `canvas.pan` (karta w tle nie renderuje, a pikery czytają
  zbuforowane przekształcenie warstwy — dron lądował pole obok); `mouseMoved` z `button: "left"` znaczy „ruch z
  wciśniętym przyciskiem”, więc Chrome czasem zamieniał kliknięcie w przeciągnięcie bez `pointerdown` (granat w
  `combat` nie dostawał kliknięcia); powitalny samouczek rdzenia odpauzowuje tylko klienta MG, więc warunek
  `if (game.paused)` w fixture pomijał prawdziwe odpauzowanie i gracze stali w „Czas stop”.

**2026-10-10 — E7b zrobione (Kontrolery, aktywacje, broń drona).** `items/kontroler.mjs`: dwa przedmioty (D32)
— fabryczny z cennika (300 / 50 m, dost. 30%, WKK 10% — `config/dostepnosc.mjs` + `wkk/config/dostepnosc-kobalt.mjs`,
D33) i domowy z wiersza Hakerstwa (`tabela:kontroler-domowy`, 100 / 20 m); pod Kobaltem bez przepisu standardowego
fabrycznego (`BEZ_PRZEPISU_STANDARDOWEGO_KOBALT`, D37). Oba w paczce Sprzęt jako ekwipunek „tylko w ręce” z
aktywnościami Komenda [B], Steruj [A], Reaguj [R] (U21). `actors/drony-sterowanie.mjs`: kontroler w plecaku → okno
[Weź do ręki] i lejek lalki (D22; BN bez lalki zwolnieni), wybór drona na scenie (ostatni na wierzchu), karta z
dozwolonymi akcjami (D36), przekaźnik MG ustawia operatora, zatrzask i własność (U20, D12); plakietki „druga
aktywacja” (D35) i „atak wymaga Steruj [A]” (D36). `actors/drony-bron.mjs`: atak, obrażenia i ST obszarowe z twórcy i
operatora (U13), drony w symulacji magazynków (U14). Quench `drony` 31, e2e `dron` z krokami sterowania.

- **Formuły broni drona w chwili rzutu, nie w danych aktywności** (doprecyzowanie U13): owinięcie `getAttackData`
  (natywny atak i tryby ognia dziedziczą) i roll data aktywności drona (`@mod` = INT twórcy, `@prof` = PB twórcy,
  `@abilities.dex.mod` = ZRC operatora — na nowych obiektach). Zapis w aktywnościach przegrywałby z trybami
  ognia, które odbudowują aktywności broni przy każdej zmianie przedmiotu. Sheet drona pokazuje tę samą premię.
- **Broń na dronie jest zamontowana i założona** (`zamontowane`, `equipped`) — BN bez lalki używa tylko
  założonej broni (`config/validation.mjs`); bez tego atak drona kończył się „Sięgasz po Sztylet, a tam nic!”.
  Znalazła to dopiero paczka e2e — w Quench formuły liczyły się bez `use()`.
- **Reakcja [R] to nie druga aktywacja** — osobny znacznik rundy (`dronReakcja`), bo to Reakcja operatora (D35).
- **Własność operatora zostaje do E8:** zwolnienie przy wyjściu z trybu zdalnego (Esc, utrata sygnału, kontroler
  poza ręką) należy do trybu zdalnego. Do tego czasu [A]/[B] oddają kontrolę nad żetonem i przesuwają widok.
  Złożenie drona zeruje operatora i zatrzaski.
- **Pancerz celu, zasięg sygnału, upadek** — bez zmian w planie: E7c (zasilanie, Wyłączony, Olbrzymie, awarie,
  upadek) i E8 (obraz, sygnał, wyjście).

**2026-10-10 — E7c zrobione — E7 zamknięte.** `combat/maszyny.mjs`: status **Wyłączony** (`config/conditions.mjs`:
Obezwładnienie, Szybkość 0) z przyczynami naraz (`pw0`, `awaria`, `zasilanie`) — efekt znika dopiero bez żadnej;
[Zastosuj] Tabeli awarii z pominięciem niepasujących pozycji (D10) dla każdej maszyny, także Bestiariusza.
`actors/drony-stan.mjs`: zasilanie na zegarze świata (U15) — stan na uchwycie, procent na żywo, wyczerpanie →
Wyłączony, **Włóż akumulator [A]**, agregat na dronie z paliwem; upadek latającego (D29) — Powalenie opada (T4),
Wyłączony / Sparaliżowanie / Nieprzytomność w powietrzu → karta MG „Spada” (T2). `combat/umieranie.mjs`: dron na 0 PW
→ Wyłączony (T4), naprawa ponad 0 → działa; Olbrzymie obrażenia → karta „Śmierć” z przyczyną „zniszczony”, awaria 20 —
„autodestrukcja” (T2). Quench `drony` 42, e2e `dron` z krokami awarii, zegara i 0 PW; pełny Quench 1011/1011.

- **Przyczyny Wyłączenia jako zbiór**, nie flaga tak/nie: naprawa ponad 0 PW nie może włączyć drona, który ma
  jeszcze awarię 19 albo pusty akumulator (§7.4) — to wymaga pamięci, *dlaczego* jest wyłączony. Efekt włączony z
  HUD-a żetonu (bez flagi) traktujemy jako decyzję MG — moduł go nie zdejmuje.
- **Zasilanie rozliczane przy zmianie stanu, nie co tik:** `od` na uchwycie i procent na żywo (wzorzec Latarki);
  zapis tylko przy rozłożeniu, złożeniu, Wyłączeniu i wyczerpaniu. Dron z pełnym akumulatorem od razu traci
  przyczynę „zasilanie” — rozlicza to aktywny MG.
- **Nowy dron ma pełny akumulator** (RAI: produkcja daje działającego drona); stary akumulator z gniazda wraca do
  ekwipunku z resztą ładunku („Akumulator (35%)”). Ładowania akumulatorów RAW nie opisuje — procent poprawia MG na
  karcie przedmiotu (wiersz zasilania, edycja przy wyłączonym dronie). Pojemności zbiornika agregatu RAW nie podaje
  — tankuje MG (`game.neuroshima.drony.zatankuj(dron, litry)`).
- **Kary celowania (awarie 3, 14) wchodzą do ataku drona:** owinięcie `getAttackData` z E7b gubiło premie aktora;
  teraz je bierze (`actorBonus`).
- **„Do końca następnej tury”** (awarie 5, 10, 12) liczy się w turach maszyny, a drona — operatora albo posiadacza
  (U20), z `start.combatant` przestawionym jak Unikanie (`actors/tt.mjs`); poza walką bez czasu — zdejmuje MG.
- **Ikona Wyłączony** — dziś pożyczona z rdzenia; wiersz w `dev/icons/MISSING.md` (sekcja F).

**2026-10-10 — E8a zrobione (sygnał i tryb zdalny, bez obrazu i OSD).** `actors/drony-zdalne.mjs`: sygnał z
żetonów (U17 — linia prosta z wysokością od żetonu operatora, ściana przez test kolizji wzroku, pole sceny „Pod
ziemią” w konfiguracji sceny, na pościgu tory × 36 m); sesja na kliencie operatora — kontrola tylko drona, kamera za
dronem, podpowiedź „Esc — wyjdź” poza obrazem; wyjścia: Esc, utrata sygnału (FAILSAFE 1,5 s, potem cięcie — D24),
kontroler poza ręką (D22), operator nieprzytomny, dron Wyłączony, żeton zniknął, przejęcie (D12), koniec tury
operatora; bramka wizji (gracz patrzy przez drona tylko w swojej sesji). Kontroler dostał czwartą aktywność
**Przejmij sterowanie** (poza walką). Własność operatora nadawana i odbierana przez przekaźnik MG. Quench `drony` 56,
e2e `dron` z pięcioma krokami trybu zdalnego (prawdziwe klawisze D i Esc, trzy odległości, ściana, utrata, przejęcie
przez Gracza 2, wytrącony kontroler); cały Quench 1025/1025. Obraz kamery (E8b) i OSD z czcionką Betaflight (E8c) —
dalej.

- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Koniec tury operatora kończy tryb zdalny* — wniosek z D35 (aktywacja to jeden ciągły kawałek w jego turze); plan
    wymieniał wyjścia bez tego. Poza walką i dla operatora spoza walki — bez zmian.
  - *Poza zasięgiem nie ma aktywacji:* wybór drona pokazuje tylko drony z sygnałem; żaden w zasięgu — komunikat z
    odległością i zasięgiem, bez karty i bez zatrzasku (D24 mówi o utracie w trakcie, nie o wejściu).
  - *Operator musi mieć żeton na scenie drona* — inaczej nie ma skąd mierzyć; komunikat „kontroler nie ma skąd nadawać”.
    Pościg nie zna pasażerów pojazdu, więc liczy się żeton samego operatora.
  - *Esc najpierw zamyka okna i menu* (jak rdzeń), dopiero potem wychodzi z trybu zdalnego — karta postaci, z której
    użyto kontrolera, zamyka się pierwszym Esc.
  - *Przejmij sterowanie w walce odmawia* — w walce wejściem są Komenda [B] i Steruj [A].
- **Własność operatora jako zapamiętane nadanie** (`dronNadane`: „zdalny” albo „reakcja”), nie flaga tak/nie: moduł
  odbiera tylko to, co sam dał — właściciel uchwytu nigdy nie traci swojej. Odbiera aktywny MG: przy wyjściu z trybu
  zdalnego (prośba klienta), przejęciu, złożeniu drona, rozłączeniu gracza; nadanie do Reakcji [R] — przy zmianie tury
  i końcu walki. Zmiana posiadacza uchwytu nie zabiera własności operatorowi w trakcie sterowania.
- **Klient wchodzi po swojej prośbie, nie przed nią:** MG potwierdza sterowanie znacznikiem prośby
  (`dronSterowanie`); bez tego ponowne Steruj tym samym dronem łapało stare nadanie, a spóźnione „zwolnij” zaraz je
  odbierało.
- **Ruch v14:** WASD przesuwa kontrolowane żetony, strzałki — tylko widok (§7.10 poprawione). Przestawienie żetonu
  przez MG w teście: `TokenDocument#move` z punktem „displace”; `update({action})` liczy się jako marsz, który
  zatrzymuje się na ścianach i na cudzych żetonach.
- **Grafika dronów:** żetony z góry i portrety od MG (`Podrecznik/Bestiariusz`) jako WEBP w `tokens/` i nowym
  `tokens/portraits/<id>.webp` — builder bierze portret z modułu przed folderem świata (dron nie ma folderu z Roll20).
  Skale 0,96 i 0,72 z pomiaru kadru.
- **Quench 4× szybszy:** okno wyników Quencha przerysowywało się przy każdym teście, a z tysiącem wyników karta
  zwalniała z każdą paczką — późne testy (drony, rekonwalescencja) dostawały timeout, kolejne przebiegi bez F5 trwały
  coraz dłużej. `tests/runner.mjs` ukrywa okno na czas przebiegu: cały Quench 136 s → 33 s, bez narastania.

**2026-10-10 — E8b zrobione (obraz kamery).** `actors/drony-obraz.mjs`: tryb wizji **„Kamera drona”** na stałe na
żetonie drona (U16 — szablony, każdy nowy żeton, tryb bazowy w `items/vision-sources.mjs`) i **analogowy kanał FPV**
jako filtr ekranu u operatora w trybie zdalnym (D34): ograniczone pasmo (luminancja wąsko, kolor szeroko), przeplot,
lekki śnieg, winieta; z jakością sygnału więcej śniegu → zanik koloru → rwanie → toczenie z paskiem synchronizacji →
sam szum. Sam szum przy FAILSAFE, dronie Oślepionym (awaria 8 — sesja trwa) i Wyłączonym (po 1,5 s wyjście). Quench
`drony` 60, e2e `dron` ze zrzutami przy pełnym sygnale, w połowie i na ¾ zasięgu oraz z dronem oślepionym; cały Quench
1029/1029. Dalej E8c — OSD z czcionką Betaflight.

- **Rozstrzygnięcia z wdrożenia (do weta MG):**
  - *Cały wygląd kamery w filtrze ekranu, nie w shaderze tła trybu wizji* — wniosek ze spike'u E0 doprowadzony do
    końca: shader tła maluje tylko wnętrze wielokąta wizji (18 m), więc w oświetlonej scenie „gorsze oko” urywałoby
    się na granicy zasięgu. „Kamera drona” to więc kopia rdzennego Widzenia w ciemności (zasięg, kolor w świetle,
    czerń i biel w ciemności — D38); MG, który sam kontroluje żeton drona, widzi tylko to, bez kanału FPV.
  - *Wyłączony dron gaśnie w szum, wyjście po 1,5 s* (jak FAILSAFE) zamiast natychmiastowego cięcia.
  - *Bez przełącznika ruchu* dla toczenia i rwania: to odczyt sygnału, nie ozdoba. Gdyby przy stole przeszkadzało —
    ustawienie użytkownika, domyślnie włączone.
- **Tryb bazowy wizji** (`registerBaseVisionMode`): synchronizacja wizji przy każdym postawieniu żetonu wracała do
  „basic”, gdy żadne urządzenie nie było włączone — zdjęłaby kamerę z każdego drona. Urządzenie (np. termowizor
  zamontowany na dronie) nadal wygrywa z trybem bazowym.
- **Szum bez wzoru:** prosty hash GLSL dawał na pełnym szumie powtarzalną jodełkę (widać na zrzucie); hash bez sinusa
  (Hoskins) i ziarno rozciągnięte w poziomie jak pasmo analogu.

*(dalej etapy dopisują tu rozstrzygnięcia z wdrożenia, jak w `PLAN_m1_walka.md` §11)*
