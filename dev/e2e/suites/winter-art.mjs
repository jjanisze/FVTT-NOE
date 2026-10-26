import { bitmapArtSuite } from "./nevada-art.mjs";
const base = bitmapArtSuite("winter-art", "zima", "poscig-winter");
export default { ...base, async run(t) {
  await base.run(t);
  await t.step("complete opaque skyline modules and separated foreground depths", async () => {
    const layers = await t.gm.eval(() => {
      const root=canvas.primary.children.find(c=>c.name==="poscig-winter-ground");
      const hills=root.children[0],front=canvas.primary.children.find(c=>c.name==="poscig-winter-foreground");
      const modules=hills.children.filter(c=>c.name!=="poscig-shared-sky").map(s=>{
        const source=window.__e2e.textureSource(s.texture.baseTexture),ctx=source.getContext("2d"),w=source.width,h=Math.floor(source.height*.85);
        const pixels=ctx.getImageData(0,0,w,h).data;let occupied=0,solid=0,edge=0;
        for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
          const a=pixels[(y*w+x)*4+3];if(a>8)occupied++;if(a>=240)solid++;
          if((x<2||x>=w-2)&&a>8)edge++;
        }
        return {name:s.name,solid:solid/occupied,edge};
      });
      return {modules,shared:hills.children.some(c=>c.name==="poscig-shared-sky"),stats:game.neuroshima.poscig.tlo.stats(),
        props:front.children.flatMap((c,i)=>c.children.map(s=>({depth:i,tint:s.tint,bytes:s.texture.baseTexture.resource.data?.byteLength??0})))};
    });
    t.assert(layers.shared&&layers.stats.backgroundMode==="opaque-cutouts","shared base and silhouette composition missing",layers);
    // Fine winter branches contribute many antialiased pixels; use the same solid-coverage
    // floor as the road-silhouette check, and require entirely clear architectural gutters.
    t.assert(layers.modules.length>0&&layers.modules.every(m=>m.solid>.85&&m.edge===0),"architecture fades or intersects a tile edge",layers.modules);
    t.assert(layers.stats.foregroundStyles.buildings.rate>2.5&&layers.stats.foregroundStyles.structures.rate<layers.stats.foregroundStyles.buildings.rate&&layers.stats.foregroundStyles.plants.rate<1.6,"foreground depth speeds",layers.stats.foregroundStyles);
    t.assert(layers.props.every(p=>p.tint!==0xffffff&&p.bytes>0),"foreground darkening and durable baked blur missing",layers.props);
  });
  await t.step("snowfall depths, scrolling tyre impressions, pause and VFX disposal", async () => {
    await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene, { tempoTla: 2 }));
    await t.waitFor(t.gm, () => game.neuroshima.poscig.tlo.stats().tyreEmitted > 80, { message: "real vehicles leave snow tracks" });
    const moving = await t.gm.eval(() => {
      const snow = canvas.primary.children.find(c => c.name === "poscig-snowfall");
      const tracks = canvas.primary.children.find(c => c.name === "poscig-snow-tracks");
      window.__winterDocuments = JSON.stringify(canvas.scene.tokens.map(t => t.toObject()));
      window.__winterBases = [...new Set([snow.children[0].texture.baseTexture, tracks.children[0].children[0].texture.baseTexture])];
      return { stats: game.neuroshima.poscig.tlo.stats(), input: snow.eventMode === "none" && tracks.eventMode === "none",
        above: snow.sortLayer > 750, below: tracks.sortLayer < 750,
        cropped: snow.children.every(s => s.y >= 0 && s.y + s.height / 2 < 1300) };
    });
    t.assert(moving.stats.snowParticles > 100 && moving.stats.snowDepths === 3, "layered snowfall missing", moving);
    t.assert(moving.stats.tyrePool <= moving.stats.tyreLimit && moving.input && moving.above && moving.below && moving.cropped,
      "VFX bounds, depth, input or pool limit", moving);
    await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene, { tempoTla: 0 }));
    const paused = await t.gm.eval(() => {
      const tracks = canvas.primary.children.find(c => c.name === "poscig-snow-tracks");
      const snow = canvas.primary.children.find(c => c.name === "poscig-snowfall");
      window.__winterPause = { x: tracks.children[0].x, y: snow.children[0].y, emitted: game.neuroshima.poscig.tlo.stats().tyreEmitted };
      return window.__winterPause;
    });
    await new Promise(r => setTimeout(r, 200));
    const stopped = await t.gm.eval(() => ({
      x: canvas.primary.children.find(c => c.name === "poscig-snow-tracks").children[0].x,
      y: canvas.primary.children.find(c => c.name === "poscig-snowfall").children[0].y,
      emitted: game.neuroshima.poscig.tlo.stats().tyreEmitted,
      documents: JSON.stringify(canvas.scene.tokens.map(t => t.toObject())) === window.__winterDocuments
    }));
    t.equal(stopped.x, paused.x, "paused road holds tyre marks");
    t.equal(stopped.emitted, paused.emitted, "paused vehicles emit no marks");
    t.assert(stopped.y !== paused.y && stopped.documents, "weather continues without writing vehicle documents", stopped);
    await t.gm.eval(() => game.neuroshima.poscig.konfiguruj(canvas.scene, { motyw: "przedmiescia" }));
    t.assert(await t.gm.eval(() => window.__winterBases.every(b => b.destroyed)
      && !canvas.primary.children.some(c => c.name?.startsWith("poscig-snow"))), "winter effects or textures survived theme change");
    await t.gm.eval(() => {
      delete window.__winterBases; delete window.__winterPause; delete window.__winterDocuments;
      return game.neuroshima.poscig.konfiguruj(canvas.scene, { motyw: "zima", tempoTla: 2 });
    });
    await t.waitFor(t.gm, () => game.neuroshima.poscig.tlo.stats().tyreEmitted > 80, { message: "winter preview restored" });
    await t.screenshot("gm", "snow-and-tyre-trails");
  });
  await t.step("lane badges and tracks agree at the road boundary and after assigning a chase role", async () => {
    const ids=await t.gm.eval(async()=>{
      const mod="neuroshima-2026-overrides",edge=canvas.scene.tokens.getName("Pojazd 1"),control=canvas.scene.tokens.getName("Między torami");
      await edge.update({y:1030},{animate:false});
      window.__winterBoundaryCount=game.neuroshima.poscig.tlo.stats().tyreVehicles[edge.id]??0;
      return {edge:edge.id,control:control.id};
    });
    await t.waitFor(t.gm,id=>{
      const token=canvas.tokens.get(id),d=token.document,counts=game.neuroshima.poscig.tlo.stats().tyreVehicles;
      return d.y+d.height*canvas.scene.grid.size>1300&&token.neuroTor?.visible&&counts[id]>window.__winterBoundaryCount+3;
    },{args:[ids.edge],message:"partly overlapping vehicle retains its badge and leaves tracks"});
    const unassigned=await t.gm.eval(id=>({badge:!!canvas.tokens.get(id).neuroTor?.visible,tracks:game.neuroshima.poscig.tlo.stats().tyreVehicles[id]??0}),ids.control);
    t.assert(!unassigned.badge&&!unassigned.tracks,"unassigned control should remain outside the chase",unassigned);
    await t.gm.eval(async id=>{
      const token=canvas.scene.tokens.get(id);
      await token.update({x:game.neuroshima.poscig.torX(11)-140,y:780},{animate:false});
      await game.neuroshima.poscig.ustawRole(token,"scigany");
    },ids.control);
    await t.waitFor(t.gm,id=>canvas.tokens.get(id).neuroTor?.visible&&game.neuroshima.poscig.tlo.stats().tyreVehicles[id]>3,
      {args:[ids.control],message:"assigned front car gets both a lane badge and tyre trails"});
    await t.gm.eval(async()=>{
      delete window.__winterBoundaryCount;canvas.tokens.releaseAll();
      await canvas.scene.tokens.getName("Pojazd 1").update({y:780},{animate:false});
      canvas.pan({x:canvas.scene.width/2,y:850,scale:.53});
    });
    await t.screenshot("gm","revised-winter-review");
  });
} };
