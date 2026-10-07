/**
 * Neuroshima 5e — trafienie i reakcje obronne: czyste zasady (PLAN_tt.md, Część B).
 *
 * Bez `game` i bez dokumentów. Dwie rzeczy:
 *
 *   - **`resolveHit`** — jedyny rozstrzygacz „czy trafił”. Naturalna 20 (Trafienie Krytyczne)
 *     trafia zawsze, naturalna 1 nigdy (s. 16); inaczej Test Ataku ≥ TT celu + osłona + premie
 *     z reakcji. Każde miejsce w module, które pyta o trafienie, idzie przez niego albo czyta
 *     ostemplowany werdykt (`combat/trafienie.mjs`).
 *   - **`DEFENSE_REACTIONS` + `reactionState`** — katalog reakcji po trafieniu (§1.4) i stan
 *     przycisku w oknie „Reakcje celu” na karcie ataku (`combat/obrona.mjs`).
 *
 * Doktryna (D10, D11): okno niczego nie blokuje. Przycisk reakcji „na ten atak” jest wyszarzony,
 * gdy nawet najwyższy wynik nie zmieni trafienia w pudło, a reakcja trwała (do początku tury)
 * jest aktywna zawsze, gdy są ładunki. Ekonomii Reakcji nie liczymy (P8).
 */

/** Pełna osłona — `combat/cover.mjs` (`COVER_EXPOSURES.full.acBonus`). Wyklucza atak bezpośredni. */
export const FULL_COVER = 999;

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Rozstrzygacz                                 */
/* -------------------------------------------- */

/**
 * @param {object} a
 * @param {number}  a.total          Wynik Testu Ataku.
 * @param {boolean} [a.critical]     Trafienie Krytyczne (`roll.isCritical`).
 * @param {boolean} [a.fumble]       Pechowa jedynka (`roll.isFumble`).
 * @param {number|null} a.tt         TT celu wobec tego atakującego (`ttAgainst`).
 * @param {number} [a.cover]         Premia osłony z okna ataku.
 * @param {number} [a.bonuses]       Suma premii z użytych reakcji.
 * @param {boolean} [a.critDowngraded]  Krytyczna ochrona zamieniła krytyk na zwykłe trafienie.
 * @param {boolean} [a.autoCrit]  Automatyczne TK (Nieprzytomny / Sparaliżowany cel ≤ 1,5 m, s. 35):
 *   każde **trafienie** jest krytyczne — pudło zostaje pudłem (PLAN_m1_walka §7.5).
 * @returns {{verdict: "pudło"|"trafienie"|"krytyk", need: number, target: number|null, autoHit: boolean, blocked?: boolean, autoKrytyk?: boolean}}
 *   `need` — o ile musiałaby wzrosnąć TT, żeby trafienie stało się pudłem (0 przy pudle,
 *   `Infinity` przy trafieniu, którego nic nie odwróci).
 */
export function resolveHit({ total, critical = false, fumble = false, tt, cover = 0, bonuses = 0, critDowngraded = false, autoCrit = false } = {}) {
  const coverValue = _num(cover);
  const target = Number.isFinite(tt) ? tt + coverValue + _num(bonuses) : null;
  if (coverValue >= FULL_COVER) return { verdict: "pudło", need: 0, target, autoHit: false, blocked: true };
  if (critical) {
    return { verdict: critDowngraded ? "trafienie" : "krytyk", need: Infinity, target, autoHit: true };
  }
  if (fumble) return { verdict: "pudło", need: 0, target, autoHit: false };
  // TT nieznana (dane spoza schematu) — nie blokujemy, jak dawniej każde „czy trafił” w module.
  const trafienie = autoCrit && !critDowngraded
    ? { verdict: "krytyk", autoKrytyk: true }
    : { verdict: "trafienie" };
  if (target === null) return { ...trafienie, need: NaN, target, autoHit: false };
  const t = _num(total);
  if (t >= target) return { ...trafienie, need: t - target + 1, target, autoHit: false };
  return { verdict: "pudło", need: 0, target, autoHit: false };
}

/** Czy werdykt to trafienie (zwykłe albo krytyczne). */
export const isHitVerdict = v => v === "trafienie" || v === "krytyk";

/* -------------------------------------------- */
/*  Typ atakującego                              */
/* -------------------------------------------- */

/**
 * Kategoria Bestiariusza z `details.type.value`. Świat trzyma tam etykietę („Potwór”), czasem wolny
 * tekst („Maszyna (Molocha)”, „(człowiek)”, „beast”) — porównanie z kluczem nic by nie złapało.
 * Postacie mają zawsze „humanoid” (dnd5e) — to ludzie.
 * @param {string|null|undefined} raw
 * @returns {"czlowiek"|"maszyna"|"mutant"|"potwor"|"zwierze"|"rojZwierzat"|null}
 */
