/** Reproduce sleep's GL reset plus the erased shared Canvas2D source observed live. */
export default {
  name: "texture-resume", clients: ["gm", "Gracz 1"], fixture: "poscig",
  async run(t) {
    const clients = [["gm", t.gm], ["Gracz 1", t.client("Gracz 1")]];
    for (const [, client] of clients) await t.waitFor(client, id => canvas.ready && canvas.scene?.id === id,
      { args: [t.fixture.scene.id], message: "chase fixture drawn" });
    for (const [, client] of clients) await client.eval(() => {
      document.querySelector('.tour [data-action="exit"]')?.click();
      for (const close of document.querySelectorAll('#notifications .notification .close')) close.click();
    });
    for (const theme of ["zima", "przedmiescia", "pustynia"]) {
      await t.gm.eval(theme => game.neuroshima.poscig.konfiguruj(canvas.scene, { motyw: theme, tempoTla: 2 }), theme);
      for (const [, client] of clients) await t.waitFor(client, theme => {
        const s = game.neuroshima.poscig.tlo.stats();
        return s.theme === theme && s.ready && s.travelDistance > 200 && (theme !== "zima" || s.tyreEmitted > 20);
      }, { args: [theme], message: `${theme}: moving route and effects ready` });
      await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene, { tempoTla: 0 }));
      for (const [name, client] of clients) await t.step(`${theme}, ${name}: pixels survive context loss without rebuilding the route`, async () => {
        t.assert(await client.eval(() => (window.__textureResumeFreed ?? []).every(({ base, resource }) =>
          base.destroyed && resource.destroyed && resource.data === null)), "previous theme retained CPU pixel buffers");
        await t.waitFor(client, () => canvas.scene.getFlag("neuroshima-2026-overrides", "poscig").tempoTla === 0,
          { message: "paused route replicated" });
        const before = await client.eval(() => {
          const renderer = canvas.app.renderer, bases = new Set();
          function visit(node) {
            for (const base of node.neuroshimaTextureBases?.() ?? []) bases.add(base);
            if (node.texture?.baseTexture?.resource?.data) bases.add(node.texture.baseTexture);
            for (const child of node.children ?? []) visit(child);
          }
          for (const node of canvas.primary.children.filter(c => c.neuroshimaPoscig)) visit(node);
          const snapshot = base => {
            const sprite = new PIXI.Sprite(new PIXI.Texture(base)); sprite.width = sprite.height = 64;
            const target = PIXI.RenderTexture.create({ width: 64, height: 64 });
            try {
              renderer.render(sprite, { renderTexture: target, clear: true });
              const pixels = renderer.extract.pixels(target);
              let hash = 2166136261, alpha = 0;
              for (let i = 0; i < pixels.length; i++) { hash = Math.imul(hash ^ pixels[i], 16777619); if (i % 4 === 3) alpha += pixels[i]; }
              return { hash: hash >>> 0, alpha };
            } finally { sprite.destroy({ texture: true, baseTexture: false }); target.destroy(true); }
          };
          const retained = [...bases].filter(b => b.resource?.data).map(base => ({ base, resource: base.resource, pixels: snapshot(base) }));
          window.__textureResume = { retained, snapshot, uid: renderer.CONTEXT_UID,
            documents: JSON.stringify(canvas.scene.toObject()), stats: game.neuroshima.poscig.tlo.stats() };
          return { buffers: retained.length, pixels: retained.map(r => r.pixels), stats: window.__textureResume.stats };
        });
        t.assert(before.buffers >= (theme === "zima" ? 6 : 3) && before.pixels.every(p => p.alpha > 0),
          "generated sources must have real rendered pixels", before);
        await client.eval(() => {
          const renderer = canvas.app.renderer, source = PIXI.Texture.WHITE.baseTexture.resource.source;
          // Unlike WEBGL_lose_context alone, sleep erased this Canvas2D backing store too.
          source.getContext("2d").clearRect(0, 0, source.width, source.height);
          PIXI.Texture.WHITE.baseTexture.update();
          const extension = renderer.gl.getExtension("WEBGL_lose_context");
          if (!extension) throw new Error("WEBGL_lose_context unavailable: regression cannot be exercised");
          extension.loseContext();
        });
        await t.waitFor(client, () => {
          const r = canvas.app.renderer;
          return !r.gl.isContextLost() && r.CONTEXT_UID !== window.__textureResume.uid;
        }, { timeoutMs: 20_000, message: "PIXI restores the real WebGL context" });
        const after = await client.eval(() => {
          const saved = window.__textureResume, renderer = canvas.app.renderer;
          const rows = saved.retained.map(({ base, resource, pixels }) => ({
            retained: !base.destroyed && base.resource === resource && !!resource.data?.byteLength,
            before: pixels, after: saved.snapshot(base), uploaded: !!base._glTextures[renderer.CONTEXT_UID]
          }));
          const white = PIXI.Texture.WHITE.baseTexture.resource.source.getContext("2d").getImageData(0, 0, 1, 1).data;
          const result = { rows, white: [...white], whiteRendered: saved.snapshot(PIXI.Texture.WHITE.baseTexture),
            documents: JSON.stringify(canvas.scene.toObject()) === saved.documents,
            stats: game.neuroshima.poscig.tlo.stats(), previous: saved.stats };
          window.__textureResumeFreed = saved.retained.map(({ base, resource }) => ({ base, resource }));
          delete window.__textureResume;
          canvas.pan({ x: canvas.scene.width / 2, y: 850, scale: .53 });
          return result;
        });
        t.assert(after.rows.every(r => r.retained && r.uploaded && r.before.hash === r.after.hash && r.after.alpha > 0),
          "context restoration changed or lost rendered texture pixels", after.rows);
        t.assert(after.white.every(v => v === 255) && after.whiteRendered.alpha === 64 * 64 * 255,
          "shared Graphics texture was not repaired", after);
        t.assert(after.documents && after.stats.travelDistance === after.previous.travelDistance
          && after.stats.catalogLoads === after.previous.catalogLoads
          && after.stats.tyreEmitted === after.previous.tyreEmitted,
          "recovery rewrote documents, reset travel/trails or rebuilt the scenery", after);
        t.assert(after.stats.graphicsContextRestores > 0 && after.stats.whiteTextureRepairs > 0,
          "recovery diagnostics missing", after.stats);
        // Canvas2D can restore after WebGL has already restored. Exercise that order too.
        const lateWhite = await client.eval(() => {
          const base = PIXI.Texture.WHITE.baseTexture, source = base.resource.source;
          const before = game.neuroshima.poscig.tlo.stats().whiteTextureRepairs;
          source.getContext("2d").clearRect(0, 0, source.width, source.height); base.update();
          source.dispatchEvent(new Event("contextrestored"));
          return { before, after: game.neuroshima.poscig.tlo.stats().whiteTextureRepairs,
            pixel: [...source.getContext("2d").getImageData(0, 0, 1, 1).data] };
        });
        t.assert(lateWhite.after === lateWhite.before + 1 && lateWhite.pixel.every(v => v === 255),
          "late Canvas2D restoration did not repair Graphics", lateWhite);
        t.log(theme, name, JSON.stringify({ buffers: before.buffers, gpuBytes: after.stats.residentTextureBytes,
          cpuBytes: after.stats.residentBufferBytes, restores: after.stats.graphicsContextRestores, whiteRepairs: after.stats.whiteTextureRepairs }));
        await t.screenshot(name, `${theme}-restored`);
      });
    }
    await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene, { motyw: "zima", tempoTla: 2 }));
    for (const [, client] of clients) {
      await t.waitFor(client, () => game.neuroshima.poscig.tlo.stats().theme === "zima", { message: "winter restored" });
      t.assert(await client.eval(() => {
        const freed = window.__textureResumeFreed.every(({ base, resource }) => base.destroyed && resource.destroyed && resource.data === null);
        delete window.__textureResumeFreed; return freed;
      }), "final theme retained CPU pixel buffers");
    }
  }
};
