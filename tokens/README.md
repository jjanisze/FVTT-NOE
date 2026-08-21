# Token art — Bestiariusz

## Kolejność źródeł (builder sprawdza od góry)

| # | Źródło | `tokenArtSource` | Stan |
|---|---|---|---|
| 1 | `tokens/<id>.webp` | `own` | **docelowe** — gotowe |
| 2 | `tokens/aliases.json` | `alias` | pożyczone z Data (np. dnd5e) |
| 3 | `tokens/_placeholder/<id>.webp` | `placeholder` | generowana atrapa |
| 4 | portret / `mystery-man` | `portrait` | ostateczność |

**Własna grafika ma najwyższy priorytet celowo.** Pipeline z assetami może wrzucać pliki do
`tokens/` i przy najbliższym buildzie po prostu wygrywają — nie trzeba niczego kasować
z `aliases.json` ani z `_placeholder/`.

Znalezienie czegokolwiek z poziomów 1–3 **odblokowuje obrót** (`lockRotation: false`)
i wyłącza pierścień.

Co wymaga jeszcze pracy — flaga `tokenArtPending` (prawda dla wszystkiego poza `own`):

```js
game.actors.filter(a => a.getFlag("neuroshima-2026-overrides", "bestiary.tokenArtPending"))
```

## Wrzucanie docelowej grafiki

Nazwa pliku = **id istoty** z `scripts/config/bestiary-data.mjs`
(to slug nazwy pliku z `Podrecznik/Bestiariusz/`), rozszerzenie `.webp` (preferowane) lub `.png`.

```
tokens/bit-boys.webp
tokens/juggernaut.webp
tokens/kitchin.webp
```

Po wrzuceniu uruchom `npm run build:bestiary` (Foundry zamknięte). Builder sam wykryje plik —
nie trzeba nic konfigurować.

## Albo: pożycz grafikę zamiast kopiować (`aliases.json`)

`tokens/aliases.json` mapuje id istoty na **ścieżkę względem katalogu Data Foundry'ego**.
Dzięki temu istota może używać grafiki, która już jest w Data, bez kopiowania pliku:

```json
{ "pies-mutek": "systems/dnd5e/tokens/beast/DireWolf.webp" }
```

