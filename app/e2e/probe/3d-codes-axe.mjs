// Paket 3D: axe auf dem Abschnitt „Einmal-Codes (Teilnahme-Codes)“ in „Fragebogen planen“ (leer, mit Codes, mit Fehler), 1280 und 320 Pixel, de und en.
// Startet selbst einen Vite-Server. Aufruf in app/:  node e2e/probe/3d-codes-axe.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({ root: APP, logLevel: 'error', server: { port: Number(process.env.PORT || 4361), host: '127.0.0.1', strictPort: false } });
await server.listen();
const U = `http://127.0.0.1:${server.httpServer.address().port}/#fragebogen`;
const b = await chromium.launch();
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
let verstoesse = 0;
try {
  for (const breite of [1280, 320]) for (const sprache of ['de', 'en']) {
    const page = await (await b.newContext({ locale: sprache === 'de' ? 'de-DE' : 'en-US', viewport: { width: breite, height: 900 } })).newPage();
    page.on('pageerror', e => console.log('Seitenfehler:', e.message));
    await page.goto(U);
    await page.getByRole('button', { name: /Neuen Fragebogen anlegen|Create new questionnaire/ }).click();
    const abschnitt = page.locator('section.codes');
    await abschnitt.waitFor();
    const pruefe = async (zustand) => {
      const res = await new AxeBuilder({ page }).include('section.codes').withTags(TAGS).analyze();
      verstoesse += res.violations.length;
      console.log(`${breite} px, ${sprache}, ${zustand}: ${res.violations.length} Verstöße, ${res.incomplete.length} unklar`);
      for (const v of res.violations) console.log('   ', v.id, v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 120)));
      for (const v of res.incomplete) console.log('    unklar:', v.id, v.nodes.map(n => n.target.join(' ')).join(' ; ').slice(0, 200));
    };
    await pruefe('leer');
    await page.locator('#fb-codes-anzahl').fill('7');
    await abschnitt.getByRole('button', { name: /Codes erzeugen|Create codes/ }).click();
    await page.waitForSelector('table.ct tbody tr');
    console.log('   Zeilen:', await page.locator('table.ct tbody tr').count());
    await abschnitt.locator('table.ct tbody input[type=checkbox]').first().check();
    await pruefe('mit Codes');
    await page.locator('#fb-codes-anzahl').fill('abc');
    await abschnitt.getByRole('button', { name: /Codes erzeugen|Create codes/ }).click();
    await pruefe('mit Fehlermeldung');
    await page.close();
  }
} finally { await b.close(); await server.close(); }
console.log(`Verstöße gesamt: ${verstoesse}`);
process.exit(verstoesse ? 1 : 0);
