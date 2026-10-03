/**
 * Neuroshima 5e — broń rzucana: sztuka leci do celu i zostaje na ziemi (PLAN_paper_doll §5, §9).
 *
 * dnd5e sam zdejmuje sztukę przy ataku w trybie „rzut" (`AttackActivity#rollAttack`, `ammoUpdate`
 * na samym przedmiocie, chyba że ma natywne `ret`). Wcześniej ten plik zdejmował drugą sztukę
 * już przy użyciu aktywności — stąd hak na `dnd5e.rollAttack`, który dostaje ten sam
 * `ammoUpdate` przed zastosowaniem: zerujemy go i robimy to po swojemu —
 *
 *   - sztuka z ręki (lalka: ta, która rzuciła) ląduje u celu jako Kafelek ziemi
 *     (`actors/ground-items.mjs`) i można ją podnieść ([I]);
 *   - **Powracająca** wraca do rzucającego — nic nie znika, karta przypomina, że łapie ją wolna
 *     ręka (RAW, broń miotana);
 *   - bez MG na sesji albo bez żetonu (ziemi nie ma kto założyć) — zostaje zachowanie dnd5e:
 *     sztuka po prostu ubywa.
 *
 * Rzut to nie upuszczenie: bez linii kosztu na czacie i bez rzutu k6 z „Darmowego upuszczania".
 */

import { drop, handOf, isDollActor } from "../actors/doll.mjs";
import { canDrop } from "../actors/ground-items.mjs";
import { hasWeaponProperty } from "../config/weapons.mjs";
import { freeHandPill } from "../combat/grip.mjs";

export function registerThrownWeapons() {
  Hooks.on("dnd5e.rollAttack", onRollAttack);
  console.log("Neuroshima 5e | Thrown weapons system registered");
}

function onRollAttack(rolls, { subject, ammoUpdate } = {}) {
  const item = subject?.item;
  const actor = item?.actor;
  if (item?.type !== "weapon" || !actor) return;
  const mode = String(rolls?.[0]?.options?.attackMode ?? "");
  if (!mode.startsWith("thrown")) return;
  if (!ammoUpdate || ammoUpdate.id !== item.id) return;

  const speaker = ChatMessage.getSpeaker({ actor });
  if (hasWeaponProperty(item, "powracajaca")) {
    ammoUpdate.quantity = item.system.quantity;
    ammoUpdate.destroy = false;
    ChatMessage.create({
      speaker,
      content: `<div><strong>${item.name}</strong> zatacza łuk i wraca do rzucającego.`
        + ` ${freeHandPill(actor, { need: 1, what: "Złapanie broni powracającej" })}</div>`
    });
    return;
  }

  const target = [...game.user.targets][0] ?? null;
  if (!canDrop(actor, { quiet: true, at: target })) return;
  ammoUpdate.quantity = item.system.quantity;
  ammoUpdate.destroy = false;
  const from = isDollActor(actor) ? (handOf(item) ?? undefined) : undefined;
  drop(actor, item, { from, at: target, involuntary: true, quiet: true, reason: "Rzut" }).then(ok => {
    if (!ok) return;
    ChatMessage.create({
      speaker,
      content: `<div><strong>${item.name}</strong> leci${target ? ` w stronę ${target.name}` : ""} i zostaje na ziemi.</div>`
    });
  });
}
