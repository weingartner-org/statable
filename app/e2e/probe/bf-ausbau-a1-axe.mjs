// Barrierefreiheit Ausbau A1 (Kodier-Arbeitsplatz: evaluative und typenbildende Inhaltsanalyse, Nachvollziehbarkeit; #interviews: REFI-QDA schreiben).
// axe-core (WCAG 2.2 AA) in 13 Zuständen (Kontrastmodus, 320 px mit Überlauf-Prüfung), Tastatur-Durchlauf durch drei Zustände.
// Aufruf aus app/:  PORT=4291 node e2e/probe/bf-ausbau-a1-axe.mjs     (Dev-Server auf 127.0.0.1). Nur headless. Rohdaten: docs/ausbau/bf-a1/axe.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 4291}/#kodieren`;
const OUT_DIR = path.resolve(APP, '../docs/ausbau/bf-a1');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ABSCHNITT = 'Bereich Auswerten';
const VIEWS = [
  { wert: 'uebersicht', start: 'Was ist wo kodiert' },
  { wert: 'fk', start: 'Was sagt jeder Fall' },
  { wert: 'matrix', start: 'Wie oft kommt welcher Code' },
  { wert: 'landkarte', start: 'Welche Codes kommen zusammen' },
  { wert: 'aehnlich', start: 'Wo steht noch etwas Ähnliches' },
];

const ergebnis = { zeitpunkt: new Date().toISOString(), url: URL_, browser: 'chromium headless', zustaende: [], tastatur: {}, erstnutzer: {}, matrixWord: {}, fehler: [] };

async function axeLauf(page) {
  const da = await page.evaluate(() => !!window.axe);
  if (!da) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    const map = (x) => ({
      id: x.id, impact: x.impact, hilfe: x.help,
      knoten: x.nodes.map((n) => ({
        ziel: n.target.join(' '),
        meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || '').slice(0, 200),
        html: n.html.slice(0, 160),
      })),
    });
    return { verstoesse: r.violations.map(map), unklar: r.incomplete.map(map), bestanden: r.passes.length };
  }, TAGS);
}

async function zustandAxe(page, name, notiz = '') {
  const r = await axeLauf(page);
  const anzahl = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  ergebnis.zustaende.push({ name, notiz, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: anzahl, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen: ${anzahl}), unklar: ${r.unklar.length}, bestanden: ${r.bestanden}`);
  for (const v of r.verstoesse) console.log(`    ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel).join(' ; ').slice(0, 220)}`);
  return r;
}

// Aktives Element: Tag, id, Rolle, Name, Fokusrahmen, Abschnitt (aria-label der section)
const info = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  if (!e.dataset.probeId) { window.__pid = (window.__pid || 0) + 1; e.dataset.probeId = String(window.__pid); }
  const cs = getComputedStyle(e);
  const ids = (s) => s.split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join(' ');
  let name = e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') ? ids(e.getAttribute('aria-labelledby')) : '');
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name && e.getAttribute('role') === 'treeitem') {
    const c = e.cloneNode(true);
    c.querySelectorAll('[role=group], ul').forEach((n) => n.remove());
    name = c.textContent || '';
  }
  if (!name) name = (e.textContent || e.value || '');
  name = name.replace(/\s+/g, ' ').trim().slice(0, 90);
  const rahmen = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (!!cs.boxShadow && cs.boxShadow !== 'none');
  const abschnitt = e.closest('section[aria-label]')?.getAttribute('aria-label') || '';
  const x = { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', typ: e.type || '', wert: e.value || '', name, rahmen, fokusVisible: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, abschnitt };
  x.key = x.id || `${x.tag}|${x.rolle}|${x.typ}|${x.name}|#${e.dataset.probeId}`;
  return x;
});

// Tab-Durchlauf ab Seitenanfang, nur für den Ausgangstext der Tastatur-Prüfung
async function tabBis(page, praed, { max = 120, rueck = false } = {}) {
  const taste = rueck ? 'Shift+Tab' : 'Tab';
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(taste);
    const x = await info(page);
    if (!x) return { ok: false, grund: 'Fokus fiel auf body', n: i + 1 };
    if (praed(x)) return { ok: true, n: i + 1, name: x.name, id: x.id };
  }
  return { ok: false, grund: `nicht erreicht nach ${max} Tastendrücken`, n: max };
}

