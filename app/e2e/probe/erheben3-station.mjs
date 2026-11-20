// Kopie von 3f für Stufe 3 (Prüfung 1-5). MODUS=handy (Pixel 7, Befragte 44 px) oder kontrast (forced-colors) oder normal. Tab-Durchlauf an der Einleitung.
// Stufe 3F: Erhebungsstation (#station) gegen die gebaute App (vite preview nach `npx vite build`).
// Aufruf: PORT=5199 node e2e/probe/3f-station.mjs
// Ablauf (je bei 1280 und 320 px Breite): Plan mit echtem age-Schlüssel öffnen → Station starten → zwei Personen füllen aus (zweite bleibt liegen: automatisch zur nächsten)
// → Zähler 2 → Sicherungsdatei speichern (Download) → mit dem ECHTEN `age -d -i` öffnen → Zähler 0 → beenden. axe in allen Zuständen (WCAG 2.2 AA), kein waagrechtes Scrollen.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const BASIS = process.env.BASIS || 'http://localhost:4231';
const MODUS = process.env.MODUS || 'normal';
import { devices } from '@playwright/test';
import { zielgroesse, tabWalk, kontrastmodus } from './erheben3-lib.mjs';
const AGE_DIR = process.env.AGE_DIR ?? join(homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'FiloSottile.age_Microsoft.Winget.Source_8wekyb3d8bbwe', 'age');
const exe = n => join(AGE_DIR, process.platform === 'win32' ? `${n}.exe` : n);
const lauf = (p, args, input) => spawnSync(exe(p), args, { input, env: { ...process.env, PATH: `${AGE_DIR}${delimiter}${process.env.PATH ?? ''}` }, maxBuffer: 1 << 26 });
if (!existsSync(exe('age'))) { console.log('age.exe nicht gefunden (AGE_DIR setzen)'); process.exit(2); }

const key = lauf('age-keygen', []);
const keyText = key.stdout.toString('utf8');
const identitaet = /(AGE-SECRET-KEY-1[A-Z0-9]+)/.exec(keyText)[1];
const pub = /public key: (age1[a-z0-9]+)/i.exec(keyText + '\n' + key.stderr.toString('utf8'))[1];
const tmp = mkdtempSync(join(tmpdir(), 'station-'));
const keyDatei = join(tmp, 'id.txt'); writeFileSync(keyDatei, identitaet + '\n');

const zw = (de, en) => ({ de, en });
const plan = {
  format: 'statable-fragebogen', version: 1, id: 'station-probe', revision: 1, titel: zw('Stationsumfrage', 'Station survey'), sprachen: ['de', 'en'],
  einleitung: zw('Danke, dass Sie mitmachen.', 'Thank you for taking part.'),
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: [{ id: 'farben', name: 'farben', geordnet: false, optionen: [
    { id: 'farben:1', wert: 1, text: zw('Rot', 'Red') }, { id: 'farben:2', wert: 2, text: zw('Grün', 'Green') }, { id: 'farben:3', wert: 3, text: zw('Blau', 'Blue') }] }],
  skalen: [],
  elemente: [{ art: 'seite', id: 's1', name: 's1', titel: zw('Ihre Meinung', 'Your opinion'), elemente: [
    { art: 'frage', id: 'F1', name: 'F1', typ: 'einfach', text: zw('Welche Farbe mögen Sie?', 'Which colour do you like?'), liste: 'farben', pflicht: { an: true }, kodebuch: { niveau: 'nominal' } },
    { art: 'frage', id: 'T', name: 'T', typ: 'text', text: zw('Was möchten Sie noch sagen?', 'Anything to add?'), text_: { mehrzeilig: false, maxZeichen: 80 }, kodebuch: { niveau: 'nominal' } },
  ] }],
  empfaenger: { schluessel: pub, name: 'Dr. Muster' }, geaendert: 1,
};
const planDatei = join(tmp, 'plan.statable-fragebogen.json');
writeFileSync(planDatei, JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan, bilder: {} }));

let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();

