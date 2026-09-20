/**
 * Neuroshima 5e — rozmiary żetonów i wzorce dnd5e dla scen kalibracyjnych.
 *
 * Wydzielone z `monster-closet.mjs`, kiedy doszła Szafa z postaciami: obie
 * szafy mierzą to samo (wypełnienie kadru względem pola siatki) tą samą
 * miarką, więc tabela nie może istnieć w dwóch kopiach. Importuje to też
 * paczka testowa `skala-zetonow`.
 */

/**
 * Rozmiary Neuroshimy, docelowe wypełnienie kadru (`tokens/README.md`
 * §„Rozmiary żetonów w kompendium", potwierdzone z MG) i wzorzec dnd5e.
 *
 * **Uwaga na nazwy.** Neuroshima nazywa `huge` „Wielkim", a `grg` „Ogromnym";
 * polskie tłumaczenie dnd5e nazywa `huge` „Ogromnym", a `grg` „Gigantycznym".
 * Słowo „Ogromny" znaczy w tych dwóch miejscach dwa różne rozmiary, więc
 * podpisy w scenach zawsze niosą **klucz systemowy w nawiasie**.
 *
 * Wzorce dobrane danymi, nie z pamięci: z packa `dnd5e.monsters` (te 662 żetony
 * Forgotten Adventures, na których mierzona jest cała tabela w
 * `tokens/README.md`) wyfiltrowane istoty, które mają `texture.scaleX === 1`
 * **i** footprint zgodny z rozmiarem z podręcznika — tylko takie są uczciwym
 * wzorcem „tak wygląda poprawnie skadrowany żeton przy skali 1,0". Odpada m.in.
 * Hill Giant (`scaleX: 1.66`) i Ancient Red Dragon (`width: 13`, `scaleX: 3`).
 *
 * `fill` to zmierzone wypełnienie kadru **dłuższym** wymiarem obwiedni alfa —
 * ten wymiar decyduje, czy grafika wyleje się za swoje pole. `tokens/README.md`
 * cytuje przy Goblinie/Bandycie/Orku wymiar poziomy; dla istot innych niż
 * dwunożne (Szczur: 27% w poziomie, 45% w pionie) poziomy nic nie mówi.
 */
export const SIZES = Object.freeze({
  grg: {
    pl: "Ogromny", footprint: 4, target: 0.92,
    ref: { name: "Tarrasque", src: "systems/dnd5e/tokens/monstrosity/Tarrasque.webp", fill: 0.96 }
  },
  huge: {
    pl: "Wielki", footprint: 3, target: 0.92,
    ref: { name: "Frost Giant", src: "systems/dnd5e/tokens/giant/FrostGiant.webp", fill: 0.92 }
  },
  lg: {
    pl: "Duży", footprint: 2, target: 0.90,
    ref: { name: "Ogre", src: "systems/dnd5e/tokens/giant/Ogre.webp", fill: 0.99 }
  },
  med: {
    pl: "Średni", footprint: 1, target: 0.90,
    ref: { name: "Bandit", src: "systems/dnd5e/tokens/humanoid/Bandit.webp", fill: 0.96 }
  },
  sm: {
    pl: "Mały", footprint: 1, target: 0.70,
    ref: { name: "Goblin", src: "systems/dnd5e/tokens/humanoid/Goblin.webp", fill: 0.74 }
  },
  tiny: {
    pl: "Malutki", footprint: 0.5, target: 0.60,
    ref: { name: "Rat", src: "systems/dnd5e/tokens/beast/Rat.webp", fill: 0.45 }
  }
});

/** Od największych, żeby rząd z Megatorem nie siedział pod rzędem Malutkich. */
export const SIZE_ORDER = ["grg", "huge", "lg", "med", "sm", "tiny"];

/** Rozmiar, który na pewno jest w tabeli — nieznany leci na Średniego. */
export const knownSize = size => (SIZES[size] ? size : "med");

/**
 * Komórka istoty to zawsze całe pole siatki, nawet dla Malutkiego (footprint
 * 0,5). Bez tego żetony po Malutkim lądowałyby na połówkach pola, a siatka jest
 * w tych scenach jedynym odnośnikiem — nieczytelna siatka unieważnia całą scenę.
 */
export const cellOf = size => Math.ceil(SIZES[knownSize(size)].footprint);

export const pct = v => `${Math.round(v * 100)}%`;

export const round2 = v => Math.round(Number(v) * 100) / 100;

/**
 * Skala **zapisana** na żetonie, nie ta chwilowo wyliczona.
 *
 * `token.texture.scaleX` jest przejściowe: zmiana skali żetonu jest animowana,
 * a w trakcie animacji przygotowane dane wiozą wartość pośrednią. Odczyt zaraz
 * po ostatnim ruchu QuickScale'a łapał w ten sposób 1,06 w drodze z 1,05 do 1,3
 * — liczbę, której nikt nie ustawił i która wygląda jak prawdziwy wynik
 * kalibracji. `_source` to stan zapisany, więc jest niewrażliwy na animację
 * (tą samą ścieżką czyta to dnd5e w `documents/token.mjs`).
 *
 * Drugi powód: dnd5e mnoży przygotowane `scaleX` przez
 * `CONFIG.DND5E.actorSizes[size].dynamicTokenScale` dla żetonów z pierścieniem
 * (u nas Mały = 0,8). Zebranie przygotowanej wartości wpisywałoby ten mnożnik
 * do danych, a przy następnym rzucie zostałby zastosowany po raz drugi.
 */
export function storedScale(token) {
  return {
    x: round2(token._source.texture.scaleX),
    y: round2(token._source.texture.scaleY)
  };
}
