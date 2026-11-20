// Stufe 3, Diagnose zu Prüfung 4: Warum sind die Titelfelder „fb-titel-de/en“ per Tab nicht erreichbar? Nur Messung.
// Aufruf: BASIS=http://localhost:4231 node e2e/probe/erheben3-titel-diagnose.mjs
import { chromium } from '@playwright/test';
import { BASIS } from './erheben3-lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.getByRole('button', { name: /Neuen Fragebogen anlegen/ }).click();
await page.waitForTimeout(500);
const d = await page.evaluate(() => {
  const e = document.getElementById('fb-titel-de');
  if (!e) return 'kein Element';
  const s = getComputedStyle(e);
  const sperre = e.closest('[inert]') ? 'inert-Vorfahr' : (e.closest('details:not([open])') ? 'geschlossenes details' : 'keine');
  const r = e.getBoundingClientRect();
  return { sperre, tabIndex: e.tabIndex, disabled: e.disabled, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], display: s.display, visibility: s.visibility, vorfahr: e.closest('section')?.className?.toString().slice(0, 60) ?? '' };
});
console.log('DIAG', JSON.stringify(d));
await b.close();
