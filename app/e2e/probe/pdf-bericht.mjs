// Prüfhilfe Block C (PDF/UA): öffnet die Beispiel-Auswertung, baut den Bericht und fängt das HTML der Druckansicht ab. Läuft gegen eine Vorschau auf Port 4194.
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const c = await b.newContext({locale:'de-DE', viewport:{width:1280,height:900}}); const p = await c.newPage();
await p.addInitScript(() => { window.__html = []; const w = Document.prototype.write; Document.prototype.write = function (...a) { try { (window.top.__html ||= []).push(a.join('')); } catch {} return w.apply(this, a); }; window.open = () => null; });
await p.goto('http://localhost:4194/#beispiele'); await p.waitForTimeout(1500);
await p.getByRole('button',{name:'Öffnen und üben'}).first().click(); await p.waitForTimeout(3000); await p.keyboard.press('Escape');
await p.evaluate(()=>location.hash='blatt/neu'); await p.waitForTimeout(1200);
await p.getByRole('button',{name:/Unterscheiden sich Gruppen/}).first().click(); await p.waitForTimeout(1200);
await p.getByRole('button',{name:/Welche Gruppen/}).click(); await p.waitForTimeout(500);
await p.locator('input[type=radio][value=klasse]').click(); await p.waitForTimeout(800);
await p.locator('input[type=radio][value=lesen_vor]').click(); await p.waitForTimeout(8000);
await p.evaluate(()=>location.hash='blatt/neu'); await p.waitForTimeout(1200);
await p.getByRole('button',{name:/Wie verteilt sich etwas/}).first().click(); await p.waitForTimeout(1200);
await p.locator('input[type=checkbox]').nth(3).click(); await p.getByRole('button',{name:/Fertig/}).click(); await p.waitForTimeout(8000);
await p.evaluate(()=>location.hash='bericht'); await p.waitForTimeout(1500);
await p.getByRole('button',{name:'Als PDF (über Drucken)'}).click(); await p.waitForTimeout(6000);
const html = await p.evaluate(()=>window.__html.join('\n'));
console.log('HTML-Länge', html.length);
import { writeFileSync } from 'node:fs';
const aus = process.env.PDF_AUS || '../pruefdaten/barrierefrei/pdf-' + (process.env.PDF_NAME || 'nachher');
writeFileSync(aus + '.html', html);
await b.close();
// Gleiches HTML mit drei Schreibern drucken: eingebautes Chromium, Edge, Chrome (alle über page.pdf, tagged + outline).
for (const [name, kanal] of [['chromium', undefined], ['edge', 'msedge'], ['chrome', 'chrome']]) {
  try {
    const br = await chromium.launch(kanal ? { channel: kanal } : {}); const q = await (await br.newContext({ locale: 'de-DE' })).newPage();
    await q.setContent(html, { waitUntil: 'load' }); await q.waitForTimeout(1500);
    await q.pdf({ path: aus + '-' + name + '.pdf', format: 'A4', tagged: true, outline: true, printBackground: true });
    console.log('PDF', name, br.version()); await br.close();
  } catch (e) { console.log('FEHLER', name, String(e).slice(0, 200)); }
}
