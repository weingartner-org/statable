import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:4194/';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
const w = (ms) => page.waitForTimeout(ms);
await page.addInitScript(() => { window.__verz = 0; window.__a = []; const _o = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, t) { if (window.__verz && m && m.op === 'run' && /T-TEST|ONEWAY|UNIANOVA|EXAMINE|DESCRIPTIVES/i.test(m.syntax || '')) { const s = this; setTimeout(() => _o.call(s, m, t), window.__verz); return; } return _o.call(this, m, t); };
  document.addEventListener('DOMContentLoaded', () => { const f = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const e = document.getElementById(id); if (e && !e.__b) { e.__b = 1; new MutationObserver(() => { const t = e.textContent.trim(); window.__a.push({ id, t: t.slice(0, 100), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }; f(); setInterval(f, 200); }); });
await page.goto(BASE + '#beispiele'); await w(1500);
const k = page.locator('*:has-text("Hilft das Lesetraining")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
await k.getByRole('button', { name: /Öffnen und üben/ }).click();
await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
const e = page.getByRole('button', { name: 'Rundgang beenden' }); if (await e.isVisible().catch(() => false)) await e.click();
await page.goto(BASE + '#blatt/neu'); await w(1000);
await page.getByText(/Unterscheiden sich Gruppen/).first().click();
await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await w(800);
await page.locator('input[value="klasse"]').first().click({ force: true });
await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await w(2500);
const dump = async (s) => console.log(s, JSON.stringify(await page.evaluate(() => { const r = window.__a; window.__a = []; return r; })), 'NeuRechnen-Knopf:', await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => /Neu rechnen/.test(b.textContent)).length), 'ueberholt:', await page.evaluate(() => document.querySelectorAll('.ueberholt').length));
await dump('nach erster Rechnung');
await page.evaluate(() => { console.log('x'); const b = [...document.querySelectorAll('main button.luecke')]; window.__lk = b.map((x) => x.textContent.trim().slice(0, 30) + '|' + (x.offsetParent ? 'sichtbar' : 'versteckt')); }); console.log(JSON.stringify(await page.evaluate(() => window.__lk))); console.log('Anhaltspunkt: ', await page.evaluate(() => [...document.querySelectorAll('details')].map((d) => d.open + ':' + d.querySelector('summary')?.textContent.trim().slice(0, 30)).join(' / ')));


await page.evaluate(() => { for (const d of document.querySelectorAll('details')) if (/Spalten und Optionen ändern/.test(d.querySelector('summary')?.textContent ?? '')) d.open = true; });
await w(500);
await page.locator('main button.luecke', { hasText: 'Klasse (ändern)' }).first().click(); await w(1000);
console.log('Radios:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main input[type=radio]')].filter((x) => x.offsetParent).map((x) => x.name + '=' + x.value + (x.checked ? '*' : '')))));
console.log('Knöpfe:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main button')].filter((x) => x.offsetParent).map((x) => x.textContent.trim().slice(0, 30)).slice(0, 14))));
for (const verz of [0, 4000]) {
  await page.evaluate((v) => { window.__verz = v; window.__a = []; }, verz);
  const wert = await page.evaluate(() => { const r = [...document.querySelectorAll('#wahl input[type=radio], main input[type=radio]')].filter((x) => x.offsetParent && !x.checked && /^(gruppe|geschlecht|klasse)$/.test(x.value))[0]; return r ? r.value + '|' + r.name : '|'; });
  const [v1, n1] = wert.split('|'); console.log('Wahl', wert);
  if (!v1) break;
  await page.locator('input[name="' + n1 + '"][value="' + v1 + '"]').click({ force: true });
  await w(verz ? 1500 : 3500); await dump('verz ' + verz + ' nach Wahl ' + v1);
  if (verz) { await w(9000); await dump('verz ' + verz + ' später'); }
}
await b.close();
