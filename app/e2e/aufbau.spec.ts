// Rauchtest für die Messkette: Seite lädt, axe läuft. Die Gegenprobe (GEGENPROBE=1) muss rot werden.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Startseite lädt und hat eine Hauptüberschrift', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.title()).not.toBe('');
});

test('axe läuft auf der Startseite', async ({ page }) => {
  await page.goto('./');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(Array.isArray(r.violations)).toBe(true);
});

test('Kontrastmodus lässt sich emulieren', async ({ browser }) => {
  const c = await browser.newContext({ forcedColors: 'active', colorScheme: 'dark' });
  const p = await c.newPage();
  await p.goto('./');
  expect(await p.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
  await c.close();
});

test('Gegenprobe: absichtlich falsch (nur mit GEGENPROBE=1)', async ({ page }) => {
  test.skip(!process.env.GEGENPROBE, 'nur für die Gegenprobe');
  await page.goto('./');
  await expect(page.locator('#gibt-es-nicht')).toBeVisible({ timeout: 2000 });
});
