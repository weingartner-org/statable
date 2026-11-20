// NVDA-Messung Stufe 6c (Bereich „Auswerten“): Prüfpunkte Q14-Q20 aus docs/erheben/FACHBLATT-STUFE-6C.md, Abschnitt 3.8,
// dazu die zwei Namensbefunde aus BF-PROTOKOLL-STUFE-6C.md (Option der Code-Leiste, aufgeklappter Obercode im Codebaum).
// Aufruf aus app/ (Vorschau läuft):  NVDA_PORT=4288 NVDA_OUT=<datei> node e2e/probe/nvda-erheben6c.mjs <q14|q15|...|q20|namen>
// Regeln wie nvda-erheben6b.mjs: Tasten nur über K/C; Playwright nur für den Aufbau (als "aufbau" gekennzeichnet).
import { sleep, K, C, note, aufbau, rec, spoken, mitNvda, nachVorn, bis } from './nvda-erheben1-lib.mjs';
const phase = process.argv[2] ?? 'q14';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4288}/`;

const zustand = (page) => page.evaluate(() => {
  const e = document.activeElement;
  const fokus = e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') : null;
  return { fokus, ansagen: (window.__ansagen || []).slice(-4).map((a) => a.text), h: document.getElementById('ko-auswerten-t') ? 'Auswerten da' : 'Auswerten fehlt' };
});
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
const dom = async (page, tag) => rec({ schritt: tag + ' (DOM)', dom: await zustand(page) });
async function m(page, tag, taste, opt = {}) { await frisch(page); const r = await K(tag, taste, opt); await sleep(300); await dom(page, tag); return r; }
async function warte(page, tag, n = 2) {
  for (let i = 1; i <= n; i++) { await sleep(1500); rec({ schritt: `${tag} Warten ${(i * 1.5).toFixed(1)} s`, gesagt: await spoken() }); }
  await dom(page, tag + ' nach Warten');
}
const fokusSetzen = async (page, sel, text) => { await page.locator(sel).first().focus(); aufbau(`Fokus per Skript auf ${text ?? sel}`); await page.bringToFront(); await nachVorn(); await frisch(page); };
async function seite(page) { await page.goto(BASE + '#kodieren'); await page.waitForSelector('#ko-t'); await sleep(1500); }
async function beispiel(page) {
  const k = page.locator('#ko-laden');
  if (await k.isVisible().catch(() => false)) { await k.click(); aufbau('Beispielprojekt per Skript geladen (Klick, nicht gemessen)'); }
  await page.waitForSelector('#ko-text, #ko-liste', { timeout: 60000 }); await sleep(800);
}
async function auswerten(page, wert) {
  await page.locator(`input[name="ko-auswerten"][value="${wert}"]`).check(); await sleep(800);
  aufbau('Auswerten-Ansicht ' + wert + ' per Skript gewählt');
}

await mitNvda('k6c-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();
  await beispiel(page);

  if (phase === 'q14') {
    await fokusSetzen(page, 'input[name="ko-auswerten"]:checked', 'gewählter Radioknopf „Auswerten“');
    await C('Q14 NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 5; i++) await m(page, `Q14 Pfeil ab ${i}`, 'ArrowDown', { wait: 1200 });
    await m(page, 'Q14 Pfeil auf', 'ArrowUp', { wait: 1200 });
  }
  if (phase === 'q15') {
    await auswerten(page, 'uebersicht');
    await fokusSetzen(page, '.ueb button', 'erster Eintrag der Dokument-Übersicht');
    await C('Q15 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q15 Enter (Absatz zeigen)', 'Enter', { wait: 800 }); await warte(page, 'Q15 Sprung', 2);
    await C('Q15 NVDA+Tab (Fokus im Dokument?)', 'reportCurrentFocus');
  }
  if (phase === 'q16') {
    await auswerten(page, 'fk');
    await fokusSetzen(page, '.fk-tabelle .zelle', 'erste Zelle der Matrix');
    await C('Q16 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q16 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight', { wait: 1200 });
    await m(page, 'Q16 Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight', { wait: 1200 });
    await m(page, 'Q16 Strg+Alt+Pfeil unten', 'Control+Alt+ArrowDown', { wait: 1200 });
    await m(page, 'Q16 Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft', { wait: 1200 });
    await m(page, 'Q16 Strg+Alt+Pfeil oben', 'Control+Alt+ArrowUp', { wait: 1200 });
  }
  if (phase === 'q17') {
    await auswerten(page, 'fk');
    await fokusSetzen(page, '.fk-tabelle .zelle', 'erste Zelle der Matrix');
    await m(page, 'Q17 Enter (Zelle öffnen)', 'Enter', { wait: 1500 }); await warte(page, 'Q17 Zelle', 1);
    await C('Q17 NVDA+Tab', 'reportCurrentFocus');
    await fokusSetzen(page, '#ko-fk-zus', 'Feld Zusammenfassung');
    await C('Q17 NVDA+Tab (Feld)', 'reportCurrentFocus');
    for (const z of 'Kurz') await K(`Q17 tippen ${z}`, z, { wait: 250 });
    await fokusSetzen(page, '#ko-fk-speichern', 'Knopf Speichern');
    await m(page, 'Q17 Enter (Speichern)', 'Enter', { wait: 500 }); await warte(page, 'Q17 gespeichert', 2);
  }
  if (phase === 'q18') {
    await auswerten(page, 'landkarte');
    await fokusSetzen(page, '#ko-lk-zeichnen', 'Knopf „Landkarte zeichnen“');
    await C('Q18 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q18 Enter (zeichnen)', 'Enter', { wait: 800 }); await warte(page, 'Q18 gezeichnet', 3);
    await fokusSetzen(page, '#ko-lk-erg-t', 'Überschrift Ergebnis der Landkarte');
    for (let i = 1; i <= 8; i++) await m(page, `Q18 Pfeil ab (Lesen) ${i}`, 'ArrowDown', { wait: 1000 });
    for (let i = 1; i <= 4; i++) await m(page, `Q18 T (Tabelle) ${i}`, 't', { wait: 1000 });
  }
  if (phase === 'q19') {
    await auswerten(page, 'aehnlich');
    await fokusSetzen(page, '#ko-ae-suchen', 'Knopf „Ähnliche Stellen suchen“');
    await C('Q19 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q19 Enter (suchen)', 'Enter', { wait: 800 }); await warte(page, 'Q19 gesucht (Trefferzahl?)', 3);
    await fokusSetzen(page, '#ko-ae-erg-t', 'Überschrift der Treffer');
    await m(page, 'Q19 Tab', 'Tab', { wait: 900 }); await m(page, 'Q19 Tab', 'Tab', { wait: 900 });
    await C('Q19 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q19 Enter (Im Text zeigen)', 'Enter', { wait: 800 }); await warte(page, 'Q19 gesprungen', 2);
    await C('Q19 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'q20') {
    await fokusSetzen(page, '[id^="ko-um-btn-fall-"]', 'Knopf „Fall umbenennen“');
    await C('Q20 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q20 Enter (Umbenennen)', 'Enter', { wait: 1200 }); await C('Q20 NVDA+Tab (Feld)', 'reportCurrentFocus');
    await K('Q20 Strg+A', 'Control+a', { wait: 300 }); await m(page, 'Q20 Entf (leer)', 'Delete', { wait: 300 });
    await m(page, 'Q20 Enter (leerer Name: Fehler?)', 'Enter', { wait: 1000 }); await warte(page, 'Q20 Fehler', 1);
    await C('Q20 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q20 Escape (Abbrechen)', 'Escape', { wait: 1000 });
    const l = page.getByRole('button', { name: /^Fall .* löschen$/ }).first();
    if (await l.count()) { await l.focus(); aufbau('Fokus per Skript auf Knopf „Fall … löschen“'); await page.bringToFront(); await nachVorn(); await frisch(page); }
    await C('Q20 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q20 Enter (Löschen, Rückfrage)', 'Enter', { wait: 1200 }); await warte(page, 'Q20 Rückfrage', 1);
    await C('Q20 NVDA+Tab (Rückfrage)', 'reportCurrentFocus');
    await m(page, 'Q20 Escape (zurück?)', 'Escape', { wait: 1000 });
  }
  if (phase === 'namen') {
    // Namensbefund 1: Option der Code-Leiste (Ansicht Sätze, Satz wählen, Enter)
    await page.locator('#ko-ansicht-saetze').check(); await sleep(600); aufbau('Ansicht Sätze per Skript');
    await fokusSetzen(page, '#ko-liste', 'Satzliste');
    await m(page, 'N1 Pfeil ab', 'ArrowDown', { wait: 900 }); await m(page, 'N1 Leertaste', 'Space', { wait: 900 });
    await m(page, 'N1 Enter (Code-Leiste)', 'Enter', { wait: 1500 });
    await m(page, 'N1 Pfeil ab (Option 1)', 'ArrowDown', { wait: 1200 }); await m(page, 'N1 Pfeil ab (Option 2)', 'ArrowDown', { wait: 1200 });
    await m(page, 'N1 Escape', 'Escape', { wait: 800 });
    // Namensbefund 2: aufgeklappter Obercode im Codebaum
    await fokusSetzen(page, '#ko-baum [role="treeitem"][aria-expanded="true"]', 'aufgeklappter Obercode im Codebaum');
    await C('N2 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'N2 Pfeil ab', 'ArrowDown', { wait: 1000 }); await m(page, 'N2 Pfeil auf', 'ArrowUp', { wait: 1000 });
    await m(page, 'N2 Pfeil links (zuklappen)', 'ArrowLeft', { wait: 1000 }); await m(page, 'N2 Pfeil rechts (aufklappen)', 'ArrowRight', { wait: 1000 });
  }
});
