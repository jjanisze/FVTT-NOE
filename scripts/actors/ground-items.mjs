/**
 * Neuroshima 5e — przedmioty na ziemi (PLAN_paper_doll §9, D18, D33, D34, D37, D38).
 *
 * ## Upuszczony przedmiot to Kafelek (D33)
 *
 * Kafelek niesie pełne dane przedmiotu we fladze `groundItem` (`{items, from, droppedAt}`).
 * Natywne Kafelki dają za darmo: trwałość, rysowanie pod mgłą i widzeniem, poziomy sceny
 * i zwykłe narzędzia MG do przesuwania i sprzątania. Przedmiot **opuszcza** postać — nie ma czego
 * chować przed Udźwigiem ani listami ekwipunku, a niepowiązany żeton BN można skasować bez utraty
 * tego, co upuścił. Sprawdzone na żywo w P0 (§15).
 *
 * **Paczka, nie jeden przedmiot.** Broń z wymiennym magazynkiem spada razem z nim (`loadedMag`
 * w `weapons/magazine-model.mjs` wskazuje osobny przedmiot); podniesienie odtwarza oba
 * i przepina `loadedMag` na nowy identyfikator magazynka. Sztuki stosu spadają po jednej.
 *
 * ## Kto pisze — przekaźnik MG
 *
 * Gracz nie może tworzyć Kafelków (`TileDocument` create to ASSISTANT+), więc ten sam idiom co
 * `items/kolczatka.mjs`, `actors/grenade-inventory.mjs`, `wkk/items/flara.mjs`: klient gracza
 * zapisuje zwykłą flagę-prośbę na **własnym** aktorze, hak `updateActor` każdego klienta ją
 * widzi, a tylko `game.user.isActiveGM` robi uprzywilejowany zapis (Kafelek, zdjęcie przedmiotu
 * z postaci, utworzenie przy podnoszeniu). Bez aktywnego MG prośba jest odrzucana z komunikatem
 * — nic nie dzieje się połowicznie.
 *
 * ## Gdzie spada
 *
 * Obok żetonu, nie pod nim — żetony rysują się nad kafelkami, więc przedmiot u stóp byłby
 * niewidoczny (sprawdzone). Wolne pole w pierścieniu wokół żetonu (dla rzutu i Wytrącenia —
 * wokół celu), lekki obrót, `sort` nad istniejącymi kafelkami sceny (grafika map to często
 * kafelki), poziom sceny z żetonu.
 *
 * Wygląd: `vfx/<id broni>.webp` (grafika z góry, MISSING.md §B), gdy istnieje, inaczej ikona
 * przedmiotu. Ikony modułu rysują się na płótnie na biało — czytelne na ciemnej podłodze; na
 * jasnej ratuje je ciemny obrys (filtr rdzenia przy rysowaniu kafelka).
 */

import {
  isDollActor, familyOf, registerGroundHandler, slotsOf, SLOTS_FLAG, dollState, playEquipSound
} from "./doll.mjs";
import { slotId } from "./doll-model.mjs";
import { registerGroundList, registerGroundPick, refreshAllDolls } from "./doll-panel.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { WEAPON_MAP, buildWeaponItemData, magwellOf, hasChamber, REMOVABLE_SOURCES } from "../config/weapons-data.mjs";
import { standardMagazineFor, buildMagazineItemData } from "../config/magazines-data.mjs";
import { KOBALT_WEAPON_IDS } from "../wkk/config/weapons-data.mjs";
import { isMeleeWeapon, degradeWeapon } from "../weapons/melee-degradation.mjs";
import { setDamaged } from "../weapons/jams.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na Kafelku: `{items: [{ref, data}], links: [{ref, flag, to}], from, droppedAt}`. */
export const GROUND_FLAG = "groundItem";

/** Flaga-prośba na aktorze (przekaźnik MG). */
const REQUEST_FLAG = "groundRequest";

/** Flaga na żetonie BN: broń już spadła przy 0 PW (raz). */
const DROPPED_FLAG = "droppedAtZero";

