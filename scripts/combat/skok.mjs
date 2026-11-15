/**
 * Neuroshima 5e — skok w grze (PLAN_m8_ruch_i_ekonomia_akcji.md §4.5, E3).
 *
 * Jeden kalkulator (`config/skok-data.mjs`) dla wszystkich wejść:
 *   - **natywny ruch „Skok”** — dnd5e liczy go 1:1 bez terenu, więc koszt nalicza zwykły zapis ruchu M8. Po ruchu
 *     długość/wysokość skoku i rozbieg (zwykły chód tuż przed skokiem, także z wcześniejszych dragów tej tury) idą do
 *     zasięgu NOE; przekroczenie to trwałe ostrzeżenie w ledgerze (w walce) albo wiadomość (poza nią) — nie blokada;
 *   - **lądowanie na trudnym terenie** po skoku w dal — karta z testem Akrobatyki ST 10 (porażka: Powalenie, s. 256);
 *   - **Skok Gladiatora** (Zew areny w Berserku) zakończony na polu istoty nie większej o więcej niż rozmiar — karta
 *     z RO SIŁ celu, porażka: Powalenie i k6 obuchowych za każde pełne 3 m (D33); sam skok nie wydaje A/B/R;
 *   - **Region `skok`** (`scenes/transitions.mjs`) i **okno kalkulatora** na karcie albo w makrze
 *     (`game.neuroshima.skok.okno(actor)`).
 * BN: ludzki wzór SIŁ tylko dla ludzi; istota ze skokiem w opisie albo inna — rozstrzygnięcie ręczne z tym opisem
 * (§9: nie ograniczaj stworzeń ludzkim wzorem). Złożonej trajektorii ani prześwitu nie zgadujemy (§2.2).
 */

import * as S from "../config/skok-data.mjs";
import { metry } from "../config/ekonomia-data.mjs";
import { creatureKindOf } from "../config/defense-rules.mjs";
import { przedmiotZdolnosci, esc } from "./zdolnosci-wspolne.mjs";
import { kombatant, ledger, chwila, zatwierdz, kluczTury, budzetDotyczy, ruchSieLiczy, zarejestrujUwagiRuchu } from "./ekonomia.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { SKOK_KOBALT, konwencjeSkoku } from "../wkk/config/skok-kobalt.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAGA_KARTY = "skok";
const ma = (actor, abilityId) => !!przedmiotZdolnosci(actor, { abilityId });

/* -------------------------------------------- */
/*  Dane aktora i zasięg                         */
/* -------------------------------------------- */

/** Wzrost w metrach z pola dnd5e („180 cm”, „1,8 m”, „180”) albo `null`. */
function _wzrost(raw) {
  const s = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/cm/.test(s) || n > 3) return n / 100;
  return n;
}

