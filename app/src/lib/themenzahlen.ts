/**
 * Joint Display „Zahlen nach Themen“ (Später, Welle S-D, G12; Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 3 und „Entscheidungen Opus“ 3).
 * Zu jedem Thema aus den offenen Antworten stehen die Zahlen der Personen, die es nennen: n, Prozent, bei einer Zahlenfrage M, SD, Median, Spanne, bei einer Kategorienfrage die Verteilung.
 * Reine Funktionen ohne Oberfläche (die Tabelle baut themenzahlensaetze.ts). Quellen: Guetterman, Fetters & Creswell (2015), Annals of Family Medicine 13(6), 554-561; Fetters, Curry & Creswell (2013), Health Services Research 48(6 Pt 2), 2134-2156.
 *
 * Festlegungen (Opus 17.10.):
 *  - Basis = Personen mit mindestens einem Thema (Zustand „zugeordnet“). „leer“ (kein Text) und „offen“ (Text, noch kein Thema) sind fehlend und gehören NICHT zur Basis; ihre Zahlen stehen daneben.
 *  - Eine Person kann mehrere Themen nennen: Summe der n und Summe der Prozent können über |Basis| und 100 liegen (Hinweis „ueberlappung“); die Überschneidungsmatrix zählt Personen mit beiden Themen.
 *  - KEINE Tests und keine Sternchen: Themen entstehen aus denselben Daten, die Zeilen überlappen, die Zellen sind klein, jede Zeile wäre ein Test. Wer ein Thema prüfen will, geht über die Karte „Gruppen vergleichen“.
 *  - SD mit n − 1 (bei einem Fall fehlt sie), Median bei geradem n das Mittel der beiden mittleren Werte, Prozent von |Basis|, n < 5 gilt als klein.
 *  - Zitate wählt NUR die Person (höchstens 3 je Thema); Statable wählt nie ein Zitat von selbst aus.
 */

export type ThemaZustand = 'zugeordnet' | 'leer' | 'offen';
export interface ThemaWerte { name: string; werte: (number | null)[] }
export type ThemenFrage = { art: 'zahl'; werte: (number | null)[] } | { art: 'kategorie'; werte: (string | number | null)[] };
export interface ThemenZeile {
  name?: string; n: number; prozent: number; nGueltig: number; klein: boolean;
  mw?: number; sd?: number; median?: number; min?: number; max?: number;
  verteilung?: { wert: string; n: number; prozent: number | null }[];
}
export interface Themenzahlen {
  basis: number; leer: number; offen: number; summeN: number; summeProzent: number;
  themenJePerson: number[]; ueberschneidung: number[][];
  gesamt: ThemenZeile; zeilen: ThemenZeile[]; ohne: ThemenZeile[] | null;
  hinweise: ('ueberlappung' | 'zu-viele-themen' | 'basis-null')[];
}
export interface ThemenOptionen { frage?: ThemenFrage; ohne?: boolean }

/** n < 5: M und SD sind dann sehr unsicher (Fachblatt 3.5; Schwelle von Opus festzulegen, hier 5). */
export const KLEIN_N = 5;
/** Mehr Themen als dies: Hinweis, die Tabelle wird unübersichtlich (gerechnet wird trotzdem). */
export const THEMEN_MAX = 20;

