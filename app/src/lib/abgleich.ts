/**
 * Fälle und Kontrollen abgleichen (Fachblatt Abschnitt 6): Daten-Assistent, rechnet in JavaScript (kein R, kein PSPP). Reine Funktionen ohne Sitzung.
 *
 * Die Regel, genau so (sonst passen die Sollwerte nicht, lib/testdaten/abschluss-erwartet.json):
 *  - Spalte Fall/Kontrolle (1 und 0), exakte Anker (Text oder Zahl), eine oder mehrere Zahlen mit Toleranz, k Kontrollen je Fall (1 bis 5).
 *  - Die Fälle kommen in der Zeilenfolge dran. Passend ist eine Kontrolle, wenn sie unbenutzt ist, in allen Ankern gleich und in jeder Zahl höchstens die Toleranz entfernt.
 *  - Abstand: Summe von |Differenz| / Toleranz über die Zahlen; bei Toleranz 0 ist der Abstand 0 (passend ist dann nur Gleichheit).
 *    Gewählt wird der kleinste Abstand, bei Gleichstand die kleinste Zeile. Ohne Zurücklegen: eine Kontrolle gehört zu höchstens einem Fall.
 *  - Fehlende Werte in den Abgleichsspalten (oder weder 1 noch 0 in der Fall-Spalte): Die Zeile nimmt nicht teil und wird gezählt.
 *  - Das Verfahren ist gierig und von der Zeilenfolge abhängig. Es sucht nicht das beste Gesamtergebnis.
 * Zeilennummern in den Paaren zählen ab 1 (wie im Sollwert).
 */
import { L, Lp } from './sitzung.svelte';

export const K_MIN = 1, K_MAX = 5;
export type AnkerWert = string | number | null;

export interface AbgleichEingabe {
  /** Fall (1) oder Kontrolle (0) je Zeile; alles andere (fehlend, andere Zahl) nimmt nicht teil */ gruppe: (number | null)[];
  /** je Anker eine Spalte (Text oder Zahl; `null` = fehlend) */ anker: AnkerWert[][];
  /** je Zahl eine Spalte (`null` = fehlend) */ zahlen: (number | null)[][];
  /** je Zahl die Toleranz (≥ 0) */ toleranzen: number[];
  /** Kontrollen je Fall, 1 bis 5 */ k: number;
}
export type AbgleichCode = 'k-bereich' | 'keine-zahl' | 'toleranz' | 'keine-faelle' | 'keine-kontrollen' | 'laenge';
export interface AbgleichPaar { /** Zeile des Falls, ab 1 */ fall: number; /** Zeilen der Kontrollen, ab 1 */ kontrollen: number[] }
export interface Smd { vorher: number | null; nachher: number | null }
export interface AbgleichOk {
  ok: true; paare: AbgleichPaar[];
  /** je Zeile: 'fall' | 'kontrolle' | null (nicht abgeglichen) */ rolle: ('fall' | 'kontrolle' | null)[];
  /** je Zeile: Nummer des Fall-Paars (1, 2, …) oder null */ nummer: (number | null)[];
  zeilen: number; ausgeschlossen: number; faelle: number; voll: number; teilweise: number; ohne: number; kontrollen: number; smd: Smd[];
}
export type AbgleichErgebnis = AbgleichOk | { ok: false; code: AbgleichCode };

const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Standardisierte Mittelwertdifferenz (m1 − m0) / √((s1² + s0²) / 2), Varianzen mit n − 1. `null`, wenn eine Gruppe weniger als 2 Werte hat oder beide Varianzen 0 sind. */
export function smd(fall: number[], kontrolle: number[]): number | null {
  if (fall.length < 2 || kontrolle.length < 2) return null;
  const m = (x: number[]) => x.reduce((a, v) => a + v, 0) / x.length;
  const v = (x: number[]) => { const mm = m(x); return x.reduce((a, t) => a + (t - mm) ** 2, 0) / (x.length - 1); };
  const nenner = Math.sqrt((v(fall) + v(kontrolle)) / 2);
  return nenner > 0 ? (m(fall) - m(kontrolle)) / nenner : null;
}

