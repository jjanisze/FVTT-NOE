/**
 * Neuroshima 5e — aktualizacja sceny z ponownego eksportu mapy.
 *
 * Bez tego re-eksport oznaczał import nowej sceny, a więc utratę wszystkiego,
 * co powstało po stronie FoundryVTT: tokenów, świateł, notatek, dźwięków,
 * odkrytej mgły, dorysowanych ręcznie ścian i podpiętego dziennika. To była
 * realna przeszkoda — mapa poprawiana w Tiled w trakcie kampanii kasowała
 * stan sesji.
 *
 * ## Co jest odtwarzane, a co nietykalne
 *
 * Eksporter oznacza wszystko, co sam wytworzył, flagą modułu: ściany dostają
 * `source` (klasa przegrody), kafle propów `propId`. Aktualizacja kasuje
 * **wyłącznie** dokumenty niosące te flagi i wstawia je na nowo z pliku.
 * Cokolwiek dorysowałeś w Foundry ręcznie, nie ma flagi i zostaje.
 *
 * | odtwarzane z pliku        | zachowywane                          |
 * |---------------------------|--------------------------------------|
 * | tło, wymiary, siatka      | tokeny, dźwięki                      |
 * | ściany z flagą `source`   | ściany bez flagi (dorysowane ręcznie)|
 * | kafle z flagą `propId`    | kafle bez flagi                      |
 * | regiony, światła, pinezki | to samo bez flagi                    |
 * |   z flagą `source`        | mgła, dziennik, playlista, nazwa     |
 * | tokeny spotkań (raz)      | stan drzwi, przejść, spotkań         |
 *
 * ## Dlaczego można kasować i wstawiać zamiast łatać
 *
 * Eksporter nadaje identyfikatory z generatora zasianego nazwą mapy, więc
 * dwa uruchomienia dają plik bajt w bajt identyczny. Ściana o tym samym
 * `_id` po ponownym eksporcie to ta sama ściana — nie ma ryzyka, że
 * skasujemy jedną, a wstawimy inną. Łatanie po `_id` dawałoby ten sam
 * wynik dużo większym kosztem.
 *
 * ## Użycie
 *
 *     game.neuroshima.maps.update("UPSIDE")      // zaktualizuj
 *     game.neuroshima.maps.update("UPSIDE", {podglad: true})   // tylko pokaż różnice
 *     game.neuroshima.maps.update("SILOS", {resetDrzwi: true}) // drzwi i przejścia jak w pliku (nowa drużyna)
 *     game.neuroshima.maps.utworz("UPSIDE", "Silos — Zewnątrz")  // pierwszy import
 *
 * ## Stos poziomów
 *
 * Plik sceny z kilkoma poziomami (eksport stosu: kilka map Tiled jako jedna scena z Levels)
 * aktualizuje poziomy **w miejscu, po `_id`** — identyfikatory są stałe, więc tokeny zostają
 * przy swoich poziomach. Nowy poziom z pliku jest dodawany. Poziom, którego plik już nie ma,
 * znika tylko wtedy, gdy nie stoi na nim żaden token; inaczej zostaje i raport o tym mówi.
 * Podłogi, schody, drabiny, strefy i ciemność to regiony z flagą `source`, więc jadą jak ściany.
 * Ich stan z sesji — wyłączone przejście, lina, kładka, złamane szczeble — wraca po `_id`
 * zachowania jak stan drzwi; `resetDrzwi` bierze wszystko z pliku.
 *
 * ## Spotkania
 *
 * Tokeny z pliku (obiekty `encounter` w Tiled) nie mają aktora, tylko odnośnik: id z Bestiariusza
 * (kopia importowana do folderu „<scena> — spotkania”) albo `world:<nazwa>` (aktor świata, dopisek
 * w nawiasie pominięty). Każdy token stawiany jest raz — potem to stan sesji; `resetDrzwi`
 * stawia wszystkie od nowa. Brakujący aktor = wpis w raporcie, token czeka na następną aktualizację.
 *
 * ## Znaczniki FX
 *
 * Flaga sceny `fx` (znaczniki z Tiled, `scenes/fx-markers.mjs`) przychodzi z pliku w całości.
 * Kafle znaczników (wrak, auto/blachy) zachowują widoczność z sesji; `resetDrzwi` przywraca je,
 * czyści stan „już wybuchło” i gasi dym.
 *
 * ## Notatki MG
 *
 * Klasowe obiekty z warstwy `__NOTES` w Tiled wracają jako pinezki (Note z flagą `source`) — te
 * odtwarzane są z pliku, notatki postawione ręcznie zostają. Obok pliku sceny może leżeć
 * `<mapId>.notes.json`: dziennik MG (właściciel tylko prowadzący, więc i pinezki widzi tylko on)
 * i tabele losowe — tworzone i aktualizowane po `_id`; strony dziennika dopisane ręcznie zostają.
 */

