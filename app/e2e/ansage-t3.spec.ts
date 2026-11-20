// NVDA-Rest B Teil 3 (07.11.2026): Hilfe-Ansage, Üben-Hinweis vor den Antworten, Kartensuche mit einer Ansage, Assistenten-Vorschau hörbar.
// Lauf: npx vite preview --outDir dist-t3 --port 4207, dann npx playwright test -c playwright.t3.config.ts
import { test, expect, type Page } from '@playwright/test';
test.use({ locale: 'de-DE' });

async function mitschneiden(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ans: string[] }; w.__ans = [];
    for (const id of ['ansage-hoeflich', 'ansage-dringend']) {
      const r = document.getElementById(id)!;
      new MutationObserver(() => { const t = r.textContent?.trim(); if (t && w.__ans[w.__ans.length - 1] !== t) w.__ans.push(t); }).observe(r, { subtree: true, childList: true, characterData: true });
    }
  });
}
const ansagen = (page: Page) => page.evaluate(() => (window as unknown as { __ans: string[] }).__ans);

async function beispielOeffnen(page: Page) {
  await page.goto('./#beispiele');
  const k = page.locator('*:has-text("Hilft das Lesetraining")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await k.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 60_000 });
  const e = page.getByRole('button', { name: 'Rundgang beenden' }); if (await e.isVisible().catch(() => false)) await e.click();
}

test('1 Hilfe: Enter auf einem Treffer sagt „Artikel geöffnet“', async ({ page }) => {
  await page.goto('./#hilfe');
  const feld = page.locator('#inhalt input[type=search]').first();
  await expect(feld).toBeVisible({ timeout: 15_000 });
  await feld.focus(); await page.waitForTimeout(500);
  await mitschneiden(page);
  await feld.pressSequentially('Mittelwert', { delay: 80 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const a = await ansagen(page);
  expect(a.filter(t => t.startsWith('Artikel geöffnet: ')), JSON.stringify(a)).toHaveLength(1);
});

test('2 Üben: Hinweis steht im DOM vor den Antworten und sichtbar darunter', async ({ page }) => {
  await page.goto('./#verstehen/ueben/faktor');
  await expect(page.locator('#ue-stamm')).toBeVisible({ timeout: 30_000 });
  const r = await page.evaluate(() => {
    const tipp = document.querySelector('.ue-tipp')!, liste = document.querySelector('.ue-antworten, .ue-aussagen')!;
    return { vorher: !!(tipp.compareDocumentPosition(liste) & Node.DOCUMENT_POSITION_FOLLOWING), ty: tipp.getBoundingClientRect().top, ly: liste.getBoundingClientRect().top };
  });
  expect(r.vorher).toBe(true);
  expect(r.ty).toBeGreaterThan(r.ly);
});

test('3 Blatt-Kartensuche: Tippen mit 350 ms zwischen den Buchstaben gibt genau eine Ansage', async ({ page }) => {
  await beispielOeffnen(page);
  await page.goto('./#blatt/neu');
  const f = page.locator('#karten-suche');
  await expect(f).toBeVisible({ timeout: 30_000 });
  await f.focus(); await page.waitForTimeout(1500);
  await mitschneiden(page);
  await f.pressSequentially('Median', { delay: 350 });
  await page.waitForTimeout(3000);
  const a = (await ansagen(page)).filter(t => /gefunden/.test(t));
  expect(a, JSON.stringify(a)).toHaveLength(1);
});

test('4 Assistent Spalten berechnen: Vorschau wird einmal angesagt', async ({ page }) => {
  await beispielOeffnen(page);
  await page.goto('./#bearbeiten/berechnen');
  await expect(page.locator('#be-formel')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await mitschneiden(page);
  await page.locator('#be-formel').pressSequentially('lesen_vor * 2', { delay: 120 });
  await page.waitForTimeout(3500);
  const a = await ansagen(page);
  expect(a.length, JSON.stringify(a)).toBe(1);
  expect(a[0]).toMatch(/Ergebnisse haben einen Wert|Vorschau/);
});
