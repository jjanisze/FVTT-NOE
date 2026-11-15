/**
 * Neuroshima 5e — przejścia między poziomami sceny (FoundryVTT v14 Levels).
 *
 * Schody to rdzeniowy `teleportToken`, drabiny `changeLevel`, spadanie robi dnd5e 6 (podłogi jako
 * `defineSurface`, status Spadanie, karta obrażeń po kliknięciu MG). Ten plik dokłada to, czego
 * żadne z nich nie ma:
 *
 * ## Trudne przejście (`neuroshima-2026-overrides.trudnePrzejscie`)
 *
 * Region na krawędzi: zerwany bieg schodów, połamana drabina, balustrada nad wyrwą. Token, który
 * w niego wejdzie, zatrzymuje się i trzeba zdecydować, co dalej:
 *
 * - **tryb `auto`** — gracz dostaje okno z opisem i ST. Rzut umiejętnością (domyślnie Atletyka):
 *   sukces przenosi na drugą stronę (region przybycia na innym poziomie), porażka w dół też
 *   przenosi, ale z kartą obrażeń od upadku (`fallFormula`, karta jak spadanie dnd5e — MG nakłada
 *   z tacy, Osteoporoza i Powalenie działają); porażka w górę zostawia na miejscu z tą samą kartą.
 *   Region z liną (`roped`) przepuszcza bez rzutu.
 * - **tryb `gm`** — ruch staje, a prowadzący (nie gracz) dostaje okno: „Bez obrażeń”, „Z obrażeniami”
 *   (formuła do poprawienia) albo „Zostaje”. Z progami wagi (`weightTiers`, szyb ewakuacyjny) MG
 *   wybiera próg, moduł rzuca rzut obronny ZRC i wystawia kartę — złamane szczeble podnoszą ST
 *   kolejnym (licznik wspólny dla obu końców drabiny, MG zeruje go w konfiguracji regionu).
 *
 * Zatrzymanie i zgoda jak w rdzeniowym `changeLevel`: rozstrzyga klient poruszającego. Przeniesienie
 * jest teleportem w obrębie sceny (ruch `displace`), więc ląduje na podłodze docelowej i nie
 * odpala innych regionów po drodze.
 *
 * Z `crawl` (kanał wentylacyjny) okno pyta o prędkość czołgania: bardzo powoli / połowa / pełna,
 * każda z własnym ST. Porażka to utknięcie na turę, bez obrażeń; duże istoty się nie mieszczą.
 *
 * ## Strefa skażenia (`neuroshima-2026-overrides.strefaSkazenia`) i skok (`….skok`)
 *
 * Szlam, kałuża chemii, wyciek: wejście w strefę wystawia MG szeptaną kartę z guzikiem RO KON
 * (`conditions.radiationSave`, ST z konfiguracji). Trudny teren daje osobne zachowanie dnd5e.
 * Kładka (`bridged`, API `kladka`) wycisza strefę i skoki — gracze ułożyli przejście z gratów.
 *
 * Skok leży na pierwszym rzędzie strefy od strony odbicia. Wejście w niego w kierunku `dir`
 * zatrzymuje ruch i otwiera okno ze wspólnym kalkulatorem skoku (`combat/skok.mjs`, M8 §4.5 E3):
 * zasięg NOE z rozbiegiem i z miejsca, rozbieg zaznaczony, gdy tuż przed wejściem było ≥ 3 m zwykłego
 * ruchu (z dystansu, także z wcześniejszych dragów — bez wymogu prostej linii). Bez testu za brakujący
 * zasięg i bez marginesu porażki (dawne ST 10/15 nie miały oparcia w RAW). Doskok — lądowisko (`land`);
 * za krótki — token ląduje w tym polu szczeliny, do którego sięga skok (bez zaokrąglania w górę), z kartą
 * strefy i testem lądowania na trudnym terenie. Koszt skoku 1:1 trafia do zapisu ruchu M8.
 * „Wejdź” — karta i dalszy ruch, „Zostań” — z powrotem (`back`). Pola `short` i `dcFall` zostają w danych
 * (import z Tiled), ale miejsce lądowania liczy się z zasięgu.
 *
 * ## „Opuść bezpiecznie”
 *
 * Przycisk w HUD tokenu (tylko MG) przy tokenach ze Spadaniem: przenosi na najbliższą podłogę
 * niżej ruchem „wspinaczka” — dnd5e zdejmuje Spadanie, karty obrażeń nie ma. Kontrolowane
 * zejście, lina, poduszki, cokolwiek MG uzna. Działa na każdej scenie z podłogami.
 *
 * ## Obejście błędu rdzenia 14.369
 *
 * `RegionDocument#polygonTree` to leniwy getter, ale prywatne `#testSamples` czyta pole wprost.
 * Ruch ze zmianą wysokości (spadanie, przejście między poziomami) przez region, którego drzewa
 * nikt wcześniej nie zbudował, kończy się `Cannot read properties of undefined (reading
 * 'testPoint')` i token nie spada. Przed każdym `segmentizeMovementPath` budujemy drzewo przez
 * getter — tanie i bez skutków ubocznych.
 */

