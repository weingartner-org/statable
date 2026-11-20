// B10: Sprunglink im Kontrastmodus - erster Tab-Stopp einer frisch geladenen Seite.
import { chromium } from '@playwright/test';
const U = `http://localhost:${process.env.PORT || 5321}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
for (const fc of ['none', 'active']) for (const sch of ['light', 'dark']) {
  const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, forcedColors: fc, colorScheme: sch })).newPage();
  await page.goto(U + '#fragebogen'); await page.waitForSelector('h1'); await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  const s = await page.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e), q = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), cls: e.className, outline: c.outlineStyle + ' ' + c.outlineWidth + ' ' + c.outlineColor, bg: c.backgroundColor, fg: c.color, border: c.borderStyle + ' ' + c.borderWidth, pos: c.position, x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; });
  console.log(fc, sch, JSON.stringify(s));
  ok(s.w > 40 && s.h > 15 && s.y >= 0 && s.x >= 0, `${fc}/${sch}: Sprunglink sichtbar`);
  ok((s.outline.startsWith('solid') && parseFloat(s.outline.split(' ')[1]) >= 2) || s.border.startsWith('solid'), `${fc}/${sch}: Umriss oder Rahmen`);
  await page.screenshot({ path: `C:/Users/johan/AppData/Local/Temp/skip-${fc}-${sch}.png`, clip: { x: 0, y: 0, width: 700, height: 160 } });
  await page.close();
}
await b.close(); process.exit(fehler ? 1 : 0);
