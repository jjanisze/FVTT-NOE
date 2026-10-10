/**
 * Neuroshima 5e — tworzenie towarzyszy (PLAN_m3_towarzysze.md §7.8, D17, D19, D31, U5, U23; E4).
 *
 *   - **Narzędzie MG „Nowy towarzysz”** (pasek na karcie właściciela): rodzaj ze zdolności właściciela
 *     (Partner: pies albo człowiek; Oswajanie: k6 albo wybór MG; Prawa ręka: człowiek), imię; zwierzę z
 *     szablonu paczki `towarzysze`, człowiek — czysta karta postaci z efektem PB +2 (U3). Flaga U1, własność
 *     graczy właściciela, folder „Towarzysze”, członkostwo w drużynie właściciela (D19), szept do graczy.
 *   - **[Odłącz]** (MG) — zdejmuje flagę U1: towarzysz odchodzi z fabuły albo zostaje postacią zapasową
 *     gracza po śmierci właściciela (D31).
 *   - **Kreator ludzkiego towarzysza** — trzy kroki w nagłówku karty, po kolei: Cechy (zestaw
 *     14,14,12,12,10,8 albo 24 pkt z tabeli kupowania, U5), Pochodzenie (miejsce werbunku), klasa „Towarzysz”
 *     (2 RO, 2 umiejętności lub zestawy narzędzi, Sztuczka — ostatnia, bo jej wymagania czytają cechy).
 *     Pochodzenie i klasa idą przez `AdvancementManager` dnd5e (R6).
 *   - **Poziomy klasy „Towarzysz” = poziom klasy właściciela** (U5) — jedyny zapis przy awansie
 *     właściciela; bieżące PW rosną o deltę maks. (5 na poziom), jak `pwGainOnAdvancement`.
 *   - **Klasa „Towarzysz” na postaci gracza (U23)** — potwierdzenie przed upuszczeniem.
 */

import { RODZAJE, ZRODLA } from "../config/towarzysze-data.mjs";
import { ZESTAW_CECH, KOSZT_CECHY, kupowanieCech, jestZestawemCech } from "../config/towarzysze-rules.mjs";
import {
  FLAG, towarzysz, jestTowarzyszem, rodzajTowarzysza, wlascicielTowarzysza, towarzyszeWlasciciela, zapewnijEfektPB
} from "./towarzysze.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Identyfikator klasy towarzysza (`dev/packs/build-towarzysze.mjs`). */
export const KLASA_TOWARZYSZA = "towarzysz";
/** `flags.<mod>.kreator = { cechy: true }` — krok cech zrobiony. */
const FLAG_KREATOR = "kreator";
const FOLDER = "Towarzysze";
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const SKROTY = { str: "SIŁ", dex: "ZRC", con: "KON", int: "INT", wis: "MDR", cha: "CHA" };

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const DialogV2 = () => foundry.applications.api.DialogV2;

/* -------------------------------------------- */
/*  Narzędzie MG                                 */
/* -------------------------------------------- */

async function _folder() {
  return game.folders.find(f => f.type === "Actor" && f.name === FOLDER)
    ?? Folder.implementation.create({ name: FOLDER, type: "Actor", color: "#5a4a2a" });
}

