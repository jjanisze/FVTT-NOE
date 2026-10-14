/**
 * Where Poligon code may run (PLAN_human_testing.md §3.2).
 *
 * By construction it can only reach the browser on a non-campaign data path: it is served at
 * `/agent-poligon/…` through a junction `fvtt` creates there, and only the Poligon world's own loader
 * imports it. This check is the second lock: the loader stamps the page with the world it was
 * written for (`globalThis.__poligon`), and agent sandbox worlds (`agent-…`, where the `poligon` e2e
 * suite builds every station) are the only other place allowed. The campaign has no loader, so no
 * stamp, so nothing here runs there even if the files were reachable.
 */

export const MODULE_ID = "neuroshima-2026-overrides";

/** `"poligon"` (the GM's world), `"klon"` (a campaign clone on the Poligon path), `"sandbox"`, or null. */
export function poligonKind() {
  const id = globalThis.game?.world?.id;
  if (!id) return null;
  const stamp = globalThis.__poligon;
  if (stamp && stamp.world === id) return stamp.kind ?? "poligon";
  if (/^agent-[a-z0-9-]+$/.test(id)) return "sandbox";
  return null;
}

export function assertPoligon(what = "Poligon") {
  const kind = poligonKind();
  if (!kind) throw new Error(`${what}: refused — world "${globalThis.game?.world?.id}" is not the Poligon or an agent sandbox.`);
  return kind;
}
