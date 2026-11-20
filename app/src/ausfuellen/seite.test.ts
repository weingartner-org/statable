/**
 * Stufe 3C: die Ausfüllseite im echten Chromium (Playwright), auf beiden Wegen:
 *   Datei  - `fragebogenDatei(plan)` als `file://`-Seite (ohne Server)
 *   Link   - `/ausfuellen/#<Plan>` vom Entwicklungsserver (derselbe Einstieg seite.ts)
 * Geprüft: ausfüllen bis zur Abschlussseite, Antwort als Datei speichern und entschlüsseln (Statable UND das echte `age -d -i`), Armor-Text kopieren und entschlüsseln,
 * Filter-Aufräumen, Zwischenstand nach Neuladen und Löschen nach Rückgabe, unsicherer Kontext (Satz statt Absturz, auch über die Adresse im Netz), kaputte Links.
 * `age` fehlt: die Gegenprobe mit age wird mit Meldung übersprungen (age-werkzeug.testhilfe.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fragebogenDatei, planFuerAusfuellen } from '../lib/fragebogendatei';
import { kodierePlan } from './planlink';
import { neuesSchluesselpaar } from '../lib/schluessel';
import { entschluesseleAntwort, type Antwortsatz } from '../lib/antwortsatz';
import { ageLauf, ageVorhanden } from '../lib/age-werkzeug.testhilfe';
import { ERWARTET, testplan } from './seite-testplan';
import { fuelleBisAbschluss, starteServer } from './seite-testhilfe';

let browser: Browser, server: ViteDevServer, base = '', lan: string | null = null, ordner = '';
let identitaet = '', empfaenger = '', plan: ReturnType<typeof testplan>, dateiUrl = '', linkUrl = '';
const kontexte: BrowserContext[] = [];

beforeAll(async () => {
  ({ identitaet, empfaenger } = await neuesSchluesselpaar());
  plan = testplan(empfaenger);
  ordner = mkdtempSync(join(tmpdir(), 'statable-3c-'));
  const datei = join(ordner, 'fragebogen.html');
  writeFileSync(datei, await fragebogenDatei(plan), 'utf8');
  dateiUrl = pathToFileURL(datei).href;
  ({ server, url: base, lan } = await starteServer());
  linkUrl = `${base}/ausfuellen/#${kodierePlan(planFuerAusfuellen(plan))}`;
  browser = await chromium.launch();
}, 300_000);   // Server, Vorwärmen und Chromium brauchen unter der Last der vollen Suite länger als 2 Minuten
afterAll(async () => { for (const k of kontexte) await k.close(); await browser?.close(); await server?.close(); rmSync(ordner, { recursive: true, force: true }); }, 60_000);   // Aufräumen (Browser, Server) braucht unter der Last der vollen Suite länger als 10 s

async function neueSeite(url: string, opt: { locale?: string; breite?: number; vorher?: (p: Page) => Promise<void> } = {}): Promise<{ page: Page; fehler: string[] }> {
  const ctx = await browser.newContext({ locale: opt.locale ?? 'de-DE', viewport: { width: opt.breite ?? 1280, height: 900 }, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  kontexte.push(ctx);
  const page = await ctx.newPage();
  const fehler: string[] = [];
  page.on('pageerror', e => fehler.push(e.message));
  await opt.vorher?.(page);
  await page.goto(url);
  return { page, fehler };
}

function pruefeWerte(satz: Antwortsatz): void {
  expect(satz.plan).toEqual({ id: 'testplan-3c', revision: 2 });
  expect(satz.code).toBe('ABCD-EFGH');
  expect(satz.antwortId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(satz.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(satz.ende).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(satz.werte).toEqual({ ...ERWARTET, ':einwilligung': 1 });
  expect(JSON.stringify(satz)).not.toMatch(/\d{2}:\d{2}:\d{2}/);   // keine Uhrzeit
}

for (const [weg, adresse] of [['Datei (file://)', () => dateiUrl], ['Link (/ausfuellen/#…)', () => linkUrl]] as const) {
  describe(`Ausfüllen über ${weg}`, () => {
    let gespeichert: Uint8Array | null = null, armorText = '', kopiert = '', satz: Antwortsatz | null = null;

    it('bis zur Abschlussseite, Fokus auf der Überschrift, Rückgabe-Adresse als Text, QR-Code nur zusätzlich', async () => {
      const { page, fehler } = await neueSeite(adresse());
      expect(await page.locator('h1').innerText()).toBe('Beispielumfrage');
      expect(await page.title()).toBe('Beispielumfrage');
      expect(await page.locator('html').getAttribute('lang')).toBe('de');
      await fuelleBisAbschluss(page);
      expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Fast geschafft: Antwort zurückgeben');
      expect(await page.locator('[data-rueckgabe]').innerText()).toContain('forschung@example.org');
      expect(await page.locator('main').innerText()).toContain('Antwort an: Dr. Muster');
      // Wege als Liste echter Knöpfe: Datei, Text (Teilen nur, wenn der Browser es kann)
      const knoepfe = await page.locator('ul.wege li button').evaluateAll(b => b.map(x => `${x.tagName}:${x.textContent}`));
      expect(knoepfe).toContain('BUTTON:Antwort als Datei speichern');
      expect(knoepfe).toContain('BUTTON:Antwort-Text kopieren');
      // QR-Code: da, mit Beschriftung, nie allein (Hinweis daneben)
      const qr = page.locator('svg.qr');
      expect(await qr.count()).toBe(1);
      expect(await qr.getAttribute('role')).toBe('img');
      expect(await qr.getAttribute('aria-label')).toContain('Datei oder den Text');
      // Text-Weg: Textfeld sichtbar mit dem Armor-Text
      armorText = await page.locator('#antworttext').inputValue();
      expect(armorText.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')).toBe(true);

      // Datei speichern
      const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-weg="datei"]').click()]);
      expect(dl.suggestedFilename()).toMatch(/^statable-antwort-[0-9a-f]{8}\.age$/);
      const pfad = join(ordner, dl.suggestedFilename());
      await dl.saveAs(pfad);
      gespeichert = new Uint8Array(readFileSync(pfad));
      expect(await page.locator('[data-rueckmeldung]').innerText()).toContain(`Datei „${dl.suggestedFilename()}“ gespeichert`);
      expect(await page.locator('[data-ansage], [role=status]').first().innerText()).toContain('gespeichert');
      // Zwischenstand nach der Rückgabe gelöscht
      expect(await page.evaluate(() => localStorage.getItem('statable-ausfuellen:testplan-3c'))).toBeNull();
      expect(await page.locator('[data-rueckmeldung]').innerText()).toContain('Zwischenstand wurde auf diesem Gerät gelöscht');

      // Text kopieren
      await page.locator('[data-weg="text"]').click();
      await expect.poll(() => page.locator('[data-rueckmeldung]').innerText()).toContain('Text kopiert');
      const zwischenablage = await page.evaluate(() => navigator.clipboard.readText());
      kopiert = zwischenablage;   // Windows macht aus den Zeilenenden CRLF; age und typage lesen beides
      expect(zwischenablage.split('\r\n').join('\n')).toBe(armorText);
      expect(fehler).toEqual([]);

      satz = await entschluesseleAntwort(gespeichert, identitaet);
      pruefeWerte(satz);
    }, 60_000);

    it('Armor-Text (Feld und Zwischenablage) und Datei sind dieselbe Antwort und mit Statable entschlüsselbar', async () => {
      for (const text of [armorText, kopiert]) {
        const a = await entschluesseleAntwort(text, identitaet);
        pruefeWerte(a);
        expect(a.antwortId).toBe(satz!.antwortId);
      }
    });

    it.skipIf(!ageVorhanden)('Gegenprobe: das echte age -d -i entschlüsselt Datei und Armor-Text zu denselben Werten', () => {
      const t = mkdtempSync(join(tmpdir(), 'statable-3c-age-'));
      try {
        const schluessel = join(t, 'key.txt');
        writeFileSync(schluessel, `${identitaet}\n`);
        for (const eingabe of [gespeichert!, armorText, kopiert]) {
          const r = ageLauf('age', ['-d', '-i', schluessel], eingabe);
          expect(r.stderr).toBe('');
          expect(r.status).toBe(0);
          const aus = JSON.parse(r.stdout.toString('utf8')) as Antwortsatz;
          pruefeWerte(aus);
          expect(aus).toEqual(satz);
        }
      } finally { rmSync(t, { recursive: true, force: true }); }
    });
  });
}

describe('Verhalten der Ausfüllseite', () => {
  it('Filter: Antworten verborgener Fragen gehen nicht mit (erst Rot + Zusatzantwort, dann zurück auf Grün)', async () => {
    const { page } = await neueSeite(dateiUrl);
    await page.locator('[data-weiter]').click();
    await page.locator('#einw').check(); await page.locator('[data-weiter]').click();
    await page.locator('#code').fill('x1'); await page.locator('[data-weiter]').click();
    await page.getByRole('radio', { name: 'Rot', exact: true }).check();
    await page.locator('[data-weiter]').click();
    await page.locator('[data-frage="Z"] input[type=number]').fill('30'); await page.locator('[data-weiter]').click();
    await page.locator('[data-weiter]').click();
    for (const [id, w] of [['B1', 1], ['B2', 1], ['B3', 1]] as const) await page.locator(`input[data-item="${id}"][value="${w}"]`).check();
    await page.locator('[data-weiter]').click();
    await page.locator('[data-frage="X"] [data-feld]').fill('nur bei Rot');
    // zurück bis Seite 1, auf Grün wechseln
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    await page.locator('[data-seite="zusatz"]').waitFor({ state: 'detached' }).catch(() => {});
    await page.getByRole('radio', { name: 'Grün', exact: true }).check();
    for (let i = 0; i < 4; i++) await page.locator('[data-weiter]').click();
    await page.locator('[data-weg="datei"]').waitFor();   // die Seite „Nur bei Rot“ kam nicht mehr
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-weg="datei"]').click()]);
    const pfad = join(ordner, 'filter.age'); await dl.saveAs(pfad);
    const s = await entschluesseleAntwort(new Uint8Array(readFileSync(pfad)), identitaet);
    expect(s.werte.F1).toBe(2);
    expect(s.werte).not.toHaveProperty('X');
    expect(s.code).toBe('X1');
  }, 60_000);

  it('Zwischenstand bleibt nach Neuladen (Seite, Antwort, Code), mit Hinweis und „Von vorn beginnen“', async () => {
    const { page } = await neueSeite(dateiUrl);
    await page.locator('[data-weiter]').click();
    await page.locator('#einw').check(); await page.locator('[data-weiter]').click();
    await page.locator('#code').fill('zzzz-0000'); await page.locator('[data-weiter]').click();
    await page.getByRole('radio', { name: 'Blau', exact: true }).check();
    await page.locator('[data-weiter]').click();
    await page.locator('[data-seite="felder"]').waitFor();
    await page.locator('[data-frage="Z"] input[type=number]').fill('77');
    expect(await page.evaluate(() => localStorage.getItem('statable-ausfuellen:testplan-3c'))).toContain('ZZZZ-0000');
    await page.reload();
    await page.locator('[data-seite="felder"]').waitFor();
    expect(await page.locator('[data-frage="Z"] input[type=number]').inputValue()).toBe('77');
    expect(await page.locator('.hinweis').innerText()).toContain('Sie machen dort weiter, wo Sie aufgehört haben');
    await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    expect(await page.getByRole('radio', { name: 'Blau', exact: true }).isChecked()).toBe(true);
    // von vorn
    await page.reload();
    await page.getByRole('button', { name: 'Von vorn beginnen' }).click();
    await page.locator('[data-schritt="einleitung"]').waitFor();
    expect(await page.evaluate(() => localStorage.getItem('statable-ausfuellen:testplan-3c'))).toBeNull();
  }, 60_000);

  it('Sprache: Umschalter bei zwei Sprachen, lang am Dokument, Texte wechseln, Antworten bleiben', async () => {
    const { page } = await neueSeite(dateiUrl, { locale: 'en-US' });
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
    expect(await page.locator('h1').innerText()).toBe('Sample survey');
    await page.getByRole('button', { name: 'Deutsch' }).click();
    expect(await page.locator('html').getAttribute('lang')).toBe('de');
    expect(await page.locator('h1').innerText()).toBe('Beispielumfrage');
    expect(await page.getByRole('button', { name: 'Deutsch' }).getAttribute('aria-pressed')).toBe('true');
    expect(await page.getByRole('button', { name: 'English' }).getAttribute('lang')).toBe('en');
  });

  it('ohne sicheren Kontext (erzwungen): ein verständlicher Satz statt eines Absturzes, kein Fragebogen', async () => {
    const { page, fehler } = await neueSeite(linkUrl, { vorher: async p => { await p.addInitScript(() => Object.defineProperty(window, 'isSecureContext', { value: false })); } });
    const satz = await page.locator('[data-fehler-seite="unsicher"]').innerText();
    expect(satz).toContain('https://');
    expect(satz).toContain('Es wurde nichts gesendet');
    expect(await page.locator('h1').innerText()).toBe('Beispielumfrage');
    expect(await page.locator('[data-schritt]').count()).toBe(0);
    expect(fehler).toEqual([]);
  });

  it('ohne sicheren Kontext (echt: Adresse im Netz über http, kein crypto.subtle)', async () => {
    if (!lan) { console.warn('[übersprungen] keine Netzwerkadresse gefunden'); return; }
    const { page, fehler } = await neueSeite(linkUrl.replace(base, lan));
    expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
    await page.locator('[data-fehler-seite="unsicher"]').waitFor();
    expect(fehler).toEqual([]);
  });

  it('kaputter oder fehlender Plan: Satz statt leerer Seite', async () => {
    for (const hash of ['', '#', '#kaputt', '#AAAA', '#' + kodierePlan({ format: 'etwas-anderes' })]) {
      const { page, fehler } = await neueSeite(`${base}/ausfuellen/${hash}`);
      expect(await page.locator('[data-fehler-seite="keinPlan"]').innerText()).toContain('kein lesbarer Fragebogen');
      expect(fehler).toEqual([]);
    }
  });

  it('Plan ohne Schlüssel: Satz statt Fragebogen, den man nicht abschicken könnte', async () => {
    const p = testplan(empfaenger); delete (p as { empfaenger?: unknown }).empfaenger;
    const { page } = await neueSeite(`${base}/ausfuellen/#${kodierePlan(planFuerAusfuellen(p))}`);
    expect(await page.locator('[data-fehler-seite="ohneSchluessel"]').innerText()).toContain('Schlüssel');
  });

  it('Teilen: der Knopf erscheint, wenn der Browser Dateien teilen kann (hier vorgetäuscht), übergibt die Datei und sagt es an', async () => {
    const { page } = await neueSeite(dateiUrl, { vorher: async p => { await p.addInitScript(() => {
      const w = window as unknown as { __geteilt?: { name: string; groesse: number } };
      navigator.canShare = () => true;
      navigator.share = async (d?: ShareData) => { w.__geteilt = { name: d!.files![0]!.name, groesse: d!.files![0]!.size }; };
    }); } });
    await fuelleBisAbschluss(page);
    await page.locator('[data-weg="teilen"]').click();
    await expect.poll(() => page.locator('[data-rueckmeldung]').innerText()).toContain('Antwort geteilt');
    const g = await page.evaluate(() => (window as unknown as { __geteilt?: { name: string; groesse: number } }).__geteilt);
    expect(g?.name).toMatch(/^statable-antwort-[0-9a-f]{8}\.age$/);
    expect(g!.groesse).toBeGreaterThan(300);
    expect(await page.evaluate(() => localStorage.getItem('statable-ausfuellen:testplan-3c'))).toBeNull();
  }, 60_000);

  it('ohne Skript: ein sichtbarer Satz statt einer leeren Seite (Datei und Link-Seite)', async () => {
    for (const url of [dateiUrl, linkUrl]) {
      const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'de-DE' });
      kontexte.push(ctx);
      const page = await ctx.newPage();
      await page.goto(url);
      const text = await page.locator('noscript main, main').first().innerText();
      expect(text).toContain('braucht JavaScript');
      expect(await page.locator('noscript').count()).toBeGreaterThan(0);
    }
  });

  it('Plan- und Antworttexte erscheinen nur als Text: `</script><img onerror>` im Fragetext legt kein Element an', async () => {
    const { page } = await neueSeite(dateiUrl);
    await page.evaluate(() => { (window as unknown as { __alarm: boolean }).__alarm = false; window.alert = () => { (window as unknown as { __alarm: boolean }).__alarm = true; }; });
    await page.locator('[data-weiter]').click();
    await page.locator('#einw').check(); await page.locator('[data-weiter]').click();
    await page.locator('#code').fill('a'); await page.locator('[data-weiter]').click();
    expect(await page.locator('legend').first().innerText()).toContain('</script><img src=x onerror=alert(1)>');
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __alarm: boolean }).__alarm)).toBe(false);
  });

  it('QR-Code: zu große Antwort bekommt den Hinweis „zu groß“, die anderen Wege bleiben', async () => {
    const { page } = await neueSeite(dateiUrl);
    await page.locator('[data-weiter]').click();
    await page.locator('#einw').check(); await page.locator('[data-weiter]').click();
    await page.locator('#code').fill('a'); await page.locator('[data-weiter]').click();
    await page.getByRole('radio', { name: 'Rot', exact: true }).check();
    await page.locator('[data-weiter]').click();
    await page.locator('[data-frage="Z"] input[type=number]').fill('1');
    await page.locator('[data-weiter]').click();
    await page.locator('[data-weiter]').click();
    for (const id of ['B1', 'B2', 'B3']) await page.locator(`input[data-item="${id}"][value="1"]`).check();
    await page.locator('[data-weiter]').click();
    await page.locator('[data-frage="X"] [data-feld]').fill('ä'.repeat(9000));
    await page.locator('[data-weiter]').click();
    await page.locator('[data-weg="datei"]').waitFor();
    expect(await page.locator('[data-qr-zu-gross]').innerText()).toContain('zu groß für einen QR-Code');
    expect(await page.locator('svg.qr').count()).toBe(0);
    expect(await page.locator('[data-weg="text"]').count()).toBe(1);
  }, 60_000);
});
