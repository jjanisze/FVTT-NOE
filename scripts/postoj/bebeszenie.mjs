/**
 * Neuroshima 5e — bebeszenie bestii i maszyn (PLAN_m5_postoj.md §7.19, D10–D12, D36, U15–U20; NOE s. 269).
 *
 * Wejście (U15): przycisk w HUD martwego żetonu (gracz i MG) i pozycja „Bebeszenie celu” w menu zestawów rzeźnika,
 * medyka, elektronika, mechanika i kowala (cel — wskazany żeton). Aktywność na samym zestawie wymagałaby
 * przebudowy paczki i nie dotarłaby do rozdanych już kopii, więc wejścia są w interfejsie.
 *
 * Okno: tabela z kategorii (U16; hybryda — wybór), test (narzędzia z tabeli albo Survival / Technika), pomocnicy
 * (czas ÷ osoby, D12; ich test ST 10 kartą prośby → Ułatwienie), zakres (wszystko / jeden surowiec, U18), cel
 * zdobyczy (U20: wykonawca, pojazd drużyny, Miejsce, stos na ziemi), czas do nadpisania. Człowiek i mutant —
 * wiadomość publiczna przed rzutem (D10). Maszyna z nierozstrzygniętą autodestrukcją — najpierw karta MG (§7.18);
 * po wybuchu pula ma tylko metal.
 *
 * Rzut gracza → przekaźnik → MG rozlicza: pula trupa (`flags.<mod>.bebeszenie = { tabela, pula, proby[] }` na
 * aktorze żetonu), sukces — cała pula zakresu, porażka — 10% teraz, 50% przepada, 40% zostaje (U17), naturalna 1
 * przy maszynie (U19) — autodestrukcja albo utrata CE/CH/CZ; zdobycz lejkami (surowce, `prowiant:mieso`),
 * karta podsumowania z [Przesuń czas] dla MG.
 */

import {
  TABELE_BEBESZENIA, ROZMIARY, tabelaDla, wierszBebeszenia, pulaBebeszenia, wynikBebeszenia, czasBebeszenia, naJednostki,
  pulaPusta
} from "../config/bebeszenie-data.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { NEUROSHIMA_CREATURE_TYPES } from "../config/creature-types.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { buildProwiantItemData } from "../config/prowiant-data.mjs";
import { giveManySurowce } from "../actors/surowce-store.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { isMiejsce, MIEJSCE_FLAG } from "../production/pula.mjs";
import { daneAutodestrukcji, stanAutodestrukcji, zaproponujAutodestrukcje } from "../combat/autodestrukcja.mjs";
import { druzynaGlowna } from "./miejsce.mjs";
import { postacieDruzyny } from "./doba.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";
import { doMG, zarejestrujProsbe } from "./przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAGA = "bebeszenie";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ETYKIETY = Object.freeze({ MO: "materiały organiczne", mieso: "mięso", CH: "chemikalia", MK: "metal", CE: "elektronika", CZ: "części" });
const ZESTAWY = Object.freeze(new Set([...TABELE_BEBESZENIA.bestie.narzedzia, ...TABELE_BEBESZENIA.maszyny.narzedzia]));

/* -------------------------------------------- */
/*  Trup                                         */
/* -------------------------------------------- */

/** Kategoria istoty: Bestiariusz po id, inaczej typ z karty (zapisany jako etykieta), domyślnie zwierzę. */
export function kategoriaIstoty(actor) {
  const id = actor?.flags?.[MODULE_ID]?.bestiary?.id;
  if (BESTIARY[id]?.creatureType) return BESTIARY[id].creatureType;
  const t = String(actor?.system?.details?.type?.value ?? "").toLowerCase();
  const wpis = Object.entries(NEUROSHIMA_CREATURE_TYPES).find(([k, d]) => k === t || String(d.label ?? "").toLowerCase() === t);
  return wpis?.[0] ?? "zwierze";
}

/** Czy żeton to trup: `dead` albo 0 PW. */
export function jestTrupem(actor) {
  return !!actor && (actor.statuses?.has("dead") || Number(actor.system?.attributes?.hp?.value) <= 0);
}

