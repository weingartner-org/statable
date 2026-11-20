// NVDA-Messung Stufe 3, Prüfplan C: „Fragebogen planen“ (Schlüssel, Rahmentexte, Datenschutz-Vorlage, Einmal-Codes, Export, Sammelimport).
// Vorher: node e2e/probe/nvda-erheben3-vorbereiten.mjs und (für c4) node e2e/probe/nvda-erheben3-material.mjs
// Aufruf: NVDA_PORT=4232 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben3-planen.mjs <c1|c2|c3|c4>
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn } from './nvda-erheben3n-lib.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const DIR = join(tmpdir(), 'n3-daten');
const BASE = `http://localhost:${process.env.NVDA_PORT ?? 4232}/`;
const phase = process.argv[2] ?? 'c1';
const OBS = `
window.__ansagen = window.__ansagen || [];
setInterval(() => { for (const e of document.querySelectorAll('[role=status],[aria-live],[role=alert]')) { if (!e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ text: e.textContent, rolle: e.getAttribute('role'), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }, 150);
`;
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-5), tag);
const fokusDom = (page, tag) => dom(page, () => ({ fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? document.activeElement?.value ?? '').replace(/\s+/g, ' ').slice(0, 70) }), tag);
async function neuerPlan(page) {
  await S.ctx.addInitScript(OBS);
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.getByRole('button', { name: /Neuen Fragebogen anlegen/ }).click(); await sleep(1000);
}
async function fokusAuf(page, sel) { // Aufbau: Fokus auf eine Überschrift setzen
  await page.locator(sel).first().evaluate((e) => { e.setAttribute('tabindex', '-1'); e.scrollIntoView(); e.focus(); });
  aufbau(`Fokus per Skript auf ${sel}`);
  await page.evaluate(() => { window.__ansagen = []; });
  await page.bringToFront(); await nachVorn();
}
const PH = {};

