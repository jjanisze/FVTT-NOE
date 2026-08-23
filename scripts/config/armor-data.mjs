/**
 * Neuroshima 5e — definicje pancerzy.
 *
 * Źródło prawdy: `Tabele/Pancerz.md` (17 pozycji).
 * Plik karmi kompendium `pancerze`, generator `createArmors()` oraz reguły
 * w `actors/armor-rules.mjs`.
 *
 * Mapowanie na dnd5e — świadome decyzje, nie skróty:
 *
 * - Kategorie zostają na natywnych kluczach `light` / `medium` / `heavy` /
 *   `shield`. `CONFIG.DND5E.armorTypes` bramkuje całe liczenie TT
 *   (`data/actor/templates/attributes.mjs`), więc wymyślanie własnych kluczy
 *   wyłączyłoby pancerze z mechaniki. Zmieniamy wyłącznie etykiety.
 * - Akcesoria (hełm, ochraniacze) to `trinket`, bo dnd5e liczy najwyżej jeden
 *   pancerz i jedną tarczę. Ich bonus do TT jedzie Efektem Aktywnym na
 *   `system.attributes.ac.bonus`, który dnd5e wygasza, gdy przedmiot jest zdjęty.
 * - „maks. ZRC" to natywne `system.armor.dex`. Ciężkie pancerze dostają dex 0
 *   od systemu z samego `type.value === "heavy"`.
 * - „Utrudnienie" w kolumnie Skradanie to natywna właściwość
 *   `stealthDisadvantage` — dnd5e sam ustawia tryb rzutu dla Skradania się.
 *   Pływania (Atletyka) już nie obejmuje, więc ląduje w `manual`.
 * - Wymagana SIŁA to natywne `system.strength`, ale dnd5e 5.3 nic z nim nie
 *   robi — karę Szybkości −4,5 m dokłada `actors/armor-rules.mjs`.
 *
 * Pola wpisu:
 *   id, name, cat        — kategoria z tabeli (do folderów i opisu)
 *   armorType            — klucz CONFIG.DND5E.armorTypes / equipmentTypes
 *   ac                   — bazowa TT (`system.armor.value`)
 *   acBonus              — bonus do TT przez Efekt Aktywny (akcesoria)
 *   dex                  — limit mod. ZRC albo null
 *   strength             — wymagana SIŁA albo null
 *   stealth              — null | "dis" (Utrudnienie) | "none" (Niemożliwe)
 *   dt                   — próg obrażeń (tylko cięte/kłute/obuchowe)
 *   kinetic              — odporność kinetyczna
 *   sealed               — szczelność
 *   donTime              — akcje na założenie/ściągnięcie
 *   weight, price, avail
 *   note, manual
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Typy obrażeń objęte progiem i odpornością kinetyczną. */
export const KINETIC_DAMAGE_TYPES = Object.freeze(["slashing", "piercing", "bludgeoning"]);

/** Kara Szybkości za zbyt niską SIŁĘ, w metrach. */
export const LOW_STRENGTH_SPEED_PENALTY = 4.5;

