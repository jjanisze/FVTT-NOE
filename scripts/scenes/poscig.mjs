/**
 * Neuroshima 5e — plansza pościgu: generowanie sceny i stan pościgu.
 *
 * Projekt: geometria — `PLAN_m4_pojazdy.md` §6.2 (złożona droga, 2026-10-19), grafika — `PLAN_poscigi.md` §2.2.
 * Warstwę graficzną (pustynia + tory) rysuje `poscig-canvas.mjs`, ten plik odpowiada wyłącznie za dokument
 * sceny, flagi i rozstawienie pionków.
 *
 * ## Dlaczego prawdziwa scena, a nie własne okno
 *
 * RAW każe do pojazdów na planszy strzelać, taranować je i zadawać im obrażenia
 * (s. 266, „ATAKI”). Pionek musi więc być prawdziwym tokenem, bo tylko token da się
 * otargetować, trafić kartą obrażeń i przepuścić przez Próg obrażeń. Pionek narysowany
 * w cudzym canvasie to przepisanie połowy `weapons/` i `combat/` od zera.
 * Skutek uboczny, który wychodzi za darmo: strefa swobodna na dole planszy to po prostu
 * natywna warstwa Rysunków, bez ani jednej linijki kodu.
 *
 * ## Złożona droga (PLAN_m4_pojazdy §6.2, D24)
 *
 *     1 tor = LANE_W pikseli = 6 m na obrazie = 1 znacznik pościgu (36 m) w pomiarze
 *
 * Pojazdy, jadący i szablony rysują się w **prawdziwej skali** — 70 px na 1,5 m, jak mapy kampanii
 * (`grid.distance` = `METRY_TORU_NA_OBRAZIE`). Każdy pojazd to wyspa w prawdziwej skali przypięta do drogi
 * środkiem; między wyspami wzdłuż drogi liczą się znaczniki (36 m na tor), w poprzek — prawdziwe metry.
 * Pojazd dłuższy niż tor (ciężarówka, autobus) zachodzi na obrazie na sąsiedni tor — jego znacznik to tor
 * środka. Odległości liczy metryka drogi (P2), nie piksele; `dystansZnacznikow()` to jej część wzdłuż drogi.
 * Stara plansza (tor 200 px = 36 m, bez `wersja`) — `staraPlansza()`, do odtworzenia od nowa.
 *
 * ## Siatka: kwadratowa o szerokości toru, ale niewidoczna
 *
 * **Poprawka z 2026-09-12 — pierwsza wersja miała tu GRIDLESS i to był błąd.**
 * Rozumowanie brzmiało: „bez siatki Foundry nie przyciąga niczego, więc przyciąganie do
 * torów tylko dołożymy". Jest dokładnie odwrotnie — na scenie bez siatki Foundry
 * **wyłącza przyciąganie na twardo**, w pięciu miejscach naraz, m.in.
 * `Token#_updateDragDestination`: `if (canvas.grid.isGridless) snap = false;`.
 * `TokenDocument#getSnappedPosition` nie jest wtedy w ogóle wołane przy przeciąganiu,
 * więc nadpisanie go nic nie daje. Efekt: pionki nie przyciągały się wcale.
 *
 * Siatka jest więc **kwadratowa, o boku równym szerokości toru**, i schowana przez
 * `alpha: 0`. Dzięki temu Foundry z siebie pyta „gdzie to ma trafić" (`getSnappedPosition`),
 * a `poscig-snap.mjs` odpowiada: X na środek toru, Y bez zmian. Pionowa swoboda w torze
 * zostaje, mimo że siatka jest kwadratowa — bo o Y decyduje nasze nadpisanie, nie siatka.
 * Kolumna siatki pokrywa się z torem co do piksela, więc to i tak jest uczciwszy opis
 * planszy niż „brak siatki".
 */

import {
  SRODOWISKA, SRODOWISKO_DOMYSLNE, METRY_NA_ZNACZNIK,
  START_SCIGANI, START_SCIGAJACY, PRZEWAGA_KONCZACA, RUND_MAKS
} from "../config/vehicles-data.mjs";