/** Das Abgleichen. Gerundet wird nie in der Rechnung. */
export function abgleichen(e: AbgleichEingabe): AbgleichErgebnis {
  const n = e.gruppe.length;
  if (!Number.isInteger(e.k) || e.k < K_MIN || e.k > K_MAX) return { ok: false, code: 'k-bereich' };
  if (!e.zahlen.length) return { ok: false, code: 'keine-zahl' };
  if (e.toleranzen.length !== e.zahlen.length || e.toleranzen.some(t => !zahl(t) || t < 0)) return { ok: false, code: 'toleranz' };
  if (e.zahlen.some(c => c.length !== n) || e.anker.some(c => c.length !== n)) return { ok: false, code: 'laenge' };

  // Wer nimmt teil? Fall-Spalte 1 oder 0, alle Anker und Zahlen vorhanden.
  const teil: boolean[] = Array.from({ length: n }, (_, i) => (e.gruppe[i] === 1 || e.gruppe[i] === 0) && e.anker.every(c => c[i] !== null && c[i] !== undefined) && e.zahlen.every(c => zahl(c[i])));
  const ausgeschlossen = teil.filter(t => !t).length;
  const faelleZeilen: number[] = [], kontrollZeilen: number[] = [];
  for (let i = 0; i < n; i++) if (teil[i]) (e.gruppe[i] === 1 ? faelleZeilen : kontrollZeilen).push(i);
  if (!faelleZeilen.length) return { ok: false, code: 'keine-faelle' };
  if (!kontrollZeilen.length) return { ok: false, code: 'keine-kontrollen' };

  // Kontrollen nach Anker gebündelt, in jedem Bündel nach der ersten Zahl sortiert (dann Zeile): so reicht je Fall ein Fenster statt aller Kontrollen.
  const schluessel = (i: number) => JSON.stringify(e.anker.map(c => [typeof c[i], c[i]]));
  const buendel = new Map<string, number[]>();
  for (const i of kontrollZeilen) { const s = schluessel(i); const l = buendel.get(s); if (l) l.push(i); else buendel.set(s, [i]); }
  const z0 = e.zahlen[0]!;
  for (const l of buendel.values()) l.sort((a, b) => z0[a]! - z0[b]! || a - b);
  const benutzt = new Uint8Array(n);
  const tol = e.toleranzen;

  const paare: AbgleichPaar[] = [];
  for (const i of faelleZeilen) {
    const l = buendel.get(schluessel(i)) ?? [];
    const gewaehlt: number[] = [];
    // Fenster in der ersten Zahl, mit Spielraum gegen Rundung; der genaue Test steht unten.
    const sp = tol[0]! + Math.abs(z0[i]!) * 1e-9 + 1e-9;
    let lo = 0, hi = l.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (z0[l[mid]!]! < z0[i]! - sp) lo = mid + 1; else hi = mid; }
    const start = lo;
    for (let r = 0; r < e.k; r++) {
      let best = -1, bestAbstand = Infinity;
      for (let j = start; j < l.length; j++) {
        const c = l[j]!;
        if (z0[c]! > z0[i]! + sp) break;
        if (benutzt[c]) continue;
        let passt = true, abstand = 0;
        for (let q = 0; q < e.zahlen.length; q++) {
          const diff = Math.abs(e.zahlen[q]![c]! - e.zahlen[q]![i]!);
          if (diff > tol[q]!) { passt = false; break; }
          if (tol[q]! > 0) abstand += diff / tol[q]!;
        }
        if (!passt) continue;
        if (abstand < bestAbstand || (abstand === bestAbstand && c < best)) { best = c; bestAbstand = abstand; }
      }
      if (best < 0) break;
      benutzt[best] = 1; gewaehlt.push(best);
    }
    paare.push({ fall: i + 1, kontrollen: gewaehlt.map(c => c + 1) });
  }

  const rolle: ('fall' | 'kontrolle' | null)[] = Array(n).fill(null), nummer: (number | null)[] = Array(n).fill(null);
  let nr = 0;
  for (const p of paare) {
    if (!p.kontrollen.length) continue;
    nr++;
    rolle[p.fall - 1] = 'fall'; nummer[p.fall - 1] = nr;
    for (const c of p.kontrollen) { rolle[c - 1] = 'kontrolle'; nummer[c - 1] = nr; }
  }
  const mitKontrolle = paare.filter(p => p.kontrollen.length > 0);
  const kontrollen = paare.reduce((a, p) => a + p.kontrollen.length, 0);
  const sm: Smd[] = e.zahlen.map(col => ({
    vorher: smd(faelleZeilen.map(i => col[i]!), kontrollZeilen.map(i => col[i]!)),
    nachher: smd(mitKontrolle.map(p => col[p.fall - 1]!), paare.flatMap(p => p.kontrollen.map(c => col[c - 1]!)))
  }));
  return { ok: true, paare, rolle, nummer, zeilen: n, ausgeschlossen, faelle: paare.length, voll: paare.filter(p => p.kontrollen.length === e.k).length,
    teilweise: paare.filter(p => p.kontrollen.length > 0 && p.kontrollen.length < e.k).length, ohne: paare.length - mitKontrolle.length, kontrollen, smd: sm };
}

