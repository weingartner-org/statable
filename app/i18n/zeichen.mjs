#!/usr/bin/env node
/** Statistik-Zeichen nach der Entscheidung „Zeichen bleiben international“ vereinheitlichen (Agenten nehmen sonst Glossar-Kürzel):
 *  FB₁₀ → BF₁₀, CCI → ICC, RV± → LR±, gl/gdl → df. Aufruf: node i18n/zeichen.mjs <dateien…>   - Leitfaden Falle 26 */
import { readFileSync, writeFileSync } from 'node:fs';
const ers = s => s.replace(/FB₁₀/g, 'BF₁₀').replace(/FB₀₁/g, 'BF₀₁').replace(/\bCCI\b/g, 'ICC').replace(/\bRV([+−-])/g, 'LR$1').replace(/\b(gl|gdl)\b(?=\s*[=)·,]|\s+del|\s+de)/g, 'df');
for (const f of process.argv.slice(2)) {
  const a = readFileSync(f, 'utf8'); const b = ers(a);
  if (a !== b) { writeFileSync(f, b); console.log(f, 'geändert'); }
}
