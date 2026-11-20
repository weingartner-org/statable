/**
 * Fälle und Kontrollen abgleichen: die Anbindung an die Sitzung (Fachblatt Abschnitt 6). Die Rechnung steht in abgleich.ts (reine Funktionen).
 * Hier: die Spalten der Sitzung als Eingabe lesen und das Ergebnis als zwei neue Spalten anlegen (`Gruppe`, `Abgleich`) - ein Schritt im Verlauf (Rückgängig) und ein Eintrag im Protokoll.
 * Der Eintrag nennt nur Spaltennamen und Zahlen (Toleranz, k, Zählungen), keine Werte aus den Daten. In Vorlagen ist der Schritt „nicht wiederholbar“ (Art `abgleich`).
 */
import { s, L, aendereDaten } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { istFehlend } from './fehlend';
import { freierName } from './skalabau';
import { abgleichNameGruppe, abgleichNameRolle, abgleichRolleText, type AbgleichEingabe, type AbgleichOk, type AnkerWert } from './abgleich';

/** Die Wahl auf dem Blatt des Assistenten (nur Namen und Zahlen). */
export interface AbgleichWahl { fall: string; anker: string[]; zahlen: { spalte: string; toleranz: number }[]; k: number }

const spaltePos = (spalten: Spalte[], name: string) => spalten.findIndex(c => c.name === name);
/** Die Sitzungsdaten als Eingabe für `abgleichen`: Lücken und „keine Angabe“-Werte sind `null`; die Fall-Spalte zählt nur als Zahl 1 oder 0. */
export function abgleichEingabe(wahl: AbgleichWahl, spalten: Spalte[], zeilen: Wert[][]): AbgleichEingabe | null {
  const fi = spaltePos(spalten, wahl.fall);
  const ai = wahl.anker.map(n => spaltePos(spalten, n)), zi = wahl.zahlen.map(z => spaltePos(spalten, z.spalte));
  if (fi < 0 || ai.some(i => i < 0) || zi.some(i => i < 0)) return null;
  const lies = (i: number): Wert[] => zeilen.map(z => { const v = z[i] ?? null; return istFehlend(spalten[i], v) ? null : v; });
  const f = spalten[fi]!;
  const gruppe = zeilen.map(z => { const v = z[fi]; return typeof v === 'number' && !istFehlend(f, v) ? v : null; });
  return {
    gruppe,
    anker: ai.map(i => lies(i).map((v): AnkerWert => (v === null || v === '' ? null : v))),
    zahlen: zi.map(i => lies(i).map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null))),
    toleranzen: wahl.zahlen.map(z => z.toleranz), k: wahl.k
  };
}

/** Legt die Spalten `Gruppe` und `Abgleich` an. Gibt die Namen zurück oder `null`, wenn es nicht ging (dann ist alles wie vorher). */
export async function abgleichAnwenden(wahl: AbgleichWahl, r: AbgleichOk): Promise<{ gruppe: string; rolle: string } | null> {
  const namen = s.spalten.map(c => c.name);
  const gruppe = freierName(abgleichNameGruppe(), namen), rolle = freierName(abgleichNameRolle(), [...namen, gruppe]);
  const g: Spalte = { name: gruppe, bezeichnung: gruppe, art: 'zahl', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} };
  const a: Spalte = { name: rolle, bezeichnung: rolle, art: 'text', niveau: 'nominal', format: 'A20', fehlend: [], fehlendText: '', werteLabels: {} };
  const spalten = [...($state.snapshot(s.spalten) as Spalte[]), g, a];
  const zeilen = s.zeilen.map((z, i): Wert[] => [...z, r.nummer[i] ?? null, abgleichRolleText(r.rolle[i] ?? null)]);
  // Nur Namen und Zahlen für das Protokoll - frisch gebaut, kein Stück aus dem $state.
  const abgleich = {
    fall: wahl.fall, k: wahl.k, anker: [...wahl.anker], zahlen: wahl.zahlen.map(z => ({ spalte: z.spalte, toleranz: z.toleranz })),
    faelle: r.faelle, voll: r.voll, teilweise: r.teilweise, ohne: r.ohne, ausgeschlossen: r.ausgeschlossen
  };
  const ok = await aendereDaten(L('Fälle und Kontrollen abgeglichen', 'Cases and controls matched'), spalten, zeilen, true, { art: 'abgleich', nicht: 'art', abgleich });
  return ok ? { gruppe, rolle } : null;
}
