/**
 * Neuroshima 5e — serie i obszary na planszy pościgu (PLAN_m4_pojazdy §6.2.3–§6.2.4, D28, D29, D31).
 *
 * Na złożonej drodze obraz między pojazdami nie jest geometrią (D31): linia serii narysowana w prawdziwej skali
 * przecięłaby osiem torów, a koło wybuchu może zachodzić na pojazd w sąsiednim rzędzie, który jest znacznik dalej.
 * Dlatego **kto jest trafiony, liczy moduł** — w przestrzeni drogi (`droga.mjs`) — i wypisuje to na karcie MG.
 * Rzuty i obrażenia idą dalej zwykłą drogą kart (przycisk RO serii, karta ładunku), na zaznaczonych żetonach.
 *
 *  - **Serie (D28).** Długa (36 × 1,5 m) i Miażdżąca (150 × 3 m) na planszy się celuje, nie przeciąga:
 *    `dnd5e.preCreateMeasuredTemplate` → `false`, a zamiast przeciągania linii — punkt na planszy z podglądem na
 *    żywo (obwódki na trafionych). Linia biegnie od miejsca strzelca kierunkiem po drodze ku punktowi pod kursorem;
 *    trafia jadących (punkt miejsca w długości i połowie szerokości) i pojazdy (prostokąt w przestrzeni drogi).
 *    Własny pojazd strzelca pominięty — strzela się z niego; bratobójczy ogień to decyzja MG.
 *  - **Obszary (§6.2.3).** Wybuch ładunku: koło albo sześcian wokół punktu trafienia, liczony po drodze.
 *    Ogień zaporowy: kto jest w strefie — „punkt wirtualny” (pozycja drogi żetonu przeniesiona względem środka
 *    strefy) testowany na narysowanym kształcie; strefa położona na pojeździe jest do niego przypięta (D29).
 */

import { pickCanvasPoint } from "./area-picker.mjs";
import { kontekstDrogi, mierzyDroga, naDrodze, odlegloscWspolrzednych } from "./droga.mjs";
import { FLAG_ROLA, FREEFORM_Y } from "./poscig.mjs";
import { danePojazdu, jazdaZetonu, jestZetonemPojazdu, pojazdJadacego } from "../pojazdy/stan.mjs";
import { kierowcaPojazdu } from "../pojazdy/jadacy.mjs";
import { cechyPojazdu } from "../config/vehicles-data.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SERIE = new Set(["neuroDs", "neuroMs"]);
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Czysta geometria w przestrzeni drogi         */
/* -------------------------------------------- */

/**
 * Trafieni pasem linii w przestrzeni drogi (m).
 * @param {{s: number, t: number}} O        początek (miejsce strzelca)
 * @param {{s: number, t: number}} kier     kierunek (dowolna długość)
 * @param {number} dlugosc
 * @param {number} szerokosc
 * @param {{id: string, s?: number, t?: number, prostokat?: {s0: number, s1: number, t0: number, t1: number}}[]} cele
 * @returns {string[]} id trafionych
 */
export function trafieniLinia(O, kier, dlugosc, szerokosc, cele) {
  const n = Math.hypot(kier.s, kier.t);
  if (!(n > 0)) return [];
  const u = { s: kier.s / n, t: kier.t / n };
  const pol = szerokosc / 2;
  const wPasie = (s, t) => {
    const ds = s - O.s, dt = t - O.t;
    const wzdluz = ds * u.s + dt * u.t;
    return wzdluz >= 0 && wzdluz <= dlugosc && Math.abs(ds * u.t - dt * u.s) <= pol;
  };
  const out = [];
  for (const c of cele) {
    if (c.prostokat) {
      // Pas przecina prostokąt pojazdu: próbki co 0,25 m wzdłuż osi linii w prostokącie poszerzonym o pół pasa.
      const r = c.prostokat;
      let trafiony = false;
      for (let x = 0; x <= dlugosc && !trafiony; x += 0.25) {
        const s = O.s + u.s * x, t = O.t + u.t * x;
        trafiony = s >= r.s0 - pol && s <= r.s1 + pol && t >= r.t0 - pol && t <= r.t1 + pol
          && _odlegloscOdProstokata(s, t, r) <= pol;
      }
      if (trafiony) out.push(c.id);
    } else if (wPasie(c.s, c.t)) out.push(c.id);
  }
  return out;
}

