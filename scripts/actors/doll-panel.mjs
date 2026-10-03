/**
 * Neuroshima 5e — Lalka: panel przy karcie postaci (PLAN_paper_doll §7).
 *
 * Model i lejek zapisu: `actors/doll.mjs`. Ten plik to tylko widok i gesty.
 *
 * ## Dlaczego osobna aplikacja, a nie szuflada w DOM karty (D15, §15)
 *
 * Panel to bezramkowa `ApplicationV2` przyklejona do lewej krawędzi karty (do prawej, gdy po
 * lewej brak miejsca) — tak jak Paper Doll theripper93. Szuflada w drzewie karty byłaby ucinana
 * przez ramkę okna, dzieliłaby z dnd5e trasowanie upuszczeń i ginęła przy każdym przerysowaniu
 * części karty. Osobna aplikacja przerysowuje się tylko na własnych danych, więc animacje
 * przeżywają przerysowania karty.
 *
 * Dokowanie mieszka w podklasie karty (`sheet-shell.mjs` woła `dollSheetMixin`): zdarzenie
 * `position` karty przesuwa i rozciąga panel, zamknięcie karty zamyka panel. Rdzeń kończy
 * `bringToFront` od razu dla aplikacji bez ramki — kolejność warstw jest więc nasza: karta
 * podnosi panel razem ze sobą, a wciśnięcie wskaźnika na panelu podnosi kartę.
 *
 * ## Wygląd — przedłużenie karty, nie nowy motyw (§7)
 *
 * Powierzchnie, ramki, czcionki i kolory z karty dnd5e (`--dnd5e-*`) — panel nosi klasy motywu
 * karty, więc idzie za jasnym/ciemnym i za przyszłym przeglądem stylu. Nagłówki grup jak legenda
 * panelu Stan, sloty jak kafelki pasa. Bez papieru, maszynopisu, plam i przetarć.
 *
 * ## Manekin (D13, §7a)
 *
 * Grafika jest **maską** (`mask-image`) na wypełnieniu z motywu — daje kształt, nie kolor. Linie
 * od kafelków do części ciała rysujemy sami (SVG nad obrazkiem), z punktów
 * `config/doll-anchors.mjs`; żaden kafelek nie leży na figurze.
 */

import {
  dollState, place, takeOff, drop, draw, familyOf, isDollActor, releaseHand, slotsOf
} from "./doll.mjs";
import {
  SLOT_GROUPS, DOLL_FAMILIES, HAND_LABELS, HAND_SHORT, slotId, parseSlot, groupOf, tierOf, slotLabel, accepts
} from "./doll-model.mjs";
import { handyCaption, handyUse } from "./handy-items.mjs";
import { DOLL_ANCHORS, MANNEQUIN_SRC, MANNEQUIN_ASPECT } from "../config/doll-anchors.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga użytkownika: dla których aktorów lalka ma być otwarta (`{[actorId]: true}`). */
const OPEN_FLAG = "dollOpen";

const PANEL_WIDTH = 340;
const GAP = 2;

/**
 * Kolumny manekina (D32: prawa ręka postaci po lewej stronie patrzącego). Kolejność = kolejność
 * punktów `DOLL_ANCHORS` z góry na dół, a każda strona dostaje części ciała ze swojej połowy —
 * dzięki temu linie biegną prawie poziomo i się nie krzyżują (`_layoutColumns`).
 */
const LEFT = ["head.0", "faceGear.0", "arms.0", "hand.0", "outfit.0"];
const RIGHT = ["headGear.0", "shoulder.0", "body.0", "hand.1", "legs.0"];
const CELL_GAP = 4;
const RACKS = [
  { group: "belt", label: "Pas", anchor: "belt" },
  { group: "melee", label: "Pochwy", anchor: "melee" },
  { group: "ranged", label: "Kabury", anchor: "ranged" }
];

/** Krótkie podpisy kafelków (kolumna ma 60 px). */
const SHORT_LABELS = { arms: "Ochr. rąk", legs: "Ochr. nóg" };

/** Ikona pustego slotu — co tam pasuje. */
const SLOT_ICONS = {
  hand: "fa-hand", belt: "fa-sack", melee: "fa-dagger", ranged: "fa-gun", body: "fa-vest",
  outfit: "fa-shirt", head: "fa-helmet-battle", headGear: "fa-glasses", faceGear: "fa-mask-face",
  shoulder: "fa-flashlight", arms: "fa-hand-back-fist", legs: "fa-socks"
};

/** Na żywo otwarte panele: `sheet.id → DollPanel`. */
const _panels = new Map();

/** Panele w trakcie chowania: `sheet.id → Promise` (ponowne otwarcie czeka). */
const _closing = new Map();

