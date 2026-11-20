/**
 * Hilfen für die Tests der Fragetypen-Bibliothek (Paket 2B). Kein Test, kein Teil der Bibliothek.
 *
 * Warum kein jsdom/happy-dom: Im Projekt ist KEINE DOM-Testumgebung installiert (vitest läuft mit `environment: node`, in app/node_modules gibt es weder jsdom noch happy-dom).
 * Statt eine Abhängigkeit zu installieren, baut `baueBibliothek()` die Bibliothek mit vite (Bibliotheks-Modus, IIFE, ungekürzt) in eine Zeichenkette, und die Tests laden sie
 * in ein echtes Chromium (Playwright, steht in app/node_modules): leere Seite + Script, alle Zugriffe per `page.evaluate`. Damit sind auch Rollen und zugängliche Namen
 * (`getByRole`) echt berechnet, nicht nachgebaut.
 */
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { Browser, Page } from '@playwright/test';

export const ORDNER = fileURLToPath(new URL('.', import.meta.url));
export const EINSTIEG = fileURLToPath(new URL('./index.ts', import.meta.url));
export const APP = fileURLToPath(new URL('../..', import.meta.url));

/** Baut `src/ausfuellen/index.ts` als IIFE (globaler Name `Ausfuellen`). Wirft, wenn der Einstieg fehlt oder der Bau scheitert (dann sind alle Tests rot). */
export async function baueBibliothek(): Promise<string> {
  if (!existsSync(EINSTIEG)) throw new Error('src/ausfuellen/index.ts fehlt');
  const aus = await build({
    configFile: false, root: APP, logLevel: 'silent',
    build: { write: false, minify: false, sourcemap: false, lib: { entry: EINSTIEG, formats: ['iife'], name: 'Ausfuellen', fileName: 'ausfuellen' } },
  });
  const liste = Array.isArray(aus) ? aus : [aus];
  const teil = liste.flatMap(a => ('output' in a ? a.output : [])).find(o => o.type === 'chunk');
  if (!teil || teil.type !== 'chunk') throw new Error('Bau ohne Ergebnis');
  return teil.code;
}

export async function oeffneSeite(browser: Browser, code: string, sprache = 'de'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.setContent(`<!doctype html><html lang="${sprache}"><head><title>Test</title></head><body></body></html>`);
  await page.addScriptTag({ content: code });
  return page;
}

/**
 * Zeichnet eine Seite in `document.body` und merkt sich: `window.__wurzel` (Rückgabe), `window.__aend` (Aufrufe von beiAenderung als [antworten, frageId]),
 * `window.__weiter` / `window.__zurueck` (Aufrufe), `window.__ansagen` (Aufrufe von optionen.ansage).
 */
export async function zeichne(page: Page, plan: unknown, seiteId: string, antworten: Record<string, unknown> = {}, optionen: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([p, sid, a, o]) => {
    const w = window as any;
    w.__aend = []; w.__weiter = []; w.__zurueck = []; w.__ansagen = [];
    const seite = (p as any).elemente.find((s: any) => s.id === sid);
    const opt = {
      sprache: 'de', eng: false, modus: 'ausfuellen', ...(o as object),
      beiAenderung: (an: unknown, id: string) => w.__aend.push([JSON.parse(JSON.stringify(an)), id]),
      beiWeiter: (an: unknown) => w.__weiter.push(JSON.parse(JSON.stringify(an))),
      beiZurueck: () => w.__zurueck.push(true),
      ansage: (t: string) => w.__ansagen.push(t),
      bildUrl: (d: string) => `bilder/${d}`,
    };
    w.__wurzel = w.Ausfuellen.zeichneSeite(p, seite, a, opt);
    document.body.replaceChildren(w.__wurzel);
  }, [plan, seiteId, antworten, optionen] as const);
}

/** `liesAntworten(wurzel)` der zuletzt gezeichneten Seite. */
export const lies = (page: Page): Promise<Record<string, unknown>> => page.evaluate(() => { const w = window as any; return JSON.parse(JSON.stringify(w.Ausfuellen.liesAntworten(w.__wurzel))); });
/** Text der Ansage-Region der Bibliothek. */
export const ansage = (page: Page): Promise<string> => page.evaluate(() => (document.querySelector('[data-ansage]')?.textContent ?? '').trim());
