/**
 * Neuroshima 5e — plansza pościgu: przyciąganie do torów i recentrowanie pola.
 *
 * Projekt: `PLAN_poscigi.md` §2.4–2.5. Geometria i stan: `poscig.mjs`.
 *
 * ## Przyciąganie jest dokładane, nie odbierane
 *
 * Scena pościgu jest **gridless**, więc `BaseToken#getSnappedPosition` zwraca punkt bez zmian
 * (`common/documents/token.mjs`: `if (grid.isGridless) return unsnapped;`). Swoboda jest więc
 * stanem wyjściowym, a my dokładamy jedną regułę: wyrównaj **X** do środka toru, zostaw **Y**
 * w spokoju. Pionowo w torze mieści się kilka pojazdów jeden pod drugim i tak ma być — RAW
 * rozstrzyga starcia po „tym samym znaczniku", nie po sąsiedztwie.
 *
 * ## Dlaczego `getSnappedPosition`, a nie `preUpdateToken`
 *
 * Pierwsze podejście przepisywało `changes.x` w haku `preUpdateToken`. **Nie działa w v14
 * i nie da się tego uratować** — token nie przesuwał się wtedy w ogóle, ani na pozycję
 * przyciągniętą, ani na upuszczoną, a w konsoli nie pojawiało się nic.
 *
 * Powód: ruch tokenu jest rozstrzygany **przed** hakiem dokumentu.
 * `TokenDocument._preUpdateOperation` (statyczne, na całą operację) woła
 * `#preUpdateOperationMovement`, które liczy trasę, wpisuje gotowy cel do `operation.updates[i]`
 * — stąd komplet `MOVEMENT_FIELDS` w `changes` już przy wejściu do haka — a na koniec robi
 * `delete operation.movement`. Dopiero potem `_preUpdate` odpala `preUpdateToken` i ponownie
 * wchodzi w `#preUpdateMovement`, tyle że ruch jest już skonsumowany. Zmiana `changes.x` w tym
 * miejscu rozjeżdża się z policzoną trasą i cała paczka `MOVEMENT_FIELDS` zostaje wykasowana
 * (`if (!planned && (passed.length === 0))`). Efekt: brak ruchu, bez błędu.
 *
 * `TokenDocument#getSnappedPosition` jest za to jedynym miejscem, w którym Foundry *pyta*
 * „gdzie to ma trafić" — i pyta stamtąd o wszystko: przeciąganie
 * (`token.mjs:2735`), strzałki, linijkę, podgląd trasy. Jedna nadpisana metoda obsługuje
 * każdą z tych dróg naraz.
 *
 * ## Shift dostajemy za darmo
 *
 * Wywołanie jest owinięte w `if (snap) …` (`_updateDragDestination(…, {snap: !event.shiftKey})`),
 * więc przy wciśniętym Shifcie Foundry po prostu nas nie pyta. Nie ma tu żadnego czytania
 * modyfikatorów — i nie ma ryzyka, że nauczymy MG innego skrótu, niż ma w reszcie programu.
 *
 * ## Numer toru nigdzie nie jest zapisywany
 *
 * Tor liczy się z pozycji (`pionkiPoscigu()`), i tylko stamtąd. Flaga z numerem byłaby
 * stanem pochodnym, który potrafi się rozjechać z prawdą przy każdym ruchu spoza naszej
 * ścieżki — przeciągnięciu z Shiftem, makrze, cofnięciu operacji.
 */

import {
  poscigFlag, pionkiPoscigu, torX, xNaTor,
  FLAG_POSCIG, LANE_W, FREEFORM_Y
} from "./poscig.mjs";
import { PRZEWAGA_KONCZACA } from "../config/vehicles-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Najkrótszy odstęp między dwoma ostrzeżeniami o za wąskiej planszy (ms). */
const ODSTEP_OSTRZEZENIA = 10_000;
let _ostatnieOstrzezenie = 0;

/* -------------------------------------------- */
/*  Czysta arytmetyka (testowalna bez Foundry)   */
/* -------------------------------------------- */

/**
 * Pozycja tokenu wyrównana do środka najbliższego toru.
 *
 * Liczone od **środka** tokenu, nie od lewej krawędzi — inaczej pionek szerszy niż tor
 * skakałby o pół pola przy każdym upuszczeniu.
 *
 * @param {number} x            Lewa krawędź tokenu.
 * @param {number} szerokoscPx  Szerokość tokenu w pikselach.
 * @returns {{x: number, tor: number}}
 */
