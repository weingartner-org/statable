/**
 * „Zahlen nach Themen“ (Später, Welle S-D, G12): die Verbindung zwischen dem Blatt „Offene Antworten ordnen“ (Kategorien und Zuordnung, kategorienblatt.ts), den Daten des Projekts
 * (die Frage neben den Themen) und der Rechnung in themenzahlen.ts. Reine Funktionen ohne Oberfläche.
 */
import { type Fehlmenge, fehlendMenge } from './fehlend';
import { s } from './sitzung.svelte';
import { lesbar } from './verzeichnis';
import { ergebnis, type Antwort, type AntwortZustand, type KatZustand } from './kategorisieren';
import type { KatBlatt, ThemenWahl } from './kategorienblatt';
import type { ThemaWerte, ThemenFrage, ThemaZustand } from './themenzahlen';

export const leereThemen = (): ThemenWahl => ({ frage: '', art: 'auto', ohne: false, matrix: false, zitate: {} });
/** Höchstens so viele Zitate je Thema (Entscheidung Opus 3). */
export const ZITATE_MAX = 3;
/** Eine Frage mit mehr verschiedenen Werten als dies lässt sich nicht als Kategorien zeigen. */
export const STUFEN_MAX = 12;

/** Die Themen als 0/1 je Person (null = leer oder offen, wie `ergebnis()`) und der Zustand je Person; `ids` sind die Kategorien in der Reihenfolge der Themen. */
export function themenEingabe(z: KatZustand, antw: Antwort[], zs: AntwortZustand[]): { themen: ThemaWerte[]; ids: string[]; zustand: ThemaZustand[] } {
  const erg = ergebnis(antw, z, 'x', [], '');
  const themen: ThemaWerte[] = z.kategorien.map((k, j) => ({
    name: k.name,
    werte: erg.modus === 'mehrfach' ? [...(erg.spalten[j]?.werte ?? [])] : (erg.spalten[0]?.werte ?? []).map(c => (c === null ? null : c === j + 1 ? 1 : 0))
  }));
  return { themen, ids: z.kategorien.map(k => k.id), zustand: zs };
}

export type FrageArt = 'zahl' | 'kategorie';
export interface FrageSpalte { name: string; label: string; vorschlag: FrageArt }
const gueltig = (v: unknown, fehlend: Fehlmenge) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && fehlend.includes(v));
/** Die Spalten, die neben den Themen stehen können: Zahlen (M, SD) oder Gruppen (Verteilung). Die Textspalte der Antworten und die Kennung sind nicht dabei. */
export function frageSpalten(kb: KatBlatt): FrageSpalte[] {
  return s.spalten.flatMap((sp, i) => {
    if (sp.name === kb.spalte || sp.name === kb.kennung || sp.art === 'datum') return [];
    const w = new Set<string | number>();
    for (const z of s.zeilen) { const v = z[i]; if (gueltig(v, fehlendMenge(sp))) w.add(v as string | number); }
    if (!w.size) return [];
    const kategorie = sp.art === 'text' || w.size <= 2 || (sp.niveau === 'nominal' && Object.keys(sp.werteLabels).length > 0);
    if (sp.art === 'text' && w.size > STUFEN_MAX) return [];
    return [{ name: sp.name, label: lesbar(sp, true), vorschlag: kategorie ? 'kategorie' : 'zahl' }];
  });
}
/** Die Werte der Frage, Zeile für Zeile (gleiche Reihenfolge wie die Antworten); `null`, wenn die Spalte fehlt oder als Kategorien zu viele Werte hat. */
export function frageWerte(name: string, art: FrageArt): ThemenFrage | null {
  const i = s.spalten.findIndex(x => x.name === name); if (i < 0) return null;
  const sp = s.spalten[i]!;
  if (art === 'zahl') return { art: 'zahl', werte: s.zeilen.map(z => (typeof z[i] === 'number' && gueltig(z[i], fehlendMenge(sp)) ? (z[i] as number) : null)) };
  const werte = s.zeilen.map(z => (gueltig(z[i], fehlendMenge(sp)) ? sp.werteLabels[String(z[i])] ?? String(z[i]) : null));
  return new Set(werte.filter(v => v !== null)).size > STUFEN_MAX ? null : { art: 'kategorie', werte };
}
export function frageArt(kb: KatBlatt, wahl: ThemenWahl): FrageArt | null {
  const sp = frageSpalten(kb).find(x => x.name === wahl.frage);
  return sp ? (wahl.art === 'auto' ? sp.vorschlag : wahl.art) : null;
}
/** Die Schlüssel der Antworten, die als Zitat gewählt sind, ohne solche, die nicht mehr zum Thema gehören; höchstens ZITATE_MAX. */
export function zitatSchluessel(wahl: ThemenWahl, id: string, thema: ThemaWerte, antw: Antwort[]): string[] {
  const dabei = new Set(antw.flatMap((a, i) => (thema.werte[i] === 1 ? [a.schluessel] : [])));
  return (wahl.zitate[id] ?? []).filter(k => dabei.has(k)).slice(0, ZITATE_MAX);
}
