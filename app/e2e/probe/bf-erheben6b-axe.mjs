// Barrierefreiheit Stufe 6b (Kodier-Arbeitsplatz, Seite #kodieren, Fachblatt 6b Abschnitt 5 und 3):
// 1. axe-core (WCAG 2.2 AA) in 13 Zuständen, 2. Tastatur-Durchlauf (Fallen, sichtbarer Fokus, Umschalt+Tab),
// 3. Erstnutzer-Probe nur mit Tastatur, 4. Belege als Word (Download, nach docs/erheben/bf-stufe6b/belege.docx).
// Aufruf aus app/:  node e2e/probe/bf-erheben6b-axe.mjs     (Vorschau auf 127.0.0.1:4277, PORT überschreibbar)
// Nur headless. Schreibt Rohdaten nach docs/erheben/bf-stufe6b/axe.json.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 4277}/#kodieren`;
const OUT_DIR = path.resolve(APP, '../docs/erheben/bf-stufe6b');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Bereiche, die für Fallen und Erstnutzer-Probe gezählt werden (IDs aus Fachblatt 3)
const BEREICHE = ['ko-text', 'ko-liste', 'ko-cl-suche', 'ko-baum', 'ko-baum-werkzeuge', 'ko-baum-detail', 'ko-bel-liste', 'ko-memo-formular', 'ko-faelle'];

const ergebnis = { zeitpunkt: new Date().toISOString(), url: URL_, browser: 'chromium headless', zustaende: [], tastatur: {}, erstnutzer: {}, belegeWord: {}, fehler: [] };

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

// Aktives Element: Tag, id, Rolle, Name, Fokusrahmen, Bereiche (aus BEREICHE)
const info = (page) => page.evaluate((bereiche) => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
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
  const bereich = bereiche.filter((id) => { const el = document.getElementById(id); return !!el && el.contains(e); });
  const x = { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', name, rahmen, fokusVisible: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, bereich };
  x.key = x.id || `${x.tag}|${x.rolle}|${x.name}`;
  return x;
}, BEREICHE);

// Tab-Durchlauf ab Seitenanfang (blur setzt den Ausgangspunkt, Startelement wird protokolliert)
async function tabWalk(page, max = 150) {
  await page.evaluate(() => document.activeElement?.blur());
  const seq = []; let ende = 'max';
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const x = await info(page);
    if (!x) { ende = 'body'; break; }
    if (seq.length && seq[seq.length - 1].key === x.key) { seq.push(x); ende = 'stecken'; break; }
    seq.push(x);
  }
  return { seq, ende };
}

async function shiftTabRueck(page, seq, ende) {
  if (ende !== 'body') return { geprueft: false, grund: `Vorwärtslauf endete mit „${ende}“` };
  const rev = seq.slice().reverse();
  const abweichungen = [];
  for (let i = 0; i < rev.length; i++) {
    await page.keyboard.press('Shift+Tab');
    const x = await info(page);
    if (!x || x.key !== rev[i].key) { abweichungen.push({ erwartet: rev[i].key, bekam: x ? x.key : 'body', bei: i }); break; }
  }
  return { geprueft: true, schritte: rev.length, abweichungen };
}

