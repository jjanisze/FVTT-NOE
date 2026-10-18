/**
 * Neuroshima 5e — dnd5e settings the module's rules depend on (PLAN_migracja_dnd5e6.md §5).
 *
 * One table: the value Neuroshima needs and why. On the active GM's `ready` every setting that differs is set,
 * with one console line and one whispered card to the GM listing what changed; in dnd5e's and core's settings
 * windows those fields are locked with the reason ("pilnuje NOE"), so nobody switches a rule off by hand.
 *
 * Settings decided later in the migration (falling, initiative groups, token size sync, …) join the table when
 * their stage settles them (§5, E9). Compendium sources stay in `srd-cleanup.mjs` — a merged object, not a value.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * @typedef EnforcedSetting
 * @property {*} value             What Neuroshima needs.
 * @property {string} why          Shown in the GM's card and as the lock hint.
 * @property {boolean} [reload]    dnd5e reads it only at start-up (`requiresReload`).
 * @property {boolean} [client]    A client setting: each client sets its own, quietly, at its `ready`.
 */

/** @type {Readonly<Record<string, EnforcedSetting>>} */
export const ENFORCED_DND5E_SETTINGS = Object.freeze({
  rulesVersion: { value: "modern", why: "Wyczerpanie NOE: −2 na poziom do testów k20 (reguły „modern”)", reload: true },
  disableExhaustion: { value: false, why: "Wyczerpanie NOE stoi na mechanice wyczerpania dnd5e", reload: true },
  disableConcentration: { value: true, why: "w NOE nie ma koncentracji" },
  autoApplyDowned: { value: "none", why: "0 PW rozstrzyga karta MG „Śmierć” / „BN pada”, nie automat" },
  disableFalling: { value: false, why: "upadek NOE (s. 43: 1k6 za 1,5 m, Powalenie) liczy dnd5e — karta obrażeń dla MG (`spadanie.mjs`)" },
  initiativeGroupRoll: { value: true, why: "s. 25: grupa identycznych przeciwników ma jeden rzut na Inicjatywę" },
  senseVisionSync: { value: false, why: "tryby wzroku żetonów (noktowizor, termowizor, kamera drona) ustawia moduł" },
  tokenSizeSync: { value: false, why: "rozmiar i skalę żetonów (Bestiariusz, drony) kalibruje moduł", reload: true },
  metricWeightUnits: { value: true, why: "NOE liczy w kilogramach (Udźwig)" },
  metricLengthUnits: { value: true, why: "NOE liczy w metrach" },
  metricVolumeUnits: { value: true, why: "NOE liczy w litrach" },
  // dnd5e 6.0 hides a save or check rolled from a usage card and shows a summary on the card instead; our
  // Fuks/Forsowanie bar and the roll annotations (choroby, chemia, dostępność narzędzi) live on the roll's own card,
  // so they vanished from the log. Separate cards as in 5.3 until the bar is ported into the summary (§9).
  chatCardSummary: { value: false, why: "pasek Fuksa i Forsowania oraz adnotacje rzutów są na karcie rzutu, nie w podsumowaniu", client: true }
});

/** Each enforced setting this dnd5e registers, with its current value. */
export function enforcedSettingsState() {
  return Object.entries(ENFORCED_DND5E_SETTINGS)
    .filter(([key]) => game.settings.settings.has(`dnd5e.${key}`))
    .map(([key, s]) => {
      const current = game.settings.get("dnd5e", key);
      return { key, required: s.value, current, ok: current === s.value, why: s.why, reload: !!s.reload, client: !!s.client };
    });
}

let _queue = Promise.resolve();

/**
 * Set every enforced setting that differs — world settings on the active GM, client ones on every client. Runs one
 * at a time: a write made while a pass is still running waits for it instead of setting the same keys twice.
 */
export function enforceDnd5eSettings() {
  const run = _queue.then(_enforce);
  _queue = run.catch(err => console.error(`${MODULE_ID} | ustawienia dnd5e`, err));
  return run;
}