async function durchlauf(breite) {
  console.log(`\n=== Breite ${breite} px ===`);
  const geraet = MODUS === 'handy' ? devices['Pixel 7'] : {};
  const ctx = await b.newContext({ locale: 'de-DE', ...geraet, ...(MODUS === 'kontrast' ? { forcedColors: 'active' } : {}), viewport: MODUS === 'handy' ? geraet.viewport : { width: breite, height: breite < 500 ? 700 : 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
  const axe = async name => {
    await page.waitForTimeout(1000);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    ok(r.violations.length === 0, `axe ${name} (${breite}): ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
    if (MODUS === 'handy') await zielgroesse(page, `${name} (Handy)`, 44, 'dialog.station[open]');
    if (MODUS === 'kontrast') await kontrastmodus(page, name, 'dialog.station[open]');
  };
  const keinScroll = async name => {
    const w = await page.evaluate(() => { const d = document.querySelector('dialog.station[open]') ?? document.documentElement; return [d.scrollWidth, d.clientWidth]; });
    ok(w[0] <= w[1] + 1, `kein waagrechtes Scrollen ${name} (${w[0]} <= ${w[1]})`);
  };

  // Gesperrt ohne Plan mit Schlüssel
  await page.goto(BASIS + '/#station'); await page.waitForSelector('#st-t');
  ok(await page.getByTestId('st-ohne-schluessel').count() === 1 && await page.getByTestId('st-start').count() === 0, 'ohne Plan mit Schlüssel: gesperrt mit Satz, kein Startknopf');
  await axe('Station gesperrt');

  // Plan öffnen
  await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(planDatei);
  await page.waitForTimeout(800);
  await page.locator('#fb-ex-knopf').click();
  await page.waitForSelector('#fb-ex-versand-t');
  const eintrag = page.getByTestId('fb-versand-station');
  ok(await eintrag.count() === 1, 'Export-Menü: Eintrag „Erhebungsstation öffnen“ da');
  console.log('   aria-disabled =', await eintrag.getAttribute('aria-disabled'));
  await eintrag.click();
  await page.waitForSelector('#st-t');
  ok(page.url().endsWith('#station'), 'Eintrag führt zu #station');
  ok(await page.getByTestId('st-start').count() === 1, 'Station: Startknopf da (Plan mit Schlüssel)');
  await axe('Station Startseite'); await keinScroll('Startseite');

  // Starten
  await page.getByTestId('st-start').click();
  await page.waitForSelector('dialog.station[open] [data-schritt="einleitung"]');
  ok(await page.evaluate(() => document.activeElement?.tagName) === 'H1', 'Fokus nach dem Start auf der Überschrift (H1) des Fragebogens');
  ok((await page.getByTestId('st-zaehler').innerText()).includes('0 Antworten'), 'Zähler zeigt 0 Antworten');
  await axe('Station einleitung'); if (MODUS !== 'normal') await tabWalk(page, 'dialog.station[open]', 'Station einleitung'); await keinScroll('Einleitung');
  let draussen = 0;
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !a.closest('dialog.station'); })) draussen++; }
  ok(draussen === 0, 'Tab verlässt das Station-Fenster nie (App dahinter gesperrt)');

  const person = async (farbe, text, nummer) => {
    await page.locator('dialog.station [data-weiter]').click();
    await page.locator('dialog.station [data-seite="s1"]').waitFor();
    if (nummer === 1) { await axe('Station Seite'); await keinScroll('Seite'); }
    await page.getByRole('radio', { name: farbe, exact: true }).check();
    if (text) await page.locator('[data-frage="T"] [data-feld]').fill(text);
    await page.locator('dialog.station [data-weiter]').click();
    await page.locator('dialog.station [data-naechste]').waitFor();
  };

  await person('Rot', 'Geheimer Satz 4711', 1);
  ok((await page.locator('dialog.station [data-status]').innerText()).includes('verschlüsselt gespeichert'), 'Danke-Ansage: „… verschlüsselt gespeichert“');
  ok(await page.evaluate(() => document.activeElement?.tagName) === 'H2', 'Fokus auf der Überschrift „Danke“');
  ok(await page.locator('dialog.station [data-weg], dialog.station svg.qr, dialog.station textarea').count() === 0, 'kein Rückweg-Menü (Datei/Text/QR) in der Station');
  await axe('Station Danke'); await keinScroll('Danke');
  ok((await page.getByTestId('st-zaehler').innerText()).includes('1 Antwort'), 'Zähler: 1 Antwort');
  // IndexedDB: nur verschlüsselt
  const roh = await page.evaluate(async () => {
    const db = await new Promise((ok, f) => { const r = indexedDB.open('statable-station'); r.onsuccess = () => ok(r.result); r.onerror = () => f(r.error); });
    const out = []; for (const n of Array.from(db.objectStoreNames)) out.push(...await new Promise(ok => { const r = db.transaction(n).objectStore(n).getAll(); r.onsuccess = () => ok(r.result); }));
    db.close(); return JSON.stringify(out);
  });
  ok(roh.includes('BEGIN AGE ENCRYPTED FILE') && !roh.includes('Geheimer') && !roh.includes('4711'), 'IndexedDB enthält nur Armor-Text, keinen Klartext');
  const zwischen = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('statable-ausfuellen')).length);
  ok(zwischen === 0, 'kein Zwischenstand der Befragten im localStorage');

  // Automatisch zur nächsten Person (nach 20 s)
  await page.locator('dialog.station [data-schritt="einleitung"]').waitFor({ timeout: 26000 });
  ok(true, 'nach 20 Sekunden automatisch zurück zur Startseite des Fragebogens');
  ok(await page.getByRole('radio').count() === 0 && (await page.locator('dialog.station').innerText()).includes('Danke, dass Sie mitmachen'), 'Startseite wieder leer und ohne Antworten der Vorperson');

  await person('Grün', '', 2);
  await page.locator('dialog.station [data-naechste]').click();
  await page.locator('dialog.station [data-schritt="einleitung"]').waitFor();
  ok((await page.getByTestId('st-zaehler').innerText()).includes('2 Antworten'), 'Zähler: 2 Antworten');
  await page.locator('dialog.station [data-weiter]').click();
  await page.locator('dialog.station [data-seite="s1"]').waitFor();
  ok(await page.getByRole('radio', { name: 'Rot', exact: true }).isChecked() === false && await page.getByRole('radio', { name: 'Grün', exact: true }).isChecked() === false, 'nächste Person sieht keine Vorantworten');
  await page.locator('dialog.station [data-seite="s1"]').evaluate(() => {});

  // Beenden mit ungesicherten: Angebot zuerst
  await page.getByTestId('st-beenden').click();
  await page.getByTestId('st-ende-ungesichert').waitFor();
  ok((await page.getByTestId('st-ende-ungesichert').innerText()).includes('2 Antworten'), 'Beenden: Rückfrage nennt 2 ungesicherte Antworten');
  ok(await page.getByTestId('st-ende-sichern').count() === 1, 'Angebot „Sicherungsdatei speichern“ zuerst');
  ok(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'st-ende-zurueck', 'Fokus im Dialog auf „Zurück zur Station“');
  await axe('Beenden-Rückfrage');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok(await page.getByTestId('st-ende-ungesichert').isVisible() === false, 'Esc schließt die Rückfrage');
  ok(await page.getByTestId('st-sichern').count() === 1 && await page.locator('dialog.station[open]').count() === 1, 'Station läuft weiter');

  // Sicherungsdatei speichern
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('st-sichern').click()]);
  const datei = join(tmp, dl.suggestedFilename()); await dl.saveAs(datei);
  ok(/^statable-sicherung-\d{4}-\d{2}-\d{2}-\d+\.txt$/.test(dl.suggestedFilename()), 'Dateiname ' + dl.suggestedFilename());
  await page.waitForFunction(() => document.querySelector('[data-testid=st-zaehler]')?.textContent?.includes('0 Antworten'));
  ok(true, 'Zähler nach dem Speichern: 0 Antworten');
  ok((await page.getByTestId('st-leiste-status').innerText()).includes('gespeichert'), 'Rückmeldung in der Leiste: ' + (await page.getByTestId('st-leiste-status').innerText()).slice(0, 60));
  await axe('Station nach Sicherung'); await keinScroll('Leiste');

  // Mit echtem age öffnen
  const text = readFileSync(datei, 'utf8');
  const bloecke = text.match(/-----BEGIN AGE ENCRYPTED FILE-----[\s\S]*?-----END AGE ENCRYPTED FILE-----/g) ?? [];
  ok(bloecke.length === 2, 'Sicherungsdatei enthält 2 Armor-Blöcke');
  const saetze = bloecke.map(bl => { const r = lauf('age', ['-d', '-i', keyDatei], bl + '\n'); return r.status === 0 ? JSON.parse(r.stdout.toString('utf8')) : null; });
  ok(saetze.every(Boolean), 'beide Blöcke mit `age -d -i` entschlüsselt');
  const werte = saetze.filter(Boolean).map(s => s.werte);
  ok(werte.some(w => w.F1 === 1 && w.T === 'Geheimer Satz 4711') && werte.some(w => w.F1 === 2), 'Inhalt stimmt (Rot + Satz, Grün)');
  ok(saetze.every(s => s && s.plan.id === 'station-probe' && !('ip' in s)), 'Antwortsatz trägt Plan-id, keine IP');

  // Beenden ohne ungesicherte
  await page.getByTestId('st-beenden').click();
  await page.getByTestId('st-ende-ja').waitFor();
  await axe('Beenden ohne Ungesicherte');
  await page.getByTestId('st-ende-ja').click();
  await page.waitForSelector('dialog.station[open]', { state: 'detached' }).catch(() => {});
  ok(await page.locator('dialog.station[open]').count() === 0, 'Station beendet, Fenster zu');
  await page.waitForTimeout(600);
  const af = await page.evaluate(() => document.activeElement?.id + '/' + document.activeElement?.tagName); ok(af.startsWith('st-t'), 'Fokus nach dem Beenden auf der Überschrift der Seite (' + af + ')');
  await axe('Station nach dem Beenden'); await keinScroll('nach dem Beenden');
  await ctx.close();
}

if (MODUS === 'handy') await durchlauf(412); else if (MODUS === 'kontrast') await durchlauf(1280); else { await durchlauf(1280); await durchlauf(320); }
await b.close();
console.log(fehler ? `\n${fehler} Fehler` : '\nalles ok');
process.exit(fehler ? 1 : 0);
