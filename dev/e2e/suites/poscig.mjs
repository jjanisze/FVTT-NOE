import fs from "node:fs";
import path from "node:path";

const MOD = "neuroshima-2026-overrides";

/** Browser-side sampling reads meshes and stored documents independently of the motion model. */
async function sampleMotion(duration = 1200) {
  const tokens = canvas.tokens.placeables;
  const before = tokens.map(t => ({id:t.id, x:t.document._source.x, y:t.document._source.y, rotation:t.document._source.rotation}));
  const samples = new Map(tokens.map(t => [t.id, {name:t.name, x:[], y:[], rotation:[]}]));
  const start = performance.now();
  await new Promise(resolve => {
    function frame() {
      for (const token of tokens) {
        const s = samples.get(token.id);
        s.x.push(token.mesh.x); s.y.push(token.mesh.y); s.rotation.push(token.mesh.rotation);
      }
      if (performance.now() - start >= duration) resolve(); else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  const span = xs => Math.max(...xs) - Math.min(...xs);
  return {
    motion: [...samples.values()].map(s => ({name:s.name, x:span(s.x), y:span(s.y), rotation:span(s.rotation)})),
    documentsStable: tokens.every(t => {
      const b = before.find(b => b.id === t.id), d = t.document._source;
      return b.x === d.x && b.y === d.y && b.rotation === d.rotation;
    }),
    restored: tokens.every(t => Math.abs(t.mesh.x - t.center.x) < 1e-6 && Math.abs(t.mesh.y - t.center.y) < 1e-6 && Math.abs(t.mesh.angle - t.document.rotation) < 1e-6)
  };
}

function latestBaseline(root) {
  const dir = path.join(root, "logs", "e2e");
  const runs = fs.readdirSync(dir).sort().reverse();
  for (const run of runs) {
    const file = path.join(dir, run, "baseline.json");
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return null;
}

export default {
  name: "poscig", clients: ["gm", "Gracz 1"], fixture: "poscig",
  async run(t) {
    const player = t.client("Gracz 1");
    for (const client of [t.gm, player]) {
      await t.waitFor(client, () => canvas.ready && canvas.scene?.tokens.size === 8 && canvas.tokens.placeables.length === 8,
        {message: "eight rendered chase vehicles"});
      await client.eval(async id => {
        document.querySelector('.tour [data-action="exit"]')?.click();
        await game.settings.set(id, "poscigVehicleSway", true);
        canvas.pan({x:1400,y:900,scale:.52});
      }, MOD);
    }

    await t.step("documents: south/east/north art faces right; the free zone keeps its rotation", async () => {
      const result = await t.gm.eval(() => canvas.scene.tokens.map(d => ({name:d.name, rotation:d._source.rotation})));
      for (const d of result) {
        const expected = d.name === "Strefa swobodna" ? 37 : d.name === "Pojazd 2" ? 0 : d.name === "Pojazd 3" ? 90 : 270;
        t.equal(d.rotation, expected, `${d.name} document rotation`);
      }
      const setting = await player.eval(id => game.settings.settings.get(`${id}.poscigVehicleSway`).scope, MOD);
      t.equal(setting, "user", "sway setting is per-user");
    });

    for (const [label, client] of [["GM", t.gm], ["player", player]]) {
      await t.step(`${label}: only the six snapped meshes sway; stored coordinates stay stable`, async () => {
        await client.front(0);
        const result = await client.eval(sampleMotion);
        t.assert(result.documentsStable, "sway changed stored documents", result);
        for (const m of result.motion) {
          if (/^Pojazd/.test(m.name)) t.assert(m.y > .2 && m.rotation > .001, `${m.name} does not sway on ${label}`, result);
          else t.assert(m.x === 0 && m.y === 0 && m.rotation === 0, `${m.name} sways on ${label}`, result);
        }
      });
    }

    let start1 = null;
    await t.step("player rotates and moves its token: right-facing enforcement shares the same update", async () => {
      const result = await player.eval(async () => {
        const L = game.neuroshima.poscig.LANE_W;
        const token = canvas.scene.tokens.getName("Pojazd 1");
        const x0 = token._source.x;
        await token.update({rotation:123}, {animate:false});
        const rotated = token._source.rotation;
        await token.update({y:1500, rotation:42}, {animate:false});
        const free = token._source.rotation;
        await token.update({x:x0+L, y:780, rotation:63}, {animate:false});
        return {rotated, free, band:token._source.rotation, x:token._source.x, y:token._source.y, x0, L};
      });
      start1 = result.x0;
      t.equal(result.rotated, 270, "manual rotation in band");
      t.equal(result.free, 42, "rotation on exit to free zone");
      t.equal(result.band, 270, "rotation on re-entry");
      t.equal(result.x, result.x0 + result.L, "movement x survived the orientation hook");
      t.equal(result.y, 780, "movement y survived the orientation hook");
      await t.waitFor(t.gm, x => canvas.scene.tokens.getName("Pojazd 1")._source.x === x, {args:[result.x0 + result.L], message:"player movement replicated"});
      await t.gm.eval(x => canvas.scene.tokens.getName("Pojazd 1").update({x}, {animate:false}), start1);
    });

    await t.step("D25: a piece moved between lanes is pulled back to the lane centre by the GM", async () => {
      const result = await player.eval(async x0 => {
        const P = game.neuroshima.poscig;
        const token = canvas.scene.tokens.getName("Pojazd 1");
        await token.update({x:x0 + 55}, {animate:false});
        return {centre:P.torX(P.xNaTor(x0 + P.LANE_W / 2)) - token.width * canvas.grid.size / 2};
      }, start1);
      await t.waitFor(t.gm, x => canvas.scene.tokens.getName("Pojazd 1")._source.x === x, {args:[result.centre], message:"piece snapped back to its lane"});
      const stray = await t.gm.eval(() => {
        const P = game.neuroshima.poscig, d = canvas.scene.tokens.getName("Między torami");
        const c = d._source.x + d.width * canvas.grid.size / 2;
        return Math.abs(c - P.torX(P.xNaTor(c)));
      });
      t.assert(stray > 1, "the stray token without a chase role stays between lanes", {stray});
    });

    await t.step("setting off restores meshes immediately and is independent on GM/player", async () => {
      await player.front(0);
      await t.waitFor(player, x => {
        const tk=canvas.tokens.placeables.find(t=>t.name==='Pojazd 1');
        return tk.document._source.x===x && Math.abs(tk.mesh.x-tk.center.x)<2;
      }, {args:[start1], message:"the preceding replicated move to settle before testing the setting"});
      const immediate = await player.eval(async id => {
        await game.settings.set(id, "poscigVehicleSway", false);
        return canvas.tokens.placeables.every(tk => tk.mesh.x === tk.center.x && tk.mesh.y === tk.center.y && Math.abs(tk.mesh.angle - tk.document.rotation) < 1e-6);
      }, MOD);
      t.assert(immediate, "meshes were not restored by the setting callback");
      const off = await player.eval(sampleMotion);
      t.assert(off.restored && off.motion.every(m => !m.x && !m.y && !m.rotation), "player meshes still move with setting off", off);
      t.equal(await t.gm.eval(id => game.settings.get(id, "poscigVehicleSway"), MOD), true, "GM setting stays on");
      await t.gm.front(0);
      const gmMotion = await t.gm.eval(sampleMotion,600);
      t.equal(gmMotion.motion.filter(m=>m.y>.02).length,6,"GM meshes still sway while the player's setting is off");
      await player.eval(id => game.settings.set(id, "poscigVehicleSway", true), MOD);
    });

    await t.step("stopped road stops sway; normal animation and recentering preserve lane geometry", async () => {
      await t.gm.front(0);
      await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene,{tempoTla:0}));
      const still = await t.gm.eval(sampleMotion);
      t.assert(still.restored && still.motion.every(m => !m.x && !m.y && !m.rotation), "stopped road still sways", still);
      await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene,{tempoTla:1}));
      const move = await t.gm.eval(async () => {
        const P = game.neuroshima.poscig, d = canvas.scene.tokens.getName("Pojazd 1");
        const cel = P.torX(4) - d.width * canvas.grid.size / 2;
        await d.update({x:cel}, {animation:{duration:700}});
        await new Promise(r => setTimeout(r,1100));
        return {x:d._source.x, cel, meshX:d.object.mesh.x, centre:P.torX(4), rotation:d._source.rotation};
      });
      t.equal(move.x, move.cel, "animated move finishes at destination");
      t.assert(Math.abs(move.meshX - move.centre) < 2, "mesh accumulated sway during movement", move);
      await t.gm.eval(x => canvas.scene.tokens.getName("Pojazd 1").update({x}, {animate:false}), start1);
      const recentered = await t.gm.eval(async () => {
        const P = game.neuroshima.poscig, scene = canvas.scene, d = scene.tokens.getName("Pojazd 6");
        const free = scene.tokens.getName("Strefa swobodna")._source.x;
        const half = d.width * scene.grid.size / 2;
        await d.update({x:P.torX(13) - half}, {animate:false});
        for (let i=0;i<40 && scene.getFlag("neuroshima-2026-overrides","poscig").offset !== 1;i++) await new Promise(r=>setTimeout(r,100));
        return {offset:scene.getFlag("neuroshima-2026-overrides","poscig").offset, x:d._source.x, last:P.torX(12) - half,
          free, freeAfter:scene.tokens.getName("Strefa swobodna")._source.x};
      });
      t.equal(recentered.offset, 1, "board recentred once");
      t.equal(recentered.x, recentered.last, "leader moved into last lane");
      t.equal(recentered.freeAfter, recentered.free, "free-zone token stays put");
      // Restore positions by name, never by createEmbeddedDocuments return order.
      await t.gm.eval(async () => {
        const P = game.neuroshima.poscig, scene=canvas.scene, half = scene.grid.size / 2;
        await scene.updateEmbeddedDocuments("Token",scene.tokens.filter(d=>d.name!=='Strefa swobodna').map(d=>({
          _id:d.id, x:d.name==='Między torami' ? P.torX(9) - half + 55 : P.torX(2 + Number(d.name.match(/\d+/)[0])) - half
        })),{animate:false});
        await game.neuroshima.poscig.konfiguruj(scene,{offset:0});
      });
    });

    await t.step("drag preview is static and does not disturb the original mesh", async () => {
      const result = await t.gm.eval(async () => {
        const token = canvas.tokens.placeables.find(tk=>tk.name==='Pojazd 1');
        const preview = token.clone();
        preview.document.updateSource({x:1000,y:700});
        canvas.tokens.preview.addChild(preview);
        try {
          await preview.draw();
          await new Promise(r=>setTimeout(r,150));
          const before = {x:preview.mesh.x,y:preview.mesh.y,rotation:preview.mesh.rotation};
          await new Promise(r=>setTimeout(r,350));
          return {previewStatic:before.x===preview.mesh.x&&before.y===preview.mesh.y&&before.rotation===preview.mesh.rotation};
        } finally { preview.destroy(); }
      });
      t.assert(result.previewStatic, "drag preview receives sway offsets", result);
    });

    await t.step("other scenes keep document rotation and old boards use the default theme", async () => {
      const result = await t.gm.eval(async id => {
        const scene = await Scene.implementation.create({name:"Ordinary scene",width:2800,height:2200,padding:0,
          grid:{type:1,size:200},levels:[{_id:foundry.documents.BaseScene.metadata.defaultLevelId,name:"Terrain"}]});
        try {
          const actor=game.actors.getName("Pojazd 1");
          const data=(await actor.getTokenDocument({x:600,y:780,rotation:81,width:1,height:1})).toObject();
          const created=await scene.createEmbeddedDocuments("Token",[data]);
          const doc=scene.tokens.get(created[0].id);
          await doc.update({rotation:123},{animate:false});
          await canvas.scene.update({[`flags.${id}.poscig.motyw`]:_del});
          return {rotation:doc.rotation,theme:game.neuroshima.poscig.tlo.stats().theme};
        } finally {await scene.delete();}
      }, MOD);
      t.equal(result.rotation,123,"ordinary scene rotation");
      t.equal(result.theme,"pustynia","flag-less board theme");
    });

    await t.step("new-chase dialog stores its theme independently of environment", async () => {
      await t.gm.eval(() => { game.neuroshima.poscig.oknoNowyPoscig(); });
      await t.waitFor(t.gm,()=>Boolean(document.querySelector('select[name="motyw"]')), {message:"new-chase theme selector"});
      const options = await t.gm.eval(() => {
        const select=document.querySelector('select[name="motyw"]'),form=select.form;
        const names=[...select.options].map(o=>o.text);
        form.elements.nazwa.value="Dialog · Pościg";select.value="zima";
        form.elements.srodowisko.value="ciasno";form.elements.aktywuj.checked=false;
        [...form.querySelectorAll('button')].find(b=>b.textContent.includes('Utwórz planszę')).click();
        return names;
      });
      t.equal(options.length,3,"three Polish theme options");
      const flag=await t.waitFor(t.gm,id=>game.scenes.getName('Dialog · Pościg')?.getFlag(id,'poscig'),{args:[MOD],message:"scene created through dialog"});
      t.equal(flag.motyw,'zima',"new dialog theme");t.equal(flag.st,15,"new dialog DC");
      await t.gm.eval(()=>game.scenes.getName('Dialog · Pościg').delete());
    });

    const measurements = [], baseline=latestBaseline(t.moduleRoot);
    for (const theme of ["pustynia", "przedmiescia", "zima"]) {
      await t.step(`${theme}: settings dialog, GM/player render and 60 s foreground performance`, async () => {
        await t.gm.front(0);
        await t.gm.eval(() => {game.neuroshima.poscig.oknoUstawienia();});
        await t.waitFor(t.gm,()=>Boolean(document.querySelector('select[name="motyw"]')),{message:"settings theme selector"});
        await t.gm.eval(theme=>{
          const select=document.querySelector('select[name="motyw"]'),form=select.form;
          select.value=theme;[...form.querySelectorAll('button')].find(b=>b.textContent.includes('Zastosuj')).click();
        },theme);
        await t.waitFor(t.gm,theme=>{const s=game.neuroshima.poscig.tlo.stats();return s.theme===theme&&s.ready;},{args:[theme],message:"GM theme artwork loaded"});
        await t.waitFor(player,theme=>{const s=game.neuroshima.poscig.tlo.stats();return s.theme===theme&&s.ready;},{args:[theme],message:"player theme artwork loaded"});
        await t.gm.eval(()=>game.neuroshima.poscig.konfiguruj(canvas.scene,{tempoTla:2}));
        await t.screenshot("gm",theme);await t.screenshot("Gracz 1",theme);
        await t.gm.front(0);
        await t.gm.send("HeapProfiler.collectGarbage");
        const documentsBefore=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})).sort((a,b)=>a.id.localeCompare(b.id)));
        const result=await t.gm.eval(async()=>{
          const {measure}=await import('/agent-e2e/poscig-performance.mjs');
          return measure();
        });
        await t.gm.send("HeapProfiler.collectGarbage");
        result.retainedHeap=await t.gm.eval(()=>performance.memory?.usedJSHeapSize??null);
        result.theme=theme;
        const documentsAfter=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})).sort((a,b)=>a.id.localeCompare(b.id)));
        result.documentsUnchanged=JSON.stringify(documentsBefore)===JSON.stringify(documentsAfter);
        result.recommendations={fps:result.fps>=55,p95:result.p95Ms<=20,textures:result.textureMiB<=48,
          relative:!baseline||result.fps>=baseline.fps*.85};
        // The GM explicitly made render-time/VRAM budgets advisory. Assert valid measurement,
        // not a hard cap that would already reject this machine's pre-change baseline.
        t.assert(result.elapsedMs>=59000 && result.frames>100 && result.fps>0 && Number.isFinite(result.textureMiB),"invalid foreground performance sample",result);
        t.equal(result.lanes,12,"performance uses twelve lanes");
        const motion=await t.gm.eval(sampleMotion,350);
        measurements.push(result);
        fs.writeFileSync(path.join(t.run.dir,"poscig-performance.json"),JSON.stringify({baseline,measurements},null,2));
        t.assert(result.documentsUnchanged,"token documents were changed during the foreground performance sample",{before:documentsBefore,after:documentsAfter});
        t.equal(motion.motion.filter(m=>m.y>.02).length,6,"performance uses six swaying vehicles");
        t.assert(motion.documentsStable,"performance animation writes documents");
        t.log(`${theme}: ${result.fps.toFixed(1)} FPS, p95 ${result.p95Ms.toFixed(1)} ms, ${result.textureMiB.toFixed(2)} MiB, ticker ${(result.tickerCost.averageMs+result.swayCost.averageMs).toFixed(3)} ms; recommendations ${JSON.stringify(result.recommendations)}`);
      });
    }
  }
};
