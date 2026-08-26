/**
 * Neuroshima 5e — Podróż drużyny: tempo, biomy, trudny teren.
 *
 * Zastępuje natywną kartę „Travel Pace” z `templates/actors/group/header.hbs`.
 * Natywny model dnd5e (land/water/air, mile na dobę, `slow|normal|fast`) nie odwzorowuje
 * neuroshimowej tabeli tempa, więc karta drużyny trzyma własny stan w fladze i **nie**
 * rusza `system.attributes.travel.pace` — dzięki temu `GroupData#getTravelPace()` dalej
 * działa dla kogokolwiek, kto go czyta.
 *
 * ## Mój biom (Zwiadowca 1, ~6296)
 * Podręcznik każe wybrać dwa (potem więcej) ulubione biomy, ale w danych istniała dotąd
 * wyłącznie ich **liczba** — `@scale.zwiadowca.mojBiom`. Który biom, nie wiedział nikt.
 * Wybór trafia więc do `flags[MODULE].biomy` (tablica id z `config/podroz-data.mjs`),
 * a liczba slotów dalej pochodzi ze scale value, żeby awans postaci automatycznie
 * otwierał kolejny slot.
 *
 * Detekcja zwiadowcy idzie po scale value, nie po itemie zdolności: w tym świecie
 * „Mój wróg” istnieje jako warianty (`moj-wrog-ludzie`, `moj-wrog-potwory`), a itemu
 * `moj-biom` na kartach po prostu nie ma — scale value jest jedynym pewnym śladem.
 */

import {
  TEMPA, TEMPA_MAP, TEMPO_DOMYSLNE, GODZIN_MARSZU, GODZIN_MARSZU_CALODOBOWO,
  TRANSPORT, TRANSPORT_MAP, TRANSPORT_DOMYSLNY, PALIWO_DOMYSLNE,
  BIOMY, BIOMY_MAP, BIOM_KORZYSCI, BIOM_ZBIERACTWO_OSOB
} from "../config/podroz-data.mjs";
import { drawFuel, countSupply } from "./party-supplies.mjs";
import { isLootLocked } from "./party-loot-lock.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const CICHY_KROK_ID = "cichy-krok";

/** Sample CC0 z Freesound — źródła w `dev/audio/FREESOUND_TRAVEL_SOURCES.md`. */
const DZWIEKI = {
  pieszo: `modules/${MODULE_ID}/sounds/travel/travel_foot.ogg`,
  wierzchowiec: `modules/${MODULE_ID}/sounds/travel/travel_mount.ogg`,
  pojazd: `modules/${MODULE_ID}/sounds/travel/travel_vehicle.ogg`,
  tankowanie: `modules/${MODULE_ID}/sounds/travel/refuel.ogg`
};

/** Słychać u wszystkich — wyruszenie w trasę to wydarzenie dla całego stołu. */
function zagraj(src) {
  if (src) foundry.audio.AudioHelper.play({ src, volume: 0.6, loop: false }, true);
}

/* -------------------------------------------- */
/*  Biomy — dane na karcie postaci               */
/* -------------------------------------------- */

/** Ile biomów wolno wybrać tej postaci (0 = nie jest zwiadowcą). */
export function biomeSlots(actor) {
  return Number(actor?.system?.scale?.zwiadowca?.mojBiom?.value ?? 0) || 0;
}

/** @returns {string[]} Wybrane biomy, przycięte do aktualnej liczby slotów. */
export function getBiomy(actor) {
  const stored = actor?.getFlag(MODULE_ID, "biomy");
  if (!Array.isArray(stored)) return [];
  return stored.filter(id => id in BIOMY_MAP).slice(0, biomeSlots(actor));
}

export async function setBiomy(actor, ids) {
  const clean = [...new Set(ids)].filter(id => id in BIOMY_MAP).slice(0, biomeSlots(actor));
  return actor.setFlag(MODULE_ID, "biomy", clean);
}

/** Czy postać ignoruje trudny teren dla siebie samej (Zwiadowca 3 — Cichy krok). */
function hasCichyKrok(actor) {
  return !!actor?.items?.find(i => i.getFlag(MODULE_ID, "abilityId") === CICHY_KROK_ID);
}

/* -------------------------------------------- */
/*  Picker biomów                                */
/* -------------------------------------------- */

/**
 * Dialog wyboru biomów. Zaznaczenie ponad limit jest blokowane w locie — spadek limitu
 * (np. po cofnięciu poziomu) tylko ostrzega i przycina przy zapisie.
 */
