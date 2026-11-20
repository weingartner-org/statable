// F2 (07.11.2026): Jede Stelle mit Ziehen und Ablegen (oder Ordnen) nur mit der Tastatur bedienen.
// Lauf: npx vite build --outDir dist-f2 --emptyOutDir; npx vite preview --outDir dist-f2 --port 4205 --strictPort;
//       npx playwright test -c playwright.f2.config.ts
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

async function beispiel(page: Page) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' });
  if (await ende.isVisible().catch(() => false)) await ende.click();
}
/** Sammelt alles, was in die beiden Ansage-Regionen geschrieben wird. */
async function ansagenMitschneiden(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ans: string[] }; w.__ans = [];
    const lies = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const t = document.getElementById(id)?.textContent?.trim(); if (t && w.__ans[w.__ans.length - 1] !== t) w.__ans.push(t); } };
    new MutationObserver(lies).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}
const ansagen = (page: Page) => page.evaluate(() => (window as unknown as { __ans: string[] }).__ans.join(' | '));
/** Der Fokus liegt auf einem bedienbaren Element innerhalb der Liste (nicht auf body). */
const fokusIn = (page: Page, sel: string) => page.evaluate((s) => { const a = document.activeElement; return !!a && a !== document.body && !!a.closest(s); }, sel);

test('Reihenfolge der Gruppen (Spalten-Seite): Knöpfe und Alt+Pfeil, Fokus bleibt, neue Position wird angesagt', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#spalten');
  const wahl = page.locator('#a-klasse');
  await wahl.focus(); await wahl.selectOption('ORDINAL');
  const kopf = page.locator('details.reihenfolge summary').first();
  await kopf.focus();
  if (await page.locator('details.reihenfolge').first().getAttribute('open') === null) await page.keyboard.press('Enter');
  const namen = () => page.locator('details.reihenfolge .ro-liste li .ro-text').evaluateAll(l => l.map(e => e.textContent!.replace(/[⠿]|·.*/g, '').trim()));
  const vorher = await namen();
  expect(vorher.length).toBeGreaterThan(2);
  await ansagenMitschneiden(page);
  // nur Tastatur: zum Knopf „nach unten“ des ersten Eintrags tabben
  const runter = page.locator('details.reihenfolge .ro-liste li').first().locator('button[data-r="runter"]');
  await runter.focus();
  await page.keyboard.press('Enter');
  expect((await namen())[1]).toBe(vorher[0]);
  expect(await fokusIn(page, '.ro-liste')).toBe(true);
  await expect.poll(() => ansagen(page)).toMatch(/Platz 2 von/);
  // Alt+Pfeil hoch auf dem Eintrag
  await page.keyboard.press('Alt+ArrowUp');
  expect(await namen()).toEqual(vorher);
  // bis zum Rand: Fokus darf nicht verloren gehen
  for (let k = 0; k < vorher.length + 1; k++) { await page.keyboard.press('Alt+ArrowDown'); }
  expect(await fokusIn(page, '.ro-liste')).toBe(true);
});

test('Tabelle zusammenstellen: Zeilen mit Knöpfen ordnen, Fokus bleibt, neue Position wird angesagt', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#tabelle');
  await page.locator('#tz-gruppe').selectOption('geschlecht');
  for (const n of ['lesen_vor', 'lesen_nach', 'lesen_nachtest']) await page.locator('.as-liste li', { hasText: n }).locator('input').first().focus().then(() => page.keyboard.press('Space'));
  const namen = () => page.locator('.tz-zeilen li .tz-name b').allTextContents();
  const vorher = await namen();
  expect(vorher.length).toBe(3);
  await ansagenMitschneiden(page);
  const runter = page.locator('.tz-zeilen li').first().locator('button[aria-label*="nach unten"]');
  await runter.focus(); await page.keyboard.press('Enter');
  expect((await namen())[1]).toBe(vorher[0]);
  expect(await fokusIn(page, '.tz-zeilen')).toBe(true);
  await expect.poll(() => ansagen(page)).toMatch(/Platz 2 von 3|position 2 of 3/);
  // Fokus liegt weiter auf einem „nach unten“-Knopf der verschobenen Zeile (Name im Knopf = verschobene Zeile)
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')).toContain(vorher[0]!.replace(/\s*\(.*$/, '').slice(0, 4));
});

test('Eigenen Lernpfad bauen: ↑ und ↓ bis zum Rand, Fokus bleibt in der Liste', async ({ page }) => {
  await page.goto('./#lernen/pfadbau');
  await page.locator('#pb-pfad').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Einheiten hinzufügen' }).focus(); await page.keyboard.press('Enter');
  const liste = page.locator('.pb-reihenfolge li');
  await expect(liste.nth(2)).toBeVisible();
  const n = await liste.count();
  await ansagenMitschneiden(page);
  const ersterName = (await liste.first().locator('strong').textContent())!.replace(/^\d+\.\s*/, '');
  await liste.first().locator('button[aria-label^="Nach unten"]').focus(); await page.keyboard.press('Enter');
  expect((await liste.nth(1).locator('strong').textContent())!).toContain(ersterName);
  await expect(page.locator('.pb-status')).toContainText(/Platz 2 von/); // eigene Statuszeile (aria-live polite)
  // Weiter nach unten bis zum letzten Platz (dort wird „nach unten“ deaktiviert): der Fokus muss im Pfad bleiben
  for (let k = 0; k < n - 2; k++) await page.keyboard.press('Enter');
  expect(await liste.last().locator('strong').textContent()).toContain(ersterName);
  expect(await fokusIn(page, '.pb-reihenfolge')).toBe(true);
  // und mit „nach oben“ ganz zurück an den ersten Platz
  for (let k = 0; k < n - 1; k++) await page.keyboard.press('Enter');
  expect(await liste.first().locator('strong').textContent()).toContain(ersterName);
  expect(await fokusIn(page, '.pb-reihenfolge')).toBe(true);
});

test('Datei öffnen (Ablegen-Fläche der Startseite): Datei-Auswahl ist mit der Tastatur erreichbar', async ({ page }) => {
  await page.goto('./');
  const feld = page.locator('input[type="file"]').filter({ has: page.locator('xpath=self::*') }).first();
  await feld.focus();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT');
  const [dlg] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.keyboard.press('Space')]);
  expect(dlg).toBeTruthy();
});

test('Datei öffnen (Befehle): Datei-Auswahl ist mit der Tastatur erreichbar', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#befehle');
  const feld = page.locator('label', { hasText: 'Datei öffnen' }).locator('input[type="file"]');
  await feld.focus();
  const [dlg] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.keyboard.press('Space')]);
  expect(dlg).toBeTruthy();
});
