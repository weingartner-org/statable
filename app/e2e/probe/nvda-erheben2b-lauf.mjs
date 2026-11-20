// NVDA-Messung Stufe 2, Fragetypen-Bibliothek (Paket 2B), Prüfplan A1-A14. Aufruf: NVDA_PORT=4310 node e2e/probe/nvda-erheben2b-lauf.mjs <phase>
// Phasen: p1 (Seite 1: A1 A2 A10 A3 A4 A12 A5 A11) | p2 (Seite 2: A8, Pflichtzahl, A11) | p3 (Seite 3: A9, A10, A11) | p4 (Seite 4: A6) | p4eng (A7) | en (A3, A9 englisch) | p14 (A14 Lesemodus Seite 1)
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, nvda } from './nvda-erheben1-lib.mjs';

const URL = 'http://127.0.0.1:4310/src/ausfuellen/vorschau.html';
const phase = process.argv[2] ?? 'p1';

const OBS = `
window.__ansagen = window.__ansagen || [];
setInterval(() => { for (const e of document.querySelectorAll('[role=status],[aria-live],[role=alert]')) { if (!e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ text: e.textContent, rolle: e.getAttribute('role'), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }, 150);
`;

async function laden(page, { en = false, eng = false } = {}) {
  await S.ctx.addInitScript(OBS);
  await page.goto(URL, { waitUntil: 'load' }); await sleep(2500);
  if (en) { await page.locator('[data-sprache=en]').click(); await sleep(500); }
  if (eng) { await page.locator('#eng').check(); await sleep(500); }
  await page.evaluate(() => { window.__ansagen = []; });
  await page.bringToFront(); await nachVorn();
}
async function zumSeite(page, n) { // Aufbau: bis Seite n durchklicken
  const weiter = () => page.getByRole('button', { name: /^(Weiter|Next)$/ }).click();
  if (n >= 2) { await page.locator('#bibliothek input[type=radio]').first().check(); await weiter(); await sleep(400); }
  if (n >= 3) { await page.locator('input[type=number]').first().fill('30'); await weiter(); await sleep(400); }
  if (n >= 4) { await page.locator('#bibliothek fieldset button:not([aria-label])').first().click(); await sleep(300); await page.locator('#bibliothek input[type=checkbox]').first().check(); await weiter(); await sleep(500); }
  aufbau(`Seite ${n} per Playwright erreicht (Klicks, nicht gemessen)`);
  await page.bringToFront(); await nachVorn();
}
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6), tag);

const PH = {};