export async function openBiomePicker(actor) {
  const slots = biomeSlots(actor);
  if (!slots) {
    ui.notifications.warn(`${actor.name} nie ma zdolności „Mój biom”.`);
    return;
  }
  const chosen = new Set(getBiomy(actor));

  const rows = BIOMY.map(b => `
    <label class="neuro-biom-option">
      <input type="checkbox" name="biom" value="${b.id}" ${chosen.has(b.id) ? "checked" : ""}>
      <i class="${b.icon}"></i>
      <span>${b.label}</span>
    </label>`).join("");

  const content = `
    <p class="neuro-biom-hint">Wybierz <strong>${slots}</strong> ulubione biomy.</p>
    <div class="neuro-biom-grid">${rows}</div>
    <ul class="neuro-biom-korzysci">${BIOM_KORZYSCI.map(k => `<li>${k}</li>`).join("")}</ul>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Mój biom — ${actor.name}` },
    classes: ["neuro-biom-picker"],
    position: { width: 460 },
    content,
    ok: {
      label: "Zapisz",
      callback: (_ev, _btn, dialog) => [...dialog.element.querySelectorAll("input[name=biom]:checked")]
        .map(i => i.value)
    },
    render: (_ev, dialog) => {
      const boxes = [...dialog.element.querySelectorAll("input[name=biom]")];
      const sync = () => {
        const picked = boxes.filter(b => b.checked).length;
        boxes.forEach(b => { b.disabled = !b.checked && picked >= slots; });
      };
      boxes.forEach(b => b.addEventListener("change", sync));
      sync();
    },
    rejectClose: false
  });

  if (result) await setBiomy(actor, result);
}

/* -------------------------------------------- */
/*  Stan podróży drużyny                         */
/* -------------------------------------------- */

/**
 * `aktywna` to przełącznik „drużyna jest w drodze”. Bez niego modyfikatory tempa
 * doklejałyby się do każdego rzutu Percepcją w środku rozmowy w barze.
 * @returns {{tempo: string, transport: string, biom: string|null, trasa: number,
 *            trudnyTeren: boolean, calodobowa: boolean, aktywna: boolean}}
 */
export function getPodroz(groupActor) {
  const stored = groupActor?.getFlag(MODULE_ID, "podroz") ?? {};
  return {
    tempo: stored.tempo in TEMPA_MAP ? stored.tempo : TEMPO_DOMYSLNE,
    transport: stored.transport in TRANSPORT_MAP ? stored.transport : TRANSPORT_DOMYSLNY,
    biom: stored.biom in BIOMY_MAP ? stored.biom : null,
    trasa: Math.max(0, Number(stored.trasa) || 0),
    trudnyTeren: !!stored.trudnyTeren,
    calodobowa: !!stored.calodobowa,
    aktywna: !!stored.aktywna
  };
}

export async function setPodroz(groupActor, patch) {
  return groupActor.setFlag(MODULE_ID, "podroz", { ...getPodroz(groupActor), ...patch });
}

/** Żywi członkowie drużyny (bez pojazdów). */
function partyCreatures(groupActor) {
  return groupActor.system.members
    .map(m => m.actor)
    .filter(a => a && a.type !== "vehicle");
}

/** Bazowa Szybkość, do której odnosi się drabinka temp (Powolne=1/4 ... Bardzo szybkie=4/4). */
const BASE_SPEED = 9;

/**
 * Członek drużyny z najniższą Szybkością marszu — Zranienie, Wyczerpanie itd. potrafią
 * zejść poniżej bazowych 9 m. Liczy się tylko pieszo: wierzchowiec i pojazd niosą swoich
 * pasażerów, więc czyjaś własna Szybkość nóg nie ma tam znaczenia.
 */
function slowestWalker(groupActor) {
  let slowest = null;
  for (const actor of partyCreatures(groupActor)) {
    const walk = Number(actor.system.attributes?.movement?.walk);
    if (!Number.isFinite(walk)) continue;
    if (!slowest || walk < slowest.walk) slowest = { actor, walk };
  }
  return slowest;
}

/**
 * Kto zna wybrany biom (Mój biom), a kto tylko sam ignoruje trudny teren (Cichy krok).
 * Czy znajomość biomu znosi teren dla drużyny, rozstrzyga `buildTravelContext` —
 * RAW wiąże to z marszem pieszym.
 */
function terrainWaivers(groupActor, biom) {
  const znawcy = [];
  const solo = [];
  for (const actor of partyCreatures(groupActor)) {
    if (biom && getBiomy(actor).includes(biom)) {
      znawcy.push({ name: actor.name, powod: `Mój biom: ${BIOMY_MAP[biom].label}` });
    } else if (hasCichyKrok(actor)) {
      solo.push({ name: actor.name, powod: "Cichy krok" });
    }
  }
  return { znawcy, solo };
}

/** „4 osoby”, ale „12 osób” — polska odmiana po liczebniku. */
function osobyForm(n) {
  const last = n % 10;
  const teens = n % 100 >= 12 && n % 100 <= 14;
  return (!teens && last >= 2 && last <= 4) ? "osoby" : "os\u00f3b";
}

