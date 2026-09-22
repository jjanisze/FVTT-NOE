/**
 * Neuroshima 5e — migracja do magazynków symulacyjnych (PLAN_magazynki.md §10).
 *
 * Świat jest w trakcie importu i jeszcze się na nim nie grało, więc migracja może być brutalna
 * zamiast ostrożnej: broń palna postaci graczy jest **kasowana i odtwarzana z kompendium**.
 * To jedyny sposób, żeby dostała wystemplowany `flags.weaponId` — a bez niego nie rozwiązuje
 * modelu, więc nie obsługuje wymiennych magazynków.
 *
 * Rozpoznanie modelu idzie po kolei: stempel → `system.identifier` → **nazwa** (`_resolveByName`).
 * Ta trzecia warstwa istnieje **tylko tutaj**, nigdy w runtime, i jest jawnie raportowana
 * w suchej analizie — bo nazwy w świecie rozjechały się z tabelami („Trzydziestka", „38-ka",
 * „H&K G3", „M1 Garand") i bez niej połowa broni drużyny zostałaby pominięta. Uzasadnienie
 * przy samej funkcji.
 *
 * ## Zakres — decyzja MG (2026-09-22)
 *
 * Folder **`Postacie`**: wszyscy, łącznie z Evie (sterowana przez gracza, więc ma mechanikę
 * jak gracz). **Kier i Piekarz** to nieaktualne postacie testowe — ich broń palna leci bez
 * odtwarzania. Folder **`PC`** (Buźka, Carson, Dante, Góra, Iris, Kluczyk) zostaje **nietknięty**:
 * jego broń ma nazwy spoza tabel („Winchester", „Rewolwer .38", „H&K UMP"), więc `weaponId` się
 * nie rozwiąże i te sztuki po prostu nie obsługują wymiennych magazynków — co jest poprawnym
 * zachowaniem gałęzi `null` z §3, nie awarią.
 *
 * NPC są poza systemem (§9), Zbrojownia też (`createWeapons()` i tak ją odtwarza) — patrz
 * `inMagazineSystem()`.
 *
 * ## Czego ta migracja świadomie NIE robi
 *
 * **Nie rozdaje zapasowych magazynków.** Każda odtworzona broń z wymiennym magazynkiem dostaje
 * dokładnie jeden, wpięty, z zapamiętaną amunicją — żeby nikt nie zaczynał walki z pustą bronią.
 * Zapasowe są odtąd decyzją zakupową albo efektem wypięcia magazynka z innej własnej broni
 * o wspólnym `magwell`.
 *
 * Usage (konsola albo makro):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateMagazynki();                    // sucha analiza, nic nie zapisuje
 *   await api.migrateMagazynki({ commit: true });
 *   await api.migrateMagazynki({ actors: ["Alan"], commit: true });
 */

import {
  WEAPON_MAP, WEAPONS, WEAPON_NAME_ALIASES, REMOVABLE_SOURCES, magwellOf, buildWeaponItemData
} from "../config/weapons-data.mjs";
import { standardMagazineFor, buildMagazineItemData } from "../config/magazines-data.mjs";
import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";
import { isMagazineItem, weaponIdOf, inMagazineSystem } from "../weapons/magazine-model.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Folder, którego postacie migrujemy. Wszystko poza nim zostaje. */
const SCOPE_FOLDER = "Postacie";

/**
 * Postacie testowe: broń palną kasujemy, ale nie odtwarzamy.
 *
 * To nie jest to samo co „poza zakresem" — ich broń to śmietnik po ręcznych testach MG
 * i zostawienie jej w starym modelu dawałoby fałszywe wyniki przy każdym późniejszym sweepie.
 */
const OBSOLETE = new Set(["Kier", "Piekarz"]);

/* -------------------------------------------- */
/*  Rozpoznanie starego stanu                    */
/* -------------------------------------------- */

/**
 * Broń palna w starym modelu: miała flagę `mag` z ustawioną pojemnością.
 *
 * Czytamy **surową flagę**, nie `getMag()` — po wgraniu nowego kodu `getMag()` zwraca już `null`
 * dla tych sztuk (nie rozwiązują modelu), więc pytanie „co tu było przed migracją" da się zadać
 * wyłącznie flagom.
 */
function _legacyMag(item) {
  const mag = item.flags?.[MODULE_ID]?.mag;
  if (!mag || mag.max == null) return null;
  return {
    current: Number(mag.current ?? 0),
    max: Number(mag.max ?? 0),
    ammoType: mag.ammoType || ""
  };
}

/**
 * Do jakiego wpisu w tabeli odpowiada ta sztuka broni.
 *
 * Kolejność: już wystemplowany `weaponId` → `system.identifier` jako **dokładny** klucz.
 * Żadnego dopasowania rozmytego ani po nazwie. `null` = nie wiemy, więc nie ruszamy.
 */
