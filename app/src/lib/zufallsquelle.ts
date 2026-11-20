/**
 * Die Daten für „Ohne Normalverteilung - mit Zufallsverfahren“ aus den geladenen Daten und dem Ergebnis des Blatts (Später, Welle S-B, Teil 6, L5).
 * Eine Rechnung aus den einzelnen Werten: Mit Häufigkeitsgewicht aus der erweiterten Menge (die Zeile w-mal; bei Σw über 100 000 gesperrt), mit Umfragegewicht gesperrt
 * (ohne Stichprobenplan ist ein Permutationstest oder Bootstrap mit Gewichten nicht definiert; Schlüssel `gruppen:zufall` usw. in lib/gewichte.ts).
 */
import { fehlendMenge, type Fehlmenge } from './fehlend';
import { s, spalteNach, type Blatt } from './sitzung.svelte';
import { dez } from '../i18n/profil';
import { werteVon } from './blatttitel';
import { istSetName } from './mehrfach';
import { gewichtLage } from './fallgewicht.svelte';
import { GewichtFehler, erweitern } from './gewichte';
import { ZUFALL_GEWICHT_MAX } from './permutation';
import { designZeilen } from './diagrammquellen';
import type { Vorhersage, Zusammenhang } from './ergebnis';
import type { ZufallDaten } from './zufallslauf';

export type QuellenGrund = 'umfrage' | 'zu-gross' | 'wenig' | 'keine-zahlen' | 'rangkorr' | 'katmodell' | 'mehrere-gruppen' | 'hier';
const idx = (n: string) => s.spalten.findIndex(x => x.name === n);
const gruppenName = (n: string, w: string | number) => spalteNach(n)?.werteLabels[String(w)] ?? dez(String(w));
const gueltig = (v: unknown, fe: Fehlmenge): v is number => typeof v === 'number' && Number.isFinite(v) && !fe.includes(v);

