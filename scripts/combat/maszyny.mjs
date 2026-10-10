/**
 * Neuroshima 5e — maszyny: Wyłączony i skutki Tabeli awarii (PLAN_m3_towarzysze.md §7.4, §7.11, D10; E7c).
 *
 *   - **Wyłączony** — stan maszyny bez akcji, reakcji i ruchu (status `wylaczony`, `config/conditions.mjs`).
 *     Jeden efekt, kilka przyczyn naraz (`flags.<mod>.wylaczony`): `pw0` (dron na 0 PW, §7.4), `awaria`
 *     (pozycja 19 — do naprawy), `zasilanie` (akumulator i paliwo wyczerpane, U15). Efekt znika, gdy nie zostaje
 *     żadna — naprawa ponad 0 PW nie włączy drona z pustym akumulatorem ani z awarią 19. Efekt z HUD-a żetonu
 *     (bez flagi) to decyzja MG: zdejmuje go też MG.
 *   - **Tabela awarii (D10, T2):** po rzucie k20 karta podaje pozycję po pominięciu niepasujących (s. 214:
 *     „wybierz kolejną pozycję”, `awaria()` w `config/towarzysze-rules.mjs`) i przycisk MG [Zastosuj]. Skutki
 *     „do czasu naprawy” to efekty z flagą `awaria` (zdejmuje je naprawa — E9); „do końca następnej tury”
 *     liczą się w turach maszyny, a drona — jego operatora (U20). 20 to karta „Śmierć” z przyczyną
 *     „autodestrukcja” — potwierdza MG (D1 M1). Dotyczy też maszyn Bestiariusza.
 */

import { AWARIE, awaria as pozycjaAwarii } from "../config/towarzysze-rules.mjs";
import { RODZAJE } from "../config/towarzysze-data.mjs";
import { towarzysz, operatorDrona } from "../actors/towarzysze.mjs";
import { posiadaczDrona } from "../actors/drony.mjs";
import { ignite } from "./podpalenie.mjs";
import { getMag, setMag } from "../weapons/magazine.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Status Wyłączony (`config/conditions.mjs`). */
export const WYLACZONY = "wylaczony";
const FLAG_PRZYCZYNY = "wylaczony";
const FLAG_AWARIA = "awaria";
const FLAG_CZASOWA = "awariaCzasowa";

/** Przyczyny Wyłączenia — linie na czacie. */
export const PRZYCZYNY_WYLACZENIA = Object.freeze({
  pw0: "PW spadły do 0 (s. 214)",
  awaria: "awaria zasilania lub wyciek paliwa — do naprawy (Tabela awarii, 19)",
  zasilanie: "akumulator wyczerpany (s. 83)",
  mg: "decyzja MG"
});

const ATAKI = new Set(["attack", "neuroKs", "neuroDs", "neuroMs", "neuroOz", "neuroDublet"]);
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Wyłączony                                    */
/* -------------------------------------------- */

function _efektWylaczenia(actor) {
  return actor?.effects?.find(e => e.statuses?.has(WYLACZONY)) ?? null;
}

/** Czy maszyna jest Wyłączona. */
export function jestWylaczona(actor) {
  return !!_efektWylaczenia(actor);
}

/** Przyczyny Wyłączenia; efekt bez flagi (HUD) — `["mg"]`. */
export function przyczynyWylaczenia(actor) {
  const e = _efektWylaczenia(actor);
  if (!e) return [];
  const p = e.getFlag(MODULE_ID, FLAG_PRZYCZYNY);
  return Array.isArray(p) ? [...p] : ["mg"];
}

/**
 * Dokłada przyczynę Wyłączenia (tworzy efekt, gdy go nie ma). Tylko MG.
 * @param {Actor} actor
 * @param {"pw0"|"awaria"|"zasilanie"} przyczyna
 * @returns {Promise<boolean>} czy coś zapisał
 */
export async function wylacz(actor, przyczyna) {
  if (!game.user.isGM || !actor) return false;
  const e = _efektWylaczenia(actor);
  if (e) {
    const p = przyczynyWylaczenia(actor);
    if (p.includes(przyczyna)) return false;
    await e.setFlag(MODULE_ID, FLAG_PRZYCZYNY, [...p, przyczyna]);
    return true;
  }
  const effect = await ActiveEffect.implementation.fromStatusEffect(WYLACZONY, { parent: actor });
  effect.updateSource({ [`flags.${MODULE_ID}.${FLAG_PRZYCZYNY}`]: [przyczyna] });
  await ActiveEffect.implementation.create(effect.toObject(), { parent: actor, keepId: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><i class="fa-solid fa-power-off" inert></i> <strong>${esc(actor.name)}</strong> — Wyłączony: ${esc(PRZYCZYNY_WYLACZENIA[przyczyna] ?? przyczyna)}.</p>`
  });
  return true;
}

/**
 * Zdejmuje przyczynę; efekt znika, gdy nie zostaje żadna. Efekt z HUD-a (`mg`) zostaje. Tylko MG.
 * @returns {Promise<boolean>} czy maszyna się włączyła
 */
export async function wlacz(actor, przyczyna) {
  if (!game.user.isGM || !actor) return false;
  const e = _efektWylaczenia(actor);
  if (!e) return false;
  const p = przyczynyWylaczenia(actor);
  if (!p.includes(przyczyna)) return false;
  const reszta = p.filter(x => x !== przyczyna);
  if (reszta.length) {
    await e.setFlag(MODULE_ID, FLAG_PRZYCZYNY, reszta);
    return false;
  }
  // Przyczynę mogło właśnie zdjąć równoległe rozliczenie (zasilanie) — efektu już nie ma, to nie błąd.
  if (!actor.effects.has(e.id)) return false;
  try {
    await e.delete();
  } catch (err) {
    if (actor.effects.has(e.id)) throw err;
    return false;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><i class="fa-solid fa-power-off" inert></i> <strong>${esc(actor.name)}</strong> znowu działa.</p>`
  });
  return true;
}