/** Stan trupa: pula do wybebeszenia (kg) i próby. Bez flagi — pełna pula z tabeli (po wybuchu tylko MK). */
export function stanTrupa(actor, tabela = null) {
  const f = actor?.getFlag?.(MODULE_ID, FLAGA);
  if (f?.pula) return f;
  const t = tabela ?? tabelaDla({ kategoria: kategoriaIstoty(actor), id: actor?.flags?.[MODULE_ID]?.bestiary?.id }).tabela;
  const rozmiar = actor?.system?.traits?.size ?? "med";
  const pula = pulaBebeszenia(t, rozmiar, { autodestrukcja: stanAutodestrukcji(actor)?.stan ?? null, kobalt: isKobaltEnabled() });
  return { tabela: t, pula, proby: [], nowy: true };
}

/** Uuid aktora żetonu (syntetycznego — przez żeton) do przekaźnika. */
const _uuidTrupa = token => token?.actor?.uuid ?? null;

/* -------------------------------------------- */
/*  Okno                                         */
/* -------------------------------------------- */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BebeszenieOkno extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-bebeszenie", "neuro-postoj-okno"],
    window: { title: "Bebeszenie", icon: "fa-solid fa-drumstick-bite", resizable: true },
    position: { width: 520, height: "auto" },
    actions: { bebesz: BebeszenieOkno.#bebesz, pomocnicy: BebeszenieOkno.#pomocnicy }
  };

  static PARTS = { form: { template: `${TPL}/bebeszenie.hbs` } };

  constructor(token, wykonawca, options = {}) {
    super({ id: `neuro-bebeszenie-${token.id}`, ...options });
    this.token = token;
    this.stan = { wykonawca: wykonawca?.id ?? null, tabela: null, test: null, pomocnicy: [], ulatwienie: false, zakres: "", cel: "wykonawca", minuty: null };
  }

  get title() { return `Bebeszenie — ${this.token.name}`; }

  get trup() { return this.token.actor; }

  #kandydaci() {
    const grupa = druzynaGlowna();
    // Bez drużyny głównej — postacie graczy w świecie (MG: wszystkie, gracz: swoje).
    const czlonkowie = grupa ? postacieDruzyny(grupa) : game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    const moje = game.user.isGM ? [...czlonkowie] : czlonkowie.filter(a => a.isOwner);
    if (!moje.length && game.user.character) moje.push(game.user.character);
    return { grupa, czlonkowie, moje };
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const st = this.stan;
    const trup = this.trup;
    const kategoria = kategoriaIstoty(trup);
    const id = trup?.flags?.[MODULE_ID]?.bestiary?.id;
    const t = tabelaDla({ kategoria, id });
    st.tabela ??= stanTrupa(trup).tabela ?? t.tabela;
    const { grupa, czlonkowie, moje } = this.#kandydaci();
    st.wykonawca ??= moje[0]?.id ?? null;
    const wyk = game.actors.get(st.wykonawca);
    const def = TABELE_BEBESZENIA[st.tabela];
    const zestawy = def.narzedzia.filter(k => wyk && hasToolKit(wyk, k));
    st.test ??= zestawy[0] ? `tool:${zestawy[0]}` : `skill:${def.test.umiejetnosc}`;
    const rozmiar = trup.system?.traits?.size ?? "med";
    const kobalt = isKobaltEnabled();
    const wiersz = wierszBebeszenia(st.tabela, rozmiar, { kobalt });
    const stan = stanTrupa(trup, st.tabela);
    const pula = stan.pula;
    const auto = st.tabela === "maszyny" ? stanAutodestrukcji(trup) : null;
    const maAuto = st.tabela === "maszyny" && !!daneAutodestrukcji(trup);
    ctx.trup = { nazwa: this.token.name, img: this.token.texture.src, kategoria: NEUROSHIMA_CREATURE_TYPES[kategoria]?.label ?? kategoria, rozmiar: ROZMIARY[rozmiar] ?? rozmiar, martwy: jestTrupem(trup) };
    ctx.hybryda = t.hybryda;
    ctx.tabele = Object.entries(TABELE_BEBESZENIA).map(([k, d]) => ({ k, label: d.label, selected: k === st.tabela }));
    ctx.tabela = def.label;
    ctx.jawne = t.jawne;
    ctx.wykonawcy = moje.map(a => ({ id: a.id, nazwa: a.name, selected: a.id === st.wykonawca }));
    ctx.testy = [
      ...def.narzedzia.map(k => ({ k: `tool:${k}`, label: `${CONFIG.DND5E.tools[k]?.label ?? k}${zestawy.includes(k) ? "" : " — brak zestawu"}`, disabled: !zestawy.includes(k) })),
      { k: `skill:${def.test.umiejetnosc}`, label: `${CONFIG.DND5E.abilities[def.test.cecha]?.label} (${CONFIG.DND5E.skills[def.test.umiejetnosc]?.label})` }
    ].map(o => ({ ...o, selected: o.k === st.test }));
    ctx.pomocnicy = czlonkowie.filter(a => a.id !== st.wykonawca).map(a => ({
      id: a.id, nazwa: a.name, zaznaczony: st.pomocnicy.includes(a.id), zestaw: def.narzedzia.some(k => hasToolKit(a, k))
    }));
    ctx.ulatwienie = st.ulatwienie;
    ctx.zakresy = [{ k: "", label: "wszystko" }, ...def.rodzaje.map(r => ({ k: r, label: `tylko ${ETYKIETY[r]}` }))].map(o => ({ ...o, selected: o.k === st.zakres }));
    const pojazd = grupa?.system?.primaryVehicle ?? null;
    const miejsca = game.actors.filter(a => isMiejsce(a) && a.isOwner);
    ctx.cele = [
      { k: "wykonawca", label: wyk ? `${wyk.name} (wykonawca)` : "wykonawca" },
      ...(pojazd ? [{ k: `aktor:${pojazd.id}`, label: `${pojazd.name} (pojazd drużyny)` }] : []),
      ...miejsca.map(m => ({ k: `aktor:${m.id}`, label: `${m.name} (Miejsce)` })),
      { k: "stos", label: "zostaw na ziemi (stos)" }
    ].map(o => ({ ...o, selected: o.k === st.cel }));
    ctx.st = wiersz?.st ?? null;
    ctx.wkk = !!wiersz?.wkk;
    ctx.brakWiersza = !wiersz;
    ctx.minutyDomyslne = wiersz ? czasBebeszenia({ wiersz, pomocnicy: st.pomocnicy.length, zakres: st.zakres || null, pula }) : 0;
    ctx.minuty = st.minuty ?? ctx.minutyDomyslne;
    ctx.pula = pula ? Object.entries(pula).filter(([, v]) => v > 0).map(([r, v]) => `${ETYKIETY[r] ?? r} ${Math.round(v * 100) / 100} kg`).join(", ") || "pusto" : "—";
    ctx.pusta = !pula || pulaPusta(pula);
    ctx.proby = (stan.proby ?? []).length;
    ctx.autodestrukcja = maAuto ? (auto?.stan ?? "nierozstrzygnięta") : null;
    ctx.blokada = !ctx.trup.martwy ? "Żeton nie jest trupem."
      : !wiersz ? `Brak wiersza tabeli dla rozmiaru ${ROZMIARY[rozmiar] ?? rozmiar}${kobalt ? "" : " (WKK ma wiersze Malutkiej bestii i Ogromnej maszyny)"}.`
        : ctx.pusta ? "Nic więcej do wybebeszenia."
          : maAuto && (!auto || auto.stan === "czeka") ? "Autodestrukcja nierozstrzygnięta — najpierw MG (k100)."
            : auto?.stan === "odlicza" ? "Maszyna odlicza do wybuchu!"
              : !wyk ? "Brak wykonawcy." : null;
    ctx.zglosMG = maAuto && (!auto || auto.stan === "czeka") && ctx.trup.martwy;
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form");
    if (!form) return;
    form.addEventListener("submit", ev => ev.preventDefault());
    form.addEventListener("change", ev => {
      const t = ev.target;
      const st = this.stan;
      if (t.name === "wykonawca") { st.wykonawca = t.value; st.test = null; st.pomocnicy = st.pomocnicy.filter(x => x !== t.value); }
      else if (t.name === "tabela") { st.tabela = t.value; st.test = null; st.zakres = ""; }
      else if (t.name === "test") st.test = t.value;
      else if (t.name === "zakres") { st.zakres = t.value; st.minuty = null; }
      else if (t.name === "cel") st.cel = t.value;
      else if (t.name === "minuty") st.minuty = Math.max(1, Number(t.value) || 1);
      else if (t.name === "ulatwienie") st.ulatwienie = t.checked;
      else if (t.dataset.pomocnik) {
        st.pomocnicy = t.checked ? [...new Set([...st.pomocnicy, t.dataset.pomocnik])] : st.pomocnicy.filter(x => x !== t.dataset.pomocnik);
        st.minuty = null;
      }
      this.render();
    });
  }

  /** [Poproś pomocników]: karta prośby dnd5e (test ST 10) — zdany daje Ułatwienie (s. 269). */
  static async #pomocnicy() {
    const def = TABELE_BEBESZENIA[this.stan.tabela];
    const cele = this.stan.pomocnicy.map(id => game.actors.get(id)).filter(Boolean);
    if (!cele.length) return ui.notifications.warn("Zaznacz pomocników.");
    await ChatMessage.create({
      type: "request",
      content: `<p><strong>Pomoc przy bebeszeniu</strong> (${esc(this.token.name)}) — ${CONFIG.DND5E.skills[def.pomocnik.umiejetnosc]?.label}, ST ${def.pomocnik.st}. Zdany test pomocnika z narzędziami daje Ułatwienie (s. 269).</p>`,
      speaker: ChatMessage.getSpeaker({ alias: "Bebeszenie" }),
      system: { handler: "skill", data: { skill: def.pomocnik.umiejetnosc, target: def.pomocnik.st }, button: { icon: "fa-solid fa-hands-helping", label: "Pomóż" }, targets: cele.map(a => ({ actor: a.uuid })) }
    });
  }

  static async #bebesz(_ev, btn) {
    const ctx = await this._prepareContext({});
    if (ctx.blokada) {
      if (/Autodestrukcja nierozstrzygnięta/.test(ctx.blokada)) await doMG("bebeszenieAutodestrukcja", { trup: _uuidTrupa(this.token) });
      return ui.notifications.warn(ctx.blokada);
    }
    btn.disabled = true;
    try {
      await bebesz(this.token, { ...this.stan, minuty: ctx.minuty, st: ctx.st });
      await this.close();
    } finally {
      btn.disabled = false;
    }
  }
}

