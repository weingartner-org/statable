// Stufe 2: Reflow bei 320 px (Seite scrollt nicht waagrecht), Zielgroesse (mind. 24 px), axe in allen Zustaenden, jeweils auch im Kontrastmodus.
// Aufruf: PORT=5321 node e2e/probe/2h-320.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const U = `http://localhost:${process.env.PORT || 5321}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
for (const fc of ['none', 'active']) {
  console.log('=== forcedColors', fc);
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, forcedColors: fc });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
  await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
  const ansicht = async (n) => { await page.getByRole('button', { name: n, exact: true }).click(); await page.waitForTimeout(400); };
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
  await page.getByText('Vorlage einfügen').first().click();
  for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
  await page.getByRole('button', { name: 'Filter hinzufügen' }).click();
  // Daten: A und B mit einer Abweichung
  await ansicht('Daten eingeben (Eingabemaske)'); await page.waitForSelector('.em .af');
  for (const [dg, w] of [['A', ['3', '3', '3']], ['B', ['3', '3', '4']]]) {
    await page.getByLabel('Doppeleingabe, Durchgang ' + dg).check();
    await page.fill('#fb-em-nr', '1'); await page.keyboard.press('Enter');
    for (const c of w) { await page.keyboard.press(c); if (c !== w.at(-1)) await page.keyboard.press('Enter'); }
    await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);
  }
  const zustaende = [
    ['Gliederung und Bearbeiten', async () => { await page.getByRole('button', { name: /Exportieren/ }).click(); await page.getByRole('button', { name: 'Neuer Fragebogen', exact: true }).focus(); }],
    ['Antwortlisten', null], ['Kodebuch', null], ['Daten eingeben (Eingabemaske)', null],
    ['Abgleich und Protokoll', async () => { await page.getByLabel(/Neuer Wert/).first().check(); }]
  ];
  for (const breit of [1400, 320]) {
    await page.setViewportSize({ width: breit, height: 900 });
    for (const [n, vor] of zustaende) {
      await ansicht(n); if (vor) await vor().catch(() => {});
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const sicht = e => { const q = e.getBoundingClientRect(), s = getComputedStyle(e); return q.width > 0 && q.height > 0 && s.visibility !== 'hidden' && !e.classList.contains('nur-vorleser') && !e.closest('.nur-vorleser') && !e.closest('[aria-hidden=true]'); };
        // Elemente, die eine eigene Scroll-Flaeche haben, dürfen breiter sein
        const klein = [];
        for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex="0"]')) {
          if (!sicht(e) || e.disabled) continue;
          const q = e.getBoundingClientRect();
          // Zeilen-Links im Fliesstext (inline) sind ausgenommen
          if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') continue;
          let w = q.width, h = q.height;
          if ((e.type === 'checkbox' || e.type === 'radio') && e.labels?.length) { for (const l of e.labels) { const r = l.getBoundingClientRect(); w = Math.max(w, r.width); h = Math.max(h, r.height); } }
          if (w < 24 || h < 24) klein.push(`${e.tagName}${e.id ? '#' + e.id : ''}.${(e.className + '').slice(0, 20)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 25)}" ${Math.round(w)}x${Math.round(h)}`);
        }
        return { seite: document.documentElement.scrollWidth - document.documentElement.clientWidth, klein };
      });
      ok(m.seite <= 0, `${breit} px, ${n}: Seite scrollt nicht waagrecht (Überlauf ${m.seite} px)`);
      if (breit === 1400) ok(m.klein.length === 0, `${n}: alle Ziele mindestens 24 px${m.klein.length ? ': ' + m.klein.slice(0, 6).join(' | ') : ''}`);
      else if (m.klein.length) console.log('      (320 px) kleine Ziele:', m.klein.slice(0, 4).join(' | '));
      if (breit === 320 && m.seite > 0) {
        const wer = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !e.closest('.rolle') && !e.classList.contains('nur-vorleser') && !e.closest('.nur-vorleser')).slice(0, 5).map(e => e.tagName + '.' + (e.className + '').slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().right)));
        console.log('      Ursache:', wer.join(' | '));
      }
      if (breit === 1400) {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        ok(r.violations.length === 0, `axe ${n}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(x => x.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
      }
    }
    if (breit === 1400) await page.setViewportSize({ width: 320, height: 900 });
  }
  await ctx.close();
}
await b.close();
console.log(fehler ? `${fehler} FEHLER` : 'alles ok');
process.exit(fehler ? 1 : 0);
