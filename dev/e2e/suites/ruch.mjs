/**
 * Suite — ekonomia tury M8: ruch i akcje (PLAN_m8_ruch_i_ekonomia_akcji E1–E2, E4, E7; §11 T01, T02, T07, T21, T22).
 * GM i jeden gracz, wszystko z uprawnieniami gracza i przez MG-wykonawcę ledgera (`User#query`).
 *
 *  - GM: scena 1,5 m, PC Gracz 1 z Szybkością 9 m pierwszy w walce, BN drugi.
 *  - Gracz 1: karta — panel ruchu i akcji (9/9 m, A 1/1) w panelu Stan.
 *  - Gracz 1: rusza swoim żetonem 2 pola na oglądanej scenie (natywny koszt) → MG zapisuje 3 m; karta 6/9.
 *  - Gracz 1: prawdziwy klik [Biegnij] na karcie → A 0/1, +18 m, stan Bieganie; 24/27.
 *  - Gracz 1: zaplanowana ścieżka — etykieta linijki „zostaje 9 m” (zielony) / „ponad pulę −6 m” (czerwony, zrzut).
 *  - Gracz 1: ruch ponad pulę → wartość ujemna i trwałe ostrzeżenie na karcie (zrzut); natywne Undo → koszt wraca.
 *  - Gracz 1: [Skok] na karcie — kalkulator NOE (zrzut), tryb Skok bez kosztu; skok 6 m po 3 m rozbiegu przy SIŁ 14 →
 *    koszt 1:1 i trwałe ostrzeżenie „ponad zasięg 4,2 m” zapisane przez MG (E3, T15, T18).
 *  - Runda 2: [Wyczekaj] z notatką (A), [Pomóż] otwarte i zamknięte bez kosztu; w turze BN [Reaguj] → wykonanie
 *    przygotowania (R) → [Biegnij] w tej samej reakcji (bez drugiej R, 18 m), ochrona przed ostrzałem (D32);
 *    następna tura zamyka reakcję (E5, T12, T28).
 *  - Runda 3: atak bronią przez okno — pole „Sposób ataku” (tylko właściwe opcje, domyślnie nowa A), koszt zapisany
 *    przy rzucie, plakietka na karcie (E6, T30, T37).
 *  - GM: następna tura — rdzeń czyści historie, ruch gracza „—” (poza turą), R 1/1; gracz deklaruje R →
 *    znacznik „Reakcja zużyta” (projekcja); ponowione id nie wydaje drugi raz; MG zdejmuje znacznik z HUD — korekta.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: scena 1,5 m, Szybkość 9 m, walka z PC Gracz 1 na początku. */
async function przygotuj() {
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  for (const c of game.combats.contents) await c.delete();
  const scene = canvas.scene;
  await scene.update({ "grid.distance": 1.5, "grid.units": "m", "grid.diagonals": CONST.GRID_DIAGONALS.EQUIDISTANT });
  const p1 = game.actors.getName("PC Gracz 1");
  await p1.update({ "system.attributes.movement.speeds.walk": 9, "system.attributes.movement.units": "m" });
  for (const s of ["bieganie", "prone", "dodging"]) if (p1.statuses.has(s)) await p1.toggleStatusEffect(s, { active: false });
  const t1 = scene.tokens.find(t => t.actor?.id === p1.id);
  // Wolne pole z miejscem w prawo (bez ścian szopy na drodze).
  await t1.move({ x: 2 * scene.grid.size, y: 15 * scene.grid.size, action: "displace" }, { animate: false });
  await t1.clearMovementHistory();
  const npc = scene.tokens.find(t => t.actor?.type === "npc");
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [
    { tokenId: t1.id, sceneId: scene.id, actorId: p1.id, initiative: 20 },
    { tokenId: npc.id, sceneId: scene.id, actorId: npc.actorId, initiative: 10 }
  ]);
  await combat.startCombat();
  await window.__e2e.until(() => combat.combatant?.actor?.id === p1.id, { message: "PC Gracz 1 on turn" });
  return { naRuchu: combat.combatant?.name, token: t1.uuid };
}

/** Gracz 1: otwórz swoją kartę, przeczytaj panel M8. */
async function panel() {
  const a = game.user.character;
  if (!a.sheet.rendered) await a.sheet.render({ force: true });
  const el = await window.__e2e.until(() => a.sheet.element?.querySelector(".neuro-m8-panel"), { message: "the M8 panel on the sheet" });
  const txt = sel => el.querySelector(sel)?.textContent.trim() ?? null;
  return {
    ruch: txt(".neuro-m8-licznik.ruch"), A: txt('[data-kind="A"]'), B: txt('[data-kind="B"]'), R: txt('[data-kind="R"]'),
    ostrz: [...el.querySelectorAll(".neuro-m8-ostrz")].map(x => x.textContent.trim()),
    ponad: !!el.querySelector(".neuro-m8-licznik.ruch.ponad")
  };
}

/** Gracz 1: ruch własnym żetonem o `pola` w prawo (oglądana scena — token wyrenderowany, koszt natywny). */
async function rusz({ pola }) {
  const tok = canvas.tokens.placeables.find(t => t.actor?.id === game.user.character.id);
  const g = canvas.scene.grid.size;
  await tok.document.move({ x: tok.document.x + pola * g, y: tok.document.y }, { animate: false });
  const eko = await import("/modules/neuroshima-2026-overrides/scripts/combat/ekonomia.mjs");
  const c = eko.kombatant(tok.document);
  return { wykonawcaGM: eko.wykonawca(c)?.isGM === true, ja: game.user.isGM };
}

/** Odczyt stanu ekonomii PC Gracz 1 (każdy klient). */
function stanPC() {
  const a = game.actors.getName("PC Gracz 1");
  const s = game.neuroshima.actions.stan(a);
  if (!s) return null;
  return {
    pozostalo: s.ruch.pozostalo, pojemnosc: s.ruch.pojemnosc, dostepny: s.ruch.dostepny, A: s.pule.A.pozostalo, R: s.pule.R.pozostalo,
    ruchy: s.ledger.ruchy.map(r => ({ koszt: r.koszt, cofniety: !!r.cofniety, niepelny: !!r.niepelny })),
    bieganie: a.statuses.has("bieganie"), znacznikR: !!game.neuroshima.actions.znacznik(a, "R"), ops: s.ledger.ops.map(o => o.rodzaj)
  };
}

