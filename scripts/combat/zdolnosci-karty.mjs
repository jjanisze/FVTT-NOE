/**
 * Neuroshima 5e — karty MG i zasoby zdolności (PLAN_m7 E7, rodzina R9). Moduł wykrywa i liczy, decyzję zostawia stołowi:
 * karta z liczbami i przyciskiem, zapis zmian przez MG.
 *
 * | Zdolność | Działanie | Nośnik |
 * |---|---|---|
 * | Zryw (Twardziel 2) | 1 /KO, w swojej turze: jeszcze jedna Akcja albo Akcja Bonusowa — ogłoszenie; Akcja Bonusowa podnosi limit znacznika (`actions.dodatkowa`) | aktywność, karta |
 * | Kłusownik (Zwiadowca 2) | z narzędziami małego kłusownika: Test Survivalu albo narzędzi, karta z ST pułapki (8 + MDR + PB); ST zakładania i skutek — MG | aktywność, karta MG |
 * | Wierzę (Salt Lake City) | 1 /DO: gracz wpisuje drobny przedmiot, MG dostaje kartę z [Do ekwipunku] | aktywność, karta MG |
 * | Bez tajemnic [A] (Łowca mutantów) | Test INT (Przyroda) wobec mutanta albo potwora; karta MG z tym, co zdradza próg (nazwa, podatności, TT/PW/Szybkość), i [Powiedz graczowi] | aktywność, karta MG |
 * | Coś mi tu śmierdzi (Missisipi, D9) | mutant wchodzi w 9 m (ruch, nowy albo odkryty żeton, początek tury) → gracz: sama obecność i [Percepcja ST 15]; MG: nazwy | szept |
 * | Łapiduch (Medyk) | po potwierdzonej śmierci karta z [Reanimacja]: Test Medycyny o ST z czasu od śmierci (zegar świata, U24); sukces — znów umiera, niestabilny | karta, przekaźnik MG |
 *
 * Coś mi tu śmierdzi liczy aktywny MG na scenie, którą ogląda (odległość od krawędzi żetonów — `combat/okolicznosci.mjs`);
 * pamięć „kto już był w zasięgu” trzyma ten klient — wczytanie sceny ustawia ją bez sygnału.
 */

import { esc, przedmiotZdolnosci, kategoria, flavorKarty, zetonyWZasiegu } from "./zdolnosci-wspolne.mjs";
import { dodatkowa } from "../actors/actions.mjs";
import { kombatantWlasciciela } from "./czas-efektu.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { wejdzWUmieranie } from "./umieranie.mjs";
import { krokNaprzod } from "./tiki.mjs";
import {
  stReanimacji, REANIMACJA_PRZYCZYNY, REANIMACJA_ST, stPulapki, BEZ_TAJEMNIC, progiBezTajemnic, BEZ_TAJEMNIC_KATEGORIE,
  SMROD_ZASIEG, SMROD_ST, nowiWZasiegu
} from "../config/zdolnosci-karty-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga kart: `{ typ: "wierze"|"bezTajemnic"|"smrod"|"lapiduch", … }`. */
export const FLAG_KARTA = "kartaR9";
const PROSBA_REANIMACJA = "m7.reanimacja";
const KOLOR = "#7d5a3c";
const SMROD = "cos-mi-tu-smierdzi";
const { DialogV2 } = foundry.applications.api;

const _gm = () => game.users.filter(u => u.isGM).map(u => u.id);
const _gracze = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission(u, "OWNER")).map(u => u.id);
const _jestWykonawca = () => game.users.activeGM?.isSelf ?? false;
const _rzut = r => (Array.isArray(r) ? r[0] : r) ?? null;
const _jedenCel = () => {
  const t = [...(game.user.targets ?? [])];
  return t.length === 1 ? t[0] : null;
};

/* -------------------------------------------- */
/*  Zryw                                         */
/* -------------------------------------------- */

function _walidujZryw(actor) {
  const c = kombatantWlasciciela(actor);
  if (!c) return "Zryw: tylko w walce, w swojej turze.";
  if (game.combat.combatant?.id !== c.id) return "Zryw: tylko w swojej turze.";
  return null;
}

