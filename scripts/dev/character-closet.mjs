/**
 * Neuroshima 5e — Szafa z postaciami (kalibracja skali żetonów świata).
 *
 * To samo co Szafa z potworami, ale dla **aktorów świata**: drużyny, BN-ów,
 * pojazdów. Jeden żeton na aktora, rzędami po rozmiarze, obok wzorca dnd5e.
 * Wspólne plumbing: `test-scenes.mjs` (flaga / wyrzuć / zbuduj) i
 * `closet-layout.mjs` (pasma, rzędy, wzorce, podpisy).
 *
 * ## Dlaczego osobna scena, a nie kolejne pasma w Szafie z potworami
 *
 * Nie z powodu układu — z powodu tego, gdzie ląduje wynik:
 *
 * | | Bestiariusz | Aktorzy świata |
 * |---|---|---|
 * | źródło | kompendium `bestiariusz` | `game.actors` |
 * | zapis wyniku | `tokens/scale-overrides.json` → `npm run build:bestiary` → pack | **wprost na `actor.prototypeToken`** |
 * | ile kroków | 6, z zamknięciem Foundry'ego | 2, na żywo |
 * | „zapisz do prototypu" w QuickScale | **pułapka** (kopia jednorazowa) | działa poprawnie |
 *
 * Aktor świata **jest** źródłem prawdy o swojej skali — nie ma pliku, nie ma
 * przebudowy, nie ma restartu. Wrzucenie obu obiegów na jedną kanwę znaczyłoby
 * dwa niekompatybilne sposoby zatwierdzania wyniku na jednej scenie i jeden
 * `harvest()`, którego rezultat trzeba dzielić po rzędach.
 *
 * ## Wszystko, nie wybrane — i dlatego pasma niosą ocenę
 *
 * Lista to **każdy** aktor świata, bez filtrowania. Scena jest jednorazowa
 * i odtwarzalna, więc pełna lista jest prostsza i odporniejsza od kuratorskiej:
 * nowy aktor zawsze się gdzieś pojawi, nikt nie musi pilnować wyjątków, a to,
 * co jest śmieciem, jest **widoczne** zamiast schowane. Pasma robią przy tym
 * robotę audytu — od rzeczy gotowych do rzeczy do wyrzucenia:
 *
 *   1. Drużyna                         — postacie graczy (odnośnik)
 *   2. BN z grafiką żetonu             — realne cele kalibracji
 *   3. Pojazdy i grupy                 — inne footprinty, własna liga
 *   4. Kadry z Roll20                  — okrągłe wycinki portretu, DO WYMIANY
 *   5. Bez grafiki żetonu              — `mystery-man`, DO ZROBIENIA
 *   6. Duplikaty Bestiariusza          — kalibruj w Szafie z potworami
 *   7. Z kompendium dnd5e / JB2A       — resztki SRD, DO USUNIĘCIA
 *   8. Testowe i narzędziowe           — nie treść kampanii
 *
 * Skalowanie pasm 4 i 7 to strata czasu i scena ma to mówić wprost: okrągły
 * kadr z Roll20 wypełnia kwadrat prawie w całości z definicji, więc „skala"
 * nie jest tam żadną decyzją — te żetony potrzebują nowej grafiki, nie liczby.
 * Patrz `tokens/README.md`, ostatnia uwaga: `token.png` z katalogu postaci
 * jest świadomie odrzucany w całym projekcie.
 *
 * ## Obieg
 *
 *   1. `game.neuroshima.characterCloset.regenerate()`
 *   2. kalibracja ręczna MG — QuickScale na pojedynczych żetonach
 *   3. `game.neuroshima.characterCloset.harvest()`  — co się zmieniło (nic nie pisze)
 *   4. `game.neuroshima.characterCloset.apply()`    — zapis na `prototypeToken` aktorów
 *
 * Bez zamykania Foundry'ego i bez przebudowy. `report()` daje sam audyt, bez
 * budowania sceny.
 */

import { regenerateTestScene, findTestScene, taggedTokens, clearTestScene } from "./test-scenes.mjs";
import { SIZES, SIZE_ORDER, knownSize, round2, storedScale } from "./token-sizes.mjs";
import { layoutBands, cellPosition } from "./closet-layout.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const CLOSET_ID = "character-closet";
const BESTIARY_PACK = `${MODULE_ID}.bestiariusz`;

