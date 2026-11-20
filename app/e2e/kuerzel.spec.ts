// Welle 2, Auftrag A: jedes Kürzel einmal im Browser, Wirkung prüfen (Adresse, Fenster, Fokus, Ansage).
// Alt+Z auch so, wie die deutsche Tastatur es meldet (key "z", code "KeyY"); die Y-Taste (key "y", code "KeyZ") tut nichts.
// Lauf: cd app && npx vite build --outDir dist-e2e --emptyOutDir && npx playwright test --project=chromium e2e/kuerzel.spec.ts --trace=off
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
test.setTimeout(90_000);

/** Beispiel öffnen (Daten-Seite) und den Rundgang beenden (er ist ein modales Fenster und sperrt die Kürzel). */
async function beispiel(page: Page) {
  await page.goto('./#beispiele');
  await page.getByRole('button', { name: /Öffnen und üben|Open and practice/ }).first().click({ timeout: 20_000 });
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30_000 });
  await expect(page.locator('.rundgang-blase')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Rundgang beenden' }).click();
  await expect(page.locator('.rundgang-blase')).toBeHidden();
  await expect(page.locator('nav.reiter')).toBeVisible();
}
const hash = (page: Page) => page.evaluate(() => location.hash);
const aufH1 = (page: Page) => page.waitForFunction(() => document.activeElement?.tagName === 'H1' && !!document.activeElement.closest('#inhalt'), undefined, { timeout: 5000 });
/** Legt den Fokus auf ein Element im Kopf (nicht in ein Eingabefeld). */
const fokusAufMarke = (page: Page) => page.locator('a.marke').focus();

test('Reiter: Alt+Ziffer, Alt+Bild ab/auf, Alt+N, Alt+B; Fokus kommt auf die Überschrift', async ({ page }) => {
  await beispiel(page);
  await fokusAufMarke(page);
  // Reihenfolge ohne Auswertungen: 1 Daten, 2 Neue Auswertung, 3 Bericht, 4 Befehle, 5 Protokoll
  await page.keyboard.press('Alt+Digit3');
  await expect.poll(() => hash(page)).toBe('#bericht'); await aufH1(page);
  await page.keyboard.press('Alt+Digit4');
  await expect.poll(() => hash(page)).toBe('#befehle'); await aufH1(page);
  await page.keyboard.press('Alt+Digit1');
  await expect.poll(() => hash(page)).toBe('#daten'); await aufH1(page);
  await page.keyboard.press('Alt+PageDown');
  await expect.poll(() => hash(page)).toBe('#blatt/neu'); await aufH1(page);
  await page.keyboard.press('Alt+PageUp');
  await expect.poll(() => hash(page)).toBe('#daten'); await aufH1(page);
  await page.keyboard.press('Alt+PageUp');   // vom ersten Reiter zum letzten
  await expect.poll(() => hash(page)).toBe('#protokoll'); await aufH1(page);
  await page.keyboard.press('Alt+KeyB');
  await expect.poll(() => hash(page)).toBe('#bericht'); await aufH1(page);
  await page.keyboard.press('Alt+KeyN');
  await expect.poll(() => hash(page)).toBe('#blatt/neu'); await aufH1(page);
  await page.keyboard.press('Alt+Digit9');   // gibt es nicht: Ansage, keine Bewegung
  await expect(page.locator('#ansage-hoeflich')).toContainText('Es gibt nur 5 Reiter');
  expect(await hash(page)).toBe('#blatt/neu');
  // aria-keyshortcuts an den Reitern
  await expect(page.locator('nav.reiter a[href="#daten"]')).toHaveAttribute('aria-keyshortcuts', 'Alt+1');
  await expect(page.locator('nav.reiter a[href="#bericht"]')).toHaveAttribute('aria-keyshortcuts', 'Alt+3 Alt+B');
});

