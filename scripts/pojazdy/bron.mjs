/**
 * Neuroshima 5e — broń montowana (PLAN_m4_pojazdy §4.11, D16, E2).
 *
 *  - **Montaż i demontaż to Roboty produkcji** — przepis z wynikiem `{typ: "skutek", ref: "pojazd.montaz"}`
 *    (rejestr `zarejestrujSkutek` w `production/robota.mjs`). Domyślnie Trochę roboty od ceny broni: ST 15,
 *    30% ceny broni w surowcach, 1k4 h; narzędzia małego mechanika albo rusznikarza. MG może też zamontować
 *    od ręki. Zdjęcie — Drobnostka bez kosztów (1k4 × 10 min), od ręki.
 *  - **Broń przy strzelcu.** Broń na stanowisku leży w ładowni z flagą `stanowisko: <id miejsca>`. Gdy ktoś
 *    siada na tym miejscu, broń przechodzi do niego (flaga `zamontowana`, waga 0 — Udźwig jej nie liczy,
 *    założona) razem z wpiętym magazynkiem, więc tryby ognia, magazynki i zacięcia działają bez zmian; gdy
 *    wstaje, wysiada, wypada albo ginie — wraca. Przy starcie świata MG zwraca broń, której strzelec nie
 *    siedzi już na stanowisku.
 */

import { NAPRAWA } from "../config/production-rules.mjs";
import { start as startRoboty, zarejestrujSkutek } from "../production/robota.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { kartaPostoju, wyslijKarte } from "../postoj/karty.mjs";
import { MODULE_ID, jestPojazdem, jestZetonemPojazdu, miejscaPojazdu, miejsceOId, jazdaZetonu } from "./stan.mjs";
import { zajeteMiejsca } from "./jadacy.mjs";

export const FLAGA_STANOWISKO = "stanowisko";
export const FLAGA_ZAMONTOWANA = "zamontowana";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Broń na stanowiskach pojazdu, gdziekolwiek jest (w ładowni albo u strzelca): `[{item, stanowisko, u}]`. */
export function bronStanowisk(pojazdActor) {
  const out = [];
  for (const i of pojazdActor?.items ?? []) {
    const s = i.flags?.[MODULE_ID]?.[FLAGA_STANOWISKO];
    if (s) out.push({ item: i, stanowisko: s, u: pojazdActor });
  }
  const uuid = pojazdActor?.uuid;
  const tok = pojazdActor?.token ?? null;
  const scena = tok?.parent ?? canvas.scene;
  for (const t of scena?.tokens ?? []) {
    for (const i of t.actor?.items ?? []) {
      const z = i.flags?.[MODULE_ID]?.[FLAGA_ZAMONTOWANA];
      if (z?.pojazd === uuid) out.push({ item: i, stanowisko: z.stanowisko, u: t.actor });
    }
  }
  return out;
}

/** Czy przedmiot to broń zamontowana (u strzelca) — nie do upuszczenia ani schowania. */
export function jestZamontowana(item) {
  return !!item?.flags?.[MODULE_ID]?.[FLAGA_ZAMONTOWANA];
}

/** Opcja operacji: własne przeniesienie broni montowanej (bez ostrzeżenia „opuszcza stanowisko”). */
const OPCJA_MONTAZU = "neuroMontaz";

/** Przeniesienie broni z wpiętym magazynkiem między aktorami (MG): najpierw tworzymy, potem kasujemy. */
async function _przenies(item, cel, { flagi = {}, usunFlagi = [], system = {} } = {}) {
  const zrodlo = item.actor;
  const mag = item.flags?.[MODULE_ID]?.loadedMag ? zrodlo.items.get(item.flags[MODULE_ID].loadedMag) : null;
  const dane = item.toObject();
  delete dane._id;
  foundry.utils.mergeObject(dane, { system, flags: { [MODULE_ID]: flagi } });
  for (const k of usunFlagi) delete dane.flags?.[MODULE_ID]?.[k];
  const doUtworzenia = [dane];
  if (mag) {
    const m = mag.toObject();
    delete m._id;
    doUtworzenia.push(m);
  }
  const nowe = await cel.createEmbeddedDocuments("Item", doUtworzenia);
  if (mag && nowe[1]) await nowe[0].setFlag(MODULE_ID, "loadedMag", nowe[1].id);
  await zrodlo.deleteEmbeddedDocuments("Item", [item.id, ...(mag ? [mag.id] : [])], { [OPCJA_MONTAZU]: true });
  return nowe[0];
}

/**
 * MG: broń zgodna z obsadą stanowisk — strzelec na miejscu ma broń u siebie, puste stanowisko — w ładowni.
 * @param {TokenDocument} pojazdDoc
 */
