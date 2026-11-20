import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import { codeUeberschneidungen, dokumentUebereinstimmung, fallCodeMatrix, segmentlaengen, type Personen } from './qualauswertung';

/* Stufe 5, Paket 5B (docs/erheben/FACHBLATT-STUFE-5.md, Abschnitt "5B: Rechnen" und "Schnittstellen"): Fall-Code-Matrix, Code-Überschneidungen,
 * Segmentlängen, Übereinstimmung auf Dokumentebene. Sollwerte: scripts/qualauswertung-erwartet.R (R 4.6.1; Dokumentebene mit irrCAC UNGERUNDET, Cohen mit irr::kappa2),
 * Prüfprojekte: testdaten/qualauswertung/*.json, Sollwerte: testdaten/qualauswertung-erwartet.json. Die Tests sind absichtlich ROT, bis lib/qualauswertung.ts gebaut ist.
 * Offen (Fachblatt lässt es offen, darum NICHT abgefragt): Reihenfolge der Zeilen (die Tests suchen Zeilen über id bzw. Dokumentname), id der Zeile "ohne Fall",
 * Obercodes mit Untercodes zusammenfassen (kein Feld in MatrixOptionen), Reihenfolge der Einheiten in `liste`. */

const ordner = new URL('./testdaten/', import.meta.url);
const lies = (p: string) => JSON.parse(readFileSync(new URL(p, ordner), 'utf8'));
const projekte: Record<string, QualProjekt> = {
  segmente: pruefeQualProjekt(lies('qualauswertung/segmente.json')),
  matrix: pruefeQualProjekt(lies('qualauswertung/matrix.json')),
  doppelt: pruefeQualProjekt(lies('qualauswertung/doppelt.json')),
  ueberschneidung: pruefeQualProjekt(lies('qualauswertung/ueberschneidung.json')),
};
const nah = (a: number | null | undefined, b: number | null, tol = 1e-9) => {
  if (b === null) { expect(a ?? null).toBeNull(); return; }
  expect(a, 'Wert fehlt').toBeTypeOf('number');
  expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
type Koef = { wert: number | null; se: number | null; unten: number | null; oben: number | null };
const koef = (e: Koef | null | undefined, s: Koef) => {
  expect(e, 'Koef fehlt').toBeTruthy();
  nah(e!.wert, s.wert, 1e-9); nah(e!.se, s.se, 1e-8); nah(e!.unten, s.unten, 1e-8); nah(e!.oben, s.oben, 1e-8);
};
const personen = (k: 'alle' | string[]): Personen => (k === 'alle' ? 'alle' : k);

interface EMatrix {
  name: string; projekt: string; art: '01' | 'anzahl' | 'stufe'; zeilen_art: 'faelle' | 'dokumente'; kodierende: 'alle' | string[]; codes: string[];
  stufen?: Record<string, number>; zeilen: { id: string; name: string; art: 'fall' | 'ohne' | 'dokument' }[];
  werte: (number | null)[][]; uneindeutig: string[];
}
interface EUeb { name: string; projekt: string; kodierende: 'alle' | string[]; codes: string[]; erwartet: number[][] }
interface ELaenge { mittel: number; median: number; min: number; max: number }
interface ELaengen { name: string; projekt: string; kodierende: 'alle' | string[]; codes: string[]; erwartet: { code: string; n: number; zeichen: ELaenge | null; woerter: ELaenge | null }[] }
interface EDok {
  name: string; projekt: string; a: string; b: string; codes: string[]; dokumente?: string[] | null; n_zeilen: number;
  ergebnis: { n_einheiten: number; alles_gleich: boolean; prozent_wert?: number; prozent?: Koef; cohen?: number; bp?: Koef; alpha?: Koef; ac1?: Koef };
  jeCode: { code: string; beide: number; nurA: number; nurB: number; keiner: number }[];
}
const E = lies('qualauswertung-erwartet.json') as { matrix: EMatrix[]; ueberschneidung: EUeb[]; laengen: ELaengen[]; dokument: EDok[] };

describe('Fall-Code-Matrix gegen R', () => {
  for (const f of E.matrix) {
    it(f.name, () => {
      const q = projekte[f.projekt]!, vorher = JSON.stringify(q);
      const m = fallCodeMatrix(q, { art: f.art, zeilen: f.zeilen_art, kodierende: personen(f.kodierende), codes: f.codes, ...(f.stufen ? { stufen: f.stufen } : {}) });
      expect(JSON.stringify(q), 'Eingabe darf sich nicht ändern').toBe(vorher);
      expect(m.spalten.map(s => s.code), 'Spalten in der Reihenfolge der Auswahl').toEqual(f.codes);
      expect(m.zeilen.length, 'Zahl der Zeilen').toBe(f.zeilen.length);
      expect(m.werte.length).toBe(f.zeilen.length);
      // Reihenfolge (Opus): Fälle in Modellreihenfolge, danach Dokumente ohne Fall; id der Zeile ohne Fall = "dok:<dokument-id>", name = Dokumentname
      expect(m.zeilen.map(z => z.id)).toEqual(f.zeilen.map(z => z.id));
      expect(m.zeilen.map(z => z.name)).toEqual(f.zeilen.map(z => z.name));
      const ix = f.zeilen.map(z => m.zeilen.findIndex(x => x.id === z.id));
      expect(ix.every(i => i >= 0), `alle erwarteten Zeilen gefunden: ${JSON.stringify(f.zeilen.map(z => z.id))}`).toBe(true);
      expect(new Set(ix).size).toBe(ix.length);
      f.zeilen.forEach((z, i) => {
        const w = m.werte[ix[i]!]!;
        expect(w.length, `Zeile ${z.id}`).toBe(f.codes.length);
        w.forEach((v, j) => nah(v, f.werte[i]![j]!));
      });
      // uneindeutig: Zeilen-ids (Fälle bzw. Dokumente)
      expect([...m.uneindeutig].sort()).toEqual([...f.uneindeutig].sort());
    });
  }
  it('Einstufung ergibt genau eine Spalte; "fehlend" ist null und nicht 0', () => {
    const f = E.matrix.find(x => x.art === 'stufe' && x.kodierende === 'alle' && x.zeilen_art === 'faelle')!;
    const m = fallCodeMatrix(projekte.matrix!, { art: 'stufe', zeilen: 'faelle', kodierende: 'alle', codes: f.codes, stufen: f.stufen! });
    expect(m.spalten.length).toBe(1);
    expect(m.werte.flat().filter(v => v === null).length).toBe(f.werte.flat().filter(v => v === null).length);
    expect(m.werte.flat()).not.toContain(0);
  });
  it('Obercode zählt nur seine eigenen Kodierungen: Kodierungen der Untercodes zählen beim Obercode NICHT mit (außer bei art "stufe")', () => {
    for (const art of ['01', 'anzahl'] as const) {
      const m = fallCodeMatrix(projekte.matrix!, { art, zeilen: 'faelle', kodierende: 'alle', codes: ['c-bel', 'c-bel-h'] });
      expect(m.werte.map(z => z[0]), `Obercode (${art})`).toEqual(m.werte.map(() => 0));
      expect(m.werte.map(z => z[1]).some(v => (v ?? 0) > 0), 'Untercode "hoch" selbst wird gezählt').toBe(true);
    }
    const s = fallCodeMatrix(projekte.matrix!, { art: 'stufe', zeilen: 'faelle', kodierende: 'alle', codes: ['c-bel'], stufen: { 'c-bel-n': 1, 'c-bel-m': 2, 'c-bel-h': 3 } });
    expect(s.werte.flat().some(v => v !== null)).toBe(true);
  });
  it('Zeile ohne Fall: id "dok:<dokument-id>", name = Dokumentname (das "ohne Fall:" setzt die Oberfläche); Fälle zuerst, Reihenfolge wie im Modell', () => {
    const m = fallCodeMatrix(projekte.matrix!, { art: '01', zeilen: 'faelle', kodierende: 'alle', codes: ['c-geld'] });
    expect(m.zeilen.map(z => z.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'dok:d5']);
    expect(m.zeilen[4]!.name).toBe('Zusatztext ohne Fall');
    expect(m.werte[4]).toEqual([1]);
  });
  it('0/1 hat nie null; ein Fall ohne Dokument steht mit 0 in der Matrix (0 heißt: nicht kodiert)', () => {
    const m = fallCodeMatrix(projekte.matrix!, { art: '01', zeilen: 'faelle', kodierende: 'alle', codes: ['c-zeit', 'c-geld'] });
    expect(m.werte.flat().every(v => v === 0 || v === 1)).toBe(true);
    const i = m.zeilen.findIndex(z => z.id === 'f4');
    expect(m.werte[i]).toEqual([0, 0]);
  });
});

describe('Code-Überschneidungen gegen R (Paare überlappender Segmente, Diagonale = Zahl der Segmente)', () => {
  for (const f of E.ueberschneidung) {
    it(f.name, () => {
      const q = projekte[f.projekt]!, vorher = JSON.stringify(q);
      const m = codeUeberschneidungen(q, { kodierende: personen(f.kodierende), codes: f.codes });
      expect(JSON.stringify(q)).toBe(vorher);
      expect(m).toEqual(f.erwartet);
      for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) expect(m[i]![j], `symmetrisch ${i}/${j}`).toBe(m[j]![i]);
    });
  }
  it('Paare nur innerhalb derselben Person; ungeordnetes Paar zählt einmal je Zelle; s = t erlaubt: zwei überlappende Segmente mit beiden Codes ergeben 1 + 1 + 1 = 3, Diagonale = Einheiten', () => {
    const q = projekte.ueberschneidung!;
    expect(codeUeberschneidungen(q, { kodierende: ['p-a'], codes: ['c1', 'c2'] })).toEqual([[2, 3], [3, 2]]);
    // alle: B hat c1 überlappend mit A (zählt NICHT, andere Person) und c2 in einem anderen Dokument
    expect(codeUeberschneidungen(q, { kodierende: 'alle', codes: ['c1', 'c2'] })).toEqual([[3, 3], [3, 3]]);
  });
  it('Ein Segment mit zwei Codes zählt als Überschneidung 1 (matrix, nur A: Zeitdruck/Geld)', () => {
    // d1: A kodiert "Zeitdruck. Das Geld reicht" mit beiden Codes und überlappt außerdem "unter Zeitdruck" (Zeitdruck) und "Das Geld reicht kaum." (Geld)
    const f = E.ueberschneidung.find(x => x.name === 'matrix nur A')!;
    const m = codeUeberschneidungen(projekte.matrix!, { kodierende: ['p-a'], codes: f.codes });
    expect(m[0]![1]).toBeGreaterThanOrEqual(1);
    expect(m[0]![1]).toBe(f.erwartet[0]![1]);
  });
});

