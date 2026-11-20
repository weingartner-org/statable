import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import { konsensAnlegen, type Entscheidung } from './konsens';
import { segmentUebereinstimmung } from './segmentuebereinstimmung';

/* Stufe 5, Paket 5B, Konsens (docs/erheben/FACHBLATT-STUFE-5.md, "Konsens-Ablauf" und Schnittstelle konsensAnlegen).
 * Sollwerte: scripts/qualauswertung-erwartet.R (Entscheidungen umgesetzt wie im Fachblatt: a/b/beide/keiner; übereinstimmende Einheiten von A; Rest offen).
 * Absichtlich ROT, bis lib/konsens.ts gebaut ist.
 * Opus-Entscheide: Regel ohne vorhandene Regel = nur "JJJJ-MM-TT: text", sonst vorhandene + "\n" + neue Zeile; unbekannte Abweichungs-id wird still übergangen;
 * protokoll: ein Eintrag was 'konsens' je Aufruf, ein Eintrag was 'regel' je übernommener Regel.
 * Offen (nicht abgefragt): ob die Kopie eines Segments mit zwei Codes EIN neues Segment mit zwei Kodierungen oder zwei Segmente ergibt (verglichen werden Tupel Dokument/Start/Ende/Code). */

const ordner = new URL('./testdaten/', import.meta.url);
const lies = (p: string) => JSON.parse(readFileSync(new URL(p, ordner), 'utf8'));
const laden = (n: string): QualProjekt => pruefeQualProjekt(lies(`qualauswertung/${n}.json`));
interface EKonsens {
  name: string; projekt: string; a: string; b: string; codes: string[]; schwelle: number; kname: string; jetzt: number; entscheidungen: Entscheidung[];
  erwartet: {
    segmente: { dokument: string; start: number; ende: number; code: string }[]; offen: string[];
    regeln: Record<string, { vorher: string | null; zeilen: string[]; regel_nachher: string }>; protokoll: { konsens: number; regel: number };
    nachher_a: { einheiten: number; uebereinstimmend: number; prozent: number | null; kappaBP: number | null };
    nachher_b: { einheiten: number; uebereinstimmend: number; prozent: number | null; kappaBP: number | null };
  };
  abweichungen_vorher: { id: string; art: string }[];
}
const E = lies('qualauswertung-erwartet.json') as { konsens: EKonsens[] };
const nah = (a: number | null | undefined, b: number | null, tol = 1e-9) => {
  if (b === null) { expect(a ?? null).toBeNull(); return; }
  expect(a, 'Wert fehlt').toBeTypeOf('number');
  expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
const tupel = (t: { dokument: string; start: number; ende: number; code: string }) => `${t.dokument}|${t.start}|${t.ende}|${t.code}`;
const run = (f: EKonsens, q: QualProjekt) => konsensAnlegen(q, { a: f.a, b: f.b, codes: f.codes, schwelle: f.schwelle, entscheidungen: f.entscheidungen, name: f.kname, jetzt: f.jetzt });
const kodierungenVon = (q: QualProjekt, person: string) => q.kodierungen.filter(k => k.kodierende === person).map(k => {
  const s = q.segmente.find(x => x.id === k.segment)!;
  return { dokument: s.dokument, start: s.start, ende: s.ende, code: k.code };
});

describe('konsensAnlegen gegen R', () => {
  for (const f of E.konsens) {
    describe(f.name, () => {
      const q = laden(f.projekt), vorher = JSON.stringify(q), r = run(f, q);
      it('neue Person mit dem gewünschten Namen; A und B bleiben, Kennung ist neu', () => {
        const p = r.projekt.kodierende.find(k => k.id === r.konsens);
        expect(p, 'Konsens-Person fehlt').toBeTruthy(); expect(p!.name).toBe(f.kname);
        expect(q.kodierende.some(k => k.id === r.konsens), 'Kennung darf nicht schon vergeben sein').toBe(false);
        expect(r.projekt.kodierende.length).toBe(q.kodierende.length + 1);
      });
      it('Segmente und Kodierungen des Konsenses (Dokument, Start, Ende, Code) wie in R', () => {
        expect(kodierungenVon(r.projekt, r.konsens).map(tupel).sort()).toEqual(f.erwartet.segmente.map(tupel).sort());
      });
      it('offene Abweichungen (ohne Entscheidung) in der Reihenfolge der Abweichungsliste', () => {
        expect(r.offen).toEqual(f.erwartet.offen);
      });
      it('Eingabe unverändert; A und B im Ergebnis unverändert (Segmente, Kodierungen, Codes ohne Regel); Verweise im Ergebnis stimmig', () => {
        expect(JSON.stringify(q), 'Eingabeprojekt darf sich nicht ändern').toBe(vorher);
        for (const person of [f.a, f.b]) expect(r.projekt.kodierungen.filter(k => k.kodierende === person)).toEqual(q.kodierungen.filter(k => k.kodierende === person));
        for (const k of q.kodierungen) expect(r.projekt.kodierungen.some(x => x.id === k.id), `Kodierung ${k.id} bleibt`).toBe(true);
        for (const s of q.segmente) expect(r.projekt.segmente.find(x => x.id === s.id), `Segment ${s.id} bleibt`).toEqual(s);
        expect(() => pruefeQualProjekt(JSON.parse(JSON.stringify(r.projekt))), 'Ergebnis ist ein gültiges QualProjekt').not.toThrow();
        // neue Segmentkennungen kollidieren nicht
        const ids = r.projekt.segmente.map(s => s.id); expect(new Set(ids).size).toBe(ids.length);
        const kids = r.projekt.kodierungen.map(k => k.id); expect(new Set(kids).size).toBe(kids.length);
      });
      it('Kodierregeln: neue Zeile "JJJJ-MM-TT: Text" mit dem Datum aus `jetzt` in UTC (23:30 UTC am 9.11. ist in Mitteleuropa schon der 10.11.); Protokoll wächst', () => {
        for (const c of q.codes) {
          const neu = r.projekt.codes.find(x => x.id === c.id)!, e = f.erwartet.regeln[c.id];
          if (!e) { expect(neu.regel, `Code ${c.id} ohne Regel bleibt gleich`).toBe(c.regel); continue; }
          // ohne vorhandene Regel nur die Zeilen; mit vorhandener: vorhandene + "\n" + neue Zeile(n), in der Reihenfolge der Entscheidungen
          expect(neu.regel, `Regel von ${c.id}`).toBe(e.regel_nachher);
        }
      });
      it('Protokoll: genau ein Eintrag "konsens" je Aufruf und ein Eintrag "regel" je übernommener Regel', () => {
        const neu = r.projekt.protokoll.slice(q.protokoll.length);
        expect(r.projekt.protokoll.length).toBe(q.protokoll.length + f.erwartet.protokoll.konsens + f.erwartet.protokoll.regel);
        expect(neu.filter(p => p.was === 'konsens').length).toBe(f.erwartet.protokoll.konsens);
        expect(neu.filter(p => p.was === 'regel').length).toBe(f.erwartet.protokoll.regel);
      });
      it('"Nachher": A gegen Konsens und B gegen Konsens nach derselben Schwelle wie in R (kein Gütemaß, zeigt wie viel sich geändert hat)', () => {
        for (const [wer, soll] of [[f.a, f.erwartet.nachher_a], [f.b, f.erwartet.nachher_b]] as const) {
          const n = segmentUebereinstimmung(r.projekt, { a: wer, b: r.konsens, codes: f.codes, schwelle: f.schwelle });
          expect(n.einheiten).toBe(soll.einheiten); expect(n.uebereinstimmend).toBe(soll.uebereinstimmend); nah(n.prozent, soll.prozent); nah(n.kappaBP, soll.kappaBP);
        }
      });
    });
  }
});

describe('Einzelne Zusagen aus dem Fachblatt', () => {
  const alle = ['c1', 'c2', 'c3', 'c4'];
  const q = laden('segmente');
  const lauf = (entscheidungen: Entscheidung[], schwelle = 0.9) => konsensAnlegen(q, { a: 'p-a', b: 'p-b', codes: alle, schwelle, entscheidungen, name: 'Konsens A/B', jetzt: 1794267000000 });
  const ent = (abweichung: string, wahl: Entscheidung['wahl']): Entscheidung => ({ abweichung, wahl, begruendung: 'weil' });
  const stellen = (r: ReturnType<typeof lauf>, dok: string) => kodierungenVon(r.projekt, r.konsens).filter(t => t.dokument === dok).map(t => `${t.start}-${t.ende}:${t.code}`).sort();
  it('a übernimmt die Einheiten von A der Gruppe, b die von B, beide alle, keiner nichts (d-gemischt: A c1 [0,30), B c2 [0,30), B c1 [20,50))', () => {
    expect(stellen(lauf([ent('d-gemischt:0:50', 'a')]), 'd-gemischt')).toEqual(['0-30:c1']);
    expect(stellen(lauf([ent('d-gemischt:0:50', 'b')]), 'd-gemischt')).toEqual(['0-30:c2', '20-50:c1']);
    expect(stellen(lauf([ent('d-gemischt:0:50', 'beide')]), 'd-gemischt')).toEqual(['0-30:c1', '0-30:c2', '20-50:c1']);
    expect(stellen(lauf([ent('d-gemischt:0:50', 'keiner')]), 'd-gemischt')).toEqual([]);
  });
  it('Übereinstimmende Einheiten kommen immer aus A, auch ohne jede Entscheidung (d-schwelle: Segment von A [0,90))', () => {
    const r = lauf([]);
    expect(stellen(r, 'd-schwelle')).toEqual(['0-90:c1']);
    expect(r.offen.length).toBe(14);
  });
  it('Regel für einen Code, der in der Abweichung gar nicht vorkommt, wird trotzdem an diesen Code gehängt', () => {
    const r = lauf([{ abweichung: 'd-knapp:0:1000', wahl: 'a', begruendung: 'x', regel: { code: 'c3', text: 'Geld nur mit Betrag.' } }]);
    expect(r.projekt.codes.find(c => c.id === 'c3')!.regel).toBe('2026-11-09: Geld nur mit Betrag.');
    expect(r.projekt.codes.find(c => c.id === 'c1')!.regel).toBe('Bestehende Regel.');
  });
  it('Zweimal anlegen mit demselben Eingabeprojekt gibt zwei unabhängige Ergebnisse (reine Funktion)', () => {
    const r1 = lauf([ent('d-knapp:0:1000', 'a')]), r2 = lauf([ent('d-knapp:0:1000', 'a')]);
    expect(r1.projekt.kodierende.length).toBe(q.kodierende.length + 1); expect(r2.projekt.kodierende.length).toBe(q.kodierende.length + 1);
    expect(kodierungenVon(r1.projekt, r1.konsens)).toEqual(kodierungenVon(r2.projekt, r2.konsens));
  });
});
