// Nach jedem Live (Plan Abschnitt 3, Schritt 5): Startseite, ?sprache=en/de, Teilen-Links, ein Beispiel öffnen.
// Aufruf: node e2e/probe/live-pruefen.mjs   (ZIEL=https://statable.eu/ Vorgabe)
import { chromium } from '@playwright/test';
const U = process.env.ZIEL || 'https://statable.eu/';
const LINKS = [
  ['Prüfung Messen', 'eyJ2IjoxLCJuIjoiUHLDvGZ1bmcgTWVzc2VuOiB2aWVyIFByw7xmc2Nocml0dGUiLCJlIjpbInBydWVmc2Nocml0dC1pbmhhbHQiLCJwcnVlZnNjaHJpdHQtZmFrdG9yZW5hbmFseXNlIiwicHJ1ZWZzY2hyaXR0LXJlbGlhYmlsaXRhZXQiLCJwcnVlZnNjaHJpdHRlLXp1c2FtbWVuIl19', 4],
  ['Prüfschritt 1', 'eyJ2IjoxLCJuIjoiUHLDvGZzY2hyaXR0IDE6IEluaGFsdCIsImUiOlsicHJ1ZWZzY2hyaXR0LWluaGFsdCJdfQ', 1],
  ['Prüfschritt 2', 'eyJ2IjoxLCJuIjoiUHLDvGZzY2hyaXR0IDI6IEZha3RvcmVuYW5hbHlzZSIsImUiOlsicHJ1ZWZzY2hyaXR0LWZha3RvcmVuYW5hbHlzZSJdfQ', 1],
  ['Prüfschritt 3', 'eyJ2IjoxLCJuIjoiUHLDvGZzY2hyaXR0IDM6IFJlbGlhYmlsaXTDpHQiLCJlIjpbInBydWVmc2Nocml0dC1yZWxpYWJpbGl0YWV0Il19', 1],
  ['Prüfschritt 4', 'eyJ2IjoxLCJuIjoiUHLDvGZzY2hyaXR0IDQ6IGFsbGVzIHp1c2FtbWVuIiwiZSI6WyJwcnVlZnNjaHJpdHRlLXp1c2FtbWVuIl19', 1],
];
const b = await chromium.launch();
let fehler = 0;
const ok = (name, wahr, detail = '') => { if (!wahr) fehler++; console.log(wahr ? 'JA  ' : 'NEIN', name, detail); };
async function neu(locale = 'de-DE') {
  const ctx = await b.newContext({ locale, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on('pageerror', (e) => konsole.push(String(e)));
  return { ctx, page, konsole };
}
// Startseite und Einstieg
{
  const { ctx, page, konsole } = await neu();
  const antwort = await page.goto(U, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const einstieg = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => /main-|index-/.test(s)) || '');
  ok('Startseite lädt', antwort?.status() === 200, `Einstieg ${einstieg.split('/').pop()}`);
  ok('Startseite hat Hauptüberschrift', (await page.locator('h1').count()) >= 1);
  ok('Startseite ohne Seitenfehler', konsole.length === 0, konsole.join(' | ').slice(0, 200));
  await ctx.close();
}
for (const [sp, wort] of [['en', /Open|Learn|data/i], ['de', /Öffnen|Lernen|Daten/]]) {
  const { ctx, page, konsole } = await neu(sp === 'en' ? 'en-US' : 'de-DE');
  await page.goto(U + '?sprache=' + sp, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const lang = await page.evaluate(() => document.documentElement.lang);
  const text = await page.locator('main').innerText().catch(() => '');
  ok(`?sprache=${sp}: lang und Text`, lang.startsWith(sp) && wort.test(text), `lang=${lang}`);
  ok(`?sprache=${sp}: ohne Seitenfehler`, konsole.length === 0, konsole.join(' | ').slice(0, 200));
  await ctx.close();
}
for (const [name, code, n] of LINKS) {
  const { ctx, page } = await neu();
  await page.goto(U + '#lernen/import/' + code, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text = await page.locator('body').innerText();
  ok(`Teilen-Link ${name}: „Geteilter Lernpfad“`, /Geteilter Lernpfad/.test(text));
  ok(`Teilen-Link ${name}: ${n} Einheit(en) genannt`, /Prüfschritt/.test(text), '');
  await ctx.close();
}
// Ein Beispiel öffnen
{
  const { ctx, page, konsole } = await neu();
  await page.goto(U + '#beispiele', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Öffnen/ }).first().click();
  await page.waitForTimeout(6000);
  const zellen = await page.locator('table td, [role=gridcell]').count();
  ok('Beispiel öffnet mit Daten', zellen > 10, `${zellen} Zellen`);
  ok('Beispiel ohne Seitenfehler', konsole.length === 0, konsole.join(' | ').slice(0, 200));
  await ctx.close();
}
await b.close();
console.log(fehler === 0 ? 'ALLES GUT' : `${fehler} FEHLER`);
process.exit(fehler ? 1 : 0);
