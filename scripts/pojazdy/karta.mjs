/**
 * Neuroshima 5e — karta pojazdu (PLAN_m4_pojazdy E2).
 *
 * Podklasa stockowej `VehicleActorSheet` dnd5e 6 (rozszerzamy, nie zastępujemy — ARCHITECTURE §8): zostają
 * pasek boczny, cechy (stockowa część „stations” grupuje je w akcje bonusowe i reakcje), ładownia, efekty, opis
 * i obie dotychczasowe wstawki modułu (pasek paliwa, przełącznik portret/żeton) — `renderVehicleActorSheet`
 * dalej odpala, bo ta klasa jest w łańcuchu dziedziczenia. Dla prawdziwego pojazdu (§4.13) dochodzą zakładki
 * **Pojazd** (stan, silnik, kluczyki, własność), **Załoga** (miejsca, obsada), **Uzbrojenie** (stanowiska) i
 * **Awarie** (aktywne awarie, zegary, naprawy, karoseria, wrak); stockowa „Załoga i pasażerowie” (stanowiska
 * statków 2014) znika. Pojemniki typu `vehicle` (Stos, Miejsce) widzą kartę stockową.
 *
 * Martwe pola dnd5e (progi akcji, stępka/szerokość, jakość, tempa podróży statków) chowa CSS
 * (`styles/pojazdy.css`, `.neuro-karta-pojazdu`).
 */

import { PODWOZIA, ROZMIAR_MASZYNY } from "../config/vehicles-data.mjs";
import { getPaliwo } from "../actors/party-travel.mjs";
import { MODULE_ID, danePojazdu, jestPojazdem, miejscaPojazdu } from "./stan.mjs";
import { mozePrzeswietlic } from "./zeton.mjs";
import { dostepZObecnosci, opisMiejsca, wypadnij, wysadzWszystkich, zajeteMiejsca, jedzie } from "./jadacy.mjs";
import { otworzMiejsca, zetonUzytkownika } from "./okno-miejsc.mjs";
import {
  idKluczykow, kluczykiPodReka, maSilnik, naKrotko, przelaczSwiatla, stanSilnika, uruchom, ustawNaKrotko, utworzKluczyki,
  warunkiUruchomienia, zgas
} from "./silnik.mjs";
import { AWARIE_POJAZDOW, FLAGA_AWARIA, efektyAwarii, maAwarie, rzucAwarie, zastosujAwarie, zegaryPojazdu } from "./awarie.mjs";
import { cofnijWrak, jestWrakiem, wybuchBaku } from "./wrak.mjs";
import { kosztKaroserii, kosztNaprawyAwarii, naprawFachowo, naprawKaroserie, naprawTymczasowo, odbuduj, stopienZST } from "./naprawy.mjs";
import { bronStanowisk, zamontujOdReki, zamontujRobota, zdejmij } from "./bron.mjs";
import { kierowcaPojazdu } from "./jadacy.mjs";
import { szybkoscPojazdu, testKierowcy } from "./jazda.mjs";
import { ZDOLNOSCI, maZdolnosc, trikKaskadera } from "./wojownik.mjs";
import { NAPRAWA } from "../config/production-rules.mjs";

const SZABLON = `modules/${MODULE_ID}/templates/pojazdy/zakladka.hbs`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ZEGARY = { wyciek: "Wyciek paliwa", chlodnica: "Chłodnica → awaria silnika", rozped: "Rozpęd po zgaśnięciu", zawieszenie: "Naprawa tymczasowa", wybuch: "Wybuch baku" };

/** Żeton pojazdu dla aktora karty: żeton niepowiązany albo pierwszy żeton aktora na oglądanej scenie. */
export function zetonPojazdu(actor) {
  if (actor?.isToken) return actor.token;
  return canvas.scene?.tokens.find(t => t.actorLink && t.actorId === actor?.id)
    ?? game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorLink && t.actorId === actor?.id))[0] ?? null;
}

/** Aktor, który u tego użytkownika wykonuje akcje (naprawia, montuje): zaznaczony żeton albo postać. */
function wykonawca() {
  const t = canvas.tokens?.controlled.find(t => !jestPojazdem(t.actor));
  return t?.actor ?? game.user.character ?? null;
}

