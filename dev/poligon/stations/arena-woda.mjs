/** Repeatable water review, adopted in place so revisiting never resets the GM's placements. */
import { MOD } from "./_wspolne.mjs";
export const KLUCZ_ZANURZENIA = "water-art-review-v1";
const PROFILE = [["metna", "MĘTNA · domyślna", "#545b3c"],
  ["sciekowa", "ŚCIEKI", "#524537"], ["czysta", "CZYSTA", "#416a70"]];
const regiony = () => PROFILE.map(([id, name, color], i) => ({ name, color,
  shapes: [{ type: "rectangle", x: (0.5 + i * 4.7) * 100, y: 320, width: 450, height: 390 }],
  behaviors: [{ name: "Woda", type: `${MOD}.woda`, system: { wyglad: id, silaEfektu: 0.8 } }] }));

async function dodajRegiony(scene) {
  const created = await scene.createEmbeddedDocuments("Region", regiony());
  if (created.length !== 3) throw new Error("Brak Regionów Wody: odśwież manifest modułu i uruchom ponownie serwer Poligonu.");
  await scene.setFlag(MOD, "waterArtRegions", true);
}

export async function zbudujGrafikeZanurzenia(k) {
  const existing = game.scenes.find(s => s.flags[MOD]?.testScene?.id === k.tag
    && s.flags[MOD].testScene.key === KLUCZ_ZANURZENIA);
  if (existing) {
    k.scenes[KLUCZ_ZANURZENIA] = existing;
    // Repair the initial preview built against a server manifest without the Woda document type.
    // Once installed, Regions and all manual placements are left exactly as the GM saved them.
    if (!existing.flags[MOD]?.waterArtRegions && !existing.regions.size) await dodajRegiony(existing);
    return { scene: existing.id, reused: true, tokens: existing.tokens.size };
  }
  const scene = await k.scene(KLUCZ_ZANURZENIA, { name: "Arena · Zanurzenie — grafika i animacja",
    w: 15, h: 12, color: "#53594f", vision: false, grid: { alpha: 0.12 }, flags: { [MOD]: { waterArtGallery: true } } });
  const human = await k.fromPack("woda-czlowiek", "bestiariusz", "bit-boys", { name: "Pływak", owner: "Gracz 1" });
  const dog = await k.fromPack("woda-pies", "bestiariusz", "pies-bojowy", { name: "Pływający pies", owner: "Gracz 1" });
  if (!human || !dog) return null;
  const labels = [
    [0.5, 0.3, "ZANURZENIE · sylwetka, ruch, obrót", { size: 36, w: 14 }],
    [0.5, 0.95, "Siła 80%. Górny rząd: bez efektu. Niżej: Pod wodą. Pionki top-down.", { size: 21, w: 14 }],
    [0.5, 7.4, "Obrót pionka 0° / 90° / 180° / 270° · woda pozostaje na dole ekranu", { size: 23, w: 14 }],
    [0.5, 10.1, "Przeciągnij mokry pionek między profilami. Pod wodą można przełączać w HUD.", { size: 21, w: 14 }],
    [0.5, 10.8, "Zachowanie Regionu „Woda”: Wygląd wody i Siła efektu. Animacja: ustawienia użytkownika.", { size: 20, w: 14 }]
  ];
  const list = [], wet = [];
  for (const [i, [id, name]] of PROFILE.entries()) {
    const x = 0.5 + i * 4.7;
    labels.push([x, 1.5, name, { size: 24, w: 4.5 }]);
    list.push([human, x + 1.7, 2.1, { name: `Suchy · ${name}`, actorLink: false }]);
    for (const [actor, y] of [[human, 3.8], [dog, 5.5]]) {
      const key = `wet-${id}-${y}`;
      list.push([actor, x + 1.7, y, { name: `${actor.name} · ${name}`, actorLink: false,
        flags: { [MOD]: { waterArtSample: key } } }]);
      wet.push(key);
    }
  }
  for (const [i, rotation] of [0, 90, 180, 270].entries()) {
    const key = `rotation-${rotation}`;
    list.push([human, 1.9 + i * 3.2, 8.5, { name: `Obrót ${rotation}°`, rotation, actorLink: false,
      flags: { [MOD]: { waterArtSample: key } } }]);
    wet.push(key);
    labels.push([1.8 + i * 3.2, 9.65, `${rotation}°`, { size: 20, w: 2 }]);
  }
  await dodajRegiony(scene);
  await k.tokens(scene, list);
  for (const token of scene.tokens) if (wet.includes(token.flags[MOD]?.waterArtSample))
    await token.actor.toggleStatusEffect("podWoda", { active: true });
  await k.labels(scene, labels);
  await scene.update({ initial: { x: 750, y: 590, scale: 0.65 } });
  return { scene: scene.id, reused: false, tokens: scene.tokens.size };
}

export const narzedzieZanurzenia = { label: "Grafika: Zanurzenie", icon: "fa-solid fa-water",
  run: () => game.poligon.stations.view("arena", KLUCZ_ZANURZENIA) };
