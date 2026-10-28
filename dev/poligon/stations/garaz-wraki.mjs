/** Rebuildable, individual wreck comparisons. Upgrade the first gallery in place. */
import {MOD} from './_wspolne.mjs';
import {PODGLADY_POJAZDOW,ustawGrafikePojazdu} from './garaz-grafika.mjs';
import {GRAFIKI_WRAKOW} from '../../modules/neuroshima-2026-overrides/scripts/config/vehicles-data.mjs';
export const PODGLADY_WRAKOW=[{id:'wszystkie',key:'wraki-art-review-v1',name:'Wraki — wszystkie pojazdy'}];
const LEGACY='wrak-osobowy-art-review-v1',VERSION=2;

export async function zbudujPodgladyWrakow(k){
 const def=PODGLADY_WRAKOW[0],P=game.neuroshima.pojazdy;
 let scene=game.scenes.find(s=>s.flags[MOD]?.testScene?.id===k.tag&&[def.key,LEGACY].includes(s.flags[MOD].testScene.key));
 if(scene?.flags[MOD]?.wreckArtVersion===VERSION){
  k.scenes[def.key]=scene;return [{id:def.id,scene:scene.id,reused:true}];
 }
 // Check the complete set before changing an existing review.
 for(const file of Object.values(GRAFIKI_WRAKOW)){
  const src=`modules/${MOD}/${file}`;
  if(!(await fetch(foundry.utils.getRoute(src),{method:'HEAD'})).ok)k.miss(`grafika wraku: ${src}`);
 }
 if(k.missing.length)return [];
 const reused=!!scene;
 if(!scene)scene=await k.scene(def.key,{name:'Garaż · Wraki — wszystkie pojazdy',w:56,h:55,color:'#555c57',
  vision:false,grid:{alpha:.14},flags:{[MOD]:{wreckArtGallery:def.id}}});
 else await scene.update({name:'Garaż · Wraki — wszystkie pojazdy',width:5600,height:5500,
  [`flags.${MOD}.testScene.key`]:def.key,[`flags.${MOD}.wreckArtGallery`]:def.id});
 k.scenes[def.key]=scene;
 const ownedLabels=scene.drawings.filter(d=>d.flags[MOD]?.testScene?.id===k.tag&&d.flags[MOD].testScene.role==='label').map(d=>d.id);
 if(ownedLabels.length)await scene.deleteEmbeddedDocuments('Drawing',ownedLabels);
 const labels=[[1,.5,'WRAKI · wszystkie pojazdy',{size:72,w:54}],
  [1,1.6,'Każda para: pojazd sprawny po lewej, jego wrak po prawej. Obracaj, porównuj i sprawdzaj 0 PW.',{size:48,w:54}]];
 for(const[i,v]of PODGLADY_POJAZDOW.entries()){
  const left=(i%4)*14,top=3+Math.floor(i/4)*13;
  labels.push([left+1,top,v.nazwa,{size:60,w:12}]);
  for(const[variant,dx]of [['sprawny',4],['wrak',10]]){
   let token=scene.tokens.find(t=>t.actor?.flags[MOD]?.pojazd?.podwozie===v.id&&P.jestWrakiem(t.actor)===(variant==='wrak'));
   let actor=token?.actor;
   if(!actor){
    actor=await k.fromPack(`wrak-indywidualny-${v.id}-${variant}`,'pojazdy',v.packName??v.nazwa,
     {name:`${v.nazwa} · ${variant}`,data:{prototypeToken:{actorLink:true,displayName:0}}});
    if(!actor||!await ustawGrafikePojazdu(k,actor,v.id))continue;
    const w=actor.prototypeToken.width,h=actor.prototypeToken.height;
    [token]=await k.tokens(scene,[[actor,left+dx-w/2,top+6-h/2,{displayName:0}]]);
    if(variant==='wrak'){await P.zrobWrak(actor);await actor.update({'system.attributes.hp.value':0});}
   }else{
    // Preserve actor/token identity and all original texture transforms when upgrading the old six.
    await token.update({x:(left+dx-token.width/2)*100,y:(top+6-token.height/2)*100,
     ...(variant==='wrak'?{'texture.src':`modules/${MOD}/${GRAFIKI_WRAKOW[v.id]}`}:{})});
   }
   labels.push([left+dx-2,top+11,variant==='wrak'?'Wrak · 0 PW':'Sprawny',{size:44,w:5}]);
  }
 }
 await k.labels(scene,labels);
 await scene.update({initial:{x:2800,y:2750,scale:.22},[`flags.${MOD}.wreckArtVersion`]:VERSION});
 return [{id:def.id,scene:scene.id,vehicles:28,upgraded:reused}];
}
export const narzedziaGrafikiWrakow=PODGLADY_WRAKOW.map(d=>({label:`Grafika: ${d.name}`,icon:'fa-solid fa-car-burst',
 run:()=>game.poligon.stations.view('garaz',d.key)}));
