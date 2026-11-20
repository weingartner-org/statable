// Welle 6, Auftrag B: Hilfe per Tastatur: Suche, Treffer, Artikel, Rückweg zur Trefferliste mit Fokus, eindeutige ids, nie Fokus auf body.
// Lauf: cd app && npx playwright test --project=chromium e2e/hilfe.spec.ts --trace=off
// (Port 4173 über die Standardkonfiguration; bei parallelem Lauf eigene Fassung und eigener Port, siehe Bericht.)
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
test.setTimeout(60_000);

const imFokus = (page: Page) => page.evaluate(() => {
  const a = document.activeElement;
  return { tag: a?.tagName ?? '', id: (a as HTMLElement | null)?.id ?? '' };
});
const doppelteIds = (page: Page) => page.evaluate(() => {
  const z = new Map<string, number>();
  for (const e of document.querySelectorAll('[id]')) z.set(e.id, (z.get(e.id) ?? 0) + 1);
  return [...z].filter(([, n]) => n > 1).map(([id]) => id);
});

async function hilfe(page: Page) {
  await page.goto('./#hilfe');
  await expect(page.locator('#hi-suche')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('nav.inhalt button.b-kopf').first()).toBeVisible({ timeout: 20_000 });
}

test('Hilfe: Suchfeld und Listen haben eindeutige ids, die Combobox verweist auf die Trefferliste', async ({ page }) => {
  await hilfe(page);
  expect(await doppelteIds(page)).toEqual([]);
  const feld = page.locator('#hi-suche');
  await feld.fill('Mittelwert');
  await expect(page.locator('ul.treffer li[role=option]').first()).toBeVisible();
  expect(await doppelteIds(page)).toEqual([]);
  const ziel = await feld.getAttribute('aria-controls');
  expect(ziel).toBeTruthy();
  await expect(page.locator(`#${ziel}`)).toHaveAttribute('role', 'listbox');
  const aktiv = await feld.getAttribute('aria-activedescendant');
  expect(await page.locator(`#${aktiv}`).count()).toBe(1);
  // Ohne Treffer zeigt die Combobox auf nichts, was es nicht gibt.
  await feld.fill('qqqzzzxxx');
  await expect(page.locator('ul.treffer')).toHaveCount(0);
  const c = await feld.getAttribute('aria-controls');
  if (c) expect(await page.locator(`#${c}`).count()).toBe(1);
  expect(await doppelteIds(page)).toEqual([]);
});

test('Hilfe: Treffer wählen, Artikel öffnen (Fokus auf der Überschrift), zurück zur Trefferliste mit Fokus auf dem gewählten Treffer', async ({ page }) => {
  await hilfe(page);
  const feld = page.locator('#hi-suche');
  await feld.focus();
  await page.keyboard.type('Mittelwert');
  await expect(page.locator('ul.treffer li[role=option]').nth(2)).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const gewaehlt = await feld.getAttribute('aria-activedescendant');
  expect(gewaehlt).toBe('hs-2');
  const titel = (await page.locator(`#${gewaehlt}`).locator('.t-titel').innerText()).trim();
  await page.keyboard.press('Enter');
  await expect(page.locator('h2#hi-art')).toBeVisible();
  await expect.poll(async () => (await imFokus(page)).id, { timeout: 5000 }).toBe('hi-art');
  expect((await page.locator('h2#hi-art').innerText()).trim()).toBe(titel);
  // Überschriften des Artikels springen nicht (h1 Hilfe, h2 Artikel, danach höchstens h3)
  const ebenen = await page.evaluate(() => [...document.querySelectorAll('section.hilfe h1, section.hilfe h2, section.hilfe h3, section.hilfe h4')].map(h => Number(h.tagName[1])));
  for (let i = 1; i < ebenen.length; i++) expect(ebenen[i]! - ebenen[i - 1]!, `Sprung in den Überschriften: ${ebenen.join(',')}`).toBeLessThanOrEqual(1);
  // Rückweg
  const zurueck = page.getByRole('button', { name: /Trefferliste|Treffer/ });
  await expect(zurueck).toBeVisible();
  await zurueck.click();
  await expect(page.locator('ul.treffer li[role=option]').nth(2)).toBeVisible();
  await expect.poll(async () => (await imFokus(page)).id, { timeout: 5000 }).toBe('hi-suche');
  await expect(feld).toHaveValue('Mittelwert');
  await expect(feld).toHaveAttribute('aria-activedescendant', 'hs-2');
  expect(await doppelteIds(page)).toEqual([]);
});

test('Hilfe: Bereiche klappen per Tastatur auf, Begriffe A-Z mit Buchstaben-Knöpfen (Name, aria-current)', async ({ page }) => {
  await hilfe(page);
  const kopf = page.locator('nav.inhalt button.b-kopf').nth(2);
  await kopf.focus();
  const war = await kopf.getAttribute('aria-expanded');
  await page.keyboard.press('Enter');
  await expect(kopf).toHaveAttribute('aria-expanded', war === 'true' ? 'false' : 'true');
  // Begriffe öffnen
  const begriffe = page.locator('nav.inhalt button.b-kopf', { hasText: /Begriffe/ }).first();
  await begriffe.focus();
  if ((await begriffe.getAttribute('aria-expanded')) !== 'true') await page.keyboard.press('Enter');
  const knoepfe = page.locator('.b-anfaenge button');
  await expect(knoepfe.first()).toBeVisible();
  const n = await knoepfe.count();
  for (let i = 0; i < Math.min(n, 3); i++) {
    const k = knoepfe.nth(i);
    const name = await k.getAttribute('aria-label');
    expect(name, 'Buchstaben-Knopf braucht einen sprechenden Namen').toMatch(/Buchstabe|Zeichen|Griechisch/);
  }
  await expect(page.locator('.b-anfaenge button[aria-current]')).toHaveCount(1);
  expect(await page.locator('.b-anfaenge button[aria-pressed]').count()).toBe(0);
  const zweiter = knoepfe.nth(1);
  await zweiter.focus();
  await page.keyboard.press('Enter');
  await expect(zweiter).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.b-anfaenge button[aria-current]')).toHaveCount(1);
});

test('Hilfe: Fokus fällt nie auf body (Suche, Artikel, Verwandt, Zurück)', async ({ page }) => {
  await hilfe(page);
  const feld = page.locator('#hi-suche');
  await feld.fill('Korrelation');
  await expect(page.locator('ul.treffer li[role=option]').first()).toBeVisible();
  await feld.press('Enter');
  await expect(page.locator('h2#hi-art')).toBeVisible();
  await expect.poll(async () => (await imFokus(page)).tag, { timeout: 5000 }).not.toBe('BODY');
  const verw = page.locator('aside.verwandt a').first();
  if (await verw.count()) {
    await verw.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('h2#hi-art')).toBeVisible();
    await expect.poll(async () => (await imFokus(page)).id, { timeout: 5000 }).toBe('hi-art');
  }
  await page.goBack();
  await expect.poll(async () => (await imFokus(page)).tag, { timeout: 5000 }).not.toBe('BODY');
});
