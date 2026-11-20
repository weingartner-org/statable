// Barrierefreiheit Ausbau A5 (Berichtshilfe COREQ, SRQR): Beispiel laden, über Strg+K-Adresse öffnen, fünf Punkte mit der Tastatur setzen,
// Fundstelle eintragen, Filter „nur offene“, SRQR, Word-Anhang (docx-pruefen), 320 px, Einzelfall-Modus ohne Berichtshilfe im DOM.
// axe-core (WCAG 2.2 AA) in jedem Zustand. Aufruf aus app/:  PORT=5195 node e2e/probe/bf-ausbau-a5-berichtshilfe.mjs   Rohdaten: docs/ausbau/bf-a5/axe-berichtshilfe.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASIS = `http://127.0.0.1:${process.env.PORT || 5195}/`;
const OUT_DIR = path.resolve(APP, '../docs/ausbau/bf-a5');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', zustaende: [], schritte: [], fehler: [] };

async function zustandAxe(page, name) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async (tags) => {
    const x = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return x.violations.map((v) => ({ id: v.id, impact: v.impact, knoten: v.nodes.map((n) => n.target.join(' ')) }));
  }, TAGS);
  const eigene = await page.evaluate((v) => v.flatMap((x) => x.knoten.filter((k) => { try { return !!document.querySelector(k)?.closest('.bh, #ko-bh-auf'); } catch { return false; } }).map((k) => `${x.id} ${k}`)), r);
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ergebnis.zustaende.push({ name, regeln: r.length, eigene, ueberlauf, verstoesse: r });
  console.log(`[${name}] Verstoss-Regeln: ${r.length}, davon in der Berichtshilfe: ${eigene.length}, Ueberlauf: ${ueberlauf}px`);
  for (const v of r) console.log(`    ${v.id} (${v.impact}): ${v.knoten.join(' ; ').slice(0, 200)}`);
}
async function schritt(name, fn) {
  try { await fn(); ergebnis.schritte.push({ name, ok: true }); console.log(`OK    ${name}`); }
  catch (e) { ergebnis.schritte.push({ name, ok: false, fehler: String(e.message || e).slice(0, 300) }); ergebnis.fehler.push(name); console.log(`FEHLER ${name}: ${String(e.message || e).slice(0, 200)}`); }
}
const pruefe = (b, t) => { if (!b) throw new Error(t); };
const zahl = async (page) => (await page.locator('#ko-bh-zahl').innerText()).trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-AT', acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => { ergebnis.fehler.push(`pageerror: ${e.message}`); console.log('pageerror', e.message); });
await page.goto(BASIS + '#kodieren', { timeout: 180000 }); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1500);

await schritt('Beispielprojekt laden (#kodieren/beispiel-mm)', async () => {
  await page.evaluate(() => { location.hash = 'kodieren/beispiel-mm'; });
  await page.waitForSelector('#ko-mm-t', { timeout: 60000 }); await page.waitForTimeout(1500);
});
await schritt('#kodieren/berichtshilfe öffnet die Klappe, Fokus auf der Überschrift', async () => {
  await page.evaluate(() => { location.hash = 'kodieren/berichtshilfe'; }); await page.waitForTimeout(1000);
  const f = await page.evaluate(() => document.activeElement?.id);
  pruefe(f === 'ko-bh-t', `Fokus auf ${f}`);
  pruefe(await page.locator('.bh table caption').count() === 1, 'keine caption');
  pruefe(await page.locator('.bh tbody th[scope="row"]').count() === 32, 'nicht 32 Zeilen');
  pruefe(/0 von 32 Punkten bearbeitet, 32 noch offen/.test(await zahl(page)), await zahl(page));
});
await zustandAxe(page, 'Berichtshilfe COREQ, nichts gesetzt');

