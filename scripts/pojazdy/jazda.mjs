/**
 * Neuroshima 5e — jazda w walce: tura kierowcy, skręty, teren, potrącenie, bezruch, atak z pojazdu
 * (PLAN_m4_pojazdy §4.6, §4.7, D9, D10, E5; RAW s. 260–262, 266).
 *
 *  - **Tura pojazdu = tura kierowcy** (D9). Pojazd nie wchodzi do trackera; jego drogę w turze kierowcy
 *    liczy moduł i oznacza przekroczenie Szybkości (Przyspieszenie kierowcy daje drugą; silnik zgaszony,
 *    wrak, brak kierowcy, ruch poza turą kierowcy — oznaczane). Pojazd mięśniowy: Szybkość jeźdźca ×2.
 *  - **Skręty z ruchu** (D10): kierunek jazdy zmienia się o ≥ 90° (także względem tego, jak pojazd stał) →
 *    karta: MDR (Pojazdy) ST 10, porażka — Szybkość ×½ do końca tury; ≈180° — ST 20, porażka — awaria 8.
 *  - **Trudny teren** — koszt drogi > długość (regiony trudnego terenu): karta z testem o ST MG; Terenówka
 *    ×½ bez testu, Gąsienice bez kary (§5).
 *  - **Potrącenie** (§4.7) — istoty pod obrysem na drodze: karta MG z RO ZRC ST 15 i obrażeniami wg rozmiaru.
 *    Nic nie dzieje się bez kliknięcia MG.
 *  - **Bezruch** — pojazd, który nie ruszył się w tej ani poprzedniej rundzie, ma TT w bezruchu (statbloki:
 *    TT − 5) — efekt zakładany i zdejmowany przez MG na zmianie rundy.
 *  - **Atak z jadącego pojazdu** (s. 261) — Utrudnienie w oknie ataku (silnik okoliczności), chyba że jadący
 *    zdał w tej turze ZRC (Akrobatyka) ST 10 (przycisk HUD). Konwojent (E7) je znosi.
 *  - **Osłona jadących** (s. 266) — domyślnie ½ w oknie ataku; stanowiska i pancerne wnętrza wg strefy (§5).
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { zarejestrujZrodloOkolicznosci } from "../combat/okolicznosci.mjs";
import { zarejestrujDomyslnaOslone } from "../combat/cover.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { POTRACENIE_WG_ROZMIARU, ROZMIAR_MASZYNY, cechyPojazdu } from "../config/vehicles-data.mjs";
import {
  MODULE_ID, danePojazdu, jadacyPojazdu, jazdaZetonu, jestPojazdem, jestZetonemPojazdu, miejsceOId, pojazdJadacego
} from "./stan.mjs";
import { obroc, roznicaKatow } from "./geometria.mjs";
import { jedzie, kierowcaPojazdu, zapiszRuch } from "./jadacy.mjs";
import { maSilnik, stanSilnika } from "./silnik.mjs";
import { aktywneAwariePojazdu, kartaObrazen } from "./awarie.mjs";
import { jestWrakiem } from "./wrak.mjs";

const FLAGA_TURA = "tura";
const FLAGA_AKROBATYKA = "akrobatykaPojazdu";
const FLAGA_SKRET = "skretPolowa";
const FLAGA_BEZRUCH = "bezruch";
const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Obrót sprzed ruchu (preMoveToken → moveToken), id żetonu → stopnie. */
const _obrotPrzed = new Map();

/* -------------------------------------------- */
/*  Czyste funkcje                               */
/* -------------------------------------------- */

/**
 * Skręty na drodze: kolejne kierunki (stopnie, konwencja obrotu żetonu) → lista zmian ≥ 67,5°.
 * @param {number} startowy  obrót pojazdu przed ruchem
 * @param {{x: number, y: number}[]} punkty  środki kolejnych punktów drogi
 * @returns {{kat: number, rodzaj: "skret"|"obrot"}[]}
 */
export function skretyNaDrodze(startowy, punkty) {
  const kierunki = [];
  for (let i = 1; i < punkty.length; i++) {
    const dx = punkty[i].x - punkty[i - 1].x, dy = punkty[i].y - punkty[i - 1].y;
    if (Math.hypot(dx, dy) < 1) continue;
    // Obrót żetonu: 0 = w dół (+y). atan2 daje kąt od +x; obrót = kąt − 90.
    kierunki.push(Math.atan2(dy, dx) * 180 / Math.PI - 90);
  }
  const out = [];
  let poprzedni = startowy;
  for (const k of kierunki) {
    const d = roznicaKatow(poprzedni, k);
    if (d >= 157.5) out.push({ kat: Math.round(d), rodzaj: "obrot" });
    else if (d >= 67.5) out.push({ kat: Math.round(d), rodzaj: "skret" });
    poprzedni = k;
  }
  return out;
}

