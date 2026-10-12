/**
 * Neuroshima 5e — okno „Doba” gracza (PLAN_m5_postoj.md §7.11, D7, D18, D20, D42–D43, U26, U28, U29, U48).
 *
 * Szkic doby na **własnej** postaci: sen (domyślnie 8 h, progi D20), zajęcia z rejestru (te same sekcje co okno
 * DO dnd5e plus zajęcia postoju), utrzymanie i towarzysze, towar na rachunek, rachunek z saldem, [Jak wczoraj],
 * [Zgłoś] / [Wycofaj]. Pasek 24 h i pasek pracy (10 h) — przekroczenie to czerwień i linia dla MG, nie blokada.
 * MG otwiera to samo okno dla dowolnej postaci i widzi pola korekty (zniżka, ST rzutu za sen, uwagi).
 *
 * Formularz rysuje się raz (pisanie nie gubi kursora); nagłówek z ilustracją, paski i rachunek odświeżają się z
 * zapisanego szkicu przy każdej zmianie flagi.
 */

import { LOKALIZACJE } from "../config/handel-data.mjs";
import { UTRZYMANIE, SEN_DOMYSLNY_H, DOBA_H, PRACA_H, skutkiSnu, kosztUtrzymania } from "../config/postoj-rules.mjs";
import { fmtGb } from "../config/handel-rules.mjs";
import { isKobaltSen } from "../config/settings.mjs";
import { NO_REST_FLAG } from "../config/diseases-data.mjs";
import { zrodlaWyczerpania } from "../config/exhaustion.mjs";
import { formatWorldDate, formatWorldTime } from "../world-clock.mjs";
import { zajeciaWidoku, budzetZajecia, blokadaZajec } from "../actors/rest-activities.mjs";
import { getMiejsce, opisMiejsca } from "./miejsce.mjs";
import {
  dobaPostaci, szkic, zapewnijSzkic, zapiszSzkic, zglos, wycofaj, jakWczoraj, rachunekDoby, konto,
  towarzyszeDoUtrzymania, maPrzemarzniecie, obrazDoby
} from "./doba.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Progi snu do podpowiedzi przy polu (D20). */
function _podpowiedzSnu(kobalt) {
  return kobalt
    ? "≥ 6 h — DO · 4–5 h — korzyści KO, RO KON ST 10 · 2–3 h — bez korzyści, RO ST 15 · 0–1 h — RO ST 20 · 12 h / 18 h — odsypianie 1 / 2 poziomów Bezsenności (WKK)"
    : "≥ 6 h — Długi odpoczynek · 4–5 h — korzyści Krótkiego (s. 46) · mniej — bez korzyści · 0–1 h — RO KON ST 20 (s. 45)";
}

