// Barrierefreiheit Ausbau A3 (Themen, Fall-Kategorie-Matrix mit Themen-Spalten): Tastatur-Ablauf und axe-core (WCAG 2.2 AA), 320 px ohne waagrechtes Scrollen.
// Aufruf aus app/:  PORT=5192 node e2e/probe/bf-ausbau-a3-themen.mjs     (Dev-Server auf 127.0.0.1). Nur headless. Rohdaten: docs/ausbau/bf-a3/axe-themen.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 5192}/#kodieren`;
const OUT_DIR = path.resolve(APP, '../docs/ausbau/bf-a3');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ergebnis = { zeitpunkt: new Date().toISOString(), url: URL_, browser: 'chromium headless', zustaende: [], tastatur: [], fehler: [] };

async function axeLauf(page) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    const map = (x) => ({ id: x.id, impact: x.impact, hilfe: x.help, knoten: x.nodes.map((n) => ({ ziel: n.target.join(' '), meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || '').slice(0, 200), html: n.html.slice(0, 160) })) });
    return { verstoesse: r.violations.map(map), unklar: r.incomplete.map(map), bestanden: r.passes.length };
  }, TAGS);
}
async function zustandAxe(page, name) {
  const r = await axeLauf(page);
  const n = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  // Verstöße in den Bausteinen dieser Stufe (Themen, Fall-Kategorie-Matrix) getrennt zählen
  const eigene = await page.evaluate((v) => v.flatMap((x) => x.knoten.filter((k) => { try { return !!document.querySelector(k.ziel)?.closest('.th, .fk'); } catch { return false; } }).map((k) => x.id + ' ' + k.ziel)), r.verstoesse);
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ergebnis.zustaende.push({ name, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: n, davonInDiesenBausteinen: eigene.length, eigene, unklarRegeln: r.unklar.length, bestanden: r.bestanden, seitenUeberlaufPx: ueberlauf, ...r });
  console.log(`[${name}] Verstoss-Regeln: ${r.verstoesse.length} (Stellen: ${n}, davon in Themen/Matrix: ${eigene.length}), unklar: ${r.unklar.length}, bestanden: ${r.bestanden}, Ueberlauf: ${ueberlauf}px`);
  for (const v of r.verstoesse) console.log(`    ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel).join(' ; ').slice(0, 220)}`);
}
const aktiv = (page) => page.evaluate(() => { const e = document.activeElement; return e ? { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) } : null; });
// Mit Tab (oder Umschalt+Tab) zu einem Element mit dieser id
async function tabZu(page, id, { rueck = false, max = 250 } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(rueck ? 'Shift+Tab' : 'Tab');
    if ((await aktiv(page))?.id === id) return i + 1;
  }
  throw new Error(`Tab erreicht ${id} nicht nach ${max} Tasten`);
}
async function probiere(name, fn) {
  try { await fn(); ergebnis.tastatur.push({ schritt: name, ok: true }); console.log(`OK    ${name}`); }
  catch (e) { ergebnis.tastatur.push({ schritt: name, ok: false, fehler: String(e.message || e).slice(0, 300) }); ergebnis.fehler.push(name); console.log(`FEHLER ${name}: ${String(e.message || e).slice(0, 200)}`); }
}
const pruefe = (b, t) => { if (!b) throw new Error(t); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-AT' });
const page = await ctx.newPage();
page.on('pageerror', (e) => { ergebnis.fehler.push(`pageerror: ${e.message}`); console.log('pageerror', e.message); });
await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
await page.locator('#ko-laden').click();
await page.waitForSelector('#ko-text', { timeout: 20000 }); await page.waitForTimeout(1500);
await page.locator('#ko-arbeitsweise').selectOption('ta-reflexiv');
await page.waitForSelector('#th-neu-name', { timeout: 10000 });
const codeIds = await page.evaluate(() => [...document.querySelectorAll('[id^="ko-b-"]')].map((e) => e.id).slice(0, 6));
console.log('Codebaum-Eintraege:', codeIds.length);

// Springt zum Bereich Themen und von dort mit Tab zum Feld (Tastatur)
const zumThemenFeld = async () => { await page.evaluate(() => document.getElementById('ko-themen-t')?.focus()); await tabZu(page, 'th-neu-name'); };
async function neuesThema(name) {
  await zumThemenFeld();
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const a = await aktiv(page);
  pruefe(a?.id === 'th-detail-t', `Fokus nach Anlegen auf ${a?.id}, erwartet th-detail-t`);
}

await probiere('Drei Themen nur mit Tastatur anlegen (Enter im Namensfeld, Fokus auf dem neuen Thema)', async () => {
  await neuesThema('Weg ins Studium');
  await neuesThema('Sorgen ums Geld');
  await neuesThema('Hilfe suchen');
  const n = await page.locator('.th-liste > li').count();
  pruefe(n >= 3, `nur ${n} Themen in der Liste`);
});

await probiere('Fehlersatz bei doppeltem Namen', async () => {
  await zumThemenFeld();
  await page.keyboard.type('Hilfe suchen'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const t = await page.locator('#th-neu-fehler').textContent();
  pruefe(/schon vergeben/.test(t || ''), 'kein Fehlersatz');
  await page.locator('#th-neu-name').fill('');
});

// Thema „Hilfe suchen“ ist offen; Codes zuordnen mit Tastatur
await probiere('Codes zuordnen: Knopf, Fokus ins Suchfeld, Leertaste, Esc zurueck auf den Knopf', async () => {
  await tabZu(page, 'th-code-zuordnen', { rueck: false }).catch(async () => { await page.evaluate(() => document.getElementById('th-detail-t')?.focus()); await tabZu(page, 'th-code-zuordnen'); });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  pruefe((await aktiv(page))?.id === 'th-code-suche', 'Fokus nicht im Suchfeld');
  await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const n = await page.locator('#th-codes-t').textContent();
  pruefe(/\(2\)/.test(n || ''), `Codes: ${n}`);
  await zustandAxe(page, 'Themen: Code-Auswahl offen, Detail');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  pruefe((await aktiv(page))?.id === 'th-code-zuordnen', 'Fokus nach Esc nicht auf dem Knopf');
});

await probiere('Belege wählen mit Leertaste (Kästchen) und Zeigen-Knopf erreichbar', async () => {
  const anz = await page.locator('#th-belege-t ~ ul input[type=checkbox]').count();
  pruefe(anz > 0, 'keine Stellen als Beleg angeboten');
  await page.locator('#th-belege-t ~ ul input[type=checkbox]').first().focus();
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  pruefe(await page.locator('#th-belege-t ~ ul input[type=checkbox]').first().isChecked(), 'Beleg nicht gewählt');
});

async function standSetzen(zu) {
  await page.evaluate(() => document.getElementById('th-stand-knopf')?.focus());
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');   // Notiz, dann das gewählte Optionsfeld
  const a = await aktiv(page);
  pruefe(a?.typ === 'radio', `kein Optionsfeld, sondern ${a?.tag} ${a?.typ}`);
  const reihe = ['kandidat', 'aktiv', 'verworfen'];
  const ist = await page.evaluate(() => document.querySelector('input[name="th-stand"]:checked')?.value);
  const d = reihe.indexOf(zu) - reihe.indexOf(ist);
  for (let i = 0; i < Math.abs(d); i++) await page.keyboard.press(d > 0 ? 'ArrowDown' : 'ArrowUp');
  await page.keyboard.press('Tab'); await page.keyboard.type('weil es sich mit einem anderen deckt'); await page.keyboard.press('Tab');
  pruefe((await aktiv(page))?.id === 'th-stand-knopf', 'Fokus nicht auf Stand-Knopf');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  pruefe((await aktiv(page))?.id === 'th-stand-knopf', 'Fokus nach dem Übernehmen nicht auf dem Stand-Knopf');
}
await probiere('Thema verwerfen und wieder aufnehmen (Optionsfeld, Notiz, Knopf; Fokus bleibt)', async () => {
  await standSetzen('verworfen');
  const h = await page.locator('#th-detail-t').textContent();
  pruefe(/verworfen/.test(h || ''), `Überschrift: ${h}`);
  pruefe(await page.locator('details.verworfen').count() === 1, 'keine Gruppe Verworfene');
  await page.locator('details.verworfen > summary').click();
  await zustandAxe(page, 'Themen: verworfenes Thema gewählt, Verworfene aufgeklappt');
  await page.locator('details.verworfen > summary').click();
  await standSetzen('aktiv');
  const h2 = await page.locator('#th-detail-t').textContent();
  pruefe(/aktiv/.test(h2 || ''), `Überschrift: ${h2}`);
  const v = await page.locator('#th-verlauf-t ~ ul li').allTextContents();
  pruefe(v.some((x) => /Verworfen/.test(x)) && v.some((x) => /Wieder aufgenommen/.test(x)), 'Verlauf ohne verworfen/wieder aufgenommen');
});

await probiere('Zwei Themen zusammenlegen mit Tastatur (details, Kästchen, Knopf)', async () => {
  await page.evaluate(() => document.getElementById('th-detail-t')?.focus());
  await page.locator('details.werkzeug > summary', { hasText: 'zusammenlegen' }).focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  await tabZu(page, 'th-ziel');
  await page.keyboard.press('Tab');  // erstes Kästchen
  await page.keyboard.press('Space');
  await zustandAxe(page, 'Themen: Zusammenlegen aufgeklappt');
  await tabZu(page, 'th-zusammen-knopf');
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  pruefe((await aktiv(page))?.id === 'th-zusammen-knopf', 'Fokus nach dem Zusammenlegen nicht auf dem Knopf');
  const n = await page.locator('details.verworfen > summary').textContent();
  pruefe(/\(1\)/.test(n || ''), `Verworfene: ${n}`);
});

await probiere('Knopf Rückgängig nimmt das Zusammenlegen zurück', async () => {
  const vorher = await page.locator('details.verworfen > summary').textContent();
  await page.locator('#ko-rueck').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const nachher = await page.locator('details.verworfen').count() ? await page.locator('details.verworfen > summary').textContent() : '(keine)';
  pruefe(vorher !== nachher, `unverändert: ${vorher}`);
});

await zustandAxe(page, 'Themen: Liste und Detail (Arbeitsweise reflexive Themenanalyse)');

// Framework: Matrix mit Themen-Spalten
await probiere('Framework: Matrix mit Themen-Spalten (Optionsfeld per Tastatur), Zelle öffnen, Zusammenfassung schreiben', async () => {
  // Themen brauchen Codes, damit Zellen Belege haben: dem ersten Thema Codes zuordnen (Vorbereitung per Maus)
  await page.locator('#ko-arbeitsweise').selectOption('framework');
  await page.waitForTimeout(500);
  await page.locator('input[name="ko-auswerten"][value="fk"]').check({ force: true });
  await page.waitForTimeout(700);
  await page.locator('input[name="ko-fk-art"][value="themen"]').focus();
  await page.keyboard.press('Space'); await page.waitForTimeout(500);
  pruefe(await page.locator('.fk-tabelle table').count() === 1, 'keine Tabelle');
  const kopf = await page.locator('.fk-tabelle thead th').allTextContents();
  pruefe(kopf.length >= 2 && kopf.some((t) => /Sorgen ums Geld/.test(t)), `Kopf: ${kopf.join(' | ')}`);
  await page.locator('.fk-tabelle td button.zelle').first().focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  pruefe((await aktiv(page))?.id === 'ko-fk-zelle-t', 'Fokus nicht auf der Zellenüberschrift');
  await tabZu(page, 'ko-fk-zus');
  await page.keyboard.type('Eigene Zusammenfassung.');
  await tabZu(page, 'ko-fk-speichern'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const z = await page.locator('.fk-tabelle .zus').allTextContents();
  pruefe(z.some((t) => /Eigene Zusammenfassung/.test(t)), 'Zusammenfassung nicht in der Tabelle');
  await zustandAxe(page, 'Framework: Matrix mit Themen-Spalten, Zelle offen');
});

// IPA: persönliche und Gruppenthemen
await probiere('IPA: zwei Gruppen PET und GET', async () => {
  await page.locator('#ko-arbeitsweise').selectOption('ipa');
  await page.waitForSelector('#th-pet-t', { timeout: 8000 });
  pruefe(await page.locator('#th-get-t').count() === 1, 'GET-Gruppe fehlt');
  await zustandAxe(page, 'Themen: IPA (PET und GET)');
});

// 320 px
await page.setViewportSize({ width: 320, height: 800 });
await page.locator('#ko-arbeitsweise').selectOption('ta-reflexiv'); await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('ko-themen-t')?.scrollIntoView());
await zustandAxe(page, 'Themen: 320 px');
await page.locator('#ko-arbeitsweise').selectOption('framework'); await page.waitForTimeout(600);
await page.locator('input[name="ko-auswerten"][value="fk"]').check({ force: true }); await page.waitForTimeout(500);
await zustandAxe(page, 'Framework mit Themen: 320 px');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'axe-themen.json'), JSON.stringify(ergebnis, null, 1));
const nV = ergebnis.zustaende.reduce((s, z) => s + z.davonInDiesenBausteinen, 0);
console.log(`\nFertig: ${ergebnis.zustaende.length} Zustände, Verstöße in Themen/Matrix: ${nV}, Tastatur-Schritte: ${ergebnis.tastatur.filter((t) => t.ok).length}/${ergebnis.tastatur.length} ok, Fehler: ${ergebnis.fehler.length}`);
await browser.close();