describe('Segmentlängen gegen R (Zeichen in Codepoints, Wörter an Leerraum)', () => {
  for (const f of E.laengen) {
    it(f.name, () => {
      const q = projekte[f.projekt]!;
      const r = segmentlaengen(q, { kodierende: personen(f.kodierende), codes: f.codes });
      expect(r.map(x => x.code)).toEqual(f.codes);
      f.erwartet.forEach((e, i) => {
        const x = r[i]!;
        expect(x.n, `n von ${e.code}`).toBe(e.n);
        for (const art of ['zeichen', 'woerter'] as const) {
          const s = e[art], t = x[art];
          if (s === null) { expect(t, `${art} ohne Segmente`).toBeNull(); continue; }
          expect(t, `${art} von ${e.code}`).toBeTruthy();
          nah(t!.mittel, s.mittel); nah(t!.median, s.median); nah(t!.min, s.min); nah(t!.max, s.max);
        }
      });
    });
  }
  it('Emoji zählen als ein Zeichen: "\u{1F600}\u{1F44D} Welt" hat 7 Zeichen und 2 Wörter (nicht 9 UTF-16-Einheiten)', () => {
    // c3 hat in segmente nur dieses eine Segment bei A und das Geld-Segment in d-kette (20 Zeichen) -> Mittel (7 + 20) / 2
    const r = segmentlaengen(projekte.segmente!, { kodierende: ['p-a'], codes: ['c3'] })[0]!;
    expect(r.n).toBe(2); expect(r.zeichen!.min).toBe(7); expect(r.zeichen!.max).toBe(20); nah(r.zeichen!.mittel, 13.5);
    expect(r.woerter!.min).toBe(2);
  });
  it('\r\n zählt als zwei Zeichen: das A-Segment in d-crlf hat 17 Zeichen (Positionen), die Kennwerte für c1 stehen in R', () => {
    const q = projekte.segmente!, s = q.segmente.find(x => x.dokument === 'd-crlf' && q.kodierungen.some(k => k.segment === x.id && k.kodierende === 'p-a'))!;
    expect(s.ende - s.start).toBe(17);
    const r = segmentlaengen(q, { kodierende: ['p-a'], codes: ['c1'] })[0]!;
    expect(r.zeichen!.min).toBeLessThanOrEqual(17); expect(r.woerter!.min).toBeLessThanOrEqual(3);
  });
  it('Code ohne Segmente: n = 0 und keine Kennwerte (null)', () => {
    const r = segmentlaengen(projekte.segmente!, { kodierende: ['p-c'], codes: ['c1'] })[0]!;
    expect(r.n).toBe(0); expect(r.zeichen).toBeNull(); expect(r.woerter).toBeNull();
  });
});

