/**
 * NOE — wiersze treści na kartach (PLAN_m9_style.md §3, K6–K10; ID 01–02).
 *
 * dnd5e rysuje wiersz przedmiotu i zdolności; ten moduł dopisuje do niego sygnały języka NOE,
 * tą samą drogą co reszta karty (hook renderu + DOM, wzorzec `sheet-shell.mjs`, D19):
 *
 *  - znak kosztu A/B/R/I przed nazwą — zamiast słów „Akcja dodatkowa” w podpisie,
 *  - glif w opakowaniu `.noe-glyph` i czerwony skos, gdy *operacja* jest niedostępna,
 *  - powód i stan pod nazwą, widoczne bez hover: brak użyć, zakaz, działający efekt,
 *    ostrzeżenie budżetu tury,
 *  - akcent źródła na nagłówku sekcji klasy i Pochodzenia.
 *
 * Projekcja czyta wyłącznie jawne dane: aktywności przedmiotu, jego użycia, stan zdolności
 * (`class-state.mjs`) i budżet tury z M8 (`combat/ekonomia.mjs`). Nie ma drugiego licznika
 * i niczego nie blokuje: ostrzeżenie zostaje ostrzeżeniem, a brak danych — brakiem danych.
 * Pasywności nie wyprowadzamy z braku kosztu ani z koloru obrazka.
 */
import { badge, costOf, costSign, el, COSTS } from "./noe.mjs";
import { sourceOf } from "./theme.mjs";
import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { isStateActive } from "../actors/class-state.mjs";
import { stan } from "../combat/ekonomia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Okres odnowienia użyć słowami — powód „0 użyć” ma mówić, kiedy wrócą. */
const RECOVERY = Object.freeze({
  sr: "krótki odpoczynek", lr: "długi odpoczynek", day: "następny dzień", dawn: "świt", dusk: "zmierzch",
  turn: "następna tura", round: "następna runda", turnStart: "początek tury", turnEnd: "koniec tury", initiative: "rzut na Inicjatywę"
});

/**
 * Koszty aktywności przedmiotu.
 * @returns {{costs: {cost: string}[], mixed: boolean, count: number}}
 *   `costs` — znak dla wiersza rodzica: jeden wspólny koszt A/B/R/I wszystkich aktywności albo nic.
 *   `mixed` — aktywności o różnych kosztach: znak należy do operacji, nie do rodzica.
 * Inny czas (minuta, wyzwalacz, „specjalna”) nie ma figury — zostaje wypisany w podpisie dnd5e.
 */
export function costsOf(item) {
  const activities = [...(item?.system?.activities ?? [])];
  const seen = new Set();
  for (const activity of activities) {
    const type = activity.activation?.type;
    if (!type || type === "none") continue;
    seen.add(costOf(type) ?? `other:${type}`);
  }
  const only = seen.size === 1 ? [...seen][0] : null;
  return { costs: only && COSTS[only] ? [{ cost: only }] : [], mixed: seen.size > 1, count: activities.length };
}

/** Podpis wiersza zdolności: rodzaj · źródło — z flag budowniczego, nie z nazwy pliku. */
export function captionOf(item) {
  if (item?.type !== "feat") return null;
  const flags = item.flags?.[MODULE_ID] ?? {};
  if (flags.sztuczka) return "Sztuczka";
  if (flags.originAbilityId) return "Zdolność z Pochodzenia";
  if (flags.source === "profesja") {
    const profession = item.actor?.itemTypes?.subclass?.find(s => s.flags?.[MODULE_ID]?.professionId === flags.owner);
    return profession ? `Zdolność profesji · ${profession.name}` : "Zdolność profesji";
  }
  if (flags.source === "klasa" || flags.source === "opcja") return "Zdolność klasowa";
  return null;
}

/**
 * Stan wiersza z jawnych danych.
 * @param {Item} item
 * @param {object} [context]
 * @param {object|null} [context.budget]  Wynik `stan(actor)` z M8 albo `null` poza walką.
 * @returns {{costs: object[], mixed: boolean, unavailable: boolean, notes: {kind: string, text: string, title?: string}[]}}
 */
export function projectRow(item, { budget = null } = {}) {
  const { costs, mixed } = costsOf(item);
  const notes = [];
  let unavailable = false;

  // Działający efekt zdolności — niezależny od gotowości kolejnego użycia.
  const abilityId = item.getFlag?.(MODULE_ID, "abilityId");
  const toggle = abilityId ? CLASS_FEATURES[abilityId]?.toggle : null;
  if (toggle && item.actor && isStateActive(item.actor, toggle.effect)) notes.push({ kind: "on", text: "WŁ.", title: "Efekt tej zdolności działa" });

  // Zasób użyć: zero to niedostępne kolejne użycie — z powodem i terminem odnowienia.
  const uses = item.system?.uses;
  const max = Number(uses?.max) || 0;
  if (max > 0 && Number(uses?.value ?? 0) <= 0 && item.type !== "weapon") {
    const period = uses?.recovery?.[0]?.period;
    unavailable = true;
    notes.push({ kind: "ban", text: `Brak użyć${RECOVERY[period] ? ` · ${RECOVERY[period]}` : ""}`, title: "Skos dotyczy kolejnego użycia; korzyści stałe działają dalej" });
  }

  // Budżet tury (M8): zakaz to niedostępna operacja; wydana pula to tylko ostrzeżenie — bez skosu.
  const single = costs.length === 1 && COSTS[costs[0].cost] ? costs[0].cost.toUpperCase() : null;
  const pool = single ? budget?.pule?.[single] : null;
  if (pool?.zakaz) {
    unavailable = true;
    notes.push({ kind: "ban", text: `Zakaz · ${pool.zakaz}` });
  } else if (pool && pool.pozostalo <= 0 && !unavailable) {
    notes.push({ kind: "warn", text: `Ostrzeżenie · ${single} wydana, możesz użyć`, title: "Budżet tury ostrzega, niczego nie blokuje" });
  }
  return { costs, mixed, unavailable, notes };
}