const btn = (akcja, label, { ikona = "", dane = {}, gm = false, wylaczony = false, tip = "" } = {}) => {
  if (gm && !game.user.isGM) return "";
  const d = Object.entries(dane).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
  return `<button type="button" class="neuro-pojazd-btn${gm ? " is-gm" : ""}" data-action="neuroPojazd" data-co="${esc(akcja)}"${d}`
    + `${wylaczony ? " disabled" : ""}${tip ? ` data-tooltip="${esc(tip)}"` : ""}>${ikona ? `<i class="${ikona}" inert></i> ` : ""}${esc(label)}</button>`;
};
const wiersz = (etykieta, wartosc) => `<div class="neuro-pojazd-wiersz"><span>${esc(etykieta)}</span><strong>${wartosc}</strong></div>`;

/* -------------------------------------------- */
/*  Zakładki                                     */
/* -------------------------------------------- */

function htmlPojazd(actor) {
  const dane = danePojazdu(actor);
  const p = dane.podstawa, k = dane.katalog;
  const tok = zetonPojazdu(actor);
  const hp = actor.system.attributes.hp;
  const ac = actor.system.attributes.ac;
  const bez = actor.flags?.[MODULE_ID]?.ttBezruchu;
  const czesci = [`<h3 class="neuro-pojazd-naglowek">${esc(p.nazwa)} — ${esc(ROZMIAR_MASZYNY[actor.system.traits.size] ?? "")} maszyna, obrys ${dane.obrys.w} × ${dane.obrys.h} kratki${k.zrodloStatystyk === "RAI" ? " · statystyki z interpolacji (RAI)" : ""}${jestWrakiem(actor) ? ` · <span class="neuro-pojazd-alarm">WRAK</span>` : ""}</h3>`];
  czesci.push(`<div class="neuro-pojazd-siatka">
    ${wiersz("Szybkość", `${tok ? szybkoscPojazdu(tok) : actor.system.attributes.movement?.speeds?.walk ?? 0} m${p.szybkosc === null ? ` (${esc(p.szybkoscOpis)})` : ""}`)}
    ${wiersz("Cofanie", p.cofanie !== null ? `${actor.flags?.[MODULE_ID]?.cofanie ?? p.cofanie} m` : "—")}
    ${wiersz("TT", `${ac.value}${bez ? ` (w bezruchu ${bez})` : ""}`)}
    ${wiersz("PW", `${hp.value} / ${hp.max}`)}
    ${wiersz("Próg obrażeń", hp.dt ?? "—")}
    ${wiersz("Próg awarii", hp.mt ?? "— (bez awarii)")}
    ${wiersz("Ładowność", `${actor.system.attributes.capacity?.cargo?.value ?? p.ladownosc} kg`)}
    ${wiersz("Jedzie", tok && jedzie(tok) ? "tak (ruszył się w tej albo poprzedniej rundzie)" : "nie")}
  </div>`);

  if (maSilnik(actor) && tok) {
    const s = stanSilnika(actor);
    const w = warunkiUruchomienia(tok);
    const klucz = kluczykiPodReka(actor, kierowcaPojazdu(tok)?.actor);
    const bak = actor.flags?.[MODULE_ID]?.paliwo ? getPaliwo(actor) : null;
    czesci.push(`<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-gears" inert></i> Silnik (${esc(k.silnik)})</h4>
      ${wiersz("Stan", s.wl ? `<span class="neuro-pojazd-ok">pracuje</span>` : "zgaszony")}
      ${wiersz("Światła", s.swiatla ? "włączone" : "zgaszone")}
      ${wiersz("Zapłon", s.naKrotko ? "odpalony na krótko (bez kluczyków)" : klucz ? `na kluczyk — ${esc(klucz.parent?.name ?? "")}` : "na kluczyk — brak kluczyków pod ręką")}
      ${bak ? wiersz("Bak", `${bak.value} / ${bak.max} l · ${bak.spalanie} l/100 km`) : ""}
      ${[...w.blokady.map(t => `<p class="neuro-pojazd-alarm"><i class="fa-solid fa-ban" inert></i> ${esc(t)}</p>`),
        ...w.oznaczenia.map(t => `<p class="neuro-pojazd-uwaga"><i class="fa-solid fa-triangle-exclamation" inert></i> ${esc(t)}</p>`)].join("")}
      <div class="neuro-pojazd-przyciski">
        ${s.wl ? btn("zgas", "Zgaś", { ikona: "fa-solid fa-power-off", tip: "Bez kosztu (D7)" }) : btn("uruchom", "Uruchom", { ikona: "fa-solid fa-key", tip: "Akcja kierowcy (s. 260)" })}
        ${btn("swiatla", s.swiatla ? "Zgaś światła" : "Światła", { ikona: "fa-solid fa-lightbulb" })}
        ${s.naKrotko ? "" : btn("naKrotko", "Odpal na krótko", { ikona: "fa-solid fa-bolt", tip: "Kierowca, narzędzia mechanika albo elektronika (WKK)" })}
        ${btn("kluczyki", "Utwórz kluczyki", { ikona: "fa-solid fa-key", gm: true, tip: `W stacyjce (ładowni). Id: ${idKluczykow(actor) ?? "—"}` })}
        ${btn("przelaczKrotko", s.naKrotko ? "Przełącz: na kluczyk" : "Przełącz: na krótko", { gm: true })}
      </div></section>`);
  }

  // Kaskader (E7, s. 89).
  const kierowca = tok ? kierowcaPojazdu(tok) : null;
  if (kierowca && maZdolnosc(kierowca.actor, ZDOLNOSCI.kaskader) && k.silnik) {
    czesci.push(`<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-person-falling-burst" inert></i> Kaskader — ${esc(kierowca.name)}</h4>
      <div class="neuro-pojazd-przyciski">
        <select class="neuro-pojazd-trik"><option value="dwaKola">Na dwóch kółkach</option><option value="schody">Schody to też jezdnia</option><option value="skok">Skoczek</option></select>
        ${btn("kaskader", "Trik: Pojazdy ST 15 z Ułatwieniem")}
      </div></section>`);
  }

  // Własność (D11).
  const obecni = new Set(dostepZObecnosci(actor).map(([u]) => u));
  const stali = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER") && !obecni.has(u.id));
  czesci.push(`<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-user-shield" inert></i> Dostęp</h4>
    ${wiersz("Właściciele (MG)", stali.map(u => esc(u.name)).join(", ") || "—")}
    ${wiersz("Z obecności (w środku)", [...obecni].map(id => esc(game.users.get(id)?.name ?? id)).join(", ") || "—")}
    <p class="neuro-pojazd-uwaga">Gracz, którego postać siedzi w środku, ma prawa właściciela do czasu wysiadki (D11).</p></section>`);
  return czesci.join("");
}

