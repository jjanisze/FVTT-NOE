/**
 * Neuroshima 5e — towarzysze w walce (PLAN_m3_towarzysze.md §7.5, E2).
 *
 * RAW (§3.3): Partner „ma swoją turę zawsze po twojej turze”, oswojone zwierzę „działa natychmiast po
 * twojej turze”, Prawa ręka też — ale z pełną kontrolą. Partner i zwierzę działają tylko na Komendę z
 * Akcji Bonusowej właściciela; bez niej unikają walki akcją Unikanie. Dron tury nie ma (D35) — jego
 * aktywacje to E7.
 *
 *   - **Grupa (D1, U7)** — właściciel i jego towarzysze-istoty w jednej `CombatantGroup` dnd5e: wspólna
 *     inicjatywa, rzuca właściciel. Grupę tworzy aktywny MG, gdy właściciel albo towarzysz dołącza do walki;
 *     towarzysz z żetonem na scenie walki dołącza sam. Grupa ma własność graczy właściciela — bez niej rzut
 *     gracza nie dochodzi do grupy i ginie po cichu (spike E0).
 *   - **Kolejność (U7)** — kotwica tury (`combat/kotwica-tury.mjs`, M4 D39 — jedno owinięcie
 *     `Combat#_sortCombatants` dla towarzyszy, pasażerów i wierzchowców): towarzysz porównywany jak właściciel, w parze
 *     właściciel pierwszy (dnd5e przy remisie sortuje alfabetycznie — F9). `CombatantGroup#activeCombatant`
 *     = właściciel (dnd5e: najniższe id). Grupa rozwinięta, gdy klient zobaczy ją pierwszy raz.
 *   - **Rzut towarzysza** idzie na właściciela: rzut za towarzysza w grupie zmieniłby inicjatywę grupy.
 *   - **Komenda (D2, U8)** — aktywność „Komenda” na zdolności źródłowej (Partner, Oswajanie zwierząt) albo
 *     `game.neuroshima.towarzysze.komenda(właściciel)`. Wydana w turze właściciela zatrzaskuje turę jego
 *     towarzyszy w tej rundzie (`flags.<mod>.komenda`). Kosztu akcji nie liczymy — karta to sygnał.
 *   - **Początek tury towarzysza** (aktywny MG, tylko krok naprzód, raz na turę): zatrzask — zwykła tura;
 *     brak — Unikanie do początku jego następnej tury, karta „bez komendy” i `nextTurn()`. Karta ma
 *     **[Cofnij — była komenda]** dla MG: zdejmuje Unikanie, zatrzaskuje i wraca do tury towarzysza.
 *     Towarzysz przy 0 PW ma swoją turę zawsze — rzuca przeciw śmierci.
 */

import { RODZAJE, TURY, ZRODLA } from "../config/towarzysze-data.mjs";
import { decyzjaTury } from "../config/towarzysze-rules.mjs";
import { towarzysz, towarzyszeWlasciciela } from "../actors/towarzysze.mjs";
import { krokNaprzod, tikRaz } from "./tiki.mjs";
import { PRIORYTET_KOTWICY, registerKotwicaTury, zarejestrujKotwice } from "./kotwica-tury.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** `flags.<mod>.komenda = { combatId, runda }` na towarzyszu (U8). */
export const FLAG_KOMENDA = "komenda";
/** `flags.<mod>.towarzysze = <uuid właściciela>` na grupie. */
const FLAG_GRUPA = "towarzysze";
/** Karta „bez komendy”: `{ combatId, runda, combatantId, actorUuid, cofniete }`. */
const KARTA = "bezKomendy";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _jestWykonawca = () => game.users.activeGM?.isSelf ?? false;

/* -------------------------------------------- */
/*  Kotwica — uczestnik właściciela              */
/* -------------------------------------------- */

/** Czy rodzaj towarzysza ma własną turę po właścicielu (istoty — nie dron, D35). */
function _maTurePoWlascicielu(actor) {
  const t = towarzysz(actor);
  return !!t && RODZAJE[t.rodzaj].tura !== TURY.operator;
}

/** Uczestnik właściciela w tej samej walce albo `null`. Wołane bez `this` (rdzeń sortuje funkcją wolną). */
function _kotwica(combatant) {
  const actor = combatant?.actor;
  if (!_maTurePoWlascicielu(actor)) return null;
  const uuid = towarzysz(actor).wlasciciel;
  return combatant.parent?.combatants.find(o => o !== combatant && o.actor?.uuid === uuid) ?? null;
}

/** Aktor właściciela, gdy jest uczestnikiem walki towarzysza — do przekierowania rzutu. */
function _wlascicielWWalce(actor, combat = game.combat) {
  if (!combat || !_maTurePoWlascicielu(actor)) return null;
  const uuid = towarzysz(actor).wlasciciel;
  return combat.combatants.find(c => c.actor?.uuid === uuid) ?? null;
}

