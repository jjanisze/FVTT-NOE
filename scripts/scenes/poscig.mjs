/**
 * Neuroshima 5e — plansza pościgu: generowanie sceny i stan pościgu.
 *
 * Projekt: `PLAN_poscigi.md`. Warstwę graficzną (pustynia + tory) rysuje `poscig-canvas.mjs`,
 * ten plik odpowiada wyłącznie za dokument sceny, flagi i rozstawienie pionków.
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
 * ## Jedna stała, z której wynika cała geometria
 *
 *     1 znacznik pościgu = 36 m = LANE_W pikseli = szerokość jednego toru
 *
 * `grid.distance` jest ustawione tak, żeby linijka Foundry’ego czytała **poziomo** prawdziwe
 * metry. Nie znaczy to jednak, że wolno nią mierzyć zasięgi w pościgu: rozjazd pionowy
 * w torze jest czystą dekoracją (mieści kilka pojazdów jeden pod drugim), a linijka wliczy
 * go do dystansu. Zasięgi liczy się z numerów torów — patrz `dystansZnacznikow()`.
 *
 * ## Siatka: GRIDLESS, i to jest wybór, nie zaniedbanie
 *
 * Na scenie bez siatki Foundry **nie przyciąga niczego**, więc swoboda jest stanem
 * wyjściowym, a przyciąganie do torów tylko dokładamy (`poscig-snap.mjs`). Gdyby scena
 * miała siatkę kwadratową, trzeba by najpierw wyłączać cudze przyciąganie, a potem
 * dokładać swoje — dwa razy więcej pracy i jeden dodatkowy tryb, w którym można się pomylić.
 */

import {
  SRODOWISKA, SRODOWISKO_DOMYSLNE, METRY_NA_ZNACZNIK,
  START_SCIGANI, START_SCIGAJACY, PRZEWAGA_KONCZACA, RUND_MAKS
} from "../config/vehicles-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Klucz flagi na scenie. Jej obecność = „to jest plansza pościgu”. */
export const FLAG_POSCIG = "poscig";

/** Klucz flagi na tokenie — "scigany" | "scigajacy". */
export const FLAG_ROLA = "poscigRola";

/* -------------------------------------------- */
/*  Geometria planszy                            */
/* -------------------------------------------- */

/** Szerokość toru w pikselach. Równa jednemu znacznikowi (36 m). */
export const LANE_W = 200;

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
function daneSceny({ nazwa, tory, srodowisko }) {
  const { width, height } = wymiary(tory);
  return {
    name: nazwa,
    width, height,
    padding: 0,
    initial: { x: Math.round(width / 2), y: Math.round(FREEFORM_Y / 2), scale: 0.4 },
    grid: {
      type: CONST.GRID_TYPES.GRIDLESS,
      size: LANE_W,
      distance: METRY_NA_ZNACZNIK,
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
      background: { color: "#b98f5a" }
    }],
    flags: {
      [MODULE_ID]: {
        [FLAG_POSCIG]: {
          tory,
          srodowisko,
          st: SRODOWISKA[srodowisko]?.st ?? SRODOWISKA[SRODOWISKO_DOMYSLNE].st,
          runda: 1,
          // Przesunięcie logiczne pola przy recentrowaniu: numer podręcznikowy toru 1.
          // Trzymane osobno, żeby przenumerowanie planszy nigdy nie gubiło warunku końca.
          offset: 0,
          tempoTla: 1
        }
      }
    }
  };
}

/**
 * Pionek pościgu z aktora pojazdu.
 *
 * Rozmiar tokenu jest **jawny i niezależny od `prototypeToken`**: GMT400 ma prototyp 2×2,
 * co na planszy zajęłoby dwa tory i kłamało o jego pozycji. Na planszy pościgu każdy pojazd
 * to jeden pionek szerokości toru, dokładnie jak kapsel w podręczniku.
 */
async function daneTokenu(actor, scene, { tor, rola, rzad = 0 }) {
  const proto = await actor.getTokenDocument({
    width: 1, height: 1,
    // Jawnie, a nie licząc na wartość domyślną pola: token bez istniejącego poziomu
    // znika z płótna bez śladu i bez błędu (patrz komentarz przy `daneSceny`).
    level: scene.levels.contents[0]?.id,
    x: torX(tor) - (LANE_W / 2),
    y: PAS_GORA + 60 + (rzad * (LANE_W + 40)),
    // Pionki nie mają być źródłem światła ani widzenia — plansza jest jawna dla wszystkich.
    sight: { enabled: false },
    // Numeru toru celowo nie zapisujemy — liczy go `pionkiPoscigu()` z pozycji.
    // Flaga byłaby stanem pochodnym, który rozjeżdża się przy każdym ruchu spoza
    // naszej ścieżki (Shift, makro, cofnięcie operacji).
    flags: { [MODULE_ID]: { [FLAG_ROLA]: rola } }
  });
  return proto.toObject();
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

  const scene = await Scene.create(daneSceny({ nazwa: finalna, tory, srodowisko }));

  const tokeny = [];
  const braki = [];
  const dodaj = async (refs, rola, tor) => {
    let rzad = 0;
    for (const ref of refs) {
      const actor = _aktor(ref);
      if (!actor) { braki.push(String(ref)); continue; }
      tokeny.push(await daneTokenu(actor, scene, { tor, rola, rzad: rzad++ }));
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
 * (schemat wozu, notatka MG, ktoś kto wypadł i czeka na rozstrzygnięcie) wypada z liczenia
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
    if (y >= FREEFORM_Y) continue;
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
  if (zmiany.srodowisko && zmiany.st === undefined) {
    nowa.st = SRODOWISKA[zmiany.srodowisko]?.st ?? nowa.st;
  }

  const update = { [`flags.${MODULE_ID}.${FLAG_POSCIG}`]: nowa };

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
  const wTorze = pionkiPoscigu(scene).filter(p => p.tor === tor).length;
  const dane = await daneTokenu(actor, scene, { tor, rola, rzad: wTorze });
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
  start, konfiguruj, dodajPojazd, stan, pokazStan,
  isPoscigScene, poscigFlag,
  torX, xNaTor, dystansZnacznikow,
  TORY_DOMYSLNIE, SRODOWISKA
};
