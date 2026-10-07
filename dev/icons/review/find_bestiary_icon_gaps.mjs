import fs from "node:fs";
import { BESTIARY } from "../../../scripts/config/bestiary-data.mjs";

const buildSource = fs.readFileSync(new URL("../../packs/build-packs.mjs", import.meta.url), "utf8");
const exact = new Set(
  [...buildSource.matchAll(/^  "([^"]+\.[^"]+)": `modules\/\$\{MODULE_ID\}\/icons\//gm)]
    .map(match => match[1])
);
const sharedBlock = buildSource.match(
  /const BESTIARY_SHARED_ITEM_ICONS = Object\.freeze\(\{([\s\S]*?)\n\}\);/
)?.[1] ?? "";
const shared = new Set(
  [...sharedBlock.matchAll(/^  "([^"]+)":/gm)].map(match => match[1])
);
const iconRoot = new URL("../../../icons/", import.meta.url);
const assetsByBaseName = new Map();
for (const path of fs.globSync("**/*.svg", { cwd: iconRoot })) {
  const baseName = path.split(/[\\/]/).at(-1).replace(/\.svg$/i, "");
  const paths = assetsByBaseName.get(baseName) ?? [];
  paths.push(`icons/${path.replaceAll("\\", "/")}`);
  assetsByBaseName.set(baseName, paths);
}

const groups = new Map();
for (const [creatureId, creature] of Object.entries(BESTIARY)) {
  for (const entry of [...(creature.features ?? []), ...(creature.attacks ?? [])]) {
    if (exact.has(`${creatureId}.${entry.id}`) || shared.has(entry.id)) continue;
    const key = `${entry.id}\n${entry.name}`;
    const group = groups.get(key) ?? {
      id: entry.id,
      name: entry.name,
      count: 0,
      creatures: [],
      sections: new Set(),
      text: entry.text ?? entry.rider ?? ""
    };
    group.count += 1;
    group.creatures.push(creatureId);
    group.sections.add(entry.section);
    groups.set(key, group);
  }
}

let result = [...groups.values()]
  .map(group => ({
    ...group,
    sections: [...group.sections],
    matchingAssets: assetsByBaseName.get(group.id) ?? []
  }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pl"));

if (process.argv.includes("--missing-assets")) {
  result = result.filter(group => group.matchingAssets.length === 0);
}
const limitAt = process.argv.indexOf("--limit");
if (limitAt >= 0) result = result.slice(0, Number(process.argv[limitAt + 1]));

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
