/**
 * Neuroshima 5e — znaczniki FX na scenie: przycisk MG, który odpala przygotowaną sekwencję.
 *
 * Znacznik przychodzi z eksportu mapy (obiekt `fx` w Tiled → flaga sceny `fx`, pinezka MG ze stroną
 * dziennika). Na stronie stoi `@NeuroFx[<id>]{Etykieta}` — wzbogacacz zamienia to w link; klik MG
 * (albo `game.neuroshima.maps.fx(id)`) uruchamia znacznik na oglądanej scenie. Dwa rodzaje:
 *
 * ## `detonate` — wybuch w czasie rzeczywistym, poza turami
 *
 * Iskry na maszynie przez `lead` s → dźwięk znacznika (`sfx`) w jego punkcie, słyszalny w promieniu
 * `hear` m, z murami (długość czytana z pliku) → po nim i po `tail` s wybuch, dźwięk wybuchu,
 * obszar rażenia (`radius` m, region widoczny dla wszystkich) i **pauza gry dla wszystkich**.
 * MG nakłada obrażenia w trakcie pauzy (szeptana karta wylicza tokeny w zasięgu i liczby
 * z `text`); obszar znika przy wznowieniu. W chwili wybuchu kafel wraku (`wreck`, flaga `fxWreck`)
 * się pokazuje, a kafle grupy `group` zamieniają się jak przy odsłonięciu (`cover` — cała maszyna —
 * znika); błysk oświetla pomieszczenie na chwilę, potem zostaje dym i żar (światło), aż do resetu.
 * Efekty i dźwięki rozsyła Sequencer (JB2A); bez niego zostaje dźwięk dla wszystkich, obszar, pauza
 * i światła w tych samych odstępach.
 *
 * Wszystko żyje na poziomie znacznika: efekty mają jego wysokość i poziom (Sequencer v14 pokazuje efekt
 * tylko na poziomie, który zawiera jego wysokość — bez niej punkt siedzi na 0 m, czyli na dachu), dźwięk
 * jego wysokość (rdzeń tłumi go przez stropy), światła jego poziom. W zasięgu liczą się tylko tokeny
 * na tym poziomie. MG, który kliknie Detonuj z innego poziomu, zostaje przeniesiony na poziom znacznika.
 *
 * ## `reveal` — odsłonięcie
 *
 * Tokeny spotkań z grupy `group` (flaga `room` z eksportu) przestają być ukryte; kafle z flagą
 * `fxGroup` = grupa zamieniają się: `cover` znika, `revealed` się pojawia (furgonetka → blachy).
 */

import { seqEffect, seqEndEffect } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = MODULE_ID;
const WZOR = /@NeuroFx\[([\w-]+)\](?:\{([^}]+)\})?/g;

/** JB2A (darmowy pakiet). Brak wpisu = brak efektu, sekwencja idzie dalej (seqEffect sprawdza bazę). */
const ISKRY = ["jb2a.static_electricity.01.blue", "jb2a.static_electricity.03.blue"];
const WYBUCH = ["jb2a.explosion.shrapnel.bomb", "jb2a.explosion.01.orange"];
const DYM = "jb2a.smoke.plumes_loop.01";
const DYM_POLA = 4;
/** Pióropusz JB2A dryfuje z punktu w lewo i w górę (zmierzone: środek dymu ~0,08 rozmiaru od punktu). */
const DYM_PRZESUNIECIE = { x: 0.08 * DYM_POLA, y: 0.08 * DYM_POLA };
const KLAB = "jb2a.smoke.puff.centered.grey";
const BLYSK_MS = 1500;
const DZWIEK_WYBUCHU = `modules/${MODULE_ID}/sounds/explosives/explosion.ogg`;
const DZWIEK_ZAPAS_S = 8;

const czekaj = ms => new Promise(r => setTimeout(r, ms));

/** Znacznik o tym id: najpierw oglądana scena, potem dowolna. */
function znajdz(id) {
  const naScenie = s => (s?.getFlag(FLAG, "fx") ?? {})[id] ? s : null;
  const scene = naScenie(canvas?.scene) ?? game.scenes.find(naScenie) ?? null;
  return scene ? { scene, znacznik: scene.getFlag(FLAG, "fx")[id] } : null;
}