/** Footprint per rozmiar — musi zgadzać się z `TOKEN_SIZE` w `build-packs.mjs`. */
const TOKEN_SIZE = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };

/* -------------------------------------------- */
/*  Klasyfikacja                                 */
/* -------------------------------------------- */

/**
 * Pasma w kolejności wyświetlania. `id` jest kluczem klasyfikacji,
 * `order` — pierwszeństwem przy przydzielaniu (niżej = sprawdzane wcześniej).
 *
 * Pierwszeństwo różni się od kolejności wyświetlania celowo: TESTCHAR ma być
 * w „Testowych", a nie w „Bez grafiki", choć spełnia oba warunki.
 */
const BANDS = [
  { id: "druzyna", title: "Drużyna", color: "#e8d9a0", order: 60,
    note: "odnośnik — to na te żetony patrzy się co sesję" },
  { id: "npc-art", title: "BN z grafiką żetonu", color: "#a8e0a8", order: 70,
    note: "realne cele kalibracji" },
  { id: "pojazdy", title: "Pojazdy i grupy", color: "#9fc7e8", order: 40 },
  { id: "roll20", title: "Kadry z Roll20", color: "#e8a0a0", order: 80,
    note: "DO WYMIANY — okrągły wycinek portretu, skala nie jest tu decyzją" },
  { id: "bez-grafiki", title: "Bez grafiki żetonu", color: "#c0c0c0", order: 50,
    note: "DO ZROBIENIA — nie ma czego kalibrować" },
  { id: "bestiariusz", title: "Duplikaty Bestiariusza", color: "#c7a0e8", order: 30,
    note: "kalibruj w Szafie z potworami; te kopie są zbędne" },
  { id: "srd", title: "Z kompendium dnd5e / JB2A", color: "#8a8a8a", order: 20,
    note: "DO USUNIĘCIA — resztki SRD, nie treść kampanii" },
  { id: "narzedziowe", title: "Testowe i narzędziowe", color: "#8a8a8a", order: 10,
    note: "nie treść kampanii" }
];

const BAND_BY_ID = Object.fromEntries(BANDS.map(b => [b.id, b]));
const BY_PRECEDENCE = [...BANDS].sort((a, b) => a.order - b.order);

/** Foldery, których cała zawartość jest robocza. */
const TOOLING_FOLDERS = new Set(["TST1", "Testowe"]);

/** Nazwy własne narzędzi trzymanych jako aktorzy. */
const TOOLING_NAMES = new Set(["Zbrojownia", "BN (Postać Niezależna)"]);

function isTooling(actor) {
  if (TOOLING_NAMES.has(actor.name)) return true;
  if (TOOLING_FOLDERS.has(actor.folder?.name)) return true;
  return /^(TEST|TST|Nicram|Copy of )/i.test(actor.name);
}

/** Skąd przyszedł aktor, jeśli w ogóle skądś — sygnał pewny, nie heurystyka po nazwie. */
function compendiumOrigin(actor) {
  const src = actor._stats?.compendiumSource ?? "";
  if (/^Compendium\.(dnd5e|JB2A)/i.test(src)) return "srd";
  if (src.includes(".bestiariusz")) return "bestiariusz";
  return null;
}

/** Nazwa bez diakrytyków, wielkości liter i znaków nie-alfanumerycznych. */
function normalize(s) {
  return String(s).toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/Ł/g, "L").replace(/[^A-Z0-9]+/g, "");
}

/**
 * Jak sklasyfikować grafikę żetonu.
 *
 * Kadr z Roll20 poznajemy po **nazwie pliku**, nie po katalogu: builder
 * Bestiariusza czyta z tego samego katalogu `avatar.*` (portret, używany
 * świadomie), a odrzuca `token.png` (okrągły wycinek). Ta sama granica tutaj.
 *
 * Dopasowanie musi być **dokładne** (`token.png`, nie `token*`). Eksport
 * z Roll20 nazywa wycinek zawsze tak samo, a obok, w tym samym katalogu, leży
 * grafika dorobiona ręcznie — `token_2D.png` Alana i `Token_Lafitte_2D.png`
 * Laffitte'a. Luźniejszy wzorzec wrzucał oba do pasma „do wymiany", czyli
 * dokładnie odwrotnie niż trzeba: to jedyne postacie, które art już mają.
 */
const ROLL20_CROP = /^token\.(png|jpe?g|webp)$/i;

