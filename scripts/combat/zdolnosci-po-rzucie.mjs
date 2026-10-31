/**
 * Neuroshima 5e — zdolności „po rzucie” (PLAN_m7 E1, rodzina R3): źródła rejestru `combat/po-rzucie.mjs`.
 *
 * | Zdolność | Działanie | Kto klika | Koszt |
 * |---|---|---|---|
 * | Motywacja (Cwaniak 1, s. 72) | + kość Motywacji do Testu k20 sojusznika ≤ 18 m | właściciel Cwaniaka | użycie + [R] |
 * | Szczęście (Cwaniak 1, s. 72) | przerzut własnego testu, trzeba zaakceptować; raz w rundzie (U5) | właściciel | użycie |
 * | Spieprzysz to! (Cwaniak 2, s. 72) | udany atak albo RO istoty ≤ 18 m → przerzut, gorszy zostaje | właściciel Cwaniaka; MG przy ukrytym rzucie (U6) | użycie + [R] |
 * | Łeb jak sklep (Spec 2) | + kość do Testu INT albo narzędzi | właściciel | użycie |
 * | Amen (Kaznodzieja) | po porażce + 1k6, trzeba zaakceptować (U4) | właściciel | użycie |
 * | Twardość (Twardziel 3) | nieudany RO albo RPŚ + kość Twardości (U7) | właściciel | pula |
 * | Poprawka (Kowboj — Clint) | przerzut Testu Ataku bronią palną, raz na walkę | właściciel | użycie |
 * | Czas patriotów (Nowy Jork, s. 63) | +5 do Testu Cechy albo RO | właściciel | 1 /DO |
 * | Fart (Vegas, s. 65) | naturalna 1 → przerzut **sam** (D7) | — | 1 /KO |
 * | Kocie kości (Złodziej 2) | Ciche łapy [R]: + kości do Skradania; Zgrabne łapy: + kości do Akrobatyki | właściciel | pula |
 * | Urodzony morderca (Hegemonia, s. 63) | 1 na kości obrażeń → jeden przerzut tej kości — modyfikator `r1`, sam | — | — |
 *
 * „Kto klika”: gracz — swoje postacie; MG — postacie, których żaden gracz nie ma teraz przy stole, i BN. Inaczej
 * MG widziałby pod każdym rzutem przyciski cudzych zdolności. Zasięg z silnika okoliczności (od krawędzi żetonów);
 * bez żetonów na scenie — przycisk aktywny z dymkiem „zasięg niesprawdzony”. Reakcja zużyta nie chowa przycisku
 * (U1) — użycie daje sygnał MG (`actors/actions.mjs`). Zdolność bez licznika na przedmiocie (kopia sprzed M7) —
 * aktywna z dymkiem „licznik: stół”; Fart wtedy nie odpala sam (do `resync`, E8).
 */

import {
  TESTY_K20, PROG_RPS, korektaRPS
} from "../config/po-rzucie-rules.mjs";
import { zarejestrujZrodloPoRzucie, rzutZDodatkiem } from "./po-rzucie.mjs";
import { odlegloscKrawedzi } from "./okolicznosci.mjs";
import { isFirearm } from "./grip.mjs";
import { zadeklaruj, znacznik } from "../actors/actions.mjs";
import { bramkaZajetaNa, zajmijBramke } from "./czas-efektu.mjs";
import { poprosOStabilizacje, stabilizuj } from "./umieranie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Motywacja i Spieprzysz to! — 18 m (s. 72). */
const ZASIEG_CWANIAKA = 18;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _k = formula => String(formula).replace(/d/gi, "k");

/* -------------------------------------------- */
/*  Pomocniki                                    */
/* -------------------------------------------- */

/** Przedmiot zdolności klasy/profesji (`abilityId`) albo Pochodzenia (`originAbilityId`). */
function _przedmiot(actor, { abilityId, originAbilityId }) {
  return actor?.items?.find(i => (abilityId && i.getFlag(MODULE_ID, "abilityId") === abilityId)
    || (originAbilityId && i.getFlag(MODULE_ID, "originAbilityId") === originAbilityId)) ?? null;
}

