// Rest-Block B (07.11.2026): Behebung der NVDA-Befunde B7, B11 im Browser prüfen (ohne NVDA).
// Lauf: npx vite build --outDir dist-x --emptyOutDir; npx vite preview --outDir dist-x --port 4202 --strictPort;
//       npx playwright test -c playwright.rest-b.config.ts
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

test('B7b: Enter auf ungültiger Eingabe lässt den Fokus in der Zelle (Grund wird dort angesagt)', async ({ page }) => {
  await beispiel(page);
  await page.getByRole('button', { name: 'Daten eingeben' }).click();
  const zelle = page.locator('#z-0-4');
  await zelle.focus();
  await zelle.fill('abc');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('z-0-4');
  await expect(zelle).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#z-fehler')).not.toHaveText('');
});

test('B7a: Strg+K „Lesemodus“ findet die Datentabelle im Lesemodus und schaltet ihn ein', async ({ page }) => {
  await beispiel(page);
  await page.keyboard.press('Control+k');
  await page.locator('#pal-eingabe').fill('Lesemodus');
  const opt = page.locator('#pal-liste [role="option"]').first();
  await expect(opt).toContainText('Datentabelle in Seiten lesen');
  await expect(opt).toContainText('Lesemodus');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Lesemodus/ })).toHaveAttribute('aria-pressed', 'true');
});

test('B11: Bereich heißt nicht wie die fokussierte Überschrift (nichts doppelt gelesen)', async ({ page }) => {
  await beispiel(page);
  await page.goto('./#blatt/neu');
  await expect(page.locator('#f1-t')).toBeVisible();
  const r = await page.evaluate(() => {
    const aus: string[] = [];
    for (const h of Array.from(document.querySelectorAll<HTMLElement>('h2[tabindex="-1"]'))) {
      const sec = h.closest('section');
      if (!sec) continue;
      const lb = sec.getAttribute('aria-labelledby');
      if (lb === h.id) aus.push(h.id);
    }
    return { aus, regionen: Array.from(document.querySelectorAll('section.feld')).map((s) => s.getAttribute('aria-label')) };
  });
  expect(r.aus).toEqual([]);
  expect(r.regionen.every(Boolean)).toBe(true);
});

test('B8: Regler „Versuche“ in richtiger Einzahl, Reglername ohne Doppelpunkt', async ({ page }) => {
  await page.goto('./#verstehen/lernlabor/bayes');
  const n = page.locator('#ll-bv-n');
  await expect(n).toBeVisible({ timeout: 30_000 });
  await n.focus();
  await page.keyboard.press('Home');
  await expect(n).toHaveAttribute('aria-valuetext', '1 Versuch');
  await page.keyboard.press('ArrowRight');
  await expect(n).toHaveAttribute('aria-valuetext', '2 Versuche');
  expect(await page.getByRole('slider').count()).toBeGreaterThan(3);
  expect(await page.getByRole('slider', { name: /:\s*$/ }).count()).toBe(0);
});

test('B8: Baumrechner spricht P(B|A) mit Bedingung', async ({ page }) => {
  await page.goto('./#verstehen/lernlabor/baum');
  const lab = page.locator('label[for="ll-b-pb"]');
  await expect(lab).toBeVisible({ timeout: 30_000 });
  await expect(lab).toContainText('P(B | A)');
  await expect(lab.locator('.nur-vorleser')).toHaveText('P von B unter der Bedingung A');
  await expect(page.getByRole('textbox', { name: /^P von B unter der Bedingung A/ })).toBeVisible();
  const hidden = await lab.evaluate((e) => Array.from(e.querySelectorAll('[aria-hidden="true"]')).map((x) => x.textContent));
  expect(hidden.some((t) => /P\(B \| A\)/.test(t ?? ''))).toBe(true);
});

test('B9: Hilfe-Treffer heißen nach dem Titel, „Zurück zur Trefferliste“ steht vor dem Inhaltsverzeichnis', async ({ page }) => {
  await page.goto('./#hilfe');
  const suche = page.locator('#hi-suche');
  await expect(suche).toBeVisible({ timeout: 30_000 });
  await suche.fill('Mittelwert');
  await expect(page.locator('#hi-treffer [role="option"]').nth(2)).toBeVisible({ timeout: 30_000 });
  const opt = await page.locator('#hi-treffer [role="option"]').nth(2).evaluate((li) => ({
    labelledby: li.getAttribute('aria-labelledby'), describedby: li.getAttribute('aria-describedby'),
    titel: document.getElementById(li.getAttribute('aria-labelledby') ?? '')?.textContent ?? '',
  }));
  expect(opt.labelledby).toBeTruthy();
  expect(opt.describedby).toBeTruthy();
  expect(opt.titel.length).toBeGreaterThan(0);
  expect(opt.titel.length).toBeLessThan(120);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const zurueck = page.getByRole('button', { name: /Zurück zur Trefferliste/ });
  await expect(zurueck).toBeVisible();
  const davor = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /Zurück zur Trefferliste/.test(x.textContent ?? ''))!;
    const nav = document.querySelector('nav.inhalt')!;
    return !!(b.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(davor).toBe(true);
  expect(await page.evaluate(() => document.querySelector('article.artikel')?.getAttribute('aria-labelledby') ?? null)).toBeNull();
  await expect(zurueck).toHaveText(/Zurück zur Trefferliste für „Mittelwert“/);
  await zurueck.click();
  await expect(suche).toBeFocused();
});
