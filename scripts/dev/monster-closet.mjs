/**
 * Neuroshima 5e — Szafa z potworami (kalibracja skali żetonów).
 *
 * Jednorazowa, odtwarzalna scena z jednym żetonem na każdą istotę Bestiariusza,
 * ułożonym rzędami po rozmiarze, obok wzorca dnd5e tego samego rozmiaru. Służy
 * do jednego: ocenić na oko, czy grafika żetonu wypełnia swoje pole siatki tak
 * jak powinna, i poprawić to QuickScale'em.
 *
 * ## Po co to w ogóle
 *
 * 662 żetony dnd5e są rysowane ręcznie i kadrowane spójnie — dlatego „Mały" i
 * „Średni" da się na mapie rozróżnić, mimo że oba zajmują pole 1×1 (patrz
 * `tokens/README.md`). Nasz art jest generowany i kadrowany **niespójnie**, a
 * `prototypeToken.texture.scaleX` był dla wszystkich 51 istot równy 1,0, bo
 * nikt tego nigdy nie przeglądał. Bez jednej sceny, gdzie wszystko leży obok
 * siebie przy tej samej siatce, nie ma jak tego porównać.
 *
 * ## Układ
 *
 *     [ podpis rozmiaru ]  [ WZORZEC dnd5e ]    [ istoty tego rozmiaru … ]
 *
 * Wzorzec powtarza się w **każdym** rzędzie, nie stoi raz na górze sceny.
 * Scena ma kilka tysięcy pikseli wysokości; wzorzec oddalony o pół ekranu jest
 * bezużyteczny, bo porównuje się przez przełączanie wzroku, nie z pamięci.
 *
 * Wzorce są **kaflami, nie żetonami** — z dwóch powodów. Kafel nie potrzebuje
 * aktora, więc nie dorzuca sześciu śmieciowych kopii do świata przy każdym
 * odtworzeniu; i QuickScale rusza wyłącznie żetony, więc wzorca nie da się
 * przypadkiem przeskalować w trakcie godziny klikania. Renderuje się identycznie:
 * kafel też ma `texture.fit`, a `contain` to dokładnie to, co robi żeton.
 *
 * ## Obieg
 *
 *   1. `game.neuroshima.monsterCloset.regenerate()`   — zbuduj z **obecnego** packa
 *   2. kalibracja ręczna MG — QuickScale na pojedynczych żetonach.
 *      **Nie używaj „zapisz do prototypu"**: żeton wisi na jednorazowej kopii
 *      aktora, więc zapis nie dociera ani do kompendium, ani do następnego rzutu
 *   3. `game.neuroshima.monsterCloset.harvest()`      — odczyt z żetonów + gotowy
 *      JSON do `tokens/scale-overrides.json` (scala, nie nadpisuje)
 *   4. zamknij Foundry, `npm run build:bestiary`, uruchom z powrotem
 *   5. `regenerate()` jeszcze raz — pass weryfikacyjny na świeżych rzutach,
 *      bo tylko świeże rzuty występują w prawdziwej grze
 *
 * Pozostałe: `report()` — co się rozjechało między packiem, plikiem i sceną.
 * `suggest()` — wartości startowe dla istot, których nie ma jeszcze w pliku
 * (pomiar kadru, ta sama formuła co `npm run seed:token-scales`).
 * `remove()` — usuwa scenę razem z jednorazowymi kopiami aktorów.
 */

import { NEUROSHIMA_CREATURE_TYPES } from "../config/creature-types.mjs";
import { regenerateTestScene, findTestScene, taggedTokens, clearTestScene } from "./test-scenes.mjs";
import { SIZES, knownSize, round2, storedScale } from "./token-sizes.mjs";
import { layoutBands, cellPosition } from "./closet-layout.mjs";
// Kierunek zależności jest celowy: „kto jest drużyną i czy ma grafikę" to
// pytanie Szafy z postaciami, a ta szafa tylko je zadaje, żeby postawić
// pasmo odnośnikowe. Jedna definicja, obie sceny.
import { partyReference } from "./character-closet.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const CLOSET_ID = "monster-closet";
const PACK_ID = `${MODULE_ID}.bestiariusz`;
const OVERRIDES_PATH = `modules/${MODULE_ID}/tokens/scale-overrides.json`;

