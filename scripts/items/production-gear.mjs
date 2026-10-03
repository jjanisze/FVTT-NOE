/** Reusable compendium prototypes for former `raw:` production outputs. */
import { KATALOG } from "../config/recipes-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ICON_ROOT = `modules/${MODULE_ID}/icons/items/loot`;

export const PRODUCTION_GEAR = Object.freeze({
  akumulator: Object.freeze({
    id: "akumulator",
    icon: "akumulator.svg",
    description: "Akumulator 24 V. Zasila urządzenia; zgodnie z podręcznikiem wystarcza dronowi średniemu na 1 godzinę pracy, a małemu na 4 godziny."
  }),
  agregat: Object.freeze({
    id: "agregat",
    icon: "agregat.svg",
    description: "Przenośny agregat prądotwórczy. Może zasilać urządzenia i maszyny; zużycie paliwa oraz podłączenie rozstrzyga MG."
  }),
  alternator: Object.freeze({
    id: "alternator",
    icon: "alternator.svg",
    description: "Samochodowy alternator — część układu ładowania i przydatny podzespół naprawczy."
  }),
  defibrylator: Object.freeze({
    id: "defibrylator",
    icon: "defibrylator.svg",
    description: "Przenośny defibrylator z elektrodami. Szczegółowe zastosowanie podczas gry rozstrzyga MG."
  }),
  "detektor-ruchu": Object.freeze({
    id: "detektor-ruchu", icon: "detektor_ruchu.svg",
    description: "Przenośny detektor ruchu do obserwacji najbliższego otoczenia."
  }),
  "komputer-osobisty": Object.freeze({
    id: "komputer-osobisty", icon: "komputer_osobisty.svg",
    description: "Stacjonarny komputer osobisty z monitorem."
  }),
  "komputer-gamingowy": Object.freeze({
    id: "komputer-gamingowy", icon: "komputer_gamingowy.svg",
    description: "Wydajny komputer stacjonarny z monitorem."
  }),
  kontroler: Object.freeze({
    id: "kontroler", icon: "kontroler_zdalnego_sterowania.svg",
    description: "Radiowy kontroler zdalnego sterowania o zasięgu 100 metrów."
  }),
  "miernik-skazenia": Object.freeze({
    id: "miernik-skazenia", icon: "miernik_skazenia_chemicznego.svg",
    description: "Przenośny miernik skażenia chemicznego z sondą."
  }),
  "wykrywacz-metalu": Object.freeze({
    id: "wykrywacz-metalu", icon: "wykrywacz_metalu.svg",
    description: "Ręczny wykrywacz metalu z cewką poszukiwawczą."
  }),
  palnik: Object.freeze({
    id: "palnik", icon: "palnik_acetylenowo_tlenowy.svg",
    description: "Palnik acetylenowo-tlenowy z przewodami i butlami gazowymi."
  }),
  "srodek-usypiajacy": Object.freeze({
    id: "srodek-usypiajacy", icon: "srodek_usypiajacy.svg",
    description: "Fiolka środka usypiającego. Szczegółowe zastosowanie podczas gry rozstrzyga MG."
  }),
  "srodki-dezynfekujace": Object.freeze({
    id: "srodki-dezynfekujace", icon: "srodki_dezynfekujace.svg",
    description: "Jeden litr środków dezynfekujących."
  }),
  paralotnia: Object.freeze({
    id: "paralotnia", ref: "tabela:paralotnia", icon: "paralotnia.svg",
    description: "Lekka paralotnia wykonana z materiałów dostępnych na Pustkowiach."
  }),
  "adapter-wifi": Object.freeze({
    id: "adapter-wifi", ref: "tabela:adapter-wifi", icon: "adapter_wifi.svg",
    description: "Zewnętrzny adapter sieci bezprzewodowej ze złączem USB."
  }),
  monitorek: Object.freeze({
    id: "monitorek", ref: "tabela:monitorek", icon: "monitorek.svg",
    description: "Niewielki przenośny monitor w odpornej obudowie."
  }),
  router: Object.freeze({
    id: "router", ref: "tabela:router", icon: "router.svg",
    description: "Router sieci bezprzewodowej z dwiema antenami."
  })
});

export function productionGearRef(id) {
  const def = PRODUCTION_GEAR[id];
  return def?.ref ?? (def ? `raw:${id}` : null);
}

export function productionGearIdForRef(ref) {
  return Object.keys(PRODUCTION_GEAR).find(id => productionGearRef(id) === ref) ?? null;
}

export function buildProductionGearItemData(id) {
  const def = PRODUCTION_GEAR[id];
  const ref = productionGearRef(id);
  const catalog = KATALOG.get(ref);
  if (!def || !catalog) throw new Error(`Unknown production gear: ${id}`);
  return {
    name: catalog.nazwa,
    type: "loot",
    img: `${ICON_ROOT}/${def.icon}`,
    system: {
      quantity: 1,
      weight: { value: catalog.waga, units: "kg" },
      price: { value: catalog.cena, denomination: "gb" },
      description: { value: `<p>${def.description}</p><p><em>${catalog.s ? `NOE s. ${catalog.s}.` : "Tabela profesji; cena wyliczona z surowców."}</em></p>` }
    },
    flags: { [MODULE_ID]: { productionGearId: id, produktZastepczy: ref } }
  };
}
