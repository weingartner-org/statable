// Welle 1, Auftrag 1: Fachwörter (button.begriff-link): Eingabe öffnet die Erklärung und setzt den Fokus auf deren Überschrift;
// Esc oder Alt+Z schließen sie (im Begriffsstapel eine Ebene zurück) und setzen den Fokus auf genau das Fachwort im Text.
// Lauf: cd app && npx playwright test --project=chromium e2e/fachwort-fokus.spec.ts --trace=off
import { test, expect, type Page, type Locator } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
test.setTimeout(60_000);

/** Seite mit Seitenleiste und vielen Fachwörtern im Text (Rechner und Regler). */
async function seite(page: Page): Promise<Locator> {
  await page.goto('./#verstehen');
  const wort = page.locator('#inhalt button.begriff-link').first();
  await expect(wort).toBeAttached({ timeout: 20_000 });
  return wort;
}
const aufUeberschriftInRand = (page: Page) => page.waitForFunction(() => {
  const a = document.activeElement;
  return !!a && a.tagName === 'H2' && a.getAttribute('tabindex') === '-1' && !!a.closest('aside.rand');
}, undefined, { timeout: 5000 });
const aufElement = (page: Page, h: unknown) => page.waitForFunction(a => document.activeElement === a, h, { timeout: 3000 });
const merke = async (page: Page, wort: Locator) => { await wort.scrollIntoViewIfNeeded(); await wort.focus(); return page.evaluateHandle(() => document.activeElement); };

test('Fachwort: Eingabe, Fokus auf der Überschrift der Erklärung; Esc zurück ans Fachwort', async ({ page }) => {
  const wort = await seite(page);
  const h = await merke(page, wort);
  await page.keyboard.press('Enter');
  await aufUeberschriftInRand(page);
  await page.keyboard.press('Escape');
  await aufElement(page, h);
  await expect(page.locator('aside.rand [data-begriff-ueberschrift]')).toHaveCount(0);
});

test('Fachwort: Alt+Z schließt die Erklärung und geht zurück ans Fachwort', async ({ page }) => {
  const wort = await seite(page);
  const h = await merke(page, wort);
  await page.keyboard.press('Enter');
  await aufUeberschriftInRand(page);
  await page.keyboard.press('Alt+KeyZ');
  await aufElement(page, h);
  await expect(page.locator('aside.rand [data-begriff-ueberschrift]')).toHaveCount(0);
});

test('Fachwort: Alt+Z auf deutscher Tastatur (key z, code KeyY) geht zurück ans Fachwort', async ({ page }) => {
  const wort = await seite(page);
  const h = await merke(page, wort);
  await page.keyboard.press('Enter');
  await aufUeberschriftInRand(page);
  await page.evaluate(() => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyY', altKey: true, bubbles: true, cancelable: true })));
  await aufElement(page, h);
  await expect(page.locator('aside.rand [data-begriff-ueberschrift]')).toHaveCount(0);
});

test('Fachwort im Fachwort: Esc geht eine Ebene zurück, dann ans Fachwort im Text', async ({ page }) => {
  await seite(page);
  // Ein Fachwort suchen, dessen Erklärung selbst Fachwörter enthält.
  const woerter = page.locator('#inhalt button.begriff-link');
  let h: Awaited<ReturnType<typeof merke>> | null = null;
  for (let i = 0; i < 12 && !h; i++) {
    const w = woerter.nth(i);
    const kandidat = await merke(page, w);
    await page.keyboard.press('Enter');
    await aufUeberschriftInRand(page);
    await page.waitForTimeout(600);   // der Verlinker macht Fachwörter im neuen Text erst nach einem Takt zu Knöpfen
    if (await page.locator('aside.rand button.begriff-link').count()) h = kandidat;
    else { await page.keyboard.press('Escape'); await aufElement(page, kandidat); }
  }
  expect(h, 'ein Fachwort mit Fachwort in der Erklärung').not.toBeNull();
  const tief = page.locator('aside.rand button.begriff-link').first();
  const titel1 = await page.locator('aside.rand [data-begriff-ueberschrift]').innerText();
  await tief.scrollIntoViewIfNeeded(); await tief.focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => page.locator('aside.rand [data-begriff-ueberschrift]').innerText()).not.toBe(titel1);
  await aufUeberschriftInRand(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => page.locator('aside.rand [data-begriff-ueberschrift]').innerText()).toBe(titel1);
  await aufUeberschriftInRand(page);
  await page.keyboard.press('Escape');
  await aufElement(page, h);
});

test('Fachwort-Knöpfe: nicht in der Tab-Reihenfolge, mit einem gemeinsamen versteckten Hinweis', async ({ page }) => {
  const wort = await seite(page);
  await expect(wort).toHaveAttribute('tabindex', '-1');
  const id = await wort.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  await expect(page.locator(`#${id}`)).toHaveCount(1);
  await expect(page.locator(`#${id}`)).toHaveText(/Fachbegriff, Eingabe zeigt die Erklärung/);
  // alle Fachwörter zeigen auf denselben Text, und keines ist per Tab erreichbar
  const fremd = await page.evaluate(() => [...document.querySelectorAll('button.begriff-link')].filter(b => b.getAttribute('aria-describedby') !== 'begriff-hinweis' || b.getAttribute('tabindex') !== '-1').length);
  expect(fremd).toBe(0);
});

test('Alt+Z im Eingabefeld lässt die Erklärung stehen', async ({ page }) => {
  const wort = await seite(page);
  await wort.scrollIntoViewIfNeeded(); await wort.click();
  await aufUeberschriftInRand(page);
  const feld = page.locator('#inhalt input, #inhalt select').first();
  await expect(feld).toBeAttached();
  await feld.focus();
  await page.keyboard.press('Alt+KeyZ');
  await expect(page.locator('aside.rand [data-begriff-ueberschrift]')).toHaveCount(1);
});