/** Ustawienia świata. */
export const SETTING_NPC_DROPS = "npcDropsAtZero";
export const SETTING_FREE_DROP = "darmoweUpuszczanie";

/** Zasięg „Na ziemi obok" i podnoszenia — sąsiednie pole (1,5 m, przekątna też). */
const REACH_M = 1.5;

/* -------------------------------------------- */
/*  Pomocnicze                                   */
/* -------------------------------------------- */

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function _activeGM() {
  return game.users.activeGM ?? null;
}

/** Żeton aktora na oglądanej scenie: zaznaczony, inaczej pierwszy (niepowiązany — jego własny). */
function _tokenOf(actor) {
  if (!actor) return null;
  if (actor.token?.object) return actor.token.object;
  const own = canvas.tokens?.controlled?.find(t => t.actor === actor);
  if (own) return own;
  return actor.getActiveTokens?.(false, false)?.find(t => t.document?.parent === canvas.scene) ?? null;
}

/** Zasięg ręki od środka żetonu: 1,5 m od jego krawędzi (żeton średni — 2,25 m od środka). */
function _reach(token) {
  const half = (Math.max(token?.document?.width ?? 1, token?.document?.height ?? 1) * canvas.grid.distance) / 2;
  return REACH_M + half + 0.05;
}

function _tokenDoc(x) {
  return x?.document ?? x ?? null;
}

/** Odległość dwóch punktów w metrach po siatce (jak miarka; przekątna sąsiednia = 1,5 m). */
function _distance(a, b) {
  try {
    return canvas.grid.measurePath([a, b]).distance;
  } catch (_e) {
    return Math.hypot(a.x - b.x, a.y - b.y) / canvas.grid.size * canvas.grid.distance;
  }
}

export function isGroundTile(tile) {
  const doc = _tokenDoc(tile);
  return !!doc?.getFlag?.(MODULE_ID, GROUND_FLAG);
}

/* -------------------------------------------- */
/*  Paczka                                       */
/* -------------------------------------------- */

/** Dane przedmiotu do Kafelka: jedna sztuka, bez slotów lalki, niezałożony. */
function _pieceData(item) {
  const data = item.toObject();
  delete data._id;
  data.system.quantity = 1;
  if ("equipped" in (data.system ?? {})) data.system.equipped = false;
  const f = data.flags?.[MODULE_ID];
  if (f) { delete f[SLOTS_FLAG]; delete f.atHand; }
  return data;
}

/**
 * Paczka do upuszczenia: przedmiot (jedna sztuka) i — dla broni — wpięty magazynek.
 * @returns {{items: Array<{ref: string, id: string, data: object}>, links: Array<object>}}
 */
export function buildBundle(item) {
  const items = [{ ref: "main", id: item.id, data: _pieceData(item) }];
  const links = [];
  const magId = item.getFlag?.(MODULE_ID, "loadedMag");
  const mag = magId ? item.actor?.items.get(magId) : null;
  if (mag) {
    items.push({ ref: "mag", id: mag.id, data: _pieceData(mag) });
    links.push({ ref: "main", flag: "loadedMag", to: "mag" });
  }
  return { items, links };
}

/** Nazwa paczki do list i czatu („B 92 + magazynek"). */
function _bundleName(flag) {
  const names = (flag?.items ?? []).map(i => i.data?.name).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "przedmiot";
  return `${names[0]} + ${names.length - 1 === 1 ? "magazynek" : `${names.length - 1} przedm.`}`;
}

/* -------------------------------------------- */
/*  Miejsce lądowania                            */
/* -------------------------------------------- */

/**
 * Wolne pole w pierścieniu wokół żetonu (nie pod żetonem, nie za ścianą), z lekkim rozrzutem.
 * @param {Token|TokenDocument} token  Dokument wystarczy, gdy scena nie jest oglądana (wtedy bez
 *   sprawdzania ścian i żetonów — płótno ich nie ma).
 * @returns {{x: number, y: number}}  środek kafelka (v14: x/y kafelka to środek)
 */
