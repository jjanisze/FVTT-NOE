// Body for fvtt eval --profile=sandbox --file=...; no world documents are written.
if (!/^agent-/.test(game.world.id)) throw new Error("Run only in an agent sandbox world.");
const MOD = "neuroshima-2026-overrides";
const base = "modules/" + MOD + "/";
const get = async relative => {
  const response = await fetch(foundry.utils.getRoute(base + relative));
  if (!response.ok) throw new Error("Asset HTTP " + response.status + ": " + relative);
  return response;
};
const batches = args.batches;
const receipt = args.receipt;
const checks = [];
const preview = document.createElement("canvas");
preview.width = 1150;
preview.height = 440;
const ctx = preview.getContext("2d");
ctx.fillStyle = "#24262a";
ctx.fillRect(0, 0, preview.width, preview.height);
ctx.fillStyle = "#eeeeee";
ctx.font = "20px sans-serif";
ctx.fillText("Foundry renderer · M7 status glyphs · approved artwork", 22, 30);
ctx.font = "13px sans-serif";
for (const [index, subject] of batches.flatMap(b => b.subjects).entries()) {
  const expected = base + subject.target;
  const registered = CONFIG.statusEffects.find?.(s => s.id === subject.statusId) ?? CONFIG.statusEffects[subject.statusId];
  if (registered?.img !== expected) throw new Error("Wrong registry image: " + subject.statusId);
  const effect = await ActiveEffect.fromStatusEffect(subject.statusId);
  if (effect.img !== expected || !effect.statuses.has(subject.statusId)) {
    throw new Error("Wrong ActiveEffect factory result: " + subject.statusId);
  }
  const bytes = await (await get(subject.target)).arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    x => x.toString(16).padStart(2, "0")).join("");
  const delivered = receipt.installed.find(r => r.itemId === subject.itemId);
  if (!delivered?.files.some(f => f.path === subject.target && f.sha256 === digest)) {
    throw new Error("Served SVG differs from approved receipt: " + subject.statusId);
  }
  const texture = await foundry.canvas.loadTexture(expected);
  if (!(texture.width > 0 && texture.height > 0)) throw new Error("Empty texture: " + subject.statusId);
  const sprite = new PIXI.Sprite(texture);
  sprite.width = sprite.height = 96;
  const rendered = canvas.app.renderer.extract.canvas(sprite);
  const probe = rendered.getContext("2d").getImageData(0, 0, rendered.width, rendered.height).data;
  let visiblePixels = 0;
  for (let i = 3; i < probe.length; i += 4) if (probe[i] > 100) visiblePixels++;
  if (visiblePixels < 10) throw new Error("Invisible rendered mask: " + subject.statusId);
  const x = 22 + (index % 5) * 225;
  const y = 60 + Math.floor(index / 5) * 190;
  ctx.drawImage(rendered, x + 55, y, 96, 96);
  ctx.fillText(subject.key, x, y + 120);
  for (const [size, offset] of [[32, 32], [24, 93], [16, 149]]) {
    ctx.drawImage(rendered, x + offset, y + 134, size, size);
  }
  checks.push({ statusId: subject.statusId, img: expected, effectImageMatches: true,
    approvedHashMatches: true, texture: [texture.width, texture.height], visiblePixels });
  sprite.destroy({ texture: false, baseTexture: false });
}
if (checks.length !== 10) throw new Error("Expected ten configured statuses.");
return { world: game.world.id, checks, configuredStatuses: checks.length, worldDocumentsWritten: 0,
  previewDataUrl: preview.toDataURL("image/png") };
