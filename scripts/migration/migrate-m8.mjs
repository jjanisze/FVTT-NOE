/**
 * Neuroshima 5e — migracja świata po M8 (PLAN_m8_ruch_i_ekonomia_akcji §13.4 E9: „jedna procedura dla wszystkich
 * światów”). Na sucho — raport; z `commit` — zapis. Uruchamiać **po** przebudowie paczek (resync porównuje z paczką).
 *
 *   await game.neuroshima.migracje.m8();                 // raport
 *   await game.neuroshima.migracje.m8({ commit: true });  // zapis
 *
 * Kroki:
 *   1. **Zdolności, Sztuczki, Pochodzenia** — `resync` M7 (`resync-class-features.mjs`): plakietki pokrycia (Zryw,
 *      Szybkie ręce, Szybkie nogi, Grad ołowiu, Nożownik, Pakowanie, Siekierezada, Samuraj, Grenadier, Sportowiec…),
 *      efekty z danych (Człowiek-pająk — Alpinista z warunkiem i Po dwa naraz, Włóczykij, Sportowiec), aktywności, flagi.
 *   2. **Stare znaczniki R/B** (M7, bez znacznika M8) na aktorach, którzy nie walczą w rozpoczętej walce — stan tury,
 *      który przeżył walkę. W walce znaczniki prowadzi projekcja ledgera.
 *   3. **`lastBurstUse` na broniach** — historia serii jest od E6 na aktorze; stara flaga przedmiotu niczego nie znaczy.
 *   4. **Regiony `skok`** — pole `dcFall` z importu Tiled (dawne ST, bez oparcia w RAW; schemat go już nie zna).
 *   5. **Makra skrótów M8** bez `userId` (sprzed szablonów paska) — właściciel z autora makra.
 *
 * Opis krótkiej serii w aktywnościach broni (`chatFlavor`) odświeża się sam przy starcie świata
 * (`weapons/fire-modes.mjs`, `syncAllWeaponFireModes`). Ledger trwającej walki na fladze kombatanta czyta się dalej
 * (`combat/ekonomia.mjs`, nowsza kopia po `rev`) — bez migracji.
 */

import { resyncClassFeatures } from "./resync-class-features.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_ZNACZNIK = "akcjaZuzyta";
const TYP_SKOKU = `${MODULE_ID}.skok`;
const _del = foundry.data.operators.ForcedDeletion.create();

/** Aktorzy świata i aktorzy tokenów niepowiązanych (delty) na scenach. */
function _aktorzy() {
  const out = new Map();
  for (const a of game.actors) out.set(a.uuid, a);
  for (const s of game.scenes) for (const t of s.tokens) if (!t.actorLink && t.actor) out.set(t.actor.uuid, t.actor);
  return [...out.values()];
}

/** Aktorzy walczący w rozpoczętej walce (ich znaczniki są stanem bieżącej tury). */
function _walczacy() {
  const ids = new Set();
  for (const c of game.combats.filter(x => x.started)) for (const k of c.combatants) if (k.actor) ids.add(k.actor.uuid);
  return ids;
}

/**
 * @param {{commit?: boolean, aktorzy?: string[]|null, sceny?: string[]|null, makra?: string[]|null}} [o]
 *   zakres (id, testy): bez — cały świat
 * @returns {Promise<{zdolnosci: object[], znaczniki: object[], serie: object[], regiony: object[], makra: object[]}>}
 */
export async function migrateM8({ commit = false, aktorzy = null, sceny = null, makra = null } = {}) {
  if (commit && !game.user.isGM) {
    ui.notifications?.warn("Migracja M8: zapisuje tylko MG.");
    return null;
  }
  const raport = { zdolnosci: [], znaczniki: [], serie: [], regiony: [], makra: [] };

  // 1. Zdolności — resync M7 (ma własny zapis z `commit`).
  const wAktorach = a => !aktorzy || aktorzy.includes(a.id) || aktorzy.includes(a.uuid);
  raport.zdolnosci = await resyncClassFeatures({ commit, ...(aktorzy ? { actors: aktorzy } : {}) });

  // 2. Stare znaczniki R/B poza rozpoczętą walką.
  const walczacy = _walczacy();
  for (const a of _aktorzy().filter(wAktorach)) {
    if (walczacy.has(a.uuid)) continue;
    const ids = a.effects.filter(e => e.getFlag(MODULE_ID, FLAG_ZNACZNIK)).map(e => e.id);
    if (!ids.length) continue;
    raport.znaczniki.push({ aktor: a.name, ile: ids.length });
    if (commit) await a.deleteEmbeddedDocuments("ActiveEffect", ids);
  }

  // 3. `lastBurstUse` na broniach (świat i karty).
  const bronie = [...(aktorzy ? [] : game.items), ..._aktorzy().filter(wAktorach).flatMap(a => [...a.items])]
    .filter(i => i.getFlag(MODULE_ID, "lastBurstUse") != null);
  for (const i of bronie) {
    raport.serie.push({ przedmiot: i.name, aktor: i.actor?.name ?? null });
    if (commit) await i.update({ [`flags.${MODULE_ID}.lastBurstUse`]: _del });
  }

  // 4. Regiony `skok` z dawnym `dcFall`.
  for (const s of game.scenes) {
    if (sceny && !sceny.includes(s.id)) continue;
    for (const r of s.regions) {
      for (const b of r.behaviors) {
        if (b.type !== TYP_SKOKU || !("dcFall" in (b._source.system ?? {}))) continue;
        raport.regiony.push({ scena: s.name, region: r.name });
        if (commit) await b.update({ "system.dcFall": _del });
      }
    }
  }

  // 5. Makra skrótów bez właściciela w fladze.
  for (const m of game.macros) {
    if (makra && !makra.includes(m.id)) continue;
    if (!m.getFlag(MODULE_ID, "skrotM8") || m.getFlag(MODULE_ID, "userId")) continue;
    const userId = m.author?.id ?? m._source.author ?? null;
    if (!userId) continue;
    raport.makra.push({ makro: m.name, uzytkownik: game.users.get(userId)?.name ?? userId });
    if (commit) await m.setFlag(MODULE_ID, "userId", userId);
  }

  const podsumowanie = Object.fromEntries(Object.entries(raport).map(([k, v]) => [k, v.length]));
  console.log(`${MODULE_ID} | Migracja M8 ${commit ? "(zapis)" : "(na sucho)"}`, podsumowanie, raport);
  return raport;
}
