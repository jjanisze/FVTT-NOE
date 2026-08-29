/**
 * Neuroshima 5e — Cichy krok (Zwiadowca, poziom 3, `class-features-data.mjs`).
 *
 * "Nie otrzymujesz Utrudnienia do testów Skradania się za noszenie pancerza.
 * Otrzymujesz Ułatwienie w Testach Ukrywania się, jeśli nie nosisz ciężkiego
 * pancerza. Trudny teren nie spowalnia twojego ruchu."
 *
 * Jak większość ze 133 zdolności klasowych/profesji, ten feature istniał
 * dotąd wyłącznie jako tekst w packu `neuroshima.zdolnosci-klasowe` — bez
 * mechaniki. Trzy klauzule, dwa różne mechanizmy:
 *
 * ## 1. Trudny teren
 * Czyste pole DataModelu: `system.attributes.movement.ignoredDifficultTerrain`
 * (natywny `SetField`, czytany wprost przez silnik terenu v14 —
 * `data/region-behavior/difficult-terrain.mjs` i `canvas/token.mjs` w dnd5e).
 * Nic w rdzeniu nie nadpisuje tego pola w `prepareDerivedData`, więc zwykły
 * Active Effect (`ADD "all"`) wystarcza i przeżywa cały cykl życia —
 * ten sam wzorzec co kara ruchu w `zranienie.mjs` (`_syncZranieniEffect`),
 * zweryfikowany na żywo (dopisanie/odpisanie "all" do zbioru przez AE).
 *
 * ## 2/3. Skradanie się (Utrudnienie ze zbroi / Ułatwienie do Ukrywania)
 * dnd5e liczy Utrudnienie ze zbroi wprost w `prepareDerivedData`
 * (`armors[0]?.system.properties.has("stealthDisadvantage")` →
 * `AdvantageModeField.setMode(this, "skills.ste.roll.mode", -1)`), więc
 * Active Effect na tym samym polu zostałby nadpisany zaraz po aplikacji —
 * bez odpowiednika `abilities.X.check.roll.mode`, na którym stoi np. Utrudnienie
 * z Upojenia (patrz nagłówek `disease-effects.mjs`). Decyzja zapada więc przy
 * rzucie, przez `dnd5e.postBuildSkillRollConfig` — analogicznie do
 * `dnd5e.postBuildAttackRollConfig`, na którym stoi Współpraca
 * (`pack-tactics.mjs`).
 *
 * **Uwaga historyczna**: klucz umiejętności Skradania się w tym świecie to
 * `"skr"` (`config/skills.mjs`), a rdzeń dnd5e ma na sztywno `"ste"`.
 * Utrudnienie ze zbroi lądowało więc pod `system.skills.ste.roll.mode` — polem,
 * którego nie ma w `CONFIG.DND5E.skills` i którego nic nie czyta, przez co zbroja
 * **nigdy** nie dawała Utrudnienia do Skradania i klauzula 2 nie miała czego
 * kasować. Od v0.11.0 `actors/armor-rules.mjs` przepina tę regułę na `skr`.
 *
 * Klauzula 2 jest przez to realizowana w danych pochodnych, nie tutaj:
 * `registerStealthExemption()` mówi regule pancerza, żeby w ogóle nie nakładała
 * Utrudnienia posiadaczowi zdolności. Hak `dnd5e.postBuildSkillRollConfig`
 * odpala się wyłącznie przez okno dialogowe rzutu, więc anulowanie zrobione
 * tutaj przeciekłoby przy każdym rzucie z pominięciem dialogu.
 *
 * ## Bugfix (2026-08-28): race na `createEmbeddedDocuments`
 * `syncCichyKrokTerrain` wisi na trzech hookach (`createItem`/`deleteItem`/
 * `dnd5e.advancementManagerComplete`). Awans o poziom, który przyznaje Cichy krok
 * razem z czymkolwiek innym (np. Profesję — złapane live na Victorze awansującym
 * na Partnera), tworzy oba itemy w jednym `createEmbeddedDocuments`, więc `createItem`
 * odpala się kilka razy z rzędu, a `advancementManagerComplete` dokłada jeszcze jedno
 * wywołanie — wszystkie asynchroniczne, żadne na nic nie czeka. Efekt: dwa-trzy
 * równoległe wywołania widzą ten sam stan „efektu jeszcze nie ma" (klasyczny
 * check-then-act), więc więcej niż jedno próbuje stworzyć `ActiveEffect` o tym samym
 * stałym `_id` — pierwsze wygrywa, reszta rzuca nieobsłużony wyjątek
 * (`The _id [...] already exists`). Dane nigdy realnie nie psuje się (Foundry
 * odrzuca duplikat po ID), ale konsola i tak wygląda jak awaria.
 *
 * Ten sam kształt błędu (i to samo rozwiązanie) już udokumentowany w
 * `ability-hotbar.mjs` — debounce + serializacja per aktor, żeby seria zdarzeń z
 * jednego awansu skolapsowała się do jednego realnego zapisu.
 */
import { registerStealthExemption } from "./armor-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ABILITY_ID = "cichy-krok";
const STEALTH_SKILL = "skr";
// Musi być dokładnie 16 znaków [A-Za-z0-9] — wymóg Foundry dla _id dokumentu.
const TERRAIN_EFFECT_ID = "neuroCichyKrok01";
const TERRAIN_EFFECT_FLAG = "cichyKrokTeren";

