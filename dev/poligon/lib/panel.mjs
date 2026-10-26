/**
 * The Poligon panel (PLAN_human_testing.md §3.5): one window, GM only, opened from the scene-controls
 * button (or Ctrl+Shift+P). Tabs: Stanowiska, Karta prób, Obsada, Wariant, Czas, Kości, Widok gracza,
 * Liczniki, Świeżość, Uwagi. Every button calls `game.poligon` — the same API `fvtt poligon:*` uses.
 */

import { MODULE_ID } from "./guard.mjs";
import { stan, stamp, werdykty } from "./state.mjs";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const btn = (op, label, { arg = "", icon = null, title = "", extra = "" } = {}) =>
  `<button type="button" data-action="op" data-op="${op}" data-arg="${esc(arg)}" title="${esc(title)}" ${extra}>${icon ? `<i class="${icon}"></i> ` : ""}${esc(label)}</button>`;

const TABS = [
  ["stanowiska", "Stanowiska"], ["proby", "Karta prób"], ["obsada", "Obsada"], ["wariant", "Wariant"], ["czas", "Czas"],
  ["kosci", "Kości"], ["gracze", "Widok gracza"], ["liczniki", "Liczniki"], ["swiezosc", "Świeżość"], ["uwagi", "Uwagi"]
];

let instance = null;

export function openPanel() {
  if (!game.user.isGM) return ui.notifications.warn("Panel Poligonu jest dla MG.");
  instance ??= new PoligonPanel();
  instance.render({ force: true });
  return instance;
}

export function refreshPanel() {
  if (instance?.rendered) instance.render();
}