import { MOTYWY, MOTYW_DOMYSLNY, motywPoscigu } from "./poscig-themes.mjs";
import { skalaPojazdu, wymiaryZetonu, zaokrKratki } from "../pojazdy/stan.mjs";
const MODULE_ID = "neuroshima-2026-overrides";

/** Klucz flagi na scenie. Jej obecność = „to jest plansza pościgu”. */
export const FLAG_POSCIG = "poscig";

/** Klucz flagi na tokenie — "scigany" | "scigajacy". */
export const FLAG_ROLA = "poscigRola";

/* -------------------------------------------- */
/*  Geometria planszy                            */
/* -------------------------------------------- */

/** Szerokość toru w pikselach — jeden znacznik (36 m w pomiarze), 6 m na obrazie (§6.2.1: ×1,4 starej planszy). */
export const LANE_W = 280;

/**
 * Metry toru na obrazie — `grid.distance` planszy. Daje prawdziwą skalę pojazdów (`LANE_W` px na 6 m = 70 px na
 * 1,5 m) i szablonów; pomiar między pojazdami robi metryka drogi, nie ta liczba.
 */
export const METRY_TORU_NA_OBRAZIE = 6;

/** Wersja geometrii w fladze planszy: 2 = złożona droga (2026-10-19). */
export const WERSJA_PLANSZY = 2;

/**
 * Margines po bokach, w pikselach. **Równy dokładnie jednemu torowi — i to jest istotne.**
 *
 * Foundry trzyma tokeny wewnątrz prostokąta sceny, więc pionek nie da się wypchnąć dowolnie
 * daleko: dojedzie najwyżej do krawędzi. Margines szerokości toru daje więc dokładnie jedno
 * „pole przepełnienia" po każdej stronie — tyle, ile potrzeba, żeby wyjazd poza planszę dało
 * się w ogóle wykryć i żeby recentrowanie (`poscig-snap.mjs`) miało co złapać. Zwężenie
 * marginesu poniżej `LANE_W` po cichu wyłączyłoby recentrowanie: pionek zatrzymywałby się
 * na ostatnim torze i nigdy nie zająłby toru spoza planszy.
 */
export const MARGIN_X = LANE_W;

/** Wysokość pasa pościgu (tory). Poniżej zaczyna się strefa swobodna. */
export const FREEFORM_Y = 1300;

/** Wysokość strefy swobodnej pod pasem pościgu. */
export const FREEFORM_H = 900;

/** Domyślna liczba torów. Start 1–4 plus 7 znaczników przewagi = 11; dwunasty to zapas. */
export const TORY_DOMYSLNIE = 12;

/** Górna krawędź obszaru, w którym stają pionki (nad nią jest niebo i dalekie wydmy). */
export const PAS_GORA = 420;

/**
 * Wymiary sceny dla zadanej liczby torów.
 * @param {number} tory
 */
export function wymiary(tory = TORY_DOMYSLNIE) {
  return {
    width: (tory * LANE_W) + (2 * MARGIN_X),
    height: FREEFORM_Y + FREEFORM_H
  };
}

/**
 * Środek toru w pikselach. Tory numerowane od 1, jak w podręczniku.
 * @param {number} tor 1-based
 */
export function torX(tor) {
  return MARGIN_X + ((tor - 1) * LANE_W) + (LANE_W / 2);
}

/**
 * Numer toru, w którym leży dany X. Zwraca też tory spoza planszy (ujemne / za duże),
 * bo to właśnie one wyzwalają recentrowanie.
 * @param {number} x
 */
export function xNaTor(x) {
  return Math.floor((x - MARGIN_X) / LANE_W) + 1;
}

/**
 * Odległość w metrach między dwoma torami. **To jest właściwy sposób liczenia zasięgu
 * w pościgu** — nie linijka Foundry’ego, która doliczy dekoracyjny rozjazd pionowy.
 * @param {number} torA 1-based
 * @param {number} torB 1-based
 */
export function dystansZnacznikow(torA, torB) {
  return Math.abs(torA - torB) * METRY_NA_ZNACZNIK;
}

