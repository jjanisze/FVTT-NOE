/**
 * Neuroshima 5e — geometria pojazdu (PLAN_m4_pojazdy §4.1, §4.3). Czyste funkcje, bez Foundry.
 *
 * ## Układ współrzędnych pojazdu
 *
 * Grafika pojazdu leży **przodem w dół** (konwencja żetonów dnd5e: `rotation: 0` = patrzy na
 * południe). W układzie pojazdu, w kratkach od jego środka:
 *  - `y` dodatnie = **przód**, `x` dodatnie = **lewa burta** pojazdu (siedząc przodem w dół, lewa
 *    ręka wskazuje wschód). Kierowca siedzi z lewej (Ameryka, Polska), więc ma `x > 0`.
 *  - Obrót żetonu w Foundry rośnie zgodnie z ruchem wskazówek zegara (oś y ekranu w dół), więc
 *    zwykła macierz obrotu daje dokładnie to, co rysuje PIXI przy `mesh.angle = rotation`.
 *
 * ## Obrys w czterech kierunkach (§4.3)
 *
 * Rdzeń liczy kratki, kliknięcia i odległości z `width`/`height` bez obrotu. Pojazd ma obrys
 * naturalny `{w, h}` (szerokość × długość przy obrocie 0); gdy kierunek jazdy jest bliżej poziomu,
 * żeton dostaje `width`↔`height` zamienione, a grafika zawsze rysuje się w obrysie naturalnym i
 * obraca w środku. Skosy przybliża najbliższy kierunek.
 */

/** Kwadrant kierunku: 0 = przodem w dół, 1 = w lewo (90°), 2 = w górę, 3 = w prawo. */
export function kwadrant(rotacja) {
  const q = Math.round((Number(rotacja) || 0) / 90) % 4;
  return (q + 4) % 4;
}

/**
 * Obrys żetonu (kratki) przy danym obrocie.
 * @param {{w: number, h: number}} naturalny  szerokość × długość przy obrocie 0
 * @param {number} rotacja
 * @returns {{w: number, h: number}}
 */
export function obrysPrzyObrocie(naturalny, rotacja) {
  return kwadrant(rotacja) % 2 ? { w: naturalny.h, h: naturalny.w } : { w: naturalny.w, h: naturalny.h };
}

/** Czy obrys żetonu `{w, h}` (kratki pojazdu) jest naturalnym obrysem obróconym o 90°. */
export function obrysZamieniony(naturalny, w, h) {
  if (naturalny.w === naturalny.h) return false;
  return Math.abs(w - naturalny.h) < 1e-3 && Math.abs(h - naturalny.w) < 1e-3;
}

/**
 * Obrót punktu wokół początku układu, zgodnie z rotacją żetonu (stopnie, zgodnie ze wskazówkami).
 * @returns {{x: number, y: number}}
 */
