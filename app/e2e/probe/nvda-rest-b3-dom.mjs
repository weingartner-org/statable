// DOM-Gegenprobe ohne NVDA (nur Playwright): Ansagen der festen Regionen bei F6b (Bootstrap, Zufall)
import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:4194/';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await b.newContext({ locale: 'de-DE' });
const page = await ctx.newPage();
await page.addInitScript(() => { window.__a = []; document.addEventListener('DOMContentLoaded', () => { const f = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const e = document.getElementById(id); if (e && !e.__b) { e.__b = 1; new MutationObserver(() => { const t = e.textContent.trim(); if (t) window.__a.push({ id, t: t.slice(0, 160), ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } }; f(); setInterval(f, 200); }); });
const dump = async (s) => console.log(s, JSON.stringify(await page.evaluate(() => { const r = window.__a; window.__a = []; return r; })));
for (const [tab, knopf] of [['bootstrap', /Bootstrap rechnen/], ['zufall', /Noch einmal/]]) {
  await page.goto(BASE + '#verstehen/lernlabor/' + tab); await page.waitForTimeout(2500);
  await dump(tab + ': beim Öffnen');
  await page.evaluate(() => (window.__a = []));
  console.log(tab, 'Satz vorhanden vor Klick:', await page.evaluate(() => !!document.querySelector('.ll-satz')));
  await page.getByRole('button', { name: knopf }).first().click(); await page.waitForTimeout(6000);
  await dump(tab + ': nach Start-Klick');
}
await b.close();
