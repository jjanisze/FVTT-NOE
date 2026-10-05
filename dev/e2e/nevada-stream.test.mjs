import {test} from "node:test";
import assert from "node:assert/strict";
import {setImmediate as turn} from "node:timers/promises";
import {choose,regionAt,routeAsset,REGION_DISTANCE} from "../../scripts/scenes/poscig-route.mjs";
import {SceneryTextureCache} from "../../scripts/scenes/poscig-textures.mjs";

test("route shuffle bags remain stable across seeks and avoid adjacent repeats",()=>{
  const catalog=Array.from({length:1000},(_,i)=>`asset-${i}`);
  const a=Array.from({length:3000},(_,i)=>choose(catalog,"scene","road",i));
  assert.equal(new Set(a.slice(0,1000)).size,1000);
  assert.ok(a.every((id,i)=>i===0||id!==a[i-1]));
  for(const index of [2345,-17,0,1987]) assert.equal(choose(catalog,"scene","road",index),choose(catalog,"scene","road",index));
  assert.notEqual(choose(catalog,"other scene","road",2345),a[2345]);
});
test("long route regions change without consecutive duplicates",()=>{
  const regions=Array.from({length:16},(_,i)=>regionAt("scene",i*REGION_DISTANCE));
  assert.equal(new Set(regions.slice(0,4)).size,4);
  assert.ok(regions.every((r,i)=>i===0||r!==regions[i-1]));
  assert.equal(regionAt("scene",10),regionAt("scene",REGION_DISTANCE-1));
});
test("urban districts select their own landscape groups at stable route distances",()=>{
  const regions=["suburb","mall","commercial","city"];
  const manifest={regions,groups:{landscapes:Object.fromEntries(regions.map(r=>[r,[`plate-${r}`]]))}};
  const seen=new Set();
  for(let i=0;i<300;i++) {
    const region=regionAt("scene",i*1120/.28,regions);
    const asset=routeAsset(manifest,"scene","hill",i,1120,.28);
    assert.equal(asset,`plate-${region}`);seen.add(region);
  }
  assert.equal(seen.size,4);
});
const texture=id=>({id,baseTexture:{realWidth:2048,realHeight:1024}});
test("a thousand-asset catalog keeps only the requested working set resident",async()=>{
  const freed=new Set(),cache=new SceneryTextureCache(async id=>texture(id),v=>freed.add(v.id));
  for(let i=0;i<1000;i+=2) {
    const required=[`a${i}`,`a${i+1}`],ahead=[`a${i+2}`,`a${i+3}`];
    cache.retain(required,ahead); await cache.ready([...required,...ahead]);
    assert.equal(cache.entries.size,4); assert.equal(cache.stats().residentTextures,4);
  }
  assert.equal(cache.stats().peakTextureBytes,32*1024*1024);
  assert.ok(cache.stats().textureEvictions>=998); cache.destroy(); assert.equal(cache.bytes(),0);
  assert.equal(freed.size,1002);
});
test("obsolete pending loads cannot attach or retain textures after teardown",async()=>{
  const pending=new Map(),freed=[],cache=new SceneryTextureCache(id=>new Promise(r=>pending.set(id,r)),v=>freed.push(v.id));
  cache.retain(["old"]); await turn();
  for(let i=0;i<200;i++) cache.retain([`new-${i}`]);
  assert.ok(cache.queue.length<=1); assert.ok(cache.entries.size<=1);
  cache.destroy(); for(const [id,resolve] of pending) resolve(texture(id)); await turn(); await turn();
  assert.deepEqual(freed,[...pending.keys()]); assert.equal(cache.entries.size,0); assert.equal(cache.bytes(),0);
});
