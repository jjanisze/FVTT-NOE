/**
 * The Poligon's look (§3.2): a hazard frame around the viewport, a "POLIGON" label on top, the
 * `[POLIGON]` title prefix — so a Poligon tab next to the campaign tab in one Chrome is never mistaken
 * for it. Badges on the label show what is armed (rigged dice) and which variant is on.
 */

const badges = new Map();

export function installStyles() {
  if (document.getElementById("poligon-css")) return;
  const link = document.createElement("link");
  link.id = "poligon-css";
  link.rel = "stylesheet";
  link.href = new URL("../poligon.css", import.meta.url).href;
  document.head.append(link);
}

export function installBanner(kind) {
  document.body.classList.add("poligon", `poligon-${kind}`);
  let el = document.getElementById("poligon-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "poligon-banner";
    document.body.append(el);
  }
  el.dataset.kind = kind;
  render();
  prefixTitle(kind);
}

function label(kind) {
  if (kind === "klon") return "KLON — NIE KAMPANIA";
  if (kind === "sandbox") return "POLIGON · PIASKOWNICA";
  return "POLIGON";
}

function render() {
  const el = document.getElementById("poligon-banner");
  if (!el) return;
  el.replaceChildren();
  const main = document.createElement("span");
  main.textContent = label(el.dataset.kind);
  el.append(main);
  for (const [key, b] of badges) {
    const s = document.createElement("span");
    s.className = `poligon-badge ${b.cls ?? ""}`.trim();
    s.dataset.badge = key;
    s.textContent = b.text;
    el.append(s);
  }
}

/** `setBadge("kosci", "KOŚCI: 20, 1")`; `setBadge("kosci", null)` removes it. */
export function setBadge(key, text, cls = null) {
  if (text) badges.set(key, { text, cls });
  else badges.delete(key);
  render();
}

/** Core rewrites the title (scene changes); keep the prefix on every rewrite. */
function prefixTitle(kind) {
  const prefix = kind === "klon" ? "[KLON] " : "[POLIGON] ";
  const fix = () => {
    if (!document.title.startsWith(prefix)) document.title = prefix + document.title.replace(/^\[(POLIGON|KLON)\] /, "");
  };
  fix();
  const title = document.querySelector("title");
  if (title && !title.__poligonObserved) {
    new MutationObserver(fix).observe(title, { childList: true, characterData: true, subtree: true });
    title.__poligonObserved = true;
  }
}
