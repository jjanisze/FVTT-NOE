/** Repoint verified live-world physical items to dedicated module assets. */
const MODULE_ID = "neuroshima-2026-overrides";
const ROOT = `modules/${MODULE_ID}/icons/weapons/`;
const ACTIVITY_ROOT = `modules/${MODULE_ID}/icons/activities/`;
const LOOT_ROOT = `modules/${MODULE_ID}/icons/items/loot/`;
const TOOLS_ROOT = `modules/${MODULE_ID}/icons/tools/`;
const ICONS = Object.freeze({
  "Berdysz": `${ROOT}berdysz.svg`,
  "Scyzoryk": `${ROOT}scyzoryk.svg`,
  "Skalpel": `${ROOT}skalpel.svg`,
  "Bejsbol": `${ROOT}baseball_bat.svg`,
  "Bejzbol": `${ROOT}baseball_bat.svg`,
  "Konserwa x": `${ROOT}canned_food.svg`,
  "Pi\u0105chopiryna": `${ROOT}brass_knuckles.svg`,
  "Atak Gazrurk\u0105": `${ROOT}iron_pipe_club.svg`,
  "Kr\u00f3tka seria": `${ACTIVITY_ROOT}activity_short_burst.svg`,
  "Strza\u0142": `${ACTIVITY_ROOT}activity_single_fire.svg`,
  "Buzdygan \u015bmieciowy": `${ROOT}buzdygan_smieciowy.svg`,
  "Tulipan": `${ROOT}tulipan.svg`,
  "Ugryzienie": `${ROOT}ugryzienie.svg`,
  "Atak - Paszcza": `${ROOT}ugryzienie.svg`,
  "Z\u0119by": `${ROOT}zeby.svg`,
  "Macka": `${ROOT}macka.svg`,
  "List od Gordona do Samanthy Smith (0)": `${LOOT_ROOT}list_gordon_samantha.svg`,
  "Atak +0": `${ROOT}browning_m2.svg`,
  "Paralizator": `${ROOT}paralyzer.svg`,
  "Glock 17": `${ROOT}glock_17.svg`,
  "Colt \"Peacemaker\"": `${ROOT}peacemaker_revolver.svg`,
  "Atak Wielokrotny Desert Eaglem": `${ROOT}desert_eagle.svg`,
  "Raca sygna\u0142owa": `${ROOT}raca_oswietleniowa.svg`,
  "Pa\u0142ka": `${ROOT}palka.svg`,
  "Atak - Ogon": `${ROOT}atak_ogonem.svg`,
  "Atak g\u0142ow\u0105": `${ROOT}atak_glowa.svg`,
  "Atak Wielokrotny Ostrzem": `${ROOT}atak_wielokrotny_ostrzem.svg`,
  "Atak wr\u0119cz": `${ROOT}atak_wrecz_pajaczek.svg`,
  "Atak Odn\u00f3\u017cem": `${ROOT}atak_odnogiem_spawacz.svg`,
  "Pokwitowanie Luxor (200 gb w amunicji)": `${LOOT_ROOT}pokwitowanie_luxor.svg`,
  "Woda pitna": `${LOOT_ROOT}woda_filtrowana.svg`,
  "Blacha Nowego Jorku": `${LOOT_ROOT}odznaka.svg`,
  "Buty Lorentza (znoszone mocno)": `${LOOT_ROOT}buty_wojskowe.svg`,
  "Sk\u00f3rzana akt\u00f3wka": `${LOOT_ROOT}teczka_skorzana.svg`,
  "Teczka USS See \u2014 sk\u00f3rzana (dobra jako\u015b\u0107)": `${LOOT_ROOT}teczka_skorzana.svg`,
  "Plecak wojskowy \u2014 posterunkowy": `${LOOT_ROOT}plecak_wojskowy.svg`,
  "Ma\u0142y K\u0142usownik": `${TOOLS_ROOT}klusownika.svg`,
  "Ma\u0142y Rusznikarz": `${TOOLS_ROOT}rusznikarza.svg`,
  "Ma\u0142y Rze\u017anik": `${TOOLS_ROOT}rzeznika.svg`,
  "Ma\u0142y Stolarz": `${TOOLS_ROOT}stolarza.svg`,
  "Atak tack\u0105": `${ROOT}atak_taca.svg`,
  "Kie\u0142 jadowy": `${LOOT_ROOT}kiel_jadowy.svg`,
  "Paliwo": `${LOOT_ROOT}paliwo.svg`,
  "Uzupe\u0142nienie Narz\u0119dzi Ma\u0142ego Medyka": `${LOOT_ROOT}uzupelnienie_medyka.svg`,
  "Metalowa walizka": `${LOOT_ROOT}metalowa_walizka.svg`,
  "Cz\u0119\u015bci ci\u0119\u017ckiego karabinu": `${LOOT_ROOT}czesci_ciezkiego_karabinu.svg`,
  "Rura stalowa": `${ROOT}iron_pipe_club.svg`,
  "Raca drogowa": `${ROOT}raca_oswietleniowa.svg`,
  "Walther PPK": `${ROOT}walther_ppk.svg`,
  "Ruger LCP II": `${ROOT}ruger_lcp_ii.svg`,
  "Pięść wspomagana hydraulicznie": `${ROOT}piesc_hydrauliczna.svg`,
  "Łopatka kuchenna": `${ROOT}lopatka_kuchenna.svg`,
  "Klucz francuski": `${ROOT}klucz_francuski.svg`,
  "Bez Broni": `${ROOT}atak_bez_broni.svg`,
  "Bez broni": `${ROOT}atak_bez_broni.svg`,
  "Pięść": `${ROOT}atak_bez_broni.svg`,
  "Pazury": `${ROOT}pazury.svg`,
  "Żądło": `${ROOT}zadlo.svg`,
  "Ukłucie": `${ROOT}zadlo.svg`
});