/** Gracz 1: prawdziwy klik [Biegnij] w panelu karty. */
async function biegnij() {
  const a = game.user.character;
  const el = await window.__e2e.until(() => a.sheet.element?.querySelector(".neuro-m8-panel"), { message: "panel" });
  const btn = [...el.querySelectorAll(".neuro-akcja-btn")].find(b => b.textContent.trim() === "Biegnij");
  btn.click();
  return !!btn;
}

/**
 * Gracz 1: zaplanowana ścieżka o `pola` w prawo — to, co linijka dostaje przy przeciąganiu (`_plannedMovement`),
 * bez ruchu. Zwraca tekst etykiety M8 i kolor odcinka.
 */
async function planuj({ pola, zostaw = false }) {
  const tok = canvas.tokens.placeables.find(t => t.actor?.id === game.user.character.id);
  const d = tok.document;
  const g = canvas.scene.grid.size;
  if (pola === null) {
    delete tok._plannedMovement[game.user.id];
    tok.hover = false;
    tok.renderFlags.set({ refreshRuler: true, refreshState: true });
    return null;
  }
  const baza = { x: d.x, y: d.y, elevation: d.elevation, width: d.width, height: d.height, depth: d.depth, shape: d.shape,
    level: d.level, action: "walk", snapped: true, explicit: true, checkpoint: true, terrain: null, intermediate: false };
  const foundPath = d.getCompleteMovementPath([{ ...baza }, { ...baza, x: d.x + pola * g }]);
  const combined = [...d.movementHistory, ...foundPath];
  const m = tok.measureMovementPath(combined, { preview: true });
  for (let i = d.movementHistory.length; i < combined.length; i++) combined[i].cost = m.waypoints[i].backward?.cost ?? 0;
  foundPath[0].cost = 0;
  tok._plannedMovement[game.user.id] = { foundPath, unreachableWaypoints: [], history: d.movementHistory, hidden: false, searching: false };
  if (zostaw) {
    // Do zrzutu: karta nie zasłania linijki, kanwa na środku trasy.
    await game.user.character.sheet.close();
    await canvas.pan({ x: tok.center.x + (pola * g) / 2, y: tok.center.y, scale: 0.45 });
  }
  tok.hover = true;
  tok.renderFlags.set({ refreshRuler: true, refreshState: true });
  const el = await window.__e2e.until(() => document.querySelector("#measurement .neuro-m8-reszta"), { message: "the M8 ruler label" });
  await window.__e2e.until(() => (el.textContent.includes(String(pola)) || true), { timeoutMs: 300 }).catch(() => {});
  await new Promise(r => setTimeout(r, 250));
  const tekst = document.querySelector("#measurement .neuro-m8-reszta")?.textContent.trim() ?? null;
  const klasa = document.querySelector("#measurement .neuro-m8-reszta")?.className ?? "";
  if (!zostaw) await planuj({ pola: null });
  return { tekst, ponad: klasa.includes("ponad") };
}

/** Gracz 1: natywne Undo ostatniego ruchu (ta sama ścieżka co Ctrl+Z na warstwie żetonów). */
async function cofnij() {
  const tok = canvas.tokens.placeables.find(t => t.actor?.id === game.user.character.id);
  tok.control({ releaseOthers: true });
  await canvas.tokens.undoHistory();
  return true;
}

/** GM: SIŁ 14 dla PC Gracz 1 (zasięg skoku 4,2 m z rozbiegu). */
async function sila14() {
  await game.actors.getName("PC Gracz 1").update({ "system.abilities.str.value": 14 });
  return true;
}

/** Gracz 1: prawdziwy klik [Skok] w panelu karty → okno kalkulatora; zwraca wiersze tabeli. */
async function oknoSkoku() {
  const a = game.user.character;
  const el = await window.__e2e.until(() => a.sheet.element?.querySelector(".neuro-m8-panel"), { message: "panel" });
  el.querySelector('.neuro-akcja-btn[data-akcja="skok"]').click();
  const okno = await window.__e2e.until(() => document.querySelector(".neuro-skok-okno")?.closest(".application"), { message: "the jump window" });
  return [...okno.querySelectorAll(".neuro-skok-tabela tbody tr")].map(tr => [...tr.children].map(c => c.textContent.trim()));
}

/** Gracz 1: w oknie [Tryb Skok na żetonie] — wybór trybu niczego nie wydaje. */
async function trybSkok() {
  const okno = document.querySelector(".neuro-skok-okno")?.closest(".application");
  okno.querySelector('button[data-action="tryb"]').click();
  const tok = canvas.tokens.placeables.find(t => t.actor?.id === game.user.character.id);
  return window.__e2e.until(() => (tok.document.movementAction === "jump" ? tok.document.movementAction : null), { message: "jump mode on the token" });
}

/** Gracz 1: tryb ruchu z powrotem na zwykły. */
async function trybZwykly() {
  const tok = canvas.tokens.placeables.find(t => t.actor?.id === game.user.character.id);
  await tok.document.update({ movementAction: null });
  return tok.document.movementAction;
}

/** Gracz 1: prawdziwy klik przycisku panelu M8 po `data-akcja`. */
async function klikPanel({ akcja }) {
  const a = game.user.character;
  const el = await window.__e2e.until(() => a.sheet.element?.querySelector(".neuro-m8-panel"), { message: "panel" });
  const b = el.querySelector(`.neuro-akcja-btn[data-akcja="${akcja}"]`);
  b?.click();
  return !!b;
}

