/**
 * Neuroshima 5e — oznaczenie Reakcji ręcznych BN-ów (PLAN_tt.md D13, E5).
 *
 * Okno „Reakcje celu” (`combat/obrona.mjs`) przypomina MG o cechach BN-a z Reakcją: z Bestiariusza
 * (sekcja „Reakcje”, flaga paczki) albo z aktywnością typu `reaction`. BN-y zrobione w świecie
 * ręcznie (z Roll20, z sesji) często mają taką cechę jako sam opis, bez żadnej aktywności — dla
 * okna są niewidoczne. Znalezione na żywo 2026-10-03: Pustak „Ofiara”, Wilhelm Yarborough
 * „Zasłona Własnym Ciałem”.
 *
 * Kandydat: cecha (`feat`) BN-a spoza Bestiariusza, **bez aktywności**, której opis albo nazwa
 * mówi o Reakcji. Propozycja: aktywność `utility` z aktywacją „Reakcja” — natywna plakietka na
 * karcie, przypomnienie w oknie. Cech z aktywnościami nie ruszamy: „nie może wykonywać Reakcji”
 * w opisie akcji to nie Reakcja.
 *
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.oznaczReakcjeBN();                    // sucha próba — lista
 *   await api.oznaczReakcjeBN({ commit: true });     // na życzenie MG
 */

const MODULE_ID = "neuroshima-2026-overrides";
const REACTION = /reakcj/i;

/** Aktorzy BN-ów świata i niepowiązanych żetonów. */
function _npcActors() {
  const out = game.actors.filter(a => a.type === "npc");
  for (const scene of game.scenes) {
    for (const t of scene.tokens) if (!t.actorLink && t.actor?.type === "npc") out.push(t.actor);
  }
  return out;
}

/** Czy cecha jest kandydatem do oznaczenia. */
export function isUnmarkedReaction(item) {
  if (item?.type !== "feat") return false;
  if (item.flags?.[MODULE_ID]?.bestiary) return false;
  if ((item.system?.activities?.size ?? 0) > 0) return false;
  const text = `${item.name ?? ""} ${String(item.system?.description?.value ?? "").replace(/<[^>]+>/g, " ")}`;
  return REACTION.test(text);
}

/**
 * @param {object} [o]
 * @param {boolean} [o.commit=false]
 * @returns {Promise<Array<{actor: string, uuid: string, item: string}>>}
 */
export async function oznaczReakcjeBN({ commit = false } = {}) {
  const report = [];
  for (const actor of _npcActors()) {
    for (const item of actor.items) {
      if (!isUnmarkedReaction(item)) continue;
      report.push({ actor: actor.name, uuid: actor.uuid, item: item.name });
      if (!commit) continue;
      await item.createActivity("utility", {
        name: item.name,
        activation: { type: "reaction", value: 1, override: false }
      }, { renderSheet: false });
    }
  }
  console.log(`${MODULE_ID} | Reakcje BN: ${report.length} ${commit ? "oznaczonych" : "do oznaczenia (sucha próba)"}`, report);
  return report;
}

export function registerOznaczReakcjeBN() {
  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.oznaczReakcjeBN = oznaczReakcjeBN;
  });
}
