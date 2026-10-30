/**
 * Neuroshima 5e — tura pościgu (PLAN_m4_pojazdy §6.2.5, P5a–P5e, D34–D40; RAW s. 266–268).
 *
 * Plansza (`poscig.mjs`) daje geometrię, część 1 — jazdę i jadących, paleta (`pojazdy/paleta.mjs`) — manewry. Tu jest to,
 * co dzieje się na krawędziach tur i rund walki na scenie planszy (runda pościgu = runda walki, D40):
 *
 *  - **Początek tury kierowcy** pojazdu z rolą: karta Testu Pościgu (ST ze środowiska; palety i Rajdowiec dokładają
 *    się same w rzucie) i budżetu w znacznikach z zapasem (D34). Rzut po kliknięciu kierowcy — wcześniej może wybrać
 *    manewr (D35). Wynik: nat. 20 — [+1 znacznik], porażka — [Losuj komplikację], nat. 1 — [Losuj dwie]; porażka o 6+
 *    — kartę awarii wystawia hak `awarie.mjs`.
 *  - **Koniec tury kierowcy:** zapas metrów (`poscig.zapas` na aktorze pojazdu); pojazd, który stał (Szybkość 0,
 *    wrak, oś, Hample bez dalszej jazdy) — [Cofnij o znacznik] (D34).
 *  - **Początek rundy:** dryf drogi (D38) — wypadnięci, przedmioty i rzeczy na drodze −3 znaczniki, karta mijanek;
 *    pojazdy bez kierowcy — [Cofnij o znacznik]; karta końca pościgu (D40).
 *  - **Kroki** (`poscig.kroki`): ruchy wymuszone, awarie, komplikacje, obrażenia, efekty — jeden wykonawca (MG, gracz
 *    przez przekaźnik). Komplikacja nie przesuwa niczego bez kliknięcia.
 *  - **Atak na kierowcę** (D36) — po obrażeniach kierowcy na planszy karta Testu (Pojazdy) ST max(10, ½ obrażeń).
 *  - **Wręcz na znaczniku** (D37) — uwaga w oknie ataku: ten sam znacznik = w zasięgu.
 *
 * Nic tu nie blokuje: karty oznaczają, MG klika (D7). [Zakończ pościg] wyłącza karty tury i dryf.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { zarejestrujZrodloOkolicznosci } from "../combat/okolicznosci.mjs";
import { krokNaprzod } from "../combat/tiki.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { SRODOWISKA } from "../config/vehicles-data.mjs";
import { FLAG_ROLA, FREEFORM_Y, LANE_W, MARGIN_X, PAS_GORA, poscigFlag, stan, torX, xNaTor } from "./poscig.mjs";
import {
  KOMPLIKACJE_POSCIGU, PRZEPASCI_K4, PRZESZKODY_K4, dryf, komplikacja, limitZnacznikow, przebyteZnaczniki,
  skutekAtakuNaKierowce, stAtakuNaKierowce, warunkiKonca, wynikTestuPoscigu, wZasieguWreczNaPlanszy, zapasPoTurze
} from "./poscig-zasady.mjs";
import { MODULE_ID, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, miejsceOId, pojazdJadacego } from "../pojazdy/stan.mjs";
import { kierowcaPojazdu } from "../pojazdy/jadacy.mjs";
import { budzetJazdy } from "../pojazdy/jazda.mjs";
import { nalozEfektPalety, paletaPojazdu, przyciskKrokow, przyciskTestuPoscigu, torPojazdu, uzyjPalety } from "../pojazdy/paleta.mjs";
import { aktywneAwariePojazdu, kartaObrazen, rzucAwarie, zastosujAwarie } from "../pojazdy/awarie.mjs";
import { jestWrakiem } from "../pojazdy/wrak.mjs";
import { GROUND_FLAG } from "../actors/ground-items.mjs";

const FLAGA_POSCIGU_POJAZDU = "poscigPojazdu";
const FLAGA_DRYF = "dryf";
const FLAGA_RZECZ = "rzeczNaDrodze";
const FLAGA_META = "metaPoscigu";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _json = v => { try { return JSON.parse(v || "[]"); } catch { return []; } };

/* -------------------------------------------- */
/*  Stan                                         */
/* -------------------------------------------- */

/** Czy na scenie trwa pościg (plansza, nie zakończony). */
export function trwaPoscig(scene) {
  const f = poscigFlag(scene);
  return !!f && !f.zakonczony;
}

/** Zapas metrów pojazdu (D34). */
export function zapasPojazdu(actor) {
  return Number(actor?.flags?.[MODULE_ID]?.[FLAGA_POSCIGU_POJAZDU]?.zapas) || 0;
}

/** Tor logiczny (numer znacznika z podręcznika): tor na planszy + przesunięcie recentrowania. */
export function torLogiczny(scene, tor) {
  return tor + (Number(poscigFlag(scene)?.offset) || 0);
}

