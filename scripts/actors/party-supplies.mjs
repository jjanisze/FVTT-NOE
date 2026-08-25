/**
 * Neuroshima 5e — Zapasy drużyny (zakładka „Zapasy” na karcie grupy).
 *
 * Prowiant i woda są w tym systemie mechaniką, nie kolorytem: brak racji to Wyczerpanie,
 * a Wyczerpania z Niedożywienia i Odwodnienia **nie zdejmuje długi odpoczynek**, dopóki
 * postać nie zje i nie wypije pełnej dziennej porcji (~17316–17340). Zakładka istnieje po to,
 * żeby MG widział, ile dni autonomii ma drużyna, zanim ta mechanika zacznie boleć.
 *
 * ## Skąd liczone są stany
 * Skanowane są itemy grupy, `primaryVehicle` i wszystkich członków. Item jest zapasem, jeśli
 * ma flagę `flags[MODULE].zasob.kind` — a jeśli nie, rozpoznajemy go po nazwie
 * (`ZASOBY_KATEGORIE[].rx`). Fallback po nazwie jest celowy: w tym świecie zapasy to dziś
 * bezładne `loot` („Konserwa”, „Manierka”), a zakładka ma być użyteczna przed migracją.
 *
 * Ilość: `flags.zasob.amount` → waga sztuki → domyślna `perUnit` kategorii, ×`quantity`.
 * Litr wody liczymy jak kilogram — dla wody to prawda z dokładnością do temperatury.
 *
 * ## Zużycie
 * Każdy je i pije najpierw ze swojego plecaka, dopiero potem ze wspólnej kupy (grupa +
 * pojazd). To jedyny porządek, który nie każe MG rozstrzygać, czyja to była konserwa.
 */

import {
  ZASOBY_KATEGORIE, JEDZENIE_NA_DOBE, WODA_NA_DOBE,
  NIEDOZYWIENIE_ST, POLOWANIE_ST, GOTOWANIE_ST, GOTOWANIE_FUKS
} from "../config/podroz-data.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";
import { getFuksy, setFuksy, MAX_FUKSY } from "../combat/rerolls.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KATEGORIE_MAP = Object.fromEntries(ZASOBY_KATEGORIE.map(c => [c.kind, c]));
// Te dwa znaczniki dnd5e czyta w długim odpoczynku (`hasConditionEffect("malnourished"
// / "dehydrated")`), więc nie są tylko ozdobą żetonu.
const ZNACZNIK = { jedzenie: "malnutrition", woda: "dehydration" };

/* -------------------------------------------- */
/*  Rozpoznawanie i zliczanie                    */
/* -------------------------------------------- */

/** @returns {string|null} Kategoria zapasu dla itemu, albo null. */
function classify(item) {
  const flagged = item.getFlag(MODULE_ID, "zasob")?.kind;
  if (flagged && flagged in KATEGORIE_MAP) return flagged;
  if (item.type === "weapon" || item.type === "armor" || item.type === "class") return null;
  return ZASOBY_KATEGORIE.find(c => c.rx.test(item.name))?.kind ?? null;
}

/** Ile jednostek (kg / l / szt.) daje jedna sztuka tego itemu. */
function perUnit(item, kind) {
  const flagged = Number(item.getFlag(MODULE_ID, "zasob")?.amount);
  if (Number.isFinite(flagged) && flagged > 0) return flagged;
  const weight = Number(item.system?.weight?.value ?? 0);
  if (weight > 0 && KATEGORIE_MAP[kind].unit !== "szt.") return weight;
  return KATEGORIE_MAP[kind].perUnit;
}

/** Wszyscy aktorzy, których ekwipunek wchodzi do wspólnej puli. */
function supplyActors(groupActor) {
  const vehicle = groupActor.system.primaryVehicle;
  const members = groupActor.system.members.map(m => m.actor).filter(Boolean);
  return [groupActor, ...(vehicle ? [vehicle] : []), ...members]
    .filter((a, i, arr) => arr.indexOf(a) === i);
}

/** Żywi członkowie — ci jedzą, piją i zbierają Wyczerpanie. */
function creatures(groupActor) {
  return groupActor.system.members.map(m => m.actor).filter(a => a && a.type !== "vehicle");
}

/**
 * Wszystkie pozycje zapasów danej kategorii u jednego aktora.
 * @returns {Array<{item: Item5e, kind: string, per: number, qty: number, ilosc: number}>}
 */
