/**
 * Neuroshima 5e — trudny teren widoczny tylko wtedy, gdy planujesz ruch.
 *
 * Mapy z Tiled są większe i gęstsze niż typowa plansza dnd5e: zamiast dwóch
 * bagnistych plam mamy kilkadziesiąt małych stref wokół każdego mebla, regału
 * i barykady. Narysowane na stałe zaśmiecają graczowi widok, a schowane na
 * amen zmuszają go do „szperania" próbnikiem ruchu, żeby w ogóle wiedzieć,
 * że tam coś jest.
 *
 * Rozwiązanie: **graczowi** strefy zapalają się dokładnie wtedy, gdy pojawia
 * się miarka ruchu, i gasną razem z nią. Informacja jest na ekranie w jedynym
 * momencie, w którym ma znaczenie.
 *
 * MG widzi je cały czas — eksporter nadaje regionowi widoczność `GAMEMASTER`,
 * więc rdzeń Foundry pokazuje je prowadzącemu i ukrywa przed resztą. Ten plik
 * dokłada wyłącznie chwilowe odsłonięcie dla gracza.
 *
 * ## Dlaczego to nic nie kosztuje
 *
 * Wszystko dzieje się **po stronie klienta**. Nie ruszamy dokumentu Region,
 * więc nie ma zapisu do bazy, nie ma ruchu po sieci, nie ma wymogu uprawnień
 * i nic nie zostaje po sesji. Każdy gracz widzi podświetlenie przy swoim
 * własnym ruchu, niezależnie od pozostałych.
 *
 * Podpinamy się w dwa miejsca, które Foundry wystawia wprost do nadpisania:
 *
 *   CONFIG.Token.rulerClass    `_onVisibleChange()` jest oznaczone @abstract
 *                              i wołane przy każdej zmianie widoczności miarki
 *   CONFIG.Region.objectClass  `isVisible` to getter placeable'a; `_refreshState`
 *                              przepisuje go do `visible`, więc wystarczy
 *                              nadpisać getter i poprosić o odświeżenie
 *
 * ## Uwaga o dziedziczeniu
 *
 * dnd5e podmienia `CONFIG.Token.rulerClass` na własną `TokenRuler5e`. Dlatego
 * rejestrujemy się w haku `setup` i rozszerzamy to, co **aktualnie** stoi
 * w CONFIG, zamiast rdzeniowej klasy — inaczej wywalilibyśmy zmiany systemu.
 *
 * ## Kiedy dokładnie zapala się miarka
 *
 * Rdzeniowe `BaseTokenRuler#isVisible` włącza ją przy `hover`, `isDragged`,
 * `showRuler` albo trybie podświetlania (Alt). Podświetlenie idzie więc także
 * przy najechaniu na własny pionek, nie tylko przy przeciąganiu — co jest
 * wygodniejsze, bo widać teren jeszcze przed chwyceniem figury.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const USTAWIENIE = "trudnyTerenPrzyRuchu";

/** Czy podświetlenie jest w tej chwili włączone (stan lokalny klienta). */
let podswietlone = false;

/**
 * Czy ten region to trudny teren z eksportera map.
 * Ręcznie dorysowane regiony nie mają tej flagi i zachowują się normalnie.
 */
function trudnyTeren(region) {
  return region?.document?.flags?.[MODULE_ID]?.source === "furniture";
}

/** Ostatnia znana pozycja kursora — aktualizowana biernym nasłuchem. */
let kursorX = -1;
let kursorY = -1;

/**
 * Czy plansza jest **naprawdę** pod kursorem.
 *
 * Nie wystarczy `token.hover`. Foundry ustawia je przy najechaniu i zdejmuje
 * przy zjechaniu — ale gdy nad pionkiem otworzy się okno (podwójne kliknięcie
 * wysuwa kartę postaci), kursor nigdy z pionka nie zjeżdża, `hoverOut` nie
 * przychodzi i `hover` zostaje `true` na zawsze. Podświetlenie zostawało wtedy
 * zapalone aż do kolejnej pary najechanie+zjechanie.
 *
 * `elementFromPoint` odpowiada na właściwe pytanie: co jest teraz pod kursorem.
 * Karta postaci to `DIV` wewnątrz okna, plansza to `CANVAS#board`.
 */
function kursorNadPlansza() {
  if (kursorX < 0) return true;      // jeszcze nie wiemy — nie gasimy na zapas
  const element = document.elementFromPoint(kursorX, kursorY);
  return !!element?.closest?.("#board");
}

/** Pozycja kursora przeliczona z ekranu na współrzędne planszy. */
function kursorWSwiecie() {
  const m = canvas.stage.worldTransform;
  return { x: (kursorX - m.tx) / m.a, y: (kursorY - m.ty) / m.d };
}

/**
 * Czy gracz właśnie planuje ruch swoim pionkiem.
 *
 * Wymagamy własności, żeby najechanie na cudzy pionek nie odsłaniało mapy.
 *
 * Kluczowe: **nie ufamy `token.hover`**. To pole potrafi zostać zapalone na
 * stałe — podwójne kliknięcie w pionek wysuwa kartę postaci, kursor nigdy
 * z pionka nie zjeżdża, `hoverOut` nie przychodzi i `hover` zostaje `true`
 * do następnej pary najechanie+zjechanie. Zamiast tego sprawdzamy sami, czy
 * kursor faktycznie jest nad obrysem pionka. Wystarczy, że gracz ruszy myszą
 * w stronę karty, a podświetlenie gaśnie — niezależnie od tego, czy Foundry
 * zdążyło zdjąć `hover`.
 */