function _odlegloscOdProstokata(s, t, r) {
  const ds = Math.max(r.s0 - s, 0, s - r.s1), dt = Math.max(r.t0 - t, 0, t - r.t1);
  return Math.hypot(ds, dt);
}

/** Trafieni obszarem: koło o promieniu `r` albo kwadrat o boku `bok` (osie drogi) wokół `O`. */
export function trafieniObszar(O, { promien = null, bok = null }, cele) {
  const out = [];
  for (const c of cele) {
    const pkt = c.prostokat
      ? { s: Math.min(Math.max(O.s, c.prostokat.s0), c.prostokat.s1), t: Math.min(Math.max(O.t, c.prostokat.t0), c.prostokat.t1) }
      : c;
    const traf = promien !== null ? odlegloscWspolrzednych(O, pkt) <= promien
      : Math.abs(pkt.s - O.s) <= bok / 2 && Math.abs(pkt.t - O.t) <= bok / 2;
    if (traf) out.push(c.id);
  }
  return out;
}

/* -------------------------------------------- */
/*  Cele na planszy                              */
/* -------------------------------------------- */

/**
 * Cele planszy w przestrzeni drogi: jadący (punkt miejsca), pojazdy (prostokąt) i reszta żetonów w pasie (punkt).
 * @param {object} ctx  `kontekstDrogi`
 * @param {{pominPojazd?: string|null, pominZeton?: string|null}} [opts]
 */
export function celePlanszy(ctx, { pominPojazd = null, pominZeton = null } = {}) {
  const { scene, k } = ctx;
  const g = scene.grid.size;
  const out = [];
  for (const t of scene.tokens) {
    if (t.id === pominZeton) continue;
    const s = t._source;
    const c = t.getCenterPoint(s);
    if (c.y >= FREEFORM_Y) continue;
    const j = jazdaZetonu(t);
    if (j) {
      if (j.pojazd === pominPojazd) continue;
      const P = naDrodze(ctx, c);
      out.push({ id: t.id, s: P.s, t: P.t, doc: t, rodzaj: "jadacy" });
      continue;
    }
    if (t.id === pominPojazd) continue;
    const pojazd = jestZetonemPojazdu(t) || t.actor?.type === "vehicle" || !!t.getFlag(MODULE_ID, FLAG_ROLA);
    const P = naDrodze(ctx, c);
    if (pojazd) {
      const w = s.width * g / 2 / k, h = s.height * g / 2 / k;
      out.push({ id: t.id, prostokat: { s0: P.s - w, s1: P.s + w, t0: P.t - h, t1: P.t + h }, s: P.s, t: P.t, doc: t, rodzaj: "pojazd" });
    } else out.push({ id: t.id, s: P.s, t: P.t, doc: t, rodzaj: "inny" });
  }
  return out;
}

/* -------------------------------------------- */
/*  Karta trafionych                             */
/* -------------------------------------------- */

