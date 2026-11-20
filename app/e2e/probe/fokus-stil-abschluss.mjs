// Abschluss Welle 7: Fokusdarstellung je Tab-Stopp im Normalmodus (berechneter Stil). Kein Foto, nur outline/box-shadow des Fokuselements.
import { chromium } from '@playwright/test';
const U = 'http://127.0.0.1:4195/';
const R = ['start','beispiele','daten','spalten','umformen','karte','blatt/neu','protokoll','befehle','bericht','einstellungen','hilfe','planen','verstehen','lernen','r-probe','impressum','datenschutz','behoerden','tabelle','amtlich','bearbeiten','hilfe/daten-seite','hilfe/fallgewichte','lernen/pfad/grundlagen','verstehen/verteilungen','verstehen/kennzahlen'];
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
let gesamt = 0; const ohne = [];
for (const r of R) {
  await page.goto(U + '#' + r); await page.waitForTimeout(800);
  await page.evaluate(() => { (document.activeElement)?.blur(); const b = document.body; b.setAttribute('tabindex','-1'); b.focus({preventScroll:true}); b.blur(); b.removeAttribute('tabindex'); scrollTo(0,0); });
  const ids = new Set();
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const x = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; if (!e.dataset.fs) e.dataset.fs = Math.random().toString(36).slice(2); const s = getComputedStyle(e); const ow = parseFloat(s.outlineWidth) || 0; const ok = (s.outlineStyle !== 'none' && ow >= 2 && s.outlineColor !== 'rgba(0, 0, 0, 0)') || (s.boxShadow && s.boxShadow !== 'none'); return { id: e.dataset.fs, ok, d: `${e.tagName.toLowerCase()}.${(e.className||'').toString().split(' ')[0]} "${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30)}" outline=${s.outlineStyle} ${s.outlineWidth} shadow=${(s.boxShadow||'').slice(0,40)}` }; });
    if (!x || ids.has(x.id)) break; ids.add(x.id); gesamt++;
    if (!x.ok) ohne.push(r + ': ' + x.d);
  }
}
console.log('Stopps gesamt', gesamt, 'ohne erkennbare Fokusdarstellung', ohne.length); console.log(ohne.slice(0, 20).join('\n'));
await b.close();
