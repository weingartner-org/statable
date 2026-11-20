// D9 (07.11.): Messungen am gebauten Stand für 1.4.13 (Hinweis bei Hover/Fokus), 2.2.1 (Meldungen: Fristen, Verlauf, Rückgängig-Weg), 2.2.2 (Bewegung, prefers-reduced-motion).
// Aufruf (Vorschau auf Port 4200): PORT=4200 node e2e/probe/d9-live.mjs
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4200}/`;
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const aus = [];
const ok = (name, wahr, detail = '') => { aus.push({ name, wahr, detail }); console.log(wahr ? 'JA  ' : 'NEIN', name, detail); };
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
const tipp = page.locator('.tipp.bereit');

/* ---- 1.4.13 ---- */
const ziel = page.locator('header [data-tipp], .kopf [data-tipp], [data-tipp]').first();
const kasten = await ziel.boundingBox();
await page.mouse.move(kasten.x + kasten.width / 2, kasten.y + kasten.height / 2); await page.waitForTimeout(600);
ok('1.4.13 Hover: Hinweis erscheint', await tipp.count() === 1, await tipp.textContent().catch(() => ''));
const tb = await tipp.boundingBox();
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 }); await page.waitForTimeout(1200);
ok('1.4.13 Zeiger auf dem Hinweis: bleibt sichtbar (hoverbar)', await tipp.count() === 1);
await page.waitForTimeout(8000);
ok('1.4.13 ohne Zeitlimit: nach 9 s noch sichtbar', await tipp.count() === 1);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('1.4.13 Esc schließt den Hinweis (ohne Zeiger oder Fokus zu bewegen)', await tipp.count() === 0);
await page.mouse.move(5, 400); await page.waitForTimeout(500);
// Fokus: Tab bis zu einem Element mit data-tipp
let fokusTipp = false, fokusEsc = false;
for (let i = 0; i < 40 && !fokusTipp; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(250); fokusTipp = await tipp.count() === 1; }
ok('1.4.13 Fokus: Hinweis erscheint beim Tabben', fokusTipp);
if (fokusTipp) { await page.waitForTimeout(6000); ok('1.4.13 Fokus: ohne Zeitlimit (nach 6 s noch da)', await tipp.count() === 1); const vorher = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60)); await page.keyboard.press('Escape'); await page.waitForTimeout(300); fokusEsc = await tipp.count() === 0; ok('1.4.13 Fokus: Esc schließt, Fokus bleibt', fokusEsc && vorher === await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60))); }
await page.evaluate(() => (document.activeElement)?.blur());

/* ---- 2.2.1 ---- */
const toasts = page.locator('.toast-ort .toast[role=group]');
await page.keyboard.press('Control+KeyZ'); await page.waitForTimeout(500);   // „Noch nichts zum Rückgängigmachen“ (kein Rückgängig-Knopf)
const n1 = await toasts.count();
const t1 = Date.now();
await page.waitForFunction(() => !document.querySelector('.toast-ort .toast[role=group]'), undefined, { timeout: 12000 }).catch(() => {});
const frist = Math.round((Date.now() - t1 + 500) / 1000);
ok('2.2.1 einfache Meldung erscheint und verschwindet nach rund 7 s', n1 === 1 && frist >= 6 && frist <= 9, `Frist ${frist} s`);
// Anhalten: Zeiger darauf
await page.keyboard.press('Control+KeyZ'); await page.waitForTimeout(400);
const tbx = await toasts.first().boundingBox();
await page.mouse.move(tbx.x + 20, tbx.y + tbx.height / 2); await page.waitForTimeout(9000);
ok('2.2.1 Zeiger auf der Meldung hält die Uhr an (nach 9 s noch da)', await toasts.count() === 1);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('2.2.1 Esc schließt die jüngste Meldung', await toasts.count() === 0);
await page.mouse.move(5, 400);
// Verlauf per Alt+M
await page.keyboard.press('Alt+KeyM'); await page.waitForTimeout(400);
const dlg = page.locator('dialog[open][aria-labelledby=mv-t]');
ok('2.2.1/F5 Alt+M öffnet „Letzte Meldungen“', await dlg.count() === 1);
ok('2.2.1/F5 Verlauf enthält die verschwundene Meldung', (await dlg.locator('li').count()) >= 2, (await dlg.locator('li').first().textContent().catch(() => '') || '').trim());
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// Palette
await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(500);
await page.keyboard.type('Letzte Meldungen'); await page.waitForTimeout(700);
const treffer = await page.locator('dialog.palette[open] [role=option]').first().textContent().catch(() => '');
ok('F5 Palette findet „Letzte Meldungen“', /Letzte Meldungen/i.test(treffer || ''), (treffer || '').trim().slice(0, 80));
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
ok('F5 Palette: Eingabe öffnet den Verlauf', await dlg.count() === 1);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// Rückgängig-Meldung über Suchen und Ersetzen
try {
  await page.goto(U + '#daten'); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Suchen und Ersetzen/ }).first().click(); await page.waitForTimeout(400);
  const suche = page.getByLabel('Suchen nach', { exact: true });
  await suche.fill('1'); await page.waitForTimeout(300);
  await page.getByLabel('Ersetzen durch', { exact: true }).fill('9');
  await page.locator('[id$=-such] button.haupt').first().click({ timeout: 4000 });
  await page.waitForTimeout(1500);
  const rueck = page.locator('.toast-ort .toast[role=group]').filter({ has: page.getByRole('button', { name: 'Rückgängig' }) });
  const text = (await rueck.first().textContent().catch(() => '')) || '';
  ok('F5 Meldung mit „Rückgängig“ nennt Strg+Z', /Strg\+Z/.test(text), text.trim().slice(0, 120));
  const t2 = Date.now();
  await page.mouse.move(5, 400);
  await page.waitForFunction(() => !document.querySelector('.toast-ort .toast[role=group]'), undefined, { timeout: 20000 }).catch(() => {});
  ok('2.2.1 Meldung mit „Rückgängig“ bleibt rund 15 s', Math.abs((Date.now() - t2) / 1000 - 15) < 4, `${Math.round((Date.now() - t2) / 1000)} s (plus bis zu 1,5 s Vorlauf)`);
} catch (e) { ok('F5 Rückgängig-Meldung auslösen', false, String(e).slice(0, 160)); }

/* ---- 2.2.2 ---- */
const ctx2 = await b.newContext({ locale: 'de-DE', reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
const p2 = await ctx2.newPage();
await p2.goto(U + '#beispiele'); await p2.waitForTimeout(1500);
const lauf = await p2.evaluate(() => { const a = document.getAnimations(); return a.filter(x => x.playState === 'running').map(x => ({ n: x.animationName ?? '', dauer: x.effect?.getTiming().duration, wdh: x.effect?.getTiming().iterations })); });
const endlos = lauf.filter(x => x.wdh === Infinity);
ok('2.2.2 reduced-motion: keine endlose Animation auf der Beispiele-Seite', endlos.length === 0, JSON.stringify(endlos));
// Lade-Animation sichtbar machen: Beispiel öffnen und sofort messen
await p2.getByRole('button', { name: /Öffnen und üben/ }).first().click();
const vl = []; for (let i = 0; i < 12; i++) { await p2.waitForTimeout(250); vl.push(await p2.evaluate(() => document.getAnimations().filter(x => x.playState === 'running' && x.effect?.getTiming().iterations === Infinity).map(x => x.animationName))); }
console.log('Endlos-Animationen beim Laden (reduced):', JSON.stringify(vl.flat().filter((v, i, a) => a.indexOf(v) === i)));
const dauerAlle = await p2.evaluate(() => [...document.querySelectorAll('*')].filter(e => !e.classList.contains('p')).map(e => getComputedStyle(e).animationDuration).filter(d => d && d !== '0s').filter((d, i, a) => a.indexOf(d) === i));
ok('2.2.2 reduced-motion: alle Animationen außerhalb der Lade-Punkte auf .01 ms', dauerAlle.every(d => d === '0.00001s' || d === '1e-05s'), JSON.stringify(dauerAlle));
await p2.waitForTimeout(3000);
const nachLaden = await p2.evaluate(() => document.getAnimations().filter(x => x.playState === 'running' && x.effect?.getTiming().iterations === Infinity).length);
ok('2.2.2 nach dem Laden läuft keine endlose Animation mehr', nachLaden === 0, String(nachLaden));
const ohne = await ctx.newPage(); await ohne.goto(U + '#beispiele');
const endlosN = () => ohne.evaluate(() => document.getAnimations().filter(x => x.playState === 'running' && x.effect?.getTiming().iterations === Infinity).map(x => x.animationName));
const beiStart = (await endlosN()).length; await ohne.waitForTimeout(8000);
ok('2.2.2 Normalmodus: die Start-Animation (Laden) läuft nur beim Laden, nach 8 s keine endlose Animation', (await endlosN()).length === 0, `beim Start ${beiStart}, nach 8 s ${(await endlosN()).length}`);
await b.close();
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../ergebnisse/d9-live.json', import.meta.url), JSON.stringify({ erstellt: new Date().toISOString(), messungen: aus }, null, 2));
