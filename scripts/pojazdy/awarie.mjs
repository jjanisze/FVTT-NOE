/**
 * Neuroshima 5e — awarie pojazdów silnikowych (PLAN_m4_pojazdy §4.8, D5, E6; RAW s. 264–265).
 *
 * Wzorzec `combat/maszyny.mjs`, osobna tabela (pojazdy ≠ maszyny Molocha):
 *
 *  - **Wyzwalacze** — obrażenia w jednym ataku ≥ Próg awarii (`hp.mt`) i porażka kierowcy w Teście MDR
 *    (Pojazdy) o więcej niż 5. Oba dają kartę MG z rzutem k20; nic nie dzieje się bez kliknięcia (D5).
 *  - **[Zastosuj]** — skutki mierzalne jako efekt na aktorze pojazdu (flaga `awariaPojazdu`): Szybkość, TT,
 *    pożar, dym, wyciek, zegary. Fabularne — tekst na efekcie i na karcie.
 *  - **Zegary** (D5) — jeden licznik na zegarze świata: w walce runda to 6 s (rdzeń przesuwa czas o
 *    `roundTime`), poza walką zegar świata. Wyciek, chłodnica, rozpęd po zgaśnięciu silnika, zawieszenie
 *    naprawy tymczasowej, odliczanie wybuchu baku (§4.12).
 *  - **Tura kierowcy** — pojazd nie ma tury (D9): pożar (2k6 ognia pojazdowi i jadącym na końcu tury
 *    kierowcy) i błotnik (50% na gumę na początku tury) liczą się na turze kierowcy.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { getPaliwo, setPaliwo } from "../actors/party-travel.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { MODULE_ID, danePojazdu, jadacyPojazdu, jazdaZetonu, jestPojazdem, miejsceOId, pojazdJadacego } from "./stan.mjs";
import { kierowcaPojazdu } from "./jadacy.mjs";
import { FLAGA_SILNIK, stanSilnika, ustawSwiatloZetonow, ustawStosowanieAwarii, ustawZrodloAwarii } from "./silnik.mjs";

export const FLAGA_AWARIA = "awariaPojazdu";
const FLAGA_ZEGARY = "zegary";
const FLAGA_OSTATNIE_OBRAZENIA = "ostatnieObrazenia";
const RUNDA_S = () => CONFIG.time?.roundTime || 6;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * Tabela awarii pojazdów silnikowych (s. 265): parafraza, ST napraw (`postoj`, `jazda` — null = brak),
 * skrót na efekt. `mierzalne` — co [Zastosuj] robi samo.
 */
