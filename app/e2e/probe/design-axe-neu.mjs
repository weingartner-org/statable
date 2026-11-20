// axe für die neuen Teile: Einstellungen (mit Logo-Schalter) je Modus und die Druckansicht des Berichts (Fußmarke).
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const U = `http://127.0.0.1:${process.env.PORT || 5193}/`;
const druck = readFileSync(process.env.DRUCK, 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
const zeige = (n, r) => console.log(n, r.violations.length ? JSON.stringify(r.violations.map(v => [v.id, v.nodes.length, v.nodes[0].target.join(' ')])) : 'ok', '(bestanden ' + r.passes.length + ')');
for (const m of ['hell', 'dunkel', 'gs']) {
  await page.goto('about:blank'); await page.goto(U + '#einstellungen'); await page.waitForTimeout(1500);
  await page.evaluate(x => { document.documentElement.dataset.thema = x; }, m); await page.waitForTimeout(300);
  const sw = page.getByText('Statable-Logo klein unten in Diagrammen').first();
  console.log(m, 'Logo-Schalter sichtbar:', await sw.isVisible());
  zeige('Einstellungen ' + m, await new AxeBuilder({ page }).withTags(TAGS).analyze());
  // Schalter umlegen (aus) und noch einmal
  const cb = page.getByLabel(/Statable-Logo klein unten in Diagrammen/).first();
  if (await cb.count()) { await cb.click(); await page.waitForTimeout(300); zeige('Einstellungen ' + m + ' (Schalter umgelegt)', await new AxeBuilder({ page }).withTags(TAGS).analyze()); await cb.click(); }
}
await page.setContent(druck); await page.waitForTimeout(300);
zeige('Druckansicht', await new AxeBuilder({ page }).withTags(TAGS).analyze());
console.log('Fußmarke:', JSON.stringify(await page.evaluate(() => { const f = document.querySelector('footer.marke'); const s = f.querySelector('svg'); const t = f.querySelector('span'); const c = getComputedStyle(t); return { svgAriaHidden: s?.getAttribute('aria-hidden'), text: t.textContent, color: c.color, fontSize: c.fontSize, bg: getComputedStyle(document.body).backgroundColor }; })));
await page.emulateMedia({ media: 'print' }); zeige('Druckansicht (print)', await new AxeBuilder({ page }).withTags(TAGS).analyze());
await b.close();