function ktosPlanujeRuch() {
  const pionki = canvas.tokens?.placeables ?? [];
  // Realne przeciąganie wygrywa ze wszystkim: kursor może wtedy wyjechać poza
  // planszę (nad pasek boczny, nad okno) i ruch dalej trwa.
  if (pionki.some(t => t.isOwner && t.isDragged)) return true;
  if (!kursorNadPlansza()) return false;
  const kursor = kursorWSwiecie();
  return pionki.some(t => t.isOwner && t.ruler?.visible
    // showRuler to jawna decyzja gracza (skrót klawiszowy) - nie zależy od myszy
    && (t.showRuler || t.bounds?.contains(kursor.x, kursor.y)));
}

/** Zapala albo gasi strefy, jeśli stan się zmienił. */
function przelicz() {
  if (!canvas?.ready) return;
  if (!game.settings.get(MODULE_ID, USTAWIENIE)) {
    if (!podswietlone) return;
    podswietlone = false;
  } else {
    const chcemy = ktosPlanujeRuch();
    if (chcemy === podswietlone) return;
    podswietlone = chcemy;
  }
  for (const region of canvas.regions?.placeables ?? []) {
    if (trudnyTeren(region)) region.renderFlags.set({ refreshState: true });
  }
}

export function registerDifficultTerrainHint() {
  game.settings.register(MODULE_ID, USTAWIENIE, {
    name: "Trudny teren widoczny przy planowaniu ruchu",
    hint: "Strefy trudnego terenu zapalają się razem z miarką ruchu i gasną " +
          "wraz z nią. Wyłączone: strefy zachowują się zgodnie z własnym " +
          "ustawieniem widoczności.",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: przelicz
  });

  // setup, nie init: dopiero tu CONFIG ma finalne klasy po systemie dnd5e,
  // a kanwa nie jest jeszcze narysowana, więc podmiana zdąży zadziałać.
  Hooks.once("setup", () => {
    const BazowyRuler = CONFIG.Token.rulerClass;
    CONFIG.Token.rulerClass = class extends BazowyRuler {
      _onVisibleChange() {
        super._onVisibleChange();
        przelicz();
      }
    };

    const BazowyRegion = CONFIG.Region.objectClass;
    CONFIG.Region.objectClass = class extends BazowyRegion {
      get isVisible() {
        // Ukryty region zostaje ukryty — to świadoma decyzja MG, nie szum.
        if (podswietlone && trudnyTeren(this) && !this.document.hidden) return true;
        return super.isVisible;
      }
    };

    console.log(`${MODULE_ID} | Trudny teren przy planowaniu ruchu gotowy`);
  });

  // `_onVisibleChange` odpala się tylko wtedy, gdy miarka zmienia stan na
  // istniejącym pionku. Gdy pionek z zapaloną miarką **zniknie** — zostanie
  // skasowany, straci kontrolę albo zmieni się scena — sygnał nie przyjdzie
  // i podświetlenie zostałoby zapalone na stałe. Stąd te trzy dodatkowe haki.
  Hooks.on("deleteToken", przelicz);
  Hooks.on("controlToken", przelicz);
  Hooks.on("canvasReady", () => { podswietlone = false; przelicz(); });

  // Ruch kursora: bierny nasłuch na całym dokumencie. Przeliczamy przy KAŻDYM
  // ruchu, bo zjechanie z pionka nie zmienia tego, że kursor dalej jest nad
  // planszą — a to właśnie zjechanie z pionka ma gasić podświetlenie.
  //
  // Dławimy do jednej klatki: `pointermove` potrafi lecieć kilkaset razy na
  // sekundę, a `przelicz()` i tak wychodzi natychmiast, gdy stan się nie
  // zmienił.
  let zaplanowane = false;
  document.addEventListener("pointermove", (event) => {
    kursorX = event.clientX;
    kursorY = event.clientY;
    if (zaplanowane) return;
    zaplanowane = true;
    requestAnimationFrame(() => { zaplanowane = false; przelicz(); });
  }, { capture: true, passive: true });

  // Okno może się otworzyć albo zamknąć **pod nieruchomym kursorem** — wtedy
  // żaden `pointermove` nie przyjdzie, a to, co jest pod kursorem, się zmieni.
  // Hak leci dla wszystkich klas potomnych ApplicationV2.
  Hooks.on("renderApplicationV2", przelicz);
  Hooks.on("closeApplicationV2", przelicz);
}

/**
 * Podgląd stanu — do diagnozy.
 *
 * `region.visible` NIE nadaje się na miarę działania tej funkcji, gdy patrzy
 * MG: przy widoczności GAMEMASTER rdzeń pokazuje mu strefy zawsze, niezależnie
 * od podświetlenia. Stąd osobny wgląd w to, co naprawdę policzył moduł.
 */
function stan() {
  const pionki = canvas?.tokens?.placeables ?? [];
  return {
    podswietlone,
    kursor: { x: kursorX, y: kursorY },
    kursorNadPlansza: kursorNadPlansza(),
    planujeRuch: ktosPlanujeRuch(),
    pionkiZMiarka: pionki.filter(t => t.isOwner && t.ruler?.visible).map(t => t.name),
    przeciagane: pionki.filter(t => t.isOwner && t.isDragged).map(t => t.name)
  };
}

export const difficultTerrainHintApi = { przelicz, trudnyTeren, stan };
