/** Separated turret artwork only. No aiming, weapon rules or independent rotation state. */
import { grafikaWiezy } from "./grafika.mjs";
import { MODULE_ID } from "./stan.mjs";

const klucz = art => `${art.kadlub}\n${art.src}`;

/** Retain loader-owned textures; dispose only this token's primary mesh. */
export function usunWieze(token) {
  const mesh=token.neuroWieza?.mesh;
  if(mesh&&!mesh.destroyed)mesh.destroy({children:true,texture:false,baseTexture:false});
  token.neuroWieza = null;
}

export async function wczytajWieze(token) {
  const art=grafikaWiezy(token.document);
  if(!art)return;
  const key=klucz(art);
  if(token.neuroWieza?.key===key)return token.neuroWieza.promise;
  usunWieze(token);
  const state=token.neuroWieza={key};
  state.promise=(async()=>{
    const [hull,turret]=await Promise.all([foundry.canvas.loadTexture(art.kadlub),foundry.canvas.loadTexture(art.src)]);
    if(token.destroyed||token.neuroWieza!==state||klucz(grafikaWiezy(token.document)??{})!==key)return;
    if(!hull?.valid||!turret?.valid)return;
    state.kadlub=hull;
    state.mesh=canvas.primary.addChild(new foundry.canvas.primary.PrimarySpriteMesh({
      texture:turret,object:token,name:`neuro-wieza-${token.objectId}`
    }));
    state.mesh.eventMode="none";
    state.mesh.visible=false;
    token.renderFlags.set({refreshMesh:true,refreshState:true});
  })().catch(error=>console.warn(`${MODULE_ID} | grafika wieży`,error));
  return state.promise;
}

/** The complete token image remains a fallback until BOTH separate layers are ready. */
export function grafikaKadluba(token) {
  const art=grafikaWiezy(token.document),state=token.neuroWieza;
  return art&&state?.key===klucz(art)&&state.mesh&&!state.mesh.destroyed ? state.kadlub : null;
}

/** Refresh after core's render flags, including each animated position/rotation/scale update. */
export function odswiezWieze(token,przeswietlony=token.neuroWieza?.przeswietlony??false) {
  const art=grafikaWiezy(token.document),state=token.neuroWieza,body=token.mesh;
  if(state)state.przeswietlony=przeswietlony;
  if(!art){if(state?.mesh)state.mesh.visible=false;return;}
  if(!body||body.destroyed)return;
  if(state?.key!==klucz(art)){void wczytajWieze(token);return;}
  const turret=state.mesh;
  if(!turret||turret.destroyed)return;
  const [fw,fh]=art.kadr,[ox,oy]=art.os,[cx,cy,cw,ch]=art.wycinek;
  const {width,height}=body.texture.orig;
  const pivot=new PIXI.Point((ox/fw-body.anchor.x)*width,(oy/fh-body.anchor.y)*height);
  turret.anchor.set((ox-cx)/cw,(oy-cy)/ch);
  turret.position.copyFrom(body.parent.toLocal(pivot,body));
  turret.scale.set(body.scale.x*width/fw,body.scale.y*height/fh);
  turret.rotation=body.rotation;
  turret.elevation=body.elevation;
  turret.sortLayer=body.sortLayer;
  turret.sort=body.sort;
  turret.zIndex=body.zIndex+0.001;
  turret.alpha=body.alpha;
  turret.tint=body.tint;
  turret.hidden=body.hidden;
  turret.occludedAlpha=body.occludedAlpha;
  turret.occlusionMode=body.occlusionMode;
  turret.textureAlphaThreshold=body.textureAlphaThreshold;
  turret.visible=body.visible&&!przeswietlony;
  turret.renderable=body.renderable;
}
