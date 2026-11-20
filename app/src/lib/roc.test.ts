import { describe, it, expect } from 'vitest';
import { nodeEngine } from './testengine';
import { rocBefehl } from './verfahren';
import { aucAus, rocKurve } from './roc';

/* Referenz R (pROC 1.x): roc(d, s, levels = c("nein", "ja"), direction = "<"); auc(); ci.auc(method = "delong"); sqrt(var(r, method = "delong")). */
async function lauf(zeilen: string) {
  const e = await nodeEngine();
  e.run('NEW FILE.\nDATA LIST LIST /score (F8.0) diag (A8).\nBEGIN DATA\n' + zeilen + '\nEND DATA.\n');
  return aucAus(e.run(rocBefehl('score', 'diag', 'ja')));
}

describe('AUC aus PSPP ROC', () => {
  it('klein (n = 10): Fläche .80 wie R; obere Grenze über 1 wird bei 1 begrenzt, DeLong in R: .4964 bis 1', async () => {
    const a = (await lauf('3 ja\n5 ja\n7 ja\n8 ja\n9 ja\n2 nein\n4 nein\n5 nein\n6 nein\n3 nein'))!;
    expect(a.auc).toBeCloseTo(0.8, 10);
    expect(a.se).toBeCloseTo(0.149, 3);       // R DeLong: 0.1549
    expect(a.lo).toBeCloseTo(0.8 - 1.959964 * 0.14895, 3);   // R DeLong: 0.4964 (PSPP selbst nennt .555: nur 90 % breit)
    expect(a.hi).toBe(1); expect(a.begrenzt).toBe(true);
  });
  it('n = 60 (20 positiv, 40 negativ, set.seed(7)): Fläche .7612 wie R, Standardfehler und Intervall nahe an DeLong', async () => {
    const a = (await lauf('78 ja\n43 ja\n48 ja\n51 ja\n45 ja\n46 ja\n62 ja\n54 ja\n57 ja\n77 ja\n59 ja\n82 ja\n78 ja\n58 ja\n74 ja\n60 ja\n46 ja\n52 ja\n55 ja\n65 ja\n55 nein\n54 nein\n60 nein\n33 nein\n60 nein\n49 nein\n55 nein\n53 nein\n37 nein\n44 nein\n38 nein\n54 nein\n48 nein\n46 nein\n43 nein\n41 nein\n57 nein\n36 nein\n46 nein\n50 nein\n59 nein\n40 nein\n44 nein\n34 nein\n43 nein\n43 nein\n61 nein\n53 nein\n48 nein\n56 nein\n44 nein\n47 nein\n51 nein\n64 nein\n54 nein\n52 nein\n31 nein\n50 nein\n49 nein\n38 nein'))!;
    expect(a.auc).toBeCloseTo(0.7612, 4);      // R: 0.7612
    expect(Math.abs(a.se - 0.06647)).toBeLessThan(0.006);   // R DeLong: SE 0.0665, KI 0.631 bis 0.8915
    expect(Math.abs(a.lo - 0.631)).toBeLessThan(0.006); expect(Math.abs(a.hi - 0.8915)).toBeLessThan(0.006);
    expect(a.begrenzt).toBe(false);
  });
  it('ohne Tabelle: null', () => { expect(aucAus([])).toBeNull(); });
});

/* Kurve und Schwelle aus den Rohwerten gegen R pROC (scripts/roc-erwartet.R): Fläche und Youden-Index stimmen. */
describe('ROC-Kurve und bester Schwellenwert aus Rohwerten (wie pROC)', () => {
  const pos60 = [87, 46, 52, 55, 48, 49, 69, 59, 62, 86, 64, 93, 87, 64, 83, 66, 49, 56, 60, 72];
  const neg60 = [58, 57, 63, 36, 63, 52, 58, 56, 40, 47, 41, 57, 51, 49, 46, 44, 60, 39, 49, 53, 62, 43, 47, 37, 46, 46, 64, 56, 51, 59, 47, 50, 54, 67, 57, 55, 34, 53, 52, 41];
  const pos2 = [11.6, 14.1, 7.9, 8.5, 18.7, 10.3, 19.3, 16.5, 13.8, 10, 10.7, 12.6, 7.8, 13, 9.4, 14, 13.1, 17.6, 11.6, 11.4, 11.3, 13.9, 12.2, 15.4, 14.3, 14, 13.2, 10.9, 13.1, 10.1, 9.6, 10.2, 16.7, 7.7, 10.5];
  const neg2 = [11.9, 9.3, 16.2, 7.6, 8.6, 3.5, 10.1, 13.6, 6.5, 13.6, 8.6, 1.3, 13.5, 12.9, 10.9, 13.2, 9.1, 6.7, 12, 10.6, 12.2, 9.4, 11.8, 16, 10.2, 6.6, 19.4, 9.5, 2.2, 12.2, 16.8, 6.8, 5.7, 7.6, 13, 11.8, 9.5, 6.9, 10.9, 14.5, 10.6, 7.2, 11.8, 5.7, 11.6, 9.7, 11.3, 7.6, 6.4, 19, 7.6, 4.8, 12, 6.6, 4, 14.8, 5.9, 13.8, 7.8, 12.1, 8.6, 15.3, 5.4, 15.7, 7.6, 8.2, 11, 12.4, 9.5, 1.7, 12.3, 12, 6, 15.1, 14.5, 13.4, 16.5, 11.8, 0.8, 9.7];
  const fall: [string, number[], number[], number, number, number, number][] = [
    // name, positiv, negativ, Fläche, Sensitivität, Spezifität, J (R pROC, coords best youden)
    ['klein', [3, 5, 7, 8, 9], [2, 4, 5, 6, 3], 0.8, 0.6, 1, 0.6],
    ['n = 60', pos60, neg60, 0.788125, 0.65, 0.825, 0.475],
    ['mit Bindungen', pos2, neg2, 0.66839286, 1, 0.3125, 0.3125],
    ['perfekte Trennung', [8, 9, 10], [1, 2, 3], 1, 1, 1, 1]
  ];
  it.each(fall)('%s', (_, p, n, auc, sens, spez, j) => {
    const k = rocKurve(p, n)!;
    expect(k.auc).toBeCloseTo(auc, 7);
    expect(k.beste.j).toBeCloseTo(j, 7);
    // Sensitivität und Spezifität am Schwellenwert, von Hand gezählt: „Wert oder mehr“ ist positiv.
    expect(p.filter(v => v >= k.beste.schwelle).length / p.length).toBeCloseTo(k.beste.sens, 10);
    expect(n.filter(v => v < k.beste.schwelle).length / n.length).toBeCloseTo(k.beste.spez, 10);
    expect(k.beste.sens).toBeCloseTo(sens, 7);
    expect(k.beste.spez).toBeCloseTo(spez, 7);
    expect(k.punkte[0]).toEqual([0, 0]); expect(k.punkte.at(-1)).toEqual([1, 1]);
  });
  it('Schwellenwert ist ein beobachteter Wert; pROC nennt die Mitte darunter (klein: 6,5 → 7)', () => {
    expect(rocKurve([3, 5, 7, 8, 9], [2, 4, 5, 6, 3])!.beste.schwelle).toBe(7);
  });
  it('leere Gruppe: null', () => { expect(rocKurve([], [1, 2])).toBeNull(); });
});
