/**
 * „Modell“ unter „Weitere Wege“ der Frage „Lässt sich etwas vorhersagen?“ (Welle 3): linear (Standard), ordinal, Zähldaten, multinomial.
 * Reine Funktionen ohne Sitzung. Rechnen: kategreg.ts (R), Prüfliste: katpruefung.ts, Sätze: kategregsaetze.ts.
 *
 * Welche Modelle zur Zielspalte passen (Fachblatt „Platz in der Oberfläche“):
 *  - genau zwei Werte: logistische Regression, keine Wahl (wie bisher);
 *  - Text oder Zahl mit Wertebeschriftungen und Niveau „nominal“, 3 bis 12 Stufen: multinomial (es gibt keinen anderen sinnvollen Weg);
 *  - Text mit Niveau „ordinal“: ordinal oder multinomial (linear geht mit Text nicht);
 *  - Zahl: linear (Standard); ordinal und multinomial, wenn die Spalte geordnete Stufen hat (Niveau „ordinal“ oder Wertebeschriftungen, 3 bis 12 Stufen);
 *    Zähldaten, wenn alle Werte ganze Zahlen ab 0 sind.
 * Eine Wahl, die nicht (mehr) passt, gilt nicht: es gilt der Standard der Zielart (`modellGilt`). Alte Blätter ohne dieses Feld bleiben linear.
 */
import type { Spalte } from './verzeichnis';

/** `quantil` (Quantilregression) und `penal` (Ridge, Lasso, Elastic Net; Später S-E) kommen nie aus `modelleFuer`, sondern aus `zusatzModelle`; ihre Einstellungen stehen in `ZusatzWahl.vorh` (lib/vorhwahl.ts). */
export type ModellArt = 'linear' | 'ordinal' | 'zaehl' | 'multi' | 'quantil' | 'penal' | 'probit' | 'wls' | 'nls';
/** Kurs-Paket (Fachblatt KURSPAKET): `probit` (Ja/Nein-Ziel, neben Logit; `linear` heißt dort Logit) und `wls` (Zahl-Ziel, Präzisionsgewichte). Wie `quantil` und `penal` nie aus `modelleFuer`, sondern aus `kursModelle`;
 *  die Spalte der Präzisionsgewichte steht in `ModellWahl.zeit`. */
export type ZaehlWahl = 'auto' | 'poisson' | 'negbin';
/** Die Wahl am Blatt. `zeit`: Spalte der Beobachtungszeit (leer = keine), `referenz`: Beschriftung der Vergleichskategorie (leer = die erste Stufe). */
/** `formel`: nur bei `nls` (nichtlineare Regression, Abschnitt 5): eine der vier festen Formeln; fehlt in alten Projekten. */
export interface ModellWahl { art: ModellArt; zaehl: ZaehlWahl; zeit: string; referenz: string; formel?: string }
export const leereModell = (): ModellWahl => ({ art: 'linear', zaehl: 'auto', zeit: '', referenz: '' });
/** Alte Projekte haben kein `modell`: sie bleiben linear. */
export const kopiereModell = (m: ModellWahl | undefined): ModellWahl => (m ? { art: m.art, zaehl: m.zaehl, zeit: m.zeit, referenz: m.referenz, ...(m.formel ? { formel: m.formel } : {}) } : leereModell());
/** Ist ein anderes Modell als das lineare gewählt (dann wird die Wahl am Blatt gespeichert)? */
export const modellAn = (m: ModellWahl | undefined) => !!m && m.art !== 'linear';

