// Echter Kontrastmodus: Auswertung mit Tabelle und Diagramm, in Edge und Chrome. Aufruf: node kontrast-echt-auswertung.mjs <ordner-suffix>
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs'; import http from 'node:http'; import { join, extname } from 'node:path';
const suffix = process.argv[2] ?? 'hell';
const root = new URL('../../dist-kontrast/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const typ = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.wasm':'application/wasm' };
const srv = http.createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html'); if (!existsSync(p)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', typ[extname(p)] ?? 'application/octet-stream'); r.end(readFileSync(p)); }).listen(4191, "127.0.0.1");
const aus = new URL(`../ergebnisse/kontrast-auswertung-${suffix}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'); mkdirSync(aus, { recursive: true });
for (const kanal of ['msedge', 'chrome']) {
  const b = await chromium.launch({ channel: kanal, headless: true });
  const c = await b.newContext({ forcedColors: null, locale: 'de-DE', viewport: { width: 1200, height: 900 } });
  const p = await c.newPage();
  const log = (...a) => console.log(kanal, ...a);
  try {
    await p.goto('http://127.0.0.1:4192/#beispiele'); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: /Öffnen und üben/ }).first().click({ timeout: 20000 });
    await p.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
    const ende = p.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
    log('forced', await p.evaluate(() => matchMedia('(forced-colors: active)').matches));
    await p.screenshot({ path: aus + `${kanal}-daten.png` });
    await p.goto('http://127.0.0.1:4192/#blatt/neu'); await p.waitForTimeout(1200);
    await p.getByRole('button', { name: /Wie verteilt sich etwas/i }).first().click({ timeout: 20000 }); await p.waitForTimeout(1500);
    await p.screenshot({ path: aus + `${kanal}-karte.png` });
    const lv = p.getByRole('checkbox').first(); if (await lv.count()) await lv.check().catch(() => {});
    const fertig = p.getByRole('button', { name: /Fertig/ }).first(); if (await fertig.isVisible().catch(() => false)) await fertig.click();
    await p.waitForTimeout(9000);
    log('tabellen', await p.evaluate(() => document.querySelectorAll('table').length), 'svg', await p.evaluate(() => document.querySelectorAll('svg').length));
    await p.screenshot({ path: aus + `${kanal}-ergebnis.png`, fullPage: false });
    await p.evaluate(() => window.scrollBy(0, 700)); await p.waitForTimeout(500);
    await p.screenshot({ path: aus + `${kanal}-ergebnis2.png` });
  } catch (e) { log('FEHLER', String(e).slice(0, 300)); await p.screenshot({ path: aus + `${kanal}-fehler.png` }).catch(() => {}); }
  await b.close();
}
srv.close();
