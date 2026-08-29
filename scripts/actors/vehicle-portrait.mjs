/**
 * Neuroshima 5e — Vehicle sheet portrait/token toggle.
 *
 * Confirmed gap in stock dnd5e (not a Neuroshima override, not touched by `sheet-shell.mjs` —
 * vehicles still use dnd5e's own `VehicleActorSheet` unmodified): `CharacterActorSheet` and
 * `NPCActorSheet` both call the shared `_preparePortrait()` helper (`base-actor-sheet.mjs`) and
 * their sidebar template reads its output — a `flags.dnd5e.showTokenPortrait` slide-toggle above
 * the portrait, and an `<img>` whose `src`/`data-edit`/`data-action` follow that flag (portrait
 * `img` vs `token.texture.src`/`prototypeToken.texture.src`). `VehicleActorSheet` never calls
 * `_preparePortrait()`, and `templates/actors/vehicle/sidebar.hbs` hardcodes the portrait `<img>`
 * to `document.img` with `data-edit="img"` — no toggle, no way to view or edit the token image
 * from the sheet at all. Verified against dnd5e source (`vehicle-sheet.mjs`,
 * `vehicle/sidebar.hbs`) — this is upstream, not something this module broke.
 *
 * The backend piece (`Actor5e#getPreferredArtwork()`, the `editImage`/`showArtwork`/
 * `configurePrototypeToken` sheet actions) is generic to every actor type and already works for
 * vehicles — it's purely the sidebar UI that never wires it up. So this doesn't reimplement
 * anything, it just does on the live DOM what the missing template lines would have done:
 * inject the same toggle dnd5e ships on other sheets, and keep the portrait `<img>` (src +
 * click target) in sync with the flag.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const TOGGLE_CLASS = "neuro-vehicle-portrait-toggle";

function _root(html) {
  return html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
}

function _syncToggleLabel(label, isToken) {
  label.querySelector("i").className = `fas fa-toggle-${isToken ? "on" : "off"}`;
  label.querySelector(".neuro-toggle-label").textContent = isToken ? "Token" : "Portret";
}

async function onRenderVehicleActorSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || actor.type !== "vehicle") return;

  const root = _root(html);
  const portraitDiv = root?.querySelector(".sheet-sidebar .portrait");
  const img = portraitDiv?.querySelector("img");
  if (!portraitDiv || !img) return;

  const editable = app.isEditable ?? actor.isOwner ?? false;
  const artwork = await actor.getPreferredArtwork();

  // Keep the <img> itself following the flag, same fields character-sidebar.hbs derives from
  // its `portrait` context object.
  img.src = artwork.src;
  portraitDiv.classList.toggle("token", artwork.isToken);

  if (editable) {
    img.dataset.action = artwork.isRandom ? "configurePrototypeToken" : "editImage";
    if (artwork.isToken) {
      img.dataset.edit = actor.isToken ? "token.texture.src" : "prototypeToken.texture.src";
      img.dataset.type = "imagevideo";
    } else {
      img.dataset.edit = "img";
      img.dataset.type = "image";
    }
  } else {
    img.dataset.action = "showArtwork";
    delete img.dataset.edit;
    delete img.dataset.type;
  }

  const existing = portraitDiv.querySelector(`.${TOGGLE_CLASS}`);
  if (!editable) {
    existing?.remove();
    return;
  }

  if (existing) {
    _syncToggleLabel(existing, artwork.isToken);
    return;
  }

  // Deliberately no `name` attribute — this checkbox lives inside the sheet's <form>, and
  // giving it one would let dnd5e's own generic form-submit handler race the explicit
  // setFlag() below on the next unrelated field edit. The flag write here is the only path.
  const label = document.createElement("label");
  label.className = `slide-toggle roboto-upper ${TOGGLE_CLASS}`;
  label.innerHTML = `<input type="checkbox">
    <i class="fas fa-toggle-off" inert></i>
    <span class="neuro-toggle-label"></span>`;
  const checkbox = label.querySelector("input");
  checkbox.checked = artwork.isToken;
  _syncToggleLabel(label, artwork.isToken);
  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    await actor.setFlag("dnd5e", "showTokenPortrait", checkbox.checked);
    // Actor sheets re-render on their own document's update — no manual render() needed.
  });
  portraitDiv.prepend(label);
}

export function registerVehiclePortraitToggle() {
  Hooks.on("renderVehicleActorSheet", onRenderVehicleActorSheet);
  console.log("Neuroshima 5e | Vehicle portrait/token toggle registered");
}
