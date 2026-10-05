import fs from "node:fs";
import path from "node:path";
const pause=ms=>new Promise(r=>setTimeout(r,ms));

async function startRecording(client) {
  await client.eval(()=>{
    const stream=canvas.app.view.captureStream(20),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:2_500_000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);}; recorder.start(1000);
    window.__nevadaStreamRecording={stream,chunks,recorder};
  });
}
async function finishRecording(client,file) {
  const length=await client.eval(async()=>{
    const state=window.__nevadaStreamRecording;
    await new Promise(resolve=>{state.recorder.onstop=resolve;state.recorder.stop();});
    for(const track of state.stream.getTracks())track.stop();
    state.base64=await new Promise(resolve=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(new Blob(state.chunks,{type:"video/webm"}));
    });return state.base64.length;
  });
  const chunks=[];
  try {
    for(let i=0;i<length;i+=65536)chunks.push(await client.eval(n=>window.__nevadaStreamRecording.base64.slice(n,n+65536),i));
    fs.writeFileSync(file,Buffer.from(chunks.join(""),"base64"));
  } finally {await client.eval(()=>{delete window.__nevadaStreamRecording;});}
}

export default {
  name:"nevada-stream",clients:["gm","Gracz 1"],fixture:"poscig",
  async run(t) {
    for(const client of [t.gm,t.client("Gracz 1")])await t.waitFor(client,id=>
      canvas.ready&&canvas.scene?.id===id&&canvas.tokens.placeables.length===8&&game.neuroshima.poscig.tlo.stats().ready,
      {args:[t.fixture.scene.id],message:"fresh streamed chase ready"});
    t.equal(await t.gm.eval(()=>canvas.scene.getFlag("neuroshima-2026-overrides","poscig").tempoTla),2,"new chase defaults to speed 2");
    await t.gm.send("Page.bringToFront");
    await t.gm.eval(async()=>{await game.togglePause(false,true);document.querySelector('.tour [data-action="exit"]')?.click();canvas.pan({x:1400,y:800,scale:.65});});
    await t.step("three minutes at speed 2: changing scenery, bounded textures and stable documents",async()=>{
      const before=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})));
      const samples=[],regions=new Set(),seen=new Set();let peak=0;
      await startRecording(t.gm);
      try {
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
        await finishRecording(t.gm,path.join(t.run.dir,"nevada-variety-3min.webm"));
      } finally {
        await t.gm.eval(()=>{const s=window.__nevadaStreamRecording;if(s){if(s.recorder.state!=="inactive")s.recorder.stop();for(const track of s.stream.getTracks())track.stop();delete window.__nevadaStreamRecording;}});
      }
      const after=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({id:d.id,x:d._source.x,y:d._source.y,rotation:d._source.rotation})));
      t.equal(JSON.stringify(after),JSON.stringify(before),"streaming changes token documents");
      t.equal(regions.size,4,"all four broad terrain regions appeared");
      t.assert(["ground","road-patched","road-sand","road-eroded"].every(id=>seen.has(id)),"road variants missing",[...seen]);
      t.assert(samples.at(-1).textureEvictions>10,"texture cache did not release old artwork");
      t.assert(peak<128*1048576,"unexpected working-set growth",{peak});
      t.assert(samples.at(-1).travelDistance>88000,"scenery repeatedly stalled while streaming",samples.at(-1));
      fs.writeFileSync(path.join(t.run.dir,"nevada-stream.json"),JSON.stringify({durationMs:samples.at(-1).elapsedMs,peakMiB:peak/1048576,regions:[...regions],seen:[...seen],samples},null,2));
      await t.screenshot("gm","variety-final");
    });
  }
};
