/**
 * Äquivalenztest (G15) und Reliable Change Index (G16) am Blatt: die Wahl (Weitere Wege) und die gespeicherten Ergebnisse. Rechnen: tost.ts, rci.ts.
 * Reine Funktionen ohne Sitzung - Sätze und Tabellen: aequisaetze.ts.
 *
 * Wahl: Δ ist eine Pflichteingabe ohne Standardwert (die Grenzen müssen vor der Studie begründet sein, Lakens 2017). RCI: Reliabilität eingegeben (Retest-Reliabilität, die eigentliche Wahl)
 * oder Cronbachs Alpha der Items einer Skala bei der ersten Messung (nur Ersatz); „Hohe Werte sind besser/schlechter“ ist eine Pflichtwahl ohne Voreinstellung. Kein Cut-off c.
 */
import { cronbachAlpha, rciGruppe, type Einordnung } from './rci';
import { tostGepaart, tostGruppen, type TostErgebnis } from './tost';
import { kopiereHier, leereHier, type HierWahl } from './hierwahl';
import { kopiereModell, leereModell, modellAn, type ModellWahl } from './kategwahl';
import type { BootArt } from './bootstrap';
import { kopiereZufall, type ZufallWahl } from './zufallswahl';
import { kopiereProzess, prozessAn, type ProzessWahl } from './prozesswahl';
import { kopiereVorh, type VorhWahl } from './vorhwahl';
import { kopiereUeberleben, ueberlebenAn, type UeberlebenWahl } from './ueberlebenwahl';

