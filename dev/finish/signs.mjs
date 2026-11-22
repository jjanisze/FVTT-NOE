/**
 * Finish engine · signs — the UI marks that carry meaning by shape (PLAN_m9_style.md §7.3, D16).
 *
 *   ui/noe/signs/cost-a|b|r|i.svg   action-cost figures: circle, triangle, four-point star, square
 *   ui/noe/signs/unavailable.svg    the red slash with its dark outline, on a 44 px box
 *   ui/noe/signs/unknown.svg        "?" — availability not known
 *
 * Geometry and colours come from the profile and are baked in: the same file works as a CSS
 * background, an `<img>` in a chat card and a canvas texture, where CSS variables never resolve.
 * Letters (A/B/R/I), counts and reasons stay live text next to the sign — never part of the file.
 */

const BANNER = "<!-- Generowane przez npm run build:finish (dev/finish/signs.mjs) — nie edytuj ręcznie. -->";
const n = v => Number(v.toFixed(3)).toString();

const FIGURES = {
  circle: () => `<circle cx="6" cy="6" r="5"/>`,
  triangle: () => `<path d="M6 1 11.5 10.8H.5Z"/>`,
  "four-point-star": () => {
    const outer = 6, inner = 2.3, pts = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? inner : outer;
      const a = (Math.PI / 4) * i - Math.PI / 2;
      pts.push(`${n(6 + r * Math.cos(a))} ${n(6 + r * Math.sin(a))}`);
    }
    return `<path d="M${pts.join(" ")}Z"/>`;
  },
  square: () => `<rect x="1.25" y="1.25" width="9.5" height="9.5"/>`
};

function svg(viewBox, body, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${BANNER}\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${viewBox}" height="${viewBox}" role="img" aria-label="${title}">\n${body}\n</svg>\n`;
}

/* ---- K3 · NPC portrait frame: two fused bubbles (MG 2026-11-17) ---- */

