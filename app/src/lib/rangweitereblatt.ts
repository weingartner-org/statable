/**
 * Die weiteren Rangtests als Ergebnisse des Blatts (Später, Welle S-B, Teil 3): Vorzeichentest, Mediantest, Jonckheere-Terpstra und Kolmogorov-Smirnov.
 * Sie stehen wie Mann-Whitney, Kruskal-Wallis und Wilcoxon im Feld `rang` des Ergebnisses (`RangErgebnis` in rangtests.ts) und fließen so in Sätze, Tabellen,
 * Bericht, Word und Excel. Gerechnet wird in rangweitere.ts; Sätze und Tabellen: rangweiteresaetze.ts.
 * Der Fallgewicht-Schutz liegt beim Aufrufer (Blatt: mit Fallgewicht gesperrt, Schlüssel `gruppen:rang-weitere` und `praepost:vorzeichen`).
 */
import { jonckheereTerpstra, ksZwei, mediantest, vorzeichenTest, type JtErgebnis, type KsErgebnis, type MedianErgebnis, type VorzeichenErgebnis } from './rangweitere';
import { median, rangVorschlag, type RangVorschlag } from './rangtests';
import type { StufenGrund } from './stufen';

/** Die weiteren Rangtests (Auswahl im Blatt: `blatt.rangArt`). */
export type WeitereArt = 'vorzeichen' | 'median' | 'jt' | 'ks';
/** Gruppen ohne eigenen Test; mit der Reihenfolge, in der sie im Test stehen. */
export interface WeitereGruppe { name: string; n: number; median: number }
/** Wahl beim Jonckheere-Terpstra: Reihenfolge der Gruppen umkehren; zweiseitig (Voreinstellung wie SPSS) oder einseitig „steigt“ / „fällt“. */
export interface JtWahl { umkehren?: boolean; seite?: 'zwei' | 'steigt' | 'faellt' }

export interface VorzeichenE {
  art: 'vorzeichen'; vorher: string; nachher: string; r: VorzeichenErgebnis;
  /** alle Paare mit beiden Werten */ n: number; medianVorher: number; medianNachher: number; medianDiff: number; vorschlag: RangVorschlag;
}
export interface MedianE {
  art: 'median'; abhaengig: string; gruppenSpalte: string; r: MedianErgebnis;
  /** nichtleere Gruppen in der Reihenfolge von `r.ueber` und `r.bis` */ gruppen: WeitereGruppe[]; werte: string[]; vorschlag: RangVorschlag;
}
export interface JonckheereE {
  art: 'jt'; abhaengig: string; gruppenSpalte: string; r: JtErgebnis; wahl: JtWahl;
  /** nichtleere Gruppen in der Reihenfolge des Tests (nach `wahl.umkehren`) */ gruppen: WeitereGruppe[]; werte: string[];
  /** Die Gruppenwerte sind Text ohne Zahlenordnung: die Reihenfolge ist alphabetisch und darum zu prüfen. */ textReihenfolge: boolean; vorschlag: RangVorschlag;
}
export interface KsE {
  art: 'ks'; abhaengig: string; gruppenSpalte: string; r: KsErgebnis; gruppen: [WeitereGruppe, WeitereGruppe]; werte: [string, string]; vorschlag: RangVorschlag;
}

export interface GruppeEin { wert: string; name: string; werte: number[] }
const nichtLeer = (g: GruppeEin[]) => g.filter(x => x.werte.length > 0);
const zuGruppe = (g: GruppeEin): WeitereGruppe => ({ name: g.name, n: g.werte.length, median: median(g.werte) });

/** Vorzeichentest für zwei Messungen; `null`, wenn keine Paare da sind. */
export function vorzeichenErgebnis(vorher: string, nachher: string, paare: [number, number][], stufen: StufenGrund | null = null): VorzeichenE | null {
  if (!paare.length) return null;
  const r = vorzeichenTest(paare), d = paare.map(([a, b]) => Number((b - a).toPrecision(12)));
  return { art: 'vorzeichen', vorher, nachher, r, n: paare.length, medianVorher: median(paare.map(p => p[0])), medianNachher: median(paare.map(p => p[1])), medianDiff: median(d), vorschlag: rangVorschlag([d], stufen) };
}
/** Mediantest für zwei und mehr Gruppen. */
export function medianErgebnis(abhaengig: string, gruppenSpalte: string, gruppen: GruppeEin[], stufen: StufenGrund | null = null): MedianE | null {
  const g = nichtLeer(gruppen);
  if (g.length < 2) return null;
  const r = mediantest(g.map(x => ({ name: x.name, werte: x.werte })));
  return { art: 'median', abhaengig, gruppenSpalte, r, gruppen: g.map(zuGruppe), werte: g.map(x => x.wert), vorschlag: rangVorschlag(g.map(x => x.werte), stufen) };
}
/** Jonckheere-Terpstra für drei und mehr Gruppen in der Reihenfolge der Liste (`wahl.umkehren` kehrt sie um). */
export function jtErgebnis(abhaengig: string, gruppenSpalte: string, gruppen: GruppeEin[], wahl: JtWahl = {}, stufen: StufenGrund | null = null): JonckheereE | null {
  let g = nichtLeer(gruppen);
  if (g.length < 3) return null;
  const text = g.some(x => !Number.isFinite(Number(x.wert)) || x.wert.trim() === '');
  if (wahl.umkehren) g = [...g].reverse();
  const r = jonckheereTerpstra(g.map(x => x.werte));
  return { art: 'jt', abhaengig, gruppenSpalte, r, wahl: { umkehren: !!wahl.umkehren, seite: wahl.seite ?? 'zwei' }, gruppen: g.map(zuGruppe), werte: g.map(x => x.wert), textReihenfolge: text, vorschlag: rangVorschlag(g.map(x => x.werte), stufen) };
}
/** Kolmogorov-Smirnov für genau zwei Gruppen. */
export function ksErgebnis(abhaengig: string, gruppenSpalte: string, a: GruppeEin, b: GruppeEin, stufen: StufenGrund | null = null): KsE | null {
  if (!a.werte.length || !b.werte.length) return null;
  return { art: 'ks', abhaengig, gruppenSpalte, r: ksZwei(a.werte, b.werte), gruppen: [zuGruppe(a), zuGruppe(b)], werte: [a.wert, b.wert], vorschlag: rangVorschlag([a.werte, b.werte], stufen) };
}

export type WeitereErgebnis = VorzeichenE | MedianE | JonckheereE | KsE;
export const WEITERE_ARTEN: readonly WeitereArt[] = ['vorzeichen', 'median', 'jt', 'ks'];
export const istWeitere = (r: { art: string } | null | undefined): r is WeitereErgebnis => !!r && (WEITERE_ARTEN as readonly string[]).includes(r.art);
