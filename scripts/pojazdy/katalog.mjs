/**
 * Neuroshima 5e — pojazd z katalogu: aktor z paczki `pojazdy` (PLAN_m4_pojazdy E1/E2).
 *
 * Woła to wynik produkcji („pojazd:<id>”, `production/robota.mjs` → rejestr skutków), stanowisko Poligonu i MG.
 * Aktora tworzy MG (przekaźnik); właściciel — gracz, którego postać skończyła Robotę.
 */

import { zarejestrujSkutek } from "../production/robota.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { kartaPostoju, wyslijKarte } from "../postoj/karty.mjs";
import { PODWOZIA } from "../config/vehicles-data.mjs";
import { MODULE_ID } from "./stan.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * MG: nowy aktor pojazdu z paczki.
 * @param {string} podwozie  klucz `PODWOZIA`
 * @param {{nazwa?: string, wlasciciel?: User|null, folder?: string|null}} [o]
 * @returns {Promise<Actor|null>}
 */
export async function utworzZKatalogu(podwozie, { nazwa = null, wlasciciel = null, folder = null } = {}) {
  if (!game.user.isGM) return null;
  const pack = game.packs.get(`${MODULE_ID}.pojazdy`);
  const p = PODWOZIA[podwozie];
  if (!pack || !p) return null;
  const idx = await pack.getIndex();
  const wpis = idx.find(e => e.name === p.nazwa);
  if (!wpis) return null;
  const src = await pack.getDocument(wpis._id);
  const dane = game.actors.fromCompendium(src);
  if (nazwa) {
    dane.name = nazwa;
    dane.prototypeToken.name = nazwa;
  }
  if (wlasciciel && !wlasciciel.isGM) dane.ownership = { default: 0, [wlasciciel.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
  if (folder) dane.folder = folder;
  return Actor.implementation.create(dane);
}

async function _aktorMG(_n, { ref, user }) {
  const podwozie = String(ref).replace(/^pojazd:/, "");
  const u = game.users.get(user) ?? null;
  const a = await utworzZKatalogu(podwozie, { wlasciciel: u });
  if (a) await wyslijKarte(kartaPostoju({ ikona: a.img, tytul: "Nowy pojazd", rodzaj: "sukces",
    linie: [`<strong>${esc(a.name)}</strong> — aktor gotowy${u && !u.isGM ? ` (właściciel: ${esc(u.name)})` : ""}. MG stawia żeton na mapie.`] }), { actor: a, szept: "gm" });
}

export function registerKatalog() {
  zarejestrujSkutek("pojazd.aktor", async ({ ref }) => {
    await doMG("pojazd.aktor", { ref, user: game.user.id }, { nosiciel: game.user.character });
    return `${PODWOZIA[String(ref).replace(/^pojazd:/, "")]?.nazwa ?? ref} — MG tworzy aktora z katalogu`;
  });
  zarejestrujProsbe("pojazd.aktor", _aktorMG);
}
