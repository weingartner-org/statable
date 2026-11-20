// Stufe 5, Paket 5E1: Ablauf auf der Seite „Interviews“ (.qdpx einlesen, Fall-Code-Matrix, Übereinstimmung, Konsens, Word) mit axe in jedem Zustand.
// Aufruf aus app/ (Vorschau auf Port 4251 läuft):  node e2e/probe/erheben5e1-ablauf.mjs [de|en]
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const BASE = process.env.BASE || 'http://127.0.0.1:4251';
const sprache = process.argv[2] === 'en' ? 'en' : 'de';
const QDPX = fileURLToPath(new URL('../../src/lib/testdaten/qdpx/', import.meta.url));
const AUS = process.env.AUS || fileURLToPath(new URL('../../', import.meta.url));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = sprache === 'de'
  ? { einlesen: '.qdpx einlesen', erstellen: 'Tabelle erstellen', ueb: 'Überschneidungen berechnen', len: 'Segmentlängen berechnen', berechnen: 'Berechnen', beginnen: /Einigung beginnen/, weiter: 'Weiter', anlegen: 'Konsens anlegen', word: 'Protokoll als Word', begr: /Begründung/ }
  : { einlesen: 'Read in .qdpx', erstellen: 'Create table', ueb: 'Calculate overlaps', len: 'Calculate passage lengths', berechnen: 'Calculate', beginnen: /Start the agreement/, weiter: 'Next', anlegen: 'Create consensus', word: 'Protocol as Word', begr: /Reason/ };

const b = await chromium.launch();
const ctx = await b.newContext({ locale: sprache === 'en' ? 'en-US' : 'de-DE', viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, colorScheme: 'light' });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', e => fehler.push('Seitenfehler: ' + e.message.slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 300)); });
let verstoesse = 0; const bericht = [];
const log = (...a) => { console.log(...a); bericht.push(a.join(' ')); };

async function axe(name, selektor) {
  const bauer = new AxeBuilder({ page }).withTags(TAGS);
  if (selektor) bauer.include(selektor);
  const r = await bauer.analyze();
  verstoesse += r.violations.length;
  log(`axe ${name}: ${r.violations.length} Verstöße`);
  for (const v of r.violations) log('   ', v.id, v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '')).join(' ;; ').slice(0, 400));
}
const fokus = () => page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}#${e.id} "${(e.textContent || '').trim().slice(0, 90)}"` : '-'; });
const ansagen = () => page.evaluate(() => [...document.querySelectorAll('#ansage-hoeflich, #ansage-dringend')].map(e => e.textContent).join(' | '));

await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#interviews`, { timeout: 240000 });
await page.waitForSelector('#iv-t', { timeout: 240000 });
await page.waitForTimeout(2500);
await axe('Seite ohne Daten', '#iv-qdpx-t, #iv-matrix-t, #iv-ueber-t');

// 1. .qdpx einlesen
await page.locator('input[type=file][accept=".qdpx"]').setInputFiles(QDPX + 'zwei-kodierende.qdpx');
await page.waitForSelector('#qx-erg-t', { timeout: 60000 });
await page.waitForTimeout(900);
log('Fokus nach dem Einlesen:', await fokus());
log('Ansage:', await ansagen());
log('Ergebnis:', (await page.locator('.qx').innerText()).slice(0, 900).replace(/\n+/g, ' / '));
await axe('qdpx-Bereich nach dem Einlesen', '.qx');