/** Żeton pojazdu z rolą pościgu, którego kierowcą jest kombatant. */
function _pojazdKierowcy(combatant) {
  const tok = combatant?.token;
  const p = tok ? pojazdJadacego(tok) : null;
  if (!p || !trwaPoscig(p.parent) || !p.getFlag(MODULE_ID, FLAG_ROLA)) return null;
  return miejsceOId(p.actor, jazdaZetonu(tok).miejsce)?.kierowca ? p : null;
}

function _stNaScenie(scene) {
  const f = poscigFlag(scene);
  return Number(f?.st) || SRODOWISKA[f?.srodowisko]?.st || 5;
}

/** Droga pojazdu w tej turze kierowcy (flaga `tura` z `jazda.mjs`). */
function _drogaTury(actor, combat, combatantId) {
  const t = actor?.flags?.[MODULE_ID]?.tura;
  return t && t.walka === combat.id && t.kombatant === combatantId ? Number(t.droga) || 0 : 0;
}

/* -------------------------------------------- */
/*  Ruchy wymuszone                              */
/* -------------------------------------------- */

/**
 * MG: pojazd o `n` znaczników (torów), jadący jadą z nim; poza budżetem tury (`displace`), potem zwykłe recentrowanie.
 * @param {TokenDocument} pojazdDoc
 * @param {number} n  dodatnie — do przodu
 */
export async function przesunOZnaczniki(pojazdDoc, n) {
  if (!game.user.isGM || !pojazdDoc?.parent || !n) return;
  const src = pojazdDoc._source;
  await pojazdDoc.parent.moveTokens({ [pojazdDoc.id]: { destination: { x: src.x + n * LANE_W, y: src.y, action: "displace" } } },
    { animate: true, showRuler: false, method: "api" });
}

/* -------------------------------------------- */
/*  Kroki — jeden wykonawca                      */
/* -------------------------------------------- */

async function _szybkoscPolowa(pojazdDoc) {
  await pojazdDoc.actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Komplikacja 4: guma albo napęd — Szybkość ×½", img: "icons/svg/hazard.svg",
    description: "<p>Złapanie gumy albo uszkodzenie napędu (s. 267). Naprawa jak awaria 2 (s. 265).</p>",
    system: { changes: [change("system.attributes.movement.speeds.walk", CHANGE_TYPE.multiply, "0.5")] },
    flags: { [MODULE_ID]: { awariaPojazdu: { k20: 2, komplikacja: 4 } } }
  }]);
}

/** MG: RO jadących (komplikacje 9, 17, 18). */
async function _roJadacych(pojazdDoc, { ability, st, wzor = null, powalenie5 = false, kto = "pasazerowie", porazkaTekst = "", oslepienie = false }) {
  const kier = kierowcaPojazdu(pojazdDoc);
  const kogo = jadacyPojazdu(pojazdDoc).filter(t => (kto === "wszyscy" ? true : kto === "kierowca" ? t === kier : t !== kier));
  const linie = [];
  for (const t of kogo) {
    if (!t.actor) continue;
    const rolls = await t.actor.rollSavingThrow({ ability, target: st }, { configure: false },
      { data: { flavor: `Pościg — RO ${ability.toUpperCase()} ST ${st}`, speaker: ChatMessage.getSpeaker({ token: t }) } });
    const r = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!r) continue;
    if (r.total >= st) { linie.push(`${esc(t.name)}: ${r.total} — zdaje.`); continue; }
    const skutki = [];
    if (wzor) {
      const d = await new Roll(wzor).evaluate();
      await t.actor.applyDamage([{ value: d.total, type: "bludgeoning", properties: new Set() }]);
      skutki.push(`${d.total} obuchowych`);
    }
    if (powalenie5 && st - r.total >= 5 && !t.actor.statuses?.has("prone")) { await t.actor.toggleStatusEffect("prone", { active: true }); skutki.push("Powalenie"); }
    if (oslepienie) { await nalozEfektPalety(t.actor, "oslepienie"); skutki.push("Oślepienie do końca następnej tury"); }
    if (porazkaTekst) skutki.push(porazkaTekst);
    linie.push(`${esc(t.name)}: ${r.total} — <strong>${skutki.map(esc).join(", ") || "porażka"}</strong>.`);
  }
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `${pojazdDoc.name}: RO jadących`, rodzaj: "info",
    linie: linie.length ? linie : ["Nikt nie jedzie."] }), { szept: "gm" });
}