/** BN: opis skoku istoty (cecha „Skok…”, „Skakun…”) albo `null` dla człowieka — ten skacze ludzkim wzorem. */
function _skokIstoty(actor) {
  if (actor?.type !== "npc") return null;
  const cecha = actor.items?.find(i => i.type === "feat" && /^(skok|skakun|skoczek|susy)/i.test(i.name ?? ""));
  if (cecha) {
    const tekst = String(cecha.system?.description?.value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return `skok wg opisu istoty — „${cecha.name}”${tekst ? `: ${tekst}` : ""}`;
  }
  if (creatureKindOf(actor.system?.details?.type?.value) === "czlowiek") return null;
  return "istota — skok wg jej opisu albo decyzji MG (bez ludzkiego wzoru SIŁ)";
}

/**
 * Dane skoku aktora: cechy, zdolności zmieniające skok, rozmiar.
 * @param {Actor} actor
 */
export function daneSkoku(actor) {
  const a = actor?.system?.abilities ?? {};
  return {
    sila: a.str?.value ?? 10, zrc: a.dex?.value ?? 10, modSily: a.str?.mod ?? 0,
    pb: actor?.system?.attributes?.prof ?? 0,
    skoczek: ma(actor, "zwinnosc-szczura"),
    gladiator: ma(actor, "zew-areny") && !!actor?.statuses?.has("berserk"),
    sportowiec: ma(actor, "sportowiec"),
    wzrost: _wzrost(actor?.system?.details?.height),
    rozmiar: actor?.system?.traits?.size ?? "med",
    istota: _skokIstoty(actor)
  };
}

/**
 * Zasięgi z rozbiegu i z miejsca — albo `{reczny}` dla istoty bez ludzkiego wzoru.
 * @param {Actor} actor
 */
export function zasiegi(actor) {
  const d = daneSkoku(actor);
  if (d.istota) return { reczny: d.istota, dane: d };
  const wspolne = { sila: d.sila, zrc: d.zrc, modSily: d.modSily, skoczek: d.skoczek, gladiator: d.gladiator, wzrost: d.wzrost };
  return { zRozbiegu: S.zasiegSkoku({ ...wspolne, rozbieg: true }), zMiejsca: S.zasiegSkoku({ ...wspolne, rozbieg: false }), dane: d };
}

/* -------------------------------------------- */
/*  Trasa: odcinki, skoki, rozbieg               */
/* -------------------------------------------- */

/** Jednostki sceny w metrach — inaczej wzory NOE nie mają sensu (§3.1: waliduj jednostki). */
const _wMetrach = scene => /^m\.?$|^metr/i.test(String(scene?.grid?.units ?? "").trim());

/**
 * Odcinki trasy tej tury: historia tokenu (wcześniejsze dragi) i przebyta część ruchu, każdy z akcją ruchu,
 * dystansem poziomym (natywny pomiar siatki, bez dopłat terenu — §3.1) i zmianą wysokości.
 * @param {TokenDocument} doc
 * @param {object} movement  dane `moveToken`
 */
export function odcinkiRuchu(doc, movement) {
  const rec = movement?.history?.recorded?.waypoints ?? [];
  const passed = movement?.passed?.waypoints ?? [];
  const pts = [...rec];
  if (!pts.length && movement?.origin) pts.push(movement.origin);
  const nowyOd = pts.length;
  pts.push(...passed);
  const grid = doc.parent?.grid ?? canvas.grid;
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const ca = doc.getCenterPoint({ ...a, elevation: 0 });
    const cb = doc.getCenterPoint({ ...b, elevation: 0 });
    const poziomo = grid.measurePath([{ x: ca.x, y: ca.y }, { x: cb.x, y: cb.y }]).distance;
    out.push({ akcja: b.action ?? "walk", poziomo, pionowo: (b.elevation ?? 0) - (a.elevation ?? 0), nowy: i >= nowyOd, punkt: b });
  }
  return out;
}

/** Rozbieg tuż przed punktem wejścia (Region `skok`): zwykły chód na końcu trasy, w metrach. */
export function rozbiegPrzed(doc, movement) {
  const odc = odcinkiRuchu(doc, movement);
  let m = 0;
  for (let j = odc.length - 1; j >= 0 && odc[j].akcja === "walk"; j--) m += odc[j].poziomo;
  return Math.round(m * 100) / 100;
}

/**
 * Skoki w przebytej części ruchu i ich ocena względem zasięgu NOE.
 * @param {TokenDocument} doc
 * @param {object} movement
 * @returns {{skoki: object[], ostrz: string[]}|null}  `null` — w tej części nie było skoku
 */
export function ocenRuch(doc, movement) {
  if (!movement?.passed?.waypoints?.some(w => w.action === "jump")) return null;
  const actor = doc.actor;
  if (!actor) return null;
  if (!_wMetrach(doc.parent)) {
    return { skoki: [], ostrz: [`Skok na scenie w „${doc.parent?.grid?.units ?? "?"}”, nie w metrach — zasięg NOE rozstrzygnij ręcznie.`] };
  }
  const odc = odcinkiRuchu(doc, movement);
  const z = zasiegi(actor);
  const skoki = S.skokiWTrasie(odc).map(s => ({ ...s, punkt: odc[s.koniec]?.punkt ?? null, ostrz: S.ocenSkok(s, z) }));
  return { skoki, ostrz: skoki.flatMap(s => s.ostrz) };
}

/* -------------------------------------------- */
/*  Lądowanie                                    */
/* -------------------------------------------- */

/**
 * Region trudnego terenu dnd5e pod tokenem w tym punkcie — z tymi samymi wyjątkami, które dnd5e stosuje do kosztu
 * (dyspozycje, ignorowane rodzaje terenu aktora). `null` — grunt zwykły.
 * @param {TokenDocument} doc
 * @param {{x: number, y: number, elevation?: number}} w  pozycja tokenu (lewy górny róg)
 */
export function trudnyTerenPod(doc, w) {
  const c = doc.getCenterPoint({ ...w, elevation: w.elevation ?? doc.elevation });
  const p = { x: c.x, y: c.y, elevation: w.elevation ?? doc.elevation };
  for (const r of doc.parent?.regions ?? []) {
    const beh = r.behaviors.filter(b => b.type === "dnd5e.difficultTerrain" && !b.disabled);
    if (!beh.length || !r.testPoint(p)) continue;
    if (beh.some(b => (b.system?._getTerrainEffects?.(doc, null) ?? [{ name: "difficultTerrain" }]).length)) return r;
  }
  return null;
}

