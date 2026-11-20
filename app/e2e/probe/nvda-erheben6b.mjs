// NVDA-Messung Stufe 6b (Kodier-Arbeitsplatz, Kern): Prüfpunkte Q1-Q13 aus docs/erheben/FACHBLATT-STUFE-6B.md, Abschnitt 5.
// Aufruf aus app/ (Vorschau läuft):  NVDA_PORT=4277 NVDA_OUT=<datei> node e2e/probe/nvda-erheben6b.mjs <q1|q2|...|q13>
// Regeln wie nvda-erheben1-lib.mjs: Tasten nur über K/C (prüfen, dass Edge vorne liegt); Playwright nur für den Aufbau (als "aufbau" gekennzeichnet).
// Tab aus dem Lesemodus geht vom Lesecursor aus: Bedienelemente darum per Aufbau fokussieren.
import { sleep, K, C, note, aufbau, rec, spoken, mitNvda, nachVorn, bis } from './nvda-erheben1-lib.mjs';
const phase = process.argv[2] ?? 'q1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4277}/`;

// ---- DOM-Hilfen (nur lesen) ----
const zustand = (page) => page.evaluate(() => {
  const f = document.getElementById('ko-text');
  const stelle = (document.getElementById('ko-stelle')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const e = document.activeElement;
  const fokus = e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('aria-activedescendant') ? ' ad=' + e.getAttribute('aria-activedescendant') : '') : null;
  const sel = document.getSelection();
  const dokSel = sel && sel.rangeCount ? { text: sel.toString().slice(0, 80), imFeld: !!(f && sel.anchorNode && f.contains(sel.anchorNode)) } : null;
  const gewaehlt = [...document.querySelectorAll('#ko-liste [role=option][aria-selected=true]')].map((o) => o.id);
  const nOpt = document.querySelectorAll('#ko-liste [role=option]').length;
  const cl = document.getElementById('ko-cl-suche');
  return { fokus, dokSel, stelle, gewaehlt, nOpt, clName: cl ? (cl.labels?.[0]?.textContent ?? cl.getAttribute('aria-label')) : null,
    kodierungen: window.__kodierungen ?? null, ansagen: (window.__ansagen || []).slice(-4).map((a) => a.text) };
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
async function ansicht(page, a) { await page.locator(a === 'text' ? '#ko-ansicht-text' : '#ko-ansicht-saetze').check(); await sleep(600); aufbau('Ansicht ' + a + ' per Skript gewählt'); }
async function insFeld(page, tag) {
  // Fokus auf das Element vor dem Feld, dann mit Tab hinein: so entscheidet NVDA selbst über den Modus
  // (vorher: Radioknopf „Text“ + Tab – dazwischen liegen Rückgängig, Schalter, Sprunglinks und die Dokumente; darum vom Knopf danach rückwärts)
  await fokusSetzen(page, '#ko-satz', 'Knopf „Satz markieren“ (direkt nach dem Feld)'); await m(page, `${tag} Umschalt+Tab ins Feld`, 'Shift+Tab', { wait: 1200 });
}
async function inListe(page, tag) { await fokusSetzen(page, '#ko-l-code', 'Knopf „Code geben“ (direkt nach der Liste)'); await m(page, `${tag} Umschalt+Tab in die Liste`, 'Shift+Tab', { wait: 1200 }); }
async function kodiereAufbau(page, n = 2) {
  // zwei Stellen in der Ansicht Sätze mit Ziffer 1 kodieren (Playwright, nicht gemessen)
  await ansicht(page, 'saetze'); await page.locator('#ko-liste').focus();
  for (let i = 0; i < n; i++) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); await page.keyboard.press('1'); await page.keyboard.press('Delete'); await sleep(300); }
  aufbau(`${n} Stellen mit Ziffer 1 kodiert (Playwright)`);
}

