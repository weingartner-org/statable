// NVDA-Messung Stufe 4 (Interviews): Phasen i1, i2, i3 (mit I4), i5678, i9, i10.
// Aufruf: NVDA_PORT=4242 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben4-lauf.mjs <phase>
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const phase = process.argv[2] ?? 'i1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4242}/`;
const DIR = resolve('public/beispiel/interview');
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const fokusDom = (page, tag) => dom(page, () => { const e = document.activeElement; return { fokus: e?.tagName + '#' + e?.id + ' ' + (e?.getAttribute('aria-label') || e?.textContent || e?.value || '').replace(/\s+/g, ' ').slice(0, 80), inDialog: !!e?.closest('dialog[open]') }; }, tag);
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6).map((a) => a.text), tag);
const aud = (page, tag) => dom(page, () => { const v = document.querySelector('video'); return v ? { t: Math.round(v.currentTime * 10) / 10, pausiert: v.paused, tempo: v.playbackRate } : null; }, tag);
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
const seite = async (page) => { await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await sleep(1200); };
const beispielPW = async (page) => { await page.locator('#iv-beispiel').click(); await page.waitForSelector('#iv-offen-t'); await sleep(3500); };

await mitNvda('e4-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();

  if (phase === 'i1') {
    await C('I1 NVDA+T (Titel)', 'reportTitle');
    await K('I1 Strg+Pos1', 'Control+Home');
    for (let i = 0; i < 12; i++) { const r = await K('I1 H ' + (i + 1), 'KeyH'); if (r && /Keine weitere|kein/i.test(r.gesagt.join(' '))) break; }
    await K('I1 Strg+Pos1', 'Control+Home');
    for (let i = 0; i < 12; i++) { const r = await K('I1 D ' + (i + 1), 'KeyD'); if (r && /Keine weitere|kein/i.test(r.gesagt.join(' '))) break; }
    await K('I1 Strg+Pos1', 'Control+Home');
    await C('I1 Elementliste NVDA+F7', 'browseModeElementsList', 3500);
    await C('I1 Fensterinhalt', 'readActiveWindow', 2500);
    await K('I1 Esc', 'Escape', { wait: 1500 });
    await K('I1 Strg+Pos1', 'Control+Home');
    // Sprunglinks per Tab
    await bis('I1 Tab bis „Zum Leitfaden“', /Zum Leitfaden|To the guide/, { max: 8 });
    await fokusDom(page, 'I1 vor Enter');
    await K('I1 Enter Sprunglink Leitfaden', 'Enter', { wait: 1200 });
    await fokusDom(page, 'I1 nach Enter');
  }

  if (phase === 'i1b') {
    await bis('I1b Tab bis „Zum Leitfaden“', /Zum Leitfaden|To the guide/, { max: 30 });
    await K('I1b Enter Sprunglink Leitfaden', 'Enter', { wait: 1200 });
    await fokusDom(page, 'I1b nach Enter'); await C('I1b NVDA+Tab', 'reportCurrentFocus');
    await bis('I1b Tab bis „Zu den Transkripten“', /Transkripten/, { max: 30, taste: 'Shift+Tab' }).catch(() => {});
  }

  if (phase === 'i2') {
    await page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(join(DIR, 'semesterplanung-de-atrain.txt'));
    await page.waitForSelector('dialog[open] #iv-zu-t'); await sleep(1500);
    aufbau('Datei semesterplanung-de-atrain.txt per Skript gesetzt (Dateiwahl-Fenster ausgelassen); Dialog öffnete sich');
    await page.bringToFront(); await nachVorn();
    await fokusDom(page, 'I2 Fokus nach Öffnen (DOM)');
    await C('I2 NVDA+Tab', 'reportCurrentFocus');
    await K('I2 Tab 1 (Name)', 'Tab');
    await K('I2 Tab 2 (Fall-Gruppe)', 'Tab'); await C('I2 NVDA+Tab (Fall-Radio)', 'reportCurrentFocus');
    await K('I2 Tab 3 (Namensfeld Person 1)', 'Tab'); await C('I2 NVDA+Tab', 'reportCurrentFocus');
    await K('I2 Tab 4 (Rolle)', 'Tab'); await C('I2 NVDA+Tab (Rolle-Radio)', 'reportCurrentFocus');
    await K('I2 Pfeil oben (Rolle: wird befragt)', 'ArrowUp'); await K('I2 Pfeil oben (Rolle: führt das Interview)', 'ArrowUp');
    await K('I2 Pfeil unten', 'ArrowDown');
    await K('I2 Tab 5 (gleiche Person)', 'Tab'); await K('I2 Tab 6 (Person 2 Name)', 'Tab');
    await K('I2 Tab 7 (Rolle Person 2)', 'Tab'); await C('I2 NVDA+Tab', 'reportCurrentFocus');
    await K('I2 Tab 8', 'Tab'); await K('I2 Tab 9 (Übernehmen)', 'Tab'); await K('I2 Tab 10 (Abbrechen)', 'Tab');
    await K('I2 Tab 11 (Dialog gefangen? sonst Browser)', 'Tab');
    await fokusDom(page, 'I2 Fokus nach Tab 11');
    await page.evaluate(() => document.querySelector('dialog[open] button.leise')?.focus()); await nachVorn();
    aufbau('Fokus per Skript auf „Abbrechen“ zurückgesetzt (Tab 11 verließ ggf. den Dialog; Messgrenze 5)');
    await dom(page, () => ({ radios: [...document.querySelectorAll('dialog[open] input[type=radio]')].map((r) => (r.labels[0]?.textContent ?? '') + ':' + r.checked) }), 'I2 Radiostand-DOM');
    await K('I2 Esc (1)', 'Escape', { wait: 1500 });
    await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]') }), 'I2 nach Esc 1');
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) await K('I2 Esc (2)', 'Escape', { wait: 1500 });
    await fokusDom(page, 'I2 Fokus nach Esc (DOM)'); await ans(page, 'I2 DOM-Ansagen');
    await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]') }), 'I2 dialog offen?');
  }

  if (phase === 'i2b') {
    await page.evaluate(() => { window.__tasten = []; document.addEventListener('keydown', (e) => window.__tasten.push(e.key + '@' + (e.target.tagName + '#' + e.target.id)), true); });
    await page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(join(DIR, 'semesterplanung-de-atrain.txt'));
    await page.waitForSelector('dialog[open] #iv-zu-t'); await sleep(1500);
    await page.bringToFront(); await nachVorn();
    aufbau('Dialog offen; Tastenlauscher im Dokument (Erfassungsphase)');
    await K('I2b Tab (Name)', 'Tab');
    await K('I2b Esc aus Textfeld', 'Escape', { wait: 1500 });
    await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]'), tasten: window.__tasten.slice(-4) }), 'I2b nach Esc aus Textfeld');
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) {
      await K('I2b Esc aus Textfeld (2)', 'Escape', { wait: 1500 });
      await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]'), tasten: window.__tasten.slice(-4) }), 'I2b nach Esc 2');
    }
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) {
      await K('I2b Tab zu Radio', 'Tab'); await K('I2b Esc aus Radio', 'Escape', { wait: 1500 });
      await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]'), tasten: window.__tasten.slice(-4) }), 'I2b nach Esc Radio');
    }
    await fokusDom(page, 'I2b Fokus'); await ans(page, 'I2b DOM-Ansagen');
  }

  if (phase === 'i2c') {
    await page.focus('#iv-einlesen'); await frisch(page);
    await page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(join(DIR, 'semesterplanung-de-atrain.txt'));
    await page.waitForSelector('dialog[open] #iv-zu-t'); await sleep(1500);
    aufbau('Fokus auf „Transkript einlesen“ (wie nach echtem Klick), Datei per Skript gesetzt');
    await page.bringToFront(); await nachVorn();
    await C('I2c NVDA+Tab', 'reportCurrentFocus');
    await K('I2c Tab (Name)', 'Tab');
    await K('I2c Esc (1)', 'Escape', { wait: 1500 });
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) await K('I2c Esc (2)', 'Escape', { wait: 1500 });
    await dom(page, () => ({ dialogOffen: !!document.querySelector('dialog[open]') }), 'I2c Dialog offen?');
    await fokusDom(page, 'I2c Fokus nach Schließen'); await ans(page, 'I2c DOM-Ansagen');
    await C('I2c NVDA+Tab', 'reportCurrentFocus');
    // Übernehmen mit Tastatur
    await K('I2c Enter (Transkript einlesen: Dateiwahl öffnet sich nicht, Skript)', 'Home').catch(() => {});
  }

  if (phase === 'i7' || phase === 'i7b') {
    await beispielPW(page); aufbau('Beispielinterview per Skript geladen (nicht gemessen)');
    await page.focus('#iv-hin-kopf'); await frisch(page); await nachVorn();
    await C('I7 NVDA+Tab (Hinweise-Knopf)', 'reportCurrentFocus');
    await K('I7 Enter (aufklappen)', 'Enter', { wait: 1500 });
    if (phase === 'i7') { for (let i = 0; i < 9; i++) await K('I7 Pfeil unten (Liste lesen) ' + (i + 1), 'ArrowDown'); await page.focus('#iv-hin-kopf'); await nachVorn(); aufbau('Fokus per Skript zurück auf den Hinweise-Knopf'); }
    await K('I7 Tab: erste Zeile', 'Tab');
    await K('I7 Enter: Zur Stelle', 'Enter', { wait: 1800 });
    await fokusDom(page, 'I7 Fokus nach Zur Stelle'); await ans(page, 'I7 DOM-Ansagen');
    await C('I7 NVDA+Tab (Beitragsüberschrift)', 'reportCurrentFocus');
    await K('I7 Tab (nach „Zur Stelle“: nächstes Element)', 'Tab');
    await page.focus('#iv-hin-kopf'); await nachVorn(); aufbau('Fokus per Skript zurück auf den Hinweise-Knopf');
    await K('I7 Tab (1)', 'Tab'); await K('I7 Tab (2)', 'Tab'); await K('I7 Tab (3: Übernehmen)', 'Tab');
    await K('I7 Enter Übernehmen', 'Enter', { wait: 1800 });
    await fokusDom(page, 'I7 Fokus nach Übernehmen'); await ans(page, 'I7 DOM-Ansagen Übernehmen');

  }

  if (phase === 'i3') {
    await page.focus('#iv-beispiel'); await frisch(page);
    aufbau('Fokus per Skript auf „Beispielinterview laden“ gesetzt');
    await K('I3 NVDA: Fokus lesen', 'Shift+Tab').catch(() => {}); await K('I3 Tab zurück', 'Tab');
    await K('I3 Enter Beispielinterview laden', 'Enter', { wait: 5000 });
    await fokusDom(page, 'I3 Fokus nach Laden'); await ans(page, 'I3 DOM-Ansagen');
    await C('I3 NVDA+Tab', 'reportCurrentFocus');
    await aud(page, 'I3 Audio nach Laden');
    // Überschriften
    for (let i = 0; i < 14; i++) await K('I3 H ' + (i + 1), 'KeyH');
    await K('I3 Tab (Knopf im Beitrag)', 'Tab'); await K('I3 Tab', 'Tab'); await K('I3 Tab', 'Tab');
    await fokusDom(page, 'I3 Fokus');
  }

  if (phase === 'i4') {
    await beispielPW(page); aufbau('Beispielinterview per Skript geladen (nicht gemessen)');
    await page.focus('#iv-bh-1'); await frisch(page); await nachVorn();
    await C('I4 Start NVDA+Tab (Fokus auf Beitragsüberschrift)', 'reportCurrentFocus');
    await aud(page, 'I4 vorher');
    await K('I4 F4 (Lesemodus, Beitragsüberschrift): Abspielen', 'F4', { wait: 3500 });
    await aud(page, 'I4 nach F4 + 3,5 s'); await ans(page, 'I4 DOM-Ansagen');
    await K('I4 F9: 5 s vor (beim Abspielen)', 'F9', { wait: 1500 }); await aud(page, 'I4 nach F9');
    await K('I4 F8: 5 s zurück', 'F8', { wait: 1500 }); await aud(page, 'I4 nach F8');
    await K('I4 Umschalt+F9: schneller', 'Shift+F9', { wait: 1500 }); await aud(page, 'I4 nach Umschalt+F9');
    await K('I4 Umschalt+F8: langsamer', 'Shift+F8', { wait: 1500 }); await aud(page, 'I4 nach Umschalt+F8');
    await K('I4 F4: Anhalten', 'F4', { wait: 2000 }); await aud(page, 'I4 nach Anhalten'); await ans(page, 'I4 DOM-Ansagen Anhalten');
    await K('I4 F4: wieder Abspielen (Rücksprung)', 'F4', { wait: 2500 }); await aud(page, 'I4 nach 2. F4');
    await K('I4 F4: Anhalten', 'F4', { wait: 1500 });
    // Im Textfeld
    await page.focus('#iv-b-ed-1'); await nachVorn();
    await K('I4 Enter: Bearbeiten', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I4 Fokus im Textfeld');
    await K('I4 Textfeld F4: Abspielen', 'F4', { wait: 3000 }); await aud(page, 'I4 Textfeld nach F4');
    await K('I4 Textfeld F9', 'F9', { wait: 1500 }); await aud(page, 'I4 Textfeld nach F9');
    await K('I4 Textfeld F8', 'F8', { wait: 1500 }); await aud(page, 'I4 Textfeld nach F8');
    await K('I4 Textfeld F4: Anhalten', 'F4', { wait: 2000 }); await aud(page, 'I4 Textfeld nach Anhalten');
    await K('I4 Textfeld Umschalt+F4: Zeitmarke', 'Shift+F4', { wait: 1500 });
    await dom(page, () => ({ text: document.getElementById('iv-b-text')?.value.slice(-40) }), 'I4 Textende-DOM'); await ans(page, 'I4 DOM-Ansagen Zeitmarke');
    await K('I4 Esc: Bearbeiten abbrechen', 'Escape', { wait: 1500 });
    await fokusDom(page, 'I4 Fokus nach Esc');
    await K('I4 Knopf Abspielen: Enter (Tab bis dahin)', 'Tab');
  }

  if (phase === 'i5678') {
    await beispielPW(page); aufbau('Beispielinterview per Skript geladen (nicht gemessen)');
    // I5
    await page.focus('#iv-ab-zeit'); await frisch(page); await nachVorn();
    await C('I5 NVDA+Tab (Zeitfeld)', 'reportCurrentFocus');
    await T('I5 tippen „abc“', 'abc'); await K('I5 Enter (falsch)', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I5 Fokus'); await ans(page, 'I5 DOM-Ansagen');
    await C('I5 NVDA+Tab (Fehlerfeld)', 'reportCurrentFocus');
    await K('I5 Strg+A', 'Control+KeyA'); await T('I5 tippen „0:10“', '0:10'); await K('I5 Enter (richtig)', 'Enter', { wait: 1500 });
    await ans(page, 'I5 DOM-Ansagen richtig'); await aud(page, 'I5 Audio');
    // I6
    await page.focus('#iv-b-ed-0'); await nachVorn();
    await C('I6 NVDA+Tab (Bearbeiten-Knopf)', 'reportCurrentFocus');
    await K('I6 Enter Bearbeiten', 'Enter', { wait: 1500 });
    await C('I6 NVDA+Tab (Textfeld)', 'reportCurrentFocus');
    await fokusDom(page, 'I6 Fokus'); await frisch(page);
    await K('I6 Strg+Ende', 'Control+End'); await T('I6 tippen', ' Test');
    await K('I6 Strg+Enter (übernehmen)', 'Control+Enter', { wait: 1800 });
    await fokusDom(page, 'I6 Fokus nach Übernehmen'); await ans(page, 'I6 DOM-Ansagen');
    await K('I6 Enter Bearbeiten (2)', 'Enter', { wait: 1500 });
    await K('I6 Esc (abbrechen)', 'Escape', { wait: 1800 });
    await fokusDom(page, 'I6 Fokus nach Esc'); await ans(page, 'I6 DOM-Ansagen Esc');
    // Bearbeiten: Sprecher-Auswahl und Umbau-Knöpfe lesen
    await K('I6 Enter Bearbeiten (3)', 'Enter', { wait: 1500 });
    await K('I6 Tab', 'Tab'); await K('I6 Tab', 'Tab'); await K('I6 Tab', 'Tab'); await K('I6 Tab', 'Tab'); await K('I6 Tab', 'Tab');
    await K('I6 Esc', 'Escape', { wait: 1500 }); await fokusDom(page, 'I6 Fokus nach Esc 3');
    // I7
    await page.focus('#iv-hin-kopf'); await frisch(page); await nachVorn();
    await C('I7 NVDA+Tab (Hinweise-Knopf)', 'reportCurrentFocus');
    await K('I7 Enter (aufklappen)', 'Enter', { wait: 1500 });
    await dom(page, () => ({ offen: document.getElementById('iv-hin-kopf').getAttribute('aria-expanded'), n: document.querySelectorAll('#iv-hin-inhalt li').length }), 'I7 DOM');
    for (let i = 0; i < 8; i++) await K('I7 Tab ' + (i + 1), 'Tab');
    await bis('I7 Tab bis „Zur Stelle“', /Zur Stelle/, { max: 12 });
    await K('I7 Enter Zur Stelle', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I7 Fokus nach Zur Stelle'); await C('I7 NVDA+Tab', 'reportCurrentFocus');
    await page.focus('#iv-hin-kopf'); await nachVorn();
    for (let i = 0; i < 30; i++) { const r = await K('I7 Tab nach Übernehmen ' + (i + 1), 'Tab'); if (r && /Übernehmen|Vorschlag/.test(r.z?.fokus ?? '')) break; }
    await K('I7 Enter Übernehmen', 'Enter', { wait: 1800 });
    await fokusDom(page, 'I7 Fokus nach Übernehmen'); await ans(page, 'I7 DOM-Ansagen');
    // I8
    await page.evaluate(() => document.querySelector('table.tab')?.scrollIntoView()); await nachVorn();
    await page.focus('#iv-hin-kopf'); await nachVorn();
    await K('I8 Strg+Pos1 nicht nötig; T: nächste Tabelle', 'KeyT', { wait: 1500 });
    await K('I8 Pfeil unten', 'ArrowDown');
    for (let i = 0; i < 7; i++) await K('I8 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await K('I8 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
    for (let i = 0; i < 3; i++) await K('I8 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('I8 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
    await K('I8 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await C('I8 NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'i9') {
    await page.locator('#lf-neu').click(); await sleep(800);
    await page.fill('#lf-sam-text', 'Wie planst du deine Woche?\nWarum bist du eigentlich Student und hast du schon immer gewusst, dass du das willst?\nWie alt bist du?\nWelche Rolle spielt der Kalender für dich?');
    await page.getByRole('button', { name: /Fragen hinzufügen/ }).click(); await sleep(600);
    aufbau('Leitfaden angelegt, vier Fragen per Skript gesammelt (nicht gemessen)');
    await page.locator('.schritte button').nth(1).focus(); await frisch(page); await nachVorn();
    await C('I9 NVDA+Tab (Schrittknopf 2)', 'reportCurrentFocus');
    await K('I9 Enter: Schritt 2', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I9 Fokus'); await ans(page, 'I9 DOM-Ansagen');
    await C('I9 NVDA+Tab (Überschrift)', 'reportCurrentFocus');
    await K('I9 Pfeil unten (lesen)', 'ArrowDown'); await K('I9 Pfeil unten', 'ArrowDown');
    // zur zweiten Frage (mit Hinweis)
    await page.locator('fieldset.frage').nth(1).locator('input[type=radio]').first().focus(); await nachVorn();
    await C('I9 Betreten Frage 2: NVDA+Tab (Gruppe, Beschreibung)', 'reportCurrentFocus');
    await K('I9 Pfeil unten (Streichen)', 'ArrowDown'); await ans(page, 'I9 DOM-Ansagen Streichen');
    await K('I9 Pfeil unten (Kurzfragebogen)', 'ArrowDown');
    await K('I9 Pfeil oben', 'ArrowUp'); await K('I9 Pfeil oben', 'ArrowUp');
    await K('I9 Tab', 'Tab');
    await K('I9 Shift+Tab', 'Shift+Tab'); await K('I9 Shift+Tab (aus der Gruppe heraus)', 'Shift+Tab');
    // Frage 1 wieder behalten, damit alle Fragen sortierbar sind; Frage 3 auch behalten (Standardstatus?)
    await page.locator('.k', { hasText: 'Weiter zu Schritt' }).focus(); await nachVorn();
    await K('I9 Enter: Weiter zu Schritt 3', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I9 Fokus Schritt 3'); await ans(page, 'I9 DOM-Ansagen');
    await page.fill('#lf-so-neu', 'Wochenplanung'); await page.getByRole('button', { name: 'Block anlegen' }).click(); await sleep(500);
    await page.fill('#lf-so-neu', 'Hilfsmittel'); await page.getByRole('button', { name: 'Block anlegen' }).click(); await sleep(500);
    aufbau('Zwei Blöcke per Skript angelegt');
    await page.locator('ul.fragen select').first().focus(); await frisch(page); await nachVorn();
    await C('I9 NVDA+Tab (Block für Frage)', 'reportCurrentFocus');
    await K('I9 Pfeil unten (Auswahl ändern)', 'ArrowDown', { wait: 1500 });
    await dom(page, () => ({ wert: document.querySelector('ul.fragen select')?.selectedOptions[0]?.textContent }), 'I9 Auswahl-DOM'); await ans(page, 'I9 DOM-Ansagen Zuordnen');
    await page.locator('ol.bloecke li').nth(1).locator('button').first().focus(); await frisch(page); await nachVorn();
    await C('I9 NVDA+Tab (Block nach oben)', 'reportCurrentFocus');
    await K('I9 Enter: Block nach oben', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I9 Fokus nach Verschieben'); await ans(page, 'I9 DOM-Ansagen Verschieben');
    await C('I9 NVDA+Tab', 'reportCurrentFocus');
    await K('I9 Enter (ganz oben schon)', 'Enter', { wait: 1500 }); await ans(page, 'I9 DOM-Ansagen oben');
    // Block entfernen: Rückfrage (auch I10-Muster)
    await page.locator('ol.bloecke li').nth(0).locator('button').nth(2).focus(); await nachVorn();
    await K('I9 Enter: Block entfernen → Rückfrage', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I9 Fokus Rückfrage'); await C('I9 NVDA+Tab (Rückfrage)', 'reportCurrentFocus');
    for (let i = 0; i < 4; i++) await K('I9 Rückfrage Tab ' + (i + 1), 'Tab');
    await K('I9 Esc (Rückfrage)', 'Escape', { wait: 1500 }); await K('I9 Esc (Rückfrage 2)', 'Escape', { wait: 1500 });
    await fokusDom(page, 'I9 Fokus nach Rückfrage'); await dom(page, () => ({ dlg: !!document.querySelector('dialog[open]') }), 'I9 Dialog offen?');
  }

  if (phase === 'i9b') {
    await page.locator('#lf-neu').click(); await sleep(500);
    await page.fill('#lf-sam-text', 'Wie planst du deine Woche?'); await page.getByRole('button', { name: /Fragen hinzufügen/ }).click(); await sleep(400);
    await page.locator('.schritte button').nth(2).click(); await sleep(400);
    for (const t of ['Wochenplanung', 'Hilfsmittel']) { await page.fill('#lf-so-neu', t); await page.getByRole('button', { name: 'Block anlegen' }).click(); await sleep(300); }
    aufbau('Leitfaden mit Frage und zwei Blöcken per Skript angelegt (nicht gemessen)');
    await page.locator('ol.bloecke li').nth(0).locator('button').nth(2).focus(); await frisch(page); await nachVorn();
    await C('I9b NVDA+Tab (Block entfernen)', 'reportCurrentFocus');
    await K('I9b Enter: Rückfrage', 'Enter', { wait: 1500 });
    await K('I9b Esc (1)', 'Escape', { wait: 1500 });
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) await K('I9b Esc (2)', 'Escape', { wait: 1500 });
    await fokusDom(page, 'I9b Fokus nach Esc'); await ans(page, 'I9b DOM-Ansagen');
    await C('I9b NVDA+Tab', 'reportCurrentFocus');
    await K('I9b Enter: Rückfrage (2)', 'Enter', { wait: 1500 });
    await K('I9b Shift+Tab (zu „Block entfernen“)', 'Shift+Tab');
    await fokusDom(page, 'I9b Fokus');
    await K('I9b Enter: Block entfernen bestätigen', 'Enter', { wait: 1800 });
    await fokusDom(page, 'I9b Fokus nach Entfernen'); await ans(page, 'I9b DOM-Ansagen Entfernen');
    await C('I9b NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'i10') {
    // Kodierleitfaden: drei Codes per Skript anlegen (Hauptkategorie A, B; Unterkategorie A1)
    const neu = async (name, vater) => {
      if (vater) await page.locator(`button[data-akt=unter][aria-label$="${vater}"]`).click(); else await page.locator('#kodl-neu-haupt').click();
      await page.fill('#kodl-name', name); await page.getByRole('button', { name: 'Speichern' }).click(); await sleep(500);
    };
    await neu('Zeitplanung'); await neu('Hilfsmittel'); await neu('Kalender', 'Zeitplanung'); await neu('Prokrastination');
    aufbau('Vier Kategorien per Skript angelegt: Zeitplanung (mit Unterkategorie Kalender), Hilfsmittel, Prokrastination');
    await page.locator('#kodl-h').scrollIntoViewIfNeeded(); await page.focus('#kodl-h'); await frisch(page); await nachVorn();
    await C('I10 NVDA+Tab (Überschrift Kodierleitfaden)', 'reportCurrentFocus');
    await K('I10 Pfeil unten (lesen) 1', 'ArrowDown'); await K('I10 Pfeil unten 2', 'ArrowDown'); await K('I10 Pfeil unten 3', 'ArrowDown'); await K('I10 Pfeil unten 4', 'ArrowDown');
    await K('I10 L: nächste Liste', 'KeyL'); await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown');
    await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown'); await K('I10 Pfeil unten', 'ArrowDown');
    // Verschieben: „Nach unten: Zeitplanung“ (Hauptkategorie)
    await page.locator('button[data-akt=unten][aria-label$="Zeitplanung"]').focus(); await frisch(page); await nachVorn();
    await C('I10 NVDA+Tab (Nach unten: Zeitplanung)', 'reportCurrentFocus');
    await K('I10 Enter: Zeitplanung nach unten', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I10 Fokus nach Verschieben'); await ans(page, 'I10 DOM-Ansagen Verschieben');
    await C('I10 NVDA+Tab', 'reportCurrentFocus');
    await page.locator('button[data-akt=tiefer][aria-label$="Prokrastination"]').focus(); await frisch(page); await nachVorn();
    await K('I10 Enter: Prokrastination eine Ebene tiefer', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I10 Fokus nach Ebene tiefer'); await ans(page, 'I10 DOM-Ansagen Ebene tiefer');
    await C('I10 NVDA+Tab', 'reportCurrentFocus');
    await page.locator('button[data-akt=hoeher][aria-label$="Kalender"]').focus(); await frisch(page); await nachVorn();
    await K('I10 Enter: Kalender eine Ebene höher', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I10 Fokus nach Ebene höher'); await ans(page, 'I10 DOM-Ansagen Ebene höher');
    // Entfernen: Rückfrage
    await page.locator('button[data-akt=entfernen][aria-label$="Hilfsmittel"]').focus(); await frisch(page); await nachVorn();
    await C('I10 NVDA+Tab (Entfernen: Hilfsmittel)', 'reportCurrentFocus');
    await K('I10 Enter: Entfernen → Rückfrage', 'Enter', { wait: 1500 });
    await fokusDom(page, 'I10 Fokus Rückfrage'); await C('I10 NVDA+Tab (Rückfrage)', 'reportCurrentFocus');
    await K('I10 Rückfrage Umschalt+Tab (zu „Entfernen“)', 'Shift+Tab'); await K('I10 Rückfrage Tab (zurück zu „Abbrechen“)', 'Tab');
    await fokusDom(page, 'I10 Fokus nach Umschalt+Tab, Tab');
    await K('I10 Esc (Rückfrage)', 'Escape', { wait: 1500 });
    await dom(page, () => ({ dlg: !!document.querySelector('dialog[open]') }), 'I10 Dialog offen?');
    if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) await K('I10 Esc (2)', 'Escape', { wait: 1500 });
    await fokusDom(page, 'I10 Fokus nach Rückfrage');
    await page.locator('button[data-akt=entfernen][aria-label$="Hilfsmittel"]').focus(); await nachVorn();
    await K('I10 Enter: Entfernen → Rückfrage (2)', 'Enter', { wait: 1500 });
    await K('I10 Tab bis „Entfernen“ in Rückfrage', 'Tab'); await fokusDom(page, 'I10 vor Enter');
    await K('I10 Enter (bestätigen)', 'Enter', { wait: 1800 });
    await fokusDom(page, 'I10 Fokus nach Entfernen'); await ans(page, 'I10 DOM-Ansagen Entfernen');
    await C('I10 NVDA+Tab', 'reportCurrentFocus');
  }
  rec({ schritt: 'ende', notiz: 'Phase ' + phase + ' fertig' });
});
