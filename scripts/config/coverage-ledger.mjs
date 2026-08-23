/**
 * Neuroshima 5e — the „what does the system actually enforce" ledger.
 *
 * House rule (ARCHITECTURE.md §5): a mechanic the module does not enforce must say so out loud.
 * Every entry in a data module carries `auto: [{what, where}]` and an optional `manual`; this
 * factory turns those two fields into a status, a badge for the item description, and a console
 * report. `Sztuczki` and `Pochodzenia` each get their own instance.
 *
 * The badge markup is baked into compendium HTML at build time, so `cssPrefix` and `noneHtml`
 * are per-ledger: changing them means rebuilding the pack, which means closing Foundry.
 */

/**
 * @param {object} options
 * @param {Record<string, {label: string, auto?: object[], manual?: string}>} options.entries
 * @param {string} options.cssPrefix   e.g. `"neuro-sztuczka"` — must match `styles/neuroshima.css`.
 * @param {string} options.noneHtml    Inner HTML of the badge for entries with no automation.
 * @param {string} options.title       Label used in the console report.
 * @returns {{status: Function, html: Function, coverage: Function, report: Function}}
 */
export function createCoverageLedger({ entries, cssPrefix, noneHtml, title }) {
  /** @returns {"auto"|"partial"|"none"} */
  const status = key => {
    const def = entries[key];
    if (!def?.auto?.length) return "none";
    return def.manual ? "partial" : "auto";
  };

  const html = key => {
    const def = entries[key];
    if (!def) return "";
    const state = status(key);
    if (state === "none") return `<p class="${cssPrefix}-cover is-none">${noneHtml}</p>`;

    const bits = def.auto.map(a => `<li>${a.what} <em>(${a.where})</em></li>`).join("");
    const manual = def.manual
      ? `<p class="${cssPrefix}-manual"><strong>Nie automatyzujemy:</strong> ${def.manual}</p>`
      : "";
    return `<p class="${cssPrefix}-cover is-${state}"><strong>`
      + `${state === "auto" ? "Zautomatyzowane" : "Częściowo zautomatyzowane"}:</strong></p>`
      + `<ul class="${cssPrefix}-auto">${bits}</ul>${manual}`;
  };

  /** @returns {{auto: string[], partial: string[], none: string[]}} */
  const coverage = () => {
    const out = { auto: [], partial: [], none: [] };
    for (const key of Object.keys(entries)) out[status(key)].push(key);
    return out;
  };

  const report = () => {
    const c = coverage();
    const total = Object.keys(entries).length;
    console.group(`Neuroshima 5e | ${title} — automatyzacja (${c.auto.length + c.partial.length}/${total})`);
    for (const [bucket, label] of [["auto", "Pełne"], ["partial", "Częściowe"], ["none", "Brak"]]) {
      console.log(`${label} (${c[bucket].length}):`, c[bucket].map(k => entries[k].label).join(", ") || "—");
    }
    console.groupEnd();
    return c;
  };

  return { status, html, coverage, report };
}
