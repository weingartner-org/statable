// NVDA-Messung Stufe 2, Teil 3 (Eingabemaske, doppelte Dateneingabe, Abgleich).
// Aufruf: NVDA_PORT=4222 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben2-lauf3.mjs <phase>
// Phasen: e1 (Eingabemaske Durchgang A und B, danach Abgleich in einem Lauf, weil der Zustand nur im Speicher liegt)
import { S, sleep, K, C, T, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, nvda, BASE } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'e1';
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-4), tag);
const vorn = async (page) => { await page.bringToFront(); await nachVorn(); };
const PH = {};
const OBS = `
window.__ansagen = window.__ansagen || [];
setInterval(() => { for (const e of document.querySelectorAll('[role=status],[aria-live],[role=alert]')) { if (!e.__b2) { e.__b2 = 1; new MutationObserver(() => { if (e.textContent) window.__ansagen.push({ text: e.textContent, region: e.id || e.getAttribute('role') || e.className, ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }, 100);
`;

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
async function plan(page, vorlagen) {
  await page.goto(BASE + '#fragebogen', { waitUntil: 'load' }); await sleep(1500);
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await sleep(500);
  await page.locator('summary', { hasText: 'Vorlage einfügen' }).click();
  for (const v of vorlagen) {
    await page.locator('#fb-vorlage').selectOption({ label: v });
    await page.locator('details.vorlagen button.k', { hasText: 'Vorlage einfügen' }).click(); await sleep(500);
  }
  aufbau('Fragebogen angelegt, Vorlagen eingefügt: ' + vorlagen.join(', ') + ' (Playwright, nicht gemessen)');
}