export function creatureKindOf(raw) {
  const s = String(raw ?? "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");
  if (!s.trim()) return null;
  if (/maszyn|robot|dron/.test(s)) return "maszyna";
  if (/mutant/.test(s)) return "mutant";
  if (/potwor|monster/.test(s)) return "potwor";
  if (/roj/.test(s)) return "rojZwierzat";
  if (/zwierz|beast|animal/.test(s)) return "zwierze";
  if (/czlowiek|ludz|humanoid|human/.test(s)) return "czlowiek";
  return null;
}

const KIND_LABELS = {
  czlowiek: "człowiek", maszyna: "maszyna", mutant: "mutant", potwor: "potwór", zwierze: "zwierzę", rojZwierzat: "rój"
};

/* -------------------------------------------- */
/*  Kości                                        */
/* -------------------------------------------- */

/**
 * Najwyższy możliwy wynik premii: liczba albo prosta formuła kości („1d4”, „2k6+1”).
 * Formuły, których nie rozumiemy, dają `Infinity` — przycisk zostaje aktywny, MG oceni.
 */
export function bonusMax(bonus) {
  if (Number.isFinite(Number(bonus))) return Number(bonus);
  const m = /^\s*(\d*)\s*[dk]\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(String(bonus ?? ""));
  if (!m) return Infinity;
  const n = Number(m[1] || 1);
  const mod = m[3] ? (m[3] === "-" ? -1 : 1) * Number(m[4]) : 0;
  return n * Number(m[2]) + mod;
}

/** Czy premia jest rzutem (gracz rzuca u siebie — Dice So Nice). */
export const isDiceBonus = bonus => !Number.isFinite(Number(bonus)) && Number.isFinite(bonusMax(bonus));

/* -------------------------------------------- */
/*  Katalog reakcji                              */
/* -------------------------------------------- */

/**
 * Snapshot celu dla reakcji (buduje `combat/obrona.mjs`):
 *   `{ owned: Set, mods, prof, charges: {id: n}, dice: {id: formula}, helmet,
 *      shield: null | {inHand, proficient, strOk, strReq} }`
 *
 * Wiersz:
 *   `id`, `label`, `page`, `ability` (klucz `ABILITY_KEYS`) albo `owns(s)`,
 *   `scope` — `attack` (ten atak), `turn` (do początku Twojej następnej tury, Efekt Aktywny),
 *             `attacker` (ataki tego przeciwnika do początku Twojej następnej tury),
 *   `effect` — `tt` albo `critDowngrade`,
 *   `bonus(s)` — liczba albo kość, `melee` — tylko przeciw atakom wręcz,
 *   `attackerKinds` — tylko przeciw tym kategoriom atakującego (P7), `applies(ctx, s)` — reszta warunków,
 *   `charges(s)` — pozostałe użycia albo `null` (bez limitu).
 */
export const DEFENSE_REACTIONS = Object.freeze([
  {
    id: "inteligentnaObrona", label: "Inteligentna obrona", page: "s. 78", ability: "inteligentnaObrona",
    scope: "turn", effect: "tt",
    bonus: s => _num(s.mods?.int),
    charges: s => s.charges?.inteligentnaObrona ?? null
  },
  {
    id: "kociOdskok", label: "Koci odskok", page: "s. 93", ability: "dziewiecZyc",
    scope: "turn", effect: "tt",
    bonus: s => s.dice?.kociOdskok ?? "1d6",
    charges: s => s.charges?.kociOdskok ?? null
  },
  {
    id: "bulletTime", label: "Bullet time (Neo)", page: "s. 105", ability: "neo",
    scope: "attack", effect: "tt",
    bonus: () => 5
  },
  {
    id: "parowanie", label: "Parowanie (Mistrz walki wręcz)", page: "s. 104", ability: "mistrzWalkiWrecz",
    scope: "attack", effect: "tt", melee: true,
    bonus: () => "1d4"
  },
  {
    // „Wymagana jest biegłość, odpowiednia siła i wolna ręka” (s. 115) — tarcza w ręce (P6).
    id: "parowanieTarcza", label: "Parowanie tarczą", page: "s. 115",
    owns: s => !!s.shield,
    scope: "attacker", effect: "tt", melee: true,
    bonus: () => 5,
    applies: (_ctx, s) => {
      if (!s.shield?.inHand) return "tarcza nie w ręce";
      if (!s.shield.proficient) return "brak biegłości w tarczach";
      if (!s.shield.strOk) return `za mała SIŁA (wymagana ${s.shield.strReq})`;
      return true;
    }
  },
  {
    id: "unikLowcy", label: "Unik łowcy", page: "s. 98", ability: "mutantNaSniadanie",
    scope: "attack", effect: "tt", attackerKinds: ["mutant", "potwor"],
    bonus: s => _num(s.prof)
  },
  {
    id: "empiryk", label: "Empiryk", page: "s. 101", ability: "empiryk",
    scope: "attack", effect: "tt", attackerKinds: ["maszyna"],
    bonus: s => _num(s.prof)
  },
  {
    // Hełm niszczeje (D12); Kobalt zostawia „Dziurawy hełm” (D12a). Zamiana krytyka na zwykłe
    // trafienie gasi też skutki krytyka liczone z rzutu obrażeń (P9).
    id: "krytycznaOchrona", label: "Krytyczna ochrona (hełm)", page: "s. 115",
    owns: s => !!s.helmet,
    scope: "attack", effect: "critDowngrade",
    bonus: () => 0
  }
]);

