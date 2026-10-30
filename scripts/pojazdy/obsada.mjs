/**
 * Neuroshima 5e — pamięć obsady i karta „Posadzić?” (PLAN_m4_pojazdy §4.15, D23).
 *
 * Miejsce jadącego to flaga na jego żetonie z id żetonu pojazdu **tej** sceny, więc nowa scena = nikt nie siedzi.
 * Pamięć obsady (`stan.mjs` `obsadaPojazdu`, zapis w `jadacy.mjs` `synchronizujZaloge`) pamięta ponad scenami, kto
 * na którym miejscu siedział. Gdy pojazd albo zapamiętana postać pojawia się na scenie, aktywny MG dostaje kartę
 * z [Posadź] / [Pomiń] — nic nie sadza się samo (zasada „automatyzuj wykrywanie, nie stosowanie”).
 *
 * [Posadź] dostawia brakujące żetony postaci powiązanych (z prototypu, na środku pojazdu) i sadza je na zapamiętanych
 * miejscach. Jadący niepowiązany z innej sceny (bandyta z innej mapy) nie da się dostawić — karta go pomija.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import {
  jadacyPojazdu, jazdaZetonu, jestZetonemNosnika, miejsceNosnika, obrysDziala, obsadaPojazdu, nosnikJadacego
} from "./stan.mjs";
import { opisMiejsca, posadzGM, synchronizujZaloge, zajeteMiejsca } from "./jadacy.mjs";
import { czekaNaWklejenie } from "./schowek.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Żeton aktora na scenie (powiązany — po aktorze świata, niepowiązany — jego własny). */
function zetonAktora(actor, scena) {
  if (actor.isToken) return actor.token?.parent === scena ? actor.token : null;
  return scena.tokens.find(t => t.actorLink && t.actorId === actor.id) ?? null;
}

/**
 * Wpisy pamięci, których na tej scenie nie ma w tym pojeździe, a da się je posadzić.
 * @returns {{uuid: string, actor: Actor, miejsce: object, zeton: TokenDocument|null}[]}
 */
export function brakujacaObsada(pojazdDoc) {
  if (!jestZetonemNosnika(pojazdDoc) || !obrysDziala(pojazdDoc.parent)) return [];
  const scena = pojazdDoc.parent;
  const zajete = zajeteMiejsca(pojazdDoc);
  const out = [];
  for (const [uuid, mid] of obsadaPojazdu(pojazdDoc.actor)) {
    const actor = fromUuidSync(uuid);
    const miejsce = miejsceNosnika(pojazdDoc, mid);
    if (!actor || !miejsce || zajete.has(mid)) continue;
    const zeton = zetonAktora(actor, scena);
    if (zeton && nosnikJadacego(zeton)) continue;
    if (!zeton && actor.isToken) continue;
    out.push({ uuid, actor, miejsce, zeton });
  }
  return out;
}

/** MG: posadź brakującą obsadę (dostawia żetony postaci powiązanych). @returns {string[]} posadzeni */
export async function posadzObsade(pojazdDoc) {
  if (!game.user.isGM) return [];
  posadzane.add(pojazdDoc.uuid);
  try {
    const scena = pojazdDoc.parent;
    const posadzeni = [];
    for (const b of brakujacaObsada(pojazdDoc)) {
      let zeton = b.zeton;
      if (!zeton) {
        const c = pojazdDoc.getCenterPoint(pojazdDoc._source);
        const td = await b.actor.getTokenDocument({ level: pojazdDoc._source.level });
        const g = scena.grid.size;
        td.updateSource({ x: Math.round(c.x - td.width * g / 2), y: Math.round(c.y - td.height * g / 2) });
        [zeton] = await scena.createEmbeddedDocuments("Token", [td.toObject()]);
      }
      if (!zeton || zajeteMiejsca(pojazdDoc).has(b.miejsce.id)) continue;
      await posadzGM(pojazdDoc, zeton, b.miejsce);
      posadzeni.push(`${zeton.name} — ${opisMiejsca(pojazdDoc.actor, b.miejsce)}`);
    }
    await synchronizujZaloge(pojazdDoc);
    return posadzeni;
  } finally {
    posadzane.delete(pojazdDoc.uuid);
  }
}

