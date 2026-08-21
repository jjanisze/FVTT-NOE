/**
 * Neuroshima 5e — Próg obrażeń, Próg awarii i Tchórzliwość.
 *
 * Three Bestiariusz statistics that dnd5e has no concept of. All three read
 * their values from `flags.neuroshima-2026-overrides.bestiary`, written by the
 * pack builder, so they cost nothing on actors that aren't Bestiariusz NPCs.
 *
 * ## Próg obrażeń — 6 creatures
 *
 * > "Wartość minimalnych obrażeń, które trzeba zadać, żeby w ogóle uszkodzić
 * > cel. PRZYKŁAD: Próg obrażeń 5 oznacza, że obrażenia wynoszące mniej niż 5,
 * > nie wpływają w żaden sposób na cel."
 *
 * Mechanically identical to 5e's vehicle damage threshold, which dnd5e models
 * only on vehicles (`module/data/actor/vehicle.mjs`) — never on NPCs. Applied
 * here at `dnd5e.preCalculateDamage` by zeroing every component, so downstream
 * consumers see a clean 0 rather than a partially-applied hit.
 *
 * Weapons with the `ppanc` property bypass it: "Przeciwpancerna. Ignoruje
 * Odporności na obrażenia i Progi obrażeń."
 *
 * ## Próg awarii — 8 machines
 *
 * > "Jeśli maszyna zostanie trafiona krytycznie lub w jednym ataku otrzyma
 * > określoną w tej statystyce ilość obrażeń, dochodzi do losowej awarii.
 * > Rzuć na Tabelę awarii maszyn."
 *
 * Detected automatically, rolled by the GM — house doctrine. A malfunction can
 * end a fight outright (entry 20 is "Natychmiastowa autodestrukcja"), so it is
 * never applied behind the GM's back.
 *
 * ## Tchórzliwość — 32 creatures
 *
 * A percentage of PW at which the creature flees or surrenders. Deliberately
 * advisory: it whispers the GM and changes nothing. Whether the Gangus Boss
 * actually runs is a roleplaying decision, not a rules trigger.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** TABELA AWARII MASZYN — rozdział "Maszyny". Rolled on k20. */
export const MACHINE_FAILURES = Object.freeze({
  1: "Jedna broń zostaje zniszczona. Wylosuj lub wybierz która.",
  2: "Uszkodzenie napędu. Szybkość maszyny spada o połowę.",
  3: "Uszkodzenie modułu celowania. Kara -2 do Testów Ataku.",
  4: "Uszkodzenie procesora. Brak Akcji Bonusowych lub Akcji Legendarnych.",
  5: "Uszkodzenie zasilania. Maszyna otrzymuje stan Sparaliżowanie, do końca swojej następnej tury.",
  6: "Eksplozja amunicji. Maszyna otrzymuje 50 obrażeń i kończy się jej amunicja.",
  7: "Uszkodzenie manipulatora. Maszyna ma jeden atak w turze mniej.",
  8: "Awaria optyki. Maszyna zostaje Oślepiona do czasu naprawy.",
  9: "Wyciek płynów. Maszyna nie może wykonywać Reakcji.",
  10: "Reset systemów. Maszyna nie może wykonywać akcji ani Akcji Bonusowych do końca swojej następnej tury.",
  11: "Samozapłon. Maszyna zaczyna się palić. Istota dotykająca płonącej maszyny otrzymuje 2 (1k4) obrażeń od ognia za każdy atak wręcz lub inny fizyczny kontakt.",
  12: "Awaria żyroskopu. Maszyna otrzymuje stan Powalenie i nie wstaje do końca swojej następnej tury.",
  13: "Uszkodzenie pancerza. TT maszyny zmniejsza się o 2.",
  14: "Awaria modułu celowania. Maszyna otrzymuje karę -4 do Testów Ataku.",
  15: "Uszkodzenie siłowników. Ataki wręcz zadają tylko połowę obrażeń.",
  16: "Zniszczenie siłowników. Maszyna nie może wykonywać ataków wręcz.",
  17: "Uszkodzenie pamięci. Maszyna przestaje atakować i wycofuje się do bazy.",
  18: "Błąd pamięci. Maszyna nie rozpoznaje sojuszników i atakuje najbliżej stojące istoty.",
  19: "Awaria zasilania lub wyciek paliwa. Maszyna wyłącza się do czasu naprawy.",
  20: "Natychmiastowa autodestrukcja. Maszyna wybucha, raniąc wszystkich wokół."
});

