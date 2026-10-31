import test from "node:test";
import assert from "node:assert/strict";
import {partitionQueue,completedTree,matchesSearch,stageLabel,queueState} from "./queue.mjs";

const candidate={id:"p01",createdAt:"2026-10-01T10:00:00Z"};
const review={candidateId:"p01",decision:"approve",updatedAt:"2026-10-01T11:00:00Z"};
const done=(id="dog")=>({id,title:"Żółty pies",group:"companion",ready:true,candidates:{portrait:[candidate],token:[{...candidate,id:"t01"}]},reviews:{portrait:review,token:{...review,candidateId:"t01"}}});

test("approved pairs move to done, missing stages stay active, untouched references stay planned",()=>{
  const horse={...done("kon-zdrowy"),ready:false,candidates:{portrait:[candidate],token:[]}};
  const planned={id:"taran",title:"Taran",group:"bestiary",candidates:{portrait:[],token:[]},reviews:{}};
  const groups=partitionQueue([done(),horse,planned]);
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.map(e=>e.id)])),{active:["kon-zdrowy"],planned:["taran"],done:["dog"]});
  assert.equal(stageLabel(horse),"Żeton do przygotowania");
});
test("new pixels reopen completed work while an explicit later approval of an older version is respected",()=>{
  const e=done();e.candidates.portrait.push({id:"p02",createdAt:"2026-10-01T12:00:00Z"});
  assert.equal(queueState(e),"active");assert.equal(stageLabel(e),"Portret do oceny");
  e.reviews.portrait={...review,updatedAt:"2026-10-01T13:00:00Z"};assert.equal(queueState(e),"done");
  e.ready=false;e.reviews.portrait.stale=true;assert.equal(queueState(e),"active");
});
test("completed trees follow catalog groups and searches find old notes without Polish accents",()=>{
  const mammal=done("ssak");mammal.reviews.portrait={...review,notes:"Wrócić do niedźwiedzia"};
  const monster={...done("korzec"),group:"bestiary",reviewGroups:["Bestiariusz","Mutanci"]};
  const tree=completedTree([mammal,monster]);
  assert.equal(tree[0].label,"Bestiariusz");assert.equal(tree[0].children[0].label,"Mutanci");
  assert.equal(matchesSearch(mammal,"zolty"),true);assert.equal(matchesSearch(mammal,"niedzwiedzia"),true);
  assert.equal(matchesSearch(monster,"mutanci"),true);assert.equal(matchesSearch(monster,"xyz"),false);
});