/** Trwa przeciąganie kafelka — `{actorUuid, slot}`; w `dragover` danych nie da się czytać. */
let _tileDrag = null;

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function _dragData(event) {
  try {
    const raw = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

/* -------------------------------------------- */
/*  Model widoku                                 */
/* -------------------------------------------- */

function _tile(actor, state, slot) {
  const { layout, occupants } = state;
  const group = groupOf(slot);
  const itemId = layout.slots.get(slot);
  const item = itemId ? actor.items.get(itemId) : null;
  const blockerId = layout.blocked.get(slot);
  const tile = {
    slot, group,
    label: group === "hand" ? HAND_LABELS[parseSlot(slot).index] : (SHORT_LABELS[group] ?? slotLabel(slot)),
    icon: SLOT_ICONS[group] ?? "fa-circle",
    item: null, blockedBy: null, occupant: occupants[slot] ?? null, ghost: null
  };
  if (item) {
    const d = state.items.find(x => x.id === item.id);
    const total = d?.quantity ?? 1;
    const placed = d?.slots.length ?? 0;
    tile.item = {
      id: item.id, uuid: item.uuid, name: item.name, img: item.img,
      caption: d?.family === "belt" ? handyCaption(item) : "",
      // Zapas w plecaku, z ikoną plecaka — jak na pasie w nagłówku (`handy-belt.mjs`).
      total, placed, reserve: Math.max(0, total - placed)
    };
  } else if (blockerId && blockerId !== itemId) {
    const b = actor.items.get(blockerId);
    tile.blockedBy = b ? { name: b.name, img: b.img } : null;
  }
  // Duch chwytu (D2): pusta ręka pokazuje broń z drugiej ręki — można ją chwycić oburącz.
  if (group === "hand" && !item && !tile.occupant) {
    const other = slot === "hand.0" ? "hand.1" : "hand.0";
    const otherItem = actor.items.get(layout.slots.get(other));
    if (otherItem?.type === "weapon") tile.ghost = { name: otherItem.name, img: otherItem.img };
  }
  return tile;
}

function _viewModel(actor) {
  const state = dollState(actor);
  const cap = state.layout.capacity;
  const racks = RACKS.map(r => {
    const slots = [];
    for (let i = 0; i < (cap[r.group] ?? 0); i++) slots.push(_tile(actor, state, slotId(r.group, i)));
    const used = slots.filter(s => s.item).length;
    return { ...r, slots, used, cap: cap[r.group] ?? 0 };
  });
  return {
    actor,
    editable: actor.isOwner,
    left: LEFT.map(s => _tile(actor, state, s)),
    right: RIGHT.map(s => _tile(actor, state, s)),
    racks,
    ground: _groundList?.(actor) ?? null
  };
}

/* -------------------------------------------- */
/*  Ziemia obok (P4 wpina się przez rejestr)     */
/* -------------------------------------------- */

/** @type {((actor: Actor) => Array<{id, name, img, distance, pick: Function}>|null)|null} */
let _groundList = null;

/** `ground-items.mjs` podaje listę „Na ziemi obok" i odświeża panele, gdy się zmieni. */
export function registerGroundList(fn) {
  _groundList = fn;
}

/* -------------------------------------------- */
/*  HTML                                         */
/* -------------------------------------------- */

function _tileHtml(t, editable, { side = null } = {}) {
  const cls = ["neuro-doll-slot", `is-${t.group}`];
  const anchor = side ? ` data-anchor="${t.group === "hand" ? t.slot : t.group}" data-side="${side}"` : "";
  if (t.item) {
    cls.push("is-filled");
    const tip = `<section class="loading" data-uuid="${t.item.uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>`;
    const stack = t.item.reserve > 0 && t.group !== "hand";
    const split = stack ? ` (w plecaku jeszcze ${t.item.reserve} szt.)` : "";
    return `<div class="${cls.join(" ")}" data-slot="${t.slot}" data-item-id="${t.item.id}"${anchor}
        role="button" tabindex="0" ${editable ? `draggable="true"` : ""} aria-label="${_esc(`${t.label}: ${t.item.name}${split}`)}"
        data-tooltip='${tip}' data-tooltip-class="dnd5e2 dnd5e-tooltip item-tooltip themed theme-light" data-tooltip-direction="LEFT">
        <img src="${_esc(t.item.img)}" alt="" inert>
        ${stack ? `<span class="neuro-doll-stack" inert><i class="fas fa-backpack" inert></i>${t.item.reserve}</span>` : ""}
        ${t.item.caption ? `<span class="neuro-doll-caption" inert>${_esc(t.item.caption)}</span>` : ""}
        ${t.group === "hand" ? `<span class="neuro-doll-hand" inert>${HAND_SHORT[parseSlot(t.slot).index]}</span>` : ""}
        ${editable ? `<span class="neuro-doll-remove" data-tooltip="Zdejmij"><i class="fas fa-xmark" inert></i></span>` : ""}
      </div>`;
  }
  if (t.occupant) {
    cls.push("is-occupied");
    return `<div class="${cls.join(" ")}" data-slot="${t.slot}"${anchor} data-tooltip="${_esc(`${t.label} — ${t.occupant.label}`)}">
        <i class="fas fa-hand-fist" inert></i>
        <span class="neuro-doll-caption" inert>${_esc(t.occupant.label.replace(/^trzyma:\s*/i, ""))}</span>
        ${editable ? `<span class="neuro-doll-remove is-release" data-tooltip="Puść"><i class="fas fa-xmark" inert></i></span>` : ""}
      </div>`;
  }
  if (t.blockedBy) {
    cls.push("is-blocked");
    return `<div class="${cls.join(" ")}" data-slot="${t.slot}"${anchor}
        data-tooltip="${_esc(`${t.label} — zajęte przez: ${t.blockedBy.name}`)}">
        <i class="fas fa-lock" inert></i></div>`;
  }
  cls.push("is-empty");
  if (t.ghost) cls.push("has-ghost");
  const tip = t.ghost
    ? `${t.label} — wolna. ${t.ghost.name} można chwycić oburącz; położenie tu czegokolwiek zabiera tę możliwość.`
    : `${t.label} — wolne. Przeciągnij tu przedmiot z Ekwipunku albo Zasobów.`;
  return `<div class="${cls.join(" ")}" data-slot="${t.slot}"${anchor} data-tooltip="${_esc(tip)}">
      ${t.ghost ? `<img class="neuro-doll-ghost" src="${_esc(t.ghost.img)}" alt="" inert>` : `<i class="fas ${t.icon}" inert></i>`}
    </div>`;
}

function _columnHtml(tiles, side, editable) {
  return tiles.map(t => `<div class="neuro-doll-cell is-${t.group}">
      <span class="neuro-doll-label">${_esc(t.label)}</span>
      ${_tileHtml(t, editable, { side })}
    </div>`).join("");
}

function _groundHtml(list, editable) {
  if (!list) return "";
  const rows = list.length
    ? list.map(g => `<li class="neuro-doll-ground-item" data-ground-id="${_esc(g.id)}" data-tooltip="${_esc(g.tooltip ?? g.name)}">
        <img src="${_esc(g.img)}" alt="" inert>
        <span class="neuro-doll-ground-name">${_esc(g.name)}</span>
        <span class="neuro-doll-ground-dist">${_esc(g.distance)}</span>
        ${editable ? `<button type="button" class="neuro-doll-pick" data-ground-id="${_esc(g.id)}">Podnieś [I]</button>` : ""}
      </li>`).join("")
    : `<li class="neuro-doll-ground-none">Nic w zasięgu 1,5 m.</li>`;
  return `<section class="neuro-doll-ground">
      <h3 class="neuro-doll-legend"><i class="fas fa-arrow-down-to-line" inert></i><span>Na ziemi obok</span></h3>
      <ul class="unlist">${rows}</ul>
    </section>`;
}

function _html(vm) {
  const racks = vm.racks.map(r => `<div class="neuro-doll-rack" data-group="${r.group}" data-anchor="${r.anchor}">
      <div class="neuro-doll-rack-label" data-tooltip="${_esc(_rackTip(r))}">
        <span class="neuro-doll-rack-title">${r.label}</span><span class="neuro-doll-rack-count">${r.used}/${r.cap}</span>
      </div>
      <div class="neuro-doll-rack-slots">${r.slots.map(t => _tileHtml(t, vm.editable)).join("")}</div>
    </div>`).join("");
  return `<div class="neuro-doll${vm.editable ? "" : " is-readonly"}">
    <section class="neuro-doll-body">
      <h3 class="neuro-doll-legend"><i class="fas fa-person" inert></i><span>Oporządzenie</span></h3>
      <svg class="neuro-doll-lines" aria-hidden="true"></svg>
      <div class="neuro-doll-col is-left">${_columnHtml(vm.left, "left", vm.editable)}</div>
      <div class="neuro-doll-figure"><div class="neuro-doll-mannequin" style="--neuro-doll-mask: url('${foundry.utils.getRoute(MANNEQUIN_SRC)}')"></div></div>
      <div class="neuro-doll-col is-right">${_columnHtml(vm.right, "right", vm.editable)}</div>
    </section>
    <section class="neuro-doll-racks">${racks}</section>
    ${_groundHtml(vm.ground, vm.editable)}
  </div>`;
}

function _rackTip(r) {
  if (r.group === "belt") return `Przedmioty podręczne ${r.used}/${r.cap}: wyciągnięcie to Darmowa Interakcja [I], użycie — Używanie.`;
  if (r.group === "melee") return `Broń biała pod ręką ${r.used}/${r.cap} (RAW: 4). Dobycie i schowanie — [I].`;
  return `Broń dystansowa pod ręką ${r.used}/${r.cap} (RAW: 3). Dobycie i schowanie — [I].`;
}

/* -------------------------------------------- */
/*  Linie                                        */
/* -------------------------------------------- */

/** Prostokąt obrazka manekina wewnątrz pudełka z `mask-size: contain`. */
function _imageRect(box) {
  const w = box.width, h = box.height;
  if (w / h > MANNEQUIN_ASPECT) {
    const iw = h * MANNEQUIN_ASPECT;
    return { left: box.left + (w - iw) / 2, top: box.top, width: iw, height: h };
  }
  const ih = w / MANNEQUIN_ASPECT;
  return { left: box.left, top: box.top + (h - ih) / 2, width: w, height: ih };
}

/**
 * Góry komórek kolumny: każda chce stać na wysokości swojego punktu na manekinie (`desired`),
 * kolejność zostaje, komórki się nie nakładają (`gap`), całość mieści się w `[min, max]`.
 * Najmniejsze kwadraty odchyleń przy tych warunkach — regresja izotoniczna (PAVA) na
 * „pożądana góra − przesunięcie w stosie". Czysta funkcja (testy w Node).
 * @param {number[]} desired  pożądane góry komórek, w kolejności z góry na dół
 * @param {number[]} sizes    wysokości komórek
 * @param {number} gap
 * @param {number} min
 * @param {number} max        dół kolumny
 * @returns {number[]}
 */
export function spreadCells(desired, sizes, gap, min, max) {
  const off = [];
  let acc = 0;
  for (const s of sizes) { off.push(acc); acc += s + gap; }
  const total = Math.max(0, acc - gap);
  const blocks = [];
  desired.forEach((d, i) => {
    blocks.push({ sum: d - off[i], n: 1 });
    while (blocks.length > 1) {
      const b = blocks.at(-1), a = blocks.at(-2);
      if (a.sum / a.n <= b.sum / b.n) break;
      blocks.pop();
      a.sum += b.sum;
      a.n += b.n;
    }
  });
  const hi = Math.max(min, max - total);
  return blocks
    .flatMap(b => Array(b.n).fill(Math.min(hi, Math.max(min, b.sum / b.n))))
    .map((v, i) => v + off[i]);
}

/** Komórki kolumn na wysokości swoich części ciała (bez JS zostaje równy rozkład z CSS). */
function _layoutColumns(root) {
  const fig = root.querySelector(".neuro-doll-mannequin");
  if (!fig) return;
  const img = _imageRect(fig.getBoundingClientRect());
  if (!img.height) return;
  for (const col of root.querySelectorAll(".neuro-doll-col")) {
    const cells = [...col.querySelectorAll(":scope > .neuro-doll-cell")];
    const c = col.getBoundingClientRect();
    if (!c.height || !cells.length) continue;
    const sizes = [];
    const desired = [];
    for (const cell of cells) {
      // `offset*`, nie prostokąty: kafelek może właśnie jechać w animacji FLIP (transform).
      const tile = cell.querySelector("[data-anchor]");
      const a = DOLL_ANCHORS[tile?.dataset.anchor];
      sizes.push(cell.offsetHeight);
      const mid = cell.offsetHeight - (tile?.offsetHeight ?? 0) / 2; // podpis nad kafelkiem
      desired.push(a ? img.top + a.y * img.height - c.top - mid : 0);
    }
    const tops = spreadCells(desired, sizes, CELL_GAP, 0, col.clientHeight);
    cells.forEach((cell, i) => { cell.style.top = `${Math.round(tops[i])}px`; });
    col.classList.add("is-placed");
  }
}

function _drawLines(root) {
  const body = root.querySelector(".neuro-doll-body");
  const svg = root.querySelector(".neuro-doll-lines");
  const fig = root.querySelector(".neuro-doll-mannequin");
  if (!body || !svg || !fig) return;
  const b = body.getBoundingClientRect();
  if (!b.width) return;
  _layoutColumns(root);
  const img = _imageRect(fig.getBoundingClientRect());
  const at = key => {
    const a = DOLL_ANCHORS[key];
    return a ? { x: img.left + a.x * img.width - b.left, y: img.top + a.y * img.height - b.top } : null;
  };
  const parts = [];
  for (const tile of root.querySelectorAll(".neuro-doll-body [data-anchor]")) {
    const end = at(tile.dataset.anchor);
    if (!end) continue;
    const r = tile.getBoundingClientRect();
    const right = tile.dataset.side === "left";
    const x0 = (right ? r.right : r.left) - b.left;
    const y0 = r.top + r.height / 2 - b.top;
    const x1 = x0 + (right ? 6 : -6);
    const cls = tile.dataset.anchor.startsWith("hand") ? ` class="is-hand"` : "";
    parts.push(`<polyline${cls} points="${x0},${y0} ${x1},${y0} ${end.x},${end.y}" />`,
      `<circle${cls} cx="${end.x}" cy="${end.y}" r="2" />`);
  }
  // Pas, pochwy i kabury mają punkty w `doll-anchors.mjs`, ale bez linii: z rzędów pod figurą
  // linia przecinałaby kolumnę rąk. Rzędy są podpisane wprost.
  svg.setAttribute("viewBox", `0 0 ${b.width} ${root.getBoundingClientRect().bottom - b.top}`);
  svg.style.height = `${root.getBoundingClientRect().bottom - b.top}px`;
  svg.innerHTML = parts.join("");
}

/* -------------------------------------------- */
/*  FLIP                                         */
/* -------------------------------------------- */

/** Prostokąty kafelków przed zapisem: `itemId → [{slot, rect, node}]`. */
function _captureTiles(root) {
  const map = new Map();
  for (const el of root.querySelectorAll(".neuro-doll-slot.is-filled[data-item-id]")) {
    const list = map.get(el.dataset.itemId) ?? [];
    list.push({ slot: el.dataset.slot, rect: el.getBoundingClientRect(), node: el });
    map.set(el.dataset.itemId, list);
  }
  return map;
}

/**
 * Animacja po przerysowaniu: kafelek, który się przesunął, jedzie z dawnego miejsca; nowy
 * wjeżdża (skala); ten, który zniknął z lalki, wyjeżdża jako duch (klon w starym miejscu).
 */
/** Okno, w którym element jest teraz (karta może być odłączona do osobnego okna — v14). */
function _winOf(el) {
  return el?.ownerDocument?.defaultView ?? window;
}

function _playFlip(root, before) {
  // Bez bramki `prefers-reduced-motion`, jak animacje okien rdzenia (zwijanie karty też jej nie
  // sprawdza): krótki ruch, który mówi, dokąd poszedł przedmiot. Windows z wyłączonymi efektami
  // animacji zgłasza `reduce` i panel stał wtedy jako jedyny nieruchomy (MG, 2026-10-03).
  if (!before?.size || !root.animate) return;
  const left = new Map([...before].map(([k, v]) => [k, [...v]]));
  const after = [...root.querySelectorAll(".neuro-doll-slot.is-filled[data-item-id]")];
  // Najpierw sztuki, które zostały na swoim slocie — nie ruszają się.
  const pending = [];
  for (const el of after) {
    const list = left.get(el.dataset.itemId);
    const k = list?.findIndex(x => x.slot === el.dataset.slot) ?? -1;
    if (k >= 0) list.splice(k, 1);
    else pending.push(el);
  }
  for (const el of pending) {
    const prev = left.get(el.dataset.itemId)?.shift();
    if (prev) {
      const now = el.getBoundingClientRect();
      const dx = prev.rect.left - now.left, dy = prev.rect.top - now.top;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)" });
    } else {
      el.animate([{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 220, easing: "ease-out" });
    }
  }
  // Duchy wypchniętych.
  for (const list of left.values()) {
    for (const { rect, node } of list) {
      const ghost = node.cloneNode(true);
      ghost.classList.add("neuro-doll-ghost-out");
      Object.assign(ghost.style, {
        position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
        height: `${rect.height}px`, margin: "0", zIndex: String((Number(root.style.zIndex) || 100) + 1), pointerEvents: "none"
      });
      root.ownerDocument.body.appendChild(ghost);
      ghost.animate([{ transform: "translate(0,0)", opacity: 0.9 }, { transform: "translate(0, 28px) scale(0.8)", opacity: 0 }],
        { duration: 340, easing: "ease-in" }).finished.finally(() => ghost.remove());
    }
  }
}

/* -------------------------------------------- */
/*  Panel                                        */
/* -------------------------------------------- */

let _PanelClass = null;

function _panelClass() {
  if (_PanelClass) return _PanelClass;
  const { ApplicationV2 } = foundry.applications.api;

  _PanelClass = class DollPanel extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      classes: ["dnd5e2", "neuro-doll-panel"],
      window: { frame: false, positioned: true },
      position: { width: PANEL_WIDTH, height: "auto" }
    };

    constructor(sheet) {
      super({ id: `neuro-doll-${sheet.id}` });
      this.sheet = sheet;
      this._flipBefore = null;
      this._resizeObs = null;
    }

    get actor() {
      return this.sheet.document;
    }

    async _prepareContext() {
      return _viewModel(this.actor);
    }

    async _renderHTML(context) {
      return _html(context);
    }

    _replaceHTML(result, content) {
      this._flipBefore = content.isConnected ? _captureTiles(content) : null;
      const tpl = content.ownerDocument.createElement("template");
      tpl.innerHTML = result;
      content.replaceChildren(...tpl.content.childNodes);
    }

    _onFirstRender(context, options) {
      super._onFirstRender?.(context, options);
      _bindPanel(this);
    }

    _onRender(context, options) {
      super._onRender?.(context, options);
      this._syncTheme();
      this._observe();
      this.dock();
      _drawLines(this.element);
      _applyHintTo(this);
      // Drugie przejście w następnej klatce (fonty, obraz maski) — w oknie, w którym panel jest.
      _winOf(this.element).requestAnimationFrame(() => {
        _drawLines(this.element);
        _playFlip(this.element, this._flipBefore);
        this._flipBefore = null;
      });
    }

    /**
     * Obserwator rozmiaru z okna, w którym panel jest teraz. Po odłączeniu karty panel jedzie za
     * nią do osobnego okna; obserwator i klatki animacji z głównego okna przestają tam tykać,
     * gdy główne okno jest w tle.
     */
    _observe() {
      const win = _winOf(this.element);
      if (this._resizeObs && this._resizeWin === win) return;
      this._resizeObs?.disconnect();
      this._resizeWin = win;
      this._resizeObs = new win.ResizeObserver(() => _drawLines(this.element));
      this._resizeObs.observe(this.element);
    }

    _onClose(options) {
      super._onClose?.(options);
      this._resizeObs?.disconnect();
      if (_panels.get(this.sheet.id) === this) _panels.delete(this.sheet.id);
    }

    /** Wysunięcie spod krawędzi karty (jak szuflada). */
    animateIn() {
      const el = this.element;
      if (!el?.animate || el.hidden) return;
      el.animate(this._slideFrames().reverse(), { duration: 220, easing: "cubic-bezier(.2,.7,.2,1)" });
    }

    /**
     * Schowanie: `"slide"` — z powrotem pod kartę (przełącznik), `"roll"` — zwinięcie w górę
     * razem z zamykaną kartą (rdzeń zwija okna, animując `max-height` przez 0,25 s).
     */
    async animateOut(kind = "slide") {
      const el = this.element;
      if (!el?.animate || el.hidden) return;
      const roll = kind === "roll";
      const frames = roll ? [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }] : this._slideFrames();
      const anim = el.animate(frames, { duration: roll ? 250 : 180, easing: roll ? "ease-out" : "ease-in", fill: "forwards" });
      try { await anim.finished; } catch (_e) { /* przerwana */ }
    }

    _slideFrames() {
      const right = this.element.classList.contains("is-right");
      return [
        { clipPath: "inset(0 0 0 0)", transform: "translateX(0)", opacity: 1 },
        { clipPath: right ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)", transform: `translateX(${right ? -14 : 14}px)`, opacity: 0.35 }
      ];
    }

    /** Klasy motywu karty — zmienne dnd5e rozwiązują się pod `.dnd5e2` z motywem. */
    _syncTheme() {
      const src = this.sheet.element;
      const el = this.element;
      if (!src || !el) return;
      for (const c of ["themed", "theme-dark", "theme-light"]) el.classList.toggle(c, src.classList.contains(c));
    }

    /**
     * Przyklejenie do karty: ta sama góra i wysokość, lewa krawędź (prawa, gdy brak miejsca).
     * Na wąskim ekranie (1366 px), gdy nie mieści się z żadnej strony, przy otwarciu przesuwamy
     * kartę w prawo — raz, nie przy każdym ruchu, żeby nie walczyć z przeciąganiem karty.
     * Karta odłączona do osobnego okna: okno poszerza się o panel, karta odsuwa w prawo
     * (`_makeRoom`), panel staje przy lewej krawędzi okna.
     */
    dock({ nudge = false } = {}) {
      const sheetEl = this.sheet.element;
      if (!sheetEl || !this.element) return;
      if (this.sheet.minimized) { this.element.hidden = true; return; }
      this.element.hidden = false;
      const doc = sheetEl.ownerDocument;
      const r = sheetEl.getBoundingClientRect();
      if (doc !== document) {
        if (r.left < PANEL_WIDTH + GAP) _makeRoom(this.sheet);
        this.element.classList.remove("is-right");
        this.setPosition({ left: Math.max(0, r.left - PANEL_WIDTH - GAP), top: r.top, width: PANEL_WIDTH, height: r.height });
        return;
      }
      const vw = doc.documentElement.clientWidth;
      let left = r.left - PANEL_WIDTH - GAP;
      const fitsRight = r.right + GAP + PANEL_WIDTH <= vw;
      if (left < 0 && !fitsRight && nudge && r.width + PANEL_WIDTH + GAP <= vw) {
        this.sheet.setPosition({ left: PANEL_WIDTH + GAP });
        return;
      }
      if (left < 0) left = fitsRight ? r.right + GAP : 0;
      this.element.classList.toggle("is-right", left > r.left);
      this.setPosition({ left, top: r.top, width: PANEL_WIDTH, height: r.height });
      this.syncZ();
    }

    syncZ() {
      const z = this.sheet.element?.style.zIndex;
      if (z && this.element) this.element.style.zIndex = z;
    }
  };
  return _PanelClass;
}