PH.c1 = async (page) => {
  await neuerPlan(page);
  await fokusAuf(page, '#fb-schl-t');
  await C('Schlüssel: NVDA+Tab (Überschrift)', 'reportCurrentFocus');
  for (let i = 0; i < 3; i++) await K('Schlüssel: Pfeil unten (Warnung lesen)', 'ArrowDown', { wait: 700 });
  await fokusAuf(page, '#fb-schl-t');
  await bis('Schlüssel: Tab bis „Neues Schlüsselpaar anlegen“', /Neues Schlüsselpaar anlegen/, { max: 8 });
  await K('Enter: Formular öffnen', 'Enter', { wait: 1500 });
  await ans(page, 'Formular auf DOM-Ansagen'); await fokusDom(page, 'Formular auf Fokus-dom');
  await bis('Tab bis „Schlüsselpaar erzeugen“', /Schlüsselpaar erzeugen/, { max: 8 });
  await K('Fehlerfall: Enter ohne Name', 'Enter', { wait: 1800 });
  await C('Fehlerfall Name: NVDA+Tab', 'reportCurrentFocus');
  await T('Name tippen', 'Umfrage Seminar', { wait: 600 });
  await K('Tab: Passwort', 'Tab'); await C('Passwort: NVDA+Tab', 'reportCurrentFocus');
  await T('Passwort kurz', 'kurz', { wait: 400 });
  await bis('Tab bis „Schlüsselpaar erzeugen“', /Schlüsselpaar erzeugen/, { max: 6 });
  await K('Fehlerfall: Enter, Passwort zu kurz', 'Enter', { wait: 1800 });
  await C('Fehlerfall Passwort: NVDA+Tab', 'reportCurrentFocus');
  await page.fill('#fb-schl-pw1', 'ein langes passwort 3n'); await page.fill('#fb-schl-pw2', 'ein langes passwort 3n');
  aufbau('Passwörter per Skript gesetzt (Passwortfelder, nicht gemessen)');
  await page.locator('#fb-schl-pw2').focus(); await nachVorn();
  await bis('Tab bis „Schlüsselpaar erzeugen“', /Schlüsselpaar erzeugen/, { max: 4 });
  await K('Enter: erzeugen und Datei speichern', 'Enter', { wait: 3500 });
  await nachVorn();
  await ans(page, 'Erzeugen DOM-Ansagen'); await fokusDom(page, 'Nach Erzeugen Fokus-dom');
  await C('Nach Erzeugen: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => document.querySelector('#fb-schl-gesichert')?.closest('section,div')?.innerText.slice(0, 500), 'Schritt-2-Text-dom');
  await bis('Tab bis „übernehmen“', /übernehmen/, { max: 6 });
  await K('Fehlerfall: Enter ohne Haken', 'Enter', { wait: 1800 });
  await C('Fehlerfall Haken: NVDA+Tab', 'reportCurrentFocus');
  await K('Leertaste: Haken', 'Space');
  await bis('Tab bis „übernehmen“', /übernehmen/, { max: 4 });
  await K('Enter: Schlüssel übernehmen', 'Enter', { wait: 2000 });
  await ans(page, 'Übernehmen DOM-Ansagen'); await fokusDom(page, 'Nach Übernehmen Fokus-dom');
  await C('Nach Übernehmen: NVDA+Tab', 'reportCurrentFocus');
  await K('Pfeil unten', 'ArrowDown'); await K('Pfeil unten', 'ArrowDown'); await K('Pfeil unten', 'ArrowDown');
  await bis('Tab bis „Kopieren“', /Kopieren/, { max: 6 });
  await K('Enter: Kopieren', 'Enter', { wait: 1800 });
  await ans(page, 'Kopieren DOM-Ansagen');
};

PH.c2 = async (page) => {
  await neuerPlan(page);
  await fokusAuf(page, 'section.rt :is(h2,h3)');
  await C('Rahmentexte: NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 4; i++) await K('Rahmentexte: Pfeil unten', 'ArrowDown', { wait: 700 });
  await fokusAuf(page, 'section.rt :is(h2,h3)');
  await bis('Tab bis Einleitung deutsch', /fb-rt-ein-de/, { max: 8 });
  await C('Einleitung de: NVDA+Tab', 'reportCurrentFocus');
  await T('Einleitung tippen', 'Willkommen. Rückgabe an [E-Mail eintragen]', { wait: 800 });
  await K('Tab (Feld verlassen: Platzhalter-Warnung?)', 'Tab', { wait: 1500 });
  await ans(page, 'Warnung DOM-Ansagen');
  await K('Umschalt+Tab zurück ins Feld', 'Shift+Tab', { wait: 1200 });
  await C('Feld mit Warnung: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | '), lang: document.activeElement?.lang }), 'Warnung-dom');
  await bis('Tab bis Einleitung englisch', /fb-rt-ein-en/, { max: 3 });
  await C('Einleitung en: NVDA+Tab (Sprache)', 'reportCurrentFocus');
  await bis('Tab bis Haken Einwilligung', /fb-rt-ew-an/, { max: 8 });
  await C('Einwilligung: NVDA+Tab', 'reportCurrentFocus');
  await K('Leertaste: Einwilligung an', 'Space', { wait: 1200 });
  await ans(page, 'Einwilligung DOM-Ansagen');
  await K('Tab', 'Tab'); await K('Tab', 'Tab'); await K('Tab', 'Tab');
  // Datenschutz-Vorlage
  await bis('Tab bis „Vorlage Teilnahme-Information einsetzen“', /Vorlage Teilnahme-Information/, { max: 14 });
  await K('Enter: Vorlage-Formular', 'Enter', { wait: 1500 });
  await fokusDom(page, 'Vorlage-Formular Fokus-dom'); await C('Vorlage: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis Dauer', /fb-ds-dauer/, { max: 8 });
  await C('Dauer: NVDA+Tab', 'reportCurrentFocus');
  await T('Dauer abc', 'abc', { wait: 500 });
  await bis('Tab bis „Texte in den Fragebogen einsetzen“', /Texte in den Fragebogen einsetzen/, { max: 12 });
  await K('Fehlerfall: Enter (Dauer ungültig)', 'Enter', { wait: 1800 });
  await C('Fehlerfall Dauer: NVDA+Tab', 'reportCurrentFocus');
  await ans(page, 'Fehler DOM-Ansagen');
  await page.fill('#fb-ds-dauer', '10'); aufbau('Dauer 10 per Skript');
  await bis('Tab bis „Texte in den Fragebogen einsetzen“', /Texte in den Fragebogen einsetzen/, { max: 14 });
  await K('Enter: Texte einsetzen', 'Enter', { wait: 1800 });
  if (await page.getByRole('button', { name: 'Vorlage einsetzen' }).count()) { await bis('Tab bis „Vorlage einsetzen“ (Rückfrage)', /Vorlage einsetzen/, { max: 6 }); await K('Enter: Rückfrage bestätigen', 'Enter', { wait: 1800 }); }
  await ans(page, 'Einsetzen DOM-Ansagen'); await fokusDom(page, 'Nach Einsetzen Fokus-dom');
  await C('Nach Einsetzen: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ offen: document.querySelector('[data-testid=fb-ds-offen]')?.innerText, kr: document.querySelector('[data-testid=fb-ds-keine-rechtsberatung]')?.innerText }), 'Platzhalter-Hinweis-dom');
  await K('Pfeil unten (lesen)', 'ArrowDown'); await K('Pfeil unten', 'ArrowDown'); await K('Pfeil unten', 'ArrowDown');
};

