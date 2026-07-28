# Plan: System Ulepszeń Broni

> Plik projektowy — implementuj w `scripts/weapons/addons.mjs` i `scripts/actors/addons-inventory.mjs`.  
> Źródło zasad: `Tabele/Bronie/Ulepszenia.md`

> **STATUS: ZAIMPLEMENTOWANE I ZWERYFIKOWANE LIVE** (FVTT 14.361 / dnd5e 5.3, v0.4.0 — 2026-06-18).  
> Wszystkie 5 klas ulepszeń (`direct` / `property` / `conditional` / `activity` / toggle setup) działają
> install/roll/remove odwracalnie. Naostrzenie zgodne z RAW (niszczone przy uszkodzeniu broni — patrz §9).
> Ten plik pozostaje jako dokumentacja architektury; kroki w §11 są wykonane.

---

## 0. Filozofia

- **Nie płyń pod prąd.** dnd5e ma gotowe pola: `system.attack.bonus`, `system.damage.base.bonus`, `system.range.value/long`, `system.properties`. Proste ulepszenia *po prostu modyfikują te pola*.
- **Tagi same z siebie.** `system.properties` wyświetlane są jako chipy w arkuszu broni i w chat cardzie. Ulepszenie dające właściwość (`cicha`, `porazajaca`, `lgt`) pojawia się automatycznie.
- **Zredukuj tarcie.** Kolimator daje +2? Wstrzykujemy +2 do `config.data.bonus` w hooku przed rzutem. Tłumik daje `cicha`? `item.update({"system.properties": [..., "cicha"]})`. Koniec.
- **Ulepszenie = przedmiot w ekwipunku.** Loot item z flagą `ulepszenie: ID`. Instalacja zużywa przedmiot. Deinstalacja zwraca go do inventory.

---

## 1. Typy danych

### 1.1 Loot item — ulepszenie (w ekwipunku)

```
item.type                                               === "loot"
item.name                                               = z tabeli (np. "Kolimator + baterie")
item.system.price.value                                 = cena z tabeli (np. 50)
item.system.weight.value                                = waga (szacunkowa)
item.flags["neuroshima-2026-overrides"].ulepszenie      = ID ulepszenia (np. "kolimator")
```

Ilość `system.quantity` to liczba egzemplarzy. Można mieć 2× tłumik w plecaku.

### 1.2 Weapon item — zainstalowane ulepszenia

```
weapon.flags["neuroshima-2026-overrides"].addons = [
  {
    id: "kolimator",         // ID ulepszenia
    delta: {                 // co zmieniliśmy — potrzebne do przywrócenia
      properties: { added: [], removed: [] },
      attackBonus: 0,        // ile dodano do system.attack.bonus (liczba)
      damageBonus: 0,        // ile dodano do system.damage.base.bonus
      rangeNormal: 0,        // ile dodano do system.range.value (metry)
      rangeLong: 0,          // ile dodano do system.range.long
    }
  },
  ...
]
```

`delta` jest zapisywany przy instalacji i używany do precyzyjnego cofnięcia przy deinstalacji. Nie "zgadujemy" co było — wiemy dokładnie co zmieniliśmy.

---

## 2. Definicje ulepszeń (`scripts/config/addons-data.mjs`)

Statyczny słownik `ADDON_DEFS` — jedno miejsce prawdy dla wszystkich ulepszeń z Ulepszenia.md.

### Schemat definicji

```js
{
  id: string,                  // klucz słownika
  label: string,               // polska nazwa
  category: "biala" | "dystansowa",
  price: number,               // cena w gb
  weight: number,              // waga kg (szacunek)
  requiresProperties: string[], // właściwości które broń musi mieć (np. ["sm"])
  requiresAddons: string[],     // inne ulepszenia które muszą być zainstalowane
  exclusiveWith: string[],      // wzajemnie wykluczające się ID
  usesSMSlot: boolean,          // czy zajmuje slot Szyny Montażowej
  applyMode: ApplyMode,         // patrz §2.2
  // pola specyficzne dla applyMode:
  grantProperties: string[],    // dodaj te właściwości
  removeProperties: string[],   // usuń te właściwości
  attackBonus: number,          // bezpośredni bonus do ataku
  damageBonus: number,          // bezpośredni bonus do obrażeń
  rangeNormalBonus: number,     // bonus do zasięgu normalnego (m)
  rangeLongBonus: number,       // bonus do zasięgu dalekiego (m)
}
```