/* -------------------------------------------- */
/*  Gesty                                        */
/* -------------------------------------------- */

function _bindPanel(panel) {
  const el = panel.element;
  const actor = () => panel.actor;
  const itemAt = node => actor().items.get(node?.closest?.("[data-item-id]")?.dataset.itemId);
  const slotAt = node => node?.closest?.("[data-slot]")?.dataset.slot ?? null;

  // Panel nad kartą: wciśnięcie podnosi kartę (a karta panel).
  el.addEventListener("pointerdown", () => panel.sheet.bringToFront(), { capture: true });

  el.addEventListener("click", async ev => {
    const pick = ev.target.closest(".neuro-doll-pick");
    if (pick) { ev.preventDefault(); return _groundPick?.(actor(), pick.dataset.groundId); }
    const tile = ev.target.closest(".neuro-doll-slot");
    if (!tile || !actor().isOwner) return;
    ev.preventDefault();
    ev.stopPropagation();
    const slot = tile.dataset.slot;
    if (ev.target.closest(".neuro-doll-remove.is-release")) return releaseHand(actor(), slot);
    const item = itemAt(tile);
    if (!item) return;
    if (ev.target.closest(".neuro-doll-remove")) return takeOff(actor(), item, { from: slot });
    if (ev.shiftKey) return item.sheet.render(true);
    return primaryAction(actor(), item, slot, ev);
  });

  el.addEventListener("keydown", ev => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const tile = ev.target.closest(".neuro-doll-slot.is-filled");
    const item = itemAt(tile);
    if (!item) return;
    ev.preventDefault();
    primaryAction(actor(), item, tile.dataset.slot, ev);
  });

  el.addEventListener("dragstart", ev => {
    const tile = ev.target.closest(".neuro-doll-slot.is-filled");
    const item = itemAt(tile);
    if (!item) return;
    _tileDrag = { actorUuid: actor().uuid, slot: tile.dataset.slot };
    // Standardowy ładunek `Item` (pasek skrótów robi z niego makro przedmiotu, inny aktor — kopię)
    // plus nasz znacznik: na tej karcie i tej lalce przestawia albo zdejmuje.
    ev.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item", uuid: item.uuid, neuroshima: { fromSlot: tile.dataset.slot, actorUuid: actor().uuid }
    }));
    ev.dataTransfer.effectAllowed = "copyMove";
    tile.classList.add("is-dragging");
    el.classList.add("is-dragging");
    game.tooltip?.deactivate?.();
  });

  el.addEventListener("dragend", () => {
    _tileDrag = null;
    el.classList.remove("is-dragging");
    el.querySelectorAll(".is-dragging, .is-drop-target").forEach(n => n.classList.remove("is-dragging", "is-drop-target"));
  });

  el.addEventListener("dragover", ev => {
    const target = ev.target.closest(".neuro-doll-slot, .neuro-doll-rack");
    if (!target) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = _tileDrag ? "move" : "copy";
    el.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
    target.classList.add("is-drop-target");
  });

  el.addEventListener("dragleave", ev => {
    if (el.contains(ev.relatedTarget)) return;
    el.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
  });

  el.addEventListener("drop", async ev => {
    const zone = ev.target.closest(".neuro-doll-slot, .neuro-doll-rack");
    el.querySelectorAll(".is-drop-target").forEach(n => n.classList.remove("is-drop-target"));
    if (!zone) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (!actor().isOwner) return;
    const data = _dragData(ev);
    if (data?.type !== "Item" || !data.uuid) return;
    const item = await fromUuid(data.uuid);
    if (!item) return;
    if (item.parent !== actor()) {
      ui.notifications.warn(`${item.name}: najpierw przenieś przedmiot do ekwipunku ${actor().name}, dopiero potem tutaj.`);
      return;
    }
    const to = zone.dataset.slot ?? zone.dataset.group;
    const sameDoll = data.neuroshima?.actorUuid === actor().uuid;
    const from = sameDoll ? (data.neuroshima.fromSlot ?? (data.neuroshima.beltFrom != null ? slotId("belt", data.neuroshima.beltFrom) : undefined)) : undefined;
    if (from && from === to) return;
    return place(actor(), item, to, { from });
  });

  const ContextMenu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
  new ContextMenu(el, ".neuro-doll-slot.is-filled", _menuItems(panel), { jQuery: false, fixed: true });
}