/** Otwiera okno bebeszenia dla martwego żetonu. */
export function otworzBebeszenie(token, wykonawca = null) {
  const doc = token?.document ?? token;
  if (!doc?.actor) return ui.notifications.warn("Wskaż martwy żeton.");
  if (!jestTrupem(doc.actor)) return ui.notifications.warn(`${doc.name} nie jest trupem.`);
  const app = foundry.applications.instances.get(`neuro-bebeszenie-${doc.id}`) ?? new BebeszenieOkno(doc, wykonawca ?? game.user.character);
  return app.render({ force: true });
}

/* -------------------------------------------- */
/*  Rzut (klient wykonawcy)                      */
/* -------------------------------------------- */

/**
 * Bebeszenie: wiadomość D10, rzut wykonawcy, wynik do MG przez przekaźnik.
 * @param {TokenDocument} token
 * @param {{wykonawca: string, tabela: string, test: string, pomocnicy: string[], ulatwienie: boolean, zakres: string, cel: string, minuty: number, st: number}} o
 */
export async function bebesz(token, o) {
  const wyk = game.actors.get(o.wykonawca);
  const trup = token.actor;
  if (!wyk || !trup) return null;
  const kategoria = kategoriaIstoty(trup);
  if (tabelaDla({ kategoria }).jawne) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: wyk }),
      content: `<p class="neuro-bebeszenie-jawne"><i class="fa-solid fa-triangle-exclamation" inert></i> <strong>${esc(wyk.name)}</strong> bebeszy ${esc(token.name)} (${esc(NEUROSHIMA_CREATURE_TYPES[kategoria]?.label ?? kategoria)}).</p>`,
      flags: { [MODULE_ID]: { bebeszenieJawne: true } }
    });
  }
  const [typ, klucz] = String(o.test).split(":");
  const def = TABELE_BEBESZENIA[o.tabela];
  const flavor = `Bebeszenie: ${token.name} — ST ${o.st}`;
  const r = typ === "tool"
    ? await wyk.rollToolCheck({ tool: klucz, target: o.st, advantage: !!o.ulatwienie }, {}, { data: { flavor } })
    : await wyk.rollSkill({ skill: klucz, ability: def.test.cecha, target: o.st, advantage: !!o.ulatwienie }, {}, { data: { flavor } });
  const roll = Array.isArray(r) ? r[0] : r;
  if (!roll) return null;
  const nat1 = roll.dice?.[0]?.total === 1 || roll.isFumble === true;
  return doMG("bebeszenieWynik", {
    trup: trup.uuid, token: token.uuid, wykonawca: wyk.uuid, tabela: o.tabela, total: roll.total, st: o.st, nat1,
    zakres: o.zakres || null, cel: o.cel, minuty: o.minuty, pomocnicy: o.pomocnicy.length
  });
}