/** Gracz 1: w otwartym oknie (tytuł zaczyna się od `tytul`) wpisz pola i kliknij przycisk `przycisk` (data-action); `zamknij` — zamknij okno. */
async function okno({ tytul, pola = {}, przycisk = null, zamknij = false }) {
  const app = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && String(x.title ?? "").startsWith(tytul)), { message: `the window ${tytul}` });
  const przyciski = [...app.element.querySelectorAll("button[data-action]")].map(b => `${b.dataset.action}:${b.textContent.trim()}`);
  for (const [k, v] of Object.entries(pola)) {
    const inp = app.element.querySelector(`[name="${k}"]`);
    inp.value = v;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (zamknij) { await app.close(); return { przyciski }; }
  const btn = przycisk ? app.element.querySelector(`button[data-action="${przycisk}"]`) : null;
  btn?.click();
  return { klik: !!btn, przyciski };
}

/** Stan M8 PC Gracz 1 dla E5: pule, przygotowania, reakcja, ochrona D32. */
async function stanE5({ warunek = null } = {}) {
  const eko = await import("/modules/neuroshima-2026-overrides/scripts/combat/ekonomia.mjs");
  const E = await import("/modules/neuroshima-2026-overrides/scripts/config/ekonomia-data.mjs");
  const a = game.actors.getName("PC Gracz 1");
  const s = game.neuroshima.actions.stan(a);
  if (!s) return null;
  const st = {
    wlasna: s.chwila.wlasna, A: s.pule.A.wydane, R: s.pule.R.wydane, ruch: `${s.ruch.pozostalo}/${s.ruch.pojemnosc}`,
    przyg: E.aktywnePrzygotowania(s.ledger, s.chwila).map(p => p.opis), reakcja: s.reakcja?.zrodlo ?? null,
    otwarte: s.ledger.reakcje.filter(r => !r.koniec).length, ochrona: eko.ochronaBieguWReakcji(a)
  };
  if (!warunek) return st;
  const ok = { przyg1: st.przyg.length === 1, reakcja: st.R === 1 && st.otwarte === 1, bieg: st.ruch === "18/18",
    zamknieta: st.otwarte === 0 }[warunek];
  return ok ? st : null;
}

/** Gracz 1: okno Testu Ataku bronią (bez czekania na rzut) — opcje i wybór pola „Sposób ataku”. */
async function oknoAtaku() {
  const a = game.user.character;
  const bron = a.items.find(i => i.type === "weapon" && i.system.activities?.some(x => x.type === "attack"));
  const akt = bron.system.activities.find(x => x.type === "attack");
  void akt.rollAttack({}, { configure: true }, { create: true });
  const app = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x instanceof dnd5e.applications.dice.AttackRollConfigurationDialog), { message: "the attack dialog" });
  const sel = await window.__e2e.until(() => app.element.querySelector('[name="neuroSposobAtaku"]'), { message: "the Sposób ataku field" });
  return { bron: bron.name, opcje: [...sel.options].map(o => o.value), wybrana: sel.value, etykieta: sel.selectedOptions[0]?.textContent.trim() };
}

/** Gracz 1: w otwartym oknie ataku — zwykły rzut (prawdziwy klik przycisku okna). */
async function rzucZOkna() {
  const app = [...foundry.applications.instances.values()]
    .find(x => x.rendered && x instanceof dnd5e.applications.dice.AttackRollConfigurationDialog);
  app.element.querySelector('button[data-action="normal"]').click();
  return true;
}

/** Ostatnia karta ataku PC Gracz 1 z zapisem kosztu M8 (każdy klient). */
function kartaAtaku() {
  const m = game.messages.contents.findLast(x => x.flags?.["neuroshima-2026-overrides"]?.atakM8 && x.speaker?.actor === game.actors.getName("PC Gracz 1")?.id);
  return m ? m.flags["neuroshima-2026-overrides"].atakM8 : null;
}

/** Gracz 1: prawdziwy klik w plakietkę kosztu ostatniej karty ataku (korekta po fakcie). */
async function klikPlakietki() {
  const el = await window.__e2e.until(() => [...document.querySelectorAll("#chat .neuro-atak-m8-korekta")].at(-1), { message: "the clickable cost pill" });
  el.click();
  return true;
}

/** Gracz 1: cel na BN i okno manewru (Wytrącenie) — co oferuje „Sposób ataku”. */
async function oknoManewru() {
  const npc = canvas.tokens.placeables.find(t => t.actor?.type === "npc");
  npc.setTarget(true, { releaseOthers: true });
  void game.neuroshima.manewry.wytracenie({ actor: game.user.character });
  const app = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && String(x.title ?? "").startsWith("Manewr")), { message: "the maneuver window" });
  const sel = app.element.querySelector('[name="sposob"]');
  return { opcje: sel ? [...sel.options].map(o => o.value) : null, wybrana: sel?.value ?? null };
}

/** Gracz 1: prawdziwy klik „Ułóż pasek” w panelu; zwraca wiersze podglądu (slot, zmiana). */
async function ulozPasekKlik() {
  const a = game.user.character;
  a.sheet.render(true);
  const el = await window.__e2e.until(() => [...(a.sheet.element?.querySelectorAll(".neuro-m8-panel .neuro-akcja-btn") ?? [])]
    .find(b => /Ułóż pasek/.test(b.textContent)), { message: "the „Ułóż pasek” button" });
  el.click();
  const app = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && String(x.title ?? "").startsWith("Ułóż pasek")), { message: "the preview" });
  return [...app.element.querySelectorAll(".neuro-pasek-podglad tbody tr")].map(tr => [...tr.children].map(c => c.textContent.trim()));
}

/** Gracz 1: tożsamości makr w slotach 1–10 po ułożeniu. */
function pasekGracza() {
  const p = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => game.neuroshima.pasek.tozsamosc(game.macros.get(game.user.hotbar?.[s])) ?? null);
  return p[9] === "skrot:wiecej" ? p : null;
}

/** Ostatnia karta wyniku manewru z kosztem (każdy klient). */
function kartaManewru() {
  const m = game.messages.contents.findLast(x => /neuro-maneuver-koszt/.test(x.content ?? ""));
  return m ? new DOMParser().parseFromString(m.content, "text/html").querySelector(".neuro-maneuver-koszt")?.textContent ?? null : null;
}

