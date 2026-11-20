// Welle 6, Auftrag B: Fragen in „Lernen“ (Üben, Selbst rechnen), Fortschritt als Text, Regler im Lernlabor.
// Läuft nur gegen eine eigene Fassung (Konfiguration playwright.b.config.ts, Port 4193), nicht in `npm run e2e`.
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
test.setTimeout(60_000);

const aktiv = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return { tag: a?.tagName ?? '', id: a?.id ?? '', text: (a?.textContent ?? '').trim().slice(0, 80) };
});

test('Üben: nach der Antwort steht der Fokus auf der Rückmeldung, die Erklärung folgt direkt, „Nächste Frage“ fokussiert den Fragetext', async ({ page }) => {
  await page.goto('./#lernen/ausreisser/6');
  const antworten = page.locator('.ue-antwort');
  await expect(antworten.first()).toBeVisible({ timeout: 30_000 });
  await antworten.first().focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await aktiv(page)).id, { timeout: 5000 }).toBe('ue-rueck-t');
  expect((await aktiv(page)).text).toMatch(/^(Richtig|Falsch)\./);
  // die Erklärung ist das nächste Element im Lesefluss (nicht erst hinter „weiter“)
  const naechstes = await page.evaluate(() => { const e = document.getElementById('ue-rueck-t')!.nextElementSibling; return { tag: e?.tagName, text: (e?.textContent ?? '').trim().length }; });
  expect(naechstes.tag).toBe('P');
  expect(naechstes.text).toBeGreaterThan(20);
  // die Antwortliste trägt die Frage als Namen
  const name = await page.evaluate(() => { const u = document.querySelector('.ue-antworten'); const id = u?.getAttribute('aria-labelledby'); return { id, text: id ? document.getElementById(id)?.textContent?.trim() : u?.getAttribute('aria-label') }; });
  expect(name.id).toBe('ue-stamm');
  await page.getByRole('button', { name: /Nächste Frage|Zum Ergebnis/ }).click();
  await expect.poll(async () => (await aktiv(page)).id, { timeout: 5000 }).toBe('ue-stamm');
});

test('Selbst rechnen: Einheit im Namen, aria-invalid mit Grund bei Fehler, Ansage über die feste Region', async ({ page }) => {
  await page.goto('./#lernen/modell-und-fehler/2');
  const feld = page.locator('#ra-modell-fehler-f0');
  await expect(feld).toBeVisible({ timeout: 30_000 });
  const namen = () => page.evaluate(() => {
    const f = document.getElementById('ra-modell-fehler-f0')!;
    const ids = (f.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
    return ids.map(i => document.getElementById(i)?.textContent ?? '').join(' ');
  });
  expect(await namen()).toContain('Stunden');
  await feld.fill('abc');
  await page.keyboard.press('Enter');
  await expect(feld).toHaveAttribute('aria-invalid', 'true');
  const grund = await page.evaluate(() => { const f = document.getElementById('ra-modell-fehler-f0')!; return (f.getAttribute('aria-describedby') ?? '').split(/\s+/).map(i => document.getElementById(i)?.textContent ?? '').join(' ').trim(); });
  expect(grund.length).toBeGreaterThan(10);
  expect((await aktiv(page)).id).toBe('ra-modell-fehler-f0');
  await expect(page.locator('#ansage-hoeflich')).toContainText(/Schritt 1/);
  await feld.fill('99999');
  await page.keyboard.press('Enter');
  await expect(feld).toHaveAttribute('aria-invalid', 'true');
  // „x von n Schritten richtig“ steht im Lesefluss (nicht versteckt)
  expect(await page.locator('.ra .ln-stand').first().getAttribute('aria-hidden')).toBeNull();
});

test('Fortschritt: jede Einheit in der Liste trägt einen Text („Einheit n von m, Stand“), Ringe sprechen nicht doppelt', async ({ page }) => {
  await page.goto('./#lernen/pfad/' + (await (async () => { await page.goto('./#lernen'); await page.locator('.ln-zeilen').first().waitFor({ timeout: 30_000 }); return (await page.locator('.ln-wahl a').nth(1).getAttribute('href'))!.split('/').pop(); })()));
  const zeilen = page.locator('.ln-zeilen li a');
  await expect(zeilen.first()).toBeVisible({ timeout: 30_000 });
  const n = await zeilen.count();
  const erste = await zeilen.first().evaluate((a) => {
    const vorleser = [...a.querySelectorAll('.nur-vorleser')].map(e => e.textContent).join(' ');
    const ring = a.querySelector('svg.lr');
    return { vorleser, ringRolle: ring?.getAttribute('role') ?? null, ringVersteckt: ring?.getAttribute('aria-hidden') ?? null, ringName: ring?.getAttribute('aria-label') ?? null };
  });
  expect(erste.vorleser).toMatch(new RegExp(`Einheit 1 von ${n}`));
  expect(erste.vorleser).toMatch(/noch nicht begonnen|begonnen|durchgemacht/);
  // der Ring sagt nichts zusätzlich an
  expect(erste.ringRolle === 'img' && !!erste.ringName && erste.vorleser.includes(erste.ringName)).toBe(false);
  expect(erste.ringVersteckt === 'true' || erste.ringRolle !== 'img').toBe(true);
});

test('Lernlabor Bayes: Regler mit Wertetext in Worten, die Ergebnisfläche ist keine ständige Live-Region, Ansage nach dem Loslassen', async ({ page }) => {
  await page.goto('./#verstehen/lernlabor/bayes');
  const regler = page.locator('#ll-bv-n');
  await expect(regler).toBeVisible({ timeout: 30_000 });
  const wert = await regler.getAttribute('aria-valuetext');
  expect(wert).toMatch(/[A-Za-zÄÖÜäöü]/);   // nicht nur eine Zahl
  expect(wert).toMatch(/\d/);
  await expect(page.locator('.ll-ergebnis')).not.toHaveAttribute('aria-live', /./);
  await regler.focus();
  const vorher = await page.locator('#ansage-hoeflich').textContent();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  // sofort noch nichts (entprellt) ...
  expect(await page.locator('#ansage-hoeflich').textContent()).toBe(vorher);
  // ... dann eine Ansage mit dem Ergebnissatz
  await expect(page.locator('#ansage-hoeflich')).toContainText(/Posterior/, { timeout: 5000 });
  await expect(page.locator('#ll-bv-n')).toHaveAttribute('aria-valuetext', /23/);
});
