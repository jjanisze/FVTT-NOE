/**
 * Derived canvas documents follow an actor/item or a root canvas action. Undoing a projection
 * independently would leave the source unchanged (lit item/dark token, pasted car/unlinked crew).
 * Opt only those writes out of history; ordinary create/update/delete keep the configured layer's
 * native behavior. This does not make actor or item actions undoable and does not use isUndo.
 */
export const DERIVED_UPDATE = "neuroDerivedUpdate";

export function historyLayer(Base) {
  return class NeuroHistoryLayer extends Base {
    /** @override */
    storeHistory(type, data, options = {}) {
      if (options[DERIVED_UPDATE]) return;
      return super.storeHistory(type, data, options);
    }
  };
}

export function registerCanvasHistory() {
  Hooks.once("setup", () => {
    const Placeables = foundry.canvas.layers.PlaceablesLayer;
    for (const layer of Object.values(CONFIG.Canvas.layers)) {
      if (layer.layerClass?.prototype instanceof Placeables) layer.layerClass = historyLayer(layer.layerClass);
    }
  });
}