### ApplyMode enum

| Wartość | Opis |
|---------|------|
| `"direct"` | Modyfikuje pola broni bezpośrednio przy instalacji |
| `"property"` | Dodaje/usuwa właściwości w `system.properties` |
| `"conditional"` | Bonus wstrzykiwany hooko-wowo przy rzucie (zależny od zasięgu/ustawienia) |
| `"flag-only"` | Flaga odczytywana przez inne moduły (jams, degradation) |
| `"activity"` | Dodaje nową Activity do broni (bagnet, granatnik, śrutówka) |

Jedno ulepszenie może mieć wiele trybów (np. SM = `"property"` + `"flag-only"`).

### Pełna tabela ulepszeń

#### Broń biała

| ID | Label | ApplyMode | Efekt | Wymagania | SM |
|----|-------|-----------|-------|-----------|-----|
| `naostrzenie` | Naostrzenie | `direct` | `attackBonus: 1, damageBonus: 1` | sieczna/kłuta | - |
| `dociazone` | Dociążenie | `property` + `flag-only` | add `obalajaca` | obuchowa | - |
| `dozownik` | Dozownik | `flag-only` | hook trucizny | kłuta | - |
| `przekucie` | Przekucie | `property` | add `lgt`, (usuń `two` jeśli obecna) | jednoręczna | - |
| `szoker` | Szoker | `property` | add `porazajaca` | - | - |
| `utwardzenie` | Utwardzenie | `flag-only` | melee-degradation.mjs sprawdza flagę | - | - |
| `wywazone` | Wyważenie | `direct` | `rangeNormalBonus: *2, rangeLongBonus: *2` (double) | rzucana | - |

> **Wyważenie**: zasięgi mnożone ×2, nie addytywne — traktuj jako osobny applyMode `"range-multiply"`.

#### Broń dystansowa

| ID | Label | ApplyMode | Efekt | Wymagania | SM |
|----|-------|-----------|-------|-----------|-----|
| `szyna` | Szyna montażowa | `property` | add `sm` | broń palna | - |
| `bagnet` | Bagnet | `activity` | Aktywność ataku (włócznia statblock) | uchwyt bagnetu | ✓ |
| `uchwyt-bagnetu` | Uchwyt bagnetu | `property` | add `uchwyt_bagnetu` (custom prop) | BPD, BPP | ✓ |
| `celownik-optyczny` | Celownik optyczny | `conditional` | +2 do ataku na dalekim zasięgu | SM | ✓ |
| `kolimator` | Kolimator + baterie | `conditional` | +2 do ataku na normalnym zasięgu | SM | ✓ |
| `celownik-trytowy` | Celownik trytowy | `conditional` | +1 do ataku (gdy brak innych przyrządów) | BPK | - |
| `laserowy-wskaznik` | Laserowy wskaźnik celu | `direct` + `flag-only` | `attackBonus: 1`, hook reweluje pozycję | SM | ✓ |
| `dwojnog` | Dwójnóg | `conditional` + `flag-only` | +1 do ataku (po rozłożeniu) | SM | ✓ |
| `trojnog` | Trójnóg | `conditional` + `flag-only` | +2 do ST serii (po rozłożeniu) | SM | ✓ |
| `chwyt-przedni` | Chwyt przedni | `flag-only` | +1 ST długiej serii | SM | ✓ |
| `kolba-dostawna` | Kolba dostawna | `direct` | `rangeNormalBonus: 9, rangeLongBonus: 18` | BPK, BPP | - |
| `powiekszalnik` | Powiększalnik | `direct` | `rangeNormalBonus: 18, rangeLongBonus: 36` | SM | ✓ |
| `kolba-skladana` | Kolba składana | `flag-only` | toggleable: usuwa `dluga`, -50% range daleki | BPD | - |
| `tlumik` | Tłumik | `property` | add `cicha` | pistolet/kar./karabinek | - |
| `granatnik` | Granatnik podwieszany | `activity` | Aktywność 40mm | SM + BPP/D/C | ✓ |
| `srutowka-podlufowa` | Śrutówka podlufowa | `activity` | Aktywność .12Ga | SM + BPP/D/C | ✓ |
| `noktowizor` | Noktowizor | `flag-only` | vision hook | SM | ✓ |
| `termowizor` | Termowizor | `flag-only` | vision hook | SM | ✓ |
| `latarka` | Latarka + baterie | `flag-only` | token light hook | SM | ✓ |
| `okladziny` | Okładziny uchwytu | `flag-only` | disadvantage na rozbrajanie | - | - |
| `konwersja` | Konwersja komory i lufy | `flag-only` | wywołuje UI zmiany kalibru | broń palna | - |
| `zestaw-sprezyn` | Zestaw sprężyn | `flag-only` | jams.mjs: skip jam roll | broń palna | - |

