/** One HTTP server, separate preserved review stores, real client routes. Fixtures only. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {createReviewServer} from "./server.mjs";

const SOURCE=path.dirname(fileURLToPath(import.meta.url));
async function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"graphics-review-")),review=path.join(root,"dev/icons/review"),art=path.join(root,"dev/art/creatures");
  const put=(relative,value)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==="string"?value:JSON.stringify(value));return file;};
  for(const file of["index.html","browser.html","dnd5e.html","navigation.mjs","navigation.css"])put("dev/icons/review/"+file,fs.readFileSync(path.join(SOURCE,file),"utf8"));
  put("dev/icons/review/overlays/water/preview.html",fs.readFileSync(path.join(SOURCE,"overlays/water/preview.html"),"utf8"));
  for(const file of["index.html","app.mjs","style.css","queue.mjs","image-viewer.mjs"])put("dev/art/creatures/review/"+file,fs.readFileSync(path.join(SOURCE,"../../art/creatures/review",file),"utf8"));
  put("dev/icons/review/manifest.json",{items:[{id:"icon",name:"Icon",candidates:[{id:"i01",src:"icon.webp"}]}]});
  put("dev/icons/review/feedback.json",{version:1,items:{older:{decision:"approve",notes:"Preserve icon history"}}});
  const p={id:"p01",src:"dev/art/creatures/candidates/portrait.webp",prompt:"dev/art/creatures/prompts/p01.json",sha256:createHash("sha256").update("portrait").digest("hex")};
  put(p.src,"portrait");put(p.prompt,{prompt:"Actual frozen prompt"});
  put("dev/art/creatures/manifest.json",{version:1,references:[],entries:[{id:"horse",title:"Horse",targets:{portrait:"tokens/portraits/horse.webp",token:"tokens/horse.webp"},candidates:{portrait:[p],token:[]}}]});
  put("dev/art/creatures/review/feedback.json",{version:1,items:{older:{decision:"approve",notes:"Preserve creature history"}},history:[]});
  const server=createReviewServer({moduleRoot:root});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith("graphics-review-"));fs.rmSync(root,{recursive:true,force:true});});
  return{root,review,art,url,p,put};
}
test("icons, creatures, references, overlay and shared tabs are served by one listener",async t=>{
  const f=await fixture(t);
  for(const route of["/","/browser.html","/dnd5e.html","/overlays/water/preview.html","/creatures/","/creatures/app.mjs","/creatures/queue.mjs","/creatures/image-viewer.mjs","/navigation.mjs","/navigation.css"]){
    const response=await fetch(f.url+route);assert.equal(response.status,200,route);if(route.endsWith("html")||route==="/"||route==="/creatures/")assert.match(await response.text(),/navigation\.mjs/);
  }
  assert.equal((await fetch(f.url+"/creatures",{redirect:"manual"})).headers.get("location"),"/creatures/");
  const c=await(await fetch(f.url+"/creatures/api/catalog")).json();assert.equal(c.entries[0].id,"horse");
  assert.equal((await fetch(f.url+"/creatures/assets/"+encodeURIComponent(f.p.src))).status,200);
  assert.equal((await fetch(f.url+"/creatures/assets/"+encodeURIComponent("../private.json"))).status,404);
});
test("ratings stay isolated and retain prior decisions and creature provenance",async t=>{
  const f=await fixture(t),post=(route,body)=>fetch(f.url+route,{method:"POST",headers:{"content-type":"application/json",origin:f.url},body:JSON.stringify(body)});
  assert.equal((await post("/api/feedback",{itemId:"icon",candidateId:"i01",decision:"approve",notes:"Icon saved"})).status,200);
  const creature={creatureId:"horse",kind:"portrait",candidateId:"p01",sha256:f.p.sha256,decision:"approve",rating:5,notes:"Horse saved"};
  assert.equal((await post("/creatures/api/feedback",creature)).status,200);
  assert.equal((await post("/creatures/api/feedback",{...creature,notes:"Update"})).status,200);
  const icons=await(await fetch(f.url+"/api/feedback")).json(),creatures=await(await fetch(f.url+"/creatures/api/feedback")).json();
  assert.equal(icons.items.older.notes,"Preserve icon history");assert.equal(icons.items.icon.notes,"Icon saved");assert.equal(icons.items["horse:portrait"],undefined);
  assert.equal(creatures.items.older.notes,"Preserve creature history");assert.equal(creatures.items["horse:portrait"].rating,5);assert.equal(creatures.items.icon,undefined);
  assert.equal(creatures.history[0].notes,"Horse saved");
  f.put(f.p.src,"changed portrait");assert.equal((await post("/creatures/api/feedback",creature)).status,409);
  assert.equal(fs.existsSync(path.join(f.root,"tokens/portraits/horse.webp")),false);
});

test("native-image inspection exposes only registered unchanged source bytes",async t=>{
  const f=await fixture(t),manifestPath=path.join(f.art,"manifest.json"),manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  const original="full-resolution original PNG bytes",source="dev/art/creatures/in/horse/portrait-p01.png";
  f.put(source,original);f.put("dev/art/creatures/in/private.png","not registered");
  const c=manifest.entries[0].candidates.portrait[0];c.source=source;c.sourceSha256=createHash("sha256").update(original).digest("hex");
  f.put("dev/art/creatures/manifest.json",manifest);
  const catalog=async()=>await(await fetch(f.url+"/creatures/api/catalog")).json();
  assert.deepEqual((await catalog()).entries[0].candidates.portrait[0].original,{src:source,available:true,changed:false});
  const raw=await fetch(f.url+"/creatures/assets/"+encodeURIComponent(source));
  assert.equal(raw.status,200);assert.equal(raw.headers.get("content-type"),"image/png");assert.equal(await raw.text(),original);
  assert.equal((await fetch(f.url+"/creatures/assets/"+encodeURIComponent("dev/art/creatures/in/private.png"))).status,404);
  f.put(source,"changed raw bytes");assert.equal((await catalog()).entries[0].candidates.portrait[0].original.changed,true);
  assert.equal((await fetch(f.url+"/creatures/assets/"+encodeURIComponent(source))).status,409);
  assert.equal(fs.readFileSync(path.join(f.root,f.p.src),"utf8"),"portrait");
});