async function _zryw(actor) {
  const rodzaj = await DialogV2.wait({
    window: { title: `Zryw — ${actor.name}` },
    content: "<p>Jeszcze jedna w tej turze:</p>",
    buttons: [{ action: "A", label: "Akcja", default: true }, { action: "B", label: "Akcja Bonusowa" }],
    rejectClose: false
  }) ?? "A";
  if (rodzaj === "B") await dodatkowa(actor, "B");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: flavorKarty(KOLOR, `⚡ Zryw — ${esc(actor.name)}`,
      `W tej turze jeszcze jedna ${rodzaj === "B" ? "Akcja Bonusowa" : "Akcja"}. Wraca po Krótkim albo Długim odpoczynku.`)
  });
}

/* -------------------------------------------- */
/*  Kłusownik                                    */
/* -------------------------------------------- */

const _maKlusownika = actor => actor.items.some(i => i.type === "tool" && i.system?.type?.baseItem === "klusownika");

async function _klusownik(actor) {
  const test = await DialogV2.wait({
    window: { title: `Kłusownik — ${actor.name}` },
    content: "<p>Pułapka z tego, co pod ręką — minuta pracy. Test budowy:</p>",
    buttons: [{ action: "sur", label: "Survival", default: true }, { action: "tool", label: "Narzędzia małego kłusownika" }],
    rejectClose: false
  });
  if (!test) return;
  const flavor = `Kłusownik — budowa pułapki (${test === "tool" ? "narzędzia małego kłusownika" : "Survival"})`;
  const roll = _rzut(test === "tool"
    ? await actor.rollToolCheck({ tool: "klusownika" }, {}, { data: { flavor } })
    : await actor.rollSkill({ skill: "sur" }, {}, { data: { flavor } }));
  if (!roll) return;
  const st = stPulapki({ mdr: actor.system.abilities?.wis?.mod, pb: actor.system.attributes?.prof });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: [..._gm(), ..._gracze(actor)],
    content: flavorKarty(KOLOR, `🪤 Pułapka — ${esc(actor.name)}`,
      `Test budowy: <strong>${roll.total}</strong> — ST zakładania z przykładów Kłusownika ustala MG. `
      + `ST zauważenia, wyzwolenia się i uniknięcia części obrażeń: <strong>${st}</strong> (8 + MDR + PB). `
      + "Działanie pułapki — MG.")
  });
}

/* -------------------------------------------- */
/*  Wierzę                                       */
/* -------------------------------------------- */

const _trescWierze = (actor, nazwa, dodano) => flavorKarty(KOLOR, `🙏 Wierzę — ${esc(actor.name)}`,
  `„${esc(nazwa)}” — drobny przedmiot (maks. 5 gb), łatwy do zabrania i przypadkowy; MG wprowadza go do gry.`)
  + (dodano
    ? `<p><i class="fa-solid fa-check"></i> W ekwipunku.</p>`
    : `<button type="button" data-neuro-m7-wierze="1"><i class="fa-solid fa-box-open"></i> Do ekwipunku (MG)</button>`);

async function _wierze(actor, item) {
  const dane = await DialogV2.input({
    window: { title: `Wierzę — ${actor.name}` },
    content: "<p>Drobny przedmiot (maks. 5 gb), łatwy do zabrania i przypadkowy:</p>"
      + `<input type="text" name="przedmiot" autofocus>`,
    ok: { label: "Wierzę" },
    rejectClose: false
  });
  const nazwa = String(dane?.przedmiot ?? "").trim();
  if (!nazwa) {
    // Okno zamknięte bez przedmiotu — użycie wraca.
    const spent = Number(item.system.uses?.spent) || 0;
    if (spent > 0) await item.update({ "system.uses.spent": spent - 1 });
    return;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: [..._gm(), ..._gracze(actor)],
    content: _trescWierze(actor, nazwa, false),
    flags: { [MODULE_ID]: { [FLAG_KARTA]: { typ: "wierze", actorUuid: actor.uuid, nazwa } } }
  });
}