/**
 * GM (E4): sztylet w pochwie, drugi w plecaku, Pakowanie i Szybkie nogi dla PC Gracz 1; B 92 do kabury mimowolnie
 * (bez kosztu po stronie postaci) — obie ręce wolne.
 */
async function przygotujLalke() {
  const M = "neuroshima-2026-overrides";
  const a = game.actors.getName("PC Gracz 1");
  const lalka = game.neuroshima.lalka;
  const bron = await game.packs.get(`${M}.bron`).getDocuments();
  const sztylet = bron.find(d => d.getFlag(M, "weaponId") === "sztylet");
  const nogi = (await game.packs.get(`${M}.zdolnosci-klasowe`).getDocuments()).find(d => d.getFlag(M, "abilityId") === "szybkie-nogi");
  for (const i of lalka.heldItems(a).map(h => h.item).filter(Boolean)) await lalka.place(a, i, "pack", { quiet: true, involuntary: true });
  // `createEmbeddedDocuments` does not promise the input order back (seen in the release gate) — find by name.
  const created = await a.createEmbeddedDocuments("Item", [
    { ...game.items.fromCompendium(sztylet), name: "Sztylet (pochwa)" },
    { ...game.items.fromCompendium(sztylet), name: "Sztylet (plecak)" },
    { name: "Pakowanie", type: "feat", flags: { [M]: { sztuczka: "pakowanie" } } },
    game.items.fromCompendium(nogi)
  ]);
  const pochwa = created.find(i => i.name === "Sztylet (pochwa)");
  const plecak = created.find(i => i.name === "Sztylet (plecak)");
  await lalka.place(a, a.items.get(pochwa.id), "melee.0", { quiet: true, involuntary: true });
  await lalka.place(a, a.items.get(plecak.id), "pack", { quiet: true, involuntary: true });
  // The gate's slower world: the fresh items' create hooks may still be settling — wait, don't read a mid-step.
  const loc = id => lalka.locationOf(a.items.get(id))?.kind;
  await window.__e2e.until(() => (loc(pochwa.id) && loc(plecak.id) ? true : null), { message: "both daggers on the doll" }).catch(() => null);
  return { wolne: lalka.freeHands(a), pochwa: loc(pochwa.id), plecak: loc(plecak.id), plecakIstnieje: !!a.items.get(plecak.id) };
}

/** Gracz 1: Pakowanie — sztylet z plecaka do ręki (przeniesienie na lalce; bez `quiet` — ciche niczego nie nalicza). */
async function zPlecaka() {
  const a = game.user.character;
  return game.neuroshima.lalka.place(a, a.items.getName("Sztylet (plecak)"), "hand.1");
}

/** Gracz 1: prawdziwy klik w kafelek sztyletu w pochwie na panelu Oporządzenia — „dobądź i zatrzymaj się”. */
async function klikPochwy() {
  const a = game.user.character;
  if (!a.sheet.rendered) await a.sheet.render({ force: true });
  await window.__e2e.until(() => a.sheet.element, { message: "the sheet" });
  const { openDoll, panelFor } = await import("/modules/neuroshima-2026-overrides/scripts/actors/doll-panel.mjs");
  await openDoll(a.sheet);
  const item = a.items.getName("Sztylet (pochwa)");
  const tile = await window.__e2e.until(() => panelFor(a.sheet)?.element?.querySelector(`.neuro-doll-slot.is-filled[data-item-id="${item.id}"]`),
    { message: "the sheathed dagger on the doll" });
  tile.click();
  await window.__e2e.until(() => (game.neuroshima.lalka.locationOf(a.items.get(item.id))?.kind === "hand" ? true : null), { message: "the dagger in hand" });
  await new Promise(r => setTimeout(r, 400));
  const atak = [...foundry.applications.instances.values()].some(x => x.rendered && x instanceof dnd5e.applications.dice.AttackRollConfigurationDialog);
  return { wRece: true, oknoAtaku: atak };
}

/** Gracz 1: Szybkie nogi [B] — aktywność zdolności; plakietka kosztu na karcie w czacie gracza. */
async function szybkieNogi() {
  const a = game.user.character;
  const it = a.items.find(i => i.getFlag("neuroshima-2026-overrides", "abilityId") === "szybkie-nogi");
  await it.system.activities.contents[0].use({}, { configure: false });
  const el = await window.__e2e.until(() => [...document.querySelectorAll("#chat .neuro-uzycie-m8")].at(-1), { message: "the cost pill on the use card" });
  return el.textContent.trim();
}

/** Odczyt pul I/A i ostatnich źródeł operacji PC Gracz 1 (każdy klient). */
function pulePC() {
  const s = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
  if (!s) return null;
  return { I: s.pule.I.pozostalo, A: s.pule.A.pozostalo, B: s.pule.B.pozostalo, wlasna: s.chwila.wlasna, zrodla: s.ledger.ops.slice(-3).map(o => o.zrodlo) };
}

/**
 * Gracz 1 (E7): wąski widok — karta zwężona do minimum, na jakie pozwala arkusz dnd5e (ma własną minimalną szerokość);
 * panel M8 siedzi w wąskiej kolumnie Stan. Bez poziomego przewijania, każdy przycisk w obrysie panelu.
 */
async function waskaKarta({ szer = 360 } = {}) {
  const a = game.user.character;
  if (!a.sheet.rendered) await a.sheet.render({ force: true });
  await window.__e2e.until(() => a.sheet.element?.querySelector(".neuro-m8-panel"), { message: "panel" });
  a.sheet.setPosition({ width: szer });
  await new Promise(r => setTimeout(r, 400));
  const el = a.sheet.element.querySelector(".neuro-m8-panel");
  const p = el.getBoundingClientRect();
  const poza = [...el.querySelectorAll(".neuro-akcja-btn")].filter(b => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && (r.left < p.left - 1 || r.right > p.right + 1);
  }).map(b => b.textContent.trim());
  return { karta: Math.round(a.sheet.element.getBoundingClientRect().width), panel: Math.round(p.width),
    przewija: el.scrollWidth > el.clientWidth + 1, poza, przyciski: el.querySelectorAll(".neuro-akcja-btn").length };
}