await mitNvda('k6b-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();

  if (phase === 'q1b') {
    // Nachmessung Sprunglinks: Start auf dem ersten Link (h1 mit tabindex -1 zog den Lesecursor nicht mit; nach H stand er am Seitenende)
    await beispiel(page);
    await fokusSetzen(page, 'nav a, nav button', 'erster Sprunglink');
    await C('Q1b NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 8; i++) { const r = await m(page, `Q1b Tab ${i} (Sprunglinks)`, 'Tab', { wait: 700 }); if (!r) break; }
    await fokusSetzen(page, 'nav a, nav button', 'erster Sprunglink');
    await m(page, 'Q1b Enter (Zum Dokument)', 'Enter', { wait: 1500 }); await C('Q1b NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'q1') {
    await beispiel(page);
    await fokusSetzen(page, '#ko-t', 'Seiten-Überschrift #ko-t');
    for (let i = 1; i <= 12; i++) { const r = await K(`Q1 H ${i}`, 'h', { wait: 700 }); if (!r) break; }
    await page.focus('#ko-t'); aufbau('Fokus zurück auf #ko-t'); await nachVorn();
    for (let i = 1; i <= 10; i++) { const r = await K(`Q1 D ${i}`, 'd', { wait: 700 }); if (!r) break; }
    await fokusSetzen(page, '#ko-t', 'Seiten-Überschrift für Sprunglinks');
    for (let i = 1; i <= 9; i++) { const r = await m(page, `Q1 Tab ${i} (Sprunglinks)`, 'Tab', { wait: 700 }); if (!r) break; }
  }

  if (phase === 'q2' || phase === 'q3' || phase === 'q10' || phase === 'q12') {
    await beispiel(page); await ansicht(page, 'text'); await insFeld(page, phase.toUpperCase());
    await C(`${phase.toUpperCase()} NVDA+Tab`, 'reportCurrentFocus');
  }
  if (phase === 'q2') {
    await m(page, 'Q2 Pfeil ab', 'ArrowDown', { wait: 900 });
    await m(page, 'Q2 S (Satz)', 's', { wait: 1200 });
    await m(page, 'Q2 Enter (Code-Leiste)', 'Enter', { wait: 1500 }); await warte(page, 'Q2 Leiste', 1);
    for (const z of ['b', 'e', 'l']) await m(page, `Q2 tippen ${z}`, z, { wait: 700 });
    await warte(page, 'Q2 Suche (Trefferzahl?)', 1);
    await m(page, 'Q2 Pfeil ab (erster Code)', 'ArrowDown', { wait: 1000 });
    await m(page, 'Q2 Enter (Code geben)', 'Enter', { wait: 400 }); await warte(page, 'Q2 gegeben (ohne Wartezeit?)', 2);
    await C('Q2 NVDA+Tab (zurück im Feld?)', 'reportCurrentFocus');
    await m(page, 'Q2 I (Codes hier)', 'i', { wait: 1200 });
    // Umschalt+Tab aus der Code-Leiste ohne Code
    await m(page, 'Q2 Enter (Code-Leiste noch einmal)', 'Enter', { wait: 1500 });
    await m(page, 'Q2 Umschalt+Tab (zurück ohne Code)', 'Shift+Tab', { wait: 1200 });
    await C('Q2 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'q3') {
    await m(page, 'Q3 Pfeil ab ×2', 'ArrowDown', { wait: 700 }); await m(page, 'Q3 Pfeil ab', 'ArrowDown', { wait: 900 });
    await m(page, 'Q3 A (Absatz)', 'a', { wait: 1200 });
    await m(page, 'Q3 Ziffer 2', '2', { wait: 400 }); await warte(page, 'Q3 Ziffer', 1);
    await m(page, 'Q3 I', 'i', { wait: 1200 });
    await m(page, 'Q3 Ziffer 9 (leer?)', '9', { wait: 1200 });
  }
  if (phase === 'q4') {
    await beispiel(page); await ansicht(page, 'text'); await insFeld(page, 'Q4');
    await m(page, 'Q4 Pfeil ab', 'ArrowDown', { wait: 900 }); await m(page, 'Q4 S', 's', { wait: 1000 }); await m(page, 'Q4 S (dazu)', 's', { wait: 1000 });
    await fokusSetzen(page, '#ko-ansicht-saetze', 'Radioknopf „Sätze“');
    await m(page, 'Q4 Leertaste (Ansicht Sätze)', 'Space', { wait: 1500 }); await warte(page, 'Q4 Sätze', 1);
    await C('Q4 NVDA+Tab', 'reportCurrentFocus');
    await fokusSetzen(page, '#ko-ansicht-text', 'Radioknopf „Text“');
    await m(page, 'Q4 Leertaste (Ansicht Text)', 'Space', { wait: 1500 }); await warte(page, 'Q4 Text', 1);
    await C('Q4 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'q5') {
    await beispiel(page); await ansicht(page, 'saetze'); await inListe(page, 'Q5');
    await C('Q5 NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 2; i++) await m(page, `Q5 Pfeil ab ${i}`, 'ArrowDown', { wait: 1000 });
    await m(page, 'Q5 Leertaste', 'Space', { wait: 1000 });
    await m(page, 'Q5 Umschalt+Pfeil ab', 'Shift+ArrowDown', { wait: 1000 });
    await m(page, 'Q5 Enter (Code-Leiste)', 'Enter', { wait: 1500 });
    for (const z of 'Motivation') await K(`Q5 tippen ${z}`, z, { wait: 250 });
    await warte(page, 'Q5 Suche', 1);
    await m(page, 'Q5 Pfeil ab (Option Neuer Code?)', 'ArrowDown', { wait: 1000 });
    await m(page, 'Q5 Enter (anlegen und geben)', 'Enter', { wait: 400 }); await warte(page, 'Q5 angelegt', 2);
    await m(page, 'Q5 Pfeil auf', 'ArrowUp', { wait: 1000 }); await m(page, 'Q5 Pfeil ab', 'ArrowDown', { wait: 1000 });
    await m(page, 'Q5 Entf (Auswahl leeren)', 'Delete', { wait: 1000 });
  }
  if (phase === 'q6') {
    await beispiel(page);
    await fokusSetzen(page, '#ko-baum [tabindex="0"]', 'aktiver Eintrag im Codebaum');
    await C('Q6 NVDA+Tab', 'reportCurrentFocus');
    for (const [t, k] of [['Pfeil ab', 'ArrowDown'], ['Pfeil ab', 'ArrowDown'], ['rechts', 'ArrowRight'], ['rechts', 'ArrowRight'], ['links', 'ArrowLeft'], ['links', 'ArrowLeft'], ['Ende', 'End'], ['Pos1', 'Home']]) await m(page, 'Q6 ' + t, k, { wait: 900 });
    await m(page, 'Q6 Pfeil ab', 'ArrowDown', { wait: 900 });
    await m(page, 'Q6 Enter (Bearbeiten)', 'Enter', { wait: 1500 }); await C('Q6 NVDA+Tab', 'reportCurrentFocus');
    await K('Q6 Strg+A', 'Control+a', { wait: 400 }); for (const z of 'Neu') await K(`Q6 tippen ${z}`, z, { wait: 250 });
    await bis('Q6 Tab bis „Fertig“', /fertig/i, { max: 14 });
    await m(page, 'Q6 Enter (Fertig)', 'Enter', { wait: 1500 }); await C('Q6 NVDA+Tab (zurück im Baum?)', 'reportCurrentFocus');
    await fokusSetzen(page, '#ko-baum-werkzeuge [tabindex="0"]', 'Werkzeugleiste');
    await bis('Q6 Pfeil rechts bis „Eine Ebene tiefer“', /tiefer/i, { max: 9, taste: 'ArrowRight' }).catch(() => note('Q6', 'bis() mit Pfeil nicht möglich'));
    await m(page, 'Q6 Enter (Eine Ebene tiefer)', 'Enter', { wait: 1500 }); await warte(page, 'Q6 verschoben', 1);
    await C('Q6 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'q7') {
    await beispiel(page); await kodiereAufbau(page, 2);
    await fokusSetzen(page, '#ko-bel-code', 'Auswahl „Code“ bei den Belegen');
    await C('Q7 NVDA+Tab', 'reportCurrentFocus');
    await fokusSetzen(page, '#ko-bel-unter', 'Untercodes einschließen');
    await m(page, 'Q7 Leertaste (Untercodes)', 'Space', { wait: 1200 });
    const f = page.locator('#ko-bel-filter select').first();
    if (await f.count()) { await f.focus(); aufbau('Fokus auf den ersten Filter'); await nachVorn(); await C('Q7 NVDA+Tab (Filter)', 'reportCurrentFocus'); await m(page, 'Q7 Pfeil ab (Wert)', 'ArrowDown', { wait: 1200 }); }
    else note('Q7', 'kein Filter sichtbar (keine Fallvariablen im Beispiel?)');
    await fokusSetzen(page, '#ko-bel-liste button', 'Knopf „Im Text zeigen: Beleg 1“');
    await C('Q7 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q7 Enter Im Text zeigen', 'Enter', { wait: 1500 }); await warte(page, 'Q7 zeigen', 1);
    await C('Q7 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'q8') {
    await beispiel(page); await ansicht(page, 'saetze'); await inListe(page, 'Q8');
    await m(page, 'Q8 Pfeil ab', 'ArrowDown', { wait: 900 }); await m(page, 'Q8 Leertaste', 'Space', { wait: 900 });
    await m(page, 'Q8 M (Memo)', 'm', { wait: 1500 }); await C('Q8 NVDA+Tab', 'reportCurrentFocus');
    for (const z of 'Wichtig') await K(`Q8 tippen ${z}`, z, { wait: 250 });
    await bis('Q8 Tab bis „Memo speichern“', /speichern/i, { max: 6 });
    await m(page, 'Q8 Enter (speichern)', 'Enter', { wait: 1500 }); await warte(page, 'Q8 gespeichert', 1);
    await C('Q8 NVDA+Tab (zurück in der Liste?)', 'reportCurrentFocus');
    await m(page, 'Q8 Pfeil ab, Pfeil auf (Beschreibung mit Memo)', 'ArrowDown', { wait: 900 }); await m(page, 'Q8 Pfeil auf', 'ArrowUp', { wait: 1200 });
  }
  if (phase === 'q9') {
    await beispiel(page);
    const z = page.locator('#ko-faelle input').first();
    if (!(await z.count())) { await page.locator('#ko-var-neu').click().catch(() => {}); aufbau('Neue Variable per Klick'); note('Q9', 'Fälle-Tabelle ohne Felder; Aufbau prüfen'); }
    // Zahlenfeld (Semester) – Studienfach ist Text, dort ist jeder Wert gültig
    const sem = page.getByLabel(/^Semester für /).first();
    if (await sem.count()) { await sem.focus(); aufbau('Fokus per Skript auf „Semester für …“'); await page.bringToFront(); await nachVorn(); await frisch(page); }
    else await fokusSetzen(page, '#ko-faelle input', 'erstes Feld der Fälle-Tabelle');
    await C('Q9 NVDA+Tab', 'reportCurrentFocus');
    await K('Q9 Strg+A', 'Control+a', { wait: 300 }); for (const c of 'xyz') await K(`Q9 tippen ${c}`, c, { wait: 250 });
    await m(page, 'Q9 Tab (verlassen)', 'Tab', { wait: 1500 }); await m(page, 'Q9 Umschalt+Tab (zurück)', 'Shift+Tab', { wait: 1500 });
    await C('Q9 NVDA+Tab (Fehler am Feld?)', 'reportCurrentFocus');
  }
  if (phase === 'q10') {
    await m(page, 'Q10 Pfeil ab', 'ArrowDown', { wait: 900 }); await m(page, 'Q10 S', 's', { wait: 1000 });
    await m(page, 'Q10 Ziffer 1', '1', { wait: 1500 });
    await m(page, 'Q10 Strg+Z', 'Control+z', { wait: 400 }); await warte(page, 'Q10 rückgängig', 1);
    await m(page, 'Q10 I', 'i', { wait: 1200 });
  }
  if (phase === 'q11') {
    // Langes Dokument: Text des ersten Beispielinterviews 30-mal hintereinander über „Text einfügen“ (rund 1.500 Sätze)
    await beispiel(page);
    const lang = await page.evaluate(() => { const t = document.getElementById('ko-text')?.textContent ?? ''; return Array.from({ length: 30 }, () => t).join('\n'); });
    await page.locator('#ko-dok-neu').click(); await page.locator('#dh-name').fill('Langes Interview (Probe)'); await page.locator('#dh-text').fill(lang);
    await page.getByRole('button', { name: /Übernehmen/ }).click(); await sleep(2500);
    aufbau(`langes Dokument eingefügt (${lang.length} Zeichen, Playwright)`);
    await ansicht(page, 'saetze');
    await fokusSetzen(page, '#ko-s-gehe', 'Feld „Zu Satz Nr.“ (direkt nach der Liste)'); await m(page, 'Q11 Umschalt+Tab in die Liste', 'Shift+Tab', { wait: 1200 });
    await C('Q11 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q11 Ende', 'End', { wait: 1500 }); await m(page, 'Q11 Bild auf', 'PageUp', { wait: 1500 });
    await m(page, 'Q11 Pfeil auf', 'ArrowUp', { wait: 1200 }); await m(page, 'Q11 Pos1', 'Home', { wait: 1500 });
  }
  if (phase === 'q12') {
    await page.evaluate(() => { const s = document.getElementById('ko-ansage-lesen'); if (s && !s.checked) s.click(); });
    aufbau('Schalter „Beim Lesen ansagen“ per Skript eingeschaltet (falls vorhanden)');
    await kodiereAufbau(page, 2); await ansicht(page, 'text'); await insFeld(page, 'Q12');
    for (let i = 1; i <= 6; i++) await m(page, `Q12 Pfeil ab ${i}`, 'ArrowDown', { wait: 1400 });
  }
  if (phase === 'q13') {
    await beispiel(page); await kodiereAufbau(page, 1);
    await fokusSetzen(page, '#ko-baum [tabindex="0"]', 'aktiver Eintrag im Codebaum');
    await m(page, 'Q13 Entf (löschen?)', 'Delete', { wait: 1500 }); await C('Q13 NVDA+Tab (auf „Behalten“?)', 'reportCurrentFocus');
    await m(page, 'Q13 Umschalt+Tab (Löschen)', 'Shift+Tab', { wait: 1000 });
    await m(page, 'Q13 Enter (Löschen)', 'Enter', { wait: 400 }); await warte(page, 'Q13 gelöscht', 1);
    await C('Q13 NVDA+Tab', 'reportCurrentFocus');
    await fokusSetzen(page, '#ko-rueck', 'Knopf Rückgängig'); await m(page, 'Q13 Enter (Rückgängig)', 'Enter', { wait: 400 }); await warte(page, 'Q13 zurück', 1);
  }
});
