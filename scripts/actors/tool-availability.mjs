/**
 * Neuroshima 5e — Tool availability note on tool checks.
 *
 * Every tool check (whether rolled from the tool item's activity OR from the
 * "biegłość w narzędziach" entry in the proficiencies list) produces a chat
 * message flagged with `flags.dnd5e.roll.type === "tool"` and `roll.toolId`.
 *
 * This module appends a small note to that chat card stating whether the rolling
 * actor actually carries the matching tool kit in their inventory — because the
 * rules require the physical tools for complex tasks ("bez odpowiednich narzędzi
 * nie wykonasz skomplikowanych czynności"). Rolling from the item is therefore an
 * automatic "yes"; rolling from the proficiency list is verified against inventory.
 *
 * ## Zastępniki (2026-09-09)
 *
 * Podręcznik zna sprzęt, który nie jest zestawem narzędzi, ale go zastępuje — Laptop wojskowy
 * „może zastąpić Narzędzia małego hakera". Sprawdzenie po samym `baseItem` tego nie widziało:
 * Raynald, biegły w Narzędziach małego hakera i noszący laptop, dostawał na każdej karcie
 * czerwone „✘ brak zestawu w ekwipunku". Wyglądało to jak stan gry („no fakt, nie mam
 * zestawu"), a było ślepotą sprawdzenia. Zastępniki deklarują `flags.<moduł>.substitutes`
 * (patrz `config/gear-data.mjs`, typedef `ToolSubstitute`) i liczą się tu na równi z zestawem.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export function registerToolAvailability() {
  Hooks.on("renderChatMessageHTML", _onRenderToolCheck);
  console.log("Neuroshima 5e | Tool availability note registered");
}

/* -------------------------------------------- */

/** Resolve the actor a chat message speaks for (token actor preferred). */
function _messageActor(message) {
  const sp = message.speaker ?? {};
  if ( sp.scene && sp.token ) {
    const tok = game.scenes.get(sp.scene)?.tokens.get(sp.token);
    if ( tok?.actor ) return tok.actor;
  }
  if ( sp.actor ) return game.actors.get(sp.actor) ?? null;
  return null;
}

/* -------------------------------------------- */

function _onRenderToolCheck(message, html) {
  const roll = message.flags?.dnd5e?.roll;
  if ( roll?.type !== "tool" ) return;
  const toolId = roll.toolId;
  if ( !toolId || !CONFIG.DND5E.tools?.[toolId] ) return;

  const el = html instanceof HTMLElement ? html : html?.[0];
  if ( !el || el.querySelector(".neuro-tools-note") ) return;

  const actor = _messageActor(message);
  if ( !actor ) return;

  // Match tool kits in inventory by their base-item key, and equipment that substitutes for them.
  const has = i => (i.system.quantity ?? 1) >= 1;
  const kits = actor.items.filter(i =>
    i.type === "tool" && i.system.type?.baseItem === toolId && has(i)
  );
  const substitutes = actor.items.filter(i =>
    i.getFlag(MODULE_ID, "substitutes") === toolId && has(i)
  );

  const all = [...kits, ...substitutes];
  const owns = all.length > 0;
  const equipped = all.some(i => i.system.equipped);

  let bg, border, fg, text;
  if ( owns ) {
    bg = "rgba(60,160,60,.15)"; border = "#3ca03c"; fg = "#8ee08e";
    // Zastępnik nazywamy po imieniu — inaczej „masz zestaw" przy pustym slocie zestawu
    // wygląda jak błąd, a nie jak działająca zasada.
    const label = kits.length ? "masz zestaw" : `zastępuje: ${substitutes[0].name}`;
    text = equipped ? label : `${label} <span style="opacity:.7">(w plecaku)</span>`;
  } else {
    bg = "rgba(180,40,40,.15)"; border = "#b02828"; fg = "#f0a0a0";
    text = "brak zestawu w ekwipunku";
  }

  const note = document.createElement("div");
  note.className = "neuro-tools-note";
  note.style.cssText =
    `margin-top:4px;padding:3px 7px;border-radius:4px;font-size:12px;` +
    `background:${bg};border:1px solid ${border};color:${fg}`;
  note.innerHTML = `<i class="fa-solid fa-toolbox" inert></i> <strong>Narzędzia:</strong> ${owns ? "✔" : "✘"} ${text}`;

  const target = el.querySelector(".message-content") ?? el;
  target.appendChild(note);
}
