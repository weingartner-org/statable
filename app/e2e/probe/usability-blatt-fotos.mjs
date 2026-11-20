// Usability Stufe 4 (10.11.): ganzseitige Bildschirmfotos der Ergebnisblätter (Messlatte vor dem Umbau).
// Zweck: zwei Blätter, je als Einsteiger und als Profi, als ganze Seite (fullPage) fotografieren.
//   Blatt 1: t-Test (Konzentration nach Handy im Bett, 2 Gruppen) - wie ttestBlatt in usability-zaehlen.mjs.
//   Blatt 2: Varianzanalyse (Konzentration nach Semester, 5 Gruppen) - Karte "Unterscheiden sich Gruppen?".
//   Zusätzlich je Blatt ins Terminal: Zahl der Bedienelemente im #inhalt (Zählregel wie zaehleImSeite, Fachwort-Links getrennt),
//   und die Texte aller summary, h2 und h3 im #inhalt in Reihenfolge mit ihrer y-Position.
// Aufruf (Vorschau auf Port 4300):
//   PORT=4300 MARKE=stufe4-vorher [BREITE=375] [KONTRAST=1] [BLATT=ttest|anova] [AUS=<Ordner>] node e2e/probe/usability-blatt-fotos.mjs
// Standard: BREITE 1366 (unter 600 Höhe 812, sonst 850), Fotos nach docs/usability/messung-<n>/fotos/<MARKE>/ (relativ zum Repo).
// Schreibt nichts in die App. Einstellungen werden nur im Testkontext gesetzt (localStorage "statable-einst", Rundgang aus).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const U = `http://localhost:${process.env.PORT || 4300}/`;
const MARKE = process.env.MARKE || 'lauf';
const BREITE = Number(process.env.BREITE || 1366);
const HOEHE = BREITE < 600 ? 812 : 850;
const KONTRAST = process.env.KONTRAST === '1';
const NUR = process.env.BLATT || 'alle';
const AUS = path.resolve(process.env.AUS || path.join('..', 'docs', 'usability', 'messung-4', 'fotos', MARKE));
mkdirSync(AUS, { recursive: true });
const warte = (page, ms = 1200) => page.waitForTimeout(ms);

/** Läuft im Browser: zählt Bedienelemente in einem Wurzelelement (gleiche Regeln wie zaehleImSeite). */
function zaehleIn(root) {
  const BEDIEN = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=checkbox], [role=radio]';
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') return false;
    if (el.closest('[inert], [aria-hidden="true"]')) return false;
    return true;
  };
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const istFach = (el) => el.matches('.begriff-link, .begriff') || !!el.closest('.begriff-link');
  const hatBuchstabe = (t) => /[\p{L}\p{N}]/u.test(t);
  const roh = [...root.querySelectorAll(BEDIEN)];
  const fach = [], bedien = [], gesehen = new Set();
  for (let el of roh) {
    const r = el.getBoundingClientRect();
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && (r.width <= 2 || r.height <= 2 || el.classList.contains('nur-vorleser'))) {
      const lab = el.closest('label');
      if (!lab || gesehen.has(lab)) continue;
      gesehen.add(lab); el = lab;
    }
    if (!sichtbar(el) || gesehen.has(el) && el.tagName !== 'LABEL') continue;
    gesehen.add(el);
    if (istFach(el)) { fach.push(el); continue; }
    bedien.push(el);
  }
  for (const el of root.querySelectorAll('.begriff-link, .begriff')) if (!gesehen.has(el) && sichtbar(el)) { gesehen.add(el); fach.push(el); }
  const textVon = (el) => {
    if (el.tagName === 'LABEL') return norm(el.innerText) || (el.querySelector('input')?.getAttribute('aria-label') ?? '');
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const lt = [...(el.labels ?? [])].map(l => norm(l.innerText)).join(' ');
      if (el.type === 'submit' || el.type === 'button') return norm(el.value);
      return lt;
    }
    return norm(el.innerText) || norm(el.textContent);
  };
  let ohneText = 0, fragezeichen = 0;
  for (const el of bedien) {
    const t = textVon(el);
    if (el.classList.contains('hilfe-link') || t === '?') fragezeichen++;
    if (!hatBuchstabe(t) || t.length === 1 && !/[\p{L}\p{N}]/u.test(t)) ohneText++;
  }
  return { bedien: bedien.length, fachwortLinks: fach.length, ohneText, fragezeichen };
}