// Fallen je Bereich: betreten? verlassen? Falle = Lauf endet im Bereich
function bereichsPruefung(seq, ende) {
  const out = {};
  for (const id of BEREICHE) {
    const idx = seq.map((x, i) => (x.bereich.includes(id) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) { out[id] = { betreten: false }; continue; }
    const last = idx[idx.length - 1];
    const naechstes = seq[last + 1];
    out[id] = {
      betreten: true,
      schritte: idx.length,
      falle: ende !== 'body' && seq[seq.length - 1].bereich.includes(id),
      verlaesstNach: naechstes ? (naechstes.name || naechstes.key) : null,
    };
  }
  return out;
}

// Tab bis ein Element eine Bedingung erfüllt (rueck: Shift+Tab). Nur Tastatur.
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

async function probiere(name, fn) {
  try { await fn(); } catch (e) { ergebnis.fehler.push({ wo: name, fehler: String(e.message || e).slice(0, 300) }); console.log(`FEHLER in ${name}: ${String(e.message || e).slice(0, 200)}`); }
}

// 1. axe-Zustände (je Zustand frischer Kontext, damit nichts aus dem vorigen Zustand hängt)
async function axeZustaende(browser) {
  const fehler = [];
  const neu = async (vp = { width: 1280, height: 800 }) => {
    const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp });
    const page = await ctx.newPage(); page.on('pageerror', (e) => fehler.push(e.message));
    return { ctx, page };
  };
  const textFokus = async (page) => { await page.locator('#ko-text').focus(); };

  await probiere('Z1', async () => { const { ctx, page } = await neu(); await frischLaden(page, false); await zustandAxe(page, '1 frisch ohne Projekt'); await ctx.close(); });
  await probiere('Z2', async () => { const { ctx, page } = await neu(); await frischLaden(page); await zustandAxe(page, '2 Beispiel geladen'); await ctx.close(); });
  await probiere('Z3', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await textFokus(page); await page.keyboard.press('s'); await page.waitForTimeout(500);
    await zustandAxe(page, '3 Ansicht Text mit Markierung (s)', 'Fokus #ko-text, Taste s');
    await ctx.close();
  });
  await probiere('Z4', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-ansicht-saetze').check({ force: true }); await page.waitForTimeout(600);
    await page.locator('#ko-liste').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    await page.keyboard.press(' '); await page.waitForTimeout(400);
    await zustandAxe(page, '4 Ansicht Sätze mit Auswahl', 'Leertaste in #ko-liste');
    await ctx.close();
  });
  await probiere('Z5', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await textFokus(page); await page.keyboard.press('s'); await page.waitForTimeout(300);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    await page.keyboard.type('bel', { delay: 40 }); await page.waitForTimeout(500);
    await zustandAxe(page, '5 Code-Leiste mit Suchtext', 'Satz 2 markiert, Enter, „bel“');
    await ctx.close();
  });
  await probiere('Z6', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-baum [role=treeitem][tabindex="0"], #ko-baum [role=treeitem]').first().focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    const offen = await page.evaluate(() => !!document.querySelector('#ko-baum-detail-t, #ko-baum-name'));
    await zustandAxe(page, '6 Codebaum mit offenem Bearbeiten-Bereich', `Bereich offen: ${offen}`);
    await ctx.close();
  });
  await probiere('Z7', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-baum [role=treeitem][tabindex="0"], #ko-baum [role=treeitem]').first().focus();
    await page.keyboard.press('Delete'); await page.waitForTimeout(700);
    const da = await page.evaluate(() => !!document.getElementById('ko-baum-behalten'));
    await zustandAxe(page, '7 Rückfragezeile Löschen', `Rückfrage da: ${da}`);
    await ctx.close();
  });
  await probiere('Z8', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-bel-unter').check({ force: true }); await page.waitForTimeout(300);
    const filter = await page.locator('#ko-bel-filter select').count();
    if (filter) await page.locator('#ko-bel-filter select').first().selectOption({ index: 1 });
    await page.waitForTimeout(500);
    const n = await page.locator('#ko-bel-liste li').count();
    await zustandAxe(page, '8 Belege mit Filter und Untercodes', `Filter-Auswahlen: ${filter}, Belege: ${n}`);
    await ctx.close();
  });
  await probiere('Z9', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await textFokus(page); await page.keyboard.press('s'); await page.waitForTimeout(300);
    await page.keyboard.press('m'); await page.waitForTimeout(600);
    const da = await page.evaluate(() => !!document.getElementById('ko-memo-text'));
    await zustandAxe(page, '9 Memo-Formular', `Memo-Feld da: ${da}`);
    await ctx.close();
  });
  await probiere('Z10', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-var-name').fill('Semester');
    const typ = await page.locator('#ko-var-typ').selectOption({ label: 'Ganze Zahl' }).then(() => 'ok').catch((e) => 'fehlt: ' + e.message.slice(0, 80));
    await page.locator('#ko-var-neu').click(); await page.waitForTimeout(700);
    const zelle = page.locator('#ko-faelle input[aria-label^="Semester"]').first();
    const zellen = await zelle.count();
    if (zellen) { await zelle.fill('abc'); await page.keyboard.press('Tab'); await page.waitForTimeout(500); }
    const fehler2 = await page.evaluate(() => ({ alarm: document.querySelectorAll('[aria-invalid=true]').length, text: document.getElementById('ko-fall-fehler')?.textContent?.trim() || '' }));
    await zustandAxe(page, '10 Fälle-Tabelle mit falschem Wert', `Typ: ${typ}, Zellen: ${zellen}, Fehler: ${JSON.stringify(fehler2)}`);
    await ctx.close();
  });
  await probiere('Z11', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.locator('#ko-dok-neu').click(); await page.waitForTimeout(500);
    const offen = await page.evaluate(() => !!document.getElementById('ko-dok-neu')?.parentElement?.open);
    await zustandAxe(page, '11 Dokument hinzufügen aufgeklappt', `aufgeklappt: ${offen}`);
    await ctx.close();
  });
  await probiere('Z12', async () => {
    const { ctx, page } = await neu(); await frischLaden(page);
    await page.emulateMedia({ forcedColors: 'active' }); await page.waitForTimeout(700);
    await zustandAxe(page, '12 Kontrastmodus (forced-colors)');
    await ctx.close();
  });
  await probiere('Z13', async () => {
    const { ctx, page } = await neu({ width: 375, height: 812 }); await frischLaden(page);
    await page.waitForTimeout(500);
    await zustandAxe(page, '13 schmal 375 x 812');
    await ctx.close();
  });
  ergebnis.seitenfehler = fehler;
}

