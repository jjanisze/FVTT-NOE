/**
 * e2e client windows: none fully covered by another (Chrome throttles a covered window as hidden), none below
 * Foundry's minimum size. `npm run test:agent`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cascadeLayout } from "../lib/cdp.mjs";

const covers = (a, b) => a.left <= b.left && a.top <= b.top
  && a.left + a.width >= b.left + b.width && a.top + a.height >= b.top + b.height;

for (const [label, area] of [
  ["a 1440p screen", { left: 0, top: 0, width: 2560, height: 1392 }],
  ["a secondary screen left of the primary", { left: -2560, top: 0, width: 2560, height: 1392 }],
  ["a laptop screen", { left: 0, top: 0, width: 1366, height: 728 }]
]) {
  test(`cascade on ${label}: no window covers another, Foundry's minimum kept`, () => {
    for (let n = 1; n <= 6; n++) {
      const w = cascadeLayout(n, area);
      assert.equal(w.length, n);
      for (const b of w) assert.ok(b.width >= 1024 && b.height >= 700, `${n} windows: ${b.width}×${b.height}`);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i !== j) assert.ok(!covers(w[j], w[i]), `${n} windows: #${j} covers #${i}`);
      }
      assert.deepEqual([w[0].left, w[0].top], [area.left, area.top], "the first window starts at the area's corner");
    }
  });
}
