/** Shared navigation for all graphics-review views on this server. */
const tabs=[
  ["/","Ikony — ocena"],
  ["/browser.html","Biblioteka ikon"],
  ["/creatures/","Portrety i żetony"],
  ["/dnd5e.html","Referencje 5e"],
  ["/overlays/water/preview.html","Zanurzenie"]
];
let nav=document.querySelector("nav.asset-tabs");
if(!nav){nav=document.createElement("nav");nav.className="asset-tabs";(document.querySelector("header")??document.querySelector("main")??document.body).prepend(nav);}
nav.setAttribute("aria-label","Pracownia grafik");nav.dataset.graphicsNavigation="true";
nav.replaceChildren(...tabs.map(([href,label])=>{
  const a=document.createElement("a");a.href=href;a.textContent=label;
  if(location.pathname===href||(href==="/creatures/"&&location.pathname.startsWith(href)))a.setAttribute("aria-current","page");
  return a;
}));
const style=document.createElement("link");style.rel="stylesheet";style.href="/navigation.css";document.head.append(style);
