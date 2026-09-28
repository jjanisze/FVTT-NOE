/**
 * Neuroshima 5e — wyrażenia wymogu narzędzi dla przepisów produkcji (PLAN_produkcja §5.1a).
 *
 * Wymóg narzędzi przepisu to wyrażenie logiczne nad kluczami `CONFIG.DND5E.tools`:
 *
 *   ""                                   bez narzędzi — decyzja zapisana wprost, nie brak danych
 *   "chemika"                            jedno
 *   "chemika & rusznikarza"              oba            (także słowo „i”)
 *   "kowala | stolarza"                  którekolwiek   (także słowo „lub”)
 *   "(chemika | aptekarza) & elektronika" zagnieżdżone
 *
 * `&` wiąże mocniej niż `|`, jak w każdym języku. Drzewo po parsowaniu:
 * `{ key }` | `{ i: [...] }` | `{ lub: [...] }`, spłaszczone (i-w-i, lub-w-lub) i bez
 * duplikatów — `(zestaw profesji) & (zwykły wymóg)` składa się więc bez ręcznego sprzątania
 * („chemika & rusznikarza & chemika” → „chemika & rusznikarza”).
 *
 * Plik jest czysty: bez `game`/`CONFIG`, bo importuje go też `dev/validate-recipes.mjs`
 * w Node. Zgodność `TOOL_KEYS` z `CONFIG.DND5E.tools` sprawdza paczka Quench `produkcja`.
 */

/** Klucze narzędzi (= `CONFIG.DND5E.tools`) → krótka etykieta w dopełniaczu, do komunikatów. */
export const TOOL_KEYS = Object.freeze({
  aptekarza: "aptekarza",
  charakteryzatora: "charakteryzatora",
  chemika: "chemika",
  elektronika: "elektronika",
  falszerza: "fałszerza",
  gorzelnika: "gorzelnika",
  hakera: "hakera",
  jubilera: "jubilera",
  kartografa: "kartografa",
  klusownika: "kłusownika",
  kowala: "kowala",
  krawca: "krawca",
  kucharza: "kucharza",
  mechanika: "mechanika",
  medyka: "medyka",
  rusznikarza: "rusznikarza",
  rzeznika: "rzeźnika",
  stolarza: "stolarza",
  szulera: "szulera",
  szklarza: "szklarza",
  slusarza: "ślusarza",
  tatuazysty: "tatuażysty"
});

/** Błąd składni albo nieznany klucz — z pozycją, żeby walidator wskazał winowajcę. */
export class ToolExprError extends Error {
  constructor(message, source) {
    super(`${message} — w „${source}”`);
    this.name = "ToolExprError";
    this.source = source;
  }
}

/** „Ślusarza” → „slusarza”: dopasowanie słów z etykiet do kluczy. */
function _fold(word) {
  return word.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
}

const _KEY_BY_FOLD = new Map(Object.keys(TOOL_KEYS).map(k => [_fold(k), k]));

function _tokenize(src) {
  const tokens = [];
  const re = /\s*(\(|\)|&|\||[^\s()&|]+)/gy;
  let m;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m) break;
    pos = re.lastIndex;
    const t = m[1];
    const low = t.toLowerCase();
    if (t === "&" || low === "i") tokens.push({ op: "i" });
    else if (t === "|" || low === "lub") tokens.push({ op: "lub" });
    else if (t === "(" || t === ")") tokens.push({ paren: t });
    else tokens.push({ word: t });
  }
  if (src.slice(pos).trim()) throw new ToolExprError("nierozpoznany znak", src);
  return tokens;
}

/**
 * Parsuje wyrażenie. Pusty napis (albo `null`) → `null` = bez narzędzi.
 * @param {string|null} src
 * @returns {object|null}
 * @throws {ToolExprError}
 */
const _parsed = new Map();

export function parseToolExpr(src) {
  if (src == null || !String(src).trim()) return null;
  src = String(src);
  // Drzewa nigdy nie są modyfikowane (ocena i formatowanie tylko czytają), więc zakładka
  // oceniająca setki przepisów może dostać ten sam obiekt zamiast parsować od nowa.
  if (_parsed.has(src)) return _parsed.get(src);
  const tree = _parse(src);
  _parsed.set(src, tree);
  return tree;
}

