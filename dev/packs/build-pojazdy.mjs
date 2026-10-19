/**
 * Neuroshima 5e — paczka `pojazdy` (PLAN_m4_pojazdy §5, E1).
 *
 * 14 aktorów typu `vehicle` z tabeli s. 262 (`PODWOZIA`) i katalogu M4 (`KATALOG_POJAZDOW`): statystyki,
 * progi, rozmiar, obrys żetonu, bak, cechy jako zdolności pojazdu (feat „vehicle”; z aktywnością tam, gdzie
 * cecha ma czas działania — akcję, akcję bonusową, reakcję). Flaga `pojazd.podwozie` czyni z aktora
 * prawdziwy pojazd M4 (§4.13); bez niej typ `vehicle` jest tylko pojemnikiem.
 *
 * Grafika: żeton `tokens/pojazdy/<slug>.webp`, a bez niego atrapa `tokens/pojazdy/_placeholder/`;
 * portret `tokens/portraits/pojazd-<slug>.webp`, a bez niego grafika żetonu (dev/art/m4 — MISSING §P).
 * Dostarczony plik wygrywa przy najbliższym `fvtt packs` bez zmian w kodzie.
 *
 * Jak `build-towarzysze.mjs`: pomocnicze funkcje przychodzą z `build-packs.mjs` jako argumenty.
 */

import fs from "node:fs";
import path from "node:path";
import {
  PODWOZIA, KATALOG_POJAZDOW, CECHY_POJAZDOW, ROZMIAR_MASZYNY, cechyPojazdu, rozmiarPojazdu, ttBezruchu
} from "../../scripts/config/vehicles-data.mjs";

/** Stany, na które maszyna jest odporna: wszystkie poza Podpaleniem, Powaleniem i Unieruchomieniem (statbloki s. 262–264). */
const ODPORNOSCI_MASZYNY = [
  "diseased", "bleeding", "malnutrition", "unconscious", "incapacitated", "dehydration", "deafened", "stunned",
  "blinded", "grappled", "frightened", "skazenie", "paralyzed", "zranienie", "suffocation", "upojenie", "exhaustion",
  "poisoned", "charmed"
];

/** Waga pojazdu (kg): statbloki RAW (Autobus 12 t, Rower 20 kg, Motocykl 200 kg, Osobówka 2 t), reszta RAI. */
const WAGA = {
  autobus: 12000, rower: 20, motocykl: 200, osobowka: 2000, buggy: 600, hammer: 2500, ciezarowka: 8000,
  wozStrazacki: 15000, buldozer: 30000, czolg: 60000, bwp: 14000, traktor: 5000, motorower: 80, deskorolka: 3
};

/** Ikony cech — rdzenne `icons/svg/` (validate-packs dopuszcza tylko moduł, dnd5e i rdzeń). */
const IKONY_CECH = {
  cofanie: "down", potracenie: "combat", skokOsobowki: "jump", skokAutobusu: "jump", skokMotocykla: "jump",
  skokRoweru: "jump", akrobacja: "wingfoot", uciazliwyPancerz: "shield", przerzutka: "clockwork",
  szostyBieg: "lightning", gazDoDechy: "lightning", slalom: "direction", terenowka: "mountain",
  gasienice: "stone-path", otwartaRama: "ruins", wiezyczka: "target", paka: "item-bag", dzialkoWodne: "waterfall",
  syrena: "sound", lemiesz: "wall-direction", bezGazuDoDechy: "downgrade", wieza: "target",
  pancerneWnetrze: "holy-shield", miazdzenie: "falling", desant: "door-exit", strzelnice: "target",
  uciag: "anchor", oszczedny: "barrel", ollie: "jump"
};

const CZAS = { akcja: "action", bonus: "bonus", reakcja: "reaction" };
const WARSTWA = {
  NOE: "Neuroshima RPG",
  RAI: "Neuroshima RPG (przeniesione na pojazd bez statbloku)",
  WKK: "Neuroshima RPG — Kolor Kobaltu"
};

/** `wozStrazacki` → `woz-strazacki`: nazwa pliku grafiki (dev/art/m4/gen_catalog.py). */
export const slugPojazdu = id => id.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

/**
 * Aktorzy pojazdów: `{ entries, folders }` w kształcie `writeActorPack`.
 * @param {{idFor: Function, MODULE_ID: string, MODULE_ROOT: string}} h
 */