/** „Podróż pieszo normalnym tempem całą dobę przez ruiny” — stan podróży jednym zdaniem. */
function opisPodrozy({ transport, tempo, calodobowa, biom, trudnyTeren }) {
  let zdanie = `Podróż ${transport.przyslowek} ${tempo.narzednik} tempem `
    + (calodobowa ? "całą dobę" : "8 h dziennie");
  if (biom) zdanie += ` przez ${biom.przez}`;
  if (trudnyTeren) zdanie += biom ? " (trudny teren)" : " przez trudny teren";
  return zdanie;
}

/** Ściąga: co dokładnie robi włączony przełącznik „W drodze”. */
function wDrodzeTooltip(tempo, znawcy, solo) {
  const pozycje = tempo.mods.map(m => {
    const nazwa = CONFIG.DND5E.skills[m.skill]?.label ?? m.skill;
    return `<li>${m.mode > 0 ? "Ułatwienie" : "Utrudnienie"} — ${nazwa} (wszyscy członkowie)</li>`;
  });
  if (tempo.ukrycieNiemozliwe) pozycje.push("<li>Ukrycie się drużyny jest niemożliwe</li>");
  if (znawcy.length) pozycje.push(`<li>Nie da się zaskoczyć: ${znawcy.map(z => z.name).join(", ")}</li>`);
  if (solo.length) pozycje.push(`<li>Cichy krok (tylko dla siebie): ${solo.map(z => z.name).join(", ")}</li>`);

  return "<strong>Doklejane do rzutów, póki włączone:</strong>"
    + (pozycje.length ? `<ul>${pozycje.join("")}</ul>` : "<p><em>Bieżące tempo niczego nie zmienia.</em></p>");
}

/** „2 d 4 h” — doby marszu i reszta, żeby ominąć odmianę „dnia/dni/dób”. */
function czasPrzejscia(km, perHour, godzin) {  if (!km) return null;
  const godziny = km / perHour;
  const doby = Math.floor(godziny / godzin);
  const reszta = Math.round(godziny - doby * godzin);
  return doby ? `${doby} d${reszta ? ` ${reszta} h` : ""}` : `${Math.max(1, reszta)} h`;
}

const zaokr = n => Number(n.toFixed(1));

/**
 * Zbiornik wewnętrzny pojazdu. Kanistry w ładowni to osobny zapas (zakładka Zapasy) —
 * na trasie liczy się tylko to, co jest w baku.
 * @returns {{value: number, max: number, spalanie: number}} litry, litry, l/100 km
 */
export function getPaliwo(vehicle) {
  const stored = vehicle?.getFlag(MODULE_ID, "paliwo") ?? {};
  const max = Math.max(1, Number(stored.max) || PALIWO_DOMYSLNE.max);
  const spalanie = Math.max(0.1, Number(stored.spalanie) || PALIWO_DOMYSLNE.spalanie);
  const value = stored.value === undefined ? max : Math.clamp(Number(stored.value) || 0, 0, max);
  return { value: zaokr(value), max, spalanie };
}

export async function setPaliwo(vehicle, patch) {
  return vehicle.setFlag(MODULE_ID, "paliwo", { ...getPaliwo(vehicle), ...patch });
}

/**
 * Dane paska paliwa.
 * @param {number} zuzycie Litry, które pochłonie zaplanowana trasa — rysowane jako odjęty odcinek.
 */
export function paliwoWidok(vehicle, zuzycie = 0) {
  const bak = getPaliwo(vehicle);
  const spalanieTrasy = zaokr(Math.min(Math.max(zuzycie, 0), bak.value));
  return {
    ...bak,
    nazwa: vehicle.name,
    zasieg: zaokr(bak.value / bak.spalanie * 100),
    pct: Math.round(bak.value / bak.max * 100),
    wKanistrach: countSupply(zrodlaPaliwa(vehicle, vehicle), "paliwo"),
    spalanieTrasy,
    pctZuzycia: bak.value ? Math.round(spalanieTrasy / bak.value * 100) : 0
  };
}

