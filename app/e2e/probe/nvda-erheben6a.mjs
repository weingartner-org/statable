// NVDA-Messung Stufe 6a (Prototyp Kodier-Arbeitsplatz): Prüfpunkte P1-P9 aus docs/erheben/FACHBLATT-STUFE-6A.md, Abschnitt „Prüfplan“.
// Aufruf aus app/ (Vorschau läuft):  NVDA_PORT=4271 NVDA_OUT=<datei> node e2e/probe/nvda-erheben6a.mjs <p1|p2|...|p9>
// Regeln wie nvda-erheben1-lib.mjs: Tasten nur über K/C/T (prüfen, dass Edge vorne liegt); Playwright nur für den Aufbau (als "aufbau" gekennzeichnet).
// Ob NVDA im Fokusmodus ist, zeigt die Wirkung: Im Fokusmodus geht „s“ an die Seite (Ansage „Satz … markiert“), im Lesemodus springt NVDA zum nächsten Trenner.
import { sleep, K, C, note, aufbau, rec, spoken, mitNvda, nachVorn, bis } from './nvda-erheben1-lib.mjs';
const phase = process.argv[2] ?? 'p1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4271}/`;

// ---- DOM-Hilfen (nur lesen) ----
const auswahl = (page) => page.evaluate(() => {
  const f = document.getElementById('ko-a-text');
  const stelle = (document.getElementById('ko-a-stelle')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const e = document.activeElement;
  const fokus = e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('aria-activedescendant') ? ' ad=' + e.getAttribute('aria-activedescendant') : '') : null;
  let feld = null;
  if (f && f.tagName === 'TEXTAREA') feld = { art: 'textarea', start: f.selectionStart, ende: f.selectionEnd, text: f.value.slice(f.selectionStart, f.selectionEnd).slice(0, 80) };
  const sel = document.getSelection();
  const dokSel = sel && sel.rangeCount ? { text: sel.toString().slice(0, 80), imFeld: !!(f && sel.anchorNode && f.contains(sel.anchorNode)) } : null;
  const gewaehlt = [...document.querySelectorAll('#ko-b-liste [role=option][aria-selected=true]')].map((o) => o.id);
  return { fokus, feld, dokSel, stelle, gewaehlt, ansagen: (window.__ansagen || []).slice(-4).map((a) => a.text), dialog: !!document.querySelector('dialog[open]') };
});
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
const dom = async (page, tag) => rec({ schritt: tag + ' (DOM)', dom: await auswahl(page) });
async function m(page, tag, taste, opt = {}) { await frisch(page); const r = await K(tag, taste, opt); await sleep(300); await dom(page, tag); return r; }
async function warte(page, tag, n = 2) {
  for (let i = 1; i <= n; i++) { await sleep(1500); rec({ schritt: `${tag} Warten ${(i * 1.5).toFixed(1)} s`, gesagt: await spoken() }); }
  await dom(page, tag + ' nach Warten');
}
const fokusSetzen = async (page, sel, text) => { await page.locator(sel).first().focus(); aufbau(`Fokus per Skript auf ${text ?? sel}`); await page.bringToFront(); await nachVorn(); await frisch(page); };
async function seite(page) {
  await page.goto(BASE + '#kodieren'); await page.waitForSelector('#ko-t'); await sleep(1500);
}
async function beispiel(page) {
  const k = page.locator('#ko-laden');
  if (await k.isVisible().catch(() => false)) { await k.click(); aufbau('Beispielprojekt per Skript geladen (Klick, nicht gemessen)'); }
  await page.waitForSelector('#ko-a-text', { timeout: 60000 }); await sleep(800);
}
async function art(page, wert) { await page.selectOption('#ko-a-art', { index: { a: 0, b: 1, c: 2 }[wert] }); await sleep(500); aufbau('Textfeld-Art ' + wert + ' per Skript gewählt'); }

