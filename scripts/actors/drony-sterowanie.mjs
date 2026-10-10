/**
 * Neuroshima 5e — sterowanie dronem z Kontrolera (PLAN_m3_towarzysze.md §7.5, D22, D35, D36, U20, U21; E7b).
 *
 *   - **Komenda [B] / Steruj [A] / Reaguj [R]** to aktywności Kontrolera (U21), nie Hakerstwa: operatorem bywa
 *     każdy z kontrolerem w ręce (D12). Kontroler w plecaku nie blokuje — pytamy i bierzemy go do ręki
 *     lejkiem lalki (D22: [Weź do ręki], z wypieraniem). BN-operatorzy bez lalki są zwolnieni.
 *   - **Wybór drona:** rozłożone drony na oglądanej scenie w zasięgu sygnału (U17, `drony-zdalne.mjs`); kilka —
 *     okno z ostatnio sterowanym na wierzchu. Poza zasięgiem — komunikat, bez karty i bez aktywacji (D24).
 *   - **Zatrzask (U20):** aktywny MG zapisuje na dronie operatora (`@operator` na żywo), zatrzask
 *     `{ combatId, runda, tryb }` i własność gracza-operatora (D12) — zapamiętaną jako nadaną, żeby ją odebrać
 *     przy wyjściu z trybu zdalnego; nowy operator odbiera ją poprzedniemu (przejęcie). Reakcja [R] ma osobny
 *     znacznik rundy: to Reakcja operatora, nie druga aktywacja (D35); jej własność trwa do zmiany tury.
 *   - **Przejmij sterowanie** — tryb zdalny poza walką, bez zatrzasku (§7.10); w walce — Komenda albo Steruj.
 *   - **Karta aktywacji:** dozwolone akcje z `zakresAktywacji` (D36), przy [R] — przyciski ataku drona;
 *     plakietka „druga aktywacja drona w tej rundzie” (D35).
 *   - **Plakietka ataku:** w walce atak drona bez Steruj [A] i bez Reaguj [R] w tej rundzie dostaje na karcie
 *     „atak wymaga Steruj [A] (s. 83)” — oznaczamy, nie blokujemy (D2, D36).
 *   - [A], [B] i Przejmij wchodzą w tryb zdalny (`drony-zdalne.mjs`, E8); [R] — sama karta z atakiem drona (U21).
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { zakresAktywacji } from "../config/towarzysze-rules.mjs";
import { FLAG, towarzysz } from "./towarzysze.mjs";
import {
  jestDronem, jestWrakiem, prosbaDoMG, zarejestrujAkcje, zmianyOdebrania, FLAG_AKTYWACJA, FLAG_REAKCJA, FLAG_NADANE,
  FLAG_STEROWANIE
} from "./drony.mjs";
import { wejdz, sygnalDrona } from "./drony-zdalne.mjs";
import { TRYB_AKTYWNOSCI, jestKontrolerem, rodzajKontrolera } from "../items/kontroler.mjs";
import { isDollActor, inHand, equip } from "./doll.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_OSTATNI = "kontrolerOstatni";
const FLAG_PLAKIETKI = "dronPlakietki";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const DialogV2 = () => foundry.applications.api.DialogV2;

/** Nazwy akcji NOE na karcie (D36). Skróty OSD są w `towarzysze-rules.mjs`. */
const NAZWY_AKCJI = Object.freeze({
  ruch: "Ruch", unikanie: "Unikanie", odstapienie: "Odstąpienie", przyspieszenie: "Przyspieszenie",
  bieganie: "Bieganie", podnies: "Podnieś", upusc: "Upuść", zostan: "Zostań", atak: "Atakowanie",
  pochwycenie: "Pochwycenie", odepchniecie: "Odepchnięcie", wytracenie: "Wytrącenie", pomaganie: "Pomaganie",
  wyczekanie: "Wyczekanie", ukrywanie: "Ukrywanie się", szukanie: "Szukanie", uzywanie: "Używanie",
  okazyjny: "Atak okazyjny", wyczekana: "Wyczekana akcja"
});