/* -------------------------------------------- */
/*  Stan pościgu                                 */
/* -------------------------------------------- */

/** @returns {object|null} Flaga pościgu sceny albo `null`, jeśli to nie plansza pościgu. */
export function poscigFlag(scene = canvas?.scene) {
  return scene?.getFlag(MODULE_ID, FLAG_POSCIG) ?? null;
}

/** @returns {boolean} */
export function isPoscigScene(scene = canvas?.scene) {
  return !!poscigFlag(scene);
}

/** Plansza sprzed złożonej drogi (tor 200 px = 36 m): pojazdy nie w skali — do utworzenia od nowa. */
export function staraPlansza(scene = canvas?.scene) {
  const f = poscigFlag(scene);
  return !!f && (Number(f.wersja) || 1) < WERSJA_PLANSZY;
}

/* -------------------------------------------- */
/*  Tworzenie planszy                            */
/* -------------------------------------------- */

/**
 * Dane sceny planszy pościgu.
 *
 * Scena **celowo nie ma obrazu tła** — tło jest animowane i rysuje je warstwa PIXI.
 * Kolor tła i tak ustawiamy, żeby nic nie mrugało przed pierwszą klatką. W v14
 * `backgroundColor` to tylko read-only shim nad `levels[0].background.color`, więc
 * zapisujemy to tam, gdzie naprawdę mieszka, i jawnie tworzymy tablicę `levels`.
 *
 * ## Poziom musi mieć id `defaultLevel0000`, inaczej tokeny nie istnieją
 *
 * W v14 każdy token należy do poziomu (`TokenDocument#level`), a to pole ma
 * `initial: BaseScene.metadata.defaultLevelId`, czyli literalne `"defaultLevel0000"`.
 * Poziom utworzony bez `_id` dostaje id losowe — i wtedy **każdy token wskazuje na
 * poziom, którego nie ma**. Objaw jest mylący: dokumenty tokenów siedzą w scenie
 * poprawnie, ale `canvas.tokens.placeables` jest puste, na płótnie nie ma nic i nigdzie
 * nie pada ani jeden błąd. Foundry tworzy swój domyślny poziom dokładnie tak samo
 * (`client/documents/scene.mjs`, `_id: this.constructor.metadata.defaultLevelId`).
 */
export function daneSceny({ nazwa, tory, srodowisko, motyw = MOTYW_DOMYSLNY }) {
  const { width, height } = wymiary(tory);
  return {
    name: nazwa,
    width, height,
    padding: 0,
    initial: { x: Math.round(width / 2), y: Math.round(FREEFORM_Y / 2), scale: 0.4 },
    grid: {
      // Kwadratowa, nie GRIDLESS — patrz nagłówek pliku. Bok = tor; `alpha: 0` ją chowa.
      type: CONST.GRID_TYPES.SQUARE,
      size: LANE_W,
      distance: METRY_TORU_NA_OBRAZIE,
      units: "m",
      alpha: 0
    },
    // Pościg rozgrywa się w pełnym słońcu pustyni i nikt tu nikogo nie zaskakuje zza rogu —
    // mgła wojny i widzenie tokenów tylko przeszkadzałyby MG w prowadzeniu planszy.
    tokenVision: false,
    fog: { mode: CONST.FOG_EXPLORATION_MODES.NONE },
    environment: { globalLight: { enabled: true } },
    levels: [{
      _id: foundry.documents.BaseScene.metadata.defaultLevelId,
      name: "Pościg",
      background: { color: motywPoscigu({ motyw }).mid.colors[0] }
    }],
    flags: {
      [MODULE_ID]: {
        [FLAG_POSCIG]: {
          wersja: WERSJA_PLANSZY,
          tory,
          motyw: motywPoscigu({ motyw }).id,
          srodowisko,
          st: SRODOWISKA[srodowisko]?.st ?? SRODOWISKA[SRODOWISKO_DOMYSLNE].st,
          runda: 1,
          // Przesunięcie logiczne pola przy recentrowaniu: numer podręcznikowy toru 1.
          // Trzymane osobno, żeby przenumerowanie planszy nigdy nie gubiło warunku końca.
          offset: 0,
          tempoTla: 2
        }
      }
    }
  };
}

