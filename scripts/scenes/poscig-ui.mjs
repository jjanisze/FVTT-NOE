/**
 * Neuroshima 5e — pościg: interfejs MG (przycisk w narzędziach sceny + okna dialogowe).
 *
 * Projekt: `PLAN_poscigi.md`. Logika i dokument sceny: `poscig.mjs`.
 *
 * ## Po co osobny plik na sam interfejs
 *
 * `poscig.mjs` da się wywołać z makra i z konsoli, i tak zostanie — ale mechanika, do której
 * jedynym wejściem jest wklejenie linijki JS-a, w praktyce nie istnieje. MG w trakcie sesji
 * nie otwiera konsoli. Rozdzielenie idzie tą samą granicą, co w `weapons/tracer-vfx.mjs`
 * (silnik) i `weapons/tracer-debug-panel.mjs` (panel MG): plik z logiką nie wie nic o UI,
 * plik z UI nie zna geometrii planszy.
 *
 * ## Jeden przycisk, dwa zachowania
 *
 * Przycisk w narzędziach sceny jest kontekstowy: na zwykłej mapie otwiera „nowy pościg",
 * na planszy pościgu — jej ustawienia. Osobne przyciski na jedno i drugie znaczyłyby, że
 * na dowolnej scenie jeden z nich zawsze jest nieczynny.
 */

import {
  start, konfiguruj, dodajPojazd, stan, isPoscigScene, poscigFlag, TORY_DOMYSLNIE
} from "./poscig.mjs";
import {
  SRODOWISKA, PRZEWAGA_KONCZACA, RUND_MAKS, START_SCIGANI, START_SCIGAJACY
} from "../config/vehicles-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Budowanie pól                                */
/* -------------------------------------------- */

function _grupa(label, pola, hint) {
  return `<div class="form-group"><label>${label}</label>`
    + `<div class="form-fields">${pola}</div>`
    + (hint ? `<p class="hint">${hint}</p>` : "")
    + `</div>`;
}

function _liczba(name, value, { min = 0, max, step = 1 } = {}) {
  return `<input type="number" name="${name}" value="${value}" min="${min}" step="${step}"`
    + (max === undefined ? "" : ` max="${max}"`) + ">";
}

function _srodowiskoSelect(wybrane) {
  const opcje = Object.values(SRODOWISKA).map(s =>
    `<option value="${s.id}"${s.id === wybrane ? " selected" : ""}>`
    + `${s.nazwa} — ST ${s.st}</option>`).join("");
  return `<select name="srodowisko">${opcje}</select>`;
}