const TYTUL = Object.freeze({ B: "Komenda [B]", A: "Steruj [A]", R: "Reaguj [R]", Z: "Przejmij sterowanie" });

/** Typy aktywności, które są atakiem — natywny i tryby ognia (`weapons/fire-modes.mjs`). */
const ATAKI = new Set(["attack", "neuroKs", "neuroDs", "neuroMs", "neuroOz", "neuroDublet"]);

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

/** Walka, w której liczą się rundy (rozpoczęta) albo `null` — poza walką tur nie ma (U9). */
function _walka() {
  const c = game.combat;
  return c?.started ? c : null;
}

/** Ataki drona: przedmioty z aktywnością ataku (broń zamontowana, U13). */
export function atakiDrona(dron) {
  return (dron?.items?.contents ?? []).filter(i => i.system?.activities?.some?.(a => ATAKI.has(a.type)));
}

/** Cechy drona do zakresu aktywacji (D36). */
export function cechyDrona(dron) {
  const ataki = atakiDrona(dron);
  return {
    lata: !!RODZAJE[towarzysz(dron)?.rodzaj]?.lata,
    bron: ataki.length > 0,
    wrecz: ataki.some(i => i.system?.activities?.some?.(a => a.type === "attack" && a.attack?.type?.value === "melee")),
    manipulator: dron.items.some(i => i.flags?.[MODULE_ID]?.manipulator),
    urzadzenia: dron.items.some(i => i.flags?.[MODULE_ID]?.zamontowane && i.type !== "weapon")
  };
}

/** Zatrzask aktywacji drona w bieżącej rundzie albo `null`. */
export function aktywacjaWRundzie(dron, combat = _walka()) {
  const z = dron?.flags?.[MODULE_ID]?.[FLAG_AKTYWACJA];
  return combat && z?.combatId === combat.id && z?.runda === combat.round ? z : null;
}

function _reakcjaWRundzie(dron, combat = _walka()) {
  const z = dron?.flags?.[MODULE_ID]?.[FLAG_REAKCJA];
  return combat && z?.combatId === combat.id && z?.runda === combat.round ? z : null;
}

/** Dron, który nie odpowiada na kontroler: wrak (U11) albo Wyłączony (§7.4) — powód albo `null`. */
function _nieOdpowiada(dron) {
  if (jestWrakiem(dron)) return `${dron.name} to wrak.`;
  if (dron.statuses?.has("wylaczony")) return `${dron.name} jest wyłączony — nie odpowiada na kontroler.`;
  return null;
}

/** Rozłożone drony na oglądanej scenie, które odpowiadają na kontroler. */
function _dronyNaScenie() {
  const out = [];
  for (const t of canvas?.scene?.tokens ?? []) {
    const a = t.actorLink ? game.actors.get(t.actorId) : null;
    if (a && jestDronem(a) && !_nieOdpowiada(a) && !out.includes(a)) out.push(a);
  }
  return out;
}

/* -------------------------------------------- */
/*  Aktywacja                                    */
/* -------------------------------------------- */

/** D22: kontroler w ręce. Plecak → pytanie i lejek lalki. `true` — można dalej. */
async function _wRece(kontroler) {
  const actor = kontroler.parent;
  if (!isDollActor(actor) || inHand(kontroler)) return true;
  const ok = await DialogV2().confirm({
    window: { title: "Kontroler nie jest w ręce" },
    content: `<p><strong>${esc(kontroler.name)}</strong> — Komenda, Steruj i Reaguj wymagają kontrolera w ręce (s. 83). Weźmiesz go?</p>`,
    yes: { label: "Weź do ręki", icon: "fa-solid fa-hand" },
    no: { label: "Anuluj" },
    rejectClose: false
  });
  if (!ok) return false;
  await equip(kontroler);
  if (inHand(kontroler)) return true;
  ui.notifications.warn(`${kontroler.name} nadal nie jest w ręce — sterowanie przerwane.`);
  return false;
}

