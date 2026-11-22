import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHub } from "./server.mjs";
import { contactHub, hubPipe } from "./runtime.mjs";
import { listenOnSafePort } from "../agent/lib/ports.mjs";

const arg = key => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const moduleRoot = path.resolve(arg("module") ?? fileURLToPath(new URL("../..", import.meta.url)));
const registryFile = arg("registry"), pipe = hubPipe(moduleRoot, registryFile);
const existing = await contactHub(pipe).catch(() => null);
if (existing) process.exit(0);
if (process.platform !== "win32" && fs.existsSync(pipe)) fs.unlinkSync(pipe);

let hub, endpoint;
const ipc = net.createServer(client => {
  client.setTimeout(3000, () => client.destroy());
  let input = "";
  client.on("data", chunk => {
    input += chunk;
    if (input.length > 2048) return client.destroy();
    if (!input.includes("\n")) return;
    try {
      const request = JSON.parse(input);
      if (!hub || !endpoint) { client.end(JSON.stringify({ ok: false, error: "Hub is starting" }) + "\n"); return; }
      if (request.operation === "stop") {
        if (hub.jobs.busy()) return client.end(JSON.stringify({ ok: false, error: "An operation is running." }) + "\n");
        client.end(JSON.stringify({ ok: true, stopped: true }) + "\n");
        setTimeout(() => { hub.close().then(() => { ipc.close(); if (process.platform !== "win32") try { fs.unlinkSync(pipe); } catch {} }).catch(() => {}); }, 50);
      } else if (request.operation === "status") client.end(JSON.stringify({ ok: true, kind: "neuroshima-project-hub", url: endpoint, pid: process.pid }) + "\n");
      else client.end(JSON.stringify({ ok: false, error: "Unknown operation" }) + "\n");
    } catch { client.destroy(); }
  });
});

try {
  await new Promise((resolve, reject) => { ipc.once("error", reject); ipc.listen(pipe, resolve); });
} catch (error) { if (error.code === "EADDRINUSE") process.exit(0); throw error; }
try {
  hub = await createHub({ moduleRoot, registryFile });
  await listenOnSafePort(hub.server, "127.0.0.1");
  endpoint = `http://127.0.0.1:${hub.server.address().port}/`;
} catch (error) { ipc.close(); throw error; }
