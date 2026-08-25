import fs from "node:fs";

const [, , next] = process.argv;
if (!next) {
  console.error("usage: node bump-version.mjs <new-version>");
  process.exit(1);
}

const raw = fs.readFileSync("module.json");
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
  console.error("module.json ma BOM — Foundry nie sparsuje manifestu. Przywroc plik z gita.");
  process.exit(1);
}

const text = raw.toString("utf8");
const current = JSON.parse(text).version;
const out = text.replace(`"version": "${current}"`, `"version": "${next}"`);
if (out === text) {
  console.error(`nie znalazlem linii z wersja "${current}"`);
  process.exit(1);
}

fs.writeFileSync("module.json", Buffer.from(out, "utf8"));
const check = JSON.parse(fs.readFileSync("module.json", "utf8"));
console.log(`${current} -> ${check.version}`);
