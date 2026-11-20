// NVDA-Nachmessung Stufe 3 (zeitlich): Station (B5, B6, B12, Meldung der Leiste) und Auswahlansagen (B2) mit Abfrage des Sprachprotokolls alle 250 ms.
// Aufruf in app/:  NVDA_PORT=4232 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben3n-zeit.mjs <station|b2>
import { S, sleep, K, C, bis, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn, nvda } from './nvda-erheben3n-lib.mjs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = join(tmpdir(), 'n3-daten');
const BASE = `http://localhost:${process.env.NVDA_PORT ?? 4232}/`;
const LINK = readFileSync(join(DIR, 'link.txt'), 'utf8').trim();
const phase = process.argv[2] ?? 'station';

/** Sprachprotokoll alle 250 ms lesen, Zeitpunkt (ms nach Start) je neuer Phrase notieren */
async function horche(schritt, sek) {
  const t0 = Date.now(); const liste = [];
  while (Date.now() - t0 < sek * 1000) {
    await sleep(250);
    const l = await spoken();
    for (const p of l) liste.push({ ms: Date.now() - t0, p });
  }
  rec({ schritt, horchen_s: sek, gesagt: liste });
  return liste;
}
async function taste(schritt, t, sek = 4) {
  if (!(await nachVorn())) { rec({ schritt, fehler: 'msedge nicht vorn, Taste NICHT gesendet' }); S.abbruch = true; return; }
  await spoken();
  await nvda.press(t);
  await horche(schritt + ' [' + t + ']', sek);
  rec({ schritt: schritt + ' (Fokus danach)', z: (await zustand())?.fokus });
}
const fokus = (page, tag) => page.evaluate(() => { const e = document.activeElement; return (e?.tagName ?? '') + '#' + (e?.id ?? '') + ' ' + (e?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 60); }).then((s) => note(tag, s));

