import {partitionQueue,completedTree,matchesSearch,stageLabel,queueState} from "./queue.mjs";
import {createImageViewer} from "./image-viewer.mjs";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const base=new URL(".",import.meta.url);
const endpoint=p=>new URL(p,base).href;
const asset=p=>endpoint("assets/"+encodeURIComponent(p));
const image=(src,alt)=>`<img src="${asset(src)}" alt="${esc(alt)}" loading="lazy">`;
const portraitPreview=(src,title)=>`<div class="portrait-stage"><button type="button" class="portrait-inspect" data-inspect-src="${esc(src)}" data-inspect-title="${esc(title)}" aria-label="${esc(title)} — otwórz pełny rozmiar" title="Kliknij: pełny rozmiar 1:1">${image(src,title)}</button></div>`;
const viewer=createImageViewer(asset);
let data,active=localStorage.getItem("creature-active"),tab="queue";
const selections={};const drafts=new Map();
let treeOpen={};try{treeOpen=JSON.parse(localStorage.getItem("creature-tree-open")??"{}");}catch{}
try{for(const[k,v]of Object.entries(JSON.parse(localStorage.getItem("creature-drafts")??"{}")))drafts.set(k,v);}catch{}
const draftKey=(entry,kind,candidate)=>`${entry.id}:${kind}:${candidate}`;
function notice(message,error=false){const box=$("#notice");box.textContent=message;box.classList.toggle("error",error);box.style.display="block";setTimeout(()=>box.style.display="none",5000);}

