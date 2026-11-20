// Barrierefreiheit Prototyp F3a (Feinstruktur: Sinneinheiten setzen und deuten), Fachblatt-Prüfplan Abschnitt 4.
// 1. axe-core (WCAG 2.2 AA) in vier Zuständen: (a) Konzept 1 Einteilen, (b) Konzept 2 Einteilen, (c) Deuten Einheit 3, (d) alle gedeutet.
// 2. Tastatur-Erstnutzer-Probe ohne Maus: „Teile den Ausschnitt in 4 Sinneinheiten, deute die erste mit einer Paraphrase, gehe weiter.“ (Konzept 1 und Konzept 2)
// 3. Sichtprüfung per Skript: Fokusrahmen am Feld und an der Wortliste, Überbreite bei 320 px.
// Aufruf aus app/:  PORT=4293 node e2e/probe/bf-feinstruktur-f3a-axe.mjs   (Vorschau von dist-f3a auf 127.0.0.1)
// Nur headless. Schreibt docs/feinstruktur/bf-f3a/axe.json.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASIS = `http://127.0.0.1:${process.env.PORT || 4293}/feinstruktur-probe/`;
const OUT_DIR = path.resolve(APP, '../docs/feinstruktur/bf-f3a');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', zustaende: [], sicht: {}, tastatur: { konzept1: [], konzept2: [], hakte: [] }, fehler: [] };

