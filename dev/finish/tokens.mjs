/**
 * Finish engine · tokens — the approved profile as CSS custom properties (PLAN_m9_style.md §4.1).
 *
 * `styles/noe/tokens.generated.css` holds everything the profile decides: the graphite theme,
 * the eight sources, the nine equipment families, the four action costs and the unavailability
 * slash. Typography, spacing and semantic colours are hand-written in `styles/noe/tokens.css`.
 */

/** Profile source id → token name. "origin" is the profile's key for Pochodzenia. */
const SOURCE_TOKEN = { origin: "pochodzenia" };

export function tokensCss(profile) {
  const lines = [];
  const put = (name, value, note) => lines.push(`  --noe-${name}: ${value};${note ? ` /* ${note} */` : ""}`);
  const gap = title => lines.push("", `  /* ${title} */`);

  lines.push(`  /* Motyw: ${profile.theme.name} */`);
  put("surface", profile.theme.surface);
  put("panel", profile.theme.panel);
  put("text", profile.theme.foreground);
  put("text-muted", profile.theme.muted);
  put("line", profile.theme.divider);
  put("accent", profile.theme.accent);

  gap("Źródła — tło ikony, glif, akcent (klasa; profesja dziedziczy klasę)");
  for (const [id, src] of Object.entries(profile.sources)) {
    const name = SOURCE_TOKEN[id] ?? id;
    put(`src-${name}-ground`, src.ground);
    put(`src-${name}-glyph`, src.foreground);
    put(`src-${name}-accent`, src.accent);
  }

  gap("Sprzęt — kolor gołego glifu rodziny");
  for (const [id, family] of Object.entries(profile.contentFamilies)) {
    if (family.role === "equipment") put(`eq-${id}`, family.accent);
  }

  gap("Koszty akcji — kształt + kolor + litera");
  for (const letter of ["A", "B", "R", "I"]) put(`cost-${letter.toLowerCase()}`, profile.actionCosts[letter].color, profile.actionCosts[letter].shape);

  const u = profile.unavailability;
  gap("Niedostępność — czerwony skos na glifie");
  put("unavail", u.red);
  put("unavail-outline", u.outline);
  put("unavail-angle", `${u.angleDegrees}deg`);
  put("unavail-length", `${Math.round(u.lengthRatio * 100)}%`);
  put("unavail-thickness-ratio", String(u.thicknessCssPixels.ratio), "część boku ikony");
  put("unavail-thickness-min", `${u.thicknessCssPixels.min}px`);
  put("unavail-thickness-max", `${u.thicknessCssPixels.max}px`);
  put("unavail-outline-width", `${u.outlineCssPixels}px`);

  gap("Geometria ikon");
  put("glyph-row", `${profile.geometry.workingCssPixels}px`);
  put("r-glyph", `${profile.geometry.groundCornerRadiusAtWorkingSize}px`, `tło ikony przy ${profile.geometry.workingCssPixels} px`);

  return [
    "/**",
    ` * NOE — tokeny z profilu ${profile.id} (zatwierdzony ${profile.approvedOn}).`,
    " * Generowane przez `npm run build:finish -- --only=tokens` — nie edytuj ręcznie.",
    " * Zmiana wyglądu = nowa wersja profilu dev/icons/finish/style-profile.json.",
    " */",
    ":root {",
    ...lines,
    "}",
    ""
  ].join("\n");
}

export function plan({ profile }) {
  return [{ kind: "tokens", id: "tokens", path: "styles/noe/tokens.generated.css", text: tokensCss(profile) }];
}
