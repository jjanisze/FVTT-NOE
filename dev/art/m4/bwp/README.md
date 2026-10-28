# M2A2 Bradley — dziesiąty komplet (2026-10-27)

**Bryła i układ 3+6 zatwierdzone przez MG.** Poligon → Garaż → Karta prób → **Grafika: M2 Bradley**.
Scena „Garaż · M2 Bradley — załoga i desant” ma portret, pusty dach, puste wnętrze,
pełną obsadę i dziewięć odpowiedników postaci obok. Bradley stoi także na Parkingu.

| Plik | Format |
|---|---|
| `tokens/portraits/pojazd-bwp.webp` | 1024×1024 RGB |
| `tokens/pojazdy/bwp.webp` | 720×1350 RGBA, bezstratny |
| `tokens/pojazdy/wnetrza/bwp.webp` | 720×1350 RGBA, bezstratny |
| `tokens/pojazdy/kadluby/bwp.webp` | 720×1350 RGBA, bez wieży |
| `tokens/pojazdy/wieze/bwp.webp` | 495×627 RGBA, osobna wieża, bezstratna |

Na życzenie MG wybrano konkretny **M2 Bradley, układ M2A2: 3+6**. Jeden kierowca z przodu
po lewej pojazdu (prawa strona obrazu), dwóch członków załogi w koszu wieży, sześciu żołnierzy
z tyłu. Usunięto trzy środkowe miejsca; dwie boczne ławki po trzy są zwrócone do środka.
Kanciasta duża wieża i jej boczny podwójny zasobnik odpowiadają nowemu portretowi.

Katalog zachowuje identyfikator `bwp` i nazwę szablonu „Bojowy wóz piechoty”. Pojemność 9
jest jawnym wyborem WKK dla tego modelu, zastępującym ogólne 12 z NOE. Obrys 2,4×4,5 kratki
to 3,6×6,75 m; widoczna bryła ma **3,385×6,55 m**. Skale grafik postaci pozostają źródłowe.

## Metoda i źródła

Wbudowany generator obrazów OpenAI; [pełne prompty i role referencji](prompts.json).
Nowy portret → autorski [rzut SVG](layout.svg) → malarskie wnętrze → geometryczny
[szkic dachu](closed-guide.py) → dach. Wygenerowana wieża była przesunięta względem kosza:
[kompozytor](compose.py) przesuwa całą górną wieżę o **−25 px w poziomie, +115 px w pionie**,
przedłuża panel tylnego dachu i kopiuje wspólny zewnętrzny kadłub. Fotele pozostają na miejscu.
Prawie nieprzezroczystą alfę środka utwardzono; wygładzone przezroczyste brzegi zachowano.

