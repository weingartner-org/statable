// D5/D6 (WCAG 1.4.3, 2.5.3): axe color-contrast und label-content-name-mismatch auf allen Hauptrouten, je Thema.
// Aufruf: PORT=4199 THEMEN=hell,dunkel,sw node e2e/probe/d5-kontrast.mjs [regel]   (Standard: color-contrast; label-content-name-mismatch als Argument)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
const U = `http://127.0.0.1:${process.env.PORT || 4199}/`;
const REGEL = process.argv[2] || 'color-contrast';
const THEMEN = (process.env.THEMEN || 'hell,dunkel,sw,ws,sg,gs,gb').split(',');
const ROUTEN = ["start","beispiele","daten","spalten","umformen","karte","blatt","protokoll","befehle","bericht","einstellungen","hilfe","planen","verstehen","lernen","r-probe","impressum","datenschutz","behoerden","tabelle","amtlich","bearbeiten","blatt/neu","hilfe/daten-vorbereiten","hilfe/fallgewichte","hilfe/daten-seite","hilfe/daten-check","bearbeiten/umkodieren","bearbeiten/berechnen","bearbeiten/auswahl","bearbeiten/zusammen","lernen/thema/daten","lernen/pfad/grundlagen","lernen/thema/beschreiben","lernen/thema/verteilung","verstehen/verteilungen","verstehen/kennzahlen","verstehen/vergleich","verstehen/anteilstest"];
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const aus = {};
for (const t of THEMEN) {
  let knoten = 0, unklar = 0; const grund = {}; const proRoute = {}; const bsp = {};
  for (const r of ROUTEN) {
    await page.goto(U + '#' + r); await page.waitForTimeout(500);
    await page.evaluate(t => { document.documentElement.dataset.thema = t; }, t); await page.waitForTimeout(150); if (process.env.INJEKT) await page.addStyleTag({ content: process.env.INJEKT }); // Gegenprobe: absichtlich schlechtes CSS einspielen, die Messung muss dann rot werden
    const res = await new AxeBuilder({ page }).withRules([REGEL]).analyze();
    const v = res.violations[0]; const n = v ? v.nodes.length : 0;
    for (const x of res.incomplete) for (const k of x.nodes) { unklar++; const g = (k.any[0]?.data?.messageKey || k.any[0]?.message || '?') + (k.target.join(' ').includes('aria-hidden="true"') ? ' (aria-hidden)' : ''); grund[g] = (grund[g] || 0) + 1; }
    if (n) { proRoute[r] = n; knoten += n; for (const k of v.nodes.slice(0, 3)) (bsp[r] ||= []).push(k.target.join(' ') + ' | ' + (k.any[0]?.message || k.all[0]?.message || '').slice(0, 130)); }
  }
  console.log('  unklar nach Grund', JSON.stringify(grund)); aus[t] = { knoten, unklar, grund, proRoute, bsp };
  console.log(t, 'Knoten', knoten, 'unklar', unklar, 'Routen', Object.keys(proRoute).length);
}
writeFileSync(process.env.AUS || 'e2e/ergebnisse/d5-' + REGEL + '.json', JSON.stringify(aus, null, 1));
await b.close();