async function kartaTrafionych({ tytul, linia, cele, trafieni, zrodlo = null }) {
  const traf = cele.filter(c => trafieni.includes(c.id));
  const ludzie = traf.filter(c => c.rodzaj !== "pojazd"), pojazdy = traf.filter(c => c.rodzaj === "pojazd");
  const nazwy = l => l.map(c => esc(c.doc.name)).join(", ");
  const linie = [linia,
    ludzie.length ? `Trafieni: <strong>${nazwy(ludzie)}</strong>.` : "Nikt poza pojazdami.",
    pojazdy.length ? `Pojazdy na linii: <strong>${nazwy(pojazdy)}</strong> — RO ZRC pojazdu jak istoty, potem Próg obrażeń (D36).` : "Żaden pojazd."];
  const uuidy = l => l.map(c => c.doc.uuid).join(",");
  const przyciski = [];
  if (ludzie.length) przyciski.push({ akcja: "poscig.zaznacz", label: "Zaznacz trafionych", ikona: "fa-solid fa-user-check", gm: true, dane: { uuidy: uuidy(ludzie) } });
  if (pojazdy.length) przyciski.push({ akcja: "poscig.zaznacz", label: "Zaznacz pojazdy", ikona: "fa-solid fa-truck", gm: true, dane: { uuidy: uuidy(pojazdy) } });
  // D36: pojazd rzuca RO ZRC jak istota (zaznaczony — przycisk RO karty ataku); Slalom to Reakcja jego kierowcy.
  for (const p of pojazdy) {
    if (!cechyPojazdu(danePojazdu(p.doc.actor)?.podwozie).some(c => c.id === "slalom") || !kierowcaPojazdu(p.doc)) continue;
    przyciski.push({ akcja: "poscig.paleta", label: `Slalom: ${p.doc.name}`, ikona: "fa-solid fa-route", gm: true, dane: { pojazd: p.doc.uuid, id: "slalom" } });
  }
  return wyslijKarte(kartaPostoju({ ikona: zrodlo?.img ?? "icons/svg/explosion.svg", tytul, rodzaj: "test", linie,
    ostrzezenia: ["Obraz między pojazdami nie jest geometrią (D31) — obowiązuje ta lista."], przyciski }),
    { actor: zrodlo, szept: "gm" });
}

/* -------------------------------------------- */
/*  Serie — tryb celowania                       */
/* -------------------------------------------- */

function _zetonStrzelca(actor, scene) {
  const t = actor?.token?.parent === scene ? actor.token : null;
  return t ?? actor?.getActiveTokens?.(false, true)?.find(d => d.parent === scene) ?? null;
}

/**
 * Celowanie serią na planszy: punkt z podglądem, trafieni liczeni po drodze, karta MG.
 * @returns {Promise<string[]|null>}  id trafionych albo `null` (rezygnacja)
 */
export async function celujSeria(activity) {
  const scene = canvas.scene;
  const strzelec = _zetonStrzelca(activity.actor, scene);
  if (!strzelec) { ui.notifications.warn("Strzelec nie stoi na tej planszy."); return null; }
  const tpl = activity.target?.template ?? {};
  const dlugosc = Number(tpl.size) || 36, szerokosc = Number(tpl.width) || 1.5;
  const wlasny = pojazdJadacego(strzelec)?.id ?? null;
  const zrodloPx = strzelec.getCenterPoint(strzelec._source);
  const ocen = pt => {
    const ctx = kontekstDrogi(scene);
    const O = naDrodze(ctx, zrodloPx), A = naDrodze(ctx, pt);
    const cele = celePlanszy(ctx, { pominPojazd: wlasny, pominZeton: strzelec.id });
    return { cele, trafieni: trafieniLinia(O, { s: A.s - O.s, t: A.t - O.t }, dlugosc, szerokosc, cele) };
  };
  const punkt = await pickCanvasPoint({
    hint: `${activity.name}: wskaż kierunek serii na drodze — trafieni podświetlą się`,
    origin: zrodloPx,
    onPreview: (gfx, pt) => {
      const { cele, trafieni } = ocen(pt);
      const g = scene.grid.size;
      for (const c of cele.filter(x => trafieni.includes(x.id))) {
        const s = c.doc._source, w = s.width * g, h = s.height * g;
        gfx.lineStyle(4, 0xff3b30, 0.95);
        if (c.rodzaj === "pojazd") gfx.drawRoundedRect(s.x - 4, s.y - 4, w + 8, h + 8, 10);
        else gfx.drawCircle(s.x + w / 2, s.y + h / 2, Math.max(w, h) / 2 + 6);
      }
      const n = trafieni.length;
      return `${dlugosc} m × ${szerokosc} m — trafieni: ${n}`;
    }
  });
  if (!punkt) return null;
  const { cele, trafieni } = ocen(punkt);
  await kartaTrafionych({ tytul: `${activity.name} — trafieni na drodze`, cele, trafieni, zrodlo: activity.actor,
    linia: `${esc(strzelec.name)}: linia ${dlugosc} × ${szerokosc} m po drodze${wlasny ? ", własny pojazd pominięty" : ""}.` });
  return trafieni;
}

