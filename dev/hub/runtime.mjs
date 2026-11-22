import path from "node:path";
import os from "node:os";
import net from "node:net";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { loadRegistry, destinations } from "./files.mjs";

export function hubPipe(moduleRoot, registryFile = "") {
  const canonical = value => { let normalized; try { normalized = fs.realpathSync(value); } catch { normalized = path.resolve(value); } return process.platform === "win32" ? normalized.toLowerCase() : normalized; };
  const key = createHash("sha256").update([canonical(moduleRoot), registryFile ? canonical(registryFile) : "", os.userInfo().username].join("\0")).digest("hex").slice(0, 24);
  return process.platform === "win32" ? `\\\\.\\pipe\\neuroshima-hub-${key}` : path.join(os.tmpdir(), `neuroshima-hub-${key}.sock`);
}

export function contactHub(pipe, operation = "status") {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(pipe); let response = "";
    client.setTimeout(2000, () => client.destroy(new Error("Hub did not answer")));
    client.on("connect", () => client.write(JSON.stringify({ operation }) + "\n"));
    client.on("data", chunk => { response += chunk; if (response.length > 8192) client.destroy(new Error("Invalid hub response")); if (response.includes("\n")) { client.end(); try { resolve(JSON.parse(response)); } catch (error) { reject(error); } } });
    client.on("error", reject); client.on("end", () => { if (!response.includes("\n")) reject(new Error("Incomplete hub response")); });
  });
}

export async function ensureHub({ moduleRoot, registryFile, stop = false }) {
  const pipe = hubPipe(moduleRoot, registryFile);
  const existing = await contactHub(pipe, stop ? "stop" : "status").catch(() => null);
  if (existing?.ok || (existing && stop)) return { ...existing, reused: true };
  if (stop) return { ok: true, stopped: false };
  // Report configuration errors directly instead of hiding them in a detached process.
  destinations(loadRegistry(moduleRoot, registryFile));
  const daemon = fileURLToPath(new URL("./daemon.mjs", import.meta.url));
  let launchError;
  if (!existing) {
    const child = spawn(process.execPath, [daemon, `--module=${moduleRoot}`, ...(registryFile ? [`--registry=${path.resolve(registryFile)}`] : [])], { cwd: moduleRoot, shell: false, detached: true, windowsHide: true, stdio: "ignore" });
    child.on("error", error => { launchError = error; }); child.unref();
  }
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    const result = await contactHub(pipe).catch(() => null);
    if (result?.ok) return { ...result, reused: !!existing };
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("The project hub did not start. Check the registry and run dev/hub/daemon.mjs in a terminal for details.");
}
