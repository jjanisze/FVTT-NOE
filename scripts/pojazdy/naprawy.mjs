/**
 * Neuroshima 5e — naprawy pojazdu, karoseria i Odbudowa wraku (PLAN_m4_pojazdy §4.9, D19 — improwizacja do weta).
 *
 * Wzór: naprawa drona z M3 (`actors/drony-naprawa.mjs`) i tabela Naprawiania s. 146. Naprawa M2
 * (`production/naprawa.mjs`) dostaje **aktora pojazdu** jako cel (uuid celu Roboty), gotowe części i dane
 * dla skutku; skutek wraca tu przez `zarejestrujNaprawe` (zdejmuje awarię albo odbudowuje wrak) i — gdy kończy
 * gracz bez dostępu do pojazdu — przez przekaźnik MG.
 *
 *  - **Cena części** = 10% ceny pojazdu; od niej procenty tabeli s. 146 (Osobówka: 10 / 30 / 50 gb).
 *  - **Tymczasowa** (jazda): akcja + test o ST „jazda”, sukces zawiesza skutek na minutę (10 rund), potem wraca.
 *    Narzędzia małego mechanika albo coś, co MG uzna (wtedy INT i oznaczenie). Bez kolumny „jazda” — tylko postój.
 *  - **Fachowa** (postój): ST „postój” wyznacza stopień — 10 Drobnostka, 15 Trochę roboty, 20 Skomplikowana
 *    harówa; narzędzia małego mechanika (awaria 17 — mechanika albo elektronika). Awaria 16: najpierw SIŁ
 *    (Atletyka) ST 15 na maskę.
 *  - **Karoseria (PW)**: godzina pracy = 2k6 + mod. INT, narzędzia małego mechanika; surowce: przywrócone PW ×
 *    10% ceny / maks. PW (cała karoseria za 10% ceny).
 *  - **Odbudowa wraku**: Skomplikowana harówa od ceny pojazdu (ST 20, 50% ceny), 2k4 h × rozmiar (Duża ×1,
 *    Wielka ×2, Ogromna ×4); potem 1 PW i jedna losowa awaria-„pamiątka”.
 */

import { NAPRAWA, podzielBudzet, alokujSurowce, fmtGGMM } from "../config/production-rules.mjs";
import { KATALOG } from "../config/recipes-data.mjs";
import { rozpocznijNaprawe, zarejestrujNaprawe, przepisNaprawy, rzucCzas } from "../production/naprawa.mjs";
import { start as startRoboty } from "../production/robota.mjs";
import { allGb, takeManySurowce } from "../actors/surowce-store.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { MODULE_ID, danePojazdu, jestPojazdem } from "./stan.mjs";
import { AWARIE_POJAZDOW, FLAGA_AWARIA, efektyAwarii, zastosujAwarie, zawiesAwarie } from "./awarie.mjs";
import { cofnijWrak, jestWrakiem } from "./wrak.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const MNOZNIK_ODBUDOWY = { med: 1, lg: 1, huge: 2, grg: 4 };

/** Stopień naprawy fachowej z ST „postój”. */
export function stopienZST(st) {
  return st >= 20 ? "harowa" : st >= 15 ? "troche" : "drobnostka";
}

/** Cena pojazdu w gamblach (cena sztuki, a bez niej podwozia). */
export function cenaPojazdu(actor) {
  return Number(actor?.system?.attributes?.price?.value) || danePojazdu(actor)?.podstawa?.cena || 0;
}

/** Części (gb wg profilu przepisu pojazdu) dla kwoty — `{CZ: n, MK: m}`. */
export function czesciZaKwote(actor, gb) {
  const id = danePojazdu(actor)?.podwozie;
  const profil = KATALOG.get(`pojazd:${id}`)?.profil ?? [{ typy: ["MK"], waga: 1 }];
  const out = {};
  for (const l of podzielBudzet(gb, profil)) out[l.typy[0]] = (out[l.typy[0]] ?? 0) + l.gb;
  return out;
}