export const ARMORS = [
  /* ---- Lekkie pancerze (1 akcja) ---- */
  {
    id: "kurtka-cwiekowana", name: "Kurtka ćwiekowana", cat: "Lekki", armorType: "light",
    ac: 11, dex: null, strength: null, stealth: null, donTime: 1,
    weight: 3, price: 30, avail: 70,
    note: "Skóra naszywana ćwiekami i kapslami. Nie krępuje ruchów."
  },
  {
    id: "plate-carrier-i", name: "Plate carrier typ I", cat: "Lekki", armorType: "light",
    ac: 12, dex: null, strength: null, stealth: null, donTime: 1,
    weight: 5, price: 70, avail: 40,
    note: "Kamizelka nośna z lekkimi płytami. Wojskowy standard sprzed Wojny."
  },
  {
    id: "pancerz-skorzany", name: "Pancerz skórzany", cat: "Lekki", armorType: "light",
    ac: 12, dex: null, strength: 10, stealth: null, donTime: 1,
    weight: 7, price: 50, avail: 70,
    note: "Gruba, utwardzana skóra — często z mutanta."
  },
  {
    id: "koscianiy-pancerz", name: "Kościany pancerz", cat: "Lekki", armorType: "light",
    ac: 12, dex: null, strength: 12, stealth: "dis", donTime: 1,
    weight: 10, price: 40, avail: 30,
    note: "Płyty z kości i pancerzy potworów, spięte rzemieniami. Grzechocze."
  },
  {
    id: "plate-carrier-ii", name: "Plate carrier typ II", cat: "Lekki", armorType: "light",
    ac: 13, dex: null, strength: 13, stealth: "dis", donTime: 1,
    weight: 9, price: 90, avail: 30,
    note: "Cięższe płyty balistyczne w kamizelce nośnej."
  },

  /* ---- Średnie pancerze (2 akcje) ---- */
  {
    id: "plate-carrier-iii", name: "Plate carrier typ III", cat: "Średni", armorType: "medium",
    ac: 14, dex: 2, strength: 12, stealth: "dis", donTime: 2,
    weight: 13, price: 120, avail: 30,
    note: "Pełny zestaw z osłoną barków i krocza."
  },
  {
    id: "kiepska-zbroja-smieciowa", name: "Kiepska zbroja śmieciowa", cat: "Średni", armorType: "medium",
    ac: 14, dex: 1, strength: 12, stealth: "dis", donTime: 2,
    weight: 15, price: 60, avail: 50,
    note: "Blachy z karoserii zespawane na oko. Sztywna i niewygodna."
  },
  {
    id: "solidna-zbroja-smieciowa", name: "Solidna zbroja śmieciowa", cat: "Średni", armorType: "medium",
    ac: 15, dex: 2, strength: 13, stealth: "dis", donTime: 2,
    weight: 25, price: 90, avail: 40,
    note: "Robota dobrego płatnerza ze śmietniska."
  },
  {
    id: "pancerz-kompozytowy", name: "Pancerz kompozytowy", cat: "Średni", armorType: "medium",
    ac: 16, dex: 2, strength: 12, stealth: "dis", donTime: 2,
    weight: 15, price: 400, avail: 5,
    note: "Przedwojenny kompozyt. Lekki jak na swoją klasę i bardzo drogi."
  },

  /* ---- Ciężkie pancerze (4 akcje) ---- */
  {
    id: "ciezka-zbroja-smieciowa", name: "Ciężka zbroja śmieciowa", cat: "Ciężki", armorType: "heavy",
    ac: 16, dex: null, strength: 13, stealth: "dis", donTime: 4,
    weight: 30, price: 70, avail: 40,
    note: "Chodząca kupa złomu. Mod. ZRC nie ma tu żadnego znaczenia."
  },
  {
    id: "pelna-zbroja-smieciowa", name: "Pełna zbroja śmieciowa", cat: "Ciężki", armorType: "heavy",
    ac: 18, dex: null, strength: 15, stealth: "dis", dt: 5, donTime: 4,
    weight: 40, price: 300, avail: 30,
    note: "Kompletny płaszcz z blach. Pierwsze uderzenia po prostu się odbijają."
  },
  {
    id: "pancerz-stalowej-policji", name: "Pancerz wspomagany Stalowej Policji",
    cat: "Ciężki", armorType: "heavy",
    ac: 19, dex: null, strength: 13, stealth: "none", dt: 10,
    kinetic: true, sealed: true, donTime: 4,
    weight: 0, price: 1000, avail: 5,
    note: "Egzoszkielet o masie 200 kg — nosi się sam, nie obciąża użytkownika. "
        + "Stąd waga 0 w ekwipunku.",
    manual: [
      "Zasilanie i sprawność siłowników — poza modułem. Awaria = MG.",
      "Zdjęcie bez pomocy technika bywa niemożliwe. MG rozstrzyga."
    ]
  },
  {
    id: "wojskowy-pancerz-hydrauliczny", name: "Wojskowy pancerz hydrauliczny",
    cat: "Ciężki", armorType: "heavy",
    ac: 20, dex: null, strength: 13, stealth: "none", dt: 15,
    kinetic: true, sealed: true, donTime: 4,
    weight: 0, price: 2000, avail: 1,
    note: "Hydrauliczny kolos o masie 400 kg — nosi się sam, nie obciąża użytkownika. "
        + "Stąd waga 0 w ekwipunku.",
    manual: [
      "Zasilanie i sprawność hydrauliki — poza modułem. Awaria = MG.",
      "Zdjęcie bez pomocy technika bywa niemożliwe. MG rozstrzyga."
    ]
  },

  /* ---- Akcesoria (1 akcja) ---- */
  {
    id: "helm", name: "Hełm", cat: "Akcesorium", armorType: "trinket",
    ac: null, acBonus: 0, dex: null, strength: null, stealth: null, donTime: 1,
    weight: 3, price: 20, avail: 70,
    note: "Kask sportowy, motocyklowy, górniczy albo wojskowy. Nie wymaga wyszkolenia "
        + "i nie daje bonusu do TT.",
    manual: [
      "Krytyczna ochrona [R]: po Trafieniu Krytycznym możesz Reakcją zamienić je "
      + "na zwykłe obrażenia — hełm ulega wtedy zniszczeniu. Moduł nie przechwytuje "
      + "krytyków ani nie kasuje hełmu."
    ]
  },
  {
    id: "ochraniacze-nog", name: "Ochraniacze nóg (para)", cat: "Akcesorium", armorType: "trinket",
    ac: null, acBonus: 1, dex: null, strength: 11, stealth: null, donTime: 1,
    weight: 8, price: 60, avail: 40,
    note: "Kevlar, blacha albo powłoki potworów. +1 do TT.",
    manual: ["Nie działają razem z ciężkim pancerzem. Moduł tego nie blokuje — pilnuje MG."]
  },
  {
    id: "ochraniacze-rak", name: "Ochraniacze rąk (para)", cat: "Akcesorium", armorType: "trinket",
    ac: null, acBonus: 1, dex: null, strength: 11, stealth: null, donTime: 1,
    weight: 4, price: 40, avail: 50,
    note: "Kevlar, blacha albo powłoki potworów. +1 do TT.",
    manual: ["Nie działają razem z ciężkim pancerzem. Moduł tego nie blokuje — pilnuje MG."]
  },
  {
    id: "tarcza", name: "Tarcza", cat: "Akcesorium", armorType: "shield",
    ac: 0, dex: null, strength: 13, stealth: "dis", donTime: 1,
    weight: 5, price: 20, avail: 70,
    note: "Dekiel od śmietnika, pokrywa studzienki albo skorupa potwora. Wymaga "
        + "biegłości i co najmniej jednej wolnej ręki. Sama z siebie nie podnosi TT "
        + "— cała jej wartość siedzi w trzech akcjach poniżej.",
    manual: [
      "Cios tarczą [B]: atak bez broni, 1k4 obuchowe albo Odepchnięcie.",
      "Osłona [R]: w zasięgu ataku obszarowego — Ułatwienie w RO na Zręczność.",
      "Parowanie [R]: po trafieniu atakiem wręcz — +5 TT wobec ataków tego "
      + "przeciwnika do początku Twojej następnej tury.",
      "Wymóg wolnej ręki nie jest sprawdzany."
    ]
  }
];

