/**
 * Neuroshima 5e — biegłości w narzędziach: 22 zestawy „narzędzia małego X” i 12 instrumentów muzycznych (s. 132).
 *
 * dnd5e grupuje narzędzia w kategorie przez przedmioty bazowe: `CONFIG.DND5E.tools[k].id` wskazuje przedmiot `tool`
 * w kompendium, a jego `system.type.value` (`tool` / `music`) wybiera kategorię (`documents/actor/trait.mjs`
 * `categories()`). Dzięki temu wieloznaczniki `tool:tool:*` i `tool:music:*` działają w awansach (biegłości profesji,
 * PLAN_m6 §5.1) i w oknie biegłości na karcie, a `Trait.keyLabel` bierze nazwę z indeksu paczki — indeks przychodzi
 * z danymi świata, więc jest dostępny synchronicznie od `setup`. Przedmioty bazowe to zestawy i instrumenty z paczki
 * `narzedzia` (`config/toolkits-data.mjs`).
 *
 * Id w paczce to `idFor("toolkit", klucz)` z `dev/packs/build-packs.mjs` (SHA-1) — w przeglądarce tylko
 * asynchronicznie, a konfiguracja musi być gotowa przy `init`. Stąd literały niżej; `validate-packs` sprawdza, że
 * każdy wskazuje przedmiot `tool` z tym `baseItem` i tym typem.
 *
 * Instrumenty: „Cecha: Charyzma lub Zręczność” (s. 132) — domyślna CHA, ZRC wybiera się w oknie rzutu (U22, P1).
 */

const MODULE_ID = "neuroshima-2026-overrides";
const PACK = `Compendium.${MODULE_ID}.narzedzia.Item`;

/** Kategorie narzędzi (`toolTypes` przedmiotu i `toolProficiencies` biegłości). */
export const TOOL_TYPES = Object.freeze({
  tool: "Zestawy narzędzi",
  music: "Instrumenty muzyczne"
});

const T = (ability, label, id) => Object.freeze({ type: "tool", ability, label, id });
const M = (label, id) => Object.freeze({ type: "music", ability: "cha", label, id });

/** Klucz (`system.tools.<klucz>` aktora, `baseItem` przedmiotu) → kategoria, cecha, etykieta, id w paczce. */
export const TOOL_DEFS = Object.freeze({
  aptekarza:        T("int", "Narzędzia małego aptekarza", "l1CHSH40bUVt47h2"),
  charakteryzatora: T("dex", "Narzędzia małego charakteryzatora", "vqvWn40avqBMrhnR"),
  chemika:          T("int", "Narzędzia małego chemika", "E6yijfaOMXvP6bAE"),
  elektronika:      T("dex", "Narzędzia małego elektronika", "x0I9mekgXbe1bW5b"),
  falszerza:        T("dex", "Narzędzia małego fałszerza", "86OWwO5HZamhqwRo"),
  gorzelnika:       T("wis", "Narzędzia małego gorzelnika", "prBSsJ3r2JFLExgh"),
  hakera:           T("int", "Narzędzia małego hakera", "oSFk8ta7CnURBEtZ"),
  jubilera:         T("int", "Narzędzia małego jubilera", "c9fc1cnUt3AKfhGZ"),
  kartografa:       T("int", "Narzędzia małego kartografa", "uXDnRBN6iqcP5lOq"),
  klusownika:       T("dex", "Narzędzia małego kłusownika", "sQyYjr1Hoi1mFkwf"),
  kowala:           T("str", "Narzędzia małego kowala", "kJ9qhLzdfOhgleHt"),
  krawca:           T("dex", "Narzędzia małego krawca", "CY49VXlLoKhqOzgF"),
  kucharza:         T("wis", "Narzędzia małego kucharza", "epzEoTs5Q2bHo3c1"),
  mechanika:        T("dex", "Narzędzia małego mechanika", "XkfN7NeshDX4h74w"),
  medyka:           T("int", "Narzędzia małego medyka", "3FMxhdT5afBMd9BX"),
  rusznikarza:      T("dex", "Narzędzia małego rusznikarza", "76NWFomKG1UdS0Jx"),
  rzeznika:         T("wis", "Narzędzia małego rzeźnika", "DrWzu624bWW0BQoU"),
  stolarza:         T("dex", "Narzędzia małego stolarza", "pPARip1PgUPtFgst"),
  szulera:          T("wis", "Narzędzia małego szulera", "BBRsywdyBcveKID8"),
  szklarza:         T("int", "Narzędzia małego szklarza", "PdohL4mnHnFkQ6a1"),
  slusarza:         T("dex", "Narzędzia małego ślusarza", "dIeFFmc3lvMcpnt8"),
  tatuazysty:       T("dex", "Narzędzia małego tatuażysty", "PPIEFej5akQhG1Jl"),

  akordeon:          M("Akordeon", "arL7O47Bvnh7cH4z"),
  banjo:             M("Banjo", "7rUMh7CT43xvbApH"),
  gitaraAkustyczna:  M("Gitara akustyczna", "kYFnHWJXm5biWbRf"),
  gitaraBasowa:      M("Gitara basowa", "zhcM8vAe9ERIP9Tv"),
  gitaraElektryczna: M("Gitara elektryczna", "KDJONUWonBfzlRD9"),
  harmonijka:        M("Harmonijka ustna", "0VUXFoBdvQ6Jumgg"),
  keyboard:          M("Keyboard", "U7hQB2YPiIloLl6i"),
  kontrabas:         M("Kontrabas elektryczny", "jRNz9IOdV7pfyvld"),
  mikser:            M("Mikser audio + głośniki", "uFwI790nu6OIF9X0"),
  perkusja:          M("Perkusja", "5WirnDR91OmFy9Cg"),
  saksofon:          M("Saksofon", "X8qyamfbKmf0BwxH"),
  skrzypce:          M("Skrzypce elektryczne", "qXpfDwjac6Ym1uK5")
});

/** Klucze instrumentów muzycznych (kategoria `music`). */
export const INSTRUMENT_KEYS = Object.freeze(Object.keys(TOOL_DEFS).filter(k => TOOL_DEFS[k].type === "music"));

/** Klucze zestawów narzędzi (kategoria `tool`) — to nad nimi liczą się wymogi przepisów produkcji. */
export const TOOLKIT_KEYS = Object.freeze(Object.keys(TOOL_DEFS).filter(k => TOOL_DEFS[k].type === "tool"));

/** UUID przedmiotu bazowego narzędzia w paczce `narzedzia`. */
export const toolBaseItemUuid = key => (TOOL_DEFS[key] ? `${PACK}.${TOOL_DEFS[key].id}` : "");

export function registerTools() {
  CONFIG.DND5E.tools = Object.fromEntries(Object.entries(TOOL_DEFS).map(([key, d]) => [key, {
    ability: d.ability,
    label: d.label,
    id: toolBaseItemUuid(key)
  }]));

  CONFIG.DND5E.toolTypes = { ...TOOL_TYPES };
  // Same two categories for proficiencies; individual tools come from their base items (no label mirror —
  // it would list every tool a second time at the top level of the proficiency picker).
  CONFIG.DND5E.toolProficiencies = { ...TOOL_TYPES };

  console.log(`Neuroshima 5e | Tools overridden (${TOOLKIT_KEYS.length} zestawów, ${INSTRUMENT_KEYS.length} instrumentów)`);
}