describe('Übereinstimmung auf Dokumentebene gegen R (Einheit = Dokument x Code, Wert 0/1; irrCAC ungerundet)', () => {
  for (const f of E.dokument) {
    it(f.name, () => {
      const q = projekte[f.projekt]!, vorher = JSON.stringify(q);
      const r = dokumentUebereinstimmung(q, { a: f.a, b: f.b, codes: f.codes, ...(f.dokumente ? { dokumente: f.dokumente } : {}) });
      expect(JSON.stringify(q)).toBe(vorher);
      const e = r.ergebnis, s = f.ergebnis;
      expect(e.nEinheiten, 'Einheiten = Dokumente x Codes').toBe(f.n_zeilen);
      expect(e.nNurEine).toBe(0);
      expect(e.nKodierende).toBe(2);
      expect(e.allesGleich).toBe(s.alles_gleich);
      expect(e.hauptwert).toBe('cohen');
      if (s.alles_gleich) { nah(e.prozent.wert, 1); expect(e.cohen).toBeNull(); expect(e.bp.wert).toBeNull(); expect(e.alpha.wert).toBeNull(); expect(e.ac1.wert, 'AC1 bei alles gleich: null wie bp').toBeNull(); }
      else {
        koef(e.prozent, s.prozent!); nah(e.cohen, s.cohen!, 1e-9); expect(e.fleiss, 'bei 2 Kodierenden nicht ausgegeben').toBeNull();
        koef(e.bp, s.bp!); koef(e.alpha, s.alpha!); koef(e.ac1, s.ac1!);
      }
      expect(r.jeCode.map(x => x.code)).toEqual(f.codes);
      f.jeCode.forEach((x, i) => expect(r.jeCode[i], `Vierfeldertafel ${x.code}`).toMatchObject({ code: x.code, beide: x.beide, nurA: x.nurA, nurB: x.nurB, keiner: x.keiner }));
      // Vierfeldertafel summiert je Code zur Zahl der Dokumente
      for (const x of r.jeCode) expect(x.beide + x.nurA + x.nurB + x.keiner).toBe(f.n_zeilen / f.codes.length);
    });
  }
  it('Person ohne Segmente (C): alles 0 bei C; die Vierfeldertafel hat nur "nur A" und "keiner"', () => {
    const r = dokumentUebereinstimmung(projekte.segmente!, { a: 'p-a', b: 'p-c', codes: ['c1', 'c2', 'c3', 'c4'] });
    for (const x of r.jeCode) { expect(x.beide).toBe(0); expect(x.nurB).toBe(0); }
  });
});
