// Design-Messung Teil 2: Dialoge, leere Zustände, Fehlermeldungen; je Modus (hell, dunkel, gs) Stil per getComputedStyle + axe (WCAG 2.1 A/AA).
// Lauf: PORT=5193 node e2e/probe/design-messen.mjs   (Ergebnis: e2e/ergebnisse/design-messen.json). Nur Messen, schreibt nichts in die App.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import ExcelJS from 'exceljs';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const U = `http://127.0.0.1:${process.env.PORT || 5193}/`;
const MODI = (process.env.MODI || 'hell,dunkel,gs').split(',');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const out = { erstellt: new Date().toISOString(), modi: {} };

const wb = new ExcelJS.Workbook(); wb.addWorksheet('Eins').addRows([['a', 'b'], [1, 2]]); wb.addWorksheet('Zwei').addRows([['c', 'd'], [3, 4]]);
const zweiBlaetter = path.join(mkdtempSync(path.join(tmpdir(), 'statable-xlsx-')), 'zwei-blaetter.xlsx');
await wb.xlsx.writeFile(zweiBlaetter);

/** Läuft im Browser: misst Wurzel, Überschrift, Text, Knöpfe samt Abstand. */
function messeImSeite(sel) {
  const wurzel = document.querySelector(sel); if (!wurzel) return null;
  const st = (el, ...p) => { const c = getComputedStyle(el); const o = {}; for (const k of p) o[k] = c[k]; return o; };
  const schrift = (el) => st(el, 'fontFamily', 'fontSize', 'fontWeight', 'color');
  const sichtbar = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const r = {
    wurzel: { sel, ...st(wurzel, 'borderRadius', 'borderTopWidth', 'borderTopStyle', 'boxShadow', 'backgroundColor', 'paddingTop', 'paddingLeft', 'color', 'fontFamily', 'fontSize'), breite: Math.round(wurzel.getBoundingClientRect().width) },
  };
  const t = wurzel.querySelector('h1,h2,h3'); if (t) r.titel = { tag: t.tagName, ...schrift(t) };
  const p = wurzel.querySelector('p'); if (p) r.text = schrift(p);
  const kn = [...wurzel.querySelectorAll('button,a.k,label.k,.k')].filter(sichtbar);
  r.knoepfe = kn.slice(0, 8).map(b => ({ text: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 24), klasse: b.className.toString().slice(0, 30), ...st(b, 'borderRadius', 'fontFamily', 'fontSize', 'fontWeight', 'backgroundColor', 'color', 'paddingTop', 'paddingLeft', 'borderTopWidth') }));
  const lueck = [];
  for (let i = 1; i < kn.length; i++) { const a = kn[i - 1].getBoundingClientRect(), b = kn[i].getBoundingClientRect(); if (Math.abs(a.top - b.top) < 4) lueck.push(Math.round(b.left - a.right)); }
  r.knopfAbstand = lueck.slice(0, 6);
  // Abweichungen von den Regeln
  const abw = [];
  const ok = (v, liste) => liste.includes(v);
  if (!ok(r.wurzel.borderRadius, ['8px', '12px', '16px', '0px', '4px', '16px 16px 0px 0px', '999px'])) abw.push('Ecke Wurzel ' + r.wurzel.borderRadius);
  if (!/Atkinson/.test(r.wurzel.fontFamily)) abw.push('Schrift Wurzel ' + r.wurzel.fontFamily.slice(0, 30));
  if (r.titel && !/Atkinson/.test(r.titel.fontFamily)) abw.push('Schrift Titel ' + r.titel.fontFamily.slice(0, 30));
  if (r.titel && !ok(r.titel.fontWeight, ['600', '650'])) abw.push('Gewicht Titel ' + r.titel.fontWeight);
  for (const b of r.knoepfe) {
    if (!/Atkinson/.test(b.fontFamily)) abw.push('Schrift Knopf „' + b.text + '“ ' + b.fontFamily.slice(0, 30));
    if (!ok(b.borderRadius, ['8px', '999px', '50%', '12px', '0px'])) abw.push('Ecke Knopf „' + b.text + '“ ' + b.borderRadius);
    if (!ok(b.fontWeight, ['600', '650', '500', '400', '700'])) abw.push('Gewicht Knopf „' + b.text + '“ ' + b.fontWeight);
  }
  r.abweichungen = abw;
  return r;
}