/* -------------------------------------------- */
/*  Rozliczenie (MG)                             */
/* -------------------------------------------- */

/** Stos na ziemi (U20): Miejsce „Stos — <trup>” z żetonem przy trupie, jeden na trupa. */
async function _stos(token, trup) {
  const istn = game.actors.find(a => a.getFlag(MODULE_ID, "stosTrupa") === token.uuid);
  if (istn) return istn;
  const druzyna = druzynaGlowna();
  const actor = await Actor.implementation.create({
    name: `Stos — ${token.name}`, type: "vehicle", img: "icons/svg/item-bag.svg",
    ownership: foundry.utils.deepClone(druzyna?.ownership ?? { default: 0 }),
    prototypeToken: { actorLink: true, texture: { src: "icons/svg/item-bag.svg" } },
    flags: { [MODULE_ID]: { [MIEJSCE_FLAG]: { druzyna: druzyna?.id ?? null }, stosTrupa: token.uuid } }
  });
  const td = await actor.getTokenDocument({ x: token.x + token.parent.grid.size, y: token.y });
  await token.parent.createEmbeddedDocuments("Token", [td.toObject()]);
  return actor;
}

async function _celZdobyczy(cel, wyk, token, trup) {
  if (cel?.startsWith("aktor:")) return game.actors.get(cel.slice(6)) ?? wyk;
  if (cel === "stos") return _stos(token, trup);
  return wyk;
}

