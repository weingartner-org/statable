/**
 * Stufe 3C, Prüfplan 2.1: axe-core auf allen Seiten der Fragebogen-Datei (`file://`) und der Link-Seite, bei 1280 und 320 Pixel, Deutsch und Englisch,
 * in jedem Zustand des Ablaufs (Einleitung, Einwilligung, Code, Fehlerzustände, alle Seiten, Abschlussseite). Regeln wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa: 0 Verstöße.
 * Dazu: kein waagrechtes Scrollen bei 320 Pixel und Zielgröße der Knöpfe und Felder (Ziel 44 × 44, hier Grenze 43,5 wie in der Probe 2b).
 * „incomplete“ wird nur ausgegeben (von Hand ansehen, im Protokoll begründen).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ViteDevServer } from 'vite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fragebogenDatei, planFuerAusfuellen } from '../lib/fragebogendatei';
import { kodierePlan } from './planlink';
import { neuesSchluesselpaar } from '../lib/schluessel';
import { testplan } from './seite-testplan';
import { fuelleBisAbschluss, starteServer } from './seite-testhilfe';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
let browser: Browser, server: ViteDevServer, ordner = '';
const adressen: Record<string, string> = {};

beforeAll(async () => {
  const { empfaenger } = await neuesSchluesselpaar();
  const plan = testplan(empfaenger);
  ordner = mkdtempSync(join(tmpdir(), 'statable-3c-axe-'));
  const datei = join(ordner, 'fragebogen.html');
  writeFileSync(datei, await fragebogenDatei(plan), 'utf8');
  adressen['Datei'] = pathToFileURL(datei).href;
  let url = '';
  ({ server, url } = await starteServer());
  adressen['Link'] = `${url}/ausfuellen/#${kodierePlan(planFuerAusfuellen(plan))}`;
  browser = await chromium.launch();
}, 300_000);   // Server, Vorwärmen und Chromium brauchen unter der Last der vollen Suite länger als 2 Minuten
afterAll(async () => { await browser?.close(); await server?.close(); rmSync(ordner, { recursive: true, force: true }); }, 60_000);   // Aufräumen (Browser, Server) braucht unter der Last der vollen Suite länger als 10 s

describe.each(['Datei', 'Link'])('axe auf der %s', weg => {
  it.each([[1280, 'de'], [1280, 'en'], [320, 'de'], [320, 'en']] as const)('%i px, %s: 0 Verstöße in allen Zuständen, kein waagrechtes Scrollen, Ziele ab 44 px', async (breite, sprache) => {
    const ctx = await browser.newContext({ locale: sprache === 'de' ? 'de-DE' : 'en-US', viewport: { width: breite, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(adressen[weg]!);
    let verstoesse = 0, zustaende = 0;
    const bericht: string[] = [];
    await fuelleBisAbschluss(page, {
      en: sprache === 'en',
      pruefe: async zustand => {
        const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        zustaende++; verstoesse += res.violations.length;
        for (const v of res.violations) bericht.push(`${zustand}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
        for (const v of res.incomplete) console.log(`  unklar (${weg}, ${breite}, ${sprache}, ${zustand}): ${v.id} ×${v.nodes.length}`);
        const mass = await page.evaluate(() => ({
          breiter: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          klein: Array.from(document.querySelectorAll('.af button, .af label.opt, .af label.zelle, .af input[type=text], .af input[type=number], .af input[type=date], .af input[type=range]'))
            .filter(e => e instanceof HTMLElement && !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { e: e.tagName + '.' + e.className, w: Math.round(r.width), h: Math.round(r.height) }; })
            .filter(x => x.h < 43.5 || x.w < 43.5),
        }));
        if (mass.breiter > 0) bericht.push(`${zustand}: waagrechtes Scrollen um ${mass.breiter} px`);
        if (mass.klein.length) bericht.push(`${zustand}: Ziele unter 44 px: ${JSON.stringify(mass.klein.slice(0, 4))}`);
      },
    });
    console.log(`axe ${weg}, ${breite} px, ${sprache}: ${zustaende} Zustände geprüft, ${verstoesse} Verstöße`);
    await ctx.close();
    expect(bericht).toEqual([]);
    expect(zustaende).toBeGreaterThanOrEqual(13);
  }, 120_000);
});
