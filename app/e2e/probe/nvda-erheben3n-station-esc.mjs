// NVDA-Messung Stufe 3F, Nachmessung: Rückfrage „Station beenden?“ - Fokus im Dialog, Esc, zweites Esc, Beenden mit Ja. Vorher: nvda-erheben3-vorbereiten.mjs
// Aufruf: NVDA_PORT=4232 NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben3-station-esc.mjs
import { S, sleep, K, C, bis, note, aufbau, mitNvda, nachVorn } from './nvda-erheben3n-lib.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = join(tmpdir(), 'n3-daten');
const BASE = `http://localhost:${process.env.NVDA_PORT ?? 4232}/`;
const dom = async (page, js, tag) => note(tag, JSON.stringify(await page.evaluate(js)));
const fokusDom = (page, tag) => dom(page, () => ({ fokus: document.activeElement?.tagName + '#' + document.activeElement?.id + ' ' + (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 60), inDialog: !!document.activeElement?.closest('dialog[open]'), dialogeOffen: document.querySelectorAll('dialog[open]').length }), tag);

await mitNvda('station-esc', async (page) => {
  await page.goto(BASE + '#fragebogen'); await page.waitForSelector('h1'); await sleep(800);
  await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'station.statable-fragebogen.json')); await sleep(1000);
  await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
  await page.getByTestId('fb-versand-station').click(); await page.waitForSelector('#st-t');
  await page.getByTestId('st-start').click(); await page.waitForSelector('dialog.station[open] [data-schritt="einleitung"]');
  const d = page.locator('dialog.station');
  await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s1"]').waitFor();
  await page.getByRole('radio', { name: 'Rot', exact: true }).check(); await d.locator('[data-weiter]').click(); await d.locator('[data-seite="s2"]').waitFor();
  await d.locator('[data-weiter]').click(); await d.locator('[data-naechste]').waitFor();
  aufbau('Station gestartet, eine Person ausgefüllt (Skript); Fokus auf „Station beenden“ per Skript');
  await page.getByTestId('st-beenden').focus(); await page.bringToFront(); await nachVorn();
  await C('Beenden: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter: Rückfrage', 'Enter', { wait: 1800 });
  await fokusDom(page, 'Rückfrage-dom');
  await K('Esc (erstes, Fokus liegt im Dialog)', 'Escape', { wait: 1800 }); await fokusDom(page, 'nach Esc 1');
  if ((await page.locator('dialog[open]').count()) > 1) { await K('Esc (zweites)', 'Escape', { wait: 1800 }); await fokusDom(page, 'nach Esc 2'); }
  await C('Fokus nach Esc: NVDA+Tab', 'reportCurrentFocus');
  await K('Enter (Rückfrage erneut)', 'Enter', { wait: 1800 }); await fokusDom(page, 'Rückfrage erneut');
  await K('Umschalt+Tab', 'Shift+Tab'); await fokusDom(page, 'nach Umschalt+Tab 1');
  await K('Umschalt+Tab', 'Shift+Tab'); await fokusDom(page, 'nach Umschalt+Tab 2');
  await K('Tab', 'Tab'); await K('Tab', 'Tab'); await fokusDom(page, 'nach Tab Tab (zurück bei „Zurück zur Station“?)');
  await K('Enter (Zurück zur Station)', 'Enter', { wait: 1800 }); await fokusDom(page, 'nach Zurück');
  await C('Fokus nach „Zurück zur Station“: NVDA+Tab', 'reportCurrentFocus');
  await K('Pfeil unten (Seite lesen)', 'ArrowDown', { wait: 900 });
});