PH.p1 = async (page) => {
  await laden(page);
  rec({ schritt: 'A1 Seite geladen', gesagt: await spoken(), z: await zustand() });
  await C('A1 Titel (NVDA+T)', 'reportTitle').catch((e) => note('A1', 'reportTitle nicht verfügbar: ' + e));
  await K('A2 H', 'KeyH'); await K('A2 H', 'KeyH'); await K('A2 H', 'KeyH'); await K('A2 Umschalt+H', 'Shift+KeyH');
  note('A2-dom', await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ' ' + h.textContent.trim()).join(' | ')));
  note('Fortschritt-dom', await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Seite \d+ von \d+|Page \d+ of \d+/.test(e.textContent)).map((e) => e.tagName + '.' + e.className + ': ' + e.textContent.trim()).join(' | ') || '(kein Fortschrittstext auf Seite 1)'));
  // A10: Pflicht leer, Weiter
  await bis('A10 Tab bis Weiter', /Weiter/, { max: 25 });
  await K('A10 Enter auf Weiter (Pflicht F1 leer)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert]')?.innerText, fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60), fieldsetInvalid: [...document.querySelectorAll('[aria-invalid=true]')].map((e) => e.tagName + ':' + (e.getAttribute('aria-describedby') ?? '')) }), 'A10-dom');
  await K('A10 Tab: erster Link der Zusammenfassung', 'Tab');
  await K('A10 Enter auf Sprunglink', 'Enter', { wait: 1500 });
  await dom(page, () => ({ fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '').slice(0, 50) + ' invalid=' + document.activeElement?.closest('fieldset')?.getAttribute('aria-invalid') + ' ' + document.activeElement?.getAttribute('aria-invalid'), fehlertext: [...document.querySelectorAll('[id$=-fehler]')].map((e) => e.id + '=' + e.textContent).join(' | ') }), 'A10-nach-Sprung-dom');
  await C('A10 NVDA+Tab', 'reportCurrentFocus');
  // A3/A4 Einfachauswahl
  await K('A3 Tab/Pfeil: Rot (erste Option)', 'ArrowDown');
  await K('A4 Pfeil oben', 'ArrowUp');
  await K('A4 Pfeil unten', 'ArrowDown');
  await K('A4 Pfeil unten', 'ArrowDown');
  await K('A4 Pfeil unten (Anders)', 'ArrowDown');
  await K('A4 Pfeil oben', 'ArrowUp'); await K('A4 Pfeil oben', 'ArrowUp'); await K('A4 Pfeil oben auf Rot', 'ArrowUp', { wait: 1500 });
  await ans(page, 'A12 DOM-Ansagen nach Wahl Rot');
  await dom(page, () => ({ fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.closest('label')?.textContent ?? '').trim(), f1b: !!document.body.innerText.match(/Wie stark gefällt/) }), 'A12-dom');
  // A5 Mehrfachauswahl
  await bis('A5 Tab bis Mehrfachauswahl', /checkbox.*label:(Radio|Zeitung|Internet)/, { max: 8 });
  await K('A5 Leertaste: erstes Kästchen', 'Space');
  await K('A5 Tab', 'Tab'); await K('A5 Tab', 'Tab');
  await K('A5 Tab auf Nichts davon', 'Tab');
  await K('A5 Leertaste: Nichts davon', 'Space', { wait: 1500 });
  await ans(page, 'A5 DOM-Ansagen');
  await dom(page, () => [...document.querySelectorAll('fieldset')].pop().querySelectorAll('input') && [...[...document.querySelectorAll('fieldset')].pop().querySelectorAll('input')].map((i) => (i.closest('label')?.textContent ?? '').trim() + '=' + i.checked).join('; '), 'A5-dom Zustand');
  await K('A5 Umschalt+Tab (Kästchen, jetzt abgewählt?)', 'Shift+Tab');
  await K('A5 Leertaste (anderes Kästchen wählt Nichts davon ab?)', 'Space', { wait: 1500 });
  await ans(page, 'A5b DOM-Ansagen');
  // A11 Seitenwechsel
  await bis('A11 Tab bis Weiter', /Weiter/, { max: 10 });
  await K('A11 Enter auf Weiter', 'Enter', { wait: 2000 });
  await dom(page, () => ({ fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60), h2: document.querySelector('h2')?.textContent, fortschritt: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Seite \d+ von \d+|Page \d+ of \d+/.test(e.textContent)).map((e) => e.textContent.trim()).join(' | ') }), 'A11-dom');
  await ans(page, 'A11 DOM-Ansagen');
  await C('A11 NVDA+Tab', 'reportCurrentFocus');
};

