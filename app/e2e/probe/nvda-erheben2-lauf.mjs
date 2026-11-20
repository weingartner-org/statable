// NVDA-Messung Stufe 2 (Fragebogen planen, Eingabemaske, Abgleich), Prüfplan C + A3/A10.
// Aufruf: NVDA_PORT=4222 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben2-lauf.mjs <phase>
// Phasen: f1 (Anlegen, Vorlage, Frage hinzufügen, Gliederung) | f2 (Formular, Bedingung, Befunde, Vorschau) | f3 (Export) | e1 (Eingabemaske) | a1 (Abgleich)
import { S, sleep, K, C, T, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, nvda, BASE } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'f1';
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6), tag);
const vorn = async (page) => { await page.bringToFront(); await nachVorn(); };
const PH = {};
/** Tab (oder andere Taste) bis der Fokus zum Muster passt; bricht ab, wenn der Fokus die Seite verlässt (body) */
async function bis2(schritt, re, { taste = 'Tab', max = 20, wait = 900 } = {}) {
  let r = null;
  for (let i = 1; i <= max; i++) {
    r = await K(`${schritt} (${i})`, taste, { wait });
    if (!r) return null;
    if (re.test(r.z?.fokus ?? '')) return r;
    if (/^(body|a\[\] "Zum Inhalt)/.test(r.z?.fokus ?? '') || !r.z?.fokus) { note(schritt, 'Fokus hat die Seite verlassen oder liegt auf body, Abbruch'); return r; }
  }
  note(schritt, `Muster ${re} nach ${max} Tasten nicht erreicht`);
  return r;
}

/** Aufbau: Fragebogen anlegen und Vorlage einfügen (Playwright) */
async function plan(page, { vorlage = true } = {}) {
  await page.goto(BASE + '#fragebogen', { waitUntil: 'load' }); await sleep(1500);
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await sleep(500);
  if (vorlage) {
    await page.locator('summary', { hasText: 'Vorlage einfügen' }).click();
    await page.locator('details.vorlagen button.k', { hasText: 'Vorlage einfügen' }).click(); await sleep(500);
  }
  aufbau('Fragebogen angelegt' + (vorlage ? ' und Vorlage Zustimmung eingefügt' : '') + ' (Playwright, nicht gemessen)');
}

PH.f1 = async (page) => {
  await page.goto(BASE + '#fragebogen', { waitUntil: 'load' }); await sleep(1500);
  await page.evaluate(() => { window.__ansagen = []; }); await vorn(page);
  rec({ schritt: 'Ankommen: Seite geladen (#fragebogen)', gesagt: await spoken(), z: await zustand() });
  await C('Titel (NVDA+T)', 'reportTitle');
  await bis2('Tab bis Neuen Fragebogen anlegen', /Neuen Fragebogen anlegen/, { max: 8 });
  await K('Enter auf Neuen Fragebogen anlegen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Neuer Fragebogen');
  await C('NVDA+Tab', 'reportCurrentFocus');
  // Vorlage
  await bis2('Tab bis Vorlage-Zusammenfassung', /summary.*Vorlage/, { max: 40 });
  await K('Enter: Vorlage-Bereich öffnen', 'Enter');
  await K('Tab (Auswahl Vorlage)', 'Tab');
  await K('Tab', 'Tab'); await K('Tab', 'Tab');
  await bis2('Tab bis Knopf Vorlage einfügen', /^button.*Vorlage einfügen/, { max: 6 });
  await K('Enter: Vorlage einfügen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Vorlage');
  await C('NVDA+Tab', 'reportCurrentFocus');
  // Frage hinzufügen
  await bis2('Shift+Tab bis Frage hinzufügen', /^button.*Frage hinzufügen/, { taste: 'Shift+Tab', max: 16 });
  await K('Enter: Frage hinzufügen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Frage hinzufügen');
  await C('NVDA+Tab (neues Element?)', 'reportCurrentFocus');
  note('Fokus-DOM', JSON.stringify(await page.evaluate(() => ({ fokus: document.activeElement?.dataset?.eid, text: document.activeElement?.textContent?.trim(), cur: document.activeElement?.getAttribute('aria-current') }))));
};

PH.g1 = async (page) => { // Gliederung bedienen
  await plan(page);
  await page.evaluate(() => { window.__ansagen = []; });
  // Aufbau: zweite Frage per Playwright, dann Fokus per Playwright auf ersten Eintrag der Gliederung
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400);
  await page.getByRole('button', { name: 'Frage hinzufügen' }).click(); await sleep(400);
  await page.locator('[data-eid]').first().focus();
  aufbau('Zwei Fragen hinzugefügt, Fokus auf erstem Gliederungseintrag (Playwright)');
  await dom(page, () => [...document.querySelectorAll('[data-eid]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), 'Gliederung-DOM');
  await vorn(page);
  await C('NVDA+Tab: erster Eintrag', 'reportCurrentFocus');
  await K('Pfeil unten (Browse-Modus?)', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  await C('NVDA+Tab nach Pfeilen', 'reportCurrentFocus');
  await dom(page, () => ({ fokus: document.activeElement?.dataset?.eid, auswahl: document.querySelector('[aria-current=true]')?.dataset?.eid }), 'Fokus/Auswahl nach Pfeilen (DOM)');
  // Fokusmodus umschalten
  await C('NVDA+Leertaste (Fokusmodus)', 'toggleBetweenBrowseAndFocusMode');
  await K('Pfeil unten (Fokusmodus)', 'ArrowDown');
  await K('Pfeil oben (Fokusmodus)', 'ArrowUp');
  await K('Pfeil oben (Fokusmodus)', 'ArrowUp');
  await K('Ende', 'End');
  await K('Pos1', 'Home');
  await K('Pfeil unten', 'ArrowDown');
  await K('Alt+Pfeil unten (verschieben)', 'Alt+ArrowDown', { wait: 1500 });
  await ans(page, 'DOM-Ansagen nach Alt+Pfeil unten');
  await K('Alt+Pfeil oben (zurück)', 'Alt+ArrowUp', { wait: 1500 });
  await ans(page, 'DOM-Ansagen nach Alt+Pfeil oben');
  await K('Alt+Pfeil oben (Anschlag)', 'Alt+ArrowUp', { wait: 1500 });
  await K('Entf (Rückfrage)', 'Delete', { wait: 1500 });
  await ans(page, 'DOM-Ansagen nach Entf');
  await dom(page, () => ({ dialog: document.querySelector('dialog[open]')?.innerText?.slice(0, 300), fokus: document.activeElement?.tagName + ' ' + document.activeElement?.textContent?.trim() }), 'Rückfrage-DOM');
  await C('NVDA+Tab (Rückfrage)', 'reportCurrentFocus');
  await K('Esc (Rückfrage abbrechen)', 'Escape', { wait: 1200 });
  await K('Esc nochmals falls verschluckt', 'Escape', { wait: 1200 });
  await dom(page, () => ({ dialog: !!document.querySelector('dialog[open]'), fokus: document.activeElement?.tagName + ' ' + document.activeElement?.textContent?.trim().slice(0, 40) }), 'nach Esc (DOM)');
};

const f = PH[phase];
if (!f) { console.log('Phase?', Object.keys(PH)); process.exit(1); }
await mitNvda(phase, f);