function htmlZaloga(actor) {
  const tok = zetonPojazdu(actor);
  if (!tok) return `<p class="neuro-pojazd-uwaga">Pojazd nie stoi na żadnej scenie — miejsca obsadza się na mapie.</p>`;
  const zajete = zajeteMiejsca(tok);
  const widac = mozePrzeswietlic(tok);
  const strefy = danePojazdu(actor).strefy;
  const rows = strefy.map(s => {
    const ms = miejscaPojazdu(actor).filter(m => m.strefa === s.id);
    const li = ms.map(m => {
      const t = zajete.get(m.id);
      const kto = t ? (widac ? `<img src="${esc(t.texture.src)}" alt=""> ${esc(t.name)}` : "zajęte") : `<em>wolne</em>`;
      const akcje = t && widac ? btn("wypadnij", "Wypadnięcie", { gm: true, dane: { jadacy: t.uuid }, tip: "3k6 obuchowych i Powalenie (s. 261)" }) : "";
      return `<li class="neuro-pojazd-miejsce${t ? " is-zajete" : ""}"><span class="neuro-pojazd-miejsce-opis">${esc(opisMiejsca(actor, m))}</span><span class="neuro-pojazd-kto">${kto}</span>${akcje}</li>`;
    }).join("");
    return `<section class="neuro-pojazd-sekcja"><h4>${esc(s.nazwa ?? s.id)}${s.oslona ? ` · osłona ${({ polowa: "½", trzyCzwarte: "¾", calkowita: "całkowita" })[s.oslona] ?? esc(s.oslona)}` : ""}${s.stojace ? " · stojące" : ""}</h4><ul class="neuro-pojazd-miejsca">${li}</ul></section>`;
  }).join("");
  return `<div class="neuro-pojazd-przyciski">
      ${btn("miejsca", "Okno miejsc", { ikona: "fa-solid fa-chair", tip: "Wsiądź / przesiądź się — zaznaczonym żetonem" })}
      ${btn("wysadzWszystkich", "Wysadź wszystkich", { ikona: "fa-solid fa-door-open", gm: true })}
    </div>${rows}`;
}

