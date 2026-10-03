/**
 * Neuroshima 5e — zakładka Produkcja na karcie BG (PLAN_produkcja §6, etap E2).
 *
 * Ma ją każda postać gracza: Brutal po prostu jej nie otwiera, Spec w niej mieszka. Szablon
 * (`templates/tab-produkcja.hbs`) to pusta skorupa — wypełnia ją hak renderu, tak jak
 * zakładkę Zasoby (`actors/sheet-shell.mjs`). Cztery sekcje, od najczęściej używanej:
 *
 *   NA WARSZTACIE   — Roboty, których postać jest kierownikiem albo które trzyma; pod nimi
 *                     „Do naprawy” — jej przedmioty, które same zgłaszają uszkodzenie,
 *   SUROWCE         — zapasy w gamblach (tak liczą przepisy), pula jako „duch”, najechany
 *                     przepis nakłada swoje potrzeby na paski,
 *   CO UMIESZ ZROBIĆ — ZP pogrupowane wg wykonalności: ✅ od ręki → 🚚 z puli → ⚠ brak surowców
 *                     → ⛔ brak narzędzi/biegłości (tu Brutal widzi cenę sprzedaży swojego Schematu),
 *   WPRAWA I SCHEMATY — skąd ten dostęp; narzędzia MG.
 *
 * Czas w wierszu to czas **tego** wykonawcy (mnożniki, D32). Kliknięcia idą do lejka
 * (`robota.mjs`) przez okna (`okna.mjs`) — zakładka niczego nie zapisuje sama.
 */

import { daneRoboty, robotyU, robotyKierownika, isRobota, kierownikRoboty, test } from "./robota.mjs";
import { przepisyDostepne, schematyAktora, wprawaMG, odbierzWprawe } from "./zp.mjs";
import { kontekstWykonawcy, ocenNarzedzia, mnoznikWykonawcy, stTestuDla } from "./wykonawca.mjs";
import { isMiejsce, druzynyAktora } from "./pula.mjs";
import { noweMiejsce } from "./przenoszenie.mjs";
import { stanSzybkiej, dodajDoKoszyka, usunZKoszyka, ocenaKoszyka, wykonajSzybka } from "./szybka.mjs";
import { doNaprawy, oknoNaprawy } from "./naprawa.mjs";
import { uuidWKompendium, daneWyniku } from "./wynik.mjs";
import { oknoStartu, oknoPracy, oknoKorekty, menuRoboty, oknoWprawy, oknoAdHoc } from "./okna.mjs";
import { fmtSurowce } from "./karty.mjs";
import { KATALOG, PROFESJE } from "../config/recipes-data.mjs";
import { fmtGGMM, czasWykonawcy, surowceWykonawcy, alokujSurowce } from "../config/production-rules.mjs";
import { formatToolExpr, parseToolExpr, toolExprKeys, TOOL_KEYS } from "../config/tool-expr.mjs";
import { SUROWCE_BY_CODE, getSurowiecType } from "../config/surowce-data.mjs";
import { allGb, SUROWCE_CODES } from "../actors/surowce-store.mjs";
import { oknoDodajSurowce } from "../actors/surowce-inventory.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ROBOTA_BADGE = `modules/${MODULE_ID}/icons/items/loot/robota_nakladka.svg`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Grupy wykonalności, w kolejności wyświetlania. */
export const GRUPY = Object.freeze([
  // „Od ręki”, nie „Gotowe” — „gotowe” czytało się jak „już zrobione”.
  { id: "gotowe", label: "Od ręki", ikona: "✅" },
  { id: "pula", label: "Z puli", ikona: "🚚" },
  { id: "surowce", label: "Brakuje surowców", ikona: "⚠" },
  { id: "narzedzia", label: "Brak narzędzi lub biegłości", ikona: "⛔" }
]);
const RANGA = Object.fromEntries(GRUPY.map((g, i) => [g.id, i]));

/** Stan UI per aktor (filtry, zwinięte grupy) — tylko w pamięci tej karty. */
const _ui = new Map();
function _stanUI(actor) {
  if (!_ui.has(actor.id)) _ui.set(actor.id, { szukaj: "", narzedzie: "", zrodlo: "", zwiniete: new Set(["narzedzia"]) });
  return _ui.get(actor.id);
}

/* -------------------------------------------- */
/*  Ikony — cache z kompendiów                   */
/* -------------------------------------------- */

const _ikony = new Map();

