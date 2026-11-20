import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Wächter Barrierefreiheit Welle 1: Windows-Kontrastmodus (forced-colors).
 *  Der Block muss vorhanden und zusammenhängend sein (ans Ende von app.css), den Fokus mit dickerem Ring zeigen als gewöhnlich,
 *  nur Systemfarben verwenden, und nirgends `forced-color-adjust:none` auf Bedienteilen setzen. */

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lies = (p: string) => readFileSync(join(SRC, p), 'utf8');

/** Schneidet den Inhalt aller `@media (forced-colors: active){...}`-Blöcke aus (Klammern zählen). */
export function forcedBloecke(css: string): { inhalt: string; ende: number }[] {
  const aus: { inhalt: string; ende: number }[] = [];
  const re = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let tiefe = 1, i = re.lastIndex;
    while (i < css.length && tiefe > 0) { const c = css[i++]; if (c === '{') tiefe++; else if (c === '}') tiefe--; }
    aus.push({ inhalt: css.slice(re.lastIndex, i - 1), ende: i });
  }
  return aus;
}

const SYSTEMFARBEN = new Set(['highlight', 'highlighttext', 'canvastext', 'canvas', 'linktext', 'visitedtext', 'activetext', 'buttontext', 'buttonface', 'buttonborder', 'graytext', 'field', 'fieldtext', 'mark', 'marktext']);
const KEINE_FARBE = new Set(['solid', 'dashed', 'dotted', 'double', 'none', 'underline', 'inherit', 'initial', 'transparent', 'auto', 'currentcolor', 'bold', 'normal']);

/** Findet Farbwerte, die keine Systemfarben sind (Hex, rgb(), hsl(), var(--...), Farbwörter). */
export function fremdeFarben(block: string): string[] {
  const ohne = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const schlecht: string[] = [];
  for (const m of ohne.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|color-mix|oklch|lab)\(|var\(--[\w-]+\)/g)) schlecht.push(m[0]);
  for (const m of ohne.matchAll(/(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline(?:-color)?|text-decoration(?:-color)?|fill|stroke|caret-color|accent-color)\s*:\s*([^;}]+)/gi)) {
    for (const w of m[1].replace(/!important/gi, '').split(/\s+/).filter(Boolean)) {
      if (/^[\d.]+(px|rem|em|%)?$/.test(w)) continue;
      if (/^[a-z]+$/i.test(w) && !SYSTEMFARBEN.has(w.toLowerCase()) && !KEINE_FARBE.has(w.toLowerCase())) {
        if (/^(thin|medium|thick|underline|line-through|dotted|dashed|solid|double|none)$/i.test(w)) continue;
        schlecht.push(w);
      }
    }
  }
  return schlecht;
}

function breite(wert: string): number { const m = /([\d.]+)px/.exec(wert); return m ? parseFloat(m[1]) : 0; }

describe('Windows-Kontrastmodus (forced-colors)', () => {
  const css = lies('stil/app.css');
  const bloecke = forcedBloecke(css);

  it('Selbstprüfung: erkennt fremde Farben', () => {
    expect(fremdeFarben('a{outline:4px solid Highlight!important}')).toEqual([]);
    expect(fremdeFarben('a{outline:4px solid #f00}')).toEqual(['#f00']);
    expect(fremdeFarben('a{color:red}')).toEqual(['red']);
    expect(fremdeFarben('a{border-color:var(--akzent)}')).toEqual(['var(--akzent)']);
  });

  it('genau ein zusammenhängender Block, am Ende von app.css', () => {
    expect(bloecke.length).toBe(1);
    expect(css.slice(bloecke[0].ende).replace(/\/\*[\s\S]*?\*\//g, '').trim()).toBe('');
  });

  it('keine weiteren forced-colors-Blöcke in anderen Stildateien', () => {
    for (const n of readdirSync(join(SRC, 'stil')).filter((d) => d.endsWith('.css') && d !== 'app.css')) {
      expect(forcedBloecke(lies('stil/' + n)).length, n).toBe(0);
    }
  });

  it('enthält Highlight, LinkText und CanvasText und die Zustände', () => {
    const b = bloecke[0]?.inhalt ?? '';
    expect(b).toContain('Highlight');
    expect(b).toContain('LinkText');
    expect(b).toContain('CanvasText');
    expect(b).toMatch(/aria-pressed/);
    expect(b).toMatch(/aria-selected/);
    expect(b).toMatch(/aria-current/);
    expect(b).toMatch(/aria-expanded/);
    expect(b).toMatch(/begriff-link/);
    expect(b).toMatch(/dashed/);
    // Diagrammtexte folgen der Systemfarbe (sonst dunkelgrau auf Schwarz im dunklen Kontrastmodus)
    expect(b).toMatch(/\.diagramm text[^}]*fill:\s*CanvasText/);
  });

  it('Fokusring im Kontrastmodus ist dicker als der gewöhnliche und verdrängt nichts (!important)', () => {
    const gewoehnlich = breite(/--fokus-outline\s*:\s*([^;]+);/.exec(lies('stil/tokens.css'))?.[1] ?? '');
    expect(gewoehnlich, '--fokus-outline in tokens.css').toBeGreaterThanOrEqual(3);
    const regel = /(?:^|\})\s*:focus-visible(?:\s*,[^{}]*)?\{([^}]*)\}/m.exec(bloecke[0]?.inhalt ?? '')?.[1] ?? '';
    expect(regel, ':focus-visible-Regel im Block').not.toBe('');
    const o = /outline\s*:\s*([^;]+?)\s*!important/.exec(regel)?.[1] ?? '';
    expect(o).toMatch(/Highlight/);
    expect(o).toMatch(/solid/);
    expect(breite(o)).toBeGreaterThan(gewoehnlich);
    expect(breite(o)).toBeGreaterThanOrEqual(4);
    expect(regel).toMatch(/outline-offset\s*:\s*\d+px\s*!important/);
  });

  it('nur Systemfarben im Block', () => {
    expect(fremdeFarben(bloecke[0]?.inhalt ?? '')).toEqual([]);
  });

  it('kein forced-color-adjust:none in Stilen und .svelte-<style>', () => {
    const treffer: string[] = [];
    const geh = (o: string) => { for (const n of readdirSync(o)) { const p = join(o, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules') geh(p); } else if (/\.(css|svelte)$/.test(n)) { const t = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); if (/forced-color-adjust\s*:\s*none/i.test(t)) treffer.push(p.slice(SRC.length)); } } };
    geh(SRC);
    expect(treffer).toEqual([]);
  });
});
