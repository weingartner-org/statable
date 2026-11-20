/**
 * Prüftests Stufe 6c (Paket 6c1), Modell: Feld `zusammenfassungen`, Aufräumen, Umbenennen.
 * Sollwerte: docs/erheben/FACHBLATT-STUFE-6C.md, Abschnitte 1.2, 1.5, 2.2 und 2.5 (Opus). Der Bauer ändert diese Datei nicht.
 * Vor dem Bau rot: `setzeZusammenfassung` (lib/kodieren-ansichten.ts) und die Umbenennen-Funktionen (lib/kodieren.ts) fehlen noch.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { setzeZusammenfassung } from './kodieren-ansichten';
import {
  benenneFallUm, benenneVariableUm, entferneCode, entferneFall, fallNameFrei, legeVariableAn, setzeWert, variableNameFrei,
} from './kodieren';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';

const PFAD = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
const roh = (): Record<string, unknown> => JSON.parse(readFileSync(PFAD, 'utf8')) as Record<string, unknown>;
const q: QualProjekt = pruefeQualProjekt(roh());

describe('2.2 entferneFall / entferneCode räumen Zusammenfassungen auf', () => {
  const mit = (): QualProjekt => {
    let p = setzeZusammenfassung(q, 'f1', 'c1', 'Lernt abends.');
    p = setzeZusammenfassung(p, 'f1', 'c4', 'Schwester.');
    p = setzeZusammenfassung(p, 'f2', 'c4', 'Familie hilft.');
    p = setzeZusammenfassung(p, 'dok:d4', 'c4', 'Eltern fragen nach.');
    return p;
  };

  it('Ausgangslage: vier Einträge', () => {
    expect(mit().zusammenfassungen).toHaveLength(4);
  });

  it('entferneFall f1: kein Eintrag mehr mit zeile === f1, die anderen bleiben', () => {
    const r = entferneFall(mit(), 'f1');
    expect(r.zusammenfassungen!.some(z => z.zeile === 'f1')).toBe(false);
    expect(r.zusammenfassungen!.map(z => z.zeile).sort()).toEqual(['dok:d4', 'f2']);
  });

  it('entferneCode c4: kein Eintrag mehr mit code === c4, die anderen bleiben', () => {
    const r = entferneCode(mit(), 'c4');
    expect(r.zusammenfassungen!.some(z => z.code === 'c4')).toBe(false);
    expect(r.zusammenfassungen!.map(z => z.code)).toEqual(['c1']);
  });

  it('beide nacheinander: leere Liste oder fehlendes Feld, kein Fehler', () => {
    const r = entferneCode(entferneFall(mit(), 'f1'), 'c4');
    expect(r.zusammenfassungen ?? []).toEqual([]);
  });

  it('Projekt ohne Feld: entferneFall und entferneCode laufen ohne Fehler', () => {
    expect(() => entferneFall(q, 'f1')).not.toThrow();
    expect(() => entferneCode(q, 'c4')).not.toThrow();
    expect(entferneFall(q, 'f1').zusammenfassungen ?? []).toEqual([]);
  });
});

describe('1.2 pruefeQualProjekt und das Feld zusammenfassungen', () => {
  const Z = [
    { zeile: 'f1', code: 'c1', text: 'Lernt abends.', geaendert: 123 },
    { zeile: 'dok:d4', code: 'c4', text: 'Eltern fragen nach.', geaendert: 124, kodierende: 'p1' },
  ];

  it('liest ein Projekt mit zusammenfassungen unverändert zurück', () => {
    const r = pruefeQualProjekt({ ...roh(), zusammenfassungen: Z });
    expect(r.zusammenfassungen).toEqual(Z);
    expect(r.version).toBe(1);
  });

  it('Hin- und Rückweg über JSON bleibt gleich', () => {
    const r = pruefeQualProjekt({ ...roh(), zusammenfassungen: Z });
    expect(pruefeQualProjekt(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('ohne Feld: gültig, Feld bleibt weg, version 1', () => {
    const r = pruefeQualProjekt(roh());
    expect(r.version).toBe(1);
    expect('zusammenfassungen' in r).toBe(false);
  });

  it('unbekannte Codes oder Zeilen sind beim Lesen kein Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: [{ zeile: 'f9', code: 'c1', text: 'x', geaendert: 1 }, { zeile: 'f1', code: 'c9', text: 'y', geaendert: 1 }] })).not.toThrow();
  });

  it('leere zeile: Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: [{ zeile: '', code: 'c1', text: 'x', geaendert: 1 }] })).toThrow();
  });

  it('leerer code: Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: [{ zeile: 'f1', code: '', text: 'x', geaendert: 1 }] })).toThrow();
  });

  it('geaendert keine Zahl: Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: [{ zeile: 'f1', code: 'c1', text: 'x', geaendert: 'gestern' }] })).toThrow();
  });

  it('text kein Text: Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: [{ zeile: 'f1', code: 'c1', text: 5, geaendert: 1 }] })).toThrow();
  });

  it('zusammenfassungen keine Liste: Fehler', () => {
    expect(() => pruefeQualProjekt({ ...roh(), zusammenfassungen: 'x' })).toThrow();
  });
});

describe('2.5 Umbenennen von Fall und Variable', () => {
  it('fallNameFrei: ohne Rücksicht auf Groß/klein, ausser, leer', () => {
    expect(fallNameFrei(q, 'ANNA')).toBe(false);
    expect(fallNameFrei(q, 'anna')).toBe(false);
    expect(fallNameFrei(q, 'Anna', 'f1')).toBe(true);
    expect(fallNameFrei(q, 'Anna', 'f2')).toBe(false);
    expect(fallNameFrei(q, 'Dora')).toBe(true);
    expect(fallNameFrei(q, '')).toBe(false);
    expect(fallNameFrei(q, '   ')).toBe(false);
    expect(fallNameFrei(q, '  Dora  ')).toBe(true);
    expect(fallNameFrei(q, '  anna  ')).toBe(false);
  });

  it('benenneFallUm: Name wird gekürzt', () => {
    const r = benenneFallUm(q, 'f2', '  Benedikt ');
    expect(r.faelle.find(f => f.id === 'f2')!.name).toBe('Benedikt');
    expect(r.faelle.map(f => f.id)).toEqual(['f1', 'f2', 'f3']);
    expect(r.faelle.find(f => f.id === 'f1')!.name).toBe('Anna');
  });

  it('benenneFallUm: besetzter Name, leerer Name, unbekannte id: dasselbe Objekt', () => {
    expect(benenneFallUm(q, 'f2', 'anna')).toBe(q);
    expect(benenneFallUm(q, 'f2', '   ')).toBe(q);
    expect(benenneFallUm(q, 'f9', 'Neu')).toBe(q);
  });

  it('benenneFallUm: anderer Schreibweise desselben Falls ist erlaubt (ausser = eigene id)', () => {
    const r = benenneFallUm(q, 'f1', 'ANNA');
    expect(r.faelle.find(f => f.id === 'f1')!.name).toBe('ANNA');
  });

  it('benenneFallUm: verändert das Ausgangsprojekt nicht; Zuordnung der Dokumente bleibt', () => {
    const vorher = JSON.stringify(q);
    const r = benenneFallUm(q, 'f1', 'Annika');
    expect(JSON.stringify(q)).toBe(vorher);
    expect(r.dokumente.map(d => d.fall)).toEqual(q.dokumente.map(d => d.fall));
  });

  // Projekt mit Variablen; Werte hängen an der Variablen-id
  const mitVar = (() => {
    const a = legeVariableAn(q, 'Alter', 'ganzzahl');
    const b = legeVariableAn(a.q, 'Beruf', 'text');
    let r = setzeWert(b.q, 'f1', a.id, 31);
    r = setzeWert(r, 'f2', a.id, 25);
    r = setzeWert(r, 'f1', b.id, 'Lehrerin');
    return { p: r, alter: a.id, beruf: b.id };
  })();

  it('variableNameFrei', () => {
    const { p, alter, beruf } = mitVar;
    expect(variableNameFrei(p, 'ALTER')).toBe(false);
    expect(variableNameFrei(p, 'alter', alter)).toBe(true);
    expect(variableNameFrei(p, 'alter', beruf)).toBe(false);
    expect(variableNameFrei(p, 'Größe')).toBe(true);
    expect(variableNameFrei(p, '')).toBe(false);
    expect(variableNameFrei(p, '  ')).toBe(false);
  });

  it('benenneVariableUm: Name gekürzt, Werte unter derselben id bleiben gleich', () => {
    const { p, alter } = mitVar;
    const r = benenneVariableUm(p, alter, '  Lebensalter ');
    expect(r.variablen.find(v => v.id === alter)!.name).toBe('Lebensalter');
    expect(r.variablen.find(v => v.id === alter)!.typ).toBe('ganzzahl');
    expect(r.faelle).toEqual(p.faelle);
    expect(r.faelle.find(f => f.id === 'f1')!.werte[alter]).toBe(31);
  });

  it('benenneVariableUm: besetzt, leer, unbekannte id: dasselbe Objekt', () => {
    const { p, alter } = mitVar;
    expect(benenneVariableUm(p, alter, 'beruf')).toBe(p);
    expect(benenneVariableUm(p, alter, '   ')).toBe(p);
    expect(benenneVariableUm(p, 'v-gibt-es-nicht', 'Neu')).toBe(p);
  });
});