export function zufallQuelle(b: Blatt): { daten: ZufallDaten } | { grund: QuellenGrund } {
  const lage = gewichtLage();
  if (lage.art === 'gilt' && lage.gewicht.art === 'umfrage') return { grund: 'umfrage' };
  const w = lage.art === 'gilt' ? lage.pruefung.w : null;
  /** Wert und Zeilennummer → die erweiterte Liste (jede Zeile so oft, wie ihr Häufigkeitsgewicht sagt). Die Summe der Gewichte aller erweiterten Listen zusammen darf 100 000 nicht übersteigen. */
  let verbraucht = 0;
  const erw = <T,>(x: { wert: T; r: number }[]): T[] => {
    if (!w) return x.map(a => a.wert);
    const summe = x.reduce((s0, a) => s0 + (w[a.r] ?? 0), 0);
    if (verbraucht + summe > ZUFALL_GEWICHT_MAX) throw new GewichtFehler('zu-gross');
    verbraucht += summe;
    return erweitern(x.map(a => a.wert), x.map(a => w[a.r] ?? 0), ZUFALL_GEWICHT_MAX);
  };
  const erg = b.ergebnis as { typ?: string; e?: unknown } | null;
  try {
    if (erg?.typ === 'zwei-gruppen' || erg?.typ === 'anova') {
      if (erg.typ === 'anova') return { grund: 'mehrere-gruppen' };
      const e = erg.e as { abhaengig: string; gruppenSpalte: string }, y = e.abhaengig, g = e.gruppenSpalte;
      const ig = idx(g), iy = idx(y), fg = fehlendMenge(spalteNach(g)), fy = fehlendMenge(spalteNach(y));
      if (ig < 0 || iy < 0) return { grund: 'wenig' };
      const m = new Map<string | number, { wert: number; r: number }[]>();
      s.zeilen.forEach((z, r) => {
        const gv = z[ig], v = z[iy];
        if (gv === null || gv === undefined || gv === '' || (typeof gv === 'number' && fg.includes(gv)) || !gueltig(v, fy) || (w && !((w[r] ?? 0) > 0))) return;
        (m.get(gv) ?? m.set(gv, []).get(gv)!).push({ wert: v, r });
      });
      const liste = [...m].sort(([a], [c]) => (typeof a === 'number' && typeof c === 'number' ? a - c : String(a) < String(c) ? -1 : String(a) > String(c) ? 1 : 0));
      if (liste.length !== 2) return { grund: 'mehrere-gruppen' };
      const [A, B] = liste as [[string | number, { wert: number; r: number }[]], [string | number, { wert: number; r: number }[]]];
      return { daten: { karte: 'gruppen', y, g, namen: [gruppenName(g, A[0]), gruppenName(g, B[0])], x: erw(A[1]), z: erw(B[1]) } };
    }
    if (erg?.typ === 'zusammenhang') {
      const e = erg.e as Zusammenhang;
      if ((e.methode ?? 'pearson') !== 'pearson' || e.kontroll?.length) return { grund: 'rangkorr' };
      const ix = idx(e.x), iy = idx(e.y), fx = fehlendMenge(spalteNach(e.x)), fy = fehlendMenge(spalteNach(e.y));
      if (ix < 0 || iy < 0) return { grund: 'wenig' };
      const p: { wert: [number, number]; r: number }[] = [];
      s.zeilen.forEach((z, r) => { const a = z[ix], c = z[iy]; if (gueltig(a, fx) && gueltig(c, fy) && (!w || (w[r] ?? 0) > 0)) p.push({ wert: [a, c], r }); });
      const l = erw(p);
      return { daten: { karte: 'zusammenhang', x: e.x, y: e.y, xs: l.map(a => a[0]), ys: l.map(a => a[1]) } };
    }
    if (erg?.typ === 'vorhersage') {
      const e = erg.e as Vorhersage, zeilen = designZeilen(b, e);
      if (!zeilen) return { grund: 'wenig' };
      const voll: { wert: number[]; r: number }[] = [];
      zeilen.forEach((z, r) => { if (z.every(v => v !== null) && (!w || (w[r] ?? 0) > 0)) voll.push({ wert: z as number[], r }); });
      const l = erw(voll), p = e.praediktoren.length;
      return { daten: { karte: 'vorhersage', ziel: e.ziel, namen: e.praediktoren.map(q => q.name), spalten: Array.from({ length: p }, (_, j) => l.map(z => z[j + 1]!)), y: l.map(z => z[0]!) } };
    }
    if (erg?.typ === 'logistik' || erg?.typ === 'hierreg' || erg?.typ === 'ordreg' || erg?.typ === 'multreg' || erg?.typ === 'zaehlreg' || erg?.typ === 'quantil' || erg?.typ === 'penal') return { grund: erg.typ === 'hierreg' ? 'hier' : 'katmodell' };
    if (erg?.typ === 'verteilung') {
      const spalten: { name: string; werte: number[] }[] = [];
      for (const n of werteVon(b).l1) {
        const sp = spalteNach(n);
        if (!sp || istSetName(n) || sp.art !== 'zahl') continue;
        const i = idx(n), fe = fehlendMenge(sp), p: { wert: number; r: number }[] = [];
        s.zeilen.forEach((z, r) => { const v = z[i]; if (gueltig(v, fe) && (!w || (w[r] ?? 0) > 0)) p.push({ wert: v, r }); });
        const l = erw(p);
        if (l.length >= 2) spalten.push({ name: sp.bezeichnung || sp.name, werte: l });
      }
      return spalten.length ? { daten: { karte: 'verteilung', spalten } } : { grund: 'keine-zahlen' };
    }
  } catch (x) { return { grund: x instanceof GewichtFehler && x.code === 'zu-gross' ? 'zu-gross' : 'wenig' }; }
  return { grund: 'wenig' };
}
