/**
 * Neuroshima 5e — sygnał naruszenia: „oznaczać, nie zakazywać” (PLAN_beta §2; PLAN_m6 D11, PLAN_m7 D5).
 *
 * Gdy coś poszło wbrew zasadom, ale RAW zostawia rozstrzygnięcie MG — biegłość, która nic nie dodała (M6 D1),
 * wspinaczka bez wolnych rąk, `ciężka` bez oparcia, Reakcja zużyta drugi raz (M7) — moduł nie blokuje, tylko mówi:
 * szept do MG i właścicieli postaci z listą powodów oraz krótki dźwięk porażki. MG może to zignorować.
 *
 * Dźwięk: `sounds/produkcja/porazka.ogg` (ten sam co nieudana produkcja), kanał „interfejs”, słyszą go tylko
 * adresaci szeptu. Cisza w przebiegu Quencha.
 */

const MODULE_ID = "neuroshima-2026-overrides";
export const DZWIEK_NARUSZENIA = `modules/${MODULE_ID}/sounds/produkcja/porazka.ogg`;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** MG i aktywni-nieaktywni właściciele postaci (OWNER) — adresaci szeptu. */
export function adresaciNaruszenia(actor) {
  const ids = new Set(ChatMessage.getWhisperRecipients("GM").map(u => u.id));
  for (const u of game.users) if (!u.isGM && actor?.testUserPermission?.(u, "OWNER")) ids.add(u.id);
  return [...ids];
}

/**
 * @param {Actor|null} actor
 * @param {object} opts
 * @param {string} opts.tytul         Nagłówek karty.
 * @param {string[]} opts.linie       Powody, po jednym w wierszu.
 * @param {boolean} [opts.dzwiek=true]
 * @returns {Promise<ChatMessage|null>}
 */
export async function sygnalNaruszenia(actor, { tytul, linie = [], dzwiek = true } = {}) {
  if (!linie.length) return null;
  const whisper = adresaciNaruszenia(actor);
  const content = `<div class="neuro-naruszenie"><p><strong>${esc(tytul)}</strong></p>`
    + `<ul>${linie.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`;
  const msg = await ChatMessage.implementation.create({
    content, whisper,
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    flags: { [MODULE_ID]: { naruszenie: true } }
  });
  if (dzwiek && globalThis.quench?._currentRunner?.state !== "running") {
    // `play` gra zawsze lokalnie (wywołujący jest MG albo właścicielem — adresatem), reszcie wysyła gniazdem.
    const inni = whisper.filter(id => id !== game.user.id && game.users.get(id)?.active);
    try {
      foundry.audio.AudioHelper.play({ src: DZWIEK_NARUSZENIA, volume: 0.5, loop: false, channel: "interface" },
        inni.length ? { recipients: inni } : false)?.catch?.(() => {});
    } catch (_e) { /* brak dźwięku nie psuje sygnału */ }
  }
  return msg;
}
