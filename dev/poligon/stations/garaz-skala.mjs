/**
 * S0 (PLAN_m4_pojazdy D42): skala grafiki istot — warianty obok siebie, do wyboru mnożnika f przez MG.
 *
 * Każda kolumna to jeden wariant `{f, v}`: istoty rysowane ×f, pojazdy ×v. **Tylko podgląd** — f udaje skala tekstury
 * żetonów tej sceny (to dokładnie to, co mnożnik świata zrobi z siatką), v — obrys aktorów-kopii tej sceny. Ustawienie
 * świata „Skala grafiki istot” zostaje 1 i nie bierze udziału; jadący rysują się w rozmiarze sprzed wsiadania (S1), więc
 * na siodle i w prześwietlonej kabinie widać ten sam f co obok pojazdu. Kampanii nic tu nie dotyka.
 *
 * Tło z mapy kampanii (auta narysowane na mapie) to kafelek wybierany przez MG narzędziem — repozytorium jest
 * publiczne, nazw map w nim nie ma.
 */
import { MOD } from "./_wspolne.mjs";
import { Kit } from "../lib/kit.mjs";
import { station } from "./index.mjs";
import { ustawGrafikePojazdu } from "./garaz-grafika.mjs";
import { KATALOG_POJAZDOW } from "../../modules/neuroshima-2026-overrides/scripts/config/vehicles-data.mjs";

export const PODGLAD_SKALI = { key: "skala-istot-s0", scene: "Garaż · Skala istot (S0) — warianty f" };
const PREFIKS = "skala-s0-";
const SZER = 7;

/** Domyślne warianty: f jak w D42 i dwa podglądy powiększonych pojazdów. */
export const WARIANTY_DOMYSLNE = [{ f: 1 }, { f: 0.8 }, { f: 0.7 }, { f: 0.6 }, { f: 0.8, v: 1.1 }, { f: 1, v: 1.2 }];

const liczba = n => String(Math.round(n * 100) / 100).replace(".", ",");

/** „1, 0.8, 0.7, 0.8x1.1” → warianty (x — mnożnik pojazdów). Czysta. */
export function parsujWarianty(tekst) {
  return String(tekst ?? "").split(/[;\s]+|,(?=\s)/).map(s => s.trim()).filter(Boolean).map(s => {
    const [f, v] = s.replace(/,/g, ".").split(/[x×*]/i).map(Number);
    return { f: Number.isFinite(f) && f > 0 ? f : 1, ...(Number.isFinite(v) && v > 0 && v !== 1 ? { v } : {}) };
  }).slice(0, 8);
}

const etykieta = w => `f = ${liczba(w.f)}${w.v ? ` · pojazdy ×${liczba(w.v)}` : ""}`;

async function czlowiek(k, key, name, { source = "Commoner", ring = false } = {}) {
  return k.fromPack(key, "dnd5e.monsters", source, { name,
    data: { prototypeToken: { name, actorLink: true, displayName: 0, displayBars: 0, sight: { enabled: false },
      ring: { enabled: ring } } } });
}

/** Token z grafiką ×f (skala tekstury prototypu razy f). */
async function zeton(k, scene, actor, x, y, f, extra = {}) {
  if (!actor) return null;
  const t = actor.prototypeToken.texture;
  const [doc] = await k.tokens(scene, [[actor, x, y, { displayName: 0, ...extra,
    texture: { scaleX: (t.scaleX || 1) * f, scaleY: (t.scaleY || 1) * f } }]]);
  return doc;
}

async function pojazd(k, id, nazwa, packName, w, v) {
  const a = await k.fromPack(`${PREFIKS}${id}-${w}`, "pojazdy", packName ?? nazwa,
    { name: `${nazwa} · ${etykieta(v)}`, data: { prototypeToken: { actorLink: true, displayName: 0 } } });
  if (!a || !await ustawGrafikePojazdu(k, a, id)) return null;
  const o = KATALOG_POJAZDOW[id].obrys, s = v.v ?? 1;
  await a.update({ [`flags.${MOD}.pojazd.obrys`]: { w: o.w * s, h: o.h * s },
    "prototypeToken.width": o.w * s, "prototypeToken.height": o.h * s });
  return a;
}

