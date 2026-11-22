# M9 — grafika kart, przegląd 01

**Finalny wybór tła głównej karty postaci: oryginalny Field kit** — [master i hash](selection.json).
Poniżej historia wcześniejszych prób.

**Historyczny przegląd 01. MG: Workshop zachować; rysunek AI odrzucić.**
[Aktualny przegląd 02 — sześć nowych kierunków + Workshop](r02/index.html).
[Dalszy przegląd 03 — nylon jako preferowany kierunek, cztery warianty](r03/index.html).
[Porównanie z prawdziwą kartą](index.html) · [prompty i pochodzenie](manifest.json).

| Kandydat | Grafika | Zamysł |
| --- | --- | --- |
| A — grafitowa blacha | [WEBP](workshop-v1.webp), [master PNG](sources/workshop-v1.png) | Spokojny panel zużytego sprzętu; mało informacji za nazwą postaci |
| B — rysunek warsztatowy | [WEBP](field-drawing-v1.webp), [master PNG](sources/field-drawing-v1.png) | Więcej tożsamości przez słaby rysunek mechanizmu; motyw po prawej |

Oba obrazy są oryginalnymi generacjami wbudowanego narzędzia `image_gen`, 2172 × 724 px, bez alpha.
WEBP zakodowano bezstratnie przez ffmpeg; bez zmiany kadru, pikseli i wymiarów. Źródłowe PNG są masterami
deweloperskimi, nie assetami wydania. Prompty i hash plików zapisuje manifest.

## Co pokazuje przegląd

Osiem zrzutów w [previews/](previews/manifest.json): obecne 5e, grafit bez grafiki, A/B na zdolnościach,
A/B w ekwipunku i A/B w węższym oknie. Otwierano istniejącą kartę PC w piaskownicy.
Na czas próby dodano tylko style DOM, bez zapisów dokumentów, akcji i zmian mechaniki.
Próba kończy się przywróceniem stanu okna i usunięciem stylu.

Zmieniono warstwę tła, bazową powierzchnię na `#191e23` i wyłączono obecny filtr PC.
Górna grafika: `cover`, środek/góra, wysokość 300 CSS px, opacity 1; maska zachowuje pełną siłę do 36%
wysokości i zanika do 100%. Pozostałe kontrolki, szeryfy, czerwone belki i stare ikony pozostały na zrzutach,
żeby było widać wpływ samego tła. Nie są zatwierdzeniem pozostałej oprawy.

Odtworzenie: `node dev/visual/capture-sheet-art.mjs` w repo modułu, przy gotowej sesji GM i aktorze
przykładowym w istniejącej piaskownicy. Pliki kandydatów są wczytywane z dysku i podawane do przeglądarki
jako data URL na czas próby; wdrożenie dostanie zwykłe ścieżki assetów. Narzędzie nie resetuje Poligonu.

## Historyczna ocena robocza sprzed decyzji MG

A jest spokojnym punktem wyjścia dla wspólnej oprawy kart. B daje mocniejszy motyw, ale jego maszyna
może sugerować pojazd lub warsztat; warto ocenić, czy pasuje również do każdej klasy PC.
Na zrzutach nazwa i kontrolki pozostają czytelne. To ocena wizualna, nie pomiar czytelności.
Kadr 820 px został sprawdzony; nagłówek, miniatury i motyw jasny wymagają dalszych prób po wyborze kierunku.

Nie zmieniono produkcyjnego CSS, motywu świata, pakietów ani zatwierdzonego profilu ikon.
Aktualne decyzje i zasada używania autentycznych źródeł dla formalnych rysunków są w [przeglądzie 02](r02/manifest.json).

## Większy pakiet grafiki M9

Zastąpienie smoka jest pierwszym tematem, nie całym zakresem autorskiej grafiki. [Plan §4.3](../../../PLAN_m9_style.md)
wymienia banery innych kart, tekstury powierzchni, fantazyjne odznaki statystyk, ornamenty/separatory,
stockowe podkłady klas/typów i ilustracje zastępcze. Każda rodzina dostanie decyzję: nowa grafika,
wspólny komponent CSS/SVG albo zachowanie po przeglądzie. Nowe rastry powstają tam, gdzie obraz wnosi
tożsamość lub informację; liczby i stany nadal rysuje interfejs.