async function _enforce() {
  const gm = !!game.users.activeGM?.isSelf;
  const changed = [];
  for (const s of enforcedSettingsState()) {
    if (s.ok || (!s.client && !gm)) continue;
    await game.settings.set("dnd5e", s.key, s.required);
    // dnd5e caches world settings once (`settings.mjs` `cacheSettings`) and refreshes only those without
    // `requiresReload`; this client would go on with the old value until F5. Other clients load the new one.
    if (globalThis.dnd5e?.settings && (s.key in dnd5e.settings)) dnd5e.settings[s.key] = s.required;
    changed.push(s);
  }
  if (!changed.length) return changed;
  // The log rendered before `ready` with linked rolls hidden; dnd5e does not re-render on this setting's change.
  if (changed.some(c => c.key === "chatCardSummary")) {
    for (const m of game.messages) if (m.system?.summaryTemplate && m._source.system?.origin) void ui.chat?.updateMessage?.(m);
  }
  const world = changed.filter(c => !c.client);
  console.log(`${MODULE_ID} | ustawienia dnd5e pilnowane przez NOE: ${changed.map(c => `${c.key} ${JSON.stringify(c.current)} → ${JSON.stringify(c.required)}`).join(", ")}`);
  const label = key => game.i18n.localize(game.settings.settings.get(`dnd5e.${key}`)?.name ?? key);
  if (!world.length) return changed;
  const reload = world.some(c => c.reload);
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    speaker: { alias: "Neuroshima" },
    content: `<p><strong>Ustawienia dnd5e przestawione przez moduł</strong> — reguły NOE od nich zależą:</p>
      <ul>${world.map(c => `<li><strong>${foundry.utils.escapeHTML(label(c.key))}</strong>: ${foundry.utils.escapeHTML(c.why)}</li>`).join("")}</ul>
      ${reload ? "<p>Część działa dopiero po przeładowaniu świata (F5).</p>" : ""}`
  });
  return changed;
}

/** Locks the enforced fields in core's and dnd5e's settings windows (inputs `dnd5e.<key>` or `<key>`). */
function _lockFields(app, element) {
  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!root?.querySelector) return;
  for (const [key, s] of Object.entries(ENFORCED_DND5E_SETTINGS)) {
    for (const input of root.querySelectorAll(`[name="dnd5e.${key}"], [name="${key}"]`)) {
      // dnd5e's own windows name fields by bare key; core's by `namespace.key`. A bare key that is not a dnd5e
      // setting in a dnd5e window would be a coincidence — skip anything outside a form that lists dnd5e settings.
      if (input.name === key && !(app?.options?.namespace === "dnd5e" || root.querySelector(`[name="dnd5e.${key}"]`))) continue;
      input.disabled = true;
      input.dataset.tooltip = `Pilnuje NOE: ${s.why}`;
      const group = input.closest(".form-group");
      if (group && !group.querySelector(".neuro-enforced")) {
        group.insertAdjacentHTML("beforeend", `<p class="hint neuro-enforced">Pilnuje NOE — ${foundry.utils.escapeHTML(s.why)}</p>`);
      }
    }
  }
}

/**
 * Puts back an enforced world setting that something else changed. dnd5e 6's first-run welcome window opens on a fresh
 * world after our `ready`, renders the units as they were (imperial) and submits on close — closing it unanswered
 * included — writing them over ours. On the active GM only; client settings are never written by another client.
 */
function _onSettingChanged(setting) {
  const [ns, key] = [setting.key.slice(0, setting.key.indexOf(".")), setting.key.slice(setting.key.indexOf(".") + 1)];
  const s = ns === "dnd5e" ? ENFORCED_DND5E_SETTINGS[key] : null;
  if (!s || s.client || !game.users.activeGM?.isSelf) return;
  if (game.settings.get("dnd5e", key) !== s.value) void enforceDnd5eSettings();
}

export function registerDnd5eSettings() {
  Hooks.once("ready", () => {
    void enforceDnd5eSettings();
    Hooks.on("createSetting", _onSettingChanged);
    Hooks.on("updateSetting", _onSettingChanged);
  });
  Hooks.on("renderSettingsConfig", _lockFields);
  Hooks.on("renderApplicationV2", (app, element) => {
    const Base = globalThis.dnd5e?.applications?.settings?.BaseSettingsConfig;
    if (Base && app instanceof Base) _lockFields(app, element);
  });
}

export const dnd5eSettingsApi = Object.freeze({ table: ENFORCED_DND5E_SETTINGS, state: enforcedSettingsState, enforce: enforceDnd5eSettings });
