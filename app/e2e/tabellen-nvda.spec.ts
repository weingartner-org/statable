// Welle 3, Auftrag B: Struktur der Tabellen im Browser prüfen (ohne NVDA; die NVDA-Messung kommt später dazu, daher der Name).
// Lauf: cd app && npx playwright test --project=chromium e2e/tabellen-nvda.spec.ts --trace=off
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });
test.setTimeout(120_000);

async function beispiel(page: Page) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' });
  if (await ende.isVisible().catch(() => false)) await ende.click();
}

/** Prüft in der Seite: jede th hat scope oder id, jede Tabelle einen Namen, jedes `headers`-Wort verweist auf eine id derselben Tabelle. */
function strukturPruefen(page: Page, wurzel = 'main') {
  return page.evaluate((w) => {
    const probleme: string[] = [];
    let tabellen = 0;
    for (const t of Array.from(document.querySelectorAll(`${w} table`))) {
      tabellen++;
      const name = t.getAttribute('aria-label') || t.getAttribute('aria-labelledby') || t.querySelector('caption') || t.getAttribute('role') === 'presentation';
      if (!name && !t.closest('[aria-hidden="true"]')) probleme.push(`Tabelle ohne Namen: ${t.className || '(ohne Klasse)'}`);
      for (const th of Array.from(t.querySelectorAll('th'))) if (!th.hasAttribute('scope') && !th.id) probleme.push(`th ohne scope/id: ${th.textContent?.slice(0, 30)}`);
      for (const z of Array.from(t.querySelectorAll('[headers]'))) {
        for (const id of (z.getAttribute('headers') ?? '').split(/\s+/).filter(Boolean)) {
          const ziel = document.getElementById(id);
          if (!ziel || !t.contains(ziel)) probleme.push(`headers verweist ins Leere: ${id}`);
        }
      }
    }
    return { tabellen, probleme };
  }, wurzel);
}

test('Datentabelle: Struktur und Lesemodus', async ({ page }) => {
  await beispiel(page);
  const region = page.locator('#daten-region');
  await expect(region).toBeVisible();
  // Normale (virtuelle) Tabelle: Spaltenköpfe mit scope=col, Zeilenköpfe scope=row, Zeilen- und Spaltenzahl angegeben.
  const roh = await page.evaluate(() => {
    const t = document.querySelector('#daten-region table')!;
    return {
      spaltenKoepfe: t.querySelectorAll('thead th[scope="col"]').length,
      zeilenKoepfe: t.querySelectorAll('tbody th[scope="row"]').length,
      rowcount: Number(t.getAttribute('aria-rowcount')),
      rowindexErste: t.querySelector('tbody tr[aria-rowindex]')?.getAttribute('aria-rowindex'),
    };
  });
  expect(roh.spaltenKoepfe).toBeGreaterThan(1);
  expect(roh.zeilenKoepfe).toBeGreaterThan(0);
  expect(roh.rowcount).toBeGreaterThan(1);
  expect(roh.rowindexErste).toBe('2');
  const zeilen = roh.rowcount - 1;

  // Lesemodus an: echte Tabelle mit höchstens 50 Zeilen, Seitenangabe, Knöpfe.
  const schalter = page.getByRole('button', { name: 'Lesemodus' });
  await expect(schalter).toHaveAttribute('aria-pressed', 'false');
  await schalter.click();
  await expect(schalter).toHaveAttribute('aria-pressed', 'true');
  const tabelle = page.locator('table.lese-raster');
  await expect(tabelle).toBeVisible();
  const seiten = Math.max(1, Math.ceil(zeilen / 50));
  await expect(page.locator('.lese-seite')).toContainText(`Seite 1 von ${seiten}`);
  const rows = await tabelle.locator('tbody tr').count();
  expect(rows).toBe(Math.min(50, zeilen));
  expect(await tabelle.locator('tbody th[scope="row"]').count()).toBe(rows);
  expect(await tabelle.locator('thead th[scope="col"]').count()).toBeGreaterThan(1);
  expect((await strukturPruefen(page, '.lese')).probleme).toEqual([]);

  const leiste = page.getByRole('group', { name: 'Seiten der Datentabelle' });
  const weiter = leiste.getByRole('button', { name: 'Weiter' });
  const zurueck = leiste.getByRole('button', { name: 'Zurück' });
  await expect(zurueck).toHaveAttribute('aria-disabled', 'true');
  if (seiten > 1) {
    await weiter.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lese-seite')).toContainText(`Seite 2 von ${seiten}`);
    // höfliche Ansage mit Seite und Zeilen
    await expect(page.locator('#ansage-hoeflich')).toContainText(new RegExp(`Seite 2 von ${seiten}, Zeilen 51 bis`));
    // Fokus bleibt auf dem Knopf (nie auf body)
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Weiter');
    await expect(page.locator('table.lese-raster tbody th[scope="row"]').first()).toHaveText('51');
  } else {
    await expect(weiter).toHaveAttribute('aria-disabled', 'true');
  }
  // Gehe zu Zeile: Fokus auf die Zeilenüberschrift
  const ziel = Math.min(zeilen, 7);
  await page.getByLabel('Zeilennummer').fill(String(ziel));
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe(`dz-${ziel - 1}`);
  // ungültige Eingabe: Meldung, Fokus bleibt im Feld
  await page.getByLabel('Zeilennummer').fill('0');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('lese-ziel');

  // Lesemodus aus: wieder die virtuelle Tabelle
  await schalter.click();
  await expect(page.locator('#daten-region table')).toBeVisible();
});

test('Datentabelle beim Eingeben: Zellname und aria-invalid', async ({ page }) => {
  await beispiel(page);
  await page.getByRole('button', { name: 'Daten eingeben' }).click();
  const feld = page.locator('input.zelle-ein').first();
  await expect(feld).toBeVisible();
  expect(await feld.getAttribute('aria-label')).toMatch(/, Zeile 1$/);
  // Text in eine Zahlenspalte: abgelehnt, mit Grund
  const zahlFeld = page.locator('td.zahl input.zelle-ein').first();
  await zahlFeld.fill('abc');
  await zahlFeld.press('Tab');
  await expect(page.locator('input.zelle-ein[aria-invalid="true"]')).toHaveCount(1);
  const grund = await page.evaluate(() => { const e = document.querySelector('input.zelle-ein[aria-invalid="true"]')!; return document.getElementById(e.getAttribute('aria-describedby') ?? '')?.textContent ?? ''; });
  expect(grund.length).toBeGreaterThan(3);
});

test('Auswertung und Hilfe: Tabellen haben Köpfe und Namen', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#blatt/neu');
  await page.getByText('Wie verteilt sich etwas?').first().click();
  await page.getByRole('button', { name: /alle wählen/ }).first().click();
  await page.getByRole('button', { name: /^Fertig/ }).first().click();
  await expect(page.locator('main table').first()).toBeVisible({ timeout: 60_000 });
  const e = await strukturPruefen(page, 'main');
  expect(e.tabellen).toBeGreaterThan(0);
  // Struktur-Fehler der Ergebnistabellen (Auftrag A) werden hier nur ausgegeben, nicht streng geprüft.
  console.log(`Auswertung: ${e.tabellen} Tabellen, Befunde: ${JSON.stringify(e.probleme.slice(0, 5))}`);
  await page.goto('./#hilfe/ueber-statable');
  const h = await strukturPruefen(page, 'main');
  console.log(`Hilfe: ${h.tabellen} Tabellen, Befunde: ${JSON.stringify(h.probleme.slice(0, 5))}`);
  expect(h.probleme).toEqual([]);
});
