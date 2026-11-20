// G15/G16: Wahl, Sätze und Tabellen (Zahlen selbst: tost-rci.test.ts gegen R).
import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { saetzeTost, saetzeRci, tabellenTost, tabellenRci, apaTost, apaRci } from './aequisaetze';
import { berichtSatz, berichtTabellen, saetzeZu } from './berichtsatz';
import { deltaAusText, reliabilitaetAusText, zahlAusText, tostAusGruppen, tostAusPaaren, rciAnzeige, RCI_MAX_PERSONEN, leereZusatz } from './aequirci';
import type { Blatt } from './sitzung.svelte';

afterEach(() => { s.einst.sprache = 'de'; });
const A = [10.1, 10.4, 9.8, 10.2, 10.0, 9.9, 10.3, 10.1, 10.2, 9.7], B = [10.0, 10.3, 10.1, 9.9, 10.2, 10.0, 9.8, 10.1, 10.3, 9.9];
const alles = (r: { haupt: string; zusatz: string; vorsicht: string }) => `${r.haupt}\n${r.zusatz}\n${r.vorsicht}`;

describe('Eingaben', () => {
  it('Zahlen mit Komma oder Punkt; Δ > 0; r von 0 bis unter 1', () => {
    expect(zahlAusText('0,5')).toBe(0.5); expect(zahlAusText(' .85 ')).toBe(0.85); expect(zahlAusText('1.5')).toBe(1.5);
    for (const t of ['', 'abc', '1,2,3', '--1', '1e3']) expect(zahlAusText(t), t).toBeNull();
    expect(deltaAusText('0')).toBeNull(); expect(deltaAusText('-1')).toBeNull(); expect(deltaAusText('0,5')).toBe(0.5);
    expect(reliabilitaetAusText('1')).toBeNull(); expect(reliabilitaetAusText('-0,1')).toBeNull(); expect(reliabilitaetAusText('0')).toBe(0); expect(reliabilitaetAusText(',85')).toBe(0.85);
  });
  it('keine Voreinstellung: nichts gewählt, keine Grenze, keine Richtung', () => {
    const z = leereZusatz();
    expect(z.tost).toEqual({ an: false, delta: '' }); expect(z.rci.an).toBe(false); expect(z.rci.richtung).toBe(''); expect(z.rci.r).toBe('');
  });
});