/* -------------------------------------------- */
/*  Tabela rozmiarów                             */
/* -------------------------------------------- */

/** Ta sama kolejność, w której kompendium foldruje istoty. */
const CATEGORY_ORDER = ["czlowiek", "maszyna", "mutant", "potwor", "zwierze", "rojZwierzat"];

/** Kolory podpisów kategorii — te same, którymi znaczone są atrapy żetonów. */
const CATEGORY_COLOR = Object.freeze({
  czlowiek: "#e8d9a0", maszyna: "#9fc7e8", mutant: "#c7a0e8",
  potwor: "#e8a0a0", zwierze: "#a8e0a8", rojZwierzat: "#e8c49f"
});

/* -------------------------------------------- */
/*  Plan sceny                                   */
/* -------------------------------------------- */

/** @returns {Promise<{creatures: object[], missingPack: boolean}>} */
async function loadCreatures() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) return { creatures: [], missingPack: true };
  const docs = await pack.getDocuments();
  const creatures = docs.map(actor => ({
    actor,
    creatureId: actor.getFlag(MODULE_ID, "bestiary.id") ?? null,
    artSource: actor.getFlag(MODULE_ID, "bestiary.tokenArtSource") ?? "portrait",
    size: knownSize(actor.system.traits.size),
    category: CATEGORY_ORDER.includes(actor.system.details.type.value)
      ? actor.system.details.type.value : "potwor"
  }));
  // Największe pierwsze w rzędzie, dalej alfabetycznie — kolejność ma być
  // powtarzalna między odtworzeniami, żeby MG wracał wzrokiem tam, gdzie był.
  creatures.sort((a, b) => a.actor.name.localeCompare(b.actor.name, "pl"));
  return { creatures, missingPack: false };
}

/**
 * Układa scenę i zwraca ją w kształcie, którego oczekuje `regenerateTestScene`.
 */
async function plan() {
  const { creatures, missingPack } = await loadCreatures();
  if (missingPack) throw new Error(`Nie znalazłem packa ${PACK_ID}.`);

  // Drużyna na górze, kaflami. Wzorce dnd5e mówią, jak wygląda poprawnie
  // skadrowany żeton w ogóle; pytanie, które pada przy stole, brzmi jednak
  // „czy ten Megator jest dobry **obok Alana**". Kafle, nie żetony: odnośnika
  // nie trzeba kalibrować, a kafel nie tworzy kopii aktora i nie da się go
  // ruszyć QuickScale'em. Skala jest ta, którą postać ma naprawdę — pasmo
  // pokazuje żeton taki, jaki wchodzi na mapę.
  const party = partyReference();
  const bands = [
    {
      id: "druzyna", title: "Drużyna", color: "#e8d9a0",
      note: "odnośnik — aktualna skala postaci graczy; kalibracja w Szafie z postaciami",
      items: party,
      tile: p => ({ src: p.src, scale: p.scale, name: p.name })
    },
    ...CATEGORY_ORDER.map(category => ({
      id: category,
      title: NEUROSHIMA_CREATURE_TYPES[category]?.plural ?? category,
      color: CATEGORY_COLOR[category],
      items: creatures.filter(c => c.category === category)
    }))
  ];

  const { placements, ...scenePlan } = layoutBands({
    bands,
    legend: "SZAFA Z POTWORAMI — kalibracja skali żetonów Bestiariusza\n"
      + "Rząd = rozmiar istoty. Pierwszy kafel w rzędzie to wzorzec dnd5e przy skali 1,0 (zablokowany).\n"
      + "Procent w podpisie po lewej = wypełnienie kadru dłuższym wymiarem obwiedni.\n"
      + "Pasmo „Drużyna” na górze to kafle — odnośnik, nie cel kalibracji.\n"
      + "\n"
      + "QUICKSCALE — zaznacz żeton, potem:\n"
      + "[ mniejszy        ] większy        \\ przywróć skalę z prototypu\n"
      + "⚠ Shift+\\ („zapisz do prototypu”) NIE DZIAŁA tutaj — żeton wisi na kopii jednorazowej,\n"
      + "   a Shift+[ i Shift+] LOSUJĄ skalę i obrót. Nie naciskaj ich.\n"
      + "\n"
      + "KONSOLA:\n"
      + "game.neuroshima.monsterCloset.regenerate()   zbuduj scenę od nowa z kompendium\n"
      + "game.neuroshima.monsterCloset.harvest()      odczyt skal → JSON do tokens/scale-overrides.json\n"
      + "game.neuroshima.monsterCloset.report()       kompendium vs plik vs scena"
  });

  return {
    ...scenePlan,
    tokens: async ({ scene, level, createActors }) => {
      const copies = await createActors(
        placements.map(p => p.item.actor),
        { creatureIdOf: actor => actor.getFlag(MODULE_ID, "bestiary.id") ?? null }
      );

      const data = [];
      for (const [i, place] of placements.entries()) {
        const copy = copies[i];
        if (!copy) continue;
        const creature = place.item;
        const token = await creature.actor.getTokenDocument({
          ...cellPosition({ ...place, footprint: SIZES[creature.size].footprint }),
          level,
          // Nazwy zawsze widoczne: bez nich nie da się powiedzieć, którą istotę
          // się właśnie poprawia, a pasków zdrowia nie ma tu po co oglądać.
          displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
          displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
          sort: i
        }, { parent: scene });
        const obj = token.toObject();
        obj.actorId = copy.id;
        obj.flags = foundry.utils.mergeObject(obj.flags ?? {}, {
          [MODULE_ID]: { testScene: { creatureId: creature.creatureId, artSource: creature.artSource } }
        });
        data.push(obj);
      }
      return data;
    }
  };
}