/** Szybkie wyszukanie po id. */
export const ARMOR_MAP = Object.freeze(Object.fromEntries(ARMORS.map(a => [a.id, a])));

/**
 * Reguły z `Tabele/Pancerz.md`, które dotyczą wszystkich pancerzy naraz i nie
 * dają się przypiąć do pojedynczego przedmiotu. Drukowane przez
 * `game.neuroshima.pancerze.report()`.
 */
export const ARMOR_GLOBAL_MANUAL = Object.freeze([
  "Pancerz dla zwierzaka: mały rozmiar bez dopłaty, średni ×2 ceny, duży ×4. "
  + "Moduł nie przelicza cen.",
  "Wytrzymałość pancerzy (reguła opcjonalna): Trafienie Krytyczne obniża TT o 1. "
  + "Naprawa wymaga fachowca i surowców za 10% ceny × utracona TT; 1 h (lekki), "
  + "5 h (średni), 10 h (ciężki). Moduł nie zbija TT ani nie liczy napraw.",
  "Odpoczynek w pancerzu: Długi odpoczynek w dowolnym pancerzu zwraca tylko połowę "
  + "Kości Wytrzymałości, nie usuwa Wyczerpania i nie zmniejsza Stopnia Zranienia. "
  + "Moduł nie modyfikuje odpoczynku.",
  "Utrudnienie w kolumnie „Skradanie się / Pływanie” obejmuje też Testy Siły "
  + "(Atletyka) przy pływaniu. Automatyzujemy wyłącznie Skradanie się.",
  "Czas zakładania i ściągania (1 / 2 / 4 akcje) nie jest egzekwowany."
]);

/* -------------------------------------------- */
/*  Budowa przedmiotu                             */
/* -------------------------------------------- */

const STEALTH_LABELS = { dis: "Utrudnienie", none: "Niemożliwe" };

function _description(a) {
  const rows = [
    ["Trudność Trafienia", _acLabel(a)],
    a.strength ? ["Wymagana SIŁA", `${a.strength}+ (inaczej Szybkość −4,5 m)`] : null,
    a.stealth ? ["Skradanie się / Pływanie", STEALTH_LABELS[a.stealth]] : null,
    a.dt ? ["Próg obrażeń", `${a.dt} (tylko cięte, kłute i obuchowe)`] : null,
    a.kinetic ? ["Odporność kinetyczna", "cięte, kłute, obuchowe"] : null,
    a.sealed ? ["Szczelność", "akcja na uszczelnienie, zapas tlenu na 1 godzinę"] : null,
    ["Zakładanie / ściąganie", `${a.donTime} ${a.donTime === 1 ? "akcja" : "akcje"}`],
    ["Dostępność", `${a.avail}%`]
  ].filter(Boolean);

  const table = rows.map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join("");
  const note = a.note ? `<p>${a.note}</p>` : "";
  const manual = a.manual?.length
    ? `<h4>Nie automatyzujemy</h4><ul>${a.manual.map(m => `<li>${m}</li>`).join("")}</ul>`
    : "";

  return `${table}${note}${manual}`;
}