/** MG: przepaść z komplikacji 15 — rzecz na drodze znacznik przed pojazdem, dryfuje (D30, D38). */
async function _przepasc(pojazdDoc) {
  const k4 = await new Roll("1d4").evaluate();
  const metry = PRZEPASCI_K4[k4.total];
  const scene = pojazdDoc.parent;
  const tor = torPojazdu(pojazdDoc) + 1;
  await scene.createEmbeddedDocuments("Drawing", [{
    x: torX(tor) - LANE_W * 0.2, y: PAS_GORA, shape: { type: "r", width: LANE_W * 0.4, height: FREEFORM_Y - PAS_GORA },
    fillType: CONST.DRAWING_FILL_TYPES.SOLID, fillColor: "#1a1209", fillAlpha: 0.7, strokeWidth: 4, strokeColor: "#8a5a2b",
    text: `Przepaść ${metry} m`, fontSize: 36, textColor: "#f2e6c9",
    flags: { [MODULE_ID]: { [FLAGA_RZECZ]: { rodzaj: "przepasc", metry } } }
  }]);
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `Przepaść ${metry} m przed ${pojazdDoc.name}`, rodzaj: "test",
    linie: [`k4 = ${k4.total}: <strong>${metry} m</strong>. Zatrzymaj się (Hample) albo skacz; przepaść zostaje na drodze dla tych za pojazdem (s. 267).`],
    przyciski: [
      { akcja: "poscig.paleta", label: "Hample", ikona: "fa-solid fa-hand", wlasciciel: true, dane: { pojazd: pojazdDoc.uuid, id: "hample" } },
      { akcja: "poscig.paleta", label: "Skok", ikona: "fa-solid fa-arrow-up-right-dots", wlasciciel: true, dane: { pojazd: pojazdDoc.uuid, id: "skok" } }
    ] }), { actor: pojazdDoc.actor, rolls: [k4] });
}

/** MG: przeszkoda z komplikacji 14 — k4 rozmiar i obrażenia pojazdu. */
async function _przeszkoda(pojazdDoc) {
  const k4 = await new Roll("1d4").evaluate();
  const [rozmiar, wzor] = PRZESZKODY_K4[k4.total];
  await kartaObrazen(pojazdDoc, wzor, "bludgeoning", { tytul: `${pojazdDoc.name} potrąca przeszkodę (${rozmiar}, k4 = ${k4.total})`, zJadacymi: false });
}

/**
 * MG: wykonuje kroki z przycisku karty. Krok: `{znaczniki}`, `{awaria}`, `{awariaLos}`, `{komplikacja}`, `{obrazenia}`,
 * `{kontakt}`, `{efekt}`, `{szybkoscPolowa}`, `{trudnyTeren}`, `{przeszkoda}`, `{przepasc}`, `{roJadacych}`, `{test}`;
 * `pojazd` w kroku — inny pojazd niż przycisku (cel Stuknięcia, Zajechania).
 */
export async function wykonajKroki(pojazdDoc, kroki = []) {
  if (!game.user.isGM) return;
  for (const k of kroki) {
    const p = k.pojazd ? await fromUuid(k.pojazd) : pojazdDoc;
    if (!p?.actor) continue;
    if (k.znaczniki) await przesunOZnaczniki(p, k.znaczniki);
    if (k.awaria) await zastosujAwarie(p, k.awaria, { zrodlo: "pościg" });
    if (k.awariaLos) await rzucAwarie(p.actor);
    if (k.komplikacja) await losujKomplikacje(p, k.komplikacja);
    if (k.obrazenia) await kartaObrazen(p, k.obrazenia, "bludgeoning", { tytul: `${p.name}: ${k.obrazenia.replace("d", "k")} obrażeń`, zJadacymi: false });
    if (k.kontakt) await nalozEfektPalety(p.actor, "kontakt");
    if (k.efekt) await nalozEfektPalety(p.actor, k.efekt);
    if (k.szybkoscPolowa) await _szybkoscPolowa(p);
    if (k.trudnyTeren) await nalozEfektPalety(p.actor, "nawierzchnia");
    if (k.przeszkoda) await _przeszkoda(p);
    if (k.przepasc) await _przepasc(p);
    if (k.roJadacych) await _roJadacych(p, k.roJadacych);
    if (k.test) {
      const kier = kierowcaPojazdu(p);
      await wyslijKarte(kartaPostoju({ ikona: p.texture.src, tytul: `${p.name}: Test (Pojazdy) ST ${k.test.st}`, rodzaj: "test",
        linie: [kier ? `Kierowca ${esc(kier.name)} rzuca${k.test.utrudnienie ? " z Utrudnieniem" : ""}.` : "Nikt nie kieruje — MG rozstrzyga."],
        przyciski: kier ? [przyciskTestuPoscigu(p, { label: `Pojazdy ST ${k.test.st}`, ...k.test })] : [] }), { actor: kier?.actor ?? p.actor });
    }
  }
}

/* -------------------------------------------- */
/*  Komplikacje (P5b)                            */
/* -------------------------------------------- */