/** Istoty, na których polu kończy się skok (prostokąty tokenów zachodzą), bez samego skaczącego. */
export function istotyNaPolu(doc, w) {
  const g = doc.parent?.grid?.size ?? 100;
  const ax = w.x ?? doc.x, ay = w.y ?? doc.y;
  const aw = (w.width ?? doc.width) * g, ah = (w.height ?? doc.height) * g;
  return (doc.parent?.tokens ?? []).filter(t => t.id !== doc.id && t.actor && !t.hidden
    && (t.level ?? null) === (doc.level ?? null)
    && t.x < ax + aw - 1 && ax < t.x + t.width * g - 1 && t.y < ay + ah - 1 && ay < t.y + t.height * g - 1);
}

/** Karta testu lądowania na trudnym terenie (Akrobatyka ST 10, porażka: Powalenie). */
export async function kartaLadowania(doc) {
  const actor = doc.actor;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: doc }),
    content: `<div class="neuro-skok-karta"><p><strong>${esc(doc.name)}</strong> ląduje po skoku w dal na trudnym terenie.`
      + ` Test Akrobatyki ST ${S.ST_LADOWANIA} — porażka: Powalenie (s. 256).</p>`
      + `<p><button type="button" data-neuro-skok="ladowanie"><i class="fa-solid fa-person-falling" inert></i> Akrobatyka ST ${S.ST_LADOWANIA}</button></p></div>`,
    flags: { [MODULE_ID]: { [FLAGA_KARTY]: { rodzaj: "ladowanie", actorUuid: actor.uuid, st: S.ST_LADOWANIA } } }
  });
}

/** Konwencje WKK skoku z bieżącym przełącznikiem Kobaltu (zasada 46). */
function _wkk() {
  try { return konwencjeSkoku(isKobaltEnabled()); } catch (_e) { return konwencjeSkoku(true); }
}

async function _kartaGladiatora(doc, cel, skok) {
  const d = daneSkoku(doc.actor);
  const st = S.stGladiatora({ modSily: d.modSily, pb: d.pb });
  // D33 (WKK, zasada 46): bez Kobaltu liczby kości nie podstawiamy — RO i Powalenie są drukowane i działają.
  const kosci = _wkk().d33 ? S.kosciGladiatora(skok) : null;
  const dosiega = S.gladiatorDosiega(d.rozmiar, cel.actor?.system?.traits?.size);
  const obrazenia = kosci === null ? ` i obrażenia — <strong>rozstrzygnij ręcznie</strong> (${esc(SKOK_KOBALT.d33)})`
    : kosci ? ` i ${kosci}k6 obuchowych` : " (0k6 — skok krótszy niż 3 m, D33)";
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: doc }),
    content: `<div class="neuro-skok-karta"><p><strong>Skok Gladiatora</strong> — ${esc(doc.name)} ląduje na polu `
      + `<strong>${esc(cel.name)}</strong> (skok ${metry(skok.poziomo)} m${skok.wzwyz ? `, wzwyż ${metry(skok.wzwyz)} m` : ""}).</p>`
      + (dosiega
        ? `<p>RO na Siłę ST ${st}; porażka: Powalenie${obrazenia} (s. 70).</p>`
          + `<p><button type="button" data-neuro-skok="gladiator"><i class="fa-solid fa-person-falling-burst" inert></i> RO SIŁ ST ${st} — ${esc(cel.name)}</button></p>`
        : `<p>${esc(cel.name)} jest większy o więcej niż jeden rozmiar — bez RO i Powalenia (s. 70).</p>`)
      + `<p class="hint">Pole zajęte: bez darmowego przesunięcia obok (D20).</p></div>`,
    flags: { [MODULE_ID]: { [FLAGA_KARTY]: { rodzaj: "gladiator", celUuid: cel.actor.uuid, celToken: cel.uuid, st, kosci, kto: doc.name, dosiega } } }
  });
}

/** Karty po skoku u ruszającego: lądowanie na trudnym terenie, Skok Gladiatora na zajęte pole. */
async function _poSkoku(doc, skoki) {
  for (const s of skoki) {
    if (!s.punkt) continue;
    if (s.poziomo > 0 && trudnyTerenPod(doc, s.punkt)) await kartaLadowania(doc);
    if (daneSkoku(doc.actor).gladiator) {
      for (const cel of istotyNaPolu(doc, s.punkt)) await _kartaGladiatora(doc, cel, s);
    }
  }
}