test('Alt+H, Alt+L, Alt+O öffnen und schließen (zurück zur Arbeitsseite); Alt+K öffnet die Farbwahl', async ({ page }) => {
  await beispiel(page);
  await fokusAufMarke(page);
  for (const [taste, seite] of [['Alt+KeyH', '#hilfe'], ['Alt+KeyL', '#lernen'], ['Alt+KeyO', '#einstellungen']] as const) {
    await page.keyboard.press(taste);
    await expect.poll(() => hash(page), taste).toBe(seite);
    await page.locator('a.marke').focus();   // der Fokus kann auf der Seite gelandet sein, die Kürzel gelten überall außer im Eingabefeld
    await page.keyboard.press(taste);
    await expect.poll(() => hash(page), taste + ' zurück').toBe('#daten');
  }
  await page.locator('a.marke').focus();
  await page.keyboard.press('Alt+KeyK');
  await expect(page.locator('#farbwahl-feld')).toBeVisible();
  await expect(page.locator('.ansicht-menue > button')).toHaveAttribute('aria-keyshortcuts', 'Alt+K');
  await page.keyboard.press('Escape');
  await expect(page.locator('#farbwahl-feld')).toHaveCount(0);
});

test('Alt+T: Kürzel-Dialog, durchsuchbar; Esc schließt, Fokus kehrt zurück', async ({ page }) => {
  await beispiel(page);
  const auslöser = page.locator('nav.reiter a[href="#daten"]');
  await auslöser.focus();
  await page.keyboard.press('Alt+KeyT');
  const dlg = page.locator('dialog.kuerzel[open]');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('h2')).toHaveText('Tastenkürzel');
  await expect(page.locator('#kl-suche')).toBeFocused();
  const alle = await dlg.locator('tbody tr').count();
  expect(alle).toBeGreaterThan(15);
  await page.keyboard.type('Reiter');
  const gefiltert = await dlg.locator('tbody tr').count();
  expect(gefiltert).toBeGreaterThan(2); expect(gefiltert).toBeLessThan(alle);
  await expect(page.locator('#ansage-hoeflich')).toContainText('gefunden');
  // Wächter: bei offenem Fenster und im Eingabefeld wirkt Alt+B nicht
  await page.keyboard.press('Alt+KeyB');
  expect(await hash(page)).toBe('#daten');
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await page.waitForFunction(() => document.activeElement?.getAttribute('href') === '#daten', undefined, { timeout: 3000 });
});

test('Alt+W sagt Reiter, Bereich und Element an; in Tabellen Zeile und Spalte mit Kopfzelle', async ({ page }) => {
  await beispiel(page);
  await page.locator('a.marke').focus();
  await page.keyboard.press('Alt+KeyW');
  await expect(page.locator('#ansage-hoeflich')).toContainText(/Reiter 1 von 5: Daten\. Bereich: Kopfbereich\. Link/);
  // In einer Tabelle (Datenansicht): die Zeilenkopfzelle ist fokussierbar (tabindex -1)
  const zelle = page.locator('#inhalt table tbody th[scope=row]').first();
  await zelle.scrollIntoViewIfNeeded(); await zelle.focus();
  await page.keyboard.press('Alt+KeyW');
  await expect(page.locator('#ansage-hoeflich')).toContainText(/Zeilenkopfzelle „1“\. Zeile 2, Spalte 1\./);
});

