# Testy — architektura i metodyka

Moduł testuje się **wewnątrz Foundry**, przez [Quench](https://github.com/Ethaks/FVTT-Quench).
Nie ma runnera node'owego dla logiki i nie będzie — powód poniżej.

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

`npm test` **nie uruchamia** testów — robi statyczną kontrolę warstwy testowej (§7).

---

## 2. Jak uruchomić

```js
game.neuroshima.tests.run()          // wszystkie paczki, zwraca podsumowanie
game.neuroshima.tests.run("choroby") // tylko paczki zawierające "choroby" w kluczu
game.neuroshima.tests.list()         // klucze zarejestrowanych paczek
```

Zwracany obiekt: `{ total, passed, failed, durationMs, batches, failures[] }`.
Każda porażka niesie `title` i `error`, więc wynik da się czytać bez patrzenia w UI.

Alternatywnie: przycisk **Quench** w bocznym pasku (zakładka ustawień) — to samo,
tylko z drzewkiem wyników.

> **Po każdej zmianie w `scripts/**` przeładuj świat (F5).**
> Foundry nie unieważnia cache'u modułów ESM. Jeśli edytowałeś plik i testów nie
> widać albo widać stare — wymuś pobranie przed przeładowaniem:
> ```js
> await fetch("/modules/neuroshima-2026-overrides/scripts/tests/index.mjs", { cache: "reload" });
> ```

---

## 3. Co testujemy — pięć warstw

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
prawdopodobnie testujesz Foundry, a nie nas.

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

### Walki nie da się zrobić naprawdę

`Combat` z żetonami wymaga sceny. Stan walki podmieniamy:

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
| `dane-ekwipunku` | broń, amunicja, pancerze, ulepszenia, zestawy narzędziowe |
| `choroby` | drabina stopni, efekty, lekarstwa |
| `sztuczki-dane` | tabela Sztuczek, rejestr automatyki, pack |
| `sztuczki-most` | kontrakty nazw między Sztuczkami a kodem, który ich szuka |
| `sztuczki-walka` | predykaty trybów ognia i magazynków |

Największe niepokryte obszary (kolejni kandydaci): pochodzenia, manewry, zasady
podróży i zapasów, generator bestiariusza.
