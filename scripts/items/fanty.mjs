/**
 * Neuroshima 5e — Fanty na stole (PLAN_m5_postoj.md §7.10, U25, U51).
 *
 * „Użyj Fantu” to aktywność przedmiotu (`fantItemData` w `config/fanty-data.mjs`). Bohater, który wykorzysta
 * Fant **po raz pierwszy**, dostaje Fuksa bezterminowego (s. 17, D24). Kilkuosobowy (gry, nagrania, przedwojenny
 * alkohol) — okno wyboru obecnych członków drużyny. Kto już korzystał z tego egzemplarza, jest w
 * `flags.<mod>.fant.uzyli` — flaga idzie z przedmiotem przy wymianie, więc kupiona używana gra nie daje nic
 * temu, kto już w nią grał. Zużywalne (jedzenie, napój, używka) schodzą o sztukę; każda sztuka to osobny Fant.
 * Sprzęt do odtwarzania — tylko w opisie (T0).
 *
 * Nagroda publiczności (s. 57, U51): Fuks bezterminowy, 10 PD albo przedmiot do 20 gb — okno z wyborem,
 * przedmiot przez kartę MG z podpowiedzią Fantów.
 */

import { RODZAJE_FANTOW, FANTY, idFantu, fantItemData, fantyDo } from "../config/fanty-data.mjs";
import { przyznajFuksa, mozeMiecFuksy } from "../actors/fuksy.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Dane Fantu z przedmiotu albo `null`. */
export function fantPrzedmiotu(item) {
  return item?.getFlag?.(MODULE_ID, "fant") ?? item?.flags?.[MODULE_ID]?.fant ?? null;
}

/** Kto może skorzystać razem z `actor`: BG z jego drużyn (bez towarzyszy), on pierwszy. */
function _obecni(actor) {
  const druzyny = game.actors.filter(g => g.type === "group" && g.system.members?.some(m => m.actor === actor));
  const inni = [...new Set(druzyny.flatMap(g => g.system.members.map(m => m.actor)))].filter(a => a && a !== actor && mozeMiecFuksy(a));
  return [actor, ...inni];
}

