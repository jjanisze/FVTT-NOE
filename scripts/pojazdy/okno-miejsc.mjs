/**
 * Neuroshima 5e — okno miejsc (PLAN_m4_pojazdy D4, §4.10, E3).
 *
 * Małe okno z obrazem pojazdu z góry (przodem w dół, jak grafika żetonu) i klikalnymi miejscami. To samo
 * okno dla „Wsiądź” (postać spoza pojazdu) i „Przesiądź się” (postać w środku). Kto siedzi gdzie, widać
 * tylko z prawem prześwietlenia (MG, właściciel, jadący — D3); reszta widzi „zajęte”.
 */

import { danePojazdu, jazdaZetonu, miejscaPojazdu, pojazdJadacego, MODULE_ID } from "./stan.mjs";
import { mozePrzeswietlic } from "./zeton.mjs";
import {
  jedzie, kosztPrzesiadki, odlegloscOdPojazdu, opisMiejsca, przesiadz, wsiadz, wysiadz, zajeteMiejsca,
  ZASIEG_WSIADANIA_M, ST_PRZESIADKI
} from "./jadacy.mjs";
import { maSilnik, przelaczSwiatla, stanSilnika, uruchom, zgas } from "./silnik.mjs";
import { akrobatykaPrzedAtakiem } from "./jazda.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const okna = new Map();

/** Wysokość obrazu pojazdu w oknie (px) dla najdłuższego boku. */
const DLUGI_BOK = 360;

class OknoMiejsc extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-okno-miejsc"],
    window: { title: "Miejsca", icon: "fa-solid fa-chair", resizable: false },
    position: { width: "auto", height: "auto" }
  };

  constructor(pojazd, jadacy, options = {}) {
    super({ id: `neuro-miejsca-${pojazd.id}`, ...options });
    this.pojazd = pojazd;
    this.jadacy = jadacy;
    this.tryb = "ostroznie";
  }

  get title() {
    return `${this.pojazd.name} — miejsca`;
  }

  async _renderHTML() {
    const p = this.pojazd;
    const dane = danePojazdu(p.actor);
    const div = document.createElement("div");
    div.className = "neuro-miejsca";
    if (!dane) {
      div.textContent = "To nie jest pojazd.";
      return div;
    }
    const skala = DLUGI_BOK / Math.max(dane.obrys.w, dane.obrys.h);
    const W = Math.max(60, Math.round(dane.obrys.w * skala));
    const H = Math.round(dane.obrys.h * skala);
    const widac = mozePrzeswietlic(p);
    const zajete = zajeteMiejsca(p);
    const j = this.jadacy;
    const wTym = j && pojazdJadacego(j)?.id === p.id;
    const moje = wTym ? jazdaZetonu(j).miejsce : null;
    const z = moje ? miejscaPojazdu(p.actor).find(m => m.id === moje) : null;
    const wRuchu = jedzie(p);
    const rozmiarKropki = Math.max(22, Math.min(40, skala * 0.42));

    const miejsca = miejscaPojazdu(p.actor).map(m => {
      const t = zajete.get(m.id);
      const left = 50 + m.x / dane.obrys.w * 100;
      const top = 50 + m.y / dane.obrys.h * 100;
      const klasy = ["neuro-miejsce", t ? "is-zajete" : "is-wolne", m.kierowca ? "is-kierowca" : "", m.stanowisko ? "is-stanowisko" : "",
        t && t.id === j?.id ? "is-moje" : ""].filter(Boolean).join(" ");
      let tip = opisMiejsca(p.actor, m);
      if (t) tip += widac ? ` — ${t.name}` : " — zajęte";
      else if (z) {
        const k = kosztPrzesiadki(z, m, { jedzie: wRuchu });
        tip += wRuchu ? ` — ${k.ostroznie} m ostrożnie / ${k.szybko} m z testem${k.wymagaTestu ? " (zmiana rzędu: test zawsze)" : ""}` : ` — ${k.ostroznie} m`;
      }
      const ikona = m.kierowca ? "fa-solid fa-steering-wheel" : m.stanowisko ? "fa-solid fa-crosshairs" : "";
      const obraz = t && widac ? `<img src="${esc(t.texture.src)}" alt="">` : (ikona ? `<i class="${ikona}" inert></i>` : "");
      return `<button type="button" class="${klasy}" data-miejsce="${esc(m.id)}" ${t && t.id !== j?.id ? "disabled" : ""}
        style="left:${left}%;top:${top}%;width:${rozmiarKropki}px;height:${rozmiarKropki}px" data-tooltip="${esc(tip)}">${obraz}</button>`;
    }).join("");

    let stopka = "";
    if (!j) stopka = `<p class="neuro-miejsca-info">Zaznacz swój żeton na mapie, żeby wsiąść.</p>`;
    else if (wTym) {
      stopka = `<p class="neuro-miejsca-info">${esc(j.name)}: ${esc(opisMiejsca(p.actor, z))}. Kliknij wolne miejsce, żeby się przesiąść.</p>`;
      if (wRuchu) {
        stopka += `<div class="neuro-miejsca-tryb">
          <label><input type="radio" name="tryb" value="ostroznie" ${this.tryb === "ostroznie" ? "checked" : ""}> Ostrożnie — odległość ×2, bez testu</label>
          <label><input type="radio" name="tryb" value="szybko" ${this.tryb === "szybko" ? "checked" : ""}> Szybko — ×1, ZRC (Akrobatyka) ST ${ST_PRZESIADKI}</label>
        </div>`;
      } else stopka += `<p class="neuro-miejsca-info">Pojazd stoi — odległość ×2, bez testu.</p>`;
      stopka += `<button type="button" class="neuro-miejsca-wysiadz"><i class="fa-solid fa-door-open" inert></i> Wysiądź</button>`;
    } else {
      const odl = odlegloscOdPojazdu(j, p);
      stopka = `<p class="neuro-miejsca-info">Wsiada: <strong>${esc(j.name)}</strong> (${odl.toFixed(1)} m od pojazdu${odl > ZASIEG_WSIADANIA_M + 0.2 ? " — za daleko, RAW 1,5 m" : ""}). Kliknij wolne miejsce.</p>`;
    }

    const src = p.texture?.src;
    div.innerHTML = `
      <div class="neuro-miejsca-pojazd" style="width:${W}px;height:${H}px">
        ${src ? `<img class="neuro-miejsca-tlo" src="${esc(src)}" alt="" style="width:${W}px;height:${H}px">` : ""}
        ${miejsca}
      </div>
      ${stopka}`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const el = this.element;
    el.querySelectorAll(".neuro-miejsce.is-wolne").forEach(b => b.addEventListener("click", ev => this.#wybierz(ev)));
    el.querySelectorAll("input[name=tryb]").forEach(r => r.addEventListener("change", ev => { this.tryb = ev.target.value; }));
    el.querySelector(".neuro-miejsca-wysiadz")?.addEventListener("click", async () => {
      await wysiadz(this.jadacy);
      this.close();
    });
  }

  async #wybierz(ev) {
    const id = ev.currentTarget.dataset.miejsce;
    const j = this.jadacy;
    if (!j) return ui.notifications.warn("Zaznacz swój żeton na mapie.");
    if (!j.isOwner) return ui.notifications.warn("To nie twój żeton.");
    if (pojazdJadacego(j)?.id === this.pojazd.id) await przesiadz(j, id, { tryb: this.tryb });
    else await wsiadz(this.pojazd, j, id);
    this.close();
  }

  _onClose(options) {
    super._onClose?.(options);
    okna.delete(this.pojazd.id);
  }
}

