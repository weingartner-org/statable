// NVDA-Messung Stufe 1 (Erheben), Prüfplan C. Aufruf: node e2e/probe/nvda-erheben1-lauf.mjs <phase>
// Phasen: a1 (Nextcloud-Original) | a1b (Nextcloud erweitert: unklare Zeilen, doppelte Antworten) | a2 (Kobo + XLSForm) | a3 | a4 | a5
import { join } from 'node:path';
import { S, BASE, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, beispielOeffnen, nvda } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'a1';
const D = join(process.cwd(), 'src/lib/testdaten/dienste');
const ERW = process.env.ERW; // erweiterte Nextcloud-Datei (Scratchpad)

async function dateiLaden(page, pfad) {
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(1500);
  await page.bringToFront(); await nachVorn();
  await spoken();
  const feld = page.locator('label', { hasText: /Datei auswählen/ }).locator('input[type=file]');
  await feld.setInputFiles(pfad);
  aufbau('Datei per setInputFiles (Playwright) eingelesen: ' + pfad.split(/[\\/]/).pop());
  await page.waitForSelector('#fb-t', { timeout: 90000 });
  await sleep(1500);
  const g = await spoken();
  rec({ schritt: 'ankommen', gesagt: g, z: await zustand() });
}

const PH = {};

PH.a1 = async (page) => {
  await dateiLaden(page, join(D, 'nextcloud/nextcloud-de.csv'));
  await K('lesen: H (Überschrift)', 'KeyH');
  for (let i = 1; i <= 5; i++) await K(`lesen: Pfeil unten ${i}`, 'ArrowDown');
  // Tab durch den ganzen Dialog
  let r;
  for (let i = 1; i <= 30; i++) {
    r = await K(`Tab ${i}`, 'Tab');
    if (!r || /Übernehmen und öffnen/.test(r.z?.fokus ?? '')) break;
  }
  const vor = await spoken();
  await K('Enter auf Übernehmen und öffnen', 'Enter', { wait: 6000 });
  await sleep(3000);
  rec({ schritt: 'danach', z: await zustand(), seite: await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 300)) });
  await K('danach: NVDA liest (Pfeil unten)', 'ArrowDown');
};

PH.a1b = async (page) => {
  await dateiLaden(page, ERW);
  await K('lesen: H (Überschrift)', 'KeyH');
  // bis zum Kästchen "Mehrfachauswahl in einer Zelle"
  await bis('Tab bis Mehrfachauswahl', /checkbox.*name=<label:Mehrfachauswahl/, { max: 15 });
  await K('Leertaste: Mehrfachauswahl anhaken', 'Space', { wait: 1500 });
  const dom = await page.evaluate(() => [...document.querySelectorAll('.fb-unklar, .fb-stufen, [role=group]')].map((n) => n.className + ' ' + (n.getAttribute('aria-label') || '')).join(' | '));
  note('dom nach Haken', dom);
  // Optionsliste und Zusammenführen: Tab bis zum ersten Kästchen in der Tabelle der unklaren Zeilen
  const r1 = await bis('Tab bis unklare Zeilen', /in Antwort/, { max: 25 });
  if (r1) {
    await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await K('Tabelle: Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
    await K('Tabelle: Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Tabelle: Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Tabelle: Strg+Alt+Pfeil links (Zeilenkopf)', 'Control+Alt+ArrowLeft');
    await K('Tabelle: Strg+Alt+Pfeil oben (Spaltenkopf)', 'Control+Alt+ArrowUp');
    await C('NVDA+Tab: Fokus', 'reportCurrentFocus');
    await K('Leertaste im Kästchen (Entscheidung)', 'Space');
  }
  await bis('Tab bis doppelte Antworten', /Doppelte Antworten|Gruppe 1/, { max: 15 });
  await bis('Tab bis Gruppe', /Gruppe 1/, { max: 4 });
  await K('Tab (Behalten in Gruppe)', 'Tab');
  await bis('Tab bis Übernehmen', /Übernehmen und öffnen/, { max: 12 });
  await K('Enter auf Übernehmen und öffnen', 'Enter', { wait: 6000 });
  await sleep(3000);
  rec({ schritt: 'danach', z: await zustand(), seite: await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 300)) });
  await K('danach: Pfeil unten', 'ArrowDown');
};