/** Jeden generator paska dla karty drużyny i karty pojazdu. */
export function paliwoPasekHTML(p, { owner = false, kolumna = false } = {}) {
  const pusty = p.value <= 0;
  const koszt = p.spalanieTrasy
    ? `<span class="neuro-paliwo-koszt" data-tooltip="Tyle ubędzie po zatwierdzeniu przejazdu.">−${p.spalanieTrasy} l</span>`
    : "";
  const przyciski = owner ? `
      <button type="button" class="neuro-toggle" data-action="neuroTankuj"
              data-tooltip="Przelej paliwo z ładowni do baku.">
        <i class="fa-solid fa-fill-drip" inert></i><span>Tankuj</span>
      </button>
      <button type="button" class="neuro-toggle neuro-paliwo-ustaw" data-action="neuroBak"
              data-tooltip="Pojemność baku, spalanie i aktualny stan.">
        <i class="fa-solid fa-sliders" inert></i>
      </button>` : "";

  return `
    <div class="neuro-paliwo${kolumna ? " is-kolumna" : ""}${pusty ? " is-pusty" : ""}"
         data-tooltip="${p.nazwa} — zbiornik wewnętrzny. Kanistry w ładowni licz osobno.">
      <i class="fa-solid fa-gas-pump" inert></i>
      <div class="neuro-paliwo-pasek">
        <div class="neuro-paliwo-poziom" style="width: ${p.pct}%">
          <div class="neuro-paliwo-zuzycie" style="width: ${p.pctZuzycia}%"></div>
        </div>
      </div>
      <span class="neuro-paliwo-liczby">${p.value} / ${p.max} l ${koszt}</span>
      <span class="neuro-paliwo-przebieg">${p.spalanie} l/100 km · zasięg ${p.zasieg} km · kanistry ${p.wKanistrach} l</span>
      ${przyciski}
    </div>`;
}

/** Bak nie ma odpowiednika w dnd5e, więc pojemność i spalanie MG ustawia tutaj. */
export async function ustawBak(vehicle) {
  const bak = getPaliwo(vehicle);
  const pole = (name, label, value, step) =>
    `<div class="form-group"><label>${label}</label><div class="form-fields">`
    + `<input type="number" name="${name}" value="${value}" min="0" step="${step}"></div></div>`;

  const dane = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Zbiornik — ${vehicle.name}` },
    content: pole("value", "W baku (l)", bak.value, 0.5)
      + pole("max", "Pojemność (l)", bak.max, 1)
      + pole("spalanie", "Spalanie (l/100 km)", bak.spalanie, 0.5),
    ok: {
      label: "Zapisz",
      callback: (ev, btn) => {
        const f = btn.form.elements;
        return { value: Number(f.value.value), max: Number(f.max.value), spalanie: Number(f.spalanie.value) };
      }
    },
    rejectClose: false
  });
  if (dane) await setPaliwo(vehicle, dane);
}

/** Grupa + pojazd + członkowie — wszystko, co może wieźć kanister. */
function zrodlaPaliwa(actor, pojazd) {
  const grupy = actor.type === "group"
    ? [actor]
    : game.actors.filter(a => a.type === "group" && a.system.primaryVehicle === pojazd);
  const czlonkowie = grupy.flatMap(g => g.system.members.map(m => m.actor).filter(Boolean));
  return [...new Set([pojazd, ...grupy, ...czlonkowie])];
}

/** Przelej paliwo z ładowni do baku. Działa z karty drużyny i z karty pojazdu. */
export async function tankuj(actor) {
  const pojazd = actor.type === "vehicle" ? actor : actor.system.primaryVehicle;
  if (!pojazd) return ui.notifications.warn("Drużyna nie ma przypisanego pojazdu.");

  const bak = getPaliwo(pojazd);
  const brak = zaokr(bak.max - bak.value);
  if (brak <= 0) return ui.notifications.info(`${pojazd.name}: bak jest pełny.`);

  const zrodla = zrodlaPaliwa(actor, pojazd);
  const wLadowni = countSupply(zrodla, "paliwo");
  if (!wLadowni) return ui.notifications.warn("Brak paliwa w kanistrach.");
  const limit = Math.min(brak, wLadowni);

  const litry = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Tankowanie — ${pojazd.name}` },
    content: `<p>W baku <strong>${bak.value} / ${bak.max} l</strong>, wolnego miejsca ${brak} l.</p>`
      + `<p>W kanistrach i beczkach: <strong>${wLadowni} l</strong>.</p>`
      + `<p>Ile litrów przelać?</p>`
      + `<input type="number" name="litry" value="${limit}" min="0" max="${limit}" step="0.5" autofocus>`,
    ok: { label: "Tankuj", callback: (ev, btn) => Number(btn.form.elements.litry.value) || 0 },
    rejectClose: false
  });
  if (!litry) return;

  const wlane = await drawFuel(zrodla, Math.min(litry, limit));
  if (!wlane) return ui.notifications.warn("Brak paliwa w ładowni.");

  await setPaliwo(pojazd, { value: bak.value + wlane });
  zagraj(DZWIEKI.tankowanie);
  ui.notifications.info(`${pojazd.name}: wlano ${wlane} l — bak ${zaokr(bak.value + wlane)} / ${bak.max} l.`);
}

