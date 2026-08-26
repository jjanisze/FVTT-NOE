/**
 * Neuroshima 5e — Karta Drużyny (§1.16).
 *
 * Ta sama decyzja co przy `sheet-shell.mjs`: cienka podklasa stockowego `GroupActorSheet`
 * odczytanego z żywego rejestru, która przejmuje wyłącznie mapę partów i akcje. Trzy rzeczy,
 * których natywna karta nie umie, a kampania ich potrzebuje:
 *
 *  1. **Stan członka.** Natywny wiersz pokazuje PW i KW. Wyczerpanie i Zranienie — dwa tory,
 *     które w Neuroshimie realnie zabijają — nie były widoczne nigdzie. KW dzieli więc swoją
 *     linijkę na trzy równe segmenty. Poziomy czytamy z rejestru stanów stopniowanych
 *     (`levelled-conditions.mjs`), nie z flag: karta drużyny nie ma prawa wiedzieć, gdzie
 *     Zranienie trzyma dane — dokładnie jak Token HUD.
 *  2. **Podróż.** Natywna karta „Travel Pace” zna trzy tempa i mile na dobę. Podręcznik zna
 *     cztery tempa, metry na minutę i modyfikatory do Percepcji/Survivalu/Skradania — patrz
 *     `party-travel.mjs`.
 *  3. **Zapasy.** Nowa zakładka; prowiant i woda są mechaniką Wyczerpania — patrz
 *     `party-supplies.mjs`.
 *
 * Przy okazji naprawiony natywny błąd: `member.hbs` odwołuje się na sztywno do `skills.ste`,
 * a w tym świecie Skradanie się ma klucz `skr` (`config/skills.mjs`), więc ta kolumna
 * pokazywała pustkę.
 */

import { getLevelledRegistry } from "./levelled-conditions.mjs";
import { EXHAUSTION_SOURCES, getExhaustionSources } from "../config/exhaustion.mjs";
import { getPodroz, setPodroz, buildTravelContext, postTravelSummary, tankuj, ustawBak, paliwoWidok } from "./party-travel.mjs";
import { buildSuppliesContext, consumeDailyNeeds, hunt, cook } from "./party-supplies.mjs";
import { confirmLootClose, forceEndLootSession, lootLockContext } from "./party-loot-lock.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates`;

const HEADER_TEMPLATE = `${TPL}/party-header.hbs`;
const MEMBERS_TEMPLATE = `${TPL}/party-members.hbs`;
const MEMBER_TEMPLATE = `${TPL}/party-member.hbs`;
const ZAPASY_TEMPLATE = `${TPL}/party-tab-zapasy.hbs`;

const PARTY_TABS = [
  { tab: "members", label: "Drużyna", icon: "fas fa-users" },
  { tab: "inventory", label: "Ekwipunek", svg: "systems/dnd5e/icons/svg/backpack.svg" },
  { tab: "zapasy", label: "Zapasy", icon: "fas fa-boxes-stacked" },
  { tab: "biography", label: "Kronika", icon: "fas fa-feather" }
];

/* -------------------------------------------- */
/*  Tory stanu w wierszu członka                 */
/* -------------------------------------------- */

/**
 * Wyczerpanie i Zranienie jako gotowe do wyrenderowania listy pipsów.
 *
 * Wyczerpanie jest natywne, więc adresujemy je wprost, ale kolor każdego pipsa bierzemy
 * ze źródła, które ten poziom spowodowało — tor czyta się wtedy jak lista przyczyn,
 * a nie jak goła liczba. Zranienie przychodzi z rejestru i karta nie zna jego wewnętrznej
 * reprezentacji.
 * @param {Actor5e} actor
 * @returns {Array<object>}
 */
