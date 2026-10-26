/** Retain generated pixels in CPU memory so PIXI can upload them after a GPU reset. */
export function durableCanvasBase(source, options = {}) {
  const width = source.width, height = source.height;
  const pixels = source.getContext("2d").getImageData(0, 0, width, height).data;
  // Canvas readback is straight RGBA. BufferResource uploads raw bytes, so premultiply
  // explicitly to preserve the existing canvas texture's antialiased/blurred edges.
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    pixels[i] = Math.round(pixels[i] * alpha);
    pixels[i + 1] = Math.round(pixels[i + 1] * alpha);
    pixels[i + 2] = Math.round(pixels[i + 2] * alpha);
  }
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  const base = PIXI.BaseTexture.fromBuffer(bytes, width, height, {
    mipmap: PIXI.MIPMAP_MODES.OFF, scaleMode: PIXI.SCALE_MODES.LINEAR,
    ...options, alphaMode: PIXI.ALPHA_MODES.PMA
  });
  // The bounded scenery cache owns the bytes; discard the temporary drawing surface.
  source.width = source.height = 1;
  return base;
}

/** Repair only PIXI's documented solid-white canvas, shared by Graphics and sprites.
 * Chromium may discard Canvas2D pixels as well as the WebGL context on sleep/resume.
 * Texture.valid only checks dimensions and cannot detect this loss.
 */
export function watchChaseTextures(renderer) {
  const base = PIXI.Texture.WHITE.baseTexture, source = base.resource?.source;
  let restores = 0, repairs = 0, lastFrame = performance.now(), uid = renderer.CONTEXT_UID;
  function repairWhite() {
    if (!source?.getContext) return;
    const ctx = source.getContext("2d");
    if (ctx.isContextLost?.()) return;
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    if (pixel.every(v => v === 255)) return;
    ctx.save(); ctx.resetTransform(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "copy";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, source.width, source.height); ctx.restore();
    base.update(); repairs++;
  }
  function restored() { restores++; uid = renderer.CONTEXT_UID; repairWhite(); }
  function visible() { if (!document.hidden) repairWhite(); }
  renderer.view.addEventListener("webglcontextrestored", restored);
  source?.addEventListener("contextrestored", repairWhite);
  document.addEventListener("visibilitychange", visible);
  window.addEventListener("pageshow", repairWhite);
  repairWhite();
  return {
    tick() {
      const now = performance.now();
      if (uid !== renderer.CONTEXT_UID) { uid = renderer.CONTEXT_UID; repairWhite(); }
      else if (now - lastFrame > 2000) repairWhite();
      lastFrame = now;
    },
    stats: () => ({ textureStorage: "cpu-rgba", graphicsContextRestores: restores, whiteTextureRepairs: repairs }),
    destroy() {
      renderer.view.removeEventListener("webglcontextrestored", restored);
      source?.removeEventListener("contextrestored", repairWhite);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pageshow", repairWhite);
    }
  };
}
