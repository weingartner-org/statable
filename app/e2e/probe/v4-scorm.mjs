// V4 SCORM-Paket: Erstnutzer-Probe NUR MIT TASTATUR für die gezählten Schritte, Lauf in einer nachgebauten Lernplattform, axe, Bilder.
//   K1 Lehrende: Seite des eigenen Pfads → „Teilen oder Übungsblatt“ → „Für Moodle speichern (SCORM-Paket)“ → ZIP kommt. Ziel: höchstens 2 Aktionen.
//   K2 Studierende: in der Lernplattform „Statable öffnen“ → Statable im eigenen Fenster. Ziel: 1 Aktion.
//   Ablauf: Nachgebaute Lernplattform (http://lms.test, SCORM-1.2-API im Elternfenster, Paket im iframe wie in Moodle) → Pfad speichern →
//   Abschlusstest ganz beantworten → die Lernplattform bekommt cmi.core.lesson_status = completed; beim Verlassen session_time und LMSFinish.
//   Gegenproben: fremdes Fenster und fremder Ursprung werden nicht angenommen; ohne Lernplattform sagt die Seite es.
// Aufruf aus app/:  PORT=5243 node e2e/probe/v4-scorm.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5243') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v4');
mkdirSync(OUT, { recursive: true });
const PFAD = { id: 'mein-v4scorm', name: 'Kurs Moodle', einheiten: ['skalenniveau', 'lagemasse-streuung', 'ausreisser'] };
const erg = { zeitpunkt: new Date().toISOString(), url: BASE, k: [], lms: {}, gegenproben: [], axe: [], bilder: [], fehler: [] };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SPRACHE = process.env.SPRACHE || 'de';
const T = SPRACHE === 'en'
  ? { teilen: 'Share or practice sheet', scorm: 'Save for Moodle (SCORM package)', oeffnen: 'Open Statable', speichern: 'Save to my paths', test: /Final test: Kurs Moodle/, pruefen: 'Check', weiter: /Next question|To the result/, ende: /To the result/ }
  : { teilen: 'Teilen oder Übungsblatt', scorm: 'Für Moodle speichern (SCORM-Paket)', oeffnen: 'Statable öffnen', speichern: 'In meine Pfade speichern', test: /Abschlusstest: Kurs Moodle/, pruefen: 'Prüfen', weiter: /Nächste Frage|Zum Ergebnis/, ende: /Zum Ergebnis/ };

