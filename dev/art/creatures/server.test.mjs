import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {createCreatureReviewServer} from "./server.mjs";

async function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"creature-review-")),art=path.join(root,"dev/art/creatures");
  fs.mkdirSync(path.join(art,"review"),{recursive:true});
  const put=(name,value)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value);return name;};
  const candidate=(id,kind,text)=>{const src=put(`dev/art/creatures/candidates/dog/${kind}-${id}.webp`,text);
    return{id,src,sha256:createHash("sha256").update(text).digest("hex"),prompt:put(`dev/art/creatures/prompts/${kind}-${id}.json`,JSON.stringify({prompt:"Frozen example"}))};};
  const p=candidate("p01","portrait","portrait one"),p2=candidate("p02","portrait","portrait two");
  const token={...candidate("t01","token","token one"),portraitId:p.id,portraitSha256:p.sha256};
  const manifest={version:1,references:[],entries:[{id:"dog",title:"Dog",px:400,fill:.7,targets:{portrait:"tokens/portraits/dog.webp",token:"tokens/dog.webp"},candidates:{portrait:[p,p2],token:[token]}}]};
  put("dev/art/creatures/manifest.json",JSON.stringify(manifest));
  const server=createCreatureReviewServer({moduleRoot:root,artRoot:art});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});});
  const post=async(kind,c,extra={})=>fetch(origin+"/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({creatureId:"dog",kind,candidateId:c.id,sha256:c.sha256,decision:"approve",rating:4,notes:"Ładna sylwetka",...extra})});
  return{root,art,origin,p,p2,token,post,get:async()=>await(await fetch(origin+"/api/catalog")).json()};
}

test("independent portrait/token ratings persist with history and a compatible pair",async t=>{
  const f=await fixture(t);assert.equal((await f.post("portrait",f.p)).status,200);assert.equal((await f.post("token",f.token)).status,200);
  assert.equal((await f.get()).entries[0].ready,true);
  await f.post("portrait",f.p,{decision:"revise",rating:2,notes:"Popraw oczy"});
  const feedback=JSON.parse(fs.readFileSync(path.join(f.art,"review/feedback.json"),"utf8"));
  assert.equal(feedback.history[0].rating,4);assert.equal(feedback.items["dog:portrait"].notes,"Popraw oczy");
  assert.equal((await f.get()).entries[0].ready,false);
  fs.unlinkSync(path.join(f.art,"review/feedback.json"));
  assert.equal((await(await fetch(f.origin+"/api/feedback")).json()).items["dog:token"].decision,"approve");
  assert.equal(fs.existsSync(path.join(f.root,"tokens/dog.webp")),false,"review never installs artwork");
});
test("changing pixels invalidates approval without rewriting the saved decision",async t=>{
  const f=await fixture(t);await f.post("portrait",f.p);await f.post("token",f.token);
  fs.writeFileSync(path.join(f.root,f.token.src),"different pixels");
  const e=(await f.get()).entries[0];assert.equal(e.ready,false);assert.equal(e.reviews.token.stale,true);
  assert.equal((await f.post("token",f.token)).status,409);
});
test("a token from another portrait cannot make a pair ready",async t=>{
  const f=await fixture(t);await f.post("portrait",f.p2);await f.post("token",f.token);
  assert.equal((await f.get()).entries[0].ready,false);
});
test("unknown candidates, invalid ratings, external origins and unlisted paths cannot write/read outside review",async t=>{
  const f=await fixture(t);
  assert.equal((await f.post("token",{id:"missing",sha256:"x"})).status,400);
  assert.equal((await f.post("portrait",f.p,{rating:6})).status,400);
  assert.equal((await fetch(f.origin+"/api/feedback",{method:"POST",headers:{"content-type":"application/json",origin:"https://example.invalid"},body:"{}"})).status,403);
  assert.equal((await fetch(f.origin+"/assets/"+encodeURIComponent("../private.txt"))).status,404);
  assert.equal(fs.existsSync(path.join(f.art,"review/feedback.json")),false);
  const image=await fetch(f.origin+"/assets/"+encodeURIComponent(f.p.src));assert.equal(image.status,200);assert.equal(await image.text(),"portrait one");
});
