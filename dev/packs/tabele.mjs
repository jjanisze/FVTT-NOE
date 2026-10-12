/**
 * Neuroshima 5e — paczka `tabele` (RollTable) z danych szabrowania i Fantów (PLAN_m5_postoj.md §7.17, U14).
 *
 * Ta sama treść, której używa silnik losowania w module (`scripts/config/szabrowanie-data.mjs`, `fanty-data.mjs`),
 * dla MG, który woli losować natywnie: komplikacje szabrowania (k10), Tabela losowych przedmiotów (k100) z
 * odnośnikami do tabel kategorii, kolumny k100/k12 tabel sprzętu, kategorie bez kolumny jako tabele ważone
 * dostępnością (D9), Fanty (k100), Zdobyczna apteczka. Wyniki-dokumenty wskazują przedmioty paczek modułu,
 * Schematy, aktorów Bestiariusza i tabele tej paczki (core losuje zagnieżdżone tabele rekurencyjnie).
 *
 * Klucze LevelDB jak w paczce RollTable core: `!tables!<id>`, `!tables.results!<tableId>.<resultId>`,
 * `!folders!<id>`; pole `results` tabeli trzyma identyfikatory.
 */

import fs from "node:fs";
import {
  KOMPLIKACJE, LOSOWE_PRZEDMIOTY, TABELE_K100, TABELE_K12, pozycjeKategorii
} from "../../scripts/config/szabrowanie-data.mjs";
import { FANTY, idFantu, FANT_RZUC_DWA_RAZY } from "../../scripts/config/fanty-data.mjs";
import { KATALOG } from "../../scripts/config/recipes-data.mjs";
import { BESTIARY } from "../../scripts/config/bestiary-data.mjs";
import { uuidWKompendium } from "../../scripts/production/wynik.mjs";

const IKONA = "icons/svg/d20-black.svg";
const IKONA_TEKSTU = "icons/svg/book.svg";

/**
 * Tabele paczki.
 * @param {{idFor: (kind: string, slug: string) => string, MODULE_ID: string}} o
 * @returns {Promise<{tables: object[], folders: object[]}>}  tabela z `results` jako dokumentami (zapis rozdziela)
 */