/** Läuft im Browser: Überschriften und Zusammenklapp-Bereiche im #inhalt in Reihenfolge. */
function gliederung() {
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const root = document.querySelector('#inhalt');
  if (!root) return [];
  return [...root.querySelectorAll('summary, h2, h3')].map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), text: norm(el.textContent).slice(0, 140), y: Math.round(r.top + scrollY), sichtbar: r.width > 0 && r.height > 0 };
  });
}

/** t-Test-Blatt "Handy im Bett x Konzentration": wie in usability-zaehlen.mjs. */
async function ttestBlatt(page) {
  await page.goto(U + '#blatt/neu'); await warte(page, 1500);
  await page.locator('[data-karte="gruppen"]').first().click(); await warte(page, 800);
  await page.locator('label.option', { hasText: 'Konzentration' }).first().click(); await warte(page, 600);
  await page.locator('label.option', { hasText: 'Handy im Bett' }).first().click();
  await page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
}

/** Varianzanalyse-Blatt "Semester x Konzentration" (5 Gruppen): Karte "Unterscheiden sich Gruppen?", Zahl Konzentration, Gruppe Semester. */
async function anovaBlatt(page) {
  await page.goto(U + '#blatt/neu'); await warte(page, 1500);
  await page.locator('[data-karte="gruppen"]').first().click(); await warte(page, 800);
  await page.locator('label.option', { hasText: 'Konzentration' }).first().click(); await warte(page, 600);
  await page.locator('label.option', { hasText: 'Semester' }).first().click();
  await page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
}

const BLAETTER = [
  { name: 'blatt-t-test', lauf: ttestBlatt, text: 'Blatt t-Test (Handy im Bett, 2 Gruppen)' },
  { name: 'blatt-anova', lauf: anovaBlatt, text: 'Blatt Varianzanalyse (Semester, 5 Gruppen)' },
].filter(bl => NUR === 'alle' || (NUR === 'ttest' && bl.name === 'blatt-t-test') || (NUR === 'anova' && bl.name === 'blatt-anova'));

const b = await chromium.launch();
console.log(`Lauf ${MARKE}: Breite ${BREITE}x${HOEHE}, Kontrast ${KONTRAST ? 'Schwarz auf Weiß' : 'hell'}, Fotos nach ${AUS}`);
for (const profi of [false, true]) {
  const variante = profi ? 'profi' : 'einsteiger';
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: BREITE, height: HOEHE } });
  await ctx.addInitScript(([kontrast, profi]) => {
    try {
      let alt = {};
      try { alt = JSON.parse(localStorage.getItem('statable-einst') || '{}') || {}; } catch { alt = {}; }
      const neu = { ...alt, rundgang: false, profi };
      if (kontrast) { neu.thema = 'sw'; localStorage.setItem('statable-thema-gewaehlt', '1'); }
      localStorage.setItem('statable-einst', JSON.stringify(neu));
    } catch { /* egal */ }
  }, [KONTRAST, profi]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  try {
    await page.goto(U + '#start'); await warte(page, 1500);
    await page.getByRole('button', { name: 'Beispiel öffnen' }).first().click();
    await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 });
    await warte(page, 2500);
  } catch (e) { console.log(variante, 'Beispiel öffnen FEHLER', String(e).slice(0, 150)); await ctx.close(); continue; }
  for (const bl of BLAETTER) {
    console.log(`\n--- ${bl.text} · ${variante} ---`);
    try {
      await bl.lauf(page);
      const werte = await page.evaluate(`(${zaehleIn.toString()})(document.querySelector('#inhalt'))`);
      console.log(`Zählung (Bedienelemente im #inhalt): ${werte.bedien} · Fachwort-Links getrennt: ${werte.fachwortLinks} · ohne Text: ${werte.ohneText} · "?"-Knöpfe: ${werte.fragezeichen}`);
      const glied = await page.evaluate(`(${gliederung.toString()})()`);
      console.log(`Überschriften und Aufklapp-Bereiche im #inhalt (${glied.length}):`);
      for (const g of glied) console.log(`  ${g.tag.padEnd(7)} y=${String(g.y).padStart(5)}${g.sichtbar ? '' : ' (verborgen)'}  ${g.text}`);
      const datei = path.join(AUS, `${bl.name}-${variante}.png`);
      await page.screenshot({ path: datei, fullPage: true });
      console.log('Foto:', datei);
    } catch (e) {
      console.log(`FEHLER bei ${bl.text} (${variante}):`, String(e).slice(0, 200));
    }
  }
  await ctx.close();
}
await b.close();
console.log('\nFertig.');
