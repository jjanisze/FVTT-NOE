/**
 * Neuroshima 5e — linijka ruchu M8 (PLAN_m8_ruch_i_ekonomia_akcji §8.1, E2).
 *
 * W walce, we własnej turze albo w trwającej reakcji, linijka planowanego ruchu pokazuje budżet z ledgera
 * (`combat/ekonomia.mjs`) zamiast progów Szybkości dnd5e: **zielony** — mieści się w znanej puli, **czerwony** —
 * przekroczenie. Bez żółtej „obietnicy” niezadeklarowanego Przyspieszenia. Ostatnia etykieta mówi tekstem, ile zostaje
 * (albo o ile przekroczono) — kolor tylko uzupełnia tekst i ikonę.
 *
 * Nic tu nie pisze dokumentów ani nie czeka na sieć: podgląd liczy się z ledgera na kliencie przy każdym odświeżeniu
 * linijki. Ruch nie jest skracany ani blokowany (§1 zasada 3). Poza walką, poza budżetem (cudza tura), dla pojazdów,
 * plansz pościgu i cudzych planów zostaje zwykła linijka dnd5e.
 *
 * Po wykonanym ruchu ponad pulę ruszający dostaje krótką wiadomość; trwałe ostrzeżenie zostaje w ledgerze i na karcie.
 */

import { budzetDotyczy, ledger, stan, kombatant } from "./ekonomia.mjs";
import { metry } from "../config/ekonomia-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KOLOR = Object.freeze({ miesci: 0x33BC4E, ponad: 0xE72124 });
const SZABLON = `modules/${MODULE_ID}/templates/ruch/waypoint-label.hbs`;

/**
 * Budżet do linijki albo null, gdy linijka M8 nie ma tu nic do powiedzenia.
 * @param {Token} token
 * @param {string} tryb
 */
function _budzet(token, tryb) {
  const doc = token?.document;
  if (!doc || !game.combat?.started || !budzetDotyczy(doc)) return null;
  const s = stan(doc, { tryb });
  if (!s || (!s.chwila.wlasna && !s.chwila.reakcja)) return null;
  return s.ruch;
}

/**
 * Rozszerzenie bieżącej klasy linijki (dnd5e `TokenRuler5e` albo to, co już ją rozszerzyło).
 * @param {typeof foundry.canvas.placeables.tokens.TokenRuler} Bazowa
 */
function _rozszerz(Bazowa) {
  return class NeuroLinijkaM8 extends Bazowa {
    static WAYPOINT_LABEL_TEMPLATE = SZABLON;

    /** Budżet raz na ścieżkę: koszt planu = koszt punktu − koszt historii (historia jest już w ledgerze). */
    _preparePath(path) {
      super._preparePath?.(path);
      const ostatniPrzebyty = [...path].reverse().find(w => w.stage === "passed");
      const historia = Number(ostatniPrzebyty?.measurement?.cost) || 0;
      const budzety = new Map();
      for (const w of path) {
        if (w.stage === "passed" || w.userId !== game.user.id || w.actionConfig?.teleport || w.action === "displace") continue;
        if (!budzety.has(w.action)) budzety.set(w.action, _budzet(this.token, w.action));
        const b = budzety.get(w.action);
        if (!b || !b.dostepny) continue;
        // Konwencja WKK wyłączona i sytuacja jej dotyczy — bez potwierdzenia kolorem, sama etykieta (§2.2).
        if (b.reczne?.length) { w.neuroM8 = { reczne: b.reczne, budzet: b }; continue; }
        const koszt = Number(w.measurement?.cost);
        if (!Number.isFinite(koszt)) { w.neuroM8 = { pozostalo: -Infinity, budzet: b }; continue; }
        w.neuroM8 = { pozostalo: Math.round((b.pozostalo - (koszt - historia)) * 100) / 100, budzet: b };
      }
    }

    #styl(waypoint, style) {
      const m = waypoint.neuroM8;
      if (!m || m.reczne) return style;
      style.color = m.pozostalo >= -0.001 ? KOLOR.miesci : KOLOR.ponad;
      return style;
    }

    _getSegmentStyle(waypoint) {
      return this.#styl(waypoint, super._getSegmentStyle(waypoint));
    }

    _getGridHighlightStyle(waypoint, offset) {
      return this.#styl(waypoint, super._getGridHighlightStyle(waypoint, offset));
    }

    _getWaypointStyle(waypoint) {
      return this.#styl(waypoint, super._getWaypointStyle(waypoint));
    }

    _getWaypointLabelContext(waypoint, state) {
      const context = super._getWaypointLabelContext(waypoint, state);
      const m = waypoint.neuroM8;
      if (!context || !m || waypoint.next) return context;
      const j = canvas.grid.units || "m";
      if (m.reczne) context.neuroM8 = { klasa: "reczne", ikona: "fa-scale-balanced", tekst: "rozstrzygnij ręcznie" };
      else if (m.pozostalo === -Infinity) context.neuroM8 = { klasa: "ponad", ikona: "fa-triangle-exclamation", tekst: "koszt nieznany" };
      else if (m.pozostalo >= -0.001) context.neuroM8 = { klasa: "miesci", ikona: "fa-person-walking", tekst: `zostaje ${metry(m.pozostalo)} ${j}` };
      else context.neuroM8 = { klasa: "ponad", ikona: "fa-triangle-exclamation", tekst: `ponad pulę ${metry(m.pozostalo)} ${j}` };
      return context;
    }
  };
}

/* -------------------------------------------- */
/*  Wiadomość po ruchu ponad pulę                 */
/* -------------------------------------------- */

/** U ruszającego: gdy ledger zapisze ten ruch z ostrzeżeniem — jedna wiadomość (bez dźwięku, bez karty). */
function _onMoveToken(doc, movement, _operation, user) {
  if (!user?.isSelf || !game.combat?.started) return;
  const c = kombatant(doc);
  if (!c) return;
  const koniec = Date.now() + 2500;
  const sprawdz = () => {
    const wpis = ledger(c).ruchy.find(r => r.id === movement.id);
    if (wpis?.ostrz?.length) {
      ui.notifications.warn(`${doc.name}: ${wpis.ostrz.at(-1)} Zadeklaruj akcję albo skoryguj na karcie.`);
      return;
    }
    if (!wpis && Date.now() < koniec) setTimeout(sprawdz, 150);
  };
  setTimeout(sprawdz, 100);
}

export function registerEkonomiaLinijka() {
  CONFIG.Token.rulerClass = _rozszerz(CONFIG.Token.rulerClass);
  Hooks.on("moveToken", _onMoveToken);
}
