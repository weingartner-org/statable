/**
 * Die Daten für das Bild „Mittelwert nach Gruppe“ (Später S-F2, Teil E) aus der Sitzung: Zahlenspalte, Gruppenspalte, Fallgewicht.
 * Gruppen in der Reihenfolge der Spalte (Wertelabels bzw. Werte, nie nach Größe), Lücken und „keine Angabe“ fallen heraus.
 * Häufigkeitsgewicht rechnet (n = Σw, wie wiederholte Zeilen); Umfragegewicht: gewichtete Mittel ohne Striche (mit „einzeln gezogen: Ja“ kommen die Striche aus R/survey, siehe BalkenBlock.svelte).
 */
import { s } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { gewichtLage } from './fallgewicht.svelte';
import { gruppenKennzahlen, BALKEN_GRUPPEN_MAX, type GruppeKz } from './balken';
import { zieheStichprobe, GRENZE } from './stichprobe';

export type BalkenQuelle =
  | { ok: true; gruppen: GruppeKz[]; punkte: Record<string, number[]>; alle: number[]; ausgelassen: number; gewicht: 'keins' | 'haeufigkeit' | 'umfrage'; klumpenfrei: boolean; gekuerzt: boolean; w: number[] | null }
  | { ok: false; code: 'keine-werte' | 'zu-wenig-gruppen' | 'zu-viele-gruppen' | 'gewicht'; anzahl?: number };

/** Der Anzeigename eines Werts der Gruppenspalte (Wertelabel oder der Wert selbst). */
export function gruppenLabel(gName: string, wert: string | number): string {
  const sg = s.spalten.find(c => c.name === gName);
  return sg?.werteLabels[String(wert)] ?? String(wert);
}
export function balkenQuelle(yName: string, gName: string): BalkenQuelle {
  const iy = s.spalten.findIndex(c => c.name === yName), ig = s.spalten.findIndex(c => c.name === gName);
  if (iy < 0 || ig < 0) return { ok: false, code: 'keine-werte' };
  const sy = s.spalten[iy]!, sg = s.spalten[ig]!;
  const gl = gewichtLage();
  if (gl.art === 'fehler' || gl.art === 'frage') return { ok: false, code: 'gewicht' };
  const gew = gl.art === 'gilt' ? gl.gewicht : null, w = gl.art === 'gilt' ? gl.pruefung.w : null;
  const label = (v: number | string) => (typeof v === 'number' ? sg.werteLabels[String(v)] ?? String(v) : sg.werteLabels[v] ?? v);
  // Reihenfolge der Spalte: Codes aufsteigend (Zahlen nach Größe, Text nach Schrift), dargestellt mit den Wertelabels
  const codes = new Map<string, number | string>();
  const y: (number | null)[] = [], g: (string | null)[] = [], wz: (number | null)[] = [];
  s.zeilen.forEach((z, i) => {
    const v = z[iy], c = z[ig];
    const yv = typeof v === 'number' && Number.isFinite(v) && !istFehlend(sy, v) ? v : null;
    const gv = c === null || c === undefined || c === '' || (typeof c === 'number' && istFehlend(sg, c)) ? null : c;
    if (gv !== null) codes.set(String(gv), gv);
    y.push(yv); g.push(gv === null ? null : label(gv)); wz.push(w ? w[i] ?? null : null);
  });
  const reihenfolge = [...codes.values()].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)).map(label);
  const art: 'keins' | 'haeufigkeit' | 'umfrage' = gew ? gew.art : 'keins';
  // Umfragegewicht: gewichtete Mittel, keine Striche; Zeilen mit Gewicht 0 zählen nicht
  if (art === 'umfrage') {
    const je = new Map<string, { sw: number; swy: number; n: number; min: number; max: number; werte: number[] }>();
    y.forEach((v, i) => { const gr = g[i], wi = wz[i]; if (v === null || gr === null || gr === undefined || !wi || !(wi > 0)) return; const e = je.get(gr) ?? { sw: 0, swy: 0, n: 0, min: Infinity, max: -Infinity, werte: [] }; e.sw += wi; e.swy += wi * v; e.n++; e.min = Math.min(e.min, v); e.max = Math.max(e.max, v); e.werte.push(v); je.set(gr, e); });
    const namen = reihenfolge.filter(n => je.has(n));
    if (!namen.length) return { ok: false, code: 'keine-werte' };
    if (namen.length < 2) return { ok: false, code: 'zu-wenig-gruppen', anzahl: namen.length };
    if (namen.length > BALKEN_GRUPPEN_MAX) return { ok: false, code: 'zu-viele-gruppen', anzahl: namen.length };
    const gruppen: GruppeKz[] = namen.map(n => { const e = je.get(n)!; return { gruppe: n, n: e.n, mittel: e.swy / e.sw, sd: null, se: null, df: null, kiU: null, kiO: null, min: e.min, max: e.max }; });
    const punkte = Object.fromEntries(namen.map(n => [n, zieheStichprobe(je.get(n)!.werte, GRENZE.gruppe).auswahl]));
    return { ok: true, gruppen, punkte, alle: Object.values(punkte).flat(), ausgelassen: 0, gewicht: 'umfrage', klumpenfrei: gew?.klumpenfrei === true, gekuerzt: namen.some(n => je.get(n)!.werte.length > GRENZE.gruppe), w: wz.map(x => x ?? 0) };
  }
  const e = gruppenKennzahlen(y, g, { reihenfolge, ...(art === 'haeufigkeit' ? { gewicht: wz } : {}) });
  if (!e.ok) return { ok: false, code: e.code, ...(e.anzahl !== undefined ? { anzahl: e.anzahl } : {}) };
  const roh = new Map<string, number[]>();
  y.forEach((v, i) => { const gr = g[i]; if (v === null || gr === null || gr === undefined) return; if (art === 'haeufigkeit' && !(wz[i]! > 0)) return; (roh.get(gr) ?? roh.set(gr, []).get(gr)!).push(v); });
  const punkte = Object.fromEntries(e.gruppen.map(k => [k.gruppe, zieheStichprobe(roh.get(k.gruppe) ?? [], GRENZE.gruppe).auswahl]));
  return { ok: true, gruppen: e.gruppen, punkte, alle: Object.values(punkte).flat(), ausgelassen: e.ausgelassen, gewicht: art, klumpenfrei: false, gekuerzt: e.gruppen.some(k => (roh.get(k.gruppe)?.length ?? 0) > GRENZE.gruppe), w: w ? wz.map(x => x ?? 0) : null };
}