/**
 * Pełen kontekst panelu Podróż.
 *
 * Cztery rzeczy ograniczają tempo, w tej kolejności: wybór MG, sufit transportu
 * („Bardzo szybkie jest możliwe tylko pojazdem mechanicznym”), Szybkość najwolniejszego
 * pieszego członka drużyny (kto nie ma 4/4 bazowych 9 m, nie utrzyma najszybszych temp)
 * i trudny teren, który wymusza Powolne — chyba że drużyna idzie pieszo przez biom znany
 * zwiadowcy.
 */
export function buildTravelContext(groupActor) {
  const state = getPodroz(groupActor);
  const transport = TRANSPORT_MAP[state.transport];
  const { znawcy, solo } = terrainWaivers(groupActor, state.biom);

  const pieszo = state.transport === "pieszo";
  const zniesiony = pieszo && znawcy.length > 0;
  const spowolnienie = state.trudnyTeren && !zniesiony;

  const sufit = TEMPA.indexOf(TEMPA_MAP[transport.maxTempo]);

  // Próg tempa N to N/4 bazowej Szybkości (Powolne=2,25 m ... Bardzo szybkie=9 m) —
  // kto nie ma tyle Szybkości, nie nadąża pieszo za resztą.
  const wolny = pieszo ? slowestWalker(groupActor) : null;
  const przekroczonyPrzezWolnego = wolny
    ? TEMPA.findIndex((t, i) => wolny.walk < (i + 1) * (BASE_SPEED / TEMPA.length))
    : -1;
  const sufitSzybkosci = przekroczonyPrzezWolnego === -1 ? TEMPA.length - 1 : Math.max(0, przekroczonyPrzezWolnego - 1);
  const sufitLaczny = wolny ? Math.min(sufit, sufitSzybkosci) : sufit;
  const wolnyLimituje = wolny && sufitSzybkosci < sufit;

  const wybranyIndex = TEMPA.findIndex(t => t.id === state.tempo);
  const ograniczone = wybranyIndex > sufitLaczny;
  const dozwolone = TEMPA[Math.min(wybranyIndex, sufitLaczny)];

  const efektywne = spowolnienie ? TEMPA_MAP.powolne : dozwolone;

  // Rotacja kierowców wymaga auta; pieszo i wierzchem RAW daje 8 h na dobę.
  const calodobowa = state.calodobowa && state.transport === "pojazd";
  const godzin = calodobowa ? GODZIN_MARSZU_CALODOBOWO : GODZIN_MARSZU;
  const naDobe = efektywne.perHour * godzin;

  const powod = spowolnienie
    ? "Trudny teren wymusza tempo Powolne."
    : (ograniczone && wolnyLimituje
      ? `${wolny.actor.name} ma Szybkość ${wolny.walk} m — grupa pieszo nie da rady iść szybciej niż ${TEMPA[sufitLaczny].label}.`
      : (ograniczone ? `Sufit transportu: ${transport.label}.` : null));

  const biom = state.biom ? BIOMY_MAP[state.biom] : null;

  // Zbiornik liczy się tylko za kierownicą; pieszo i wierzchem trasa jest nieograniczona.
  const pojazd = state.transport === "pojazd" ? groupActor.system.primaryVehicle : null;
  const bak = pojazd ? getPaliwo(pojazd) : null;
  const zasieg = bak ? zaokr(bak.value / bak.spalanie * 100) : null;
  const trasaMozliwa = bak ? Math.min(state.trasa, zasieg) : state.trasa;
  const segmentMozliwy = bak ? Math.min(naDobe, zasieg) : naDobe;

  // Pasek paliwa podgląda ten przejazd, który zaraz kliknie MG: wpisaną trasę, a bez niej cały segment.
  const podglad = state.trasa ? trasaMozliwa : segmentMozliwy;

  return {
    opis: opisPodrozy({ transport, tempo: efektywne, calodobowa, biom, trudnyTeren: state.trudnyTeren }),
    tempo: {
      id: efektywne.id,
      label: efektywne.label,
      wymog: efektywne.wymog,
      efekty: efektywne.efekty,
      chevrony: Array.fromRange(TEMPA.indexOf(efektywne) + 1, 1),
      spowolnione: spowolnienie || ograniczone,
      powod
    },
    tempa: TEMPA.map((t, i) => ({
      id: t.id,
      label: t.label,
      wybrany: t.id === efektywne.id, // trudny teren wymusza Powolne niezależnie od tego, co ustawiono w „STATę”
      niedostepne: (i > sufitLaczny) || (spowolnienie && t.id !== "powolne")
    })),
    dystans: {
      minuta: efektywne.perMinute,
      godzina: efektywne.perHour,
      doba: Number(naDobe.toFixed(1)).toLocaleString("pl-PL"),
      dobaLabel: calodobowa ? "na dobę (24 h)" : "w 8 h"
    },
    godzin,
    trasa: state.trasa || null,
    trasaMozliwa: zaokr(trasaMozliwa) || null,
    czasTrasy: czasPrzejscia(trasaMozliwa, efektywne.perHour, godzin),
    // Dwa tryby wyruszenia: cały segment czasowy albo dokładnie wpisana trasa.
    segment: {
      km: zaokr(segmentMozliwy),
      zadane: zaokr(naDobe),
      czas: czasPrzejscia(segmentMozliwy, efektywne.perHour, godzin),
      obciety: !!bak && naDobe > zasieg
    },
    wyruszLabel: `Wyrusz ${godzin} h!`,
    jedzLabel: `${transport.czasownik}!`,
    brakPaliwa: !!bak && state.trasa > zasieg,
    pustyBak: !!bak && bak.value <= 0,
    paliwo: bak && paliwoWidok(pojazd, podglad / 100 * bak.spalanie),
    calodobowa,
    zegar: [
      { godzin: GODZIN_MARSZU, label: `${GODZIN_MARSZU} h`, wybrany: !calodobowa, niedostepne: false },
      { godzin: GODZIN_MARSZU_CALODOBOWO, label: `${GODZIN_MARSZU_CALODOBOWO} h`, wybrany: calodobowa, niedostepne: state.transport !== "pojazd" }
    ],
    dobaTooltip: state.transport === "pojazd"
      ? "Rotacja kierowców: 24 h w drodze zamiast 8 h, trzykrotny dystans na dobę."
      : `${transport.label} bez auta daje RAW-owe 8 h w drodze — rotacja wymaga pojazdu mechanicznego.`,
    wDrodzeOpis: wDrodzeTooltip(efektywne, znawcy, solo),
    trudnyTeren: state.trudnyTeren,
    transport: { ...transport, wybrany: true },
    transporty: TRANSPORT.map(t => ({ ...t, wybrany: t.id === state.transport })),
    biom,
    biomy: BIOMY.map(b => ({ ...b, wybrany: b.id === state.biom })),
    znawcy,
    znosiTeren: zniesiony,
    znawcyBezMarszu: !pieszo && state.trudnyTeren && znawcy.length > 0,
    cichoKroczacy: solo,
    zbieractwo: znawcy.length ? `${znawcy.length * BIOM_ZBIERACTWO_OSOB} ${osobyForm(znawcy.length * BIOM_ZBIERACTWO_OSOB)}` : null,
    bezZaskoczenia: znawcy.length > 0
  };
}