import { metry } from "../config/ekonomia-data.mjs";
import { ROZBIEG_M, skokPrzezSzczeline } from "../config/skok-data.mjs";
import { zasiegi, rozbiegPrzed, trudnyTerenPod, zaplacSkok, kartaLadowania } from "../combat/skok.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TYP = `${MODULE_ID}.trudnePrzejscie`;
const escapeHTML = s => foundry.utils.escapeHTML(String(s ?? ""));
const ZAPYTANIE_MG = `${MODULE_ID}.przejscieMG`;

/** Progi wagi szybu ewakuacyjnego (HANDOFF par. 4.5 — zatwierdzone przez MG). */
const PROGI_WAGI = Object.freeze([
  { id: "lekki", label: "do 80 kg", opis: "szczeble trzymają", st: null, kosci: null, szczeble: 0 },
  { id: "sredni", label: "81–100 kg", opis: "szczeble trzeszczą i się giną", st: 10, kosci: "1d6", szczeble: 0 },
  { id: "ciezki", label: "101–120 kg", opis: "pęka szczebel", st: 15, kosci: "2d6", szczeble: 1 },
  { id: "bardzoCiezki", label: "121–140 kg", opis: "pękają dwa szczeble", st: 18, kosci: "3d6", szczeble: 2 },
  { id: "odrywa", label: "ponad 140 kg / niesie kogoś", opis: "odrywa się odcinek drabiny", st: null, kosci: "spadek", szczeble: 0 }
]);
const ST_ZA_SZCZEBEL = 2;

/* -------------------------------------------- */
/*  Behaviour                                    */
/* -------------------------------------------- */

function utworzKlase() {
  const { RegionBehaviorType } = foundry.data.regionBehaviors;
  const f = foundry.data.fields;

  return class TrudnePrzejscie extends RegionBehaviorType {
    static defineSchema() {
      return {
        mode: new f.StringField({ required: true, initial: "auto", label: "Kto rozstrzyga",
          choices: { auto: "Rzut gracza (automatycznie)", gm: "Prowadzący" } }),
        skill: new f.StringField({ required: true, initial: "atl", label: "Umiejętność",
          hint: "Klucz umiejętności dnd5e (atl = Atletyka / Wspinaczka)." }),
        dc: new f.NumberField({ required: true, integer: true, min: 0, initial: 12, label: "ST" }),
        fallFormula: new f.StringField({ required: true, initial: "2d6", label: "Obrażenia przy porażce" }),
        destination: new f.DocumentUUIDField({ type: "Region", nullable: true, relative: true, relativize: true,
          label: "Region po drugiej stronie" }),
        roped: new f.BooleanField({ label: "Lina", hint: "Zabezpieczone liną: przejście bez rzutu i bez obrażeń." }),
        prompt: new f.StringField({ required: true, blank: true, initial: "", label: "Opis w oknie" }),
        weightTiers: new f.BooleanField({ label: "Progi wagi (szyb ewakuacyjny)" }),
        crawl: new f.BooleanField({ label: "Kanał (wybór prędkości)",
          hint: "Czołganie: bardzo powoli, połowa albo pełna szybkość — ST z tabeli kanału. Porażka = utknięcie na turę, bez obrażeń; duże istoty się nie mieszczą." }),
        brokenRungs: new f.NumberField({ required: true, integer: true, min: 0, initial: 0,
          label: "Złamane szczeble", hint: `Każdy podnosi ST kolejnym o ${ST_ZA_SZCZEBEL}.` })
      };
    }

    static events = {
      [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onTokenMoveIn
    };

    /** Region docelowy (przybycie po drugiej stronie). */
    get cel() {
      if (!this.destination) return null;
      const doc = fromUuidSync(this.destination, { relative: this.parent });
      return doc instanceof foundry.documents.RegionDocument ? doc : null;
    }

    static async #onTokenMoveIn(event) {
      const { token, movement } = event.data;
      if (!event.user.isSelf) return;
      const akcja = movement.passed.waypoints.at(-1)?.action;
      if (akcja === "displace" || akcja === "fall") return;   // przybycia teleportem i spadanie
      const cel = this.cel;
      if (!cel) {
        ui.notifications.warn("Trudne przejście bez regionu docelowego — ustaw go w konfiguracji regionu.");
        return;
      }
      token.pauseMovement();
      if (token.rendered && token.object.movementAnimationPromise) {
        await game.raceWithWindowHidden(token.object.movementAnimationPromise);
      }
      const wynik = this.mode === "gm"
        ? await game.users.activeGM?.query(ZAPYTANIE_MG, { behaviorUuid: this.parent.uuid, tokenUuid: token.uuid })
          ?? (ui.notifications.warn("Brak prowadzącego — przejście czeka."), null)
        : await przejdzAuto(this, token, cel);
      // Kto przeszedł na inny poziom, ten na niego patrzy (jak po rdzeniowych schodach).
      const nowy = token.parent.tokens.get(token.id);
      if (nowy && token.parent.isView && canvas.level?.id !== nowy._source.level && wynik?.przeniesiony) {
        await token.parent.view({ level: nowy._source.level, controlledTokens: [nowy.id] });
      }
    }
  };
}

