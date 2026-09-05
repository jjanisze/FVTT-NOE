/**
 * Neuroshima 5e — the 220° facing cone, RAW's actual default field of view.
 *
 * Podręcznik ("Zmysły"): "Wszystkie istoty, oprócz tych posiadających Ślepowidzenie i maszyn
 * Molocha (które używają kamer), są w stanie widzieć tylko to, co znajduje się mniej więcej
 * przed nimi i ewentualnie lekko z boku. Wszystko, co znajduje się za plecami, jest niewidoczne,
 * czyli całkowicie przesłonięte." — a forward-biased cone, not omnidirectional 360° sight, for
 * (almost) everyone. `220°` (charitably, actual human FOV) is the concrete number picked for it.
 *
 * ## Where this lives, and why it's independent of `visionMode`/`sight.range`
 *
 * `token.sight.angle` is a field entirely separate from `sight.visionMode`/`sight.range`
 * (`vision-sources.mjs` never touches `angle` — see that file's own doc comments) and from any
 * `DetectionMode`'s own range. Foundry builds ONE vision-source FOV polygon per token from
 * `sight.angle` + the token's own `rotation`, and any detection mode registered with `angle: true`
 * (this module's own `neuroshimaTermowizja` included, `detection-termowizja.mjs`) is tested against
 * that same cone. So setting the baseline here is enough to make the facing restriction apply to
 * *every* sense at once — general sight, Noktowizor's `lightAmplification`-alike, Termowizor's
 * detection mode — exactly the "this overrides NVG and thermals too" requirement: none of those
 * modes carry their own angle, they all read the one the token itself has.
 *
 * ## The two exemptions, and why they're checked the way they are
 *
 * - **Ślepowidzenie (blindsight)**: `system.attributes.senses.ranges.blindsight > 0`. A clean
 *   numeric field regardless of how messy an actor's other data is (see next point) — safe to
 *   trust everywhere, legacy actors included.
 * - **Maszyny Molocha ("które używają kamer")**: NOT Smart's machines — the rulebook line names
 *   Moloch specifically, and the Bestiariusz already tags exactly this
 *   (`dev/bestiary/bestiary.json`'s `typeNote`: `"Molocha"` / `"Molocha lub Smarta"` — the ambiguous
 *   one nets out as "could be either," so it stays exempt too). Detected as a case-insensitive
 *   substring match on "moloch" across `details.type.value`/`.subtype`/`.custom` combined with
 *   `type.value` reading as a machine — deliberately loose because `creature-types.mjs` documents
 *   57 live-world NPCs carrying **free-text** `details.type.value` ("Maszyna (Molocha)", "maszyna
 *   Molocha", …) predating this project's own clean `creatureType`/`typeNote` pipeline
 *   (`dev/packs/build-packs.mjs`). An exact-match check would silently miss most of them; a loose
 *   substring match catches the messy legacy data and the clean compendium data the same way.
 *
 * Everyone else — every PC (all human, per this campaign; RAW's exemption list has no "human"
 * entry either), every non-machine monster, every non-Moloch machine — gets the same 220°.
 */

export const DEFAULT_FOV_ANGLE = 220;
export const OMNIDIRECTIONAL_ANGLE = 360;

/**
 * @param {object} [info]
 * @param {number} [info.blindsightRange] `system.attributes.senses.ranges.blindsight` (or the
 *   legacy flat `senses.blindsight`) — any value > 0 exempts.
 * @param {string} [info.typeValue] `system.details.type.value`.
 * @param {string} [info.typeSubtype] `system.details.type.subtype`.
 * @param {string} [info.typeCustom] `system.details.type.custom`.
 * @returns {number} `OMNIDIRECTIONAL_ANGLE` for an exempt creature, `DEFAULT_FOV_ANGLE` otherwise.
 */
export function computeFovAngle({ blindsightRange = 0, typeValue = "", typeSubtype = "", typeCustom = "" } = {}) {
  if (blindsightRange > 0) return OMNIDIRECTIONAL_ANGLE;

  const typeText = `${typeValue ?? ""} ${typeSubtype ?? ""} ${typeCustom ?? ""}`;
  const isMachine = /maszyn/i.test(typeText);
  const isMoloch = /moloch/i.test(typeText);
  if (isMachine && isMoloch) return OMNIDIRECTIONAL_ANGLE;

  return DEFAULT_FOV_ANGLE;
}

/** Same computation straight off a dnd5e Actor (character or npc) — the common case. */
export function computeFovAngleForActor(actor) {
  const senses = actor?.system?.attributes?.senses;
  const blindsightRange = senses?.ranges?.blindsight ?? senses?.blindsight ?? 0;
  const type = actor?.system?.details?.type ?? {};
  return computeFovAngle({
    blindsightRange,
    typeValue: type.value,
    typeSubtype: type.subtype,
    typeCustom: type.custom,
  });
}
