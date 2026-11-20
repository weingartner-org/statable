// Tastatur-Erstnutzer-Probe F3B1: vom Knopf „Feinstrukturanalyse beginnen“ bis „Einheit fertig, weiter“ für zwei Einheiten, nur Tab/Umschalt+Tab/Pfeile/Enter/Leertaste.
// Aufruf aus app/:  PORT=4294 node e2e/probe/erstnutzer-feinstruktur-f3b1.mjs ; Schreibt docs/feinstruktur/bf-f3b1/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, bereit, info } from './feinstruktur-f3b1-lib.mjs';

const OUT = path.resolve(APP, '../docs/feinstruktur/bf-f3b1/erstnutzer.json');
const erg = { schritte: [], haenger: [], ansagen: [] };
const merke = (s, d = {}) => { erg.schritte.push({ s, ...d }); console.log('  ' + s + ' ' + JSON.stringify(d).slice(0, 220)); };
const haenger = (t) => { erg.haenger.push(t); console.log('HÄNGER: ' + t); };

async function tabBis(page, praed, max = 80, rueck = false) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press(rueck ? 'Shift+Tab' : 'Tab');
    const x = await info(page);
    if (x === null) { haenger(`Fokus auf body nach ${i}. Tab`); }
    if (x && praed(x)) return { ok: true, n: i, x };
  }
  return { ok: false, n: max };
}
const ansagenSeit = async (page, von) => (await page.evaluate(() => window.__ans)).slice(von).map((a) => `${a.kanal}: ${a.text}`);
const anz = (page) => page.evaluate(() => window.__ans.length);
const h2 = (page) => page.evaluate(() => document.activeElement?.tagName === 'H2' ? document.activeElement.textContent : null);