/** Pozostałe użycia albo `null` (przedmiot bez licznika). */
function _pozostalo(item) {
  const u = item?.system?.uses;
  if (!u?.max) return null;
  const v = Number(u.value);
  return Number.isFinite(v) ? v : Math.max(0, Number(u.max) - (Number(u.spent) || 0));
}

async function _zuzyj(item, n = 1) {
  const u = item?.system?.uses;
  if (!u?.max) return;
  await item.update({ "system.uses.spent": (Number(u.spent) || 0) + n });
}

/** Kość ze skali klasy (`@scale.cwaniak.motywacja` → "1d6"). */
function _kosc(actor, sciezka, zapas) {
  const s = foundry.utils.getProperty(actor?.getRollData?.() ?? {}, `scale.${sciezka}`);
  const f = s?.formula ?? (s ? String(s) : "");
  return /\d*d\d+/i.test(f) ? f : zapas;
}

function _zeton(actor) {
  return actor?.token?.object ?? actor?.getActiveTokens?.()[0] ?? null;
}

/** Metry od krawędzi żetonów albo `null`, gdy któregoś nie ma na oglądanej scenie. */
function _dystans(a, b) {
  const ta = _zeton(a), tb = _zeton(b);
  return ta && tb ? odlegloscKrawedzi(ta, tb) : null;
}

function _dyspozycja(actor) {
  return _zeton(actor)?.document?.disposition ?? actor?.prototypeToken?.disposition ?? null;
}

function _sojusznicy(a, b) {
  const da = _dyspozycja(a), db = _dyspozycja(b);
  if (da === null || db === null) return a?.type === "character" && b?.type === "character";
  return da === db && da !== CONST.TOKEN_DISPOSITIONS.SECRET;
}

/** Czy ten widz „gra” tą postacią: gracz — swoją; MG — gdy żaden aktywny gracz jej nie posiada. */
function _gra(actor) {
  if (!actor?.isOwner) return false;
  if (!game.user.isGM) return true;
  return !game.users.some(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));
}

/** Czy użytkownik widzi wynik karty (ukryty rzut MG — nie). */
function _widziWynik(message, user) {
  if (user.isGM) return true;
  if (message.blind) return false;
  return !message.whisper?.length || message.whisper.includes(user.id);
}

/** Własna zdolność rzucającego — `{ actor, item }` albo `null`. */
function _wlasna(ctx, ids) {
  const actor = ctx.actor;
  if (!_gra(actor)) return null;
  const item = _przedmiot(actor, ids);
  return item ? { actor, item } : null;
}

/** Wspólny stan przycisku z licznika (`null` — bez licznika: aktywny, pilnuje stół). */
function _stanLicznika(item, etykieta, brak) {
  const left = _pozostalo(item);
  if (left === 0) return { stan: "szary", powod: brak, etykieta };
  return { stan: "aktywny", etykieta, ...(left === null ? { powod: "licznik użyć: stół (kopia zdolności sprzed M7)" } : {}) };
}

async function _potwierdz(ctx, tytul, tresc) {
  if (ctx.auto) return true;
  return foundry.applications.api.DialogV2.confirm({
    window: { title: tytul }, content: `<div style="padding: 4px 0;">${tresc}</div>`,
    yes: { icon: "fas fa-check", label: "Użyj" }, no: { icon: "fas fa-times", label: "Anuluj", default: true },
    rejectClose: false
  });
}

function _flavor(kolor, tytul, linia) {
  return `<div style="border-left: 4px solid ${kolor}; background: color-mix(in srgb, ${kolor} 8%, transparent); padding: 6px 8px; border-radius: 0 4px 4px 0; margin-bottom: 4px;">`
    + `<div style="font-weight: bold; color: ${kolor}; font-size: 13px; margin-bottom: 2px;">${tytul}</div>`
    + `<div style="font-size: 11px; color: var(--color-text-secondary, #aaa);">${linia}</div></div>`;
}

const _styl = kolor => ({ background: `color-mix(in srgb, ${kolor} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${kolor} 45%, transparent)`, color: kolor, cursor: "pointer" });
const STYL_SZARY = { background: "rgba(128, 128, 128, 0.08)", border: "1px solid rgba(128, 128, 128, 0.2)", color: "#666", cursor: "default", opacity: "0.5" };