async function _rozlicz(_nosiciel, d) {
  const trup = await fromUuid(d.trup);
  const token = await fromUuid(d.token);
  const wyk = await fromUuid(d.wykonawca);
  if (!trup || !wyk) return;
  const stan = stanTrupa(trup, d.tabela);
  if (!stan.pula) return;
  let pula = { ...stan.pula };
  const linie = [];
  const dlaMG = [];

  // U19: naturalna 1 przy maszynie — autodestrukcja (silnik §7.18) albo utrata elektroniki, chemii i części.
  if (d.tabela === "maszyny" && d.nat1) {
    const auto = stanAutodestrukcji(trup);
    if (daneAutodestrukcji(trup) && auto?.stan !== "wybuch") {
      await trup.setFlag(MODULE_ID, "autodestrukcja", { stan: "czeka", powod: "bebeszenie" });
      await zaproponujAutodestrukcje(trup);
      dlaMG.push("Naturalna 1 przy bebeszeniu — autodestrukcja (karta k100).");
    } else if (!daneAutodestrukcji(trup)) {
      for (const r of ["CE", "CH", "CZ"]) pula[r] = 0;
      dlaMG.push("Naturalna 1, maszyna bez autodestrukcji — elektronika, chemikalia i części przepadają (U19).");
    }
    linie.push("Naturalna 1 — coś w środku trzasnęło.");
  }

  const sukces = Number(d.total) >= Number(d.st);
  const w = wynikBebeszenia({ pula, sukces, zakres: d.zakres });
  const { surowce, mieso } = naJednostki(w.zysk);
  const cel = await _celZdobyczy(d.cel, wyk, token, trup);
  if (Object.keys(surowce).length) await giveManySurowce(cel, surowce);
  if (mieso > 0) {
    const istn = cel.items.find(i => i.flags?.[MODULE_ID]?.prowiantId === "mieso");
    if (istn) await istn.update({ "system.quantity": (Number(istn.system.quantity) || 0) + mieso });
    else await cel.createEmbeddedDocuments("Item", [buildProwiantItemData("mieso", mieso)]);
  }
  const nowyStan = {
    tabela: d.tabela, pula: w.reszta,
    proby: [...(stan.proby ?? []), { kto: wyk.name, wynik: Number(d.total), st: Number(d.st), sukces, zakres: d.zakres }]
  };
  await trup.setFlag(MODULE_ID, FLAGA, nowyStan);

  const zdobycz = [...Object.entries(surowce).map(([r, n]) => `${ETYKIETY[r] ?? r} ${n} gb`), ...(mieso ? [`mięso ${mieso} × 1 kg`] : [])];
  linie.unshift(`${esc(wyk.name)}: ${d.total} vs ST ${d.st} — <strong>${sukces ? "sukces" : "porażka"}</strong>${d.zakres ? ` (tylko ${ETYKIETY[d.zakres]})` : ""}.`);
  linie.push(`Zdobycz${cel !== wyk ? ` → ${esc(cel.name)}` : ""}: ${zdobycz.join(", ") || "nic"}.`);
  if (!sukces) linie.push("Porażka: 10% teraz, połowa przepada, reszta czeka na kolejną próbę (s. 269).");
  const zostalo = Object.entries(w.reszta).filter(([, v]) => v > 1e-9).map(([r, v]) => `${ETYKIETY[r] ?? r} ${Math.round(v * 100) / 100} kg`);
  linie.push(zostalo.length ? `Zostało: ${zostalo.join(", ")}.` : "Trup wybebeszony do końca.");
  await wyslijKarte(kartaPostoju({
    ikona: token?.texture?.src ?? trup.img, tytul: `Bebeszenie: ${token?.name ?? trup.name}`, podtytul: TABELE_BEBESZENIA[d.tabela].label,
    rodzaj: sukces ? "sukces" : "porazka", linie: [...linie, `Czas: ${d.minuty} min${d.pomocnicy ? ` (${1 + d.pomocnicy} osoby)` : ""}.`],
    przyciski: [{ akcja: "bebeszenieCzas", label: `Przesuń czas o ${d.minuty} min`, ikona: "fa-solid fa-clock", gm: true, dane: { minuty: d.minuty } }]
  }), { actor: wyk });
  if (dlaMG.length) await wyslijKarte(kartaPostoju({ ikona: "icons/svg/hazard.svg", tytul: `Bebeszenie: ${token?.name ?? trup.name}`, podtytul: "tylko MG", linie: dlaMG }), { szept: "gm" });
  Hooks.callAll("neuroshima.bebeszenie", trup, { wykonawca: wyk, sukces, zysk: w.zysk, cel });
}

