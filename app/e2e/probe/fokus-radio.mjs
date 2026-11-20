import { chromium } from '@playwright/test';
const U = 'http://127.0.0.1:4195/';
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
await page.goto(U + '#verstehen/kennzahlen'); await page.waitForTimeout(1500);
await page.evaluate(() => { const b = document.body; b.setAttribute('tabindex','-1'); b.focus(); b.blur(); b.removeAttribute('tabindex'); });
for (let i = 0; i < 80; i++) { await page.keyboard.press('Tab');
  const t = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); if (e.tagName === 'INPUT' && s.outlineColor === 'rgba(0, 0, 0, 0)') { const r = e.getBoundingClientRect(); return { typ: e.type, cls: e.className, outlineColor: s.outlineColor, rect: [r.x, r.y, r.width, r.height], parent: e.parentElement?.tagName + '.' + e.parentElement?.className, pstyle: (() => { const p = getComputedStyle(e.parentElement); return p.outlineStyle + ' ' + p.boxShadow.slice(0, 60); })() }; } return null; });
  if (t) { console.log(JSON.stringify(t)); await page.screenshot({ path: 'e2e/ergebnisse/fokus-radio.png', clip: { x: Math.max(0, t.rect[0] - 40), y: Math.max(0, t.rect[1] - 30), width: 400, height: 90 } }); break; } }
await b.close();
