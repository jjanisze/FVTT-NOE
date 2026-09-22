/**
 * Neuroshima 5e — „czy jeszcze warto pisać do tego dokumentu".
 *
 * ## Problem
 *
 * Spora część tego modułu dopina się do `createItem`/`updateItem`/`deleteItem` i odpala
 * stamtąd **asynchroniczną robotę, której nikt nie czeka**: `void sync…(item)`, debounce,
 * łańcuch obietnic per aktor. To jest celowe — hook ma oddać sterowanie od razu, a sync
 * aktywności czy efektów to kilka round-tripów do serwera.
 *
 * Skutek uboczny: między startem takiego łańcucha a jego zapisem dokument może zostać
 * **skasowany**. Zapis leci wtedy do serwera, który już go nie ma, i wraca błędem po sockecie:
 * „The Actor <id> does not exist in actors" albo „id [<id>] does not exist in the
 * EmbeddedCollection collection". W konsoli ląduje jako **nieobsłużone odrzucenie obietnicy**,
 * u MG jako czerwony dymek — mimo że nic złego się nie stało, bo nie ma już czego synchronizować.
 *
 * Zmierzone na żywo 2026-09-22 (przebieg Quencha): 17 takich błędów na 412 zielonych testów.
 *
 * ## Dwa różne okna, oba trzeba zamknąć
 *
 * 1. **Kasowanie w locie.** Żądanie poszło, serwer je przetworzył, ale lokalna kopia jeszcze
 *    żyje — usunięcie z kolekcji dzieje się dopiero na broadcast (hook `delete*`). Zmierzone:
 *    żądanie kasowania o t=752, spóźniony zapis o t=776 (kolekcja wciąż widzi dokument),
 *    hook `deleteItem` dopiero o t=791. **Sprawdzanie kolekcji tego nie wyłapie** — stąd
 *    rejestr `dying`, zasilany z `preDelete*` (odpala się PRZED wysłaniem żądania).
 * 2. **Kasowanie już zakończone.** Robota debounce'owana potrafi obudzić się długo po tym, jak
 *    `delete*` przeleciał i uuid wypadł z rejestru. Tu z kolei rejestr nie pomoże, a kolekcja
 *    już jest aktualna — więc pytamy ją.
 *
 * Pierwsza wersja tego pliku pilnowała tylko (1) i wyciszała błędy przy przedmiotach, ale nie
 * przy aktorach — bo efekty Udźwigu/Bez dna dopinają się właśnie oknem (2).
 *
 * ## Dziedziczenie po rodzicu
 *
 * Skasowanie aktora kasuje serwerowo jego przedmioty i efekty, ale `preDeleteItem` dla nich
 * **nie leci**, a osierocona `EmbeddedCollection` dalej je pokazuje. Dlatego oba testy idą
 * po łańcuchu `parent` — przedmiot musi umieć zapytać o swojego aktora.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Po tylu ms wpis w `dying` uznajemy za nieaktualny — patrz uwaga o anulowanym kasowaniu niżej. */
const STALE_MS = 15_000;

/** @type {Map<string, number>} uuid → czas zgłoszenia kasowania */
const dying = new Map();

const TRACKED = ["Actor", "Item", "ActiveEffect"];

export function registerDocLiveness() {
  for (const type of TRACKED) {
    Hooks.on(`preDelete${type}`, doc => { if (doc?.uuid) dying.set(doc.uuid, Date.now()); });
    Hooks.on(`delete${type}`, doc => { if (doc?.uuid) dying.delete(doc.uuid); });
  }
  console.log(`${MODULE_ID} | Doc liveness tracking registered`);
}

/**
 * Czy ten dokument jest w trakcie kasowania (okno 1 z nagłówka).
 *
 * Wpisy mają znacznik czasu i wygasają po {@link STALE_MS}. To nie optymalizacja, tylko
 * bezpiecznik: hook `preDelete*` może zwrócić `false` i **odwołać** kasowanie, a wtedy
 * `delete*` nigdy nie przyjdzie i uuid zostałby w rejestrze na zawsze — cicho wyłączając
 * synchronizację tego dokumentu do końca sesji.
 */
function _isDying(doc) {
  const now = Date.now();
  for (let node = doc; node; node = node.parent) {
    const at = node.uuid ? dying.get(node.uuid) : undefined;
    if (at === undefined) continue;
    if (now - at < STALE_MS) return true;
    dying.delete(node.uuid);
  }
  return false;
}

/** Czy dokument (albo któryś z jego rodziców) wypadł już ze swojej kolekcji (okno 2). */
function _isGone(doc) {
  for (let node = doc; node; node = node.parent) {
    const coll = node.collection;
    // Brak kolekcji to nie dowód nieistnienia — tak wyglądają m.in. aktorzy syntetyczni
    // (`actor.isToken`). W razie niepewności nie blokujemy zapisu.
    if (!coll || !node.id) continue;
    if (!coll.has(node.id)) return true;
  }
  return false;
}

/**
 * Czy nadal ma sens pisać do tego dokumentu.
 *
 * Używaj w każdym miejscu, które zapisuje do dokumentu **po `await`** w robocie odpalonej
 * z hooka albo z debounce'u. Dla łańcucha kilku zapisów pytaj **między krokami**, nie tylko
 * na wejściu — kasowanie potrafi wpaść w środek serii (tak właśnie wyglądał przypadek
 * `fire-modes.mjs`: żądanie kasowania wyszło między pierwszym a drugim krokiem synchronizacji).
 *
 * @param {foundry.abstract.Document|null} doc
 * @returns {boolean}  `false` także dla `null` — „nie ma do czego pisać" to ta sama odpowiedź.
 */
export function isDocumentLive(doc) {
  if (!doc) return false;
  return !_isDying(doc) && !_isGone(doc);
}

/** Tylko dla testów: czyści rejestr między przebiegami. */
export function _resetDocLiveness() {
  dying.clear();
}