export interface ZusatzWahl {
  tost: { an: boolean; delta: string };
  /** Welle S-B, L5: „Ohne Normalverteilung - mit Zufallsverfahren“ (Permutationstest, Bootstrap) unter „Weitere Wege“ der Karten Gruppen, Zusammenhang, Vorhersage, Verteilung. Fehlt = aus. */
  zufall?: ZufallWahl;
  rci: { an: boolean; quelle: 'retest' | 'alpha'; r: string; skala: string; richtung: '' | 'besser' | 'schlechter' };
  /** Blöcke bilden (G4, hierarchische Regression): gehört zur Frage „Lässt sich etwas vorhersagen?“, Rechnen: hierreg.ts. */
  hier: HierWahl;
  /** Modell der Frage „Lässt sich etwas vorhersagen?“ (Welle 3): linear (Standard), ordinal, Zähldaten, multinomial; Rechnen: kategreg.ts. Alte Blätter ohne dieses Feld bleiben linear. */
  modell: ModellWahl;
  /** Welle 7, M1: Cox-Regression in der Kaplan-Meier-Karte (die Prädiktoren stehen in der Lücke l4 des Blatts); `an`, sobald Spalten gewählt sind. Braucht R (survival). */
  cox: { an: boolean };
  /** Welle 7, M2: Studiendesign der Kreuztabelle 2 × 2 - bei der Fall-Kontroll-Studie ist nur das Odds Ratio zulässig (Risiken, RD, RR, NNT entfallen). Standard: Kohorte oder Experiment. */
  design: 'kohorte' | 'fallKontrolle';
  /** Spätere Welle S-A: Art des Bootstrap-Intervalls bei der Mediation - Perzentil (Standard, Hayes) oder BCa (Weitere Wege). Fehlt in alten Blättern = Perzentil. */
  bootArt?: BootArt;
  /** Später S-D, G14: bedingte oder serielle Mediation (PROCESS 7, 14, 6) unter „Weitere Wege“ der Karte Mediation. Fehlt in alten Blättern = einfache Mediation. */
  prozess?: ProzessWahl;
  /** Später S-B, M5: „Stärke des Zusammenhangs“ in der Kreuztabelle - `an`, dazu die Maße, die gezeigt werden (Gamma, Tau, Somers d, Lambda, UC). Fehlt in alten Blättern = aus. */
  masse?: { an: boolean; arten: import('./zusammenhangsmasse').MassArt[] };
  /** Später S-B, M3: Schichtvariable der Kreuztabelle (Mantel-Haenszel); leer = keine. Fehlt in alten Blättern = keine. */
  schicht?: string;
  /** Später S-C: welche Prozente die Kreuztabelle zeigt. Fehlt (alte Blätter, Voreinstellung) = nur Zeilenprozent, wie bisher. */
  prozent?: ('zeile' | 'spalte' | 'gesamt')[];
  /** Später S-D2 (Bauer A2): Karte Verteilung mit Umfragegewicht und der Antwort „einzeln gezogen: Ja“ - `test`: Mittelwert gegen den Wert `wert` testen (t mit n − 1), `anteil`: Intervall für Anteile
   *  (Logit = Voreinstellung, Korn-Graubard unter „Weitere Wege“). Fehlt = aus / Logit. */
  umfrage?: { test: boolean; wert: string; anteil: 'logit' | 'beta' };
  /** Später S-E: Einstellungen der Quantilregression und der Strafregression (Ridge, Lasso, Elastic Net) unter „Weitere Wege“ der Frage „Lässt sich etwas vorhersagen?“. Fehlt = Voreinstellungen; gespeichert nur mit `modell.art` 'quantil' oder 'penal'. */
  vorh?: VorhWahl;
  /** Später S-F (Bauer A): Sterbetafel und Cox mit zeitabhängiger Größe unter „Weitere Wege“ der Karte Kaplan-Meier. Fehlt in alten Blättern = aus. */
  ueberleben?: UeberlebenWahl;
}
export const leereZusatz = (): ZusatzWahl => ({ tost: { an: false, delta: '' }, rci: { an: false, quelle: 'retest', r: '', skala: '', richtung: '' }, hier: leereHier(), modell: leereModell(), cox: { an: false }, design: 'kohorte', bootArt: 'perzentil', masse: { an: false, arten: [] }, schicht: '' });
export const kopiereZusatz = (z: ZusatzWahl | undefined): ZusatzWahl => (z ? { tost: { ...z.tost }, rci: { ...z.rci }, hier: kopiereHier(z.hier), modell: kopiereModell(z.modell), cox: { an: !!z.cox?.an }, design: z.design === 'fallKontrolle' ? 'fallKontrolle' : 'kohorte', bootArt: z.bootArt === 'bca' ? 'bca' : 'perzentil', masse: { an: !!z.masse?.an, arten: [...(z.masse?.arten ?? [])] }, schicht: z.schicht ?? '', ...(z.prozent ? { prozent: [...z.prozent] } : {}), ...(z.zufall?.an ? { zufall: kopiereZufall(z.zufall) } : {}), ...(prozessAn(z.prozess) ? { prozess: kopiereProzess(z.prozess) } : {}), ...(umfrageWahlAn(z.umfrage) ? { umfrage: { test: !!z.umfrage!.test, wert: z.umfrage!.wert ?? '', anteil: z.umfrage!.anteil === 'beta' ? 'beta' as const : 'logit' as const } } : {}), ...((z.modell?.art === 'quantil' || z.modell?.art === 'penal') && z.vorh ? { vorh: kopiereVorh(z.vorh) } : {}), ...(ueberlebenAn(z.ueberleben) ? { ueberleben: kopiereUeberleben(z.ueberleben) } : {}) } : leereZusatz());   // alte Projekte haben kein `hier`, `modell`, `cox`, `design`, `bootArt`, `masse`, `schicht`
/** Ist etwas gewählt (dann wird die Wahl am Blatt gespeichert)? */
export const zusatzAn = (z: ZusatzWahl | undefined) => !!z && (z.tost.an || z.rci.an || !!z.hier?.an || modellAn(z.modell) || !!z.cox?.an || z.design === 'fallKontrolle' || z.bootArt === 'bca' || masseAn(z) || !!z.schicht || !!z.zufall?.an || prozentAn(z) || prozessAn(z.prozess) || umfrageWahlAn(z.umfrage) || ueberlebenAn(z.ueberleben));
/** Hat die Karte Verteilung mit Umfragegewicht eine Wahl, die von der Voreinstellung abweicht (Test gegen einen Wert, Korn-Graubard)? */
export const umfrageWahlAn = (u: ZusatzWahl['umfrage']) => !!u && (!!u.test || u.anteil === 'beta');
/** Der Wert, gegen den getestet wird: eine Zahl (Komma oder Punkt), sonst `null` (auch bei ausgeschaltetem Test). */
export const umfrageTestWert = (u: ZusatzWahl['umfrage']): number | null => (u?.test ? zahlAusText(u.wert ?? '') : null);
/** Die Prozente der Kreuztabelle: Voreinstellung nur Zeilenprozent (heutiges Verhalten). */
export const prozentBasen = (z: ZusatzWahl | undefined): ('zeile' | 'spalte' | 'gesamt')[] => z?.prozent ?? ['zeile'];
/** Weicht die Wahl von der Voreinstellung ab (dann wird sie am Blatt gespeichert)? */
export const prozentAn = (z: ZusatzWahl | undefined) => { const p = prozentBasen(z); return !(p.length === 1 && p[0] === 'zeile'); };
/** Ist die Stärke des Zusammenhangs an und mindestens ein Maß gewählt? */
export const masseAn = (z: ZusatzWahl | undefined) => !!z?.masse?.an && z.masse.arten.length > 0;

