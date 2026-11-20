/**
 * Übereinstimmung auf Segmentebene (Stufe 5, Paket 5B). Regel: docs/erheben/FACHBLATT-STUFE-5.md, "Übereinstimmung auf Segmentebene".
 * Einheit = Segment x Code beider Personen. Zwei Bereiche decken sich, wenn gemeinsamer Text / Text beider zusammen (Codepoints) die Schwelle erreicht.
 * Reiner Rechenkern ohne Oberfläche; die Eingabe wird nie verändert.
 */
import { kodiereinheiten } from './qualauswertung';
import type { QualProjekt } from './qualprojekt';

export interface Einheit { person: 'a' | 'b'; segment: string; code: string; dokument: string; start: number; ende: number; passt: boolean }
export type AbweichungArt = 'grenzen' | 'anderer-code' | 'nur-eine';
export interface Abweichung { id: string; art: AbweichungArt; dokument: string; einheiten: Einheit[] }
export interface SegmentErgebnis {
  einheiten: number; uebereinstimmend: number; nurA: number; nurB: number; prozent: number | null; kappaBP: number | null; k: number;
  jeCode: { code: string; einheiten: number; uebereinstimmend: number; nurA: number; nurB: number; prozent: number | null }[];
  liste: Einheit[]; abweichungen: Abweichung[];
}

/** |s ∩ t| / |s ∪ t| (0 bis 1; Ende exklusiv). */
export function ueberlappung(s: { start: number; ende: number }, t: { start: number; ende: number }): number {
  const schnitt = Math.max(0, Math.min(s.ende, t.ende) - Math.max(s.start, t.start));
  const vereinigung = (s.ende - s.start) + (t.ende - t.start) - schnitt;
  return vereinigung > 0 ? schnitt / vereinigung : 0;
}

export function segmentUebereinstimmung(q: QualProjekt, o: { a: string; b: string; codes: string[]; dokumente?: string[]; schwelle: number }): SegmentErgebnis {
  const dokIx = new Map(q.dokumente.map((d, i) => [d.id, i])), codeIx = new Map(o.codes.map((c, i) => [c, i]));
  const von = (person: 'a' | 'b', id: string): Einheit[] =>
    kodiereinheiten(q, [id], o.codes, o.dokumente).map(e => ({ person, segment: e.segment, code: e.code, dokument: e.dokument, start: e.start, ende: e.ende, passt: false }));
  const liste = [...von('a', o.a), ...von('b', o.b)].sort((x, y) =>
    (dokIx.get(x.dokument) ?? 0) - (dokIx.get(y.dokument) ?? 0) || x.start - y.start || x.ende - y.ende
    || (x.person === y.person ? 0 : x.person === 'a' ? -1 : 1) || codeIx.get(x.code)! - codeIx.get(y.code)!);

  // Gegenstücke: Einheiten der anderen Person mit gleichem Dokument und Code
  const gruppen = new Map<string, Einheit[]>();
  for (const e of liste) { const k = `${e.person}\u0000${e.dokument}\u0000${e.code}`; let l = gruppen.get(k); if (!l) gruppen.set(k, l = []); l.push(e); }
  for (const e of liste) {
    const andere = gruppen.get(`${e.person === 'a' ? 'b' : 'a'}\u0000${e.dokument}\u0000${e.code}`);
    e.passt = !!andere && andere.some(t => ueberlappung(e, t) >= o.schwelle);
  }

  const n = liste.length, gut = liste.filter(e => e.passt).length;
  const nurA = liste.filter(e => !e.passt && e.person === 'a').length, nurB = liste.filter(e => !e.passt && e.person === 'b').length;
  const p = n ? gut / n : null, k = o.codes.length;
  const jeCode = o.codes.map(c => {
    const v = liste.filter(e => e.code === c), g = v.filter(e => e.passt).length;
    return { code: c, einheiten: v.length, uebereinstimmend: g, nurA: v.filter(e => !e.passt && e.person === 'a').length, nurB: v.filter(e => !e.passt && e.person === 'b').length, prozent: v.length ? g / v.length : null };
  });

  // Abweichungen: Gruppen nicht passender Einheiten desselben Dokuments, die sich (auch über Zwischenglieder) um mindestens ein Zeichen überlappen.
  // Die Liste ist nach Dokument und Start sortiert, darum genügt ein Durchlauf mit dem größten bisherigen Ende.
  const abweichungen: Abweichung[] = [];
  let akt: Einheit[] = [], aktEnde = -Infinity;
  const schliesse = () => {
    if (!akt.length) return;
    const hatA = new Set(akt.filter(e => e.person === 'a').map(e => e.code)), hatB = akt.filter(e => e.person === 'b').map(e => e.code);
    const art: AbweichungArt = hatB.some(c => hatA.has(c)) ? 'grenzen' : hatA.size && hatB.length ? 'anderer-code' : 'nur-eine';
    const start = Math.min(...akt.map(e => e.start)), ende = Math.max(...akt.map(e => e.ende));
    abweichungen.push({ id: `${akt[0]!.dokument}:${start}:${ende}`, art, dokument: akt[0]!.dokument, einheiten: akt });
    akt = [];
  };
  for (const e of liste) {
    if (e.passt) continue;
    if (akt.length && (akt[0]!.dokument !== e.dokument || !(e.start < aktEnde))) schliesse();
    aktEnde = akt.length ? Math.max(aktEnde, e.ende) : e.ende;
    akt.push(e);
  }
  schliesse();

  return { einheiten: n, uebereinstimmend: gut, nurA, nurB, prozent: p, kappaBP: p === null || k < 2 ? null : (p - 1 / k) / (1 - 1 / k), k, jeCode, liste, abweichungen };
}
