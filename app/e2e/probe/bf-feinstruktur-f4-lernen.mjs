// Feinstruktur F4: axe und 320 px auf dem Pfad „Interpretativ auswerten (Feinstrukturanalyse)“, allen sieben Einheiten und dem Abschlusstest.
// Aufruf: PORT=4294 node e2e/probe/bf-feinstruktur-f4-lernen.mjs  (schreibt ../docs/feinstruktur/bf-f4/axe.json)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { U, axe, breite, seite, rec, LOG } from './erheben1-lib.mjs';

const EINHEITEN = ['quali-quanti-paradigma', 'manifest-latent', 'sinneinheiten-bilden', 'feinstruktur-spalten', 'lesarten-pruefen', 'zwischenfazit', 'software-und-deutung', 'abschluss-feinstruktur'];
const b = await chromium.launch();
for (const px of [1280, 320]) {
  const page = await seite(b, px);
  await page.goto(U + '#lernen/pfad/feinstruktur'); await page.waitForTimeout(1800);
  rec({ typ: 'schritt', ort: `Pfad ${px}`, ok: true, text: JSON.stringify((await page.locator('h1,h2').allInnerTexts()).slice(0, 4)) });
  if (px === 1280) await axe(page, 'Pfad', 'Pfadseite'); else await breite(page, 'Pfad 320');
  for (const e of EINHEITEN) {
    await page.goto(U + '#lernen/' + e + '/1'); await page.waitForTimeout(1800);
    const h = (await page.locator('h1,h2').allInnerTexts()).slice(0, 3);
    rec({ typ: 'schritt', ort: `${e} ${px}`, ok: h.length > 0, text: JSON.stringify(h) });
    if (px === 1280) {
      await axe(page, e, 'Einheit');
      const wahl = page.locator('main input[type=radio]').first();
      if (await wahl.count()) { await wahl.check().catch(() => {}); await page.waitForTimeout(400); await axe(page, e, 'nach Antwort'); }
    } else await breite(page, e + ' 320');
  }
  await page.close();
}
await b.close();
fs.mkdirSync('../docs/feinstruktur/bf-f4', { recursive: true });
fs.writeFileSync('../docs/feinstruktur/bf-f4/axe.json', JSON.stringify(LOG, null, 1));
const v = LOG.filter(z => z.typ === 'axe').reduce((s, z) => s + z.verstoesse, 0);
const w = LOG.filter(z => z.typ === 'breite' && z.waagrecht).map(z => z.ort);
console.log(`SUMME axe-Verstöße ${v}; waagrecht rollen: ${JSON.stringify(w)}`);
