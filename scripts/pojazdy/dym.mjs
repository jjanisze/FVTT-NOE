/**
 * Neuroshima 5e — awaria 5: dym w kabinie (PLAN_m4_pojazdy §4.8, D44, pakiet K3; RAW s. 265).
 *
 * „Gryzący dym w kabinie — obszar całkowicie przesłonięty.” Skutek mierzalny, więc [Zastosuj] go stosuje (D5):
 *
 *  1. **Obszar** — Region przypięty do żetonu pojazdu (`attachment.token`, jak ogień zaporowy D29): koło w obrysie
 *     pojazdu, jedzie z nim, widać granicę. Na nim chmura JB2A (Sequencer, trwała, przypięta), gdy moduł jest.
 *  2. **Oślepienie** jadących na **zakrytych** miejscach — własny efekt z flagą `dymPojazdu` (nie cudze Oślepienie z
 *     granatu). Otwarte miejsca (właz, paka, siodła) siedzą w dymie z zewnątrz — bez zmian.
 *
 * Uzgadnia aktywny MG jedną funkcją (`uzgodnijDym`) po [Zastosuj], posadzeniu, przesiadce, wysiadce (hak
 * `neuroshima.pojazdZaloga`) i po każdej zmianie efektu awarii 5: naprawa usuwa efekt, naprawa tymczasowa go wyłącza
 * na minutę — w obu razach dym i Oślepienie znikają, a po minucie wracają. Zachowanie Regionu
 * `applyActiveEffect` rdzenia nie niesie mechaniki: wejścia przy `displace` jadących są niepewne.
 */

import { seqEffect, seqEndEffect } from "../weapons/sequencer.mjs";
import { MODULE_ID, danePojazdu, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, kratkaPojazdu, miejsceOId } from "./stan.mjs";
import { otwarteMiejsce } from "./prezentacja.mjs";

const FLAGA_DYMU = "dymPojazdu";
const FLAGA_REGIONU = "dymAwarii";
const CHMURA = ["jb2a.smoke.plumes_loop.01", "jb2a.fog_cloud.1.white"];
const nazwaChmury = pojazdDoc => `neuro-dym-awaria-${pojazdDoc.id}`;

/** Czy pojazd ma aktywną awarię 5 (efekt włączony; naprawa tymczasowa go wyłącza). */
export function dymWKabinie(actor) {
  return !!actor?.effects?.some(e => !e.disabled && e.flags?.[MODULE_ID]?.awariaPojazdu?.k20 === 5);
}

/**
 * Kto ma być oślepiony: jadący na zakrytych miejscach, gdy w kabinie jest dym. Czysta względem kanwy.
 * @param {{zakryte: boolean, dym: boolean}[]} jadacy
 */
export function oslepieniWDymie(jadacy, dym) {
  return dym ? jadacy.filter(j => j.zakryte) : [];
}

function _efektyDymu(actor, pojazdUuid) {
  return actor?.effects?.filter(e => e.flags?.[MODULE_ID]?.[FLAGA_DYMU] === pojazdUuid) ?? [];
}

/** Aktywny MG: Region, chmura i Oślepienie zgodne z awarią 5 i składem jadących. */
export async function uzgodnijDym(pojazdDoc) {
  if (!game.users.activeGM?.isSelf || !jestZetonemPojazdu(pojazdDoc) || !pojazdDoc.parent) return;
  const actor = pojazdDoc.actor;
  const dym = dymWKabinie(actor);
  const scena = pojazdDoc.parent;
  const uuid = pojazdDoc.uuid;

  // Oślepienie: zakryci w dymie mają efekt, reszta — nie (także ci, którzy już wysiedli).
  const jadacy = jadacyPojazdu(pojazdDoc).map(t => ({ t, zakryte: !otwarteMiejsce(miejsceOId(actor, jazdaZetonu(t).miejsce)) }));
  const maja = new Set(oslepieniWDymie(jadacy.map(j => ({ ...j, dym })), dym).map(j => j.t.actor).filter(Boolean));
  const sprawdzeni = new Set();
  for (const t of scena.tokens) {
    const a = t.actor;
    if (!a || sprawdzeni.has(a)) continue;
    sprawdzeni.add(a);
    const ef = _efektyDymu(a, uuid);
    if (maja.has(a) && !ef.length) {
      await a.createEmbeddedDocuments("ActiveEffect", [{
        name: `Dym w ${pojazdDoc.name}`, img: "icons/svg/blind.svg", statuses: ["blinded"],
        description: "<p>Awaria 5 (s. 265): gryzący dym w kabinie — obszar całkowicie przesłonięty. Mija po wyjściu na otwarte "
          + "miejsce, wysiadce albo naprawie.</p>",
        flags: { [MODULE_ID]: { [FLAGA_DYMU]: uuid } }
      }]);
    } else if (!maja.has(a) && ef.length) {
      await a.deleteEmbeddedDocuments("ActiveEffect", ef.map(e => e.id));
    }
  }

  // Obszar: Region przypięty do żetonu i chmura.
  const regiony = scena.regions.filter(r => r.flags?.[MODULE_ID]?.[FLAGA_REGIONU] === pojazdDoc.id);
  if (dym && !regiony.length) {
    const dane = danePojazdu(actor);
    const kp = kratkaPojazdu(scena);
    const c = pojazdDoc.getCenterPoint();
    const r = Math.max(dane.obrys.w, dane.obrys.h) * kp / 2;
    await scena.createEmbeddedDocuments("Region", [{
      name: `Dym — ${pojazdDoc.name} (awaria 5)`, color: "#5b5b5b",
      shapes: [{ type: "circle", x: c.x, y: c.y, radius: r }],
      visibility: CONST.REGION_VISIBILITY.ALWAYS,
      attachment: { token: pojazdDoc.id },
      flags: { [MODULE_ID]: { [FLAGA_REGIONU]: pojazdDoc.id } }
    }]).catch(err => console.warn(`${MODULE_ID} | dym: Region`, err));
    const plik = CHMURA.find(f => window.Sequencer?.Database?.entryExists?.(f));
    if (plik) {
      await seqEffect(plik, pojazdDoc, { attach: true, persist: true, name: nazwaChmury(pojazdDoc), opacity: 0.85,
        sizeSquares: Math.max(dane.obrys.w, dane.obrys.h) * kp / scena.grid.size, elevation: pojazdDoc.elevation ?? 0 });
    }
  } else if (!dym && regiony.length) {
    await scena.deleteEmbeddedDocuments("Region", regiony.map(r => r.id));
    seqEndEffect(nazwaChmury(pojazdDoc));
  }
}

/** Żetony pojazdu (aktor powiązany — wszystkie sceny, niepowiązany — jego żeton). */
function _zetony(actor) {
  if (actor.isToken) return [actor.token];
  return game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorId === actor.id && jestZetonemPojazdu(t)));
}

function _poZmianieAwarii(effect) {
  if (effect.flags?.[MODULE_ID]?.awariaPojazdu?.k20 !== 5 || !(effect.parent instanceof Actor)) return;
  for (const t of _zetony(effect.parent)) uzgodnijDym(t).catch(err => console.error(`${MODULE_ID} | dym`, err));
}

export function registerDym() {
  Hooks.on("neuroshima.pojazdZaloga", doc => { uzgodnijDym(doc).catch(err => console.error(`${MODULE_ID} | dym`, err)); });
  for (const h of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(h, _poZmianieAwarii);
}