/** Wszystkie pojazdy w świecie, alfabetycznie. */
function _pojazdy() {
  return game.actors.filter(a => a.type === "vehicle")
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

function _pojazdySelect(name, { wybrane = [], rozmiar = 6 } = {}) {
  const lista = _pojazdy();
  if (!lista.length) {
    return `<p class="notification warning">Brak aktorów typu „pojazd" w świecie.</p>`;
  }
  const opcje = lista.map(a =>
    `<option value="${a.id}"${wybrane.includes(a.id) ? " selected" : ""}>`
    + `${foundry.utils.escapeHTML(a.name)}</option>`).join("");
  return `<select name="${name}" multiple size="${Math.min(rozmiar, lista.length)}"`
    + ` style="min-height: 5.5em;">${opcje}</select>`;
}

/** Odczytaj zaznaczenie z `<select multiple>` — `form.elements` daje różne typy dla 1 vs N. */
function _wybrane(form, name) {
  const el = form.elements[name];
  if (!el) return [];
  return Array.from(el.selectedOptions ?? []).map(o => o.value);
}

/* -------------------------------------------- */
/*  Nowy pościg                                  */
/* -------------------------------------------- */

export async function oknoNowyPoscig() {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG.");

  const brakPojazdow = !_pojazdy().length;
  const tresc =
    _grupa("Nazwa sceny", `<input type="text" name="nazwa" value="Pościg">`)
    + _grupa("Liczba torów", _liczba("tory", TORY_DOMYSLNIE, { min: 4, max: 40 }),
      "Jeden tor = jeden znacznik pościgu = 36 m. Podręcznik zakłada co najmniej 10; "
      + `pościg kończy się przy ${PRZEWAGA_KONCZACA} znacznikach przewagi lub po ${RUND_MAKS} rundach.`)
    + _grupa("Środowisko", _srodowiskoSelect("otwarte"),
      "Wyznacza ST Testu Pościgu (tabela s. 266).")
    + _grupa("Ścigani", _pojazdySelect("scigani"),
      brakPojazdow ? "" : `Start na znaczniku ${START_SCIGANI}. Ctrl/Shift — zaznaczanie wielu.`)
    + _grupa("Ścigający", _pojazdySelect("scigajacy"),
      brakPojazdow ? "" : `Start na znaczniku ${START_SCIGAJACY}.`)
    + _grupa("Aktywuj dla stołu",
      `<input type="checkbox" name="aktywuj" checked>`,
      "Przełącza na tę scenę wszystkich graczy, nie tylko ciebie.");

  return foundry.applications.api.DialogV2.prompt({
    window: { title: "Nowy pościg", icon: "fa-solid fa-flag-checkered" },
    position: { width: 480 },
    content: tresc,
    ok: {
      label: "Utwórz planszę",
      icon: "fa-solid fa-road",
      callback: async (ev, btn) => {
        const f = btn.form;
        return start({
          nazwa: f.elements.nazwa.value?.trim() || "Pościg",
          tory: Number(f.elements.tory.value) || TORY_DOMYSLNIE,
          srodowisko: f.elements.srodowisko.value,
          scigani: _wybrane(f, "scigani"),
          scigajacy: _wybrane(f, "scigajacy"),
          aktywuj: f.elements.aktywuj.checked
        });
      }
    },
    rejectClose: false
  });
}

/* -------------------------------------------- */
/*  Ustawienia trwającego pościgu                */
/* -------------------------------------------- */

function _podsumowanie(s) {
  if (!s) return "";
  const wiersze = s.pionki.map(p =>
    `<tr><td>${foundry.utils.escapeHTML(p.nazwa)}</td>`
    + `<td style="text-align:center">${p.rola === "scigany" ? "ścigany" : "ścigający"}</td>`
    + `<td style="text-align:center"><strong>${p.tor}</strong></td></tr>`).join("");
  const koniec = s.koniec
    ? `<p class="notification warning" style="margin-top:.4em">`
      + s.koniec.map(foundry.utils.escapeHTML).join(" ") + `</p>`
    : "";
  return `<fieldset><legend>Stan planszy</legend>`
    + `<p style="margin:.2em 0">Runda <strong>${s.runda}</strong>`
    + ` &nbsp;·&nbsp; przewaga <strong>${s.przewaga ?? "—"}</strong></p>`
    + (wiersze
      ? `<table style="width:100%"><thead><tr><th style="text-align:left">Pojazd</th>`
        + `<th>Rola</th><th>Tor</th></tr></thead><tbody>${wiersze}</tbody></table>`
      : `<p class="hint">Na planszy nie ma jeszcze żadnego pojazdu.</p>`)
    + koniec + `</fieldset>`;
}

export async function oknoUstawienia(scene = canvas?.scene) {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG.");
  const flaga = poscigFlag(scene);
  if (!flaga) return ui.notifications.warn("Ta scena nie jest planszą pościgu.");

  const s = stan(scene);
  const tresc = _podsumowanie(s)
    + _grupa("Liczba torów", _liczba("tory", flaga.tory, { min: 4, max: 40 }),
      "Zmiana przebudowuje planszę i zmienia szerokość sceny.")
    + _grupa("Środowisko", _srodowiskoSelect(flaga.srodowisko))
    + _grupa("ST Testu Pościgu", _liczba("st", flaga.st, { min: 0, max: 30 }),
      "Domyślnie ze środowiska — nadpisz, jeśli scena tego wymaga.")
    + _grupa("Runda", _liczba("runda", flaga.runda, { min: 1 }))
    + _grupa("Tempo tła", _liczba("tempoTla", flaga.tempoTla ?? 1, { min: 0, max: 4, step: 0.1 }),
      "Sama prędkość przewijania pustyni. 0 zatrzymuje obraz; nie wpływa na mechanikę.")
    + `<hr><fieldset><legend>Dostaw pojazd</legend>`
    + _grupa("Pojazd", _pojazdySelect("dodaj", { rozmiar: 4 }))
    + _grupa("Na tor", _liczba("dodajTor", 1, { min: 1, max: flaga.tory }))
    + _grupa("Jako", `<select name="dodajRola">`
      + `<option value="scigajacy">ścigający</option>`
      + `<option value="scigany">ścigany</option></select>`)
    + `</fieldset>`;

  return foundry.applications.api.DialogV2.prompt({
    window: { title: `Pościg — ustawienia (${scene.name})`, icon: "fa-solid fa-sliders" },
    position: { width: 480 },
    content: tresc,
    ok: {
      label: "Zastosuj",
      icon: "fa-solid fa-check",
      callback: async (ev, btn) => {
        const f = btn.form;
        await konfiguruj(scene, {
          tory: Number(f.elements.tory.value),
          srodowisko: f.elements.srodowisko.value,
          st: Number(f.elements.st.value),
          runda: Number(f.elements.runda.value),
          tempoTla: Number(f.elements.tempoTla.value)
        });
        const doDodania = _wybrane(f, "dodaj");
        for (const id of doDodania) {
          await dodajPojazd(scene, id, {
            tor: Number(f.elements.dodajTor.value),
            rola: f.elements.dodajRola.value
          });
        }
        return true;
      }
    },
    rejectClose: false
  });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/**
 * Rejestracja przycisku. **Wołać z hooka `init`**, nie z `ready` — tam, gdzie już siedzą
 * `registerTracerDebugPanelControls()` i `registerSoundDebugPanelControls()`.
 *
 * `SceneControls#_configureRenderOptions` przebudowuje zestaw narzędzi (`#prepareControls()`,
 * a więc i hook `getSceneControlButtons`) **tylko** przy `options.isFirstRender` albo
 * `options.reset`. Hook zarejestrowany w `ready` jest już po pierwszym renderze paska, więc
 * przycisku po prostu nie ma — i nie pomoże na to zwykłe `ui.controls.render()`, bo ono nie
 * przelicza narzędzi na nowo. Objaw jest mylący: hook siedzi poprawnie w `Hooks.events`,
 * wywołany ręcznie robi dokładnie to, co trzeba, a w interfejsie nie ma nic.
 */
export function registerPoscigUI() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) return;
    const naPlanszy = isPoscigScene();
    tokenTools.neuroshimaPoscig = {
      name: "neuroshimaPoscig",
      title: naPlanszy ? "Pościg — ustawienia planszy (MG)" : "Pościg — nowa plansza (MG)",
      icon: naPlanszy ? "fa-solid fa-sliders" : "fa-solid fa-flag-checkered",
      order: Object.keys(tokenTools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => (isPoscigScene() ? oknoUstawienia() : oknoNowyPoscig())
    };
  });

  // Tytuł i ikona zależą od tego, czy stoimy na planszy, więc po zmianie sceny pasek trzeba
  // przeliczyć od nowa — `reset: true`, bo samo `render()` nie rusza definicji narzędzi.
  // Aktywna grupa i wybrane narzędzie to osobny stan (`#control` / `#tools`) i reset ich
  // nie gubi.
  Hooks.on("canvasReady", () => ui.controls?.render({ reset: true }));

  console.log("Neuroshima 5e | Interfejs MG pościgu zarejestrowany");
}

export const poscigUiApi = { oknoNowyPoscig, oknoUstawienia };
