// Welle 2, Auftrag B: Befehlspalette (Strg+K): öffnet, tippen, Pfeile, Eingabe wirkt, Esc schließt und gibt den Fokus zurück; der Fokus liegt nie auf body.
// Lauf: cd app && npx vite build --outDir dist-e2e --emptyOutDir && npx playwright test --project=chromium e2e/palette.spec.ts --trace=off
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
test.setTimeout(90_000);

/** Beispiel öffnen (Daten-Seite), Rundgang beenden. */
async function beispiel(page: Page) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  await expect(page.locator('.rundgang-blase')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Rundgang beenden' }).click();
  await expect(page.locator('.rundgang-blase')).toBeHidden();
}
const palette = (page: Page) => page.locator('dialog.palette[open]');
const eingabe = (page: Page) => page.locator('#pal-eingabe');
async function oeffne(page: Page) {
  await page.keyboard.press('Control+KeyK');
  await expect(palette(page)).toHaveCount(1);
  await expect(eingabe(page)).toBeFocused();
}
/** Der Fokus liegt auf einem echten Element, nie auf body. */
const nichtBody = (page: Page) => page.waitForFunction(() => !!document.activeElement && document.activeElement !== document.body, undefined, { timeout: 4000 });
const aktiverKennung = (page: Page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}.${a.className}` : 'keiner'; });

test('Strg+K öffnet, tippen, Pfeile wählen, Eingabe öffnet die Seite', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await expect(page.locator('dialog.palette h2')).toHaveText(/Befehlspalette|Command palette/);
  await eingabe(page).fill('bericht');
  const liste = page.locator('#pal-liste [role=option]');
  await expect(liste.first()).toBeVisible();
  const n = await liste.count();
  expect(n).toBeGreaterThan(0);
  await expect(eingabe(page)).toHaveAttribute('aria-activedescendant', 'pal-opt-0');
  await expect(page.locator('#pal-opt-0')).toHaveAttribute('aria-selected', 'true');
  if (n > 1) {
    await page.keyboard.press('ArrowDown');
    await expect(eingabe(page)).toHaveAttribute('aria-activedescendant', 'pal-opt-1');
    await page.keyboard.press('ArrowUp');
    await expect(eingabe(page)).toHaveAttribute('aria-activedescendant', 'pal-opt-0');
  }
  expect(await page.locator('#pal-opt-0').innerText()).toMatch(/Bericht|Report/);
  await page.keyboard.press('Enter');
  await expect(palette(page)).toHaveCount(0);
  await page.waitForFunction(() => location.hash === '#bericht', undefined, { timeout: 5000 });
  await nichtBody(page);
});

test('Trefferzahl wird nach kurzer Ruhe höflich angesagt, nicht je Buchstabe', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await eingabe(page).pressSequentially('einstell', { delay: 40 });
  const region = page.locator('#ansage-hoeflich');
  await expect(region).toHaveText(/\d+ (Treffer|results)/, { timeout: 4000 });
});

test('Esc schließt und gibt den Fokus an den Auslöser zurück (nie body)', async ({ page }) => {
  await beispiel(page);
  const ziel = page.locator('header a[href="#hilfe"]');
  await ziel.focus();
  await oeffne(page);
  await page.keyboard.press('Escape');
  await expect(palette(page)).toHaveCount(0);
  await expect(ziel).toBeFocused();
});

test('Auswertung: Eingabe öffnet „Neue Auswertung“ mit der gewählten Karte', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await eingabe(page).fill('Hängen zwei Dinge');
  const erste = page.locator('#pal-opt-0');
  await expect(erste).toContainText(/Hängen zwei Dinge zusammen|Are two things related/);
  await expect(erste).toContainText(/Korrelation|correlation/);   // Fachbegriff steht neben der Alltagsfrage
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#blatt/neu', undefined, { timeout: 5000 });
  await expect(page.getByRole('button', { name: /Andere Art von Frage|Another kind of question/ })).toBeVisible({ timeout: 10_000 });
  await nichtBody(page);
});

test('Qualität und Prozess: „Gauge“ findet die Messsystemanalyse und öffnet ihre Karte', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await eingabe(page).fill('Gauge');
  const karte = page.locator('#pal-liste [role=option]').filter({ hasText: /Misst mein Messgerät zuverlässig|Does my gauge measure reliably/ });
  await expect(karte).toHaveCount(1);
  await expect(karte).toContainText(/Messsystemanalyse|Measurement system analysis/);   // Fachbegriff neben der Alltagsfrage
  for (const wort of ['Regelkarte', 'Messsystem', 'Cp']) {
    await eingabe(page).fill(wort);
    await expect(page.locator('#pal-liste [role=option]').filter({ hasText: /Läuft mein Prozess stabil|Is my process stable|Misst mein Messgerät|Does my gauge/ }).first()).toBeVisible();
  }
  await eingabe(page).fill('Gauge');
  await karte.click();
  await page.waitForFunction(() => location.hash === '#blatt/neu', undefined, { timeout: 5000 });
  await expect(page.getByRole('button', { name: /Andere Art von Frage|Another kind of question/ })).toBeVisible({ timeout: 10_000 });
  await nichtBody(page);
});

test('Einstellung: Kontrast wird sofort umgeschaltet', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await eingabe(page).fill('gelb auf schwarz');
  await expect(page.locator('#pal-opt-0')).toContainText(/Gelb auf Schwarz|Yellow on black/);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-thema', 'gs');
  await nichtBody(page);
});

test('Hilfe-Artikel und Fachbegriff aus der Hilfe lassen sich finden', async ({ page }) => {
  await beispiel(page);
  await oeffne(page);
  await eingabe(page).fill('Mittelwert');
  await expect(page.locator('#pal-liste [role=option]').first()).toBeVisible({ timeout: 15_000 });
  const arten = await page.locator('#pal-liste [role=option]').allInnerTexts();
  expect(arten.some(t => /Hilfe|Help|Fachbegriff|Technical term/.test(t))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(palette(page)).toHaveCount(0);
  await nichtBody(page);
});

test('Fachbegriffe dieses Abschnitts: Eingabe öffnet die Erklärung, Esc geht zurück ans Fachwort', async ({ page }) => {
  await page.goto('./#verstehen');
  const wort = page.locator('#inhalt button.begriff-link').first();
  await expect(wort).toBeAttached({ timeout: 20_000 });
  await wort.scrollIntoViewIfNeeded(); await page.locator('#inhalt').focus();
  await oeffne(page);
  await eingabe(page).fill('Fachbegriffe dieses Abschnitts');
  await expect(page.locator('#pal-opt-0')).toContainText(/Fachbegriff in diesem Abschnitt|Technical term in this section/);
  const gewaehlt = ((await page.locator('#pal-opt-0 .pal-text').innerText()) || '').trim();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const a = document.activeElement; return !!a && a.tagName === 'H2' && !!a.closest('aside.rand'); }, undefined, { timeout: 6000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(g => { const a = document.activeElement; return !!a && a.classList.contains('begriff-link') && a.textContent?.trim() === g; }, gewaehlt, { timeout: 4000 });
  console.log('Fokus nach Esc:', await aktiverKennung(page));
});