/** Gracz 1 (E7): fokus na [Skok] w panelu — klawiatura zaczyna od niego. */
function fokusSkok() {
  const b = game.user.character.sheet.element.querySelector('.neuro-m8-panel .neuro-akcja-btn[data-akcja="skok"]');
  b?.focus();
  return document.activeElement === b ? b.dataset.akcja : null;
}

/** Gracz 1: który przycisk panelu ma fokus. */
function fokus() {
  const el = document.activeElement;
  return el?.closest?.(".neuro-m8-panel") ? (el.dataset.akcja ?? el.textContent.trim()) : null;
}

/** GM: następna tura. */
async function nastepna() {
  await game.combat.nextTurn();
  return game.combat.combatant?.name;
}

/** Gracz 1: Reakcja z tym samym id dwa razy. */
async function reakcja() {
  const a = game.user.character;
  const r1 = await game.neuroshima.actions.zadeklaruj(a, "R", { zrodlo: "e2e — Reakcja", id: "e2e-reakcja-1" });
  const r2 = await game.neuroshima.actions.zadeklaruj(a, "R", { zrodlo: "e2e — Reakcja", id: "e2e-reakcja-1" });
  return { r1, r2 };
}

/** GM: zdejmij znacznik R z HUD-u (ręczna zmiana stanu). */
async function zdejmijZnacznik() {
  const a = game.actors.getName("PC Gracz 1");
  await a.toggleStatusEffect("reakcja", { active: false });
  return true;
}