/** Wypełnia cache ikon wyników (raz, w tle — indeksy paczek mają `img`). */
export async function przygotujIkony() {
  const packs = new Map();
  for (const ref of KATALOG.keys()) {
    const uuid = await uuidWKompendium(ref);
    if (uuid) {
      // `parseUuid`, nie ręczny split — ręczny był o pole przesunięty i każdy wiersz dostawał worek.
      const { collection: pack, id } = foundry.utils.parseUuid(uuid) ?? {};
      if (!pack) continue;
      if (!packs.has(pack.collection)) packs.set(pack.collection, await pack.getIndex().catch(() => null));
      const img = packs.get(pack.collection)?.get(id)?.img;
      if (img) _ikony.set(ref, img);
    } else {
      const w = await daneWyniku(ref).catch(() => null);
      if (w?.data?.img) _ikony.set(ref, w.data.img);
    }
  }
}

/** Ikona wyniku przepisu: dane przepisu → cache z paczek → worek. Eksportowane dla testów. */
export function ikonaPrzepisu(przepis) {
  return przepis.wynik?.dane?.img ?? _ikony.get(przepis.wynik?.ref) ?? "icons/svg/item-bag.svg";
}

/* -------------------------------------------- */
/*  Dane zakładki                               */
/* -------------------------------------------- */

function _suma(...maps) {
  const out = Object.fromEntries(SUROWCE_CODES.map(c => [c, 0]));
  for (const m of maps) for (const c of SUROWCE_CODES) out[c] += m?.[c] ?? 0;
  return out;
}

/**
 * Wszystko, co pokazuje zakładka — liczone raz na render, z jednym kontekstem wykonawcy.
 * Eksportowane dla testów i konsoli (`game.neuroshima.produkcja.zakladka(actor)`).
 */
export function daneZakladki(actor) {
  const kobalt = isKobaltEnabled();
  const ctx = kontekstWykonawcy(actor);
  const zapas = allGb(actor);
  const pula = ctx.pula;
  const zapasyPuli = pula.map(a => ({ actor: a, gb: allGb(a) }));
  const razemPula = _suma(...zapasyPuli.map(z => z.gb));
  const razem = _suma(zapas, razemPula);

  const roboty = [...new Set([...robotyKierownika(actor), ...robotyU(actor)])].map(item => {
    const r = daneRoboty(item);
    const kier = kierownikRoboty(item);
    const m = kier ? mnoznikWykonawcy(kier, r.przepis, { kontener: item.parent, naprawa: r.rodzaj === "naprawa", kobalt }) : { mnoznik: 1, powody: [] };
    return {
      item, r, kier,
      miejsce: item.parent === actor ? "przy sobie" : item.parent?.name ?? "?",
      doKonca: czasWykonawcy(r.wymagane - r.postep, m.mnoznik),
      powody: m.powody,
      st: kier ? stTestuDla(kier, r.przepis, { stMG: r.stMG, kontener: item.parent, kobalt }) : r.przepis.st
    };
  });

  const wiersze = [];
  for (const { przepis: p, zrodla } of przepisyDostepne(actor, { kobalt })) {
    const narz = ocenNarzedzia(actor, p, { ctx });
    const linie = surowceWykonawcy(p.surowce, { przydasie: ctx.cechy.przydasie });
    const wlasne = alokujSurowce(linie, zapas);
    const zPula = wlasne.ok ? wlasne : alokujSurowce(linie, razem);
    const grupa = narz.poziom === "brak" ? "narzedzia"
      : !zPula.ok ? "surowce"
      : (narz.poziom === "pula" || !wlasne.ok) ? "pula"
      : "gotowe";
    const m = mnoznikWykonawcy(actor, p, { ctx, kobalt });
    wiersze.push({
      przepis: p, zrodla, grupa, narz,
      przydzial: zPula.przydzial, brak: zPula.brak,
      czas: czasWykonawcy(p.minuty, m.mnoznik), powody: m.powody,
      st: stTestuDla(actor, p, { ctx, kobalt })
    });
  }

  // Jeden wiersz na wynik; kilka przepisów — najpierw najbardziej wykonalny, potem najszybszy.
  const poWyniku = new Map();
  for (const w of wiersze) {
    const key = w.przepis.wynik.dane ? w.przepis.id : w.przepis.wynik.ref;
    if (!poWyniku.has(key)) poWyniku.set(key, []);
    poWyniku.get(key).push(w);
  }
  const pozycje = [...poWyniku.values()].map(ws => {
    ws.sort((a, b) => RANGA[a.grupa] - RANGA[b.grupa] || a.czas - b.czas);
    return { ...ws[0], alternatywy: ws };
  }).sort((a, b) => RANGA[a.grupa] - RANGA[b.grupa] || a.przepis.nazwa.localeCompare(b.przepis.nazwa, "pl"));

  const szybka = stanSzybkiej(actor);
  return {
    actor, kobalt, ctx, zapas, zapasyPuli, razemPula, roboty, pozycje, szybka,
    szybkaOcena: szybka?.koszyk.length ? ocenaKoszyka(actor, szybka.koszyk) : null,
    doNaprawy: doNaprawy(actor),
    schematy: schematyAktora(actor),
    wprawa: wprawaMG(actor),
    profesje: [...ctx.cechy.profesje]
  };
}