async function load(){
  const response=await fetch(endpoint("api/catalog"));if(!response.ok)throw new Error("Nie udało się wczytać kolejki");data=await response.json();
  active=data.entries.some(e=>e.id===active)?active:data.entries.find(e=>e.candidates.portrait.length||e.candidates.token.length)?.id??data.entries[0]?.id;
  const groups=partitionQueue(data.entries);
  $("#summary").textContent=`Do pracy: ${groups.active.length} · zaplanowane: ${groups.planned.length} · ukończone: ${groups.done.length}`;
  renderQueue();renderMain();document.body.dataset.ready="true";
}
function renderQueue(){
  const query=$("#search").value,filtered=data.entries.filter(e=>matchesSearch(e,query)),groups=partitionQueue(filtered);
  const button=e=>`<button class="queue-item ${e.id===active?"active":""}" ${e.id===active?'aria-current="true"':""} data-creature="${esc(e.id)}">${esc(e.title)}<small>${esc(stageLabel(e))}</small></button>`;
  const containsActive=node=>node.entries.some(e=>e.id===active)||node.children.some(containsActive);
  const branch=node=>`<details class="queue-tree" data-tree="${esc(node.key)}" ${query||containsActive(node)||treeOpen[node.key]?"open":""}><summary>${esc(node.label)} <span>${countTree(node)}</span></summary><div class="tree-children">${node.children.map(branch).join("")}${node.entries.map(button).join("")}</div></details>`;
  const open=(key,entries)=>query||entries.some(e=>e.id===active)||treeOpen[key];
  $("#queue").innerHTML=`<section class="queue-section pinned" aria-label="Do pracy i oceny"><h2>Do pracy i oceny <span>${groups.active.length}</span></h2>${groups.active.map(button).join("")||'<p class="queue-empty">Brak aktywnych grafik do oceny.</p>'}</section>
    <details class="queue-section" data-tree="planned" ${open("planned",groups.planned)?"open":""}><summary>Zaplanowane <span>${groups.planned.length}</span></summary><div class="tree-children">${groups.planned.map(button).join("")}</div></details>
    <details class="queue-section completed" data-tree="done" ${open("done",groups.done)?"open":""}><summary>Ukończone <span>${groups.done.length}</span></summary><div class="tree-children">${completedTree(groups.done).map(branch).join("")||'<p class="queue-empty">Brak ukończonych par.</p>'}</div></details>
    ${filtered.length?"":'<p class="queue-empty">Brak wyników.</p>'}`;
}
function countTree(node){return node.entries.length+node.children.reduce((n,c)=>n+countTree(c),0);}
function selected(entry,kind){
  const latest=entry.candidates[kind].at(-1),saved=entry.reviews[kind];
  const fresh=Date.parse(latest?.createdAt)>Date.parse(saved?.updatedAt);
  const id=selections[`${entry.id}:${kind}`]??(fresh?latest?.id:saved?.candidateId);
  return entry.candidates[kind].find(c=>c.id===id)??latest;
}
function reviewForm(entry,kind,candidate){
  const saved=entry.reviews[kind],same=saved?.candidateId===candidate.id;
  const value=drafts.get(draftKey(entry,kind,candidate.id))??(same?saved:{decision:"pending",rating:null,notes:""});
  const labels={pending:"Jeszcze nie oceniono",approve:"Akceptuję",revise:"Do poprawy",reject:"Odrzucam"};
  return`${saved&&!same?`<details class="prior-review"><summary>Poprzednia ocena: ${esc(saved.candidateId)} · ${labels[saved.decision]}${saved.rating?` · ${saved.rating}/5`:""}</summary><p>${esc(saved.notes||"Bez uwag.")}</p></details>`:""}<form class="review-form" data-kind="${kind}" data-candidate="${candidate.id}">
    <div class="form-row"><label>Decyzja<select name="decision">${Object.entries(labels).map(([id,label])=>`<option value="${id}" ${value.decision===id?"selected":""}>${label}</option>`).join("")}</select></label>
    <label>Ocena<select name="rating"><option value="">Bez oceny</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(value.rating)===n?"selected":""}>${n}/5</option>`).join("")}</select></label></div>
    <label>Uwagi do tej wersji</label><textarea name="notes" aria-label="Uwagi do ${kind==="portrait"?"portretu":"żetonu"}">${esc(value.notes)}</textarea>
    ${saved?.stale?'<div class="warning">Plik zmienił się od zapisanej oceny. Ta ocena nie zatwierdza nowych pikseli.</div>':""}
    <button class="save" type="submit" ${candidate.changed||!candidate.available?"disabled":""}>Zapisz ocenę ${kind==="portrait"?"portretu":"żetonu"}</button>
    <p class="small">${same?`Ostatni zapis: ${esc(new Date(saved.updatedAt).toLocaleString("pl-PL"))}`:"Ocena dotyczy wyłącznie wybranej wersji."}</p>
  </form>`;
}
function card(entry,kind){
  const candidate=selected(entry,kind),title=kind==="portrait"?"Portret":"Żeton top-down";
  if(!candidate)return`<article class="asset-card"><div class="card-head"><h3>${title}</h3></div><div class="empty">${kind==="portrait"?"Portret czeka na generację.":"Żeton powstanie z wybranej wersji portretu."}</div></article>`;
  const portrait=selected(entry,"portrait");
  const mismatch=kind==="token"&&portrait&&(portrait.id!==candidate.portraitId||portrait.sha256!==candidate.portraitSha256);
  const options=entry.candidates[kind].map(c=>`<option value="${c.id}" ${candidate.id===c.id?"selected":""}>${c.id}${kind==="token"?` · z ${c.portraitId}`:""}</option>`).join("");
  const preview=kind==="portrait"?portraitPreview(candidate.src,entry.title+" · portret "+candidate.id):
    `<div class="token-stage">${image(candidate.src,entry.title+" · żeton")}</div><div class="thumbs">${[70,140].map(n=>`<div class="thumb"><div style="width:${n}px;height:${n}px">${image(candidate.src,entry.title+" · "+n+" px")}</div>${n} px</div>`).join("")}</div>`;
  return`<article class="asset-card"><div class="card-head"><h3>${title}</h3><select data-select-kind="${kind}" aria-label="Wersja ${title}">${options}</select></div>${preview}
    ${kind==="token"?`<div class="source-note">Portret źródłowy: <b>${candidate.portraitId}</b> · ${candidate.width}×${candidate.height} · wypełnienie ${Math.round(candidate.fill*100)}%</div>`:""}
    ${mismatch?'<div class="warning">Ten żeton powstał z innego portretu niż obecnie wybrany. Para wymaga dopasowania przed instalacją.</div>':""}
    ${candidate.agentNotes?`<div class="source-note">Uwagi z przygotowania: ${esc(candidate.agentNotes)}</div>`:""}
    ${candidate.changed||!candidate.available?'<div class="warning">Brak pliku lub inna zawartość niż zarejestrowana. Potrzebna nowa wersja kandydata.</div>':""}
    <div class="asset-links"><a href="${asset(candidate.src)}" target="_blank" rel="noopener">Otwórz grafikę</a>${entry.current[kind]?`<a href="${asset(entry.current[kind])}" target="_blank" rel="noopener">Obecna grafika modułu</a>`:""}</div>
    <div class="checks">${kind==="portrait"?"Oceń styl, anatomię, charakter i kompletność sylwetki.":"Oceń zgodność z portretem, kamerę z góry, kierunek głowy i czytelność przy 70 px."}</div>
    ${reviewForm(entry,kind,candidate)}<details><summary>Prompt tej wersji</summary><pre>${esc(candidate.promptText)}</pre></details></article>`;
}
function renderMain(){
  $("#queue-tab").classList.toggle("active",tab==="queue");$("#references-tab").classList.toggle("active",tab==="references");
  if(tab==="references"){$("#main").innerHTML=`<h2>Dotychczasowe pary</h2><p class="lead">Punkty odniesienia: istniejące portrety i odpowiadające im żetony. Pokazują styl malowania, zmianę kamery i zachowanie detali.</p><div class="reference-grid">${data.references.map(r=>`<article class="reference-pair"><h3>${esc(r.title)}</h3>${portraitPreview(r.portrait,r.title+" · portret")}<div class="token-stage">${image(r.token,r.title+" · żeton")}</div></article>`).join("")}</div>`;return;}
  const entry=data.entries.find(e=>e.id===active);if(!entry)return;
  const size={tiny:"Malutki",sm:"Mały",med:"Średni",lg:"Duży",huge:"Wielki",grg:"Ogromny"}[entry.size]??entry.size;
  const approved=queueState(entry)==="done"&&["portrait","token"].every(k=>selected(entry,k)?.id===entry.reviews[k]?.candidateId);
  $("#main").innerHTML=`<h2>${esc(entry.title)}</h2><p class="lead">${esc(entry.brief)}</p>${entry.guidance?`<p class="source-note">${esc(entry.guidance)}</p>`:""}<div class="meta"><span class="pill">${esc(size)} · ${entry.px}×${entry.px} · ${Math.round(entry.fill*100)}% kadru</span><span class="pill ${approved?"good":""}">${approved?"✓ Obie grafiki zatwierdzone i zgodne":esc(stageLabel(entry))}</span></div><div class="pair">${card(entry,"portrait")}${card(entry,"token")}</div><p class="small">Zapis oceny nie zmienia modułu ani świata Foundry. Instalowana może być dopiero para zatwierdzonych wersji, której żeton pochodzi z wybranego portretu.</p>`;
}
$("#queue").addEventListener("click",event=>{const b=event.target.closest("[data-creature]");if(!b)return;active=b.dataset.creature;localStorage.setItem("creature-active",active);tab="queue";renderQueue();renderMain();});
$("#search").addEventListener("input",renderQueue);
$("#main").addEventListener("click",event=>{
  const trigger=event.target.closest("[data-inspect-src]");if(!trigger)return;
  const candidate=data.entries.flatMap(e=>e.candidates.portrait).find(c=>c.src===trigger.dataset.inspectSrc);
  viewer.open({...(candidate??{src:trigger.dataset.inspectSrc}),title:trigger.dataset.inspectTitle},trigger);
});
$("#queue").addEventListener("toggle",event=>{const key=event.target.dataset.tree;if(!key||$("#search").value)return;treeOpen[key]=event.target.open;localStorage.setItem("creature-tree-open",JSON.stringify(treeOpen));},true);
$("#main").addEventListener("change",event=>{if(event.target.dataset.selectKind){selections[`${active}:${event.target.dataset.selectKind}`]=event.target.value;renderMain();}});
$("#main").addEventListener("input",event=>{
  const form=event.target.closest(".review-form");if(!form)return;
  const entry=data.entries.find(e=>e.id===active),values=Object.fromEntries(new FormData(form));
  drafts.set(draftKey(entry,form.dataset.kind,form.dataset.candidate),values);localStorage.setItem("creature-drafts",JSON.stringify(Object.fromEntries(drafts)));
});
$("#main").addEventListener("submit",async event=>{
  const form=event.target.closest(".review-form");if(!form)return;event.preventDefault();
  const entry=data.entries.find(e=>e.id===active),kind=form.dataset.kind,candidate=selected(entry,kind),button=form.querySelector("button");button.disabled=true;
  try{const response=await fetch(endpoint("api/feedback"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({creatureId:entry.id,kind,candidateId:candidate.id,sha256:candidate.sha256,...Object.fromEntries(new FormData(form))})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    drafts.delete(draftKey(entry,kind,candidate.id));localStorage.setItem("creature-drafts",JSON.stringify(Object.fromEntries(drafts)));await load();notice("Ocena zapisana.");
  }catch(error){notice(error.message,true);button.disabled=false;}
});
$("#background").addEventListener("change",event=>{document.body.classList.remove("light","checker");if(event.target.value!=="dark")document.body.classList.add(event.target.value);});
$("#rotation").addEventListener("change",event=>document.documentElement.style.setProperty("--turn",event.target.value+"deg"));
$("#queue-tab").addEventListener("click",()=>{tab="queue";renderMain();});$("#references-tab").addEventListener("click",()=>{tab="references";renderMain();});
$("#refresh").addEventListener("click",()=>load().catch(error=>notice(error.message,true)));
load().catch(error=>notice(error.message,true));
