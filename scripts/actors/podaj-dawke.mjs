/**
 * Neuroshima 5e — podanie dawki leku drugiej postaci (decyzje MG 2026-11-02, D18).
 *
 * Każdy może wydzielić lek z własnego ekwipunku pacjentowi: przycisk „Podaj” na liście Leków (`leki-inventory.mjs`)
 * → wybór pacjenta z chorobą, którą lek leczy → okno u pacjenta „X podaje lek: Y” z [Przyjmij] / [Odmów] → po
 * przyjęciu MG (przekaźnik) zdejmuje dawkę z zapasu dawcy i zapisuje dzisiejszą dawkę na wpisie choroby pacjenta —
 * Zachód słońca liczy ją jak każdą inną.
 *
 * Sztuczka **Pan Plaster** (Do ostatniej kropelki, s. 105) liczy się po stronie dawcy: wydziela pół dawki
 * (`config/dawki-rules.mjs`), także sobie przy „Weź dawkę”. Okno pacjenta jej nie wymienia; ułamek widać tylko
 * w zapasie dawcy. Nie ma rabatu dla całej drużyny — chory oddaje leki temu, kto je wydziela (MG).
 *
 * Okno pacjenta idzie gniazdem modułu do jednego klienta: aktywny gracz-właściciel pacjenta, inaczej aktywny MG;
 * odpowiedź wraca do dawcy powiadomieniem.
 */

import { CHEMIA, chemiaKeyByName } from "../config/chemia-data.mjs";
import { pacjenciLeku, dawkaNaRaz, fmtDawki, slowoDawki } from "../config/dawki-rules.mjs";
import { getChoroby, dosedToday, dosesRemaining, wydajDawke, oznaczDawkeDzis, wydzielaPolDawki } from "./health-panel.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SOCKET_EVENT = `module.${MODULE_ID}`;
const PYTANIE = "neuro-dawka-pytanie";
const ODPOWIEDZ = "neuro-dawka-odpowiedz";
const PROSBA = "dawka.podaj";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

const _klucz = item => item?.getFlag(MODULE_ID, "chemiaKey") ?? chemiaKeyByName(item?.name);

/** Lek leczy jakąś chorobę — tylko przy takim jest „Podaj”. */
export function lekNaChorobe(item) {
  return !!CHEMIA[_klucz(item)]?.treats?.length;
}

/** Kandydaci na pacjenta: postacie graczy, drużyna główna i postacie z żetonem na scenie dawcy. */
function _kandydaci(dawca) {
  const druzyna = game.settings.get("dnd5e", "primaryParty")?.actor ?? null;
  const czlonkowie = new Set((druzyna?.system?.members ?? []).map(m => m.actor?.id).filter(Boolean));
  const scena = dawca.getActiveTokens?.()[0]?.document?.parent ?? canvas?.scene ?? null;
  const naScenie = new Set((scena?.tokens ?? []).map(t => t.actor?.id).filter(Boolean));
  return game.actors
    .filter(a => a.type === "character" && (a.hasPlayerOwner || czlonkowie.has(a.id) || naScenie.has(a.id)))
    .map(a => ({ id: a.id, nazwa: a.name, choroby: getChoroby(a).map(c => ({ id: c.id, key: c.key, name: c.name, dzis: dosedToday(c) })) }));
}

/** Kto odpowiada za pacjenta: aktywny gracz-właściciel, inaczej aktywny MG. */
function _odbiorca(pacjent) {
  return game.users.find(u => u.active && !u.isGM && pacjent.testUserPermission(u, "OWNER")) ?? game.users.activeGM ?? null;
}

/**
 * „Podaj” — wybór pacjenta i prośba o przyjęcie.
 * @param {Actor} dawca
 * @param {Item} item  lek z ekwipunku dawcy
 */
