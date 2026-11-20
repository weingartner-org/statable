// Erheben 2 (Nachprüfung): nennt die konkreten Stellen aus dem Zustandslauf (kleine Ziele, Überlauf bei 320 px, Eingaben ohne Namen).
import { chromium } from '@playwright/test';
const PORT = process.env.PORT || 4221;
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/#fragebogen`); await p.waitForSelector('h1');
await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await p.getByText('Vorlage einfügen').first().click();
await p.selectOption('#fb-vorlage', 'zustimmung5');
await p.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await p.waitForTimeout(400);
const klein = await p.evaluate(() => [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24); }).slice(0, 40).map(e => {
  const r = e.getBoundingClientRect();
  const sec = e.closest('section,header,nav,aside,footer,form,details,div[class]');
  return `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} ${Math.round(r.width)}x${Math.round(r.height)} „${(e.getAttribute('aria-label') || e.innerText || e.value || '').trim().slice(0, 30)}“ in <${sec?.tagName.toLowerCase()} class="${String(sec?.className).slice(0, 40)}">  Eltern: ${e.parentElement?.className?.toString().slice(0, 50)}`;
}));
console.log('KLEIN'); console.log(klein.join('\n'));
const ohne = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).filter(e => !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length) || e.getAttribute('title'))).map(e => `${e.tagName.toLowerCase()}[${e.type}] id=${e.id} name=${e.name} klasse=${String(e.className).slice(0, 40)} rahmen=${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
console.log('OHNE NAMEN (sichtbar)'); console.log(ohne.join('\n'));
await p.setViewportSize({ width: 320, height: 800 });
await p.getByRole('button', { name: 'Antwortlisten' }).click(); await p.waitForSelector('table.opt'); await p.waitForTimeout(400);
const ueber = await p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 && r.width > 0; }).slice(0, 12).map(e => { const r = e.getBoundingClientRect(); let p = e.parentElement, geschuetzt = []; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o !== 'visible') geschuetzt.push(p.tagName.toLowerCase() + '.' + String(p.className).slice(0, 30) + ':' + o); p = p.parentElement; } return `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} rechts=${Math.round(r.right)} breite=${Math.round(r.width)} | geschützt durch: ${geschuetzt.slice(0, 2).join(', ') || 'nichts'}`; }); });
console.log('UEBERLAUF 320 px, Antwortlisten, scrollBreite=' + await p.evaluate(() => document.documentElement.scrollWidth)); console.log(ueber.join('\n'));
await b.close();