/** Szybkość pojazdu w metrach na turę (efekty awarii już w danych). Mięśniowy — jeździec ×2. */
export function szybkoscPojazdu(pojazdDoc) {
  const actor = pojazdDoc.actor;
  const dane = danePojazdu(actor);
  if (!dane) return 0;
  if (!dane.katalog.silnik) {
    const kier = kierowcaPojazdu(pojazdDoc);
    return 2 * (Number(kier?.actor?.system?.attributes?.movement?.speeds?.walk) || 0);
  }
  return Number(actor.system.attributes.movement?.speeds?.walk) || 0;
}

/**
 * Istoty pod obrysem pojazdu na drodze (§4.7): próbki co ¼ kratki, obrys obrócony wg kierunku odcinka.
 * @param {TokenDocument} pojazdDoc
 * @param {{x: number, y: number}[]} punkty  środki punktów drogi
 * @param {TokenDocument[]} kandydaci
 */
export function potraceniNaDrodze(pojazdDoc, punkty, kandydaci) {
  const dane = danePojazdu(pojazdDoc.actor);
  const kratka = pojazdDoc.parent.grid.size;
  const trafieni = new Set();
  for (let i = 1; i < punkty.length; i++) {
    const a = punkty[i - 1], b = punkty[i];
    const dl = Math.hypot(b.x - a.x, b.y - a.y);
    if (dl < 1) continue;
    const rot = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI - 90;
    const n = Math.max(1, Math.ceil(dl / (kratka / 4)));
    for (let s = 1; s <= n; s++) {
      const p = { x: a.x + (b.x - a.x) * s / n, y: a.y + (b.y - a.y) * s / n };
      for (const t of kandydaci) {
        if (trafieni.has(t)) continue;
        const c = t.getCenterPoint(t._source);
        const lok = obroc({ x: c.x - p.x, y: c.y - p.y }, -rot);
        const pol = Math.min(t._source.width, t._source.height) * kratka * 0.25;
        if (Math.abs(lok.x) <= dane.obrys.w * kratka / 2 + pol && Math.abs(lok.y) <= dane.obrys.h * kratka / 2 + pol) trafieni.add(t);
      }
    }
  }
  return [...trafieni];
}

/* -------------------------------------------- */
/*  Ruch pojazdu (MG)                            */
/* -------------------------------------------- */

function _tura(actor) {
  return actor.flags?.[MODULE_ID]?.[FLAGA_TURA] ?? null;
}