function _landingSpot(token) {
  const doc = token?.document ?? token;
  const scene = doc?.parent ?? canvas.scene;
  const size = scene?.grid?.size ?? canvas.grid.size;
  const w = token?.w ?? (doc.width ?? 1) * size;
  const h = token?.h ?? (doc.height ?? 1) * size;
  const c = token?.center ?? { x: doc.x + w / 2, y: doc.y + h / 2 };
  const live = scene === canvas.scene && canvas.ready;
  // Okrąg tuż za krawędzią żetonu (przekątne też w tej samej odległości — na scenie bez siatki
  // róg kwadratu byłby już poza zasięgiem ręki).
  const r = Math.max(w, h) / 2 + size / 2;
  const ring = Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 4) * k;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
  const occupied = p => live && canvas.tokens.placeables.some(t => {
    const r = t.bounds;
    return p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
  });
  const blocked = p => {
    if (!live) return false;
    try {
      return CONFIG.Canvas.polygonBackends.move.testCollision(c, p, { type: "move", mode: "any" });
    } catch (_e) {
      return false;
    }
  };
  const free = ring.filter(p => !occupied(p) && !blocked(p));
  const open = ring.filter(p => !blocked(p));
  const pool = free.length ? free : (open.length ? open : ring);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const jitter = () => (Math.random() - 0.5) * size * 0.2;
  return { x: Math.round(pick.x + jitter()), y: Math.round(pick.y + jitter()) };
}

/** Rozmiar kafelka w polach siatki: długa broń większa. */
function _tileScale(data) {
  const sub = data.system?.type?.value;
  if (["palnaDluga", "palnaCiezka", "specjalna"].includes(sub)) return 1.0;
  if (data.type === "weapon" && (data.system?.properties ?? []).includes("two")) return 1.0;
  return 0.6;
}

const _vfxCache = new Map();

/** `vfx/<id>.webp` z grafiką z góry, gdy istnieje (MISSING.md §B). */
async function _textureFor(data) {
  const id = data.flags?.[MODULE_ID]?.weaponId;
  if (id) {
    const src = `modules/${MODULE_ID}/vfx/${id}.webp`;
    if (!_vfxCache.has(src)) {
      let ok = false;
      try { ok = await foundry.utils.srcExists(src); } catch (_e) { ok = false; }
      _vfxCache.set(src, ok);
    }
    if (_vfxCache.get(src)) return src;
  }
  return data.img;
}

/* -------------------------------------------- */
/*  Upuszczenie                                  */
/* -------------------------------------------- */

/** Czy da się teraz upuścić: jest aktywny MG i żeton aktora na oglądanej scenie. */
export function canDrop(actor, { quiet = false, at = null } = {}) {
  if (!_activeGM()) {
    if (!quiet) ui.notifications.warn("Upuszczenie wymaga MG na sesji (ziemię zakłada MG). Przedmiot zostaje.");
    return false;
  }
  if (!canvas?.ready || (!_tokenOf(actor) && !at)) {
    if (!quiet) ui.notifications.warn(`${actor?.name ?? "Postać"}: brak żetonu na oglądanej scenie — nie ma gdzie upuścić.`);
    return false;
  }
  return true;
}

/**
 * WKK „Darmowe upuszczanie" (D19): upuszczenie broni z własnej woli jest darmowe za cenę k6 —
 * 1–2: ostrze dostaje wyszczerbienie, broń palna uszkodzenie (bardziej złożone urządzenie niż
 * topór). Tylko broń, tylko z własnej woli, tylko z Kobaltem i włączoną opcją. Zasada z testów
 * autora systemu.
 */
