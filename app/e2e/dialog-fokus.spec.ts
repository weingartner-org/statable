// Welle 1, Auftrag 1: Jeder Dialog gibt den Fokus beim Schließen (Esc) an den Auslöser zurück; fehlt er, ans feste Ersatzziel (nie body).
// Lauf: cd app && npx playwright test --project=chromium e2e/dialog-fokus.spec.ts --trace=off
import { test, expect, type Page, type JSHandle, type Locator } from '@playwright/test';
import ExcelJS from 'exceljs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.use({ locale: 'de-DE' });
test.setTimeout(90_000);

/** Beispiel öffnen (Daten-Seite). `rundgang`: den Rundgang stehen lassen (sonst beenden). */
async function beispiel(page: Page, rundgang = false) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  await expect(page.locator('.rundgang-blase')).toBeVisible({ timeout: 10_000 });
  if (!rundgang) { await page.getByRole('button', { name: 'Rundgang beenden' }).click(); await expect(page.locator('.rundgang-blase')).toBeHidden(); }
}
/** Legt den Fokus mit der Tastatur auf den Auslöser, löst mit Eingabetaste aus und merkt sich das Element. */
async function ausloesen(page: Page, knopf: Locator): Promise<JSHandle> {
  await knopf.focus();
  const h = await page.evaluateHandle(() => document.activeElement);
  await page.keyboard.press('Enter');
  return h;
}
const offenerDialog = (page: Page) => page.locator('dialog[open]');
async function escUndPruefe(page: Page, ausloeser: JSHandle) {
  await expect(offenerDialog(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(offenerDialog(page)).toHaveCount(0);
  await page.waitForFunction(a => document.activeElement === a, ausloeser, { timeout: 3000 });
}
/** Ohne Auslöser (Dialog öffnet von selbst): der Fokus liegt nach Esc im Hauptbereich, nie auf body. */
async function escUndPruefeErsatz(page: Page) {
  await expect(offenerDialog(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(offenerDialog(page)).toHaveCount(0);
  await page.waitForFunction(() => !!document.activeElement && document.activeElement !== document.body && !!document.activeElement.closest('main#inhalt'), undefined, { timeout: 3000 });
}
async function blattAnlegen(page: Page) {
  await page.goto('./#blatt/neu');
  await page.getByText('Wie verteilt sich etwas?').first().click();
  await page.getByRole('button', { name: /alle wählen/ }).first().click();
  await page.getByRole('button', { name: /^Fertig/ }).first().click();
}

test('Melden', async ({ page }) => {
  await page.goto('./');
  const h = await ausloesen(page, page.getByRole('button', { name: /^Melden$/ }).first());
  await expect(offenerDialog(page)).toHaveCount(1, { timeout: 15_000 });
  await escUndPruefe(page, h);
});

test('Datei mit mehreren Blättern (BlattWahl)', async ({ page }) => {
  const wb = new ExcelJS.Workbook(); wb.addWorksheet('Eins').addRows([['a', 'b'], [1, 2]]); wb.addWorksheet('Zwei').addRows([['c', 'd'], [3, 4]]);
  const datei = path.join(mkdtempSync(path.join(tmpdir(), 'statable-xlsx-')), 'zwei-blaetter.xlsx');
  await wb.xlsx.writeFile(datei);
  await page.goto('./');
  // Auslöser ist das (versteckte, aber per Tab erreichbare) Dateifeld im Knopf „Datei auswählen“.
  const feld = page.locator('label', { hasText: /Datei auswählen/ }).locator('input[type=file]');
  await feld.focus();
  const h = await page.evaluateHandle(() => document.activeElement);
  await feld.setInputFiles(datei);
  await expect(offenerDialog(page)).toHaveCount(1, { timeout: 20_000 });
  // Beim Laden wird die Startseite ersetzt (Dateifeld weg, „Der Statistik-Motor startet“): der alte Auslöser ist weg, der Fokus geht ans Ersatzziel (Hauptbereich), nicht auf body.
  // Ohne Bedienung seit dem Laden verwirft Chromium das erste Esc (kein Abbrechen-Ereignis): bei Bedarf ein zweites.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  if (await offenerDialog(page).count()) await page.keyboard.press('Escape');
  await expect(offenerDialog(page)).toHaveCount(0);
  await page.waitForFunction(() => !!document.activeElement && document.activeElement !== document.body && !!document.activeElement.closest('main#inhalt'), undefined, { timeout: 3000 });
  void h;
});

test('Rückfrage beim Entfernen eines Projekts (Ersetzen)', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#start');
  const menue = page.locator('button[id^="pl-m-"]').first();
  await menue.click();
  const h = await page.evaluateHandle(() => document.activeElement);   // Menüknopf (Mausklick fokussiert ihn unter Chromium)
  await page.getByRole('button', { name: /Aus dem Browser entfernen/ }).first().focus();
  await page.keyboard.press('Enter');
  await expect(offenerDialog(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(offenerDialog(page)).toHaveCount(0);
  // Der Menüknopf, an dem die Frage begann, hat den Fokus wieder (nicht body, nicht der Hauptbereich).
  await page.waitForFunction(a => document.activeElement === a, h, { timeout: 3000 });
});

test('Projekt per Link öffnen (LinkOeffnen)', async ({ page }) => {
  await page.goto('./?projekt=https://fremd.example/p.json');
  await expect(offenerDialog(page)).toHaveCount(1, { timeout: 15_000 });
  await escUndPruefeErsatz(page);
});

test('Reiter schließen (ReiterSchliessen)', async ({ page }) => {
  await beispiel(page);
  await blattAnlegen(page);
  const zu = page.locator('.reiter-zu').first();
  await expect(zu).toBeVisible({ timeout: 30_000 });
  const h = await ausloesen(page, zu);
  await escUndPruefe(page, h);
});

test('Fallgewicht', async ({ page }) => {
  await beispiel(page);
  const h = await ausloesen(page, page.locator('button[aria-label="Fallgewicht"]').first());
  await escUndPruefe(page, h);
});

test('Diagramm aus den Daten (DatenDiagramm)', async ({ page }) => {
  await beispiel(page);
  const h = await ausloesen(page, page.getByRole('button', { name: /^Diagramm/ }).first());
  await escUndPruefe(page, h);
});

test('Lernstand zurücksetzen (Lernen)', async ({ page }) => {
  await page.goto('./#lernen');
  const h = await ausloesen(page, page.getByRole('button', { name: /Stand zurücksetzen/ }).first());
  await escUndPruefe(page, h);
});

test('Rand als Fenster (schmal, Rand.svelte)', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await beispiel(page);
  await blattAnlegen(page);
  const marke = page.locator('.marke-k').first();
  await expect(marke).toBeVisible({ timeout: 30_000 });
  const h = await ausloesen(page, marke);
  await escUndPruefe(page, h);
});

test('Fachwort-Erklärung als Fenster (schmal, BegriffsDialog)', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto('./#beispiele');
  const wort = page.locator('button.begriff-link').first();
  await expect(wort).toBeAttached({ timeout: 20_000 });
  await wort.scrollIntoViewIfNeeded();
  const h = await ausloesen(page, wort);
  await expect(offenerDialog(page)).toHaveCount(1, { timeout: 10_000 });
  await page.keyboard.press('Escape');
  await expect(offenerDialog(page)).toHaveCount(0);
  await page.waitForFunction(a => document.activeElement === a, h, { timeout: 3000 });
});

test('Rundgang: Esc beendet, Fokus am Ersatzziel (Überschrift der Daten)', async ({ page }) => {
  await beispiel(page, true);
  await page.waitForFunction(() => !!document.activeElement?.closest('.rundgang-blase'), undefined, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.rundgang-blase')).toBeHidden();
  await page.waitForFunction(() => document.activeElement?.id === 'daten-t', undefined, { timeout: 3000 });
});
