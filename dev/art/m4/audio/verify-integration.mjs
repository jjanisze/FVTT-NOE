// fvtt eval body; exercises the real palette click and existing audio hook in an agent world.
if (!/^agent-/.test(game.world.id) || !game.user.isGM || !canvas.scene) throw new Error("A ready agent sandbox GM scene is required.");
const MOD="neuroshima-2026-overrides";
const wait=async(test,label)=>{for(let i=0;i<100;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,60));}throw new Error(label);};
const state=globalThis.__m4AudioIntegration={beforeMessages:new Set(game.messages.map(m=>m.id)),calls:[]};
try {
  const assets=[];
  for(const file of args.files){
    const response=await fetch(foundry.utils.getRoute("modules/"+MOD+"/"+file.path));
    if(!response.ok)throw new Error("Missing native audio: "+file.path);
    const bytes=await response.arrayBuffer();
    const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");
    if(hash!==file.sha256)throw new Error("Native audio differs from GM-approved bytes: "+file.path);
    assets.push({file:file.path,sha256:hash,http:response.status});
  }
  const pack=game.packs.get(MOD+".pojazdy");
  if(!pack)throw new Error("Vehicle pack missing.");
  const index=await pack.getIndex();
  const entry=index.find(e=>/strażacki/i.test(e.name));
  if(!entry)throw new Error("Fire engine missing in vehicle pack.");
  state.actor=await game.actors.importFromCompendium(pack,entry._id,{name:"[TEST] M4 — syrena audio"},{keepId:false});
  const data=await state.actor.getTokenDocument({x:100,y:100,actorLink:true});
  [state.token]=await canvas.scene.createEmbeddedDocuments("Token",[data.toObject()]);
  const palette=await import("/modules/"+MOD+"/scripts/pojazdy/paleta.mjs");
  state.originalPlay=foundry.audio.AudioHelper.play;
  foundry.audio.AudioHelper.play=(options,broadcast)=>{
    state.calls.push({src:options.src,volume:options.volume,loop:options.loop,broadcast});
    return Promise.resolve(null);
  };
  state.app=await palette.otworzPalete(state.token);
  const siren=await wait(()=>state.app?.element?.querySelector('[data-pozycja="syrena"]'),"Siren palette button missing.");
  if(siren.disabled)throw new Error("Siren button disabled for GM.");
  siren.click();
  const message=await wait(()=>game.messages.find(m=>!state.beforeMessages.has(m.id)&&m.flags?.[MOD]?.pojazdDzwiek?.rodzaj==="syrena"),"Palette did not publish the siren event.");
  await wait(()=>state.calls.length>0,"Vehicle audio hook did not play the siren.");
  await new Promise(r=>setTimeout(r,200));
  if(state.calls.length!==1||!state.calls[0].src.endsWith("/sounds/pojazdy/syrena.ogg")||state.calls[0].loop!==false)throw new Error("Wrong or duplicate siren playback.");
  const effect=state.actor.effects.find(e=>e.flags?.[MOD]?.paleta?.id==="syrena");
  if(!effect)throw new Error("Siren palette effect missing.");
  const beforeReverse=new Set(game.messages.map(m=>m.id));
  const reverse=await wait(()=>state.app.element?.querySelector('[data-pozycja="wsteczny"]'),"Reverse palette button missing.");
  reverse.click();
  const reverseMessage=await wait(()=>game.messages.find(m=>!beforeReverse.has(m.id)&&m.speaker?.actor===state.actor.id),"Reverse palette action did not publish its card.");
  await new Promise(r=>setTimeout(r,200));
  if(reverseMessage.flags?.[MOD]?.pojazdDzwiek||state.calls.length!==1)throw new Error("Unrelated palette action emitted vehicle audio.");
  state.report={date:"2026-11-01",world:game.world.id,approvedAudioFiles:assets,sirenButtonClicked:true,
    sirenEvent:message.flags[MOD].pojazdDzwiek,sirenEffectPreserved:true,playback:state.calls,
    unrelatedActionSilent:true,cleanupPending:true};
  return state.report;
} catch(error) {
  if(state.originalPlay)foundry.audio.AudioHelper.play=state.originalPlay;
  await state.app?.close();
  if(state.token)await state.token.delete();
  if(state.actor){
    const ids=game.messages.filter(m=>!state.beforeMessages.has(m.id)&&m.speaker?.actor===state.actor.id).map(m=>m.id);
    if(ids.length)await ChatMessage.deleteDocuments(ids);
    await state.actor.delete();
  }
  delete globalThis.__m4AudioIntegration;
  throw error;
}
