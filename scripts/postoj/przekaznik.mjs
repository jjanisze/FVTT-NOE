/**
 * Neuroshima 5e — przekaźnik MG dla M5 (PLAN_m5_postoj.md §7.21, U53).
 *
 * Gracz pisze tylko własnego aktora. Zapis do cudzego (Fuks z Gotowania dla całej drużyny, Fant
 * kilkuosobowy, stan trupa, towar handlarza) idzie prośbą: klient gracza kładzie ją na **własnym** aktorze
 * (`flags.<mod>.postojProsby.<nonce>`), aktywny MG wykonuje ją w `updateActor` i zdejmuje — ten sam wzorzec
 * co prośby umierania (`combat/umieranie.mjs`), tylko z kolejką po `nonce`, żeby dwie prośby z rzędu się
 * nie nadpisały. U MG prośba wykonuje się od razu.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const FLAGA = "postojProsby";

/** @type {Map<string, (nosiciel: Actor, dane: object, user: User|null) => Promise<any>>} */
const OBSLUGA = new Map();

/** Rejestruje wykonawcę prośby danego typu (wołany u MG). */
export function zarejestrujProsbe(typ, fn) {
  OBSLUGA.set(typ, fn);
}

/** Aktor, którego ten klient może zapisać — nosiciel prośby. */
export function nosicielDlaUzytkownika(preferowany = null) {
  if (preferowany?.isOwner) return preferowany;
  if (game.user.character?.isOwner) return game.user.character;
  return game.actors.find(a => a.isOwner && a.type === "character") ?? null;
}

/**
 * Wykonaj u MG. U MG — od razu (zwraca wynik); u gracza — prośba na nosicielu (zwraca `null`).
 * @param {string} typ
 * @param {object} dane     dane do serializacji (UUID-y, liczby)
 * @param {{nosiciel?: Actor|null}} [o]
 */
export async function doMG(typ, dane, { nosiciel = null } = {}) {
  if (game.user.isGM) return _wykonaj(typ, null, dane, game.user);
  if (!game.users.activeGM) {
    ui.notifications.warn("Brak MG online — ta akcja czeka na MG.");
    return null;
  }
  const n = nosicielDlaUzytkownika(nosiciel);
  if (!n) {
    ui.notifications.warn("Nie masz postaci, przez którą można poprosić MG.");
    return null;
  }
  const nonce = foundry.utils.randomID();
  await n.update({ [`flags.${MODULE_ID}.${FLAGA}.${nonce}`]: { typ, dane, by: game.user.id, t: Date.now() } });
  return null;
}

async function _wykonaj(typ, nosiciel, dane, user) {
  const fn = OBSLUGA.get(typ);
  if (!fn) {
    console.warn(`${MODULE_ID} | przekaźnik M5: nieznany typ prośby „${typ}”`);
    return null;
  }
  return fn(nosiciel, dane, user);
}

async function _onUpdateActor(actor, changes) {
  if (!game.users.activeGM?.isSelf) return;
  const nowe = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAGA}`);
  if (!nowe || typeof nowe !== "object") return;
  for (const [nonce, p] of Object.entries(nowe)) {
    if (nonce.startsWith("-=") || !p?.typ) continue;
    try { await _wykonaj(p.typ, actor, p.dane ?? {}, game.users.get(p.by) ?? null); } catch (err) {
      console.error(`${MODULE_ID} | przekaźnik M5: ${p.typ}`, err);
    } finally {
      await actor.update({ [`flags.${MODULE_ID}.${FLAGA}.-=${nonce}`]: null });
    }
  }
}

export function registerPrzekaznik() {
  Hooks.on("updateActor", _onUpdateActor);
}