/* -------------------------------------------- */
/*  API                                         */
/* -------------------------------------------- */

/**
 * Wyrzuca i buduje szafę od nowa z obecnego stanu kompendium.
 * @param {object} [options]
 * @param {boolean} [options.view] przejdź na scenę po zbudowaniu
 */
async function regenerate({ view = true } = {}) {
  const result = await regenerateTestScene(CLOSET_ID, {
    name: "Szafa z potworami (kalibracja)",
    folderName: "Szafa z potworami — kopie jednorazowe",
    plan
  });
  if (!result) return null;

  const { scene, wiped, built } = result;
  ui.notifications.info(
    `${scene.name}: ${built.tokens} żetonów, ${built.tiles} wzorców. `
    + `Wyrzucono ${wiped.tokens} żetonów i ${wiped.actors} kopii aktorów.`);
  // Bez tego dalsze mierzenie liczyłoby się względem sceny, która jest aktywna,
  // a nie tej, którą właśnie zbudowaliśmy — patrz `project-probing-live-foundry`.
  if (view) await scene.view();
  return { scene: scene.name, uuid: scene.uuid, ...built, wiped };
}

/** Obecna treść `tokens/scale-overrides.json`, albo `{}`, gdy pliku nie ma. */
async function readOverrides() {
  try {
    const res = await fetch(`${OVERRIDES_PATH}?v=${Date.now()}`);
    if (!res.ok) return {};
    const raw = await res.json();
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("//")));
  } catch {
    return {};
  }
}

/**
 * Komentarz nagłówkowy pliku — powtarzany przy każdym zapisie, jak w `aliases.json`.
 * **Musi być identyczny z `HEADER` w `dev/icons/gen_scale_defaults.py`**: oba
 * serializują ten sam plik, więc różnica objawiałaby się szumem w diffie przy
 * każdym przełączeniu między zbieraniem a zasiewaniem.
 */
const OVERRIDES_HEADER = {
  "//": "Creature id -> prototypeToken.texture.scaleX/scaleY, applied by dev/packs/build-packs.mjs.",
  "//1": "SINGLE source of truth for token scale: the builder reads this file and nothing else,",
  "//2": "so a creature missing here ships at 1.0 (the build prints a suggestion for each one).",
  "//3": "Seeded as target-fill / measured-fill by dev/icons/gen_scale_defaults.py:",
  "//4": "  npm run seed:token-scales            (adds missing entries only)",
  "//5": "  npm run seed:token-scales -- --check  (reports drift, writes nothing)",
  "//6": "Calibrate by eye in the Monster Closet scene, then harvest the result with:",
  "//7": "  game.neuroshima.monsterCloset.harvest()      (merges, never overwrites)",
  "//8": "Rebuild: npm run build:bestiary (Foundry closed)"
};