/**
 * Długość pliku dźwiękowego w sekundach, z metadanych samego pliku; zapas, gdy się nie da.
 * Element `<audio>`, nie `AudioHelper.preloadSound`: ten czeka na odblokowanie AudioContextu
 * (gest użytkownika w karcie) i w zablokowanej karcie nie wraca nigdy — sekwencja by stanęła.
 */
function dlugosc(src) {
  if (!src) return Promise.resolve(0);
  return new Promise(resolve => {
    const audio = new Audio();
    const koniec = v => { clearTimeout(zegar); audio.removeAttribute("src"); resolve(v); };
    const zegar = setTimeout(() => koniec(DZWIEK_ZAPAS_S), 3000);
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () =>
      koniec(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : DZWIEK_ZAPAS_S), { once: true });
    audio.addEventListener("error", () => koniec(DZWIEK_ZAPAS_S), { once: true });
    audio.src = src;
  });
}

/** Dźwięk w punkcie (Sequencer: kierunek, zanik, mury, stropy) albo dla wszystkich bez Sequencera. */
function dzwiek(src, punkt, promien, wysokosc = 0) {
  if (!src) return;
  if (game.modules.get("sequencer")?.active) {
    new Sequence({ moduleName: MODULE_ID }).sound().file(src).atLocation(punkt).radius(promien)
      .elevation(wysokosc, { absolute: true })
      .distanceEasing(true).constrainedByWalls(true).alwaysForGMs().play();
  } else {
    foundry.audio.AudioHelper.play({ src, volume: 0.9 }, true);
  }
}

/** Tokeny na poziomie znacznika, których środek leży w promieniu. */
function wZasiegu(scene, z) {
  const px = z.radius / scene.grid.distance * scene.grid.size;
  return scene.tokens.filter(t => {
    if (t._source.level !== z.level) return false;
    const c = t.getCenterPoint();
    return Math.hypot(c.x - z.x, c.y - z.y) <= px;
  });
}

/** Światło znacznika na jego poziomie: błysk wybuchu albo żar po nim (flaga `fx` + rola). */
async function swiatlo(scene, z, id, rola, config) {
  const [l] = await scene.createEmbeddedDocuments("AmbientLight", [{ x: z.x, y: z.y, elevation: z.elevation ?? 0,
    levels: [z.level], walls: true, vision: false, config, flags: { [FLAG]: { fx: id, role: rola } } }]);
  return l;
}

