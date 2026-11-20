// Erstnutzer-Probe F4, NUR TASTATUR: Beispielinterview laden, Analyse beginnen, Ausschnitt, Grenzen, drei Einheiten, Zwischenfazit, Word.
// Erlaubt: page.keyboard.press/type, goto zur Startadresse, Lesen (evaluate ohne Änderung). Keine Klicks, kein fill/check/focus.
// Aufruf aus app/: node e2e/probe/erstnutzer-feinstruktur-f4.mjs
import { chromium } from '@playwright/test';

const START = 'http://127.0.0.1:4295/#interviews';
let tastendruecke = 0;
const tab = async (page, rueck = false) => { tastendruecke++; await page.keyboard.press(rueck ? 'Shift+Tab' : 'Tab'); };
const taste = async (page, t) => { tastendruecke++; await page.keyboard.press(t); };
const tippe = async (page, text) => { for (const z of text) await page.keyboard.type(z); tastendruecke += text.length; };
const log = (s) => console.log(s);

const detail = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { tag: 'BODY', name: '', typ: '', leer: false };
  const name = el.getAttribute('aria-label') || (el.innerText || el.value || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  return { tag: el.tagName, name, typ: el.getAttribute('type') || '', leer: !el.value };
});
const live = (page) => page.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map((e) => e.textContent.trim()).filter(Boolean).map((t) => t.slice(0, 120)).slice(0, 4));
const grenzen = (page) => page.evaluate(() => [...document.querySelectorAll('li[role="option"]')].map((l, i) => (/grenze/.test(l.className) ? i : -1)).filter((i) => i >= 0));

async function folge(page, n) {
  const out = [];
  for (let i = 1; i <= n; i++) { await tab(page); const f = await detail(page); out.push(`${i}. ${f.tag} ${f.name}`); }
  return out;
}
async function bis(page, praed, max, beschr) {
  const letzte = [];
  for (let i = 1; i <= max; i++) {
    await tab(page);
    const f = await detail(page);
    letzte.push(`${f.tag} ${f.name}`.slice(0, 110));
    if (praed(f)) { log(`  OK ${beschr} nach ${i} Tabs: ${f.tag} „${f.name}“`); return f; }
  }
  log(`  NICHT GEFUNDEN ${beschr} in ${max} Tabs. Letzte Stopps: ${letzte.slice(-8).join(' | ')}`);
  throw new Error('stop: ' + beschr);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 }, locale: 'de-DE' });
