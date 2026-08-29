# Instalacja

## Wymagania

| Komponent | Wersja |
|---|---|
| FoundryVTT | v14 lub nowszy |
| System `dnd5e` | 5.3.x (zweryfikowane na 5.3.0–5.3.2) |

## Metoda 1: Manifest URL (zalecana)

1. W panelu FoundryVTT (Setup) otwórz **Add-on Modules**.
2. Kliknij **Install Module**.
3. W polu **Manifest URL** wklej:
   ```
   https://github.com/jjanisze/neuroshima-2026-overrides/releases/latest/download/module.json
   ```
4. Kliknij **Install**. Foundry pobierze najnowsze wydanie automatycznie.
5. Wejdź w świat oparty o system `dnd5e` (albo utwórz nowy) i w **Manage Modules** zaznacz
   „Neuroshima: Ostatnia Era".

Aktualizacje działają identycznie jak w każdym innym module — Foundry sam zaproponuje nową wersję
w **Add-on Modules**, kiedy się pojawi (ten sam manifest URL zawsze wskazuje na najnowsze
wydanie).

## Metoda 2: Ręczna (offline / bez dostępu do internetu z serwera Foundry)

1. Wejdź na [stronę wydań](https://github.com/jjanisze/neuroshima-2026-overrides/releases/latest)
   i pobierz `module.zip`.
2. Rozpakuj zawartość archiwum do:
   ```
   <Twój katalog Data Foundry>/modules/neuroshima-2026-overrides/
   ```
   (tak, żeby `module.json` leżał bezpośrednio w tym folderze, nie w podfolderze).
3. Zrestartuj Foundry (albo odśwież listę modułów), moduł pojawi się na liście.

## Deinstalacja

**Add-on Modules → Uninstall** przy pozycji „Neuroshima: Ostatnia Era", albo ręcznie usuń folder
`modules/neuroshima-2026-overrides/`. Kompendia dostarczone przez moduł znikną razem z nim —
elementy już skopiowane do świata (np. na kartach postaci) zostają.

## Typowe błędy przy instalacji

| Komunikat / objaw | Przyczyna | Co zrobić |
|---|---|---|
| „This Module requires the following missing systems: dnd5e" | Nie masz zainstalowanego systemu `dnd5e` | Zainstaluj `dnd5e` (Setup → Systems) w wersji 5.3.x, zanim spróbujesz ponownie |
| „This Module is not compatible with the installed version of the dnd5e system" | Masz `dnd5e` starszy niż 5.0.0 albo wydanie z rozjazdem wersji | Zaktualizuj `dnd5e` do 5.3.x |
| Moduł zainstalowany, ale nie widać go na liście do włączenia | Wybrany świat nie jest oparty o `dnd5e` | Moduł wymaga świata z systemem `dnd5e` — utwórz taki świat lub przełącz się na inny |
| Po instalacji brak dźwięków/VFX strzałów | Brak modułu **Sequencer** | Zainstaluj Sequencer osobno — patrz [README, sekcja „Modpack"](../README.md#modpack--jak-grać-w-to-samo-co-autor) |
| Błąd w konsoli przy starcie świata (F12) | Może to być realny błąd, nie problem instalacji | Zgłoś na [GitHub Issues](https://github.com/jjanisze/neuroshima-2026-overrides/issues) z treścią błędu i wersjami (Foundry / dnd5e / moduł) |