/** Własność towarzysza: gracze-właściciele aktora właściciela. */
function _wlasnosc(owner) {
  const own = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
  for (const u of game.users) {
    if (!u.isGM && owner.testUserPermission(u, "OWNER")) own[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }
  return own;
}

/** Szablon rodzaju z paczki `towarzysze` (zwierzęta i drony) albo `null`. */
export async function szablonTowarzysza(rodzaj) {
  const pack = game.packs.get(`${MODULE_ID}.towarzysze`);
  if (!pack) return null;
  const index = await pack.getIndex({ fields: [`flags.${MODULE_ID}.towarzyszSzablon`] });
  const e = index.find(i => foundry.utils.getProperty(i, `flags.${MODULE_ID}.towarzyszSzablon`) === rodzaj);
  return e ? pack.getDocument(e._id) : null;
}

/**
 * Tworzy towarzysza (D17) — bez okna; okno to `nowyTowarzysz`.
 * @param {Actor} owner
 * @param {{rodzaj: string, nazwa?: string, zrodlo?: string}} o
 * @returns {Promise<Actor|null>}
 */
export async function utworzTowarzysza(owner, { rodzaj, nazwa = null, zrodlo = null } = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Towarzysza tworzy MG.");
    return null;
  }
  const wpis = RODZAJE[rodzaj];
  if (!owner || !wpis) return null;
  const klasa = ZRODLA[zrodlo ?? wpis.zrodlo]?.klasa ?? wpis.klasa;
  const flags = { [MODULE_ID]: { [FLAG]: { wlasciciel: owner.uuid, rodzaj, klasa } } };
  const folder = await _folder();
  const ownership = _wlasnosc(owner);
  const name = (nazwa ?? "").trim() || wpis.nazwa;

  let data;
  if (wpis.typAktora === "npc") {
    const szablon = await szablonTowarzysza(rodzaj);
    if (!szablon) {
      ui.notifications.error(`Brak szablonu „${wpis.nazwa}” w paczce Towarzysze.`);
      return null;
    }
    data = game.actors.fromCompendium(szablon);
    foundry.utils.mergeObject(data, { name, folder: folder.id, ownership, flags });
    data.prototypeToken = { ...(data.prototypeToken ?? {}), name };
  } else {
    data = {
      name, type: "character", folder: folder.id, ownership, flags,
      prototypeToken: { name, actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY, sight: { enabled: true } }
    };
  }
  const actor = await Actor.implementation.create(data);
  if (wpis.typAktora === "character") await zapewnijEfektPB(actor);
  // Pełne PW na start: maks. liczy moduł z właściciela, źródło ma tylko bieżące.
  await actor.update({ "system.attributes.hp.value": actor.system.attributes.hp.max });

  const party = game.actors.party;
  if (party?.system?.members?.some(m => m.actor === owner)) await party.system.addMember(actor);

  const gracze = Object.entries(ownership).filter(([id, lvl]) => id !== "default" && lvl >= 3).map(([id]) => id);
  await ChatMessage.create({
    content: `<p><i class="fa-solid fa-user-plus"></i> Nowy towarzysz ${esc(owner.name)}: @UUID[${actor.uuid}]{${esc(actor.name)}} `
      + `(${esc(wpis.nazwa)}).${wpis.typAktora === "character" ? " Dokończ go w kreatorze w nagłówku karty." : ""}</p>`,
    whisper: [...new Set([...gracze, ...game.users.filter(u => u.isGM).map(u => u.id)])]
  });
  return actor;
}

/**
 * Okno MG „Nowy towarzysz” dla zdolności `zrodlo` właściciela.
 * @param {Actor} owner
 * @param {string} zrodlo  `partner` | `oswajanie-zwierzat` | `moja-prawa-reka`
 */
export async function nowyTowarzysz(owner, zrodlo) {
  if (!game.user.isGM) return ui.notifications.warn("Towarzysza tworzy MG.");
  const z = ZRODLA[zrodlo];
  if (!z?.szukanie) return ui.notifications.warn("Ta zdolność nie daje towarzysza do znalezienia.");
  const opcje = z.rodzaje.map(r => `<option value="${r}">${esc(RODZAJE[r].nazwa)}</option>`);
  if (z.k6) opcje.unshift(`<option value="k6" selected>Rzuć k6 (1–2 owad, 3–4 ssak, 5–6 gad)</option>`);
  const wynik = await DialogV2().prompt({
    window: { title: `Nowy towarzysz — ${owner.name}` },
    content: `<div class="form-group"><label>Rodzaj</label><div class="form-fields"><select name="rodzaj">${opcje.join("")}</select></div></div>
      <div class="form-group"><label>Imię</label><div class="form-fields"><input type="text" name="nazwa" placeholder="imię towarzysza"></div></div>
      <p class="hint">${esc(z.nazwa)} — ${esc(owner.name)}. Szukanie: ${z.szukanie.godziny} h (${esc(z.szukanie.strona)}).</p>`,
    ok: {
      label: "Utwórz",
      callback: (_ev, button) => ({ rodzaj: button.form.elements.rodzaj.value, nazwa: button.form.elements.nazwa.value })
    },
    rejectClose: false
  });
  if (!wynik) return null;
  let rodzaj = wynik.rodzaj;
  if (rodzaj === "k6") {
    const roll = await new Roll("1d6").evaluate();
    rodzaj = z.k6[roll.total];
    await roll.toMessage({ flavor: `${z.nazwa}: ${RODZAJE[rodzaj].nazwa}`, speaker: ChatMessage.getSpeaker({ actor: owner }) },
      { messageMode: "gm" });
  }
  const actor = await utworzTowarzysza(owner, { rodzaj, nazwa: wynik.nazwa, zrodlo });
  actor?.sheet?.render(true);
  return actor;
}

