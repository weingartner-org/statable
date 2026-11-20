/**
 * Die Wahl unter „Weitere Wege“ der Karte „Wie verteilt sich etwas?“ für zwei Optionen der Welle S-D: Referenzbereich bestimmen (M7) und Ausreißer prüfen (T2).
 * Beide rechnen in JavaScript aus den Zahlenspalten des Projekts (nicht über PSPP); die Wahl gehört zum Blatt (`blatt.weg`, kommt mit der Projektdatei). Fehlt das Feld (alte Projekte), sind beide Optionen aus.
 * Reine Verbindung zwischen den Daten (`s`) und den Funktionen in referenzbereich.ts und ausreisser.ts.
 */
import { istFehlend, fehlendMenge } from './fehlend';
import { s, type Blatt } from './sitzung.svelte';
import { werteVon } from './blatttitel';
import { istSetName } from './mehrfach';
import { lesbar } from './verzeichnis';

export interface ReferenzWahl {
  an: boolean; spalte: string; /** Spalte mit Gruppen (getrennte Bereiche); '' = keine */ gruppe: string;
  methode: 'rang' | 'normal'; /** vorher nach Box-Cox transformieren (nur mit der Normalverteilung) */ boxcox: boolean;
  /** λ: 'schaetzung' = aus den Daten (mit Intervall), 'null' = Logarithmus, 'halb' = Wurzel */ lambda: 'schaetzung' | 'null' | 'halb'; einheit: string;
}
export interface AusreisserWahl { an: boolean; spalte: string; test: 'grubbs' | 'esd' | 'dixon'; alpha: 0.1 | 0.05 | 0.01; seite: 'beide' | 'oben' | 'unten'; k: number }
export interface VerteilungWege { referenz?: ReferenzWahl; ausreisser?: AusreisserWahl }

export const leereReferenz = (): ReferenzWahl => ({ an: false, spalte: '', gruppe: '', methode: 'rang', boxcox: false, lambda: 'schaetzung', einheit: '' });
export const leereAusreisser = (): AusreisserWahl => ({ an: false, spalte: '', test: 'grubbs', alpha: 0.05, seite: 'beide', k: 10 });

/** Ab so vielen Werten rechnet Box-Cox nicht mehr (die Suche nach λ braucht viele Durchgänge über alle Werte). */
export const BOXCOX_MAX_N = 50000;

export interface SpaltenWahl { name: string; label: string }
/** Die Zahlenspalten dieses Blatts (ohne Mehrfachantworten-Sets), die sich für Referenzbereich und Ausreißertest eignen. */
export function zahlenSpalten(b: Blatt): SpaltenWahl[] {
  return werteVon(b).l1.filter(n => !istSetName(n)).flatMap(n => { const sp = s.spalten.find(x => x.name === n); return sp && sp.art === 'zahl' ? [{ name: sp.name, label: lesbar(sp, true) }] : []; });
}
/** Die Werte einer Zahlenspalte, Zeile für Zeile; fehlende Werte (leer, als fehlend vermerkt) sind null. */
export function zahlenWerte(name: string): (number | null)[] {
  const i = s.spalten.findIndex(x => x.name === name); if (i < 0) return [];
  const fehlend = fehlendMenge(s.spalten[i]);
  return s.zeilen.map(z => { const v = z[i]; return typeof v === 'number' && Number.isFinite(v) && !fehlend.includes(v) ? v : null; });
}
/** Spalten, die als Gruppen taugen (2 bis 12 verschiedene Werte, keine Datumsspalte). */
export function gruppenKandidaten(ausser: string): (SpaltenWahl & { stufen: number })[] {
  return s.spalten.flatMap((sp, i) => {
    if (sp.name === ausser || sp.art === 'datum') return [];
    const w = new Set<string | number>();
    for (const z of s.zeilen) { const v = z[i]; if (v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(sp, v))) { w.add(v); if (w.size > 12) return []; } }
    return w.size >= 2 ? [{ name: sp.name, label: lesbar(sp, true), stufen: w.size }] : [];
  });
}
/** Der Name der Gruppe je Zeile (Wertebeschriftung, sonst der Wert); '' = ohne Angabe. */
export function gruppenNamen(name: string): string[] {
  const i = s.spalten.findIndex(x => x.name === name); if (i < 0) return [];
  const sp = s.spalten[i]!;
  return s.zeilen.map(z => { const v = z[i]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sp, v))) return ''; return sp.werteLabels[String(v)] ?? String(v); });
}
/** Hat jemand die Wahl schon getroffen und eine gültige Spalte? Sonst die erste Zahlenspalte des Blatts. */
export const spalteGilt = (wahl: { spalte: string }, spalten: SpaltenWahl[]): string => (spalten.some(x => x.name === wahl.spalte) ? wahl.spalte : spalten[0]?.name ?? '');
