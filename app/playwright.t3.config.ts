import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /ansage-t3\.spec\.ts/, timeout: 120_000, workers: 1, reporter: [['list']], outputDir: './e2e/ergebnisse/spuren-t3',
  use: { baseURL: 'http://localhost:4207/', trace: 'off' }, projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
