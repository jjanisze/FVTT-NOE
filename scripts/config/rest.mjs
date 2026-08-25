/**
 * Neuroshima 5e — Rest duration overrides.
 * 
 * Neuroshima rest rules:
 * - Krótki odpoczynek (Short Rest): 4 hours (not 1h)
 * - Długi odpoczynek (Long Rest): 24 hours (not 8h)
 * - Long rest reduces exhaustion by 1 (kept from dnd5e)
 * - Interrupted long rest after 4+ hours → short rest benefits
 */

/**
 * Długi odpoczynek z polem „Przerwany po (godz.)".
 *
 * Podklasa zamiast wstrzykiwania w DOM, bo `restTypes.long.dialogClass` jest
 * jawnym punktem rozszerzenia dnd5e, a `context.fields` renderuje się tym samym
 * kodem co natywne pola. Wartość pola wraca do `config` przez `mergeObject`
 * w `BaseRestDialog.#handleFormSubmission`, więc czyta ją hak `dnd5e.longRest`.
 */
function buildLongRestDialog(Base) {
  const { NumberField } = foundry.data.fields;

  return class NeuroshimaLongRestDialog extends Base {
    /** @inheritDoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      // `BaseRestDialog` składa `formSections` zanim tu wrócimy, więc przy pustym
      // `fields` sekcji nie ma i samo `push` byłoby niewidoczne.
      if (!context.fields.length) {
        context.formSections.unshift({ legend: "DND5E.REST.Configuration", fields: context.fields });
      }
      context.fields.push({
        field: new NumberField({
          label: "Przerwany po (godz.)",
          hint: `0 = nieprzerwany. Co najmniej ${INTERRUPT_THRESHOLD_HOURS} h daje korzyści `
            + "Krótkiego odpoczynku, mniej — nic.",
          min: 0,
          max: 24
        }),
        input: context.inputs.createNumberInput,
        name: "neuroInterruptedAfter",
        value: context.config.neuroInterruptedAfter ?? 0
      });
      return context;
    }
  };
}

/** Godziny Długiego odpoczynku, po których przerwanie daje korzyści Krótkiego. */
const INTERRUPT_THRESHOLD_HOURS = 4;

function onLongRest(actor, config) {
  const hours = Number(config.neuroInterruptedAfter ?? 0);
  if (!(hours > 0)) return;

  // Odłożone poza ten hook, bo zwracamy `false`: długi odpoczynek ma się nigdy
  // nie policzyć, zamiast policzyć się i być cofanym.
  setTimeout(() => resolveInterruptedLongRest(actor, hours), 0);
  return false;
}

/**
 * Przerwany Długi odpoczynek: ≥ 4 h to korzyści Krótkiego, mniej to nic.
 * @param {Actor5e} actor
 * @param {number} hours
 */
export async function resolveInterruptedLongRest(actor, hours) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const head = `<strong>Długi odpoczynek przerwany</strong> po ${hours} h`;

  if (hours < INTERRUPT_THRESHOLD_HOURS) {
    await ChatMessage.create({
      speaker,
      content: `<div class="neuro-rest-interrupted">${head} — to mniej niż `
        + `${INTERRUPT_THRESHOLD_HOURS} h, więc <em>bez żadnych korzyści</em>.</div>`
    });
    return null;
  }

  await ChatMessage.create({
    speaker,
    content: `<div class="neuro-rest-interrupted">${head} — przysługują korzyści `
      + "<strong>Krótkiego odpoczynku</strong>.</div>"
  });
  return actor.shortRest({ duration: hours * 60, newDay: false });
}

export function registerRestOverrides() {
  const restTypes = CONFIG.DND5E.restTypes;
  if (!restTypes) {
    console.warn("Neuroshima 5e | restTypes not found, skipping override");
    return;
  }

  // Short rest: 4 hours = 240 minutes
  if (restTypes.short?.duration) {
    restTypes.short.duration.normal = 240;
    restTypes.short.duration.gritty = 240;  // No gritty/epic variants in Neuroshima
    restTypes.short.duration.epic = 240;
  }

  // Long rest: 24 hours = 1440 minutes
  if (restTypes.long?.duration) {
    restTypes.long.duration.normal = 1440;
    restTypes.long.duration.gritty = 1440;
    restTypes.long.duration.epic = 1440;
  }

  // Polish labels (direct strings for CONFIG, bypass preLocalize)
  if (restTypes.short) restTypes.short.label = "Krótki odpoczynek";
  if (restTypes.long) restTypes.long.label = "Długi odpoczynek";

  if (restTypes.long?.dialogClass) {
    restTypes.long.dialogClass = buildLongRestDialog(restTypes.long.dialogClass);
    Hooks.on("dnd5e.longRest", onLongRest);
  }

  console.log("Neuroshima 5e | Rest durations overridden (KO: 4h, DO: 24h)");
}
