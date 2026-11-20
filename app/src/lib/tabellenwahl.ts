/**
 * Die Wahl der Person bei „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1) und ihre Übersetzung in eine Spezifikation für lib/tabellenmodell.ts.
 * Reine Logik ohne Oberfläche. Die Wahl wird mit dem Blatt gespeichert (`blatt.ergebnis.wahl`); die Tabelle selbst wird nie gespeichert, sondern aus den Daten neu gerechnet -
 * so ist sie nie veraltet (lib/tabellenblatt.ts).
 */
import { istFehlend } from './fehlend';
import type { MehrfachSet } from './mehrfach';
import type { Spalte } from './verzeichnis';
import type { Block, Kennwert, TabellenSpec } from './tabellenmodell';
import type { Gewicht } from './gewichte';

export type Anzeige = 'kat' | 'metrisch' | 'beides' | 'top' | 'mehrfach';
export interface TabellenAuswahl {
  /** Spaltenname, oder `$Name` bei einem Mehrfachantwort-Set */
  id: string;
  anzeige: Anzeige;
  /** nur Top-Box: die ausdrücklich gewählten Stufen (Statable rät die Richtung nie) */
  stufen: number[];
  /** nur Mehrfachset: Fälle ohne Ankreuzung mitzählen */
  mitNull: boolean;
}
export interface TabellenWahl {
  gruppe: string;
  auswahl: TabellenAuswahl[];
  prozentBasis: 'spalte' | 'zeile' | 'gesamt';
  fehlend: 'gueltig' | 'alle';
  mehrfachBasis: 'faelle' | 'antworten';
  gesamt: boolean;
  /** „n (%)“ in einer Zelle statt zwei Spalten (nur die Darstellung; Excel hat immer getrennte Zahlen) */
  kombiniert: boolean;
  kennwerte: Kennwert[];
}

export const KENNWERTE: Kennwert[] = ['n', 'mw', 'sd', 'median'];
export const leereWahl = (): TabellenWahl => ({ gruppe: '', auswahl: [], prozentBasis: 'spalte', fehlend: 'gueltig', mehrfachBasis: 'faelle', gesamt: true, kombiniert: true, kennwerte: [...KENNWERTE] });
/** Alte oder halbe gespeicherte Wahl auf die volle Form bringen. */
export function wahlAus(roh: Partial<TabellenWahl> | undefined | null): TabellenWahl {
  const s0 = leereWahl(), r = roh ?? {};
  return {
    gruppe: r.gruppe ?? s0.gruppe, auswahl: (r.auswahl ?? []).map(a => ({ id: a.id, anzeige: a.anzeige, stufen: [...(a.stufen ?? [])], mitNull: !!a.mitNull })),
    prozentBasis: r.prozentBasis ?? s0.prozentBasis, fehlend: r.fehlend ?? s0.fehlend, mehrfachBasis: r.mehrfachBasis ?? s0.mehrfachBasis,
    gesamt: r.gesamt ?? s0.gesamt, kombiniert: r.kombiniert ?? s0.kombiniert, kennwerte: r.kennwerte?.length ? [...r.kennwerte] : [...s0.kennwerte]
  };
}

/** Wie eine Frage zuerst gezeigt wird: Zahlen mit vielen Werten als Kennwerte, alles andere (Stufen, Beschriftungen) als Anteile. Die Person kann es ändern. */
export function anzeigeVorschlag(sp: Spalte, verschiedene: number): Anzeige {
  if (sp.art === 'zahl' && sp.niveau === 'metrisch' && !Object.keys(sp.werteLabels).length && verschiedene > 7) return 'metrisch';
  return 'kat';
}
/** Stufen, aus denen die Top-Box gewählt werden kann: die Beschriftungen, sonst die vorkommenden Zahlen. */
export function mitStufen(sp: Spalte, vorkommend: number[]): { wert: number; label: string }[] {
  const codes = new Set<number>(vorkommend);
  for (const k of Object.keys(sp.werteLabels)) { const x = Number(k); if (Number.isFinite(x) && !istFehlend(sp, x)) codes.add(x); }
  return [...codes].sort((a, b) => a - b).map(wert => ({ wert, label: sp.werteLabels[String(wert)] ?? String(wert) }));
}