/** Koszt naprawy fachowej awarii (gb): % stopnia × cena części (10% ceny pojazdu). */
export function kosztNaprawyAwarii(actor, stopien) {
  return Math.max(1, Math.ceil(cenaPojazdu(actor) * 0.1 * NAPRAWA[stopien].koszt));
}

/** Koszt karoserii (gb) za przywrócone PW: cała karoseria = 10% ceny pojazdu. */
export function kosztKaroserii(actor, pw) {
  const max = Number(actor.system.attributes.hp.max) || 1;
  return Math.ceil(pw * cenaPojazdu(actor) * 0.1 / max);
}

const _efekt = (actor, id) => actor.effects.get(id) ?? null;
const _k20 = efekt => Number(efekt?.flags?.[MODULE_ID]?.[FLAGA_AWARIA]?.k20) || null;

/* -------------------------------------------- */
/*  Tymczasowa                                   */
/* -------------------------------------------- */

/** Naprawa tymczasowa w jeździe (akcja naprawiającego). */
export async function naprawTymczasowo(pojazdActor, efektId, naprawiajacy) {
  const e = _efekt(pojazdActor, efektId);
  const k20 = _k20(e);
  const a = AWARIE_POJAZDOW[k20];
  if (!a?.jazda) return ui.notifications.warn(`Awaria ${k20}: naprawa tylko na postoju.`);
  if (!naprawiajacy?.isOwner) return ui.notifications.warn("Naprawia twoja postać — zaznacz jej żeton.");
  const zestaw = hasToolKit(naprawiajacy, "mechanika");
  const flavor = `Naprawa tymczasowa: ${pojazdActor.name} — ${a.nazwa} (ST ${a.jazda})`;
  const rolls = zestaw
    ? await naprawiajacy.rollToolCheck({ tool: "mechanika", target: a.jazda }, {}, { data: { flavor } })
    : await naprawiajacy.rollAbilityCheck({ ability: "int", target: a.jazda }, {}, { data: { flavor: `${flavor} — bez narzędzi` } });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!Number.isFinite(roll?.total)) return null;
  return doMG("pojazd.naprawaTymczasowa", { pojazd: pojazdActor.uuid, efekt: efektId, wynik: roll.total, zestaw }, { nosiciel: naprawiajacy });
}

async function _tymczasowaMG(_n, { pojazd, efekt, wynik, zestaw }) {
  const actor = await fromUuid(pojazd);
  const e = actor ? _efekt(actor, efekt) : null;
  if (!e) return;
  const a = AWARIE_POJAZDOW[_k20(e)];
  const ok = wynik >= a.jazda;
  if (ok) await zawiesAwarie(actor, e);
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/hazard.svg", tytul: "Naprawa tymczasowa", rodzaj: ok ? "sukces" : "porazka",
    linie: [`${esc(actor.name)} — ${esc(a.nazwa)}: ${wynik} przy ST ${a.jazda}. `
      + (ok ? "Skutek zawieszony na <strong>minutę</strong> (10 rund), potem wraca (s. 264)." : "Nie udało się.")],
    ostrzezenia: zestaw ? [] : ["Bez narzędzi małego mechanika — MG decyduje, czy to, czym naprawiano, mogło pomóc."]
  }), { actor });
}

/* -------------------------------------------- */
/*  Fachowa                                      */
/* -------------------------------------------- */