/**
 * Delegacja kliknięć w karcie czatu — jeden listener raz na zawsze. Rejestrowany na
 * `document` w fazie **capture**: coś w natywnym dispatchu akcji czatu dnd5e zatrzymuje
 * propagację (`stopPropagation`), zanim dociera do listenera dowiązanego przez
 * `renderChatLog`/bąbelkowanie (zweryfikowane na żywo 2026-08-26 — hook się odpalał,
 * element zawierał wiadomość, a mimo to zwykły bubble-listener nigdy nie widział kliknięcia).
 * Tylko MG faktycznie przesuwa `game.time` (world setting), więc gracz dostaje odmowę.
 */
function _registerTravelChatListener() {
  document.addEventListener("click", async event => {
    const btn = event.target.closest?.(".neuro-czas-uplynelo");
    if (!btn) return;
    if (!game.user.isGM) return ui.notifications.warn("Tylko MG zatwierdza upływ czasu.");
    if (btn.disabled) return;
    const sekundy = Number(btn.dataset.sekundy) || 0;
    if (!sekundy) return;
    btn.disabled = true;

    const cal = game.time.calendar;
    const przed = cal.format(cal.timeToComponents(game.time.worldTime));
    await game.time.advance(sekundy);
    const po = cal.format(cal.timeToComponents(game.time.worldTime));

    btn.textContent = `Czas upłynął (+${btn.dataset.etykieta})`;
    btn.insertAdjacentHTML("afterend", `<p class="neuro-czas-info"><em>${przed} → ${po}</em></p>`);
  }, { capture: true });
}

/**
 * Wyruszenie w trasę: podsumowanie na czat **i** spalone paliwo.
 * Wysłanie wiadomości zatwierdza przejazd — do tego momentu panel jest tylko planem.
 * @param {Actor} groupActor
 * @param {"segment"|"trasa"} tryb Cały segment czasowy (8/24 h) albo dokładnie wpisana trasa.
 */
