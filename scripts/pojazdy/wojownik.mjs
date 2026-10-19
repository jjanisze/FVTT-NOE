/**
 * Neuroshima 5e — Wojownik autostrady poza pościgiem (PLAN_m4_pojazdy E7; RAW s. 88–89, Twardziel).
 *
 * Trzy zdolności do wyboru na 3., 6. i 11. poziomie — każda to jeden przedmiot z `abilityId`
 * (`class-features-data.mjs`):
 *
 *  - **Drzwi w drzwi** — *Rajdowiec*: w walce (i pościgu) Testy MDR (Pojazdy) z Ułatwieniem, Szybkość
 *    pojazdu +50%; *Konwojent*: bez Utrudnienia za niestabilne podłoże (`jazda.mjs`, źródło okoliczności);
 *    *Taranowanie*: potrąceni mają Utrudnienie do RO na Zręczność (karta Potrącenia).
 *  - **Kaskader** — schody, skok przez przepaść 4× długości pojazdu po 60 m rozbiegu, dwa koła: Test MDR
 *    (Pojazdy) ST 15 z Ułatwieniem; porażka — małe uszkodzenia, o 5+ — awaria i obrażenia jadących (karta).
 *  - **Pancerna fura** — *OC*: kierowca pojazdu mechanicznego dającego osłonę, w ruchu — on i jadący +mod. MDR
 *    do TT (efekt zakładany i zdejmowany przez MG); *AC [B]*: uruchomienie i zatrzymanie w akcji bonusowej
 *    (`silnik.mjs` pisze to na karcie).
 *
 * Pościgowa część Rajdowca i manewry — część 2 planu.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { MODULE_ID, danePojazdu, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, miejsceOId, pojazdJadacego } from "./stan.mjs";
import { jedzie, kierowcaPojazdu } from "./jadacy.mjs";
import { kartaObrazen, zaproponujAwarie } from "./awarie.mjs";
import { ustawCzasUruchomienia } from "./silnik.mjs";

export const ZDOLNOSCI = { drzwi: "drzwi-w-drzwi", kaskader: "kaskader", fura: "pancerna-fura" };
const FLAGA_OC = "ocPancernejFury";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Czy aktor ma zdolność Wojownika autostrady (przedmiot z `abilityId`). */
export function maZdolnosc(actor, id) {
  return !!actor?.items?.some(i => i.flags?.[MODULE_ID]?.abilityId === id);
}

/** Czy trwa walka albo pościg (Rajdowiec: „podczas walki, wyścigu i pościgu”). */
function walkaLubPoscig() {
  return !!game.combat?.started || !!canvas.scene?.flags?.[MODULE_ID]?.poscig;
}

/** Mnożnik Szybkości pojazdu od kierowcy (Rajdowiec: +50% w walce i pościgu). */
export function mnoznikSzybkosci(pojazdDoc) {
  const kier = kierowcaPojazdu(pojazdDoc);
  return kier && maZdolnosc(kier.actor, ZDOLNOSCI.drzwi) && walkaLubPoscig() ? 1.5 : 1;
}

/** Rajdowiec: Ułatwienie do Testów MDR (Pojazdy) w walce i pościgu. */
function _onPreRollSkill(config) {
  if (config?.skill !== "poj" || !walkaLubPoscig()) return;
  if (!maZdolnosc(config.subject, ZDOLNOSCI.drzwi)) return;
  config.advantage = true;
}

/* -------------------------------------------- */
/*  Kaskader                                     */
/* -------------------------------------------- */

const TRIKI = { schody: "Schody to też jezdnia", skok: "Skoczek (przepaść do 4× długości pojazdu, 60 m rozbiegu)", dwaKola: "Na dwóch kółkach" };