/** Scena porównania. `warianty` — kolumny; domyślnie `WARIANTY_DOMYSLNE`. */
export async function zbudujPodgladSkali(k, warianty = WARIANTY_DOMYSLNE) {
  const P = game.neuroshima.pojazdy;
  const existing = game.scenes.find(s => s.flags[MOD]?.testScene?.id === k.tag && s.flags[MOD].testScene.key === PODGLAD_SKALI.key);
  if (existing) {
    k.scenes[PODGLAD_SKALI.key] = existing;
    return { scene: existing.id, reused: true };
  }
  const w = Math.max(4, SZER * warianty.length + 2), h = 15;
  const scene = await k.scene(PODGLAD_SKALI.key, { name: PODGLAD_SKALI.scene, w, h, color: "#4f4a3f", vision: false,
    grid: { alpha: 0.12 }, flags: { [MOD]: { skalaIstotS0: warianty } } });
  const labels = [
    [1, 0.3, "SKALA ISTOT · S0 (D42) — warianty obok siebie", { size: 30, w: w - 2 }],
    [1, 1.05, "Istoty ×f, pojazdy ×v — tylko podgląd tej sceny (skala tekstury, obrys kopii); ustawienie świata zostaje 1. "
      + "Najedź na Osobówkę: jadący w kabinie. Tło z mapy kampanii i inne warianty — narzędzia Garażu „Skala istot”.", { size: 17, w: w - 2 }]
  ];
  const ludzie = [["Commoner", "Cywil · bez pierścienia", false], ["Commoner", "Cywil · pierścień dnd5e", true], ["Guard", "Strażnik", false]];
  const noe = [["gangus-kapo", "Gangus Kapo (NOE)"], ["kanibal", "Kanibal (NOE)"]];
  let n = 0;
  for (const [i, v] of warianty.entries()) {
    const x0 = 1 + i * SZER, f = v.f;
    labels.push([x0, 2.3, etykieta(v), { size: 26, w: SZER - 0.5 }]);
    // Pojazdy z jadącymi: kabina zakryta (prześwietlenie), dwa otwarte siodła, deska.
    const zaloga = async (id, nazwa, packName, x, y, ile) => {
      const a = await pojazd(k, id, nazwa, packName, i, v);
      if (!a) return;
      const [t] = await k.tokens(scene, [[a, x - a.prototypeToken.width / 2, y - a.prototypeToken.height / 2, { displayName: 0 }]]);
      const miejsca = P.miejscaPojazdu(a);
      for (let m = 0; m < Math.min(ile, miejsca.length); m++) {
        const czl = await czlowiek(k, `${PREFIKS}jadacy-${i}-${id}-${m}`, `${nazwa} ${m + 1}`, { source: m % 2 ? "Guard" : "Commoner" });
        const r = await zeton(k, scene, czl, x0 + 0.2 + (n++ % 6), 13, f);
        if (r) await P.posadz(t, r, miejsca[m].id);
      }
    };
    await zaloga("osobowka", "Osobówka", null, x0 + 1.3, 5.6, 2);
    await zaloga("motocykl", "Motocykl", null, x0 + 3.6, 5, 2);
    await zaloga("deskorolka", "Deskorolka", null, x0 + 5.3, 4.8, 1);
    // Te same istoty poza pojazdem.
    for (const [j, [src, name, ring]] of ludzie.entries()) {
      const a = await czlowiek(k, `${PREFIKS}czlowiek-${i}-${j}`, name, { source: src, ring });
      await zeton(k, scene, a, x0 + j * 1.6, 8.2, f);
      labels.push([x0 + j * 1.6 - 0.1, 9.25, name, { size: 12, w: 1.6 }]);
    }
    for (const [j, [id, name]] of noe.entries()) {
      const a = await k.fromPack(`${PREFIKS}noe-${i}-${id}`, "bestiariusz", id, { name, data: { prototypeToken: { displayName: 0, actorLink: true } } });
      await zeton(k, scene, a, x0 + j * 1.6, 10.2, f);
      labels.push([x0 + j * 1.6 - 0.1, 11.25, name, { size: 12, w: 1.6 }]);
    }
    const kon = await k.fromPack(`${PREFIKS}kon-${i}`, "bestiariusz", "kon-zdrowy", { name: "Koń (zdrowy)", data: { prototypeToken: { displayName: 0, actorLink: true } } });
    await zeton(k, scene, kon, x0 + 4.4, 9.6, f);
    labels.push([x0 + 4.4, 11.65, "Koń zdrowy (atrapa)", { size: 12, w: 2 }]);
  }
  await k.labels(scene, labels);
  await scene.update({ initial: { x: w * 50, y: 700, scale: 0.55 } });
  return { scene: scene.id, warianty: warianty.length };
}