/** [Odłącz] (D31) — zdejmuje flagę U1 po potwierdzeniu MG. */
export async function odlaczTowarzysza(actor, { potwierdz = true } = {}) {
  if (!game.user.isGM || !jestTowarzyszem(actor)) return false;
  const wl = wlascicielTowarzysza(actor);
  if (potwierdz) {
    const ok = await DialogV2().confirm({
      window: { title: `Odłącz — ${actor.name}` },
      content: `<p><strong>${esc(actor.name)}</strong> przestaje być towarzyszem${wl ? ` ${esc(wl.name)}` : ""}: wartości `
        + "przestają iść za właścicielem, tura nie jest już po nim. Karta zostaje (postać zapasowa, odejście z fabuły — D31).</p>",
      rejectClose: false
    });
    if (!ok) return false;
  }
  await actor.unsetFlag(MODULE_ID, FLAG);
  return true;
}

/* -------------------------------------------- */
/*  Kreator ludzkiego towarzysza                 */
/* -------------------------------------------- */

const _klasa = actor => actor.itemTypes?.class?.find(c => c.system.identifier === KLASA_TOWARZYSZA) ?? null;

/** Stan kreatora: które kroki są zrobione. */
export function stanKreatora(actor) {
  return {
    cechy: actor.getFlag(MODULE_ID, FLAG_KREATOR)?.cechy === true,
    pochodzenie: (actor.itemTypes?.background?.length ?? 0) > 0,
    klasa: !!_klasa(actor)
  };
}

/**
 * Okno cech (U5, RAI): zestaw 14,14,12,12,10,8 albo 24 pkt z tabeli kupowania (s. 48). Zapisuje wartości
 * bazowe i znacznik kroku. Zwraca `true`, gdy zapisało.
 */
export async function oknoCech(actor) {
  const teraz = Object.fromEntries(ABILITIES.map(id => [id, actor._source.system.abilities?.[id]?.value ?? 10]));
  const wiersz = id => `<div class="form-group"><label>${SKROTY[id]}</label><div class="form-fields">
    <input type="number" name="${id}" min="8" max="15" step="1" value="${Math.min(15, Math.max(8, teraz[id]))}"></div></div>`;
  const wynik = await DialogV2().prompt({
    window: { title: `Cechy — ${actor.name}` },
    position: { width: 380 },
    content: `<p class="hint">Zestaw ${ZESTAW_CECH.join(", ")} w dowolnej kolejności albo 24 punkty z tabeli Kupowania
        cech (8–15; 14 = 7 pkt, 15 = 9 pkt). Pochodzenie dołoży swoje +1/+1 w następnym kroku.</p>
      ${ABILITIES.map(wiersz).join("")}
      <p class="neuro-kreator-koszt"></p>`,
    render: (_ev, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;
      const odswiez = () => {
        const v = ABILITIES.map(id => Number(form.querySelector(`[name="${id}"]`).value));
        const k = kupowanieCech(v);
        const el = form.querySelector(".neuro-kreator-koszt");
        el.textContent = jestZestawemCech(v) ? "Zestaw — w porządku." : `Wydane ${k.wydane}/24 pkt${k.poprawny ? "" : ` — ${k.bledy.join("; ")}`}`;
        el.classList.toggle("is-zle", !k.poprawny);
      };
      form.addEventListener("input", odswiez);
      odswiez();
    },
    ok: {
      label: "Zapisz cechy",
      callback: (_ev, button) => Object.fromEntries(ABILITIES.map(id => [id, Number(button.form.elements[id].value)]))
    },
    rejectClose: false
  });
  if (!wynik) return false;
  const wartosci = ABILITIES.map(id => wynik[id]);
  if (!jestZestawemCech(wartosci) && !kupowanieCech(wartosci).poprawny) {
    ui.notifications.warn(`Ani zestaw, ani 24 pkt: ${kupowanieCech(wartosci).bledy.join("; ")}`);
    return false;
  }
  await actor.update({
    ...Object.fromEntries(ABILITIES.map(id => [`system.abilities.${id}.value`, wynik[id]])),
    [`flags.${MODULE_ID}.${FLAG_KREATOR}.cechy`]: true
  });
  return true;
}

function _manager() {
  return globalThis.dnd5e?.applications?.advancement?.AdvancementManager ?? null;
}

