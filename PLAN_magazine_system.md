# Plan: System Zapasowych Magazynków

> Dokument projektowy — pisz tutaj, implementuj w `scripts/actors/magazine-inventory.mjs`  
> Uzupełnienie do `PLAN_cover_fire_modes.md` i `ARCHITECTURE.md`

---

## 1. Kontekst

W Neuroshimie amunicja w broni jest **quantum** — ładunek "pojawia się" przy strzale.  
Przeładowanie to osobna czynność, wymagająca **fizycznych** zapasowych magazynków
lub szybkoładowarek. To sekcja **Zapasowe Magazynki** w inventory BG.

---

## 2. Typy magazynków

| ID | Typ PL | `system.type.subtype` | Ikona | Cena | Waga | Dla broni |
|----|--------|----------------------|-------|------|------|-----------|
| `short` | Krótki (pistoletowy) | `magazine-short` | `magazines/mag_handgun` | 10 gb | 0.12 kg | `palnaKrotka`, pistoletowe kaliber `martialR` |
| `medium` | Pośredni (MP/śrutowy) | `magazine-medium` | `magazines/mag_machine_pistol` | 15 gb | 0.18 kg | `palnaPosr`, śrutowe `martialR` |
| `long` | Długi (karabinowy) | `magazine-long` | `magazines/mag_assault_rifle` | 20 gb | 0.24 kg | `palnaDluga`, karabinowe `martialR` |
| `heavy` | Ciężki (taśma/bęben) | `magazine-heavy` | `magazines/mag_machine_gun_belt` | 40 gb | 0.80 kg | `palnaCiezka`, .50 BMG `martialR` |
| `quiver` | Kołczan | `magazine-quiver` | `magazines/quiver` | 5 gb | 0.10 kg | łuki, kusze (`Miotana`) |
| `speedloader` | Szybkoładowarka Rew. | `magazine-speedloader` | `magazines/speedloader` | 8 gb | 0.06 kg | rewolwery (właściwość `beb`) |

**Ceny i wagi są sugestywne — edytowalne na karcie przedmiotu.**

---

## 3. Model danych

### 3.1 Item — magazynek (consumable)

```
item.type                                       === "consumable"
item.system.type.value                          === "ammo"
item.system.type.subtype                        starts with "magazine-"  
  (e.g. "magazine-short", "magazine-speedloader")

item.system.quantity                            = łączna liczba posiadanych
item.flags["neuroshima-2026-overrides"].ready   = liczba gotowych/załadowanych (0 … quantity)
```

Pole `ready` nie jest w dnd5e schema → przechowywane w flagach modułu.

### 3.2 Weapon — pola odczytywane przy przeładowaniu

```
weapon.system.uses.value          = naboje aktualnie w broni
weapon.system.uses.max            = pojemność magazynka broni
weapon.system.properties          = Set<string> — obecność "beb" lub "wmag"
weapon.system.type.value          = typ broni (palnaKrotka / martialR / itd.)
weapon.flags["neuroshima-2026-overrides"].mag.ammoType  = id kalibru (np. "9mm")
```

---

## 4. Mapowanie: typ broni → typ magazynka

Funkcja `getMagTypeForWeapon(weapon)` wykonuje kroki po kolei:

### Krok 1 — właściwości wewnętrzne (najwyższy priorytet)

| Właściwość | Wynik |
|-----------|-------|
| `wmag` w `system.properties` | `null` — wbudowany magazynek, brak zewnętrznego |
| `beb` w `system.properties` | `"speedloader"` — rewolwer |

### Krok 2 — Neuroshima weapon type

| `system.type.value` | Wynik |
|---------------------|-------|
| `palnaKrotka` | `"short"` |
| `palnaPosr` | `"medium"` |
| `palnaDluga` | `"long"` |
| `palnaCiezka` | `"heavy"` |
| `biala` | `null` |
| `miotana` | `"quiver"` |
| `specjalna` | `null` |
| `natural` | `null` |

### Krok 3 — `martialR` (fallback przez kaliber)

Odczytaj `weapon.flags["neuroshima-2026-overrides"].mag.ammoType`, sprawdź `AMMO_CALIBER_MAP[id].category`:

