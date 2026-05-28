# Neuroshima 2026 Overrides - Architecture Document

## Overview
This module acts as an override layer on top of the base FoundryVTT `dnd5e` system. Instead of building a standalone system from scratch, this module mutates and restricts `dnd5e` data structures and rulesets to fit the Neuroshima RPG mechanics.

## Core Architectural Principles & Invariants

### 1. FoundryVTT Hook Lifecycle & Configuration
Modifying the `dnd5e` configuration (`CONFIG.DND5E`) is highly sensitive to the Foundry hook lifecycle.
- **The `init` Hook:** Too early for reliable config overriding if translated terms or other module interactions occur later.
- **The `setup` and `i18nInit` Hooks:** The safest locations to inject and mutate `CONFIG.DND5E` structures (e.g., overriding weapon types). Localizing happens around `i18nInit`, making it the critical point to override UI-facing choice dropdowns. 
- **Mutation over Replacement:** When modifying core `CONFIG` objects, **always mutate the object** (using `delete` and `Object.assign`) rather than reassigning the whole object. Reassigning breaks internal references held by the `dnd5e` system UI, causing dropdowns to show stale or default values.

### 2. The Strictness of D&D 5e DataModels
The `dnd5e` system uses strict schema validation via DataModels (e.g., `CONFIG.Item.dataModels.weapon`).
- **NEVER strictly restrict existing DataModel schemas (`schema.fields.type.fields.value.choices`) unless absolutely necessary.**
- If you enforce restrictive choices in the DataModel schema, *any* existing item in the database (e.g., SRD monsters with "natural" weapons) that does not match your new choices will throw a fatal `DataModelValidationError` upon loading the world or opening the character sheet.
- **Solution:** Control the UI-facing choices (what the user selects in dropdowns) via `CONFIG.DND5E`, but leave the underlying DataModel schema permissive enough to allow legacy/unmapped data strings gracefully.

### 3. Migration Handling
Because changes are destructive to the base `dnd5e` structure, migrations must be explicit.
- When changing core data definitions (like from `martialM` to `Broń palna długa`), always provide a migration script to update existing Actor and Item data.
- Migrations must handle edge cases implicitly present in the D&D 5e SRD (e.g., ignoring natural attacks on monsters when migrating conventional weapons).

## AI Developer Notes: "What I wish I knew before starting"
- **Avoid Schema Validation Traps:** I spent significant time debugging game crashes caused by restricting the DataModels schema directly. Knowing that Foundry DataModels will crash the entire load process if a schema choice isn't met would have saved major debugging time.
- **Hook Timing Matters:** Setting config data too early (`init`) gets overwritten by D&D 5e language packs. The true "sweet spot" for config manipulation is `i18nInit`.
- **UI Caching Needs Object Mutability:** Dropdown menus on character sheets hold reference pointers to the original `CONFIG.DND5E` objects. Completely replacing `CONFIG.DND5E.weaponTypes = {...}` breaks the pointer. Explicitly using `delete CONFIG.DND5E.weaponTypes[key]` followed by `Object.assign` solved stubborn UI caching issues.
- **Use DevTools for Context:** The internal state of Foundry is heavily dependent on runtime instances. Reviewing the state via Chrome DevTools during runtime is essential for understanding how `dnd5e` constructs its UI.