/* -------------------------------------------- */
/*  Owinięcia: kolejność, grupa, rzut            */
/* -------------------------------------------- */

const _widzianeGrupy = new Set();

function _owin() {
  const CombatCls = CONFIG.Combat.documentClass;
  const proto = CombatCls.prototype;

  // Kolejność i rzut za towarzysza (rzuca właściciel) — rejestr kotwic tury (M4 D39), jedno owinięcie dla wszystkich.
  // Inicjatywę towarzysza trzyma grupa, więc kotwica jej nie wyrównuje.
  registerKotwicaTury();
  zarejestrujKotwice("towarzysz", _kotwica, { priorytet: PRIORYTET_KOTWICY.towarzysz });

  if (typeof proto.createGroups === "function") {
    const createGroups = proto.createGroups;
    proto.createGroups = function (...args) {
      const groups = createGroups.apply(this, args);
      for (const [key, g] of groups) {
        if (_widzianeGrupy.has(key) || !this.groups?.get(key)?.getFlag(MODULE_ID, FLAG_GRUPA)) continue;
        _widzianeGrupy.add(key);
        this.expandedGroups?.add(key);
        g.expanded = true;
      }
      return groups;
    };
  }

  const GroupCls = CONFIG.CombatantGroup?.documentClass;
  const desc = GroupCls && Object.getOwnPropertyDescriptor(GroupCls.prototype, "activeCombatant");
  if (desc?.get) {
    Object.defineProperty(GroupCls.prototype, "activeCombatant", {
      ...desc,
      get() {
        const uuid = this.getFlag?.(MODULE_ID, FLAG_GRUPA);
        if (uuid) {
          for (const c of this.members ?? []) if (c.actor?.uuid === uuid) return c;
        }
        return desc.get.call(this);
      }
    });
  }

  // Okno inicjatywy z karty towarzysza (przycisk w trackerze dnd5e) — okno właściciela.
  const ActorProto = CONFIG.Actor.documentClass.prototype;
  const dialog = ActorProto.rollInitiativeDialog;
  if (typeof dialog === "function") {
    ActorProto.rollInitiativeDialog = function (...args) {
      const w = _wlascicielWWalce(this);
      if (w?.actor && w.actor !== this) {
        if (w.initiative !== null && w.initiative !== undefined) {
          ui.notifications.info(`${this.name} działa po ${w.actor.name} — inicjatywę ma z jego rzutu.`);
          return null;
        }
        return w.actor.rollInitiativeDialog(...args);
      }
      return dialog.apply(this, args);
    };
  }
}

/* -------------------------------------------- */
/*  Grupa — aktywny MG                           */
/* -------------------------------------------- */

const _doUporzadkowania = new Set();
let _zaplanowane = false;
/**
 * Przebiegi idą po kolei: przebieg dodaje uczestnika towarzysza, a `createCombatant` planuje następny,
 * zanim pierwszy utworzy grupę — równolegle oba tworzyły grupę (e2e `towarzysz`: dwie grupy, jedna pusta).
 */
let _kolejka = Promise.resolve();

function _zaplanuj(combat) {
  if (!combat || !_jestWykonawca()) return;
  _doUporzadkowania.add(combat);
  if (_zaplanowane) return;
  _zaplanowane = true;
  setTimeout(() => {
    _zaplanowane = false;
    const lista = [..._doUporzadkowania];
    _doUporzadkowania.clear();
    _kolejka = _kolejka.then(async () => {
      for (const c of lista) {
        try {
          if (game.combats.has(c.id)) await uporzadkujGrupy(c);
        } catch (err) {
          console.error(`${MODULE_ID} | grupa towarzyszy w walce ${c.id}`, err);
        }
      }
    });
  }, 0);
}