async function _wierzeDoEkwipunku(message) {
  const k = message.getFlag(MODULE_ID, FLAG_KARTA);
  const actor = k?.actorUuid ? await fromUuid(k.actorUuid) : null;
  if (!actor || k.dodano) return;
  await actor.createEmbeddedDocuments("Item", [{
    name: k.nazwa, type: "loot", img: "icons/svg/item-bag.svg",
    system: { description: { value: "<p>Wierzę — przedmiot wprowadzony do gry przez MG.</p>" } }
  }]);
  await message.update({ content: _trescWierze(actor, k.nazwa, true), [`flags.${MODULE_ID}.${FLAG_KARTA}.dodano`]: true });
}

/* -------------------------------------------- */
/*  Bez tajemnic                                 */
/* -------------------------------------------- */

function _walidujBezTajemnic() {
  const cel = _jedenCel();
  if (!cel?.actor) return "Bez tajemnic: wskaż jedną istotę (cel).";
  if (!BEZ_TAJEMNIC_KATEGORIE.includes(kategoria(cel.actor))) return `Bez tajemnic: ${cel.name} nie jest mutantem ani potworem.`;
  return null;
}

const _etykiety = (zbior, config) => [...(zbior ?? [])].map(k => config?.[k]?.label ?? k);

/** Co zdradza każdy próg — z karty istoty. Trzy współczynniki wybiera MG; podpowiedź: TT, PW, Szybkość. */
export function wiedzaBezTajemnic(actor) {
  const s = actor?.system ?? {};
  const pod = _etykiety(s.traits?.dv?.value, CONFIG.DND5E?.damageTypes);
  const ruch = s.attributes?.movement ?? {};
  return {
    nazwa: actor?.token?.baseActor?.name ?? actor?.name ?? "?",
    slabe: pod.length ? `podatności: ${pod.join(", ")}` : "karta nie ma podatności — słabe punkty opisuje MG",
    wspolczynniki: `TT ${s.attributes?.ac?.value ?? "?"}, PW ${s.attributes?.hp?.max ?? "?"}, `
      + `Szybkość ${ruch.walk ?? "?"} ${ruch.units ?? "m"}`
  };
}

function _trescBezTajemnic(actor, cel, wynik, progi) {
  const w = wiedzaBezTajemnic(cel);
  const wiersze = BEZ_TAJEMNIC.map(p => {
    const ma = progi.includes(p.id);
    const przycisk = ma ? ` <button type="button" data-neuro-m7-powiedz="${p.id}" style="width:auto;line-height:1.2;padding:0 6px">Powiedz graczowi</button>` : "";
    return `<li style="opacity:${ma ? 1 : 0.5}">${ma ? "✓" : "✗"} <strong>${p.label}</strong> (ST ${p.st}): ${esc(w[p.id])}${przycisk}</li>`;
  }).join("");
  return flavorKarty(KOLOR, `🔎 Bez tajemnic — ${esc(actor.name)} o ${esc(cel.name)}`,
    `Test INT (Przyroda): <strong>${wynik}</strong>.${progi.length ? "" : " Nic nie wie."}`)
    + `<ul style="margin:2px 0 0 14px;padding:0;font-size:12px">${wiersze}</ul>`
    + (progi.includes("wspolczynniki") ? `<p style="font-size:11px;opacity:.8">Trzy współczynniki wybiera MG — przycisk podaje TT, PW i Szybkość.</p>` : "");
}

async function _bezTajemnic(actor) {
  const cel = _jedenCel();
  if (!cel?.actor) return;
  const roll = _rzut(await actor.rollSkill({ skill: "prz", ability: "int" }, {}, {
    data: { flavor: `Bez tajemnic — ${cel.name} (Przyroda: ST 10 / 15 / 20)` }
  }));
  if (!roll) return;
  const progi = progiBezTajemnic(roll.total);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: _gm(),
    content: _trescBezTajemnic(actor, cel.actor, roll.total, progi),
    flags: { [MODULE_ID]: { [FLAG_KARTA]: { typ: "bezTajemnic", actorUuid: actor.uuid, celUuid: cel.actor.uuid, progi } } }
  });
}

