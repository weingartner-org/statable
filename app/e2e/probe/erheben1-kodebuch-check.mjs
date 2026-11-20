// Erkundung: Warum erreicht der Tab-Durchlauf die Schaltflächen „Kodebuch“ und „Fragebogen“ im Dialog nicht? PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#start'); await page.waitForTimeout(1200);
await page.locator('input[type=file]').first().setInputFiles('C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/msforms/msforms-en.xlsx');
await page.getByRole('heading', { name: /Fragebogen erkannt/ }).waitFor({ timeout: 10000 });
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.fb button')].filter(e => /Kodebuch|Fragebogen/.test(e.innerText));
  return btns.map(e => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    const anc = []; let p = e; while (p && p !== document.body) { const cs = getComputedStyle(p); if (p.hasAttribute('inert') || p.getAttribute('aria-hidden') === 'true' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || p.hasAttribute('hidden')) anc.push(p.tagName + '.' + String(p.className).slice(0, 30) + ' inert=' + p.hasAttribute('inert') + ' aria-hidden=' + p.getAttribute('aria-hidden') + ' vis=' + cs.visibility + ' pe=' + cs.pointerEvents); p = p.parentElement; }
    return { text: e.innerText.trim(), parent: e.parentElement.tagName + '.' + e.parentElement.className, tabIndex: e.tabIndex, disabled: e.disabled, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], display: s.display, vis: s.visibility, anc, outerHTML: e.outerHTML.slice(0, 160) };
  });
});
console.log(JSON.stringify(info, null, 1));
// Fokus direkt setzen und prüfen
const fokus = await page.evaluate(() => {
  const e = [...document.querySelectorAll('.fb button')].find(x => /Kodebuch/.test(x.innerText));
  if (!e) return 'nicht gefunden';
  e.focus(); return document.activeElement === e ? 'Fokus gesetzt' : 'Fokus NICHT gesetzt: ' + (document.activeElement?.tagName);
});
console.log('FOKUS-DIREKT', fokus);
// Erste Elemente der Tab-Reihenfolge ab Seitenanfang
await page.evaluate(() => document.activeElement?.blur());
const folge = [];
for (let k = 0; k < 14; k++) { await page.keyboard.press('Tab'); folge.push(await page.evaluate(() => { const e = document.activeElement; return e.tagName + '[' + (e.type || '') + ']:' + (e.getAttribute('aria-label') || e.innerText || e.value || '').trim().slice(0, 30); })); }
console.log('TAB-FOLGE-AB-SEITENANFANG', JSON.stringify(folge));
await b.close();
