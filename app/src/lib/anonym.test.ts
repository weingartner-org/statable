import { describe, expect, it } from 'vitest';
import SOLL from '../../../pruefdaten/mikro/anonym-soll.json';
import { s } from './sitzung.svelte';
import { anonymisieren, anonymSaetze, haeufigkeiten, kappenOben, kappenUnten, kennzahlen, kennzahlenSatz, lokalUnterdruecken, perzentil, type Wert } from './anonym';

/* ===== Paket M3: Mikrodaten anonymisieren (Fachblatt MIKRODATEN-2026-10-24, Abschnitt M3) =====
 * Sollwerte: pruefdaten/mikro/anonym-soll.R (R sdcMicro freqCalc, localSuppression mit importance; R quantile) -> anonym-soll.json (Daten stehen mit darin).
 * Die Strukturtests unten (Original bleibt, Protokoll, Fehlerfälle) sind einfache Eigenschaften und brauchen keinen R-Sollwert. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = SOLL as unknown as Z;
const spaltenVon = (daten: Z, keys: string[]): Wert[][] => keys.map(k => daten[k] as Wert[]);

describe('Häufigkeiten gegen sdcMicro freqCalc (Fehlend = Joker)', () => {
  for (const nm of Object.keys(J.freq)) it(`Datensatz ${nm}: fk, Fk, Kennzahlen`, () => {
    const f = J.freq[nm] as Z, h = haeufigkeiten(spaltenVon(f.daten, f.keys), f.daten.w);
    expect(h.fk).toEqual(f.fk);
    h.Fk.forEach((v, i) => expect(Math.abs(v - f.Fk[i]), `Fk[${i}]`).toBeLessThan(1e-9));
    const hu = haeufigkeiten(spaltenVon(f.daten, f.keys));
    expect(hu.Fk).toEqual(hu.fk);
    for (const u of f.unter) expect(kennzahlen(h, u.k).unterK, `k = ${u.k}`).toBe(u.n);
    expect(Math.abs(kennzahlen(h, 3).wiedererkennung - f.summeInvFk)).toBeLessThan(1e-9);
  });
});

describe('Lokal unterdrücken gegen sdcMicro localSuppression(k, importance)', () => {
  const laeufe = J.lokal as Z[];
  it('es gibt Läufe', () => expect(laeufe.length).toBeGreaterThan(40));
  for (const l of laeufe) {
    const f = J.freq[l.daten] as Z;
    it(`${l.daten}, k = ${l.k}, importance ${[l.importance].flat().join('')}`, () => {
      const r = lokalUnterdruecken(spaltenVon(f.daten, f.keys), l.k, [l.importance].flat());
      expect(r.ok).toBe(true); if (!r.ok) return;
      f.keys.forEach((kn: string, j: number) => {
        const soll = l.ergebnis[kn] as (string | null)[];
        expect(r.spalten[j]!.map(v => (v === null ? null : String(v))), `Spalte ${kn}`).toEqual(soll);
      });
      expect(haeufigkeiten(r.spalten).fk).toEqual(l.fkNachher);
    });
  }
  it('ohne importance: erste Spalte ist die wichtigste', () => {
    const l = laeufe.find(x => x.daten === 'D1' && x.k === 3 && [x.importance].flat().join('') === '123')!, f = J.freq.D1 as Z;
    const a = lokalUnterdruecken(spaltenVon(f.daten, f.keys), 3), b = lokalUnterdruecken(spaltenVon(f.daten, f.keys), 3, [1, 2, 3]);
    expect(a).toEqual(b);
    expect(l).toBeTruthy();
  });
});

describe('Kappen gegen R quantile (Typ 7)', () => {
  const K = J.kappen as Z;
  const werte = K.werte as (number | null)[];
  it('Perzentile', () => {
    expect(perzentil(werte, 99)).toBeCloseTo(K.q99, 9);
    expect(perzentil(werte, 1)).toBeCloseTo(K.q01, 9);
    expect(perzentil(werte, 95)).toBeCloseTo(K.q95, 9);
  });
  it('oben und unten kappen (Standard 99 % und 1 %); fehlend bleibt fehlend', () => {
    const o = kappenOben(werte), u = kappenUnten(werte);
    expect(o.grenze).toBeCloseTo(K.q99, 9); expect(u.grenze).toBeCloseTo(K.q01, 9);
    (o.werte as (number | null)[]).forEach((v, i) => { if (K.oben99[i] === null) expect(v).toBeNull(); else expect(v as number).toBeCloseTo(K.oben99[i], 9); });
    (u.werte as (number | null)[]).forEach((v, i) => { if (K.unten01[i] === null) expect(v).toBeNull(); else expect(v as number).toBeCloseTo(K.unten01[i], 9); });
    expect(o.geaendert).toBe(werte.filter(v => v !== null && v > K.q99).length);
  });
  it('eigene Grenze', () => {
    const o = kappenOben([1, 5, 9, null], { grenze: 6 });
    expect(o.werte).toEqual([1, 5, 6, null]); expect(o.geaendert).toBe(1);
  });
});

describe('Schritte, Protokoll, Original bleibt', () => {
  const f = J.freq.D2 as Z;
  const daten: Record<string, Wert[]> = { name: f.daten.a.map((_: unknown, i: number) => `P${i}`), a: f.daten.a, b: f.daten.b, c: f.daten.c, alter: f.daten.w };
  it('Original bleibt, neue Fassung hat Protokoll mit Merkmal und Zahl der Fälle', () => {
    const kopie = JSON.parse(JSON.stringify(daten));
    const r = anonymisieren(daten, [{ art: 'entfernen', spalten: ['name'] }, { art: 'oben', spalte: 'alter' }, { art: 'lokal', k: 3, schluessel: ['a', 'b', 'c'] }]);
    expect(daten).toEqual(kopie);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(Object.keys(r.daten)).toEqual(['a', 'b', 'c', 'alter']);
    expect(r.protokoll[0]).toMatchObject({ art: 'entfernen', merkmal: 'name' });
    expect(r.protokoll.filter(z => z.art === 'lokal').map(z => z.merkmal)).toEqual(['a', 'b', 'c']);
    const lok = lokalUnterdruecken([f.daten.a, f.daten.b, f.daten.c], 3);
    expect(lok.ok && r.protokoll.filter(z => z.art === 'lokal').map(z => z.faelle)).toEqual(lok.ok ? lok.unterdrueckt : []);
    expect(r.saetze.length).toBeGreaterThanOrEqual(3);
    expect(r.saetze.join(' ')).toContain('„name“');
    expect(kennzahlen(haeufigkeiten([r.daten.a!, r.daten.b!, r.daten.c!]), 3).unterK).toBe(0);
  });
  it('Fehler: unbekannte Spalte, kein Schlüsselmerkmal, zu wenig Fälle', () => {
    expect(anonymisieren(daten, [{ art: 'oben', spalte: 'gibtsnicht' }])).toMatchObject({ ok: false, code: 'unbekannte-spalte' });
    expect(anonymisieren(daten, [{ art: 'lokal', schluessel: [] }])).toMatchObject({ ok: false, code: 'schluessel-fehlt' });
    expect(lokalUnterdruecken([['a', 'b']], 3)).toMatchObject({ ok: false, code: 'zu-wenig-faelle' });
  });
  it('Sätze deutsch, Bindestrich statt Gedankenstrich', () => {
    const t = anonymSaetze([{ art: 'oben', merkmal: 'Einkommen', faelle: 4, grenze: 5000, prozent: 99 }, { art: 'lokal', merkmal: 'Alter', faelle: 2, k: 3 }, { art: 'lokal', merkmal: 'Ort', faelle: 5, k: 3 }]).join(' ');
    expect(t).toContain('Einkommen'); expect(t).toContain('99-%-Perzentil'); expect(t).toContain('7 Angaben');
    expect(t).not.toMatch(/[–—]/);
    expect(kennzahlenSatz({ n: 10, k: 3, unterK: 2, anteilUnterK: 0.2, kleinsterFk: 1, wiedererkennung: 4.5 })).toContain('20,0 %');
  });
  it('bereits k-anonym: nichts unterdrückt', () => {
    const r = lokalUnterdruecken([['x', 'x', 'x'], ['p', 'p', 'p']], 3);
    expect(r.ok && r.unterdrueckt).toEqual([0, 0]);
  });
});
