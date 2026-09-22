/**
 * Neuroshima 5e — pasek plakietek stanu na wierszu ekwipunku.
 *
 * ## Po co to powstało
 *
 * Do tej pory każda mechanika rysowała swoją plakietkę jako `.item-name::after`, w tym samym
 * miejscu (`top: 2px; left: 26px`) i z tą samą specyficznością. Robiło tak **pięć** rodzin
 * stanów: dodatki (złoty klucz), wyszczerbienie 1/2, trwałe uszkodzenie, zacięcie i zasilanie.
 * Jeden pseudo-element, pięciu chętnych — wygrywała ostatnia reguła w pliku, czyli broń
 * z dodatkami, która się zatnie, **traciła klucz z widoku**. Nie dało się tego naprawić
 * kolejnością reguł, bo problem jest strukturalny: pseudo-elementów są dwa, a osi stanu cztery.
 *
 * Tutaj każda oś dostaje **własny slot** w poziomym pasku, w stałej kolejności
 * (`stan → gotowość → konserwacja → zasilanie → konfiguracja`). Stanów może przybywać bez
 * licytacji o miejsce.
 *
 * ## Dwa kanały, dwa różne pytania
 *
 * * **Pasek plakietek** odpowiada „co jest z tą bronią" — po jednej plakietce na oś.
 * * **Przygaszenie ikony** odpowiada „czy mogę z niej TERAZ strzelić" i jest celowo osobne,
 *   bo to jedyne pytanie, które trzeba widzieć z drugiego końca listy, bez czytania.
 *   Wyszczerbiona maczeta dostaje plakietkę, ale nie gaśnie — nią wciąż można walczyć,
 *   tylko słabiej. Broń palna bez magazynka gaśnie, choć jest sprawna.
 *
 * ## Dlaczego to czyta klasy, a nie stan
 *
 * `jams.mjs`, `melee-degradation.mjs`, `power-source.mjs` i `addons-inventory.mjs` już dziś
 * dopinają swoje klasy `neuro-*` do wiersza przy renderze arkusza. Ten moduł **nie duplikuje
 * ich reguł** — czyta gotowy werdykt z klasy. Dzięki temu doszła jedna warstwa rysująca,
 * a żadna mechanika nie musiała się zmienić.
 *
 * Wyjątkiem jest gotowość magazynkowa: nikt jej wcześniej nie wystawiał, więc pytamy wprost
 * `magazineReadiness()` z warstwy magazynków.
 *
 * **Kolejność rejestracji ma znaczenie**: ten hook musi iść po tamtych czterech, inaczej
 * zobaczy wiersz bez ich klas. Dlatego `registerItemStatePips()` jest wołane jako ostatnie
 * w `main.mjs` — patrz komentarz przy wywołaniu.
 */

import { magazineReadiness, getMag } from "../weapons/magazine.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Sloty paska, od lewej. Jedna plakietka na slot — w obrębie slotu wygrywa pierwszy trafiony
 * wariant, więc kolejność wewnątrz `pick` niesie nasilenie (najgorsze najpierw).
 */
