/**
 * Foundry's server log: `<dataPath>/Logs/debug.<YYYY-MM-DD>.log`, one JSON object per line,
 * `timestamp` in local time as "YYYY-MM-DD HH:mm:ss". This, not stdout, is where a desktop
 * or headless server reports (D3).
 */

import fs from "node:fs";
import path from "node:path";

const pad = n => String(n).padStart(2, "0");
export const localStamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Ports and hosts never leave fvtt (feedback: no network specifics in anything that persists,
 * and transcripts persist). The startup option dump and "listening on port" lines carry them.
 */
export function redact(text) {
  return text
    .replace(/("?(?:port|proxyPort)"?\s*[:=]?\s*)\d{2,5}/gi, "$1<port>")
    .replace(/\b((?:localhost|127\.0\.0\.1|\[::1\]|\d{1,3}(?:\.\d{1,3}){3})):\d{2,5}\b/g, "$1:<port>")
    .replace(/("(?:hostname|localHostname)"\s*:\s*)"[^"]*"/g, "$1\"<host>\"");
}

/**
 * @param {string} logsDir
 * @param {{since?: Date, level?: string, limit?: number, grep?: string}} [opts]
 */
export function readLog(logsDir, { since = new Date(Date.now() - 3600_000), level = "info", limit = 200, grep } = {}) {
  const from = localStamp(since);
  const max = LEVELS[level] ?? LEVELS.info;
  const days = [];
  for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  const re = grep ? new RegExp(grep, "i") : null;
  const out = [];
  for (const day of [...new Set(days)]) {
    let text;
    try {
      text = fs.readFileSync(path.join(logsDir, `debug.${day}.log`), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if ((entry.timestamp ?? "") < from) continue;
      if ((LEVELS[entry.level] ?? 2) > max) continue;
      if (re && !re.test(entry.message ?? "")) continue;
      out.push({ t: entry.timestamp, level: entry.level, message: redact(String(entry.message ?? "")).slice(0, 2000) });
    }
  }
  return out.slice(-limit);
}