export interface WahlUebersetzt {
  /** null, solange keine Gruppe gewählt ist oder nichts zu zeigen ist */
  spec: TabellenSpec | null;
  /** Spalten oder Sets der Wahl, die es in den Daten nicht mehr gibt */
  fehlt: string[];
  /** Top-Box-Fragen, für die noch keine Stufen gewählt sind (sie stehen nicht in der Tabelle) */
  ohneStufen: string[];
}
export function wahlZuSpec(w: TabellenWahl, d: { spalten: Pick<Spalte, 'name'>[]; sets: MehrfachSet[]; gewicht?: Gewicht }): WahlUebersetzt {
  const da = new Set(d.spalten.map(x => x.name));
  const fehlt: string[] = [], ohneStufen: string[] = [], bloecke: Block[] = [];
  if (w.gruppe && !da.has(w.gruppe)) fehlt.push(w.gruppe);
  const sets: MehrfachSet[] = [];
  for (const a of w.auswahl) {
    if (a.id.startsWith('$')) {
      const set = d.sets.find(x => '$' + x.name === a.id);
      if (!set || set.spalten.some(n => !da.has(n))) { fehlt.push(a.id); continue; }
      sets.push(set); bloecke.push({ art: 'mehrfach', set: set.name, mitNull: a.mitNull });
      continue;
    }
    if (!da.has(a.id)) { fehlt.push(a.id); continue; }
    if (a.anzeige === 'kat' || a.anzeige === 'beides') bloecke.push({ art: 'kategorial', spalte: a.id });
    if (a.anzeige === 'metrisch' || a.anzeige === 'beides') bloecke.push({ art: 'metrisch', spalte: a.id, kennwerte: w.kennwerte.length ? [...w.kennwerte] : [...KENNWERTE] });
    if (a.anzeige === 'top') { if (a.stufen.length) bloecke.push({ art: 'top', spalte: a.id, stufen: [...a.stufen] }); else ohneStufen.push(a.id); }
  }
  if (!w.gruppe || fehlt.includes(w.gruppe) || !bloecke.length) return { spec: null, fehlt, ohneStufen };
  const spec: TabellenSpec = {
    spalte: w.gruppe, gesamt: w.gesamt, bloecke, prozentBasis: w.prozentBasis, fehlend: w.fehlend, mehrfachBasis: w.mehrfachBasis,
    ...(d.gewicht ? { gewicht: { spalte: d.gewicht.spalte, art: d.gewicht.art } } : {}), ...(sets.length ? { sets } : {})
  };
  return { spec, fehlt, ohneStufen };
}

/** Die Karte, die zu einer Frage der Tabelle passt („Diese Frage genauer prüfen“): Anteile und Mehrfachsets → Kreuztabelle, Zahlen → Gruppenvergleich.
 *  Die Karte öffnet mit Frage und Gruppe schon ausgefüllt; Statable rechnet erst dort einen Test (die Tabelle selbst enthält keinen). */
export function pruefKarte(a: TabellenAuswahl, gruppe: string): { art: 'kreuz' | 'gruppen'; w: { l1: string[]; l2: string[]; l3: string[]; l4: string[] } } {
  const metrisch = a.anzeige === 'metrisch';
  return { art: metrisch ? 'gruppen' : 'kreuz', w: { l1: [a.id], l2: [gruppe], l3: [], l4: [] } };
}

/** Bei den Fragen nach oben (-1) oder unten (1) schieben. */
export function schiebeAuswahl(a: TabellenAuswahl[], i: number, r: -1 | 1): TabellenAuswahl[] {
  const j = i + r;
  if (j < 0 || j >= a.length) return a;
  const n = [...a]; [n[i], n[j]] = [n[j]!, n[i]!]; return n;
}
