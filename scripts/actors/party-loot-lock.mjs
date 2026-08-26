/**
 * Neuroshima 5e — Blokada łupu drużynowego (§1.17).
 *
 * Ekwipunek grupy (aktor-grupa, NIE pojazd) to wspólny worek na jeszcze-nieprzydzielony łup.
 * Bez żadnej reguły to wolna waga za darmo (patrz rozmowa 2026-08-26). Reguła stołu: dopóki
 * worek coś zawiera, gra jest zapauzowana (`game.togglePause`) — nikt nie rusza tokenem. Gracze
 * muszą rozdzielić zawartość (przeciągając itemy na swoje karty), a każdy potwierdza to,
 * zamykając kartę drużyny. Gdy zamknęli wszyscy wymagani gracze — albo worek jest już pusty —
 * sesja się kończy: reszta (jeśli coś zostało) przepada, gra się odpauzowuje.
 *
 * Cykl życia sesji prowadzi wyłącznie czynny GM (`isActiveGM`), żeby uniknąć wyścigu przy
 * wielu oknach GM. Zamknięcie karty przez gracza zapisuje TYLKO jego własny klucz pod
 * `flags.<mod>.lootSession.closedBy` — osobne klucze pod wspólną flagą mergują się bez
 * kolizji nawet przy jednoczesnych zapisach z różnych klientów.
 *
 * Wymaga, żeby gracze mieli permisję Właściciela na aktorze-grupie (inaczej i tak nie mogliby
 * przeciągać itemów na swoje karty ani zapisać własnego "zamknięte").
 */

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "lootSession";

/* -------------------------------------------- */
/*  Stan sesji                                   */
/* -------------------------------------------- */

function _session(actor) {
  return actor.getFlag(MODULE_ID, FLAG);
}

/** Gracze (nie-GM) będący właścicielami żywych członków drużyny — nikt inny nie musi zamykać. */
function _requiredUserIds(groupActor) {
  const ids = new Set();
  for (const member of groupActor.system.members ?? []) {
    const actor = member.actor;
    if (!actor || actor.type !== "character") continue;
    for (const user of game.users) {
      if (!user.isGM && actor.testUserPermission(user, "OWNER")) ids.add(user.id);
    }
  }
  return [...ids];
}

async function _startSession(actor) {
  const online = _requiredUserIds(actor).filter(id => game.users.get(id)?.active);
  if (!online.length) return; // nikt do zablokowania — pauzowanie pustki nie ma sensu
  await actor.setFlag(MODULE_ID, FLAG, { active: true, requiredUserIds: online, closedBy: {} });
  game.togglePause(true, { broadcast: true });
  await ChatMessage.create({
    content: `<strong>Łup drużyny czeka na podział.</strong> @UUID[${actor.uuid}]{Otwórz kartę drużyny}, `
      + "zabierzcie co wasze (zakładka Ekwipunek) i zamknijcie kartę — gra jest zapauzowana, "
      + "dopóki nie zrobią tego wszyscy."
  });
}

async function _endSession(actor, { silent = false } = {}) {
  const leftovers = actor.items.map(i => i.id);
  if (leftovers.length) await actor.deleteEmbeddedDocuments("Item", leftovers);
  await actor.unsetFlag(MODULE_ID, FLAG);
  if (game.paused) game.togglePause(false, { broadcast: true });
  if (silent) return;
  await ChatMessage.create({
    content: leftovers.length
      ? `<strong>Niepodzielony łup przepadł.</strong> ${leftovers.length} `
        + `${leftovers.length === 1 ? "przedmiot zgnił" : "przedmiotów zgniło"} we wspólnym worku.`
      : "<strong>Łup podzielony.</strong> Worek pusty, drużyna może iść dalej."
  });
}

/** Wołane po każdej zmianie itemów na aktorze-grupie. Tylko czynny GM prowadzi cykl życia sesji. */
function _onGroupItemsChanged(actor) {
  if (!actor || actor.type !== "group" || !game.user.isActiveGM) return;
  const session = _session(actor);
  const hasLoot = actor.items.size > 0;
  if (hasLoot && !session?.active) _startSession(actor);
  else if (!hasLoot && session?.active) _endSession(actor, { silent: true });
}