export async function budujTabele({ idFor, MODULE_ID }) {
  const uuidTabeli = key => `Compendium.${MODULE_ID}.tabele.RollTable.${idFor("tabela", key)}`;
  const uuidIstoty = id => `Compendium.${MODULE_ID}.bestiariusz.Actor.${idFor("bestiary", id)}`;
  const nazwaIstoty = id => BESTIARY[id]?.name ?? id;
  const FOLDER_SZAB = idFor("tabela-folder", "szabrowanie");
  const FOLDER_KAT = idFor("tabela-folder", "kategorie");
  const folders = [
    { _id: FOLDER_SZAB, name: "Szabrowanie i Fanty", type: "RollTable", folder: null, sorting: "m", sort: 0, color: null, flags: {}, description: "" },
    { _id: FOLDER_KAT, name: "Kategorie przedmiotów", type: "RollTable", folder: null, sorting: "a", sort: 100000, color: null, flags: {}, description: "" }
  ];
  const tables = [];

  const wynikTekst = (key, i, { name, opis = "", od, do_, weight = 1 }) => ({
    _id: idFor("tabela-wynik", `${key}.${i}`), type: "text", name, img: IKONA_TEKSTU, description: opis,
    weight, range: [od, do_], drawn: false, flags: {}
  });
  const wynikDok = (key, i, { name, uuid, opis = "", od, do_, weight = 1 }) => ({
    _id: idFor("tabela-wynik", `${key}.${i}`), type: "document", name, description: opis, documentUuid: uuid,
    weight, range: [od, do_], drawn: false, flags: {}
  });
  const tabela = (key, { name, formula, opis = "", folder, sort, results }) => {
    tables.push({
      _id: idFor("tabela", key), name, img: IKONA, description: opis, formula, replacement: true, displayRoll: true,
      folder, sort, ownership: { default: 0 }, flags: { [MODULE_ID]: { tabela: key } }, results
    });
  };

  /** Wiersz tabeli sprzętu: dokument z paczki, gdy jest; inaczej tekst z ceną i wagą. */
  const wierszSprzetu = async (key, i, w, { k12aktor = false } = {}) => {
    const zakres = { od: w.od, do_: w.do };
    if (w.rzucDwa) return wynikTekst(key, i, { name: "Rzuć dwa razy", opis: "<p>Rzuć jeszcze dwa razy na tej tabeli.</p>", ...zakres });
    if (k12aktor && w.istota && BESTIARY[w.istota]) {
      return wynikDok(key, i, { name: w.nazwa, uuid: uuidIstoty(w.istota), opis: `<p>Istota żywa — aktor, nie przedmiot (karta MG). Cena ${w.cena} gb.</p>`, ...zakres });
    }
    const uuid = w.ref ? await uuidWKompendium(w.ref) : null;
    const ilosc = w.ilosc > 1 ? ` ×${w.ilosc}` : "";
    if (uuid) return wynikDok(key, i, { name: `${w.nazwa}${ilosc}`, uuid, ...zakres });
    const cena = w.cena !== null && w.cena !== undefined ? `${w.cena} gb` : null;
    const waga = w.waga !== null && w.waga !== undefined ? `${w.waga} kg` : null;
    const kat = w.ref ? KATALOG.get(w.ref) : null;
    const szczegoly = [cena ?? (kat?.cena !== undefined ? `${kat.cena} gb` : null), waga ?? (kat?.waga !== undefined ? `${kat.waga} kg` : null)].filter(Boolean).join(", ");
    return wynikTekst(key, i, { name: `${w.nazwa}${ilosc}`, opis: szczegoly ? `<p>${szczegoly}${k12aktor ? " — istota żywa, karta MG" : ""}.</p>` : "", ...zakres });
  };

  // Kolumny k100 i k12 tabel sprzętu.
  let sort = 0;
  for (const [key, t] of Object.entries(TABELE_K100)) {
    const results = [];
    for (const [i, w] of t.wiersze.entries()) results.push(await wierszSprzetu(key, i, w));
    tabela(key, { name: `${t.label} (k100)`, formula: "1d100", opis: `<p>NOE s. ${t.s}.</p>`, folder: FOLDER_KAT, sort: sort++, results });
  }
  for (const [key, t] of Object.entries(TABELE_K12)) {
    const results = [];
    for (const [i, w] of t.wiersze.entries()) results.push(await wierszSprzetu(key, i, w, { k12aktor: !!t.aktor }));
    tabela(key, { name: `${t.label} (k12)`, formula: "1d12", opis: `<p>NOE s. ${t.s}.</p>`, folder: FOLDER_KAT, sort: sort++, results });
  }

  // Kategorie bez kolumny k100: los ważony dostępnością (D9).
  const katalog = [...KATALOG.values()];
  const katWazone = new Map();
  for (const k of LOSOWE_PRZEDMIOTY.filter(x => x.katalog)) {
    const key = `kat-${idFor("kat", k.nazwa).slice(0, 8)}`;
    const pozycje = pozycjeKategorii(k, katalog).filter(p => (Number(p.dostepnosc) || 0) > 0)
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
    let od = 1;
    const results = [];
    for (const [i, p] of pozycje.entries()) {
      const w = Math.max(1, Math.round(Number(p.dostepnosc)));
      const uuid = await uuidWKompendium(p.ref);
      const zakres = { od, do_: od + w - 1, weight: w };
      results.push(uuid ? wynikDok(key, i, { name: p.nazwa, uuid, ...zakres }) : wynikTekst(key, i, { name: p.nazwa, opis: `<p>${p.cena} gb, ${p.waga} kg.</p>`, ...zakres }));
      od += w;
    }
    if (!results.length) continue;
    katWazone.set(k.nazwa, key);
    tabela(key, {
      name: `${k.nazwa} (wg dostępności)`, formula: `1d${od - 1}`, folder: FOLDER_KAT, sort: sort++, results,
      opis: `<p>NOE s. ${k.s}. Tabela nie ma kolumny k100 — los ważony dostępnością pozycji (odczyt MG, D9).</p>`
    });
  }

  // Tabela losowych przedmiotów (s. 271).
  {
    const key = "losowe-przedmioty";
    const results = [];
    for (const [i, k] of LOSOWE_PRZEDMIOTY.entries()) {
      const zakres = { od: k.od, do_: k.do };
      if (k.rzucDwa) results.push(wynikTekst(key, i, { name: "Rzuć dwa razy", opis: "<p>Rzuć jeszcze dwa razy na tej tabeli.</p>", ...zakres }));
      else if (k.tabela) results.push(wynikDok(key, i, { name: k.nazwa, uuid: uuidTabeli(k.tabela), ...zakres }));
      else if (katWazone.has(k.nazwa)) results.push(wynikDok(key, i, { name: k.nazwa, uuid: uuidTabeli(katWazone.get(k.nazwa)), ...zakres }));
      else if (k.schemat) results.push(wynikDok(key, i, { name: k.nazwa, uuid: `Compendium.${MODULE_ID}.schematy.Item.${idFor("schemat", k.schemat)}`, ...zakres }));
      else results.push(wynikTekst(key, i, { name: k.nazwa, opis: `<p>${k.pojazd ? "Sprawny pojazd — karta MG (aktor)" : "Karta MG"}${k.s ? `, NOE s. ${k.s}` : ""}.</p>`, ...zakres }));
    }
    tabela(key, { name: "Losowe przedmioty (k100)", formula: "1d100", folder: FOLDER_SZAB, sort: 10, results,
      opis: "<p>NOE s. 271 — wynik szabrowania ≥ 20. Kategorie prowadzą do swoich tabel.</p>" });
  }

  // Komplikacje szabrowania (s. 270).
  {
    const key = "komplikacje";
    const results = KOMPLIKACJE.map((k, i) => {
      const linie = [];
      if (k.mieszkancy) {
        linie.push("<p>k4:</p><ul>" + k.mieszkancy.map(m => `<li>${m.k4} — ${m.liczba} × ${BESTIARY[m.istota]
          ? `@UUID[${uuidIstoty(m.istota)}]{${nazwaIstoty(m.istota)}}` : nazwaIstoty(m.istota)}</li>`).join("") + "</ul>");
      }
      if (k.zauwazenie) linie.push(`<p>Zauważenie: pasywna Percepcja ${k.zauwazenie}${k.rozbrojenie ? `; rozbrojenie ST ${k.rozbrojenie}` : ""}.</p>`);
      if (k.ro) linie.push(`<p>RO ${k.ro.cecha.toUpperCase()} ST ${k.ro.st}${k.obszar ? `, obszar ${k.obszar.bok} m` : ""}.</p>`);
      if (k.obrazenia) linie.push(`<p>Obrażenia: ${k.obrazenia.map(o => o.wzor).join(" + ")}${k.polowa ? " (połowa przy udanym RO)" : ""}.</p>`);
      if (k.poziom) linie.push(`<p>Poziom skażenia: ${k.poziom}.</p>`);
      if (k.maskaChroni) linie.push("<p>Maska przeciwgazowa chroni.</p>");
      return wynikTekst(key, i, { name: k.label, opis: linie.join(""), od: k.k10, do_: k.k10 });
    });
    tabela(key, { name: "Komplikacje szabrowania (k10)", formula: "1d10", folder: FOLDER_SZAB, sort: 0, results,
      opis: "<p>NOE s. 270. Najpierw k100 ≤ szansa komplikacji ruiny (s. 271), potem k10. MG może wstawić coś innego.</p>" });
  }

  // Fanty (s. 132–133).
  {
    const key = "fanty";
    const results = FANTY.map((f, i) => wynikDok(key, i, {
      name: f.nazwa, uuid: `Compendium.${MODULE_ID}.sprzet.Item.${idFor("fant", idFantu(f))}`, od: f.od, do_: f.do
    }));
    results.push(wynikTekst(key, FANTY.length, { name: "Rzuć dwa razy", opis: "<p>Rzuć jeszcze dwa razy na tej tabeli.</p>", od: FANT_RZUC_DWA_RAZY, do_: FANT_RZUC_DWA_RAZY }));
    tabela(key, { name: "Fanty (k100)", formula: "1d100", folder: FOLDER_SZAB, sort: 20, results,
      opis: "<p>NOE s. 132–133 — także naturalna 20 przy szabrowaniu (s. 271).</p>" });
  }

  // Zdobyczna apteczka (s. 132): dwa rzuty na Lekarstwa, po 2k10 dawek.
  tabela("zdobyczna-apteczka", {
    name: "Zdobyczna apteczka", formula: "1d1", folder: FOLDER_SZAB, sort: 30,
    opis: "<p>NOE s. 132: dwa rzuty k100 na Lekarstwa, po 2k10 dawek każdego.</p>",
    results: [
      wynikDok("zdobyczna-apteczka", 0, { name: "Lekarstwa — pierwszy rzut (2k10 dawek)", uuid: uuidTabeli("lekarstwa"), od: 1, do_: 1 }),
      wynikDok("zdobyczna-apteczka", 1, { name: "Lekarstwa — drugi rzut (2k10 dawek)", uuid: uuidTabeli("lekarstwa"), od: 1, do_: 1 })
    ]
  });

  return { tables, folders };
}

