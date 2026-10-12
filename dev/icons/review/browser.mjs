const $ = selector => document.querySelector(selector);
const PAGE_SIZE = 36;
const dialog = $("#icon-dialog");
const search = $("#search"), category = $("#category"), status = $("#status");
let icons = [], filtered = [], reasons = [], page = 1, currentId = null;

const fold = value => String(value).toLocaleLowerCase("pl").normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ł", "l");
const categoryName = value => value.split("/").map(word => word.replaceAll("-", " ")).join(" · ");
const reviewStatus = icon => icon.review?.stale ? "updated" : icon.review?.status ?? "unreviewed";
const statusLabel = value => ({ unreviewed: "Unreviewed", keep: "Keep current", redo: "Flagged for redo", updated: "Changed since review" })[value];
const chosenVariant = icon => icon.variants.find(variant => variant.source === icon.review?.source) ?? icon.variants[0];
const imageUrl = variant => "/" + variant.source.split("/").map(encodeURIComponent).join("/") + "?v=" + variant.sha256.slice(0, 16);

function image(variant, size, alt = "") {
  const img = document.createElement("img");
  img.src = imageUrl(variant); img.alt = alt; img.width = size; img.height = size;
  img.addEventListener("error", () => {
    img.hidden = true;
    const message = document.createElement("span"); message.className = "image-error"; message.textContent = "Preview unavailable";
    img.after(message);
  }, { once: true });
  return img;
}

function scales(variant) {
  const holder = document.createElement("div"); holder.className = "scales";
  for (const size of [64, 32, 16]) {
    const span = document.createElement("span"); span.append(image(variant, size), document.createTextNode(size + " px")); holder.append(span);
  }
  return holder;
}

function badge(icon) {
  const span = document.createElement("span"); const value = reviewStatus(icon);
  span.className = "badge badge-" + value; span.textContent = statusLabel(value); return span;
}

function readFilters() {
  const params = new URLSearchParams(location.search);
  search.value = params.get("q") ?? "";
  category.value = params.get("category") ?? "";
  status.value = params.get("status") ?? "all";
  if (!status.value) status.value = "all";
  page = Math.max(1, Number(params.get("page")) || 1);
}

