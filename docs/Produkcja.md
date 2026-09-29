# Produkcja i naprawa

Jak zrobić granat, połatać kurtkę i nie zgubić przy tym gambli. Zasady są z rozdziału
*Produkcja przedmiotów* (NOE s. 144–146), moduł tylko liczy i pilnuje. Wszystko, co robisz przy
warsztacie, trafia na czat — produkcja jest jawna, MG widzi każdy krok i może go poprawić.

## 1. Zakładka Produkcja

Karta postaci ma zakładkę **Produkcja** (młotek, zaraz po Zasobach). Ma ją każdy — kto nic nie
produkuje, po prostu jej nie otwiera. Od góry:

- **Na warsztacie** — Roboty w toku: pasek postępu, ile zostało, ST Testu, gdzie Robota stoi
  i ile waży. Pod nimi lista **Do naprawy**: twoje przedmioty, które same zgłaszają uszkodzenie.
  Liczba Robót świeci też na samej zakładce.
- **⚡ Szybka produkcja** — tylko jeśli masz tę zdolność Speca (rozdz. 7).
- **Surowce** — twoje zapasy w gamblach, bo w gamblach liczą przepisy. Bladszy pasek to surowce
  w puli drużyny (rozdz. 5). Najedź na przepis niżej, a paski pokażą, ile z tego zje.
- **Co umiesz zrobić** — wszystko, do czego masz dostęp, w czterech grupach:
  ✅ gotowe · 🚚 z puli (trzeba coś przenieść) · ⚠ brakuje surowców · ⛔ brak narzędzi albo
  biegłości. Nad listą są filtry: nazwa, narzędzie, źródło dostępu (Proste / Schemat / Wprawa).
- **Wprawa i Schematy** — skąd bierze się twój dostęp.

Czas przy każdym przepisie to czas **dla ciebie** — z twoimi zdolnościami i narzędziami.

## 2. Skąd umiesz coś zrobić

Przepis mówi, *jak* coś zrobić: ST, czas, surowce, narzędzia. Dostęp mówi, *czy* w ogóle umiesz.
Są trzy drogi:

- **Proste** — przedmioty warte do 10 gambli. Wystarczy biegłość w potrzebnych narzędziach.
- **Schemat** — fizyczny przedmiot w Ekwipunku. Da się go kupić, sprzedać, zgubić i zabrać
  trupowi. Kosztuje tyle, co przedmiot, który opisuje. W Ekwipunku ma plakietkę **umiesz** albo
  **brak narzędzi** — najedź, żeby zobaczyć, czego brakuje.
- **Wprawa** — to samo co Schemat, ale w głowie: nie da się jej sprzedać ani oddać. Dostajesz
  ją z profesji Speca (cała tabela profesji) albo od MG jako nagrodę fabularną („noc przy wódce
  z akwizytorem kotłów”).

Narzędzia **nie dają** przepisów. Zestaw rusznikarza mówi, *czym* robisz broń, nie że umiesz ją
zrobić.

## 3. Ile, jak długo, jak trudno

Przepis standardowy każdego przedmiotu wynika ze wzoru:

| | |
|---|---|
| **Surowce** | połowa ceny (w dół), rozłożona na typy logicznie dla przedmiotu |
| **Czas** | wielorazowe: cena × 1 h; jednorazowe (granaty, amunicja, leki): połowa tego |
| **ST Testu** | wartość ≤ 10 → 5 · ≤ 25 → 10 · ≤ 50 → 15 · ≤ 75 → 20 · ≤ 100 → 25 · więcej → 30 |

Przykład: Koktajl Mołotowa (10 gb) — 5 gb surowców, 5 h pracy, ST 5.

Przedmioty za 1 gb (papieros, strzała, nabój .38) robi się **po dwie sztuki**: połowa z 1 gb to
zero, a z niczego nic nie powstaje. Dwa papierosy — 1 gb surowców, 1 h, ST 5.

Czas moduł liczy w minutach i pokazuje jako GG:MM. Na czas i koszt wpływają:

- **Fabrykator** — praca o połowę krótsza,
- **Przydasie** — surowców o połowę mniej,
- **Pochodzenia** — Nano-Tech (elektronika) i „Jeśli ma silnik, to ruszy” (pojazdy) dają
  Ułatwienie na Teście.

Wymóg narzędzi może mieć „i” oraz „lub” (bełty: stolarza **lub** kowala). Narzędzie liczy się,
jeśli masz je przy sobie albo leży tam, gdzie stoi Robota.

**Profesje Speca** mają w podręczniku własne tabele (s. 80–84). Bez Koloru Kobaltu to osobne
przepisy, tylko dla tej profesji, obok standardowego — moduł pokazuje oba, wybierasz przy starcie.
Część wierszy tych tabel jest gorsza od wzoru; lista w [Errata-produkcja.md](Errata-produkcja.md).
Z Kobaltem profesja działa inaczej — rozdz. 9.