async function detonuj(id, scene, z) {
  const stan = scene.getFlag(FLAG, "fxStan") ?? {};
  if (stan[id]) {
    const jeszcze = await foundry.applications.api.DialogV2.confirm({
      window: { title: z.title }, content: "<p>Ten znacznik już raz wybuchł. Odpalić jeszcze raz?</p>" });
    if (!jeszcze) return false;
  }
  const punkt = { x: z.x, y: z.y };
  const czas = await dlugosc(z.sfx);
  const lead = (z.lead ?? 0) * 1000, reszta = (czas + (z.tail ?? 0)) * 1000;
  const iskry = `fx-${scene.id}-${id}-iskry`;
  const wysokosc = z.elevation ?? 0;
  // Efekty Sequencera żyją na płótnie: scena, której nikt tu nie ogląda, dostaje resztę bez nich.
  const efekt = (plik, opcje) => scene.isView && seqEffect(plik, punkt, { elevation: wysokosc, levels: z.level, ...opcje });

  efekt(ISKRY[0], { sizeSquares: 2.5, persist: true, name: iskry, fadeIn: 300, aboveLighting: true });
  await czekaj(lead);
  efekt(ISKRY[1], { sizeSquares: 4, persist: true, name: iskry, fadeIn: 500, aboveLighting: true });
  if (scene.isView) dzwiek(z.sfx, punkt, z.hear || 40, wysokosc);
  await czekaj(reszta);

  seqEndEffect(iskry);
  if (scene.isView) dzwiek(DZWIEK_WYBUCHU, punkt, Math.max(60, z.hear || 40), wysokosc);
  const srednica = 2 * z.radius / scene.grid.distance;
  for (const plik of WYBUCH) efekt(plik, { sizeSquares: Math.max(srednica, 3), aboveLighting: true });
  efekt(KLAB, { sizeSquares: Math.max(srednica, 3) });
  const zasieg = Math.max(z.radius, 3);
  const blysk = await swiatlo(scene, z, id, "flash", { color: "#ffb35c", alpha: 0.7, bright: zasieg, dim: zasieg * 2.5,
    luminosity: 0.7, attenuation: 0.3, animation: { type: "torch", speed: 10, intensity: 10, reverse: false } });
  setTimeout(() => { if (scene.lights.has(blysk?.id)) blysk.delete().catch(() => {}); }, BLYSK_MS);
  // Pod błyskiem: maszyna znika, wrak się pojawia.
  const kafle = [...kafleGrupy(scene, z.group),
    ...scene.tiles.filter(t => t.getFlag(FLAG, "fxWreck") === id && t.hidden).map(t => ({ _id: t.id, hidden: false }))];
  if (kafle.length) await scene.updateEmbeddedDocuments("Tile", kafle);
  const [obszar] = z.radius > 0 ? await scene.createEmbeddedDocuments("Region", [{
    name: `Wybuch · ${z.title}`, color: "#ff5a1f", levels: [z.level],
    shapes: [{ type: "circle", x: z.x, y: z.y, radius: z.radius / scene.grid.distance * scene.grid.size, hole: false }],
    elevation: { bottom: null, top: null }, visibility: CONST.REGION_VISIBILITY.ALWAYS,
    flags: { [FLAG]: { fx: id, role: "aoe" } }
  }]) : [];
  game.togglePause(true, { broadcast: true });

  const kto = wZasiegu(scene, z).map(t => foundry.utils.escapeHTML(t.name));
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<p><strong>${foundry.utils.escapeHTML(z.title)}</strong> — wybuch.</p>`
      + `<p>W promieniu ${z.radius} m: ${kto.length ? kto.join(", ") : "nikt"}.</p>`
      + (z.text ? `<p>${foundry.utils.escapeHTML(z.text).replace(/\n/g, "<br>")}</p>` : "")
  });

  efekt(DYM, { sizeSquares: DYM_POLA, persist: true, name: `fx-${scene.id}-${id}-dym`, fadeIn: 1500, belowTokens: true,
    spriteOffset: DYM_PRZESUNIECIE });
  await swiatlo(scene, z, id, "glow", { color: "#ff6a1a", alpha: 0.45, bright: 0.75, dim: 4.5, luminosity: 0.5,
    attenuation: 0.6, animation: { type: "flame", speed: 3, intensity: 4, reverse: false } });
  await scene.setFlag(FLAG, "fxStan", { ...stan, [id]: { kiedy: Date.now() } });
  return { obszar: obszar?.id ?? null, wZasiegu: kto.length, kafle: kafle.length };
}

/** Zmiany kafli grupy: `cover` znika, `revealed` się pojawia (bez grupy — nic). */
function kafleGrupy(scene, group) {
  if (!group) return [];
  return scene.tiles.filter(t => t.getFlag(FLAG, "fxGroup") === group).map(t => {
    const rola = t.getFlag(FLAG, "role");
    return rola === "cover" ? { _id: t.id, hidden: true } : rola === "revealed" ? { _id: t.id, hidden: false } : null;
  }).filter(Boolean);
}

async function odslon(id, scene, z) {
  const tokeny = scene.tokens.filter(t => t.getFlag(FLAG, "source") === "encounter"
    && t.getFlag(FLAG, "room") === z.group && t.hidden).map(t => ({ _id: t.id, hidden: false }));
  if (tokeny.length) await scene.updateEmbeddedDocuments("Token", tokeny);
  const kafle = kafleGrupy(scene, z.group);
  if (kafle.length) await scene.updateEmbeddedDocuments("Tile", kafle);
  return { tokeny: tokeny.length, kafle: kafle.length };
}

/**
 * Uruchamia znacznik FX (tylko MG). Scena znacznika musi być oglądana — efekty żyją na płótnie.
 * @param {string} id
 * @returns {Promise<object|false>}
 */
async function fx(id) {
  if (!game.user.isGM) return false;
  const found = znajdz(id);
  if (!found) {
    ui.notifications.warn(`Nie ma znacznika FX „${id}” na żadnej scenie.`);
    return false;
  }
  const { scene, znacznik: z } = found;
  if (!scene.isView) {
    ui.notifications.warn(`Znacznik „${z.title}” jest na scenie „${scene.name}” — najpierw ją pokaż.`);
    return false;
  }
  // MG ogląda inny poziom: efekty grają na poziomie znacznika, więc tam go przenosimy.
  if (z.level && canvas.level?.id !== z.level && scene.levels?.has(z.level)) await scene.view({ level: z.level });
  if (z.kind === "reveal") return odslon(id, scene, z);
  return detonuj(id, scene, z);
}

/** Znaczniki FX sceny: id, rodzaj, nazwa, czy już odpalony. */
function znacznikiFx(scene = canvas?.scene) {
  const stan = scene?.getFlag(FLAG, "fxStan") ?? {};
  return Object.entries(scene?.getFlag(FLAG, "fx") ?? {}).map(([id, z]) => ({
    id, rodzaj: z.kind, nazwa: z.title, poziom: z.level, odpalony: !!stan[id] }));
}

/* -------------------------------------------- */
/*  Wzbogacacz i sprzątanie                      */
/* -------------------------------------------- */

function wzbogac(match) {
  const [, id, etykieta] = match;
  const rodzaj = znajdz(id)?.znacznik.kind;
  const a = document.createElement("a");
  a.className = "content-link neuro-fx";
  a.dataset.fxId = id;
  a.dataset.tooltip = "Znacznik FX (tylko prowadzący)";
  a.innerHTML = `<i class="fa-solid ${rodzaj === "reveal" ? "fa-eye" : "fa-burst"}" inert></i> `
    + foundry.utils.escapeHTML(etykieta ?? id);
  return a;
}

function poRenderze(el) {
  el.querySelector("a.neuro-fx")?.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    fx(ev.currentTarget.dataset.fxId);
  });
}

/** Wznowienie gry sprząta obszary rażenia (MG nakładał obrażenia w trakcie pauzy). */
async function _onPauseGame(paused) {
  if (paused || !game.user.isActiveGM) return;
  for (const scene of game.scenes) {
    const obszary = scene.regions.filter(r => r.getFlag(FLAG, "role") === "aoe" && r.getFlag(FLAG, "fx")).map(r => r.id);
    if (obszary.length) await scene.deleteEmbeddedDocuments("Region", obszary);
  }
}

export function registerFxMarkers() {
  CONFIG.TextEditor.enrichers.push({ id: `${MODULE_ID}.fx`, pattern: WZOR, enricher: wzbogac, onRender: poRenderze });
  Hooks.on("pauseGame", _onPauseGame);
}

/** Nowa drużyna: trwałe efekty znaczników tej sceny (dym po wybuchu, iskry) i ich światła (żar) znikają. */
export async function sprzatnijFx(scene) {
  for (const id of Object.keys(scene?.getFlag(FLAG, "fx") ?? {})) {
    for (const czesc of ["iskry", "dym"]) seqEndEffect(`fx-${scene.id}-${id}-${czesc}`);
  }
  const swiatla = scene?.lights.filter(l => l.getFlag(FLAG, "fx")).map(l => l.id) ?? [];
  if (swiatla.length) await scene.deleteEmbeddedDocuments("AmbientLight", swiatla);
}

export const fxMarkersApi = { fx, znacznikiFx };

/** Dla testów Quench (`scripts/tests/poziomy.test.mjs`): sekwencje bez sprawdzania oglądanej sceny. */
export const __testing = Object.freeze({ detonuj, odslon, wZasiegu });
