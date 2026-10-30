/** Garage art stays usable through panel navigation and a complete station reset. */
async function prepare() {
  if (!game.poligon) {
    const state = await import("/agent-poligon/lib/state.mjs");
    if (!game.settings.settings.has("world.poligonStan")) state.registerStateSettings();
    game.poligon = await (await import("/agent-poligon/api.mjs")).createApi("sandbox");
  }
  const untouched = canvas.scene.id;
  const [r] = await game.poligon.stations.reset("garaz", { fast: true, source: "e2e" });
  return { ok: r.ok, error: r.error, missing: r.missing, untouched };
}

function inventory() {
  const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  const docs = game.poligon.stations.documents("garaz");
  return { actors: docs.actors.length, scenes: docs.scenes.map(s => ({ id: s.id, key: s.flags[M].testScene.key,
    art: s.flags[M].vehicleArtGallery ?? null, width:s.width, height:s.height, grid:s.grid.size,
    vehicles: s.tokens.filter(t => t.actor?.type === "vehicle").map(v => ({ id: v.id, name: v.actor.name,
      art: v.texture.src, dimensions: [v.width,v.height],
      seats: P.miejscaPojazdu(v.actor).length, crew: P.jadacyPojazdu(v).length })),
    figures: s.tokens.filter(t => t.actor?.type === "npc").map(t => ({ scale: t.texture.scaleX,
      reference:!t.flags[M]?.jazda,x:t.x,y:t.y,width:t.width,height:t.height,
      prototype: t.actor.prototypeToken.texture.scaleX, art: t.texture.src })) })) };
}

async function point(client, id, over, scale=2.2) {
  await client.front(0);
  const pos = await client.eval(async ({id,scale}) => {
    const p = canvas.scene.tokens.get(id).getCenterPoint();
    canvas.pan({ ...p, scale });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const at = canvas.stage.toGlobal(new PIXI.Point(p.x,p.y)); return { x: at.x, y: at.y };
  }, {id,scale});
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x:0,y:0 });
  if (over) await client.send("Input.dispatchMouseEvent", { type:"mouseMoved",...pos });
}

/** Catalogue frame ×1,1 (SKALA_POJAZDOW, D45) — token squares on a 1,5 m map. */
const wSkali = ([w, h], cw, ch) => Math.abs(w - cw * 1.1) < 1e-3 && Math.abs(h - ch * 1.1) < 1e-3;

