/**
 * Poziomy (P2) — sceny z poziomami v14 i to, co dokłada do nich moduł (`scenes/transitions.mjs`,
 * `scenes/fx-markers.mjs`): schody, zerwany bieg (trudne przejście, gracz rzuca), szyb z progami
 * wagi (rozstrzyga MG), otwór w podłodze (spadanie dnd5e, „Opuść bezpiecznie”), szlam ze skokiem
 * i kładką, znaczniki FX Detonuj i Odsłoń. Mały bunkier na trzech poziomach, nie mapa kampanii —
 * te same zachowania, które eksport stosu map stawia na Silosie, ułożone tak, żeby każdą próbę dało
 * się zrobić w minutę. Trzy osoby: SIŁ 15, 13 i 10 (progi skoku przez 4,5 m szlamu).
 */

import { MOD, p } from "./_wspolne.mjs";

const G = 100;
const A = "defaultLevel0000", B = "poligonSrodek000", C = "poligonDol000000";
const NAZWY = { [A]: "Góra", [B]: "Środek", [C]: "Dół" };
const BEH = { przejscie: `${MOD}.trudnePrzejscie`, strefa: `${MOD}.strefaSkazenia`, skok: `${MOD}.skok` };
const SFX = `modules/${MOD}/sounds/fx/machine-overload.ogg`;

const id = () => foundry.utils.randomID();
const pole = (c, r, w = 1, h = 1, hole = false) => ({ type: "rectangle", x: c * G, y: r * G, width: w * G, height: h * G, rotation: 0, hole });
const plaski = z => ({ bottom: z, top: z });
const wszedzie = { bottom: null, top: null };

/** Region z flagami stanowiska (reset kasuje scenę razem z nim). */
function region(k, rola, dane) {
  return { _id: id(), visibility: CONST.REGION_VISIBILITY.LAYER, locked: false, behaviors: [], ...dane,
    flags: k.flags({ role: rola, ...(dane.flags ?? {}) }) };
}

const podloga = (k, nazwa, levels, z, shapes) => region(k, "floor", {
  name: `Podłoga · ${nazwa}`, color: "#7f7f7f", shapes, levels, elevation: plaski(z),
  behaviors: [{ type: "defineSurface", name: "Podłoga", system: { placement: "bottom", light: true, move: true, sight: true,
    sound: true, occlusion: true } }]
});

const przybycie = (k, nazwa, level, z, pola) => region(k, "arrival", {
  name: nazwa, color: "#40c0ff", levels: [level], elevation: plaski(z), shapes: pola.map(([c, r]) => pole(c, r))
});

/** Para przejść w dwie strony; `beh(cel)` buduje zachowanie odjazdu wskazujące przybycie po drugiej stronie. */
function para(k, nazwa, [lvA, zA, odA, prA], [lvB, zB, odB, prB], beh) {
  const pA = przybycie(k, `${nazwa} — przybycie (${NAZWY[lvA]}, ${prA.join(",")})`, lvA, zA, [prA]);
  const pB = przybycie(k, `${nazwa} — przybycie (${NAZWY[lvB]}, ${prB.join(",")})`, lvB, zB, [prB]);
  const odjazd = (lv, od, cel, koniec) => region(k, "link", {
    name: `${nazwa} (${koniec})`, color: "#ffa020", levels: [lv], elevation: wszedzie, shapes: [pole(...od)],
    behaviors: [beh(`..${cel._id}`, koniec)], flags: { link: `${nazwa}:${koniec}` }
  });
  return [pA, pB, odjazd(lvA, odA, pB, "gora"), odjazd(lvB, odB, pA, "dol")];
}

