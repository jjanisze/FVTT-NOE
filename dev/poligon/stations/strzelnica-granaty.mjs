/** Map-object paintings at enlarged, thrown and placed display sizes. */
import {MOD} from './_wspolne.mjs';
export const KLUCZ_GRANATOW='explosive-art-review-v1';
export const GRAFIKI_GRANATOW=[
 ['grenade-molotov','Koktajl Mołotowa'],['grenade-dynamite','Dynamit'],['grenade-c4-remote','C4'],
 ['grenade-ied','IED · zegar'],['grenade-ied-radio','IED · radio'],['grenade-improvised','Granat improwizowany'],
 ['grenade-smoke','Granat dymny'],['grenade-flashbang','Granat hukowy'],['grenade-incendiary','Granat zapalający']
];
export const DOSTARCZONE_GRANATY=new Set(GRAFIKI_GRANATOW.map(([key])=>key));
const naglowek=()=>`GRANATY I ŁADUNKI · ${DOSTARCZONE_GRANATY.size} z ${GRAFIKI_GRANATOW.length} grafik`;
const pozycja=i=>[.7+(i%3)*8,3+Math.floor(i/3)*6.4];
const opisyProbek=(x,y)=>[
 [x,y+4.2,'Powiększenie',{size:19,w:3}],
 [x+3.1,y+4.2,'Rzut · 0,3',{size:19,w:2}],
 [x+5.1,y+4.2,'Podłożony · 0,5',{size:19,w:2.5}]
];
const oczekuje=(x,y)=>[[x,y+2,'Grafika w kolejce',{size:26,w:7}]];
const owned=(d,k)=>d.flags[MOD]?.testScene?.id===k.tag;

export async function zbudujGrafikeGranatow(k){
 const existing=game.scenes.find(s=>s.flags[MOD]?.testScene?.id===k.tag&&s.flags[MOD].testScene.key===KLUCZ_GRANATOW);
 if(existing)k.scenes[KLUCZ_GRANATOW]=existing;
 const present=new Set(existing?.flags[MOD]?.explosiveArtKeys
  ??existing?.tiles.map(t=>t.flags[MOD]?.explosiveArtReview?.key)??[]);
 const additions=GRAFIKI_GRANATOW.map(([key,name],i)=>({key,name,i}))
  .filter(d=>DOSTARCZONE_GRANATY.has(d.key)&&!present.has(d.key));
 if(existing&&!additions.length)return{scene:existing.id,reused:true,tiles:existing.tiles.size};
 const art=[],missingBefore=k.missing.length;
 for(const d of additions){
  const src=`modules/${MOD}/vfx/${d.key}.webp`;
  if(!(await fetch(foundry.utils.getRoute(src),{method:'HEAD'})).ok){k.miss(`grafika ładunku: ${src}`);continue;}
  const tex=await foundry.canvas.loadTexture(src);
  art.push({...d,src,aspect:tex.width/tex.height});
 }
 if(k.missing.length>missingBefore)return null;
 const scene=existing??await k.scene(KLUCZ_GRANATOW,{name:'Strzelnica · Granaty i ładunki — grafika',
  w:24,h:23,color:'#53594f',vision:false,grid:{alpha:.15},flags:{[MOD]:{explosiveArtGallery:true}}});
 const labels=existing?[]:[
  [.7,.4,naglowek(),{size:42,w:23}],
  [.7,1.3,'Powiększenie + próbki na jasnym i ciemnym tle. Kratka = 1,5 m.',{size:24,w:23}],
  [.7,2,'Rzut: dłuższy bok 0,3 kratki. Podłożony: 0,5 kratki. Przybliż widok do oceny.',{size:22,w:23}],
  [.7,22,'Próbki są podglądem. Rzuty i detonacje: Tor → Chemik.',{size:23,w:23}]
 ],tiles=[],stripes=[];
 if(existing){
  // Upgrade a partial delivery in place. Keep every existing sample and manual placement.
  const stale=scene.drawings.filter(d=>owned(d,k)&&['Grafika w kolejce','Generator odrzucił oba podejścia.'].includes(d.text));
  if(stale.length)await scene.deleteEmbeddedDocuments('Drawing',stale.map(d=>d.id));
  const header=scene.drawings.find(d=>owned(d,k)&&d.text?.startsWith('GRANATY I ŁADUNKI ·'));
  if(header)await header.update({text:naglowek()});
 }
 for(const[i,[key,name]]of GRAFIKI_GRANATOW.entries()){
  const[x,y]=pozycja(i);
  if(!existing)labels.push([x,y,name,{size:29,w:7.3}]);
  if(!DOSTARCZONE_GRANATY.has(key))labels.push(...oczekuje(x,y));
 }
 for(const d of art){
  const[x,y]=pozycja(d.i);
  labels.push(...opisyProbek(x,y));
  for(const[variant,dx,dy,long]of[['large',1.5,2.5,210],['thrown-light',4,1.5,30],['thrown-dark',4,3.3,30],['placed-light',6.4,1.5,50],['placed-dark',6.4,3.3,50]]){
   if(variant!=='large')stripes.push([x+dx-.85,y+dy-.65,1.7,1.3,variant.endsWith('light')?'#a7ac9d':'#252b27',1]);
   const w=d.aspect>=1?long:Math.round(long*d.aspect),h=d.aspect>=1?Math.round(long/d.aspect):long;
   tiles.push({x:Math.round((x+dx)*100),y:Math.round((y+dy)*100),width:w,height:h,rotation:0,
    locked:true,texture:{src:d.src},
    flags:foundry.utils.mergeObject(k.flags({role:'explosive-art'}),{[MOD]:{explosiveArtReview:{key:d.key,variant}}})});
  }
 }
 const drawingsBefore=new Set(scene.drawings.map(d=>d.id));
 await k.stripes(scene,stripes);
 // Drawings sit above Tiles at equal elevation; swatches must sit below the sprites.
 await scene.updateEmbeddedDocuments('Drawing',scene.drawings.filter(d=>!drawingsBefore.has(d.id)).map(d=>({_id:d.id,elevation:-1})));
 await scene.createEmbeddedDocuments('Tile',tiles);
 await k.labels(scene,labels);
 await scene.setFlag(MOD,'explosiveArtKeys',[...DOSTARCZONE_GRANATY]);
 if(!existing)await scene.update({initial:{x:1200,y:1150,scale:.43}});
 return{scene:scene.id,reused:!!existing,added:tiles.length,tiles:scene.tiles.size};
}
export const narzedzieGrafikiGranatow={
 label:'Grafika: Granaty i ładunki',icon:'fa-solid fa-bomb',
 run:()=>game.poligon.stations.view('strzelnica',KLUCZ_GRANATOW)
};