/* -------------------------------------------- */
/*  HTML                                        */
/* -------------------------------------------- */

function _htmlRobota(x) {
  const { item, r, miejsce, doKonca, powody, st, kier } = x;
  const pct = r.wymagane > 0 ? Math.min(100, Math.round((r.postep / r.wymagane) * 100)) : 0;
  const plakietki = [
    r.stan === "test" ? `<span class="neuro-prod-plakietka is-test" data-tooltip="Praca skończona — czas na Test">Test!</span>` : "",
    r.braki?.length && !r.zatwierdzone ? `<span class="neuro-prod-plakietka is-braki" data-tooltip="Zaczęta mimo braków narzędzi — MG zdecyduje">⚠</span>` : "",
    r.podejscia ? `<span class="neuro-prod-plakietka" data-tooltip="Nieudane Testy">×${r.podejscia}</span>` : ""
  ].join("");
  const kogo = kier && kier !== x.aktor ? ` · kierownik: ${esc(kier.name)}` : "";
  const czas = r.stan === "test" ? "gotowe do Testu"
    : `zostało ${fmtGGMM(doKonca)}${powody.length ? ` <span class="hint">(${esc(powody.join(", "))})</span>` : ""}`;
  return `<li class="neuro-prod-robota${r.stan === "test" ? " is-test" : ""}" data-uuid="${esc(item.uuid)}">
    <img src="${esc(item.img)}" alt="">
    <div class="neuro-prod-robota-main">
      <div class="neuro-prod-robota-top"><span class="nazwa">${esc(r.przepis.nazwa)}</span>${plakietki}
        <span class="neuro-prod-postep">${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)} · ST ${st}</span></div>
      <div class="neuro-prod-pasek"><div style="width:${pct}%"></div></div>
      <div class="neuro-prod-sub">${esc(miejsce)} · ${Number(item.system.weight?.value ?? 0).toLocaleString("pl")} kg · ${fmtSurowce(r.surowce)} · ${czas}${kogo}</div>
    </div>
    <div class="neuro-prod-akcje">
      ${r.stan === "test"
        ? `<button type="button" data-akcja="test" data-tooltip="Test końcowy"><i class="fa-solid fa-dice-d20" inert></i> Test</button>`
        : `<button type="button" data-akcja="pracuj"><i class="fa-solid fa-hammer" inert></i> Pracuj…</button>`}
      <button type="button" data-akcja="koryguj" data-tooltip="Korekta postępu (np. pomoc)">±</button>
      <button type="button" data-akcja="menu" data-tooltip="Więcej">⋯</button>
    </div>
  </li>`;
}

function _htmlSurowce(d) {
  const skala = Math.max(10, ...SUROWCE_CODES.map(c => (d.zapas[c] ?? 0) + (d.razemPula[c] ?? 0)));
  const bars = SUROWCE_CODES.map(c => {
    const t = SUROWCE_BY_CODE[c];
    const own = d.zapas[c] ?? 0;
    const pula = d.razemPula[c] ?? 0;
    const gdzie = d.zapasyPuli.filter(z => (z.gb[c] ?? 0) > 0).map(z => `${Math.floor(z.gb[c])} w ${z.actor.name}`);
    return `<div class="neuro-sur-bar" data-typ="${c}" style="--sur-kolor:${t.accent};--own:${(own / skala) * 100}%;--pula:${(pula / skala) * 100}%;--need:0%">
      <span class="kod" data-tooltip="${esc(t.label)}">${c}</span>
      <div class="tor"><div class="own"></div><div class="pula"></div><div class="need"></div></div>
      <span class="ile">${Math.floor(own)} gb${gdzie.length ? ` <em>(+${esc(gdzie.join(", "))})</em>` : ""}</span>
    </div>`;
  }).join("");
  return `<section class="neuro-prod-sekcja neuro-prod-surowce" data-skala="${skala}">
    <h3>Surowce <span class="hint">w gamblach</span>
      <button type="button" class="neuro-prod-h3-btn" data-akcja="dodaj-surowce" data-tooltip="Dodaj surowce — to samo okno co w Zasobach"><i class="fa-solid fa-plus" inert></i> Dodaj</button></h3>${bars}</section>`;
}

