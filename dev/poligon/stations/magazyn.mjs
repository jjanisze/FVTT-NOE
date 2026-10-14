/**
 * Magazyn (§3.4) — what Zbrojownia and Piekarz were used for: drag anything onto anyone. NPC-type
 * storage actors (the doll exempts NPCs, PLAN_paper_doll D10), one per compendium family, plus
 * Wszystko; refilled from the compendia on every reset. Owned by every player, so a player's seat can
 * drag from them too.
 */

import { MOD, p } from "./_wspolne.mjs";
import { packDocs } from "../lib/packs.mjs";

/** The module's own weapon types: palna* and specjalna are guns and launchers; biala and miotana the rest. */
const ranged = i => i.type === "weapon" && /^(palna|specjalna)/.test(i.system?.type?.value ?? "");

const FAMILIES = [
  { key: "palna", name: "Magazyn · Broń palna i dystansowa", from: async () => (await packDocs("bron")).filter(ranged) },
  { key: "biala", name: "Magazyn · Broń biała i miotana", from: async () => (await packDocs("bron")).filter(i => !ranged(i)) },
  { key: "pancerze", name: "Magazyn · Pancerze", from: () => packDocs("pancerze") },
  { key: "amunicja", name: "Magazyn · Amunicja i magazynki", from: async () => [...await packDocs("amunicja"), ...await packDocs("magazynki")], qty: { amunicja: 100 } },
  { key: "granaty", name: "Magazyn · Granaty i ładunki", from: async () => [...await packDocs("granaty"), ...(await packDocs("sprzet")).filter(i => i.flags?.[MOD]?.detonator || i.flags?.[MOD]?.electricFuze)], qtyAll: 10 },
  { key: "chemia", name: "Magazyn · Chemia i leki", from: () => packDocs("lekarstwa"), qtyAll: 10 },
  { key: "narzedzia", name: "Magazyn · Narzędzia", from: () => packDocs("narzedzia") },
  { key: "sprzet", name: "Magazyn · Sprzęt i elektronika", from: () => packDocs("sprzet") },
  { key: "schematy", name: "Magazyn · Schematy", from: () => packDocs("schematy") }
];

async function storage(k, key, name) {
  const players = Object.fromEntries(game.users.filter(u => !u.isGM).map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]));
  const a = await k.actor(`magazyn-${key}`, {
    name, type: "npc", img: "icons/svg/chest.svg",
    system: { attributes: { hp: { value: 1, max: 1 } } },
    prototypeToken: { name, actorLink: true, texture: { src: "icons/svg/chest.svg" } }
  });
  await a.update({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ...players } });
  return a;
}

async function fill(k, actor, docs, { qty = null, qtyAll = null } = {}) {
  const data = docs.map(d => {
    const x = game.items.fromCompendium(d);
    const pack = d.pack?.split(".").pop();
    const q = qtyAll ?? qty?.[pack];
    if (q) x.system.quantity = q;
    return x;
  });
  for (let i = 0; i < data.length; i += 100) await actor.createEmbeddedDocuments("Item", data.slice(i, i + 100));
  return data.length;
}

export default {
  id: "magazyn", name: "Magazyn", prio: "P1", icon: "fa-solid fa-warehouse",
  opis: "Aktorzy-magazyny (BN, bez lalki), po jednym na rodzinę kompendiów, plus Wszystko i WKK. Przeciągaj na kogo chcesz — także z miejsca gracza. Reset napełnia od nowa z kompendiów.",
  gracze: 0,
  async build(k) {
    const counts = {};
    const all = [];
    for (const f of FAMILIES) {
      const docs = await f.from();
      all.push(...docs);
      const a = await storage(k, f.key, f.name);
      counts[f.key] = await fill(k, a, docs, f);
    }
    // Surowce through the module's store, so they stack and weigh as the game does.
    const sur = await storage(k, "surowce", "Magazyn · Surowce");
    await k.surowce(sur, { CH: 50, CE: 50, CZ: 50, MK: 200, MO: 200 });
    counts.surowce = sur.items.size;

    // WKK: the module's own stock builders (each fills the actor it is given).
    const wkk = await storage(k, "wkk", "Magazyn · WKK i zasilanie");
    const N = game.neuroshima;
    for (const [what, fn] of [["flary", N.flara?.stock], ["latarki", N.latarka?.stock], ["gogle", N.gogle?.stock], ["baterie", N.baterie?.stock]]) {
      try { if (fn) await fn(wkk); else k.miss(`stock: ${what}`); } catch (err) { k.miss(`stock ${what}: ${err.message}`); }
    }
    const gadzety = Object.keys(N.gadzety?.GADZETY ?? {});
    if (gadzety.length) await wkk.createEmbeddedDocuments("Item", gadzety.map(g => N.gadzety.buildGadzetItemData(g)).filter(Boolean));
    counts.wkk = wkk.items.size;

    // Wszystko — the scale case (Chomik's inventory in Garderoba draws from the same packs).
    const wszystko = await storage(k, "wszystko", "Magazyn · Wszystko");
    counts.wszystko = await fill(k, wszystko, all);
    k.note(`Magazyn: ${Object.entries(counts).map(([a, b]) => `${a} ${b}`).join(", ")}`);
    return counts;
  },
  proby: [
    p("przeciagnij", "Magazyn", "Przeciągnięcie z Magazynu na postać: ląduje tam, gdzie powinno (lalka, pas, plecak)?", "Karta Magazynu → przeciągnij na kartę osoby z Obsady i na jej żeton."),
    p("gracz", "Magazyn", "To samo z miejsca gracza — czy gracz może brać z Magazynu i czy przekaźnik MG nadąża?", "Widok gracza → okno Gracza 1."),
    p("wszystko", "Skala", "Magazyn · Wszystko (~600 przedmiotów): czy karta się otwiera i przewija bez zacięć?", "Otwórz kartę, przewiń, edytuj ilość czegoś na dole listy; Liczniki → klatki.")
  ]
};