/* -------------------------------------------- */
/*  Koszt skoku spoza natywnej trasy (Region)    */
/* -------------------------------------------- */

/**
 * Skok przeniesiony przez Region (teleport/przestawienie nie ma kosztu natywnego): długość skoku 1:1 do zapisu tego
 * samego ruchu (`movementId`) — natywne Undo tego ruchu zwraca też skok. Rzeczywisty teleport kosztuje 0 (§4.5).
 * @param {TokenDocument} doc
 * @param {string} movementId
 * @param {number} dlugosc  metry
 * @param {string[]} [uwagi]
 */
export async function zaplacSkok(doc, movementId, dlugosc, uwagi = []) {
  const combat = game.combat;
  if (!combat?.started || !budzetDotyczy(doc)) return null;
  const c = kombatant(doc, combat);
  if (!c) return null;
  const ch = chwila(c, ledger(c));
  if (!ch.wlasna && !ch.reakcja) return null;
  return zatwierdz(c, { typ: "ruch", id: `ruch-${movementId}-skok`, chwila: ch,
    ruch: { ruchId: movementId, czesc: "skok", koszt: dlugosc, dyst: dlugosc, tryb: "jump", zt: kluczTury(combat), uwagi } });
}

/* -------------------------------------------- */
/*  Okno kalkulatora                             */
/* -------------------------------------------- */

/** Treść kalkulatora (karta, makro, Region) — ten sam wynik wszędzie. */
export function opisZasiegu(actor) {
  const z = zasiegi(actor);
  if (z.reczny) return `<p>${esc(actor.name)}: ${esc(z.reczny)}.</p><p>Koszt skoku 1:1 z ruchu.</p>`;
  const r = z.zRozbiegu, m = z.zMiejsca, d = z.dane;
  return `<table class="neuro-skok-tabela"><thead><tr><th></th><th>z rozbiegu (≥ 3 m)</th><th>z miejsca</th></tr></thead><tbody>`
    + `<tr><th>w dal</th><td>${metry(r.dal)} m</td><td>${metry(m.dal)} m</td></tr>`
    + `<tr><th>wzwyż</th><td>${metry(r.wzwyz)} m</td><td>${metry(m.wzwyz)} m</td></tr>`
    + (r.siegniecie !== null ? `<tr><th>sięgnięcie</th><td>${metry(r.siegniecie)} m</td><td>${metry(m.siegniecie)} m</td></tr>` : "")
    + `</tbody></table>`
    + `<p class="hint">W dal: ${esc(r.wzorDal)}. Wzwyż: ${esc(r.wzorWzwyz)}.${d.skoczek ? " Skoczek: w dal z ZRC, testy skakania Akrobatyką." : ""}`
    + `${d.sportowiec ? " Sportowiec: Ułatwienie Atletyki przy skakaniu." : ""}${d.gladiator ? " Skok Gladiatora: ×2; lądowanie na polu istoty — RO SIŁ celu." : ""}</p>`
    + `<p class="hint">Koszt skoku 1:1 z ruchu; rozbieg to zwykły ruch tuż przed skokiem. Lądowanie na trudnym terenie po skoku w dal: `
    + `Akrobatyka ST ${S.ST_LADOWANIA}, inaczej Powalenie. Bez zaokrąglania do pól.</p>`;
}

/** Żeton aktora na oglądanej scenie (kontrolowany, potem pierwszy). */
function _zeton(actor) {
  const list = actor.getActiveTokens?.(false, true) ?? [];
  return list.find(t => t.object?.controlled) ?? list[0] ?? null;
}

/**
 * Okno kalkulatora skoku: zasięgi i [Tryb Skok na żetonie] — wybór trybu niczego nie wydaje (§8.1).
 * @param {Actor} actor
 */
export async function oknoSkoku(actor) {
  const tok = _zeton(actor);
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: `Skok — ${actor.name}`, icon: "fa-solid fa-person-running-fast" },
    position: { width: 440 },
    content: `<div class="neuro-skok-okno">${opisZasiegu(actor)}</div>`,
    buttons: [
      ...(tok?.isOwner ? [{ action: "tryb", label: "Tryb Skok na żetonie", icon: "fa-solid fa-person-running-fast", default: true }] : []),
      { action: "zamknij", label: "Zamknij" }
    ],
    rejectClose: false
  });
  if (wybor === "tryb" && tok) await tok.update({ movementAction: "jump" });
  return wybor;
}

/* -------------------------------------------- */
/*  Karty: przyciski                             */
/* -------------------------------------------- */

