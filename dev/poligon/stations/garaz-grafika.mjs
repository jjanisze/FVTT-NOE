/** Rebuildable vehicle-art previews. Only shipped art and stock dnd5e actors belong here. */
import { MOD } from "./_wspolne.mjs";
import { KATALOG_POJAZDOW, PODWOZIA } from "../../modules/neuroshima-2026-overrides/scripts/config/vehicles-data.mjs";

export const PODGLADY_POJAZDOW = [
  { id: "osobowka", nazwa: "Osobówka", key: "vehicle-art-review-v4", scene: "Garaż · Osobówka — grafika i skala", interior: true },
  { id: "hammer", nazwa: "Hammer", key: "hammer-art-review-v1", scene: "Garaż · Hammer — grafika i wnętrze", interior: true },
  { id: "motocykl", nazwa: "Motocykl", key: "motocykl-art-review-v1", scene: "Garaż · Motocykl — grafika i obsada", interior: false },
  { id: "ciezarowka", nazwa: "Ciężarówka", key: "ciezarowka-art-review-v1", scene: "Garaż · Ciężarówka — kabina i paka", interior: true },
  { id: "buggy", nazwa: "Buggy", key: "buggy-art-review-v1", scene: "Garaż · Buggy — otwarta rama i obsada", interior: false },
  { id: "autobus", nazwa: "Autobus", key: "autobus-art-review-v1", scene: "Garaż · Autobus — wnętrze i obsada", interior: true },
  { id: "traktor", nazwa: "Traktor", key: "traktor-art-review-v1", scene: "Garaż · Traktor — siodło i błotnik", interior: false },
  { id: "wozStrazacki", slug: "woz-strazacki", nazwa: "Wóz strażacki", key: "woz-strazacki-art-review-v1", scene: "Garaż · Wóz strażacki — kabina i pomost", interior: true },
  { id: "buldozer", nazwa: "Buldożer", key: "buldozer-art-review-v1", scene: "Garaż · Buldożer — gąsienice i obsada", interior: false,
    crewNames: ["Operator", "Pomocnik"] },
  { id: "bwp", nazwa: "M2 Bradley", packName: "Bojowy wóz piechoty", key: "bwp-art-review-v1", scene: "Garaż · M2 Bradley — załoga i desant", interior: true,
    crewNames: ["Kierowca", "Działonowy", "Dowódca", "Desant 1", "Desant 2", "Desant 3", "Desant 4", "Desant 5", "Desant 6"] },
  { id: "czolg", nazwa: "M1A1 Abrams", packName: "Czołg", key: "czolg-art-review-v1", scene: "Garaż · M1A1 Abrams — załoga i wieża", interior: true,
    crewNames: ["Kierowca", "Dowódca", "Ładowniczy", "Działonowy"] },
  { id: "motorower", nazwa: "Motorower", key: "motorower-art-review-v1", scene: "Garaż · Motorower — grafika i kierowca", interior: false,
    crewNames: ["Kierowca"] },
  { id: "rower", nazwa: "Rower", key: "rower-art-review-v1", scene: "Garaż · Rower — grafika i rowerzysta", interior: false,
    crewNames: ["Rowerzysta"] },
  { id: "deskorolka", nazwa: "Deskorolka", key: "deskorolka-art-review-v1", scene: "Garaż · Deskorolka — grafika i jadący", interior: false,
    crewNames: ["Deskorolkarz"] }
];

/** Apply delivered art even when a running Poligon still has an older vehicle pack. */
export async function ustawGrafikePojazdu(k, actor, id) {
  const def = PODGLADY_POJAZDOW.find(p => p.id === id);
  if (!actor || !def) return false;
  const slug = def.slug ?? def.id;
  const prefix = `modules/${MOD}/tokens/`, nadwozie = `${prefix}pojazdy/${slug}.webp`;
  const portrait = `${prefix}portraits/pojazd-${slug}.webp`;
  const wnetrze = def.interior ? `${prefix}pojazdy/wnetrza/${slug}.webp` : null;
  const config = KATALOG_POJAZDOW[id];
  const kadlub = config.wiezaGrafiki ? `${prefix}pojazdy/kadluby/${slug}.webp` : null;
  const wieza = config.wiezaGrafiki ? { src: `${prefix}pojazdy/wieze/${slug}.webp`, ...config.wiezaGrafiki } : null;
  const files = [nadwozie, portrait, wnetrze, kadlub, wieza?.src].filter(Boolean);
  const responses = await Promise.all(files.map(src => fetch(foundry.utils.getRoute(src), { method: "HEAD" })));
  const missing = files.filter((_, i) => !responses[i].ok);
  if (missing.length) { for (const src of missing) k.miss(`grafika pojazdu: ${src}`); return false; }
  await actor.update({ img: portrait, "prototypeToken.texture.src": nadwozie,
    ...(def.packName ? { "prototypeToken.name": def.nazwa } : {}),
    ...Object.fromEntries(Object.entries(config.teksturaGrafiki??{}).map(([key,value])=>[`prototypeToken.texture.${key}`,value])),
    "prototypeToken.width": config.obrys.w, "prototypeToken.height": config.obrys.h,
    "system.crew.max": PODWOZIA[id].zaloga, [`flags.${MOD}.pojazd.obrys`]: config.obrys,
    [`flags.${MOD}.pojazd.strefy`]: config.strefyGrafiki ?? config.strefy,
    ...(wnetrze ? { [`flags.${MOD}.pojazd.grafika`]: { nadwozie, wnetrze,
      ...(kadlub && wieza ? {kadlub,wieza} : {}) } } : {}) });
  return true;
}

