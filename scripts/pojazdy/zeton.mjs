/**
 * Neuroshima 5e — żeton pojazdu i jadących na kanwie (PLAN_m4_pojazdy §4.1–§4.3, D2, D3, D13, D14).
 *
 * Jedna podklasa `CONFIG.Token.objectClass` (po Token5e) robi trzy rzeczy, każdą tylko dla
 * prawdziwego pojazdu albo jego jadącego — zwykłe żetony przechodzą przez `super` bez zmian:
 *
 * 1. **Obrys prostokątny w czterech kierunkach (§4.3).** Rdzeń skaluje siatkę z `width`/`height`
 *    dokumentu. Po zamianie obrysu (pojazd bokiem) grafika — malowana przodem w dół — wpisałaby się
 *    w poziomy prostokąt i po obrocie wyszła o połowę za wąska. Siatka pojazdu zawsze dostaje
 *    więc obrys **naturalny**, a obraca ją zwykłe `mesh.angle`.
 *
 * 2. **Jadący jadą z pojazdem (§4.1, D2).** Ten sam wzorzec co Regiony przypięte do żetonu w
 *    rdzeniu 14 (`#animateAttachments`): w każdej klatce animacji pojazdu każdy klient liczy
 *    pozycję miejsca obróconą o kąt pojazdu i ustawia jadącego lokalnie — dokument dostaje
 *    pośrednie `x/y/rotation` tak, jak rdzeń robi to w `#animateFrame`, a `_onAnimationUpdate`
 *    jadącego odświeża pozycję, wizję i światło. Nic nie leci do bazy w trakcie jazdy; końcowe
 *    pozycje jadących i zamianę obrysu zapisuje aktywny MG jedną operacją po animacji
 *    (`zapiszPoRuchu`). Waypointów ruchu nie da się zmienić (rdzeń zamraża je przed
 *    `preMoveToken`), więc obrys przestawia się dopiero po dojechaniu.
 *
 * 3. **Ukrycie, kropki, prześwietlenie (§4.2, D3, D14).** Ukrycie jest lokalne — nadpisany
 *    `isVisible`, nie `hidden` dokumentu, bo ukryty dokument odebrałby graczowi własny żeton.
 *    Rdzeń nie wiąże wizji z widocznością (`_isVisionSource` nie czyta `isVisible`), więc ukryty
 *    jadący dalej patrzy z wnętrza. Pojazd rysuje kropkę na każde zajęte miejsce; prześwietlenie
 *    (kursor nad pojazdem, u MG, właścicieli i jadących) przygasza nadwozie i pokazuje jadących.
 */

import {
  MODULE_ID, bliskie, danePojazdu, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, kratkaPojazdu, miejsceOId,
  miejscaPojazdu, obrysDziala, pojazdJadacego, skalaPojazdu, trybSceny, wymiaryZetonu
} from "./stan.mjs";
import {
  naroznikDlaSrodka, normalizujKat, obrysZamieniony, punktWPojezdzie, srodekMiejsca
} from "./geometria.mjs";

/** Krycie nadwozia w prześwietleniu (§4.2: „ok. 35%”). */
const KRYCIE_PRZESWIETLENIA = 0.35;

/** Pojazdy prześwietlane przez ten klient (id żetonów). Stan lokalny, nigdy w bazie. */
const przeswietlane = new Set();

/* -------------------------------------------- */
/*  Pytania o żeton                              */
/* -------------------------------------------- */

/** Naturalny obrys pojazdu w pikselach, gdy żeton jest bokiem — inaczej `null`. */
function obrysSiatki(token) {
  const doc = token.document;
  const dane = danePojazdu(doc.actor);
  const scena = doc.parent;
  if (!dane || !obrysDziala(scena)) return null;
  const s = skalaPojazdu(scena);
  if (!obrysZamieniony(dane.obrys, doc.width / s, doc.height / s)) return null;
  const kp = kratkaPojazdu(scena);
  return { w: dane.obrys.w * kp, h: dane.obrys.h * kp };
}

