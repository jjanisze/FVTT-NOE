/** Generic fused machine-wreck art: native size routing and reversible comparison. */
import {MOD} from './_wspolne.mjs';
export const KLUCZ_WRAKOW_MASZYN='machine-wreck-art-review-v1';
export const WRAKI_MASZYN=[
 {key:'maly',name:'Mały',unit:'spawacz',unitName:'Spawacz',size:'sm',cells:1},
 {key:'sredni',name:'Średni',unit:'gladiator',unitName:'Gladiator',size:'med',cells:1},
 {key:'duzy',name:'Duży',unit:'obronca',unitName:'Obrońca',size:'lg',cells:2},
 {key:'gigantyczny',name:'Gigantyczny',unit:'juggernaut',unitName:'Juggernaut',size:'huge',cells:3}
];

export async function zbudujWrakiMaszyn(k){
 const existing=game.scenes.find(s=>s.flags[MOD]?.testScene?.id===k.tag&&s.flags[MOD].testScene.key===KLUCZ_WRAKOW_MASZYN);
 if(existing){k.scenes[KLUCZ_WRAKOW_MASZYN]=existing;return{scene:existing.id,reused:true};}
 for(const d of WRAKI_MASZYN){
  const src=`modules/${MOD}/tokens/wraki/${d.key}.webp`;
  if(!(await fetch(foundry.utils.getRoute(src),{method:'HEAD'})).ok)k.miss(`grafika wraku maszyny: ${src}`);
 }
 if(k.missing.length)return null;
 const scene=await k.scene(KLUCZ_WRAKOW_MASZYN,{name:'Złomowisko · Wraki maszyn — grafika i skala',
  w:30,h:21,color:'#555c57',vision:false,grid:{alpha:.2},flags:{[MOD]:{machineWreckArtGallery:true}}});
 const labels=[[1,.5,'WRAKI MASZYN · cztery rozmiary',{size:42,w:28}],
  [1,1.4,'Zlane, stopione i zwęglone części. Wspólny stos dla wielu modeli maszyn.',{size:23,w:28}],
  [1,2.2,'Góra: przykładowe sprawne maszyny. Dół: ich wraki. Kratka = 1,5 m.',{size:23,w:28}]];
 for(const[i,d]of WRAKI_MASZYN.entries()){
  const x=4.5+i*7;
  labels.push([x-2.5,3.5,d.name,{size:32,w:6}],[x-2.5,4.3,d.unitName,{size:22,w:6}]);
  for(const[variant,y]of [['sprawny',7],['wrak',14]]){
   const actor=await k.fromPack(`grafika-wraki-${d.key}-${variant}`,'bestiariusz',d.unit,
    {name:`${d.unitName} · ${variant}`,data:{prototypeToken:{displayName:0,displayBars:0,ring:{enabled:false}}}});
   if(!actor)continue;
   const w=actor.prototypeToken.width,h=actor.prototypeToken.height;
   const[token]=await k.tokens(scene,[[actor,x-w/2,y-h/2,{displayName:0,displayBars:0,
    flags:{[MOD]:{machineWreckReview:{key:d.key,variant}}}}]]);
   if(variant==='wrak')await game.neuroshima.postoj.autodestrukcja.wrak(token,token.actor.system.traits.size);
   labels.push([x-2.5,y+2.1,variant==='wrak'?`Wrak · ${w}×${h} kratki`:'Sprawna maszyna',{size:21,w:6}]);
  }
 }
 const human=await k.fromPack('grafika-wraki-czlowiek','dnd5e.monsters','Commoner',
  {name:'Człowiek · odniesienie skali',data:{prototypeToken:{displayName:0,displayBars:0,ring:{enabled:false}}}});
 if(human)await k.tokens(scene,[[human,1.2,18.2,{displayName:0,displayBars:0}]]);
 labels.push([3,18.4,'Człowiek w źródłowej skali. Obracaj wraki i porównuj stosy z kratkami.',{size:24,w:26}],
  [1,19.6,'Przywrócenie lub zmiana na wrak: zaznacz dolny żeton i użyj przycisków w Karcie prób.',{size:22,w:28}]);
 await k.labels(scene,labels);
 await scene.update({initial:{x:1500,y:1050,scale:.52}});
 return{scene:scene.id,tokens:scene.tokens.size};
}

async function zaznaczone(wrak){
 if(!game.user.isGM)return;
 for(const token of canvas.tokens.controlled){
  if(!token.actor||!token.document.flags[MOD]?.machineWreckReview)continue;
  const api=game.neuroshima.postoj.autodestrukcja;
  if(wrak)await api.wrak(token.document,token.actor.system.traits.size);
  else await api.przywroc(token.document);
 }
}
export const narzedziaWrakowMaszyn=[
 {label:'Grafika: Wraki maszyn',icon:'fa-solid fa-robot',run:()=>game.poligon.stations.view('zlomowisko',KLUCZ_WRAKOW_MASZYN)},
 {label:'Zaznaczone: pokaż wrak',icon:'fa-solid fa-recycle',run:()=>zaznaczone(true)},
 {label:'Zaznaczone: przywróć grafikę',icon:'fa-solid fa-rotate-left',run:()=>zaznaczone(false)}
];
