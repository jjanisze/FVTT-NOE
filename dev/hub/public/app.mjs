const $ = selector => document.querySelector(selector);
let model, token, activeJob = null, loading = false;
const fmt = value => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Date unknown";
const actionNames = { doctor: "FVTT doctor", "campaign-start": "Start campaign", "poligon-open": "Open Poligon seat", "poligon-findings": "Export Poligon findings", "graphics-start": "Open graphics workshop" };
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "disabled") node.disabled = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child !== undefined && child !== null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
const empty = text => el("p", { class: "empty", text });
const badge = state => el("span", { class: `badge ${state === "passed" || state === "running" ? "good" : state === "failed" || state === "invalid" ? "bad" : state === "unfinished" || state === "refused" ? "warn" : ""}`, text: ({ passed: "Passed", failed: "Failed", invalid: "Unreadable", unfinished: "Unfinished", running: "Running", refused: "Refused", export: "Saved export", unknown: "Unknown" })[state] ?? state });
const rawDetails = (label, value) => el("details", {}, el("summary", { text: label }), el("pre", { text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }));

async function api(route, options) {
  const response = await fetch(route, { ...options, headers: { ...(options?.body ? { "content-type": "application/json", "x-hub-token": token } : {}), ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}
function notice(text) { $("#notice").textContent = text; $("#notice").hidden = !text; }
function openDetail(kind, ...children) { $("#detail-kind").textContent = kind; $("#detail-content").replaceChildren(...children.filter(child => child !== null && child !== undefined)); if (!$("#detail").open) $("#detail").showModal(); }
function setBadge(selector, text, style = "") { const node = $(selector); node.textContent = text; node.className = `badge ${style}`; }
function availability() {
  if (!model) return;
  const runtime = model.mode?.mode === "runtime", frozen = !!model.freeze?.frozen, chrome = model.chrome.up;
  for (const button of document.querySelectorAll("[data-action]")) {
    const action = button.dataset.action;
    button.disabled = !!activeJob || (action === "campaign-start" && (runtime || frozen || !model.profiles.campaign.configured)) || (["poligon-open", "poligon-findings"].includes(action) && !chrome);
    let hint = "";
    if (["poligon-open", "poligon-findings"].includes(action) && !chrome) hint = "Chrome debugging is unavailable. Open your Chrome debug launcher.";
    if (action === "poligon-open" && runtime && (!model.profiles.poligon.active || model.profiles.poligon.world !== "poligon" || $("#seat").value !== "Gamemaster")) { button.disabled = true; hint = "Runtime mode permits GM login to an already running Poligon."; }
    if (action === "campaign-start" && (runtime || frozen)) hint = runtime ? "Lifecycle operations are disabled in runtime mode." : "The campaign is frozen.";
    button.title = hint;
  }
}
function renderServices() {
  const campaign = model.profiles.campaign, poligon = model.profiles.poligon;
  setBadge("#mode", model.mode?.mode === "runtime" ? "Runtime" : "Development", model.mode?.mode === "runtime" ? "warn" : "");
  setBadge("#campaign-state", campaign.active ? "Running" : campaign.reachable ? "Setup" : "Stopped", campaign.active ? "good" : "");
  $("#campaign-description").textContent = campaign.active ? `World · ${campaign.world}` : campaign.configured ? "Your campaign is ready when you are." : "Campaign profile needs configuration.";
  const campaignControl = campaign.href ? el("a", { href: campaign.href, target: "noe-campaign", text: campaign.active ? "Open campaign ↗" : "Open Foundry setup ↗" }) : el("button", { "data-action": "campaign-start", text: "Start campaign ↗", disabled: !campaign.configured });
  const campaignKey = JSON.stringify([campaign.href, campaign.configured]);
  if ($("#campaign-controls").dataset.state !== campaignKey) { $("#campaign-controls").replaceChildren(campaignControl); $("#campaign-controls").dataset.state = campaignKey; }
  const clone = poligon.active && poligon.world !== "poligon";
  setBadge("#poligon-state", clone ? "Clone running" : poligon.active ? "Running" : "Stopped", clone ? "warn" : poligon.active ? "good" : "");
  $("#poligon-description").textContent = !model.chrome.up ? "Chrome debugging unavailable · reports and galleries still work." : clone ? "The campaign clone is open. Switching returns to Poligon." : "Stations, personas and room to experiment.";
  $("#poligon-open").textContent = clone ? "Switch to Poligon ↗" : poligon.active ? "Open seat ↗" : "Start & open ↗";
  $("#service-strip").replaceChildren(...["sandbox", "release"].map(name => el("span", { class: "service-item" }, el("i", { class: `dot ${model.profiles[name].active ? "good" : ""}`, "aria-hidden": "true" }), `${name === "sandbox" ? "Agent sandbox" : "Release sandbox"} · ${model.profiles[name].active ? "running" : "stopped"}`)), el("span", { class: "service-item" }, el("i", { class: `dot ${model.chrome.up ? "good" : "bad"}`, "aria-hidden": "true" }), `Chrome debugging · ${model.chrome.up ? "available" : "unavailable"}`));
  $("#footer-state").textContent = model.freeze?.frozen ? "Campaign freeze is on." : model.revision ? `Working tree · ${model.revision.slice(0, 8)}` : "Local workspace";
}
function destinationRow(entry) {
  const attrs = { class: `destination-row ${entry.available ? "" : "missing"}` };
  const node = entry.href ? el("a", { ...attrs, href: entry.href, ...(entry.kind === "gallery" ? { target: "_blank", rel: "noopener" } : {}) }) : el("button", { ...attrs, disabled: !entry.available, "data-document": entry.id });
  node.append(el("span", { class: "destination-icon", "aria-hidden": "true", text: entry.kind === "gallery" ? "▧" : "≡" }), el("span", { class: "destination-copy" }, el("strong", { text: entry.label }), el("small", { text: entry.available ? entry.group ?? "Workspace" : "Not generated / unavailable" })), el("span", { class: "arrow", "aria-hidden": "true", text: "↗" }));
  if (!entry.available) { node.setAttribute("aria-disabled", "true"); if (node.tagName === "A") node.removeAttribute("href"); }
  return node;
}
function renderDestinations() {
  const query = $("#search").value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ł", "l");
  const signature = JSON.stringify([query, model.destinations]);
  if ($("#destination-list")._signature === signature) return;
  $("#destination-list")._signature = signature;
  const matches = model.destinations.filter(e => `${e.label} ${e.group} ${e.path}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ł", "l").includes(query));
  $("#gallery-count").textContent = String(matches.length).padStart(2, "0");
  const current = matches.filter(e => !e.historical && e.kind === "gallery"), refs = matches.filter(e => e.kind !== "gallery"), history = matches.filter(e => e.historical && e.kind === "gallery");
  const nodes = current.map(destinationRow);
  if (refs.length) { const details = el("details", { ...(query ? { open: "" } : {}) }, el("summary", { text: `Reference & notes (${refs.length})` }), ...refs.map(destinationRow)); nodes.push(details); }
  if (history.length) nodes.push(el("details", { ...(query ? { open: "" } : {}) }, el("summary", { text: `Earlier reviews & captures (${history.length})` }), ...history.map(destinationRow)));
  $("#destination-list").replaceChildren(...(nodes.length ? nodes : [empty("No matching gallery or reference.")]));
}
function reportCard(report) {
  const kind = report.kind === "e2e" ? "E2E" : report.kind === "release" ? report.fullGate ? "Full release gate" : report.ci ? "CI check" : "Partial release check" : "Poligon findings";
  return el("button", { class: "report-card", "data-report": report.id }, el("span", { class: "report-top" }, el("strong", { text: kind }), badge(report.state)), el("div", { class: "report-meta", text: `${fmt(report.at)}${report.total !== undefined ? ` · ${report.passed}/${report.total} ${report.kind === "e2e" ? "suites" : "steps"}` : ""}` }), el("div", { class: "report-scope", text: report.scope?.slice(0, 6).join(" · ") || report.label }), el("div", { class: "report-provenance", text: report.kind === "findings" ? "Saved export · refresh explicitly for live findings" : report.commit ? `Commit ${report.commit.slice(0, 8)}${report.commit !== model.revision ? " · differs from current HEAD" : " · working-tree changes not identified"}` : "Code version unknown · saved result" }));
}
function renderReports() {
  const filter = $("#report-filter").value;
  const signature = JSON.stringify([filter, model.reports, model.revision]);
  if ($("#report-list")._signature === signature) return;
  $("#report-list")._signature = signature;
  const items = filter === "recent" ? [model.latest.e2e, model.latest.release, model.latest.findings].filter(Boolean) : model.reports.filter(r => r.kind === filter).slice(0, 40);
  $("#report-list").replaceChildren(...(items.length ? items.map(reportCard) : [empty("No saved report for this category.")]));
}
function renderDoctor() {
  const diagnostic = model.diagnostics;
  if (!diagnostic) return;
  if ($("#doctor-content")._checkedAt === diagnostic.at) return;
  $("#doctor-content")._checkedAt = diagnostic.at;
  const data = diagnostic.data;
  const messages = [...(data.problems ?? []), ...(data.hints ?? [])];
  if (data.error) messages.unshift(data.error);
  $("#doctor-content").replaceChildren(el("p", { class: "doctor-stamp", text: `Checked ${fmt(diagnostic.at)} · ${data.install?.foundry ? `Foundry ${data.install.foundry}` : "diagnostics"}` }), messages.length ? el("div", { class: "doctor-lines" }, ...messages.map(text => el("p", { class: "doctor-line", text }))) : empty("Doctor reported no problems."), rawDetails("Full diagnostic result", data));
}
function renderJobs() {
  const jobs = model.jobs ?? [];
  $("#jobs").replaceChildren(...(jobs.length ? jobs.slice(0, 8).map(job => el("div", { class: "job-row" }, el("div", {}, el("button", { "data-job": job.id, text: actionNames[job.action] ?? job.action }), el("small", { text: fmt(job.startedAt) })), badge(job.state))) : [empty("No operations from this desk yet.")]));
  activeJob = jobs.find(j => j.state === "running")?.id ?? null;
}
async function refresh() {
  if (loading) return;
  loading = true;
  try {
    model = await api("/api/overview");
    document.title = model.title;
    if (model.subtitle) $("#subtitle").textContent = model.subtitle;
    $("#last-update").textContent = `Services checked ${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", timeStyle: "short" }).format(new Date(model.at))}`;
    renderServices(); renderDestinations(); renderReports(); renderDoctor(); renderJobs(); availability();
  } catch (error) { notice(`Could not refresh the desk: ${error.message}. Last results remain visible.`); }
  finally { loading = false; }
}
async function showReport(id) {
  try {
    const report = await api(`/api/reports/${id}`);
    if (report.text !== undefined) return openDetail("POLIGON · SAVED FINDINGS", el("h2", { text: report.label }), el("p", { class: "report-meta", text: `Export saved ${fmt(report.at)}` }), el("pre", { text: report.text }));
    const nodes = [el("h2", { text: report.label }), el("div", { class: "detail-summary" }, badge(report.state), el("span", { class: "report-meta", text: fmt(report.at) })), el("p", { class: "report-provenance", text: report.commit ? `Recorded commit ${report.commit}` : "This report does not record the tested code version." })];
    if (report.error) nodes.push(empty(report.error));
    if (report.data?.boot) nodes.push(rawDetails("Client boot diagnostics", report.data.boot));
    for (const suite of report.data?.suites ?? report.data?.steps ?? []) {
      const section = el("section", { class: "suite" }, el("div", { class: "suite-heading" }, el("strong", { text: suite.name }), badge(suite.skipped ? "Skipped" : suite.ok ? "passed" : "failed")));
      if (suite.ms !== undefined) section.append(el("p", { class: "report-meta", text: `${(suite.ms / 1000).toFixed(1)} s` }));
      if (suite.error) section.append(el("p", { class: "report-scope", text: typeof suite.error === "string" ? suite.error : suite.error.message ?? JSON.stringify(suite.error) }));
      for (const key of ["steps", "problems", "hint", "notes", "consoleErrors", "seedConsoleErrors", "lateConsoleErrors", "compat"]) if (suite[key] && (typeof suite[key] !== "object" || Object.keys(suite[key]).length)) section.append(rawDetails(key.replace(/([A-Z])/g, " $1"), suite[key]));
      nodes.push(section);
    }
    if (report.artifacts?.length) nodes.push(el("h3", { text: "Evidence" }), el("div", { class: "artifacts" }, ...report.artifacts.map(a => el("a", { class: "artifact", href: a.href, target: "_blank", rel: "noopener" }, /\.(png|jpe?g|webp)$/i.test(a.label) && a.available ? el("img", { src: a.href, alt: a.label, loading: "lazy" }) : null, el("small", { text: a.label })))));
    if (report.data) nodes.push(rawDetails("Complete report JSON", report.data));
    openDetail(report.kind.toUpperCase(), ...nodes);
  } catch (error) { notice(error.message); }
}
async function runAction(button) {
  if (!token) return notice("The hub session is still loading. Try again shortly.");
  const action = button.dataset.action, params = {};
  if (action === "graphics-start" && model.graphics?.href) { window.open(new URL(button.dataset.target ?? "", model.graphics.href).href, "noe-graphics"); return; }
  if (action === "poligon-open") {
    params.seat = $("#seat").value;
    if (model.profiles.poligon.active && model.profiles.poligon.world !== "poligon") {
      if (!window.confirm("Switch from the campaign clone to the normal Poligon? The Poligon server will restart. Existing human-presence guards still apply.")) return;
      params.switchWorld = true;
    }
  }
  const target = button.dataset.target;
  let popup;
  if (action === "graphics-start" || action === "campaign-start") popup = window.open("about:blank", action === "graphics-start" ? "noe-graphics" : "noe-campaign");
  try {
    notice("");
    const job = await api("/api/jobs", { method: "POST", body: JSON.stringify({ action, params }) });
    activeJob = job.id; availability();
    notice(`${actionNames[action]} is running. You can keep using the desk.`);
    let current = job;
    while (current.state === "running") { await new Promise(resolve => setTimeout(resolve, 750)); current = await api(`/api/jobs/${job.id}`); }
    const success = current.state === "passed";
    const href = current.result?.href;
    if (success && href && popup) { popup.location.href = action === "graphics-start" ? new URL(target ?? "", href).href : href; popup = null; }
    if (success && href && !popup) { /* The result remains available through Operations if a browser blocks its window. */ }
    notice(success ? `${actionNames[action]} completed.` : [current.result?.error ?? `${actionNames[action]} finished with findings.`, current.result?.hint].filter(Boolean).join(" "));
    if (action === "doctor" && !success) notice("Diagnostics completed with findings. See FVTT doctor below.");
  } catch (error) { notice(error.message); }
  finally { if (popup && popup.location.href === "about:blank") popup.close(); activeJob = null; await refresh(); }
}

document.addEventListener("click", async event => {
  const action = event.target.closest("[data-action]"); if (action && !action.disabled) return runAction(action);
  const report = event.target.closest("[data-report]"); if (report) return showReport(report.dataset.report);
  const doc = event.target.closest("[data-document]"); if (doc && !doc.disabled) { try { const data = await api(`/api/documents/${doc.dataset.document}`); openDetail("REFERENCE", el("h2", { text: data.label }), el("pre", { text: data.text })); } catch (error) { notice(error.message); } }
  const job = event.target.closest("[data-job]"); if (job) { try { const data = await api(`/api/jobs/${job.dataset.job}`); openDetail("OPERATION", el("h2", { text: actionNames[data.action] ?? data.action }), badge(data.state), data.result?.href ? el("a", { href: data.result.href, target: "_blank", rel: "noopener", class: "destination-row", text: "Open result ↗" }) : null, rawDetails("Result", data.result ?? "Operation is running…"), rawDetails("Command output", data.progress ?? "")); } catch (error) { notice(error.message); } }
});
$("#close-detail").addEventListener("click", () => $("#detail").close());
$("#detail").addEventListener("click", event => { if (event.target === $("#detail")) { const box = $("#detail").getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $("#detail").close(); } });
$("#search").addEventListener("input", () => model && renderDestinations());
$("#report-filter").addEventListener("change", () => model && renderReports());
$("#seat").addEventListener("change", availability);
$("#today").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", day: "numeric", month: "long", year: "numeric" }).format(new Date());
try { ({ token } = await api("/api/session")); } catch (error) { notice(error.message); }
await refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 6000);
