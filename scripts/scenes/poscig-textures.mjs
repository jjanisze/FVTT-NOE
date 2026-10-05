/** Bounded asynchronous working set. Only requested assets are decoded or uploaded. */
export class SceneryTextureCache {
  constructor(load, dispose, changed = () => {}) {
    this.load = load; this.dispose = dispose; this.changed = changed;
    this.entries = new Map(); this.queue = []; this.active = 0; this.dead = false;
    this.loads = 0; this.evictions = 0; this.peakBytes = 0; this.error = null;
  }

  retain(required, ahead = []) {
    if (this.dead) return;
    const wanted = new Set([...required, ...ahead]);
    for (const [id, entry] of this.entries) {
      if (wanted.has(id)) continue;
      this.entries.delete(id);
      if (entry.value) { this.dispose(entry.value); this.evictions++; }
      if (!entry.started) entry.resolve(null);
    }
    this.queue = this.queue.filter(entry => this.entries.get(entry.id) === entry);
    // Visible requests precede lookahead. At most two image decodes/uploads run concurrently.
    for (const id of wanted) {
      if (this.entries.has(id)) continue;
      const entry = {id, value:null, started:false};
      entry.promise = new Promise(resolve => { entry.resolve = resolve; });
      this.entries.set(id, entry); this.queue.push(entry);
    }
    this.pump();
  }

  pump() {
    while (!this.dead && this.active < 2 && this.queue.length) {
      const entry = this.queue.shift();
      if (this.entries.get(entry.id) !== entry) continue;
      entry.started = true; this.active++;
      const current = () => !this.dead && this.entries.get(entry.id) === entry;
      Promise.resolve().then(() => current() ? this.load(entry.id, current) : null).then(value => {
        if (!current()) { if (value) this.dispose(value); entry.resolve(null); return; }
        entry.value = value; this.loads++;
        this.peakBytes = Math.max(this.peakBytes, this.bytes());
        entry.resolve(value); this.changed();
      }).catch(error => {
        if (current()) { entry.error = error; this.error = error.message; this.changed(); }
        entry.resolve(null);
      }).finally(() => { this.active--; this.pump(); });
    }
  }

  get(id) { return this.entries.get(id)?.value ?? null; }
  async ready(ids) {
    await Promise.all([...ids].map(id => this.entries.get(id)?.promise));
    if (this.error) throw new Error(this.error);
  }
  bases() { return [...this.entries.values()].flatMap(e => e.value ? [e.value.baseTexture] : []); }
  bytes() { return this.bases().reduce((n, b) => n + b.realWidth * b.realHeight * 4, 0); }
  stats() {
    return {catalogLoads:this.loads, textureEvictions:this.evictions, residentTextures:this.bases().length,
      residentTextureBytes:this.bytes(), peakTextureBytes:this.peakBytes, pendingTextures:this.entries.size-this.bases().length,
      textureError:this.error};
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    for (const e of this.entries.values()) {
      if (e.value) this.dispose(e.value);
      if (!e.started) e.resolve(null);
    }
    this.entries.clear(); this.queue.length = 0;
  }
}
