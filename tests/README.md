# Testing Guide

This directory contains automated tests for the Media Catalog application.

## Test Setup

The tests use Playwright for browser automation. However, since this is an Electron application, full end-to-end testing requires special setup.

## Running Tests

### Option 1: HTML Testing (Current Setup)

To test the HTML/JS directly, you can serve the `src/index.html` file with a local server:

```bash
# Install a simple HTTP server
npm install -g http-server

# Serve the src directory
cd src
http-server -p 3000

# In another terminal, run tests
npm test
```

Note: This approach has limitations since it doesn't test Electron-specific features like IPC communication.

### Option 2: Electron Testing (Recommended for Production)

For full Electron testing, you would need to:

1. Install `playwright-electron` or use `spectron`:
   ```bash
   npm install --save-dev @playwright/test playwright-electron
   ```

2. Update `playwright.config.js` to use Electron:
   ```javascript
   const { defineConfig } = require('@playwright/test');
   const { _electron } = require('playwright-electron');
   
   module.exports = defineConfig({
     // Electron-specific config
   });
   ```

3. Update test files to launch Electron:
   ```javascript
   const { test } = require('@playwright/test');
   const { _electron } = require('playwright-electron');
   
   test('my test', async () => {
     const electronApp = await _electron.launch({ args: ['electron/main.js'] });
     const window = await electronApp.firstWindow();
     // Test the window
   });
   ```

## Test Coverage

The test suite covers:

- ✅ Adding new media items
- ✅ Editing existing items
- ✅ Deleting items (soft delete)
- ✅ Search and filtering
- ✅ Theme switching
- ✅ Trash/recovery functionality
- ✅ Rating system
- ✅ Conditional fields (system for games, size for sneakers)
- ✅ Import/export (JSON/CSV)
- ✅ Autocomplete (brand, size)
- ✅ Image handling

## Writing New Tests

When adding new features, add corresponding tests:

1. Create a new test in `media-catalog.spec.js`
2. Follow the existing test structure
3. Use descriptive test names
4. Test both success and error cases

## Debugging Tests

To debug tests, run with the `--debug` flag:

```bash
npx playwright test --debug
```

This opens the Playwright Inspector where you can step through tests.
