/** Offline review catalog, generated from the asset provenance manifest. */
import fs from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',dir),'utf8'));
await fs.writeFile(new URL('catalog.js',dir),'const ART_REVIEW = '+JSON.stringify(manifest,null,2)+';\n');
console.log(`Review catalog: ${manifest.candidates.length} candidates`);
