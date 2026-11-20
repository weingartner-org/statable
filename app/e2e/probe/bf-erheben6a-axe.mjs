// Barrierefreiheit Stufe 6a (Prototyp Kodier-Arbeitsplatz, Seite #kodieren):
// 1. axe-core (WCAG 2.2 AA) in neun Zuständen, 2. Tastatur-Durchlauf (Fallen, Fokus, Umschalt+Tab, Dialog), 3. Erstnutzer-Probe nur mit Tastatur.
// Aufruf aus app/:  node e2e/probe/bf-erheben6a-axe.mjs     (Vorschau auf 127.0.0.1:4271, PORT überschreibbar)
// Nur headless. Schreibt Rohdaten nach docs/erheben/bf-stufe6a/axe.json.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 4271}/#kodieren`;
const OUT_DIR = path.resolve(APP, '../docs/erheben/bf-stufe6a');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const ergebnis = { zeitpunkt: new Date().toISOString(), url: URL_, browser: 'chromium headless', zustaende: [], tastatur: {}, erstnutzer: {} };

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

// Aktives Element: Tag, id, Rolle, Name, Fokusrahmen
const info = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  const cs = getComputedStyle(e);
  const ids = (s) => s.split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join(' ');
  let name = e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') ? ids(e.getAttribute('aria-labelledby')) : '');
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = (e.textContent || e.value || '');
  name = name.replace(/\s+/g, ' ').trim().slice(0, 80);
  const rahmen = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (!!cs.boxShadow && cs.boxShadow !== 'none');
  const x = { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', name, rahmen, fokusVisible: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
  x.key = x.id || `${x.tag}|${x.rolle}|${x.name}`;
  return x;
});

// Tab-Durchlauf ab Seitenanfang
async function tabWalk(page, max = 120) {
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
  let abweichungen = [];
  for (let i = 0; i < rev.length; i++) {
    await page.keyboard.press('Shift+Tab');
    const x = await info(page);
    if (!x || x.key !== rev[i].key) { abweichungen.push({ erwartet: rev[i].key, bekam: x ? x.key : 'body', bei: i }); break; }
  }
  return { geprueft: true, schritte: rev.length, abweichungen };
}

function fallen(seq, id) {
  const idx = seq.findIndex((x) => x.id === id);
  if (idx < 0) return { gefunden: false };
  const naechstes = seq[idx + 1];
  return { gefunden: true, naechstesElement: naechstes ? naechstes.key : 'body', verlaesst: !!naechstes && naechstes.key !== id, fokusRahmen: seq[idx].rahmen || seq[idx].fokusVisible };
}

async function dialogTest(page) {
  await page.locator('#ko-b-liste').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  const offen = await page.waitForSelector('dialog[open]', { timeout: 4000 }).then(() => true).catch(() => false);
  if (!offen) return { offen: false };
  await page.waitForTimeout(800);
  const start = await info(page);
  const ausserhalb = []; const folge = [];
  let imDialog = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const im = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return !!d && d.contains(document.activeElement); });
    const x = await info(page);
    folge.push((x ? x.key : 'body') + (im ? '' : ' (außerhalb)'));
    if (im) imDialog++; else ausserhalb.push(x?.key ?? 'body');
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const zu = await page.evaluate(() => !document.querySelector('dialog[open]'));
  const nachEsc = await info(page);
  return { offen: true, startElement: start?.key, tabs: 25, imDialog, ausserhalb: ausserhalb.length, folge, esc_schliesst: zu, fokusNachEsc: nachEsc?.key ?? 'body' };
}

