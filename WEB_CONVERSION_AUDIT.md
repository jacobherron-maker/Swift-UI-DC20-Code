# DC20 Hub Web Conversion Audit

Audit date: 2026-09-02  
Branch: `jacobherron-maker-swift-to-web-conversion`  
Pre-rewrite baseline commit: `b3c8342`

## Executive summary

The React/Vite application has a valid Netlify build and a useful visual shell, but it is not yet a functional port of the native DC20 Hub. It should be treated as a prototype. Several navigation items lead to placeholders or the wrong page, the character and monster models use D&D-style statistics that do not match DC20, and most cross-module workflows have not been implemented.

The highest-risk issue was the public asset bundle. Complete sourcebooks, extracted sourcebook text, and uncurated OCR guesses were being copied into every Netlify deployment. Those assets have been removed from the deployable tree. The curated JSON reference files remain.

## Verified baseline

- `npm ci`: passes with no reported dependency vulnerabilities.
- `npm run build`: passes with TypeScript 6 and Vite 8.
- `npm run lint`: passes after removing the one unused catch variable.
- Browser smoke test: the app loads and primary navigation renders.
- Netlify output after remediation: approximately 760 KB, with no PDF, ZIP, or extracted-text files.
- Runtime reference test: 160 curated spells, 30 curated maneuvers, and 195 curated class feature/subclass entries load successfully.

## Changes made during the audit

1. Removed the ten sourcebook PDFs, twelve extracted/OCR text files, the duplicate PDF ZIP archive, and five uncurated OCR-derived JSON files from the current Git tree.
2. Added ignore rules to prevent these materials from being accidentally returned to Vite's `public` folder.
3. Repaired the Rules and Spells & Maneuvers loaders. The curated JSON files are documents containing `spells`, `maneuvers`, and `classes`; the previous UI incorrectly expected top-level arrays.
4. Removed runtime merging of uncurated OCR guesses. Those files contained false results such as prose fragments labeled as monsters or maneuvers.
5. Added complete spell and maneuver metadata to their detail display.
6. Corrected stacked advantage/disadvantage so the stack controls how many d20s are rolled and which is selected without adding the advantage count as a numeric bonus.
7. Pinned Node 22 for Netlify, declared the minimum supported Node version, changed deployment installation to `npm ci`, and added basic response security headers.
8. Updated the browser title and project documentation.

## Feature parity audit

| Module | Current web state | Main gap |
| --- | --- | --- |
| Dashboard | Partial | Counts only a subset of persisted objects and has no working quick actions. |
| Rules | Partial | Curated class references now load, but Core, Combat, General, Character Creation, Conditions, full class tables, and standalone subclass documents are absent. |
| Spells & Maneuvers | Partial | The curated libraries now load and search correctly. They are not connected to class progression, character choices, or character sheets. |
| Dice Roller | Mostly functional | Standard dice and stacked advantage work. Roll history, check/save integration, and contextual character rolls remain absent. |
| Encounters | Missing | The sidebar selection silently renders Dashboard because `App.tsx` has no Encounters route or view. Encounter data is not stored. |
| Monsters | Prototype with incorrect data model | Shows five D&D-style sample monsters using AC and ability scores. There is no DC20 level/type/role builder, published bestiary separation, editing, or encounter/combat synchronization. |
| Characters | Early prototype | Creation saves a record, but most builder steps are shells and the calculations are not DC20 calculations. |
| Equipment | Missing | Search/filter controls render above a “coming soon” message. There is no catalog, inventory, or equipped-state logic. |
| Combat | Missing | Static hero/enemy columns and a local round counter only. Add Combatant has no action and saved combats are unused. |
| Campaign | Early prototype | Edits one global title and one global note. It does not create/select multiple campaigns or nested named notes. |
| Customization | Missing | Settings button has no action and light mode does not restyle the hard-coded dark content surfaces. |
| Import/Export | Missing | Export Data has no action. Monster JSON import has no schema validation. |

## Critical correctness findings

### Domain models do not match DC20

- Character attributes use D&D-style scores such as 15 and the `(score - 10) / 2` modifier formula. The native DC20 builder uses direct attribute values, an attribute cap by character level, and DC20-specific generation methods.
- The displayed “Standard Array” is `15, 14, 13, 12`, not the DC20 array and point allocation.
- The attribute-method buttons use constant keys that do not match the handler's expected values, so changing methods does not reliably apply the selected method.
- The character card displays STR, INT, and DEX, omits Charisma, and uses terminology outside the four DC20 attributes.
- `DC20Trades` contains the five trade categories rather than the full trade list.
- The web class catalog omits Psion and Summoner; the ancestry catalog omits Psyborn.
- Skills, trades, languages, ancestry traits, class features, subclasses, talents, path progression, powers, equipment, and derived summary statistics are not mechanically connected.
- Character HP, Stamina, Mana, and Defense are hard-coded during creation.

