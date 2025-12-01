# Media Catalog Electron App Plan

## Goal

A cross-platform desktop app to catalog various collectible items (video games, DVDs, Blu-rays, board games, records, comic books, books, funko pops, sneakers, rare coins, trading card, etc) with CRUD, image handling, and export/import features. Built with Electron, Node.js 24, better-sqlite3, Bulma (with theme switching) and a local SQLite DB.

## High-level Design

- **Electron app** with separate `main` (backend) and `renderer` (frontend) processes
- **better-sqlite3** for lightweight, synchronous local data access
- Unified table in SQLite for all media; each row has:
- Title (text), Type (enum/text), Description (text), Image (local path), ISBN/SKU (text), **Rating (number/optional)**, Quantity (number/optional/default:1), Size (text/optional/conditional type: sneakers), Brand (text/optional), System (text/optional/conditional type: video games)
- Images are referenced by path, not imported or embedded
- Bulma for styling, with theme/dark mode toggle
- All CRUD operations, including soft-delete (deleted items go to Trash/Recoverable area)
- Advanced search/filter UI across all fields
- Bulk import/export as CSV/JSON
- Strong documenation to assist with maintenance and developing new versions. Documents should be aimed at junior level Javascript developers.

## File & Folder Structure

- [`package.json`](package.json): defines scripts, electron entry, build config
- [`electron/main.js`](electron/main.js): Electron main process, DB setup, IPC handlers
- [`electron/preload.js`](electron/preload.js): IPC bridge for DB and file access
- [`db/repo.js`](db/repo.js): all DB logic
- [`db/schema.sql`](db/schema.sql): creates table: `media (id, title, type, description, image, isbn_sku, rating, deleted, created_at, updated_at)`
- [`src/index.html`](src/index.html): UI shell, links Bulma, theme CSS
- [`src/renderer.js`](src/renderer.js): handles all UI/IPC logic
- [`src/styles.css`](src/styles.css): custom styles, theme vars
- [`assets/`](assets/): static files, icon, placeholder image

## Implementation Todos

- setup-base: Initialize project and folders, install deps, add `package.json`, Bulma, electron-builder, scripts
- db-schema: Write SQLite schema for unified media table w/ soft-delete, rating, timestamps
- db-repo: CRUD and bulk query ops in [`db/repo.js`](db/repo.js), support import/export, searching, soft-delete
- electron-main: Main process logic/IPC (load/save/query/soft-delete/media)
- electron-preload: IPC bridge, expose DB functions/filesystem to renderer safely
- ui-base: Build [`src/index.html`](src/index.html) using Bulma, add theme switcher
- ui-crud: CRUD UI, including image edit/removal modal, recover bin for deleted, advanced filter
- ui-import-export: Allow CSV/JSON import/export actions
- ui-testing: Automated testing workflow via playwright (add/edit/remove, search, theme, soft-delete, import/export)

---

## Requirements

Rating field should be a floating point value between 1.0 and 5.0. The UI representation will be stars.

Brand and size field should have autocompletion options. Data from brands entered on other items.

