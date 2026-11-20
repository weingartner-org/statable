// D7 (WCAG 1.4.11 Nicht-Text-Kontrast): Rand/Fläche von Eingabefeldern, Auswahllisten, Knöpfen, Fokusring und Diagramm-Marken gegen den Hintergrund, je Thema. Soll >= 3:1.
// Aufruf: PORT=4199 THEMEN=hell,dunkel,sw node e2e/probe/d7-nichttext.mjs [route ...]
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4199}/`;
const THEMEN = (process.env.THEMEN || 'hell,dunkel,sw,ws,sg,gs,gb').split(',');
const ROUTEN = process.argv.length > 2 ? process.argv.slice(2) : ['daten', 'einstellungen', 'blatt/neu', 'bearbeiten/berechnen', 'bearbeiten/umkodieren', 'hilfe', 'lernen', 'planen', 'verstehen/verteilungen', 'verstehen/kennzahlen', 'verstehen/vergleich', 'blatt'];
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const messen = () => {
  const rgba = s => { const m = s.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return [m[0], m[1], m[2], m[3] ?? 1]; };
  const misch = (v, h) => [0, 1, 2].map(i => v[i] * v[3] + h[i] * (1 - v[3]));
  const grund = (e) => { const kette = []; for (let p = e; p; p = p.parentElement) kette.push(rgba(getComputedStyle(p).backgroundColor)); let c = [255, 255, 255]; if (getComputedStyle(document.documentElement).colorScheme.includes('dark') && !kette.some(x => x[3] === 1)) c = [20, 24, 29]; for (let i = kette.length - 1; i >= 0; i--) c = misch(kette[i], c); return c; };
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const v = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const sichtbar = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 6 && r.height > 6 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
  const aus = { feld: [], knopf: [], fokus: [], marke: [] };
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '');
  for (const e of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]),select,textarea')) {
    if (!sichtbar(e)) continue; const s = getComputedStyle(e); const bg = grund(e.parentElement || e);
    const rand = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' ? v(misch(rgba(s.borderTopColor), bg), bg) : 0;
    const flaeche = v(misch(rgba(s.backgroundColor), bg), bg);
    aus.feld.push({ n: name(e), rand: +rand.toFixed(2), flaeche: +flaeche.toFixed(2), best: +Math.max(rand, flaeche).toFixed(2) });
  }
  for (const e of document.querySelectorAll('button,[role=switch],a.k,.k')) {
    if (!sichtbar(e) || !e.textContent.trim() && !e.querySelector('svg')) continue; const s = getComputedStyle(e); const bg = grund(e.parentElement || e);
    const rand = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' ? v(misch(rgba(s.borderTopColor), bg), bg) : 0;
    const flaeche = v(misch(rgba(s.backgroundColor), bg), bg);
    const ohneText = !e.textContent.trim(); const zeichen = v(misch(rgba(s.color), grund(e)), grund(e)); aus.knopf.push({ n: name(e), t: e.textContent.trim().slice(0, 20) || (e.getAttribute('aria-label') || '').slice(0, 20), rand: +rand.toFixed(2), flaeche: +flaeche.toFixed(2), best: +(ohneText ? Math.max(rand, flaeche, zeichen) : Math.max(rand, flaeche)).toFixed(2), zeichen: +zeichen.toFixed(2), ohneText });
  }
  const bgSeite = grund(document.querySelector('#inhalt') || document.body);
  for (const e of document.querySelectorAll('svg *')) {
    if (!(e instanceof SVGGraphicsElement) || e.closest('[aria-hidden="true"] svg.logo,.logo,header,nav') || !sichtbar(e)) continue; const s = getComputedStyle(e);
    const stroke = s.stroke !== 'none' && parseFloat(s.strokeWidth) > 0 ? rgba(s.stroke) : null, fill = s.fill !== 'none' ? rgba(s.fill) : null;
    const wurzel = e.closest('svg'); const bg = grund(wurzel.parentElement || wurzel);
    const op = parseFloat(s.opacity);
    for (const [art, c] of [['linie', stroke], ['flaeche', fill]]) { if (!c) continue; const cc = [c[0], c[1], c[2], c[3] * op]; if (cc[3] < .05) continue; aus.marke.push({ art, tag: e.tagName, klasse: (e.getAttribute('class') || '').slice(0, 20), v: +v(misch(cc, bg), bg).toFixed(2), a: +cc[3].toFixed(2) }); }
  }
  return aus;
};
const fokusMessen = () => {
  const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e);
  const rgba = c => { const m = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return [m[0], m[1], m[2], m[3] ?? 1]; };
  const misch = (v, h) => [0, 1, 2].map(i => v[i] * v[3] + h[i] * (1 - v[3]));
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const v = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const kette = []; for (let p = e.parentElement; p; p = p.parentElement) kette.push(rgba(getComputedStyle(p).backgroundColor));
  let c = [255, 255, 255]; for (let i = kette.length - 1; i >= 0; i--) c = misch(kette[i], c);
  const w = parseFloat(s.outlineWidth); const o = s.outlineStyle !== 'none' && w > 0 ? v(misch(rgba(s.outlineColor), c), c) : 0;
  const sch = []; for (let p = e, i = 0; p && i < 4; p = p.parentElement, i++) { const bs = getComputedStyle(p).boxShadow; if (bs !== 'none') sch.push(...(bs.match(/rgba?\([^)]*\)/g) || []).map(x => v(misch(rgba(x), c), c))); }
  return { n: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''), breite: w, outline: +o.toFixed(2), schatten: +Math.max(0, ...sch).toFixed(2), sichtbar: o >= 3 || sch.some(x => x >= 3) };
};
const gesamt = {};
for (const t of THEMEN) {
  const z = { feld: [], knopf: [], fokus: [], marke: [] };
  for (const r of ROUTEN) {
    await page.goto(U + '#' + r); await page.waitForTimeout(600);
    await page.evaluate(t => { document.documentElement.dataset.thema = t; }, t); await page.waitForTimeout(200); if (process.env.INJEKT) await page.addStyleTag({ content: process.env.INJEKT }); // Gegenprobe: absichtlich schlechtes CSS einspielen, die Messung muss dann rot werden
    await page.evaluate(() => document.activeElement?.blur?.()); await page.mouse.click(5, 5); await page.keyboard.press('Tab');
    const m = await page.evaluate(messen);
    for (let i = 0; i < 25; i++) { await page.waitForTimeout(260); const f = await page.evaluate(fokusMessen); if (f) m.fokus.push(f); await page.keyboard.press('Tab'); }
    for (const k of Object.keys(z)) z[k].push(...m[k].map(x => ({ r, ...x })));
  }
  const zeile = (name, l, f) => { const sch = l.filter(f); return `${name}: ${l.length} gemessen, unter 3:1: ${sch.length}` + (sch.length ? ' z.B. ' + [...new Map(sch.map(x => [x.n, x])).values()].slice(0, 5).map(x => `${x.r} ${x.n} ${JSON.stringify(x)}`).join(' || ') : ''); };
  console.log('== Thema', t);
  console.log(' ', zeile('Felder', z.feld, x => x.best < 3));
  console.log(' ', zeile('Symbol-Knöpfe (Zeichenfarbe oder Rand)', z.knopf.filter(x => x.ohneText), x => x.best < 3));
  console.log(' ', zeile('Fokusring', z.fokus, x => !x.sichtbar));
  console.log(' ', zeile('Diagramm-Marken (Linie/Fläche)', z.marke, x => x.v < 3 && x.a >= .5));
  gesamt[t] = z;
}
import('node:fs').then(fs => fs.writeFileSync(process.env.AUS || 'e2e/ergebnisse/d7-nichttext.json', JSON.stringify(gesamt)));
await b.close();