function serializeOverrides(scales) {
  const ordered = Object.keys(scales).sort();
  const body = { ...OVERRIDES_HEADER };
  for (const k of ordered) body[k] = scales[k];
  return `${JSON.stringify(body, null, 2)}\n`;
}

/**
 * Czyta skalę wprost z **żetonów** szafy i scala ją z plikiem.
 *
 * Z żetonów, nie z aktorów: kopia aktora jest jednorazowa, więc jej
 * `prototypeToken` nikogo nie interesuje (patrz `test-scenes.mjs`). Scalanie,
 * nie nadpisywanie: szafa zbudowana częściowo albo żeton skasowany ręcznie nie
 * może kasować wartości zebranej wcześniej.
 *
 * @returns {Promise<{n: number, changed: object, unchanged: number, asymmetric: string[], json: string}>}
 */
async function harvest() {
  const scene = findTestScene(CLOSET_ID);
  if (!scene) {
    ui.notifications.warn("Nie ma sceny szafy — najpierw game.neuroshima.monsterCloset.regenerate()");
    return null;
  }

  const current = await readOverrides();
  const merged = { ...current };
  const changed = {};
  const asymmetric = [];
  let n = 0;
  let unchanged = 0;

  for (const token of taggedTokens(CLOSET_ID, scene)) {
    const creatureId = token.getFlag(MODULE_ID, "testScene.creatureId");
    if (!creatureId) continue;
    n++;
    const { x: sx, y: sy } = storedScale(token);
    // Nierówne osie zniekształcają sylwetkę, a kadry są kwadratowe — to zawsze
    // pomyłka przy skalowaniu, nie decyzja. Bierzemy X i mówimy o tym głośno.
    if (sx !== sy) asymmetric.push(`${creatureId} (${sx}/${sy})`);
    if (current[creatureId] === sx) unchanged++;
    else changed[creatureId] = sx;
    merged[creatureId] = sx;
  }

  const result = { n, changed, unchanged, asymmetric, json: serializeOverrides(merged) };
  console.log(`${MODULE_ID} | szafa: ${n} żetonów, ${Object.keys(changed).length} zmian`, changed);
  if (asymmetric.length) console.warn(`${MODULE_ID} | szafa: nierówne osie — ${asymmetric.join(", ")}`);
  return result;
}

/**
 * Ułamek kadru zajęty przez grafikę, mierzony dłuższym wymiarem obwiedni alfy.
 *
 * Pomiar leci na zmniejszonej kopii (256 px): dokładność wychodzi na ~0,4% przy
 * dwóch cyfrach wyniku, a pełny kadr 1254² × 51 istot to kilkadziesiąt milionów
 * odczytów piksela w wątku UI.
 */
