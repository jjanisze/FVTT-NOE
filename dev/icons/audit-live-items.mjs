/**
 * Read-only inventory of Item documents from an already-open Foundry page.
 *
 * Usage:
 *   node dev/icons/audit-live-items.mjs --cdp-port=<port>        (albo CDP_PORT w środowisku)
 *   node dev/icons/audit-live-items.mjs --cdp-port=<port> --output=dev/icons/review/audits/live-items.json
 *
 * This intentionally goes through Foundry's document API in Chrome. It never opens
 * the world's or module's LevelDB files while Foundry is running.
 */
import fs from "node:fs";
import path from "node:path";

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const cdpPort = Number(arg("cdp-port") ?? process.env.CDP_PORT);
if (!Number.isInteger(cdpPort) || cdpPort <= 0) throw new Error("Podaj port CDP Chrome: --cdp-port=<port> albo zmienna CDP_PORT (port z .mcp.json projektu — nie wpisujemy go do repo).");
const output = path.resolve(arg("output") ?? "dev/icons/review/audits/live-items.json");
const moduleId = arg("module") ?? "neuroshima-2026-overrides";

const pages = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
const page = pages.find(candidate => candidate.type === "page" && /\/game(?:$|[?#])/.test(candidate.url));
if (!page) throw new Error(`No Foundry /game page found on Chrome CDP port ${cdpPort}`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const job = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) job.reject(new Error(JSON.stringify(message.error)));
  else job.resolve(message.result);
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const expression = `
(async () => {
  if (!globalThis.game?.ready) throw new Error("Foundry game is not ready");
  const compact = (item, origin) => ({
    uuid: item.uuid ?? null,
    id: item.id ?? item._id ?? null,
    name: item.name ?? "",
    type: item.type ?? "",
    img: item.img ?? "",
    origin,
    description: String(item.system?.description?.value ?? "")
      .replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 500)
  });
  const world = game.items.contents.map(item => compact(item, "world"));
  const actors = game.actors.contents.flatMap(actor => actor.items.contents.map(item => ({
    ...compact(item, "actor"), actorId: actor.id, actorName: actor.name
  })));
  const packRows = [];
  for (const pack of game.packs) {
    if (pack.documentName !== "Item") continue;
    if (pack.metadata?.packageName !== ${JSON.stringify(moduleId)}) continue;
    const index = await pack.getIndex({ fields: ["img", "type", "system.description.value"] });
    for (const item of index) packRows.push({
      ...compact(item, "compendium"),
      uuid: "Compendium." + pack.collection + "." + item._id,
      pack: pack.collection,
      packLabel: pack.metadata?.label ?? pack.collection
    });
  }
  return {
    capturedAt: new Date().toISOString(),
    foundry: game.version,
    system: { id: game.system.id, version: game.system.version },
    world: { id: game.world.id, title: game.world.title },
    documents: [...world, ...actors, ...packRows]
  };
})()`;

try {
  const evaluated = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (evaluated.exceptionDetails) {
    const detail = evaluated.exceptionDetails.exception?.description ?? evaluated.exceptionDetails.text;
    throw new Error(detail);
  }
  const snapshot = evaluated.result.value;
  const placeholderPattern = /(?:^|\/)(?:item-bag|mystery-man|lightning|pill)\.svg(?:$|[?#])/i;
  const documents = snapshot.documents.map(document => ({
    ...document,
    placeholder: placeholderPattern.test(document.img)
  }));
  const iconUse = Object.entries(documents.reduce((counts, document) => {
    if (document.img) counts[document.img] = (counts[document.img] ?? 0) + 1;
    return counts;
  }, {})).map(([img, count]) => ({ img, count })).sort((a, b) => b.count - a.count || a.img.localeCompare(b.img));
  const report = {
    ...snapshot,
    summary: {
      total: documents.length,
      world: documents.filter(document => document.origin === "world").length,
      actor: documents.filter(document => document.origin === "actor").length,
      compendium: documents.filter(document => document.origin === "compendium").length,
      placeholders: documents.filter(document => document.placeholder).length,
      uniqueIcons: iconUse.length
    },
    iconUse,
    documents
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, ...report.summary }));
} finally {
  ws.close();
}