export async function synchronizujBron(pojazdDoc) {
  if (!game.user.isGM || !jestZetonemPojazdu(pojazdDoc)) return;
  const pojazd = pojazdDoc.actor;
  const zajete = zajeteMiejsca(pojazdDoc);
  for (const { item, stanowisko, u } of bronStanowisk(pojazd)) {
    const strzelec = zajete.get(stanowisko)?.actor ?? null;
    if (strzelec && u !== strzelec) {
      const waga = item.system?.weight?.value ?? 0;
      await _przenies(item, strzelec, {
        flagi: { [FLAGA_ZAMONTOWANA]: { pojazd: pojazd.uuid, stanowisko, waga } }, usunFlagi: [FLAGA_STANOWISKO],
        system: { equipped: true, weight: { value: 0 } }
      });
    } else if (!strzelec && u !== pojazd) {
      const z = item.flags[MODULE_ID][FLAGA_ZAMONTOWANA];
      await _przenies(item, pojazd, {
        flagi: { [FLAGA_STANOWISKO]: stanowisko }, usunFlagi: [FLAGA_ZAMONTOWANA],
        system: { equipped: false, weight: { value: z?.waga ?? 0 } }
      });
    }
  }
}

/** MG: montaż od ręki (pojazd z katalogu, z fabuły) — broń z ładowni na stanowisko. */
export async function zamontujOdReki(pojazdDoc, item, stanowisko) {
  if (!game.user.isGM) return;
  const m = miejsceOId(pojazdDoc.actor, stanowisko);
  if (!m?.stanowisko) return ui.notifications.warn("To nie jest stanowisko broni.");
  let bron = item;
  if (item.actor !== pojazdDoc.actor) bron = await _przenies(item, pojazdDoc.actor);
  await bron.setFlag(MODULE_ID, FLAGA_STANOWISKO, stanowisko);
  await synchronizujBron(pojazdDoc);
}

/** Zdjęcie ze stanowiska — od ręki (Drobnostka bez kosztów, 1k4 × 10 min na karcie). */
export async function zdejmij(pojazdDoc, item) {
  if (!game.user.isGM && !pojazdDoc.actor.isOwner) return ui.notifications.warn("Zdejmuje właściciel pojazdu albo MG.");
  return doMG("pojazd.zdejmij", { pojazd: pojazdDoc.uuid, bron: item.uuid }, { nosiciel: game.user.character });
}

async function _zdejmijMG(_n, { pojazd, bron }) {
  const p = await fromUuid(pojazd);
  let item = await fromUuid(bron);
  if (!p || !item) return;
  if (jestZamontowana(item)) {
    const z = item.flags[MODULE_ID][FLAGA_ZAMONTOWANA];
    item = await _przenies(item, p.actor, { flagi: { [FLAGA_STANOWISKO]: z.stanowisko }, usunFlagi: [FLAGA_ZAMONTOWANA],
      system: { equipped: false, weight: { value: z.waga ?? 0 } } });
  }
  await item.unsetFlag(MODULE_ID, FLAGA_STANOWISKO);
  const r = await new Roll("1d4").evaluate();
  await wyslijKarte(kartaPostoju({
    ikona: item.img, tytul: "Broń zdjęta ze stanowiska", rodzaj: "praca",
    linie: [`${esc(item.name)} leży w ładowni ${esc(p.name)}. Drobnostka: ${r.total * 10} min (1k4 × 10).`],
    przyciski: [{ akcja: "pojazd.czas", label: `Przesuń czas o ${r.total * 10} min`, gm: true, ikona: "fa-solid fa-clock", dane: { minuty: r.total * 10 } }]
  }), { actor: p.actor, rolls: [r] });
}

/**
 * Montaż jako Robota (D16): przepis Trochę roboty od ceny broni. Wykonawca — postać gracza (albo MG za kogoś).
 * @param {TokenDocument} pojazdDoc
 * @param {Item} item       broń (w ładowni pojazdu albo u wykonawcy)
 * @param {string} stanowisko
 * @param {Actor} wykonawca
 * @param {{stopien?: string, mimoBrakow?: boolean}} [o]
 */