async function _wybierzDrona(drony, ostatni) {
  if (drony.length === 1) return drony[0];
  const lista = [...drony].sort((a, b) => (b.uuid === ostatni) - (a.uuid === ostatni));
  const uuid = await DialogV2().wait({
    window: { title: "Którym dronem?" },
    content: "<p>Na scenie stoi kilka dronów.</p>",
    buttons: lista.map((d, i) => ({ action: d.uuid, label: d.name, default: i === 0 })),
    rejectClose: false
  });
  return drony.find(d => d.uuid === uuid) ?? null;
}

/** Sygnał do drona, gdy stoi na oglądanej scenie; `null` — dron gdzie indziej (makra, testy: bez sprawdzania). */
function _sygnal(dron, operator, kontroler) {
  if (!dron.getActiveTokens?.(true, true)?.some(t => t.parent === canvas?.scene)) return null;
  return sygnalDrona(dron, { operator, kontroler, scene: canvas.scene });
}

/** Komunikat, gdy żaden dron nie łapie sygnału (U17). */
function _bezSygnalu(s) {
  if (s.powod === "operator") return "Twojej postaci nie ma na tej scenie — kontroler nie ma skąd nadawać.";
  if (s.powod === "kontroler") return "Kontroler nie jest w ręce.";
  const gdzie = s.podZiemia ? " (pod ziemią)" : s.sciana ? " (przez ściany)" : "";
  return `Dron poza zasięgiem kontrolera: ${Math.round(s.odleglosc ?? 0)} m, zasięg ${s.zasieg} m${gdzie}.`;
}

/**
 * Aktywacja drona z Kontrolera: [B], [A], [R] (D35, D36) albo Przejmij sterowanie poza walką (§7.10).
 * @param {Item} kontroler
 * @param {"A"|"B"|"R"|"Z"} tryb
 * @param {{dron?: Actor}} [o]  dron wskazany z góry (makra, testy)
 * @returns {Promise<Actor|null>} dron albo `null`, gdy przerwano
 */
export async function aktywuj(kontroler, tryb, { dron = null } = {}) {
  const operator = kontroler?.parent;
  if (!operator || !jestKontrolerem(kontroler) || !TYTUL[tryb]) return null;
  const combat = _walka();
  if (tryb === "Z" && combat) return ui.notifications.warn("W walce sterujesz Komendą [B] albo Steruj [A]."), null;
  if (!(await _wRece(kontroler))) return null;
  if (dron) {
    const nie = _nieOdpowiada(dron);
    if (nie) return ui.notifications.warn(nie), null;
    const s = _sygnal(dron, operator, kontroler);
    if (s?.utracony) return ui.notifications.warn(_bezSygnalu(s)), null;
  } else {
    const drony = _dronyNaScenie();
    if (!drony.length) return ui.notifications.warn("Na tej scenie nie stoi żaden rozłożony, działający dron."), null;
    const sygnaly = drony.map(d => ({ d, s: _sygnal(d, operator, kontroler) }));
    const wZasiegu = sygnaly.filter(x => !x.s?.utracony).map(x => x.d);
    if (!wZasiegu.length) {
      const najblizszy = sygnaly.map(x => x.s).sort((a, b) => (a.odleglosc ?? Infinity) - (b.odleglosc ?? Infinity))[0];
      return ui.notifications.warn(_bezSygnalu(najblizszy)), null;
    }
    dron = await _wybierzDrona(wZasiegu, kontroler.getFlag(MODULE_ID, FLAG_OSTATNI));
    if (!dron) return null;
  }
  const druga = (tryb === "A" || tryb === "B") && !!aktywacjaWRundzie(dron, combat);
  await _karta(operator, dron, tryb, { druga, kontroler });
  const znacznik = foundry.utils.randomID(12);
  await prosbaDoMG(operator, {
    akcja: "steruj", dron: dron.uuid, tryb, operator: operator.uuid, znacznik,
    combatId: combat?.id ?? null, runda: combat?.round ?? null
  });
  if (kontroler.getFlag(MODULE_ID, FLAG_OSTATNI) !== dron.uuid) await kontroler.setFlag(MODULE_ID, FLAG_OSTATNI, dron.uuid);
  if (tryb !== "R") await wejdz(dron, { operator, kontroler, tryb, znacznik });
  return dron;
}