function entriesFor(actor, kind) {
  const out = [];
  for (const item of actor.items) {
    if (classify(item) !== kind) continue;
    const qty = Number(item.system?.quantity ?? 1) || 0;
    if (qty <= 0) continue;
    const per = perUnit(item, kind);
    out.push({ item, kind, per, qty, ilosc: per * qty });
  }
  return out;
}

/* -------------------------------------------- */
/*  Kontekst zakładki                            */
/* -------------------------------------------- */

/** Dzienne zapotrzebowanie jednej postaci. */
export function dailyNeed(actor) {
  const size = actor.system?.traits?.size ?? "med";
  return { jedzenie: JEDZENIE_NA_DOBE[size] ?? 0.5, woda: WODA_NA_DOBE[size] ?? 2 };
}

const round = n => Number(n.toFixed(2));
/** Przecinek dziesiętny — te liczby idą wprost na ekran. */
const fmt = n => round(n).toLocaleString("pl-PL");

export function buildSuppliesContext(groupActor) {
  const actors = supplyActors(groupActor);
  const zywi = creatures(groupActor);

  const potrzeba = { jedzenie: 0, woda: 0 };
  const osoby = zywi.map(a => {
    const need = dailyNeed(a);
    potrzeba.jedzenie += need.jedzenie;
    potrzeba.woda += need.woda;
    const size = a.system?.traits?.size ?? "med";
    return {
      uuid: a.uuid, name: a.name, img: a.img,
      sizeLabel: CONFIG.DND5E.actorSizes[size]?.label ?? size,
      jedzenie: fmt(need.jedzenie),
      woda: fmt(need.woda)
    };
  });

  const kategorie = ZASOBY_KATEGORIE.map(cat => {
    const pozycje = [];
    let total = 0;
    for (const actor of actors) {
      for (const e of entriesFor(actor, cat.kind)) {
        total += e.ilosc;
        pozycje.push({
          uuid: e.item.uuid, name: e.item.name, img: e.item.img,
          owner: actor === groupActor ? "Drużyna" : actor.name,
          qty: e.qty, sort: e.ilosc, ilosc: fmt(e.ilosc)
        });
      }
    }
    const naDobe = potrzeba[cat.kind] ?? 0;
    return {
      kind: cat.kind,
      label: cat.label,
      icon: cat.icon,
      unit: cat.unit,
      total: fmt(total),
      naDobe: naDobe > 0 ? fmt(naDobe) : null,
      dni: naDobe > 0 ? fmt(total / naDobe) : null,
      krytyczne: naDobe > 0 && total / naDobe < 2,
      pozycje: pozycje.sort((a, b) => b.sort - a.sort)
    };
  });

  const vehicle = groupActor.system.primaryVehicle;
  return {
    isGM: game.user.isGM,
    kategorie,
    osoby,
    potrzeba: { jedzenie: fmt(potrzeba.jedzenie), woda: fmt(potrzeba.woda) },
    pojazd: vehicle ? { uuid: vehicle.uuid, name: vehicle.name, img: vehicle.img } : null,
    niedozywienieST: NIEDOZYWIENIE_ST,
    polowanieST: POLOWANIE_ST,
    gotowanieST: GOTOWANIE_ST
  };
}

/* -------------------------------------------- */
/*  Zużycie                                      */
/* -------------------------------------------- */

/** Ile danego zasobu leży w ładowni podanych aktorów. */
export function countSupply(actors, kind) {
  return round(actors.reduce((sum, a) => sum + entriesFor(a, kind).reduce((s, e) => s + e.ilosc, 0), 0));
}

/**
 * Paliwo leje się litrami, więc ostatni pojemnik traci pojemność, zamiast znikać w całości —
 * inaczej zatankowanie 5 l opróżniałoby 112-litrową beczkę.
 * @returns {Promise<number>} Ile litrów faktycznie udało się pobrać.
 */
export async function drawFuel(actors, litry) {
  let left = litry;
  for (const actor of actors) {
    for (const e of entriesFor(actor, "paliwo")) {
      if (left <= 0.001) break;
      const take = Math.min(left, e.ilosc);
      const rest = e.ilosc - take;
      left -= take;
      if (rest <= 0.001) await e.item.delete();
      else if (Number.isInteger(rest / e.per)) await e.item.update({ "system.quantity": rest / e.per });
      else await e.item.update({ "system.quantity": 1, "system.weight.value": round(rest) });
    }
  }
  return round(litry - Math.max(left, 0));
}

