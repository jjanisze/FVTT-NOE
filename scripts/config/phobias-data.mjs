/**
 * Neuroshima 5e — Fobie (phobias).
 *
 * Text quoted from the rulebook chapter "Choroby i Fobie" (str. 111–112).
 *
 * ## Data model on the actor
 * `flags["neuroshima-2026-overrides"].fobie` is an array of entries:
 *   {
 *     id:      string,        // random, stable per entry
 *     key:     string|null,   // PHOBIAS key, null = custom
 *     name:    string,
 *     effect:  string,        // trigger + penalty text (prefilled, editable)
 *     breakthrough: string,   // Przełamanie text (prefilled, editable)
 *     streak:  number,        // consecutive successful RO — 3 cures permanently
 *     brokenUntil: number|null, // worldTime (seconds) the Przełamanie lasts to
 *     active:  boolean,       // currently panicking (failed RO, penalty applies)
 *     notes:   string
 *   }
 */

/** RO na Mądrość ST 15, RAW str. 112. */
export const PHOBIA_SAVE = Object.freeze({ ability: "wis", dc: 15 });

/** Three consecutive successful saves cure a phobia permanently. */
export const PHOBIA_CURE_STREAK = 3;

/** Przełamanie durations, in seconds — used to stamp `brokenUntil`. */
const HOUR = 3600;

export const PHOBIAS = Object.freeze({
  akrofobia: {
    roll: 1,
    label: "Akrofobia",
    effect: "Reagujesz lękiem, kiedy jesteś na wysokości większej niż 1,5 metra nad ziemią, stoisz "
      + "na balkonie, wchodzisz lub schodzisz po schodach lub jedziesz windą. Masz Utrudnienie "
      + "w Testach Cech i Testach Ataku, póki nie znajdziesz się na poziomie gruntu lub nie "
      + "przestaniesz widzieć wysokości.",
    breakthrough: "Przestajesz się bać wysokości na 8 godzin.",
    breakthroughSeconds: 8 * HOUR
  },
  arachnofobia: {
    roll: 2,
    label: "Arachnofobia",
    effect: "Reagujesz lękiem, kiedy zobaczysz dowolnego pająka, bez względu na jego rozmiar. Masz "
      + "Utrudnienie w Testach Cech i Testach Ataku, jeśli jakiś pająk znajduje się w zasięgu twojego "
      + "wzroku. Mechaniczne pająki również wzbudzają twój lęk.",
    breakthrough: "Przestajesz się bać pająków na 1 godzinę. Otrzymujesz Ułatwienie do Testów Ataku "
      + "przeciwko nim na 1 minutę.",
    breakthroughSeconds: HOUR
  },
  klaustrofobia: {
    roll: 3,
    label: "Klaustrofobia",
    effect: "Czujesz silny lęk, kiedy znajdziesz się w przestrzeni, w której ledwo się mieścisz oraz "
      + "gdy jesteś pod ziemią lub w windzie. Masz Utrudnienie w Testach Cech i Testach Ataku, dopóki "
      + "nie opuścisz stresującego cię pomieszczenia.",
    breakthrough: "Przestajesz się bać ciasnych przestrzeni na 1 godzinę.",
    breakthroughSeconds: HOUR
  },
  mutkofobia: {
    roll: 4,
    label: "Mutkofobia",
    effect: "Masz lęk przed mutantami i potworami, jak tylko je zobaczysz. Otrzymujesz Utrudnienie "
      + "w Testach Cech i Testach Ataku, jeśli mutant lub potwór znajduje się w zasięgu twojego wzroku.",
    breakthrough: "Przestajesz się bać zmutowanych istot na 1 godzinę. Otrzymujesz Ułatwienie "
      + "do Testów Ataku przeciwko nim na 1 minutę.",
    breakthroughSeconds: HOUR
  },
  nyktofobia: {
    roll: 5,
    label: "Nyktofobia",
    effect: "Lęk przed całkowitą ciemnością. Masz Utrudnienie w Testach Cech i Testach Ataku, jeśli "
      + "znajdujesz się w ciemności. Światło latarki lub pochodni nie zmniejsza tego lęku.",
    breakthrough: "Przestajesz się bać ciemności na 1 godzinę.",
    breakthroughSeconds: HOUR
  },
  pirofobia: {
    roll: 6,
    label: "Pirofobia",
    effect: "Reagujesz lękiem na każdy otwarty ogień. Zdmuchujesz zapalone świece, nie palisz fajek, "
      + "trzymasz się z daleka od ogniska i wszystkiego, co się pali. Masz Utrudnienie w Testach Cech "
      + "i Testach Ataku, jeśli otwarty ogień znajduje się w zasięgu 1,5 metra od ciebie.",
    breakthrough: "Przestajesz się bać ognia na 8 godzin.",
    breakthroughSeconds: 8 * HOUR
  },
  robofobia: {
    roll: 7,
    label: "Robofobia",
    effect: "Czujesz lęk przed maszynami Molocha i SMART-a, jak tylko je zobaczysz. Masz Utrudnienie "
      + "w Testach Cech i Testach Ataku, jeśli maszyna znajduje się w zasięgu twojego wzroku.",
    breakthrough: "Przestajesz się bać maszyn na 1 godzinę. Otrzymujesz Ułatwienie do Testów Ataku "
      + "przeciwko nim na 1 minutę.",
    breakthroughSeconds: HOUR
  },
  rodentofobia: {
    roll: 8,
    label: "Rodentofobia",
    effect: "Kiedy zobaczysz szczura, wpadasz w histerię. Pierwotny lęk nie pozwala ci logicznie "
      + "myśleć. Masz Utrudnienie w Testach Cech i Testach Ataku, jeśli jakiś szczur znajduje się "
      + "w zasięgu twojego wzroku.",
    breakthrough: "Przestajesz się bać szczurów na 1 godzinę. Otrzymujesz Ułatwienie do Testów Ataku "
      + "przeciwko nim na 1 minutę.",
    breakthroughSeconds: HOUR
  }
});

/** @returns {object|null} phobia definition for a key, or null for custom entries. */
export function getPhobia(key) {
  return key ? (PHOBIAS[key] ?? null) : null;
}

/** How long a Przełamanie lasts for this entry, in seconds. Custom entries default to 1h. */
export function breakthroughSeconds(entry) {
  return getPhobia(entry?.key)?.breakthroughSeconds ?? HOUR;
}

/** Options for the "select a phobia" dropdown. */
export function phobiaOptions() {
  return Object.entries(PHOBIAS)
    .sort((a, b) => a[1].roll - b[1].roll)
    .map(([key, p]) => ({ key, label: `${p.roll}. ${p.label}` }));
}