export default {
  id: "poziomy", name: "Poziomy", prio: "P2", icon: "fa-solid fa-layer-group",
  opis: "Bunkier na trzech poziomach (Góra 0 m, Środek −3 m, Dół −6 m): schody, zerwany bieg (ST 12 w dół, 16 w górę), szyb z progami wagi (MG), kanał do przeczołgania pod ścianą na Dole, otwór w podłodze Góry, szlam radioaktywny na Dole ze skokiem 4,5 m i kładką, maszyna do wysadzenia na Środku i zasadzka do odsłonięcia na Górze. Gracz 1: SIŁ 15, Gracz 2: SIŁ 13, Gracz 3: SIŁ 10.",
  gracze: 3,
  klucz: [],
  async build(k) {
    const s = await k.scene("bunkier", { name: "Poziomy · Bunkier", w: 26, h: 18, color: "#34322d", vision: true, main: true });
    await s.updateEmbeddedDocuments("Level", [{ _id: A, name: "Góra", elevation: { bottom: 0, top: null } }]);
    await s.createEmbeddedDocuments("Level", [
      { _id: B, name: "Środek", elevation: { bottom: -3, top: 0 }, background: { src: null, color: "#2c2b27" }, sort: 1 },
      { _id: C, name: "Dół", elevation: { bottom: -6, top: -3 }, background: { src: null, color: "#24231f" }, sort: 2 }
    ], { keepId: true });

    // Ściany: pokój maszyny na Środku (wybuch nie wychodzi za mury), korytarz szlamu na Dole.
    const sciany = [
      { c: [14, 6, 22, 6], levels: [B] }, { c: [22, 6, 22, 13], levels: [B] }, { c: [22, 13, 14, 13], levels: [B] },
      { c: [14, 13, 14, 10], levels: [B] }, { c: [14, 10, 14, 9], levels: [B], door: CONST.WALL_DOOR_TYPES.DOOR },
      { c: [14, 9, 14, 6], levels: [B] },
      { c: [8, 3, 8, 13], levels: [C] }, { c: [10, 3, 10, 13], levels: [C] },
      { c: [15, 2, 15, 8], levels: [C] }
    ];
    await s.createEmbeddedDocuments("Wall", sciany.map(w => ({ ...w, c: w.c.map(v => v * G), flags: k.flags({ role: "wall" }) })));

    const strefa = region(k, "hazard", {
      name: "Szlam radioaktywny", color: "#40c040", levels: [C], elevation: wszedzie, shapes: [pole(8, 6, 2, 3)],
      behaviors: [
        { type: BEH.strefa, name: "Strefa skażenia", system: { dc: 15, dcFall: 20, label: "szlam radioaktywny", bridged: false } },
        { type: "dnd5e.difficultTerrain", name: "Trudny teren", system: { magical: false } }
      ]
    });
    const cel = (nazwa, pola) => przybycie(k, nazwa, C, -6, pola);
    const skoki = {
      pd: { land: cel("Skok ↓ lądowisko", [[8, 9], [9, 9]]), short: cel("Skok ↓ krótki", [[8, 8], [9, 8]]), back: cel("Skok ↓ powrót", [[8, 5], [9, 5]]) },
      pn: { land: cel("Skok ↑ lądowisko", [[8, 5], [9, 5]]), short: cel("Skok ↑ krótki", [[8, 6], [9, 6]]), back: cel("Skok ↑ powrót", [[8, 9], [9, 9]]) }
    };
    const skok = (kier, rzad) => region(k, "jump", {
      name: `Skok przez szlam (${kier === "S" ? "na południe" : "na północ"})`, color: "#ff60c0", levels: [C], elevation: wszedzie,
      shapes: [pole(8, rzad, 2, 1)],
      behaviors: [{ type: BEH.skok, name: "Skok", system: { gap: 3, dir: kier, hazard: `..${strefa._id}`,
        ...Object.fromEntries(Object.entries(skoki[kier === "S" ? "pd" : "pn"]).map(([kk, r]) => [kk, `..${r._id}`])) } }]
    });

    const regiony = [
      podloga(k, "Góra", [A], 0, [pole(0, 0, 26, 18), pole(12, 7, 2, 2, true)]),
      podloga(k, "Środek", [B, A], -3, [pole(0, 0, 26, 18)]),
      podloga(k, "Dół", [C, B, A], -6, [pole(0, 0, 26, 18)]),
      ...para(k, "Schody", [A, 0, [3, 3], [4, 3]], [B, -3, [3, 3], [4, 3]], (dest, koniec) => ({
        type: "teleportToken", name: "Schody", system: { destinations: [dest], placement: "random", snap: true, choice: true,
          revealed: false, dialog: { unrevealed: koniec === "gora" ? "Zejść schodami w dół?" : "Wejść schodami w górę?", revealed: null },
          transition: { type: null, duration: 1500 } } })),
      ...para(k, "Zerwany bieg", [A, 0, [6, 14], [7, 14]], [B, -3, [6, 14], [7, 14]], (dest, koniec) => ({
        type: BEH.przejscie, name: "Trudne przejście", system: { mode: "auto", skill: "atl", dc: koniec === "gora" ? 12 : 16,
          fallFormula: "2d6", destination: dest, roped: false, prompt: koniec === "gora" ? "Zejść po zerwanym biegu?" : "Wspiąć się po zerwanym biegu?",
          weightTiers: false, brokenRungs: 0 } })),
      ...para(k, "Szyb", [B, -3, [24, 3], [23, 3]], [C, -6, [24, 3], [23, 3]], dest => ({
        type: BEH.przejscie, name: "Trudne przejście", system: { mode: "gm", skill: "atl", dc: 0, fallFormula: "2d6",
          destination: dest, roped: false, prompt: "Szyb ewakuacyjny, połamana drabina", weightTiers: true, brokenRungs: 0 } })),
      ...para(k, "Kanał", [C, -6, [14, 5], [13, 5]], [C, -6, [15, 5], [16, 5]], dest => ({
        type: BEH.przejscie, name: "Trudne przejście", system: { mode: "auto", skill: "akr", dc: 13, fallFormula: "",
          destination: dest, roped: false, prompt: "Kanał wentylacyjny pod ścianą", weightTiers: false, brokenRungs: 0, crawl: true } })),
      strefa, skok("S", 6), skok("N", 8), ...Object.values(skoki.pd), ...Object.values(skoki.pn),
      region(k, "darkness", { name: "Ciemność · Dół", color: "#000020", levels: [C], elevation: wszedzie, shapes: [pole(0, 0, 26, 18)],
        behaviors: [{ type: "adjustDarknessLevel", name: "Ciemność", system: { mode: 0, modifier: 0.7 } }] })
    ];
    await s.createEmbeddedDocuments("Region", regiony, { keepId: true });
    await s.createEmbeddedDocuments("AmbientLight", [{ x: 9 * G, y: 7.5 * G, elevation: -6, levels: [C], walls: true,
      config: { color: "#5cff4a", alpha: 0.4, bright: 0, dim: 3, luminosity: 0.5, attenuation: 0.6,
        animation: { type: "pulse", speed: 2, intensity: 3, reverse: false } }, flags: k.flags({ role: "light" }) }]);

    // Znaczniki FX: flaga sceny + dziennik MG z przyciskami + pinezki.
    const fx = {
      maszyna: { kind: "detonate", title: "Maszyna", x: 18 * G, y: 9.5 * G, level: B, elevation: -3, sfx: SFX, radius: 4.5,
        lead: 2, tail: 0, hear: 30, wreck: null, group: null, text: "4k6 ognia + kłute, RO ZRC ST 13 — połowa. Kto wyszedł z pokoju, jest bezpieczny." },
      zasadzka: { kind: "reveal", title: "Zasadzka", x: 20.5 * G, y: 12.5 * G, level: A, elevation: 0, sfx: null, radius: 0,
        lead: 0, tail: 0, hear: 0, wreck: null, group: "Zasadzka", text: "Dwa Kurczaki czekają ukryte." }
    };
    await s.setFlag(MOD, "fx", fx);
    const dziennik = await JournalEntry.implementation.create({
      name: "Poziomy — notatki MG", ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE }, flags: k.flags({ role: "journal" }),
      pages: [
        { name: "Maszyna", type: "text", text: { content: `<p>@NeuroFx[maszyna]{Detonuj}</p><p>${fx.maszyna.text}</p>` } },
        { name: "Zasadzka", type: "text", text: { content: `<p>@NeuroFx[zasadzka]{Odsłoń}</p><p>${fx.zasadzka.text}</p>` } }
      ]
    });
    await s.createEmbeddedDocuments("Note", Object.entries(fx).map(([klucz, z], i) => ({
      entryId: dziennik.id, pageId: dziennik.pages.contents[i].id, x: z.x, y: z.y, elevation: z.elevation, levels: [z.level],
      texture: { src: z.kind === "reveal" ? "icons/svg/eye.svg" : "icons/svg/explosion.svg" }, iconSize: 40, text: z.title,
      flags: k.flags({ role: `fx-${klucz}` })
    })));

    const osoby = [];
    for (const [klucz, persona, gracz, sil] of [["sil15", "twardziel-1", "Gracz 1", 15], ["sil13", "zwiadowca-1", "Gracz 2", 13],
      ["sil10", "zlodziej-1", "Gracz 3", 10]]) {
      const a = await k.persona(klucz, persona, { owner: gracz, name: `SIŁ ${sil}`, loadout: false });
      if (a) await a.update({ "system.abilities.str.value": sil });
      await k.seat(gracz, a);
      osoby.push(a);
    }
    const kurczak1 = await k.fromPack("kurczak1", "bestiariusz", "kurczak");
    const kurczak2 = await k.fromPack("kurczak2", "bestiariusz", "kurczak");
    const zasadzka = { hidden: true, level: A, elevation: 0, flags: { [MOD]: { source: "encounter", room: "Zasadzka" } } };
    await k.tokens(s, [
      [osoby[0], 2, 5, { level: A, elevation: 0 }], [osoby[1], 3, 5, { level: A, elevation: 0 }], [osoby[2], 4, 5, { level: A, elevation: 0 }],
      [kurczak1, 20, 12, zasadzka], [kurczak2, 21, 12, zasadzka]
    ]);
    return { poziomy: s.levels.size, regiony: s.regions.size, znaczniki: Object.keys(fx).length };
  },
  narzedzia: [
    { label: "Kładka wł./wył.", icon: "fa-solid fa-bridge", run: () => {
      const r = canvas.scene?.regions.find(x => x.behaviors.some(b => b.type === BEH.strefa));
      return r ? game.neuroshima.maps.kladka(r.id) : ui.notifications.warn("Najpierw Idź do stanowiska Poziomy.");
    } }
  ],
  proby: [
    p("schody", "Przejścia", "Schody: okno „Zejść schodami w dół?”, token na poziomie niżej stoi na podłodze (bez Spadania), widok gracza idzie za nim", "Gracz 1: na schody (3,3) na Górze i z powrotem ze Środka."),
    p("zerwany-dol", "Przejścia", "Zerwany bieg w dół (ST 12): okno z ST, rzut Atletyki gracza; porażka = przeniesienie i karta obrażeń od upadku 2k6, MG nakłada z tacy", "Gracz 3: (6,14) na Górze; Kości → ustaw niski wynik.", "RAI"),
    p("zerwany-gora", "Przejścia", "Zerwany bieg w górę (ST 16): porażka zostawia na Środku z kartą 2k6; „Zostań” nie przenosi", "Gracz 2: (6,14) na Środku."),
    p("szyb", "Przejścia", "Szyb (rozstrzyga MG): okno progów wagi tylko u MG, RO ZRC rzucony za gracza, złamane szczeble podnoszą ST na obu końcach", "Gracz 1 schodzi (24,3) ze Środka; MG wybiera „101–120 kg”; potem ktoś wchodzi z Dołu."),
    p("kanal", "Przejścia", "Kanał: okno prędkości (bardzo powoli ST 13 / połowa 16 / pełna 19, Akrobatyka); porażka = utknięcie na turę na polu wylotu, bez obrażeń; duża istota się nie mieści", "Ktokolwiek na Dole wchodzi w wylot (14,5) albo z drugiej strony ściany w (15,5)."),
    p("otwor", "Spadanie", "Otwór w podłodze Góry: status Spadanie, MG spuszcza token, karta obrażeń; HUD MG „Opuść bezpiecznie” zamiast tego — bez karty", "Ktokolwiek wchodzi w otwór (12–13, 7–8).", "NOE"),
    p("szlam-wejscie", "Skażenie", "Wejście w szlam: szeptana karta MG z guzikiem RO KON ST 15; guzik rzuca i nalicza Wyczerpanie i licznik choroby popromiennej", "Ktokolwiek wchodzi w szlam z boku albo wybiera „Wejdź w szlam”.", "NOE"),
    p("skok-auto", "Skok", "SIŁ 15 z rozbiegiem: pole „Rozbieg?” zaznaczone samo (3 pola prosto przed pierwszym rzędem), „doskakuje bez rzutu”, ląduje za szlamem", "Gracz 1: z (8,2) prosto w dół do (8,6) jednym ruchem.", "NOE"),
    p("skok-st", "Skok", "SIŁ 13 z rozbiegiem: Atletyka ST 10; porażka o 1–4 = ostatni rząd szlamu i karta ST 15; o 5+ = twarzą w pierwszy rząd i karta ST 20", "Gracz 2: rozbieg jak wyżej; Kości → ustaw wynik (np. 7 i 2).", "NOE"),
    p("skok-z-miejsca", "Skok", "SIŁ 10 albo bez rozbiegu: „nie doskoczy”; „Zostań” wraca na półkę; próba mimo to = upadek twarzą", "Gracz 3: z półki (8,5) krok w dół.", "NOE"),
    p("skok-powrot", "Skok", "Skok na północ z lądowiska (8,9) działa tak samo; brodzenie w drugą stronę przez rząd skoku nie otwiera okna", "Ktokolwiek w szlamie idzie na północ."),
    p("kladka", "Skok", "Kładka (narzędzie stanowiska): przejście przez szlam bez okna i bez karty; trudny teren zostaje", "MG: Kładka wł., potem przejście; Kładka wył."),
    p("poswiata", "Widok", "Zielona pulsująca poświata nad szlamem na ciemnym Dole; nie widać jej z innych poziomów", "Widok gracza na Dole i na Górze."),
    p("detonuj", "FX", "Detonuj: iskry 2 s → dźwięk maszyny z jej kierunku, przytłumiony za ścianą → wybuch, obszar 4,5 m, pauza dla wszystkich; karta MG wymienia tokeny w zasięgu; wznowienie zdejmuje obszar; drugi klik pyta", "MG: pinezka „Maszyna” na Środku → Detonuj; jeden gracz w pokoju, drugi za ścianą.", "RAI"),
    p("odslon", "FX", "Odsłoń: dwa Kurczaki zasadzki wychodzą z ukrycia, nic poza nimi", "MG: pinezka „Zasadzka” na Górze → Odsłoń."),
    p("poziom-widok", "Widok", "Gracz widzi tylko poziom swojego tokena: ściany, tokeny i światła innych poziomów ukryte; przełączanie poziomów u MG", "Trzy okna graczy na różnych poziomach.")
  ]
};