function _resolveWeaponId(item) {
  const resolved = weaponIdOf(item);
  if (resolved) return { id: resolved, how: "stempel" };
  const ident = item.system?.identifier;
  if (ident && WEAPON_MAP[ident]) return { id: ident, how: "identyfikator" };
  return null;
}

/** Nazwa kanoniczna (małymi literami) → slug. Zbudowana raz z tabeli broni. */
const NAME_INDEX = new Map(WEAPONS.map(w => [w.name.toLowerCase(), w.id]));

/**
 * Czwarta warstwa, **wyłącznie dla migracji**: dokładne dopasowanie nazwy do katalogu,
 * z uwzględnieniem `WEAPON_NAME_ALIASES`.
 *
 * ## Dlaczego to nie łamie zakazu z §3
 *
 * §3 zabrania dopasowania po nazwie **w runtime** — i słusznie: reguła, która zgaduje przy
 * każdym strzale, myli się cicho i w środku walki. Tutaj kontekst jest inny pod trzema względami:
 * jest to operacja **jednorazowa**, **z suchą analizą przed zapisem**, i **zatwierdzana przez MG**
 * z listą propozycji na ekranie. Dopasowanie nie jest też rozmyte — to dokładne porównanie
 * z tabelą, plus mapa aliasów, która istnieje w `weapons-data.mjs` dokładnie po to („Trzydziestka",
 * „AK", „H&K G3", „M1 Garand" — nazwy, pod którymi te bronie leżą w świecie sprzed ujednolicenia).
 *
 * Wynik jest raportowany **osobno** (`how: "nazwa"`), żeby w suchej analizie było widać, które
 * bronie zostały rozpoznane po stemplu, a które przez tę furtkę.
 */
function _resolveByName(item) {
  const raw = (item.name ?? "").trim();
  const direct = NAME_INDEX.get(raw.toLowerCase());
  if (direct) return { id: direct, how: "nazwa" };

  for (const [alias, canonical] of Object.entries(WEAPON_NAME_ALIASES)) {
    if (alias.toLowerCase() !== raw.toLowerCase()) continue;
    const slug = NAME_INDEX.get(canonical.toLowerCase());
    if (slug) return { id: slug, how: `alias „${alias}"` };
  }
  return null;
}

/* -------------------------------------------- */
/*  Migracja                                     */
/* -------------------------------------------- */

/**
 * @param {object} [options]
 * @param {boolean} [options.commit]   false (domyślnie) = sucha analiza, zero zapisów
 * @param {string[]} [options.actors]  Nazwy aktorów; domyślnie cały folder `Postacie`
 */
