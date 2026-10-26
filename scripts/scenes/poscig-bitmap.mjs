/** Shared streamed bitmap scenery with authored opaque roadside silhouettes. */
import { FREEFORM_Y } from "./poscig.mjs";
import { randomAt, routeAsset, regionAt, foregroundPlacement } from "./poscig-route.mjs";
import { SceneryTextureCache } from "./poscig-textures.mjs";
import { durableCanvasBase } from "./poscig-texture-source.mjs";

function container(name, sortLayer) {
  const c = new PIXI.Container();
  c.name=name; c.eventMode="none"; c.interactiveChildren=false;
  c.elevation=0; c.sortLayer=sortLayer; c.sort=0; c.neuroshimaPoscig=true; c.sortableChildren=true;
  return c;
}
function image(file,signal,root) {
  return new Promise((resolve,reject)=>{
    const im=new Image();
    const abort=()=>{im.onload=im.onerror=null;im.removeAttribute("src");reject(signal.reason);};
    if(signal?.aborted) {abort();return;}
    signal?.addEventListener("abort",abort,{once:true});
    im.onload=()=>{signal?.removeEventListener("abort",abort);resolve(im);};
    im.onerror=()=>{signal?.removeEventListener("abort",abort);reject(new Error(`Cannot load chase artwork: ${file}`));};
    im.src=root+file;
  });
}
function surface(w,h) {
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  c.getContext("2d",{willReadFrequently:true}); return c;
}

/** Tighten the authored coverage matte once, retaining contour antialiasing. */
function solidMatte(source) {
  const ctx=source.getContext("2d"),pixels=ctx.getImageData(0,0,source.width,source.height);
  // Image-model cutouts can leave faint exterior noise and slightly translucent cores.
  // A core at 75% coverage becomes opaque; only lower-coverage contour pixels feather.
  for(let i=3;i<pixels.data.length;i+=4) {
    const alpha=pixels.data[i];
    pixels.data[i]=alpha<=8?0:alpha>=192?255:Math.round((alpha-8)*255/184);
  }
  ctx.putImageData(pixels,0,0);
}

/** Composite bitmap pixels once for matching road connectors and spatial terrain joins. */
function strip(im,road,connector) {
  const c=surface(2048,1024),ctx=c.getContext("2d");
  if(road) {
    ctx.drawImage(connector,0,0);
    const middle=surface(2048,1024),mc=middle.getContext("2d");
    mc.drawImage(im,0,0,2048,1024); mc.globalCompositeOperation="destination-in";
    const edge=mc.createLinearGradient(0,0,2048,0);
    edge.addColorStop(0,"#ffffff00"); edge.addColorStop(.15,"#fff");
    edge.addColorStop(.85,"#fff"); edge.addColorStop(1,"#ffffff00");
    mc.fillStyle=edge; mc.fillRect(0,0,2048,1024); ctx.drawImage(middle,0,0); middle.width=1;
    // Every road variant owns the same authored, opaque roadside silhouettes.
    // Clear first: otherwise the variant's soil would fill the alpha holes between branches.
    ctx.clearRect(0,0,2048,240);
    ctx.drawImage(connector,0,0,2048,240,0,0,2048,240);
  } else ctx.drawImage(im,0,0,2048,1024);
  ctx.globalCompositeOperation="destination-in";
  // Tile ownership changes along an irregular contour, with only canvas edge antialiasing.
  // Wide opacity ramps would turn whole rocks, bushes and buildings into ghosts.
  ctx.beginPath(); ctx.moveTo(128,0);
  for(let y=0;y<=1024;y+=8) ctx.lineTo(128+28*Math.sin(y*.027)+12*Math.sin(y*.091),y);
  ctx.lineTo(2048,1024); ctx.lineTo(2048,0); ctx.closePath(); ctx.fillStyle="#fff"; ctx.fill();
  return c;
}

/** Only the empty sky/snow base repeats with a crossfade; architecture is never faded. */
function backdropLoop(im) {
  const c=surface(1792,1024),ctx=c.getContext("2d"),plate=surface(2048,1024);
  const p=plate.getContext("2d"); p.drawImage(im,0,0,2048,1024);
  ctx.drawImage(plate,1792,0,256,1024,0,0,256,1024);
  p.globalCompositeOperation="destination-in";
  const edge=p.createLinearGradient(0,0,256,0);
  edge.addColorStop(0,"#ffffff00"); edge.addColorStop(1,"#fff");
  p.fillStyle=edge; p.fillRect(0,0,2048,1024); ctx.drawImage(plate,0,0); plate.width=1;
  return c;
}