async function _freeDropDamage(actor, item) {
  let on = false;
  try { on = isKobaltEnabled() && game.settings.get(MODULE_ID, SETTING_FREE_DROP); } catch (_e) { on = false; }
  if (!on || item.type !== "weapon") return;
  const roll = await new Roll("1d6").evaluate();
  const hit = roll.total <= 2;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name} — upuszczona (Darmowe upuszczanie, WKK): ${hit ? "1–2, broń ucierpiała" : "bez szkody"}`
  });
  if (!hit) return;
  if (isMeleeWeapon(item)) await degradeWeapon(item, { chat: true });
  else await setDamaged(item, { reason: "upuszczona", chat: true });
}

/**
 * Upuszcza jedną sztukę na ziemię. Woła to lalka (`commitMoves`, po zdjęciu sztuki ze slotu)
 * albo — dla BN — skrót `drop()`.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options]
 * @param {Token|object} [options.at]   Żeton, wokół którego spada (cel rzutu, Wytrącenia).
 * @param {boolean} [options.involuntary]
 * @param {string} [options.reason]
 */
async function _drop(actor, item, { at = null, involuntary = false, reason = "" } = {}) {
  if (!canDrop(actor, { at })) return false;
  if (!involuntary && isDollActor(actor)) await _freeDropDamage(actor, item);
  const live = actor.items.get(item.id) ?? item;
  const anchor = at?.center ? at : (at?.object ?? _tokenOf(actor));
  const anchorDoc = _tokenDoc(anchor);
  const request = {
    kind: "drop",
    nonce: foundry.utils.randomID(),
    userId: game.user.id,
    sceneId: anchorDoc?.parent?.id ?? canvas.scene?.id,
    spot: _landingSpot(anchor),
    level: anchorDoc?.level ?? null,
    bundle: buildBundle(live),
    removals: [],
    from: { actorUuid: actor.uuid, actorName: actor.name },
    reason
  };
  request.removals = request.bundle.items.map(i => ({ id: i.id, count: 1 }));
  return _send(actor, request);
}

/**
 * Jedna sztuka **luźnego** przedmiotu wypada na ziemię — z ekwipunku, nie z lalki (nabój, który
 * wyślizgnął się przy ładowaniu: `weapons/magazine.mjs`). Lalka odmawia przedmiotów, których
 * nie nosi, więc ta droga omija ją wprost; zawsze mimowolnie, więc bez „Darmowego upuszczania".
 * @returns {Promise<boolean>} false — brak MG albo żetonu; przedmiot zostaje u postaci
 */
export function dropLoosePiece(actor, item, { reason = "" } = {}) {
  return _drop(actor, item, { involuntary: true, reason });
}

/* -------------------------------------------- */
/*  Podniesienie                                 */
/* -------------------------------------------- */

/** Kafelki z ziemi w zasięgu ręki aktora (na oglądanej scenie). */
export function groundNearby(actor) {
  const token = _tokenOf(actor);
  if (!token || !canvas?.ready) return [];
  const out = [];
  for (const tile of canvas.scene.tiles) {
    const flag = tile.getFlag(MODULE_ID, GROUND_FLAG);
    if (!flag) continue;
    if (token.document.level && tile.levels?.size && !tile.levels.has(token.document.level)) continue;
    const dist = _distance(token.center, { x: tile.x, y: tile.y });
    if (dist > _reach(token)) continue;
    out.push({
      id: tile.id,
      name: _bundleName(flag),
      img: flag.items?.[0]?.data?.img ?? tile.texture.src,
      distance: `${String(Math.round(dist * 10) / 10).replace(".", ",")} m`,
      tooltip: `${_bundleName(flag)}${flag.from?.actorName ? ` — upuścił(a): ${flag.from.actorName}` : ""}`
    });
  }
  return out;
}

/** Podnieś (Darmowa Interakcja — RAW liczy podniesienie z ziemi jako dobycie). */
export async function pickUp(actor, tileId) {
  if (!actor?.isOwner) return false;
  if (!_activeGM()) {
    ui.notifications.warn("Podnoszenie wymaga MG na sesji. Przedmiot zostaje na ziemi.");
    return false;
  }
  const tile = canvas.scene?.tiles.get(tileId);
  if (!tile?.getFlag(MODULE_ID, GROUND_FLAG)) return false;
  const ok = await _send(actor, { kind: "pick", nonce: foundry.utils.randomID(), userId: game.user.id, sceneId: canvas.scene.id, tileId });
  if (ok) playEquipSound(actor);
  return ok;
}

/* -------------------------------------------- */
/*  Przekaźnik MG                                */
/* -------------------------------------------- */

/** MG robi sam; gracz zostawia prośbę na własnym aktorze. */
async function _send(actor, request) {
  if (game.user.isActiveGM) return _perform(actor, request);
  await actor.setFlag(MODULE_ID, REQUEST_FLAG, request);
  return true;
}

let _gmChain = Promise.resolve();

function _onUpdateActor(actor, changes) {
  const request = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${REQUEST_FLAG}`);
  if (!request?.nonce || !game.user.isActiveGM) return;
  _gmChain = _gmChain.then(() => _perform(actor, request)).catch(e => console.warn(`${MODULE_ID} | ziemia:`, e))
    .then(async () => {
      try { if (actor.getFlag(MODULE_ID, REQUEST_FLAG)?.nonce === request.nonce) await actor.unsetFlag(MODULE_ID, REQUEST_FLAG); } catch (_e) { /* aktor mógł zniknąć */ }
    });
}