/** Przyciski komplikacji wg jej skutku. Czysta względem dokumentu (bierze tylko uuid). */
function _przyciskiKomplikacji(pojazdDoc, k) {
  const s = k.skutek, out = [];
  if (s.awaria) out.push(przyciskKrokow(pojazdDoc, "Losuj awarię", [{ awariaLos: true }], "fa-solid fa-wrench"));
  if (s.szybkoscPolowa) out.push(przyciskKrokow(pojazdDoc, "Zastosuj: Szybkość ×½", [{ szybkoscPolowa: true }], "fa-solid fa-wrench"));
  if (s.obrazenia) out.push(przyciskKrokow(pojazdDoc, `Zastosuj: ${s.obrazenia.replace("d", "k")}`, [{ obrazenia: s.obrazenia }], "fa-solid fa-car-burst"));
  if (s.kontakt) out.push(przyciskKrokow(pojazdDoc, "Zastosuj: bez kontaktu", [{ kontakt: true }], "fa-solid fa-eye-slash"));
  if (s.znaczniki) out.push(przyciskKrokow(pojazdDoc, `${s.znaczniki > 0 ? "+" : "−"}${Math.abs(s.znaczniki)} znacznik`, [{ znaczniki: s.znaczniki }]));
  if (s.trudnyTeren) out.push(przyciskKrokow(pojazdDoc, "Zastosuj: trudny teren", [{ trudnyTeren: true }], "fa-solid fa-road-circle-exclamation"));
  if (s.przepasc) out.push(przyciskKrokow(pojazdDoc, "Przepaść: k4 i rzecz na drodze", [{ przepasc: true }], "fa-solid fa-dungeon"));
  if (s.roJadacych) out.push(przyciskKrokow(pojazdDoc, `RO ${s.roJadacych.ability.toUpperCase()} ST ${s.roJadacych.st} — ${s.roJadacych.kto}`, [{ roJadacych: s.roJadacych }], "fa-solid fa-shield-halved"));
  if (s.test) out.push(przyciskTestuPoscigu(pojazdDoc, { label: `${s.test.umiejetnosc === "prc" ? "Percepcja" : "Pojazdy"} ST ${s.test.st}`, ...s.test }));
  return out;
}

/** MG: `ile` komplikacji k20 (s. 267) — karta na każdą, skutki pod przyciskami. */
export async function losujKomplikacje(pojazdDoc, ile = 1) {
  if (!game.user.isGM) return [];
  const out = [];
  for (let i = 0; i < ile; i++) {
    const r = await new Roll("1d20").evaluate();
    const k = komplikacja(r.total);
    out.push(r.total);
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/hazard.svg", tytul: `Komplikacja pościgu ${r.total}: ${k.nazwa}`, rodzaj: "test",
      podtytul: pojazdDoc.name, linie: [esc(k.opis)], przyciski: _przyciskiKomplikacji(pojazdDoc, k) }),
      { actor: pojazdDoc.actor, rolls: [r] });
  }
  return out;
}

/* -------------------------------------------- */
/*  Test Pościgu (P5a)                           */
/* -------------------------------------------- */

async function _kartaTestu(pojazdDoc, kier) {
  const st = _stNaScenie(pojazdDoc.parent);
  const b = budzetJazdy(pojazdDoc);
  const zapas = zapasPojazdu(pojazdDoc.actor);
  const limit = limitZnacznikow(b.limit, zapas);
  const f = poscigFlag(pojazdDoc.parent);
  const linie = [
    `Przed ruchem (s. 266): Test MDR (Pojazdy) ST <strong>${st}</strong> — ${esc(SRODOWISKA[f.srodowisko]?.nazwa ?? "środowisko")}${b.paleta.st ? ` (+${b.paleta.st} z ${esc(b.paleta.nazwy.join(", "))} — w rzucie)` : ""}.`,
    `Budżet: ${b.v} m${b.dodatkowy ? ` + ${b.dodatkowy} m (${esc(b.paleta.nazwy.join(", "))})` : ""}, zapas ${zapas} m → <strong>${limit}</strong> znaczników w tej turze (36 m = znacznik; Przyspieszenie kierowcy — więcej).`,
    "Manewr (Ostrożna jazda, Gazu!…) wybierz z palety przed rzutem."
  ];
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `Test Pościgu — ${pojazdDoc.name}`, rodzaj: "test", linie,
    przyciski: [{ akcja: "poscig.testPoscigu", label: `Rzuć: Pojazdy ST ${st}`, ikona: "fa-solid fa-dice-d20", wlasciciel: true,
      dane: { pojazd: pojazdDoc.uuid, st } }] }), { actor: kier.actor, flagi: { aktor: kier.actor.uuid } });
}

