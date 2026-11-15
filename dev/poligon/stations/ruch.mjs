/**
 * Ruch (PLAN_m8_ruch_i_ekonomia_akcji §11, stanowisko `ruch`): ekonomia tury M8 — licznik ruchu i A/B/R/I na karcie,
 * linijka z budżetem, deklaracje, Zryw, Szybkie ręce, zmęczenie po Berserku, korekty. Cztery persony, trudny teren bez
 * Tiled (natywne Regiony dnd5e: gruz i schody nachodzące na siebie), walka gotowa, nierozpoczęta.
 *
 * Próby obejmują to, co M8 już robi (E1–E3, E5, E6, E8, części E4 i E7): także krótką serię jako osobną Akcję (B 93R
 * Twardziela), manewr zamiast ataku, korektę próby z karty i szablon paska z paletami Ruch/Więcej. E2 (teren bez Tiled):
 * Kurier z Człowiekiem-pająkiem i Włóczykijem (MG), osobne Schody, Bagno i Region bez przyczyny, preset MG, Alpinista,
 * tryb „Ciągnięcie”, scena w ft.
 */

import { p } from "./_wspolne.mjs";
import { REAL_GEAR, buildRealGearItemData } from "../../modules/neuroshima-2026-overrides/scripts/config/gear-data.mjs";

const G = 100;
const pole = (c, r, w = 1, h = 1) => ({ type: "rectangle", x: c * G, y: r * G, width: w * G, height: h * G, rotation: 0, hole: false });

