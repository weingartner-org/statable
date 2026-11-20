/**
 * Hilfen für die Browser-Tests der Ausfüllseite (Stufe 3C, seite.test.ts und seite-axe.test.ts). Kein Test.
 * `fuelleBisAbschluss` füllt den Beispielplan (seite-testplan.ts) wie eine Person: Einleitung, Einwilligung (erst falsch), Code, alle Seiten (mit Fehlerfall),
 * bis die Abschlussseite steht. `pruefe` wird an jedem Zustand aufgerufen (für axe).
 */
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { expect } from 'vitest';
import type { Page } from '@playwright/test';

export const APP = fileURLToPath(new URL('../..', import.meta.url));

/** Vite-Entwicklungsserver ohne Svelte (genügt für /ausfuellen/); `host: true` lauscht auch im Netz (für den Test „unsicherer Kontext“). */
export async function starteServer(): Promise<{ server: ViteDevServer; url: string; lan: string | null }> {
  // Ohne Vorbündeln (noDiscovery): sonst durchsucht Vite die ganze App (am Hauptordner über 2 Minuten, page.goto läuft ab), baut den Zwischenspeicher
  // der App-Entwicklung um, und zwei Testdateien gleichzeitig stoßen sich am selben Ordner. Die Abhängigkeiten der Seite (typage, fflate) sind ESM und laufen so.
  const server = await createServer({
    configFile: false, root: APP, logLevel: 'error', cacheDir: 'node_modules/.vite-ausfuellen-test',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '0.0.0.0', port: 4380, strictPort: false, watch: null }   // kein Dateiwächter: im Hauptordner liegen public/webr und dist mit Tausenden Dateien
  });
  await server.listen();
  const port = (server.httpServer!.address() as { port: number }).port;
  await vorwaermen(`http://127.0.0.1:${port}`, '/src/ausfuellen/seite.ts');
  const lan = Object.values(networkInterfaces()).flat().find(a => a && a.family === 'IPv4' && !a.internal)?.address ?? null;
  return { server, url: `http://127.0.0.1:${port}`, lan: lan ? `http://${lan}:${port}` : null };
}

/** Holt den ganzen Modulbaum der Seite einmal vom Server, bevor der Browser kommt: am Hauptordner braucht Vite für einzelne Dateien
 *  mehrere Sekunden (rund 70 Module, zusammen bis 30 s), sonst läuft das erste `page.goto` ab. Danach liefert Vite aus dem Speicher. */
async function vorwaermen(basis: string, start: string): Promise<void> {
  const gesehen = new Set<string>();
  let welle = [start];
  while (welle.length) {
    const neu: string[] = [];
    await Promise.all(welle.filter(p => !gesehen.has(p)).map(async p => {
      gesehen.add(p);
      const text = await fetch(basis + p).then(r => r.text()).catch(() => '');
      for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
        const u = m[1]!.startsWith('.') ? new URL(m[1]!, 'http://x' + p).pathname : m[1]!;
        if (u.startsWith('/') && !gesehen.has(u)) neu.push(u);
      }
    }));
    welle = neu;
  }
}

const sp = (de: string, en: string, en_: boolean) => (en_ ? en : de);

export interface Lauf { pruefe?: (zustand: string) => Promise<void>; en?: boolean }

/** Füllt den Plan bis zur Abschlussseite (Rot, alle Fragen beantwortet). */
export async function fuelleBisAbschluss(page: Page, o: Lauf = {}): Promise<void> {
  const en = !!o.en, pruefe = o.pruefe ?? (async () => {});
  const weiter = () => page.locator('[data-weiter]').click();
  await page.locator('[data-schritt="einleitung"]').waitFor();
  await pruefe('einleitung');
  await weiter();
  // Einwilligung: erst ohne Haken (Pflicht), dann mit
  await page.locator('[data-schritt="einwilligung"]').waitFor();
  await pruefe('einwilligung');
  await weiter();
  await page.locator('#einw-fehler').waitFor();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('einw');
  await pruefe('einwilligung-fehler');
  await page.locator('#einw').check();
  await weiter();
  // Code: erst leer, dann klein geschrieben (die Seite macht Großbuchstaben)
  await page.locator('[data-schritt="code"]').waitFor();
  await pruefe('code');
  await weiter();
  await page.locator('#code-fehler').waitFor();
  await pruefe('code-fehler');
  await page.locator('#code').fill('abcd-efgh');
  await weiter();
  // Seite 1: Pflichtfrage leer lassen, Fehler, dann beantworten
  await page.locator('[data-seite="auswahl"]').waitFor();
  await pruefe('auswahl');
  await weiter();
  await page.locator('[data-fehlerliste]').waitFor();
  await pruefe('auswahl-fehler');
  await page.getByRole('radio', { name: sp('Grün', 'Green', en), exact: true }).check();   // erst Grün: keine Zusatzseite
  await page.getByRole('radio', { name: sp('Rot', 'Red', en), exact: true }).check();
  await page.getByRole('checkbox', { name: 'Radio', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Internet', exact: true }).check();
  await weiter();
  // Seite 2
  await page.locator('[data-seite="felder"]').waitFor();
  await pruefe('felder');
  await page.locator('[data-frage="Z"] input[type=number]').fill('42');
  await page.locator('[data-frage="T"] [data-feld]').fill('Grüße </script> & <b>fett</b>');
  await page.locator('[data-frage="D"] input[type=date]').fill('1990-05-17');
  await page.locator('[data-frage="R"] input[type=number]').fill('5');
  await weiter();
  // Seite 3: Rangfolge
  await page.locator('[data-seite="rang"]').waitFor();
  await pruefe('rang');
  await page.getByRole('button', { name: sp('Arbeit nach oben', 'Work, move up', en), exact: true }).click();
  await page.getByRole('button', { name: sp('Diese Reihenfolge übernehmen', 'Keep this order', en), exact: true }).click();
  await weiter();
  // Seite 4: Block, erst leer (Pflicht), dann ausgefüllt
  await page.locator('[data-seite="block"]').waitFor();
  await weiter();
  await page.locator('[data-fehlerliste]').waitFor();
  await pruefe('block-fehler');
  for (const [id, wert] of [['B1', 4], ['B2', 2], ['B3', 5]] as const) await page.locator(`input[data-item="${id}"][value="${wert}"]`).check();
  await pruefe('block');
  await weiter();
  // Seite 5 (nur bei Rot)
  await page.locator('[data-seite="zusatz"]').waitFor();
  await pruefe('zusatz');
  await page.locator('[data-frage="X"] [data-feld]').fill('weil Rot schön ist');
  await weiter();
  // Abschluss: Fokus auf der Überschrift, Wege da
  await page.locator('[data-weg="datei"]').waitFor();
  await pruefe('abschluss');
}