/* -------------------------------------------- */
/*  Karta                                        */
/* -------------------------------------------- */

/** Pojazdy w trakcie sadzania (ich własne nowe żetony nie wywołują drugiej karty). */
const posadzane = new Set();
const zaplanowane = new Set();

/**
 * Sprawdzenie po zakończeniu bieżącej operacji (cała paczka `createToken` jednego wklejenia): jeden takt przez
 * MessageChannel — nie dławiony w karcie w tle, w przeciwieństwie do `setTimeout`.
 */
function zaplanuj(pojazdDoc) {
  if (!game.user.isActiveGM || zaplanowane.has(pojazdDoc.uuid) || posadzane.has(pojazdDoc.uuid)) return;
  zaplanowane.add(pojazdDoc.uuid);
  const ch = new MessageChannel();
  ch.port1.onmessage = () => {
    zaplanowane.delete(pojazdDoc.uuid);
    zaproponuj(pojazdDoc).catch(err => console.error("neuroshima-2026-overrides | obsada", err));
  };
  ch.port2.postMessage(0);
}

async function zaproponuj(pojazdDoc) {
  if (!pojazdDoc.parent?.tokens.has(pojazdDoc.id) || posadzane.has(pojazdDoc.uuid)) return;
  // Wklejony z załogą: jadący dopiero są przepinani na ten żeton (§4.16) — nic nie brakuje.
  if (czekaNaWklejenie(pojazdDoc)) return;
  const braki = brakujacaObsada(pojazdDoc);
  if (!braki.length) return;
  const linie = [`<strong>${esc(pojazdDoc.name)}</strong>: posadzić według ostatniego składu?`,
    ...braki.map(b => `${esc(b.actor.name)} — ${esc(opisMiejsca(pojazdDoc.actor, b.miejsce))}`
      + (b.zeton ? "" : " <em>(żeton dostawiony)</em>"))];
  await wyslijKarte(kartaPostoju({
    ikona: pojazdDoc.texture?.src ?? pojazdDoc.actor?.img, tytul: "Posadzić załogę?", rodzaj: "info", linie,
    przyciski: [
      { akcja: "pojazd.posadzObsade", label: "Posadź", ikona: "fa-solid fa-chair", gm: true, dane: { pojazd: pojazdDoc.uuid } },
      { akcja: "pojazd.pominObsade", label: "Pomiń", ikona: "fa-solid fa-xmark", gm: true }
    ]
  }), { actor: pojazdDoc.actor, szept: "gm", flagi: { obsadaPojazdu: pojazdDoc.uuid } });
}

export function registerObsada() {
  zarejestrujAkcje("pojazd.posadzObsade", async (_ev, btn, message) => {
    if (!game.user.isGM) return;
    const pojazdDoc = await fromUuid(btn.dataset.pojazd);
    if (!pojazdDoc) return ui.notifications.warn("Tego pojazdu nie ma już na scenie.");
    const posadzeni = await posadzObsade(pojazdDoc);
    await message?.update({
      content: kartaPostoju({
        ikona: pojazdDoc.texture?.src, tytul: "Załoga posadzona", rodzaj: posadzeni.length ? "sukces" : "info",
        linie: posadzeni.length ? posadzeni.map(esc) : ["Nikogo nie trzeba było sadzać."]
      })
    });
  });
  zarejestrujAkcje("pojazd.pominObsade", async (_ev, _btn, message) => {
    if (game.user.isGM) await message?.delete();
  });

  Hooks.on("createToken", doc => {
    if (!game.user.isActiveGM || !obrysDziala(doc.parent)) return;
    if (jestZetonemNosnika(doc)) return zaplanuj(doc);
    // Postać pojawia się na scenie z pojazdem, który ją pamięta (i jeszcze w nim nie siedzi).
    if (jazdaZetonu(doc)) return;
    const uuid = doc.actor?.uuid;
    if (!uuid) return;
    for (const p of doc.parent.tokens) {
      if (jestZetonemNosnika(p) && obsadaPojazdu(p.actor).some(([u]) => u === uuid)
        && !jadacyPojazdu(p).some(t => t.actor?.uuid === uuid)) zaplanuj(p);
    }
  });
}
