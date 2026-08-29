# Czym różni się od standardowego dnd5e

Przegląd na wysokim poziomie — co moduł zmienia w bazowym systemie `dnd5e` i dlaczego. To
orientacja, nie pełna specyfikacja: dla dokładnych szczegółów każdej mechaniki (skrypty, hooki,
decyzje projektowe) zobacz deweloperski [`IMPLEMENTATION.md`](../IMPLEMENTATION.md).

## Terminologia i cechy

Nazwy cech, jednostki, waluta i skróty są podmienione na Neuroshimowe wprost w interfejsie:
SIŁ/ZRC/KON/INT/MDR/CHA zamiast STR/DEX/CON/INT/WIS/CHA, TT zamiast AC, PW zamiast HP, KW zamiast
HD, waluta w Gamble (gb), ruch w metrach/kilometrach, limit poziomu 12. Rzucanie zaklęć,
honor/rozsądek (HON/SAN) i inne elementy niezwiązane z Neuroshimą są usunięte z interfejsu.

## Umiejętności i narzędzia

18 umiejętności Neuroshimy (z poprawnie przypisanymi cechami, np. Medycyna=INT, Pojazdy=MDR) i 22
zestawy narzędzi zastępują standardową listę dnd5e.

## Obrażenia i walka

11 typów obrażeń (m.in. Wybuchowe zamiast Force/Necrotic/Thunder). System **Stopnia Zranienia**
(0–4) zastępuje/dopełnia standardowe zasady śmierci: automatyczne nadanie przy spadku PW do 0 lub
przy trafieniu krytycznym, kary do prędkości/reakcji/akcji dodatkowych rosnące ze stopniem,
możliwość śmierci przy skumulowaniu Krytycznego Stopnia. Widoczne jako stan na pionku, efekt na
karcie i pasek na karcie BN.

## Klasy i profesje

6 klas z własnymi tabelami progresji, 18 profesji (subklas), 133 zdolności klasowe/profesji z
tekstem przeniesionym z podręcznika. Punkty Wytrzymałości liczone wg wzoru Neuroshimy, nie
standardowego Hit Dice dnd5e. Zdolności stanowe jak Berserk mają pełną automatykę (Active
Effects, warunki przerwania, karty czatu).

## Ekwipunek

- **Broń** — 74 pozycje w kompendium, właściwości (cicha, przeciwpancerna, itd.) filtrowane per
  typ broni z tooltipami; część egzekwowana mechanicznie.
- **Pancerze** — lekki/średni/ciężki + wspomagany, próg obrażeń, odporność kinetyczna, kary za
  brak wyszkolenia i za zbyt niską Siłę.
- **Ulepszenia broni (addony)** — system wpinany na przedmiot broni.
- **Surowce** — 5 typów materiałów (CH/CE/CZ/MK/MO) z panelem w Ekwipunku.
- **Lekarstwa** — osobna kategoria Używek z tabelą cen/dostępności z podręcznika i mechaniką
  dawkowania.

## Stany, choroby i zagrożenia (przetrwanie)

- **Choroby i fobie** — panel na karcie postaci (zakładka Biografia), 8 chorób przewlekłych + 4
  popularne, 8 fobii — z automatyczną częścią mechaniczną (Active Effects) tam, gdzie tekst
  podręcznika da się jednoznacznie przełożyć na regułę.
- **Krwawienie** (Hemofilia) — wyzwalane obrażeniami ciętymi/kłutymi, rzuty obronne co turę, trzy
  sposoby zatrzymania zgodne z RAW.
- **Spadanie** — obrażenia, powalenie, test przy wejściu do cieczy — czego bazowy dnd5e w ogóle
  nie liczy.
- **Głód, odwodnienie, podpalenie, przemarznięcie** — dzienne zapotrzebowanie z ekwipunku,
  konsekwencje przy braku zaopatrzenia.
- **Odpoczynek i podróż** — polowanie i gotowanie jako aktywności odpoczynku; system podróży
  drużyny z licznikiem czasu.

## Bestiariusz

Kompendium przeciwników (`bestiariusz`) zbudowane z tych samych narzędzi co reszta kompendiów —
własne żetony top-down tam, gdzie są gotowe, w innym wypadku jawnie oznaczone placeholdery (nigdy
kadr portretu z importu Roll20).

## Efekty dźwiękowe i wizualne (opcjonalne, wymagają Sequencera)

Dźwięk pozycyjny broni (zanikanie z odległością, tłumienie przez ściany), muzzle flash i tracer
pocisku dla broni palnej. Działa tylko, gdy zainstalowany jest moduł **Sequencer** — bez niego
moduł działa normalnie, po prostu bez tych efektów.

## Czego świadomie nie ma (jeszcze)

Pojazdy jako pełny typ aktora z systemem pościgów, system craftingu (schematy/produkcja/
szabrowanie), drony. Zobacz `IMPLEMENTATION.md` po aktualny stan — to lista rzeczy poza zakresem
obecnej wersji, nie ukryte błędy.