/** Kafelek tła: obraz mapy w skali sceny (mapy kampanii — 64 px na 1,5 m), odblokowany, pod żetonami. */
async function tloMapy() {
  const scene = game.scenes.find(s => s.flags[MOD]?.testScene?.key === PODGLAD_SKALI.key);
  if (!scene) return ui.notifications.warn("Najpierw zbuduj podgląd skali (Reset Garażu albo „Skala istot: zbuduj warianty”).");
  const FP = foundry.applications.apps.FilePicker.implementation;
  const src = await new Promise(res => new FP({ type: "image", callback: res }).render(true));
  if (!src) return;
  const px = await foundry.applications.api.DialogV2.prompt({ window: { title: "Skala mapy" },
    content: `<label>Pikseli na 1,5 m na tej mapie <input type="number" name="px" value="64" min="16" max="400"></label>`,
    ok: { callback: (_e, b) => Number(b.form.elements.px.value) || 64 } }).catch(() => null);
  if (!px) return;
  const tex = await foundry.canvas.loadTexture(src);
  if (!tex) return ui.notifications.error(`Nie wczytano ${src}`);
  const s = scene.grid.size / px;
  const stare = scene.tiles.filter(t => t.flags[MOD]?.skalaIstotTlo).map(t => t.id);
  if (stare.length) await scene.deleteEmbeddedDocuments("Tile", stare);
  // v14: x/y kafelka to jego środek — lewy górny róg obrazu w rogu sceny.
  const w = Math.round(tex.width * s), h = Math.round(tex.height * s);
  await scene.createEmbeddedDocuments("Tile", [{ x: Math.round(w / 2), y: Math.round(h / 2), width: w, height: h,
    texture: { src }, sort: -1000, locked: false, flags: { [MOD]: { skalaIstotTlo: true } } }]);
  ui.notifications.info("Tło dodane — przeciągnij kafelek, żeby pod kolumnami leżała ulica z narysowanymi autami.");
}

/** Przebudowa samej sceny S0 z wariantami podanymi przez MG (reszta Garażu zostaje). */
async function przebuduj() {
  const scene = game.scenes.find(s => s.flags[MOD]?.testScene?.key === PODGLAD_SKALI.key);
  const teraz = scene?.flags[MOD]?.skalaIstotS0 ?? WARIANTY_DOMYSLNE;
  const tekst = await foundry.applications.api.DialogV2.prompt({ window: { title: "Skala istot — warianty" },
    content: `<p>Kolumny oddzielone spacją: f albo f×v (v — mnożnik pojazdów), np. <code>1 0,75 0,65 0,7x1,1</code>.</p>
      <input type="text" name="w" value="${teraz.map(w => `${liczba(w.f)}${w.v ? `x${liczba(w.v)}` : ""}`).join(" ")}" style="width:100%">`,
    ok: { callback: (_e, b) => b.form.elements.w.value } }).catch(() => null);
  if (!tekst) return;
  const warianty = parsujWarianty(tekst);
  if (!warianty.length) return;
  const tlo = scene?.tiles.find(t => t.flags[MOD]?.skalaIstotTlo)?.toObject();
  const doUsuniecia = game.actors.filter(a => String(a.flags[MOD]?.testScene?.key ?? "").startsWith(PREFIKS)).map(a => a.id);
  if (scene) await scene.delete();
  if (doUsuniecia.length) await Actor.implementation.deleteDocuments(doUsuniecia);
  const k = new Kit(station("garaz"));
  const wynik = await zbudujPodgladSkali(k, warianty);
  const nowa = game.scenes.get(wynik.scene);
  if (tlo && nowa) await nowa.createEmbeddedDocuments("Tile", [{ ...tlo, _id: undefined }]);
  await nowa?.activate();
}

export const narzedziaSkali = [
  { label: "Skala istot (S0)", icon: "fa-solid fa-up-right-and-down-left-from-center", run: () => game.poligon.stations.view("garaz", PODGLAD_SKALI.key) },
  { label: "Skala istot: zbuduj warianty", icon: "fa-solid fa-sliders", run: przebuduj },
  { label: "Skala istot: tło mapy", icon: "fa-solid fa-map", run: tloMapy }
];
