// Diagnose zur Stufe-4-Prüfung (kein Befund an sich): klärt drei Fragen.
// 1. Warum erreicht der Tab-Durchlauf die Fachbegriff-Schaltflächen („Inhaltsanalyse“) nicht?
// 2. Wohin geht der Fokus, wenn man in der Rückfrage „Leitfaden entfernen“ mit Tab weiterspringt?
// 3. Welche Kontrast-Meldung meldet axe auf der leeren Seite?
// Aufruf aus app/:  node e2e/probe/erheben4-diagnose.mjs
import { starteBrowser, oeffne, T, sichern } from './erheben4-lib.mjs';
import AxeBuilder from '@axe-core/playwright';

const b = await starteBrowser();
const out = {};
try {
  // 3. axe auf der leeren Seite, mit Wartezeit
  {
    const { ctx, page } = await oeffne(b, { sprache: 'de', breite: 1280 });
    await page.waitForTimeout(2000);
    const ax = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    out.leerKontrast = ax.violations.map((v) => ({ id: v.id, knoten: v.nodes.slice(0, 3).map((n) => ({ ziel: n.target.join(' '), meldung: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 400), html: n.html.slice(0, 160) })) }));
    console.log('leer, axe nach 2 s:', JSON.stringify(out.leerKontrast, null, 1).slice(0, 1500));
    await ctx.close();
  }
  // 1. Fachbegriff-Schaltfläche „Inhaltsanalyse“ auf der Seite mit Leitfaden
  {
    const { ctx, page } = await oeffne(b, { sprache: 'de', breite: 1280 });
    await page.getByRole('button', { name: 'Neuer Leitfaden', exact: true }).click();
    await page.waitForTimeout(800);
    out.inhaltsanalyse = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'Inhaltsanalyse');
      if (!el) return 'nicht gefunden';
      const ketten = [];
      let e = el;
      while (e && e !== document.body) { const cs = getComputedStyle(e); ketten.push({ tag: e.tagName, id: e.id, cls: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 60), tabindex: e.getAttribute('tabindex'), inert: e.hasAttribute('inert'), ariaHidden: e.getAttribute('aria-hidden'), display: cs.display, visibility: cs.visibility, pe: cs.pointerEvents, hoehe: Math.round(e.getBoundingClientRect().height) }); e = e.parentElement; }
      const r = el.getBoundingClientRect();
      return { html: el.outerHTML.slice(0, 300), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], tabindex: el.getAttribute('tabindex'), disabled: el.disabled, ketten: ketten.slice(0, 7) };
    });
    console.log('Inhaltsanalyse:', JSON.stringify(out.inhaltsanalyse, null, 1).slice(0, 2500));
    await ctx.close();
  }
  // 2. Fokusweg in der Rückfrage (Leitfaden entfernen), 6 Tab-Schritte
  {
    const { ctx, page } = await oeffne(b, { sprache: 'de', breite: 1280 });
    await page.getByRole('button', { name: 'Neuer Leitfaden', exact: true }).click();
    await page.waitForTimeout(500);
    const knopf = page.getByRole('button', { name: 'Leitfaden entfernen', exact: true }).first();
    await knopf.focus();
    await knopf.click();
    await page.waitForTimeout(400);
    const wege = [];
    wege.push(await page.evaluate(() => `start: ${document.activeElement?.tagName} „${window.bfName(document.activeElement).slice(0, 40)}“ im Dialog ${!!document.activeElement?.closest('dialog[open]')}`));
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      wege.push(await page.evaluate(() => `Tab ${document.activeElement ? document.activeElement.tagName : 'null'} „${document.activeElement ? window.bfName(document.activeElement).slice(0, 40) : ''}“ im Dialog ${!!document.activeElement?.closest('dialog[open]')}`));
    }
    out.rueckfrageWeg = wege;
    console.log(wege.join('\n'));
    await ctx.close();
  }
} finally {
  await b.close();
  sichern('erheben4-diagnose.json', out);
}
