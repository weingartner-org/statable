/**
 * Hierarchische Regression (G4, Fachblatt Welle 2, Paket B): die Prädiktoren in 2 oder 3 Blöcken, je Block ein eigener PSPP-Lauf.
 *
 * PSPP 2.1.1 kennt bei REGRESSION nur /METHOD=ENTER und keine mehreren Methoden in einem Lauf. Statable rechnet darum je Block ein Modell mit den Prädiktoren der Blöcke 1 bis k
 * und bildet die Änderung selbst: ΔR² = R²k − R²(k−1), F-Änderung = (ΔR² / df1) / ((1 − R²k) / df2), df1 = neue Koeffizienten (eine Gruppen-Spalte zählt mit ihren
 * Hilfsspalten, k − 1), df2 = Rest-Freiheitsgrade des größeren Modells dieses Schrittes - wie SPSS „F Change“ und wie R `anova(m_(k−1), m_k)` PAARWEISE
 * (nicht `anova(m1, m2, m3)` in einem Aufruf: das nähme für alle Schritte den Fehlerterm des größten Modells). Block 1 wird gegen das Nullmodell geprüft (ΔR² = R²).
 *
 * Alle Blöcke rechnen auf DENSELBEN Fällen: Vor jedem Lauf beschränkt `TEMPORARY. SELECT IF` die Fälle auf die, die in Ziel und in allen Spalten aller Blöcke vollständig sind
 * (PSPP filtert nicht über Läufe hinweg: hierreg-pspp.test.ts). Gruppen-Spalten gehen als 0/1-Hilfsspalten ein (regfaktor.ts).
 * Tests: hierreg.test.ts (gegen R), hierreg-pspp.test.ts (PSPP gegen R), hierregsaetze.test.ts (Sätze). Sätze und Tabellen: hierregsaetze.ts.
 * ⚠ von der Fachperson abzunehmen: Zuschnitt (2 oder 3 Blöcke), Standardverteilung der Prädiktoren auf die Blöcke.
 */
import type { OutputItem } from '../engine/types';
import { regRecodes, regVariablen, type RegTerm } from './regfaktor';
import { regressionsModelle } from './regressionlesen';
import { betai } from './verteilung';

/** Obere Wahrscheinlichkeit der F-Verteilung (wie ergebnis.ts). */
const pF = (f: number, df1: number, df2: number) => (f > 0 ? betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) : 1);

/** Ein Block des Ergebnisses. */
export interface HierBlock {
  nr: number;                  // 1, 2, 3
  spalten: string[];           // Namen der gewählten Spalten dieses Blocks (Gruppen-Spalte unter ihrem Spaltennamen, nicht als Hilfsspalten)
  anzahl: number;              // neue Koeffizienten = df1 (Gruppe mit k Stufen zählt k − 1)
  r2: number; r2korr: number;  // R² und korrigiertes R² des Modells bis einschließlich dieses Blocks
  dr2: number;                 // Block 1: = r2 (gegen das Nullmodell); sonst r2 − r2 des Vorblocks
  f: number; df1: number; df2: number; p: number;   // F-Änderung: ((dr2) / df1) / ((1 − r2) / df2), df2 = Rest-df des Modells dieses Blocks, p obere Wahrscheinlichkeit der F-Verteilung
}
/** Ein Koeffizient des letzten Modells; `spalte` = gewählte Spalte (bei Gruppen-Prädiktoren die Gruppen-Spalte), `beta` = standardisiertes Beta (PSPP „Beta“), bei der Konstante NaN. */
export interface HierKoef { name: string; spalte: string; b: number; se: number; t: number; p: number; beta: number }
export interface Hierreg {
  art: 'hierreg'; ziel: string; n: number;             // n = Fälle in ALLEN Blöcken (gleich für jeden Block)
  bloecke: HierBlock[];
  koeffizienten: HierKoef[];                           // Modell des LETZTEN Blocks, ohne Konstante, Reihenfolge der Spalten Block 1, 2, 3 (Gruppe → Hilfsspalten)
  konstante: HierKoef;
  /** Fälle, die mit Ziel und den Spalten von Block 1 allein vollständig wären, aber wegen Lücken in späteren Blöcken fehlen (setzt das Blatt aus den Daten; fehlt = unbekannt). */
  luecken?: number;
}

