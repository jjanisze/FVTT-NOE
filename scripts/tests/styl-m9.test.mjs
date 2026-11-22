/**
 * Neuroshima 5e — kontrakt stylu M9 (PLAN_m9_style.md §8.3, warstwa 5).
 *
 * Dla powierzchni w zakresie (D12/D13): element główny ma `.noe.themed.theme-dark` także przy
 * jasnym interfejsie; żaden widoczny element nie liczy kroju Modesto, Amiri ani Roboto Slab;
 * brak widocznej ramki `.gold-icon`, tła z `ui/official/banner-` i filtra na karcie PC.
 * Rdzeń zostaje nietknięty: sidebar i dziennik czatu nie mają `.noe`.
 *
 * Plus czyste predykaty projekcji wiersza (`sheet-rows.mjs`): koszt, zdolność mieszana,
 * ostrzeżenie budżetu bez skosu, zakaz ze skosem, 0 użyć z powodem.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup, waitFor } from "./helpers.mjs";
import { __testing as rows } from "../ui/sheet-rows.mjs";
import { costOf, costSign, badge, glyph, meter, counter } from "../ui/noe.mjs";

const BANNED_FONTS = /modesto|amiri|roboto slab/i;

/** Widoczne elementy okna, z pominięciem ukrytych zakładek. */
function visible(root) {
  return [...root.querySelectorAll("*")].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
}

function contract(expect, root, label) {
  expect(root.classList.contains("noe"), `${label}: .noe`).to.equal(true);
  expect(root.classList.contains("themed"), `${label}: .themed`).to.equal(true);
  expect(root.classList.contains("theme-dark"), `${label}: .theme-dark`).to.equal(true);
  expect(root.classList.contains("theme-light"), `${label}: bez .theme-light`).to.equal(false);
  const fonts = visible(root).filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
    .map(el => getComputedStyle(el).fontFamily).filter(f => BANNED_FONTS.test(f.split(",")[0]));
  expect(fonts, `${label}: kroje spoza D11`).to.deep.equal([]);
  const framed = visible(root).filter(el => el.matches(".gold-icon")).filter(el => {
    const cs = getComputedStyle(el);
    return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
  });
  expect(framed.length, `${label}: ramki .gold-icon`).to.equal(0);
  const banners = [root, root.querySelector(".window-content")].filter(Boolean)
    .flatMap(el => [getComputedStyle(el).backgroundImage, getComputedStyle(el, "::before").backgroundImage])
    .filter(bg => bg.includes("ui/official/banner-"));
  expect(banners, `${label}: stockowy baner 5e`).to.deep.equal([]);
}

