/**
 * Talking to a Foundry v14 server over its own HTTP routes (§3) — the only module that knows
 * their shapes, so a core update breaks one file and its smoke test, not every command.
 *
 * Shapes verified in `resources/app/dist/server/views/*.mjs` (v14):
 *  - GET  /api/status                       no auth; {active, version, world, system, systemVersion, users, uptime}
 *  - POST /auth     {adminPassword}         sets session.admin even while a world runs; always redirects
 *  - POST /join     {action:"shutdown"}     admin session; world → setup
 *  - POST /join     {action:"loginAs", userId}   admin (or GM) session → that session joins as userId
 *  - POST /setup    {action:"launchWorld", world} | {action, …}   admin, only while no world is active
 *  - POST /create   {action:"createWorld", id, title, system}     admin
 *  - POST /quit                              admin; app.quit() / process.exit()
 *  - socket.io "getJoinData"                 the user list (there is no HTTP route for it)
 * Sessions are in-memory and expire 24 h after creation (sessions.mjs), so every restart
 * logs every client out.
 */

import { CliError } from "./output.mjs";
import { readAdminPassword } from "./secret.mjs";

export class FoundryClient {
  /** @param {{baseUrl: string}} profile */
  constructor(profile) {
    this.base = profile.baseUrl;
    this.session = null;
  }

  async #fetch(route, { method = "GET", body, timeoutMs = 15_000 } = {}) {
    const headers = {};
    if (this.session) headers.cookie = `session=${this.session}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${this.base}${route}`, {
      method, headers, redirect: "manual",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const m = /^session=([^;]*)/.exec(c);
      if (m) this.session = m[1] || null;
    }
    return res;
  }

  async #json(route, opts) {
    const res = await this.#fetch(route, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: res.ok ? "ok" : "failed", message: text.slice(0, 300) };
    }
    if (!res.ok) data.httpStatus = res.status;
    return data;
  }

  /** `/api/status`, or `{reachable:false}` when nothing answers on the port. */
  async status() {
    try {
      const res = await this.#fetch("/api/status", { timeoutMs: 4000 });
      return { reachable: true, ...(await res.json()) };
    } catch (err) {
      return { reachable: false, active: false, error: err.cause?.code ?? err.name };
    }
  }

  /** Admin session for this client. Success is proven by the first admin-only call. */
  async adminAuth() {
    if (this.admin) return;
    const worldActive = (await this.status()).active;
    const res = await this.#fetch("/auth", { method: "POST", body: { adminPassword: readAdminPassword() } });
    const where = res.headers.get("location") ?? "";
    // No world: success redirects to /setup, failure back to /auth. With a world active it
    // redirects to /auth either way (auth.mjs: `!world && success ? setup : auth`) — the
    // session still gets its admin flag, and a wrong password shows up as 403 on the next
    // admin call (`doctor` also checks the password offline against Config/admin.txt).
    if (!worldActive && where.endsWith("/auth")) {
      throw new CliError("Foundry rejected the stored administrator password.", {
        code: "auth-failed", hint: "The password changed? Ask the GM to re-run dev/agent/Set-AgentSecret.ps1."
      });
    }
    this.admin = true;
  }

  async shutdownWorld() {
    await this.adminAuth();
    const r = await this.#json("/join", { method: "POST", body: { action: "shutdown" }, timeoutMs: 60_000 });
    if (r.status !== "success") throw new CliError(`World shutdown failed: ${r.message ?? JSON.stringify(r)}`, { code: "shutdown-failed" });
    return r;
  }

  async quit() {
    await this.adminAuth();
    try {
      // Foundry answers {status:"failed"} before quitting, success or not; the process
      // disappearing is the real answer, so callers poll for that.
      await this.#fetch("/quit", { method: "POST", body: {}, timeoutMs: 5000 });
    } catch { /* the connection may die with the server */ }
  }

  async setup(action, body = {}, { timeoutMs = 60_000 } = {}) {
    await this.adminAuth();
    const r = await this.#json("/setup", { method: "POST", body: { action, ...body }, timeoutMs });
    if (r.error || r.httpStatus) throw new CliError(`Setup action ${action} failed: ${r.error ?? r.message}`, { code: "setup-failed", details: { httpStatus: r.httpStatus } });
    return r;
  }

  launchWorld(world) {
    return this.setup("launchWorld", { world });
  }

  /** `launch: true` runs firstLaunch, which logs this session in as the world's first user. */
  async createWorld({ id, title, system, description, launch = false }) {
    await this.adminAuth();
    const r = await this.#json("/create", { method: "POST", body: { action: "createWorld", id, title, system, description, launch }, timeoutMs: 120_000 });
    if (r.error || r.httpStatus) throw new CliError(`createWorld failed: ${r.error ?? r.message}`, { code: "setup-failed" });
    return r;
  }

  /**
   * Make this client's session a logged-in session of `userId` in the active world.
   * Returns the session id, which a browser can adopt as its `session` cookie.
   */
  async loginAs(userId) {
    await this.adminAuth();
    const r = await this.#json("/join", { method: "POST", body: { action: "loginAs", userId } });
    if (r.status !== "success") {
      throw new CliError(`loginAs failed: ${r.message ?? JSON.stringify(r)}`, {
        code: r.httpStatus === 403 ? "auth-failed" : "login-failed",
        hint: r.httpStatus === 403 ? "The admin session was refused — check the stored password with `fvtt doctor`." : undefined
      });
    }
    return this.session;
  }

  /** The world's users via the `getJoinData` socket event (needs an active world). */
  async users() {
    if (!this.session) await this.#fetch("/join");
    const data = await socketCall(this.base, this.session, "getJoinData");
    return (data?.users ?? []).map(u => ({ id: u._id, name: u.name, role: u.role, gm: u.role >= 3 }));
  }
}

/**
 * Minimal socket.io v4 client over Node's WebSocket: open, connect the default namespace,
 * wait for Foundry's "session" event, emit one event with an ack, close.
 */
export function socketCall(baseUrl, sessionId, event, ...args) {
  const url = `${baseUrl.replace(/^http/, "ws")}/socket.io/?EIO=4&transport=websocket`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { cookie: `session=${sessionId}` } });
    const timer = setTimeout(() => { ws.close(); reject(new CliError(`socket ${event}: timed out`)); }, 15_000);
    const done = (fn, v) => { clearTimeout(timer); ws.close(); fn(v); };
    ws.onerror = e => done(reject, new CliError(`socket ${event}: ${e.message ?? "connection error"}`));
    ws.onmessage = ({ data }) => {
      const msg = String(data);
      if (msg.startsWith("0")) return ws.send("40");               // engine.io open → connect "/"
      if (msg === "2") return ws.send("3");                          // ping → pong
      if (msg.startsWith("42")) {                                    // event
        const [name] = JSON.parse(msg.slice(2));
        if (name === "session") ws.send(`420${JSON.stringify([event, ...args])}`);
        return;
      }
      if (msg.startsWith("430")) return done(resolve, JSON.parse(msg.slice(3))[0]);
      if (msg.startsWith("44")) return done(reject, new CliError(`socket ${event}: connect refused ${msg.slice(2)}`));
    };
  });
}
