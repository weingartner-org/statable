import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { entprellt } from './ansage-ergebnis.svelte';
import * as erg from './ansage-ergebnis.svelte';

/** NVDA-Rest B, Teil 3: vier Lücken bei den Ansagen und Hinweisen (Messung: docs/barrierefreiheit/NVDA-REST-B.md). */
const lies = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
function uhr() {
  let jetzt = 0; const f: { ab: number; f: () => void; weg: boolean }[] = [];
  return {
    nach: (g: () => void, ms: number) => { const e = { ab: jetzt + ms, f: g, weg: false }; f.push(e); return () => { e.weg = true; }; },
    weiter: (ms: number) => { jetzt += ms; for (const e of f) if (!e.weg && e.ab <= jetzt) { e.weg = true; e.f(); } },
  };
}

describe('1: Hilfe sagt, dass der Artikel offen ist', () => {
  it('oeffne() sagt „Artikel geöffnet: Titel“ über sage()', () => {
    const q = lies('../seiten/Hilfe.svelte');
    const f = q.match(/function oeffne\([^)]*\) \{[^\n]*/)?.[0] ?? '';
    expect(f).toContain('sage(');
    expect(f).toContain('Artikel geöffnet: ');
  });
});

describe('2: kein Zifferntasten-Hinweis unter jeder Frage (Johannes 13.11.2026: steht nur in der Hilfe)', () => {
  it('VerstehenUeben hat keinen .ue-tipp mehr', () => {
    expect(lies('../bausteine/VerstehenUeben.svelte')).not.toContain('ue-tipp');
  });
  it('die Hilfe „ohne Maus und mit Screenreader“ beschreibt Zifferntasten und Fokusmodus', () => {
    const h = lies('../hilfe/artikel-barrierefrei.ts');
    expect(h).toContain('Zifferntasten 1 bis 5');
    expect(h).toContain('Fokusmodus (NVDA+Leertaste)');
  });
});

describe('3: Kartensuche wartet 1200 ms', () => {
  it('Konstante ist 1200 und die Blatt-Suche nutzt sie', () => {
    expect((erg as Record<string, unknown>).KARTENSUCHE_RUHE_MS).toBe(1200);
    expect(lies('../seiten/Blatt.svelte')).toContain('ms: KARTENSUCHE_RUHE_MS');
  });
  it('Wertefolge im Abstand von 800 ms: genau eine Ansage', () => {
    const u = uhr(); const gesagt: string[] = [];
    const e = entprellt(t => gesagt.push(t), (erg as unknown as Record<string, number>).KARTENSUCHE_RUHE_MS, u.nach);
    e.push('6 Karten gefunden.'); u.weiter(800); e.push('5 Karten gefunden.'); u.weiter(5000);
    expect(gesagt).toEqual(['5 Karten gefunden.']);
  });
});

describe('4: Vorschauen der Assistenten sind hörbar', () => {
  const rahmen = lies('../bausteine/AssistentRahmen.svelte');
  const opt = rahmen.match(/class="as-vorschau" use:ergebnisAnsage=\{\{([^}]*)\}\}/)?.[1] ?? '';
  const klassen = [...opt.matchAll(/\.(as-[a-z]+)/g)].map(m => m[1]!);
  const dir = new URL('../bausteine/', import.meta.url);
  const dateien = readdirSync(dir).filter(n => /^Assistent.*\.svelte$/.test(n) && n !== 'AssistentRahmen.svelte');
  it('der Rahmen sagt Sätze, Warnungen und Hilfezeilen der Vorschau an', () => {
    expect(klassen).toContain('as-satz'); expect(klassen).toContain('as-hilfe');
  });
  it('keine Zahl neuer Live-Regionen im Rahmen (Ansage über sage)', () => {
    expect((rahmen.match(/aria-live|role="status"|role="alert"/g) ?? []).length).toBeLessThanOrEqual(2);
  });
  for (const n of dateien) {
    const q = lies('../bausteine/' + n);
    const s = q.indexOf('{#snippet vorschau()}');
    if (s < 0) continue;
    let teil = q.slice(s, q.indexOf('{/snippet}', s));
    if (teil.includes('<ProbeTabelle')) teil += lies('../bausteine/ProbeTabelle.svelte');
    it(`${n}: Vorschau hat einen angesagten Satz`, () => {
      expect(klassen.some(k => teil.includes(k))).toBe(true);
    });
  }
  it('Berechnen: der Mindestzahl-Satz außerhalb der Vorschau wird auch angesagt', () => {
    expect(rahmen).toMatch(/class="as-haupt"[^>]*use:ergebnisAnsage/);
  });
});