PH.e1 = async (page) => {
  await S.ctx.addInitScript(OBS);
  await plan(page, ['Zustimmung (5 Stufen)', 'Ja oder Nein', 'Alter (Zahl)']);
  await page.locator('[data-eid]').nth(1).click(); await sleep(300);
  await page.getByLabel('Pflichtfrage (muss beantwortet werden)').check(); await sleep(300);
  await page.locator('h1#fb-t').focus();
  await page.evaluate(() => { window.__ansagen = []; });
  aufbau('Frage 1 als Pflichtfrage markiert, Fokus auf Überschrift (Playwright)');
  await vorn(page);
  await bis2('Tab bis Daten eingeben', /Daten eingeben/, { max: 25 });
  await K('Enter: Ansicht Eingabemaske', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Ansichtswechsel');
  await bis2('Tab bis Durchgang (Auswahlschalter)', /radio/, { max: 4 });
  await K('Pfeil unten: Durchgang B (probeweise)', 'ArrowDown', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Durchgang B (probeweise)');
  await K('Pfeil oben: zurück zu Durchgang A', 'ArrowUp', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Durchgang A');
  await bis2('Tab bis Bogen-Nummer', /fb-em-nr/, { max: 4 });
  await C('NVDA+Tab: Bogen-Nummer', 'reportCurrentFocus');
  await K('Strg+Enter ohne Nummer (Fehlerfall)', 'Control+Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Strg+Enter ohne Nummer');
  await dom(page, () => ({ fokus: document.activeElement?.id, invalid: document.activeElement?.getAttribute('aria-invalid'), fehler: document.getElementById('fb-em-nr-f')?.textContent }), 'Bogen-Nummer Fehler-DOM');
  await T('Nummer tippen: 12', '12');
  await K('Enter: zur ersten Frage', 'Enter', { wait: 1200 });
  await C('NVDA+Tab: erste Frage', 'reportCurrentFocus');
  await T('Code 3 tippen', '3', { wait: 1800 });
  await dom(page, () => ({ gewaehlt: document.querySelector('input[type=radio]:checked')?.closest('label')?.textContent, wertelabel: document.querySelector('.wertelabel')?.textContent }), 'Code 3 (DOM)');
  await ans(page, 'DOM-Ansagen nach Code 3');
  await C('NVDA+Tab (nach Code 3)', 'reportCurrentFocus');
  await K('Enter: nächste Frage (Ja/Nein)', 'Enter', { wait: 1200 });
  await T('unbekannter Code 7', '7', { wait: 1800 });
  await dom(page, () => ({ fehler: [...document.querySelectorAll('[data-fehlerplatz]')].map(e => e.textContent), invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.tagName + ':' + (e.getAttribute('aria-describedby') ?? '')) }), 'Code 7 Fehler-DOM');
  await ans(page, 'DOM-Ansagen nach Code 7');
  await C('NVDA+Tab (nach Code 7)', 'reportCurrentFocus');
  await T('Code 1 tippen (korrigieren)', '1', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Code 1');
  await K('Enter: Alter', 'Enter', { wait: 1200 });
  await T('Alter 25', '25');
  await K('Strg+Enter: Bogen 12 speichern', 'Control+Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Speichern');
  await C('NVDA+Tab (Fokus nach Speichern)', 'reportCurrentFocus');
  // Bogen 13: Pflichtfrage leer
  await K('Enter: Nummer 13 bestätigen -> erste Frage', 'Enter', { wait: 1200 });
  await K('Enter: erste Frage überspringen', 'Enter', { wait: 1200 });
  await K('Code 0', 'Digit0', { wait: 1800 }); await K('Enter', 'Enter', { wait: 900 }); await T('Alter 30', '30');
  await K('Strg+Enter: Bogen 13 (Pflichtfrage leer)', 'Control+Enter', { wait: 2000 });
  await dom(page, () => ({ dialog: document.querySelector('dialog[open]')?.innerText?.slice(0, 400), fokus: document.activeElement?.textContent?.trim() }), 'Rückfrage-DOM');
  await K('Shift+Tab: zu Trotzdem speichern', 'Shift+Tab', { wait: 900 });
  await K('Enter: Trotzdem speichern', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Bogen 13');
  await C('NVDA+Tab', 'reportCurrentFocus');
  await dom(page, () => document.querySelector('.liste')?.innerText, 'Liste der Bögen (DOM)');
  // Durchgang B
  await bis2('Shift+Tab bis Durchgang', /radio/, { taste: 'Shift+Tab', max: 6 });
  await K('Pfeil unten: Durchgang B', 'ArrowDown', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Durchgang B');
  await dom(page, () => ({ liste: document.querySelector('.liste')?.innerText, nr: document.getElementById('fb-em-nr')?.value }), 'Durchgang B: Liste (blind) (DOM)');
  await bis2('Tab bis Bogen-Nummer (B)', /fb-em-nr/, { max: 4 });
  await T('Nummer tippen: 12', '12'); await K('Enter', 'Enter', { wait: 900 });
  await T('B: Code 4', '4', { wait: 800 }); await K('Enter', 'Enter', { wait: 900 });
  await T('B: Code 1', '1', { wait: 800 }); await K('Enter', 'Enter', { wait: 900 });
  await T('B: Alter 25', '25');
  await K('Strg+Enter: B Bogen 12 speichern', 'Control+Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach B 12');
  await K('Enter: Nummer 13 -> erste Frage', 'Enter', { wait: 900 });
  await T('B: Code 2', '2', { wait: 800 }); await K('Enter', 'Enter', { wait: 900 });
  await K('B: Code 0', 'Digit0', { wait: 1500 }); await K('Enter', 'Enter', { wait: 900 });
  await T('B: Alter 30', '30');
  await K('Strg+Enter: B Bogen 13 speichern', 'Control+Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach B 13');
  await dom(page, () => ({ liste: document.querySelector('.liste')?.innerText }), 'Liste B (DOM)');
  // Abgleich
  await page.getByRole('button', { name: 'Abgleich und Protokoll' }).focus(); await vorn(page);
  aufbau('Fokus auf Ansichtsknopf „Abgleich und Protokoll“ (Playwright)');
  await K('Enter: Abgleich öffnen', 'Enter', { wait: 1800 });
  await ans(page, 'DOM-Ansagen nach Abgleich öffnen');
  await dom(page, () => document.querySelector('.ab')?.innerText.slice(0, 1500), 'Abgleich-DOM (Text)');
  await bis2('Tab bis Tabelle der Abweichungen', /region|Tabelle der Abweichungen/, { max: 6 });
  await K('Pfeil unten: in die Tabelle', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  await K('Pfeil unten', 'ArrowDown');
  await C('Strg+Alt+Pfeil rechts (Spalte)', 'moveToNextColumn');
  await C('Strg+Alt+Pfeil rechts (Spalte)', 'moveToNextColumn');
  await C('Strg+Alt+Pfeil unten (Zeile)', 'moveToNextRow');
  await C('Strg+Alt+Pfeil links (Spalte)', 'moveToPreviousColumn');
  await bis2('Tab bis Entscheidung (Auswahlschalter)', /radio/, { max: 4 });
  await K('Pfeil unten: B wählen', 'ArrowDown', { wait: 1200 });
  await bis2('Tab bis nächste Entscheidung', /radio/, { max: 4 });
  await K('Pfeil unten: B', 'ArrowDown', { wait: 900 });
  await K('Pfeil unten: Neuer Wert', 'ArrowDown', { wait: 1200 });
  await K('Tab: Feld Neuer Wert', 'Tab');
  await T('Neuer Wert: 9 (unbekannt)', '9', { wait: 1200 });
  await dom(page, () => ({ fehler: [...document.querySelectorAll('.fehlertext')].map(e => e.textContent), offen: document.getElementById('fb-ab-offen')?.textContent }), 'Fehler Neuer Wert (DOM)');
  await K('Rücktaste', 'Backspace'); await T('Neuer Wert: 3', '3', { wait: 1500 });
  await ans(page, 'DOM-Ansagen nach Entscheidungen');
  await bis2('Tab bis Datensatz erzeugen', /Datensatz erzeugen/, { max: 12 });
  await C('NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Datensatz erzeugen', 'Enter', { wait: 3500 });
  await ans(page, 'DOM-Ansagen nach Datensatz erzeugen');
  await dom(page, () => ({ hash: location.hash, fokus: document.activeElement?.tagName + ' ' + (document.activeElement?.textContent ?? '').trim().slice(0, 60), melde: document.querySelector('[role=alert],[role=status]')?.textContent }), 'nach Datensatz erzeugen (DOM)');
};

const f = PH[phase];
if (!f) { console.log('Phase?', Object.keys(PH)); process.exit(1); }
await mitNvda(phase, f);
