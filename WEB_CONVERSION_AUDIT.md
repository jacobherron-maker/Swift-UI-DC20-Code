# DC20 Hub Web Conversion Audit

Audit date: 2026-09-02  
Branch: `jacobherron-maker-swift-to-web-conversion`  
Pre-migration baseline: `82a3a99`

## Executive summary

The web conversion is now a functional, migration-safe DC20 Hub rather than the earlier visual prototype. Its primary modules run against DC20-specific models and source-exported catalogs, the character and monster workflows carry through encounters and combat, and browser data can be backed up and restored.

The app builds as a Netlify-ready React/Vite production bundle and can be installed on supported desktop and mobile operating systems. The deployable tree does not contain sourcebook PDFs, PDF archives, or raw extracted/OCR text.

## Verified release baseline

- `npm ci`: successful; package lock updated for the test runner and current build tooling.
- `npm run build`: successful with TypeScript 6 and Vite 8.
- `npm run lint`: successful with no warnings.
- `npm test`: 4 files and 24 tests passing.
- Production preview: Dashboard and customization load from the built bundle with no browser warnings or errors.
- Full navigation smoke test: all 10 primary sections open their intended screens.
- Reference smoke tests: complete Arcane Bolt and Heroic Bash text, including enhancements, renders in the powers library.
- Class smoke tests: complete Barbarian features, levels 1–10 table, subclasses, and standalone Elemental Fury document render in Rules.
- Responsive check: compact sidebar and content reflow verified at a 900 × 720 viewport.
- Production manifest and service worker: both return HTTP 200 from the built bundle.

## Migrated modules

| Module | Current state | Verified coverage |
| --- | --- | --- |
| Dashboard | Functional | Counts every persisted directory and provides working quick actions. |
| Rules | Functional | Five requested sections, 475 searchable documents, conditions, class tables, and standalone subclasses. |
| Spells & Maneuvers | Functional | 160 spells and 30 maneuvers with searchable full descriptions, costs, ranges, requirements, tags, durations, and enhancements. |
| Dice Roller | Functional | D2, D4, D6, D8, D10, D12, D20, D100, plus stacked advantage/disadvantage. |
| Characters | Functional | Six-step DC20 builder, complete source-backed choices, calculations, interactive sheet, features, powers, equipment, rolls, resources, conditions, and named notes. |
| Equipment | Functional | 98 categorized items, mechanics, character inventory, starting selections, and equipped-state calculations. |
| Monsters | Functional | 31 non-deletable sourcebook monsters, editable custom directory, DC20 builder defaults, traits/features/actions/reactions, and detailed display. |
| Encounters | Functional | Persistent party composition, monster entries, difficulty calculations, and combat launch. |
| Combat | Functional | Multiple saved combats, characters and monster directories, HP/AP/RP, teams, rounds, conditions, source details, and edit synchronization. |
| Campaign | Functional | Multiple selectable campaigns with multiple named editable notes nested in each. |
| Customization | Functional | Sixteen curated native-app palettes with immediate persisted selection. |
| Import/Export | Functional | Versioned full-state JSON backups with schema migration and safe default normalization. |

## Runtime catalog inventory

| Catalog | Records |
| --- | ---: |
| Rules documents | 475 |
| Spells | 160 |
| Maneuvers | 30 |
| Equipment | 98 |
| Sourcebook monsters | 31 |
| Classes | 15 |
| Class feature records | 283 |
| Ancestry traits | 195 |
| Skills | 12 |
| Trades | 28 |
| Languages | 15 |

The class catalog includes Psion and Summoner. The ancestry choices include Psyborn. Where Monster Collection guidance differs from the earlier Starter Pack, the newer collection is treated as the preferred monster-building source.

## Important behavior verified during migration

- Character records from the D&D-shaped prototype are converted to direct DC20 attribute values.
- Mastery caps scale through Novice, Adept, Expert, Master, and Grandmaster.
- Ancestry Attribute Increase and Skill/Trade Expertise affect calculated builder values and caps.
- Bard Remarkable Repertoire grants the intended skill points and Magical Secrets capacity.
- Martial characters can choose Spellcaster Path and receive the applicable mana and spell capacity.
- Character updates synchronize into linked combatants without healing existing damage or restoring spent AP.
- Custom monster updates synchronize through saved encounters and combatants while preserving live combat damage.
- Published monsters cannot be edited or deleted; custom monsters can.
- User text fields are controlled inputs and remain editable across builder and sheet navigation.
- Character deletion no longer relies on an unstable selected-array index.

## Persistence and portability

Zustand persistence now has an explicit schema version and migration layer. Legacy monster, combat, encounter, and character shapes are normalized when read. The manual save button updates save status while normal edits persist immediately through the single canonical store.

Backups use a versioned `dc20hub-web-backup` document containing campaigns, characters, custom monsters, encounters, combats, selections, and theme preference. Import runs through the same migration and normalization layer as browser persistence.

Browser local storage remains device- and browser-specific. Netlify deployment alone does not provide accounts, cloud sync, or shared campaigns.

## Sourcebook and licensing audit

The deployed `public` and production `dist` trees contain no `.pdf`, `.zip`, or raw `.txt` sourcebook assets. Obsolete placeholder catalogs were removed, including the five-monster D&D-shaped file, summarized ancestry file, and incomplete 13-class feature file.

The JSON catalogs are generated from audited native data through reproducible scripts. Source PDFs remain outside the deployable repository tree as read-only project references.

Deleting sourcebooks in a newer Git commit does not remove them from older repository history. Before making the repository public, transferring it, or distributing a complete clone, perform a coordinated history rewrite to remove licensed binaries and raw extracted text from earlier commits.

Structured rules text and stat blocks may still be subject to publisher licensing even when PDFs are not bundled. Confirm public-distribution rights before launching the full-reference site.

## Remaining release work

The migrated app is usable locally and deployable, but these are separate product enhancements rather than parity blockers:

- Optional accounts and encrypted cloud synchronization
- Real-time multi-user campaign collaboration
- Automated browser-level end-to-end tests in CI
- Character-sheet PDF/print layout
- Portrait and custom image storage
- More specialized small-phone layouts for dense builders and combat boards
- A deliberate public-content license and repository-history decision

## Recommended next milestone

Create a Netlify deploy preview from this branch and perform a short table-use acceptance pass on the hosted URL. After that, decide whether the first public release remains local-only or adds account-based cloud sync. Do not publish the complete repository history until the licensed-source history decision is resolved.
