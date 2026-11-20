// Word-Dateien für die NVDA-Messung Stufe 4 (Prüfplan B-W), headless: Leitfaden und Kodierleitfaden -> %TEMP%\n4-daten\word\
// Aufruf in app/:  NVDA_PORT=4242 node e2e/probe/nvda-erheben4-material.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASIS = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4242}`;
const W = join(tmpdir(), 'n4-daten', 'word'); mkdirSync(W, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.goto(BASIS + '/#interviews'); await page.waitForSelector('#iv-t'); await page.waitForTimeout(1200);
const speichern = async (name, klick) => { const [d] = await Promise.all([page.waitForEvent('download'), klick()]); await d.saveAs(join(W, name)); console.log('gespeichert', name, d.suggestedFilename()); };
// Leitfaden
await page.locator('#lf-neu').click(); await page.waitForTimeout(500);
await page.fill('#lf-titel', 'Leitfaden Semesterplanung'); await page.locator('#lf-titel').press('Tab');
await page.fill('#lf-sam-text', 'Wie sieht eine normale Woche bei dir aus?\nWelche Rolle spielt der Kalender für dich?\nWas machst du, wenn eine Abgabe näher rückt?\nWelche Hilfsmittel nutzt du?');
await page.getByRole('button', { name: /Fragen hinzufügen/ }).click(); await page.waitForTimeout(500);
await page.locator('.schritte button').nth(2).click(); await page.waitForTimeout(500);
for (const t of ['Wochenplanung', 'Hilfsmittel']) { await page.fill('#lf-so-neu', t); await page.getByRole('button', { name: 'Block anlegen' }).click(); await page.waitForTimeout(300); }
const sel = page.locator('ul.fragen select');
const n = await sel.count();
for (let i = 0; i < n; i++) await sel.nth(i).selectOption({ index: i < 2 ? 1 : 2 });
await page.locator('.schritte button').nth(3).click(); await page.waitForTimeout(500);
const ez = page.locator('textarea').filter({ has: page.locator('xpath=self::*') });
const tas = page.locator('section.schritt textarea');
const tn = await tas.count(); console.log('Textfelder im Schritt 4:', tn);
if (tn >= 1) await tas.nth(0).fill('Erzähl mir doch bitte, wie bei dir eine ganz normale Woche abläuft.'); await tas.nth(0).press('Tab');
await speichern('leitfaden.docx', () => page.getByRole('button', { name: /^Leitfaden als Word$/ }).click());
await speichern('leitfaden-mitnehmen.docx', () => page.getByRole('button', { name: /zum Mitnehmen/ }).click());
// Kodierleitfaden
const neu = async (name, def, vater) => {
  if (vater) await page.locator(`button[data-akt=unter][aria-label$="${vater}"]`).click(); else await page.locator('#kodl-neu-haupt').click();
  await page.fill('#kodl-name', name); await page.fill('#kodl-def', def);
  await page.locator('#kodl-anker-neu').click(); await page.fill('#kodl-a-0', 'Ich schreibe mir alles in den Kalender.');
  await page.fill('#kodl-regel', 'Kodieren, wenn eine Person ihr Vorgehen beschreibt.');
  await page.getByRole('button', { name: 'Speichern' }).click(); await page.waitForTimeout(500);
};
await neu('Zeitplanung', 'Aussagen darüber, wie die Person ihre Zeit einteilt.'); await neu('Hilfsmittel', 'Werkzeuge, die beim Planen helfen.');
await neu('Kalender', 'Nutzung eines Kalenders.', 'Zeitplanung');
await speichern('kodierleitfaden.docx', () => page.getByRole('button', { name: 'Als Word', exact: true }).click());
await b.close();
