import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { themenzahlen, zitateDesThemas } from './themenzahlen';

/* ===== ROTE TESTS Welle S-D, G12: Joint Display „Zahlen nach Themen“ - Prüfer; der Bauer B ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (g12). Fachblatt Abschnitt 3 + „Entscheidungen Opus“ 3. Daten: testdaten/themen.csv (N = 48: 40 zugeordnet, 5 leer, 3 offen; Frage score 1 bis 5; Themen t1 Zeitdruck, t2 Unterstützung, t3 Prüfungsangst).
 * Zweite Quelle im Skript: PSPP MEANS (M, N, SD je Thema, 12 Stellen), Matrixprodukt/tapply/crossprod (andere Auszählung). Keine Tests und keine Sternchen in der Tabelle (Entscheidung Opus 3).
 * Neues Modul `lib/themenzahlen.ts` (reine Funktionen; die Oberfläche macht aus dem Ergebnis eine TableItem-Tabelle). API:
 *
 *   themenzahlen(themen: { name: string; werte: (number | null)[] }[] /* 0/1 je Person, null = leer oder offen (wie lib/kategorisieren.ts `ergebnis`) *\/,
 *                zustand: ('zugeordnet' | 'leer' | 'offen')[] /* je Person *\/,
 *                o?: { frage?: { art: 'zahl'; werte: (number | null)[] } | { art: 'kategorie'; werte: (string | number | null)[] }; ohne?: boolean /* Zeilen „ohne dieses Thema“ mitrechnen *\/ }): Themenzahlen
 *     Themenzahlen = { basis: number /* Personen mit mindestens einem Thema = zugeordnet *\/; leer: number; offen: number; summeN: number; summeProzent: number;
 *                      themenJePerson: number[] /* Index 0 = Personen mit 1 Thema, 1 = mit 2 … (Länge = Zahl der Themen) *\/; ueberschneidung: number[][] /* Personen mit beiden Themen, Diagonale = n des Themas *\/;
 *                      gesamt: Zeile; zeilen: Zeile[] /* je Thema, Reihenfolge wie übergeben *\/; ohne: Zeile[] | null /* nur mit o.ohne *\/; hinweise: ('ueberlappung' | 'zu-viele-themen' | 'basis-null')[] }
 *     Zeile = { name?: string; n: number; prozent: number /* n / basis · 100, nie NaN (basis 0 → 0) *\/; nGueltig: number /* gültige Werte der Frage unter den n *\/; klein: boolean /* n < 5 *\/;
 *               mw?: number; sd?: number; median?: number; min?: number; max?: number /* nur bei Zahlenfrage und nGueltig ≥ 1 (sd erst ab 2, SD mit n − 1); sonst fehlend (undefined oder null) *\/;
 *               verteilung?: { wert: string; n: number; prozent: number | null }[] /* nur Kategorienfrage: alle Werte der Basis (sortiert), n und Prozent INNERHALB der Zeile *\/ }
 *     - Basis: NUR „zugeordnet“. Leer und offen gehören nicht dazu (beide sind fehlend); die Zahlen stehen in leer und offen. Wer durch alle Zeilen teilt, bekäme für t1 41,7 % statt 50,0 % (falsche Basis).
 *     - Überlappung: summeN > basis ⇒ Hinweis 'ueberlappung' (die Fußzeile nennt „Summe der n: 59, Basis: 40 Personen“). Mehr als 20 Themen: Hinweis 'zu-viele-themen', gerechnet wird trotzdem.
 *     - Gesamt-Zeile = Basis (n = basis, prozent 100). „ohne Thema“ = Basis ohne die Personen des Themas (prozent bezogen auf die Basis).
 *   zitateDesThemas(thema: (number | null)[], kennungen: string[], markierungen: ({ von: number; bis: number; text: string }[] | undefined)[], max = 3): { kennung: string; text: string }[]
 *     Statable wählt NIE selbst: nur die von der Person markierten Stellen der Antworten, die dem Thema zugeordnet sind, in Reihenfolge der Personen, höchstens `max` (3); ohne Markierung: leere Liste.
 */
