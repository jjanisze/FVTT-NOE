import { startBleeding } from "../../combat/bleeding.mjs";

/**
 * "Rozrywająca" weapon-save property — WKK-only, no RAW basis. Dum-dum ammunition
 * (`wkk/config/ammo-data.mjs`, `.44 Mag (dum-dum)`) grants it. Spliced into
 * `SAVE_PROPERTIES` by `combat/weapon-save-properties.mjs` — see that file's header
 * comment for the shared shape and the other three (RAW) properties.
 *
 * "Każda istota żywa trafiona pociskiem dum-dum, która nie posiada redukcji, odporności
 * lub niewrażliwości na obrażenia kłute…" — obie klauzule wprost z tekstu naboju.
 */
export const ROZRYWAJACA = {
  label: "Rozrywająca",
  ability: "con",
  status: "bleeding",
  statusLabel: "Krwawienie",
  dc: { mode: "fixed", value: 14 },
  sizes: null,
  alternativeToDamage: false,
  icon: "fa-droplet",
  color: "#c0392b",
  exemptDamageType: "piercing",
  exemptCreatureTypes: ["maszyna"],
  // Krwawienie ma własny cykl i profil; samo przełączenie statusu zostawiłoby ikonę na
  // tokenie i nie zadałoby ani jednego punktu obrażeń.
  onFail: actor => startBleeding(actor, { profile: "dumdum", reason: "pocisk dum-dum" }),
};
