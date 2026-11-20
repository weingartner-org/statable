// DOM-Erkundung (ohne NVDA, headless) für die Abläufe 1 und 2. Aufruf: node e2e/probe/nvda-erheben1-dom.mjs <nextcloud|kobo>
import { chromium } from '@playwright/test';
import { join } from 'node:path';
const BASE = 'http://127.0.0.1:4212/';
const D = 'src/lib/testdaten/dienste/';
const was = process.argv[2] ?? 'nextcloud';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ locale: 'de-DE' });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'load' });
const feld = page.locator('label', { hasText: /Datei auswählen/ }).locator('input[type=file]');
await feld.setInputFiles((process.env.DATEI ?? join(process.cwd(), D, was === 'nextcloud' ? 'nextcloud/nextcloud-de.csv' : 'kobo/kobo-xml-eins-null.xlsx')));
await page.waitForTimeout(9000);
if (process.env.XLS) { await page.locator('input[type=file][aria-describedby=fb-xls-meld]').setInputFiles(process.env.XLS); await page.waitForTimeout(4000); console.log('MELDUNG: ' + await page.evaluate(() => document.getElementById('fb-xls-meld')?.innerText)); }
console.log(await page.evaluate(() => document.body.innerText.slice(0, 600)));
console.log('dialoge', await page.evaluate(() => document.querySelectorAll('dialog').length + ' offen=' + document.querySelectorAll('dialog[open]').length));
await page.screenshot({ path: 'C:/Users/johan/AppData/Local/Temp/e1.png' });
const dump = async () => console.log(await page.evaluate(() => {
  const dlg = document.querySelector('dialog[open]') ?? document.querySelector('main');
  const out = [];
  const w = document.createTreeWalker(dlg, NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (/^(H1|H2|H3|BUTTON|INPUT|SELECT|TEXTAREA|TABLE|CAPTION|TH|FIELDSET|LEGEND|LABEL|A)$/.test(n.tagName) || n.getAttribute('role') || n.getAttribute('aria-live')) {
      const t = (n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      out.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.getAttribute('role') ? '[' + n.getAttribute('role') + ']' : '') + (n.type ? '(' + n.type + ')' : '') + (n.getAttribute('aria-describedby') ? ' desc=' + n.getAttribute('aria-describedby') : '') + ' "' + t + '"' + (n.disabled ? ' DIS' : ''));
    }
  }
  return 'aktiv=' + (document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent || '').slice(0, 50)) + '\n' + out.join('\n');
}));
await dump();
console.log(await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].map((c) => c.checked + ' ' + (c.closest('label')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 500)).join('\n')));
await browser.close();
