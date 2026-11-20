import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Dokument } from './qualprojekt';
import { leseTranskript, transkriptDokument, vorschlagZuordnung } from './transkript-lesen';
import { zaehleBefragt, zaehlerHinweis, zaehlerSatz } from './zaehler-befragt';

/* Fachblatt Feinstruktur F0, Abschnitt 3 (Zähler für die befragte Person, Zählregel 1-9) und Abschnitt 10 (Sollwerte).
 * Sollwerte: interview-a-fl.txt 247 Wörter und 121 s, interview-b-fl.txt 234 Wörter und 117 s (ganzes Transkript als Ausschnitt).
 * Die Zahlen 267 und 239 im Beispiel-README gelten für die alte Regel der Redeanteile und stehen hier nicht.
 */

const BEISPIELE = fileURLToPath(new URL('../../../docs/feinstruktur/beispiele/', import.meta.url));
const lies = (n: string): string => readFileSync(BEISPIELE + n, 'utf8');
async function dokAus(text: string): Promise<Dokument> {
  const roh = await leseTranskript('test.txt', new TextEncoder().encode(text));
  return transkriptDokument(roh, vorschlagZuordnung(roh), 'Test', text).dokument;
}
const laenge = (d: Dokument): number => Array.from(d.text).length;
/** Ein Beitrag von B1 (`zeile`) zwischen Fragen; Beiträge von I1 zählen nie. */
const rahmen = (zeile: string): string => `[00:00:01] I1: Frage eins zwei drei?\n[00:00:05] B1: ${zeile}\n[00:00:20] I1: Frage zwei vier fünf?\n[00:00:25] B1: .\n[00:00:30] I1: Ende.`;
const woerter = async (zeile: string): Promise<number> => {
  const d = await dokAus(rahmen(zeile));
  // das zweite B1 ist nur ein Punkt (null Wörter)
  return zaehleBefragt(d).woerter;
};

describe('Sollwerte der Beispieldateien (ganzes Transkript als Ausschnitt)', () => {
  it('interview-a-fl.txt: 247 Wörter, 121 s', async () => {
    const d = await dokAus(lies('interview-a-fl.txt'));
    for (const z of [zaehleBefragt(d), zaehleBefragt(d, { start: 0, ende: laenge(d) })]) {
      expect(z.woerter).toBe(247);
      expect(z.redezeitMs).toBe(121000);
      expect(z.unvollstaendig).toBe(false);
    }
  });
  it('interview-b-fl.txt: 234 Wörter, 117 s', async () => {
    const d = await dokAus(lies('interview-b-fl.txt'));
    for (const z of [zaehleBefragt(d), zaehleBefragt(d, { start: 0, ende: laenge(d) })]) {
      expect(z.woerter).toBe(234);
      expect(z.redezeitMs).toBe(117000);
      expect(z.unvollstaendig).toBe(false);
    }
  });
});

describe('Zählregel 1-9 (je ein kleiner Einzelfall)', () => {
  it('Grundfall: Wort = Buchstaben/Ziffern, mit Apostroph oder Bindestrich verbunden; Fragen der Interviewenden zählen nicht', async () => {
    expect(await woerter('Ich hab ham’ma e-mail und 3 Katzen')).toBe(7);
  });
  it('1: >…< (Geräusch) fällt weg', async () => expect(await woerter('>Handy summt< Ich komme')).toBe(2));
  it('2: /I1: …/ im Beitrag gehört zur anderen Person', async () => expect(await woerter('Ich hab /I1: mhm/ gewartet')).toBe(3));
  it('3: <…> (Anonymisierung) zählt als ein Wort', async () => expect(await woerter('In der <Schule A> war ich')).toBe(5));
  it('4: gedehnte Wörter zählen als ein Wort', async () => {
    expect(await woerter('Da war i  s o  müde')).toBe(5);
    expect(await woerter('Das ist  w i r k l i c h  so')).toBe(4);
  });
  it('5: Pausenpunkte zählen nicht', async () => expect(await woerter('Ja  . . .  und  . .  dann')).toBe(3));
  it('6: Hörersignale der befragten Person zählen', async () => expect(await woerter('mhm äh ähm und ja')).toBe(5));
  it('7: Gendern mit Doppelpunkt zählt als ein Wort', async () => expect(await woerter('Die Lehrer:innen sagen')).toBe(3));
  it('8: (B1 lacht) und (. . .) fallen weg, vermuteter Wortlaut zählt, bei Alternativen nur die erste', async () => {
    expect(await woerter('(B1 lacht) Und (. . .) so (etwa so) und (Huhn/Hund)')).toBe(6);
  });
  it('9: Zeilen, die mit /I1: beginnen, zählen nicht', async () => {
    expect(await woerter('Erster Satz hier\n/I1: ja genau\nWeiter geht es')).toBe(6);
  });
});