async function _onMoveToken(doc, movement) {
  if (!game.users.activeGM?.isSelf || !jestZetonemPojazdu(doc)) return;
  if (movement.passed.waypoints.every(w => w.action === "displace")) return;
  const actor = doc.actor;
  const startowy = _obrotPrzed.get(doc.id) ?? doc._source.rotation;
  _obrotPrzed.delete(doc.id);
  const pkt = [doc.getCenterPoint(movement.origin), ...movement.passed.waypoints.map(w => doc.getCenterPoint(w))];
  const metry = Number(movement.passed.distance) || 0;
  const walka = game.combat?.started && game.combat.scene === doc.parent ? game.combat : null;
  const kier = kierowcaPojazdu(doc);
  const linie = [], ostrz = [], przyciski = [];

  // Tura kierowcy i budżet.
  if (walka) {
    await zapiszRuch(doc);
    await _zdejmijBezruch(actor);
    const kto = walka.combatant;
    const turaKierowcy = !!kier && kto?.tokenId === kier.id;
    if (!turaKierowcy) ostrz.push(kier ? `Ruch poza turą kierowcy (${kier.name}) — tura pojazdu to tura kierowcy (D9).` : "Nikt nie kieruje.");
    let t = _tura(actor);
    if (!t || t.walka !== walka.id || t.runda !== walka.round || t.kombatant !== kto?.id) t = { walka: walka.id, runda: walka.round, kombatant: kto?.id, droga: 0 };
    t.droga = Math.round((t.droga + metry) * 10) / 10;
    await actor.update({ [`flags.${MODULE_ID}.${FLAGA_TURA}`]: t });
    const v = szybkoscPojazdu(doc);
    linie.push(`Droga w tej turze: <strong>${t.droga} m</strong> z ${v} m${v ? ` (Przyspieszenie kierowcy: do ${v * 2} m)` : ""}.`);
    if (t.droga > v * 2 + 0.1) ostrz.push(`Przekroczona Szybkość nawet z Przyspieszeniem (${t.droga} > ${v * 2} m).`);
    else if (t.droga > v + 0.1) ostrz.push(`Ponad Szybkość pojazdu — tylko z Przyspieszeniem kierowcy (akcja).`);
  }
  if (maSilnik(actor) && !stanSilnika(actor).wl && !aktywneAwariePojazdu(actor).includes(15)) ostrz.push("Silnik zgaszony — Szybkość 0 (Uruchom: akcja kierowcy).");
  if (jestWrakiem(actor)) ostrz.push("To wrak — nie jedzie.");

  // Skręty (D10).
  const skrety = skretyNaDrodze(startowy, pkt);
  if (skrety.length && aktywneAwariePojazdu(actor).includes(10)) ostrz.push("Zaklinowana kierownica (awaria 10) — skręt niemożliwy.");
  for (const s of skrety) {
    const obrot = s.rodzaj === "obrot";
    linie.push(obrot ? `Obrót o ${s.kat}° w ruchu — Test MDR (Pojazdy) ST 20; porażka: awaria 8 (Przewrócenie).`
      : `Skręt o ${s.kat}° — Test MDR (Pojazdy) ST 10; porażka: Szybkość ×½ do końca tury.`);
    if (kier) przyciski.push({ akcja: "pojazd.testKierowcy", label: `${obrot ? "Obrót" : "Skręt"}: Pojazdy ST ${obrot ? 20 : 10}`, ikona: "fa-solid fa-steering-wheel",
      wlasciciel: true, dane: { kierowca: kier.actor.uuid, pojazd: doc.uuid, st: obrot ? 20 : 10, skutek: obrot ? "przewrocenie" : "polowa" } });
  }

  // Trudny teren — regiony (dnd5e liczy też pola zajęte przez istoty jako trudne, więc nie koszt drogi).
  if (metry > 0 && _przezTrudnyTeren(doc, pkt)) {
    const cechy = cechyPojazdu(danePojazdu(actor).podwozie).map(c => c.id);
    if (cechy.includes("gasienice")) linie.push("Trudny teren — Gąsienice: bez kary.");
    else if (cechy.includes("terenowka")) linie.push("Trudny teren — Terenówka: Szybkość ×½, bez testów (s. 261).");
    else {
      linie.push("Trudny teren — Szybkość ×½; co turę Test MDR (Pojazdy) o ST MG, porażka — Szybkość 0 (s. 261).");
      if (kier) przyciski.push({ akcja: "pojazd.testKierowcy", label: "Trudny teren: Pojazdy (ST MG)", ikona: "fa-solid fa-mountain", wlasciciel: true,
        dane: { kierowca: kier.actor.uuid, pojazd: doc.uuid, st: 0, skutek: "teren" } });
    }
  }

  if (linie.length > (walka ? 1 : 0) || ostrz.length || przyciski.length) {
    const szept = [...game.users.filter(u => u.isGM || (kier && kier.actor?.testUserPermission(u, "OWNER"))).map(u => u.id)];
    await wyslijKarte(kartaPostoju({ ikona: doc.texture.src, tytul: `Jazda: ${doc.name}`, rodzaj: ostrz.length ? "test" : "info", linie, ostrzezenia: ostrz, przyciski }),
      { actor: kier?.actor ?? actor, szept, flagi: { aktor: (kier?.actor ?? actor).uuid } });
  }

  // Potrącenie (§4.7).
  await _potracenie(doc, pkt);
}

/** Region trudnego terenu: zachowanie kosztu ruchu (rdzeń, dnd5e) albo strefa mebli z map (`source: furniture`). */
function _regionTrudny(region) {
  if (region.flags?.[MODULE_ID]?.source === "furniture") return true;
  return region.behaviors?.some(b => !b.disabled && (b.type === "modifyMovementCost" || b.type === "dnd5e.difficultTerrain"
    || String(b.type).toLowerCase().includes("difficult")));
}