describe('Äquivalenztest: Sätze', () => {
  it('Gleichwertigkeit gezeigt: Satz nach dem Fachblatt, 90 %-Intervall, d', () => {
    const t = tostAusGruppen(A, B, 0.5, 'Wert', 'A', 'B')!;
    expect(t.e.aequivalent).toBe(true);
    const st = saetzeTost(t), a = alles(st);
    expect(st.haupt).toMatch(/^Ein Unterschied größer als ±0,5 lässt sich ausschließen, t\(\d+,\d\d\) = \d+,\d\d, p (= ,\d+|< ,001) \(TOST\)\. Differenz −?\d+,\d+, 90 %-KI \[/);   // t positiv: spricht für Gleichwertigkeit
    expect(a).toContain('90 %-KI ['); expect(a).toContain('d = ±'); expect(a).toContain('vor der Auswertung begründet');
    expect(a).not.toContain('kein Unterschied');
    s.einst.sprache = 'en';
    expect(saetzeTost(t).haupt).toMatch(/^A difference larger than ±0\.5 can be ruled out, t\(\d+\.\d\d\) = \d+\.\d\d, p /);
  });
  it('nicht gezeigt: kein „kein Unterschied“, Unterschied bleibt möglich', () => {
    const t = tostAusGruppen(A, B.map(v => v + 0.4), 0.2, 'Wert', 'A', 'B')!;
    expect(t.e.aequivalent).toBe(false);
    const st = saetzeTost(t);
    expect(st.haupt).toMatch(/^Gleichwertigkeit lässt sich nicht zeigen, t\(/);
    expect(alles(st)).toContain('bleibt möglich'); expect(alles(st)).toContain('Ein nicht signifikanter t-Test zeigt keine Gleichwertigkeit');
  });
  it('gepaart: Differenz nachher minus vorher', () => {
    const t = tostAusPaaren(A.map((v, i) => [v, B[i]!] as [number, number]), 0.5, 'vor', 'nach')!;
    expect(saetzeTost(t).zusatz).toContain('nachher minus vorher');
    const tab = tabellenTost(t);
    expect(tab).toHaveLength(2); expect(tab[0]!.cells.some(c => c.t === 'TOST (größeres der beiden p)')).toBe(true);
  });
  it('Δ ungültig: kein Ergebnis', () => { expect(tostAusGruppen(A, B, 0, 'W', 'A', 'B')).toBeNull(); expect(tostAusGruppen(A, B, NaN, 'W', 'A', 'B')).toBeNull(); });
});

describe('Reliable Change Index: Sätze und Tabellen', () => {
  const vor = Array.from({ length: 12 }, (_, i) => 20 + i * 2), nach = vor.map((v, i) => v + (i % 3 === 0 ? 8 : i % 3 === 1 ? 0 : -9));
  const daten = vor.map((v, i) => ({ zeile: i + 1, vorher: v, nachher: nach[i]! }));
  it('Satz nennt Anzahlen, Quelle und Richtung; kein Cut-off', () => {
    const r = rciAnzeige(daten, 0.8, { quelle: 'retest' }, true, 'vor', 'nach')!;
    const st = saetzeRci(r), a = alles(st);
    expect(st.haupt).toMatch(/^Reliable Change Index \(Jacobson & Truax, 1991\): \d+ von 12 Personen \(\d+ %\) verlässlich verbessert, /);
    expect(a).toContain('Retest-Reliabilität'); expect(a).toContain('Hohe Werte gelten als besser.'); expect(a).toContain('einen Cut-off rechnet Statable nicht');
    const alpha = rciAnzeige(daten, 0.9, { quelle: 'alpha', skala: 'Angst', alphaN: 40, alphaItems: 5 }, false, 'vor', 'nach')!;
    const aa = alles(saetzeRci(alpha));
    expect(aa).toContain('Cronbachs Alpha = ,90'); expect(aa).toContain('Skala „Angst“'); expect(aa).toContain('ersetzt die Retest-Reliabilität'); expect(aa).toContain('Hohe Werte gelten als schlechter.');
    expect(aa).toContain('nicht die Stabilität über die Zeit');
  });
  it('Tabellen: Anteile und je Person; Kappung bei sehr vielen Personen', () => {
    const r = rciAnzeige(daten, 0.8, { quelle: 'retest' }, true, 'vor', 'nach')!;
    const [summe, person] = tabellenRci(r);
    expect(summe!.rows).toBe(4); expect(person!.rows).toBe(13); expect(person!.cols).toBe(6);
    const viele = Array.from({ length: RCI_MAX_PERSONEN + 50 }, (_, i) => ({ zeile: i + 1, vorher: i % 17, nachher: (i * 7) % 19 }));
    const g = rciAnzeige(viele, 0.8, { quelle: 'retest' }, true, 'v', 'n')!;
    expect(g.n).toBe(RCI_MAX_PERSONEN + 50); expect(g.personen).toHaveLength(RCI_MAX_PERSONEN);
    expect(g.anzahl.verbessert + g.anzahl.unveraendert + g.anzahl.verschlechtert).toBe(g.n);
    expect(tabellenRci(g)[1]!.footnotes[0]!.t).toContain('ersten 1000 von 1050');
  });
  it('Reliabilität 1 oder keine Streuung der Vorher-Werte: kein Ergebnis', () => {
    expect(rciAnzeige(daten, 1, { quelle: 'retest' }, true, 'v', 'n')).toBeNull();
    expect(rciAnzeige(daten.map(d => ({ ...d, vorher: 5 })), 0.8, { quelle: 'retest' }, true, 'v', 'n')).toBeNull();
  });
});

describe('Bericht: Sätze und Tabellen kommen mit', () => {
  const blatt = (o: Partial<Blatt>): Blatt => ({ id: 'x', titel: 't', art: 'praepost', l1: 'v', l2: 'n', syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0, ...o });
  it('Prä-Post mit Äquivalenztest und RCI', () => {
    const paare = A.map((v, i) => [v, B[i]!] as [number, number]);
    const tost = tostAusPaaren(paare, 0.5, 'v', 'n')!, rci = rciAnzeige(paare.map((p, i) => ({ zeile: i + 1, vorher: p[0], nachher: p[1] })), 0.8, { quelle: 'retest' }, true, 'v', 'n')!;
    const z = leereZusatz(); z.tost = { an: true, delta: '0,5' }; z.rci = { an: true, quelle: 'retest', r: '0,8', skala: '', richtung: 'besser' };
    const b = blatt({ ergebnis: { typ: 'prae-post', e: { vorher: 'v', nachher: 'n', n: 10, m1: 10, m2: 10, diff: 0, diffLo: -0.2, diffHi: 0.2, t: 0.1, df: 9, p: 0.9, dz: 0, dzLo: -0.6, dzHi: 0.6, dav: 0, r: 0.1 }, tost, rci }, zus: z });
    expect(berichtSatz(b)).toContain('lässt sich ausschließen'); expect(berichtSatz(b)).toContain('Reliable Change Index (Jacobson');
    expect(berichtTabellen(b).map(t => t.label)).toEqual(expect.arrayContaining(['Equivalence Test (TOST)', 'Equivalence Difference', 'Reliable Change Index', 'Reliable Change Index Persons']));
    const ohne = blatt({ ergebnis: b.ergebnis, zus: leereZusatz() });
    expect(berichtSatz(ohne)).not.toContain('Reliable Change Index'); expect(berichtTabellen(ohne).map(t => t.label)).not.toContain('Reliable Change Index');
  });
});

describe('Fachprüfung Paket D: APA-Zeile und Stellen', () => {
  it('APA-Zeile TOST: Δ, beide t mit df, p (TOST), Differenz mit 90 %-KI', () => {
    const t = tostAusGruppen(A, B, 0.5, 'W', 'A', 'B')!, z = apaTost(t);
    expect(z).toMatch(/^TOST: Δ = ±0,5, untere Grenze t\(\d+,\d\d\) = −?\d+,\d\d, obere Grenze t\(\d+,\d\d\) = −?\d+,\d\d, p \(TOST\) (= ,\d+|< ,001), Differenz = −?\d+,\d+, 90 %-KI \[/);
    s.einst.sprache = 'en'; expect(apaTost(t)).toMatch(/^TOST: Δ = ±0\.5, lower bound t\(.*upper bound t\(.*difference = .*90% CI \[/);
  });
  it('APA-Zeile RCI: Reliabilität mit Quelle, S_diff, Anteile; sie steht in der Blatt-APA-Zeile', () => {
    const daten = Array.from({ length: 12 }, (_, i) => ({ zeile: i + 1, vorher: 20 + i * 2, nachher: 20 + i * 2 + (i % 3 === 0 ? 8 : i % 3 === 1 ? 0 : -9) }));
    const r = rciAnzeige(daten, 0.8, { quelle: 'retest' }, true, 'v', 'n')!;
    expect(apaRci(r)).toMatch(/^RCI: r = ,80 \(Retest-Reliabilität, eingegeben\), S_diff = \d+,\d\d, verbessert \d+ \(\d+ %\), unverändert \d+ \(\d+ %\), verschlechtert \d+ \(\d+ %\)$/);
    const a = rciAnzeige(daten, 0.9, { quelle: 'alpha', skala: 'Angst', alphaN: 40, alphaItems: 5 }, true, 'v', 'n')!;
    expect(apaRci(a)).toContain('α = ,90 (Cronbachs Alpha, Skala „Angst“)');
    const z = leereZusatz(); z.rci = { an: true, quelle: 'retest', r: '0,8', skala: '', richtung: 'besser' };
    const b = { id: 'x', titel: 't', art: 'praepost', l1: 'v', l2: 'n', syntax: '', items: [], imBericht: true, notiz: '', zeit: 0, zus: z,
      ergebnis: { typ: 'prae-post', e: { vorher: 'v', nachher: 'n', n: 12, m1: 1, m2: 1, diff: 0, diffLo: 0, diffHi: 0, t: 0.1, df: 11, p: 0.9, dz: 0, dzLo: 0, dzHi: 0, dav: 0, r: 0.1 }, rci: r } } as Blatt;
    expect(saetzeZu(b)!.apa).toContain('; RCI: r = ,80');
  });
  it('RCI-Tabelle: drei Nachkommastellen beim RCI', () => {
    const r = rciAnzeige([{ zeile: 1, vorher: 10, nachher: 14 }, { zeile: 2, vorher: 20, nachher: 20 }, { zeile: 3, vorher: 30, nachher: 31 }], 0.8, { quelle: 'retest' }, true, 'v', 'n')!;
    const person = tabellenRci(r)[1]!, rciZellen = person.cells.filter(c => c.c === 4 && c.r > 0).map(c => c.t);
    for (const t of rciZellen) expect(t).toMatch(/^-?\d+\.\d{3}$/);
  });
});