/** Przerzut rzutu pierwotnego łańcucha (U2: dodane kości przepadają) — ta sama klasa, opcje i tryb. */
async function _przerzut(ctx) {
  const r = ctx.root?.rolls?.[0] ?? ctx.roll;
  return r.reroll();
}

/** Kopia rzutu bez ponownego toczenia (Dice So Nice) — gdy gorszy jest wynik sprzed przerzutu. */
function _kopiaBezAnimacji(roll) {
  const data = roll.toJSON();
  for (const t of data.terms) for (const r of t.results ?? []) r.hidden = true;
  return roll.constructor.fromData(data);
}

/* -------------------------------------------- */
/*  Dający: Cwaniak przy cudzym rzucie           */
/* -------------------------------------------- */

/**
 * Kandydaci-dający dla cudzego rzutu: postacie, którymi ten widz gra, ze zdolnością, inne niż rzucający,
 * najbliższa w zasięgu z wolnym użyciem na początku.
 * @returns {{wybrany: object|null, wszyscy: object[]}}
 */
function _dajacy(ctx, abilityId, { tylkoSojusznik = false, kto = _gra } = {}) {
  const roller = ctx.actor;
  if (!roller) return { wybrany: null, wszyscy: [] };
  const wszyscy = game.actors
    .filter(a => a.type === "character" && a.id !== roller.id && kto(a))
    .map(a => ({ actor: a, item: _przedmiot(a, { abilityId }) }))
    .filter(o => o.item && (!tylkoSojusznik || _sojusznicy(o.actor, roller)))
    .map(o => ({ ...o, dystans: _dystans(o.actor, roller), left: _pozostalo(o.item) }));
  const wZasiegu = wszyscy.filter(o => o.dystans === null || o.dystans <= ZASIEG_CWANIAKA)
    .sort((a, b) => ((b.left ?? 1) > 0) - ((a.left ?? 1) > 0) || (a.dystans ?? 0) - (b.dystans ?? 0));
  return { wybrany: wZasiegu[0] ?? null, wszyscy };
}

function _ocenaDajacego(d, { label, kosc, brak }) {
  if (!d.wszyscy.length) return { stan: "ukryty" };
  const nazwa = d.wszyscy.length > 1 && d.wybrany ? ` (${d.wybrany.actor.name})` : "";
  const etykieta = `${label}${kosc ? ` +${_k(kosc)}` : ""}${nazwa}`;
  if (!d.wybrany) {
    const min = Math.min(...d.wszyscy.map(o => o.dystans ?? Infinity));
    return { stan: "szary", etykieta, powod: `poza zasięgiem ${ZASIEG_CWANIAKA} m (${Math.round(min * 10) / 10} m)` };
  }
  if (d.wybrany.left === 0) return { stan: "szary", etykieta, powod: brak };
  const uwagi = [];
  if (d.wybrany.dystans === null) uwagi.push("zasięg niesprawdzony — brak żetonów na scenie");
  if (znacznik(d.wybrany.actor, "R")) uwagi.push("Reakcja już zużyta w tej rundzie — użycie zgłosi MG");
  if (d.wybrany.left === null) uwagi.push("licznik użyć: stół (kopia zdolności sprzed M7)");
  return { stan: "aktywny", etykieta, ...(uwagi.length ? { powod: uwagi.join("; ") } : {}) };
}

/* -------------------------------------------- */
/*  Źródła                                       */
/* -------------------------------------------- */

const MOTYWACJA = {
  id: "motywacja", label: "🎵 Motywacja", klasa: "neuro-po-rzucie-motywacja", kolejnosc: 30,
  typy: TESTY_K20, styl: _styl("#d4a017"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const d = _dajacy(ctx, "motywacja", { tylkoSojusznik: true });
    const kosc = d.wybrany ? _kosc(d.wybrany.actor, "cwaniak.motywacja", "1d6") : null;
    return _ocenaDajacego(d, { label: this.label, kosc, brak: "brak użyć Motywacji (odnawia Krótki odpoczynek)" });
  },
  async wykonaj(ctx) {
    const d = _dajacy(ctx, "motywacja", { tylkoSojusznik: true }).wybrany;
    if (!d) return null;
    const kosc = _kosc(d.actor, "cwaniak.motywacja", "1d6");
    const roll = await rzutZDodatkiem(ctx.roll, kosc);
    return {
      roll,
      flavor: _flavor("#d4a017", "🎵 MOTYWACJA", `${esc(d.actor.name)} motywuje: +${_k(kosc)} (${roll.total - ctx.roll.total})`),
      poWiadomosci: async () => {
        await _zuzyj(d.item);
        await zadeklaruj(d.actor, "R", { zrodlo: "Motywacja" });
      }
    };
  }
};

