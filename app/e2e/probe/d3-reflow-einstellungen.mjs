// D3 (WCAG 1.4.10): Überlauf in den Einstellungen bei 320 px; zeigt Seitenbreite und Elemente, die über den Rand ragen.
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4198}/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 320, height: 640 } })).newPage();
await page.goto(U + '#einstellungen'); await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const doc = document.documentElement;
  const kurz = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const ragt = [];
  for (const e of document.body.querySelectorAll('*')) { const q = e.getBoundingClientRect(); if (q.width > 0 && q.right > innerWidth + 0.5) ragt.push(kurz(e) + ' rechts=' + q.right.toFixed(1)); }
  const karten = [...document.querySelectorAll('.ez-karte')].map(k => { const q = k.getBoundingClientRect(); return Math.round(q.left) + '..' + q.right.toFixed(1) + ' sw=' + k.scrollWidth + ' cw=' + k.clientWidth; });
  const ueber = []; for (const k of document.querySelectorAll('.ez-karte')) { const kr = k.getBoundingClientRect(); for (const e of k.querySelectorAll('*')) { const q = e.getBoundingClientRect(); if (q.width > 0 && q.right > kr.right + 0.5) ueber.push(kurz(e) + ' +' + (q.right - kr.right).toFixed(1) + ' ' + (e.textContent || '').trim().slice(0, 30)); } }
  return { ueberKarte: ueber.slice(0, 10), scrollWidth: doc.scrollWidth, innerWidth, ragt: ragt.slice(0, 12), karten };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
