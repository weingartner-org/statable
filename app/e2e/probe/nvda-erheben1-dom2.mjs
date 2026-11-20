// DOM-Erkundung (headless) Abläufe 3 bis 5
import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:4212/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ locale: 'de-DE' })).newPage();
await page.goto(BASE + '#beispiele', { waitUntil: 'load' }); await page.waitForTimeout(1500);
const karte = page.locator('*:has-text("Praktikum im Lehramt")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 60000 });
const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
await page.goto(BASE + '#blatt/neu', { waitUntil: 'load' }); await page.waitForTimeout(1500);
await page.getByText(/Wie passen Zahlen und Aussagen zusammen/).first().click(); await page.waitForTimeout(1500);
await page.getByText('Schulform schulform').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await page.waitForTimeout(1500);
await page.getByText('Interviewzitat interview').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await page.waitForTimeout(4000);
await page.getByText('Fälle für Interviews vorschlagen').first().click(); await page.waitForTimeout(500);
const sec = async (tag) => console.log('--- ' + tag + '\n' + await page.evaluate(() => {
  const d = [...document.querySelectorAll('details')].find((x) => x.querySelector('summary')?.textContent.includes('Interviews'));
  const o = []; const w = document.createTreeWalker(d, NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) {
    if (/^(H3|H4|BUTTON|INPUT|SELECT|TEXTAREA|TABLE|CAPTION|TH|FIELDSET|LEGEND|LABEL|P)$/.test(n.tagName) || n.getAttribute('role') || n.getAttribute('aria-live')) {
      const t = (n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      o.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.getAttribute('role') ? '[' + n.getAttribute('role') + ']' : '') + (n.type ? '(' + n.type + ')' : '') + (n.checked ? ' CHECKED' : '') + ' "' + t + '"');
    }
  }
  return o.join('\n');
}));
await sec('Interviews offen');
await page.getByText('diverse Fälle').first().click(); await page.waitForTimeout(1500);
await sec('divers gewählt');
await page.getByText('einflussreiche Fälle').first().click(); await page.waitForTimeout(1500);
await sec('einflussreich gewählt');
await browser.close();
