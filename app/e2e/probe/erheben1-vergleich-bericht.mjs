// Stufe 1, Prüfungen 2, 3, 4: „Fälle vergleichen“ (Passung, Meta-Inferenz, Fälle für Interviews) und Bericht („Integration“).
// Aufruf: PORT=4211 node e2e/probe/erheben1-vergleich-bericht.mjs
import { chromium } from '@playwright/test';
import { U, axe, tabDurchlauf, breite, ziele, seite, rec, LOG } from './erheben1-lib.mjs';

const b = await chromium.launch();

async function beispielOeffnen(page) {
  await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
  await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]')
    .getByRole('button', { name: /Öffnen und üben/ }).first().click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Rundgang beenden' }).click({ timeout: 3000 }).catch(() => rec({ typ: 'schritt', ort: 'Beispiel', ok: false, text: 'kein Rundgang zu beenden' }));
  await page.waitForTimeout(600);
}

/** Die Karte „Fälle vergleichen“ im Baukasten (#blatt/neu) durchklicken: Zahlen wählen, Aussagen wählen, Fertig. */
async function vergleichBauen(page, ort) {
  await page.goto(U + '#blatt/neu'); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Fälle vergleichen/ }).first().click(); await page.waitForTimeout(3000);
  for (const frage of [/Welche Zahlen oder Gruppen/, /Welche Aussagen sollen/]) {
    const knopf = page.getByRole('button', { name: frage }).first();
    if (!await knopf.count()) { rec({ typ: 'schritt', ort, ok: false, text: 'Schaltfläche fehlt: ' + frage }); return false; }
    // Beobachtung der Vorprobe: der erste Klick nach dem Öffnen der Karte wirkt nicht; beim zweiten öffnet sich die Auswahl.
    for (let v = 0; v < 3; v++) { await knopf.click(); await page.waitForTimeout(800); if (await knopf.getAttribute('aria-expanded') === 'true') { rec({ typ: 'schritt', ort, ok: true, text: 'Lücke „' + frage + '“ offen nach Klick ' + (v + 1) }); break; } }
    const eingabe = page.locator('#wahl input[type=checkbox], #wahl input[type=radio]').first();
    if (!await eingabe.count()) { rec({ typ: 'schritt', ort, ok: false, text: 'keine Auswahl unter ' + frage }); return false; }
    await eingabe.check(); await page.waitForTimeout(400);
    const fertig = page.getByRole('button', { name: /^Fertig \(/ }).first();
    if (await fertig.count()) { await fertig.click().catch(() => {}); await page.waitForTimeout(700); }
  }
  await page.waitForTimeout(1500);
  rec({ typ: 'schritt', ort, ok: true, text: 'Baukasten durchlaufen; URL ' + page.url() });
  return true;
}

async function vergleichOeffnen(page, ort) {
  // Das Blatt (Art: Fälle vergleichen) ist danach ein Reiter der Auswertung: #blatt/<id>
  let href = await page.evaluate(() => { const a = [...document.querySelectorAll('a[href^="#blatt/"]')].find(x => /Zitate|Fälle|Zahlen und/.test(x.innerText)); return a ? a.getAttribute('href') : null; });
  if (!href) { await vergleichBauen(page, ort); href = await page.evaluate(() => { const a = [...document.querySelectorAll('a[href^="#blatt/"]')].find(x => /Zitate|Fälle|Zahlen und/.test(x.innerText)); return a ? a.getAttribute('href') : null; }); }
  rec({ typ: 'schritt', ort, ok: !!href, text: 'Reiter des Blatts: ' + href });
  if (!href) return false;
  await page.goto(U + href); await page.waitForTimeout(1800);
  const abschnitt = await page.locator('section.faelle').count();
  rec({ typ: 'schritt', ort, ok: abschnitt > 0, text: 'Abschnitt section.faelle: ' + abschnitt + ' (URL ' + page.url() + ')' });
  return abschnitt > 0;
}

