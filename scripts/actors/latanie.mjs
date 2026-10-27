/**
 * Neuroshima 5e — latanie (NOE s. 253; PLAN_m6_drobne_zasady.md §5.5, E5, U13).
 *
 * dnd5e 6.0 ma cały mechanizm spadania (`config/spadanie.mjs`): żeton nad niższą powierzchnią dostaje status
 * Spadanie, MG klika ikonę, `TokenDocument5e#plummet` opuszcza żeton ruchem `fall` i wystawia kartę obrażeń. Lotnika
 * (Szybkość lotu) stock strąca przy Powaleniu i Obezwładnieniu, zawsze z obrażeniami. NOE:
 *
 *   - **spada z obrażeniami** przy Nieprzytomności (i śmierci) albo Szybkości 0 — warunek dnd5e `noMovement`
 *     (Pochwycenie, Sparaliżowanie, Unieruchomienie, Wyłączenie drona, Udźwig maksymalny — `config/conditions.mjs`)
 *     albo lot zbity do 0 karami po efektach (Wyczerpanie);
 *   - **opada bez obrażeń** przy samym Powaleniu — ten sam ruch `fall`, bez karty (U13);
 *   - **samo Obezwładnienie nie strąca** (Ogłuszenie też nie) — NOE wymienia tylko Nieprzytomność i Szybkość 0.
 *
 * Lotnik to aktor z Szybkością lotu **przed** stanami: Powalenie i `noMovement` zerują dnd5e pochodny lot, więc
 * czytamy go ze źródła i z nadpisań efektów (`actor.overrides` — plecak odrzutowy na efekcie też się liczy).
 * Unoszenie się (`movement.hover`) i niewrażliwość na Spadanie zostają jak w dnd5e. Opakowanie metod na prototypie
 * dokumentu żetonu (wzorzec `actors/drony.mjs`); `_isFalling` jest `@internal` — dnd5e przypięty na betę, kontrakt
 * pilnuje e2e `latanie`.
 */

const _f = Object.freeze;

/** Powody spadania lotnika. `obrazenia: false` — opada bez karty. */
export const POWODY_SPADANIA = _f({
  nieprzytomny: _f({ label: "Nieprzytomność", obrazenia: true }),
  szybkosc0: _f({ label: "Szybkość 0", obrazenia: true }),
  powalony: _f({ label: "Powalenie", obrazenia: false })
});

/**
 * Czysta reguła: czy aktor jest lotnikiem i dlaczego (jeśli w ogóle) spada.
 * @param {object} s
 * @param {number} s.lotBazowy        Szybkość lotu przed stanami (źródło + efekty)
 * @param {number} s.lot              pochodna Szybkość lotu (po stanach i karach)
 * @param {Set<string>} s.statusy     statusy aktora
 * @param {boolean} s.bezRuchu        warunek dnd5e `noMovement`
 * @returns {{lotnik: boolean, powod: "nieprzytomny"|"szybkosc0"|"powalony"|null}}
 */
export function spadanieLotnika({ lotBazowy = 0, lot = 0, statusy = new Set(), bezRuchu = false } = {}) {
  if (!(Number(lotBazowy) > 0)) return { lotnik: false, powod: null };
  let powod = null;
  if (statusy.has("unconscious") || statusy.has("dead")) powod = "nieprzytomny";
  else if (bezRuchu) powod = "szybkosc0";
  else if (statusy.has("prone")) powod = "powalony";
  else if (!(Number(lot) > 0)) powod = "szybkosc0";
  return { lotnik: true, powod };
}

/**
 * Szybkość danego rodzaju przed stanami (Powalenie i `noMovement` zerują pochodną): nadpisanie efektu, inaczej źródło;
 * formuła liczona danymi rzutu aktora. Też dla pływania (`scenes/woda.mjs`).
 * @param {Actor} actor
 * @param {string} typ  `fly`, `swim`…
 */
export function szybkoscPrzedStanami(actor, typ) {
  const klucz = `system.attributes.movement.speeds.${typ}`;
  const o = actor?.overrides ?? {};
  const f = foundry.utils.getProperty(o, klucz) ?? o[klucz] ?? foundry.utils.getProperty(actor?._source ?? {}, klucz);
  if (f === null || f === undefined || f === "") return 0;
  if (Number.isNumeric(f)) return Number(f);
  try { return dnd5e.utils.simplifyBonus(f, actor.getRollData()); } catch { return 0; }
}

/** Stan lotnika dla aktora (`game.neuroshima.latanie.stanLotnika`). */
export function stanLotnika(actor) {
  if (!actor?.system?.attributes?.movement) return { lotnik: false, powod: null };
  return spadanieLotnika({
    lotBazowy: szybkoscPrzedStanami(actor, "fly"),
    lot: actor.system.attributes.movement.speeds?.fly,
    statusy: actor.statuses ?? new Set(),
    bezRuchu: !!actor.hasConditionEffect?.("noMovement")
  });
}

/* -------------------------------------------- */
/*  Opakowania dnd5e                             */
/* -------------------------------------------- */

/** Ten sam test powierzchni co dnd5e: pod żetonem jest niższa powierzchnia albo podstawa poziomu. */
function _nadPowierzchnia(token, position) {
  const actor = token.actor;
  if (actor.system.traits?.ci?.value?.has?.("falling")) return false;
  if (actor.system.attributes?.movement?.hover) return false;
  const surface = token._findSupportingSurface({ position });
  return !!surface && (surface.elevation < position.elevation);
}

/** Powalony lotnik (U13): ruch `fall` jak `plummet`, bez karty obrażeń i bez efektu lądowania. */
async function _opadnij(token) {
  const actor = token.actor;
  if (!actor?.statuses.has("falling") || !actor.canUserModify(game.user, "update")) return;
  const surface = token._findSupportingSurface();
  if (!surface || (surface.elevation >= token.elevation)) {
    ui.notifications.warn("DND5E.FALLING.Warning.NoLandingSurface", { format: { name: token.name } });
    return;
  }
  const waypoint = { action: "fall", elevation: surface.elevation };
  if (surface.level && (surface.level.id !== token._source.level)) waypoint.level = surface.level.id;
  await token.move(waypoint, { animate: false });
  ui.notifications.info(`${token.name}: Powalenie — lotnik opada bez obrażeń (s. 253).`);
}

function _owinSpadanie() {
  const proto = CONFIG.Token.documentClass.prototype;
  const isFalling = proto._isFalling;
  proto._isFalling = function ({ position = this._source } = {}) {
    const s = stanLotnika(this.actor);
    if (!s.lotnik) return isFalling.call(this, { position });
    return !!s.powod && _nadPowierzchnia(this, position);
  };
  const plummet = proto.plummet;
  proto.plummet = function (...args) {
    if (stanLotnika(this.actor).powod === "powalony") return _opadnij(this);
    return plummet.apply(this, args);
  };
}

export function registerLatanie() {
  // Przy `init`: żetony scen przygotowują się przed `setup`.
  _owinSpadanie();
}

/** `game.neuroshima.latanie` */
export const latanieApi = _f({ stanLotnika, spadanieLotnika });

