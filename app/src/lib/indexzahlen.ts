/**
 * Indexzahlen (Fachblatt Abschnitt 3, Teil 1): Basisperiode wechseln, Veränderung zum Vorjahr, Verketten zweier Reihen, Laspeyres- und Paasche-Index.
 * Reine JavaScript-Rechnung ohne Sitzung (kein R, kein PSPP). Gerundet wird nie in der Rechnung; die Oberfläche rundet erst beim Anzeigen.
 * Lücken werden nie aufgefüllt und nie geschätzt: Wo ein nötiger Wert fehlt, bleibt das Ergebnis leer (`null`) oder die Rechnung ist gesperrt, mit einem Satz.
 * Sollwerte: lib/testdaten/index-armut-erwartet.json (scripts/index-armut-erwartet.R), Tests: lib/indexzahlen.test.ts.
 */
import { L, Lp, d } from './sitzung.svelte';

const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ 1. Basisperiode wechseln */
export type BasisCode = 'basis-leer' | 'basis-fehlt' | 'basis-null';
export type BasisErgebnis = { ok: true; werte: (number | null)[]; basis: number; zeilen: number } | { ok: false; code: BasisCode; fehlend?: number };

/** Index zur neuen Basis: I_t · 100 / Mittel der Basisperiode. `basis` sind die Zeilen der Basisperiode (ein Zeitpunkt oder ein ganzes Jahr).
 *  Fehlt in der Basisperiode ein Wert, ist die Rechnung gesperrt; ist das Mittel 0 oder negativ, ebenso. Werte außerhalb der Basisperiode, die fehlen, bleiben leer. */
export function basisWechseln(x: (number | null)[], basis: number[]): BasisErgebnis {
  const zeilen = [...new Set(basis)].filter(i => i >= 0 && i < x.length);
  if (!zeilen.length) return { ok: false, code: 'basis-leer' };
  const fehlend = zeilen.filter(i => !zahl(x[i])).length;
  if (fehlend) return { ok: false, code: 'basis-fehlt', fehlend };
  const mittel = zeilen.reduce((a, i) => a + (x[i] as number), 0) / zeilen.length;
  if (!(mittel > 0)) return { ok: false, code: 'basis-null' };
  return { ok: true, werte: x.map(v => (zahl(v) ? (v * 100) / mittel : null)), basis: mittel, zeilen: zeilen.length };
}
/** Die Zeilen, in denen die Zeitspalte das gewählte Jahr hat (Jahreszahlen oder ISO-Daten `JJJJ-MM-TT`). */
export function zeilenDesJahres(jahre: (number | null)[], jahr: number): number[] { return jahre.flatMap((j, i) => (j === jahr ? [i] : [])); }
/** Das Jahr aus einem ISO-Datum (`JJJJ-MM-TT`) oder `null`. */
export function jahrVonIso(iso: string | null): number | null { const m = iso ? /^(\d{4})-\d{2}-\d{2}/.exec(iso) : null; return m ? Number(m[1]) : null; }

/* ------------------------------------------------------------------ 2. Veränderung zum Vorjahr */
export type VorjahrRaster = 'monatlich' | 'vierteljaehrlich' | 'jaehrlich' | 'woechentlich' | 'taeglich' | 'ungleich';
/** Wie viele Plätze der Vorjahreswert zurückliegt. Täglich und ungleich haben keinen: gesperrt. */
export const VORJAHR_L: Partial<Record<VorjahrRaster, number>> = { monatlich: 12, vierteljaehrlich: 4, jaehrlich: 1, woechentlich: 52 };
export type VorjahrCode = 'raster' | 'doppelt' | 'zu-kurz' | 'datum';
export interface VorjahrOk { ok: true; werte: (number | null)[]; ohneVorwert: number; nullVorwert: number; ohneDatum: number; luecke: number; l: number }
export type VorjahrErgebnis = VorjahrOk | { ok: false; code: VorjahrCode; zeilen?: number[] };