async function _wybierzUczestnikow(actor, nazwa) {
  const obecni = _obecni(actor);
  if (obecni.length < 2) return [actor];
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: nazwa, icon: "fa-solid fa-people-group" },
    content: `<p>Kto korzysta razem z <strong>${esc(actor.name)}</strong>? (Fant kilkuosobowy)</p>
      ${obecni.map((a, i) => `<label class="checkbox"><input type="checkbox" name="${a.id}" ${i === 0 ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}`,
    buttons: [{ action: "ok", label: "Razem", icon: "fa-solid fa-check", default: true,
      callback: (_ev, button) => [...button.form.querySelectorAll("input:checked")].map(i => i.name) }],
    rejectClose: false
  });
  if (!Array.isArray(wybor)) return null;
  return wybor.map(id => game.actors.get(id)).filter(Boolean);
}

/**
 * Wykorzystanie Fantu — Fuksy dla tych, którzy z tego egzemplarza jeszcze nie korzystali.
 * @param {Actor} actor           kto używa (właściciel przedmiotu)
 * @param {{nazwa: string, fant: object, item?: Item|null}} o   `fant` — flaga przedmiotu (migawka sprzed użycia)
 * @param {{uczestnicy?: Actor[]}} [opcje]  bez okna (testy, API)
 */
export async function uzyjFantu(actor, { nazwa, fant, item = null }, { uczestnicy = null } = {}) {
  const lista = uczestnicy ?? (fant.kilkuosobowy ? await _wybierzUczestnikow(actor, nazwa) : [actor]);
  if (!lista?.length) return null;
  const juz = new Set(fant.uzyli ?? []);
  const nowi = [], byli = [], bezFuksow = [];
  for (const a of lista) {
    if (!mozeMiecFuksy(a)) { bezFuksow.push(a); continue; }
    if (!fant.zuzywalny && juz.has(a.id)) { byli.push(a); continue; }
    nowi.push(a);
  }
  const czynnosc = RODZAJE_FANTOW[fant.rodzaj]?.czynnosc ?? "Użyj";
  for (const a of nowi) await przyznajFuksa(a, "fant", { etykieta: `Fant: ${nazwa}`, nosiciel: actor, karta: false });
  if (!fant.zuzywalny && item?.isOwner && nowi.length) {
    await item.setFlag(MODULE_ID, "fant", { ...fant, uzyli: [...new Set([...juz, ...nowi.map(a => a.id)])] });
  }
  await wyslijKarte(kartaPostoju({
    ikona: item?.img ?? "icons/svg/clover.svg",
    tytul: `${czynnosc}: ${nazwa}`,
    podtytul: lista.map(a => a.name).join(", "),
    rodzaj: nowi.length ? "sukces" : "info",
    linie: [
      nowi.length ? `🍀 Fuks bezterminowy: <strong>${esc(nowi.map(a => a.name).join(", "))}</strong> (s. 17).` : "Nikt nie dostaje Fuksa.",
      ...(byli.length ? [`Już korzystali z tego egzemplarza: ${esc(byli.map(a => a.name).join(", "))}.`] : []),
      ...(bezFuksow.length ? [`Bez Fuksów: ${esc(bezFuksow.map(a => a.name).join(", "))} (towarzysz).`] : [])
    ]
  }), { actor });
  return { nowi, byli };
}

/* -------------------------------------------- */
/*  Haki aktywności                              */
/* -------------------------------------------- */

/** Migawka sprzed użycia — zużywalny Fant z `autoDestroy` znika, zanim odpali `postUseActivity`. */
const _migawki = new Map();

function _onPreUseActivity(activity) {
  if (!activity?.flags?.[MODULE_ID]?.fantUzyj) return;
  const item = activity.item;
  const fant = fantPrzedmiotu(item);
  if (fant) _migawki.set(activity.uuid, { nazwa: item.name, fant: foundry.utils.deepClone(fant), itemUuid: item.uuid, img: item.img });
}

async function _onPostUseActivity(activity) {
  if (!activity?.flags?.[MODULE_ID]?.fantUzyj) return;
  const m = _migawki.get(activity.uuid);
  _migawki.delete(activity.uuid);
  const actor = activity.actor ?? activity.item?.actor;
  if (!m || !actor?.isOwner) return;
  const item = fromUuidSync(m.itemUuid);
  await uzyjFantu(actor, { nazwa: m.nazwa, fant: m.fant, item: item ?? null });
}

/* -------------------------------------------- */
/*  Nagroda publiczności (s. 57, U51)            */
/* -------------------------------------------- */

/**
 * Okno nagrody: Fuks bezterminowy / 10 PD / przedmiot do 20 gb.
 * @param {Actor} actor
 * @param {{awardPD: (actor: Actor) => Promise<any>}} o  zapis PD z panelu PD
 * @returns {Promise<"fuks"|"pd"|"przedmiot"|null>}
 */
export async function nagrodaPublicznosci(actor, { awardPD }) {
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Nagroda publiczności", icon: "fa-solid fa-people-arrows" },
    content: `<p>Prezent od drużyny dla <strong>${esc(actor.name)}</strong> (s. 57) — jedno z trzech:</p>`,
    buttons: [
      { action: "fuks", label: "Fuks (bezterminowy)", icon: "fa-solid fa-clover", default: true },
      { action: "pd", label: "10 PD", icon: "fa-solid fa-star" },
      { action: "przedmiot", label: "Przedmiot do 20 gb", icon: "fa-solid fa-gift" }
    ],
    rejectClose: false
  });
  if (wybor === "fuks") await przyznajFuksa(actor, "publicznosc", { etykieta: "Nagroda publiczności" });
  else if (wybor === "pd") await awardPD(actor);
  else if (wybor === "przedmiot") {
    const fanty = fantyDo(20);
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/chest.svg",
      tytul: `Nagroda publiczności: ${actor.name}`,
      podtytul: "przedmiot do 20 gb — MG wybiera",
      linie: ["Dowolny przedmiot do 20 gb albo Fant z listy (pierwsze użycie daje Fuksa bezterminowego):"],
      przyciski: fanty.map(f => ({ akcja: "dajFant", label: `${f.nazwa} (${f.wartosc} gb)`, ikona: "fa-solid fa-gift", gm: true, dane: { aktor: actor.uuid, fant: idFantu(f) } }))
    }), { szept: "gm", actor });
    ui.notifications.info("MG wybierze przedmiot do 20 gb.");
  }
  return wybor ?? null;
}

/** Fant z danych na aktorze (MG — Nagroda publiczności, szabrowanie). */
export async function dajFant(actor, idLubWiersz, { ilosc = 1 } = {}) {
  const f = typeof idLubWiersz === "string" ? FANTY.find(x => idFantu(x) === idLubWiersz) : idLubWiersz;
  if (!f || !actor) return null;
  const pack = game.packs.get(`${MODULE_ID}.sprzet`);
  let data = null;
  if (pack) {
    const idx = await pack.getIndex({ fields: ["flags"] });
    const wpis = idx.find(e => e.flags?.[MODULE_ID]?.fant?.id === idFantu(f));
    const doc = wpis ? await pack.getDocument(wpis._id) : null;
    if (doc) data = game.items.fromCompendium(doc, { keepId: false, clearFolder: true });
  }
  data ??= fantItemData(f);
  data.system.quantity = ilosc;
  if (!actor.isOwner) {
    await doMG("dajFant", { aktor: actor.uuid, fant: idFantu(f), ilosc });
    return null;
  }
  const [item] = await actor.createEmbeddedDocuments("Item", [data]);
  return item;
}

export function registerFanty() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  zarejestrujAkcje("dajFant", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    const item = await dajFant(actor, btn.dataset.fant);
    if (item) ui.notifications.info(`${actor.name}: ${item.name}.`);
  });
  zarejestrujProsbe("dajFant", async (_n, d) => {
    const actor = await fromUuid(d.aktor);
    if (actor) await dajFant(actor, d.fant, { ilosc: d.ilosc ?? 1 });
  });
}

export const fantyApi = Object.freeze({ uzyj: uzyjFantu, daj: dajFant, nagrodaPublicznosci, fant: fantPrzedmiotu, FANTY });