async function _powiedzGraczowi(message, prog) {
  const k = message.getFlag(MODULE_ID, FLAG_KARTA);
  if (!k?.progi?.includes(prog)) return;
  const [actor, cel] = await Promise.all([fromUuid(k.actorUuid), fromUuid(k.celUuid)]);
  if (!actor || !cel) return;
  const p = BEZ_TAJEMNIC.find(x => x.id === prog);
  await ChatMessage.create({
    speaker: { alias: "Bez tajemnic" },
    whisper: [..._gm(), ..._gracze(actor)],
    content: flavorKarty(KOLOR, `🔎 ${esc(actor.name)} wie: ${esc(p.label)}`, esc(wiedzaBezTajemnic(cel)[prog]))
  });
}

/* -------------------------------------------- */
/*  Coś mi tu śmierdzi                           */
/* -------------------------------------------- */

/** Pamięć wykonawcy: id żetonu posiadacza → id żetonów mutantów w zasięgu. */
const _wZasiegu = new Map();
let _smrodTimer = null;

const _mutant = t => kategoria(t.actor) === "mutant" && !t.actor.statuses?.has("dead");

function _posiadacze() {
  return (canvas?.tokens?.placeables ?? []).filter(t => t.actor && przedmiotZdolnosci(t.actor, { originAbilityId: SMROD }));
}

/**
 * Przelicz zasięg każdego posiadacza; sygnał — tylko o mutantach, których przedtem nie było. `cicho` — sama pamięć
 * (wczytanie sceny).
 */
export async function sprawdzSmrod({ cicho = false } = {}) {
  if (!_jestWykonawca() || !canvas?.ready) return;
  for (const t of _posiadacze()) {
    const mutanci = zetonyWZasiegu(t, SMROD_ZASIEG).filter(_mutant);
    const nowi = nowiWZasiegu(_wZasiegu.get(t.id), mutanci.map(m => m.id));
    _wZasiegu.set(t.id, new Set(mutanci.map(m => m.id)));
    if (!cicho && nowi.length) await _sygnalSmrodu(t, mutanci.filter(m => nowi.includes(m.id)));
  }
}

function _zaplanujSmrod() {
  clearTimeout(_smrodTimer);
  _smrodTimer = setTimeout(() => { void sprawdzSmrod(); }, 250);
}

async function _sygnalSmrodu(t, mutanci) {
  const actor = t.actor;
  const gracze = _gracze(actor);
  const nazwy = mutanci.map(m => m.name).join(", ");
  if (gracze.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      whisper: gracze,
      content: flavorKarty(KOLOR, `🐀 Coś mi tu śmierdzi — ${esc(actor.name)}`,
        `Wyczuwasz mutanta w promieniu ${SMROD_ZASIEG} m.`)
        + `<button type="button" data-neuro-m7-smrod="1"><i class="fa-solid fa-eye"></i> Percepcja ST ${SMROD_ST} — który?</button>`,
      flags: { [MODULE_ID]: { [FLAG_KARTA]: { typ: "smrod", actorUuid: actor.uuid, mutanci: mutanci.map(m => m.document.uuid) } } }
    });
  }
  await ChatMessage.create({
    speaker: { alias: "Coś mi tu śmierdzi" },
    whisper: _gm(),
    content: flavorKarty(KOLOR, `🐀 ${esc(actor.name)} wyczuwa mutanta (${SMROD_ZASIEG} m)`,
      `${esc(nazwy)}.${gracze.length ? ` Gracz wie tylko, że jest; Percepcja ST ${SMROD_ST} wskazuje istotę.` : ""}`)
  });
}

async function _smrodPercepcja(message, event) {
  const k = message.getFlag(MODULE_ID, FLAG_KARTA);
  const actor = k?.actorUuid ? await fromUuid(k.actorUuid) : null;
  if (!actor?.isOwner) return;
  const roll = _rzut(await actor.rollSkill({ skill: "prc", target: SMROD_ST, event }, {}, {
    data: { flavor: `Coś mi tu śmierdzi — który to? (Percepcja ST ${SMROD_ST})` }
  }));
  if (!roll || roll.total < SMROD_ST) return;
  const zetony = (await Promise.all((k.mutanci ?? []).map(u => fromUuid(u)))).filter(Boolean);
  for (const d of zetony) if (d.object?.center && d.parent === canvas.scene) canvas.ping(d.object.center, { style: "alert" });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: [..._gm(), ..._gracze(actor)],
    content: flavorKarty(KOLOR, `🐀 ${esc(actor.name)} wskazuje`, esc(zetony.map(d => d.name).join(", ") || "—"))
  });
}