/** Czy aktor ma realny item zdolności klasowej Cichy krok (nie tylko flavour o tej nazwie). */
function _hasCichyKrok(actor) {
  return !!actor?.items?.find(i => i.getFlag(MODULE_ID, "abilityId") === ABILITY_ID);
}

function _isWearingHeavyArmor(actor) {
  return actor?.system?.attributes?.ac?.equippedArmor?.system?.type?.value === "heavy";
}

/**
 * Klauzula "trudny teren cię nie spowalnia" — dopina/odpina statyczny Active
 * Effect w zależności od tego, czy aktor aktualnie posiada zdolność.
 *
 * Not safe to call concurrently on the same actor without the serialisation below —
 * see the bugfix note in the file header. `keepId` means a duplicate create can only
 * ever fail loudly, never actually duplicate the effect, but the try/catch avoids an
 * unhandled promise rejection (and the scary error toast) on the losing call(s).
 */
async function _syncCichyKrokTerrain(actor) {
  if (!actor?.effects) return;
  const existing = actor.effects.get(TERRAIN_EFFECT_ID)
    ?? actor.effects.find(e => e.getFlag(MODULE_ID, TERRAIN_EFFECT_FLAG));
  const hasFeature = _hasCichyKrok(actor);

  if (!hasFeature) {
    if (existing) await existing.delete();
    return;
  }
  if (existing) return; // stan binarny, bez poziomów — nic do zsynchronizowania

  const featureItem = actor.items.find(i => i.getFlag(MODULE_ID, "abilityId") === ABILITY_ID);
  try {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      _id: TERRAIN_EFFECT_ID,
      name: "Cichy krok",
      img: featureItem?.img || "icons/svg/upgrade.svg",
      changes: [{
        key: "system.attributes.movement.ignoredDifficultTerrain",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "all",
        priority: 20
      }],
      flags: { [MODULE_ID]: { [TERRAIN_EFFECT_FLAG]: true } }
    }], { keepId: true });
  } catch (err) {
    // A sibling resync already won the race and created it — not an error from here.
    if (actor.effects.get(TERRAIN_EFFECT_ID)) return;
    throw err;
  }
}

/**
 * Debounced, serialised per actor — collapses the burst of `createItem` calls a
 * single level-up fires (one per granted item, all unawaited) plus the trailing
 * `dnd5e.advancementManagerComplete` into one real sync. Same shape as
 * `ability-hotbar.mjs`'s `queueHotbarSync`/`scheduleHotbarSync`.
 */
const _syncChain = new Map();   // actorId -> tail promise
const _syncTimer = new Map();   // actorId -> debounce timeout

function queueCichyKrokSync(actor) {
  if (!actor?.id) return;
  const prev = _syncChain.get(actor.id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => _syncCichyKrokTerrain(actor));
  _syncChain.set(actor.id, next);
  next.finally(() => { if (_syncChain.get(actor.id) === next) _syncChain.delete(actor.id); });
  return next;
}

function syncCichyKrokTerrain(actor) {
  if (!actor?.id) return;
  clearTimeout(_syncTimer.get(actor.id));
  _syncTimer.set(actor.id, setTimeout(() => {
    _syncTimer.delete(actor.id);
    queueCichyKrokSync(actor);
  }, 150));
}

/**
 * Klauzula "Ułatwienie do Ukrywania się bez ciężkiej zbroi".
 * Klauzula "brak Utrudnienia ze zbroi" siedzi w `armor-rules.mjs` —
 * patrz nagłówek pliku.
 */
function onPostBuildSkillRollConfig(process, rollConfig) {
  try {
    if (process?.skill !== STEALTH_SKILL) return;
    const actor = process?.subject;
    if (!actor || !_hasCichyKrok(actor)) return;
    if (_isWearingHeavyArmor(actor)) return; // klauzula 3 nie ma zastosowania

    rollConfig.options ??= {};
    rollConfig.options.advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
    console.log(`${MODULE_ID} | Cichy krok: ${actor.name} ma Ułatwienie do Skradania (bez ciężkiej zbroi)`);
  } catch (err) {
    console.error(`${MODULE_ID} | Cichy krok (Skradanie) failed`, err);
  }
}

export function registerCichyKrok() {
  Hooks.on("dnd5e.postBuildSkillRollConfig", onPostBuildSkillRollConfig);

  // Klauzula 2: pancerz w ogóle nie nakłada temu aktorowi Utrudnienia do
  // Skradania się. Liczone w danych pochodnych, więc działa też bez dialogu.
  registerStealthExemption(_hasCichyKrok);

  const resync = doc => {
    const actor = doc instanceof Actor ? doc : doc?.parent;
    if (actor instanceof Actor) syncCichyKrokTerrain(actor);
  };
  Hooks.on("createItem", resync);
  Hooks.on("deleteItem", resync);
  Hooks.on("dnd5e.advancementManagerComplete", (_mgr, actor) => syncCichyKrokTerrain(actor));

  // Backfill, jak przy Zranieniu/Chorobach/Upojeniu: postacie, które już mają
  // zdolność (np. Alan, level 3 Zwiadowca sprzed tego pliku), dostają efekt
  // od razu, bez czekania na kolejny createItem/level-up. `syncCichyKrokTerrain`
  // tylko planuje (debounce per aktor) — różne aktory nie dzielą żadnego stanu,
  // więc nie ma potrzeby serializować tej pętli.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) syncCichyKrokTerrain(actor);
  });

  console.log(`${MODULE_ID} | Cichy krok registered`);
}
