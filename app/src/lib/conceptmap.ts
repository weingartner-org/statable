/**
 * Concept Mapping (Kane und Trochim), Rechenkern (B3 Teil 4a, 15.11.2026). Eigener Code, im Browser, ohne neues Paket.
 *   Eingabe: je Person, wie sie die Aussagen in Stapel sortiert hat (Stapelnummer je Aussage), optional Bewertungen je Aussage.
 *   1. Ähnlichkeitsmatrix: wie viele Personen legten zwei Aussagen auf denselben Stapel (Anzahl).
 *   2. Abstand = 1 − Anzahl / Personen (0 = immer zusammen, 1 = nie zusammen).
 *   3. Karte: klassische MDS in 2 Dimensionen (`mds.ts`, wie R `cmdscale`). Hinweis: Kane/Trochim nutzen nichtmetrische MDS; das Ergebnis ist ähnlich, aber nicht gleich.
 *   4. Gruppen: Ward-Verfahren (wie R `hclust(…, "ward.D2")`) auf den Karten-Koordinaten, Schnitt bei k Gruppen (wie `cutree`).
 *   5. Bewertungen: Mittel je Aussage und je Gruppe; „Go-Zone“ = Aussagen, die in beiden Bewertungen über dem Gesamtmittel liegen.
 * Statable deutet nichts: die Gruppen benennt die Person. Sollwerte: scripts/conceptmap-erwartet.R, Wächter conceptmap.test.ts.
 */
import { mds, type MdsErgebnis } from './mds';

export type ConceptFehler = { fehler: 'zu-wenig-personen' | 'zu-wenig-aussagen' | 'laenge' | 'k' | 'alle-gleich' | 'abstaende' };

export interface ConceptErgebnis {
  fehler?: undefined;
  personen: number; aussagen: number;
  /** Anzahl Personen, die zwei Aussagen zusammenlegten */
  zusammen: number[][];
  abstand: number[][];
  koord: number[][]; gof1: number;
  /** Gruppe je Aussage, 1..k, nach Größe absteigend nummeriert */
  gruppe: number[];
  /** Höhen der Ward-Verschmelzungen (aufsteigend), n−1 Werte */
  hoehen: number[];
  /** Mittel je Bewertung (Zeilen) und Gruppe (Spalten) */
  gruppenMittel: number[][]; aussageMittel: number[][]; gesamtMittel: number[];
  /** Aussagen über dem Gesamtmittel in beiden Bewertungen (nur bei genau zwei Bewertungen) */
  goZone: boolean[] | null;
}

/** Ähnlichkeit: je Person eine Zeile mit Stapelnummern je Aussage. */
export function zusammenMatrix(sorts: number[][]): number[][] {
  const n = sorts[0]!.length, M = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const s of sorts) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (s[i] === s[j]) M[i]![j]! += 1;
  return M;
}

/** Ward (ward.D2) auf euklidischen Abständen der Punkte: Verschmelzungen und Höhen. */
export function wardKoord(P: number[][]): { a: number[]; b: number[]; hoehe: number[] } {
  const n = P.length;
  const d2 = (i: number, j: number) => P[i]!.reduce((s, v, k) => s + (v - P[j]![k]!) ** 2, 0);
  const D: number[][] = Array.from({ length: 2 * n }, () => new Array<number>(2 * n).fill(Infinity));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[i]![j] = D[j]![i] = d2(i, j);
  const groesse = new Array<number>(2 * n).fill(1), aktiv = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const a: number[] = [], b: number[] = [], hoehe: number[] = [];
  for (let schritt = 0; schritt < n - 1; schritt++) {
    let bi = -1, bj = -1, best = Infinity;
    const liste = [...aktiv].sort((x, y) => x - y);
    for (let x = 0; x < liste.length; x++) for (let y = x + 1; y < liste.length; y++) {
      const v = D[liste[x]!]![liste[y]!]!; if (v < best) { best = v; bi = liste[x]!; bj = liste[y]!; }
    }
    const neu = n + schritt;
    for (const k of aktiv) {
      if (k === bi || k === bj) continue;
      const nk = groesse[k]!, ni = groesse[bi]!, nj = groesse[bj]!, t = ni + nj + nk;
      const v = ((ni + nk) * D[bi]![k]! + (nj + nk) * D[bj]![k]! - nk * best) / t;
      D[neu]![k] = D[k]![neu] = v;
    }
    groesse[neu] = groesse[bi]! + groesse[bj]!; aktiv.delete(bi); aktiv.delete(bj); aktiv.add(neu);
    a.push(bi); b.push(bj); hoehe.push(Math.sqrt(Math.max(best, 0)));
  }
  return { a, b, hoehe };
}

