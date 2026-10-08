# Testy — architektura i metodyka

Reguły modułu testuje się **wewnątrz Foundry**, przez [Quench](https://github.com/Ethaks/FVTT-Quench).
Ich kontrakty wymagają prawdziwego systemu i dokumentów — powód poniżej.

---

## 1. Dlaczego w przeglądarce, a nie w Node

Prawie każda reguła w tym module jest zdaniem o `CONFIG.DND5E`, o DataModelu dnd5e albo
o dokumencie świata. Żadnej z tych rzeczy nie da się uczciwie zasymulować:

| Próba w Node | Co się psuje |
|---|---|
| `import "./config/weapons.mjs"` | `CONFIG` nie istnieje; mock `CONFIG` testuje mock, nie system |
| walidacja danych przedmiotu | `Item.implementation` to klasa budowana przez Foundry w runtime |
| „czy typ broni jest znany” | odpowiedź zależy od tego, co dnd5e 5.3 zarejestrował na `init` |

Test uruchomiony w prawdziwym świecie odpowiada na pytanie, które faktycznie zadajemy:
*czy po `init` ten moduł i ten system zgadzają się co do faktów.*

`npm test` robi statyczną kontrolę warstwy testowej (§7) i uruchamia pięć testów czystego
planowania oraz pamięci podręcznej grafik pościgu (`npm run test:scenery`). Te ostatnie sprawdzają
katalog tysiąca zasobów, receptury dzielnic, zwalnianie tekstur i anulowanie wczytywania; nie zastępują testów PIXI,
wejścia ani reguł w Foundry. Uruchamia je również statyczny etap bramki wydania.

---

## 2. Jak uruchomić

```js
game.neuroshima.tests.run()          // wszystkie paczki, zwraca podsumowanie
game.neuroshima.tests.run("choroby") // tylko paczki zawierające "choroby" w kluczu
game.neuroshima.tests.list()         // klucze zarejestrowanych paczek
```

Zwracany obiekt: `{ total, passed, failed, durationMs, batches, failures[] }`.
Każda porażka niesie `title` i `error`, więc wynik da się czytać bez patrzenia w UI.

Agent (albo terminal) robi to jednym poleceniem, bez wklejania skryptów przez CDP:
`npm run fvtt -- quench [--filter=choroby] [--reload]` — czeka na `game.ready`, `--reload`
przeładowuje kartę z pominięciem cache'u modułów ES (patrz ramka niżej).

Alternatywnie: przycisk **Quench** w bocznym pasku (zakładka ustawień) — to samo,
tylko z drzewkiem wyników.

> **Po każdej zmianie w `scripts/**` przeładuj świat (F5).**
> Foundry nie unieważnia cache'u modułów ESM. Jeśli edytowałeś plik i testów nie
> widać albo widać stare — wymuś pobranie przed przeładowaniem:
> ```js
> await fetch("/modules/neuroshima-2026-overrides/scripts/tests/index.mjs", { cache: "reload" });
> ```

---

## 3. Co testujemy — sześć warstw

Kolejność od najtańszej i najpewniejszej do najbardziej kruchej.

### Warstwa 1 — tabele danych (najwyższy zwrot)
Czyste struktury: `WEAPONS`, `ARMORS`, `ADDON_DEFS`, `TOOLKITS`, `ALL_DISEASES`, `SZTUCZKI`.
Testujemy **spójność wewnętrzną i domknięcie odwołań**:

- unikalność `id` i nazw,
- każde odwołanie między tabelami rozwiązuje się (`caliber` → `AMMO_CALIBER_MAP`, `requiresAddons` → `ADDON_DEFS`),
- relacje symetryczne są symetryczne (`exclusiveWith` w obie strony — to złapało prawdziwy błąd),
- formuły przechodzą `Roll.validate`,
- ikony istnieją (`fetch` z `HEAD`).

To 80% wartości za 20% wysiłku, bo tabele rosną co sesję i nikt ich nie przegląda w całości.

### Warstwa 2 — kontrakt z `CONFIG.DND5E`
Po `init` moduł przepisał pół systemu. Testujemy, że **nie zostawił sprzeczności**:
klucze umiejętności wskazują na istniejące atrybuty, `weaponTypes` ma pokrycie w
`weaponProficiencies`, właściwości broni są zadeklarowane w `validProperties`,
usunięte stany naprawdę zniknęły, a nazwy stanów są unikalne.

Ta warstwa łapie kolizje po scaleniu dwóch niezależnych nadpisań — klasę błędów,
której nie widać w żadnym pojedynczym pliku.

### Warstwa 3 — niezmienniki reguł
Zdania, które muszą być prawdziwe dla **całej rodziny** danych, a nie dla wpisu:
kary na drabinie chorób nie maleją między stopniami, szybkość nie rośnie,
statusy wyższego stopnia zawierają statusy niższego.

Najcenniejsza warstwa przy pisaniu nowej treści: nowa choroba dostaje audyt za darmo.

### Warstwa 4 — czyste predykaty przez `__testing`
Funkcje decyzyjne bez efektów ubocznych — `canUseBurstMode`, `reloadPlan`,
`requiresManualReloadBeforeUse`. Moduł eksportuje je zamrożonym workiem:

```js
export const __testing = Object.freeze({ canUseBurstMode: _canUseBurstMode, /* … */ });
```

Konwencja: `__testing` na **końcu pliku**, tylko funkcje czyste i stałe progowe.
Nie wystawiaj tam niczego, co pisze do dokumentu — to znak, że test powinien być w warstwie 5.

### Warstwa 5 — dane pochodne na prawdziwym dokumencie
Tworzymy prawdziwego aktora, wieszamy przedmiot, sprawdzamy wynik `prepareDerivedData`.
Najdroższa i najwolniejsza warstwa — używaj, gdy pytanie brzmi „ile wyszło”, a nie „co jest w tabeli”.

### Warstwa 6 — e2e w świecie-piaskownicy (nie Quench)
Wszystko z §4 „czego nie testujemy” — `activity.use()`, kanwa i cele, prawdziwa walka, ścieżki
dostępne tylko graczowi, kliknięcia — ma swoje miejsce tutaj, nie w świecie kampanii:

```sh
npm run fvtt -- e2e                      # wszystkie paczki z dev/e2e/suites/
npm run fvtt -- e2e --suites=combat      # jedna; --keep zostawia świat, --reuse go nie odtwarza
```

Świeży świat `agent-e2e-<data>` na drugiej ścieżce danych (piaskownica, osobny port, obok
kampanii), MG i gracze zalogowani jednocześnie w osobnych kontekstach przeglądarki, fixture
(`dev/e2e/fixtures/`) odtwarzana przed każdą paczką, błędy konsoli każdego klienta i błędy logu
serwera liczą się jak porażka, zrzuty ekranu w `logs/e2e/<przebieg>/` (dowód do obejrzenia, nie
do porównywania pikseli). Zielony przebieg kasuje świat; czerwony zostawia świat i karty do
obejrzenia. Narzędzie i zasady: `dev/agent/README.md`, plan: `PLAN_agentic_improvements.md` §5 D.

Paczka steruje klientami jak człowiek: gracz strzela przez `activity.use()` z dialogami
wyłączonymi (`configure: false`) i kośćmi ustawionymi `CONFIG.Dice.randomUniform` (v14 liczy
`ceil((1 − u) · ścianki)`, więc `u = 0.00001` daje 20), MG nakłada obrażenia tą samą drogą co tacka
dnd5e, granat leci przez prawdziwy przycisk karty i prawdziwe kliknięcie w kanwę (`clickCanvas`).
Każdy krok paczki `combat` to błąd, który wcześniej znalazł MG — i to jest sprawdzone: po
przywróceniu starego haka Zranienia albo natychmiastowego wybuchu granatu paczka robi się czerwona.
Paczka `umieranie` (MG + dwóch graczy) prowadzi zejście do 0 PW, cios wręcz BN w leżącego, rzuty
przeciw śmierci graczy, stabilizację przyciskiem karty w czacie drugiego gracza (przekaźnik MG),
stazę z kompendium, zegar świata i karty „Śmierć” / „BN pada”. Klient gracza klika przycisk karty
i — jak gracz — „Normal” w oknie rzutu dnd5e (`clickCard({ dialog })`). Też sprawdzona mutacjami.
Paczka `rekonwalescencja` (MG + dwóch graczy) przechodzi całą pętlę dwa razy, bez Kobaltu i z nim:
pipki Wyczerpania na karcie, okno Długiego odpoczynku gracza z sekcją Rekonwalescencja (Pomoc medyczna
od drugiego gracza, blokada zajęć u obojga w WKK, ładunek przez przekaźnik MG), karta RO w czacie
właściciela, kalendarzyk z panelu Stan i samoleczenie. Paczka `zagrozenia` to przebieg MG: zaznaczone
żetony i prawdziwy przycisk w kontrolkach, Fuks gracza na rzucie MG (sprawdzony mutacją), „w cieple”
w oknie DO gracza, Uduszenie w prawdziwej walce i „Złap oddech” w panelu Stan.
Paczka `postac` (bramka B6 z `PLAN_beta.md`) buduje postać od zera jak przy stole: MG zakłada pustą
kartę gracza, gracz przeciąga klasę, Pochodzenie i Sztuczkę z kompendiów na kartę (dragenter → dragover
→ drop, jak mysz — dnd5e bierze tryb upuszczenia z dragover) i przechodzi AdvancementManager krok po
kroku. Przy pierwszym przebiegu znalazła dwa błędy: postać startowała z 8/16 PW i z Szybkością 0.
Paczka `combat` strzela też krótką serią z B 93R (Utrudnienie domyślnie, 3 naboje, raz na rundę).

Każdy klient ma w przeglądarce `window.__e2e` (`dev/agent/lib/e2e-page.mjs`), żeby funkcje paczek
(serializowane, bez domknięć) nie przepisywały tych samych pętli: `forceD20([20, 3])` (kolejka ścianek
k20 — koniec z liczeniem `u` na palcach) i `restoreDice()`, `pressRollDialog("normal")`,
`clickDialog({ title }, akcja)` (nigdy okna, które już kliknięto — zamykane okno jeszcze chwilę jest
`rendered`), `clickChat(id, selektor)`, `until(fn)`, `timeout(obietnica, ms)` i `quiet()` (żadnego
zapisu w locie ani animacji kanwy). Między paczkami harness czeka na ciszę u wszystkich klientów i
kończy walki, zanim fixture skasuje scenę. `--trace-writes` zapisuje każdy zapis dokumentu z krótkim
stosem do `logs/e2e/<przebieg>/<paczka>-writes.json` — sonda „kto pisze do martwej sceny” jako flaga.
Jednorazowe sprawdzenie w żywej karcie bez chrome-devtools: `npm run fvtt -- eval --profile=sandbox
--user="Gracz 1" --expr="…"` albo `--file=<skrypt>`.

**Reguła:** zmiana dotykająca UI, kanwy, walki, dialogów albo uprawnień graczy nie jest skończona,
dopóki przebieg warstwy 6 (albo skryptowe sprawdzenie w piaskownicy) tego nie pokaże — ze zrzutem
ekranu w przekazaniu.

---

## 4. Czego **nie** testujemy

Nie z lenistwa — te rzeczy dają testy, które psują się częściej niż kod.

| Obszar | Dlaczego poza zasięgiem |
|---|---|
| `activity.use()` | Otwiera dialog i czeka na człowieka. Test albo zawiśnie, albo zasypie czat wiadomościami. |
| Cokolwiek zależnego od `canvas` / celów | Wymaga aktywnej sceny, żetonów i zaznaczenia — `healWithMedyk`, osłony, `resolveManeuver`. |
| Dialogi i `ApplicationV2` | Testujesz wtedy szablon Handlebars, nie regułę. |
| VFX (Sequencer, JB2A) i dźwięk | Efekt wizualny nie ma asercji; awaria i tak jest widoczna gołym okiem. |
| Hooki reagujące na zmianę HP | Wymagają realnego przepływu aktualizacji i mają wyścigi czasowe. |
| Zawartość kompendiów | Budowane skryptem przy zamkniętym Foundry; testuj **generator**, nie wynik. |

**Reguła:** jeśli test potrzebuje kliknięcia, sceny albo `await` dłuższego niż sekunda —
to nie jest test Quencha. Należy do warstwy 6 (piaskownica), nie do świata kampanii.

---

## 5. Izolacja — obowiązkowa

Testy chodzą w **prawdziwym świecie kampanii**. Zostawiony śmieć to śmieć w sesji.

```js
import { scratchActor, scratchCleanup, stub, captureWarnings } from "./helpers.mjs";
```

- `scratchActor(data)` — prawdziwy aktor z prefiksem `[Quench]`.
- `scratchCleanup()` — kasuje wszystko z prefiksem. **Zawsze w `after()`.**
- `stub(target, key, value)` — podmienia własność przez `Object.defineProperty`,
  zwraca funkcję przywracającą. **Zawsze wołaj ją w `afterEach()`.**
- `captureWarnings()` — przechwytuje `ui.notifications.warn` zamiast zasypywać ekran.

### Dlaczego prawdziwe dokumenty, a nie tymczasowe

W dnd5e 5.3 dokument tymczasowy (`new Actor(data)`) **rzuca wyjątkiem** w `prepareData`:
`new HitDice(this)` czyta `actor.classes`, a `_lazy` inicjalizuje się dopiero po
`_initialize()`. Dokumenty tymczasowe są w tym systemie nieużywalne — stąd `scratchActor`.

### Walki nie da się zrobić naprawdę — w Quenchu

`Combat` z żetonami wymaga sceny (prawdziwa walka: warstwa 6). W Quenchu stan walki podmieniamy:

```js
const restore = stub(game, "combat", { round: 3, turns: [] });
```

---

## 6. Nazewnictwo i struktura

```
scripts/tests/
  helpers.mjs        — narzędzia współdzielone
  runner.mjs         — game.neuroshima.tests.*
  index.mjs          — rejestracja wszystkich paczek
  <obszar>.test.mjs  — jedna paczka na obszar
```

- Klucz paczki **musi** zaczynać się od `neuroshima-2026-overrides.` — inaczej Quench
  odrzuca rejestrację i tylko loguje błąd do konsoli.
- Klucz po kropce i `displayName` — po polsku, jak reszta modułu.
- Jeden plik = jeden obszar danych = jedna paczka.

### Przepis na nową paczkę

1. Utwórz `scripts/tests/<obszar>.test.mjs`:

```js
import { MODULE_ID } from "./helpers.mjs";

export function registerObszarTests(quench) {
  quench.registerBatch(`${MODULE_ID}.obszar`, context => {
    const { describe, it, expect, after } = context;

    describe("Grupa asercji", function () {
      after(() => scratchCleanup());

      it("zdanie po polsku, w czasie teraźniejszym", function () {
        expect(cos, "komunikat wskazujący winowajcę").to.equal(tamto);
      });
    });
  }, { displayName: "Neuroshima: Obszar — o czym to jest" });
}
```

2. Dopisz import i wywołanie w `index.mjs`.
3. `npm test` — sprawdzi, że krok 2 nie został pominięty.
4. F5 w Foundry, `game.neuroshima.tests.run("obszar")`.

### Jak pisać asercje

Drugi argument `expect` to komunikat porażki. **Zawsze wskazuj winowajcę po nazwie** —
`expect(x, \`${weapon.name} → ${weapon.type}\`)`. Test, który mówi tylko
„expected false to be true”, kosztuje pół godziny szukania.

---

## 7. `npm test` — co robi statyczna kontrola

`dev/validate-tests.mjs` łapie trzy klasy błędów, które w przeglądarce są **ciche**:

1. **Paczka niewpięta w `index.mjs`** — plik istnieje, testy nie chodzą, wynik dalej zielony.
2. **Klucz bez prefiksu id modułu** — Quench odrzuca rejestrację, paczka po prostu znika.
3. **Błąd składni** (`node --check`) — najczęściej polski `„` zamknięty prostym `"`.
   To zamyka literał JS w środku zdania. TypeScript w VS Code **tego nie zgłasza**,
   a przeglądarka rzuca `SyntaxError` i cały `index.mjs` nie importuje się wcale —
   znikają wtedy *wszystkie* paczki naraz.

Uruchamiaj przed każdym przeładowaniem świata. Jest natychmiastowy.

---

## 8. Pułapki Quencha

| Objaw | Przyczyna | Rada |
|---|---|---|
| `Cannot read properties of undefined (reading 'querySelector')` | `runBatches` przy niewyrenderowanym oknie Quencha | `runner.mjs` sam robi `quench.app.render(true)` — używaj `tests.run()` |
| `Mocha instance is currently running tests` | mocha zatruta po powyższym wyjątku | **Tylko F5.** `quench.abort()` nie pomaga |
| Nowej paczki nie ma na liście | ESM z cache'u | wymuś `fetch(..., { cache: "reload" })`, potem F5 |

---

## 9. Stan pokrycia

| Paczka | Obszar |
|---|---|
| `konfiguracja` | nadpisania `CONFIG.DND5E`, API modułu |
| `dane-ekwipunku` | broń, amunicja (+ parsowanie RO/obrażeń granatów), pancerze, ulepszenia, zestawy narzędziowe, chemia (leki/narkotyki/używki), gear (placeholdery + REAL_GEAR), Kolczatki, migracja gradacji gearu, tabela assetów VFX wybuchów |
| `choroby` | drabina stopni, efekty, lekarstwa |
| `sztuczki-dane` | tabela Sztuczek, rejestr automatyki, pack |
| `sztuczki-most` | kontrakty nazw między Sztuczkami a kodem, który ich szuka |
| `sztuczki-walka` | predykaty trybów ognia i magazynków |
| `lalka` | lalka (`PLAN_paper_doll.md`): taksonomia slotów, klasyfikacja, `resolve()` (zamiany, wypieranie, pytania, D27, utrata pojemności), zużycie, koszty ruchów, chwyt na ataku, paczki ziemi i `dropsAs`; lejek na prawdziwym aktorze (`equipped` = aktywny, przekierowanie, kopie, partia zapisów) |
| `umieranie` | czyste zasady umierania (`PLAN_m1_walka.md` E0): porażki przy 0 PW, Olbrzymie obrażenia, maks. PW 0, Rzut Przeciw Śmierci, stan maszyny, zagrożenia. Haki i karty — e2e `umieranie` (warstwa 6) |
| `okolicznosci` | silnik okoliczności Testu Ataku (`PLAN_m1_walka.md` E3–E4): zasięg, zwarcie z filtrem „widzi cię”, stany atakującego i celu, Unikanie, Bieganie, kilka celów, źródła z rejestru, automatyczne TK i jego wejście do `resolveHit`. Migawka z żywej sceny i plakietki — e2e `combat` |
| `wyczerpanie` | Wyczerpanie na żywym aktorze (`PLAN_m1_walka.md` E5): lejek zapisu (F15), Długi odpoczynek wg kolejności U14, uporczywe Odwodnienie i jego znacznik, WKK, „w cieple”, zejście z Krytycznego (RAI), złapanie oddechu |
| `rekonwalescencja-dzien` | jeden DO rannego (E6): Gojenie i karta RO, porażka i przerzut, Pomoc medyczna (BN, medyk drużyny w NOE i WKK, pusta torba, brak biegłości), blokada zajęć (D7), samoleczenie, kalendarzyk z żywego aktora (także z chorobą); choroba z dziennym RO — DO bez korzyści, KO odwołany, Zachód słońca z karą za Wyczerpanie i blokadą na dobę gry, migracja dni na sucho. Okno DO i karta w czacie — e2e `rekonwalescencja` |
| `zagrozenia` | zagrożenia (E7): mróz (ST z temperatury, ciepło ubrany, śpiwór, koc), doba bez snu i Fuks, Uduszenie (faza, koniec tury, obrażenia, złapanie oddechu). Narzędzie MG i prawdziwa walka — e2e `zagrozenia` |
| `rekonwalescencja` | czyste zasady powrotu do zdrowia: reguły zdejmowania Wyczerpania (NOE/RAI/WKK), kolejność DO, licznik Regeneracji, szansa RO, kalendarzyk — z tabelą §7.8 planu jako wynikiem oczekiwanym |

Największe niepokryte obszary (kolejni kandydaci): pochodzenia, manewry, zasady
podróży i zapasów, generator bestiariusza. `config/inventory-audit.mjs`
(`auditItemCompleteness`/`auditChemiaIcons`/`auditSurowce`/`auditPirotechnika`/
`auditChemia` i ich `repair*`) skanują `game.actors` na żywo — jak `auditWeapons()`
przed nimi, nie da się ich przetestować bez złamania reguły z §5 (żadnych zmian w
stanie świata, które przetrwają test). Kandydat na Warstwę 4 (`__testing`) gdyby
kiedyś trzeba było je pokryć: wydzielić czyste predykaty dopasowania do katalogu
(`_hasKnownSource` i siostrzane) tak, jak `diffWeaponItem`/`buildWeaponRepairDelta`
zostały wydzielone z `auditWeapons`/`repairWeapons`.
