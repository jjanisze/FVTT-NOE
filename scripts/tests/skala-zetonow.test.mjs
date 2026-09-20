/**
 * Neuroshima 5e — skala żetonów Bestiariusza: domknięcie `tokens/scale-overrides.json`.
 *
 * Warstwa 1 wg `TESTING.md` — czyste dane i domknięcie odwołań między tabelami.
 * Celowo **nie** budujemy tu Szafy z potworami: `regenerate()` tworzy scenę,
 * 51 kopii aktorów i 51 żetonów, a zasada tej warstwy brzmi „żadnych zmian
 * w świecie, które przetrwają test". To, co zostaje, i tak niesie całą prawdę,
 * o którą chodzi — bo prawdą jest tu plik, nie scena.
 *
 * Czego pilnujemy i dlaczego akurat tego:
 *
 *  - **Każda istota musi mieć wpis w pliku.** Skala żetonu ma jedno źródło
 *    (`PLAN_monster_closet.md` §7, wariant (b)): builder czyta plik i nic więcej.
 *    Zaleta — jedno miejsce; koszt — **nowa istota w Bestiariuszu ląduje na 1,0
 *    po cichu**. Build to wypisuje, ale wypisuje dużo. To jest ten jeden test,
 *    który sprawia, że wariant (b) jest bezpieczny, a nie tylko wygodny.
 *  - **Plik nie może mieć wpisów-widm.** Literówka w id albo istota usunięta
 *    z Bestiariusza zostawia linijkę, która nigdy się nie zastosuje — i wygląda
 *    przy tym dokładnie jak wpis działający.
 *  - **Pack musi zgadzać się z plikiem.** Najczęstsza pomyłka w tym obiegu:
 *    poprawiłeś plik i nie uruchomiłeś `npm run build:bestiary`. Kompendium
 *    wozi wtedy stare skale, Szafa pokazuje stare skale i wszystko wygląda
 *    na zepsute, choć popsuta jest tylko kolejność kroków.
 *  - **Skala dodatnia.** `scaleX: 0` rysuje nic — żeton jest, da się go
 *    zaznaczyć, grafiki nie ma i nie ma też błędu w konsoli.
 *  - **Wzorce dnd5e muszą istnieć i mieć footprint zgodny z rozmiarem.**
 *    Wzorzec przy `scaleX ≠ 1` albo o złym footprincie nie jest wzorcem —
 *    kłamie o tym, jak wygląda poprawnie skadrowany żeton.
 */

import { characterClosetApi, artKind } from "../dev/character-closet.mjs";
import { SIZES } from "../dev/token-sizes.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const OVERRIDES = `modules/${MODULE_ID}/tokens/scale-overrides.json`;
const TOKEN_SIZE = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };

