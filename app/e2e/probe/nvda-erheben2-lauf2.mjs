// NVDA-Messung Stufe 2, Teil 2 (Fragebogen planen: Formular, Befunde, Vorschau, Export; Eingabemaske; Abgleich).
// Aufruf: NVDA_PORT=4222 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben2-lauf2.mjs <phase>
// Phasen: g1b (Gliederung im Lesemodus) | f2 (Sprachen, Formular, Bedingung) | f3 (Befunde, Geprüft) | f4 (Vorschau) | f5 (Export-Menü, gesperrt) | f6 (Export-Menü, frei)
import { S, sleep, K, C, T, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, nvda, BASE } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'f2';
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6), tag);
const vorn = async (page) => { await page.bringToFront(); await nachVorn(); };
const PH = {};

/** Tab (oder andere Taste) bis der Fokus zum Muster passt; bricht ab, wenn der Fokus die Seite verlässt (body) */
async function bis2(schritt, re, { taste = 'Tab', max = 20, wait = 900 } = {}) {
  let r = null;
  for (let i = 1; i <= max; i++) {
    r = await K(`${schritt} (${i})`, taste, { wait });
    if (!r) return null;
    if (re.test(r.z?.fokus ?? '')) return r;
    if (/^(body|a\[\] "Zum Inhalt)/.test(r.z?.fokus ?? '') || !r.z?.fokus) { note(schritt, 'Fokus hat die Seite verlassen oder liegt auf body, Abbruch'); return r; }
  }
  note(schritt, `Muster ${re} nach ${max} Tasten nicht erreicht`);
  return r;
}

/** Aufbau (Playwright): Fragebogen anlegen, Vorlagen einfügen */
async function plan(page, vorlagen = ['Zustimmung (5 Stufen)']) {
  await page.goto(BASE + '#fragebogen', { waitUntil: 'load' }); await sleep(1500);
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await sleep(500);
  await page.locator('summary', { hasText: 'Vorlage einfügen' }).click();
  for (const v of vorlagen) {
    await page.locator('#fb-vorlage').selectOption({ label: v });
    await page.locator('details.vorlagen button.k', { hasText: 'Vorlage einfügen' }).click(); await sleep(500);
  }
  aufbau('Fragebogen angelegt, Vorlagen eingefügt: ' + vorlagen.join(', ') + ' (Playwright, nicht gemessen)');
}

PH.g1b = async (page) => {
  await plan(page);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400);
  await page.locator('[data-eid]').nth(1).focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Frage hinzugefügt, Fokus auf erster Frage der Gliederung (Playwright); NVDA im Lesemodus (Standard)');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Alt+Pfeil unten im Lesemodus', 'Alt+ArrowDown', { wait: 1500 });
  await K('Entf im Lesemodus', 'Delete', { wait: 1500 });
  await dom(page, () => ({ dialog: !!document.querySelector('dialog[open]'), fokus: document.activeElement?.tagName + ' ' + document.activeElement?.textContent?.trim().slice(0, 40) }), 'nach Entf (DOM)');
  await K('Esc', 'Escape', { wait: 1200 });
  await K('Pfeil oben im Lesemodus', 'ArrowUp');
  await K('Enter im Lesemodus (springt ins Formular?)', 'Enter', { wait: 1500 });
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Tab (weiter im Formular)', 'Tab');
};

