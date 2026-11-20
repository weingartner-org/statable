// NVDA-Messung Stufe 3, Prüfplan A auf der Ausfüllseite (Link und Fragebogen-Datei) mit dem Beispielplan (seite-testplan.ts).
// Vorher: node e2e/probe/nvda-erheben3-vorbereiten.mjs. Aufruf: NVDA_PORT=4232 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben3-lauf.mjs <phase>
// Phasen: a1 (A1 A2 Einleitung Einwilligung Code Seite 1: A10 A3 A4 A5 A12 A11) | a2 (Seite 2: A8, A10; Seite 3: A9) | a3 (Seite 4 Block A6, Zusatzseite, Abschluss A13) | a3eng (A7 Handybreite)
//         a14 (Lesemodus Seite 1) | datei (Fragebogen-Datei file://: A1 A2 A6 A14) | en (englisch)
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = join(tmpdir(), 'n3-daten');
const LINK = readFileSync(join(DIR, 'link.txt'), 'utf8').trim();
const DATEI = pathToFileURL(join(DIR, 'Fragebogen-Datei.html')).href;
const phase = process.argv[2] ?? 'a1';

const OBS = `
window.__ansagen = window.__ansagen || [];
setInterval(() => { for (const e of document.querySelectorAll('[role=status],[aria-live],[role=alert]')) { if (!e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ text: e.textContent, rolle: e.getAttribute('role'), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }, 150);
`;
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6), tag);
const fokusDom = (page, tag) => dom(page, () => ({ fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? document.activeElement?.value ?? '').replace(/\s+/g, ' ').slice(0, 70), lang: document.documentElement.lang, titel: document.title }), tag);

async function laden(page, url = LINK) {
  await S.ctx.addInitScript(OBS);
  await page.goto(url, { waitUntil: 'load' }); await sleep(2500);
  await page.evaluate(() => { window.__ansagen = []; });
  await page.bringToFront(); await nachVorn();
}
const weiterP = (page) => page.locator('[data-weiter]').click();
async function bisSeite(page, n) { // Aufbau per Playwright: bis zur Seite n (1..5)
  await weiterP(page);
  await page.locator('[data-schritt="einwilligung"]').waitFor(); await page.locator('#einw').check(); await weiterP(page);
  await page.locator('[data-schritt="code"]').waitFor(); await page.locator('#code').fill('abcd-efgh'); await weiterP(page);
  await page.locator('[data-seite="auswahl"]').waitFor();
  if (n >= 2) {
    await page.getByRole('radio', { name: /^(Rot|Red)$/ }).check(); await page.getByRole('checkbox', { name: 'Radio', exact: true }).check(); await weiterP(page);
    await page.locator('[data-seite="felder"]').waitFor();
  }
  if (n >= 3) {
    await page.locator('[data-frage="Z"] input[type=number]').fill('42'); await weiterP(page);
    await page.locator('[data-seite="rang"]').waitFor();
  }
  if (n >= 4) {
    await page.getByRole('button', { name: /Diese Reihenfolge übernehmen|Keep this order/ }).click(); await weiterP(page);
    await page.locator('[data-seite="block"]').waitFor();
  }
  if (n >= 5) {
    for (const [id, w] of [['B1', 4], ['B2', 2], ['B3', 5]]) await page.locator(`input[data-item="${id}"][value="${w}"]`).check();
    await weiterP(page); await page.locator('[data-seite="zusatz"]').waitFor();
  }
  aufbau(`bis Seite ${n} per Playwright (Klicks, nicht gemessen)`);
  await page.bringToFront(); await nachVorn();
}
const PH = {};

