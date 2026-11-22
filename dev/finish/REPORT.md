# Manifest wykończeń — raport przypisań

Generowane przez `node dev/finish/build-manifest.mjs` — nie edytuj ręcznie. Źródło reguł:
[families.mjs](families.mjs). Rodzina pochodzi z danych (paczka, typ, flagi modułu), nigdy z nazwy pliku.

Profil: `noe-m9-r07-v2`. Tematów z rodziną: **782** (biały master × rodzina). Stan przeglądu: approved 782.

| Rodzina | Rola | Tematów |
| --- | --- | ---: |
| brutal | character | 25 |
| cwaniak | character | 26 |
| spec | character | 25 |
| twardziel | character | 22 |
| zlodziej | character | 25 |
| zwiadowca | character | 30 |
| origin | character | 48 |
| feat | character | 53 |
| shared | character | 5 |
| weapon | equipment | 86 |
| ammo | equipment | 28 |
| armor | equipment | 18 |
| tools | equipment | 34 |
| medical | equipment | 27 |
| chemicals | equipment | 15 |
| explosives | equipment | 16 |
| survival | equipment | 4 |
| salvage | equipment | 16 |
| utility | operation | 61 |
| creature | character | 189 |
| devices | equipment | 26 |
| documents | equipment | 3 |

## Braki — bez przypisania

Luka oznacza brak reguły z danych konsumenta. Nowe rodziny zatwierdzone w profilu v2:
creature i shared — neutralne tło generic; devices — kolor tools; documents — kolor salvage.

Brak.

## Jawne wyjątki — poza recepturami glifów

- `icons/doll/mannequin.webp` — ilustracja manekina oporządzenia — bez receptury białego glifu (`scripts/config/doll-anchors.mjs`).
- `icons/obiekty/ramka.svg` — dwukolorowa natywna ramka celu na scenie — osobny kontrakt canvas (`scripts/scenes/obiekty.mjs`).

## Ten sam master w kilku rodzinach

Poprawne: tło mówi, skąd zdolność pochodzi, więc jeden glif dostaje osobny eksport na rodzinę.

- `icons/abilities/bolesny-atak.svg` → creature, zlodziej
- `icons/abilities/brutalny-cios.svg` → brutal, creature
- `icons/abilities/gola-klata.svg` → brutal, creature
- `icons/abilities/gunfight.svg` → creature, feat
- `icons/abilities/naprawianie.svg` → creature, utility
- `icons/abilities/przycelowanie.svg` → feat, twardziel
- `icons/abilities/pulp-fiction.svg` → creature, feat
- `icons/abilities/slaby-punkt.svg` → creature, zwiadowca
- `icons/abilities/szosty-zmysl.svg` → brutal, creature
- `icons/abilities/szybkie-palce.svg` → creature, feat
- `icons/abilities/zasadzka.svg` → creature, zwiadowca
- `icons/fanty/alkohol.svg` → survival, utility
- `icons/fanty/cygaro.svg` → salvage, utility
- `icons/fanty/gra.svg` → salvage, utility
- `icons/fanty/kaseta.svg` → salvage, utility
- `icons/fanty/konsola.svg` → salvage, utility
- `icons/fanty/papier-toaletowy.svg` → salvage, utility
- `icons/fanty/plyta-cd.svg` → salvage, utility
- `icons/fanty/prasa.svg` → salvage, utility
- `icons/fanty/slodycze.svg` → survival, utility
- `icons/fanty/zabawka.svg` → salvage, utility
- `icons/items/drugs/actinix.svg` → medical, utility
- `icons/items/drugs/alkohol_markowy.svg` → chemicals, utility
- `icons/items/drugs/alkohol_tani.svg` → chemicals, utility
- `icons/items/drugs/anestix.svg` → medical, utility
- `icons/items/drugs/antybiotyk.svg` → medical, utility
- `icons/items/drugs/ar23.svg` → medical, utility
- `icons/items/drugs/ar35_beta.svg` → medical, utility
- `icons/items/drugs/aspiryna_k.svg` → medical, utility
- `icons/items/drugs/cygaro.svg` → chemicals, utility
- `icons/items/drugs/deadline.svg` → medical, utility
- `icons/items/drugs/desmopresyna.svg` → medical, utility
- `icons/items/drugs/detoks.svg` → medical, utility
- `icons/items/drugs/dracophen.svg` → medical, utility
- `icons/items/drugs/iv_bag_spare.svg` → medical, utility
- `icons/items/drugs/medpak.svg` → medical, utility
- `icons/items/drugs/narkotyki_latwe.svg` → chemicals, utility
- `icons/items/drugs/narkotyki_przedwojenne.svg` → chemicals, utility
- `icons/items/drugs/neodrugs.svg` → chemicals, utility
- `icons/items/drugs/neuro_cola.svg` → medical, utility
- `icons/items/drugs/painkiller.svg` → medical, utility
- `icons/items/drugs/papieros.svg` → chemicals, utility
- `icons/items/drugs/psychotropy.svg` → medical, utility
- `icons/items/drugs/radmov.svg` → medical, utility
- `icons/items/drugs/radoff.svg` → medical, utility
- `icons/items/drugs/relanium.svg` → medical, utility
- `icons/items/drugs/reminex.svg` → medical, utility
- `icons/items/drugs/taurus.svg` → medical, utility
- `icons/items/drugs/tornado.svg` → chemicals, utility
- `icons/items/drugs/trybiotyl.svg` → medical, utility
- `icons/items/drugs/tyton_do_zucia.svg` → chemicals, utility
- `icons/items/drugs/wapniak.svg` → medical, utility
- `icons/items/drugs/wd_tabs.svg` → medical, utility
- `icons/items/loot/komputer_gamingowy.svg` → devices, salvage
- `icons/items/loot/kontroler_zdalnego_sterowania.svg` → devices, utility
- `icons/tools/medyka.svg` → tools, utility
- `icons/weapons/armalite_carbine.svg` → creature, weapon
- `icons/weapons/bow.svg` → creature, weapon
- `icons/weapons/brass_knuckles.svg` → creature, weapon
- `icons/weapons/c4_explosive.svg` → explosives, utility
- `icons/weapons/chain.svg` → creature, weapon
- `icons/weapons/combat_knife.svg` → creature, weapon
- `icons/weapons/crash_halberd.svg` → creature, weapon
- `icons/weapons/desert_eagle.svg` → creature, weapon
- `icons/weapons/iron_pipe_club.svg` → creature, weapon
- `icons/weapons/javelin.svg` → creature, weapon
- `icons/weapons/kamienny_noz.svg` → creature, weapon
- `icons/weapons/lever_action_rifle.svg` → creature, weapon
- `icons/weapons/m642_revolver.svg` → creature, weapon
- `icons/weapons/maczuga.svg` → creature, weapon
- `icons/weapons/magnum_44.svg` → creature, weapon
- `icons/weapons/mlotek.svg` → creature, weapon
- `icons/weapons/palka_policyjna.svg` → creature, weapon
- `icons/weapons/paralyzer.svg` → creature, weapon
- `icons/weapons/peacemaker_revolver.svg` → creature, weapon
- `icons/weapons/pitchfork.svg` → creature, weapon
- `icons/weapons/saber.svg` → creature, weapon
- `icons/weapons/spear.svg` → creature, weapon
- `icons/weapons/sztylet.svg` → creature, weapon
- `icons/weapons/tommy_gun.svg` → creature, weapon
- `icons/weapons/uzi.svg` → creature, weapon