/**
 * Zdejmij `need` jednostek z podanych aktorów, po kolei.
 * Stack jest niepodzielny, więc pobranie 0,5 kg z konserwy 1 kg zjada całą konserwę —
 * RAW nie zna połówek racji, a udawanie ułamków w `quantity` psułoby wagę ekwipunku.
 * @returns {Promise<number>} Ile faktycznie udało się zdjąć.
 */
async function drawSupply(actors, kind, need) {
  let remaining = need;
  for (const actor of actors) {
    if (remaining <= 0.0001) break;
    for (const e of entriesFor(actor, kind)) {
      if (remaining <= 0.0001) break;
      const units = Math.min(e.qty, Math.ceil(remaining / e.per));
      remaining -= units * e.per;
      const left = e.qty - units;
      if (left > 0) await e.item.update({ "system.quantity": left });
      else await e.item.delete();
    }
  }
  return need - Math.max(remaining, 0);
}

/**
 * Dzienne zapotrzebowanie całej drużyny.
 *
 * Jedzenie poniżej połowy racji → RO na Kondycję ST 10 albo poziom Wyczerpania.
 * Woda poniżej połowy → poziom Wyczerpania **bez rzutu**, RAW nie daje tu szansy.
 * Oba źródła są oznaczone (`niedozywienie` / `odwodnienie`), więc długi odpoczynek ich nie zdejmie.
 */
export async function consumeDailyNeeds(groupActor) {
  const wspolne = [groupActor, groupActor.system.primaryVehicle].filter(Boolean);
  const wiersze = [];

  for (const actor of creatures(groupActor)) {
    const need = dailyNeed(actor);
    const wynik = { name: actor.name, notatki: [] };

    for (const kind of ["jedzenie", "woda"]) {
      const wanted = need[kind];
      const got = await drawSupply([actor, ...wspolne], kind, wanted);
      const unit = KATEGORIE_MAP[kind].unit;
      const label = KATEGORIE_MAP[kind].label;

      if (got >= wanted - 0.0001) {
        // Tylko pełna racja zdejmuje znacznik — RAW: „nie da się usunąć, dopóki nie zje pełnej porcji".
        await actor.toggleStatusEffect(ZNACZNIK[kind], { active: false });
        wynik.notatki.push(`${label}: ${round(got)} ${unit} — pełna racja.`);
        continue;
      }
      if (got >= wanted / 2) {
        wynik.notatki.push(`${label}: ${round(got)} / ${wanted} ${unit} — pół racji, bez konsekwencji.`);
        continue;
      }

      await actor.toggleStatusEffect(ZNACZNIK[kind], { active: true });
      if (kind === "woda") {
        await addExhaustion(actor, "odwodnienie");
        wynik.notatki.push(`<span class="neuro-zle">${label}: ${round(got)} / ${wanted} ${unit} — Odwodnienie, +1 Wyczerpanie.</span>`);
        continue;
      }

      const [roll] = (await actor.rollSavingThrow({
        ability: "con", target: NIEDOZYWIENIE_ST,
        flavor: `Niedożywienie — RO na Kondycję ST ${NIEDOZYWIENIE_ST}`
      })) ?? [];
      const ok = roll ? (roll.total >= NIEDOZYWIENIE_ST) : false;
      if (!ok) await addExhaustion(actor, "niedozywienie");
      wynik.notatki.push(ok
        ? `${label}: ${round(got)} / ${wanted} ${unit} — RO zdane (${roll?.total ?? "?"}).`
        : `<span class="neuro-zle">${label}: ${round(got)} / ${wanted} ${unit} — RO oblane (${roll?.total ?? "brak rzutu"}), +1 Wyczerpanie.</span>`);
    }
    wiersze.push(wynik);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: groupActor }),
    content: `<div class="neuro-zapasy-card"><h3>Dzienne zapotrzebowanie</h3>`
      + wiersze.map(w => `<p><strong>${w.name}</strong><br>${w.notatki.join("<br>")}</p>`).join("")
      + `</div>`
  });
}

/* -------------------------------------------- */
/*  Polowanie i gotowanie                        */
/* -------------------------------------------- */

