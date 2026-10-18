/**
 * OS-assigned ports that a browser and Node's `fetch` will actually connect to.
 *
 * Windows' ephemeral range can start at 1024 (`netsh int ipv4 show dynamicport tcp`), so `listen(0)`
 * sometimes hands out a port from the Fetch standard's "bad port" list — Chrome answers
 * ERR_UNSAFE_PORT and `fetch` throws "bad port".
 */

import net from "node:net";

/** The Fetch standard's bad ports at or above 1024 (https://fetch.spec.whatwg.org/#port-blocking). */
export const BAD_PORTS = new Set([1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]);

/** `server.listen` on a port outside `BAD_PORTS`; resolves to the port. */
export async function listenOnSafePort(server, host) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      const done = () => { server.off("error", reject); resolve(); };
      if (host) server.listen(0, host, done);
      else server.listen(0, done);
    });
    const { port } = server.address();
    if (!BAD_PORTS.has(port)) return port;
    await new Promise(resolve => server.close(resolve));
  }
  throw new Error("No usable port after 20 attempts.");
}

/** A free port for another process to bind (sandbox Foundry servers). */
export async function freePort() {
  const srv = net.createServer();
  const port = await listenOnSafePort(srv);
  await new Promise(resolve => srv.close(resolve));
  return port;
}
