/**
 * Intercoder-Übereinstimmung (Fachblatt G2, docs/fachblaetter/G2-INTERCODER.md): prozentuale Übereinstimmung, Fleiss' Kappa,
 * Brennan-Prediger-Koeffizient und Krippendorffs Alpha für beliebig viele Kodierende, fehlende Kodierungen erlaubt.
 * Rechenweg und Standardfehler folgen R `irrCAC` (pa.coeff.raw, fleiss.kappa.raw, bp.coeff.raw, krippen.alpha.raw; Gwet 2014):
 *  - Prozent, Fleiss und Brennan-Prediger rechnen auf ALLEN Einheiten (Zeilen mit mindestens einer Kodierung); der Paaranteil pa nimmt nur
 *    Einheiten mit mindestens 2 Kodierungen, die Zufallsübereinstimmung und der Standardfehler zählen alle Einheiten mit.
 *  - Alpha rechnet nur mit Einheiten mit mindestens 2 Kodierungen (Koinzidenzmatrix nach Krippendorff).
 *  - KI = Wert ± t(0,975; n − 1) · SE, oben bei 1 gekappt, unten nicht.
 * Ohne Oberfläche und ohne Texte (reiner Rechenkern, wie uebereinstimmung.ts für zwei Beurteilende).
 */
import { tQuantil } from './verteilung';

export type Skala = 'nominal' | 'ordinal' | 'interval';
export type Wert = string | number | null;
export interface Koef { wert: number | null; se: number | null; unten: number | null; oben: number | null }
export interface IntercoderErgebnis {
  /** Einheiten mit mindestens 2 Kodierungen (nur sie gehen in Alpha und in den Paaranteil ein) */
  nEinheiten: number;
  /** Einheiten mit genau einer Kodierung (gehen nicht in Alpha ein) */
  nNurEine: number;
  /** Zahl der Kodierenden (Spalten) */
  nKodierende: number;
  /** Zahl der beobachteten Kategorien (q für Brennan-Prediger) */
  nKategorien: number;
  prozent: Koef;
  cohen: number | null;
  fleiss: Koef | null;
  bp: Koef;
  alpha: Koef;
  /** Gwets AC1 (immer nominal, irrCAC::gwet.ac1.raw); bei nur einer Kategorie null */
  ac1: Koef;
  skalaGenutzt: Skala;
  hauptwert: 'cohen' | 'fleiss';
  allesGleich: boolean;
  paradox: boolean;
}

const leer = (): Koef => ({ wert: null, se: null, unten: null, oben: null });

function mitKi(wert: number, se: number | null, df: number): Koef {
  if (se === null || !Number.isFinite(se) || df < 1) return { wert, se: null, unten: null, oben: null };
  const t = tQuantil(0.975, df);
  return { wert, se, unten: wert - t * se, oben: Math.min(1, wert + t * se) };
}

/** Quadrierte Abstandsmatrix der Kategorien (aufsteigend sortiert) und daraus die irrCAC-Gewichte w = 1 − d / max d. */
function gewichtsmatrix(werte: number[], haeufig: number[], skala: Skala): number[][] {
  const k = werte.length;
  if (skala === 'nominal') return Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
  const d = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => {
    if (skala === 'interval') return (werte[i]! - werte[j]!) ** 2;
    const a = Math.min(i, j), b = Math.max(i, j);   // Krippendorffs Ordinalmetrik aus den Häufigkeiten der paarbaren Werte
    let s = 0; for (let g = a; g <= b; g++) s += haeufig[g]!;
    return (s - (haeufig[a]! + haeufig[b]!) / 2) ** 2;
  }));
  const max = Math.max(...d.flat());
  return d.map(r => r.map(v => 1 - v / max));
}

interface Zeilen { agree: number[][]; r: number[]; }
function zeilen(einheiten: number[][], q: number): Zeilen {
  const agree = einheiten.map(e => { const a = new Array<number>(q).fill(0); for (const k of e) a[k]!++; return a; });
  return { agree, r: agree.map(a => a.reduce((s, v) => s + v, 0)) };
}