/** Naprawa fachowa awarii na postoju — Drobnostka od razu, reszta jako Robota M2. */
export async function naprawFachowo(pojazdActor, efektId, naprawiajacy, { mimoBrakow = false } = {}) {
  const e = _efekt(pojazdActor, efektId);
  const k20 = _k20(e);
  const a = AWARIE_POJAZDOW[k20];
  if (!a?.postoj) return ui.notifications.warn(`Awaria ${k20} nie ma naprawy (s. 265).`);
  if (!naprawiajacy?.isOwner) return ui.notifications.warn("Naprawia twoja postać — zaznacz jej żeton.");
  if (k20 === 16) {
    const rolls = await naprawiajacy.rollSkill({ skill: "atl", target: 15 }, {}, { data: { flavor: "Zacięta maska — SIŁ (Atletyka) ST 15" } });
    const r = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!r || r.total < 15) return ui.notifications.warn("Maska nie puściła — naprawa czeka.");
  }
  const stopien = stopienZST(a.postoj);
  return rozpocznijNaprawe(naprawiajacy, pojazdActor, {
    stopien, narzedzia: k20 === 17 ? "mechanika | elektronika" : "mechanika", mimoBrakow,
    surowce: czesciZaKwote(pojazdActor, kosztNaprawyAwarii(pojazdActor, stopien)),
    zrodlo: { pojazdAwaria: k20 }, nazwa: `Naprawa ${pojazdActor.name}: ${a.nazwa}`
  });
}

/* -------------------------------------------- */
/*  Karoseria i Odbudowa                          */
/* -------------------------------------------- */

/** „Napraw karoserię” — godzina pracy: 2k6 + mod. INT PW, surowce wg PW. */
export async function naprawKaroserie(pojazdActor, naprawiajacy) {
  if (!naprawiajacy?.isOwner) return ui.notifications.warn("Naprawia twoja postać — zaznacz jej żeton.");
  if (jestWrakiem(pojazdActor)) return ui.notifications.warn("Wrak — najpierw Odbudowa.");
  const hp = pojazdActor.system.attributes.hp;
  const brak = Math.max(0, hp.max - hp.value);
  if (!brak) return ui.notifications.info(`${pojazdActor.name}: karoseria cała.`);
  const zestaw = hasToolKit(naprawiajacy, "mechanika");
  const mod = Number(naprawiajacy.system.abilities?.int?.mod) || 0;
  const roll = await new Roll(`2d6 + ${mod}`).evaluate();
  const pw = Math.min(brak, Math.max(0, roll.total));
  const koszt = kosztKaroserii(pojazdActor, pw);
  const czesci = czesciZaKwote(pojazdActor, koszt);
  const lines = Object.entries(czesci).map(([k, gb]) => ({ typy: [k], gb }));
  const alok = alokujSurowce(lines, allGb(naprawiajacy));
  if (!alok.ok) return ui.notifications.warn(`Brakuje surowców na karoserię: ${koszt} gb (${Object.entries(czesci).map(([k, v]) => `${v} ${k}`).join(", ")}).`);
  await takeManySurowce(naprawiajacy, alok.przydzial);
  await doMG("pojazd.karoseria", { pojazd: pojazdActor.uuid, pw, kto: naprawiajacy.name, koszt, zestaw }, { nosiciel: naprawiajacy });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/clockwork.svg", tytul: "Karoseria — godzina pracy", rodzaj: "praca",
    linie: [`${esc(naprawiajacy.name)} łata <strong>${esc(pojazdActor.name)}</strong>: 2k6 + INT = ${roll.total} → <strong>+${pw} PW</strong>.`,
      `Surowce: ${koszt} gb (${Object.entries(czesci).map(([k, v]) => `${v} ${k}`).join(", ")}).`],
    ostrzezenia: zestaw ? [] : ["Bez narzędzi małego mechanika — MG decyduje."],
    przyciski: [{ akcja: "pojazd.czas", label: "Przesuń czas o 1 h", gm: true, ikona: "fa-solid fa-clock", dane: { minuty: 60 } }]
  }), { actor: naprawiajacy, rolls: [roll] });
}