export function artKind(actor) {
  const src = actor.prototypeToken?.texture?.src ?? "";
  if (!src) return "none";
  const file = decodeURIComponent(src.split("/").pop() ?? "");
  if (/^(mystery-man|npc|character)\.svg$/i.test(file)) return "none";
  if (src.includes("/characters/") && ROLL20_CROP.test(file)) return "roll20";
  return "art";
}

/**
 * Przydziela aktora do pasma. Każdy aktor trafia dokładnie w jedno —
 * lista jest pełna właśnie po to, żeby nic nie wypadło po cichu.
 */
function bandFor(actor, bestiaryKeys) {
  if (isTooling(actor)) return "narzedziowe";

  const origin = compendiumOrigin(actor);
  if (origin === "srd") return "srd";

  const key = normalize(actor.name);
  const singular = key.endsWith("S") ? key.slice(0, -1) : key;
  if (origin === "bestiariusz" || bestiaryKeys.has(key) || bestiaryKeys.has(singular)) {
    return "bestiariusz";
  }

  if (actor.type === "vehicle" || actor.type === "group") return "pojazdy";

  const art = artKind(actor);
  if (art === "none") return actor.type === "character" ? "druzyna" : "bez-grafiki";
  if (actor.type === "character") return "druzyna";
  if (art === "roll20") return "roll20";
  return "npc-art";
}

/* -------------------------------------------- */
/*  Zbieranie aktorów                            */
/* -------------------------------------------- */

/** Klucze nazw i identyfikatorów istot z kompendium, do wykrywania duplikatów. */
async function bestiaryKeySet() {
  const pack = game.packs.get(BESTIARY_PACK);
  const keys = new Set();
  if (!pack) return keys;
  for (const entry of await pack.getIndex()) keys.add(normalize(entry.name));
  // Też po id: „Bitboy Przewodnik" (ręczny) vs id „bit-boy-przewodnik".
  for (const doc of await pack.getDocuments()) {
    const id = doc.getFlag(MODULE_ID, "bestiary.id");
    if (id) keys.add(normalize(id));
  }
  return keys;
}

async function loadActors() {
  const keys = await bestiaryKeySet();
  // Kopie jednorazowe innych szaf nie są treścią świata.
  const actors = game.actors.filter(a => !a.getFlag(MODULE_ID, "testScene.id"));
  const rows = actors.map(actor => {
    const pt = actor.prototypeToken;
    const size = knownSize(actor.system?.traits?.size);
    return {
      actor, size,
      band: bandFor(actor, keys),
      art: artKind(actor),
      scaleX: round2(pt.texture.scaleX),
      scaleY: round2(pt.texture.scaleY),
      ring: !!pt.ring?.enabled,
      width: pt.width,
      declaredSize: actor.system?.traits?.size ?? null
    };
  });
  rows.sort((a, b) => a.actor.name.localeCompare(b.actor.name, "pl"));
  return rows;
}

/* -------------------------------------------- */
/*  Plan sceny                                   */
/* -------------------------------------------- */

async function plan() {
  const rows = await loadActors();

  const bands = BANDS.map(b => ({ ...b, items: rows.filter(r => r.band === b.id) }));

  const { placements, ...scenePlan } = layoutBands({
    bands,
    legend: "SZAFA Z POSTACIAMI — kalibracja skali żetonów aktorów świata\n"
      + "Wszyscy aktorzy świata, w pasmach od gotowych do wyrzucenia. Pierwszy kafel w rzędzie\n"
      + "to wzorzec dnd5e przy skali 1,0 (zablokowany). Pasma 4–8 to materiał do sprzątania,\n"
      + "nie do skalowania — okrągły kadr z Roll20 wypełnia pole z definicji.\n"
      + "\n"
      + "QUICKSCALE — zaznacz żeton, potem:\n"
      + "[ mniejszy        ] większy        \\ przywróć skalę z prototypu\n"
      + "Shift+\\ („zapisz do prototypu”) DZIAŁA tutaj — żeton wisi na prawdziwym aktorze.\n"
      + "⚠ Shift+[ i Shift+] LOSUJĄ skalę i obrót. Nie naciskaj ich.\n"
      + "\n"
      + "KONSOLA:\n"
      + "game.neuroshima.characterCloset.regenerate()  zbuduj scenę od nowa\n"
      + "game.neuroshima.characterCloset.harvest()     co zmieniłeś (niczego nie zapisuje)\n"
      + "game.neuroshima.characterCloset.apply()       zapis skal na prototypeToken aktorów\n"
      + "game.neuroshima.characterCloset.report()      sam audyt, bez budowania sceny"
  });

  return {
    ...scenePlan,
    tokens: async ({ scene, level }) => {
      const data = [];
      for (const [i, place] of placements.entries()) {
        const row = place.item;
        try {
          const token = await row.actor.getTokenDocument({
            ...cellPosition({ ...place, footprint: SIZES[row.size].footprint }),
            level,
            displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
            displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
            sort: i
          }, { parent: scene });
          const obj = token.toObject();
          // Żaden aktor NIE dostaje flagi `testScene` — to prawdziwe postacie
          // kampanii, a `clearTestScene()` kasuje aktorów. Flaga siedzi
          // wyłącznie na żetonie, i tylko ona jest potrzebna do zbierania.
          obj.flags = foundry.utils.mergeObject(obj.flags ?? {}, {
            [MODULE_ID]: { testScene: { actorId: row.actor.id, band: row.band, art: row.art } }
          });
          data.push(obj);
        } catch (err) {
          console.warn(`${MODULE_ID} | szafa z postaciami: nie postawiłem "${row.actor.name}" — ${err.message}`);
        }
      }
      return data;
    }
  };
}