/** Klik w kafelek — główne działanie (§6): z kabury dobądź, z ręki atak, noszone — użycie. */
export async function primaryAction(actor, item, slot, event = null) {
  const group = groupOf(slot);
  if (group === "belt") return handyUse(item, { slot: parseSlot(slot).index, event });
  if (tierOf(slot) === "stowed") return draw(item, { from: slot });
  const activities = [...(item.system?.activities?.values?.() ?? [])];
  if (activities.length || item.type === "weapon") return item.use({ event });
  return item.sheet.render(true);
}

/** PPM na kafelku: jawne cele (§7). */
function _menuItems(panel) {
  const actor = () => panel.actor;
  const ctx = el => {
    const item = actor().items.get(el.closest("[data-item-id]")?.dataset.itemId);
    return { item, slot: el.closest("[data-slot]")?.dataset.slot, family: item ? familyOf(item) : null };
  };
  const to = (target, opts = {}) => el => {
    const { item, slot } = ctx(el);
    if (item) place(actor(), item, target, { from: slot, ...opts });
  };
  const canGo = group => el => {
    const { family, slot } = ctx(el);
    return !!family && accepts(family, group) && groupOf(slot) !== group;
  };
  return [
    { name: "Do prawej ręki", icon: '<i class="fas fa-hand"></i>', condition: el => canGo("hand")(el) || (ctx(el).slot === "hand.1"),
      callback: to("hand.0") },
    { name: "Do lewej ręki", icon: '<i class="fas fa-hand"></i>', condition: el => canGo("hand")(el) || (ctx(el).slot === "hand.0"),
      callback: to("hand.1") },
    { name: "Do pochwy", icon: '<i class="fas fa-dagger"></i>', condition: canGo("melee"), callback: to("melee") },
    { name: "Do kabury", icon: '<i class="fas fa-gun"></i>', condition: canGo("ranged"), callback: to("ranged") },
    { name: "Na Ramię", icon: '<i class="fas fa-flashlight"></i>', condition: canGo("shoulder"), callback: to("shoulder") },
    { name: "Na Głowę", icon: '<i class="fas fa-glasses"></i>', condition: canGo("headGear"), callback: to("headGear") },
    { name: "Upuść", icon: '<i class="fas fa-arrow-down-to-line"></i>',
      condition: el => isDollActor(actor()) && ctx(el).family !== "belt",
      callback: el => { const { item, slot } = ctx(el); if (item) drop(actor(), item, { from: slot }); } },
    { name: "Do plecaka", icon: '<i class="fas fa-boxes-packing"></i>', callback: to("pack") },
    { name: "Otwórz kartę", icon: '<i class="fas fa-file-lines"></i>', callback: el => ctx(el).item?.sheet.render(true) }
  ];
}

