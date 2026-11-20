// NVDA-Messung Feinstruktur F1/F2: Fragen F-Q1 bis F-Q8 aus docs/feinstruktur/PRUEFPLAN-BARRIEREFREIHEIT-FEINSTRUKTUR.md, Abschnitt 2.
// Aufruf aus app/ (Vorschau laeuft):  NVDA_PORT=4292 NVDA_OUT=<datei> node e2e/probe/nvda-feinstruktur-f2.mjs <q1|q5|q6|q7|q8>
// Regeln wie nvda-erheben6c.mjs: Tasten nur ueber K/C/T (echt von NVDA); Playwright nur fuer den Aufbau (als "aufbau" vermerkt).
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, K, C, T, note, aufbau, rec, spoken, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'q1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4292}/`;
const HIER = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HIER, '../../../docs/feinstruktur');

// Bedingung: johan nicht aktiv ueber rdp-tcp verbunden
function bedingung() {
  let q = ''; try { q = execSync('query session', { encoding: 'latin1' }); } catch (e) { q = String(e.stdout ?? ''); }
  const aktivRdp = q.split('\n').some((z) => /rdp-tcp#/i.test(z) && /johan/i.test(z) && /Aktiv/i.test(z));
  // Plan autonom 5.4: aktive, unberührte Sitzung (Leerlauf ≥ 15 min, vom Dirigenten geprüft) ist erlaubt
  return { ok: !aktivRdp || process.env.NVDA_RDP_LEERLAUF === '1', q: q.trim().replace(/\s+/g, ' ').slice(0, 300) };
}
{ const b = bedingung(); if (!b.ok) { console.log('NICHT GEMESSEN: Sitzung per RDP aktiv', b.q); process.exit(3); } }

const dom = (page) => page.evaluate(() => {
  const e = document.activeElement;
  return { hash: location.hash, fokus: e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.getAttribute('aria-label') || e.textContent || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 70) + '"' : null,
    ansagen: (window.__ansagen || []).slice(-4).map((a) => a.text) };
});
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
async function m(page, tag, taste, opt = {}) { await frisch(page); const r = await K(tag, taste, opt); await sleep(300); rec({ schritt: tag + ' (DOM)', dom: await dom(page) }); return r; }
async function warte(page, tag, n = 2) { for (let i = 1; i <= n; i++) { await sleep(1500); rec({ schritt: `${tag} Warten ${(i * 1.5).toFixed(1)} s`, gesagt: await spoken() }); } rec({ schritt: tag + ' nach Warten (DOM)', dom: await dom(page) }); }
async function fokusSetzen(page, sel, text) {
  const l = page.locator(sel).first(); await l.focus(); aufbau(`Fokus per Skript auf ${text ?? sel}`);
  await page.bringToFront(); await nachVorn(); await frisch(page); await spoken();
}
const alle = async (page) => { await page.waitForSelector('#iv-t'); await sleep(1500); };

