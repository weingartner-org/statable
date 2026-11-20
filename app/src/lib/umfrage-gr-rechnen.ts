/**
 * Später S-D2, Bauer B: Daten für die Umfragerechnung (R-Paket survey) bauen und die R-Funktionen sp_umfrage_gruppen / sp_umfrage_regression rufen.
 * Reine Aufbereitung in `gruppenDaten` und `regressionDaten` (getestet in umfrage-gr.test.ts), die Rechnung selbst in `gruppenRechnen` / `regressionRechnen` (webR, Aufruf über rverfahren.svelte.ts).
 * Statable rechnet Mittelwerte und Koeffizienten zweimal - hier in JavaScript, in R mit survey - und bricht bei Abweichung ab (Fachblatt „Für alle“; `pruefePunktschaetzer`).
 * Zeilenregel (Fachblatt 0.2): Gewicht 0 oder fehlend zählt nicht (R löscht die Zeile vor dem Design); eine Zeile mit fehlendem Wert in einer Variable der Frage ist kein gültiger Fall (R: subset).
 */
import { istFehlend } from './fehlend';
import type { RSpalte } from '../engine/webr';
import { rBool, rIds, rQ, rZahl } from '../engine/rsicher';
import type { Spalte } from './verzeichnis';
import { L } from './sitzung.svelte';
import { textCodes, type Wert } from './eingabe';
import { regTerme, type RegFaktor } from './regfaktor';
import { wMittel } from './gewichte';
import { UMFRAGE_MAX_ZEILEN, pruefePunktschaetzer, umfrageLesen, type UmfrageErgebnis } from './umfrage';
import type { DesignB } from './umfrage-gr';
import type { Entwurf } from './gewichte';
import { entwurfPlanAlle, entwurfRTeil } from './umfrageentwurf';

type Zeilen = Wert[][];
const gueltigFuer = (sp: Spalte) => {
  const fehlText = sp.art === 'text' ? new Set(textCodes(sp.fehlendText)) : new Set<string>();
  return (v: Wert | undefined): v is string | number => {
    if (v === null || v === undefined || v === '') return false;
    if (sp.art === 'zahl') return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v);
    return typeof v === 'string' && !fehlText.has(v.trimEnd());
  };
};
const sortWert = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));

/** Spalte als R-Namen: p01, p02 … */
export const rPraedName = (k: number) => `p${String(k + 1).padStart(2, '0')}`;

