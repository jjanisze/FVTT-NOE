# Ikony stanów — specyfikacja assetów

Dwa stany Neuroshimy nie mają odpowiednika w dnd5e, więc nie mają też ikony do
pożyczenia. W repo leżą **placeholdery** narysowane ręcznie (`upojenie.svg`,
`skazenie.svg`) — działają, ale są prymitywne. Ten plik opisuje, czym je zastąpić.

Pozostałe 22 stany używają ikon dnd5e (`systems/dnd5e/icons/svg/statuses/`) i nie
wymagają żadnej pracy graficznej.

`zranienie-1..4.svg` oraz `wyczerpanie.svg` + `wyczerpanie-1..6.svg` są **generowane** —
nie edytuj ich ręcznie. Powstają z assetów dnd5e, z cyfrą rzymską przemalowaną na kolor
stanu z `scripts/config/state-colors.mjs`. Osobne pliki, bo dnd5e pokazuje poziom wyłącznie
przez podmianę ikony (rdzeń rysuje na żetonie sam `effect.img`), a barwy nie da się podać
z CSS — tekstura idzie do PIXI. Przebudowa: `npm run build:status-icons`.

Do generowanych plików **nie stosuje się poniższa specyfikacja** — dziedziczą geometrię i
kolorystykę po dnd5e (viewBox 1866,7 i kolorowa cyfra), bo mają wyglądać jak jeden zestaw
z resztą ikon systemu. Spec niżej opisuje ikony rysowane od zera.

---

## Format techniczny (twarde wymagania)

| Parametr | Wartość | Dlaczego |
|---|---|---|
| Format | **SVG** | Ikony skalują się od 24 px (HUD pionka) do 64 px (zakładka Efekty). PNG się rozmywa. |
| `width` / `height` | `512` × `512` | Tak samo jak wszystkie ikony dnd5e. |
| `viewBox` | `0 0 512 512` | Kwadratowy, wyśrodkowany. |
| Tło | **przezroczyste** | Żadnego prostokąta tła, żadnej ramki, żadnego koła. FVTT sam rysuje tło i obwódkę przycisku. |
| Wypełnienie | `style="fill: var(--icon-fill, #fff);"` | **Krytyczne.** FVTT przestawia `--icon-fill` zależnie od motywu i stanu przycisku. Zahardkodowany `#fff` da czarną plamę w jasnym motywie. |
| Kolor | **wyłącznie biała sylwetka** | Bez gradientów, bez koloru, bez cieni. Kolor niesie UI, nie ikona. |
| Obrys (`stroke`) | **brak** | Kształt budujemy wypełnieniem, nie kreską — kreska o stałej szerokości zanika przy 24 px. |
| Liczba ścieżek | 1–6 `<path>` | Trzymać nisko; to jest sylwetka, nie ilustracja. |
| Półprzezroczystość | `opacity` na osobnej ścieżce, min. `0.4` | Dopuszczalna dla jednego detalu (np. poziom płynu). Poniżej 0.4 znika na jasnym tle. |

### Szablon

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g style="fill: var(--icon-fill, #fff);">
    <path d="..."/>
  </g>
</svg>
```

---

## Styl (miękkie wymagania)

Wzorzec to zestaw dnd5e — obejrzyj `systems/dnd5e/icons/svg/statuses/burning.svg`
i `poisoned.svg`. Charakterystyka:

- **Ciężka, zwarta sylwetka.** Kształt czytelny po zmrużeniu oczu. Żadnych
  cienkich wąsów ani odstających drobiazgów.
- **Marginesy.** Ok. 30–40 px oddechu od krawędzi `viewBox`; motyw ikonę przycina.
- **Symetria pionowa**, jeśli motyw ją dopuszcza — te ikony oglądane są w rzędzie.
- **Jeden pomysł na ikonę.** Nie łączyć butelki z kieliszkiem i beczką.
- **Estetyka post-apo**: zużyte, prymitywne, „naprawiane taśmą". Bliżej znaku
  ostrzegawczego namalowanego szablonem na blasze niż czystej ikony aplikacji.

---

## Do narysowania

### 1. `upojenie.svg` — Upojenie

**Co to jest.** Stan po alkoholu, 4 stopnie, od chwiejnego kroku po utratę
przytomności. Tabela stopni Upojenia, *Zasady szczegółowe*.

**Co przedstawić.** Butelka. Konkretnie: **przysadzista butelka bimbru** — krótka
gruba szyjka, szerokie ramiona, korek wciśnięty ręcznie (nie kapsel, nie zakrętka).
Nie wino, nie kieliszek, nie kufel.

**Detale mile widziane:**
- płyn wypełniający dolne ~2/3, na osobnej ścieżce z `opacity="0.5"`
- powierzchnia płynu **przechylona** o 10–15° — jedyny sygnał „upojenia" w statycznej ikonie
- opcjonalnie: prosta, krzywo naklejona etykieta jako pojedynczy prostokąt

**Czego unikać:** bąbelków, iskierek, znaku „XXX", czaszki (to nie trucizna —
Zatrucie ma własną ikonę i te dwie muszą być odróżnialne z odległości).

---

### 2. `skazenie.svg` — Skażenie radioaktywne

**Co to jest.** Przebywanie w obszarze skażonym radioaktywnie, 4 poziomy
(Niski / Niebezpieczny / Krytyczny / Zabójczy). *Zasady szczegółowe*, ZAGROŻENIA.

**Co przedstawić.** **Trójlistny znak radiacji** (trefoil) — kanoniczny, natychmiast
czytelny, nie ma sensu wymyślać go od nowa.

**Geometria:** centralny okrąg ~`r=52` w punkcie `256,256`; trzy ostrza rozchodzące
się co 120°, zaczynające się z odstępem od piasty, rozszerzające się ku zewnątrz,
kończące ok. `r=200`.

**Detale mile widziane:**
- ostrza **wyszczerbione lub nadżarte** na zewnętrznej krawędzi — odróżnia to od
  czystego znaku BHP i wpisuje w estetykę pustkowi
- ewentualnie ślady po odpryskach farby wewnątrz ostrzy

**Czego unikać:** otaczającego koła lub trójkąta (kolidują z obwódką przycisku
FVTT), promieni, licznika Geigera, zielonej poświaty (kolor i tak zniknie).

---

## Czego **nie** trzeba rysować

Warianty numerowane (`upojenie-1.svg` … `-4.svg`) — dnd5e robi tak z Wyczerpaniem,
ale ten moduł nakłada numer stopnia jako nakładkę tekstową na przycisku HUD
(`.neuro-condition-level` w `styles/neuroshima.css`). Jedna ikona na stan wystarcza.

---

## Podmiana

Nadpisz plik w `icons/statuses/` tą samą nazwą — ścieżki są zaszyte w
`scripts/config/conditions.mjs` (`registerLevelledConditionConfig`) oraz w
`scripts/actors/levelled-conditions.mjs` (`_buildEffect`), więc nic więcej nie
trzeba zmieniać. Po podmianie: `F5` w FVTT (ikony nie są cache'owane agresywnie).
