/**
 * Neuroshima 5e — propy map: przegrody sterowane stanem drzwi.
 *
 * Mapy z Tiled (repo `C:\Git\Neuroshima\Maps`) eksportują część obiektów jako
 * drzwi z własną teksturą: szlaban przy stróżówce, wrota silosu. Sam ruch
 * i dźwięk robi Foundry — v14 ma natywne animacje drzwi (`slide`, `swing`,
 * `swivel`, `ascend`, `descend`) i tekstura siedzi wprost na ścianie
 * (`animation.texture`). Nie ma tu więc żadnego kodu od animowania.
 *
 * Zostaje jedna rzecz, której silnik nie ogarnia sam.
 *
 * ## Prop, który przykrywa obszar
 *
 * Wrota silosu semantycznie nie są drzwiami w ścianie, tylko **podłogą nad
 * dziurą**. Działają odwrotnie niż drzwi: zamknięte mają być przechodnie (stoi
 * się na płycie), otwarte — nie (dziura na dziesięć pól). Ściana-drzwi biegnie
 * przez środek szybu i blokuje tylko jego przekraczanie wzdłuż jednej osi,
 * a obrys szybu blokuje zawsze, niezależnie od tego, czy płyta jest na miejscu.
 *
 * Dlatego eksporter oznacza ściany obrysu leżące w zasięgu takiego propa flagą
 * `role: "cover"` z tym samym `propId` co drzwi. Ten plik przełącza je razem
 * ze stanem drzwi: płyta zasunięta → obrys przepuszcza, płyta odjechana →
 * obrys blokuje.
 *
 * Szlaban nie ma flagi `coversArea`, więc nic go tu nie dotyczy — jest zwykłymi
 * drzwiami i obsługuje go wyłącznie silnik.
 *
 * ## Kto zapisuje
 *
 * Hook `updateWall` odpala się u wszystkich klientów, ale dokumenty może
 * zaktualizować tylko MG. Gracz klikający klamkę zmienia `ds` na drzwiach
 * (Foundry na to pozwala), MG podłapuje to i przestawia obrys, a zmiana
 * rozchodzi się do reszty. Bez tego strażnika każdy klient zapisywałby to samo.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Zakres flag. Musi być identyfikatorem zarejestrowanego modułu — Foundry
 * odrzuca `getFlag()` dla dowolnie wymyślonej nazwy ("Flag scope ... is not
 * valid or not currently active"), nawet jeśli surowe dane da się zapisać.
 * Eksporter zapisuje dokładnie ten sam ciąg (FLAG_SCOPE w export_fvtt.py).
 */
const FLAG = MODULE_ID;

/** Stany drzwi w Foundry: 0 zamknięte, 1 otwarte, 2 zamknięte na klucz. */
const DOOR_OPEN = 1;

/**
 * Wartości zmysłów w v14 to 0/10/20 (NONE/LIMITED/NORMAL), a nie 0/1/2
 * jak we wcześniejszych wersjach.
 */
const SENSE_NONE = 0;
const SENSE_NORMAL = 20;

/** Obrys blokujący — płyta odjechana, szyb stoi otworem. */
const COVER_BLOCKING = {
  move: SENSE_NORMAL, sight: SENSE_NORMAL,
  light: SENSE_NORMAL, sound: SENSE_NORMAL
};

/** Obrys przepuszczający — płyta na miejscu, chodzi się po niej. */
const COVER_OPEN = {
  move: SENSE_NONE, sight: SENSE_NONE,
  light: SENSE_NONE, sound: SENSE_NONE
};

/**
 * Doprowadza obrys przykrywanego obszaru do stanu zgodnego z drzwiami propa.
 * @param {Scene} scene
 * @param {string} propId
 * @param {boolean} otwarte czy płyta jest odjechana
 * @returns {Promise<number>} ile ścian faktycznie zmieniono
 */