/** Ein REGRESSION-Lauf je Block (kumulierte Spalten), jeweils nach `TEMPORARY.` und `SELECT IF` auf Ziel und ALLE Spalten ALLER Blöcke. */
export function hierregBefehl(ziel: string, bloecke: RegTerm[][]): string {
  if (bloecke.length < 2 || bloecke.length > 3) throw new Error('Hierarchische Regression: zwei oder drei Blöcke');
  if (bloecke.some(b => b.length === 0)) throw new Error('Hierarchische Regression: jeder Block braucht mindestens einen Prädiktor');
  const alle = bloecke.flat();
  const rec = regRecodes(alle);
  // Fälle mit einer Lücke in Ziel oder irgendeiner Spalte (bei Gruppen-Spalten: irgendeiner Hilfsspalte) bleiben in allen Läufen draußen.
  const pruefe = [ziel, ...alle.map(x => (x.faktor ? x.faktor.hilfs[0]! : x.spalte))];
  const auswahl = `SELECT IF (${[...new Set(pruefe)].map(v => `NOT MISSING(${v})`).join(' AND ')}).`;
  return bloecke.map((_, k) => {
    const vars = regVariablen(bloecke.slice(0, k + 1).flat());
    return `TEMPORARY.\n${rec ? rec + '\n' : ''}${auswahl}\nREGRESSION\n  /VARIABLES=${vars.join(' ')} ${ziel}\n  /STATISTICS=COEFF R ANOVA CI(95)\n  /DEPENDENT=${ziel}\n  /METHOD=ENTER.`;
  }).join('\n');
}

/** Die Ausgabe von `hierregBefehl` lesen. `bloecke`: dieselben wie beim Befehl. */
export function hierreg(items: OutputItem[], ziel: string, bloecke: RegTerm[][]): Hierreg {
  const modelle = regressionsModelle(items);
  if (modelle.length !== bloecke.length) throw new Error('Hierarchische Regression: ein Modell je Block erwartet');
  let r2vor = 0, dfVor = 0;
  const liste: HierBlock[] = bloecke.map((b, k) => {
    const m = modelle[k]!, df1 = m.df1 - dfVor, df2 = m.df2, dr2 = m.r2 - r2vor;
    const f = df1 > 0 && df2 > 0 ? (dr2 / df1) / ((1 - m.r2) / df2) : NaN;
    r2vor = m.r2; dfVor = m.df1;
    return { nr: k + 1, spalten: b.map(x => x.spalte), anzahl: regVariablen(b).length, r2: m.r2, r2korr: m.r2korr, dr2, f, df1, df2, p: Number.isFinite(f) ? pF(f, df1, df2) : NaN };
  });
  const letztes = modelle.at(-1)!;
  const zeilen = bloecke.flat().flatMap(x => (x.faktor ? x.faktor.hilfs.map(() => x.spalte) : [x.spalte]));
  if (zeilen.length !== letztes.terme.length) throw new Error('Hierarchische Regression: Zahl der Koeffizienten passt nicht');
  const koef = (t: typeof letztes.konstante, spalte: string): HierKoef => ({ name: t.name, spalte, b: t.b, se: t.se, t: t.t, p: t.p, beta: t.beta });
  return {
    art: 'hierreg', ziel, n: modelle[0]!.n, bloecke: liste,
    koeffizienten: letztes.terme.map((t, i) => koef(t, zeilen[i]!)),
    konstante: koef(letztes.konstante, '')
  };
}

export { leereHier, kopiereHier, hierStandard, hierBlockVon, hierBloecke, hierGueltig, type HierWahl } from './hierwahl';