await schritt('Fünf Punkte mit der Tastatur setzen (Fokus auf Optionsfeld, Leertaste, Pfeil)', async () => {
  for (const k of ['01', '09', '12', '21', '23']) {
    await page.locator(`input[name="ko-bh-coreq-coreq-${k}"][value="erfuellt"]`).focus();
    await page.keyboard.press('Space'); await page.waitForTimeout(250);
  }
  // Pfeil nach unten wechselt bei Punkt 23 auf „Offen“
  await page.locator('input[name="ko-bh-coreq-coreq-23"][value="erfuellt"]').focus();
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
  pruefe(await page.locator('input[name="ko-bh-coreq-coreq-23"][value="offen"]').isChecked(), '23 nicht offen');
  pruefe(/5 von 32 Punkten bearbeitet, 28 noch offen/.test(await zahl(page)), await zahl(page));
});
await schritt('Fundstelle eintragen, Tab speichert; Fundstelle ohne Stand setzt „Offen“', async () => {
  await page.locator('#ko-bh-f-coreq-12').fill('S. 14'); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
  await page.locator('#ko-bh-f-coreq-02').fill('S. 3'); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
  pruefe(await page.locator('input[name="ko-bh-coreq-coreq-02"][value="offen"]').isChecked(), '02 nicht offen');
  pruefe(/6 von 32/.test(await zahl(page)), await zahl(page));
  pruefe(await page.locator('#ko-bh-f-coreq-12').inputValue() === 'S. 14', 'Fundstelle weg');
});
await schritt('„Statable weiß“: Hinweis mit Sprunglink, keine Note auf der Seite', async () => {
  const t = await page.locator('.bh').innerText();
  pruefe(/Im Projekt: 5 Fälle/.test(t), 'Hinweis Fälle fehlt');
  pruefe(await page.locator('.bh a[href="#kodieren/themen"]').count() > 0, 'kein Sprunglink');
  pruefe(!/\d+ ?%|Punktzahl/.test(t), 'Note oder Prozent');
});
await zustandAxe(page, 'Berichtshilfe COREQ, sechs Punkte gesetzt');

await schritt('Filter „nur offene“: Zeilen bleiben beim Setzen stehen', async () => {
  await page.locator('#ko-bh-filter').check(); await page.waitForTimeout(400);
  const n = await page.locator('.bh tbody th[scope="row"]').count();
  pruefe(n === 28, `Zeilen ${n}`);
  await page.locator('input[name="ko-bh-coreq-coreq-02"][value="erfuellt"]').check(); await page.waitForTimeout(300);
  pruefe(await page.locator('.bh tbody th[scope="row"]').count() === 28, 'Zeile verschwand');
  await page.locator('#ko-bh-filter').uncheck(); await page.waitForTimeout(300);
});
await schritt('SRQR: 21 Zeilen, eigene Zählung', async () => {
  await page.locator('input[name="ko-bh-liste"][value="srqr"]').check(); await page.waitForTimeout(400);
  pruefe(await page.locator('.bh tbody th[scope="row"]').count() === 21, 'nicht 21');
  pruefe(/0 von 21/.test(await zahl(page)), await zahl(page));
  await page.locator('input[name="ko-bh-srqr-srqr-21"][value="nicht-zutreffend"]').check(); await page.waitForTimeout(300);
});
await zustandAxe(page, 'Berichtshilfe SRQR');

await schritt('Word-Anhang SRQR: Download, docx-pruefen grün', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#ko-bh-word').click()]);
  const p = await dl.path();
  const fehler = pruefeDocx(new Uint8Array(readFileSync(p)));
  pruefe(fehler.length === 0, JSON.stringify(fehler));
  pruefe(/SRQR\.docx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
});
await schritt('320 px: Seite ohne waagrechtes Scrollen, Tabelle im eigenen Bereich', async () => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(600);
  const u = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(u <= 0, `Überlauf ${u}px`);
  await zustandAxe(page, 'Berichtshilfe bei 320 px');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(400);
});
await schritt('Einzelfall-Modus: Berichtshilfe verdeckt, Notiz nicht im DOM', async () => {
  await page.locator('input[name="ko-bh-liste"][value="coreq"]').check(); await page.waitForTimeout(300);
  await page.locator('#ko-bh-n-coreq-01').fill('GEHEIM-NOTIZ-B2'); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
  await page.locator('#ko-arbeitsweise').selectOption('ipa'); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = 'kodieren/einzelfall'; }); await page.waitForTimeout(800);
  const fall = page.locator('select[id^="ko-ef"]').first();
  if (await fall.count()) { const o = await fall.locator('option').nth(1).getAttribute('value'); await fall.selectOption(o); }
  const start = page.getByRole('button', { name: /Einzelfall-Modus starten/ });
  if (await start.count()) await start.first().click();
  await page.waitForTimeout(800);
  await page.evaluate(() => { location.hash = 'kodieren/berichtshilfe'; }); await page.waitForTimeout(800);
  const html = await page.content();
  pruefe(!html.includes('GEHEIM-NOTIZ-B2'), 'Notiz im DOM');
  pruefe(/Im Einzelfall-Modus ist sie verdeckt/.test(await page.locator('.bh').innerText()), 'Satz fehlt');
});
await zustandAxe(page, 'Berichtshilfe im Einzelfall-Modus');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'axe-berichtshilfe.json'), JSON.stringify(ergebnis, null, 1));
console.log(`\nSchritte: ${ergebnis.schritte.filter((s) => s.ok).length}/${ergebnis.schritte.length}, Fehler: ${ergebnis.fehler.length}`);
await browser.close();