import { mapPropsApi } from "./map-props.mjs";
import { sprzatnijFx } from "./fx-markers.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = MODULE_ID;

/** Katalog plików scen bieżącego świata (kampania: `worlds/output/scenes`). */
const katalogScen = () => `worlds/${game.world.id}/scenes`;

/** Domyślne `textures` poziomu — tło na całą scenę (poziom, który przestał być przycięty). */
const TEKSTURY_DOMYSLNE = Object.freeze({ fit: "fill", scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5,
  offsetX: 0, offsetY: 0, rotation: 0 });

/** Czy dokument został wytworzony przez eksporter, czy dodany ręcznie. */
function odEksportera(doc) {
  const flagi = doc.flags?.[FLAG];
  return !!(flagi && (flagi.source || flagi.propId));
}

/** Pola zachowań regionów, które są stanem sesji, nie mapy (MG przełącza je w trakcie gry). */
const POLA_SESJI = Object.freeze(["roped", "bridged", "brokenRungs"]);

/** Stan sesji zachowań w regionach z eksportu: `_id` zachowania → {disabled, pola sesji}. */
function stanZachowan(scene) {
  const stan = new Map();
  for (const region of scene.regions) {
    if (!odEksportera(region)) continue;
    for (const b of region.behaviors) {
      const system = Object.fromEntries(POLA_SESJI.filter(k => k in (b._source.system ?? {}))
        .map(k => [k, b._source.system[k]]));
      stan.set(b.id, { disabled: b._source.disabled, system });
    }
  }
  return stan;
}

/** Dane regionów z pliku ze stanem sesji wpisanym z powrotem (te same `_id` = te same zachowania). */
function przywrocZachowania(regiony, stan) {
  if (!stan.size) return regiony;
  return regiony.map(r => ({ ...r, behaviors: (r.behaviors ?? []).map(b => {
    const s = stan.get(b._id);
    return s ? { ...b, disabled: s.disabled, system: { ...b.system, ...s.system } } : b;
  }) }));
}

async function pobierzOpis(mapId) {
  // Znacznik czasu omija pamięć podręczną przeglądarki - bez tego druga
  // aktualizacja pod rząd czytałaby stary plik.
  const res = await fetch(`${katalogScen()}/${mapId}.scene.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Nie mogę wczytać ${mapId}.scene.json (${res.status})`);
  return res.json();
}