/** Kierunek przejścia: w dół, gdy podstawa poziomu celu leży niżej. */
function wDol(token, cel) {
  const scene = token.parent;
  const z = scene.levels.get(token._source.level)?.elevation.base ?? 0;
  const lvl = cel._source.levels.at(0);
  const doc = lvl ? scene.levels.get(lvl)?.elevation.base ?? z : z;
  return doc < z;
}

function etykietaUmiejetnosci(klucz) {
  return CONFIG.DND5E.skills?.[klucz]?.label ?? klucz;
}

/**
 * Zostaje po tej stronie. Ruch, który przejście zatrzymało, stoi na krawędzi regionu — po skosie
 * albo pół pola przed jego środkiem — więc token staje na polu samego przejścia (przy wyrwie, w wylocie
 * kanału), nie między polami. Teleport to ruch `displace`, którego przejścia nie łapią.
 */
async function zostanNaPolu(token, region) {
  token.stopMovement();
  if (region) await region.teleportToken(token);
}

/** Kanał: prędkość czołgania → ST (decyzja MG D41: 13 / 16 / 19). */
const PREDKOSCI_KANALU = Object.freeze([
  { id: "powoli", label: "Bardzo powoli", st: 13 },
  { id: "polowa", label: "Połowa szybkości", st: 16 },
  { id: "pelna", label: "Pełna szybkość", st: 19 }
]);
const ZA_DUZI = new Set(["lg", "huge", "grg"]);

/** Kanał: okno prędkości, rzut; porażka = utknięcie na turę (bez obrażeń), duże istoty się nie mieszczą. */
async function przejdzKanalem(beh, token, cel) {
  const actor = token.actor;
  if (ZA_DUZI.has(actor?.system?.traits?.size)) {
    ui.notifications.info(`${token.name}: nie mieści się w kanale.`);
    await zostanNaPolu(token, beh.parent.parent);
    return { decyzja: "za-duzy" };
  }
  const um = etykietaUmiejetnosci(beh.skill);
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Kanał", icon: "fa-solid fa-fan" },
    content: `<p>${foundry.utils.escapeHTML(beh.prompt || "Przeczołgać się kanałem?")}</p>`
      + `<p>Im szybciej, tym trudniej. Porażka: utykasz na turę.</p>`,
    buttons: [
      ...PREDKOSCI_KANALU.map((p, i) => ({ action: p.id, label: `${p.label} — ${um} ST ${p.st}`, default: i === 0 })),
      { action: "zostan", label: "Zostań" }
    ],
    rejectClose: false
  });
  const p = PREDKOSCI_KANALU.find(x => x.id === wybor);
  if (!p || !actor) { await zostanNaPolu(token, beh.parent.parent); return { decyzja: "zostaje" }; }
  const rzuty = await actor.rollSkill({ skill: beh.skill, target: p.st });
  const rzut = Array.isArray(rzuty) ? rzuty[0] : rzuty;
  if (!rzut) { await zostanNaPolu(token, beh.parent.parent); return { decyzja: "przerwane" }; }
  if (rzut.total >= p.st) return { decyzja: p.id, przeniesiony: !!(await cel.teleportToken(token)) };
  await zostanNaPolu(token, beh.parent.parent);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token }),
    content: `<p>${foundry.utils.escapeHTML(token.name)} utyka w kanale (${um} ${rzut.total} < ST ${p.st}) — tura stracona.</p>` });
  return { decyzja: "utknal", przeniesiony: false };
}

/** Tryb auto: okno gracza, rzut, przeniesienie i karta przy porażce. */
async function przejdzAuto(beh, token, cel) {
  if (beh.crawl) return przejdzKanalem(beh, token, cel);
  const actor = token.actor;
  const um = etykietaUmiejetnosci(beh.skill);
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Trudne przejście", icon: "fa-solid fa-person-falling" },
    content: `<p>${foundry.utils.escapeHTML(beh.prompt || "Spróbować przejść?")}</p>`
      + (beh.roped ? `<p>Zabezpieczone liną — bez rzutu.</p>` : `<p>${um}, ST ${beh.dc}. Porażka: ${beh.fallFormula} obrażeń.</p>`),
    buttons: [
      { action: "idz", label: beh.roped ? "Po linie" : `Rzut: ${um} ST ${beh.dc}`, default: true },
      { action: "zostan", label: "Zostań" }
    ],
    rejectClose: false
  });
  if (wybor !== "idz") { await zostanNaPolu(token, beh.parent.parent); return { decyzja: "zostaje" }; }
  if (beh.roped || !actor) return { decyzja: "lina", przeniesiony: !!(await cel.teleportToken(token)) };

  const rzuty = await actor.rollSkill({ skill: beh.skill, target: beh.dc });
  const rzut = Array.isArray(rzuty) ? rzuty[0] : rzuty;
  if (!rzut) { await zostanNaPolu(token, beh.parent.parent); return { decyzja: "przerwane" }; }
  if (rzut.total >= beh.dc) return { decyzja: "sukces", przeniesiony: !!(await cel.teleportToken(token)) };
  if (wDol(token, cel)) {
    const po = await cel.teleportToken(token);
    await kartaUpadku(po ?? token, beh.fallFormula, `nieudane przejście (${um} ${rzut.total} < ST ${beh.dc})`);
    return { decyzja: "porazka", przeniesiony: true };
  }
  await kartaUpadku(token, beh.fallFormula, `nieudane przejście (${um} ${rzut.total} < ST ${beh.dc})`);
  await zostanNaPolu(token, beh.parent.parent);
  return { decyzja: "porazka", przeniesiony: false };
}

