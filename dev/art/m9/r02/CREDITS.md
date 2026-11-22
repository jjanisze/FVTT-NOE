# Pochodzenie grafiki — przegląd 02

Decyzja MG: **Workshop zachować; generowany rysunek warsztatowy z przeglądu 01 odrzucić**.
Formalne rysunki i mapy korzystają z autentycznych źródeł. Nie są przerysowywane przez AI.

| Kandydat | Źródło / autor | Status źródła | Obróbka |
| --- | --- | --- | --- |
| Workshop | Oryginalna generacja `image_gen`, przegląd 01 | Master i prompt w [poprzednim manifeście](../manifest.json) | Plik zachowany bez zmian |
| Field kit | Oryginalna generacja `image_gen` | Prompt i master w [manifeście](manifest.json) | WEBP, bez zmiany kompozycji |
| Roadside | Oryginalna generacja `image_gen` | Prompt i master w manifeście | WEBP, bez zmiany kompozycji |
| Shelter | Oryginalna generacja `image_gen` | Prompt i master w manifeście | WEBP, bez zmiany kompozycji |
| Motor plate | Nikola Tesla, *Electro-magnetic motor*, [US381968](https://patents.google.com/patent/US381968A/en), 1 maja 1888, arkusz 2, fig. 9 | Historyczna publikacja z 1888 r.; domena publiczna w USA. Wygaśnięcie patentu nie jest podstawą tej oceny praw autorskich | Oryginalny skan wyjęty z PDF, kadr fig. 9, jednakowa skala, inwersja do maski, stalowy ton na podłożu Workshop. Oryginalne połączenia, kreskowanie i litery zachowane |
| Survey | U.S. Geological Survey, [Pittsburgh quadrangle](https://digital.libraries.psu.edu/digital/collection/maps1/id/868/), wydanie styczeń 1907, dodruk 1937. Penn State University Libraries, LIAS2072698 | Katalog podaje No Copyright — United States; zob. też [zasady USGS](https://www.usgs.gov/faqs/are-usgs-topographic-maps-copyrighted). Metadata zachowane w `sources/pittsburgh-metadata.json` | Kadr mapy, jednolita skala, inwersja, grafitowy ton i poziome wygaszenie; bez zmiany geografii |
| Steel town | Walker Evans, *Bethlehem houses and steel mill, Pennsylvania*, listopad 1935. Library of Congress, FSA/OWI, `fsa.8c52905`; [opis i status reprodukcji](https://commons.wikimedia.org/wiki/File:Bethlehem_Pa_1935_LOC_fsa_8c52905.jpg) | Opis pliku oznacza pracę rządu federalnego USA / PD-USGov. Skan pobrany z oryginalnego serwisu obrazów Library of Congress | Kadr, jednolita skala, ton monochromatyczny i poziome wygaszenie; bez generatywnego retuszu |

Pliki oryginalne i hashe są w [manifeście](manifest.json). Receptury deterministycznej kompozycji:
[build_art.py](build_art.py), uruchomienie `python dev/art/m9/r02/build_art.py`.
Pillow służy tu do obróbki autentycznych źródeł zgodnie z prośbą MG o filtr i kompozycję.
Do odtworzenia oryginalnego skanu patentu użyto `pypdf`, arkusz 2 / pierwszy obraz strony.
Trzy nowe materiały wygenerowano wbudowanym `image_gen`, nie interfejsem API/CLI.

Wszystkie wyjściowe banery: 2172 × 724 px, WEBP. To kandydaci przeglądu, nie opublikowany motyw.
Zrzuty na karcie: `node dev/visual/capture-sheet-art.mjs --round=r02`.
Katalog przeglądu: `node dev/art/m9/r02/build-review.mjs`.
