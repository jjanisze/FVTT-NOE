/** Native generic machine-wreck art, actual trial-card actions and token geometry. */
async function prepare(){
 if(!game.poligon){
  const state=await import('/agent-poligon/lib/state.mjs');
  if(!game.settings.settings.has('world.poligonStan'))state.registerStateSettings();
  game.poligon=await(await import('/agent-poligon/api.mjs')).createApi('sandbox');
 }
 const untouched=canvas.scene.id;
 const[r]=await game.poligon.stations.reset('zlomowisko',{fast:true,source:'e2e'});
 return{ok:r.ok,error:r.error,missing:r.missing,summary:r.summary,untouched};
}
function state(){
 const M='neuroshima-2026-overrides';
 return{scene:canvas.scene.id,tokens:canvas.scene.tokens.map(t=>({
  id:t.id,review:t.flags[M]?.machineWreckReview??null,wreck:!!t.flags[M]?.wrak,
  src:t.texture.src,original:t.flags[M]?.wrak?.src??t.texture.src,
  width:t.width,height:t.height,size:t.actor?.system.traits.size,
  texture:foundry.utils.deepClone(t._source.texture),name:t.name
 }))};
}
export default{
 name:'wraki-maszyn',clients:['gm','Gracz 1'],
 async run(t){
  const player=t.client('Gracz 1');let initial,s;
  await t.step('Złomowisko rebuild adds the four-size wreck gallery without missing assets',async()=>{
   initial=await t.gm.eval(prepare);
   t.assert(initial.ok&&!initial.missing.length,'station builds',initial);
   const docs=await t.gm.eval(()=>game.poligon.stations.documents('zlomowisko').scenes.map(s=>({id:s.id,n:s.tokens.size})));
   t.equal(docs.length,2,'original yard plus one art gallery');
   t.assert(docs.some(d=>d.n===9),'eight machines and a human scale reference');
   t.assert(await t.gm.eval(id=>game.scenes.has(id),initial.untouched),'unrelated scene remains');
  });
  await t.step('The real trial card opens the wreck comparison for GM and player',async()=>{
   await t.gm.eval(async()=>{
    await game.poligon.stations.go('zlomowisko');
    for(const app of [...foundry.applications.instances.values()])if(app.document&&app.rendered)await app.close();
    game.poligon.panel.open();
   });
   await t.waitFor(t.gm,()=>!!document.querySelector('#poligon-panel [data-tab="proby"]'));
   await t.gm.eval(()=>document.querySelector('#poligon-panel [data-tab="proby"]').click());
   await t.waitFor(t.gm,()=>document.querySelectorAll('#poligon-panel [data-op="tool"]').length===3);
   await t.gm.eval(()=>document.querySelector('#poligon-panel [data-op="tool"][data-arg="0"]').click());
   for(const c of[t.gm,player])await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.machineWreckArtGallery,{message:'comparison activated'});
   s=await t.gm.eval(state);
   await t.waitFor(player,s=>s.tokens.every(r=>canvas.tokens.get(r.id)?.mesh?.texture?.valid),{args:[s],message:'all nine textures loaded'});
   await t.screenshot('Gracz 1','four generic fused wreck piles at native physical sizes');
  });
  await t.step('All four unique assets retain native footprints and source texture transforms',async()=>{
   const wracks=s.tokens.filter(r=>r.review?.variant==='wrak');
   t.equal(wracks.length,4,'four wreck categories');
   t.equal(new Set(wracks.map(r=>r.src)).size,4,'distinct art in every size');
   for(const[key,cells]of[['maly',1],['sredni',1],['duzy',2],['gigantyczny',3]]){
    const row=wracks.find(r=>r.review.key===key),healthy=s.tokens.find(r=>r.review?.key===key&&r.review.variant==='sprawny');
    t.assert(row.wreck&&row.src.endsWith('/wraki/'+key+'.webp'),'native route '+key,row);
    t.equal(row.width,cells,'native width '+key);t.equal(row.height,cells,'native height '+key);
    for(const prop of['scaleX','scaleY','anchorX','anchorY','fit','tint'])
     t.equal(row.texture[prop],healthy.texture[prop],'source transform '+key+'/'+prop);
   }
  });
  await t.step('Trial-card restore and wreck actions work on selected tokens and reach the player',async()=>{
   const wracks=s.tokens.filter(r=>r.review?.variant==='wrak');
   await t.gm.eval(rows=>{
    canvas.tokens.releaseAll();
    for(const row of rows)canvas.tokens.get(row.id).control({releaseOthers:false});
    document.querySelector('#poligon-panel [data-op="tool"][data-arg="2"]').click();
   },wracks);
   await t.waitFor(player,rows=>rows.every(r=>{
    const d=canvas.scene.tokens.get(r.id);return!d.flags['neuroshima-2026-overrides']?.wrak&&d.texture.src===r.original;
   }),{args:[wracks],message:'restored graphics on player'});
   await t.gm.eval(()=>document.querySelector('#poligon-panel [data-op="tool"][data-arg="1"]').click());
   await t.waitFor(player,rows=>rows.every(r=>{
    const v=canvas.tokens.get(r.id);return!!v.document.flags['neuroshima-2026-overrides']?.wrak&&v.document.texture.src===r.src
      &&v.mesh.texture.baseTexture===foundry.canvas.getTexture(r.src)?.baseTexture;
   }),{args:[wracks],message:'wreck graphics restored on player'});
   await t.gm.eval(()=>canvas.tokens.releaseAll());
  });
  await t.step('Tiny and Gargantuan machines share the endpoint images while preserving their own footprint',async()=>{
   const rows=await t.gm.eval(async()=>{
    const M='neuroshima-2026-overrides',{Kit}=await import('/agent-poligon/lib/kit.mjs');
    const k=new Kit(game.poligon.stations.get('zlomowisko'),{fast:true}),result=[];
    for(const[size,unit,cells,key,x]of[['tiny','kurczak',.5,'maly',1],['grg','juggernaut',4,'gigantyczny',24]]){
     const a=await k.fromPack('endpoint-'+size,'bestiariusz',unit,{data:{system:{traits:{size}},
      prototypeToken:{width:cells,height:cells,texture:{scaleX:.87,scaleY:.87},ring:{enabled:false}}}});
     const[d]=await k.tokens(canvas.scene,[[a,x,17,{displayName:0,displayBars:0}]]);
     const before=foundry.utils.deepClone(d._source.texture),dimensions=[d.width,d.height];
     result.push({id:d.id,actor:a.id,original:before.src,texture:before,dimensions,size,key});
    }
    return result;
   });
   // createEmbeddedDocuments resolves before the canvas finishes its first draw.
   // A texture transition on an undrawn token hits core's #updatePadding with no mesh.
   for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.every(r=>canvas.tokens.get(r.id)?.mesh?.texture?.baseTexture===foundry.canvas.getTexture(r.original)?.baseTexture),{args:[rows],message:'endpoint initial draw before texture transition'});
   await t.gm.eval(async rows=>{for(const row of rows){const d=canvas.scene.tokens.get(row.id);await game.neuroshima.postoj.autodestrukcja.wrak(d,row.size);}},rows);
   for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.every(r=>{
    const v=canvas.tokens.get(r.id),src='modules/neuroshima-2026-overrides/tokens/wraki/'+r.key+'.webp';
    return v.document.texture.src===src&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(src)?.baseTexture
      &&v.document.width===r.dimensions[0]&&v.document.height===r.dimensions[1]&&v.document.texture.scaleX===r.texture.scaleX;
   }),{args:[rows],message:'endpoint wreck drawn with native dimensions and custom scale'});
   await t.gm.eval(async rows=>{for(const row of rows)await game.neuroshima.postoj.autodestrukcja.przywroc(canvas.scene.tokens.get(row.id));},rows);
   for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.every(r=>canvas.scene.tokens.get(r.id)?.texture.src===r.original&&canvas.scene.tokens.get(r.id)?.texture.scaleX===r.texture.scaleX&&canvas.tokens.get(r.id)?.mesh?.texture?.baseTexture===foundry.canvas.getTexture(r.original)?.baseTexture),{args:[rows],message:'endpoint restored texture drawn before cleanup'});
   for(const c of[t.gm,player])await c.eval(()=>window.__e2e.quiet());
   await t.gm.eval(async rows=>{
    await canvas.scene.deleteEmbeddedDocuments('Token',rows.map(r=>r.id));
    await Actor.implementation.deleteDocuments(rows.map(r=>r.actor));
   },rows);
  });
  await t.step('Re-adopting the gallery preserves hand placement without duplicate scenes or actors',async()=>{
   const r=await t.gm.eval(async()=>{
    const{Kit}=await import('/agent-poligon/lib/kit.mjs');
    const{zbudujWrakiMaszyn}=await import('/agent-poligon/stations/zlomowisko-wraki.mjs');
    const d=canvas.scene.tokens.find(t=>t.flags['neuroshima-2026-overrides']?.wrak);
    await d.update({x:d.x+17,rotation:43});
    const snapshot=JSON.stringify(canvas.scene.toObject()),count=game.actors.size;
    const result=await zbudujWrakiMaszyn(new Kit(game.poligon.stations.get('zlomowisko')));
    return{reused:result.reused,preserved:JSON.stringify(canvas.scene.toObject())===snapshot,actors:game.actors.size===count};
   });
   t.assert(r.reused&&r.preserved&&r.actors,'existing review retained',r);
  });
  await t.step('Station reset recreates the review at native sizes and keeps unrelated scenes',async()=>{
   for(const c of[t.gm,player])await c.eval(()=>window.__e2e.quiet());
   const r=await t.gm.eval(async()=>{
    const[r]=await game.poligon.stations.reset('zlomowisko',{fast:true,source:'e2e'});
    return{ok:r.ok,error:r.error,missing:r.missing,scenes:game.poligon.stations.documents('zlomowisko').scenes.map(s=>({id:s.id,n:s.tokens.size}))};
   });
   t.assert(r.ok&&!r.missing.length&&r.scenes.length===2&&r.scenes.some(s=>s.n===9),'recreated comparison',r);
   t.assert(await t.gm.eval(id=>game.scenes.has(id),initial.untouched),'unrelated fixture scene retained');
  });
 }
};