function cutout(im) {
  const c=surface(2048,1024); c.getContext("2d").drawImage(im,0,0,2048,1024);
  solidMatte(c); return c;
}

function soften(im,blur) {
  const c=surface(im.width,im.height),ctx=c.getContext("2d");
  ctx.filter=`blur(${blur}px)`; ctx.drawImage(im,0,0); return c;
}
function disposeTexture(tex) {
  const source=tex.baseTexture.resource.source; tex.destroy(true);
  if(source instanceof HTMLCanvasElement) source.width=source.height=1;
  else if(source instanceof HTMLImageElement) source.src="";
}

/** Crop UVs and quads, keeping scenery inside the illustrated panel without PIXI masks. */
function position(slot,distance,sceneWidth) {
  const left=slot.index*slot.spec.stride+slot.offset-distance*slot.spec.rate;
  const x=Math.max(0,left),right=Math.min(sceneWidth,left+slot.width);
  slot.sprite.visible=right>x;
  if(!slot.sprite.visible) return;
  const rect=slot.view.frame; rect.x=slot.frame[0]+(x-left)/slot.sx; rect.width=(right-x)/slot.sx;
  slot.view.updateUvs(); slot.sprite.x=x;
}

export async function createBitmapScenery(scene,themeId,initialDistance=0,signal) {
  const root=`modules/neuroshima-2026-overrides/ui/poscig/themes/${themeId}/`;
  const name=themeId==="pustynia"?"nevada":themeId==="zima"?"winter":"urban";
  const manifest=await fetch(root+"manifest.json",{signal}).then(r=>{
    if(!r.ok) throw new Error("Cannot load chase artwork manifest"); return r.json();
  });
  const seed=scene.id,connector=surface(2048,1024),master=await image(manifest.images.ground.file,signal,root);
  connector.getContext("2d").drawImage(master,0,0,2048,1024); master.src="";
  solidMatte(connector);
  const foreground=manifest.foreground??{},styles=new Map();
  const foregroundRoles=["plants","structures",...(manifest.groups.buildings?.length?["buildings"]:[])];
  for(const role of foregroundRoles) for(const prop of manifest.groups[role])
    if(foreground[role]) styles.set(manifest.props[prop].atlas,foreground[role]);
  let dirty=true,dead=false,distance=initialDistance,signature="",lateFrames=0;
  const cache=new SceneryTextureCache(async(id,current)=>{
    const asset=manifest.images[id],im=await image(asset.file,signal,root);
    if(!current()) { im.src=""; return null; }
    const source=asset.cutout?cutout(im):asset.role==="backdrop"?backdropLoop(im)
      :asset.role==="road"||asset.role==="hill"?strip(im,asset.role==="road",connector)
      :styles.get(id)?.blur?soften(im,styles.get(id).blur):im;
    if(source!==im) im.src="";
    const base=source instanceof HTMLCanvasElement?durableCanvasBase(source)
      :new PIXI.BaseTexture(source,{mipmap:PIXI.MIPMAP_MODES.OFF,scaleMode:PIXI.SCALE_MODES.LINEAR});
    const tex=new PIXI.Texture(base);
    // Upload during lookahead loading, before the section becomes visible.
    if(!canvas.app.renderer.gl.isContextLost()) canvas.app.renderer.texture.bind(base);
    return tex;
  },disposeTexture,()=>{dirty=true;});
  const ground=container(`poscig-${name}-ground`,100),front=container(`poscig-${name}-foreground`,750);
  ground.neuroshimaTextureBases=()=>cache.bases();
  const hillRoot=container("poscig-hills",100),roadRoot=container("poscig-road",100);
  const decalRoot=container("poscig-ground-overlays",100),dustRoot=container("poscig-dust",100);
  ground.addChild(hillRoot,roadRoot,decalRoot,dustRoot);
  const a=container("poscig-front-a",750),b=container("poscig-front-b",800),buildings=container("poscig-front-buildings",810);
  front.addChild(a,b,buildings);
  let backdrop=null;
  const specs=[
    {role:"hill",root:hillRoot,stride:manifest.landscapeMode==="opaque-cutouts"?1050:1120,rate:.28},
    {role:"road",root:roadRoot,stride:1792,rate:1},
    {role:"decals",root:decalRoot,stride:3000,rate:1},
    {role:"dust",root:dustRoot,stride:2900,rate:.98},
    {role:"plants",root:a,stride:foreground.plants?.stride??2200,rate:foreground.plants?.rate??1.28},
    {role:"structures",root:b,stride:foreground.structures?.stride??2800,rate:foreground.structures?.rate??1.72},
    ...(manifest.groups.buildings?.length?[{role:"buildings",root:buildings,stride:foreground.buildings?.stride??24000,rate:foreground.buildings?.rate??2.9}]:[])
  ].map(spec=>({...spec,slots:new Map()}));
  function descriptor(spec,index) {
    const name=routeAsset(manifest,seed,spec.role,index,spec.stride,spec.rate),prop=manifest.props[name];
    return {name,id:prop?.atlas??name,prop,index,spec};
  }
  function viewBounds() {
    const screen=canvas.app.renderer.screen,p=canvas.stage.toLocal(new PIXI.Point(0,0));
    const q=canvas.stage.toLocal(new PIXI.Point(screen.width,screen.height));
    return {left:Math.max(0,p.x-160),right:Math.min(scene.width,q.x+160)};
  }
  function plans(at,bounds) {
    return specs.map(spec=>{
      const lo=Math.floor((at*spec.rate+bounds.left)/spec.stride)-1;
      const hi=Math.floor((at*spec.rate+bounds.right)/spec.stride),rows=[];
      for(let i=lo;i<=hi;i++) {
        if(!foregroundPlacement(foreground[spec.role],seed,spec.role,i).enabled) continue;
        const row=descriptor(spec,i);
        if(row.prop) {
          const frame=manifest.images[row.prop.atlas].frames[row.prop.frame];
          const r=randomAt(seed,`${spec.role}-shape`,i);
          const width=frame[2]*row.prop.height*(.9+r*.2)/Math.floor(frame[3]*(row.prop.crop??.78));
          const x=i*spec.stride+300+randomAt(seed,`${spec.role}-spacing`,i)*700-at*spec.rate;
          if(x+width<bounds.left||x>bounds.right) continue;
        }
        rows.push(row);
      }
      return {spec,rows,ahead:[hi,hi+1].filter(i=>foregroundPlacement(foreground[spec.role],seed,spec.role,i).enabled).map(i=>descriptor(spec,i).id)};
    });
  }
  function remove(slot) { slot.sprite.destroy(); slot.view.destroy(false); }
  function attach(row) {
    const tex=cache.get(row.id),prop=row.prop,sprite=new PIXI.Sprite();
    sprite.name=row.name; sprite.eventMode="none"; sprite.zIndex=row.index;
    const r=randomAt(seed,`${row.spec.role}-shape`,row.index);
    let frame,sx,sy,y,offset=0;
    if(row.spec.role==="road") { frame=[0,0,2048,1024]; sx=1; sy=1000/1024; y=300; }
    else if(row.spec.role==="hill") { sx=sy=.62+r*.08; frame=[0,0,2048,Math.min(1024,540/sy)]; y=0; }
    else {
      frame=[...manifest.images[prop.atlas].frames[prop.frame]];
      frame[3]=Math.floor(frame[3]*(prop.crop??.78)); sx=sy=prop.height*(.9+r*.2)/frame[3];
      const fore=foregroundRoles.includes(row.spec.role);
      y=fore?FREEFORM_Y-frame[3]*sy+foregroundPlacement(foreground[row.spec.role],seed,row.spec.role,row.index).sink:590+r*450;
      // Moving a large ruin down changes its occlusion, not its scale. Crop its lower UVs
      // so the fragment cannot spill into the free zone; no framebuffer mask is required.
      if(fore) frame[3]=Math.max(1,Math.min(frame[3],Math.floor((FREEFORM_Y-y)/sy)));
      offset=300+randomAt(seed,`${row.spec.role}-spacing`,row.index)*700; sprite.alpha=prop.alpha??1;
      if(foreground[row.spec.role]) sprite.tint=foreground[row.spec.role].tint??0xffffff;
    }
    const view=new PIXI.Texture(tex.baseTexture,new PIXI.Rectangle(...frame));
    sprite.texture=view; sprite.scale.set(sx,sy); sprite.y=y; row.spec.root.addChild(sprite);
    return {...row,sprite,view,frame,sx,sy,y,offset,width:frame[2]*sx};
  }
  let required=new Set();
  function synchronize(at,bounds) {
    const key=specs.map(s=>`${Math.floor(at*s.rate/128)}:${Math.floor(bounds.left/128)}:${Math.floor(bounds.right/128)}`).join("|");
    if(key===signature&&!dirty) return true;
    const next=plans(at,bounds); required=new Set(next.flatMap(p=>p.rows.map(row=>row.id)));
    if(manifest.backdrop) required.add(manifest.backdrop);
    const ahead=new Set(next.flatMap(p=>p.ahead)),prior=specs.flatMap(s=>[...s.slots.values()].map(slot=>slot.id));
    // Keep old sprite bases alive until the incoming visible set is fully ready.
    cache.retain(new Set([...required,...prior]),ahead);
    if([...required].some(id=>!cache.get(id))) return false;
    for(const plan of next) {
      const indices=new Set(plan.rows.map(row=>row.index));
      for(const [index,slot] of plan.spec.slots) if(!indices.has(index)) { remove(slot); plan.spec.slots.delete(index); }
      for(const row of plan.rows) if(!plan.spec.slots.has(row.index)) plan.spec.slots.set(row.index,attach(row));
    }
    cache.retain(required,ahead); signature=key; dirty=false; return true;
  }
  function destroy() {
    if(dead) return; dead=true; signal?.removeEventListener("abort",destroy);
    ground.destroy({children:true}); front.destroy({children:true});
    for(const spec of specs) for(const slot of spec.slots.values()) slot.view.destroy(false);
    cache.destroy(); connector.width=connector.height=1;
  }
  signal?.addEventListener("abort",destroy,{once:true});
  try {
    synchronize(distance,viewBounds()); await cache.ready(required);
    if(signal?.aborted) throw signal.reason;
    synchronize(distance,viewBounds());
    if(manifest.backdrop) {
      backdrop=new PIXI.TilingSprite(cache.get(manifest.backdrop),scene.width,540);
      backdrop.name="poscig-shared-sky"; backdrop.eventMode="none"; backdrop.zIndex=-Infinity;
      backdrop.tileScale.set(.65); hillRoot.addChild(backdrop);
    }
  } catch(error) { destroy(); throw error; }
  function tick(delta) {
    if(dead) return 0;
    if(!synchronize(distance+delta,viewBounds())) { if(delta) lateFrames++; delta=0; }
    distance+=delta;
    if(backdrop) backdrop.tilePosition.x=-distance*.08;
    for(const spec of specs) for(const slot of spec.slots.values()) position(slot,distance,scene.width);
    return delta;
  }
  tick(0);
  return {
    ground,front,tick,
    stats:()=>({cameraDegrees:manifest.cameraDegrees,roadEdgeMode:"silhouette",foregroundLayers:foregroundRoles.length,
      backgroundMode:manifest.landscapeMode??"plates",foregroundStyles:foreground,
      foregroundProps:specs.filter(s=>foregroundRoles.includes(s.role)).reduce((n,s)=>n+s.slots.size,0),
      largeBuildings:specs.find(s=>s.role==="buildings")?.slots.size??0,
      foregroundInstances:specs.filter(s=>foregroundRoles.includes(s.role)).flatMap(s=>[...s.slots.values()].map(p=>({name:p.name,role:s.role,index:p.index,y:p.y,height:p.frame[3]*p.sy,rate:s.rate,visible:p.sprite.visible}))),
      catalogAssets:Object.keys(manifest.images).length,catalogProps:foregroundRoles.reduce((n,r)=>n+manifest.groups[r].length,0),
      travelDistance:distance,region:regionAt(seed,distance,manifest.regions),lateFrames,...cache.stats(),
      visibleAssets:[...new Set(specs.flatMap(s=>[...s.slots.values()].filter(p=>p.sprite.visible).map(p=>p.name)))]}),
    destroy
  };
}
