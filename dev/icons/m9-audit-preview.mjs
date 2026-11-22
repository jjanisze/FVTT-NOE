/** A focused, read-only view on the existing icon-review server. No approval or asset writes. */
import fs from "node:fs";
import { abs, recipeFor } from "../finish/lib/profile.mjs";

function groupOf(entry) {
  if (entry.nonGlyph) return "Wyjątki — grafika UI / canvas";
  if (entry.contexts.some(c => c.classes?.length > 1)) return "Współdzielone zdolności klasowe";
  if (entry.contexts.some(c => c.embedded && ["bestiariusz", "towarzysze"].includes(c.pack))) return "Zdolności BN i towarzyszy";
  if (entry.contexts.some(c => c.pack === "schematy")) return "Schematy";
  if (entry.contexts.some(c => c.pack === "sprzet")) return "Sprzęt użytkowy";
  return "Odwołania wyłącznie w kodzie";
}

function proposalFor(entry, profile) {
  const group = groupOf(entry);
  const use = (family, note, label = family) => ({ family: label, ...recipeFor(profile, family), note });
  if (entry.nonGlyph) return { family: "wyjątek", note: entry.nonGlyph };
  if (group === "Współdzielone zdolności klasowe") return use("shared", "Propozycja: istniejąca neutralna rodzina shared; bez arbitralnego wyboru jednej z klas.");
  if (group === "Zdolności BN i towarzyszy") return use("shared", "Propozycja nowej rodziny creature z neutralnym podkładem generic. Istniejące przypisania tego glifu do klas pozostają osobnymi tematami.", "creature — nowa rodzina");
  if (group === "Schematy") return use("salvage", "Propozycja nowej rodziny documents z istniejącym spokojnym kolorem salvage; bez generowania nowej sylwetki.", "documents — nowa rodzina");
  if (group === "Sprzęt użytkowy") return use("tools", "Propozycja bazowa: nowa rodzina devices z kolorem tools. Przed wdrożeniem rozdzielić medycynę, chemię, zapalniki i czynności według danych przedmiotu.", "devices — propozycja bazowa");
  if (entry.contexts.some(c => c.file === "scripts/weapons/addons.mjs" || c.file === "scripts/production/zakladka.mjs")) return use("utility", "To aktywność dodatku broni albo znacznik pracy: propozycja neutralnej operacji utility. Nie przypisywać automatycznie tej roli przedmiotowi o tym samym glifie.");
  return { family: "reguła dla konsumenta", note: "Istniejący glif. Dopisać jawną regułę z danych konsumenta; m.in. Fanty mają zapasowe ścieżki, które nie dowodzą braku grafiki." };
}