/** Odstęp między pojazdami w jednym torze (rzędy jezdni) i od górnej krawędzi pasa. */
const ODSTEP_RZEDU = 24;

/**
 * Wymiary pionka w kratkach planszy (= torach). Pojazd z katalogu M4 — obrys w prawdziwej skali przy obrocie
 * „przodem w prawo” (`poscig-motion.mjs`); inny aktor pojazdu — prototyp w kratkach 1,5 m przeliczony tak samo.
 */
/** Obrót „przodem w prawo” (jak `rotationNaPrawo` w `poscig-motion-model.mjs`, z poprawką grafiki aktora). */
export function obrotPionka(actor) {
  return ((270 + (Number(actor?.getFlag?.(MODULE_ID, "poscigFacingOffset")) || 0)) % 360 + 360) % 360;
}

export function wymiaryPionka(actor, scene) {
  const rotacja = obrotPionka(actor);
  const w = wymiaryZetonu(actor, scene, rotacja);
  if (w) return w;
  const s = skalaPojazdu(scene);
  const p = actor?.prototypeToken ?? { width: 1, height: 1 };
  return { w: zaokrKratki((p.width || 1) * s), h: zaokrKratki((p.height || 1) * s) };
}

/**
 * Górna krawędź (px) dla nowego pionka o wysokości `h` px w torze: pod ostatnim pojazdem tego toru (D25 —
 * kolejność w znaczniku to rzędy jezdni). Gdy pas się skończy — od góry; rozsunięcie to robota MG.
 * @param {{tor: number, y: number, h: number}[]} zajete  pionki już stojące albo przygotowane
 */
export function yWTorze(tor, h, zajete = []) {
  const start = PAS_GORA + ODSTEP_RZEDU;
  const dno = Math.max(start - ODSTEP_RZEDU, ...zajete.filter(z => z.tor === tor).map(z => z.y + z.h));
  const y = dno + ODSTEP_RZEDU;
  return y + h <= FREEFORM_Y - ODSTEP_RZEDU ? Math.round(y) : start;
}

/**
 * Pionek pościgu z aktora pojazdu: pojazd w prawdziwej skali (D24), środkiem na środku toru, w wolnym rzędzie.
 * Rozmiar jest **jawny i niezależny od `prototypeToken`** — prototyp mówi o mapie 1,5 m, nie o planszy.
 * @param {{tor: number, rola: string, zajete?: {tor: number, y: number, h: number}[]}} opts
 */
async function daneTokenu(actor, scene, { tor, rola, zajete = null }) {
  const g = scene.grid.size;
  const { w, h } = wymiaryPionka(actor, scene);
  const stoja = zajete ?? pionkiPoscigu(scene).map(p => ({ tor: p.tor, y: p.token.y, h: p.token.height * g }));
  const proto = await actor.getTokenDocument({
    // Obrót w danych, nie tylko z haka planszy: haki tworzenia biegną w swojej kolejności, a obrys pojazdu (M4)
    // liczy się z obrotu — bez tego autobus powstawał pionowo i po zamianie obrysu lądował o tor obok.
    width: w, height: h, rotation: obrotPionka(actor), lockRotation: false,
    // Jawnie, a nie licząc na wartość domyślną pola: token bez istniejącego poziomu
    // znika z płótna bez śladu i bez błędu (patrz komentarz przy `daneSceny`).
    level: scene.levels.contents[0]?.id,
    x: Math.round(torX(tor) - (w * g / 2)),
    y: yWTorze(tor, h * g, stoja),
    // Pionki nie mają być źródłem światła ani widzenia — plansza jest jawna dla wszystkich.
    sight: { enabled: false },
    // Numeru toru celowo nie zapisujemy — liczy go `pionkiPoscigu()` z pozycji.
    // Flaga byłaby stanem pochodnym, który rozjeżdża się przy każdym ruchu spoza
    // naszej ścieżki (makro, cofnięcie operacji).
    flags: { [MODULE_ID]: { [FLAG_ROLA]: rola } }
  });
  return proto.toObject();
}

