# Osobówka — pierwszy komplet (2026-10-22)

Portret: `tokens/portraits/pojazd-osobowka.webp` (1024×1024, RGB).
Żeton z dachem: `tokens/pojazdy/osobowka.webp` (450×900, RGBA).
Żeton wnętrza: `tokens/pojazdy/wnetrza/osobowka.webp` (450×900, RGBA).

MG zaakceptował portret oraz geometrię wnętrza i zgodność obu stanów v3. Zlecona poprawka v4
usuwa środkową parę kół i uwydatnia właściwe cztery. Para jest podpięta w kanonicznych plikach
i kompendium Pojazdy. Przed kolejnym pojazdem pozostaje podgląd w FVTT i wybór skali przez MG.

Źródła PNG: `in/portrety/osobowka.png`, `in/pojazdy/osobowka.png`, `in/wnetrza/osobowka.png`.
Pełne prompty: [pierwsze próby](osobowka-prompts.json), [geometria v3](geometry-first/prompts.json),
[końcowe poprawki kół](final-prompts.json). Narzędzie: wbudowany generator obrazów OpenAI.
[Podgląd aktualnych plików](review.html) · [Rzut i metoda](geometry-first/README.md).

## Geometria i integracja

Najpierw powstał wymiarowany SVG, potem malarskie wnętrze, a na nim dach. W wersji otwartej
znikają wszystkie szyby i górne słupki. Przód auta jest skierowany w dół; kierownica leży po
prawej stronie obrazu, czyli na lewej burcie auta. Końcowa edycja samych kół została zastosowana
osobno do obu zaakceptowanych stanów, aby zachować meble widoczne przez szyby.
IoU sylwetek wynosi 99,10% dla alfa >128; obrazy nie są identyczne co do piksela poza kabiną.

Nowe środki miejsc, od lewego górnego rogu żetonu: przód x=0,63/0,37, y=0,515;
tył x=0,67/0,50/0,33, y=0,35. Opcjonalne `kolumny` określają odstępy w każdym rzędzie.
Dotychczasowy równomierny rozstaw pozostaje domyślny dla pozostałych pojazdów i własnych grafik.

Nowa Osobówka z kompendium ma parę plików we fladze `pojazd.grafika` i dopasowane `strefy`.
Najazd uprawnionego klienta lokalnie podmienia teksturę na nieprzezroczyste wnętrze; odsunięcie
kursora przywraca dach. Dokument żetonu zachowuje dach. Okno Miejsca pokazuje wnętrze
uprawnionym. Własna grafika i wrak nie dziedziczą wnętrza innego nadwozia; pojazdy bez pary
zachowują dotychczasowe prześwietlenie.

Jadący zachowują zwykłą grafikę i dotychczasowe 0,5 kratki. MG dopuszcza wystawanie postaci
poza kabinę. Nie zmieniono globalnej skali ani nie migrowano istniejących aktorów kampanii.

## Podgląd MG i sprawdzenie

Poligon: **Garaż · Osobówka — grafika i skala**, osobna scena dodana na zlecenie MG,
bez resetowania stanowiska Garaż. Eksperyment 85% zakończono 2026-10-26: wszystkie postacie
i ich prototypy wróciły do pierwotnych skal. A/C — auto 100%; B/D — auto 120%.
Każde ma pięciu pasażerów i odpowiedniki
poza autem; dodatkowy wiersz zawiera stockowych ludzi dnd5e. Prywatny skrypt i zrzuty
z postacią kampanii pozostają w vault, poza publicznym repo. Sondy: `grafika`, `skala-grafiki`.

Walidacja trzech WEBP i kompendium przeszła. `npm test` przeszedł; Quench `pojazdy` 26/26.
E2E `pojazd`: 9 kroków, MG + dwóch graczy, bez błędów konsoli modułu: dach/wnętrze, uprawnienia,
pięciu pasażerów, okno Miejsca, jazda, obrót, awaria i wysiadanie.
Raport i sześć zrzutów: `logs/e2e/2026-10-21T22-08-18/`.
W Poligonie potwierdzono przełączenie wnętrza i widoczność pięciu pasażerów w A/B/C/D.

Odtworzenie: `python dev/art/m4/pack.py --asset portrety/osobowka --asset pojazdy/osobowka --asset wnetrza/osobowka`,
potem `npm run fvtt -- packs --only=pojazdy` dla wybranego profilu.

## Wnioski z prób

- v1 (3/10): za mały otwór, pozostawione szyby/słupki, przesunięte fotele.
- v2: pełny otwór, ale rejestrowanie foteli według pierwotnych szyb ujawniło zbyt dużą pustą kabinę.
- v3: SVG → wnętrze → dach; MG zaakceptował geometrię. Generator pozostawił dodatkowe koła.
- v4: osobne edycje samych kół. Ponowne dodawanie całego dachu przesunęło fotele i zostało
  odrzucone; źródło: `geometry-first/out/roof-on-rejected-seat-shift.png`.
