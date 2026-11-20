// F4 (07.11.2026): Syntax-Editor (Seite „Befehle“) nur mit der Tastatur: Strg+Eingabe, Fehler mit Zeile, Ansage, „Wo bin ich?“ (Alt+W) nennt die Zeile.
// Lauf wie ziehen-tastatur.spec.ts (Port 4205): npx playwright test -c playwright.f2.config.ts
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

async function beispiel(page: Page) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' });
  if (await ende.isVisible().catch(() => false)) await ende.click();
  await page.goto('./#befehle');
  await expect(page.locator('#syntax')).toBeVisible();
}
async function ansagenMitschneiden(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ans: string[] }; w.__ans = [];
    const lies = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const t = document.getElementById(id)?.textContent?.trim(); if (t && w.__ans[w.__ans.length - 1] !== t) w.__ans.push(t); } };
    new MutationObserver(lies).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}
const ansagen = (page: Page) => page.evaluate(() => (window as unknown as { __ans: string[] }).__ans.join(' | '));

test('Strg+Eingabe führt aus, Fokus geht auf die Ausgabe', async ({ page }) => {
  await beispiel(page);
  await page.locator('#syntax').fill('DESCRIPTIVES VARIABLES=lesen_vor.');
  await page.locator('#syntax').press('Control+Enter');
  await expect(page.locator('section.lauf').first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toMatch(/^lauf-/);
});

test('Fehler in Zeile 2: Zeile steht im Text, Fehler wird per Ansage gesagt', async ({ page }) => {
  await beispiel(page);
  await ansagenMitschneiden(page);
  await page.locator('#syntax').fill('DESCRIPTIVES VARIABLES=lesen_vor.\nFREQUENCIES VARIABLES=gibt_es_nicht.');
  await page.locator('#syntax').press('Control+Enter');
  await expect(page.getByRole('button', { name: /Zeile 2 im Befehl zeigen/ })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => ansagen(page)).toMatch(/(Fehler|Error).*(Zeile|line) 2/i);
});

test('Alt+W im Befehlsfeld nennt Zeile und Spalte', async ({ page }) => {
  await beispiel(page);
  await ansagenMitschneiden(page);
  await page.locator('#syntax').fill('DESCRIPTIVES VARIABLES=lesen_vor.\nFREQUENCIES VARIABLES=geschlecht.\nEXECUTE.');
  await page.locator('#syntax').focus();
  await page.keyboard.press('Control+End'); await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Alt+w');
  await expect.poll(() => ansagen(page)).toMatch(/(Zeile|line) 2 (von|of) 3/);
});