function _acLabel(a) {
  if (a.acBonus) return `+${a.acBonus}`;
  if (a.armorType === "shield") return "patrz opis";
  if (a.armorType === "heavy") return `${a.ac}`;
  if (a.dex) return `${a.ac} + mod. ZRC (maks. ${a.dex})`;
  return `${a.ac} + mod. ZRC`;
}

/**
 * Efekty Aktywne przedmiotu. Bez `_id` — build-packs dopisuje deterministyczne
 * identyfikatory, a `createEmbeddedDocuments` generuje losowe.
 */
function _effects(a) {
  const effects = [];
  const img = `modules/${MODULE_ID}/icons/armor/${a.id}.svg`;

  if (a.acBonus) {
    effects.push({
      name: `${a.name} — bonus do TT`,
      img,
      changes: [{ key: "system.attributes.ac.bonus", mode: 2, value: String(a.acBonus), priority: 20 }],
      disabled: false,
      transfer: true
    });
  }

  if (a.kinetic) {
    effects.push({
      name: `${a.name} — odporność kinetyczna`,
      img,
      changes: KINETIC_DAMAGE_TYPES.map(t => ({
        key: "system.traits.dr.value", mode: 2, value: t, priority: 20
      })),
      disabled: false,
      transfer: true
    });
  }

  return effects;
}

/** Kształt itemu `equipment`, wspólny dla kompendium i `createArmors()`. */
export function buildArmorItemData(a, extra = {}) {
  const properties = [];
  // "Niemożliwe" nie ma odpowiednika w dnd5e — dajemy przynajmniej Utrudnienie,
  // a zakaz zjeżdża do `manual`, żeby nikt nie myślał, że jest egzekwowany.
  if (a.stealth) properties.push("stealthDisadvantage");
  // Właściwości poniżej niczego nie liczą — wartość siedzi we fladze. Są po to,
  // żeby reguła była widoczna na karcie, a nie działała po cichu.
  if (a.dt) properties.push("prog_obrazen");
  if (a.kinetic) properties.push("odpornosc_kinetyczna");
  if (a.sealed) properties.push("szczelnosc");

  const flags = {
    [MODULE_ID]: {
      availability: a.avail,
      armorCategory: a.cat,
      donTime: a.donTime
    }
  };
  if (a.dt) flags[MODULE_ID].armorDT = a.dt;
  if (a.sealed) flags[MODULE_ID].sealed = true;
  if (a.stealth === "none") flags[MODULE_ID].stealthImpossible = true;

  return {
    name: a.name,
    type: "equipment",
    img: `modules/${MODULE_ID}/icons/armor/${a.id}.svg`,
    system: {
      description: { value: _description(a), chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      type: { value: a.armorType, baseItem: "" },
      quantity: 1,
      weight: { value: a.weight, units: "kg" },
      price: { value: a.price, denomination: "gp" },
      armor: { value: a.ac ?? null, magicalBonus: null, dex: a.dex ?? null },
      strength: a.strength ?? null,
      proficient: null,
      properties,
      activities: {}
    },
    effects: _effects(a),
    flags,
    ...extra
  };
}

/* -------------------------------------------- */
/*  Generator na aktorze                          */
/* -------------------------------------------- */

/**
 * Zakłada komplet 17 pancerzy na wskazanym aktorze. Upsert po nazwie — nic
 * nie kasuje, żeby ręcznie dołożone egzemplarze przeżyły.
 *
 * Wywołanie: `game.neuroshima.createArmors(actor)`
 */
export async function createArmors(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return null;
  }

  const byName = new Map(actor.items.filter(i => i.type === "equipment").map(i => [i.name, i]));
  const toCreate = [];
  const toUpdate = [];

  for (const a of ARMORS) {
    const data = buildArmorItemData(a);
    const existing = byName.get(a.name);
    if (existing) {
      // Efekty istniejącego przedmiotu zostawiamy w spokoju — nadpisanie
      // `effects` przez updateEmbeddedDocuments i tak by ich nie ruszyło.
      const { effects, ...rest } = data;
      toUpdate.push({ _id: existing.id, ...rest });
    } else {
      toCreate.push(data);
    }
  }

  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);

  ui.notifications.info(
    `Pancerze: ${toCreate.length} nowych, ${toUpdate.length} zaktualizowanych.`
  );
  return { created: toCreate.length, updated: toUpdate.length };
}