| Kategoria kalibru (z ammo-data.mjs) | Wynik |
|-------------------------------------|-------|
| `"Pistoletowa"` | `"short"` |
| `"Karabinowa"` (id ≠ `"50bmg"`) | `"long"` |
| `"Karabinowa"` (id = `"50bmg"`) | `"heavy"` |
| `"Śrutowa"` | `"medium"` |
| `"Miotana"` | `"quiver"` |
| `"Granatnikowa"` | `null` |

### Krok 4 — ostateczny fallback

Brak kalibru lub nieznana kategoria → `"short"` (pistoletowy, najbardziej powszechny).

---

## 5. Algorytm przeładowania (`reloadWeapon`)

```
reloadWeapon(weapon, actor):

  // 1. Sprawdź czy broń w ogóle potrzebuje magazynka
  magType = getMagTypeForWeapon(weapon)
  if magType === null → komunikat "Ta broń nie używa wymiennych magazynków"

  // 2. Szukaj pasującego magazynka z gotowym
  magazineItem = actor.items.find(
    i.type === "consumable"
    && i.system.type.value === "ammo"
    && i.system.type.subtype === "magazine-" + magType
    && i.flags["neuroshima-2026-overrides"].ready > 0
  )
  if !magazineItem → disabled + tooltip "Brak gotowych [typ] magazynków"

  // 3. Szukaj amunicji pasującego kalibru
  caliberNeeded = weapon.flags["neuroshima-2026-overrides"]?.mag?.ammoType
  ammoItem = caliberNeeded 
    ? actor.items.find(i.type==="consumable" && i.system.type.subtype === caliberNeeded)
    : null

  // 4. Oblicz ile naładować
  pojemnosc = weapon.system.uses.max
  obecneNaboje = weapon.system.uses.value
  wolneMiejsce = pojemnosc - obecneNaboje
  dostepnaAmunicja = ammoItem?.system.quantity ?? 0
  do_zaladowania = min(wolneMiejsce, dostepnaAmunicja)
  
  if do_zaladowania <= 0 → disabled + tooltip "Brak amunicji [kaliber]"

  // 5. Transakcja (sequential updates)
  await weapon.update({
    "system.uses.value": obecneNaboje + do_zaladowania
  })
  if ammoItem:
    await ammoItem.update({
      "system.quantity": dostepnaAmunicja - do_zaladowania
    })
  const newReady = magazineItem.flags["neuroshima-2026-overrides"].ready - 1
  await magazineItem.update({
    "flags.neuroshima-2026-overrides.ready": newReady
  })
```

**Uwaga:** Przeładowanie zawsze zużywa 1 gotowy magazynek — niezależnie ile naboi
było w broni przed przeładowaniem (zasada "stary mag spada na ziemię").

### 5.1 Post-walka: reset gotowych

Po zakończeniu walki (`combatEnd` hook) wszystkie magazynki dostają `ready = quantity`
(zakłada się, że poza walką gracz ma czas napełnić wszystkie).  
Można to wyłączyć flagą `flags["neuroshima-2026-overrides"].noAutoRestock = true` na itemie.

---

## 6. UI: Sekcja "Zapasowe Magazynki"

Sekcja jest wstrzykiwana **ponad** sekcją Amunicja przez ten sam hook `renderActorSheet`.
Wyświetla się tylko jeśli aktor ma ≥ 1 item spełniający filtr magazynka.

### 6.1 Kolumny

| Kolumna | Źródło danych | Szerokość |
|---------|--------------|-----------|
| Ikona + Nazwa | icon (SVG) + item.name | flex: 1 |
| Cena | item.system.price.value | stała |
| Waga | item.system.weight.value | stała |
| Ilość (± qty) | item.system.quantity | stała |
| Gotowych (± ready) | flags.ready | stała |
| Usuń | przycisk 🗑 | stała |

**Ilość** — standard `system.quantity`, ± buttons.  
**Gotowych** — `flags.ready`, ograniczone do [0, quantity]. Dedykowane ± buttons.  
Nie pokazuj "Gotowych" dla quivera — tam kołczan = 1 sztuka, ilość = ilość.

### 6.2 Footer sekcji

```
[DODAJ MAGAZYNEK  (flex-grow)]   [Cena: X gb | Waga: Y kg]
```

### 6.3 Kolory