/* -------------------------------------------- */
/*  Podpowiedź upuszczenia                       */
/* -------------------------------------------- */

/**
 * Podczas przeciągania przedmiotu postaci (z Ekwipunku, z pasa, z kafelka) jej otwarty panel
 * podświetla sloty, które go przyjmą, a resztę przygasza. Tylko podpowiedź — upuszczenie
 * rozstrzyga lejek jak zawsze.
 *
 * Najważniejsze jest sprzątanie. `dragend` nie dochodzi do dokumentu, gdy źródło przeciągania
 * zniknęło w trakcie (karta przerysowała wiersz) albo gdy przeciąganie anulowano poza oknem.
 * Dlatego gaśnie na: `dragend`, `drop` (gdziekolwiek), pierwszy ruch myszy, kliknięcie albo Esc
 * po przeciąganiu (podczas przeciągania przeglądarka nie wysyła zdarzeń myszy), oraz po 1,5 s
 * bez zdarzeń `drag`/`dragover` (strażnik). Słuchacze siedzą w głównym oknie i w każdym oknie
 * odłączonym (`openDetachedWindow`).
 *
 * @type {{actorUuid: string, family: string, fromSlot: string|null, at: number}|null}
 */
let _hint = null;
let _hintTimer = null;
const HINT_IDLE_MS = 1500;

