/**
 * Neuroshima 5e — wiadomości i karty czatu na danych dnd5e 6.0 (PLAN_migracja_dnd5e6.md E3, E6).
 *
 * Adapter `config/chat-message-data.mjs` czyta typowane wiadomości 6.0 (`message.type`, `message.system`) w 24
 * plikach; tu sprawdzamy go na prawdziwych dokumentach `ChatMessage` budowanych w pamięci (bez zapisu) — schemat
 * dnd5e waliduje dane, więc zmiana nazwy pola w kolejnej wersji wyjdzie tutaj, nie na sesji. Pomocnik
 * `config/chat-card-dom.mjs` — na fragmentach DOM kart w kształcie 6.0 i naszym (5.3).
 */

import {
  rollInfo, rollTypeOf, itemUuidOf, activityRefOf, isUsageCard, originIdOf, targetsOf
} from "../config/chat-message-data.mjs";
import { cardPillList, cardPillLists, cardButtonHost } from "../config/chat-card-dom.mjs";
import { applyDose } from "../weapons/dozownik.mjs";
import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";

const ORIGIN = "e2eOrigin0000001";
const ACTOR = "Actor.e2eActor00000001";
const ITEM = `${ACTOR}.Item.e2eItem000000001`;

/** A chat message in memory, validated by dnd5e's data model for its type. */
const wiadomosc = (type, system) => new ChatMessage.implementation({ type, system, content: "" });

/** A detached DOM fragment. */
function fragment(html) {
  const el = document.createElement("li");
  el.className = "chat-message";
  el.innerHTML = html;
  return el;
}

