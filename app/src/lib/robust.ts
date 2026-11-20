/**
 * Robuste Lagemaße (Später, Welle S-B, Teil 4; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 4 und „Entscheidungen Opus“): das 5 %-getrimmte Mittel genau wie SPSS und PSPP.
 * Reine Funktionen ohne Oberfläche; Sätze: lib/robustsaetze.ts.
 *
 * Wie SPSS (IBM Algorithms, EXAMINE „5% Trimmed Mean“) und PSPP (`math/trimmed-mean.c`): Gewichtssumme W, abgeschnitten werden unten und oben je anteil · W GEWICHTSANTEILE,
 * ein Randwert zählt also anteilig. Das ist NICHT `mean(x, trim = 0.05)` aus R: Das schneidet floor(n · 0,05) ganze Werte je Seite ab (bei n < 20 nichts).
 * Huber-M gibt es in S-B nicht (Entscheidung Opus: Startwert nicht belegt, kein SPSS-Ergebnis); die Zahl hätte denselben Namen und dieselbe Konstante wie in SPSS, aber einen anderen Wert.
 */

/** Anteil, der oben und unten abgeschnitten wird (SPSS: 5 %). */
export const TRIM_ANTEIL = 0.05;

/**
 * 5 %-getrimmtes Mittel mit Gewichten (Häufigkeitsgewichte, auch Kommazahlen). Ohne Gewichte zählt jeder Wert 1.
 * Gültig ist ein Paar, wenn der Wert endlich ist und das Gewicht endlich und größer als 0. Kein gültiger Wert: `null`.
 * TM = Σ x₍ᵢ₎ · w̃ᵢ / ((1 − 2·anteil) · W) mit w̃ᵢ = Länge des Überlapps der Gewichtsstrecke des i-ten Werts mit [anteil · W, (1 − anteil) · W].
 */
export function getrimmtesMittel(werte: number[], gewichte?: number[], anteil: number = TRIM_ANTEIL): number | null {
  const paare: [number, number][] = [];
  for (let i = 0; i < werte.length; i++) {
    const x = werte[i]!, w = gewichte ? gewichte[i]! : 1;
    if (Number.isFinite(x) && Number.isFinite(w) && w > 0) paare.push([x, w]);
  }
  if (!paare.length) return null;
  paare.sort((a, b) => a[0] - b[0]);
  const a = Math.min(Math.max(anteil, 0), 0.4999999);
  let W = 0; for (const [, w] of paare) W += w;
  const lo = a * W, hi = (1 - a) * W;
  let cum = 0, summe = 0;
  for (const [x, w] of paare) {
    const von = Math.max(cum, lo), bis = Math.min(cum + w, hi);
    if (bis > von) summe += (bis - von) * x;
    cum += w;
  }
  return summe / ((1 - 2 * a) * W);
}
