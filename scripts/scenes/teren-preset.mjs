/**
 * Neuroshima 5e — teren bez Tiled (PLAN_m8_ruch_i_ekonomia_akcji §8.2, E2) i ciągnięcie pochwyconego (s. 35, D34).
 *
 * ## Przyczyny trudnego terenu
 *
 * Region z natywnym zachowaniem `dnd5e.difficultTerrain` ma zbiór przyczyn (`types`). Lista przyczyn to
 * `CONFIG.DND5E.difficultTerrainTypes` — tu z etykietami NOE (`config/teren-data.mjs`) i trzema przyczynami, których
 * dnd5e nie ma (schody, zagracenie, niski strop). Wybór przyczyn w oknie zachowania Regionu jest natywny; odporności
 * zdolności (Cichy krok, Człowiek-pająk, Włóczykij) czyta sam dnd5e z `movement.ignoredDifficultTerrain`.
 *
 * ## Preset „Trudny teren” (narzędzie MG w warstwie Regionów)
 *
 * Przycisk w kontrolkach Regionów otwiera wybór przyczyn i uzbraja preset na tym kliencie: każdy nowy Region
 * narysowany przez tego MG (poza trybem szablonów) dostaje zachowanie z przyczynami, nazwę, kolor i widoczność MG —
 * jak strefy eksportera map, więc gracz widzi je przy planowaniu ruchu (`scenes/difficult-terrain-hint.mjs`), chyba
 * że Region jest ukryty. Uzbrojenie można też od razu zastosować do zaznaczonych Regionów. Nic nie jest zapisywane
 * poza samymi Regionami; preset to stan klienta.
 *
 * ## Tryb ruchu „Ciągnięcie” (D34)
 *
 * Natywny tryb ruchu obok Chodu i Czołgania (HUD tokenu, cykl trybów, linijka): koszt odcinka = natywny koszt
 * (z terenem) + dystans, chyba że chwytający jest co najmniej dwa rozmiary większy od pochwyconego (s. 35). Leżący
 * ciągnie czołgając się — druga dopłata. Szybkość — z chodu (`trybBazowy`). Przy `movementAutomation = none` — bez
 * dopłat, jak reszta automatyki dnd5e (budżet i tak oznacza wtedy koszt jako niepełny).
 */

import {
  PRZYCZYNY_TERENU, ODPORNOSCI_TERENU, doplataCiagniecia, etykietaPrzyczyny, nazwaTerenu, przyczynyZnane, zachowanieTerenu
} from "../config/teren-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const NARZEDZIE = "neuroTrudnyTeren";
const KOLOR = "#b5651d";
export const TRYB_CIAGNIECIA = "drag";

/** Uzbrojony preset tego klienta: `null` albo lista przyczyn (pusta — „inne”). */
let _preset = null;

/* -------------------------------------------- */
/*  Przyczyny                                    */
/* -------------------------------------------- */

function _zarejestrujPrzyczyny() {
  const typy = CONFIG.DND5E?.difficultTerrainTypes;
  if (!typy) return;
  for (const p of PRZYCZYNY_TERENU) {
    if (typy[p.id]) typy[p.id].label = p.label;
    else typy[p.id] = { label: p.label };
  }
}

/* -------------------------------------------- */
/*  Tryb ruchu „Ciągnięcie”                      */
/* -------------------------------------------- */

/** Rozmiar pochwyconego, którego aktor trzyma w ręce (lokator `grapple`), albo `null`. */
function _rozmiarPochwyconego(actor) {
  const lista = actor?.getFlag?.(MODULE_ID, "handOccupants") ?? [];
  for (const o of Array.isArray(lista) ? lista : []) {
    if (o?.kind !== "grapple" || !o.actorUuid) continue;
    const cel = fromUuidSync(o.actorUuid);
    if (cel?.system?.traits?.size) return cel.system.traits.size;
  }
  return null;
}