function memberTracks(actor) {
  const tracks = [];
  const exhMax = CONFIG.DND5E.conditionTypes?.exhaustion?.levels ?? 6;
  const sources = getExhaustionSources(actor);
  tracks.push({
    id: "exhaustion",
    short: "WYCZ",
    name: "Wyczerpanie",
    value: actor.system?.attributes?.exhaustion ?? 0,
    max: exhMax,
    sources
  });

  const wound = getLevelledRegistry().get("zranienie");
  if (wound) tracks.push({
    id: "zranienie",
    short: "ZRAN",
    name: wound.label ?? "Zranienie",
    value: wound.get(actor) ?? 0,
    max: wound.max,
    sources: []
  });

  for (const track of tracks) {
    track.pips = Array.fromRange(track.max, 1).map(n => {
      const origin = n <= track.value ? track.sources[n - 1] : null;
      const color = origin ? EXHAUSTION_SOURCES[origin.source]?.color : null;
      return {
        n,
        filled: n <= track.value,
        terminal: n === track.max,
        color,
        tooltip: [`${track.name} ${n}/${track.max}`, origin?.label].filter(Boolean).join(" — ")
      };
    });
    track.tooltip = `${track.name}: ${track.value}/${track.max}`;
  }
  return tracks;
}

/** Wpisz poziom toru; klik w najwyższy zapalony pips cofa o jeden. */
async function setTrackLevel(actor, trackId, n) {
  const current = trackId === "exhaustion"
    ? (actor.system?.attributes?.exhaustion ?? 0)
    : (getLevelledRegistry().get(trackId)?.get(actor) ?? 0);
  const level = n <= current ? n - 1 : n;

  if (trackId === "exhaustion") return actor.update({ "system.attributes.exhaustion": level });
  return getLevelledRegistry().get(trackId)?.set(actor, level);
}

/* -------------------------------------------- */
/*  Akcje                                        */
/* -------------------------------------------- */

/** @this {ApplicationV2} */
async function onTrackPip(event, target) {
  event.preventDefault();
  event.stopPropagation();
  const actor = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
  if (!actor?.isOwner) return;
  await setTrackLevel(actor, target.dataset.trackId, Number(target.dataset.n));
  this.render();
}

/** @this {ApplicationV2} */
async function onToggleTravelFlag(event, target) {
  const key = target.dataset.key;
  await setPodroz(this.actor, { [key]: !getPodroz(this.actor)[key] });
}

/** @this {ApplicationV2} */
async function onSetTravelHours(event, target) {
  await setPodroz(this.actor, { calodobowa: Number(target.dataset.godzin) === 24 });
}

/** @this {ApplicationV2} */
async function onTravelSummary(event, target) {
  await postTravelSummary(this.actor, target.dataset.tryb ?? "segment");
}

/** @this {ApplicationV2} */
async function onRefuel() {
  await tankuj(this.actor);
}

/** @this {ApplicationV2} */
async function onFuelSettings() {
  const pojazd = this.actor.system.primaryVehicle;
  if (pojazd) await ustawBak(pojazd);
}

/** @this {ApplicationV2} */
async function onFeedParty() {
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Dzienne zapotrzebowanie" },
    content: "<p>Zdjąć dzienną rację jedzenia i wody każdemu członkowi drużyny "
      + "i rozliczyć Niedożywienie / Odwodnienie?</p>"
  });
  if (ok) await consumeDailyNeeds(this.actor);
}

/** @this {ApplicationV2} */
async function onHunt() {
  await hunt(this.actor);
}

/** @this {ApplicationV2} */
async function onCook() {
  await cook(this.actor);
}

/** @this {ApplicationV2} */
async function onForceEndLoot() {
  await forceEndLootSession(this.actor);
}

/* -------------------------------------------- */
/*  Klasa                                        */
/* -------------------------------------------- */

