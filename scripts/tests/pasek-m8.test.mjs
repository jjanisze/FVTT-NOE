/**
 * Neuroshima 5e — pasek M8 (PLAN_m8_ruch_i_ekonomia_akcji §8.3, E7; §11 T43).
 *
 * Warstwa 4 (prawdziwy pasek użytkownika w świecie testowym): makro zdolności zdjęte z paska ręcznie trafia na listę
 * usuniętych i synchronizacja go nie odtwarza; przeniesienie na inne pole to nie usunięcie; `restoreHotbar` przywraca
 * jawnie i czyści listę. Skrót przycisku panelu z paska wykonuje tę samą operację.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, waitFor } from "./helpers.mjs";
import { queueHotbarSync, restoreHotbar, FLAG_REMOVED } from "../actors/ability-hotbar.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ZDOLNOSC = "skuteczny-cios";

export function registerPasekM8Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.pasek-m8`, context => {
    const { describe, it, expect, after } = context;

    after(async () => { await scratchCleanup(); });

    describe("Usunięcia z paska zostają (warstwa 4)", function () {
      this.timeout(20000);

      it("T43: zdjęte makro zdolności nie wraca samo; przeniesienie nie jest usunięciem; przywrócenie jawne", async function () {
        const user = game.user;
        const przed = { ...(user.hotbar ?? {}) };
        const lista = user.getFlag(MODULE_ID, FLAG_REMOVED) ?? null;
        const cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Pasek M8` });
        await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === ZDOLNOSC))]);
        const pole = () => Number(Object.entries(user.hotbar ?? {}).find(([, id]) => game.macros.get(id)?.getFlag(MODULE_ID, "abilityId") === ZDOLNOSC)?.[0] ?? NaN);
        try {
          if (lista) await user.unsetFlag(MODULE_ID, FLAG_REMOVED);
          await queueHotbarSync(pc, { user });
          const s1 = pole();
          expect(Number.isFinite(s1), "makro na pasku po synchronizacji").to.equal(true);
          // Przeniesienie na wolne pole — nie usunięcie.
          const wolne = [...Array(50).keys()].map(i => i + 1).find(i => !user.hotbar?.[i]);
          await user.assignHotbarMacro(game.macros.get(user.hotbar[s1]), wolne, { fromSlot: s1 });
          expect(user.getFlag(MODULE_ID, FLAG_REMOVED) ?? [], "przeniesienie").to.not.include(ZDOLNOSC);
          // Zdjęcie z paska — na listę; synchronizacja go nie odtwarza.
          await user.assignHotbarMacro(null, pole());
          await waitFor(() => (user.getFlag(MODULE_ID, FLAG_REMOVED) ?? []).includes(ZDOLNOSC), { label: "zdolność na liście usuniętych" });
          await queueHotbarSync(pc, { user });
          expect(Number.isFinite(pole()), "nie wraca samo").to.equal(false);
          // Przywrócenie jawne: wraca, lista pusta.
          const w = await restoreHotbar(pc, user);
          expect(Number.isFinite(pole()), "przywrócone").to.equal(true);
          expect(w.added.length).to.be.at.least(1);
          expect(user.getFlag(MODULE_ID, FLAG_REMOVED) ?? []).to.not.include(ZDOLNOSC);
        } finally {
          const p = pole();
          const macroId = Number.isFinite(p) ? user.hotbar[p] : null;
          for (const [slot, id] of Object.entries(user.hotbar ?? {})) {
            if (id && !(slot in przed)) await user.update({ [`hotbar.${slot}`]: _del });
          }
          const m = macroId ? game.macros.get(macroId) : null;
          if (m) await m.delete();
          // Sprzątanie też jest „usunięciem” — zapis listy idzie w tle; przywróć ją dopiero po nim.
          await new Promise(res => setTimeout(res, 300));
          if (lista) await user.setFlag(MODULE_ID, FLAG_REMOVED, lista);
          else if (user.getFlag(MODULE_ID, FLAG_REMOVED)) await user.unsetFlag(MODULE_ID, FLAG_REMOVED);
        }
      });
    });
  });
}