/** Kierowca: Test Pościgu z karty. Palety i Rajdowiec dokładają ST i Ułatwienie w haku rzutu. */
async function _testPoscigu(_ev, btn) {
  const pojazd = await fromUuid(btn.dataset.pojazd);
  const kier = pojazd ? kierowcaPojazdu(pojazd) : null;
  if (!kier?.actor?.isOwner) return ui.notifications.warn("Test Pościgu rzuca kierowca.");
  const st = Number(btn.dataset.st) || 10;
  const rolls = await kier.actor.rollSkill({ skill: "poj", target: st }, {}, { data: { flavor: `${pojazd.name}: Test Pościgu — MDR (Pojazdy) ST ${st}` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  const cel = Number(r.options?.target) || st;
  const w = wynikTestuPoscigu(r.total, cel, r.d20?.total ?? null);
  const linie = [`${esc(kier.name)}: <strong>${r.total}</strong> przy ST ${cel}.`];
  const przyciski = [];
  if (w.rodzaj === "nat20") { linie.push("Naturalna 20 — bez komplikacji i znacznik więcej (s. 266)."); przyciski.push(przyciskKrokow(pojazd, "+1 znacznik", [{ znaczniki: 1 }])); }
  if (w.rodzaj === "sukces") linie.push("Sukces — bez komplikacji.");
  if (w.rodzaj === "porazka") { linie.push("Porażka — komplikacja (s. 267)."); przyciski.push(przyciskKrokow(pojazd, "Losuj komplikację", [{ komplikacja: 1 }], "fa-solid fa-dice")); }
  if (w.rodzaj === "nat1") { linie.push("Naturalna 1 — dwie komplikacje."); przyciski.push(przyciskKrokow(pojazd, "Losuj dwie", [{ komplikacja: 2 }], "fa-solid fa-dice")); }
  if (w.awaria) linie.push("Porażka o 6 lub więcej — także rzut na Tabelę awarii (karta MG, s. 264).");
  await wyslijKarte(kartaPostoju({ ikona: pojazd.texture.src, tytul: `Test Pościgu — ${pojazd.name}`, rodzaj: w.komplikacje ? "porazka" : "sukces",
    linie, przyciski }), { actor: kier.actor, flagi: { aktor: kier.actor.uuid } });
}

/** Kierowca: test z przycisku (manewry, komplikacje) i karta skutku z [Zastosuj]. */
async function _testKierowcy(_ev, btn) {
  const pojazd = await fromUuid(btn.dataset.pojazd);
  const kier = pojazd ? kierowcaPojazdu(pojazd) : null;
  if (!kier?.actor?.isOwner) return ui.notifications.warn("Test rzuca kierowca.");
  const st = Number(btn.dataset.st) || 10;
  const skill = btn.dataset.umiejetnosc === "prc" ? "prc" : "poj";
  const rolls = await kier.actor.rollSkill({ skill, target: st, disadvantage: btn.dataset.utrudnienie === "1" }, {},
    { data: { flavor: `${pojazd.name}: ${skill === "prc" ? "MDR (Percepcja)" : "MDR (Pojazdy)"} ST ${st}` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  const cel = Number(r.options?.target) || st;
  const ok = r.total >= cel;
  const kroki = ok ? _json(btn.dataset.sukces) : [..._json(btn.dataset.porazka), ...(cel - r.total >= 5 ? _json(btn.dataset.porazka5) : [])];
  btn.disabled = true;
  if (!kroki.length) return;
  await wyslijKarte(kartaPostoju({ ikona: pojazd.texture.src, tytul: `${pojazd.name}: ${ok ? "sukces" : "porażka"}`, rodzaj: ok ? "sukces" : "porazka",
    linie: [`${esc(kier.name)}: ${r.total} przy ST ${cel}${!ok && cel - r.total >= 5 ? " (porażka o 5+)" : ""}.`],
    przyciski: [przyciskKrokow(pojazd, "Zastosuj", kroki, "fa-solid fa-check")] }), { actor: kier.actor, flagi: { aktor: kier.actor.uuid } });
}

/* -------------------------------------------- */
/*  Krawędzie tur i rund                         */
/* -------------------------------------------- */

async function _onTurnChange(combat, prior, current) {
  if (!game.users.activeGM?.isSelf || !krokNaprzod(prior, current)) return;
  // Koniec tury kierowcy: zapas, a pojazd, który stał — [Cofnij o znacznik].
  const pop = combat.combatants.get(prior?.combatantId);
  const pKoniec = _pojazdKierowcy(pop);
  if (pKoniec && prior?.round > 0) await _koniecTuryKierowcy(combat, pKoniec, pop);
  // Początek rundy (`combatRound` idzie przed zapisem i tylko u klikającego — więc tutaj): dryf, puste pojazdy, koniec.
  if ((current.round ?? 0) > (prior?.round ?? 0) && current.round > 1) await _poczatekRundy(combat, current.round);
  const bie = combat.combatants.get(current?.combatantId);
  const pStart = _pojazdKierowcy(bie);
  if (pStart) await _kartaTestu(pStart, kierowcaPojazdu(pStart));
}

/** Czy pojazd „stał” w tej turze (D34): Szybkość 0, wrak, oś, Hample bez dalszej jazdy. */
function _stal(pojazdDoc, droga) {
  const b = budzetJazdy(pojazdDoc);
  if (jestWrakiem(pojazdDoc.actor) || aktywneAwariePojazdu(pojazdDoc.actor).includes(7) || b.v <= 0) return true;
  return b.paleta.hample && przebyteZnaczniki(droga) === 0;
}

async function _koniecTuryKierowcy(combat, pojazdDoc, combatant) {
  const droga = _drogaTury(pojazdDoc.actor, combat, combatant.id);
  const b = budzetJazdy(pojazdDoc);
  const zapas = zapasPoTurze(b.limit, zapasPojazdu(pojazdDoc.actor), przebyteZnaczniki(droga));
  await pojazdDoc.actor.update({ [`flags.${MODULE_ID}.${FLAGA_POSCIGU_POJAZDU}.zapas`]: zapas });
  if (_stal(pojazdDoc, droga)) await _kartaCofnij(pojazdDoc, "pojazd stał w tej turze");
}

async function _kartaCofnij(pojazdDoc, powod) {
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `${pojazdDoc.name}: cofa się o znacznik`, rodzaj: "test",
    linie: [`Bez ruchu (${esc(powod)}) — pojazd cofa się o znacznik (s. 266).`],
    przyciski: [{ ...przyciskKrokow(pojazdDoc, "Cofnij o znacznik", [{ znaczniki: -1 }]), wlasciciel: false, gm: true }] }), { szept: "gm" });
}

/** Rzeczy dryfujące na planszy (D38): wypadnięci, przedmioty na ziemi, rzeczy na drodze, szablony na gołej drodze. */
function _dryfujace(scene) {
  const g = scene.grid.size;
  const wPasie = y => Number.isFinite(y) && y < FREEFORM_Y;
  const out = [];
  for (const t of scene.tokens) {
    if (!t.getFlag(MODULE_ID, FLAGA_DRYF) || jazdaZetonu(t) || !wPasie(t.y)) continue;
    out.push({ kind: "Token", doc: t, x: t.x + t.width * g / 2, upd: dx => ({ _id: t.id, x: t.x + dx, y: t.y }) });
  }
  for (const t of scene.tiles) {
    if (!(t.flags?.[MODULE_ID]?.[GROUND_FLAG] || t.flags?.[MODULE_ID]?.[FLAGA_RZECZ]) || !wPasie(t.y)) continue;
    out.push({ kind: "Tile", doc: t, x: t.x, upd: dx => ({ _id: t.id, x: t.x + dx }) }); // v14: x/y kafelka to środek
  }
  for (const d of scene.drawings) {
    if (!d.flags?.[MODULE_ID]?.[FLAGA_RZECZ] || !wPasie(d.y)) continue;
    out.push({ kind: "Drawing", doc: d, x: d.x + (d.shape?.width ?? 0) / 2, upd: dx => ({ _id: d.id, x: d.x + dx }) });
  }
  for (const r of scene.regions) {
    if (r.attachment?.token || r.flags?.[MODULE_ID]?.dymAwarii) continue;
    const sh = r.shapes?.[0];
    const x = sh?.x ?? sh?.base?.x;
    if (!Number.isFinite(x) || !wPasie(sh?.y ?? sh?.base?.y)) continue;
    out.push({ kind: "Region", doc: r, x, upd: dx => ({ _id: r.id, shapes: r.toObject().shapes.map(s => ({ ...s, ...(Number.isFinite(s.x) ? { x: s.x + dx } : {}),
      ...(s.base ? { base: { ...s.base, x: s.base.x + dx } } : {}), ...(Array.isArray(s.points) ? { points: s.points.map((v, i) => (i % 2 ? v : v + dx)) } : {}) })) }) });
  }
  return out;
}

/** MG: dryf drogi na początku rundy (D38). Za tyłem planszy — strefa swobodna i karta „został w tyle”. */
export async function dryfDrogi(scene) {
  if (!game.user.isGM || !trwaPoscig(scene)) return null;
  const pojazdy = scene.tokens.filter(t => jestZetonemPojazdu(t) && t.getFlag(MODULE_ID, FLAG_ROLA)).map(t => ({ id: t.id, nazwa: t.name, tor: torPojazdu(t) }));
  const linie = [], wTyle = [];
  const zmiany = { Token: [], Tile: [], Drawing: [], Region: [] };
  for (const r of _dryfujace(scene)) {
    const tor = xNaTor(r.x);
    const d = dryf(tor, pojazdy);
    if (d.minieci.length) linie.push(`${esc(r.doc.name || r.doc.text || "Rzecz na drodze")} mija: ${d.minieci.map(id => esc(pojazdy.find(p => p.id === id).nazwa)).join(", ")}.`);
    if (d.tor < 1) {
      wTyle.push(r.doc.name || r.doc.text || "rzecz");
      if (r.kind === "Token") zmiany.Token.push({ _id: r.doc.id, x: r.doc.x, y: FREEFORM_Y + 100, wTyle: true });
      else if (r.kind === "Drawing" || r.kind === "Tile") zmiany[r.kind].push({ _id: r.doc.id, y: FREEFORM_Y + 150 });
      continue;
    }
    zmiany[r.kind].push(r.upd((d.tor - tor) * LANE_W));
  }
  for (const [kind, lista] of Object.entries(zmiany)) {
    if (!lista.length) continue;
    if (kind !== "Token") { await scene.updateEmbeddedDocuments(kind, lista); continue; }
    // v14: zmiana x/y żetonu to marsz, który zatrzymują ściany i inne żetony — przesunięcie to `displace`.
    await scene.moveTokens(Object.fromEntries(lista.map(z => [z._id, { destination: { x: z.x, y: z.y, action: "displace" } }])),
      { animate: false, showRuler: false, method: "api" });
    const zTylu = lista.filter(z => z.wTyle).map(z => ({ _id: z._id, [`flags.${MODULE_ID}.${FLAGA_DRYF}`]: _del }));
    if (zTylu.length) await scene.updateEmbeddedDocuments("Token", zTylu);
  }
  if (linie.length || wTyle.length) {
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/wind.svg", tytul: "Dryf drogi (−3 znaczniki)", rodzaj: "info",
      linie: [...linie, ...(wTyle.length ? [`Został w tyle, poza pościgiem: <strong>${wTyle.map(esc).join(", ")}</strong>.`] : [])],
      ostrzezenia: linie.length ? ["Interakcje z mijanymi rozstrzyga MG (s. 266)."] : [] }), { szept: "gm" });
  }
  return { dryfujace: Object.values(zmiany).flat().length, wTyle };
}