/** Czy ten klient może prześwietlić pojazd: MG, właściciel pojazdu, gracz z postacią w środku (D3). */
export function mozePrzeswietlic(pojazdDoc) {
  if (game.user.isGM) return true;
  if (pojazdDoc.actor?.isOwner) return true;
  return jadacyPojazdu(pojazdDoc).some(t => t.actor?.isOwner);
}

/** Czy jadący ma być ukryty u tego klienta. */
function ukrytyJadacy(token) {
  if (token.controlled || token.isPreview) return false;
  const pojazd = pojazdJadacego(token.document);
  if (!pojazd) return false;
  return !przeswietlane.has(pojazd.id);
}

/** Czy pojazd jest teraz prześwietlany przez ten klient. */
export function przeswietlany(pojazdDoc) {
  return przeswietlane.has(pojazdDoc?.id);
}

/* -------------------------------------------- */
/*  Jadący w animacji                            */
/* -------------------------------------------- */

/**
 * Ustawia jadących pojazdu na ich miejscach wg bieżącego (być może pośredniego) stanu pojazdu.
 * Lokalnie, bez zapisu: dokładnie to, co rdzeń robi z dokumentem w klatce animacji.
 * @param {Token} pojazd   placeable pojazdu
 * @param {boolean} [koniec]  ostatnia klatka odcinka — zsynchronizuj stan animacji jadących
 */
export function prowadzJadacych(pojazd, koniec = false) {
  const doc = pojazd.document;
  const jadacy = jadacyPojazdu(doc);
  if (!jadacy.length || !obrysDziala(doc.parent)) return;
  const kp = kratkaPojazdu(doc.parent);
  const kratka = doc.parent.grid.size;
  const srodek = doc.getCenterPoint();
  for (const jDoc of jadacy) {
    const t = jDoc.object;
    if (!t || t.destroyed) continue;
    const j = jazdaZetonu(jDoc);
    const miejsce = miejsceOId(doc.actor, j.miejsce);
    if (!miejsce) continue;
    const s = srodekMiejsca(srodek, doc.rotation, miejsce, kp);
    const { x, y } = naroznikDlaSrodka(s, jDoc.width, jDoc.height, kratka);
    const rotation = normalizujKat(doc.rotation + (j.obrot ?? 0));
    const changed = {};
    if (jDoc.x !== x) changed.x = jDoc.x = x;
    if (jDoc.y !== y) changed.y = jDoc.y = y;
    if (jDoc.rotation !== rotation) changed.rotation = jDoc.rotation = rotation;
    if (Object.keys(changed).length) t._onAnimationUpdate(changed, { time: 1, duration: 1 });
    if (koniec) t.stopAnimation({ reset: false });
  }
}

/**
 * Docelowy stan po ruchu pojazdu: zamiana obrysu i pozycje jadących — instrukcje `moveTokens`.
 * Czysta względem kanwy: liczy z `_source`, czyli ze stanu, do którego animacja dojeżdża.
 * @returns {Record<string, object>}
 */
export function instrukcjePoRuchu(pojazdDoc) {
  const scena = pojazdDoc.parent;
  if (!danePojazdu(pojazdDoc.actor) || !obrysDziala(scena)) return {};
  const src = pojazdDoc._source;
  const kp = kratkaPojazdu(scena);
  const kratka = scena.grid.size;
  const instrukcje = {};
  const docelowy = wymiaryZetonu(pojazdDoc.actor, scena, src.rotation);
  if (!bliskie(docelowy.w, src.width) || !bliskie(docelowy.h, src.height)) {
    instrukcje[pojazdDoc.id] = { dimensions: { width: docelowy.w, height: docelowy.h, action: "displace" } };
  }
  const srodek = pojazdDoc.getCenterPoint(src);
  for (const jDoc of jadacyPojazdu(pojazdDoc)) {
    const j = jazdaZetonu(jDoc);
    const miejsce = miejsceOId(pojazdDoc.actor, j.miejsce);
    if (!miejsce) continue;
    const s = srodekMiejsca(srodek, src.rotation, miejsce, kp);
    const { x, y } = naroznikDlaSrodka(s, jDoc._source.width, jDoc._source.height, kratka);
    const rotation = normalizujKat(src.rotation + (j.obrot ?? 0));
    const js = jDoc._source;
    if (js.x === x && js.y === y && js.rotation === rotation && js.elevation === src.elevation) continue;
    instrukcje[jDoc.id] = { destination: { x, y, rotation, elevation: src.elevation, action: "displace" } };
  }
  return instrukcje;
}