export async function zamontujRobota(pojazdDoc, item, stanowisko, wykonawca, { stopien = "troche", mimoBrakow = false } = {}) {
  const m = miejsceOId(pojazdDoc.actor, stanowisko);
  if (!m?.stanowisko) return ui.notifications.warn("To nie jest stanowisko broni.");
  const t = NAPRAWA[stopien];
  const cena = Number(item.system?.price?.value) || 0;
  const gb = Math.max(1, Math.ceil(cena * t.koszt));
  const roll = await new Roll(t.kosci).evaluate();
  const minuty = roll.total * (t.jednostka === "h" ? 60 : 1);
  const przepis = {
    id: `montaz/${item.id}/${stanowisko}`, nazwa: `Montaż: ${item.name} → ${pojazdDoc.name}`,
    wynik: { typ: "skutek", ref: "pojazd.montaz", ilosc: 1, dane: { pojazd: pojazdDoc.uuid, bron: item.uuid, stanowisko } },
    jednorazowy: false, cena, wartosc: cena, st: t.st, minuty,
    surowce: [{ typy: ["CZ"], gb: Math.ceil(gb / 2) }, { typy: ["MK"], gb: Math.floor(gb / 2) }].filter(l => l.gb > 0),
    narzedzia: "mechanika | rusznikarza", tagi: [], profesja: null, zrodlo: { montaz: true }
  };
  const robota = await startRoboty(wykonawca, przepis, { mimoBrakow, img: item.img });
  if (robota) await wyslijKarte(kartaPostoju({
    ikona: item.img, tytul: "Montaż broni — Robota", rodzaj: "praca",
    linie: [`${esc(item.name)} na stanowisko „${esc(m.strefa)}” w ${esc(pojazdDoc.name)}: ${t.label}, ST ${t.st}, ${gb} gb surowców, czas ${t.kosci.replace("d", "k")} ${t.jednostka} → ${minuty} min.`]
  }), { actor: wykonawca, rolls: [roll] });
  return robota;
}

async function _montazMG(_n, { pojazd, bron, stanowisko }) {
  const p = await fromUuid(pojazd);
  const item = await fromUuid(bron);
  if (p && item) await zamontujOdReki(p, item, stanowisko);
}

export function registerBron() {
  // K2: broń zamontowana zabrana strzelcowi inaczej niż przez stanowisko (przeciągnięcie na innego aktora, upuszczenie
  // na ziemię, skasowanie) — oznaczone, nie blokowane (D7). Lalka ostrzega sama przy schowaniu i upuszczeniu.
  Hooks.on("preDeleteItem", (item, options) => {
    if (!jestZamontowana(item) || options?.[OPCJA_MONTAZU] || options?.neuroDoll) return;
    ui.notifications.warn(`${item.name}: broń zamontowana w pojeździe — wraca do pojazdu przy opuszczeniu stanowiska; `
      + "zabrana stąd zniknie ze stanowiska (MG cofa, jeśli to się nie wydarzyło).");
  });
  zarejestrujSkutek("pojazd.montaz", async (dane) => {
    await doMG("pojazd.montaz", dane, { nosiciel: game.user.character });
    return "broń na stanowisku";
  });
  zarejestrujProsbe("pojazd.montaz", _montazMG);
  zarejestrujProsbe("pojazd.zdejmij", _zdejmijMG);

  // Zmiana obsady (wsiadka, przesiadka, wysiadka, wypadnięcie) → broń za strzelcem.
  Hooks.on("neuroshima.pojazdZaloga", pojazdDoc => {
    if (game.user.isActiveGM) synchronizujBron(pojazdDoc).catch(err => console.error(`${MODULE_ID} | broń montowana`, err));
  });
  // Śmierć strzelca: broń wraca do pojazdu (D16).
  Hooks.on("updateActor", (actor, changes) => {
    if (!game.user.isActiveGM || foundry.utils.getProperty(changes, "system.attributes.hp.value") !== 0) return;
    for (const i of actor.items.filter(jestZamontowana)) {
      const p = fromUuidSync(i.flags[MODULE_ID][FLAGA_ZAMONTOWANA].pojazd);
      const tok = p?.token ?? p?.getActiveTokens?.(false, true)?.[0];
      if (tok) _przenies(i, p, { flagi: { [FLAGA_STANOWISKO]: i.flags[MODULE_ID][FLAGA_ZAMONTOWANA].stanowisko },
        usunFlagi: [FLAGA_ZAMONTOWANA], system: { equipped: false, weight: { value: i.flags[MODULE_ID][FLAGA_ZAMONTOWANA].waga ?? 0 } } });
    }
  });
  // Start świata: broń u kogoś, kto nie siedzi już na stanowisku, wraca.
  Hooks.once("ready", async () => {
    if (!game.user.isActiveGM) return;
    for (const s of game.scenes) for (const t of s.tokens) if (jestZetonemPojazdu(t)) await synchronizujBron(t).catch(() => {});
  });
  // Pojemność stanowisk: tylko miejsca-stanowiska przyjmują broń.
  Hooks.on("preUpdateItem", (item, changes) => {
    const s = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAGA_STANOWISKO}`);
    if (!s || !jestPojazdem(item.actor)) return;
    if (!miejscaPojazdu(item.actor).some(m => m.id === s && m.stanowisko)) return false;
  });
}
