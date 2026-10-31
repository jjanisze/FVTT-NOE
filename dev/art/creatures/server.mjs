/** Local portrait/token reviewer. Versioned candidates and feedback only; never writes Foundry or final artwork. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readJson as read, readWithBackup, writeJsonAtomic, bodyJson } from "../../icons/review/review-store.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"../../..");
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

function inside(root,relative){
  const p=path.resolve(root,relative),prefix=path.resolve(root)+path.sep;
  if(!p.startsWith(prefix))throw fail("Path outside asset root",403);
  if(fs.existsSync(p)){
    const actual=fs.realpathSync(p),base=fs.realpathSync(root)+path.sep;
    if(!actual.toLowerCase().startsWith(base.toLowerCase()))throw fail("Asset link outside root",403);
  }
  return p;
}

function json(res,status,value){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(value));}

export function createCreatureReviewHandler({moduleRoot=ROOT,artRoot=path.join(moduleRoot,"dev/art/creatures"),basePath=""}={}){
  const manifestPath=path.join(artRoot,"manifest.json"),feedbackPath=path.join(artRoot,"review/feedback.json");
  const manifest=()=>read(manifestPath,{version:1,entries:[],references:[]});
  const feedback=()=>readWithBackup(feedbackPath,{version:1,items:{},history:[]});
  const assetInfo=c=>{
    const p=inside(moduleRoot,c.src),available=fs.existsSync(p),actual=available?hash(p):null;
    let original=null;
    if(c.source&&c.sourceSha256){
      const source=inside(moduleRoot,c.source),exists=fs.existsSync(source);
      original={src:c.source,available:exists,changed:exists&&hash(source)!==c.sourceSha256};
    }
    return{...c,available,changed:available&&actual!==c.sha256,original};
  };
  const catalog=()=>{
    const data=manifest(),saved=feedback();
    return{version:data.version,references:data.references,entries:data.entries.map(e=>{
      const candidates=Object.fromEntries(Object.entries(e.candidates).map(([kind,rows])=>[kind,rows.map(c=>{
        const info=assetInfo(c),prompt=read(inside(moduleRoot,c.prompt),{});
        return{...info,promptText:prompt.prompt??""};
      })]));
      const reviews={};
      for(const kind of["portrait","token"]){
        const r=saved.items[`${e.id}:${kind}`],c=candidates[kind].find(c=>c.id===r?.candidateId);
        reviews[kind]=r?{...r,stale:!c||c.changed||!c.available||r.sha256!==c.sha256}:null;
      }
      const p=candidates.portrait.find(c=>c.id===reviews.portrait?.candidateId);
      const t=candidates.token.find(c=>c.id===reviews.token?.candidateId);
      const ready=reviews.portrait?.decision==="approve"&&reviews.token?.decision==="approve"
        &&!reviews.portrait.stale&&!reviews.token.stale&&t?.portraitId===p?.id&&t?.portraitSha256===p?.sha256;
      return{...e,candidates,reviews,ready:!!ready,current:Object.fromEntries(Object.entries(e.targets)
        .map(([k,v])=>[k,fs.existsSync(inside(moduleRoot,v))?v:null]))};
    })};
  };
  const validate=input=>{
    const data=manifest(),e=data.entries.find(e=>e.id===input.creatureId);
    if(!e||!["portrait","token"].includes(input.kind))throw fail("Unknown creature or asset kind");
    const c=e.candidates[input.kind].find(c=>c.id===input.candidateId);
    if(!c)throw fail("Unknown candidate");
    if(!["pending","approve","revise","reject"].includes(input.decision))throw fail("Invalid decision");
    const rating=input.rating==null||input.rating===""?null:Number(input.rating);
    if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))throw fail("Rating must be 1–5");
    const info=assetInfo(c);
    if(!info.available||info.changed||input.sha256!==c.sha256)throw fail("Candidate changed; import a new version and review it",409);
    return{creatureId:e.id,kind:input.kind,candidateId:c.id,sha256:c.sha256,decision:input.decision,
      rating,notes:String(input.notes??"").slice(0,10000),updatedAt:new Date().toISOString()};
  };
  const save=entry=>{
    const saved=feedback(),key=`${entry.creatureId}:${entry.kind}`;
    saved.history??=[];if(saved.items[key])saved.history.push(saved.items[key]);saved.items[key]=entry;
    writeJsonAtomic(feedbackPath,saved);
    return entry;
  };
  const send=(res,file)=>{
    if(!fs.existsSync(file))throw fail("Image not found",404);
    const types={".webp":"image/webp",".png":"image/png",".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
    res.writeHead(200,{"content-type":types[path.extname(file)]??"application/octet-stream","cache-control":"no-store"});fs.createReadStream(file).pipe(res);
  };
  return async(req,res)=>{
    try{
      const port=req.socket.localPort,hosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      if(!hosts.includes(req.headers.host))throw fail("Invalid host",403);
      const url=new URL(req.url,`http://${req.headers.host}`);
      if(basePath&&!url.pathname.startsWith(basePath+"/"))throw fail("Not found",404);
      const pathname=basePath?url.pathname.slice(basePath.length):url.pathname;
      if(req.method==="GET"&&pathname==="/api/catalog")return json(res,200,catalog());
      if(req.method==="GET"&&pathname==="/api/feedback")return json(res,200,feedback());
      if(req.method==="POST"&&pathname==="/api/feedback"){
        if(req.headers.origin&&req.headers.origin!==url.origin)throw fail("Invalid origin",403);
        if(!req.headers["content-type"]?.startsWith("application/json"))throw fail("Expected JSON");
        return json(res,200,save(validate(await bodyJson(req))));
      }
      if(req.method!=="GET")throw fail("Method not allowed",405);
      if(pathname.startsWith("/assets/")){
        const relative=decodeURIComponent(pathname.slice(8)),data=manifest();
        const allowed=new Set(data.references.flatMap(r=>[r.portrait,r.token]));
        const originals=new Map();
        for(const e of data.entries){
          for(const c of Object.values(e.candidates).flat()){
            allowed.add(c.src);
            if(c.source&&c.sourceSha256){allowed.add(c.source);originals.set(c.source,c.sourceSha256);}
          }
          for(const p of Object.values(e.targets))allowed.add(p);
        }
        if(!allowed.has(relative))throw fail("Unknown image",404);
        const file=inside(moduleRoot,relative);
        if(originals.has(relative)&&fs.existsSync(file)&&hash(file)!==originals.get(relative))throw fail("Original source changed",409);
        return send(res,file);
      }
      const files={"/":"index.html","/app.mjs":"app.mjs","/style.css":"style.css","/queue.mjs":"queue.mjs","/image-viewer.mjs":"image-viewer.mjs"};
      if(!files[pathname])throw fail("Not found",404);
      send(res,path.join(artRoot,"review",files[pathname]));
    }catch(error){if(!res.headersSent)json(res,error.status??400,{error:error.message});else res.destroy(error);}
  };
}

/** Fixture/embedding compatibility; the production CLI runs the shared graphics server. */
export function createCreatureReviewServer(options={}){
  return http.createServer(createCreatureReviewHandler(options));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  setImmediate(async()=>{
    const {startGraphicsReview}=await import("../../icons/review/server.mjs");
    startGraphicsReview();
  });
}
