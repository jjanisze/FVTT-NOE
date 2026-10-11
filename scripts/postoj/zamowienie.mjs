/**
 * Neuroshima 5e — zamówienie specjalne (PLAN_m5_postoj.md §7.5, D28, U44).
 *
 * Szukanie przedmiotu wg RAW (s. 43): k100 minus **wartość** Charyzmy; wynik w dostępności tutaj — ktoś w
 * osadzie go ma. Karta publiczna z **jawnymi liczbami** (D28: dostępność, lokalizacja, CHA, próg); szept MG:
 * ilość z rzutu (s. 43) i cena tutaj (cena regionalna zostaje ukryta przed graczami — D3).
 * Licznik transakcji, „już szukałeś dziś” i RO za kolejne godziny — `handel.mjs` (E4).
 */

import { dostepnoscTutaj, wynikZamowienia, premieZamowienia, iloscRegula, cenaTutaj, fmtGb } from "../config/handel-rules.mjs";
import { LOKALIZACJE, REGIONY } from "../config/handel-data.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { doRoll } from "../config/losowanie.mjs";
import { kartaPostoju, wyslijKarte } from "./karty.mjs";
import { doMG, zarejestrujProsbe } from "./przekaznik.mjs";
import { KATALOG } from "../config/recipes-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * Szept MG po udanym zamówieniu: ilość z rzutu (s. 43) i cena tutaj z rozkładem; [Dodaj do wymiany]. Tylko u MG.
 * @returns {Promise<number>} ilość
 */
export async function szeptZamowienia(actor, wpis, { miejsce, kobalt = isKobaltEnabled() } = {}) {
  const regula = iloscRegula(wpis);
  const rIlosc = await new Roll(doRoll(regula)).evaluate();
  const ilosc = rIlosc.total;
  const tu = cenaTutaj(wpis, { region: miejsce?.region, kobalt });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/coins.svg",
    tytul: `${wpis.nazwa}: ${ilosc} szt.`,
    podtytul: `dla ${actor.name} · tylko MG`,
    linie: [
      `Ilość: ${regula === "1" ? "1 (wielorazowy, s. 43)" : `${regula.replace("d", "k")} = <strong>${ilosc}</strong> (s. 43)`}`,
      `Cena tutaj: <strong>${fmtGb(tu.cena)}</strong> za szt. <span class="neuro-postoj-rozklad">(${esc(tu.rozklad.map(r => `${r.opis}: ${fmtGb(r.wartosc)}`).join(" → "))})</span>`,
      miejsce?.region ? `Region: ${esc(REGIONY[miejsce.region]?.label)}` : "Bez regionu — ceny podręcznikowe."
    ],
    przyciski: [{ akcja: "zamowienieDoWymiany", label: "Dodaj do wymiany", ikona: "fa-solid fa-right-left", gm: true, dane: { aktor: actor.uuid, ref: wpis.ref ?? "", ilosc } }]
  }), { szept: "gm", actor });
  return ilosc;
}

/** Wykonawca prośby gracza: szept MG po jego udanym zamówieniu. */
export function registerZamowienie() {
  zarejestrujProsbe("zamowienieSzept", async (_n, d) => {
    const actor = await fromUuid(d.aktor);
    const wpis = d.ref ? KATALOG.get(d.ref) : d.wpis;
    if (actor && wpis) await szeptZamowienia(actor, wpis, { miejsce: d.miejsce });
  });
}

/** Gambling we krwi (Pochodzenie Nowy Jork, s. 63) — zdolność z paczki albo z nazwy. */
export function gamblingWeKrwi(actor) {
  return (actor?.items ?? []).some(i => i.getFlag?.(MODULE_ID, "originAbilityId") === "gambling-we-krwi"
    || /gambling we krwi/i.test(i.name ?? ""));
}

/** Wartość Charyzmy (nie modyfikator — s. 43). */
export function wartoscCharyzmy(actor) {
  return Number(actor?.system?.abilities?.cha?.value) || 0;
}

/**
 * Rzut zamówienia. `k100` — wynik podstawiony (testy, kość gracza z okna); brak — rzut tutaj.
 * @param {Actor} actor
 * @param {object} wpis     wpis `KATALOG` (albo `{ ref, nazwa, cena, dostepnosc, kategoria }`)
 * @param {{miejsce: object, k100?: number|null, kobalt?: boolean, szeptMG?: boolean}} o
 * @returns {Promise<{jest: boolean, wynik: number, prog: number|null, k100: number, ilosc: number|null, wiadomosc: ChatMessage}>}
 */
export async function rzucZamowienie(actor, wpis, { miejsce, k100 = null, kobalt = isKobaltEnabled(), szeptMG = true } = {}) {
  const krew = gamblingWeKrwi(actor);
  const d = dostepnoscTutaj(wpis, { rodzaj: miejsce?.rodzaj, premie: premieZamowienia({ gamblingWeKrwi: krew }), kobalt });
  const roll = k100 === null ? await new Roll("1d100").evaluate() : null;
  const kosc = k100 ?? roll.total;
  const cha = wartoscCharyzmy(actor);
  const z = wynikZamowienia({ k100: kosc, cha, prog: d.prog, nigdy: d.nigdy, nazwa: wpis.nazwa });
  const lok = LOKALIZACJE[miejsce?.rodzaj];
  const skladniki = d.prog === null ? [d.powod ?? "nie ma w handlu"] : [
    `dostępność ${d.bazowa}%`,
    lok ? `${lok.label} ${lok.modyfikator > 0 ? "+" : ""}${lok.modyfikator}` : "bez lokalizacji",
    ...(krew ? ["Gambling we krwi +5"] : [])
  ];
  const wiadomosc = await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/search.svg",
    tytul: `Zamówienie: ${wpis.nazwa}`,
    podtytul: actor.name,
    rodzaj: z.jest ? "sukces" : "porazka",
    linie: [
      `<strong>k100 ${kosc} − CHA ${cha} = ${z.wynik} ${d.prog === null ? "" : (z.jest ? "≤" : ">")} ${d.prog ?? "—"}</strong>`,
      `<span class="neuro-postoj-rozklad">${esc(skladniki.join(" · "))}</span>`,
      z.jest ? "Ktoś w osadzie to ma — trzeba się dogadać." : "Nikt tego nie ma (dziś, tutaj)."
    ]
  }), { actor, rolls: roll ? [roll] : [], flagi: { zamowienie: { ref: wpis.ref ?? null, jest: z.jest, wynik: z.wynik, prog: d.prog } } });

  // Szept MG (ilość, cena tutaj) musi napisać MG — autor widzi własny szept, więc gracz nie może go tworzyć (U42).
  let ilosc = null;
  if (z.jest && szeptMG) {
    if (game.user.isGM) ilosc = await szeptZamowienia(actor, wpis, { miejsce, kobalt });
    else await doMG("zamowienieSzept", { aktor: actor.uuid, ref: wpis.ref ?? null, wpis: wpis.ref ? null : wpis, miejsce: { rodzaj: miejsce?.rodzaj ?? null, region: miejsce?.region ?? null } }, { nosiciel: actor });
  }
  return { jest: z.jest, wynik: z.wynik, prog: d.prog, k100: kosc, ilosc, wiadomosc };
}