async function vehicle(k, def, variant) {
  const a = await k.fromPack(`grafika-${def.id}-${variant}`, "pojazdy", def.packName ?? def.nazwa,
    { name: `${def.nazwa} · ${variant}`, data: { prototypeToken: { actorLink: true, displayName: 0 } } });
  if (!a || !await ustawGrafikePojazdu(k, a, def.id)) return null;
  // Catalog dimensions and source texture scale; no comparison multipliers.
  const obrys = KATALOG_POJAZDOW[def.id].obrys;
  await a.update({ [`flags.${MOD}.pojazd.obrys`]: obrys,
    "prototypeToken.width": obrys.w, "prototypeToken.height": obrys.h });
  return a;
}

async function human(k, key, name, { source = "Commoner", owner = null } = {}) {
  return k.fromPack(key, "dnd5e.monsters", source, { name, owner,
    data: { prototypeToken: { name, actorLink: true, displayName: 0, displayBars: 0,
      sight: { enabled: false }, ring: { enabled: false } } } });
}

export async function zbudujPodgladyPojazdow(k) {
  const P = game.neuroshima.pojazdy, result = [];
  for (const def of PODGLADY_POJAZDOW) {
    const existing = game.scenes.find(s => s.flags[MOD]?.testScene?.id === k.tag && s.flags[MOD].testScene.key === def.key);
    if (existing) {
      await existing.setFlag(MOD, "vehicleArtGallery", def.id);
      k.scenes[def.key] = existing;
      k.note(`zachowany podgląd ${existing.name}`);
      result.push({ id: def.id, scene: existing.id, reused: true });
      continue;
    }
    const config = KATALOG_POJAZDOW[def.id], d = config.obrys;
    const artHeight=config.teksturaGrafiki?.fit==='width' ? d.w*config.wiezaGrafiki.kadr[1]/config.wiezaGrafiki.kadr[0] : d.h;
    const artAnchorY=config.teksturaGrafiki?.anchorY??0.5;
    const seatCount = (config.strefyGrafiki ?? config.strefy).reduce((sum,s)=>sum+s.rzedy.reduce((a,b)=>a+b,0),0);
    const controls=config.silnik ? "Miejsca i silnik otworzysz z HUD-u." : "Miejsca otworzysz z HUD-u.";
    const placeLabel=(config.strefyGrafiki??config.strefy).every(s=>s.stojace) ? "Otwarte miejsce stojące" : "Otwarte siodło";
    const vehicleY = d.h > 6 ? 3.5 + d.h / 2 : 6.5;
    const referencesY = artHeight>d.h ? vehicleY+artHeight*(1-artAnchorY)+1.5 : d.h > 6 ? vehicleY + d.h / 2 + 1.5 : 10.5;
    const footerY = Math.max(16.3,referencesY+(Math.ceil(seatCount/6)-1)*2.2+3.5);
    const sceneHeight = Math.ceil(footerY+1.7);
    const scene = await k.scene(def.key, { name: def.scene, w: 28, h: sceneHeight, color: "#555c57", vision: false,
      grid: { alpha: 0.14 }, flags: { [MOD]: { vehicleArtGallery: def.id } } });
    const prefix = `modules/${MOD}/tokens/`, slug = def.slug ?? def.id;
    await scene.createEmbeddedDocuments("Tile", [{ x: 350, y: vehicleY * 100, width: 440, height: 440,
      texture: { src: `${prefix}portraits/pojazd-${slug}.webp` }, locked: true, flags: k.flags({ role: "portrait" }) }]);
    const vehicles = [], variants = seatCount===1 ? [["pusty",10],["załoga",16]] : def.interior ? [["pusty", 10], ["załoga", 23]] : [["pusty", 10], ["kierowca", 16], ["załoga", 23]];
    let crew = [];
    for (const [variant, x] of variants) {
      const a = await vehicle(k, def, variant);
      if (!a) continue;
      const [v] = await k.tokens(scene, [[a, x - d.w / 2, vehicleY - d.h / 2, { displayName: 0 }]]);
      vehicles.push(v);
      await P.utworzKluczyki(v);
      if (variant === "pusty") continue;
      const seats = P.miejscaPojazdu(a), count = variant === "kierowca" ? 1 : seats.length;
      for (let i = 0; i < count; i++) {
        const seat = seats[i], name = def.crewNames?.[i] ?? (seat.kierowca ? "Kierowca" : seat.stanowisko ? def.id === "wozStrazacki" ? "Operator działka wodnego" : "Strzelec włazu" : `Pasażer ${i}`);
        const source = seat.stanowisko ? "Bandit" : i % 2 ? "Guard" : "Commoner";
        const person = await human(k, `grafika-${def.id}-${variant}-czlowiek-${i}`, name,
          { source, owner: i === 0 ? "Gracz 1" : i === 1 ? "Gracz 2" : null });
        if (!person) continue;
        const [t] = await k.tokens(scene, [[person, 16 + (i % 6) * 1.8, referencesY, { name, displayName: 0 }]]);
        await P.posadz(v, t, seat.id);
        if (variant === "załoga") crew.push({ name, source, scale: person.prototypeToken.texture.scaleX });
      }
    }
    if (def.interior) await scene.createEmbeddedDocuments("Tile", [{ x: 1600, y: (vehicleY+artHeight*(0.5-artAnchorY)) * 100,
      width: d.w * 100, height: artHeight * 100,
      texture: { src: `${prefix}pojazdy/wnetrza/${slug}.webp` }, locked: true, flags: k.flags({ role: "interior-reference" }) }]);
    const labels = [
      [1, 0.7, `${def.nazwa.toLocaleUpperCase("pl")} · grafika i obsada`, { size: 30, w: 26 }],
      [1, 1.6, "Rozmiary katalogowe · źródłowe skale postaci dnd5e.", { size: 20, w: 26 }],
      [1, 2.3, seatCount===1 ? `${placeLabel}: postać stale widoczna nad pojazdem. ${controls}` : def.id === "ciezarowka" ? "Najedź, aby zdjąć dach kabiny. Osoby na otwartej pace pozostają widoczne." : def.interior ? "Najedź, aby obejrzeć wnętrze. Miejsca i silnik otworzysz z HUD-u pojazdu." : def.id === "buggy" ? "Otwarta rama: oba pionki stale widoczne nad fotelami. Miejsca i silnik otworzysz z HUD-u." : def.id === "traktor" ? "Kierowca na siodle, pasażer na błotniku: obaj stale widoczni. Miejsca i silnik otworzysz z HUD-u." : "Oba miejsca otwarte: postacie stale widoczne nad pojazdem. Miejsca i silnik otworzysz z HUD-u.", { size: 19, w: 26 }],
      [1.3, 3.4, "Portret", { size: 24, w: 5 }], [7.8, 3.4, "Pusty pojazd", { size: 24, w: 5 }],
      [13.6, 3.4, def.interior ? "Puste wnętrze" : seatCount===1 ? def.crewNames?.[0]??"Kierowca" : "Kierowca", { size: 24, w: 5 }],
      ...(seatCount===1 ? [] : [[20, 3.4, "Pełna obsada", { size: 24, w: 7 }]]),
      [16, referencesY-1, "Te same grafiki poza pojazdem:", { size: 19, w: 11 }],
      [1, footerY, "Przesuwaj, obracaj, przesiadaj i wysiadaj. Reset Garażu odtwarza ten podgląd.", { size: 18, w: 26 }]
    ];
    for (const [i, f] of crew.entries()) {
      const x = 16 + (i % 6) * 1.8, y = referencesY + Math.floor(i / 6) * 2.2;
      const a = await human(k, `grafika-${def.id}-odniesienie-${i}`, `${f.name} · odniesienie`, { source: f.source });
      await k.tokens(scene, [[a, x, y, { displayName: 0 }]]);
      labels.push([x, y + 1.5, f.name, { size: 14, w: 2 }]);
    }
    await k.labels(scene, labels);
    await scene.update({ initial: { x: 1400, y: sceneHeight * 50, scale: 0.5 } });
    result.push({ id: def.id, scene: scene.id, vehicles: vehicles.length, crew: crew.length });
  }
  return result;
}

export const narzedziaGrafikiPojazdow = [
  { label: "Parking", icon: "fa-solid fa-square-parking", run: () => game.poligon.stations.view("garaz", "parking") },
  ...PODGLADY_POJAZDOW.map(d => ({ label: `Grafika: ${d.nazwa}`, icon: "fa-solid fa-image",
    run: () => game.poligon.stations.view("garaz", d.key) }))
];