function htmlUzbrojenie(actor) {
  const tok = zetonPojazdu(actor);
  const stan = miejscaPojazdu(actor).filter(m => m.stanowisko);
  const bron = tok ? bronStanowisk(actor) : [];
  const ladownia = actor.items.filter(i => i.type === "weapon" && !i.flags?.[MODULE_ID]?.stanowisko);
  const opcje = ladownia.map(i => `<option value="${esc(i.uuid)}">${esc(i.name)}</option>`).join("");
  const rows = stan.map(m => {
    const b = bron.find(x => x.stanowisko === m.id);
    const gdzie = b ? (b.u === actor ? "w ładowni (czeka na strzelca)" : `u strzelca: ${esc(b.u.name)}`) : "";
    return `<li class="neuro-pojazd-miejsce"><span class="neuro-pojazd-miejsce-opis">${esc(opisMiejsca(actor, m))}</span>
      <span class="neuro-pojazd-kto">${b ? `<img src="${esc(b.item.img)}" alt=""> ${esc(b.item.name)} — ${gdzie}` : "<em>pusto</em>"}</span>
      ${b ? btn("zdejmij", "Zdejmij", { dane: { bron: b.item.uuid }, tip: "Drobnostka, bez kosztów (1k4 × 10 min)" })
        : (ladownia.length ? `<select class="neuro-pojazd-wybor" data-stanowisko="${esc(m.id)}">${opcje}</select>
          ${btn("montujRobota", "Zamontuj (Robota)", { dane: { stanowisko: m.id }, tip: "Trochę roboty od ceny broni: ST 15, 30% ceny, 1k4 h (D16)" })}
          ${btn("montujOdReki", "Od ręki", { dane: { stanowisko: m.id }, gm: true })}` : "<em>brak broni w ładowni</em>")}
    </li>`;
  }).join("");
  return `<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-crosshairs" inert></i> Stanowiska</h4>
    <p class="neuro-pojazd-uwaga">Strzelec na stanowisku dostaje broń do ręki (bez wagi); gdy wstaje, broń wraca do pojazdu (D16).</p>
    <ul class="neuro-pojazd-miejsca">${rows}</ul></section>`;
}

function htmlAwarie(actor) {
  const czesci = [];
  const tok = zetonPojazdu(actor);
  const wRuchu = tok ? jedzie(tok) : false;
  if (maAwarie(actor)) {
    const ef = efektyAwarii(actor);
    const li = ef.map(e => {
      const k20 = e.flags[MODULE_ID][FLAGA_AWARIA].k20;
      const a = AWARIE_POJAZDOW[k20];
      const st = a.postoj ? stopienZST(a.postoj) : null;
      return `<li class="neuro-pojazd-awaria${e.disabled ? " is-zawieszona" : ""}">
        <span><strong>${k20}. ${esc(a.nazwa)}</strong>${e.disabled ? " — zawieszona (naprawa tymczasowa)" : ""}<br><small>${esc(a.opis)}</small></span>
        <span class="neuro-pojazd-przyciski">
          ${a.jazda ? btn("tymczasowa", `Tymczasowa (ST ${a.jazda})`, { dane: { efekt: e.id }, tip: "Akcja + test; skutek wraca po minucie (s. 264)", wylaczony: e.disabled }) : ""}
          ${a.postoj ? btn("fachowa", `Fachowa: ${NAPRAWA[st].label} (ST ${a.postoj}, ${kosztNaprawyAwarii(actor, st)} gb)`, { dane: { efekt: e.id }, tip: wRuchu ? "Pojazd jedzie — fachowa naprawa wymaga postoju" : "Narzędzia małego mechanika (s. 146)" }) : ""}
          ${btn("usunAwarie", "Usuń", { dane: { efekt: e.id }, gm: true })}
        </span></li>`;
    }).join("");
    const zeg = zegaryPojazdu(actor).map(z => `<li>${esc(ZEGARY[z.rodzaj] ?? z.rodzaj)}${z.pozostalo !== null ? `: ${Math.ceil(z.pozostalo / (CONFIG.time?.roundTime || 6))} rund` : ""}</li>`).join("");
    czesci.push(`<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-triangle-exclamation" inert></i> Awarie (s. 264–265)</h4>
      ${li ? `<ul class="neuro-pojazd-awarie">${li}</ul>` : "<p><em>Brak awarii.</em></p>"}
      ${zeg ? `<h5>Zegary</h5><ul>${zeg}</ul>` : ""}
      ${ef.some(e => e.flags[MODULE_ID][FLAGA_AWARIA].k20 === 14 && !e.disabled)
        ? `<div class="neuro-pojazd-przyciski">${btn("hamuj", "Hamuj: Pojazdy ST 15", { ikona: "fa-solid fa-hand", tip: "Awaria 14 — porażka: Przewrócenie (awaria 8)" })}</div>` : ""}
      <div class="neuro-pojazd-przyciski">
        ${btn("rzutAwarii", "Rzuć k20 na Tabelę awarii", { ikona: "fa-solid fa-dice-d20", gm: true })}
        ${game.user.isGM ? `<select class="neuro-pojazd-k20">${Object.entries(AWARIE_POJAZDOW).map(([n, a]) => `<option value="${n}">${n}. ${esc(a.nazwa)}</option>`).join("")}</select>` : ""}
        ${btn("zastosujAwarie", "Zastosuj wybraną", { gm: true })}
      </div></section>`);
  }
  const hp = actor.system.attributes.hp;
  const brak = Math.max(0, hp.max - hp.value);
  czesci.push(`<section class="neuro-pojazd-sekcja"><h4><i class="fa-solid fa-car-side" inert></i> Karoseria i wrak</h4>
    ${wiersz("PW", `${hp.value} / ${hp.max}${brak ? ` — cała karoseria: ${kosztKaroserii(actor, brak)} gb` : ""}`)}
    <div class="neuro-pojazd-przyciski">
      ${jestWrakiem(actor)
        ? `${btn("odbuduj", "Odbudowa (Robota)", { ikona: "fa-solid fa-screwdriver-wrench", tip: "Skomplikowana harówa od ceny pojazdu, 2k4 h × rozmiar (D19)" })}
           ${btn("cofnijWrak", "Cofnij wrak", { gm: true })}${btn("wybuch", "Wybuch baku", { gm: true })}`
        : btn("karoseria", "Napraw karoserię (1 h)", { ikona: "fa-solid fa-screwdriver-wrench", wylaczony: !brak, tip: "2k6 + mod. INT PW; surowce wg PW (D19)" })}
    </div></section>`);
  return czesci.join("");
}

