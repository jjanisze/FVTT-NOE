/**
 * Neuroshima 5e — ilustracje teatru wyobraźni (PLAN_m5_postoj.md §7.23, D42–D45).
 *
 * Jeden rozwiązywacz dla każdego slotu obrazu: nadpisanie MG (obraz Miejsca, portret handlarza, obraz
 * ruiny) → plik `ui/<zestaw>/<klucz>.webp`, jeśli istnieje (nazwa pliku to całe okablowanie, jak `vfx/`)
 * → nic. Obraz nigdy nie niesie informacji: brak pliku to brak `<img>`, układ bez zmian. Ustawienie
 * klienta „Ilustracje” (D45, domyślnie włączone) wyłącza wszystkie sloty naraz.
 *
 * Zestawy i klucze — tabela §7.23 planu; zamówienia grafik — `dev/icons/MISSING.md` §G.
 */

const MODULE_ID = "neuroshima-2026-overrides";
export const SETTING_ILUSTRACJE = "ilustracje";

/** Zestawy i klucze, które moduł zna (pliki dochodzą bez zmian kodu). */
export const ZESTAWY_ILUSTRACJI = Object.freeze({
  postoj: Object.freeze(["utrzymanie-nedzny", "utrzymanie-normalny", "utrzymanie-bogaty"]),
  oboz: Object.freeze(["pustynia", "preria", "las", "gory", "bagna", "ruiny", "podziemia"]),
  handlarze: Object.freeze(["obwozny", "barman", "stragan", "wielobranzowy", "bron", "apteka", "warsztat"]),
  ruiny: Object.freeze(["apteka", "biuro", "magazyn", "piwnica", "sklepik", "warsztat", "wrak"])
});

const _istnieje = new Map();

/** Czy plik jest na serwerze (HEAD, wynik zapamiętany na sesję). */
async function _jest(src) {
  if (_istnieje.has(src)) return _istnieje.get(src);
  let ok = false;
  try { ok = await foundry.utils.srcExists(src); } catch { ok = false; }
  _istnieje.set(src, ok);
  return ok;
}

/** Ustawienie klienta „Ilustracje” (D45). */
export function registerIlustracjeSetting() {
  game.settings.register(MODULE_ID, SETTING_ILUSTRACJE, {
    name: "Ilustracje postoju",
    hint: "Malowane obrazy w oknach postoju, handlu i szabrowania (teatr wyobraźni). Wyłącz na małym ekranie.",
    scope: "client", config: true, type: Boolean, default: true
  });
}

/** Czy ten klient chce ilustracji. */
export function ilustracjeWlaczone() {
  try { return game.settings.get(MODULE_ID, SETTING_ILUSTRACJE) !== false; } catch { return true; }
}

/** Ścieżka pliku w module dla zestawu i klucza. */
export function sciezkaIlustracji(zestaw, klucz) {
  return `modules/${MODULE_ID}/ui/${zestaw}/${klucz}.webp`;
}

/**
 * Ilustracja slotu albo `null`.
 * @param {string} zestaw          `postoj`, `oboz`, `handlarze`, `ruiny`
 * @param {string|null} klucz
 * @param {{nadpisanie?: string|null}} [o]  obraz MG (pole dokumentu) — wygrywa z plikiem modułu
 * @returns {Promise<string|null>}
 */
export async function ilustracja(zestaw, klucz, { nadpisanie = null } = {}) {
  if (!ilustracjeWlaczone()) return null;
  if (nadpisanie) return nadpisanie;
  if (!zestaw || !klucz) return null;
  const src = sciezkaIlustracji(zestaw, klucz);
  return (await _jest(src)) ? src : null;
}

/** Testy i przeładowanie grafik bez F5. */
export function wyczyscPamiecIlustracji() {
  _istnieje.clear();
}