/** Plik notatek MG obok pliku sceny (`<mapId>.notes.json`): dziennik i tabele losowe. Brak = nic. */
async function pobierzNotatki(mapId) {
  try {
    const res = await fetch(`${katalogScen()}/${mapId}.notes.json?v=${Date.now()}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Dziennik MG (tylko prowadzący) i tabele losowe z pliku notatek — po `_id`, więc ten sam dziennik
 * i te same tabele przy każdym eksporcie. Wymieniane są tylko strony i wyniki od eksportera;
 * strony dopisane ręcznie zostają.
 * @returns {Promise<{strony: number, tabele: number}|null>}
 */
async function aktualizujNotatki(notatki) {
  if (!notatki) return null;
  const { journal, tables = [] } = notatki;
  if (journal) {
    const dziennik = game.journal.get(journal._id);
    if (!dziennik) {
      await JournalEntry.implementation.create(
        { ...journal, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } }, { keepId: true });
    } else {
      await dziennik.update({ name: journal.name });
      const stare = dziennik.pages.filter(odEksportera).map(p => p.id);
      if (stare.length) await dziennik.deleteEmbeddedDocuments("JournalEntryPage", stare);
      if (journal.pages?.length) await dziennik.createEmbeddedDocuments("JournalEntryPage", journal.pages, { keepId: true });
    }
  }
  for (const t of tables) {
    const tabela = game.tables.get(t._id);
    if (!tabela) {
      await RollTable.implementation.create(t, { keepId: true });
      continue;
    }
    await tabela.update({ name: t.name, formula: t.formula });
    if (tabela.results.size) await tabela.deleteEmbeddedDocuments("TableResult", tabela.results.map(r => r.id));
    if (t.results?.length) await tabela.createEmbeddedDocuments("TableResult", t.results, { keepId: true });
  }
  return { strony: journal?.pages?.length ?? 0, tabele: tables.length };
}

/* -------------------------------------------- */
/*  Spotkania                                    */
/* -------------------------------------------- */

const PACK_BESTIARIUSZ = `${MODULE_ID}.bestiariusz`;
const FLAGA_POSTAWIONE = "encountersPlaced";

/** Nazwa bez dopisku w nawiasie: „Tarantula (Recovered)” → „Tarantula”. */
const bezDopisku = nazwa => nazwa.replace(/\s*\([^)]*\)\s*$/, "");

/**
 * Aktor spotkania. `world:<nazwa>` — aktor świata o tej nazwie (dopisek w nawiasie się nie liczy);
 * inaczej id z Bestiariusza — kopia w folderze spotkań sceny, a gdy jej nie ma, import z kompendium.
 * @param {string} odnosnik
 * @param {(utworz?: boolean) => Promise<Folder|null>} folder
 */
async function aktorSpotkania(odnosnik, folder) {
  if (!odnosnik) return null;
  if (odnosnik.startsWith("world:")) {
    const nazwa = odnosnik.slice("world:".length);
    return game.actors.getName(nazwa) ?? game.actors.find(a => bezDopisku(a.name) === nazwa) ?? null;
  }
  const kopia = (await folder())?.contents.find(a => a.getFlag(MODULE_ID, "bestiary.id") === odnosnik);
  if (kopia) return kopia;
  const pack = game.packs.get(PACK_BESTIARIUSZ);
  if (!pack) return null;
  const pole = `flags.${MODULE_ID}.bestiary.id`;
  const wpis = (await pack.getIndex({ fields: [pole] })).find(e => foundry.utils.getProperty(e, pole) === odnosnik);
  if (!wpis) return null;
  // keepId: false — rdzeń domyślnie zachowuje id z kompendium i wtedy po cichu NADPISUJE aktora świata
  // o tym id (np. Kurczaka, którego MG zaimportował i poprawił), zamiast zrobić kopię.
  return game.actors.importFromCompendium(pack, wpis._id, { folder: (await folder(true)).id }, { keepId: false });
}

/**
 * Tokeny spotkań z pliku (`encounter` z Tiled): każdy stawiany **raz** — przesunięty, zraniony albo
 * usunięty (zabity) zostaje taki po re-eksporcie, jak stan drzwi. `reset` (nowa drużyna) zdejmuje
 * tokeny spotkań i stawia wszystkie od nowa. Aktor, którego nie ma, trafia do raportu; jego token
 * stanie przy następnej aktualizacji, gdy aktor się pojawi.
 * @returns {Promise<{postawione: number, wczesniej: number, nierozwiazane: string[]}>}
 */
async function rozmiescSpotkania(scene, tokeny = [], { reset = false } = {}) {
  const spotkania = tokeny.filter(t => t.flags?.[FLAG]?.source === "encounter");
  if (reset) {
    const stare = scene.tokens.filter(t => t.getFlag(FLAG, "source") === "encounter").map(t => t.id);
    if (stare.length) await scene.deleteEmbeddedDocuments("Token", stare);
  }
  const postawione = new Set(reset ? [] : scene.getFlag(FLAG, FLAGA_POSTAWIONE) ?? []);
  const folder = async (utworz = false) => {
    const f = game.folders.find(x => x.type === "Actor" && x.getFlag(FLAG, "encounterFolder") === scene.id);
    if (f || !utworz) return f ?? null;
    return Folder.implementation.create({ name: `${scene.name} — spotkania`, type: "Actor",
      flags: { [FLAG]: { encounterFolder: scene.id } } });
  };
  const ile = new Map();
  for (const t of spotkania) ile.set(t.flags[FLAG].actor, (ile.get(t.flags[FLAG].actor) ?? 0) + 1);

  const raport = { postawione: 0, wczesniej: 0, nierozwiazane: [] };
  const nowe = [];
  for (const t of spotkania) {
    if (postawione.has(t._id) || scene.tokens.has(t._id)) { raport.wczesniej++; continue; }
    const odnosnik = t.flags[FLAG].actor;
    const actor = await aktorSpotkania(odnosnik, folder);
    if (!actor) { raport.nierozwiazane.push(`${t.name} (${odnosnik || "bez aktora"})`); continue; }
    const { _id, ...dane } = t;
    // Kopie z Bestiariusza i aktor świata na kilku tokenach (8 Fizoli): każdy token ma własne PW.
    if (!odnosnik.startsWith("world:") || ile.get(odnosnik) > 1) dane.actorLink = false;
    nowe.push({ ...(await actor.getTokenDocument(dane, { parent: scene })).toObject(), _id });
  }
  if (nowe.length) await scene.createEmbeddedDocuments("Token", nowe, { keepId: true });
  raport.postawione = nowe.length;
  if (nowe.length || reset) await scene.setFlag(FLAG, FLAGA_POSTAWIONE, [...postawione, ...nowe.map(t => t._id)]);
  if (raport.nierozwiazane.length) {
    ui.notifications.warn(`${scene.name}: spotkania bez aktora — ${raport.nierozwiazane.join(", ")}`);
  }
  return raport;
}

/** Plik sceny jest stosem poziomów (więcej niż jeden poziom albo flaga eksportera). */
function jestStosem(dane) {
  return (dane.levels?.length ?? 0) > 1 || !!dane.flags?.[FLAG]?.stack;
}

/**
 * Poziomy stosu: aktualizacja w miejscu po `_id`, nowe dodane, zbędne usunięte tylko bez tokenów.
 * @returns {Promise<{zaktualizowane: number, dodane: number, usuniete: number, zostawione: string[]}>}
 */
async function aktualizujPoziomy(scene, poziomy, { podglad = false } = {}) {
  const zPliku = new Map(poziomy.map(l => [l._id, l]));
  const dodaj = poziomy.filter(l => !scene.levels.has(l._id));
  const zmien = poziomy.filter(l => scene.levels.has(l._id)).map(l => ({
    _id: l._id, name: l.name, elevation: l.elevation, sort: l.sort ?? 0,
    background: l.background, textures: l.textures ?? TEKSTURY_DOMYSLNE
  }));
  const zbedne = scene.levels.filter(l => !zPliku.has(l.id));
  const zTokenami = zbedne.filter(l => scene.tokens.some(t => t._source.level === l.id));
  const usun = zbedne.filter(l => !zTokenami.includes(l)).map(l => l.id);
  const raport = { zaktualizowane: zmien.length, dodane: dodaj.length, usuniete: usun.length,
    zostawione: zTokenami.map(l => l.name) };
  if (podglad) return raport;
  if (dodaj.length) await scene.createEmbeddedDocuments("Level", dodaj, { keepId: true });
  if (zmien.length) await scene.updateEmbeddedDocuments("Level", zmien);
  if (usun.length) await scene.deleteEmbeddedDocuments("Level", usun);
  if (zTokenami.length) {
    ui.notifications.warn(`${scene.name}: poziomy usunięte z mapy, ale z tokenami — zostają: ` +
      zTokenami.map(l => l.name).join(", "));
  }
  return raport;
}

function znajdzScene(mapId) {
  return game.scenes.find(s => s.getFlag(FLAG, "mapId") === mapId) ?? null;
}

/**
 * Aktualizuje istniejącą scenę danymi z ponownego eksportu.
 * @param {string} mapId nazwa mapy bez rozszerzenia, np. "UPSIDE"
 * @param {object} [opcje]
 * @param {boolean} [opcje.podglad] tylko policz różnice, nic nie zapisuj
 * @param {object} [opcje.dane] dane sceny zamiast pliku z katalogu świata (testy)
 * @param {boolean} [opcje.resetDrzwi] drzwi i przejścia wracają do stanu z pliku (nowa drużyna, nowy przebieg mapy)
 */
async function update(mapId, { podglad = false, dane: daneZRaki = null, resetDrzwi = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG może aktualizować sceny.");
  const scene = znajdzScene(mapId);
  if (!scene) {
    ui.notifications.error(
      `Nie znalazłem sceny dla mapy "${mapId}". Pierwszy import: ` +
      `game.neuroshima.maps.utworz("${mapId}", "Nazwa sceny")`);
    return null;
  }
  const dane = daneZRaki ?? await pobierzOpis(mapId);

  const scianyDoUsuniecia = scene.walls.filter(odEksportera).map(w => w.id);
  const kafleDoUsuniecia = scene.tiles.filter(odEksportera).map(t => t.id);
  // Regiony trudnego terenu tez pochodzą z eksportu — meble nie są ścianą,
  // tylko spowolnieniem, więc jadą jako Region z zachowaniem systemu dnd5e.
  const regionyDoUsuniecia = scene.regions.filter(odEksportera).map(r => r.id);
  // Pinezki notatek MG z eksportu (klasowe obiekty z __NOTES); notatki postawione ręcznie zostają.
  const notatkiDoUsuniecia = scene.notes.filter(odEksportera).map(n => n.id);
  // Światła z eksportu (poświata stref); postawione ręcznie zostają.
  const swiatlaDoUsuniecia = scene.lights.filter(odEksportera).map(l => l.id);
  const raport = {
    scena: scene.name,
    scianyUsuwane: scianyDoUsuniecia.length,
    scianyWstawiane: dane.walls?.length ?? 0,
    scianyZachowane: scene.walls.size - scianyDoUsuniecia.length,
    kafleUsuwane: kafleDoUsuniecia.length,
    kafleWstawiane: dane.tiles?.length ?? 0,
    kafleZachowane: scene.tiles.size - kafleDoUsuniecia.length,
    regionyUsuwane: regionyDoUsuniecia.length,
    regionyWstawiane: dane.regions?.length ?? 0,
    regionyZachowane: scene.regions.size - regionyDoUsuniecia.length,
    swiatlaUsuwane: swiatlaDoUsuniecia.length,
    swiatlaWstawiane: dane.lights?.length ?? 0,
    nietkniete: {
      tokeny: scene.tokens.size, swiatla: scene.lights.size - swiatlaDoUsuniecia.length,
      notatki: scene.notes.size, dzwieki: scene.sounds.size,
      rysunki: scene.drawings.size, regiony: scene.regions?.size ?? 0
    }
  };
  const stos = jestStosem(dane);
  if (podglad) {
    if (stos) raport.poziomy = await aktualizujPoziomy(scene, dane.levels, { podglad: true });
    return raport;
  }

  // Tło i wymiary. Nazwy sceny NIE ruszamy - mogłeś ją nazwać po swojemu.
  // Poziomy przed ścianami i regionami: te niosą `levels: [id]`, więc id muszą już istnieć.
  if (stos) {
    raport.poziomy = await aktualizujPoziomy(scene, dane.levels);
  } else {
    const poziom = scene.levels.contents[0];
    if (poziom && dane.levels?.[0]) {
      await poziom.update({ background: dane.levels[0].background });
    }
  }
  // Tylko rozmiar siatki, punktowo. `scene.grid` to instancja klasy siatki
  // (BaseGrid), a nie model danych — nie ma `toObject()`, a podanie całego
  // obiektu skasowałoby styl, kolor i przezroczystość ustawione ręcznie.
  await scene.update({
    width: dane.width, height: dane.height,
    padding: dane.padding, "grid.size": dane.grid.size,
    // Znaczniki FX z pliku zastępują poprzednie w całości (usunięty w Tiled znika i tu).
    [`flags.${FLAG}.fx`]: foundry.data.operators.ForcedReplacement.create(dane.flags?.[FLAG]?.fx ?? {}),
    // Nowa drużyna: maszyna znowu cała.
    ...(resetDrzwi ? { [`flags.${FLAG}.fxStan`]: foundry.data.operators.ForcedDeletion.create() } : {})
  });

  // Stan drzwi to stan SESJI, nie mapy. Plik zawsze niesie ds:0, więc bez
  // tego re-eksport w środku gry zatrzaskiwałby wrota silosu i szlaban, które
  // gracze zdążyli otworzyć. Zapamiętujemy po `_id` — są deterministyczne,
  // więc ta sama ściana wróci pod tym samym identyfikatorem.
  const stanDrzwi = new Map();
  for (const wall of scene.walls) {
    if (!resetDrzwi && wall.door > 0 && odEksportera(wall)) stanDrzwi.set(wall.id, wall.ds);
  }
  // Tak samo stan przejść: wyłączone schody, lina, kładka, złamane szczeble — po `_id` zachowania.
  const stanPrzejsc = resetDrzwi ? new Map() : stanZachowan(scene);
  if (resetDrzwi) await sprzatnijFx(scene);
  // I kafle znaczników FX: wrak pokazany po wybuchu, auto zamienione na blachy.
  const stanKafli = new Map(resetDrzwi ? [] : scene.tiles
    .filter(t => odEksportera(t) && (t.getFlag(FLAG, "fxWreck") || t.getFlag(FLAG, "fxGroup")))
    .map(t => [t.id, t.hidden]));

  if (scianyDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Wall", scianyDoUsuniecia);
  if (kafleDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Tile", kafleDoUsuniecia);
  if (regionyDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Region", regionyDoUsuniecia);
  if (notatkiDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Note", notatkiDoUsuniecia);
  if (swiatlaDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("AmbientLight", swiatlaDoUsuniecia);
  if (!daneZRaki) raport.notatkiMG = await aktualizujNotatki(await pobierzNotatki(mapId));
  if (dane.walls?.length) {
    const sciany = dane.walls.map(w => stanDrzwi.has(w._id)
      ? { ...w, ds: stanDrzwi.get(w._id) }
      : w);
    await scene.createEmbeddedDocuments("Wall", sciany, { keepId: true });
    raport.drzwiZeStanem = stanDrzwi.size;
  }
  if (dane.tiles?.length) {
    const kafle = dane.tiles.map(t => stanKafli.has(t._id) ? { ...t, hidden: stanKafli.get(t._id) } : t);
    await scene.createEmbeddedDocuments("Tile", kafle, { keepId: true });
  }
  if (dane.regions?.length) {
    await scene.createEmbeddedDocuments("Region", przywrocZachowania(dane.regions, stanPrzejsc), { keepId: true });
    raport.przejsciaZeStanem = stanPrzejsc.size;
  }
  if (dane.notes?.length)
    await scene.createEmbeddedDocuments("Note", dane.notes, { keepId: true });
  if (dane.lights?.length)
    await scene.createEmbeddedDocuments("AmbientLight", dane.lights, { keepId: true });
  if (dane.tokens?.length || resetDrzwi)
    raport.spotkania = await rozmiescSpotkania(scene, dane.tokens, { reset: resetDrzwi });

  // Świeżo wstawione ściany obrysu mają wartości domyślne z pliku, więc
  // trzeba je dociągnąć do faktycznego stanu drzwi — patrz syncAll().
  const przestawione = await mapPropsApi.syncAll(scene);
  raport.obrysPrzestawiony = przestawione;

  ui.notifications.info(
    `${scene.name}: ${raport.scianyWstawiane} ścian, ${raport.kafleWstawiane} kafli` +
    (stos ? `, ${dane.levels.length} poziomów` : "") + `. ` +
    `Zachowano ${raport.nietkniete.tokeny} tokenów i ${raport.scianyZachowane} ` +
    `ścian dorysowanych ręcznie.`);
  return raport;
}

/**
 * Pierwszy import mapy jako nowa scena.
 * @param {string} mapId nazwa mapy bez rozszerzenia
 * @param {string} [nazwa] nazwa sceny w FVTT
 * @param {object} [opcje]
 * @param {object} [opcje.dane] dane sceny zamiast pliku z katalogu świata (testy)
 */
async function utworz(mapId, nazwa, { dane: daneZRaki = null } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG może tworzyć sceny.");
  if (znajdzScene(mapId)) {
    ui.notifications.warn(
      `Scena dla "${mapId}" już istnieje — użyj game.neuroshima.maps.update("${mapId}")`);
    return null;
  }
  const dane = daneZRaki ? foundry.utils.deepClone(daneZRaki) : await pobierzOpis(mapId);
  if (nazwa) dane.name = nazwa;
  if (!daneZRaki) await aktualizujNotatki(await pobierzNotatki(mapId));
  // Tokeny spotkań nie mają jeszcze aktora — stawia je rozmiescSpotkania, gdy scena już jest.
  const { tokens = [], ...bezTokenow } = dane;
  const scene = await Scene.create(bezTokenow, { keepId: false });
  if (tokens.length) await rozmiescSpotkania(scene, tokens);
  // Świeżo wstawione ściany obrysu mają wartości domyślne z pliku, więc
  // trzeba je dociągnąć do faktycznego stanu drzwi — patrz syncAll().
  await mapPropsApi.syncAll(scene);
  ui.notifications.info(`Utworzono scenę "${scene.name}".`);
  return scene;
}

/** Wypisuje sceny wygenerowane z map i ich stan. */
function lista() {
  return game.scenes
    .filter(s => s.getFlag(FLAG, "mapId"))
    .map(s => ({
      mapa: s.getFlag(FLAG, "mapId"), scena: s.name,
      sciany: s.walls.size, reczne: s.walls.filter(w => !odEksportera(w)).length,
      kafle: s.tiles.size, tokeny: s.tokens.size
    }));
}

export function registerMapSync() {
  console.log(`${MODULE_ID} | Synchronizacja map gotowa`);
}

export const mapSyncApi = { update, utworz, lista };
