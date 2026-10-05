const MOD = "neuroshima-2026-overrides";
const pause = ms => new Promise(r => setTimeout(r, ms));

async function mouse(client, at, button = "left", clickCount = 1) {
  // Re-enter the canvas after switching browser tabs; refresh PIXI's hovered target explicitly.
  await client.send("Input.dispatchMouseEvent", {type:"mouseMoved", x:0,y:0});
  await client.send("Input.dispatchMouseEvent", {type:"mouseMoved", ...at});
  await pause(35);
  for (const type of ["mousePressed", "mouseReleased"]) {
    await client.send("Input.dispatchMouseEvent", {type, ...at, button, buttons:type === "mousePressed" ? (button === "right" ? 2 : 1) : 0, clickCount});
  }
}

async function clickAt(client, point) {
  await client.send("Page.bringToFront");
  const at = await client.eval(async p => {
    canvas.pan(p);
    // PIXI's world transform is refreshed on the next rendered frame, not by canvas.pan itself.
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const c=canvas.stage.toGlobal(new PIXI.Point(p.x,p.y));
    if(document.elementFromPoint(c.x,c.y)!==canvas.app.view)throw Error("Input point is covered by a DOM window");
    return {x:c.x,y:c.y};
  },point);
  await mouse(client,at);return at;
}

async function drag(client, dx, dy, shift = false) {
  const points = await client.eval(({dx,dy}) => {
    const token = canvas.tokens.placeables.find(t => t.name === "Pojazd 1");
    const from = canvas.clientCoordinatesFromCanvas(token.center);
    const to = canvas.clientCoordinatesFromCanvas({x:token.center.x+dx,y:token.center.y+dy});
    return {from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},before:{x:token.document.x,y:token.document.y}};
  }, {dx,dy});
  if (shift) await client.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Shift",code:"ShiftLeft",windowsVirtualKeyCode:16,modifiers:8});
  try {
    await client.send("Input.dispatchMouseEvent", {type:"mouseMoved",...points.from,modifiers:shift?8:0});
    await client.send("Input.dispatchMouseEvent", {type:"mousePressed",...points.from,button:"left",buttons:1,clickCount:1,modifiers:shift?8:0});
    await pause(150);
    for (let i = 1; i <= 6; i++) {
      await client.send("Input.dispatchMouseEvent", {type:"mouseMoved",x:points.from.x+(points.to.x-points.from.x)*i/6,
        y:points.from.y+(points.to.y-points.from.y)*i/6,button:"left",buttons:1,modifiers:shift?8:0});
      await pause(55);
    }
    await client.send("Input.dispatchMouseEvent", {type:"mouseReleased",...points.to,button:"left",buttons:0,clickCount:1,modifiers:shift?8:0});
  } finally {
    if (shift) await client.send("Input.dispatchKeyEvent", {type:"keyUp",key:"Shift",code:"ShiftLeft",windowsVirtualKeyCode:16});
  }
  return points.before;
}