## 4. Robota krok po kroku

**Robota** to jedna rzecz w trakcie produkcji albo naprawy. Jest przedmiotem w Ekwipunku tego,
kto ją trzyma: waży, można ją przenieść, a w środku siedzą zamrożone surowce.

1. **Zacznij.** W „Co umiesz zrobić” kliknij **Zacznij**. W oknie wybierasz przepis (jeśli jest
   kilka), **miejsce Roboty** (przy sobie, pojazd, Miejsce) i ewentualnie **podział surowców** —
   suma zostaje ta sama, czat oznaczy zmianę. Surowce schodzą od razu.
2. **Pracuj…** — 1, 2, 4, 10 h, „do końca” albo własny czas (`4`, `2:30`, `90m`). Poza
   odpoczynkiem czas idzie na czat, a MG przesuwa zegar przyciskiem na karcie. Ponad **10 h pracy
   na dobę** moduł ostrzega, ale nie blokuje.
3. **± Korekta** — pomoc spoza systemu. MG rzuca za pomocnika i mówi „dodaj sobie 10%”:
   wpisujesz `+10%`, `+2` (godziny), `-1:30` albo `=50%` (ustaw), z notatką.
4. **Test.** Gdy postęp dojdzie do 100%, Test otwiera się sam temu, kto prowadzi Robotę (przycisk
   **Test** zostaje też na Robocie i na karcie czatu). To Test narzędzi przeciw ST przepisu; Fuks i Forsowanie działają normalnie.
   **Sukces** — przedmiot ląduje tam, gdzie stała Robota. **Porażka** — zaczynasz od nowa,
   surowce zostają w Robocie.
5. **⋯ Więcej** — Test, **Przenieś do…**, **Porzuć** (tylko z Kobaltem, rozdz. 9).

Brakuje ci narzędzia albo biegłości? Przepis jest w grupie ⛔, ale ma przycisk **Mimo braków…**.
Robota dostaje wtedy plakietkę ⚠, a MG decyduje: **Zatwierdź** (zdejmuje ⚠) albo **Zmień ST**.
Braku surowców i braku dostępu nie da się przeklikać — z niczego nic nie powstanie.

## 5. Pula, przenoszenie, Miejsca

Produkujesz **z własnego Ekwipunku** (albo z pojazdu / Miejsca, w którym stoi Robota).
**Pula** drużyny — jej główny pojazd, pojazdy-członkowie i Miejsca — jest tylko źródłem
przenoszenia: przepis w grupie 🚚 mówi „masz to w Ciężarówce”, a okno startu ma przyciski
**przenieś brakujące surowce** i **przenieś zestaw**. Plecaki innych graczy do puli nie należą.

Robota zawsze istnieje w **jednym egzemplarzu** — nie da się jej skopiować ani rozmnożyć.
Przenosisz ją przeciągnięciem na inny arkusz albo przez **⋯ → Przenieś do…**:

- na pojazd albo do Miejsca — kierownik Roboty się nie zmienia,
- na inną postać — ona przejmuje Robotę i pracuje dalej swoim tempem,
- nie masz praw do miejsca, z którego bierzesz — idzie prośba do MG.

**Miejsce** to warsztat albo baza na Roboty, których nikt nie nosi (traktora na plecach nie
uniesiesz). Zakłada je MG przyciskiem **Nowe Miejsce**; arkusz pojazdu i Miejsca pokazuje stojące
tam Roboty. Gdy żetony stoją daleko od siebie, przenoszenie ostrzega o odległości, ale nie jest blokowane.

## 6. Odpoczynek

Okna Krótkiego i Długiego odpoczynku mają sekcję **Zajęcia**:

- **Krótki odpoczynek** — łącznie **1 h** na produkcję, naprawę i czyszczenie broni. Więcej
  pracy przerywa odpoczynek (s. 45–47) — moduł pokazuje to ostrzeżeniem.
- **Długi odpoczynek** — do **10 h** pracy.
- Każda Robota w zasięgu ma pole z czasem, a pasek u góry pokazuje sumę na tle budżetu.
- Godziny naliczają się dopiero, gdy odpoczynek się skończy (anulowany niczego nie zjada).
  Jedna zbiorcza karta na czacie; Testy Robót, które doszły do 100%, otwierają się po niej.

Tylko w Długim odpoczynku:

- **Truciciel** robi porcję **Olejku trującego** (z narzędziami chemika, bez surowców). ST olejku
  to 8 + INT + PB twórcy, zapisane w nazwie. Nakładasz go Akcją Bonusową (aktywność **Nałóż na
  broń**) — na ostrze na jedno trafienie albo na trzy groty; działa minutę. Trafienie wystawia kartę,
  z której MG każe celowi rzucić RO.
