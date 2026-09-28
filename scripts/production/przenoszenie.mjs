/**
 * Neuroshima 5e — przenoszenie: Roboty, surowce z puli, zestawy, Miejsca (PLAN_produkcja §8, E4).
 *
 * **Zakaz klonowania Roboty (D21, §8.1).** Danego `robota.id` jest zawsze dokładnie jeden
 * egzemplarz — w Robocie siedzą zamrożone surowce, więc kopia to surowce z niczego. Jedyna droga
 * zmiany posiadacza to `przenies()`: utworzenie u celu z opcją `neuroRobotaMove`, potem usunięcie
 * źródła. Najpierw tworzymy — przerwany ruch zostawia dwa egzemplarze do audytu, nigdy zero.
 *
 * Każda inna droga jest zamknięta osobno, bo dnd5e domyślnie **kopiuje** przeciągany przedmiot
 * między aktorami (`_defaultDropBehavior`), a Shift-przeciągnięcie kasuje źródło po
 * `createDocuments` nawet wtedy, gdy utworzenie odrzucono — samo `preCreateItem` zgubiłoby Robotę:
 *
 * | Droga                               | Zamknięta przez                                        |
 * |-------------------------------------|--------------------------------------------------------|
 * | przeciągnięcie na kartę (każdą)      | owijka `BaseActorSheet#_onDropCreateItems` → `przenies` |
 * | upuszczenie na pojemnik               | owijka `_onDropItemContainer` — odmowa                  |
 * | „Duplikuj”, makro, import, czat       | `preCreateItem`: istniejący `robota.id` bez opcji ruchu |
 * | katalog świata / kompendium           | `preCreateItem`: Robota tylko u aktora                  |
 * | aktor niepołączonego żetonu           | `preCreateItem` — odmowa                               |
 * | „Duplikuj” w menu                     | getter `canDuplicate` = false                          |
 * | ilość 2                               | `preUpdateItem` wycina zmianę `system.quantity`         |
 * | duplikacja aktora                     | `preCreateActor` zdejmuje Roboty z kopii               |
 *
 * Kiedy mimo to powstanie duplikat (przywrócona kopia zapasowa świata) — `audytRobot()`.
 */

import { isRobota, daneRoboty, kierownikRoboty, ROBOTA_FLAG } from "./robota.mjs";
import { kartaProdukcji, fmtSurowce } from "./karty.mjs";
import { pulaAktora, druzynyAktora, MIEJSCE_FLAG } from "./pula.mjs";
import { kontekstWykonawcy } from "./wykonawca.mjs";
import { allGb, moveSurowce, SUROWCE_CODES } from "../actors/surowce-store.mjs";
import { toolKitsOf } from "../actors/tool-availability.mjs";
import { alokujSurowce, fmtGGMM } from "../config/production-rules.mjs";
import { TOOL_KEYS } from "../config/tool-expr.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const MOVE_OPT = "neuroRobotaMove";
const ODLEGLOSC_M = 5;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Odległość (tylko ostrzeżenie — D7)          */
/* -------------------------------------------- */

/** Najbliższa odległość między żetonami dwóch aktorów na tej samej scenie, w metrach; null — brak żetonów. */
export function odlegloscAktorow(a, b) {
  const ta = a?.getActiveTokens?.()?.[0];
  const tb = b?.getActiveTokens?.()?.[0];
  if (!ta || !tb || !canvas?.grid || ta.scene?.id !== tb.scene?.id) return null;
  const s = canvas.grid.size;
  const r = t => ({ x: t.document.x, y: t.document.y, w: t.document.width * s, h: t.document.height * s });
  const A = r(ta), B = r(tb);
  const dx = Math.max(0, A.x - (B.x + B.w), B.x - (A.x + A.w));
  const dy = Math.max(0, A.y - (B.y + B.h), B.y - (A.y + A.h));
  return (Math.hypot(dx, dy) / s) * canvas.grid.distance;
}

function _ostrzezOdleglosc(a, b) {
  const d = odlegloscAktorow(a, b);
  if (d != null && d > ODLEGLOSC_M) {
    ui.notifications.warn(`${a.name} i ${b.name} są ${d.toFixed(1)} m od siebie (> ${ODLEGLOSC_M} m) — przeniesienie i tak poszło, MG oceni.`);
    return `odległość ${d.toFixed(1)} m`;
  }
  return null;
}

