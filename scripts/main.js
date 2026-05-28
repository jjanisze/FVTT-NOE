import { setupWeaponIcons } from "./weapons/icons.js";

Hooks.once('init', () => {
    console.log("Neuroshima 2026 | Initializing System Overrides");
});

Hooks.once('ready', () => {
    setupWeaponIcons();
});