async function measureFill(src, probe = 256) {
  const img = new Image();
  img.src = foundry.utils.getRoute(src);
  await img.decode();

  const canvasEl = new OffscreenCanvas(probe, probe);
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, probe, probe);
  const { data } = ctx.getImageData(0, 0, probe, probe);

  let minX = probe, minY = probe, maxX = -1, maxY = -1;
  for (let y = 0; y < probe; y++) {
    for (let x = 0; x < probe; x++) {
      if (data[(y * probe + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  // Kadr jest skalowany do kwadratu `probe`, więc ułamek liczy się względem
  // `probe` w obu osiach niezależnie od proporcji oryginału — tak samo, jak
  // `fit: "contain"` wpisuje teksturę w kwadrat footprintu po dłuższej osi.
  return Math.max((maxX - minX + 1) / probe, (maxY - minY + 1) / probe);
}

/**
 * Wartości startowe dla istot, których nie ma jeszcze w `scale-overrides.json`.
 *
 * Ta sama formuła co `dev/icons/gen_scale_defaults.py` — **docelowe wypełnienie
 * kadru podzielone przez zmierzone** — tylko po stronie przeglądarki, bo tu jest
 * dostępna w trakcie sesji kalibracyjnej, a skrypt npm wymaga zamkniętego
 * Foundry'ego. Pomiar zamiast płaskiej wartości z tabeli, bo nasz art wypełnia
 * kadr w 64–98%, nie w 100%: płaska wartość ląduje o 10–40% za nisko (patrz
 * `PLAN_monster_closet.md` §7, decyzja odwrócona 2026-09-20).
 *
 * Mierzone jest to, co niesie `prototypeToken.texture.src` istoty, czyli
 * dokładnie ten plik, który wybrał builder — nie ma tu drugiego, równoległego
 * rozstrzygania priorytetu grafiki.
 */
async function suggest() {
  const [{ creatures }, current] = await Promise.all([loadCreatures(), readOverrides()]);
  const missing = {};
  const failed = [];
  for (const c of creatures) {
    if (!c.creatureId || c.creatureId in current) continue;
    const src = c.actor.prototypeToken.texture.src;
    let fill = null;
    try {
      fill = src ? await measureFill(src) : null;
    } catch (err) {
      failed.push(`${c.creatureId} (${err.message})`);
    }
    // Bez pomiaru lepiej zostawić 1,0 i powiedzieć o tym, niż wstawić liczbę,
    // o której nie wiadomo, skąd się wzięła.
    missing[c.creatureId] = fill ? round2(SIZES[c.size].target / fill) : 1;
    if (!fill && !failed.length) failed.push(`${c.creatureId} (brak grafiki)`);
  }
  const merged = { ...current, ...missing };
  console.log(`${MODULE_ID} | szafa: ${Object.keys(missing).length} istot bez wpisu`, missing);
  if (failed.length) console.warn(`${MODULE_ID} | szafa: nie zmierzono — ${failed.join(", ")}`);
  return { missing, failed, json: serializeOverrides(merged) };
}

/**
 * Gdzie się rozjechało: pack vs plik vs żetony na scenie.
 *
 * To jest raport passu weryfikacyjnego (§8.6 planu): po przebudowie packa
 * `pack` powinien zgadzać się z `file` dla każdej istoty, a `scene` — jeśli
 * szafa została odtworzona po przebudowie — z obojgiem.
 */
async function report() {
  const [{ creatures }, file] = await Promise.all([loadCreatures(), readOverrides()]);
  const scene = findTestScene(CLOSET_ID);
  const onScene = new Map();
  for (const t of taggedTokens(CLOSET_ID, scene)) {
    const id = t.getFlag(MODULE_ID, "testScene.creatureId");
    if (id) onScene.set(id, storedScale(t).x);
  }

  const rows = creatures.map(c => ({
    id: c.creatureId, name: c.actor.name, size: c.size, art: c.artSource,
    pack: round2(c.actor.prototypeToken.texture.scaleX),
    file: c.creatureId in file ? round2(file[c.creatureId]) : null,
    scene: onScene.has(c.creatureId) ? onScene.get(c.creatureId) : null
  }));

  const summary = {
    creatures: rows.length,
    scene: scene?.name ?? null,
    onScene: onScene.size,
    noFileEntry: rows.filter(r => r.file === null).map(r => r.id),
    packVsFile: rows.filter(r => r.file !== null && r.pack !== r.file).map(r => `${r.id} pack ${r.pack} ≠ plik ${r.file}`),
    sceneVsFile: rows.filter(r => r.scene !== null && r.file !== null && r.scene !== r.file).map(r => `${r.id} scena ${r.scene} ≠ plik ${r.file}`),
    stillPlaceholder: rows.filter(r => r.art !== "own").map(r => r.id)
  };
  console.log(`${MODULE_ID} | szafa — raport`, summary);
  return { summary, rows };
}

/** Wyrzuca scenę szafy razem z kopiami aktorów. Sam pack pozostaje nietknięty. */
async function remove() {
  const scene = findTestScene(CLOSET_ID);
  const wiped = await clearTestScene(CLOSET_ID, scene);
  if (scene) await scene.delete();
  const folder = game.folders.find(f => f.type === "Actor"
    && f.getFlag(MODULE_ID, "testScene.id") === CLOSET_ID);
  if (folder) await folder.delete();
  ui.notifications.info(`Szafa usunięta (${wiped.tokens} żetonów, ${wiped.actors} kopii aktorów).`);
  return wiped;
}

export const monsterClosetApi = {
  regenerate, harvest, suggest, report, remove,
  scene: () => findTestScene(CLOSET_ID),
  SIZES
};
