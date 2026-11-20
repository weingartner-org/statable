// Paket 2G: „Fragebogen planen“ mit offenem Export-Menü, gesperrtem Menü und Pretest (Kommentar, Durchgang merken, Zahl in der Gliederung): axe 0 Verstöße, Downloads.
// Aufruf: PORT=5199 node e2e/probe/2g-export-pretest.mjs   (gegen `vite` oder `vite preview`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const U = `http://localhost:${process.env.PORT || 5199}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
const axe = async (name) => {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};

// Plan mit einer Vorlagenfrage
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zustimmung5');
await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();

// ---- Export-Menü
const menue = page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ });
ok(await menue.getAttribute('aria-expanded') === 'false', 'Menüknopf ist zu');
await menue.click();
ok(await menue.getAttribute('aria-expanded') === 'true', 'Menüknopf ist auf');
ok(await page.locator('#fb-ex-liste ul button').count() === 10, 'zehn Einträge als echte Knöpfe');
const gesperrt = await page.locator('[data-testid=fb-ex-gesperrt]').count();
console.log(gesperrt ? 'Menü gesperrt: ' + (await page.locator('#fb-ex-grund').innerText()) : 'Menü frei');
await axe(gesperrt ? 'Export-Menü offen, gesperrt' : 'Export-Menü offen');
if (gesperrt) {
  const [mit] = await Promise.all([page.waitForEvent('download', { timeout: 1500 }).then(() => true, () => false), page.locator('#fb-ex-liste ul button').first().click({ force: true })]);
  ok(!mit, 'gesperrter Eintrag erzeugt keine Datei');
  ok(await page.getByRole('button', { name: 'Zum ersten Fehler springen' }).count() === 1, 'Sprunglink zum ersten Fehler');
}
await page.keyboard.press('Escape');
ok(await menue.getAttribute('aria-expanded') === 'false', 'Esc schließt das Menü');
ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'fb-ex-liste'), 'Fokus zurück auf dem Menüknopf');

// ---- Pretest
await page.getByText('Titel, Sprachen und Einstellungen des Fragebogens').click();
await page.getByLabel('Pretest-Modus (Kommentar je Frage)').check();
ok(await page.locator('[data-testid=fb-pretest]').count() === 1, 'Pretest-Abschnitt erscheint');
await page.waitForSelector('.vo textarea[data-kommentar]');
ok(await page.locator('.vo textarea[data-kommentar]').count() >= 1, 'Vorschau zeigt das Kommentarfeld');
await page.locator('.vo textarea[data-kommentar]').first().fill('Wen meinen Sie mit „Sie“?');
await page.getByRole('button', { name: 'Durchgang merken (Pretest)' }).click();
await page.waitForTimeout(300);
ok((await page.locator('[data-testid=fb-pretest-zahl]').innerText()).includes('1 Kommentar gesammelt'), 'Zahl der Kommentare: 1');
ok((await page.locator('.gl .marke', { hasText: '1 Kommentar' }).count()) === 1, 'Gliederung zeigt „1 Kommentar“ an der Frage');
await page.locator('.gl .eintrag:not(.seite)').first().click();
ok((await page.locator('[data-testid=fb-kommentare]').innerText()).includes('Wen meinen Sie'), 'Formular listet den Kommentar');
await axe('Pretest mit Kommentar');
await menue.click(); await axe('Pretest und offenes Export-Menü');

// ---- Download (nur wenn nicht gesperrt): Papier Großdruck
if (!gesperrt) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(async e => { console.log('kein Download; Seite sagt:', (await page.locator('[role=status],[aria-live]').allInnerTexts()).join(' / ').slice(0, 500)); throw e; }), page.getByRole('button', { name: /Papierbogen, Großdruck/ }).click()]);
  const dir = mkdtempSync(join(tmpdir(), 'fb2g-')); const pfad = join(dir, dl.suggestedFilename()); await dl.saveAs(pfad);
  ok(/Großdruck\.docx$/.test(pfad), 'Großdruck: ' + dl.suggestedFilename());
  writeFileSync(join(dir, 'ende.txt'), pfad);
  console.log('Datei', pfad);
}
await page.setViewportSize({ width: 360, height: 800 }); await page.waitForTimeout(400);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'bei 360 px kein waagrechtes Scrollen');
await b.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