function _applyHintTo(panel) {
  const el = panel?.element;
  if (!el) return;
  const on = !!_hint && panel.actor?.uuid === _hint.actorUuid;
  el.classList.toggle("is-drag-hint", on);
  for (const n of el.querySelectorAll(".neuro-doll-slot[data-slot]")) {
    n.classList.toggle("is-drop-ok", on && n.dataset.slot !== _hint.fromSlot && accepts(_hint.family, groupOf(n.dataset.slot)));
  }
  for (const r of el.querySelectorAll(".neuro-doll-rack[data-group]")) {
    r.classList.toggle("is-drop-ok", on && accepts(_hint.family, r.dataset.group));
  }
}

function _armHintTimer() {
  clearTimeout(_hintTimer);
  _hintTimer = setTimeout(_endDrag, HINT_IDLE_MS);
}

function _clearHint() {
  clearTimeout(_hintTimer);
  _hintTimer = null;
  if (!_hint) return;
  _hint = null;
  for (const panel of _panels.values()) _applyHintTo(panel);
}

/** Koniec każdego przeciągania — podpowiedź i znacznik kafelka gasną zawsze, bez wyjątków. */
function _endDrag() {
  const had = !!_hint || !!_tileDrag;
  _clearHint();
  _tileDrag = null;
  if (!had) return;
  for (const panel of _panels.values()) {
    panel.element?.classList.remove("is-dragging");
    panel.element?.querySelectorAll(".is-dragging, .is-drop-target").forEach(n => n.classList.remove("is-dragging", "is-drop-target"));
    // Pas w nagłówku karty ma ten sam problem z zagubionym `dragend` (`handy-belt.mjs`).
    panel.sheet?.element?.querySelectorAll(".neuro-belt .is-dragging, .neuro-belt .is-drop-target")
      .forEach(n => n.classList.remove("is-dragging", "is-drop-target"));
  }
}