/* -------------------------------------------- */
/*  Obszary                                      */
/* -------------------------------------------- */

/** Wybuch ładunku na planszy: kto jest w kole / sześcianie wokół punktu, po drodze — karta MG. */
export async function zglosWybuch(scene, { x, y, area, itemName = "Ładunek", actor = null }) {
  if (!mierzyDroga(scene) || !game.user.isGM) return null;
  const ctx = kontekstDrogi(scene);
  const O = naDrodze(ctx, { x, y });
  const cele = celePlanszy(ctx);
  const ksztalt = area?.kind === "cube" ? { bok: Number(area.side) || 3 } : { promien: Number(area?.radius) || 1.5 };
  const trafieni = trafieniObszar(O, ksztalt, cele);
  await kartaTrafionych({ tytul: `${itemName} — w obszarze na drodze`, cele, trafieni, zrodlo: actor,
    linia: `${area?.label ?? "Obszar"} liczony po drodze${O.wyspa ? ` (punkt na: ${esc(O.wyspa.name)})` : ""}.` });
  return trafieni;
}

/**
 * Czy żeton jest w Regionie (strefa ognia zaporowego, szablon) wg drogi: punkt wirtualny = środek Regionu na obrazie
 * + (pozycja drogi żetonu − pozycja drogi środka) × px/m, test na narysowanym kształcie. W tej samej wyspie punkt
 * wirtualny to prawdziwy punkt — rysunek jest tam dokładny.
 */
export function regionZawieraNaDrodze(region, tokenDocument) {
  const scene = tokenDocument.parent;
  const b = region.bounds ?? region.object?.bounds;
  if (!b) return false;
  const ctx = kontekstDrogi(scene);
  const srodek = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const O = naDrodze(ctx, srodek);
  const P = naDrodze(ctx, tokenDocument.getCenterPoint(tokenDocument._source));
  const v = { x: srodek.x + (P.s - O.s) * ctx.k, y: srodek.y + (P.t - O.t) * ctx.k, elevation: tokenDocument.elevation ?? 0 };
  try { return region.testPoint(v); } catch { return false; }
}

/** D29: strefa ognia zaporowego położona na pojeździe jedzie z nim (Region przypięty do żetonu, rdzeń 14). */
export function przypnijStrefe(activity, regionData) {
  if (activity?.type !== "neuroOz" || !mierzyDroga(canvas.scene)) return;
  const ctx = kontekstDrogi(canvas.scene);
  for (const data of regionData ?? []) {
    const sh = data.shapes?.[0];
    if (!sh) continue;
    const p = Number.isFinite(sh.radius) || sh.type === "circle" || sh.type === "cone" ? { x: sh.x, y: sh.y }
      : { x: (sh.x ?? 0) + (sh.width ?? 0) / 2, y: (sh.y ?? 0) + (sh.height ?? 0) / 2 };
    const wyspa = naDrodze(ctx, p).wyspa;
    if (wyspa) foundry.utils.setProperty(data, "attachment.token", wyspa.id);
  }
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerPoscigSerie() {
  Hooks.on("dnd5e.preCreateMeasuredTemplate", (activity) => {
    if (!SERIE.has(activity?.type) || !mierzyDroga(canvas.scene)) return;
    celujSeria(activity).catch(err => console.error(`${MODULE_ID} | seria na planszy`, err));
    return false;
  });
  Hooks.on("dnd5e.createMeasuredTemplate", przypnijStrefe);
  zarejestrujAkcje("poscig.zaznacz", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const docs = String(btn.dataset.uuidy ?? "").split(",").filter(Boolean).map(u => fromUuidSync(u)).filter(Boolean);
    canvas.tokens.releaseAll();
    for (const d of docs) d.object?.control({ releaseOthers: false });
    ui.notifications.info(`Zaznaczono: ${docs.map(d => d.name).join(", ")} — teraz przycisk RO na karcie ataku.`);
  });
}

export const poscigSerieApi = { trafieniLinia, trafieniObszar, celePlanszy, celujSeria, zglosWybuch, regionZawieraNaDrodze, przypnijStrefe };
