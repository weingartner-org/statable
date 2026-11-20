/**
 * Stufe A6a: Abschlusstests der qualitativen Lernpfade (Interviews, Mixed Methods, Feinstruktur).
 * Sie entstehen von selbst aus den Einheitsfragen (`abschlusstest.ts`, wie in F4 entschieden); hier wird geprüft,
 * dass jede Einheit genug Fragen hat, jede Frage im Fragenbestand steht und der Test jede Einheit (bis 15) abdeckt.
 */
import { describe, expect, it } from 'vitest';
import { PFADE, einheitNach, themaDerFrage } from './lernplan';
import { MAX_AUTO, stelleZusammen } from './abschlusstest';
import { ladeAuswahl } from './fragen';

const PFADE_QUALI = ['interviews-qualitativ', 'mixed-methods', 'feinstruktur'];
const zufall = (s: number) => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

describe('Abschlusstests der qualitativen Pfade (A6a)', () => {
  for (const pid of PFADE_QUALI) {
    const pfad = PFADE.find(p => p.id === pid)!;
    it(`${pid}: Pfad vorhanden, letzte Einheit ist der Abschlusstest`, () => {
      expect(pfad).toBeDefined();
      expect(pfad.einheiten.at(-1)).toBe(`abschluss-${pid}`);
      expect(einheitNach(`abschluss-${pid}`)?.abschlussVon).toBe(pid);
    });
    const inhalt = () => pfad.einheiten.filter(id => !id.startsWith('abschluss-'));
    it(`${pid}: jede Einheit hat mindestens drei Fragen`, () => {
      for (const id of inhalt()) expect(einheitNach(id)?.fragen.length ?? 0, id).toBeGreaterThanOrEqual(3);
    });
    it(`${pid}: Test deckt min(Einheiten, ${MAX_AUTO}) Einheiten ab, je eine Frage`, () => {
      for (const s of [1, 7, 42]) {
        const ids = stelleZusammen(pfad, zufall(s));
        expect(ids.length).toBe(Math.min(inhalt().length, MAX_AUTO));
        const einheiten = ids.map(f => inhalt().find(e => einheitNach(e)!.fragen.includes(f)));
        expect(new Set(einheiten).size).toBe(ids.length);
      }
    });
    it(`${pid}: jede Frage steht im Fragenbestand (mit Antworten und genau einer oder mehr richtigen)`, async () => {
      const ids = inhalt().flatMap(e => einheitNach(e)!.fragen);
      const themen = [...new Set(ids.map(i => themaDerFrage(i)).filter((t): t is string => !!t))];
      const modul = await ladeAuswahl(themen, ids);
      const da = new Map(modul.FRAGEN.map(f => [f.id, f]));
      for (const id of ids) {
        const f = da.get(id);
        expect(f, id).toBeDefined();
        expect(f!.antworten.some(a => a.richtig), id).toBe(true);
      }
    });
  }
});