/**
 * MG: rola pionka w pościgu (`scigany` | `scigajacy`; `null` — poza pościgiem). Pojazd wklejony albo upuszczony na
 * planszę nie ma roli, więc nie liczy się do przewagi ani recentrowania, póki MG jej nie nada (karta, `poscig-snap.mjs`).
 */
export async function ustawRole(tokenDoc, rola) {
  if (!game.user.isGM || !tokenDoc) return;
  if (rola === "scigany" || rola === "scigajacy") await tokenDoc.setFlag(MODULE_ID, FLAG_ROLA, rola);
  else await tokenDoc.unsetFlag(MODULE_ID, FLAG_ROLA);
}

/** Rozwiązuje aktora z nazwy, id albo samego dokumentu. */
function _aktor(ref) {
  if (ref instanceof Actor) return ref;
  return game.actors.get(ref) ?? game.actors.getName(ref) ?? null;
}

/**
 * Utwórz planszę pościgu i rozstaw na niej pionki.
 *
 * @param {object} [opts]
 * @param {string} [opts.nazwa]         Nazwa sceny.
 * @param {number} [opts.tory]          Liczba torów.
 * @param {string} [opts.srodowisko]    Klucz z `SRODOWISKA` — wyznacza ST Testu Pościgu.
 * @param {Array} [opts.scigani]        Aktorzy pojazdów uciekających (start: znacznik 4).
 * @param {Array} [opts.scigajacy]      Aktorzy pojazdów goniących (start: znacznik 1).
 * @param {boolean} [opts.aktywuj]      Czy uczynić scenę aktywną dla całego stołu.
 * @returns {Promise<Scene>}
 */
export async function start({
  nazwa = "Pościg",
  tory = TORY_DOMYSLNIE,
  srodowisko = SRODOWISKO_DOMYSLNE,
  motyw = MOTYW_DOMYSLNY,
  scigani = [],
  scigajacy = [],
  aktywuj = true
} = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Planszę pościgu może utworzyć tylko MG.");
    return null;
  }
  if (!SRODOWISKA[srodowisko]) {
    ui.notifications.error(`Nieznane środowisko pościgu: „${srodowisko}”. `
      + `Dostępne: ${Object.keys(SRODOWISKA).join(", ")}.`);
    return null;
  }

  // Nazwa unikalna, żeby kolejny pościg nie nadpisywał poprzedniego i żeby dało się do
  // starego wrócić — sceny pościgu są tanie, kasuje się je ręcznie.
  let finalna = nazwa;
  for (let i = 2; game.scenes.getName(finalna); i++) finalna = `${nazwa} ${i}`;

  const scene = await Scene.create(daneSceny({ nazwa: finalna, tory, srodowisko, motyw }));

  const tokeny = [];
  const braki = [];
  const zajete = [];
  const dodaj = async (refs, rola, tor) => {
    for (const ref of refs) {
      const actor = _aktor(ref);
      if (!actor) { braki.push(String(ref)); continue; }
      const dane = await daneTokenu(actor, scene, { tor, rola, zajete });
      zajete.push({ tor, y: dane.y, h: dane.height * scene.grid.size });
      tokeny.push(dane);
    }
  };
  await dodaj(scigani, "scigany", START_SCIGANI);
  await dodaj(scigajacy, "scigajacy", START_SCIGAJACY);
  if (tokeny.length) await scene.createEmbeddedDocuments("Token", tokeny);

  if (braki.length) {
    ui.notifications.warn(`Nie znaleziono aktorów: ${braki.join(", ")}. `
      + "Plansza powstała bez nich.");
  }

  // `activate()`, nie `view()`: pościg zaczyna się dla całego stołu naraz, a nie tylko
  // w oknie MG. `view()` przełącza wyłącznie bieżącego klienta i po przeładowaniu
  // przeglądarki wraca on i tak na scenę aktywną — czyli na starą mapę.
  if (aktywuj) await scene.activate();
  ui.notifications.info(`Plansza pościgu „${finalna}” gotowa. `
    + `${tory} torów, ${SRODOWISKA[srodowisko].nazwa} (ST ${SRODOWISKA[srodowisko].st}).`);
  return scene;
}