export async function postTravelSummary(groupActor, tryb = "segment") {
  if (isLootLocked(groupActor)) {
    ui.notifications.warn("Drużyna nie może wyruszyć — łup jeszcze nie został podzielony.");
    return;
  }
  if (game.paused && !game.user.isGM) {
    ui.notifications.warn("Gra jest zapauzowana — drużyna nie może teraz wyruszyć.");
    return;
  }
  const ctx = buildTravelContext(groupActor);
  if (ctx.pustyBak) {
    ui.notifications.warn(`${ctx.paliwo.nazwa}: pusty bak — pojazd nie ruszy.`);
    return;
  }
  const plan = tryb === "trasa"
    ? { km: ctx.trasaMozliwa, czas: ctx.czasTrasy, zadane: ctx.trasa, obciety: ctx.brakPaliwa }
    : { km: ctx.segment.km, czas: ctx.segment.czas, zadane: ctx.segment.zadane, obciety: ctx.segment.obciety };
  if (!plan.km) {
    ui.notifications.warn("Wpisz długość trasy w kilometrach.");
    return;
  }
  zagraj(DZWIEKI[ctx.transport.id]);
  await setPodroz(groupActor, { aktywna: true });

  const linie = [
    `<strong>${ctx.opis}</strong>`,
    `<strong>Tempo:</strong> ${ctx.tempo.label}${ctx.tempo.powod ? ` <em>(${ctx.tempo.powod})</em>` : ""}`,
    `<strong>Transport:</strong> ${ctx.transport.label}`,
    `<strong>Dystans:</strong> ${ctx.dystans.minuta} m/min · ${ctx.dystans.godzina} km/h · ${ctx.dystans.doba} km ${ctx.dystans.dobaLabel}`
  ];
  if (ctx.biom) linie.push(`<strong>Biom:</strong> ${ctx.biom.label}`);
  linie.push(`<strong>Trasa:</strong> ${plan.km} km ≈ ${plan.czas}`
    + (plan.obciety ? ` <em>(z planowanych ${plan.zadane} km — dalej paliwa zabrakło)</em>` : ""));
  if (ctx.paliwo) {
    const spalone = zaokr(Math.min(plan.km / 100 * ctx.paliwo.spalanie, ctx.paliwo.value));
    const zostalo = zaokr(ctx.paliwo.value - spalone);
    await setPaliwo(groupActor.system.primaryVehicle, { value: zostalo });
    linie.push(`<strong>Paliwo:</strong> spalono ${spalone} l `
      + `(${ctx.paliwo.spalanie} l/100 km) — w baku ${zostalo} / ${ctx.paliwo.max} l.`);
  }
  if (ctx.znosiTeren) {
    linie.push(`<strong>Prowadzi:</strong> ${ctx.znawcy.map(z => z.name).join(", ")} — trudny teren nie spowalnia drużyny.`);
  } else if (ctx.znawcyBezMarszu) {
    linie.push(`<strong>Zna teren:</strong> ${ctx.znawcy.map(z => z.name).join(", ")} — poza marszem pieszym trudny teren i tak spowalnia.`);
  }
  if (ctx.bezZaskoczenia) linie.push("<strong>Zaskoczenie:</strong> zwiadowcy nie da się zaskoczyć w znanym biomie.");
  if (ctx.cichoKroczacy.length) {
    linie.push(`<strong>Cichy krok:</strong> ${ctx.cichoKroczacy.map(z => z.name).join(", ")} (tylko dla siebie).`);
  }
  const efekty = ctx.tempo.efekty.length
    ? `<ul>${ctx.tempo.efekty.map(e => `<li>${e.tekst}</li>`).join("")}</ul>`
    : "<p><em>Brak modyfikatorów z tempa.</em></p>";

  // Czas gry się sam nie przesuwa — „Wyrusz” planuje przejazd, ale to MG klikając ten
  // guzik decyduje, KIEDY faktycznie doszli (po scenkach, encounterach po drodze itd.).
  const godzinyRzeczywiste = plan.km / ctx.dystans.godzina;
  const sekundy = Math.round(godzinyRzeczywiste * 3600);
  const czasBtn = sekundy > 0
    ? `<button type="button" class="neuro-czas-uplynelo" data-sekundy="${sekundy}" data-etykieta="${plan.czas}">`
      + `<i class="fa-solid fa-hourglass-half" inert></i> Zatwierdź upływ czasu (${plan.czas})</button>`
    : "";

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: groupActor }),
    content: `<div class="neuro-podroz-card"><h3>Podróż — ${groupActor.name}</h3>`
      + linie.map(l => `<p>${l}</p>`).join("") + efekty + czasBtn + "</div>"
  });
}

/* -------------------------------------------- */
/*  Modyfikatory tempa przy rzucie               */
/* -------------------------------------------- */

/**
 * Złóż nowy tryb z już ustawionym. Ułatwienie + Utrudnienie znoszą się do normalnego rzutu,
 * więc nie wolno tu po prostu nadpisać — inaczej tempo zjadłoby Utrudnienie z Wyczerpania.
 */
