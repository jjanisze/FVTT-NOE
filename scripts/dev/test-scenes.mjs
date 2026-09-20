/**
 * Neuroshima 5e — sceny kalibracyjne (jednorazowe, odtwarzalne).
 *
 * Scena kalibracyjna nie należy do kampanii. Powstaje, żeby coś zmierzyć albo
 * porównać na oko, i ma być wyrzucana oraz odtwarzana bez ceregieli. Pierwszym
 * odbiorcą jest Szafa z potworami (`monster-closet.mjs`) — jeden żeton na każdą
 * istotę Bestiariusza obok wzorców dnd5e, do wyrównania skali grafiki. Drugim,
 * zapowiedzianym w `PLAN_shooting_vfx.md`, będzie strzelnica. Ta warstwa trzyma
 * wyłącznie mechanikę „oznacz / wyrzuć / zbuduj od nowa", żeby drugi odbiorca
 * był funkcją budującą, a nie kopią tego samego kodu.
 *
 * ## Dlaczego na żywo, a nie skryptem w `dev/`
 *
 * Wrzucenie aktora z kompendium na scenę przechodzi przez
 * `Actor.create({fromCompendium: true})` i pełne uzupełnianie domyślnych wartości
 * schematu (`client/canvas/layers/tokens.mjs`, `_onDropActorData`) — maszynerię,
 * która istnieje tylko w działającej grze. `dev/packs/build-packs.mjs` pisze
 * wyłącznie do odizolowanego packa, ręcznie zbudowanymi dokumentami; pisanie tak
 * do LevelDB *świata* znaczyłoby przepisanie walidacji Foundry'ego na piechotę,
 * z realnym ryzykiem uszkodzenia żywych danych i bez żadnego zysku.
 *
 * ## Co znaczy „odtwarzalna"
 *
 * Wszystko, co scena kalibracyjna wytworzy, niesie flagę
 * `flags.neuroshima-2026-overrides.testScene = { id, … }`:
 *
 * | dokument | flaga             | po co                                              |
 * |----------|-------------------|----------------------------------------------------|
 * | Scene    | `{id}`            | identyfikacja — **nie po nazwie**, nazwy nie są unikalne |
 * | Token    | `{id, creatureId}`| zbieranie wyniku kalibracji wprost z żetonu        |
 * | Tile     | `{id, role}`      | wzorce; kasowane i wstawiane na nowo               |
 * | Drawing  | `{id, role}`      | podpisy                                            |
 * | Actor    | `{id, creatureId}`| jednorazowe kopie światowe (niżej)                 |
 *
 * Odtworzenie kasuje **wyłącznie** dokumenty z flagą — to ta sama umowa co
 * w `scenes/map-sync.mjs`: cokolwiek MG dorysuje ręcznie, zostaje. Flagę dokłada
 * ten plik, nie funkcja budująca, więc nie da się przez nieuwagę wyprodukować
 * dokumentu, którego następne odtworzenie już nie posprząta.
 *
 * ## Jednorazowe kopie aktorów
 *
 * Wrzucenie aktora z kompendium na *dowolną* scenę zawsze tworzy nową, światową
 * kopię aktora — bez deduplikacji, dwa rzuty tej samej istoty to dwie niezależne
 * kopie. Scena z 51 istotami to więc 51 śmieciowych aktorów na każde odtworzenie.
 * Dlatego kopie lądują w osobnym folderze, z flagą, i giną razem z żetonami.
 * Konsekwencja, która jest sedno kalibracji: kopia jest jednorazowa, więc nic,
 * co na niej ustawisz, nie wraca do kompendium ani do następnego rzutu — wynik
 * trzeba czytać z **żetonu**, nie z aktora.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "testScene";

/* -------------------------------------------- */
/*  Flaga                                        */
/* -------------------------------------------- */

/**
 * Flagi znaczące dokument jako własność danej scen kalibracyjnej.
 * @param {string} testSceneId
 * @param {object} [extra] dodatkowe pola (np. `creatureId`, `role`)
 */
export function testSceneFlags(testSceneId, extra = {}) {
  return { [MODULE_ID]: { [FLAG]: { id: testSceneId, ...extra } } };
}

/** Czy dokument należy do tej scen kalibracyjnej. */
function owned(doc, testSceneId) {
  return doc.getFlag(MODULE_ID, `${FLAG}.id`) === testSceneId;
}

/** Dokłada flagę do kopii danych dokumentu, nie ruszając pól podanych przez plan. */
function tagAll(testSceneId, docs) {
  return docs.map(d => foundry.utils.mergeObject(
    foundry.utils.deepClone(d),
    { flags: testSceneFlags(testSceneId) }
  ));
}

/* -------------------------------------------- */
/*  Wyszukiwanie i sprzątanie                    */
/* -------------------------------------------- */

/** @returns {Scene|null} */
export function findTestScene(testSceneId) {
  return game.scenes.find(s => owned(s, testSceneId)) ?? null;
}

