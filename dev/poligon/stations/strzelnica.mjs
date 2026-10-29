/**
 * Strzelnica (§5.1, P1): attack flow, VFX and sound, explosives on the map. A 150 m lane with range
 * lines, a firing line of five personas covering P / KS / DS / MS / OZ, shotgun, bow and crossbow,
 * LAW / grenade launcher, flamethrower and a melee corner; targets: dummies at range, an armoured
 * target, dummies behind ½ and ¾ cover, a cluster of six for area weapons, a bestiary target with
 * reactions, a machine (Próg awarii), a large creature; an explosives pit with walls.
 */

import { manekin, p } from "./_wspolne.mjs";
import {zbudujGrafikeGranatow,narzedzieGrafikiGranatow} from './strzelnica-granaty.mjs';

export default {
  id: "strzelnica", name: "Strzelnica", prio: "P1", icon: "fa-solid fa-bullseye",
  opis: "Tor 150 m z liniami zasięgu; linia ognia: Żołnierz (AK, B 93R, Minimi), Kowboj (Peacemaker, Pompka, Dwururka), Zabójca (R700, łuk, kusza), Chemik (granaty, LAW, MGL, miotacz ognia, C4, miny), Gladiator (wręcz i miotane). Cele: manekiny 10/30/60/100 m, Obrońca, manekiny za ½ i ¾ osłony, szóstka do broni obszarowej, Gangus Żołnierz (reakcje), Spawacz (Próg awarii), Gigamut. Dół na ładunki.",
  gracze: 5,
  klucz: ["zolnierz"],
  async build(k) {
    const s = await k.scene("tor", { name: "Strzelnica · Tor", w: 110, h: 34, color: "#5a5440", main: true });
    const m = v => k.sq(s, v);
    const fx = 4;
    // Range lines and labels every band (centre of the firing line + metres).
    const bands = [5, 10, 20, 30, 50, 75, 100, 150];
    await k.stripes(s, bands.map(d => [fx + 0.5 + m(d), 2, 0.05, 22, "#ffffff", 0.35]).filter(x => x[0] < 109));
    await k.labels(s, bands.filter(d => fx + m(d) < 108).map(d => [fx + m(d), 0.5, `${d} m`, { size: 30 }]));
    await k.labels(s, [[0.5, 25, "LINIA OGNIA", { size: 24, fill: "#000000" }], [70, 26, "DÓŁ NA ŁADUNKI", { size: 28, fill: "#000000" }]]);

    // Cover: low walls in front of two dummies at 20 m (½) and a high one with a slit at 25 m (¾).
    const cx = Math.round(fx + m(20));
    await k.walls(s, [[cx, 15, cx, 17, "window"], [cx + 4, 18, cx + 4, 19.5], [cx + 4, 19.5, cx + 4, 21, "window"]]);
    await k.labels(s, [[cx - 1, 14, "½ osłony", { size: 22 }], [cx + 3, 21.2, "¾ osłony", { size: 22 }]]);
    // The explosives pit: a walled square to test the area picker against walls.
    await k.walls(s, k.room(66, 27, 10, 6, { door: { side: "n", at: 1 } }));

    // Firing line.
    const zol = await k.persona("zolnierz", "zolnierz-5", { owner: "Gracz 1" });
    const kow = await k.persona("kowboj", "kowboj-5", { owner: "Gracz 2", loadout: false });
    const zab = await k.persona("zabojca", "zabojca-5", { owner: "Gracz 3", loadout: false });
    const che = await k.persona("chemik", "chemik-5", { owner: "Gracz 4", loadout: false });
    const gla = await k.persona("gladiator", "gladiator-5", { owner: "Gracz 5", loadout: false });
    for (const [u, a] of [["Gracz 1", zol], ["Gracz 2", kow], ["Gracz 3", zab], ["Gracz 4", che], ["Gracz 5", gla]]) await k.seat(u, a);
    await k.give(zol, [{ ref: "bron:B 93R", load: { spareMags: 1 } }, { ref: "bron:Minimi", load: true }, { ref: "amunicja:{556}", qty: 200 }, { ref: "amunicja:{9mm}", qty: 60 }, { ref: "amunicja:{76239ak}", qty: 90 }]);
    await k.give(kow, [{ ref: "bron:Peacemaker", place: "ranged", load: true }, { ref: "bron:Pompka", place: "hand.0", load: true }, { ref: "bron:Dwururka", load: true },
      { ref: "amunicja:{12ga_s}", qty: 40 }, { ref: "amunicja:{12ga_b}", qty: 20 }, { ref: "amunicja:{45acp}", qty: 30 }, { ref: "amunicja:{44mag_dd}", qty: 12 }, { ref: "bron:.44 Magnum", load: true }]);
    await k.give(zab, [{ ref: "bron:R700", place: "hand.0", load: true }, { ref: "bron:Łuk bloczkowy" }, { ref: "bron:Kusza bloczkowa", load: true },
      { ref: "amunicja:{762}", qty: 40 }, { ref: "amunicja:{strzala}", qty: 20 }, { ref: "amunicja:{belt}", qty: 20 }, { ref: "bron:Light Fifty", load: true }, { ref: "amunicja:{50bmg}", qty: 10 }]);
    await k.give(che, [{ ref: "granaty:{grenade-frag}", qty: 5 }, { ref: "granaty:{grenade-smoke}", qty: 2 }, { ref: "granaty:{grenade-molotov}", qty: 3 },
      { ref: "granaty:{grenade-flashbang}", qty: 2 }, { ref: "granaty:{grenade-gas}", qty: 2 }, { ref: "granaty:{grenade-incendiary}", qty: 2 },
      { ref: "granaty:{grenade-c4-remote}", qty: 3 }, { ref: "sprzet:Detonator radiowy" }, { ref: "granaty:{grenade-antipersonnel-mine}", qty: 2 },
      { ref: "granaty:{grenade-ied}", qty: 2 }, { ref: "sprzet:Zapalnik elektryczny", qty: 2 }, { ref: "granaty:{grenade-dynamite}", qty: 3 },
      { ref: "bron:LAW" }, { ref: "bron:MGL1S", load: true }, { ref: "amunicja:{40mm}", qty: 12 }, { ref: "bron:Miotacz ognia" }, { ref: "bron:Pistolet na Race", load: true }, { ref: "amunicja:{race}", qty: 6 }]);
    await k.give(gla, [{ ref: "bron:Piłomiecz", place: "hand.0" }, { ref: "bron:Katana" }, { ref: "bron:Kastet" }, { ref: "bron:Łańcuch" },
      { ref: "bron:Nóż do rzucania", qty: 4 }, { ref: "bron:Bolas" }, { ref: "bron:Oszczep" }, { ref: "pancerze:Tarcza", place: "auto" }]);

    // Targets.
    const dummies = [];
    for (const d of [10, 30, 60, 100]) dummies.push([await manekin(k, `manekin-${d}`, { name: `Manekin ${d} m` }), fx + m(d), 6]);
    const half = await manekin(k, "manekin-pol", { name: "Manekin za ½ osłony" });
    const tq = await manekin(k, "manekin-tq", { name: "Manekin za ¾ osłony" });
    const cluster = [];
    for (let i = 0; i < 6; i++) cluster.push([await manekin(k, `szostka-${i}`, { name: `Szóstka ${i + 1}`, hp: 60 }), fx + m(40) + (i % 3), 26 + Math.floor(i / 3)]);
    const obronca = await k.fromPack("obronca", "bestiariusz", "obronca");
    const gangus = await k.fromPack("gangus", "bestiariusz", "gangus-zolnierz");
    const spawacz = await k.fromPack("spawacz", "bestiariusz", "spawacz");
    const gigamut = await k.fromPack("gigamut", "bestiariusz", "gigamut");

    await k.tokens(s, [
      [zol, fx, 9], [kow, fx, 11], [zab, fx, 13], [che, fx, 15], [gla, fx + 2, 30],
      ...dummies, [half, cx + 1, 16], [tq, cx + 5, 19.5], ...cluster,
      [obronca, fx + m(25), 10], [gangus, fx + m(35), 12], [spawacz, fx + m(30), 22], [gigamut, fx + m(50), 18],
      [await manekin(k, "manekin-wrecz", { name: "Manekin (wręcz)" }), fx + 3, 30]
    ]);
    const grafika=await zbudujGrafikeGranatow(k);
    return { grafika, strzelcy: [zol, kow, zab, che, gla].filter(Boolean).map(a => `${a.name}: ${a.items.filter(i => i.type === "weapon").length} broni`), cele: s.tokens.size - 5 };
  },
  narzedzia: [
    { label: "Panel smugaczy", icon: "fa-solid fa-wand-sparkles", run: () => game.neuroshima.vfx.panel() },
    { label: "Panel dźwięków", icon: "fa-solid fa-volume-high", run: () => game.neuroshima.sounds.panel() },
    { label: "Sprzątnij ziemię", icon: "fa-solid fa-broom", run: () => game.neuroshima.ziemia.sweep() },
    narzedzieGrafikiGranatow
  ],
  proby: [
    p('grafika-granaty','Grafika ładunków','Wszystkie dziewięć przedmiotów: rozpoznawalność, przezroczystość i czytelność małych próbek','Grafika: Granaty i ładunki. Porównaj powiększenia z próbkami 0,3 i 0,5 kratki na dwóch tłach. IED radiowe ma antenę; C4 radiowe zachowuje grafikę C4. Ogień zapalonego Mołotowa dodaje moduł.'),
    p("smugacz", "VFX i dźwięk", "Na kaliber: długość, szybkość i kolor smugacza oraz dźwięk — pasują do broni? Seria wygląda jak seria?", "Każdy strzelec po kolei, P / KS / DS / MS; panel smugaczy i dźwięków pod ręką."),
    p("koszt", "Przepływ ataku", "Jeden strzał = ile kart i kliknięć (Liczniki)? Werdykt czytelny bez otwierania czegokolwiek?", "Liczniki → Zeruj; jeden strzał; odczyt."),
    p("okolicznosci", "Przepływ ataku", "Plakietki okoliczności przy strzale w zwarciu, na daleki zasięg, w biegu — tłumaczą Utrudnienie?", "Gangus obok strzelca; manekin 100 m; Bieganie."),
    p("reakcje", "Przepływ ataku", "Reakcje celu z miejsca gracza: nachalne? czy gracz znajduje swój przycisk?", "Gangus Żołnierz atakuje gracza; gracz w swoim oknie."),
    p("zacięcie", "Przepływ ataku", "Pechowa 1: komunikaty zacięcia i degradacji broni białej — zrozumiałe dla gracza?", "Kości → k20 = 1 na miejscu gracza; strzał / cios."),
    p("oslona", "Przepływ ataku", "Osłona ½ i ¾ — wybór w oknie ataku i wynik", "Strzał w manekiny za murkami."),
    p("granat", "Ładunki", "Granat, mina, C4: podgląd obszaru na jasnej i ciemnej podłodze, przy ścianach dołu; moment wybuchu; ilość przypaleń i krwi", "Chemik: rzut w szóstkę i w dół; C4 + detonator; mina."),
    p("pancerz", "Przepływ ataku", "Obrońca (pancerz): tacka obrażeń i jej plakietki", "Strzał AK w Obrońcę."),
    p("maszyna", "Przepływ ataku", "Spawacz — Próg awarii: karta i jej czytelność", "Krytyk w Spawacza (Kości 20)."),
    p("duzy", "Przepływ ataku", "Gigamut: rozmiar żetonu, trafienia, pola zajmowane", "Kilka strzałów, ruch obok."),
    p("dumdum", "NOE / WKK", "Dum-dum (.44 Mag dd), rozrywająca, pojedynczy nabój — różnice NOE / WKK", "Wariant NOE, potem WKK; ta sama broń.", "WKK"),
    p("race", "NOE / WKK", "Pistolet na race i światło Mołotowa", "Chemik: raca w górę; Mołotow w dół.", "WKK")
  ]
};
