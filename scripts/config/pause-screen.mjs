/**
 * Neuroshima 5e — Custom "game paused" overlay.
 *
 * dnd5e's own renderGamePause hook (dnd5e.mjs) bails out entirely whenever more
 * than one hook is registered for the event, so adding ours here fully replaces
 * it — including the dnd5e2 wrapper/class it would otherwise apply, which is
 * what the system CSS sizes the icon against. We reproduce that wrapper so the
 * new icon renders at the same size the ampersand did.
 */
const MODULE_ID = "neuroshima-2026-overrides";
const PAUSE_ICON = `modules/${MODULE_ID}/ui/pause-cherry.svg`;
const PAUSE_TEXT = "CZAS STOP";

export function registerPauseScreen() {
  Hooks.on("renderGamePause", (app, html) => {
    html.classList.add("dnd5e2");
    const container = document.createElement("div");
    container.classList.add("flexcol");
    container.append(...html.children);
    html.append(container);

    const img = html.querySelector("img");
    if (img) {
      img.src = PAUSE_ICON;
      img.className = "";
    }

    const caption = html.querySelector("figcaption");
    if (caption) caption.innerText = PAUSE_TEXT;
  });
}