export function szablonyPojazdow({ idFor, MODULE_ID, MODULE_ROOT }) {
  const plik = rel => fs.existsSync(path.join(MODULE_ROOT, rel)) ? `modules/${MODULE_ID}/${rel}` : null;
  const entries = [];
  const folderSilnikowe = idFor("pojazdy-folder", "silnikowe");
  const folderMiesniowe = idFor("pojazdy-folder", "miesniowe");
  const folders = [
    { _id: folderSilnikowe, name: "Pojazdy silnikowe", type: "Actor", folder: null, sorting: "a", sort: 0, color: null, flags: {} },
    { _id: folderMiesniowe, name: "Pojazdy mięśniowe", type: "Actor", folder: null, sorting: "a", sort: 1000, color: null, flags: {} }
  ];
  const ids = Object.keys(PODWOZIA).sort((a, b) => PODWOZIA[a].nazwa.localeCompare(PODWOZIA[b].nazwa, "pl"));
  for (const [n, id] of ids.entries()) {
    const p = PODWOZIA[id];
    const k = KATALOG_POJAZDOW[id];
    const slug = slugPojazdu(id);
    const zeton = plik(`tokens/pojazdy/${slug}.webp`) ?? plik(`tokens/pojazdy/_placeholder/${slug}.webp`);
    const portret = plik(`tokens/portraits/pojazd-${slug}.webp`) ?? zeton;
    const rozmiar = rozmiarPojazdu(id);
    const bezruch = ttBezruchu(p);
    const actorId = idFor("pojazd", id);

    const items = cechyPojazdu(id).map((c, i) => {
      const def = CECHY_POJAZDOW[c.id];
      const itemId = idFor("pojazd-cecha", `${id}:${c.id}`);
      const activities = {};
      if (def.czas) {
        const aid = idFor("activity", `pojazd:${id}:${c.id}`);
        activities[aid] = {
          _id: aid, type: "utility", name: def.nazwa,
          activation: { type: CZAS[def.czas], value: 1, condition: "", override: false },
          consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
          description: { chatFlavor: "" }
        };
      }
      return {
        _id: itemId, name: def.nazwa, type: "feat", img: `icons/svg/${IKONY_CECH[c.id] ?? "upgrade"}.svg`,
        sort: i * 100,
        system: {
          description: { value: `<p>${def.opis(c)}</p>`, chat: "" },
          source: { custom: WARSTWA[def.warstwa], rules: "2024" },
          type: { value: "vehicle", subtype: "" },
          requirements: "", properties: [], prerequisites: {},
          uses: { max: "", spent: 0, recovery: [] },
          activities
        },
        flags: { [MODULE_ID]: { cechaPojazdu: c.id, warstwa: def.warstwa } },
        effects: []
      };
    });

    const opis = [
      `<p><em>${ROZMIAR_MASZYNY[rozmiar]} maszyna.</em> ${p.uwagi ?? ""}</p>`,
      `<p><strong>Szybkość:</strong> ${p.szybkosc !== null ? `${p.szybkosc} m` : p.szybkoscOpis}`
        + `${p.cofanie !== null ? `, cofanie ${p.cofanie} m` : ""}. <strong>TT w bezruchu:</strong> ${bezruch.wartosc}`
        + `${bezruch.zrodlo === "ekstrapolacja" ? " (wzorzec −5 ze statbloków)" : ""}.</p>`,
      `<p><strong>Statystyki:</strong> ${k.zrodloStatystyk === "NOE" ? "statblok z podręcznika" : "interpolacja z czterech statbloków (RAI)"}.`
        + ` <strong>Spalanie:</strong> ${k.spalanie ? `${k.spalanie} l / 100 km, bak ${k.bak} l` : "— (siła mięśni)"}.</p>`
    ].join("");

    entries.push({
      actor: {
        _id: actorId, name: p.nazwa, type: "vehicle", img: portret,
        folder: p.silnikowy ? folderSilnikowe : folderMiesniowe, sort: n * 1000,
        system: {
          abilities: {
            str: { value: k.statystyki.str }, dex: { value: k.statystyki.dex }, con: { value: k.statystyki.con },
            int: { value: 0 }, wis: { value: 0 }, cha: { value: 0 }
          },
          attributes: {
            ac: { flat: p.tt, calcs: [], formulas: [], override: p.tt },
            hp: { value: p.pw, max: p.pw, temp: 0, tempmax: 0, dt: p.progObrazen, mt: p.progAwarii },
            movement: { speeds: { walk: String(p.szybkosc ?? 0) }, units: "m" },
            actions: { max: 3, spent: 0, stations: false, thresholds: { 0: null, 1: null, 2: null } },
            capacity: { cargo: { value: p.ladownosc, units: "kg" }, creature: "" },
            price: { value: p.cena, denomination: "gb" }
          },
          crew: { max: p.zaloga, value: [] },
          passengers: { max: null, value: [] },
          details: { type: "land", biography: { value: opis, public: "" } },
          traits: {
            size: rozmiar,
            di: { value: ["psychic", "poison"], custom: "", bypasses: [] },
            ci: { value: p.silnikowy ? ODPORNOSCI_MASZYNY : ODPORNOSCI_MASZYNY.filter(s => s !== "grappled"), custom: "" },
            weight: { value: WAGA[id], units: "kg" }
          },
          source: { custom: "Neuroshima RPG", book: "", page: "s. 262", rules: "2024" }
        },
        prototypeToken: {
          name: p.nazwa, width: k.obrys.w, height: k.obrys.h, actorLink: false, disposition: 0, lockRotation: false,
          rotation: 0, displayName: 20, texture: { src: zeton, fit: "contain", scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
          sight: { enabled: false, range: 0, angle: 360, visionMode: "basic" }, ring: { enabled: false }
        },
        items: items.map(i => i._id),
        flags: {
          [MODULE_ID]: {
            pojazd: { podwozie: id },
            ...(k.bak ? { paliwo: { value: k.bak, max: k.bak, spalanie: k.spalanie } } : {}),
            ...(p.cofanie !== null ? { cofanie: p.cofanie } : {}),
            ttBezruchu: bezruch.wartosc
          }
        }
      },
      items
    });
  }
  return { entries, folders };
}