/**
 * Domknięcie tabel (U14, warstwa 1): zakresy ciągłe od 1 do maksimum formuły, bez nakładek.
 * @returns {string[]} błędy
 */
export function bledyTabel(tables) {
  const out = [];
  for (const t of tables) {
    const m = /^1d(\d+)$/.exec(t.formula ?? "");
    if (!m) { out.push(`${t.name}: formuła ${t.formula}`); continue; }
    const max = Number(m[1]);
    if (t.flags && Object.values(t.flags)[0]?.tabela === "zdobyczna-apteczka") continue;
    const zakresy = [...t.results].map(r => r.range).sort((a, b) => a[0] - b[0]);
    let nast = 1;
    for (const [od, do_] of zakresy) {
      if (od !== nast) out.push(`${t.name}: ${od < nast ? "nakładka" : "luka"} przy ${nast}`);
      nast = do_ + 1;
    }
    if (nast !== max + 1) out.push(`${t.name}: koniec ${nast - 1} ≠ ${max}`);
  }
  return out;
}

/** Zapis paczki RollTable (LevelDB). `stats()` — `_stats` jak reszta paczek. */
export async function zapiszTabele(dir, { tables, folders }, { ClassicLevel, stats }) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    if (err.code === "EPERM" || err.code === "EBUSY") {
      console.error(`\nCannot rewrite ${dir} — FoundryVTT is running and holds the LevelDB open.`);
      process.exit(2);
    }
    throw err;
  }
  fs.mkdirSync(dir, { recursive: true });
  const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  const batch = db.batch();
  let n = 0;
  for (const { results, ...t } of tables) {
    batch.put(`!tables!${t._id}`, { ...t, results: results.map(r => r._id), _stats: stats() });
    for (const r of results) {
      const { documentUuid, ...reszta } = r;
      batch.put(`!tables.results!${t._id}.${r._id}`, { ...reszta, ...(documentUuid ? { documentUuid } : {}), _stats: stats() });
      n++;
    }
  }
  for (const f of folders) batch.put(`!folders!${f._id}`, { ...f, _stats: stats() });
  await batch.write();
  await db.close();
  console.log(`  ${"tabele".padEnd(20)} ${String(tables.length).padStart(3)} tables, ${n} results, ${folders.length} folders`);
}
