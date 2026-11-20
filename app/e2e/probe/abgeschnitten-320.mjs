import { chromium } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 320, height: 640 } }); const page = await ctx.newPage();
const U = 'http://127.0.0.1:4195/';
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const w of [320, 640]) {
  await page.setViewportSize({ width: w, height: 640 });
  for (const r of ['start', 'karte', 'einstellungen']) {
    await page.goto(U + '#' + r); await page.waitForTimeout(900);
    const l = await page.evaluate(() => Array.from(document.body.querySelectorAll('*')).filter(e => { const s = getComputedStyle(e); const x = ['hidden','clip'].includes(s.overflowX), y = ['hidden','clip'].includes(s.overflowY); if (!x && !y) return false; if (e.clientWidth <= 4 || e.clientHeight <= 4) return false; if (!(e.textContent||'').trim()) return false; const r = e.getBoundingClientRect(); if (!r.width) return false; return (x && e.scrollWidth > e.clientWidth + 1) || (y && e.scrollHeight > e.clientHeight + 1); }).map(e => `${e.tagName}.${e.className} sw=${e.scrollWidth}/${e.clientWidth} sh=${e.scrollHeight}/${e.clientHeight} ellipsis=${getComputedStyle(e).textOverflow} "${e.textContent.trim().slice(0,60)}"`));
    console.log(w, r, JSON.stringify(l));
  }
}
await b.close();