/* -------------------------------------------- */
/*  Robota: przeniesienie                        */
/* -------------------------------------------- */

/**
 * Przenosi Robotę do innego aktora — jedyna droga zmiany posiadacza (D21).
 * Przejęcie przez inną postać zmienia kierownika; pojazd i Miejsce go nie zmieniają (D19).
 * Bez uprawnień do źródła — prośba do MG na czacie (bez socketu: MG klika, lejek rusza u niego).
 * @returns {Promise<Item|null>}
 */
export async function przenies(item, cel, { cicho = false } = {}) {
  const r = daneRoboty(item);
  const zrodlo = item?.parent;
  if (!r || !zrodlo || !cel) return null;
  if (zrodlo === cel) return item;
  if (cel.isToken && !cel.token?.actorLink) {
    ui.notifications.warn(`${cel.name}: niepołączony żeton nie może trzymać Roboty — połącz aktora z żetonem.`);
    return null;
  }
  if (!cel.isOwner) { ui.notifications.warn(`Nie masz uprawnień do ${cel.name}.`); return null; }
  if (!zrodlo.isOwner) return _prosbaDoMG(item, cel);

  const uwaga = _ostrzezOdleglosc(zrodlo, cel);
  const data = item.toObject();
  delete data._id;
  delete data.folder;
  if (data.system) delete data.system.container;
  const zmianaKierownika = cel.type === "character" && cel.id !== r.kierownikId;
  if (zmianaKierownika) foundry.utils.setProperty(data, `flags.${MODULE_ID}.${ROBOTA_FLAG}.kierownikId`, cel.id);

  const [nowy] = await cel.createEmbeddedDocuments("Item", [data], { [MOVE_OPT]: true });
  if (!nowy) return null;
  await zrodlo.deleteEmbeddedDocuments("Item", [item.id], { [MOVE_OPT]: true });

  if (!cicho) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: cel.type === "character" ? cel : zrodlo }),
      content: kartaProdukcji({
        ikona: nowy.img, tytul: r.przepis.nazwa, podtytul: "Przeniesiona", rodzaj: "info",
        linie: [`${esc(zrodlo.name)} → <strong>${esc(cel.name)}</strong>`
          + (zmianaKierownika ? ` · nowy kierownik: <strong>${esc(cel.name)}</strong>` : "")
          + (uwaga ? ` · <em>${esc(uwaga)}</em>` : "")]
      })
    });
  }
  return nowy;
}

async function _prosbaDoMG(item, cel) {
  const r = daneRoboty(item);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: cel }),
    content: kartaProdukcji({
      ikona: item.img, tytul: r.przepis.nazwa, podtytul: "Prośba o przekazanie", rodzaj: "info",
      linie: [`${esc(game.user.name)} prosi o przeniesienie z <strong>${esc(item.parent.name)}</strong> do <strong>${esc(cel.name)}</strong>.`],
      przyciski: [{ akcja: "przekaz", label: "Przekaż", uuid: item.uuid, gm: true, dane: { cel: cel.uuid }, ikona: "fa-solid fa-right-left" }]
    })
  });
  ui.notifications.info("Nie masz uprawnień do miejsca, w którym stoi Robota — poszła prośba do MG.");
  return null;
}

/* -------------------------------------------- */
/*  Strażnicy (§8.1)                            */
/* -------------------------------------------- */

/** Wszystkie egzemplarze Roboty o danym `robota.id` w świecie. */
function _egzemplarze(robotaId) {
  const out = [];
  for (const a of game.actors) for (const i of a.items) if (i.flags?.[MODULE_ID]?.[ROBOTA_FLAG]?.id === robotaId) out.push(i);
  return out;
}

function _preCreateItem(item, data, options) {
  const r = foundry.utils.getProperty(data, `flags.${MODULE_ID}.${ROBOTA_FLAG}`);
  if (!r) return;
  const parent = item.parent;
  if (!(parent instanceof Actor)) {
    ui.notifications.warn("Robota żyje tylko u aktora (postać, pojazd, Miejsce) — nie w katalogu ani kompendium.");
    return false;
  }
  if (parent.isToken && !parent.token?.actorLink) {
    ui.notifications.warn(`${parent.name}: niepołączony żeton nie może trzymać Roboty.`);
    return false;
  }
  if (options?.[MOVE_OPT]) return;
  if (_egzemplarze(r.id).length) {
    ui.notifications.warn(`Robota „${r.przepis?.nazwa ?? ""}” już istnieje — przenieś ją, zamiast kopiować.`);
    return false;
  }
}