/**
 * Karta obrażeń od upadku o zadanej formule — jak dnd5e `postFallDamage`, tylko formuła zamiast
 * wysokości: flaga `dnd5e.context.fall` (Powalenie przy nałożeniu, Osteoporoza w `combat/falling.mjs`),
 * spadający na tacy celów. MG nakłada obrażenia sam.
 */
async function kartaUpadku(token, formula, opis) {
  if (!formula) return null;
  const { damageType } = CONFIG.DND5E.falling;
  const TargetsField = dnd5e.dataModels.chatMessage.fields.TargetsField;
  return CONFIG.Dice.DamageRoll.build({
    hookNames: ["damage"],
    rolls: [{ parts: [formula], options: { type: damageType, types: [damageType] } }]
  }, { configure: false }, {
    create: true,
    data: {
      flags: { dnd5e: { context: { fall: true } } },
      flavor: opis ? `Upadek — ${opis}` : "Upadek",
      speaker: ChatMessage.implementation.getSpeaker({ token }),
      system: { targets: TargetsField.getDescriptors([token]) },
      type: "damage"
    }
  });
}

/* -------------------------------------------- */
/*  Tryb MG                                      */
/* -------------------------------------------- */

/** Obsługa zapytania po stronie MG: okno decyzji, ruch i karta. Zwraca, co postanowiono. */
async function zapytanieMG({ behaviorUuid, tokenUuid }) {
  const behavior = await fromUuid(behaviorUuid);
  const token = await fromUuid(tokenUuid);
  if (!behavior || behavior.type !== TYP || !token) return null;
  const beh = behavior.system;
  const cel = beh.cel;
  if (!cel) return null;
  if (beh.weightTiers) return progiWagi(behavior, token, cel);

  const kierunek = wDol(token, cel) ? "schodzi" : "wspina się";
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: `Trudne przejście — ${token.name}`, icon: "fa-solid fa-person-falling" },
    content: `<p><strong>${foundry.utils.escapeHTML(token.name)}</strong> ${kierunek}: ${foundry.utils.escapeHTML(beh.prompt || "przejście")}</p>
      <div class="form-group"><label>Obrażenia</label><input type="text" name="formula" value="${beh.fallFormula}"></div>`,
    buttons: [
      { action: "bez", label: "Bez obrażeń", default: true },
      { action: "z", label: "Z obrażeniami", callback: (_e, b) => `z:${b.form.elements.formula.value}` },
      { action: "zostaje", label: "Zostaje" }
    ],
    rejectClose: false
  });
  if (!wybor || wybor === "zostaje") { await zostanNaPolu(token, behavior.parent); return { decyzja: "zostaje" }; }
  const po = await cel.teleportToken(token);
  if (String(wybor).startsWith("z:")) await kartaUpadku(po ?? token, wybor.slice(2), "przejście z obrażeniami (decyzja prowadzącego)");
  return { decyzja: wybor === "bez" ? "bez" : "z", przeniesiony: true };
}

/**
 * Zachowania tej samej drabiny na obu jej końcach: regiony z tą samą grupą w fladze `link`
 * eksportera (`D1:gora`, `D1:dol` → `D1`). Bez flagi — tylko ten jeden region.
 */
function obaKonce(behavior) {
  const region = behavior.parent;
  const grupa = String(region.getFlag(MODULE_ID, "link") ?? "").split(":")[0];
  if (!grupa) return [behavior];
  return region.parent.regions.contents
    .filter(r => String(r.getFlag(MODULE_ID, "link") ?? "").split(":")[0] === grupa)
    .flatMap(r => r.behaviors.filter(b => b.type === TYP));
}