// ---------- Prüfung 2 und 3: Fälle vergleichen ----------
{
  const page = await seite(b);
  await beispielOeffnen(page);
  const ort = 'Fälle vergleichen (Praktikum)';
  if (await vergleichOeffnen(page, ort)) {
    await axe(page, ort, 'Zustand: Ansicht geöffnet');
    await tabDurchlauf(page, 'section.faelle', ort + ' Tab');
    // Passung: Radio-Gruppe mit Pfeiltasten
    const gruppe = page.locator('fieldset.passung').first();
    const n = await gruppe.count();
    rec({ typ: 'schritt', ort, ok: n > 0, text: 'Passung-Gruppen gefunden: ' + n });
    if (n) {
      const namen = await gruppe.locator('input[type=radio]').evaluateAll(xs => xs.map(x => (x.closest('label')?.innerText || x.value).trim()));
      const vorher = await gruppe.locator('input[type=radio]:checked').count();
      await gruppe.locator('input[type=radio]').first().focus();
      const folge = [];
      for (let k = 0; k < 3; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300); folge.push(await page.evaluate(() => { const e = document.activeElement; return e?.type === 'radio' ? (e.closest('label')?.innerText || e.value).trim() + (e.checked ? ' (gewählt)' : '') : 'Fokus: ' + e?.tagName; })); }
      rec({ typ: 'pfeil', ort, gruppe: namen, gewaehlt_vorher: vorher, nach_ArrowDown: folge, text: 'Pfeil unten dreimal' });
      await axe(page, ort, 'Zustand: Passung-Radio mit Pfeiltasten geändert');
    }
    // Meta-Inferenz
    const meta = page.locator('textarea[id^="gm-"]');
    rec({ typ: 'schritt', ort, ok: await meta.count() > 0, text: 'Meta-Inferenz-Textfelder: ' + await meta.count() });
    await breite(page, ort + ' 1280');
    await ziele(page, ort, 'section.faelle');
    // Fälle für Interviews
    const auswahl = page.locator('details.auswahl').first();
    await auswahl.locator(':scope > summary').click(); await page.waitForTimeout(400);
    rec({ typ: 'schritt', ort, ok: true, text: 'Abschnitt „Fälle für Interviews vorschlagen“ aufgeklappt' });
    for (const regel of [/einflussreich/i, /divers/i]) {
      const r = auswahl.getByRole('radio', { name: regel }).first();
      if (!await r.count()) { rec({ typ: 'schritt', ort, ok: false, text: 'Regel ' + regel + ' nicht gefunden' }); continue; }
      await r.check().catch(e => rec({ typ: 'schritt', ort, ok: false, text: 'Regel ' + regel + ' nicht wählbar: ' + e.message.slice(0, 80) }));
      await page.waitForTimeout(500);
      const knoepfe = await auswahl.getByRole('button').allInnerTexts();
      rec({ typ: 'schritt', ort, ok: true, text: 'Regel ' + regel + ' gewählt; Knöpfe im Abschnitt: ' + JSON.stringify(knoepfe.filter(x => x.trim()).slice(0, 12)) });
      const vor = auswahl.getByRole('button', { name: /Vorschl|Erzeug|Zeig|Auswählen|berechn/i }).first();
      if (await vor.count()) { await vor.click().catch(() => {}); await page.waitForTimeout(1200); rec({ typ: 'schritt', ort, ok: true, text: 'Vorschläge erzeugt über „' + (await vor.innerText()).trim() + '“ (Regel ' + regel + ')' }); }
      else rec({ typ: 'schritt', ort, ok: false, text: 'kein Vorschlag-Knopf bei Regel ' + regel });
      await axe(page, ort, 'Zustand: Fälle für Interviews, Regel ' + regel);
      await tabDurchlauf(page, 'details.auswahl', ort + ' Tab Regel ' + regel);
    }
  }
  await page.context().close();
}

