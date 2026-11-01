const state=globalThis.__m4AudioIntegration;
if(!state)return {cleaned:true,alreadyClean:true};
if(state.originalPlay)foundry.audio.AudioHelper.play=state.originalPlay;
await state.app?.close();
const token=state.token,actor=state.actor;
if(token)await token.delete();
if(actor){
  const ids=game.messages.filter(m=>!state.beforeMessages.has(m.id)&&m.speaker?.actor===actor.id).map(m=>m.id);
  if(ids.length)await ChatMessage.deleteDocuments(ids);
  await actor.delete();
}
delete globalThis.__m4AudioIntegration;
return {cleaned:!game.actors.has(actor?.id)&&!canvas.scene.tokens.has(token?.id),audioHelperRestored:true};