async function tastaturDurchlauf(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
  await page.locator('#ko-laden').click(); // Beispiel laden (erlaubt)
  await page.waitForSelector('#ko-a-text', { timeout: 20000 }); await page.waitForTimeout(1500);

  const a = await tabWalk(page);
  const aRueck = await shiftTabRueck(page, a.seq, a.ende);
  ergebnis.tastatur.artA = { ende: a.ende, schritte: a.seq.length, reihenfolge: a.seq.map((x) => ({ key: x.key, tag: x.tag, rolle: x.rolle, name: x.name, rahmen: x.rahmen, fokusVisible: x.fokusVisible })), textfeld: fallen(a.seq, 'ko-a-text'), liste: fallen(a.seq, 'ko-b-liste'), shiftTab: aRueck };
  console.log(`[Tab Art a] ${a.seq.length} Schritte, Ende: ${a.ende}; Textfeld verlässt: ${fallen(a.seq, 'ko-a-text').verlaesst}; Liste verlässt: ${fallen(a.seq, 'ko-b-liste').verlaesst}; Shift+Tab: ${JSON.stringify(aRueck).slice(0, 200)}`);

  await page.selectOption('#ko-a-art', 'b');
  await page.waitForSelector('textarea#ko-a-text'); await page.waitForTimeout(500);
  const b = await tabWalk(page);
  const bRueck = await shiftTabRueck(page, b.seq, b.ende);
  ergebnis.tastatur.artB = { ende: b.ende, schritte: b.seq.length, reihenfolge: b.seq.map((x) => ({ key: x.key, tag: x.tag, rolle: x.rolle, name: x.name, rahmen: x.rahmen, fokusVisible: x.fokusVisible })), textfeld: fallen(b.seq, 'ko-a-text'), liste: fallen(b.seq, 'ko-b-liste'), shiftTab: bRueck };
  console.log(`[Tab Art b] ${b.seq.length} Schritte, Ende: ${b.ende}; Textfeld verlässt: ${fallen(b.seq, 'ko-a-text').verlaesst}; Liste verlässt: ${fallen(b.seq, 'ko-b-liste').verlaesst}; Shift+Tab: ${JSON.stringify(bRueck).slice(0, 200)}`);

  await page.selectOption('#ko-a-art', 'a');
  await page.waitForSelector('#ko-a-text[contenteditable]'); await page.waitForTimeout(500);
  ergebnis.tastatur.dialog = await dialogTest(page);
  console.log(`[Dialog] ${JSON.stringify(ergebnis.tastatur.dialog)}`);
  await ctx.close();
}