/** Czy droga (środki punktów) przechodzi przez trudny teren — próbki co ½ kratki. */
function _przezTrudnyTeren(doc, pkt) {
  const regiony = doc.parent.regions.filter(_regionTrudny);
  if (!regiony.length) return false;
  const krok = doc.parent.grid.size / 2;
  for (let i = 1; i < pkt.length; i++) {
    const a = pkt[i - 1], b = pkt[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / krok));
    for (let k = 0; k <= n; k++) {
      const p = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n, elevation: doc._source.elevation ?? 0 };
      if (regiony.some(r => { try { return r.testPoint(p); } catch { return false; } })) return true;
    }
  }
  return false;
}

async function _potracenie(doc, pkt) {
  const cechy = cechyPojazdu(danePojazdu(doc.actor).podwozie);
  const pot = cechy.find(c => c.id === "potracenie");
  if (!pot) return;
  const kandydaci = doc.parent.tokens.filter(t => t.id !== doc.id && !jazdaZetonu(t) && t.actor && !jestPojazdem(t.actor)
    && !t.actor.statuses?.has("dead"));
  const ofiary = potraceniNaDrodze(doc, pkt, kandydaci);
  if (!ofiary.length) return;
  const rozmiar = doc.actor.system.traits.size;
  const d = POTRACENIE_WG_ROZMIARU[rozmiar] ?? POTRACENIE_WG_ROZMIARU.lg;
  const miazdzenie = cechy.some(c => c.id === "miazdzenie");
  const kier = kierowcaPojazdu(doc);
  const taranowanie = !!kier?.actor?.items?.some(i => /taranowanie/i.test(i.name));
  const roll = await new Roll(d.ofiara).evaluate();
  const linie = [`<strong>${esc(doc.name)}</strong> przejeżdża przez pola z istotami (s. 262–264). Obrażenia: <strong>${roll.total}</strong> obuchowych (${d.ofiara.replace("d", "k")}).`];
  const przyciski = [];
  for (const t of ofiary) {
    const r = t.actor.system.traits?.size ?? "med";
    const wieksza = ROZMIARY.indexOf(r) > ROZMIARY.indexOf(d.ofiaraMaks);
    if (wieksza) {
      linie.push(`${esc(t.name)} — istota ${ROZMIAR_MASZYNY[r]?.toLowerCase() ?? r}: zderzenie, ${d.wieksza.replace("d", "k")} dla niej, pojazdu i jadących.`);
      przyciski.push({ akcja: "pojazd.zderzenie", label: `Zderzenie: ${t.name}`, gm: true, ikona: "fa-solid fa-car-burst", dane: { pojazd: doc.uuid, cel: t.uuid, wzor: d.wieksza } });
      continue;
    }
    const lezy = t.actor.statuses?.has("prone");
    const ro = miazdzenie && lezy ? "bez RO (Miażdżenie)" : `RO ZRC ST 15${taranowanie ? " z Utrudnieniem (Taranowanie)" : ""}`;
    linie.push(`${esc(t.name)} — ${ro}; porażka: Powalenie i ${lezy ? `${roll.total * 2} (już Powalony — drugi raz tyle)` : roll.total}.`);
    przyciski.push({ akcja: "pojazd.potracony", label: `Potrącony: ${t.name}`, gm: true, ikona: "fa-solid fa-person-falling-burst",
      dane: { cel: t.actor.uuid, ile: lezy ? roll.total * 2 : roll.total } });
  }
  await wyslijKarte(kartaPostoju({ ikona: "icons/svg/combat.svg", tytul: "Potrącenie", rodzaj: "test", linie, przyciski }),
    { actor: doc.actor, szept: "gm", rolls: [roll] });
}

/* -------------------------------------------- */
/*  Bezruch i koniec tury                         */
/* -------------------------------------------- */

async function _zdejmijBezruch(actor) {
  const ids = actor.effects.filter(e => e.flags?.[MODULE_ID]?.[FLAGA_BEZRUCH]).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

async function _zalozBezruch(actor) {
  if (actor.effects.some(e => e.flags?.[MODULE_ID]?.[FLAGA_BEZRUCH])) return;
  const tt = Number(actor.system.attributes.ac.flat) || 0;
  const bez = Number(actor.flags?.[MODULE_ID]?.ttBezruchu);
  const delta = Number.isFinite(bez) && bez < tt ? bez - tt : -5;
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "W bezruchu", img: "icons/svg/statue.svg",
    description: "<p>Pojazd stoi — TT w bezruchu (statbloki: TT − 5). Zdejmuje go ruch pojazdu.</p>",
    system: { changes: [change("system.attributes.ac.flat", CHANGE_TYPE.add, String(delta))] },
    flags: { [MODULE_ID]: { [FLAGA_BEZRUCH]: true } }
  }]);
}