const SLOTS = [
  {
    name: "stan",
    /* Uszkodzenie i zacięcie wykluczają się już na poziomie `jams.mjs` (tam jest `else if`),
       ale wyszczerbienie broni białej to osobna mechanika i teoretycznie może współistnieć.
       Pokazujemy najcięższy stan — plakietka ma odpowiadać „co jest nie tak", a nie
       wyliczać wszystkiego naraz. */
    pick: row =>
      row.classList.contains("neuro-weapon-damaged")
        ? { kind: "damaged", blocksFiring: true, tip: "Trwale uszkodzona — potrzebny rusznikarz" }
      : row.classList.contains("neuro-degraded-2")
        ? { kind: "degraded-2", tip: "Mocno wyszczerbiona" }
      : row.classList.contains("neuro-weapon-jammed")
        ? { kind: "jammed", blocksFiring: true, tip: "Zacięta — odblokuj, zanim strzelisz" }
      : row.classList.contains("neuro-degraded-1")
        ? { kind: "degraded-1", tip: "Wyszczerbiona" }
      : null
  },
  {
    name: "gotowosc",
    pick: (row, item) => {
      switch (magazineReadiness(item)) {
        case "missing":
          /* Plakietka leci zawsze — brak magazynka to informacja, po którą się sięga.
             Ale ikona gaśnie tylko wtedy, gdy naprawdę nie ma czym strzelić: pistolet
             z nabojem w komorze i bez magazynka odda jeszcze JEDEN strzał, więc gaszenie
             go byłoby zwyczajnie nieprawdą. Kanał „czy mogę teraz strzelić" musi mówić
             prawdę, bo inaczej przestaje być czymkolwiek wart. */
          return {
            kind: "mag-missing",
            blocksFiring: (getMag(item)?.current ?? 0) === 0,
            tip: "Brak magazynka"
          };
        case "empty":
          return { kind: "mag-empty", blocksFiring: true, tip: "Pusto — nie ma czym strzelać" };
        default:
          return null;
      }
    }
  },
  {
    /* Jedyny stan POZYTYWNY w tym zestawie i jedyny, który wygasa sam — stąd własny slot,
       a nie doklejenie do „stanu". Ma prawo współistnieć z uszkodzeniem: wyczyszczona broń
       dalej może czekać na rusznikarza.

       Plakietka ma tu konkretną robotę, inną niż przy zacięciu czy braku magazynka. Tamte
       widać po skutkach — broń nie strzela. Przerzut z konserwacji jest niewidzialny, dopóki
       nie padnie naturalna 1, i przepada z końcem walki. Bez oznaczenia gracz nie ma jak
       świadomie nim zagrać, bo nie wie, że go jeszcze ma. */
    name: "konserwacja",
    /* „Wychuchana spluwa" wygrywa z „wyczyszczoną" i to nie jest arbitralne: daje pełną
       odporność, a odporność sprawdza się PRZED rzutem (`_getJamImmunityAbilityKey`), więc
       przerzut z czyszczenia na takiej broni nigdy nawet nie ma okazji zadziałać. Pokazanie
       obu sugerowałoby dwie warstwy zabezpieczenia tam, gdzie działa jedna.

       Odporności z cechy `Jak dbasz tak masz` tu NIE ma celowo — obejmuje całą broń postaci,
       więc plakietka świeciłaby na każdej sztuce, zawsze, nigdy się nie zmieniając. Stan,
       który nigdy nie ma innej wartości, nie niesie decyzji; to cecha postaci i jej miejsce
       jest na karcie postaci, nie przy każdej spluwie. */
    pick: row =>
      row.classList.contains("neuro-weapon-pampered")
        ? { kind: "pampered", tip: "Wychuchana spluwa — ta broń nie może się zaciąć" }
      : row.classList.contains("neuro-weapon-cleaned")
        ? { kind: "cleaned", tip: "Wyczyszczona — jednorazowy przerzut zacięcia w tej walce" }
      : null
  },
  {
    name: "zasilanie",
    pick: row =>
      row.classList.contains("neuro-power-low") ? { kind: "power-low", tip: "Zasilanie na wyczerpaniu" }
      : row.classList.contains("neuro-power-on") ? { kind: "power-on", tip: "Włączone" }
      : null
  },
  {
    name: "konfiguracja",
    pick: row => row.classList.contains("neuro-has-addons") ? { kind: "addons", tip: "Ma zainstalowane dodatki" } : null
  }
];

export function registerItemStatePips() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetPips);
  }
  console.log("Neuroshima 5e | Item state pips registered");
}

function _rootOf(html) {
  return html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
}

function _onRenderActorSheetPips(app, html) {
  const actor = app.document ?? app.actor;
  const root = _rootOf(html);
  if (!actor || !root) return;

  root.querySelectorAll(".item[data-item-id]").forEach(row => {
    const item = actor.items.get(row.dataset.itemId);
    if (!item) return;
    _decorateRow(row, item);
  });
}

function _decorateRow(row, item) {
  const pips = [];
  for (const slot of SLOTS) {
    const pip = slot.pick(row, item);
    if (pip) pips.push({ ...pip, slot: slot.name });
  }

  /* Wyszczerbienie nie gasi ikony celowo: bronią białą z nadszczerbionym ostrzem dalej
     się bije, tylko słabszą kością. Gdyby gasła, kanał „czy mogę teraz strzelić" zsunąłby
     się do „coś jest nie tak" i przestał odpowiadać na jedyne pytanie, dla którego istnieje. */
  row.classList.toggle("neuro-not-ready", pips.some(p => p.blocksFiring));

  /* Arkusz przerysowuje się przy byle czym (zmiana ilości, filtr, sortowanie), a ten hook
     odpala się za każdym razem. Jeżeli zestaw plakietek się nie zmienił, NIE ruszamy DOM-u:
     bez tego znikałby dymek `data-tooltip` trzymany akurat pod kursorem, a przy szybkiej serii
     przerysowań pasek migałby w oczach. Porównanie po samych rodzajach wystarcza — treść
     plakietki jest funkcją rodzaju. */
  const existing = row.querySelector(":scope .neuro-pips");
  const want = pips.map(p => p.kind).join(",");
  if (existing?.dataset.kinds === want) return;
  existing?.remove();
  if (!pips.length) return;

  const host = row.querySelector(".item-name");
  if (!host) return;

  const strip = document.createElement("span");
  strip.className = "neuro-pips";
  strip.dataset.kinds = want;
  for (const pip of pips) {
    const el = document.createElement("span");
    el.className = `neuro-pip neuro-pip--${pip.kind}`;
    el.dataset.tooltip = pip.tip;
    el.setAttribute("aria-label", pip.tip);
    strip.append(el);
  }

  /* Za nazwą, przed `.tags` — pasek ma się kleić do tytułu, a nie wylądować na końcu wiersza
     obok liczb, gdzie zlałby się z kolumnami. */
  const name = host.querySelector(":scope > .name");
  if (name) name.after(strip);
  else host.append(strip);
}

export const __testing = Object.freeze({ SLOTS, _decorateRow });