// Prüfung 2 bei 320 px und forced-colors
for (const [label, opt] of [['320 px', { breite: 320 }], ['forced-colors', { forced: true }]]) {
  const ctx = opt.forced ? await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, forcedColors: 'active' }) : null;
  const page = ctx ? await ctx.newPage() : await seite(b, opt.breite);
  await beispielOeffnen(page);
  const ort = 'Fälle vergleichen (Praktikum, ' + label + ')';
  if (await vergleichOeffnen(page, ort)) {
    if (opt.breite) { await breite(page, ort); await ziele(page, ort, 'section.faelle'); await axe(page, ort, 'Zustand: 320 px'); }
    else {
      const d = await page.evaluate(() => { const out = { n: 0, ohne: [] }; for (const e of document.querySelectorAll('section.faelle input[type=radio],section.faelle input[type=checkbox],section.faelle button,section.faelle textarea,section.faelle select')) { const r = e.getBoundingClientRect(); if (!r.width) continue; out.n++; const s = getComputedStyle(e); if (!((s.borderStyle !== 'none' && parseFloat(s.borderWidth) > 0) || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0))) out.ohne.push(e.tagName + '[' + e.type + '] ' + (e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/s+/g, ' ').trim().slice(0, 30)); } return out; });
      rec({ typ: 'forced', ort, bedienelemente: d.n, ohne_rahmen_oder_umriss: d.ohne.length, beispiele: d.ohne.slice(0, 6) });
      await axe(page, ort, 'Zustand: forced-colors');
    }
  }
  if (ctx) await ctx.close(); else await page.context().close();
}

// ---------- Prüfung 4: Bericht mit „Integration“ ----------
for (const [label, opt] of [['1280 px', {}], ['320 px', { breite: 320 }], ['forced-colors', { forced: true }]]) {
  const ctx = opt.forced ? await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, forcedColors: 'active' }) : null;
  const page = ctx ? await ctx.newPage() : await seite(b, opt.breite ?? 1280);
  await beispielOeffnen(page);
  await vergleichOeffnen(page, 'Bericht-Vorbereitung (' + label + ')');
  await page.goto(U + '#bericht'); await page.waitForTimeout(1800);
  const ort = 'Bericht (Praktikum, ' + label + ')';
  rec({ typ: 'schritt', ort, ok: true, text: 'URL ' + page.url() });
  await axe(page, ort, 'Zustand: vor dem Aufklappen');
  const sum = page.locator('details.integration > summary');
  rec({ typ: 'schritt', ort, ok: await sum.count() > 0, text: 'Block „Integration“ gefunden: ' + await sum.count() });
  if (await sum.count()) {
    await sum.first().click(); await page.waitForTimeout(400);
    await axe(page, ort, 'Zustand: Integration aufgeklappt');
    if (label === '1280 px') {
      await tabDurchlauf(page, 'main', ort + ' Tab (main)');
      await ziele(page, ort);
    }
    if (opt.breite) { await breite(page, ort); await ziele(page, ort); }
    if (opt.forced) {
      const d = await page.evaluate(() => { const out = { n: 0, ohne: [] }; for (const e of document.querySelectorAll('details.integration textarea,details.integration button,details.integration summary')) { const r = e.getBoundingClientRect(); if (!r.width) continue; out.n++; const s = getComputedStyle(e); if (!((s.borderStyle !== 'none' && parseFloat(s.borderWidth) > 0) || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0))) out.ohne.push(e.tagName + ' ' + (e.innerText || '').slice(0, 30)); } return out; });
      rec({ typ: 'forced', ort, bedienelemente: d.n, ohne_rahmen_oder_umriss: d.ohne.length, beispiele: d.ohne.slice(0, 6) });
    }
  }
  if (ctx) await ctx.close(); else await page.context().close();
}

await b.close();
console.log('FERTIG', LOG.length);