/** Szyb ewakuacyjny: MG wybiera próg wagi (gracz podaje wagę z ekwipunkiem, D34), moduł rzuca ZRC. */
async function progiWagi(behavior, token, cel) {
  const beh = behavior.system;
  const plus = beh.brokenRungs * ST_ZA_SZCZEBEL;
  const kierunek = wDol(token, cel) ? "schodzi" : "wspina się";
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: `Szyb ewakuacyjny — ${token.name}`, icon: "fa-solid fa-ladder-water" },
    content: `<p><strong>${foundry.utils.escapeHTML(token.name)}</strong> ${kierunek}. Ile waży razem z ekwipunkiem?</p>
      <p>Złamane szczeble: ${beh.brokenRungs}${plus ? ` (+${plus} ST)` : ""}.</p>`,
    buttons: [
      ...PROGI_WAGI.map(p => ({ action: p.id, label: `${p.label}${p.st ? ` — ZRC ST ${p.st + plus}` : ""}` })),
      { action: "zostaje", label: "Zostaje" }
    ],
    rejectClose: false
  });
  const prog = PROGI_WAGI.find(p => p.id === wybor);
  if (!prog) { await zostanNaPolu(token, behavior.parent); return { decyzja: "zostaje" }; }
  if (prog.szczeble) {
    const ile = beh.brokenRungs + prog.szczeble;
    for (const b of obaKonce(behavior)) await b.update({ "system.brokenRungs": ile });
  }
  const po = await cel.teleportToken(token);
  if (prog.kosci === "spadek") {
    // Odrywa się odcinek: spada z pozostałej wysokości — MG wpisuje formułę.
    const formula = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Oderwany odcinek drabiny" },
      content: `<div class="form-group"><label>Obrażenia (pozostała wysokość, 1k6 / 1,5 m)</label>
        <input type="text" name="formula" value="3d6"></div>`,
      ok: { label: "Karta", callback: (_e, b) => b.form.elements.formula.value }
    }).catch(() => null);
    if (formula) await kartaUpadku(po ?? token, formula, "oderwany odcinek drabiny");
    return { decyzja: prog.id, przeniesiony: true };
  }
  if (prog.st && token.actor) {
    // Źródło „upadek” — Ułatwienia ze zdolności (Człowiek-pająk, Zabezpieczenie; PLAN_m7 §3.0.3).
    const rzuty = await token.actor.rollSavingThrow({ ability: "dex", target: prog.st + plus, neuroKontekst: ["upadek"] });
    const rzut = Array.isArray(rzuty) ? rzuty[0] : rzuty;
    if (rzut && rzut.total < prog.st + plus) await kartaUpadku(po ?? token, prog.kosci, `${prog.opis}, zsuwa się`);
  }
  return { decyzja: prog.id, przeniesiony: true };
}

/* -------------------------------------------- */
/*  Strefa skażenia i skok przez nią             */
/* -------------------------------------------- */

const TYP_STREFA = `${MODULE_ID}.strefaSkazenia`;
const TYP_SKOK = `${MODULE_ID}.skok`;
const FLAGA_KARTY = "strefaSkazenia";
const KIERUNKI = Object.freeze({ N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] });

function utworzKlasyStref() {
  const { RegionBehaviorType } = foundry.data.regionBehaviors;
  const f = foundry.data.fields;

  class StrefaSkazenia extends RegionBehaviorType {
    static defineSchema() {
      return {
        dc: new f.NumberField({ required: true, integer: true, min: 0, initial: 15, label: "ST (wejście)" }),
        dcFall: new f.NumberField({ required: true, integer: true, min: 0, initial: 20, label: "ST (upadek twarzą)" }),
        label: new f.StringField({ required: true, blank: true, initial: "skażenie", label: "Nazwa w karcie" }),
        bridged: new f.BooleanField({ label: "Kładka", hint: "Przejście ułożone z gratów: bez rzutów, bez skoku." })
      };
    }

    static events = { [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onTokenMoveIn };

    static async #onTokenMoveIn(event) {
      if (!event.user.isSelf || this.bridged) return;
      const akcja = event.data.movement.passed.waypoints.at(-1)?.action;
      if (akcja === "displace" || akcja === "fall") return;   // skok i teleport same wystawiają kartę
      if (skokPrzejmuje(event.data.token, event.data.movement, this.parent.parent)) return;
      await kartaStrefy(event.data.token, this, this.dc, "wchodzi w");
    }
  }

  class Skok extends RegionBehaviorType {
    static defineSchema() {
      return {
        gap: new f.NumberField({ required: true, integer: true, min: 1, initial: 3, label: "Szerokość (pola)" }),
        dir: new f.StringField({ required: true, initial: "S", label: "Kierunek skoku",
          choices: { N: "na północ", S: "na południe", E: "na wschód", W: "na zachód" } }),
        land: new f.DocumentUUIDField({ type: "Region", nullable: true, relative: true, relativize: true, label: "Lądowisko" }),
        short: new f.DocumentUUIDField({ type: "Region", nullable: true, relative: true, relativize: true, label: "Krótki skok" }),
        back: new f.DocumentUUIDField({ type: "Region", nullable: true, relative: true, relativize: true, label: "Powrót" }),
        hazard: new f.DocumentUUIDField({ type: "Region", nullable: true, relative: true, relativize: true, label: "Strefa" })
      };
    }

    static events = { [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onTokenMoveIn };

    region(pole) {
      if (!this[pole]) return null;
      const doc = fromUuidSync(this[pole], { relative: this.parent });
      return doc instanceof foundry.documents.RegionDocument ? doc : null;
    }

    get strefa() {
      return this.region("hazard")?.behaviors.find(b => b.type === TYP_STREFA)?.system ?? null;
    }

    static async #onTokenMoveIn(event) {
      const { token, movement } = event.data;
      if (!event.user.isSelf) return;
      const akcja = movement.passed.waypoints.at(-1)?.action;
      if (akcja === "displace" || akcja === "fall") return;
      if (this.strefa?.bridged) return;                       // kładka: zwykłe przejście
      if (!zgodnyKierunek(movement, this.dir)) return;         // brodzi w drugą stronę
      const klucz = this.parent.uuid;
      token.pauseMovement(klucz);
      const wznow = () => token.resumeMovement(movement.id, klucz);
      if (token.rendered && token.object.movementAnimationPromise) {
        await game.raceWithWindowHidden(token.object.movementAnimationPromise);
      }
      await skocz(this, token, movement, wznow);
    }
  }

  return { StrefaSkazenia, Skok };
}

