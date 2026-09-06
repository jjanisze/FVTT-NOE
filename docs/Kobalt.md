# Kolor Kobaltu

> **Status: żywy dokument.** To jest lista zasad Koloru Kobaltu w tej kampanii ("W Kolorze
> Kobaltu") — rośnie wraz z sesjami. Stan wdrożenia w module (✅/🚧) jest orientacyjny dla
> osób czytających kod; dla graczy liczy się tylko sama zasada.

## Czym jest Kobalt

Podręcznik *Neuroshima Ostatnia Era* opisuje Kolory jako gotowe profile nasilenia zasad, które
MG wybiera na starcie kampanii — m.in. Rdzę, Stal, Rtęć, Chrom. Są to profile **wykluczające się
nawzajem**: gra się w jednym z nich.

**Kobalt nie jest kolejnym takim profilem.** To zestaw domowych poprawek napisany w trakcie
budowy tego modułu na FoundryVTT, tam gdzie okazało się, że jakaś zasada z podręcznika jest
nieprzetestowana albo słabo się sprawdza na wirtualnym stole (śledzenie zasobów, którymi
normalnie zarządza sam gracz przy stole, zasięgi światła liczone "na oko" itd.). Unikalną cechą
Kobaltu jest to, że **da się go dołożyć do dowolnego innego koloru** — nie zastępuje Rdzy, Stali
czy Rtęci, tylko je poprawia.

W tej kampanii Kobalt jest **domyślnie włączony** (zakładamy, że zdecydowana większość stołów
gra z nim), i jest **przełączalny** — Ustawienia świata → moduł Neuroshima → *Kolor Kobaltu*. Jeśli
ktoś woli czystą literę podręcznika, wyłącza go jednym przełącznikiem.

## Zasady

### 1. Pochodnia improwizowana

Broń improwizowana — bez Premii Biegłości, **1k4 obuchowe**, zapalona dodaje **+1 od ognia**.
Rzuca światło na **360°**. Można ją wyprodukować bez żadnych wymagań (bez narzędzi, bez testu) z
czystych surowców **CH** (Chemia) i **MK** (Materiały konstrukcyjne) — patyk i coś łatwopalnego,
skręcone naprędce.

🚧 *Broń i mechanika paliwa działają; samo "wyprodukuj z CH+MK" jako akcja jeszcze nie istnieje —
na razie trzeba dodać przedmiot ręcznie. Pochodnia (obydwa warianty) działa niezależnie od
przełącznika Kobaltu — nie ma sensownego odpowiednika RAW, do którego dałoby się wrócić po
wyłączeniu.*

### 2. Pochodnia smołowa

Tylko do kupienia (nie da się jej wyprodukować). Lżejsza od improwizowanej, pali się dłużej i
świeci odrobinę mocniej. Rzuca światło na **360°**. Ta sama broń co improwizowana: **1k4
obuchowe**, zapalona +1 od ognia.

✅ *Zaimplementowane.*

### 3. Doładowanie paliwa pochodni

Paliwo do dowolnej pochodni (improwizowanej lub smołowej) można doładować, zużywając **1 kg CH**.
1 kg CH to zawsze **pełne doładowanie do 100%**, niezależnie od tego, ile paliwa zostało.

✅ *Zaimplementowane — akcja "Dolej paliwo (1 kg CH)" na karcie pochodni, zdejmuje 1 kg z
posiadanych zapasów CH (może użyć kilku mniejszych stosów naraz, jeśli żaden pojedynczy nie ma
pełnego kilograma) i doładowuje do 100%. Działa też podczas palenia się pochodni — po prostu
liczy czas wypalenia od nowa, od pełnego zbiornika. Nie działa na Wypaloną Pochodnię.*

### 4. Koszt zapalenia

Samo zapalenie pochodni (niezależnie od wariantu) zużywa **10% jej paliwa**, zanim jeszcze
zacznie świecić.

✅ *Zaimplementowane. Obowiązuje zawsze, niezależnie od przełącznika Kobaltu — to podstawowa
mechanika pochodni, nie osobna poprawka.*

### 5. Latarki i pochodnie zamiast czołówek

Czołówki w startowym ekwipunku zastąpione latarkami lub pochodniami — czołówka nie istnieje
jako osobny mechanicznie przedmiot, tylko jako jedna z fizycznych form Latarki.

✅ *Zaimplementowane (dotyczy też już wydanych postaci).*

### 6. Skrócone zasięgi latarek

Zasięgi światła latarek są znacznie mniejsze niż w podręczniku: **45 m jasne → 15 m** (dokładnie
1/3 RAW — sprawdzone w praktyce na mapach silosów, dobrze się skaluje). Słabe światło nie
dziedziczy tej samej proporcji 1/3 (byłoby to 60 m) — **180 m słabe → 22 m** zamiast tego: 60 m
słabego światła zalewało niemal cały poziom naraz na typowej mapie tej kampanii (silosy budowane
jak dungeony), co psuło eksplorację i czyniło bezcelowym każdy przyszły sprzęt o większym
zasięgu. Kąty stożka (45°/90°) zostają bez zmian — zmienia się tylko zasięg, nie szerokość snopu
światła.

✅ *Zaimplementowane — działa razem z przełącznikiem Kobaltu: wyłączenie go w Ustawieniach
świata przywraca latarkom pełny zasięg z podręcznika.*

### 7. Flara

Ręczna raca sygnałowa/oświetleniowa — jeden ruch: rzuć i zapal. Ląduje we wskazanym punkcie i
pali się **czerwonym, mocno migoczącym światłem przez 1 minutę** (jasne 12 m, słabe 24 m — to
dwa razy więcej niż Pochodnia Smołowa), zanim zgaśnie na dobre. Światło blokują ściany jak
każde inne. Nie wymaga żadnej broni. Podręcznik nazywa efekt („flara świecąca przez 1 minutę, ST
15") jako jedno z zastosowań narzędzi Małego Rusznikarza — to jest przedmiot, który ten efekt
faktycznie daje w ręce.

✅ *Zaimplementowane (`items/flara.mjs`) — prawdziwe, samodzielne światło na scenie w punkcie
rzutu (nie tylko opisowy sygnał), niezależne od tego, gdzie potem stanie rzucający.*

### 8. Pistolet na Race i Raca sygnałowa

Jednostrzałowa broń domowa (nie z podręcznika) strzelająca racami sygnałowymi — ten sam kształt
mechaniczny co Samoróbka (Wmag. 1, wymaga ręcznego załadowania po każdym strzale). Główne
zastosowanie to sygnalizacja/oświetlenie punktu trafienia, tak jak Flara powyżej. Trafienie
bezpośrednie w cel: **1k4 od ognia**, cel wykonuje RO Zręczność ST 12 albo zostaje Podpalony (RO
rozstrzyga MG ręcznie, tak jak przy Koktajlu Mołotowa). Raca sygnałowa (amunicja) jest lżejsza i
lata dalej niż ręczna Flara, ale bez samego pistoletu jest bezużyteczna — odwrotnie niż Flara.

✅ *Zaimplementowane (`config/weapons-data.mjs`, `config/ammo-data.mjs`) — bez przełącznika
Kobaltu: to całkowicie nowa treść, nie ma czystej wersji RAW, do której dałoby się wrócić po
wyłączeniu (ta sama logika co przy Pochodni).*

## Dopisywanie nowej zasady

Każda nowa zasada Kobaltu jako osobny nagłówek `###`, w miarę możności:

- co dokładnie się zmienia względem RAW (jeśli jest punkt odniesienia w podręczniku),
- status wdrożenia w module (✅ / 🚧),
- jeśli mechanika jest nieoczywista (progi, wzory, wyjątki) — dopisz je od razu, nie zakładaj,
  że ktoś je "po prostu wie".

Techniczny plan wdrożenia (jak to jest/będzie spięte w kodzie, jedno ustawienie świata
`Kolor Kobaltu` czytane w kilku miejscach) — zobacz [`PLAN_kobalt.md`](../PLAN_kobalt.md).