PH.f2 = async (page) => {
  await plan(page, ['Zustimmung (5 Stufen)', 'Ja oder Nein']);
  await page.locator('summary', { hasText: 'Titel, Sprachen und Einstellungen' }).focus();
  await page.evaluate(() => { window.__ansagen = []; });
  await dom(page, () => [...document.querySelectorAll('[data-eid]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), 'Gliederung-DOM');
  aufbau('Fokus auf „Titel, Sprachen und Einstellungen“ (Playwright)');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Einstellungen aufklappen', 'Enter');
  await bis2('Tab bis Titel Deutsch', /fb-titel-de/, { max: 4 });
  await bis2('Tab bis Englisch', /checkbox.*Englisch/, { max: 6 });
  await K('Leertaste: Englisch aus', 'Space', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Englisch aus');
  await K('Leertaste: Englisch wieder an', 'Space', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Englisch an');
  await page.locator('[data-eid]').nth(2).focus(); await vorn(page);
  aufbau('Fokus auf zweiter Frage der Gliederung (Playwright)');
  await C('NVDA+Tab', 'reportCurrentFocus');
  await C('NVDA+Leertaste (Fokusmodus)', 'toggleBetweenBrowseAndFocusMode');
  await K('Enter (Fokusmodus): ins Formular', 'Enter', { wait: 1500 });
  await C('NVDA+Tab: erstes Feld des Formulars', 'reportCurrentFocus');
  await K('Tab: nächstes Feld (Fragetext Englisch)', 'Tab');
  await C('NVDA+Tab', 'reportCurrentFocus');
  await bis2('Tab bis Filter', /^button.*Filter hinzufügen/, { max: 30 });
  await K('Enter: Filter hinzufügen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Filter hinzufügen');
  await dom(page, () => ({ satz: document.querySelector('[data-testid=fb-bedingungssatz]')?.textContent, fokus: document.activeElement?.tagName + '#' + document.activeElement?.id }), 'Bedingung-DOM');
  await C('NVDA+Tab (nach Filter hinzufügen)', 'reportCurrentFocus');
  await K('Shift+Tab: Bedingung 1 entfernen', 'Shift+Tab');
  await K('Shift+Tab: Antwort', 'Shift+Tab');
  await C('NVDA+Tab (Antwort)', 'reportCurrentFocus');
  await K('Pfeil unten: Antwort ändern', 'ArrowDown', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Antwort ändern');
  await dom(page, () => ({ satz: document.querySelector('[data-testid=fb-bedingungssatz]')?.textContent }), 'Satz nach Änderung (DOM)');
  await K('Shift+Tab: Vergleich', 'Shift+Tab');
  await C('NVDA+Tab (Vergleich)', 'reportCurrentFocus');
  await K('Shift+Tab: Frage', 'Shift+Tab');
  await C('NVDA+Tab (Frage)', 'reportCurrentFocus');
  await K('Esc (Fokusmodus verlassen)', 'Escape'); await K('Esc', 'Escape');
  for (let i = 0; i < 6; i++) await K('Pfeil oben (Lesemodus: Satz lesen)', 'ArrowUp');
  for (let i = 0; i < 3; i++) await K('Pfeil unten (Lesemodus)', 'ArrowDown');
};

PH.f3 = async (page) => {
  await plan(page);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(500);
  const t = page.locator('#fb-fragetext-de');
  await t.fill('Sind Sie nicht unzufrieden mit der Ausstattung und dem Service?'); await t.blur(); await sleep(500);
  await page.locator('#fb-name').fill('zufr'); await page.locator('#fb-name').blur(); await sleep(400);
  await page.locator('h1#fb-t').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Zweite Frage mit zwei Fehlerquellen (verneint, doppelt) per Playwright; Englisch fehlt absichtlich; Fokus auf Überschrift');
  await dom(page, () => document.querySelector('.bf')?.innerText.slice(0, 1800), 'Befunde-DOM (Text)');
  await dom(page, () => document.querySelector('[data-testid=fb-befundzahl]')?.innerText, 'Befundzahl-DOM');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await bis2('Tab bis Zu den Befunden', /Zu den Befunden/, { max: 25 });
  await K('Enter: Zu den Befunden', 'Enter', { wait: 1500 });
  await C('NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 10; i++) await K('Pfeil unten (Befunde lesen)', 'ArrowDown');
  await bis2('Tab bis Geprüft-Kästchen', /checkbox.*Gepr/, { max: 8 });
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Leertaste: Geprüft', 'Space', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Geprüft');
  await K('Leertaste: wieder aufheben', 'Space', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Aufheben');
  await bis2('Tab bis Zum Element springen', /Zum Element springen/, { taste: 'Shift+Tab', max: 4 });
  await K('Enter: Zum Element springen', 'Enter', { wait: 1500 });
  await C('NVDA+Tab (Ziel)', 'reportCurrentFocus');
};

PH.f4 = async (page) => {
  await plan(page);
  await page.locator('[data-eid]').nth(1).focus();
  await page.evaluate(() => { window.__ansagen = []; });
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 10; i++) { const r = await K('H bis Vorschau', 'KeyH'); if (r && /Vorschau/.test((r.gesagt ?? []).join(' '))) break; }
  for (let i = 0; i < 12; i++) await K('Pfeil unten (Vorschau lesen)', 'ArrowDown');
};

PH.f5 = async (page) => { // Export-Menü, gesperrt (Platzhalter-Fehler)
  await plan(page);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400); // leere Frage = Fehler
  await page.locator('[data-eid]').nth(1).focus();
  await page.evaluate(() => { window.__ansagen = []; });
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await bis2('Shift+Tab bis Exportieren', /^button.*Exportieren/, { taste: 'Shift+Tab', max: 30 });
  await K('Enter: Menü öffnen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Menü öffnen');
  await dom(page, () => ({ grund: document.getElementById('fb-ex-grund')?.textContent, eintraege: [...document.querySelectorAll('#fb-ex-liste ul button')].map(b => b.textContent.trim().replace(/\s+/g, ' ')) }), 'Export-DOM (gesperrt)');
  for (let i = 0; i < 4; i++) await K('Tab im Menü', 'Tab');
  await K('Enter auf gesperrten Eintrag', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach gesperrtem Eintrag');
  await bis2('Shift+Tab bis Zum ersten Fehler springen', /Zum ersten Fehler/, { taste: 'Shift+Tab', max: 12 });
  await K('Enter: Sprunglink', 'Enter', { wait: 1500 });
  await C('NVDA+Tab (Ziel des Sprunglinks)', 'reportCurrentFocus');
};

PH.f2b = async (page) => { // Bedingungssatz im Lesemodus lesen
  await plan(page, ['Zustimmung (5 Stufen)', 'Ja oder Nein']);
  await page.locator('[data-eid]').nth(2).click(); await sleep(400);
  await page.getByRole('button', { name: 'Filter hinzufügen' }).click(); await sleep(500);
  await page.locator('select[id^=fb-bed-f-]').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Filter per Playwright angelegt, Fokus auf der Auswahl „Frage“ der Bedingung');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await C('NVDA+Leertaste (Lesemodus)', 'toggleBetweenBrowseAndFocusMode');
  for (let i = 0; i < 4; i++) await K('Pfeil oben (Lesemodus)', 'ArrowUp');
  for (let i = 0; i < 4; i++) await K('Pfeil unten (Lesemodus)', 'ArrowDown');
};

PH.f6 = async (page) => { // Export-Menü frei: Kodebuch (Word) und Großdruck speichern
  const DL = process.env.NVDA_DL ?? 'C:/Users/johan/AppData/Local/Temp/claude/841c7e01c49a38e9/0c7011be-d3ea-4724-9026-3249592e1dcf/scratchpad/word';
  page.on('download', (d) => { d.saveAs(DL + '/' + d.suggestedFilename()).then(() => note('download', d.suggestedFilename())).catch(() => {}); });
  await plan(page, ['Zustimmung (5 Stufen)', 'Ja oder Nein', 'Alter (Zahl)']);
  await page.locator('h1#fb-t').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Fragebogen mit drei Fragen (Zustimmung, Ja/Nein, Alter), Fokus auf Überschrift; Downloads landen im Scratchpad (Playwright speichert)');
  await dom(page, () => document.querySelector('[data-testid=fb-befundzahl]')?.innerText, 'Befundzahl-DOM');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await bis2('Tab bis Exportieren', /^button.*Exportieren/, { max: 25 });
  await K('Enter: Menü öffnen', 'Enter', { wait: 1800 });
  await K('Tab: Sprache der Datei', 'Tab');
  await bis2('Tab bis Kodebuch (Word)', /Kodebuch \(Word\)/, { max: 12 });
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Kodebuch (Word) speichern', 'Enter', { wait: 3500 });
  await ans(page, 'DOM-Ansagen nach Kodebuch');
  await bis2('Tab bis Großdruck', /Gro(ß|ss)druck/, { max: 6 });
  await K('Enter: Großdruck speichern', 'Enter', { wait: 3500 });
  await ans(page, 'DOM-Ansagen nach Großdruck');
  await K('Esc (Menü schließen)', 'Escape', { wait: 1200 });
  await K('Esc nochmals', 'Escape', { wait: 1200 });
  await dom(page, () => ({ offen: !!document.getElementById('fb-ex-liste'), fokus: document.activeElement?.textContent?.trim().slice(0, 40) }), 'nach Esc (DOM)');
};

PH.f6b = async (page) => { // Wiederholung: wird die Erfolgsmeldung des Exports gesprochen?
  await plan(page, ['Zustimmung (5 Stufen)']);
  await page.locator('h1#fb-t').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  await vorn(page);
  await bis2('Tab bis Exportieren', /^button.*Exportieren/, { max: 25 });
  await K('Enter: Menü öffnen', 'Enter', { wait: 1800 });
  await bis2('Tab bis Kodebuch (Word)', /Kodebuch \(Word\)/, { max: 12 });
  await K('Enter: Kodebuch (Word), Wartezeit 6 s', 'Enter', { wait: 6000 });
  await K('Enter: Kodebuch (Word) nochmals', 'Enter', { wait: 6000 });
  await bis2('Tab bis Braille', /Braille/, { max: 6 });
  await K('Enter: Braille-taugliche Textfassung', 'Enter', { wait: 6000 });
  await ans(page, 'DOM-Ansagen');
};

PH.f7 = async (page) => { // Nachmessung: Export frei (Platzhaltertexte ersetzt), Erfolgsmeldung; Dateien für Word
  const DL = process.env.NVDA_DL ?? 'C:/Users/johan/AppData/Local/Temp/claude/841c7e01c49a38e9/0c7011be-d3ea-4724-9026-3249592e1dcf/scratchpad/word2';
  page.on('download', (d) => { d.saveAs(DL + '/' + d.suggestedFilename()).then(() => note('download', d.suggestedFilename())).catch(() => {}); });
  await plan(page, ['Zustimmung (5 Stufen)', 'Ja oder Nein', 'Alter (Zahl)']);
  const texte = [['Wie sehr stimmen Sie der Aussage zu: Das Studium ist gut organisiert?', 'How much do you agree: the programme is well organised?'], ['Haben Sie im letzten Jahr ein Praktikum gemacht?', 'Did you do an internship last year?']];
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-eid]').nth(i + 1).click(); await sleep(300);
    await page.locator('#fb-fragetext-de').fill(texte[i][0]); await page.locator('#fb-fragetext-de').blur();
    await page.locator('#fb-fragetext-en').fill(texte[i][1]); await page.locator('#fb-fragetext-en').blur(); await sleep(300);
  }
  await page.locator('h1#fb-t').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  await dom(page, () => document.querySelector('[data-testid=fb-befundzahl]')?.innerText, 'Befundzahl-DOM');
  await vorn(page);
  await bis2('Tab bis Exportieren', /^button.*Exportieren/, { max: 25 });
  await K('Enter: Menü öffnen', 'Enter', { wait: 1800 });
  await bis2('Tab bis Kodebuch (Word)', /Kodebuch \(Word\)/, { max: 12 });
  await K('Enter: Kodebuch (Word) speichern', 'Enter', { wait: 5000 });
  await ans(page, 'DOM-Ansagen nach Kodebuch');
  await bis2('Tab bis Großdruck', /Gro(ß|ss)druck/, { max: 6 });
  await K('Enter: Großdruck speichern', 'Enter', { wait: 5000 });
  await ans(page, 'DOM-Ansagen nach Großdruck');
  await K('Enter: Großdruck nochmals', 'Enter', { wait: 5000 });
  await bis2('Tab bis Braille', /Braille/, { max: 4 });
  await K('Enter: Braille-taugliche Textfassung', 'Enter', { wait: 5000 });
  await ans(page, 'DOM-Ansagen nach Braille');
};

PH.g2 = async (page) => { // Nachmessung: Gliederung ohne Fokusmodus, nur über die Knöpfe
  await plan(page);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400);
  await page.locator('[data-eid]').nth(1).focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Drei Fragen, Fokus auf der ersten Frage; NVDA im Lesemodus (Standard)');
  await vorn(page);
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Tab: Nach oben', 'Tab'); await K('Tab: Nach unten', 'Tab');
  await K('Enter: Nach unten', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Nach unten');
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Tab: Löschen', 'Tab');
  await K('Enter: Löschen (Rückfrage)', 'Enter', { wait: 1800 });
  await K('Esc', 'Escape', { wait: 1200 });
  await C('NVDA+Tab (nach Esc)', 'reportCurrentFocus');
};

const f = PH[phase];
if (!f) { console.log('Phase?', Object.keys(PH)); process.exit(1); }
await mitNvda(phase, f);
