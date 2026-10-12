/**
 * Local icon-review server. No dependencies; binds to loopback only.
 *
 *   node dev/icons/review/server.mjs
 *   node dev/icons/review/server.mjs --port=41741
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog, saveStyleFeedback } from "./catalog.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../../..");
const PORT = Number(process.argv.find(a => a.startsWith("--port="))?.slice(7) ?? 41741);
const HOST = "127.0.0.1";
const TYPES = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"], [".svg", "image/svg+xml; charset=utf-8"], [".webp", "image/webp"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".gif", "image/gif"], [".avif", "image/avif"]
]);

const json = (res, status, value) => {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
};

function safePath(root, relative) {
  const target = path.resolve(root, relative.replace(/^[/\\]+/, ""));
  const prefix = path.resolve(root) + path.sep;
  if (target !== path.resolve(root) && !target.startsWith(prefix)) throw new Error("Path escapes review root");
  return target;
}

function sendFile(res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: "Not found" });
  res.writeHead(200, {
    "content-type": TYPES.get(path.extname(file).toLowerCase()) ?? "application/octet-stream",
    "cache-control": file.endsWith(".html") || file.endsWith(".js") || file.endsWith(".css") ? "no-store" : "public, max-age=60"
  });
  fs.createReadStream(file).pipe(res);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (err) { if (err.code === "ENOENT") return fallback; throw err; }
}

async function bodyJson(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 64 * 1024) throw new Error("Feedback payload exceeds 64 KiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateFeedback(input, manifest) {
  const item = manifest.items.find(x => x.id === input.itemId);
  if (!item) throw new Error("Unknown itemId");
  if (!["pending", "approve", "revise", "reject"].includes(input.decision)) throw new Error("Invalid decision");
  const candidateId = String(input.candidateId ?? "");
  if (candidateId && candidateId !== "current" && !item.candidates.some(x => x.id === candidateId)) {
    throw new Error("Unknown candidateId");
  }
  const notes = String(input.notes ?? "").slice(0, 10000);
  return { itemId: item.id, decision: input.decision, candidateId, notes, updatedAt: new Date().toISOString() };
}

export function createReviewServer({ moduleRoot = MODULE_ROOT, reviewRoot = path.join(moduleRoot, "dev/icons/review") } = {}) {
const ICON_ROOT = path.join(moduleRoot, "icons");
const MANIFEST = path.join(reviewRoot, "manifest.json");
const FEEDBACK = path.join(reviewRoot, "feedback.json");
const FEEDBACK_BACKUP = path.join(reviewRoot, "feedback.json.bak");
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === "POST") {
      if (!req.headers["content-type"]?.startsWith("application/json")) throw new Error("Expected JSON payload");
      if (req.headers.origin && req.headers.origin !== `http://${HOST}:${req.socket.localPort}`) throw new Error("Invalid request origin");
    }
    if (req.method === "GET" && url.pathname === "/api/catalog") return json(res, 200, buildCatalog(moduleRoot, reviewRoot));
    if (req.method === "POST" && url.pathname === "/api/style-feedback") {
      return json(res, 200, saveStyleFeedback(moduleRoot, reviewRoot, await bodyJson(req)));
    }
    if (req.method === "GET" && url.pathname === "/api/manifest") return json(res, 200, readJson(MANIFEST, { items: [] }));
    if (req.method === "GET" && url.pathname === "/api/feedback") {
      return json(res, 200, readJson(FEEDBACK, readJson(FEEDBACK_BACKUP, { version: 1, items: {} })));
    }
    if (req.method === "POST" && url.pathname === "/api/feedback") {
      const manifest = readJson(MANIFEST, { items: [] });
      const entry = validateFeedback(await bodyJson(req), manifest);
      const feedback = readJson(FEEDBACK, { version: 1, items: {} });
      feedback.items[entry.itemId] = entry;
      const temp = FEEDBACK + ".tmp";
      fs.writeFileSync(temp, JSON.stringify(feedback, null, 2) + "\n", "utf8");
      // Windows cannot reliably rename over an existing file. Keep the last
      // complete state as a recovery copy, then replace the primary.
      if (fs.existsSync(FEEDBACK)) {
        fs.copyFileSync(FEEDBACK, FEEDBACK_BACKUP);
        fs.rmSync(FEEDBACK);
      }
      try {
        fs.renameSync(temp, FEEDBACK);
      } catch (err) {
        if (!fs.existsSync(FEEDBACK) && fs.existsSync(FEEDBACK_BACKUP)) {
          fs.copyFileSync(FEEDBACK_BACKUP, FEEDBACK);
        }
        throw err;
      }
      return json(res, 200, entry);
    }
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
    if (url.pathname.startsWith("/icons/")) return sendFile(res, safePath(ICON_ROOT, decodeURIComponent(url.pathname.slice(7))));
    const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    return sendFile(res, safePath(reviewRoot, relative));
  } catch (err) {
    console.error(err);
    return json(res, err.status ?? 400, { error: err.message });
  }
});
return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createReviewServer();
  server.listen(PORT, HOST, () => {
    console.log(`Icon review: http://${HOST}:${PORT}/`);
    console.log(`Icon browser: http://${HOST}:${PORT}/browser.html`);
    console.log(`Feedback:   ${path.join(HERE, "feedback.json")}`);
  });
}
