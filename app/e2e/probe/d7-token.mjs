// D7 (WCAG 1.4.11): Kontrast der Diagramm-Farben (src/stil/tokens.css) gegen den Blatt-Hintergrund, je Thema, aus dem Quelltext gerechnet (ohne Browser).
// Aufruf: node e2e/probe/d7-token.mjs     Soll >= 3:1 für Linien/Flächen, die Information tragen (dg-a, dg-b, dg-achse, linie-stark, fokus, akzent). dg-gitter ist Zierde.
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../../src/stil/tokens.css', import.meta.url), 'utf8');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
const verh = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const bloecke = { hell: css.slice(0, css.indexOf(':root[data-thema="dunkel"]')) };
for (const t of ['dunkel', 'sw', 'ws', 'sg', 'gs', 'gb']) { const i = css.indexOf(`:root[data-thema="${t}"]{`); bloecke[t] = css.slice(i, css.indexOf('}', i)); }
let rot = 0;
for (const [t, b] of Object.entries(bloecke)) {
  const v = n => { const m = [...b.matchAll(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{3,6})(?![0-9A-Fa-f])', 'g'))]; if (!m.length) return null; const h = m[m.length - 1][1]; return h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h; };
  const bg = v('blatt'); const zeilen = [];
  for (const n of ['dg-a', 'dg-b', 'dg-achse', 'linie-stark', 'fokus', 'akzent', 'tinte-2']) { const c = v(n); if (!c) continue; const r = verh(c, bg); zeilen.push(`${n} ${r.toFixed(2)}${r < 3 ? ' <3 ROT' : ''}`); if (r < 3) rot++; }
  // Dunkel/Hell: Gitter (Zierde) nur zur Info
  const g = v('dg-gitter'); if (g) zeilen.push(`(dg-gitter ${verh(g, bg).toFixed(2)}, Zierde)`);
  console.log(t.padEnd(7), 'Blatt', bg, '|', zeilen.join(' | '));
}
console.log('unter 3:1:', rot);
