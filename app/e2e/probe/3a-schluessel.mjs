// Stufe 3A: „Antworten verschlüsseln (Schlüssel)“ in „Fragebogen planen“ im echten Chromium. Ablauf, axe, Sicherheit (privater Schlüssel nie im Browserspeicher).
// Aufruf: PORT=5199 node e2e/probe/3a-schluessel.mjs   (gegen `vite preview` nach `vite build`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const U = `http://localhost:${process.env.PORT || 5199}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
const axe = async (name) => {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).include('#fb-schl-t').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};
const axeAbschnitt = async (name) => {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).include('section.schl').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};
void axe;

await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.waitForSelector('#fb-schl-t');
await axeAbschnitt('Abschnitt ohne Schlüssel');
ok(await page.getByTestId('fb-schl-leer').count() === 1, 'Hinweis „Noch kein Schlüssel“');

// ---- neu anlegen: erst Fehler
await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
ok(await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).getAttribute('aria-expanded') === 'true', 'Knopf meldet aria-expanded');
for (const id of ['fb-schl-pw1', 'fb-schl-pw2']) ok(await page.locator('#' + id).getAttribute('autocomplete') === 'new-password', `${id}: autocomplete=new-password`);
ok(await page.locator('label[for=fb-schl-pw1]').count() === 1 && await page.locator('label[for=fb-schl-pw2]').count() === 1, 'Passwortfelder haben Beschriftung');
await axeAbschnitt('Anlegen-Formular');
await page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click();
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-name'), 'Fehler Name: Fokus im Feld');
ok((await page.locator('#fb-schl-name-f').innerText()).includes('Namen'), 'Fehlertext steht am Feld Name');
await page.fill('#fb-schl-name', 'Umfrage Seminar');
await page.fill('#fb-schl-pw1', 'kurz');
await page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click();
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-pw1'), 'Fehler zu kurzes Passwort: Fokus im Feld');
await axeAbschnitt('Anlegen mit Fehlertext');
await page.fill('#fb-schl-pw1', 'ein langes passwort 1'); await page.fill('#fb-schl-pw2', 'anderes');
await page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click();
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-pw2'), 'Fehler Passwörter ungleich: Fokus im zweiten Feld');
await page.fill('#fb-schl-pw2', 'ein langes passwort 1');

// ---- erzeugen, Datei speichern
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
ok(dl.suggestedFilename() === 'Umfrage-Seminar.statable-schluessel', 'Dateiname: ' + dl.suggestedFilename());
const dir = mkdtempSync(join(tmpdir(), 'schl-')); const pfad = join(dir, dl.suggestedFilename());
await dl.saveAs(pfad);
ok(readFileSync(pfad).subarray(0, 21).toString() === 'age-encryption.org/v1', 'Datei ist eine age-Datei');
await page.waitForSelector('#fb-schl-gesichert');
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-gesichert'), 'Fokus auf „Ich habe die Datei gesichert“');
ok(await page.locator('#fb-schl-pub').count() === 0, 'ohne Haken steht noch kein Schlüssel im Plan');
await axeAbschnitt('Schritt 2 (Haken)');
await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-gesichert') && (await page.locator('#fb-schl-ges-f').count()) === 1, 'ohne Haken: Fehlertext, Fokus am Haken');
await page.check('#fb-schl-gesichert');
await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
await page.waitForSelector('#fb-schl-pub');
const pub = await page.inputValue('#fb-schl-pub');
ok(/^age1[a-z0-9]{50,}$/.test(pub), 'öffentlicher Schlüssel steht im Abschnitt');
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-pub'), 'Fokus auf dem Schlüssel');
ok((await page.getByTestId('fb-schl-status').innerText()).includes('geöffnet'), 'Status: privater Schlüssel in der Sitzung geöffnet');
await axeAbschnitt('Abschnitt mit Schlüssel');

// ---- Sicherheit: privater Schlüssel nirgends im Browserspeicher, nicht im Seitentext
const speicher = await page.evaluate(async () => {
  const teile = [JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage })];
  const dbs = (await indexedDB.databases?.()) ?? [];
  for (const d of dbs) {
    const db = await new Promise((res, rej) => { const q = indexedDB.open(d.name); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    for (const n of db.objectStoreNames) {
      const alle = await new Promise((res, rej) => { const q = db.transaction(n).objectStore(n).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
      teile.push(JSON.stringify(alle, (k, v) => (v instanceof Uint8Array ? Array.from(v).map(c => String.fromCharCode(c)).join('') : v)));
    }
    db.close();
  }
  return teile.join('\n') + document.body.innerText;
});
ok(!speicher.includes('AGE-SECRET-KEY'), 'kein privater Schlüssel in localStorage, sessionStorage, IndexedDB oder Seitentext');

// ---- Kopieren
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: U.replace(/\/$/, '') });
await page.getByRole('button', { name: 'Kopieren' }).click();
ok(await page.evaluate(() => navigator.clipboard.readText()) === pub, 'Kopieren legt den öffentlichen Schlüssel in die Zwischenablage');

// ---- entfernen, vorhandenen Schlüssel verwenden (falsches Passwort, dann richtig)
await page.getByRole('button', { name: 'Schlüssel aus dem Fragebogen entfernen' }).click();
ok(await page.locator('#fb-schl-pub').count() === 0, 'Schlüssel entfernt');
await page.getByRole('button', { name: 'Vorhandenen Schlüssel verwenden' }).click();
await axeAbschnitt('Vorhanden-Formular');
await page.getByRole('button', { name: 'Schlüssel öffnen' }).click();
ok(await page.evaluate(() => document.activeElement?.id === 'fb-schl-datei'), 'ohne Datei: Fehler, Fokus am Dateifeld');
await page.setInputFiles('#fb-schl-datei', pfad);
await page.fill('#fb-schl-pw', 'falsches Passwort');
await page.getByRole('button', { name: 'Schlüssel öffnen' }).click();
await page.waitForSelector('#fb-schl-pw-f');
ok((await page.locator('#fb-schl-pw-f').innerText()).includes('Passwort passt nicht'), 'falsches Passwort: Text am Feld');
await axeAbschnitt('Vorhanden mit Fehlertext');
await page.fill('#fb-schl-pw', 'ein langes passwort 1');
await page.getByRole('button', { name: 'Schlüssel öffnen' }).click();
await page.waitForSelector('#fb-schl-pub');
ok(await page.inputValue('#fb-schl-pub') === pub, 'gleicher öffentlicher Schlüssel nach dem Öffnen der Datei');
// kaputte Datei
await page.getByRole('button', { name: 'Vorhandenen Schlüssel verwenden' }).click();
const kaputt = join(dir, 'kaputt.statable-schluessel'); (await import('node:fs')).writeFileSync(kaputt, 'hallo');
await page.setInputFiles('#fb-schl-datei', kaputt); await page.fill('#fb-schl-pw', 'x');
await page.getByRole('button', { name: 'Schlüssel öffnen' }).click();
await page.waitForSelector('#fb-schl-datei-f');
ok((await page.locator('#fb-schl-datei-f').innerText()).includes('keine gültige Schlüsseldatei'), 'kaputte Datei: klarer Text');

// ---- Plan-Datei enthält den öffentlichen Schlüssel, aber keinen privaten
const [pd] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als Datei speichern' }).click()]);
const pp = join(dir, pd.suggestedFilename()); await pd.saveAs(pp);
const text = readFileSync(pp, 'utf8');
ok(text.includes(pub) && !text.includes('AGE-SECRET-KEY'), 'Plan-Datei: öffentlicher Schlüssel ja, privater nein');
await b.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
