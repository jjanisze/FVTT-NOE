/** Queue classification is independent of the selected historical preview. */
export function reviewGroups(entry){
  if(entry.reviewGroups?.length)return entry.reviewGroups;
  if(entry.group==="companion")return["Towarzysze"];
  if(entry.id.startsWith("kon-"))return["Wierzchowce"];
  return["Bestiariusz"];
}
export function newerCandidate(entry,kind){
  const date=Date.parse(entry.reviews?.[kind]?.updatedAt);
  return entry.candidates[kind].some(c=>Date.parse(c.createdAt)>date);
}
export function queueState(entry){
  if(entry.ready&&!["portrait","token"].some(k=>newerCandidate(entry,k)))return"done";
  if(entry.pinned||Object.values(entry.candidates).some(rows=>rows.length))return"active";
  return"planned";
}
export function stageLabel(entry){
  if(queueState(entry)==="done")return"✓ Para zatwierdzona";
  for(const kind of["portrait","token"]){
    const rows=entry.candidates[kind],saved=entry.reviews?.[kind],name=kind==="portrait"?"Portret":"Żeton";
    if(!rows.length)return kind==="portrait"?"Czeka na referencję / generację":"Żeton do przygotowania";
    if(newerCandidate(entry,kind)||!saved||saved.decision==="pending")return name+" do oceny";
    if(saved.stale||saved.decision!=="approve")return name+" do poprawy";
  }
  return"Para wymaga dopasowania";
}
export function partitionQueue(entries){
  const result={active:[],planned:[],done:[]};for(const e of entries)result[queueState(e)].push(e);return result;
}
const normalize=s=>String(s??"").toLocaleLowerCase("pl").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/ł/g,"l");
export function matchesSearch(entry,query){
  const text=[entry.title,entry.id,entry.brief,...reviewGroups(entry),...Object.values(entry.reviews??{}).map(r=>r?.notes)].join(" ");
  return normalize(text).includes(normalize(query.trim()));
}
export function completedTree(entries){
  const root={children:new Map(),entries:[]};
  for(const entry of entries){let node=root;const parts=[];
    for(const label of reviewGroups(entry)){parts.push(label);if(!node.children.has(label))node.children.set(label,{label,key:JSON.stringify(parts),children:new Map(),entries:[]});node=node.children.get(label);}
    node.entries.push(entry);
  }
  const serialize=node=>({...node,children:[...node.children.values()].sort((a,b)=>a.label.localeCompare(b.label,"pl")).map(serialize)});
  return serialize(root).children;
}