PH.a1c = async (page) => {
  await dateiLaden(page, ERW);
  await K('H', 'KeyH');
  await bis('Tab bis Mehrfachauswahl', /checkbox.*name=<label:Mehrfachauswahl/, { max: 8 });
  await K('Leertaste: anhaken', 'Space', { wait: 1500 });
  await bis('Tab bis Kästchen unklare Zeile', /Frühstück in Antwort/, { max: 14 });
  const dom = () => page.evaluate(() => ({ aktiv: document.activeElement?.tagName + ':' + (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.className), geprueft: [...document.querySelectorAll('.fb-unklar input[type=checkbox]')].map((c) => (c.getAttribute('aria-label') ?? '') + '=' + c.checked).join('; ') }));
  note('dom vorher', JSON.stringify(await dom()));
  await K('Leertaste im Kästchen', 'Space', { wait: 1500 });
  note('dom nachher', JSON.stringify(await dom()));
  await K('Tab (wohin?)', 'Tab');
  await K('Leertaste (zweites Kästchen)', 'Space', { wait: 1500 });
  note('dom nachher 2', JSON.stringify(await dom()));
  await bis('Tab bis Übernehmen', /Übernehmen und öffnen/, { max: 20 });
  await K('Enter auf Übernehmen und öffnen', 'Enter', { wait: 6000 });
  note('alle DOM-Ansagen', JSON.stringify(await page.evaluate(() => window.__ansagen)));
};