/** Krok Pochodzenia: wybór z paczki `pochodzenia`, potem `AdvancementManager` (+1/+1, zdolność regionu). */
export async function krokPochodzenia(actor) {
  const pack = game.packs.get(`${MODULE_ID}.pochodzenia`);
  const docs = (await pack?.getDocuments() ?? []).filter(d => d.type === "background").sort((a, b) => a.name.localeCompare(b.name, "pl"));
  if (!docs.length) return ui.notifications.error("Brak paczki Pochodzeń.");
  const id = await DialogV2().prompt({
    window: { title: `Pochodzenie — ${actor.name}` },
    content: `<p class="hint">Pochodzenie zgodne z miejscem werbunku (s. 76, 101).</p>
      <div class="form-group"><label>Pochodzenie</label><div class="form-fields"><select name="id">${
        docs.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div></div>`,
    ok: { label: "Dalej", callback: (_ev, button) => button.form.elements.id.value },
    rejectClose: false
  });
  const doc = id ? docs.find(d => d.id === id) : null;
  if (!doc) return null;
  return _uruchomManager(actor, game.items.fromCompendium(doc));
}

/** Krok klasy: „Towarzysz” z paczki `klasy` przez `AdvancementManager`; poziomy potem — za właścicielem. */
export async function krokKlasy(actor) {
  const pack = game.packs.get(`${MODULE_ID}.klasy`);
  const doc = (await pack?.getDocuments() ?? []).find(d => d.type === "class" && d.system.identifier === KLASA_TOWARZYSZA);
  if (!doc) return ui.notifications.error("Brak klasy „Towarzysz” w paczce Klasy.");
  return _uruchomManager(actor, game.items.fromCompendium(doc));
}

function _uruchomManager(actor, itemData) {
  const AM = _manager();
  if (!AM) return actor.createEmbeddedDocuments("Item", [itemData]);
  const manager = AM.forNewItem(actor, itemData);
  if (manager.steps.length) return manager.render({ force: true });
  return actor.createEmbeddedDocuments("Item", [itemData]);
}

/** Pigułki kreatora w nagłówku karty — tylko ludzki towarzysz, tylko dopóki coś zostało. */
export function pigulkiKreatora(actor) {
  if (rodzajTowarzysza(actor)?.typAktora !== "character" || !actor.isOwner) return null;
  const s = stanKreatora(actor);
  if (s.cechy && s.pochodzenie && s.klasa) return null;
  const kroki = [
    { id: "cechy", label: "1. Cechy", zrobione: s.cechy, dostepny: true },
    { id: "pochodzenie", label: "2. Pochodzenie", zrobione: s.pochodzenie, dostepny: s.cechy },
    { id: "klasa", label: "3. Towarzysz", zrobione: s.klasa, dostepny: s.cechy && s.pochodzenie }
  ];
  const el = document.createElement("div");
  el.className = "neuro-kreator";
  el.innerHTML = `<span class="neuro-kreator-tytul">Kreator:</span>` + kroki.map(k =>
    `<button type="button" class="neuro-kreator-krok${k.zrobione ? " is-zrobione" : ""}" data-krok="${k.id}"`
    + `${k.zrobione || !k.dostepny ? " disabled" : ""}>${k.zrobione ? '<i class="fa-solid fa-check" inert></i> ' : ""}${k.label}</button>`).join("");
  el.addEventListener("click", ev => {
    const btn = ev.target.closest("button[data-krok]");
    if (!btn || btn.disabled) return;
    ev.preventDefault();
    ({ cechy: oknoCech, pochodzenie: krokPochodzenia, klasa: krokKlasy })[btn.dataset.krok]?.(actor);
  });
  return el;
}

/** [Odłącz] w nagłówku karty towarzysza — tylko MG. */
export function przyciskOdlacz(actor) {
  if (!game.user.isGM || !jestTowarzyszem(actor)) return null;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "neuro-towarzysz-odlacz";
  b.innerHTML = '<i class="fa-solid fa-link-slash" inert></i>';
  b.setAttribute("data-tooltip", "Odłącz od właściciela (D31) — tylko MG");
  b.addEventListener("click", ev => {
    ev.preventDefault();
    odlaczTowarzysza(actor);
  });
  return b;
}

/* -------------------------------------------- */
/*  Poziomy za właścicielem (U5)                 */
/* -------------------------------------------- */