// 2. Tastatur-Durchlauf: Beispiel geladen, Textansicht und Sätze-Ansicht
async function tastatur(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await frischLaden(page);
  const a = await tabWalk(page);
  const aRueck = await shiftTabRueck(page, a.seq, a.ende);
  const ohneRahmen = a.seq.filter((x) => !x.rahmen && !x.fokusVisible).map((x) => x.key);
  ergebnis.tastatur.textansicht = {
    ende: a.ende, schritte: a.seq.length,
    reihenfolge: a.seq.map((x) => ({ key: x.key, tag: x.tag, rolle: x.rolle, name: x.name, rahmen: x.rahmen, fokusVisible: x.fokusVisible, umriss: x.umriss })),
    ohneSichtbarenFokus: ohneRahmen,
    bereiche: bereichsPruefung(a.seq, a.ende),
    shiftTab: aRueck,
  };
  console.log(`[Tab Textansicht] ${a.seq.length} Schritte, Ende: ${a.ende}, ohne sichtbaren Fokus: ${ohneRahmen.length}, Shift+Tab: ${JSON.stringify(aRueck).slice(0, 160)}`);
  for (const [k, v] of Object.entries(ergebnis.tastatur.textansicht.bereiche)) console.log(`    ${k}: ${JSON.stringify(v)}`);

  await page.locator('#ko-ansicht-saetze').check({ force: true }); await page.waitForTimeout(700);
  const b = await tabWalk(page);
  const bRueck = await shiftTabRueck(page, b.seq, b.ende);
  const ohneRahmenB = b.seq.filter((x) => !x.rahmen && !x.fokusVisible).map((x) => x.key);
  ergebnis.tastatur.saetzeansicht = {
    ende: b.ende, schritte: b.seq.length,
    reihenfolge: b.seq.map((x) => ({ key: x.key, tag: x.tag, rolle: x.rolle, name: x.name, rahmen: x.rahmen, fokusVisible: x.fokusVisible })),
    ohneSichtbarenFokus: ohneRahmenB,
    bereiche: bereichsPruefung(b.seq, b.ende),
    shiftTab: bRueck,
  };
  console.log(`[Tab Sätze] ${b.seq.length} Schritte, Ende: ${b.ende}, ohne sichtbaren Fokus: ${ohneRahmenB.length}, Shift+Tab: ${JSON.stringify(bRueck).slice(0, 160)}`);
  for (const [k, v] of Object.entries(ergebnis.tastatur.saetzeansicht.bereiche)) console.log(`    ${k}: ${JSON.stringify(v)}`);
  await ctx.close();
}