const bestiaryFlags = actor => actor?.flags?.[MODULE_ID]?.bestiary ?? null;

/* -------------------------------------------- */
/*  Próg obrażeń                                 */
/* -------------------------------------------- */

/** Did the attack that produced this damage use an armour-piercing weapon? */
function isArmourPiercing(options) {
  const uuid = options?.originatingMessage?.flags?.dnd5e?.activity?.uuid;
  if (!uuid) return false;
  try {
    const activity = fromUuidSync(uuid);
    return activity?.item?.system?.properties?.has?.("ppanc") ?? false;
  } catch {
    return false;
  }
}

function onPreCalculateDamage(actor, damages, options) {
  const flags = bestiaryFlags(actor);
  const threshold = flags?.damageThreshold;
  if (!threshold) return;

  const total = (damages ?? [])
    .filter(d => d.type !== "healing" && d.type !== "temphp")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
  if (total <= 0 || total >= threshold) return;

  if (isArmourPiercing(options)) return;   // ppanc ignores Progi obrażeń

  for (const d of damages) {
    if (d.type === "healing" || d.type === "temphp") continue;
    d.value = 0;
  }

  if (game.user.isGM) {
    ui.notifications.info(
      `${actor.name}: ${total} obrażeń < Próg obrażeń ${threshold} — atak nie robi nic.`);
  }
}

/* -------------------------------------------- */
/*  Próg awarii                                  */
/* -------------------------------------------- */

function onCalculateDamage(actor, damages, options) {
  if (!game.user.isGM) return;

  const flags = bestiaryFlags(actor);
  const threshold = flags?.failureThreshold;
  if (!threshold) return;

  const total = (damages ?? [])
    .filter(d => d.type !== "healing" && d.type !== "temphp")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  const wasCritical = options?.originatingMessage?.flags?.dnd5e?.roll?.critical === true
    || options?.isCritical === true;

  if (!wasCritical && total < threshold) return;

  const reason = wasCritical ? "trafienie krytyczne" : `${total} obrażeń w jednym ataku (próg ${threshold})`;
  // Deferred: this fires mid-calculation and creating a chat card here would
  // re-enter the damage pipeline — the same reason bleeding.mjs defers.
  setTimeout(() => announceFailure(actor, reason), 0);
}

async function announceFailure(actor, reason) {
  await ChatMessage.create({
    content: `
      <div class="neuro-machine-failure">
        <p><strong>${actor.name}</strong> — awaria: ${reason}.</p>
        <button type="button" class="neuro-failure-btn" data-actor-uuid="${actor.uuid}">
          ⚙ Rzuć na Tabelę awarii maszyn (k20)
        </button>
      </div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [MODULE_ID]: { machineFailure: true } }
  });
}

async function onClickFailure(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const actor = await fromUuid(btn.dataset.actorUuid);
  if (!actor) return;

  const roll = await new Roll("1d20").evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>Awaria maszyny:</strong> ${MACHINE_FAILURES[roll.total] ?? "—"}`
  });

  btn.disabled = true;
  btn.textContent = `⚙ Awaria ${roll.total}`;
}

/* -------------------------------------------- */
/*  Tchórzliwość                                 */
/* -------------------------------------------- */

function onUpdateActor(actor, changes) {
  if (!game.user.isGM) return;

  const flags = bestiaryFlags(actor);
  const morale = flags?.morale;
  if (!morale) return;

  const newHp = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (newHp === undefined) return;

  const max = actor.system.attributes.hp.max || 1;
  const pct = (newHp / max) * 100;
  if (pct > morale || newHp <= 0) return;

  // Advisory only — whether the creature actually runs is the GM's call.
  ChatMessage.create({
    content: `<p><strong>${actor.name}</strong> — Tchórzliwość ${morale}%: `
      + `PW spadły do ${newHp}/${max} (${Math.round(pct)}%). Przeciwnik ucieka lub się poddaje.</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [MODULE_ID]: { morale: true } }
  });
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerBestiaryThresholds() {
  Hooks.on("dnd5e.preCalculateDamage", onPreCalculateDamage);
  Hooks.on("dnd5e.calculateDamage", onCalculateDamage);
  Hooks.on("updateActor", onUpdateActor);

  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    for (const btn of html.querySelectorAll(".neuro-failure-btn")) {
      btn.addEventListener("click", onClickFailure);
    }
  });

  console.log(`${MODULE_ID} | Bestiariusz thresholds registered `
    + `(Próg obrażeń, Próg awarii, Tchórzliwość)`);
}