const mix = (a, b, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

/**
 * Geometry in the portrait's own box (180 × 182, the circle is the <img>): the big bubble frames
 * the portrait, the small one carries TT, sitting on the big ring at the lower left. Their outlines
 * are joined by concave fillets so the frame reads as one cast piece, not two stickers. The CSS
 * places the TT text on `small` — the numbers live in NPC_FRAME so both sides read one source.
 */
export const NPC_FRAME = Object.freeze({
  box: { x: -6, y: -4, w: 192, h: 200 },          // viewBox, in portrait pixels (portrait = 180 × 180)
  big: { cx: 90, cy: 90, r: 90, ring: 6 },         // r = the img's outer edge
  small: { cx: 28, cy: 157, r: 31, ring: 6 },
  fillet: 12
});

function fusedOutline({ big, small, fillet: f }) {
  const dx = small.cx - big.cx, dy = small.cy - big.cy, d = Math.hypot(dx, dy);
  const R = big.r, r = small.r;
  // Fillet centres: |F−B| = R+f, |F−S| = r+f, on both sides of the B→S line.
  const a = ((R + f) ** 2 - (r + f) ** 2 + d * d) / (2 * d);
  const h = Math.sqrt((R + f) ** 2 - a * a);
  const ux = dx / d, uy = dy / d;
  const px = big.cx + a * ux, py = big.cy + a * uy;
  const F = [[px - h * uy, py + h * ux], [px + h * uy, py - h * ux]];
  const on = (c, rad, p) => { const L = Math.hypot(p[0] - c.cx, p[1] - c.cy); return [c.cx + (p[0] - c.cx) * rad / L, c.cy + (p[1] - c.cy) * rad / L]; };
  const [b0, b1] = F.map(p => on(big, R, p));
  const [s0, s1] = F.map(p => on(small, r, p));
  const P = p => `${n(p[0])} ${n(p[1])}`;
  // big arc the long way b0→b1, fillet 1 (concave) b1→s1, small arc the outer way s1→s0, fillet 0 s0→b0.
  return `M${P(b0)}A${R} ${R} 0 1 1 ${P(b1)}A${f} ${f} 0 0 0 ${P(s1)}A${r} ${r} 0 1 1 ${P(s0)}A${f} ${f} 0 0 0 ${P(b0)}Z`;
}

function npcFrame(theme) {
  const { box, big, small } = NPC_FRAME;
  const circle = (c, rad) => `M${n(c.cx - rad)} ${c.cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
  const outline = fusedOutline(NPC_FRAME);
  const hi = mix(theme.accent, theme.foreground, 0.55), lo = mix(theme.accent, theme.divider, 0.55);
  const body = [
    `<defs><linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${theme.accent}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>`,
    // The steel: fused outline minus the portrait window (even-odd), then the TT well on top.
    `<path d="${outline}${circle(big, big.r - big.ring)}" fill="url(#steel)" fill-rule="evenodd" stroke="${theme.surface}" stroke-width="1"/>`,
    // Machined seam inside the portrait window; the TT well sits over it.
    `<circle cx="${big.cx}" cy="${big.cy}" r="${big.r - big.ring - .5}" fill="none" stroke="${lo}" stroke-width="1"/>`,
    `<circle cx="${small.cx}" cy="${small.cy}" r="${small.r - small.ring}" fill="${theme.panel}" stroke="${theme.surface}" stroke-width="1"/>`
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${BANNER}\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}" role="img" aria-label="Rama portretu">\n${body}\n</svg>\n`;
}

export function plan({ profile }) {
  const out = [];
  const labels = { A: "Akcja", B: "Akcja Bonusowa", R: "Reakcja", I: "Interakcja" };
  for (const letter of ["A", "B", "R", "I"]) {
    const cost = profile.actionCosts[letter];
    const figure = FIGURES[cost.shape];
    if (!figure) throw new Error(`Profil: nieznany kształt kosztu ${letter}: ${cost.shape}`);
    out.push({
      kind: "signs", id: `cost-${letter.toLowerCase()}`, path: `ui/noe/signs/cost-${letter.toLowerCase()}.svg`,
      text: svg(12, `<g fill="${cost.color}">${figure()}</g>`, labels[letter])
    });
  }

  // The slash is specified at the working size; consumers scale the whole box.
  const u = profile.unavailability;
  const size = profile.geometry.workingCssPixels;
  const thick = Math.min(u.thicknessCssPixels.max, Math.max(u.thicknessCssPixels.min, size * u.thicknessCssPixels.ratio));
  const half = (size * u.lengthRatio) / 2;
  const c = size / 2;
  const line = (w, cap = 0) => `<line x1="${n(c - half - cap)}" y1="${c}" x2="${n(c + half + cap)}" y2="${c}" stroke-width="${n(w)}"/>`;
  out.push({
    kind: "signs", id: "unavailable", path: "ui/noe/signs/unavailable.svg",
    text: svg(size, `<g transform="rotate(${u.angleDegrees} ${c} ${c})" stroke-linecap="butt"><g stroke="${u.outline}">${line(thick + 2 * u.outlineCssPixels, u.outlineCssPixels)}</g><g stroke="${u.red}">${line(thick)}</g></g>`, "Niedostępne")
  });

  out.push({
    kind: "signs", id: "unknown", path: "ui/noe/signs/unknown.svg",
    text: svg(12, `<g fill="none" stroke="${profile.theme.muted}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 4.1a2.5 2.5 0 1 1 3.9 2.1C6.5 6.8 6 7.3 6 8.3"/></g><circle cx="6" cy="10.6" r="1" fill="${profile.theme.muted}"/>`, "Brak danych")
  });

  out.push({ kind: "signs", id: "npc-frame", path: "ui/noe/signs/npc-frame.svg", consumer: "styles/noe/dnd5e-bridge.css", text: npcFrame(profile.theme) });
  return out;
}