/** Po zmianie flagi: sprawdź czy wszyscy zamknęli (GM) i ewentualnie otwórz kartę temu klientowi. */
function _onSessionFlagChanged(actor) {
  const session = _session(actor);
  if (game.user.isActiveGM && session?.active) {
    const closed = Object.keys(session.closedBy ?? {});
    if (session.requiredUserIds.every(id => closed.includes(id))) _endSession(actor);
  }
  _forceReopenFor(actor);
}

/** Force-otwiera kartę drużyny wymaganemu graczowi, który jeszcze jej nie zamknął. */
function _forceReopenFor(actor) {
  const session = _session(actor);
  if (!session?.active) return;
  if (!session.requiredUserIds.includes(game.user.id)) return;
  if (session.closedBy?.[game.user.id]) return;
  actor.sheet.render(true, { force: true });
}

/* -------------------------------------------- */
/*  API dla party-sheet.mjs                      */
/* -------------------------------------------- */

/**
 * Zamknięcie karty w trakcie aktywnej, wymaganej dla tego gracza sesji = "biorę, co wzięłam".
 * Nieodwracalne — pyta o potwierdzenie. Zwraca `false`, jeśli zamknięcie ma zostać przerwane.
 * @param {Actor} actor
 * @returns {Promise<boolean>}
 */
export async function confirmLootClose(actor) {
  const session = _session(actor);
  if (!session?.active) return true;
  if (!session.requiredUserIds.includes(game.user.id)) return true;
  if (session.closedBy?.[game.user.id]) return true;
  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Podział łupu" },
    content: "<p>Zamknięcie karty drużyny podczas podziału łupu liczy się jako "
      + "<strong>„biorę, co wzięłam”</strong>. To, czego nie zabrałeś, przepadnie, gdy zamkną "
      + "się wszyscy pozostali. Zamknąć?</p>"
  });
  if (!proceed) return false;
  await actor.update({ [`flags.${MODULE_ID}.${FLAG}.closedBy.${game.user.id}`]: true });
  return true;
}

/** Ręczne obejście MG — kończy sesję natychmiast (np. ktoś jest offline), kasując resztę worka. */
export async function forceEndLootSession(actor) {
  if (!game.user.isGM) return;
  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Wymuś zakończenie podziału łupu" },
    content: "<p>Zakończy sesję natychmiast, niezależnie od tego, kto zamknął kartę. Cała "
      + "niezabrana zawartość worka zostanie skasowana. Kontynuować?</p>"
  });
  if (proceed) await _endSession(actor);
}

/** Czy worek grupy jest zablokowany (czeka na podział łupu)? Do gatowania innych akcji (podróż itd.). */
export function isLootLocked(actor) {
  return !!_session(actor)?.active;
}

/**
 * Kontekst do wyrenderowania banera blokady w nagłówku karty drużyny. `null`, gdy sesja nieaktywna.
 * @param {Actor} actor
 */
export function lootLockContext(actor) {
  const session = _session(actor);
  if (!session?.active) return null;
  const closed = Object.keys(session.closedBy ?? {});
  return {
    isGM: game.user.isGM,
    itemCount: actor.items.size,
    closedCount: closed.length,
    totalCount: session.requiredUserIds.length
  };
}

/* -------------------------------------------- */
/*  Podpowiedź w zakładce Ekwipunek               */
/* -------------------------------------------- */

