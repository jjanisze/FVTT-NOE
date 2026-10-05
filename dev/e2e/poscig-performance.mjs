/** Browser-side foreground sampling, also used for the pre-change baseline. */
export async function measure({ duration = 60000 } = {}) {
  if (document.visibilityState !== "visible") throw new Error("Performance sampling requires a foreground tab");
  const frames = new Float64Array(Math.ceil(duration / 2));
  const heap = [];
  const ticker = [];
  const start = performance.now();
  game.neuroshima.poscig.tlo.stats?.(true);
  game.neuroshima.poscig.ruch?.stats(true);
  let prior = start, count = 0, hidden = false, raf = 0;
  const canvasFrame = () => {
    const now = performance.now();
    if (count < frames.length) frames[count++] = now - prior;
    prior = now;
  };
  canvas.app.ticker.add(canvasFrame, null, PIXI.UPDATE_PRIORITY.LOW - 1);
  const sampleHeap = () => {
    heap.push({ ms: performance.now() - start, bytes: performance.memory?.usedJSHeapSize ?? null });
    ticker.push(canvas.app.ticker.FPS);
  };
  sampleHeap();
  const timer = setInterval(sampleHeap, 1000);
  await new Promise(resolve => {
    function frame(now) {
      hidden ||= document.visibilityState !== "visible";
      raf++;
      if (now - start >= duration) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  clearInterval(timer);
  canvas.app.ticker.remove(canvasFrame, null);
  sampleHeap();
  if (hidden) throw new Error("Tab left the foreground during performance sampling");
  const elapsed = prior - start;
  const sorted = Array.from(frames.subarray(0, count)).sort((a, b) => a - b);
  const layer = canvas.primary.children.find(c => c.sortLayer === 100);
  const bases = new Set();
  function textures(c) {
    if (c.texture?.baseTexture) bases.add(c.texture.baseTexture);
    for (const child of c.children ?? []) textures(child);
  }
  if (layer) textures(layer);
  const textureBytes = [...bases].reduce((n, b) => n + b.realWidth * b.realHeight * 4 * (b.mipmap ? 4 / 3 : 1), 0);
  return {
    elapsedMs: elapsed, frames: count, fps: count * 1000 / elapsed, raf,
    p95Ms: sorted[Math.floor(sorted.length * .95)],
    tickerFps: ticker.reduce((a, b) => a + b, 0) / ticker.length,
    textureMiB: textureBytes / 1048576, heap,
    tickerCost: game.neuroshima.poscig.tlo.stats?.() ?? null,
    swayCost: game.neuroshima.poscig.ruch?.stats() ?? null,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    lanes: canvas.scene.getFlag("neuroshima-2026-overrides", "poscig")?.tory,
    tokens: canvas.tokens.placeables.length
  };
}