## Kolizje identyfikatorów

Brak.

## Brak białego mastera

Brak.

## Pilot E2

Komplet 24 tematów pilota ma wpis.

## Pliki biblioteki bez konsumenta w paczkach i kodzie

215 ścieżek (bez rozszerzenia; stany pominięte — mają własny kontrakt kolorów). To kandydaci na ikony przypisywane dopiero w świecie
(embedded items aktorów, ręczne przedmioty) albo nieużywane warianty; rozstrzyga E5.

`icons/abilities/aktywny-system-obrony`, `icons/abilities/aura-pogardy`, `icons/abilities/berserk_active`, `icons/abilities/kondycha_active`, `icons/abilities/kuchenny-terror`, `icons/abilities/logika-roznoboczna`, `icons/abilities/mistrz-taktyki`, `icons/abilities/mlynek`, `icons/abilities/prog-awarii`, `icons/abilities/rozkaz-likwidacji`, `icons/abilities/szara-eminencja`, `icons/abilities/taca-i-w-nogi`, `icons/abilities/tchorzliwosc`, `icons/abilities/tryb-turbo`, `icons/abilities/trzeba-dobic`, `icons/abilities/twierdzenie-kata-prostego`, `icons/abilities/tylko-jedno-w-glowie-mam`, `icons/abilities/tylko-zwarcie`, `icons/abilities/wielonozny`, `icons/abilities/zasloniecie-helmu`, `icons/abilities/zimna-krew`, `icons/abilities/zywa-tarcza`, `icons/actions/bebeszenie`, `icons/actions/doba`, `icons/actions/odstapienie`, `icons/actions/przyspieszenie`, `icons/actions/rozbiorka`, `icons/actions/szabrowanie`, `icons/actions/ukrywanie-sie`, `icons/actions/unikanie`, `icons/activities/activity_melee`, `icons/addons/celownik-optyczny`, `icons/addons/celownik-trytowy`, `icons/addons/chwyt-przedni`, `icons/addons/dociazenie`, `icons/addons/dozownik`, `icons/addons/dwojnog`, `icons/addons/kolba-dostawna`, `icons/addons/kolba-skladana`, `icons/addons/kolimator` … (+175)