Referencja bryły: [US Army / DVIDS, zdjęcie 5840047](https://www.dvidshub.net/image/5840047/6-8-cav-executes-halo-focus),
VIRIN 100919-A-PG531-003, public domain; podpis podaje Spc. Christian Davis.
Lokalna kopia `reference-usarmy.jpg`. Portret Hammera służy wyłącznie jako wzorzec stylu.
Układ trzech członków załogi i sześciu desantowanych oraz boczne ławki:
[US Army FM 3-21.8, Appendix D, D-69 i rys. D-6](https://www.utoledo.edu/rotc/pdfs/fm3_21x8.pdf).
Proporcje kadłuba sprawdzono z rysunkiem M2A2 w
[TM 55-2350-252-14 (1992)](https://www.military-references.com/wp-content/uploads/books/ifv/usa/m2_bradley/M2_Bradley_Transport_Guidance_TM-55-2350-252-14_1992.pdf).
To rzut do gry, z uproszczonym wyposażeniem wnętrza.

`portrait-v1.png`, `roof-off-v1.png`, `roof-on-v1.png`, `layout-generic.*` i `model-generic.json`
to odrzucony ogólny BWP sprzed korekty MG; nie są źródłami końcowych grafik.
Właściwe źródła mają w nazwie `bradley`; [model](model.json) oddziela plan od zmierzonych kotwic.

## Integracja i sprawdzenie

Na życzenie MG wieżę wycięto z zatwierdzonego kompletnego żetonu. Obejmuje korpus wieży,
lufę, boczny zasobnik i wyposażenie wieży. Kadłub pod nią odtworzono z roboczych warstw,
farby oryginalnego dachu i pierścienia kosza. [Kompozytor](compose.py) zapisuje oba pliki;
ich złożenie w położeniu spoczynkowym odtwarza zatwierdzony żeton z **0 różnic pikseli**.

`KATALOG_POJAZDOW.bwp.wiezaGrafiki` podaje `kadr: [720,1350]`, `os: [300,790]`,
`wycinek: [81,586,495,627]`. Oś w wycinku wynosi **[219,204]**; nie jest jego środkiem.
Generator kopiuje metadane do `pojazd.grafika.wieza` i dodaje ścieżkę `kadlub`.
`scripts/pojazdy/wieza.mjs` rysuje osobną `PrimarySpriteMesh` ze wspólną transformacją
kadłuba, skalą, kolorem, kryciem, wysokością i widocznością. Drgania silnika prowadzą obie
warstwy razem. Prześwietlenie ukrywa wieżę. Cały pojazd pozostaje jednym dokumentem żetonu.
Pełny obraz służy kartom i jako zastępstwo do czasu załadowania obu warstw. Własny obraz
żetonu i wrak wyłączają warstwę. Odrysowanie i usunięcie sprzątają siatkę bez niszczenia
tekstur współdzielonych przez loader.

[Podgląd warstw i osi z suwakami](layers-review.html) pozwala sprawdzić samą grafikę.
W FVTT wieża na razie obraca się razem z pojazdem. Niezależny kąt, obrót w kierunku celu
przed strzałem i reguły stanowisk należą do D33 po becie.

`KATALOG_POJAZDOW.bwp.strefy` zawiera kotwice dziewięciu siedzisk. Opcjonalne `obroty`
ustawiają przy wsiadaniu i przesiadce desant na 90°/270°, a załogę na 0° względem pojazdu.
Potem jadący może sam się obrócić. Górna wieża znika razem z dachem; wszystkie dziewięć
postaci jest domyślnie zakrytych. Prześwietlenie pokazuje pełne pionki.

- [Walidacja pikselowa](validation.json): wspólna alfa, 0 różnic poza maską górnej zabudowy,
  0 różnic między rozkodowanym WEBP a źródłem native, dziewięć nieprzezroczystych kotwic.
- `npm test` zielony; Quench pojazdów **40/40**. Kompendium piaskownicy przebudowane i zwalidowane.
- Sandbox E2E **garaz-grafika 14/14**, brak błędów konsoli modułu. Raport i 16 zrzutów:
  `logs/e2e/2026-10-27T21-20-59/`, Bradley 13–16. Ruch/obrót dziewięciu miejsc, widok
  obserwatora, przesiadki między burtami a kierowcą, wysiadka, nawigacja, zachowanie edycji i reset.
  Osobna warstwa: animowany skręt, wspólne drgania, odbicie/skala, krycie/barwa/wysokość,
  ukrycie, własny obraz oraz odrysowanie i usunięcie bez pozostawionych siatek.
- Do żywego Poligonu dodano tylko nowy podgląd i Bradleya na Parkingu; zachowano **10 scen
  i 155 wcześniejszych żetonów**. Dane kampanii pozostają poza tą instalacją.
  Aktualizacja warstw objęła trzy istniejące Bradleye, zachowując **11 scen i 173 pozostałe
  żetony**, położenie pojazdów, obsadę oraz skale postaci.

Odtworzenie: `python dev/art/m4/bwp/compose.py`, `python dev/art/m4/gen_catalog.py`,
`python dev/art/m4/pack.py --asset pojazdy/bwp --asset wnetrza/bwp --asset portrety/bwp --asset kadluby/bwp --asset wieze/bwp`,
`python dev/art/m4/bwp/validate.py`. Portret w `in/portrety/bwp.png` jest kopią wybranego
do tej iteracji `portrait-bradley-v1.png`; MG zatwierdził portret, bryłę i wnętrze 2026-10-27.