/**
 * Pionki biorące udział w pościgu, z numerem toru.
 *
 * Jedno miejsce, w którym rozstrzyga się, co w ogóle jest pionkiem — czytają stąd
 * `stan()`, przyciąganie i recentrowanie, więc nie mogą się rozjechać w ocenie.
 *
 * **Strefa swobodna nie liczy się do pościgu.** Token przeciągnięty pod `FREEFORM_Y`
 * (według środka; schemat wozu, notatka MG, ktoś kto wypadł i czeka na rozstrzygnięcie) wypada z liczenia
 * przewagi i z recentrowania. Decyduje pozycja, nie flaga: token wraca do gry po prostu
 * przez przeciągnięcie go z powrotem na tory.
 *
 * ## `nadpisania` — bo w trakcie ruchu dokument kłamie
 *
 * W v14 `TokenDocument#x` **nie jest jeszcze zaktualizowane**, kiedy odpalają się haki ruchu:
 * pozycja trafia do dokumentu dopiero po zakończeniu animacji. Kto policzy tor z `t.x` w haku
 * `updateToken` albo `moveToken`, dostanie poprzednią pozycję — cicho i wiarygodnie.
 * Dlatego wywołujący może podać mapę `{ tokenId: {x, y} }` z pozycjami, które naprawdę
 * obowiązują (np. `movement.destination` z haka `moveToken`).
 *
 * @param {Scene} scene
 * @param {Record<string, {x: number, y: number}>|null} [nadpisania]
 * @returns {Array<{token: TokenDocument, nazwa: string, rola: string, tor: number, x: number}>}
 */
export function pionkiPoscigu(scene, nadpisania = null) {
  if (!scene) return [];
  const out = [];
  for (const t of scene.tokens) {
    const rola = t.getFlag(MODULE_ID, FLAG_ROLA);
    if (!rola) continue;
    const poz = nadpisania?.[t.id];
    const x = poz?.x ?? t.x;
    const y = poz?.y ?? t.y;
    if (y + t.height * scene.grid.size / 2 >= FREEFORM_Y) continue;
    out.push({
      token: t,
      nazwa: t.name,
      rola,
      x,
      tor: xNaTor(x + ((t.width * scene.grid.size) / 2))
    });
  }
  return out;
}

/* -------------------------------------------- */
/*  Zmiana ustawień istniejącej planszy          */
/* -------------------------------------------- */

/**
 * Przestaw ustawienia trwającego pościgu.
 *
 * Liczba torów zmienia **szerokość sceny**, nie tylko flagę — tory są geometrią planszy,
 * a nie jej dekoracją. Zwężenie planszy poniżej pozycji stojącego już pionka byłoby cichą
 * utratą informacji o jego pozycji, więc taka zmiana jest odrzucana z komunikatem zamiast
 * po cichu przyciąć.
 *
 * @param {Scene} scene
 * @param {object} zmiany  Dowolny podzbiór: {tory, srodowisko, st, tempoTla, runda}
 */
export async function konfiguruj(scene, zmiany = {}) {
  const flaga = poscigFlag(scene);
  if (!flaga) {
    ui.notifications.warn("Ta scena nie jest planszą pościgu.");
    return null;
  }
  if (!game.user.isGM) {
    ui.notifications.warn("Ustawienia pościgu może zmieniać tylko MG.");
    return null;
  }

  const nowa = { ...flaga, ...zmiany };
  if (zmiany.motyw !== undefined && !MOTYWY[zmiany.motyw]) {
    ui.notifications.warn("Nieznany motyw planszy pościgu.");
    return null;
  }
  if (zmiany.srodowisko && zmiany.st === undefined) {
    nowa.st = SRODOWISKA[zmiany.srodowisko]?.st ?? nowa.st;
  }

  const update = { [`flags.${MODULE_ID}.${FLAG_POSCIG}`]: nowa };
  if (zmiany.motyw !== undefined) {
    update.levels = [{ _id: scene.levels.contents[0].id, background: { color: motywPoscigu(nowa).mid.colors[0] } }];
  }

  if (zmiany.tory && zmiany.tory !== flaga.tory) {
    const najdalszy = Math.max(...pionkiPoscigu(scene).map(p => p.tor), 1);
    if (zmiany.tory < najdalszy) {
      ui.notifications.error(`Nie można zejść do ${zmiany.tory} torów — na torze `
        + `${najdalszy} stoi pojazd. Najpierw cofnij go na planszę.`);
      return null;
    }
    Object.assign(update, wymiary(zmiany.tory));
  }

  await scene.update(update);
  return nowa;
}