function _onDragStartHint(ev) {
  _clearHint();
  if (!_panels.size) return;
  let data = null;
  try { data = JSON.parse(ev.dataTransfer?.getData("text/plain") || "null"); } catch (_e) { data = null; }
  if (data?.type !== "Item" || !data.uuid) return;
  let item = null;
  try { item = fromUuidSync(data.uuid); } catch (_e) { item = null; }
  const actor = item?.parent;
  if (actor?.documentName !== "Actor" || !isDollActor(actor)) return;
  const family = familyOf(item);
  if (!family) return;
  _hint = { actorUuid: actor.uuid, family, fromSlot: data.neuroshima?.fromSlot ?? null, at: Date.now() };
  for (const panel of _panels.values()) _applyHintTo(panel);
  _armHintTimer();
}

function _bindHintListeners(doc) {
  if (!doc || doc._neuroDollHint) return;
  doc._neuroDollHint = true;
  // Bąbelkowanie: dnd5e i panel wpisują dane w `dragstart` na elemencie, my czytamy po nich.
  doc.addEventListener("dragstart", _onDragStartHint);
  const alive = () => { if (_hint) _armHintTimer(); };
  doc.addEventListener("drag", alive, { capture: true, passive: true });
  doc.addEventListener("dragover", alive, { capture: true, passive: true });
  doc.addEventListener("dragend", _endDrag, { capture: true });
  doc.addEventListener("drop", () => setTimeout(_endDrag, 0), { capture: true });
  // Zdarzenia myszy nie przychodzą w trakcie przeciągania — jeśli przyszło, przeciąganie minęło.
  const after = () => { if (_hint && Date.now() - _hint.at > 150) _endDrag(); };
  doc.addEventListener("pointermove", after, { capture: true, passive: true });
  doc.addEventListener("pointerdown", after, { capture: true, passive: true });
  doc.addEventListener("keydown", ev => { if (ev.key === "Escape") _endDrag(); }, { capture: true });
}

/* -------------------------------------------- */
/*  Ziemia — podnoszenie (P4)                    */
/* -------------------------------------------- */

/** @type {((actor: Actor, groundId: string) => Promise)|null} */
let _groundPick = null;

export function registerGroundPick(fn) {
  _groundPick = fn;
}

/* -------------------------------------------- */
/*  Karta: przycisk, dokowanie, odświeżanie      */
/* -------------------------------------------- */

function _isOpenFor(actor) {
  return !!game.user.getFlag(MODULE_ID, OPEN_FLAG)?.[actor.id];
}

async function _rememberOpen(actor, open) {
  if (!actor?.id) return;
  const key = `flags.${MODULE_ID}.${OPEN_FLAG}.${open ? "" : "-="}${actor.id}`;
  await game.user.update({ [key]: open ? true : null });
}

export function panelFor(sheet) {
  return _panels.get(sheet?.id) ?? null;
}

export async function openDoll(sheet, { remember = true, animate = true } = {}) {
  if (!sheet?.rendered || !isDollActor(sheet.document)) return null;
  await _closing.get(sheet.id); // klik w trakcie chowania — najpierw niech się schowa
  let panel = _panels.get(sheet.id);
  const fresh = !panel?.rendered;
  if (!panel) {
    const Panel = _panelClass();
    panel = new Panel(sheet);
    _panels.set(sheet.id, panel);
  }
  // Dziecko karty (v14 `renderChild`): to samo okno co karta, a po „Odłącz" i „Przyłącz"
  // panel jedzie za nią sam — bez tego zostawał w głównym oknie.
  if (typeof sheet.renderChild === "function") await sheet.renderChild(panel);
  else await panel.render({ force: true });
  panel.dock({ nudge: true });
  if (fresh && animate) panel.animateIn();
  _syncTab(sheet);
  if (remember) await _rememberOpen(sheet.document, true);
  return panel;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.remember]       zapisać stan w fladze użytkownika
 * @param {"slide"|false} [options.animate]  schowanie pod kartę (przełącznik); `false` — od razu
 */
export async function closeDoll(sheet, { remember = true, animate = "slide" } = {}) {
  const panel = _panels.get(sheet?.id);
  _panels.delete(sheet?.id);
  if (panel) {
    const done = (async () => {
      if (animate) await panel.animateOut(animate);
      await panel.close({ animate: false });
    })();
    _closing.set(sheet.id, done);
    try { await done; } finally { if (_closing.get(sheet.id) === done) _closing.delete(sheet.id); }
  }
  if (sheet?.rendered) {
    _syncTab(sheet);
    _giveBackRoom(sheet);
  }
  if (remember && sheet?.document) await _rememberOpen(sheet.document, false);
}

/* -------------------------------------------- */
/*  Okno odłączone (v14)                         */
/* -------------------------------------------- */

const _resizing = new WeakSet();

/** Okno przeglądarki karty, gdy jest odłączona — inaczej `null`. */
function _popupOf(sheet) {
  const win = sheet?.element?.ownerDocument?.defaultView;
  return win && win !== window ? win : null;
}

/** Przesuwa i poszerza okno o `dx` (ujemne — zwęża), czeka na `resize` (max 400 ms). */
function _resizeWindow(win, dx) {
  return new Promise(resolve => {
    let timer = null;
    const done = () => { win.removeEventListener("resize", done); clearTimeout(timer); resolve(); };
    timer = setTimeout(done, 400);
    win.addEventListener("resize", done);
    try {
      win.moveBy(-dx, 0);
      win.resizeBy(dx, 0);
    } catch (_e) { done(); }
  });
}

/**
 * Karta odłączona, panel otwarty: okno rośnie w lewo o szerokość panelu, karta odsuwa się
 * w prawo o tyle samo — na ekranie stoi w miejscu, a panel wchodzi z lewej. Rdzeń (`harness`)
 * rozciąga główną aplikację okna na `innerWidth − left`, więc odsunięcie przeżywa późniejsze
 * zmiany rozmiaru okna.
 */
async function _makeRoom(sheet) {
  const win = _popupOf(sheet);
  if (!win || _resizing.has(sheet)) return;
  const need = PANEL_WIDTH + GAP - (sheet.position.left ?? 0);
  if (need <= 0) return;
  _resizing.add(sheet);
  const width = sheet.position.width;
  try {
    await _resizeWindow(win, need);
    sheet.setPosition({ left: PANEL_WIDTH + GAP, width: Math.min(width, win.innerWidth - PANEL_WIDTH - GAP) });
  } finally {
    _resizing.delete(sheet);
  }
}

/** Panel zamknięty w odłączonym oknie: karta wraca do lewej krawędzi, okno się zwęża. */
async function _giveBackRoom(sheet) {
  const win = _popupOf(sheet);
  const left = sheet.position.left ?? 0;
  if (!win || left < PANEL_WIDTH || _resizing.has(sheet)) return;
  _resizing.add(sheet);
  const width = sheet.position.width;
  try {
    sheet.setPosition({ left: 0 });
    await _resizeWindow(win, -left);
    sheet.setPosition({ left: 0, width: Math.min(width, win.innerWidth) });
  } finally {
    _resizing.delete(sheet);
  }
}