/** Wyeliminowani i na mecie — do warunków końca. */
function _stanKonca(scene) {
  const f = poscigFlag(scene);
  const pionki = scene.tokens.filter(t => jestZetonemPojazdu(t) && t.getFlag(MODULE_ID, FLAG_ROLA));
  const wyeliminowani = pionki.filter(t => jestWrakiem(t.actor) || aktywneAwariePojazdu(t.actor).includes(7)).map(t => t.name);
  const meta = Number(f?.meta);
  const naMecie = Number.isFinite(meta) && meta > 0 ? pionki.filter(t => torLogiczny(scene, torPojazdu(t)) >= meta).map(t => t.name) : [];
  return { wyeliminowani, naMecie };
}

async function _poczatekRundy(combat, runda) {
  const scene = combat.scene;
  if (!trwaPoscig(scene)) return;
  await dryfDrogi(scene);
  for (const t of scene.tokens) {
    if (jestZetonemPojazdu(t) && t.getFlag(MODULE_ID, FLAG_ROLA) && !kierowcaPojazdu(t)) await _kartaCofnij(t, "nikt nie kieruje");
  }
  const s = stan(scene);
  const powody = warunkiKonca({ przewaga: s?.przewaga ?? null, runda, ..._stanKonca(scene) });
  if (powody.length) {
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/door-exit.svg", tytul: "Koniec pościgu?", rodzaj: "test", linie: powody.map(esc),
      ostrzezenia: ["MG decyduje — pościg trwa, póki go nie zakończysz (s. 267)."],
      przyciski: [{ akcja: "poscig.zakoncz", label: "Zakończ pościg", ikona: "fa-solid fa-flag-checkered", gm: true, dane: { scena: scene.uuid } }] }),
      { szept: "gm" });
  }
}

