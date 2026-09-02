# DC20 Hub — Web App

DC20 Hub is a cross-platform React and TypeScript companion for building characters, preparing encounters, running combat, and organizing DC20 campaigns. It is the browser-based counterpart to the native macOS SwiftUI app and is configured for Netlify.

## Current feature set

- Comprehensive Rules library with Core, Combat, General, Character Creation, and Classes sections
- 475 searchable reference documents, including conditions, class tables, and standalone subclasses
- 160 spells and 30 maneuvers with complete metadata, descriptions, and enhancements
- Six-step DC20 character builder with calculated summary and interactive character sheet
- All 15 supported classes, including Psion and Summoner, plus Psyborn ancestry support
- Correct skill, trade, language, mastery-cap, ancestry-trait, talent, path, equipment, and resource logic
- 98-item equipment catalog with character inventory and equipped-state support
- 31 read-only sourcebook monsters plus a full custom monster builder
- Persistent encounter builder and combat tracker synchronized with characters and custom monsters
- Multiple campaigns with multiple named notes nested inside each campaign
- Standard dice roller and stacked advantage/disadvantage
- Sixteen curated class-themed palettes carried over from the macOS app
- Versioned local persistence with JSON backup export and restore
- Installable web app manifest and offline reference caching

## Run locally

Requirements: Node.js 20.19 or newer. Netlify uses Node 22.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Verify a change

```bash
npm run build
npm run lint
npm test
```

The test suite covers character calculations and progression, equipment behavior, monster/encounter/combat rules, persistence migration, and backup restoration.

## Saved data and backups

DC20 Hub saves automatically in the current browser using local storage. This keeps the Netlify deployment simple and private, but browser data does not automatically follow a user to another device.

Use **Export Data** in the sidebar to download a complete versioned JSON backup. Use **Customize → Import Backup** to restore it in another supported browser or operating system.

## Install on another operating system

Once deployed to HTTPS, supported browsers can install DC20 Hub as an app:

- Windows and Linux: use the browser’s **Install app** option.
- macOS: use Safari’s **Add to Dock** or a Chromium browser’s install option.
- iPhone and iPad: use **Share → Add to Home Screen**.
- Android: use **Install app** or **Add to Home screen**.

The service worker caches the app shell and local reference catalogs for use after an initial online visit. User-created data remains in the browser and can be moved with backups.

## Netlify deployment

The repository root and `dc20-web` directory each contain a compatible Netlify configuration. From the repository root, Netlify runs:

```text
npm --prefix dc20-web ci
npm --prefix dc20-web run build
```

and publishes `dc20-web/dist`.

No environment variables are needed for the local-only version.

## Project layout

```text
dc20-web/
├── public/data/        # Curated runtime catalogs; no sourcebook PDFs
├── scripts/            # Reproducible Swift-to-JSON source exporters
├── src/components/     # Layout, builder, sheet, and module views
├── src/data/           # Curated UI data such as class palettes
├── src/hooks/          # Validated catalog loaders
├── src/store/          # Versioned Zustand persistence and migrations
├── src/types/          # DC20 domain models
└── src/utils/          # Rules calculations and synchronization logic
```

## Distribution note

The deployable tree intentionally contains no sourcebook PDFs, ZIP archives, or raw PDF/OCR text. The structured reference catalogs still contain rules-facing material. Confirm the publisher’s licensing terms before making a full-reference deployment public or distributing the repository history.
