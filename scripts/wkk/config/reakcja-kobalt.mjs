/**
 * Bieganie w Reakcji — ochrona przed ostrzałem (PLAN_m8_ruch_i_ekonomia_akcji §2.1 D32, §4.3). WKK.
 *
 * NOE s. 30: ataki dystansowe przeciw biegnącemu mają Utrudnienie „do końca twojej bieżącej tury”. Podręcznik nie mówi,
 * ile trwa ta ochrona, gdy Bieganie wykonano jako wyczekaną akcję w Reakcji — w cudzej turze. MG wybrał (2026-11-15):
 * **do końca tej reakcji** (nie do końca cudzej tury). Gospodarz: silnik okoliczności ataku
 * (`config/okolicznosci-ataku.mjs`, `celBiegnieReakcja`) z dowodem trwającej reakcji z ledgera M8
 * (`combat/ekonomia.mjs`, `ochronaBieguWReakcji`). Bez Kobaltu ochrona w Reakcji nie wchodzi do trybu rzutu: okno ataku
 * pokazuje uwagę „rozstrzygnij ręcznie” (§2.2). Ochrona we własnej turze biegnącego (druk) działa zawsze.
 */

/** Klucz konwencji → krótki opis do etykiety „rozstrzygnij ręcznie”. */
export const REAKCJA_KOBALT = Object.freeze({
  d32: "ochrona Biegania wykonanego w Reakcji — do końca tej reakcji"
});

/** Konwencje włączone (z Kobaltem) albo wyłączone (bez). */
export function konwencjeReakcji(kobalt) {
  return Object.freeze({ d32: !!kobalt });
}