/* ---------------------------------------------------------------------------------------------------------------------------------- Gruppenvergleich */
export interface GruppenDaten { spalten: RSpalte[]; gruppenWerte: (string | number)[]; aufruf: string; zeilen: number; js: { mittel: number[] } }
/** Die Spalten für `sp_umfrage_gruppen`: y (Zahl), g (Code 1 … k in der Reihenfolge der Gruppenwerte: Zahlen aufsteigend, Text nach Alphabet - wie im t-Test), w (bereinigtes Gewicht, 0 = zählt nicht). */
export function gruppenDaten(y: string, g: string, w: number[], zeilen: Zeilen, spalten: Spalte[], entwurf?: Entwurf): GruppenDaten {
  const iy = spalten.findIndex(x => x.name === y), ig = spalten.findIndex(x => x.name === g), vy = gueltigFuer(spalten[iy]!), vg = gueltigFuer(spalten[ig]!);
  const werte = [...new Set(zeilen.map(z => z[ig]).filter((v): v is string | number => vg(v)))].sort(sortWert);
  const code = new Map(werte.map((v, i) => [v, i + 1]));
  const rTeilCodes = `c(${werte.map((_, i) => rZahl(i + 1)).join(', ')})`;   // nur Zahlen
  const yw = zeilen.map(z => (vy(z[iy]) && typeof z[iy] === 'number' ? (z[iy] as number) : null));
  const gw = zeilen.map(z => (vg(z[ig]) ? code.get(z[ig] as string | number) ?? null : null));
  const mittel = werte.map((_, k) => { const ix = yw.map((v, r) => (v !== null && gw[r] === k + 1 && (w[r] ?? 0) > 0 ? r : -1)).filter(r => r >= 0); return ix.length ? wMittel(ix.map(r => yw[r]!), ix.map(r => w[r]!)) : NaN; });
  const ent = entwurfPlanAlle(entwurf, spalten, zeilen, w), rTeilEntwurf = entwurfRTeil(ent);   // Stichprobenplan der Person (Abschnitt 6): dieselbe Stelle wie bei den anderen Karten
  return {
    spalten: [{ name: 'y', art: 'zahl', werte: yw }, { name: 'g', art: 'zahl', werte: gw }, { name: 'w', art: 'zahl', werte: w.map(x => (x > 0 ? x : 0)) }, ...(ent?.spalten ?? [])],
    gruppenWerte: werte, zeilen: zeilen.length, js: { mittel },
    aufruf: `sp_umfrage_gruppen(d, ${rQ('y')}, ${rQ('g')}, ${rTeilCodes}, ${rQ('w')}, NULL${rTeilEntwurf})`
  };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Regression */
export interface RegressionDaten {
  spalten: RSpalte[]; koefTerme: NonNullable<DesignB['koefTerme']>; aufruf: string; zeilen: number; logistik: boolean;
  /** Für die Selbstprüfung: die vollständigen Fälle (y, Prädiktoren, Gewicht) */ js: { x: number[][]; y: number[]; w: number[] };
  ereignis?: { wert: string | number; referenz: string | number };
}
export interface LogistikWahl { ereignis: string; referenz: string; text: boolean }
/** Die Spalten für `sp_umfrage_regression`: y (bei logistisch 1 = Ereignis, 0 = Vergleichswert), p01 … (Zahlenspalten und 0/1-Hilfsspalten der Gruppen-Spalten), w. */
export function regressionDaten(ziel: string, praed: string[], logistik: LogistikWahl | null, faktor: (n: string) => RegFaktor | null, w: number[], zeilen: Zeilen, spalten: Spalte[], entwurf?: Entwurf): RegressionDaten {
  const ix = (n: string) => spalten.findIndex(x => x.name === n), sp = (n: string) => spalten[ix(n)]!;
  const iy = ix(ziel), vy = gueltigFuer(sp(ziel));
  const ev = logistik ? (logistik.text ? logistik.ereignis : Number(logistik.ereignis)) : null, rf = logistik ? (logistik.text ? logistik.referenz : Number(logistik.referenz)) : null;
  const yw = zeilen.map(z => {
    const v = z[iy];
    if (!vy(v)) return null;
    if (logistik) return v === ev ? 1 : v === rf ? 0 : null;
    return typeof v === 'number' ? v : null;
  });
  const spaltenR: RSpalte[] = [{ name: 'y', art: 'zahl', werte: yw }];
  const terme: NonNullable<DesignB['koefTerme']> = [null];
  let k = 0;
  for (const t of regTerme(praed, faktor)) {
    const i = ix(t.spalte), v = gueltigFuer(sp(t.spalte));
    if (t.faktor) {
      const f = t.faktor, ref = f.stufen[0]!;
      f.stufen.slice(1).forEach(st => {
        spaltenR.push({ name: rPraedName(k++), art: 'zahl', werte: zeilen.map(z => { const x = z[i]; if (!v(x)) return null; const s = f.text ? String(x) : String(Number(x)); return f.stufen.some(q => q.wert === s) ? (s === st.wert ? 1 : 0) : null; }) });
        terme.push({ spalte: t.spalte, stufe: st.wert, referenz: ref.wert });
      });
    } else {
      spaltenR.push({ name: rPraedName(k++), art: 'zahl', werte: zeilen.map(z => (v(z[i]) && typeof z[i] === 'number' ? (z[i] as number) : null)) });
      terme.push({ spalte: t.spalte });
    }
  }
  spaltenR.push({ name: 'w', art: 'zahl', werte: w.map(x => (x > 0 ? x : 0)) });
  const px = spaltenR.slice(1, -1);
  const ent = entwurfPlanAlle(entwurf, spalten, zeilen, w), rTeilEntwurf = entwurfRTeil(ent);
  if (ent) spaltenR.push(...ent.spalten);
  const voll = zeilen.map((_, r) => r).filter(r => (w[r] ?? 0) > 0 && yw[r] !== null && px.every(c => c.werte[r] !== null && c.werte[r] !== undefined));
  return {
    spalten: spaltenR, koefTerme: terme, zeilen: zeilen.length, logistik: !!logistik,
    js: { x: voll.map(r => [1, ...px.map(c => c.werte[r] as number)]), y: voll.map(r => yw[r] as number), w: voll.map(r => w[r]!) },
    ...(logistik ? { ereignis: { wert: logistik.text ? logistik.ereignis : Number(logistik.ereignis), referenz: logistik.text ? logistik.referenz : Number(logistik.referenz) } } : {}),
    aufruf: `sp_umfrage_regression(d, ${rQ('y')}, ${rIds(px.map(c => c.name))}, ${rBool(!!logistik)}, ${rQ('w')}, NULL${rTeilEntwurf})`
  };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Zweite Rechnung in JavaScript (Selbstprüfung) */
/** Löst A x = b (A symmetrisch, klein) mit Gauß und Spaltenwahl; `null`, wenn die Matrix singulär ist. */
function loese(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-300) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) { const f = M[r]![c]! / M[c]![c]!; for (let j = c; j <= n; j++) M[r]![j]! -= f * M[c]![j]!; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r]![n]!; for (let j = r + 1; j < n; j++) s -= M[r]![j]! * x[j]!; x[r] = s / M[r]![r]!; }
  return x;
}
/** Gewichtete Kleinste Quadrate: b = (X'WX)⁻¹ X'Wy. */
export function wlsKoeffizienten(x: number[][], y: number[], w: number[]): number[] | null {
  const p = x[0]?.length ?? 0, A = Array.from({ length: p }, () => new Array<number>(p).fill(0)), r = new Array<number>(p).fill(0);
  x.forEach((z, i) => { for (let a = 0; a < p; a++) { r[a]! += w[i]! * z[a]! * y[i]!; for (let c = 0; c < p; c++) A[a]![c]! += w[i]! * z[a]! * z[c]!; } });
  return loese(A, r);
}
/** Logistische Regression mit Gewichten (quasi-binomial, Fisher-Scoring bis die Koeffizienten sich auf 1e-13 nicht mehr ändern); `null`, wenn sie nicht konvergiert. */
export function logitKoeffizienten(x: number[][], y: number[], w: number[]): number[] | null {
  const p = x[0]?.length ?? 0; let b = new Array<number>(p).fill(0);
  for (let it = 0; it < 100; it++) {
    const A = Array.from({ length: p }, () => new Array<number>(p).fill(0)), r = new Array<number>(p).fill(0);
    x.forEach((z, i) => {
      const eta = z.reduce((s, v, a) => s + v * b[a]!, 0), mu = 1 / (1 + Math.exp(-eta)), wi = w[i]! * mu * (1 - mu), zi = eta + (y[i]! - mu) / Math.max(mu * (1 - mu), 1e-300);
      for (let a = 0; a < p; a++) { r[a]! += wi * z[a]! * zi; for (let c = 0; c < p; c++) A[a]![c]! += wi * z[a]! * z[c]!; }
    });
    const nb = loese(A, r); if (!nb) return null;
    const diff = Math.max(...nb.map((v, a) => Math.abs(v - b[a]!)));
    b = nb; if (diff < 1e-13) return b;
  }
  return null;
}
const abbruch = () => new Error(L('Interner Fehler: Die Zahlen aus R und die von Statable selbst gerechneten stimmen nicht überein. Es wurde nichts gerechnet.', 'Internal error: the numbers from R and those calculated by Statable itself do not match. Nothing was calculated.'));