export const AWARIE_POJAZDOW = {
  1: { nazwa: "Pożar", opis: "Pojazd płonie. Kto kończy w nim turę, dostaje 2k6 ognia; pojazd — na końcu tury kierowcy.", postoj: 10, jazda: 15 },
  2: { nazwa: "Guma lub napęd", opis: "Szybkość pojazdu −18 m.", postoj: 15, jazda: null },
  3: { nazwa: "Sprzęgło / skrzynia biegów", opis: "Przy każdym Teście MDR (Pojazdy) dodatkowy k6: 1–2 — pojazd się krztusi i traci cały ruch w tej turze.", postoj: 20, jazda: null },
  4: { nazwa: "Układ kierowniczy", opis: "−5 do Testów MDR (Pojazdy) kierowcy.", postoj: 15, jazda: null },
  5: { nazwa: "Dym", opis: "Gryzący dym w kabinie — obszar całkowicie przesłonięty.", postoj: 10, jazda: 15 },
  6: { nazwa: "Zacięte drzwi", opis: "Otwarcie albo zamknięcie drzwi — Test SIŁ (Atletyka) albo ZRC (Zwinne dłonie) ST 10.", postoj: 10, jazda: null },
  7: { nazwa: "Oś napędowa", opis: "Szybkość pojazdu spada do 0.", postoj: 20, jazda: null },
  8: { nazwa: "Przewrócenie", opis: "Pojazd Powalony; on i jadący dostają 4k10 obuchowych, udany RO SIŁ ST 10 — połowa.", postoj: 15, jazda: null },
  9: { nazwa: "Wyciek paliwa", opis: "Pojazd traci 0,5 l paliwa na rundę.", postoj: 10, jazda: 15 },
  10: { nazwa: "Zaklinowana kierownica", opis: "Tylko prosto — żaden skręt nie jest możliwy.", postoj: 20, jazda: 25 },
  11: { nazwa: "Pedał gazu / przepustnica", opis: "Połowa Szybkości; bez Gazu do dechy, Szóstego biegu i Gazu!", postoj: 10, jazda: 15 },
  12: { nazwa: "Błotnik", opis: "Hałas i w każdej turze 50% szans na złapanie gumy.", postoj: 10, jazda: null },
  13: { nazwa: "Chłodnica", opis: "Awaria silnika za 2k10 rund.", postoj: 15, jazda: 20 },
  14: { nazwa: "Hamulce", opis: "Bezpieczne zatrzymanie — Test MDR (Pojazdy) ST 15, inaczej Przewrócenie.", postoj: 15, jazda: 20 },
  15: { nazwa: "Silnik", opis: "Pojazd gaśnie i jedzie siłą rozpędu z połową Szybkości przez trzy tury.", postoj: 20, jazda: null },
  16: { nazwa: "Zacięta maska", opis: "Podniesienie maski — Test SIŁ (Atletyka) ST 15 (przed naprawą).", postoj: 10, jazda: null },
  17: { nazwa: "Układ elektryczny", opis: "Zapłon zawodzi, światła nie działają, radio szumi.", postoj: 15, jazda: 25 },
  18: { nazwa: "Pancerz", opis: "TT pojazdu −1.", postoj: 15, jazda: null },
  19: { nazwa: "Zranienie pasażera", opis: "Losowy jadący dostaje połowę obrażeń pojazdu, minimum 2k10.", postoj: null, jazda: null },
  20: { nazwa: "Broń pokładowa", opis: "Zamontowana broń wymaga skomplikowanej naprawy; bez broni — Zranienie pasażera.", postoj: 15, jazda: 20 }
};

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

/** Efekty awarii pojazdu (posortowane po numerze). */
export function efektyAwarii(actor) {
  return (actor?.effects?.contents ?? [])
    .filter(e => Number(e.flags?.[MODULE_ID]?.[FLAGA_AWARIA]?.k20))
    .sort((a, b) => a.flags[MODULE_ID][FLAGA_AWARIA].k20 - b.flags[MODULE_ID][FLAGA_AWARIA].k20);
}

/** Numery aktywnych (niezawieszonych) awarii. */
export function aktywneAwariePojazdu(actor) {
  return efektyAwarii(actor).filter(e => !e.disabled).map(e => e.flags[MODULE_ID][FLAGA_AWARIA].k20);
}

/** Czy pojazd podlega Tabeli awarii (silnikowy, prawdziwy pojazd). */
export function maAwarie(actor) {
  const d = danePojazdu(actor);
  return !!d?.podstawa?.silnikowy;
}

function _zegary(actor) {
  const z = actor?.flags?.[MODULE_ID]?.[FLAGA_ZEGARY];
  return Array.isArray(z) ? z : [];
}

