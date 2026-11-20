import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /rest-b-behebung\.spec\.ts/, timeout: 60_000, workers: 1, reporter: [['list']], outputDir: './e2e/ergebnisse/spuren-x',
  use: { baseURL: 'http://127.0.0.1:4202/', trace: 'off' }, projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
