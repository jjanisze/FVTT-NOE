/**
 * Neuroshima 5e — karty czatu postoju i handlu (PLAN_m5_postoj.md).
 *
 * Ten sam wygląd co karty produkcji (`neuro-robota-card`), własny atrybut przycisków:
 * `data-neuro-postoj="<akcja>"`. Kliknięcia łapie jeden nasłuch w fazie capture na `document`
 * (ARCHITECTURE §9 — bąbelkowanie na `renderChatLog` potrafi nie dostać kliknięcia); akcje rejestrują
 * moduły M5 przez `zarejestrujAkcje`. Przyciski z `gm: true` znikają graczom przy renderze, z
 * `wlasciciel: true` — temu, kto nie jest właścicielem aktora karty.
 */

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_KARTY = "postojKarta";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** @type {Map<string, (ev: MouseEvent, btn: HTMLElement, message: ChatMessage|null) => any>} */
const AKCJE = new Map();

/** Rejestruje obsługę przycisku `data-neuro-postoj="<akcja>"`. */
export function zarejestrujAkcje(akcja, fn) {
  AKCJE.set(akcja, fn);
}

/**
 * HTML karty.
 * @param {object} o
 * @param {string} [o.ikona]
 * @param {string} o.tytul
 * @param {string} [o.podtytul]
 * @param {"info"|"sukces"|"porazka"|"test"|"praca"|"braki"|"bogaty"} [o.rodzaj]
 * @param {string|null} [o.obraz]          ilustracja u góry (D42) — tylko gdy plik jest
 * @param {string[]} [o.linie]             HTML zaufany (budowany w module)
 * @param {string[]} [o.ostrzezenia]       tekst
 * @param {{akcja: string, label: string, ikona?: string, gm?: boolean, wlasciciel?: boolean, dane?: Record<string, string|number>}[]} [o.przyciski]
 * @param {string} [o.klasa]
 */
export function kartaPostoju({ ikona = null, tytul, podtytul = "", rodzaj = "info", obraz = null, linie = [], ostrzezenia = [], przyciski = [], klasa = "" }) {
  const warn = ostrzezenia.map(t => `<div class="neuro-robota-ostrzezenie"><i class="fa-solid fa-triangle-exclamation" inert></i> ${esc(t)}</div>`).join("");
  const btns = przyciski.map(b => {
    const dane = Object.entries(b.dane ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
    const kto = b.gm ? " neuro-gm-only" : b.wlasciciel ? " neuro-owner-only" : "";
    return `<button type="button" class="neuro-robota-btn${kto}" data-neuro-postoj="${esc(b.akcja)}"${dane}>`
      + `${b.ikona ? `<i class="${esc(b.ikona)}" inert></i> ` : ""}${esc(b.label)}</button>`;
  }).join("");
  return `<div class="neuro-robota-card neuro-postoj-card is-${esc(rodzaj)} ${esc(klasa)}">
    ${obraz ? `<img class="neuro-postoj-ilustracja" src="${esc(obraz)}" alt="">` : ""}
    <header class="neuro-robota-head">
      ${ikona ? `<img src="${esc(ikona)}" alt="">` : ""}
      <div class="neuro-robota-tytul"><strong>${esc(tytul)}</strong>${podtytul ? `<span>${esc(podtytul)}</span>` : ""}</div>
    </header>
    ${linie.map(l => `<p class="neuro-robota-linia">${l}</p>`).join("")}
    ${warn}
    ${btns ? `<div class="neuro-robota-przyciski">${btns}</div>` : ""}
  </div>`;
}

/**
 * Wiadomość z kartą. `szept: "gm"` — tylko MG; `szept: [userId…]` — wybrani; brak — publiczna.
 * @returns {Promise<ChatMessage>}
 */
export async function wyslijKarte(html, { actor = null, szept = null, flagi = {}, rolls = [] } = {}) {
  const whisper = szept === "gm" ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : (Array.isArray(szept) ? szept : []);
  return ChatMessage.create({
    content: html,
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker({ alias: "Postój" }),
    whisper,
    rolls,
    flags: { [MODULE_ID]: { [FLAGA_KARTY]: true, ...flagi } }
  });
}

function _aktorWiadomosci(message) {
  const uuid = message?.flags?.[MODULE_ID]?.aktor;
  if (uuid) return fromUuidSync(uuid);
  const sp = message?.speaker;
  return sp?.actor ? game.actors.get(sp.actor) : null;
}

function _onRender(message, html) {
  if (!message.flags?.[MODULE_ID]?.[FLAGA_KARTY]) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;
  if (!game.user.isGM) el.querySelectorAll(".neuro-postoj-card .neuro-gm-only").forEach(b => b.remove());
  const actor = _aktorWiadomosci(message);
  if (!game.user.isGM && !actor?.isOwner) el.querySelectorAll(".neuro-postoj-card .neuro-owner-only").forEach(b => b.remove());
}

async function _onClick(ev) {
  const btn = ev.target?.closest?.("[data-neuro-postoj]");
  if (!btn) return;
  const fn = AKCJE.get(btn.dataset.neuroPostoj);
  if (!fn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const li = btn.closest("[data-message-id]");
  const message = li ? game.messages.get(li.dataset.messageId) : null;
  btn.disabled = true;
  try { await fn(ev, btn, message); } catch (err) {
    console.error(`${MODULE_ID} | postój: akcja ${btn.dataset.neuroPostoj}`, err);
    ui.notifications.error(`Postój: ${err.message ?? err}`);
  } finally { btn.disabled = false; }
}

export function registerKartyPostoju() {
  Hooks.on("renderChatMessageHTML", _onRender);
  document.addEventListener("click", _onClick, { capture: true });
}
