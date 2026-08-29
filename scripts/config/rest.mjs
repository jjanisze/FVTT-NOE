/**
 * Neuroshima 5e — Rest duration overrides.
 *
 * Neuroshima rest rules:
 * - Krótki odpoczynek (Short Rest): 4 hours (not 1h)
 * - Długi odpoczynek (Long Rest): 24 hours (not 8h)
 * - Long rest reduces exhaustion by 1 (kept from dnd5e)
 * - Interruption (rzut na Inicjatywę / obrażenia / >1h podróży) is left to the
 *   table, not automated — see LONG_REST_NOTE below. RAW: Podręcznik,
 *   „Zakłócenie Długiego odpoczynku" (rozdział Eksploracja).
 */

/**
 * Reference notes shown in the Long Rest dialog — RAW text, not a mechanic.
 * An earlier version of this file tried to automate "how many hours before
 * interruption" with a form field that silently redirected the rest to
 * `actor.shortRest()`; removed in favour of just stating the rule and letting
 * the table apply it, matching how most judgment-heavy rules in this module
 * are handled (a note, not a calculation nobody remembers to fill in).
 *
 * Two notes, not one: the native dialog's own "info" box below this one
 * (`.note.info` — dnd5e's own component, `apps.less`) is what these are
 * styled after. Split by what kind of information it is — plain fact
 * (triggers) vs. a consequence worth flagging (`.neuro-rest-note.warn`,
 * amber, mirrors dnd5e's own `--dnd5e-color-note-warn`) — same reasoning
 * dnd5e's own info/warn split uses.
 */
const LONG_REST_NOTE = `<div class="neuro-rest-note info">`
  + `Zakłócenie Długiego odpoczynku: rzut na Inicjatywę, obrażenia, lub podróż `
  + `pieszo/wierzchem dłużej niż godzinę.`
  + `</div>`
  + `<div class="neuro-rest-note warn">`
  + `Bez co najmniej 1 Punktu Wytrzymałości nie można go rozpocząć. Przerwany po `
  + `co najmniej 4 godzinach — rozlicz ręcznie jako Krótki odpoczynek; krócej, bez `
  + `żadnych korzyści. Można też wznowić od razu po przerwie (+1 godzina za każdą).`
  + `</div>`;

/**
 * Długi odpoczynek z notatką o zakłóceniu zamiast pola do ręcznego wypełniania.
 *
 * Podklasa zamiast wstrzykiwania w DOM przez hook renderowania, bo
 * `restTypes.long.dialogClass` jest jawnym punktem rozszerzenia dnd5e — ta sama
 * ścieżka, którą wcześniej zajmowało pole „Przerwany po (godz.)".
 */
function buildLongRestDialog(Base) {
  return class NeuroshimaLongRestDialog extends Base {
    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);
      const body = this.element.querySelector(".window-content");
      if (body && !body.querySelector(".neuro-rest-note")) {
        body.insertAdjacentHTML("afterbegin", LONG_REST_NOTE);
      }
    }
  };
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
  }

  console.log("Neuroshima 5e | Rest durations overridden (KO: 4h, DO: 24h)");
}
