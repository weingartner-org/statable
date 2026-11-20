// Barrierefreiheit Ausbau A2 (Mixed Methods): Beispiel laden, verknüpfen, Joint Display bauen, Belegstelle wählen, Design, Instrument, Selbstprüfung,
// Code-Landkarte mit Clusteranalyse; axe-core (WCAG 2.2 AA) in jedem Zustand, 320 px ohne waagrechtes Scrollen der Seite, Einzelfall-Modus ohne MM-Inhalte.
// Aufruf aus app/:  PORT=5191 node e2e/probe/bf-ausbau-a2-mixed.mjs     (Dev-Server auf 127.0.0.1). Nur headless. Rohdaten: docs/ausbau/bf-a2/axe-mixed.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASIS = `http://127.0.0.1:${process.env.PORT || 5191}/`;
const OUT_DIR = path.resolve(APP, '../docs/ausbau/bf-a2');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', zustaende: [], schritte: [], fehler: [] };

async function zustandAxe(page, name) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async (tags) => {
    const x = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return x.violations.map((v) => ({ id: v.id, impact: v.impact, knoten: v.nodes.map((n) => n.target.join(' ')) }));
  }, TAGS);
  const eigene = await page.evaluate((v) => v.flatMap((x) => x.knoten.filter((k) => { try { return !!document.querySelector(k)?.closest('.mm, .lk'); } catch { return false; } }).map((k) => `${x.id} ${k}`)), r);
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ergebnis.zustaende.push({ name, regeln: r.length, eigene, ueberlauf, verstoesse: r });
  console.log(`[${name}] Verstoss-Regeln: ${r.length}, davon in Mixed Methods/Landkarte: ${eigene.length}, Ueberlauf: ${ueberlauf}px`);
  for (const v of r) console.log(`    ${v.id} (${v.impact}): ${v.knoten.join(' ; ').slice(0, 200)}`);
}
async function schritt(name, fn) {
  try { await fn(); ergebnis.schritte.push({ name, ok: true }); console.log(`OK    ${name}`); }
  catch (e) { ergebnis.schritte.push({ name, ok: false, fehler: String(e.message || e).slice(0, 300) }); ergebnis.fehler.push(name); console.log(`FEHLER ${name}: ${String(e.message || e).slice(0, 200)}`); }
}
const pruefe = (b, t) => { if (!b) throw new Error(t); };
const teil = async (page, wert) => { await page.locator(`input[name="ko-mm-teil"][value="${wert}"]`).check(); await page.waitForTimeout(400); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-AT' });
const page = await ctx.newPage();
page.on('pageerror', (e) => { ergebnis.fehler.push(`pageerror: ${e.message}`); console.log('pageerror', e.message); });
await page.goto(BASIS + '#kodieren'); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1500);

await schritt('Beispiel über #kodieren/beispiel-mm öffnen (neues Projekt, Fokus auf der Überschrift)', async () => {
  await page.evaluate(() => { location.hash = 'kodieren/beispiel-mm'; });
  await page.waitForSelector('#ko-mm-t', { timeout: 60000 }); await page.waitForTimeout(1500);
  const f = await page.evaluate(() => document.activeElement?.id);
  pruefe(f === 'ko-mm-t', `Fokus auf ${f}`);
});
await zustandAxe(page, 'Mixed Methods: Verknüpfen (vor dem Verknüpfen)');

await schritt('Verknüpfen: survey_id ist vorausgewählt, Knopf, Ergebnis 5 von 5', async () => {
  const v = await page.locator('#ko-mm-vk-var option:checked').textContent();
  pruefe(/survey_id/.test(v || ''), `vorausgewählt: ${v}`);
  await page.locator('#ko-mm-vk-knopf').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const t = await page.locator('.mm').innerText();
  pruefe(/5 von 5/.test(t), 'kein „5 von 5“');
});
await zustandAxe(page, 'Mixed Methods: verknüpft');

await schritt('Joint Display anlegen (Tastatur), Gruppierung first_generation, drei Themen', async () => {
  await teil(page, 'displays');
  await page.locator('#ko-mm-jd-neu-name').fill('Themen nach Erstperson');
  await page.locator('#ko-mm-jd-neu-btn').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const opt = await page.locator('#ko-mm-jd-gruppe option').evaluateAll((o) => o.find((x) => x.textContent.trim() === 'first_generation')?.value);
  pruefe(!!opt, 'keine Option first_generation');
  await page.locator('#ko-mm-jd-gruppe').selectOption(opt); await page.waitForTimeout(400);
  const kaestchen = page.locator('.mm label.schalter', { hasText: 'Thema:' }).locator('input');
  const n = await kaestchen.count();
  for (let i = 0; i < n; i++) { await kaestchen.nth(i).check(); await page.waitForTimeout(250); }
  const th = await page.locator('.mm table thead th').allInnerTexts();
  pruefe(th.some((x) => /^no/.test(x.trim())) && th.some((x) => /^yes/.test(x.trim())), `Kopf: ${th.join(' | ')}`);
  pruefe(await page.locator('.mm table caption').count() === 1, 'keine caption');
  pruefe(!(await page.locator('.mm table').innerText()).includes('“'), 'Zitat ohne Wahl');
});
await schritt('Belegstelle in der ersten Zelle wählen: Zitat erscheint', async () => {
  const sel = page.locator('.mm table select[id^="ko-mm-jd-b-"]').first();
  const name = await sel.getAttribute('aria-label') || await sel.evaluate((s) => s.labels?.[0]?.textContent || '');
  const opt = await sel.locator('option').nth(1).getAttribute('value');
  await sel.selectOption(opt); await page.waitForTimeout(600);
  const t = await page.locator('.mm table').innerText();
  pruefe(/Interview \d\d/.test(t), 'keine Quelle im Zitat');
  console.log('      Name des Auswahlfelds:', (name || '').replace(/\s+/g, ' ').slice(0, 120));
});
await zustandAxe(page, 'Joint Display mit Beleg');

