// Stufe 3, Prüfung 6: Word-Dateien der Teilnahme-Information (de und en) über die Funktion der App (lib/datenschutzvorlage.ts) erzeugen,
// im Browser (Vite-Entwicklungsserver, wie 3e), und in den Temp-Ordner schreiben. Ein Plan wird über die Oberfläche angelegt.
// Die Dateien Codeliste und Sammelimport-Protokoll kommen aus erheben3-planen.mjs (Download über die Oberfläche).
// Aufruf in app/:  node e2e/probe/erheben3-word.mjs
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const OUT = join(tmpdir(), 'erheben3'); mkdirSync(OUT, { recursive: true });
const server = await createServer({ root: APP, logLevel: 'error', server: { port: Number(process.env.PORT || 4373), host: '127.0.0.1', strictPort: false } });
await server.listen();
const b = await chromium.launch();
const ergebnis = [];
try {
  for (const [sprache, locale] of [['de', 'de-DE'], ['en', 'en-US']]) {
    const ctx = await b.newContext({ locale, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('Seitenfehler:', e.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#fragebogen`, { timeout: 300000 }); await page.waitForSelector('h1', { timeout: 300000 });
    await page.getByRole('button', { name: /Neuen Fragebogen anlegen|Create new questionnaire/ }).click();
    await page.waitForTimeout(500);
    const bytes = await page.evaluate(async (sp) => {
      const { teilnahmeWord } = await import('/src/lib/datenschutzvorlage.ts');
      const { aktuellerPlan } = await import('/src/lib/fragebogen-editor.svelte.ts');
      const plan = aktuellerPlan();
      if (!plan) return null;
      const u8 = await teilnahmeWord(plan, sp, { wege: ['datei', 'text'], zweck: 'Probe Erheben 3' });
      return Array.from(u8);
    }, sprache);
    if (!bytes) { ergebnis.push({ datei: sprache, fehler: 'kein Plan' }); await ctx.close(); continue; }
    const pfad = join(OUT, `teilnahme-${sprache}.docx`);
    writeFileSync(pfad, Buffer.from(bytes));
    ergebnis.push({ datei: pfad, groesse: bytes.length });
    await ctx.close();
  }
} finally {
  await b.close(); await server.close();
}
console.log(JSON.stringify(ergebnis, null, 1));