export function snapDoToru(x, szerokoscPx) {
  const tor = xNaTor(x + (szerokoscPx / 2));
  return { tor, x: torX(tor) - (szerokoscPx / 2) };
}

/** Czy rozstaw pionków w ogóle mieści się na planszy tej szerokości. */
export function rozstawMiesciSie(tory, zajete) {
  if (!zajete.length) return true;
  return (Math.max(...zajete) - Math.min(...zajete) + 1) <= tory;
}

/**
 * O ile torów przesunąć całe pole, żeby zmieściło się na planszy.
 * Dodatnia wartość = w prawo. Zero, gdy nic nie wystaje.
 *
 * **Musi być jednokrokowe.** Wynik jest stosowany w haku `updateToken`, a przesunięcie
 * pionków znowu ten hak odpala — gdyby po jednym przesunięciu dało się policzyć następne
 * niezerowe, plansza chodziłaby w kółko bez końca.
 *
 * Stąd odmowa przy rozstawie szerszym niż plansza: „dosuń czoło stawki do krawędzi" wygląda
 * rozsądnie, ale wypycha wtedy ogon za przeciwną krawędź, następne wywołanie przesuwa pole
 * z powrotem i pionki dygoczą w nieskończoność. Lepiej nie ruszyć nic i powiedzieć MG, że
 * plansza jest za wąska (`recentruj`), niż zapętlić stół.
 *
 * @param {number} tory     Liczba torów planszy.
 * @param {number[]} zajete Numery torów zajętych przez pionki.
 * @returns {number}
 */
export function deltaRecentrowania(tory, zajete) {
  if (!zajete.length) return 0;
  if (!rozstawMiesciSie(tory, zajete)) return 0;
  const min = Math.min(...zajete);
  const max = Math.max(...zajete);
  if (max > tory) return tory - max;
  if (min < 1) return 1 - min;
  return 0;
}

/* -------------------------------------------- */
/*  Przyciąganie                                 */
/* -------------------------------------------- */

/** Oryginał, żeby każda scena spoza pościgu dostała zachowanie Foundry'ego bez zmian. */
let _origGetSnappedPosition = null;

function _patchGetSnappedPosition() {
  const Cls = CONFIG.Token.documentClass;
  if (_origGetSnappedPosition) return;
  _origGetSnappedPosition = Cls.prototype.getSnappedPosition;

  Cls.prototype.getSnappedPosition = function (data = {}) {
    if (!poscigFlag(this.parent)) return _origGetSnappedPosition.call(this, data);

    const x = data.x ?? this.x;
    const y = data.y ?? this.y;
    const elevation = data.elevation ?? this.elevation;

    // Strefa swobodna: MG układa tam schematy i notatki, nic się nie przyciąga.
    if (y >= FREEFORM_Y) return { x, y, elevation };

    const szerokoscPx = (data.width ?? this.width) * (this.parent?.grid?.size ?? LANE_W);
    return { x: snapDoToru(x, szerokoscPx).x, y, elevation };
  };
}

function _unpatchGetSnappedPosition() {
  if (!_origGetSnappedPosition) return;
  CONFIG.Token.documentClass.prototype.getSnappedPosition = _origGetSnappedPosition;
  _origGetSnappedPosition = null;
}

/**
 * Token upuszczony na planszę z paska aktorów. Tworzenie nie przechodzi przez potok ruchu,
 * więc tu wystarczy zwykłe `updateSource()` — inaczej niż przy aktualizacji (patrz nagłówek).
 */
function onPreCreateToken(doc) {
  const scene = doc.parent;
  if (!poscigFlag(scene)) return;
  if (doc.y >= FREEFORM_Y) return;
  const szerokoscPx = doc.width * scene.grid.size;
  doc.updateSource({ x: snapDoToru(doc.x, szerokoscPx).x });
}

/* -------------------------------------------- */
/*  Recentrowanie                                */
/* -------------------------------------------- */

/**
 * Blokada ponownego wejścia. `updateEmbeddedDocuments` odpala `updateToken` dla każdego
 * przesuniętego pionka, a każdy z nich znowu tu trafia — bez tej flagi recentrowanie
 * wołałoby samo siebie tyle razy, ile jest pojazdów na planszy.
 */
