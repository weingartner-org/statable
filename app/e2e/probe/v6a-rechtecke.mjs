// V6a: Rechtecke aller Elemente vor und nach dem RTL-Umbau vergleichen (LTR muss gleich bleiben), dazu ?sprache=xr als RTL-Probe.
// Aufruf aus app/:  VORHER=5291 NACHHER=5292 node e2e/probe/v6a-rechtecke.mjs     Ergebnis: docs/sprachen/v6a-rechtecke.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.resolve(APP, '../docs/sprachen');
mkdirSync(OUT, { recursive: true });
const V = `http://127.0.0.1:${process.env.VORHER || 5291}/`;
const N = `http://127.0.0.1:${process.env.NACHHER || 5292}/`;
const SEITEN = ['', '#lernen', '#hilfe', '#einstellungen', '#interviews', '#kodieren', '#beispiele', '#fragebogen'];
const SPRACHEN = ['de', 'en'];
const BREITEN = [1280, 375];

async function rechtecke(browser, basis, sprache, hash, breite) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__init')) { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); sessionStorage.setItem('__init', '1'); } } catch { /* egal */ } });
  const page = await ctx.newPage();
  await page.goto(`${basis}?sprache=${sprache}${hash}`, { timeout: 180000 });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => [...document.querySelectorAll('body *')].map(e => {
    const b = e.getBoundingClientRect();
    return [e.tagName, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10];
  }));
  await ctx.close();
  return r;
}

const browser = await chromium.launch();
const ergebnis = [];
for (const s of SPRACHEN) for (const h of SEITEN) for (const w of BREITEN) {
  try {
    const a = await rechtecke(browser, V, s, h, w);
    const b = await rechtecke(browser, N, s, h, w);
    let abw = 0, max = 0; const beispiele = [];
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = Math.max(...[1, 2, 3, 4].map(k => Math.abs(a[i][k] - b[i][k])));
      if (a[i][0] !== b[i][0] || d > 0.5) { abw++; max = Math.max(max, d); if (beispiele.length < 5) beispiele.push({ i, vorher: a[i], nachher: b[i] }); }
    }
    const z = { sprache: s, seite: h || '#start', breite: w, elementeVorher: a.length, elementeNachher: b.length, abweichend: abw, maxPx: max, beispiele };
    ergebnis.push(z);
    console.log(`${s} ${z.seite} ${w}: ${a.length}/${b.length} Elemente, ${abw} abweichend (max ${max} px)`);
  } catch (e) { console.log(`${s} ${h} ${w}: FEHLER ${e.message}`); ergebnis.push({ sprache: s, seite: h, breite: w, fehler: String(e.message) }); }
}
// RTL-Probe: dir am html und Spiegelung der Seitenleiste
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${N}?sprache=xr#hilfe`, { timeout: 180000 });
await page.waitForTimeout(3500);
const xr = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, ueberlauf: document.documentElement.scrollWidth - innerWidth }));
await page.screenshot({ path: path.join(OUT, 'v6a-xr-hilfe.png') });
await page.goto(`${N}?sprache=xr#interviews`); await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(OUT, 'v6a-xr-interviews.png') });
await ctx.close();
console.log('xr:', JSON.stringify(xr));
writeFileSync(path.join(OUT, 'v6a-rechtecke.json'), JSON.stringify({ ergebnis, xr }, null, 1));
await browser.close();