/* -------------------------------------------- */
/*  Tabela awarii                                */
/* -------------------------------------------- */

/** Czego maszyna nie ma, żeby pozycję pominąć (s. 214): broń, amunicja, ataki, ataki wręcz. */
export function cechyMaszyny(actor) {
  const ataki = (actor?.items?.contents ?? []).filter(i => i.system?.activities?.some?.(a => ATAKI.has(a.type)));
  const bron = ataki.filter(i => i.type === "weapon");
  return {
    bron: bron.length > 0,
    amunicja: bron.some(i => getMag(i) || Number(i.system?.uses?.max) > 0),
    ataki: ataki.length > 0,
    wrecz: ataki.some(i => i.system.activities.some(a => a.type === "attack" && a.attack?.type?.value === "melee"))
  };
}

/** Kombatant, którego tura liczy czas skutku: maszyny — jej; drona — operatora albo posiadacza (U20). */
function _kombatantTury(actor) {
  const combat = game.combat;
  if (!combat?.started) return null;
  const t = towarzysz(actor);
  if (t && RODZAJE[t.rodzaj]?.maszyna) {
    const kto = operatorDrona(actor) ?? posiadaczDrona(actor);
    return kto ? combat.getCombatantsByActor(kto)[0] ?? null : null;
  }
  return combat.getCombatantsByActor(actor)[0] ?? null;
}

function _efektAwarii(pozycja, { nazwa, img = "icons/svg/hazard.svg", changes = [], statuses = [], czasowa = false, actor }) {
  const data = {
    name: `Awaria: ${nazwa}`,
    img,
    description: `<p>${esc(RAW_AWARII[pozycja] ?? "")}</p><p><em>Tabela awarii maszyn, ${pozycja} (s. 214).</em></p>`,
    changes,
    statuses,
    flags: { [MODULE_ID]: { [FLAG_AWARIA]: pozycja, ...(czasowa ? { [FLAG_CZASOWA]: true } : {}) } }
  };
  if (czasowa) {
    // „Do końca następnej tury” — w turach, z początkiem przestawionym na właściwego kombatanta (pamięć: v14
    // wygasza wg kombatanta z `start`; `actors/tt.mjs`). Bez walki — bez czasu, zdejmuje MG.
    const c = _kombatantTury(actor);
    if (c) {
      data.duration = { value: 1, units: "turns", expiry: "turnEnd" };
      data.start = { combatant: c.id, round: game.combat.round, turn: game.combat.turn };
    }
  }
  return data;
}

/** Tekst RAW pozycji (wstrzykiwany z `bestiary-thresholds.mjs`, żeby nie dublować tabeli). */
let RAW_AWARII = {};
export function ustawTekstyAwarii(teksty) {
  RAW_AWARII = teksty ?? {};
}

const NAZWY = Object.freeze({
  1: "broń zniszczona", 2: "napęd", 3: "celowanie −2", 4: "procesor", 5: "zasilanie", 6: "eksplozja amunicji",
  7: "manipulator", 8: "optyka", 9: "wyciek płynów", 10: "reset systemów", 11: "samozapłon", 12: "żyroskop",
  13: "pancerz", 14: "celowanie −4", 15: "siłowniki", 16: "siłowniki zniszczone", 17: "pamięć", 18: "błąd pamięci",
  19: "zasilanie lub paliwo", 20: "autodestrukcja"
});

const MOVE = ["walk", "fly", "swim", "climb", "burrow"];

/**
 * [Zastosuj] (D10): skutek pozycji Tabeli awarii na maszynie. Tylko MG.
 * @param {Actor} actor
 * @param {number} pozycja  po pominięciach
 * @returns {Promise<string[]>} linie „co zrobiono”
 */