/** Aktywny MG: po animacji pojazdu zapisuje obrys i jadących jedną operacją, bez animacji. */
async function zapiszPoRuchu(pojazdDoc) {
  const t = pojazdDoc.object;
  if (t && !t.destroyed) {
    const obietnice = [...t.animationContexts.values()].map(c => c.chain.at(-1)?.promise ?? c.promise);
    await Promise.allSettled(obietnice);
  }
  if (!pojazdDoc.parent?.tokens.has(pojazdDoc.id)) return;
  const instrukcje = instrukcjePoRuchu(pojazdDoc);
  if (!Object.keys(instrukcje).length) return;
  await pojazdDoc.parent.moveTokens(instrukcje, { animate: false, showRuler: false, method: "api" });
}

/* -------------------------------------------- */
/*  Kropki                                       */
/* -------------------------------------------- */

/**
 * Rysuje kropki zajętych miejsc w układzie żetonu pojazdu (bez tożsamości jadących, D3). Kropka jest
 * uchwytem celowania (D14): prawy klik celuje w ukrytego jadącego (Shift — dokłada do celów).
 */
export function odswiezKropki(token) {
  const doc = token.document;
  if (!jestZetonemPojazdu(doc)) {
    if (token.neuroKropki) token.neuroKropki.visible = false;
    return;
  }
  let c = token.neuroKropki;
  if (!c || c.destroyed) {
    c = token.neuroKropki = token.addChild(new PIXI.Container());
    c.eventMode = "passive";
  }
  const jadacy = new Map(jadacyPojazdu(doc).map(t => [jazdaZetonu(t).miejsce, t]));
  c.visible = jadacy.size > 0 && !przeswietlane.has(doc.id) && obrysDziala(doc.parent);
  for (const ch of c.removeChildren()) ch.destroy();
  if (!c.visible) return;
  const kratka = kratkaPojazdu(doc.parent);
  const srodek = doc.getCenterPoint({ x: 0, y: 0 });
  c.position.set(srodek.x, srodek.y);
  c.angle = doc.rotation;
  const r = Math.max(4, kratka * 0.11);
  for (const m of miejscaPojazdu(doc.actor)) {
    const jDoc = jadacy.get(m.id);
    if (!jDoc) continue;
    const celowany = !!jDoc.object?.isTargeted && game.user.targets.has(jDoc.object);
    const g = new PIXI.Graphics();
    g.lineStyle({ width: Math.max(2, r * 0.3), color: celowany ? 0xff3b30 : 0xf2e6c9, alpha: 0.95 });
    g.beginFill(0x1b1b1b, 0.85);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.position.set(m.x * kratka, m.y * kratka);
    g.eventMode = "static";
    g.cursor = "crosshair";
    g.hitArea = new PIXI.Circle(0, 0, r * 1.4);
    g.on("rightdown", ev => {
      ev.stopPropagation();
      const t = jDoc.object;
      if (!t) return;
      const juz = game.user.targets.has(t);
      t.setTarget(!juz, { releaseOthers: !ev.shiftKey && !juz });
    });
    c.addChild(g);
  }
}

/* -------------------------------------------- */
/*  Prześwietlenie                               */
/* -------------------------------------------- */