// Frische Seite. Mit Beispielprojekt (Klick auf „Beispielprojekt laden“, nur für Vorbereitung)
async function frischLaden(page, laden = true) {
  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
  if (laden) {
    await page.locator('#ko-laden').click();
    await page.waitForSelector('#ko-text', { timeout: 20000 }); await page.waitForTimeout(1500);
  }
}

// Ansicht per Maus wählen (nur Vorbereitung der Zustände; die Tastatur-Prüfung nutzt Pfeiltasten)
async function ansichtWaehlen(page, wert) {
  await page.locator(`input[name="ko-auswerten"][value="${wert}"]`).check({ force: true });
  await page.waitForTimeout(700);
}

// Vorbereitung: in der Fall-Kategorie-Matrix sind ohne Code keine Zellen da (Befund), daher alle Codes wählen
async function alleCodesMaus(page) {
  await page.locator('.r-auswerten button').filter({ hasText: /^Alle Codes wählen$/ }).first().click();
  await page.waitForTimeout(700);
}

async function probiere(name, fn) {
  try { await fn(); } catch (e) { ergebnis.fehler.push({ wo: name, fehler: String(e.message || e).slice(0, 300) }); console.log(`FEHLER in ${name}: ${String(e.message || e).slice(0, 200)}`); }
}

// 2. Tastatur: von der Radio-Gruppe „Ansicht“ durch jede Ansicht mit Tab, Ausstieg aus dem Abschnitt, Umschalt+Tab zurück
async function laufeAbIn(page, radio, ABSCHNITT) {
  const seq = []; let ende = 'innerhalb-max';
  for (let i = 0; i < 600; i++) {
    await page.keyboard.press('Tab');
    const x = await info(page);
    if (!x) { ende = 'body'; break; }
    seq.push(x);
    if (x.abschnitt !== ABSCHNITT) { ende = 'verlassen'; break; }
    if (seq.length > 1 && seq[seq.length - 2].key === x.key) { ende = 'stecken'; break; }
  }
  const r = { vorwaerts: { schritte: seq.length, ende, ohneSichtbarenFokus: seq.filter((x) => !x.rahmen && !x.fokusVisible).map((x) => x.key), reihenfolge: seq.map((x) => ({ key: x.key, tag: x.tag, typ: x.typ, name: x.name.slice(0, 70), fokusVisible: x.fokusVisible })) } };
  if (ende === 'verlassen') {
    // Der letzte Eintrag ist der Ausstieg (außerhalb); Umschalt+Tab startet dort und endet bei der Radio-Gruppe
    const soll = [radio, ...seq.slice(0, -1)].reverse();
    const abw = [];
    for (let i = 0; i < soll.length; i++) {
      await page.keyboard.press('Shift+Tab');
      const x = await info(page);
      if (!x || x.key !== soll[i].key) { abw.push({ erwartet: soll[i].key, bekam: x ? x.key : 'body', bei: i }); break; }
    }
    r.umschaltTab = { geprueft: true, schritte: soll.length, abweichungen: abw };
  } else {
    r.umschaltTab = { geprueft: false, grund: `Vorwärtslauf endete mit „${ende}“` };
    for (let i = 0; i < 400; i++) { await page.keyboard.press('Shift+Tab'); const x = await info(page); if (x && x.name === radio?.name) break; }
  }
  const zurueck = await info(page);
  r.zurueckAufRadio = !!zurueck && zurueck.name === radio?.name;
  return r;
}


// ---------- Ausbau A1: neue Zustände ----------
const KAT = 'Zuversicht'; // „Belastung“ gibt es im Beispielprojekt schon

async function eingestufteKategorie(page) {
  // evaluativ, Kategorie anlegen, eine Stelle mit dem Code kodieren, einstufen
  await ansichtWaehlen(page, 'evaluativ');
  await page.locator('#ko-ev-neu-name').fill(KAT);
  await page.locator('#ko-ev-neu-ausp').fill('hoch\nmittel\nniedrig');
  await page.locator('#ko-ev-neu-btn').click();
  await page.waitForTimeout(600);
  // Stelle kodieren (Sätze-Ansicht)
  await page.locator('#ko-ansicht-saetze').check({ force: true });
  await page.waitForSelector('#ko-liste', { timeout: 8000 });
  await page.locator('#ko-liste').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#ko-cl-suche', { timeout: 8000 });
  await page.keyboard.type(KAT);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  // einstufen
  const sel = page.locator('select[id^="ko-ev-sel-"]').first();
  const da = await sel.count();
  if (da) { await sel.selectOption({ index: 1 }); await page.waitForTimeout(500); }
  return { stelleDa: da > 0 };
}

