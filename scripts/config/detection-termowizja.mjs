/**
 * Neuroshima 5e — Termowizja as a real canvas detection mode.
 *
 * Nine Bestiariusz creatures have Termowizja (Juggernaut, Kidnaper, Biodroid,
 * Kitchin and friends). dnd5e's `attributes.senses` schema is a closed set —
 * `ranges.{darkvision, blindsight, tremorsense, truesight}` — with no room for
 * a fifth sense, and widening an actor DataModel is exactly the kind of change
 * ARCHITECTURE.md §2 warns against.
 *
 * Foundry's own vision layer, however, is open: `CONFIG.Canvas.detectionModes`
 * takes arbitrary modes, and each Token carries its own `detectionModes` array
 * with a per-token range. So Termowizja is modelled where it actually belongs —
 * on the canvas, not in the character sheet. The pack builder writes
 * `prototypeToken.detectionModes` for every creature that has it.
 *
 * ## What thermal vision is, mechanically
 *
 * - **Not light-dependent.** Works in total darkness; that is the whole point.
 * - **Blocked by walls** (`walls: true`). It sees heat, not through concrete.
 * - **Defeats visual concealment.** Camouflage and stealth hide a silhouette,
 *   not a body's heat, so a target with the Niewidoczność status is still
 *   detected. This is the one place Termowizja beats Noktowizja outright.
 * - **Useless if the sensor is blinded.** A creature with Oślepienie has lost
 *   the optics carrying this, so the mode goes dark with it.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export const TERMOWIZJA_ID = "neuroshimaTermowizja";

/**
 * Build the detection mode class lazily: `foundry.canvas.perception` is only
 * populated once the client bundle has evaluated, which is after module import
 * but before `init` fires.
 */
function defineTermowizja() {
  const { DetectionMode } = foundry.canvas.perception;
  const { OutlineOverlayFilter } = foundry.canvas.rendering.filters;
  const Token = foundry.canvas.placeables.Token;

  return class DetectionModeTermowizja extends DetectionMode {
    /** Hot-orange outline, so a thermally-spotted token reads differently
     *  from one seen normally or by tremorsense (which uses magenta). */
    static getDetectionFilter() {
      return this._detectionFilter ??= OutlineOverlayFilter.create({
        outlineColor: [1, 0.35, 0, 1],
        knockout: true,
        wave: false
      });
    }

    /** @override */
    _canDetect(visionSource, target) {
      const src = visionSource.object?.document;
      // The sensor itself is out of action.
      if (src?.hasStatusEffect(CONFIG.specialStatusEffects.BLIND)) return false;
      if (src?.hasStatusEffect(CONFIG.specialStatusEffects.BURROW)) return false;

      // Only creatures radiate; scenery does not.
      if (!(target instanceof Token)) return false;

      // Deliberately NOT checking INVISIBLE: hiding from eyes does not hide a
      // heat signature. This is what Termowizja is for.
      const tgt = target.document;
      if (tgt.hasStatusEffect(CONFIG.specialStatusEffects.BURROW)) return false;

      return true;
    }
  };
}

/**
 * Register the mode. Must run at `init`, before the canvas builds its vision
 * modes for the first scene draw.
 */
export function registerTermowizja() {
  try {
    const cls = defineTermowizja();
    CONFIG.Canvas.detectionModes[TERMOWIZJA_ID] = new cls({
      id: TERMOWIZJA_ID,
      label: "Termowizja",
      type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.SIGHT,
      walls: true,
      angle: true,
      tokenConfig: true
    });
    console.log(`${MODULE_ID} | Termowizja detection mode registered`);
  } catch (err) {
    console.error(`${MODULE_ID} | failed to register Termowizja detection mode`, err);
  }
}