function applyMode(rollConfig, mode) {
  const ADV = CONFIG.Dice.D20Roll.ADV_MODE;
  const target = mode > 0 ? ADV.ADVANTAGE : ADV.DISADVANTAGE;
  rollConfig.options ??= {};
  const current = rollConfig.options.advantageMode ?? ADV.NORMAL;
  if (current === ADV.NORMAL) rollConfig.options.advantageMode = target;
  else if (current !== target) rollConfig.options.advantageMode = ADV.NORMAL;
}

/** Grupy, w których ta postać jest członkiem i które są w trakcie podróży. */
function travellingGroupsFor(actor) {
  return game.actors.filter(a => a.type === "group"
    && a.getFlag(MODULE_ID, "podroz")?.aktywna
    && a.system.members.some(m => m.actor === actor));
}

function onPostBuildSkillRollConfig(process, rollConfig) {
  try {
    const actor = process?.subject;
    const skill = process?.skill;
    if (!actor || !skill) return;

    for (const group of travellingGroupsFor(actor)) {
      const ctx = buildTravelContext(group);
      const mod = TEMPA_MAP[ctx.tempo.id]?.mods?.find(m => m.skill === skill);
      if (mod) applyMode(rollConfig, mod.mode);
      return; // postać podróżuje najwyżej z jedną drużyną naraz
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Modyfikatory tempa podróży failed`, err);
  }
}

/* -------------------------------------------- */
/*  Picker na karcie postaci                     */
/* -------------------------------------------- */

function injectBiomeStrip(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? app?.element;
  if (!(root instanceof HTMLElement)) return;
  const actor = app?.document;
  if (!actor || !biomeSlots(actor)) return;

  root.querySelectorAll(".neuro-biomy-strip").forEach(n => n.remove());
  const host = root.querySelector('.tab[data-tab="features"]');
  if (!host) return;

  const slots = biomeSlots(actor);
  const chosen = getBiomy(actor);
  const strip = document.createElement("div");
  strip.className = "neuro-biomy-strip";
  strip.innerHTML = `
    <span class="neuro-biomy-label">Mój biom</span>
    <span class="neuro-biomy-list">${chosen.length
      ? chosen.map(id => `<span class="neuro-biom-pill"><i class="${BIOMY_MAP[id].icon}"></i>${BIOMY_MAP[id].label}</span>`).join("")
      : '<em class="neuro-biomy-empty">nie wybrano</em>'}</span>
    <span class="neuro-biomy-count">${chosen.length}/${slots}</span>`;

  if (actor.isOwner) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "neuro-biomy-edit";
    btn.innerHTML = '<i class="fa-solid fa-map-location-dot" inert></i>';
    btn.setAttribute("data-tooltip", "Wybierz ulubione biomy");
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      openBiomePicker(actor);
    });
    strip.appendChild(btn);
  }

  host.prepend(strip);
}

/* -------------------------------------------- */
/*  Pasek paliwa na karcie pojazdu               */
/* -------------------------------------------- */

function injectVehicleFuel(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? app?.element;
  const vehicle = app?.document;
  if (!(root instanceof HTMLElement) || !vehicle) return;

  root.querySelectorAll(".neuro-paliwo-grupa").forEach(n => n.remove());
  const host = root.querySelector("aside.sheet-sidebar .pills-group");
  if (!host) return;

  const box = document.createElement("div");
  box.className = "pills-group neuro-paliwo-grupa";
  box.innerHTML = `<h3 class="icon"><span>Paliwo</span></h3>`
    + paliwoPasekHTML(paliwoWidok(vehicle), { owner: vehicle.isOwner, kolumna: true });

  // Karta pojazdu nie zna naszych akcji, więc klik obsługujemy sami, zanim dojdzie do ApplicationV2.
  for (const btn of box.querySelectorAll("[data-action]")) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.dataset.action === "neuroTankuj") tankuj(vehicle);
      else ustawBak(vehicle);
    });
  }

  host.after(box);
}

export function registerPartyTravel() {
  Handlebars.registerHelper("neuroPaliwoPasek", (p, owner) =>
    new Handlebars.SafeString(paliwoPasekHTML(p, { owner })));
  Hooks.on("dnd5e.postBuildSkillRollConfig", onPostBuildSkillRollConfig);
  Hooks.on("renderCharacterActorSheet", injectBiomeStrip);
  Hooks.on("renderVehicleActorSheet", injectVehicleFuel);
  _registerTravelChatListener();
  console.log("Neuroshima 5e | Podróż drużyny (tempo, biomy, paliwo) registered");
}

/** Eksponowane jako `game.neuroshima.podroz`. */
export const travelApi = {
  getBiomy, setBiomy, biomeSlots, openBiomePicker,
  getPodroz, setPodroz, buildTravelContext, postTravelSummary,
  getPaliwo, setPaliwo, paliwoWidok, tankuj, ustawBak
};
