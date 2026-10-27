/**
 * Neuroshima 5e — obiekty: „fizyczność na żądanie” (PLAN_m6_drobne_zasady.md §5.4, D5, P8, U9–U12).
 *
 * MG nadaje zniszczalność tylko temu, co gracze chcą zniszczyć: narzędzie **„Ufizycznij”** (kontrolki żetonów, MG)
 * stawia na drzwiach, oknie, kaflu, rysunku, przedmiocie na ziemi albo w punkcie żeton obiektu — licznik PW i
 * odporności bez grafiki, sama ramka (`icons/obiekty/ramka.svg`), widoczna dla wszystkich, żeby dało się wskazać cel.
 *
 *   - **Model:** jeden aktor bazowy „Obiekt” (`npc` z flagą `obiekt`, tworzony w świecie przy pierwszym użyciu) i
 *     **żetony niepowiązane** z deltą na sztukę: TT (`ac.flat`), PW, Próg (natywny `hp.dt`), rozmiar, materiał,
 *     kotwica. Tabele — `config/obiekty-rules.mjs`.
 *   - **Zasady:** RO — automatyczna porażka (`dnd5e.preRollSavingThrow` dokłada `-99`, każda ścieżka dostaje
 *     prawdziwy, przegrany rzut — granaty, serie, autodestrukcja bez osobnych wyjątków); niewrażliwość na trucizny i
 *     psychiczne (w delcie); `burząca` ×2, `karczująca` ×2 cięte w drewno/rośliny (`dnd5e.preCalculateDamage`; także
 *     pojazdy i wraki — „obiektem jest też pojazd”, s. 254); `ppanc` omija Próg natywnie. Żeton obiektu nie blokuje
 *     ruchu ani nie jest trudnym terenem (haki dnd5e `determineOccupiedGridSpace*`), nie krwawi (Splatter).
 *   - **Zniszczenie (0 PW):** karta MG z przyciskami według kotwicy — [Otwórz drzwi] / [Usuń przegrodę] /
 *     [Ukryj kafel] / [Usuń przedmiot] / [Usuń rysunek] / [Zostaw] — żeton znika, na warstwie rysunków zostaje **X**
 *     (bez flagi eksportera, przeżyje aktualizację mapy; widzą go wszyscy — U12) i notka „podmień w Tiled” (tylko MG).
 *   - **Pamięć zniszczeń (U11):** flaga sceny `zniszczenia` z przegrodami i kaflami eksportera — `map-sync.mjs` ich nie
 *     odtwarza i mówi o tym w raporcie; przycisk „Zniszczenia” (MG) — pokaż, przywróć, zapomnij (po podmianie w Tiled).
 */

import {
  MATERIALY, ROZMIARY, KRUCHOSC, SZABLONY, NIEWRAZLIWOSCI_OBIEKTU, AUTOMATYCZNA_PORAZKA,
  ttObiektu, pwObiektu, rozmiarZWagi, mnoznikObiektu, szablonDlaKlasy, jestObiektem
} from "../config/obiekty-rules.mjs";
import { trafienieMaWlasciwosc } from "../combat/armour-piercing.mjs";
import { jestPojazdem } from "../pojazdy/stan.mjs";
import { pickCanvasPoint } from "./area-picker.mjs";
import { isGroundTile, GROUND_FLAG } from "../actors/ground-items.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Flaga aktora bazowego i delty żetonu: `{bazowy}` / `{material, rozmiar, kruchosc, drewno, kotwica}`. */
export const FLAGA_OBIEKTU = "obiekt";
/** Flaga sceny: pamięć zniszczeń `[{id, typ, nazwa, x, y, iksy, dane, kiedy}]`. */
export const FLAGA_ZNISZCZEN = "zniszczenia";
/** Flaga rysunku X po zniszczeniu: `{zniszczenie: id}`. */
const FLAGA_X = "obiektX";
/** Flaga karty zniszczenia (stan, żeby przyciski nie zadziałały dwa razy). */
const FLAGA_KARTY = "kartaZniszczenia";
const RAMKA = `modules/${MODULE_ID}/icons/obiekty/ramka.svg`;
const FOLDER = "Obiekty (fizyczność)";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Aktor bazowy                                 */
/* -------------------------------------------- */