function ustawPrzeswietlenie(pojazd, wl) {
  const id = pojazd.document.id;
  if (wl === przeswietlane.has(id)) return;
  if (wl) przeswietlane.add(id);
  else przeswietlane.delete(id);
  pojazd.renderFlags.set({ refreshMesh: true, refreshState: true });
  odswiezKropki(pojazd);
  for (const j of jadacyPojazdu(pojazd.document)) {
    j.object?.renderFlags.set({ refreshVisibility: true, refreshState: true });
  }
}

/** Kursor nad pojazdem → prześwietlenie (§4.2). Jeden przebieg na klatkę. */
function sprawdzKursor() {
  if (!canvas.ready || !canvas.tokens?.placeables) return;
  const mysz = canvas.mousePosition;
  for (const t of canvas.tokens.placeables) {
    const doc = t.document;
    const dane = danePojazdu(doc.actor);
    if (!dane) continue;
    const wl = !!mysz && t.visible && obrysDziala(doc.parent) && mozePrzeswietlic(doc)
      && punktWPojezdzie(mysz, doc.getCenterPoint(), dane.obrys, doc.rotation, kratkaPojazdu(doc.parent), 0.15);
    ustawPrzeswietlenie(t, wl);
  }
}

let _klatka = null;
function poRuchuMyszy() {
  if (_klatka) return;
  _klatka = requestAnimationFrame(() => {
    _klatka = null;
    sprawdzKursor();
  });
}

/* -------------------------------------------- */
/*  Podklasa żetonu                              */
/* -------------------------------------------- */