/** Eine Zahl aus dem Eingabefeld: Komma oder Punkt als Dezimalzeichen, sonst `null`. */
export function zahlAusText(t: string): number | null {
  const x = t.trim().replace(/−/g, '-');
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(x)) return null;
  const v = Number(x.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}
/** Grenze Δ: eine Zahl größer 0. */
export const deltaAusText = (t: string): number | null => { const v = zahlAusText(t); return v !== null && v > 0 ? v : null; };
/** Reliabilität r: von 0 bis unter 1. */
export const reliabilitaetAusText = (t: string): number | null => { const v = zahlAusText(t); return v !== null && v >= 0 && v < 1 ? v : null; };

/* ------------------------------------------------------------ G15 */

/** Das Ergebnis des Äquivalenztests mit dem, was die Sätze brauchen (Namen der Gruppen bzw. Messungen). */
export interface TostAnzeige { e: TostErgebnis; gepaart: boolean; abhaengig: string; a?: string; b?: string; vorher?: string; nachher?: string }

export function tostAusGruppen(wa: number[], wb: number[], delta: number, abhaengig: string, a: string, b: string): TostAnzeige | null {
  const e = tostGruppen(wa, wb, delta);
  return e && { e, gepaart: false, abhaengig, a, b };
}
/** `paare`: [vorher, nachher] je Person. */
export function tostAusPaaren(paare: [number, number][], delta: number, vorher: string, nachher: string): TostAnzeige | null {
  const e = tostGepaart(paare.map(p => p[1]), paare.map(p => p[0]), delta);
  return e && { e, gepaart: true, abhaengig: nachher, vorher, nachher };
}

/* ------------------------------------------------------------ G16 */

/** Mehr Personen speichert und zeigt Statable in der Tabelle je Person nicht; die Anteile gelten immer für alle. */
export const RCI_MAX_PERSONEN = 1000;
export interface RciPerson { zeile: number; vorher: number; nachher: number; rci: number }
export interface RciAnzeige {
  vorher: string; nachher: string; n: number; sdVorher: number; sDiff: number; r: number;
  quelle: 'retest' | 'alpha'; skala?: string; alphaN?: number; alphaItems?: number; hoheBesser: boolean;
  anzahl: Record<Einordnung, number>; anteil: Record<Einordnung, number>;
  /** Die ersten höchstens `RCI_MAX_PERSONEN` Personen in der Reihenfolge der Daten. */
  personen: RciPerson[];
}
export interface RciQuelle { quelle: 'retest' | 'alpha'; skala?: string; alphaN?: number; alphaItems?: number }

/** Cronbachs Alpha aus den Items (Zeilen = Personen); `null`, wenn es sich nicht rechnen lässt. */
export const alphaAus = (items: number[][]): number | null => cronbachAlpha(items);

/** RCI aller Personen aus Zeilennummer, Vorher- und Nachher-Wert; `null`, wenn er sich nicht rechnen lässt (zu wenige Personen, keine Streuung der Vorher-Werte, r ungültig). */
export function rciAnzeige(daten: { zeile: number; vorher: number; nachher: number }[], r: number, q: RciQuelle, hoheBesser: boolean, vorher: string, nachher: string): RciAnzeige | null {
  const g = rciGruppe(daten.map(p => p.vorher), daten.map(p => p.nachher), r, hoheBesser);
  if (!g) return null;
  return { vorher, nachher, n: g.n, sdVorher: g.sdVorher, sDiff: g.sDiff, r, ...q, hoheBesser, anzahl: g.anzahl, anteil: g.anteil,
    personen: daten.slice(0, RCI_MAX_PERSONEN).map((p, i) => ({ ...p, rci: g.personen[i]!.rci })) };
}