await mitNvda('f2-' + phase, async (page) => {
  await page.goto(BASE + '#interviews'); await alle(page);
  await page.bringToFront(); await nachVorn();
  note('hauptskript', await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((s) => /main-/.test(s)).join(' ')));

  if (phase === 'q1') {
    const datei = join(DOCS, 'beispiele/interview-a-fehler.txt');
    await page.locator('input[type=file][accept*=".vtt"]').setInputFiles(datei);
    aufbau('Fehler-Transkript per setInputFiles eingelesen (Playwright)');
    await page.waitForSelector('dialog[open]', { timeout: 15000 }); await page.locator('dialog[open] button.haupt', { hasText: 'Übernehmen' }).click(); aufbau('Sprecherzuordnung im Dialog per Skript mit Übernehmen bestätigt');
    await page.waitForSelector('button[aria-label^="Öffnen:"]', { timeout: 20000 });
    await page.locator('button[aria-label^="Öffnen:"]').first().click(); aufbau('Transkript per Skript geöffnet');
    await page.waitForSelector('#iv-offen-t', { timeout: 20000 }); await sleep(1000);
    // F-Q1 / F-Q2: Regelwerk waehlen
    await fokusSetzen(page, 'input[name="iv-regeln"]:checked', 'gewählter Radioknopf Regelwerk');
    await C('Q1 NVDA+Tab (Regelwerk)', 'reportCurrentFocus');
    await m(page, 'Q1 Pfeil ab (erweitert)', 'ArrowDown', { wait: 1200 });
    await m(page, 'Q1/Q2 Pfeil ab (Froschauer und Lueger)', 'ArrowDown', { wait: 1500 }); await warte(page, 'Q2 Hinweiszahl', 1);
    await C('Q1 NVDA+Tab (nach Wahl)', 'reportCurrentFocus');
    // Q2: Hinweisliste
    await fokusSetzen(page, '#iv-hin-kopf', 'Knopf „Hinweise zum Text“');
    await C('Q2 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q2 Enter (Hinweise aufklappen)', 'Enter', { wait: 1200 });
    for (let i = 1; i <= 4; i++) await m(page, `Q2 Tab ${i}`, 'Tab', { wait: 1000 });
    // Q3: dritter Knopf "Zur Stelle"
    const n = await page.locator('#iv-hin-inhalt button', { hasText: 'Zur Stelle' }).count(); note('Q3', `Knöpfe „Zur Stelle“: ${n}`);
    await fokusSetzen(page, '#iv-hin-inhalt button:has-text("Zur Stelle") >> nth=2', 'dritter Knopf „Zur Stelle“');
    await C('Q3 NVDA+Tab', 'reportCurrentFocus');
    await m(page, 'Q3 Enter (Hinweis 3 anspringen)', 'Enter', { wait: 800 }); await warte(page, 'Q3 Sprung', 2);
    await C('Q3 NVDA+Tab (nach Sprung)', 'reportCurrentFocus');
    // Q4: Ausschnitt im Text waehlen (Caret per Mausklick = Aufbau, Auswahl mit NVDA/Tastatur)
    await page.locator('.btext[data-beitrag="1"]').click({ position: { x: 2, y: 2 } }); aufbau('Mausklick an den Anfang von Beitrag 2 (Schreibmarke setzen)');
    await page.bringToFront(); await nachVorn(); await frisch(page); await spoken();
    await m(page, 'Q4 Umschalt+Pfeil ab', 'Shift+ArrowDown', { wait: 1500 });
    await m(page, 'Q4 Umschalt+Pfeil ab (2)', 'Shift+ArrowDown', { wait: 1500 }); await warte(page, 'Q4 Zählerzeile', 2);
    rec({ schritt: 'Q4 Zählerzeile (DOM)', zaehler: await page.evaluate(() => document.getElementById('iv-zaehler')?.textContent ?? null) });
  }

  if (phase === 'q5') {
    await page.locator('#pr-neu-iv').click(); aufbau('Neues Interviewprotokoll per Skript angelegt');
    await page.waitForSelector('#pr-editor-t'); await sleep(800);
    await fokusSetzen(page, '#pr-ort', 'Feld „Ort“');
    await C('Q5 NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 14; i++) {
      const r = await m(page, `Q5 Tab ${i}`, 'Tab', { wait: 1100 });
      if (/pr-f-/.test(JSON.stringify(r?.z?.fokus ?? ''))) rec({ schritt: `Q5 Feld ${i}: Beschreibung per DOM`, desc: await page.evaluate(() => document.activeElement?.getAttribute('aria-describedby') ?? '') });
    }
  }

  if (phase === 'q6') {
    await page.locator('#pr-neu-ge').click(); await page.waitForSelector('#pr-s1');
    await page.locator('#pr-s1').fill('Wir sprachen über den Termin am Morgen.');
    await page.locator('button', { hasText: 'Weiter zu Schritt 2' }).click(); await page.waitForSelector('#pr-s2');
    await page.locator('#pr-s2').fill('Der Ablauf war ruhig.');
    await page.locator('button', { hasText: 'Weiter zu Schritt 3' }).click(); await page.waitForSelector('#pr-ab-b-0');
    await page.locator('label.schalter', { hasText: 'Hinweise „Beobachtet oder gedeutet?“ zeigen' }).locator('input').check({ force: true });
    aufbau('Gedächtnisprotokoll bis Schritt 3 per Skript, Schalter „Beobachtet oder gedeutet?“ eingeschaltet');
    await fokusSetzen(page, '#pr-ab-b-0', 'Beobachtungsfeld Abschnitt 1');
    await C('Q6 NVDA+Tab (leeres Feld)', 'reportCurrentFocus');
    await T('Q6 tippen', 'Er war offensichtlich nervös.', { wait: 2500 }); await warte(page, 'Q6 nach Tippen', 2);
    rec({ schritt: 'Q6 Liste (DOM)', liste: await page.evaluate(() => [...document.querySelectorAll('[id^="pr-dm-"]')].map((e) => (e.getAttribute('aria-label') || '') + ' | ' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 200))) });
    await m(page, 'Q6 Tab (weg)', 'Tab', { wait: 1000 });
    await m(page, 'Q6 Umschalt+Tab (zurück ins Feld)', 'Shift+Tab', { wait: 1500 });
    await C('Q6 NVDA+Tab (Beschreibung?)', 'reportCurrentFocus');
    await C('Q6 NVDA+Pfeil ab? (Beschreibung lesen: NVDA+Umschalt+Pfeil unten nicht belegt) - Aktuelles Objekt', 'reportCurrentFocus', { wait: 1500 });
  }

  if (phase === 'q7') {
    await page.locator('#iv-beispiel').click(); await page.waitForSelector('details.fall', { timeout: 40000 }); await sleep(800);
    await page.evaluate(() => document.querySelectorAll('details.fall').forEach((d) => { d.open = true; }));
    await page.locator('button', { hasText: /^Einwilligung für Fall .* anlegen$/ }).first().click();
    await page.waitForSelector('input[name$="-zitate"]', { timeout: 8000 });
    aufbau('Beispielinterview geladen, Fall aufgeklappt, Einwilligung per Skript angelegt');
    await fokusSetzen(page, 'input[name$="-zitate"]:checked', 'gewählter Radioknopf Zitate');
    await C('Q7 NVDA+Tab', 'reportCurrentFocus');
    for (let i = 1; i <= 4; i++) {
      await m(page, `Q7 Pfeil ab ${i}`, 'ArrowDown', { wait: 1300 });
      const w = await page.evaluate(() => document.activeElement?.value ?? ''); if (w === 'widerrufen') break;
    }
    await warte(page, 'Q7 Ansage', 2);
    rec({ schritt: 'Q7 Stand (DOM)', stand: await page.evaluate(() => [...document.querySelectorAll('fieldset.punkt legend')].map((l) => l.textContent.trim()).filter((t) => /Zitate/.test(t))) });
    await C('Q7 NVDA+Tab (nach Änderung)', 'reportCurrentFocus');
  }

  if (phase === 'q8') {
    await page.locator('#iv-qdpx-beispiel').click(); aufbau('Beispielprojekt mit zwei Kodierenden per Skript geladen');
    await sleep(5000);
    const hat = await page.locator('#qm-erstellen').count(); note('Q8', `Matrix-Knopf da: ${hat}`);
    if (!hat) { note('Q8', 'nicht erreichbar, weil die Matrix nach dem Laden des Beispielprojekts keinen Knopf „Tabelle erstellen“ zeigt'); }
    else {
      await page.locator('#qm-erstellen').click(); await page.waitForSelector('#qm-erg-t', { timeout: 10000 }); aufbau('Matrix per Skript erstellt');
      await fokusSetzen(page, 'label.schalter:has-text("Zitate als Textspalten") input', 'Kontrollkästchen „Zitate als Textspalten übernehmen“');
      await C('Q8 NVDA+Tab', 'reportCurrentFocus');
      await m(page, 'Q8 Leertaste (Zitate einschalten)', 'Space', { wait: 900 });
      await fokusSetzen(page, 'button:has-text("Als Datensatz übernehmen")', 'Knopf „Als Datensatz übernehmen“');
      await C('Q8 NVDA+Tab', 'reportCurrentFocus');
      await m(page, 'Q8 Enter (Übernehmen)', 'Enter', { wait: 1000 }); await warte(page, 'Q8 Warnung', 2);
      await C('Q8 NVDA+Tab (Fokus nach Enter)', 'reportCurrentFocus');
      await m(page, 'Q8 Tab', 'Tab', { wait: 1000 });
      await m(page, 'Q8 Tab', 'Tab', { wait: 1000 });
      await m(page, 'Q8 Tab', 'Tab', { wait: 1000 });
      await C('Q8 NVDA+Tab', 'reportCurrentFocus');
      rec({ schritt: 'Q8 Warnung (DOM)', warnung: await page.evaluate(() => document.getElementById('qm-zit-warn-t')?.parentElement?.textContent.replace(/\s+/g, ' ').trim().slice(0, 400) ?? null) });
      await m(page, 'Q8 Enter auf „Trotzdem übernehmen“ (falls Fokus dort)', 'Enter', { wait: 1500 }); await warte(page, 'Q8 danach', 2);
    }
  }
  const b = bedingung(); rec({ schritt: 'Bedingung am Ende', ok: b.ok, q: b.q });
});