---

## 3. Instalacja i deinstalacja

### 3.1 `installAddon(weapon, addonItem)` — API

```
1. Sprawdź wymagania (requiresProperties, requiresAddons, exclusiveWith, SM slots)
2. Oblicz delta ze statycznej definicji
3. Wykonaj modyfikacje zgodnie z applyMode:
   - "direct":   item.update({ system.attack.bonus, system.range, ... })
   - "property": item.update({ system.properties: [...nowy set] })
   - "activity": item.createEmbeddedDocuments("Activity", [...])
   - "conditional"/"flag-only": tylko flagi, bez zmian w systemie
4. Zapisz addon do flags.addons (z delta)
5. Zużyj loot item: addonItem.update({ system.quantity: qty - 1 })
   (jeśli qty == 1: addonItem.delete())
6. Chat message: "Zainstalowano [Kolimator] na [H&K G3]"
```

### 3.2 `removeAddon(weapon, addonId)` — API

```
1. Odczytaj delta z flags.addons[id]
2. Cofnij modyfikacje (reverse delta):
   - direct:    system.attack.bonus -= delta.attackBonus, itd.
   - property:  usuń grantedProperties, przywróć removedProperties
   - activity:  activity.delete()
3. Usuń addon z flags.addons
4. Zwróć loot item do inventory: actor.createEmbeddedDocuments("Item", [addonItemData])
5. Chat message: "Odinstalowano [Kolimator] z [H&K G3] → wrócił do ekwipunku"
```

### 3.3 SM slot guard

```js
function countSMAddons(weapon) {
  return (weapon.getFlag(MODULE_ID, "addons") ?? [])
    .filter(a => ADDON_DEFS[a.id]?.usesSMSlot).length;
}

function canInstallSM(weapon, addonDef) {
  if (!addonDef.usesSMSlot) return true;
  const hasSM = weapon.system.properties.has("sm");
  return hasSM && countSMAddons(weapon) < 3;
}
```

---

## 4. UI

### 4.1 Ulepszenie jako przedmiot w inventory

Context menu na loot itemie z `flags.neuroshima.ulepszenie`:
- "Zainstaluj na broni…" → dialog z listą uzbrojenia aktora kompatybilnego z tym ulepszeniem

Kompatybilność: `category` z definicji + `requiresProperties` obecne na broni.

### 4.2 Arkusz broni — sekcja ulepszeń

Hook `renderItemSheet5e` → wstrzyknij `.neuro-addons` block po sekcji properties:

```html
<div class="neuro-addons">
  <h4>Ulepszenia</h4>
  <ul>
    <li data-addon-id="kolimator">
      Kolimator + baterie <span class="addon-effect">+2 TA (normalny)</span>
      <button class="addon-remove" title="Odinstaluj">×</button>
    </li>
  </ul>
  <small>SM: 1/3 slotów</small>
</div>
```

Kliknięcie `×` → wywołuje `removeAddon(weapon, "kolimator")`.

