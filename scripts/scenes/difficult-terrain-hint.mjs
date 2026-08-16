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

/**
 * Czy którykolwiek pionek gracza pokazuje właśnie miarkę ruchu.
 * Wymagamy własności, żeby najechanie na cudzy pionek nie odsłaniało mapy.
 */
function ktosPlanujeRuch() {
  return (canvas.tokens?.placeables ?? []).some(t => t.ruler?.visible && t.isOwner);
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
}

export const difficultTerrainHintApi = { przelicz, trudnyTeren };
