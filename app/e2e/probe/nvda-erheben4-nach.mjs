// Nachmessung Stufe 4 (Commit 8da25436): B1, B2, B3, B5. Aufruf: NVDA_PORT=4246 NVDA_OUT=<datei> node e2e/probe/nvda-erheben4-nach.mjs <p1|p2|p3|p4>
import { sleep, K, C, note, aufbau, rec, spoken, zustand, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';
import { resolve, join } from 'node:path';
const phase = process.argv[2] ?? 'p1';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4246}/`;
const DIR = resolve('public/beispiel/interview');
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const fokusDom = (page, tag) => dom(page, () => { const e = document.activeElement; return { fokus: e?.tagName + '#' + e?.id + ' ' + (e?.getAttribute('aria-label') || e?.textContent || e?.value || '').replace(/\s+/g, ' ').slice(0, 80), inDialog: !!e?.closest('dialog[open]') }; }, tag);
const ans = (page, tag = 'DOM-Ansagen') => dom(page, () => (window.__ansagen || []).slice(-6).map((a) => a.text), tag);
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
const dlgOffen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
const seite = async (page) => { await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await sleep(1500); };
const datei = (page) => page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(join(DIR, 'semesterplanung-de-atrain.txt'));
// Schließtaste senden, danach OHNE weitere Taste warten und mitschreiben, was NVDA von selbst spricht
async function zu(page, tag, taste) {
  await frisch(page);
  const r = await K(tag + ' [' + taste + ']', taste, { wait: 3500 });
  await sleep(1500); const spaeter = await spoken(); rec({ schritt: tag + ' (weitere 1,5 s ohne Taste)', gesagt: spaeter });
  await fokusDom(page, tag + ' Fokus (DOM)'); await ans(page, tag + ' DOM-Ansagen');
  return r;
}
await mitNvda('e4n-' + phase, async (page) => {
  await seite(page);
  await page.bringToFront(); await nachVorn();
  if (phase === 'p1') {
    // Sprecher zuordnen, Übernehmen
    await page.focus('#iv-einlesen'); await datei(page); await page.waitForSelector('dialog[open] #iv-zu-t'); await sleep(2000);
    aufbau('Sprecher-Dialog per Skript geöffnet (Fokus vorher auf Transkript einlesen)'); await page.bringToFront(); await nachVorn();
    await page.locator('dialog[open] button.haupt').focus(); await nachVorn(); await fokusDom(page, 'B1a vor Enter');
    await zu(page, 'B1a Sprecher Übernehmen', 'Enter');
    await C('B1a NVDA+Tab', 'reportCurrentFocus');
    // Sprecher zuordnen, Esc
    await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await sleep(1500);
    await page.focus('#iv-einlesen'); await datei(page); await page.waitForSelector('dialog[open] #iv-zu-t'); await sleep(2000);
    aufbau('Sprecher-Dialog erneut geöffnet'); await page.bringToFront(); await nachVorn();
    await K('B1b Tab (Name)', 'Tab');
    await zu(page, 'B1b Sprecher Esc (1)', 'Escape');
    if (await dlgOffen(page)) await zu(page, 'B1b Sprecher Esc (2)', 'Escape');
    await C('B1b NVDA+Tab', 'reportCurrentFocus');
    // Umbenennen (Transkript aus 1a liegt in der Liste?)
    const n = await page.locator('button[aria-label^="Umbenennen"]').count(); note('Umbenennen-Knöpfe', String(n));
    if (n) {
      await page.locator('button[aria-label^="Umbenennen"]').first().focus(); await nachVorn();
      await K('B1c Enter Umbenennen', 'Enter', { wait: 1500 });
      await zu(page, 'B1c Umbenennen Esc (1)', 'Escape');
      if (await dlgOffen(page)) await zu(page, 'B1c Umbenennen Esc (2)', 'Escape');
      await K('B1d Enter Umbenennen', 'Enter', { wait: 1500 });
      await page.locator('dialog[open] button.haupt').focus(); await nachVorn();
      await zu(page, 'B1d Umbenennen Übernehmen', 'Enter');
    }
  }
  if (phase === 'p2') {
    await page.locator('#lf-neu').click(); await sleep(500);
    await page.fill('#lf-sam-text', 'Wie planst du deine Woche?'); await page.getByRole('button', { name: /Fragen hinzufügen/ }).click(); await sleep(400);
    await page.locator('.schritte button').nth(2).click(); await sleep(400);
    for (const t of ['Wochenplanung', 'Hilfsmittel']) { await page.fill('#lf-so-neu', t); await page.getByRole('button', { name: 'Block anlegen' }).click(); await sleep(300); }
    aufbau('Leitfaden mit Frage und zwei Blöcken per Skript angelegt');
    await page.locator('ol.bloecke li').nth(0).locator('button').nth(2).focus(); await frisch(page); await nachVorn();
    await K('B1e Enter: Rückfrage', 'Enter', { wait: 1500 });
    await zu(page, 'B1e Rückfrage Leitfaden Esc (1)', 'Escape');
    if (await dlgOffen(page)) await zu(page, 'B1e Rückfrage Leitfaden Esc (2)', 'Escape');
    await C('B1e NVDA+Tab', 'reportCurrentFocus');
    await K('B3 Enter: Rückfrage (2)', 'Enter', { wait: 1500 });
    await K('B3 Shift+Tab (zu Block entfernen)', 'Shift+Tab'); await fokusDom(page, 'B3 vor Enter');
    await zu(page, 'B3 Block entfernen bestätigen', 'Enter');
    await C('B3 NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'p3') {
    const neu = async (name, vater) => {
      if (vater) await page.locator(`button[data-akt=unter][aria-label$="${vater}"]`).click(); else await page.locator('#kodl-neu-haupt').click();
      await page.fill('#kodl-name', name); await page.getByRole('button', { name: 'Speichern' }).click(); await sleep(500);
    };
    await neu('Zeitplanung'); await neu('Hilfsmittel'); await neu('Kalender', 'Zeitplanung');
    aufbau('Drei Kategorien per Skript angelegt');
    await page.locator('button[data-akt=entfernen][aria-label$="Hilfsmittel"]').focus(); await frisch(page); await nachVorn();
    await K('B1f Enter: Entfernen → Rückfrage', 'Enter', { wait: 1500 });
    await zu(page, 'B1f Kodierleitfaden Esc (1)', 'Escape');
    if (await dlgOffen(page)) await zu(page, 'B1f Kodierleitfaden Esc (2)', 'Escape');
    await C('B1f NVDA+Tab', 'reportCurrentFocus');
    await K('B1g Enter: Rückfrage (2)', 'Enter', { wait: 1500 });
    // Im Kodierleitfaden steht „Entfernen“ NACH „Abbrechen“ (Umschalt+Tab führte am 09.11. aus dem Dialog in die Edge-Leiste).
    await K('B1g Tab (zu Entfernen)', 'Tab'); await fokusDom(page, 'B1g vor Enter');
    const imDialog = await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
    if (imDialog) await zu(page, 'B1g Kodierleitfaden bestätigen', 'Enter'); else note('B1g', 'Fokus nicht im Dialog: Enter NICHT gesendet');
    await C('B1g NVDA+Tab', 'reportCurrentFocus');
  }
  if (phase === 'p4') {
    // B5
    await page.focus('#iv-beispiel'); await frisch(page); await nachVorn();
    await K('B5 Tab-Kontrolle: Shift+Tab', 'Shift+Tab'); await K('B5 Tab zurück', 'Tab');
    await frisch(page);
    await K('B5 Enter Beispielinterview laden', 'Enter', { wait: 1000 });
    for (let i = 1; i <= 6; i++) { await sleep(1500); const g = await spoken(); rec({ schritt: 'B5 Warten ' + i * 1.5 + ' s', gesagt: g }); }
    await fokusDom(page, 'B5 Fokus'); await ans(page, 'B5 DOM-Ansagen');
    await page.focus('#iv-b-ed-0'); await nachVorn();
    await K('B2 Enter Bearbeiten', 'Enter', { wait: 1500 });
    await K('B2 Strg+Ende', 'Control+End'); await K('B2 Leerzeichen', 'Space'); await frisch(page);
    await zu(page, 'B2 Strg+Eingabe', 'Control+Enter');
    await C('B2 NVDA+Tab', 'reportCurrentFocus');
    await K('B2 Enter Bearbeiten (2)', 'Enter', { wait: 1500 });
    await frisch(page);
    await zu(page, 'B2 Esc (abbrechen)', 'Escape');
  }
  rec({ schritt: 'ende', notiz: 'Phase ' + phase + ' fertig' });
});

