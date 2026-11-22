/** Temporary DOM-only art study on an existing sandbox PC sheet. No document writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig,cdpUrl,resolveProfile} from '../agent/lib/config.mjs';
import {browserSession,pages,isFoundryPage} from '../agent/lib/cdp.mjs';
import {Client} from '../agent/lib/e2e.mjs';
const round=process.argv.find(arg=>arg.startsWith('--round='))?.slice(8);
if(round&&!/^r\d{2}$/.test(round))throw new Error('Expected --round=rNN');
const assetRoot=new URL(`../art/m9/${round?round+'/':''}`,import.meta.url);
const candidates=round?JSON.parse(await fs.readFile(new URL('manifest.json',assetRoot),'utf8')).candidates.map(c=>({id:c.id,file:c.file})):[{id:'workshop',file:'workshop-v1.webp'},{id:'field-drawing',file:'field-drawing-v1.webp'}];
const output=fileURLToPath(new URL('previews/',assetRoot));
await fs.mkdir(output,{recursive:true});
// Development artwork may not be exposed by the installed module's static-file route.
const images=Object.fromEntries(await Promise.all(candidates.map(async c=>[c.id,'data:image/webp;base64,'+(await fs.readFile(new URL(c.file,assetRoot))).toString('base64')])));
const cfg=loadConfig(),profile=resolveProfile(cfg,'sandbox'),browser=await browserSession(cdpUrl(cfg));
let client;
const records=[];
try{
  for(const target of (await pages(browser)).filter(t=>isFoundryPage(t,profile))){
    const c=new Client(browser,{name:'m9-sheet-art',targetId:target.targetId,background:true});await c.attach();
    if(await c.eval(()=>game.ready&&game.user.isGM&&game.world.id.startsWith('agent-'))){client=c;break;}
    await browser.send('Target.detachFromTarget',{sessionId:c.sessionId});
  }
  if(!client)throw new Error('A ready GM tab in an existing agent sandbox is required');
  await client.eval(async(images)=>{
    if(window.__noeM9ArtStudy)throw new Error('Another M9 art study already owns this tab');
    const actor=game.actors.getName('Żołnierz w oporządzeniu');
    if(!actor)throw new Error('Expected existing example PC');
    const app=actor.sheet;
    window.__noeM9ArtStudy={app,images,wasRendered:app.rendered,tab:app.tabGroups?.primary,position:{...app.position}};
    await app.render({force:true,position:{left:32,top:24,width:1030,height:890}});
    app.changeTab('features','primary');
    const style=document.createElement('style');style.id='noe-m9-art-study';
    style.textContent=`
      .noe-m9-art-preview {filter:none!important;--dnd5e-application-background:#191e23;--dnd5e-character-body-image:none;}
      .noe-m9-art-preview .window-content::before {background-image:var(--noe-m9-art-image)!important;background-position:top center!important;background-size:cover!important;height:300px!important;opacity:1!important;mask-image:linear-gradient(to bottom,#000 0%,#000 36%,transparent 100%)!important;}
    `;
    document.head.append(style);
    for(const data of Object.values(images)){const image=new Image();image.src=data;await image.decode();}
  },images);
  const cases=round?candidates.flatMap(c=>[[c.id+'-features',c.id,'features',1030],[c.id+'-inventory',c.id,'inventory',1030],[c.id+'-narrow',c.id,'features',820]]):[
    ['stock-features','stock','features',1030],
    ['plain-features','plain','features',1030],
    ['workshop-features','workshop','features',1030],
    ['field-drawing-features','field-drawing','features',1030],
    ['workshop-inventory','workshop','inventory',1030],
    ['field-drawing-inventory','field-drawing','inventory',1030],
    ['workshop-narrow','workshop','features',820],
    ['field-drawing-narrow','field-drawing','features',820]
  ];
  for(const [key,mode,tab,width] of cases){
    const info=await client.eval(async(mode,tab,width)=>{
      const app=window.__noeM9ArtStudy.app,el=app.element;
      el.classList.toggle('noe-m9-art-preview',mode!=='stock');
      el.style.setProperty('--noe-m9-art-image',['stock','plain'].includes(mode)?'none':`url("${window.__noeM9ArtStudy.images[mode]}")`);
      app.setPosition({left:32,top:24,width,height:890});app.changeTab(tab,'primary');
      await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const cs=getComputedStyle(el),underlay=getComputedStyle(el.querySelector('.window-content'),'::before');
      const rect=el.getBoundingClientRect();
      return {mode,tab,width:Math.round(rect.width),height:Math.round(rect.height),filter:cs.filter,background:mode==='stock'?'existing-dnd5e':mode==='plain'?'none':`${mode}-v1.webp (embedded for preview)`,underlayOpacity:underlay.opacity,underlayHeight:underlay.height};
    },mode,tab,width);
    await client.front(200);
    const shot=await client.send('Page.captureScreenshot',{format:'webp',quality:90,fromSurface:false},{timeoutMs:15000});
    await fs.writeFile(path.join(output,key+'.webp'),Buffer.from(shot.data,'base64'));
    records.push({key,file:key+'.webp',...info});
  }
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({date:'2026-11-15',round:round||'r01',status:'art-study-only',scope:'Existing PC features/inventory/narrow. Art and base surface only; other controls remain existing UI. No actions or document writes.',records},null,2)+'\n');
  console.log(JSON.stringify({captures:records.length,records}));
}finally{
  if(client){await client.eval(async()=>{
    document.getElementById('noe-m9-art-study')?.remove();
    const state=window.__noeM9ArtStudy;if(!state)return;
    state.app.element?.classList.remove('noe-m9-art-preview');state.app.element?.style.removeProperty('--noe-m9-art-image');
    if(state.wasRendered){state.app.changeTab(state.tab,'primary');state.app.setPosition(state.position);}else await state.app.close();
    delete window.__noeM9ArtStudy;
  }).catch(()=>{});await browser.send('Target.detachFromTarget',{sessionId:client.sessionId}).catch(()=>{});}
  browser.close();
}