/** Klasa karty budowana dopiero w `ready` — patrz `registerPartySheet`. */
function buildPartySheetClass(Base) {
  const cls = class NeuroshimaGroupSheet extends Base {
    static DEFAULT_OPTIONS = {
      classes: ["neuro-party"],
      actions: {
        neuroTrackPip: onTrackPip,
        neuroToggleTravel: onToggleTravelFlag,
        neuroTravelHours: onSetTravelHours,
        neuroTravelSummary: onTravelSummary,
        neuroTankuj: onRefuel,
        neuroBak: onFuelSettings,
        neuroFeed: onFeedParty,
        neuroHunt: onHunt,
        neuroCook: onCook,
        neuroForceEndLoot: onForceEndLoot
      }
    };

    static PARTS = (() => {
      const out = {};
      for (const [key, value] of Object.entries(Base.PARTS)) {
        if (key === "header") out.header = { template: HEADER_TEMPLATE };
        else if (key === "members") out.members = { ...value, template: MEMBERS_TEMPLATE, templates: [MEMBER_TEMPLATE] };
        else out[key] = value;
        if (key === "inventory") out.zapasy = {
          container: { classes: ["tab-body"], id: "tabs" },
          template: ZAPASY_TEMPLATE,
          scrollable: [""]
        };
      }
      return out;
    })();

    static TABS = PARTY_TABS;

    /** @inheritDoc */
    async _prepareHeaderContext(context, options) {
      context = await super._prepareHeaderContext(context, options);
      context.podroz = buildTravelContext(this.actor);
      context.wDrodze = !!getPodroz(this.actor).aktywna;
      context.lootLock = lootLockContext(this.actor);
      return context;
    }

    /** Zamknięcie karty w trakcie podziału łupu = potwierdzenie „biorę, co wzięłam” — patrz party-loot-lock.mjs. */
    async close(options = {}) {
      if (!(await confirmLootClose(this.actor))) return this;
      return super.close(options);
    }

    /** @inheritDoc */
    async _prepareMembersContext(context, options) {
      context = await super._prepareMembersContext(context, options);
      const byId = new Map(this.document.system.members.map(m => [m.actor?.id, m.actor]));
      for (const section of Object.values(context.sections)) {
        for (const member of section.members) {
          const actor = byId.get(member.id);
          const pojazd = actor?.type === "vehicle";
          member.tracks = (actor && !member.hiddenStats && !pojazd) ? memberTracks(actor) : [];
          // Pojazd nie ma KW ani Wyczerpania, więc w tej samej linijce mieści się bak.
          member.paliwo = (pojazd && !member.hiddenStats) ? paliwoWidok(actor) : null;
        }
      }
      return context;
    }

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      if (partId === "zapasy") context.zapasy = buildSuppliesContext(this.actor);
      return context;
    }

    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);
      // Selektory podróży emitują `change`, a `actions` łapie tylko `click`.
      const bind = (attr, patch) => this.element.querySelector(`[${attr}]`)
        ?.addEventListener("change", ev => setPodroz(this.actor, patch(ev.target.value)));
      bind("data-neuro-biom", v => ({ biom: v || null }));
      bind("data-neuro-transport", v => ({ transport: v }));
      bind("data-neuro-tempo", v => ({ tempo: v }));
      bind("data-neuro-trasa", v => ({ trasa: Number(v) || 0 }));
    }
  };
  Object.defineProperty(cls, "name", { value: "NeuroshimaGroupSheet", configurable: true });
  return cls;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/** Klasa karty typu `group` zarejestrowana aktualnie przez dnd5e. */
function stockGroupSheetClass() {
  const registered = CONFIG.Actor.sheetClasses?.group ?? {};
  return Object.entries(registered).find(([id]) => id.startsWith("dnd5e."))?.[1]?.cls ?? null;
}

/**
 * Rejestracja karty drużyny. Wołać z `init`.
 *
 * Podklasa powstaje w `ready` z tego samego powodu co w `sheet-shell.mjs`:
 * `DocumentSheetConfig.registerSheet` kolejkuje wszystko do `game.ready`, więc rejestr,
 * z którego wyciągamy klasę bazową, jest w `init`/`setup` jeszcze pusty.
 */
export function registerPartySheet() {
  Hooks.once("ready", () => {
    const Base = stockGroupSheetClass();
    if (!Base) {
      console.warn("Neuroshima 5e | Brak stockowej karty grupy — karta drużyny nie zarejestrowana");
      return;
    }
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      Actor, MODULE_ID, buildPartySheetClass(Base), {
        types: ["group"],
        // `#registerSheet` liczy "domyślność" osobno na KAŻDYM kliencie (nie zapisuje ustawienia
        // świata) — gating po `game.user.isGM` sprawiał, że tylko MG dostawał naszą kartę jako
        // domyślną, a gracze lądowali na stockowej karcie dnd5e bez podróży/paliwa/blokady łupu.
        makeDefault: true,
        label: "Neuroshima — Karta Drużyny"
      }
    );
    foundry.applications.handlebars.loadTemplates([
      HEADER_TEMPLATE, MEMBERS_TEMPLATE, MEMBER_TEMPLATE, ZAPASY_TEMPLATE
    ]);
    console.log("Neuroshima 5e | Party sheet registered");
  });
}
