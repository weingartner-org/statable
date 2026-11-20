/**
 * Maschinelles Lernen zum Verstehen (V5): Trainings-/Testdaten, Standardisieren, k-nächste Nachbarn, Konfusionsmatrix, k-fache Kreuzvalidierung.
 * Regeln: docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md, Abschnitt 5. Sollwerte: scripts/ml-erwartet.R → lib/testdaten/ml-erwartet.json (Wächter lib/ml.test.ts).
 * Reine Rechnung im Browser, ohne Zufall außer über den übergebenen Zufallsgenerator.
 */
import {
  PINGUIN_ART, PINGUIN_FLOSSE, PINGUIN_GESCHLECHT, PINGUIN_MASSE, PINGUIN_SCHNABEL_LAENGE, PINGUIN_SCHNABEL_TIEFE
} from './ml-pinguine';

export type Rng = () => number;

/** Zufällige Reihenfolge 0 … n−1 (Fisher-Yates). */
export function mischen(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]!; a[i] = a[j]!; a[j] = t; }
  return a;
}

/** Zufällige Aufteilung: die ersten round(n · Anteil) Fälle der Reihenfolge sind Training, der Rest Test (nicht geschichtet). */
export function teile(n: number, anteil: number, rng: Rng): { training: number[]; test: number[] } {
  const p = mischen(n, rng), nt = Math.round(n * anteil);
  return { training: p.slice(0, nt), test: p.slice(nt) };
}

/** Falten für die k-fache Kreuzvalidierung: Fall an Stelle i der zufälligen Reihenfolge bekommt Falte i mod K (gleich große Falten). */
export function faltenEinteilung(n: number, K: number, rng: Rng): number[] {
  const r = mischen(n, rng), f = new Array<number>(n).fill(0);
  r.forEach((fall, i) => { f[fall] = i % K; });
  return f;
}

/** Mittelwert und Standardabweichung (n − 1) je Merkmal; eine Standardabweichung von 0 wird zu 1 (das Merkmal trägt dann nichts bei). */
export function skalierung(X: number[][]): { mittel: number[]; sd: number[] } {
  const p = X[0]?.length ?? 0, n = X.length;
  const mittel = Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[j]!, 0) / n);
  const sd = mittel.map((m, j) => { const v = n > 1 ? X.reduce((s, r) => s + (r[j]! - m) ** 2, 0) / (n - 1) : 0; return v > 0 ? Math.sqrt(v) : 1; });
  return { mittel, sd };
}
export const skaliere = (X: number[][], s: { mittel: number[]; sd: number[] }) => X.map(r => r.map((v, j) => (v - s.mittel[j]!) / s.sd[j]!));

/** „Gleich weit“ wie class::knn: quadrierter Abstand höchstens das (1 + 1e-4)-Fache des k-ten. */
const UNSCHAERFE = 1e-4;

/**
 * k-nächste Nachbarn für mehrere k auf einmal: je Testfall einmal sortieren, dann jedes k auswerten.
 * Ergebnis: vorhersage[j][i] = Klasse des Testfalls i bei k = ks[j]; gleichstand[j] = Zahl der Testfälle mit Stimmengleichstand.
 * Stimmengleichstand: Klasse mit dem nächsten Nachbarn, bei gleichem Abstand die kleinere Klassennummer.
 */
