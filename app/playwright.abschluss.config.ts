// Abschlussmessung Welle 7: gegen den schon gebauten dist-e2e, eigener Server auf Port 4195 (extern gestartet), kein Neubau.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  outputDir: './e2e/ergebnisse/spuren-abschluss',
  use: { baseURL: 'http://127.0.0.1:4195/', locale: 'de-DE' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