export async function migrateMagazynki({ commit = false, actors = null } = {}) {
  if (!game.user.isGM) {
    ui.notifications.error("Migracja magazynków wymaga uprawnień MG.");
    return null;
  }

  const subjects = (game.actors ?? []).filter(a => {
    if (actors?.length) return actors.includes(a.name);
    return a.type === "character" && a.folder?.name === SCOPE_FOLDER;
  });

  if (!subjects.length) {
    ui.notifications.warn("Migracja magazynków: nie znalazłem żadnego aktora w zakresie.");
    return null;
  }

  const report = {
    commit,
    actors: [],
    magazinesDeleted: 0,
    weaponsRebuilt: 0,
    weaponsDropped: 0,
    weaponsSkipped: 0,
    matchedByName: 0,
    magazinesCreated: 0,
    blockers: []
  };

  /* ── Pre-flight: ulepszenia broni są kupowane przez graczy i kasowanie ich jest
        nieodwracalne. Wg ustaleń żadna grywalna postać ich nie ma — ta asercja jest po to,
        żeby „nie ma" nie było założeniem. NIE USUWAĆ „dla uproszczenia". ── */
  for (const actor of subjects) {
    if (OBSOLETE.has(actor.name)) continue;
    for (const item of actor.items) {
      if (item.type !== "weapon") continue;
      if (!_legacyMag(item)) continue;
      const addons = item.flags?.[MODULE_ID]?.addons;
      const count = Array.isArray(addons) ? addons.length : Object.keys(addons ?? {}).length;
      if (count > 0) {
        report.blockers.push(`${actor.name} / ${item.name}: ${count}× ulepszenie (flags.addons)`);
      }
    }
  }

  if (report.blockers.length) {
    console.error("Neuroshima 5e | Migracja magazynków PRZERWANA — ulepszenia na broni do skasowania:",
      report.blockers);
    ui.notifications.error(
      `Migracja przerwana: ${report.blockers.length} broni ma ulepszenia (patrz konsola). `
      + `Ulepszenia są kupowane przez graczy i kasowanie broni jest nieodwracalne.`
    );
    return report;
  }

  if (commit && !_backupAcknowledged()) return report;

  for (const actor of subjects) {
    const entry = { name: actor.name, obsolete: OBSOLETE.has(actor.name), magazines: 0, weapons: [] };
    report.actors.push(entry);

    /* ── Krok 1: skasuj wszystkie magazynki w starym modelu (kwantowe, z flagą `ready`). ── */
    const oldMags = actor.items.filter(i => isMagazineItem(i) && !i.flags?.[MODULE_ID]?.magazine);
    entry.magazines = oldMags.length;
    report.magazinesDeleted += oldMags.length;
    if (commit && oldMags.length) {
      await actor.deleteEmbeddedDocuments("Item", oldMags.map(i => i.id), { render: false });
    }

    /* ── Krok 2: broń palna — skasuj i odtwórz z tabeli. ── */
    for (const item of [...actor.items]) {
      if (item.type !== "weapon") continue;
      const legacy = _legacyMag(item);
      if (!legacy) continue;

      if (entry.obsolete) {
        entry.weapons.push({ name: item.name, action: "skasowana (postać nieaktualna)" });
        report.weaponsDropped += 1;
        if (commit) await actor.deleteEmbeddedDocuments("Item", [item.id], { render: false });
        continue;
      }

      const match = _resolveWeaponId(item) ?? _resolveByName(item);
      if (!match) {
        entry.weapons.push({
          name: item.name, action: "POMINIĘTA — nieznany model",
          identifier: item.system?.identifier ?? null
        });
        report.weaponsSkipped += 1;
        continue;
      }
      if (match.how !== "stempel" && match.how !== "identyfikator") report.matchedByName += 1;

      const def = WEAPON_MAP[match.id];
      const plan = _plan(def, legacy);
      entry.weapons.push({
        name: item.name, action: "odtworzona", weaponId: match.id, rozpoznana: match.how,
        ...plan.summary
      });
      report.weaponsRebuilt += 1;
      if (plan.magazine) report.magazinesCreated += 1;

      if (!commit) continue;

      await actor.deleteEmbeddedDocuments("Item", [item.id], { render: false });
      const [created] = await actor.createEmbeddedDocuments("Item",
        [buildWeaponItemData(def)], { render: false });

      if (plan.magazine) {
        const [mag] = await actor.createEmbeddedDocuments("Item",
          [buildMagazineItemData(plan.magazine.def, { rounds: plan.magazine.rounds })], { render: false });
        const update = { [`flags.${MODULE_ID}.loadedMag`]: mag.id };
        /* Komora napełnia się z magazynka dokładnie tak, jak przy normalnym wpięciu: broń
           automatyczna dosyła nabój sama, ręcznie podawana zostaje z pustą komorą. */
        if (plan.magazine.chamber) {
          update[`flags.${MODULE_ID}.chamber`] = { caliberId: plan.magazine.chamber };
        }
        await created.update(update);
      } else if (plan.internalRounds) {
        await created.update({
          [`flags.${MODULE_ID}.${"rounds"}`]: plan.internalRounds.rounds,
          [`flags.${MODULE_ID}.chamber`]: { caliberId: plan.internalRounds.chamber }
        });
      }
    }
  }

  _logReport(report);
  return report;
}

/**
 * Jak rozłożyć zapamiętane naboje na nowy model.
 *
 * Kaliber bierzemy z tego, co postać faktycznie miała załadowane (`legacy.ammoType`), a nie
 * z nominalnego kalibru broni — Piekarz nosił breneki w Obrzynie, Lorentz dum-dum w Złotym
 * Desert Eagle, i to jest stan gry, nie artefakt importu. Nieznany kaliber spada na nominalny.
 */
function _plan(def, legacy) {
  const caliber = AMMO_CALIBER_MAP[legacy.ammoType] ? legacy.ammoType : (def.caliber ?? null);
  const hasChamber = def.mag && def.mag.kind !== "beb" && def.chamber !== false;
  const feedAuto = !(def.props ?? []).some(p => p === "przeladowanie" || p === "ladowanie");
  const capacity = def.mag.max + (hasChamber ? 1 : 0);

  /* Zero naboi w zapamiętanym stanie traktujemy jako „stan nieznany", nie jako „pusta broń".
     Powód jest konkretny: sweep projekcji zdążył wyzerować część broni, zanim migracja ruszyła
     (patrz `onMagazineModel()` w `config/weapons-data.mjs`), a poza tym §10 chce, żeby postacie zaczynały
     gotowe do walki. Pusta broń po migracji byłaby gorszą niespodzianką niż pełna. */
  const remembered = Math.max(0, Math.min(legacy.current, capacity));
  const rounds = remembered > 0 ? remembered : capacity;

  if (REMOVABLE_SOURCES.includes(def.mag?.kind)) {
    const magDef = standardMagazineFor(magwellOf(def));
    if (!magDef || !caliber) {
      return { magazine: null, summary: { uwaga: "brak standardowego magazynka w katalogu" } };
    }
    /* Komora dostaje jeden nabój tylko wtedy, gdy broń sama by go dosłała. */
    const chamber = (hasChamber && feedAuto && rounds > 0) ? caliber : null;
    const inMag = Math.min(rounds - (chamber ? 1 : 0), magDef.capacity);
    return {
      magazine: { def: magDef, rounds: Array(Math.max(0, inMag)).fill(caliber), chamber },
      summary: {
        magazynek: magDef.name,
        naboje: `${rounds}× ${_label(caliber)}${remembered > 0 ? "" : " (stan nieznany → do pełna)"}`
      }
    };
  }

  if (!caliber) return { summary: { uwaga: "brak kalibru" } };
  const chamber = (hasChamber && rounds > 0) ? caliber : null;
  const inWeapon = Math.max(0, rounds - (chamber ? 1 : 0));
  return {
    internalRounds: { rounds: Array(inWeapon).fill(caliber), chamber },
    summary: {
      naboje: `${rounds}× ${_label(caliber)} (w broni)${remembered > 0 ? "" : " — stan nieznany → do pełna"}`
    }
  };
}

