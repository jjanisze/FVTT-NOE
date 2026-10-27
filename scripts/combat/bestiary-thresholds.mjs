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
 * Mechanically identical to dnd5e 6's native `hp.dt` (every actor type since 6.0 — moving these six to it is
 * PLAN_m6 P7, together with PM1). Applied at `dnd5e.calculateDamage`, i.e. **after** resistance, like the native
 * threshold and like RAW s. 254 ("najpierw RO, następnie odporność, a na końcu Próg"); until 2026-10 it ran at
 * `preCalculateDamage` and let a resisted hit through (8 vs Próg 5 with resistance dealt 4 — RAW: 0).
 *
 * Weapons and rounds with `ppanc` or `przebijajaca` bypass it: "Przeciwpancerna. Ignoruje
 * Odporności na obrażenia i Progi obrażeń." — one shared check, `combat/armour-piercing.mjs`.
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

import { isArmourPiercing } from "./armour-piercing.mjs";
import { isCriticalHitOn } from "./trafienie.mjs";
import { awariaMaszyny, zastosujAwarie, ustawTekstyAwarii } from "./maszyny.mjs";

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

function onDamageThreshold(actor, damages, options) {
  const flags = bestiaryFlags(actor);
  const threshold = flags?.damageThreshold;
  if (!threshold) return;

  // After resistance: `damages.amount` is what dnd5e would take off (RAW order, s. 254).
  const total = Number(damages?.amount ?? 0);
  if (!(total > 0) || total >= threshold) return;

  // ppanc / przebijająca ignore Progi obrażeń.
  if (options?.ignore === true || options?.ignore?.threshold || isArmourPiercing(damages, options)) return;

  damages.amount = 0;
  for (const d of damages) {
    if (d.type === "healing" || d.type === "temphp") continue;
    d.value = 0;
    (d.active ??= {}).threshold = true;
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

  // dnd5e nie zapisuje krytyka w danych wiadomości — krytyk z werdyktu karty ataku albo z rzutu
  // obrażeń, ten sam co dla Stopnia Zranienia i wytrzymałości pancerza (`combat/trafienie.mjs`).
  const wasCritical = isCriticalHitOn(actor, options);

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
  // D10 (PLAN_m3_towarzysze.md): pozycja po pominięciu tych, które maszyny nie dotyczą (s. 214), i [Zastosuj].
  const a = awariaMaszyny(actor, roll.total);
  const pominiete = a.pominiete.length ? ` <em>(pominięte: ${a.pominiete.join(", ")} — nie dotyczą tej maszyny)</em>` : "";
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flavor: `<strong>Awaria maszyny ${a.pozycja}:</strong> ${MACHINE_FAILURES[a.pozycja] ?? "—"}${pominiete}`
      + `<div class="neuro-machine-failure"><button type="button" class="neuro-failure-apply" data-actor-uuid="${actor.uuid}" `
      + `data-awaria="${a.pozycja}"><i class="fa-solid fa-wrench" inert></i> Zastosuj</button></div>`,
    flags: { [MODULE_ID]: { awariaRzut: { actorUuid: actor.uuid, pozycja: a.pozycja, k20: roll.total } } }
    // Tryb jawnie: `toMessage` nakłada tryb z ustawień i nadpisuje `whisper` — przy „publicznym” gracz widział
    // kartę MG z [Zastosuj].
  }, { messageMode: "gm" }); // v14: tryby wiadomości (`CONFIG.ChatMessage.modes`)

  btn.disabled = true;
  btn.textContent = `⚙ Awaria ${a.pozycja}`;
}

async function onClickApply(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  if (!game.user.isGM) return ui.notifications.warn("Awarię stosuje MG.");
  const actor = await fromUuid(btn.dataset.actorUuid);
  if (!actor) return;
  btn.disabled = true;
  await zastosujAwarie(actor, Number(btn.dataset.awaria));
  btn.innerHTML = `<i class="fa-solid fa-check" inert></i> Zastosowano`;
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
  ustawTekstyAwarii(MACHINE_FAILURES);
  Hooks.on("dnd5e.calculateDamage", onDamageThreshold);
  Hooks.on("dnd5e.calculateDamage", onCalculateDamage);
  Hooks.on("updateActor", onUpdateActor);

  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    for (const btn of html.querySelectorAll(".neuro-failure-btn")) {
      btn.addEventListener("click", onClickFailure);
    }
    for (const btn of html.querySelectorAll(".neuro-failure-apply")) {
      btn.addEventListener("click", onClickApply);
    }
  });

  console.log(`${MODULE_ID} | Bestiariusz thresholds registered `
    + `(Próg obrażeń, Próg awarii, Tchórzliwość)`);
}
