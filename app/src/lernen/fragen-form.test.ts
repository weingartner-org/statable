/* Wächter: Die Form der Antworten verrät die Lösung nicht (Opus 09.11.2026). Für Fragen mit Kennung bx-, np-, nb- und psy2- (eine richtige Antwort, mindestens drei Antworten)
 * darf die richtige Antwort weder die einzige mit noch die einzige ohne abschwächendes Wort sein, und weder die einzige mit noch die einzige ohne absolutes Wort. */
import { describe, expect, it } from 'vitest';
import { FRAGEN as BX } from './fragen-beispiele-echt';
import { FRAGEN as NP } from './fragen-nutzen-psychometrie';
import { FRAGEN as NB } from './fragen-nutzen-b';
import { FRAGEN as PS2 } from './fragen-psychologie-2';
import type { Frage } from './fragen';

const ABSCHWAECHEND = ['vermutlich', 'wohl', 'eher', 'wahrscheinlich', 'möglicherweise', 'meist', 'oft', 'kann', 'könnte', 'tendenziell', 'in der regel'];
const ABSOLUT = ['immer', 'nie', 'niemals', 'sicher', 'beweist', 'bewiesen', 'garantiert', 'alle', 'keine', 'keiner', 'nichts', 'grundsätzlich', 'ausschließlich', 'völlig', 'automatisch', 'zwingend', 'stets'];
/** Ausnahmen: Kennung → Begründung. */
const AUSNAHMEN: Record<string, string> = {};

const enthaelt = (text: string, liste: string[]) => liste.some(w => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'iu').test(text));
const fragen: Frage[] = [...BX, ...NP, ...NB, ...PS2].filter(f => /^(bx|np|nb|psy2)-/.test(f.id) && !f.mehrfach && f.antworten.length >= 3 && f.antworten.filter(a => a.richtig).length === 1);

describe('Form der Antworten verrät nichts', () => {
  it('es gibt Fragen zu prüfen', () => { expect(fragen.length).toBeGreaterThan(50); });
  for (const [name, liste] of [['abschwächendes Wort', ABSCHWAECHEND], ['absolutes Wort', ABSOLUT]] as const) {
    it(`die richtige Antwort ist nicht die einzige mit oder ohne ${name}`, () => {
      const falsch: string[] = [];
      for (const f of fragen) {
        if (f.id in AUSNAHMEN) continue;
        const mit = f.antworten.map(a => enthaelt(a.text.de, liste));
        const r = f.antworten.findIndex(a => a.richtig);
        if (mit[r] && mit.filter(Boolean).length === 1) falsch.push(`${f.id}: einzige mit`);
        if (!mit[r] && mit.filter(x => !x).length === 1) falsch.push(`${f.id}: einzige ohne`);
      }
      expect(falsch).toEqual([]);
    });
  }
});