PH.c2b = async (page) => { // Datenschutz-Vorlage: Rückfrage „Vorhandene Texte ersetzen?“ und Platzhalter-Hinweis
  await neuerPlan(page);
  await page.fill('#fb-rt-ein-de', 'Vorhandener Text'); await page.locator('#fb-rt-ein-de').blur();
  await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click(); await page.waitForSelector('#fb-ds-form');
  await page.fill('#fb-ds-dauer', '10'); await page.fill('#fb-ds-zweck', 'Wie zufrieden sind Studierende mit dem Seminar?');
  aufbau('Einleitung gefüllt, Vorlage-Formular offen und ausgefüllt (Skript)');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).focus(); await nachVorn();
  await C('Vorlage-Knopf: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Texte einsetzen (Rückfrage)', 'Enter', { wait: 1800 });
  await dom(page, () => { const d = document.querySelector('[role=dialog],[role=alertdialog],dialog[open]'); return { rolle: d?.getAttribute('role') ?? d?.tagName, modal: d?.getAttribute('aria-modal'), name: d?.getAttribute('aria-labelledby'), knoepfe: [...(d?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim()), fokus: document.activeElement?.id }; }, 'Rückfrage-dom');
  await C('Rückfrage: NVDA+Tab', 'reportCurrentFocus');
  await K('Rückfrage: Esc (Fokus im Dialog auf Abbrechen)', 'Escape', { wait: 1500 });
  await K('Rückfrage: Esc', 'Escape', { wait: 1500 });
  await dom(page, () => ({ fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 50), dialog: !!document.querySelector('[role=dialog],dialog[open]') }), 'Nach Esc-dom');
  await K('Enter: Texte einsetzen (zweiter Versuch)', 'Enter', { wait: 1800 });
  await K('Rückfrage: Umschalt+Tab (Vorlage einsetzen)', 'Shift+Tab', { wait: 900 });
  await K('Enter: Vorlage einsetzen', 'Enter', { wait: 2500 });
  await ans(page, 'Einsetzen DOM-Ansagen'); await fokusDom(page, 'Nach Einsetzen Fokus-dom');
  await C('Nach Einsetzen: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ offen: document.querySelector('[data-testid=fb-ds-offen]')?.innerText, kr: document.querySelector('[data-testid=fb-ds-keine-rechtsberatung]')?.innerText, warnEin: document.querySelector('#fb-rt-ein-de-w')?.textContent }), 'Platzhalter-Hinweis-dom');
  for (let i = 0; i < 5; i++) await K('Pfeil unten (Hinweis lesen)', 'ArrowDown', { wait: 800 });
};

