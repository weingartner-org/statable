// Paket 2C: Fragebogen planen im echten Chromium. Tastatur-Ablauf (drei Likert-Fragen und ein Filter), axe in allen Ansichten, Datei-Rundreise.
// Aufruf: PORT=5199 node e2e/probe/2c-fragebogen.mjs   (gegen `vite` oder `vite preview`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const U = `http://localhost:${process.env.PORT || 5199}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
const eintraege = async () => (await page.locator('.gl .eintrag').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
const axe = async (name) => {
  await page.waitForTimeout(500);   // Übergänge der Farben abwarten (sonst misst axe mitten im Übergang)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};

// ---- Anlegen, nur mit Tastatur und Knöpfen
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await axe('leerer Plan');
await page.getByRole('button', { name: 'Frage hinzufügen' }).click();
ok((await eintraege()).length === 2, 'Seite und Frage entstehen');
ok(await page.evaluate(() => document.activeElement?.classList.contains('eintrag') && document.activeElement?.textContent.includes('Frage')), 'Fokus liegt auf dem neuen Element');
for (const [de, en] of [['Rauchen Sie?', 'Do you smoke?']]) { await page.fill('#fb-fragetext-de', de); await page.fill('#fb-fragetext-en', en); await page.keyboard.press('Tab'); }
// Likert-Fragen aus der Vorlage
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
const nach = await eintraege();
ok(nach.filter(t => t.startsWith('Frage')).length === 4, 'vier Fragen in der Gliederung');
ok(await page.locator('[data-testid=fb-listennutzung]').count() === 1, 'Hinweis „in n Fragen benutzt“ steht im Formular');
ok((await page.locator('[data-testid=fb-listennutzung]').innerText()).includes('3'), 'die Liste wird in 3 Fragen benutzt');
// Filter: letzte Frage nur zeigen, wenn „Rauchen Sie?“ = Ja (Ja/Nein-Liste für die erste Frage über neue Vorlage nicht nötig: Bedingung auf Zahl)
await page.getByRole('button', { name: 'Filter hinzufügen' }).click();
const satz = await page.locator('[data-testid=fb-bedingungssatz]').innerText();
ok(/^Nur zeigen, wenn ‚.+‘ = ‚.+‘$/.test(satz), 'Bedingung als Satz: ' + satz);
// Tastatur: Alt+Pfeil verschiebt, Entf fragt zurück
await page.locator('.gl .eintrag[aria-current=true]').focus();
const vorher = await eintraege();
await page.keyboard.press('Alt+ArrowUp'); await page.waitForTimeout(200);
const verschoben = await eintraege();
ok(JSON.stringify(vorher) !== JSON.stringify(verschoben), 'Alt+Pfeil hoch verschiebt');
await page.keyboard.press('ArrowUp'); await page.keyboard.press('Delete');
ok(await page.locator('dialog[open]').count() === 1, 'Entf öffnet die Rückfrage');
ok(await page.evaluate(() => document.activeElement?.id === 'fbrf-nein'), 'Fokus der Rückfrage auf „Abbrechen“');
await axe('Rückfrage');
await page.keyboard.press('Escape');
ok(await page.locator('dialog[open]').count() === 0, 'Esc schließt die Rückfrage, nichts gelöscht: ' + ((await eintraege()).length === verschoben.length));
await page.getByRole('button', { name: /Rückgängig/ }).first().click();

// ---- Ansichten und axe
await axe('Gliederung und Bearbeiten');
await page.getByRole('button', { name: 'Handy' }).click(); await axe('Vorschau Handy');
await page.getByRole('button', { name: 'Antwortlisten' }).click(); await page.waitForSelector('table.opt'); await axe('Antwortlisten');
await page.getByRole('button', { name: 'Kodebuch' }).click(); await page.waitForSelector('table.kodebuch'); await axe('Kodebuch');
const kopf = await page.locator('table.kodebuch thead th').allInnerTexts();
ok(kopf.length === 6 && (await page.locator('table.kodebuch th[scope=col]').count()) === 6, 'Kodebuch: Tabelle mit th scope=col, 6 Spalten');
await page.getByRole('button', { name: 'Gliederung und Bearbeiten' }).click();

// ---- Datei-Rundreise
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als Datei speichern' }).click()]);
const dir = mkdtempSync(join(tmpdir(), 'fb-')); const pfad = join(dir, dl.suggestedFilename());
await dl.saveAs(pfad);
ok(/\.statable-fragebogen\.json$/.test(pfad), 'Dateiname endet auf .statable-fragebogen.json');
const inhalt = JSON.parse(readFileSync(pfad, 'utf8'));
ok(inhalt.format === 'statable-fragebogen-datei' && inhalt.plan.format === 'statable-fragebogen', 'Dateiformat');
await page.locator('.werkzeug input[type=file]').setInputFiles(pfad); await page.waitForTimeout(500);
ok((await page.locator('#fb-plan option').count()) === 2, 'geöffnete Datei ist ein zweiter Plan');
// kaputte Datei
const kaputt = join(dir, 'kaputt.json'); writeFileSync(kaputt, '{"format":"nix"}');
await page.locator('.werkzeug input[type=file]').setInputFiles(kaputt); await page.waitForTimeout(400);
ok((await page.locator('#fb-plan option').count()) === 2, 'kaputte Datei legt keinen Plan an');


// ---- Block (Aussagen-Tabelle), Bild mit Pflicht-Alternativtext, XLSForm
await page.setViewportSize({ width: 1400, height: 900 });
await page.getByRole('button', { name: 'Gliederung und Bearbeiten' }).click();
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zufriedenheit5');
await page.getByLabel('Als Block mit drei Aussagen').check();
await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
ok(await page.locator('table.items').count() === 1, 'Block zeigt die Tabelle der Aussagen');
await axe('Block mit Aussagen-Tabelle');
ok((await page.locator('table.items th[scope=col]').count()) >= 4, 'Aussagen-Tabelle hat Spaltenköpfe (th scope=col)');
const bildPfad = join(dir, 'karte.svg'); writeFileSync(bildPfad, '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15"/></svg>');
await page.getByRole('button', { name: 'Frage hinzufügen' }).click();
await page.locator('.fo input[type=file]').setInputFiles(bildPfad); await page.waitForSelector('#fb-bild-alt-de');
ok((await page.locator('#fb-bild-alt-de[aria-invalid]').count()) === 0, 'Alternativtext-Feld da (Pflicht-Hinweis steht als Text)');
ok((await page.locator('.bf').innerText()).includes('bild-alt'), 'Befund bild-alt ohne Alternativtext');
await page.fill('#fb-bild-alt-de', 'Ein Kreis'); await page.fill('#fb-bild-alt-en', 'A circle'); await page.keyboard.press('Tab');
ok(!(await page.locator('.bf').innerText()).includes('bild-alt'), 'mit Alternativtext in beiden Sprachen verschwindet der Befund');
await axe('Frage mit Bild');
const xl = new URL('../../src/lib/testdaten/dienste/xlsform/mensa.xlsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
await page.locator('.werkzeug input[type=file]').setInputFiles(xl); await page.waitForTimeout(1500);
ok((await page.locator('#fb-plan option').count()) === 3, 'XLSForm geöffnet als weiterer Plan');
ok(await page.locator('.gl .eintrag').count() > 2, 'XLSForm: Gliederung gefüllt');
await axe('geöffnete XLSForm');

// ---- schmales Fenster: Spalten untereinander, nichts läuft über
await page.setViewportSize({ width: 360, height: 800 }); await page.waitForTimeout(500);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'bei 360 px kein waagrechtes Scrollen der Seite');
await b.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