function podklasa(Baza) {
  return class TokenNeuroPojazdy extends Baza {

    /** @override — ukrycie jadącego (lokalne). */
    get isVisible() {
      if (ukrytyJadacy(this)) {
        this.detectionFilter = null;
        return false;
      }
      return super.isVisible;
    }

    /** @override — siatka pojazdu zawsze w obrysie naturalnym. */
    _refreshMeshSizeAndScale() {
      super._refreshMeshSizeAndScale();
      const nat = obrysSiatki(this);
      if (!nat) return;
      const { fit, scaleX, scaleY } = this.document.texture;
      this.mesh.resize(nat.w, nat.h, { fit, scaleX, scaleY });
    }

    /** @override — przygaszenie w prześwietleniu. */
    _refreshMesh() {
      super._refreshMesh();
      if (przeswietlane.has(this.document.id)) this.mesh.alpha *= KRYCIE_PRZESWIETLENIA;
    }

    /** @override — `_refreshState` też ustawia `mesh.alpha` (najechanie, zaznaczenie). */
    _refreshState() {
      super._refreshState();
      if (przeswietlane.has(this.document.id)) this.mesh.alpha *= KRYCIE_PRZESWIETLENIA;
    }

    /** @override */
    _refreshPosition() {
      super._refreshPosition();
      if (this.neuroKropki || jestZetonemPojazdu(this.document)) odswiezKropki(this);
    }

    /** @override */
    _refreshRotation() {
      super._refreshRotation();
      if (this.neuroKropki) odswiezKropki(this);
    }

    /** @override */
    _refreshSize() {
      super._refreshSize();
      if (this.neuroKropki) odswiezKropki(this);
    }

    /** @override — klatka animacji pojazdu prowadzi jadących. */
    _onAnimationUpdate(changed, context) {
      super._onAnimationUpdate(changed, context);
      if (!("x" in changed) && !("y" in changed) && !("rotation" in changed)
        && !("width" in changed) && !("height" in changed)) return;
      if (!jestZetonemPojazdu(this.document)) return;
      prowadzJadacych(this, context.time >= context.duration);
    }

    /** @override — Alt+klik w prześwietlonego jadącego zaznacza pojazd (§4.2). */
    _onClickLeft(event) {
      if (event?.altKey) {
        const pojazd = pojazdJadacego(this.document)?.object;
        if (pojazd?.visible) {
          pojazd.control({ releaseOthers: !event.shiftKey });
          return;
        }
      }
      return super._onClickLeft(event);
    }

    /** @override */
    _destroy(options) {
      przeswietlane.delete(this.document?.id);
      return super._destroy(options);
    }
  };
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

function jestRuchem(changes) {
  return ["x", "y", "rotation", "width", "height", "elevation"].some(k => k in changes);
}

export function registerZetonPojazdu() {
  Hooks.once("setup", () => {
    CONFIG.Token.objectClass = podklasa(CONFIG.Token.objectClass);
  });

  // Pojazd zawsze obraca się w kierunku jazdy (D10 wykrywa skręty z obrotu).
  // Tylko ruch gracza (przeciąganie, klawisze) i nie przestawienie (`displace` — zamiana obrysu,
  // zapis po ruchu): przy nim obrót z kierunku „ruchu” narożnika obróciłby pojazd bez sensu.
  // Tylko na scenie taktycznej: plansza pościgu sama trzyma pojazdy przodem w prawo, znacznik się nie obraca.
  Hooks.on("preMoveToken", (doc, movement) => {
    if (!jestZetonemPojazdu(doc) || !["dragging", "keyboard"].includes(movement.method)) return;
    if (trybSceny(doc.parent) !== "taktyczna") return;
    if (movement.passed.waypoints.every(w => w.action === "displace")) return;
    movement.autoRotate = true;
  });

  // Nowy żeton pojazdu dostaje obrys w skali sceny (§4.14): prototyp niesie obrys dla 1,5 m.
  // Na scenie-znaczniku rozmiar zostaje, jak go dał prototyp albo MG.
  Hooks.on("preCreateToken", (doc) => {
    if (!jestZetonemPojazdu(doc) || !obrysDziala(doc.parent)) return;
    const w = wymiaryZetonu(doc.actor, doc.parent, doc._source.rotation);
    if (w && (!bliskie(w.w, doc._source.width) || !bliskie(w.h, doc._source.height))) {
      doc.updateSource({ width: w.w, height: w.h });
    }
  });

  Hooks.on("updateToken", (doc, changes) => {
    if (jestZetonemPojazdu(doc)) {
      if (jestRuchem(changes) && game.user.isActiveGM) {
        zapiszPoRuchu(doc).catch(err => console.error(`${MODULE_ID} | pojazd: zapis po ruchu`, err));
      }
      return;
    }
    // Zmiana flagi jazdy: odśwież kropki pojazdu i widoczność.
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.jazda`)
      || foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.-=jazda`)) {
      odswiezPojazdySceny(doc.parent);
      doc.object?.renderFlags.set({ refreshVisibility: true, refreshState: true });
    }
  });
  Hooks.on("createToken", doc => { if (jazdaZetonu(doc)) odswiezPojazdySceny(doc.parent); });
  Hooks.on("deleteToken", doc => { if (jazdaZetonu(doc)) odswiezPojazdySceny(doc.parent); });
  // Kropka celowanego jadącego ma czerwony obwód (D14).
  Hooks.on("targetToken", (user, token) => {
    if (user !== game.user) return;
    const pojazd = pojazdJadacego(token.document)?.object;
    if (pojazd) odswiezKropki(pojazd);
  });
  Hooks.on("controlToken", token => {
    if (jazdaZetonu(token.document)) token.renderFlags.set({ refreshVisibility: true });
  });

  Hooks.on("canvasReady", () => {
    przeswietlane.clear();
    for (const t of canvas.tokens.placeables) if (jestZetonemPojazdu(t.document)) odswiezKropki(t);
  });
  document.addEventListener("pointermove", poRuchuMyszy, { passive: true });
}

/** Kropki i widoczność wszystkich pojazdów sceny (po zmianie składu jadących). */
export function odswiezPojazdySceny(scena) {
  if (!canvas.ready || scena !== canvas.scene) return;
  for (const t of canvas.tokens.placeables) {
    if (jestZetonemPojazdu(t.document)) odswiezKropki(t);
  }
}