PH.c2c = async (page) => { // Datenschutz-Vorlage eingesetzt: Ansage und Lesen des Platzhalter-Hinweises
  await neuerPlan(page);
  await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click(); await page.waitForSelector('#fb-ds-form');
  await page.fill('#fb-ds-dauer', '10'); await page.fill('#fb-ds-zweck', 'Wie zufrieden sind Studierende mit dem Seminar?');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).focus(); await nachVorn();
  await K('Enter: Texte einsetzen (Plan ohne Texte, keine Rückfrage)', 'Enter', { wait: 3500 });
  await ans(page, 'Einsetzen DOM-Ansagen'); await fokusDom(page, 'Nach Einsetzen Fokus-dom');
  await C('Nach Einsetzen: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ offen: document.querySelector('[data-testid=fb-ds-offen]')?.innerText, warnEin: document.querySelector('#fb-rt-ein-de-w')?.textContent }), 'Platzhalter-Hinweis-dom');
  for (let i = 0; i < 6; i++) await K('Pfeil unten (Hinweis lesen)', 'ArrowDown', { wait: 900 });
};

PH.c3 = async (page) => {
  await neuerPlan(page);
  await fokusAuf(page, 'section.codes :is(h2,h3)');
  await C('Codes: NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 3; i++) await K('Codes: Pfeil unten', 'ArrowDown', { wait: 700 });
  await fokusAuf(page, 'section.codes :is(h2,h3)');
  await bis('Tab bis Anzahl', /fb-codes-anzahl/, { max: 6 });
  await C('Anzahl: NVDA+Tab', 'reportCurrentFocus');
  await T('Anzahl abc (Fehlerfall)', 'abc', { wait: 500 });
  await bis('Tab bis „Codes erzeugen“', /Codes erzeugen/, { max: 4 });
  await K('Fehlerfall: Enter', 'Enter', { wait: 1800 });
  await C('Fehlerfall Anzahl: NVDA+Tab', 'reportCurrentFocus');
  await page.fill('#fb-codes-anzahl', '5'); aufbau('Anzahl 5 per Skript');
  await bis('Tab bis „Codes erzeugen“', /Codes erzeugen/, { max: 6 });
  await K('Enter: Codes erzeugen', 'Enter', { wait: 2500 });
  await ans(page, 'Codes DOM-Ansagen'); await fokusDom(page, 'Nach Codes Fokus-dom');
  await C('Nach Codes: NVDA+Tab', 'reportCurrentFocus');
  await K('T: Tabelle', 'KeyT', { wait: 1200 });
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight'); await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight'); await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown'); await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await bis('Tab bis Haken in der Tabelle', /checkbox/, { max: 10 });
  await C('Haken: NVDA+Tab', 'reportCurrentFocus');
  await K('Leertaste', 'Space', { wait: 1000 });
  note('Codes-dom', await page.evaluate(() => JSON.stringify([...document.querySelectorAll('section.codes table.ct th')].map((h) => h.getAttribute('scope') + ':' + h.textContent.trim()))));
  // Export ohne Schlüssel (gesperrt)
  await page.locator('#fb-ex-knopf').scrollIntoViewIfNeeded(); await page.locator('#fb-ex-knopf').focus(); aufbau('Fokus per Skript auf Export-Knopf'); await nachVorn();
  await C('Export-Knopf: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Export-Menü auf', 'Enter', { wait: 1500 });
  await fokusDom(page, 'Menü auf Fokus-dom'); await ans(page, 'Menü auf DOM-Ansagen');
  await bis('Tab bis „Zum Verschicken“ (gesperrt)', /Verschicken|Link|Fragebogen-Datei/, { max: 30 });
  await C('Verschicken gesperrt: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter auf gesperrtem Eintrag', 'Enter', { wait: 1500 });
  await dom(page, () => ({ grund: document.querySelector('#fb-ex-versand-grund, #fb-ex-grund')?.innerText, disabled: document.querySelector('[data-testid=fb-versand-link]')?.getAttribute('aria-disabled') }), 'Sperrgrund-dom');
  await K('Esc', 'Escape', { wait: 1200 }); await fokusDom(page, 'Nach Esc Fokus-dom');
  // Schlüssel per Skript anlegen, Export frei
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.fill('#fb-schl-name', 'Probe'); await page.fill('#fb-schl-pw1', 'ein langes passwort 3n'); await page.fill('#fb-schl-pw2', 'ein langes passwort 3n');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
  await page.check('#fb-schl-gesichert'); await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click(); await page.waitForSelector('#fb-schl-pub');
  aufbau('Schlüssel per Skript angelegt (Messung in c1)');
  await page.locator('#fb-ex-knopf').scrollIntoViewIfNeeded(); await page.locator('#fb-ex-knopf').focus(); await nachVorn();
  if (!(await page.locator('#fb-ex-versand-t').count())) await K('Enter: Export-Menü auf', 'Enter', { wait: 1500 });
  await bis('Tab bis „Link“ / „Fragebogen-Datei“ (frei?)', /Link|Fragebogen-Datei|Verschicken/, { max: 30 });
  await C('Verschicken frei: NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => ({ link: document.querySelector('[data-testid=fb-versand-link]')?.getAttribute('aria-disabled'), datei: document.querySelector('[data-testid=fb-versand-datei]')?.getAttribute('aria-disabled'), station: document.querySelector('[data-testid=fb-versand-station]')?.getAttribute('aria-disabled') }), 'Frei-dom');
  await K('Enter: Link erzeugen', 'Enter', { wait: 2000 });
  await ans(page, 'Link DOM-Ansagen'); await fokusDom(page, 'Nach Link Fokus-dom');
  await C('Nach Link: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis „Link kopieren“', /Link kopieren/, { max: 6 });
  await K('Enter: Link kopieren', 'Enter', { wait: 1800 });
  await ans(page, 'Kopieren DOM-Ansagen');
};

PH.c3b = async (page) => { // Export „Zum Verschicken“ mit Schlüssel: Link-Feld und Kopieren; Codes-Tabelle mit Strg+Alt+Pfeilen
  await neuerPlan(page);
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.fill('#fb-schl-name', 'Probe'); await page.fill('#fb-schl-pw1', 'ein langes passwort 3n'); await page.fill('#fb-schl-pw2', 'ein langes passwort 3n');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
  await page.check('#fb-schl-gesichert'); await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click(); await page.waitForSelector('#fb-schl-pub');
  await page.locator('#fb-codes-anzahl').fill('5'); await page.getByRole('button', { name: 'Codes erzeugen' }).click(); await page.waitForSelector('section.codes table.ct tbody tr');
  aufbau('Schlüssel und 5 Codes per Skript');
  await fokusAuf(page, '#fb-codes-t');
  await K('T: Tabelle', 'KeyT', { wait: 1200 });
  await K('Pfeil unten: Titel', 'ArrowDown', { wait: 900 }); await K('Pfeil unten: erste Zelle', 'ArrowDown', { wait: 900 });
  await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight'); await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown'); await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft'); await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await page.locator('#fb-ex-knopf').scrollIntoViewIfNeeded(); await page.locator('#fb-ex-knopf').focus(); aufbau('Fokus per Skript auf Export-Knopf'); await nachVorn();
  await K('Enter: Export-Menü auf', 'Enter', { wait: 1500 });
  await page.getByTestId('fb-versand-link').focus(); await nachVorn(); aufbau('Fokus per Skript auf „Link zum Ausfüllen“ (Tab-Strecke in c3 gemessen)');
  await C('Link-Eintrag: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Link erzeugen', 'Enter', { wait: 2500 });
  await ans(page, 'Link DOM-Ansagen'); await fokusDom(page, 'Nach Link Fokus-dom');
  await C('Nach Link: NVDA+Tab', 'reportCurrentFocus');
  await K('Tab', 'Tab'); await K('Tab', 'Tab');
  await bis('Tab bis Link-Feld oder „Link kopieren“', /fb-ex-link|Link kopieren/, { max: 6 });
  await C('Link-Feld: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis „Link kopieren“', /Link kopieren/, { max: 4 });
  await K('Enter: Link kopieren', 'Enter', { wait: 1800 });
  await ans(page, 'Kopieren DOM-Ansagen');
};

