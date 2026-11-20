// Echter Windows-Kontrastmodus: keine Emulation (forcedColors: null), Edge, Fokus per Tab, Fotos.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import http from 'node:http'; import { readFileSync, existsSync, statSync } from 'node:fs'; import { join, extname } from 'node:path';
const root = new URL('../../dist-kontrast/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const typ = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.wasm':'application/wasm' };
const srv = http.createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html'); if (!existsSync(p)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', typ[extname(p)] ?? 'application/octet-stream'); r.end(readFileSync(p)); }).listen(4190, '127.0.0.1');
const aus = new URL('../ergebnisse/kontrast-echt-hell/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'); mkdirSync(aus, { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true });
const c = await b.newContext({ forcedColors: null, locale: 'de-DE', viewport: { width: 1200, height: 800 } });
const p = await c.newPage();
const info = {};
for (const route of ['start', 'beispiele', 'hilfe', 'einstellungen']) {
  await p.goto(`http://127.0.0.1:4190/#${route}`); await p.waitForTimeout(1500);
  info.forced = await p.evaluate(() => matchMedia('(forced-colors: active)').matches);
  const werte = [];
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName, name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), outline: s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; });
    werte.push(f);
    if (i === 2) await p.screenshot({ path: aus + `${route}-tab3.png` });
  }
  info[route] = werte;
}
console.log(JSON.stringify(info, null, 1));
await b.close(); srv.close();

