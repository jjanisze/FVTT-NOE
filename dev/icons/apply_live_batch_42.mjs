/** Plan, back up and apply batch 42 through an already-open Foundry Chrome tab. */
import fs from "node:fs";
import path from "node:path";

const port = Number(process.argv.find(arg => arg.startsWith("--cdp-port="))?.slice(11) ?? process.env.CDP_PORT);
if (!Number.isInteger(port) || port <= 0) throw new Error("Podaj port CDP Chrome: --cdp-port=<port> albo zmienna CDP_PORT (port z .mcp.json projektu — nie wpisujemy go do repo).");
const backupArg = process.argv.find(arg => arg.startsWith("--backup="))?.slice(9);
const backup = path.resolve(backupArg ?? "dev/backup/batch-42-icon-repoint-2026-10-03.json");
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find(candidate => candidate.type === "page" && /\/game(?:$|[?#])/.test(candidate.url));
if (!page) throw new Error(`No Foundry /game page found on Chrome CDP port ${port}`);

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
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

const moduleUrl = `/modules/neuroshima-2026-overrides/dev/icons/wire_batch_42.mjs?live=${Date.now()}`;
try {
  const plan = await evaluate(`(async()=>{
    const module = await import(${JSON.stringify(moduleUrl)});
    return module.planBatch42();
  })()`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const result = await evaluate(`(async()=>{
    const module = await import(${JSON.stringify(moduleUrl)});
    return module.applyBatch42(${JSON.stringify(plan)});
  })()`);
  const after = await evaluate(`(async()=>{
    const module = await import(${JSON.stringify(moduleUrl)});
    return module.planBatch42();
  })()`);
  console.log(JSON.stringify({ backup, plan, result, after }, null, 2));
} finally {
  ws.close();
}