PH.a1 = async (page) => {
  await laden(page);
  rec({ schritt: 'A1 Seite geladen', gesagt: await spoken(), z: await zustand() });
  await fokusDom(page, 'A1-dom');
  await C('A1 Titel (NVDA+T)', 'reportTitle').catch((e) => note('A1', String(e)));
  for (let i = 0; i < 4; i++) await K('A2 H', 'KeyH');
  await K('A2 Umschalt+H', 'Shift+KeyH');
  note('A2-dom Überschriften', await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 60)).join(' | ')));
  note('Landmarken-dom', await page.evaluate(() => [...document.querySelectorAll('header,main,nav,footer,[role=banner],[role=main],[role=contentinfo]')].map((e) => e.tagName + (e.getAttribute('aria-label') ? '[' + e.getAttribute('aria-label') + ']' : '')).join(' | ')));
  // Einleitung -> Einwilligung
  await bis('Einleitung: Tab bis Weiter', /"Weiter"/, { max: 15 });
  await K('Einleitung: Enter auf Weiter', 'Enter', { wait: 1500 });
  await fokusDom(page, 'Einwilligung-dom'); await ans(page, 'Einwilligung DOM-Ansagen');
  await C('Einwilligung: NVDA+Tab', 'reportCurrentFocus');
  // Fehlerfall Einwilligung
  await bis('Einwilligung: Tab bis Weiter', /"Weiter"/, { max: 8 });
  await K('Einwilligung (Fehlerfall): Enter auf Weiter ohne Haken', 'Enter', { wait: 1800 });
  await dom(page, () => ({ fokus: document.activeElement?.id, invalid: document.activeElement?.getAttribute('aria-invalid'), desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | '), alert: document.querySelector('[role=alert]')?.innerText }), 'Einwilligung-Fehler-dom');
  await C('Einwilligung (Fehler): NVDA+Tab', 'reportCurrentFocus');
  await K('Einwilligung: Leertaste (Haken)', 'Space');
  await bis('Einwilligung: Tab bis Weiter', /"Weiter"/, { max: 4 });
  await K('Einwilligung: Enter auf Weiter', 'Enter', { wait: 1500 });
  // Code
  await fokusDom(page, 'Code-dom');
  await C('Code: NVDA+Tab', 'reportCurrentFocus');
  await bis('Code: Tab bis Eingabefeld', /input#code/, { max: 6 });
  await C('Code-Feld: NVDA+Tab', 'reportCurrentFocus');
  await bis('Code: Tab bis Weiter', /"Weiter"/, { max: 4 });
  await K('Code (Fehlerfall): Enter auf Weiter, leer', 'Enter', { wait: 1800 });
  await dom(page, () => ({ fokus: document.activeElement?.id, invalid: document.activeElement?.getAttribute('aria-invalid'), desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | ') }), 'Code-Fehler-dom');
  await C('Code (Fehler): NVDA+Tab', 'reportCurrentFocus');
  await T('Code: abcd-efgh tippen', 'abcd-efgh', { wait: 1000 });
  await dom(page, () => ({ fokus: document.activeElement?.id, invalid: document.activeElement?.getAttribute('aria-invalid'), desc: document.activeElement?.getAttribute('aria-describedby') }), 'Code nach Tippen-dom');
  await bis('Code: Tab bis Weiter', /"Weiter"/, { max: 4 });
  await K('Code: Enter auf Weiter', 'Enter', { wait: 2000 });
  // Seite 1
  await fokusDom(page, 'A11 Seite 1 Fokus-dom'); await ans(page, 'A11 DOM-Ansagen Seite 1');
  note('Fortschritt-dom', await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Seite \d+ von \d+|Page \d+ of \d+/.test(e.textContent)).map((e) => e.tagName + ': ' + e.textContent.trim()).join(' | ')));
  await C('A11 NVDA+Tab (Fokus Seite 1)', 'reportCurrentFocus');
  // A10 Pflicht leer
  await bis('A10 Tab bis Weiter', /"Weiter"/, { max: 25 });
  await K('A10 Enter auf Weiter (Pflicht F1 leer)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert],[data-fehlerliste]')?.innerText, fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? '').slice(0, 80), invalidFS: [...document.querySelectorAll('[aria-invalid=true]')].map((e) => e.tagName + ':' + (e.getAttribute('aria-describedby') ?? '')) }), 'A10-dom');
  await C('A10 NVDA+Tab', 'reportCurrentFocus');
  await K('A10 Tab: erster Link der Zusammenfassung', 'Tab');
  await K('A10 Enter auf Sprunglink', 'Enter', { wait: 1500 });
  await C('A10 NVDA+Tab nach Sprung', 'reportCurrentFocus');
  await dom(page, () => ({ fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.closest('label')?.textContent ?? document.activeElement?.textContent ?? '').slice(0, 50), fsInvalid: document.activeElement?.closest('fieldset')?.getAttribute('aria-invalid'), fehlertext: [...document.querySelectorAll('[id$=-fehler]')].map((e) => e.id + '=' + e.textContent).join(' | ') }), 'A10-nach-Sprung-dom');
  // A3/A4 Einfachauswahl
  await K('A4 Pfeil unten', 'ArrowDown'); await K('A4 Pfeil unten', 'ArrowDown'); await K('A4 Pfeil unten', 'ArrowDown');
  await K('A4 Pfeil unten (Anders)', 'ArrowDown', { wait: 1500 });
  await ans(page, 'A12 DOM-Ansagen nach Wahl „Anders“');
  await K('A4 Pfeil oben', 'ArrowUp'); await K('A4 Pfeil oben', 'ArrowUp'); await K('A4 Pfeil oben', 'ArrowUp', { wait: 1500 });
  await K('A4 Pfeil oben auf Rot (Filter: Zusatzseite)', 'ArrowUp', { wait: 1800 });
  await ans(page, 'A12 DOM-Ansagen nach Wahl Rot');
  // A5 Mehrfachauswahl
  await bis('A5 Tab bis Mehrfachauswahl', /checkbox/, { max: 8 });
  await K('A5 Leertaste: erstes Kästchen', 'Space');
  await K('A5 Tab', 'Tab'); await K('A5 Leertaste', 'Space');
  note('A5-Hinweis', 'Beispielplan hat keine „Nichts davon“-Option; ausschließende Antwort hier nicht messbar (in Stufe 2 gemessen).');
  // A11 Seitenwechsel
  await bis('A11 Tab bis Weiter', /"Weiter"/, { max: 10 });
  await K('A11 Enter auf Weiter', 'Enter', { wait: 2200 });
  await fokusDom(page, 'A11-dom Seite 2'); await ans(page, 'A11 DOM-Ansagen');
  await C('A11 NVDA+Tab', 'reportCurrentFocus');
  await K('A11 H: Seitenüberschrift', 'KeyH');
};