/** Trik kaskaderski: Test MDR (Pojazdy) ST 15 z Ułatwieniem; porażka — małe uszkodzenia, o 5+ — awaria i obrażenia jadących. */
export async function trikKaskadera(pojazdDoc, trik = "dwaKola") {
  const kier = kierowcaPojazdu(pojazdDoc);
  if (!kier?.actor?.isOwner) return ui.notifications.warn("Trik wykonuje kierowca.");
  if (!maZdolnosc(kier.actor, ZDOLNOSCI.kaskader)) return ui.notifications.warn(`${kier.name} nie ma zdolności Kaskader.`);
  if (!danePojazdu(pojazdDoc.actor)?.katalog.silnik) return ui.notifications.warn("Kaskader działa w pojeździe silnikowym.");
  const rolls = await kier.actor.rollSkill({ skill: "poj", target: 15, advantage: true }, {},
    { data: { flavor: `Kaskader — ${TRIKI[trik] ?? trik}: Test MDR (Pojazdy) ST 15 z Ułatwieniem` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r || r.total >= 15) return;
  const zaDuzo = 15 - r.total >= 5;
  await wyslijKarte(kartaPostoju({
    ikona: pojazdDoc.texture.src, tytul: "Kaskader — porażka", rodzaj: "porazka",
    linie: [`${esc(kier.name)}: ${r.total} przy ST 15 — ${zaDuzo ? "awaria pojazdu i obrażenia jadących" : "pojazd ma małe uszkodzenia"} (s. 89).`],
    przyciski: [{ akcja: "pojazd.kaskaderSkutek", label: zaDuzo ? "Awaria i 2k6 jadącym" : "Małe uszkodzenia: 1k10", gm: true,
      ikona: "fa-solid fa-car-burst", dane: { pojazd: pojazdDoc.uuid, duza: zaDuzo ? 1 : 0 } }]
  }), { actor: kier.actor, szept: "gm" });
}

async function _kaskaderSkutek(_ev, btn) {
  if (!game.user.isGM) return;
  const p = await fromUuid(btn.dataset.pojazd);
  if (!p) return;
  if (btn.dataset.duza === "1") {
    await zaproponujAwarie(p.actor, "Kaskader: porażka o 5+");
    await kartaObrazen(p, "2d6", "bludgeoning", { tytul: "Kaskader — obrażenia jadących", bezPojazdu: true, zJadacymi: true });
  } else {
    await kartaObrazen(p, "1d10", "bludgeoning", { tytul: "Kaskader — małe uszkodzenia", zJadacymi: false });
  }
  btn.disabled = true;
}

/* -------------------------------------------- */
/*  Pancerna fura — OC                           */
/* -------------------------------------------- */

/** Czy pojazd daje jadącym jakąś osłonę (Otwarta rama — ½, i tak „jakaś”; motocykl s. 266 — ½). */
function dajeOslone(pojazdDoc) {
  return !!danePojazdu(pojazdDoc.actor)?.katalog.silnik;
}

/** MG: efekt OC na kierowcy i jadących, gdy pojazd jedzie; zdjęty, gdy stoi albo ktoś wysiadł. */
export async function synchronizujOC(pojazdDoc) {
  if (!game.user.isGM || !jestZetonemPojazdu(pojazdDoc)) return;
  const kier = kierowcaPojazdu(pojazdDoc);
  const premia = kier && maZdolnosc(kier.actor, ZDOLNOSCI.fura) && dajeOslone(pojazdDoc) && jedzie(pojazdDoc)
    ? Math.max(0, Number(kier.actor.system.abilities?.wis?.mod) || 0) : 0;
  const jadacy = new Set(jadacyPojazdu(pojazdDoc).map(t => t.actor).filter(Boolean));
  // Zdjęcie u tych, którzy wysiedli albo gdy premii nie ma.
  for (const a of game.actors.contents.concat([...jadacy])) {
    const ef = a.effects?.filter(e => e.flags?.[MODULE_ID]?.[FLAGA_OC]?.pojazd === pojazdDoc.uuid) ?? [];
    if (!ef.length) continue;
    if (!premia || !jadacy.has(a) || ef.some(e => e.flags[MODULE_ID][FLAGA_OC].premia !== premia)) {
      await a.deleteEmbeddedDocuments("ActiveEffect", ef.map(e => e.id));
    }
  }
  if (!premia) return;
  for (const a of jadacy) {
    if (a.effects.some(e => e.flags?.[MODULE_ID]?.[FLAGA_OC]?.pojazd === pojazdDoc.uuid)) continue;
    await a.createEmbeddedDocuments("ActiveEffect", [{
      name: `OC — Pancerna fura (+${premia} TT)`, img: "icons/svg/holy-shield.svg",
      description: `<p>Kierowca ${esc(kier.name)} (Pancerna fura, s. 89): +mod. MDR do TT jadących, dopóki pojazd jedzie.</p>`,
      system: { changes: [change("system.attributes.ac.bonus", CHANGE_TYPE.add, String(premia))] },
      flags: { [MODULE_ID]: { [FLAGA_OC]: { pojazd: pojazdDoc.uuid, premia } } }
    }]);
  }
}

/** Czas uruchomienia dla kierowcy: „bonus” z Pancerną furą (AC [B]), inaczej „akcja”. */
export function czasUruchomienia(pojazdDoc) {
  const kier = kierowcaPojazdu(pojazdDoc);
  return kier && maZdolnosc(kier.actor, ZDOLNOSCI.fura) ? "bonus" : "akcja";
}

export function registerWojownik() {
  ustawCzasUruchomienia(czasUruchomienia);
  Hooks.on("dnd5e.preRollSkill", _onPreRollSkill);
  zarejestrujAkcje("pojazd.kaskaderSkutek", _kaskaderSkutek);
  const oc = doc => { if (game.user.isActiveGM) synchronizujOC(doc).catch(err => console.error(`${MODULE_ID} | OC`, err)); };
  Hooks.on("neuroshima.pojazdZaloga", oc);
  Hooks.on("moveToken", doc => { if (jestZetonemPojazdu(doc)) setTimeout(() => oc(doc), 300); });
  Hooks.on("updateCombat", (combat, ch) => {
    if (!("round" in ch) || !game.user.isActiveGM) return;
    for (const t of combat.scene?.tokens ?? []) if (jestZetonemPojazdu(t)) oc(t);
  });
}
