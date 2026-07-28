/**
 * Neuroshima 5e — Zbrojownia sync.
 *
 * Allows designating one NPC actor as the canonical "Zbrojownia" (Armory).
 * A "Synchronizuj zbrojownię" button appears on that actor's sheet header.
 * Clicking it pushes all weapons from the actor's inventory to the world Items
 * directory, organised into subfolders by weapon type under a parent folder.
 *
 * ## How to designate an actor as Zbrojownia
 * Run in the browser console (once):
 *   game.actors.getName("TESTER - Bez sztuczek").setFlag("neuroshima-2026-overrides", "isZbrojownia", true)
 *
 * ## Sync rules
 * - UPSERT by (name + type): if a world item with the same name and type exists,
 *   its data is overwritten with the actor item's data.
 * - Creates the world item if it doesn't exist yet.
 * - Organises items into: <PARENT_FOLDER> / <weapon type label>
 * - Resets quantity to 1 and clears equipped/attuned flags (template semantics).
 * - Never deletes world items — only adds / updates.
 * - Works for both weapons AND consumable ammo items.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const PARENT_FOLDER_NAME = "Weapons (PC)";
const AMMO_FOLDER_NAME     = "Amunicja";
const MAGAZINE_FOLDER_NAME = "Magazynki";
const GRENADE_FOLDER_NAME  = "Granaty";
const TOOL_FOLDER_NAME      = "Narzędzia";

/** Weapon type key → folder label (must match NEURO_WEAPON_TYPES in weapons.mjs). */
const TYPE_FOLDER_LABELS = {
  biala:       "Broń biała",
  miotana:     "Broń miotana",
  palnaKrotka: "Broń palna krótka",
  palnaPosr:   "Broń palna pośrednia",
  palnaDluga:  "Broń palna długa",
  palnaCiezka: "Broń palna ciężka",
  specjalna:   "Broń specjalna",
};

/* -------------------------------------------- */
/*  Folder helpers                                */
/* -------------------------------------------- */

/**
 * Find-or-create the parent folder and all weapon-type subfolders.
 * @returns {Promise<{parent: Folder, byType: Record<string,Folder>, ammoFolder: Folder, magazineFolder: Folder, grenadeFolder: Folder}>}
 */
async function _ensureFolders() {
  // Parent
  let parent = game.folders.find(f => f.name === PARENT_FOLDER_NAME && f.type === "Item");
  if (!parent) {
    parent = await Folder.create({ name: PARENT_FOLDER_NAME, type: "Item", color: "#8b4513" });
  }

  // Weapon-type subfolders
  const byType = {};
  for (const [key, label] of Object.entries(TYPE_FOLDER_LABELS)) {
    let sub = game.folders.find(f =>
      f.name === label && f.type === "Item" && f.folder?.id === parent.id
    );
    if (!sub) {
      sub = await Folder.create({ name: label, type: "Item", folder: parent.id });
    }
    byType[key] = sub;
  }

  // Ammo calibers subfolder
  let ammoFolder = game.folders.find(f =>
    f.name === AMMO_FOLDER_NAME && f.type === "Item" && f.folder?.id === parent.id
  );
  if (!ammoFolder) {
    ammoFolder = await Folder.create({ name: AMMO_FOLDER_NAME, type: "Item", folder: parent.id });
  }

  // Magazines subfolder
  let magazineFolder = game.folders.find(f =>
    f.name === MAGAZINE_FOLDER_NAME && f.type === "Item" && f.folder?.id === parent.id
  );
  if (!magazineFolder) {
    magazineFolder = await Folder.create({ name: MAGAZINE_FOLDER_NAME, type: "Item", folder: parent.id });
  }

  // Grenades folder
  let grenadeFolder = game.folders.find(f =>
    f.name === GRENADE_FOLDER_NAME && f.type === "Item" && f.folder?.id === parent.id
  );
  if (!grenadeFolder) {
    grenadeFolder = await Folder.create({ name: GRENADE_FOLDER_NAME, type: "Item", folder: parent.id });
  }

  // Tools (Narzędzia) folder
  let toolFolder = game.folders.find(f =>
    f.name === TOOL_FOLDER_NAME && f.type === "Item" && f.folder?.id === parent.id
  );
  if (!toolFolder) {
    toolFolder = await Folder.create({ name: TOOL_FOLDER_NAME, type: "Item", folder: parent.id });
  }

  return { parent, byType, ammoFolder, magazineFolder, grenadeFolder, toolFolder };
}

