// Barrierefreiheit Stufe 6c (Kodier-Arbeitsplatz, Bereich „Auswerten“ und „Fälle und Variablen“, Fachblatt 6c Abschnitt 3.8 „Automatisch“):
// 1. axe-core (WCAG 2.2 AA) in 12 Zuständen (fünf Ansichten, Matrix mit offener Zelle, Kontrastmodus und 375 px für Matrix und Übersicht,
//    Fälle mit offener Umbenennen-Zeile und offener Löschen-Rückfrage),
// 2. Tastatur-Durchlauf durch jede Ansicht (keine Falle, sichtbarer Fokus, Umschalt+Tab genau rückwärts),
// 3. Erstnutzer-Probe nur mit Tastatur: Matrix wählen, Zusammenfassung zu einem Code schreiben, speichern, Matrix als Word laden.
// Aufruf aus app/:  PORT=4286 node e2e/probe/bf-erheben6c-axe.mjs     (Vorschau auf 127.0.0.1, PORT überschreibbar)
// Nur headless. Schreibt Rohdaten nach docs/erheben/bf-stufe6c/axe.json, Word nach docs/erheben/bf-stufe6c/matrix.docx.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 4286}/#kodieren`;
const OUT_DIR = path.resolve(APP, '../docs/erheben/bf-stufe6c');
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
  const abschnitt = e.closest('section')?.getAttribute('aria-label') || '';
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