async function _onKlik(event) {
  const btn = event.target.closest?.("[data-neuro-skok]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.closest("[data-message-id]")?.dataset.messageId);
  const dane = message?.getFlag(MODULE_ID, FLAGA_KARTY);
  if (!dane || dane.wynik) return;
  if (dane.rodzaj === "ladowanie") {
    const actor = await fromUuid(dane.actorUuid);
    if (!actor?.isOwner) return ui.notifications.warn("Test lądowania rzuca gracz tej postaci albo MG.");
    btn.disabled = true;
    const rolls = await actor.rollSkill({ skill: "akr", target: dane.st });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) { btn.disabled = false; return; }
    const powalony = roll.total < dane.st;
    if (powalony) await actor.toggleStatusEffect("prone", { active: true });
    if (message.isOwner) await message.setFlag(MODULE_ID, FLAGA_KARTY, { ...dane, wynik: powalony ? "powalony" : "ok" });
    return;
  }
  if (dane.rodzaj === "gladiator") {
    if (!game.user.isGM) return ui.notifications.warn("RO celu Skoku Gladiatora rzuca MG.");
    const cel = await fromUuid(dane.celUuid);
    if (!cel) return;
    btn.disabled = true;
    const rolls = await cel.rollSavingThrow({ ability: "str", target: dane.st }, { configure: false });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) { btn.disabled = false; return; }
    const powalony = roll.total < dane.st;
    if (powalony) {
      await cel.toggleStatusEffect("prone", { active: true });
      const token = await fromUuid(dane.celToken);
      if (dane.kosci > 0 && token) {
        const TargetsField = dnd5e.dataModels.chatMessage.fields.TargetsField;
        await CONFIG.Dice.DamageRoll.build({
          hookNames: ["damage"], rolls: [{ parts: [`${dane.kosci}d6`], options: { type: "bludgeoning", types: ["bludgeoning"] } }]
        }, { configure: false }, {
          create: true,
          data: { flavor: `Skok Gladiatora (${dane.kto})`, speaker: ChatMessage.getSpeaker({ token }),
            system: { targets: TargetsField.getDescriptors([token]) }, type: "damage" }
        });
      }
    }
    await message.setFlag(MODULE_ID, FLAGA_KARTY, { ...dane, wynik: powalony ? "powalony" : "zdal" });
  }
}

function _onRenderKarty(message, html) {
  const dane = message.getFlag(MODULE_ID, FLAGA_KARTY);
  if (!dane?.wynik) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  const btn = el?.querySelector?.("[data-neuro-skok]");
  if (!btn) return;
  btn.disabled = true;
  const opis = { powalony: "Powalony", ok: "wylądował", zdal: "zdał RO" }[dane.wynik] ?? dane.wynik;
  btn.insertAdjacentHTML("afterend", ` <em>— ${esc(opis)}</em>`);
}

/* -------------------------------------------- */
/*  Haki                                         */
/* -------------------------------------------- */

/** U ruszającego: karty po skoku; poza budżetem walki — ostrzeżenie zasięgu jako wiadomość. */
async function _onMoveToken(doc, movement, _operation, user) {
  if (!user?.isSelf) return;
  const o = ocenRuch(doc, movement);
  if (!o) return;
  const wLedgerze = game.combat?.started && ruchSieLiczy(doc, movement) && (() => {
    const c = kombatant(doc);
    if (!c) return false;
    const ch = chwila(c, ledger(c));
    return ch.wlasna || !!ch.reakcja;
  })();
  if (!wLedgerze) for (const w of o.ostrz) ui.notifications.warn(`${doc.name}: ${w}`);
  await _poSkoku(doc, o.skoki);
}

export function registerSkok() {
  // Ostrzeżenia zasięgu w zapisie ruchu (u wykonawcy ledgera) — ten sam kalkulator co karta i Region.
  zarejestrujUwagiRuchu((doc, movement) => ocenRuch(doc, movement)?.ostrz ?? []);
  Hooks.on("moveToken", (doc, movement, operation, user) => { void _onMoveToken(doc, movement, operation, user); });
  Hooks.on("dnd5e.renderChatMessage", _onRenderKarty);
  document.addEventListener("click", ev => { void _onKlik(ev); }, true);
}

export const skokApi = Object.freeze({ zasiegi, okno: oknoSkoku, ocenRuch, opis: opisZasiegu, zasiegSkoku: S.zasiegSkoku });

export const __testing = Object.freeze({ _wzrost, odcinkiRuchu, rozbiegPrzed, trudnyTerenPod, istotyNaPolu, poSkoku: _poSkoku, klik: _onKlik });