const browser = await chromium.launch({ headless: true });
async function neuerKontext(mitPfad) {
  const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
  await ctx.addInitScript(([p, mit]) => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); if (mit && location.port && !localStorage.getItem('statable-eigene-pfade')) localStorage.setItem('statable-eigene-pfade', JSON.stringify([p])); } catch { /* weiter */ } }, [PFAD, mitPfad]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
  return { ctx, page };
}
const fokus = (page) => page.evaluate(() => { const e = document.activeElement; return e ? ((e.getAttribute('aria-label') || e.textContent || e.value || '') + '').replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
async function tabBis(page, re, k, max = 160) {
  for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(30); if (re.test(await fokus(page))) return true; }
  throw new Error('nicht erreicht: ' + re);
}
async function aktion(page, k, taste = 'Enter') { await page.keyboard.press(taste); k.aktionen++; await page.waitForTimeout(250); }
const axe = async (page, zustand) => {
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async (t) => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: t } }); return r.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(x => x.target.join(' ')) })); }, TAGS);
  erg.axe.push({ zustand, verstoesse: v });
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------- K1 Lehrende speichert das Paket
let zip;
{
  const { page } = await neuerKontext(true);
  await page.goto(BASE + '?sprache=' + SPRACHE + '#lernen/pfad/' + PFAD.id); await page.waitForSelector('#ln-liste-t');
  const k = { name: 'K1 SCORM-Paket speichern', ziel: 'höchstens 2 Aktionen', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  try {
    await page.locator('#ln-liste-t').focus().catch(() => {});
    await tabBis(page, new RegExp('^' + esc(T.teilen) + '$'), k); await aktion(page, k);
    const dl = page.waitForEvent('download', { timeout: 8000 });
    await tabBis(page, new RegExp('^' + esc(T.scorm) + '$'), k); await aktion(page, k);
    const d = await dl;
    const ziel = path.join(OUT, 'v4-paket-' + SPRACHE + '.zip'); await d.saveAs(ziel);
    zip = unzipSync(new Uint8Array(readFileSync(ziel)));
    k.notiz.push('Datei: ' + d.suggestedFilename(), 'Inhalt: ' + Object.keys(zip).join(', '));
    k.notiz.push('Ansage: ' + ((await page.locator('#ansage-hoeflich').textContent()) || '').trim());
    k.geschafft = !!zip['imsmanifest.xml'] && !!zip['index.html'];
  } catch (e) { k.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k); console.log(JSON.stringify(k));
  await axe(page, 'Teilen-Bereich mit SCORM-Knopf');
  await page.locator('.ln-teilen').scrollIntoViewIfNeeded();
  await page.locator('.ln-teilen').screenshot({ path: path.join(OUT, `v4-teilen-${SPRACHE}.png`) });
  erg.bilder.push({ datei: `v4-teilen-${SPRACHE}.png`, breite: 1366 });
}
if (!zip) { writeFileSync(path.join(OUT, `probe-${SPRACHE}.json`), JSON.stringify(erg, null, 2)); await browser.close(); process.exit(1); }
const INDEX = strFromU8(zip['index.html']);

// ---------------- Nachgebaute Lernplattform
const aufrufe = [];
const PLAYER = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>LMS</title></head><body><h1>Lernplattform</h1>
<script>
var daten = {};
function log(f, a, r) { window.lmsLog(f, a, r); return r; }
window.API = {
  LMSInitialize: function (x) { return log('LMSInitialize', [x], 'true'); },
  LMSGetValue: function (k) { return log('LMSGetValue', [k], daten[k] || (k === 'cmi.core.lesson_status' ? (window.vorStand || 'not attempted') : '')); },
  LMSSetValue: function (k, v) { daten[k] = v; return log('LMSSetValue', [k, v], 'true'); },
  LMSCommit: function (x) { return log('LMSCommit', [x], 'true'); },
  LMSFinish: function (x) { return log('LMSFinish', [x], 'true'); },
  LMSGetLastError: function () { return '0'; }, LMSGetErrorString: function () { return ''; }, LMSGetDiagnostic: function () { return ''; }
};
</script>
<iframe id="sco" title="Lernpaket" src="/paket/index.html" style="width:100%;height:600px;border:0"></iframe></body></html>`;
async function lmsRouten(ctx) {
  await ctx.route('http://lms.test/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/player.html') return route.fulfill({ contentType: 'text/html', body: PLAYER });
    if (u.pathname === '/paket/index.html') return route.fulfill({ contentType: 'text/html', body: INDEX });
    if (u.pathname === '/fremd.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>x</title>' });
    return route.fulfill({ status: 404, body: '' });
  });
}

// ---------------- K2 Studierende: Paket in der Lernplattform, Statable öffnen, Test beantworten
{
  const { ctx, page } = await neuerKontext(false);
  await lmsRouten(ctx);
  await page.exposeFunction('lmsLog', (f, a, r) => { aufrufe.push({ f, a, r, t: Date.now() }); });
  await page.goto('http://lms.test/player.html');
  const sco = page.frameLocator('#sco');
  await sco.locator('#stand').waitFor();
  await page.waitForTimeout(300);
  erg.lms.standAnfang = (await sco.locator('#stand').textContent()).trim();
  const k = { name: 'K2 Statable aus der Lernplattform öffnen', ziel: '1 Aktion', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  let pop;
  try {
    await page.locator('#sco').focus();
    await sco.locator('h1').evaluate((h) => { h.tabIndex = -1; h.focus(); });
    const popup = ctx.waitForEvent('page', { timeout: 8000 });
    const frame = page.frames().find(f => f.url().endsWith('/paket/index.html'));
    for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(30); if (await frame.evaluate(() => document.activeElement?.id === 'oeffnen')) break; }
    await aktion(page, k);
    pop = await popup; await pop.waitForLoadState();
    k.notiz.push('Fenster: ' + pop.url().slice(0, 80));
    k.geschafft = pop.url().includes('lms=scorm') && pop.url().includes('#lernen/import/');
  } catch (e) { k.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k); console.log(JSON.stringify(k));

  if (pop) {
    pop.on('pageerror', (e) => erg.fehler.push('Fenster: ' + String(e.message).slice(0, 200)));
    await pop.waitForSelector('#pi-name');
    await pop.getByRole('button', { name: T.speichern }).click();
    await pop.waitForSelector('#ln-liste-t');
    await pop.getByRole('link', { name: T.test }).first().click();
    await pop.waitForSelector('h1#ln-t'); await pop.waitForTimeout(800);
    erg.lms.hinweisVorher = ((await pop.locator('.pa-lms').textContent().catch(() => '')) || '').trim();
    erg.lms.urlTest = pop.url().replace(BASE, '/');
    for (let i = 0; i < 20; i++) {
      if (await pop.locator('.ue-antwort').count()) await pop.locator('.ue-antwort').first().click();
      else if (await pop.getByRole('button', { name: T.pruefen }).count()) await pop.getByRole('button', { name: T.pruefen }).click();
      else break;
      await pop.waitForTimeout(250);
      const weiter = pop.getByRole('button', { name: T.weiter });
      if (!(await weiter.count())) break;
      const ende = T.ende.test(await weiter.first().textContent());
      await weiter.first().click(); await pop.waitForTimeout(250);
      if (ende) break;
    }
    await pop.waitForTimeout(800);
    erg.lms.hinweisNachher = ((await pop.locator('.pa-lms').textContent().catch(() => '')) || '').trim();
    erg.lms.ansage = ((await pop.locator('#ansage-hoeflich').textContent().catch(() => '')) || '').trim();
    erg.lms.standEnde = (await sco.locator('#stand').textContent()).trim();
    await axe(pop, 'Abschlusstest im SCORM-Modus');
    await pop.locator('.pa-lms').scrollIntoViewIfNeeded().catch(() => {});
    await pop.screenshot({ path: path.join(OUT, `v4-test-fertig-${SPRACHE}.png`) });
    erg.bilder.push({ datei: `v4-test-fertig-${SPRACHE}.png`, breite: 1366 });
  }
  await page.screenshot({ path: path.join(OUT, `v4-lms-${SPRACHE}.png`) });
  erg.bilder.push({ datei: `v4-lms-${SPRACHE}.png`, breite: 1366 });
  // Verlassen: session_time und LMSFinish
  await page.goto('about:blank'); await page.waitForTimeout(300);
  erg.lms.aufrufe = aufrufe.map(x => `${x.f}(${x.a.join(', ')}) → ${x.r}`);
  const gesetzt = (k2) => aufrufe.filter(x => x.f === 'LMSSetValue' && x.a[0] === k2).map(x => x.a[1]);
  erg.lms.status = gesetzt('cmi.core.lesson_status');
  erg.lms.zeit = gesetzt('cmi.core.session_time');
  erg.lms.finish = aufrufe.some(x => x.f === 'LMSFinish');
  erg.lms.ok = erg.lms.status.join(',') === 'incomplete,completed' && /^\d\d:\d\d:\d\d$/.test(erg.lms.zeit[0] || '') && erg.lms.finish;
  console.log(JSON.stringify(erg.lms.status), erg.lms.zeit, erg.lms.finish);
  await ctx.close();
}

// ---------------- Gegenproben
{
  // (a) Meldung aus einem fremden Fenster (nicht dem geöffneten) und mit falschem Ursprung: nicht annehmen.
  const { ctx, page } = await neuerKontext(false);
  await lmsRouten(ctx);
  const log2 = [];
  await page.exposeFunction('lmsLog', (f, a) => { log2.push([f, ...a]); });
  await page.goto('http://lms.test/player.html');
  const frame = await (await page.waitForSelector('#sco')).contentFrame();
  await frame.waitForSelector('#stand');
  await frame.evaluate(() => { window.postMessage({ art: 'statable-lms', fassung: 1, status: 'completed', beantwortet: 1, gesamt: 1 }, '*'); });
  await page.waitForTimeout(400);
  const fremd = log2.some(x => x[0] === 'LMSSetValue' && x[2] === 'completed');
  erg.gegenproben.push({ name: 'Meldung aus eigenem/fremdem Fenster ohne Öffnen', angenommen: fremd, ok: !fremd });
  await ctx.close();
}
{
  // (b) Ohne Lernplattform: Seite sagt es, Knopf geht trotzdem.
  const { ctx, page } = await neuerKontext(false);
  await lmsRouten(ctx);
  await page.goto('http://lms.test/paket/index.html');
  const s = (await page.locator('#stand').textContent()).trim();
  erg.gegenproben.push({ name: 'Ohne Lernplattform', stand: s, ok: s.length > 10 });
  await axe(page, 'SCORM-Startseite (ohne Lernplattform)');
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1100 }); await page.waitForTimeout(200);
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const datei = `v4-startseite-${SPRACHE}-${w}.png`; await page.screenshot({ path: path.join(OUT, datei) });
    erg.bilder.push({ datei, breite: w, ueberlaufPx: ueber });
  }
  await page.emulateMedia({ colorScheme: 'dark' }); await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(OUT, `v4-startseite-${SPRACHE}-dunkel.png`) });
  await ctx.close();
}

writeFileSync(path.join(OUT, `probe-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify({ k: erg.k.map(k => [k.name, k.aktionen, k.tabs, k.geschafft]), lms: erg.lms.ok, gegen: erg.gegenproben.map(g => g.ok), axe: erg.axe.map(a => [a.zustand, a.verstoesse.map(v => v.id)]), fehler: erg.fehler }, null, 1));
await browser.close();