/**
 * Aktywny MG: operator, zatrzask albo znacznik reakcji, własność gracza-operatora (D12, U20).
 * Nowy użytkownik w trybie zdalnym odbiera nadaną własność poprzedniemu (przejęcie); potwierdzenie
 * `FLAG_STEROWANIE` ze znacznikiem prośby — na nie czeka klient, żeby wejść po swojej prośbie, nie przed nią.
 */
async function _steruj(_actor, { dron: uuid, tryb, operator, combatId, runda, user, znacznik = null }) {
  const dron = fromUuidSync(uuid);
  if (!dron || !jestDronem(dron)) return;
  const nadane = dron.flags?.[MODULE_ID]?.[FLAG_NADANE] ?? {};
  if (tryb !== "R") {
    const poprzedni = Object.keys(nadane).filter(id => id !== user && nadane[id] === "zdalny");
    const odbior = poprzedni.length ? zmianyOdebrania(dron, poprzedni) : null;
    if (odbior) await dron.update(odbior);
  }
  const zmiany = { [`flags.${MODULE_ID}.${FLAG}.operator`]: operator };
  const znak = { combatId, runda, operator };
  if (tryb === "R") zmiany[`flags.${MODULE_ID}.${FLAG_REAKCJA}`] = znak;
  else if (tryb !== "Z") zmiany[`flags.${MODULE_ID}.${FLAG_AKTYWACJA}`] = { ...znak, tryb };
  if (tryb !== "R") zmiany[`flags.${MODULE_ID}.${FLAG_STEROWANIE}`] = { znacznik, user, operator };
  const u = game.users.get(user);
  const rodzaj = tryb === "R" ? "reakcja" : "zdalny";
  if (u && !u.isGM) {
    if (!dron.testUserPermission(u, "OWNER")) {
      zmiany[`ownership.${u.id}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      zmiany[`flags.${MODULE_ID}.${FLAG_NADANE}.${u.id}`] = rodzaj;
    } else if (nadane[u.id] === "reakcja" && rodzaj === "zdalny") {
      // Własność z Reakcji przechodzi w sterowanie — trwa do wyjścia, nie do zmiany tury.
      zmiany[`flags.${MODULE_ID}.${FLAG_NADANE}.${u.id}`] = rodzaj;
    }
  }
  await dron.update(zmiany);
}

/* -------------------------------------------- */
/*  Karty                                        */
/* -------------------------------------------- */

async function _karta(operator, dron, tryb, { druga, kontroler }) {
  const akcje = zakresAktywacji(tryb, cechyDrona(dron)).map(a => NAZWY_AKCJI[a.id] ?? a.id);
  const linie = [];
  if (tryb === "R") {
    linie.push("Dron reaguje za twoją Reakcję: atak okazyjny (tylko wręcz) albo akcja wyczekana w Steruj [A].");
  } else if (tryb === "Z") {
    linie.push("Poza walką — sterowanie przez kamerę drona, bez liczenia akcji.");
  } else {
    linie.push(`<strong>Wolno:</strong> ${esc(akcje.join(", "))}.`);
    if (tryb === "B") linie.push("Atak wymaga Steruj [A] (s. 83).");
  }
  const ataki = tryb === "R" ? atakiDrona(dron) : [];
  const przyciski = ataki.map(i => `<button type="button" data-action="neuroDronAtak" data-uuid="${esc(i.uuid)}">`
    + `<i class="fa-solid fa-crosshairs" inert></i> ${esc(i.name)}</button>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: operator }),
    content: `<div class="neuro-dron-karta">
      <header><img src="${esc(dron.img)}" alt="" width="32" height="32">
        <div><strong>${esc(TYTUL[tryb])}</strong> → ${esc(dron.name)}<br><small>${esc(kontroler.name)}</small></div></header>
      ${druga ? `<p class="neuro-dron-plakietka"><i class="fa-solid fa-triangle-exclamation" inert></i> Druga aktywacja drona w tej rundzie — dron ma jedną akcję na rundę.</p>` : ""}
      ${linie.map(l => `<p>${l}</p>`).join("")}
      ${przyciski ? `<div class="neuro-dron-przyciski">${przyciski}</div>` : ""}
    </div>`,
    flags: { [MODULE_ID]: { dronAktywacjaKarta: { dron: dron.uuid, tryb, druga } } }
  });
}

