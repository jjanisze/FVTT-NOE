/**
 * Arena (§5.5, P2): combat at table scale — Drużyna Poligonu (five, a dog, a drone, Prawa ręka) against
 * ten from the Bestiariusz (armed humans with reactions, a machine, a swarm, something big). The combat
 * is prepared, not started: the GM rolls initiative as at the table.
 *
 * M6 (PLAN_m6_drobne_zasady.md): the room's door is flagged like an exported door (for „Ufizycznij”), a pond
 * (deep, fast) inside a ford (shallow) at the bottom, a crowbar on the Najemnik for improvised attacks.
 */

import { p, MOD } from "./_wspolne.mjs";
import { zbudujGrafikeZanurzenia, narzedzieZanurzenia } from "./arena-woda.mjs";
import { zbudujDuzeZanurzenie, narzedzieDuzegoZanurzenia } from "./arena-woda-duze.mjs";

export default {
  id: "arena", name: "Arena", prio: "P2", icon: "fa-solid fa-khanda",
  opis: "Średnia mapa z osłonami. Drużyna (Najemnik, Kaznodzieja, Medyk, Żołnierz, Szczur — Gracz 1–5) z psem, dronem i Prawą ręką kontra 10 z Bestiariusza (Gangusy, Cyngle, Kanibale, Spawacz, Rój szczurów, Gigamut). Walka przygotowana, nierozpoczęta. M6: drzwi pokoju do „Ufizycznij”, staw (głęboki, rwący) w brodzie (płytkim), łom u Najemnika.",
  gracze: 5,
  async build(k) {
    const s = await k.scene("arena", { name: "Arena", w: 44, h: 32, color: "#5b5039", main: true });
    await k.walls(s, [
      ...k.room(16, 10, 6, 4, { door: { side: "w", at: 1 }, windows: [{ side: "e", at: 2 }] }),
      [8, 6, 12, 6], [8, 24, 12, 24], [28, 4, 28, 9], [30, 20, 34, 20], [24, 26, 24, 30],
      [12, 15, 12, 18, "window"], [32, 12, 34, 12, "window"]
    ]);
    // M6 §5.4: drzwi jak z eksportu mapy — „Ufizycznij” podsunie szablon drzwi i pamięć zniszczeń.
    for (const w of s.walls.filter(x => x.door > 0)) await w.update({ [`flags.${MOD}.source`]: "door" });
    // M6 §5.6: bród (płytki — Osłona ½) wokół stawu (głęboki, rwący — ST 15).
    try {
      const woda = (name, x, y, w, h, system) => ({
        name, color: "#2f6f8f", shapes: [{ type: "rectangle", x: x * 100, y: y * 100, width: w * 100, height: h * 100 }],
        behaviors: [{ type: `${MOD}.woda`, name: "Woda", system }]
      });
      await s.createEmbeddedDocuments("Region", [
        woda("Bród", 14, 22, 10, 7, { glebokosc: "plytka", nurt: "spokojna" }),
        woda("Staw", 16, 23, 6, 5, { glebokosc: "gleboka", nurt: "rwaca" })
      ]);
    } catch (err) { k.miss(`woda: ${err.message}`); }
    const ids = [["najemnik", "najemnik-5"], ["kaznodzieja", "kaznodzieja-nowej-ery-5"], ["medyk", "medyk-5"], ["zolnierz", "zolnierz-5"], ["szczur", "szczur-5"]];
    const party = [];
    for (const [i, [key, id]] of ids.entries()) {
      const a = await k.persona(key, id, { owner: `Gracz ${i + 1}` });
      party.push(a);
      await k.seat(`Gracz ${i + 1}`, a);
    }
    await k.party(party);
    // M6 §5.2: łom w plecaku Najemnika — „Weź do ręki”, „Atak improwizowany”, rzut.
    await party[0]?.createEmbeddedDocuments("Item", [{ name: "Łom", type: "loot", img: "icons/tools/hand/pickaxe-steel-grey.webp",
      system: { weight: { value: 3, units: "kg" }, quantity: 1 } }]);
    const T = game.neuroshima.towarzysze;
    await k.adopt("pies", await T.utworz(party[3], { rodzaj: "psi-partner", nazwa: "Reks", zrodlo: "partner" }));
    await k.adopt("prawa-reka", await T.utworz(party[1], { rodzaj: "prawa-reka", nazwa: "Brat Tomasz", zrodlo: "moja-prawa-reka" }));
    const dron = await game.neuroshima.drony.utworzDrona(party[2], "dron-kroczacy", { tworca: party[2], nazwa: "Sanitariusz" });
    await k.adopt("dron", dron?.dron);

    const foes = [];
    for (const [i, id] of ["gangus-zolnierz", "gangus-zolnierz", "gangus-zolnierz", "cyngiel", "cyngiel", "kanibal", "kanibal", "spawacz", "roj-szczurow", "gigamut"].entries()) {
      foes.push(await k.fromPack(`wrog-${i}`, "bestiariusz", id));
    }
    await k.tokens(s, [
      ...party.map((a, i) => [a, 3, 8 + i * 3]), [k.actors.pies, 5, 17], [k.actors["prawa-reka"], 5, 11],
      ...foes.map((a, i) => [a, 34 + (i % 3) * 3, 4 + Math.floor(i / 3) * 7])
    ]);
    if (dron?.uchwyt) await game.neuroshima.drony.rozloz(dron.uchwyt, { pozycja: { x: 500, y: 1400 }, scena: s });
    await k.combat(s, [...party, ...foes]);
    const grafika = await zbudujGrafikeZanurzenia(k);
    const duzePionki = await zbudujDuzeZanurzenie(k);
    return { grafika, duzePionki, druzyna: party.filter(Boolean).length, wrogowie: foes.filter(Boolean).length };
  },
  narzedzia: [narzedzieZanurzenia, narzedzieDuzegoZanurzenia],
  proby: [
    p("grafika-zanurzenie-duze", "Grafika wody", "Pionki 2×2 i 3×3, długie pojazdy i osobna wieża: wspólny poziom fal, maska po obrocie, wyższy maksymalny zasięg o 15% wysokości", "Grafika: Zanurzenie — duże pionki. Porównaj suche i mokre próbki, obróć samochód, najedź na Bradleya; sprawdź kadłub i wieżę."),
    p("grafika-zanurzenie", "Grafika wody", "Czytelne grzbiety i zanikająca alfa fal, intensywniejsza animacja, kontrast mętnej wody i ścieków, pozioma tafla przy obrocie; siła 80%", "Grafika: Zanurzenie. Porównaj z pierwotną nakładką: oceń wyraźne fale i prześwity przy 70–140 px. Obróć pionek i przełącz animację w ustawieniach."),
    p("runda", "Skala", "Czas zegarowy i liczba kliknięć na rundę; tracker z grupami inicjatywy", "Stoper; Liczniki → Zeruj przed rundą."),
    p("czat", "Skala", "Czat po trzech rundach: da się czytać? co jest zbędne?", "Trzy rundy, potem przewiń czat."),
    p("reakcje", "BN", "Reakcje BN, upuszczona broń i przedmioty na ziemi, „BN pada”", "Walka do upadku kilku Gangusów."),
    p("klatki", "Wydajność", "Czas klatki przy 15 żetonach w walce", "Liczniki → klatki wł."),
    p("towarzysze", "Towarzysze", "Pies, dron i Prawa ręka w walce drużyny — tylko w skali stołu; szczegóły w Hangarze", "Komendy w turach właścicieli."),
    p("improwizacja", "M6", "Broń improwizowana: łom w ręce, atak z menu, typ obrażeń w oknie, rzut na ziemię; kolbą / rękojeścią", "Najemnik: łom → Weź do ręki → Atak improwizowany.", "NOE"),
    p("obiekt", "M6", "Drzwi pokoju: Ufizycznij (szablon drzwi), strzał, 0 PW → szept z przyciskami, X, Zniszczenia → Przywróć", "Warstwa ścian: zaznacz drzwi → kostka „Ufizycznij”.", "NOE"),
    p("woda", "M6", "Staw w walce: szept MG przy wejściu, test, Tonie i Pod wodą z oddechem, test na początku tury, strzał spod wody; bród — Osłona ½", "Wejdź żetonem do stawu w walce.", "NOE"),
    p("wspinaczka", "M6", "Ruch „wspinaczka” w turze: karta ST 10 / 15, wolne ręce, ciężki plecak", "Paleta ruchu → Wspinaczka, w swojej turze.", "NOE")
  ]
};
