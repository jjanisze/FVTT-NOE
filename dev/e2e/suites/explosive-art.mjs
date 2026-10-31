/** Nine delivered map sprites through the real Tile funnel, plus two existing ruin-source banners. */
export default{
 name:'explosive-art',clients:['gm','Gracz 1'],
 async run(t){
  const player=t.client('Gracz 1');let before,preview;
  await t.step('Strzelnica builds all nine delivered map-object paintings',async()=>{
   before=await t.gm.eval(async()=>{
    if(!game.poligon){
     const state=await import('/agent-poligon/lib/state.mjs');
     if(!game.settings.settings.has('world.poligonStan'))state.registerStateSettings();
     game.poligon=await(await import('/agent-poligon/api.mjs')).createApi('sandbox');
    }
    const untouched=canvas.scene.id;
    // The shared skirmish fixture has three player users; this range has five seats.
    for(const name of['Gracz 4','Gracz 5'])if(!game.users.getName(name))
     await User.implementation.create({name,role:CONST.USER_ROLES.PLAYER});
    const[r]=await game.poligon.stations.reset('strzelnica',{fast:true,source:'e2e'});
    return{untouched,ok:r.ok,error:r.error,missing:r.missing};
   });
   t.assert(before.ok&&!before.missing.length,'complete station',before);
   t.assert(await t.gm.eval(id=>game.scenes.has(id),before.untouched),'fixture scene preserved');
  });
  await t.step('Trial-card tool opens the delivered paintings and their small samples for GM and player',async()=>{
   await t.gm.eval(async()=>{
    await game.poligon.stations.go('strzelnica');
    for(const app of [...foundry.applications.instances.values()])if(app.document&&app.rendered)await app.close();
    game.poligon.panel.open();
   });
   // go() activates the main range before its clients have finished drawing it.
   // Wait for that draw before the review tool activates the second scene.
   for(const c of[t.gm,player]){
    await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.testScene?.key==='tor',{message:'main firing range drawn before review navigation'});
    await c.eval(()=>{
     document.querySelector('.tour [data-action="exit"]')?.click();
    });
   }
   await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()])if(app.document&&app.rendered)await app.close();});
   await t.waitFor(t.gm,()=>!!document.querySelector('#poligon-panel [data-tab="proby"]'));
   await t.gm.eval(()=>document.querySelector('#poligon-panel [data-tab="proby"]').click());
   await t.waitFor(t.gm,()=>!!document.querySelector('#poligon-panel [data-op="tool"][data-arg="3"]'));
   await t.gm.eval(()=>document.querySelector('#poligon-panel [data-op="tool"][data-arg="3"]').click());
   for(const c of[t.gm,player])await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.explosiveArtGallery,{message:'art gallery activated'});
   preview=await t.gm.eval(()=>({id:canvas.scene.id,tiles:canvas.scene.tiles.map(d=>({id:d.id,w:d.width,h:d.height,review:d.flags['neuroshima-2026-overrides']?.explosiveArtReview}))}));
   t.equal(preview.tiles.length,45,'nine enlarged and 36 small samples');
   t.equal(new Set(preview.tiles.map(r=>r.review.key)).size,9,'nine distinct delivered sprites');
   t.equal(await t.gm.eval(()=>canvas.scene.drawings.filter(d=>d.text==='Grafika w kolejce').length),0,'no unfinished slots');
   t.assert(await t.gm.eval(()=>canvas.scene.drawings.filter(d=>d.flags['neuroshima-2026-overrides']?.testScene?.role==='stripe')
    .every(d=>canvas.scene.tiles.every(tile=>d.elevation<tile.elevation))),'background swatches cannot cover the small sprites');
   for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.every(r=>canvas.tiles.get(r.id)?.mesh?.texture?.valid),{args:[preview.tiles],message:'all map textures drawn'});
   for(const row of preview.tiles)t.equal(Math.max(row.w,row.h),row.review.variant==='large'?210:row.review.variant.startsWith('thrown')?30:50,'long-edge display size');
   await t.screenshot('Gracz 1','all nine explosive paintings with real-size samples');
  });
  await t.step('Actual thrown and placed charges load the dedicated art with its native aspect ratio',async()=>{
   const rows=await t.gm.eval(async()=>{
    const M='neuroshima-2026-overrides';
    const{explosiveInternals}=await import('/modules/'+M+'/scripts/actors/grenade-inventory.mjs');
    const{GRAFIKI_GRANATOW,DOSTARCZONE_GRANATY}=await import('/agent-poligon/stations/strzelnica-granaty.mjs');
    const actor=game.actors.getName('PC Gracz 1'),rows=[];
    const specs=[...GRAFIKI_GRANATOW.filter(([key])=>DOSTARCZONE_GRANATY.has(key)).map(([subtype])=>({subtype,via:'electric',placed:false})),
     {subtype:'grenade-dynamite',via:'radio',placed:true},{subtype:'grenade-smoke',via:'electric',placed:true},
     {subtype:'grenade-c4-remote',via:'radio',placed:true},{subtype:'grenade-ied',via:'radio',placed:true},
     {subtype:'grenade-molotov',via:'electric',placed:false,lit:true}];
    for(const[i,s]of specs.entries()){
     const ids=new Set(canvas.scene.tiles.map(d=>d.id));
     await explosiveInternals.requestPendingCharge(actor,{
      subtype:s.subtype,anchor:{type:'remote',via:s.via},lit:!!s.lit,
      ...(s.placed?{placed:{hidden:false}}:{}),
      marker:{sceneId:canvas.scene.id,x:100+(i%10)*200,y:2000+Math.floor(i/10)*100,area:{kind:'cube',side:1.5}},
      card:{name:s.subtype,itemImg:'icons/svg/hazard.svg'}
     });
     const d=await window.__e2e.until(()=>canvas.scene.tiles.find(d=>!ids.has(d.id)&&d.flags[M]?.pendingCharge),{message:'real pending charge Tile'});
     await window.__e2e.until(()=>!actor.getFlag(M,'explosivePendingCharge'),{message:'request flag consumed'});
     const key=s.subtype==='grenade-ied'&&s.via==='radio'?'grenade-ied-radio':s.subtype;
     const expected='modules/'+M+'/vfx/'+key+'.webp',tex=await foundry.canvas.loadTexture(expected);
     rows.push({id:d.id,expected,src:d.texture.src,width:d.width,height:d.height,aspect:tex.width/tex.height,long:s.placed?50:30,lit:!!s.lit});
    }
    return rows;
   });
   for(const r of rows){
    t.equal(r.src,r.expected,'sprite selected '+r.expected);
    t.equal(Math.max(r.width,r.height),r.long,'actual Tile size');
    t.assert(Math.abs(r.width-r.height*r.aspect)<=1.6,'native aspect preserved',r);
   }
   for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.every(r=>canvas.tiles.get(r.id)?.mesh?.texture?.valid&&canvas.scene.tiles.get(r.id)?.texture.src===r.expected),{args:[rows],message:'runtime sprites visible to both clients'});
   if(await t.gm.eval(()=>game.modules.get('sequencer')?.active&&game.modules.get('JB2A_DnD5e')?.active))
    for(const c of[t.gm,player])await t.waitFor(c,rows=>rows.filter(r=>r.lit).every(r=>Sequencer.EffectManager.getEffects({name:'neuro-pending-flame-'+r.id}).length>0),{args:[rows],message:'animated fire accompanies the unlit Molotov source'});
   await t.gm.eval(async rows=>{await canvas.scene.deleteEmbeddedDocuments('Tile',rows.map(r=>r.id));},rows);
  });
  await t.step('Reopening the art builder preserves manual placements and creates no duplicates',async()=>{
   const r=await t.gm.eval(async()=>{
    const{Kit}=await import('/agent-poligon/lib/kit.mjs');
    const{zbudujGrafikeGranatow}=await import('/agent-poligon/stations/strzelnica-granaty.mjs');
    const d=canvas.scene.tiles.contents[0];await d.update({x:d.x+11,rotation:31});
    const before=JSON.stringify(canvas.scene.toObject()),n=game.scenes.size;
    const r=await zbudujGrafikeGranatow(new Kit(game.poligon.stations.get('strzelnica')));
    return{reused:r.reused,preserved:before===JSON.stringify(canvas.scene.toObject()),sameCount:n===game.scenes.size};
   });
   t.assert(r.reused&&r.preserved&&r.sameCount,'idempotent gallery adoption',r);
  });
  await t.step('Warehouse and wreck banners load in the real scavenging window and player request cards',async()=>{
   const cards=await t.gm.eval(async()=>{
    const M='neuroshima-2026-overrides';
    const{SzabrowanieOkno}=await import('/modules/'+M+'/scripts/postoj/szabrowanie.mjs');
    const actor=game.actors.getName('PC Gracz 1');
    const party=await Actor.implementation.create({name:'Agent · Art party',type:'group',system:{members:[{actor:actor.id}]}});
    const cards=[];
    for(const key of['magazyn','wrak']){
     const app=new SzabrowanieOkno(party);await app.render(true);
     const select=app.element.querySelector('select[name="ruina"]');select.value=key;select.dispatchEvent(new Event('change',{bubbles:true}));
     const img=await window.__e2e.until(()=>app.element.querySelector('img.neuro-postoj-ilustracja[src$="/'+key+'.webp"]'));
     await window.__e2e.until(()=>img.complete&&img.naturalWidth===1200&&img.naturalHeight===400);
     const selectComp=app.element.querySelector('select[name="komplikacja"]');selectComp.value='0';selectComp.dispatchEvent(new Event('change',{bubbles:true}));
     await window.__e2e.sleep(150);
     const count=game.messages.size;
     app.element.querySelector('[data-action="szabruj"]').click();
     const m=await window.__e2e.until(()=>game.messages.contents.slice(count).find(m=>m.type==='request'&&m.system.handler==='neuroSzabrowanie'));
     cards.push({id:m.id,key});
    }
    return cards;
   });
   for(const r of cards)await t.waitFor(player,({id,key})=>{
    const img=document.querySelector('[data-message-id="'+id+'"] img.neuro-postoj-ilustracja');
    return img?.src.endsWith('/'+key+'.webp')&&img.complete&&img.naturalWidth===1200&&img.naturalHeight===400;
   },{args:[r],message:'supplied banner on player card'});
   await t.screenshot('gm','warehouse and wreck banners in scavenging requests');
  });
  await t.step('Completing an earlier four-image gallery preserves its original samples and scene',async()=>{
   const partial=await t.gm.eval(async()=>{
    const{DOSTARCZONE_GRANATY}=await import('/agent-poligon/stations/strzelnica-granaty.mjs');
    const all=[...DOSTARCZONE_GRANATY],original=new Set(['grenade-dynamite','grenade-smoke','grenade-flashbang','grenade-incendiary']);
    let result;
    try{
     for(const key of all)if(!original.has(key))DOSTARCZONE_GRANATY.delete(key);
     [result]=await game.poligon.stations.reset('strzelnica',{fast:true,source:'e2e'});
    }finally{for(const key of all)DOSTARCZONE_GRANATY.add(key);}
    if(!result.ok)throw new Error(result.error);
    const scene=game.scenes.find(s=>s.flags['neuroshima-2026-overrides']?.explosiveArtGallery);
    return{scene:scene.id,count:scene.tiles.size};
   });
   t.equal(partial.count,20,'earlier four-image delivery reproduced');
   const result=await t.gm.eval(async({scene:id})=>{
    const{Kit}=await import('/agent-poligon/lib/kit.mjs');
    const{zbudujGrafikeGranatow}=await import('/agent-poligon/stations/strzelnica-granaty.mjs');
    const scene=game.scenes.get(id),tile=scene.tiles.contents[0];
    await tile.update({x:tile.x+17,rotation:47});
    const original=scene.tiles.map(d=>({id:d.id,json:JSON.stringify(d.toObject())})),count=game.scenes.size;
    const result=await zbudujGrafikeGranatow(new Kit(game.poligon.stations.get('strzelnica')));
    return{result,count:scene.tiles.size,sceneCountUnchanged:game.scenes.size===count,
     preserved:original.every(d=>JSON.stringify(scene.tiles.get(d.id)?.toObject())===d.json),
     pending:scene.drawings.filter(d=>d.text==='Grafika w kolejce').length};
   },partial);
   t.equal(result.result.scene,partial.scene,'same review scene');
   t.equal(result.result.added,25,'five new groups added');
   t.equal(result.count,45,'complete delivery');
   t.assert(result.sceneCountUnchanged&&result.preserved&&!result.pending,'old sample documents preserved exactly',result);
   await t.gm.eval(async()=>{
    await game.poligon.stations.view('strzelnica','explosive-art-review-v1');
    // Framed windows only: the instances include the sidebar, hotbar and controls (gate 0.21.0).
    for(const app of [...foundry.applications.instances.values()])if(app.hasFrame&&app.rendered)await app.close();
   });
   for(const c of[t.gm,player])await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.explosiveArtGallery&&canvas.tiles.placeables.length===45&&canvas.tiles.placeables.every(p=>p.mesh?.texture?.valid));
   await t.screenshot('Gracz 1','completed gallery after upgrading the earlier four-image preview');
  });
 }
};