/** Art der Zielspalte: `binaer` = genau zwei Werte (logistische Regression); `nominal`; `ordnung` = Text mit Niveau ordinal; `zahl`; sonst `null` (geht nicht als Ziel). */
export type ZielArt = 'binaer' | 'nominal' | 'ordnung' | 'zahl';
export const STUFEN_MIN = 3, STUFEN_MAX = 12;
const beschriftet = (sp: Pick<Spalte, 'werteLabels'>) => Object.keys(sp.werteLabels).length > 0;
export function zielArt(sp: Pick<Spalte, 'art' | 'niveau' | 'werteLabels'>, verschieden: number): ZielArt | null {
  if (sp.art === 'datum') return null;
  if (verschieden === 2) return 'binaer';
  const stufen = verschieden >= STUFEN_MIN && verschieden <= STUFEN_MAX;
  if (sp.art === 'text') return stufen ? (sp.niveau === 'ordinal' ? 'ordnung' : 'nominal') : null;
  // Zahl: nur „nominal MIT Wertebeschriftungen“ ist ein Gruppen-Ziel; alles andere war und bleibt eine Zahl (Likert-Items mit Beschriftungen, Niveau „Scale“, rechnen linear).
  if (sp.niveau === 'nominal' && beschriftet(sp) && stufen) return 'nominal';
  if (sp.niveau === 'nominal' && beschriftet(sp)) return null;
  return 'zahl';
}
/** Haben die Werte geordnete Stufen (Niveau „ordinal“ oder Wertebeschriftungen, 3 bis 12 Stufen)? Dann kommen ordinal und multinomial in Frage. */
export const hatStufen = (sp: Pick<Spalte, 'niveau' | 'werteLabels'>, verschieden: number) => verschieden >= STUFEN_MIN && verschieden <= STUFEN_MAX && (sp.niveau === 'ordinal' || beschriftet(sp));
/** Alle Werte ganze Zahlen ab 0 (und mindestens drei verschiedene)? Dann kommt eine Zähldaten-Regression in Frage. */
export const zaehlwerte = (werte: number[]): boolean => werte.length > 0 && werte.every(v => Number.isInteger(v) && v >= 0) && new Set(werte).size >= 3;

/** Enthält die Zielspalte Zahlen, die keine Zählwerte sind (negativ oder mit Nachkommastellen)? Dann fehlt „Zähldaten“ in der Wahl, und die Wahl sagt warum. */
export const andereAlsZaehlwerte = (werte: number[]): boolean => werte.some(v => !Number.isInteger(v) || v < 0);

/** Die Modelle, die zu dieser Zielspalte passen (das erste ist der Standard). `werte`: die gültigen Zahlen der Spalte (für Zähldaten). */
export function modelleFuer(sp: Pick<Spalte, 'art' | 'niveau' | 'werteLabels'>, verschieden: number, werte: number[] = []): ModellArt[] {
  const art = zielArt(sp, verschieden);
  if (art === null || art === 'binaer') return [];
  if (art === 'nominal') return ['multi'];
  if (art === 'ordnung') return ['ordinal', 'multi'];
  return ['linear', ...(hatStufen(sp, verschieden) ? (['ordinal', 'multi'] as ModellArt[]) : []), ...(sp.art === 'zahl' && zaehlwerte(werte) ? (['zaehl'] as ModellArt[]) : [])];
}
/** Später S-E: die Optionen unter „Weitere Wege“, die nur zu einem Zahl-Ziel passen: Quantilregression (Q1) und Ridge/Lasso/Elastic Net (Q2). Zwei Werte, Text und beschriftete Gruppen: keine. */
export function zusatzModelle(sp: Pick<Spalte, 'art' | 'niveau' | 'werteLabels'>, verschieden: number, _werte: number[] = []): ('quantil' | 'penal')[] {
  return zielArt(sp, verschieden) === 'zahl' ? ['quantil', 'penal'] : [];
}
/** Kurs-Paket: die Optionen unter „Weitere Wege“ für Probit (Ziel mit zwei Werten) und gewichtete Regression (Zahl-Ziel). */
export function kursModelle(sp: Pick<Spalte, 'art' | 'niveau' | 'werteLabels'>, verschieden: number): ('probit' | 'wls' | 'nls')[] {
  const a = zielArt(sp, verschieden);
  return a === 'binaer' ? ['probit'] : a === 'zahl' ? ['wls', 'nls'] : [];
}
/** Das Modell, das gilt: die Wahl, wenn sie zur Zielspalte passt, sonst der Standard. Zwei Werte: linear (= die logistische Regression, keine Wahl). */
export function modellGilt(wahl: ModellWahl | undefined, passend: ModellArt[]): ModellArt {
  if (!passend.length) return 'linear';
  return wahl && passend.includes(wahl.art) ? wahl.art : passend[0]!;
}
/** Die Vergleichskategorie, die gilt: die gewählte, wenn sie unter den Stufen ist, sonst die erste. */
export const referenzGilt = (wahl: ModellWahl | undefined, stufen: string[]): string => (wahl && stufen.includes(wahl.referenz) ? wahl.referenz : stufen[0] ?? '');