export function knnAlleK(trainX: number[][], trainY: number[], testX: number[][], ks: number[], nKlassen: number): { vorhersage: number[][]; gleichstand: number[]; stimmen: number[][][] } {
  const vorhersage = ks.map(() => new Array<number>(testX.length).fill(0));
  const stimmen = ks.map(() => new Array<number[]>(testX.length));
  const gleichstand = ks.map(() => 0);
  const n = trainX.length;
  const d2 = new Float64Array(n), idx = new Array<number>(n);
  for (let i = 0; i < testX.length; i++) {
    const t = testX[i]!;
    for (let a = 0; a < n; a++) { const r = trainX[a]!; let s = 0; for (let j = 0; j < t.length; j++) { const u = t[j]! - r[j]!; s += u * u; } d2[a] = s; idx[a] = a; }
    idx.sort((a, b) => d2[a]! - d2[b]! || a - b);
    ks.forEach((kRoh, jk) => {
      const k = Math.min(kRoh, n);
      const grenze = d2[idx[k - 1]!]! * (1 + UNSCHAERFE);
      let m = k; while (m < n && d2[idx[m]!]! <= grenze) m++;
      const st = new Array<number>(nKlassen).fill(0), naechst = new Array<number>(nKlassen).fill(Infinity);
      for (let q = 0; q < m; q++) { const a = idx[q]!, c = trainY[a]!; st[c]!++; if (d2[a]! < naechst[c]!) naechst[c] = d2[a]!; }
      const max = Math.max(...st);
      const beste = st.flatMap((v, c) => (v === max ? [c] : []));
      let wahl = beste[0]!;
      if (beste.length > 1) {
        gleichstand[jk]!++;
        const nah = Math.min(...beste.map(c => naechst[c]!)) * (1 + UNSCHAERFE);
        wahl = beste.find(c => naechst[c]! <= nah)!;
      }
      vorhersage[jk]![i] = wahl;
      stimmen[jk]![i] = st;
    });
  }
  return { vorhersage, gleichstand, stimmen };
}

/** Konfusionsmatrix: Zeilen = wahre Klasse, Spalten = vorhergesagte Klasse. */
export function konfusion(wahr: number[], vorher: number[], nKlassen: number): number[][] {
  const m = Array.from({ length: nKlassen }, () => new Array<number>(nKlassen).fill(0));
  wahr.forEach((w, i) => { m[w]![vorher[i]!]!++; });
  return m;
}
export const fehlerrate = (wahr: number[], vorher: number[]) => (wahr.length ? wahr.reduce((s, w, i) => s + (w === vorher[i] ? 0 : 1), 0) / wahr.length : NaN);

export const K_WERTE = Array.from({ length: 26 }, (_, i) => 2 * i + 1);

export interface MlEingabe {
  X: number[][]; y: number[]; nKlassen: number;
  training: number[]; test: number[]; falte: number[]; K: number;
  standardisieren: boolean; ks?: number[];
}
export interface MlErgebnis {
  ks: number[];
  fehlerTraining: number[]; fehlerTest: number[]; fehlerCV: number[];
  gleichstandTest: number[];
  /** Vorhersagen der Testfälle je k (Reihenfolge wie `test`). */
  vorhersageTest: number[][];
  bestesK: number;
  /** Kennzahlen aus dem Training (nur bei Standardisieren). */
  skala: { mittel: number[]; sd: number[] } | null;
}