function _parse(src) {
  const tokens = _tokenize(src);
  let i = 0;

  const expr = () => {
    const parts = [term()];
    while (tokens[i]?.op === "lub") { i++; parts.push(term()); }
    return parts.length === 1 ? parts[0] : { lub: parts };
  };
  const term = () => {
    const parts = [factor()];
    while (tokens[i]?.op === "i") { i++; parts.push(factor()); }
    return parts.length === 1 ? parts[0] : { i: parts };
  };
  const factor = () => {
    const t = tokens[i];
    if (!t) throw new ToolExprError("wyrażenie urywa się", src);
    if (t.paren === "(") {
      i++;
      const inner = expr();
      if (tokens[i]?.paren !== ")") throw new ToolExprError("brak nawiasu zamykającego", src);
      i++;
      return inner;
    }
    if (t.word) {
      i++;
      const key = _KEY_BY_FOLD.get(_fold(t.word));
      if (!key) throw new ToolExprError(`nieznane narzędzie „${t.word}”`, src);
      return { key };
    }
    throw new ToolExprError(`nieoczekiwany „${t.op ?? t.paren}”`, src);
  };

  const tree = expr();
  if (i < tokens.length) throw new ToolExprError("nadmiarowy fragment na końcu", src);
  return normalizeToolExpr(tree);
}

/** Spłaszcza zagnieżdżenia tego samego operatora i usuwa duplikaty (po postaci kanonicznej). */
export function normalizeToolExpr(tree) {
  if (!tree) return null;
  if (tree.key) return { key: tree.key };
  const op = tree.i ? "i" : "lub";
  const flat = [];
  for (const child of tree[op].map(normalizeToolExpr).filter(Boolean)) {
    if (child[op]) flat.push(...child[op]);
    else flat.push(child);
  }
  const seen = new Set();
  let unique = flat.filter(c => {
    const s = toolExprString(c);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });
  // Pochłanianie: `a & (a | b)` = `a`, `a | (a & b)` = `a`. Wymóg profesji składany
  // z zestawem („chemika & elektronika & (szklarza | elektronika)”) inaczej wisiałby
  // z gałęzią, która nic nie zmienia, a karta pokazywałaby ją graczowi.
  const leaves = new Set(unique.filter(c => c.key).map(c => c.key));
  const other = op === "i" ? "lub" : "i";
  unique = unique.filter(c => !(c[other] && c[other].some(g => g.key && leaves.has(g.key))));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return { [op]: unique };
}

/** Postać kanoniczna: „(chemika | aptekarza) & elektronika”. `null` → „”. */
export function toolExprString(tree) {
  if (!tree) return "";
  if (tree.key) return tree.key;
  const op = tree.i ? "i" : "lub";
  const sep = op === "i" ? " & " : " | ";
  // Po normalizacji dziecko nigdy nie ma operatora rodzica, więc nawias zawsze coś znaczy —
  // stawiamy go też tam, gdzie pierwszeństwo `&` by wystarczyło, bo człowiek czyta szybciej.
  return tree[op].map(c => (c.key ? c.key : `(${toolExprString(c)})`)).join(sep);
}

/** „(Chemika lub Aptekarza) i Elektronika” — do kart i podpowiedzi. */
export function formatToolExpr(tree, { labels = TOOL_KEYS, empty = "bez narzędzi" } = {}) {
  if (!tree) return empty;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const walk = (node, parentOp) => {
    if (node.key) return cap(labels[node.key] ?? node.key);
    const op = node.i ? "i" : "lub";
    const text = node[op].map(c => walk(c, op)).join(op === "i" ? " i " : " lub ");
    return parentOp && parentOp !== op ? `(${text})` : text;
  };
  return walk(tree, null);
}

/** Wszystkie klucze, które występują w wyrażeniu. */
export function toolExprKeys(tree) {
  const out = new Set();
  const walk = n => { if (!n) return; if (n.key) out.add(n.key); else (n.i ?? n.lub).forEach(walk); };
  walk(tree);
  return out;
}

