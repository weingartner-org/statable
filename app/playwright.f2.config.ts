import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /(ziehen|befehle)-tastatur\.spec\.ts/, timeout: 90_000, workers: 1, reporter: [['list']], outputDir: './e2e/ergebnisse/spuren-f2',
  use: { baseURL: 'http://localhost:4205/', trace: 'off' }, projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