const SZCZESCIE = {
  id: "szczescie", label: "🎲 Szczęście", klasa: "neuro-po-rzucie-szczescie", kolejnosc: 40,
  typy: TESTY_K20, przerzut: true, styl: _styl("#2e86c1"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const w = _wlasna(ctx, { abilityId: "szczescie" });
    if (!w) return { stan: "ukryty" };
    if (bramkaZajetaNa(w.item, "szczescie", "runda")) return { stan: "szary", etykieta: this.label, powod: "raz w rundzie" };
    return _stanLicznika(w.item, this.label, "brak użyć Szczęścia (odnawia Długi odpoczynek)");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { abilityId: "szczescie" });
    if (!w || !(await _potwierdz(ctx, "Szczęście", `<p><strong>${esc(w.actor.name)}</strong> powtarza test z tym samym Ułatwieniem lub Utrudnieniem.</p><p><em>Nowy wynik musisz zaakceptować.</em></p>`))) return null;
    const roll = await _przerzut(ctx);
    return {
      roll, flavor: _flavor("#2e86c1", "🎲 SZCZĘŚCIE", "przerzut — wynik trzeba zaakceptować"),
      poWiadomosci: async () => { await _zuzyj(w.item); await zajmijBramke(w.item, "szczescie"); }
    };
  }
};

/** Spieprzysz to!: gracz przy jawnym rzucie; MG — gdy właściciel Cwaniaka wyniku nie widzi (U6, P6). */
function _dajacySpieprzysz(ctx) {
  return _dajacy(ctx, "spieprzysz-to", {
    kto: a => {
      if (!game.user.isGM) return a.isOwner && _widziWynik(ctx.message, game.user);
      const gracze = game.users.filter(u => !u.isGM && u.active && a.testUserPermission(u, "OWNER"));
      return !gracze.length || gracze.every(u => !_widziWynik(ctx.message, u));
    }
  });
}

const SPIEPRZYSZ = {
  id: "spieprzysz-to", label: "💢 Spieprzysz to!", klasa: "neuro-po-rzucie-spieprzysz", kolejnosc: 50,
  typy: ["attack", "save"], przerzut: true, wynik: "sukces", styl: _styl("#c0392b"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    return _ocenaDajacego(_dajacySpieprzysz(ctx), { label: this.label, brak: "brak użyć (odnawia Krótki odpoczynek)" });
  },
  async wykonaj(ctx) {
    const d = _dajacySpieprzysz(ctx).wybrany;
    if (!d) return null;
    const nowy = await _przerzut(ctx);
    const gorszyNowy = Number(nowy.total) < Number(ctx.roll.total);
    const roll = gorszyNowy ? nowy : _kopiaBezAnimacji(ctx.roll);
    return {
      roll,
      flavor: _flavor("#c0392b", "💢 SPIEPRZYSZ TO!",
        `${esc(d.actor.name)}: przerzut ${nowy.total}, zostaje gorszy — ${roll.total}`),
      poWiadomosci: async () => {
        if (!gorszyNowy) void game.dice3d?.showForRoll?.(nowy, game.user, true);
        await _zuzyj(d.item);
        await zadeklaruj(d.actor, "R", { zrodlo: "Spieprzysz to!" });
      }
    };
  }
};