export function buildM9AuditPreview(audit, finish, profile, catalog) {
  const nextBatch = fs.readFileSync(abs("dev/icons/MISSING.md"), "utf8").match(/Next batch number: (\d+)/)?.[1] ?? "sprawdź MISSING.md";
  const receiptPath = abs("dev/icons/m9-pass/reviewed-installed.json");
  const delivered = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, "utf8")).installed.length : 0;
  const correctedPath = abs("dev/icons/review/candidates/batch-127/installed.json");
  const corrected = fs.existsSync(correctedPath) ? JSON.parse(fs.readFileSync(correctedPath, "utf8")).subjects.length : 0;
  const closedPath = abs("dev/icons/review/candidates/batch-128/installed.json");
  const closed = fs.existsSync(closedPath) ? JSON.parse(fs.readFileSync(closedPath, "utf8")).subjects.length : 0;
  const cleanupState = closed
    ? `Zainstalowano ${delivered + corrected + closed} poprawek. Kropka trucizny i poprawki broni zamknięte zatwierdzonym normalizerem. Brak otwartych zleceń grafiki M9; wdrożenie stylu w Poligonie pozostaje pracą programistyczną.`
    : corrected
    ? `Zainstalowano ${delivered + corrected} poprawek. Neodrugs, Tornado, oba Narkotyki i Cygaro oczyszczone; pozostały dwie drobne poprawki broni. Pełny zestaw wykończeń zatwierdzony przez MG.`
    : delivered
    ? `Zainstalowano ${delivered} zaakceptowanych poprawek. Pozostałe siedem ma działające mastery; ich poprawki zatrzymały odrzucenia usługi obrazu.`
    : "Dziewięć nowych kandydatów czeka na wybór. Siedem pozostałych poprawek zatrzymały odrzucenia usługi obrazu.";
  const byWrapper = new Map(audit.entries.map(e => [e.wrapper, e]));
  const names = entry => [...new Set((entry?.contexts ?? []).filter(c => c.type === "pack").map(c => c.name))];
  const rows = audit.entries.filter(e => e.gaps.length).map(e => ({
    stage: "gaps", group: groupOf(e), wrapper: e.wrapper, names: names(e), proposal: proposalFor(e, profile),
    details: [...e.gaps, ...new Set(e.contexts.filter(c => c.type === "script").map(c => c.file))]
  }));
  for (const entry of finish.entries.filter(e => e.kind === "icon")) rows.push({
    stage: entry.review.status === "approved" ? "approved" : entry.review.status === "pilot" ? "pilot" : "planned", group: entry.family,
    wrapper: entry.wrapper, names: names(byWrapper.get(entry.wrapper)),
    proposal: { family: entry.family, ...recipeFor(profile, entry.family), note: "Receptura z aktualnego profilu. Ten podgląd CSS nie zastępuje eksportu WEBP ani oceny jego pikseli." },
    details: [entry.id, `${entry.review.status}; ${entry.outputs[0].size} px`, entry.outputs[0].path]
  });
  for (const entry of audit.health.edgeTouching) rows.push({ stage: "edges", group: "Margines 0", wrapper: entry.wrapper,
    names: names(byWrapper.get(entry.wrapper)), details: [`Marginesy: ${JSON.stringify(entry.margins)}`, "Sprawdzić kompozycję w małej skali. Nie jest to automatyczne zlecenie regeneracji."] });
  const byStem = new Map(catalog.icons.map(e => [`icons/${e.id}`, e]));
  for (const stem of audit.unconsumed) {
    const icon = byStem.get(stem);
    rows.push({ stage: "library", group: icon.category, wrapper: icon.preferred, names: [icon.name],
      details: ["Brak w statycznym skanie paczek i literalnych ścieżek. Możliwe lookupy dynamiczne, kopie w świecie albo warianty; nie dowodzi nieużywania."] });
  }
  const json = JSON.stringify(rows).replaceAll("<", "\\u003c");
  const stats = audit.stats;
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>M9 · braki i wykończenia ikon</title>
<style>
:root{color-scheme:dark;font:14px/1.5 system-ui,sans-serif;background:${profile.theme.surface};color:${profile.theme.foreground}}
body{margin:0}header,main{max-width:1400px;margin:auto;padding:24px}h1{font-size:26px;margin:12px 0}p{color:${profile.theme.muted}}a{color:${profile.theme.foreground}}
.notice{padding:16px;border:1px solid ${profile.theme.divider};border-radius:4px;background:${profile.theme.panel}}
.tools{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.tools label{display:grid;gap:4px}input,select,button{font:inherit;color:inherit;background:${profile.theme.panel};border:1px solid ${profile.theme.divider};border-radius:3px;padding:8px}input{min-width:240px}button{cursor:pointer}
#cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px}.card{border:1px solid ${profile.theme.divider};padding:16px;border-radius:4px;overflow-wrap:anywhere}.card h2{font-size:16px;margin:4px 0}.group,.path{font:12px/1.5 ui-monospace,monospace}.path{margin:6px 0}.strip{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0}.sample{display:grid;gap:4px;text-align:center;font:10px ui-monospace,monospace;color:${profile.theme.muted}}
.tile{display:block;position:relative}.mask{display:block;width:100%;height:100%;mask-size:contain;mask-position:center;mask-repeat:no-repeat;-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat}.card details{margin-top:12px}.card li{font-size:12px}#more{margin-top:20px}.failed{outline:2px solid #ff554d}
</style></head><body><header><nav class="asset-tabs"></nav>
<h1>M9 · braki i wykończenia ikon</h1>
<p>Audyt ${audit.date} · profil ${profile.id} · katalog tej samej przeglądarki ikon.</p>
<div class="notice"><strong>Pokrycie plikami jest pełne; osobno oceniaj jakość istniejących glifów.</strong>
<p>${stats.assignmentGapWrappers} różnych ścieżek ma luki w regułach przypisania (${stats.assignmentGapOccurrences} wpisów kategorii, bo część się powtarza).
${stats.actionableAssignmentGapWrappers} wymaga rozstrzygnięcia; ${stats.nonGlyphExceptions} to świadome wyjątki UI / canvas.
${stats.finishReviews.planned ?? 0} tematów czeka na wybór; ${stats.finishReviews.approved ?? 0} zatwierdzonych; ${stats.finishedFiles} ma gotowy eksport.</p>
<p>Weryfikacja wizualna wykryła artefakty atlasu / siatki w początkowej grupie 16 starszych masterów.
${cleanupState} <a href="/">Kolejka ocen (${stats.activeGenerationReviews} aktywnych kart)</a>.
<a href="m9-process.html">Przejdź do następnej decyzji o rodzinach M9</a>.</p>
<p>Propozycje niżej używają obecnych glifów i kolorów. To podgląd CSS, nie zatwierdzone rastry.
Nowe rodziny wymagają jawnej kolejnej wersji profilu. Szczegóły: <a href="m9-gap-audit.md">raport i rekomendacje</a>.
Ocena sylwetki: przejdź do biblioteki i użyj „Review style”. Flagi i akceptacje pozostają w istniejących kolejkach.</p></div>
<div class="tools"><label>Zakres<select id="stage"><option value="gaps">Braki przypisania (${stats.assignmentGapWrappers})</option><option value="approved">Zatwierdzone (${stats.finishReviews.approved ?? 0})</option><option value="planned">Przypisane bez eksportu (${stats.finishReviews.planned ?? 0})</option><option value="pilot">Pilot (${stats.finishReviews.pilot ?? 0})</option><option value="edges">Master dotyka krawędzi (${stats.edgeTouchingMasters})</option><option value="library">Poza statycznym skanem (${stats.unconsumed})</option></select></label>
<label>Grupa<select id="group"><option value="">Wszystkie</option></select></label><label>Szukaj<input id="query" type="search" placeholder="Nazwa, ścieżka, konsument"></label></div>
<p id="summary" aria-live="polite"></p></header><main><div id="cards"></div><button id="more" type="button">Pokaż kolejne</button></main>
<script id="audit-data" type="application/json">${json}</script>
<script type="module">
const rows=JSON.parse(document.querySelector('#audit-data').textContent);
const stage=document.querySelector('#stage'),group=document.querySelector('#group'),query=document.querySelector('#query'),cards=document.querySelector('#cards'),more=document.querySelector('#more');
const fold=s=>String(s).toLocaleLowerCase('pl').normalize('NFD').replace(/\\p{Diacritic}/gu,'').replaceAll('ł','l');
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
let visible=36;
function groups(){group.replaceChildren(new Option('Wszystkie',''),...[...new Set(rows.filter(r=>r.stage===stage.value).map(r=>r.group))].sort().map(s=>new Option(s,s)));}
function render(){
 const q=fold(query.value.trim());const found=rows.filter(r=>r.stage===stage.value&&(!group.value||r.group===group.value)&&(!q||fold(JSON.stringify(r)).includes(q)));
 cards.replaceChildren();document.querySelector('#summary').textContent=found.length+' tematów · pokazano '+Math.min(visible,found.length);more.hidden=visible>=found.length;
 for(const row of found.slice(0,visible)){
  const card=el('article',null,'card');card.append(el('p',row.group,'group'),el('h2',row.names[0]??row.wrapper),el('p',row.wrapper,'path'));
  const original=el('div',null,'strip');for(const size of[64,44,32,16]){const sample=el('span',null,'sample'),img=el('img');img.src='/'+row.wrapper;img.alt=row.names[0]??row.wrapper;img.width=size;img.height=size;img.loading='lazy';img.addEventListener('error',()=>{img.classList.add('failed');img.alt='Brak podglądu';});sample.append(img,el('span',size+' px'));original.append(sample);}card.append(el('p','Obecny plik'),original);
  if(row.proposal){card.append(el('p',row.proposal.family));if(row.proposal.glyph){const strip=el('div',null,'strip');for(const size of[64,44,32,16]){const sample=el('span',null,'sample'),tile=el('span',null,'tile'),mask=el('span',null,'mask');tile.style.width=size+'px';tile.style.height=size+'px';tile.style.background=row.proposal.ground??'transparent';tile.style.borderRadius=(size*3/44)+'px';mask.style.background=row.proposal.glyph;mask.style.maskImage='url("/'+row.wrapper+'")';mask.style.webkitMaskImage=mask.style.maskImage;tile.append(mask);sample.append(tile,el('span',size+' px'));strip.append(sample);}card.append(strip);}card.append(el('p',row.proposal.note));}
  const link=el('a','Oceń sylwetkę w bibliotece');link.href='browser.html?q='+encodeURIComponent(row.wrapper.slice(6).replace(/\\.[^.]+$/,''));card.append(link);
  const details=el('details');details.append(el('summary','Kontekst i dowody'));const list=el('ul');for(const line of[...row.names.slice(1),...row.details])list.append(el('li',line));details.append(list);card.append(details);cards.append(card);
 }
 const params=new URLSearchParams({stage:stage.value});if(group.value)params.set('group',group.value);if(query.value)params.set('q',query.value);history.replaceState(null,'','?'+params);
}
stage.value=${JSON.stringify(stats.actionableAssignmentGapWrappers ? "gaps" : stats.finishReviews.approved ? "approved" : "planned")};const params=new URLSearchParams(location.search);if([...stage.options].some(o=>o.value===params.get('stage')))stage.value=params.get('stage');groups();if([...group.options].some(o=>o.value===params.get('group')))group.value=params.get('group');query.value=params.get('q')??'';
stage.addEventListener('change',()=>{visible=36;groups();render();});group.addEventListener('change',()=>{visible=36;render();});query.addEventListener('input',()=>{visible=36;render();});more.addEventListener('click',()=>{visible+=36;render();});render();
</script><script type="module" src="/navigation.mjs"></script></body></html>\n`;
  fs.writeFileSync(abs("dev/icons/review/m9-audit.html"), html);
  const report = `# M9 — audyt braków ikon · ${audit.date}

Wygenerowane przez \`node dev/icons/audit-m9-icons.mjs\`. Podgląd na istniejącym serwerze
\`npm run review:icons\`: [M9 — braki](m9-audit.html). Pełna lista z dowodami:
[m9-gap-audit.json](../m9-gap-audit.json).

## Wynik

Nie znaleziono potwierdzonego braku nowej sylwetki. ${audit.health.checked} glifów sprawdzono
przez raster stage M9: plik istnieje, źródło daje niepustą białą maskę. Brak inicjałowych
placeholderów i zapisanych flag redo. Aktywnych kart generacji: ${stats.activeGenerationReviews}.
To kontrola źródeł, nie dowód estetycznej jakości każdej ikony przy 16 px.

**Weryfikacja wizualna znalazła rzeczywistą lukę jakościową:** pozostałości sąsiednich
pól atlasu, linie siatki oraz nadmiar drobnych detali w grupie 16 starszych ikon.
${cleanupState} [Tematy, prompty i dostawa](../m9-pass/README.md).
[Przetwarzanie zmian krok po kroku](../m9-pass/PROCESS.md).

Raport M9 zgłasza ${stats.assignmentGapOccurrences} wystąpień luk w regułach dla
${stats.assignmentGapWrappers} różnych ścieżek. Kategorie nakładają się; nie sumować ich jako
zamówienia nowych obrazków.

| Luka z REPORT.md | Ścieżek w kategorii |
| --- | ---: |
${Object.entries(stats.gapGroups).map(([reason, n]) => `| ${reason} | ${n} |`).join("\n") || "| Brak luk przypisania | 0 |"}

Dwa wpisy to świadome wyjątki: \`icons/doll/mannequin.webp\` (ilustracja manekina)
i \`icons/obiekty/ramka.svg\` (natywna dwukolorowa ramka celu na scenie).
Nie zamawiać ich jako białych glifów. Pozostaje ${stats.actionableAssignmentGapWrappers}
ścieżek wymagających doprecyzowania konsumentów / rodzin.

## Rozstrzygnięcia rodzin zatwierdzone przez MG

| Grupa | Zatwierdzone wykończenie | Reguła |
| --- | --- | --- |
| Zdolności BN / towarzyszy | creature, neutralna receptura generic | Osobne tematy klasowe zachowane, gdy glif jest wspólny |
| Pięć wspólnych zdolności klasowych | shared | Neutralne tło zamiast arbitralnego wyboru klasy |
| Sprzęt użytkowy | devices z kolorem tools jako baza | Flagi i ID prototypu rozdzielają medical / chemicals / explosives; czynności mają utility |
| Trzy glify schematów | documents z kolorem salvage | Dokument nie dziedziczy rodziny wytwarzanego przedmiotu |
| Referencje w kodzie | Jawna rola konsumenta | Reguły mają zakres konsumenta; Fanty wynikają z danych tabeli, a operacja nie zmienia rodziny przedmiotu |

Podglądy proponowanych rodzin są wyłącznie CSS z istniejącym masterem. Nie zmieniają
profilu, manifestu, decyzji MG ani plików wydania. Reguły wdrożeniowe muszą pochodzić
z danych przedmiotu / konsumenta, nie z nazwy pliku. Ten sam glif może wymagać osobnych
wykończeń zależnie od źródła; globalne podmienienie ścieżki byłoby błędne.

## Pozostałe prace

- ${stats.finishReviews.planned ?? 0} tematów ma status planned;
  ${stats.finishReviews.approved ?? 0} zatwierdzonych, ${stats.finishedFiles} gotowych eksportów.
  [Decyzja i dokładne piksele](../m9-pass/finish-approval.json).
- ${stats.edgeTouchingMasters} masterów dotyka krawędzi. Są w osobnym filtrze podglądu.
  Sprawdzić kadr przy 64/44/32/16 px; nie zamawiać regeneracji na podstawie samego marginesu.
- ${stats.unconsumed} ścieżek biblioteki nie ma konsumenta w tym skanie. Może je wskazywać
  lookup dynamiczny albo istniejący przedmiot świata; nie oznacza to ${stats.unconsumed} braków.
- Historyczne odrzucenie statycznej nakładki wody i rezerwowy glif Akcji są resolved.
  Nie otwierać ich ponownie na podstawie samej decyzji reject / pustego pola approve.

## Generacja nowych obrazów, jeśli przegląd ją potwierdzi

W bibliotece wybrać „Review style” i zapisać konkretną uwagę / flagę redo.
Następny wolny batch to ${nextBatch} według bieżącego MISSING. Wbudowany model obrazu OpenAI,
zgodnie z [Pipeline.md](../Pipeline.md): biała prosta sylwetka, szerokie prześwity,
bez faktury, szumu, cieni i drobnych linii; atlas 3×3, jawna kolejność, wolne końcowe
pola czarne. Znormalizować, sprawdzić 64/32/16 px i wrócić z kandydatami do istniejącej
kolejki. Nie nadpisywać zaakceptowanych masterów przed wyborem kandydata.

## Zakres i ograniczenia

Świeża kompilacja paczek do katalogu tymczasowego; ${stats.referencedWrappers} ścieżki
z paczek i literalnych odwołań kodu; katalog i zapisane decyzje przeglądarki.
Nie odczytywano dokumentów kampanii, nie zmieniano paczek ani działających światów.
Dynamiczne ścieżki i przedmioty istniejące wyłącznie w świecie pozostają poza zakresem.

Źródła sprawdzono przy Pillow ${audit.health.pillow} / libwebp ${audit.health.libwebp};
manifest pilota zapisano przy Pillow ${finish.tools?.pillow ?? "?"} / libwebp ${finish.tools?.libwebp ?? "?"}.
Nie nadpisano pilota innym enkoderem. Podgląd wymaga osobnej oceny w przeglądarce;
generacja strony i walidacja źródeł nie są testem renderowania Foundry.
`;
  fs.writeFileSync(abs("dev/icons/review/m9-gap-audit.md"), report);
  return "dev/icons/review/m9-audit.html";
}