export class DobaOkno extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-doba", "neuro-postoj-okno"],
    window: { title: "Doba", icon: "fa-solid fa-sun", resizable: true },
    position: { width: 640, height: 820 },
    actions: {
      jakWczoraj: DobaOkno.#jakWczoraj,
      zglos: DobaOkno.#zglos,
      wycofaj: DobaOkno.#wycofaj,
      usunTowar: DobaOkno.#usunTowar
    }
  };

  static PARTS = {
    naglowek: { template: `${TPL}/doba-naglowek.hbs` },
    form: { template: `${TPL}/doba-form.hbs`, scrollable: [""] },
    podsumowanie: { template: `${TPL}/doba-podsumowanie.hbs` }
  };

  constructor(actor, options = {}) {
    super({ id: `neuro-doba-${actor.id}`, ...options });
    this.actor = actor;
    // Nowa doba (albo zatwierdzona) pod otwartym oknem: formularz rysuje się raz, więc wtedy — cały, od nowa.
    // Z opóźnieniem: zapis szkicu to para zdejmij + zapisz, w środku której szkicu na chwilę nie ma.
    this._nowaDoba = foundry.utils.debounce(() => {
      if (!this.rendered) return;
      const id = dobaPostaci(this.actor) ? (szkic(this.actor)?.dobaId ?? null) : null;
      if (id !== this._dobaFormy) this.render();
    }, 150);
    this._hook = Hooks.on("updateActor", (a, changes) => {
      if (a !== this.actor) return;
      if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;
      this.render({ parts: ["naglowek", "podsumowanie"] });
      this._nowaDoba();
    });
  }

  get title() { return `Doba — ${this.actor.name}`; }

  async close(o) {
    Hooks.off("updateActor", this._hook);
    await this.#zapiszTeraz();
    return super.close(o);
  }

  async _preFirstRender(context, options) {
    await super._preFirstRender(context, options);
    await zapewnijSzkic(this.actor);
  }

  /* ---------------- kontekst ---------------- */

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const p = dobaPostaci(this.actor);
    const s = szkic(this.actor);
    const kobalt = isKobaltSen();
    context.isGM = game.user.isGM;
    context.otwarta = !!(p && s);
    if (partId === "form") this._dobaFormy = null;
    if (!context.otwarta) return context;
    const m = getMiejsce(p.grupa);
    const wMiejscowosci = !!LOKALIZACJE[m.rodzaj]?.utrzymanie;

    if (partId === "naglowek") {
      context.obraz = await obrazDoby(p.grupa, s.utrzymanie);
      context.data = formatWorldDate() ?? "";
      context.czas = formatWorldTime() ?? "";
      context.miejsce = opisMiejsca(m);
      context.zgloszony = s.stan === "zgloszony";
    }

    if (partId === "form") {
      this._dobaFormy = s.dobaId;
      context.sen = s.sen;
      context.podpowiedzSnu = _podpowiedzSnu(kobalt);
      context.bezsennosc = kobalt && zrodlaWyczerpania(this.actor).some(x => x.source === "bezsennosc");
      const koniec = this.actor.getFlag(MODULE_ID, NO_REST_FLAG);
      context.choroba = Number.isFinite(koniec) && game.time.worldTime < koniec ? formatWorldTime(koniec) : null;
      context.wCieple = maPrzemarzniecie(this.actor);
      context.wCieploZaznaczone = s.wCieple;
      context.utrzymanie = wMiejscowosci ? Object.entries(UTRZYMANIE).map(([k, u]) => ({ k, label: `${u.label} — ${u.koszt} gb`, wybrany: s.utrzymanie === k })) : null;
      context.towarzysze = towarzyszeDoUtrzymania(this.actor).map(t => ({
        uuid: t.actor.uuid, id: t.actor.id, nazwa: t.actor.name, czlowiek: t.czlowiek,
        opcje: wMiejscowosci && t.czlowiek ? [
          ...Object.entries(UTRZYMANIE).map(([k, u]) => ({ k, label: `${u.label} — ${u.koszt} gb`, wybrany: s.towarzysze[t.actor.id] === k })),
          { k: "robota", label: "znalazł robotę — sam się utrzyma (s. 47)", wybrany: (s.towarzysze[t.actor.id] ?? "robota") === "robota" }
        ] : null
      }));
      const ctx = { actor: this.actor, miejsce: m, szkic: s, kobalt, widok: "doba" };
      context.sekcje = [];
      for (const def of zajeciaWidoku("doba")) {
        if (typeof def.dostepne === "function") {
          const powod = def.dostepne(this.actor, ctx);
          if (powod !== true && powod !== null && powod !== undefined) continue;
        }
        let html = null;
        try { html = def.render(this.actor, "long", ctx); } catch (err) { console.warn(`${MODULE_ID} | doba: ${def.id}`, err); }
        if (html) context.sekcje.push({ id: def.id, label: def.label, html, budzet: budzetZajecia(def, "long") });
      }
    }

    if (partId === "podsumowanie") {
      const { godziny, praca } = this.#godziny(s);
      const suma = s.sen + godziny;
      context.pasek = {
        sen: Math.round(s.sen * 10) / 10, zajecia: Math.round(godziny * 10) / 10, suma: Math.round(suma * 10) / 10, doba: DOBA_H,
        procentSen: Math.min(100, s.sen / DOBA_H * 100), procentZajecia: Math.min(100, godziny / DOBA_H * 100),
        ponad: suma > DOBA_H,
        praca: Math.round(praca * 10) / 10, limitPracy: PRACA_H, procentPracy: Math.min(100, praca / PRACA_H * 100), ponadPraca: praca > PRACA_H
      };
      const sen = skutkiSnu(s.sen, { kobalt });
      context.skutkiSnu = sen.korzysci === "DO" ? (sen.odsypianie ? `Długi odpoczynek, odsypianie: −${sen.odsypianie} Bezsenność` : "Długi odpoczynek")
        : sen.korzysci === "KO" ? "tylko korzyści Krótkiego odpoczynku" : "bez korzyści odpoczynku";
      context.roSnu = s.mg.stSnu ?? sen.ro;
      const r = await rachunekDoby(this.actor, s, { grupa: p.grupa });
      context.rachunek = r.linie.map(l => ({ ...l, kwotaTxt: `${l.rodzaj === "koszt" ? "−" : "+"}${fmtGb(l.kwota)}` }));
      context.saldo = fmtGb(r.saldo);
      context.ujemne = r.ujemne;
      context.doloz = s.doloz.map(d => {
        const it = fromUuidSync(d.uuid);
        return { uuid: d.uuid, nazwa: it?.name ?? "(nie ma)", img: it?.img, ilosc: d.ilosc };
      });
      context.zgloszony = s.stan === "zgloszony";
      context.domyslnyPoziom = s.utrzymanie ? `${UTRZYMANIE[s.utrzymanie].label} (${kosztUtrzymania(s.utrzymanie)} gb)` : null;
      context.mg = s.mg;
      context.wczoraj = !!konto(this.actor).ostatni;
    }
    return context;
  }

  /** Godziny zajęć: z formularza (sekcje z `minuty`) albo z zapisanych wartości (`godziny`). */
  #godziny(s) {
    const form = this.element?.querySelector("form.neuro-doba-form");
    const zFormy = form ? this.#wartosciFormy(form) : null;
    let godziny = 0, praca = 0;
    for (const def of zajeciaWidoku("doba")) {
      let h = 0;
      const v = zFormy?.[def.id] ?? s.zajecia?.[def.id];
      if (form && typeof def.minuty === "function") {
        try { h = (Number(def.minuty(form, "long")) || 0) / 60; } catch { h = 0; }
      } else if (typeof def.godziny === "function" && v != null) {
        h = Number(def.godziny(v)) || 0;
      }
      godziny += h;
      if (budzetZajecia(def, "long") === "praca") praca += h;
    }
    return { godziny, praca };
  }

  /** `neuroZajecia` z formularza, jak je zapisze szkic. */
  #wartosciFormy(form) {
    try {
      return foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object).neuroZajecia ?? {};
    } catch { return {}; }
  }

  /* ---------------- zdarzenia ---------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form.neuro-doba-form");
    if (form && !form.dataset.zwiazany) {
      form.dataset.zwiazany = "1";
      this.#wypelnij(form);
      form.addEventListener("submit", ev => ev.preventDefault());
      form.addEventListener("click", ev => {
        const btn = ev.target.closest("[data-zajecie-rzut]");
        if (btn) this.#rzut(form, btn);
      });
      const zmiana = () => {
        clearTimeout(this._t);
        this._t = setTimeout(() => this.#zapiszTeraz(), 350);
        this.render({ parts: ["podsumowanie"] });
      };
      form.addEventListener("input", zmiana);
      form.addEventListener("change", zmiana);
    }
    if (!this.element.dataset.drop) {
      this.element.dataset.drop = "1";
      this.element.addEventListener("dragover", ev => ev.preventDefault());
      this.element.addEventListener("drop", ev => this.#onDrop(ev));
    }
    for (const input of this.element.querySelectorAll("input[data-doloz]")) {
      input.addEventListener("change", ev => this.#iloscTowaru(ev.target.dataset.doloz, ev.target.value));
    }
    for (const input of this.element.querySelectorAll("[data-mg]")) {
      input.addEventListener("change", ev => {
        const k = ev.target.dataset.mg;
        const v = k === "uwagi" ? ev.target.value : (ev.target.value === "" ? null : Number(ev.target.value));
        zapiszSzkic(this.actor, { mg: { ...szkic(this.actor).mg, [k]: v } }, { zostawStan: true });
      });
    }
  }

  /** Wartości zapisanego szkicu do pól rejestru (`neuroZajecia.<id>.*`) — sekcje rysują się z domyślnymi. */
  #wypelnij(form) {
    const s = szkic(this.actor);
    if (!s) return;
    const plaskie = foundry.utils.flattenObject({ neuroZajecia: s.zajecia ?? {} });
    for (const [name, v] of Object.entries(plaskie)) {
      for (const el of form.querySelectorAll(`[name="${CSS.escape(name)}"]`)) {
        if (el.type === "checkbox") el.checked = !!v;
        else if (el.type === "radio") el.checked = String(el.value) === String(v);
        else el.value = v;
      }
    }
    // Blokada (Pomoc medyczna WKK) gasi pozostałe sekcje także tutaj.
    const b = blokadaZajec(this.actor, "long", { form });
    for (const fs of form.querySelectorAll(".neuro-zajecie")) {
      const zablokowana = Boolean(b) && fs.dataset.zajecie !== b.def.id;
      fs.disabled = zablokowana;
    }
  }

  /** Rzut zajęcia (plotki, hazard, koncert): okno dnd5e, wynik do ukrytego pola `wynik` i do szkicu. */
  async #rzut(form, btn) {
    const id = btn.dataset.zajecieRzut;
    const def = zajeciaWidoku("doba").find(d => d.id === id);
    if (typeof def?.rzut !== "function") return;
    btn.disabled = true;
    try {
      const wynik = await def.rzut(this.actor, this.#wartosciFormy(form)[id] ?? {});
      if (wynik === null || wynik === undefined) return;
      const pole = form.querySelector(`[name="${CSS.escape(`neuroZajecia.${id}.wynik`)}"]`);
      if (pole) pole.value = wynik;
      const opis = btn.parentElement?.querySelector(".neuro-zajecie-wynik");
      if (opis) opis.innerHTML = `wynik: <strong>${wynik}</strong>`;
      await this.#zapiszTeraz();
      this.render({ parts: ["podsumowanie"] });
    } finally {
      btn.disabled = false;
    }
  }

  async #zapiszTeraz() {
    clearTimeout(this._t);
    const form = this.element?.querySelector("form.neuro-doba-form");
    if (!form || !szkic(this.actor)) return;
    const f = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
    await zapiszSzkic(this.actor, {
      sen: Math.max(0, Math.min(24, Number(f.sen ?? SEN_DOMYSLNY_H))),
      zajecia: f.neuroZajecia ?? {},
      utrzymanie: f.utrzymanie || null,
      towarzysze: f.towarzysze ?? {},
      wCieple: !!f.wCieple
    });
  }

  async #onDrop(ev) {
    ev.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
    if (data?.type !== "Item") return;
    const item = await fromUuid(data.uuid);
    if (!item || item.parent !== this.actor) return ui.notifications.warn("Na rachunek dokładasz własny towar.");
    const s = szkic(this.actor);
    if (s.doloz.some(d => d.uuid === item.uuid)) return;
    await this.#zapiszTeraz();
    await zapiszSzkic(this.actor, { doloz: [...s.doloz, { uuid: item.uuid, ilosc: 1 }] });
  }

  async #iloscTowaru(uuid, ilosc) {
    const s = szkic(this.actor);
    const it = fromUuidSync(uuid);
    const max = Number(it?.system?.quantity ?? 1) || 1;
    await zapiszSzkic(this.actor, { doloz: s.doloz.map(d => d.uuid === uuid ? { ...d, ilosc: Math.max(1, Math.min(max, Math.floor(Number(ilosc) || 1))) } : d) });
  }

  static async #usunTowar(_ev, btn) {
    const s = szkic(this.actor);
    await zapiszSzkic(this.actor, { doloz: s.doloz.filter(d => d.uuid !== btn.dataset.uuid) });
  }

  static async #jakWczoraj() {
    await jakWczoraj(this.actor);
    await this.render({ force: true });
  }

  static async #zglos() {
    await this.#zapiszTeraz();
    await zglos(this.actor);
    ui.notifications.info("Doba zgłoszona — MG zatwierdza całą drużynę.");
  }

  static async #wycofaj() {
    await wycofaj(this.actor);
  }
}