/** Punkty przebytej drogi: start ruchu i kolejne punkty aż do miejsca wejścia. */
function droga(movement) {
  return [movement.origin, ...movement.passed.waypoints].filter(Boolean);
}

/** Ostatni krok ruchu idzie w kierunku skoku (brodzący w drugą stronę nie dostaje okna). */
function zgodnyKierunek(movement, dir) {
  const [dx, dy] = KIERUNKI[dir] ?? [0, 0];
  const pts = droga(movement);
  const a = pts.at(-2), b = pts.at(-1);
  if (!a || !b) return true;
  return (b.x - a.x) * dx + (b.y - a.y) * dy > 0;
}

/** Skok z tej strefy czeka na token w miejscu, do którego doszedł — wtedy kartę wystawia skok. */
function skokPrzejmuje(token, movement, strefaRegion) {
  const w = movement.passed.waypoints.at(-1);
  if (!w) return false;
  const punkt = { ...token.getCenterPoint(w), elevation: w.elevation ?? token.elevation };
  return strefaRegion.parent.regions.contents.some(r => r.behaviors.some(b => b.type === TYP_SKOK && !b.disabled
    && b.system.region("hazard")?.id === strefaRegion.id && zgodnyKierunek(movement, b.system.dir))
    && r.testPoint(punkt));
}

/** Metry po polsku: „4,5 m”, „4,2 m”, „3,9 m”. */
const wMetrach = v => `${metry(v)} m`;

/**
 * Pole w szczelinie, w którym kończy się za krótki skok: `k`-te pole od krawędzi odbicia (1 = pierwsze).
 * Krawędź to brzeg Regionu skoku (pierwszy rząd strefy) od strony, z której przyszedł token; współrzędna
 * w poprzek — z punktu wejścia, dociągnięta do siatki (wejście po skosie staje między polami).
 */
function poleWSzczelinie(token, regionSkoku, dir, k, wejscie) {
  const G = token.parent.grid.size;
  const b = regionSkoku.bounds;
  const w = token.width * G, h = token.height * G;
  const snap = v => Math.round(v / G) * G;
  const x = snap(wejscie?.x ?? token.x), y = snap(wejscie?.y ?? token.y);
  const elevation = wejscie?.elevation ?? token.elevation;
  switch (dir) {
    case "N": return { x, y: b.bottom - (k - 1) * G - h, elevation };
    case "E": return { x: b.left + (k - 1) * G, y, elevation };
    case "W": return { x: b.right - (k - 1) * G - w, y, elevation };
    default: return { x, y: b.top + (k - 1) * G, elevation };
  }
}

/**
 * Skok przez szczelinę (M8 §4.5, E3) — wspólny kalkulator `combat/skok.mjs`. Bez testu za brakujący zasięg i bez
 * marginesu porażki; doskok → lądowisko, za krótki → pole szczeliny, do którego sięga skok. Koszt skoku 1:1 do
 * zapisu tego ruchu (ten sam id — natywne Undo zwraca też skok). Istota bez ludzkiego wzoru: deklaracja przy stole.
 */
