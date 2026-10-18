/**
 * Neuroshima 5e — skill overrides.
 * Replaces the stock dnd5e skill list with 18 Neuroshima skills.
 * Labels are direct Polish strings — no i18n indirection (Polish-only game).
 * Ability key mapping: str=SIŁ, dex=ZRC, con=KON, int=INT, wis=MDR, cha=CHA
 */
import { SKILL_ICONS } from "./proficiency-icons-data.mjs";

export function registerSkills() {
  CONFIG.DND5E.skills = {
    akr: {
      label: "Akrobatyka",
      ability: "dex",
      fullKey: "akrobatyka",
      icon: SKILL_ICONS.akr
    },
    atl: {
      label: "Atletyka",
      ability: "str",
      fullKey: "atletyka",
      icon: SKILL_ICONS.atl
    },
    his: {
      label: "Historia",
      ability: "int",
      fullKey: "historia",
      icon: SKILL_ICONS.his
    },
    int: {
      label: "Intuicja",
      ability: "wis",
      fullKey: "intuicja",
      icon: SKILL_ICONS.int
    },
    med: {
      label: "Medycyna",
      ability: "int",
      fullKey: "medycyna",
      icon: SKILL_ICONS.med
    },
    osz: {
      label: "Oszustwo",
      ability: "cha",
      fullKey: "oszustwo",
      icon: SKILL_ICONS.osz
    },
    prc: {
      label: "Percepcja",
      ability: "wis",
      fullKey: "percepcja",
      icon: SKILL_ICONS.prc
    },
    per: {
      label: "Perswazja",
      ability: "cha",
      fullKey: "perswazja",
      icon: SKILL_ICONS.per
    },
    poj: {
      label: "Pojazdy",
      ability: "wis",
      fullKey: "pojazdy",
      icon: SKILL_ICONS.poj
    },
    prz: {
      label: "Przyroda",
      ability: "int",
      fullKey: "przyroda",
      icon: SKILL_ICONS.prz
    },
    skr: {
      label: "Skradanie się",
      ability: "dex",
      fullKey: "skradanie",
      icon: SKILL_ICONS.skr
    },
    sur: {
      label: "Survival",
      ability: "wis",
      fullKey: "survival",
      icon: SKILL_ICONS.sur
    },
    sle: {
      label: "Śledztwo",
      ability: "int",
      fullKey: "sledztwo",
      icon: SKILL_ICONS.sle
    },
    tch: {
      label: "Technika",
      ability: "int",
      fullKey: "technika",
      icon: SKILL_ICONS.tch
    },
    tre: {
      label: "Tresura",
      ability: "wis",
      fullKey: "tresura",
      icon: SKILL_ICONS.tre
    },
    wys: {
      label: "Występy",
      ability: "cha",
      fullKey: "wystepy",
      icon: SKILL_ICONS.wys
    },
    zas: {
      label: "Zastraszanie",
      ability: "cha",
      fullKey: "zastraszanie",
      icon: SKILL_ICONS.zas
    },
    zwi: {
      label: "Zwinne dłonie",
      ability: "dex",
      fullKey: "zwinne_dlonie",
      icon: SKILL_ICONS.zwi
    }
  };

  console.log("Neuroshima 5e | Skills overridden (18 Neuroshima skills)");
}
