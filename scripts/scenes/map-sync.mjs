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
 * | tło, wymiary, siatka      | tokeny, światła, dźwięki, notatki    |
 * | ściany z flagą `source`   | ściany bez flagi (dorysowane ręcznie)|
 * | kafle z flagą `propId`    | kafle bez flagi                      |
 * |                           | mgła, dziennik, playlista, nazwa     |
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
 *     game.neuroshima.maps.utworz("UPSIDE", "Silos — Zewnątrz")  // pierwszy import
 */

import { mapPropsApi } from "./map-props.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = MODULE_ID;
const KATALOG_SCEN = "worlds/output/scenes";

/** Czy dokument został wytworzony przez eksporter, czy dodany ręcznie. */
function odEksportera(doc) {
  const flagi = doc.flags?.[FLAG];
  return !!(flagi && (flagi.source || flagi.propId));
}

async function pobierzOpis(mapId) {
  // Znacznik czasu omija pamięć podręczną przeglądarki - bez tego druga
  // aktualizacja pod rząd czytałaby stary plik.
  const res = await fetch(`${KATALOG_SCEN}/${mapId}.scene.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Nie mogę wczytać ${mapId}.scene.json (${res.status})`);
  return res.json();
}

function znajdzScene(mapId) {
  return game.scenes.find(s => s.getFlag(FLAG, "mapId") === mapId) ?? null;
}

/**
 * Aktualizuje istniejącą scenę danymi z ponownego eksportu.
 * @param {string} mapId nazwa mapy bez rozszerzenia, np. "UPSIDE"
 * @param {object} [opcje]
 * @param {boolean} [opcje.podglad] tylko policz różnice, nic nie zapisuj
 */
async function update(mapId, { podglad = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG może aktualizować sceny.");
  const scene = znajdzScene(mapId);
  if (!scene) {
    ui.notifications.error(
      `Nie znalazłem sceny dla mapy "${mapId}". Pierwszy import: ` +
      `game.neuroshima.maps.utworz("${mapId}", "Nazwa sceny")`);
    return null;
  }
  const dane = await pobierzOpis(mapId);

  const scianyDoUsuniecia = scene.walls.filter(odEksportera).map(w => w.id);
  const kafleDoUsuniecia = scene.tiles.filter(odEksportera).map(t => t.id);
  // Regiony trudnego terenu tez pochodzą z eksportu — meble nie są ścianą,
  // tylko spowolnieniem, więc jadą jako Region z zachowaniem systemu dnd5e.
  const regionyDoUsuniecia = scene.regions.filter(odEksportera).map(r => r.id);
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
    nietkniete: {
      tokeny: scene.tokens.size, swiatla: scene.lights.size,
      notatki: scene.notes.size, dzwieki: scene.sounds.size,
      rysunki: scene.drawings.size, regiony: scene.regions?.size ?? 0
    }
  };
  if (podglad) return raport;

  // Tło i wymiary. Nazwy sceny NIE ruszamy - mogłeś ją nazwać po swojemu.
  const poziom = scene.levels.contents[0];
  if (poziom && dane.levels?.[0]) {
    await poziom.update({ background: dane.levels[0].background });
  }
  // Tylko rozmiar siatki, punktowo. `scene.grid` to instancja klasy siatki
  // (BaseGrid), a nie model danych — nie ma `toObject()`, a podanie całego
  // obiektu skasowałoby styl, kolor i przezroczystość ustawione ręcznie.
  await scene.update({
    width: dane.width, height: dane.height,
    padding: dane.padding, "grid.size": dane.grid.size
  });

  // Stan drzwi to stan SESJI, nie mapy. Plik zawsze niesie ds:0, więc bez
  // tego re-eksport w środku gry zatrzaskiwałby wrota silosu i szlaban, które
  // gracze zdążyli otworzyć. Zapamiętujemy po `_id` — są deterministyczne,
  // więc ta sama ściana wróci pod tym samym identyfikatorem.
  const stanDrzwi = new Map();
  for (const wall of scene.walls) {
    if (wall.door > 0 && odEksportera(wall)) stanDrzwi.set(wall.id, wall.ds);
  }

  if (scianyDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Wall", scianyDoUsuniecia);
  if (kafleDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Tile", kafleDoUsuniecia);
  if (regionyDoUsuniecia.length)
    await scene.deleteEmbeddedDocuments("Region", regionyDoUsuniecia);
  if (dane.walls?.length) {
    const sciany = dane.walls.map(w => stanDrzwi.has(w._id)
      ? { ...w, ds: stanDrzwi.get(w._id) }
      : w);
    await scene.createEmbeddedDocuments("Wall", sciany, { keepId: true });
    raport.drzwiZeStanem = stanDrzwi.size;
  }
  if (dane.tiles?.length)
    await scene.createEmbeddedDocuments("Tile", dane.tiles, { keepId: true });
  if (dane.regions?.length)
    await scene.createEmbeddedDocuments("Region", dane.regions, { keepId: true });

  // Świeżo wstawione ściany obrysu mają wartości domyślne z pliku, więc
  // trzeba je dociągnąć do faktycznego stanu drzwi — patrz syncAll().
  const przestawione = await mapPropsApi.syncAll(scene);
  raport.obrysPrzestawiony = przestawione;

  ui.notifications.info(
    `${scene.name}: ${raport.scianyWstawiane} ścian, ${raport.kafleWstawiane} kafli. ` +
    `Zachowano ${raport.nietkniete.tokeny} tokenów i ${raport.scianyZachowane} ` +
    `ścian dorysowanych ręcznie.`);
  return raport;
}

/**
 * Pierwszy import mapy jako nowa scena.
 * @param {string} mapId nazwa mapy bez rozszerzenia
 * @param {string} [nazwa] nazwa sceny w FVTT
 */
async function utworz(mapId, nazwa) {
  if (!game.user.isGM) return ui.notifications.warn("Tylko MG może tworzyć sceny.");
  if (znajdzScene(mapId)) {
    ui.notifications.warn(
      `Scena dla "${mapId}" już istnieje — użyj game.neuroshima.maps.update("${mapId}")`);
    return null;
  }
  const dane = await pobierzOpis(mapId);
  if (nazwa) dane.name = nazwa;
  const scene = await Scene.create(dane, { keepId: false });
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
