/**
 * „Gehe zu“ der Datenansicht (Johannes 08.11., wie in Tabellenkalkulationen):
 *   5      → Zeile 5
 *   4 5    → Spalte 4, Zeile 5 (auch 4,5 oder 4;5)
 *   D5     → Spalte D (= 4), Zeile 5 (auch „d 5“, „AA12“)
 * Rückgabe mit Zählung ab 0; `spalte` ist null, wenn nur eine Zeile gemeint ist.
 */
export type GeheZu = { zeile: number; spalte: number | null } | { fehler: 'leer' | 'keine-zelle' | 'zeile' | 'spalte'; grenze?: number };

/** Buchstaben-Spalte wie in Tabellenkalkulationen: A = 1, Z = 26, AA = 27. */
export function buchstabenSpalte(b: string): number {
  let n = 0;
  for (const c of b.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

export function geheZuZelle(eingabe: string, zeilen: number, spalten: number): GeheZu {
  const t = eingabe.trim();
  if (!t) return { fehler: 'leer' };
  let z: number, sp: number | null;
  let m: RegExpMatchArray | null;
  if (/^\d+$/.test(t)) { z = Number(t); sp = null; }
  else if ((m = t.match(/^(\d+)\s*[\s,;:.\/-]\s*(\d+)$/))) { sp = Number(m[1]); z = Number(m[2]); }
  else if ((m = t.match(/^([a-zA-Z]{1,3})\s*(\d+)$/))) { sp = buchstabenSpalte(m[1]!); z = Number(m[2]); }
  else return { fehler: 'keine-zelle' };
  if (sp !== null && (sp < 1 || sp > spalten)) return { fehler: 'spalte', grenze: spalten };
  if (z < 1 || z > zeilen) return { fehler: 'zeile', grenze: zeilen };
  return { zeile: z - 1, spalte: sp === null ? null : sp - 1 };
}
