/**
 * Neuroshima 5e — OSD kamery drona: czysty układ (PLAN_m3_towarzysze.md §7.10, D34, D38; E8c).
 *
 * Bez Foundry: stan → lista napisów w komórkach siatki znaków MAX7456 (12 × 18 px, czcionka Betaflight z
 * `fonts/osd/`). Rysuje `actors/drony-osd.mjs`. Każdy element ma funkcję (D34) — bez sztucznego horyzontu,
 * szewronów i celownika:
 *   - lewy górny róg — RSSI: ikona anteny, liczba 0–99 i cztery kreski (pasek postępu z czcionki);
 *   - góra, środek — nazwa drona;
 *   - prawy górny róg — zasilanie: bateria i pozostały czas (funkcjonalny odpowiednik napięcia);
 *   - dół, środek — tryb (ACRO latający, WALK kroczący) i aktywacja (AKCJA, BONUS); to samo pole miga
 *     ostrzeżeniami: FAILSAFE, RSSI LOW, BAT LOW, skróty awarii;
 *   - lewy dół — lista akcji tej aktywacji, dwie linie przewijane co sekundę; poza walką listy nie ma;
 *   - prawy dół — ARMED (miga, póki atak do wykonania) i licznik naboi (0 miga); bez broni nie ma; PW.
 * Napisy wielkimi literami ASCII, bez polskich liter (D38) — czcionka nie ma małych liter.
 */

/** Kody znaków czcionki (Betaflight `src/main/drivers/osd_symbols.h`). */
export const ZNAK = Object.freeze({
  RSSI: 0x01,
  PASEK_START: 0x8A,
  PASEK_PELNY: 0x8B,
  PASEK_PUSTY: 0x8D,
  PASEK_KONIEC: 0x8E,
  /** Bateria od pełnej (0x90) do pustej (0x96). */
  BATERIA: Object.freeze([0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96])
});

const C = n => String.fromCharCode(n);

/** Tekst dla OSD: wielkie litery ASCII 0x20–0x5F, bez polskich znaków; reszta → spacja. */
export function tekstOsd(s) {
  return String(s ?? "")
    .replace(/[łŁ]/g, "L")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^\x20-\x5f]/g, " ");
}

/** RSSI: `\x01` + 2 cyfry + pasek z 4 kresek. */
export function liniaRssi({ wartosc = 0, kreski = 0 } = {}) {
  const k = Math.max(0, Math.min(4, kreski | 0));
  const pasek = C(ZNAK.PASEK_START) + C(ZNAK.PASEK_PELNY).repeat(k) + C(ZNAK.PASEK_PUSTY).repeat(4 - k) + C(ZNAK.PASEK_KONIEC);
  return `${C(ZNAK.RSSI)}${String(Math.max(0, Math.min(99, Math.round(wartosc)))).padStart(2, "0")}${pasek}`;
}

/** Zasilanie: znak baterii wg procentu i pozostały czas `G:MM`. */
export function liniaZasilania({ procent = 100, minuty = null } = {}) {
  const p = Math.max(0, Math.min(100, Number(procent) || 0));
  const bat = ZNAK.BATERIA[Math.min(6, Math.floor((100 - p) / (100 / 6)))];
  const m = Number.isFinite(minuty) ? Math.max(0, Math.floor(minuty)) : null;
  const czas = m === null ? "-:--" : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  return `${C(bat)}${czas}`;
}

/** Progi ostrzeżeń OSD. RSSI LOW liczy się z prawdziwej jakości, nie z pływającej liczby. */
export const PROG_RSSI_LOW = 0.25;
export const PROG_BAT_LOW = 20;

/**
 * Ostrzeżenia w polu trybu, w kolejności ważności.
 * @param {{failsafe?: boolean, jakosc?: number, procent?: number, awarie?: string[]}} p
 */
export function ostrzezeniaOsd({ failsafe = false, jakosc = 1, procent = 100, awarie = [] } = {}) {
  const out = [];
  if (failsafe) out.push("FAILSAFE");
  else if (jakosc < PROG_RSSI_LOW) out.push("RSSI LOW");
  if (procent < PROG_BAT_LOW) out.push("BAT LOW");
  for (const a of awarie) if (a) out.push(tekstOsd(a));
  return out;
}

const AKTYWACJA = Object.freeze({ A: "AKCJA", B: "BONUS" });

