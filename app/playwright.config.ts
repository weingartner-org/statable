// Browser-Tests (getrennt von `npm test`): feste Fassung bauen, mit `vite preview` ausliefern, nie gegen den Dev-Server.
import { defineConfig } from '@playwright/test';

const PORT = 4173;
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  workers: 1, // NVDA läuft nur einmal am Rechner
  reporter: [['list']],
  outputDir: './e2e/ergebnisse/spuren',
  use: { baseURL: `http://127.0.0.1:${PORT}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