await mitNvda('k6a-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();

  if (phase === 'p1') {
    // P1: Überschriften mit H, Bereiche mit D, Beispiel laden mit Enter, danach ohne Taste warten
    await fokusSetzen(page, '#ko-t', 'Seiten-Überschrift #ko-t');
    for (let i = 1; i <= 8; i++) { const r = await K(`P1 H ${i}`, 'h', { wait: 700 }); if (!r) break; }
    await page.focus('#ko-t'); aufbau('Fokus zurück auf #ko-t'); await nachVorn();
    for (let i = 1; i <= 6; i++) { const r = await K(`P1 D ${i}`, 'd', { wait: 700 }); if (!r) break; }
    if (await page.locator('#ko-laden').isVisible().catch(() => false)) {
      await fokusSetzen(page, '#ko-laden', '„Beispielprojekt laden“');
      await K('P1 Umschalt+Tab (Kontrolle)', 'Shift+Tab', { wait: 600 }); await K('P1 Tab zurück', 'Tab', { wait: 600 });
      await frisch(page);
      await K('P1 Enter Beispiel laden', 'Enter', { wait: 1200 });
      await warte(page, 'P1', 3);
      await C('P1 NVDA+Tab', 'reportCurrentFocus');
    } else note('P1', 'Knopf #ko-laden nicht sichtbar (Projekt schon da?)');
    await fokusSetzen(page, '#ko-t', 'Seiten-Überschrift für Sprunglinks');
    for (let i = 1; i <= 7; i++) { const r = await m(page, `P1 Tab ${i} (Sprunglinks)`, 'Tab', { wait: 700 }); if (!r) break; }
  }

  if (phase === 'p2' || phase === 'p3' || phase === 'p4') {
    await beispiel(page); await art(page, 'a');
    // Fokus auf das Element vor dem Feld (Art-Auswahl), dann mit Tab hinein: so entscheidet NVDA selbst über den Modus
    await fokusSetzen(page, '#ko-a-art', 'Auswahl „Art des Textfelds“');
    await m(page, `${phase.toUpperCase()} Tab ins Feld (Art a)`, 'Tab', { wait: 1200 });
    await C(`${phase.toUpperCase()} NVDA+Tab`, 'reportCurrentFocus');
  }
  if (phase === 'p2') {
    for (let i = 1; i <= 2; i++) await m(page, `P2 Pfeil ab ${i}`, 'ArrowDown', { wait: 900 });
    for (let i = 1; i <= 2; i++) await m(page, `P2 Strg+Pfeil rechts ${i}`, 'Control+ArrowRight', { wait: 800 });
    for (let i = 1; i <= 3; i++) await m(page, `P2 Umschalt+Pfeil rechts ${i}`, 'Shift+ArrowRight', { wait: 800 });
    for (let i = 1; i <= 2; i++) await m(page, `P2 Umschalt+Strg+Pfeil rechts ${i}`, 'Shift+Control+ArrowRight', { wait: 900 });
    await C('P2 NVDA+Umschalt+Pfeil auf (Auswahl vorlesen)', 'readCurrentSelection');
  }
  if (phase === 'p3') {
    await m(page, 'P3 Pfeil ab (in Absatz 2)', 'ArrowDown', { wait: 900 });
    await m(page, 'P3 S (Satz)', 's', { wait: 1200 }); await warte(page, 'P3 S', 1);
    await m(page, 'P3 S (nächster Satz dazu)', 's', { wait: 1200 }); await warte(page, 'P3 S2', 1);
    await m(page, 'P3 Esc (aufheben)', 'Escape', { wait: 1200 });
    await m(page, 'P3 A (Absatz)', 'a', { wait: 1200 }); await warte(page, 'P3 A', 1);
    await m(page, 'P3 I (Codes hier)', 'i', { wait: 1200 });
  }
  if (phase === 'p4') {
    await m(page, 'P4 Pfeil ab', 'ArrowDown', { wait: 900 });
    await m(page, 'P4 S (Satz)', 's', { wait: 1200 });
    await m(page, 'P4 Enter (Code-Fenster)', 'Enter', { wait: 1500 }); await warte(page, 'P4 Fenster', 1);
    await C('P4 NVDA+Tab (im Fenster)', 'reportCurrentFocus');
    for (const z of ['b', 'e', 'l']) await m(page, `P4 tippen ${z}`, z, { wait: 700 });
    await warte(page, 'P4 Suche', 1);
    await m(page, 'P4 Pfeil ab (erster Code)', 'ArrowDown', { wait: 1000 });
    await m(page, 'P4 Enter (Code geben)', 'Enter', { wait: 1500 }); await warte(page, 'P4 gegeben', 2);
    await C('P4 NVDA+Tab (zurück im Feld?)', 'reportCurrentFocus');
    await m(page, 'P4 I (Codes hier)', 'i', { wait: 1200 });
    // doppelte Kodierung
    await m(page, 'P4 Enter (noch einmal)', 'Enter', { wait: 1500 });
    for (const z of ['b', 'e', 'l']) await K(`P4 tippen ${z}`, z, { wait: 500 });
    await m(page, 'P4 Enter in der Suche (erster Treffer)', 'Enter', { wait: 1500 }); await warte(page, 'P4 doppelt', 1);
  }

  if (phase === 'p5') {
    await beispiel(page); await art(page, 'b');
    await fokusSetzen(page, '#ko-a-art', 'Auswahl „Art des Textfelds“');
    await m(page, 'P5 Tab ins Feld (Art b)', 'Tab', { wait: 1200 });
    await C('P5 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'P5 Pfeil ab', 'ArrowDown', { wait: 900 });
    for (let i = 1; i <= 3; i++) await m(page, `P5 Umschalt+Pfeil rechts ${i}`, 'Shift+ArrowRight', { wait: 800 });
    await m(page, 'P5 S (Satz; im Lesemodus: Trenner)', 's', { wait: 1200 });
    note('P5', 'Jetzt NVDA+Leertaste (Modus umschalten) und dasselbe noch einmal');
    await C('P5 NVDA+Leertaste', 'toggleBetweenBrowseAndFocusMode');
    await m(page, 'P5 Pfeil ab (2)', 'ArrowDown', { wait: 900 });
    for (let i = 1; i <= 3; i++) await m(page, `P5 Umschalt+Pfeil rechts (2) ${i}`, 'Shift+ArrowRight', { wait: 800 });
    await m(page, 'P5 S (2)', 's', { wait: 1200 }); await warte(page, 'P5 S', 1);
    await m(page, 'P5 Enter (Code-Fenster)', 'Enter', { wait: 1500 });
    await m(page, 'P5 Esc (Fenster zu)', 'Escape', { wait: 2500 });
    await C('P5 NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'p6') {
    await beispiel(page); await art(page, 'c');
    await fokusSetzen(page, '#ko-a-art', 'Auswahl „Art des Textfelds“');
    note('P6', 'Lesemodus: mit Pfeil ab in den Text, dann NVDA-Auswahl mit Umschalt+Pfeil rechts');
    await K('P6 NVDA+Leertaste? nein: Esc für Lesemodus', 'Escape', { wait: 700 });
    for (let i = 1; i <= 5; i++) { const r = await m(page, `P6 Pfeil ab ${i}`, 'ArrowDown', { wait: 900 }); if ((r?.gesagt ?? []).join(' ').length > 80) break; }
    for (let i = 1; i <= 5; i++) await m(page, `P6 Umschalt+Pfeil rechts ${i}`, 'Shift+ArrowRight', { wait: 700 });
    await bis('P6 Tab bis „Markierte Stelle kodieren“', /#ko-a-code/, { max: 12 });
    await dom(page, 'P6 vor Enter');
    await m(page, 'P6 Enter auf „Markierte Stelle kodieren“', 'Enter', { wait: 1500 }); await warte(page, 'P6', 1);
    await K('P6 Esc', 'Escape', { wait: 2000 });
  }

  if (phase === 'p7') {
    await beispiel(page);
    await fokusSetzen(page, '#ko-b-t', 'Überschrift Weg 2');
    await bis('P7 Tab bis Liste', /#ko-b-liste/, { max: 6 });
    await C('P7 NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 2; i++) await m(page, `P7 Pfeil ab ${i}`, 'ArrowDown', { wait: 1000 });
    await m(page, 'P7 Leertaste (wählen)', 'Space', { wait: 1000 });
    await m(page, 'P7 Umschalt+Pfeil ab (Bereich)', 'Shift+ArrowDown', { wait: 1000 });
    await m(page, 'P7 Enter (Code-Fenster)', 'Enter', { wait: 1500 }); await warte(page, 'P7 Fenster', 1);
    for (const z of ['z', 'e', 'i']) await K(`P7 tippen ${z}`, z, { wait: 500 });
    await m(page, 'P7 Pfeil ab (erster Code)', 'ArrowDown', { wait: 1000 });
    await m(page, 'P7 Enter (Code geben)', 'Enter', { wait: 1500 }); await warte(page, 'P7 gegeben', 2);
    await C('P7 NVDA+Tab (zurück in der Liste?)', 'reportCurrentFocus');
    await m(page, 'P7 Pfeil auf', 'ArrowUp', { wait: 1000 });
    await m(page, 'P7 Pfeil ab', 'ArrowDown', { wait: 1000 });
    await m(page, 'P7 I (Codes hier)', 'i', { wait: 1000 });
    await m(page, 'P7 Esc (Auswahl leeren)', 'Escape', { wait: 1000 });
  }

  if (phase === 'p8') {
    await beispiel(page);
    // Aufbau: zwei Stellen per Weg 2 kodieren (Playwright, nicht gemessen)
    await page.locator('#ko-b-liste').focus();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); await page.keyboard.press('Enter');
    await page.waitForSelector('dialog[open]'); await page.locator('#ko-dlg-liste input[type=radio]').first().check(); await page.locator('#ko-dlg-ok').click(); await sleep(800);
    await page.locator('#ko-b-liste').focus(); await page.keyboard.press('Escape');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space'); await page.keyboard.press('Enter');
    await page.waitForSelector('dialog[open]'); await page.locator('#ko-dlg-liste input[type=radio]').first().check(); await page.locator('#ko-dlg-ok').click(); await sleep(800);
    aufbau('zwei Stellen mit dem ersten Code kodiert (Playwright)');
    await page.locator('#ko-c-code').selectOption({ index: 0 }).catch(() => {}); await sleep(500);
    await fokusSetzen(page, '#ko-c-code', 'Auswahl „Code“ bei den Belegen');
    await C('P8 NVDA+Tab', 'reportCurrentFocus');
    await K('P8 Umschalt+Tab, Tab', 'Shift+Tab', { wait: 500 }); await K('P8 Tab', 'Tab', { wait: 700 });
    note('P8', 'Liste mit Pfeil ab im Lesemodus lesen');
    await K('P8 Esc (Lesemodus)', 'Escape', { wait: 600 });
    for (let i = 1; i <= 8; i++) await K(`P8 Pfeil ab ${i}`, 'ArrowDown', { wait: 700 });
    // Knöpfe direkt ansteuern (Tab nach dem Lesen mit Pfeil lief beim ersten Lauf in die Edge-Leiste und löste „Aktualisieren“ aus)
    // (Tab aus dem Lesemodus geht von der Lesecursor-Stelle aus weiter, nicht vom Fokus)
    await fokusSetzen(page, '.ko-c-zeigen', 'Knopf „Im Text zeigen: Beleg 1“');
    await C('P8 NVDA+Tab (Im Text zeigen)', 'reportCurrentFocus');
    await m(page, 'P8 Enter Im Text zeigen', 'Enter', { wait: 1500 }); await warte(page, 'P8 zeigen', 1);
    await C('P8 NVDA+Tab', 'reportCurrentFocus');
    await fokusSetzen(page, '.ko-c-entfernen', 'Knopf „Code entfernen: Beleg 1“');
    await C('P8 NVDA+Tab (Entfernen)', 'reportCurrentFocus');
    await m(page, 'P8 Enter Code entfernen', 'Enter', { wait: 1500 }); await warte(page, 'P8 entfernt', 1);
    await C('P8 NVDA+Tab', 'reportCurrentFocus');
  }

  if (phase === 'p9') {
    await beispiel(page);
    await fokusSetzen(page, '#ko-t', 'Seiten-Überschrift (nach dem Laden)');
    for (let i = 1; i <= 8; i++) { const r = await K(`P9 H ${i}`, 'h', { wait: 700 }); if (!r) break; }
    await page.focus('#ko-t'); aufbau('Fokus zurück auf #ko-t'); await nachVorn();
    for (let i = 1; i <= 6; i++) { const r = await K(`P9 D ${i}`, 'd', { wait: 700 }); if (!r) break; }
    await fokusSetzen(page, '#ko-hilfe', 'Überschrift Tastenhilfe');
    await K('P9 T (Tabelle)', 't', { wait: 900 });
    for (const [tag, taste] of [['Zeile ab', 'Control+Alt+ArrowDown'], ['Zelle rechts', 'Control+Alt+ArrowRight'], ['Zelle rechts', 'Control+Alt+ArrowRight'], ['Zeile ab', 'Control+Alt+ArrowDown'], ['Zelle links', 'Control+Alt+ArrowLeft']]) await K('P9 Tabelle: ' + tag, taste, { wait: 800 });
  }
});
