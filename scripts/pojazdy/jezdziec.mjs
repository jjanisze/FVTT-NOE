/**
 * Neuroshima 5e — zdolności jeździeckie (PLAN_m4_pojazdy §6.3, W5; M7: Jeździec s. 97, Rodeo s. 106, Zawsze w siodle s. 88).
 *
 *  - **TT wierzchowca + Premia Biegłości jeźdźca** — Jeździec (Wyjadacz Zwiadowcy) i Kawalerzysta (Rodeo), na czas
 *    jazdy w siodle. Jeden efekt na wierzchowcu (te same źródła się nie sumują), zakłada i zdejmuje aktywny MG po każdej
 *    zmianie obsady. Bestiariusz ustawia TT istot jako `override`, więc efekt dodaje do niego; inne — do `bonus`.
 *  - **Rodeo — Dżokej:** ujeżdżenie przyjaznego zwierzęcia o rozmiar większego, bez siodła — Test MDR (Tresura) ST 10 +
 *    mod. SIŁ istoty; sukces dopisuje jeźdźca do `wierzchowiec.ujezdzony` (wyszkolony tylko dla niego, W-U3).
 *  - **Zawsze w siodle:** po Długim odpoczynku karta MG — los zsyła konia albo motocykl (fabularne).
 *
 * Reszta Jeźdźca siedzi tam, gdzie mechanika: bez rąk i 1,5 m dosiadania — `jadacy.mjs`, bez Utrudnienia dystansowego —
 * `jazda.mjs` (atak z grzbietu).
 */

import { kartaPostoju, wyslijKarte } from "../postoj/karty.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { FLAGA_WIERZCHOWIEC, MODULE_ID, jestNosnikiem, profilNosnika, wierzchowiecAktora } from "./stan.mjs";
import { kierowcaPojazdu, maJezdzca } from "./jadacy.mjs";

const FLAGA_TT = "ttJezdzca";
const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Rodeo (Sztuczka): przedmiot z flagą `sztuczka: "rodeo"`. */
export function maRodeo(actor) {
  return !!actor?.items?.some(i => i.flags?.[MODULE_ID]?.sztuczka === "rodeo");
}

/** Premia do TT wierzchowca od jeźdźca w siodle (Jeździec albo Kawalerzysta) albo 0. Czysta względem dokumentów. */
export function premiaTTWierzchowca(jezdziec) {
  if (!jezdziec || !(maJezdzca(jezdziec) || maRodeo(jezdziec))) return 0;
  return Math.max(0, Number(jezdziec.system?.attributes?.prof) || 0);
}

/** Aktywny MG: efekt TT na wierzchowcu zgodny z jeźdźcem w siodle. */
export async function synchronizujTTWierzchowca(nosnikDoc) {
  if (!game.users.activeGM?.isSelf || profilNosnika(nosnikDoc?.actor) !== "wierzchowiec") return;
  const actor = nosnikDoc.actor;
  const jezdziec = kierowcaPojazdu(nosnikDoc)?.actor ?? null;
  const premia = premiaTTWierzchowca(jezdziec);
  const ef = actor.effects.filter(e => e.flags?.[MODULE_ID]?.[FLAGA_TT]);
  const zgodny = ef.length === 1 && ef[0].flags[MODULE_ID][FLAGA_TT].jezdziec === jezdziec?.uuid && ef[0].flags[MODULE_ID][FLAGA_TT].premia === premia;
  if (zgodny || (!premia && !ef.length)) return;
  if (ef.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ef.map(e => e.id));
  if (!premia) return;
  const klucz = Number.isFinite(actor._source?.system?.attributes?.ac?.override) ? "system.attributes.ac.override" : "system.attributes.ac.bonus";
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `${maJezdzca(jezdziec) ? "Jeździec" : "Kawalerzysta"}: TT +${premia}`, img: "icons/svg/shield.svg",
    description: `<p>${esc(jezdziec.name)} w siodle — TT wierzchowca + Premia Biegłości jeźdźca (s. ${maJezdzca(jezdziec) ? 97 : 106}).</p>`,
    system: { changes: [change(klucz, CHANGE_TYPE.add, String(premia))] },
    flags: { [MODULE_ID]: { [FLAGA_TT]: { jezdziec: jezdziec.uuid, premia } } }
  }]);
}

/* -------------------------------------------- */
/*  Rodeo — ujeżdżanie                           */
/* -------------------------------------------- */

