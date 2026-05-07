/**
 * Neuroshima 5e — skill overrides.
 * Replaces the stock dnd5e skill list with 18 Neuroshima skills.
 * Labels are direct Polish strings — no i18n indirection (Polish-only game).
 * Ability key mapping: str=SIŁ, dex=ZRC, con=KON, int=INT, wis=MDR, cha=CHA
 */
export function registerSkills() {
  CONFIG.DND5E.skills = {
    akr: {
      label: "Akrobatyka",
      ability: "dex",
      fullKey: "akrobatyka",
      icon: "icons/equipment/feet/shoes-simple-leaf-green.webp"
    },
    atl: {
      label: "Atletyka",
      ability: "str",
      fullKey: "atletyka",
      icon: "icons/magic/control/buff-strength-muscle-damage-orange.webp"
    },
    his: {
      label: "Historia",
      ability: "int",
      fullKey: "historia",
      icon: "icons/sundries/books/book-embossed-bound-brown.webp"
    },
    int: {
      label: "Intuicja",
      ability: "wis",
      fullKey: "intuicja",
      icon: "icons/magic/perception/orb-crystal-ball-scrying-blue.webp"
    },
    med: {
      label: "Medycyna",
      ability: "int",
      fullKey: "medycyna",
      icon: "icons/tools/cooking/mortar-herbs-yellow.webp"
    },
    osz: {
      label: "Oszustwo",
      ability: "cha",
      fullKey: "oszustwo",
      icon: "icons/magic/control/mouth-smile-deception-purple.webp"
    },
    prc: {
      label: "Percepcja",
      ability: "wis",
      fullKey: "percepcja",
      icon: "icons/magic/perception/eye-ringed-glow-angry-small-red.webp"
    },
    per: {
      label: "Perswazja",
      ability: "cha",
      fullKey: "perswazja",
      icon: "icons/skills/social/diplomacy-handshake.webp"
    },
    poj: {
      label: "Pojazdy",
      ability: "wis",
      fullKey: "pojazdy",
      icon: "icons/commodities/tech/wheel-cog-gold.webp"
    },
    prz: {
      label: "Przyroda",
      ability: "int",
      fullKey: "przyroda",
      icon: "icons/magic/nature/tree-growth-green.webp"
    },
    skr: {
      label: "Skradanie się",
      ability: "dex",
      fullKey: "skradanie",
      icon: "icons/magic/perception/shadow-stealth-eyes-purple.webp"
    },
    sur: {
      label: "Survival",
      ability: "wis",
      fullKey: "survival",
      icon: "icons/magic/nature/leaf-glow-triple-green.webp"
    },
    sle: {
      label: "Śledztwo",
      ability: "int",
      fullKey: "sledztwo",
      icon: "icons/tools/scribal/magnifying-glass.webp"
    },
    tch: {
      label: "Technika",
      ability: "int",
      fullKey: "technika",
      icon: "icons/tools/smithing/wrench-steel-grey.webp"
    },
    tre: {
      label: "Tresura",
      ability: "wis",
      fullKey: "tresura",
      icon: "icons/environment/creatures/horse-brown.webp"
    },
    wys: {
      label: "Występy",
      ability: "cha",
      fullKey: "wystepy",
      icon: "icons/skills/social/wave-halt-stop.webp"
    },
    zas: {
      label: "Zastraszanie",
      ability: "cha",
      fullKey: "zastraszanie",
      icon: "icons/skills/social/intimidation-impressing.webp"
    },
    zwi: {
      label: "Zwinne dłonie",
      ability: "dex",
      fullKey: "zwinne_dlonie",
      icon: "icons/skills/melee/hand-grip-sword-white.webp"
    }
  };

  console.log("Neuroshima 5e | Skills overridden (18 Neuroshima skills)");
}