- **Pogromca** robi naboje — do PB sztuk, każdy za 1 MK, 1 CZ i 8 CH, bez Testu. Samą broń Pogromcy
  robi się jak zwykłą Robotę: 100 h, 10 MK / 10 CE / 80 CZ, bez Testu.

## 7. Szybka produkcja (Spec)

Osobny mechanizm, specjalnie inny w wyglądzie: żółta „iskra” i ⚡.

- Jeden ładunek, wraca po Krótkim albo Długim odpoczynku. Da się jej użyć **kiedykolwiek** —
  także w eksploracji, bez odpoczynku.
- Przyciskiem ⚡ przy przepisach dodajesz przedmioty do koszyka: łącznie do **25 gb wartości**
  (50 gb od 11. poziomu). Czas: 1 minuta za 1 gb (Fabrykator o połowę).
- Potrzebujesz dostępu, narzędzi i surowców **przy sobie** — z puli najpierw trzeba przenieść.
- **Bez Testu, bez Roboty**: klik — surowce schodzą, przedmioty są w plecaku, czas idzie na czat.

## 8. Naprawa

Naprawa nie wymaga Schematu ani Wprawy — wystarczą narzędzia, zwykle te same, którymi przedmiot
się robi (s. 146). Stopień wybierasz w oknie naprawy; moduł podpowiada domyślny, MG ma ostatnie
słowo.

| Stopień | ST | Koszt (cena przedmiotu) | Czas |
|---|---|---|---|
| Drobnostka | 10 | 10% | 1k4 min |
| Trochę roboty | 15 | 30% | 1k4 h |
| Skomplikowana harówa | 20 | 50% | 2k4 h |

- **Drobnostka** dzieje się od ręki: Test teraz, surowce schodzą tylko przy sukcesie.
- Wyższe stopnie to zwykła Robota — czas jest rzucany przy starcie i widać go od razu.
  Fabrykator i profesja napraw nie skracają.
- **Uszkodzona broń palna** — domyślnie Trochę roboty. **Wyszczerbiona broń biała** — stopień
  wg tego, o ile kości spadła: jeden krok Drobnostka, dwa Trochę roboty, więcej Harówa. Udana
  naprawa przywraca pełną kość.

Skąd otworzyć naprawę: lista **Do naprawy** na zakładce, przycisk **Napraw…** w nagłówku arkusza
przedmiotu (dowolna broń, pancerz, narzędzie — MG decyduje, co da się naprawić) albo przycisk
naprawy w panelu broni.

**Wytrzymałość pancerzy** (opcjonalne, s. 115 — ustawienie świata): trafienie krytyczne obniża TT
noszonego pancerza o 1. Naprawa kosztuje MK — 10% ceny za każdy punkt — i 1 / 5 / 10 h za punkt
(pancerz lekki / średni / ciężki), narzędziami krawca albo kowala.

## 9. Z Kolorem Kobaltu

Kobalt (domyślnie włączony, [Kobalt.md](Kobalt.md)) zmienia trzy rzeczy:

- **Profesja przyspiesza**, zamiast dawać osobne przepisy: przedmiot ze swojej listy robisz
  w 75% czasu, z pełnym zestawem narzędzi profesji — w 50%. Nigdy poniżej 25%, ST najwyżej 25
  (reguła 9).
- **Porzucenie Roboty**: do 10% postępu wracają wszystkie surowce, później połowa. Bez Kobaltu
  Roboty się nie porzuca — tylko kończy (reguła 10).
- **Waga**: Robota waży coraz więcej, od wagi surowców do wagi gotowego przedmiotu; Schemat
  waży 1 g za godzinę produkcji. Bez Kobaltu Robota waży tyle, co jej surowce, a Schemat nic
  (reguła 10).

## 10. Dla MG

- **Wprawa i Schematy → Nadaj Wprawę** — upuść przedmiot, dopisz notatkę. Wprawę odbierasz
  krzyżykiem przy niej.
- **Robota ad hoc** — przedmiot spoza katalogu: podajesz cenę i narzędzia, resztę liczy wzór.
- **Utwórz schemat** — w nagłówku arkusza dowolnego przedmiotu z ceną. Gotowe Schematy wszystkich
  przedmiotów z katalogu są w kompendium **Neuroshima — Schematy** (niewidoczne dla graczy).
- Na Robocie (**⋯**): **Zatwierdź** braki, **Zmień ST**, **Cofnij start** (pełny zwrot surowców).
- Każda karta z czasem pracy ma przycisk **Przesuń czas** — tylko dla MG.
- Konsola: `game.neuroshima.produkcja` — to samo, czego używa zakładka.