const PH = {};
PH.station = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'station.statable-fragebogen.json'));
  await sleep(1000);
  await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
  await page.getByTestId('fb-versand-station').click();
  await page.waitForSelector('#st-t'); await sleep(800);
  await page.getByRole('button', { name: /Station starten/ }).click();
  const d = page.locator('dialog.station'); await d.waitFor(); await sleep(1500);
  aufbau('Station geöffnet und gestartet per Playwright');
  const person = async (farbe) => {
    await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s1"]').waitFor();
    await page.getByRole('radio', { name: farbe, exact: true }).check();
    await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s2"]').waitFor();
  };
  // Person 1 bis zur letzten Seite, dann Enter auf „Weiter“ mit der Tastatur (Danke)
  await person('Rot');
  await d.locator('[data-weiter]').focus(); aufbau('Fokus auf letztes Weiter (Skript)');
  await page.bringToFront(); await nachVorn(); await spoken();
  await taste('B5 Danke der 1. Person (Enter auf Weiter)', 'Enter', 4);
  await fokus(page, 'Danke-Fokus');
  // B5: 25 s nichts tun, Protokoll alle 250 ms
  await page.evaluate(() => { window.__t0 = performance.now(); window.__log = []; for (const e of document.querySelectorAll('[aria-live],[role=status],[role=alert]')) { const id = e.id || e.getAttribute('role') || e.getAttribute('aria-live'); new MutationObserver(() => window.__log.push({ id, text: e.textContent, ms: Math.round(performance.now() - window.__t0), aria: e.getAttribute('aria-live') })).observe(e, { childList: true, characterData: true, subtree: true, attributes: true }); } });
  await horche('B5 Auto-Wechsel: 24 s ohne Taste (nach Danke)', 24);
  note('B5 DOM-Ansagen seit Danke', JSON.stringify(await page.evaluate(() => window.__log)));
  await fokus(page, 'B5 Fokus nach Auto-Wechsel');
  note('B5 Station-Zustand', await page.evaluate(() => document.querySelector('dialog.station [data-schritt]')?.getAttribute('data-schritt') + ' | ' + document.querySelector('dialog.station h1,dialog.station h2')?.textContent));
  // Personen 2 bis 4 per Skript, Person 5 bis letzter Seite, Enter mit Tastatur: B6
  for (const f of ['Grün', 'Blau', 'Rot']) { await person(f); await d.locator('[data-weiter]').click(); await d.locator('[data-naechste]').waitFor(); await d.locator('[data-naechste]').click(); await d.locator('[data-schritt="einleitung"]').waitFor(); }
  await person('Rot'); await d.locator('[data-weiter]').focus(); aufbau('Personen 2 bis 4 komplett, Person 5 bis letzte Seite per Skript');
  await page.evaluate(() => { window.__log = []; window.__t0 = performance.now(); });
  await page.bringToFront(); await nachVorn(); await spoken();
  await taste('B6 Danke der 5. Person (Enter auf Weiter): Erinnerung?', 'Enter', 7);
  note('B6 DOM-Ansagen', JSON.stringify(await page.evaluate(() => window.__log))); note('B6 Dialogtext', await page.evaluate(() => document.querySelector('dialog.station')?.innerText.replace(/\\s+/g, ' ').slice(0, 400)));
  // B5 (manuell): Nächste Person mit der Tastatur
  await d.locator('[data-naechste]').focus(); await page.evaluate(() => { window.__log = []; window.__t0 = performance.now(); });
  await taste('B5 Nächste Person (Enter)', 'Enter', 5);
  note('B5 manuell DOM-Ansagen', JSON.stringify(await page.evaluate(() => window.__log)));
  // B12
  await page.getByRole('button', { name: /^Station beenden$/ }).focus(); aufbau('Fokus auf „Station beenden“ (Skript)');
  await taste('B12 Enter auf „Station beenden“', 'Enter', 3);
  await taste('B12 Enter auf „Zurück zur Station“ (Startfokus)', 'Enter', 3);
  note('B12 Fokus', await page.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, ' ').trim()));
  await C('B12 NVDA+Tab', 'reportCurrentFocus');
  // Meldung der Leiste: Sicherungsdatei (Download per Playwright, Meldung der App wird gesprochen?)
  await spoken();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.getByRole('button', { name: /Sicherungsdatei speichern/ }).click()]);
  aufbau('Sicherungsdatei per Skript-Klick gespeichert: ' + (dl ? dl.suggestedFilename() : 'kein Download-Ereignis'));
  await nachVorn();
  await horche('Leiste: Sicherungsdatei gespeichert (Meldung der App)', 6);
  note('Leiste-Text', await page.evaluate(() => document.querySelector('[data-testid=st-leiste-status]')?.textContent));
};

