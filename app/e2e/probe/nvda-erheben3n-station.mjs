// NVDA-Messung Stufe 3F: Erhebungsstation (#station). Vorher: node e2e/probe/nvda-erheben3-vorbereiten.mjs
// Aufruf: NVDA_PORT=4232 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben3-station.mjs
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn } from './nvda-erheben3n-lib.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = join(tmpdir(), 'n3-daten');
const BASE = `http://localhost:${process.env.NVDA_PORT ?? 4232}/`;
const OBS = `
window.__ansagen = window.__ansagen || [];
setInterval(() => { for (const e of document.querySelectorAll('[role=status],[aria-live],[role=alert]')) { if (!e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ text: e.textContent, rolle: e.getAttribute('role'), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }, 150);
`;
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-5), tag);
const fokusDom = (page, tag) => dom(page, () => ({ fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 70), inDialog: !!document.activeElement?.closest('dialog[open]') }), tag);

await mitNvda('station', async (page) => {
  await S.ctx.addInitScript(OBS);
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'station.statable-fragebogen.json'));
  await sleep(1000);
  await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
  await page.getByTestId('fb-versand-station').click();
  await page.waitForSelector('#st-t'); await sleep(800);
  aufbau('Plan geöffnet und Eintrag „Erhebungsstation öffnen“ per Playwright geklickt (nicht gemessen)');
  await page.evaluate(() => { window.__ansagen = []; });
  await page.bringToFront(); await nachVorn();
  await fokusDom(page, 'Ankunft-dom');
  await C('Start: NVDA+Tab', 'reportCurrentFocus');
  await K('Start: H', 'KeyH'); await K('Start: H', 'KeyH');
  await bis('Start: Tab bis „Station starten“', /Station starten|Start station/, { max: 12 });
  await K('Start: Enter', 'Enter', { wait: 2500 });
  await fokusDom(page, 'Nach Start-dom'); await ans(page, 'Nach Start DOM-Ansagen');
  await C('Nach Start: NVDA+Tab', 'reportCurrentFocus');
  // Person 1: A3, A10, A11
  await bis('P1 Tab bis Weiter', /"(Weiter|Beginnen)"/, { max: 12 });
  await K('P1 Enter Weiter', 'Enter', { wait: 1800 });
  await fokusDom(page, 'P1 Seite 1-dom');
  await C('P1 Seite 1: NVDA+Tab', 'reportCurrentFocus');
  await bis('P1 Tab bis Weiter (Seite 1)', /"(Weiter|Beginnen)"/, { max: 10 });
  await K('A10 Enter Weiter (Pflicht leer)', 'Enter', { wait: 1800 });
  await fokusDom(page, 'A10-dom'); await dom(page, () => document.querySelector('[role=alert],[data-fehlerliste]')?.innerText, 'A10 Zusammenfassung-dom');
  await K('A10 Tab: Sprunglink', 'Tab'); await K('A10 Enter', 'Enter', { wait: 1500 });
  await K('A3 Pfeil unten: Rot', 'ArrowDown');
  await K('A3 Pfeil unten: Grün', 'ArrowDown');
  await K('A3 Pfeil oben: Rot', 'ArrowUp');
  await bis('A11 Tab bis Weiter', /"(Weiter|Beginnen)"/, { max: 10 });
  await K('A11 Enter Weiter', 'Enter', { wait: 1800 });
  await fokusDom(page, 'A11 Seite 2-dom');
  await C('A11 Seite 2: NVDA+Tab', 'reportCurrentFocus');
  await K('P1 Tab (Textfeld)', 'Tab'); await T('P1 Text', 'Hallo Station', { wait: 600 });
  await bis('P1 Tab bis letzter Weiter', /"(Weiter|Abschicken|Fertig)[^"]*"/, { max: 8 });
  await K('P1 Enter (Abschluss: Danke)', 'Enter', { wait: 3000 });
  await fokusDom(page, 'Danke-dom'); await ans(page, 'Danke DOM-Ansagen');
  await C('Danke: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ zaehler: document.querySelector('[data-testid=st-zaehler]')?.textContent, status: document.querySelector('[data-status]')?.textContent, auto: document.querySelector('[data-auto]')?.textContent }), 'Danke Zähler-dom');
  await K('Danke: Pfeil unten (lesen)', 'ArrowDown'); await K('Danke: Pfeil unten', 'ArrowDown');
  // automatisch zur nächsten Person
  await spoken();
  await sleep(23000);
  rec({ schritt: 'Nach 23 s ohne Taste (automatisch nächste Person)', gesagt: await spoken(), z: await zustand() });
  await ans(page, 'Auto-Wechsel DOM-Ansagen');
  // Personen 2-4 per Playwright (Aufbau), Person 5 mit Tastatur
  const person = async (farbe) => {
    const d = page.locator('dialog.station');
    await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s1"]').waitFor();
    await page.getByRole('radio', { name: farbe, exact: true }).check();
    await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s2"]').waitFor();
    await d.locator('[data-weiter]').click(); await d.locator('[data-naechste]').waitFor();
    await d.locator('[data-naechste]').click(); await d.locator('[data-schritt="einleitung"]').waitFor();
  };
  for (const f of ['Grün', 'Blau', 'Rot']) await person(f);
  aufbau('Personen 2 bis 4 per Playwright ausgefüllt (nicht gemessen)');
  await page.bringToFront(); await nachVorn();
  await C('P5: NVDA+Tab', 'reportCurrentFocus');
  await bis('P5 Tab bis Weiter', /"(Weiter|Beginnen)"/, { max: 12 }); await K('P5 Enter', 'Enter', { wait: 1500 });
  await K('P5 Tab', 'Tab'); await K('P5 Pfeil unten', 'ArrowDown');
  await bis('P5 Tab bis Weiter', /"(Weiter|Beginnen)"/, { max: 10 }); await K('P5 Enter', 'Enter', { wait: 1500 });
  await bis('P5 Tab bis letzter Weiter', /"(Weiter|Abschicken|Fertig)[^"]*"/, { max: 8 });
  await K('P5 Enter (Danke, 5. Antwort: Erinnerung?)', 'Enter', { wait: 5500 });
  await ans(page, 'P5 DOM-Ansagen'); await dom(page, () => ({ zaehler: document.querySelector('[data-testid=st-zaehler]')?.textContent, leiste: document.querySelector('dialog.station')?.innerText.slice(-300) }), 'P5 Zähler/Erinnerung-dom');
  await bis('Tab bis „Nächste Person“', /Nächste Person/, { max: 6 });
  await C('Nächste Person: NVDA+Tab', 'reportCurrentFocus');
  await K('B5/B12 Nächste Person: Enter', 'Enter', { wait: 3500 });
  await fokusDom(page, 'Nach „Nächste Person“-dom'); await C('Nach „Nächste Person“: NVDA+Tab', 'reportCurrentFocus');
  // Leiste: Sicherung und Beenden
  await bis('Tab bis „Station beenden“', /Station beenden|End station/, { max: 14 });
  await C('Beenden: NVDA+Tab', 'reportCurrentFocus');
  await K('Beenden: Enter (Rückfrage)', 'Enter', { wait: 1800 });
  await fokusDom(page, 'Rückfrage-dom'); await C('Rückfrage: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => { const d = document.querySelector('[data-testid=st-ende-ungesichert]')?.closest('[role=dialog],dialog,section,div'); return { rolle: d?.getAttribute('role'), modal: d?.getAttribute('aria-modal'), name: d?.getAttribute('aria-labelledby'), text: d?.innerText.slice(0, 200) }; }, 'Rückfrage-Aufbau-dom');
  for (let i = 1; i <= 6; i++) await K(`Rückfrage Tab ${i} (Fokus gefangen?)`, 'Tab');
  await bis('Tab bis Zurück zur Station', /Zurück zur Station|Back to station/, { max: 6 });
  await K('B12 Enter: Zurück zur Station', 'Enter', { wait: 2500 });
  await fokusDom(page, 'B12 nach Zurück-dom'); await C('B12 NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis „Sicherungsdatei speichern“', /Sicherungsdatei/, { max: 14 });
  await K('Sichern: Enter', 'Enter', { wait: 3000 });
  await nachVorn();
  await ans(page, 'Sichern DOM-Ansagen'); await dom(page, () => ({ leiste: document.querySelector('[data-testid=st-leiste-status]')?.textContent, zaehler: document.querySelector('[data-testid=st-zaehler]')?.textContent }), 'Sichern-dom');
  await bis('Tab bis „Station beenden“', /Station beenden|End station/, { max: 14 });
  await K('Beenden: Enter', 'Enter', { wait: 1800 });
  await C('Rückfrage ohne Ungesicherte: NVDA+Tab', 'reportCurrentFocus');
  await K('Rückfrage: Tab', 'Tab'); await K('Rückfrage: Tab', 'Tab');
  await bis('Tab bis „Ja“', /Ja|Yes|beenden/, { max: 4 });
  await K('Ja, beenden: Enter', 'Enter', { wait: 2500 });
  await fokusDom(page, 'Nach dem Beenden-dom'); await C('Nach dem Beenden: NVDA+Tab', 'reportCurrentFocus');
});
