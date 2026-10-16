/** Refresh only the marked local style queue after approved asset delivery. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStyleFeedback, renderStyleQueue, mergeStyleQueue } from "../review/catalog.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const missing = path.join(root, "dev/icons/MISSING.md");
const before = fs.readFileSync(missing, "utf8");
const section = renderStyleQueue(readStyleFeedback(path.join(root, "dev/icons/review")));
fs.writeFileSync(missing, mergeStyleQueue(before, section), "utf8");