// 3. Erstnutzer-Probe nur mit Tastatur. Kein Klick, kein focus() außer Seitenanfang (Seite wird frisch geöffnet).
async function erstnutzer(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const protokoll = []; const hakte = [];
  const merke = (s, d = {}) => { protokoll.push({ s, ...d }); console.log(`  ${s} ${JSON.stringify(d).slice(0, 260)}`); };
  const haken = (t) => { hakte.push(t); merke('HÄNGER: ' + t); };
  const live = () => page.evaluate(() => [...document.querySelectorAll('[aria-live], [role=status], [role=alert]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-3));
  const stelle = () => page.evaluate(() => (document.getElementById('ko-stelle')?.textContent || '').replace(/\s+/g, ' ').trim());
  const caret = () => page.evaluate(() => {
    const el = document.getElementById('ko-text'); const s = getSelection();
    if (!el || !s || !s.rangeCount) return -1;
    const r = s.getRangeAt(0); const pre = document.createRange();
    pre.selectNodeContents(el); pre.setEnd(r.endContainer, r.endOffset); return pre.toString().length;
  });
  const ohneLeer = (t) => t.replace(/\s+/g, '');
  const aktiv = () => info(page);

  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
  merke('Seite offen (Fokus: Seitenanfang)', { fokus: (await aktiv())?.key ?? 'body' });

  // Schritt 1: Beispielprojekt laden
  let r = await tabBis(page, (x) => x.id === 'ko-laden', { max: 40 });
  merke('Tab bis „Beispielprojekt laden“', r);
  if (!r.ok) { haken('Beispielprojekt-Knopf per Tab nicht erreicht: ' + r.grund); ergebnis.erstnutzer = { protokoll, hakte, geschafft: false }; await ctx.close(); return; }
  await page.keyboard.press('Enter');
  const geladen = await page.waitForSelector('#ko-text', { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  merke('Enter: Beispiel geladen', { geladen, live: await live() });
  if (!geladen) { haken('Beispiel wurde nicht geladen'); ergebnis.erstnutzer = { protokoll, hakte, geschafft: false }; await ctx.close(); return; }

  // Schritt 2: Text ansteuern
  r = await tabBis(page, (x) => x.id === 'ko-text', { max: 60 });
  merke('Tab bis Textfeld', r);
  if (!r.ok) haken('Textfeld per Tab nicht erreicht: ' + r.grund);

  // Zielstelle nur als Kontrollwert (nicht Teil der Bedienung): Beginn von Satz 2
  const ziel = await page.evaluate(() => {
    const el = document.getElementById('ko-text'); const txt = el.textContent;
    const seg = [...new Intl.Segmenter('de', { granularity: 'sentence' }).segment(txt)].filter((s) => s.segment.trim().length > 0);
    return seg.length > 1 ? { start: seg[1].index, text: seg[1].segment.trim().slice(0, 60) } : null;
  });
  merke('Kontrollwert Satz-2-Anfang (nur zur Kontrolle)', { ziel });

  // Schreibmarke: Strg+Pos1, dann Pfeil rechts bis zum Satzanfang
  await page.keyboard.press('Control+Home');
  let pressen = 0; let c = await caret();
  while (ziel && c < ziel.start && pressen < 1500) { await page.keyboard.press('ArrowRight'); pressen++; c = await caret(); }
  merke('Pfeil rechts bis Satzanfang', { pressen, caret: c, stelle: await stelle() });
  if (ziel && c !== ziel.start) haken(`Schreibmarke bei ${c}, Satzanfang ist ${ziel.start}`);

  // Schritt 3: Satz markieren
  await page.keyboard.press('s'); await page.waitForTimeout(400);
  const st1 = await stelle();
  merke('Taste S', { stelle: st1, live: await live() });
  if (!/Satz 2/.test(st1)) haken(`Nach S steht „${st1}“ (erwartet Satz 2)`);

  // Schritt 4: Code geben (Enter öffnet die Code-Leiste)
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  let f = await aktiv();
  merke('Enter im Text', { fokus: f?.key, name: f?.name });
  if (f?.id !== 'ko-cl-suche') haken(`Enter bringt den Fokus nicht in die Code-Leiste (Fokus: ${f?.key})`);

  await page.keyboard.type('Motivation', { delay: 40 }); await page.waitForTimeout(400);
  const optionen = await page.evaluate(() => [...document.querySelectorAll('#ko-cl-liste [role=option]')].map((o) => o.textContent.replace(/\s+/g, ' ').trim()));
  f = await aktiv();
  merke('„Motivation“ getippt', { fokus: f?.key, name: f?.name, optionen: optionen.slice(0, 8), aktiv: await page.evaluate(() => document.getElementById('ko-cl-suche')?.getAttribute('aria-activedescendant')), live: await live() });
  if (!optionen.length) haken('Keine Option (auch keine Neuanlage) sichtbar nach dem Tippen');

  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
  const aktivNach = await page.evaluate(() => { const id = document.getElementById('ko-cl-suche')?.getAttribute('aria-activedescendant'); return id ? (document.getElementById(id)?.textContent || '').replace(/\s+/g, ' ').trim() : null; });
  merke('Pfeil ab in der Liste', { aktiv: aktivNach });

  await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  f = await aktiv();
  merke('Enter: Code geben', { fokus: f?.key, stelle: await stelle(), live: await live() });
  if (f?.id !== 'ko-text') haken(`Nach Enter steht der Fokus nicht im Text (Fokus: ${f?.key})`);
  const codeDa = await page.evaluate(() => [...document.querySelectorAll('#ko-baum [role=treeitem]')].some((e) => e.textContent.includes('Motivation')));
  merke('Code „Motivation“ im Codebaum', { da: codeDa });
  if (!codeDa) haken('Code „Motivation“ wurde nicht angelegt');

  // Schritt 5: Codebaum – Motivation unter einen Code mit Untercodes schieben
  r = await tabBis(page, (x) => x.bereich.includes('ko-baum'), { max: 120 });
  merke('Tab bis Codebaum', r);
  if (!r.ok) haken('Codebaum per Tab nicht erreicht: ' + r.grund);
  const baumListe = () => page.evaluate(() => [...document.querySelectorAll('#ko-baum [role=treeitem]')].map((e) => { const c = e.cloneNode(true); c.querySelectorAll('[role=group], ul').forEach((n) => n.remove()); return { name: c.textContent.replace(/\s+/g, ' ').trim(), level: +e.getAttribute('aria-level'), pos: +e.getAttribute('aria-posinset'), expanded: e.getAttribute('aria-expanded') }; }));
  let liste = await baumListe();
  merke('Codebaum (Ebene 1)', { eintraege: liste.filter((x) => x.level === 1).map((x) => `${x.pos}. ${x.name}${x.expanded !== null ? ' (mit Untercodes)' : ''}`) });
  const motiv = liste.find((x) => x.name.startsWith('Motivation'));
  const parent = liste.find((x) => x.name.startsWith('Erleben')) || liste.find((x) => x.level === 1 && x.expanded !== null && !x.name.startsWith('Motivation')) || liste.find((x) => x.level === 1 && !x.name.startsWith('Motivation'));
  merke('Ziel-Code gewählt', { parent: parent?.name ?? null, weilOhneErleben: !liste.some((x) => x.name.startsWith('Erleben')) });
  if (!motiv || !parent) haken('Motivation oder ein Elternteil im Codebaum nicht gefunden');

  if (motiv && parent) {
    // Im Baum zum Eintrag Motivation (Pfeil ab), dann Werkzeugleiste
    for (let i = 0; i < 80; i++) {
      const x = await aktiv();
      if (x && x.name.startsWith('Motivation')) break;
      await page.keyboard.press('ArrowDown');
    }
    f = await aktiv();
    merke('Im Baum auf Motivation', { fokus: f?.name, ebene: f?.key });
    if (!f || !f.name.startsWith('Motivation')) haken('Mit Pfeil ab nicht auf „Motivation“ gekommen');

    const knopf = async (name, max = 12) => {
      const inWerk = await page.evaluate(() => !!document.getElementById('ko-baum-werkzeuge')?.contains(document.activeElement));
      if (!inWerk) {
        const t = await tabBis(page, (x) => x.bereich.includes('ko-baum-werkzeuge'), { max: 60 });
        if (!t.ok) return { ok: false, grund: 'Werkzeugleiste per Tab nicht erreicht: ' + t.grund };
      }
      await page.keyboard.press('Home');
      for (let i = 0; i < max; i++) {
        const x = await aktiv();
        if (x && x.name.includes(name)) { await page.keyboard.press('Enter'); await page.waitForTimeout(500); return { ok: true, n: i, live: await live() }; }
        await page.keyboard.press('ArrowRight');
      }
      return { ok: false, grund: `„${name}“ in der Werkzeugleiste nicht gefunden` };
    };

    liste = await baumListe();
    const mi = liste.find((x) => x.name.startsWith('Motivation'));
    const pa = liste.find((x) => x.name === parent.name);
    const schritte = mi.pos > pa.pos + 1 ? { name: 'Nach oben', n: mi.pos - pa.pos - 1 } : mi.pos < pa.pos ? { name: 'Nach unten', n: pa.pos - mi.pos } : { name: null, n: 0 };
    merke('Schritte bis direkt unter dem Ziel', schritte);
    for (let i = 0; i < schritte.n; i++) {
      const k = await knopf(schritte.name);
      merke(`Werkzeug „${schritte.name}“ ${i + 1}`, k);
      if (!k.ok) { haken(k.grund); break; }
    }
    if (schritte.name || true) {
      const k = await knopf('Eine Ebene tiefer');
      merke('Werkzeug „Eine Ebene tiefer“', k);
      if (!k.ok) haken(k.grund);
    }
    liste = await baumListe();
    const mi2 = liste.find((x) => x.name.startsWith('Motivation'));
    const pa2 = liste.find((x) => x.name === parent.name);
    const unter = !!mi2 && !!pa2 && mi2.level === pa2.level + 1;
    merke('Kontrolle Baum nach dem Verschieben', { motivationEbene: mi2?.level, elternEbene: pa2?.level, unterElternteil: unter });
    if (!unter) haken('Motivation liegt nach dem Verschieben nicht unter dem gewählten Code');
  }

  // Schritt 6: Memo zur Stelle (zurück in den Text, dann M)
  r = await tabBis(page, (x) => x.id === 'ko-text', { max: 150, rueck: true });
  merke('Shift+Tab zurück zum Text', r);
  if (!r.ok) haken('Text per Umschalt+Tab nicht erreicht: ' + r.grund);
  if (r.ok) {
    await page.keyboard.press('m'); await page.waitForTimeout(500);
    f = await aktiv();
    merke('Taste M', { fokus: f?.key, name: f?.name, stelle: await stelle() });
    if (f?.id !== 'ko-memo-text') haken(`M bringt den Fokus nicht ins Memo-Feld (Fokus: ${f?.key})`);
    await page.keyboard.type('Motivation als Erleben der Belastung, Probe.', { delay: 30 });
    const t = await tabBis(page, (x) => x.id === 'ko-memo-neu', { max: 10 });
    merke('Tab bis „Memo speichern“', t);
    if (!t.ok) haken('Knopf „Memo speichern“ per Tab nicht erreicht');
    else { await page.keyboard.press('Enter'); await page.waitForTimeout(700); merke('Enter: Memo gespeichert', { live: await live(), fokus: (await aktiv())?.key }); }
  }

  // Schritt 7: Belege – Code Motivation wählen, Satz 2 suchen
  let b = await tabBis(page, (x) => x.id === 'ko-bel-code', { max: 150 });
  if (!b.ok) b = await tabBis(page, (x) => x.id === 'ko-bel-code', { max: 150, rueck: true });
  merke('Tab bis Belege-Auswahl', b);
  if (!b.ok) haken('Belege-Auswahl per Tab nicht erreicht: ' + b.grund);
  else {
    await page.keyboard.type('Motiv', { delay: 80 }); await page.waitForTimeout(500);
    const wert = await page.locator('#ko-bel-code').inputValue();
    const belege = await page.evaluate(() => [...document.querySelectorAll('#ko-bel-liste li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
    const gefunden = belege.some((t) => ohneLeer(t).includes(ohneLeer(ziel ? ziel.text.slice(0, 25) : '§§')));
    merke('Belege nach Tippen „Motiv“', { wert, anzahl: belege.length, ersteBelege: belege.slice(0, 3).map((t) => t.slice(0, 140)), satz2Gefunden: gefunden });
    if (!gefunden) haken('Satz 2 steht nicht in den Belegen für „Motivation“');
  }

  ergebnis.erstnutzer = { protokoll, hakte, geschafft: hakte.length === 0 };
  console.log(`[Erstnutzer] Hänger: ${hakte.length} ${hakte.length ? '| ' + hakte.join(' | ') : ''}`);
  await ctx.close();
}

// 4. Belege als Word: Download abfangen
async function belegeWord(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await frischLaden(page);
  const wert = await page.locator('#ko-bel-code option').filter({ hasText: 'Belastung' }).first().getAttribute('value');
  await page.locator('#ko-bel-code').selectOption(wert); await page.waitForTimeout(500);
  const n = await page.locator('#ko-bel-liste li').count();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.locator('#ko-bel-word').click()]);
  const ziel = path.join(OUT_DIR, 'belege.docx');
  await dl.saveAs(ziel);
  ergebnis.belegeWord = { datei: ziel, vorgeschlagenerName: dl.suggestedFilename(), belegeImFeld: n };
  console.log(`[Belege als Word] gespeichert: ${ziel} (Belege im Feld: ${n})`);
  await ctx.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const b = await chromium.launch({ headless: true });
try {
  await probiere('Axe-Zustände', () => axeZustaende(b));
  await probiere('Tastatur', () => tastatur(b));
  await probiere('Erstnutzer', () => erstnutzer(b));
  await probiere('Belege als Word', () => belegeWord(b));
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
