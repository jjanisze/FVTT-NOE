/** Approved native glyphs for trait UI. Sleight of Hand awaits its final design. */
const ROOT = "modules/neuroshima-2026-overrides/icons";
const ability = name => `${ROOT}/abilities/${name}.svg`;

export const ARMOR_PROFICIENCY_ICONS = {
  lgt: `${ROOT}/armor/pancerz-skorzany.svg`,
  med: `${ROOT}/armor/kamizelka-taktyczna.svg`,
  hvy: `${ROOT}/armor/pancerz-kompozytowy.svg`,
  shl: `${ROOT}/armor/tarcza.svg`
};

export const WEAPON_PROFICIENCY_ICONS = Object.fromEntries(Object.entries({
  biala: "machete", miotana: "javelin", palnaKrotka: "semi_auto_pistol",
  palnaPosr: "submachinegun", palnaDluga: "bolt_action_rifle",
  palnaCiezka: "heavy_machine_gun", specjalna: "flamethrower"
}).map(([key, file]) => [key, `${ROOT}/weapons/${file}.svg`]));

export const SKILL_ICONS = {
  akr: ability("sportowiec"),
  atl: ability("sportowiec"),
  his: `${ROOT}/proficiencies/historia.svg`,
  int: `${ROOT}/proficiencies/intuicja.svg`,
  med: `${ROOT}/items/drugs/medpak.svg`,
  osz: ability("szybka-gadka"),
  prc: ability("wyczulone-zmysly"),
  per: ability("dobra-rada"),
  poj: `${ROOT}/proficiencies/pojazdy.svg`,
  prz: ability("moj-biom"),
  skr: ability("cichy-krok"),
  sur: `${ROOT}/items/loot/kompas.svg`,
  sle: `${ROOT}/weapons/magnifying_glass.svg`,
  tch: `${ROOT}/weapons/klucz_francuski.svg`,
  tre: ability("oswajanie-zwierzat"),
  wys: ability("muzyk"),
  zas: `${ROOT}/proficiencies/zastraszanie.svg`,
  zwi: `${ROOT}/items/loot/zetony.svg`
};

export const TRAIT_CATEGORY_ICONS = {
  armor: ARMOR_PROFICIENCY_ICONS.med,
  weapon: ability("szkolenie-w-broni"),
  tool: `${ROOT}/weapons/klucz_francuski.svg`,
  skills: `${ROOT}/proficiencies/umiejetnosci.svg`,
  saves: `${ROOT}/proficiencies/rzuty-obronne.svg`
};

export const MIXED_TRAIT_ICON = TRAIT_CATEGORY_ICONS.skills;
export const toolProficiencyIcon = key => `${ROOT}/tools/${key}.svg`;