function _preUpdateItem(item, changes) {
  if (!isRobota(item)) return;
  // Wycinamy tylko ilość — `return false` skasowałoby całą aktualizację (także postęp).
  const plaski = "system.quantity" in changes;
  if (!plaski && !foundry.utils.hasProperty(changes, "system.quantity")) return;
  const q = plaski ? changes["system.quantity"] : changes.system.quantity;
  if (q === 1) return;
  if (plaski) delete changes["system.quantity"];
  else delete changes.system.quantity;
  ui.notifications.warn("Robota jest zawsze jedna — ilość się nie zmienia.");
}

function _preCreateActor(actor, data) {
  const items = actor._source.items ?? [];
  const bez = items.filter(i => !i.flags?.[MODULE_ID]?.[ROBOTA_FLAG]);
  if (bez.length === items.length) return;
  // `recursive: false` — domyślne scalanie łączy tablice osadzonych dokumentów po `_id`,
  // więc Robota zostawała w kopii mimo podanej krótszej listy (sprawdzone na żywo).
  actor.updateSource({ items: bez }, { recursive: false });
  ui.notifications.warn(`${data.name ?? actor.name}: kopia aktora bez Robót (${items.length - bez.length}) — Roboty się nie klonuje.`);
}

function _owinUpuszczanie() {
  const Sheet = globalThis.dnd5e?.applications?.actor?.BaseActorSheet;
  if (!Sheet) return console.warn(`${MODULE_ID} | produkcja: brak BaseActorSheet — przeciąganie Robót bez strażnika`);
  const origCreate = Sheet.prototype._onDropCreateItems;
  Sheet.prototype._onDropCreateItems = async function (event, items, behavior) {
    const roboty = items.filter(i => isRobota(i));
    const reszta = items.filter(i => !isRobota(i));
    const cel = this.inventorySource ?? this.actor;
    for (const r of roboty) {
      // Robota z czatu / katalogu (bez rodzica) nie ma skąd przyjść — i tak odmówi `preCreateItem`.
      if (r.parent instanceof Actor && r.parent !== cel) await przenies(r, cel);
    }
    return reszta.length ? origCreate.call(this, event, reszta, behavior) : [];
  };
  const origContainer = Sheet.prototype._onDropItemContainer;
  Sheet.prototype._onDropItemContainer = async function (event, item, container) {
    if (isRobota(item)) return ui.notifications.warn("Roboty nie wkłada się do pojemników.");
    return origContainer.call(this, event, item, container);
  };
}

function _owinDuplikowanie() {
  const proto = CONFIG.Item.documentClass.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "canDuplicate")
    ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(proto), "canDuplicate");
  if (!desc?.get) return;
  Object.defineProperty(proto, "canDuplicate", {
    configurable: true,
    get() { return !isRobota(this) && desc.get.call(this); }
  });
}

/* -------------------------------------------- */
/*  Audyt duplikatów                            */
/* -------------------------------------------- */

/**
 * Roboty zdublowane (np. po przywróceniu kopii świata) i osierocone (bez kierownika).
 * Tylko raport — decyzję, który egzemplarz zostaje, podejmuje MG.
 */
export function audytRobot({ konsola = true } = {}) {
  const po = new Map();
  for (const a of game.actors) {
    for (const i of a.items) {
      const r = i.flags?.[MODULE_ID]?.[ROBOTA_FLAG];
      if (!r) continue;
      if (!po.has(r.id)) po.set(r.id, []);
      po.get(r.id).push(i);
    }
  }
  const duplikaty = [...po.entries()].filter(([, is]) => is.length > 1)
    .map(([id, is]) => ({ id, przepis: is[0].flags[MODULE_ID][ROBOTA_FLAG].przepis?.nazwa, gdzie: is.map(i => `${i.parent.name} (${i.uuid})`) }));
  const sieroty = [...po.values()].flat().filter(i => !game.actors.get(i.flags[MODULE_ID][ROBOTA_FLAG].kierownikId))
    .map(i => ({ przepis: i.name, gdzie: i.parent.name, uuid: i.uuid }));
  if (konsola) {
    console.group(`Neuroshima 5e | Roboty: ${po.size}, duplikaty ${duplikaty.length}, bez kierownika ${sieroty.length}`);
    if (duplikaty.length) console.table(duplikaty.map(d => ({ ...d, gdzie: d.gdzie.join(" | ") })));
    if (sieroty.length) console.table(sieroty);
    console.groupEnd();
  }
  return { razem: po.size, duplikaty, sieroty };
}

