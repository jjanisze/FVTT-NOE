// Neuroshima 5e — weryfikacja świata po przejściu na dnd5e 6.0 (PLAN_migracja_dnd5e6.md E11).
//
//   npm run fvtt -- eval --profile=<poligon|campaign> --file=dev/migration/weryfikacja-dnd5e6.js
//
// Body of an async function (`fvtt eval --file`), read-only: a fingerprint of the world to compare between runs —
// on the clone before and after `migrateDnd5e6`, then on the campaign. What it catches:
//  - documents lost on load: v14 keeps a document that fails the 6.0 schema out of its collection
//    (`invalidDocumentIds`) — top level and embedded;
//  - our flags (`flags.neuroshima-2026-overrides.*`) counted per key: Fuksy, Wyczerpanie, magazynki, towarzysze,
//    drony, doba, handlarze, ruiny … — dnd5e's migration must leave them alone;
//  - what `migrateDnd5e6` fixes: effect keys on a 6.0 shim, Palcożerca's old key, companions' default AC calcs;
//  - every actor prepares without an error; the dnd5e settings NOE enforces.
// Names never leave the page — counts and ids only.

const MOD = "neuroshima-2026-overrides";
const AE = CONFIG.ActiveEffect.documentClass;
const BONUS_SHIM = /^system\.(abilities|skills|tools)\.\w+\.bonuses\.(check|save)$/;
const isShimKey = key => (key in (AE.SHIM_FIELDS ?? {})) || BONUS_SHIM.test(key);

const out = {
  world: game.world.id, at: new Date().toISOString(),
  versions: { core: game.version, dnd5e: game.system.version, module: game.modules.get(MOD)?.version },
  dnd5eMigration: game.settings.get("dnd5e", "systemMigrationVersion"),
  collections: {}, embedded: {}, flags: {}, invariants: {}
};

// Top-level collections: loaded + invalid.
for (const [name, collection] of game.collections.entries()) {
  out.collections[name] = { loaded: collection.size, invalid: collection.invalidDocumentIds?.size ?? 0 };
}

// Embedded collections: loaded + invalid, summed per parent type.
const tally = (key, collection) => {
  const t = (out.embedded[key] ??= { loaded: 0, invalid: 0 });
  t.loaded += collection?.size ?? 0;
  t.invalid += collection?.invalidDocumentIds?.size ?? 0;
};
for (const actor of game.actors) { tally("Actor.items", actor.items); tally("Actor.effects", actor.effects); }
for (const item of game.items) tally("Item.effects", item.effects);
for (const actor of game.actors) for (const item of actor.items) tally("Actor.Item.effects", item.effects);
for (const scene of game.scenes) {
  for (const name of ["tokens", "tiles", "walls", "regions", "notes", "drawings", "lights", "sounds"]) tally(`Scene.${name}`, scene[name]);
}
for (const entry of game.journal) tally("JournalEntry.pages", entry.pages);

// Our flags, per key, across every document we can reach.
const countFlags = (doc, where) => {
  const flags = doc?.flags?.[MOD];
  if (!flags) return;
  for (const key of Object.keys(flags)) out.flags[`${where}:${key}`] = (out.flags[`${where}:${key}`] ?? 0) + 1;
};
for (const [name, collection] of game.collections.entries()) for (const doc of collection) countFlags(doc, name);
for (const actor of game.actors) {
  for (const item of actor.items) { countFlags(item, "Actor.Item"); for (const e of item.effects) countFlags(e, "Actor.Item.ActiveEffect"); }
  for (const e of actor.effects) countFlags(e, "Actor.ActiveEffect");
}
for (const scene of game.scenes) for (const token of scene.tokens) countFlags(token, "Scene.Token");
out.flags = Object.fromEntries(Object.entries(out.flags).sort(([a], [b]) => a.localeCompare(b)));

// What migrateDnd5e6 fixes — all zero after it.
const effects = [];
for (const actor of game.actors) {
  effects.push(...actor.effects);
  for (const item of actor.items) effects.push(...item.effects);
}
for (const item of game.items) effects.push(...item.effects);
const keys = effects.flatMap(e => (e.toObject().system?.changes ?? []).map(c => ({ e, key: c.key })));
out.invariants.effectsOnShimKeys = new Set(keys.filter(k => isShimKey(k.key)).map(k => k.e.uuid)).size;
out.invariants.shimKeys = [...new Set(keys.filter(k => isShimKey(k.key)).map(k => k.key))].sort();
out.invariants.palcozercaOldKey = effects.filter(e => (e.getFlag(MOD, "critRider") === "palcozerca")
  && (e.toObject().system?.changes ?? []).some(c => c.key === "system.bonuses.abilities.check")).length;
out.invariants.palcozercaRiderOldKey = game.actors.reduce((n, a) => n + a.items.filter(i => {
  const auto = i.getFlag(MOD, "bestiary")?.automation;
  return (auto?.rider === "palcozerca") && (auto.effect?.changes ?? []).some(c => c.key === "system.bonuses.abilities.check");
}).length, 0);
out.invariants.companionsWithDefaultCalcs = game.actors.filter(a => {
  const ac = a._source.system?.attributes?.ac;
  return a.getFlag(MOD, "towarzysz") && ac?.formulas?.length && ac.calcs?.length;
}).length;

// Every actor prepares without an error.
const errors = [];
const onError = Hooks.onError;
Hooks.onError = function (location, error, options = {}) {
  errors.push({ location, uuid: options.uuid ?? null, message: String(error?.message ?? error).slice(0, 200) });
  return onError.call(this, location, error, { ...options, log: null, notify: null });
};
try {
  for (const actor of game.actors) {
    try { actor.reset(); } catch (err) { errors.push({ location: "reset", uuid: actor.uuid, message: String(err?.message ?? err).slice(0, 200) }); }
  }
} finally {
  Hooks.onError = onError;
}
out.invariants.prepareErrors = errors.length;
out.invariants.prepareErrorSamples = errors.slice(0, 10);

// The dnd5e settings NOE enforces (PLAN §5).
const state = game.modules.get(MOD)?.api?.dnd5eSettings?.state?.() ?? game.neuroshima?.dnd5eSettings?.state?.() ?? [];
out.invariants.enforcedSettingsChecked = state.length;
out.invariants.enforcedSettingsWrong = state.filter(s => !s.ok).map(s => `${s.key}=${JSON.stringify(s.current)}`);
out.invariants.primaryParty = Boolean(game.actors.party);

return out;