export default {
  name: "ruch",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "the player's client on the scene" });

    await t.step("GM: 1.5 m scene, Speed 9, combat with PC Gracz 1 first", async () => {
      const fx = await t.gm.eval(przygotuj);
      t.equal(fx.naRuchu, "PC Gracz 1", "PC Gracz 1 on turn");
    });

    await t.step("Gracz 1: the sheet shows the M8 panel — 9/9 m, A 1/1, R 1/1", async () => {
      await t.waitFor(p1, () => game.combat?.started && game.combat.combatant?.actor?.id === game.user.character.id ? true : null,
        { message: "the player sees their turn" });
      const p = await p1.eval(panel);
      t.equal(p.ruch, "9/9 m", "full movement");
      t.equal(p.A, "A 1/1", "one action");
      t.equal(p.R, "R 1/1", "reaction");
    });

    await t.step("Gracz 1 moves own token 2 squares → GM writes 3 m (native cost) → 6/9", async () => {
      const r = await p1.eval(rusz, { pola: 2 });
      t.assert(r.wykonawcaGM && !r.ja, "the GM is the ledger's executor for the player", r);
      const s = await t.waitFor(p1, () => {
        const a = game.actors.getName("PC Gracz 1");
        const s = game.neuroshima.actions.stan(a);
        return s?.ledger.ruchy.length === 1 ? s.ruch.pozostalo : null;
      }, { message: "the movement in the ledger on the player's client" });
      t.equal(s, 6, "6 m left");
      const st = await t.gm.eval(stanPC);
      t.equal(st.ruchy[0].niepelny, false, "native cost (token rendered for the mover)");
      // Panel odświeża się w klatce animacji — w oknie w tle bywa to o chwilę później niż ledger.
      const p = await t.waitFor(p1, () => {
        const el = game.user.character?.sheet?.element?.querySelector(".neuro-m8-panel .neuro-m8-licznik.ruch");
        return el?.textContent.trim() === "6/9 m" ? el.textContent.trim() : null;
      }, { message: "the sheet updated in place (6/9 m)" });
      t.equal(p, "6/9 m", "sheet updated in place");
    });

    await t.step("Gracz 1 clicks [Biegnij] → A 0/1, +18 m, Bieganie status → 24/27", async () => {
      t.assert(await p1.eval(biegnij), "the button exists");
      const s = await t.waitFor(p1, () => {
        const a = game.actors.getName("PC Gracz 1");
        const s = game.neuroshima.actions.stan(a);
        return s && s.pule.A.wydane === 1 && a.statuses.has("bieganie") ? s.ruch : null;
      }, { message: "Bieganie recorded and the status applied" });
      t.equal(s.pozostalo, 24, "24 m left");
      t.equal(s.pojemnosc, 27, "27 m capacity");
      const p = await t.waitFor(p1, () => {
        const el = game.user.character.sheet.element?.querySelector(".neuro-m8-panel .neuro-m8-licznik.ruch");
        return el?.textContent.trim() === "24/27 m" ? el.textContent.trim() : null;
      }, { message: "panel shows 24/27" });
      t.equal(p, "24/27 m", "panel");
    });

    await t.step("Gracz 1 plans a path: the ruler label says what is left (green) or by how much it overruns (red)", async () => {
      const w = await p1.eval(planuj, { pola: 10 });
      t.assert(!w.ponad && /zostaje 9 m/.test(w.tekst ?? ""), "15 m of 24 → 9 m left, green", w);
      const z = await p1.eval(planuj, { pola: 20, zostaw: true });
      t.assert(z.ponad && /ponad pulę −6 m/.test(z.tekst ?? ""), "30 m of 24 → −6 m, red", z);
      await t.screenshot("Gracz 1", "linijka — plan ponad pulę");
      await p1.eval(planuj, { pola: null });
      await p1.eval(panel); // karta z powrotem (zamknięta do zrzutu linijki)
    });

    await t.step("Gracz 1 moves past the pool → negative, durable warning on the sheet; native Undo returns the cost", async () => {
      await p1.eval(rusz, { pola: 17 });
      const s = await t.waitFor(p1, () => {
        const a = game.actors.getName("PC Gracz 1");
        const s = game.neuroshima.actions.stan(a);
        return s?.ledger.ruchy.length === 2 ? s.ruch.pozostalo : null;
      }, { message: "second movement recorded" });
      t.equal(s, -1.5, "−1.5 m: movement is not cut short");
      const p = await t.waitFor(p1, () => {
        const el = game.user.character.sheet.element?.querySelector(".neuro-m8-panel");
        return el?.querySelector(".neuro-m8-ostrz") ? el.textContent : null;
      }, { message: "durable warning on the sheet" });
      t.assert(/ponad pulę/.test(p), "warning text", p);
      await t.screenshot("Gracz 1", "karta — ruch ponad pulę");
      await p1.eval(cofnij);
      const po = await t.waitFor(p1, () => {
        const s = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        return s?.ledger.ruchy.some(r => r.cofniety) ? s.ruch.pozostalo : null;
      }, { message: "Undo reconciled in the ledger" });
      t.equal(po, 24, "24 m again; Bieganie and its A unchanged");
      t.equal((await t.gm.eval(stanPC)).A, 0, "Undo did not refund the action");
    });

    await t.step("Gracz 1: [Skok] → NOE calculator (SIŁ 14: 4,2/2,1 m), jump mode costs nothing; a 6 m jump after a 3 m run-up costs 6 m and warns, not blocks", async () => {
      await t.gm.eval(sila14);
      const tabela = await p1.eval(oknoSkoku);
      t.equal(tabela[0]?.join(" | "), "w dal | 4,2 m | 2,1 m", "long jump with a run-up / standing");
      t.equal(tabela[1]?.join(" | "), "wzwyż | 1,2 m | 0,6 m", "high jump");
      await t.screenshot("Gracz 1", "skok — kalkulator na karcie");
      const przed = (await t.gm.eval(stanPC)).pozostalo;
      t.equal(await p1.eval(trybSkok), "jump", "the token is in jump mode");
      t.equal((await t.gm.eval(stanPC)).pozostalo, przed, "choosing the mode spends nothing");
      await p1.eval(rusz, { pola: 4 });
      const wpis = await t.waitFor(t.gm, () => {
        const s = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        const r = s?.ledger.ruchy.filter(x => !x.cofniety).at(-1);
        return r?.tryb === "jump" ? { koszt: r.koszt, ostrz: r.ostrz, pozostalo: s.ruch.pozostalo } : null;
      }, { message: "the jump in the ledger" });
      t.equal(wpis.koszt, 6, "6 m jump costs 6 m (1:1)");
      t.assert(wpis.ostrz.some(o => /Skok 6 m — ponad zasięg 4,2 m \(z rozbiegu/.test(o)), "over-reach warning, the 3 m walk counted as the run-up", wpis);
      t.equal(wpis.pozostalo, przed - 6, "budget");
      const p = await t.waitFor(p1, () => {
        const el = game.user.character.sheet.element?.querySelector(".neuro-m8-panel");
        return el && /ponad zasięg/.test(el.textContent) ? el.textContent : null;
      }, { message: "the jump warning on the player's sheet" });
      t.assert(/ponad zasięg 4,2 m/.test(p), "sheet", p);
      t.equal(await p1.eval(trybZwykly), "walk", "back to the default mode (walk)");
    });

    await t.step("GM: next turn — core clears histories, the player's movement is off-turn, R 1/1; R twice with one id → one spend", async () => {
      t.equal(await t.gm.eval(nastepna), (await t.gm.eval(() => game.combat.turns[1].name)), "the NPC's turn");
      const s = await t.waitFor(p1, () => {
        const s = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        return s && !s.chwila.wlasna ? s : null;
      }, { message: "the player sees the turn change" });
      t.equal(s.ruch.dostepny, false, "no ordinary movement off-turn (D18)");
      const r = await p1.eval(reakcja);
      t.equal(r.r1?.naruszenie, false, "first R fine", r);
      t.equal(r.r2?.duplikat, true, "the retried id spends nothing", r);
      const z = await t.waitFor(p1, () => (game.neuroshima.actions.znacznik(game.actors.getName("PC Gracz 1"), "R") ? true : null),
        { message: "the R marker (projection) on the player's client" });
      t.assert(z, "marker");
      const p = await p1.eval(panel);
      t.equal(p.R, "R 0/1", "R spent");
      t.equal(p.ruch, "—", "movement off-turn");
      await t.screenshot("Gracz 1", "karta — poza turą, Reakcja zużyta");
    });

    await t.step("GM removes the R marker by hand → a correction, not a refund of history", async () => {
      await t.gm.eval(zdejmijZnacznik);
      const s = await t.waitFor(t.gm, () => {
        const st = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        return st && st.pule.R.wydane === 0 ? st.ledger.ops.map(o => o.rodzaj) : null;
      }, { message: "the correction" });
      t.assert(s.includes("korekta") && s.includes("akcja"), "the spend stays, a correction is added", s);
    });

    await t.step("Round 2, own turn: Gracz 1 [Wyczekaj] with a note → A 0/1, the sheet shows the preparation; [Pomóż] opened and closed spends nothing", async () => {
      t.equal(await t.gm.eval(nastepna), "PC Gracz 1", "own turn again");
      await t.waitFor(p1, () => (game.neuroshima.actions.stan(game.user.character)?.chwila.wlasna ? true : null), { message: "the player sees their turn" });
      t.assert(await p1.eval(klikPanel, { akcja: "wyczekaj" }), "[Wyczekaj] on the sheet");
      const o = await p1.eval(okno, { tytul: "Wyczekanie", pola: { opis: "strzelam, gdy wyjdzie" }, przycisk: "ok" });
      t.assert(o.klik, "dialog confirmed", o);
      const s = await t.waitFor(p1, stanE5, { args: [{ warunek: "przyg1" }], message: "the preparation recorded" });
      t.equal(s.A, 1, "A 0/1 — the preparation costs an Action");
      t.equal(s.przyg[0], "strzelam, gdy wyjdzie", "note");
      await t.waitFor(p1, () => {
        const el = game.user.character.sheet.element?.querySelector(".neuro-m8-panel");
        return el && /Wyczekuje: strzelam/.test(el.textContent) ? true : null;
      }, { message: "the preparation on the sheet" });
      t.assert(await p1.eval(klikPanel, { akcja: "pomoz" }), "[Pomóż] on the sheet");
      const pom = await p1.eval(okno, { tytul: "Pomaganie", zamknij: true });
      t.assert(pom.przyciski.some(b => b.startsWith("ok:")), "the Help dialog with its button", pom);
      t.equal((await p1.eval(stanE5)).A, 1, "closing the Help window spends nothing");
      await t.screenshot("Gracz 1", "karta — Wyczekanie przygotowane");
    });

    await t.step("NPC turn: Gracz 1 [Reaguj] → executes the preparation (R 0/1) → [Biegnij] joins that reaction: no second R, only its fresh 18 m; ranged attacks at Disadvantage (D32)", async () => {
      await t.gm.eval(nastepna);
      await t.waitFor(p1, () => (game.neuroshima.actions.stan(game.user.character)?.chwila.wlasna === false ? true : null), { message: "the NPC's turn on the player's client" });
      t.assert(await p1.eval(klikPanel, { akcja: "reaguj" }), "[Reaguj] on the sheet");
      const o = await p1.eval(okno, { tytul: "Reakcja", przycisk: "p0" });
      t.assert(o.klik && o.przyciski.some(b => /Wykonaj: strzelam/.test(b)), "the preparation offered", o);
      const r = await t.waitFor(p1, stanE5, { args: [{ warunek: "reakcja" }], message: "the reaction executed" });
      t.equal(r.przyg.length, 0, "preparation used");
      t.assert(await p1.eval(biegnij), "[Biegnij] clicked");
      const b = await t.waitFor(p1, stanE5, { args: [{ warunek: "bieg" }], message: "Bieganie inside the reaction" });
      t.equal(b.R, 1, "one R for the whole reaction");
      t.equal((await t.gm.eval(stanE5)).ochrona, true, "the GM's circumstance engine sees the reaction-run protection");
      await t.screenshot("Gracz 1", "karta — Bieganie w Reakcji");
    });

    await t.step("GM: next turn — the reaction closes with the turn that triggered it; the protection ends (no unmarked carry-over)", async () => {
      await t.gm.eval(nastepna);
      const s = await t.waitFor(t.gm, stanE5, { args: [{ warunek: "zamknieta" }], message: "the reaction closed" });
      t.equal(s.ochrona, false, "no protection after that turn");
    });

    await t.step("Round 3, own turn: Gracz 1 attacks through the attack dialog — „Sposób ataku” offers only proper options, defaults to a new Atakowanie [A]; the card carries the cost; A 0/1", async () => {
      await t.waitFor(p1, () => (game.neuroshima.actions.stan(game.user.character)?.chwila.wlasna ? true : null), { message: "own turn again" });
      const o = await p1.eval(oknoAtaku);
      t.equal(o.wybrana, "nowaA", "default: a new Atakowanie");
      t.assert(!o.opcje.includes("R"), "no Reaction option on own turn", o);
      t.assert(!o.opcje.some(x => x.startsWith("B:")), "no B sources the character does not own", o);
      await t.screenshot("Gracz 1", "okno ataku — Sposób ataku");
      await p1.eval(rzucZOkna);
      const k = await t.waitFor(t.gm, kartaAtaku, { message: "the attack card with its M8 cost" });
      t.equal(k.opcja, "nowaA", "recorded source");
      t.equal(JSON.stringify(k.koszt), JSON.stringify({ A: 1 }), "one Action");
      t.equal((await p1.eval(stanE5)).A, 1, "A 0/1 on the player's sheet");
      await t.waitFor(p1, () => (document.querySelector("#chat .neuro-atak-m8") ? true : null), { message: "the cost pill on the card" });
      await p1.eval(() => game.user.character.sheet.close());
      await t.screenshot("Gracz 1", "karta ataku — koszt Atakowania");
    });

    await t.step("Gracz 1 clicks the cost pill → „Popraw próbę” → „Bez kosztu”: a ledger correction gives the A back, the card says what changed", async () => {
      t.assert(await p1.eval(klikPlakietki), "pill clicked");
      const o = await p1.eval(okno, { tytul: "Popraw próbę", pola: { na: "brak" }, przycisk: "ok" });
      t.assert(o.klik, "correction confirmed", o);
      const k = await t.waitFor(t.gm, () => {
        const m = game.messages.contents.findLast(x => x.flags?.["neuroshima-2026-overrides"]?.atakM8?.korekta);
        return m ? m.flags["neuroshima-2026-overrides"].atakM8 : null;
      }, { message: "the card flag corrected" });
      t.equal(JSON.stringify(k.koszt), "{}", "no cost left on the card");
      const s = await t.waitFor(t.gm, () => {
        const st = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        return st && st.pule.A.wydane === 0 ? st.ledger.ops.at(-1) : null;
      }, { message: "the A given back" });
      t.equal(s.rodzaj, "korekta", "a correction, not a deleted spend");
      t.assert(s.atakKorekta, "the correction points at the attempt", s);
    });

    await t.step("Gracz 1: maneuver window (Wytrącenie) offers „Sposób ataku”; the attempt takes a new Atakowanie [A] before the target's save", async () => {
      const o = await p1.eval(oknoManewru);
      t.equal(o.wybrana, "nowaA", "default: a new Atakowanie", o);
      t.assert(!o.opcje.includes("R"), "no Reaction on own turn", o);
      const k = await p1.eval(okno, { tytul: "Manewr", przycisk: "ok" });
      t.assert(k.klik, "maneuver confirmed", k);
      const tekst = await t.waitFor(t.gm, kartaManewru, { message: "the maneuver card with its cost" });
      t.assert(/Nowe Atakowanie \[A\] · atak 1 \(A\)/.test(tekst), "the card names the cost", tekst);
      const s = await t.waitFor(t.gm, () => {
        const st = game.neuroshima.actions.stan(game.actors.getName("PC Gracz 1"));
        return st?.pule.A.wydane === 1 ? st : null;
      }, { message: "the maneuver spent the A" });
      t.equal(s.ledger.ataki.at(-1)?.uzyte, 1, "a slot of the new Atakowanie");
      await t.screenshot("Gracz 1", "manewr — koszt na karcie");
    });

    await t.step("Gracz 1: [Ułóż pasek] → preview of slots 1–0 → „Ułóż”: weapon in slot 1, Unik/Odstąp/Ruch/Więcej in 7–0", async () => {
      const wiersze = await p1.eval(ulozPasekKlik);
      t.equal(wiersze.length, 10, "ten template rows");
      t.assert((wiersze[0][2] ?? "").length > 0 && !/nic do postawienia/.test(wiersze[0][3] ?? ""), "a weapon goes to slot 1", wiersze[0]);
      t.assert(/^B 92: /.test(wiersze[2][2] ?? ""), "weapon handling (magazine swap) in slot 3", wiersze[2]);
      await t.screenshot("Gracz 1", "pasek — podgląd szablonu");
      const o = await p1.eval(okno, { tytul: "Ułóż pasek", przycisk: "yes" });
      t.assert(o.klik, "confirmed", o);
      const pasek = await t.waitFor(p1, pasekGracza, { message: "the template on the player's bar" });
      t.assert(String(pasek[0]).startsWith("item:"), "slot 1 — weapon attack", pasek);
      t.equal(pasek.slice(6).join(" "), "skrot:dodging skrot:odstapienie skrot:ruch skrot:wiecej", "slots 7–0");
      await t.screenshot("Gracz 1", "pasek — po ułożeniu");
    });

    await t.step("E4, round 4: GM — a dagger in a sheath, another in the pack, Pakowanie, Szybkie nogi; hands free; PC on turn", async () => {
      await t.gm.eval(nastepna);
      await t.gm.eval(nastepna);
      await t.waitFor(p1, () => (game.neuroshima.actions.stan(game.user.character)?.chwila.wlasna ? true : null), { message: "own turn again" });
      const fx = await t.gm.eval(przygotujLalke);
      t.equal(fx.wolne, 2, "both hands free");
      t.equal(`${fx.pochwa}/${fx.plecak}`, "holster/pack", `dagger in a sheath, dagger in the pack: ${JSON.stringify(fx)}`);
      const s = await t.waitFor(p1, pulePC, { message: "pools" });
      t.equal(`${s.I}/${s.A}`, "1/1", "I and A untouched by the GM's involuntary moves");
    });

    await t.step("E4: Gracz 1 takes the dagger from the pack — Pakowanie (Mam pod ręką) makes it an [I], not an Action", async () => {
      t.assert(await p1.eval(zPlecaka), "moved to hand");
      const p = await t.waitFor(p1, () => {
        const st = game.neuroshima.actions.stan(game.user.character);
        return st && st.pule.I.pozostalo === 0 ? { I: st.pule.I.pozostalo, A: st.pule.A.pozostalo } : null;
      }, { message: "the [I] spent by the pack draw" });
      t.equal(`${p.I}/${p.A}`, "0/1", "I 0/1, A still 1/1");
    });

    await t.step("E4: Gracz 1 clicks the sheathed dagger on the doll — drawn and stops (no attack window); second interaction → Używanie [A]", async () => {
      const k = await p1.eval(klikPochwy);
      t.equal(k.oknoAtaku, false, "no attack dialog — draw and stop");
      const p = await t.waitFor(p1, () => {
        const st = game.neuroshima.actions.stan(game.user.character);
        return st && st.pule.A.pozostalo === 0 ? { A: st.pule.A.pozostalo, zrodlo: st.ledger.ops.at(-1)?.zrodlo } : null;
      }, { message: "the A spent by the second interaction" });
      t.assert(/Używanie/.test(p.zrodlo ?? ""), "recorded as Używanie", p);
      await t.screenshot("Gracz 1", "lalka — dobycie bez ataku");
    });

    await t.step("E4: Gracz 1 uses Szybkie nogi [B] — the use card carries the cost pill „Akcja Bonusowa [B]”", async () => {
      const txt = await p1.eval(szybkieNogi);
      t.assert(/Akcja Bonusowa \[B\]/.test(txt), "pill text", txt);
      await t.screenshot("Gracz 1", "karta użycia — plakietka kosztu");
    });

    await t.step("E7: narrow view — sheet at its minimum width, the M8 panel in the narrow Stan column wraps without horizontal scroll, every button inside it", async () => {
      const w = await p1.eval(waskaKarta, { szer: 360 });
      t.log(`sheet ${w.karta} px, panel ${w.panel} px`);
      t.assert(w.przyciski >= 8, "panel buttons rendered", w);
      t.assert(w.panel <= 280, "the panel lives in a narrow column", w);
      t.equal(w.przewija, false, "no horizontal scroll in the panel");
      t.equal(w.poza.length, 0, `buttons outside the panel: ${w.poza.join(", ")}`);
      await t.screenshot("Gracz 1", "karta wąska — panel M8");
    });

    await t.step("E7: keyboard — Tab moves between panel buttons, Space on [Skok] opens the calculator, Escape closes it; nothing spent", async () => {
      const przed = await p1.eval(pulePC);
      t.equal(await p1.eval(fokusSkok), "skok", "focus on [Skok]");
      await p1.pressKey("Tab");
      const nast = await t.waitFor(p1, () => {
        const el = document.activeElement;
        return el?.closest?.(".neuro-m8-panel") && el.dataset.akcja !== "skok" ? (el.dataset.akcja ?? el.textContent.trim()) : null;
      }, { message: "Tab moved the focus to another panel control" });
      t.assert(nast, "next focused control", nast);
      t.equal(await p1.eval(fokusSkok), "skok", "focus back on [Skok]");
      await p1.pressKey("Space");
      await t.waitFor(p1, () => (document.querySelector(".neuro-skok-okno") ? true : null), { message: "the jump calculator opened from the keyboard" });
      await t.screenshot("Gracz 1", "klawiatura — kalkulator skoku");
      await p1.pressKey("Escape");
      await t.waitFor(p1, () => (document.querySelector(".neuro-skok-okno") ? null : true), { message: "Escape closed the calculator" });
      const po = await p1.eval(pulePC);
      t.equal(JSON.stringify([po.A, po.B, po.I]), JSON.stringify([przed.A, przed.B, przed.I]), "the calculator spends nothing");
    });
  }
};