/** Prozent, Fleiss und Brennan-Prediger aus irrCAC (ungewichtet), alle Zeilen. */
function ungewichtet(einheiten: number[][], q: number): { prozent: Koef; fleiss: Koef; bp: Koef; ac1: Koef } {
  const n = einheiten.length, { agree, r } = zeilen(einheiten, q);
  const n2 = r.filter(v => v >= 2).length;
  const sumQ = agree.map(a => a.reduce((s, v) => s + v * (v - 1), 0));
  const paI = sumQ.map((s, i) => s / (r[i]! * (r[i]! - 1) || 1));
  const pa = paI.reduce((s, v, i) => s + (r[i]! >= 2 ? v : 0), 0) / n2;
  const pi = Array.from({ length: q }, (_, k) => agree.reduce((s, a, i) => s + a[k]! / r[i]!, 0) / n);
  const peF = pi.reduce((s, v) => s + v * v, 0), peB = 1 / q;
  const varianz = (zentrum: number, z: number[]) => (n >= 2 ? Math.sqrt(z.reduce((s, v) => s + (v - zentrum) ** 2, 0) / (n * (n - 1))) : null);
  const df = n - 1, f = n / n2;
  // Prozent
  const prozent = mitKi(pa, varianz(pa, paI.map(v => f * v)), df);
  // Fleiss
  const kF = (pa - peF) / (1 - peF);
  const kivF = paI.map((v, i) => f * (v - (r[i]! >= 2 ? peF : 0)) / (1 - peF));
  const peI = agree.map((a, i) => a.reduce((s, v, k) => s + v * pi[k]!, 0) / r[i]!);
  const kxF = kivF.map((v, i) => v - 2 * (1 - kF) * (peI[i]! - peF) / (1 - peF));
  const fleiss = mitKi(kF, varianz(kF, kxF), df);
  // Brennan-Prediger
  const kB = (pa - peB) / (1 - peB);
  const kivB = paI.map((v, i) => f * (v - (r[i]! >= 2 ? peB : 0)) / (1 - peB));
  const bp = mitKi(kB, varianz(kB, kivB), df);
  // Gwets AC1 (irrCAC::gwet.ac1.raw, nominal: Gewichtssumme = q): pe = Σ π(1 − π) / (q − 1)
  const peA = pi.reduce((s, v) => s + v * (1 - v), 0) / (q - 1);
  const kA = (pa - peA) / (1 - peA);
  const kivA = paI.map((v, i) => f * (v - (r[i]! >= 2 ? peA : 0)) / (1 - peA));
  const peIA = agree.map((a, i) => a.reduce((s, v, k) => s + v * (1 - pi[k]!), 0) / r[i]! / (q - 1) - peA);
  const kxA = kivA.map((v, i) => v - 2 * (1 - kA) * peIA[i]! / (1 - peA));
  const ac1 = mitKi(kA, varianz(kA, kxA), df);
  return { prozent, fleiss, bp, ac1 };
}

/** Krippendorffs Alpha nach irrCAC (krippen.alpha.raw) mit Gewichten der Skala; `einheiten`: nur Einheiten mit mindestens 2 Kodierungen, Kategorien als Index in `werte`. */
function krippendorff(einheiten: number[][], werte: number[], skala: Skala): Koef {
  const q = werte.length, n = einheiten.length;
  if (q < 2 || n < 1) return leer();
  const { agree, r } = zeilen(einheiten, q);
  const haeufig = Array.from({ length: q }, (_, k) => agree.reduce((s, a) => s + a[k]!, 0));
  const W = gewichtsmatrix(werte, haeufig, skala);
  const rMittel = r.reduce((s, v) => s + v, 0) / n, eps = 1 / r.reduce((s, v) => s + v, 0);
  const aw = agree.map(a => a.map((_, k) => a.reduce((s, v, l) => s + W[k]![l]! * v, 0)));   // agree · Wᵀ
  const sumQ = agree.map((a, i) => a.reduce((s, v, k) => s + v * (aw[i]![k]! - 1), 0));
  const paPrime = sumQ.reduce((s, v, i) => s + v / (rMittel * (r[i]! - 1)), 0) / n;
  const pa = (1 - eps) * paPrime + eps;
  const pi = Array.from({ length: q }, (_, k) => agree.reduce((s, a) => s + a[k]! / rMittel, 0) / n);
  let pe = 0; for (let k = 0; k < q; k++) for (let l = 0; l < q; l++) pe += W[k]![l]! * pi[k]! * pi[l]!;
  const alpha = (pa - pe) / (1 - pe), alphaPrime = (paPrime - pe) / (1 - pe);
  if (n < 2) return { wert: alpha, se: null, unten: null, oben: null };
  const piW = pi.map((_, k) => pi.reduce((s, v, l) => s + (W[k]![l]! + W[l]![k]!) / 2 * v, 0));
  const kx = agree.map((a, i) => {
    const paI = sumQ[i]! / (rMittel * (r[i]! - 1)) - paPrime * (r[i]! - rMittel) / rMittel;
    const kiv = (paI - pe) / (1 - pe);
    const peI = a.reduce((s, v, k) => s + v * piW[k]!, 0) / rMittel - pe * (r[i]! - rMittel) / rMittel;
    return kiv - 2 * (1 - alphaPrime) * (peI - pe) / (1 - pe);
  });
  const se = Math.sqrt(kx.reduce((s, v) => s + (v - alphaPrime) ** 2, 0) / (n * (n - 1)));
  return mitKi(alpha, se, n - 1);
}