/**
 * Dane aktora bazowego — `npc` bez Cech (wszystkie 1), niewrażliwy, TT stała: dnd5e 6 `calcs: ["natural"]` liczy
 * `@attributes.ac.flat` (5.3-owe `calc: "flat"` już nie istnieje — migracja robi z niego `override`).
 */
export function daneAktoraBazowego() {
  const abilities = Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(k => [k, { value: 1 }]));
  return {
    name: "Obiekt", type: "npc", img: RAMKA,
    system: {
      abilities,
      attributes: { ac: { calcs: ["natural"], flat: 15 }, hp: { value: 10, max: 10, dt: null }, movement: { walk: 0 } },
      details: { type: { value: "custom", custom: "Obiekt" }, cr: 0 },
      traits: { size: "med", di: { value: [...NIEWRAZLIWOSCI_OBIEKTU] } }
    },
    prototypeToken: {
      name: "Obiekt", actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      displayName: CONST.TOKEN_DISPLAY_MODES.HOVER, displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
      bar1: { attribute: "attributes.hp" }, sight: { enabled: false },
      texture: { src: RAMKA, fit: "fill" }, lockRotation: true,
      flags: { splatter: { bloodColor: "#00000000" } }
    },
    flags: { [MODULE_ID]: { [FLAGA_OBIEKTU]: { bazowy: true } } }
  };
}

/** Aktor bazowy świata (MG tworzy go przy pierwszym „Ufizycznij”). */
export async function aktorBazowy() {
  const jest = game.actors.find(a => a.flags?.[MODULE_ID]?.[FLAGA_OBIEKTU]?.bazowy);
  if (jest || !game.user.isGM) return jest ?? null;
  let folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  folder ??= await Folder.create({ name: FOLDER, type: "Actor", color: "#5a5a5a" });
  return Actor.implementation.create({ ...daneAktoraBazowego(), folder: folder.id });
}

/* -------------------------------------------- */
/*  Kotwice                                      */
/* -------------------------------------------- */

const _odEksportera = doc => !!(doc?.flags?.[MODULE_ID]?.source || doc?.flags?.[MODULE_ID]?.propId);

/**
 * Kotwica z bieżącego zaznaczenia MG: ściany (warstwa ścian), kafel (rekwizyt albo przedmiot na ziemi), rysunek,
 * inaczej `null` — wtedy punkt.
 * @returns {{typ: string, ids: string[], klasa?: string, x: number, y: number, nazwa: string, waga?: number}|null}
 */
function _kotwicaZZaznaczenia() {
  const walls = canvas.walls?.controlled ?? [];
  if (walls.length) {
    const w = walls[0].document;
    const [x1, y1, x2, y2] = w.c;
    const klasa = w.flags?.[MODULE_ID]?.source ?? (w.door ? "door" : "wall");
    return { typ: "sciana", ids: walls.map(x => x.document.id), klasa, x: (x1 + x2) / 2, y: (y1 + y2) / 2,
      nazwa: w.door ? "Drzwi" : "Przegroda", eksport: walls.some(x => _odEksportera(x.document)) };
  }
  const tile = canvas.tiles?.controlled?.[0]?.document;
  if (tile) {
    if (isGroundTile(tile)) {
      const it = tile.flags?.[MODULE_ID]?.[GROUND_FLAG]?.items?.[0]?.data;
      return { typ: "przedmiot", ids: [tile.id], x: tile.x, y: tile.y, nazwa: it?.name ?? "Przedmiot",
        waga: Number(it?.system?.weight?.value) || 0, eksport: false };
    }
    // v14: x/y kafla to jego środek (pamięć projektu).
    return { typ: "kafel", ids: [tile.id], x: tile.x, y: tile.y, nazwa: tile.flags?.[MODULE_ID]?.propId ?? "Kafel",
      eksport: _odEksportera(tile) };
  }
  const d = canvas.drawings?.controlled?.[0]?.document;
  if (d) return { typ: "rysunek", ids: [d.id], x: d.x + (d.shape?.width ?? 0) / 2, y: d.y + (d.shape?.height ?? 0) / 2,
    nazwa: d.text || "Rysunek", eksport: false };
  return null;
}

/* -------------------------------------------- */
/*  Okno „Ufizycznij”                            */
/* -------------------------------------------- */

