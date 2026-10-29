/** Real token meshes, two clients, pixel clipping/orientation, lifetime and a small frame-time sample. */
export default {
  name: "woda-efekty", clients: ["gm", "Gracz 1"],
  async run(t) {
    const player = t.client("Gracz 1");
    let gallery;
    await t.step("Water gallery builds without resetting any existing scene", async () => {
      for (const c of [t.gm, player]) await c.eval(async () =>
        game.settings.set("neuroshima-2026-overrides", "animacjaZanurzenia", true));
      gallery = await t.gm.eval(async () => {
        if (!game.poligon) {
          const state = await import("/agent-poligon/lib/state.mjs");
          if (!game.settings.settings.has("world.poligonStan")) state.registerStateSettings();
          game.poligon = await (await import("/agent-poligon/api.mjs")).createApi("sandbox");
        }
        const { Kit, clearStation } = await import("/agent-poligon/lib/kit.mjs");
        const { zbudujGrafikeZanurzenia } = await import("/agent-poligon/stations/arena-woda.mjs");
        // Only this sandbox fixture, never the GM's Poligon. A failed prior run may leave a hidden sample.
        await clearStation("arena");
        const before = game.scenes.map(s => ({ id: s.id, data: JSON.stringify(s.toObject()) }));
        const k = new Kit(game.poligon.stations.get("arena"));
        const r = await zbudujGrafikeZanurzenia(k);
        const scene = game.scenes.get(r.scene);
        const preserved = before.every(s => JSON.stringify(game.scenes.get(s.id).toObject()) === s.data);
        await scene.activate();
        return { ...r, missing: k.missing, preserved,
          human: scene.tokens.find(d => d.flags["neuroshima-2026-overrides"]?.waterArtSample === "rotation-0").id };
      });
      t.assert(gallery.preserved && !gallery.missing.length, "existing scene contents preserved", gallery);
      for (const c of [t.gm, player]) await t.waitFor(c, () => canvas.ready
        && canvas.scene.flags["neuroshima-2026-overrides"]?.waterArtGallery
        && game.neuroshima.woda.efekty.diagnostyka().aktywne === 10, { message: "ten silhouette filters drawn" });
      for (const c of [t.gm, player]) {
        const d = await c.eval(() => game.neuroshima.woda.efekty.diagnostyka());
        t.assert(d.ticker && d.zetony.every(x => x.podpiety && x.sila === 0.8), "default strength and shared ticker", d);
        t.equal(new Set(d.zetony.map(x => x.tekstura)).size, 1, "one shared texture per client");
        t.equal(d.zetony.filter(x => x.profil === "metna").length, 6, "default and Region muddy profiles");
        t.equal(d.zetony.filter(x => x.profil === "sciekowa").length, 2, "sewage Region profile");
        t.equal(d.zetony.filter(x => x.profil === "czysta").length, 2, "clean Region profile");
      }
      const start = await player.eval(() => game.neuroshima.woda.efekty.diagnostyka().zetony[0].czas);
      await t.waitFor(player, start => game.neuroshima.woda.efekty.diagnostyka().zetony[0].czas > start + 0.15,
        { args: [start], message: "animation advances on the player client" });
      await t.screenshot("Gracz 1", "three water profiles and four token rotations");
    });

    await t.step("Water changes only opaque lower silhouette pixels at every token angle", async () => {
      await t.gm.eval(async () => game.settings.set("neuroshima-2026-overrides", "animacjaZanurzenia", false));
      for (const rotation of [0, 90, 180, 270]) {
        const r = await t.gm.eval(async ({ id, rotation }) => {
          const token = canvas.tokens.get(id);
          await token.document.update({ rotation }, { animate: false });
          await __e2e.quiet();
          const mesh = token.mesh, renderer = canvas.app.renderer;
          const filter = mesh.filters.find(f => f.token === token);
          // Test the low-water extreme; the new upper extreme intentionally reaches above the midpoint.
          filter.uniforms.uCzas = Math.PI / 2 / 1.12;
          const rt = PIXI.RenderTexture.create({ width: renderer.screen.width, height: renderer.screen.height, resolution: 1 });
          const capture = enabled => {
            filter.enabled = enabled;
            renderer.render(mesh, { renderTexture: rt, clear: true, skipUpdateTransform: true });
            return renderer.extract.pixels(rt);
          };
          let dry, wet;
          try { dry = capture(false); wet = capture(true); }
          finally { filter.enabled = true; filter.uniforms.uCzas = 0; rt.destroy(true); }
          const u = filter.uniforms, width = renderer.screen.width;
          let alphaErrors = 0, outside = 0, changedTop = 0, changedBottom = 0, bottom = 0;
          for (let i = 0; i < dry.length; i += 4) {
            if (Math.abs(dry[i + 3] - wet[i + 3]) > 2) alphaErrors++;
            if (!dry[i + 3] && wet[i + 3]) outside++;
            if (dry[i + 3] < 220) continue;
            const y = Math.floor(i / 4 / width);
            const delta = Math.max(...[0, 1, 2].map(c => Math.abs(dry[i + c] - wet[i + c])));
            if (y < u.uSrodek[1] - u.uWysokosc * 0.11 && delta > 5) changedTop++;
            if (y > u.uSrodek[1] + u.uWysokosc * 0.10) { bottom++; if (delta > 5) changedBottom++; }
          }
          return { rotation, alphaErrors, outside, changedTop, changedBottom, bottom, center: [...u.uSrodek] };
        }, { id: gallery.human, rotation });
        t.equal(r.outside, 0, "no water outside silhouette", r);
        t.equal(r.alphaErrors, 0, "token alpha preserved", r);
        t.equal(r.changedTop, 0, "upper screen half stays dry at " + rotation, r);
        // Valleys between wave fronts deliberately reveal the token; do not require a uniform painted half.
        t.assert(r.bottom > 20 && r.changedBottom / r.bottom > 0.55, "lower screen half has water at " + rotation, r);
      }
      await t.gm.eval(async id => canvas.scene.tokens.get(id).update({ rotation: 0 }, { animate: false }), gallery.human);
    });

    await t.step("Readable wave crests, alpha tails and motion compared with the original painting", async () => {
      const metrics = await t.gm.eval(async id => {
        await game.settings.set("neuroshima-2026-overrides", "animacjaZanurzenia", false);
        const token = canvas.tokens.get(id), mesh = token.mesh, renderer = canvas.app.renderer;
        await canvas.animatePan({ x: token.center.x, y: token.center.y, scale: 2.3, duration: 0 });
        await __e2e.quiet();
        const water = mesh.filters.find(f => f.token === token);
        const { PROFILE_WODY } = await import("/modules/neuroshima-2026-overrides/scripts/scenes/woda-efekty.mjs");
        const original = await foundry.canvas.loadTexture("modules/neuroshima-2026-overrides/vfx/water-surface.webp");
        const rt = PIXI.RenderTexture.create({ width: renderer.screen.width, height: renderer.screen.height, resolution: 1 });
        const capture = () => {
          renderer.render(mesh, { renderTexture: rt, clear: true, skipUpdateTransform: true });
          const image = renderer.extract.canvas(rt);
          const out = document.createElement("canvas");out.width = out.height = 210;
          const center = water.uniforms.uSrodek, h = water.uniforms.uWysokosc;
          out.getContext("2d").drawImage(image, center[0] - h / 2, center[1] - h / 2, h, h, 0, 0, 210, 210);
          return out;
        };
        const panel = document.createElement("div");panel.id = "water-comparison";
        panel.style.cssText = "position:fixed;inset:0;z-index:100000;background:#232923;overflow:auto;padding:22px;color:white;font:18px system-ui;";
        const board = document.createElement("canvas");board.width = 1180;board.height = 930;
        const ctx = board.getContext("2d");ctx.fillStyle = "#53594f";ctx.fillRect(0,0,1180,930);
        const text = (s,x,y) => {ctx.fillStyle = "#f7f3e7";ctx.font = "20px system-ui";ctx.fillText(s,x,y);};
        text("WODA · porównanie przy sile 80%",24,32);
        ["Pierwotna grafika", "Mętna · poprawka", "Ścieki · poprawka", "Czysta · poprawka"].forEach((s,i)=>text(s,24+i*290,70));
        const dryFilters = mesh.filters;
        mesh.filters = dryFilters.filter(f=>f!==water);
        const dry = capture();mesh.filters = dryFilters;
        const ref = document.createElement("canvas");ref.width=ref.height=210;
        const rc = ref.getContext("2d");rc.drawImage(dry,0,0);
        rc.globalCompositeOperation="source-atop";rc.globalAlpha=.8;
        rc.drawImage(original.baseTexture.resource.source,0,0,210,210);
        ctx.drawImage(ref,24,86);
        const result = [];
        let col=1;
        for(const [key,p] of Object.entries(PROFILE_WODY)) {
          water.uniforms.uKolor.set(p.kolor);water.uniforms.uJasny.set(p.jasny);water.uniforms.uMetnosc=p.metnosc;
          water.uniforms.uCzas=0;const a=capture();ctx.drawImage(a,24+col*290,86);
          water.uniforms.uCzas=.65;const b=capture();ctx.drawImage(b,24+col*290,350);
          water.uniforms.uCzas=1.3;ctx.drawImage(capture(),24+col*290,614);
          const aa=a.getContext("2d").getImageData(0,0,210,210).data,bb=b.getContext("2d").getImageData(0,0,210,210).data;
          let changed=0,body=0;
          for(let i=0;i<aa.length;i+=4)if(aa[i+3]>220&&Math.floor(i/4/210)>110){body++;if(Math.max(...[0,1,2].map(c=>Math.abs(aa[i+c]-bb[i+c])))>15)changed++;}
          result.push({key,body,motion:changed/body});col++;
        }
        text("t = 0,00 s",24,326);text("t = 0,65 s",24,590);text("t = 1,30 s",24,854);
        panel.append(board);document.body.append(panel);
        rt.destroy(true);water.uniforms.uCzas=0;game.neuroshima.woda.efekty.odswiez();
        return result;
      }, gallery.human);
      for(const r of metrics)t.assert(r.body>30&&r.motion>.20,"visible wave motion for "+r.key,r);
      await t.screenshot("gm", "original painting versus readable waves at three animation phases");
      await t.gm.eval(async () => {document.querySelector("#water-comparison")?.remove();await canvas.animatePan({x:750,y:590,scale:.65,duration:0});});
    });

    await t.step("Animation can stop per user; live Region edits update the palette and strength", async () => {
      const r = await t.gm.eval(async () => {
        const region = canvas.scene.regions.find(r => r.name === "CZYSTA"), b = region.behaviors.contents[0];
        await b.update({ "system.wyglad": "sciekowa", "system.silaEfektu": 0.65 });
        return { id: b.id, region: region.id };
      });
      for (const c of [t.gm, player]) await t.waitFor(c, () => game.neuroshima.woda.efekty.diagnostyka().zetony.filter(x => x.profil === "sciekowa" && x.sila === 0.65).length === 2);
      const gm = await t.gm.eval(() => game.neuroshima.woda.efekty.diagnostyka());
      t.assert(!gm.ticker && gm.zetony.every(x => x.czas === 0), "static fallback stops its ticker");
      t.assert(await player.eval(() => game.neuroshima.woda.efekty.diagnostyka().ticker), "player still animates");
      await t.gm.eval(async ({ id, region }) => {
        await canvas.scene.regions.get(region).behaviors.get(id).update({ "system.wyglad": "czysta", "system.silaEfektu": 0.8 });
        await game.settings.set("neuroshima-2026-overrides", "animacjaZanurzenia", true);
      }, r);
    });

    await t.step("Texture changes, mirroring and core invisibility coexist with the water filter", async () => {
      const r = await t.gm.eval(async id => {
        const token = canvas.tokens.get(id), original = token.document.toObject().texture;
        await token.document.update({ "texture.src": "modules/neuroshima-2026-overrides/tokens/pies-bojowy.webp", "texture.scaleX": -1.4, "texture.scaleY": 1.4 }, { animate: false });
        await token.actor.toggleStatusEffect("invisible", { active: true });
        await __e2e.quiet();
        const water = token.mesh.filters.find(f => f.token === token);
        const other = token.mesh.filters.filter(f => f !== water);
        const before = other.length;
        await game.neuroshima.woda.wynurz(token.actor);
        await __e2e.quiet();
        const kept = other.every(f => token.mesh.filters.includes(f));
        await token.actor.toggleStatusEffect("invisible", { active: false });
        await token.document.update({ texture: original }, { animate: false });
        await token.actor.toggleStatusEffect("podWoda", { active: true });
        return { water: !!water, other: before, kept };
      }, gallery.human);
      t.assert(r.water && r.other > 0 && r.kept, "water removal preserves the native invisibility filter", r);
      for (const c of [t.gm, player]) await t.waitFor(c, () => game.neuroshima.woda.efekty.diagnostyka().aktywne === 10);
    });

    await t.step("Gallery reopen is idempotent; a small render sample records filter cost", async () => {
      const r = await t.gm.eval(async () => {
        const { Kit } = await import("/agent-poligon/lib/kit.mjs");
        const { zbudujGrafikeZanurzenia } = await import("/agent-poligon/stations/arena-woda.mjs");
        const before = JSON.stringify(canvas.scene.toObject());
        const r = await zbudujGrafikeZanurzenia(new Kit(game.poligon.stations.get("arena")));
        const preserved = before === JSON.stringify(canvas.scene.toObject());
        const filters = canvas.tokens.placeables.flatMap(t => (t.mesh.filters ?? []).filter(f => f.token === t));
        const sample = enabled => {
          for (const f of filters) f.enabled = enabled;
          for (let i = 0; i < 8; i++) canvas.app.render();
          const start = performance.now();
          for (let i = 0; i < 40; i++) canvas.app.render();
          return (performance.now() - start) / 40;
        };
        let off, couple, on;
        try {
          off = sample(false);
          for (const [i, f] of filters.entries()) f.enabled = i < 2;
          for (let i = 0; i < 8; i++) canvas.app.render();
          const start = performance.now();
          for (let i = 0; i < 40; i++) canvas.app.render();
          couple = (performance.now() - start) / 40;
          on = sample(true);
        }
        finally { for (const f of filters) f.enabled = true; }
        return { preserved, reused: r.reused, filters: filters.length, cpuMsPerRender: { off, couple, on } };
      });
      t.assert(r.preserved && r.reused, "reopening preserves manual placements", r);
      t.equal(r.filters, 10, "no duplicated filters", r);
      // Informational CPU submission time, not a GPU benchmark or an FPS guarantee.
      console.log("water render sample", JSON.stringify(r.cpuMsPerRender));
      await t.screenshot("gm", "animated water gallery after lifecycle checks");
    });

    await t.step("Dynamic rings keep their native shader; hidden tokens stay hidden from players", async () => {
      await player.eval(() => canvas.tokens.releaseAll());
      const r = await t.gm.eval(async id => {
        const token = canvas.tokens.get(id);
        const ring = token.document.toObject().ring;
        await token.document.update({ "ring.enabled": true }, { animate: false });
        await __e2e.quiet();
        const result = { ring: !!token.ring, shader: token.mesh.shader.constructor.name,
          water: token.mesh.filters.some(f => f.token === token) };
        await token.document.update({ hidden: true }, { animate: false });
        return { ...result, ringData: ring };
      }, gallery.human);
      t.assert(r.ring && /TokenRing/.test(r.shader) && r.water, "ring shader and water coexist", r);
      await t.waitFor(player, id => !canvas.tokens.get(id).isVisible && !canvas.tokens.get(id).mesh.visible,
        { args: [gallery.human], message: "water cannot reveal hidden token" });
      await t.gm.eval(async ({ id, ring }) => canvas.scene.tokens.get(id).update({ hidden: false, ring }, { animate: false }),
        { id: gallery.human, ring: r.ringData });
    });

    await t.step("Scene teardown removes every filter and the shared ticker on both clients", async () => {
      const fixture = await t.gm.eval(() => game.scenes.find(s => s.id !== canvas.scene.id && s.tokens.some(t => t.name === "PC Gracz 1"))?.id);
      await t.gm.eval(async id => game.scenes.get(id).activate(), fixture);
      for (const c of [t.gm, player]) await t.waitFor(c, () => canvas.ready && !game.neuroshima.woda.efekty.diagnostyka().aktywne
        && !game.neuroshima.woda.efekty.diagnostyka().ticker, { message: "water resources removed on scene teardown" });
    });
  }
};
