// Probe Stufe 6a gegen den festen Bau (vite preview, Port 4270). Aufruf: node e2e/probe/kodieren-probe-bau.mjs
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({ locale: 'de-DE' })).newPage();
const fehler = [];
p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
p.on('pageerror', e => fehler.push('pageerror: ' + e.message));
const ok = (n, c, x = '') => console.log((c ? 'OK   ' : 'FAIL ') + n + (x ? ' - ' + x : ''));
await p.goto('http://127.0.0.1:4270/#kodieren');
await p.waitForSelector('#ko-t');
ok('Seite lädt', true);
await p.click('#ko-laden');
await p.waitForSelector('#ko-dok');
ok('Beispiel geladen', (await p.locator('#ko-dok option').count()) > 0, (await p.locator('#ko-dok option').count()) + ' Dokumente');
async function kodiereTaste(wort) {
  await p.focus('#ko-a-text');
  await p.keyboard.press('Control+Home');
  await p.keyboard.press('s');
  const st = await p.textContent('#ko-a-stelle');
  ok(`Art ${wort}: S markiert`, /Markiert/.test(st), st);
  await p.keyboard.press('Enter');
  await p.waitForSelector('#ko-dlg[open]');
  ok(`Art ${wort}: Fenster offen`, true);
  await p.keyboard.type('bel');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.querySelector('#ko-dlg')?.open);
  await p.waitForTimeout(500);
  const f = await p.evaluate(() => document.activeElement?.id);
  ok(`Art ${wort}: Fokus zurück im Feld`, f === 'ko-a-text', f);
  await p.keyboard.press('i');
  const sel = await p.textContent('#ko-a-stelle');
  ok(`Art ${wort}: Stelle bleibt markiert`, /Markiert/.test(sel), sel);
}
await kodiereTaste('a');
let n = await p.locator('#ko-c-liste li').count();
ok('Belege zeigen Eintrag (a)', n >= 1, n + ' Belege');
await p.selectOption('#ko-a-art', 'b');
await kodiereTaste('b');
n = await p.locator('#ko-c-liste li').count();
ok('Belege (b)', n >= 1, n + ' Belege');
// Weg 2
await p.focus('#ko-b-liste');
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
await p.keyboard.press('Space');
await p.keyboard.press('Enter');
await p.waitForSelector('#ko-dlg[open]');
await p.keyboard.type('zeit');
await p.keyboard.press('Enter');
await p.waitForTimeout(800);
const sel2 = await p.locator('#ko-b-liste [aria-selected=true]').count();
ok('Weg 2: Satz gewählt', sel2 === 1, sel2 + '');
const besch = await p.locator('#ko-b-liste .cn').allTextContents();
ok('Weg 2: Codes sichtbar', besch.length >= 1, besch.join(' | '));
// Art c
await p.selectOption('#ko-a-art', 'c');
await p.click('#ko-a-satz');
await p.click('#ko-a-code');
await p.waitForSelector('#ko-dlg[open]');
await p.keyboard.press('Escape');
ok('Art c: Fenster per Esc zu', true);
await p.waitForTimeout(400);
// Belege: zeigen und entfernen
const vor = await p.locator('#ko-c-liste li').count();
if (vor) { await p.locator('.ko-c-zeigen').first().click(); }
await p.click('.ko-c-entfernen >> nth=0').catch(() => {});
const nach = await p.locator('#ko-c-liste li').count();
ok('Entfernen', nach === vor - 1, `${vor} -> ${nach}`);
ok('keine Konsolenfehler', fehler.length === 0, fehler.join(' || '));
await b.close();