/* -------------------------------------------- */
/*  Łapiduch                                     */
/* -------------------------------------------- */

const _lapiduch = actor => !!przedmiotZdolnosci(actor, { abilityId: "lapiduch" });

function _trescReanimacji(actor, { koniec = null } = {}) {
  const progi = REANIMACJA_ST.map(p => `do ${p.doSekund / 60} min — ST ${p.st}`).join(", ");
  const stopka = koniec
    ? `<p><i class="fa-solid fa-heart-pulse"></i> ${esc(koniec)}</p>`
    : `<button type="button" data-neuro-m7-reanimacja="1"><i class="fa-solid fa-heart-pulse"></i> Reanimacja (Łapiduch)</button>`;
  return flavorKarty(KOLOR, `🫀 Łapiduch — ${esc(actor.name)}`,
    `Reanimacja trwa minutę: Test Medycyny o ST z czasu od ustania tętna (${progi}); później — za późno. `
    + "Udana przywraca funkcje życiowe, ale stan nie jest stabilny.") + stopka;
}

/** Hak `neuroshima.smiercPotwierdzona` (MG, który potwierdził): karta, jeśli ktoś w świecie ma Łapiducha. */
async function _poSmierci(actor, karta) {
  if (!game.user.isGM || !REANIMACJA_PRZYCZYNY.includes(karta?.przyczyna)) return;
  if (!game.actors.some(a => a.type === "character" && a.id !== actor.id && _lapiduch(a))) return;
  const chwila = Number.isFinite(karta.chwila) ? karta.chwila : game.time.worldTime;
  await ChatMessage.create({
    speaker: { alias: "Łapiduch" },
    content: _trescReanimacji(actor),
    flags: { [MODULE_ID]: { [FLAG_KARTA]: { typ: "lapiduch", actorUuid: actor.uuid, chwila } } }
  });
}

function _medykKlikajacego(pacjent) {
  const kandydaci = [game.user.character, ...(canvas?.tokens?.controlled ?? []).map(t => t.actor)];
  const m = kandydaci.find(a => a && a.uuid !== pacjent.uuid && a.isOwner && _lapiduch(a));
  if (m || !game.user.isGM) return m ?? null;
  return game.actors.find(a => a.type === "character" && a.uuid !== pacjent.uuid && _lapiduch(a)) ?? null;
}

async function _reanimacja(message, event) {
  const k = message.getFlag(MODULE_ID, FLAG_KARTA);
  const pacjent = k?.actorUuid ? await fromUuid(k.actorUuid) : null;
  if (!pacjent) return;
  if (!pacjent.statuses?.has("dead")) return void ui.notifications.info(`${pacjent.name} nie wymaga reanimacji.`);
  const medyk = _medykKlikajacego(pacjent);
  if (!medyk) return void ui.notifications.warn("Reanimacja: przypisz postać z Łapiduchem albo zaznacz jej żeton.");
  const minelo = game.time.worldTime - (Number(k.chwila) || 0);
  const st = stReanimacji(minelo);
  if (st === null) return void ui.notifications.warn(`Za późno — od śmierci minęło ponad ${REANIMACJA_ST.at(-1).doSekund / 60} minut.`);
  const roll = _rzut(await medyk.rollSkill({ skill: "med", target: st, event }, {}, {
    data: { flavor: `Łapiduch — reanimacja: ${pacjent.name} (Medycyna ST ${st}, ${Math.round(minelo / 6) / 10} min od śmierci)` }
  }));
  if (!roll || roll.total < st) return;
  await doMG(PROSBA_REANIMACJA, { actorUuid: pacjent.uuid, kto: medyk.name, messageId: message.id }, { nosiciel: medyk });
}