const page = await ctx.newPage();
await page.goto(START, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Feste Textfolge: je Einheit fünf Eingaben (Paraphrase, Intention, Lesart, Rolle, Anschluss)
const eingaben = [
  ['Sie beschreibt eine typische Woche', 'Sie will zeigen, wie schwer Planung fällt', 'Planung ist Alltagsarbeit', 'Erzählerin', 'Wochenplan'],
  ['Sie erklärt ihren Alltag', 'Sie will Druck zeigen', 'Druck entsteht durch Termine', 'Erzählerin', 'Termine'],
  ['Sie beschreibt Erholung', 'Sie will Abstand zeigen', 'Erholung als Gegenpol', 'Erzählerin', 'Erholung'],
];

try {
  log('== 1. Beispielinterview laden');
  await bis(page, (f) => f.tag === 'BUTTON' && /^Beispielinterview laden/.test(f.name), 60, 'Knopf Beispielinterview');
  await taste(page, 'Enter'); await page.waitForTimeout(800);

  log('== 2. Knopf Feinstrukturanalyse beginnen');
  await bis(page, (f) => f.tag === 'BUTTON' && /^Feinstrukturanalyse beginnen/.test(f.name), 250, 'Knopf Feinstrukturanalyse beginnen');
  await taste(page, 'Enter'); await page.waitForTimeout(800);
  log('  nach Enter: ' + JSON.stringify(await detail(page)));

  log('== 3. Ausschnitt: Endfeld auf Beitrag 12 (Pfeil runter), anlegen');
  await tab(page); await tab(page); await tab(page); await tab(page);
  for (let i = 0; i < 10; i++) await taste(page, 'ArrowDown');
  log('  Endfeld-Wert: ' + await page.evaluate(() => document.activeElement?.selectedOptions?.[0]?.text?.slice(0, 20)));
  await tab(page);
  await taste(page, 'Enter'); await page.waitForTimeout(800);
  log('  nach Anlegen: ' + JSON.stringify(await detail(page)));

  log('== 4. Einteilen: Forschungsfrage, Grenzen vor Wort 10 und 20, Einteilung fertig');
  await tab(page);
  await tippe(page, 'Wie planen Studierende ihre Woche?');
  await tab(page); await tab(page);
  for (let i = 0; i < 10; i++) await taste(page, 'ArrowRight');
  await taste(page, 'Enter'); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) await taste(page, 'ArrowRight');
  await taste(page, 'Enter'); await page.waitForTimeout(300);
  log('  Grenzen ' + JSON.stringify(await grenzen(page)) + ' Live ' + JSON.stringify(await live(page)));
  await tab(page); await tab(page);
  await taste(page, 'Enter'); await page.waitForTimeout(800);
  log('  nach Einteilung fertig: ' + JSON.stringify(await detail(page)) + ' Live ' + JSON.stringify(await live(page)));

  log('== 5. Deuten: drei Einheiten (Eingabe, Hinzufügen per Enter, weiter)');
  for (let u = 1; u <= 3; u++) {
    const queue = [...eingaben[u - 1]];
    let ungespeichert = 0; let fertig = false; let enters = 0; let eingetippt = 0; const stopps = [];
    for (let i = 1; i <= 150 && !fertig; i++) {
      await tab(page);
      const f = await detail(page);
      stopps.push(`${f.tag}:${f.name.slice(0, 30)}`);
      if (f.tag === 'BUTTON' && /^Einheit fertig, weiter/.test(f.name)) { await taste(page, 'Enter'); fertig = true; }
      else if (((f.tag === 'INPUT' && (f.typ === 'text' || f.typ === '')) || f.tag === 'TEXTAREA') && f.leer && queue.length) {
        await tippe(page, queue.shift()); ungespeichert++; eingetippt++;
      } else if (f.tag === 'BUTTON' && /hinzufügen/.test(f.name) && ungespeichert > 0) {
        await taste(page, 'Enter'); enters++; ungespeichert = 0; await page.waitForTimeout(150);
      }
    }
    log(`  Einheit ${u}: Stopps ${stopps.length}, eingetippt ${eingetippt}, Hinzufügen ${enters}, fertig ${fertig}`);
    log('  Stopps (einmalig): ' + [...new Set(stopps)].slice(0, 14).join(' | '));
    log('  nach Weiter: ' + JSON.stringify(await detail(page)) + ' Live ' + JSON.stringify(await live(page)));
    if (!fertig) break;
  }

  log('== 6. Zwischenfazit: Überschriften lesen, Feld per Tab finden, Satz tippen');
  log('  Überschriften: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('h2,h3,h4')].map((h) => h.textContent.trim().slice(0, 60)).filter((t) => /azit|Word|Übersicht/i.test(t)))));
  let zw = null;
  for (let i = 1; i <= 12; i++) {
    await tab(page);
    const f = await detail(page);
    if (f.tag === 'TEXTAREA' && f.leer && !zw) { zw = f; await tippe(page, 'Zwischenfazit: Planung ist Alltagsarbeit, Erholung wird mitgeplant.'); log(`  Textfeld getippt nach ${i} Tabs`); break; }
  }
  if (!zw) log('  KEIN leeres Textfeld gefunden');
  log('== 7. Word: Knopf „Word-Datei speichern“ per Tab suchen, Enter, Download abfangen');
  let wordKnopf = false;
  for (let i = 1; i <= 25; i++) {
    await tab(page);
    const f = await detail(page);
    if (f.tag === 'BUTTON' && /^Word-Datei speichern/.test(f.name)) { wordKnopf = true; log(`  Knopf nach ${i} Tabs`); break; }
  }
  if (wordKnopf) {
    try {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), taste(page, 'Enter')]);
      const fs = await import('node:fs');
      const pfad = dl.suggestedFilename();
      const p = await dl.path();
      log(`  Download: ${pfad}, ${fs.statSync(p).size} Byte`);
    } catch (e) { log('  kein Download: ' + e.message.slice(0, 120)); }
  }
  log('  Live nach Word: ' + JSON.stringify(await live(page)));
} catch (e) {
  log('ABBRUCH: ' + e.message);
} finally {
  log(`Tastendrücke gesamt: ${tastendruecke}`);
  await browser.close();
}