async function snap(page, modus, name, sel, ergebnisse) {
  const eintrag = { name, sel };
  try {
    await page.evaluate(m => { document.documentElement.dataset.thema = m; }, modus); // die App setzt das Thema beim Öffnen von Daten zurück
    await page.waitForTimeout(400);
    eintrag.thema = await page.evaluate(() => document.documentElement.dataset.thema);
    eintrag.stil = await page.evaluate(messeImSeite, sel);
    if (!eintrag.stil) eintrag.fehler = 'Element nicht gefunden';
    const ax = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    eintrag.axe = ax.violations.map(v => ({ id: v.id, impact: v.impact, knoten: v.nodes.length, beispiel: v.nodes[0].target.join(' ').slice(0, 90), meldung: (v.nodes[0].any[0]?.message || v.nodes[0].all[0]?.message || '').slice(0, 120) }));
  } catch (e) { eintrag.fehler = String(e.message || e).slice(0, 200); }
  ergebnisse.push(eintrag);
  console.log(modus, name, eintrag.fehler || '', 'axe:', (eintrag.axe || []).map(a => a.id + '×' + a.knoten).join(',') || 'ok', eintrag.stil?.abweichungen?.length ? 'ABW:' + eintrag.stil.abweichungen.join(' | ') : '');
}
const zu = async (page) => { for (let i = 0; i < 3; i++) { if (!(await page.locator('dialog[open]').count())) break; await page.keyboard.press('Escape'); await page.waitForTimeout(250); } };
const NUR = process.env.NUR;
const versuche = async (name, f) => { if (NUR && name !== NUR) return; try { await f(); } catch (e) { console.log('  Schritt „' + name + '“ nicht möglich:', String(e.message || e).split('\n')[0].slice(0, 110)); } };