/* -------------------------------------------- */
/*  Core sync logic                               */
/* -------------------------------------------- */

/**
 * Push all weapons (and ammo consumables) from `actor` to the world Items directory.
 * @param {Actor} actor
 */
async function syncZbrojownia(actor) {
  const items = actor.items.filter(i =>
    i.type === "weapon" ||
    i.type === "tool" ||
    (i.type === "consumable" && i.system.type?.value === "ammo")
  );

  if (items.size === 0) {
    ui.notifications.warn("Zbrojownia jest pusta — brak broni, amunicji i ładunków do synchronizacji.");
    return;
  }

  ui.notifications.info(`Synchronizuję zbrojownię… (${items.size} pozycji)`);

  const { byType, ammoFolder, magazineFolder, grenadeFolder, toolFolder } = await _ensureFolders();

  let created = 0;
  let updated = 0;

  for (const item of items) {
    // Determine target folder
    let targetFolder;
    if (item.type === "tool") {
      targetFolder = toolFolder;
    } else if (item.type === "consumable") {
      const sub = item.system.type?.subtype ?? "";
      if (sub.startsWith("magazine-")) {
        targetFolder = magazineFolder;
      } else if (sub.startsWith("grenade-")) {
        targetFolder = grenadeFolder;
      } else {
        targetFolder = ammoFolder;
      }
    } else {
      const weaponType = item.system.type?.value ?? "";
      targetFolder = byType[weaponType] ?? null;
    }
    // Build template data (strip actor-specific fields)
    const raw = item.toObject();
    const data = {
      name:   raw.name,
      type:   raw.type,
      img:    raw.img,
      system: raw.system,
      flags:  raw.flags,
      folder: targetFolder?.id ?? null,
    };
    // Template semantics: reset per-actor state
    data.system.quantity = 1;
    data.system.equipped = false;
    data.system.attuned  = false;

    // Mark the world item's source so we can find it reliably next sync
    data.flags ??= {};
    data.flags[MODULE_ID] ??= {};
    data.flags[MODULE_ID].zbrojowniaSource = `${actor.id}/${item.id}`;

    // Upsert: prefer flag-match, fall back to name+type match
    const existing =
      game.items.find(wi => wi.getFlag(MODULE_ID, "zbrojowniaSource") === `${actor.id}/${item.id}`) ??
      game.items.find(wi => wi.name === item.name && wi.type === item.type);

    if (existing) {
      await existing.update(data);
      updated++;
    } else {
      await Item.create(data);
      created++;
    }
  }

  ui.notifications.info(
    `✔ Zbrojownia zsynchronizowana: ${created} nowych, ${updated} zaktualizowanych.`
  );
}

/* -------------------------------------------- */
/*  Sheet button injection                        */
/* -------------------------------------------- */

function _onRenderActorSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor?.getFlag(MODULE_ID, "isZbrojownia")) return;
  if (!game.user.isGM) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  // Find the sheet header actions area (dnd5e v5 ApplicationV2 layout)
  const headerActions =
    root.querySelector(".window-header .header-actions") ??
    root.querySelector(".window-header") ??
    root.querySelector(".sheet-header");
  if (!headerActions) return;

  if (root.querySelector(".neuro-zbrojownia-sync-btn")) return; // already injected

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-zbrojownia-sync-btn";
  btn.title = "Synchronizuj zbrojownię → Items (Weapons PC)";
  btn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Synchronizuj zbrojownię`;
  btn.style.cssText = "font-size:0.75em; padding:2px 8px; margin:2px; background:#5a3010; color:#ffd700; border:1px solid #8b6040; border-radius:3px; cursor:pointer;";

  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const confirmed = await Dialog.confirm({
      title: "Synchronizuj zbrojownię",
      content: `<p>Wypchnąć wszystkie bronie, amunicję i ładunki z <strong>${actor.name}</strong> do katalogu Items?</p>
                <p><em>Istniejące world items zostaną nadpisane. Operacja nie usuwa przedmiotów.</em></p>`,
    });
    if (confirmed) await syncZbrojownia(actor);
  });

  headerActions.prepend(btn);
}

/* -------------------------------------------- */
/*  Public registration                           */
/* -------------------------------------------- */

export function registerZbrojowniaSync() {
  for (const hookName of ["renderActorSheet", "renderNPCActorSheet", "renderCharacterActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheet);
  }
  console.log("Neuroshima 5e | Zbrojownia sync registered");
}
