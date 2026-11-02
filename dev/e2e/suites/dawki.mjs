/**
 * Suite — podanie leku innej postaci (PLAN_beta krok 8a, D18). GM i jeden gracz; każdy krok tak, jak przy stole.
 *
 *  - GM: PC Gracz 1 i PC Gracz 2 chorują na Niewydolność krążenia; PC Gracz 3 (dawca, gracz nieobecny — kieruje MG) ma
 *    Pana Plastra i dwie Aspiryny K.
 *  - MG klika „Podaj” przy Aspirynie dawcy, wybiera PC Gracz 1 → u Gracza 1 okno „Lekarstwo” bez nazwy Sztuczki →
 *    Przyjmij → zapas dawcy 1,5 (pół dawki), PC Gracz 1 ma dzisiejszą dawkę, karta na czacie.
 *  - Ten sam lek dla PC Gracz 2 (gracz offline — okno dostaje MG) → Odmów → nic się nie zmienia.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: choroby, dawca z Panem Plastrem i lekiem. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const hp = await import(`/modules/${MOD}/scripts/actors/health-panel.mjs`);
  const [p1, p2, p3] = ["PC Gracz 1", "PC Gracz 2", "PC Gracz 3"].map(n => game.actors.getName(n));
  for (const p of [p1, p2]) await hp.addDisease(p, "niewydolnoscKrazenia");
  const docs = async pack => game.packs.get(`${MOD}.${pack}`).getDocuments();
  const lek = (await docs("lekarstwa")).find(d => d.getFlag(MOD, "chemiaKey") === "aspirynaK");
  const plaster = (await docs("sztuczki")).find(d => d.getFlag(MOD, "sztuczka") === "panPlaster");
  const dane = game.items.fromCompendium(lek);
  dane.system.quantity = 2;
  const [item] = await p3.createEmbeddedDocuments("Item", [dane, game.items.fromCompendium(plaster)]);
  return { dawca: p3.uuid, itemId: item.id, zapas: hp.dosesRemaining(p3.items.get(item.id)) };
}

/**
 * GM: „Podaj” przy leku dawcy, wybór pacjenta w oknie, przycisk Podaj. `odpowiedzMG` — gdy okno pacjenta trafia do
 * MG (gracz nieobecny), odpowiada w tym samym wywołaniu: drugie równoległe `eval` na tej samej stronie czeka w kolejce.
 */
async function podaj({ dawca, itemId, pacjent, odpowiedzMG = null }) {
  const MOD = "neuroshima-2026-overrides";
  const { oknoPodajDawke } = await import(`/modules/${MOD}/scripts/actors/podaj-dawke.mjs`);
  const d = await fromUuid(dawca);
  const p = oknoPodajDawke(d, d.items.get(itemId));
  const okno = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(a => a.rendered && a.options?.window?.title?.startsWith("Podaj")), { message: "the patient picker" });
  const sel = okno.element.querySelector("select[name=pacjent]");
  const opt = [...sel.options].find(o => o.textContent.startsWith(pacjent));
  sel.value = opt.value;
  const opcje = [...sel.options].map(o => o.textContent);
  okno.element.querySelector('button[data-action="ok"]').click();
  let tresc = null;
  if (odpowiedzMG !== null) {
    const lek = await window.__e2e.until(() => [...foundry.applications.instances.values()]
      .find(a => a.rendered && a.options?.window?.title === "Lekarstwo"), { message: "the patient's dialog at the GM" });
    tresc = lek.element.querySelector(".window-content")?.textContent ?? "";
    lek.element.querySelector(`button[data-action="${odpowiedzMG ? "yes" : "no"}"]`).click();
  }
  await p;
  return { opcje, tresc };
}

/** Odpowiedzialny klient: okno „Lekarstwo” → Przyjmij / Odmów; treść okna do sprawdzenia. */
async function odpowiedz({ przyjmij }) {
  const okno = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(a => a.rendered && a.options?.window?.title === "Lekarstwo"), { message: "the patient's dialog" });
  const tresc = okno.element.querySelector(".window-content")?.textContent ?? "";
  okno.element.querySelector(`button[data-action="${przyjmij ? "yes" : "no"}"]`).click();
  return { tresc };
}

/** GM: zapas dawcy i dzisiejsza dawka pacjenta. */
async function stan({ dawca, itemId, pacjent }) {
  const MOD = "neuroshima-2026-overrides";
  const hp = await import(`/modules/${MOD}/scripts/actors/health-panel.mjs`);
  const d = await fromUuid(dawca);
  const p = game.actors.getName(pacjent);
  return {
    zapas: hp.dosesRemaining(d.items.get(itemId)),
    dzis: hp.dosedToday(hp.getChoroby(p)[0]),
    karta: game.messages.contents.some(m => m.getFlag(MOD, "dosePodana")?.pacjent === p.id)
  };
}

export default {
  name: "dawki",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    let fx;
    await t.step("GM: PC Gracz 1 and 2 have a chronic disease; PC Gracz 3 carries Pan Plaster and two Aspiryna K", async () => {
      fx = await t.gm.eval(przygotuj);
      t.equal(fx.zapas, 2, "two doses before");
    });

    await t.step("GM gives a dose to PC Gracz 1 → Gracz 1 accepts → half a dose off the giver's stock, patient dosed today", async () => {
      const wybor = t.gm.eval(podaj, { dawca: fx.dawca, itemId: fx.itemId, pacjent: "PC Gracz 1" });
      const okno = await p1.eval(odpowiedz, { przyjmij: true });
      const lista = await wybor;
      t.assert(lista.opcje.some(o => o.startsWith("PC Gracz 1")) && lista.opcje.some(o => o.startsWith("PC Gracz 2")), "both patients offered", lista);
      t.assert(okno.tresc.includes("PC Gracz 3") && okno.tresc.includes("Aspiryna"), "the dialog names giver and medicine", okno);
      t.assert(!/plaster/i.test(okno.tresc), "no mention of the Sztuczka", okno);
      const s = await t.waitFor(t.gm, a => {
        const MOD = "neuroshima-2026-overrides";
        return game.messages.contents.some(m => m.getFlag(MOD, "dosePodana")) ? true : null;
      }, { args: [{}], message: "the dose card" });
      t.assert(s, "dose card");
      const po = await t.gm.eval(stan, { dawca: fx.dawca, itemId: fx.itemId, pacjent: "PC Gracz 1" });
      t.equal(po.zapas, 1.5, "half a dose used (Pan Plaster)");
      t.equal(po.dzis, true, "PC Gracz 1 dosed today");
    });

    await t.step("Offer to PC Gracz 2 (player offline → the GM answers) → refuse → nothing changes", async () => {
      const okno = await t.gm.eval(podaj, { dawca: fx.dawca, itemId: fx.itemId, pacjent: "PC Gracz 2", odpowiedzMG: false });
      t.assert(okno.tresc?.includes("PC Gracz 2"), "the GM's dialog names the patient", okno);
      const po = await t.gm.eval(stan, { dawca: fx.dawca, itemId: fx.itemId, pacjent: "PC Gracz 2" });
      t.equal(po.zapas, 1.5, "stock unchanged");
      t.equal(po.dzis, false, "PC Gracz 2 not dosed");
      t.equal(po.karta, false, "no card");
    });
  }
};
