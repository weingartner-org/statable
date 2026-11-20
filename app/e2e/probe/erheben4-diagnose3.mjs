// Diagnose 3 zur Stufe-4-Prüfung: Enter mit der Tastatur auf „Redeanteile als Datensatz öffnen“ - landet der Fokus auf dem richtigen Knopf,
// und kommt die Meldung „Datensatz erzeugt“? Nur Tastatur (Tab, Enter), kein Maus-Klick auf den Knopf.
// Aufruf aus app/:  node e2e/probe/erheben4-diagnose3.mjs
import { starteBrowser, oeffne, leerKlick, sichern } from './erheben4-lib.mjs';

const b = await starteBrowser();
const out = {};
try {
  const { ctx, page, fehler } = await oeffne(b, { sprache: 'de', breite: 1280 });
  await leerKlick(page);
  // Beispielinterview per Tastatur öffnen
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const n = await page.evaluate(() => (document.activeElement ? window.bfName(document.activeElement) : ''));
    if (n === 'Beispielinterview laden (erfunden)') break;
  }
  await page.keyboard.press('Enter');
  await page.waitForSelector('#iv-offen-t', { timeout: 60000 });
  await page.waitForTimeout(800);
  if (process.env.PLAY) { let n3 = 0; for (let i = 0; i < 400 && n3 < 3; i++) { await page.keyboard.press('Tab'); const nm = await page.evaluate(() => (document.activeElement ? window.bfName(document.activeElement) : '')); if (/^Ab hier abspielen/.test(nm)) n3++; } await page.keyboard.press('Enter'); await page.waitForTimeout(2500); out.spielt = await page.evaluate(() => window.bfLaeuft()); }
  // bis zum Knopf per Tab
  let gefunden = false;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => { const a = document.activeElement; return a ? { n: window.bfName(a), tag: a.tagName, dis: a.getAttribute('aria-disabled'), html: a.outerHTML.slice(0, 160) } : null; });
    if (info && info.tag === 'BUTTON' && info.n === 'Redeanteile als Datensatz öffnen (alle Transkripte)') { out.fokus = info; gefunden = true; break; }
  }
  out.gefunden = gefunden;
  if (gefunden) {
    await page.keyboard.press('Enter');
    for (const s of [2, 6, 12]) {
      await page.waitForTimeout(s * 1000);
      out['nach' + s + 's'] = await page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert], .melde')].map((x) => x.innerText.trim()).filter(Boolean).slice(-2));
    }
  }
  out.seitenfehler = fehler;
  await ctx.close();
} finally {
  await b.close();
  sichern('erheben4-diagnose3.json', out);
  console.log(JSON.stringify(out, null, 1).slice(0, 2500));
}
