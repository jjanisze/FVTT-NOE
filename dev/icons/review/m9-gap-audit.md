# M9 — audyt braków ikon · 2026-11-17

Wygenerowane przez `node dev/icons/audit-m9-icons.mjs`. Podgląd na istniejącym serwerze
`npm run review:icons`: [M9 — braki](m9-audit.html). Pełna lista z dowodami:
[m9-gap-audit.json](../m9-gap-audit.json).

## Wynik

Nie znaleziono potwierdzonego braku nowej sylwetki. 701 glifów sprawdzono
przez raster stage M9: plik istnieje, źródło daje niepustą białą maskę. Brak inicjałowych
placeholderów i zapisanych flag redo. Aktywnych kart generacji: 0.
To kontrola źródeł, nie dowód estetycznej jakości każdej ikony przy 16 px.

**Weryfikacja wizualna znalazła rzeczywistą lukę jakościową:** pozostałości sąsiednich
pól atlasu, linie siatki oraz nadmiar drobnych detali w grupie 16 starszych ikon.
Zainstalowano 17 poprawek. Kropka trucizny i poprawki broni zamknięte zatwierdzonym normalizerem. Brak otwartych zleceń grafiki M9; wdrożenie stylu w Poligonie pozostaje pracą programistyczną. [Tematy, prompty i dostawa](../m9-pass/README.md).
[Przetwarzanie zmian krok po kroku](../m9-pass/PROCESS.md).

Raport M9 zgłasza 0 wystąpień luk w regułach dla
0 różnych ścieżek. Kategorie nakładają się; nie sumować ich jako
zamówienia nowych obrazków.

| Luka z REPORT.md | Ścieżek w kategorii |
| --- | ---: |
| Brak luk przypisania | 0 |

Dwa wpisy to świadome wyjątki: `icons/doll/mannequin.webp` (ilustracja manekina)
i `icons/obiekty/ramka.svg` (natywna dwukolorowa ramka celu na scenie).
Nie zamawiać ich jako białych glifów. Pozostaje 0
ścieżek wymagających doprecyzowania konsumentów / rodzin.

## Rozstrzygnięcia rodzin zatwierdzone przez MG

| Grupa | Zatwierdzone wykończenie | Reguła |
| --- | --- | --- |
| Zdolności BN / towarzyszy | creature, neutralna receptura generic | Osobne tematy klasowe zachowane, gdy glif jest wspólny |
| Pięć wspólnych zdolności klasowych | shared | Neutralne tło zamiast arbitralnego wyboru klasy |
| Sprzęt użytkowy | devices z kolorem tools jako baza | Flagi i ID prototypu rozdzielają medical / chemicals / explosives; czynności mają utility |
| Trzy glify schematów | documents z kolorem salvage | Dokument nie dziedziczy rodziny wytwarzanego przedmiotu |
| Referencje w kodzie | Jawna rola konsumenta | Reguły mają zakres konsumenta; Fanty wynikają z danych tabeli, a operacja nie zmienia rodziny przedmiotu |

Podglądy proponowanych rodzin są wyłącznie CSS z istniejącym masterem. Nie zmieniają
profilu, manifestu, decyzji MG ani plików wydania. Reguły wdrożeniowe muszą pochodzić
z danych przedmiotu / konsumenta, nie z nazwy pliku. Ten sam glif może wymagać osobnych
wykończeń zależnie od źródła; globalne podmienienie ścieżki byłoby błędne.

## Pozostałe prace

- 0 tematów ma status planned;
  782 zatwierdzonych, 782 gotowych eksportów.
  [Decyzja i dokładne piksele](../m9-pass/finish-approval.json).
- 0 masterów dotyka krawędzi. Są w osobnym filtrze podglądu.
  Sprawdzić kadr przy 64/44/32/16 px; nie zamawiać regeneracji na podstawie samego marginesu.
- 215 ścieżek biblioteki nie ma konsumenta w tym skanie. Może je wskazywać
  lookup dynamiczny albo istniejący przedmiot świata; nie oznacza to 215 braków.
- Historyczne odrzucenie statycznej nakładki wody i rezerwowy glif Akcji są resolved.
  Nie otwierać ich ponownie na podstawie samej decyzji reject / pustego pola approve.

## Generacja nowych obrazów, jeśli przegląd ją potwierdzi

W bibliotece wybrać „Review style” i zapisać konkretną uwagę / flagę redo.
Następny wolny batch to 129 według bieżącego MISSING. Wbudowany model obrazu OpenAI,
zgodnie z [Pipeline.md](../Pipeline.md): biała prosta sylwetka, szerokie prześwity,
bez faktury, szumu, cieni i drobnych linii; atlas 3×3, jawna kolejność, wolne końcowe
pola czarne. Znormalizować, sprawdzić 64/32/16 px i wrócić z kandydatami do istniejącej
kolejki. Nie nadpisywać zaakceptowanych masterów przed wyborem kandydata.

## Zakres i ograniczenia

Świeża kompilacja paczek do katalogu tymczasowego; 703 ścieżki
z paczek i literalnych odwołań kodu; katalog i zapisane decyzje przeglądarki.
Nie odczytywano dokumentów kampanii, nie zmieniano paczek ani działających światów.
Dynamiczne ścieżki i przedmioty istniejące wyłącznie w świecie pozostają poza zakresem.

Źródła sprawdzono przy Pillow 12.2.0 / libwebp 1.6.0;
manifest pilota zapisano przy Pillow 12.2.0 / libwebp 1.6.0.
Nie nadpisano pilota innym enkoderem. Podgląd wymaga osobnej oceny w przeglądarce;
generacja strony i walidacja źródeł nie są testem renderowania Foundry.