/** Własność grupy: gracze-właściciele aktora właściciela (żeby ich rzut doszedł do grupy). */
function _wlasnoscGrupy(owner) {
  const own = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
  for (const u of game.users) {
    if (!u.isGM && owner.testUserPermission(u, "OWNER")) own[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }
  return own;
}

/**
 * Grupy właścicieli z towarzyszami w walce (D1, U7). Idempotentne. Towarzysz z żetonem na scenie walki,
 * którego jeszcze nie ma, dołącza jako uczestnik.
 * @param {Combat} combat
 */
export async function uporzadkujGrupy(combat) {
  if (!game.user.isGM || !combat) return;
  const scene = combat.scene;
  const owners = new Map(); // uuid właściciela → uczestnik
  for (const c of combat.combatants) {
    if (c.actor && towarzyszeWlasciciela(c.actor).some(_maTurePoWlascicielu)) owners.set(c.actor.uuid, c);
  }
  if (!owners.size) return;

  // Towarzysze z żetonem na scenie walki — do walki razem z właścicielem.
  const nowi = [];
  for (const ownerC of owners.values()) {
    for (const comp of towarzyszeWlasciciela(ownerC.actor).filter(_maTurePoWlascicielu)) {
      if (combat.combatants.some(c => c.actor?.uuid === comp.uuid)) continue;
      const tok = scene?.tokens.find(t => t.actorId === comp.id);
      if (tok) nowi.push({ tokenId: tok.id, sceneId: scene.id, actorId: comp.id, hidden: tok.hidden });
    }
  }
  if (nowi.length) await combat.createEmbeddedDocuments("Combatant", nowi);

  for (const [uuid, ownerC] of owners) {
    const comps = combat.combatants.filter(c => c !== ownerC && _maTurePoWlascicielu(c.actor)
      && towarzysz(c.actor).wlasciciel === uuid);
    if (!comps.length) continue;
    let group = combat.groups.find(g => g.getFlag(MODULE_ID, FLAG_GRUPA) === uuid);
    if (!group) {
      [group] = await combat.createEmbeddedDocuments("CombatantGroup", [{
        name: ownerC.actor.name, img: ownerC.img ?? ownerC.actor.img, initiative: ownerC.initiative ?? null,
        ownership: _wlasnoscGrupy(ownerC.actor),
        flags: { [MODULE_ID]: { [FLAG_GRUPA]: uuid } }
      }]);
    }
    const zmiany = [ownerC, ...comps].filter(c => c._source.group !== group.id).map(c => ({ _id: c.id, group: group.id }));
    if (zmiany.length) await combat.updateEmbeddedDocuments("Combatant", zmiany);
  }
}

/* -------------------------------------------- */
/*  Komenda (D2, U8)                             */
/* -------------------------------------------- */

/** Zdolności źródłowe z Komendą → rodzaje, które słuchają. */
const ZRODLA_KOMENDY = Object.freeze(Object.fromEntries(
  Object.entries(ZRODLA)
    .filter(([, z]) => z.rodzaje.some(r => RODZAJE[r].tura === TURY.komenda))
    .map(([id, z]) => [id, z.rodzaje.filter(r => RODZAJE[r].tura === TURY.komenda)])
));

/**
 * Komenda właściciela: w jego turze trwającej walki zatrzaskuje turę towarzyszy w tej rundzie (U8).
 * Poza walką albo poza turą właściciela — tylko karta. Zwraca towarzyszy, którym zatrzasnęła turę.
 * @param {Actor} owner
 * @param {{zrodlo?: string|null}} [o]  zdolność źródłowa — tylko jej rodzaje słuchają
 * @returns {Promise<Actor[]>}
 */
export async function wydajKomende(owner, { zrodlo = null } = {}) {
  if (!owner) return [];
  const rodzaje = zrodlo ? (ZRODLA_KOMENDY[zrodlo] ?? []) : Object.values(ZRODLA_KOMENDY).flat();
  const komu = towarzyszeWlasciciela(owner).filter(c => rodzaje.includes(towarzysz(c).rodzaj));
  if (!komu.length) {
    ui.notifications.warn(`${owner.name}: nie ma towarzysza, który słucha tej komendy.`);
    return [];
  }
  const combat = game.combat;
  const wTurze = !!combat?.started && combat.combatant?.actor?.uuid === owner.uuid;
  const zatrzasniete = [];
  if (wTurze) {
    for (const c of komu) {
      if (!c.isOwner) {
        ui.notifications.warn(`Brak uprawnień do zapisu na ${c.name} — komendę zatrzaśnie MG.`);
        continue;
      }
      await c.setFlag(MODULE_ID, FLAG_KOMENDA, { combatId: combat.id, runda: combat.round });
      zatrzasniete.push(c);
    }
  }
  const imiona = komu.map(c => `<strong>${esc(c.name)}</strong>`).join(", ");
  const dopisek = !combat?.started ? ""
    : wTurze ? (zatrzasniete.length ? " Działa w swojej turze, zaraz po tobie." : "")
      : " <em>Poza turą właściciela — tury nie zatrzaskuje.</em>";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: owner }),
    content: `<div class="neuro-komenda"><i class="fa-solid fa-bullhorn"></i> Komenda dla: ${imiona}.${dopisek}</div>`,
    flags: { [MODULE_ID]: { komendaWydana: { owner: owner.uuid, komu: komu.map(c => c.uuid) } } }
  });
  return zatrzasniete;
}

