// Vergleich: ragen Hilfe-Tabellen älterer Einheiten bei 320 px auch heraus? Aufruf: PORT=4295 node e2e/probe/bf-f4-vergleich-320.mjs
import { chromium } from '@playwright/test';
import { U, breite, seite } from './erheben1-lib.mjs';
const b = await chromium.launch();
const page = await seite(b, 320);
for (const e of ['transkription-genau', 'quali-quanti-paradigma', 'feinstruktur-spalten']) {
  await page.goto(U + '#lernen/' + e + '/1'); await page.waitForTimeout(1800);
  await breite(page, e);
}
await b.close();
