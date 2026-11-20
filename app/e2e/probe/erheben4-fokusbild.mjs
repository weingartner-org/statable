// Stufe 4, Punkt 3/4: sichtbarer Fokus am Dateifeld „Codebuch einlesen (.qdc)“ (Tastatur). Speichert einen Bildausschnitt.
// Aufruf aus app/:  node e2e/probe/erheben4-fokusbild.mjs
import { starteBrowser, oeffne, leerKlick, ERG, sichern } from './erheben4-lib.mjs';
const b = await starteBrowser();
const out = {};
try {
  const { ctx, page } = await oeffne(b, { sprache: 'de', breite: 1280 });
  await leerKlick(page);
  let gefunden = false;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const n = await page.evaluate(() => (document.activeElement ? window.bfName(document.activeElement) : ''));
    if (/Codebuch einlesen/.test(n) && n.length < 80) { gefunden = true; break; }
  }
  out.gefunden = gefunden;
  if (gefunden) {
    out.fokus = await page.evaluate(() => {
      const a = document.activeElement; const r = a.getBoundingClientRect(); const lab = a.closest('label'); const lr = lab.getBoundingClientRect();
      const cs = getComputedStyle(a); const ls = getComputedStyle(lab);
      return { eingabe: { tag: a.tagName, typ: a.type, breite: r.width, hoehe: r.height, outline: cs.outlineStyle + ' ' + cs.outlineWidth, clip: cs.clip }, beschriftung: { breite: Math.round(lr.width), hoehe: Math.round(lr.height), outline: ls.outlineStyle + ' ' + ls.outlineWidth, rahmen: ls.borderTopStyle + ' ' + ls.borderTopWidth, schatten: ls.boxShadow } };
    });
    const lab = page.locator('label.kodl-datei');
    await lab.scrollIntoViewIfNeeded();
    const box = await lab.boundingBox();
    await page.screenshot({ path: `${ERG}\erheben4-fokus-codebuch.png`, clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 } });
    out.bild = `${ERG}\erheben4-fokus-codebuch.png`;
  }
  await ctx.close();
} finally {
  await b.close();
  sichern('erheben4-fokusbild.json', out);
  console.log(JSON.stringify(out, null, 1));
}