const b = await chromium.launch({ headless: true });
try {
  const { ctx, page } = await bereit(b, { ansicht: 'woerter' });
  await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  let a0 = await anz(page);

  // 1. zum Knopf „Feinstrukturanalyse beginnen“
  let w = await tabBis(page, (x) => x.tag === 'button' && /^Feinstrukturanalyse beginnen/.test(x.name), 200);
  merke('Tab bis „Feinstrukturanalyse beginnen“', w);
  if (!w.ok) { haenger('Knopf „Feinstrukturanalyse beginnen“ nicht per Tab erreichbar'); throw new Error('stop'); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  let f = await h2(page);
  merke('Fokus nach Enter (Ausschnitt wählen)', { h2: f, ansagen: await ansagenSeit(page, a0) });
  if (!/Ausschnitt/.test(f ?? '')) haenger(`Fokus nach „beginnen“ nicht auf der Überschrift „Ausschnitt …“ (${JSON.stringify(await info(page))})`);

  // 2. Ausschnitt: Name (vorbelegt), Frage, Beiträge, anlegen
  w = await tabBis(page, (x) => x.id === 'fe-aus-frage'); merke('Tab bis Forschungsfrage', w);
  await page.keyboard.type('Wie erzählt die Person über ihren Weg?', { delay: 3 });
  w = await tabBis(page, (x) => x.id === 'fe-aus-bis'); merke('Tab bis „bis Beitrag“ (Auswahl, Vorgabe von+0)', w);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');   // bis: zwei Beiträge weiter
  merke('Auswahl bis nach 2x Pfeil runter', { wert: await page.locator('#fe-aus-bis').inputValue() });
  a0 = await anz(page);
  w = await tabBis(page, (x) => x.tag === 'button' && /Feinstrukturanalyse anlegen/.test(x.name)); merke('Tab bis „Feinstrukturanalyse anlegen“', w);
  if (!w.ok) haenger('Knopf „anlegen“ nicht erreichbar');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  f = await h2(page);
  merke('Fokus nach Anlegen', { h2: f, ansagen: await ansagenSeit(page, a0) });
  if (!/^Einteilen/.test(f ?? '')) haenger(`Fokus nach dem Anlegen nicht auf der Überschrift „Einteilen …“ (${JSON.stringify(await info(page))})`);

  // 3. Einteilen: Wortliste; Frage ist schon gefüllt
  w = await tabBis(page, (x) => x.rolle === 'option'); merke('Tab bis Wortliste', w);
  if (!w.ok) haenger('Wortliste nicht per Tab erreichbar');
  a0 = await anz(page);
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  }
  merke('Zwei Grenzen gesetzt', { ansagen: await ansagenSeit(page, a0), anzahl: await page.locator('ol.einheiten li').count() });
  a0 = await anz(page);
  w = await tabBis(page, (x) => x.tag === 'button' && /mit dem Deuten beginnen/.test(x.name)); merke('Tab bis „mit dem Deuten beginnen“', w);
  if (!w.ok) { haenger('Deuten-Knopf nicht erreichbar'); throw new Error('stop'); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(2200);
  f = await h2(page);
  merke('Fokus nach Phasenwechsel', { h2: f, ansagen: await ansagenSeit(page, a0) });
  if (!/^Deuten: Sinneinheit 1 von 3$/.test(f ?? '')) haenger(`Fokus nach Phasenwechsel nicht auf „Deuten: Sinneinheit 1 von 3“ (${f ?? JSON.stringify(await info(page))})`);

  // 4. zwei Einheiten deuten, nur Tastatur
  for (let k = 0; k < 2; k++) {
    w = await tabBis(page, (x) => x.id === `fe-k${k}-paraphrase-neu`); merke(`Einheit ${k + 1}: Tab bis Feld „Paraphrase: neuer Eintrag“`, w);
    if (!w.ok) { haenger(`Einheit ${k + 1}: Paraphrase-Feld nicht erreichbar`); break; }
    a0 = await anz(page);
    await page.keyboard.type('Die Person sagt, wie es begann.', { delay: 3 });
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const fo = await info(page);
    merke(`Einheit ${k + 1}: Enter im Feld (Eintrag hinzufügen)`, { fokus: fo, ansagen: await ansagenSeit(page, a0), eintraege: await page.locator(`input[aria-label^="Paraphrase "]`).count() });
    if (fo?.id !== `fe-k${k}-paraphrase-neu`) haenger(`Einheit ${k + 1}: Fokus nach Enter nicht im Feld „neuer Eintrag“ (${JSON.stringify(fo)})`);
    // Leitfragen per Tastatur öffnen (Leertaste auf summary)
    w = await tabBis(page, (x) => x.tag === 'summary' && /Leitfragen/.test(x.name)); merke(`Einheit ${k + 1}: Tab bis „Leitfragen“ (nächste Spalte)`, w);
    if (w.ok) { await page.keyboard.press('Space'); await page.waitForTimeout(150); merke('Leitfragen per Leertaste', { offen: await page.evaluate(() => document.activeElement?.parentElement?.open) }); }
    else haenger(`Einheit ${k + 1}: „Leitfragen“ nicht erreichbar`);
    a0 = await anz(page);
    w = await tabBis(page, (x) => x.tag === 'button' && /^Einheit fertig, weiter$/.test(x.name), 120); merke(`Einheit ${k + 1}: Tab bis „Einheit fertig, weiter“`, w);
    if (!w.ok) { haenger(`Einheit ${k + 1}: Knopf „Einheit fertig, weiter“ nicht erreichbar`); break; }
    await page.keyboard.press('Enter'); await page.waitForTimeout(2200);
    f = await h2(page);
    merke(`Einheit ${k + 1}: Fokus nach „weiter“`, { h2: f, ansagen: await ansagenSeit(page, a0) });
    const erwartet = new RegExp(`^Deuten: Sinneinheit ${k + 2} von 3$`);
    if (!erwartet.test(f ?? '')) haenger(`Einheit ${k + 1}: Fokus nach „weiter“ nicht auf „Deuten: Sinneinheit ${k + 2} von 3“ (${f ?? JSON.stringify(await info(page))})`);
  }
  // Tab-Reihenfolge am Anfang der Einheit 2: erstes fokussierbares Element, Seitenleistenkontrolle: kein „Fokus verloren“
  erg.ansagen = await page.evaluate(() => window.__ans);
  await ctx.close();
} catch (e) { if (e.message !== 'stop') { haenger('Skriptfehler: ' + String(e.message).slice(0, 300)); } }
finally {
  await b.close();
  erg.geschafft = erg.haenger.length === 0;
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(erg, null, 2), 'utf8');
  console.log('Hänger:', erg.haenger.length, '->', OUT);
}