/* -------------------------------------------- */
/*  Atak na kierowcę, wręcz (P5d)                */
/* -------------------------------------------- */

async function _onApplyDamage(actor, amount) {
  if (!(amount > 0) || !actor) return;
  const toks = actor.isToken ? [actor.token] : game.scenes.contents.flatMap(s => (trwaPoscig(s) ? s.tokens.filter(t => t.actorId === actor.id) : []));
  for (const tok of toks) {
    const p = pojazdJadacego(tok);
    if (!p || !trwaPoscig(p.parent) || !miejsceOId(p.actor, jazdaZetonu(tok).miejsce)?.kierowca) continue;
    const st = stAtakuNaKierowce(amount);
    await wyslijKarte(kartaPostoju({ ikona: tok.texture.src, tytul: `Trafiony kierowca — ${p.name}`, rodzaj: "test",
      linie: [`${esc(tok.name)} dostaje ${amount} obrażeń: Test MDR (Pojazdy) ST <strong>${st}</strong> (10 albo połowa obrażeń, s. 266).`,
        "Porażka — pojazd cofa się o znacznik; porażka o 5+ — Przewrócenie."],
      przyciski: [przyciskTestuPoscigu(p, { label: `Pojazdy ST ${st}`, st, porazka: [{ znaczniki: -1 }], porazka5: [{ awaria: 8 }] })] }),
      { actor: tok.actor, flagi: { aktor: tok.actor.uuid } });
  }
}

/** Tor żetonu na planszy: jadący — tor pojazdu. */
function _torZetonu(doc) {
  const p = pojazdJadacego(doc);
  return p ? torPojazdu(p) : xNaTor(doc.x + doc.width * doc.parent.grid.size / 2);
}

