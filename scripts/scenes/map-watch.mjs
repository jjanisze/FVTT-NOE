/**
 * Neuroshima 5e — nasłuch map wypchniętych z Tiled.
 *
 * Domyka pętlę „popraw mapę w trakcie sesji": MG rozwala ścianę w Tiled,
 * wciska Ctrl+Shift+P, a tutaj pojawia się powiadomienie z guzikiem.
 *
 * ## Dlaczego manifest, a nie połączenie
 *
 * Foundry nie ma API do przyjmowania poleceń z zewnątrz. Ma za to serwer
 * plików — katalog danych świata jest podawany po HTTP, więc `push.py`
 * dopisuje wpis do `_push.json`, a przeglądarka go odpytuje. Nie trzeba
 * niczego otwierać ani konfigurować, a push działa nawet przy wyłączonej
 * grze: zmiana poczeka w pliku i zgłosi się przy najbliższym starcie.
 *
 * ## Wykrywamy automatycznie, stosujemy na kliknięcie
 *
 * Mapa NIE przeładowuje się sama. W środku walki podmiana ścian pod stopami
 * tokenów byłaby najgorszą możliwą niespodzianką — MG musi zdecydować, kiedy
 * to wpuścić. Powiadomienie wisi, dopóki się go nie kliknie.
 *
 * Znacznik ostatnio zobaczonej zmiany siedzi w ustawieniu świata, więc jedno
 * zgłoszenie nie wraca po każdym odświeżeniu przeglądarki.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const PLIK_MANIFESTU = "worlds/output/scenes/_push.json";
const USTAWIENIE_ZNACZNIKI = "mapyOstatnioWidziane";
const USTAWIENIE_WLACZONE = "mapyNasluch";
const USTAWIENIE_ODSTEP = "mapyOdstepSek";

let uchwytTimera = null;

async function pobierzManifest() {
  try {
    const res = await fetch(`${PLIK_MANIFESTU}?v=${Date.now()}`);
    if (!res.ok) return null;           // brak pliku = nikt jeszcze nie pchał
    return await res.json();
  } catch {
    return null;
  }
}

/** Pokazuje powiadomienie z guzikiem wczytującym mapę. */
function zglos(mapId, wpis) {
  const scena = wpis.scena || mapId;
  const komunikat =
    `Mapa <b>${mapId}</b> została wypchnięta z Tiled (${wpis.czasCzytelny}). ` +
    `Kliknij, aby wczytać do sceny „${scena}”.`;

  // permanent: powiadomienie ma czekać, aż MG je obsłuży, a nie zniknąć
  // po pięciu sekundach w środku opisywania sceny graczom.
  const powiadomienie = ui.notifications.info(komunikat, { permanent: true });

  // ui.notifications zwraca element albo id zależnie od wersji — sięgamy po
  // węzeł ostrożnie, żeby brak elementu nie wysypał nasłuchu.
  const wezel = powiadomienie?.element ?? powiadomienie;
  if (wezel?.addEventListener) {
    wezel.style.cursor = "pointer";
    wezel.addEventListener("click", async () => {
      await wczytaj(mapId, scena);
      wezel.remove?.();
    }, { once: true });
  }
}

/** Wczytuje mapę: aktualizuje istniejącą scenę albo tworzy nową. */
async function wczytaj(mapId, scena) {
  const api = game.neuroshima?.maps;
  if (!api) return ui.notifications.error("Brak API map w module.");
  const istnieje = game.scenes.find(s => s.getFlag(MODULE_ID, "mapId") === mapId);
  if (istnieje) await api.update(mapId);
  else await api.utworz(mapId, scena);
}

async function sprawdz({ cicho = false } = {}) {
  if (!game.user.isGM) return;
  const manifest = await pobierzManifest();
  if (!manifest) {
    if (!cicho) ui.notifications.warn("Nie ma jeszcze żadnego wypchnięcia z Tiled.");
    return;
  }
  const widziane = game.settings.get(MODULE_ID, USTAWIENIE_ZNACZNIKI) ?? {};
  let nowych = 0;
  for (const [mapId, wpis] of Object.entries(manifest)) {
    if (widziane[mapId] === wpis.czas) continue;
    widziane[mapId] = wpis.czas;
    nowych += 1;
    zglos(mapId, wpis);
  }
  if (nowych) await game.settings.set(MODULE_ID, USTAWIENIE_ZNACZNIKI, widziane);
  else if (!cicho) ui.notifications.info("Brak nowych wypchnięć — wszystko wczytane.");
}

function ustawTimer() {
  if (uchwytTimera) clearInterval(uchwytTimera);
  uchwytTimera = null;
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, USTAWIENIE_WLACZONE)) return;
  const odstep = Math.max(5, game.settings.get(MODULE_ID, USTAWIENIE_ODSTEP) || 10);
  uchwytTimera = setInterval(() => sprawdz({ cicho: true }), odstep * 1000);
}

export function registerMapWatch() {
  game.settings.register(MODULE_ID, USTAWIENIE_WLACZONE, {
    name: "Nasłuch map z Tiled",
    hint: "Sprawdzaj, czy mapa została wypchnięta z edytora, i zgłaszaj to MG.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: ustawTimer
  });
  game.settings.register(MODULE_ID, USTAWIENIE_ODSTEP, {
    name: "Nasłuch map — odstęp (sekundy)",
    hint: "Jak często sprawdzać. Minimum 5.",
    scope: "world", config: true, type: Number, default: 10,
    onChange: ustawTimer
  });
  game.settings.register(MODULE_ID, USTAWIENIE_ZNACZNIKI, {
    scope: "world", config: false, type: Object, default: {}
  });

  Hooks.once("ready", () => {
    ustawTimer();
    // Pierwsze sprawdzenie od razu: mapa mogła zostać wypchnięta, gdy gra
    // była wyłączona, i taka zmiana ma się zgłosić przy starcie.
    sprawdz({ cicho: true });
  });

  console.log(`${MODULE_ID} | Nasłuch map z Tiled gotowy`);
}

export const mapWatchApi = { sprawdz, wczytaj };