/** Prosty wybór postaci — obie akcje potrzebują dokładnie tego samego pytania. */
async function pickMember(groupActor, title) {
  const opcje = creatures(groupActor).filter(a => a.isOwner);
  if (!opcje.length) {
    ui.notifications.warn("Brak postaci, którymi możesz rzucać.");
    return null;
  }
  if (opcje.length === 1) return opcje[0];

  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title },
    content: `<select name="who" style="width:100%">${
      opcje.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}</select>`,
    ok: { label: "Rzuć", callback: (_ev, _btn, dialog) => dialog.element.querySelector("[name=who]").value },
    rejectClose: false
  });
  return id ? opcje.find(a => a.id === id) ?? null : null;
}

/**
 * Polowanie na postoju (~2754): 1 h → Test Mądrości (Survival) ST 15.
 * Sukces = czysta woda **albo** jedzenie dla jednej osoby na dobę; porażka o więcej niż 5
 * kosztuje poziom Wyczerpania i nie daje nic.
 *
 * Nagroda nie jest tworzona jako item: RAW opisuje ją jako „źródło”, a MG i tak decyduje,
 * czy to strumień, czy zając. Karta mówi, co drużyna zdobyła.
 */
export async function hunt(groupActor) {
  const actor = await pickMember(groupActor, `Polowanie — Test Mądrości (Survival) ST ${POLOWANIE_ST}`);
  if (!actor) return;

  const [roll] = (await actor.rollSkill({
    skill: "sur", target: POLOWANIE_ST,
    flavor: `Polowanie i zbieractwo — ST ${POLOWANIE_ST}`
  })) ?? [];
  if (!roll) return;

  const margines = roll.total - POLOWANIE_ST;
  let wynik;
  if (margines >= 0) wynik = "Sukces — źródło czystej wody <em>albo</em> jedzenie dla jednej osoby na dobę. Wybór należy do drużyny.";
  else if (margines > -5) wynik = "Porażka — godzina zmarnowana, ale bez szkody.";
  else {
    await addExhaustion(actor, "forsowanie");
    wynik = `<span class="neuro-zle">Porażka o ponad 5 — nic nie znaleziono, ${actor.name} dostaje poziom Wyczerpania.</span>`;
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-zapasy-card"><h3>Polowanie</h3><p>${wynik}</p></div>`
  });
}

/**
 * Gotowanie na postoju (~2740): narzędzia małego kucharza + składniki + 2 h → Test narzędzi ST 10.
 * Sukces daje Ułatwienie w następnym RO każdemu, kto jadł; wynik ≥ 20 rozdaje Fuksa na 24 h.
 *
 * Ułatwienie zostaje przy MG (jest jednorazowe i zależy od tego, kto faktycznie jadł),
 * ale Fuks jest zasobem liczbowym, więc jest przyznawany od razu.
 */
export async function cook(groupActor) {
  const actor = await pickMember(groupActor, `Gotowanie — Test narzędzi ST ${GOTOWANIE_ST}`);
  if (!actor) return;

  const narzedzia = actor.items.find(i => i.type === "tool" && i.system?.type?.baseItem === "kucharza");
  if (!narzedzia) {
    ui.notifications.warn(`${actor.name} nie ma narzędzi małego kucharza.`);
    return;
  }

  const roll = await narzedzia.rollToolCheck({
    target: GOTOWANIE_ST,
    flavor: `Gotowanie — ST ${GOTOWANIE_ST}`
  });
  const total = Array.isArray(roll) ? roll[0]?.total : roll?.total;
  if (total === undefined) return;

  const linie = [];
  if (total >= GOTOWANIE_ST) linie.push("Sukces — każdy, kto jadł, ma <strong>Ułatwienie w następnym RO</strong>.");
  else linie.push("Porażka — posiłek jest jadalny i na tym koniec zalet.");

  if (total >= GOTOWANIE_FUKS) {
    const obdarowani = [];
    for (const a of creatures(groupActor)) {
      const fuksy = getFuksy(a);
      if (fuksy >= MAX_FUKSY) continue;
      await setFuksy(a, fuksy + 1);
      obdarowani.push(a.name);
    }
    linie.push(`Wynik ${total} — <strong>Fuks</strong> na 24 h dla: ${obdarowani.join(", ") || "nikogo (wszyscy mają komplet)"}.`);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-zapasy-card"><h3>Gotowanie</h3>${linie.map(l => `<p>${l}</p>`).join("")}</div>`
  });
}

/** Eksponowane jako `game.neuroshima.zapasy`. */
export const suppliesApi = { buildSuppliesContext, consumeDailyNeeds, hunt, cook, dailyNeed, drawFuel, countSupply };
