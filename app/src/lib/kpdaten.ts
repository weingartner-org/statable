/**
 * Gemeinsame Bausteine des Kurs-Pakets (Fachblatt docs/fachblaetter/KURSPAKET.md): Diskriminanzanalyse, loglineare Modelle, MANOVA, Probit, gewichtete Regression.
 * Reine Funktionen ohne Sitzung: Daten der Tabelle für R aufbereiten, Antworten von R lesen, ein Rang-Test für die Streumatrix.
 * Die Rechnung selbst steht in engine/statable-kurspaket.R. SICHERHEIT: Namen und Texte aus der Datei gehen nur als Daten oder als gebundene Argumente nach R (engine/rsicher.ts).
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { kategorien } from './reihenfolge';
import { gueltigFuer, beschr } from './kategreg';

/** Ein Punkt der Prüfliste (wie `Punkt` in seiten/Blatt.svelte). */
export interface KpPunkt { art: 'ok' | 'hinweis' | 'info' | 'sperre'; text: string; klein?: string }

/** Der Rechenname der k-ten Spalte in der R-Tabelle: p01, p02 … (Statables eigene Namen, nie der Name aus der Datei). */
export const kpName = (k: number): string => `p${String(k + 1).padStart(2, '0')}`;

/** Die Zahlen einer Spalte; fehlende Werte, „keine Angabe“-Codes und Text werden `null`. */
export function kpZahlen(sp: Spalte, i: number, zeilen: Wert[][]): (number | null)[] {
  const g = gueltigFuer(sp);
  return zeilen.map(z => (g(z[i]) && typeof z[i] === 'number' ? (z[i] as number) : null));
}
/** Eine Gruppenspalte als Beschriftungen (Wertebeschriftung, sonst der Wert) und die Stufen in der Ordnung von Statable; ungültige Zellen werden `null`. */
export function kpGruppen(sp: Spalte, i: number, zeilen: Wert[][]): { werte: (string | null)[]; stufen: string[] } {
  const g = gueltigFuer(sp);
  const werte = zeilen.map(z => (g(z[i]) ? beschr(sp, z[i] as string | number) : null));
  const kat = kategorien(sp, i, zeilen);
  const stufen = kat ? kat.map(k => k.text) : [...new Set(werte.filter((w): w is string => w !== null))];
  return { werte, stufen };
}
export const kpIndex = (spalten: Spalte[], name: string): number => spalten.findIndex(x => x.name === name);

/** Streumatrix innerhalb der Gruppen (Summe der Abweichungsprodukte): `cols[j][r]` = Wert der Spalte j in der Zeile r, `grp[r]` = Nummer der Gruppe. */
export function kpInnerhalb(cols: number[][], grp: number[], k: number): number[][] {
  const p = cols.length, n = grp.length, S = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let g = 0; g < k; g++) {
    const idx: number[] = []; for (let r = 0; r < n; r++) if (grp[r] === g) idx.push(r);
    if (!idx.length) continue;
    const m = cols.map(c => idx.reduce((a, r) => a + c[r]!, 0) / idx.length);
    for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { let s = 0; for (const r of idx) s += (cols[a]![r]! - m[a]!) * (cols[b]![r]! - m[b]!); S[a]![b]! += s; if (a !== b) S[b]![a]! += s; }
  }
  return S;
}
/** Hat die symmetrische Streumatrix vollen Rang (keine Spalte ist konstant in den Gruppen oder aus anderen berechenbar)? Gauß auf der Korrelationsmatrix, Toleranz 1e-8. */
export function kpVollerRang(S: number[][]): boolean {
  const p = S.length;
  if (p === 0) return true;
  for (let a = 0; a < p; a++) if (!(S[a]![a]! > 0) || !Number.isFinite(S[a]![a]!)) return false;
  const R = S.map((z, a) => z.map((v, b) => v / Math.sqrt(S[a]![a]! * S[b]![b]!)));
  for (let c = 0; c < p; c++) {
    let m = c; for (let r = c + 1; r < p; r++) if (Math.abs(R[r]![c]!) > Math.abs(R[m]![c]!)) m = r;
    if (Math.abs(R[m]![c]!) < 1e-8) return false;
    [R[c], R[m]] = [R[m]!, R[c]!];
    for (let r = c + 1; r < p; r++) { const f = R[r]![c]! / R[c]![c]!; for (let j = c; j < p; j++) R[r]![j]! -= f * R[c]![j]!; }
  }
  return true;
}
/** Ist die Spalte (gültige Zahlen) konstant? */
export const kpKonstant = (w: number[]): boolean => w.length > 0 && w.every(v => v === w[0]);

/* ------------------------------------------------------------ Antwort von R lesen */
export const kpArr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
/** Eine Zahl aus einem R-Vektor der Länge 1 (sonst NaN). */
export const kpZahl = (x: unknown): number => {
  let v = kpArr<unknown>(x)[0];
  // Ein benannter R-Wert (zum Beispiel pf(fs[1], …) mit dem Namen „value“) kommt als Objekt { value: Zahl } an: auch das ist eine Zahl (Abnahme 31.10. S3: p fehlte).
  if (v && typeof v === 'object' && !Array.isArray(v)) { const w = Object.values(v as object); if (w.length === 1) v = kpArr<unknown>(w[0])[0]; }
  return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
};
export const kpZahlOderNull = (x: unknown): number | null => { const v = kpZahl(x); return Number.isNaN(v) ? null : v; };
export const kpZahlen2 = (x: unknown): number[] => kpArr<unknown>(x).map(v => (typeof v === 'number' ? v : NaN));
export const kpText = (x: unknown): string => String(kpArr<unknown>(x)[0] ?? '');
export const kpWahr = (x: unknown): boolean => kpArr<unknown>(x)[0] === true;
/** Eine Liste von Zahlenvektoren (zum Beispiel die Zeilen einer Tabelle). */
export const kpMatrix = (x: unknown): number[][] => kpArr<unknown>(x).map(kpZahlen2);
/** Ein benanntes Objekt (R-Liste); ein leeres R-Objekt („type“ allein) zählt nicht. */
export const kpObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));

/* ------------------------------------------------------------ Koeffizienten von Probit und gewichteter Regression */
import { L } from './sitzung.svelte';
import type { KatPraed } from './kategreg';
/** `p02Stufe` → Vorhersagespalte 2 (0-basiert 1) und Stufe; `(Intercept)` → −1. */
export function kpZuordnen(name: string, praed: KatPraed[]): { pIdx: number; stufe: string } {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1, info = praed[pIdx];
  return { pIdx, stufe: info?.art === 'faktor' ? m[2]! : '' };
}
/** Der Name einer Zeile der Koeffiziententabelle: Konstante, Zahlenspalte oder Gruppe (Stufe gegen die erste Stufe). */
export function kpTermName(pIdx: number, stufe: string, praed: KatPraed[], name: (n: string) => string): string {
  if (pIdx < 0) return L('Konstante', 'Constant');
  const p = praed[pIdx];
  if (!p) return '?';
  return p.art === 'faktor' ? `${name(p.name)}: ${stufe}` : name(p.name);
}