/**
 * Klucze obowiązkowe — obecne na KAŻDEJ drodze spełnienia (część wspólna gałęzi „lub”).
 * Służy D32: gdy zwykły wymóg już obejmuje cały zestaw profesji, ×0,5 jest „z definicji”.
 */
export function mandatoryToolKeys(tree) {
  if (!tree) return new Set();
  if (tree.key) return new Set([tree.key]);
  const sets = (tree.i ?? tree.lub).map(mandatoryToolKeys);
  if (tree.i) return new Set(sets.flatMap(s => [...s]));
  return sets.reduce((acc, s) => new Set([...acc].filter(k => s.has(k))));
}

/** Poziomy spełnienia liścia: gotowe > zestaw w puli > brak. */
const LEVEL = Object.freeze({ ok: 2, pula: 1, "brak-zestawu": 0, "brak-bieglosci": 0 });

/**
 * Ocena wyrażenia wobec stanu wykonawcy.
 *
 * `leaf(key)` zwraca `{ status, bonus }`, gdzie status to:
 *   "ok"             — biegłość i zestaw pod ręką (postać albo kontener Roboty),
 *   "pula"           — biegłość jest, zestaw tylko w puli (pojazd drużyny, Miejsce) → 🚚,
 *   "brak-zestawu"   — biegłość jest, zestawu nigdzie,
 *   "brak-bieglosci" — brak biegłości (zestaw nieważny: narzędzia nie dają umiejętności).
 *
 * Wynik: `{ ok, poziom, wybor, brakuje, braki }`
 *   ok      — spełnione od ręki,
 *   poziom  — "ok" | "pula" | "brak" (najlepsza możliwa droga),
 *   wybor   — klucze użyte na najlepszej drodze (przy „lub” gałąź z najwyższą premią; L5),
 *   brakuje — pod-wyrażenie z niespełnionych liści (do komunikatu „brakuje: …”) albo null,
 *   braki   — `[{ key, status }]` niespełnione liście na najlepszej drodze (dla `robota.braki`).
 */
export function evalToolExpr(tree, leaf) {
  if (!tree) return { ok: true, poziom: "ok", wybor: [], brakuje: null, braki: [], bonus: 0 };
  const r = _eval(tree, leaf);
  const poziom = r.level === 2 ? "ok" : r.level === 1 ? "pula" : "brak";
  return { ok: r.level === 2, poziom, wybor: r.wybor, brakuje: normalizeToolExpr(r.brakuje), braki: r.braki, bonus: r.bonus };
}

function _eval(node, leaf) {
  if (node.key) {
    const s = leaf(node.key) ?? { status: "brak-bieglosci", bonus: 0 };
    const level = LEVEL[s.status] ?? 0;
    return {
      level, bonus: Number(s.bonus) || 0, wybor: [node.key],
      brakuje: level === 2 ? null : { key: node.key },
      braki: level === 2 ? [] : [{ key: node.key, status: s.status }]
    };
  }
  const kids = (node.i ?? node.lub).map(c => _eval(c, leaf));
  if (node.i) {
    const missing = kids.map(k => k.brakuje).filter(Boolean);
    return {
      level: Math.min(...kids.map(k => k.level)),
      bonus: kids.reduce((s, k) => s + k.bonus, 0),
      wybor: [...new Set(kids.flatMap(k => k.wybor))],
      brakuje: missing.length ? { i: missing } : null,
      braki: kids.flatMap(k => k.braki)
    };
  }
  // „lub”: najlepszy poziom, przy remisie najwyższa premia (L5 — domyślnie narzędzie z najwyższą premią).
  const best = kids.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.bonus > a.bonus) ? b : a));
  return {
    level: best.level, bonus: best.bonus, wybor: best.wybor,
    brakuje: best.level === 2 ? null : { lub: kids.map(k => k.brakuje).filter(Boolean) },
    braki: best.braki
  };
}

export const __testing = Object.freeze({ fold: _fold });
