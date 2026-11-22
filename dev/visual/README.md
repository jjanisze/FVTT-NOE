# M9 — źródła i referencje istniejącego UI

[Zakres i ograniczenia audytu](../../AUDIT_m9_ui.md) ·
[14 zrzutów „przed”, 2026-11-15](reference/2026-11-15/index.html).
[Dwa nowe tła i osiem prób na karcie](../art/m9/index.html).

- `audit-sources.mjs` — leksykalna inwentaryzacja importowanego kodu, aplikacji, wywołań DialogV2/czatu i plików ikon.
- `source-inventory.json` — wynik z lokalizacjami do ręcznego przeglądu; liczby wywołań nie oznaczają liczby projektów UI.
- `capture-audit.mjs` — otwiera istniejące karty w gotowej piaskownicy agenta, zbiera zrzuty i rejestry. Bez zatwierdzania formularzy/akcji, tworzenia dokumentów i restartu świata. Wymaga aktorów przykładowych użytych w audycie.
- `build-gallery.mjs` — buduje offline `index.html` z manifestu istniejących zrzutów.
- `capture-sheet-art.mjs` — tymczasowa podmiana tła PC w DOM piaskownicy, osiem zrzutów A/B i przywrócenie stanu okna; bez zapisu dokumentów.

Polecenia i brakujące próby opisuje główny audyt. Te narzędzia nie zmieniają wyglądu modułu ani jego assetów.
