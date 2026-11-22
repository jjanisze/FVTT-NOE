/** Derive runtime indexes from approved subjects; ambiguous defaults stay on their source. */
export function runtimeIndexes(entries) {
  const byWrapper = new Map(), families = {}, consumers = {};
  for (const e of entries) {
    (byWrapper.get(e.wrapper) ?? byWrapper.set(e.wrapper, []).get(e.wrapper)).push(e);
    (families[e.family] ??= {})[e.wrapper] = e.outputs[0].path;
  }
  const defaults = {};
  for (const [wrapper, variants] of byWrapper) {
    const items = variants.filter(e => e.consumers.some(c => c.type === "pack" && ["item.img", "actor.items[].img"].includes(c.via)));
    const candidates = items.length ? items : variants;
    if (candidates.length === 1) defaults[wrapper] = candidates[0].outputs[0].path;
    const files = new Set(variants.flatMap(e => e.consumers.filter(c => c.type === "script").map(c => c.file)));
    for (const file of files) {
      const scoped = variants.filter(e => e.consumers.some(c => c.type === "script" && c.file === file));
      if (scoped.length === 1) (consumers[file] ??= {})[wrapper] = scoped[0].outputs[0].path;
    }
  }
  const sorted = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, typeof v === "object" ? sorted(v) : v]));
  return { defaults: sorted(defaults), families: sorted(families), consumers: sorted(consumers) };
}