To nie jest tylko wygoda — **licencja tych żetonów zabrania redystrybucji**
(`systems/dnd5e/tokens/LICENSE`: art Forgotten Adventures, „may not be redistributed or used
outside of Foundry Virtual Tabletop"). Wskazanie ścieżki jest w porządku; skopiowanie pliku
do naszego modułu już nie, gdyby moduł kiedykolwiek wyszedł poza tę maszynę.

Alias **wygrywa** z plikiem w `tokens/`. Kiedy zrobisz własną grafikę dla danej istoty,
usuń jej linijkę z `aliases.json`.

Obecnie zaalias­owane: **21 z 51** istot.

## Co się zmienia, gdy plik się pojawi

| | bez pliku (stan obecny) | z plikiem |
|---|---|---|
| `texture.src` | portret z `worlds/output/characters/` | `modules/neuroshima-2026-overrides/tokens/<id>.webp` |
| `lockRotation` | `true` — portret nie może się obracać | **`false`** — żeton obraca się normalnie |
| `ring.enabled` | `true` — pierścień maskuje portret | `false` — grafika ma własną sylwetkę |
| flaga `tokenArtPending` | `true` | `false` |

Odblokowanie obrotu jest tu sednem: żetony z Roll20 to okrągłe kadry portretu, a FVTT obraca
żetony przy ruchu — do góry nogami są nieczytelne. **Rzut z góry istnieje po to, żeby obrót działał.**

## Wzorzec: `systems/dnd5e/tokens/`

**System dnd5e dostarcza 662 gotowe żetony w rzucie z góry** — w 17 katalogach wg typu istoty.
To jest wzorzec dla tego projektu; nie zgaduj, otwórz i popatrz.

```
C:\Users\archo\AppData\Local\FoundryVTT\Data\systems\dnd5e\tokens\
```

Najbliższe odpowiedniki dla Bestiariusza:

| Nasza istota | Referencja |
|---|---|
| **Bit-Boys** | `humanoid/Goblin.webp` — mały, zdziczały, przygarbiony, pazury w ruchu |
| Bit-Boy Przewodnik | `humanoid/Hobgoblin.webp` |
| Pies Mutek / Pies Bojowy | `beast/DireWolf.webp`, `beast/Wolf.webp` |
| Mrokoszczur / Myślący Szczur | `beast/GiantRat.webp` |
| Gigantyczny Pająk | `beast/GiantSpider.webp` |
| Neogator | `beast/Crocodile.webp`, `beast/Alligator.webp` |
| Neoniedźwiedź | `beast/CaveBear.webp`, `beast/BrownBear.webp` |
| Koń (wszystkie) | `beast/DraftHorse.webp`, `beast/Warhorse.webp` |
| Maszyny (Spawacz, Pająk, Kurczak) | `construct/AnimatedArmor.webp`, `construct/FlyingSword.webp` |
| Kitchin / Techmorwa | `beast/GiantWasp.webp`, `beast/GiantCentipede.webp` |

## Specyfikacja (zmierzona na tych 662 plikach)

- **Rzut z góry** (top-down).
- **Orientacja: głową w DÓŁ (południe).** Tak narysowany jest każdy żeton w dnd5e —
  sprawdzone na Goblin, Bandit, DireWolf, Baboon. `rotation: 0` to spoczynkowa orientacja
  grafiki, Foundry obraca względem niej.
- **Przezroczyste tło** (alfa). Bez ramek i kółek — to dokłada Foundry.
- **Kwadrat 1:1**, **400 px na pole siatki** (patrz tabela).
- **Format:** WEBP RGBA (tak jak dnd5e). PNG działa, ale waży wielokrotnie więcej.
- **Cień**: dnd5e wypala miękki cień w prawo-dół (światło z lewej-góry). 330 z 331 potworów
  dnd5e ma `lockRotation: false`, więc cień **kręci się razem z żetonem** — i środowisko to
  po prostu akceptuje. Jeśli ma ci to przeszkadzać, po prostu nie rysuj cienia; nic się nie zepsuje.
- **Wypełnienie kadru niesie rozmiar istoty.** Mały i Średni mają ten sam żeton 1×1, więc
  dnd5e rozróżnia je tylko tym, jak duża jest postać narysowana w identycznym kadrze
  (przy `scaleX: 1.0`): **Goblin (Mały) 67%**, Bandit (Średni) 88%, Orc (Średni) 99%.
  Docelowe wartości — patrz tabela niżej. Rysowanie wszystkiego na 85% robi z każdej
  istoty Średniaka.

## Rozmiary żetonów w kompendium

Wynikają z rozmiaru istoty w podręczniku; builder ustawia je automatycznie.
Skala 400 px na pole jest przejęta z dnd5e.

| Rozmiar | Pola | Grafika | Wypełnienie | Przykłady |
|---|---|---|---|---|
| Malutki | 0,5 × 0,5 | 200×200 | 60% | Kitchin, Neokot, Techmorwa (malutka) |
| **Mały** | 1 × 1 | 400×400 | **70%** | **Bit-Boys**, Mrokoszczur |
| Średni | 1 × 1 | 400×400 | 90% | Cywil, Gangus Żołnierz, Biodroid |
| Duży | 2 × 2 | 800×800 | 90% | Alahama, Korzec, Neogator |
| Wielki | 3 × 3 | 1200×1200 | 92% | Juggernaut, Neoniedźwiedź, Gigamut |
| Ogromny | 4 × 4 | 1600×1600 | 92% | Megator |

⚠️ **Mały i Średni mają identyczny kadr 400×400 i identyczny żeton 1×1** — różni je wyłącznie
wypełnienie. To jedyne, co odróżnia Bit-Boya od dorosłego człowieka na mapie.

## Atrapy (`_placeholder/`) — 30 z 51

Generowane: `npm run build:token-placeholders` (źródło: `dev/bestiary/bestiary.json`,
więc nie trzeba ich pilnować ręcznie). Mają być **jednoznacznie tymczasowe**, a mimo to
użyteczne w testach:

- **żółto-czarny pas ostrzegawczy + „?"** — nie da się pomylić z gotowym artem
  ani przypadkiem wypuścić na sesję;
- **kolor = kategoria** (L ludzie / M maszyny / U mutanci / P potwory / Z zwierzęta /
  R roje) — kilkanaście żetonów na mapie da się rozróżnić;
- **kod literowy** (`BB` = bit-boys) — konkretna istota;
- **czarny trójkąt na dole = przód.** To jest sedno: obrót żetonu widać natychmiast,
  a właśnie o obrót w tym wszystkim chodzi;
- prawidłowy rozmiar kadru dla footprintu istoty (200/400/800/1200/1600).

Nie kasuj ich po dostarczeniu prawdziwego artu — plik w `tokens/` i tak wygrywa.

## Szablony (`_template/`)

W `tokens/_template/` leżą gotowe podkładki dla każdego rozmiaru — wrzuć jako warstwę
pomocniczą w programie graficznym i rysuj pod nią. Regeneracja: `npm run build:token-templates`.

| Kolor | Znaczenie |
|---|---|
| pomarańczowy kwadrat | kadr = pole siatki |
| **niebieskie koło** | obszar bezpieczny przy obrocie |
| zielone koło | zalecane wypełnienie (85%) |
| **strzałka na DOLE** | **kierunek „przód" przy `rotation: 0` — głowa w dół** |

Niebieskie koło to nie estetyka. Foundry obraca żeton wokół środka, więc rogi kwadratowej
grafiki przy 45° wychodzą poza pole i nachodzą na sąsiednie. Koło wpisane w kwadrat to
jedyny obszar, który przy obrocie zostaje na swoim polu.

## Styl

Wzorcem jest `systems/dnd5e/tokens/` — czytelna sylwetka z góry, wyraźny ciemny kontur,
malarskie cieniowanie, światło z lewej-góry. Post-apo brud i rdza jak najbardziej, ale nie
kosztem czytelności przy 70 px.

Licencja tych żetonów: patrz `systems/dnd5e/tokens/LICENSE`. Można się na nich wzorować
stylistycznie zawsze; przed kopiowaniem plików wprost sprawdź warunki.

Inne darmowe źródła w tym samym stylu: **Forgotten Adventures** (CC BY-NC),
**Devin Night's** darmowe paczki, **Token Stamp 2** (składanie żetonu z własnej grafiki).

⚠️ Nie używaj `worlds/output/characters/*/token.png` — to właśnie te kadry z Roll20,
które wymieniamy.
