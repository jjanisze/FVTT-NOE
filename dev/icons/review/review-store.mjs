/** Shared local review persistence. Validators and schemas belong to each asset workflow. */
import fs from "node:fs";
import path from "node:path";

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

export function readWithBackup(file, fallback) {
  return fs.existsSync(file) ? readJson(file, fallback) : readJson(file + ".bak", fallback);
}

export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp", backup = file + ".bak";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  if (fs.existsSync(file)) fs.copyFileSync(file, backup);
  try {
    try { fs.renameSync(temp, file); }
    catch (error) {
      if (!["EEXIST", "EPERM"].includes(error.code)) throw error;
      if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.renameSync(temp, file);
    }
  } catch (error) {
    if (!fs.existsSync(file) && fs.existsSync(backup)) fs.copyFileSync(backup, file);
    throw error;
  }
}

export async function bodyJson(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 64 * 1024) throw Object.assign(new Error("Feedback payload exceeds 64 KiB"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