export function registerKartyCzatuTests(quench) {
  quench.registerBatch(`${MODULE_ID}.karty-czatu`, context => {
    const { describe, it, after, expect } = context;
    after(scratchCleanup);

    describe("Adapter wiadomości (dnd5e 6.0: typ i `system`)", function () {
      it("atak: typ, cecha, tryb, pochodzenie, przedmiot i cele", function () {
        const m = wiadomosc("attack", {
          ability: "dex", mode: "oneHanded", origin: ORIGIN, item: { uuid: ITEM, type: "weapon" },
          targets: [{ actor: ACTOR, name: "CYWIL", img: "icons/svg/mystery-man.svg", ac: 12 }]
        });
        expect(rollTypeOf(m)).to.equal("attack");
        expect(rollInfo(m)).to.include({ type: "attack", ability: "dex", attackMode: "oneHanded", itemUuid: ITEM });
        expect(originIdOf(m), "id karty użycia ze źródła").to.equal(ORIGIN);
        expect(itemUuidOf(m)).to.equal(ITEM);
        const [cel] = targetsOf(m);
        expect(cel, "cel w kształcie 5.3").to.include({ uuid: ACTOR, name: "CYWIL", ac: 12 });
      });

      it("obrażenia: typ i połowa przy udanym RO", function () {
        const m = wiadomosc("damage", { onSave: "half", origin: ORIGIN });
        expect(rollTypeOf(m)).to.equal("damage");
        expect(rollInfo(m).damageOnSave).to.equal("half");
      });

      it("RO: cecha; rzut przeciw śmierci to osobny typ", function () {
        expect(rollInfo(wiadomosc("save", { ability: "con" }))).to.include({ type: "save", ability: "con" });
        expect(rollTypeOf(wiadomosc("save", { type: "death" }))).to.equal("death");
      });

      it("test: umiejętność, narzędzie, cecha", function () {
        expect(rollInfo(wiadomosc("check", { ability: "wis", skill: "prc" }))).to.include({ type: "skill", skillId: "prc" });
        expect(rollTypeOf(wiadomosc("check", { ability: "int", tool: "kowala" }))).to.equal("tool");
        expect(rollTypeOf(wiadomosc("check", { ability: "str" }))).to.equal("ability");
      });

      it("karta użycia: rozpoznana, z aktywnością; zwykła wiadomość — nic", function () {
        const m = wiadomosc("usage", { activity: { uuid: `${ITEM}.Activity.e2eActivity00001`, type: "attack" }, item: { uuid: ITEM, type: "weapon" } });
        expect(isUsageCard(m)).to.equal(true);
        expect(activityRefOf(m)?.type).to.equal("attack");
        const zwykla = new ChatMessage.implementation({ content: "<p>tekst</p>" });
        expect(isUsageCard(zwykla)).to.equal(false);
        expect(rollTypeOf(zwykla)).to.equal(null);
        expect(originIdOf(zwykla)).to.equal(null);
        expect(targetsOf(zwykla)).to.deep.equal([]);
      });
    });

    describe("Gdzie nasze wstawki na kartach dnd5e (`chat-card-dom.mjs`)", function () {
      // Kształt 6.0: `card-face.hbs` (wiersze pigułek w `section.icon-row`), cele ataku poza `.chat-card`.
      const karta60 = () => fragment(`<div class="message-content">
        <div class="chat-card"><section class="card-header"></section>
          <section class="icon-row"><i></i><ul class="pills unlist"><li class="pill transparent"><span class="label">Finezyjna</span></li></ul></section>
        </div>
        <section class="icon-row"><i></i><ul class="unlist targets pills"><li>CYWIL</li></ul></section>
      </div>`);

      it("6.0: pigułki do wiersza karty, nie do listy celów; przyciski na końcu karty", function () {
        const el = karta60();
        const lista = cardPillList(el);
        expect(lista?.classList.contains("targets"), "nie lista celów").to.equal(false);
        expect(lista?.closest(".chat-card"), "w karcie").to.not.equal(null);
        expect(cardPillLists(el)).to.have.length(1);
        expect(cardButtonHost(el)?.classList.contains("chat-card")).to.equal(true);
      });

      it("6.0 bez wierszy: własna lista na końcu `.chat-card`, a bez `create` — nic", function () {
        const el = fragment(`<div class="message-content"><div class="chat-card"><section class="card-header"></section></div></div>`);
        expect(cardPillList(el, { create: false })).to.equal(null);
        const lista = cardPillList(el);
        expect(lista?.parentElement?.classList.contains("chat-card")).to.equal(true);
        expect(cardPillList(el), "drugi raz ta sama lista").to.equal(lista);
      });

      it("nasza karta w kształcie 5.3: stopka i pasek przycisków mają pierwszeństwo", function () {
        const el = fragment(`<div class="message-content"><div class="dnd5e2 chat-card">
          <div class="card-buttons"></div><ul class="card-footer pills unlist"></ul></div></div>`);
        expect(cardPillList(el)?.classList.contains("card-footer")).to.equal(true);
        expect(cardButtonHost(el)?.classList.contains("card-buttons")).to.equal(true);
      });
    });

    // dnd5e 6.0 renderuje wiadomość typu `damage` wyłącznie swoim szablonem — `content` przepada. Dozownik miał w nim
    // przycisk „Rzuć RO” (trucizna, ST Kondycji, porażka = Zatrucie): teraz karta z przyciskiem i obrażenia osobno.
    describe("Dozownik: karta trucizny i obrażenia z tacką", function () {
      it("dwie wiadomości — karta z przyciskiem RO celu, potem obrażenia typu `damage`; cel bez żetonu nie trafia na tackę", async function () {
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} cel dozownika` });
        const strzelec = await scratchActor();
        const [bron] = await strzelec.createEmbeddedDocuments("Item", [{ name: `${SCRATCH_PREFIX} broń z dozownikiem`, type: "weapon" }]);
        const n0 = game.messages.size;
        await applyDose(bron, { name: cel.name, actor: cel, uuid: null, texture: { src: cel.img } });
        const nowe = game.messages.contents.slice(n0);
        try {
          expect(nowe, "dwie wiadomości").to.have.length(2);
          const [karta, obrazenia] = nowe;
          const pill = new DOMParser().parseFromString(karta.content, "text/html").querySelector(".neuro-poison-save");
          expect(pill?.dataset.actorUuid, "przycisk RO celu").to.equal(cel.uuid);
          expect(karta.type, "karta to zwykła wiadomość (treść się renderuje)").to.equal("base");
          expect(obrazenia.type).to.equal("damage");
          // Cel bez żetonu (tu: sam aktor) — bez deskryptora: tacka 6.0 czyta `.actor` z rozwiązanego uuid celu.
          expect(obrazenia.system.targets ?? [], "bez celu na tacce").to.have.length(0);
          expect(obrazenia.rolls[0]?.total).to.be.a("number");
          expect(bron.getFlag(MODULE_ID, "dozownik-dose") ?? 0, "doza zużyta").to.equal(0);
        } finally {
          await ChatMessage.deleteDocuments(nowe.map(m => m.id));
        }
      });
    });
  });
}