function _zrodloLabel(zrodla) {
  const order = { "wprawa-profesji": 0, "wprawa-mg": 1, schemat: 2, proste: 3, mg: 4 };
  return [...zrodla].sort((a, b) => (order[a.typ] ?? 9) - (order[b.typ] ?? 9)).map(z => z.label)[0] ?? "";
}

function _htmlPozycja(poz, d) {
  const p = poz.przepis;
  const need = Object.entries(poz.przydzial).map(([k, v]) => `${k}:${v}`).join(",");
  const brakTxt = Object.keys(poz.brak).length ? `brak ${fmtSurowce(poz.brak)}` : "";
  const narzTxt = poz.grupa === "narzedzia" && poz.narz.brakuje ? `brakuje: ${formatToolExpr(poz.narz.brakuje)}` : "";
  const zestawWPuli = poz.narz.poziom === "pula" ? poz.narz.braki.map(b => TOOL_KEYS[b.key]).join(", ") : "";
  const schemat = poz.zrodla.find(z => z.typ === "schemat");
  const sprzedaz = poz.grupa === "narzedzia" && schemat
    ? ` <span class="hint">(sprzedaż: ${Number(schemat.item.system?.price?.value) || 0} gb)</span>` : "";
  const alt = poz.alternatywy.length > 1 ? ` <span class="neuro-prod-alt" data-tooltip="${esc(poz.alternatywy.map(a => `${a.przepis.zrodlo?.wzor ? "wzór" : a.przepis.zrodlo?.tabela ?? "ad hoc"}: ST ${a.st}, ${fmtGGMM(a.czas)}`).join(" · "))}">+${poz.alternatywy.length - 1}</span>` : "";
  const klucze = [...toolExprKeys(parseToolExpr(p.narzedzia))].join(" ");
  const typyZrodel = poz.zrodla.map(z => z.typ.startsWith("wprawa") ? "wprawa" : z.typ).join(" ");
  const przycisk = poz.grupa === "narzedzia"
    ? `<button type="button" data-akcja="start" data-tooltip="Zacznij mimo braków — MG zdecyduje">Mimo braków…</button>`
    : poz.grupa === "surowce"
      ? `<button type="button" data-akcja="start" disabled>Zacznij</button>`
      : `<button type="button" data-akcja="start">${poz.grupa === "pula" ? "Zacznij…" : "Zacznij"}</button>`;
  const dopisek = [brakTxt, narzTxt, zestawWPuli ? `zestaw w puli: ${zestawWPuli}` : ""].filter(Boolean).join(" · ");
  const sz = d.szybka;
  const iskra = sz && sz.ladunki > 0 && poz.grupa === "gotowe" && p.wartosc <= sz.budzet - sz.wartosc + 1e-9
    ? `<button type="button" class="neuro-iskra-btn" data-akcja="szybka-dodaj" data-tooltip="Do koszyka Szybkiej produkcji (${p.wartosc} gb)">⚡</button>` : "";
  return `<li class="neuro-prod-przepis" data-klucz="${esc(p.wynik.dane ? p.id : p.wynik.ref)}" data-need="${esc(need)}"
      data-nazwa="${esc(p.nazwa.toLowerCase())}" data-narzedzia="${esc(klucze)}" data-zrodla="${esc(typyZrodel)}">
    <img src="${esc(ikonaPrzepisu(p))}" alt="">
    <div class="neuro-prod-przepis-main">
      <div><span class="nazwa">${esc(p.nazwa)}</span>${p.wynik.ilosc > 1 ? ` <span class="hint">×${p.wynik.ilosc}</span>` : ""}${alt}
        <span class="zrodlo">${esc(_zrodloLabel(poz.zrodla))}</span>${sprzedaz}</div>
      <div class="neuro-prod-sub">ST ${poz.st} · ${fmtGGMM(poz.czas)}${poz.powody.length ? ` <span class="hint">(${esc(poz.powody.join(", "))})</span>` : ""}
        · ${esc(formatToolExpr(parseToolExpr(p.narzedzia)))} · ${fmtSurowce(poz.przydzial)}${dopisek ? ` · <span class="bad">${esc(dopisek)}</span>` : ""}</div>
    </div>
    <div class="neuro-prod-akcje">${przycisk}${iskra}</div>
  </li>`;
}

