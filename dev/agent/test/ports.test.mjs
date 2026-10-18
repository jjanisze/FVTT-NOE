import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { BAD_PORTS, listenOnSafePort } from "../lib/ports.mjs";

/** A server the OS hands the given ports to, in order. */
function stubServer(ports) {
  const server = new EventEmitter();
  let current = null;
  server.listen = (port, host, cb) => { current = ports.shift(); (cb ?? host)(); };
  server.address = () => ({ port: current });
  server.close = cb => { current = null; cb(); };
  return server;
}

test("a bad port from the OS is released and another one taken", async () => {
  const server = stubServer([10080, 6667, 30123]);
  assert.equal(await listenOnSafePort(server, "127.0.0.1"), 30123);
});

test("the list covers what fetch refuses", async () => {
  for (const port of [10080, 6000, 5060]) {
    assert.ok(BAD_PORTS.has(port));
    await assert.rejects(fetch(`http://127.0.0.1:${port}/`), err => /bad port/.test(err.cause?.message ?? err.message));
  }
});
