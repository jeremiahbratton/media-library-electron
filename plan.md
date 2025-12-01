# plan.md

## Goal
Build a desktop CRUD app for cataloging media (video games, DVDs, Blu-rays, board games, records, comic books) using:
- Node.js 24
- Electron
- better-sqlite3
- Bulma CSS

Fields: Title, Type, Description, Image (local file path), ISBN or SKU.

## Commands
1. Initialize project and install deps:
   - npm init -y
   - npm install electron better-sqlite3 bulma
   - npm install --save-dev electron-builder

## Files & Content

### package.json
{
  "name": "media-catalog",
  "version": "1.0.0",
  "description": "Electron CRUD app for cataloging media",
  "main": "electron/main.js",
  "type": "module",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "build": {
    "appId": "com.example.media.catalog",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "src/**/*",
      "db/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": { "category": "public.app-category.productivity" },
    "win": { "target": "nsis" },
    "linux": { "target": "AppImage" }
  }
}

### Folder structure
- electron/
  - main.js
  - preload.js
- db/
  - repo.js
  - schema.sql
  - media.db (runtime)
- src/
  - index.html
  - renderer.js
  - styles.css
- assets/
  - placeholder.png