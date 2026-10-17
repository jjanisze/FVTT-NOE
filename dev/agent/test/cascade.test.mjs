/**
 * e2e client windows: none fully covered by another (Chrome throttles a covered window as hidden), none below
 * Foundry's minimum size; background mode only when Chrome has all three no-throttle flags. `npm run test:agent`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cascadeLayout } from "../lib/cdp.mjs";
import { missingNoThrottleFlags, NO_THROTTLE_FLAGS } from "../lib/proc.mjs";

test("no-throttle flags: all three present, or each one missing is named", () => {
  const all = `"chrome.exe" --remote-debugging-port=1 --user-data-dir="x" ${NO_THROTTLE_FLAGS.join(" ")} --restore-last-session`;
  assert.deepEqual(missingNoThrottleFlags(all), []);
  assert.deepEqual(missingNoThrottleFlags(`"chrome.exe" --remote-debugging-port=1`), [...NO_THROTTLE_FLAGS]);
  const two = all.replace(" --disable-renderer-backgrounding", "");
  assert.deepEqual(missingNoThrottleFlags(two), ["--disable-renderer-backgrounding"]);
  // A longer flag that merely starts with one of ours does not count.
  assert.deepEqual(missingNoThrottleFlags("--disable-background-timer-throttling-x"), [...NO_THROTTLE_FLAGS]);
});

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