export default {
  id: "ruch", name: "Ruch", prio: "P1", icon: "fa-solid fa-person-running",
  opis: "Ekonomia tury M8: Twardziel 1 (Gracz 1), Kowboj ze Zrywem (Gracz 2), Gladiator 5 z Berserkiem i Zewem areny (Gracz 3), Spec 5 "
    + "z Szybkimi rękami (Gracz 4), Kurier z Człowiekiem-pająkiem i Włóczykijem Zwiadowca 7 ze Sportowcem i Gladiator z Grenadierem (MG), "
    + "Bit-boy ze stałym skokiem. Gruz, schody na gruzie, osobne schody, "
    + "bagno i teren bez przyczyny — natywne Regiony bez Tiled. Walka gotowa — MG zaczyna.",
  gracze: 4,
  klucz: ["goly"],
  async build(k) {
    const s = await k.scene("ruch", { name: "Ruch · Ekonomia tury", w: 30, h: 20, color: "#4a4636", main: true,
      grid: { distance: 1.5, units: "m" } });
    // B 93R — pistolet z krótką serią (próba `ks-akcja`); reszta karty pusta jak u Gołego.
    const goly = await k.persona("goly", "goly", { owner: "Gracz 1", name: "Twardziel (ruch)",
      loadout: [{ ref: "bron:B 93R", place: "ranged", load: true }] });
    const kowboj = await k.persona("kowboj", "m7-clint", { owner: "Gracz 2", name: "Kowboj (Zryw)" });
    const gladiator = await k.persona("gladiator", "gladiator-5", { owner: "Gracz 3", name: "Gladiator (Berserk, Zew areny)" });
    const spec = await k.persona("spec", "warsztat", { owner: "Gracz 4", name: "Spec (Szybkie ręce)" });
    const ghul = await k.fromPack("ghul", "bestiariusz", "generacja-i-nocny-ghul");
    // Kurier (pokrycie M7): Sztuczka Człowiek-pająk i Włóczykij z Miami — odporności terenu i Alpinista (E2). Sprzęt do
    // wspinaczki w plecaku: z katalogu Zbrojowni (nie z paczki).
    const kurier = await k.persona("kurier", "m7-slang", { name: "Kurier (Człowiek-pająk, Włóczykij)" });
    const zestaw = REAL_GEAR.find(g => g.id === "sprzet_wspinaczkowy");
    if (kurier && zestaw) await kurier.createEmbeddedDocuments("Item", [buildRealGearItemData(zestaw)]);
    // E3: Sportowiec (Zwiadowca 7, MG) i stały skok istoty z cechy (Bit-boy: 6 m / 3 m).
    const sportowiec = await k.persona("sportowiec", "zwiadowca-7-sportowiec", { name: "Zwiadowca 7 (Sportowiec)" });
    const bitboy = await k.fromPack("bitboy", "bestiariusz", "bit-boys");
    // E5: Grenadier (Stalowe jaja [R]) — persona pokrycia M7 z tą Sztuczką (MG).
    const grenadier = await k.persona("grenadier", "m7-lyzeczka", { name: "Gladiator 3 (Grenadier)" });

    await s.createEmbeddedDocuments("Region", [
      { name: "Gruz", color: "#8a6a4a", visibility: CONST.REGION_VISIBILITY.ALWAYS, shapes: [pole(12, 2, 4, 14)],
        behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren (gruz)", system: { magical: false, types: ["rocks"] } }],
        flags: k.flags({ role: "region" }) },
      { name: "Schody na gruzie", color: "#4a7a9a", visibility: CONST.REGION_VISIBILITY.ALWAYS, shapes: [pole(14, 2, 4, 6)],
        behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren (schody)", system: { magical: false, types: ["stairs"] } }],
        flags: k.flags({ role: "region" }) },
      // E2: przyczyny pod odporności Kuriera — same schody, bagno, teren bez przyczyny („inne”).
      { name: "Schody", color: "#6a8aba", visibility: CONST.REGION_VISIBILITY.ALWAYS, shapes: [pole(20, 2, 2, 4)],
        behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren — Schody", system: { magical: false, types: ["stairs"] } }],
        flags: k.flags({ role: "region" }) },
      { name: "Bagno", color: "#5a6a3a", visibility: CONST.REGION_VISIBILITY.ALWAYS, shapes: [pole(20, 13, 4, 4)],
        behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren — Mokradło / bagno", system: { magical: false, types: ["mud"] } }],
        flags: k.flags({ role: "region" }) },
      { name: "Inne (bez przyczyny)", color: "#7a5a7a", visibility: CONST.REGION_VISIBILITY.ALWAYS, shapes: [pole(6, 16, 4, 3)],
        behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren", system: { magical: false, types: [] } }],
        flags: k.flags({ role: "region" }) }
    ]);
    const gracze = [goly, kowboj, gladiator, spec];
    await k.tokens(s, [...gracze.map((a, i) => [a, 3, 3 + i * 4]), [kurier, 3, 18], [sportowiec, 1, 18], [grenadier, 1, 16],
      [ghul, 24, 9, { disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE }], [bitboy, 27, 15, { disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE }]]);
    for (const [i, a] of gracze.entries()) await k.seat(`Gracz ${i + 1}`, a);
    await k.party(gracze);
    await k.combat(s, [...gracze, kurier, sportowiec, grenadier, ghul, bitboy].filter(Boolean));
    return { gracze: gracze.filter(Boolean).map(a => a.name), kurier: kurier?.name ?? null, sportowiec: sportowiec?.name ?? null,
      ghul: ghul?.name ?? null, bitboy: bitboy?.name ?? null };
  },
  proby: [
    p("licznik", "Karta", "Panel Stan w walce: ruch pozostałe/pojemność (np. 9/9 m) i A/B/R/I 1/1 — czytelne, z dymkami źródeł; poza walką z panelu zostaje sam przycisk „Ułóż pasek”",
      "Zacznij walkę, otwórz kartę Twardziela."),
    p("podziel-ruch", "Ruch", "Dwa ruchy po 3 m → 3/9; Ctrl+Z ostatniego → 6/9; Akcja Bonusowa i Bieganie nie cofają się z ruchem (T01)",
      "Gracz 1: dwa przeciągnięcia po 2 pola, potem Ctrl+Z na mapie."),
    p("linijka", "Ruch", "Linijka przy przeciąganiu: zielone pola w puli, czerwone poza nią; etykieta „zostaje X m” / „ponad pulę −X m”; bez żółtego „gdybyś przyspieszył”",
      "Gracz 1: przeciągnij dalej niż 9 m, nie puszczaj."),
    p("przekrocz", "Ruch", "Ruch ponad pulę wykonuje się w całości; licznik ujemny, trwałe ostrzeżenie na karcie, wiadomość u ruszającego; [Skoryguj] dopisuje ruch (T02)",
      "Gracz 1: przeciągnij 12 m i puść; potem Skoryguj → Ruch +3."),
    p("przyspiesz-biegnij", "Akcje", "Przyspiesz: A 0/1 i +Szybkość; Biegnij: A, +2× Szybkość, stan Bieganie (Utrudnienie do ataków); drugi raz — A −1/1 z sygnałem",
      "Gracz 1: Biegnij na karcie, potem Przyspiesz."),
    p("teren", "Teren", "Gruz bez Tiled: pole gruzu kosztuje 3 m; schody nachodzące na gruz nadal 3 m, nie 6 (jedna trudność, NOE s. 26)",
      "Gracz 1: przejdź przez Gruz i przez Schody na gruzie; patrz na linijkę i licznik."),
    p("teren-preset", "Teren", "Regiony → „Trudny teren — preset”: wybór przyczyn NOE (schody, stok, gruz, mokradło, piasek…); narysowany Region dostaje „Trudny teren — Schody”, widoczność MG, a gracz widzi go przy planowaniu ruchu; zaznaczony Region + preset dopisuje przyczynę do tego samego zachowania; „Wyłącz preset” — zwykłe Regiony",
      "MG: warstwa Regionów, przycisk ze zboczem → Schody → Rysuj; narysuj prostokąt. Gracz 1 najeżdża na swój żeton obok. MG: zaznacz Region, preset → Gruz."),
    p("odpornosci", "Teren", "Kurier (Człowiek-pająk, Włóczykij): Schody 1,5 m na pole, Schody na gruzie 3 m (gruz dalej spowalnia), Bagno 1,5 m, „Inne (bez przyczyny)” 3 m; Twardziel — wszędzie 3 m (NOE s. 26, 62, 102)",
      "Tura Kuriera (MG): przejdź przez Schody, Schody na gruzie, Bagno i Inne; patrz na linijkę. Potem Gracz 1 przez Bagno.", "NOE"),
    p("alpinista", "Teren", "Alpinista: Szybkość wspinania Kuriera = Szybkość przy pustych rękach; broń w ręce — wspinanie znika; Sprzęt do wspinaczki w ręce — wraca; w plecaku nie wystarcza (T20)",
      "MG: karta Kuriera, Szybkości; weź broń do ręki, potem schowaj i weź Sprzęt do wspinaczki z plecaka."),
    p("ciagniecie", "Ruch", "Tryb ruchu „Ciągnięcie” (HUD żetonu, obok Czołgania): z pochwyconym ghulem 1,5 m kosztuje 3 m, na gruzie 4,5 m, leżąc na gruzie 6 m (D34); bez pochwyconego — dopłata zostaje",
      "Tura Gladiatora: Manewry → Pochwycenie ghula; HUD żetonu → Ciągnięcie; przeciągnij po zwykłym polu i po Gruzie; Padnij i jeszcze raz.", "WKK"),
    p("jednostki", "Ruch", "Scena w ft: linijka bez koloru z „scena w ft — rozlicz ręcznie”; ruch zapisany, licznik ruchu go nie odejmuje, ostrzeżenie na karcie; z powrotem w m — zwykłe liczenie",
      "MG: konfiguracja sceny → jednostki siatki „ft”; Gracz 1 rusza; MG przywraca „m”."),
    p("padnij-powstan", "Ruch", "Padnij: Powalenie, zjada resztę ruchu (po 3/9 kosztuje 6); Powstań: połowa Szybkości; Bieganie przy Powaleniu — ostrzeżenie, nie blokada (T13)",
      "Gracz 1: rusz 2 pola, Padnij, potem Powstań w następnej turze."),
    p("reakcja", "Reakcja", "Poza swoją turą Biegnij idzie w Reakcji: R 0/1, świeże 18 m (Szybkość 9) bez starej reszty; [Zakończ reakcję] zamyka ruch (D30)",
      "Tura ghula: Gracz 1 klika Biegnij, rusza, potem Zakończ reakcję.", "WKK"),
    p("rana", "Ruch", "Rana po Przyspieszeniu: 3/9 → Przyspiesz → 15/18 → Szybkość −4,5 → 10,5/13,5; odwrotna kolejność 6/9 (D14)",
      "Gracz 1: rusz 2 pola, Przyspiesz, MG nakłada Lekki Stopień Zranienia.", "WKK"),
    p("zryw", "Akcje", "Zryw: najpierw wybór A albo B, potem zużycie; zamknięcie okna niczego nie zużywa; B — pula 1/2, druga [B] bez sygnału (T22)",
      "Tura Kowboja: Zryw → zamknij okno; Zryw → Akcja Bonusowa; dwie [B]."),
    p("szybkie-rece", "Akcje", "Szybkie ręce: +1 A tylko do Używania (w dymku A); przedmiot (medpak, granat) ją bierze, drugi atak — sygnał mimo niej (T23)",
      "Tura Speca: Szybkie ręce, potem dwie akcje przedmiotów."),
    p("berserk", "Akcje", "Berserk kończy się po 10. własnej turze (nie na początku 11.), karta zmęczenia; do końca następnej tury A/B/R/I przekreślone, ruch zostaje (D24)",
      "Tura Gladiatora: Berserk; MG ustawia rundę 10 i kończy turę Gladiatora."),
    p("stalowe-jaja", "Reakcja", "Grenadier poza swoją turą: Reaguj → „Stalowe jaja” (albo paleta Więcej) — R 0/1, ruch 4,5 m tylko w tej reakcji (bez 9 m bazy), A/I nietknięte; karta: bez ataków okazyjnych, podnieś i rzuć ×2; wybuch przenosi MG",
      "Tura ghula (MG): karta Grenadiera → Reaguj → Stalowe jaja; przeciągnij 4 pola (ponad 4,5 m — ostrzeżenie); Zakończ reakcję.", "NOE"),
    p("dobycie-plakietka", "Akcje", "Oporządzenie w walce: klik w broń w kaburze — dobycie bez okna ataku, [I] 0/1; druga taka czynność — Używanie [A]; z plecaka — Akcja (z Pakowaniem — [I]; Siekierezada: dwie siekierki w jednej [I]). Karta użycia medpaka albo zdolności [B] ma plakietkę „Używanie [A]” / „Akcja Bonusowa [B]” z dymkiem (E4)",
      "Tura Twardziela: B 93R do kabury (Oporządzenie), klik w nią; schowaj jeszcze raz; Spec: medpak z Szybkimi rękami — plakietka „— Szybkie ręce”."),
    p("hud", "Korekty", "Znacznik „Reakcja zużyta” zdjęty z HUD-u przez MG zwalnia R jako korekta; historia wydatku zostaje w dymku",
      "Gracz 1 zużywa R; MG zdejmuje znacznik w HUD żetonu."),
    p("slowna", "Korekty", "Akcja tylko słowna: A zostaje 1/1, koniec tury bez kary i bez pytań; [Skoryguj] A +1 zapisuje ją, jeśli stół chce (T42)",
      "Gracz 1: zagraj akcję słownie, zakończ turę."),
    p("skok", "Skok", "[Skok] na karcie: tabela zasięgu (Twardziel SIŁ 15: w dal 4,5 m z rozbiegu, 2,25 m z miejsca); „Tryb Skok na żetonie” niczego nie wydaje; skok kosztuje 1:1, bez dopłaty gruzu pod lotem; dalej niż zasięg albo bez 3 m rozbiegu — ostrzeżenie, ruch zostaje (T15, T18)",
      "Gracz 1: Skok → Tryb Skok; rozbieg 2 pola chodem, potem skok 3 pola nad gruzem; drugi raz z miejsca."),
    p("skok-istoty", "Skok", "Bit-boy: [Skok] (karta BN albo game.neuroshima.skok.okno) — stały skok z cechy „Skok”: w dal 6 m, wzwyż 3 m, bez wzoru SIŁ; skok 7,5 m — ostrzeżenie „ponad zasięg 6 m (stały skok istoty)”, ruch zostaje; zejście z krawędzi nie liczy się jako wysokość skoku",
      "Tura Bit-boya (MG): Tryb Skok, skok 5 pól; potem 3 pola.", "NOE"),
    p("sportowiec", "Skok", "Zwiadowca 7 ze Sportowcem: Szybkość 12 m na karcie (9 + 3); test wspinaczki i pływania z kart modułu — okno z Ułatwieniem i plakietką „Sportowiec”, zwykła Atletyka bez niej; kalkulator skoku: podpowiedź Ułatwienia",
      "Tura Zwiadowcy 7 (MG): karta → Szybkości; HUD żetonu → tryb Wspinanie, przeciągnij 1 pole — karta wspinaczki, rzuć test; zwykły test Atletyki z karty; [Skok]."),
    p("skok-ladowanie", "Skok", "Skok w dal kończący się na gruzie: karta „Akrobatyka ST 10”; porażka — Powalenie, sukces — nic (NOE s. 256)",
      "Gracz 1: skok, który ląduje w Gruzie; w karcie rzuć nisko i wysoko.", "NOE"),
    p("skok-gladiator", "Skok", "Gladiator w Berserku: zasięg ×2 w tabeli; skok na pole ghula — karta MG: RO SIŁ ST 8 + SIŁ + PB, porażka: Powalenie i 1k6 obuchowych za każde pełne 3 m (2,9 m → 0k6); sam skok bez A/B/R (D33)",
      "Tura Gladiatora: Berserk, Tryb Skok, skok na ghula; MG klika RO.", "WKK"),
    p("pomoz", "Pomaganie", "Pomóż → Test: sojusznik i twoja biegłość, test ST 10; sukces — w jego następnym teście tej umiejętności Ułatwienie (plakietka „Pomaganie”), zużyte rzutem; porażka — A przepada. Pomóż → Atak: cel do 1,5 m, Ułatwienie w ataku sojusznika na ten cel (T27)",
      "Gracz 1 pomaga Graczowi 2 w Atletyce; Gracz 2 rzuca Atletykę, potem Akrobatykę. Potem Gracz 1 celuje w ghula i pomaga w ataku."),
    p("wyczekaj-r", "Reakcja", "Wyczekaj (A, notatka opcjonalna) → w turze ghula Reaguj → Wykonaj: R 0/1, potem Biegnij — bez drugiej R, 18 m z tej reakcji; ostrzał w biegnącego z Utrudnieniem; pominięta okazja nic nie kosztuje, nowa tura kończy przygotowanie (T28, D32)",
      "Gracz 1: Wyczekaj „biegnę, gdy ghul ruszy”; MG kończy turę Gracza 1; w turze ghula Gracz 1: Reaguj → Wykonaj, Biegnij, ruch; MG strzela w niego.", "WKK"),
    p("zakoncz-r", "Reakcja", "Przerwana reakcja: [Zakończ reakcję] kończy ją i ochronę; bez kliknięcia kończy ją koniec tury ghula — ochrona nie przechodzi dalej. Przedmiot użyty poza swoją turą liczy R, nie A (T41)",
      "W turze ghula Gracz 4 używa medpaka; Gracz 1 biegnie w R i nie klika Zakończ — MG kończy turę.", "WKK"),
    p("dwa-ataki", "Ataki", "Gladiator 5 (Drugi atak): pierwszy atak — „Sposób ataku: Nowe Atakowanie [A]”, karta „Atakowanie · atak 1 (A)”; ruch; drugi — „Atakowanie — atak 2/2”, bez nowej A; trzeci — nowa A z sygnałem. Zamknięte okno ataku nic nie kosztuje (T30, T37)",
      "Tura Gladiatora: trzy ataki maczetą w ghula, między nimi ruch; raz zamknij okno ataku krzyżykiem."),
    p("zrodla-b", "Ataki", "Pole „Sposób ataku” pokazuje tylko posiadane źródła B; Promocja poza Berserkiem — z ostrzeżeniem, nie domyślna; przycisk [B] pod kartą płaci dopiero przy rzucie; atak poza turą — „W Reakcji [R]” (T33, T41)",
      "Najemnik z Promocją (jeśli jest w obsadzie) albo Gladiator: atak wręcz poza Berserkiem; potem w turze ghula atak okazyjny."),
    p("ks-akcja", "Ataki", "Krótka seria z B 93R: „Sposób ataku” — „Krótka seria [A] — osobna Akcja”; zwykły atak po niej otwiera własne Atakowanie (KS go nie kontynuuje ani nie zamyka); zamknięte okno KS nic nie kosztuje; druga KS w tej rundzie wykonuje się z ostrzeżeniem w oknie, na karcie i w szepcie do MG (T39)",
      "Tura Twardziela (po przebudowie stanowiska): KS w ghula, raz zamknij okno krzyżykiem; strzał zwykły; druga KS."),
    p("manewr", "Ataki", "Manewr zamiast ataku (narzędzia żetonu → Manewry): pole „Sposób ataku”; próba kosztuje przed RO celu, przegrana też; z Drugim atakiem atak maczetą + Wytrącenie to jedna A; przycisk Odepchnięcia z karty Z bara! — „koszt już zapłacony” (T30)",
      "Tura Gladiatora: atak maczetą w ghula, potem Manewry → Wytrącenie; w Berserku Z bara! i przycisk z jej karty."),
    p("korekta-ataku", "Korekty", "Klik w plakietkę kosztu na karcie ataku (autor albo MG): „Popraw próbę” — kontynuacja / nowa A / posiadane B / bez kosztu; licznik na karcie postaci się zmienia, plakietka mówi nowy sposób, dymek — co poprawiono i kto",
      "Gracz 3 po ataku klika plakietkę i wybiera „Bez kosztu”, potem z powrotem „Nowe Atakowanie”."),
    p("szablon-paska", "Pasek", "„Ułóż pasek” (panel Stan, też poza walką): podgląd slotów 1–0 — broń, obsługa broni, dwie decyzje klasowe (Gladiator: Berserk, Z bara!), ekwipunek, Unik, Odstąp, paleta Ruch, paleta Więcej; makro gracza w slocie zostaje (konflikt — za dziesiątką); drugi raz — bez zmian; palety: otwarcie nic nie kosztuje",
      "Gracz 3: połóż własne makro na slocie 7, potem Ułóż pasek → Ułóż; użyj Ruch → Biegnij i Więcej → Manewr. Gracz 1 poza walką: Ułóż pasek."),
    p("pusty-pasek", "Pasek", "Przycisk panelu przeciągnięty na pasek działa jak na karcie; makro zdolności zdjęte z paska nie wraca po zmianie poziomu; pusty pasek niczego nie odbiera (T43)",
      "Gracz 1: przeciągnij Biegnij i Skok na pasek, użyj; zdejmij makro zdolności; MG daje poziom."),
    p("gotowosc", "Gotowość", "Pasek u góry: „Twoja tura za 2”, „Gotuj się, jesteś następny” z krótkim dźwiękiem, „Twoja tura” z dźwiękiem i zegarem; ukryty BN nie liczy się w „za X”; MG bez sygnałów przy każdym BN (T45)",
      "MG ukrywa ghula w trackerze i przełącza tury; gracze patrzą na pasek; dźwięk z motywu walki rdzenia."),
    p("pauza-zegar", "Gotowość", "Zegar własnej tury m:ss.cc: żółty po 30 s, czerwony po 60 s; pauza zatrzymuje i wycisza; przeładowanie w tej samej turze wraca z czasem, wejście w środku tury — „od wejścia” bez dźwięku startu (T44)",
      "Gracz 1 w swojej turze czeka 70 s; MG pauzuje i wznawia; Gracz 2 przeładowuje stronę w swojej turze."),
    p("kobalt", "WKK", "Bez Koloru Kobaltu: chód→pływanie albo rana po grancie — licznik „(ręcznie)”, linijka bez koloru i „rozstrzygnij ręcznie” (zasada 45)",
      "MG wyłącza Kolor Kobaltu; Gracz 1: Przyspiesz, rana, przeciągnij.", "WKK")
  ]
};
