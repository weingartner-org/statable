import { isoliereFormeln } from '../i18n/bidi';
/** APA: Statistik-Zeichen kursiv (t, p, d, M, SD …), alles andere im Grundschnitt. Einzige Quelle der Regel: Bildschirm (<i>), Kopieren (HTML), Word und PDF. */
/** Statistik-Zeichen nach APA kursiv (griechische wie χ², η², β bleiben aufrecht - APA 7): t, p, d, r, n, N, M, SD, F, R², B, V - nur vor ( = < > oder Leerzeichen+=. */
/** Lateinische Symbole kursiv; Griechisches (χ², η², β, κ, ω, α, ρ, τ), Abkürzungen (OR, LR, PPV, NPV, KI, CI) und Zahlen bleiben aufrecht. Auch Index-Formen: rs, rrb, dz, ab, c′. */
const KURSIV = /(?<![\p{L}\d])(?:(?:SD|SE|Mdn|df|rs|rrb|dz|prs|pr|M|t|p|d|r|n|N|F|R²|B|b|z|U|W|H|V)(?=\s*[(=<>≤≥]|\(\d)|(?:ab|a|c′|c)(?=\s*=))/gu;
export type Stueck = { t: string; stil: 'normal' | 'italic' | 'bold' };
export function teile(text: string, grund: Stueck['stil'] = 'normal'): Stueck[] {
  const out: Stueck[] = []; let i = 0;
  for (const m of text.matchAll(KURSIV)) {
    if (m.index! > i) out.push({ t: text.slice(i, m.index), stil: grund });
    out.push({ t: m[0], stil: 'italic' }); i = m.index! + m[0].length;
  }
  if (i < text.length) out.push({ t: text.slice(i), stil: grund });
  return out;
}


const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Dieselbe Zeile als HTML mit <i> um die Symbole. */
export function kursivHtml(text: string): string {
  return teile(text).map(s => (s.stil === 'italic' ? `<i>${esc(s.t)}</i>` : esc(s.t))).join('');
}
/** Legt die Zeile als HTML (kursiv) und als reinen Text in die Zwischenablage; Rückfall: nur Text. Gibt zurück, ob etwas kopiert wurde. */
export async function kopiereKursiv(text0: string, rtl = false): Promise<boolean> {
  const text = rtl ? isoliereFormeln(text0) : text0;   // in einem RTL-Dokument bleiben die Isolierzeichen dran (i18n/bidi.ts); in LTR ändert sich nichts
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([`<span style="font-family:Arial,sans-serif">${kursivHtml(text)}</span>`], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    return true;
  } catch {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
}