/** Baner nad listą przedmiotów: co robić i dlaczego, dopóki patrzymy na worek grupy (nie pojazdu). */
function _injectLootHint(app) {
  const actor = app.document ?? app.actor;
  if (!actor || actor.type !== "group") return;
  const el = app.element;
  const inventoryTab = el?.querySelector('.tab.inventory') ?? el?.querySelector('section[data-tab="inventory"]');
  if (!inventoryTab) return;
  // `[data-application-part=inventory]` jest CSS gridem 2 kolumn (sidebar/body) — dopisanie
  // tu NOWEGO dziecka psuje auto-placement i zamienia kolumny miejscami. Baner ląduje więc
  // wewnątrz `.body` (kolumna przedmiotów), nie jako trzeci potomek samego gridu.
  const body = inventoryTab.querySelector(".body") ?? inventoryTab;
  body.querySelector(".neuro-loot-hint")?.remove();

  const session = _session(actor);
  const groupView = app.inventorySource === actor;
  if (!session?.active || !groupView) {
    body.querySelector(".inventory-list")?.classList.remove("neuro-loot-glow");
    body.querySelector("dnd5e-inventory")?.classList.remove("neuro-loot-glow");
    return;
  }

  const hint = document.createElement("div");
  hint.className = "neuro-loot-hint";
  hint.innerHTML = '<i class="fa-solid fa-arrow-down-long fa-bounce" inert></i>'
    + "<span>Przeciągnij te przedmioty na swoją kartę — to, co tu zostanie, przepadnie, "
    + "gdy wszyscy zamkną kartę drużyny.</span>";
  body.prepend(hint);

  // Poświata na samym pudełku z listą — inventory.hbs renderuje itemy w `.inventory-list`.
  const list = body.querySelector(".inventory-list") ?? body.querySelector("dnd5e-inventory");
  list?.classList.add("neuro-loot-glow");
}

/* -------------------------------------------- */
/*  Przyjazny komunikat zamiast błędu uprawnień   */
/* -------------------------------------------- */

/**
 * Serwer odrzuca upuszczenie itemu na kimś nieposiadanym własnym, technicznym komunikatem
 * (`common/abstract/backend.mjs#_logError`: "User X lacks permission to create Item...").
 * Łatamy go u źródła wyświetlania, bo dokładna ścieżka DOM/sieć, którą to dotrze do klienta,
 * jest zbyt krucha, żeby ją przechwytywać wcześniej.
 */
function _registerFriendlyPermissionErrors() {
  const original = ui.notifications.error.bind(ui.notifications);
  ui.notifications.error = (message, options) => {
    const text = message instanceof Error ? message.message : String(message ?? "");
    if (/lacks permission to \w+.*\bitem\b/i.test(text)) {
      return original("Nie możesz tak po prostu wcisnąć tego komuś!", options);
    }
    return original(message, options);
  };
}

/** Rejestrowane raz, na wszystkich kartach: blokuje upuszczenie itemu na kimś, kogo się nie posiada. */
function _registerForeignDropGuard() {
  document.addEventListener("drop", event => {
    const sheetEl = event.target.closest?.(".application.sheet");
    const app = foundry.applications.instances.get(sheetEl?.id);
    const actor = app?.document ?? app?.actor;
    if (!actor || actor.isOwner) return; // właściciel (albo brak kontekstu karty) — nie nasza sprawa
    if (!event.dataTransfer?.types?.includes("text/plain")) return;
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "Item") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.notifications.warn("Nie możesz tak po prostu wcisnąć tego komuś!");
  }, { capture: true });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerPartyLootLock() {
  Hooks.on("createItem", item => _onGroupItemsChanged(item.parent));
  Hooks.on("deleteItem", item => _onGroupItemsChanged(item.parent));
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== "group") return;
    if (foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG}`) === undefined) return;
    _onSessionFlagChanged(actor);
  });
  // Karta grupy nie kończy łańcucha klas na "ActorSheet" (tylko na "ActorSheetV2"), więc
  // `renderActorSheet` nigdy dla niej nie leci (zweryfikowane live 2026-08-26) — stąd wprost
  // `renderGroupActorSheet`, nie generyczny hook.
  Hooks.on("renderGroupActorSheet", (app, html) => _injectLootHint(app, html));
  _registerForeignDropGuard();
  // Restart świata / dołączenie w trakcie: worek mógł już mieć zawartość, zanim ten klient
  // zdążył zarejestrować hooki — create/delete tego nie złapią, trzeba sprawdzić ręcznie.
  Hooks.once("ready", () => {
    _registerFriendlyPermissionErrors();
    for (const actor of game.actors.filter(a => a.type === "group")) {
      _onGroupItemsChanged(actor);
      _forceReopenFor(actor);
    }
  });
}