/** Cohens Kappa (ungewichtet) aus den Zeilen, in denen beide Kodierenden etwas vergeben haben. */
function cohenKappa(a: Wert[], b: Wert[]): number | null {
  const paare: [string, string][] = [];
  for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) paare.push([String(a[i]), String(b[i])]);
  if (!paare.length) return null;
  const zA = new Map<string, number>(), zB = new Map<string, number>();
  let gleich = 0;
  for (const [x, y] of paare) { zA.set(x, (zA.get(x) ?? 0) + 1); zB.set(y, (zB.get(y) ?? 0) + 1); if (x === y) gleich++; }
  const N = paare.length, po = gleich / N;
  let pe = 0; for (const [k, v] of zA) pe += (v / N) * ((zB.get(k) ?? 0) / N);
  return pe >= 1 ? null : (po - pe) / (1 - pe);
}

/**
 * @param spalten eine Spalte je Kodierende (Spalte = Array über die Einheiten), null = fehlend, gleiche Länge
 * @param skala Skala für Alpha; bei Text-Kategorien immer 'nominal'
 */
export function intercoder(spalten: Wert[][], skala: Skala): IntercoderErgebnis {
  const nKod = spalten.length, nZeilen = nKod ? spalten[0]!.length : 0;
  // Einheit = Zeile mit mindestens einer Kodierung (leere Zeilen sind keine Einheiten)
  const roh: (string | number)[][] = [];
  for (let i = 0; i < nZeilen; i++) {
    const z = spalten.map(s => s[i]).filter((v): v is string | number => v !== null && v !== undefined && v !== '');
    if (z.length) roh.push(z);
  }
  const text = roh.some(z => z.some(v => typeof v === 'string'));
  const skalaGenutzt: Skala = text ? 'nominal' : skala;
  const schluessel = (v: string | number) => (text ? String(v) : (v as number));
  const alle = [...new Set(roh.flat().map(schluessel))] as (string | number)[];
  if (!text) (alle as number[]).sort((a, b) => a - b); else alle.sort((a, b) => String(a).localeCompare(String(b), 'de'));
  const ix = new Map(alle.map((v, i) => [v, i])), q = alle.length;
  const einheitenAlle = roh.map(z => z.map(v => ix.get(schluessel(v))!));
  const paarbar = einheitenAlle.filter(z => z.length >= 2);
  const nEinheiten = paarbar.length, nNurEine = einheitenAlle.length - nEinheiten;
  const kategorienPaarbar = [...new Set(paarbar.flat())].sort((a, b) => a - b);
  const allesGleich = nEinheiten > 0 && kategorienPaarbar.length === 1;
  const hauptwert: 'cohen' | 'fleiss' = nKod === 2 ? 'cohen' : 'fleiss';
  const basis = { nEinheiten, nNurEine, nKodierende: nKod, nKategorien: q, skalaGenutzt, hauptwert };
  if (nEinheiten === 0) return { ...basis, prozent: leer(), cohen: null, fleiss: nKod === 2 ? null : leer(), bp: leer(), alpha: leer(), ac1: leer(), allesGleich: false, paradox: false };
  if (allesGleich) {
    return { ...basis, prozent: { wert: 1, se: null, unten: null, oben: null }, cohen: null, fleiss: nKod === 2 ? null : leer(), bp: leer(), alpha: leer(), ac1: leer(), allesGleich: true, paradox: false };
  }
  const { prozent, fleiss, bp, ac1 } = ungewichtet(einheitenAlle, q);
  // Alpha: nur Einheiten mit mindestens 2 Kodierungen; Werte (für ordinal/interval die Zahlen selbst) nur aus ihnen
  const werteAlpha = kategorienPaarbar.map(k => (text ? k : (alle[k] as number)));
  const neuIx = new Map(kategorienPaarbar.map((k, i) => [k, i]));
  const alpha = krippendorff(paarbar.map(z => z.map(k => neuIx.get(k)!)), werteAlpha, skalaGenutzt);
  const cohen = nKod === 2 ? cohenKappa(spalten[0]!, spalten[1]!) : null;
  const haupt = hauptwert === 'cohen' ? cohen : fleiss.wert;
  const paradox = prozent.wert !== null && prozent.wert >= 0.9 && haupt !== null && haupt < 0.4;
  return { ...basis, prozent, cohen, fleiss: nKod === 2 ? null : fleiss, bp, alpha, ac1, allesGleich: false, paradox };
}