PH.a2 = async (page) => {
  await dateiLaden(page, join(D, 'kobo/kobo-xml-eins-null.xlsx'));
  await K('H: Überschrift', 'KeyH');
  await bis('Tab bis XLSForm-Dateifeld', /file.*XLSForm/, { max: 12 });
  await C('NVDA+Tab (vor Wahl)', 'reportCurrentFocus');
  await spoken();
  await page.locator('input[type=file][aria-describedby=fb-xls-meld]').setInputFiles(join(D, 'xlsform/mensa.xlsx'));
  aufbau('XLSForm mensa.xlsx per setInputFiles im Feld "XLSForm (.xlsx) als Kodebuch wählen" (Playwright)');
  for (const ms of [300, 700, 1500, 3000]) { await sleep(ms); rec({ schritt: 'nach Wahl +' + ms, gesagt: await spoken(), z: await zustand(), meldung: await page.evaluate(() => (document.getElementById('fb-xls-meld')?.innerText ?? '').slice(0, 200)) }); }
  await C('NVDA+Tab (nach Wahl)', 'reportCurrentFocus');
  note('dom nach Lesen', await page.evaluate(() => 'Meldungsfeld=<' + (document.getElementById('fb-xls-meld')?.innerText ?? '') + '> Satz=<' + (document.querySelector('.fb-gruppe .as-satz')?.innerText ?? [...document.querySelectorAll('p.as-satz')].map((x) => x.innerText).find((x) => /Gelesen/.test(x)) ?? '') + '>'));
  await K('Pfeil unten (Ergebnissatz?)', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  // Tabellen lesen
  await K('T: nächste Tabelle', 'KeyT', { wait: 1200 });
  await K('Pfeil unten (in die Tabelle)', 'ArrowDown');
  await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Tabelle: Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Tabelle: Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('T: nächste Tabelle (Code-Abbildung)', 'KeyT', { wait: 1200 });
  await K('Pfeil unten (in die Tabelle)', 'ArrowDown');
  await K('Tabelle: Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Tabelle: Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Tabelle: Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  // Kästchen für die Umwandlung und Knopf zum Weglassen
  await bis('Umwandlungs-Kästchen', /checkbox.*verkehr/, { taste: 'Shift+Tab', max: 12 });
  await K('Leertaste: Umwandlung ankreuzen', 'Space');
  await bis('Tab bis XLSForm weglassen', /XLSForm wieder weglassen/, { max: 6 });
};

PH.a2b = async (page) => {
  await dateiLaden(page, join(D, 'kobo/kobo-xml-eins-null.xlsx'));
  await K('H: Überschrift', 'KeyH');
  await bis('Tab bis XLSForm-Dateifeld', /file.*XLSForm/, { max: 6 });
  await page.locator('input[type=file][aria-describedby=fb-xls-meld]').setInputFiles(join(D, 'xlsform/mensa.xlsx'));
  aufbau('XLSForm mensa.xlsx per setInputFiles (Playwright)'); await sleep(3000);
  await K('Pfeil unten (Ergebnissatz)', 'ArrowDown');
  await K('Pfeil unten (Tabelle Zuordnung)', 'ArrowDown');
  await K('Pfeil unten (erste Zelle)', 'ArrowDown');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
};

PH.a3 = async (page) => {
  await beispielOeffnen(page, 'Praktikum im Lehramt');
  await page.goto(BASE + '#blatt/neu', { waitUntil: 'load' }); await sleep(1500);
  await page.getByText(/Wie passen Zahlen und Aussagen zusammen/).first().click(); await sleep(1500);
  await page.getByText('Schulform schulform').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(1500);
  await page.getByText('Interviewzitat interview').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(4000);
  aufbau('Karte "Wie passen Zahlen und Aussagen zusammen?", Zahlen: Schulform, Aussagen: Interviewzitat (Playwright-Klicks)');
  await page.evaluate(() => window.scrollTo(0, 0)); await nachVorn();
  await K('T: Fälle-Tabelle', 'KeyT', { wait: 1200 });
  await K('T: Kennwerte-Tabelle Gruppe 1', 'KeyT', { wait: 1200 });
  await K('Tab: Deutung', 'Tab');
  await K('Tab: Passung (erste Gruppe)', 'Tab');
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Pfeil unten', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  await K('Pfeil oben', 'ArrowUp');
  await K('Pfeil unten', 'ArrowDown');
  await K('Pfeil unten (Ende der Gruppe)', 'ArrowDown');
  await K('Tab: Meta-Inferenz', 'Tab');
  await T('Meta-Inferenz tippen', 'Die Zahlen und das Zitat passen zusammen.');
  await K('Tab (Feld verlassen, speichern)', 'Tab', { wait: 1500 });
  note('meta-dom', await page.evaluate(() => [...document.querySelectorAll('textarea[id^=gm-]')].map((t) => t.id + '=' + t.value).join(' | ')));
  note('ansagen-dom', JSON.stringify(await page.evaluate(() => window.__ansagen.slice(-4))));
  // Zählung unter der Tabelle: Fokus per Skript auf "Neue Gruppe" (Aufbau), dann lesen
  await page.getByRole('button', { name: 'Neue Gruppe' }).focus();
  aufbau('Fokus per Skript auf Knopf "Neue Gruppe" gesetzt (Aufbau), damit die Zählung darunter mit Pfeil unten gelesen wird');
  await K('Pfeil unten (Zählung?)', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  note('zaehlung-dom', await page.evaluate(() => document.querySelector('.zaehlung')?.textContent ?? '(keine)'));
};

PH.a3b = async (page) => {
  await beispielOeffnen(page, 'Praktikum im Lehramt');
  await page.goto(BASE + '#blatt/neu', { waitUntil: 'load' }); await sleep(1500);
  await page.getByText(/Wie passen Zahlen und Aussagen zusammen/).first().click(); await sleep(1500);
  await page.getByText('Schulform schulform').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(1500);
  await page.getByText('Interviewzitat interview').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(4000);
  aufbau('Karte Fälle vergleichen, Schulform / Interviewzitat (Playwright-Klicks)');
  await page.evaluate(() => window.scrollTo(0, 0)); await nachVorn();
  await K('T', 'KeyT', { wait: 1500 });
  await K('T', 'KeyT', { wait: 1500 });
  await K('Tab: Deutung (lange Wartezeit)', 'Tab', { wait: 3000 });
  await C('NVDA+Tab', 'reportCurrentFocus', { wait: 2000 });
  await K('Tab: Passung', 'Tab', { wait: 3000 });
  await K('Pfeil unten: Bestätigung', 'ArrowDown', { wait: 2500 });
  await K('Tab: Meta-Inferenz', 'Tab', { wait: 3000 });
  await K('Tab: weiter', 'Tab', { wait: 2500 });
  await K('Tab: Name der 2. Gruppe -> Tabelle', 'Tab', { wait: 2500 });
  await K('Tab: Deutung 2. Gruppe', 'Tab', { wait: 3000 });
  await K('Tab: Passung 2. Gruppe', 'Tab', { wait: 3000 });
  await K('Tab: Meta-Inferenz 2. Gruppe', 'Tab', { wait: 3000 });
};

async function interviewAufbau(page) {
  await beispielOeffnen(page, 'Praktikum im Lehramt');
  await page.goto(BASE + '#blatt/neu', { waitUntil: 'load' }); await sleep(1500);
  await page.getByText(/Wie passen Zahlen und Aussagen zusammen/).first().click(); await sleep(1500);
  for (const t of [/Praktikumsnote \(1/, /Selbstwirksamkeit \(1-5\)/, /Schulform schulform/]) await page.getByText(t).first().click();
  await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(1500);
  await page.getByText('Interviewzitat interview').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(4000);
  aufbau('Karte "Wie passen Zahlen und Aussagen zusammen?", Zahlen: Praktikumsnote, Selbstwirksamkeit, Schulform; Aussagen: Interviewzitat (Playwright-Klicks)');
  await page.getByText('Fälle für Interviews vorschlagen').first().scrollIntoViewIfNeeded();
  await page.locator('details > summary', { hasText: 'Fälle für Interviews vorschlagen' }).focus();
  aufbau('Fokus per Skript auf "Fälle für Interviews vorschlagen" (Aufbau); alles Weitere nur mit Tastatur');
  await nachVorn();
}

PH.a4 = async (page) => {
  await interviewAufbau(page);
  await C('NVDA+Tab (Auslöser)', 'reportCurrentFocus');
  await K('Enter: aufklappen', 'Enter', { wait: 1200 });
  await K('Tab: Regel-Gruppe', 'Tab');
  // Regel "divers" = sechste Option
  for (let i = 1; i <= 5; i++) await K(`Pfeil unten ${i} (Regel)`, 'ArrowDown', { wait: 1800 });
  note('divers-dom', await page.evaluate(() => (document.querySelector('details[open] [role=region][aria-label*="Vorgeschlagene"]') ? 'Tabelle da' : 'keine Tabelle')));
  await K('Tab: Kategorienspalte', 'Tab');
  await K('Tab: Wie viele Fälle?', 'Tab');
  await K('Esc (Fokusmodus verlassen?)', 'Escape');
  await K('Esc (zweites)', 'Escape');
  await K('T: nächste Tabelle', 'KeyT', { wait: 1400 });
  await K('Pfeil unten (in die Tabelle)', 'ArrowDown');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  // zweite Kategorienspalte ankreuzen, damit leere Kombinationen vorkommen
  await bis('Tab bis Weitere Spalten zeigen', /Weitere Spalten zeigen/, { max: 8 });
  await K('Enter: aufklappen', 'Enter', { wait: 1200 });
  await K('Tab: erste Spalte', 'Tab');
  await K('Leertaste: Spalte ankreuzen (zweite Kategorienspalte)', 'Space', { wait: 2500 });
  note('dom-sätze divers', await page.evaluate(() => [...document.querySelectorAll('details[open] p')].map((p) => p.textContent.replace(/\s+/g, ' ').trim().slice(0, 260)).join(' || ')));
  await K('T: nächste Tabelle (rückwärts)', 'Shift+KeyT', { wait: 1400 });
  for (let i = 1; i <= 6; i++) await K(`Pfeil oben lesen ${i}`, 'ArrowUp', { wait: 1000 });
  // zurück zur Regelgruppe: "einflussreich"
  await page.locator('details[open] input[type=radio]').nth(3).focus();
  aufbau('Fokus per Skript auf Radio "Maximale Variation" (vierte Option) (Aufbau), um mit Pfeil unten zu "einflussreich" zu gehen');
  await K('Pfeil unten (einflussreich)', 'ArrowDown', { wait: 2500 });
  await K('Tab: Zielspalte', 'Tab');
  await K('Tab: Wie viele Fälle?', 'Tab');
  await K('Tab: Woraus vorhergesagt wird', 'Tab');
  await K('Leertaste: Selbstwirksamkeit ankreuzen', 'Space', { wait: 2500 });
  note('dom-sätze einflussreich', await page.evaluate(() => [...document.querySelectorAll('details[open] p, details[open] caption')].map((p) => p.textContent.replace(/\s+/g, ' ').trim().slice(0, 300)).join(' || ')));
  await K('T: nächste Tabelle', 'KeyT', { wait: 1400 });
  await K('Pfeil unten (in die Tabelle)', 'ArrowDown');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('T: vorige Tabelle', 'Shift+KeyT', { wait: 1400 });
  for (let i = 1; i <= 6; i++) await K(`Pfeil oben lesen ${i}`, 'ArrowUp', { wait: 1000 });
};

PH.a4b = async (page) => {
  await interviewAufbau(page);
  await K('Enter: aufklappen', 'Enter', { wait: 1200 });
  await page.locator('details[open] input[type=radio]').nth(3).focus();
  aufbau('Fokus per Skript auf Radio "Maximale Variation" (vierte Option) (Aufbau)');
  await K('Pfeil unten (einflussreich)', 'ArrowDown', { wait: 2500 });
  await K('Tab: Zielspalte', 'Tab');
  await K('Tab: Wie viele Fälle?', 'Tab');
  await K('Tab: Woraus vorhergesagt wird', 'Tab');
  await K('Leertaste: Selbstwirksamkeit ankreuzen', 'Space', { wait: 2500 });
  await K('T: nächste Tabelle', 'KeyT', { wait: 1400 });
  for (let i = 1; i <= 12; i++) await K(`Pfeil oben lesen ${i}`, 'ArrowUp', { wait: 1000 });
};

PH.a5 = async (page) => {
  await beispielOeffnen(page, 'Praktikum im Lehramt');
  await page.goto(BASE + '#blatt/neu', { waitUntil: 'load' }); await sleep(1500);
  await page.getByText(/Wie passen Zahlen und Aussagen zusammen/).first().click(); await sleep(1500);
  await page.getByText('Schulform schulform').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(1500);
  await page.getByText('Interviewzitat interview').first().click(); await page.getByRole('button', { name: /^Fertig/ }).first().click(); await sleep(4000);
  aufbau('Blatt "Fälle vergleichen" angelegt (Playwright-Klicks), damit der Bericht nicht leer ist');
  await page.evaluate(() => { location.hash = '#bericht'; }); await sleep(2500);
  note('dom', await page.evaluate(() => [...document.querySelectorAll('details.integration summary, h1')].map((x) => x.tagName + ' ' + x.textContent.trim()).join(' | ')));
  await nachVorn();
  await K('Strg+Pos1 (Dokumentanfang)', 'Control+Home');
  await K('H: Überschrift', 'KeyH');
  const r0 = await bis('Tab bis Integration', /Integration/, { max: 8 });
  if (r0 && /Integration/.test(r0.z?.fokus ?? '')) {
    await K('Enter: aufklappen', 'Enter', { wait: 1200 });
    const f1 = await K('Tab: Feld 1', 'Tab');
    await C('NVDA+Tab', 'reportCurrentFocus');
    if (/textarea/.test(f1?.z?.fokus ?? '')) await T('Feld 1 tippen', 'Zahlen und Interviews stimmen überein.');
    for (let i = 2; i <= 5; i++) await K(`Tab: ${i <= 4 ? 'Feld ' + i : 'weiter'}`, 'Tab', { wait: 1500 });
  }
  note('werte', await page.evaluate(() => [...document.querySelectorAll('textarea[id^=int-]')].map((t) => t.id + '=' + t.value).join(' | ')));
  note('ansagen', JSON.stringify(await page.evaluate(() => window.__ansagen.slice(-4))));
};

await mitNvda(phase, async (page) => { if (!PH[phase]) throw new Error('Phase unbekannt: ' + phase); await PH[phase](page); });