async function _perform(actor, request) {
  if (request.kind === "drop") return _performDrop(actor, request);
  if (request.kind === "pick") return _performPick(actor, request);
  return false;
}

async function _performDrop(actor, request) {
  const scene = game.scenes.get(request.sceneId);
  if (!scene) return false;
  const main = request.bundle.items[0]?.data;
  if (!main) return false;
  const size = scene.grid.size * _tileScale(main);
  const sort = Math.max(0, ...scene.tiles.map(t => t.sort ?? 0)) + 1;
  const tileData = {
    texture: { src: await _textureFor(main) },
    width: Math.round(size),
    height: Math.round(size),
    x: request.spot.x,
    y: request.spot.y,
    rotation: Math.round((Math.random() - 0.5) * 50),
    sort,
    flags: {
      [MODULE_ID]: {
        [GROUND_FLAG]: {
          items: request.bundle.items.map(i => ({ ref: i.ref, data: i.data })),
          links: request.bundle.links,
          from: request.from,
          droppedAt: game.time.worldTime
        }
      }
    }
  };
  if (request.level) tileData.levels = [request.level];
  const [tile] = await scene.createEmbeddedDocuments("Tile", [tileData]);
  if (!tile) return false;

  // Dopiero gdy ziemia jest — przedmiot opuszcza postać (lalka już zdjęła go ze slotu).
  const deletes = [];
  const updates = [];
  for (const r of request.removals) {
    const item = actor.items.get(r.id);
    if (!item) continue;
    const qty = Math.max(0, Number(item.system?.quantity ?? 1));
    if (qty <= r.count) deletes.push(item.id);
    else updates.push({ _id: item.id, "system.quantity": qty - r.count });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, { neuroDoll: true });
  if (deletes.length) await actor.deleteEmbeddedDocuments("Item", deletes, { neuroDoll: true });
  return true;
}

