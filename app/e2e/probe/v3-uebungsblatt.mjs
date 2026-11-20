// V3 Übungsblatt: Erstnutzer-Probe NUR MIT TASTATUR, axe, Bilder in drei Breiten.
//   K1  Lehrende: auf der Seite des eigenen Pfads „Teilen oder Übungsblatt“ → „Übungsblatt zusammenstellen“ → „Aus jeder Einheit eine Frage“ → „Übungsblatt drucken“ (Druckfenster öffnet sich).
//       Ziel: höchstens 4 Aktionen (Enter/Leertaste), Tab-Schritte werden mitgezählt.
//   K2  Studierende: geteilten Link öffnen → „In meine Pfade speichern“ → Übungsblatt am Ende des Pfads öffnen → erste Frage steht da. Ziel: höchstens 3 Aktionen.
//   Danach (Klicks erlaubt): axe im offenen Teilen-Bereich und auf dem Übungsblatt, Bilder 375/1280/2560 px mit Überlauf-Prüfung.
// Vorlauf (eigener Pfad im Speicher, Adresse) zählt nicht. Aufruf aus app/:  PORT=5241 node e2e/probe/v3-uebungsblatt.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5241') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v3');
mkdirSync(OUT, { recursive: true });
const PFAD = { id: 'mein-v3prob', name: 'Kurs Beschreiben', einheiten: ['skalenniveau', 'lagemasse-streuung', 'ausreisser'] };
const erg = { zeitpunkt: new Date().toISOString(), url: BASE, k: [], axe: [], bilder: [], fehler: [] };

const browser = await chromium.launch({ headless: true });
async function neuerKontext(sprache = 'de-DE', mitPfad = true) {
  const ctx = await browser.newContext({ locale: sprache, viewport: { width: 1366, height: 850 } });
  await ctx.addInitScript(([p, mit]) => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); if (mit && !localStorage.getItem('statable-eigene-pfade')) localStorage.setItem('statable-eigene-pfade', JSON.stringify([p])); } catch { /* weiter */ } }, [PFAD, mitPfad]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
  return { ctx, page };
}
const fokus = (page) => page.evaluate(() => { const e = document.activeElement; return e ? ((e.getAttribute('aria-label') || e.textContent || e.value || '') + '').replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
/** Tab, bis der Fokus auf einem Element mit passendem Namen steht; zählt die Tabs. */
async function tabBis(page, re, k, max = 120) {
  for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(40); if (re.test(await fokus(page))) return true; }
  throw new Error('nicht erreicht: ' + re);
}
async function aktion(page, k, taste = 'Enter') { await page.keyboard.press(taste); k.aktionen++; await page.waitForTimeout(250); }

// ---------------- K1 Lehrende
{
  const { ctx, page } = await neuerKontext();
  const k = { name: 'K1 Übungsblatt zusammenstellen und drucken', ziel: 'höchstens 4 Aktionen', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  try {
    await page.goto(BASE + '#lernen/pfad/' + PFAD.id); await page.waitForSelector('#ln-liste-t');
    await tabBis(page, /^Teilen oder Übungsblatt$/, k); await aktion(page, k);
    await tabBis(page, /^Übungsblatt zusammenstellen/, k); await aktion(page, k);
    await page.waitForTimeout(800);
    await tabBis(page, /^Aus jeder Einheit eine Frage$/, k); await aktion(page, k);
    k.notiz.push('Ansage: ' + (await page.locator('#ansage-hoeflich').textContent()).trim());
    const fenster = page.waitForEvent('popup', { timeout: 8000 });
    await tabBis(page, /^Übungsblatt drucken$/, k); await aktion(page, k);
    const p2 = await fenster; await p2.waitForLoadState();
    const h1 = await p2.locator('h1').textContent();
    const n = await p2.locator('section.frage').count();
    k.notiz.push(`Druckfenster: „${h1}“, ${n} Fragen`);
    await p2.close();
    k.geschafft = n === PFAD.einheiten.length;
  } catch (e) { k.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k); console.log(JSON.stringify(k));

  // Link für K2 holen (Klick erlaubt, zählt nicht)
  const link = await page.locator('#ln-teil-link').inputValue();
  erg.link = link.slice(0, 80) + '…';

  // axe im offenen Teilen-Bereich, dann Bilder in drei Breiten
  await page.addScriptTag({ content: AXE });
  const ax = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return r.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(x => x.target.join(' ')) })); });
  erg.axe.push({ zustand: 'Teilen-Bereich offen, Übungsblatt gewählt', verstoesse: ax });
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1100 });
    await page.waitForTimeout(300);
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.locator('.ln-teilen').scrollIntoViewIfNeeded();
    const datei = `v3-teilen-${w}.png`; await page.screenshot({ path: path.join(OUT, datei), fullPage: false });
    erg.bilder.push({ datei, breite: w, ueberlaufPx: ueber });
  }

  // ---------------- K2 Studierende (anderer Browser ohne Pfad)
  const s = await neuerKontext('de-DE', false);
  const k2 = { name: 'K2 geteiltes Übungsblatt öffnen', ziel: 'höchstens 3 Aktionen', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  try {
    await s.page.goto(link); await s.page.waitForSelector('#pi-name');
    k2.notiz.push('Vorschau: ' + (await s.page.locator('.pb-vorschau p').nth(1).textContent()).trim());
    await tabBis(s.page, /^In meine Pfade speichern$/, k2); await aktion(s.page, k2);
    await s.page.waitForSelector('#ln-liste-t');
    await tabBis(s.page, /Übungsblatt: Kurs Beschreiben/, k2); await aktion(s.page, k2);
    await s.page.waitForSelector('h1#ln-t'); await s.page.waitForTimeout(800);
    k2.notiz.push('Seite: ' + (await s.page.locator('h1#ln-t').textContent()).trim() + ' | ' + (await s.page.locator('.ln-klein').first().textContent()).trim().slice(0, 120));
    k2.geschafft = /Übungsblatt/.test(await s.page.locator('h1#ln-t').textContent()) && (await s.page.locator('.ue-stamm, #ue-stamm').count()) > 0;
    await s.page.addScriptTag({ content: AXE });
    const ax2 = await s.page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return r.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(x => x.target.join(' ')) })); });
    erg.axe.push({ zustand: 'Übungsblatt bei Studierenden', verstoesse: ax2 });
    await s.page.screenshot({ path: path.join(OUT, 'v3-studierende-1366.png') });
  } catch (e) { k2.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k2); console.log(JSON.stringify(k2));

  // Englische Oberfläche: Knopf und Bereich heißen englisch
  const en = await neuerKontext('en-US');
  await en.page.goto(BASE + '?sprache=en#lernen/pfad/' + PFAD.id); await en.page.waitForSelector('#ln-liste-t');
  await en.page.getByRole('button', { name: 'Share or practice sheet' }).click();
  erg.englisch = { knopf: true, bereich: await en.page.locator('.ub summary').textContent() };
  await en.page.locator('.ub summary').click(); await en.page.waitForTimeout(800);
  await en.page.screenshot({ path: path.join(OUT, 'v3-teilen-en-1280.png') });
}
await browser.close();
writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(erg, null, 2));
console.log(JSON.stringify({ axe: erg.axe.map(a => ({ z: a.zustand, n: a.verstoesse.length, v: a.verstoesse })), bilder: erg.bilder, englisch: erg.englisch, fehler: erg.fehler }, null, 1));