const G = (erwartet as any).g12;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const themenAus = (t: any[], namen = ['t1', 't2', 't3']) => t.map((w, i) => ({ name: namen[i]!, werte: w as (number | null)[] }));
const vergleiche = (ist: any, soll: any, was: string) => {
  expect(ist.n, `${was} n`).toBe(soll.n); nah(ist.prozent, soll.prozent, 1e-12); expect(ist.nGueltig, `${was} nGueltig`).toBe(soll.n_gueltig); expect(ist.klein, `${was} klein`).toBe(soll.klein ?? soll.n < 5);
  for (const [k, j] of [['mw', 'mw'], ['sd', 'sd'], ['median', 'median'], ['min', 'min'], ['max', 'max']] as const) { if (soll[j] === undefined || soll[j] === null) expect(ist[k] ?? null, `${was} ${k}`).toBeNull(); else nah(ist[k], soll[j], 1e-12); }
  if (soll.verteilung) { expect(ist.verteilung.map((v: any) => [String(v.wert), v.n])).toEqual(soll.verteilung.map((v: any) => [v.wert, v.n])); ist.verteilung.forEach((v: any, i: number) => { if (soll.verteilung[i].prozent === null) expect(v.prozent).toBeNull(); else nah(v.prozent, soll.verteilung[i].prozent, 1e-12); }); }
};
const D = G.daten, frageScore = { art: 'zahl' as const, werte: D.score as number[] };

describe('Beispiel (N = 48: 40 zugeordnet, 5 leer, 3 offen)', () => {
  const r = themenzahlen(themenAus([D.t1, D.t2, D.t3]), D.zustand, { frage: frageScore, ohne: true }), S = G.beispiel;
  it('Basis 40, leer 5, offen 3; Summe der n = 59, Summe der Prozent 147,5; Themen je Person 26 / 9 / 5', () => {
    expect([r.basis, r.leer, r.offen]).toEqual([40, 5, 3]); expect(r.summeN).toBe(59); nah(r.summeProzent, 147.5, 1e-12); expect(r.themenJePerson).toEqual([26, 9, 5]); expect(r.hinweise).toEqual(['ueberlappung']);
  });
  it('Überschneidungen: t1&t2 5, t1&t3 10, t2&t3 9; Diagonale = n (20, 14, 25)', () => {
    expect(r.ueberschneidung).toEqual(S.ueberschneidung.map((z: number[]) => z)); expect(r.ueberschneidung[0]![1]).toBe(5); expect(r.ueberschneidung[0]![2]).toBe(10); expect(r.ueberschneidung[1]![2]).toBe(9); expect(r.ueberschneidung.map((z, i) => z[i])).toEqual([20, 14, 25]);
  });
  it('Fachblatt 3.6 (gerundet): n 20 / 14 / 25, Prozent 50,0 / 35,0 / 62,5, M 2,7000 / 3,2143 / 3,0800, SD ,8013 / 1,1217 / 1,1150, Median 3', () => {
    expect(r.zeilen.map(z => z.n)).toEqual([20, 14, 25]); expect(r.zeilen.map(z => z.prozent)).toEqual([50, 35, 62.5]);
    expect(r.zeilen.map(z => Math.round(z.mw! * 10000) / 10000)).toEqual([2.7, 3.2143, 3.08]); expect(r.zeilen.map(z => Math.round(z.sd! * 10000) / 10000)).toEqual([0.8013, 1.1217, 1.115]); expect(r.zeilen.map(z => z.median)).toEqual([3, 3, 3]);
    expect([Math.round(r.gesamt.mw! * 10000) / 10000, Math.round(r.gesamt.sd! * 10000) / 10000, r.gesamt.n, r.gesamt.prozent]).toEqual([2.975, 0.9737, 40, 100]);
  });
  it('alle Zeilen gleich R auf 12 Stellen (n, Prozent, M, SD, Median, Min, Max), Gesamt und „ohne Thema“', () => {
    S.zeilen.forEach((z: any, i: number) => vergleiche(r.zeilen[i], z, S.zeilen[i].name)); vergleiche(r.gesamt, S.gesamt, 'gesamt'); S.ohne.forEach((z: any, i: number) => vergleiche(r.ohne![i], z, `ohne ${i}`));
    expect(r.zeilen.map(z => z.name)).toEqual(['t1', 't2', 't3']);
  });
  it('„ohne Thema“ (Fachblatt): t1 20 / 3,2500 / 1,0699 · t2 26 / 2,8462 / ,8806 · t3 15 / 2,8000 / ,6761', () => {
    expect(r.ohne!.map(z => z.n)).toEqual([20, 26, 15]); expect(r.ohne!.map(z => Math.round(z.mw! * 10000) / 10000)).toEqual([3.25, 2.8462, 2.8]); expect(r.ohne!.map(z => Math.round(z.sd! * 10000) / 10000)).toEqual([1.0699, 0.8806, 0.6761]);
  });
  it('ohne o.ohne keine „ohne“-Zeilen', () => { expect(themenzahlen(themenAus([D.t1, D.t2, D.t3]), D.zustand, { frage: frageScore }).ohne).toBeNull(); });
  it('falsche Basis (alle 48 Zeilen) wäre 41,7 % - die Tabelle sagt 50,0 %', () => { expect(Math.round(G.falsche_basis_prozent_t1 * 10) / 10).toBe(41.7); expect(r.zeilen[0]!.prozent).not.toBeCloseTo(G.falsche_basis_prozent_t1, 1); });
  it('M und SD sind gleich PSPP MEANS (Zeile im Skript geprüft): hier gegen die Werte im JSON, 1e-12', () => { nah(r.zeilen[1]!.mw!, S.zeilen[1].mw, 1e-12); nah(r.ohne![2]!.sd!, S.ohne[2].sd, 1e-12); });
});