let _recentruje = false;

/**
 * Przesuń całe pole, gdy ktoś wyjechał poza planszę.
 *
 * Pozycje w pościgu są względne (RAW: „umowny układ odniesienia"), więc przesunięcie
 * wszystkich naraz nie zmienia nikomu pozycji względem reszty, a plansza zostaje skończonej
 * szerokości. Zapis na cudzych tokenach robi wyłącznie `game.user.isActiveGM` — ten sam
 * relay, co w `flara.mjs` i `kolczatka.mjs`.
 */
export async function recentruj(scene, nadpisania = null) {
  if (_recentruje || !game.user.isActiveGM) return false;
  const flaga = poscigFlag(scene);
  if (!flaga) return false;

  const pionki = pionkiPoscigu(scene, nadpisania);
  const zajete = pionki.map(p => p.tor);

  // Za wąska plansza: nie przesuwamy nic (patrz `deltaRecentrowania`), tylko mówimy o tym
  // MG — i to najwyżej raz na `ODSTEP_OSTRZEZENIA`, bo inaczej każde drgnięcie pionka
  // wysypywałoby kolejny dymek.
  if (zajete.length && !rozstawMiesciSie(flaga.tory, zajete)) {
    const teraz = Date.now();
    if (teraz - _ostatnieOstrzezenie > ODSTEP_OSTRZEZENIA) {
      _ostatnieOstrzezenie = teraz;
      const rozstaw = Math.max(...zajete) - Math.min(...zajete) + 1;
      ui.notifications.warn(`Rozstaw pościgu (${rozstaw} znaczników) nie mieści się na planszy `
        + `(${flaga.tory} torów), więc pole nie jest przesuwane. Dodaj tory w ustawieniach `
        + `pościgu — albo pościg właśnie się skończył (przewaga ${PRZEWAGA_KONCZACA} kończy go z zasady).`);
    }
    return false;
  }

  const delta = deltaRecentrowania(flaga.tory, zajete);
  if (!delta) return false;

  _recentruje = true;
  try {
    await scene.updateEmbeddedDocuments("Token", pionki.map(p => ({
      _id: p.token.id,
      x: p.x + (delta * LANE_W)
    })));

    // Numery torów jadą w przeciwną stronę niż pionki: pole przesunięte o −1 znaczy,
    // że tor nr 1 pokazuje teraz to, co przed chwilą było torem nr 2.
    await scene.setFlag(MODULE_ID, FLAG_POSCIG, {
      ...flaga,
      offset: (flaga.offset ?? 0) - delta
    });

    return true;
  } finally {
    _recentruje = false;
  }
}

/**
 * Ruch zakończony — i to jedyny moment, w którym znamy prawdziwą pozycję.
 *
 * **Nie `updateToken`.** Tam `doc.x` trzyma jeszcze pozycję sprzed ruchu (v14 wpisuje ją do
 * dokumentu dopiero po animacji), więc recentrowanie liczyło tory z poprzedniej klatki
 * i przy wyjeździe poza planszę po prostu nic nie robiło — bez błędu, bez śladu.
 * `moveToken` dostaje `movement.destination`, czyli pozycję rozstrzygniętą przez silnik;
 * podajemy ją dalej jako nadpisanie dla tego jednego tokenu, reszta stoi i ma `doc.x` zgodne
 * z prawdą.
 */
function onMoveToken(doc, movement) {
  const cel = movement?.destination;
  if (!cel) return;
  recentruj(doc.parent, { [doc.id]: { x: cel.x, y: cel.y } });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerPoscigSnap() {
  _patchGetSnappedPosition();
  Hooks.on("preCreateToken", onPreCreateToken);
  Hooks.on("moveToken", onMoveToken);
  Hooks.on("deleteToken", doc => recentruj(doc.parent));
  console.log("Neuroshima 5e | Przyciąganie do torów pościgu zarejestrowane");
}

export const poscigSnapApi = {
  snapDoToru, deltaRecentrowania, rozstawMiesciSie, recentruj,
  /** Wyłącznie do testów i awaryjnego wycofania łatki na żywo. */
  __unpatch: _unpatchGetSnappedPosition
};