async function typenMitTyp(page, loeschenFrage = false) {
  await ansichtWaehlen(page, 'typen');
  const boxen = page.locator('#ko-ty-codes-leg').locator('xpath=..').locator('input[type=checkbox]');
  const n = await boxen.count();
  await boxen.nth(0).check({ force: true });
  if (n > 1) await boxen.nth(1).check({ force: true });
  await page.waitForTimeout(500);
  await page.locator('#ko-ty-neu-name').fill('Typ A');
  await page.locator('#ko-ty-neu-btn').click();
  await page.waitForTimeout(700);
  const fall = page.locator('[id^="ko-ty-typ-"]').first().locator('xpath=ancestor::section[1]').locator('input[type=checkbox]').first();
  const nf = await fall.count();
  if (nf) { await fall.check({ force: true }); await page.waitForTimeout(500); }
  let rueckfrage = false;
  if (loeschenFrage) {
    await page.locator('button').filter({ hasText: /^Typ „.+“ löschen$/ }).first().click();
    rueckfrage = await page.waitForSelector('[id^="ko-ty-ja-"]', { state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(400);
  }
  return { merkmale: Math.min(n, 2), fallZugeordnet: nf > 0, rueckfrage };
}

async function umbenennenUndProtokoll(page) {
  // erster Code im Baum wählen und umbenennen
  await page.locator('#ko-baum [role=treeitem]').first().click();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#ko-baum-name', { timeout: 6000 });
  const alt = await page.locator('#ko-baum-name').inputValue();
  await page.locator('#ko-baum-name').fill(alt + ' neu');
  await page.keyboard.press('Tab'); // löst change aus
  await page.waitForTimeout(600);
  await page.locator('#ko-nachv-auf').click();
  await page.waitForSelector('#nv-art', { timeout: 6000 });
  await page.waitForTimeout(400);
  const artN = await page.locator('#nv-art option').count();
  if (artN > 1) await page.locator('#nv-art').selectOption({ index: 1 });
  const codeN = await page.locator('#nv-code option').count();
  if (codeN > 1) await page.locator('#nv-code').selectOption({ index: 1 });
  await page.waitForTimeout(500);
  const eintraege = await page.locator('#nv-zaehler').textContent().catch(() => '');
  return { umbenannt: alt, artOptionen: artN, codeOptionen: codeN, zaehler: eintraege };
}

async function ueberlauf(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth, ok: document.documentElement.scrollWidth <= 320 }));
}

