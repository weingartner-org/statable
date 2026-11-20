// Paket 5E2: Pseudonymisieren und Projektdatei mit Passwort im echten Browser (gegen PORT, Standard 4252) + axe.
// Aufruf: PORT=4252 node e2e/probe/5e2-pseudo-passwort.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const U = `http://127.0.0.1:${process.env.PORT || 4252}/`;
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { delete window.showSaveFilePicker; delete window.showOpenFilePicker; } catch { /* egal */ } });
const page = await ctx.newPage();
const fehlerSeite = [];
page.on('pageerror', e => fehlerSeite.push(String(e)));
const aus = (k, v) => console.log(k + ':', typeof v === 'string' ? v : JSON.stringify(v));
const axe = async (name) => {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  aus('axe ' + name, res.violations.map(v => [v.id, v.nodes.map(n => n.target.join(' ') + ' ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 90))]));
  return res.violations.length;
};
let verstoesse = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), '5e2-'));

await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
await page.goto(U + '#interviews'); await page.waitForTimeout(1500);
await page.locator('#iv-beispiel').click();
await page.waitForSelector('#iv-offen-t', { timeout: 20000 });

// ---- Pseudonymisieren
await page.locator('#pn-name').scrollIntoViewIfNeeded();
await page.locator('#pn-name').fill('Lena'); await page.getByRole('button', { name: 'Hinzufügen' }).click();
await page.locator('#pn-name').fill('Café'); await page.locator('#pn-art').selectOption('ort'); await page.getByRole('button', { name: 'Hinzufügen' }).click();
await page.locator('#pn-name').fill('Donnerstag'); await page.locator('#pn-art').selectOption('sonstiges'); await page.getByRole('button', { name: 'Hinzufügen' }).click();
aus('namen', await page.locator('#pn-namen-liste li').allInnerTexts());
aus('entfernen-knopf', await page.getByRole('button', { name: 'Entfernen: Lena' }).count());
await page.getByRole('button', { name: 'Entfernen: Lena' }).click();
aus('sprecher-kästchen', await page.locator('.sprecher label').allInnerTexts());
await page.getByLabel('Sprechername „Studentin“ ersetzen').uncheck();
await page.locator('#pn-suchen').click();
await page.waitForSelector('#pn-treffer-t', { timeout: 15000 });
aus('treffer-überschrift', await page.locator('#pn-treffer-t').innerText());
aus('gruppen', await page.locator('.gruppe h4').allInnerTexts());
aus('erster-treffer', (await page.locator('.treffer li').first().innerText()).slice(0, 200));
aus('angekreuzt', await page.locator('.treffer input:checked').count());
verstoesse += await axe('Treffer');
// Umbenennen
const um = page.locator('.platz input').first();
if (await um.count()) { await um.fill('[Studentin A]'); await um.press('Tab'); aus('umbenannt', await um.inputValue()); }
await page.locator('#pn-ersetzen').click();
await page.waitForSelector('#pn-dlg-t');
aus('rückfrage', await page.locator('.pnd p').innerText());
verstoesse += await axe('Rückfrage-Dialog');
await page.locator('.pnd').getByRole('button', { name: 'Ersetzen' }).click();
await page.waitForSelector('#pn-erg-t');
aus('ersetzt', await page.locator('#pn-erg-t + p').innerText());
const sichtbar = await page.evaluate(() => document.body.innerText.includes('[Studentin A]') || document.body.innerText.includes('Ort 1'));
aus('platzhalter-im-text-sichtbar', sichtbar);
verstoesse += await axe('Ersetzt');
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#pn-csv').click()]);
const csvPfad = path.join(tmp, 'zuordnung.csv'); await dl.saveAs(csvPfad);
aus('csv', fs.readFileSync(csvPfad, 'utf8'));
// Rückgängig
await page.locator('#pn-rueck').click();
await page.waitForTimeout(400);
aus('rückgängig-knopf-weg', (await page.locator('#pn-rueck').count()) === 0);

// ---- Passwort: Speichern über das Projektmenü
await page.locator('.pm-knopf').click();
await page.getByRole('button', { name: /Mit Passwort speichern/ }).click();
await page.waitForSelector('#pw-1');
verstoesse += await axe('Passwort setzen');
await page.locator('#pw-1').fill('kurz'); await page.locator('#pw-2').fill('kurz'); await page.locator('dialog[open] button[type=submit]').click();
aus('fehler-kurz', await page.locator('#pw-fehl').innerText());
aus('fokus-feld', await page.evaluate(() => document.activeElement?.id));
await page.locator('#pw-1').fill('Geheim 1234'); await page.locator('#pw-2').fill('Anders 1234'); await page.locator('dialog[open] button[type=submit]').click();
aus('fehler-verschieden', await page.locator('#pw-fehl').innerText());
aus('describedby', await page.locator('#pw-2').getAttribute('aria-describedby'));
await page.locator('#pw-2').fill('Geheim 1234');
const t0 = Date.now();
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('dialog[open] button[type=submit]').click()]);
aus('speichern-ms', Date.now() - t0);
const pfad = path.join(tmp, 'projekt.statable'); await dl2.saveAs(pfad);
aus('datei-beginnt', fs.readFileSync(pfad).subarray(0, 22).toString('latin1'));

// ---- Öffnen: falsches, dann richtiges Passwort
await page.goto(U + '#start'); await page.waitForTimeout(1500);
await page.locator('input[type=file]').first().setInputFiles(pfad);
await page.waitForSelector('#pw-o');
verstoesse += await axe('Passwort öffnen');
await page.locator('#pw-o').fill('falsch-falsch'); await page.getByRole('button', { name: 'Öffnen', exact: true }).click();
await page.waitForSelector('#pw-fehl', { timeout: 20000 });
aus('fehler-falsch', await page.locator('#pw-fehl').innerText());
aus('fokus-nach-falsch', await page.evaluate(() => document.activeElement?.id));
await page.locator('#pw-o').fill('Geheim 1234');
const t1 = Date.now();
await page.getByRole('button', { name: 'Öffnen', exact: true }).click();
await page.waitForSelector('#pw-o', { state: 'detached', timeout: 30000 });
aus('öffnen-ms', Date.now() - t1);
await page.waitForTimeout(2500);
aus('hash-nach-öffnen', await page.evaluate(() => location.hash));
aus('projekt-offen', await page.locator('.pm-knopf').count());

// Abbrechen öffnet nichts
await page.goto(U + '#start'); await page.waitForTimeout(1500);
await page.locator('input[type=file]').first().setInputFiles(pfad);
await page.waitForSelector('#pw-o');
await page.getByRole('button', { name: 'Abbrechen' }).click();
await page.waitForTimeout(800);
aus('nach-abbrechen-hash', await page.evaluate(() => location.hash));

aus('axe-verstöße-gesamt', verstoesse);
aus('seitenfehler', fehlerSeite);
await b.close();