Identyczne jak sekcja Amunicja (te same pre-kompensowane wartości po filtrze sepia):

| Element | Source hex (before filter) | Visual hex (after filter) |
|---------|---------------------------|--------------------------|
| Header BG | `#471d24` | `#38171b` |
| Item row BG | `#252830` | `#1e1f24` |
| Text | `#cacdd5` | `#b9b7b6` |
| Icon fill | `#9f9275` | `#8e8166` |

---

## 7. "DODAJ MAGAZYNEK" — dialog

Analogiczny do "DODAJ AMUNICJĘ". Pola:
1. **Typ** — dropdown: Krótki / Pośredni / Długi / Ciężki / Kołczan / Szybkoładowarka
2. **Ilość** — number input
3. **Gotowych** — number input, domyślnie = Ilość

Po potwierdzeniu tworzy item na aktorze:
```js
actor.createEmbeddedDocuments("Item", [{
  name: MAG_TYPE_LABELS[type],   // np. "Krótki magazynek"
  type: "consumable",
  img: `modules/neuroshima-2026-overrides/icons/magazines/${MAG_ICONS[type]}.svg`,
  system: {
    type: { value: "ammo", subtype: "magazine-" + type },
    quantity: qty,
    price: { value: MAG_PRICES[type], denomination: "gb" },
    weight: { value: MAG_WEIGHTS[type] }
  },
  flags: {
    "neuroshima-2026-overrides": { ready: gotowych }
  }
}])
```

---

## 8. Pliki do implementacji

| Plik | Zmiany |
|------|--------|
| `scripts/actors/magazine-inventory.mjs` | **NOWY** — logika sekcji + wstrzykiwanie UI |
| `scripts/actors/ammo-inventory.mjs` | Wyodrębnić `FILTER_MAG = subtype.startsWith("magazine-")` do odfiltrowania magazynków z sekcji Amunicja |
| `scripts/config/weapons.mjs` | Dodać `getMagTypeForWeapon()` jako export |
| `scripts/config/ammo-data.mjs` | Dodać `CALIBER_TO_MAG_TYPE` lookup lub użyć `category` |
| `scripts/main.js` | `import { registerMagazineInventory } from './actors/magazine-inventory.mjs'` + call w `ready` |
| `styles/neuroshima.css` | Dodać `.neuro-magazine-list` (analogiczne reguły jak `.neuro-ammo-list`) |
| `lang/pl.json` | Dodać etykiety magazynków |

---

## 9. Ikony — status

| Ikona | Plik | Status |
|-------|------|--------|
| Krótki magazynek (pistolet) | `icons/magazines/mag_handgun.svg` | ✅ gotowe |
| Pośredni magazynek (MP) | `icons/magazines/mag_machine_pistol.svg` | ✅ gotowe |
| Długi magazynek (karabin) | `icons/magazines/mag_assault_rifle.svg` | ✅ gotowe |
| Ciężki (taśma/bęben) | `icons/magazines/mag_machine_gun_belt.svg` | ✅ gotowe |
| Kołczan | `icons/magazines/quiver.svg` | ✅ gotowe |
| Szybkoładowarka rew. | `icons/magazines/speedloader.svg` | ❌ **POTRZEBNA** |

### 9.1 Generowanie speedloader.svg

1. Przygotuj nowy spritesheet lub pojedynczy tile 345×345 px (standard gridu)  
   na czarnym tle, biały rysunek szybkoładowarki rewolwerowej (HK Speed Loader look)
2. Uruchom `process_grid_12.py` (lub single-tile variant, patrz niżej)
3. Skopiuj `speedloader.svg` do `icons/magazines/`

**Polecany prompt do generowania obrazu:**  
> "Top-down silhouette icon of a revolver speed loader (HKS style, 6-round cylinder),  
> white on pure black background, minimal line art, centered in frame, no shadows, no gradients"

---

## 10. Odroczone / poza zakresem

- Celownik/aiming nie jest tutaj
- Animacja przeładowania (dźwięk) — osobny plan
- UI na karcie broni (licznik "gotowych mag") — osobny plan
- Granaty jako "magazynki jednorazowe" — może być rozszerzenie kołczanu
- `noAutoRestock` flag per-item — zachowane dla przyszłości