function render() {
  const query = fold(search.value.trim());
  filtered = icons.filter(icon => (!category.value || icon.category === category.value)
    && (status.value === "all" || reviewStatus(icon) === status.value)
    && (!query || fold([icon.id, icon.name, ...icon.aliases, icon.review?.notes ?? "",
      ...(icon.review?.reasons ?? []).map(id => reasons.find(reason => reason.id === id)?.label ?? id)].join(" ")).includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.min(pages, Math.max(1, Math.floor(page)));
  const params = new URLSearchParams();
  if (search.value.trim()) params.set("q", search.value.trim());
  if (category.value) params.set("category", category.value);
  if (status.value !== "all") params.set("status", status.value);
  if (page > 1) params.set("page", page);
  history.replaceState(null, "", location.pathname + (params.size ? "?" + params : ""));
  const counts = value => icons.filter(icon => reviewStatus(icon) === value).length;
  $("#summary").textContent = `${icons.length} icons · ${counts("redo")} flagged · ${counts("keep")} kept · ${counts("unreviewed")} unreviewed` + (counts("updated") ? ` · ${counts("updated")} changed` : "");
  const start = (page - 1) * PAGE_SIZE, visible = filtered.slice(start, start + PAGE_SIZE);
  const host = $("#library"); host.replaceChildren();
  for (const icon of visible) {
    const variant = chosenVariant(icon);
    const card = document.createElement("article"); card.className = "library-card"; card.dataset.iconId = icon.id;
    const heading = document.createElement("h2"); heading.textContent = icon.name;
    const group = document.createElement("p"); group.className = "category"; group.textContent = categoryName(icon.category);
    const tile = document.createElement("div"); tile.className = "glyph-preview"; tile.append(image(variant, 112, icon.name));
    const source = document.createElement("p"); source.className = "source-path"; source.textContent = variant.source;
    const actions = document.createElement("div"); actions.className = "card-actions";
    const button = document.createElement("button"); button.type = "button"; button.className = "quiet"; button.textContent = "Review style";
    button.setAttribute("aria-label", "Review style of " + icon.name); button.addEventListener("click", () => openIcon(icon.id));
    actions.append(badge(icon), button); card.append(heading, group, tile, scales(variant), source, actions); host.append(card);
  }
  if (!visible.length) {
    const empty = document.createElement("p"); empty.className = "library-empty"; empty.textContent = "No icons match these filters."; host.append(empty);
  }
  for (const label of document.querySelectorAll(".page-range")) label.textContent = filtered.length ? `${start + 1}–${start + visible.length} of ${filtered.length} · page ${page}/${pages}` : "0 matching icons";
  for (const button of document.querySelectorAll("[data-page-prev]")) button.disabled = page <= 1;
  for (const button of document.querySelectorAll("[data-page-next]")) button.disabled = page >= pages;
}

function updatePreview() {
  const icon = icons.find(item => item.id === currentId);
  const variant = icon.variants.find(item => item.source === $("#variant").value);
  const large = image(variant, 256, icon.name);
  $("#dimensions").textContent = variant.format + " · " + Math.round(variant.bytes / 1024) + " KiB";
  large.addEventListener("load", () => {
    if (currentId === icon.id && $("#variant").value === variant.source) $("#dimensions").textContent = `${variant.format} · ${large.naturalWidth}×${large.naturalHeight} · ${Math.round(variant.bytes / 1024)} KiB`;
  }, { once: true });
  $("#large-preview").replaceChildren(large);
  $("#dialog-scales").replaceChildren(...scales(variant).childNodes);
  $("#dialog-source").textContent = variant.source;
}

function openIcon(id) {
  const icon = icons.find(item => item.id === id); if (!icon) return;
  currentId = id;
  $("#dialog-title").textContent = icon.name; $("#dialog-category").textContent = categoryName(icon.category);
  $("#current-decision").replaceChildren(badge(icon));
  if (icon.review?.stale) $("#current-decision").append(document.createTextNode(" This file has changed. Review the current image again."));
  $("#variant").replaceChildren(...icon.variants.map(variant => {
    const option = document.createElement("option"); option.value = variant.source; option.textContent = variant.format + " — " + variant.source; return option;
  }));
  $("#variant").value = chosenVariant(icon).source;
  $("#style-notes").value = icon.review?.notes ?? "";
  for (const checkbox of $("#reasons").querySelectorAll("input")) checkbox.checked = icon.review?.reasons?.includes(checkbox.value) ?? false;
  $("#dialog-message").textContent = "";
  const index = filtered.findIndex(item => item.id === id);
  $("#icon-position").textContent = `${index + 1}/${filtered.length}`;
  $("#previous-icon").disabled = index <= 0; $("#next-icon").disabled = index >= filtered.length - 1;
  updatePreview();
  if (!dialog.open) dialog.showModal();
}

function moveIcon(offset) {
  const index = filtered.findIndex(icon => icon.id === currentId);
  const next = filtered[index + offset]; if (next) openIcon(next.id);
}

async function saveDecision(value, advance) {
  const icon = icons.find(item => item.id === currentId);
  const variant = icon.variants.find(item => item.source === $("#variant").value);
  const index = filtered.findIndex(item => item.id === icon.id);
  const nextId = filtered[index + 1]?.id;
  const payload = { iconId: icon.id, source: variant.source, sourceSha256: variant.sha256, status: value,
    reasons: [...$("#reasons").querySelectorAll("input:checked")].map(input => input.value), notes: $("#style-notes").value };
  const buttons = [...dialog.querySelectorAll("button")]; const disabled = buttons.map(button => button.disabled);
  buttons.forEach(button => { button.disabled = true; }); $("#dialog-message").textContent = "Saving…";
  try {
    const response = await fetch("/api/style-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    icon.review = value === "unreviewed" ? null : result;
    $("#save-status").textContent = `Saved: ${icon.name} — ${statusLabel(value)}`;
    render();
    if (advance && nextId && filtered.some(item => item.id === nextId)) openIcon(nextId);
    else if (advance) dialog.close();
    else if (filtered.some(item => item.id === icon.id)) openIcon(icon.id);
    else dialog.close();
  } catch (error) { $("#dialog-message").textContent = error.message; }
  finally {
    buttons.forEach((button, i) => { button.disabled = disabled[i]; });
    if (dialog.open) {
      const now = filtered.findIndex(item => item.id === currentId);
      $("#previous-icon").disabled = now <= 0; $("#next-icon").disabled = now >= filtered.length - 1;
    }
  }
}

try {
  const response = await fetch("/api/catalog"); const catalog = await response.json();
  if (!response.ok) throw new Error(catalog.error);
  icons = catalog.icons; reasons = catalog.reasonOptions;
  for (const group of catalog.categories) {
    const option = document.createElement("option"); option.value = group; option.textContent = categoryName(group); category.append(option);
  }
  for (const reason of reasons) {
    const label = document.createElement("label"), input = document.createElement("input");
    input.type = "checkbox"; input.value = reason.id; label.append(input, document.createTextNode(reason.label)); $("#reasons").append(label);
  }
  readFilters(); render();
} catch (error) { $("#summary").textContent = "Cannot load icons: " + error.message; }

for (const field of [search, category, status]) field.addEventListener(field === search ? "input" : "change", () => { page = 1; render(); });
$("#clear-filters").addEventListener("click", () => { search.value = ""; category.value = ""; status.value = "all"; page = 1; render(); });
for (const button of document.querySelectorAll("[data-page-prev]")) button.addEventListener("click", () => { page--; render(); window.scrollTo(0, 0); });
for (const button of document.querySelectorAll("[data-page-next]")) button.addEventListener("click", () => { page++; render(); window.scrollTo(0, 0); });
$("#variant").addEventListener("change", updatePreview);
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#previous-icon").addEventListener("click", () => moveIcon(-1));
$("#next-icon").addEventListener("click", () => moveIcon(1));
$("#keep-next").addEventListener("click", () => saveDecision("keep", true));
$("#redo-next").addEventListener("click", () => saveDecision("redo", true));
$("#clear-decision").addEventListener("click", () => saveDecision("unreviewed", false));
window.addEventListener("popstate", () => { readFilters(); render(); });
