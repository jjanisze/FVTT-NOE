/** Look of a chase board; independent of the rulebook environment and its DC. */
export const MOTYW_DOMYSLNY = "pustynia";

export const MOTYWY = Object.freeze({
  pustynia: {
    id: "pustynia", nazwa: "Pustynia Nevady", seed: 0x5eed1,
    sky: ["#607c8c", "#c3c4b5", "#ead2a4"],
    far: { colors: ["#a8a391", "#a89376", "#8c785e"], parallax: .25 },
    mid: { colors: ["#a98454", "#ccb082", "#705f48"], parallax: 1 },
    near: { colors: ["#534b32", "#8c7851"], parallax: 2 },
    lanes: { line: 0xf2dbad, fillA: 0x000000, fillB: 0xffffff, alpha: .21 },
    labels: { fill: 0xffe6b5, stroke: 0x332b20, font: "Signika, sans-serif" },
    free: { background: 0x211d17, line: 0x867653, text: 0xaf9d7d },
    ambient: null
  },
  przedmiescia: {
    id: "przedmiescia", nazwa: "Przedmieścia w ruinach", seed: 0xbad512,
    sky: ["#52656a", "#91988f", "#c3b299"],
    far: { colors: ["#777c73", "#676b63", "#55594f"], parallax: .25 },
    mid: { colors: ["#4d5150", "#73756e", "#303737"], parallax: 1 },
    near: { colors: ["#323936", "#6f6451"], parallax: 2 },
    lanes: { line: 0xded2a9, fillA: 0x000000, fillB: 0xffffff, alpha: .25 },
    labels: { fill: 0xe8dbc0, stroke: 0x252e2e, font: "Signika, sans-serif" },
    free: { background: 0x191f1e, line: 0x70766a, text: 0xa3ad9f },
    ambient: null
  },
  zima: {
    id: "zima", nazwa: "Nuklearna zima", seed: 0x1ce55,
    sky: ["#444f60", "#929caa", "#c8cbce"],
    far: { colors: ["#a8afb7", "#87919a", "#626e7b"], parallax: .25 },
    mid: { colors: ["#b3bac0", "#d4d7d6", "#7c8890"], parallax: 1 },
    near: { colors: ["#4b5966", "#8b969f"], parallax: 2 },
    lanes: { line: 0x374b59, fillA: 0x000000, fillB: 0xffffff, alpha: .30 },
    labels: { fill: 0xe9f1f5, stroke: 0x253645, font: "Signika, sans-serif" },
    free: { background: 0x1b2530, line: 0x778a9b, text: 0xa9bccd },
    ambient: { count: 96, color: 0xf0f3f4, alpha: .48 }
  }
});

/** Old boards and unrecognised flags retain the default look. */
export function motywPoscigu(flaga) {
  return MOTYWY[flaga?.motyw] ?? MOTYWY[MOTYW_DOMYSLNY];
}