async function axeLauf(page) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    const map = (x) => ({
      id: x.id, impact: x.impact, hilfe: x.help,
      knoten: x.nodes.map((n) => ({ ziel: n.target.join(' '), meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || '').slice(0, 200), html: n.html.slice(0, 160) })),
    });
    return { verstoesse: r.violations.map(map), unklar: r.incomplete.map(map), bestanden: r.passes.length };
  }, TAGS);
}
async function zustandAxe(page, name, notiz = '') {
  const r = await axeLauf(page);
  const anzahl = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  ergebnis.zustaende.push({ name, notiz, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: anzahl, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen: ${anzahl}), unklar: ${r.unklar.length}, bestanden: ${r.bestanden}${notiz ? ' | ' + notiz : ''}`);
  for (const v of r.verstoesse) console.log(`    ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel + ' ' + k.meldung).join(' ; ').slice(0, 300)}`);
  return r;
}
const info = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.textContent) || e.textContent || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', name, fokusSichtbar: e.matches(':focus-visible') };
});
async function tabBis(page, praed, max = 60) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    const x = await info(page);
    if (x && praed(x)) return { ok: true, n: i, x };
  }
  return { ok: false, n: max };
}
async function frisch(browser, hash, vp = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => ergebnis.fehler.push('pageerror: ' + e.message));
  await page.goto(BASIS + hash);
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  return { ctx, page };
}
async function probiere(name, fn) {
  try { await fn(); } catch (e) { ergebnis.fehler.push({ wo: name, fehler: String(e.message || e).slice(0, 300) }); console.log(`FEHLER in ${name}: ${String(e.message || e).slice(0, 200)}`); }
}

async function axeZustaende(browser) {
  await probiere('a', async () => { const { ctx, page } = await frisch(browser, '#konzept=1&muster'); await zustandAxe(page, '(a) Konzept 1 Einteilen, Muster-Grenzen'); await ctx.close(); });
  await probiere('b', async () => { const { ctx, page } = await frisch(browser, '#konzept=2&muster'); await zustandAxe(page, '(b) Konzept 2 Einteilen, Muster-Grenzen'); await ctx.close(); });
  await probiere('c', async () => {
    const { ctx, page } = await frisch(browser, '#konzept=1&muster');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    for (let k = 0; k < 2; k++) { await page.getByLabel(`Paraphrase zu Sinneinheit ${k + 1}`).fill('Eine Paraphrase.'); await page.getByRole('button', { name: 'Weiter zur nächsten Sinneinheit' }).click(); }
    await page.getByRole('heading', { level: 2, name: /Sinneinheit 3 von 10/ }).waitFor();
    await zustandAxe(page, '(c) Deuten, Sinneinheit 3 von 10');
    await ctx.close();
  });
  await probiere('d', async () => {
    const { ctx, page } = await frisch(browser, '#konzept=1&muster');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    for (let k = 0; k < 10; k++) { await page.getByLabel(`Paraphrase zu Sinneinheit ${k + 1}`).fill('Eine Paraphrase.'); await page.getByRole('button', { name: 'Weiter zur nächsten Sinneinheit' }).click(); }
    await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor();
    await zustandAxe(page, '(d) alle gedeutet');
    await ctx.close();
  });
}

// Erstnutzer: nur Tastatur. 4 Sinneinheiten, erste deuten, weitergehen.
async function erstnutzer(browser, konzept) {
  const P = ergebnis.tastatur['konzept' + konzept]; const H = ergebnis.tastatur.hakte;
  const merke = (s, d = {}) => { P.push({ s, ...d }); console.log('  ' + s + ' ' + JSON.stringify(d).slice(0, 200)); };
  const haken = (t) => { H.push(`Konzept ${konzept}: ${t}`); merke('HÄNGER: ' + t); };
  const { ctx, page } = await frisch(browser, `#konzept=${konzept}`);
  const ziel = konzept === 1 ? (x) => x.tag === 'textarea' : (x) => x.rolle === 'option';
  const w1 = await tabBis(page, ziel);
  merke(konzept === 1 ? 'Tab bis Textfeld' : 'Tab bis Wortliste', w1);
  if (!w1.ok) { haken('Textfeld/Wortliste nicht per Tab erreichbar'); await ctx.close(); return; }
  // drei Grenzen setzen (10 Wörter weiter, dreimal) → 4 Einheiten
  for (let i = 0; i < 3; i++) {
    // Konzept 1: 40 Zeichen weiter (Strg+Pfeil springt in Playwright/Chromium ans Zeilenende), Konzept 2: 10 Wörter weiter
    for (let j = 0; j < (konzept === 1 ? 40 : 10); j++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  const n = await page.locator('ol.einheiten li').count();
  merke('Einheiten nach drei Grenzen', { anzahl: n });
  if (n !== 4) haken(`erwartet 4 Sinneinheiten, es sind ${n}`);
  const ansage = await page.locator('#ansage-hoeflich').textContent().catch(() => '');
  merke('Letzte Ansage', { ansage });
  if (!/Grenze nach/.test(ansage || '')) haken('keine Ansage „Grenze nach …“ in der Live-Region');
  const w2 = await tabBis(page, (x) => x.tag === 'button' && /mit dem Deuten beginnen/.test(x.name));
  merke('Tab bis „mit dem Deuten beginnen“', w2);
  if (!w2.ok) { haken('Knopf „mit dem Deuten beginnen“ nicht per Tab erreichbar'); await ctx.close(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const f = await info(page);
  merke('Fokus nach Phasenwechsel', f);
  if (!f || f.tag !== 'h2') haken(`Fokus steht nach dem Phasenwechsel nicht auf der Überschrift (${f?.tag ?? 'body'})`);
  const w3 = await tabBis(page, (x) => x.tag === 'textarea' && /Paraphrase/.test(x.name));
  merke('Tab bis Paraphrase-Feld', w3);
  if (!w3.ok) { haken('Paraphrase-Feld nicht per Tab erreichbar'); await ctx.close(); return; }
  await page.keyboard.type('Die Befragte sagt, wie ihre Antwort beginnt.', { delay: 5 });
  const w4 = await tabBis(page, (x) => x.tag === 'button' && /Weiter zur nächsten/.test(x.name));
  merke('Tab bis „Weiter zur nächsten Sinneinheit“', w4);
  if (!w4.ok) { haken('Knopf „Weiter“ nicht per Tab erreichbar'); await ctx.close(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const g = await page.evaluate(() => document.querySelector('h2')?.textContent);
  merke('Überschrift danach', { g, fokus: (await info(page))?.tag });
  if (!/Sinneinheit 2 von 4/.test(g || '')) haken(`nach „Weiter“ steht „${g}“ statt „Sinneinheit 2 von 4“`);
  await ctx.close();
}

async function sicht(browser) {
  const { ctx, page } = await frisch(browser, '#konzept=1', { width: 320, height: 700 });
  const breit1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.getByLabel('Konzept 2: Wortliste').check();
  const breit2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ergebnis.sicht.umbruch320 = { konzept1_px: breit1, konzept2_px: breit2 };
  console.log(`[320 px] Überbreite Konzept 1: ${breit1} px, Konzept 2: ${breit2} px`);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('[role=option]').first().focus();
  ergebnis.sicht.fokusWort = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { fokusSichtbar: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth}` }; });
  await page.getByLabel('Konzept 1: Grenzen im Text').check();
  await page.locator('textarea').focus();
  ergebnis.sicht.fokusFeld = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { fokusSichtbar: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth}` }; });
  console.log('[Fokus]', JSON.stringify(ergebnis.sicht));
  // Eingaben im gesperrten Feld werden verworfen, Text bleibt
  const vorher = await page.locator('textarea').inputValue();
  await page.keyboard.type('xyz'); await page.keyboard.press('Backspace');
  const nachher = await page.locator('textarea').inputValue();
  ergebnis.sicht.feldGesperrt = vorher === nachher;
  console.log(`[Feld gesperrt] Text unverändert nach Tippen: ${vorher === nachher}`);
  await ctx.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const b = await chromium.launch({ headless: true });
try {
  await probiere('Axe-Zustände', () => axeZustaende(b));
  await probiere('Erstnutzer 1', () => erstnutzer(b, 1));
  await probiere('Erstnutzer 2', () => erstnutzer(b, 2));
  await probiere('Sicht', () => sicht(b));
  ergebnis.erstnutzer = { hakte: ergebnis.tastatur.hakte.length, geschafft: ergebnis.tastatur.hakte.length === 0 };
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