/* -------------------------------------------- */
/*  Akcje                                        */
/* -------------------------------------------- */

async function akcja(sheet, el) {
  const actor = sheet.actor;
  const tok = zetonPojazdu(actor);
  const d = el.dataset;
  const ef = id => actor.effects.get(id);
  switch (d.co) {
    case "uruchom": return tok && uruchom(tok);
    case "zgas": return tok && zgas(tok);
    case "swiatla": return tok && przelaczSwiatla(tok);
    case "naKrotko": return tok && naKrotko(tok);
    case "kluczyki": return tok && utworzKluczyki(tok);
    case "przelaczKrotko": return tok && ustawNaKrotko(tok, !stanSilnika(actor).naKrotko);
    case "miejsca": return tok && otworzMiejsca(tok, zetonUzytkownika(tok.parent));
    case "wysadzWszystkich": return tok && wysadzWszystkich(tok);
    case "wypadnij": { const j = await fromUuid(d.jadacy); return j && wypadnij(j); }
    case "kaskader": return tok && trikKaskadera(tok, sheet.element.querySelector(".neuro-pojazd-trik")?.value);
    case "hamuj": return tok && testKierowcy(tok, kierowcaPojazdu(tok)?.actor, { st: 15, skutek: "przewrocenie" });
    case "rzutAwarii": return rzucAwarie(actor);
    case "zastosujAwarie": return zastosujAwarie(tok ?? actor, Number(sheet.element.querySelector(".neuro-pojazd-k20")?.value) || 1);
    case "usunAwarie": return game.user.isGM && ef(d.efekt)?.delete();
    case "tymczasowa": return naprawTymczasowo(actor, d.efekt, wykonawca());
    case "fachowa": return naprawFachowo(actor, d.efekt, wykonawca());
    case "karoseria": return naprawKaroserie(actor, wykonawca());
    case "odbuduj": return odbuduj(actor, wykonawca());
    case "cofnijWrak": return cofnijWrak(actor);
    case "wybuch": return wybuchBaku(actor);
    case "zdejmij": { const b = await fromUuid(d.bron); return tok && b && zdejmij(tok, b); }
    case "montujRobota":
    case "montujOdReki": {
      const sel = sheet.element.querySelector(`.neuro-pojazd-wybor[data-stanowisko="${d.stanowisko}"]`);
      const b = sel ? await fromUuid(sel.value) : null;
      if (!tok || !b) return;
      if (d.co === "montujOdReki") return zamontujOdReki(tok, b, d.stanowisko);
      const kto = wykonawca();
      if (!kto) return ui.notifications.warn("Zaznacz żeton postaci, która montuje.");
      return zamontujRobota(tok, b, d.stanowisko, kto);
    }
  }
}