describe('Redezeit', () => {
  const T = '[00:00:00] I1: Frage\n[00:00:10] B1: eins zwei drei vier\n[00:00:30] I1: Frage\n[00:00:35] B1: fünf sechs\n[00:00:45] I1: Ende';
  it('Summe der Dauer der Beiträge der befragten Person (Ende = Beginn des nächsten Beitrags)', async () => {
    const z = zaehleBefragt(await dokAus(T));
    expect(z.woerter).toBe(6);
    expect(z.redezeitMs).toBe(30000);
    expect(z.unvollstaendig).toBe(false);
  });
  it('letzter Beitrag ohne Ende: Redezeit unvollständig, mit Hinweis', async () => {
    const d = await dokAus('[00:00:00] I1: Frage\n[00:00:10] B1: eins zwei\n[00:00:30] I1: Frage\n[00:00:35] B1: drei vier');
    const z = zaehleBefragt(d);
    expect(z.woerter).toBe(4);
    expect(z.unvollstaendig).toBe(true);
    expect(z.redezeitMs).toBe(20000);
    expect(zaehlerHinweis(z, 'de')).toMatch(/Redezeit unvollständig/);
    expect(zaehlerHinweis(z, 'en')).toMatch(/incomplete/i);
  });
  it('ohne Zeitmarken: keine Redezeit, aber Wörter', async () => {
    const z = zaehleBefragt(await dokAus('I1: Frage\nB1: eins zwei drei\nI1: Frage\nB1: vier'));
    expect(z.woerter).toBe(4);
    expect(z.redezeitMs).toBeNull();
  });
  it('Ausschnitt mitten in einem Beitrag: nur die Wörter im Ausschnitt; die Redezeit des angeschnittenen Beitrags anteilig nach Wörtern', async () => {
    const d = await dokAus(T);
    const von = d.text.indexOf('zwei drei');
    const z = zaehleBefragt(d, { start: von, ende: von + 'zwei drei'.length });
    expect(z.woerter).toBe(2);
    expect(z.redezeitMs).toBe(10000);   // 20 s × 2 von 4 Wörtern
    expect(z.teilweise).toBe(true);
  });
  it('Ausschnitt über einen Beitrag der interviewenden Person: deren Wörter und Zeit zählen nie', async () => {
    const d = await dokAus(T);
    const von = d.text.indexOf('fünf') - 4, bis = d.text.length;   // ab der Zeile "Frage" davor bis zum Ende
    const z = zaehleBefragt(d, { start: Math.max(0, von - 20), ende: bis });
    expect(z.woerter).toBe(2);
    expect(z.redezeitMs).toBe(10000);
  });
  it('Auswahl ganz bei den Interviewenden: null Wörter, null Sekunden', async () => {
    const d = await dokAus(T);
    const von = d.text.indexOf('Ende');
    const z = zaehleBefragt(d, { start: von, ende: von + 4 });
    expect(z.woerter).toBe(0);
    expect(z.redezeitMs).toBe(0);
  });
});

describe('Satz', () => {
  it('Deutsch nach dem Fachblatt', () => {
    expect(zaehlerSatz({ woerter: 287, redezeitMs: 124000, unvollstaendig: false, teilweise: false }, 'de')).toBe('Ausgewählt: 2 Min. 04 s Redezeit der befragten Person, 287 Wörter.');
  });
  it('Englisch', () => {
    const s = zaehlerSatz({ woerter: 287, redezeitMs: 124000, unvollstaendig: false, teilweise: false }, 'en');
    expect(s).toContain('2 min 04 s');
    expect(s).toContain('287 words');
    expect(s.startsWith('Selected:')).toBe(true);
  });
  it('ein Wort, unter einer Minute, ohne Redezeit', () => {
    expect(zaehlerSatz({ woerter: 1, redezeitMs: 45000, unvollstaendig: false, teilweise: false }, 'de')).toBe('Ausgewählt: 45 s Redezeit der befragten Person, 1 Wort.');
    expect(zaehlerSatz({ woerter: 12, redezeitMs: null, unvollstaendig: false, teilweise: false }, 'de')).toBe('Ausgewählt: 12 Wörter der befragten Person (keine Zeitmarken, keine Redezeit).');
  });
});
