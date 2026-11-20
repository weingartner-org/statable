// D5: Ist color-contrast im emulierten Kontrastmodus (forced-colors: active) ein Messartefakt?
// Zählt axe-Knoten, vergleicht axe-Farben mit den vom Browser berechneten Farben (getComputedStyle) und rechnet das Verhältnis selbst.
// Aufruf: PORT=4199 node e2e/probe/d5-forced.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:${process.env.PORT || 4199}/`;
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const verh = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const b = await chromium.launch();
for (const fc of ['none', 'active']) {
  const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, forcedColors: fc, colorScheme: 'dark' })).newPage();
  await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
  let knoten = 0, echt = 0, probe = [];
  for (const r of ['start', 'beispiele', 'daten', 'spalten', 'hilfe', 'einstellungen', 'blatt']) {
    await page.goto(U + '#' + r); await page.waitForTimeout(700);
    const res = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const v = res.violations[0]; if (!v) continue;
    knoten += v.nodes.length;
    for (const n of v.nodes) {
      const d = n.any[0]?.data || {};
      // echte Browserfarben des Elements (im erzwungenen Modus Systemfarben)
      const c = await page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); let bg = s.backgroundColor, p = e; while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && p.parentElement) { p = p.parentElement; bg = getComputedStyle(p).backgroundColor; } return { fg: s.color, bg }; }, n.target.join(' ')).catch(() => null);
      const echtV = c ? verh(rgb(c.fg), rgb(c.bg)) : null; if (echtV !== null && echtV < 4.5) echt++;
      probe.push([r, n.target.join(' ').slice(0, 50), 'axe', d.fgColor, d.bgColor, d.contrastRatio, 'browser', c?.fg, c?.bg, echtV?.toFixed(2)]);
    }
  }
  console.log('forcedColors', fc, 'Knoten (6 Routen)', knoten, 'Stichprobe mit echtem Browser-Verhältnis unter 4,5:', echt);
  for (const p of probe.slice(0, 8)) console.log('  ', JSON.stringify(p));
  await page.close();
}
await b.close();
