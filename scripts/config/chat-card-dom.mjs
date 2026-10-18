/**
 * Neuroshima 5e — where our additions go on dnd5e's chat cards.
 *
 * dnd5e 6.0 rebuilt the card face (`templates/chat/parts/card-face.hbs`): there is no `.card-buttons` and no
 * `ul.card-footer.pills` any more. Inside `.chat-card` come the header, flavour, description, then rows of pills
 * (`section.icon-row > ul.pills`, from `card-rows.hbs`), recorded targets, and the action buttons as an icon row
 * rendered from the message's button descriptors. Our injections looked for the 5.3 hosts and fell back to the end of
 * `.message-content` — below the card, after its summaries and trays — or, for the Dozownik dose pill, to nothing.
 *
 * The 5.3 selectors stay first: our own cards and the legacy usage content (`activity-card.hbs`) still have them.
 */

/** The pill list of a card to append to; with `create`, a new list at the end of `.chat-card` when it has none. */
export function cardPillList(root, { create = true } = {}) {
  const existing = root?.querySelector("ul.card-footer.pills") ?? root?.querySelector(".chat-card section.icon-row ul.pills:not(.targets)");
  if (existing || !create || !root) return existing ?? null;
  const host = root.querySelector(".chat-card") ?? root.querySelector(".message-content");
  if (!host) return null;
  const ul = document.createElement("ul");
  ul.className = "card-footer pills unlist";
  host.appendChild(ul);
  return ul;
}

/** Every pill list of a card (dnd5e's rows and ours). */
export function cardPillLists(root) {
  return [...(root?.querySelectorAll("ul.card-footer.pills, .chat-card section.icon-row ul.pills:not(.targets)") ?? [])];
}

/** Where our buttons go: the 5.3 button bar, else the end of the card itself, else the message content. */
export function cardButtonHost(root) {
  return root?.querySelector(".card-buttons") ?? root?.querySelector(".chat-card") ?? root?.querySelector(".message-content") ?? null;
}