/** Dopłata ciągnięcia dla tokenu (do testów i podglądu): ta sama funkcja, którą liczy natywny koszt. */
export function doplataDlaTokenu(tokenDoc, dystans) {
  const actor = tokenDoc?.actor;
  return doplataCiagniecia(dystans, {
    chwytajacy: actor?.system?.traits?.size ?? "med",
    cel: _rozmiarPochwyconego(actor),
    powalony: !!actor?.statuses?.has?.("prone")
  });
}

function _zarejestrujCiagniecie() {
  const akcje = CONFIG.Token?.movement?.actions;
  if (!akcje || akcje[TRYB_CIAGNIECIA]) return;
  akcje[TRYB_CIAGNIECIA] = {
    label: "Ciągnięcie",
    icon: "fa-solid fa-people-pulling",
    img: null,
    // Po Czołganiu (4), przed Wspinaniem (5).
    order: 4.5,
    terrainAction: "walk",
    getAnimationOptions: () => ({ movementSpeed: CONFIG.Token.movement.defaultSpeed / 2 }),
    canSelect: token => token?.actor?.system?.isCreature !== false,
    getCostFunction: token => {
      if (game.settings.get("dnd5e", "movementAutomation") === "none" || !token?.actor?.system?.isCreature) return cost => cost;
      // Raz na pomiar ścieżki: rozmiary i Powalenie nie zmieniają się w trakcie jednego ruchu.
      const actor = token.actor;
      const o = { chwytajacy: actor.system?.traits?.size ?? "med", cel: _rozmiarPochwyconego(actor), powalony: actor.statuses?.has?.("prone") };
      return (cost, _from, _to, distance) => cost + doplataCiagniecia(distance, o);
    }
  };
}

/* -------------------------------------------- */
/*  Preset Regionu                               */
/* -------------------------------------------- */

/** Dane Regionu z presetu (bez kształtów): nazwa, kolor, widoczność MG, flaga pochodzenia, zachowanie. */
export function danePresetu(typy = []) {
  const znane = przyczynyZnane(typy);
  return {
    name: nazwaTerenu(znane),
    color: KOLOR,
    visibility: CONST.REGION_VISIBILITY.GAMEMASTER,
    flags: { [MODULE_ID]: { source: "preset", przyczyny: znane } },
    behaviors: [zachowanieTerenu(znane)]
  };
}

/** Uzbrój preset (lista przyczyn; pusta — „inne”). */
export function uzbroj(typy = []) {
  _preset = przyczynyZnane(typy);
  _odswiezNarzedzie();
  return _preset;
}

export function rozbroj() {
  _preset = null;
  _odswiezNarzedzie();
}

export const preset = () => (_preset ? [..._preset] : null);

/**
 * Dodaj zachowanie trudnego terenu do istniejących Regionów (zaznaczone przy uzbrajaniu albo z API). Region, który już
 * ma `dnd5e.difficultTerrain`, dostaje nowe przyczyny w tym zachowaniu zamiast drugiego zachowania (dwa nie robią ×4).
 * @param {RegionDocument[]} regiony
 * @param {string[]} typy
 */
export async function zastosuj(regiony, typy = []) {
  const znane = przyczynyZnane(typy);
  for (const r of regiony) {
    const juz = r.behaviors.find(b => b.type === "dnd5e.difficultTerrain");
    if (juz) {
      const razem = przyczynyZnane([...(juz.system.types ?? []), ...znane]);
      await juz.update({ name: nazwaTerenu(razem), "system.types": razem });
    } else {
      await r.createEmbeddedDocuments("RegionBehavior", [zachowanieTerenu(znane)]);
    }
    await r.setFlag(MODULE_ID, "przyczyny", przyczynyZnane([...(r.getFlag(MODULE_ID, "przyczyny") ?? []), ...znane]));
  }
}

/** Nowy Region tego MG przy uzbrojonym presecie — przyczyny, nazwa, kolor, widoczność; bez trybu szablonów. */
function _onPreCreateRegion(doc, data, _options, userId) {
  if (_preset === null || userId !== game.user.id || canvas.regions?.templateMode) return;
  if ((data.behaviors ?? []).length) return;
  const d = danePresetu(_preset);
  doc.updateSource({ name: d.name, color: d.color, visibility: d.visibility, flags: d.flags, behaviors: d.behaviors });
}