/** Czy istotę da się ujeżdżać (przyjazna, ≥ 1 rozmiar większa od jeźdźca, nie nośnik pojazd). Oznaczenia. */
export function oznaczeniaUjezdzania(zwierze, jezdziec, przyjazna = true) {
  const out = [];
  const rz = ROZMIARY.indexOf(zwierze?.system?.traits?.size), rj = ROZMIARY.indexOf(jezdziec?.system?.traits?.size ?? "med");
  if (rz >= 0 && rj >= 0 && rz - rj < 1) out.push("Zwierzę musi być co najmniej o rozmiar większe od jeźdźca (s. 106).");
  if (!przyjazna) out.push("RAW: przyjazne zwierzę — MG rozstrzyga, czy to możliwe.");
  return out;
}

/**
 * Jeździec z Rodeo: Test MDR (Tresura) ST 10 + mod. SIŁ istoty; sukces — MG dopisuje go do `ujezdzony`.
 * @param {{configure?: boolean}} [opcje]  `configure: false` — bez okna rzutu (testy)
 */
export async function ujezdzaj(zwierzeDoc, jezdziecDoc, { configure = true } = {}) {
  const a = jezdziecDoc?.actor, z = zwierzeDoc?.actor;
  if (!a?.isOwner || !z) return ui.notifications.warn("Ujeżdża właściciel postaci z Rodeo.");
  if (!maRodeo(a)) return ui.notifications.warn(`${a.name} nie ma Sztuczki Rodeo.`);
  const st = 10 + (Number(z.system?.abilities?.str?.mod) || 0);
  const rolls = await a.rollSkill({ skill: "tre", target: st }, { configure }, { data: { flavor: `Rodeo — ujeżdżanie ${z.name}: MDR (Tresura) ST ${st}` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  const ok = r.total >= st;
  await wyslijKarte(kartaPostoju({ ikona: zwierzeDoc.texture?.src, tytul: `Rodeo: ${z.name}`, rodzaj: ok ? "sukces" : "porazka",
    linie: [`${esc(a.name)}: ${r.total} przy ST ${st} (10 + mod. SIŁ istoty, s. 106) — ${ok ? "zwierzę ujeżdżone: słucha tylko tego jeźdźca" : "zwierzę nie daje się dosiąść"}.`],
    ostrzezenia: oznaczeniaUjezdzania(z, a, (zwierzeDoc.disposition ?? 0) >= 0) }), { actor: a });
  if (ok) await doMG("pojazd.ujezdzony", { zwierze: zwierzeDoc.uuid, jezdziec: a.uuid }, { nosiciel: a });
}

async function _ujezdzonyMG(_n, { zwierze, jezdziec }, user) {
  const z = await fromUuid(zwierze);
  const j = fromUuidSync(jezdziec);
  if (!z?.actor || !j || (user && !user.isGM && !j.testUserPermission(user, "OWNER"))) return;
  const w = wierzchowiecAktora(z.actor) ?? { wyszkolony: false };
  const lista = new Set(Array.isArray(w.ujezdzony) ? w.ujezdzony : []);
  lista.add(jezdziec);
  await z.actor.setFlag(MODULE_ID, FLAGA_WIERZCHOWIEC, { ...w, ujezdzony: [...lista] });
}

/* -------------------------------------------- */
/*  Zawsze w siodle                              */
/* -------------------------------------------- */

async function _poOdpoczynku(actor, result, config) {
  const dlugi = result?.longRest ?? (config?.type === "long");
  if (!dlugi || !actor?.items?.some(i => i.flags?.[MODULE_ID]?.abilityId === "zawsze-w-siodle")) return;
  await wyslijKarte(kartaPostoju({ ikona: actor.img, tytul: "Zawsze w siodle", rodzaj: "info",
    linie: [`${esc(actor.name)} (Kowboj, s. 88): jeśli nie ma konia ani motocykla — los zsyła okazję, żeby go zdobyć. Nadaj mu imię; sprzedać go nie można.`] }),
    { szept: "gm" });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerJezdziec() {
  Hooks.on("neuroshima.pojazdZaloga", doc => { synchronizujTTWierzchowca(doc).catch(err => console.error(`${MODULE_ID} | TT wierzchowca`, err)); });
  zarejestrujProsbe("pojazd.ujezdzony", _ujezdzonyMG);
  Hooks.on("dnd5e.restCompleted", (actor, result, config) => { _poOdpoczynku(actor, result, config).catch(() => {}); });
}

/** HUD istoty (nie nośnika ani pojazdu): „Ujeżdżaj (Rodeo)” dla zaznaczonej postaci z Rodeo. */
export function przyciskUjezdzania(doc, zaznaczona) {
  if (!doc?.actor || (jestNosnikiem(doc.actor) && wierzchowiecAktora(doc.actor)?.wyszkolony)) return null;
  if (doc.actor.type !== "npc" || !zaznaczona || !maRodeo(zaznaczona.actor)) return null;
  return () => ujezdzaj(doc, zaznaczona);
}