async function zustaende(browser) {
  const fehler = [];
  const neu = async (vp = { width: 1280, height: 800 }) => {
    const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fehler.push(e.message));
    return { ctx, page };
  };
  const z = async (name, vp, fn, { kontrast = false, breite = false } = {}) => probiere(name, async () => {
    const { ctx, page } = await neu(vp);
    await frischLaden(page);
    const notiz = await fn(page);
    if (kontrast) { await page.emulateMedia({ forcedColors: 'active' }); await page.waitForTimeout(600); }
    await page.waitForTimeout(400);
    if (breite) { const u = await ueberlauf(page); ergebnis.ueberlauf320 = ergebnis.ueberlauf320 || {}; ergebnis.ueberlauf320[name] = u; console.log(`    Überlauf ${name}: ${JSON.stringify(u)}`); }
    await zustandAxe(page, name, JSON.stringify(notiz ?? ''));
    await ctx.close();
  });
  const D = { width: 1280, height: 800 }, S = { width: 320, height: 700 };

  await z('a evaluativ ohne Kategorie', D, async (p) => { await ansichtWaehlen(p, 'evaluativ'); });
  await z('b evaluativ mit Kategorie und eingestufter Stelle', D, eingestufteKategorie);
  await z('c Typen mit zwei Merkmalen und einem Typ', D, (p) => typenMitTyp(p));
  await z('d Typ-Löschen-Rückfrage offen', D, (p) => typenMitTyp(p, true));
  await z('e Nachvollziehbarkeit nach Umbenennung, Filter gesetzt', D, umbenennenUndProtokoll);
  await z('f KI-Nutzung Ja mit Zweck und Text', D, async (p) => {
    await p.locator('#ko-nachv-auf').click();
    await p.waitForSelector('input[name="nv-ki"]', { timeout: 6000 });
    await p.locator('input[name="nv-ki"][value="ja"]').focus();
    await p.keyboard.press('Space');
    await p.waitForTimeout(1200);
    await p.locator('#nv-ki-t').locator('xpath=ancestor::section[1]').locator('input[type=checkbox]').first().focus();
    await p.keyboard.press('Space');
    await p.locator('#nv-ki-text').fill('Transkription mit einem lokalen Werkzeug, anschließend von mir geprüft.');
    await p.waitForTimeout(400);
  });
  await z('g1 Kontrastmodus evaluativ (wie b)', D, eingestufteKategorie, { kontrast: true });
  await z('g2 Kontrastmodus Nachvollziehbarkeit (wie e)', D, umbenennenUndProtokoll, { kontrast: true });
  await z('h1 320 px evaluativ (wie b)', S, eingestufteKategorie, { breite: true });
  await z('h2 320 px Typen (wie c)', S, (p) => typenMitTyp(p), { breite: true });
  await z('h3 320 px Nachvollziehbarkeit (wie e)', S, umbenennenUndProtokoll, { breite: true });
  // i: #interviews, REFI-QDA
  await probiere('i', async () => {
    const { ctx, page } = await neu(D);
    await page.goto(URL_.replace('#kodieren', '#interviews')); await page.waitForTimeout(2500);
    const knopf = page.locator('button').filter({ hasText: /Als REFI-QDA-Projekt speichern/ }).first();
    const da = await knopf.count();
    if (da) await knopf.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const bes = da ? await knopf.getAttribute('aria-describedby') : null;
    const satz = bes ? await page.locator('#' + bes).textContent().catch(() => null) : null;
    await zustandAxe(page, 'i #interviews REFI-QDA-Bereich', JSON.stringify({ knopfDa: da > 0, describedby: bes, satz: (satz || '').trim().slice(0, 100) }));
    await ctx.close();
  });
  ergebnis.seitenfehler = fehler;
}

// Tastatur-Durchlauf: Start im Bereich (Radio „Auswerten“ bzw. Zusammenfassung Nachvollziehbarkeit)
async function tastaturLauf(browser) {
  const ctx0 = { locale: 'de-DE', viewport: { width: 1280, height: 800 } };
  const proben = [
    { name: 'b evaluativ', abschnitt: 'Bereich Auswerten', vorbereiten: eingestufteKategorie, start: (p) => p.locator('input[name="ko-auswerten"]:checked').focus() },
    { name: 'c Typen', abschnitt: 'Bereich Auswerten', vorbereiten: (p) => typenMitTyp(p), start: (p) => p.locator('input[name="ko-auswerten"]:checked').focus() },
    { name: 'e Nachvollziehbarkeit', abschnitt: 'Bereich Nachvollziehbarkeit', vorbereiten: umbenennenUndProtokoll, start: (p) => p.locator('#ko-nachv-auf').focus() },
  ];
  ergebnis.tastatur.laeufe = [];
  for (const pr of proben) {
    await probiere('Tastatur ' + pr.name, async () => {
      const ctx = await browser.newContext(ctx0); const page = await ctx.newPage();
      await frischLaden(page);
      await pr.vorbereiten(page);
      await page.waitForTimeout(500);
      await pr.start(page);
      const start = await info(page);
      const r = await laufeAbIn(page, start, pr.abschnitt);
      const e = { probe: pr.name, start: start?.name ?? null, ...r };
      ergebnis.tastatur.laeufe.push(e);
      console.log(`[Tab ${pr.name}] Vorwärts: ${r.vorwaerts.schritte} Schritte, Ende: ${r.vorwaerts.ende}, ohne sichtbaren Fokus: ${r.vorwaerts.ohneSichtbarenFokus.length} ${JSON.stringify(r.vorwaerts.ohneSichtbarenFokus).slice(0, 200)}, Umschalt+Tab: ${JSON.stringify(r.umschaltTab).slice(0, 200)}, zurück: ${r.zurueckAufRadio}`);
      await ctx.close();
    });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const b = await chromium.launch({ headless: true });
try {
  await probiere('Zustände', () => zustaende(b));
  await probiere('Tastatur', () => tastaturLauf(b));
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
