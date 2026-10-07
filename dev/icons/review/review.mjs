const [manifest, stored] = await Promise.all([
  fetch("/api/manifest").then(r => r.json()), fetch("/api/feedback").then(r => r.json())
]);
const host = document.querySelector("#items");
const template = document.querySelector("#item-template");
const activeItems = manifest.items.filter(item => item.status !== "resolved");

function imageOption(asset, itemId, selected) {
  const label = document.createElement("label");
  label.className = "option";
  label.innerHTML = `<div class="option-head"><input type="radio" name="${itemId}" value="${asset.id}" ${selected ? "checked" : ""}><span></span></div>
    <div class="tile"><img></div><div class="scales"></div><p class="candidate-note"></p>`;
  label.querySelector(".option-head span").textContent = asset.label;
  const main = label.querySelector(".tile img");
  if (asset.src) {
    main.src = asset.src; main.alt = asset.label;
  } else {
    main.remove();
    const empty = document.createElement("div");
    empty.className = "empty-preview";
    empty.textContent = asset.emptyLabel ?? "No dedicated asset";
    label.querySelector(".tile").append(empty);
  }
  const scales = label.querySelector(".scales");
  for (const size of asset.src ? [64, 32, 16] : []) {
    const span = document.createElement("span");
    const img = document.createElement("img"); img.src = asset.src; img.alt = ""; img.className = "s" + size;
    span.append(img, document.createTextNode(size + " px")); scales.append(span);
  }
  label.querySelector(".candidate-note").textContent = asset.note ?? "";
  return label;
}

for (const [index, item] of activeItems.entries()) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".card"); card.dataset.itemId = item.id;
  fragment.querySelector(".number").textContent = String(index + 1).padStart(2, "0");
  fragment.querySelector("h2").textContent = item.name;
  fragment.querySelector(".tier").textContent = item.tier;
  fragment.querySelector(".where").textContent = item.context;
  fragment.querySelector(".request").textContent = item.request;
  const old = stored.items?.[item.id] ?? {};
  const images = fragment.querySelector(".images");
  const assets = [{ ...item.current, id: "current", label: "Current" }, ...item.candidates];
  const selectedId = old.candidateId
    || (old.decision === "revise" ? item.candidates.at(-1)?.id : item.candidates[0]?.id)
    || "current";
  assets.forEach((asset, i) => images.append(imageOption(
    asset, item.id, asset.id === selectedId
  )));
  const decision = fragment.querySelector(".decision");
  const notes = fragment.querySelector("textarea");
  const button = fragment.querySelector("button");
  const saved = fragment.querySelector(".saved");
  decision.value = old.decision ?? "pending"; notes.value = old.notes ?? "";
  button.addEventListener("click", async () => {
    button.disabled = true; saved.textContent = "Saving…";
    const payload = {
      itemId: item.id, decision: decision.value,
      candidateId: card.querySelector("input:checked")?.value ?? "", notes: notes.value
    };
    try {
      const response = await fetch("/api/feedback", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      saved.textContent = "Saved " + new Date(result.updatedAt).toLocaleTimeString();
    } catch (err) {
      saved.textContent = "Error: " + err.message;
    } finally {
      button.disabled = false; updateSummary();
    }
  });
  host.append(fragment);
}

function updateSummary() {
  const decisions = [...document.querySelectorAll(".decision")].map(x => x.value);
  document.querySelector("#summary").textContent =
    `${manifest.title} · ${decisions.filter(x => x === "approve").length} approved · ` +
    `${decisions.filter(x => x === "revise").length} revisions · ` +
    `${decisions.filter(x => x === "pending").length} pending`;
}
updateSummary();