/* -------------------------------------------- */
/*  Surowce i zestawy z puli                    */
/* -------------------------------------------- */

/**
 * „Przenieś brakujące z X” (§8): dokładnie niedobór per typ, z kolejnych aktorów puli.
 * @param {Actor} actor
 * @param {{typy: string[], gb: number}[]} linie  surowce przepisu (po Przydasie)
 * @returns {Promise<{przeniesione: Record<string, number>, zKogo: string[]}|null>}
 */
export async function przeniesBrakujace(actor, linie) {
  const pula = pulaAktora(actor).filter(a => a.isOwner);
  const wlasne = allGb(actor);
  const braki = alokujSurowce(linie, wlasne).brak;
  if (!Object.keys(braki).length) { ui.notifications.info("Niczego nie brakuje."); return null; }

  const przeniesione = {};
  const zKogo = new Set();
  for (const [typ, ile] of Object.entries(braki)) {
    let reszta = ile;
    for (const a of pula) {
      if (reszta <= 0) break;
      const ma = Math.floor(allGb(a)[typ] ?? 0);
      const bierz = Math.min(ma, reszta);
      if (bierz <= 0) continue;
      const r = await moveSurowce(a, actor, typ, bierz);
      if (!r.ok) continue;
      przeniesione[typ] = (przeniesione[typ] ?? 0) + bierz;
      reszta -= bierz;
      zKogo.add(a);
    }
  }
  if (!Object.keys(przeniesione).length) { ui.notifications.warn("W puli też tego nie ma."); return null; }
  const uwagi = [...zKogo].map(a => _ostrzezOdleglosc(a, actor)).filter(Boolean);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({
      ikona: "icons/svg/item-bag.svg", tytul: "Surowce z puli", podtytul: "Przeniesienie", rodzaj: "info",
      linie: [`${fmtSurowce(przeniesione)} z ${esc([...zKogo].map(a => a.name).join(", "))} → <strong>${esc(actor.name)}</strong>`
        + (uwagi.length ? ` · <em>${esc(uwagi.join(", "))}</em>` : "")]
    })
  });
  return { przeniesione, zKogo: [...zKogo].map(a => a.name) };
}

/** Przenosi zestaw narzędzi (albo zastępnik) z puli do aktora — cały przedmiot. */
export async function przeniesZestaw(actor, key) {
  const ctx = kontekstWykonawcy(actor);
  const zrodlo = ctx.pula.find(a => a.isOwner && ctx.maZestaw(a, key));
  if (!zrodlo) { ui.notifications.warn(`W puli nie ma zestawu ${TOOL_KEYS[key] ?? key}.`); return null; }
  const { kits, substitutes } = toolKitsOf(zrodlo, key);
  const kit = kits[0] ?? substitutes[0];
  const data = kit.toObject();
  delete data._id;
  if (data.system) { delete data.system.container; data.system.quantity = 1; if ("equipped" in data.system) data.system.equipped = false; }
  const [nowy] = await actor.createEmbeddedDocuments("Item", [data]);
  if ((kit.system.quantity ?? 1) > 1) await kit.update({ "system.quantity": kit.system.quantity - 1 });
  else await zrodlo.deleteEmbeddedDocuments("Item", [kit.id]);
  const uwaga = _ostrzezOdleglosc(zrodlo, actor);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({
      ikona: nowy.img, tytul: nowy.name, podtytul: "Zestaw z puli", rodzaj: "info",
      linie: [`${esc(zrodlo.name)} → <strong>${esc(actor.name)}</strong>${uwaga ? ` · <em>${esc(uwaga)}</em>` : ""}`]
    })
  });
  return nowy;
}

/* -------------------------------------------- */
/*  Miejsca                                     */
/* -------------------------------------------- */

/**
 * MG: nowe Miejsce — aktor `vehicle` z flagą, bez limitu ładowni, uprawnienia z głównej drużyny
 * (D20). Zapowiedź „Budowy bazy” z Długiego postoju (M5).
 */