function _opcje(obj, wybrany, label = v => v.label ?? v) {
  return Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === wybrany ? " selected" : ""}>${esc(label(v))}</option>`).join("");
}

/** Domyślne wartości okna dla kotwicy (U9, U10). */
export function domyslneDlaKotwicy(kotwica) {
  const szablon = kotwica?.typ === "sciana" ? szablonDlaKlasy(kotwica.klasa) : null;
  if (szablon) return { szablon, ...SZABLONY[szablon] };
  if (kotwica?.typ === "przedmiot") return { szablon: "", rozmiar: rozmiarZWagi(kotwica.waga), material: "drewno", kruchosc: "wytrzymaly" };
  return { szablon: "", rozmiar: "sredni", material: "drewno", kruchosc: "wytrzymaly" };
}

async function _okno(kotwica) {
  const d = domyslneDlaKotwicy(kotwica);
  const content = `<div class="neuro-obiekt-okno">
    <p>Obiekt na: <strong>${esc(kotwica ? `${kotwica.nazwa} (${kotwica.typ})` : "punkt na mapie")}</strong>. Tabele: NOE s. 253.</p>
    <div class="form-group"><label>Szablon</label><select name="szablon"><option value="">—</option>${_opcje(SZABLONY, d.szablon)}</select></div>
    <div class="form-group"><label>Nazwa</label><input type="text" name="nazwa" value="${esc(SZABLONY[d.szablon]?.label ?? kotwica?.nazwa ?? "Obiekt")}"></div>
    <div class="form-group"><label>Materiał (TT)</label><select name="material">${_opcje(MATERIALY, d.material, m => `${m.tt} — ${m.label}`)}</select></div>
    <div class="form-group"><label>Rozmiar</label><select name="rozmiar">${_opcje(ROZMIARY, d.rozmiar)}</select></div>
    <div class="form-group"><label>Kruchość</label><select name="kruchosc">${_opcje(KRUCHOSC, d.kruchosc)}</select></div>
    <div class="form-group"><label>PW</label><select name="pw"><option value="stala">wartość stała</option><option value="rzut">rzuć kości</option></select></div>
    <div class="form-group"><label>Próg obrażeń</label><input type="number" name="prog" min="0" step="1" value="${d.prog ?? 0}"></div>
    <div class="form-group"><label>Drewno / roślina</label><input type="checkbox" name="drewno" ${d.roslina || MATERIALY[d.material]?.drewno ? "checked" : ""}></div>
  </div>`;
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: "Ufizycznij" }, content, rejectClose: false,
    render: (_e, dialog) => {
      const f = dialog.element.querySelector("form") ?? dialog.element;
      f.querySelector('[name="szablon"]')?.addEventListener("change", ev => {
        const s = SZABLONY[ev.target.value];
        if (!s) return;
        for (const k of ["material", "rozmiar", "kruchosc"]) f.querySelector(`[name="${k}"]`).value = s[k];
        f.querySelector('[name="nazwa"]').value = s.label;
        f.querySelector('[name="prog"]').value = s.prog ?? 0;
        f.querySelector('[name="drewno"]').checked = !!(s.roslina || MATERIALY[s.material]?.drewno);
      });
    },
    buttons: [
      { action: "ok", label: "Ufizycznij", default: true, callback: (_e, b) => ({ ...new foundry.applications.ux.FormDataExtended(b.form).object, akcja: "obiekt" }) },
      { action: "kruchy", label: "Kruchy — zniszcz od razu", callback: (_e, b) => ({ ...new foundry.applications.ux.FormDataExtended(b.form).object, akcja: "kruchy" }) }
    ]
  });
  return wynik ?? null;
}

/* -------------------------------------------- */
/*  Tworzenie                                    */
/* -------------------------------------------- */

/**
 * Żeton obiektu: delta z liczbami z tabel, rozmiar żetonu z rozmiaru obiektu, środek na kotwicy.
 * @param {Scene} scene
 * @param {{x: number, y: number}} punkt
 * @param {{nazwa, material, rozmiar, kruchosc, pw, prog, drewno}} w
 * @param {object|null} kotwica
 */
export async function utworzObiekt(scene, punkt, w, kotwica = null) {
  const bazowy = await aktorBazowy();
  if (!bazowy) return null;
  const tt = ttObiektu(w.material) ?? 15;
  const rzut = w.pw === "rzut" ? f => new Roll(f).evaluateSync({ strict: false }).total : null;
  const { pw } = pwObiektu(w.rozmiar, w.kruchosc, { rzut }) ?? { pw: 10 };
  const r = ROZMIARY[w.rozmiar] ?? ROZMIARY.sredni;
  const bok = r.pola * scene.grid.size;
  const prog = Math.max(0, Math.floor(Number(w.prog) || 0));
  const flagi = { material: w.material, rozmiar: w.rozmiar, kruchosc: w.kruchosc, drewno: !!w.drewno, kotwica };
  const td = await bazowy.getTokenDocument({
    name: w.nazwa || "Obiekt", x: punkt.x - bok / 2, y: punkt.y - bok / 2, width: r.pola, height: r.pola,
    ...(canvas.level?.id && scene.isView ? { level: canvas.level.id } : {}),
    delta: {
      name: w.nazwa || "Obiekt",
      system: { attributes: { ac: { calcs: ["natural"], flat: tt }, hp: { value: pw, max: pw, dt: prog || null } }, traits: { size: r.dnd5e } },
      flags: { [MODULE_ID]: { [FLAGA_OBIEKTU]: flagi } }
    }
  });
  const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  return tok;
}

/** Przycisk MG „Ufizycznij”. */
export async function ufizycznij() {
  if (!game.user.isGM) return null;
  const scene = canvas.scene;
  if (!scene) return null;
  let kotwica = _kotwicaZZaznaczenia();
  const w = await _okno(kotwica);
  if (!w) return null;
  if (!kotwica) {
    const p = await pickCanvasPoint({ hint: "Kliknij, gdzie stoi obiekt (prawy przycisk — anuluj)." });
    if (!p) return null;
    kotwica = { typ: "punkt", ids: [], x: p.x, y: p.y, nazwa: w.nazwa, eksport: false };
  }
  // Kruchy przedmiot (s. 253): MG pozwala zniszczyć go bez testu — od razu karta zniszczenia, bez żetonu.
  if (w.akcja === "kruchy") return kartaZniszczenia(scene, { nazwa: w.nazwa, kotwica, tokenId: null });
  return utworzObiekt(scene, { x: kotwica.x, y: kotwica.y }, w, kotwica);
}

/* -------------------------------------------- */
/*  Zasady obiektu                               */
/* -------------------------------------------- */

/** RO obiektu (s. 254): brak Cech — każdy RO przegrany. Prawdziwy rzut, żeby każda ścieżka zbiorcza go dostała. */
function _onPreRollSavingThrow(config, _dialog, message) {
  const actor = config?.subject;
  if (!jestObiektem(actor)) return;
  for (const r of config.rolls ?? []) (r.parts ??= []).push(AUTOMATYCZNA_PORAZKA);
  if (message?.data) message.data.flavor = `${message.data.flavor ?? ""} — obiekt: automatyczna porażka (s. 254)`.trim();
}

/** `burząca` ×2 obiektom i pojazdom, `karczująca` ×2 cięte w drewno i rośliny (s. 117, 254). */
function _onPreCalculateDamage(actor, damages, options) {
  const pojazd = jestPojazdem(actor);
  if (!jestObiektem(actor) && !pojazd) return;
  const drewno = !!actor.flags?.[MODULE_ID]?.[FLAGA_OBIEKTU]?.drewno;
  const m = mnoznikObiektu({
    burzaca: trafienieMaWlasciwosc(damages, options, ["burzaca"]),
    karczujaca: trafienieMaWlasciwosc(damages, options, ["karczujaca"]),
    drewno
  });
  if (m.calosc !== 1) options.multiplier = (options.multiplier ?? 1) * m.calosc;
  if (m.ciete !== 1) for (const d of damages ?? []) if (d.type === "slashing") d.value *= m.ciete;
}

/** Żeton obiektu nie blokuje ruchu i nie jest trudnym terenem (dnd5e liczy każdego `npc` jako istotę). */
function _bezObiektow(_space, _token, _opts, found) {
  for (const t of [...found]) if (jestObiektem(t.actor)) found.delete(t);
}

/* -------------------------------------------- */
/*  Zniszczenie                                  */
/* -------------------------------------------- */

const _zniszczeniaSceny = scene => scene?.getFlag(MODULE_ID, FLAGA_ZNISZCZEN) ?? [];

/** Przyciski karty według kotwicy. */
function _przyciski(kotwica, scene) {
  const out = [];
  if (kotwica?.typ === "sciana") {
    const drzwi = (kotwica.ids ?? []).some(id => scene.walls.get(id)?.door > 0);
    if (drzwi) out.push(["otworz", "Otwórz drzwi", "fa-door-open"]);
    out.push(["usunPrzegrode", "Usuń przegrodę", "fa-trowel-bricks"]);
  } else if (kotwica?.typ === "kafel") out.push(["ukryjKafel", "Ukryj kafel", "fa-eye-slash"]);
  else if (kotwica?.typ === "przedmiot") out.push(["usunKafel", "Usuń przedmiot", "fa-trash"]);
  else if (kotwica?.typ === "rysunek") out.push(["usunRysunek", "Usuń rysunek", "fa-trash"]);
  out.push(["zostaw", "Zostaw", "fa-xmark"]);
  return out;
}

/** Karta MG po zniszczeniu (0 PW albo „kruchy — od razu”). */
export async function kartaZniszczenia(scene, { nazwa, kotwica, tokenId }) {
  const stan = { sceneId: scene.id, tokenId, nazwa, kotwica, zrobione: false };
  const przyciski = _przyciski(kotwica, scene).map(([a, l, i]) =>
    `<button type="button" data-neuro-obiekt="${a}"><i class="fa-solid ${i}"></i> ${esc(l)}</button>`).join("");
  const tiled = kotwica?.eksport ? `<p class="hint">Przegroda/kafel z eksportu mapy — podmień w Tiled przy następnym eksporcie; do tego czasu aktualizacja mapy ich nie odtworzy („Zniszczenia”).</p>` : "";
  return ChatMessage.implementation.create({
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    speaker: { alias: "Obiekt" },
    content: `<div class="neuro-obiekt-karta"><p><strong>Zniszczony: ${esc(nazwa)}</strong> (${esc(kotwica?.typ ?? "punkt")})</p>${tiled}
      <div class="card-buttons">${przyciski}</div></div>`,
    flags: { [MODULE_ID]: { [FLAGA_KARTY]: stan } }
  });
}

/** X na warstwie rysunków (U12: widzą wszyscy) — dwa odcinki, bez flagi eksportera. */
async function _iks(scene, x, y, id) {
  const r = scene.grid.size * 0.45;
  const linia = (ax, ay, bx, by) => ({
    x: Math.min(ax, bx), y: Math.min(ay, by), author: game.user.id,
    shape: { type: "p", width: Math.abs(bx - ax), height: Math.abs(by - ay),
      points: [ax - Math.min(ax, bx), ay - Math.min(ay, by), bx - Math.min(ax, bx), by - Math.min(ay, by)] },
    strokeColor: "#d33f3f", strokeWidth: 6, strokeAlpha: 0.9, fillType: CONST.DRAWING_FILL_TYPES.NONE,
    ...(scene.isView && canvas.level?.id ? { level: canvas.level.id } : {}),
    flags: { [MODULE_ID]: { [FLAGA_X]: { zniszczenie: id } } }
  });
  const docs = await scene.createEmbeddedDocuments("Drawing", [linia(x - r, y - r, x + r, y + r), linia(x - r, y + r, x + r, y - r)]);
  return docs.map(d => d.id);
}

/** Wykonuje wybór z karty (MG). */
async function _zniszcz(message, akcja) {
  const stan = message.getFlag(MODULE_ID, FLAGA_KARTY);
  if (!stan || stan.zrobione || !game.user.isGM) return;
  const scene = game.scenes.get(stan.sceneId);
  if (!scene) return;
  const k = stan.kotwica ?? {};
  const id = foundry.utils.randomID();
  const wpis = { id, typ: k.typ, nazwa: stan.nazwa, x: k.x, y: k.y, ids: k.ids ?? [], eksport: !!k.eksport, akcja,
    kiedy: game.time.worldTime, dane: [] };
  if (akcja === "otworz") {
    await scene.updateEmbeddedDocuments("Wall", k.ids.filter(i => scene.walls.get(i)?.door > 0)
      .map(i => ({ _id: i, ds: CONST.WALL_DOOR_STATES.OPEN })));
  } else if (akcja === "usunPrzegrode") {
    wpis.dane = k.ids.map(i => scene.walls.get(i)?.toObject()).filter(Boolean);
    await scene.deleteEmbeddedDocuments("Wall", k.ids.filter(i => scene.walls.has(i)));
  } else if (akcja === "ukryjKafel") {
    await scene.updateEmbeddedDocuments("Tile", k.ids.filter(i => scene.tiles.has(i)).map(i => ({ _id: i, hidden: true })));
  } else if (akcja === "usunKafel") {
    wpis.dane = k.ids.map(i => scene.tiles.get(i)?.toObject()).filter(Boolean);
    await scene.deleteEmbeddedDocuments("Tile", k.ids.filter(i => scene.tiles.has(i)));
  } else if (akcja === "usunRysunek") {
    await scene.deleteEmbeddedDocuments("Drawing", k.ids.filter(i => scene.drawings.has(i)));
  }
  if (stan.tokenId && scene.tokens.has(stan.tokenId)) await scene.deleteEmbeddedDocuments("Token", [stan.tokenId]);
  if (Number.isFinite(k.x)) wpis.iksy = await _iks(scene, k.x, k.y, id);
  // Pamięć zniszczeń (U11) — tylko dla przegród i kafli eksportera: tylko je odtwarza aktualizacja mapy.
  if (k.eksport && ["usunPrzegrode", "ukryjKafel", "usunKafel"].includes(akcja)) {
    await scene.setFlag(MODULE_ID, FLAGA_ZNISZCZEN, [..._zniszczeniaSceny(scene), wpis]);
  }
  await message.update({ [`flags.${MODULE_ID}.${FLAGA_KARTY}.zrobione`]: true });
}

/** 0 PW obiektu → karta (u aktywnego MG, raz). */
function _onUpdateActor(actor, changes) {
  if (!game.users.activeGM?.isSelf || !jestObiektem(actor) || !actor.isToken) return;
  if (!foundry.utils.hasProperty(changes, "system.attributes.hp.value")) return;
  if (Number(actor.system.attributes.hp.value) > 0) return;
  const tok = actor.token;
  if (tok?.getFlag(MODULE_ID, "zniszczony")) return;
  void tok?.setFlag(MODULE_ID, "zniszczony", true);
  void kartaZniszczenia(tok.parent, {
    nazwa: tok.name, tokenId: tok.id,
    kotwica: actor.flags?.[MODULE_ID]?.[FLAGA_OBIEKTU]?.kotwica ?? { typ: "punkt", x: tok.x + (tok.width * tok.parent.grid.size) / 2, y: tok.y + (tok.height * tok.parent.grid.size) / 2 }
  });
}

function _onRenderChatMessageHTML(message, html) {
  if (!message.getFlag(MODULE_ID, FLAGA_KARTY)) return;
  for (const btn of html.querySelectorAll("button[data-neuro-obiekt]")) {
    if (!game.user.isGM || message.getFlag(MODULE_ID, FLAGA_KARTY)?.zrobione) { btn.disabled = true; continue; }
    btn.addEventListener("click", ev => { ev.preventDefault(); btn.disabled = true; _zniszcz(message, btn.dataset.neuroObiekt); });
  }
}

/* -------------------------------------------- */
/*  „Zniszczenia” (U11)                          */
/* -------------------------------------------- */

/** Ids przegród i kafli eksportera, których aktualizacja mapy nie ma odtwarzać (`map-sync.mjs`). */
export function zniszczoneIds(scene) {
  const out = { sciany: new Set(), kafle: new Set() };
  for (const z of _zniszczeniaSceny(scene)) {
    for (const i of z.ids ?? []) (z.typ === "sciana" ? out.sciany : out.kafle).add(i);
  }
  return out;
}

/** Przywraca zniszczenie: odtwarza przegrodę/kafel z zapisu albo odkrywa kafel, kasuje X, zapomina wpis. */
export async function przywroc(scene, id) {
  const z = _zniszczeniaSceny(scene).find(x => x.id === id);
  if (!z) return;
  if (z.akcja === "usunPrzegrode" && z.dane?.length) await scene.createEmbeddedDocuments("Wall", z.dane, { keepId: true });
  if (z.akcja === "usunKafel" && z.dane?.length) await scene.createEmbeddedDocuments("Tile", z.dane, { keepId: true });
  if (z.akcja === "ukryjKafel") await scene.updateEmbeddedDocuments("Tile", z.ids.filter(i => scene.tiles.has(i)).map(i => ({ _id: i, hidden: false })));
  return zapomnij(scene, id, { iksy: true });
}

/** Zapomina wpis (po podmianie w Tiled `map-sync` znów odtwarza z eksportu); `iksy` — kasuje też X. */
export async function zapomnij(scene, id, { iksy = false } = {}) {
  const lista = _zniszczeniaSceny(scene);
  const z = lista.find(x => x.id === id);
  if (iksy && z?.iksy?.length) await scene.deleteEmbeddedDocuments("Drawing", z.iksy.filter(i => scene.drawings.has(i)));
  await scene.setFlag(MODULE_ID, FLAGA_ZNISZCZEN, lista.filter(x => x.id !== id));
}

/** Okno „Zniszczenia” sceny (MG). */
export async function oknoZniszczen(scene = canvas.scene) {
  if (!game.user.isGM || !scene) return;
  const lista = _zniszczeniaSceny(scene);
  const wiersze = lista.length ? lista.map(z => `<li data-id="${z.id}"><strong>${esc(z.nazwa)}</strong> — ${esc(z.typ)}, ${esc(z.akcja)}
      <button type="button" data-a="pokaz">Pokaż</button> <button type="button" data-a="przywroc">Przywróć</button>
      <button type="button" data-a="zapomnij">Zapomnij (podmienione w Tiled)</button></li>`).join("")
    : "<li>Brak zniszczeń przegród i kafli z eksportu na tej scenie.</li>";
  await foundry.applications.api.DialogV2.wait({
    window: { title: `Zniszczenia: ${scene.name}` }, rejectClose: false,
    content: `<p>Te przegrody i kafle z eksportu mapy nie wrócą przy aktualizacji, dopóki ich nie zapomnisz.</p><ul class="neuro-zniszczenia">${wiersze}</ul>`,
    render: (_e, dialog) => {
      dialog.element.querySelectorAll(".neuro-zniszczenia button").forEach(b => b.addEventListener("click", async () => {
        const id = b.closest("li").dataset.id;
        const z = _zniszczeniaSceny(scene).find(x => x.id === id);
        if (b.dataset.a === "pokaz" && z && scene.isView) canvas.animatePan({ x: z.x, y: z.y, scale: 1.2 });
        if (b.dataset.a === "przywroc") { await przywroc(scene, id); b.closest("li").remove(); }
        if (b.dataset.a === "zapomnij") { await zapomnij(scene, id); b.closest("li").remove(); }
      }));
    },
    buttons: [
      { action: "wszystkie", label: "Zapomnij wszystkie", callback: async () => { await scene.setFlag(MODULE_ID, FLAGA_ZNISZCZEN, []); } },
      { action: "zamknij", label: "Zamknij", default: true }
    ]
  });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerObiekty() {
  // Na każdej warstwie, której zaznaczenie jest kotwicą — zmiana warstwy zwalnia zaznaczenie.
  Hooks.on("getSceneControlButtons", controls => {
    const gm = game.user?.isGM ?? false;
    for (const grupa of ["tokens", "walls", "tiles", "drawings"]) {
      const tools = controls[grupa]?.tools;
      if (!tools) continue;
      tools.neuroshimaUfizycznij = {
        name: "neuroshimaUfizycznij", title: "Ufizycznij — obiekt do zniszczenia (MG; zaznaczone ściany, kafel albo rysunek, inaczej punkt)",
        icon: "fa-solid fa-cube", order: Object.keys(tools).length, button: true, visible: gm, onChange: () => ufizycznij()
      };
      if (grupa !== "tokens") continue;
      tools.neuroshimaZniszczenia = {
        name: "neuroshimaZniszczenia", title: "Zniszczenia na scenie (MG)",
        icon: "fa-solid fa-house-crack", order: Object.keys(tools).length, button: true, visible: gm, onChange: () => oknoZniszczen()
      };
    }
  });
  Hooks.on("dnd5e.preRollSavingThrow", _onPreRollSavingThrow);
  Hooks.on("dnd5e.preCalculateDamage", _onPreCalculateDamage);
  Hooks.on("dnd5e.determineOccupiedGridSpaceBlocking", _bezObiektow);
  Hooks.on("dnd5e.determineOccupiedGridSpaceDifficult", _bezObiektow);
  Hooks.on("updateActor", _onUpdateActor);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessageHTML);
}

/** `game.neuroshima.obiekty` */
export const obiektyApi = Object.freeze({
  ufizycznij, utworzObiekt, aktorBazowy, kartaZniszczenia, oknoZniszczen, przywroc, zapomnij, zniszczoneIds, jestObiektem,
  domyslneDlaKotwicy
});