/** Schnitt bei k Gruppen; Nummern nach Größe absteigend (bei Gleichstand nach kleinster Aussage). */
export function wardSchnitt(a: number[], b: number[], n: number, k: number): number[] {
  const eltern = Array.from({ length: 2 * n }, (_, i) => i);
  const wurzel = (x: number): number => { while (eltern[x] !== x) x = eltern[x]!; return x; };
  for (let s = 0; s < n - k; s++) { eltern[wurzel(a[s]!)] = n + s; eltern[wurzel(b[s]!)] = n + s; }
  const ids = Array.from({ length: n }, (_, i) => wurzel(i)), groessen = new Map<number, number>(), erste = new Map<number, number>();
  ids.forEach((r, i) => { groessen.set(r, (groessen.get(r) ?? 0) + 1); if (!erste.has(r)) erste.set(r, i); });
  const ordnung = [...groessen.keys()].sort((x, y) => groessen.get(y)! - groessen.get(x)! || erste.get(x)! - erste.get(y)!);
  return ids.map(r => ordnung.indexOf(r) + 1);
}

/**
 * Hauptrechnung. `bewertungen`: je Bewertung (z. B. Wichtigkeit) je Person eine Zeile mit einer Zahl je Aussage; fehlend = NaN.
 */
export function conceptRechne(sorts: number[][], k: number, bewertungen: number[][][] = []): ConceptErgebnis | ConceptFehler {
  const p = sorts.length, n = sorts[0]?.length ?? 0;
  if (p < 2) return { fehler: 'zu-wenig-personen' };
  if (n < 6) return { fehler: 'zu-wenig-aussagen' };
  if (sorts.some(s => s.length !== n) || bewertungen.some(bw => bw.some(r => r.length !== n))) return { fehler: 'laenge' };
  if (!Number.isInteger(k) || k < 2 || k > Math.min(15, Math.floor(n / 2))) return { fehler: 'k' };
  const zusammen = zusammenMatrix(sorts);
  if (zusammen.every(r => r.every(v => v === p))) return { fehler: 'alle-gleich' };
  const abstand = zusammen.map(r => r.map(v => 1 - v / p));
  for (let i = 0; i < n; i++) abstand[i]![i] = 0;
  const m = mds(abstand, 2);
  if ('fehler' in m) return { fehler: 'abstaende' };
  const koord = (m as MdsErgebnis).koord.map(r => [r[0] ?? 0, r[1] ?? 0]);
  const w = wardKoord(koord), gruppe = wardSchnitt(w.a, w.b, n, k);
  const aussageMittel = bewertungen.map(bw => Array.from({ length: n }, (_, j) => {
    const v = bw.map(r => r[j]!).filter(Number.isFinite); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
  }));
  const gesamtMittel = aussageMittel.map(am => { const v = am.filter(Number.isFinite); return v.reduce((s, x) => s + x, 0) / v.length; });
  const gruppenMittel = aussageMittel.map(am => Array.from({ length: k }, (_, g) => {
    const v = am.filter((x, j) => gruppe[j] === g + 1 && Number.isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
  }));
  const goZone = aussageMittel.length === 2 ? Array.from({ length: n }, (_, j) => aussageMittel[0]![j]! > gesamtMittel[0]! && aussageMittel[1]![j]! > gesamtMittel[1]!) : null;
  return { personen: p, aussagen: n, zusammen, abstand, koord, gof1: (m as MdsErgebnis).gof1, gruppe, hoehen: w.hoehe, gruppenMittel, aussageMittel, gesamtMittel, goZone };
}
