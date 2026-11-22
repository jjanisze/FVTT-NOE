/** Read-only source inventory for M9. Counts are call sites/files, not distinct visual layouts. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const relative=p=>path.relative(root,p).replaceAll('\\','/');
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
// Blank comments and quoted/template text while preserving positions and line numbers.
// This is a lexical inventory, not a JavaScript AST or a proof of reachability of each call.
function codeOnly(text){let out='',state='code';for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(state==='line'){if(c==='\n'){state='code';out+='\n';}else out+=' ';continue;}if(state==='block'){if(c==='*'&&n==='/'){out+='  ';i++;state='code';}else out+=c==='\n'?'\n':' ';continue;}if(state!=='code'){if(c==='\\'){out+='  ';i++;continue;}if(c===state)state='code';out+=c==='\n'?'\n':' ';continue;}if(c==='/'&&n==='/'){out+='  ';i++;state='line';}else if(c==='/'&&n==='*'){out+='  ';i++;state='block';}else if(c==='"'||c==="'"||c==='`'){state=c;out+=' ';}else out+=c;}return out;}
const texts=new Map();for(const p of await walk(path.join(root,'scripts')))if(p.endsWith('.mjs')&&!relative(p).startsWith('scripts/tests/'))texts.set(p,await fs.readFile(p,'utf8'));
const reachable=new Set();
function visit(file){if(reachable.has(file)||!texts.has(file))return;reachable.add(file);const text=texts.get(file);const refs=[...text.matchAll(/\b(?:import|export)\s+(?:[^;"']*?\sfrom\s*)?["'](\.[^"']+\.mjs)["']/g),...text.matchAll(/\bimport\s*\(\s*["'](\.[^"']+\.mjs)["']/g)];for(const m of refs)visit(path.resolve(path.dirname(file),m[1]));}
visit(path.join(root,'scripts/main.mjs'));
const dialogs=[],chatCreates=[],chatHooks=[],applications=[];
for(const file of [...reachable].sort()){
  const text=texts.get(file),code=codeOnly(text),line=index=>code.slice(0,index).split('\n').length;
  const aliases=new Set(['DialogV2']);for(const m of code.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*(?:\(\)\s*=>\s*)?foundry\.applications\.api\.DialogV2\b/g))aliases.add(m[1]);
  const dialogPattern=new RegExp('\\b('+[...aliases].join('|')+')(?:\\s*\\(\\s*\\))?\\s*\\.\\s*(wait|prompt|confirm)\\s*\\(','g');
  for(const m of code.matchAll(dialogPattern))dialogs.push({file:relative(file),line:line(m.index),method:m[2],houseRules:relative(file).startsWith('scripts/wkk/')});
  for(const m of code.matchAll(/\bChatMessage(?:\.implementation)?\s*\.\s*(create|createDocuments)\s*\(/g))chatCreates.push({file:relative(file),line:line(m.index),method:m[1]});
  for(const m of text.matchAll(/Hooks\.on\(\s*["'](dnd5e\.renderChatMessage|renderChatMessageHTML)["']/g))chatHooks.push({file:relative(file),line:line(m.index),hook:m[1]});
  for(const m of code.matchAll(/\bclass\s+(\w+)\s+extends\s+([^\n{]+)/g))if(/ApplicationV2/.test(m[2]))applications.push({file:relative(file),line:line(m.index),class:m[1],base:m[2].trim()});
}
const icons=(await walk(path.join(root,'icons'))).filter(p=>/\.(svg|webp|png)$/i.test(p));
const extensions=Object.fromEntries(['.svg','.webp','.png'].map(ext=>[ext,icons.filter(p=>path.extname(p).toLowerCase()===ext).length]));
const stems=new Set(icons.map(p=>relative(p).replace(/\.(svg|webp|png)$/i,'')));
const templates=(await walk(path.join(root,'templates'))).filter(p=>p.endsWith('.hbs')).map(relative);
const filesOf=rows=>[...new Set(rows.map(r=>r.file))];
const report={date:'2026-11-15',method:'Lexical call-site inventory in modules reachable from scripts/main.mjs; test code excluded. Dialog aliases and DialogV2() wrapper included. Call sites do not equal unique visual designs. Template expressions and indirect factories may require manual review.',summary:{runtimeSourceFiles:reachable.size,allNonTestSourceFiles:texts.size,templates:templates.length,customApplicationClasses:applications.length,dialogCallSites:dialogs.length,dialogSourceFiles:filesOf(dialogs).length,dialogMethods:Object.fromEntries(['wait','prompt','confirm'].map(method=>[method,dialogs.filter(d=>d.method===method).length])),houseRuleDialogSites:dialogs.filter(d=>d.houseRules).length,chatCreateSites:chatCreates.length,chatCreateFiles:filesOf(chatCreates).length,chatRenderHooks:chatHooks.length,chatHookFiles:filesOf(chatHooks).length,iconFiles:icons.length,iconFilesByExtension:extensions,iconPathStems:stems.size},applications,dialogs,chatCreates,chatHooks,templates};
await fs.writeFile(path.join(root,'dev/visual/source-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
