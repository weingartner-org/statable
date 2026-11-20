// Stufe 2, Befund B10 (Verdacht blockiert): Fragebogen planen im Kontrastmodus (forced-colors: active) von Hand pruefen.
// Prueft: (1) jede Eingabe hat einen Namen und ist erreichbar (nicht tabindex -1, nicht versteckt), (2) der Sprunglink hat beim Fokus einen sichtbaren Umriss, (3) jedes fokussierte Element hat einen sichtbaren Fokus.
// Aufruf: PORT=5321 node e2e/probe/2h-forced.mjs   (gegen `vite`)
import { chromium } from '@playwright/test';

const U = `http://localhost:${process.env.PORT || 5321}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
for (const fc of ['none', 'active']) {
  console.log('--- forcedColors', fc);
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, forcedColors: fc });
  const page = await ctx.newPage();
  await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
  await page.getByText('Vorlage einfügen').first().click();
  for (let i = 0; i < 2; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
  await page.getByRole('button', { name: 'Filter hinzufügen' }).click();
  await page.waitForTimeout(400);
  // 1) Eingaben ohne Namen, unerreichbare Eingaben
  const r = await page.evaluate(() => {
    const sicht = e => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && q.width > 0 && q.height > 0 && !e.closest('[hidden]'); };
    const namenlos = [], unerreicht = [];
    for (const e of document.querySelectorAll('input,select,textarea')) {
      if (e.type === 'hidden' || !sicht(e)) {
        // „nur-vorleser“ (1x1 px) zaehlt als sichtbar fuer Technik
        if (!e.classList.contains('nur-vorleser') && e.type !== 'hidden' && !e.closest('details:not([open])')) { /* verborgen: nicht pruefen */ }
      }
      const name = (e.getAttribute('aria-label') || (e.labels && [...e.labels].map(l => l.textContent).join(' ')) || e.getAttribute('aria-labelledby') || '').trim();
      if (!name && e.type !== 'hidden') namenlos.push(e.outerHTML.slice(0, 120));
      if (e.tabIndex < 0 && !e.disabled && e.type !== 'hidden') unerreicht.push(e.outerHTML.slice(0, 120));
    }
    return { namenlos, unerreicht, n: document.querySelectorAll('input,select,textarea').length };
  });
  ok(r.namenlos.length === 0, `keine Eingabe ohne Namen (${r.n} Eingaben)${r.namenlos.length ? ': ' + r.namenlos.join(' | ') : ''}`);
  ok(r.unerreicht.length === 0, `keine Eingabe unerreichbar${r.unerreicht.length ? ': ' + r.unerreicht.join(' | ') : ''}`);
  // 2) Sprunglink
  await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => { const e = document.activeElement; if (!e) return null; const s = getComputedStyle(e), q = e.getBoundingClientRect(); return { text: e.textContent.trim().slice(0, 40), cls: e.className, outline: s.outlineStyle + ' ' + s.outlineWidth, outlineColor: s.outlineColor, bg: s.backgroundColor, color: s.color, border: s.borderStyle + ' ' + s.borderWidth, w: Math.round(q.width), h: Math.round(q.height), x: Math.round(q.x), y: Math.round(q.y) }; });
  console.log('   erster Tab-Stopp:', JSON.stringify(skip));
  ok(!!skip && skip.w > 20 && skip.h > 10 && skip.y >= 0, 'Sprunglink ist beim Fokus sichtbar und liegt im Bild');
  ok(!!skip && (skip.outline.startsWith('solid') || skip.outline.startsWith('auto') || skip.border.startsWith('solid')), 'Sprunglink hat einen Umriss oder Rahmen');
  // 3) Tab-Durchlauf: jedes fokussierte Element hat Umriss/Rahmen/Schatten (in forced-colors sind Hintergruende und Schatten weg)
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click().catch(() => {});
  const ohne = [];
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const raus = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; return { k: e.tagName + (e.id ? '#' + e.id : '') + ' ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), raus, hat: s.outlineStyle !== 'none' || s.boxShadow !== 'none' }; });
    if (f && !f.hat) ohne.push(f.k);
  }
  ok(ohne.length === 0, `40 Tab-Stopps alle mit sichtbarem Fokus${ohne.length ? ': ' + ohne.join(' | ') : ''}`);
  await ctx.close();
}
await b.close();
console.log(fehler ? `${fehler} FEHLER` : 'alles ok');
process.exit(fehler ? 1 : 0);