/** Folder na jednorazowe kopie aktorów — jeden na scenę, też oznaczony flagą. */
async function ensureActorFolder(testSceneId, name) {
  const existing = game.folders.find(f => f.type === "Actor" && owned(f, testSceneId));
  if (existing) return existing;
  return Folder.implementation.create({
    name, type: "Actor", flags: testSceneFlags(testSceneId)
  });
}

/**
 * Kasuje wszystko, co niesie flagę tej scen kalibracyjnej.
 *
 * Żetony przed aktorami: żeton niepowiązany trzyma `actorId`, więc odwrotna
 * kolejność zostawiałaby na chwilę żetony bez aktora.
 *
 * ## Aktor ginie **tylko** z jawnym `disposable: true`
 *
 * Sama flaga `testScene.id` nie wystarcza i nie może wystarczać. Szafa
 * z potworami stawia żetony na jednorazowych kopiach, które wolno wyrzucić —
 * ale Szafa z postaciami stawia żetony **prawdziwych postaci kampanii** na
 * scenie, którą odtworzenie za chwilę wyczyści. Gdyby wystarczała sama
 * przynależność do scen, jedno nieostrożne `createActors` w funkcji budującej
 * kasowałoby Alana, Lorentza i Raynalda — bez pytania i bez odwrotu.
 *
 * `disposable: true` ustawia wyłącznie `createDisposableActors()`, więc aktor,
 * którego ta warstwa nie stworzyła, nie ma jak się w to wpisać.
 */
export async function clearTestScene(testSceneId, scene = findTestScene(testSceneId)) {
  const report = { tokens: 0, tiles: 0, drawings: 0, actors: 0, spared: 0 };
  if (scene) {
    for (const [type, collection] of [["Token", "tokens"], ["Tile", "tiles"], ["Drawing", "drawings"]]) {
      const ids = scene[collection].filter(d => owned(d, testSceneId)).map(d => d.id);
      if (ids.length) await scene.deleteEmbeddedDocuments(type, ids);
      report[collection] = ids.length;
    }
  }
  const mine = game.actors.filter(a => owned(a, testSceneId));
  const disposable = mine.filter(a => a.getFlag(MODULE_ID, `${FLAG}.disposable`) === true);
  report.spared = mine.length - disposable.length;
  if (report.spared) {
    console.warn(`${MODULE_ID} | ${report.spared} aktorów z flagą "${testSceneId}" bez `
      + `disposable:true — NIE kasuję. To albo prawdziwe postacie, albo kopie sprzed tej reguły.`);
  }
  if (disposable.length) await Actor.implementation.deleteDocuments(disposable.map(a => a.id));
  report.actors = disposable.length;
  return report;
}

/* -------------------------------------------- */
/*  Scena                                        */
/* -------------------------------------------- */

/**
 * Scena o wymiarach z planu: tworzy nową albo dociąga istniejącą.
 *
 * Nazwy istniejącej scen **nie ruszamy** — MG mógł ją przemianować, a
 * identyfikacja i tak idzie po flagze. Wymiary owszem: liczba istot rośnie,
 * więc scena musi umieć spuchnąć między odtworzeniami.
 */
async function ensureTestScene(testSceneId, { name, width, height, gridSize, backgroundColor }) {
  const grid = {
    type: CONST.GRID_TYPES.SQUARE, size: gridSize,
    // Siatka jest tu treścią, nie ozdobą: pole siatki to odnośnik, względem
    // którego ocenia się wypełnienie kadru żetonem. Musi być dobrze widoczna.
    style: "solidLines", color: "#ffffff", alpha: 0.35, thickness: 1
  };

  const existing = findTestScene(testSceneId);
  if (existing) {
    // Klucze siatki punktowo, nie całym obiektem: `scene.grid` jest instancją
    // klasy siatki, nie modelem danych (ta sama ostrożność co w `map-sync.mjs`).
    await existing.update({
      width, height, padding: 0,
      ...Object.fromEntries(Object.entries(grid).map(([k, v]) => [`grid.${k}`, v]))
    });
    const level = existing.levels.contents[0];
    if (level) await level.update({ "background.color": backgroundColor });
    return existing;
  }

  // Poziom musi dostać `defaultLevel0000` jawnie. `TokenDocument#level` ma
  // dokładnie tę stałą jako wartość początkową, a `Scene.create` z własną
  // tablicą `levels` nadałby poziomowi losowy identyfikator — wtedy każdy żeton
  // wskazuje na poziom, którego nie ma, i **nic się nie rysuje, bez błędu**.
  const levelId = foundry.documents.BaseScene.metadata.defaultLevelId;
  return Scene.implementation.create({
    name, width, height, padding: 0, grid,
    // Scena jednorazowa nie ma po co siedzieć na pasku nawigacji.
    navigation: false,
    // Bez mgły i bez pól widzenia — tu się patrzy na grafikę, nie gra.
    tokenVision: false,
    fog: { mode: CONST.FOG_EXPLORATION_MODES.DISABLED },
    environment: { darknessLevel: 0, globalLight: { enabled: true, bright: true } },
    initialLevel: levelId,
    levels: [{
      _id: levelId, name: "Podłoga",
      elevation: { bottom: 0, top: null },
      background: { src: null, color: backgroundColor }
    }],
    flags: testSceneFlags(testSceneId)
  });
}