function _odswiezNarzedzie() {
  const t = ui.controls?.controls?.regions?.tools?.[NARZEDZIE];
  if (t) t.active = _preset !== null;
  if (ui.controls?.control?.name === "regions") ui.controls.render();
}

/** Okno wyboru przyczyn: uzbrojenie presetu (i opcjonalnie zastosowanie do zaznaczonych). */
export async function oknoPresetu() {
  const zazn = (canvas.regions?.controlled ?? []).map(r => r.document);
  const wybrane = new Set(_preset ?? []);
  const pola = PRZYCZYNY_TERENU.map(p => `<label class="checkbox"><input type="checkbox" name="p" value="${p.id}"${wybrane.has(p.id) ? " checked" : ""}> ${p.label}</label>`).join("");
  const odporni = Object.entries(ODPORNOSCI_TERENU)
    .filter(([k]) => k !== "cichy-krok")
    .map(([k, v]) => `${k === "czlowiekPajak" ? "Człowiek-pająk" : "Włóczykij"}: ${v.map(etykietaPrzyczyny).join(", ")}`).join("; ");
  const content = `<p>Nowe Regiony narysowane w tej sesji dostaną zachowanie <strong>Trudny teren</strong> z wybranymi przyczynami
    (bez wyboru — „inne”: spowalnia każdego poza Cichym krokiem).</p>
    <div class="neuro-teren-przyczyny">${pola}</div>
    <p class="hint">Odporności: Cichy krok — każdy trudny teren; ${odporni}. Gruz na schodach dalej spowalnia Człowieka-pająka.</p>
    ${zazn.length ? `<label class="checkbox"><input type="checkbox" name="zaznaczone" checked> Dodaj też do zaznaczonych Regionów (${zazn.length})</label>` : ""}`;
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: "Trudny teren — preset", icon: "fa-solid fa-hill-rockslide" },
    classes: ["neuro-teren-preset"],
    content,
    buttons: [
      { action: "uzbroj", label: "Rysuj z presetem", icon: "fa-solid fa-draw-polygon", default: true,
        callback: (_e, b) => ({ typy: [...b.form.querySelectorAll("input[name=p]:checked")].map(i => i.value),
          zaznaczone: !!b.form.querySelector("input[name=zaznaczone]")?.checked }) },
      { action: "wylacz", label: "Wyłącz preset", icon: "fa-solid fa-xmark", callback: () => ({ wylacz: true }) }
    ],
    rejectClose: false
  });
  if (!wynik) return _odswiezNarzedzie();
  if (wynik.wylacz) return rozbroj();
  uzbroj(wynik.typy);
  if (wynik.zaznaczone && zazn.length) await zastosuj(zazn, wynik.typy);
  ui.notifications.info(`${nazwaTerenu(wynik.typy)}: nowe Regiony dostaną to zachowanie.`);
}

export function registerTerenPreset() {
  _zarejestrujPrzyczyny();
  _zarejestrujCiagniecie();
  Hooks.on("preCreateRegion", _onPreCreateRegion);
  Hooks.on("getSceneControlButtons", controls => {
    const regiony = controls.regions;
    if (!regiony?.tools || !game.user.isGM) return;
    regiony.tools[NARZEDZIE] = {
      name: NARZEDZIE,
      order: Object.keys(regiony.tools).length + 1,
      title: "Trudny teren — preset (przyczyny NOE)",
      icon: "fa-solid fa-hill-rockslide",
      toggle: true,
      active: _preset !== null,
      onChange: () => { void oknoPresetu(); }
    };
  });
}

export const terenApi = Object.freeze({
  przyczyny: () => PRZYCZYNY_TERENU.map(p => ({ ...p })),
  odpornosci: () => ({ ...ODPORNOSCI_TERENU }),
  preset, uzbroj, rozbroj, zastosuj, oknoPresetu, danePresetu, doplataDlaTokenu
});