/** Prüft die Punktschätzer der R-Antwort gegen die zweite Rechnung in JavaScript. Wirft bei Abweichung; Fehlerergebnisse und nicht prüfbare Fälle (JS findet keine Lösung) bleiben ungeprüft. */
export function pruefeAntwort(art: 'gruppen' | 'regression', e: UmfrageErgebnis, daten: GruppenDaten | RegressionDaten): void {
  if (e.fehlerCode) return;
  if (art === 'gruppen') {
    const dg = daten as GruppenDaten;
    if (pruefePunktschaetzer(dg.js.mittel, (e.gruppen as UmfrageErgebnis[]).map(g => g.mittel))) throw abbruch();
    return;
  }
  const dr = daten as RegressionDaten, b = dr.logistik ? logitKoeffizienten(dr.js.x, dr.js.y, dr.js.w) : wlsKoeffizienten(dr.js.x, dr.js.y, dr.js.w);
  if (!b) return;
  if (pruefePunktschaetzer(b, (e.koef as UmfrageErgebnis[]).map(k => k.b), dr.logistik ? 1e-6 : 1e-8)) throw abbruch();
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Rechnen */
type Rufer = (art: 'gruppen' | 'regression', spalten: RSpalte[], aufruf: string) => Promise<UmfrageErgebnis>;
const zuViele = (n: number): UmfrageErgebnis => umfrageLesen('gruppen', { fehler_code: 'zu-viele-zeilen', n });
/** Gruppenvergleich: Daten bauen, R rufen, Antwort prüfen. `rufe` ist `umfrageRechnen` aus rverfahren.svelte.ts (hier eingesetzt, damit dieses Modul ohne R testbar bleibt). */
export async function gruppenRechnen(rufe: Rufer, y: string, g: string, w: number[], zeilen: Zeilen, spalten: Spalte[], entwurf?: Entwurf): Promise<DesignB> {
  const dg = gruppenDaten(y, g, w, zeilen, spalten, entwurf);
  if (dg.zeilen > UMFRAGE_MAX_ZEILEN) return { art: 'gruppen', r: zuViele(dg.zeilen), ziel: y, gruppenSpalte: g, gruppenWerte: dg.gruppenWerte };
  const r = await rufe('gruppen', dg.spalten, dg.aufruf);
  pruefeAntwort('gruppen', r, dg);
  return { art: 'gruppen', r, ziel: y, gruppenSpalte: g, gruppenWerte: dg.gruppenWerte };
}
/** Lineare oder logistische Regression (siehe `gruppenRechnen`). */
export async function regressionRechnen(rufe: Rufer, ziel: string, praed: string[], logistik: LogistikWahl | null, faktor: (n: string) => RegFaktor | null, w: number[], zeilen: Zeilen, spalten: Spalte[], entwurf?: Entwurf): Promise<DesignB> {
  const dr = regressionDaten(ziel, praed, logistik, faktor, w, zeilen, spalten, entwurf);
  const basis = { art: 'regression' as const, ziel, koefTerme: dr.koefTerme, ...(dr.ereignis ? { ereignis: dr.ereignis } : {}) };
  if (dr.zeilen > UMFRAGE_MAX_ZEILEN) return { ...basis, r: zuViele(dr.zeilen) };
  const r = await rufe('regression', dr.spalten, dr.aufruf);
  pruefeAntwort('regression', r, dr);
  return { ...basis, r };
}