// 1. axe-Zustände (je Zustand frischer Kontext)
async function axeZustaende(browser) {
  const fehler = [];
  const neu = async (vp = { width: 1280, height: 800 }) => {
    const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fehler.push(e.message));
    return { ctx, page };
  };

  // Z1–Z5: die fünf Ansichten
  await probiere('Z1', async () => { const { ctx, page } = await neu(); await frischLaden(page); await zustandAxe(page, '1 Ansicht Dokument-Übersicht (Voreinstellung)'); await ctx.close(); });
  await probiere('Z2', async () => { const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'fk'); await zustandAxe(page, '2 Ansicht Fall-Kategorie-Matrix', 'ohne gewählten Code (Hinweis „Wählen Sie mindestens einen Code.“)'); await ctx.close(); });
  await probiere('Z3', async () => { const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'matrix'); await zustandAxe(page, '3 Ansicht Code-Matrix'); await ctx.close(); });
  await probiere('Z4', async () => {
    const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'landkarte');
    await page.locator('#ko-lk-zeichnen').click();
    const gezeichnet = await page.waitForSelector('#ko-lk-erg-t', { timeout: 30000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    await zustandAxe(page, '4 Ansicht Code-Landkarte gezeichnet', `gezeichnet: ${gezeichnet}`);
    await ctx.close();
  });
  await probiere('Z5', async () => {
    const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'aehnlich');
    await page.locator('#ko-ae-suchen').click();
    const gefunden = await page.waitForSelector('#ko-ae-erg-t', { timeout: 30000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    const n = await page.locator('#ko-ae-erg-t ~ ol li, ol li').count();
    await zustandAxe(page, '5 Ansicht ähnliche Stellen gesucht', `Ergebnis-Liste da: ${gefunden}, Einträge: ${n}`);
    await ctx.close();
  });

  // Z6: Matrix, Zelle „… Belege“ geöffnet, Feld Zusammenfassung sichtbar
  await probiere('Z6', async () => {
    const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'fk'); await alleCodesMaus(page);
    const zelle = page.locator('.r-auswerten button.zelle').filter({ hasText: /^[1-9]\d* Belege?$/ }).first();
    const nZelle = await zelle.count();
    if (nZelle) await zelle.click();
    const zus = await page.waitForSelector('#ko-fk-zus', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(600);
    await zustandAxe(page, '6 Matrix, Zelle geöffnet, Feld Zusammenfassung', `Zelle mit Belegen: ${nZelle ? 'ja' : 'nein'}, Feld sichtbar: ${zus}`);
    await ctx.close();
  });

  // Z7–Z10: Kontrastmodus und 375 px für Matrix und Übersicht
  await probiere('Z7', async () => { const { ctx, page } = await neu(); await frischLaden(page); await ansichtWaehlen(page, 'fk'); await alleCodesMaus(page); await page.emulateMedia({ forcedColors: 'active' }); await page.waitForTimeout(700); await zustandAxe(page, '7 Matrix, Kontrastmodus (forced-colors)'); await ctx.close(); });
  await probiere('Z8', async () => { const { ctx, page } = await neu(); await frischLaden(page); await page.emulateMedia({ forcedColors: 'active' }); await page.waitForTimeout(700); await zustandAxe(page, '8 Übersicht, Kontrastmodus (forced-colors)'); await ctx.close(); });
  await probiere('Z9', async () => { const { ctx, page } = await neu({ width: 375, height: 812 }); await frischLaden(page); await ansichtWaehlen(page, 'fk'); await alleCodesMaus(page); await page.waitForTimeout(500); await zustandAxe(page, '9 Matrix, schmal 375 x 812'); await ctx.close(); });
  await probiere('Z10', async () => { const { ctx, page } = await neu({ width: 375, height: 812 }); await frischLaden(page); await page.waitForTimeout(500); await zustandAxe(page, '10 Übersicht, schmal 375 x 812'); await ctx.close(); });

  // Z11–Z12: Fälle und Variablen
  await probiere('Z11', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('[id^="ko-um-btn-fall-"]').first().click();
    const offen = await page.waitForSelector('#ko-um-feld', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(500);
    await zustandAxe(page, '11 Fälle, Umbenennen-Zeile offen', `Feld sichtbar: ${offen}`);
    await ctx.close();
  });
  await probiere('Z12', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('button').filter({ hasText: /^Fall „.+“ löschen$/ }).first().click();
    const da = await page.waitForSelector('#ko-fv-behalten', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(500);
    await zustandAxe(page, '12 Fälle, Löschen-Rückfrage offen', `Rückfrage sichtbar: ${da}`);
    await ctx.close();
  });
  ergebnis.seitenfehler = fehler;
}

// 2. Tastatur: von der Radio-Gruppe „Ansicht“ durch jede Ansicht mit Tab, Ausstieg aus dem Abschnitt, Umschalt+Tab zurück
async function laufeAb(page, radio) {
  const seq = []; let ende = 'innerhalb-max';
  for (let i = 0; i < 300; i++) {
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
    for (let i = 0; i < 400; i++) { await page.keyboard.press('Shift+Tab'); const x = await info(page); if (x && x.typ === 'radio' && x.name === radio?.name) break; }
  }
  const zurueck = await info(page);
  r.zurueckAufRadio = !!zurueck && zurueck.name === radio?.name;
  return r;
}

async function tastatur(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await frischLaden(page);

  const eintritt = await tabBis(page, (x) => x.abschnitt === ABSCHNITT && x.typ === 'radio' && x.name.startsWith('Was ist wo kodiert'), { max: 400 });
  ergebnis.tastatur.eintritt = eintritt;
  console.log(`[Tab Auswerten] Eintritt in die Radio-Gruppe: ${JSON.stringify(eintritt)}`);
  ergebnis.tastatur.ansichten = [];
  if (!eintritt.ok) { await ctx.close(); return; }

  const protokollier = (name, gewaehlt, radio, r) => {
    const e = { ansicht: name, gewaehlt, radioFokus: radio?.name ?? null, radioSichtbar: !!radio?.fokusVisible, ...r };
    ergebnis.tastatur.ansichten.push(e);
    console.log(`[Tab ${name}] gewählt: ${gewaehlt}, Vorwärts: ${r.vorwaerts.schritte} Schritte, Ende: ${r.vorwaerts.ende}, ohne sichtbaren Fokus: ${r.vorwaerts.ohneSichtbarenFokus.length}, Umschalt+Tab: ${JSON.stringify(r.umschaltTab).slice(0, 180)}, zurück auf Radio: ${r.zurueckAufRadio}`);
  };

  for (let vi = 0; vi < VIEWS.length; vi++) {
    const v = VIEWS[vi];
    if (vi > 0) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(600); }
    const gewaehlt = await page.evaluate(() => document.querySelector('input[name="ko-auswerten"]:checked')?.value ?? null);
    const radio = await info(page);
    protokollier(v.wert, gewaehlt, radio, await laufeAb(page, radio));
    if (v.wert === 'fk') {
      // Zweiter Lauf mit gewählten Codes (Tabelle da). Vorbereitung per Maus, dann Fokus zurück auf die gewählte Radio-Taste.
      await alleCodesMaus(page);
      await page.locator('input[name="ko-auswerten"]:checked').focus();
      const radio2 = await info(page);
      protokollier('fk-mit-Codes', gewaehlt, radio2, await laufeAb(page, radio2));
    }
  }
  await ctx.close();
}

