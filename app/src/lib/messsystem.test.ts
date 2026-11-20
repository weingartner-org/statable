import { describe, expect, it } from 'vitest';
import { messsystem, urteilRR, type Messsystem, type MessFehler } from './messsystem';

/* Sollwerte: Rscript am Mac (R 4.6.1, SixSigma 2.0): ss.rr(var, part, appr, alphaLim = 0.25). Daten: "Teil,Prüfer,Wert;…". D1: acht Teile, drei Prüfer, zwei Wiederholungen (Wechselwirkung p = 0,039, im Modell); D2: fünf Teile (Wechselwirkung p = 0,281, weggelassen). */
const D1 = '1,A,10.02;1,A,10.12;1,B,10.15;1,B,10.44;1,C,10.04;1,C,9.9;2,A,10.96;2,A,10.99;2,B,11.12;2,B,11.01;2,C,10.98;2,C,10.85;3,A,11.43;3,A,11.23;3,B,11.78;3,B,11.64;3,C,11.4;3,C,11.51;4,A,9.8;4,A,9.77;4,B,9.96;4,B,9.94;4,C,9.61;4,C,9.36;5,A,10.47;5,A,10.39;5,B,10.53;5,B,10.37;5,C,10.24;5,C,10.35;6,A,12.16;6,A,11.99;6,B,12.2;6,B,12.14;6,C,11.73;6,C,11.85;7,A,11.05;7,A,11.09;7,B,11.38;7,B,11.34;7,C,10.98;7,C,10.97;8,A,9.28;8,A,9.27;8,B,9.27;8,B,9.27;8,C,9.14;8,C,9.19';
const D2 = '1,A,4.83;1,A,5.28;1,B,4.85;1,B,5.11;1,C,5.29;1,C,4.83;2,A,6.01;2,A,5.97;2,B,6.14;2,B,6.23;2,C,6.3;2,C,5.89;3,A,7.08;3,A,7.27;3,B,7.19;3,B,7.37;3,C,7.13;3,C,6.81;4,A,5.85;4,A,5.75;4,B,6.08;4,B,6.09;4,C,6.04;4,C,5.89;5,A,6.76;5,A,6.54;5,B,6.98;5,B,7;5,C,6.42;5,C,6.38';
const lies = (s: string) => { const z = s.split(';').map(r => r.split(',')); return { t: z.map(r => r[0]!), o: z.map(r => r[1]!), y: z.map(r => Number(r[2])) }; };
const g = (r: Messsystem | MessFehler): Messsystem => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);
const komp = (r: Messsystem, n: string) => r.komp.find(k => k.name === n)!;

describe('Messsystemanalyse gegen R SixSigma', () => {
  it('D1 mit Wechselwirkung: Varianzkomponenten, Beiträge, Studienstreuung, ndc', () => {
    const d = lies(D1), r = g(messsystem(d.t, d.o, d.y));
    expect(r.mitWechsel).toBe(true); expect(r.teile).toBe(8); expect(r.pruefende).toBe(3); expect(r.wdh).toBe(2);
    nah(komp(r, 'rr').var, 0.031015625); nah(komp(r, 'wiederhol').var, 0.007833333333); nah(komp(r, 'vergleich').var, 0.023182291667); nah(komp(r, 'pruefende').var, 0.018264434524);
    nah(komp(r, 'wechsel').var, 0.004917857143); nah(komp(r, 'teile').var, 0.868825595238); nah(komp(r, 'gesamt').var, 0.899841220238);
    nah(komp(r, 'rr').beitrag, 3.45, 2e-3); nah(komp(r, 'rr').studie, 18.57, 1e-3); nah(komp(r, 'teile').studie, 98.26, 1e-3); nah(komp(r, 'gesamt').sd, 0.94859961008);
    expect(r.ndc).toBe(7); nah(r.pWechsel, 0.03855, 2e-3);
  });
  it('D2 ohne Wechselwirkung (p > 0,25): in den Fehler eingerechnet', () => {
    const d = lies(D2), r = g(messsystem(d.t, d.o, d.y));
    expect(r.mitWechsel).toBe(false); expect(r.komp.some(k => k.name === 'wechsel')).toBe(false);
    nah(komp(r, 'rr').var, 0.043130289855); nah(komp(r, 'wiederhol').var, 0.034472173913); nah(komp(r, 'pruefende').var, 0.008658115942); nah(komp(r, 'teile').var, 0.632870471014);
    nah(komp(r, 'rr').studie, 25.26, 1e-3); nah(komp(r, 'wiederhol').studie, 22.58, 1e-3); expect(r.ndc).toBe(5);
  });
  it('Fehler: unausgewogen, keine Wiederholung, zu wenig', () => {
    const d = lies(D1);
    expect(messsystem(d.t.slice(1), d.o.slice(1), d.y.slice(1))).toEqual({ fehler: 'unausgewogen' });
    expect(messsystem(['1', '1', '2', '2'].concat(['3', '3']), ['A', 'B', 'A', 'B', 'A', 'B'], [1, 2, 3, 4, 5, 6])).toEqual({ fehler: 'wenig-wiederholungen' });
    expect(messsystem(['1'], ['A'], [1])).toEqual({ fehler: 'zu-wenig' });
  });
  it('Urteil', () => { expect(urteilRR(5)).toBe('gut'); expect(urteilRR(18.6)).toBe('bedingt'); expect(urteilRR(40)).toBe('nicht'); });
});
