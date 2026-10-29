/** Native 2×2/3×3 actors, long vehicles and compound primary meshes. Water owns all changes. */
export default {
  name: "woda-duze", clients: ["gm", "Gracz 1"],
  async run(t) {
    const player = t.client("Gracz 1");let gallery;
    await t.step("Large-water gallery uses native creature sizes and vehicle artwork",async()=>{
      for(const c of[t.gm,player])await c.eval(async()=>game.settings.set("neuroshima-2026-overrides","animacjaZanurzenia",true));
      gallery=await t.gm.eval(async()=>{
        if(!game.poligon){
          const state=await import("/agent-poligon/lib/state.mjs");
          if(!game.settings.settings.has("world.poligonStan"))state.registerStateSettings();
          game.poligon=await(await import("/agent-poligon/api.mjs")).createApi("sandbox");
        }
        const{Kit,clearStation}=await import("/agent-poligon/lib/kit.mjs");
        const{zbudujDuzeZanurzenie}=await import("/agent-poligon/stations/arena-woda-duze.mjs");
        await clearStation("arena"); // Sandbox fixture only.
        const before=game.scenes.map(s=>({id:s.id,json:JSON.stringify(s.toObject())}));
        const k=new Kit(game.poligon.stations.get("arena")),r=await zbudujDuzeZanurzenie(k);
        const preserved=before.every(s=>JSON.stringify(game.scenes.get(s.id).toObject())===s.json);
        const scene=game.scenes.get(r.scene);await scene.activate();
        return{...r,preserved,missing:k.missing};
      });
      t.assert(gallery.preserved&&!gallery.missing.length,"other scenes preserved",gallery);
      t.equal(gallery.tokens,12,"four native actors in three rows");
      for(const c of[t.gm,player])await t.waitFor(c,()=>canvas.ready&&canvas.scene.flags["neuroshima-2026-overrides"]?.waterLargeGallery
        &&game.neuroshima.woda.efekty.diagnostyka().aktywne===8
        &&game.neuroshima.woda.efekty.diagnostyka().zetony.filter(r=>r.warstwy===2).length===2,
        {message:"water on all wet bodies and both separate turrets"});
      const info=await t.gm.eval(()=>canvas.scene.tokens.map(d=>({sample:d.flags["neuroshima-2026-overrides"].waterLargeSample,
        w:d.width,h:d.height,type:d.actor.type,suffocation:d.actor.statuses.has("suffocation")})));
      t.assert(info.filter(d=>d.sample.key==="obronca").every(d=>d.w===2&&d.h===2),"Large 2×2 preserved",info);
      t.assert(info.filter(d=>d.sample.key==="juggernaut").every(d=>d.w===3&&d.h===3),"Huge 3×3 preserved",info);
      t.assert(info.some(d=>d.type==="vehicle"&&d.w!==d.h),"long vehicle footprint");
      t.assert(info.filter(d=>d.type==="vehicle").every(d=>!d.suffocation),"water art never makes a vehicle hold its breath");
      await t.screenshot("Gracz 1","large and huge creatures with long vehicles and separate turrets");
    });

    await t.step("Rotating large silhouettes keeps alpha and one shared water coordinate system",async()=>{
      for(const c of[t.gm,player])await c.eval(async()=>game.settings.set("neuroshima-2026-overrides","animacjaZanurzenia",false));
      for(const rotation of[0,90,180,270]){
        const rows=await t.gm.eval(async rotation=>{
          const wet=canvas.scene.tokens.filter(d=>d.flags["neuroshima-2026-overrides"]?.waterLargeSample?.row==="metna");
          await canvas.scene.updateEmbeddedDocuments("Token",wet.map(d=>({_id:d.id,rotation})),{animate:false});
          await __e2e.quiet();
          const renderer=canvas.app.renderer,rt=PIXI.RenderTexture.create({width:renderer.screen.width,height:renderer.screen.height,resolution:1});
          const rows=[];
          try{for(const d of wet){
            const token=d.object,layers=canvas.primary.objects.filter(m=>m.object===token&&m.texture&&!m.destroyed);
            const filters=layers.flatMap(m=>(m.filters??[]).filter(f=>f.token===token));
            for(const f of filters)f.uniforms.uCzas=Math.PI/2/1.12;
            const capture=enabled=>{
              for(const f of filters)f.enabled=enabled;
              let clear=true;for(const mesh of layers){renderer.render(mesh,{renderTexture:rt,clear,skipUpdateTransform:true});clear=false;}
              return renderer.extract.pixels(rt);
            };
            let dry,water;try{dry=capture(false);water=capture(true);}finally{for(const f of filters){f.enabled=true;f.uniforms.uCzas=0;}}
            let errors=0,outside=0,changed=0;
            for(let i=0;i<dry.length;i+=4){
              if(Math.abs(dry[i+3]-water[i+3])>2)errors++;
              if(!dry[i+3]&&water[i+3])outside++;
              if(dry[i+3]>220&&Math.max(...[0,1,2].map(c=>Math.abs(dry[i+c]-water[i+c])))>5)changed++;
            }
            const u=filters[0].uniforms;
            rows.push({key:d.flags["neuroshima-2026-overrides"].waterLargeSample.key,rotation,layers:layers.length,filters:filters.length,
              errors,outside,changed,aligned:filters.every(f=>Math.abs(f.uniforms.uSrodek[0]-u.uSrodek[0])<.01
                &&Math.abs(f.uniforms.uSrodek[1]-u.uSrodek[1])<.01&&f.uniforms.uWysokosc===u.uWysokosc),
              height:u.uWysokosc,expectedHeight:token.h*Math.hypot(token.mesh.parent.worldTransform.c,token.mesh.parent.worldTransform.d)});
          }}finally{rt.destroy(true);}
          return rows;
        },rotation);
        for(const r of rows){
          t.equal(r.errors,0,"unchanged alpha "+r.key,r);t.equal(r.outside,0,"no rectangular water "+r.key,r);
          t.assert(r.changed>25&&r.aligned&&r.filters===r.layers,"visible aligned water on every layer "+r.key,r);
          t.assert(Math.abs(r.height-r.expectedHeight)<.01,"height scales with the token "+r.key,r);
        }
      }
      await t.gm.eval(async()=>{
        await canvas.scene.updateEmbeddedDocuments("Token",canvas.scene.tokens.filter(d=>d.flags["neuroshima-2026-overrides"]?.waterLargeSample?.row==="metna").map(d=>({_id:d.id,rotation:0})),{animate:false});
      });
    });

    await t.step("GPU comparison preserves the old lower extreme and adds exactly 15 percent at the upper extreme",async()=>{
      const rows=await t.gm.eval(()=>{
        const token=canvas.tokens.placeables.find(t=>t.actor.statuses.has("podWoda"));
        const source=token.mesh.filters.find(f=>f.token===token);
        const fragment=source.program.fragmentSrc.replace(/^\s*#define SHADER_NAME[^\n]*\n/gm,""),term="- (1.0 - pion) * 0.075";
        if(!fragment.includes(term))throw new Error("Missing bounded upward swell");
        const previous=fragment.replace(term,"");
        const renderer=canvas.app.renderer,rows=[];
        for(const n of[200,400])for(const [phase,time,shift]of[["low",Math.PI/2/1.12,0],["high",Math.PI*1.5/1.12,n*.15]]){
          const uniforms={...source.uniforms,uSrodek:new Float32Array([n/2,n/2]),uWysokosc:n,uCzas:time};
          const current=new PIXI.Filter(undefined,fragment,uniforms),old=new PIXI.Filter(undefined,previous,{...uniforms});
          const card=new PIXI.Sprite(PIXI.Texture.WHITE);card.width=card.height=n;card.tint=0x444444;
          const rt=PIXI.RenderTexture.create({width:n,height:n,resolution:1});
          const capture=f=>{card.filters=[f];renderer.render(card,{renderTexture:rt,clear:true});return renderer.extract.pixels(rt);};
          let a,b;try{a=capture(old);b=capture(current);}finally{rt.destroy(true);card.filters=null;card.destroy();current.destroy();old.destroy();}
          let errors=0,detail=0;const colors=new Set();
          for(let y=0;y<n-shift;y++)for(let x=0;x<n;x++){
            const i=(y*n+x)*4,j=((y+shift)*n+x)*4;
            if(Math.max(...[0,1,2].map(c=>Math.abs(b[i+c]-a[j+c])))>3)errors++;
            if(Math.abs(a[i]-68)>5)detail++;
            colors.add(a[i]);
          }
          rows.push({n,phase,shift,errors,detail,colors:colors.size,opaque:a[3]===255,dryTop:Math.abs(a[0]-68)<=2});
        }
        return rows;
      });
      for(const r of rows){t.equal(r.errors,0,"old field translated by "+r.shift+"px at "+r.phase,r);
        t.assert(r.detail>100&&r.colors>20&&r.opaque&&r.dryTop,"comparison contains visible waves and a dry opaque background",r);}
    });

    await t.step("Hovering a compound vehicle keeps water on its exposed interior",async()=>{
      const point=await t.gm.eval(()=>{
        const token=canvas.tokens.placeables.find(t=>t.document.flags["neuroshima-2026-overrides"]?.waterLargeSample?.key==="bwp"
          &&t.document.flags["neuroshima-2026-overrides"].waterLargeSample.row==="metna");
        const p=canvas.stage.worldTransform.apply(token.center);return{x:p.x,y:p.y,id:token.id};
      });
      await t.gm.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:point.x,y:point.y});
      await t.waitFor(t.gm,id=>{
        const token=canvas.tokens.get(id);return token.neuroWieza?.mesh&&!token.neuroWieza.mesh.visible
          &&token.mesh.texture!==token.neuroWieza.kadlub&&token.mesh.filters.some(f=>f.token===token);
      },{args:[point.id],message:"water retained on native hover interior"});
      const safe=await t.gm.eval(()=>canvas.stage.worldTransform.apply({x:1400,y:100}));
      await t.gm.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:safe.x,y:safe.y});
      await t.waitFor(t.gm,id=>canvas.tokens.get(id).neuroWieza.mesh.visible,{args:[point.id],message:"wet turret visible again"});
    });

    await t.step("Reopening and removing water preserves other layers and filters",async()=>{
      const r=await t.gm.eval(async()=>{
        const{Kit}=await import("/agent-poligon/lib/kit.mjs");
        const{zbudujDuzeZanurzenie}=await import("/agent-poligon/stations/arena-woda-duze.mjs");
        const before=JSON.stringify(canvas.scene.toObject());await zbudujDuzeZanurzenie(new Kit(game.poligon.stations.get("arena")));
        const preserved=before===JSON.stringify(canvas.scene.toObject());
        const token=canvas.tokens.placeables.find(t=>t.document.flags["neuroshima-2026-overrides"]?.waterLargeSample?.key==="bwp"
          &&t.actor.statuses.has("podWoda"));
        const layer=token.neuroWieza.mesh,foreign=new PIXI.Filter();layer.filters.push(foreign);
        await game.neuroshima.woda.wynurz(token.actor);await __e2e.quiet();
        const kept=layer.filters.includes(foreign),removed=!layer.filters.some(f=>f.token===token)&&!token.mesh.filters.some(f=>f.token===token);
        layer.filters=layer.filters.filter(f=>f!==foreign);foreign.destroy();
        await token.actor.toggleStatusEffect("podWoda",{active:true});
        await game.settings.set("neuroshima-2026-overrides","animacjaZanurzenia",true);
        return{preserved,kept,removed};
      });
      t.assert(r.preserved&&r.kept&&r.removed,"layer lifetime and unrelated filters preserved",r);
      for(const c of[t.gm,player])await t.waitFor(c,()=>game.neuroshima.woda.efekty.diagnostyka().aktywne===8);
      await t.screenshot("gm","large tokens after rotation hover and layer cleanup");
    });
  }
};
