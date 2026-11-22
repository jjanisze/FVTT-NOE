import fs from "node:fs";
import path from "node:path";

export const MODULE_ID = "neuroshima-2026-overrides";
export const webPath = value => value.split(path.sep).join("/");
export const encodePath = value => webPath(value).split("/").map(encodeURIComponent).join("/");
export const fail = (message, status = 400) => Object.assign(new Error(message), { status });

export function inside(root, relative) {
  if (!root || typeof relative !== "string" || relative.includes("\0") || relative.includes(":") || relative.includes("\\")) throw fail("Invalid asset path", 403);
  const base = path.resolve(root), file = path.resolve(base, relative);
  const under = (parent, child) => { const rel = path.relative(parent, child); return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel)); };
  if (!under(base, file)) throw fail("Path outside permitted root", 403);
  if (fs.existsSync(file) && !under(fs.realpathSync(base), fs.realpathSync(file))) throw fail("Asset link outside permitted root", 403);
  return file;
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

export const TYPES = new Map(Object.entries({
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg"
}));

export function sendFile(req, res, file) {
  const type = TYPES.get(path.extname(file).toLowerCase());
  if (!type) throw fail("This file type is not served", 403);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw fail("File is not available", 404);
  res.writeHead(200, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

export function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(value));
}

export async function bodyJson(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw fail("Expected JSON", 415);
  let body = "";
  for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 8192) throw fail("Request is too large", 413); }
  try { return JSON.parse(body); } catch { throw fail("Invalid JSON"); }
}

export function loadRegistry(moduleRoot, registryFile) {
  const registry = registryFile ? readJson(registryFile) : {};
  if (!registry || typeof registry !== "object") throw fail("Cannot read the hub registry");
  const base = registryFile ? path.dirname(path.resolve(registryFile)) : moduleRoot;
  const roots = { module: moduleRoot };
  for (const [key, value] of Object.entries(registry.roots ?? {})) {
    if (!/^[a-z][a-z0-9-]*$/.test(key) || key === "module" || typeof value !== "string") throw fail("Invalid registry root");
    roots[key] = path.resolve(base, value);
  }
  return { ...registry, roots, base, entries: registry.entries ?? [], graphicsFactory: registry.graphicsFactory ? path.resolve(base, registry.graphicsFactory) : null };
}

export function assetUrl(root, relative) {
  const prefix = root === "module" ? `/modules/${MODULE_ID}/` : `/files/${encodeURIComponent(root)}/`;
  return prefix + encodePath(relative);
}

const moduleGalleries = [
  ["components", "UI components", "dev/visual/m9-components/index.html", false],
  ["finished-icons", "Finished icon families", "dev/finish/preview/index.html", false],
  ["sheet-art", "Sheet artwork", "dev/art/m9/index.html", false],
  ["sheet-art-r02", "Sheet artwork · round 2", "dev/art/m9/r02/index.html", true],
  ["sheet-art-r03", "Sheet artwork · round 3", "dev/art/m9/r03/index.html", true],
  ["vehicles", "Vehicle artwork", "dev/art/m4/review.html", true],
  ["hammer", "Hammer · roof and interior", "dev/art/m4/hammer/review.html", true],
  ["motorcycle", "Motorcycle artwork", "dev/art/m4/motocykl/review.html", true],
  ["truck", "Truck artwork", "dev/art/m4/ciezarowka/review.html", true],
  ["bradley", "Bradley · layers", "dev/art/m4/bwp/layers-review.html", true],
  ["tank", "Tank · layers", "dev/art/m4/czolg/layers-review.html", true]
];

export function destinations(registry) {
  const entries = moduleGalleries.map(([id, label, relative, historical]) => ({ id, label, path: relative, historical, root: "module", kind: "gallery", group: "Visuals" }));
  const reference = path.join(registry.roots.module, "dev/visual/reference");
  const dates = fs.existsSync(reference) ? fs.readdirSync(reference).filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort().reverse() : [];
  for (const [i, date] of dates.entries()) entries.push({ id: `reference-${date}`, label: `UI captures · ${date}`, root: "module", path: `dev/visual/reference/${date}/index.html`, historical: i > 0, kind: "gallery", group: "Visuals" });
  for (const file of ["IMPLEMENTATION.md", "PLAN_beta.md", "dev/agent/README.md", "dev/poligon/README.md"]) entries.push({ id: `doc-${file.replaceAll("/", "-")}`, label: ({ "IMPLEMENTATION.md": "Implementation status", "PLAN_beta.md": "Road to beta", "dev/agent/README.md": "Foundry commands", "dev/poligon/README.md": "Poligon guide" })[file], root: "module", path: file, kind: "document", group: "Reference" });
  for (const [file, label] of [["AUDIT_m9_ui.md", "UI source audit"], ["PLAN_m9_style.md", "Visual style plan"], ["CREDITS.md", "Asset credits"]]) entries.push({ id: `doc-${file}`, label, root: "module", path: file, kind: "document", group: "Reference" });
  entries.push(...registry.entries);
  for (const [alias, relative] of Object.entries(registry.mapGalleries ?? {})) {
    const folder = inside(registry.roots[alias], relative);
    if (fs.existsSync(folder)) for (const name of fs.readdirSync(folder).filter(name => /^batch-[a-z0-9-]+$/i.test(name)).sort().reverse()) {
      const candidate = `${relative}/${name}/review/index.html`;
      if (fs.existsSync(inside(registry.roots[alias], candidate))) entries.push({ id: `map-${alias}-${name}`, label: `Map artwork · ${name}`, root: alias, path: candidate, kind: "gallery", group: "Maps", historical: true });
    }
  }
  const seen = new Set();
  return entries.map(entry => {
    if (!/^[a-zA-Z0-9._-]+$/.test(entry.id) || seen.has(entry.id) || !["gallery", "document", "obsidian"].includes(entry.kind)) throw fail("Invalid or duplicate registry entry");
    seen.add(entry.id);
    const file = inside(registry.roots[entry.root], entry.path);
    const available = fs.existsSync(file) && fs.statSync(file).isFile();
    const href = entry.kind === "obsidian" ? `obsidian://open?vault=${encodeURIComponent(path.basename(registry.roots[entry.root]))}&file=${encodeURIComponent(entry.path.replace(/\.md$/i, ""))}` : entry.kind === "gallery" ? assetUrl(entry.root, entry.path) : null;
    return { ...entry, available, href, historical: !!entry.historical };
  });
}

export function permittedAsset(registry, entries, root, relative) {
  const file = inside(registry.roots[root], relative);
  const normalized = webPath(path.relative(registry.roots[root], file));
  if (entries.some(entry => entry.root === root && entry.kind === "document" && entry.path === normalized)) return file;
  const resourceRoots = ["icons/", "styles/", "ui/", "fonts/", "tokens/", "sounds/"];
  const prefixes = entries.filter(e => e.root === root && e.kind === "gallery").map(e => webPath(path.dirname(e.path)) + "/");
  for (const prefix of registry.assetRoots?.[root] ?? []) prefixes.push(webPath(prefix).replace(/\/$/, "") + "/");
  if (root === "module") prefixes.push(...resourceRoots);
  if (!prefixes.some(prefix => normalized.startsWith(prefix))) throw fail("Asset is outside the gallery roots", 403);
  return file;
}