/** Otwiera okno Doba dla postaci (gracz — swojej; MG — dowolnej). */
export function otworzDobeOkno(actor) {
  if (!actor) return null;
  if (!actor.isOwner) return ui.notifications.warn("To nie twoja postać.");
  if (!dobaPostaci(actor)) return ui.notifications.warn(`${actor.name}: drużyna nie ma otwartej doby postoju.`);
  return zapewnijSzkic(actor).then(() => {
    const app = foundry.applications.instances.get(`neuro-doba-${actor.id}`) ?? new DobaOkno(actor);
    return app.render({ force: true });
  });
}

/** Przycisk „Doba” w nagłówku karty postaci, gdy drużyna ma otwartą dobę. */
function _onRenderCharacterSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character" || !actor.isOwner) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const bar = root?.querySelector(".sheet-header .sheet-header-buttons");
  if (!bar || bar.querySelector(".neuro-doba-btn")) return;
  if (!dobaPostaci(actor)) return;
  const s = szkic(actor);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `neuro-doba-btn gold-button${s?.stan === "zgloszony" ? " is-zgloszony" : ""}`;
  btn.dataset.tooltip = s?.stan === "zgloszony" ? "Doba zgłoszona — czeka na MG" : "Doba postoju — ułóż sen, zajęcia i rachunek";
  btn.setAttribute("aria-label", "Doba");
  btn.innerHTML = `<i class="fa-solid fa-sun" inert></i>`;
  btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); otworzDobeOkno(actor); });
  bar.append(btn);
}

export function registerDobaOkno() {
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  Hooks.once("ready", () => foundry.applications.handlebars.loadTemplates([
    `${TPL}/doba-naglowek.hbs`, `${TPL}/doba-form.hbs`, `${TPL}/doba-podsumowanie.hbs`
  ]));
}