function _wreczNaZnaczniku({ attackerToken, targets, wrecz }) {
  const a = attackerToken?.document ?? attackerToken;
  if (!wrecz || !a || !trwaPoscig(a.parent)) return null;
  const t = (targets ?? [])[0]?.document ?? (targets ?? [])[0];
  if (!t || t.parent !== a.parent) return null;
  return wZasieguWreczNaPlanszy(_torZetonu(a), _torZetonu(t))
    ? [{ rodzaj: "uwaga", label: "Ten sam znacznik pościgu — w zasięgu wręcz (s. 266)", strona: "pościg" }]
    : [{ rodzaj: "uwaga", label: `Inny znacznik pościgu (${_torZetonu(a)} / ${_torZetonu(t)}) — poza zasięgiem wręcz (s. 266)`, strona: "pościg" }];
}

/* -------------------------------------------- */
/*  Koniec i meta (P5e)                          */
/* -------------------------------------------- */

/** MG: meta — logiczny znacznik (przeżywa recentrowanie) i rysunek na planszy. */
export async function ustawMete(scene, meta) {
  if (!game.user.isGM || !poscigFlag(scene)) return;
  const stare = scene.drawings.filter(d => d.flags?.[MODULE_ID]?.[FLAGA_META]).map(d => d.id);
  if (stare.length) await scene.deleteEmbeddedDocuments("Drawing", stare);
  const f = poscigFlag(scene);
  await scene.setFlag(MODULE_ID, "poscig", { ...f, meta: meta > 0 ? meta : null });
  if (!(meta > 0)) return;
  const tor = meta - (Number(f.offset) || 0);
  await scene.createEmbeddedDocuments("Drawing", [{
    x: torX(tor) - 20, y: PAS_GORA, shape: { type: "r", width: 40, height: FREEFORM_Y - PAS_GORA },
    fillType: CONST.DRAWING_FILL_TYPES.PATTERN ?? CONST.DRAWING_FILL_TYPES.SOLID, fillColor: "#f2f2f2", fillAlpha: 0.55,
    strokeWidth: 6, strokeColor: "#111111", text: "META", fontSize: 40, textColor: "#ffffff",
    flags: { [MODULE_ID]: { [FLAGA_META]: true } }
  }]);
}

/** MG: koniec pościgu — karty tury i dryf milkną, plansza zostaje. */
export async function zakonczPoscig(scene) {
  if (!game.user.isGM || !poscigFlag(scene)) return;
  await scene.setFlag(MODULE_ID, "poscig", { ...poscigFlag(scene), zakonczony: true });
  await wyslijKarte(kartaPostoju({ ikona: "icons/svg/door-exit.svg", tytul: "Pościg zakończony", rodzaj: "info",
    linie: [`${esc(scene.name)}: karty tury i dryf wyłączone; plansza zostaje (ustawienia pościgu — „Wznów”).`] }), { szept: "gm" });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

function _mozePojazd(user, pojazd) {
  if (!user || user.isGM) return true;
  const kier = kierowcaPojazdu(pojazd);
  return !!(kier?.actor?.testUserPermission(user, "OWNER") || pojazd.actor?.testUserPermission(user, "OWNER"));
}

export function registerPoscigTura() {
  zarejestrujAkcje("poscig.testPoscigu", _testPoscigu);
  zarejestrujAkcje("poscig.testKierowcy", _testKierowcy);
  zarejestrujAkcje("poscig.kroki", async (_ev, btn) => {
    const pojazd = await fromUuid(btn.dataset.pojazd);
    if (!pojazd) return;
    btn.disabled = true;
    const kroki = _json(btn.dataset.kroki);
    if (game.user.isGM) return wykonajKroki(pojazd, kroki);
    return doMG("poscig.kroki", { pojazd: pojazd.uuid, kroki }, { nosiciel: kierowcaPojazdu(pojazd)?.actor ?? null });
  });
  zarejestrujProsbe("poscig.kroki", async (_n, dane, user) => {
    const pojazd = await fromUuid(dane.pojazd);
    if (pojazd && _mozePojazd(user, pojazd)) await wykonajKroki(pojazd, dane.kroki ?? []);
  });
  zarejestrujAkcje("poscig.paleta", async (_ev, btn) => {
    const pojazd = await fromUuid(btn.dataset.pojazd);
    if (pojazd) await uzyjPalety(pojazd, btn.dataset.id);
  });
  zarejestrujAkcje("poscig.zakoncz", async (_ev, btn) => {
    const scene = await fromUuid(btn.dataset.scena);
    if (scene) await zakonczPoscig(scene);
    btn.disabled = true;
  });
  zarejestrujZrodloOkolicznosci("poscigWrecz", _wreczNaZnaczniku);
  Hooks.on("combatTurnChange", (c, p, n) => { _onTurnChange(c, p, n).catch(err => console.error(`${MODULE_ID} | pościg: tura`, err)); });
  Hooks.on("dnd5e.applyDamage", (actor, amount) => { _onApplyDamage(actor, amount).catch(err => console.error(`${MODULE_ID} | pościg: kierowca`, err)); });
}

export const poscigTuraApi = Object.freeze({
  przesunOZnaczniki, wykonajKroki, losujKomplikacje, dryfDrogi, ustawMete, zakonczPoscig, zapasPojazdu, torLogiczny,
  trwaPoscig, KOMPLIKACJE_POSCIGU
});