async function syncCover(scene, propId, otwarte) {
  const docelowy = otwarte ? COVER_BLOCKING : COVER_OPEN;
  const updates = [];
  for (const wall of scene.walls) {
    if (wall.getFlag(FLAG, "propId") !== propId) continue;
    if (wall.getFlag(FLAG, "role") !== "cover") continue;
    const zmiana = Object.entries(docelowy)
      .filter(([klucz, wartosc]) => wall[klucz] !== wartosc);
    if (zmiana.length) updates.push({ _id: wall.id, ...docelowy });
  }
  if (updates.length) await scene.updateEmbeddedDocuments("Wall", updates);
  return updates.length;
}

/**
 * Przełącza propa z poziomu makra lub konsoli, bez klikania w klamkę.
 * Przydatne, gdy wrota otwiera fabuła (panel sterowania, karta dostępu),
 * a nie ktoś stojący obok. Animację i dźwięk i tak zrobi Foundry.
 * @param {string} propId
 * @param {boolean} [open] pominięte = przełącz na przeciwny
 * @returns {Promise<boolean|null>} nowy stan albo null, gdy propa nie ma
 */
async function toggleProp(propId, open) {
  const scene = canvas?.scene;
  if (!scene) return null;
  const wall = scene.walls.find(w =>
    w.getFlag(FLAG, "propId") === propId && w.getFlag(FLAG, "role") === "door");
  if (!wall) {
    console.warn(`${MODULE_ID} | prop "${propId}" nie ma ściany-drzwi`);
    return null;
  }
  const next = open ?? wall.ds !== DOOR_OPEN;
  await wall.update({ ds: next ? DOOR_OPEN : 0 });
  return next;
}

/**
 * Doprowadza wszystkie propy sceny do stanu zgodnego z ich drzwiami.
 *
 * Wołane po wejściu na scenę i po aktualizacji z ponownego eksportu. To drugie
 * jest konieczne, bo świeżo wstawione ściany obrysu przychodzą z pliku
 * z wartościami domyślnymi — czyli blokującymi — niezależnie od tego, czy
 * płyta stoi zasunięta. Bez tego kroku wrota wyglądałyby na zamknięte,
 * a szyb pod nimi dalej odgradzałby teren.
 *
 * @param {Scene} scene
 * @returns {Promise<number>} ile ścian przestawiono
 */
async function syncAll(scene) {
  if (!scene) return 0;
  let zmienione = 0;
  for (const wall of scene.walls) {
    if (wall.getFlag(FLAG, "role") !== "door") continue;
    const propId = wall.getFlag(FLAG, "propId");
    if (propId) zmienione += await syncCover(scene, propId, wall.ds === DOOR_OPEN);
  }
  return zmienione;
}


/** Wypisuje propy na bieżącej scenie — do szybkiego sprawdzenia w konsoli. */
function listProps() {
  const scene = canvas?.scene;
  if (!scene) return [];
  const out = new Map();
  for (const wall of scene.walls) {
    const propId = wall.getFlag(FLAG, "propId");
    if (!propId) continue;
    const wpis = out.get(propId) ?? { propId, drzwi: null, obrys: 0 };
    if (wall.getFlag(FLAG, "role") === "cover") wpis.obrys += 1;
    else wpis.drzwi = { otwarte: wall.ds === DOOR_OPEN,
                        animacja: wall.animation?.type };
    out.set(propId, wpis);
  }
  return [...out.values()];
}

export function registerMapProps() {
  Hooks.on("updateWall", (wall, changes) => {
    if (!("ds" in changes)) return;
    if (!game.user.isGM) return;               // patrz nagłówek: zapisuje tylko MG
    if (wall.getFlag(FLAG, "role") !== "door") return;
    const propId = wall.getFlag(FLAG, "propId");
    if (!propId) return;
    syncCover(wall.parent, propId, changes.ds === DOOR_OPEN);
  });

  // Scena mogła zostać zapisana z drzwiami w jednym stanie, a obrysem w drugim.
  // Przy wejściu na scenę wyrównujemy — inaczej płyta wyglądałaby na zasuniętą,
  // a szyb dalej blokowałby ruch.
  Hooks.on("canvasReady", () => {
    if (!game.user.isGM) return;
    syncAll(canvas.scene);
  });

  console.log(`${MODULE_ID} | Propy map gotowe`);
}

export const mapPropsApi = { toggleProp, syncCover, syncAll, listProps };
