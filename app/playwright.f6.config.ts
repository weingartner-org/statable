import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /ansage-ergebnis\.spec\.ts/, timeout: 90_000, workers: 1, reporter: [['list']], outputDir: './e2e/ergebnisse/spuren-f6',
  use: { baseURL: 'http://localhost:4206/', trace: 'off' }, projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
