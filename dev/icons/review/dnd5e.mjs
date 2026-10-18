const gallery = document.querySelector("#reference-gallery");
const status = document.querySelector("#reference-status");
const groupSelect = document.querySelector("#reference-group");
const dialog = document.querySelector("#reference-dialog");
const svgCache = new Map();
let failedGlyphs = 0;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

async function vector(src) {
  if (!svgCache.has(src)) svgCache.set(src, fetch(src).then(async response => {
    if (!response.ok) throw new Error("Cannot load reference glyph");
    const xml = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    const svg = xml.documentElement;
    if (svg.localName !== "svg" || xml.querySelector("parsererror")) throw new Error("Invalid reference SVG");
    svg.querySelectorAll("script, foreignObject, style").forEach(el => el.remove());
    for (const el of [svg, ...svg.querySelectorAll("*")]) for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || ["href", "xlink:href"].includes(attr.name) && !attr.value.startsWith("#")) el.removeAttribute(attr.name);
    }
    return svg;
  }));
  return (await svgCache.get(src)).cloneNode(true);
}

function image(entry, className) {
  const img = element("img", className);
  img.src = entry.src;
  img.alt = entry.name;
  img.draggable = false;
  return img;
}

function openOriginal(entry) {
  document.querySelector("#reference-dialog-title").textContent = entry.name;
  document.querySelector("#reference-detail").replaceChildren(image(entry, ""));
  document.querySelector("#reference-detail-source").textContent = entry.source;
  dialog.showModal();
}

async function card(entry) {
  const result = element("article", "reference-card");
  result.dataset.referenceId = entry.id;
  result.append(element("h3", "", entry.name), element("p", "reference-note", entry.note || "Original installed image"));
  if (!entry.available) {
    result.append(element("div", "reference-missing", "This reference image is not installed locally."), element("p", "reference-source", entry.source));
    return result;
  }
  const original = element("button", "reference-original");
  original.type = "button";
  original.setAttribute("aria-label", `Enlarge original: ${entry.name}`);
  original.append(image(entry, ""), element("small", "", "Original · 96 px · click to enlarge"));
  original.addEventListener("click", () => openOriginal(entry));
  const samples = element("div", "reference-samples");
  samples.setAttribute("aria-label", `Sheet previews: ${entry.name}`);
  let svg;
  if (entry.vector) {
    try { svg = await vector(entry.src); }
    catch { failedGlyphs++; }
  }
  for (const size of [64, 32, 16]) {
    const sample = element("span", "reference-sample");
    const icon = svg ? svg.cloneNode(true) : image(entry, "reference-sheet-icon");
    if (svg) {
      icon.classList.add("reference-sheet-icon");
      icon.setAttribute("role", "img");
      icon.setAttribute("aria-label", entry.name);
    }
    icon.style.setProperty("--reference-size", `${size}px`);
    sample.append(icon, element("span", "", `${size} px`));
    samples.append(sample);
  }
  result.append(original, samples, element("p", "reference-source", entry.source));
  return result;
}

function filter() {
  for (const section of gallery.children) section.hidden = Boolean(groupSelect.value && section.id !== groupSelect.value);
}
groupSelect.addEventListener("change", filter);
document.querySelector("#sheet-theme").addEventListener("change", event => { document.body.dataset.sheetTheme = event.target.value; });
document.querySelector("#sheet-framing").addEventListener("change", event => { document.body.dataset.framing = event.target.checked ? "on" : "off"; });
document.querySelector("#reference-grayscale").addEventListener("change", event => { document.body.classList.toggle("reference-grayscale", event.target.checked); });
document.querySelector("#reference-close").addEventListener("click", () => dialog.close());

try {
  const response = await fetch("/api/dnd5e-reference");
  if (!response.ok) throw new Error("The local reference catalog is unavailable. Restart the icon review server after updating its files.");
  const catalog = await response.json();
  for (const [index, group] of catalog.groups.entries()) {
    const section = element("section", "reference-section");
    section.id = group.id;
    const heading = element("div", "reference-heading");
    heading.append(element("h2", "", `${String(index + 1).padStart(2, "0")} · ${group.title}`), element("span", "reference-style", group.style));
    const grid = element("div", "reference-grid");
    grid.append(...await Promise.all(group.examples.map(card)));
    section.append(heading, element("p", "reference-description", group.description), grid);
    gallery.append(section);
    const option = element("option", "", group.title);
    option.value = group.id;
    groupSelect.append(option);
  }
  const examples = catalog.groups.flatMap(group => group.examples);
  const missing = examples.filter(entry => !entry.available).length;
  status.textContent = `dnd5e ${catalog.systemVersion ?? "version unavailable"} · ${catalog.groups.length} groups · ${examples.length} examples · four per group`;
  if (missing) status.textContent += ` · ${missing} not installed`;
  if (failedGlyphs) status.textContent += ` · ${failedGlyphs} SVG previews could not inherit sheet ink`;
  gallery.dataset.ready = "true";
  filter();
} catch (error) {
  status.textContent = error.message;
  status.classList.add("error");
}