async function erstnutzer(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const protokoll = []; const hakte = [];
  const merke = (s, d = {}) => protokoll.push({ s, ...d });
  const ohneLeer = (t) => t.replace(/s+/g, '');
  const tabBis = async (ziel, max = 60) => {
    await page.evaluate(() => document.activeElement?.blur());
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      const x = await info(page);
      if (x && x.id === ziel) return { ok: true, n: i + 1 };
      if (!x) return { ok: false, grund: 'Fokus fiel auf body' };
    }
    return { ok: false, grund: `nicht erreicht nach ${max} Tabs` };
  };
  const caret = () => page.evaluate(() => {
    const el = document.getElementById('ko-a-text'); const s = getSelection();
    if (!el || !s || !s.rangeCount) return -1;
    const r = s.getRangeAt(0); const pre = document.createRange();
    pre.selectNodeContents(el); pre.setEnd(r.endContainer, r.endOffset); return pre.toString().length;
  });
  const stelle = () => page.evaluate(() => (document.getElementById('ko-a-stelle')?.textContent || '').replace(/\s+/g, ' ').trim());
  const live = () => page.evaluate(() => [...document.querySelectorAll('[aria-live], [role=status], [role=alert]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-3));

  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1200);
  const t1 = await tabBis('ko-laden');
  merke('Tab bis Knopf Beispiel laden', t1); if (!t1.ok) hakte.push('Beispiel laden per Tab nicht erreicht: ' + t1.grund);
  if (t1.ok) { await page.keyboard.press('Enter'); }
  const geladen = await page.waitForSelector('#ko-a-text', { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  merke('Beispiel per Enter geladen', { geladen });
  if (!geladen) hakte.push('Beispiel wurde nicht geladen');

  const t2 = await tabBis('ko-a-text');
  merke('Tab bis Textfeld', t2); if (!t2.ok) hakte.push('Textfeld per Tab nicht erreicht: ' + t2.grund);

  // Ziel: Beginn von Satz 2 (nur Lesen der Schreibmarke, kein Eingriff)
  const ziel = await page.evaluate(() => {
    const el = document.getElementById('ko-a-text'); const txt = el.textContent;
    const seg = [...new Intl.Segmenter('de', { granularity: 'sentence' }).segment(txt)].filter((s) => s.segment.trim().length > 0);
    return seg.length > 1 ? { start: seg[1].index, text: seg[1].segment.trim().slice(0, 60) } : null;
  });
  merke('Ziel (nur zur Kontrolle, nicht Teil der Bedienung)', { ziel });
  await page.keyboard.press('Control+Home');
  let pressen = 0; let c = await caret();
  while (ziel && c < ziel.start && pressen < 1500) { await page.keyboard.press('ArrowRight'); pressen++; c = await caret(); }
  merke('Pfeil rechts bis Satzanfang', { pressen, caret: c, stelle: await stelle() });
  if (ziel && c !== ziel.start) hakte.push(`Schreibmarke landete bei ${c}, Satzanfang ist ${ziel.start}`);

  await page.keyboard.press('s');
  await page.waitForTimeout(400);
  const st1 = await stelle();
  merke('Taste S', { stelle: st1, live: await live() });
  if (!/Satz 2/.test(st1)) hakte.push(`Nach S steht „${st1}“ (erwartet Satz 2)`);

  await page.keyboard.press('Enter');
  const dlg = await page.waitForSelector('dialog[open]', { timeout: 4000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(800);
  const fokus1 = await info(page);
  merke('Enter öffnet Code-Fenster', { offen: dlg, fokus: fokus1?.key });
  if (!dlg) hakte.push('Enter im Textfeld öffnet kein Code-Fenster');

  if (dlg) {
    await page.keyboard.type('Belastung', { delay: 30 });
    await page.waitForTimeout(400);
    const f2 = await info(page);
    merke('Suche „Belastung“ eingetippt', { fokus: f2?.key, legende: await page.evaluate(() => document.querySelector('#ko-dlg-liste')?.closest('fieldset')?.querySelector('legend')?.textContent?.trim() ?? null) });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    const f3 = await info(page);
    merke('Pfeil ab in der Suche', { fokus: f3?.key, name: f3?.name });
    if (f3?.tag !== 'input' || f3?.rolle === 'radio' || true) {
      if (!(f3 && f3.tag === 'input' && f3.id === 'ko-dlg-suche')) { /* fokus ist beim Radioknopf */ }
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const nurEnter = await page.evaluate(() => !!document.querySelector('dialog[open]'));
    const hinweisNurEnter = await page.evaluate(() => [...document.querySelectorAll('[aria-live], [role=status], [role=alert]')].map((e) => e.textContent.replace(/s+/g, ' ').trim()).filter(Boolean).slice(-2));
    merke('Enter auf dem ungewählten Radioknopf', { dialogNochOffen: nurEnter, hinweis: hinweisNurEnter });
    if (nurEnter) { await page.keyboard.press('Space'); await page.waitForTimeout(300); merke('Leertaste auf dem Radioknopf', { gewaehlt: await page.evaluate(() => [...document.querySelectorAll('#ko-dlg-liste input[type=radio]')].filter((r) => r.checked).map((r) => r.closest('label')?.textContent?.trim() || r.value)) }); await page.keyboard.press('Enter'); }
    await page.waitForTimeout(1000);
    const offenNach = await page.evaluate(() => !!document.querySelector('dialog[open]'));
    const gewaehlt = await page.evaluate(() => [...document.querySelectorAll('#ko-dlg-liste input[type=radio]')].filter((r) => r.checked).map((r) => r.closest('label')?.textContent?.trim() || r.value));
    merke('Enter auf dem Code', { dialogNochOffen: offenNach, gewaehlt, live: await live() });
    if (offenNach) hakte.push('Code-Fenster schloss sich nach Enter nicht (Auswahl per Tastatur gelang nicht)');
  }

  const fokus2 = await info(page);
  merke('Fokus nach dem Code-Fenster', { fokus: fokus2?.key });
  const belegeCode = await page.evaluate(() => document.getElementById('ko-c-code')?.value ?? null);
  const t3 = await tabBis('ko-c-code', 60);
  merke('Tab bis Belege-Auswahl', t3);
  if (!t3.ok) hakte.push('Belege-Auswahl per Tab nicht erreicht: ' + t3.grund);
  const belege = await page.evaluate(() => [...document.querySelectorAll('#ko-c-liste li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
  const optionen = await page.evaluate(() => [...document.querySelectorAll('#ko-c-code option')].map((o) => o.textContent.trim()));
  merke('Belege (Text, nur Lesen)', { belegeCode, optionen, belege });
  if (!belege.some((t) => ziel && ohneLeer(t).includes(ohneLeer(ziel.text.slice(0, 25))))) {
    await page.locator('#ko-c-code').focus();
    await page.keyboard.type('Belastung: niedrig', { delay: 40 });
    await page.waitForTimeout(400);
    const belege2 = await page.evaluate(() => [...document.querySelectorAll('#ko-c-liste li')].map((l) => l.textContent.replace(/s+/g, ' ').trim()));
    merke('Im Belege-Feld per Tastatur auf Belastung: niedrig', { wert: await page.locator('#ko-c-code').inputValue(), eintraege: belege2.length, belege: belege2.filter((t) => ziel && t.includes(ziel.text.slice(0, 25))) });
    belege.splice(0, belege.length, ...belege2);
  }
  const gefunden = await page.evaluate((t) => [...document.querySelectorAll('#ko-c-liste li')].some((l) => l.textContent.includes(t)), ziel ? ziel.text.slice(0, 20) : '');
  const roh = belege.find((t) => t.includes('Ich nehme') || t.includes('Ge' + 'spr')) ?? belege.find((t) => /Gespr|Gesp/.test(t)) ?? '';
  merke('Zeichencodes Belegtext (Kontrolle)', { roh: roh.slice(0, 70), codes: [...roh.slice(0, 70)].map((c) => c.charCodeAt(0)).join(',') });
  await page.keyboard.press('Tab');
  const roh2 = await page.evaluate(() => [...document.querySelectorAll('#ko-c-liste li')].map((l) => l.textContent).filter((t) => /Interview 1/.test(t)).slice(0, 1).map((t) => { const k = t.indexOf('Gespr') - 4; const hex = (x) => [...x].map((c) => c.codePointAt(0).toString(16)).join(' '); return { ausschnitt: hex(t.slice(Math.max(0, k), Math.max(0, k) + 30)), zeichen: [...t.slice(Math.max(0,k), Math.max(0,k)+30)].join('|'), gesamtlaenge: t.length }; }));
  merke('Rohtext Belegeintrag Interview 1 (Kontrolle)', { roh2 });
  const f4 = await info(page);
  merke('Ein Tab nach der Auswahl', { fokus: f4?.key, name: f4?.name });
  if (!gefunden) hakte.push('Der Satz 2 steht nicht (oder nicht mit dem gesuchten Text) in den Belegen');
  await ctx.close();
  ergebnis.erstnutzer = { protokoll, hakte, geschafft: hakte.length === 0 };
  console.log(`[Erstnutzer] geschafft: ${hakte.length === 0 ? 'ja' : 'nein'}; Hänger: ${hakte.join(' | ') || 'keine'}`);
}

let gegebenerName = '';
const b = await chromium.launch({ headless: true });
try {
  // 1. axe-Zustände
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const fehler = []; page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(URL_); await page.waitForSelector('#ko-t'); await page.waitForTimeout(1500);
  await zustandAxe(page, '1 frisch ohne Projekt');

  await page.locator('#ko-laden').click();
  await page.waitForSelector('#ko-a-text', { timeout: 20000 }); await page.waitForTimeout(1500);
  const n0 = await page.locator('#ko-c-code option').filter({ hasText: 'Belastung: niedrig' }).first().textContent();
  console.log('Vor den Kodierungen (Beispiel):', n0);
  await zustandAxe(page, '2 Beispiel geladen (Art a)');

  await page.selectOption('#ko-a-art', 'b');
  await page.waitForSelector('textarea#ko-a-text'); await page.waitForTimeout(500);
  await zustandAxe(page, '3 Art b');

  await page.selectOption('#ko-a-art', 'c');
  await page.waitForSelector('#ko-a-text.ko-c'); await page.waitForTimeout(500);
  await zustandAxe(page, '4 Art c');

  await page.selectOption('#ko-a-art', 'a');
  await page.waitForSelector('#ko-a-text[contenteditable]'); await page.waitForTimeout(500);
  await page.locator('#ko-b-liste').focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  await zustandAxe(page, '5 Art a, Liste mit Auswahl');

  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]', { timeout: 5000 }); await page.waitForTimeout(800);
  await zustandAxe(page, '6 Code-Fenster offen');

  gegebenerName = await page.locator('#ko-dlg-liste input[type=radio]').first().evaluate((r) => r.closest('label')?.textContent?.trim() || r.value);
  await page.locator('#ko-dlg-liste input[type=radio]').first().click();
  await page.locator('#ko-dlg-ok').click();
  await page.waitForTimeout(800);
  // zweite Stelle: Auswahl leeren, fünf Sätze tiefer wählen, Code geben
  await page.locator('#ko-b-liste').focus();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' '); await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]', { timeout: 5000 }); await page.waitForTimeout(800);
  gegebenerName = await page.locator('#ko-dlg-liste input[type=radio]').first().evaluate((r) => r.closest('label')?.textContent?.trim() || r.value);
  await page.locator('#ko-dlg-liste input[type=radio]').first().click();
  await page.locator('#ko-dlg-ok').click();
  await page.waitForTimeout(800);
    const codeWert = await page.locator('#ko-c-code option').filter({ hasText: gegebenerName }).first().getAttribute('value');
  await page.locator('#ko-c-code').selectOption(codeWert);
  await page.waitForTimeout(500);
  const anzahlBelege = await page.locator('#ko-c-liste li').count();
  console.log('Auswahl im Belege-Feld:', await page.locator('#ko-c-code').inputValue(), 'Text:', await page.locator('#ko-c-code option:checked').textContent(), 'Einträge:', anzahlBelege);
  console.log(`Belege nach zwei Kodierungen: ${anzahlBelege}`);
  await zustandAxe(page, '7 Code gewählt, Belege mit zwei Einträgen', `Belege: ${anzahlBelege} Einträge`);

  await page.emulateMedia({ forcedColors: 'active' }); await page.waitForTimeout(600);
  await zustandAxe(page, '8 Kontrastmodus (forced-colors)');
  await page.emulateMedia({ forcedColors: 'none' });

  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(800);
  await zustandAxe(page, '9 schmal 375 x 812');
  if (fehler.length) console.log('Seitenfehler:', fehler.join(' | '));
  ergebnis.seitenfehler = fehler;
  await ctx.close();

  // 2. Tastatur
  await tastaturDurchlauf(b);
  // 3. Erstnutzer
  await erstnutzer(b);
} finally {
  await b.close();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