/** Hold an actual streamed foreground bitmap over the token, using measured alpha pixels. */
function overlap({opaque = true} = {}) {
  const token = canvas.tokens.placeables.find(t => t.name === "Pojazd 1");
  const front = canvas.primary.children.find(c => c.name === window.__bitmapArtPrefix+"-foreground");
  front.children[0].visible = false;
  const group = front.children[1];
  const sign = window.__nevadaOverlapSprite ??= group.children.find(s => s.visible);
  const frame = sign.texture.frame, cv = document.createElement("canvas");
  cv.width = Math.ceil(frame.width); cv.height = Math.ceil(frame.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(sign.texture.baseTexture.resource.source,frame.x,frame.y,frame.width,frame.height,0,0,cv.width,cv.height);
  const data=ctx.getImageData(0,0,cv.width,cv.height).data;
  let point=-1;
  for(let y=1;y<cv.height-1&&point<0;y++)for(let x=1;x<cv.width-1;x++) {
    const i=y*cv.width+x,a=data[i*4+3];
    if(opaque?a>250:a===0) {point=i;break;}
  }
  if(point<0)throw Error("Foreground has no requested alpha control point");
  const u=(point%cv.width+.5)/cv.width,v=(Math.floor(point/cv.width)+.5)/cv.height;
  group.x = token.center.x - (sign.x + sign.width*u);
  group.y = token.center.y - (sign.y + sign.height*v);
  return {alpha:data[point*4+3],visible:sign.visible,
    eventMode:front.eventMode,interactiveChildren:front.interactiveChildren,
    aboveToken:canvas.primary.children.indexOf(front)>canvas.primary.children.indexOf(token.mesh)};
}

export function bitmapArtSuite(name, theme, prefix) { return {
  name, clients:["gm","Gracz 1"], fixture:"poscig",
  async run(t) {
    const player = t.client("Gracz 1");
    for(const client of [t.gm,player]) await client.eval(({theme,prefix})=>{window.__bitmapArtTheme=theme;window.__bitmapArtPrefix=prefix;},{theme,prefix});
    for(const client of [t.gm,player]) await t.waitFor(client,id=>canvas.ready&&canvas.scene?.id===id&&canvas.tokens.placeables.length===8,
      {args:[t.fixture.scene.id],message:"new chase canvas fully drawn after the previous suite"});
    await t.gm.eval(async () => {
      await game.togglePause(false,true);
      await game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:window.__bitmapArtTheme,tempoTla:0});
      await canvas.scene.tokens.getName("Pojazd 1").update({x:600,y:970},{animate:false});
    });
    await t.waitFor(t.gm,()=>game.neuroshima.poscig.tlo.stats().theme===window.__bitmapArtTheme&&game.neuroshima.poscig.tlo.stats().ready,
      {message:"requested bitmap theme and authored road edge ready"});
    await t.step("roadside silhouettes retain solid interiors and real exterior transparency",async()=>{
      const edges=await t.gm.eval(()=>{
        const root=canvas.primary.children.find(c=>c.name===window.__bitmapArtPrefix+"-ground");
        return root.children[1].children.map(sprite=>{
          const source=sprite.texture.baseTexture.resource.source;
          const data=source.getContext("2d").getImageData(256,0,1536,240).data;
          let solid=0,occupied=0,transparent=0;
          for(let i=3;i<data.length;i+=4) {
            if(data[i]>8)occupied++;
            if(data[i]>=240)solid++;
            if(data[i]===0)transparent++;
          }
          return {name:sprite.name,opaqueFraction:solid/occupied,transparent};
        });
      });
      t.assert(edges.length>0,"no actual road textures inspected");
      for(const edge of edges) {
        t.assert(edge.opaqueFraction>.85,"roadside objects have a broad opacity fade",edge);
        t.assert(edge.transparent>1000,"road edge has no real exterior transparency",edge);
      }
    });
    for(const [label,client] of [["gm",t.gm],["Gracz 1",player]]) {
      await t.waitFor(client,()=>game.neuroshima.poscig.tlo.stats().ready && canvas.scene.tokens.getName("Pojazd 1")?._source.y===970,
        {message:"loaded bitmap scenery and replicated input test position"});
      await client.send("Page.bringToFront");
      await client.eval(async()=>{document.querySelector('.tour [data-action="exit"]')?.click();canvas.tokens.activate({tool:"select"});await ui.controls.activate({control:"tokens",tool:"select"});canvas.pan({x:1400,y:900,scale:.52});});
      await t.step(`${label}: opaque foreground permits select, HUD, sheet and target`,async()=>{
        const coverage = await client.eval(overlap,{});
        t.assert(coverage.visible && coverage.alpha>240 && coverage.aboveToken,"test sign does not visibly cover the token",coverage);
        t.equal(coverage.eventMode,"none","foreground event mode");t.equal(coverage.interactiveChildren,false,"foreground child input disabled");
        await t.screenshot(label,"opaque-foreground-setup");
        await client.eval(()=>canvas.tokens.releaseAll());
        const at = await clickAt(client,{x:700,y:1070});
        const selection=await client.eval(()=>({controlled:canvas.tokens.controlled.map(t=>t.name),tool:game.activeTool,layer:canvas.activeLayer.constructor.name,
          token:canvas.tokens.placeables.find(t=>t.name==="Pojazd 1").center,pivot:{x:canvas.stage.pivot.x,y:canvas.stage.pivot.y}}));
        if(!selection.controlled.includes("Pojazd 1"))t.log(`${label}: pointer ${JSON.stringify(at)}, state ${JSON.stringify(selection)}`);
        await t.waitFor(client,()=>canvas.tokens.controlled.some(t=>t.name==="Pojazd 1"),{message:"selection through opaque art"});
        await mouse(client,at,"right");
        await t.waitFor(client,()=>canvas.tokens.hud.object?.name==="Pojazd 1",{message:"HUD through opaque art"});
        await client.eval(()=>{canvas.tokens.hud.clear();});
        await pause(350);await mouse(client,at,"left",1);await pause(70);await mouse(client,at,"left",2);
        await t.waitFor(client,()=>game.actors.getName("Pojazd 1").sheet.rendered,{message:"sheet opened through opaque art"});
        await client.eval(async()=>{await game.actors.getName("Pojazd 1").sheet.close();});
        await client.eval(async()=>{await ui.controls.activate({control:"tokens",tool:"target"});});
        await clickAt(client,{x:700,y:1070});
        await t.waitFor(client,()=>[...game.user.targets].some(t=>t.name==="Pojazd 1"),{message:"targeting through opaque art"});
        await client.eval(async()=>{for(const token of [...game.user.targets])token.setTarget(false);await ui.controls.activate({control:"tokens",tool:"select"});});
        await t.screenshot(label,"opaque-foreground-input");
      });
      await t.step(`${label}: transparent art and real normal/Shift drags preserve movement`,async()=>{
        const clear = await client.eval(overlap,{opaque:false});
        t.assert(clear.alpha<10,"transparent control point is opaque",clear);
        await client.eval(()=>canvas.tokens.releaseAll());await clickAt(client,{x:700,y:1070});
        await t.waitFor(client,()=>canvas.tokens.controlled.some(t=>t.name==="Pojazd 1"),{message:"selection through transparent art"});
        await client.eval(overlap,{});await pause(350);
        const before=await drag(client,200,-150);
        await t.waitFor(client,b=>{const d=canvas.scene.tokens.getName("Pojazd 1");return d._source.x===b.x+200&&Math.abs(d._source.y-(b.y-150))<3;},
          {args:[before],message:"normal drag through foreground snapped into next column"});
        // Start in the clear and finish under the opaque sign, the inverse input path.
        await client.eval(overlap,{});
        await client.eval(()=>{const f=canvas.primary.children.find(c=>c.name===window.__bitmapArtPrefix+"-foreground");f.children[1].x+=600;});
        await pause(350);const into=await drag(client,600,0);
        await t.waitFor(client,b=>canvas.scene.tokens.getName("Pojazd 1")._source.x===b.x+600,
          {args:[into],message:"drag from clear road into foreground"});
        await client.eval(overlap,{});await pause(350);
        const shifted=await drag(client,93,55,true);
        await t.waitFor(client,b=>{const d=canvas.scene.tokens.getName("Pojazd 1");return Math.abs(d._source.x-(b.x+93))<3&&Math.abs(d._source.y-(b.y+55))<3;},
          {args:[shifted],message:"Shift drag through foreground retained free position"});
        await client.eval(()=>{const f=canvas.primary.children.find(c=>c.name===window.__bitmapArtPrefix+"-foreground");f.children[0].visible=true;f.children[1].position.set(0,0);delete window.__nevadaOverlapSprite;});
        await t.gm.eval(()=>canvas.scene.tokens.getName("Pojazd 1").update({x:600,y:970},{animate:false}));
        await t.waitFor(client,()=>canvas.scene.tokens.getName("Pojazd 1")._source.x===600&&canvas.scene.tokens.getName("Pojazd 1")._source.y===970,{message:"restore input fixture"});
      });
    }
    await t.step("production cropping, pan/zoom, tempo and bitmap teardown",async()=>{
      const crop=await t.gm.eval(()=>{
        const f=canvas.primary.children.find(c=>c.name===window.__bitmapArtPrefix+"-foreground");
        return f.children.flatMap(c=>c.children.filter(s=>s.visible)).every(s=>s.y+s.height<=1300.01&&s.x>=0&&s.x+s.width<=canvas.scene.width+.01);
      });
      t.assert(crop,"foreground leaks outside chase frame");
      for(const scale of [.35,.85]) {
        await t.gm.eval(s=>canvas.pan({x:1400,y:900,scale:s}),scale);await t.screenshot("gm",`zoom-${scale}`);
      }
      await t.gm.eval(()=>{canvas.pan({x:1400,y:800,scale:.65});return game.neuroshima.poscig.konfiguruj(canvas.scene,{tempoTla:2});});
      await t.screenshot("gm","bitmap-final");await t.gm.send("Page.bringToFront");
      await t.gm.eval(()=>{
        const roots=canvas.primary.children.filter(c=>c.name?.startsWith(window.__bitmapArtPrefix));const bases=new Set();
        const collect=c=>{for(const base of c.neuroshimaTextureBases?.()??[])bases.add(base);if(c.texture)bases.add(c.texture.baseTexture);for(const child of c.children??[])collect(child);};roots.forEach(collect);
        window.__nevadaArtBases=[...bases];return game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:"zima"});
      });
      const freed=await t.gm.eval(()=>{const r=window.__nevadaArtBases.every(b=>b.destroyed)&&!canvas.primary.children.some(c=>c.name?.startsWith(window.__bitmapArtPrefix));delete window.__nevadaArtBases;return r;});
      t.assert(freed,"Bitmap resources survived a theme switch");
      // Race an asynchronous build against a second theme change: stale art must never attach.
      await t.gm.eval(async()=>{await game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:window.__bitmapArtTheme});await game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:"zima"});});
      await pause(1200);
      t.assert(await t.gm.eval(()=>!canvas.primary.children.some(c=>c.name?.startsWith(window.__bitmapArtPrefix))),"stale asynchronous bitmap build attached over winter");
      await t.gm.eval(()=>game.neuroshima.poscig.konfiguruj(canvas.scene,{motyw:window.__bitmapArtTheme}));
      await t.waitFor(t.gm,()=>game.neuroshima.poscig.tlo.stats().ready,{message:"Bitmap theme restored"});
    });
  }
}; }

export default bitmapArtSuite("nevada-art","pustynia","poscig-nevada");
