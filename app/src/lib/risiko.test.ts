import { describe, expect, it } from 'vitest';
import { risikomasse, nntAusArr } from './risiko';
import { oddsRatio2x2 } from './effektki';
import { wilson } from './diagnostik';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, M2 Risikomaße aus der Vierfeldertafel. ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md, Nachtrag Punkt 3).
 * Der Bauer darf diese Datei nicht ändern; er baut app/src/lib/risiko.ts, bis sie grün ist.
 * Sollwerte: scripts/welle7-erwartet.R -> testdaten/welle7-erwartet.json (Abschnitt `risiko` und `nnt_altman`; R 4.6.1, DescTools, epiR 3.0.0).
 *
 * API (Modul lib/risiko.ts, reine Funktionen ohne Oberfläche, JS):
 *   risikomasse(tab, opt?) : Risikomasse
 *     tab = [[a, b], [c, d]]: ZEILE 1 = Gruppe/Behandlung, ZEILE 2 = Vergleichsgruppe; SPALTE 1 = Ereignis, Spalte 2 = kein Ereignis (die Person wählt vorher, was Zeile und Ereignis ist).
 *     opt.design   : 'kohorte' (Standard; Kohorte oder Experiment) | 'fallKontrolle' (Fall-Kontroll-Studie: nur das Odds Ratio ist zulässig)
 *     opt.ereignisGut: false (Standard: Ereignis ist unerwünscht, Nutzen = WENIGER Ereignisse in Zeile 1) | true (Ereignis ist erwünscht, Nutzen = MEHR Ereignisse in Zeile 1)
 *     Wirft Error bei negativen oder nicht ganzzahligen Zellen oder wenn eine Zeile leer ist (a + b = 0 oder c + d = 0).
 *   Risikomasse = {
 *     n1, n2                 Zeilensummen (a + b, c + d); nullzelle: true, wenn irgendeine der vier Zellen 0 ist
 *     r1, r2                 Risiko je Zeile a/n1, c/n2 mit Wilson-Intervall ({wert, lo, hi}, wie wilson() in diagnostik.ts); null bei 'fallKontrolle' (Risiken sind dort nicht schätzbar)
 *     rd                     Risikodifferenz r1 - r2 mit Newcombe-Intervall (1998, Methode 10 = Wilson-Hybrid); null bei 'fallKontrolle'
 *     rr                     Relatives Risiko r1/r2 mit Katz-Log-Intervall; null bei 'fallKontrolle' UND bei a = 0 oder c = 0 (nicht schätzbar, keine stille Korrektur)
 *     or                     Odds Ratio mit Woolf-Intervall (= oddsRatio2x2 aus effektki.ts); null bei JEDER Nullzelle (nicht schätzbar)
 *     nnt                    Nnt (siehe unten) aus dem Newcombe-Intervall der RD nach Altman (1998); null bei 'fallKontrolle'
 *   }
 *   nntAusArr(arr, lo, hi) : Nnt     Kern der NNT-Rechnung; arr = absolute Risikoreduktion mit KI [lo, hi], NUTZEN POSITIV (bei ereignisGut = false ist arr = -RD, sonst arr = +RD; das KI wird entsprechend gespiegelt)
 *   Nnt = { wert: number | null, art: 'NNTB' | 'NNTH' | null, intervall: NntIntervall }
 *     wert = 1/|arr| (null bei arr = 0), art = 'NNTB' bei arr > 0 (Nutzen), 'NNTH' bei arr < 0 (Schaden), null bei arr = 0.
 *     NntIntervall = { typ: 'nntb' | 'nnth', von, bis }              KI von arr schließt 0 NICHT ein (lo > 0: nntb; hi < 0: nnth): von = kleinere NNT-Grenze, bis = größere
 *                  | { typ: 'durchUnendlich', nntb, nnth }           KI schließt 0 ein (lo <= 0 <= hi): "NNTB nntb bis ∞ bis NNTH nnth"; nntb = 1/hi, nnth = 1/|lo|; ist hi = 0 bzw. lo = 0, ist der Wert Infinity
 *   Nie ein Intervall mit negativen Zahlen oder "[-25; 8]" ausgeben - die Oberfläche setzt aus diesen Feldern den Text zusammen (übersetzbar).
 * ENTSCHEIDUNGEN des Prüfers (in der Übergabe nennen): (1) Keine Haldane-Korrektur: Nullzelle -> rr/or null, RD und Newcombe gehen immer. (2) ereignisGut ist eine Wahl neben der Rollenwahl
 *   (ohne sie ist NNTB/NNTH nicht bestimmbar). (3) Die NNT wird nicht gerundet (Anzeige entscheidet; Altman zeigt 6,7).
 * TOLERANZ: 1e-9 relativ (geschlossene Formeln, qnorm(,975) = 1,959963984540054 wie R). */