/**
 * Dostaw pojazd na trwającą planszę.
 * @param {Scene} scene
 * @param {Actor|string} ref
 * @param {{tor: number, rola: "scigany"|"scigajacy"}} opts
 */
export async function dodajPojazd(scene, ref, { tor, rola }) {
  const flaga = poscigFlag(scene);
  if (!flaga) return ui.notifications.warn("Ta scena nie jest planszą pościgu.");
  const actor = _aktor(ref);
  if (!actor) return ui.notifications.error(`Nie znaleziono aktora: ${ref}`);

  // Nowy pionek wchodzi pod te, które już stoją na tym torze — bez tego lądowałby
  // dokładnie na cudzym i MG musiałby je rozsuwać ręcznie.
  const dane = await daneTokenu(actor, scene, { tor, rola });
  const [token] = await scene.createEmbeddedDocuments("Token", [dane]);
  return token;
}

/**
 * Stan bieżącego pościgu — kto gdzie stoi, jaka przewaga, czy pościg powinien się skończyć.
 * @returns {object|null}
 */
export function stan(scene = canvas?.scene) {
  const flaga = poscigFlag(scene);
  if (!flaga) return null;

  const pionki = pionkiPoscigu(scene).sort((a, b) => b.tor - a.tor);

  const scigani = pionki.filter(p => p.rola === "scigany");
  const scigajacy = pionki.filter(p => p.rola === "scigajacy");
  const najdalszyScigany = Math.max(...scigani.map(p => p.tor), -Infinity);
  const najdalszyScigajacy = Math.max(...scigajacy.map(p => p.tor), -Infinity);
  const przewaga = (scigani.length && scigajacy.length)
    ? najdalszyScigany - najdalszyScigajacy : null;

  const powody = [];
  if (przewaga !== null && przewaga >= PRZEWAGA_KONCZACA) {
    powody.push(`Ścigany ma ${przewaga} znaczników przewagi (próg: ${PRZEWAGA_KONCZACA}).`);
  }
  if (flaga.runda > RUND_MAKS) {
    powody.push(`Minęło ${RUND_MAKS} rund — wygrywa ten, kto jest najdalej.`);
  }

  return {
    scena: scene.name,
    tory: flaga.tory,
    srodowisko: SRODOWISKA[flaga.srodowisko]?.nazwa ?? flaga.srodowisko,
    st: flaga.st,
    runda: flaga.runda,
    przewaga,
    pionki,
    koniec: powody.length ? powody : null
  };
}

/** Wypisz stan pościgu w konsoli w czytelnej formie. */
export function pokazStan(scene = canvas?.scene) {
  const s = stan(scene);
  if (!s) return ui.notifications.warn("Ta scena nie jest planszą pościgu.");
  console.log(`Neuroshima 5e | Pościg „${s.scena}” — runda ${s.runda}, `
    + `${s.srodowisko} (ST ${s.st}), przewaga: ${s.przewaga ?? "—"}`);
  console.table(s.pionki);
  if (s.koniec) console.warn("Warunek końca pościgu:", s.koniec);
  return s;
}

export const poscigApi = {
  start, konfiguruj, dodajPojazd, ustawRole, stan, pokazStan,
  isPoscigScene, poscigFlag, staraPlansza, pionkiPoscigu, wymiaryPionka,
  torX, xNaTor, dystansZnacznikow,
  LANE_W, METRY_TORU_NA_OBRAZIE, WERSJA_PLANSZY, TORY_DOMYSLNIE, SRODOWISKA, MOTYWY, MOTYW_DOMYSLNY
};