PH.b2 = async (page) => {
  await page.goto(LINK, { waitUntil: 'load' }); await sleep(2500);
  await page.bringToFront(); await nachVorn();
  const w = () => page.locator('[data-weiter]').click();
  await w(); await page.locator('[data-schritt="einwilligung"]').waitFor(); await page.locator('#einw').check(); await w();
  await page.locator('[data-schritt="code"]').waitFor(); await page.locator('#code').fill('abcd-efgh'); await w();
  await page.locator('[data-seite="auswahl"]').waitFor();
  await page.getByRole('radio', { name: /^Blau$/ }).focus(); aufbau('Fokus auf Blau (Skript)');
  await nachVorn();
  await taste('B2 Pfeil unten: Blau -> Anders', 'ArrowDown', 5);
  await taste('B2 Pfeil oben: Anders -> Blau', 'ArrowUp', 5);
  await taste('B2 Pfeil oben: Blau -> Grün', 'ArrowUp', 4);
  await taste('B2 Pfeil oben: Grün -> Rot (Zusatzseite)', 'ArrowUp', 5);
  await taste('B2 Pfeil unten: Rot -> Grün', 'ArrowDown', 5);
};
PH.live = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'station.statable-fragebogen.json'));
  await sleep(1000);
  await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
  await page.getByTestId('fb-versand-station').click();
  await page.waitForSelector('#st-t'); await sleep(800);
  await page.getByRole('button', { name: /Station starten/ }).click();
  const d = page.locator('dialog.station'); await d.waitFor(); await sleep(2500);
  aufbau('Station gestartet per Playwright');
  note('Lage der Regionen', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map((e) => ({ id: e.id, rolle: e.getAttribute('role'), live: e.getAttribute('aria-live'), imDialog: !!e.closest('dialog'), leiste: !!e.closest('[data-testid=st-leiste]') })))));
  await page.bringToFront(); await nachVorn(); await spoken();
  const setze = (ort, text) => page.evaluate(([o, t]) => { const el = document.createElement('div'); el.setAttribute('role', 'status'); el.id = 'testregion-' + o; (o === 'innen' ? document.querySelector('dialog.station') : document.body).append(el); setTimeout(() => { el.textContent = t; }, 400); }, [ort, text]);
  await setze('innen', 'Testmeldung innen im Fenster');
  await horche('Neue Statusregion im modalen Fenster (400 ms nach Anlegen gefüllt)', 5);
  await page.evaluate(() => { const e = document.getElementById('ansage-hoeflich'); e.textContent = 'Testmeldung zentrale Region höflich'; });
  await horche('Zentrale Region ansage-hoeflich direkt gesetzt', 5);
  await page.evaluate(() => { const e = document.querySelector('dialog.station [role=status]'); e.textContent = 'Testmeldung Status im Fenster ' + Date.now(); });
  await horche('Vorhandene Statusregion im Fenster direkt gesetzt', 5);
};
PH.kontrolle = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(1500);
  await page.bringToFront(); await nachVorn(); await spoken();
  await page.evaluate(() => { const el = document.createElement('div'); el.setAttribute('role', 'status'); el.id = 'kontrolle'; document.body.append(el); setTimeout(() => { el.textContent = 'Kontrollmeldung ohne Fenster'; }, 400); });
  await horche('Kontrolle: neue Statusregion im Body, ohne Taste', 5);
  await page.evaluate(() => { document.getElementById('ansage-hoeflich').textContent = 'Kontrollmeldung zentrale Region'; });
  await horche('Kontrolle: zentrale Region ansage-hoeflich, ohne Taste', 5);
  await taste('Kontrolle: Pfeil unten (Taste, dann Meldung)', 'ArrowDown', 3);
  await page.evaluate(() => { document.getElementById('ansage-hoeflich').textContent = 'Kontrollmeldung nach Taste'; });
  await horche('Kontrolle: zentrale Region nach Taste', 5);
};
PH.schwelle = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(1500);
  await page.bringToFront(); await nachVorn(); await spoken();
  await page.evaluate(() => { const el = document.getElementById('ansage-hoeflich'); window.__setze = () => { for (const ms of [500, 1000, 1500, 2500, 4000]) setTimeout(() => { el.textContent = ''; setTimeout(() => { el.textContent = 'Meldung nach ' + ms + ' Millisekunden'; }, 0); }, ms); }; });
  for (const [name, t] of [['Pfeil unten', 'ArrowDown'], ['Pfeil unten', 'ArrowDown'], ['ohne Taste', null]]) {
    if (!(await nachVorn())) break;
    await spoken(); await page.evaluate(() => window.__setze());
    if (t) await nvda.press(t);
    await horche('Schwelle: ' + name + ', Meldungen bei 0,5 / 1 / 1,5 / 2,5 / 4 s nach der Taste (nvda.press wartet selbst etwas)', 7);
  }
};
PH.lokal = async (page) => {
  await page.goto(LINK, { waitUntil: 'load' }); await sleep(2500);
  await page.bringToFront(); await nachVorn(); await spoken();
  note('Regionen', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map((e) => ({ id: e.id, klasse: e.className, attr: e.hasAttribute('data-ansage'), live: e.getAttribute('aria-live'), atomic: e.getAttribute('aria-atomic'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, haupt: !!e.closest('main'), stil: getComputedStyle(e).clip + '|' + getComputedStyle(e).position })))));
  await page.evaluate(() => { const e = document.querySelector('.sr[aria-live]'); e.textContent = ''; setTimeout(() => { e.textContent = 'Lokale Region ohne Taste'; }, 300); });
  await horche('Lokale Region (Ausfüllseite, class sr) ohne Taste', 4);
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(1500);
  await page.bringToFront(); await nachVorn(); await spoken();
  note('Regionen Hauptapp', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map((e) => ({ id: e.id, klasse: e.className, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, stil: getComputedStyle(e).clip + '|' + getComputedStyle(e).position + '|' + getComputedStyle(e).overflow })))));
  await page.evaluate(() => { const e = document.getElementById('ansage-hoeflich'); e.textContent = ''; setTimeout(() => { e.textContent = 'Zentrale Region ohne Taste'; }, 300); });
  await horche('Zentrale Region ohne Taste', 4);
  await page.evaluate(() => { const e = document.getElementById('ansage-dringend'); e.textContent = ''; setTimeout(() => { e.textContent = 'Dringende Region ohne Taste'; }, 300); });
  await horche('Dringende Region (alert) ohne Taste', 4);};
