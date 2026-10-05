import fs from "node:fs";
import path from "node:path";
const pause=ms=>new Promise(r=>setTimeout(r,ms));

export function streamedScenerySuite(name, theme) { return {
  name,clients:["gm","Gracz 1"],fixture:"poscig",
  async run(t) {
    for(const client of [t.gm,t.client("Gracz 1")])await t.waitFor(client,id=>
      canvas.ready&&canvas.scene?.id===id&&canvas.tokens.placeables.length===8,
      {args:[t.fixture.scene.id],message:"fresh streamed chase ready"});
    t.equal(await t.gm.eval(()=>canvas.scene.getFlag("neuroshima-2026-overrides","poscig").tempoTla),2,"new chase defaults to speed 2");
    await t.gm.eval(theme=>game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:theme,tempoTla:2}),theme);
    for(const client of [t.gm,t.client("Gracz 1")])await t.waitFor(client,theme=>
      game.neuroshima.poscig.tlo.stats().theme===theme&&game.neuroshima.poscig.tlo.stats().ready,
      {args:[theme],message:"requested bitmap theme loaded"});
    await t.gm.send("Page.bringToFront");
    await t.gm.eval(async()=>{await game.togglePause(false,true);document.querySelector('.tour [data-action="exit"]')?.click();canvas.pan({x:1400,y:800,scale:.65});});
    await t.step("three minutes at speed 2: changing scenery, bounded textures and stable documents",async()=>{
      const before=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})));
      const samples=[],regions=new Set(),seen=new Set();let peak=0;
      const start=Date.now();
      while(Date.now()-start<180000) {
        await pause(1000);
        const sample=await t.gm.eval(()=>({hidden:document.hidden,...game.neuroshima.poscig.tlo.stats()}));
        t.assert(!sample.hidden,"streaming review left the foreground");
        t.equal(sample.textureError,null,"streamed asset load error");
        peak=Math.max(peak,sample.residentTextureBytes);sample.elapsedMs=Date.now()-start;samples.push(sample);
        sample.visibleAssets.forEach(id=>seen.add(id));
        if(!regions.has(sample.region)) {regions.add(sample.region);await t.screenshot("gm",`region-${sample.region}`);}
        if(samples.length%30===0)t.log(`${sample.region}: ${sample.residentTextures}/${sample.catalogAssets} textures, ${(sample.residentTextureBytes/1048576).toFixed(1)} MiB, ${sample.textureEvictions} evictions`);
      }
      const after=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})));
      t.equal(JSON.stringify(after),JSON.stringify(before),"streaming changes token documents");
      t.equal(regions.size,4,"all four broad terrain regions appeared");
      t.assert(["ground","road-patched","road-sand","road-eroded"].every(id=>seen.has(id)),"road variants missing",[...seen]);
      t.assert(samples.at(-1).textureEvictions>10,"texture cache did not release old artwork");
      t.assert(peak<128*1048576,"unexpected working-set growth",{peak});
      t.assert(samples.at(-1).travelDistance>88000,"scenery repeatedly stalled while streaming",samples.at(-1));
      fs.writeFileSync(path.join(t.run.dir,`${name}.json`),JSON.stringify({durationMs:samples.at(-1).elapsedMs,peakMiB:peak/1048576,regions:[...regions],seen:[...seen],samples},null,2));
      await t.screenshot("gm","variety-final");
    });
  }
}; }

export default streamedScenerySuite("nevada-stream","pustynia");
