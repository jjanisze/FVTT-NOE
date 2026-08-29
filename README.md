# OSNNE — Obsługa Systemu Neuroshima Nowa Era

**Nieoficjalna konwersja *Neuroshima Ostatnia Era* (świat *Za Garść Gambli*) na silnik `dnd5e`
we FoundryVTT.**

[![Licencja: MIT](https://img.shields.io/badge/licencja-MIT-blue.svg)](LICENSE)
![FoundryVTT v14](https://img.shields.io/badge/FoundryVTT-v14-informational)
![dnd5e 5.3](https://img.shields.io/badge/dnd5e-5.3.x-informational)

> **English speakers:** this is a Polish-language fan module for a Polish-language RPG line, so
> player-facing docs here are Polish by design. If you're here to work on the code, start with
> [`DEV_GUIDE.md`](DEV_GUIDE.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`TESTING.md`](TESTING.md),
> [`RELEASING.md`](RELEASING.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md) — all in English.

---

## O projekcie

**OSNNE** to zestaw nakładek na system `dnd5e`, które zamieniają go w silnik zasad
*Neuroshima Ostatnia Era* — polskości, terminologii, cech, umiejętności, obrażeń, ekwipunku,
klas, stanów i mechanik przetrwania włącznie. Nie jest to osobny system FoundryVTT — to moduł,
który *modyfikuje* `dnd5e` „w locie".

To projekt fanowski i niekomercyjny, **niezwiązany z Portal Games** i nieoficjalny. Nie
dystrybuuje treści książki poza tym, co niezbędne do rozgrywki (statystyki, zasady, terminologia)
— zobacz [CREDITS.md](CREDITS.md#neuroshima-ostatnia-era-content-compendia-terminology-rules).

**Ten projekt powstaje w dużej mierze przy pomocy AI** — kod i dokumentacja przy udziale
Claude Code, część ikon wygenerowana przez Gemini/ChatGPT (szczegóły w [CREDITS.md](CREDITS.md)).
Właśnie dlatego moduł **nie trafia do oficjalnego sklepu modułów FoundryVTT** — jest dostępny
wyłącznie tutaj, na GitHubie, jawnie opisany, żeby każdy mógł ocenić, co dostaje. Zgłoszenia i
uwagi są jak najbardziej mile widziane.

## Wymagania

| Komponent | Wersja |
|---|---|
| FoundryVTT | v14+ |
| System `dnd5e` | 5.3.x |

## Instalacja w jednym kroku

1. W FoundryVTT: **Add-on Modules → Install Module**.
2. Wklej w pole „Manifest URL":
   ```
   https://github.com/jjanisze/neuroshima-2026-overrides/releases/latest/download/module.json
   ```
3. **Install**, potem włącz moduł w świecie opartym o system `dnd5e`.

Pełna instrukcja (metoda ręczna, aktualizacje, deinstalacja, typowe błędy) —
[`docs/Instalacja.md`](docs/Instalacja.md).

## Modpack — jak grać w to samo, co autor

OSNNE zakłada konkretny zestaw modułów i konfigurację, a nie tylko sam override. Do pełnego
doświadczenia (dźwięk pozycyjny, VFX strzałów, krew na scenach) dojdź te dwa:

| Moduł | Rola | Status |
|---|---|---|
| [**Sequencer**](https://foundryvtt.com/packages/sequencer) | Silnik VFX/SFX (muzzle flash, tracery, dźwięk pozycyjny) — moduł go wykorzystuje, jeśli jest obecny | Zalecany (opcjonalna zależność w `module.json`) |
| **Splatter** (theripper93) | Ambientowe plamy krwi napędzane obrażeniami aktorów | Zalecany, dobiera kolory wg typu istoty |

Zainstaluj je tak samo jak każdy inny moduł FoundryVTT (manifest URL / sklep modułów), włącz razem
z tym modułem w tym samym świecie. Bez nich moduł nadal działa — po prostu bez efektów, które od
nich zależą.

## Dokumentacja / podręcznik

Początek podręcznika użytkownika (po polsku) — [`docs/`](docs/README.md):

- [Instalacja](docs/Instalacja.md)
- [Pierwsze kroki](docs/Pierwsze-kroki.md)
- [Czym różni się od dnd5e](docs/Zmiany-wzgledem-dnd5e.md)
- [FAQ](docs/FAQ.md)

To dopiero początek — pełny, gęsty opis każdej mechaniki na razie mieszka w
[`IMPLEMENTATION.md`](IMPLEMENTATION.md) (dziennik zmian dewelopera, gęściejszy i mniej
uporządkowany, ale kompletny).

## Zgłaszanie błędów

Coś nie działa, tłumaczenie jest błędne, zasada nie zgadza się z podręcznikiem? Zgłoś przez
[GitHub Issues](https://github.com/jjanisze/neuroshima-2026-overrides/issues/new/choose).
W zgłoszeniu podaj:

- wersję FoundryVTT, wersję systemu `dnd5e` i wersję tego modułu (**Add-on Modules**),
- kroki, które prowadzą do problemu,
- jeśli to błąd wyświetlany w konsoli — treść błędu (F12 → Console),
- co się miało stać, a co się stało.

Szczegóły procesu (dla osób chcących też zaproponować poprawkę w kodzie) —
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licencja i źródła zasobów

Kod i dokumentacja modułu — licencja **MIT**, patrz [LICENSE](LICENSE). Dźwięki, ikony, grafika
żetonów i treść wywiedziona z *Neuroshima Ostatnia Era* mają odrębne źródła i warunki — pełna
lista w [CREDITS.md](CREDITS.md).

## Dla deweloperów

- [`DEV_GUIDE.md`](DEV_GUIDE.md) — środowisko, ścieżki, konwencje pracy nad modułem.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — inwarianty i decyzje architektoniczne (dlaczego coś jest
  zrobione tak, a nie inaczej).
- [`TESTING.md`](TESTING.md) — testy w Foundry przez Quench, `npm run validate:tests`.
- [`RELEASING.md`](RELEASING.md) — jak wychodzi nowa wersja (tag → GitHub Release → manifest URL).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — jak zgłosić błąd / zaproponować zmianę w kodzie.