PH.c4 = async (page) => {
  const S4 = join(DIR, 'sammel');
  await S.ctx.addInitScript(OBS);
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'testplan.statable-fragebogen.json')); await sleep(1000);
  await fokusAuf(page, '#fb-sam-t');
  await C('Sammelimport ohne Schlüssel: NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 4; i++) await K('Sammelimport: Pfeil unten', 'ArrowDown', { wait: 700 });
  await fokusAuf(page, '#fb-sam-t');
  await bis('Tab bis „Einlesen“ (leer: Fehlerfall)', /"Einlesen"/, { max: 14 });
  await K('Fehlerfall: Enter ohne Dateien und Schlüssel', 'Enter', { wait: 1800 });
  await C('Fehlerfall: NVDA+Tab', 'reportCurrentFocus'); await ans(page, 'Fehler DOM-Ansagen');
  // Schlüssel öffnen per Skript (Datei und Passwort), Dateien setzen
  // Aufbau (Skript): Schlüssel, Codes, Link, vier Antworten in eigenen Browser-Fenstern, Word-Dateien
  const PW = 'ein langes passwort 3n'; const Wd = join(DIR, 'word'); mkdirSync(Wd, { recursive: true });
  const speichern = async (name, klick) => { const [d] = await Promise.all([page.waitForEvent('download'), klick()]); await d.saveAs(name); };
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.fill('#fb-schl-name', 'NVDA Probe'); await page.fill('#fb-schl-pw1', PW); await page.fill('#fb-schl-pw2', PW);
  await speichern(join(S4, 'schluessel.statable-schluessel'), () => page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click());
  await page.check('#fb-schl-gesichert'); await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click(); await page.waitForSelector('#fb-schl-pub');
  await page.locator('#fb-codes-anzahl').fill('5'); await page.getByRole('button', { name: 'Codes erzeugen' }).click(); await page.waitForSelector('section.codes table.ct tbody tr');
  const codes = await page.locator('section.codes table.ct tbody tr').evaluateAll((trs) => trs.map((t) => (t.innerText.match(/[A-Z0-9]{4}-[A-Z0-9]{4}/) ?? [''])[0]));
  await speichern(join(Wd, 'code-liste.docx'), () => page.getByRole('button', { name: /Liste als Word speichern/ }).click());
  await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
  await page.getByTestId('fb-versand-link').click(); await page.getByTestId('fb-link-feld').waitFor();
  const link = await page.inputValue('#fb-ex-link'); const lokal = link.replace('https://statable.eu', BASE.replace(/\/$/, ''));
  const antwort = async (code, art, name) => {
    const c2 = await S.browser.newContext({ locale: 'de-DE', viewport: { width: 1200, height: 900 }, acceptDownloads: true }); const p = await c2.newPage();
    await p.goto(lokal); await p.waitForSelector('[data-schritt="einleitung"]');
    const w = () => p.locator('[data-weiter]').click();
    await w(); if (await p.locator('#einw').count()) { await p.locator('#einw').check(); await w(); }
    if (await p.locator('[data-schritt="code"]').count()) { await p.locator('#code').fill(code); await w(); }
    await p.locator('[data-seite="auswahl"]').waitFor(); await p.getByRole('radio', { name: 'Grün', exact: true }).check(); await p.getByRole('checkbox', { name: 'Radio', exact: true }).check(); await w();
    await p.locator('[data-seite="felder"]').waitFor(); await p.locator('[data-frage="Z"] input[type=number]').fill('42'); await w();
    await p.locator('[data-seite="rang"]').waitFor(); await p.getByRole('button', { name: 'Diese Reihenfolge übernehmen' }).click(); await w();
    await p.locator('[data-seite="block"]').waitFor();
    for (const [id, v] of [['B1', 4], ['B2', 2], ['B3', 5]]) await p.locator(`input[data-item="${id}"][value="${v}"]`).check();
    await w(); await p.locator('[data-weg="datei"]').waitFor();
    if (art === 'datei') { const [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-weg="datei"]').click()]); await d.saveAs(join(S4, name)); }
    else writeFileSync(join(S4, name), await p.inputValue('#antworttext'));
    await c2.close();
  };
  await antwort(codes[0], 'datei', 'antwort-1.age'); copyFileSync(join(S4, 'antwort-1.age'), join(S4, 'antwort-1-nochmal.age'));
  await antwort(codes[1], 'text', 'antwort-2.txt'); await antwort(codes[1], 'datei', 'antwort-3.age'); await antwort('ZZZZ-ZZZZ', 'datei', 'antwort-4.age');
  writeFileSync(join(S4, 'brief.txt'), 'Das ist keine Antwort, nur ein Brief.');
  await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click(); await page.waitForSelector('#fb-ds-form');
  await page.fill('#fb-ds-dauer', '10'); await page.fill('#fb-ds-zweck', 'Wie zufrieden sind Studierende mit dem Seminar?');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
  { const ja = page.getByRole('button', { name: 'Vorlage einsetzen' }); if (await ja.count()) await ja.click(); }
  await page.waitForSelector('[data-testid="fb-ds-offen"]');
  await speichern(join(Wd, 'teilnahme-information.docx'), () => page.getByRole('button', { name: 'Als Word speichern', exact: true }).click());
  const dateien = ['antwort-1.age', 'antwort-1-nochmal.age', 'antwort-3.age', 'antwort-4.age', 'brief.txt'].map((f) => join(S4, f));
  await page.setInputFiles('#fb-sam-datei', dateien);
  await page.fill('#fb-sam-text', readFileSync(join(S4, 'antwort-2.txt'), 'utf8'));
  aufbau('Schlüssel, Codes, Link, vier Antworten (eigene Fenster), Word-Dateien Codeliste und Teilnahme-Information, 5 Dateien gewählt, Text eingefügt (Skript; native Dateiauswahl nicht messbar)');
  await fokusAuf(page, '#fb-sam-t');
  await C('Sammelimport: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis Dateifeld', /fb-sam-datei/, { max: 8 });
  await C('Dateifeld: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis Textfeld', /fb-sam-text/, { max: 4 });
  await C('Textfeld: NVDA+Tab', 'reportCurrentFocus');
  await bis('Tab bis „Einlesen“', /"Einlesen"/, { max: 8 });
  await K('Enter: Einlesen', 'Enter', { wait: 4500 });
  await ans(page, 'Einlesen früh DOM-Ansagen');
  await ans(page, 'Einlesen DOM-Ansagen'); await fokusDom(page, 'Nach Einlesen Fokus-dom');
  await C('Nach Einlesen: NVDA+Tab', 'reportCurrentFocus');
  await K('Pfeil unten (lesen)', 'ArrowDown'); await K('Pfeil unten', 'ArrowDown');
  await K('T: Tabelle', 'KeyT', { wait: 1200 });
  await K('Pfeil unten: in die Tabelle', 'ArrowDown', { wait: 900 }); await K('Pfeil unten: erste Zelle', 'ArrowDown', { wait: 900 });
  for (let i = 0; i < 4; i++) await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown'); await K('Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft'); await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft'); await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  note('Ergebnis-dom', await page.evaluate(() => JSON.stringify({ caption: document.querySelector('.sam table.ct caption')?.textContent, kopf: [...document.querySelectorAll('.sam table.ct th')].map((h) => h.getAttribute('scope') + ':' + h.textContent.trim()), zeilen: [...document.querySelectorAll('.sam table.ct tbody tr')].map((t) => t.innerText.replace(/\s+/g, ' ').slice(0, 100)) })));
  await bis('Tab bis Haken „übernehmen“', /checkbox/, { max: 12 });
  await C('Haken: NVDA+Tab', 'reportCurrentFocus');
  await K('Leertaste: abwählen', 'Space', { wait: 1200 });
  await ans(page, 'Haken DOM-Ansagen'); await dom(page, () => document.querySelector('#fb-sam-summe')?.textContent, 'Summe-dom');
  await K('Pfeil unten (Summe lesen)', 'ArrowDown');
  // Rücklauf
  await fokusAuf(page, '#fb-sam-rl-t');
  await C('Rücklauf: NVDA+Tab', 'reportCurrentFocus');
  for (let i = 0; i < 8; i++) await K('Rücklauf: Pfeil unten', 'ArrowDown', { wait: 700 });
  await bis('Tab bis „Protokoll als Text“', /Protokoll als Text/, { max: 8 });
  await K('Enter: Protokoll als Text', 'Enter', { wait: 2500 }); await nachVorn();
  await (async () => { const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Protokoll als Word-Datei' }).click()]); await d.saveAs(join(DIR, 'word', 'sammelimport-protokoll.docx')); aufbau('Protokoll als Word-Datei per Skript gespeichert'); })();
  await ans(page, 'Protokoll DOM-Ansagen');
};

if (!PH[phase]) { console.log('Phase unbekannt', phase); process.exit(2); }
await mitNvda('planen-' + phase, PH[phase]);
