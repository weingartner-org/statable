// Abschlussmessung Welle 7, Belege aus dem Browser: 3.1.1 (lang am html je Sprache), 3.2.6 und 3.2.3 (Hilfe und Melden stehen im Kopf
// an derselben Stelle auf jeder Route), 2.4.2 (document.title je Route). Ergebnis: e2e/ergebnisse/quellbelege.json.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ZIEL = path.resolve('e2e/ergebnisse/quellbelege.json');
const BEISPIEL_KNOPF = /Öffnen und üben|Open and practice/;
const ROUTEN = ['start', 'beispiele', 'daten', 'spalten', 'umformen', 'karte', 'blatt/neu', 'protokoll', 'befehle', 'bericht',
  'einstellungen', 'hilfe', 'planen', 'verstehen', 'lernen', 'r-probe', 'impressum', 'datenschutz', 'behoerden',
  'tabelle', 'amtlich', 'bearbeiten', 'hilfe/daten-seite', 'lernen/pfad/grundlagen', 'verstehen/verteilungen'];
const aus: Record<string, unknown> = {};
const schreibe = () => { mkdirSync(path.dirname(ZIEL), { recursive: true }); writeFileSync(ZIEL, JSON.stringify({ erstellt: new Date().toISOString(), ...aus }, null, 1), 'utf8'); };

test('3.1.1: lang am html-Element folgt der Sprache (de, en, uk)', async ({ browser }) => {
  const res: Record<string, unknown> = {};
  for (const [loc, erwartet] of [['de-DE', 'de'], ['en-US', 'en'], ['uk-UA', 'uk']] as const) {
    const ctx = await browser.newContext({ locale: loc });
    const page = await ctx.newPage();
    await page.goto('./#start');
    await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const lang = await page.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('#inhalt h1')?.textContent?.trim() ?? '' }));
    res[loc] = { ...lang, erwartet };
    await ctx.close();
  }
  aus['lang'] = res;
  schreibe();
  for (const [loc, r] of Object.entries(res) as [string, any][]) expect(r.lang, loc).toBe(r.erwartet);
});

test('2.4.2, 3.2.6, 3.2.3: Titel je Route; Kopfsteuerung (Hilfe, Melden) immer an derselben Stelle', async ({ browser }) => {
  test.setTimeout(600_000);
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const warte = async () => { await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {}); await page.waitForTimeout(700); };
  await page.goto('./#beispiele'); await warte();
  await page.getByRole('button', { name: BEISPIEL_KNOPF }).first().click({ timeout: 15_000 });
  await page.waitForFunction(() => location.hash !== '#beispiele', undefined, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const titel: Record<string, string> = {};
  const kopf: Record<string, string[]> = {};
  const lage: Record<string, { hilfe: number; melden: number; hilfeBox: number[]; meldenBox: number[] }> = {};
  for (const r of ROUTEN) {
    await page.goto('./#' + r); await warte();
    const m = await page.evaluate(() => {
      const rechts = document.querySelector('header.kopf .kopf-rechts');
      const el = rechts ? Array.from(rechts.querySelectorAll('a,button')).filter(e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; }) : [];
      const name = (e: Element) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const namen = el.map(name);
      const ih = el.findIndex(e => e.getAttribute('href') === '#hilfe');
      const im = el.findIndex(e => /meld|report/i.test(name(e)));
      const box = (i: number) => { const b = el[i]?.getBoundingClientRect(); return b ? [Math.round(b.x), Math.round(b.y)] : []; };
      return { titel: document.title, namen, ih, im, hb: box(ih), mb: box(im) };
    });
    titel[r] = m.titel; kopf[r] = m.namen;
    lage[r] = { hilfe: m.ih, melden: m.im, hilfeBox: m.hb, meldenBox: m.mb };
  }
  aus['titel'] = titel; aus['kopfSteuerung'] = kopf; aus['kopfLage'] = lage;
  schreibe();
  await ctx.close();
  const ohneTitel = Object.entries(titel).filter(([, t]) => !t.trim());
  expect(ohneTitel).toEqual([]);
  const keys = Object.keys(lage);
  const ref = lage[keys[0]]!;
  for (const k of keys) {
    expect(lage[k]!.hilfe, `Hilfe-Index ${k}`).toBe(ref.hilfe);
    expect(lage[k]!.melden, `Melden-Index ${k}`).toBe(ref.melden);
  }
});