/** Plakietki na karcie ataku drona (D36): zapisane przy tworzeniu, bo stan rundy później się zmienia. */
function _onPreCreateChatMessage(message, data) {
  const actor = ChatMessage.getSpeakerActor(data.speaker ?? message.speaker ?? {});
  if (!actor || !jestDronem(actor)) return;
  const typ = foundry.utils.getProperty(data, "flags.dnd5e.activity.type");
  // Karta użycia, nie wiadomość z rzutem — inaczej plakietka stałaby dwa razy.
  if (!ATAKI.has(typ) || foundry.utils.getProperty(data, "flags.dnd5e.roll")) return;
  const combat = _walka();
  if (!combat) return;
  const z = aktywacjaWRundzie(actor, combat);
  if (z?.tryb === "A" || _reakcjaWRundzie(actor, combat)) return;
  const tekst = z?.tryb === "B" ? "Atak w Komendzie [B] — atak wymaga Steruj [A] (s. 83)."
    : "Dron bez aktywacji w tej rundzie — atak wymaga Steruj [A] (s. 83).";
  message.updateSource({ [`flags.${MODULE_ID}.${FLAG_PLAKIETKI}`]: [tekst] });
}

function _onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const plakietki = message.getFlag(MODULE_ID, FLAG_PLAKIETKI);
  if (plakietki?.length && !root.querySelector(".neuro-dron-plakietka")) {
    const box = root.querySelector(".message-content");
    for (const t of plakietki) {
      const p = document.createElement("p");
      p.className = "neuro-dron-plakietka";
      p.innerHTML = `<i class="fa-solid fa-triangle-exclamation" inert></i> ${esc(t)}`;
      box?.prepend(p);
    }
  }
  for (const b of root.querySelectorAll('button[data-action="neuroDronAtak"]')) {
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      const item = await fromUuid(b.dataset.uuid);
      if (!item?.isOwner) return ui.notifications.warn("Ten dron nie jest pod twoim sterowaniem.");
      const act = item.system.activities.find(a => ATAKI.has(a.type));
      return act?.use();
    });
  }
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

function _onPreUseActivity(activity) {
  const tryb = TRYB_AKTYWNOSCI[activity?.id];
  if (!tryb) return;
  const item = activity.actor?.items.get(activity.item?.id) ?? activity.item;
  if (!jestKontrolerem(item)) return;
  // Aktywność jest przyciskiem: kartę pisze `aktywuj`, natywna byłaby drugą.
  aktywuj(item, tryb).catch(err => console.error(`${MODULE_ID} | ${activity.name}`, err));
  return false;
}

export function registerDronySterowanie() {
  zarejestrujAkcje("steruj", _steruj);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("preCreateChatMessage", _onPreCreateChatMessage);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
}

export const dronySterowanieApi = Object.freeze({ aktywuj, atakiDrona, cechyDrona, aktywacjaWRundzie, rodzajKontrolera });
