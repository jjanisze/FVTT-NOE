/**
 * Neuroshima 5e — Ctrl+X / Ctrl+V pojazdu z załogą (PLAN_m4_pojazdy §4.16, D22).
 *
 * Rdzeń 14 (`PlaceablesLayer#pasteObjects`) wycina między scenami tak: tworzy żetony na scenie docelowej z **tym samym
 * id**, jeśli jest wolne (`keepId`), potem kasuje oryginały z `{replacements}`; hak `pasteToken(objects, data, {cut})`
 * przychodzi przed utworzeniem. Moduł dokłada trzy rzeczy:
 *
 *  1. **Schowek bierze jadących.** `TokenLayer#_getCopyableObjects` dorzuca jadących zaznaczonego pojazdu — są ukryci,
 *     MG ich nie zaznaczy.
 *  2. **Wklejenie wiąże ich na nowo.** Flaga `jazda` wskazuje id żetonu pojazdu; przy kopii (nowe id) i przy kolizji id
 *     wskazywałaby stary pojazd. Pojazd w danych dostaje klucz `schowek`, jadący — ten sam klucz zamiast id; po
 *     utworzeniu aktywny MG przepina ich na nowy żeton i ustawia na miejscach w skali sceny docelowej (§4.14).
 *  3. **Mapa-znacznik (km):** jedzie sam pojazd. Postacie powiązane zostają w pamięci obsady (§4.15), a przy wycięciu
 *     ich żetony znikają ze sceny źródłowej; niepowiązani jadący (bandyci — ich PW żyją w delcie żetonu) zostają obok
 *     dawnego miejsca pojazdu, z ostrzeżeniem.
 *
 * Wycięcie w obrębie jednej sceny to aktualizacja z zachowanymi id — nic do przepinania, `zapiszPoRuchu` ustawia jadących.
 */

import {
  MODULE_ID, FLAGA_JAZDA, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, obrysDziala, rozmiarMiejsca
} from "./stan.mjs";
import { instrukcjePoRuchu } from "./zeton.mjs";
import { synchronizujZaloge, wysadzGM } from "./jadacy.mjs";

const FLAGA_SCHOWEK = "schowek";

/** Pojazdy wycięte na mapę-znacznik: id żetonu źródłowego → jadący, których schowek nie zabrał. */
const zostawieni = new Map();

function dorzucJadacych() {
  const TokenLayer = foundry.canvas.layers.TokenLayer;
  const original = TokenLayer.prototype._getCopyableObjects;
  TokenLayer.prototype._getCopyableObjects = function (options) {
    const obiekty = original.call(this, options);
    if (!obiekty.length) return obiekty;
    const out = [...obiekty];
    const ids = new Set(out.map(o => o.document.id));
    for (const o of obiekty) {
      if (!jestZetonemPojazdu(o.document)) continue;
      for (const j of jadacyPojazdu(o.document)) {
        if (j.object && !ids.has(j.id)) { out.push(j.object); ids.add(j.id); }
      }
    }
    return out;
  };
}

/** Jadący bez swojego pojazdu w schowku: wraca do własnego rozmiaru, bez miejsca. */
function odepnij(d) {
  const j = d.flags?.[MODULE_ID]?.[FLAGA_JAZDA];
  if (j?.rozmiar) { d.width = j.rozmiar.w; d.height = j.rozmiar.h; }
  if (Number.isFinite(j?.sort)) d.sort = j.sort;
  delete d.flags[MODULE_ID][FLAGA_JAZDA];
}

function naWklejenie(objects, data, { cut }) {
  const cel = canvas.scene;
  const zrodlo = objects[0]?.document.parent;
  if (!cel || !zrodlo) return;
  if (cut && zrodlo === cel) return; // aktualizacja z zachowanymi id
  const pojazdy = new Map();
  objects.forEach((o, i) => { if (jestZetonemPojazdu(o.document)) pojazdy.set(o.document.id, i); });
  const dziala = obrysDziala(cel);
  const doUsuniecia = [];
  for (let i = 0; i < objects.length; i++) {
    const j = jazdaZetonu(objects[i].document);
    if (!j) continue;
    if (!pojazdy.has(j.pojazd)) { odepnij(data[i]); continue; }
    if (!dziala) { doUsuniecia.push(i); continue; }
    data[i].width = data[i].height = rozmiarMiejsca(cel);
  }

  // Mapa-znacznik: jadący zostają poza danymi (przy wycięciu — także poza listą do skasowania przez rdzeń).
  if (doUsuniecia.length) {
    for (const i of doUsuniecia.reverse()) {
      const doc = objects[i].document;
      const pojazdId = jazdaZetonu(doc).pojazd;
      if (cut) {
        if (!zostawieni.has(pojazdId)) zostawieni.set(pojazdId, []);
        zostawieni.get(pojazdId).push(doc);
        objects.splice(i, 1);
      }
      data.splice(i, 1);
    }
    ui.notifications.info("Mapa podróży: pojazd jedzie bez żetonów załogi — postacie zostają w pamięci obsady.");
    return;
  }

  // Klucz zamiast id: przepina go aktywny MG po utworzeniu (§4.16).
  const klucze = new Map();
  for (const [id, i] of pojazdy) {
    const klucz = foundry.utils.randomID();
    klucze.set(id, klucz);
    foundry.utils.setProperty(data[i], `flags.${MODULE_ID}.${FLAGA_SCHOWEK}`, klucz);
  }
  for (let i = 0; i < objects.length; i++) {
    const j = data[i].flags?.[MODULE_ID]?.[FLAGA_JAZDA];
    if (!j?.pojazd || !klucze.has(j.pojazd)) continue;
    j.schowek = klucze.get(j.pojazd);
    j.pojazd = null;
  }
}