const ACTOR_ICONS = Object.freeze({
  "GIGANTYCZNY PAJ\u0104K": Object.freeze({
    "Odn\u00f3\u017ce": `${ROOT}odnoze_gigantyczny_pajak.svg`
  }),
  "KO\u0143 (SKA\u017bONY)": Object.freeze({
    "Odn\u00f3\u017ce": "icons/svg/upgrade.svg"
  })
});

function isBorrowed(img) {
  return img === "icons/svg/item-bag.svg"
    || img === "systems/dnd5e/icons/svg/items/loot.svg"
    || img === `${ROOT}ak_47.svg`
    || img === `${ROOT}armalite_carbine.svg`
    || img === `${ROOT}semi_auto_pistol.svg`
    || img === `${ROOT}revolver.svg`
    || img === `${ROOT}combat_knife.svg`
    || img === `${ROOT}odnoze_gigantyczny_pajak.svg`
    || img === `${ROOT}browning_m2.svg`
    || img === `modules/${MODULE_ID}/icons/ammo/ammo_12_ga.svg`
    || img === `${LOOT_ROOT}pendrive.svg`
    || /^icons\//i.test(img ?? "")
    || /^worlds\/output\/characters\//i.test(img ?? "");
}

function patchesFor(items, actorName = null) {
  return [...items].flatMap(item => {
    const img = ACTOR_ICONS[actorName]?.[item.name] ?? ICONS[item.name];
    return img && item.img !== img && isBorrowed(item.img)
      ? [{ _id: item.id, name: item.name, before: item.img, img }]
      : [];
  });
}

export async function planWorldIconRepoints() {
  if (!game.user.isGM) throw new Error("World icon migration needs a GM");
  const plan = { version: 1, world: game.world.id, items: patchesFor(game.items), actors: [] };
  const actors = new Map([...game.actors].map(actor => [actor.uuid, actor]));
  for (const scene of game.scenes) for (const token of scene.tokens) {
    if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
  }
  for (const [uuid, actor] of actors) {
    const items = patchesFor(actor.items, actor.name);
    if (items.length) plan.actors.push({ uuid, name: actor.name, items });
  }
  return plan;
}

export async function applyWorldIconRepoints(plan) {
  if (!game.user.isGM || plan.version !== 1 || plan.world !== game.world.id) throw new Error("Invalid plan/world or no GM permission");
  for (const patch of plan.items) {
    const item = game.items.get(patch._id);
    if (!item || item.img !== patch.before) throw new Error(`Stale icon plan for ${patch.name}`);
  }
  for (const group of plan.actors) {
    const actor = await fromUuid(group.uuid);
    for (const patch of group.items) {
      const item = actor?.items.get(patch._id);
      if (!item || item.img !== patch.before) throw new Error(`Stale icon plan for ${group.name}: ${patch.name}`);
    }
  }
  if (plan.items.length) await Item.implementation.updateDocuments(plan.items.map(({ _id, img }) => ({ _id, img })));
  let embedded = 0;
  for (const group of plan.actors) {
    const actor = await fromUuid(group.uuid);
    await actor.updateEmbeddedDocuments("Item", group.items.map(({ _id, img }) => ({ _id, img })));
    embedded += group.items.length;
  }
  return { worldItems: plan.items.length, actors: plan.actors.length, embedded };
}
