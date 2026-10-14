/**
 * Poligon — entry point (PLAN_human_testing.md §3.5).
 *
 * Imported by the Poligon world's own loader (`worlds/poligon/poligon-loader.mjs`, written by
 * `fvtt poligon:init`), never by the module: nothing here ships in `module.zip`. ES imports are
 * hoisted, so this file evaluates before the loader has stamped the page — everything that needs the
 * stamp (`guard.mjs`) waits for `init`, when `game.world` is known.
 *
 * Installs, for the GM: the banner, the scene-controls button and keybindings that open the panel,
 * and `game.poligon` (api.mjs) — the same API `fvtt poligon:*` drives from outside.
 */

import { poligonKind } from "./lib/guard.mjs";
import { installBanner, installStyles } from "./lib/banner.mjs";
import { createApi, registerSettings, registerKeybindings, sceneControl } from "./api.mjs";

let kind = null;

Hooks.once("init", () => {
  kind = poligonKind();
  if (!kind) {
    console.error(`Poligon | refused: world "${game.world?.id}" is not the Poligon — its code never runs here.`);
    return;
  }
  registerSettings();
  registerKeybindings();
  console.log(`Poligon | ${kind} — init`);
});

// The panel button is the GM's; the Uwaga button is everyone's (a player's seat files findings too).
Hooks.on("getSceneControlButtons", controls => {
  if (kind) sceneControl(controls);
});

Hooks.once("ready", async () => {
  if (!kind) return;
  installStyles();
  installBanner(kind);
  game.poligon = await createApi(kind);
  Hooks.callAll("poligonReady", game.poligon);
  console.log(`Poligon | ready (${kind}) — game.poligon`);
});