/** Pasek Szybkiej produkcji (§10) — własny kolor „iskry”, bez Roboty. */
function _htmlSzybka(d) {
  const s = d.szybka;
  if (!s) return "";
  const pips = Array.from({ length: Math.max(1, s.max) }, (_, i) => `<span class="neuro-iskra-pip${i < s.ladunki ? " is-on" : ""}"></span>`).join("");
  const pct = Math.min(100, Math.round((s.wartosc / s.budzet) * 100));
  const o = d.szybkaOcena;
  const koszyk = s.koszyk.map(k => `<li><span>${k.ilosc > 1 ? `${k.ilosc} × ` : ""}${esc(k.przepis.nazwa)}</span>
      <em>${k.przepis.wartosc * k.ilosc} gb</em>
      <a data-akcja="szybka-usun" data-przepis="${esc(k.przepis.id)}" data-tooltip="Usuń"><i class="fa-solid fa-xmark" inert></i></a></li>`).join("");
  const stan = o ? `${fmtSurowce(o.surowce)} · ${fmtGGMM(o.minuty)}${o.fabrykator ? " (Fabrykator)" : ""}`
    + (o.ok ? "" : ` · <span class="bad">brak przy sobie: ${fmtSurowce(o.brak)}</span>`)
    + (o.braki.length ? ` · <span class="bad">⚠ narzędzia</span>` : "") : "";
  return `<section class="neuro-prod-sekcja neuro-iskra">
    <h3><span class="neuro-iskra-ikona">⚡</span> Szybka produkcja
      <span class="neuro-iskra-pips" data-tooltip="Ładunek — wraca po Krótkim albo Długim odpoczynku">${pips}</span>
      <span class="licznik">${s.wartosc} / ${s.budzet} gb</span></h3>
    <div class="neuro-iskra-pasek"><div style="width:${pct}%"></div></div>
    ${koszyk ? `<ul class="neuro-iskra-koszyk">${koszyk}</ul>
      <div class="neuro-iskra-stan">${stan}</div>
      <button type="button" class="neuro-iskra-wykonaj" data-akcja="szybka-wykonaj" ${s.ladunki < 1 ? "disabled" : ""}>⚡ Wykonaj (bez Testu)</button>`
      : `<p class="hint">${s.ladunki > 0 ? "Dodaj przedmioty przyciskiem ⚡ przy gotowych przepisach — łącznie do " + s.budzet + " gb wartości, 1 min × 1 gb." : "Zużyta — wraca po odpoczynku."}</p>`}
  </section>`;
}