const tageImMonat = (j: number, m: number) => [31, (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
/** Platz eines ISO-Datums im Raster (Monat, Vierteljahr, Jahr, Woche); `null`, wenn es kein gültiges Datum ist. */
export function rasterPlatz(iso: string | null, raster: VorjahrRaster): number | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return null;
  const j = Number(m[1]), mo = Number(m[2]), t = Number(m[3]);
  if (mo < 1 || mo > 12 || t < 1 || t > tageImMonat(j, mo)) return null;
  switch (raster) {
    case 'monatlich': return 12 * j + mo - 1;
    case 'vierteljaehrlich': return 4 * j + Math.floor((mo - 1) / 3);
    case 'jaehrlich': return j;
    case 'woechentlich': return Math.round(Date.UTC(j, mo - 1, t) / 86_400_000);   // Tageszahl; die Wochen werden in vorjahr() über den Abstand von 7 Tagen gezählt
    default: return null;
  }
}
/** Veränderung zum Vorjahr in Prozent: x_t / x_(t−L) · 100 − 100. Gesucht wird der Vorwert nach dem Platz in der Zeit (mit Datum) oder nach der Reihenfolge der Zeilen (ohne Datum).
 *  Fehlt der Vorwert, die Zeile selbst oder ist der Vorwert 0, bleibt die Zelle leer; es wird nichts aufgefüllt. */
export function vorjahr(x: (number | null)[], raster: VorjahrRaster, datum: (string | null)[] | null = null): VorjahrErgebnis {
  const l = VORJAHR_L[raster];
  if (l === undefined) return { ok: false, code: 'raster' };
  const n = x.length;
  // Platz jeder Zeile in der Zeit
  let platz: (number | null)[];
  if (datum) {
    if (datum.length !== n) return { ok: false, code: 'datum' };
    platz = datum.map(t => rasterPlatz(t, raster));
    if (raster === 'woechentlich') {
      const tage = platz.filter((p): p is number => p !== null);
      if (tage.length && !tage.every(p => (((p - tage[0]!) % 7) + 7) % 7 === 0)) return { ok: false, code: 'raster' };
      platz = platz.map(p => (p === null ? null : (p - tage[0]!) / 7));
    }
  } else platz = x.map((_, i) => i);
  const zeileAm = new Map<number, number>(), doppelt = new Set<number>();
  platz.forEach((p, i) => { if (p === null) return; const alt = zeileAm.get(p); if (alt !== undefined) { doppelt.add(alt); doppelt.add(i); } else zeileAm.set(p, i); });
  if (doppelt.size) return { ok: false, code: 'doppelt', zeilen: [...doppelt].sort((a, b) => a - b) };
  if (n <= l) return { ok: false, code: 'zu-kurz' };
  const werte: (number | null)[] = Array(n).fill(null);
  let ohneVorwert = 0, nullVorwert = 0, ohneDatum = 0, luecke = 0;
  for (let i = 0; i < n; i++) {
    const p = platz[i]!;
    if (p === null) { ohneDatum++; continue; }
    if (!zahl(x[i])) { luecke++; continue; }
    const j = zeileAm.get(p - l);
    if (j === undefined) { ohneVorwert++; continue; }
    const v = x[j];
    if (!zahl(v)) { luecke++; continue; }
    if (v === 0) { nullVorwert++; continue; }
    werte[i] = (x[i] as number) / v * 100 - 100;
  }
  return { ok: true, werte, ohneVorwert, nullVorwert, ohneDatum, luecke, l };
}

/* ------------------------------------------------------------------ 3. Verketten */
export type VerkettenCode = 'kein-gemeinsam' | 'u-ungueltig' | 'basis-null' | 'laenge';
export interface VerkettenOk { ok: true; gemeinsam: number[]; u: number; aufNeu: (number | null)[]; aufAlt: (number | null)[] }
export type VerkettenErgebnis = VerkettenOk | { ok: false; code: VerkettenCode };

/** Zwei Reihen mit einem gemeinsamen Zeitpunkt u (eine Zeile, in der beide einen Wert haben). Auf die neue Basis: a_t · b_u / a_u; auf die alte: b_t · a_u / b_u.
 *  In Zeilen, in denen beide Werte haben, gilt bei „neu“ der Wert der neuen Reihe b, bei „alt“ der der alten Reihe a. `u` = Zeile des gewählten gemeinsamen Zeitpunkts; ohne Angabe der letzte. */
export function verketten(a: (number | null)[], b: (number | null)[], u: number | null = null): VerkettenErgebnis {
  if (a.length !== b.length) return { ok: false, code: 'laenge' };
  const gemeinsam = a.flatMap((_, i) => (zahl(a[i]) && zahl(b[i]) ? [i] : []));
  if (!gemeinsam.length) return { ok: false, code: 'kein-gemeinsam' };
  const z = u === null ? gemeinsam[gemeinsam.length - 1]! : u;
  if (!gemeinsam.includes(z)) return { ok: false, code: 'u-ungueltig' };
  const au = a[z] as number, bu = b[z] as number;
  if (!(au > 0) || !(bu > 0)) return { ok: false, code: 'basis-null' };
  const aufNeu = a.map((av, i) => (zahl(b[i]) ? (b[i] as number) : zahl(av) ? (av * bu) / au : null));
  const aufAlt = b.map((bv, i) => (zahl(a[i]) ? (a[i] as number) : zahl(bv) ? (bv * au) / bu : null));
  return { ok: true, gemeinsam, u: z, aufNeu, aufAlt };
}

/* ------------------------------------------------------------------ 4. Laspeyres und Paasche */
export interface Gut { p: (number | null)[]; q: (number | null)[] }
export type PreisCode = 'zu-wenig-gueter' | 'laenge' | 'basis-leer' | 'basis-ungueltig';
export type ZeitSperre = 'fehlt' | 'preis' | 'menge';
export interface PreisOk { ok: true; laspeyres: (number | null)[]; paasche: (number | null)[]; menge: (number | null)[]; gesperrt: { zeile: number; grund: ZeitSperre }[] }
export type PreisErgebnis = PreisOk | { ok: false; code: PreisCode; grund?: ZeitSperre };

/** Prüft eine Zeile (einen Zeitpunkt) für alle Güter: fehlender Wert → 'fehlt', Preis ≤ 0 → 'preis', Menge < 0 → 'menge'; sonst `null` (in Ordnung). */
function zeileSperre(g: Gut[], t: number): ZeitSperre | null {
  if (g.some(x => !zahl(x.p[t]) || !zahl(x.q[t]))) return 'fehlt';
  if (g.some(x => (x.p[t] as number) <= 0)) return 'preis';
  if (g.some(x => (x.q[t] as number) < 0)) return 'menge';
  return null;
}
/** Laspeyres: Σ p_t q_0 / Σ p_0 q_0 · 100. Paasche: Σ p_t q_t / Σ p_0 q_t · 100. Mengenindex (Laspeyres): Σ q_t p_0 / Σ q_0 p_0 · 100.
 *  Mindestens zwei Güter. Fehlt in einem Zeitpunkt ein Wert oder ist ein Preis ≤ 0, ist dieser Zeitpunkt gesperrt (leer); ein Ersatzwert wird nie eingesetzt. Ist die Basisperiode ungültig, ist alles gesperrt. */
export function preisIndex(gueter: Gut[], basis: number): PreisErgebnis {
  if (gueter.length < 2) return { ok: false, code: 'zu-wenig-gueter' };
  const n = gueter[0]!.p.length;
  if (gueter.some(g => g.p.length !== n || g.q.length !== n)) return { ok: false, code: 'laenge' };
  if (!(basis >= 0 && basis < n)) return { ok: false, code: 'basis-leer' };
  const bs = zeileSperre(gueter, basis);
  if (bs) return { ok: false, code: 'basis-ungueltig', grund: bs };
  const p0 = gueter.map(g => g.p[basis] as number), q0 = gueter.map(g => g.q[basis] as number);
  const nenner = p0.reduce((a, p, i) => a + p * q0[i]!, 0);
  if (!(nenner > 0)) return { ok: false, code: 'basis-ungueltig', grund: 'menge' };
  const laspeyres: (number | null)[] = Array(n).fill(null), paasche: (number | null)[] = Array(n).fill(null), menge: (number | null)[] = Array(n).fill(null);
  const gesperrt: { zeile: number; grund: ZeitSperre }[] = [];
  for (let t = 0; t < n; t++) {
    const s = zeileSperre(gueter, t);
    if (s) { gesperrt.push({ zeile: t, grund: s }); continue; }
    const pt = gueter.map(g => g.p[t] as number), qt = gueter.map(g => g.q[t] as number);
    laspeyres[t] = (pt.reduce((a, p, i) => a + p * q0[i]!, 0) / nenner) * 100;
    menge[t] = (qt.reduce((a, q, i) => a + q * p0[i]!, 0) / nenner) * 100;
    const pn = qt.reduce((a, q, i) => a + p0[i]! * q, 0);
    if (pn > 0) paasche[t] = (pt.reduce((a, p, i) => a + p * qt[i]!, 0) / pn) * 100; else gesperrt.push({ zeile: t, grund: 'menge' });
  }
  return { ok: true, laspeyres, paasche, menge, gesperrt };
}

/* ------------------------------------------------------------------ Sätze */
export type IndexCode = BasisCode | VorjahrCode | VerkettenCode | PreisCode;
export interface IndexSatzKontext { fehlend?: number; zeilen?: number; grund?: ZeitSperre }
/** Der Satz zu einer Sperre. Zusatz („klein“) sagt, was die Person tun kann. */
export function indexCodeSatz(code: IndexCode, x: IndexSatzKontext = {}): { text: string; klein?: string } {
  switch (code) {
    case 'basis-leer': return { text: L('Die gewählte Basisperiode hat keine Zeile in den Daten.', 'The chosen base period has no row in the data.') };
    case 'basis-fehlt': return { text: (x.fehlend ?? 0) === 1 ? L('In der Basisperiode fehlt ein Wert. Statable ersetzt ihn nicht und rechnet nicht weiter.', 'A value is missing in the base period. Statable does not replace it and does not calculate further.') : L('In der Basisperiode fehlen Werte. Statable ersetzt sie nicht und rechnet nicht weiter.', 'Values are missing in the base period. Statable does not replace them and does not calculate further.'),
      klein: d('Wähle eine Basisperiode ohne Lücke.', 'Wählen Sie eine Basisperiode ohne Lücke.', 'Choose a base period without a gap.') };
    case 'basis-null': return { text: L('Der Wert der Basisperiode ist 0 oder negativ. Ein Index mit dieser Basis lässt sich nicht berechnen.', 'The value of the base period is 0 or negative. An index with this base cannot be calculated.') };
    case 'raster': return { text: L('Für tägliche oder ungleich verteilte Zeitpunkte gibt es keinen Vorjahreswert, der eindeutig wäre. Statable rechnet hier nicht.', 'For daily or unevenly spaced points in time there is no unambiguous value from the previous year. Statable does not calculate here.'),
      klein: d('Fasse die Daten vorher zu Monaten, Vierteljahren oder Jahren zusammen.', 'Fassen Sie die Daten vorher zu Monaten, Vierteljahren oder Jahren zusammen.', 'Combine the data into months, quarters or years first.') };
    case 'doppelt': return { text: L('Mehrere Zeilen fallen auf denselben Zeitpunkt. Dann ist der Vorjahreswert nicht eindeutig; Statable rechnet nicht weiter.', 'Several rows fall on the same point in time. The value of the previous year is then not unambiguous; Statable does not calculate further.'),
      ...(x.zeilen ? { klein: L(`Betroffen sind ${x.zeilen} Zeilen.`, `${x.zeilen} rows are affected.`) } : {}) };
    case 'zu-kurz': return { text: L('Die Reihe ist nicht länger als ein Jahr. Es gibt keinen Vorjahreswert.', 'The series is not longer than one year. There is no value from the previous year.') };
    case 'datum': return { text: L('Die Zeitspalte passt nicht zu den Zahlen.', 'The time column does not match the numbers.') };
    case 'kein-gemeinsam': return { text: L('Die beiden Reihen haben keinen gemeinsamen Zeitpunkt, an dem beide einen Wert haben. Statable verkettet nicht und schätzt nichts.', 'The two series have no common point in time at which both have a value. Statable does not chain them and does not estimate anything.') };
    case 'u-ungueltig': return { text: L('An dem gewählten Zeitpunkt haben nicht beide Reihen einen Wert.', 'At the chosen point in time not both series have a value.') };
    case 'laenge': return { text: L('Die Spalten sind verschieden lang.', 'The columns have different lengths.') };
    case 'zu-wenig-gueter': return { text: L('Ein Preisindex braucht mindestens zwei Güter, je mit einer Preis- und einer Mengenspalte.', 'A price index needs at least two goods, each with a price column and a quantity column.') };
    case 'basis-ungueltig': return { text: x.grund === 'fehlt' ? L('In der Basisperiode fehlt ein Preis oder eine Menge. Statable ersetzt nichts und rechnet nicht weiter.', 'A price or a quantity is missing in the base period. Statable replaces nothing and does not calculate further.')
      : x.grund === 'preis' ? L('In der Basisperiode ist ein Preis 0 oder negativ. Statable rechnet nicht weiter.', 'A price in the base period is 0 or negative. Statable does not calculate further.')
      : L('In der Basisperiode ist eine Menge negativ oder alle Ausgaben sind 0. Statable rechnet nicht weiter.', 'A quantity in the base period is negative or all expenditure is 0. Statable does not calculate further.') };
  }
}
export function zeitSperreSatz(n: number, grund: ZeitSperre | null): string {
  const was = grund === 'fehlt' ? L('ein Wert fehlt', 'a value is missing') : grund === 'preis' ? L('ein Preis ist 0 oder negativ', 'a price is 0 or negative') : L('eine Menge ist negativ oder alle Mengen sind 0', 'a quantity is negative or all quantities are 0');
  const wer = Lp(n, 'Ein Zeitpunkt ist gesperrt und bleibt leer', `${n} Zeitpunkte sind gesperrt und bleiben leer`, 'One point in time is blocked and stays empty', `${n} points in time are blocked and stay empty`);
  return `${wer}: ${was}. ${L('Statable setzt keinen Ersatzwert ein.', 'Statable does not insert a substitute value.')}`;
}
/** Hinweis zu Laspeyres und Paasche (Fachblatt): kein Urteil, welcher Index „richtig“ ist. */
export const laspeyresPaascheSatz = (): string => L('Laspeyres hält die Mengen der Basisperiode fest, Paasche nimmt die aktuellen Mengen. Die Differenz der beiden zeigt, wie stark sich der Warenkorb verschoben hat. Welcher Index der richtige ist, sagt das nicht.', 'Laspeyres holds the quantities of the base period fixed, Paasche uses the current quantities. The difference between the two shows how much the basket has shifted. It does not say which index is the right one.');
/** Warnung beim Verketten (Fachblatt). */
export const verkettenWarnung = (): string => L('Verketten setzt voraus, dass beide Reihen dasselbe messen. Ein geänderter Warenkorb oder eine neue Abgrenzung bleibt ein Bruch in der Reihe, auch wenn die Zahlen nahtlos aussehen.', 'Chaining assumes that both series measure the same thing. A changed basket or a new definition remains a break in the series, even if the numbers look seamless.');
export const vorjahrHinweis = (): string => L('Die Veränderung steht in Prozent gegenüber dem Wert genau ein Jahr davor. Wo dieser Wert fehlt oder 0 ist, bleibt die Zelle leer.', 'The change is in percent compared with the value exactly one year before. Where that value is missing or 0, the cell stays empty.');