/** Żeton, którym ten użytkownik wsiada: zaznaczony (nie pojazd), inaczej żeton jego postaci na scenie. */
export function zetonUzytkownika(scena) {
  const zazn = canvas.tokens?.controlled.map(t => t.document).filter(d => d.parent === scena && !danePojazdu(d.actor));
  if (zazn?.length) return zazn[0];
  const postac = game.user.character;
  return postac ? scena.tokens.find(t => t.actorId === postac.id && t.isOwner) ?? null : null;
}

/** Otwiera okno miejsc pojazdu dla żetonu (domyślnie: żeton użytkownika). */
export function otworzMiejsca(pojazdDoc, jadacyDoc = null) {
  const j = jadacyDoc ?? zetonUzytkownika(pojazdDoc.parent);
  okna.get(pojazdDoc.id)?.close();
  const app = new OknoMiejsc(pojazdDoc, j);
  okna.set(pojazdDoc.id, app);
  return app.render({ force: true });
}

/** Odświeża otwarte okna (zmiana składu). */
export function odswiezOknaMiejsc() {
  for (const app of okna.values()) if (app.rendered) app.render();
}

/* -------------------------------------------- */
/*  HUD żetonu                                   */
/* -------------------------------------------- */

function _przycisk(ikona, tip, fn) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon neuro-pojazd-hud";
  btn.dataset.tooltip = tip;
  btn.innerHTML = `<i class="${ikona}" inert></i>`;
  btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); fn(); });
  return btn;
}

function _onRenderTokenHUD(hud, html) {
  const doc = hud.document ?? hud.object?.document;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const kol = root?.querySelector(".col.right");
  if (!doc || !kol || kol.querySelector(".neuro-pojazd-hud")) return;
  if (danePojazdu(doc.actor)) {
    kol.append(_przycisk("fa-solid fa-chair", "Miejsca — wsiądź, przesiądź się (s. 260–261)", () => otworzMiejsca(doc)));
    if (doc.actor.isOwner && maSilnik(doc.actor)) {
      const s = stanSilnika(doc.actor);
      const b = _przycisk("fa-solid fa-key", s.wl ? "Zgaś silnik (bez kosztu)" : "Uruchom silnik (akcja)",
        () => (stanSilnika(doc.actor).wl ? zgas(doc) : uruchom(doc)));
      b.classList.toggle("active", s.wl);
      kol.append(b);
      const l = _przycisk("fa-solid fa-lightbulb", s.swiatla ? "Zgaś światła" : "Włącz światła", () => przelaczSwiatla(doc));
      l.classList.toggle("active", s.swiatla);
      kol.append(l);
    }
    return;
  }
  const pojazd = pojazdJadacego(doc);
  if (pojazd && doc.isOwner) {
    kol.append(_przycisk("fa-solid fa-chair", `Miejsca w ${pojazd.name} — przesiądź się`, () => otworzMiejsca(pojazd, doc)));
    kol.append(_przycisk("fa-solid fa-door-open", `Wysiądź z ${pojazd.name}`, () => wysiadz(doc)));
    if (jedzie(pojazd)) kol.append(_przycisk("fa-solid fa-person-falling", "Przed atakiem: ZRC (Akrobatyka) ST 10 (s. 261)", () => akrobatykaPrzedAtakiem(doc)));
  }
}

export function registerOknoMiejsc() {
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
  for (const hook of ["createToken", "deleteToken"]) Hooks.on(hook, odswiezOknaMiejsc);
  Hooks.on("updateToken", (doc, changes) => {
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) odswiezOknaMiejsc();
  });
}
