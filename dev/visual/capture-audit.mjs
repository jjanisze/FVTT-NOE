/** Inspect existing sandbox UI. No actor/item/scene/message creation or action submission. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig,cdpUrl,resolveProfile} from '../agent/lib/config.mjs';
import {browserSession,pages,isFoundryPage} from '../agent/lib/cdp.mjs';
import {Client} from '../agent/lib/e2e.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const date=process.argv.find(a=>a.startsWith('--date='))?.slice(7)||new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Expected --date=YYYY-MM-DD');
const output=path.join(root,'dev/visual/reference',date);await fs.mkdir(output,{recursive:true});
const cfg=loadConfig(),browser=await browserSession(cdpUrl(cfg)),profile=resolveProfile(cfg,'sandbox');
let client;const records=[];const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
try{
  for(const target of (await pages(browser)).filter(t=>isFoundryPage(t,profile))){const c=new Client(browser,{name:'visual-audit',targetId:target.targetId,background:true});await c.attach();const eligible=await c.eval(()=>game.ready&&game.user.isGM&&game.world.id.startsWith('agent-'));if(eligible){client=c;break;}await browser.send('Target.detachFromTarget',{sessionId:c.sessionId});}
  if(!client)throw new Error('A ready GM tab in an existing agent sandbox is required');
  const take=async key=>{await client.front(200);const {data}=await client.send('Page.captureScreenshot',{format:'webp',quality:85,fromSurface:false},{timeoutMs:15000});await fs.writeFile(path.join(output,key+'.webp'),Buffer.from(data,'base64'));};
  const inspect=async(key,kind,tab)=>{
    const data=await client.eval(async(kind,tab)=>{
      const MOD='neuroshima-2026-overrides';
      const pc=game.actors.find(a=>a.type==='character'&&a.name==='Żołnierz w oporządzeniu');
      let actor=kind==='pc'?pc:kind==='npc'?game.actors.find(a=>a.type==='npc'&&a.name.includes('Gangus Kapo')):kind==='vehicle'?game.actors.find(a=>a.type==='vehicle'&&a.name==='Ciężarówka'):kind==='party'?game.actors.find(a=>a.type==='group'&&!a.flags[MOD]?.lootLock):kind==='drone'?game.actors.getName('Garderobiany'):kind==='mount'?game.actors.getName('Koń (zdrowy)'):null;
      let app;
      if(actor)app=actor.sheet;
      else if(kind==='weapon'||kind==='feature'){const item=pc.items.find(i=>i.type===(kind==='weapon'?'weapon':'feat'));app=item.sheet;}
      else if(kind==='activity'||kind==='usage'){const item=pc.items.find(i=>i.type==='weapon');const activity=item.system.activities.contents.find(a=>a.type==='attack')||item.system.activities.contents[0];app=kind==='activity'?activity.sheet:new dnd5e.applications.activity.ActivityUsageDialog({activity,config:{consume:{},create:{},concentration:{}}});}
      if(!app)throw new Error('No representative '+kind);
      window.__noeVisualAudit??={initialApps:new Set(foundry.applications.instances.keys()),opened:[]};
      await app.render({force:true,position:{left:32,top:24,width:kind==='usage'?460:1030,height:kind==='usage'?650:890}});
      if(!window.__noeVisualAudit.opened.includes(app))window.__noeVisualAudit.opened.push(app);
      if(tab)app.changeTab(tab,'primary');
      window.__noeVisualAudit.current=app;
      return {kind,class:app.constructor.name,tabs:Array.isArray(app.constructor.TABS)?app.constructor.TABS.map(t=>t.tab):Object.keys(app.constructor.TABS||{}),activeTab:app.tabGroups?.primary,filter:getComputedStyle(app.element).filter,font:getComputedStyle(app.element).fontFamily,text:app.element.innerText.slice(0,500)};
    },kind,tab);
    await take(key);records.push({key,file:`dev/visual/reference/${date}/${key}.webp`,...data});
    await client.eval(async()=>{const a=window.__noeVisualAudit.current;await a.close();window.__noeVisualAudit.opened=window.__noeVisualAudit.opened.filter(x=>x!==a);window.__noeVisualAudit.current=null;});
  };
  // The PC sheet may already be open from the initial inspection; it is an audit-owned window.
  for(const [key,kind,tab] of [['pc-inventory','pc'],['pc-features','pc','features'],['pc-resources','pc','zasoby'],['npc-features','npc'],['vehicle-overview','vehicle'],['vehicle-repairs','vehicle','awarie'],['party-members','party'],['party-downtime','party','postoj'],['drone-sheet','drone'],['mount-sheet','mount'],['weapon-sheet','weapon'],['feature-sheet','feature'],['activity-editor','activity'],['action-use-dialog','usage']]){
    if(only&&!only.includes(key))continue;
    try{await inspect(key,kind,tab);}catch(error){records.push({key,kind,error:String(error.message)});await client.eval(async()=>{const a=window.__noeVisualAudit?.current;if(a){await a.close();window.__noeVisualAudit.current=null;}}).catch(()=>{});}
  }
  await take('canvas-chat-sidebar');
  const runtime=await client.eval(async()=>{
    const MOD='neuroshima-2026-overrides',packs=[],images=new Set(),moduleImages=new Set(),itemTypes=new Set();
    for(const pack of game.packs.filter(p=>p.collection.startsWith(MOD+'.'))){
      const index=await pack.getIndex({fields:['img','type']});
      packs.push({id:pack.collection.split('.').at(-1),document:pack.documentName,count:index.size});
      for(const entry of index){if(entry.img){images.add(entry.img);if(entry.img.startsWith(`modules/${MOD}/icons/`))moduleImages.add(entry.img);}if(pack.documentName==='Item')itemTypes.add(entry.type);}
    }
    return {foundry:game.version,system:game.system.version,packs,topLevelRecords:packs.reduce((n,p)=>n+p.count,0),uniqueImages:images.size,uniqueModuleIconReferences:moduleImages.size,itemTypes:[...itemTypes].sort(),actorSheets:Object.fromEntries(Object.entries(CONFIG.Actor.sheetClasses).map(([type,entries])=>[type,Object.values(entries).map(e=>({class:e.cls.name,default:e.default,tabs:Array.isArray(e.cls.TABS)?e.cls.TABS.map(t=>t.tab):Object.keys(e.cls.TABS||{})}))])),activityTypes:Object.keys(CONFIG.DND5E.activityTypes).sort()};
  });
  let merged=records;if(only){const previous=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8'));merged=[...previous.records.filter(r=>!only.includes(r.key)),...records];}
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({date,environment:'Existing agent sandbox; read-only app rendering, no actions submitted',runtime,records:merged},null,2)+'\n');
  console.log(JSON.stringify({captured:records.filter(r=>r.file).length,errors:records.filter(r=>r.error)}));
}finally{
  if(client){await client.eval(async()=>{for(const a of window.__noeVisualAudit?.opened||[])try{await a.close();}catch{}delete window.__noeVisualAudit;}).catch(()=>{});await browser.send('Target.detachFromTarget',{sessionId:client.sessionId}).catch(()=>{});}
  browser.close();
}
