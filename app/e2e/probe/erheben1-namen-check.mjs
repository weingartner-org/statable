// Erkundung: Haben die Kästchen im Dialog „Fragebogen erkannt“ einen Namen (Accessible Name)? Und Glossar-Knöpfe. PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#start'); await page.waitForTimeout(1200);
await page.locator('input[type=file]').first().setInputFiles('C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/msforms/msforms-en.xlsx');
await page.getByRole('heading', { name: /Fragebogen erkannt/ }).waitFor({ timeout: 10000 });
await page.waitForTimeout(600);
const boxen = page.locator('.fb input[type=checkbox]');
const n = await boxen.count();
const namen = [];
for (let i = 0; i < Math.min(n, 6); i++) {
  const x = boxen.nth(i);
  const name = await x.evaluate(e => ({ label: e.labels?.length ?? -1, labelText: (e.labels?.[0]?.innerText || '').slice(0, 60), aria: e.getAttribute('aria-label'), value: e.value }));
  namen.push(name);
}
console.log('KAESTCHEN', n, JSON.stringify(namen));
const per = await page.locator('.fb input[type=checkbox]').first().evaluate(e => e.closest('label')?.innerText?.slice(0, 80) ?? 'kein umschliessendes label');
console.log('UMSCHLIESSEND', per);
const snap = await page.locator('.fb').first().ariaSnapshot().catch(e => 'FEHLER ' + e.message.slice(0, 100));
console.log('ARIA-AUSZUG', snap.split('\n').filter(l => /checkbox|button|radio|textbox/.test(l)).slice(0, 14).join('\n'));
await b.close();