const LEB_JAK_SKLEP = {
  id: "leb-jak-sklep", label: "💡 Łeb jak sklep", klasa: "neuro-po-rzucie-leb", kolejnosc: 60,
  typy: ["ability", "skill", "tool"], styl: _styl("#8e44ad"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    if (ctx.info.type !== "tool" && ctx.info.ability !== "int") return { stan: "ukryty" };
    const w = _wlasna(ctx, { abilityId: "leb-jak-sklep" });
    if (!w) return { stan: "ukryty" };
    return _stanLicznika(w.item, `${this.label} +${_k(_kosc(w.actor, "spec.lebJakSklep", "1d4"))}`, "brak kości (odnawia Długi odpoczynek)");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { abilityId: "leb-jak-sklep" });
    if (!w) return null;
    const kosc = _kosc(w.actor, "spec.lebJakSklep", "1d4");
    const roll = await rzutZDodatkiem(ctx.roll, kosc);
    return {
      roll, flavor: _flavor("#8e44ad", "💡 ŁEB JAK SKLEP", `+${_k(kosc)} (${roll.total - ctx.roll.total})`),
      poWiadomosci: () => _zuzyj(w.item)
    };
  }
};

const AMEN = {
  id: "amen", label: "✝ Amen +1k6", klasa: "neuro-po-rzucie-amen", kolejnosc: 70,
  typy: TESTY_K20, wynik: "porazka", zamyka: true, styl: _styl("#7f8c8d"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const w = _wlasna(ctx, { abilityId: "amen" });
    if (!w) return { stan: "ukryty" };
    return _stanLicznika(w.item, this.label, "brak użyć Amen (odnawia Długi odpoczynek)");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { abilityId: "amen" });
    if (!w) return null;
    const roll = await rzutZDodatkiem(ctx.roll, "1d6");
    return {
      roll, flavor: _flavor("#7f8c8d", "✝ AMEN", `+1k6 (${roll.total - ctx.roll.total}) — nowy wynik trzeba zaakceptować`),
      poWiadomosci: () => _zuzyj(w.item)
    };
  }
};