type Z = Record<string, any>;
const E = ERW as unknown as { risiko: Z[]; nnt_altman: Z[] };
const nah = (ist: number | null | undefined, soll: number, was: string, tol = 1e-9) => {
  expect(typeof ist, `${was}: Zahl erwartet`).toBe('number');
  expect(Math.abs((ist as number) - soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const ki = (ist: Z | null, soll: Z, was: string, tol = 1e-9) => {
  expect(ist, `${was} darf nicht null sein`).not.toBeNull();
  nah(ist!.wert, soll.wert, `${was}.wert`, tol); nah(ist!.lo, soll.lo, `${was}.lo`, tol); nah(ist!.hi, soll.hi, `${was}.hi`, tol);
};
const tab = (f: Z) => f.tab as [[number, number], [number, number]];

const nntPruefen = (ist: Z, soll: Z, was: string) => {
  if (soll.wert === null) { expect(ist.wert, `${was}.wert`).toBeNull(); expect(ist.art, `${was}.art`).toBeNull(); }
  else { nah(ist.wert, soll.wert, `${was}.wert`); expect(ist.art, `${was}.art`).toBe(soll.art); }
  expect(ist.intervall.typ, `${was}.intervall.typ`).toBe(soll.intervall.typ);
  if (soll.intervall.typ === 'durchUnendlich') { nah(ist.intervall.nntb, soll.intervall.nntb, `${was}.nntb`); nah(ist.intervall.nnth, soll.intervall.nnth, `${was}.nnth`); }
  else { nah(ist.intervall.von, soll.intervall.von, `${was}.von`); nah(ist.intervall.bis, soll.intervall.bis, `${was}.bis`); }
};

describe('Risikomaße der Vierfeldertafel gegen R (eigene Formeln, DescTools, epiR)', () => {
  it('es gibt Sollwerte für alle Fälle', () => { expect(E.risiko.length).toBe(12); });

  for (const f of E.risiko.filter(x => x.design === 'kohorte')) {
    describe(f.name, () => {
      const m = () => risikomasse(tab(f));
      it('Zeilensummen und Nullzellen-Kennzeichen', () => {
        expect(m().n1).toBe(f.n1); expect(m().n2).toBe(f.n2); expect(m().nullzelle).toBe(f.nullzelle);
      });
      it('Risiko je Zeile mit Wilson-Intervall (= DescTools::BinomCI wilson)', () => {
        ki(m().r1, f.r1, 'r1'); ki(m().r2, f.r2, 'r2');
        const w = wilson(tab(f)[0][0], f.n1); expect([m().r1!.wert, m().r1!.lo, m().r1!.hi]).toEqual([w.wert, w.lo, w.hi]);
      });
      it('Risikodifferenz mit Newcombe-Methode-10-Intervall (= DescTools::BinomDiffCI score; NICHT Wald, NICHT PropCIs::diffscoreci)', () => {
        ki(m().rd, f.rd, 'rd');
        expect(Math.abs(m().rd!.wert - (f.r1.wert - f.r2.wert))).toBeLessThan(1e-12);
        expect(m().rd!.lo).toBeLessThanOrEqual(m().rd!.wert); expect(m().rd!.hi).toBeGreaterThanOrEqual(m().rd!.wert);
      });
      if (f.rr) it('Relatives Risiko mit Katz-Log-Intervall (= epiR RR.strata.wald)', () => ki(m().rr, f.rr, 'rr'));
      else it('Relatives Risiko nicht schätzbar bei a = 0 oder c = 0: null, keine stille Korrektur', () => expect(m().rr).toBeNull());
      if (f.or) it('Odds Ratio mit Woolf-Intervall (= epiR OR.strata.wald = oddsRatio2x2)', () => {
        ki(m().or, f.or, 'or');
        const o = oddsRatio2x2(tab(f))!; expect([m().or!.wert, m().or!.lo, m().or!.hi]).toEqual([o.or, o.lo, o.hi]);
      });
      else it('Odds Ratio nicht schätzbar bei jeder Nullzelle: null', () => expect(m().or).toBeNull());
      it('NNT nach Altman, Ereignis unerwünscht (Standard): Nutzen = weniger Ereignisse in Zeile 1', () => {
        nntPruefen(risikomasse(tab(f)).nnt!, f.nnt_ereignis_schlecht, 'nnt');
        nntPruefen(risikomasse(tab(f), { ereignisGut: false }).nnt!, f.nnt_ereignis_schlecht, 'nnt (ereignisGut false)');
      });
      it('NNT, Ereignis erwünscht: Vorzeichen gespiegelt (NNTB und NNTH tauschen)', () => {
        nntPruefen(risikomasse(tab(f), { ereignisGut: true }).nnt!, f.nnt_ereignis_gut, 'nnt (ereignisGut true)');
      });
    });
  }
});

describe('Fall-Kontroll-Studie: nur das Odds Ratio', () => {
  const f = E.risiko.find(x => x.design === 'fallKontrolle')!;
  it('Risiken, RD, RR und NNT sind null, das Odds Ratio wie R', () => {
    const m = risikomasse(tab(f), { design: 'fallKontrolle' });
    expect(m.r1).toBeNull(); expect(m.r2).toBeNull(); expect(m.rd).toBeNull(); expect(m.rr).toBeNull(); expect(m.nnt).toBeNull();
    ki(m.or, f.or, 'or');
  });
  it('mit Nullzelle: auch das Odds Ratio null (nicht schätzbar), nichts anderes erscheint', () => {
    const m = risikomasse([[0, 25], [6, 19]], { design: 'fallKontrolle' });
    expect(m.or).toBeNull(); expect(m.rd).toBeNull(); expect(m.rr).toBeNull(); expect(m.nnt).toBeNull();
  });
  it('dieselbe Tafel als Kohorte liefert RR, RD und NNT (das Design entscheidet, nicht die Zahlen)', () => {
    const m = risikomasse(tab(f), { design: 'kohorte' });
    expect(m.rr).not.toBeNull(); expect(m.rd).not.toBeNull(); expect(m.nnt).not.toBeNull();
  });
});

describe('NNT-Intervall nach Altman (1998, BMJ 317:1309): bei KI der Risikodifferenz mit 0 geht die NNT durch unendlich', () => {
  const nnt = nntAusArr;
  it('Altman, Beispiel 1: ARR 10 % (5 % bis 15 %): NNT 10, KI 6,7 bis 20', () => {
    const r = nnt(0.10, 0.05, 0.15);
    nah(r.wert, 10, 'wert'); expect(r.art).toBe('NNTB'); expect(r.intervall.typ).toBe('nntb');
    const iv = r.intervall as { von: number; bis: number };
    expect(iv.von).toBeCloseTo(6.7, 1); expect(iv.bis).toBeCloseTo(20, 9);
    nntPruefen(r, E.nnt_altman[0]!.soll, 'altman 1');
  });
  it('Altman, Beispiel 2: ARR 10 % (-5 % bis 25 %): NNTB 10 (NNTH 20 bis ∞ bis NNTB 4) - nie "-20 bis 4"', () => {
    const r = nnt(0.10, -0.05, 0.25);
    nah(r.wert, 10, 'wert'); expect(r.art).toBe('NNTB'); expect(r.intervall.typ).toBe('durchUnendlich');
    const iv = r.intervall as { nntb: number; nnth: number };
    nah(iv.nntb, 4, 'nntb'); nah(iv.nnth, 20, 'nnth');
    nntPruefen(r, E.nnt_altman[1]!.soll, 'altman 2');
  });
  it('Altman nach Tramèr et al.: ARR -0,08 (-0,27 bis 0,11): NNTH 12,5 (NNTH 3,7 bis ∞ bis NNTB 9,1)', () => {
    const r = nnt(-0.08, -0.27, 0.11);
    nah(r.wert, 12.5, 'wert'); expect(r.art).toBe('NNTH'); expect(r.intervall.typ).toBe('durchUnendlich');
    const iv = r.intervall as { nntb: number; nnth: number };
    expect(iv.nntb).toBeCloseTo(9.1, 1); expect(iv.nnth).toBeCloseTo(3.7, 1);
    nntPruefen(r, E.nnt_altman[2]!.soll, 'tramer');
  });
  it('KI ganz im Schaden: NNTH von … bis … (Beträge, kleinere Grenze zuerst)', () => {
    const r = nnt(-0.10, -0.15, -0.05);
    expect(r.art).toBe('NNTH'); expect(r.intervall.typ).toBe('nnth');
    const iv = r.intervall as { von: number; bis: number };
    expect(iv.von).toBeCloseTo(1 / 0.15, 12); expect(iv.bis).toBeCloseTo(20, 12); expect(iv.von).toBeLessThan(iv.bis);
  });
  it('Grenze genau 0 zählt als „schließt 0 ein“: durch unendlich, die offene Seite ist Infinity', () => {
    const r = nnt(0.10, 0, 0.20);
    expect(r.intervall.typ).toBe('durchUnendlich');
    const iv = r.intervall as { nntb: number; nnth: number };
    nah(iv.nntb, 5, 'nntb'); expect(iv.nnth).toBe(Infinity);
  });
  it('ARR genau 0: keine NNT (wert und art null), Intervall geht durch unendlich', () => {
    const r = nnt(0, -0.1, 0.1);
    expect(r.wert).toBeNull(); expect(r.art).toBeNull(); expect(r.intervall.typ).toBe('durchUnendlich');
  });
  it('aus der Tafel: KI der RD schließt 0 ein -> durchUnendlich; schließt 0 aus -> nntb bzw. nnth', () => {
    const c = E.risiko.find(x => x.name === 'c_rd_ki_mit_null')!; const b = E.risiko.find(x => x.name === 'b_rd_ki_ohne_null')!;
    expect(risikomasse(tab(c)).nnt!.intervall.typ).toBe('durchUnendlich');
    expect(risikomasse(tab(b)).nnt!.intervall.typ).toBe('nnth');                      // mehr Ereignisse in Zeile 1, Ereignis unerwünscht: Schaden
    expect(risikomasse(tab(b), { ereignisGut: true }).nnt!.intervall.typ).toBe('nntb');
  });
  it('RD = 0 aus der Tafel (10 von 50 gegen 10 von 50): wert null, durchUnendlich', () => {
    const m = risikomasse([[10, 40], [10, 40]]);
    expect(m.nnt!.wert).toBeNull(); expect(m.nnt!.art).toBeNull(); expect(m.nnt!.intervall.typ).toBe('durchUnendlich');
  });
});

describe('Eingabeprüfung', () => {
  it('wirft bei leerer Zeile, negativen und nicht ganzzahligen Zellen', () => {
    expect(() => risikomasse([[0, 0], [3, 4]])).toThrow();
    expect(() => risikomasse([[3, 4], [0, 0]])).toThrow();
    expect(() => risikomasse([[-1, 4], [3, 4]])).toThrow();
    expect(() => risikomasse([[1.5, 4], [3, 4]])).toThrow();
  });
});