PH.p2 = async (page) => {
  await laden(page); await zumSeite(page, 2);
  await K('A8 H', 'KeyH');
  await bis('A8 Tab bis Regler', /range/, { max: 12 });
  await C('A8 NVDA+Tab', 'reportCurrentFocus');
  await K('A8 Pfeil rechts', 'ArrowRight'); await K('A8 Pfeil rechts', 'ArrowRight'); await K('A8 Pfeil links', 'ArrowLeft'); await K('A8 Pos1', 'Home'); await K('A8 Ende', 'End');
  await K('A8 Tab: Zahlenfeld', 'Tab');
  await T('A8 Zahl tippen: 4', '4', { wait: 1000 });
  await dom(page, () => [...document.querySelectorAll('input[type=range]')].map((r) => r.value + '/' + r.max + ' ' + (r.getAttribute('aria-valuetext') ?? '')), 'A8-dom Reglerwerte');
  await K('A8 Umschalt+Tab: Regler', 'Shift+Tab');
  await C('A8 NVDA+Tab', 'reportCurrentFocus');
  await bis('A8 Tab bis zweiter Regler (Stufen)', /range/, { max: 4 });
  await C('A8 NVDA+Tab (Regler mit Stufen)', 'reportCurrentFocus');
  await K('A8 Pfeil rechts', 'ArrowRight');
  // Pflichtzahl leer
  await bis('A10 Tab bis Weiter', /Weiter/, { max: 10 });
  await K('A10 Enter auf Weiter (Pflichtzahl leer)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert]')?.innerText, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60) }), 'A10-dom');
  await K('A10 Tab: Sprunglink', 'Tab');
  await K('A10 Enter', 'Enter', { wait: 1500 });
  await C('A10 NVDA+Tab (Feld mit aria-invalid)', 'reportCurrentFocus');
  await dom(page, () => ({ invalid: document.activeElement?.getAttribute('aria-invalid'), desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | ') }), 'A10-dom Feld');
  await T('A10 Zahl 30 tippen', '30', { wait: 1000 });
  await K('A10 Tab (Fehlertext weg?)', 'Tab', { wait: 1200 });
  await ans(page, 'A10 DOM-Ansagen');
};

PH.p2b = async (page) => {
  await laden(page); await zumSeite(page, 2);
  const rw = () => page.evaluate(() => [...document.querySelectorAll('input[type=range]')].map((r) => r.value + '/' + r.max + ' valuetext=' + (r.getAttribute('aria-valuetext') ?? '')));
  note('Regler vorher', JSON.stringify(await rw()));
  await page.locator('input[type=range]').first().focus();
  aufbau('Fokus per Skript auf ersten Regler (Aufbau)');
  await K('A8 Pfeil rechts (am Maximum, unbeantwortet)', 'ArrowRight'); note('Regler nach Pfeil rechts', JSON.stringify(await rw()));
  await K('A8 Pfeil links', 'ArrowLeft'); await K('A8 Pfeil rechts (zurück auf 7)', 'ArrowRight'); note('Regler', JSON.stringify(await rw()));
  await K('A8 Ende', 'End'); note('Regler nach Ende', JSON.stringify(await rw()));
  await K('A8 Pos1', 'Home'); note('Regler nach Pos1', JSON.stringify(await rw()));
  await K('A8 Bild auf', 'PageUp'); note('Regler nach Bild auf', JSON.stringify(await rw()));
  await K('A8 Tab: Zahlenfeld', 'Tab'); await C('A8 NVDA+Tab Zahlenfeld', 'reportCurrentFocus');
  // Pflichtzahl leer
  await page.locator('button', { hasText: /^Weiter$/ }).focus();
  aufbau('Fokus per Skript auf Weiter (Aufbau)');
  await K('A10 Enter auf Weiter (Pflichtzahl leer)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert]')?.innerText, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60) }), 'A10-dom');
  await K('A10 Tab: Sprunglink', 'Tab');
  await K('A10 Enter', 'Enter', { wait: 1500 });
  await C('A10 NVDA+Tab (Feld mit aria-invalid)', 'reportCurrentFocus');
  await dom(page, () => ({ invalid: document.activeElement?.getAttribute('aria-invalid'), desc: (document.activeElement?.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent).join(' | ') }), 'A10-dom Feld');
  await T('A10 Zahl 30 tippen', '30', { wait: 1000 });
  await K('A10 Tab (Fehlertext weg?)', 'Tab', { wait: 1200 });
  await dom(page, () => ({ invalid: document.querySelector('#af2-3')?.getAttribute('aria-invalid'), fehler: [...document.querySelectorAll('[id$=-fehler]')].map((e) => e.textContent) }), 'A10 nach Eingabe');
  await ans(page, 'A10 DOM-Ansagen');
  await K('Tab', 'Tab');
};