PH.a2 = async (page) => {
  await laden(page); await bisSeite(page, 2);
  await fokusDom(page, 'Seite 2 Fokus-dom');
  await K('A8 H', 'KeyH');
  await bis('A10 Tab bis Weiter (Pflichtzahl leer)', /"Weiter"/, { max: 20 });
  await K('A10 Enter auf Weiter (Pflichtzahl leer)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert],[data-fehlerliste]')?.innerText, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60) }), 'A10-dom');
  await C('A10 NVDA+Tab', 'reportCurrentFocus');
  await K('A10 Tab: Sprunglink', 'Tab'); await K('A10 Enter', 'Enter', { wait: 1500 });
  await C('A10 NVDA+Tab (Feld mit aria-invalid)', 'reportCurrentFocus');
  await dom(page, () => ({ invalid: document.activeElement?.getAttribute('aria-invalid'), desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | ') }), 'A10-dom Feld');
  await T('Zahl 42 tippen', '42', { wait: 1000 });
  await K('Tab: Text', 'Tab');
  await T('Beruf tippen', 'Lehrerin', { wait: 800 });
  await K('Tab: Datum', 'Tab'); await C('Datumsfeld NVDA+Tab', 'reportCurrentFocus');
  // A8 Regler
  await bis('A8 Tab bis Regler', /range/, { max: 8 });
  await C('A8 NVDA+Tab', 'reportCurrentFocus');
  await K('A8 Pfeil rechts', 'ArrowRight'); await K('A8 Pfeil rechts', 'ArrowRight'); await K('A8 Pfeil links', 'ArrowLeft'); await K('A8 Ende', 'End');
  await K('A8 Tab: Zahlenfeld', 'Tab');
  await T('A8 Zahl tippen: 4', '4', { wait: 1000 });
  await dom(page, () => [...document.querySelectorAll('input[type=range]')].map((r) => r.value + '/' + r.max + ' valuetext=' + (r.getAttribute('aria-valuetext') ?? '')), 'A8-dom Reglerwerte');
  await bis('A11 Tab bis Weiter', /"Weiter"/, { max: 6 });
  await K('A11 Enter auf Weiter', 'Enter', { wait: 2200 });
  // Seite 3 Rangfolge A9
  await fokusDom(page, 'Seite 3 Fokus-dom');
  await K('A9 H', 'KeyH');
  await bis('A9 Tab bis erster Knopf nach oben/unten', /button/, { max: 6 });
  await C('A9 NVDA+Tab', 'reportCurrentFocus');
  await K('A9 Tab', 'Tab'); await K('A9 Tab', 'Tab');
  await K('A9 Enter (nach unten/oben)', 'Enter', { wait: 1500 });
  await ans(page, 'A9 DOM-Ansagen');
  await dom(page, () => ({ fokus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent, liste: [...document.querySelectorAll('ol li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)) }), 'A9-dom Liste');
  await K('A9 Enter nochmals', 'Enter', { wait: 1500 });
  await ans(page, 'A9 DOM-Ansagen 2');
  await dom(page, () => ({ fokus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent }), 'A9-dom Fokus nach 2. Druck');
  await bis('A9 Tab bis „Diese Reihenfolge übernehmen“', /übernehmen/, { max: 12 });
  await K('A9 Enter: übernehmen', 'Enter', { wait: 1500 });
  await ans(page, 'A9 DOM-Ansagen übernehmen');
};

PH.a3 = async (page) => {
  await laden(page); await bisSeite(page, 4);
  await fokusDom(page, 'Seite 4 Fokus-dom');
  await K('A6 H', 'KeyH');
  await C('A6 NVDA+Tab', 'reportCurrentFocus');
  note('A6-dom Tabelle', await page.evaluate(() => { const t = document.querySelector('table'); return t ? { caption: t.querySelector('caption')?.textContent, kopf: [...t.querySelectorAll('th')].map((h) => h.getAttribute('scope') + ':' + h.textContent.trim().slice(0, 25)).join(' | '), radioName: t.querySelector('input')?.getAttribute('aria-labelledby') } : 'keine Tabelle'; }));
  await K('A6 Tab', 'Tab');
  await bis('A6 Tab bis Optionsknopf in der Tabelle', /radio/, { max: 12 });
  await C('A6 NVDA+Tab', 'reportCurrentFocus');
  await K('A6 Pfeil rechts', 'ArrowRight'); await K('A6 Pfeil rechts', 'ArrowRight');
  await K('A6 Pfeil unten (nächste Zeile)', 'ArrowDown'); await K('A6 Pfeil unten', 'ArrowDown');
  await K('A6 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown'); await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await bis('A10 Tab bis Weiter', /"Weiter"/, { max: 20 });
  await K('A10 Enter auf Weiter (Block unvollständig)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert],[data-fehlerliste]')?.innerText, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60) }), 'A10 Block-dom');
  for (const [id, w] of [['B1', 4], ['B2', 2], ['B3', 5]]) await page.locator(`input[data-item="${id}"][value="${w}"]`).check();
  aufbau('Block per Playwright ausgefüllt');
  await bis('Tab bis Weiter', /"Weiter"/, { max: 25 });
  await K('Enter auf Weiter', 'Enter', { wait: 2200 });
  await fokusDom(page, 'Zusatzseite Fokus-dom');
  await K('Zusatzseite: Tab (Textfeld)', 'Tab'); await T('Zusatzseite: Text', 'weil Rot schön ist', { wait: 800 });
  await bis('Tab bis letzter Weiter/Abschicken', /"(Weiter|Abschicken|Fertig)[^"]*"/, { max: 6 });
  await K('A13 Enter auf letzten Weiter', 'Enter', { wait: 3500 });
  // A13 Abschluss
  await fokusDom(page, 'A13 Abschluss Fokus-dom'); await ans(page, 'A13 DOM-Ansagen Abschluss');
  await C('A13 NVDA+Tab (Fokus)', 'reportCurrentFocus');
  note('A13-dom Aufbau', await page.evaluate(() => JSON.stringify({ h: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ' ' + h.textContent.trim()), wege: [...document.querySelectorAll('[data-weg]')].map((b) => b.tagName + ' ' + b.textContent.trim() + ' desc=' + document.getElementById(b.getAttribute('aria-describedby'))?.textContent.slice(0, 50)), qr: [...document.querySelectorAll('svg')].map((s) => (s.getAttribute('role') ?? '-') + ' ' + (s.getAttribute('aria-label') ?? s.querySelector('title')?.textContent ?? '(kein Name)')), rueck: [...document.querySelectorAll('.rueck button')].map((b) => b.textContent.trim()) })));
  await K('A13 Pfeil unten (lesen)', 'ArrowDown'); await K('A13 Pfeil unten', 'ArrowDown'); await K('A13 Pfeil unten', 'ArrowDown');
  await bis('A13 Tab bis „Antwort als Datei speichern“', /Datei speichern/, { max: 8 });
  await C('A13 NVDA+Tab (Knopf Datei)', 'reportCurrentFocus');
  await K('A13 Enter: Datei speichern', 'Enter', { wait: 2500 });
  await ans(page, 'A13 DOM-Ansagen nach Datei'); await dom(page, () => document.querySelector('[data-rueckmeldung]')?.textContent, 'A13 Rückmeldung-dom nach Datei');
  await nachVorn();
  await bis('A13 Tab bis „Antwort-Text kopieren“', /Text kopieren/, { max: 6 });
  await K('A13 Enter: Text kopieren', 'Enter', { wait: 2500 });
  await ans(page, 'A13 DOM-Ansagen nach Text'); await dom(page, () => document.querySelector('[data-rueckmeldung]')?.textContent, 'A13 Rückmeldung-dom nach Text');
  await K('A13 Tab', 'Tab'); await K('A13 Tab', 'Tab'); await K('A13 Tab', 'Tab'); await K('A13 Tab', 'Tab');
};

PH.a3eng = async (page) => {
  await laden(page); await bisSeite(page, 4);
  const cdp = await S.ctx.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  note('A7-dom', await page.evaluate(() => JSON.stringify({ breite: innerWidth, tabelle: !!document.querySelector('table'), fieldsets: [...document.querySelectorAll('fieldset')].map((f) => f.querySelector('legend')?.textContent.trim().slice(0, 40)), h: [...document.querySelectorAll('h2,h3')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 50)) })));
  await page.bringToFront(); await nachVorn();
  await K('A7 H', 'KeyH');
  await bis('A7 Tab bis Optionsknopf', /radio/, { max: 12 });
  await C('A7 NVDA+Tab', 'reportCurrentFocus');
  await K('A7 Pfeil unten', 'ArrowDown'); await K('A7 Tab: nächste Gruppe', 'Tab'); await K('A7 Pfeil unten', 'ArrowDown');
};

PH.a14 = async (page) => {
  await laden(page); await bisSeite(page, 1);
  await K('A14 Strg+Pos1', 'Control+Home');
  for (let i = 1; i <= 26; i++) await K(`A14 Pfeil unten ${i}`, 'ArrowDown', { wait: 600 });
  note('A14-dom leere Elemente', await page.evaluate(() => [...document.querySelectorAll('button,a,[role=button]')].filter((e) => !(e.getAttribute('aria-label') || e.textContent || '').trim()).length + ' leere Knöpfe/Links'));
};

PH.datei = async (page) => {
  await laden(page, DATEI);
  rec({ schritt: 'A1 Datei geladen', gesagt: await spoken(), z: await zustand() });
  await fokusDom(page, 'A1-dom Datei');
  await C('A1 Titel (NVDA+T)', 'reportTitle').catch((e) => note('A1', String(e)));
  for (let i = 0; i < 4; i++) await K('A2 H', 'KeyH');
  note('A2-dom Überschriften', await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 60)).join(' | ')));
  await K('A14 Strg+Pos1', 'Control+Home');
  for (let i = 1; i <= 14; i++) await K(`A14 Pfeil unten ${i}`, 'ArrowDown', { wait: 600 });
  await weiterP(page);
  await page.locator('#einw').check(); await weiterP(page);
  await page.locator('#code').fill('abcd-efgh'); await weiterP(page);
  await page.locator('[data-seite="auswahl"]').waitFor();
  await page.getByRole('radio', { name: /Rot/ }).check(); await weiterP(page); await page.locator('[data-seite="felder"]').waitFor();
  await page.locator('[data-frage="Z"] input[type=number]').fill('42'); await weiterP(page); await page.locator('[data-seite="rang"]').waitFor();
  await page.getByRole('button', { name: /Diese Reihenfolge übernehmen/ }).click(); await weiterP(page); await page.locator('[data-seite="block"]').waitFor();
  aufbau('Datei: bis Block per Playwright'); await page.bringToFront(); await nachVorn();
  await K('A6 H', 'KeyH');
  await bis('A6 Tab bis Optionsknopf', /radio/, { max: 12 });
  await C('A6 NVDA+Tab', 'reportCurrentFocus');
  await K('A6 Pfeil rechts', 'ArrowRight'); await K('A6 Pfeil unten', 'ArrowDown'); await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
};