async function _ustawZegary(actor, zegary) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_ZEGARY}`]: zegary });
}

async function _dodajZegar(actor, zegar) {
  await _ustawZegary(actor, [..._zegary(actor).filter(z => z.id !== zegar.id), zegar]);
}

/** MG: odliczanie wybuchu baku płonącego wraku (D17) — zegar na `rundy` rund. */
export async function odliczWybuch(actor, rundy) {
  await _dodajZegar(actor, { id: "wybuch", rodzaj: "wybuch", koniec: game.time.worldTime + rundy * RUNDA_S() });
}

/** MG: naprawa tymczasowa — skutek zawieszony na minutę (10 rund), potem wraca (s. 264). */
export async function zawiesAwarie(actor, efekt, { sekundy = 60 } = {}) {
  await efekt.update({ disabled: true });
  await _dodajZegar(actor, { id: `zawieszenie-${efekt.id}`, rodzaj: "zawieszenie", efekt: efekt.id, koniec: game.time.worldTime + sekundy });
}

/** Zegary pojazdu (do karty): `[{rodzaj, koniec?, pozostalo?}]`. */
export function zegaryPojazdu(actor) {
  const teraz = game.time.worldTime;
  return _zegary(actor).map(z => ({ ...z, pozostalo: Number.isFinite(z.koniec) ? Math.max(0, z.koniec - teraz) : null }));
}

/* -------------------------------------------- */
/*  Wyzwalacze                                   */
/* -------------------------------------------- */

/** Karta MG: „rzuć k20 na Tabelę awarii pojazdów” z przyczyną. */
export async function zaproponujAwarie(pojazdActor, przyczyna) {
  if (!maAwarie(pojazdActor)) return;
  const tok = pojazdActor.token ?? pojazdActor.getActiveTokens?.(false, true)?.[0];
  await wyslijKarte(kartaPostoju({
    ikona: tok?.texture?.src ?? pojazdActor.img, tytul: "Awaria pojazdu?", rodzaj: "test",
    linie: [`<strong>${esc(pojazdActor.name)}</strong> — ${esc(przyczyna)} (s. 264).`],
    przyciski: [{ akcja: "pojazd.rzutAwarii", label: "Rzuć k20 na Tabelę awarii", ikona: "fa-solid fa-dice-d20", gm: true, dane: { pojazd: pojazdActor.uuid } }]
  }), { actor: pojazdActor, szept: "gm" });
}

/** MG: rzut k20 i karta z [Zastosuj]. */
export async function rzucAwarie(pojazdActor, { k20 = null } = {}) {
  const roll = k20 ? null : await new Roll("1d20").evaluate();
  const n = k20 ?? roll.total;
  const a = AWARIE_POJAZDOW[n];
  const naprawa = [a.postoj ? `postój ST ${a.postoj}` : null, a.jazda ? `jazda ST ${a.jazda}` : null].filter(Boolean).join(", ") || "bez naprawy";
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/hazard.svg", tytul: `Awaria ${n}: ${a.nazwa}`, rodzaj: "porazka",
    linie: [`<strong>${esc(pojazdActor.name)}</strong>: ${esc(a.opis)}`, `Naprawa: ${naprawa}.`],
    przyciski: [{ akcja: "pojazd.zastosujAwarie", label: "Zastosuj", ikona: "fa-solid fa-wrench", gm: true, dane: { pojazd: pojazdActor.uuid, k20: n } }]
  }), { actor: pojazdActor, szept: "gm", rolls: roll ? [roll] : [] });
  return n;
}

function _onCalculateDamage(actor, damages) {
  if (!game.user.isGM || !jestPojazdem(actor) || !maAwarie(actor)) return;
  const total = (damages ?? []).filter(d => d.type !== "healing" && d.type !== "temphp").reduce((s, d) => s + (d.value ?? 0), 0);
  if (total <= 0) return;
  // Zranienie pasażera (19) bierze połowę obrażeń pojazdu — pamiętamy ostatnie.
  setTimeout(() => actor.update({ [`flags.${MODULE_ID}.${FLAGA_OSTATNIE_OBRAZENIA}`]: total }).catch(() => {}), 0);
  const prog = Number(actor.system.attributes.hp.mt) || 0;
  if (prog && total >= prog) setTimeout(() => zaproponujAwarie(actor, `${total} obrażeń w jednym ataku (Próg awarii ${prog})`), 0);
}

/** Porażka kierowcy w Teście MDR (Pojazdy) o więcej niż 5 → karta awarii; sprzęgło (3) → dodatkowy k6. */
async function _onRollSkill(rolls, { skill, subject } = {}) {
  if (skill !== "poj" || !game.users.activeGM?.isSelf) return;
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  const actor = subject ?? roll?.data?.actor ?? null;
  const tok = actor?.isToken ? actor.token : canvas.scene?.tokens.find(t => t.actorId === actor?.id && jazdaZetonu(t));
  const pojazd = tok ? pojazdJadacego(tok) : null;
  if (!pojazd || !miejsceOId(pojazd.actor, jazdaZetonu(tok).miejsce)?.kierowca) return;
  const target = Number(roll?.options?.target);
  if (Number.isFinite(target) && roll.total < target - 5) {
    await zaproponujAwarie(pojazd.actor, `kierowca nie zdał Testu (Pojazdy) o ${target - roll.total}`);
  }
  if (aktywneAwariePojazdu(pojazd.actor).includes(3)) {
    const k6 = await new Roll("1d6").evaluate();
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/hazard.svg", tytul: "Sprzęgło (awaria 3)", rodzaj: k6.total <= 2 ? "porazka" : "info",
      linie: [`${esc(pojazd.name)}: k6 = <strong>${k6.total}</strong> — ${k6.total <= 2 ? "pojazd się krztusi i traci cały ruch w tej turze." : "jedzie dalej."}`]
    }), { actor: pojazd.actor, rolls: [k6] });
  }
}

/** −5 do Testów MDR (Pojazdy) kierowcy pojazdu z awarią 4 — w danych rzutu, nie w oknie (ARCHITECTURE §6). */
function _onPreRollSkill(config) {
  if (config?.skill !== "poj") return;
  const actor = config.subject;
  const tok = actor?.isToken ? actor.token : canvas.scene?.tokens.find(t => t.actorId === actor?.id && jazdaZetonu(t));
  const pojazd = tok ? pojazdJadacego(tok) : null;
  if (!pojazd || !miejsceOId(pojazd.actor, jazdaZetonu(tok).miejsce)?.kierowca) return;
  if (!aktywneAwariePojazdu(pojazd.actor).includes(4)) return;
  for (const r of config.rolls ?? []) {
    r.parts ??= [];
    r.parts.push("-5");
  }
}

/* -------------------------------------------- */
/*  [Zastosuj]                                    */
/* -------------------------------------------- */

const MOVE = "system.attributes.movement.speeds.walk";

function _efekt(k20, { changes = [], statuses = [], opis = "" } = {}) {
  const a = AWARIE_POJAZDOW[k20];
  return {
    name: `Awaria ${k20}: ${a.nazwa}`, img: statuses.length ? (CONFIG.statusEffects.find(e => e.id === statuses[0])?.img ?? "icons/svg/hazard.svg") : "icons/svg/hazard.svg",
    description: `<p>${esc(a.opis)}</p>${opis ? `<p>${opis}</p>` : ""}<p><em>Tabela awarii pojazdów silnikowych, ${k20} (s. 265). `
      + `Naprawa: ${a.postoj ? `postój ST ${a.postoj}` : "—"}${a.jazda ? `, jazda ST ${a.jazda}` : ""}.</em></p>`,
    system: { changes }, statuses,
    flags: { [MODULE_ID]: { [FLAGA_AWARIA]: { k20 } } }
  };
}

/**
 * [Zastosuj] (D5): skutek awarii na pojeździe. Tylko MG.
 * @param {TokenDocument|Actor} cel
 * @param {number} k20
 * @returns {Promise<string[]>} co zrobiono
 */
export async function zastosujAwarie(cel, k20, { zrodlo = "" } = {}) {
  if (!game.user.isGM) return [];
  const actor = cel?.actor ?? cel;
  const pojazdDoc = cel?.actor ? cel : (actor.token ?? actor.getActiveTokens?.(false, true)?.[0] ?? null);
  if (!jestPojazdem(actor)) return [];
  const zrobione = [];
  const dodaj = async (opts = {}) => (await actor.createEmbeddedDocuments("ActiveEffect", [_efekt(k20, opts)]))[0];
  const teraz = game.time.worldTime;
  switch (Number(k20)) {
    case 1:
      await dodaj({ statuses: ["burning"] });
      zrobione.push("Podpalenie pojazdu; koniec tury kierowcy — 2k6 ognia pojazdowi i jadącym (karta)");
      break;
    case 2:
      await dodaj({ changes: [change(MOVE, CHANGE_TYPE.add, "-18")] });
      zrobione.push("Szybkość −18 m");
      break;
    case 7:
      await dodaj({ changes: [change(MOVE, CHANGE_TYPE.multiply, "0")] });
      zrobione.push("Szybkość 0");
      break;
    case 8: {
      await dodaj({ statuses: ["prone"] });
      zrobione.push("pojazd Powalony; 4k10 obuchowych — karta z RO SIŁ ST 10");
      await kartaObrazen(pojazdDoc ?? actor, "4d10", "bludgeoning", { tytul: "Przewrócenie (awaria 8)", ro: "SIŁ ST 10 — połowa", zJadacymi: true });
      break;
    }
    case 9:
      await dodaj();
      await _dodajZegar(actor, { id: "wyciek", rodzaj: "wyciek", od: teraz });
      zrobione.push("−0,5 l paliwa na rundę (zegar)");
      break;
    case 11:
      await dodaj({ changes: [change(MOVE, CHANGE_TYPE.multiply, "0.5")] });
      zrobione.push("Szybkość ×½; bez Gazu do dechy, Szóstego biegu i Gazu!");
      break;
    case 13: {
      const r = await new Roll("2d10").evaluate();
      await dodaj({ opis: `Silnik padnie za ${r.total} rund.` });
      await _dodajZegar(actor, { id: "chlodnica", rodzaj: "chlodnica", koniec: teraz + r.total * RUNDA_S() });
      zrobione.push(`zegar: awaria silnika (15) za ${r.total} rund`);
      break;
    }
    case 15:
      await dodaj({ changes: [change(MOVE, CHANGE_TYPE.multiply, "0.5")], opis: "Rozpęd: trzy tury z połową Szybkości, potem 0." });
      await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SILNIK}.wl`]: false });
      await _dodajZegar(actor, { id: "rozped", rodzaj: "rozped", koniec: teraz + 3 * RUNDA_S() });
      zrobione.push("silnik zgasł; trzy tury rozpędu z ½ Szybkości (zegar), potem 0");
      break;
    case 17:
      await dodaj();
      if (stanSilnika(actor).swiatla) {
        await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SILNIK}.swiatla`]: false });
        await ustawSwiatloZetonow(actor, false);
      }
      zrobione.push("zapłon zawodzi (Uruchom zablokowane), światła zgaszone");
      break;
    case 18:
      await dodaj({ changes: [change("system.attributes.ac.flat", CHANGE_TYPE.add, "-1")] });
      zrobione.push("TT −1");
      break;
    case 19:
      zrobione.push(...await _zranieniePasazera(pojazdDoc ?? actor));
      break;
    case 20: {
      const bron = actor.items.filter(i => i.type === "weapon" && i.flags?.[MODULE_ID]?.stanowisko);
      if (!bron.length) {
        zrobione.push("brak broni pokładowej → Zranienie pasażera (19)");
        zrobione.push(...await _zranieniePasazera(pojazdDoc ?? actor));
      } else {
        await dodaj({ opis: `Uszkodzona broń: ${bron.map(b => esc(b.name)).join(", ")}.` });
        zrobione.push(`broń pokładowa uszkodzona: ${bron.map(b => b.name).join(", ")} — strzela dopiero po naprawie (MG pilnuje)`);
      }
      break;
    }
    default:
      // 3, 4, 5, 6, 10, 12, 14, 16 — znacznik z tekstem; pilnują ich haki (3, 4, 12) albo karty i okna (6, 10, 14, 16).
      await dodaj();
      zrobione.push(`znacznik „${AWARIE_POJAZDOW[k20].nazwa}”${[3, 4, 12].includes(Number(k20)) ? " — moduł liczy skutek na Testach i turach kierowcy" : " — skutek na kartach i w oknach"}`);
  }
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/hazard.svg", tytul: `Awaria ${k20} zastosowana`, rodzaj: "info",
    linie: [`<strong>${esc(actor.name)}</strong>${zrodlo ? ` (${esc(zrodlo)})` : ""}: ${zrobione.map(esc).join("; ")}.`]
  }), { actor, szept: "gm" });
  return zrobione;
}

async function _zranieniePasazera(pojazdDoc) {
  const jadacy = pojazdDoc?.parent ? jadacyPojazdu(pojazdDoc) : [];
  if (!jadacy.length) return ["nikt nie jedzie — bez skutku"];
  const ofiara = jadacy[Math.floor(Math.random() * jadacy.length)];
  const ostatnie = Number(pojazdDoc.actor.flags?.[MODULE_ID]?.[FLAGA_OSTATNIE_OBRAZENIA]) || 0;
  const r = await new Roll("2d10").evaluate();
  const ile = Math.max(Math.floor(ostatnie / 2), r.total);
  await ofiara.actor?.applyDamage?.([{ value: ile, type: "piercing", properties: new Set() }]);
  await wyslijKarte(kartaPostoju({
    ikona: ofiara.texture.src, tytul: "Zranienie pasażera", rodzaj: "porazka",
    linie: [`${esc(ofiara.name)} dostaje <strong>${ile}</strong> obrażeń (połowa obrażeń pojazdu ${Math.floor(ostatnie / 2)}, minimum 2k10 = ${r.total}) — zastosowane.`]
  }), { actor: ofiara.actor, rolls: [r] });
  return [`${ofiara.name}: ${ile} obrażeń`];
}

/* -------------------------------------------- */
/*  Karta obrażeń grupowych                       */
/* -------------------------------------------- */

/**
 * Karta MG: jeden rzut obrażeń, przyciski [Pełne] / [½] dla pojazdu i każdego jadącego (RO rozstrzyga stół).
 * @param {TokenDocument} pojazdDoc
 * @param {string} formula
 * @param {string} typ
 * @param {{tytul: string, ro?: string, zJadacymi?: boolean, cele?: TokenDocument[]}} o
 */
export async function kartaObrazen(pojazdDoc, formula, typ, { tytul, ro = "", zJadacymi = true, cele = null, bezPojazdu = false } = {}) {
  const roll = await new Roll(formula).evaluate();
  const lista = cele ?? [...(bezPojazdu ? [] : [pojazdDoc]), ...(zJadacymi && pojazdDoc?.parent ? jadacyPojazdu(pojazdDoc) : [])];
  const przyciski = [];
  for (const t of lista) {
    if (!t?.actor) continue;
    przyciski.push({ akcja: "pojazd.obrazenia", label: `${t.name}: ${roll.total}`, gm: true, ikona: "fa-solid fa-burst",
      dane: { cel: t.actor.uuid, ile: roll.total, typ } });
    if (ro) przyciski.push({ akcja: "pojazd.obrazenia", label: `½ (${Math.floor(roll.total / 2)})`, gm: true,
      dane: { cel: t.actor.uuid, ile: Math.floor(roll.total / 2), typ } });
  }
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/explosion.svg", tytul, rodzaj: "porazka",
    linie: [`<strong>${roll.total}</strong> (${formula.replace("d", "k")}) obrażeń: ${esc(CONFIG.DND5E.damageTypes[typ]?.label ?? typ)}.${ro ? ` RO: ${esc(ro)}.` : ""}`],
    przyciski
  }), { actor: pojazdDoc?.actor ?? null, rolls: [roll] });
  return roll.total;
}

/* -------------------------------------------- */
/*  Zegary i tura kierowcy                       */
/* -------------------------------------------- */

/** Wszystkie pojazdy świata z zegarami: aktorzy świata i żetony niepowiązane na scenach. */
function _pojazdyZZegarami() {
  const out = game.actors.filter(a => jestPojazdem(a) && _zegary(a).length);
  for (const s of game.scenes) for (const t of s.tokens) if (!t.actorLink && t.actor && jestPojazdem(t.actor) && _zegary(t.actor).length) out.push(t.actor);
  return out;
}

async function _onWorldTime(worldTime) {
  if (!game.users.activeGM?.isSelf) return;
  for (const actor of _pojazdyZZegarami()) {
    let zegary = [..._zegary(actor)];
    let zmiana = false;
    for (const z of [...zegary]) {
      if (z.rodzaj === "wyciek") {
        const rundy = Math.floor((worldTime - z.od) / RUNDA_S());
        if (rundy <= 0) continue;
        if (actor.flags?.[MODULE_ID]?.paliwo) {
          const bak = getPaliwo(actor);
          await setPaliwo(actor, { value: Math.max(0, Math.round((bak.value - 0.5 * rundy) * 10) / 10) });
        }
        z.od += rundy * RUNDA_S();
        zmiana = true;
        if (!aktywneAwariePojazdu(actor).includes(9)) zegary = zegary.filter(x => x !== z);
        continue;
      }
      if (!Number.isFinite(z.koniec) || worldTime < z.koniec) continue;
      zegary = zegary.filter(x => x !== z);
      zmiana = true;
      if (z.rodzaj === "chlodnica" && aktywneAwariePojazdu(actor).includes(13)) await zastosujAwarie(actor, 15, { zrodlo: "chłodnica" });
      if (z.rodzaj === "rozped") {
        const e = efektyAwarii(actor).find(x => x.flags[MODULE_ID][FLAGA_AWARIA].k20 === 15);
        if (e) await e.update({ "system.changes": [change(MOVE, CHANGE_TYPE.multiply, "0")] });
      }
      if (z.rodzaj === "zawieszenie") {
        const e = actor.effects.get(z.efekt);
        if (e?.disabled) {
          await e.update({ disabled: false });
          await wyslijKarte(kartaPostoju({ ikona: "icons/svg/hazard.svg", tytul: "Naprawa tymczasowa minęła", rodzaj: "porazka",
            linie: [`${esc(actor.name)}: ${esc(e.name)} — skutek wraca (s. 264: minuta).`] }), { actor });
        }
      }
      if (z.rodzaj === "wybuch") {
        const { wybuchBaku } = await import("./wrak.mjs");
        await wybuchBaku(actor);
      }
    }
    if (zmiana) await _ustawZegary(actor, zegary);
  }
}

/** Żeton pojazdu, którego kierowcą jest kombatant (scena walki). */
function _pojazdKierowcy(combatant) {
  const tok = combatant?.token;
  if (!tok) return null;
  const p = pojazdJadacego(tok);
  if (!p || !miejsceOId(p.actor, jazdaZetonu(tok).miejsce)?.kierowca) return null;
  return p;
}

async function _onUpdateCombat(combat, changes) {
  if (!game.users.activeGM?.isSelf || !combat.started || !("turn" in changes || "round" in changes)) return;
  const poprzedni = combat.previous?.combatantId ? combat.combatants.get(combat.previous.combatantId) : null;
  // Koniec tury kierowcy: pożar (awaria 1).
  const pPop = _pojazdKierowcy(poprzedni);
  if (pPop && aktywneAwariePojazdu(pPop.actor).includes(1)) {
    await kartaObrazen(pPop, "2d6", "fire", { tytul: `Pożar w ${pPop.name} (koniec tury kierowcy)`, zJadacymi: true });
  }
  // Początek tury kierowcy: błotnik (awaria 12) — 50% na gumę.
  const pTer = _pojazdKierowcy(combat.combatant);
  if (pTer && aktywneAwariePojazdu(pTer.actor).includes(12)) {
    const r = await new Roll("1d100").evaluate();
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/hazard.svg", tytul: "Błotnik (awaria 12)", rodzaj: r.total <= 50 ? "porazka" : "info",
      linie: [`${esc(pTer.name)}: k100 = ${r.total} — ${r.total <= 50 ? "guma! (awaria 2)" : "jedzie dalej."}`],
      przyciski: r.total <= 50 ? [{ akcja: "pojazd.zastosujAwarie", label: "Zastosuj awarię 2", gm: true, ikona: "fa-solid fa-wrench", dane: { pojazd: pTer.actor.uuid, k20: 2 } }] : []
    }), { actor: pTer.actor, szept: "gm", rolls: [r] });
  }
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerAwarie() {
  ustawZrodloAwarii(aktywneAwariePojazdu);
  ustawStosowanieAwarii(zastosujAwarie);
  Hooks.on("dnd5e.calculateDamage", _onCalculateDamage);
  Hooks.on("dnd5e.rollSkill", _onRollSkill);
  Hooks.on("dnd5e.preRollSkill", _onPreRollSkill);
  Hooks.on("updateWorldTime", _onWorldTime);
  Hooks.on("updateCombat", _onUpdateCombat);
  zarejestrujAkcje("pojazd.rzutAwarii", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const a = await fromUuid(btn.dataset.pojazd);
    if (a) await rzucAwarie(a);
  });
  zarejestrujAkcje("pojazd.zastosujAwarie", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const a = await fromUuid(btn.dataset.pojazd);
    if (!a) return;
    await zastosujAwarie(a, Number(btn.dataset.k20));
    btn.replaceChildren(document.createTextNode("Zastosowano"));
  });
  zarejestrujAkcje("pojazd.obrazenia", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const a = await fromUuid(btn.dataset.cel);
    const ile = Number(btn.dataset.ile) || 0;
    if (!a || !ile) return;
    await a.applyDamage([{ value: ile, type: btn.dataset.typ || "bludgeoning", properties: new Set() }]);
    btn.closest(".neuro-robota-przyciski")?.querySelectorAll(`[data-cel="${btn.dataset.cel}"]`).forEach(b => { b.disabled = true; });
    btn.prepend("✓ ");
  });
}