async function skocz(beh, token, movement, wznow) {
  const actor = token.actor;
  const pole = token.parent.grid.distance ?? 1.5;
  const szczelina = beh.gap * pole;
  const nazwaStrefy = beh.strefa?.label ?? "strefę";
  const rozbiegM = rozbiegPrzed(token, movement);
  const z = actor ? zasiegi(actor) : { reczny: "brak aktora — rozstrzygnij przy stole" };
  const wynik = r => skokPrzezSzczeline(szczelina, (r ? z.zRozbiegu : z.zMiejsca).dal, pole);
  const opis = r => {
    const zz = r ? z.zRozbiegu : z.zMiejsca, s = wynik(r);
    return `${r ? "Z rozbiegu" : "Z miejsca"}: zasięg ${wMetrach(zz.dal)} (${escapeHTML(zz.wzorDal)}) — `
      + (s.doskakuje ? "doskakuje" : `nie doskoczy, ląduje w ${s.polaWglab}. polu szczeliny`);
  };
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Skok", icon: "fa-solid fa-person-running" },
    content: `<p>Szczelina ${wMetrach(szczelina)} (${beh.gap} ${beh.gap === 1 ? "pole" : beh.gap < 5 ? "pola" : "pól"}).</p>`
      + (z.reczny ? `<p>${escapeHTML(actor?.name ?? "")}: ${escapeHTML(z.reczny)}. „Skocz” — doskakuje (deklaracja przy stole).</p>`
        : `<p>${opis(true)}<br>${opis(false)}</p>`)
      + `<div class="form-group"><label>Rozbieg — co najmniej 3 m zwykłego ruchu tuż przed skokiem (teraz ${wMetrach(rozbiegM)})</label>`
      + `<input type="checkbox" name="rozbieg" ${rozbiegM >= ROZBIEG_M ? "checked" : ""}></div>`,
    buttons: [
      { action: "skok", label: "Skocz", default: true, callback: (_e, b) => b.form.elements.rozbieg.checked ? "skok+" : "skok" },
      { action: "wejdz", label: `Wejdź w ${nazwaStrefy}` },
      { action: "zostan", label: "Zostań" }
    ],
    rejectClose: false
  });
  if (wybor === "wejdz") {                                       // brodzi: karta teraz, strefa milczy (już w niej jest)
    const strefa = beh.strefa;
    if (strefa) await kartaStrefy(token, strefa, strefa.dc, "wchodzi w");
    wznow();
    return;
  }
  if (!String(wybor ?? "").startsWith("skok")) {
    const wroc = beh.region("back");
    if (wroc) await wroc.teleportToken(token); else token.stopMovement();
    return;
  }
  const s = z.reczny ? { doskakuje: true, dlugosc: szczelina, polaWglab: 0 } : wynik(wybor === "skok+");
  const strefa = beh.strefa;
  if (s.doskakuje) {
    const cel = beh.region("land");
    const po = cel ? await cel.teleportToken(token) : null;
    await zaplacSkok(token, movement.id, s.dlugosc);
    const t = po ?? token;
    if (trudnyTerenPod(t, { x: t.x, y: t.y, elevation: t.elevation })) await kartaLadowania(t);
    return;
  }
  // Za krótki: ląduje tam, dokąd sięga skok — w szczelinie (strefa i jej trudny teren).
  token.stopMovement();
  const cel = poleWSzczelinie(token, beh.parent.parent, beh.dir, s.polaWglab, movement.passed.waypoints.at(-1));
  await token.move({ ...cel, action: "displace" }, { animate: false });
  await zaplacSkok(token, movement.id, s.dlugosc);
  if (strefa) await kartaStrefy(token, strefa, strefa.dc, "ląduje w");
  if (trudnyTerenPod(token, cel)) await kartaLadowania(token);
}