/* -------------------------------------------- */
/*  Klasa                                        */
/* -------------------------------------------- */

const czyPojazd = a => jestPojazdem(a);

function zbudujKarte(Base) {
  const tabBody = { container: { classes: ["tab-body"], id: "tabs" }, template: SZABLON, scrollable: [""] };
  const stock = Object.fromEntries(Base.TABS.map(t => [t.tab, t]));
  return class KartaPojazdu extends Base {
    static DEFAULT_OPTIONS = {
      classes: ["neuro-karta-pojazdu"],
      // ApplicationV2 woła akcje z `this` = instancja karty — dlatego `function`, nie strzałka.
      actions: { neuroPojazd: function (event, target) { return akcja(this, target); } },
      position: { width: 760, height: 820 }
    };

    static PARTS = { ...Base.PARTS, pojazd: tabBody, zaloga: tabBody, uzbrojenie: tabBody, awarie: tabBody };

    static TABS = [
      { tab: "pojazd", label: "Pojazd", icon: "fa-solid fa-car-side", condition: czyPojazd },
      { tab: "zaloga", label: "Załoga", icon: "fa-solid fa-users", condition: czyPojazd },
      { ...stock.inventory, label: "Ładownia" },
      { ...stock.crew, condition: a => !czyPojazd(a) && (stock.crew?.condition?.(a) ?? true) },
      { tab: "uzbrojenie", label: "Uzbrojenie", icon: "fa-solid fa-crosshairs", condition: a => czyPojazd(a) && miejscaPojazdu(a).some(m => m.stanowisko) },
      { tab: "awarie", label: "Awarie i naprawy", icon: "fa-solid fa-wrench", condition: czyPojazd },
      ...Base.TABS.filter(t => !["inventory", "crew"].includes(t.tab))
    ].filter(t => t.tab);

    constructor(options = {}) {
      super(options);
      if (czyPojazd(this.document)) this.tabGroups.primary = "pojazd";
    }

    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      const budowa = { pojazd: htmlPojazd, zaloga: htmlZaloga, uzbrojenie: htmlUzbrojenie, awarie: htmlAwarie }[partId];
      if (budowa && czyPojazd(this.actor)) {
        context.tab ??= context.tabs?.[partId];
        try { context.neuroHtml = budowa(this.actor); } catch (err) {
          console.error(`${MODULE_ID} | karta pojazdu: ${partId}`, err);
          context.neuroHtml = `<p class="neuro-pojazd-alarm">Błąd zakładki — konsola.</p>`;
        }
      }
      return context;
    }
  };
}

let _klasa = null;

/** Odświeża otwarte karty pojazdów (zmiana jadących, silnika, awarii na żetonach i aktorach). */
export function odswiezKartyPojazdow() {
  for (const app of foundry.applications.instances.values()) {
    if (_klasa && app instanceof _klasa && app.rendered) app.render();
  }
}

export function registerKarta() {
  Hooks.once("ready", () => {
    const Base = dnd5e?.applications?.actor?.VehicleActorSheet;
    if (!Base) return console.warn(`${MODULE_ID} | Brak VehicleActorSheet — karta pojazdu nie zarejestrowana`);
    _klasa = zbudujKarte(Base);
    foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, _klasa, {
      types: ["vehicle"],
      // Jak karta drużyny i powłoka postaci: domyślność liczy każdy klient osobno (ARCHITECTURE §9).
      makeDefault: true,
      label: "Neuroshima — Karta pojazdu"
    });
    foundry.applications.handlebars.loadTemplates([SZABLON]);
  });
  // Zmiany obsady i flag pojazdu → odśwież karty.
  Hooks.on("neuroshima.pojazdZaloga", () => odswiezKartyPojazdow());
  for (const h of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"]) {
    Hooks.on(h, e => { if (jestPojazdem(e.parent)) odswiezKartyPojazdow(); });
  }
}