for (const modus of MODI) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const E = []; out.modi[modus] = E;
  const thema = async () => { await page.evaluate(m => { document.documentElement.dataset.thema = m; }, modus); };
  const gehe = async (h) => { await page.goto('about:blank'); await page.goto(U + h); await page.waitForTimeout(1200); await thema(); };

  // ---- ohne Daten ----
  await gehe('#start');
  await gehe('#start');
  await versuche('Fehlerdatei', async () => {
    await page.locator('label', { hasText: /Datei auswählen/ }).locator('input[type=file]').setInputFiles({ name: 'kaputt.csv', mimeType: 'text/csv', buffer: Buffer.alloc(0) });
    await page.waitForSelector('.meldung-karte', { timeout: 20000 }); await thema(); await snap(page, modus, 'Fehlerkarte leere Datei', '.meldung-karte', E);
  });
  await gehe('#start');
  await versuche('Melden', async () => { await page.getByRole('button', { name: /^Melden$/ }).first().click(); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Melden', 'dialog[open]', E); await zu(page); });
  await versuche('Palette', async () => { await page.keyboard.press('Control+k'); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Befehlspalette', 'dialog[open]', E); await page.keyboard.type('zzzzqqq'); await snap(page, modus, 'Befehlspalette ohne Treffer', 'dialog[open]', E); await zu(page); });
  await versuche('Kürzel', async () => { await page.keyboard.press('Alt+t'); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Tastenkürzel', 'dialog[open]', E); await zu(page); });
  await versuche('Meldungsverlauf', async () => { await page.keyboard.press('Alt+m'); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Meldungsverlauf (leer)', 'dialog[open]', E); await zu(page); });
  await versuche('LinkOeffnen', async () => { await page.goto(U + '?projekt=https://fremd.example/p.json'); await page.waitForSelector('dialog[open]', { timeout: 15000 }); await thema(); await snap(page, modus, 'Dialog Projekt per Link', 'dialog[open]', E); await zu(page); });
  await gehe('#start');
  await versuche('BlattWahl', async () => { await page.locator('label', { hasText: /Datei auswählen/ }).locator('input[type=file]').setInputFiles(zweiBlaetter); await page.waitForSelector('dialog[open]', { timeout: 20000 }); await thema(); await snap(page, modus, 'Dialog Blatt wählen (Excel)', 'dialog[open]', E); await page.keyboard.press('Escape'); await page.waitForTimeout(400); await zu(page); });
  await gehe('#bericht');
  await versuche('Bericht leer', async () => { await page.waitForSelector('.leer-zustand', { timeout: 5000 }); await snap(page, modus, 'Leerer Zustand Bericht', '.leer-zustand', E); });
  await gehe('#protokoll');
  await snap(page, modus, 'Seite Protokoll ohne Daten', 'main#inhalt', E);
  await gehe('#hilfe');
  await versuche('Hilfe-Suche', async () => { await page.fill('#hi-suche', 'qqqzzzxx'); await page.waitForTimeout(700); await snap(page, modus, 'Hilfe Suche ohne Treffer', 'main#inhalt', E); });
  await gehe('#lernen');
  await versuche('Lernen-Suche', async () => { await page.fill('#ls-feld', 'qqqzzzxx'); await page.waitForTimeout(700); await snap(page, modus, 'Lernen Suche ohne Treffer', 'main#inhalt', E); });
  await versuche('Lernen-Reset', async () => { await gehe('#lernen'); await page.getByRole('button', { name: /Stand zurücksetzen/ }).first().evaluate(b => b.click()); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Lernstand zurücksetzen', 'dialog[open]', E); await zu(page); });
  await gehe('#einstellungen');
  await snap(page, modus, 'Seite Einstellungen', 'main#inhalt', E);
  await versuche('Einstellungen-Schalter', async () => { const n = await page.getByText('Statable-Logo klein unten in Diagrammen').count(); console.log('  Schalter Logo vorhanden:', n); });

  // ---- mit Daten ----
  await gehe('#beispiele');
  await versuche('Beispiel öffnen', async () => {
    await page.getByRole('button', { name: /Öffnen und üben/ }).first().click();
    await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 40000 });
    await page.waitForSelector('.rundgang-blase', { timeout: 15000 }); await thema();
    await snap(page, modus, 'Rundgang-Blase', '.rundgang-blase', E);
    await page.getByRole('button', { name: 'Rundgang beenden' }).click(); await page.waitForTimeout(500);
  });
  await versuche('Daten leer-Zustände', async () => { await snap(page, modus, 'Seite Daten', 'main#inhalt', E); });
  await versuche('Fallgewicht', async () => { await page.getByRole('button', { name: /Daten bearbeiten/ }).first().click(); await page.getByRole('menuitem', { name: /Fallgewicht/ }).first().click({ timeout: 4000 }); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Fallgewicht', 'dialog[open]', E); await zu(page); });
  await versuche('DatenDiagramm', async () => { await page.getByRole('button', { name: /^Diagramm/ }).first().click(); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Diagramm aus Daten', 'dialog[open]', E); await zu(page); });
  await versuche('Suche in Daten ohne Treffer', async () => { const f = page.getByRole('searchbox').first(); if (await f.count()) { await f.fill('qqqzzzxx'); await page.keyboard.press('Enter'); await page.waitForTimeout(500); await snap(page, modus, 'Daten Suche ohne Treffer', 'main#inhalt', E); await f.fill(''); } });
  await versuche('Befehle falsch', async () => {
    await gehe('#befehle'); await page.locator('#syntax').click(); await page.keyboard.type('FOOBAR UNSINN.'); await page.keyboard.press('Control+Enter'); await page.waitForTimeout(3000);
    await snap(page, modus, 'Befehle mit falschem Befehl', 'main#inhalt', E); await snap(page, modus, 'Fehlerkarte falscher Befehl', '.meldung-karte', E);
  });
  await versuche('Meldungsverlauf voll', async () => { await page.keyboard.press('Alt+m'); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Meldungsverlauf (gefüllt)', 'dialog[open]', E); await zu(page); });
  await versuche('Blatt + Reiter schließen', async () => {
    await gehe('#blatt/neu'); await page.getByText('Wie verteilt sich etwas?').first().click(); await page.getByRole('button', { name: /alle wählen/ }).first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click();
    await page.waitForSelector('.reiter-zu', { timeout: 30000 }); await thema(); await page.waitForTimeout(1500);
    await snap(page, modus, 'Blatt mit Ergebnis (Meldungen/Hinweise)', 'main#inhalt', E);
    await page.locator('.reiter-zu').first().click(); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Reiter schließen', 'dialog[open]', E); await zu(page);
  });
  await versuche('Bericht Export', async () => { await gehe('#daten'); await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Export: Daten exportieren/ }).first().click({ timeout: 4000 }); await page.waitForTimeout(500); await snap(page, modus, 'Export-Menü Daten', '[role=menu]', E); await page.keyboard.press('Escape');
    const mi = page.locator('[role=menuitem]').filter({ hasText: /CSV/ }).first(); if (await mi.count()) { const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null); await page.getByRole('button', { name: /Export: Daten exportieren/ }).first().click(); await mi.click({ timeout: 4000 }); await dl; await page.waitForSelector('.toast', { timeout: 5000 }); await snap(page, modus, 'Toast (Meldung unten)', '.toast', E); } });
  await versuche('Projekt entfernen', async () => { await gehe('#start'); await page.locator('button[id^="pl-m-"]').first().click(); await page.getByRole('button', { name: /Aus dem Browser entfernen/ }).first().click(); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Projekt entfernen', 'dialog[open]', E); await zu(page); });
  await versuche('Begriff', async () => { await page.setViewportSize({ width: 480, height: 900 }); await gehe('#beispiele'); const w = page.locator('button.begriff-link').first(); await w.scrollIntoViewIfNeeded(); await w.click(); await page.waitForSelector('dialog[open]'); await snap(page, modus, 'Dialog Fachwort (schmal)', 'dialog[open]', E); await zu(page); });
  await b.close();
}
mkdirSync('e2e/ergebnisse', { recursive: true });
writeFileSync(NUR ? 'e2e/ergebnisse/design-messen-' + NUR + '.json' : 'e2e/ergebnisse/design-messen.json', JSON.stringify(out, null, 1));
console.log('fertig');