/* -------------------------------------------- */
/*  API                                         */
/* -------------------------------------------- */

async function regenerate({ view = true } = {}) {
  const result = await regenerateTestScene(CLOSET_ID, {
    name: "Szafa z postaciami (kalibracja)",
    // Brak `folderName`: ta szafa nie tworzy żadnych kopii aktorów.
    plan
  });
  if (!result) return null;

  const { scene, wiped, built } = result;
  ui.notifications.info(
    `${scene.name}: ${built.tokens} żetonów, ${built.tiles} wzorców. `
    + `Wyrzucono ${wiped.tokens} żetonów.`);
  if (view) await scene.view();
  return { scene: scene.name, uuid: scene.uuid, ...built, wiped };
}

/** Żetony szafy z dowiązanym aktorem, pominięte te, których aktor zniknął. */
function closetTokens(scene = findTestScene(CLOSET_ID)) {
  const out = [];
  for (const token of taggedTokens(CLOSET_ID, scene)) {
    const actorId = token.getFlag(MODULE_ID, "testScene.actorId");
    const actor = actorId ? game.actors.get(actorId) : null;
    if (actor) out.push({ token, actor });
  }
  return out;
}

/**
 * Co MG zmienił na scenie względem tego, co siedzi na aktorach. **Nic nie pisze.**
 *
 * Czyta `_source` żetonu, nie wartość przygotowaną — patrz `storedScale()`.
 */
function harvest() {
  const scene = findTestScene(CLOSET_ID);
  if (!scene) {
    ui.notifications.warn("Nie ma sceny — najpierw game.neuroshima.characterCloset.regenerate()");
    return null;
  }

  const changed = [];
  const asymmetric = [];
  const ringed = [];
  let unchanged = 0;

  for (const { token, actor } of closetTokens(scene)) {
    const { x, y } = storedScale(token);
    const from = round2(actor.prototypeToken.texture.scaleX);
    if (x !== y) asymmetric.push(`${actor.name} (${x}/${y})`);
    // Żeton z pierścieniem skaluje się przez `ring.subject.scale`, a dnd5e
    // dodatkowo mnoży `texture.scaleX` przez `dynamicTokenScale`. Zapisanie tu
    // czegokolwiek zastosowałoby ten mnożnik po raz drugi.
    if (token.ring?.enabled) { ringed.push(actor.name); continue; }
    if (x === from) { unchanged++; continue; }
    changed.push({ actorId: actor.id, name: actor.name, from, to: x });
  }

  const result = { n: closetTokens(scene).length, unchanged, changed, asymmetric, ringed };
  console.log(`${MODULE_ID} | szafa z postaciami: ${changed.length} zmian`, changed);
  if (asymmetric.length) console.warn(`${MODULE_ID} | nierówne osie — ${asymmetric.join(", ")}`);
  if (ringed.length) console.warn(`${MODULE_ID} | pominięte (pierścień) — ${ringed.join(", ")}`);
  return result;
}

/**
 * Zapisuje zebraną skalę na `prototypeToken` prawdziwych aktorów.
 *
 * Osobno od `harvest()`, bo to jedyny krok w obu szafach, który pisze do treści
 * kampanii — ma być wywołany świadomie, po zobaczeniu listy zmian.
 */
