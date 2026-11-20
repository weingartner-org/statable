// Vorher/Nachher-Bilder der Dokument-Exporte. Aufruf: node design-bilder.mjs <Basis-URL> <ausgabeordner> [mitLogoAus]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [, , BASIS, AUS, LOGOAUS] = process.argv;
mkdirSync(AUS, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const wart = ms => page.waitForTimeout(ms);
const speichere = async (ausloeser, name) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), ausloeser()]);
  await d.saveAs(`${AUS}/${name}`); console.log('OK', name, d.suggestedFilename()); await wart(1500);
};
await page.goto(BASIS); await wart(2000);
await page.getByRole('button', { name: /Beispiel öffnen/ }).first().click(); await wart(3500);
await page.getByRole('button', { name: /Rundgang beenden/ }).click({ timeout: 3000 }).catch(() => {});
async function verteilung(label) {
  await page.getByText('Neue Auswertung', { exact: true }).first().click(); await wart(1000);
  await page.getByText('Wie verteilt sich etwas?').first().click(); await wart(1000);
  await page.getByText(label).first().click();
  await page.getByRole('button', { name: /Fertig/ }).click(); await wart(4000);
  const k = page.getByRole('button', { name: /keine Angabe.*behandeln/ });
  if (await k.count()) { await k.click(); await wart(5000); }
  await wart(3000);
}
await verteilung('Schlaf (Stunden pro Nacht)');
await verteilung('Konzentration (Punkte)');
// Diagramm-PNG (Export-Menü am Diagramm)
async function diagramm(name) {
  const ex = page.locator('button:has-text("Gestalten")').first().locator('xpath=following::button[contains(.,"Export")][1]');
  await ex.scrollIntoViewIfNeeded(); await ex.click(); await wart(400);
  await speichere(() => page.getByText(/PNG \(300 dpi/).first().click(), name);
  await page.keyboard.press('Escape');
}
await diagramm('diagramm.png');
if (LOGOAUS) {
  await page.goto(BASIS + '#einstellungen'); await wart(1500);
  await page.getByText('Statable-Logo klein unten in Diagrammen').first().click(); await wart(500);
  await page.getByRole('button', { name: /^Daten$/ }).first().click().catch(() => {}); 
  await page.goto(BASIS + '#daten'); await wart(1500);
  await page.getByText(/Verteilung: Konzentration/).first().click().catch(() => {}); await wart(2500);
  await diagramm('diagramm-ohne-logo.png');
}
await page.goto(BASIS + '#bericht'); await wart(4000);
await page.screenshot({ path: `${AUS}/bericht-seite.png`, fullPage: true });
const knopf = n => page.getByRole('button', { name: n }).first();
await speichere(() => knopf(/Als Word/).click(), 'bericht.docx');
// Einfaches PDF (jsPDF) gibt es seit 10.11.2026 nicht mehr; jedes PDF entsteht über die Druckansicht.
await speichere(() => knopf(/Als Excel/).click(), 'ergebnisse.xlsx');
// Druckansicht
const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 60000 }), knopf(/Als PDF \(über Drucken/).click()]);
await pop.waitForLoadState(); await wart(2500);
await pop.pdf({ path: `${AUS}/druck.pdf`, format: 'A4', displayHeaderFooter: false, preferCSSPageSize: true, printBackground: true });
console.log('OK druck.pdf');
await b.close();