export default {
  name: "garaz-grafika", clients: ["gm","Gracz 1","Gracz 2"],
  async run(t) {
    let initial;
    await t.step("Garage rebuild creates fourteen art previews and paints the main parking vehicles", async () => {
      initial = await t.gm.eval(prepare);
      t.assert(initial.ok && !initial.missing.length, "garage builds without missing assets or actors", initial);
      const inv = await t.gm.eval(inventory);
      t.equal(inv.scenes.length,17,"parking, fourteen vehicle previews, the wreck gallery and the creature-scale comparison (S0)");
      const parking = inv.scenes.find(s => s.key === "parking");
      for (const id of ["osobowka","hammer","motocykl","ciezarowka","buggy","autobus","traktor","wozStrazacki","buldozer","bwp","czolg","motorower","rower","deskorolka"]) {
        const slug=id==='wozStrazacki'?'woz-strazacki':id;
        t.assert(parking.vehicles.some(v => v.art.endsWith(`/pojazdy/${slug}.webp`) && !v.art.includes("_placeholder")), "native parking art: " + id);
        const preview = inv.scenes.find(s => s.art === id);
        t.assert(!!preview,"preview: " + id);
        if(id==='motorower')t.assert([...preview.vehicles,...parking.vehicles.filter(v=>v.art.endsWith('/pojazdy/motorower.webp'))]
          .every(v=>wSkali(v.dimensions,.6,1.56)),'moped preview and Parking keep the GM-requested 120% dimensions after rebuild (×1,1, D45)');
        if (id === "buggy") t.assert([...preview.vehicles,...parking.vehicles.filter(v=>v.art.endsWith('/pojazdy/buggy.webp'))]
          .every(v=>wSkali(v.dimensions,1.4,2.8)),"buggy preview and Parking keep the calibrated 2.1 m wide frame after rebuild (×1,1, D45)");
        t.assert(preview.vehicles.some(v => v.crew === v.seats && v.crew > 0),"fully crewed: " + id);
        if(id==='wozStrazacki')t.assert([...preview.vehicles,...parking.vehicles.filter(v=>v.art.endsWith('/pojazdy/woz-strazacki.webp'))]
          .every(v=>wSkali(v.dimensions,2,5.5)),'fire pumper uses the shorter portrait-matched frame in preview and Parking (×1,1, D45)');
        t.assert(preview.figures.every(f => f.scale === 1 && f.prototype === 1 && f.art.startsWith("systems/dnd5e/")),"stock figures have original scales: " + id);
        if(id==='autobus'){
          const refs=preview.figures.filter(f=>f.reference);
          t.equal(refs.length,21,'one reference for each of the 21 bus seats');
          t.equal(new Set(refs.map(f=>f.y)).size,4,'bus references wrap to four rows');
          t.assert(refs.every(f=>f.x>=0&&f.y>=0&&f.x+f.width*preview.grid<=preview.width&&f.y+f.height*preview.grid<=preview.height),'all bus references fit inside the larger scene');
        }
      }
      t.assert(await t.gm.eval(id => game.scenes.has(id),initial.untouched),"unrelated fixture scene retained");
    });
    await t.step("The real Garage trial card opens all fourteen previews for GM and player", async () => {
      await t.gm.eval(async () => {
        await game.poligon.stations.go("garaz");
        for (const app of [...foundry.applications.instances.values()]) if (app.document && app.rendered) await app.close();
        game.poligon.panel.open();
      });
      await t.waitFor(t.gm,()=>!!document.querySelector('#poligon-panel [data-tab="proby"]'),{message:"panel available"});
      await t.gm.eval(()=>document.querySelector('#poligon-panel [data-tab="proby"]').click());
      await t.waitFor(t.gm,()=>document.querySelectorAll('#poligon-panel [data-op="tool"]').length === 19,{message:"parking, fourteen vehicles, wreck artwork and three creature-scale buttons"});
      for (const [i,key] of [[0,"parking"],[1,"vehicle-art-review-v4"],[2,"hammer-art-review-v1"],[4,"ciezarowka-art-review-v1"],[5,"buggy-art-review-v1"],[6,"autobus-art-review-v1"],[7,"traktor-art-review-v1"],[8,"woz-strazacki-art-review-v1"],[9,"buldozer-art-review-v1"],[10,"bwp-art-review-v1"],[11,"czolg-art-review-v1"],[12,"motorower-art-review-v1"],[13,"rower-art-review-v1"],[14,"deskorolka-art-review-v1"],[15,"wraki-art-review-v1"],[3,"motocykl-art-review-v1"]]) {
        await t.gm.eval(i=>document.querySelector(`#poligon-panel [data-op="tool"][data-arg="${i}"]`).click(),i);
        for (const client of [t.gm,t.client("Gracz 1")])
          await t.waitFor(client,key=>canvas.ready&&canvas.scene.flags["neuroshima-2026-overrides"]?.testScene?.key===key,{args:[key],message:"preview activated from card"});
      }
      await t.screenshot("gm","garage card and motorcycle preview");
      await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()]) if(app.id==='poligon-panel')await app.close();});
    });
    await t.step("Motorcycle preview supports boarding from the seat window and keeps both riders on a turn", async () => {
      const s = await t.gm.eval(async () => {
        const M="neuroshima-2026-overrides",P=game.neuroshima.pojazdy;
        const bikes=canvas.scene.tokens.filter(t=>t.actor?.type==='vehicle');
        const empty=bikes.find(t=>P.jadacyPojazdu(t).length===0),full=bikes.find(t=>P.jadacyPojazdu(t).length===2);
        const ref=canvas.scene.tokens.find(t=>t.actor?.type==='npc'&&!t.flags[M]?.jazda);
        ref.object.control({releaseOthers:true});
        await P.otworzMiejsca(empty);
        return{empty:empty.id,full:full.id,ref:ref.id,crew:P.jadacyPojazdu(full).map(t=>t.id)};
      });
      await t.gm.eval(()=>document.querySelector('.neuro-okno-miejsc [data-miejsce="siodlo-0-0"]').click());
      await t.waitFor(t.gm,s=>canvas.scene.tokens.get(s.ref).flags['neuroshima-2026-overrides']?.jazda?.pojazd===s.empty,{args:[s],message:"boarded preview bike from UI"});
      // Successful boarding closes the seat window. Reopen it before using its exit action.
      await t.gm.eval(s=>game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty),canvas.scene.tokens.get(s.ref)),s);
      await t.gm.eval(()=>document.querySelector('.neuro-miejsca-wysiadz').click());
      await t.waitFor(t.gm,s=>{const d=canvas.scene.tokens.get(s.ref);return !d.flags['neuroshima-2026-overrides']?.jazda&&d.width===1;},{args:[s],message:"preview passenger exits at original size"});
      await t.gm.eval(async s=>{
        for(const app of [...foundry.applications.instances.values()])if(app.id?.startsWith('neuro-miejsca-'))await app.close();
        canvas.tokens.releaseAll();
        await canvas.scene.moveTokens({[s.full]:{destination:{x:2250,y:800,rotation:90,action:'displace'}}},{animate:false,showRuler:false,method:'api'});
      },s);
      await t.waitFor(t.client("Gracz 1"),s=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.full);
        return v.rotation===90&&s.crew.every(id=>{
          const d=canvas.scene.tokens.get(id),m=P.miejsceOId(v.actor,d.flags['neuroshima-2026-overrides'].jazda.miejsce);
          const p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();
          return d.object.visible&&d.object.mesh.sort>v.object.mesh.sort&&Math.hypot(p.x-a.x,p.y-a.y)<2;
        });
      },{args:[s],message:"both exposed figures follow rotated motorcycle"});
      await point(t.gm,s.full,true);
      await t.screenshot("gm","interactive motorcycle with both riders");
    });
    for(const def of [{id:'hammer',key:'hammer-art-review-v1',count:5,hidden:4,prefix:'wiezyczka'},
      {id:'wozStrazacki',key:'woz-strazacki-art-review-v1',count:6,hidden:5,prefix:'dzialko'}])
    await t.step(`${def.id}: matched cab cutaway and permanently exposed deck operator`, async () => {
      await t.gm.eval(d=>game.poligon.stations.view('garaz',d.key),def);
      await t.waitFor(t.gm,id=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery===id,{args:[def.id],message:'closed cab preview'});
      const s=await t.gm.eval(d=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.find(t=>t.actor?.type==='vehicle'&&P.jadacyPojazdu(t).length===d.count);
        return{vehicle:v.id,hidden:d.hidden,prefix:d.prefix,crew:P.jadacyPojazdu(v).map(t=>({id:t.id,seat:t.flags['neuroshima-2026-overrides'].jazda.miejsce}))};
      },def);
      await point(t.gm,s.vehicle,true);
      await t.waitFor(t.gm,s=>{
        const v=canvas.tokens.get(s.vehicle),art=v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika;
        return v.mesh.alpha===1&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.wnetrze)?.baseTexture
          &&s.crew.every(c=>canvas.tokens.get(c.id).visible);
      },{args:[s],message:"matched opaque interior and all figures"});
      await t.screenshot("gm",`${def.id} matched interior and crew`);
      await point(t.gm,s.vehicle,false);
      await t.waitFor(t.gm,s=>{
        const v=canvas.tokens.get(s.vehicle),h=s.crew.find(c=>c.seat.startsWith(s.prefix));
        return v.mesh.texture===v.texture&&v.neuroKropki.children.length===s.hidden&&canvas.tokens.get(h.id).visible;
      },{args:[s],message:"closed cab retains the exposed operator"});
      if(def.id==='wozStrazacki'){
        const observer=t.client('Gracz 2');
        await t.waitFor(observer,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery==='wozStrazacki',{message:'observer fire-engine scene'});
        await point(observer,s.vehicle,false,1.6);
        await observer.eval(()=>canvas.tokens.releaseAll());
        await t.waitFor(observer,s=>{
          const v=canvas.tokens.get(s.vehicle),h=s.crew.find(c=>c.seat.startsWith(s.prefix)),operator=canvas.tokens.get(h.id);
          return !v.hover&&v.neuroKropki.children.length===5&&operator.visible&&operator.mesh.sort>v.mesh.sort
            &&s.crew.filter(c=>c!==h).every(c=>!canvas.tokens.get(c.id).visible);
        },{args:[s],message:'five concealed cab riders and full deck operator above the closed vehicle'});
        t.assert(await observer.eval(s=>{const c=s.crew.find(c=>c.seat.startsWith(s.prefix)),r=canvas.tokens.get(c.id);r.setTarget(true,{releaseOthers:true});return r.isTargeted;},s),'water-monitor operator targetable');
        await t.screenshot('Gracz 2','fire pumper closed cab and exposed water monitor operator');
        await t.gm.eval(s=>canvas.scene.moveTokens({[s.vehicle]:{destination:{x:1900,y:450,rotation:90,action:'displace'}}},{animate:false,showRuler:false,method:'api'}),s);
        await t.waitFor(observer,s=>{
          const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);
          return v.rotation===90&&s.crew.every(c=>{const d=canvas.scene.tokens.get(c.id),m=P.miejsceOId(v.actor,c.seat);
            const p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();return Math.hypot(p.x-a.x,p.y-a.y)<2;});
        },{args:[s],message:'all six fire-engine occupants follow movement and rotation'});
      }
    });
    await t.step("Truck closed cab hides three figures while all eight cargo-bed occupants stay visible", async () => {
      await t.gm.eval(()=>game.poligon.stations.view('garaz','ciezarowka-art-review-v1'));
      await t.waitFor(t.gm,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery==='ciezarowka',{message:'truck preview'});
      const s=await t.gm.eval(()=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.find(t=>t.actor?.type==='vehicle'&&P.jadacyPojazdu(t).length===11);
        return{vehicle:v.id,crew:P.jadacyPojazdu(v).map(d=>({id:d.id,seat:d.flags['neuroshima-2026-overrides'].jazda.miejsce}))};
      });
      // A player auto-controls their own passenger on scene entry; deselect it to inspect the roof view.
      await t.client('Gracz 2').eval(()=>canvas.tokens.releaseAll());
      await point(t.client('Gracz 2'),s.vehicle,false);
      await t.waitFor(t.client('Gracz 2'),s=>{
        const v=canvas.tokens.get(s.vehicle);
        return v.mesh.texture===v.texture&&v.neuroKropki.children.length===3
          &&s.crew.filter(c=>c.seat.startsWith('paka')).every(c=>canvas.tokens.get(c.id).visible)
          &&s.crew.filter(c=>c.seat.startsWith('kabina')).every(c=>!canvas.tokens.get(c.id).visible);
      },{args:[s],message:'eight exposed cargo figures and three concealed cab figures'});
      await t.screenshot('Gracz 2','truck closed cab and occupied open bed');
      await point(t.gm,s.vehicle,true);
      await t.waitFor(t.gm,s=>{
        const v=canvas.tokens.get(s.vehicle),art=v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika;
        return v.mesh.alpha===1&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.wnetrze)?.baseTexture
          &&s.crew.every(c=>canvas.tokens.get(c.id).visible);
      },{args:[s],message:'roof-off truck shows all eleven occupants'});
      await t.screenshot('gm','truck exposed cab and occupied open bed');
      await t.gm.eval(async s=>{
        await canvas.scene.moveTokens({[s.vehicle]:{destination:{x:2000,y:650,rotation:90,action:'displace'}}},
          {animate:false,showRuler:false,method:'api'});
      },s);
      await t.waitFor(t.client('Gracz 2'),s=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);
        return v.rotation===90&&s.crew.every(c=>{
          const d=canvas.scene.tokens.get(c.id),m=P.miejsceOId(v.actor,c.seat);
          const p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();
          return Math.hypot(p.x-a.x,p.y-a.y)<2&&(!c.seat.startsWith('paka')||d.object.visible&&d.object.mesh.sort>v.object.mesh.sort);
        });
      },{args:[s],message:'all eleven anchors follow the turned truck'});
    });
    for (const [id,count] of [['buggy',2],['traktor',2],['buldozer',2],['motorower',1],['rower',1],['deskorolka',1]]) await t.step(`${id}: occupants stay exposed and targetable through movement and rotation`, async () => {
      await t.gm.eval(id=>game.poligon.stations.view('garaz',`${id}-art-review-v1`),id);
      for(const client of [t.gm,t.client('Gracz 2')])
        await t.waitFor(client,id=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery===id,{args:[id],message:`${id} preview`});
      const s=await t.gm.eval(count=>{
        canvas.tokens.releaseAll();
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.find(v=>v.actor?.type==='vehicle'&&P.jadacyPojazdu(v).length===count);
        return{vehicle:v.id,crew:P.jadacyPojazdu(v).map(d=>({id:d.id,seat:d.flags['neuroshima-2026-overrides'].jazda.miejsce}))};
      },count);
      await point(t.client('Gracz 2'),s.vehicle,false);
      await t.client('Gracz 2').eval(()=>canvas.tokens.releaseAll());
      await t.waitFor(t.client('Gracz 2'),s=>{
        const v=canvas.tokens.get(s.vehicle);
        return !v.hover&&s.crew.every(c=>{const d=canvas.tokens.get(c.id);return d.visible&&d.mesh.sort>v.mesh.sort&&d.document.texture.scaleX===1;});
      },{args:[s],message:'full occupant tokens remain visible above the open vehicle without hover'});
      t.assert(await t.client('Gracz 2').eval(s=>{
        const rider=canvas.tokens.get(s.crew[0].id);rider.setTarget(true,{releaseOthers:true});return rider.isTargeted;
      },s),'exposed rider can be targeted');
      await t.screenshot('Gracz 2',`${id} exposed occupants above open vehicle`);
      await t.gm.eval(async s=>{
        await canvas.scene.moveTokens({[s.vehicle]:{destination:{x:2250,y:800,rotation:90,action:'displace'}}},
          {animate:false,showRuler:false,method:'api'});
      },s);
      await t.waitFor(t.client('Gracz 2'),s=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);
        return v.rotation===90&&s.crew.every(c=>{
          const d=canvas.scene.tokens.get(c.id),m=P.miejsceOId(v.actor,c.seat);
          const p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();
          return d.object.visible&&d.object.mesh.sort>v.object.mesh.sort&&Math.hypot(p.x-a.x,p.y-a.y)<2;
        });
      },{args:[s],message:'all exposed seat anchors follow the turned vehicle'});
      if (['traktor','buldozer','motorower','rower','deskorolka'].includes(id)) {
        const boarding=await t.gm.eval(async id=>{
          const M='neuroshima-2026-overrides',P=game.neuroshima.pojazdy;
          const empty=canvas.scene.tokens.find(v=>v.actor?.type==='vehicle'&&!P.jadacyPojazdu(v).length);
          const ref=canvas.scene.tokens.find(v=>v.actor?.type==='npc'&&!v.flags[M]?.jazda);
          ref.object.control({releaseOthers:true});await P.otworzMiejsca(empty);
          return{vehicle:empty.id,rider:ref.id,seat:id==='deskorolka'?'deska-0-0':['motorower','rower'].includes(id)?'siodlo-0-0':id==='buldozer'?'kabina-0-1':'kabina-1-0'};
        },id);
        await t.gm.eval(s=>document.querySelector(`.neuro-okno-miejsc [data-miejsce="${s.seat}"]`).click(),boarding);
        await t.waitFor(t.gm,s=>canvas.scene.tokens.get(s.rider).flags['neuroshima-2026-overrides']?.jazda?.pojazd===s.vehicle,
          {args:[boarding],message:'boarding the open position through the seat window'});
        await t.gm.eval(s=>game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.vehicle),canvas.scene.tokens.get(s.rider)),boarding);
        await t.gm.eval(()=>document.querySelector('.neuro-miejsca-wysiadz').click());
        await t.waitFor(t.gm,s=>{const d=canvas.scene.tokens.get(s.rider);return !d.flags['neuroshima-2026-overrides']?.jazda&&d.width===1&&d.texture.scaleX===1;},
          {args:[boarding],message:'leaving the open vehicle restores the source size and scale'});
        await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()])if(app.id?.startsWith('neuro-miejsca-'))await app.close();});
      }
    });
    await t.step("Bus cutaway reveals all 21 seats, moves every rider and supports boarding from its seat window", async () => {
      await t.gm.eval(()=>game.poligon.stations.view('garaz','autobus-art-review-v1'));
      for(const client of [t.gm,t.client('Gracz 2')])
        await t.waitFor(client,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery==='autobus',{message:'bus preview'});
      const s=await t.gm.eval(()=>{
        canvas.tokens.releaseAll();
        const M='neuroshima-2026-overrides',P=game.neuroshima.pojazdy;
        const vehicles=canvas.scene.tokens.filter(v=>v.actor?.type==='vehicle');
        const full=vehicles.find(v=>P.jadacyPojazdu(v).length===21),empty=vehicles.find(v=>!P.jadacyPojazdu(v).length);
        const ref=canvas.scene.tokens.find(t=>t.actor?.type==='npc'&&!t.flags[M]?.jazda);
        return{vehicle:full.id,empty:empty.id,ref:ref.id,lastSeat:P.miejscaPojazdu(empty.actor).at(-1).id,
          crew:P.jadacyPojazdu(full).map(d=>({id:d.id,seat:d.flags[M].jazda.miejsce}))};
      });
      await point(t.client('Gracz 2'),s.vehicle,false,.9);
      await t.client('Gracz 2').eval(()=>canvas.tokens.releaseAll());
      await t.waitFor(t.client('Gracz 2'),s=>s.crew.every(c=>!canvas.tokens.get(c.id).visible),{args:[s],message:'closed bus conceals all 21 occupants'});
      await t.screenshot('Gracz 2','bus closed roof and 21 concealed seats');
      await point(t.gm,s.vehicle,true,.9);
      await t.waitFor(t.gm,s=>{
        const M='neuroshima-2026-overrides',v=canvas.tokens.get(s.vehicle),art=v.actor.flags[M].pojazd.grafika;
        return v.mesh.alpha===1&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.wnetrze)?.baseTexture
          &&s.crew.every(c=>canvas.tokens.get(c.id).visible);
      },{args:[s],message:'bus cutaway reveals driver and all twenty passengers'});
      await t.screenshot('gm','bus exposed interior with all 21 occupants');
      await t.gm.eval(async s=>{
        // Destination uses pre-swap dimensions; keep the turned bus above the reference figures.
        await canvas.scene.moveTokens({[s.vehicle]:{destination:{x:1900,y:600,rotation:90,action:'displace'}}},
          {animate:false,showRuler:false,method:'api'});
      },s);
      await t.waitFor(t.client('Gracz 2'),s=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);
        return v.rotation===90&&s.crew.every(c=>{
          const d=canvas.scene.tokens.get(c.id),m=P.miejsceOId(v.actor,c.seat);
          const p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();
          return Math.hypot(p.x-a.x,p.y-a.y)<2;
        });
      },{args:[s],message:'all 21 bus anchors follow movement and rotation'});
      await t.gm.eval(async s=>{
        canvas.tokens.get(s.ref).control({releaseOthers:true});
        await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty));
      },s);
      await t.gm.eval(s=>document.querySelector(`.neuro-okno-miejsc [data-miejsce="${s.lastSeat}"]`).click(),s);
      await t.waitFor(t.gm,s=>canvas.scene.tokens.get(s.ref).flags['neuroshima-2026-overrides']?.jazda?.pojazd===s.empty,{args:[s],message:'boarding the last passenger seat from the real window'});
      await t.gm.eval(s=>game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty),canvas.scene.tokens.get(s.ref)),s);
      await t.gm.eval(()=>document.querySelector('.neuro-miejsca-wysiadz').click());
      await t.waitFor(t.gm,s=>{const d=canvas.scene.tokens.get(s.ref);return !d.flags['neuroshima-2026-overrides']?.jazda&&d.width===1&&d.texture.scaleX===1;},{args:[s],message:'leaving restores the original figure dimensions and scale'});
      await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()])if(app.id?.startsWith('neuro-miejsca-'))await app.close();});
    });
    await t.step("Bradley: nine concealed occupants, inward benches, movement and seat changes", async () => {
      await t.gm.eval(()=>game.poligon.stations.view('garaz','bwp-art-review-v1'));
      const observer=t.client('Gracz 2');
      for(const client of [t.gm,observer])
        await t.waitFor(client,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery==='bwp',{message:'Bradley preview'});
      const s=await t.gm.eval(()=>{
        canvas.tokens.releaseAll();
        const M='neuroshima-2026-overrides',P=game.neuroshima.pojazdy,vs=canvas.scene.tokens.filter(v=>v.actor?.type==='vehicle');
        const full=vs.find(v=>P.jadacyPojazdu(v).length===9),empty=vs.find(v=>!P.jadacyPojazdu(v).length);
        const ref=canvas.scene.tokens.find(t=>t.actor?.type==='npc'&&!t.flags[M]?.jazda);
        return{vehicle:full.id,empty:empty.id,ref:ref.id,seats:P.miejscaPojazdu(full.actor).length,
          crew:P.jadacyPojazdu(full).map(d=>({id:d.id,seat:d.flags[M].jazda.miejsce,obrot:d.flags[M].jazda.obrot}))};
      });
      t.equal(s.seats,9,'one driver, two turret crew and six dismounts');
      t.assert(s.crew.filter(c=>c.seat.startsWith('desant')).every(c=>c.obrot===(c.seat.endsWith('-0')?90:270)),'opposite bench facings initialized on boarding');
      await observer.eval(()=>canvas.tokens.releaseAll());
      await point(observer,s.vehicle,false,1.6);
      await t.waitFor(observer,s=>{const v=canvas.tokens.get(s.vehicle);return v.neuroKropki.children.length===9&&s.crew.every(c=>!canvas.tokens.get(c.id).visible);},
        {args:[s],message:'closed Bradley hides all nine occupants'});
      await t.screenshot('Gracz 2','Bradley closed roof and nine concealed occupants');
      await point(t.gm,s.vehicle,true,1.6);
      await t.waitFor(t.gm,s=>{
        const v=canvas.tokens.get(s.vehicle),art=v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika;
        return v.mesh.alpha===1&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.wnetrze)?.baseTexture
          &&v.neuroWieza?.mesh?.visible===false&&s.crew.every(c=>canvas.tokens.get(c.id).visible);
      },{args:[s],message:'Bradley cutaway exposes all nine figures'});
      await t.screenshot('gm','Bradley nine occupants and opposite benches');
      await t.gm.eval(s=>canvas.scene.moveTokens({[s.vehicle]:{destination:{x:1900,y:450,rotation:90,action:'displace'}}},{animate:false,showRuler:false,method:'api'}),s);
      await t.waitFor(observer,s=>{
        const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);
        return v.rotation===90&&s.crew.every(c=>{
          const d=canvas.scene.tokens.get(c.id),m=P.miejsceOId(v.actor,c.seat),p=P.geometria.srodekMiejsca(v.getCenterPoint(),v.rotation,m,canvas.scene.grid.size),a=d.getCenterPoint();
          return Math.hypot(p.x-a.x,p.y-a.y)<2&&d.rotation===(90+c.obrot)%360;
        });
      },{args:[s],message:'all nine anchors and opposite facings rotate with Bradley'});
      await t.gm.eval(async s=>{canvas.tokens.get(s.ref).control({releaseOthers:true});await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty));},s);
      for(const [seat,rotation]of [['desant-2-0',90],['desant-2-1',270],['kabina-0-0',0]]){
        await t.gm.eval(async s=>{await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty),canvas.scene.tokens.get(s.ref));},s);
        await t.gm.eval(seat=>document.querySelector(`.neuro-okno-miejsc [data-miejsce="${seat}"]`).click(),seat);
        await t.waitFor(t.gm,({s,seat,rotation})=>{const d=canvas.scene.tokens.get(s.ref),j=d.flags['neuroshima-2026-overrides']?.jazda;return j?.pojazd===s.empty&&j.miejsce===seat&&d.rotation===rotation;},
          {args:[{s,seat,rotation}],message:'seat change updates inward/forward facing: '+seat});
      }
      await t.gm.eval(s=>game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty),canvas.scene.tokens.get(s.ref)),s);
      await t.gm.eval(()=>document.querySelector('.neuro-miejsca-wysiadz').click());
      await t.waitFor(t.gm,s=>{const d=canvas.scene.tokens.get(s.ref);return !d.flags['neuroshima-2026-overrides']?.jazda&&d.width===1&&d.texture.scaleX===1;},{args:[s],message:'Bradley exit restores original figure size and scale'});
      await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()])if(app.id?.startsWith('neuro-miejsca-'))await app.close();});
    });
    await t.step('Abrams: four crew, overhanging gun and correctly registered seat window',async()=>{
      await t.gm.eval(()=>game.poligon.stations.view('garaz','czolg-art-review-v1'));
      const observer=t.client('Gracz 2');
      for(const client of [t.gm,observer])await t.waitFor(client,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery==='czolg',{message:'Abrams preview'});
      const s=await t.gm.eval(()=>{
        canvas.tokens.releaseAll();const M='neuroshima-2026-overrides',P=game.neuroshima.pojazdy,vs=canvas.scene.tokens.filter(v=>v.actor?.type==='vehicle');
        const full=vs.find(v=>P.jadacyPojazdu(v).length===4),empty=vs.find(v=>!P.jadacyPojazdu(v).length),ref=canvas.scene.tokens.find(d=>d.actor?.type==='npc'&&!d.flags[M]?.jazda);
        return{vehicle:full.id,empty:empty.id,ref:ref.id,width:full.width,height:full.height,fit:full.texture.fit,anchorY:full.texture.anchorY,
          crew:P.jadacyPojazdu(full).map(d=>({id:d.id,seat:d.flags[M].jazda.miejsce}))};
      });
      t.assert(wSkali([s.width,s.height],2.6,5.6),'hull 2.6 × 5.6 ×1,1 (D45); length excludes barrel',[s.width,s.height]);t.equal(s.fit,'width','art fits physical hull width');t.equal(s.anchorY,.4,'gun overhang extends forward');
      await observer.eval(()=>canvas.tokens.releaseAll());await point(observer,s.vehicle,false,1.2);
      await t.waitFor(observer,s=>{const v=canvas.tokens.get(s.vehicle);return v.neuroKropki.children.length===4&&v.neuroWieza?.mesh?.visible&&s.crew.every(c=>!canvas.tokens.get(c.id).visible);},{args:[s],message:'closed Abrams conceals four crew'});
      await t.screenshot('Gracz 2','Abrams closed hull and gun overhang');
      await point(t.gm,s.vehicle,true,1.2);
      await t.waitFor(t.gm,s=>{const v=canvas.tokens.get(s.vehicle),art=v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika;return v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.wnetrze)?.baseTexture&&!v.neuroWieza.mesh.visible&&s.crew.every(c=>canvas.tokens.get(c.id).visible);},{args:[s],message:'Abrams cutaway exposes all four crew'});
      await t.screenshot('gm','Abrams four crew and turbine compartment');
      await t.gm.eval(s=>canvas.scene.moveTokens({[s.vehicle]:{destination:{x:1900,y:450,rotation:90,action:'displace'}}},{animate:false,showRuler:false,method:'api'}),s);
      await t.waitFor(observer,s=>{const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.get(s.vehicle);return v.rotation===90&&s.crew.every(c=>{const d=canvas.scene.tokens.get(c.id),p=P.geometria.srodekMiejsca(v.getCenterPoint(),90,P.miejsceOId(v.actor,c.seat),canvas.scene.grid.size),a=d.getCenterPoint();return Math.hypot(p.x-a.x,p.y-a.y)<2;});},{args:[s],message:'four Abrams anchors follow rotation'});
      await t.gm.eval(async s=>{canvas.tokens.get(s.ref).control({releaseOthers:true});await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty));await document.querySelector('.neuro-miejsca-tlo').decode();},s);
      const windowGeometry=await t.gm.eval(()=>{
        const img=document.querySelector('.neuro-miejsca-tlo').getBoundingClientRect(),frame=document.querySelector('.neuro-miejsca-kadr'),body=frame.getBoundingClientRect();
        const positions={'kadlub-0-0':[390,1310],'wieza-0-0':[285,770],'wieza-1-0':[517,875],'dzialo-0-0':[276,980]};
        return{ratio:img.height/body.height,top:img.top-body.top,overflow:getComputedStyle(frame).overflow,
          errors:Object.entries(positions).map(([seat,[x,y]])=>{const b=document.querySelector(`.neuro-okno-miejsc [data-miejsce="${seat}"]`).getBoundingClientRect();return{seat,error:Math.hypot(b.x+b.width/2-img.x-x/780*img.width,b.y+b.height/2-img.y-y/2100*img.height)};})};
      });
      t.assert(Math.abs(windowGeometry.ratio-1.25)<.005&&Math.abs(windowGeometry.top)<1&&windowGeometry.overflow==='hidden','seat window crops the barrel overhang without squeezing the hull');
      t.assert(windowGeometry.errors.every(p=>p.error<1),'all four seat buttons align with painted cushions: '+JSON.stringify(windowGeometry.errors));
      await t.screenshot('gm','Abrams seat window with physical hull viewport');
      await t.gm.eval(()=>document.querySelector('.neuro-okno-miejsc [data-miejsce="dzialo-0-0"]').click());
      await t.waitFor(t.gm,s=>canvas.scene.tokens.get(s.ref).flags['neuroshima-2026-overrides']?.jazda?.pojazd===s.empty,{args:[s],message:'boarding Abrams gunner workstation'});
      await t.gm.eval(s=>game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.empty),canvas.scene.tokens.get(s.ref)),s);
      await t.gm.eval(()=>document.querySelector('.neuro-miejsca-wysiadz').click());
      await t.waitFor(t.gm,s=>{const d=canvas.scene.tokens.get(s.ref);return !d.flags['neuroshima-2026-overrides']?.jazda&&d.width===1&&d.texture.scaleX===1;},{args:[s],message:'Abrams exit restores source character scale'});
      await t.gm.eval(async()=>{for(const app of [...foundry.applications.instances.values()])if(app.id?.startsWith('neuro-miejsca-'))await app.close();});
    });
    for(const spec of [{id:'bwp',key:'bwp-art-review-v1'},{id:'czolg',key:'czolg-art-review-v1'}])
    await t.step(`${spec.id}: turret artwork follows its hull through animation, scale, visibility and redraw`, async () => {
      await t.gm.eval(key=>game.poligon.stations.view('garaz',key),spec.key);
      const observer=t.client('Gracz 2');
      for(const client of [t.gm,observer])await t.waitFor(client,id=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.vehicleArtGallery===id,{args:[spec.id],message:'layered vehicle scene'});
      const s=await t.gm.eval(()=>{
        canvas.tokens.releaseAll();const P=game.neuroshima.pojazdy,v=canvas.scene.tokens.find(v=>v.actor?.type==='vehicle'&&!P.jadacyPojazdu(v).length);
        return{id:v.id,src:v.texture.src,custom:canvas.scene.tokens.find(t=>t.actor?.type==='npc').texture.src,
          geometry:v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika.wieza};
      });
      await point(t.gm,s.id,false,spec.id==='czolg'?1.2:1.5);await point(observer,s.id,false,spec.id==='czolg'?1.2:1.5);
      await t.waitFor(observer,s=>{
        const v=canvas.tokens.get(s.id),art=v.actor.flags['neuroshima-2026-overrides'].pojazd.grafika,top=v.neuroWieza?.mesh;
        return top?.visible&&top.parent===canvas.primary&&v.mesh.texture.baseTexture===foundry.canvas.getTexture(art.kadlub)?.baseTexture
          &&Math.abs(top.anchor.x-(s.geometry.os[0]-s.geometry.wycinek[0])/s.geometry.wycinek[2])<1e-8
          &&Math.abs(top.anchor.y-(s.geometry.os[1]-s.geometry.wycinek[1])/s.geometry.wycinek[3])<1e-8;
      },{args:[s],message:'separate hull and turret use the bearing pivot, not the crop center'});
      await t.screenshot('Gracz 2',`${spec.id} separate hull and turret at original appearance`);
      const animation=await t.gm.eval(async s=>{
        const v=canvas.scene.tokens.get(s.id),samples=[];
        const sample=()=>{
          const body=v.object.mesh,top=v.object.neuroWieza?.mesh;if(!top)return;
          const at=body.parent.toLocal(new PIXI.Point((s.geometry.os[0]/s.geometry.kadr[0]-body.anchor.x)*body.texture.orig.width,
            (s.geometry.os[1]/s.geometry.kadr[1]-body.anchor.y)*body.texture.orig.height),body);
          samples.push({angle:body.angle,error:Math.hypot(top.x-at.x,top.y-at.y),angleError:Math.abs(top.rotation-body.rotation)});
        };
        canvas.app.ticker.add(sample,undefined,PIXI.UPDATE_PRIORITY.LOW);
        try{
          await v.move({x:v.x+200,y:v.y+200,rotation:90},{method:'api',animation:{duration:1000},showRuler:false});
          for(let i=0;i<150&&v.object.animationContexts.size;i++)await new Promise(r=>setTimeout(r,20));
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          return{samples:samples.length,angles:new Set(samples.map(s=>Math.round(s.angle))).size,
            maxError:Math.max(...samples.map(s=>s.error)),maxAngleError:Math.max(...samples.map(s=>s.angleError))};
        }finally{canvas.app.ticker.remove(sample);}
      },s);
      t.assert(animation.samples>2&&animation.angles>2&&animation.maxError<.1&&animation.maxAngleError<1e-6,'turret remains attached during real animated turn',animation);
      const shake=await t.gm.eval(async s=>{
        const M='neuroshima-2026-overrides',v=canvas.scene.tokens.get(s.id),samples=[];
        const previous=game.settings.get(M,'drganiaPojazdow');await game.settings.set(M,'drganiaPojazdow',true);
        const sample=()=>{
          const body=v.object.mesh,top=v.object.neuroWieza?.mesh;if(!top)return;
          const at=body.parent.toLocal(new PIXI.Point((s.geometry.os[0]/s.geometry.kadr[0]-body.anchor.x)*body.texture.orig.width,
            (s.geometry.os[1]/s.geometry.kadr[1]-body.anchor.y)*body.texture.orig.height),body);
          const c=v.getCenterPoint();samples.push({error:Math.hypot(top.x-at.x,top.y-at.y),shake:Math.hypot(body.x-c.x,body.y-c.y)});
        };
        canvas.app.ticker.add(sample,undefined,PIXI.UPDATE_PRIORITY.LOW);
        try{await v.actor.setFlag(M,'silnik',{wl:true});await new Promise(r=>setTimeout(r,500));
          return{samples:samples.length,maxError:Math.max(...samples.map(s=>s.error)),maxShake:Math.max(...samples.map(s=>s.shake))};
        }finally{canvas.app.ticker.remove(sample);await v.actor.setFlag(M,'silnik',{wl:false});await game.settings.set(M,'drganiaPojazdow',previous);}
      },s);
      t.assert(shake.samples>2&&shake.maxShake>.2&&shake.maxError<.1,'turret shares engine vibration without sliding on its hull',shake);
      await t.gm.eval(s=>canvas.scene.tokens.get(s.id).update({'texture.scaleX':-1.2,'texture.scaleY':.8,alpha:.7,'texture.tint':'#aabbcc',elevation:3}),s);
      await t.waitFor(observer,s=>{
        const v=canvas.tokens.get(s.id),body=v.mesh,top=v.neuroWieza?.mesh;
        return v.document.rotation===90&&top?.visible&&top.rotation===body.rotation&&Math.abs(top.alpha-body.alpha)<1e-6
          &&top.tint===body.tint&&top.elevation===3&&Math.abs(top.scale.x-body.scale.x)<1e-6&&Math.abs(top.scale.y-body.scale.y)<1e-6;
      },{args:[s],message:'turret inherits mirrored scale, tint, opacity and elevation'});
      await point(observer,s.id,false,1.7);await t.screenshot('Gracz 2',`${spec.id} rotated and mirrored with registered turret`);
      await t.gm.eval(s=>canvas.scene.tokens.get(s.id).update({hidden:true}),s);
      await t.waitFor(observer,s=>{const v=canvas.tokens.get(s.id);return !v.mesh.visible&&!v.neuroWieza?.mesh?.visible;},{args:[s],message:'hidden vehicle cannot leak its turret'});
      await t.gm.eval(s=>canvas.scene.tokens.get(s.id).update({hidden:false,'texture.src':s.custom}),s);
      await t.waitFor(observer,s=>{const v=canvas.tokens.get(s.id);return v.document.texture.src===s.custom&&!v.neuroWieza?.mesh?.visible;},{args:[s],message:'custom artwork has no inherited Bradley turret'});
      await t.gm.eval(s=>canvas.scene.tokens.get(s.id).update({'texture.src':s.src,'texture.scaleX':1,'texture.scaleY':1,'texture.tint':'#ffffff',alpha:1,elevation:0}),s);
      for(const client of [t.gm,observer])await t.waitFor(client,s=>!!canvas.tokens.get(s.id).neuroWieza?.mesh?.visible,{args:[s],message:'native art restores exactly one turret'});
      const cleanup=await t.gm.eval(async s=>{
        const v=canvas.tokens.get(s.id);await v.draw();
        const count=()=>canvas.primary.children.filter(c=>c.name?.startsWith('neuro-wieza-')).length;
        await window.__e2e.until(()=>!!v.neuroWieza?.mesh?.visible,{message:'redrawn turret'});
        const afterDraw=count(),data=v.document.toObject();delete data._id;data.x=100;data.y=100;
        const [temp]=await canvas.scene.createEmbeddedDocuments('Token',[data]);
        await window.__e2e.until(()=>!!temp.object?.neuroWieza?.mesh,{message:'temporary turret'});
        const afterCreate=count();await temp.delete();
        await window.__e2e.until(()=>count()===afterDraw,{message:'deleted turret disposed'});
        return{afterDraw,afterCreate,afterDelete:count()};
      },s);
      t.assert(cleanup.afterDraw===2&&cleanup.afterCreate===3&&cleanup.afterDelete===2,'redraw and deletion leave no orphan turret meshes',cleanup);
    });
    await t.step('All fourteen unique wrecks apply at zero HP and restore the complete original texture',async()=>{
      await t.gm.eval(()=>game.poligon.stations.view('garaz','wraki-art-review-v1'));
      const observer=t.client('Gracz 2');
      for(const c of [t.gm,observer])await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags['neuroshima-2026-overrides']?.wreckArtGallery==='wszystkie',{message:'all-vehicle wreck comparison'});
      const state=await t.gm.eval(async()=>{
        const M='neuroshima-2026-overrides',P=game.neuroshima.pojazdy;
        const {GRAFIKI_WRAKOW}=await import('/modules/'+M+'/scripts/config/vehicles-data.mjs');
        const vs=canvas.scene.tokens.filter(v=>v.actor?.type==='vehicle');
        const row=v=>({id:v.id,vehicle:v.actor.flags[M].pojazd.podwozie,
          expected:'modules/'+M+'/'+GRAFIKI_WRAKOW[v.actor.flags[M].pojazd.podwozie],
          texture:foundry.utils.deepClone(v._source.texture)});
        return{healthy:vs.filter(v=>!P.jestWrakiem(v.actor)).map(row),wracks:vs.filter(v=>P.jestWrakiem(v.actor)).map(row)};
      });
      t.equal(state.wracks.length,14,'one seeded wreck per vehicle');
      t.equal(state.healthy.length,14,'one healthy counterpart per vehicle');
      t.equal(new Set(state.wracks.map(v=>v.expected)).size,14,'fourteen distinct asset paths');
      await t.waitFor(observer,state=>state.wracks.every(row=>{
        const v=canvas.tokens.get(row.id),src=row.expected;
        return v.document.texture.src===src&&v.actor.system.attributes.hp.value===0
          &&v.mesh.texture.baseTexture===foundry.canvas.getTexture(src)?.baseTexture
          &&!v.neuroWieza?.mesh?.visible;
      }),{args:[state],message:'fourteen native wrecks rendered without separate healthy turrets'});
      await t.screenshot('Gracz 2','all fourteen unique wrecks beside healthy vehicles');
      await t.gm.eval(async state=>{
        for(const row of state.healthy)await canvas.scene.tokens.get(row.id).actor.update({'system.attributes.hp.value':0});
      },state);
      await t.waitFor(observer,state=>state.healthy.every(row=>{
        const v=canvas.scene.tokens.get(row.id),P=game.neuroshima.pojazdy;
        const expected={...row.texture,src:row.expected};
        return JSON.stringify(v._source.texture)===JSON.stringify(expected)&&P.jestWrakiem(v.actor)
          &&!canvas.tokens.get(v.id).neuroWieza?.mesh?.visible;
      }),{args:[state],message:'zero HP routes each vehicle to its wreck without changing fit anchors scale or tint'});
      const tank=state.healthy.find(r=>r.vehicle==='czolg');
      t.assert(tank.texture.fit==='width'&&tank.texture.anchorY===.4,'Abrams retains hull scale and barrel overhang');
      await point(t.gm,tank.id,true,1.2);
      await t.waitFor(t.gm,id=>{
        const v=canvas.tokens.get(id);return v.mesh.alpha===1&&!game.neuroshima.pojazdy.przeswietlany(v.document);
      },{args:[tank.id],message:'hover cannot fade or restore a wreck interior'});
      await t.screenshot('gm','Abrams wreck full barrel without extra turret on hover');
      await t.gm.eval(async state=>{
        for(const row of state.healthy){
          const a=canvas.scene.tokens.get(row.id).actor;
          await game.neuroshima.pojazdy.cofnijWrak(a);
          await a.update({'system.attributes.hp.value':a.system.attributes.hp.max});
        }
      },state);
      await t.waitFor(observer,state=>state.healthy.every(row=>{
        const M='neuroshima-2026-overrides',v=canvas.scene.tokens.get(row.id);
        return JSON.stringify(v._source.texture)===JSON.stringify(row.texture)&&!v.flags[M]?.wrakPojazdu
          &&!game.neuroshima.pojazdy.jestWrakiem(v.actor)
          &&(!['bwp','czolg'].includes(row.vehicle)||canvas.tokens.get(v.id).neuroWieza?.mesh?.visible);
      }),{args:[state],message:'all original textures and turret layers restored'});
    });
    await t.step("Adopting existing previews preserves manual positions and scales without creating duplicates", async () => {
      const before=await t.gm.eval(inventory);
      const result=await t.gm.eval(async()=>{
        const {Kit}=await import('/agent-poligon/lib/kit.mjs');
        const {zbudujPodgladyPojazdow}=await import('/agent-poligon/stations/garaz-grafika.mjs');
        const {zbudujPodgladyWrakow}=await import('/agent-poligon/stations/garaz-wraki.mjs');
        const M='neuroshima-2026-overrides';
        const s=game.poligon.stations.documents('garaz').scenes.find(s=>s.flags[M]?.vehicleArtGallery==='motocykl');
        const d=s.tokens.find(t=>t.actor?.type==='npc'&&!t.flags[M]?.jazda);
        await d.update({x:d.x+17,'texture.scaleX':0.73,'texture.scaleY':0.73});
        const snapshot=JSON.stringify(d.toObject());
        const wreckScene=game.poligon.stations.documents('garaz').scenes.find(s=>s.flags[M]?.wreckArtGallery==='wszystkie');
        const wreck=wreckScene.tokens.find(t=>t.flags[M]?.wrakPojazdu);
        await wreck.update({x:wreck.x+13,rotation:27});
        const wreckSnapshot=JSON.stringify(wreckScene.toObject());
        const rows=await zbudujPodgladyPojazdow(new Kit(game.poligon.stations.get('garaz'),{fast:true}));
        const wreckRows=await zbudujPodgladyWrakow(new Kit(game.poligon.stations.get('garaz'),{fast:true}));
        return{reused:[...rows,...wreckRows].every(r=>r.reused),preserved:JSON.stringify(d.toObject())===snapshot
          &&JSON.stringify(wreckScene.toObject())===wreckSnapshot};
      });
      const after=await t.gm.eval(inventory);
      t.assert(result.reused&&result.preserved,'manual preview edits retained',result);
      t.equal(after.scenes.length,before.scenes.length,'no duplicate scenes');
      t.equal(after.actors,before.actors,'no duplicate actors');
    });
    await t.step("Reset recreates every preview at source scale without retaining old actors or scenes", async () => {
      const before=await t.gm.eval(inventory);
      const r=await t.gm.eval(async()=>{const [r]=await game.poligon.stations.reset('garaz',{fast:true,source:'e2e'});return{ok:r.ok,error:r.error,missing:r.missing};});
      t.assert(r.ok&&!r.missing.length,"second rebuild",r);
      const after=await t.gm.eval(inventory);
      t.equal(after.scenes.length,17,"all previews recreated");t.equal(after.actors,before.actors,"no actor leak");
      const ids=before.scenes.map(s=>s.id);
      t.assert(after.scenes.every(s=>!ids.includes(s.id)),"scene documents were rebuilt");
      t.assert(after.scenes.filter(s=>s.art).every(s=>s.figures.every(f=>f.scale===1&&f.prototype===1)),"source figure scales restored");
      t.assert(await t.gm.eval(id=>game.scenes.has(id),initial.untouched),"reset leaves other scenes intact");
    });
  }
};