/* -------------------------------------------- */
/*  Wejścia                                      */
/* -------------------------------------------- */

function _onRenderTokenHUD(hud, html) {
  const doc = hud.document ?? hud.object?.document;
  const actor = doc?.actor;
  if (!actor || actor.type === "character" || !jestTrupem(actor)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const kol = root?.querySelector(".col.right");
  if (!kol || kol.querySelector(".neuro-bebeszenie-hud")) return;
  const maszyna = kategoriaIstoty(actor) === "maszyna";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon neuro-bebeszenie-hud";
  btn.dataset.tooltip = maszyna ? "Bebeszenie maszyny (s. 269)" : "Bebeszenie (s. 269)";
  btn.innerHTML = `<i class="fa-solid ${maszyna ? "fa-screwdriver-wrench" : "fa-drumstick-bite"}" inert></i>`;
  btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); otworzBebeszenie(doc); });
  kol.append(btn);
}

function _onItemContext(item, options) {
  if (item?.type !== "tool" || !ZESTAWY.has(item.system?.type?.baseItem) || !item.actor) return;
  options.push({
    name: "Bebeszenie celu",
    icon: '<i class="fa-solid fa-drumstick-bite"></i>',
    condition: () => item.isOwner,
    callback: () => {
      const cel = [...game.user.targets][0];
      if (!cel) return ui.notifications.warn("Wskaż (namierz) martwy żeton do wybebeszenia.");
      otworzBebeszenie(cel.document, item.actor);
    }
  });
}

export function registerBebeszenie() {
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
  Hooks.on("dnd5e.getItemContextOptions", _onItemContext);
  zarejestrujProsbe("bebeszenieWynik", _rozlicz);
  zarejestrujProsbe("bebeszenieAutodestrukcja", async (_n, d) => {
    const trup = await fromUuid(d.trup);
    if (trup) await zaproponujAutodestrukcje(trup);
  });
  zarejestrujAkcje("bebeszenieCzas", async (_ev, btn) => {
    if (!game.user.isGM) return;
    await game.time.advance(Math.max(0, Number(btn.dataset.minuty) || 0) * 60);
    btn.disabled = true;
  });
}

export const bebeszenieApi = Object.freeze({ okno: otworzBebeszenie, bebesz, stan: stanTrupa, kategoria: kategoriaIstoty, trup: jestTrupem });
