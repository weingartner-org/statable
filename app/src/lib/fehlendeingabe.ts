/** Das Eingabefeld „Keine Angabe steht für“ (S-F2 B): Text <-> Codes. Getrennt von fehlend.ts, weil es Sätze in der Sprache der Person braucht (L). */
import { L } from './sitzung.svelte';
import type { FehlendBereich, FehlendQuelle } from './fehlend';

/** Wie das Eingabefeld die Codes zeigt: `-9 bis -1; 99` bzw. `-9 to -1; 99`; offene Enden als „niedrigster“/„höchster“. */
export function fehlendAlsText(sp: FehlendQuelle): string {
  const b = sp.fehlendBereich;
  const teile: string[] = [];
  if (b) {
    const g = (v: number) => (v === -Infinity ? 'LO' : v === Infinity ? 'HI' : String(v));
    teile.push(`${g(b.von)} ${bisWort()} ${g(b.bis)}`);
  }
  teile.push(...sp.fehlend.map(String));
  return teile.join('; ');
}

const ZAHL = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
const OFFEN_U = '(?:lo|lowest|niedrigste[rn]?|min)', OFFEN_O = '(?:hi|highest|h[öo]chste[rn]?|max)';
const maskiere = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Das Wort für „bis“ der Sprache, in der angezeigt wird (dasselbe L() wie in `fehlendAlsText`), zusätzlich zu bis/to/thru und „-“. Nur als eigenes Wort zwischen Leerzeichen, damit „a“ (pt, es, it) nichts anderes trifft. */
const bisWort = () => L('bis', 'to').trim();
const bereichRegex = () => new RegExp(`(?<![\\d.,])(${ZAHL}|${OFFEN_U})\\s*(?:(?<=\\s)${maskiere(bisWort())}(?=\\s)|bis|to|thru|[-–—]|\\.\\.\\.?|…)\\s*(${ZAHL}|${OFFEN_O})(?!\\d|[.,]\\d)`, 'giu');
const zuZahl = (t: string): number => Number(t.replace(',', '.'));

export type FehlendEingabe = { fehlend: number[]; fehlendBereich?: FehlendBereich } | { fehler: string };

/**
 * Eingabe „Keine Angabe steht für“ bei einer ZAHLENspalte: `99`, `-9; -8; 99`, `-9 bis -1`, `-9 - -1; 99`, `0 to 5, 99`, `niedrigster bis 0`.
 * Regel wie SPSS: bis zu drei Einzelwerte ODER ein Bereich und höchstens ein Einzelwert. Bei zu vielen Angaben und bei von > bis kommt ein Satz statt eines Ergebnisses.
 */
export function leseFehlendEingabe(eingabe: string): FehlendEingabe {
  const t = eingabe.replace(/−/g, '-');
  const bereiche: FehlendBereich[] = [];
  const rest = t.replace(bereichRegex(), (_, a: string, b: string) => {
    const von = new RegExp(`^${OFFEN_U}$`, 'i').test(a) ? -Infinity : zuZahl(a);
    const bis = new RegExp(`^${OFFEN_O}$`, 'i').test(b) ? Infinity : zuZahl(b);
    bereiche.push({ von, bis });
    return ' ';
  });
  const einzel: number[] = [];
  let teil = '';
  const schliesse = () => { if (teil) einzel.push(zuZahl(teil)); teil = ''; };
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i]!;
    const komma = c === ',' && !(/\d/.test(rest[i - 1] ?? '') && /\d/.test(rest[i + 1] ?? ''));
    if (c === ';' || komma || /\s/.test(c)) schliesse(); else teil += c;
  }
  schliesse();
  if (einzel.some(v => !Number.isFinite(v))) return { fehler: L('Bitte nur Zahlen eingeben, z. B. 99 oder -9.', 'Please enter numbers only, e.g. 99 or -9.') };
  if (bereiche.some(b => !(b.von <= b.bis))) return { fehler: L('Beim Bereich muss der erste Wert kleiner oder gleich dem zweiten sein.', 'In a range the first value must not be larger than the second.') };
  if (bereiche.length > 1) return { fehler: L('Es ist nur ein Bereich möglich (wie in SPSS), dazu höchstens ein Einzelwert.', 'Only one range is possible (as in SPSS), plus at most one single value.') };
  const einmalig = [...new Set(einzel)];
  if (bereiche.length === 1) {
    if (einmalig.length > 1) return { fehler: L('Zu einem Bereich passt höchstens ein Einzelwert (wie in SPSS).', 'A range can be combined with at most one single value (as in SPSS).') };
    return { fehlend: einmalig, fehlendBereich: bereiche[0]! };
  }
  if (einmalig.length > 3) return { fehler: L('Höchstens drei Einzelwerte, oder ein Bereich und ein Einzelwert (wie in SPSS).', 'At most three single values, or a range and one single value (as in SPSS).') };
  return { fehlend: einmalig };
}