// 2. Fall-Code-Matrix
await page.getByRole('button', { name: T.erstellen }).click();
await page.waitForSelector('#qm-erg-t');
log('Fokus Matrix:', await fokus());
log('Matrix:', (await page.locator('.matrix table').first().innerText()).replace(/\s+/g, ' ').slice(0, 500));
await axe('Matrix 0/1', '.matrix');
await page.getByRole('button', { name: T.ueb }).click();
await page.waitForSelector('#qm-ueb-erg-t');
await page.getByRole('button', { name: T.len }).click();
await page.waitForSelector('#qm-len-erg-t');
await axe('Matrix mit Überschneidungen und Längen', '.matrix');
await page.selectOption('#qm-art', 'anzahl');
await page.getByRole('button', { name: T.erstellen }).click();
await page.waitForTimeout(400);
log('Matrix Anzahl:', (await page.locator('.matrix table').first().innerText()).replace(/\s+/g, ' ').slice(0, 300));

// 3. Übereinstimmung
await page.locator('#qu-berechnen').click();
await page.waitForSelector('#qu-erg-t');
log('Fokus Übereinstimmung:', await fokus());
log('Ergebnis Übereinstimmung:', (await page.locator('.ue').innerText()).replace(/\s+/g, ' ').slice(0, 1800));
await axe('Übereinstimmung', '.ue');

// 4. Konsens
await page.getByRole('button', { name: T.beginnen }).click();
await page.waitForSelector('#qk-t');
await page.waitForTimeout(300);
log('Fokus nach Einigung beginnen:', await fokus());
const legende = await page.locator('#qk-leg').innerText();
log('Legende:', legende);
await axe('Konsens erste Abweichung', '.konsens');
// Weiter ohne Begründung nach gewählter Option: Fehler
await page.locator('input[name="qk-wahl"]').first().check();
await page.getByRole('button', { name: T.weiter }).click();
await page.waitForTimeout(400);
log('Fehler Begründung sichtbar:', await page.locator('#qk-begr-fehl').count(), '| Fokus:', await fokus(), '| Ansage:', await ansagen());
await axe('Konsens mit Fehler', '.konsens');
await page.fill('#qk-begr', 'Die Definition passt');
await page.getByRole('button', { name: T.weiter }).click();
await page.waitForTimeout(400);
log('Fokus nach Weiter:', await fokus());
log('Fortschritt:', await page.locator('#qk-fortschritt').innerText());
// zweite Entscheidung mit Regel
await page.locator('input[name="qk-wahl"]').nth(1).check();
await page.fill('#qk-begr', 'Zu unklar');
await page.locator('.konsens input[type=checkbox]').first().check();
await page.fill('#qk-regel-text', 'Nur ganze Sätze kodieren.');
await axe('Konsens mit Regel', '.konsens');
await page.getByRole('button', { name: T.weiter }).click().catch(() => {});
log('Fortschritt:', await page.locator('#qk-fortschritt').innerText());
await page.getByRole('button', { name: T.anlegen }).click();
await page.waitForSelector('#qk-erg-t', { timeout: 15000 }).catch(async () => { log('KEIN Ergebnis. Fehler:', fehler.join(' || '), '| Text:', (await page.locator('.konsens').first().innerText()).replace(/\s+/g, ' ').slice(-600)); throw new Error('Konsens anlegen ohne Ergebnis'); });
await page.waitForTimeout(900);
log('Fokus nach Anlegen:', await fokus(), '| Ansage:', await ansagen());
log('Konsens-Ergebnis:', (await page.locator('#qk-erg').innerText()).replace(/\s+/g, ' ').slice(0, 700));
await axe('Konsens-Ergebnis', '#qk-erg');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: T.word }).click()]);
const pfad = `${AUS}protokoll-${sprache}.docx`;
await dl.saveAs(pfad);
log('Word gespeichert:', dl.suggestedFilename(), readFileSync(pfad).length, 'Bytes ->', pfad);

// Gesamtseite
await page.waitForTimeout(500);
await axe('ganze Seite am Ende');
log('Fehler im Lauf:', fehler.length ? fehler.join(' || ') : 'keine');
log(`Verstöße gesamt: ${verstoesse}`);
writeFileSync(`${AUS}erheben5e1-${sprache}.log`, bericht.join('\n'), 'utf8');
await b.close();