async function _performPick(actor, request) {
  const scene = game.scenes.get(request.sceneId);
  const tile = scene?.tiles.get(request.tileId);
  const flag = tile?.getFlag(MODULE_ID, GROUND_FLAG);
  if (!flag) return false;

  // Zasięg sprawdzamy u gracza; MG może podnosić za kogokolwiek z dowolnego panelu (D34).
  const requester = game.users.get(request.userId);
  if (requester && !requester.isGM && scene === canvas.scene) {
    const token = _tokenOf(actor);
    if (!token || _distance(token.center, { x: tile.x, y: tile.y }) > _reach(token)) {
      await ChatMessage.create({ whisper: [requester.id], content: `<p>${_esc(actor.name)}: za daleko, żeby podnieść.</p>` });
      return false;
    }
  }

  // Do wolnej ręki, jeśli przedmiot w ogóle trzyma się w ręce — inaczej do plecaka.
  const datas = flag.items.map(i => foundry.utils.deepClone(i.data));
  const mainData = datas[0];
  const family = familyOf(mainData);
  let hand = null;
  if (isDollActor(actor) && family && ["meleeWeapon", "rangedWeapon", "handOnly", "light", "headLight", "device"].includes(family)) {
    const { layout, occupants } = dollState(actor);
    hand = [0, 1].map(i => slotId("hand", i)).find(s => !layout.slots.has(s) && !occupants[s]) ?? null;
  }
  if (hand) {
    foundry.utils.setProperty(mainData, `flags.${MODULE_ID}.${SLOTS_FLAG}`, [hand]);
    // `equipped` = aktywny (lalka) — także gdy dane z katalogu w ogóle nie niosą tego klucza.
    if (family !== "belt") foundry.utils.setProperty(mainData, "system.equipped", true);
  }

  // Najpierw zależności (magazynek), potem broń z przepiętym `loadedMag`.
  const refs = flag.items.map(i => i.ref);
  const linkedTargets = new Set((flag.links ?? []).map(l => l.to));
  const order = refs.map((ref, n) => ({ ref, n })).sort((a, b) => (linkedTargets.has(b.ref) ? 1 : 0) - (linkedTargets.has(a.ref) ? 1 : 0));
  const created = new Map();
  for (const { ref, n } of order) {
    const data = datas[n];
    for (const link of (flag.links ?? []).filter(l => l.ref === ref)) {
      const target = created.get(link.to);
      if (target) foundry.utils.setProperty(data, `flags.${MODULE_ID}.${link.flag}`, target.id);
    }
    const [doc] = await actor.createEmbeddedDocuments("Item", [data], { neuroDoll: true });
    if (doc) created.set(ref, doc);
  }
  await tile.delete();

  const name = _bundleName(flag);
  const where = hand ? (hand === "hand.0" ? "do prawej ręki" : "do lewej ręki") : "do plecaka";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-doll-moves"><ul><li class="neuro-doll-move">
        <img src="${_esc(mainData.img)}" alt="" inert>
        <span class="neuro-doll-move-what"><strong>${_esc(actor.name)}</strong> podnosi ${_esc(name)} — ${where}</span>
        <span class="neuro-doll-move-cost" data-tooltip="podniesienie (RAW: jak dobycie)">${hand ? "[I]" : "[I] + Akcja"}</span>
      </li></ul></div>`
  });
  return true;
}

/* -------------------------------------------- */
/*  BN przy 0 PW (D34, D37, D38)                 */
/* -------------------------------------------- */

/**
 * Losowa liczba naboi w upuszczonej broni z katalogu (D37): `[1, max(1, ⌊pojemność/2⌋)]`.
 * Czyste — testowane.
 */
export function droppedRounds(capacity, random = Math.random) {
  const hi = Math.max(1, Math.floor(Math.max(0, Number(capacity) || 0) / 2));
  return 1 + Math.floor(random() * hi);
}

/**
 * Świeży egzemplarz broni z katalogu, nabity według D37, z magazynkiem jako osobną pozycją
 * paczki. Statystyki katalogowe, nie zamalgamowane BN-owe.
 * @param {string} weaponId
 * @returns {{items: Array<{ref, id, data}>, links: Array}|null}
 */
export function catalogBundle(weaponId, { random = Math.random } = {}) {
  const w = WEAPON_MAP[weaponId];
  if (!w) return null;
  const data = buildWeaponItemData(w);
  const items = [{ ref: "main", id: null, data }];
  const links = [];
  const f = data.flags[MODULE_ID];
  if (w.mag && w.caliber) {
    if (REMOVABLE_SOURCES.includes(w.mag.kind)) {
      const def = standardMagazineFor(magwellOf(w));
      if (def) {
        const n = Math.min(droppedRounds(w.mag.max, random), def.capacity);
        items.push({ ref: "mag", id: null, data: buildMagazineItemData(def, { rounds: Array(n).fill(w.caliber) }) });
        links.push({ ref: "main", flag: "loadedMag", to: "mag" });
        f.mag = { ...(f.mag ?? {}), ammoType: w.caliber, current: n, max: def.capacity + (hasChamber(w) ? 1 : 0) };
      }
    } else {
      const n = droppedRounds(w.mag.max, random);
      const chamber = hasChamber(w) && n > 0;
      f.rounds = Array(chamber ? n - 1 : n).fill(w.caliber);
      f.chamber = { caliberId: chamber ? w.caliber : null };
      f.mag = { ...(f.mag ?? {}), ammoType: w.caliber, current: n };
    }
  }
  return { items, links };
}

/**
 * `dropsAs` ataku Bestiariusza: z flag przedmiotu, a gdy ich brak — z wygenerowanej tabeli
 * (`config/bestiary-data.mjs`) po `bestiary.creature` / `bestiary.entryId`. Dzięki temu działa
 * też na kopiach BN-ów zaimportowanych do świata przed dodaniem tabeli.
 */
export function dropsAsOf(item) {
  const own = item?.flags?.[MODULE_ID]?.dropsAs;
  if (own) return own;
  const b = item?.flags?.[MODULE_ID]?.bestiary;
  if (!b?.creature || !b.entryId) return null;
  return BESTIARY[b.creature]?.attacks?.find(a => a.id === b.entryId)?.dropsAs ?? null;
}

/** Co BN upuszcza przy 0 PW: realne bronie modułu i ataki Bestiariusza z `dropsAs`. */
export function npcDroppables(actor, { kobalt = isKobaltEnabled() } = {}) {
  const out = [];
  const seen = new Set();
  for (const item of actor?.items ?? []) {
    const family = familyOf(item);
    if (item.type === "weapon" && (family === "meleeWeapon" || family === "rangedWeapon")) {
      out.push({ kind: "item", item });
      continue;
    }
    const dropsAs = dropsAsOf(item);
    if (!dropsAs || item.flags?.[MODULE_ID]?.dropped) continue;
    for (const entry of Array.isArray(dropsAs) ? dropsAs : [dropsAs]) {
      const id = typeof entry === "string" ? entry : entry?.id;
      if (!WEAPON_MAP[id] || seen.has(id)) continue;
      // Śmieci sprzedawcy to WKK — bez Kobaltu te ataki nic nie zostawiają (D36).
      if (KOBALT_WEAPON_IDS.includes(id) && !kobalt) continue;
      seen.add(id);
      out.push({ kind: "catalog", feat: item, weaponId: id, addons: entry?.addons ?? [] });
    }
  }
  return out;
}

async function _npcDropAll(actor, token) {
  const list = npcDroppables(actor);
  if (!list.length) return;
  await token.setFlag(MODULE_ID, DROPPED_FLAG, true);
  const names = [];
  for (const d of list) {
    const bundle = d.kind === "item" ? buildBundle(d.item) : catalogBundle(d.weaponId);
    if (!bundle) continue;
    if (d.kind === "catalog" && d.addons?.length) {
      // Ulepszenia „flag-only" (Utwardzenie) — rekord bez zmian w danych broni.
      foundry.utils.setProperty(bundle.items[0].data, `flags.${MODULE_ID}.addons`, d.addons.map(id => ({ id, delta: {} })));
    }
    const request = {
      kind: "drop", nonce: foundry.utils.randomID(), userId: game.user.id, sceneId: token.parent.id,
      spot: _landingSpot(token.object ?? token), level: token.level ?? null, bundle,
      removals: d.kind === "item" ? bundle.items.map(i => ({ id: i.id, count: 1 })) : [],
      from: { actorUuid: actor.uuid, actorName: token.name ?? actor.name }, reason: "0 PW"
    };
    await _performDrop(actor, request);
    if (d.kind === "catalog") await d.feat.setFlag(MODULE_ID, "dropped", true);
    names.push(bundle.items[0].data.name);
  }
  if (names.length) {
    await ChatMessage.create({
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<p><strong>${_esc(token.name ?? actor.name)}</strong> pada — na ziemię lecą: ${names.map(_esc).join(", ")}.</p>`
    });
  }
}