PH.p3 = async (page) => {
  await laden(page); await zumSeite(page, 3);
  await K('A9 H', 'KeyH');
  await bis('A9 Tab bis Auf-/Ab-Knopf', /nach oben|nach unten/, { max: 10 });
  await C('A9 NVDA+Tab', 'reportCurrentFocus');
  await K('A9 Tab', 'Tab');
  await K('A9 Enter: nach unten', 'Enter', { wait: 1800 });
  await ans(page, 'A9 DOM-Ansagen');
  await dom(page, () => ({ fokus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent, reihenfolge: [...document.querySelectorAll('ol li')].map((l) => l.firstChild?.textContent ?? l.textContent.slice(0, 15)).join(', ') }), 'A9-dom');
  await K('A9 Enter: nochmal nach unten (Fokus bleibt?)', 'Enter', { wait: 1800 });
  await ans(page, 'A9 DOM-Ansagen 2');
  await K('A9 Umschalt+Tab', 'Shift+Tab'); await K('A9 Umschalt+Tab', 'Shift+Tab');
  await K('A9 Enter: nach oben', 'Enter', { wait: 1800 });
  await ans(page, 'A9 DOM-Ansagen 3');
  await bis('A9 Tab bis Diese Reihenfolge übernehmen', /übernehmen/, { max: 12 });
  await K('A9 Enter: übernehmen', 'Enter', { wait: 1800 });
  await ans(page, 'A9 DOM-Ansagen 4');
  // Pflicht: Einwilligung leer, Weiter
  await bis('A10 Tab bis Weiter', /Weiter/, { max: 6 });
  await K('A10 Enter (Einwilligung fehlt)', 'Enter', { wait: 1800 });
  await dom(page, () => ({ alert: document.querySelector('[role=alert]')?.innerText, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').slice(0, 60) }), 'A10-dom');
  await K('A10 Tab', 'Tab'); await K('A10 Enter Sprunglink', 'Enter', { wait: 1200 });
  await C('A10 NVDA+Tab', 'reportCurrentFocus');
  await K('Space: Einwilligung', 'Space');
};

PH.p4 = async (page) => {
  await laden(page); await zumSeite(page, 4);
  note('A6-dom', await page.evaluate(() => [...document.querySelectorAll('table, table caption, table th, fieldset legend')].slice(0, 14).map((e) => e.tagName + ' ' + e.textContent.trim().slice(0, 50)).join(' | ')));
  await K('A6 H', 'KeyH');
  await K('A6 T: Tabelle', 'KeyT', { wait: 1400 });
  await K('A6 Pfeil unten (in die Tabelle)', 'ArrowDown');
  await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('A6 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('A6 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('A6 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await bis('A6 Tab bis Auswahlschalter', /radio/, { max: 8 });
  await C('A6 NVDA+Tab', 'reportCurrentFocus');
  await K('A6 Pfeil rechts', 'ArrowRight'); await K('A6 Pfeil rechts', 'ArrowRight');
  await K('A6 Tab (nächste Zeile)', 'Tab');
  await C('A6 NVDA+Tab', 'reportCurrentFocus');
  await K('A6 Leertaste', 'Space');
  await K('A6 Pfeil unten', 'ArrowDown');
};

PH.p4b = async (page) => {
  await laden(page); await zumSeite(page, 4);
  await K('A6 T: Tabelle', 'KeyT', { wait: 1400 });
  for (let i = 1; i <= 4; i++) await K(`A6 Pfeil unten ${i}`, 'ArrowDown');
  await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('A6 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('A6 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
  await K('A6 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown');
  await K('A6 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('A6 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('A6 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
  await K('A6 Strg+Alt+Pfeil oben', 'Control+Alt+ArrowUp');
};

PH.p4eng = async (page) => {
  await laden(page, { eng: true }); await zumSeite(page, 4);
  note('A7-dom', await page.evaluate(() => [...document.querySelectorAll('table, fieldset legend')].map((e) => e.tagName + ' ' + e.textContent.trim().slice(0, 50)).join(' | ')));
  await K('A7 H', 'KeyH');
  await bis('A7 Tab bis erste Gruppe', /radio/, { max: 8 });
  await C('A7 NVDA+Tab', 'reportCurrentFocus');
  await K('A7 Pfeil unten', 'ArrowDown');
  await K('A7 Tab', 'Tab'); await K('A7 Tab', 'Tab');
  await K('A7 Tab', 'Tab');
  await K('A7 T: gibt es eine Tabelle?', 'KeyT', { wait: 1200 });
};

PH.en = async (page) => {
  await laden(page, { en: true });
  await K('EN H', 'KeyH');
  await bis('EN A3 Tab bis Einfachauswahl', /radio/, { max: 12 });
  await C('EN A3 NVDA+Tab', 'reportCurrentFocus');
  await K('EN A4 Pfeil unten', 'ArrowDown'); await K('EN A4 Pfeil unten', 'ArrowDown');
  await K('EN A4 Pfeil oben', 'ArrowUp'); await K('EN A4 Pfeil oben', 'ArrowUp');
  await bis('EN A5 Tab bis Mehrfachauswahl', /checkbox.*label:/, { max: 8 });
  await K('EN A5 Leertaste', 'Space');
  await K('EN A5 Tab', 'Tab'); await K('EN A5 Tab', 'Tab'); await K('EN A5 Tab (None of these)', 'Tab');
  await K('EN A5 Leertaste', 'Space', { wait: 1500 });
  await ans(page, 'EN A5 DOM-Ansagen');
  await zumSeite(page, 3);
  await K('EN A9 H', 'KeyH');
  await bis('EN A9 Tab bis Rangfolge', /up|down|nach/i, { max: 10 });
  await C('EN A9 NVDA+Tab', 'reportCurrentFocus');
  await K('EN A9 Tab', 'Tab');
  await K('EN A9 Enter', 'Enter', { wait: 1800 });
  await ans(page, 'EN A9 DOM-Ansagen');
};

PH.p14 = async (page) => {
  await laden(page);
  await K('A14 Strg+Pos1', 'Control+Home');
  for (let i = 1; i <= 40; i++) await K(`A14 Pfeil unten ${i}`, 'ArrowDown', { wait: 800, zeige: false });
};

await mitNvda('2b-' + phase, async (page) => { if (!PH[phase]) throw new Error('Phase unbekannt'); await PH[phase](page); });