export async function noweMiejsce({ nazwa = null, druzyna = null } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Miejsca zakłada MG.");
  druzyna ??= game.settings.get("dnd5e", "primaryParty")?.actor ?? null;
  nazwa ??= await foundry.applications.api.DialogV2.prompt({
    window: { title: "Nowe Miejsce", icon: "fa-solid fa-warehouse" },
    content: `<label>Nazwa <input type="text" name="n" value="Warsztat" autofocus></label>`
      + `<p class="hint">Kontener na Roboty, których nikt nie nosi. Uprawnienia jak ${esc(druzyna?.name ?? "drużyna")}.</p>`,
    ok: { label: "Utwórz", callback: (event, button) => button.form.elements.n.value }
  }).catch(() => null);
  if (!nazwa) return null;
  const ownership = foundry.utils.deepClone(druzyna?.ownership ?? { default: 0 });
  const actor = await Actor.implementation.create({
    name: nazwa,
    type: "vehicle",
    img: "icons/environment/settlement/blacksmith.webp",
    ownership,
    prototypeToken: { actorLink: true, texture: { src: "icons/environment/settlement/blacksmith.webp" } },
    flags: { [MODULE_ID]: { [MIEJSCE_FLAG]: { druzyna: druzyna?.id ?? null } } }
  });
  ui.notifications.info(`Miejsce „${actor.name}” gotowe — przeciągnij je na scenę, jeśli ma stać na mapie.`);
  return actor;
}

/* -------------------------------------------- */
/*  Karta pojazdu / Miejsca: lista Robót         */
/* -------------------------------------------- */

function _onRenderVehicle(app, html) {
  const actor = app.document ?? app.actor;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!actor || !el) return;
  el.querySelector(".neuro-roboty-pojazdu")?.remove();
  const roboty = actor.items.filter(isRobota);
  if (!roboty.length) return;
  const box = document.createElement("section");
  box.className = "neuro-roboty-pojazdu";
  box.innerHTML = `<h3><i class="fa-solid fa-hammer" inert></i> Roboty w ${esc(actor.name)}</h3><ul>${roboty.map(i => {
    const r = daneRoboty(i);
    const k = kierownikRoboty(i);
    return `<li><img src="${esc(i.img)}" alt=""> <strong>${esc(r.przepis.nazwa)}</strong>
      <span>${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)}${r.stan === "test" ? " · Test!" : ""}</span>
      <em>${esc(k?.name ?? "bez kierownika")}</em></li>`;
  }).join("")}</ul>`;
  // `.window-content` karty pojazdu to siatka CSS — dziecko wstawione wprost staje się nową komórką
  // i spada do wąskiej kolumny (ARCHITECTURE §9). Wstawiamy do komórki: zakładki Ekwipunku.
  const host = el.querySelector('.sheet-body [data-tab="inventory"]') ?? el.querySelector(".sheet-body");
  if (!host) return;
  host.prepend(box);
}

/* -------------------------------------------- */
/*  Rejestracja                                 */
/* -------------------------------------------- */

/** Przycisk MG „Przekaż” z karty prośby — ruch wykonuje lejek u MG. */
async function _onClick(event) {
  const btn = event.target.closest?.('[data-neuro-robota="przekaz"]');
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  if (!game.user.isGM) return ui.notifications.warn("Przekazuje MG.");
  const item = await fromUuid(btn.dataset.uuid);
  const cel = await fromUuid(btn.dataset.cel);
  if (!item || !isRobota(item)) return ui.notifications.warn("Tej Roboty już tam nie ma.");
  if (!cel) return ui.notifications.warn("Nie ma już aktora docelowego.");
  if (await przenies(item, cel)) btn.disabled = true;
}

export function registerPrzenoszenie() {
  document.addEventListener("click", _onClick, { capture: true });
  Hooks.on("preCreateItem", _preCreateItem);
  Hooks.on("preUpdateItem", _preUpdateItem);
  Hooks.on("preCreateActor", _preCreateActor);
  Hooks.on("renderVehicleActorSheet", _onRenderVehicle);
  _owinDuplikowanie();
  Hooks.once("ready", _owinUpuszczanie);
}

export const przenoszenieApi = Object.freeze({
  przenies, przeniesBrakujace, przeniesZestaw, audyt: audytRobot, noweMiejsce, odleglosc: odlegloscAktorow
});

export const __testing = Object.freeze({ egzemplarze: _egzemplarze, SUROWCE_CODES, druzynyAktora });
