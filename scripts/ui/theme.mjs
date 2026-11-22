/**
 * NOE — zakres języka wizualnego i wymuszony ciemny motyw (PLAN_m9_style.md §5.2, D12/D13).
 *
 * Element główny każdej powierzchni w zakresie dostaje `noe themed theme-dark`:
 *  - okna dnd5e i ich podklasy NOE (karty, ItemSheet, edytory aktywności i AE, użycie, rzuty,
 *    rozwój, przeglądarka kompendium) — rozpoznawane po klasie `dnd5e2` na elemencie okna,
 *  - własne okna NOE i DialogV2 z wrappera `noeDialog` — po klasie `noe` w opcjach,
 *  - bloki kart czatu — sam dziennik czatu zostaje rdzenia.
 *
 * Rama rdzenia (sidebar, dziennik czatu, pasek makr, kontrolki sceny, lista graczy, powiadomienia)
 * nigdy nie dostaje `.noe`: reguły M9 pod tym zakresem do niej nie docierają.
 *
 * Wybór motywu arkusza w ustawieniach Foundry nie działa na te okna — NOE nie ma jasnego wariantu.
 */
import { scope } from "./noe.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Sześć klas z własnym akcentem źródła; każda inna tożsamość (BN, pojazd) zostaje przy neutralnym. */
const SOURCES = new Set(["brutal", "cwaniak", "spec", "twardziel", "zlodziej", "zwiadowca"]);

/**
 * Akcent źródła karty: klasa pierwotna postaci. Profesja dziedziczy klasę, więc wystarcza klasa.
 * @param {Actor|null|undefined} actor
 * @returns {string|null}
 */
export function sourceOf(actor) {
  if (actor?.type !== "character") return null;
  const original = actor.system?.details?.originalClass;
  const cls = actor.items?.get?.(original) ?? actor.itemTypes?.class?.[0];
  const id = cls?.flags?.[MODULE_ID]?.classId ?? cls?.system?.identifier;
  return SOURCES.has(id) ? id : null;
}

/** Czy okno należy do zakresu M9. */
function _inScope(app, element) {
  if (!element?.classList) return false;
  if (element.classList.contains("noe")) return true;
  if (element.classList.contains("dnd5e2")) return true;
  return app?.options?.classes?.includes?.("noe") ?? false;
}

function _onRenderApplication(app, element) {
  if (!_inScope(app, element)) return;
  scope(element);
  const actor = app.document?.documentName === "Actor" ? app.document : app.actor;
  const source = sourceOf(actor);
  if (source) element.dataset.noeSource = source;
  else delete element.dataset.noeSource;
}

/**
 * Karta czatu to cała wiadomość: dnd5e 6 kładzie `dnd5e2` na `li.chat-message` i sam maluje ją
 * jako kartę (tło, nagłówek, rzuty). Oznaczamy więc wiadomość — samodzielny ciemny blok — a nie
 * dziennik: `ol.chat-log`, pole wpisywania i sidebar zostają rdzenia i nie dostają `.noe`.
 */
function _onRenderChatMessage(_message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  // Bez warunku na `dnd5e2`: dnd5e dopisuje tę klasę dopiero po hooku (`ChatMessage5e#renderHTML`),
  // a w tym systemie dostaje ją każda wiadomość.
  if (root?.classList?.contains("chat-message")) scope(root);
}

export function registerNoeTheme() {
  Hooks.on("renderApplicationV2", _onRenderApplication);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
}

export const __testing = Object.freeze({ _inScope, sourceOf });
