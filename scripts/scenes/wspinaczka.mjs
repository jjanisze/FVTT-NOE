/**
 * Neuroshima 5e — wspinaczka (NOE s. 256; PLAN_m6_drobne_zasady.md §5.6, E6).
 *
 * Koszt ruchu `climb` liczy dnd5e (RAW = stock; Szybkość wspinania go znosi). Moduł dokłada test: pierwszy odcinek
 * wspinaczki w turze **w walce** (jak woda — U15: poza walką test zarządza MG) wystawia kartę dla właściciela i MG:
 * Test Siły (Atletyka) ST 10, [ST 15] dla śliskiej ściany albo małej liczby chwytów (MG wybiera), Utrudnienie przy
 * Udźwigu ponad próg (ciężki plecak), a bez dwóch wolnych rąk (lalka) — powód na karcie i dźwięk naruszenia
 * (`combat/sygnal-naruszenia.mjs`): moduł oznacza, nie zakazuje.
 *
 * Nie liczy się: ruch przez przejście między poziomami (drabina, schody, trudne przejście — `scenes/transitions.mjs`
 * ma własne testy) ani „Opuść bezpiecznie” MG (opcja ruchu `neuroBezWspinaczki`).
 */

import { ST_WSPINACZKI, testWspinaczki } from "../config/woda-rules.mjs";
import { tikRaz } from "../combat/tiki.mjs";
import { freeHands } from "../actors/doll.mjs";
import { udzwigStatus } from "../actors/encumbrance-breakdown.mjs";
import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";
import { szybkoscPrzedStanami } from "../actors/latanie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Karta wspinaczki: `{actorUuid, utrudnienie}`. */
const KARTA = "wspinaczkaKarta";
/** Ruchy, które nie są wspinaczką z testem. */
const BEZ_TESTU = new Set(["changeLevel", "teleportToken", `${MODULE_ID}.trudnePrzejscie`]);
/** Wyższe ST na karcie (s. 256: „15 i więcej”). */
const ST_TRUDNE = 15;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Udźwig ponad próg — „ciężki plecak” (s. 256). */
function _ciezkiPlecak(actor) {
  const enc = actor?.system?.attributes?.encumbrance;
  const st = udzwigStatus(enc?.value, enc?.thresholds?.heavilyEncumbered, enc?.thresholds?.maximum);
  return !!st && st.zone !== "normalna";
}

const _przejscie = token => [...(token.regions ?? [])].some(r => r.behaviors.some(b => !b.disabled && BEZ_TESTU.has(b.type)));

/**
 * Karta testu wspinaczki.
 * @param {TokenDocument} token
 */
export async function kartaWspinaczki(token) {
  const actor = token?.actor;
  if (!actor) return null;
  const t = testWspinaczki({ wolneRece: freeHands(actor), ciezkiPlecak: _ciezkiPlecak(actor) });
  const whisper = [...new Set([...game.users.filter(u => u.isGM).map(u => u.id),
    ...game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.id)])];
  const uwagi = [
    !t.rece ? `<li class="neuro-zle">Wspinaczka wymaga dwóch wolnych rąk — wolnych: ${freeHands(actor)}.</li>` : "",
    t.utrudnienie ? "<li>Udźwig ponad próg (ciężki plecak) — Utrudnienie.</li>" : "",
    szybkoscPrzedStanami(actor, "climb") > 0 ? "<li>Szybkość wspinania — bez dodatkowego kosztu ruchu.</li>" : ""
  ].filter(Boolean).join("");
  const msg = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    whisper,
    content: `<div class="neuro-wspinaczka-karta"><p><i class="fa-solid fa-person-hiking" inert></i>
      <strong>${esc(token.name)}</strong> wspina się — Test Siły (Atletyka) (s. 256).</p>
      ${uwagi ? `<ul>${uwagi}</ul>` : ""}
      <div class="card-buttons">
        <button type="button" data-neuro-wspinaczka="${ST_WSPINACZKI}"><i class="fa-solid fa-dice-d20" inert></i> ST ${ST_WSPINACZKI}</button>
        <button type="button" data-neuro-wspinaczka="${ST_TRUDNE}"><i class="fa-solid fa-dice-d20" inert></i> ST ${ST_TRUDNE} — śliska, mało chwytów</button>
      </div></div>`,
    flags: { [MODULE_ID]: { [KARTA]: { actorUuid: actor.uuid, utrudnienie: t.utrudnienie } } }
  });
  if (!t.rece) {
    await sygnalNaruszenia(actor, { tytul: "Wspinaczka bez dwóch wolnych rąk", linie: [`${actor.name}: wolnych rąk ${freeHands(actor)} (s. 256).`], karta: false });
  }
  return msg;
}

async function _onMoveToken(token, movement, operation, user) {
  if (!user?.isSelf || operation?.neuroBezWspinaczki || !token.actor) return;
  if (!movement?.passed?.waypoints?.some(w => w.action === "climb")) return;
  const combat = game.combat;
  if (!combat?.started || combat.combatant?.tokenId !== token.id) return;
  if (_przejscie(token)) return;
  if (!await tikRaz(token.actor, "wspinaczka", combat, { round: combat.round, combatantId: combat.combatant.id, krawedz: "ruch" })) return;
  await kartaWspinaczki(token);
}

function _onRenderKarty(message, html) {
  const k = message.getFlag(MODULE_ID, KARTA);
  if (!k) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const actor = fromUuidSync(k.actorUuid);
  for (const btn of root?.querySelectorAll("[data-neuro-wspinaczka]") ?? []) {
    if (!actor?.isOwner) { btn.disabled = true; continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const st = Number(btn.dataset.neuroWspinaczka) || ST_WSPINACZKI;
      await actor.rollSkill({ skill: "atl", target: st, disadvantage: !!k.utrudnienie }, {},
        { data: { flavor: `Wspinaczka — Test Siły (Atletyka) ST ${st}` } });
    });
  }
}

export function registerWspinaczka() {
  Hooks.on("moveToken", _onMoveToken);
  Hooks.on("renderChatMessageHTML", _onRenderKarty);
}

/** `game.neuroshima.wspinaczka` */
export const wspinaczkaApi = Object.freeze({ kartaWspinaczki });
