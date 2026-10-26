/** Exercise actual rare-building textures at several deterministic route positions. */
export default {
  name:"sparse-scenery", clients:["gm"], fixture:"poscig",
  async run(t) {
    for(const [theme,prefix] of [["zima","winter"],["przedmiescia","urban"],["pustynia","nevada"]]) {
      await t.gm.eval(async theme=>{
        await game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:theme,tempoTla:0});
        canvas.pan({x:canvas.scene.width/2,y:850,scale:.53});
      },theme);
      await t.waitFor(t.gm,theme=>game.neuroshima.poscig.tlo.stats().theme===theme&&game.neuroshima.poscig.tlo.stats().ready,
        {args:[theme],message:`${theme}: ready`});
      await t.step(`${theme}: sparse whole buildings vary in height and remain within the panel`,async()=>{
        const samples=await t.gm.eval(async({theme,prefix})=>{
          const root="/modules/neuroshima-2026-overrides/",manifest=await fetch(root+`ui/poscig/themes/${theme}/manifest.json`).then(r=>r.json());
          const {foregroundPlacement,randomAt}=await import(root+"scripts/scenes/poscig-route.mjs");
          const {createBitmapScenery}=await import(root+"scripts/scenes/poscig-bitmap.mjs");
          const config=manifest.foreground.buildings,seed=canvas.scene.id,rows=[];
          let first=null;
          try {
            for(let i=2;rows.length<4&&i<100;i++) {
              if(!foregroundPlacement(config,seed,"buildings",i).enabled)continue;
              const offset=300+randomAt(seed,"buildings-spacing",i)*700;
              const at=(i*config.stride+offset-canvas.scene.width*.35)/config.rate;
              const art=await createBitmapScenery(canvas.scene,theme,at);
              const big=art.front.children[2].children;
              rows.push({at,props:art.stats().foregroundInstances.filter(p=>p.role==="buildings"),
                cropped:big.every(s=>s.y+s.height<=1300.01&&s.x>=0&&s.x+s.width<=canvas.scene.width+.01),
                opaque:big.some(s=>{
                  const source=window.__e2e.textureSource(s.texture.baseTexture),frame=s.texture.frame;
                  const cv=document.createElement("canvas");cv.width=Math.ceil(frame.width);cv.height=Math.ceil(frame.height);
                  const ctx=cv.getContext("2d");ctx.drawImage(source,frame.x,frame.y,frame.width,frame.height,0,0,cv.width,cv.height);
                  const pixels=ctx.getImageData(0,0,cv.width,cv.height).data;
                  let solid=0,clear=0;for(let j=3;j<pixels.length;j+=4){if(pixels[j]>=240)solid++;if(pixels[j]===0)clear++;}
                  return solid>100&&clear>100;
                })});
              if(!first)first=art;else art.destroy();
            }
            window.__sparseOriginal=canvas.primary.children.filter(c=>c.name===`poscig-${prefix}-ground`||c.name===`poscig-${prefix}-foreground`);
            for(const c of window.__sparseOriginal)c.visible=false;
            canvas.primary.addChild(first.ground,first.front);canvas.primary.sortChildren();
            window.__sparseSample=first;first=null;
            return rows;
          } finally {first?.destroy();}
        },{theme,prefix});
        try {
          t.assert(samples.length===4&&samples.every(s=>s.props.length===1&&s.cropped&&s.opaque),"rare building clipping or alpha",samples);
          const heights=samples.flatMap(s=>s.props.map(p=>p.height));
          t.assert(Math.max(...heights)-Math.min(...heights)>50,"large buildings have no visible Y variety",samples);
          await t.screenshot("gm",`${theme}-rare-building`);
        } finally {
          await t.gm.eval(()=>{window.__sparseSample?.destroy();for(const c of window.__sparseOriginal??[])c.visible=true;delete window.__sparseSample;delete window.__sparseOriginal;});
        }
      });
    }
    await t.gm.eval(()=>game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:"zima",tempoTla:2}));
  }
};
