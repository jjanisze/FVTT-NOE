/**
 * NOE — znaczniki komponentów języka wizualnego (PLAN_m9_style.md §4.2).
 *
 * Jeden sygnał — jedna implementacja: koszt akcji, licznik, plakietka stanu, glif ze skosem,
 * tabliczka odczytu i miernik powstają tutaj, a karta, pasek, panel M8, okna i producenci czatu
 * wołają te funkcje zamiast składać własny HTML dla tego samego znaczenia.
 *
 * Funkcje zwracają **tekst HTML** i nie dotykają `game`, `document` ani CSS — działają tak samo
 * w przeglądarce, w szablonie i w Node (makieta `dev/visual/build-components.mjs`).
 * Wygląd: `styles/noe/components.css`. Kolor nigdy sam: każdy sygnał ma kształt, literę albo słowo.
 */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** @param {unknown} text */
export const esc = text => String(text ?? "").replace(/[&<>"']/g, c => ESC[c]);

const attrs = map => Object.entries(map)
  .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== "")
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join("");

const cls = (...names) => names.flat().filter(Boolean).join(" ");

/* -------------------------------------------- */
/*  K7 — znak kosztu                             */
/* -------------------------------------------- */

/** Koszty z figurą. Każdy inny czas (minuta, wyzwalacz) wypisujemy słowem — `cost: "other"`. */
export const COSTS = Object.freeze({
  a: { letter: "A", label: "Akcja" },
  b: { letter: "B", label: "Akcja Bonusowa" },
  r: { letter: "R", label: "Reakcja" },
  i: { letter: "I", label: "Interakcja" }
});

/** dnd5e `activation.type` → koszt NOE. Reszta (minute, hour, special, …) nie ma figury. */
const ACTIVATION_COST = { action: "a", bonus: "b", reaction: "r", interaction: "i" };

/**
 * Koszt aktywności w języku NOE albo `null`, gdy aktywność nie ma prostej litery
 * (wyzwalacz, czas w minutach, brak aktywacji). Pasywności nie wyprowadzamy z braku kosztu.
 * @param {string|null|undefined} activationType
 * @returns {"a"|"b"|"r"|"i"|null}
 */
export function costOf(activationType) {
  return ACTIVATION_COST[activationType] ?? null;
}

/**
 * Znak kosztu: figura w kolorze profilu + litera. Z `count` — pozostałe/pula budżetu tury.
 * @param {"a"|"b"|"r"|"i"|"other"} cost
 * @param {object} [options]
 * @param {string} [options.text]     Tekst dla `other` (np. „1 min”, „wyzwalacz”).
 * @param {string} [options.count]    Np. „0/1” — budżet, nie użycia zasobu.
 * @param {boolean} [options.large]
 * @param {string} [options.title]    Tooltip; domyślnie pełna nazwa kosztu.
 * @returns {string}
 */
export function costSign(cost, { text, count, large = false, title } = {}) {
  const def = COSTS[cost];
  const key = def ? cost : "other";
  const label = def ? def.letter : (text ?? "");
  if (!def && !label) return "";
  const tip = title ?? def?.label ?? label;
  return `<span${attrs({ class: cls("noe-cost", large && "noe-cost--lg"), "data-cost": key, "data-tooltip": tip, "aria-label": count ? `${tip} ${count}` : tip })}>${esc(label)}${count ? `<span class="noe-cost__count">${esc(count)}</span>` : ""}</span>`;
}

/* -------------------------------------------- */
/*  K8 — licznik                                 */
/* -------------------------------------------- */

/**
 * Licznik `pozostałe/pojemność`. Zasób użyć jest niezależny od budżetu A/B/R/I.
 * @param {number|string} value
 * @param {number|string|null} [max]
 * @param {{unit?: string, title?: string}} [options]
 */
export function counter(value, max = null, { unit, title } = {}) {
  const tail = max === null || max === undefined ? "" : `<span class="noe-count__max">/${esc(max)}</span>`;
  return `<span${attrs({ class: "noe-count", "data-tooltip": title })}>${esc(value)}${tail}${unit ? `<span class="noe-count__unit">${esc(unit)}</span>` : ""}</span>`;
}

/* -------------------------------------------- */
/*  K9 — plakietka stanu                         */
/* -------------------------------------------- */

/**
 * Stany plakietki. `on` to działający efekt (niezależny od gotowości kolejnego użycia),
 * `warn` — ostrzeżenie budżetu M8 (nigdy blokada, nigdy skos), `cond` — brak warunku,
 * `ban` — zakaz, `unknown` — brak danych („?”).
 */
export const BADGES = Object.freeze({
  on: { text: "WŁ.", icon: null },
  warn: { text: "Ostrzeżenie", icon: "fa-solid fa-triangle-exclamation" },
  cond: { text: "Warunek", icon: "fa-solid fa-link-slash" },
  ban: { text: "Zakaz", icon: "fa-solid fa-ban" },
  unknown: { text: "Brak danych", icon: null },
  ok: { text: "Gotowe", icon: "fa-solid fa-check" },
  info: { text: "", icon: "fa-solid fa-circle-info" },
  danger: { text: "", icon: "fa-solid fa-circle-exclamation" }
});

/**
 * @param {keyof typeof BADGES} kind
 * @param {string} [text]   Konkretna przyczyna; domyślnie nazwa stanu.
 * @param {{title?: string, icon?: string|null}} [options]
 */
export function badge(kind, text, { title, icon } = {}) {
  const def = BADGES[kind];
  if (!def) throw new Error(`noe.badge: nieznany stan "${kind}"`);
  const glyph = icon === undefined ? def.icon : icon;
  const label = text ?? def.text;
  return `<span${attrs({ class: `noe-badge noe-badge--${kind}`, "data-tooltip": title })}>${glyph ? `<i class="${esc(glyph)}" inert></i>` : ""}${esc(label)}</span>`;
}

/* -------------------------------------------- */
/*  K10 — glif i skos niedostępności             */
/* -------------------------------------------- */

/**
 * Glif w opakowaniu `.noe-glyph`. Skos (`unavailable`) dotyczy niedostępnej *operacji* —
 * nie ostrzeżenia budżetu i nie braku danych. Glif nigdy nie jest przyciemniany.
 * @param {string} src
 * @param {{size?: "row"|"id"|"sm"|"chat", unavailable?: boolean, alt?: string, title?: string}} [options]
 */
export function glyph(src, { size = "row", unavailable = false, alt = "", title } = {}) {
  return `<span${attrs({ class: cls("noe-glyph", size !== "row" && `noe-glyph--${size}`, unavailable && "is-unavailable"), "data-tooltip": title })}><img${attrs({ src, alt, loading: "lazy" })}></span>`;
}

/** Resource rows: dnd5e-icon accepts SVG only; finished rasters use the shared 44 px glyph. */
export function inventoryIcon(src, alt = "", { fill } = {}) {
  if (!/\.svg(?:[?#]|$)/i.test(src ?? "")) return glyph(src, { alt });
  return `<dnd5e-icon${attrs({ src, "aria-label": alt, draggable: "false", class: "item-image gold-icon", style: fill ? `--icon-fill:${fill}` : undefined })}></dnd5e-icon>`;
}

/* -------------------------------------------- */
/*  K3 — tabliczka odczytu                       */
/* -------------------------------------------- */

/**
 * @param {string} label
 * @param {number|string} value
 * @param {{unit?: string, modified?: boolean, title?: string, small?: boolean, attrs?: object}} [options]
 */
export function readout(label, value, { unit, modified = false, title, small = false, attrs: extra = {} } = {}) {
  return `<div${attrs({ class: cls("noe-readout", small && "noe-readout--sm", modified && "is-modified"), "data-tooltip": title, ...extra })}><span class="noe-readout__label">${esc(label)}</span><span class="noe-readout__value">${esc(value)}${unit ? `<span class="noe-readout__unit"> ${esc(unit)}</span>` : ""}</span></div>`;
}

/* -------------------------------------------- */
/*  K11 — miernik                                */
/* -------------------------------------------- */

/**
 * @param {number} value
 * @param {number} max
 * @param {{kind?: "pw"|"kw"|"temp"|null, label?: string, thin?: boolean, title?: string}} [options]
 */
export function meter(value, max, { kind = null, label, thin = false, title } = {}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const text = thin ? "" : `<span class="noe-meter__value">${label ? `${esc(label)} ` : ""}${esc(value)}<span class="noe-count__max">/${esc(max)}</span></span>`;
  // Szerokość wypełnienia to dana, nie styl: zmienna, nie kolor (zapadka dopuszcza wymiary dynamiczne).
  return `<div${attrs({ class: cls("noe-meter", kind && `noe-meter--${kind}`, thin && "noe-meter--thin"), role: "meter", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": value, "aria-label": label, "data-tooltip": title, style: `--noe-meter-pct:${pct.toFixed(1)}%` })}><span class="noe-meter__fill"></span>${text}</div>`;
}

/* -------------------------------------------- */
/*  K6 — wiersz treści                           */
/* -------------------------------------------- */

/**
 * Wiersz: glif · koszty przed nazwą · nazwa i podpis · prawa kolumna (licznik, powód/stan).
 * @param {object} row
 * @param {string} [row.img]
 * @param {string} row.name
 * @param {string} [row.caption]           Rodzaj · źródło.
 * @param {string[]} [row.costs]           Gotowe znaki z `costSign()`.
 * @param {string} [row.count]             Gotowy licznik z `counter()`.
 * @param {string} [row.state]             Gotowa plakietka z `badge()` albo zwykły tekst powodu.
 * @param {boolean} [row.unavailable]      Skos na glifie.
 * @param {boolean} [row.selected]
 * @param {boolean} [row.operation]        Wiersz operacji pod zdolnością mieszaną (bez glifu).
 * @param {object} [row.attrs]
 */
export function row({ img, name, caption, costs = [], count = "", state = "", unavailable = false, selected = false, operation = false, attrs: extra = {} }) {
  const icon = operation || !img ? "" : glyph(img, { unavailable, alt: "" });
  return `<div${attrs({ class: cls("noe-row", operation && "noe-row--op", selected && "is-selected"), ...extra })}>${icon}<div class="noe-row__body"><div class="noe-row__head">${costs.join("")}<span class="noe-row__name">${esc(name)}</span></div>${caption ? `<span class="noe-row__caption">${esc(caption)}</span>` : ""}</div><div class="noe-row__meta">${count}${state}</div></div>`;
}

/* -------------------------------------------- */
/*  K12, K17, K18                                */
/* -------------------------------------------- */

/**
 * @param {string} label
 * @param {{variant?: "primary"|"danger"|null, icon?: string, action?: string, disabled?: boolean, title?: string, attrs?: object, iconOnly?: boolean}} [options]
 */
export function button(label, { variant = null, icon, action, disabled = false, title, attrs: extra = {}, iconOnly = false } = {}) {
  return `<button${attrs({ type: "button", class: cls("noe-btn", variant && `noe-btn--${variant}`, iconOnly && "noe-btn--icon"), "data-action": action, disabled, "data-tooltip": title ?? (iconOnly ? label : undefined), "aria-label": iconOnly ? label : undefined, ...extra })}>${icon ? `<i class="${esc(icon)}" inert></i>` : ""}${iconOnly ? "" : esc(label)}</button>`;
}

/** @param {string} text @param {{icon?: string, attrs?: object}} [options] */
export function emptyState(text, { icon = "fa-solid fa-inbox", attrs: extra = {} } = {}) {
  return `<div${attrs({ class: "noe-empty", ...extra })}><i class="${esc(icon)}" inert></i><span>${esc(text)}</span></div>`;
}

/** @param {string} text @param {{variant?: "muted"|"warn"|"danger"|"ok"|null, title?: string}} [options] */
export function chip(text, { variant = null, title } = {}) {
  return `<span${attrs({ class: cls("noe-chip", variant && `noe-chip--${variant}`), "data-tooltip": title })}>${esc(text)}</span>`;
}

/* -------------------------------------------- */
/*  Zakres                                       */
/* -------------------------------------------- */

/** Klasy zakresu M9: wymuszony ciemny motyw na powierzchni NOE (D12). */
export const SCOPE_CLASSES = Object.freeze(["noe", "themed", "theme-dark"]);

/**
 * Oznacz element jako powierzchnię NOE. `themed theme-dark` sprawia, że rdzeń i dnd5e stosują
 * ciemne zmienne niezależnie od ustawienia interfejsu, a menu kontekstowe dziedziczy motyw.
 * @param {Element|null|undefined} element
 * @returns {Element|null}
 */
export function scope(element) {
  if (!element?.classList) return null;
  element.classList.remove("theme-light");
  element.classList.add(...SCOPE_CLASSES);
  return element;
}

/** HTML → element (tylko przeglądarka). */
export function el(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html).trim();
  return tpl.content.firstElementChild;
}