export function obroc({ x, y }, stopnie) {
  const r = (Number(stopnie) || 0) * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Kąt w stopniach sprowadzony do [0, 360). */
export function normalizujKat(stopnie) {
  return (((Number(stopnie) || 0) % 360) + 360) % 360;
}

/** Najmniejsza różnica kątów (stopnie, 0–180). */
export function roznicaKatow(a, b) {
  const d = Math.abs(normalizujKat(a) - normalizujKat(b));
  return d > 180 ? 360 - d : d;
}

/* -------------------------------------------- */
/*  Miejsca                                      */
/* -------------------------------------------- */

/**
 * @typedef {object} Strefa
 * @property {string} id          „kabina”, „paka”, „desant”, „wiezyczka”… (zmiana strefy w jadącym
 *                                pojeździe = zmiana rzędu, WKK §4.10)
 * @property {string} [nazwa]
 * @property {number} od          początek strefy od przodu, ułamek długości (0 = zderzak)
 * @property {number} do          koniec strefy od przodu, ułamek długości
 * @property {number[]} rzedy     liczba miejsc w kolejnych rzędach, od przodu
 * @property {number[][]} [kolumny] środki miejsc w każdym rzędzie: ułamek szerokości od lewej obrazu
 * @property {number[][]} [obroty] początkowy obrót postaci na każdym miejscu względem pojazdu (stopnie)
 * @property {boolean} [kierowca] pierwsze miejsce pierwszego rzędu to kierowca (domyślnie: pierwsza strefa)
 * @property {boolean} [stanowisko] miejsca strefy są stanowiskami broni montowanej
 * @property {string} [oslona]    „polowa”, „trzyCzwarte”, „calkowita” — podpowiedź dla okna osłony (§4.6)
 * @property {boolean} [stojace]  miejsca stojące (paka ciężarówki)
 * @property {{widocznosc?: "zakryta"|"otwarta", warstwa?: "nad"|"pod"}} [prezentacja] widok jadącego, niezależny od osłony
 */

/**
 * @typedef {object} Miejsce
 * @property {string} id       `${strefa}-${rzad}-${i}` — stabilne, trzymane we fladze jadącego
 * @property {string} strefa
 * @property {number} rzad     numer rzędu w całym pojeździe, od przodu (do kosztu przesiadki)
 * @property {number} x        kratki od środka, + = lewa burta
 * @property {number} y        kratki od środka, + = przód
 * @property {boolean} kierowca
 * @property {boolean} stanowisko
 * @property {string|null} oslona
 * @property {boolean} stojace
 * @property {number} [obrot] początkowy obrót względem pojazdu; później postać może obrócić się sama
 * @property {{widocznosc?: "zakryta"|"otwarta", warstwa?: "nad"|"pod"}} [prezentacja]
 */

/** Rozmiar żetonu jadącego w kratkach (D2: „zmniejszone do miejsca”). */
export const ROZMIAR_MIEJSCA = 0.5;

/**
 * Rozkład miejsc w obrysie. Bez dokładnych foteli (D3): rzędy równo w paśmie strefy, miejsca w
 * rzędzie równo na 80% szerokości, od lewej burty (kierowca) do prawej.
 * @param {{w: number, h: number}} obrys  naturalny, kratki
 * @param {Strefa[]} strefy
 * @returns {Miejsce[]}
 */
export function ukladMiejsc(obrys, strefy) {
  const miejsca = [];
  let rzadGlobalny = 0;
  const zKierowca = strefy.findIndex(s => s.kierowca);
  strefy.forEach((strefa, si) => {
    const rzedy = strefa.rzedy ?? [];
    const n = rzedy.length;
    rzedy.forEach((ile, ri) => {
      // Środek rzędu w paśmie strefy; jeden rząd — środek pasma.
      const t = n === 1 ? 0.5 : ri / (n - 1);
      const odPrzodu = strefa.od + (strefa.do - strefa.od) * t;
      const y = obrys.h / 2 - odPrzodu * obrys.h;
      const szer = Math.max(0, obrys.w * 0.8 - ROZMIAR_MIEJSCA);
      for (let i = 0; i < ile; i++) {
        const u = ile === 1 ? 0.5 : i / (ile - 1);
        const kolumna = strefa.kolumny?.[ri]?.[i];
        const maKolumne = Number.isFinite(kolumna);
        const x = maKolumne ? (kolumna - 0.5) * obrys.w : ile === 1 ? 0 : szer / 2 - u * szer;
        const kierowca = ri === 0 && i === 0 && (zKierowca >= 0 ? si === zKierowca : si === 0);
        miejsca.push({
          id: `${strefa.id}-${ri}-${i}`, strefa: strefa.id, rzad: rzadGlobalny,
          x: zaokr(!maKolumne && kierowca && ile === 1 && obrys.w > 1 ? Math.min(szer / 2, 0.35) : x), y: zaokr(y),
          kierowca, stanowisko: !!strefa.stanowisko, oslona: strefa.oslona ?? null, stojace: !!strefa.stojace,
          ...(strefa.prezentacja ? { prezentacja: { ...strefa.prezentacja } } : {}),
          ...(Number.isFinite(strefa.obroty?.[ri]?.[i]) ? { obrot: normalizujKat(strefa.obroty[ri][i]) } : {})
        });
      }
      rzadGlobalny += 1;
    });
  });
  return miejsca;
}

const zaokr = v => Math.round(v * 1000) / 1000;

/**
 * Środek miejsca na scenie (piksele).
 * @param {{x: number, y: number}} srodekPojazdu  piksele
 * @param {number} rotacja                        obrót żetonu pojazdu
 * @param {{x: number, y: number}} miejsce        kratki w układzie pojazdu
 * @param {number} kratka                         rozmiar kratki w pikselach
 */
export function srodekMiejsca(srodekPojazdu, rotacja, miejsce, kratka) {
  const p = obroc({ x: miejsce.x * kratka, y: miejsce.y * kratka }, rotacja);
  return { x: srodekPojazdu.x + p.x, y: srodekPojazdu.y + p.y };
}

/**
 * Lewy górny róg żetonu o rozmiarze `w × h` kratek, którego środek ma leżeć w `srodek`.
 * @returns {{x: number, y: number}}
 */
export function naroznikDlaSrodka(srodek, w, h, kratka) {
  return { x: Math.round(srodek.x - w * kratka / 2), y: Math.round(srodek.y - h * kratka / 2) };
}

/**
 * Czy punkt sceny leży w obróconym prostokącie pojazdu.
 * @param {{x: number, y: number}} punkt
 * @param {{x: number, y: number}} srodek
 * @param {{w: number, h: number}} naturalny  kratki
 * @param {number} rotacja
 * @param {number} kratka
 * @param {number} [margines=0]  kratki
 */
export function punktWPojezdzie(punkt, srodek, naturalny, rotacja, kratka, margines = 0) {
  const lok = obroc({ x: punkt.x - srodek.x, y: punkt.y - srodek.y }, -rotacja);
  return Math.abs(lok.x) <= (naturalny.w / 2 + margines) * kratka
    && Math.abs(lok.y) <= (naturalny.h / 2 + margines) * kratka;
}
