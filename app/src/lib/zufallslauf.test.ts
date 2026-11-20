import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { olsKlassisch, passtZu, pruefsumme, zufallLauf, type ZufallDaten } from './zufallslauf';
import { bGueltig, ganzeZahlAusText, kopiereZufall, leereZufall } from './zufallswahl';
import { kopiereZusatz, leereZusatz, zusatzAn } from './aequirci';

/* Eigene Tests des Laufs „Ohne Normalverteilung - mit Zufallsverfahren“ (Welle S-B, L5). Die Sollwerte stehen in permutation.test.ts; hier geht es um das Zusammenspiel:
 * Permutation und Bootstrap aus einem Aufruf, Abbrechen, Fortschritt, Wahl speichern. */
const Z = (erwartet as any).zufall, PG = Z.permutation_gruppen, BS = Z.bootstrap;
const wahl = (o: object = {}) => ({ ...leereZufall(), an: true, B: 999, ...o });
const nah = (ist: number, soll: number, tol: number, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol);

describe('Lauf: Gruppen (6 gegen 7)', () => {
  const f = PG.sechs_sieben, daten: ZufallDaten = { karte: 'gruppen', y: 'y', g: 'g', namen: ['A', 'B'], x: f.x, z: f.y };
  it('Permutationstest (Welch-t, exakt über 1 716 Aufteilungen) = Sollwert aus R; Bootstrap geschichtet, Welch-Intervall daneben', async () => {
    const e = (await zufallLauf(daten, wahl()))!;
    expect(e.gruppen!.perm!.modus).toBe('exakt'); expect(e.gruppen!.perm!.gesamt).toBe(1716); nah(e.gruppen!.perm!.p, f.mittel.p, 1e-12);
    nah(e.gruppen!.schaetzer, 4.5, 1e-12); expect(e.gruppen!.boot.art).toBe('perzentil'); expect(e.gruppen!.boot.B).toBe(999);
    nah(e.gruppen!.welch!.lo, f.welch_ki.lo, 1e-9); nah(e.gruppen!.welch!.hi, f.welch_ki.hi, 1e-9);
    expect(e.gruppen!.boot.hi! - e.gruppen!.boot.lo!).toBeLessThan(e.gruppen!.welch!.hi - e.gruppen!.welch!.lo);   // bei diesen n zu schmal (Hesterberg)
  });
  it('gleicher Startwert ⇒ gleiches Ergebnis; BCa wählbar; Median ohne Welch-Intervall', async () => {
    const a = await zufallLauf(daten, wahl({ art: 'bca' })), b = await zufallLauf(daten, wahl({ art: 'bca' }));
    expect(a).toEqual(b); expect(['bca', 'perzentil']).toContain(a!.gruppen!.boot.art);
    const m = (await zufallLauf(daten, wahl({ statistik: 'median' })))!; expect(m.gruppen!.welch).toBeNull(); expect(m.gruppen!.perm!.statistik).toBe('median');
  });
  it('Abbrechen: weiter() liefert false ⇒ undefined; der Fortschritt steigt', async () => {
    expect(await zufallLauf(daten, wahl({ B: 20000 }), { weiter: () => false })).toBeUndefined();
    const gross: ZufallDaten = { karte: 'gruppen', y: 'y', g: 'g', namen: ['A', 'B'], x: PG.zwoelf_zwoelf.x, z: PG.zwoelf_zwoelf.y }; let n = 0;
    expect(await zufallLauf(gross, wahl({ B: 99999 }), { weiter: () => ++n < 2 })).toBeUndefined(); expect(n).toBe(2);
    const w: number[] = []; await zufallLauf(daten, wahl({ B: 2000 }), { fortschritt: a => w.push(a) }); expect(w.length).toBeGreaterThan(1); expect(Math.max(...w)).toBeLessThanOrEqual(1); expect(w.at(-1)).toBeGreaterThan(0.9);
  });
  it('passtZu: andere Wahl oder andere Daten ⇒ überholt', async () => {
    const e = (await zufallLauf(daten, wahl()))!;
    expect(passtZu(e, daten, wahl())).toBe(true); expect(passtZu(e, daten, wahl({ B: 1000 }))).toBe(false); expect(passtZu(e, daten, wahl({ startwert: 5 }))).toBe(false); expect(passtZu(e, { ...daten, x: [...daten.x.slice(1), 99] }, wahl())).toBe(false);
    expect(pruefsumme(daten)).toBe(pruefsumme({ ...daten, x: [...daten.x] }));
  });
});