function _label(caliberId) {
  return AMMO_CALIBER_MAP[caliberId]?.label ?? caliberId ?? "—";
}

/**
 * Kopia zapasowa jest krokiem 1 z §10 i nie da się jej zrobić z przeglądarki — robi ją MG
 * przez `foundry_backup_collection` na `actors` i `items`. Pytamy wprost, bo ta migracja
 * kasuje przedmioty i nie ma cofania.
 */
function _backupAcknowledged() {
  const ok = globalThis.confirm?.(
    "Migracja magazynków KASUJE broń palną postaci i odtwarza ją z kompendium.\n\n"
    + "Czy masz aktualną kopię zapasową kolekcji `actors` i `items`?\n\n"
    + "(foundry_backup_collection — krok 1 z PLAN_magazynki.md §10)"
  );
  if (!ok) ui.notifications.warn("Migracja przerwana — zrób najpierw kopię zapasową.");
  return !!ok;
}

/**
 * Sweep kontrolny: czy po migracji `getMag()` daje sensowne wartości dla wszystkich broni
 * palnych w zakresie. Wzorem sweepu z `PLAN_weapon_properties.md` — osobne wywołanie, żeby
 * dało się je powtórzyć bez ponownej migracji.
 */
export function auditMagazynki() {
  const rows = [];
  for (const actor of game.actors ?? []) {
    if (!inMagazineSystem(actor)) continue;
    for (const item of actor.items) {
      if (item.type !== "weapon") continue;
      const legacy = item.flags?.[MODULE_ID]?.mag;
      const weaponId = weaponIdOf(item);
      if (!weaponId && !legacy) continue;
      const api = game.neuroshima?.magazynki;
      const mag = api?.getMag(item) ?? null;
      rows.push({
        aktor: actor.name,
        bron: item.name,
        weaponId: weaponId ?? "— BRAK —",
        stan: mag ? `${mag.current}/${mag.max}` : "poza systemem",
        nabój: mag?.ammoType ?? "—",
        zrodlo: api?.describe(item)?.source?.kind ?? "brak"
      });
    }
  }
  console.table(rows);
  const broken = rows.filter(r => r.weaponId === "— BRAK —");
  if (broken.length) {
    console.warn(`Neuroshima 5e | ${broken.length} broni bez rozpoznanego modelu — nie obsłuży wymiennych magazynków.`);
  }
  return rows;
}

function _logReport(report) {
  const head = report.commit ? "ZAPISANA" : "SUCHA ANALIZA (nic nie zapisano)";
  console.log(`Neuroshima 5e | Migracja magazynków — ${head}`);
  console.log(`  magazynki skasowane : ${report.magazinesDeleted}`);
  console.log(`  broń odtworzona     : ${report.weaponsRebuilt}`);
  console.log(`  broń skasowana      : ${report.weaponsDropped}`);
  console.log(`  broń pominięta      : ${report.weaponsSkipped}`);
  console.log(`  rozpoznana po nazwie: ${report.matchedByName}  (furtka migracyjna — sprawdź listę)`);
  console.log(`  magazynki utworzone : ${report.magazinesCreated}`);
  for (const a of report.actors) {
    if (!a.weapons.length && !a.magazines) continue;
    console.log(`  — ${a.name}${a.obsolete ? " (nieaktualna)" : ""}:`, a.weapons);
  }
  if (!report.commit) {
    console.log("  Uruchom ponownie z { commit: true }, żeby zapisać.");
  }
}

export function registerMagazynkiMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateMagazynki = migrateMagazynki;
    mod.api.migration.auditMagazynki = auditMagazynki;
  }
}