/** Odbudowa wraku — Robota Skomplikowanej harówy liczonej od ceny pojazdu, czas × rozmiar. */
export async function odbuduj(pojazdActor, naprawiajacy, { mimoBrakow = false } = {}) {
  if (!jestWrakiem(pojazdActor)) return ui.notifications.info(`${pojazdActor.name} nie jest wrakiem.`);
  if (!naprawiajacy?.isOwner) return ui.notifications.warn("Odbudowuje twoja postać — zaznacz jej żeton.");
  const mnoznik = MNOZNIK_ODBUDOWY[pojazdActor.system.traits?.size] ?? 1;
  const { minuty, roll } = await rzucCzas("harowa");
  const p = await przepisNaprawy(pojazdActor, "harowa", {
    minuty: minuty * mnoznik, narzedzia: "mechanika",
    surowce: czesciZaKwote(pojazdActor, Math.ceil(cenaPojazdu(pojazdActor) * NAPRAWA.harowa.koszt)),
    zrodlo: { pojazdOdbudowa: true }, nazwa: `Odbudowa: ${pojazdActor.name}`
  });
  const robota = await startRoboty(naprawiajacy, p, { mimoBrakow, rodzaj: "naprawa", cel: pojazdActor.uuid, img: pojazdActor.img });
  if (robota) await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/clockwork.svg", tytul: "Odbudowa wraku", rodzaj: "praca",
    linie: [`${esc(pojazdActor.name)}: Skomplikowana harówa (ST 20), 2k4 h × ${mnoznik} → <strong>${fmtGGMM(minuty * mnoznik)}</strong>.`]
  }), { actor: naprawiajacy, rolls: [roll] });
  return robota;
}

/* -------------------------------------------- */
/*  Skutek Roboty                                */
/* -------------------------------------------- */

async function _skutek(actor, przepis) {
  const z = przepis?.zrodlo ?? {};
  if (z.pojazdAwaria) {
    await doMG("pojazd.naprawaFachowa", { pojazd: actor.uuid, k20: z.pojazdAwaria }, { nosiciel: game.user.character });
    return `awaria ${z.pojazdAwaria} (${AWARIE_POJAZDOW[z.pojazdAwaria]?.nazwa}) naprawiona`;
  }
  if (z.pojazdOdbudowa) {
    await doMG("pojazd.odbudowa", { pojazd: actor.uuid }, { nosiciel: game.user.character });
    return "wrak odbudowany: 1 PW i losowa awaria-pamiątka";
  }
  return "naprawione (skutek rozstrzyga MG)";
}

async function _fachowaMG(_n, { pojazd, k20 }) {
  const actor = await fromUuid(pojazd);
  if (!actor) return;
  const ids = efektyAwarii(actor).filter(e => _k20(e) === Number(k20)).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

async function _odbudowaMG(_n, { pojazd }) {
  const actor = await fromUuid(pojazd);
  if (!actor) return;
  await cofnijWrak(actor);
  await actor.update({ "system.attributes.hp.value": 1 });
  for (const s of ["dead", "prone"]) if (actor.statuses?.has(s)) await actor.toggleStatusEffect(s, { active: false });
  const r = await new Roll("1d20").evaluate();
  await zastosujAwarie(actor, r.total, { zrodlo: "pamiątka po odbudowie" });
}

async function _karoseriaMG(_n, { pojazd, pw }) {
  const actor = await fromUuid(pojazd);
  if (!actor) return;
  const hp = actor.system.attributes.hp;
  await actor.update({ "system.attributes.hp.value": Math.min(hp.max, hp.value + Number(pw || 0)) });
}

export function registerNaprawy() {
  zarejestrujNaprawe({ test: x => x?.documentName === "Actor" && jestPojazdem(x), skutek: _skutek });
  zarejestrujProsbe("pojazd.naprawaTymczasowa", _tymczasowaMG);
  zarejestrujProsbe("pojazd.naprawaFachowa", _fachowaMG);
  zarejestrujProsbe("pojazd.odbudowa", _odbudowaMG);
  zarejestrujProsbe("pojazd.karoseria", _karoseriaMG);
  zarejestrujAkcje("pojazd.czas", async (_ev, btn) => {
    if (!game.user.isGM) return;
    await game.time.advance(Math.max(0, Number(btn.dataset.minuty) || 0) * 60);
    btn.disabled = true;
  });
}
