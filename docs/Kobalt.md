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

Zasięgi światła latarek są znacznie mniejsze niż w podręczniku — **do 1/3** wartości z RAW: 45 m
jasne → 15 m, 180 m słabe → 60 m. Kąty stożka (45°/90°) zostają bez zmian — zmienia się tylko
zasięg, nie szerokość snopu światła.

✅ *Zaimplementowane — działa razem z przełącznikiem Kobaltu: wyłączenie go w Ustawieniach
świata przywraca latarkom pełny zasięg z podręcznika.*

## Dopisywanie nowej zasady

Każda nowa zasada Kobaltu jako osobny nagłówek `###`, w miarę możności:

- co dokładnie się zmienia względem RAW (jeśli jest punkt odniesienia w podręczniku),
- status wdrożenia w module (✅ / 🚧),
- jeśli mechanika jest nieoczywista (progi, wzory, wyjątki) — dopisz je od razu, nie zakładaj,
  że ktoś je "po prostu wie".

Techniczny plan wdrożenia (jak to jest/będzie spięte w kodzie, jedno ustawienie świata
`Kolor Kobaltu` czytane w kilku miejscach) — zobacz [`PLAN_kobalt.md`](../PLAN_kobalt.md).