/** RPŚ zamieniony z porażki na sukces po rzucie: liczniki jak przy sukcesie, trzeci stabilizuje (s. 34, U7). */
async function _korektaRPS(actor, naturalna) {
  const death = actor.system?.attributes?.death ?? {};
  const k = korektaRPS(death, { naturalna });
  await actor.update({ "system.attributes.death.success": k.success, "system.attributes.death.failure": k.failure });
  if (k.outcome === "stable") {
    if (game.user.isGM) await stabilizuj(actor, { zrodlo: "rzuty" });
    else await poprosOStabilizacje(actor, { zrodlo: "rzuty", pomocnik: actor });
  }
  const dawnaSmierc = (Number(death.failure) || 0) >= 3;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${esc(actor.name)}</strong> — Twardość zmienia RPŚ na sukces: sukcesy ${k.outcome === "stable" ? "3 — stabilny" : k.success}, porażki ${k.failure}.`
      + `${dawnaSmierc ? " Karta „Śmierć” z tego rzutu jest nieaktualna (MG)." : ""}</p>`,
    ...(dawnaSmierc ? { whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id).concat(game.user.id) } : {})
  });
}

const TWARDOSC = {
  id: "twardosc", label: "🪨 Twardość", klasa: "neuro-po-rzucie-twardosc", kolejnosc: 80,
  typy: ["save", "death"], wynik: "porazka", styl: _styl("#795548"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const w = _wlasna(ctx, { abilityId: "twardosc" });
    if (!w) return { stan: "ukryty" };
    return _stanLicznika(w.item, `${this.label} +${_k(_kosc(w.actor, "twardziel.twardosc", "1d4"))}`, "pula Twardości pusta (odnawia Długi odpoczynek)");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { abilityId: "twardosc" });
    if (!w) return null;
    const kosc = _kosc(w.actor, "twardziel.twardosc", "1d4");
    const roll = await rzutZDodatkiem(ctx.roll, kosc);
    return {
      roll, flavor: _flavor("#795548", "🪨 TWARDOŚĆ", `+${_k(kosc)} (${roll.total - ctx.roll.total})${ctx.typ === "death" ? " — Rzut Przeciw Śmierci" : ""}`),
      poWiadomosci: async () => {
        await _zuzyj(w.item);
        if (ctx.typ === "death" && Number(roll.total) >= PROG_RPS && Number(ctx.roll.total) < PROG_RPS) await _korektaRPS(w.actor, ctx.naturalna);
      }
    };
  }
};

const POPRAWKA = {
  id: "clint-poprawka", label: "🔫 Poprawka", klasa: "neuro-po-rzucie-poprawka", kolejnosc: 90,
  typy: ["attack"], przerzut: true, styl: _styl("#a0522d"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const w = _wlasna(ctx, { abilityId: "clint" });
    if (!w) return { stan: "ukryty" };
    const bron = ctx.info.itemUuid ? fromUuidSync(ctx.info.itemUuid) : null;
    if (!isFirearm(bron)) return { stan: "ukryty" };
    if (_pozostalo(w.item) === null && bramkaZajetaNa(w.item, "clint-poprawka", "walka")) {
      return { stan: "szary", etykieta: this.label, powod: "raz na walkę" };
    }
    return _stanLicznika(w.item, this.label, "już użyta w tej walce");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { abilityId: "clint" });
    if (!w || !(await _potwierdz(ctx, "Poprawka (Clint)", `<p><strong>${esc(w.actor.name)}</strong> powtarza Test Ataku bronią palną — raz na walkę.</p>`))) return null;
    const roll = await _przerzut(ctx);
    return {
      roll, flavor: _flavor("#a0522d", "🔫 POPRAWKA", "przerzut Testu Ataku — raz na walkę"),
      poWiadomosci: async () => { await _zuzyj(w.item); await zajmijBramke(w.item, "clint-poprawka"); }
    };
  }
};

const CZAS_PATRIOTOW = {
  id: "czas-patriotow", label: "🗽 Czas patriotów +5", klasa: "neuro-po-rzucie-patrioci", kolejnosc: 100,
  typy: ["ability", "skill", "tool", "save"], styl: _styl("#1f618d"), stylSzary: STYL_SZARY,
  ocen(ctx) {
    const w = _wlasna(ctx, { originAbilityId: "czas-patriotow" });
    if (!w) return { stan: "ukryty" };
    return _stanLicznika(w.item, this.label, "już użyty (odnawia Długi odpoczynek)");
  },
  async wykonaj(ctx) {
    const w = _wlasna(ctx, { originAbilityId: "czas-patriotow" });
    if (!w) return null;
    const roll = await rzutZDodatkiem(ctx.roll, "5");
    return { roll, flavor: _flavor("#1f618d", "🗽 CZAS PATRIOTÓW", "+5"), poWiadomosci: () => _zuzyj(w.item) };
  }
};

const FART = {
  id: "fart", label: "🍀 Fart", kolejnosc: 5,
  typy: TESTY_K20, przerzut: true, wynik: "naturalna1",
  /** D7: odpala sam przy pierwszej naturalnej 1 po odpoczynku — tylko z licznikiem na przedmiocie. */
  auto(ctx) {
    if (ctx.naturalna !== 1) return false;
    const item = _przedmiot(ctx.actor, { originAbilityId: "fart" });
    return !!item && (_pozostalo(item) ?? 0) > 0;
  },
  ocen(ctx) {
    const item = _przedmiot(ctx.actor, { originAbilityId: "fart" });
    return item && (_pozostalo(item) ?? 0) > 0 ? { stan: "aktywny" } : { stan: "ukryty" };
  },
  async wykonaj(ctx) {
    const item = _przedmiot(ctx.actor, { originAbilityId: "fart" });
    if (!item) return null;
    const roll = await _przerzut(ctx);
    return {
      roll, flavor: _flavor("#27ae60", "🍀 FART", "naturalna 1 — przerzut (raz na Krótki odpoczynek), wynik trzeba zaakceptować"),
      poWiadomosci: () => _zuzyj(item)
    };
  }
};

/** Kocie kości: ile kości dorzucić (RAW „jedną lub więcej”). */
async function _ileKosci(max, kosc) {
  if (max <= 1) return max;
  const opcje = Array.fromRange(max, 1).map(n => `<option value="${n}">${n} × ${_k(kosc)}</option>`).join("");
  const n = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Kocie kości" },
    content: `<label>Ile kości dorzucić? <select name="n">${opcje}</select></label>`,
    ok: { label: "Dorzuć", callback: (_e, button) => Number(button.form.elements.n.value) },
    rejectClose: false
  });
  return Number(n) || 0;
}

function _kocieKosci({ id, label, skill, reakcja, kolejnosc }) {
  return {
    id, label, klasa: `neuro-po-rzucie-${id}`, kolejnosc, typy: ["skill"], styl: _styl("#6c3483"), stylSzary: STYL_SZARY,
    ocen(ctx) {
      if (ctx.info.skillId !== skill) return { stan: "ukryty" };
      const w = _wlasna(ctx, { abilityId: "kocie-kosci" });
      if (!w) return { stan: "ukryty" };
      return _stanLicznika(w.item, `${label} (${_k(_kosc(w.actor, "zlodziej.kocieKosci", "1d4"))})`, "brak Kocich kości (odnawia Długi odpoczynek)");
    },
    async wykonaj(ctx) {
      const w = _wlasna(ctx, { abilityId: "kocie-kosci" });
      if (!w) return null;
      const kosc = _kosc(w.actor, "zlodziej.kocieKosci", "1d4");
      const left = _pozostalo(w.item);
      const n = await _ileKosci(left === null ? 5 : left, kosc);
      if (!n) return null;
      const roll = await rzutZDodatkiem(ctx.roll, kosc.replace(/^\d*/, String(n)));
      return {
        roll, flavor: _flavor("#6c3483", `🐾 ${label.toUpperCase()}`, `+${n}${_k(kosc.replace(/^\d*/, ""))} (${roll.total - ctx.roll.total})`),
        poWiadomosci: async () => {
          await _zuzyj(w.item, n);
          if (reakcja) await zadeklaruj(w.actor, "R", { zrodlo: `Kocie kości — ${label}` });
        }
      };
    }
  };
}

/* -------------------------------------------- */
/*  Urodzony morderca — `r1` na kościach obrażeń */
/* -------------------------------------------- */

/**
 * „Jeśli na kości obrażeń wypadnie 1, możesz raz powtórzyć rzut tą kością” (s. 63). Wybór jest zdominowany — przerzut
 * jedynki nie może jej pogorszyć — więc zamiast przycisku modyfikator `r1` (rdzeń: jeden przerzut, bez rekursji) na
 * każdej kości obrażeń posiadacza. Po konfiguracji rzutu, przed rzutem — części ze skali (`@scale…`) są już kośćmi.
 */
function _onPostDamageRollConfiguration(rolls, config) {
  const subject = config?.subject;
  const actor = subject?.actor ?? (subject instanceof Actor ? subject : null);
  if (!actor || !_przedmiot(actor, { originAbilityId: "urodzony-morderca" })) return;
  for (const roll of rolls ?? []) {
    let zmiana = false;
    for (const term of roll.terms ?? []) {
      if (!(term instanceof foundry.dice.terms.Die)) continue;
      if (term.modifiers.some(m => /^r/i.test(m))) continue;
      term.modifiers.push("r1");
      zmiana = true;
    }
    if (zmiana) {
      roll.resetFormula();
      roll.options.neuroUrodzonyMorderca = true;
    }
  }
}

/* -------------------------------------------- */

export function registerZdolnosciPoRzucie() {
  for (const row of [
    FART, MOTYWACJA, SZCZESCIE, SPIEPRZYSZ, LEB_JAK_SKLEP, AMEN, TWARDOSC, POPRAWKA, CZAS_PATRIOTOW,
    _kocieKosci({ id: "kocie-kosci-ciche", label: "Ciche łapy", skill: "skr", reakcja: true, kolejnosc: 110 }),
    _kocieKosci({ id: "kocie-kosci-zgrabne", label: "Zgrabne łapy", skill: "akr", reakcja: false, kolejnosc: 111 })
  ]) zarejestrujZrodloPoRzucie(row);
  Hooks.on("dnd5e.postDamageRollConfiguration", _onPostDamageRollConfiguration);
  console.log(`${MODULE_ID} | Zdolności po rzucie (M7 E1) registered`);
}

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({ _dajacy, _wlasna, _pozostalo, _kosc, _onPostDamageRollConfiguration, MOTYWACJA, SPIEPRZYSZ, FART });