export async function zastosujAwarie(actor, pozycja) {
  if (!game.user.isGM || !actor) return [];
  const a = AWARIE[pozycja];
  if (!a) return [];
  const s = a.skutek;
  const zrobione = [];
  const efekt = async (opts) => {
    const data = _efektAwarii(pozycja, { nazwa: NAZWY[pozycja], actor, ...opts });
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  };

  if (s.szybkosc) {
    await efekt({ changes: MOVE.map(m => ({ key: `system.attributes.movement.${m}`, mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY, value: String(s.szybkosc) })) });
    zrobione.push("Szybkość ×½ do naprawy");
  }
  if (s.atak) {
    const v = String(s.atak);
    await efekt({ changes: ["mwak", "rwak"].map(k => ({ key: `system.bonuses.${k}.attack`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: v })) });
    zrobione.push(`${v} do Testów Ataku do naprawy`);
  }
  if (s.tt) {
    await efekt({ changes: [{ key: "system.attributes.ac.bonus", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(s.tt) }] });
    zrobione.push(`TT ${s.tt} do naprawy`);
  }
  if (s.znacznik) {
    await efekt({});
    zrobione.push(`znacznik „${NAZWY[pozycja]}” do naprawy — skutek rozgrywa stół`);
  }
  if (s.status === WYLACZONY) {
    await wylacz(actor, "awaria");
    zrobione.push("Wyłączony do naprawy");
  } else if (s.status) {
    const czasowa = s.czas === "koniec-nastepnej-tury";
    await efekt({ statuses: [s.status], img: CONFIG.statusEffects.find(e => e.id === s.status)?.img, czasowa });
    const nazwa = game.i18n.localize(CONFIG.statusEffects.find(e => e.id === s.status)?.name ?? s.status);
    zrobione.push(`${nazwa} ${czasowa ? "do końca następnej tury" : "do naprawy"}`);
  }
  if (s.obrazenia) {
    await actor.applyDamage(s.obrazenia);
    zrobione.push(`${s.obrazenia} obrażeń`);
  }
  if (s.amunicja === 0) {
    for (const w of actor.items.filter(i => i.type === "weapon")) {
      if (getMag(w)) await setMag(w, { current: 0 });
      else if (Number(w.system?.uses?.max) > 0) await w.update({ "system.uses.spent": Number(w.system.uses.max) });
    }
    zrobione.push("amunicja na 0");
  }
  if (s.podpalenie) {
    await ignite(actor);
    zrobione.push("Podpalenie");
  }
  if (s.zniszczony) {
    const { zaproponujSmierc } = await import("./umieranie.mjs");
    await zaproponujSmierc(actor, "autodestrukcja", { pozycja });
    zrobione.push("karta „Śmierć” — autodestrukcja potwierdza MG");
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<p><i class="fa-solid fa-gear" inert></i> <strong>${esc(actor.name)}</strong> — awaria ${pozycja} zastosowana: ${esc(zrobione.join("; "))}.</p>`
  });
  return zrobione;
}

/**
 * Awarie trwałe („do czasu naprawy”) na maszynie: efekty z flagą `awaria` (bez przemijających) i 19 jako przyczyna
 * Wyłączenia. Posortowane po pozycji.
 * @returns {{pozycja: number, nazwa: string}[]}
 */
export function aktywneAwarie(actor) {
  const poz = new Set();
  for (const e of actor?.effects ?? []) {
    const n = Number(e.getFlag(MODULE_ID, FLAG_AWARIA));
    if (n && !e.getFlag(MODULE_ID, FLAG_CZASOWA)) poz.add(n);
  }
  if (przyczynyWylaczenia(actor).includes("awaria")) poz.add(19);
  return [...poz].sort((a, b) => a - b).map(pozycja => ({ pozycja, nazwa: NAZWY[pozycja] ?? String(pozycja) }));
}

/**
 * Naprawia awarię: zdejmuje jej efekty, a 19 — przyczynę Wyłączenia (PLAN_m3_towarzysze.md §7.11). Tylko MG.
 * @returns {Promise<boolean>} czy coś zdjął
 */
export async function naprawAwarie(actor, pozycja) {
  if (!game.user.isGM || !actor) return false;
  const ids = actor.effects.filter(e => Number(e.getFlag(MODULE_ID, FLAG_AWARIA)) === Number(pozycja)).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  const wl = Number(pozycja) === 19 && przyczynyWylaczenia(actor).includes("awaria") ? await wlacz(actor, "awaria") || true : false;
  return ids.length > 0 || wl;
}

/** Nazwa pozycji Tabeli awarii (krótka, jak na efekcie). */
export function nazwaAwarii(pozycja) {
  return NAZWY[pozycja] ?? String(pozycja);
}

/** Pozycja po pominięciach dla rzutu k20 na tej maszynie. */
export function awariaMaszyny(actor, k20) {
  return pozycjaAwarii(k20, cechyMaszyny(actor));
}

/** Efekty awarii z czasem — rdzeń tylko oznacza wygaśnięcie; kasujemy (aktywny MG). */
async function _onUpdateEffect(effect, changes) {
  if (!game.users.activeGM?.isSelf) return;
  if (foundry.utils.getProperty(changes, "duration.expired") !== true) return;
  if (!effect.getFlag(MODULE_ID, FLAG_CZASOWA)) return;
  await effect.delete();
}

export function registerMaszyny() {
  Hooks.on("updateActiveEffect", _onUpdateEffect);
}

export const maszynyApi = Object.freeze({
  wylacz, wlacz, jestWylaczona, przyczynyWylaczenia, cechyMaszyny, zastosujAwarie, awariaMaszyny, aktywneAwarie, naprawAwarie
});