describe('Lauf: Zusammenhang (Law School, n = 15)', () => {
  const f = Z.permutation_korrelation.law_school, daten: ZufallDaten = { karte: 'zusammenhang', x: 'lsat', y: 'gpa', xs: f.x, ys: f.y };
  it('r, Permutationstest (Zufall), Bootstrap-Perzentil nahe der Referenz, Fisher-z-Intervall daneben', async () => {
    const e = (await zufallLauf(daten, wahl({ B: 9999 })))!, z = e.zusammenhang!;
    nah(z.r!, f.r, 1e-9); expect(z.perm!.modus).toBe('zufall'); expect(z.perm!.p).toBeLessThan(0.01); nah(z.pT!, f.p_t_test, 1e-6);
    expect(z.boot!.lo!).toBeGreaterThan(0.2); expect(z.boot!.hi!).toBeGreaterThan(0.9);
    nah(z.fisher!.lo, 0.4385, 5e-3); nah(z.fisher!.hi, 0.9220, 5e-3);   // Fachblatt 6.4: Fisher-z [,4385; ,9220]
  });
  it('eine Spalte ohne Streuung: r null, nichts anderes', async () => {
    const e = (await zufallLauf({ karte: 'zusammenhang', x: 'a', y: 'b', xs: [1, 1, 1, 1], ys: [1, 2, 3, 4] }, wahl()))!; expect(e.zusammenhang!.r).toBeNull(); expect(e.zusammenhang!.perm).toBeNull();
  });
});

describe('Lauf: Vorhersage und Verteilung', () => {
  const f = BS.faelle[2];
  it('Fall-Bootstrap der Koeffizienten (n = 40, zwei Prädiktoren); klassisches t-Intervall = lm', async () => {
    const e = (await zufallLauf({ karte: 'vorhersage', ziel: 'y', namen: ['x1', 'x2'], spalten: [f.daten.x1, f.daten.x2], y: f.daten.y }, wahl({ B: 2000 })))!, k = e.vorhersage!.koeff[0]!;
    nah(k.b, f.t0, 1e-9); nah(k.klassisch!.lo, f.klassisch.ki[0], 1e-9); nah(k.klassisch!.hi, f.klassisch.ki[1], 1e-9); expect(k.boot.lo!).toBeLessThan(k.b); expect(k.boot.hi!).toBeGreaterThan(k.b);
    expect(e.vorhersage!.koeff).toHaveLength(2);
  });
  it('olsKlassisch: Rangmangel ⇒ null', () => { expect(olsKlassisch([[1, 2, 3, 4, 5], [2, 4, 6, 8, 10]], [1, 3, 2, 5, 4])).toBeNull(); });
  it('Verteilung: Mittelwert und Median je Spalte, t-Intervall nur beim Mittelwert', async () => {
    const d: ZufallDaten = { karte: 'verteilung', spalten: [{ name: 'a', werte: [2, 3, 3, 4, 5, 6, 7, 9, 12, 40] }] };
    const m = (await zufallLauf(d, wahl()))!.verteilung!.spalten[0]!, md = (await zufallLauf(d, wahl({ statistik: 'median' })))!.verteilung!.spalten[0]!;
    nah(m.schaetzer, 9.1, 1e-12); expect(m.t).not.toBeNull(); nah(md.schaetzer, 5.5, 1e-12); expect(md.t).toBeNull();
  });
});

describe('Wahl', () => {
  it('Voreinstellung: B = 9999, Startwert 20261008, Perzentil, Mittelwert; kopieren prüft die Werte', () => {
    expect(leereZufall()).toEqual({ an: false, B: 9999, startwert: 20261008, art: 'perzentil', statistik: 'mittel' });
    expect(kopiereZufall({ an: true, B: 5, startwert: -1, art: 'bca' as const })).toEqual({ an: true, B: 9999, startwert: 20261008, art: 'bca', statistik: 'mittel' });
    expect(bGueltig(99999)).toBe(true); expect(bGueltig(100000)).toBe(false); expect(ganzeZahlAusText(' 12 345 ')).toBe(12345); expect(ganzeZahlAusText('1,5')).toBeNull();
  });
  it('gehört zur Zusatzwahl: an ⇒ zusatzAn und wird kopiert; aus ⇒ nichts gespeichert', () => {
    const z = leereZusatz(); expect(zusatzAn(z)).toBe(false); z.zufall = { ...leereZufall(), an: true, B: 500 }; expect(zusatzAn(z)).toBe(true); expect(kopiereZusatz(z).zufall).toEqual({ ...leereZufall(), an: true, B: 500 });
    z.zufall.an = false; expect(kopiereZusatz(z).zufall).toBeUndefined();
  });
});