/**
 * Wiersz reakcji BN-a z Bestiariusza (`AUTOMATION.kind = "ttReaction"`, D13) — np. Gladiator:
 * Parowanie +3 przeciw jednemu atakowi wręcz.
 * @param {{id:string, label:string, bonus:number|string, melee?:boolean, scope?:string, page?:string}} def
 */
export function npcReactionRow(def) {
  return Object.freeze({
    id: def.id, label: def.label, page: def.page ?? "Bestiariusz",
    owns: () => true,
    scope: def.scope ?? "attack", effect: "tt", melee: !!def.melee,
    bonus: () => def.bonus,
    npc: true
  });
}

/**
 * Kontekst ataku:
 *   `{ total, natural, verdict, need, target, autoHit, melee, attackerKind, used: [{id}],
 *      critDowngraded, gmActive }`
 *
 * @returns {{state: "active"|"disabled"|"hidden"|"used", reason?: string, note?: string,
 *            maxBonus?: number, used?: object}}
 */
export function reactionState(row, s, ctx) {
  const owned = row.owns ? row.owns(s) : !!s.owned?.has?.(row.ability);
  if (!owned) return { state: "hidden" };

  const used = (ctx.used ?? []).find(u => u.id === row.id);
  if (used) return { state: "used", used };

  const off = reason => ({ state: "disabled", reason });

  if (row.effect === "critDowngrade") {
    if (ctx.verdict !== "krytyk" || ctx.critDowngraded) return { state: "hidden" };
    return ctx.gmActive === false ? off("potrzebny MG") : { state: "active", maxBonus: 0, canChange: true };
  }

  let note;
  if (row.melee && !ctx.melee) return off("atak nie wręcz");
  if (row.attackerKinds) {
    if (!ctx.attackerKind) note = "typ atakującego nieznany";
    else if (!row.attackerKinds.includes(ctx.attackerKind)) {
      return off(`atakujący to ${KIND_LABELS[ctx.attackerKind] ?? ctx.attackerKind}, nie `
        + row.attackerKinds.map(k => KIND_LABELS[k] ?? k).join(" ani "));
    }
  }
  const extra = row.applies?.(ctx, s);
  if (typeof extra === "string") return off(extra);

  const charges = row.charges?.(s);
  if (charges !== null && charges !== undefined && charges <= 0) return off("brak użyć");
  if (ctx.gmActive === false) return off("potrzebny MG");

  const maxBonus = bonusMax(row.bonus(s));
  const known = Number.isFinite(ctx.need) && Number.isFinite(ctx.target);
  // Czy najwyższy wynik tej reakcji odwraca trafienie w pudło — dla plakietki ⏳ (D10).
  const canChange = (ctx.verdict === "trafienie" || ctx.verdict === "krytyk") && !ctx.autoHit
    && (!known || maxBonus >= ctx.need);
  if (row.scope === "attack") {
    if (ctx.autoHit) return off(ctx.natural === 20 ? "naturalna 20 — trafia zawsze" : "trafienie krytyczne — trafia zawsze");
    if (ctx.verdict === "pudło") return off("atak już chybił");
    if (known && (maxBonus < ctx.need)) {
      return off(`za wysoki rzut (${ctx.total} vs maks. TT ${ctx.target + maxBonus})`);
    }
    if (!Number.isFinite(ctx.target)) note = note ? `${note}; TT celu nieznana` : "TT celu nieznana";
  }
  // Reakcja trwała zostaje aktywna zawsze, gdy są ładunki (D11) — bez opisu skutku.
  return { state: "active", maxBonus, note, canChange };
}

/**
 * Czy któraś reakcja może jeszcze zmienić wynik tego ataku — plakietka ⏳ przy „Obrażeniach”
 * (D10, §4.8.8). Liczą się też reakcje trwałe (Inteligentna obrona), o ile ich najwyższy wynik
 * odwraca trafienie; sama informacja, niczego nie blokuje.
 */
export function hasPendingReaction(rows, s, ctx) {
  if (ctx.decided) return false;
  return rows.some(r => {
    const st = reactionState(r, s, ctx);
    return st.state === "active" && st.canChange;
  });
}

/** Powierzchnia dla testów Quench (TESTING.md, warstwa 4). */
export const __testing = Object.freeze({
  resolveHit, creatureKindOf, bonusMax, isDiceBonus, reactionState, hasPendingReaction, npcReactionRow
});