async function apply() {
  const found = harvest();
  if (!found) return null;
  if (!found.changed.length) {
    ui.notifications.info("Nic do zapisania — skale na scenie zgadzają się z aktorami.");
    return { written: 0, changed: [] };
  }

  const updates = found.changed.map(c => ({
    _id: c.actorId,
    "prototypeToken.texture.scaleX": c.to,
    "prototypeToken.texture.scaleY": c.to
  }));
  await Actor.implementation.updateDocuments(updates);

  ui.notifications.info(`Zapisano skalę na ${updates.length} aktorach.`);
  console.log(`${MODULE_ID} | szafa z postaciami: zapisano`, found.changed);
  return { written: updates.length, changed: found.changed };
}

/**
 * Audyt bez budowania sceny: co gdzie trafia i co jest niespójne w danych.
 */
async function report() {
  const rows = await loadActors();
  const counts = {};
  for (const b of BANDS) counts[b.id] = rows.filter(r => r.band === b.id).length;

  const problems = {
    // Rozmiar w karcie mówi jedno, footprint żetonu drugie — żeton na mapie
    // zajmuje wtedy złą liczbę pól, a nikt tego nie zgłasza.
    footprintMismatch: rows
      .filter(r => r.declaredSize && TOKEN_SIZE[r.declaredSize] !== undefined
        && r.width !== TOKEN_SIZE[r.declaredSize])
      .map(r => `${r.actor.name}: ${r.declaredSize} → oczekiwane ${TOKEN_SIZE[r.declaredSize]}, jest ${r.width}`),
    asymmetricScale: rows.filter(r => r.scaleX !== r.scaleY)
      .map(r => `${r.actor.name} (${r.scaleX}/${r.scaleY})`),
    // Okrągły kadr + obrót = żeton do góry nogami przy każdym ruchu.
    rotatingRoll20Crop: rows.filter(r => r.art === "roll20" && !r.actor.prototypeToken.lockRotation)
      .map(r => r.actor.name)
  };

  const byBand = Object.fromEntries(BANDS.map(b => [
    b.id,
    rows.filter(r => r.band === b.id).map(r => `${r.actor.name} [${r.actor.type}/${r.size}] ${r.art} sx=${r.scaleX}`)
  ]));

  const summary = {
    actors: rows.length,
    scene: findTestScene(CLOSET_ID)?.name ?? null,
    counts,
    problems: Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, v.length])),
    calibratable: counts.druzyna + counts["npc-art"] + counts.pojazdy
  };
  console.log(`${MODULE_ID} | szafa z postaciami — raport`, summary, byBand, problems);
  return { summary, byBand, problems };
}

/** Usuwa scenę szafy. Aktorów nie rusza — to treść kampanii. */
async function remove() {
  const scene = findTestScene(CLOSET_ID);
  const wiped = await clearTestScene(CLOSET_ID, scene);
  if (scene) await scene.delete();
  ui.notifications.info(`Szafa z postaciami usunięta (${wiped.tokens} żetonów).`);
  return wiped;
}

/**
 * Postacie graczy z realną grafiką żetonu — pasmo odnośnikowe dla innych szaf.
 *
 * Mieszka tutaj, a nie w `monster-closet.mjs`, bo „kto jest drużyną i czy ma
 * grafikę" to pytanie tej szafy; Szafa z potworami tylko je zadaje. Dzięki temu
 * poprawka w `artKind()` albo w `isTooling()` działa w obu miejscach naraz.
 *
 * Zwraca **aktualną skalę** każdej postaci, żeby odnośnik pokazywał żeton taki,
 * jaki naprawdę wchodzi na mapę — a nie taki, jaki byłby przy skali 1,0.
 */
export function partyReference() {
  return game.actors
    .filter(a => a.type === "character"
      && !a.getFlag(MODULE_ID, "testScene.id")
      && !isTooling(a)
      && artKind(a) === "art")
    .map(a => ({
      name: a.name,
      size: knownSize(a.system?.traits?.size),
      src: a.prototypeToken.texture.src,
      scale: round2(a.prototypeToken.texture.scaleX)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export const characterClosetApi = {
  regenerate, harvest, apply, report, remove,
  scene: () => findTestScene(CLOSET_ID),
  partyReference,
  BANDS
};
