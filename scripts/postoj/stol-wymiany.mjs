/**
 * Neuroshima 5e — okno „Stół wymiany” (PLAN_m5_postoj.md §7.6, D21, U40, U42, U46).
 *
 * Jedno okno, dwie strony, ten sam stan (`flags.<mod>.wymiana` postaci): gracz wykłada towar („Daję” —
 * przeciągnięty z własnej karty) i wybiera z towaru handlarza („Dostaję” — propozycja); MG dokłada pozycje
 * z katalogu, usługi i przeróbki fachowca, ustawia skup i korektę, prosi o Wpływanie i zatwierdza.
 * Gracz widzi nazwy i ilości towaru handlarza bez cen (D21) i sumę podręcznikową tego, co sam wykłada (D3);
 * ceny tutaj, skup, saldo — tylko w części okna renderowanej u MG (U42). Obie strony odświeżają okno z flagi.
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { jestBlizniakiem } from "../config/improwizacja-rules.mjs";
import { ADDON_DEFS, rodzajUlepszenia } from "../config/addons-data.mjs";
import { FACHOWCY, WPLYWANIE, REGIONY } from "../config/handel-data.mjs";
import { cenaTutaj, fmtGb, fachowiecRobi, towarHandlu } from "../config/handel-rules.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { daneHandlarza, portretHandlarza, opisHandlarza } from "./handlarz.mjs";
import {
  wymiana, otworzWymiane, dodajDaje, dodajDostaje, ustawIlosc, usunPozycje, przelaczStan, ustawZgode, ustawWarunki,
  wycenWymiane, zatwierdzWymiane, odrzucWymiane, dodajPrzerobke, wpisPrzedmiotu, kontekstWymiany, cenaPrzerobki
} from "./wymiana.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _bezOgonkow = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
const CONFIG_SKILL_LABEL = k => CONFIG.DND5E.skills?.[k]?.label ?? k;
const _tip = rozklad => (rozklad ?? []).map(r => `${esc(r.opis)}: ${fmtGb(r.wartosc)}`).join("<br>");

export class StolWymiany extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-wymiana", "neuro-postoj-okno"],
    window: { title: "Stół wymiany", icon: "fa-solid fa-right-left", resizable: true },
    position: { width: 1020, height: 720 },
    actions: {
      dodajTowar: StolWymiany.#dodajTowar,
      usun: StolWymiany.#usun,
      stan: StolWymiany.#stan,
      zgoda: StolWymiany.#zgoda,
      zatwierdz: StolWymiany.#zatwierdz,
      odrzuc: StolWymiany.#odrzuc,
      wplywanie: StolWymiany.#wplywanie,
      przerobka: StolWymiany.#przerobka,
      usluga: StolWymiany.#usluga,
      katalog: StolWymiany.#katalog,
      otworzNowa: StolWymiany.#otworzNowa
    }
  };

  static PARTS = {
    main: { template: `${TPL}/stol-wymiany.hbs`, scrollable: [".neuro-wymiana-kolumna .lista", ".neuro-wymiana-towar .lista"] }
  };

  constructor(actor, options = {}) {
    super({ id: `neuro-wymiana-${actor.id}`, ...options });
    this.actor = actor;
    this.szukajKatalog = "";
    const odswiez = doc => {
      const a = doc?.documentName === "Item" ? doc.parent : doc;
      if (!a) return;
      const h = wymiana(this.actor)?.handlarz;
      if (a === this.actor || a.uuid === h) this.render();
    };
    this._hooki = [
      ["updateActor", Hooks.on("updateActor", odswiez)],
      ["createItem", Hooks.on("createItem", odswiez)],
      ["updateItem", Hooks.on("updateItem", odswiez)],
      ["deleteItem", Hooks.on("deleteItem", odswiez)]
    ];
  }

  get title() { return `Stół wymiany — ${this.actor.name}`; }

  async close(o) {
    for (const [h, id] of this._hooki) Hooks.off(h, id);
    return super.close(o);
  }

  get handlarz() {
    const u = wymiana(this.actor)?.handlarz;
    return u ? fromUuidSync(u) : null;
  }

  /* ---------------- kontekst ---------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isGM = game.user.isGM;
    const w = wymiana(this.actor);
    const h = this.handlarz;
    const kobalt = isKobaltEnabled();
    context.isGM = isGM;
    context.actor = { name: this.actor.name, img: this.actor.img };
    context.otwarta = !!w;
    if (!w) return context;
    context.handlarz = h ? { name: h.name, portret: await portretHandlarza(h), ...opisHandlarza(h) } : null;
    context.zamowienie = w.zamowienie;
    context.zgoda = w.zgoda;
    const { region } = kontekstWymiany(this.actor, h);
    context.region = region ? REGIONY[region]?.label : null;

    // „Daję” — gracz widzi sumę podręcznikową (D3), MG wycenę po skupie.
    const wyc = isGM ? await wycenWymiane(this.actor) : null;
    context.daje = [];
    let podr = 0;
    for (const d of w.daje) {
      const item = fromUuidSync(d.uuid);
      const wpis = item ? await wpisPrzedmiotu(item) : null;
      const linia = wyc?.daje.find(x => x.uuid === d.uuid);
      podr += (wpis?.cena ?? 0) * d.ilosc;
      context.daje.push({
        klucz: d.uuid, nazwa: item?.name ?? "(nie ma)", img: item?.img, ilosc: d.ilosc, max: item?.system?.quantity ?? 1,
        wiele: (item?.system?.quantity ?? 1) > 1, podr: fmtGb((wpis?.cena ?? 0) * d.ilosc),
        zepsuty: d.stan === "zepsuty", lokalna: linia ? fmtGb(linia.lokalna) : null, tip: linia ? _tip(linia.rozklad) : "", poza: linia?.poza
      });
    }
    context.podrDaje = fmtGb(podr);

    // „Dostaję” — nazwy i ilości dla gracza; ceny tutaj tylko MG.
    context.dostaje = w.dostaje.map(p => {
      const linia = wyc?.dostaje.find(x => x.klucz === p.klucz);
      const item = p.uuid ? fromUuidSync(p.uuid) : null;
      return {
        klucz: p.klucz, nazwa: p.nazwa, img: item?.img ?? null, ilosc: p.ilosc ?? 1, typ: p.typ,
        wiele: p.typ === "towar" ? (item?.system?.quantity ?? 1) > 1 : p.typ === "katalog",
        max: p.typ === "towar" ? item?.system?.quantity ?? 1 : 999,
        etykietaTypu: { towar: "", katalog: "zamówione", przedmiot: "od MG", przerobka: "przeróbka", usluga: "usługa" }[p.typ] ?? "",
        lokalna: linia ? fmtGb(linia.lokalna) : null, tip: linia ? _tip(linia.rozklad) : ""
      };
    });

    // Towar handlarza — nazwy i ilości (D21); MG: cena standardowa i tutaj.
    context.towar = [];
    if (h) {
      for (const it of h.items) {
        const wzieto = w.dostaje.filter(p => p.uuid === it.uuid).reduce((a, p) => a + (p.ilosc ?? 1), 0);
        const ilosc = Number(it.system?.quantity ?? 1) || 1;
        const row = { uuid: it.uuid, nazwa: it.name, img: it.img, ilosc: ilosc - wzieto, wyczerpane: ilosc - wzieto <= 0 };
        if (isGM) {
          const wpis = await wpisPrzedmiotu(it);
          const tu = cenaTutaj(wpis, { region, kobalt });
          row.std = fmtGb(wpis.cena);
          row.tu = fmtGb(tu.cena);
          row.tip = _tip(tu.rozklad);
        }
        context.towar.push(row);
      }
      context.towar.sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
    }

    if (isGM) {
      context.wycena = {
        skup: wyc.skupPct, sumaDaje: fmtGb(wyc.sumaDaje), sumaDostaje: fmtGb(wyc.sumaDostaje),
        korekta: w.korekta, notatka: w.notatka, saldo: fmtGb(wyc.saldo), saldoUjemne: wyc.saldo < 0
      };
      context.wplywanie = WPLYWANIE.umiejetnosci.map(k => ({ k, label: CONFIG_SKILL_LABEL(k) }));
      // Przeróbki fachowca (D31, D33) i broń-cel gracza.
      const fach = h ? daneHandlarza(h).fachowiec : null;
      context.fachowiec = fach ? FACHOWCY[fach]?.label : null;
      context.przerobki = Object.values(ADDON_DEFS)
        .filter(d => rodzajUlepszenia(d, { kobalt }) === "przerobka" && (!fach || fachowiecRobi(fach, d)))
        .map(d => ({ id: d.id, label: `${d.label} (${fmtGb(cenaPrzerobki(d.id, region))})` }));
      context.bronie = this.actor.items.filter(i => i.type === "weapon" && !jestBlizniakiem(i)).map(i => ({ uuid: i.uuid, name: i.name }));
      const q = _bezOgonkow(this.szukajKatalog).trim();
      context.szukajKatalog = this.szukajKatalog;
      context.katalog = q.length < 2 ? [] : [...KATALOG.values()]
        .filter(k => towarHandlu(k, { kobalt }) && _bezOgonkow(k.nazwa).includes(q)).slice(0, 12)
        .map(k => ({ ref: k.ref, nazwa: k.nazwa, tu: fmtGb(cenaTutaj(k, { region, kobalt }).cena) }));
    }
    return context;
  }

  /* ---------------- zdarzenia ---------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    for (const input of el.querySelectorAll("input[data-ilosc]")) {
      input.addEventListener("change", ev => ustawIlosc(this.actor, ev.target.dataset.strona, ev.target.dataset.klucz, ev.target.value));
    }
    for (const input of el.querySelectorAll("[data-warunek]")) {
      input.addEventListener("change", ev => {
        const k = ev.target.dataset.warunek;
        ustawWarunki(this.actor, { [k]: k === "notatka" ? ev.target.value : Number(ev.target.value) });
      });
    }
    const kat = el.querySelector("input[name=szukajKatalog]");
    kat?.addEventListener("input", ev => {
      this.szukajKatalog = ev.target.value;
      clearTimeout(this._t);
      this._t = setTimeout(() => this.render().then(() => {
        const i = this.element.querySelector("input[name=szukajKatalog]");
        i?.focus(); i?.setSelectionRange(i.value.length, i.value.length);
      }), 250);
    });
    if (!el.dataset.drop) {
      el.dataset.drop = "1";
      el.addEventListener("dragover", ev => ev.preventDefault());
      el.addEventListener("drop", ev => this.#onDrop(ev));
    }
  }

  async #onDrop(ev) {
    ev.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
    if (data?.type !== "Item" || !wymiana(this.actor)) return;
    const item = await fromUuid(data.uuid);
    if (!item) return;
    if (item.parent === this.actor) return dodajDaje(this.actor, item);
    if (item.parent && item.parent === this.handlarz) {
      return dodajDostaje(this.actor, { typ: "towar", uuid: item.uuid, nazwa: item.name, ilosc: 1, max: item.system?.quantity ?? 1 });
    }
    if (game.user.isGM) return dodajDostaje(this.actor, { typ: "przedmiot", uuid: item.uuid, nazwa: item.name, ilosc: 1 });
    ui.notifications.warn("Wykładać możesz tylko własne przedmioty.");
  }

  static async #dodajTowar(_ev, btn) {
    const it = fromUuidSync(btn.dataset.uuid);
    if (!it) return;
    await dodajDostaje(this.actor, { typ: "towar", uuid: it.uuid, nazwa: it.name, ilosc: 1, max: it.system?.quantity ?? 1 });
  }

  static async #usun(_ev, btn) {
    await usunPozycje(this.actor, btn.dataset.strona, btn.dataset.klucz);
  }

  static async #stan(_ev, btn) {
    if (game.user.isGM) await przelaczStan(this.actor, btn.dataset.klucz);
  }

  static async #zgoda() {
    const w = wymiana(this.actor);
    if (!w) return;
    await ustawZgode(this.actor, !w.zgoda);
    if (!w.zgoda && !game.user.isGM) ui.notifications.info("Zgoda wysłana — MG zatwierdza wymianę.");
  }

  static async #zatwierdz() {
    if (!game.user.isGM) return;
    const w = wymiana(this.actor);
    if (!w) return;
    if (!w.zgoda) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Zatwierdzić bez zgody gracza?" },
        content: `<p>${esc(this.actor.name)} jeszcze się nie zgodził(a). Zatwierdzić mimo to?</p>`
      });
      if (!ok) return;
    }
    await zatwierdzWymiane(this.actor);
  }

  static async #odrzuc() {
    if (game.user.isGM) await odrzucWymiane(this.actor);
  }

  /** Wpływanie (s. 44): prośba o rzut gracza ST 15 — wynik dopięty, MG decyduje o „dorzuceniu naboi”. */
  static async #wplywanie(_ev, btn) {
    if (!game.user.isGM) return;
    const skill = btn.dataset.skill;
    await ChatMessage.create({
      type: "request",
      content: `<p><strong>Wpływanie</strong> — ${esc(CONFIG_SKILL_LABEL(skill))}, ST ${WPLYWANIE.st}. Sukces może przekonać partnera do dorzucenia kilku naboi (s. 44).</p>`,
      speaker: ChatMessage.getSpeaker({ alias: this.handlarz?.name ?? "Handel" }),
      system: { handler: "skill", data: { skill, target: WPLYWANIE.st }, button: { icon: "fa-solid fa-comments", label: CONFIG_SKILL_LABEL(skill) }, targets: [{ actor: this.actor.uuid }] }
    });
  }

  static async #przerobka() {
    if (!game.user.isGM) return;
    const el = this.element;
    const addon = el.querySelector("select[name=przerobka]")?.value;
    const cel = el.querySelector("select[name=bron]")?.value || null;
    if (!addon) return;
    await dodajPrzerobke(this.actor, addon, cel);
  }

  static async #usluga() {
    if (!game.user.isGM) return;
    const el = this.element;
    const opis = String(el.querySelector("input[name=uslugaOpis]")?.value ?? "").trim();
    const cena = Number(el.querySelector("input[name=uslugaCena]")?.value) || 0;
    if (!opis) return ui.notifications.warn("Opisz usługę.");
    await dodajDostaje(this.actor, { typ: "usluga", opis, nazwa: `Usługa: ${opis}`, cena, ilosc: 1 });
  }

  static async #katalog(_ev, btn) {
    if (!game.user.isGM) return;
    const k = KATALOG.get(btn.dataset.ref);
    if (k) await dodajDostaje(this.actor, { typ: "katalog", ref: k.ref, nazwa: k.nazwa, ilosc: 1 });
  }

  static async #otworzNowa() {
    await otworzWymiane(this.actor, null, { zamowienie: true });
  }
}

/** Otwiera stół wymiany postaci (gracz — swojej, MG — dowolnej). */
export function otworzStolWymiany(actor) {
  if (!actor) return null;
  if (!actor.isOwner && !game.user.isGM) return ui.notifications.warn("To nie twoja postać.");
  const app = foundry.applications.instances.get(`neuro-wymiana-${actor.id}`) ?? new StolWymiany(actor);
  return app.render({ force: true });
}

export function registerStolWymiany() {
  Hooks.once("ready", () => foundry.applications.handlebars.loadTemplates([`${TPL}/stol-wymiany.hbs`]));
}