/* ------------------------------------------------------------------ Sätze */
export function abgleichCodeSatz(c: AbgleichCode): { text: string; klein?: string } {
  switch (c) {
    case 'k-bereich': return { text: L(`Die Zahl der Kontrollen je Fall muss zwischen ${K_MIN} und ${K_MAX} liegen.`, `The number of controls per case must be between ${K_MIN} and ${K_MAX}.`) };
    case 'keine-zahl': return { text: L('Es fehlt mindestens eine Zahlenspalte mit Toleranz, nach der abgeglichen wird.', 'At least one number column with a tolerance to match on is missing.') };
    case 'toleranz': return { text: L('Die Toleranz muss je Zahlenspalte eine Zahl von 0 an sein. Bei 0 zählt nur ein gleicher Wert.', 'The tolerance must be a number from 0 upwards for each number column. With 0 only an equal value counts.') };
    case 'keine-faelle': return { text: L('In der Fall-Spalte steht kein Fall (1) mit allen Angaben.', 'The case column contains no case (1) with all values.') };
    case 'keine-kontrollen': return { text: L('In der Fall-Spalte steht keine Kontrolle (0) mit allen Angaben.', 'The case column contains no control (0) with all values.') };
    case 'laenge': return { text: L('Die Spalten passen nicht zusammen.', 'The columns do not fit together.') };
  }
}
/** Die Warnungen: immer sichtbar, sachlich - schon vor der Rechnung die allgemeinen, danach dazu die zu diesem Ergebnis. */
export function abgleichWarnungen(r?: AbgleichOk): string[] {
  const w: string[] = [
    L('Das Verfahren ist gierig und hängt von der Reihenfolge der Zeilen ab: Es nimmt für jeden Fall der Reihe nach die nächste freie Kontrolle und sucht nicht das beste Gesamtergebnis. Eine andere Reihenfolge kann andere Paare ergeben.', 'The method is greedy and depends on the order of the rows: for each case in turn it takes the closest free control and does not look for the best overall result. A different order can give different pairs.')
  ];
  if (r && r.ohne > 0) w.push(Lp(r.ohne, `${r.ohne} Fall hat keine passende Kontrolle und fällt aus dem Vergleich. Das verändert, wen der Vergleich beschreibt.`, `${r.ohne} Fälle haben keine passende Kontrolle und fallen aus dem Vergleich. Das verändert, wen der Vergleich beschreibt.`, `${r.ohne} case has no matching control and drops out of the comparison. That changes whom the comparison describes.`, `${r.ohne} cases have no matching control and drop out of the comparison. That changes whom the comparison describes.`));
  if (r && r.teilweise > 0) w.push(Lp(r.teilweise, `${r.teilweise} Fall hat weniger Kontrollen als gewünscht.`, `${r.teilweise} Fälle haben weniger Kontrollen als gewünscht.`, `${r.teilweise} case has fewer controls than wanted.`, `${r.teilweise} cases have fewer controls than wanted.`));
  if (r && r.ausgeschlossen > 0) w.push(Lp(r.ausgeschlossen, `${r.ausgeschlossen} Zeile nimmt nicht teil, weil in der Fall-Spalte oder in einer Abgleichsspalte etwas fehlt.`, `${r.ausgeschlossen} Zeilen nehmen nicht teil, weil in der Fall-Spalte oder in einer Abgleichsspalte etwas fehlt.`, `${r.ausgeschlossen} row does not take part because something is missing in the case column or in a matching column.`, `${r.ausgeschlossen} rows do not take part because something is missing in the case column or in a matching column.`));
  w.push(L('Der Abgleich gleicht nur die gewählten Merkmale an. Alles andere bleibt ungleich, und eine Ursache zeigt der Abgleich nicht.', 'The matching balances only the chosen characteristics. Everything else stays unequal, and the matching does not show a cause.'));
  w.push(L('Die Auswertung danach muss den Abgleich berücksichtigen, zum Beispiel mit gepaarten oder bedingten Verfahren. Nur innerhalb der Gruppen zu vergleichen, die bleiben, ist kein Experiment.', 'The analysis afterwards must take the matching into account, for example with paired or conditional methods. Comparing only within the groups that remain is not an experiment.'));
  w.push(L('Nicht aus denselben Daten rechnen und wählen, bis es passt: Wer Toleranz und Merkmale so lange ändert, bis das Ergebnis gefällt, kann dem Ergebnis nicht mehr trauen.', 'Do not calculate and choose from the same data until it fits: anyone who changes tolerance and characteristics until the result pleases can no longer trust the result.'));
  return w;
}
export const abgleichNameGruppe = (): string => L('Gruppe', 'Group');
export const abgleichNameRolle = (): string => L('Abgleich', 'Matching');
export const abgleichRolleText = (r: 'fall' | 'kontrolle' | null): string => (r === 'fall' ? L('Fall', 'Case') : r === 'kontrolle' ? L('Kontrolle', 'Control') : L('nicht abgeglichen', 'not matched'));