describe('Modus „eins“ (Themen schließen sich aus): die Summe der n ist N', () => {
  const E1 = G.modus_eins, r = themenzahlen(themenAus([E1.daten.a, E1.daten.b, E1.daten.c]), E1.daten.zustand, { frage: { art: 'zahl', werte: E1.daten.frage }, ohne: true });
  it('Basis 24, Summe der n = Basis, kein Überlappungshinweis, Themen je Person nur 1', () => {
    expect(r.basis).toBe(24); expect(r.summeN).toBe(r.basis); expect(r.hinweise).not.toContain('ueberlappung'); expect(r.themenJePerson).toEqual(E1.ergebnis.themen_je_person); expect(r.themenJePerson[0]).toBe(24);
    nah(r.summeProzent, 100, 1e-12);
  });
  it('Zeilen gleich R', () => { E1.ergebnis.zeilen.forEach((z: any, i: number) => vergleiche(r.zeilen[i], z, `eins ${i}`)); });
});

describe('Frage mit Lücken, Kategorienfrage, keine Zahlenfrage', () => {
  const E1 = G.modus_eins;
  it('Lücken in der Frage: nGueltig kleiner als n (wird je Zelle gezeigt), M und SD aus den gültigen', () => {
    const L = G.frage_luecken, r = themenzahlen(themenAus([E1.daten.a, E1.daten.b, E1.daten.c]), E1.daten.zustand, { frage: { art: 'zahl', werte: L.frage } });
    L.ergebnis.zeilen.forEach((z: any, i: number) => vergleiche(r.zeilen[i], z, `luecke ${i}`)); expect(r.zeilen.some(z => z.nGueltig < z.n)).toBe(true);
  });
  it('Kategorienfrage statt Zahl: Verteilung der Werte in der Zeile (n und Prozent innerhalb der Zeile)', () => {
    const K = G.kategorienfrage, r = themenzahlen(themenAus([E1.daten.a, E1.daten.b, E1.daten.c]), E1.daten.zustand, { frage: { art: 'kategorie', werte: K.frage } });
    K.ergebnis.zeilen.forEach((z: any, i: number) => vergleiche(r.zeilen[i], z, `kat ${i}`)); for (const z of r.zeilen) { expect(z.mw ?? null).toBeNull(); if (z.nGueltig > 0) nah(z.verteilung!.reduce((a, v) => a + v.prozent!, 0), 100, 1e-9); }
  });
  it('keine Zahlenfrage gewählt: nur n und Prozent, keine Kennwerte', () => {
    const r = themenzahlen(themenAus([D.t1, D.t2, D.t3]), D.zustand); expect(r.zeilen.map(z => z.n)).toEqual([20, 14, 25]); for (const z of r.zeilen) { expect(z.mw ?? null).toBeNull(); expect(z.verteilung ?? null).toBeNull(); }
  });
});

