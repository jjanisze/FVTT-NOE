/**
 * Neuroshima 5e — Cennik MG, kalkulator handlarza (PLAN_m5_postoj.md §7.4, D4).
 *
 * MG gra handlarza bez przygotowania: dla dowolnego przedmiotu (wyszukiwarka po `KATALOG` albo przeciągnięty
 * przedmiot z dowolnego miejsca) widzi cenę podręcznikową, **cenę tutaj** z rozkładem (region × kolumna,
 * stan), skup (NOE 100% / WKK 50%, suwak), dostępność tutaj z rozkładem, regułę ilości z [Rzuć] i [Za gracza:
 * rzuć zamówienie]. Każda liczba z RAW, każda do nadpisania — cenę ostatecznie proponuje MG.
 * Okno tylko dla MG (U42): ceny regionalne i skup nie trafiają do graczy.
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { LOKALIZACJE, REGIONY, KATEGORIE_CEN, GRUPY_TOWARU, STAN } from "../config/handel-data.mjs";
import {
  cenaTutaj, dostepnoscTutaj, iloscRegula, grupaTowaru, skupDomyslny, fmtGb, kategoriaCenowa
} from "../config/handel-rules.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { doRoll } from "../config/losowanie.mjs";
import { refDlaPrzedmiotu } from "../production/wynik.mjs";
import { miejsceAktora, druzynaGlowna, opisMiejsca, setMiejsce } from "./miejsce.mjs";
import { walutaLokalna } from "./portfel.mjs";
import { rzucZamowienie } from "./zamowienie.mjs";
import { kartaPostoju, wyslijKarte } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MAKS_WYNIKOW = 60;

const _bezOgonkow = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
const _tip = rozklad => rozklad.map(r => `${foundry.utils.escapeHTML(r.opis)}: ${fmtGb(r.wartosc)}`).join("<br>");
const _tipDost = rozklad => rozklad.map(r => `${foundry.utils.escapeHTML(r.opis)}: ${r.wartosc}%`).join("<br>");

export class CennikMG extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "neuro-cennik",
    classes: ["neuro-cennik", "neuro-postoj-okno"],
    window: { title: "Cennik — handlarz MG", icon: "fa-solid fa-scale-balanced", resizable: true },
    position: { width: 900, height: 680 },
    actions: {
      rzucIlosc: CennikMG.#rzucIlosc,
      zamowienie: CennikMG.#zamowienie,
      usunWiersz: CennikMG.#usunWiersz,
      stan: CennikMG.#przelaczStan,
      zapiszMiejsce: CennikMG.#zapiszMiejsce
    }
  };

  static PARTS = {
    form: { template: `${TPL}/cennik-form.hbs` },
    lista: { template: `${TPL}/cennik-lista.hbs`, scrollable: [".neuro-cennik-lista"] }
  };

  /** @type {{query: string, grupa: string, rodzaj: string|null, region: string|null, skup: number, aktor: string|null, wiersze: object[], stany: Record<string, string>}} */
  stan;

  constructor(options = {}) {
    super(options);
    const { miejsce } = miejsceAktora(druzynaGlowna());
    this.stan = {
      query: "", grupa: "", rodzaj: miejsce.rodzaj, region: miejsce.region,
      skup: Math.round(skupDomyslny({ kobalt: isKobaltEnabled() }) * 100),
      aktor: null, wiersze: [], stany: {}
    };
  }

  get miejsce() {
    return { rodzaj: this.stan.rodzaj, region: this.stan.region };
  }

  /* ---------------- kontekst ---------------- */

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const kobalt = isKobaltEnabled();
    if (partId === "form") {
      const druzyna = druzynaGlowna();
      context.rodzaje = Object.entries(LOKALIZACJE).map(([k, v]) => ({ k, label: `${v.label} (${v.modyfikator > 0 ? "+" : ""}${v.modyfikator})`, wybrany: k === this.stan.rodzaj }));
      context.regiony = Object.entries(REGIONY).map(([k, v]) => ({ k, label: v.label, wybrany: k === this.stan.region }));
      context.grupy = Object.entries(GRUPY_TOWARU).map(([k, v]) => ({ k, label: v.label, wybrany: k === this.stan.grupa }));
      context.aktorzy = (druzyna?.system.members ?? []).map(m => m.actor).filter(a => a?.type === "character")
        .map(a => ({ uuid: a.uuid, name: a.name, wybrany: a.uuid === this.stan.aktor, cha: a.system.abilities?.cha?.value }));
      context.stan = this.stan;
      context.kobalt = kobalt;
      context.skupDomyslny = Math.round(skupDomyslny({ kobalt }) * 100);
      context.druzyna = druzyna?.name ?? null;
      context.miejsceDruzyny = druzyna ? opisMiejsca(miejsceAktora(druzyna).miejsce) : "—";
      context.inneNizDruzyny = druzyna && (miejsceAktora(druzyna).miejsce.rodzaj !== this.stan.rodzaj || miejsceAktora(druzyna).miejsce.region !== this.stan.region);
    }
    if (partId === "lista") {
      context.wlasne = this.stan.wiersze.map((w, i) => this.#wiersz(w.wpis, { indeks: i, wlasny: true, waluta: w.waluta, kobalt }));
      context.wyniki = this.#szukaj().map(w => this.#wiersz(w, { kobalt }));
      context.puste = !context.wlasne.length && !context.wyniki.length;
      context.limit = MAKS_WYNIKOW;
    }
    return context;
  }

  #szukaj() {
    const q = _bezOgonkow(this.stan.query).trim();
    if (!q && !this.stan.grupa) return [];
    const out = [];
    for (const w of KATALOG.values()) {
      if (w.zaslepka) continue;
      if (this.stan.grupa && grupaTowaru(w) !== this.stan.grupa) continue;
      if (q && !_bezOgonkow(w.nazwa).includes(q)) continue;
      out.push(w);
      if (out.length >= MAKS_WYNIKOW) break;
    }
    return out;
  }

  #wiersz(wpis, { indeks = null, wlasny = false, waluta = null, kobalt }) {
    const klucz = wpis.ref ?? `wlasny-${indeks}`;
    const stan = this.stan.stany[klucz] ?? "sprawny";
    const region = this.stan.region;
    const tu = cenaTutaj(wpis, { region, stan, kobalt });
    const skup = cenaTutaj(wpis, { region, stan, skup: this.stan.skup / 100, kobalt });
    const poza = waluta?.region && waluta.region !== region;
    const d = dostepnoscTutaj(wpis, { rodzaj: this.stan.rodzaj, kobalt });
    const regula = iloscRegula(wpis);
    const kolumna = kategoriaCenowa(wpis, { kobalt });
    return {
      klucz, indeks, wlasny, ref: wpis.ref ?? "", nazwa: wpis.nazwa, img: wpis.img ?? null,
      podr: fmtGb(wpis.cena), tu: poza ? "wg MG" : fmtGb(tu.cena), tuTip: poza ? `Waluta ${REGIONY[waluta.region]?.label} poza regionem (s. 43)` : _tip(tu.rozklad),
      skup: poza ? "0 gb" : fmtGb(skup.cena), skupTip: _tip(skup.rozklad),
      kolumna: kolumna ? KATEGORIE_CEN[kolumna] : "bez mnożnika",
      dost: d.prog === null ? (d.powod ?? "—") : `${d.prog}%`, dostTip: d.prog === null ? "" : _tipDost(d.rozklad), dostBrak: d.prog === null || d.nigdy,
      ilosc: regula === "1" ? "1" : regula.replace("d", "k"), regula,
      stan, zepsuty: stan === "zepsuty", stanLabel: STAN[stan]?.label ?? stan,
      moznaZamowic: !!wpis.ref && d.prog !== null && !d.nigdy
    };
  }

  /* ---------------- zdarzenia ---------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    const form = el.querySelector(".neuro-cennik-form");
    if (form && !form.dataset.zwiazane) {
      form.dataset.zwiazane = "1";
      form.addEventListener("input", ev => this.#onInput(ev));
      form.addEventListener("change", ev => this.#onInput(ev));
    }
    if (!el.dataset.drop) {
      el.dataset.drop = "1";
      el.addEventListener("dragover", ev => ev.preventDefault());
      el.addEventListener("drop", ev => this.#onDrop(ev));
    }
  }

  #onInput(ev) {
    const t = ev.target;
    const name = t?.name;
    if (!name) return;
    if (name === "query") { this.stan.query = t.value; return this.render({ parts: ["lista"] }); }
    if (name === "grupa") this.stan.grupa = t.value;
    if (name === "rodzaj") this.stan.rodzaj = t.value || null;
    if (name === "region") this.stan.region = t.value || null;
    if (name === "aktor") this.stan.aktor = t.value || null;
    if (name === "skup") {
      this.stan.skup = Number(t.value) || 0;
      const out = this.element.querySelector(".neuro-cennik-skup-wartosc");
      if (out) out.textContent = `${this.stan.skup}%`;
      if (ev.type === "input") return this.render({ parts: ["lista"] });
    }
    if (ev.type === "change") this.render();
  }

  async #onDrop(ev) {
    ev.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
    if (data?.type !== "Item") return;
    const item = await fromUuid(data.uuid);
    if (!item) return;
    await this.dodajPrzedmiot(item);
  }

  /** Dokłada wiersz z przedmiotu (z katalogu, jeśli go rozpozna; inaczej z ceny przedmiotu). */
  async dodajPrzedmiot(item) {
    const ref = await refDlaPrzedmiotu(item);
    const zKatalogu = ref ? KATALOG.get(ref) : null;
    const wpis = zKatalogu
      ? { ...zKatalogu, nazwa: item.name, img: item.img }
      : { ref: null, nazwa: item.name, img: item.img, cena: Number(item.system?.price?.value) || 0, kategoria: null, wynik: "item", jednorazowy: ["consumable", "loot"].includes(item.type) };
    this.stan.wiersze.unshift({ wpis, waluta: walutaLokalna(item) });
    this.render({ parts: ["lista"] });
  }

  static async #rzucIlosc(_ev, btn) {
    const regula = btn.dataset.regula;
    const nazwa = btn.dataset.nazwa;
    const roll = await new Roll(doRoll(regula)).evaluate();
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/dice-target.svg", tytul: `${nazwa}: ${roll.total} szt.`, podtytul: "ilość u handlarza · tylko MG",
      linie: [`${regula.replace("d", "k")} = <strong>${roll.total}</strong> (s. 43)`]
    }), { szept: "gm" });
  }

  static async #zamowienie(_ev, btn) {
    const aktor = this.stan.aktor ? fromUuidSync(this.stan.aktor) : null;
    if (!aktor) return ui.notifications.warn("Wybierz postać, za którą rzucasz zamówienie.");
    const wpis = KATALOG.get(btn.dataset.ref);
    if (!wpis) return;
    await rzucZamowienie(aktor, wpis, { miejsce: this.miejsce });
  }

  static #usunWiersz(_ev, btn) {
    this.stan.wiersze.splice(Number(btn.dataset.indeks), 1);
    this.render({ parts: ["lista"] });
  }

  static #przelaczStan(_ev, btn) {
    const k = btn.dataset.klucz;
    this.stan.stany[k] = this.stan.stany[k] === "zepsuty" ? "sprawny" : "zepsuty";
    this.render({ parts: ["lista"] });
  }

  static async #zapiszMiejsce() {
    const druzyna = druzynaGlowna();
    if (!druzyna) return;
    await setMiejsce(druzyna, { rodzaj: this.stan.rodzaj, region: this.stan.region });
    this.render();
  }
}

/** Otwiera Cennik (MG). */
export function otworzCennik() {
  if (!game.user.isGM) return ui.notifications.warn("Cennik jest narzędziem MG.");
  const istniejacy = foundry.applications.instances.get("neuro-cennik");
  if (istniejacy) return istniejacy.render({ force: true });
  return new CennikMG().render({ force: true });
}

export function registerCennik() {
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls.tokens?.tools;
    if (!tools) return;
    tools.neuroshimaCennik = {
      name: "neuroshimaCennik",
      title: "Cennik — ceny i dostępność tutaj (MG)",
      icon: "fa-solid fa-scale-balanced",
      order: Object.keys(tools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => otworzCennik()
    };
  });
  Hooks.once("ready", () => foundry.applications.handlebars.loadTemplates([`${TPL}/cennik-form.hbs`, `${TPL}/cennik-lista.hbs`, `${TPL}/cennik-wiersz.hbs`]));
}
