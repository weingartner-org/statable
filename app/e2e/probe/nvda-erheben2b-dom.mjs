// DOM-Erkundung der Vorschauseite (ohne NVDA, headless)
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ locale: 'de-DE' })).newPage();
await page.goto('http://127.0.0.1:4310/src/ausfuellen/vorschau.html', { waitUntil: 'load' }); await page.waitForTimeout(2500);
const dump = async (tag) => console.log('--- ' + tag + '\n' + await page.evaluate(() => {
  const o = []; const w = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) {
    if (/^(H1|H2|H3|BUTTON|INPUT|SELECT|TEXTAREA|TABLE|CAPTION|TH|FIELDSET|LEGEND|LABEL|OL|UL|LI|OUTPUT|A)$/.test(n.tagName) || n.getAttribute('role') || n.getAttribute('aria-live')) {
      const t = (n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      o.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.getAttribute('role') ? '[' + n.getAttribute('role') + ']' : '') + (n.type ? '(' + n.type + ')' : '') + (n.getAttribute('aria-describedby') ? ' d=' + n.getAttribute('aria-describedby') : '') + (n.getAttribute('aria-disabled') ? ' aria-disabled' : '') + ' "' + t + '"');
    }
  }
  return 'aktiv=' + document.activeElement?.tagName + '#' + document.activeElement?.id + '\n' + o.join('\n');
}));
await dump('Seite 1');
await page.getByRole('radio').first().check();
await page.getByRole('button', { name: /^Weiter$/ }).click(); await page.waitForTimeout(500);
await page.locator('input[type=number]').first().fill('30');
await page.getByRole('button', { name: /^Weiter$/ }).click(); await page.waitForTimeout(500);
await dump('Seite 3');
const rg = await page.getByRole('button', { name: /nach oben|nach unten|übernehmen/i }).first(); 
for (const n of ['Diese Reihenfolge übernehmen']) await page.getByRole('button', { name: n }).click().catch(() => {});
await page.getByRole('checkbox').first().check().catch(() => {});
await page.getByRole('button', { name: /^Weiter$/ }).click(); await page.waitForTimeout(500);
await dump('Seite 4 (nach Weiter)');
await browser.close();
