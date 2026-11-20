// F6 (07.11.2026): Ergebnis-Ansagen mit Ruhe. Beim Tippen einer Zahl kommt genau EINE Ansage, nach der letzten Ziffer.
// Lauf: Vorschau auf Port 4206 (npx vite preview --outDir dist-f6 --port 4206), dann npx playwright test -c playwright.f6.config.ts
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

async function mitschneiden(page: Page) {
  // Nur die zwei festen Regionen beobachten (sonst läse der Mitschnitt alten Text, wenn sich irgendwo anders etwas ändert).
  await page.evaluate(() => {
    const w = window as unknown as { __ans: string[] }; w.__ans = [];
    for (const id of ['ansage-hoeflich', 'ansage-dringend']) {
      const r = document.getElementById(id)!;
      new MutationObserver(() => { const t = r.textContent?.trim(); if (t && w.__ans[w.__ans.length - 1] !== t) w.__ans.push(t); }).observe(r, { subtree: true, childList: true, characterData: true });
    }
  });
}
const ansagen = (page: Page) => page.evaluate(() => (window as unknown as { __ans: string[] }).__ans);

async function zahlTippen(page: Page, feld: string, ziffern: string) {
  await page.locator(feld).click();
  await page.locator(feld).press('Control+A');
  await page.locator(feld).pressSequentially(ziffern, { delay: 150 });
}

test('Verstehen > Kennzahlen: Wertefolge beim Tippen gibt genau eine Ansage nach dem letzten Wert', async ({ page }) => {
  await page.goto('./#verstehen/kennzahlen');
  await page.getByRole('radio', { name: /Einen Anteil/ }).check();
  await expect(page.locator('#vk-n')).toBeVisible();
  await page.locator('#vk-x').fill('12'); await page.locator('#vk-n').fill('40');
  await page.waitForTimeout(1500);
  await mitschneiden(page);
  await zahlTippen(page, '#vk-n', '4000');          // 4, 40, 400, 4000: vier Zwischenwerte
  await expect(page.locator('.vst-gross').first()).toContainText('%');
  await page.waitForTimeout(2500);
  const a = await ansagen(page);
  expect(a, `Ansagen: ${JSON.stringify(a)}`).toHaveLength(1);
  expect(a[0]).toMatch(/p̂ = 0,003/);                 // 12 von 4000 = 0,003
});

test('Pause zwischen zwei Eingaben: zwei Ansagen, je eine nach dem Ende', async ({ page }) => {
  await page.goto('./#verstehen/kennzahlen');
  await page.getByRole('radio', { name: /Einen Anteil/ }).check();
  await page.locator('#vk-x').fill('12'); await page.locator('#vk-n').fill('40');
  await page.waitForTimeout(1500);
  await mitschneiden(page);
  await zahlTippen(page, '#vk-n', '60');
  await page.waitForTimeout(1500);
  await zahlTippen(page, '#vk-n', '80');
  await page.waitForTimeout(2000);
  const a = await ansagen(page);
  expect(a, `Ansagen: ${JSON.stringify(a)}`).toHaveLength(2);
});

test('Nur Seite öffnen: keine Ergebnis-Ansage (kein Lärm beim Betreten)', async ({ page }) => {
  await page.goto('./');
  await mitschneiden(page);
  await page.goto('./#verstehen/kennzahlen');
  await page.waitForTimeout(2500);
  const a = (await ansagen(page)).filter(t => /p̂|n =|%/.test(t));
  expect(a).toEqual([]);
});