function _onPostUseActivity(activity) {
  const id = activity?.item?.getFlag?.(MODULE_ID, "abilityId");
  if (!ZRODLA_KOMENDY[id]) return;
  wydajKomende(activity.actor, { zrodlo: id });
}

/* -------------------------------------------- */
/*  Początek tury towarzysza                     */
/* -------------------------------------------- */

const _tekstUnikania = rodzaj => (RODZAJE[rodzaj]?.typAktora === "npc" && RODZAJE[rodzaj].zrodlo === "oswajanie-zwierzat"
  ? "nie przemieszcza się i używa akcji Unikanie (s. 99)"
  : "unika walki, broni się akcją Unikanie i szuka osłony (s. 100)");

async function _onTurnChange(combat, prior, current) {
  if (!_jestWykonawca() || !krokNaprzod(prior, current)) return;
  const combatant = combat.combatants.get(current?.combatantId);
  const actor = combatant?.actor;
  const t = towarzysz(actor);
  if (!t || RODZAJE[t.rodzaj].tura !== TURY.komenda) return;
  // Przy 0 PW tura jest na Rzut Przeciw Śmierci; martwy nie działa wcale.
  if ((actor.system.attributes?.hp?.value ?? 1) <= 0 || actor.statuses.has("dead")) return;

  const decyzja = decyzjaTury(t.rodzaj, { zatrzask: actor.getFlag(MODULE_ID, FLAG_KOMENDA), combatId: combat.id, runda: current.round });
  if (decyzja !== "unikanie") return;
  if (!await tikRaz(actor, "komenda", combat, { round: current.round, combatantId: combatant.id, krawedz: "start" })) return;

  if (!actor.statuses.has("dodging")) await actor.toggleStatusEffect("dodging", { active: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-bez-komendy"><p><i class="fa-solid fa-shield-halved"></i> <strong>${esc(actor.name)}</strong> — `
      + `bez komendy: ${_tekstUnikania(t.rodzaj)}. Tura pominięta.</p>`
      + `<button type="button" class="neuro-komenda-cofnij" data-tylko="mg"><i class="fa-solid fa-rotate-left"></i> Cofnij — była komenda</button></div>`,
    flags: { [MODULE_ID]: { [KARTA]: { combatId: combat.id, runda: current.round, combatantId: combatant.id, actorUuid: actor.uuid } } }
  });
  // Ta tura się nie odbywa; jeśli MG już ją przestawił, nie przeskakujemy cudzej.
  if (combat.combatant?.id === combatant.id) await combat.nextTurn();
}

/** [Cofnij — była komenda] (MG): zdejmuje Unikanie, zatrzaskuje i wraca do tury towarzysza. */
export async function cofnijPominiecie(message) {
  const k = message?.getFlag(MODULE_ID, KARTA);
  if (!game.user.isGM || !k || k.cofniete) return false;
  const combat = game.combats.get(k.combatId);
  const actor = fromUuidSync(k.actorUuid);
  if (!combat || !actor) {
    ui.notifications.warn("Walka albo towarzysz już nie istnieje.");
    return false;
  }
  await actor.setFlag(MODULE_ID, FLAG_KOMENDA, { combatId: combat.id, runda: k.runda });
  if (actor.statuses.has("dodging")) await actor.toggleStatusEffect("dodging", { active: false });
  const idx = combat.turns.findIndex(c => c.id === k.combatantId);
  const przed = combat.round > k.runda || (combat.round === k.runda && combat.turn > idx);
  if (idx >= 0 && przed) await combat.update({ round: k.runda, turn: idx });
  await message.update({
    content: message.content.replace(/<button[^>]*neuro-komenda-cofnij[\s\S]*?<\/button>/, "<p><em>Cofnięte — komenda była.</em></p>"),
    [`flags.${MODULE_ID}.${KARTA}.cofniete`]: true
  });
  return true;
}

function _onRenderMessage(message, html) {
  if (!message.getFlag(MODULE_ID, KARTA)) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  for (const btn of el?.querySelectorAll(".neuro-komenda-cofnij") ?? []) {
    if (!game.user.isGM) { btn.remove(); continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      await cofnijPominiecie(message);
    });
  }
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerTowarzyszeWalka() {
  _owin();
  Hooks.on("createCombatant", combatant => _zaplanuj(combatant.parent));
  Hooks.on("combatStart", combat => _zaplanuj(combat));
  Hooks.on("combatTurnChange", _onTurnChange);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("renderChatMessageHTML", _onRenderMessage);
  console.log(`${MODULE_ID} | Towarzysze w walce registered (grupa, kolejność, Komenda)`);
}

export const towarzyszeWalkaApi = Object.freeze({ komenda: wydajKomende, uporzadkujGrupy, cofnijPominiecie });