/** Pojazdy na scenie walki: aktorzy (raz na aktora powiązanego). */
function _pojazdyWalki(combat) {
  const scena = combat.scene ?? canvas.scene;
  const out = new Map();
  for (const t of scena?.tokens ?? []) if (jestZetonemPojazdu(t)) out.set(t.actor.uuid, t);
  return [...out.values()];
}

async function _onUpdateCombat(combat, changes) {
  if (!game.users.activeGM?.isSelf || !combat.started) return;
  // Koniec tury kierowcy: zdejmij „Szybkość ×½ po skręcie”.
  if ("turn" in changes || "round" in changes) {
    for (const t of _pojazdyWalki(combat)) {
      const ids = t.actor.effects.filter(e => e.flags?.[MODULE_ID]?.[FLAGA_SKRET]).map(e => e.id);
      if (ids.length) await t.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  }
  if (!("round" in changes)) return;
  for (const t of _pojazdyWalki(combat)) {
    if (jedzie(t)) await _zdejmijBezruch(t.actor);
    else await _zalozBezruch(t.actor);
  }
}

async function _onDeleteCombat(combat) {
  if (!game.users.activeGM?.isSelf) return;
  for (const t of _pojazdyWalki(combat)) await _zdejmijBezruch(t.actor);
}

/* -------------------------------------------- */
/*  Atak z jadącego pojazdu, osłona              */
/* -------------------------------------------- */

/** Czy jadący zdał w tej turze ZRC (Akrobatyka) ST 10 przed atakiem. */
function _zdalAkrobatyke(tokenDoc) {
  const f = tokenDoc?.flags?.[MODULE_ID]?.[FLAGA_AKROBATYKA];
  const c = game.combat;
  return !!f?.zdal && !!c && f.walka === c.id && f.runda === c.round && f.tura === c.turn;
}

function _zrodloAtakuZPojazdu({ attackerToken }) {
  const doc = attackerToken?.document ?? attackerToken;
  const p = doc ? pojazdJadacego(doc) : null;
  if (!p || !jedzie(p) || _zdalAkrobatyke(doc)) return null;
  if (doc.actor?.items?.some(i => /konwojent/i.test(i.name))) return null;
  return [{ rodzaj: "utrudnienie", label: "Atak z jadącego pojazdu — ZRC (Akrobatyka) ST 10 w tej turze to znosi (s. 261)", strona: "atakujący" }];
}

/** Test ZRC (Akrobatyka) ST 10 przed atakiem z jadącego pojazdu (HUD jadącego). */
export async function akrobatykaPrzedAtakiem(tokenDoc) {
  const rolls = await tokenDoc.actor.rollSkill({ skill: "akr", target: 10 }, {}, { data: { flavor: "Atak z jadącego pojazdu — ZRC (Akrobatyka) ST 10 (s. 261)" } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  const c = game.combat;
  await tokenDoc.update({ [`flags.${MODULE_ID}.${FLAGA_AKROBATYKA}`]: { zdal: r.total >= 10, walka: c?.id ?? null, runda: c?.round ?? null, tura: c?.turn ?? null } });
}

function _domyslnaOslonaJadacego(token) {
  const doc = token?.document;
  const p = doc ? pojazdJadacego(doc) : null;
  if (!p) return null;
  const m = miejsceOId(p.actor, jazdaZetonu(doc).miejsce);
  const otwarta = cechyPojazdu(danePojazdu(p.actor).podwozie).some(c => c.id === "otwartaRama");
  if (otwarta) return "half";
  return ({ polowa: "half", trzyCzwarte: "threeQuarters", calkowita: "threeQuarters" })[m?.oslona] ?? "half";
}

/* -------------------------------------------- */
/*  Akcje kart                                   */
/* -------------------------------------------- */

async function _testKierowcy(_ev, btn) {
  const kier = await fromUuid(btn.dataset.kierowca);
  const pojazd = await fromUuid(btn.dataset.pojazd);
  if (!kier?.isOwner || !pojazd) return ui.notifications.warn("Test rzuca kierowca.");
  let st = Number(btn.dataset.st) || 0;
  if (!st) {
    const odp = await foundry.applications.api.DialogV2.prompt({ window: { title: "ST testu (MG)" },
      content: `<label>ST <input type="number" name="st" value="15" min="5" max="30"></label>`,
      ok: { callback: (_e, b) => Number(b.form.elements.st.value) || 15 } }).catch(() => null);
    if (!odp) return;
    st = odp;
  }
  const rolls = await kier.rollSkill({ skill: "poj", target: st }, {}, { data: { flavor: `${pojazd.name}: Test MDR (Pojazdy) ST ${st}` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r || r.total >= st) return;
  const skutek = btn.dataset.skutek;
  if (skutek === "polowa") {
    await pojazd.actor.createEmbeddedDocuments("ActiveEffect", [{
      name: "Skręt — Szybkość ×½", img: "icons/svg/direction.svg",
      system: { changes: [change("system.attributes.movement.speeds.walk", CHANGE_TYPE.multiply, "0.5")] },
      flags: { [MODULE_ID]: { [FLAGA_SKRET]: true } }
    }]);
  }
  const tekst = { polowa: "Szybkość ×½ do końca tury (zastosowane).", przewrocenie: "awaria 8 — Przewrócenie (MG stosuje).", teren: "Szybkość 0 w tej turze (s. 261)." }[skutek];
  await wyslijKarte(kartaPostoju({ ikona: pojazd.texture.src, tytul: "Test kierowcy — porażka", rodzaj: "porazka",
    linie: [`${esc(kier.name)}: ${r.total} przy ST ${st} — ${tekst}`],
    przyciski: skutek === "przewrocenie" ? [{ akcja: "pojazd.zastosujAwarie", label: "Zastosuj awarię 8", gm: true, ikona: "fa-solid fa-wrench", dane: { pojazd: pojazd.actor.uuid, k20: 8 } }] : []
  }), { actor: kier, flagi: { aktor: kier.uuid } });
}

async function _potracony(_ev, btn) {
  if (!game.user.isGM) return;
  const a = await fromUuid(btn.dataset.cel);
  const ile = Number(btn.dataset.ile) || 0;
  if (!a) return;
  await a.applyDamage([{ value: ile, type: "bludgeoning", properties: new Set() }]);
  if (!a.statuses?.has("prone")) await a.toggleStatusEffect("prone", { active: true });
  btn.disabled = true;
  btn.prepend("✓ ");
}

async function _zderzenie(_ev, btn) {
  if (!game.user.isGM) return;
  const pojazd = await fromUuid(btn.dataset.pojazd);
  const cel = await fromUuid(btn.dataset.cel);
  if (!pojazd || !cel) return;
  await kartaObrazen(pojazd, btn.dataset.wzor, "bludgeoning", { tytul: `Zderzenie: ${pojazd.name} i ${cel.name}`, zJadacymi: true,
    cele: [cel, pojazd, ...jadacyPojazdu(pojazd)] });
  btn.disabled = true;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerJazda() {
  // D9: pojazd nie wchodzi do trackera — działa w turze kierowcy.
  Hooks.on("preCreateCombatant", (combatant) => {
    if (!jestPojazdem(combatant.actor)) return;
    ui.notifications.info(`${combatant.name}: pojazd nie wchodzi do walki — działa w turze kierowcy (D9).`);
    return false;
  });
  Hooks.on("preMoveToken", (doc) => {
    if (jestZetonemPojazdu(doc)) _obrotPrzed.set(doc.id, doc._source.rotation);
  });
  Hooks.on("moveToken", (doc, movement) => {
    _onMoveToken(doc, movement).catch(err => console.error(`${MODULE_ID} | jazda`, err));
  });
  Hooks.on("updateCombat", (c, ch) => { _onUpdateCombat(c, ch).catch(err => console.error(`${MODULE_ID} | jazda: walka`, err)); });
  Hooks.on("deleteCombat", c => { _onDeleteCombat(c).catch(() => {}); });
  zarejestrujZrodloOkolicznosci("pojazdJadacy", _zrodloAtakuZPojazdu);
  zarejestrujDomyslnaOslone(_domyslnaOslonaJadacego);
  zarejestrujAkcje("pojazd.testKierowcy", _testKierowcy);
  zarejestrujAkcje("pojazd.potracony", _potracony);
  zarejestrujAkcje("pojazd.zderzenie", _zderzenie);
}