export function registerStylM9Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.styl-m9`, context => {
    const { describe, it, expect, after, before } = context;
    after(() => scratchCleanup());

    describe("Pomocniki komponentów (scripts/ui/noe.mjs)", function () {
      it("koszt: aktywacja dnd5e → A/B/R/I, inne czasy bez figury", function () {
        expect(costOf("action")).to.equal("a");
        expect(costOf("bonus")).to.equal("b");
        expect(costOf("reaction")).to.equal("r");
        expect(costOf("minute")).to.equal(null);
        expect(costOf(null)).to.equal(null);
      });
      it("znak kosztu ma figurę i literę (kolor nigdy sam)", function () {
        const html = costSign("b", { count: "0/1" });
        expect(html).to.include('data-cost="b"').and.to.include(">B<").and.to.include("0/1");
      });
      it("skos tylko na opakowaniu glifu; glif bez przyciemnienia", function () {
        expect(glyph("x.webp", { unavailable: true })).to.include("noe-glyph is-unavailable");
        expect(glyph("x.webp")).to.not.include("is-unavailable");
        expect(glyph("x.webp")).to.not.include("opacity");
      });
      it("plakietki mają tekst; nieznany stan to „Brak danych”", function () {
        expect(badge("on")).to.include("WŁ.");
        expect(badge("unknown")).to.include("Brak danych");
        expect(() => badge("nieistniejacy")).to.throw();
      });
      it("miernik: szerokość jako zmienna, bez koloru inline", function () {
        const html = meter(12, 37, { kind: "pw" });
        expect(html).to.include("--noe-meter-pct:32.4%");
        expect(html).to.not.match(/style="[^"]*(color|background)/);
        expect(counter(0, 3)).to.include("/3");
      });
    });

    describe("Projekcja wiersza (scripts/ui/sheet-rows.mjs)", function () {
      let actor;
      const item = async (name, activations, uses = null) => {
        const activities = Object.fromEntries(activations.map((type, i) => {
          const id = foundry.utils.randomID();
          return [id, { _id: id, type: "utility", name: `${name} ${i}`, activation: { type } }];
        }));
        const [made] = await actor.createEmbeddedDocuments("Item", [{
          name: `${SCRATCH_PREFIX} ${name}`, type: "feat",
          system: { activities, ...(uses ? { uses } : {}) }
        }], { render: false });
        return made;
      };

      it("jeden koszt → znak przy rodzicu", async function () {
        actor = await scratchActor({ name: `${SCRATCH_PREFIX} Styl M9` });
        const feat = await item("Pojedynczy", ["bonus"]);
        const r = rows.projectRow(feat);
        expect(r.costs.map(c => c.cost)).to.deep.equal(["b"]);
        expect(r.mixed).to.equal(false);
        expect(r.unavailable).to.equal(false);
      });
      it("kilka kosztów → brak jednej mylącej litery przy rodzicu", async function () {
        const feat = await item("Mieszany", ["action", "bonus"]);
        const r = rows.projectRow(feat);
        expect(r.costs).to.deep.equal([]);
        expect(r.mixed).to.equal(true);
      });
      it("brak aktywności → brak kosztu i brak skosu (pasywności nie zgadujemy)", async function () {
        const feat = await item("Stały", []);
        const r = rows.projectRow(feat);
        expect(r.costs).to.deep.equal([]);
        expect(r.unavailable).to.equal(false);
        expect(r.notes).to.deep.equal([]);
      });
      it("0 użyć → skos i powód z terminem odnowienia", async function () {
        const feat = await item("Wyczerpany", ["reaction"], { max: "1", spent: 1, recovery: [{ period: "sr", type: "recoverAll" }] });
        const r = rows.projectRow(feat);
        expect(r.unavailable).to.equal(true);
        expect(r.notes.map(n => n.text).join(" ")).to.include("Brak użyć").and.to.include("krótki odpoczynek");
      });
      it("wydana pula M8 → ostrzeżenie, bez skosu i bez blokady", async function () {
        const feat = await item("Budżet", ["bonus"]);
        const r = rows.projectRow(feat, { budget: { pule: { B: { pozostalo: 0, pojemnosc: 1 } } } });
        expect(r.unavailable).to.equal(false);
        expect(r.notes.map(n => n.kind)).to.deep.equal(["warn"]);
      });
      it("zakaz M8 → skos i powód", async function () {
        const feat = await item("Zakaz", ["reaction"]);
        const r = rows.projectRow(feat, { budget: { pule: { R: { pozostalo: 1, pojemnosc: 1, zakaz: "Zranienie" } } } });
        expect(r.unavailable).to.equal(true);
        expect(r.notes[0].text).to.include("Zranienie");
      });
    });

    describe("Wymuszony ciemny motyw i zakres (D12, D13)", function () {
      let lightBefore;
      before(async function () {
        lightBefore = game.settings.get("core", "uiConfig");
        // Jasny interfejs na czas testu: okna NOE mają zostać ciemne mimo to.
        await game.settings.set("core", "uiConfig", foundry.utils.mergeObject(foundry.utils.deepClone(lightBefore), { colorScheme: { applications: "light", interface: "light" } }));
      });
      after(async function () {
        if (lightBefore) await game.settings.set("core", "uiConfig", lightBefore);
      });

      it("karta PC: zakres, kroje, bez złotych ramek, bez stockowego banera, bez filtra", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Karta M9`, type: "character" });
        await pc.createEmbeddedDocuments("Item", [{ name: `${SCRATCH_PREFIX} Nóż`, type: "weapon" }], { render: false });
        const sheet = pc.sheet;
        await sheet.render({ force: true });
        await waitFor(() => sheet.rendered && sheet.element?.querySelector(".items-section"), { label: "karta PC" });
        try {
          contract(expect, sheet.element, "karta PC");
          expect(getComputedStyle(sheet.element).filter).to.equal("none");
          const banner = getComputedStyle(sheet.element.querySelector(".window-content"), "::before").backgroundImage;
          expect(banner).to.include("ui/noe/banners/pc.webp");
        } finally { await sheet.close(); }
      });

      it("karta przedmiotu (natywny ItemSheet dnd5e)", async function () {
        const pc = game.actors.find(a => a.name === `${SCRATCH_PREFIX} Karta M9`);
        const weapon = pc.items.find(i => i.type === "weapon");
        const sheet = weapon.sheet;
        await sheet.render({ force: true });
        await waitFor(() => sheet.rendered, { label: "karta przedmiotu" });
        try { contract(expect, sheet.element, "karta przedmiotu"); } finally { await sheet.close(); }
      });

      it("rama rdzenia bez .noe: sidebar, dziennik czatu, pasek makr", function () {
        for (const sel of ["#sidebar", "#chat", ".chat-log", "#hotbar", "#players", "#notifications"]) {
          const el = document.querySelector(sel);
          if (!el) continue;
          expect(el.classList.contains("noe"), `${sel} nie jest w zakresie`).to.equal(false);
          expect(el.closest(".noe"), `${sel} nie leży w .noe`).to.equal(null);
        }
      });
    });
  });
}
