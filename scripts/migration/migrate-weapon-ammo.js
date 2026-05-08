/**
 * MIGRACJA AMUNICJI — Neuroshima 5e
 *
 * Uruchom w konsoli Foundry jako GM (F12 → Console):
 *   Wklej cały plik i naciśnij Enter.
 *
 * Co robi:
 *   - Na podstawie nazwy broni przypisuje kaliber (mag.ammoType)
 *   - Automatycznie ustawia system.damage.base.formula i types z danych kalibru
 *   - Ustawia flags.neuroshima-2026-overrides.ammoProps (właściwości z amunicji)
 *   - Loguje wynik w konsoli
 *
 * Kalibracja ręczna:
 *   Dla broni nierozpoznanych (`unknown`) — otwórz kartę broni w Foundry
 *   i wybierz kaliber z dropdown „kaliber:" na zakładce Details.
 */
(async () => {
  const MODULE_ID = "neuroshima-2026-overrides";

  /* ── Dane kalibru (muszą być spójne z ammo-data.mjs) ── */
  const AMMO_CALIBERS = [
    { id: "22lr",    formula: "1d4",  type: "piercing",    props: [] },
    { id: "38spl",   formula: "1d6",  type: "piercing",    props: [] },
    { id: "9mm",     formula: "1d6",  type: "piercing",    props: [] },
    { id: "45acp",   formula: "1d8",  type: "piercing",    props: [] },
    { id: "44mag",   formula: "1d10", type: "piercing",    props: ["obalajaca"] },
    { id: "556",     formula: "2d6",  type: "piercing",    props: [] },
    { id: "76239ak", formula: "2d8",  type: "piercing",    props: [] },
    { id: "762",     formula: "2d8",  type: "piercing",    props: [] },
    { id: "3006",    formula: "2d6",  type: "piercing",    props: ["obalajaca"] },
    { id: "50bmg",   formula: "1d20", type: "piercing",    props: ["obalajaca"] },
    { id: "12ga_s",  formula: "2d4",  type: "piercing",    props: [] },
    { id: "12ga_b",  formula: "2d6",  type: "bludgeoning", props: ["burzaca", "obalajaca"] },
    { id: "40mm",    formula: "6d6",  type: "explosive",   props: [] },
    { id: "60mm",    formula: "15d6", type: "explosive",   props: [] },
    { id: "120mm",   formula: "10d6", type: "slashing",    props: [] },
    { id: "strzala", formula: "",     type: "piercing",    props: [] },
    { id: "belt",    formula: "",     type: "piercing",    props: [] },
    { id: "kulka",   formula: "",     type: "bludgeoning", props: [] },
    { id: "igla",    formula: "",     type: "piercing",    props: [] },
    { id: "strzykawka", formula: "",  type: "piercing",    props: [] },
  ];
  const CALIBER_MAP = Object.fromEntries(AMMO_CALIBERS.map(c => [c.id, c]));

  /* ── Mapowanie nazwy broni → id kalibru ─────────────────────────── */
  // Kolejność ważna: dłuższe / bardziej specyficzne wzorce pierwsze.
  const nameToCaliberRules = [
    // .50 / Barrett / Light Fifty
    [/(\.50|50\s*bmg|light\s*fifty|barrett)/i,          "50bmg"],
    // 7,62×39 / AK
    [/(7[\.,]62.*39|ak-?47|akm|kałach|kalach)/i,        "76239ak"],
    // 7,62 mm / G3 / Garand / karabin maszynowy 7.62
    [/(h&k\s*g3|hk\s*g3|g3\b|m1\s*garand|garand|7[\.,]62\s*mm|fal\b|m14\b|m60\b|pkm\b)/i, "762"],
    // 5,56 / AR-15 / M4 / M16 / SCAR / XM-8 / HK416
    [/(5[\.,]56|ar-?15|m4\b|m16\b|scar|xm-?8|hk-?416|fn\s*scar)/i, "556"],
    // .30-06
    [/(\.30-06|30-06|thirtysix|thirty-six)/i,           "3006"],
    // Granaty 40mm
    [/(granat\s*40\s*mm|m203|ag-?36|40\s*mm)/i,         "40mm"],
    // Pociski 60mm / bazooka / RPG
    [/(60\s*mm|bazooka|rpg|panzerfaust)/i,               "60mm"],
    // Pociski 120mm / moździerz
    [/(120\s*mm|moździerz|mozdzierz)/i,                  "120mm"],
    // Śrut .12 breneka (cięższa)
    [/(\.12.*breneka|breneka|12.*bren)/i,                "12ga_b"],
    // Śrut .12 (ogólnie strzelby, shotguny)
    [/(\.12|12\s*ga|shotgun|strzelba|dwururka|obrzyn|pump\s*action|mossberg|remington\s*870)/i, "12ga_s"],
    // .44 Mag / Magnum / Colt Python / Desert Eagle
    [/(\.44\s*mag|44\s*magnum|colt\s*python|desert\s*eagle|złoty\s*desert\s*eagle)/i, "44mag"],
    // .45 ACP / M1911 / Thompson / Tommy
    [/(\.45|45\s*acp|m1911|tommy\s*gun|thompson|usp\s*45)/i, "45acp"],
    // .38 SPL / rewolwer (bez konkretnego kalibru = domyślnie .38)
    [/(\.38|38-?ka|38\s*spl|peacemaker|rewolwer|revolver)/i, "38spl"],
    // 9mm ogólne (pistolety, SMG bez konkretnego kalibru)
    [/(9\s*mm|9x19|glock|beretta\s*9|b\s*92|b92|b\s*93|ump|uzi|mp5|hk\s*ump|h&k\s*ump|empe\s*piątka)/i, "9mm"],
    // .22 LR
    [/(\.22|22\s*lr|ruger\s*lcp|walther\s*ppk|ppk\b)/i,  "22lr"],
    // Łuki
    [/(łuk|luk|bow\b|longbow|shortbow)/i,                "strzala"],
    // Kusze
    [/(kusz|kus\b|crossbow)/i,                           "belt"],
    // Proce
    [/(proca|sling\b|proc|kawałek gumy)/i,               "kulka"],
    // Dmuchawki
    [/(dmuchawka|dmuch|blowgun|blow\s*gun)/i,             "igla"],
  ];

  const neuroWeaponTypes = new Set([
    "biala","miotana","palnaKrotka","palnaPosr","palnaDluga","palnaCiezka"
  ]);

  const skipPrefixes = [
    "atak","pięść","ugryzienie","odnóże","macka","zęby","pazury",
    "splunięcie","żądło","ukłucie","ryjossawka","bez broni",
    "piąchopiryna","tulipan","atak wielokrotny",
  ];

  /* ── Zbierz wszystkie bronie ── */
  const allWeapons = [
    ...game.items.filter(i => i.type === "weapon"),
    ...game.actors.contents.flatMap(a => a.items.filter(i => i.type === "weapon"))
  ].filter(w => neuroWeaponTypes.has(w.system.type?.value));

  let updated = 0, skipped = 0;
  const unknown = [];

  for (const weapon of allWeapons) {
    const low = weapon.name.toLowerCase();

    /* Pomijamy naturalne ataki i bronie białe bez amunicji */
    if (skipPrefixes.some(s => low.startsWith(s))) { skipped++; continue; }

    const weapType = weapon.system.type?.value ?? "";
    /* Bronie białe — nie mają kalibru */
    if (weapType === "biala") { skipped++; continue; }

    /* Sprawdź czy kaliber już jest ustawiony */
    const existingCaliberId = weapon.getFlag(MODULE_ID, "mag")?.ammoType ?? "";
    if (existingCaliberId && CALIBER_MAP[existingCaliberId]) {
      skipped++;
      continue;
    }

    /* Szukaj kalibru po nazwie */
    let caliberId = null;
    for (const [pattern, id] of nameToCaliberRules) {
      if (pattern.test(weapon.name)) { caliberId = id; break; }
    }

    if (!caliberId) {
      unknown.push(`${weapon.name} (${weapon.parent?.name ?? "world"}, typ: ${weapType})`);
      continue;
    }

    const caliber = CALIBER_MAP[caliberId];

    /* Zbuduj aktualizacje */
    const mag = weapon.getFlag(MODULE_ID, "mag") ?? {};
    const updates = {
      [`flags.${MODULE_ID}.mag`]: { ...mag, ammoType: caliberId },
      [`flags.${MODULE_ID}.ammoProps`]: caliber.props,
    };

  /* ── Ustaw obrażenia tylko jeśli kaliber ma formułę ── */
  if (caliber.formula) {
    const match = caliber.formula.match(/^(\d+)d(\d+)$/);
    if (match) {
      updates["system.damage.base.number"] = parseInt(match[1], 10);
      updates["system.damage.base.denomination"] = parseInt(match[2], 10);
      updates["system.damage.base.types"] = [caliber.type];
    }
  }

    /* Właściwości: dodaj ammo props */
    if (caliber.props.length) {
      const currentProps = new Set(weapon.system?.properties ?? []);
      for (const p of caliber.props) currentProps.add(p);
      updates["system.properties"] = [...currentProps];
    }

    await weapon.update(updates);
    updated++;
    console.log(`✅ ${weapon.name} (${weapon.parent?.name ?? "world"}) → ${caliberId}`);
  }

  console.log(`\n=== Migracja amunicji ===`);
  console.log(`✅ Zaktualizowano: ${updated}`);
  console.log(`⏭ Pominięto (białe / już skalibrowane): ${skipped}`);
  console.log(`❓ Nierozpoznane (${unknown.length}):`, unknown);
  ui.notifications.info(
    `Neuroshima: skalibrowano ${updated} broni. Sprawdź konsolę — ${unknown.length} nierozpoznanych.`
  );
})();
