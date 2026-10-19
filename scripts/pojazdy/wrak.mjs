/**
 * Neuroshima 5e — pojazd przy 0 PW: wrak i wybuch baku (PLAN_m4_pojazdy §4.12, D17, E6).
 *
 * Wzorzec wraku z M5 (`combat/autodestrukcja.mjs`): grafika `tokens/wraki/pojazd-<klasa>.webp` (gdy plik jest;
 * inaczej przyciemnienie), „(wrak)” w nazwie, oryginał we fladze żetonu, [Przywróć] u MG. Do tego to, co jest
 * tylko pojazdowe: jadący wysadzeni na wolne pola obok, silnik zgaszony, Uruchom i ruch oznaczane (flaga `wrak`).
 *
 * Płonący pojazd (awaria 1 albo Podpalenie) z paliwem w baku: odliczanie k4 rund na zegarze świata
 * (`awarie.mjs`), potem wybuch tą samą ścieżką co granaty i autodestrukcja — ogień wg rozmiaru (Duża 3k6 / 3 m,
 * Wielka 4k6 / 4,5 m, Ogromna 6k6 / 6 m), RO ZRC ST 15 — połowa. Wrak zostaje.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { explosiveInternals as X } from "../actors/grenade-inventory.mjs";
import { getPaliwo, setPaliwo } from "../actors/party-travel.mjs";
import { isBurning } from "../combat/podpalenie.mjs";
import { MODULE_ID, danePojazdu, jadacyPojazdu, jestPojazdem } from "./stan.mjs";
import { wysadzGM } from "./jadacy.mjs";
import { FLAGA_SILNIK } from "./silnik.mjs";
import { aktywneAwariePojazdu, odliczWybuch } from "./awarie.mjs";

export const FLAGA_WRAK = "wrakPojazdu";
const FLAGA_STAN_WRAKU = "wrak";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Wybuch baku wg rozmiaru pojazdu (D17). */
export const WYBUCH_BAKU = {
  lg: { wzor: "3d6", promien: 3 },
  huge: { wzor: "4d6", promien: 4.5 },
  grg: { wzor: "6d6", promien: 6 }
};
const ST_WYBUCHU = 15;

/** Czy pojazd jest wrakiem. */
export function jestWrakiem(actor) {
  return !!actor?.flags?.[MODULE_ID]?.[FLAGA_STAN_WRAKU];
}

function _zetony(actor) {
  if (actor.isToken) return actor.token ? [actor.token] : [];
  return game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorLink && t.actorId === actor.id));
}

async function _istnieje(src) {
  try { return (await fetch(src, { method: "HEAD" })).ok; } catch { return false; }
}

/** Grafika wraku na żetonie (oryginał we fladze). */
async function _grafikaWraku(tokenDoc) {
  if (tokenDoc.flags?.[MODULE_ID]?.[FLAGA_WRAK]) return;
  const klasa = danePojazdu(tokenDoc.actor)?.katalog.wrak ?? "osobowy";
  const src = `modules/${MODULE_ID}/tokens/wraki/pojazd-${klasa}.webp`;
  const jest = await _istnieje(src);
  const orig = { src: tokenDoc.texture.src, tint: tokenDoc.texture.tint ?? null, name: tokenDoc.name };
  await tokenDoc.update({
    ...(jest ? { "texture.src": src, "texture.fit": "contain" } : { "texture.tint": "#4a4a4a" }),
    name: `${orig.name} (wrak)`, light: { bright: 0, dim: 0 },
    [`flags.${MODULE_ID}.${FLAGA_WRAK}`]: orig
  });
}

/** MG: przywraca grafikę żetonów (Odbudowa, cofnięcie pomyłki). */
export async function przywrocGrafike(actor) {
  for (const t of _zetony(actor)) {
    const orig = t.flags?.[MODULE_ID]?.[FLAGA_WRAK];
    if (!orig) continue;
    await t.update({ "texture.src": orig.src, "texture.tint": orig.tint ?? "#ffffff", name: orig.name, [`flags.${MODULE_ID}.${FLAGA_WRAK}`]: _del });
  }
}

/**
 * MG: pojazd przy 0 PW → wrak (D17).
 * @param {Actor} actor
 */
