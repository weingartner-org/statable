// Word-Dateien für die NVDA-Messung (Prüfplan B, Stufe 3), headless: Code-Liste, Teilnahme-Information, Sammelimport-Protokoll -> %TEMP%\n3-daten\word\
// Aufruf in app/:  node e2e/probe/nvda-erheben3-word-material.mjs   (nach ...-material.mjs; vite preview Port 4232)
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASIS = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4232}`;
const DIR = join(tmpdir(), 'n3-daten'); const S4 = join(DIR, 'sammel'); const W = join(DIR, 'word'); mkdirSync(W, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(S4, 'plan-mit-codes.json')); await page.waitForTimeout(1000);
const speichern = async (name, klick) => { const [d] = await Promise.all([page.waitForEvent('download'), klick()]); await d.saveAs(join(W, name)); console.log('gespeichert', name, d.suggestedFilename()); };
await speichern('code-liste.docx', () => page.getByRole('button', { name: /Liste als Word speichern/ }).click());
await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click(); await page.waitForSelector('#fb-ds-form');
await page.fill('#fb-ds-dauer', '10'); await page.fill('#fb-ds-zweck', 'Wie zufrieden sind Studierende mit dem Seminar?');
await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
const ja = page.getByRole('button', { name: 'Vorlage einsetzen' }); if (await ja.count()) await ja.click();
await page.waitForSelector('[data-testid="fb-ds-offen"]');
await speichern('teilnahme-information.docx', () => page.getByRole('button', { name: 'Als Word speichern' }).click());
await page.getByRole('button', { name: 'Vorhandenen Schlüssel verwenden' }).click();
await page.setInputFiles('#fb-schl-datei', join(S4, 'schluessel.statable-schluessel')); await page.fill('#fb-schl-pw', 'ein langes passwort 3n');
await page.getByRole('button', { name: 'Schlüssel öffnen' }).click(); await page.waitForSelector('#fb-schl-pub');
await page.setInputFiles('#fb-sam-datei', readdirSync(S4).filter((f) => /^(antwort-1\.age|antwort-1-nochmal\.age|antwort-3\.age|antwort-4\.age|brief\.txt)$/.test(f)).map((f) => join(S4, f)));
await page.fill('#fb-sam-text', readFileSync(join(S4, 'antwort-2.txt'), 'utf8'));
await page.getByRole('button', { name: 'Einlesen', exact: true }).click(); await page.waitForSelector('#fb-sam-ergebnis-t'); await page.waitForTimeout(500);
await speichern('sammelimport-protokoll.docx', () => page.getByRole('button', { name: 'Protokoll als Word-Datei' }).click());
await b.close();
