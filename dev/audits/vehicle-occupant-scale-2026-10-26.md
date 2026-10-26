# Skala jadących — diagnoza 2026-10-26

Status: przyczyna potwierdzona; kod działania i dane pojazdów niezmienione w tym audycie.
MG zaakceptował grafikę motocykla i zgłosił zbyt małe postacie na wszystkich pojazdach.

**Późniejsza decyzja MG, 2026-10-26:** eksperyment 85% zakończony. Przywrócono skale
39 żetonów i 39 prototypów podglądu, sprawdzono wszystkie 63 postacie w trzech scenach.
Indywidualne powiększenia zachowane; podpisy i generatory podglądu poprawione. Pomiary
85% poniżej dokumentują stan z chwili diagnozy. Mechanizm miejsca 0,5 pozostaje niezmieniony.

## Wynik

Wsiadanie wymusza kwadrat 0,5 × 0,5 kratki pojazdu na każdym jadącym. Skala tekstury pozostaje
bez zmian. Na siatce 1,5 m zwykły żeton 1 × 1 po wejściu ma zatem połowę szerokości i wysokości
swojego odpowiednika stojącego obok. Dotyczy to miejsc zakrytych i otwartych, również włazu.

W podglądach 85% zastosowano do skali tekstury **obu** kopii postaci: jadącej i odniesienia.
Wsiadanie nakłada następnie osobny mnożnik 0,5. Względem oryginalnej postaci przed zmniejszeniem
grafiki daje to **0,85 × 0,5 = 42,5%**, a względem stojącego odpowiednika z tego samego podglądu
**50%**. Obrys pojazdu powiększony do 120% nie powiększa miejsc pasażerów.

Wcześniejsze etykiety 85% opisywały ustawienie tekstury, bez uwzględnienia redukcji obrysu.
Nie określały końcowej wielkości obrazu jadącego względem postaci poza pojazdem.

## Potwierdzenie na działającym świecie

Odczyt trzech istniejących scen grafiki w Poligonie: 20 jadących w wariantach Osobówki,
5 w Hammerze i 3 na motocyklach. Wszystkie 28 żetonów ma 0,5 × 0,5, przy zapisanym pierwotnym
rozmiarze 1 × 1. Tekstury zachowują indywidualne skale postaci. Odczyt nie zmieniał scen,
pozycji, grafik, skali ani widoku klienta.

Na aktualnie oglądanej scenie motocykla dwie kopie tego samego obrazu z tą samą skalą tekstury
mają rzeczywiste szerokości siatki obrazu **79,527 px** i **159,054 px** przy tym samym zoomie.
Stosunek wynosi **0,500000**. To pomiar renderowanego obrazu, nie tylko pola dokumentu.

Niezależne odtworzenie w piaskownicy: jeden zwykły żeton 1 × 1, tekstura 0,85, bez dynamicznego
pierścienia; wejście na pierwsze miejsce i wyjście w każdym z 14 katalogowych podwozi.

| Pomiar | Przed wejściem | W pojeździe | Po wyjściu |
|---|---:|---:|---:|
| Obrys dokumentu, kratki | 1 × 1 | 0,5 × 0,5 | 1 × 1 |
| Skala tekstury | 0,85 | 0,85 | 0,85 |
| Siatka obrazu, piksele sceny | 85 × 85 | 42,5 × 42,5 | 85 × 85 |

Identyczny wynik na **14/14**: osobowka, autobus, motocykl, rower, buggy, hammer, ciezarowka,
wozStrazacki, buldozer, czolg, bwp, traktor, motorower, deskorolka. Różnica numeryczna pomiarów
PIXI poniżej 0,001 px. Wyjście przywraca obrys i zachowuje skalę tekstury we wszystkich próbach.
Scena i aktorzy audytu usunięci po badaniu; poprzedni widok piaskownicy przywrócony.

## Łańcuch przyczyny

- `scripts/pojazdy/geometria.mjs`, `ROZMIAR_MIEJSCA = 0.5`: stała z wcześniejszej decyzji D2.
- `scripts/pojazdy/stan.mjs`, `rozmiarMiejsca`: stała razy przelicznik jednostek sceny.
- `scripts/pojazdy/jadacy.mjs`, `posadzGM`: zapisuje oryginalne wymiary we fladze jazdy,
  następnie ustawia `width` i `height` na ten rozmiar miejsca. Nie zmienia `texture.scaleX/Y`.
- Rdzeń `Token._refreshMeshSizeAndScale` i `PrimarySpriteMesh.resize` mnożą wymiary wynikające
  z dokumentu przez skalę tekstury; zmniejszenie obrysu zmniejsza także rysunek.
- `scripts/pojazdy/schowek.mjs`, `naWklejenie`: ponownie wymusza rozmiar miejsca przy przeniesieniu
  pojazdu z obsadą między scenami. Przywracanie zapamiętanej obsady korzysta z `posadzGM`.
- `wysadzGM` przywraca wymiary z flagi; redukcja nie kumuluje się przy kolejnych wejściach.

To wykonanie dotychczasowej D2 i §4.1 planu, sprzeczne z obecną oczekiwaną spójnością skali
postaci. Poprzednie testy sprawdzały obrys 0,5 oraz obecność jadących; taki test nie wykrywa
niezgodności wizualnej z postacią obok.

## Zakres poprawki

Oddzielić geometrię miejsca od rozmiaru prezentowanej postaci. Redukcję grafiki do 85% stosować
jednokrotnie, zachowując indywidualne powiększenia i spójną wielkość obrazu przy wsiadaniu.
Uwzględnić istniejących jadących, przesiadki, schowek i wysiadkę; porównać rzeczywiste wymiary
obrazu z odpowiednikiem poza pojazdem, także po ruchu i obrocie.

Nie wystarczy zmienić `ROZMIAR_MIEJSCA` z 0,5 na 1: ta sama stała określa też szerokość odstępów
w domyślnym `ukladMiejsc`, więc przesunęłaby kotwice starszych grafik. Nie należy również
podwajać skal prototypów postaci — powiększyłoby to ich grafiki po wyjściu. Wybór obrysu
interakcji i renderowania wymaga jawnego rozdzielenia tych dwóch odpowiedzialności.