class PoligonPanel extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "poligon-panel",
    classes: ["poligon-panel"],
    window: { title: "Poligon", icon: "fa-solid fa-flask-vial", resizable: true },
    position: { width: 500, height: 720, left: 110, top: 70 },
    // Not "tab": ApplicationV2 reserves that action for its own tab groups and never reaches `actions`.
    actions: { op: PoligonPanel.#op, zakladka: PoligonPanel.#tab }
  };

  tab = "stanowiska";
  busy = null;
  swiezosc = null;
  pokrycie = null;

  async _renderHTML() {
    const body = document.createElement("div");
    body.className = "poligon-body";
    const nav = TABS.map(([id, label]) => `<button type="button" data-action="zakladka" data-tab="${id}" class="${this.tab === id ? "active" : ""}">${label}</button>`).join("");
    let content;
    try {
      content = await this[`_${this.tab}`]();
    } catch (err) {
      console.error("Poligon | panel", err);
      content = `<p class="poligon-bad">${esc(err.message)}</p>`;
    }
    body.innerHTML = `<nav class="poligon-tabs">${nav}</nav><section class="poligon-tab">${this.busy ? `<p class="poligon-warn"><i class="fa-solid fa-spinner fa-spin"></i> ${esc(this.busy)}</p>` : ""}${content}</section>`;
    return body;
  }

  _replaceHTML(result, content) {
    const scroll = content.querySelector(".poligon-tab")?.scrollTop ?? 0;
    content.replaceChildren(result);
    const tab = content.querySelector(".poligon-tab");
    if (tab) tab.scrollTop = scroll;
  }

  static #tab(event, target) {
    this.tab = target.dataset.tab;
    this.render();
  }

  /** Every button: `data-op` names the operation, `data-arg` its argument. Long ones show as busy. */
  static async #op(event, target) {
    const { op, arg } = target.dataset;
    const P = game.poligon;
    const run = async (label, fn) => {
      this.busy = label;
      this.render();
      try {
        return await fn();
      } catch (err) {
        console.error("Poligon |", op, err);
        ui.notifications.error(`Poligon: ${err.message}`);
      } finally {
        this.busy = null;
        this.render();
      }
    };
    switch (op) {
      case "go": return run(`Idę na ${arg}…`, () => P.stations.go(arg));
      case "reset": return run(`Buduję ${arg}…`, async () => {
        const [r] = await P.stations.reset(arg);
        ui.notifications[r.ok ? "info" : "error"](`Poligon: ${arg} ${r.ok ? `gotowe (${Math.round(r.ms / 1000)} s${r.missing.length ? `, braki: ${r.missing.length}` : ""})` : r.error}`);
      });
      case "reset-all": {
        const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Reset wszystkiego" }, content: "<p>Zbudować od nowa <strong>wszystkie</strong> stanowiska? Wszystko, co na nich jest, zniknie.</p>" });
        if (ok) return run("Buduję wszystkie stanowiska…", () => P.stations.reset("all"));
        return;
      }
      case "view": return P.stations.view(...arg.split("|"));
      case "tool": {
        const s = P.stations.get(stan().active);
        const t = s?.narzedzia?.[Number(arg)];
        return t?.run();
      }
      case "werdykt": {
        const [station, probe, v] = arg.split("|");
        const cur = werdykty()[`${station}/${probe}`];
        const commit = (await stamp())?.commit ?? null;
        await P.werdykty.set(station, probe, cur?.verdict === v && v === "ok" ? null : v, { commit });
        if (v === "bad") await P.uwagi.form({ probe: `${station}/${probe}`, severity: "blad" });
        if (v === "note") await P.uwagi.form({ probe: `${station}/${probe}`, severity: "pomysl" });
        return this.render();
      }
      case "obsada-build": return run("Buduję Obsadę przez awans dnd5e…", async () => {
        const r = await P.obsada.build({ rebuild: arg === "rebuild" });
        ui.notifications.info(`Obsada: zbudowano ${r.built.length}, pominięto ${r.skipped}${r.failed.length ? `, BŁĘDY ${r.failed.length}` : ""}`);
      });
      case "obsada-take": return run(`Biorę ${arg} na Plac…`, () => P.obsada.take(arg));
      case "pokrycie": return run("Liczę pokrycie…", async () => { this.pokrycie = await P.obsada.coverage(); });
      case "preset": return run(`Wariant ${arg}…`, () => P.wariant.preset(arg));
      case "switch": return P.wariant.set(arg, !game.settings.get(MODULE_ID, arg)).then(() => this.render());
      case "ui": {
        const [k, v] = arg.split("=");
        const cfg = game.settings.get("core", "uiConfig");
        const val = k === "scheme" ? v : Math.round((Number(cfg[k]) + Number(v)) * 100) / 100;
        return P.wariant.ui({ [k]: val });
      }
      case "czas": {
        const [what, n] = arg.split(":");
        if (what === "min") return run(`+${n} min…`, () => P.czas.advance(Number(n)));
        if (what === "runda") return P.czas.runda();
        if (what === "tura") return P.czas.tura();
        if (what === "ko") return P.czas.odpoczynek("short");
        if (what === "do") return P.czas.odpoczynek("long");
        if (what === "zachod") return P.czas.zachod();
        return;
      }
      case "kosci": {
        const form = target.closest(".poligon-tab");
        const [face, size] = arg ? arg.split("/") : [form.querySelector("[name=face]").value, form.querySelector("[name=size]").value];
        P.kosci.rig(String(face).split(/[ ,]+/).filter(Boolean).map(Number), Number(size || 20));
        return this.render();
      }
      case "kosci-clear": P.kosci.clear(); return this.render();
      case "seat": {
        const actor = canvas.tokens?.controlled[0]?.actor;
        const u = game.users.getName(arg);
        if (!actor || !u) return ui.notifications.warn("Zaznacz żeton aktora, którego ma grać ten gracz.");
        await actor.update({ [`ownership.${u.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
        await u.update({ character: actor.id });
        return this.render();
      }
      case "copy": await navigator.clipboard?.writeText(arg); return ui.notifications.info("Skopiowano.");
      case "liczniki-zero": P.liczniki.reset(); return this.render();
      case "klatki": P.liczniki.frames(); return this.render();
      case "swiezosc": return run("Sprawdzam świeżość…", async () => { this.swiezosc = await P.swiezosc.check(); });
      case "uwaga": return P.uwagi.form({ probe: arg || null });
      case "uwaga-open": return fromUuid(arg).then(p => p?.parent?.sheet.render(true, { pageId: p.id }));
      case "refresh": return this.render();
      default: return null;
    }
  }

  /* -------------------------------------------- */

  async _stanowiska() {
    const list = await game.poligon.stations.list();
    const label = { built: "zbudowane", stale: "inny commit", never: "nie zbudowane" };
    const rows = list.map(s => `<div class="poligon-row" title="${esc(game.poligon.stations.get(s.id)?.opis)}">
      <span class="poligon-prio">${s.prio}</span>
      <span class="grow"><strong>${esc(s.name)}</strong>${s.gracze ? ` <span class="poligon-muted">· ${s.gracze} miejsc</span>` : ""}
        ${s.missing ? `<span class="poligon-warn" title="braki w ostatniej budowie — Karta prób"> · braki ${s.missing}</span>` : ""}${s.error ? `<span class="poligon-bad"> · błąd</span>` : ""}</span>
      <span class="poligon-state ${s.state} ${s.active ? "active" : ""}">${s.active ? "▶ " : ""}${label[s.state]}</span>
      ${btn("go", "Idź", { arg: s.id, icon: "fa-solid fa-person-walking-arrow-right" })}${btn("reset", "Reset", { arg: s.id, icon: "fa-solid fa-rotate" })}
    </div>`).join("");
    return `<div class="poligon-actions">${btn("reset-all", "Reset wszystko", { icon: "fa-solid fa-dumpster-fire" })}${btn("uwaga", "Uwaga", { icon: "fa-solid fa-flag" })}${btn("refresh", "Odśwież", { icon: "fa-solid fa-arrows-rotate" })}</div>
      <p class="poligon-muted">Idź = scena stanowiska aktywna dla wszystkich, miejsca graczy (Gracz 1–5) i drużyna przestawione na to stanowisko. Reset kasuje tylko to stanowisko i buduje je od nowa. Najedź na wiersz — opis.</p>${rows}`;
  }

  async _proby() {
    const id = stan().active;
    const s = game.poligon.stations.get(id);
    if (!s) return "<p>Najpierw <em>Idź</em> na jakieś stanowisko (zakładka Stanowiska).</p>";
    const rec = stan().stations?.[id] ?? {};
    const w = werdykty();
    const commit = (await stamp())?.commit ?? null;
    const tools = (s.narzedzia ?? []).map((t, i) => btn("tool", t.label, { arg: String(i), icon: t.icon })).join("");
    const groups = new Map();
    for (const pr of s.proby ?? []) {
      if (!groups.has(pr.grupa)) groups.set(pr.grupa, []);
      groups.get(pr.grupa).push(pr);
    }
    const done = (s.proby ?? []).filter(pr => w[`${id}/${pr.id}`]).length;
    const html = [...groups].map(([g, list]) => `<h3>${esc(g)}</h3>${list.map(pr => {
      const v = w[`${id}/${pr.id}`];
      const stale = v?.verdict === "ok" && v.commit && commit && v.commit !== commit;
      const b = (val, icon, cls) => `<button type="button" data-action="op" data-op="werdykt" data-arg="${id}|${pr.id}|${val}" class="${v?.verdict === val ? `on ${cls}` : ""}" title="${val === "ok" ? "Zostaje" : val === "bad" ? "Zmienić → Uwaga" : "Komentarz → Uwaga"}">${icon}</button>`;
      return `<div class="poligon-probe ${stale ? "stale-verdict" : ""}">
        <div class="text">${pr.warstwa ? `<span class="poligon-layer ${pr.warstwa}">${pr.warstwa}</span>` : ""}${esc(pr.tekst)}</div>
        ${pr.jak ? `<div class="how">${esc(pr.jak)}</div>` : ""}
        <div class="verdicts">${b("ok", "✅", "ok")}${b("bad", "❌", "bad")}${b("note", "💬", "note")}
          ${v ? `<span class="poligon-muted">${esc(v.user)} · ${esc((v.at ?? "").slice(0, 16).replace("T", " "))}${v.commit ? ` · ${esc(v.commit)}` : ""}</span>` : ""}</div>
      </div>`;
    }).join("")}`).join("");
    const missing = rec.missing?.length ? `<details><summary class="poligon-warn">Braki w ostatniej budowie (${rec.missing.length})</summary><ul>${rec.missing.map(m => `<li>${esc(m)}</li>`).join("")}</ul></details>` : "";
    const log = rec.log?.length ? `<details><summary class="poligon-muted">Dziennik budowy</summary><pre style="white-space:pre-wrap;font-size:11px">${esc(rec.log.join("\n"))}</pre></details>` : "";
    return `<h3 style="margin-top:0">${esc(s.name)} <span class="poligon-muted">— ${done}/${s.proby?.length ?? 0} ocenionych</span></h3>
      <p class="poligon-muted">${esc(s.opis)}</p>${tools ? `<div class="poligon-actions">${tools}</div>` : ""}${missing}${log}
      <p class="poligon-muted">✅ zostaje · ❌ zmienić (otwiera Uwagę) · 💬 komentarz. Werdykt pamięta commit; ✅ sprzed innego commitu prosi o ponowne spojrzenie.</p>${html}`;
  }

  async _obsada() {
    const built = await game.poligon.obsada.built();
    const R = game.poligon.obsada.ROSTER;
    const n = R.filter(p => built[p.id]).length;
    const st = await stamp();
    const changed = st?.classData?.changedAt;
    const groups = new Map();
    for (const p of R) {
      if (!groups.has(p.grupa)) groups.set(p.grupa, []);
      groups.get(p.grupa).push(p);
    }
    const cov = this.pokrycie ? `<div class="poligon-kv">${Object.keys(this.pokrycie.total).map(k => `<span>${esc(k)}</span><span>${this.pokrycie.covered[k]}/${this.pokrycie.total[k]}${this.pokrycie.missing[k].length ? ` <span class="poligon-warn" title="${esc(this.pokrycie.missing[k].join(", "))}">brak: ${esc(this.pokrycie.missing[k].slice(0, 6).join(", "))}${this.pokrycie.missing[k].length > 6 ? " …" : ""}</span>` : " ✅"}</span>`).join("")}</div>` : "";
    const rows = [...groups].map(([g, list]) => `<h3>${esc(g)}</h3>${list.map(p => {
      const b = built[p.id];
      const stale = b && changed && b.builtAt < changed;
      return `<div class="poligon-row"><span class="grow"><strong>${esc(p.name)}</strong> <span class="poligon-muted">${esc(p.rola)}</span></span>
        <span class="poligon-state ${b ? (stale ? "stale" : "built") : "never"}" title="${b ? `zbudowano ${esc(b.builtAt)}, ${b.steps} kroków awansu` : ""}">${b ? (stale ? "starsza od klas" : "jest") : "brak"}</span>
        ${btn("obsada-take", "Weź", { arg: p.id, title: "Kopia na Plac (zbuduje, jeśli trzeba)" })}</div>`;
    }).join("")}`).join("");
    return `<p>Zbudowane ${n}/${R.length}. Każda osoba przechodzi prawdziwy AdvancementManager dnd5e (~7 s); stanowiska biorą kopie.</p>
      <div class="poligon-actions">${btn("obsada-build", "Zbuduj brakujące", { icon: "fa-solid fa-user-gear" })}${btn("obsada-build", "Przebuduj wszystkie", { arg: "rebuild", icon: "fa-solid fa-rotate" })}${btn("pokrycie", "Pokrycie automatyki", { icon: "fa-solid fa-list-check" })}</div>${cov}${rows}`;
  }

  async _wariant() {
    const W = game.poligon.wariant;
    const cur = W.current();
    const sw = W.przelaczniki().map(s => `<div class="poligon-row"><span class="grow">${esc(s.name)} <span class="poligon-muted">${esc(s.key)}</span></span>${btn("switch", s.value ? "wł." : "wył.", { arg: s.key, extra: s.value ? "style=\"background:var(--poligon-ok);color:#fff\"" : "" })}</div>`).join("");
    const ui = game.settings.get("core", "uiConfig");
    return `<p>Teraz: <strong>${cur}</strong>. RAI nie ma przełącznika — jest zawsze (scripts/wkk/README.md).</p>
      <div class="poligon-actions">${btn("preset", "NOE (Kobalt wył.)", { arg: "NOE" })}${btn("preset", "WKK (Kobalt wł.)", { arg: "WKK" })}</div>
      <h3>Przełączniki modułu (świat)</h3>${sw}
      <h3>Ten klient</h3>
      <div class="poligon-kv"><span>Motyw</span><span>${btn("ui", "ciemny", { arg: "scheme=dark" })} ${btn("ui", "jasny", { arg: "scheme=light" })} ${btn("ui", "domyślny", { arg: "scheme=" })} <span class="poligon-muted">${esc(ui.colorScheme?.applications || "domyślny")}</span></span>
      <span>Skala interfejsu</span><span>${btn("ui", "−", { arg: "uiScale=-0.1" })} ${ui.uiScale} ${btn("ui", "+", { arg: "uiScale=0.1" })}</span>
      <span>Rozmiar czcionki</span><span>${btn("ui", "−", { arg: "fontScale=-1" })} ${ui.fontScale} ${btn("ui", "+", { arg: "fontScale=1" })}</span></div>
      <p class="poligon-muted">Rozdzielczości (1366×768 itd.): zmień rozmiar okna przeglądarki — Foundry liczy z rozmiaru okna.</p>`;
  }

  async _czas() {
    const t = game.time;
    const cal = t.calendar?.format?.(t.components) ?? null;
    const combat = game.combat?.started ? `Walka: runda ${game.combat.round}, tura ${esc(game.combat.combatant?.name)}` : "Bez walki";
    return `<p>Czas świata: <strong>${esc(cal ?? `${Math.round(t.worldTime)} s`)}</strong> · ${combat}</p>
      <p class="poligon-muted">Przez zegar modułu (karta w czacie, dźwięk) — każdy hak czasu to widzi. Poligon ma własny zegar, kampania stoi.</p>
      <h3>Tura</h3><div class="poligon-actions">${btn("czas", "+1 tura", { arg: "tura" })}${btn("czas", "+1 runda", { arg: "runda" })}</div>
      <h3>Zegar</h3><div class="poligon-actions">${btn("czas", "+10 min", { arg: "min:10" })}${btn("czas", "+30 min", { arg: "min:30" })}${btn("czas", "+1 h", { arg: "min:60" })}${btn("czas", "+8 h", { arg: "min:480" })}${btn("czas", "+1 doba", { arg: "min:1440" })}</div>
      <h3>Odpoczynek i dzień</h3><div class="poligon-actions">${btn("czas", "KO (zaznaczeni / drużyna)", { arg: "ko" })}${btn("czas", "DO (zaznaczeni / drużyna)", { arg: "do" })}${btn("czas", "Zachód słońca", { arg: "zachod", icon: "fa-solid fa-sun" })}</div>`;
  }

  async _kosci() {
    const q = game.poligon.kosci.queue();
    return `<p>Ustaw następną kość <strong>w tym oknie przeglądarki</strong> (MG). Rzut gracza ustawia się w oknie gracza: konsola → <code>game.poligon.kosci.rig([1])</code>.</p>
      <div class="poligon-actions">${btn("kosci", "Krytyk (k20 = 20)", { arg: "20/20" })}${btn("kosci", "Pechowa 1 (k20 = 1)", { arg: "1/20" })}${btn("kosci", "RO oblany (k20 = 2)", { arg: "2/20" })}${btn("kosci", "k100 = 1", { arg: "1/100" })}</div>
      <div class="poligon-row"><span>Ścianki</span><input name="face" type="text" value="20" style="width:90px" title="np. 20, 1, 13"><span>kość k</span><input name="size" type="number" value="20" style="width:60px">${btn("kosci", "Ustaw")}</div>
      <p>W kolejce: ${q.length ? q.map(x => `<strong>${x.face}</strong>/k${x.faces}`).join(", ") : "nic"} ${q.length ? btn("kosci-clear", "Wyczyść") : ""}</p>
      <p class="poligon-muted">Każdy wpis czeka na kość swojego rozmiaru i zużywa się raz; dopóki coś jest w kolejce, baner pokazuje KOŚCI.</p>`;
  }

  async _gracze() {
    const join = new URL(foundry.utils.getRoute("join"), window.location.href).href;
    const rows = game.users.filter(u => !u.isGM).map(u => `<div class="poligon-row">
      <span class="grow"><strong>${esc(u.name)}</strong> ${u.active ? "<span class=\"poligon-good\">● online</span>" : "<span class=\"poligon-muted\">○</span>"}<br>
      <span class="poligon-muted">gra: ${esc(u.character?.name ?? "—")}</span></span>
      ${btn("seat", "Przypisz zaznaczony", { arg: u.name, title: "Zaznaczony żeton → postać tego gracza (+ własność)" })}
      ${btn("copy", "fvtt", { arg: `npm run fvtt -- login --profile=poligon --user="${u.name}"`, title: "Kopiuj polecenie: osobne okno tego gracza" })}</div>`).join("");
    return `<p>Każde miejsce gracza to osobne okno przeglądarki z własnymi ciasteczkami (izolowany kontekst) — <code>npm run fvtt -- poligon:start --seats=3</code> otwiera trzy. Ręcznie: link do dołączenia w <em>innej</em> przeglądarce albo oknie incognito (ta sama przeglądarka bez izolacji wylogowałaby kartę kampanii).</p>
      <div class="poligon-actions">${btn("copy", "Kopiuj link dołączenia", { arg: join, icon: "fa-solid fa-link" })}</div>${rows}`;
  }

  async _liczniki() {
    const L = game.poligon.liczniki.read();
    return `<div class="poligon-kv"><span>Od</span><span>${esc(L.since.slice(11, 19))} (${L.seconds} s)</span>
      <span>Wiadomości czatu</span><span><strong>${L.messages}</strong></span>
      <span>Zapisy dokumentów</span><span><strong>${L.writes}</strong> ${L.top.length ? `<span class="poligon-muted">(${esc(L.top.map(([k, v]) => `${k} ${v}`).join(", "))})</span>` : ""}</span>
      <span>Klatki</span><span>${L.frames ? `p50 ${L.frames.p50?.toFixed(1)} ms · p95 <strong>${L.frames.p95?.toFixed(1)} ms</strong> · max ${L.frames.max?.toFixed(1)} ms (${L.frames.n})` : "wył."}</span></div>
      <div class="poligon-actions">${btn("liczniki-zero", "Zeruj", { icon: "fa-solid fa-eraser" })}${btn("klatki", L.sampling ? "Klatki: wył." : "Klatki: wł.", { icon: "fa-solid fa-gauge-high" })}${btn("refresh", "Odśwież")}</div>
      <p class="poligon-muted">„Ten strzał kosztował 4 karty i 11 zapisów” — zeruj przed akcją, odczytaj po. Liczy ten klient.</p>`;
  }

  async _swiezosc() {
    const s = this.swiezosc;
    if (!s) return `<p>Czy to, co oceniasz, to bieżący kod?</p>${btn("swiezosc", "Sprawdź", { icon: "fa-solid fa-magnifying-glass" })}`;
    const built = await game.poligon.obsada.built();
    const staleObsada = s.classData?.changedAt ? Object.values(built).filter(b => b.builtAt < s.classData.changedAt).length : 0;
    return `<div class="poligon-kv">
      <span>Commit</span><span><strong>${esc(s.commit ?? "?")}</strong> ${esc(s.subject ?? "")}</span>
      <span>Niezatwierdzone pliki</span><span>${s.dirty ?? "?"}</span>
      <span>Strona załadowana</span><span>${esc(s.loadedAt.slice(0, 19).replace("T", " "))}</span>
      <span>Skrypty zmienione od załadowania</span><span>${s.scripts?.changed.length ? `<span class="poligon-warn">${s.scripts.changed.length} → Ctrl+Shift+R</span>` : "<span class=\"poligon-good\">0</span>"} <span class="poligon-muted">(sprawdzono ${s.scripts?.checked ?? 0})</span></span>
      <span>Paczki</span><span>${s.packs?.stale ? `<span class="poligon-warn">starsze od ${esc(s.packs.newestSource)} → <code>npm run fvtt -- packs --profile=poligon</code></span>` : `<span class="poligon-good">aktualne</span> <span class="poligon-muted">${esc(s.packs?.builtAt ?? "")}</span>`}</span>
      <span>Obsada</span><span>${staleObsada ? `<span class="poligon-warn">${staleObsada} osób starszych od danych klas → Obsada → Przebuduj</span>` : "<span class=\"poligon-good\">aktualna</span>"}</span>
      <span>Moduł</span><span>${esc(s.module)}</span></div>
      ${s.scripts?.changed.length ? `<details><summary>Zmienione</summary><ul>${s.scripts.changed.map(f => `<li><code>${esc(f)}</code></li>`).join("")}</ul></details>` : ""}
      <div class="poligon-actions">${btn("swiezosc", "Sprawdź ponownie", { icon: "fa-solid fa-rotate" })}</div>
      <p class="poligon-muted">Commit i paczki zapisuje <code>fvtt</code> przy poligon:start / reset / packs.</p>`;
  }

  async _uwagi() {
    const list = (await game.poligon.uwagi.list()).slice(-25).reverse();
    const rows = list.map(u => `<div class="poligon-row"><span class="grow">${esc(u.name)}<br><span class="poligon-muted">${esc(u.createdAt.slice(0, 16).replace("T", " "))} · ${esc(u.user)}${u.context?.station ? ` · ${esc(u.context.station)}` : ""}${u.status ? ` · <strong>${esc(u.status)}</strong>` : " · otwarta"}</span></span>${btn("uwaga-open", "Otwórz", { arg: u.uuid })}</div>`).join("");
    return `<div class="poligon-actions">${btn("uwaga", "Nowa uwaga (Ctrl+Shift+U)", { icon: "fa-solid fa-flag" })}</div>
      <p class="poligon-muted">Uwagi trafiają do dziennika „Poligon · Uwagi” z kontekstem. Agent czyta je przez <code>npm run fvtt -- poligon:findings --open --md</code> i oznacza status po rozdzieleniu do planów.</p>${rows || "<p>Brak uwag.</p>"}`;
  }
}
