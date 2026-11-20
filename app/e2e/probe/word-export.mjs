/**
 * Erzeugt zwei Word-Berichte aus der echten App (Schalter „Bildbeschreibungen im Text“ an und aus) für scripts/docx-pruefen.mjs.
 * Aufruf (Dev-Server läuft): node e2e/probe/word-export.mjs [http://localhost:5291/] [Zielordner]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL0 = process.argv[2] ?? 'http://localhost:5291/';
const ZIEL = process.argv[3] ?? '../pruefdaten/barrierefrei';
mkdirSync(ZIEL, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('SEITENFEHLER', e.message));
const klick = (t, o = {}) => p.getByText(t, { exact: false }).first().click({ timeout: 20000, ...o });

await p.goto(URL0 + '#beispiele');
await p.getByRole('button', { name: /Öffnen und üben/ }).first().click({ timeout: 30000 });
await p.waitForFunction(() => location.hash !== '#beispiele', undefined, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(2500);
await p.getByRole('button', { name: /Rundgang beenden|Rundgang überspringen/ }).first().click({ timeout: 3000 }).catch(() => {});
await p.goto(URL0 + '#blatt/neu');
await p.waitForTimeout(1000);
await klick('Unterscheiden sich Gruppen?');
await p.waitForTimeout(500);
await p.locator('#wahl input[value=lesen_nach]').click({ force: true });
await p.waitForTimeout(800);
await p.locator('#wahl input[value=gruppe]').click({ force: true });
await p.waitForTimeout(8000);
await p.screenshot({ path: join(ZIEL, '_debug1.png'), fullPage: true });
console.log((await p.evaluate(() => document.body.innerText)).slice(0, 300));
await p.goto(URL0 + '#bericht');
await p.waitForTimeout(2500);
const kasten = p.getByLabel('Bildbeschreibungen im Text');
const laden = async (name) => {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.getByRole('button', { name: /Als Word-Datei/ }).click()]);
  await dl.saveAs(join(ZIEL, name));
  console.log('gespeichert', name);
};
console.log('Vorgabe an?', await kasten.isChecked());
await laden('bericht-mit-bildbeschreibung.docx');
await kasten.uncheck();
await p.waitForTimeout(500);
console.log('Nach Abschalten an?', await kasten.isChecked());
await laden('bericht-ohne-bildbeschreibung.docx');
await b.close();
