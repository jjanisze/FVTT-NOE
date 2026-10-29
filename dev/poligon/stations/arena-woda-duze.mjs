/** Water-only review of native large/huge creatures and compound vehicle artwork. No Garage reset. */
import { MOD } from "./_wspolne.mjs";
import { ustawGrafikePojazdu } from "./garaz-grafika.mjs";

export const KLUCZ_DUZEGO_ZANURZENIA = "water-large-review-v1";
const PRZYKLADY = [
  { key: "obronca", pack: "bestiariusz", ref: "obronca", label: "Obrońca · Duży 2×2", x: 3 },
  { key: "juggernaut", pack: "bestiariusz", ref: "juggernaut", label: "Juggernaut · Ogromny 3×3", x: 9 },
  { key: "osobowka", pack: "pojazdy", ref: "Osobówka", label: "Osobówka · długi obrys", x: 15.5 },
  { key: "bwp", pack: "pojazdy", ref: "Bojowy wóz piechoty", label: "M2 Bradley · kadłub + wieża", x: 23 }
];

export async function zbudujDuzeZanurzenie(k) {
  const existing = game.scenes.find(s => s.flags[MOD]?.testScene?.id === k.tag
    && s.flags[MOD].testScene.key === KLUCZ_DUZEGO_ZANURZENIA);
  if (existing) {
    k.scenes[KLUCZ_DUZEGO_ZANURZENIA] = existing;
    return { scene: existing.id, reused: true, tokens: existing.tokens.size };
  }
  const scene = await k.scene(KLUCZ_DUZEGO_ZANURZENIA, { name: "Arena · Zanurzenie — duże pionki i pojazdy",
    w: 28, h: 24, color: "#53594f", vision: false, grid: { alpha: 0.14 }, flags: { [MOD]: { waterLargeGallery: true } } });
  const labels = [
    [0.6,0.3,"ZANURZENIE · duże pionki i pojazdy",{ size: 40, w: 27 }],
    [0.6,1.0,"Źródłowe rozmiary i skale. Obracaj pionki; najechanie na pojazd odsłania wnętrze.",{ size: 24, w: 27 }],
    [0.6,22.6,"Woda: dotychczasowy najniższy poziom, maksymalny o 15% wysokości pionka wyżej. Siła 80%.",{ size: 24, w: 27 }]
  ];
  for (const spec of PRZYKLADY) labels.push([spec.x-2.6,1.7,spec.label,{ size: 23, w: 6 }]);
  const rows = [{ key: "dry", label: "BEZ EFEKTU", y: 5 },
    { key: "metna", label: "MĘTNA · 80%", y: 12 }, { key: "czysta", label: "CZYSTA · 80%", y: 19 }];
  for (const row of rows) {
    labels.push([0.5,row.y-2.6,row.label,{ size: 24, w: 6 }]);
    if (row.key !== "dry") await scene.createEmbeddedDocuments("Region", [{ name: row.label, color: "#526c60",
      shapes: [{ type: "rectangle", x: 0, y: (row.y-3.1)*100, width: 2800, height: 620 }],
      behaviors: [{ name: "Woda", type: `${MOD}.woda`, system: { wyglad: row.key, silaEfektu: 0.8 } }] }]);
    for (const spec of PRZYKLADY) {
      const actor = await k.fromPack(`woda-duze-${spec.key}-${row.key}`, spec.pack, spec.ref,
        { name: `${spec.label} · ${row.label}`, owner: "Gracz 1", data: { prototypeToken: { displayName: 0, displayBars: 0 } } });
      if (!actor) continue;
      if (spec.pack === "pojazdy" && !await ustawGrafikePojazdu(k,actor,spec.key)) continue;
      const proto = actor.prototypeToken;
      const [token] = await k.tokens(scene, [[actor,spec.x-proto.width/2,row.y-proto.height/2,
        { flags: { [MOD]: { waterLargeSample: { key: spec.key, row: row.key } } } }]]);
      if (row.key !== "dry") await token.actor.toggleStatusEffect("podWoda", { active: true });
    }
  }
  await k.labels(scene,labels);
  await scene.update({ initial: { x: 1400, y: 1200, scale: 0.4 } });
  return { scene: scene.id, reused: false, tokens: scene.tokens.size };
}

export const narzedzieDuzegoZanurzenia = { label: "Grafika: Zanurzenie — duże pionki", icon: "fa-solid fa-water",
  run: () => game.poligon.stations.view("arena", KLUCZ_DUZEGO_ZANURZENIA) };