export function registerTokenScaleTests(quench) {
  quench.registerBatch(`${MODULE_ID}.skala-zetonow`, context => {
    const { describe, it, expect, before } = context;

    let overrides = null;
    let creatures = [];

    before(async function () {
      const res = await fetch(`${OVERRIDES}?v=${Date.now()}`);
      const raw = res.ok ? await res.json() : {};
      overrides = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("//")));

      const pack = game.packs.get(`${MODULE_ID}.bestiariusz`);
      const docs = pack ? await pack.getDocuments() : [];
      creatures = docs.map(actor => ({
        actor,
        id: actor.getFlag(MODULE_ID, "bestiary.id"),
        size: actor.system.traits.size,
        scale: actor.prototypeToken.texture.scaleX
      }));
    });

    /* -------------------------------------------- */

    describe("tokens/scale-overrides.json", function () {

      it("plik istnieje i ma wpisy", function () {
        expect(Object.keys(overrides).length).to.be.greaterThan(0);
      });

      it("każda istota Bestiariusza ma wpis", function () {
        const missing = creatures.filter(c => c.id && !(c.id in overrides)).map(c => c.id);
        expect(missing, `bez wpisu — uzupełnij: npm run seed:token-scales`).to.deep.equal([]);
      });

      it("nie ma wpisów dla istot, których nie ma w packu", function () {
        const known = new Set(creatures.map(c => c.id));
        const ghosts = Object.keys(overrides).filter(id => !known.has(id));
        expect(ghosts, "wpisy-widma w scale-overrides.json").to.deep.equal([]);
      });

      it("każda wartość jest liczbą dodatnią", function () {
        for (const [id, value] of Object.entries(overrides)) {
          expect(Number.isFinite(Number(value)), `${id} = ${value}`).to.equal(true);
          expect(Number(value), id).to.be.greaterThan(0);
        }
      });

      it("żadna skala nie jest absurdalna (0,25–2,5)", function () {
        // Nie reguła, tylko siatka bezpieczeństwa na przestawiony przecinek:
        // 0,081 zamiast 0,81 daje żeton o jednym pikselu, i to bez błędu.
        const odd = Object.entries(overrides)
          .filter(([, v]) => Number(v) < 0.25 || Number(v) > 2.5)
          .map(([id, v]) => `${id}=${v}`);
        expect(odd).to.deep.equal([]);
      });
    });

    /* -------------------------------------------- */

    describe("kompendium zgadza się z plikiem", function () {

      it("prototypeToken.texture.scaleX == wartość z pliku", function () {
        const drift = creatures
          .filter(c => c.id && c.id in overrides)
          .filter(c => Math.abs(c.scale - Number(overrides[c.id])) > 1e-6)
          .map(c => `${c.id}: pack ${c.scale} ≠ plik ${overrides[c.id]}`);
        expect(drift, "przebuduj pack: npm run build:bestiary (Foundry zamknięte)").to.deep.equal([]);
      });

      it("scaleX == scaleY (skalowanie jest jednorodne)", function () {
        const skewed = creatures
          .filter(c => c.actor.prototypeToken.texture.scaleX !== c.actor.prototypeToken.texture.scaleY)
          .map(c => c.id);
        expect(skewed, "nierówne osie zniekształcają sylwetkę").to.deep.equal([]);
      });
    });

    /* -------------------------------------------- */

    describe("wzorce dnd5e w Szafie z potworami", function () {

      it("tabela pokrywa wszystkie rozmiary, których używa Bestiariusz", function () {
        const used = [...new Set(creatures.map(c => c.size))];
        for (const size of used) expect(SIZES, size).to.have.property(size);
      });

      it("footprint w tabeli zgadza się z rozmiarem żetonu w dnd5e", function () {
        for (const [size, entry] of Object.entries(SIZES)) {
          expect(entry.footprint, `footprint ${size}`).to.equal(TOKEN_SIZE[size]);
        }
      });

      it("każdy rozmiar ma wzorzec z docelowym wypełnieniem i zmierzonym kadrem", function () {
        for (const [size, entry] of Object.entries(SIZES)) {
          expect(entry.target, `cel ${size}`).to.be.within(0.1, 1);
          expect(entry.ref?.name, `nazwa wzorca ${size}`).to.be.a("string").and.not.empty;
          expect(entry.ref?.fill, `kadr wzorca ${size}`).to.be.within(0.1, 1);
        }
      });

      it("plik graficzny każdego wzorca istnieje", async function () {
        for (const [size, entry] of Object.entries(SIZES)) {
          const res = await fetch(foundry.utils.getRoute(entry.ref.src), { method: "HEAD" });
          expect(res.ok, `${size}: ${entry.ref.src}`).to.equal(true);
        }
      });

      it("wzorzec jest istotą dnd5e o tym rozmiarze, przy scaleX == 1", async function () {
        // Wzorzec ma pokazywać, jak wygląda poprawnie skadrowany żeton BEZ skalowania.
        // Hill Giant (scaleX 1,66) i Ancient Red Dragon (width 13, scaleX 3) odpadły
        // właśnie tu — dnd5e używa skali swobodnie, więc wzorzec trzeba wybrać danymi.
        const pack = game.packs.get("dnd5e.monsters");
        if (!pack) return this.skip();
        // Sześć dokumentów z nazwy, nie `getDocuments()` na całym packu: tamto
        // wczytuje 331 aktorów i wychodzi za domyślny limit 2 s Quencha.
        this.timeout(15000);
        for (const [size, entry] of Object.entries(SIZES)) {
          const hit = pack.index.find(e => e.name === entry.ref.name);
          expect(hit, `${size}: brak istoty "${entry.ref.name}" w dnd5e.monsters`).to.exist;
          const doc = await pack.getDocument(hit._id);
          expect(doc.prototypeToken.texture.src, `${size}: grafika wzorca`).to.equal(entry.ref.src);
          expect(doc.system.traits.size, `${size}: rozmiar wzorca`).to.equal(size);
          expect(doc.prototypeToken.texture.scaleX, `${size}: scaleX wzorca`).to.equal(1);
          expect(doc.prototypeToken.width, `${size}: footprint wzorca`).to.equal(TOKEN_SIZE[size]);
        }
      });
    });

    /* -------------------------------------------- */

    describe("Szafa z postaciami — klasyfikacja aktorów świata", function () {

      let audit = null;

      before(async function () {
        this.timeout(20000);
        audit = await characterClosetApi.report();
      });

      it("każdy aktor świata trafia do dokładnie jednego pasma", function () {
        // To jest niezmiennik całego pomysłu „listuj wszystko, nie wybieraj":
        // jeśli suma pasm nie równa się liczbie aktorów, ktoś wypadł po cichu,
        // a scena przestaje być audytem, którym ma być.
        const summed = Object.values(audit.summary.counts).reduce((a, b) => a + b, 0);
        expect(summed, "suma pasm").to.equal(audit.summary.actors);
      });

      it("pasma mają unikalne identyfikatory", function () {
        const ids = characterClosetApi.BANDS.map(b => b.id);
        expect(ids.length).to.equal(new Set(ids).size);
      });

      it("raport nie zna pasma spoza tabeli BANDS", function () {
        const known = new Set(characterClosetApi.BANDS.map(b => b.id));
        const unknown = Object.keys(audit.summary.counts).filter(id => !known.has(id));
        expect(unknown).to.deep.equal([]);
      });

      it("żaden aktor kampanii nie nosi flagi sceny kalibracyjnej", function () {
        // Szafa z postaciami stawia żetony PRAWDZIWYCH postaci na scenie, którą
        // odtworzenie czyści. Flaga na aktorze plus brak `disposable` to jedyne,
        // co dzieli je od skasowania — a flagi tu w ogóle być nie powinno.
        const flagged = game.actors
          .filter(a => a.getFlag(MODULE_ID, "testScene.id")
            && a.getFlag(MODULE_ID, "testScene.disposable") !== true)
          .map(a => a.name);
        expect(flagged, "aktorzy z flagą sceny bez disposable").to.deep.equal([]);
      });

      it("kadr z Roll20 rozpoznawany dokładnie, nie po prefiksie", function () {
        // `token.png` to wycinek z Roll20; `token_2D.png` (Alan) i
        // `Token_Lafitte_2D.png` to grafika dorobiona ręcznie, leżąca w tym
        // samym katalogu. Luźniejszy wzorzec wrzucał obie do „do wymiany".
        const fake = src => ({ prototypeToken: { texture: { src } } });
        const base = "worlds/output/characters/007_-_Alan";
        expect(artKind(fake(`${base}/token.png`)), "wycinek").to.equal("roll20");
        expect(artKind(fake(`${base}/token.webp`)), "wycinek webp").to.equal("roll20");
        expect(artKind(fake(`${base}/token_2D.png`)), "art Alana").to.equal("art");
        expect(artKind(fake(`${base}/Token_Lafitte_2D.png`)), "art Laffitte'a").to.equal("art");
        expect(artKind(fake("icons/svg/mystery-man.svg")), "brak grafiki").to.equal("none");
        expect(artKind(fake("")), "pusty src").to.equal("none");
        expect(artKind(fake("systems/dnd5e/tokens/humanoid/Bandit.webp")), "grafika dnd5e").to.equal("art");
      });

      it("pasmo odnośnikowe to wyłącznie postacie z grafiką", function () {
        for (const entry of characterClosetApi.partyReference()) {
          const actor = game.actors.getName(entry.name);
          expect(actor, entry.name).to.exist;
          expect(actor.type, entry.name).to.equal("character");
          expect(artKind(actor), entry.name).to.equal("art");
          expect(entry.scale, `${entry.name} skala`).to.be.greaterThan(0);
          expect(SIZES, `${entry.name} rozmiar`).to.have.property(entry.size);
        }
      });
    });
  });
}
