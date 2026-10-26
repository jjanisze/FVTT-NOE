/**
 * Neuroshima 5e — autodestrukcja maszyn (PLAN_m5_postoj.md §7.18, U19–U23; NOE s. 204).
 *
 * Maszyna z cechą „Autodestrukcja (N%)” schodzi do 0 PW (karta „BN pada”, `combat/umieranie.mjs`) → **szept MG**
 * z [Rzuć k100]. Wynik w szansie → k4 rund odliczania; w walce tyka raz na rundę (na jej początku — martwa maszyna
 * zwykle wypada z kolejki, więc jej własna tura by nie przyszła; `tikRaz` pilnuje, żeby cofnięcie i ponowne „naprzód”
 * nie tykało drugi raz), z linią dla stołu „Gladiator: 2 rundy do wybuchu”; poza walką — linia „za N × 6 s” i
 * [Wybuch] u MG. Koniec → wybuch ścieżką granatów (`explosiveInternals`: dźwięk, błysk, ślad i karta z RO i
 * obrażeniami) + wrak: grafika żetonu → `tokens/wraki/<rozmiar>.webp` (gdy plik jest; inaczej przyciemnienie),
 * „(wrak)” w nazwie, oryginał w fladze żetonu i [Przywróć grafikę] u MG. Poza szansą — „bez wybuchu”.
 *
 * Awaria 20 drona (karta „Śmierć — autodestrukcja” potwierdzona przez MG) → od razu ta sama ścieżka, bez k100 i
 * odliczania; bez parametrów wybuchu w statblocku — tylko wrak i linia dla MG. Tak samo akcja „Detonacja”
 * (automatyka `detonacja`, Kurczak wybuchowy): użycie akcji przez MG to decyzja — wybuch od razu.
 *
 * Flaga na aktorze żetonu: `autodestrukcja = { stan: "czeka"|"odlicza"|"wybuch"|"bez"|"anulowane", rundy, wynik,
 * poza, zniszczone }` — bebeszenie czyta `stan === "wybuch"` (po wybuchu zostaje tylko MK, s. 204).
 */

import { BESTIARY } from "../config/bestiary-data.mjs";
import { czyWybucha, odliczanie, rozmiarWraku, szansaZNazwy, tikOdliczania, zniszczoneSurowce } from "../config/autodestrukcja-rules.mjs";
import { explosiveInternals as X } from "../actors/grenade-inventory.mjs";
import { krokNaprzod, tikRaz } from "./tiki.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAGA = "autodestrukcja";
const FLAGA_WRAKU = "wrak";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ETYKIETY_CECH = { str: "Siłę", dex: "Zręczność", con: "Kondycję", int: "Inteligencję", wis: "Mądrość", cha: "Charyzmę" };

/* -------------------------------------------- */
/*  Dane                                         */
/* -------------------------------------------- */

/**
 * Parametry autodestrukcji maszyny: automatyka cechy z paczki → dane Bestiariusza po id → cecha
 * „Autodestrukcja (N%)” z opisem (maszyna MG spoza Bestiariusza). `null` — maszyna bez cechy.
 * @returns {{szansa: number, promien: number, rzut: {cecha: string, st: number}, obrazenia: {wzor: string}[], stany: string[], czasStanow?: string, polowa?: boolean, tekst?: string}|null}
 */
