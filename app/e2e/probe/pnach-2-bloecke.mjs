// U2: Messung neuer Blöcke ohne eigene Probe: Delphi, Q-Methode, Concept Mapping (unter der Skalen-Auswertung, Beispiel Prüfungsangst),
// Textanalyse (Kodier-Arbeitsplatz, Auswerten), Papierbogen (Fragebogen planen, Export und Einlesen).
// Je Block: Tabs vom Seitenanfang bis zum Block, Überlauf in 375/1280/2560, doppelte Knöpfe, Fachbegriff in der Überschrift.
// Aufruf aus app/: PORT=5191 SPRACHE=de node e2e/probe/u2-bloecke-messen.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const OUT = 'C:/Entwicklung/autonom/pnach-ausgabe';
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5191') + '/';
const SP = process.env.SPRACHE || 'de'; const de = SP === 'de';
const erg = { sprache: SP, bloecke: [], fehler: [] };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: de ? 'de-DE' : 'en-GB', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => { const e = document.activeElement; if (!e) return ''; return ((e.getAttribute('aria-label') || e.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 160); });
async function tabs(re, max = 700) { await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); }); let n = 0; for (; n < max; n++) { await page.keyboard.press('Tab'); if (re.test(await fokus())) return n + 1; } return -1; }
async function tabsSel(sel, max = 900) { await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); }); for (let n = 0; n < max; n++) { await page.keyboard.press('Tab'); if (await page.evaluate((s) => !!document.activeElement?.closest(s), sel)) return n + 1; } return -1; }
async function messe(name, sel, re) {
  const b = { name, tabsBisBlock: await tabsSel(sel), ueberlauf: {}, doppelt: [], titel: '', anzahlKnoepfe: 0 };
  await page.evaluate((s) => { const d = document.querySelector(s); if (d && d.tagName === 'DETAILS') d.open = true; }, sel);
  await page.waitForTimeout(600);
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const kn = [...el.querySelectorAll('button, a.k, a[href]')].map(x => (x.getAttribute('aria-label') || x.textContent).replace(/\s+/g, ' ').trim()).filter(Boolean);
    const dup = kn.filter((t, i) => kn.indexOf(t) !== i);
    const ps = [...el.querySelectorAll('p')].map(p => p.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 30);
    const dupP = ps.filter((t, i) => ps.indexOf(t) !== i);
    const t = (el.querySelector('summary, h2, h3') || {}).textContent || '';
    return { kn: kn.length, dup, dupP, t: t.replace(/\s+/g, ' ').trim() };
  }, sel);
  if (!info) { b.fehler = 'Block nicht gefunden'; erg.bloecke.push(b); return; }
  b.anzahlKnoepfe = info.kn; b.doppelt = [...info.dup, ...info.dupP]; b.titel = info.t;
  b.axe = {};
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(400);
    if (w !== 2560) { await page.evaluate(AXE); b.axe[w] = await page.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0,2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary||'').split(String.fromCharCode(10)).slice(1,3).join(' ').slice(0,140)) })), sel); }
    b.ueberlauf[w] = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { seite: document.documentElement.scrollWidth > window.innerWidth + 1, block: Math.round(r.right) > window.innerWidth + 1 }; }, sel);
    await page.locator(sel).screenshot({ path: OUT + `/pnach2-${name.replace(/\W+/g, '_')}-${SP}-${w}.png` });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  erg.bloecke.push(b);
}
// Skalen-Blätter
await page.goto(BASE + '?sprache=' + SP + '#beispiele/pruefungsangst', { waitUntil: 'load', timeout: 180000 });
await page.waitForSelector('button[aria-describedby="t-pruefungsangst"]', { timeout: 60000 }); await page.locator('button[aria-describedby="t-pruefungsangst"]').click();
await page.waitForTimeout(4000);
const karte = de ? /Wie zuverlässig misst die Skala/ : /How reliably does the scale measure/;
for (let i = 0; i < 10; i++) { if (await page.getByText(karte).first().isVisible().catch(() => false)) break; await page.getByRole('button', { name: de ? 'Nächste Frage' : 'Next question' }).click(); await page.waitForTimeout(300); }
await page.getByRole('button', { name: de ? 'Frage öffnen' : 'Open the question' }).click();
await page.waitForFunction(() => /#blatt\/(?!neu)/.test(location.hash), null, { timeout: 60000 });
await page.waitForSelector('details.delphi > summary', { timeout: 180000 }); await page.waitForTimeout(1500);
await messe('Delphi', 'details.delphi', de ? /Sind sich die Fachleute einig/ : /Do the experts agree/);
await messe('Q-Methode', 'details.qmeth', de ? /Welche Sichtweisen gibt es/ : /Which viewpoints/);
await messe('Concept Mapping', 'details.cmap', de ? /Welche Aussagen gehören zusammen/ : /Which statements belong together/);
// Textanalyse
await page.goto(BASE + '?sprache=' + SP + '#kodieren/beispiel-mm', { waitUntil: 'load' }); await page.waitForTimeout(4000);
await page.goto(BASE + '?sprache=' + SP + '#kodieren/woerter', { waitUntil: 'load' }); await page.waitForTimeout(4000);
erg.kodierenUrl = page.url();
const ta = await page.evaluate(() => !!document.querySelector('#ko-ta-t'));
if (ta) await messe('Textanalyse', 'div.ta', de ? /Welche Wörter kommen vor/ : /Which words occur/); else erg.bloecke.push({ name: 'Textanalyse', fehler: 'nicht erreicht', url: page.url() });
// Papierbogen
await page.goto(BASE + '?sprache=' + SP + '#fragebogen', { waitUntil: 'load' }); await page.waitForTimeout(3000);
await page.getByRole('button', { name: de ? 'Neuen Fragebogen anlegen' : /Create a new questionnaire|New questionnaire/ }).click().catch(() => {});
await page.waitForTimeout(1500);
erg.fbSichtbar = await page.evaluate(() => !!document.querySelector('#fb-pb-t'));
if (erg.fbSichtbar) await messe('Papierbogen einlesen', 'section.pb', de ? /Gescannte Antwortbögen einlesen/ : /scanned answer sheets/i);
erg.exportSichtbar = await page.evaluate(() => !!document.querySelector('[aria-labelledby="fb-ex-bogen-t"]'));
if (erg.exportSichtbar) await messe('Papierbogen Export', '[aria-labelledby="fb-ex-bogen-t"]', /x/);
console.log(JSON.stringify(erg, null, 1));
await browser.close();