/* -------------------------------------------- */
/*  Przełącznik pod paskiem zakładek             */
/* -------------------------------------------- */

/**
 * Przełącznik „Oporządzenie" pod pionowym paskiem zakładek karty (Ekwipunek, Zasoby…). To nie
 * zakładka — nie zmienia strony karty, tylko wysuwa panel obok — więc stoi poza obrysem paska,
 * jako osobny blok z podpisem w pionie. Pasek dnd5e jest pozycjonowany bezwzględnie przy
 * prawej krawędzi karty, więc przełącznik liczy swoją pozycję od niego.
 */
function _injectTab(sheet) {
  const root = sheet.element;
  const nav = root?.querySelector('nav.tabs[data-group="primary"]');
  if (!nav) return;
  let btn = root.querySelector(".neuro-doll-tab");
  if (!btn) {
    btn = root.ownerDocument.createElement("button");
    btn.type = "button";
    btn.className = "neuro-doll-tab";
    btn.dataset.tooltip = "Oporządzenie — co masz w rękach, w kaburach, przy pasie i na sobie";
    btn.dataset.tooltipDirection = "RIGHT";
    btn.setAttribute("aria-label", "Oporządzenie");
    btn.innerHTML = `<i class="fas fa-person-rifle" inert></i><span class="neuro-doll-tab-label" inert>Oporządzenie</span>`;
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      return panelFor(sheet) ? closeDoll(sheet) : openDoll(sheet);
    });
  }
  if (btn.previousElementSibling !== nav) nav.after(btn);
  const top = nav.offsetTop + nav.offsetHeight + 8;
  Object.assign(btn.style, { top: `${top}px`, left: `${nav.offsetLeft}px`, width: `${nav.offsetWidth}px` });
  btn.classList.toggle("is-compact", (nav.offsetParent?.clientHeight ?? 0) - top < 150);
  _syncTab(sheet);
}

function _syncTab(sheet) {
  const btn = sheet?.element?.querySelector(".neuro-doll-tab");
  if (!btn) return;
  const on = !!panelFor(sheet);
  btn.classList.toggle("is-active", on);
  btn.setAttribute("aria-pressed", String(on));
}

/**
 * Domieszka do podklasy karty postaci (`sheet-shell.mjs`): przełącznik pod paskiem zakładek,
 * dokowanie przy przesuwaniu, warstwy, minimalizacja, zamknięcie, okno odłączone.
 * @param {Function} Base
 */
export function dollSheetMixin(Base) {
  return class extends Base {
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      if (isDollActor(this.document) && _isOpenFor(this.document)) openDoll(this, { remember: false });
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      if (isDollActor(this.document)) _injectTab(this);
    }

    _onPosition(position) {
      super._onPosition(position);
      panelFor(this)?.dock();
    }

    bringToFront() {
      super.bringToFront();
      panelFor(this)?.syncZ();
    }

    async minimize() {
      await super.minimize();
      panelFor(this)?.dock();
    }

    async maximize() {
      await super.maximize();
      panelFor(this)?.dock();
    }

    /** Karta zwija się w górę — panel razem z nią (nie czekamy: obie animacje idą naraz). */
    async _preClose(options) {
      await super._preClose(options);
      if (options?.animate !== false) panelFor(this)?.animateOut("roll");
    }

    _onClose(options) {
      super._onClose(options);
      closeDoll(this, { remember: false, animate: false });
    }
  };
}

/* -------------------------------------------- */
/*  Odświeżanie                                  */
/* -------------------------------------------- */

const _timers = new Map();

/** Przerysowanie paneli aktora (z odbiciem — partia zapisów to jedno przerysowanie). */
export function refreshDoll(actor) {
  for (const panel of _panels.values()) {
    if (panel.actor !== actor && panel.actor?.uuid !== actor?.uuid) continue;
    clearTimeout(_timers.get(panel.id));
    _timers.set(panel.id, setTimeout(() => { _timers.delete(panel.id); if (panel.rendered) panel.render(); }, 40));
  }
}

/** Przerysowanie wszystkich otwartych paneli (lista „Na ziemi obok"). */
export function refreshAllDolls() {
  for (const panel of _panels.values()) refreshDoll(panel.actor);
}

/**
 * Upuszczenie kafelka lalki gdziekolwiek na karcie — zdejmij (§7). Nasłuch w fazie
 * przechwytywania na korzeniu karty, żeby zdążyć przed dnd5e, które potraktowałoby to jako
 * sortowanie (sprawdzone na żywo, §15: zero aktualizacji przedmiotów).
 */
function _bindSheetDropOff(app) {
  const el = app.element;
  if (!el || el.dataset.neuroDollDropOff) return;
  el.dataset.neuroDollDropOff = "1";
  el.addEventListener("dragover", ev => {
    if (_tileDrag && _tileDrag.actorUuid === app.document?.uuid && !ev.target.closest(".neuro-belt")) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    }
  }, { capture: true });
  el.addEventListener("drop", async ev => {
    if (ev.target.closest(".neuro-belt")) return;
    const data = _dragData(ev);
    const from = data?.neuroshima?.fromSlot;
    const actor = app.document;
    if (!from || data.neuroshima.actorUuid !== actor?.uuid) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const item = await fromUuid(data.uuid);
    if (item) await takeOff(actor, item, { from });
  }, { capture: true });
}

export function registerDollPanel() {
  const refresh = doc => {
    const actor = doc?.parent ?? doc;
    if (actor?.documentName === "Actor") refreshDoll(actor);
  };
  Hooks.on("createItem", refresh);
  Hooks.on("updateItem", refresh);
  Hooks.on("deleteItem", refresh);
  Hooks.on("updateActor", (actor, changes) => {
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) refreshDoll(actor);
  });
  Hooks.on("renderCharacterActorSheet", (app) => {
    if (isDollActor(app.document)) _bindSheetDropOff(app);
    const panel = panelFor(app);
    if (panel) { panel._syncTheme(); panel.dock(); }
  });
  _bindHintListeners(document);
  Hooks.on("openDetachedWindow", (_id, win) => _bindHintListeners(win?.document));
  console.log("Neuroshima 5e | Paper doll panel registered");
}

export const __testing = Object.freeze({ _viewModel, _imageRect, spreadCells, LEFT, RIGHT });
