/**
 * Neuroshima 5e — pojazdy świata na model M4 (PLAN_m4_pojazdy E1, §4.13).
 *
 * Przed M4 pojazd świata to aktor typu `vehicle` z płaską flagą `podwozie` (GMT400 i Hammer Posterunku
 * dostały ją ręcznie, 2026-09) i kwadratowym żetonem z portretem z Roll20. M4 rozpoznaje prawdziwy pojazd
 * po fladze `pojazd.podwozie` — bez niej typ `vehicle` jest pojemnikiem (Stos, Miejsce) i każdy hak go
 * pomija. Ta migracja:
 *
 *  - nadaje `pojazd = {podwozie, id, …nadpisania}` aktorom z płaską flagą `podwozie` albo nazwą równą
 *    nazwie podwozia z tabeli s. 262 (stara flaga zostaje — nikt jej nie czyta, a cofnięcie jest prostsze),
 *  - `id` to identyfikator kluczyków (§4.5) — nadawany raz, nowy dla każdego aktora,
 *  - obrys żetonu: prototyp i każdy żeton na scenach (wg obrotu — §4.3), środek bez zmian,
 *  - grafika: okrągły kadr z Roll20 (ścieżka świata) → grafika podwozia z modułu (albo atrapa); stary
 *    `texture` zostaje we fladze `pojazd.zetonPrzed`, więc MG wraca do niego jednym poleceniem.
 *
 * Sztuka różna od podwozia (GMT400 to Suburban na podwoziu Hammera: dłuższy, trzy rzędy) dostaje
 * nadpisanie obrysu i miejsc z `NADPISANIA`.
 *
 * Biegnie sama raz (aktywny MG, `ready`, ustawienie `pojazdyMigracja`). Ręcznie:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migratePojazdy();                  // sucha próba
 *   await api.migratePojazdy({ commit: true });
 *   await api.przywrocZetonyPojazdow();          // stara grafika żetonów (z flagi), obrys zostaje
 */

import { PODWOZIA, KATALOG_POJAZDOW } from "../config/vehicles-data.mjs";
import { obrysPrzyObrocie } from "../pojazdy/geometria.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ZROBIONE = "pojazdyMigracja";

/** Sztuki świata, które różnią się od podwozia (nazwa aktora → nadpisania flagi `pojazd`). */
const NADPISANIA = {
  GMT400: {
    obrys: { w: 1.5, h: 3.5 },
    strefy: [{ id: "kabina", nazwa: "Kabina", od: 0.26, do: 0.8, rzedy: [2, 3, 3] }]
  }
};

const slug = id => id.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

/** Grafika żetonu podwozia z modułu: docelowa albo atrapa. */
async function grafikaPodwozia(podwozie) {
  const s = slug(podwozie);
  for (const rel of [`tokens/pojazdy/${s}.webp`, `tokens/pojazdy/_placeholder/${s}.webp`]) {
    const src = `modules/${MODULE_ID}/${rel}`;
    try {
      const r = await fetch(src, { method: "HEAD" });
      if (r.ok) return src;
    } catch { /* następna */ }
  }
  return null;
}

/** Podwozie aktora świata przed M4 (płaska flaga albo nazwa z tabeli). */
function podwozieSprzed(actor) {
  if (actor.type !== "vehicle" || actor.flags?.[MODULE_ID]?.pojazd?.podwozie) return null;
  const plaska = actor.flags?.[MODULE_ID]?.podwozie;
  if (plaska && KATALOG_POJAZDOW[plaska]) return plaska;
  return Object.values(PODWOZIA).find(p => p.nazwa === actor.name)?.id ?? null;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @returns {Promise<object[]>} wiersze raportu
 */
export async function migratePojazdy({ commit = false } = {}) {
  const report = [];
  for (const actor of game.actors) {
    const podwozie = podwozieSprzed(actor);
    if (!podwozie) continue;
    const nadpisania = NADPISANIA[actor.name] ?? {};
    const obrys = nadpisania.obrys ?? KATALOG_POJAZDOW[podwozie].obrys;
    const tex = actor.prototypeToken.texture;
    const zRoll20 = !String(tex.src ?? "").startsWith(`modules/${MODULE_ID}/`);
    const nowaGrafika = zRoll20 ? await grafikaPodwozia(podwozie) : null;
    const pojazd = {
      podwozie, id: foundry.utils.randomID(), ...nadpisania,
      ...(nowaGrafika ? { zetonPrzed: { src: tex.src, scaleX: tex.scaleX, scaleY: tex.scaleY } } : {})
    };
    const zmiany = {
      [`flags.${MODULE_ID}.pojazd`]: pojazd,
      "prototypeToken.width": obrys.w, "prototypeToken.height": obrys.h, "prototypeToken.lockRotation": false,
      ...(nowaGrafika ? { "prototypeToken.texture.src": nowaGrafika, "prototypeToken.texture.scaleX": 1,
        "prototypeToken.texture.scaleY": 1, "prototypeToken.texture.fit": "contain" } : {})
    };
    const zetony = game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorId === actor.id));
    report.push({
      aktor: actor.name, podwozie, obrys: `${obrys.w}×${obrys.h}`, grafika: nowaGrafika ? "podwozia (stara we fladze)" : "bez zmian",
      zetony: zetony.length, status: commit ? "zapisane" : "do zapisania"
    });
    if (!commit) continue;
    try {
      await actor.update(zmiany);
      for (const t of zetony) {
        const o = obrysPrzyObrocie(obrys, t.rotation);
        await t.parent.moveTokens({
          [t.id]: { dimensions: { width: o.w, height: o.h, action: "displace", lockRotation: false,
            ...(nowaGrafika && t.texture.src === tex.src ? { texture: { src: nowaGrafika, scaleX: 1, scaleY: 1, fit: "contain" } } : {}) } }
        }, { animate: false, showRuler: false, method: "api" });
      }
    } catch (err) {
      console.error(`${MODULE_ID} | pojazdy: ${actor.name}`, err);
      report.at(-1).status = "BŁĄD — patrz konsola";
    }
  }
  console.table(report);
  console.log(`${MODULE_ID} | Pojazdy M4: ${commit ? `zapisano ${report.length}` : `${report.length} do zapisania (sucha próba)`}`);
  return report;
}

/** Przywraca żetonom pojazdów grafikę sprzed migracji (flaga `pojazd.zetonPrzed`). Obrys zostaje. */
export async function przywrocZetonyPojazdow() {
  for (const actor of game.actors) {
    const przed = actor.flags?.[MODULE_ID]?.pojazd?.zetonPrzed;
    if (!przed) continue;
    const obecny = actor.prototypeToken.texture.src;
    await actor.update({ "prototypeToken.texture": przed });
    for (const s of game.scenes) {
      const ids = s.tokens.filter(t => t.actorId === actor.id && t.texture.src === obecny).map(t => t.id);
      if (ids.length) await s.updateEmbeddedDocuments("Token", ids.map(_id => ({ _id, texture: przed })));
    }
  }
}

export function registerPojazdyMigration() {
  game.settings.register(MODULE_ID, ZROBIONE, { scope: "world", config: false, type: Boolean, default: false });
  Hooks.once("ready", async () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api ??= {};
      mod.api.migration ??= {};
      mod.api.migration.migratePojazdy = migratePojazdy;
      mod.api.migration.przywrocZetonyPojazdow = przywrocZetonyPojazdow;
    }
    if (!game.users.activeGM?.isSelf || game.settings.get(MODULE_ID, ZROBIONE)) return;
    await migratePojazdy({ commit: true });
    await game.settings.set(MODULE_ID, ZROBIONE, true);
  });
}