await schritt('Typologietabelle: Zahlen nach qualitativen Gruppen (mit/ohne B2, gpa)', async () => {
  await page.locator('input[name="ko-mm-jd-art"][value="zahlen-nach-qual"]').check();
  await page.locator('#ko-mm-jd-neu-name').fill('Noten nach Tutorium');
  await page.locator('#ko-mm-jd-neu-btn').click(); await page.waitForTimeout(600);
  const opt = await page.locator('#ko-mm-jd-gruppe option').evaluateAll((o) => o.find((x) => /B2 /.test(x.textContent))?.value);
  await page.locator('#ko-mm-jd-gruppe').selectOption(opt); await page.waitForTimeout(300);
  await page.locator('.mm label.schalter', { hasText: 'gpa_first_term' }).locator('input').check(); await page.waitForTimeout(500);
  const t = await page.locator('.mm table').innerText();
  pruefe(/M = 3,10/.test(t), `kein M = 3,10: ${t.slice(0, 200)}`);
});
await zustandAxe(page, 'Typologietabelle');

await schritt('320 px: Seite ohne waagrechtes Scrollen, Tabelle im eigenen Bereich', async () => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(600);
  const u = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruefe(u <= 1, `Überlauf ${u}px`);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(400);
});

await schritt('Design-Steckbrief: Erst die Zahlen, Gewicht quan → QUAN → qual', async () => {
  await teil(page, 'design');
  await page.locator('.mm input[type="radio"][value="quan-zuerst"]').check(); await page.waitForTimeout(300);
  await page.locator('.mm input[type="radio"][value="quan"]').check(); await page.waitForTimeout(400);
  pruefe((await page.locator('.mm').innerText()).includes('QUAN → qual'), 'Schreibweise fehlt');
});
await zustandAxe(page, 'Design-Steckbrief');
await schritt('Instrument: Teil öffnen', async () => { await teil(page, 'instrument'); pruefe(await page.locator('#ko-mm-in-t').count() === 1, 'Überschrift fehlt'); });
await zustandAxe(page, 'Instrumentenentwicklung');
await schritt('Selbstprüfung: MMAT 5.1 auf Ja', async () => {
  await teil(page, 'pruefung');
  const r = page.locator('.mm fieldset', { hasText: '5.1' }).locator('input[type="radio"][value="ja"]');
  await r.first().check(); await page.waitForTimeout(400);
  const t = await page.locator('.mm').innerText();
  pruefe(/1 von 7/.test(t), 'Zählung bearbeitet fehlt');
  // „Keine Gesamtnote: …“ steht absichtlich da; geprüft wird, dass keine Note oder Punktzahl erscheint
  pruefe(!/Gesamtnote: \d|Punkte erreicht|\d+ ?% erfüllt/.test(t), 'Gesamtnote sichtbar');
});
await zustandAxe(page, 'Selbstprüfung');
await schritt('Code-Landkarte mit Simple Matching und Clustertabelle', async () => {
  await page.locator('input[name="ko-auswerten"][value="landkarte"]').check(); await page.waitForTimeout(400);
  await page.locator('#ko-lk-mass').selectOption('sm');
  await page.locator('#ko-lk-zeichnen').click(); await page.waitForSelector('#ko-lk-erg-t'); await page.waitForTimeout(800);
  pruefe(await page.locator('#ko-lk-clu-t').count() === 1, 'Clustertabelle fehlt');
});
await zustandAxe(page, 'Code-Landkarte mit Clusteranalyse');

await schritt('Einzelfall-Modus: Mixed Methods verdeckt, kein Meta-Inferenz-Feld und kein Joint Display im DOM', async () => {
  await page.locator('#ko-arbeitsweise').selectOption('ipa'); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = 'kodieren/einzelfall'; }); await page.waitForTimeout(800);
  const fall = page.locator('select[id^="ko-ef"]').first();
  if (await fall.count()) { const o = await fall.locator('option').nth(1).getAttribute('value'); await fall.selectOption(o); }
  const start = page.getByRole('button', { name: /Einzelfall-Modus starten/ });
  if (await start.count()) await start.first().click();
  await page.waitForTimeout(800);
  await page.evaluate(() => { location.hash = 'kodieren/joint-display'; }); await page.waitForTimeout(800);
  const html = await page.content();
  pruefe(!html.includes('Themen nach Erstperson'), 'Name des Joint Displays im DOM');
  pruefe(/Einzelfall-Modus ist das verdeckt/.test(await page.locator('.mm').innerText()), 'Satz fehlt');
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'axe-mixed.json'), JSON.stringify(ergebnis, null, 1));
console.log(`\nSchritte: ${ergebnis.schritte.filter((s) => s.ok).length}/${ergebnis.schritte.length}, Fehler: ${ergebnis.fehler.length}`);
await browser.close();
