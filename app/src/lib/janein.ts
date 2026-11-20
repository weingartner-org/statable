/**
 * Ja/Nein-Spalten für McNemar und Cochran-Q (Fachblatt Welle 2, Paket C, G5): Wann ist eine Spalte „Ja/Nein“, welcher Wert zählt als „ja“, und das fertige Ergebnis
 * für Blatt, Bericht und Export. Gerechnet wird in mcnemarcochran.ts.
 *
 * Wann eine Spalte Ja/Nein ist: genau zwei verschiedene gültige Werte, und bei Zahlen entweder 0 und 1 oder beide Werte mit Wertebeschriftung (1 = ja, 2 = nein).
 * Zwei Zahlen ohne Beschriftung (etwa 3 und 8) sind ein Messwert, kein Ja/Nein - dort bleibt es beim t-Test bzw. bei der Varianzanalyse.
 * Welcher Wert „ja“ ist (Festlegung, im Blatt genannt und umkehrbar): ein Wert, dessen Beschriftung oder Text wie „ja“, „yes“, „wahr“ oder „bestanden“ lautet; sonst bei Zahlen der
 * größere Wert (1 bei 0/1), bei Text die alphabetisch zweite Antwort - dieselbe feste Regel wie beim Ereignis der logistischen Regression, unabhängig von der Zeilenreihenfolge.
 * PSPP nennt dagegen den zuerst in den Daten stehenden Wert „Success“; die Reihenfolge der Daten darf bei Statable keine Rolle spielen.
 */
import type { Spalte } from './verzeichnis';
import { cochranQ, mcnemar, type CochranQ, type McNemar } from './mcnemarcochran';

export interface JaNein {
  /** Die beiden Werte, wie sie in den Daten stehen (Zahlen als Zahltext). */
  ja: string; nein: string;
  /** Anzeigenamen (Wertebeschriftung, sonst der Wert). */
  jaName: string; neinName: string;
  /** Haben beide Werte einen Namen (Text oder Wertebeschriftung)? Sonst (0 und 1 ohne Beschriftung) sagen die Sätze „ja“ und „nein“ und nennen den Wert nur in der Festlegung. */
  beschriftet: boolean;
  /** Wie der Wert für „ja“ gefunden wurde: durch ein Wort („beschriftung“), als größerer Wert, als alphabetisch zweiter Text. */
  regel: 'beschriftung' | 'groesser' | 'alphabet';
  umgekehrt: boolean;
}

const JA = /^(ja|j|yes|y|oui|si|sí|sim|wahr|true|richtig|korrekt|stimmt|trifft zu|bestanden|gelöst|vorhanden|erfüllt)\b/i;
const NEIN = /^(nein|no|non|não|falsch|false|inkorrekt|stimmt nicht|trifft nicht zu|nicht bestanden|nicht gelöst|nicht vorhanden|nicht erfüllt|kein|keine)\b|^n$/i;

/** Die gültigen Werte als Text: Zahlen so, wie `Number` sie schreibt (1, nicht 1.0). */
const wertText = (v: string | number, zahl: boolean) => (zahl ? String(Number(v)) : String(v).trim());