export function daneAutodestrukcji(actor) {
  if (!actor) return null;
  for (const i of actor.items) {
    const a = i.flags?.[MODULE_ID]?.bestiary?.automation;
    if (a?.kind === "autodestrukcja") return { ...a, tekst: _tekst(i) };
  }
  const id = actor.flags?.[MODULE_ID]?.bestiary?.id;
  const f = BESTIARY[id]?.features?.find(x => x.automation?.kind === "autodestrukcja");
  if (f) return { ...f.automation, tekst: f.text };
  const cecha = actor.items.find(i => szansaZNazwy(i.name) !== null);
  if (!cecha) return null;
  const tekst = _tekst(cecha);
  const ro = X.parseSaveSpec(tekst);
  const promien = /w promieniu (\d+(?:[.,]\d+)?) m/i.exec(tekst);
  const wzor = X.parseDamageSpec(tekst).formula;
  return {
    szansa: szansaZNazwy(cecha.name), promien: promien ? Number(promien[1].replace(",", ".")) : 3,
    rzut: { cecha: ro.ability ?? "dex", st: ro.dc ?? 15 }, obrazenia: wzor ? [{ wzor, typ: "explosive" }] : [],
    stany: [], polowa: /połow/i.test(tekst), tekst
  };
}

const _tekst = item => String(item?.system?.description?.value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function stanAutodestrukcji(actor) {
  return actor?.getFlag?.(MODULE_ID, FLAGA) ?? null;
}

/**
 * Dokument żetonu maszyny: aktor syntetyczny ma swój; połączony — na oglądanej scenie, potem aktywnej, potem
 * dowolnej. Dokument, nie placeable: maszyna może stać na scenie, której MG akurat nie ogląda.
 */
function _zeton(actor) {
  if (!actor) return null;
  if (actor.token) return actor.token;
  const sceny = [canvas?.scene, game.scenes?.active, ...(game.scenes?.contents ?? [])].filter(Boolean);
  for (const s of sceny) {
    const t = s.tokens.find(x => x.actorLink && x.actorId === actor.id);
    if (t) return t;
  }
  return null;
}

/** Środek żetonu w pikselach sceny (v14: x/y żetonu to lewy górny róg). */
function _srodek(doc) {
  const g = doc.parent?.grid?.size ?? 100;
  return { x: doc.x + (doc.width * g) / 2, y: doc.y + (doc.height * g) / 2 };
}

const _nazwa = actor => actor?.token?.name ?? actor?.name ?? "Maszyna";

/* -------------------------------------------- */
/*  Karta MG i k100                              */
/* -------------------------------------------- */

/** Maszyna z cechą zeszła do 0 PW — szept MG z [Rzuć k100] (raz). */
export async function zaproponujAutodestrukcje(actor) {
  if (!game.user.isGM) return null;
  const d = daneAutodestrukcji(actor);
  if (!d) return null;
  const st = stanAutodestrukcji(actor);
  if (st && st.stan !== "czeka") return null;
  await actor.setFlag(MODULE_ID, FLAGA, { stan: "czeka" });
  return wyslijKarte(kartaPostoju({
    ikona: actor.img, tytul: `Autodestrukcja (${d.szansa}%): ${_nazwa(actor)}`, podtytul: "0 PW · tylko MG", rodzaj: "braki",
    linie: [`Maszyna przy 0 PW: k100 ≤ ${d.szansa}% — wybuch po k4 rundach, zniszczone surowce elektroniczne, chemiczne i części (s. 204).`,
      `Wybuch: RO na ${ETYKIETY_CECH[d.rzut.cecha] ?? d.rzut.cecha} ST ${d.rzut.st}, promień ${d.promien} m, ${d.obrazenia.map(o => o.wzor).join(" + ") || "—"}.`],
    przyciski: [{ akcja: "autodestrukcjaK100", label: "Rzuć k100", ikona: "fa-solid fa-dice-d20", gm: true, dane: { aktor: actor.uuid } }]
  }), { szept: "gm", actor, flagi: { autodestrukcja: { aktor: actor.uuid } } });
}

/** k100 w ukryciu (szept bez rzutu — wynik w treści) → odliczanie albo „bez wybuchu”. */
export async function rzutAutodestrukcji(actor, { k100 = null, k4 = null } = {}) {
  if (!game.user.isGM) return null;
  const d = daneAutodestrukcji(actor);
  if (!d) return null;
  const k = k100 ?? (await new Roll("1d100").evaluate()).total;
  if (!czyWybucha(k, d.szansa)) {
    await actor.setFlag(MODULE_ID, FLAGA, { stan: "bez", wynik: k });
    await wyslijKarte(kartaPostoju({ ikona: actor.img, tytul: `${_nazwa(actor)}: bez wybuchu`, podtytul: "tylko MG",
      linie: [`k100 = <strong>${k}</strong> > ${d.szansa}% — maszyna nie wybucha; cała pula do bebeszenia.`] }), { szept: "gm" });
    return { wybuch: false, k100: k };
  }
  const rundy = odliczanie(k4 ?? (await new Roll("1d4").evaluate()).total);
  const walka = _walkaMaszyny(actor);
  await actor.setFlag(MODULE_ID, FLAGA, { stan: "odlicza", rundy, wynik: k, poza: !walka });
  const przyciski = [{ akcja: "autodestrukcjaAnuluj", label: "Anuluj odliczanie", ikona: "fa-solid fa-ban", gm: true, dane: { aktor: actor.uuid } }];
  if (!walka) przyciski.unshift({ akcja: "autodestrukcjaWybuch", label: "Wybuch", ikona: "fa-solid fa-burst", gm: true, dane: { aktor: actor.uuid } });
  await wyslijKarte(kartaPostoju({
    ikona: actor.img, tytul: `${_nazwa(actor)}: autodestrukcja!`, podtytul: "tylko MG", rodzaj: "braki",
    linie: [`k100 = <strong>${k}</strong> ≤ ${d.szansa}% — wybuch po <strong>${rundy}</strong> ${rundy === 1 ? "rundzie" : "rundach"} (k4).`,
      walka ? "Odliczanie na początku każdej rundy walki." : `Poza walką: za ${rundy} × 6 s — [Wybuch], gdy MG zdecyduje.`],
    przyciski
  }), { szept: "gm" });
  await _linia(actor, walka ? `${rundy} ${_rund(rundy)} do wybuchu` : `coś w środku zaczyna piszczeć — za ${rundy} × 6 s wybuch`);
  return { wybuch: true, k100: k, rundy };
}

const _rund = n => (n === 1 ? "runda" : n < 5 ? "rundy" : "rund");

/** Rozpoczęta walka z tą maszyną — dowolna scena (`game.combat` to tylko walka oglądanej sceny). */
function _walkaMaszyny(actor) {
  return game.combats.find(c => c.started && c.combatants.some(x => x.actor === actor || (actor.token && x.tokenId === actor.token.id))) ?? null;
}

/** Linia dla stołu (publiczna): odliczanie słychać. */
async function _linia(actor, tekst) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p class="neuro-autodestrukcja-linia"><i class="fa-solid fa-triangle-exclamation" inert></i> <strong>${esc(_nazwa(actor))}</strong>: ${esc(tekst)}</p>`,
    flags: { [MODULE_ID]: { autodestrukcjaLinia: true } }
  });
}

/* -------------------------------------------- */
/*  Odliczanie w walce                           */
/* -------------------------------------------- */

async function _onUpdateCombat(combat, changed) {
  if (!game.user.isActiveGM) return;
  if (!("round" in changed)) return;
  if (!krokNaprzod(combat.previous, combat.current)) return;
  for (const c of combat.combatants) {
    const actor = c.actor;
    const f = stanAutodestrukcji(actor);
    if (f?.stan !== "odlicza" || f.poza) continue;
    if (!await tikRaz(actor, "autodestrukcja", combat, { round: combat.round, combatantId: c.id, krawedz: "start" })) continue;
    const t = tikOdliczania(f);
    if (t.wybuch) await wybuch(actor);
    else {
      await actor.setFlag(MODULE_ID, FLAGA, { ...f, stan: t.stan, rundy: t.rundy });
      await _linia(actor, `${t.rundy} ${_rund(t.rundy)} do wybuchu`);
    }
  }
}

/* -------------------------------------------- */
/*  Wybuch i wrak                                */
/* -------------------------------------------- */

async function _plikIstnieje(src) {
  try { return (await fetch(src, { method: "HEAD" })).ok; } catch { return false; }
}

/** Wrak na mapie (U23): grafika wg rozmiaru, gdy plik jest; inaczej przyciemnienie. Oryginał w fladze żetonu. */
export async function wrak(tokenDoc, rozmiar) {
  if (!tokenDoc || tokenDoc.getFlag(MODULE_ID, FLAGA_WRAKU)) return null;
  const orig = { src: tokenDoc.texture.src, tint: tokenDoc.texture.tint ?? null, name: tokenDoc.name };
  const src = `modules/${MODULE_ID}/tokens/wraki/${rozmiarWraku(rozmiar)}.webp`;
  const jest = await _plikIstnieje(src);
  await tokenDoc.update({
    ...(jest ? { "texture.src": src } : { "texture.tint": "#4a4a4a" }),
    name: `${orig.name} (wrak)`,
    [`flags.${MODULE_ID}.${FLAGA_WRAKU}`]: orig
  });
  return { src: jest ? src : null };
}

/** [Przywróć grafikę] — oryginalny obraz, odcień i nazwa żetonu. */
export async function przywrocZeton(tokenDoc) {
  const orig = tokenDoc?.getFlag(MODULE_ID, FLAGA_WRAKU);
  if (!orig) return false;
  await tokenDoc.update({ "texture.src": orig.src, "texture.tint": orig.tint ?? "#ffffff", name: orig.name, [`flags.${MODULE_ID}.${FLAGA_WRAKU}`]: _del });
  return true;
}

/**
 * Wybuch maszyny: ślad i karta ścieżką granatów, zniszczone surowce, wrak, karta MG z [Przywróć grafikę].
 * @param {Actor} actor
 * @param {{powod?: string}} [o]
 */
export async function wybuch(actor, { powod = "autodestrukcja" } = {}) {
  if (!game.user.isGM) return null;
  const f = stanAutodestrukcji(actor);
  if (f?.stan === "wybuch") return null;
  const d = daneAutodestrukcji(actor);
  const token = _zeton(actor);
  const zniszczone = zniszczoneSurowce();
  await actor.setFlag(MODULE_ID, FLAGA, { ...(f ?? {}), stan: "wybuch", rundy: 0, zniszczone });
  const linie = [];
  if (d && token) {
    const side = Math.max(1, d.promien * 2);
    const area = { kind: "cube", side, label: `promień ${d.promien} m` };
    const nazwa = `Autodestrukcja: ${_nazwa(actor)}`;
    const { x, y } = _srodek(token);
    await X.requestBlast(actor, {
      sceneId: token.parent.id, kind: "explosion", x, y, area, color: "#e06666",
      itemName: nazwa, areaText: area.label, damageType: "explosive", hasDamageFormula: d.obrazenia.length > 0
    }, "grenade");
    const wzory = d.obrazenia.map(o => String(o.wzor).replace(/(\d)d(\d)/g, "$1k$2")).join(" + ");
    const ro = `RO na ${ETYKIETY_CECH[d.rzut.cecha] ?? d.rzut.cecha} ST ${d.rzut.st}`;
    const stany = (d.stany ?? []).map(s => game.i18n.localize(CONFIG.statusEffects.find(e => e.id === s)?.name ?? s));
    await X.postExplosiveCard(actor, {
      itemName: nazwa, itemImg: actor.img, badge: "",
      save: X.parseSaveSpec(ro), damage: X.parseDamageSpec(`${wzory} obrażeń wybuchowych`), ignite: null, isMine: false,
      areaLabel: `promień ${d.promien} m`, saveText: ro,
      effectText: `${wzory} obrażeń wybuchowych${stany.length ? `, ${stany.join(" i ")}${d.czasStanow ? ` na ${d.czasStanow}` : ""}` : ""}${d.polowa ? "; sukces — połowa obrażeń" : ""}.`
    }, { detonated: true, note: `<strong>Autodestrukcja</strong> (s. 204)${
      powod === "awaria" ? " — awaria 20" : powod === "detonacja" ? " — Detonacja (akcja)" : ""}.` });
  } else {
    linie.push(d ? "Brak żetonu na scenie — wybuch rozstrzyga MG." : "Statblock bez parametrów wybuchu — wybuch rozstrzyga MG.");
  }
  if (token) {
    const w = await wrak(token, actor.system?.traits?.size);
    linie.push(w?.src ? "Żeton: wrak." : "Żeton przyciemniony (grafika wraku jeszcze nie dotarła).");
  }
  if (!actor.statuses?.has("dead")) await actor.toggleStatusEffect("dead", { active: true, overlay: true });
  linie.unshift(`Zniszczone surowce: elektronika, chemikalia, części — zostaje metal (s. 204).`);
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/explosion.svg", tytul: `Wybuch: ${_nazwa(actor)}`, podtytul: "tylko MG", linie,
    przyciski: token ? [{ akcja: "autodestrukcjaPrzywroc", label: "Przywróć grafikę", ikona: "fa-solid fa-rotate-left", gm: true, dane: { token: token.uuid } }] : []
  }), { szept: "gm" });
  Hooks.callAll("neuroshima.autodestrukcja", actor, { powod });
  return { token };
}

/**
 * Akcja „Detonacja” (automatyka `detonacja`): MG użył akcji istoty — wybuch od razu, bez k100 i odliczania.
 * @param {{item?: Item, actor?: Actor}} activity  aktywność z `dnd5e.postUseActivity`
 * @returns {Promise<object|null>}
 */
export async function detonacjaZAkcji(activity) {
  const a = activity?.item?.flags?.[MODULE_ID]?.bestiary?.automation;
  if (a?.kind !== "detonacja" || !game.user.isGM || !activity.actor) return null;
  return wybuch(activity.actor, { powod: "detonacja" });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerAutodestrukcja() {
  Hooks.on("updateCombat", _onUpdateCombat);
  Hooks.on("neuroshima.bnPada", actor => { void zaproponujAutodestrukcje(actor); });
  Hooks.on("dnd5e.postUseActivity", activity => { void detonacjaZAkcji(activity); });
  Hooks.on("neuroshima.smiercPotwierdzona", (actor, karta) => {
    if (karta?.przyczyna === "autodestrukcja" && game.user.isGM) void wybuch(actor, { powod: "awaria" });
  });
  zarejestrujAkcje("autodestrukcjaK100", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    btn.disabled = true;
    if (actor) await rzutAutodestrukcji(actor);
  });
  zarejestrujAkcje("autodestrukcjaWybuch", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    btn.disabled = true;
    if (actor) await wybuch(actor);
  });
  zarejestrujAkcje("autodestrukcjaAnuluj", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    const f = stanAutodestrukcji(actor);
    if (f?.stan !== "odlicza") return;
    await actor.setFlag(MODULE_ID, FLAGA, { ...f, stan: "anulowane" });
    btn.disabled = true;
    await _linia(actor, "piszczenie cichnie");
  });
  zarejestrujAkcje("autodestrukcjaPrzywroc", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const t = await fromUuid(btn.dataset.token);
    if (await przywrocZeton(t)) btn.disabled = true;
  });
}

export const autodestrukcjaApi = Object.freeze({
  dane: daneAutodestrukcji, stan: stanAutodestrukcji, zaproponuj: zaproponujAutodestrukcje, rzut: rzutAutodestrukcji,
  wybuch, wrak, przywroc: przywrocZeton, detonacja: detonacjaZAkcji
});