function _onUpdateActorHp(actor, changes) {
  if (!game.user.isActiveGM) return;
  const hp = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (hp === undefined || hp > 0) return;
  if (isDollActor(actor)) return; // postacie: Nieprzytomność zostawia ręce, jak były (D29)
  let enabled = true;
  try { enabled = game.settings.get(MODULE_ID, SETTING_NPC_DROPS); } catch (_e) { enabled = true; }
  if (!enabled) return;
  const token = actor.token ?? actor.getActiveTokens(true, true)?.[0] ?? null;
  if (!token || token.getFlag(MODULE_ID, DROPPED_FLAG)) return;
  _gmChain = _gmChain.then(() => _npcDropAll(actor, token)).catch(e => console.warn(`${MODULE_ID} | BN upuszcza:`, e));
}

/* -------------------------------------------- */
/*  Sprzątanie i wygląd                          */
/* -------------------------------------------- */

/** MG: kasuje wszystkie przedmioty z ziemi na scenie. */
export async function sweep(scene = canvas.scene) {
  if (!game.user.isGM || !scene) return 0;
  const ids = scene.tiles.filter(t => t.getFlag(MODULE_ID, GROUND_FLAG)).map(t => t.id);
  if (ids.length) await scene.deleteEmbeddedDocuments("Tile", ids);
  ui.notifications.info(`Ziemia: usunięto ${ids.length} przedmiotów ze sceny ${scene.name}.`);
  return ids.length;
}

