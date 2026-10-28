/**
 * Neuroshima 5e — okno miejsc (PLAN_m4_pojazdy D4, §4.10, E3).
 *
 * Małe okno z obrazem pojazdu z góry (przodem w dół, jak grafika żetonu) i klikalnymi miejscami. To samo
 * okno dla „Wsiądź” (postać spoza pojazdu) i „Przesiądź się” (postać w środku). Kto siedzi gdzie, widać
 * z prawem prześwietlenia albo dla widocznego jadącego na otwartym miejscu (D3, D32).
 */

import { danePojazdu, jazdaZetonu, miejscaPojazdu, pojazdJadacego, MODULE_ID } from "./stan.mjs";
import { mozePrzeswietlic } from "./zeton.mjs";
import { grafikaWnetrza, kadrGrafikiMiejsc } from "./grafika.mjs";
import { rozpoznawalnyJadacy } from "./prezentacja.mjs";
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
    this.wTrakcie = false;
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
    // Żeton mógł zostać usunięty lub utracić własność, gdy okno było otwarte.
    const j = this.jadacy = p.parent.tokens.find(t => t === this.jadacy && t.actor && t.isOwner) ?? null;
    const wTym = j && pojazdJadacego(j)?.id === p.id;
    const moje = wTym ? jazdaZetonu(j).miejsce : null;
    const z = moje ? miejscaPojazdu(p.actor).find(m => m.id === moje) : null;
    const wRuchu = jedzie(p);
    const rozmiarKropki = Math.max(22, Math.min(40, skala * 0.42));

    const miejsca = miejscaPojazdu(p.actor).map(m => {
      const t = zajete.get(m.id);
      const rozpoznany = rozpoznawalnyJadacy(m, t, widac);
      const left = 50 + m.x / dane.obrys.w * 100;
      const top = 50 + m.y / dane.obrys.h * 100;
      const klasy = ["neuro-miejsce", t ? "is-zajete" : "is-wolne", m.kierowca ? "is-kierowca" : "", m.stanowisko ? "is-stanowisko" : "",
        t && t.id === j?.id ? "is-moje" : ""].filter(Boolean).join(" ");
      let tip = opisMiejsca(p.actor, m);
      if (t) tip += rozpoznany ? ` — ${t.name}` : " — zajęte";
      else if (z) {
        const k = kosztPrzesiadki(z, m, { jedzie: wRuchu });
        tip += wRuchu ? ` — ${k.ostroznie} m ostrożnie / ${k.szybko} m z testem${k.wymagaTestu ? " (zmiana rzędu: test zawsze)" : ""}` : ` — ${k.ostroznie} m`;
      }
      const ikona = m.kierowca ? "fa-solid fa-steering-wheel" : m.stanowisko ? "fa-solid fa-crosshairs" : "";
      const obraz = rozpoznany ? `<img src="${esc(t.texture.src)}" alt="">` : (ikona ? `<i class="${ikona}" inert></i>` : "");
      return `<button type="button" class="${klasy}" data-miejsce="${esc(m.id)}" ${this.wTrakcie || (t && t.id !== j?.id) ? "disabled" : ""}
        style="left:${left}%;top:${top}%;width:${rozmiarKropki}px;height:${rozmiarKropki}px" data-tooltip="${esc(tip)}">${obraz}</button>`;
    }).join("");

    let stopka = "";
    if (!j) stopka = `<p class="neuro-miejsca-info">Zaznacz dokładnie jeden żeton postaci na mapie, żeby wsiąść. Okno śledzi zaznaczenie. Celowanie nie wybiera postaci.</p>`;
    else if (wTym) {
      stopka = `<p class="neuro-miejsca-info">${esc(j.name)}: ${esc(opisMiejsca(p.actor, z))}. Kliknij wolne miejsce, żeby się przesiąść.</p>`;
      if (wRuchu) {
        stopka += `<div class="neuro-miejsca-tryb">
          <label><input type="radio" name="tryb" value="ostroznie" ${this.tryb === "ostroznie" ? "checked" : ""}> Ostrożnie — odległość ×2, bez testu</label>
          <label><input type="radio" name="tryb" value="szybko" ${this.tryb === "szybko" ? "checked" : ""}> Szybko — ×1, ZRC (Akrobatyka) ST ${ST_PRZESIADKI}</label>
        </div>`;
      } else stopka += `<p class="neuro-miejsca-info">Pojazd stoi — odległość ×2, bez testu.</p>`;
      stopka += `<button type="button" class="neuro-miejsca-wysiadz" ${this.wTrakcie ? "disabled" : ""}><i class="fa-solid fa-door-open" inert></i> Wysiądź</button>`;
    } else {
      const odl = odlegloscOdPojazdu(j, p);
      stopka = `<p class="neuro-miejsca-info">Wsiada: <strong>${esc(j.name)}</strong> (${odl.toFixed(1)} m od pojazdu${odl > ZASIEG_WSIADANIA_M + 0.2 ? " — za daleko, RAW 1,5 m" : ""}). Kliknij wolne miejsce.</p>`;
    }

    const src = (widac && grafikaWnetrza(p)) || p.texture?.src;
    const obraz = kadrGrafikiMiejsc(p,W,H);
    div.innerHTML = `
      <div class="neuro-miejsca-pojazd" style="width:${W}px;height:${H}px">
        ${src ? `<div class="neuro-miejsca-kadr"><img class="neuro-miejsca-tlo" src="${esc(src)}" alt="" style="width:${obraz.width}px;height:${obraz.height}px;left:${obraz.x}px;top:${obraz.y}px"></div>` : ""}
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
      const j = this.jadacy;
      if (this.wTrakcie || !j?.isOwner || !j.parent.tokens.has(j.id)) return;
      this.wTrakcie = true;
      try { await wysiadz(j); }
      finally { this.wTrakcie = false; }
      this.close();
    });
  }

  async #wybierz(ev) {
    if (this.wTrakcie) return;
    const id = ev.currentTarget.dataset.miejsce;
    const j = this.jadacy;
    if (!j || !j.parent.tokens.has(j.id)) return ui.notifications.warn("Zaznacz dokładnie jeden żeton postaci na mapie. Celowanie nie wystarczy.");
    if (!j.isOwner) return ui.notifications.warn("To nie twój żeton.");
    this.wTrakcie = true;
    try {
      if (pojazdJadacego(j)?.id === this.pojazd.id) await przesiadz(j, id, { tryb: this.tryb });
      else await wsiadz(this.pojazd, j, id);
      if (pojazdJadacego(j)?.id === this.pojazd.id && jazdaZetonu(j)?.miejsce === id) await this.close();
    } finally {
      this.wTrakcie = false;
      if (this.rendered) {
        this.jadacy = zetonUzytkownika(this.pojazd.parent);
        this.render();
      }
    }
  }

  _onClose(options) {
    super._onClose?.(options);
    if (okna.get(this.pojazd.id) === this) okna.delete(this.pojazd.id);
  }
}

/** Jeden zaznaczony własny żeton postaci; bez zaznaczenia — jednoznaczny żeton postaci użytkownika. */
export function zetonUzytkownika(scena) {
  const mozeWsiadac = d => d.actor && d.isOwner && !danePojazdu(d.actor);
  const zazn = canvas.tokens?.controlled.map(t => t.document).filter(d => d.parent === scena && mozeWsiadac(d)) ?? [];
  if (zazn.length) return zazn.length === 1 ? zazn[0] : null;
  const postac = game.user.character;
  const tokeny = postac ? scena.tokens.filter(t => t.actorId === postac.id && mozeWsiadac(t)) : [];
  return tokeny.length === 1 ? tokeny[0] : null;
}

/** Otwiera okno miejsc pojazdu dla żetonu (domyślnie: żeton użytkownika). */
export async function otworzMiejsca(pojazdDoc, jadacyDoc = null) {
  // Zamknięcie usuwa instancję także z rejestru rdzenia pod tym samym id.
  await okna.get(pojazdDoc.id)?.close();
  const j = jadacyDoc ?? zetonUzytkownika(pojazdDoc.parent);
  const app = new OknoMiejsc(pojazdDoc, j);
  okna.set(pojazdDoc.id, app);
  return app.render({ force: true });
}

/** Odświeża otwarte okna (zmiana składu). */
export function odswiezOknaMiejsc() {
  for (const app of okna.values()) {
    if (!app.pojazd.parent.tokens.has(app.pojazd.id)) app.close();
    else app.render();
  }
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
  // Rdzeń najpierw zwalnia stare zaznaczenie, potem zaznacza nowe. Stan zmieniamy od razu,
  // ale rysujemy dopiero po całej operacji, żeby dwa hooki nie ścigały się o render okna.
  let odswiezenieZaznaczenia = false;
  Hooks.on("controlToken", () => {
    for (const app of okna.values()) if (!app.wTrakcie) app.jadacy = zetonUzytkownika(app.pojazd.parent);
    if (odswiezenieZaznaczenia) return;
    odswiezenieZaznaczenia = true;
    queueMicrotask(() => {
      odswiezenieZaznaczenia = false;
      odswiezOknaMiejsc();
    });
  });
  Hooks.on("canvasTearDown", () => { for (const app of okna.values()) app.close(); });
  for (const hook of ["createToken", "deleteToken"]) Hooks.on(hook, odswiezOknaMiejsc);
  Hooks.on("updateToken", (doc, changes) => {
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`) || "hidden" in changes) odswiezOknaMiejsc();
  });
}