export async function oknoPodajDawke(dawca, item) {
  const lista = pacjenciLeku(_kandydaci(dawca), CHEMIA[_klucz(item)]?.treats ?? [], dawca.id);
  if (!lista.length) return ui.notifications.info(`${item.name}: nikt w pobliżu nie choruje na to, co ten lek leczy.`);
  if (dosesRemaining(item) < dawkaNaRaz(wydzielaPolDawki(dawca))) return ui.notifications.warn(`${item.name}: brak dawek.`);
  const opcje = lista.map((p, i) => `<option value="${i}"${p.dzis ? " disabled" : ""}>${esc(p.nazwa)} — ${esc(p.choroba)}`
    + `${p.dzis ? " (dawka na dziś już podana)" : ""}</option>`).join("");
  const wybor = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Podaj: ${item.name}`, icon: "fa-solid fa-hand-holding-medical" },
    content: `<label>Pacjent <select name="pacjent">${opcje}</select></label>`,
    ok: { label: "Podaj", callback: (_event, button) => button.form.elements.pacjent.value }
  }).catch(() => null);
  const p = wybor == null ? null : lista[Number(wybor)];
  if (!p || p.dzis) return;
  const pacjent = game.actors.get(p.aktorId);
  const kto = pacjent ? _odbiorca(pacjent) : null;
  if (!kto) return ui.notifications.warn("Brak MG online — podanie leku czeka na MG.");
  const dane = {
    id: foundry.utils.randomID(), od: game.user.id, do: kto.id,
    dawcaUuid: dawca.uuid, itemId: item.id, pacjentUuid: pacjent.uuid, wpisId: p.wpisId,
    dawca: dawca.name, lek: item.name, choroba: p.choroba, pacjent: pacjent.name
  };
  if (kto.isSelf) return _pytanie(dane);
  ui.notifications.info(`${pacjent.name}: czeka na odpowiedź (${item.name}).`);
  game.socket.emit(SOCKET_EVENT, { type: PYTANIE, ...dane });
}

/** Okno pacjenta — bez nazwy Sztuczki. Odmowa i zamknięcie okna niczego nie zużywają. */
async function _pytanie(dane) {
  const przyjal = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Lekarstwo", icon: "fa-solid fa-hand-holding-medical" },
    content: `<p><strong>${esc(dane.dawca)}</strong> podaje lek: <strong>${esc(dane.lek)}</strong>.</p>`
      + `<p>Pacjent: <strong>${esc(dane.pacjent)}</strong> (${esc(dane.choroba)}).</p>`,
    yes: { label: "Przyjmij", icon: "fa-solid fa-check" },
    no: { label: "Odmów", icon: "fa-solid fa-xmark" },
    rejectClose: false
  }).catch(() => false);
  if (przyjal) {
    const pacjent = await fromUuid(dane.pacjentUuid);
    await doMG(PROSBA, { dawcaUuid: dane.dawcaUuid, itemId: dane.itemId, pacjentUuid: dane.pacjentUuid, wpisId: dane.wpisId, od: dane.od },
      { nosiciel: pacjent });
  }
  const odp = { type: ODPOWIEDZ, id: dane.id, od: dane.od, przyjal: !!przyjal, pacjent: dane.pacjent, lek: dane.lek };
  if (dane.od === game.user.id) _odpowiedz(odp);
  else game.socket.emit(SOCKET_EVENT, odp);
}

function _odpowiedz(odp) {
  if (odp.przyjal) ui.notifications.info(`${odp.pacjent}: lek przyjęty (${odp.lek}).`);
  else ui.notifications.warn(`${odp.pacjent}: odmowa — ${odp.lek} zostaje w ekwipunku.`);
}

/**
 * U MG: dawka z zapasu dawcy (pół z Panem Plastrem), dzisiejsza dawka na wpisie pacjenta, karta na czacie.
 * @returns {Promise<boolean|null>}
 */
export async function wykonajPodanie(_nosiciel, dane, user = null) {
  const dawca = await fromUuid(dane.dawcaUuid);
  const pacjent = await fromUuid(dane.pacjentUuid);
  const item = dawca?.items?.get(dane.itemId);
  const wpis = pacjent ? getChoroby(pacjent).find(c => c.id === dane.wpisId) : null;
  if (!dawca || !pacjent || !item || !wpis) return null;
  // Dawca — tylko z własnego ekwipunku; odpowiadający — właściciel pacjenta albo MG.
  const od = game.users.get(dane.od);
  if (od && !dawca.testUserPermission(od, "OWNER")) return null;
  if (user && !user.isGM && !pacjent.testUserPermission(user, "OWNER")) return null;
  if (dosedToday(wpis)) return false;
  const polowa = wydzielaPolDawki(dawca);
  if (dosesRemaining(item) < dawkaNaRaz(polowa)) {
    ui.notifications.warn(`${dawca.name}: ${item.name} — brak dawek.`);
    return false;
  }
  if (!(await wydajDawke(item, { polowa }))) return false;
  await oznaczDawkeDzis(pacjent, wpis.id);
  const left = dosesRemaining(dawca.items.get(item.id));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: dawca }),
    content: `<div class="neuro-dose-card">
      <div class="neuro-dose-head"><i class="fa-solid fa-hand-holding-medical"></i> ${esc(item.name)}</div>
      <div class="neuro-dose-flavor">${esc(dawca.name)} podaje lek. Pacjent: ${esc(pacjent.name)} (${esc(wpis.name)}).</div>
      <div class="neuro-dose-left">Zapas: ${fmtDawki(left)} ${slowoDawki(left)}</div>
    </div>`,
    flags: { [MODULE_ID]: { dosePodana: { dawca: dawca.id, pacjent: pacjent.id, entryId: wpis.id, itemId: item.id } } }
  });
  return true;
}

export function registerPodajDawke() {
  zarejestrujProsbe(PROSBA, wykonajPodanie);
  // Gniazdo działa dopiero od `ready`.
  Hooks.once("ready", () => game.socket.on(SOCKET_EVENT, data => {
    if (data?.type === PYTANIE && data.do === game.user.id) void _pytanie(data);
    else if (data?.type === ODPOWIEDZ && data.od === game.user.id) _odpowiedz(data);
  }));
}

export const __testing = Object.freeze({ kandydaci: _kandydaci, odbiorca: _odbiorca, pytanie: _pytanie });