/** Ciemny obrys — białe ikony modułu na jasnej podłodze (filtr rdzenia, bez pulsowania). */
function _onDrawTile(tile) {
  if (!isGroundTile(tile) || !tile.mesh) return;
  const Filter = foundry.canvas?.rendering?.filters?.OutlineOverlayFilter;
  if (!Filter) return;
  const f = Filter.create({ outlineColor: [0.08, 0.07, 0.06, 1], knockout: false, wave: false });
  f.animated = false;
  f.thickness = 2;
  tile.mesh.filters = [...(tile.mesh.filters ?? []).filter(x => !x._neuroGround), Object.assign(f, { _neuroGround: true })];
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerGroundItems() {
  game.settings.register(MODULE_ID, SETTING_NPC_DROPS, {
    name: "BN upuszczają broń przy 0 PW",
    hint: "Oporządzenie (D34, D38): BN, który spada do 0 PW, raz upuszcza broń na ziemię obok żetonu — "
      + "gracz w zasięgu 1,5 m może ją podnieść. Broń z Bestiariusza przychodzi z katalogu, z kilkoma nabojami.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, SETTING_FREE_DROP, {
    name: "Darmowe upuszczanie (WKK)",
    hint: "Upuszczenie broni z własnej woli nie kosztuje Darmowej Interakcji, ale k6: 1–2 — broń "
      + "ucierpi (ostrze: wyszczerbienie, palna: uszkodzenie). Działa tylko z Kolorem Kobaltu.",
    scope: "world", config: true, type: Boolean, default: false
  });

  registerGroundHandler({ canDrop, drop: _drop });
  registerGroundList(actor => (canvas?.ready ? groundNearby(actor) : null));
  registerGroundPick(pickUp);

  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("updateActor", _onUpdateActorHp);
  Hooks.on("drawTile", _onDrawTile);
  Hooks.on("refreshTile", tile => { if (isGroundTile(tile) && !tile.mesh?.filters?.some(f => f._neuroGround)) _onDrawTile(tile); });
  for (const h of ["createTile", "deleteTile", "updateTile"]) {
    Hooks.on(h, tile => { if (isGroundTile(tile)) refreshAllDolls(); });
  }
  Hooks.on("updateToken", (_t, changes) => { if ("x" in changes || "y" in changes || "level" in changes) refreshAllDolls(); });
  Hooks.on("canvasReady", () => refreshAllDolls());

  // „Darmowe upuszczanie" pokazujemy tylko z Kobaltem (D19).
  Hooks.on("renderSettingsConfig", (_app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const input = root?.querySelector(`[name="${MODULE_ID}.${SETTING_FREE_DROP}"]`);
    const group = input?.closest(".form-group");
    if (group) group.hidden = !isKobaltEnabled();
  });
  console.log("Neuroshima 5e | Ground items registered");
}

/** API: `game.neuroshima.ziemia`. */
export const groundApi = { sweep, pickUp, nearby: groundNearby, canDrop, catalogBundle, npcDroppables, dropsAsOf };

export const __testing = Object.freeze({ droppedRounds, catalogBundle, buildBundle, npcDroppables, dropsAsOf, _tileScale });