/**
 * Poziomy klasy „Towarzysz” = poziom klasy właściciela. Przy awansie właściciela (`zPW`) bieżące PW rosną
 * o deltę maks. — 5 na poziom, w granicach [0, nowe maks.].
 * @returns {Promise<boolean>}  czy coś zapisało
 */
export async function synchronizujPoziom(actor, { zPW = false } = {}) {
  const cls = _klasa(actor);
  const wl = wlascicielTowarzysza(actor);
  const t = towarzysz(actor);
  if (!cls || !wl || !t) return false;
  const cel = Math.max(1, Number(wl.classes?.[t.klasa]?.system?.levels) || 0);
  const ile = Number(cls.system.levels) || 1;
  if (cel === ile) return false;
  await cls.update({ "system.levels": cel });
  if (zPW) {
    const hp = actor.system.attributes.hp;
    const nowe = Math.min(Math.max(0, (Number(actor._source.system.attributes.hp.value) || 0) + 5 * (cel - ile)), Number(hp.max) || 0);
    await actor.update({ "system.attributes.hp.value": nowe });
  }
  return true;
}

/** Kto wykonuje zapis po zmianie zrobionej przez `userId`: on, jeśli ma prawa do towarzysza; inaczej aktywny MG. */
function _wykonawca(actor, userId) {
  const autor = game.users.get(userId);
  if (autor?.isSelf) return actor.isOwner;
  return game.users.activeGM?.isSelf === true && !(autor && actor.testUserPermission(autor, "OWNER"));
}

function _poZmianieKlasyWlasciciela(item, userId) {
  if (item?.type !== "class" || !(item.parent instanceof Actor)) return;
  for (const comp of towarzyszeWlasciciela(item.parent)) {
    if (!_klasa(comp) || !_wykonawca(comp, userId)) continue;
    synchronizujPoziom(comp, { zPW: true }).catch(err => console.error(`${MODULE_ID} | poziom towarzysza ${comp.name}`, err));
  }
}

/* -------------------------------------------- */
/*  Klasa „Towarzysz” na postaci gracza (U23)    */
/* -------------------------------------------- */

function _owinUpuszczanie() {
  const Sheet = globalThis.dnd5e?.applications?.actor?.CharacterActorSheet;
  const orig = Sheet?.prototype?._onDropSingleItem;
  if (typeof orig !== "function") return console.warn(`${MODULE_ID} | brak _onDropSingleItem — bez ochrony U23`);
  Sheet.prototype._onDropSingleItem = async function (event, itemData, options) {
    if (itemData?.type === "class" && itemData.system?.identifier === KLASA_TOWARZYSZA && !jestTowarzyszem(this.actor)) {
      const ok = await DialogV2().confirm({
        window: { title: "Klasa towarzysza" },
        content: `<p><strong>Towarzysz</strong> to klasa ludzkiego towarzysza (Partner, Prawa ręka) — jego poziomy idą za `
          + `właścicielem. <strong>${esc(this.actor.name)}</strong> nie jest towarzyszem. Upuścić mimo to?</p>`,
        rejectClose: false
      });
      if (!ok) return null;
    }
    return orig.call(this, event, itemData, options);
  };
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerTowarzyszeTworzenie() {
  _owinUpuszczanie();
  Hooks.on("updateItem", (item, changes, _o, userId) => {
    if (foundry.utils.hasProperty(changes, "system.levels")) _poZmianieKlasyWlasciciela(item, userId);
  });
  Hooks.on("createItem", (item, _o, userId) => _poZmianieKlasyWlasciciela(item, userId));
  Hooks.on("deleteItem", (item, _o, userId) => _poZmianieKlasyWlasciciela(item, userId));
  // Klasa „Towarzysz” dodana kreatorem — poziomy od razu za właścicielem (bez zmiany bieżących PW).
  Hooks.on("createItem", (item, _o, userId) => {
    if (item?.type !== "class" || item.system?.identifier !== KLASA_TOWARZYSZA || game.user.id !== userId) return;
    const actor = item.parent;
    if (actor && jestTowarzyszem(actor)) synchronizujPoziom(actor);
  });
}

export const towarzyszeTworzenieApi = Object.freeze({
  nowy: nowyTowarzysz, utworz: utworzTowarzysza, odlacz: odlaczTowarzysza, synchronizujPoziom,
  oknoCech, stanKreatora, KLASA: KLASA_TOWARZYSZA, KOSZT_CECHY
});