/* -------------------------------------------- */
/*  DOM                                          */
/* -------------------------------------------- */

/** Zdejmij słowo aktywacji z podpisu dnd5e — mówi je już znak kosztu. */
function _trimSubtitle(subtitle, item) {
  if (!subtitle) return;
  const labels = new Set();
  for (const activity of item.system?.activities ?? []) {
    const type = activity.activation?.type;
    const key = globalThis.CONFIG?.DND5E?.activityActivationTypes?.[type]?.label;
    if (key && costOf(type)) labels.add(game.i18n.localize(key));
  }
  if (!labels.size) return;
  const parts = subtitle.textContent.split("•").map(s => s.trim()).filter(p => p && !labels.has(p));
  subtitle.textContent = parts.join(" • ");
  subtitle.hidden = !parts.length;
}

function _decorateRow(li, item, budget) {
  const name = li.querySelector(":scope > .item-row > .item-name");
  const title = name?.querySelector(".name-stacked .title, .name .title");
  if (!name || !title) return;
  const row = projectRow(item, { budget });

  // Poprzednia dekoracja znika: karta odświeża wiersze także w miejscu (budżet tury).
  for (const old of li.querySelectorAll(":scope > .item-row .noe-cost, :scope > .item-row .noe-row-state")) old.remove();

  for (const c of [...row.costs].reverse()) title.prepend(el(costSign(c.cost)));
  let subtitle = name.querySelector(".name-stacked .subtitle");
  if (row.costs.length) _trimSubtitle(subtitle, item);
  const caption = captionOf(item);
  if (caption && (!subtitle || subtitle.hidden || !subtitle.textContent.trim() || subtitle.dataset.noeCaption)) {
    if (!subtitle) {
      subtitle = document.createElement("span");
      subtitle.className = "subtitle";
      title.after(subtitle);
    }
    subtitle.dataset.noeCaption = "1";
    subtitle.textContent = caption;
    subtitle.hidden = false;
  }

  const image = name.querySelector(":scope > .item-image, :scope > .noe-glyph > .item-image");
  if (image) {
    let wrap = image.parentElement.classList.contains("noe-glyph") ? image.parentElement : null;
    if (!wrap) {
      wrap = document.createElement("span");
      wrap.className = "noe-glyph";
      image.replaceWith(wrap);
      wrap.append(image);
    }
    wrap.classList.toggle("is-unavailable", row.unavailable);
  }

  if (row.notes.length) {
    const line = document.createElement("span");
    line.className = "noe-row-state";
    line.innerHTML = row.notes.map(n => badge(n.kind, n.text, { title: n.title })).join("");
    (name.querySelector(".name-stacked") ?? title.parentElement).append(line);
  }
  li.classList.toggle("noe-unavailable", row.unavailable);
}

/**
 * Sekcje ekwipunku dnd5e → rodzina sprzętu (kolor paska K5 = kolor glifu rodziny). Typ dokumentu
 * grupuje sekcję, więc to dane, nie nazwa: „Używki” to `consumable`, „Łupy” to `loot`.
 * „Zawartość” pojemnika i sekcje bez typu zostają w neutralnej stali.
 */
const SECTION_FAMILY = Object.freeze({
  weapon: "weapon", equipment: "armor", consumable: "chemicals", tool: "tools", container: "survival", loot: "salvage"
});

/** Sekcja klasy i Pochodzenia: akcent źródła; sekcja ekwipunku: akcent rodziny (K5). */
function _decorateSections(root, actor) {
  const source = sourceOf(actor);
  for (const section of root.querySelectorAll(".items-section")) {
    const family = SECTION_FAMILY[section.dataset.groupType];
    if (family) section.dataset.noeFamily = family;
    const origin = section.dataset.groupOrigin;
    if (!origin) continue;
    if (origin === "background") section.dataset.noeSource = "pochodzenia";
    else if (origin !== "other" && source) section.dataset.noeSource = source;
  }
}

/**
 * Dopisz sygnały NOE do wierszy karty aktora. Bezpieczne do wielokrotnego wołania.
 * @param {HTMLElement} root   Element okna karty.
 * @param {Actor} actor
 */
export function decorateRows(root, actor) {
  if (!root?.querySelectorAll || !actor) return;
  let budget = null;
  try { budget = stan(actor) ?? null; } catch { budget = null; }
  for (const li of root.querySelectorAll(".items-section li.item[data-item-id]")) {
    const item = actor.items.get(li.dataset.itemId);
    if (item) _decorateRow(li, item, budget);
  }
  _decorateSections(root, actor);
}

/** Odśwież wiersze otwartych kart aktora — po zmianie budżetu tury, bez renderu karty. */
export function refreshRows(actor) {
  for (const app of foundry.applications.instances.values()) {
    if (app.document === actor && app.rendered && app.element?.classList.contains("noe")) decorateRows(app.element, actor);
  }
}

export function registerSheetRows() {
  const onRender = (app, element) => {
    const actor = app.document;
    if (actor?.documentName !== "Actor" || !["character", "npc"].includes(actor.type)) return;
    decorateRows(element, actor);
  };
  Hooks.on("renderActorSheetV2", onRender);
}

export const __testing = Object.freeze({ costsOf, projectRow, captionOf });
