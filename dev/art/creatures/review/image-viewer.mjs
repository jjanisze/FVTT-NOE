/** Native mode preserves pixel dimensions; explicit fitting changes CSS size, never source bytes. */
export function inspectionScale(width,height,viewportWidth,viewportHeight,mode){
  return mode==="native"?1:Math.min(1,viewportWidth/width,viewportHeight/height);
}

export function createImageViewer(resolveAsset){
  const dialog=document.createElement("dialog");
  dialog.id="image-viewer";dialog.className="image-viewer";dialog.setAttribute("aria-labelledby","image-viewer-title");
  dialog.innerHTML=`<div class="image-viewer-toolbar"><h2 id="image-viewer-title"></h2>
    <div class="image-viewer-controls"><div role="group" aria-label="Wersja obrazu"><button type="button" data-image-source="original">Źródło PNG</button><button type="button" data-image-source="review">Oceniany plik</button></div>
    <div role="group" aria-label="Powiększenie"><button type="button" data-image-mode="native">100% · 1:1</button><button type="button" data-image-mode="fit">Dopasuj</button></div>
    <span class="image-viewer-info" aria-live="polite"></span><a class="image-viewer-file" target="_blank" rel="noopener">Otwórz plik</a><button type="button" class="image-viewer-close" autofocus>Zamknij ×</button></div></div>
    <div class="image-viewer-scroll" tabindex="0" aria-label="Obraz w pełnym rozmiarze — przewijaj, aby obejrzeć szczegóły"><p class="image-viewer-status" role="status"></p><img class="image-viewer-image" alt=""></div>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),image=$("img"),viewport=$(".image-viewer-scroll"),info=$(".image-viewer-info"),status=$(".image-viewer-status");
  let current=null,sourceKind="review",mode="native",loadId=0,returnFocus=null;
  function layout(){
    if(image.hidden||!image.naturalWidth)return;
    const scale=inspectionScale(image.naturalWidth,image.naturalHeight,viewport.clientWidth,viewport.clientHeight,mode);
    image.style.width=Math.floor(image.naturalWidth*scale)+"px";image.style.height=Math.floor(image.naturalHeight*scale)+"px";
    info.textContent=`${image.naturalWidth} × ${image.naturalHeight} px · ${Math.round(scale*100)}%`;
    dialog.dataset.scale=String(scale);
    for(const b of dialog.querySelectorAll("[data-image-mode]"))b.setAttribute("aria-pressed",String(b.dataset.imageMode===mode));
  }
  async function loadSource(kind){
    if(!current)return;
    sourceKind=kind;const id=++loadId;
    const src=kind==="original"?current.original.src:current.src;
    image.hidden=true;status.hidden=false;status.textContent="Wczytywanie obrazu…";info.textContent="";
    for(const b of dialog.querySelectorAll("[data-image-source]"))b.setAttribute("aria-pressed",String(b.dataset.imageSource===kind));
    image.alt=current.title;image.src=resolveAsset(src);$(".image-viewer-file").href=image.src;
    try{await image.decode();if(id!==loadId)return;image.hidden=false;status.hidden=true;layout();viewport.scrollLeft=0;viewport.scrollTop=0;}
    catch{if(id===loadId)status.textContent="Nie udało się wczytać tej wersji obrazu.";}
  }
  dialog.addEventListener("click",event=>{
    const source=event.target.closest("[data-image-source]");if(source&&!source.disabled)loadSource(source.dataset.imageSource);
    const zoom=event.target.closest("[data-image-mode]");if(zoom){mode=zoom.dataset.imageMode;layout();}
    if(event.target.closest(".image-viewer-close"))dialog.close();
    if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
  });
  dialog.addEventListener("close",()=>{++loadId;current=null;image.removeAttribute("src");image.hidden=true;returnFocus?.focus({preventScroll:true});});
  window.addEventListener("resize",()=>{if(dialog.open)layout();});
  return{open(candidate,trigger){
    current=candidate;returnFocus=trigger;mode="native";
    const hasOriginal=!!candidate.original?.available&&!candidate.original.changed;
    const sourceButton=$("[data-image-source='original']");sourceButton.disabled=!hasOriginal;
    sourceButton.title=hasOriginal?"Oryginał generatora w jego pełnej rozdzielczości":"Brak oryginału lub plik źródłowy się zmienił";
    $("#image-viewer-title").textContent=candidate.title;
    if(!dialog.open)dialog.showModal();
    return loadSource(hasOriginal?"original":"review");
  }};
}