const mitteln = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
function medianVon(x: number[]): number { const s = [...x].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
const vergleiche = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de', { numeric: true }));
const gueltigText = (v: string | number | null | undefined): v is string | number => v !== null && v !== undefined && !(typeof v === 'number' && !Number.isFinite(v)) && String(v).trim() !== '';

/**
 * Die Zahlen nach Themen. `themen`: je Thema 0/1 je Person (null = leer oder offen, wie `ergebnis()` in lib/kategorisieren.ts), `zustand` je Person.
 * `o.frage`: eine Zahlen- oder Kategorienfrage (je Person ein Wert); `o.ohne`: Zeilen „ohne dieses Thema“ mitrechnen.
 */
export function themenzahlen(themen: ThemaWerte[], zustand: ThemaZustand[], o: ThemenOptionen = {}): Themenzahlen {
  const basisIdx = zustand.flatMap((z, i) => (z === 'zugeordnet' ? [i] : []));
  const basis = basisIdx.length, leer = zustand.filter(z => z === 'leer').length, offen = zustand.filter(z => z === 'offen').length;
  const nennt = (t: number, i: number) => themen[t]!.werte[i] === 1;
  const frage = o.frage;
  const stufen: (string | number)[] = frage?.art === 'kategorie'
    ? [...new Map(basisIdx.map(i => frage.werte[i]).filter(gueltigText).map(v => [String(v), v] as const)).values()].sort(vergleiche) : [];

  const zeile = (idx: number[], name?: string): ThemenZeile => {
    const n = idx.length, z: ThemenZeile = { n, prozent: basis ? (n / basis) * 100 : 0, nGueltig: n, klein: n < KLEIN_N };
    if (name !== undefined) z.name = name;
    if (!frage) return z;
    if (frage.art === 'zahl') {
      const w = idx.map(i => frage.werte[i]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      z.nGueltig = w.length;
      if (w.length >= 1) {
        const m = mitteln(w);
        z.mw = m; z.median = medianVon(w); z.min = Math.min(...w); z.max = Math.max(...w);
        if (w.length >= 2) z.sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / (w.length - 1));
      }
    } else {
      const w = idx.map(i => frage.werte[i]).filter(gueltigText);
      z.nGueltig = w.length;
      z.verteilung = stufen.map(s => { const k = w.filter(v => String(v) === String(s)).length; return { wert: String(s), n: k, prozent: w.length ? (k / w.length) * 100 : null }; });
    }
    return z;
  };

  const je = themen.map((_, t) => basisIdx.filter(i => nennt(t, i)));
  const zeilen = je.map((idx, t) => zeile(idx, themen[t]!.name));
  const summeN = zeilen.reduce((a, z) => a + z.n, 0);
  const themenJePerson = themen.map((_, j) => basisIdx.filter(i => themen.reduce((a, _t, t) => a + (nennt(t, i) ? 1 : 0), 0) === j + 1).length);
  const ueberschneidung = themen.map((_, a) => themen.map((__, b) => basisIdx.filter(i => nennt(a, i) && nennt(b, i)).length));
  const hinweise: Themenzahlen['hinweise'] = [];
  if (summeN > basis) hinweise.push('ueberlappung');
  if (themen.length > THEMEN_MAX) hinweise.push('zu-viele-themen');
  if (basis === 0) hinweise.push('basis-null');
  return {
    basis, leer, offen, summeN, summeProzent: zeilen.reduce((a, z) => a + z.prozent, 0), themenJePerson, ueberschneidung,
    gesamt: zeile(basisIdx), zeilen,
    ohne: o.ohne ? je.map((idx, t) => zeile(basisIdx.filter(i => !nennt(t, i)), themen[t]!.name)) : null,
    hinweise
  };
}

/**
 * Die Zitate zu einem Thema: NUR die Stellen, die die Person in den Antworten markiert hat, und nur von Personen, die dem Thema zugeordnet sind (`thema[i] === 1`),
 * in der Reihenfolge der Personen, höchstens `max` (3). Ohne Markierung bleibt die Liste leer - Statable wählt nie ein Zitat von selbst aus.
 */
export function zitateDesThemas(thema: (number | null)[], kennungen: string[], markierungen: ({ von: number; bis: number; text: string }[] | undefined)[], max = 3): { kennung: string; text: string }[] {
  const aus: { kennung: string; text: string }[] = [];
  for (let i = 0; i < thema.length && aus.length < max; i++) {
    if (thema[i] !== 1) continue;
    for (const m of markierungen[i] ?? []) { if (aus.length >= max) break; aus.push({ kennung: kennungen[i] ?? String(i + 1), text: m.text }); }
  }
  return aus;
}
