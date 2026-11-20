// D4 (WCAG 2.4.11): Tab-Weg auf einzelnen Routen mit dem Prüfer aus tabweg.spec.ts (Zeilen der Funktion pruefeTabweg werden herausgeschnitten und übersetzt).
// Aufruf: PORT=4198 node e2e/probe/d4-tabweg.mjs blatt/neu planen   (BREITE, HOEHE optional)
import { chromium } from '@playwright/test';
import { transformWithOxc } from 'vite';
import { readFileSync } from 'node:fs';
const quelle = readFileSync(new URL('../tabweg.spec.ts', import.meta.url), 'utf8');
const von = quelle.indexOf('export async function pruefeTabweg'), bis = quelle.indexOf('async function warte');
const js = (await transformWithOxc('const TAB_MAX = 400;\n' + quelle.slice(von, bis), 'x.ts')).code.replace('export async function', 'async function');
const pruefeTabweg = new Function(js + '\nreturn pruefeTabweg;')();
const U = `http://127.0.0.1:${process.env.PORT || 4198}/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: Number(process.env.BREITE || 1280), height: Number(process.env.HOEHE || 720) } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const r of process.argv.slice(2)) {
  await page.goto(U + '#' + r); await page.locator('#inhalt').first().waitFor({ state: 'attached' }).catch(() => {}); await page.waitForTimeout(700);
  const e = await pruefeTabweg(page);
  console.log(r, 'Stopps', e.stopps.length, 'teilweise verdeckt', e.verdecktTeil.length, 'ganz', e.verdecktGanz.length);
  for (const s of [...e.verdecktTeil, ...e.verdecktGanz]) console.log('  ', s.nr, s.tag, s.rolle, JSON.stringify(s.name), JSON.stringify(s.rechteck), s.verdeckt, s.verdeckerKlasse);
}
await b.close();
