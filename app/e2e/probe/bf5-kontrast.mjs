// BF5-Nachmessung S2: Kontrast der Texte in den Stufe-5-Zuständen selbst nachrechnen (berechnete Farben, Ebenen von innen nach außen mischen).
// axe meldet viele Stellen als „unklar“ (überlappende Ebenen, kurzer Text, Sonderzeichen); hier wird mit getComputedStyle gerechnet.
// Aufruf aus app/ (Vorschau läuft):  BASE=http://127.0.0.1:4261 node e2e/probe/bf5-kontrast.mjs
import { chromium } from '@playwright/test';
const BASE = process.env.BASE || 'http://127.0.0.1:4261';
const T = { de: { p: '', uebung: /Öffnen und üben/, bsp: /Beispielprojekt mit zwei Kodierenden laden/, erst: /^Tabelle erstellen$/, ueb: /Überschneidungen berechnen/, beg: /Einigung beginnen/, hinzu: /^Hinzufügen$/ },
  en: { p: '?sprache=en', uebung: /Open and practice/, bsp: /Load example project with two coders/, erst: /^Create table$/, ueb: /Calculate overlaps/, beg: /Start the agreement/, hinzu: /^Add$/ } };

const messen = () => {
  const mische = (v, h) => { const a = v[3]; return [v[0] * a + h[0] * (1 - a), v[1] * a + h[1] * (1 - a), v[2] * a + h[2] * (1 - a)]; };
  const farbe = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const out = [];
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || e.closest('[hidden],[inert],script,style,.sr-only,[aria-disabled="true"],[disabled]')) continue; // Ausgegraute Bedienelemente sind nach WCAG 1.4.3 ausgenommen
    const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') continue;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    // Hintergrund: Ebenen von außen nach innen sammeln
    let kette = [], el = e, bild = false;
    while (el) { const cs = getComputedStyle(el); if (cs.backgroundImage && cs.backgroundImage !== 'none') bild = true; const b = farbe(cs.backgroundColor); if (b && b[3] > 0) { kette.push(b); if (b[3] === 1) break; } el = el.parentElement; }
    let bg = [255, 255, 255]; if (!(kette.length && kette[kette.length - 1][3] === 1)) bg = [255, 255, 255];
    for (let i = kette.length - 1; i >= 0; i--) bg = kette[i][3] === 1 ? kette[i].slice(0, 3) : mische(kette[i], bg);
    const fg0 = farbe(s.color); if (!fg0) continue;
    const op = parseFloat(s.opacity) || 1; const fg = mische([fg0[0], fg0[1], fg0[2], fg0[3] * op], bg);
    const l1 = lum(fg), l2 = lum(bg); const ver = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(s.fontSize), fett = parseInt(s.fontWeight) >= 700;
    const gross = px >= 24 || (px >= 18.66 && fett);
    const soll = gross ? 3 : 4.5;
    if (ver < soll) {
      const sel = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      const k = sel + '|' + ver.toFixed(2); if (seen.has(k)) continue; seen.add(k);
      out.push({ sel, text: n.nodeValue.trim().slice(0, 40), verhaeltnis: +ver.toFixed(2), soll, fg: s.color, bg: `rgb(${bg.map(Math.round)})`, bild });
    }
  }
  return out;
};

const ergebnis = [];
for (const sprache of ['de', 'en']) for (const schema of ['light', 'dark']) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: sprache === 'de' ? 'de-DE' : 'en-US', viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', colorScheme: schema });
  const page = await ctx.newPage(); const t = T[sprache];
  await page.goto(`${BASE}/${t.p}#beispiele`, { timeout: 240000 });
  await page.getByRole('button', { name: t.uebung }).first().click({ timeout: 240000 }); await page.waitForTimeout(2500);
  await page.goto(`${BASE}/${t.p}#interviews`); await page.waitForSelector('#iv-t'); await page.waitForTimeout(1500);
  const z = async (name) => { await page.waitForTimeout(300); const f = await page.evaluate(messen); ergebnis.push({ sprache, schema, name, anzahl: f.length, faelle: f.slice(0, 12) }); console.log(sprache, schema, name, f.length, JSON.stringify(f.slice(0, 5))); };
  await z('01 leer');
  await page.getByRole('button', { name: t.bsp }).click(); await page.waitForSelector('#qx-erg-t', { timeout: 60000 }); await z('02 Beispielprojekt');
  await page.getByRole('button', { name: t.erst }).click(); await page.waitForSelector('#qm-erg-t'); await z('03 Matrix');
  await page.locator('#qu-berechnen').click(); await page.waitForSelector('#qu-erg-t'); await z('04 Übereinstimmung');
  await page.getByRole('button', { name: t.beg }).click(); await page.waitForSelector('#qk-t'); await z('05 Einigung');
  await page.locator('#iv-beispiel').click(); await page.waitForSelector('#iv-offen-t', { timeout: 20000 });
  await page.locator('#pn-name').fill('Lena'); await page.getByRole('button', { name: t.hinzu }).click();
  await page.locator('#pn-suchen').click(); await page.waitForSelector('#pn-treffer-t'); await z('09 Treffer');
  await page.locator('#pn-ersetzen').click(); await page.waitForSelector('#pn-dlg-t'); await z('10 Ersetzen-Dialog'); await page.keyboard.press('Escape');
  await page.waitForTimeout(800); await page.locator('.pm-knopf').click(); await page.waitForTimeout(800); await page.locator('.pm-feld button').filter({ hasText: /Mit Passwort speichern|Save with a password/ }).click(); await page.waitForSelector('#pw-1'); await z('11 Passwort');
  await b.close();
}
const gesamt = {};
for (const e of ergebnis) for (const f of e.faelle) { const k = `${f.sel} ${f.verhaeltnis}:${f.soll} ${f.fg}/${f.bg}`; (gesamt[k] ||= []).push(`${e.sprache}-${e.schema}-${e.name.slice(0, 2)}`); }
console.log('ZUSAMMEN', JSON.stringify(gesamt, null, 1));
