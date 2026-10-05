/** Deterministic scenery choices at unbounded travel distances; no Foundry documents. */
export function hash(seed, stream, index = 0) {
  let n = 2166136261;
  for (const c of `${seed}:${stream}:${index}`) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d); n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b); return (n ^ (n >>> 16)) >>> 0;
}
export const randomAt = (seed, stream, index) => hash(seed, stream, index) / 4294967296;

const permutationCache = new WeakMap();
function permutation(items, seed, stream, block) {
  let cache = permutationCache.get(items);
  if (!cache) { cache = new Map(); permutationCache.set(items, cache); }
  const key = `${seed}:${stream}:${block}`;
  if (cache.has(key)) return cache.get(key);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = hash(seed, `${stream}:${block}`, i) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  cache.set(key, result);
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  return result;
}

/** Shuffle bags prevent both immediate repeats and starvation of less common assets. */
export function choose(items, seed, stream, index) {
  if (!items.length) throw new Error(`Empty scenery group: ${stream}`);
  const n = items.length;
  if (n <= 2) return items[((index + hash(seed, stream)) % n + n) % n];
  const block = Math.floor(index / n), bag = permutation(items, seed, stream, block);
  const previous = permutation(items, seed, stream, block - 1);
  // Swapping the first two leaves the final entry unchanged, including across bag boundaries.
  let position = ((index % n) + n) % n;
  if (bag[0] === previous.at(-1) && position < 2) position = 1 - position;
  return bag[position];
}

const REGIONS = ["open", "foothills", "mesas", "broken"];
export const REGION_DISTANCE = 24000;
export function regionAt(seed, distance, regions = REGIONS) {
  return choose(regions, seed, "regions", Math.floor(distance / REGION_DISTANCE));
}

export function routeAsset(manifest, seed, role, index, stride, rate = 1) {
  const region = regionAt(seed, index * stride / rate, manifest.regions);
  if (role === "road") return choose(manifest.groups.roads, seed, "roads", index);
  if (role === "hill") {
    const groups = manifest.groups.landscapes;
    // Long quiet valley stretches alternate with progressively stronger landforms.
    const family = region;
    return choose(groups[family], seed, `hills-${family}`, index);
  }
  const names = manifest.groups[role];
  return choose(names, seed, role, index);
}