/**
 * Układ OSD.
 * @param {object} stan
 * @param {string} stan.nazwa
 * @param {{wartosc: number, kreski: number}} stan.rssi
 * @param {"ACRO"|"WALK"} stan.tryb
 * @param {"A"|"B"|null} [stan.aktywacja]
 * @param {string[]} [stan.ostrzezenia]
 * @param {string[]|null} [stan.akcje]    skróty akcji (`zakresAktywacji`); `null` — poza walką
 * @param {boolean} [stan.bron]           dron ma broń — jest element ARMED / licznik
 * @param {boolean} [stan.uzbrojony]      atak do wykonania w tym sterowaniu
 * @param {number|null} [stan.amunicja]   naboje w magazynku; `null` — broń bez magazynka
 * @param {[number, number]} stan.pw
 * @param {{procent: number, minuty: number|null}} stan.zasilanie
 * @param {string|null} [stan.powitanie]  ekran powitalny kontrolera („System ruszył …”)
 * @param {number} [stan.czas]            sekundy — przewijanie i cykl ostrzeżeń
 * @param {{kolumny?: number, wiersze?: number}} [siatka]
 * @returns {{x: number, y: number, tekst: string, miga?: boolean, id: string}[]}
 */
export function ukladOsd(stan, { kolumny = 30, wiersze = 16 } = {}) {
  const out = [];
  const dodaj = (id, x, y, tekst, miga = false) => { if (tekst) out.push({ id, x, y, tekst, miga }); };
  const prawo = (t, y) => Math.max(0, kolumny - 1 - t.length);
  const srodek = t => Math.max(0, Math.floor((kolumny - t.length) / 2));
  const czas = Math.max(0, Number(stan.czas) || 0);
  const dol = wiersze - 2;

  dodaj("rssi", 1, 1, liniaRssi(stan.rssi));
  const nazwa = tekstOsd(stan.nazwa).slice(0, Math.max(0, kolumny - 20)).trim();
  dodaj("nazwa", srodek(nazwa), 1, nazwa);
  const zas = liniaZasilania(stan.zasilanie);
  dodaj("zasilanie", prawo(zas, 1), 1, zas);

  const ostrz = stan.ostrzezenia ?? [];
  if (ostrz.length) {
    const t = ostrz[Math.floor(czas) % ostrz.length];
    dodaj("tryb", srodek(t), dol, t, true);
  } else {
    const t = `${stan.tryb}${stan.aktywacja && AKTYWACJA[stan.aktywacja] ? ` ${AKTYWACJA[stan.aktywacja]}` : ""}`;
    dodaj("tryb", srodek(t), dol, t);
  }

  const akcje = stan.akcje;
  if (akcje?.length) {
    const n = akcje.length;
    const k = n > 2 ? Math.floor(czas) % n : 0;
    dodaj("akcja1", 1, dol - 1, tekstOsd(akcje[k]));
    if (n > 1) dodaj("akcja2", 1, dol, tekstOsd(akcje[(k + 1) % n]));
  }

  const pw = `PW ${Math.max(0, Math.round(stan.pw?.[0] ?? 0))}/${Math.round(stan.pw?.[1] ?? 0)}`;
  dodaj("pw", prawo(pw, dol), dol, pw);
  if (stan.bron) {
    const licznik = stan.amunicja === null || stan.amunicja === undefined ? "" : String(Math.max(0, stan.amunicja | 0));
    const xL = prawo(licznik, dol - 1);
    if (licznik) dodaj("amunicja", xL, dol - 1, licznik, stan.amunicja <= 0);
    if (stan.uzbrojony) dodaj("armed", Math.max(0, (licznik ? xL - 1 : kolumny - 1) - 5), dol - 1, "ARMED", true);
  }

  if (stan.powitanie) {
    const slowa = tekstOsd(stan.powitanie).split(/\s+/).filter(Boolean);
    const linie = [];
    let l = "";
    for (const w of slowa) {
      if (l && (l.length + 1 + w.length) > kolumny - 4) { linie.push(l); l = w; }
      else l = l ? `${l} ${w}` : w;
    }
    if (l) linie.push(l);
    const y0 = Math.floor(wiersze / 2) - Math.floor(linie.length / 2);
    linie.forEach((t, i) => dodaj(`powitanie${i}`, srodek(t), y0 + i, t));
  }
  return out;
}
