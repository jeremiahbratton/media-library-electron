/**
 * Playwright Configuration
 * 
 * Configuration for automated UI testing with Playwright.
 * Tests will run against the Electron application.
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    
    // Note: Electron testing with Playwright requires special setup
    // For now, we'll test the HTML/JS directly. In production, you might
    // want to use spectron or playwright-electron for full Electron testing
});
