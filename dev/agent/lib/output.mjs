/**
 * One JSON object per command on stdout; exit code says how it ended.
 * Progress notes go to stderr so stdout stays machine-readable.
 */

export const EXIT = { ok: 0, failed: 1, refused: 2, usage: 3 };

export class CliError extends Error {
  /**
   * @param {string} message
   * @param {object} [opts]
   * @param {string} [opts.code]     stable slug, e.g. "refused-mode", "no-secret"
   * @param {string} [opts.hint]     what a human or agent should do next
   * @param {object} [opts.details]  extra JSON-safe data
   * @param {boolean} [opts.refused] a guard said no (exit 2), as opposed to a failure (exit 1)
   */
  constructor(message, { code = "error", hint, details, refused = false } = {}) {
    super(message);
    this.code = code;
    this.hint = hint;
    this.details = details;
    this.refused = refused || code.startsWith("refused");
  }
}

export function refuse(message, code, hint, details) {
  return new CliError(message, { code: `refused-${code}`, hint, details, refused: true });
}

export function print(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

export function note(...parts) {
  process.stderr.write(`[fvtt] ${parts.join(" ")}\n`);
}

export function errorResult(err) {
  if (err instanceof CliError) {
    return {
      result: { ok: false, error: err.message, code: err.code, hint: err.hint, ...(err.details ? { details: err.details } : {}) },
      exit: err.code === "usage" ? EXIT.usage : err.refused ? EXIT.refused : EXIT.failed
    };
  }
  return { result: { ok: false, error: err?.message ?? String(err), code: "exception", stack: err?.stack }, exit: EXIT.failed };
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Poll `fn` until it returns a truthy value or `timeoutMs` passes; returns the value or null. */
export async function poll(fn, { timeoutMs = 30_000, intervalMs = 500 } = {}) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() >= end) return null;
    await sleep(intervalMs);
  }
}