### 4.3 Chat card — tagi ulepszeń

Hook `renderChatMessage` na wiadomościach ataku (identycznie jak ammo/fire-mode hooks):

```
[Kolimator +2] [Tłumik: cicha] [Laserowy: +1]
```

Wyświetlane jako małe tagi pod blokiem ataku.

Implementacja: `message.getAssociatedItem()` → odczytaj `flags.addons` → filtruj tylko widoczne (te z efektem na rzut lub z właściwością).

---

## 5. Bonusy warunkowe (roll-time)

Hook: `dnd5e.preRollAttackV2`

```js
Hooks.on("dnd5e.preRollAttackV2", (config, dialog, message) => {
  const item = config.subject;
  if (item?.type !== "weapon") return;
  
  const addons = item.getFlag(MODULE_ID, "addons") ?? [];
  for (const installed of addons) {
    const def = ADDON_DEFS[installed.id];
    if (!def?.conditionalBonus) continue;
    
    const bonus = resolveConditionalBonus(item, def);
    if (bonus !== 0) config.data.bonus = (config.data.bonus || "") + ` + ${bonus}`;
  }
});
```

`resolveConditionalBonus` odczytuje:
- Odległość do celu (porównuje z `item.system.range.value` / `.long`)
- Stan rozłożenia (dwójnóg/trójnóg — z flagi `flags.neuroshima.setup`)

### Tabela warunkowych bonusów

| Addon | Warunek | Bonus |
|-------|---------|-------|
| `kolimator` | zasięg ≤ normalny | +2 TA |
| `celownik-optyczny` | zasięg > normalny (daleki) | +2 TA |
| `celownik-trytowy` | brak innego przyrządu celowniczego | +1 TA |
| `laserowy-wskaznik` | zawsze | +1 TA (już w attackBonus, nie warunkowy) |
| `dwojnog` | rozłożony (`flags.setup.dwojnog = true`) | +1 TA |
| `trojnog` | rozłożony (`flags.setup.trojnog = true`) | +2 do ST serii |

**Rozłożenie (setup)**: osobny toggle — token HUD button lub macro. Zmienia `flags.neuroshima.setup.dwojnog/trojnog`. Ikona na tokenie żeby było widać.

---

## 6. Integracje z istniejącymi modułami

### 6.1 `jams.mjs`

```js
// W miejscu gdzie decydujemy o zacięciu:
const addons = weapon.getFlag(MODULE_ID, "addons") ?? [];
if (addons.some(a => a.id === "zestaw-sprezyn")) return; // nigdy się nie zacina
```

### 6.2 `melee-degradation.mjs`

```js
// W miejscu sprawdzającym degradację:
const addons = weapon.getFlag(MODULE_ID, "addons") ?? [];
if (addons.some(a => a.id === "utwardzenie")) return; // nie ulega zniszczeniu
```

### 6.3 `fire-modes.mjs` (DS/MS burst ST)

```js
// Podczas rzutu obronnego gracza przy DS/MS:
const addons = weapon.getFlag(MODULE_ID, "addons") ?? [];
const chwytBonus = addons.some(a => a.id === "chwyt-przedni") ? 1 : 0;
const trojnogBonus = (addons.some(a => a.id === "trojnog") && weapon.getFlag(MODULE_ID, "setup")?.trojnog) ? 2 : 0;
```

### 6.4 `ammo.mjs` (Konwersja komory)

`konwersja` addon nie zmienia kalibru automatycznie — otwiera istniejący dialog wyboru kalibru. Addon jest tylko warunkiem czy dialog może się otworzyć. Po wybraniu nowego kalibru, normalna ścieżka `ammo.mjs`.

---

## 7. Aktywności dodawane przez ulepszenia

### 7.1 Bagnet

Instalacja bagnetu dodaje aktywność ataku z parametrami włóczni (1d6 przebijające, zasięg 2m). Typ: standard `attack`, icon: `icons/activities/bagnet.svg`.