/** Ist die Spalte Ja/Nein, und welcher Wert ist „ja“? `werte`: die gültigen Werte der Spalte (ohne Lücken und „keine Angabe“-Codes). `umgekehrt` vertauscht „ja“ und „nein“. */
export function jaNeinWerte(sp: Pick<Spalte, 'art' | 'werteLabels'>, werte: (string | number)[], umgekehrt = false): JaNein | null {
  if (sp.art === 'datum') return null;
  const zahl = sp.art === 'zahl';
  const roh = [...new Set(werte.filter(v => v !== '' && v !== null && v !== undefined).map(v => wertText(v, zahl)))];
  if (roh.length !== 2) return null;
  const etikett = (w: string): string | undefined => {
    if (!zahl) return undefined;
    const direkt = sp.werteLabels[w]; if (direkt !== undefined) return direkt;
    for (const [k, t] of Object.entries(sp.werteLabels)) if (Number(k) === Number(w)) return t;
    return undefined;
  };
  if (zahl && !(roh.every(w => w === '0' || w === '1') || roh.every(w => etikett(w) !== undefined))) return null;
  const name = (w: string) => etikett(w) ?? w;
  const sortiert = zahl ? [...roh].sort((a, b) => Number(a) - Number(b)) : [...roh].sort(new Intl.Collator('de').compare);
  let regel: JaNein['regel'] = zahl ? 'groesser' : 'alphabet', ja = sortiert[1]!, nein = sortiert[0]!;
  const istJa = roh.map(w => JA.test(name(w).trim())), istNein = roh.map(w => NEIN.test(name(w).trim()));
  if (istJa[0] !== istJa[1]) { const i = istJa[0] ? 0 : 1; ja = roh[i]!; nein = roh[1 - i]!; regel = 'beschriftung'; }
  else if (istNein[0] !== istNein[1]) { const i = istNein[0] ? 1 : 0; ja = roh[i]!; nein = roh[1 - i]!; regel = 'beschriftung'; }
  if (umgekehrt) [ja, nein] = [nein, ja];
  return { ja, nein, jaName: name(ja), neinName: name(nein), beschriftet: !zahl || (etikett(ja) !== undefined && etikett(nein) !== undefined), regel, umgekehrt };
}

/** Haben alle Spalten dieselben zwei Werte? Dann ist das gemeinsame „ja“ eindeutig. Sonst `null`. */
export function gemeinsamJaNein(k: (JaNein | null)[]): JaNein | null {
  if (!k.length || k.some(x => !x)) return null;
  const e = k[0]!;
  return k.every(x => x!.ja === e.ja && x!.nein === e.nein) ? e : null;
}

/** 1 für „ja“, 0 für „nein“ (Zahlen und Text gleich behandelt). */
export const alsNull1 = (v: string | number, k: JaNein, zahl: boolean): number => (wertText(v, zahl) === k.ja ? 1 : 0);

/* ---------------------------------------------------------------- fertige Ergebnisse */
/** Gespeicherte Form des McNemar-Ergebnisses (Blatt, Projektdatei): Unendlich wird zu `null`, wenn das Projekt als JSON gespeichert wird - darum nie auf `Infinity` prüfen, sondern `kein` und `null` lesen. */
export interface McNemarE extends McNemar {
  art: 'mcnemar'; vorher: string; nachher: string;
  /** „ja“ und „nein“ mit Anzeigenamen; `umgekehrt`: von Hand vertauscht. */
  ja: JaNein;
  /** Anteil „ja“ vorher und nachher unter den n Personen. */
  anteilVorher: number; anteilNachher: number;
  /** Alle Zeilen der Daten (auch die mit Lücke). */
  gesamt: number;
}
export function mcnemarErgebnis(vorher: string, nachher: string, v: number[], nach: number[], ja: JaNein, gesamt: number): McNemarE {
  const e = mcnemar(v, nach), n = e.n;
  return { ...e, art: 'mcnemar', vorher, nachher, ja, anteilVorher: n ? (e.a + e.b) / n : NaN, anteilNachher: n ? (e.a + e.c) / n : NaN, gesamt };
}

export interface CochranE extends CochranQ {
  art: 'cochran'; spalten: string[]; ja: JaNein;
  /** Anteil „ja“ je Zeitpunkt unter den n Personen. */
  anteile: number[];
  gesamtZeilen: number;
}
export function cochranErgebnis(spalten: string[], daten: number[][], ja: JaNein, gesamtZeilen: number): CochranE {
  const e = cochranQ(daten, spalten);
  return { ...e, art: 'cochran', spalten, ja, anteile: e.spaltensummen.map(s => s / e.n), gesamtZeilen };
}