function _htmlPrzepisy(d, ui) {
  const narzedzia = [...new Set(d.pozycje.flatMap(p => [...toolExprKeys(parseToolExpr(p.przepis.narzedzia))]))].sort();
  const grupy = GRUPY.map(g => {
    const pozycje = d.pozycje.filter(p => p.grupa === g.id);
    if (!pozycje.length) return "";
    const zw = ui.zwiniete.has(g.id);
    return `<div class="neuro-prod-grupa${zw ? " is-zwinieta" : ""}" data-grupa="${g.id}">
      <h4 data-akcja="zwin"><i class="fa-solid fa-caret-${zw ? "right" : "down"}" inert></i> ${g.ikona} ${g.label} <span class="licznik">(${pozycje.length})</span></h4>
      <ul>${pozycje.map(p => _htmlPozycja(p, d)).join("")}</ul></div>`;
  }).join("");
  return `<section class="neuro-prod-sekcja neuro-prod-przepisy">
    <header class="neuro-prod-filtry">
      <h3>Co umiesz zrobić</h3>
      <input type="search" name="szukaj" placeholder="szukaj…" value="${esc(ui.szukaj)}">
      <select name="narzedzie"><option value="">narzędzie — wszystkie</option>${narzedzia.map(k =>
        `<option value="${k}" ${ui.narzedzie === k ? "selected" : ""}>${esc(TOOL_KEYS[k] ?? k)}</option>`).join("")}</select>
      <select name="zrodlo">
        <option value="">źródło — wszystkie</option>
        ${[["proste", "Proste"], ["schemat", "Schemat"], ["wprawa", "Wprawa"]].map(([v, l]) => `<option value="${v}" ${ui.zrodlo === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </header>
    ${grupy || `<p class="neuro-prod-pusto">Nic — potrzebujesz biegłości w narzędziach, Schematu albo Wprawy.</p>`}
  </section>`;
}

function _htmlWprawa(d) {
  const wpr = [
    ...d.profesje.map(p => `<span class="neuro-prod-tag" data-tooltip="Wprawa z profesji: przepisy standardowe całej tabeli${d.kobalt ? " + cecha profesji (WKK)" : " + przepisy profesji"}">${esc(PROFESJE[p].label)} (profesja)</span>`),
    ...d.wprawa.map(w => {
      const nazwa = w.snapshot?.nazwa ?? KATALOG.get(w.przepisId?.replace(/^std\//, ""))?.nazwa ?? w.przepisId;
      const usun = game.user.isGM ? ` <a data-akcja="odbierz" data-przepis="${esc(w.przepisId)}" data-tooltip="Odbierz Wprawę"><i class="fa-solid fa-xmark" inert></i></a>` : "";
      return `<span class="neuro-prod-tag" data-tooltip="${esc(w.nota || "od MG")}">${esc(nazwa)}${w.nota ? ` <em>(MG: „${esc(w.nota)}”)</em>` : ""}${usun}</span>`;
    })
  ];
  const sch = d.schematy.map(i => `<span class="neuro-prod-tag">${esc(i.name)}</span>`);
  const mg = game.user.isGM ? `<div class="neuro-prod-mg">
      <button type="button" data-akcja="wprawa"><i class="fa-solid fa-graduation-cap" inert></i> Nadaj Wprawę</button>
      <button type="button" data-akcja="adhoc"><i class="fa-solid fa-screwdriver-wrench" inert></i> Robota ad hoc</button>
      <button type="button" data-akcja="miejsce"><i class="fa-solid fa-warehouse" inert></i> Nowe Miejsce</button></div>` : "";
  return `<section class="neuro-prod-sekcja neuro-prod-wprawa">
    <h3>Wprawa i Schematy</h3>
    <p><strong>Wprawa:</strong> ${wpr.length ? wpr.join(" ") : '<span class="hint">brak</span>'}</p>
    <p><strong>Schematy:</strong> ${sch.length ? sch.join(" ") : '<span class="hint">brak</span>'}</p>
    ${mg}
  </section>`;
}

/** Cała zakładka. */
export function htmlZakladki(d) {
  const ui = _stanUI(d.actor);
  const aktor = d.actor;
  const roboty = d.roboty.map(x => _htmlRobota({ ...x, aktor })).join("");
  const nicDoRoboty = !d.roboty.length && !d.doNaprawy.length && !d.pozycje.some(p => p.grupa === "gotowe" || p.grupa === "pula");
  const naprawy = d.doNaprawy.map(({ item, stan }) => `<li class="neuro-prod-naprawa" data-naprawa-id="${esc(item.id)}">
      <img src="${esc(item.img)}" alt="">
      <div class="neuro-prod-robota-main"><span class="nazwa">${esc(item.name)}</span>
        <div class="neuro-prod-sub">${esc(stan.opis)}</div></div>
      <div class="neuro-prod-akcje"><button type="button" data-akcja="napraw"><i class="fa-solid fa-hammer" inert></i> Napraw…</button></div>
    </li>`).join("");
  const warsztat = `<section class="neuro-prod-sekcja neuro-prod-warsztat">
    <h3>Na warsztacie ${d.roboty.length ? `<span class="licznik">(${d.roboty.length})</span>` : ""}</h3>
    ${roboty ? `<ul>${roboty}</ul>` : `<p class="neuro-prod-pusto">${nicDoRoboty
      ? "Nie masz tu nic do roboty. Schematy z plecaka możesz sprzedać."
      : "Żadnej Roboty w toku — zacznij coś z listy niżej."}</p>`}
    ${naprawy ? `<h4 class="neuro-prod-naprawy-h">Do naprawy</h4><ul class="neuro-prod-naprawy">${naprawy}</ul>` : ""}
  </section>`;
  return `<div class="neuro-prod">${warsztat}${_htmlSzybka(d)}${_htmlSurowce(d)}${_htmlPrzepisy(d, ui)}${_htmlWprawa(d)}</div>`;
}

/* -------------------------------------------- */
/*  Filtry, najechanie                          */
/* -------------------------------------------- */

function _filtruj(root, actor) {
  const ui = _stanUI(actor);
  const q = ui.szukaj.trim().toLowerCase();
  for (const g of root.querySelectorAll(".neuro-prod-grupa")) {
    let widoczne = 0;
    for (const li of g.querySelectorAll(".neuro-prod-przepis")) {
      const ok = (!q || li.dataset.nazwa.includes(q))
        && (!ui.narzedzie || li.dataset.narzedzia.split(" ").includes(ui.narzedzie))
        && (!ui.zrodlo || li.dataset.zrodla.split(" ").includes(ui.zrodlo));
      li.hidden = !ok;
      if (ok) widoczne++;
    }
    g.hidden = widoczne === 0;
    const licznik = g.querySelector(".licznik");
    if (licznik) licznik.textContent = `(${widoczne})`;
  }
}

function _pokazPotrzeby(root, need) {
  const skala = Number(root.querySelector(".neuro-prod-surowce")?.dataset.skala) || 10;
  const map = Object.fromEntries((need ?? "").split(",").filter(Boolean).map(x => x.split(":")).map(([k, v]) => [k, Number(v)]));
  for (const bar of root.querySelectorAll(".neuro-sur-bar")) {
    const typ = bar.dataset.typ;
    const n = map[typ] ?? 0;
    bar.style.setProperty("--need", `${Math.min(100, (n / skala) * 100)}%`);
    const own = parseFloat(bar.style.getPropertyValue("--own")) || 0;
    const pula = parseFloat(bar.style.getPropertyValue("--pula")) || 0;
    const needPct = (n / skala) * 100;
    bar.classList.toggle("is-need", n > 0);
    bar.classList.toggle("is-short", needPct > own + pula + 1e-6);
    bar.classList.toggle("is-pula", needPct > own + 1e-6 && needPct <= own + pula + 1e-6);
  }
}

/* -------------------------------------------- */
/*  Render i zdarzenia                          */
/* -------------------------------------------- */

function _root(html) {
  return html instanceof HTMLElement ? html : html?.[0] instanceof HTMLElement ? html[0] : html?.element ?? null;
}

async function _onKlik(ev, actor, d) {
  const el = ev.target.closest("[data-akcja]");
  if (!el) return;
  ev.preventDefault();
  ev.stopPropagation();
  const akcja = el.dataset.akcja;

  if (akcja === "zwin") {
    const g = el.closest(".neuro-prod-grupa");
    const ui = _stanUI(actor);
    if (ui.zwiniete.has(g.dataset.grupa)) ui.zwiniete.delete(g.dataset.grupa);
    else ui.zwiniete.add(g.dataset.grupa);
    g.classList.toggle("is-zwinieta");
    el.querySelector("i")?.classList.toggle("fa-caret-right");
    el.querySelector("i")?.classList.toggle("fa-caret-down");
    return;
  }
  if (akcja === "wprawa") return oknoWprawy(actor);
  if (akcja === "adhoc") return oknoAdHoc(actor);
  if (akcja === "miejsce") return noweMiejsce({ druzyna: druzynyAktora(actor)[0] ?? null });
  if (akcja === "dodaj-surowce") return oknoDodajSurowce(actor);
  if (akcja === "szybka-usun") { usunZKoszyka(actor, el.dataset.przepis); return actor.sheet.render(); }
  if (akcja === "szybka-wykonaj") {
    const o = ocenaKoszyka(actor);
    let mimo = false;
    if (o.braki.length) {
      mimo = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Szybka produkcja bez kompletu narzędzi" },
        content: `<p>Brakuje: ${esc(o.braki.map(b => `${b.przepis.nazwa} — ${formatToolExpr(b.brakuje)}`).join("; "))}.</p><p>Zrobić mimo to? Karta pokaże ⚠, MG zdecyduje.</p>`
      });
      if (!mimo) return;
    }
    await wykonajSzybka(actor, { mimoBrakow: mimo });
    return actor.sheet.render();
  }
  if (akcja === "odbierz") return odbierzWprawe(actor, el.dataset.przepis);
  if (akcja === "napraw") {
    const item = actor.items.get(el.closest("[data-naprawa-id]")?.dataset.naprawaId);
    return item ? oknoNaprawy(actor, item) : null;
  }

  const rob = el.closest(".neuro-prod-robota");
  if (rob) {
    const item = await fromUuid(rob.dataset.uuid);
    if (!item || !isRobota(item)) return ui.notifications.warn("Tej Roboty już nie ma.");
    if (akcja === "pracuj") return oknoPracy(item);
    if (akcja === "koryguj") return oknoKorekty(item);
    if (akcja === "menu") return menuRoboty(item);
    if (akcja === "test") return test(item);
    return;
  }

  const li = el.closest(".neuro-prod-przepis");
  if (li && akcja === "szybka-dodaj") {
    const poz = d.pozycje.find(p => (p.przepis.wynik.dane ? p.przepis.id : p.przepis.wynik.ref) === li.dataset.klucz);
    if (poz && dodajDoKoszyka(actor, poz.przepis)) actor.sheet.render();
    return;
  }
  if (li && akcja === "start") {
    const poz = d.pozycje.find(p => (p.przepis.wynik.dane ? p.przepis.id : p.przepis.wynik.ref) === li.dataset.klucz);
    if (!poz) return;
    return oknoStartu(actor, poz.alternatywy.map(a => a.przepis));
  }
}

function _podepnij(root, actor, d) {
  root.addEventListener("click", ev => _onKlik(ev, actor, d));
  root.addEventListener("input", ev => {
    const t = ev.target;
    const ui = _stanUI(actor);
    if (t.name === "szukaj") { ui.szukaj = t.value; _filtruj(root, actor); }
  });
  root.addEventListener("change", ev => {
    const t = ev.target;
    const ui = _stanUI(actor);
    if (t.name === "narzedzie") { ui.narzedzie = t.value; _filtruj(root, actor); }
    if (t.name === "zrodlo") { ui.zrodlo = t.value; _filtruj(root, actor); }
  });
  root.addEventListener("mouseover", ev => {
    const li = ev.target.closest(".neuro-prod-przepis");
    if (li) _pokazPotrzeby(root, li.dataset.need);
  });
  root.addEventListener("mouseleave", () => _pokazPotrzeby(root, ""), true);
  root.querySelector(".neuro-prod-przepisy")?.addEventListener("mouseleave", () => _pokazPotrzeby(root, ""));
}

/** Nakładka tylko w Ekwipunku: Robota zachowuje ikonę swojego wyniku. */
function _renderRobotaBadges(actor, root) {
  for (const item of actor.items) {
    if (!isRobota(item)) continue;
    const row = root.querySelector(`[data-item-id="${item.id}"]`);
    const icon = row?.querySelector(".item-name .item-image");
    if (!icon || icon.closest(".neuro-robota-ikona")) continue;
    const wrap = document.createElement("span");
    wrap.className = "neuro-robota-ikona";
    icon.before(wrap);
    wrap.appendChild(icon);
    const badge = document.createElement("img");
    badge.className = "neuro-robota-nakladka";
    badge.src = ROBOTA_BADGE;
    badge.alt = "";
    badge.setAttribute("aria-hidden", "true");
    wrap.appendChild(badge);
  }
}

function _onRenderRobotaBadges(app, html) {
  const actor = app.document ?? app.actor;
  const root = _root(html);
  if (actor?.items && root) _renderRobotaBadges(actor, root);
}

function _onRender(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;
  const el = _root(html);
  const host = el?.querySelector(".neuro-produkcja-root");
  if (!host) return;
  let d;
  try {
    d = daneZakladki(actor);
  } catch (err) {
    console.error(`${MODULE_ID} | zakładka Produkcja`, err);
    host.innerHTML = `<p class="neuro-prod-pusto">Błąd zakładki Produkcja — szczegóły w konsoli.</p>`;
    return;
  }
  host.innerHTML = htmlZakladki(d);
  const root = host.querySelector(".neuro-prod");
  _podepnij(root, actor, d);
  _filtruj(root, actor);

  // Plakietka z liczbą Robót na zakładce (§1.1).
  const tab = el.querySelector('nav.tabs [data-tab="produkcja"]');
  if (tab) {
    tab.querySelector(".neuro-tab-plakietka")?.remove();
    if (d.roboty.length) {
      const b = document.createElement("span");
      b.className = "neuro-tab-plakietka";
      b.textContent = String(d.roboty.length);
      if (d.roboty.some(x => x.r.stan === "test")) b.classList.add("is-test");
      tab.appendChild(b);
    }
  }
}

/* -------------------------------------------- */
/*  Odświeżanie przy zmianach poza postacią      */
/* -------------------------------------------- */

const _doOdswiezenia = new Set();
let _timer = null;

/** Karty postaci, na które wpływa zmiana przedmiotu u `parent` (Robota, surowiec, zestaw). */
function _dotknieteKarty(item) {
  const parent = item.parent;
  if (!(parent instanceof Actor)) return;
  if (isRobota(item)) {
    const kier = game.actors.get(item.flags[MODULE_ID].robota.kierownikId);
    if (kier) _doOdswiezenia.add(kier);
  }
  // Zmiana w pojeździe albo Miejscu przesuwa pulę wszystkich członków drużyny.
  if (parent.type === "vehicle" || isMiejsce(parent)) {
    if (isRobota(item) || getSurowiecType(item) || item.type === "tool") {
      for (const a of game.actors) if (a.type === "character" && a.sheet?.rendered) _doOdswiezenia.add(a);
    }
  }
  if (!_doOdswiezenia.size) return;
  clearTimeout(_timer);
  _timer = setTimeout(() => {
    for (const a of _doOdswiezenia) if (a.sheet?.rendered && a !== parent) a.sheet.render();
    _doOdswiezenia.clear();
  }, 150);
}

export function registerZakladka() {
  // Wspólny hak: Robota może być również w pojeździe albo Miejscu.
  Hooks.on("renderActorSheetV2", _onRenderRobotaBadges);
  Hooks.on("renderCharacterActorSheet", _onRender);
  for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, _dotknieteKarty);
  Hooks.once("ready", () => { przygotujIkony().catch(err => console.warn(`${MODULE_ID} | ikony produkcji`, err)); });
}

export const __testing = Object.freeze({ GRUPY });