### Monster and encounter foundations must be replaced

- The web `Monster` interface uses `ac`, D&D-style ability scores, and `stamina` as HP. It lacks DC20 Level, dynamic type, role, HP, PD, AD, attack modifier, Save DC, damage, AP, RP, Prime Modifier, Combat Mastery, mitigation, movement, senses, and structured feature/action/reaction records.
- `Monsters.json` contains five generic sample creatures rather than the audited Monster Collection and Starter Pack library.
- The page combines published and custom monsters and only supports deletion/import; it does not provide the required non-deletable sourcebook and editable custom sections.
- No Encounter view or persistent encounter collection exists.
- Combatants have no stable link back to characters or monsters, so later edits cannot synchronize into encounters or combats.

### Persistence is not migration-safe

- Zustand persistence writes the whole store to `campaign-store`, while the manual save/load functions also maintain a separate `dc20-campaign` key.
- There is no schema version, migration function, validation, backup import/export, or recovery path for malformed local data.
- Campaigns, characters, and combats are not scoped consistently. A future model replacement could invalidate existing browser saves without a migration layer.
- Browser local storage is device- and browser-specific. Netlify deployment alone does not provide accounts or cloud synchronization.

### Reference coverage is incomplete

- The curated spell and maneuver documents are usable, but they must be compared against the native catalogs before declaring parity.
- The class document contains 13 classes and only partial level coverage; it excludes Psion and Summoner and does not reproduce the complete native class-table system.
- The ancestry file contains short placeholder summaries and mechanically inaccurate D&D-like options. It must not be treated as authoritative source data.
- The remaining five-monster file is not sourcebook-accurate and must be replaced before the Monster tab is presented as a reference library.

## Sourcebook and licensing remediation

The current checkout no longer includes sourcebook PDFs, raw extracted text, or uncurated OCR datasets in deployable paths. They are recoverable from earlier Git commits and remain available in the separate local reference project.

Important: deleting files in a new commit does not remove them from Git history. Before making the repository public, transferring it, or distributing its history, remove the licensed binary/text blobs from history with a deliberate history-rewrite procedure. That operation changes commit IDs and requires coordination with every clone, so it should be handled separately with explicit approval.

Structured rules text and stat blocks may also be subject to the publisher's license even when PDFs are not distributed. Confirm distribution rights before making a full-reference deployment public.

## Netlify assessment

- The root `netlify.toml` correctly builds from the repository root and publishes `dc20-web/dist`.
- The nested `dc20-web/netlify.toml` supports deployments whose Netlify base directory is set to `dc20-web`.
- Node 22 is now pinned because Vite 8 requires Node 20.19 or newer; the previous README incorrectly allowed Node 18.
- SPA redirects are configured correctly.
- The app has no backend, authentication, server-side secrets, or cloud database.
- A production launch still needs a content-license decision, an application-data migration strategy, and meaningful automated tests.

## Recommended implementation order

### Phase 1 — Canonical DC20 core

1. Port the native Swift domain models into strict TypeScript models without D&D compatibility fields.
2. Port tested calculations for attributes, mastery caps, talents, ancestry effects, class/path progression, resources, health, defenses, attacks, saves, and equipment.
3. Introduce a versioned persisted state with validation, migrations, export, and import.
4. Add a unit-test runner and fixture tests shared by every UI module.

### Phase 2 — Monster → Encounter → Combat vertical slice

1. Port the audited Monster Collection/Starter Pack source library and builder defaults.
2. Implement separate read-only Sourcebook Monsters and editable Custom Monsters sections.
3. Build persistent encounters using stable monster references plus intentional snapshots.
4. Build saved combats from characters and encounters, preserving current HP/resources while synchronizing updated directory statistics.
5. Test create, edit, duplicate, delete, encounter conversion, combat launch, save, reload, and stale-reference recovery.

### Phase 3 — Character builder and sheet

Port the native builder in its actual step order, including every choice dependency and calculated summary. Then connect the interactive sheet, rolls, resources, conditions, inventory, powers, features, and multiple notes.

### Phase 4 — Reference and campaign modules

Port the full Rules hierarchy, equipment library, class tables, subclasses, conditions, campaigns, nested notes, and customization palettes.

### Phase 5 — Cross-platform release quality

Add responsive navigation, keyboard/accessibility review, PWA/offline behavior, error boundaries, backup/restore UX, end-to-end smoke tests, and deployment previews.

## Recommended next milestone

Begin with Phase 1 and immediately follow it with the Monster → Encounter → Combat vertical slice. Building those three screens on the current models would create throwaway work; replacing the shared core first gives every later module a stable foundation.