// 3. Erstnutzer-Probe nur mit Tastatur. Kein Klick, kein focus() außer dem Seitenanfang.
async function erstnutzer(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const protokoll = []; const hakte = [];
  const merke = (s, d = {}) => { protokoll.push({ s, ...d }); console.log(`  ${s} ${JSON.stringify(d).slice(0, 260)}`); };
  const haken = (t) => { hakte.push(t); merke('HÄNGER: ' + t); };
  const live = () => page.evaluate(() => [...document.querySelectorAll('[aria-live], [role=status], [role=alert]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-3));
  const aktiv = () => info(page);
  const ende = (ergebnisDaten) => { ergebnis.erstnutzer = { protokoll, hakte, geschafft: hakte.length === 0, ...ergebnisDaten }; };

  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
  merke('Seite offen', { fokus: (await aktiv())?.key ?? 'body' });

  // Schritt 1: Beispielprojekt laden
  let r = await tabBis(page, (x) => x.id === 'ko-laden', { max: 40 });
  merke('Tab bis „Beispielprojekt laden“', r);
  if (!r.ok) { haken('Beispielprojekt-Knopf per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  await page.keyboard.press('Enter');
  const geladen = await page.waitForSelector('#ko-text', { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  merke('Enter: Beispiel geladen', { geladen });
  if (!geladen) { haken('Beispiel wurde nicht geladen'); ende({}); await ctx.close(); return; }

  // Schritt 2: Radio „Ansicht“ im Bereich Auswerten, dann Pfeil ab zu „Fall-Kategorie-Matrix“
  r = await tabBis(page, (x) => x.abschnitt === ABSCHNITT && x.typ === 'radio' && x.name.startsWith('Was ist wo kodiert'), { max: 400 });
  merke('Tab bis Radio „Ansicht“ im Bereich Auswerten', r);
  if (!r.ok) { haken('Radio-Gruppe „Ansicht“ per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(700);
  const gewaehlt = await page.evaluate(() => document.querySelector('input[name="ko-auswerten"]:checked')?.value ?? null);
  merke('Pfeil ab: Ansicht gewählt', { gewaehlt, live: await live() });
  if (gewaehlt !== 'fk') haken(`Mit Pfeil ab kommt man nicht auf die Fall-Kategorie-Matrix (gewählt: ${gewaehlt})`);

  // Schritt 2b: Befund: ohne gewählten Code keine Tabelle. Hier per Tastatur „Alle Codes wählen“ (danach weiter).
  const sicht = await page.evaluate(() => document.querySelector('.r-auswerten')?.innerText.includes('Wählen Sie mindestens einen Code.') ?? false);
  merke('Matrix nach der Wahl', { hinweisOhneCode: sicht });
  if (sicht) {
    r = await tabBis(page, (x) => x.abschnitt === ABSCHNITT && x.tag === 'button' && x.name === 'Alle Codes wählen', { max: 80 });
    merke('Tab bis „Alle Codes wählen“', r);
    if (!r.ok) { haken('Ohne Code keine Tabelle, und „Alle Codes wählen“ per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    haken('Ohne gewählten Code erscheint keine Tabelle; erst nach „Alle Codes wählen“ sind Zellen da');
  }

  // Schritt 3: Zelle mit Belegen öffnen (Enter)
  r = await tabBis(page, (x) => x.abschnitt === ABSCHNITT && x.tag === 'button' && /^[1-9]\d* Belege?$/.test(x.name), { max: 200 });
  merke('Tab bis Zelle „… Belege“', r);
  if (!r.ok) { haken('Zelle mit Belegen per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(900);
  let f = await aktiv();
  merke('Enter auf Zelle', { fokus: f?.key, name: f?.name, live: await live() });

  // Schritt 4: Feld Zusammenfassung erreichen und schreiben
  r = await tabBis(page, (x) => x.id === 'ko-fk-zus', { max: 150 });
  merke('Tab bis Feld Zusammenfassung', r);
  if (!r.ok) { haken('Feld Zusammenfassung per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  await page.keyboard.type('Probe: Motivation zeigt sich hier als Erleben der Belastung.', { delay: 25 });
  await page.waitForTimeout(300);
  const wert = await page.locator('#ko-fk-zus').inputValue();
  merke('Zusammenfassung geschrieben', { laenge: wert.length });

  // Schritt 5: Speichern
  r = await tabBis(page, (x) => x.id === 'ko-fk-speichern', { max: 10 });
  merke('Tab bis „Speichern“', r);
  if (!r.ok) { haken('Knopf „Speichern“ per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  const gespeichert = (await live()).some((t) => /Zusammenfassung gespeichert/.test(t));
  merke('Enter: Speichern', { live: await live(), bestaetigt: gespeichert });
  if (!gespeichert) haken('Keine Bestätigung „Zusammenfassung gespeichert.“ hörbar (aria-live)');

  // Schritt 6: Matrix als Word
  r = await tabBis(page, (x) => x.id === 'ko-fk-word', { max: 150 });
  merke('Tab bis „Matrix als Word“', r);
  if (!r.ok) { haken('Knopf „Matrix als Word“ per Tab nicht erreicht: ' + r.grund); ende({}); await ctx.close(); return; }
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 25000 }).catch(() => null),
    page.keyboard.press('Enter'),
  ]);
  if (!dl) { haken('Kein Word-Download nach Enter auf „Matrix als Word“'); ende({}); await ctx.close(); return; }
  const ziel = path.join(OUT_DIR, 'matrix.docx');
  mkdirSync(OUT_DIR, { recursive: true });
  await dl.saveAs(ziel);
  merke('Word geladen', { datei: ziel, vorgeschlagen: dl.suggestedFilename(), live: await live() });
  ergebnis.matrixWord = { datei: ziel, vorgeschlagenerName: dl.suggestedFilename() };
  ende({});
  console.log(`[Erstnutzer] Hänger: ${hakte.length} ${hakte.length ? '| ' + hakte.join(' | ') : ''}`);
  await ctx.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const b = await chromium.launch({ headless: true });
try {
  await probiere('Axe-Zustände', () => axeZustaende(b));
  await probiere('Tastatur', () => tastatur(b));
  await probiere('Erstnutzer', () => erstnutzer(b));
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