PH.schwelle2 = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(1500);
  await page.bringToFront(); await nachVorn(); await spoken();
  await page.evaluate(() => { const el = document.getElementById('ansage-hoeflich'); window.__k = []; document.addEventListener('keydown', (ev) => { if (ev.key !== 'Tab') return; window.__k.push(Math.round(performance.now())); for (const ms of [300, 900, 1500, 2500, 4000]) setTimeout(() => { el.textContent = ''; setTimeout(() => { el.textContent = 'Meldung nach ' + ms + ' Millisekunden'; }, 0); }, ms); }, true); });
  for (let i = 0; i < 2; i++) {
    if (!(await nachVorn())) break;
    await spoken(); await nvda.press('Tab');
    await horche('Schwelle2: Tab, Meldungen 0,3 / 0,9 / 1,5 / 2,5 / 4 s nach keydown', 7);
  }
};
PH.sprung = async (page) => {
  const { readFileSync: lies, writeFileSync: schreibe } = await import('node:fs');
  const dat = JSON.parse(lies(join(DIR, 'station.statable-fragebogen.json'), 'utf8'));
  const fr = (e) => { if (e.art === 'frage' && e.id === 'F1') e.name = 'F 1'; if (e.art === 'frage' && e.id === 'T') e.name = 'T 2'; (e.elemente ?? []).forEach(fr); };
  dat.plan.elemente.forEach(fr);
  schreibe(join(DIR, 'fehler.statable-fragebogen.json'), JSON.stringify(dat));
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'fehler.statable-fragebogen.json'));
  await sleep(1500);
  aufbau('Plan mit zwei Namensfehlern geöffnet (Skript)');
  const z = (name) => page.locator('.sprung button', { hasText: name });
  await z('Zu den Vorlagen').focus(); await page.bringToFront(); await nachVorn();
  await taste('Sprunglinks: Start (Fokus Zu den Vorlagen)', 'Tab', 2);
  await z('Zu den Vorlagen').focus(); await nachVorn();
  await C('Sprunglinks: NVDA+Tab', 'reportCurrentFocus');
  await taste('Sprunglinks: Tab', 'Tab', 2); await taste('Sprunglinks: Tab', 'Tab', 2);
  await taste('Sprunglinks: Enter auf „Antworten verschlüsseln (Schlüssel)“', 'Enter', 3);
  for (const [n, tag] of [['Zum Verschicken', 'Verschicken'], ['Antworten einlesen', 'Antworten einlesen'], ['Rahmentexten', 'Rahmentexte']]) {
    await z(n).focus(); await nachVorn();
    await taste('Sprunglink ' + tag + ': Enter', 'Enter', 3);
  }
  // Export-Menü mit Sperre
  await page.locator('#fb-ex-knopf').focus(); await nachVorn();
  await taste('Export (Fehler): Enter auf „Exportieren“', 'Enter', 3);
  note('Sperrtext-dom', await page.evaluate(() => document.getElementById('fb-ex-grund')?.textContent));
  await taste('Export (Fehler): Tab', 'Tab', 3);
  await taste('Export (Fehler): Tab', 'Tab', 3);
  await taste('Export (Fehler): Tab', 'Tab', 3);
  await taste('Export (Fehler): Enter (Sprung)', 'Enter', 3);
  await page.locator('#fb-ex-knopf').focus(); await nachVorn();
  note('Menü offen?', await page.evaluate(() => document.getElementById('fb-ex-knopf')?.getAttribute('aria-expanded')));
};
PH.sperre = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'fehler.statable-fragebogen.json'));
  await sleep(1500);
  aufbau('Plan mit zwei Namensfehlern geöffnet (Skript)');
  await page.locator('#fb-ex-knopf').focus(); await page.bringToFront(); await nachVorn();
  await C('Export: NVDA+Tab (geschlossen)', 'reportCurrentFocus');
  await taste('Export (Fehler): Enter auf „Exportieren“ (öffnet)', 'Enter', 3);
  note('Sperrtext-dom', await page.evaluate(() => document.getElementById('fb-ex-grund')?.textContent));
  for (let i = 1; i <= 4; i++) await taste('Export (Fehler): Tab ' + i, 'Tab', 2);
  await C('Export (Fehler): NVDA+Tab', 'reportCurrentFocus');
  note('Fokus-dom', await page.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80)));
};
PH.sperre2 = async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'fehler.statable-fragebogen.json'));
  await sleep(1500);
  aufbau('Plan mit zwei Namensfehlern geöffnet (Skript)');
  await page.locator('#fb-ex-knopf').focus(); await page.bringToFront(); await nachVorn();
  await taste('Export (Fehler): Enter (öffnet)', 'Enter', 2);
  await taste('Tab 1 (Zum ersten Fehler springen)', 'Tab', 2);
  await taste('Enter: Zum ersten Fehler springen', 'Enter', 3);
  note('Fokus-dom nach Sprung 1', await page.evaluate(() => { const e = document.activeElement; return e?.tagName + '#' + e?.id + ' ' + (e?.getAttribute('aria-label') ?? '') + ' | ' + (e?.value ?? e?.textContent ?? '').slice(0, 60); }));
  await C('NVDA+Tab nach Sprung 1', 'reportCurrentFocus');
  await page.locator('#fb-ex-knopf').focus(); await nachVorn();
  if (await page.locator('#fb-ex-knopf').getAttribute('aria-expanded') !== 'true') await taste('Enter (öffnet erneut)', 'Enter', 2);
  await taste('Tab 1', 'Tab', 2); await taste('Tab 2 (Zur Stelle springen)', 'Tab', 2);
  await taste('Enter: Zur Stelle springen', 'Enter', 3);
  note('Fokus-dom nach Sprung 2', await page.evaluate(() => { const e = document.activeElement; return e?.tagName + '#' + e?.id + ' ' + (e?.getAttribute('aria-label') ?? '') + ' | ' + (e?.value ?? e?.textContent ?? '').slice(0, 60); }));
  await C('NVDA+Tab nach Sprung 2', 'reportCurrentFocus');
};
PH.b2n = async (page) => {
  await PH.b2(page);
  await page.getByRole('radio', { name: /^Rot$/ }).check(); await page.getByRole('checkbox', { name: 'Radio', exact: true }).check();
  await spoken();
  await page.locator('[data-weiter]').click();
  await horche('Weiter auf Seite 2 (Klick per Skript)', 5);
  await page.locator('[data-weiter]').click();
  await horche('Weiter auf Seite 3 (Klick per Skript)', 5);
};
PH.b2p = async (page) => {
  await page.goto(LINK, { waitUntil: 'load' }); await sleep(2500);
  await page.bringToFront(); await nachVorn();
  const w = () => page.locator('[data-weiter]').click();
  await w(); await page.locator('[data-schritt="einwilligung"]').waitFor(); await page.locator('#einw').check(); await w();
  await page.locator('[data-schritt="code"]').waitFor(); await page.locator('#code').fill('abcd-efgh'); await w();
  await page.locator('[data-seite="auswahl"]').waitFor();
  await page.getByRole('radio', { name: /^Rot$/ }).check(); await page.getByRole('checkbox', { name: 'Radio', exact: true }).check();
  await page.locator('[data-weiter]').focus(); aufbau('Fokus auf Weiter (Skript)'); await nachVorn();
  await taste('Enter auf Weiter (Seite 2)', 'Enter', 5);
  await page.locator('[data-seite="felder"]').waitFor(); await page.locator('[data-frage="Z"] input[type=number]').fill('42');
  await page.locator('[data-weiter]').focus(); await nachVorn();
  await taste('Enter auf Weiter (Seite 3)', 'Enter', 5);
};
if (!PH[phase]) { console.log('Phase unbekannt', phase); process.exit(2); }
await mitNvda(phase, PH[phase]);
