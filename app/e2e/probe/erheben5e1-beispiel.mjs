// Stufe 5, Paket 5E1: Beispielprojekt-Knopf, Matrix als Datensatz (Code-Spalten mit Herkunft), Hinweis in einer Auswertung, axe.
// Aufruf aus app/ (Vorschau auf Port 4251 läuft):  node e2e/probe/erheben5e1-beispiel.mjs [de|en]
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4251';
const sprache = process.argv[2] === 'en' ? 'en' : 'de';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = sprache === 'de'
  ? { bsp: /Beispielprojekt mit zwei Kodierenden laden/, erstellen: 'Tabelle erstellen', datensatz: 'Als Datensatz übernehmen', berechnen: 'Berechnen', hinweis: /nicht erwähnt|not mentioned/ }
  : { bsp: /Load example project with two coders/, erstellen: 'Create table', datensatz: 'Take over as data set', berechnen: 'Calculate', hinweis: /not mentioned/ };
const b = await chromium.launch();
const page = await (await b.newContext({ locale: sprache === 'en' ? 'en-US' : 'de-DE', viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })).newPage();
const fehler = [];
page.on('pageerror', e => fehler.push(e.message.slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 300)); });
let v = 0;
const axe = async (n, sel) => { const r = await new AxeBuilder({ page }).withTags(TAGS).include(sel).analyze(); v += r.violations.length; console.log('axe', n, r.violations.length, r.violations.map(x => x.id + ' ' + x.nodes.map(k => k.target.join(' ')).join(';')).join(' | ').slice(0, 300)); };
const fokus = () => page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}#${e.id} "${(e.textContent || '').trim().slice(0, 80)}"` : '-'; });
const ans = () => page.evaluate(() => [...document.querySelectorAll('#ansage-hoeflich, #ansage-dringend')].map(e => e.textContent).join(' | '));

await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#interviews`, { timeout: 240000 });
await page.waitForSelector('#iv-t', { timeout: 240000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: T.bsp }).click();
await page.waitForSelector('#qx-erg-t', { timeout: 60000 });
await page.waitForTimeout(800);
console.log('Fokus:', await fokus(), '| Ansage:', await ans());
console.log('Ergebnis:', (await page.locator('.qx').innerText()).replace(/\s+/g, ' ').slice(300, 900));
await axe('qdpx mit Beispiel', '.qx');
await page.getByRole('button', { name: T.erstellen }).click();
await page.waitForSelector('#qm-erg-t');
console.log('Matrix:', (await page.locator('.matrix table').first().innerText()).replace(/\s+/g, ' ').slice(0, 400));
await page.getByRole('button', { name: T.datensatz, exact: true }).last().click();
await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 });
await page.waitForTimeout(2500);
// Auswertung mit einer Code-Spalte
await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#blatt/neu`);
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Kommt etwas in Gruppen|Does something occur/ }).first().click();
await page.waitForTimeout(1500);
await page.getByText(/^(Unterstuetzung|Support)[^·]*· 2 /).first().click();
await page.waitForTimeout(800);
await page.getByText(/^(Wunsch|Wish)[^·]*· 2 /).first().click();
await page.waitForTimeout(3500);
const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
console.log('Hinweis sichtbar:', T.hinweis.test(text), '|', (text.match(/.{0,80}(nicht erwähnt|not mentioned).{0,160}/) || ['-'])[0]);
await page.locator('summary', { hasText: /Spalten und Optionen ändern|Change columns and options/ }).first().click();
await page.waitForTimeout(800);
const ganz = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
console.log('Prüfpunkte:', ganz.match(/.{0,200}(Kann Statable nicht prüfen|can't check this).{0,50}/)?.[0] ?? 'keine', '| details:', await page.locator('main details summary').allInnerTexts());
console.log('Knöpfe:', (await page.locator('main button').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').slice(0, 50)).join(' | '));
console.log('Anfang:', ganz.match(/.{0,100}(erwähnt|mentioned|gezielt).{0,120}/g)?.join(' ## ') ?? 'KEIN Hinweis im Text');
await axe('Auswertung mit Hinweis', 'main');
console.log('Fehler:', fehler.length ? fehler.join(' || ') : 'keine');
console.log('Verstöße:', v);
await b.close();
