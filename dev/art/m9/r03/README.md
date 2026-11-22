# M9 — nylon, przegląd 03

**MG wybrał oryginalny Field kit jako tło głównej karty postaci:** [zapis wyboru i hash](../selection.json).
Cztery późniejsze warianty pozostają niewybranymi alternatywami dla PC. Wcześniejsze „Workshop zachować” pozostaje w mocy.
Ten przegląd dokumentuje wcześniejszą próbę rozwinięcia siatki rip-stop, nylonowej taśmy MOLLE,
wzmocnień i technik szycia.

[Porównanie](index.html) · [pełne prompty, źródła i hashe](manifest.json).

| Wariant | Plik | Cel |
| --- | --- | --- |
| Oryginalny Field kit | [WEBP](../r02/field-kit-v1.webp) | Zachowany punkt odniesienia |
| Rip-stop | [WEBP](ripstop-v1.webp) | Siatka splotu na dużej spokojnej powierzchni, wąskie wykończenie krawędzi |
| MOLLE | [WEBP](molle-v1.webp) | Poziome rzędy taśmy, punkty mocowania i pętle |
| Reinforced | [WEBP](reinforced-v1.webp) | Wyraźny box-X i rygle mocowania pionowej taśmy, podwójny szew |
| Field pouch | [WEBP](field-pouch-v1.webp) | Lamowany narożnik kieszeni, warstwy i ściegi |

Cztery nowe obrazy przygotowano wbudowanym `image_gen`, z oryginalnym PNG Field kit jako referencją.
Mastery: `sources/*.png`. Wszystkie mają 2172 × 724 px. WEBP przez ffmpeg, jakość 90, bez kadrowania,
zmiany rozmiaru ani dalszego retuszu. To obrazy materiału do przeglądu, nie rysunki konstrukcyjne.

15 zrzutów rzeczywistej karty PC: pięć materiałów × zdolności, ekwipunek i zdolności w oknie 820 px.
Na czas próby zmieniono tylko DOM w istniejącej piaskownicy; nie zapisywano dokumentów ani produkcyjnego CSS.
Po zrzutach przywrócono stan okna. Po wyborze wariantu trzeba sprawdzić docelową kompresję, jasny motyw,
inne rodziny kart oraz splot na różnych DPR, żeby uniknąć mory.

Galeria pozwala zestawić wariant z oryginałem i obejrzeć prawą część materiału 1:1.
Odtworzenie zrzutów: `node dev/visual/capture-sheet-art.mjs --round=r03`.
Zasada z przeglądu 02 dotycząca autentycznych źródeł formalnych rysunków pozostaje w mocy.
