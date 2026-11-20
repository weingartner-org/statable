// Welle 7D: abgeschnittene Elemente in der Datentabelle mit Textabstand (1.4.12) und Projektname bei 320 (1.4.10)
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4197}/`;
const CSS = `*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important}p,li,dd,h1,h2,h3,h4,h5,h6{margin-bottom:2em !important}`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const klemmt = () => page.evaluate(() => Array.from(document.body.querySelectorAll('*')).filter(e => { const s = getComputedStyle(e); const x = ['hidden', 'clip'].includes(s.overflowX), y = ['hidden', 'clip'].includes(s.overflowY); if (!x && !y) return false; if (e.clientWidth <= 4 || e.clientHeight <= 4 || !(e.textContent || '').trim()) return false; return (x && e.scrollWidth > e.clientWidth + 1) || (y && e.scrollHeight > e.clientHeight + 1); }).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' "' + e.textContent.trim().slice(0, 30) + '"'));
await page.goto(U + '#daten'); await page.waitForTimeout(1500);
const vor = await klemmt(); await page.addStyleTag({ content: CSS }); await page.waitForTimeout(500);
const nach = (await klemmt()).filter(k => !vor.includes(k));
console.log('daten neu abgeschnitten:', nach.length, JSON.stringify(nach));
await page.setViewportSize({ width: 320, height: 640 }); await page.goto(U + '#start'); await page.waitForTimeout(1200);
console.log('start 320:', JSON.stringify((await klemmt()).filter(k => /pl-/.test(k))));
await b.close();