/** Karta dla MG: kto i w co wszedł, guzik rzutu obronnego (RO KON przez `radiationSave`). */
async function kartaStrefy(token, strefa, dc, jak) {
  const actor = token.actor;
  if (!actor) return null;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<p><strong>${foundry.utils.escapeHTML(token.name)}</strong> ${jak} ${foundry.utils.escapeHTML(strefa.label)}.</p>
      <p><button type="button" data-akcja="strefa-ro"><i class="fa-solid fa-radiation"></i> RO KON ST ${dc}</button></p>`,
    flags: { [MODULE_ID]: { [FLAGA_KARTY]: { actorUuid: actor.uuid, dc } } }
  });
}

function _onRenderKarty(message, html) {
  const dane = message.getFlag(MODULE_ID, FLAGA_KARTY);
  if (!dane) return;
  const btn = html.querySelector?.('[data-akcja="strefa-ro"]');
  if (!btn) return;
  if (!game.user.isGM) { btn.disabled = true; return; }
  btn.addEventListener("click", async ev => {
    ev.preventDefault();
    const actor = await fromUuid(dane.actorUuid);
    if (actor) await game.neuroshima.conditions.radiationSave(actor, dane.dc);
  });
}

/** Kładka na strefie (MG): przejście bez rzutów i bez okna skoku. Pominięte `jest` = przełącz. */
async function kladka(regionId, jest, scene = canvas?.scene) {
  const b = scene?.regions.get(regionId)?.behaviors.find(x => x.type === TYP_STREFA);
  if (!b) return null;
  const bridged = jest === undefined ? !b.system.bridged : !!jest;
  await b.update({ "system.bridged": bridged });
  return bridged;
}

/* -------------------------------------------- */
/*  Opuść bezpiecznie                            */
/* -------------------------------------------- */

/** Przenosi token na podłogę pod nim ruchem „wspinaczka” — bez karty, dnd5e zdejmuje Spadanie. */
export async function opuscBezpiecznie(tokenDoc) {
  const powierzchnia = tokenDoc._findSupportingSurface?.();
  if (!powierzchnia || powierzchnia.elevation >= tokenDoc.elevation) {
    ui.notifications.info(`${tokenDoc.name}: pod tokenem nie ma niższej podłogi.`);
    return false;
  }
  const cel = { x: tokenDoc._source.x, y: tokenDoc._source.y, elevation: powierzchnia.elevation, action: "climb" };
  if (powierzchnia.level && powierzchnia.level.id !== tokenDoc._source.level) cel.level = powierzchnia.level.id;
  // `neuroBezWspinaczki`: kontrolowane zejście, nie wspinaczka z testem (`scenes/wspinaczka.mjs`).
  await tokenDoc.move(cel, { constrainOptions: { ignoreWalls: true }, neuroBezWspinaczki: true });
  return true;
}

function _onRenderTokenHUD(hud, html) {
  if (!game.user.isGM) return;
  const doc = hud.document ?? hud.object?.document;
  if (!doc?.actor?.statuses?.has("falling")) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const kol = root?.querySelector(".col.left");
  if (!kol || kol.querySelector(".neuro-opusc-hud")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon neuro-opusc-hud";
  btn.dataset.tooltip = "Opuść bezpiecznie — na podłogę niżej, bez obrażeń";
  btn.innerHTML = `<i class="fa-solid fa-parachute-box" inert></i>`;
  btn.addEventListener("click", async ev => {
    ev.preventDefault(); ev.stopPropagation();
    const docs = canvas.tokens.controlled.map(t => t.document).filter(d => d.actor?.statuses.has("falling"));
    for (const d of docs.length ? docs : [doc]) await opuscBezpiecznie(d);
  });
  kol.append(btn);
}

/* -------------------------------------------- */
/*  API                                          */
/* -------------------------------------------- */

const RODZAJE = new Set(["teleportToken", "changeLevel", TYP, TYP_SKOK]);

/** Przejścia na bieżącej scenie: schody, drabiny, trudne przejścia — ze stanem. */
function przejscia(scene = canvas?.scene) {
  if (!scene) return [];
  return scene.regions.contents.flatMap(r => r.behaviors.filter(b => RODZAJE.has(b.type)).map(b => ({
    region: r.id, nazwa: r.name, rodzaj: b.type === TYP ? "trudnePrzejscie" : b.type,
    poziomy: [...r.levels], wylaczone: b.disabled,
    ...(b.type === TYP ? { tryb: b.system.mode, st: b.system.dc, lina: b.system.roped, szczeble: b.system.brokenRungs } : {})
  })));
}

/** Włącza/wyłącza przejście (zaklinowany właz, zawalone schody). Pominięte `wlacz` = przełącz. */
async function przelacz(regionId, wlacz, scene = canvas?.scene) {
  const region = scene?.regions.get(regionId);
  const b = region?.behaviors.find(x => RODZAJE.has(x.type));
  if (!b) return null;
  const disabled = wlacz === undefined ? !b.disabled : !wlacz;
  await b.update({ disabled });
  return !disabled;
}

/** Lina na trudnym przejściu (przejście bez rzutu). Pominięte `jest` = przełącz. */
async function lina(regionId, jest, scene = canvas?.scene) {
  const b = scene?.regions.get(regionId)?.behaviors.find(x => x.type === TYP);
  if (!b) return null;
  const roped = jest === undefined ? !b.system.roped : !!jest;
  await b.update({ "system.roped": roped });
  return roped;
}

export const transitionsApi = { przejscia, przelacz, lina, kladka, opuscBezpiecznie };

/** Czyste funkcje skoku wystawione dla testów Quench (`scripts/tests/poziomy.test.mjs`). */
export const __testing = Object.freeze({ zgodnyKierunek, poleWSzczelinie });

/* -------------------------------------------- */
/*  Rejestracja (init)                           */
/* -------------------------------------------- */

function obejdzBladDrzewaRegionow() {
  const proto = foundry.documents.RegionDocument.prototype;
  if (proto.segmentizeMovementPath.__neuroshimaPolygonTree) return;
  const oryginal = proto.segmentizeMovementPath;
  const owiniety = function (...args) {
    void this.polygonTree;                 // buduje #polygonTree, które #testSamples czyta wprost
    return oryginal.apply(this, args);
  };
  owiniety.__neuroshimaPolygonTree = true;
  owiniety.__oryginal = oryginal;          // test-kanarek: czy rdzeń dalej ma ten błąd
  proto.segmentizeMovementPath = owiniety;
}

export function registerTransitions() {
  obejdzBladDrzewaRegionow();
  CONFIG.RegionBehavior.dataModels[TYP] = utworzKlase();
  CONFIG.RegionBehavior.typeIcons[TYP] = "fa-solid fa-person-falling";
  const { StrefaSkazenia, Skok } = utworzKlasyStref();
  CONFIG.RegionBehavior.dataModels[TYP_STREFA] = StrefaSkazenia;
  CONFIG.RegionBehavior.typeIcons[TYP_STREFA] = "fa-solid fa-radiation";
  CONFIG.RegionBehavior.dataModels[TYP_SKOK] = Skok;
  CONFIG.RegionBehavior.typeIcons[TYP_SKOK] = "fa-solid fa-person-running";
  CONFIG.queries[ZAPYTANIE_MG] = zapytanieMG;
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
  Hooks.on("renderChatMessageHTML", _onRenderKarty);
  console.log(`${MODULE_ID} | Przejścia między poziomami gotowe`);
}
