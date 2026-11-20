// Diagnose 2 zur Stufe-4-Prüfung: Was passiert beim Knopf „Redeanteile als Datensatz öffnen“ (Maus-Klick, zum Vergleich mit der Tastatur)?
// Liest danach die Meldungen der Seite und den Zustand des Knopfes. Keine Änderung am App-Code.
// Aufruf aus app/:  node e2e/probe/erheben4-diagnose2.mjs
import { starteBrowser, oeffne, sichern } from './erheben4-lib.mjs';

const b = await starteBrowser();
const out = {};
try {
  const { ctx, page, fehler } = await oeffne(b, { sprache: 'de', breite: 1280 });
  await page.locator('#iv-beispiel').click();
  await page.waitForSelector('#iv-offen-t', { timeout: 60000 });
  await page.waitForTimeout(800);
  const knopf = page.locator('section.offen').getByRole('button', { name: 'Redeanteile als Datensatz öffnen (alle Transkripte)' });
  out.anzahl = await knopf.count();
  out.zustandVorher = await knopf.evaluate((el) => ({ ariaDisabled: el.getAttribute('aria-disabled'), disabled: el.disabled, text: el.innerText })).catch((e) => 'Fehler: ' + e.message.slice(0, 120));
  await knopf.click();
  for (const sek of [3, 10, 25]) {
    await page.waitForTimeout(sek * 1000 / (sek === 3 ? 1 : sek === 10 ? 2 : 3));
    out['nach' + sek] = await page.evaluate(() => ({
      status: [...document.querySelectorAll('[role=status], [role=alert], .melde, .banner')].map((x) => x.innerText.trim()).filter(Boolean).slice(0, 4),
      hash: location.hash,
      dialoge: [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText.slice(0, 80)),
      ladeAnzeige: !!document.querySelector('.rechnet, [class*=rechnet]'),
    }));
  }
  out.seitenfehler = fehler;
  await ctx.close();
} finally {
  await b.close();
  sichern('erheben4-diagnose2.json', out);
  console.log(JSON.stringify(out, null, 1).slice(0, 3000));
}