/* -------------------------------------------- */
/*  Jednorazowe kopie aktorów                    */
/* -------------------------------------------- */

/**
 * Kopiuje aktorów z kompendium do świata, tą samą drogą co przeciągnięcie na
 * kanwę (`fromCompendium` + `Actor.create({fromCompendium: true})`), tylko
 * hurtem i z flagą oraz folderem.
 *
 * @param {string} testSceneId
 * @param {Actor[]} sources aktorzy z kompendium
 * @param {object} [options]
 * @param {Folder|null} [options.folder]
 * @param {(actor: Actor) => string|null} [options.creatureIdOf] co wpisać w `creatureId`
 * @returns {Promise<Actor[]>} kopie, w kolejności `sources`
 */
export async function createDisposableActors(testSceneId, sources, { folder = null, creatureIdOf } = {}) {
  const payload = sources.map(src => {
    const data = game.actors.fromCompendium(src);
    data.folder = folder?.id ?? null;
    // Kopie są śmieciem roboczym MG — gracze nie mają po co ich widzieć
    // ani na liście aktorów, ani przez żeton na scenie.
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    // `mergeObject` dopisuje się do istniejących flag, więc `bestiary` (kolor
    // krwi, SP, źródło grafiki) zostaje — a właśnie po nim poznajemy istotę.
    // `disposable: true` to jedyne wejście do kasowania aktorów w
    // `clearTestScene()` — patrz komentarz tam.
    return foundry.utils.mergeObject(data, {
      flags: testSceneFlags(testSceneId, {
        disposable: true,
        creatureId: creatureIdOf?.(src) ?? null
      })
    });
  });
  if (!payload.length) return [];
  return Actor.implementation.createDocuments(payload, { fromCompendium: true });
}

/* -------------------------------------------- */
/*  Odtworzenie                                  */
/* -------------------------------------------- */

/**
 * @typedef {object} TestSceneLayout
 * @property {number} width              szerokość kanwy w px
 * @property {number} height             wysokość kanwy w px
 * @property {number} gridSize           px na pole siatki
 * @property {string} backgroundColor
 * @property {object[]} [tiles]          dane kafli (flagę dokłada ta warstwa)
 * @property {object[]} [drawings]       dane rysunków (flagę dokłada ta warstwa)
 * @property {(ctx: {scene: Scene, level: string, createActors: Function}) => Promise<object[]>} [tokens]
 */

/**
 * Wyrzuca i buduje od nowa scenę kalibracyjną.
 *
 * @param {string} testSceneId stabilny identyfikator, np. `"monster-closet"`
 * @param {object} spec
 * @param {string} spec.name nazwa **nowej** sceny (istniejącej nie zmienia)
 * @param {string} [spec.folderName] folder na jednorazowe kopie aktorów
 * @param {() => Promise<TestSceneLayout>} spec.plan
 * @returns {Promise<{scene: Scene, wiped: object, built: object}|null>}
 */
export async function regenerateTestScene(testSceneId, { name, folderName, plan }) {
  if (!game.user.isGM) {
    ui.notifications.warn("Tylko MG może odtwarzać sceny kalibracyjne.");
    return null;
  }

  // Plan pierwszy, bo z niego wynikają wymiary kanwy.
  const layout = await plan();
  const scene = await ensureTestScene(testSceneId, { name, ...layout });
  const wiped = await clearTestScene(testSceneId, scene);
  const folder = folderName ? await ensureActorFolder(testSceneId, folderName) : null;

  const built = { tiles: 0, drawings: 0, tokens: 0, actors: 0 };

  if (layout.tiles?.length) {
    await scene.createEmbeddedDocuments("Tile", tagAll(testSceneId, layout.tiles));
    built.tiles = layout.tiles.length;
  }
  if (layout.drawings?.length) {
    await scene.createEmbeddedDocuments("Drawing", tagAll(testSceneId, layout.drawings));
    built.drawings = layout.drawings.length;
  }
  if (layout.tokens) {
    const level = scene.levels.contents[0]?.id;
    const tokenData = await layout.tokens({
      scene, level,
      createActors: (sources, options) => createDisposableActors(testSceneId, sources, { folder, ...options })
    });
    if (tokenData.length) {
      await scene.createEmbeddedDocuments("Token", tagAll(testSceneId, tokenData));
      built.tokens = tokenData.length;
    }
    built.actors = game.actors.filter(a => owned(a, testSceneId)).length;
  }

  return { scene, wiped, built };
}

/** Żetony tej scen kalibracyjnej, razem z `creatureId` z flagi. */
export function taggedTokens(testSceneId, scene = findTestScene(testSceneId)) {
  if (!scene) return [];
  return scene.tokens.filter(t => owned(t, testSceneId));
}