/** Ganze Rechnung des Lernlabor-Reiters: Training/Test für alle k, Kreuzvalidierung im Training (je Falte neu standardisiert). */
export function mlRechne(e: MlEingabe): MlErgebnis {
  const ks = (e.ks ?? K_WERTE).filter(k => k <= Math.max(1, Math.floor(e.training.length * (e.K - 1) / e.K)));
  const tr = e.training.map(i => e.X[i]!), te = e.test.map(i => e.X[i]!);
  const ytr = e.training.map(i => e.y[i]!), yte = e.test.map(i => e.y[i]!);
  const skala = e.standardisieren ? skalierung(tr) : null;
  const trs = skala ? skaliere(tr, skala) : tr, tes = skala ? skaliere(te, skala) : te;
  const aufTest = knnAlleK(trs, ytr, tes, ks, e.nKlassen);
  const aufTraining = knnAlleK(trs, ytr, trs, ks, e.nKlassen);
  const falsch = ks.map(() => 0);
  for (let f = 0; f < e.K; f++) {
    const a: number[] = [], b: number[] = [];
    e.falte.forEach((ff, i) => (ff === f ? b : a).push(i));
    if (!b.length || !a.length) continue;
    let xa = a.map(i => tr[i]!), xb = b.map(i => tr[i]!);
    if (e.standardisieren) { const s = skalierung(xa); xa = skaliere(xa, s); xb = skaliere(xb, s); }
    const v = knnAlleK(xa, a.map(i => ytr[i]!), xb, ks, e.nKlassen).vorhersage;
    ks.forEach((_, j) => { b.forEach((i, q) => { if (v[j]![q] !== ytr[i]) falsch[j]!++; }); });
  }
  const fehlerCV = falsch.map(x => x / tr.length);
  const min = Math.min(...fehlerCV);
  let bestesK = ks[0]!; ks.forEach((k, j) => { if (fehlerCV[j] === min) bestesK = k; });
  return {
    ks,
    fehlerTraining: aufTraining.vorhersage.map(v => fehlerrate(ytr, v)),
    fehlerTest: aufTest.vorhersage.map(v => fehlerrate(yte, v)),
    fehlerCV, gleichstandTest: aufTest.gleichstand, vorhersageTest: aufTest.vorhersage, bestesK, skala
  };
}

/** Entscheidungsgebiete fürs Bild: Vorhersage auf einem Gitter (in den Originaleinheiten der zwei Merkmale). */
export function gitterVorhersage(o: { trainX: number[][]; trainY: number[]; nKlassen: number; k: number; skala: { mittel: number[]; sd: number[] } | null; xBereich: [number, number]; yBereich: [number, number]; schritte: number }): number[][] {
  const { schritte: s } = o;
  const punkte: number[][] = [];
  for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) punkte.push([o.xBereich[0] + (c + 0.5) * (o.xBereich[1] - o.xBereich[0]) / s, o.yBereich[1] - (r + 0.5) * (o.yBereich[1] - o.yBereich[0]) / s]);
  const tr = o.skala ? skaliere(o.trainX, o.skala) : o.trainX, pk = o.skala ? skaliere(punkte, o.skala) : punkte;
  const v = knnAlleK(tr, o.trainY, pk, [o.k], o.nKlassen).vorhersage[0]!;
  return Array.from({ length: s }, (_, r) => v.slice(r * s, (r + 1) * s));
}

// ---- Daten des Lernlabors: Palmer-Pinguine ----

export type MlZiel = 'art' | 'geschlecht';
export type MlMerkmal = 'schnabel_laenge' | 'schnabel_tiefe' | 'flosse' | 'masse';
export const ML_SPALTEN: Record<MlMerkmal, (number | null)[]> = { schnabel_laenge: PINGUIN_SCHNABEL_LAENGE, schnabel_tiefe: PINGUIN_SCHNABEL_TIEFE, flosse: PINGUIN_FLOSSE, masse: PINGUIN_MASSE };
export const ML_ZIELE: Record<MlZiel, { werte: (number | null)[]; n: number }> = { art: { werte: PINGUIN_ART, n: 3 }, geschlecht: { werte: PINGUIN_GESCHLECHT, n: 2 } };

/** Vollständige Fälle für Ziel und zwei Merkmale; `zeilen` sind die Zeilen der CSV (ab 0). */
export function pinguinDaten(ziel: MlZiel, m1: MlMerkmal, m2: MlMerkmal): { X: number[][]; y: number[]; nKlassen: number; zeilen: number[] } {
  const z = ML_ZIELE[ziel], a = ML_SPALTEN[m1], b = ML_SPALTEN[m2];
  const X: number[][] = [], y: number[] = [], zeilen: number[] = [];
  z.werte.forEach((w, i) => { const u = a[i], v = b[i]; if (w !== null && u != null && v != null) { X.push([u, v]); y.push(w); zeilen.push(i); } });
  return { X, y, nKlassen: z.n, zeilen };
}