test('Alt+J springt der Reihe nach: Kopf, Reiter, Inhalt (und Seitenleiste), zurück zum Kopf', async ({ page }) => {
  await beispiel(page);
  const bereich = () => page.evaluate(() => {
    const a = document.activeElement; if (!a) return 'nichts';
    if (a.closest('aside.rand')) return 'rand'; if (a.closest('nav.reiter')) return 'reiter'; if (a.closest('header.kopf')) return 'kopf'; if (a.closest('#inhalt')) return 'inhalt'; return 'sonst';
  });
  await fokusAufMarke(page);
  expect(await bereich()).toBe('kopf');
  const folge: string[] = [];
  for (let n = 0; n < 5; n++) {
    const vor = await bereich();
    await page.keyboard.press('Alt+KeyJ');
    await expect.poll(bereich).not.toBe(vor);
    folge.push(await bereich());
    if (folge.at(-1) === 'kopf') break;
  }
  // Reiter, Inhalt, (Seitenleiste, wenn eine da ist), dann wieder der Kopf
  expect(folge.slice(0, 2)).toEqual(['reiter', 'inhalt']);
  expect(folge.at(-1)).toBe('kopf');
  expect(folge.length).toBeLessThanOrEqual(4);
});

test('Alt+Z: deutsche Tastatur (key z, code KeyY) geht zurück ans Fachwort; die Y-Taste (key y, code KeyZ) tut nichts', async ({ page }) => {
  await page.goto('./#verstehen');
  const wort = page.locator('#inhalt button.begriff-link').first();
  await expect(wort).toBeAttached({ timeout: 20_000 });
  await wort.scrollIntoViewIfNeeded(); await wort.focus();
  const h = await page.evaluateHandle(() => document.activeElement);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'H2' && !!document.activeElement.closest('aside.rand'), undefined, { timeout: 5000 });
  await page.evaluate(() => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', code: 'KeyZ', altKey: true, bubbles: true, cancelable: true })));
  await page.waitForTimeout(300);
  await expect(page.locator('aside.rand [data-begriff-ueberschrift]')).toHaveCount(1);   // nichts passiert
  await page.evaluate(() => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyY', altKey: true, bubbles: true, cancelable: true })));
  await page.waitForFunction(a => document.activeElement === a, h, { timeout: 3000 });
});

test('Strg+K öffnet die Befehlspalette (auch im Eingabefeld), Esc schließt, Fokus kehrt zurück', async ({ page }) => {
  await page.goto('./#hilfe');
  const feld = page.locator('#inhalt input[type=search]').first();
  await expect(feld).toBeVisible({ timeout: 15_000 });
  await feld.focus();
  await page.keyboard.press('Control+KeyK');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await expect(page.locator('dialog[open] [role=combobox]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(feld).toBeFocused();
  // zweiter Weg: aus dem Kopf
  await page.locator('a.marke').focus();
  await page.keyboard.press('Control+KeyK');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('a.marke')).toBeFocused();
});

test('Wächter: Alt-Kürzel gelten nicht im Eingabefeld', async ({ page }) => {
  await page.goto('./#hilfe');
  const feld = page.locator('#inhalt input[type=search]').first();
  await expect(feld).toBeVisible({ timeout: 15_000 });
  await feld.focus();
  await page.keyboard.press('Alt+KeyL');
  await page.waitForTimeout(300);
  expect(await hash(page)).toBe('#hilfe');
  await expect(feld).toBeFocused();
});

test('WCAG 2.1.4: Zifferntasten in der Übungsfrage gelten nur, wenn der Fokus in der Frage steht', async ({ page }) => {
  await page.goto('./#verstehen/ueben/faktor');
  await expect(page.locator('#ue-stamm')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.ue-tipp').first()).toContainText('Die Zifferntasten gelten nur, solange der Fokus in der Frage steht, und mit NVDA und anderen Screenreadern nur im Fokusmodus (NVDA+Leertaste).');
  const beantwortet = () => page.locator('.ue-rueck, .ue-aussage input:checked').count();
  // Fokus im Kopf, außerhalb der Frage: 1 tut nichts
  await page.locator('a.marke').focus();
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(300);
  expect(await beantwortet()).toBe(0);
  // Fokus in der Frage: 1 wählt
  await page.locator('#ue-stamm').focus();
  await page.keyboard.press('Digit1');
  await expect.poll(beantwortet).toBeGreaterThan(0);
});