PH.abschluss = async (page) => { // QR-Code nie allein: Lesen des Abschnitts im Lesemodus
  await laden(page); await bisSeite(page, 4);
  for (const [id, w] of [['B1', 4], ['B2', 2], ['B3', 5]]) await page.locator(`input[data-item="${id}"][value="${w}"]`).check();
  await weiterP(page); await page.locator('[data-seite="zusatz"]').waitFor(); await weiterP(page);
  await page.locator('[data-weg="datei"]').waitFor(); await sleep(800);
  aufbau('bis zur Abschlussseite per Playwright');
  await page.locator('#qr-titel').evaluate((e) => { e.setAttribute('tabindex', '-1'); e.scrollIntoView(); e.focus(); });
  await page.bringToFront(); await nachVorn();
  await C('QR: NVDA+Tab (Überschrift)', 'reportCurrentFocus');
  for (let i = 0; i < 4; i++) await K('QR: Pfeil unten', 'ArrowDown', { wait: 800 });
  await K('G: nächste Grafik', 'KeyG', { wait: 1000 });
  await K('Umschalt+G', 'Shift+KeyG', { wait: 1000 });
  await K('Strg+Pos1', 'Control+Home');
  for (let i = 1; i <= 14; i++) await K(`A14 Pfeil unten ${i}`, 'ArrowDown', { wait: 600 });
};

PH.en = async (page) => {
  await laden(page, LINK);
  await page.locator('[data-sprache=en]').click(); await sleep(800);
  await page.bringToFront(); await nachVorn();
  await fokusDom(page, 'en-dom');
  await C('en Titel NVDA+T', 'reportTitle').catch(() => {});
  await K('en H', 'KeyH');
  await bis('en Tab bis Next', /"Next"/, { max: 15 });
  await K('en Enter', 'Enter', { wait: 1500 });
  await C('en NVDA+Tab', 'reportCurrentFocus');
};

if (!PH[phase]) { console.log('Phase unbekannt', phase); process.exit(2); }
await mitNvda(phase, PH[phase]);
