/**
 * Wächter für das Mischen der Antworten (Fachblatt UEBEN-MC.md): Die richtige Antwort darf nicht an einem Platz kleben.
 * Geprüft für ALLE Fragen aller Themenmodule mit vielen Startwerten; dazu der Quelltext von VerstehenUeben.svelte:
 * Jede Anzeige einer Frage geht durch `zeige()`, und nur dort wird gemischt.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMEN, ladeThema, mischeAntworten, type Frage } from './fragen';
import { zufall } from '../lib/zufall';

const ZIEHUNGEN = 300;
const geladen = await Promise.all(THEMEN.filter(t => t.n > 0).map(async t => (await ladeThema(t.id)).FRAGEN));
const fragen: Frage[] = geladen.flat();

/** Je Frage: wie oft jede Antwort (Platz in der Fragedatei) an jedem Platz der Anzeige landet, und wie oft die erste richtige an welchem Platz. */
/** Startwert je Frage aus ihrer Kennung (nicht aus dem Platz in der Liste): neue Fragen verschieben sonst die Startwerte aller späteren (A1, 13.11.). */
function kennzahl(id: string): number { let h = 0; for (const z of id) h = (h * 31 + z.codePointAt(0)!) % 1_000_003; return h; }

function ziehe(f: Frage, _q: number) {
  const q = kennzahl(f.id);
  const n = f.antworten.length;
  const lage = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const richtigAn = new Array<number>(n).fill(0);
  const erste = f.antworten.findIndex(a => a.richtig);
  for (let s = 0; s < ZIEHUNGEN; s++) {
    const m = mischeAntworten(f, zufall((s + 1) * 2654435761 + q * 40503));
    expect(m.map(g => g.nr).sort(), f.id).toEqual(f.antworten.map((_, i) => i));
    m.forEach((g, platz) => { lage[g.nr]![platz]!++; if (g.nr === erste) richtigAn[platz]!++; });
  }
  return { n, lage, richtigAn };
}

describe('Mischen der Antworten, alle Fragen', () => {
  it('es gibt viele Fragen zu prüfen', () => { expect(fragen.length).toBeGreaterThan(400); });

  it('(a) jede Antwort landet an jedem Platz', () => {
    fragen.forEach((f, q) => {
      const { lage } = ziehe(f, q);
      lage.forEach((zeile, nr) => zeile.forEach((c, platz) => expect(c, `${f.id}: Antwort ${nr} nie an Platz ${platz + 1}`).toBeGreaterThan(0)));
    });
  });

  it('(b) die richtige Antwort steht an jedem Platz ungefähr gleich oft (je Frage ±50 %, über alle Fragen ±10 %)', () => {
    const summe = { 3: new Array<number>(3).fill(0), 4: new Array<number>(4).fill(0), 5: new Array<number>(5).fill(0) } as Record<number, number[]>;
    const zahl = { 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    fragen.forEach((f, q) => {
      const { n, richtigAn } = ziehe(f, q);
      const soll = ZIEHUNGEN / n;
      richtigAn.forEach((c, platz) => {
        expect(c, `${f.id}: richtige Antwort an Platz ${platz + 1}`).toBeGreaterThan(soll * 0.5);
        expect(c, `${f.id}: richtige Antwort an Platz ${platz + 1}`).toBeLessThan(soll * 1.5);
        summe[n]![platz]! += c;
      });
      zahl[n]!++;
    });
    for (const n of [3, 4, 5]) {
      if (!zahl[n]) continue;
      const soll = zahl[n]! * ZIEHUNGEN / n;
      summe[n]!.forEach((c, platz) => { expect(c / soll, `${n} Antworten, Platz ${platz + 1}`).toBeGreaterThan(0.9); expect(c / soll).toBeLessThan(1.1); });
    }
  });

  it('(c) das Mischen verändert die Eingabe nicht', () => {
    for (const f of fragen) {
      const vorher = JSON.stringify(f);
      const reihe = [...f.antworten];
      mischeAntworten(f, zufall(7));
      mischeAntworten(f, zufall(8));
      expect(JSON.stringify(f), f.id).toBe(vorher);
      expect(f.antworten, f.id).toEqual(reihe);
    }
  });
});

describe('VerstehenUeben.svelte mischt bei jeder Anzeige neu', () => {
  const quelle = readFileSync(new URL('../bausteine/VerstehenUeben.svelte', import.meta.url), 'utf8');
  it('`misch` wird nur in zeige() neu gesetzt (oder aus der gemerkten Runde zurückgeholt, dieselbe Ansicht)', () => {
    const zuweisungen = [...quelle.matchAll(/(?<!let )\bmisch\s*=(?!=)/g)].length;
    expect(zuweisungen).toBe(1);
    expect(quelle).toMatch(/function zeige\(i: number\) \{[^}]*misch = mischeAntworten\(runde\[i\]!, zufall\(zeit\(\)\)\)/);
    expect(quelle).not.toMatch(/mischeAntworten\([^)]*\)[^;]*zufall\(\d/);   // kein fester Startwert
  });
  it('Start, neue Runde, „Falsche noch einmal“, Auswahl und Fallreihen gehen alle über zeige()', () => {
    expect(quelle).toMatch(/function starte\(fragen: Frage\[\]\) \{[^}]*zeige\(0\)/);
    expect(quelle).toMatch(/function weiter\(\) \{[\s\S]*?zeige\(nr \+ 1\)/);
    expect(quelle).toMatch(/const nochEinmal = \(\) => starte\(nochmal\)/);
    expect(quelle).toMatch(/const neueRunde = \(\) => modul && starte\(/);
    // Fallreihen sind einzelne Fragen derselben Runde: jede läuft durch weiter() → zeige()
  });
});
