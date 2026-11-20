// NVDA-Messung Stufe 5 (Erheben): Prüfpunkte Q1-Q7 aus docs/erheben/FACHBLATT-STUFE-5.md, Abschnitt Barrierefreiheit.
// Aufruf aus app/ (Vorschau läuft):  NVDA_PORT=4259 NVDA_OUT=<datei> node e2e/probe/nvda-erheben5.mjs <q1|q2|q3|q4|q5|q6|q7>
// Regeln wie nvda-erheben1-lib.mjs: Tasten nur über K/C/T (prüfen, dass Edge vorne liegt); Playwright nur für den Aufbau (als "aufbau" gekennzeichnet).
// Nicht gedrückt werden: Word-Protokoll, Zuordnungsliste (CSV), alles, was eine Datei speichert oder Daten nach außen schickt.
import { sleep, K, C, T, note, aufbau, rec, spoken, mitNvda, nachVorn, bis } from './nvda-erheben1-lib.mjs';
const phase = process.argv[2] ?? 'q1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4259}/`;

// ---- DOM-Hilfen (nur lesen) ----
const fokusDom = (page) => page.evaluate(() => {
  const e = document.activeElement; if (!e) return null;
  const d = (id) => id ? (document.getElementById(id)?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  return { tag: e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''), rolle: e.getAttribute('role') || e.type || '', text: (e.getAttribute('aria-label') || e.textContent || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    beschreibung: d(e.getAttribute('aria-describedby')), ungueltig: e.getAttribute('aria-invalid'), imDialog: !!e.closest('dialog[open]') };
});
const ansDom = (page) => page.evaluate(() => (window.__ansagen || []).slice(-6).map((a) => a.text));
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
const dlgOffen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
const dom = async (page, tag) => rec({ schritt: tag + ' (DOM)', fokus: await fokusDom(page), ansagen: await ansDom(page) });

// Taste senden, danach Fokus und Ansagen aus dem DOM mitschreiben
async function m(page, tag, taste, opt = {}) {
  await frisch(page);
  const r = await K(tag, taste, opt);
  await dom(page, tag);
  return r;
}
// Schließtaste: danach OHNE weitere Taste warten und mitschreiben, was NVDA von selbst spricht
async function zu(page, tag, taste = 'Escape') {
  await frisch(page);
  const r = await K(tag + ' [' + taste + ']', taste, { wait: 3500 });
  await sleep(1500); rec({ schritt: tag + ' (weitere 1,5 s ohne Taste)', gesagt: await spoken() });
  await dom(page, tag);
  return r;
}
// Nach einer Auslöse-Taste dreimal 1,5 s ohne Taste warten (verspätete Ansagen)
async function warte(page, tag, n = 3) {
  for (let i = 1; i <= n; i++) { await sleep(1500); rec({ schritt: `${tag} Warten ${(i * 1.5).toFixed(1)} s`, gesagt: await spoken() }); }
  await dom(page, tag + ' nach Warten');
}
const seite = async (page) => { await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await sleep(1500); };
const fokusSetzen = async (page, sel, text) => { await page.locator(sel).first().focus(); aufbau(`Fokus per Skript auf ${text ?? sel}`); await page.bringToFront(); await nachVorn(); await frisch(page); };
const beispielprojekt = async (page) => {
  await page.locator('#iv-qdpx-beispiel').click(); await page.waitForSelector('#qx-erg-t', { timeout: 60000 }); await sleep(800);
  aufbau('Beispielprojekt per Skript geladen (Klick, nicht gemessen)');
};

await mitNvda('e5-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();

  if (phase === 'q1') {
    // Q1: Überschriften mit H, Bereiche mit D, Sprunglinks mit Tab. Start auf der Seiten-Überschrift (Browse-Modus).
    await fokusSetzen(page, '#iv-t', 'Seiten-Überschrift #iv-t');
    for (let i = 1; i <= 30; i++) { const r = await K(`Q1 H ${i}`, 'h', { wait: 600 }); if (!r) break; }
    await page.focus('#iv-t'); aufbau('Fokus zurück auf #iv-t'); await nachVorn();
    for (let i = 1; i <= 14; i++) { const r = await K(`Q1 D ${i}`, 'd', { wait: 600 }); if (!r) break; }
    await page.focus('#iv-t'); aufbau('Fokus zurück auf #iv-t für Sprunglinks'); await nachVorn();
    for (let i = 1; i <= 8; i++) { const r = await m(page, `Q1 Tab ${i} (Sprunglinks)`, 'Tab'); if (!r) break; }
    await m(page, 'Q1 Enter auf Sprunglink', 'Enter', { wait: 1200 });
  }

  if (phase === 'q2') {
    // Q2: Beispielprojekt laden, danach OHNE Taste warten: Ansage mit Zahlen, Fokus auf die Meldungsliste
    await fokusSetzen(page, '#iv-qdpx-beispiel', '„Beispielprojekt mit zwei Kodierenden laden (erfunden)“');
    await K('Q2 Fokus-Kontrolle (NVDA+Tab folgt)', 'Shift+Tab', { wait: 600 }); await K('Q2 Tab zurück', 'Tab', { wait: 600 });
    await frisch(page);
    await K('Q2 Enter Beispielprojekt laden', 'Enter', { wait: 1000 });
    await warte(page, 'Q2');
    note('Q2 erwartet', 'Ansage mit 3 Dokumenten, Zahl der Kodierungen und Meldungen; Fokus auf #qx-erg-t (Überschrift der Meldungsliste)');
    await C('Q2 NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'q3') {
    // Q3: Matrix-Felder mit Tab, dann Tabelle mit NVDA-Tabellenbefehlen
    await beispielprojekt(page);
    await fokusSetzen(page, '#qm-art', 'Feld „Art“ der Matrix');
    for (const [i, name] of ['Art', 'Zeilen', 'Personen', 'Codes (Gruppe)'].entries()) {
      if (i === 0) await C('Q3 NVDA+Tab (Art)', 'reportCurrentFocus'); else await m(page, `Q3 Tab → ${name}`, 'Tab');
    }
    await m(page, 'Q3 Tab (erstes Code-Kästchen)', 'Tab');
    // Tabelle erstellen: Fokus per Skript auf den Knopf (Aufbau), Auslösen mit Enter
    await fokusSetzen(page, '#qm-erstellen', '„Tabelle erstellen“');
    await m(page, 'Q3 Enter Tabelle erstellen', 'Enter', { wait: 1500 });
    await warte(page, 'Q3 Erstellen', 2);
    note('Q3', 'Hinweissatz vor der Tabelle wird beim Lesen mit Pfeil ab gemessen (Überschrift #qm-erg-t, danach Pfeil ab)');
    await fokusSetzen(page, '#qm-erg-t', 'Matrix-Überschrift #qm-erg-t');
    for (let i = 1; i <= 3; i++) await K(`Q3 Pfeil ab ${i} (Hinweis, Bereich)`, 'ArrowDown', { wait: 500 });
    // Scroll-Bereich der Tabelle (role=region, tabindex 0) per Tab erreichen, dann hinein
    await bis('Q3 Tab bis scrollbarer Bereich', /region|seitlich scrollbar/i, { max: 12 });
    for (let i = 1; i <= 2; i++) await K(`Q3 Pfeil ab in Tabelle ${i}`, 'ArrowDown', { wait: 500 });
    for (const [tag, taste] of [['Zelle rechts', 'Control+Alt+ArrowRight'], ['Zelle rechts 2', 'Control+Alt+ArrowRight'], ['Zeile ab', 'Control+Alt+ArrowDown'], ['Zeile ab 2', 'Control+Alt+ArrowDown'], ['Zelle links', 'Control+Alt+ArrowLeft'], ['Zeile auf', 'Control+Alt+ArrowUp']]) {
      await K('Q3 Tabelle: ' + tag + ' (Strg+Alt+Pfeil)', taste, { wait: 700 });
    }
  }

  if (phase === 'q4') {
    // Q4: Schwelle, Berechnen mit Enter, Fokus auf Ergebnis-Überschrift, Tabelle kurz lesen
    await beispielprojekt(page);
    await fokusSetzen(page, '#qu-schw', 'Feld „Schwelle“ (Auswahlfeld)');
    await C('Q4 NVDA+Tab (Schwelle)', 'reportCurrentFocus');
    await K('Q4 Pfeil ab (Wert ändern)', 'ArrowDown', { wait: 700 }); await dom(page, 'Q4 Schwelle');
    await K('Q4 Pfeil auf (zurück)', 'ArrowUp', { wait: 700 });
    await bis('Q4 Tab bis Berechnen', /#qu-berechnen/, { max: 40 });
    await m(page, 'Q4 Enter Berechnen', 'Enter', { wait: 1500 });
    await warte(page, 'Q4', 2);
    await C('Q4 NVDA+Tab (Ergebnis-Überschrift?)', 'reportCurrentFocus');
    for (let i = 1; i <= 3; i++) await K(`Q4 Pfeil ab ${i}`, 'ArrowDown', { wait: 500 });
    await K('Q4 T (nächste Tabelle)', 't', { wait: 800 });
    for (const [tag, taste] of [['Zelle rechts', 'Control+Alt+ArrowRight'], ['Zeile ab', 'Control+Alt+ArrowDown'], ['Zelle rechts', 'Control+Alt+ArrowRight']]) await K('Q4 Tabelle: ' + tag, taste, { wait: 700 });
  }

  if (phase === 'q5') {
    // Q5: Einigung beginnen, erste Abweichung: Legende, Radio-Gruppe, leere Begründung → Fehler, dann Begründung → nächste Legende
    await beispielprojekt(page);
    await page.locator('#qu-berechnen').click(); await page.waitForSelector('#qu-erg-t'); await sleep(500);
    aufbau('Übereinstimmung per Skript berechnet (Voraussetzung für die Einigung)');
    await fokusSetzen(page, 'button:has-text("Einigung beginnen")', '„Einigung beginnen“');
    await m(page, 'Q5 Enter Einigung beginnen', 'Enter', { wait: 1500 });
    await warte(page, 'Q5', 2);
    await C('Q5 NVDA+Tab (Fokus nach Beginn)', 'reportCurrentFocus');
    note('Q5', 'Fortschritt als Text: ' + JSON.stringify(await page.locator('#qk-fortschritt').innerText().catch(() => 'nicht gefunden')));
    const r = await bis('Q5 Tab bis Radio-Gruppe', /\[radio\]/, { max: 25 });
    if (r) {
      await m(page, 'Q5 Pfeil ab (Radio wählen)', 'ArrowDown');
      await m(page, 'Q5 Pfeil auf (Radio wählen)', 'ArrowUp');
    }
    await bis('Q5 Tab bis Weiter (Begründung bleibt leer)', /Weiter|Next/, { max: 15 });
    await zu(page, 'Q5 Weiter mit leerer Begründung (Fehleransage erwartet)', 'Enter');
    const imFeld = await page.evaluate(() => document.activeElement?.id);
    if (imFeld !== 'qk-begr') { await fokusSetzen(page, '#qk-begr', 'Begründungsfeld (Fokus war nicht dort)'); }
    await T('Q5 Begründung tippen', 'Die Definition passt');
    await bis('Q5 Tab bis Weiter', /Weiter|Next/, { max: 8 });
    await frisch(page);
    await zu(page, 'Q5 Weiter mit Begründung (Fokus auf nächste Legende erwartet)', 'Enter');
    note('Q5', 'Fortschritt danach: ' + JSON.stringify(await page.locator('#qk-fortschritt').innerText().catch(() => 'nicht gefunden')));
    await C('Q5 NVDA+Tab (nächste Legende?)', 'reportCurrentFocus');
    // „Konsens anlegen“ und „Protokoll als Word“ werden NICHT gedrückt (Datei).
  }

  if (phase === 'q6') {
    // Q6: Beispielinterview laden, Pseudonymisieren
    await page.locator('#iv-beispiel').click(); await page.waitForSelector('#iv-offen-t', { timeout: 20000 }); await sleep(800);
    aufbau('Beispielinterview per Skript geladen (Klick, nicht gemessen)');
    await fokusSetzen(page, '#pn-name', 'Namensfeld #pn-name');
    await C('Q6 NVDA+Tab (Namensfeld)', 'reportCurrentFocus');
    await T('Q6 Name tippen', 'Lena');
    await m(page, 'Q6 Tab → Art', 'Tab');
    await m(page, 'Q6 Tab → Hinzufügen', 'Tab');
    await zu(page, 'Q6 Hinzufügen (Ansage „… hinzugefügt …“ erwartet)', 'Enter');
    await bis('Q6 Tab bis Sprechernamen-Kästchen', /checkbox/, { max: 12 });
    await m(page, 'Q6 Leertaste (Kästchen umschalten)', 'Space'); await m(page, 'Q6 Leertaste (zurück)', 'Space');
    await bis('Q6 Tab bis Treffer suchen', /#pn-suchen/, { max: 14 });
    await frisch(page);
    await K('Q6 Enter Treffer suchen', 'Enter', { wait: 1000 });
    await warte(page, 'Q6 Treffer suchen');
    await C('Q6 NVDA+Tab (Fokus nach Suche)', 'reportCurrentFocus');
    note('Q6', 'Gruppen mit Überschrift und Zahl: ' + JSON.stringify(await page.locator('[id^=pn-g-]').allInnerTexts()));
    await bis('Q6 Tab bis Treffer-Kästchen', /checkbox/, { max: 8 });
    await m(page, 'Q6 Leertaste (Treffer abwählen)', 'Space'); await m(page, 'Q6 Leertaste (wieder an)', 'Space');
    await fokusSetzen(page, '#pn-ersetzen', '„Ersetzen“');
    await K('Q6 Enter Ersetzen (Dialog)', 'Enter', { wait: 1500 }); await dom(page, 'Q6 Dialog offen');
    await zu(page, 'Q6 Dialog Esc (Fokus zurück, Ansage)', 'Escape');
    if (await dlgOffen(page)) await zu(page, 'Q6 Dialog Esc (2)', 'Escape');
    await C('Q6 NVDA+Tab (nach Esc)', 'reportCurrentFocus');
    await K('Q6 Enter Ersetzen (Dialog erneut)', 'Enter', { wait: 1500 });
    if (await dlgOffen(page)) {
      await page.locator('dialog[open] button.haupt').focus(); aufbau('Fokus per Skript auf Bestätigen-Knopf im Dialog'); await nachVorn();
      await zu(page, 'Q6 Dialog bestätigen (Ansage „… Stellen … ersetzt“ erwartet)', 'Enter');
    } else note('Q6', 'Dialog nicht offen: Bestätigen NICHT gesendet');
    // „Zuordnungsliste speichern (CSV)“ wird NICHT gedrückt.
  }

  if (phase === 'q7') {
    // Q7: Passwort-Dialog aus dem Projektmenü. Das Menü gibt es nur mit geöffnetem Projekt: zuerst ein Beispiel-Datensatz, dann das Beispielinterview.
    await page.goto(BASE + '#beispiele'); await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await sleep(2500);
    await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await page.locator('#iv-beispiel').click(); await page.waitForSelector('#iv-offen-t', { timeout: 20000 }); await sleep(1500);
    aufbau('Beispiel-Datensatz geöffnet und Beispielinterview geladen (Klicks per Skript, nicht gemessen)');
    await page.locator('.pm-knopf').click(); await sleep(400);
    await page.getByRole('button', { name: /Mit Passwort speichern …/ }).focus();
    aufbau('Projektmenü per Skript geöffnet, Fokus auf „Mit Passwort speichern …“ (Taste nur zum Öffnen)');
    await page.bringToFront(); await nachVorn(); await frisch(page);
    await K('Q7 Enter Mit Passwort speichern …', 'Enter', { wait: 1500 });
    await dom(page, 'Q7 Dialog');
    await bis('Q7 Tab bis Passwortfeld 1', /#pw-1/, { max: 4 });
    await T('Q7 Passwort 1 tippen', 'Geheim 1234');
    await m(page, 'Q7 Tab → Passwort wiederholen', 'Tab');
    await T('Q7 Passwort 2 tippen (anders)', 'Anders 1234');
    await zu(page, 'Q7 Enter (Fehler „Die Passwörter sind verschieden.“ erwartet)', 'Enter');
    note('Q7 Fehler am Feld', JSON.stringify(await page.evaluate(() => ({ fehler: document.getElementById('pw-fehl')?.textContent?.trim(), describedby: document.getElementById('pw-2')?.getAttribute('aria-describedby'), invalid: document.getElementById('pw-2')?.getAttribute('aria-invalid'), fokus: document.activeElement?.id }))));
    await C('Q7 NVDA+Tab (Fokus bleibt im Feld?)', 'reportCurrentFocus');
    await zu(page, 'Q7 Esc (Fokus zurück erwartet)', 'Escape');
    if (await dlgOffen(page)) await zu(page, 'Q7 Esc (2)', 'Escape');
    await C('Q7 NVDA+Tab (nach Esc)', 'reportCurrentFocus');
    // Es wird nie ein gültiges Passwort abgeschickt: nichts wird gespeichert.
  }

  rec({ schritt: 'ende', notiz: 'Phase ' + phase + ' fertig' });
});
