/** Exact signature of gen_class_placeholders.mjs; ordinary text SVGs are not enough. */
export function isGeneratedPlaceholder(svg) {
  return svg.includes('viewBox="0 0 64 64"')
    && svg.includes('<linearGradient id="g"')
    && svg.includes('stop-color="#101012"')
    && svg.includes('style="paint-order:stroke"')
    && svg.includes('stroke-width="0.8"');
}
