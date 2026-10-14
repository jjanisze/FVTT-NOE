/**
 * Helpers shared by station builders. Station files: `export default { id, name, prio, opis, gracze,
 * build(kit), proby[], narzedzia[], klucz[] }` — see stations/index.mjs.
 */

export const MOD = "neuroshima-2026-overrides";

/** A training dummy: high PW, flat TT, no AI, no drops — what you shoot at to see the shot. */
export function manekin(k, key, { name = "Manekin", hp = 400, tt = 10 } = {}) {
  return k.actor(key, {
    name, type: "npc", img: "icons/svg/target.svg",
    system: { attributes: { hp: { value: hp, max: hp }, ac: { flat: tt, calc: "flat" } } },
    prototypeToken: { name, actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, texture: { src: "icons/svg/target.svg" } }
  });
}

/** An unlinked token's own actor (bestiary copies are unlinked: each token its own creature). */
export function tokenActor(scene, actor) {
  return scene.tokens.find(t => t.actorId === actor?.id)?.actor ?? null;
}

/** Bring a placed creature to 0 PW through its token — the module's "BN pada" makes it dead. */
export async function zabij(scene, actor) {
  const a = tokenActor(scene, actor);
  if (a) await a.update({ "system.attributes.hp.value": 0 });
  return a;
}

/** Probe helper: `p("id", "grupa", "co ocenić", "jak", "NOE|RAI|WKK|VETO")`. */
export const p = (id, grupa, tekst, jak = "", warstwa = null) => ({ id, grupa, tekst, jak, warstwa });

/** A rendered scene name list for summaries. */
export const names = list => list.filter(Boolean).map(a => a.name);
