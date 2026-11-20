// DOM-Erkundung ohne NVDA für Stufe-2-Messung: Überschriften der Ansicht „Gliederung und Bearbeiten“ (zwei Fragen mit Fehler)
import { chromium } from '@playwright/test';
const B = 'http://127.0.0.1:4222/';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const c = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
const p = await c.newPage();
const sl = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto(B + '#fragebogen', { waitUntil: 'load' }); await sl(1500);
await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await sl(500);
await p.locator('summary', { hasText: 'Vorlage einfügen' }).click();
await p.locator('details.vorlagen button.k', { hasText: 'Vorlage einfügen' }).click(); await sl(400);
await p.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sl(400);
console.log(await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.tagName + ' ' + h.textContent.trim().slice(0, 60)).join('\n')));
console.log(await p.evaluate(() => [...document.querySelectorAll('[role=tree],[role=treeitem],[role=listbox]')].length + ' tree/listbox-Elemente'));
await b.close();