describe('Ränder: n = 1, n = 0, n < 5, Basis 0, viele Themen - nie NaN', () => {
  const K = G.klein, r = themenzahlen(themenAus([K.daten.a, K.daten.b, K.daten.c], ['a', 'b', 'c']), K.daten.zustand, { frage: { art: 'zahl', werte: K.daten.frage }, ohne: true });
  it('n = 1: SD fehlt; n = 0: Zeile bleibt mit n = 0 und ohne Kennwerte; n < 5: klein', () => {
    K.ergebnis.zeilen.forEach((z: any, i: number) => vergleiche(r.zeilen[i], z, `klein ${i}`)); expect(r.zeilen[0]!.n).toBe(1); expect(r.zeilen[0]!.sd ?? null).toBeNull(); expect(r.zeilen[0]!.mw).toBeDefined(); expect(r.zeilen[2]!.n).toBe(0); expect(r.zeilen[2]!.mw ?? null).toBeNull();
    expect(r.zeilen[2]!.prozent).toBe(0); expect(r.zeilen.every(z => z.klein)).toBe(true); expect(r.basis).toBe(3);
  });
  it('Schwelle klein: n < 5 (Fachblatt 3.5): n = 5 ist nicht klein', () => {
    expect(G.schwelle_klein).toBe(5); const w = [1, 1, 1, 1, 1, 0, 0], z = Array(7).fill('zugeordnet') as any[], t = themenzahlen([{ name: 'x', werte: w }], z, { frage: { art: 'zahl', werte: [1, 2, 3, 4, 5, 1, 2] } }); expect(t.zeilen[0]!.klein).toBe(false);
    expect(themenzahlen([{ name: 'x', werte: [1, 1, 1, 1, 0, 0, 0] }], z).zeilen[0]!.klein).toBe(true);
  });
  it('kein Thema genannt (alle Personen offen oder leer): Basis 0, Prozent 0 statt NaN, Hinweis basis-null', () => {
    const t = themenzahlen([{ name: 'x', werte: [null, null, null] }], ['leer', 'offen', 'leer'], { frage: { art: 'zahl', werte: [1, 2, 3] } });
    expect(t.basis).toBe(0); expect(t.leer).toBe(2); expect(t.offen).toBe(1); expect(t.zeilen[0]!.n).toBe(0); expect(t.zeilen[0]!.prozent).toBe(0); expect(t.hinweise).toContain('basis-null'); expect(JSON.stringify(t)).not.toMatch(/NaN/);
  });
  it('mehr als 20 Themen: Hinweis zu-viele-themen, gerechnet wird trotzdem', () => {
    const ths = Array.from({ length: 21 }, (_, i) => ({ name: `t${i}`, werte: [i % 2, 1, 0, 1] as (number | null)[] })), t = themenzahlen(ths, ['zugeordnet', 'zugeordnet', 'zugeordnet', 'zugeordnet']);
    expect(t.hinweise).toContain('zu-viele-themen'); expect(t.zeilen.length).toBe(21); expect(t.zeilen[1]!.n).toBe(3);
  });
  it('nur ein Thema ist erlaubt', () => { const t = themenzahlen([{ name: 'x', werte: [1, 0, 1] }], ['zugeordnet', 'zugeordnet', 'zugeordnet']); expect(t.zeilen[0]!.n).toBe(2); nah(t.zeilen[0]!.prozent, 66.66666666666667, 1e-12); expect(t.hinweise).not.toContain('ueberlappung'); });
});

describe('Zitate: wählt nur die Person (höchstens 3), nie Statable', () => {
  const thema = [1, 1, 0, 1, 1, 1], ken = ['a', 'b', 'c', 'd', 'e', 'f'];
  const m = (text: string) => [{ von: 0, bis: text.length, text }];
  it('nur markierte Stellen von Personen des Themas, in Reihenfolge, höchstens drei', () => {
    const z = zitateDesThemas(thema, ken, [m('Hallo'), undefined, m('Fremd'), [{ von: 0, bis: 3, text: 'Eins' }, { von: 4, bis: 8, text: 'Zwei' }], m('Vier'), m('Fünf')]);
    expect(z).toEqual([{ kennung: 'a', text: 'Hallo' }, { kennung: 'd', text: 'Eins' }, { kennung: 'd', text: 'Zwei' }]);
  });
  it('ohne Markierung: leer - Statable wählt nie ein Zitat von selbst aus', () => { expect(zitateDesThemas(thema, ken, [undefined, undefined, undefined, undefined, undefined, undefined])).toEqual([]); expect(zitateDesThemas(thema, ken, [[], [], [], [], [], []])).toEqual([]); });
  it('mit anderem max', () => { expect(zitateDesThemas(thema, ken, [m('A'), m('B'), m('C'), m('D'), m('E'), m('F')], 2).length).toBe(2); });
});