/** U MG: martwy → umierający, 0 PW, tor od zera (`wejdzWUmieranie`). */
export async function reanimuj(actor, { kto = "", messageId = null } = {}) {
  if (!game.user.isGM || !actor?.statuses?.has("dead")) return false;
  await actor.toggleStatusEffect("dead", { active: false });
  if (Number(actor.system.attributes?.hp?.value) !== 0) await actor.update({ "system.attributes.hp.value": 0 });
  await wejdzWUmieranie(actor, `Reanimacja${kto ? ` — ${kto}` : ""} (Łapiduch)`);
  const message = messageId ? game.messages.get(messageId) : null;
  if (message) await message.update({ content: _trescReanimacji(actor, { koniec: `Reanimacja udana${kto ? ` — ${kto}` : ""}. Znów umiera.` }) });
  return true;
}

/* -------------------------------------------- */
/*  Aktywności i kliknięcia                      */
/* -------------------------------------------- */

const _id = item => item?.getFlag(MODULE_ID, "abilityId") ?? item?.getFlag(MODULE_ID, "originAbilityId") ?? null;

const WALIDACJA = Object.freeze({
  zryw: _walidujZryw,
  klusownik: actor => (_maKlusownika(actor) ? null : "Kłusownik: bez narzędzi małego kłusownika pułapki nie zbudujesz."),
  "bez-tajemnic": () => _walidujBezTajemnic()
});

const UZYCIE = Object.freeze({ zryw: _zryw, klusownik: _klusownik, wierze: _wierze, "bez-tajemnic": _bezTajemnic });

/** Synchronicznie — `false` z obietnicy nie zatrzymałby użycia. */
function _onPreUseActivity(activity) {
  const actor = activity?.actor;
  const powod = actor ? WALIDACJA[_id(activity.item)]?.(actor) : null;
  if (!powod) return;
  ui.notifications.warn(powod);
  return false;
}

function _onPostUseActivity(activity) {
  const actor = activity?.actor;
  const fn = actor ? UZYCIE[_id(activity.item)] : null;
  if (fn) void fn(actor, activity.item);
}

async function _onClick(event) {
  const btn = event.target.closest?.("[data-neuro-m7-wierze], [data-neuro-m7-powiedz], [data-neuro-m7-smrod], [data-neuro-m7-reanimacja]");
  if (!btn) return;
  const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
  if (!message?.getFlag(MODULE_ID, FLAG_KARTA)) return;
  event.preventDefault();
  event.stopPropagation();
  btn.disabled = true;
  setTimeout(() => { if (btn.isConnected) btn.disabled = false; }, 3000);
  if (btn.dataset.neuroM7Wierze) return game.user.isGM && _wierzeDoEkwipunku(message);
  if (btn.dataset.neuroM7Powiedz) return game.user.isGM && _powiedzGraczowi(message, btn.dataset.neuroM7Powiedz);
  // Shift — rzut bez okna (`config.event`, jak przyciski krwawień).
  if (btn.dataset.neuroM7Smrod) return _smrodPercepcja(message, event);
  if (btn.dataset.neuroM7Reanimacja) return _reanimacja(message, event);
}

export function registerZdolnosciKarty() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("neuroshima.smiercPotwierdzona", (actor, karta) => { void _poSmierci(actor, karta); });
  zarejestrujProsbe(PROSBA_REANIMACJA, async (_nosiciel, d) => reanimuj(await fromUuid(d.actorUuid), d));
  // Coś mi tu śmierdzi: ruch i odkrycie żetonu, nowy żeton, początek tury; wczytanie sceny — sama pamięć.
  Hooks.on("updateToken", (_doc, changes) => {
    if (["x", "y", "elevation", "hidden"].some(k => k in changes)) _zaplanujSmrod();
  });
  Hooks.on("createToken", _zaplanujSmrod);
  Hooks.on("deleteToken", _zaplanujSmrod);
  Hooks.on("updateCombat", (combat, changes) => {
    if (("turn" in changes || "round" in changes) && krokNaprzod(combat.previous, combat.current)) _zaplanujSmrod();
  });
  Hooks.on("canvasReady", () => {
    _wZasiegu.clear();
    void sprawdzSmrod({ cicho: true });
  });
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Karty MG zdolności (M7 E7) registered`);
}

/** `game.neuroshima.zdolnosciKarty` */
export const zdolnosciKartyApi = Object.freeze({ sprawdzSmrod, reanimuj, wiedzaBezTajemnic });

export const __testing = Object.freeze({ _walidujZryw, _maKlusownika, _wZasiegu });