```js
await weapon.createEmbeddedDocuments("Activity", [{
  type: "attack",
  name: "Bagnet",
  img: `modules/${MODULE_ID}/icons/activities/bagnet.svg`,
  system: {
    damage: { base: { number: 1, denomination: 6, types: ["piercing"] } },
    range: { value: 2, units: "m" },
  }
}]);
```

Deinstalacja: `weapon.deleteEmbeddedDocuments("Activity", [activityId])` — id zapisany w `delta.activityId`.

### 7.2 Granatnik podwieszany

Aktywność RangedAttackActivity z 40mm granatem, Wmag. 1, zasięg 100m.

### 7.3 Śrutówka podlufowa

Aktywność z .12 Ga, Wmag. 1, zasięg 6/18m.

---

## 8. Kolba składana — stan toggle

Specjalny przypadek — kolba ma dwa stany: złożona / rozłożona.

- Flaga na tokenie/broni: `flags.neuroshima.setup.kolbaSkladana = true/false`
- Przy złożeniu: usuń właściwość `dluga`, zredukuj `range.long` o 50% (zapisz oryginał)
- Przy rozłożeniu: przywróć

Przełącznik: button w sekcji ulepszeń arkusza broni.

---

## 9. Naostrzenie — interakcja z degradacją

`naostrzenie` dodaje `attackBonus: 1, damageBonus: 1` przy instalacji.

RAW: *„+1 do Testów Ataku i obrażeń, **do czasu uszkodzenia broni**."* — bonus trwa
tylko do momentu, gdy broń ulegnie uszkodzeniu.

Kiedy broń biała ulega uszkodzeniu (`melee-degradation.mjs`, pechowa 1 w teście ataku):
- kość obrażeń broni spada (k12→k10→…→1) jak dotychczas,
- jeśli Naostrzenie jest zainstalowane, zostaje **trwale zniszczone** —
  `removeAddon(weapon, "naostrzenie", { refund: false })`. Usuwamy efekt (+1/+1)
  **oraz** sam wpis ulepszenia, **bez zwrotu** przedmiotu do ekwipunku (ostrze zostało
  fizycznie zniszczone razem z ostrzeniem).
- Naprawa broni (`repairWeapon`) przywraca **tylko kość obrażeń**. Naostrzenie nie wraca —
  gracz musi kupić i zainstalować nowe.

> Uwaga: ze względu na powyższe nie ma stanu „stępione/blunted" — Naostrzenie jest albo
> w pełni aktywne, albo go nie ma. (Wcześniejszy pomysł z `blunted` został wycofany jako
> niezgodny z RAW.)


---

## 10. Pliki do stworzenia

```
scripts/weapons/addons.mjs              ← core: ADDON_DEFS, install/remove API, SM guard
scripts/actors/addons-inventory.mjs     ← UI: context menu na loot, sheet injection, chat tags
scripts/config/addons-data.mjs          ← statyczne ADDON_DEFS (importowane przez oba)
```

Rejestracja w `main.mjs`:
```js
import { registerWeaponAddons } from "./weapons/addons.mjs";
import { registerAddonInventoryUI } from "./actors/addons-inventory.mjs";
// w Hooks.once("init"):
registerWeaponAddons();
registerAddonInventoryUI();
```

---

## 11. Kolejność implementacji

1. **Krok 1**: `addons-data.mjs` — statyczna tabela ADDON_DEFS (pełna lista, bezbłędna)
2. **Krok 2**: `addons.mjs` — `installAddon` + `removeAddon` (tylko `direct` i `property` tryby)
3. **Krok 3**: Context menu na loot itemach + dialog wyboru broni
4. **Krok 4**: Sekcja ulepszeń w arkuszu broni (render hook)
5. **Krok 5**: Chat tags przy ataku
6. **Krok 6**: Warunkowe bonusy (`conditional` tryb, roll hook)
7. **Krok 7**: Integracje jams + degradation
8. **Krok 8**: Activities (bagnet, granatnik, śrutówka)
9. **Krok 9**: Edge cases (Kolba składana toggle, Naostrzenie — zniszczenie przy uszkodzeniu broni, Konwersja komory)