/** Aktywny MG: jadący z kluczem schowka → na nowy żeton pojazdu i na miejsca. */
async function dokonczWklejenie(pojazdDoc) {
  const klucz = pojazdDoc.flags?.[MODULE_ID]?.[FLAGA_SCHOWEK];
  const scena = pojazdDoc.parent;
  if (!klucz || !scena?.tokens.has(pojazdDoc.id)) return;
  const jadacy = scena.tokens.filter(t => t.flags?.[MODULE_ID]?.[FLAGA_JAZDA]?.schowek === klucz);
  if (jadacy.length) {
    await scena.updateEmbeddedDocuments("Token", jadacy.map(t => ({
      _id: t.id, [`flags.${MODULE_ID}.${FLAGA_JAZDA}.pojazd`]: pojazdDoc.id, [`flags.${MODULE_ID}.${FLAGA_JAZDA}.schowek`]: _del
    })));
  }
  await pojazdDoc.update({ [`flags.${MODULE_ID}.${FLAGA_SCHOWEK}`]: _del });
  const instrukcje = instrukcjePoRuchu(pojazdDoc);
  if (Object.keys(instrukcje).length) await scena.moveTokens(instrukcje, { animate: false, showRuler: false, method: "api" });
  await synchronizujZaloge(pojazdDoc);
}

/** Po całej paczce `createToken` (jeden takt MessageChannel — nie dławiony w karcie w tle). */
function poPaczce(fn) {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => fn().catch(err => console.error(`${MODULE_ID} | schowek pojazdu`, err));
  ch.port2.postMessage(0);
}

/** Czy pojazd czeka jeszcze na przepięcie jadących po wklejeniu (karta „Posadzić?” wtedy milczy). */
export function czekaNaWklejenie(pojazdDoc) {
  return !!pojazdDoc?.flags?.[MODULE_ID]?.[FLAGA_SCHOWEK];
}

export function registerSchowek() {
  Hooks.once("setup", dorzucJadacych);
  Hooks.on("pasteToken", naWklejenie);
  Hooks.on("createToken", doc => {
    if (game.user.isActiveGM && czekaNaWklejenie(doc)) poPaczce(() => dokonczWklejenie(doc));
  });
  // Wycięcie na mapę-znacznik: rdzeń kasuje pojazd ze sceny źródłowej z `replacements`; jadący, których schowek nie
  // zabrał, schodzą — powiązani znikają (są w pamięci obsady), niepowiązani zostają obok z ostrzeżeniem.
  Hooks.on("preDeleteToken", (doc, options) => {
    const reszta = zostawieni.get(doc.id);
    if (!reszta || !options.replacements?.[doc.id]) return;
    zostawieni.delete(doc.id);
    if (!game.user.isGM) return;
    const nowyUuid = options.replacements[doc.id];
    poPaczce(async () => {
      const powiazani = reszta.filter(t => t.actorLink && t.parent?.tokens.has(t.id));
      const obcy = reszta.filter(t => !t.actorLink && t.parent?.tokens.has(t.id));
      if (powiazani.length) await powiazani[0].parent.deleteEmbeddedDocuments("Token", powiazani.map(t => t.id));
      for (const t of obcy) await wysadzGM(t, { cel: { x: t._source.x, y: t._source.y }, zapomnij: false });
      if (!obcy.length) return;
      // Zostali — więc nie jadą: pojazd na mapie podróży o nich zapomina.
      const nowy = fromUuidSync(nowyUuid);
      if (nowy) await synchronizujZaloge(nowy, { zapomnij: obcy.map(t => t.actor?.uuid).filter(Boolean) });
      ui.notifications.warn(`Niepowiązani jadący zostali na scenie: ${obcy.map(t => t.name).join(", ")} — `
        + "na mapę podróży jedzie tylko pojazd.");
    });
  });
}