export async function zrobWrak(actor) {
  if (!game.user.isGM || !jestPojazdem(actor) || jestWrakiem(actor)) return;
  const zetony = _zetony(actor);
  const wysadzeni = [];
  for (const t of zetony) {
    for (const j of jadacyPojazdu(t)) {
      await wysadzGM(j);
      wysadzeni.push(j.name);
    }
    await _grafikaWraku(t);
  }
  await actor.update({
    [`flags.${MODULE_ID}.${FLAGA_STAN_WRAKU}`]: { kiedy: game.time.worldTime },
    [`flags.${MODULE_ID}.${FLAGA_SILNIK}.wl`]: false, [`flags.${MODULE_ID}.${FLAGA_SILNIK}.swiatla`]: false
  });
  const linie = [`<strong>${esc(actor.name)}</strong> — 0 PW: wrak. Silnik zgaszony; uruchamianie i ruch oznaczane.`];
  if (wysadzeni.length) linie.push(`Jadący wysadzeni obok: ${wysadzeni.map(esc).join(", ")}.`);
  const plonie = isBurning(actor) || aktywneAwariePojazdu(actor).includes(1);
  const bak = actor.flags?.[MODULE_ID]?.paliwo ? getPaliwo(actor) : null;
  const przyciski = [{ akcja: "pojazd.przywrocWrak", label: "Cofnij (nie wrak)", gm: true, ikona: "fa-solid fa-rotate-left", dane: { pojazd: actor.uuid } }];
  if (plonie && bak?.value > 0) {
    const r = await new Roll("1d4").evaluate();
    await odliczWybuch(actor, r.total);
    linie.push(`Płonie z paliwem w baku (${bak.value} l) — <strong>wybuch za ${r.total} ${r.total === 1 ? "rundę" : "rundy"}</strong> (k4).`);
    przyciski.push({ akcja: "pojazd.wybuch", label: "Wybuch teraz", gm: true, ikona: "fa-solid fa-explosion", dane: { pojazd: actor.uuid } });
  }
  await wyslijKarte(kartaPostoju({ ikona: "icons/svg/ruins.svg", tytul: "Wrak", rodzaj: "porazka", linie, przyciski }), { actor });
}

/** MG: wybuch baku (D17) — ścieżka granatów: dźwięk, błysk, ślad, karta z RO i obrażeniami. */
export async function wybuchBaku(actor) {
  if (!game.user.isGM || !jestPojazdem(actor)) return;
  const tok = _zetony(actor).find(t => t.parent === canvas.scene) ?? _zetony(actor)[0];
  const rozmiar = actor.system?.traits?.size;
  const w = WYBUCH_BAKU[rozmiar] ?? WYBUCH_BAKU.lg;
  if (actor.flags?.[MODULE_ID]?.paliwo) await setPaliwo(actor, { value: 0 });
  const wzor = w.wzor.replace("d", "k");
  if (tok) {
    const c = tok.getCenterPoint(tok._source);
    const area = { kind: "cube", side: Math.max(1, w.promien * 2), label: `promień ${String(w.promien).replace(".", ",")} m` };
    const nazwa = `Wybuch baku: ${tok.name}`;
    await X.requestBlast(actor, { sceneId: tok.parent.id, kind: "explosion", x: c.x, y: c.y, area, color: "#ff8a3d",
      itemName: nazwa, areaText: area.label, damageType: "fire", hasDamageFormula: true }, "grenade");
    const ro = `RO na Zręczność ST ${ST_WYBUCHU}`;
    await X.postExplosiveCard(actor, {
      itemName: nazwa, itemImg: tok.texture.src, badge: "",
      save: X.parseSaveSpec(ro), damage: X.parseDamageSpec(`${wzor} obrażeń od ognia`), ignite: null, isMine: false,
      areaLabel: area.label, saveText: ro, effectText: `${wzor} obrażeń od ognia; sukces — połowa.`
    }, { detonated: true, note: "<strong>Wybuch baku</strong> płonącego wraku (WKK, D17)." });
    if (!jestWrakiem(actor)) await zrobWrak(actor);
  } else {
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/explosion.svg", tytul: "Wybuch baku", rodzaj: "porazka",
      linie: [`${esc(actor.name)}: ${wzor} ognia w promieniu ${w.promien} m, RO ZRC ST ${ST_WYBUCHU} — połowa. Brak żetonu na scenie — rozstrzyga MG.`] }), { actor, szept: "gm" });
  }
}

/** MG: cofnięcie wraku (pomyłka) — grafika, flaga; PW zostają. */
export async function cofnijWrak(actor) {
  if (!game.user.isGM) return;
  await przywrocGrafike(actor);
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_STAN_WRAKU}`]: _del });
}

export function registerWrak() {
  Hooks.on("updateActor", (actor, changes) => {
    if (!game.users.activeGM?.isSelf || !jestPojazdem(actor)) return;
    const hp = foundry.utils.getProperty(changes, "system.attributes.hp.value");
    if (hp === undefined || hp > 0 || jestWrakiem(actor)) return;
    zrobWrak(actor).catch(err => console.error(`${MODULE_ID} | wrak`, err));
  });
  zarejestrujAkcje("pojazd.przywrocWrak", async (_ev, btn) => {
    const a = await fromUuid(btn.dataset.pojazd);
    if (a && game.user.isGM) await cofnijWrak(a);
  });
  zarejestrujAkcje("pojazd.wybuch", async (_ev, btn) => {
    const a = await fromUuid(btn.dataset.pojazd);
    if (a && game.user.isGM) await wybuchBaku(a);
  });
}
