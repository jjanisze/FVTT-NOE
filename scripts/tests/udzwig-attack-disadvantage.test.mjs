/**
 * Neuroshima 5e — domyślne Utrudnienie do Ataku w Przeciążeniu/Unieruchomieniu
 * (`combat/udzwig-attack-disadvantage.mjs`).
 *
 * Per `tests/index.mjs`'s own rules — no `activity.use()`, chat cards aren't where
 * assertions belong — this drives the two hook functions directly with synthetic
 * config/message objects instead of triggering a real attack roll or posting a real
 * ChatMessage. Live-verified separately (2026-09-16, on Alan with a real weapon and
 * `configure:false`): `1d20dis` on the roll, badge on the resulting card, both
 * surviving a fast-forwarded (dialog-skipped) attack.
 */

import { __testing as attackDisadvantage } from "../combat/udzwig-attack-disadvantage.mjs";
import { MODULE_ID, scratchActor, scratchCleanup, setCarriedWeight } from "./helpers.mjs";

export function registerUdzwigAttackDisadvantageTests(quench) {
  quench.registerBatch(`${MODULE_ID}.udzwig-atak`, context => {
    const { describe, it, after, expect } = context;

    after(async function () {
      await scratchCleanup();
    });

    describe("onPreRollAttack (funkcja hooka, bez realnego rzutu)", function () {
      it("Normalna → nie ustawia disadvantage, nie stempluje żadnego pending rolla", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        const config = { subject: { actor }, rolls: [{ options: {} }] };
        attackDisadvantage.onPreRollAttack(config, {}, {});
        expect(config.disadvantage).to.not.be.true;
        expect(config.rolls[0].options.neuroUdzwigAttack).to.be.undefined;
      });

      it("Przeciążenie → ustawia disadvantage i stempluje każdy pending roll", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        await setCarriedWeight(actor, 70); // Siła 10 → Użytkowy 50, Maksymalny 100
        const config = { subject: { actor }, rolls: [{ options: {} }, {}] };
        attackDisadvantage.onPreRollAttack(config, {}, {});
        expect(config.disadvantage).to.be.true;
        expect(config.rolls[0].options.neuroUdzwigAttack).to.deep.equal({ zone: "przeciazenie" });
        // Second roll had no `.options` at all going in — must be created, not skipped.
        expect(config.rolls[1].options.neuroUdzwigAttack).to.deep.equal({ zone: "przeciazenie" });
      });

      it("Unieruchomienie → też ustawia disadvantage, ale stempluje inną strefę", async function () {
        const actor = await scratchActor({ system: { abilities: { str: { value: 10 } } } });
        await setCarriedWeight(actor, 130);
        const config = { subject: { actor }, rolls: [{ options: {} }] };
        attackDisadvantage.onPreRollAttack(config, {}, {});
        expect(config.disadvantage).to.be.true;
        expect(config.rolls[0].options.neuroUdzwigAttack).to.deep.equal({ zone: "nieruchomienie" });
      });

      it("brak aktora na aktywności → nie wybucha, nic nie ustawia", function () {
        const config = { subject: { actor: null }, rolls: [{ options: {} }] };
        expect(() => attackDisadvantage.onPreRollAttack(config, {}, {})).to.not.throw();
        expect(config.disadvantage).to.not.be.true;
      });
    });

    describe("onRenderChatMessage (malowanie plakietki, bez realnej wiadomości czatu)", function () {
      /** Wiadomość-atrapa: tylko to, co czyta `onRenderChatMessage`. */
      function fakeAttackMessage(zone) {
        return {
          getFlag: (scope, key) => (scope === "dnd5e" && key === "roll") ? { type: "attack" } : undefined,
          rolls: [{ options: { neuroUdzwigAttack: zone ? { zone } : undefined } }]
        };
      }

      it("Przeciążenie → dokleja plakietkę maroon do natywnej listy .pills, jeśli już istnieje", function () {
        const root = document.createElement("div");
        root.innerHTML = `<div class="chat-card"><ul class="card-footer pills unlist">
          <li class="pill transparent"><span class="label">Zwykła właściwość</span></li>
        </ul></div>`;
        attackDisadvantage.onRenderChatMessage(fakeAttackMessage("przeciazenie"), root);

        const badge = root.querySelector(".neuro-udzwig-attack-badge");
        expect(badge, "plakietka wstawiona").to.exist;
        expect(badge.classList.contains("pill")).to.be.true;
        expect(badge.classList.contains("maroon")).to.be.true;
        expect(badge.textContent).to.include("Przeciążenia");
        // Nie tworzy DRUGIEJ listy pills, tylko dokleja do istniejącej.
        expect(root.querySelectorAll("ul.card-footer.pills").length).to.equal(1);
      });

      it("brak natywnej listy .pills → tworzy własną zamiast milcząco rezygnować", function () {
        const root = document.createElement("div");
        root.innerHTML = `<div class="chat-card"></div>`;
        attackDisadvantage.onRenderChatMessage(fakeAttackMessage("nieruchomienie"), root);

        const pillList = root.querySelector("ul.card-footer.pills");
        expect(pillList, "lista pills utworzona").to.exist;
        expect(pillList.querySelector(".neuro-udzwig-attack-badge")?.textContent).to.include("Unieruchomienia");
      });

      it("wiadomość bez naszej flagi na rollu → brak plakietki", function () {
        const root = document.createElement("div");
        root.innerHTML = `<div class="chat-card"></div>`;
        attackDisadvantage.onRenderChatMessage(fakeAttackMessage(null), root);
        expect(root.querySelector(".neuro-udzwig-attack-badge")).to.be.null;
      });

      it("wiadomość, która nie jest rzutem ataku → w ogóle nie patrzy na rolls", function () {
        const root = document.createElement("div");
        root.innerHTML = `<div class="chat-card"></div>`;
        const notAttack = {
          getFlag: (scope, key) => (scope === "dnd5e" && key === "roll") ? { type: "damage" } : undefined,
          rolls: [{ options: { neuroUdzwigAttack: { zone: "przeciazenie" } } }]
        };
        attackDisadvantage.onRenderChatMessage(notAttack, root);
        expect(root.querySelector(".neuro-udzwig-attack-badge")).to.be.null;
      });

      it("wywołanie drugi raz na tej samej karcie nie dokleja drugiej plakietki", function () {
        const root = document.createElement("div");
        root.innerHTML = `<div class="chat-card"></div>`;
        const message = fakeAttackMessage("przeciazenie");
        attackDisadvantage.onRenderChatMessage(message, root);
        attackDisadvantage.onRenderChatMessage(message, root);
        expect(root.querySelectorAll(".neuro-udzwig-attack-badge").length).to.equal(1);
      });
    });
  }, { displayName: "Neuroshima: Udźwig — domyślne Utrudnienie do Ataku" });
}
