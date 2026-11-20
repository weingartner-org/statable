import { describe, expect, it, beforeEach } from 'vitest';
import { s } from './sitzung.svelte';
import { schutzStart, schutzRechnen, schutzProtokoll, schutzFassung, schutzKennzahlen, schutzWerte, type SchutzPlan } from './mikroschutz.svelte';
import { anonymisieren, haeufigkeiten, kennzahlen } from './anonym';
import type { Spalte } from './verzeichnis';

/* Paket M5b, Assistent „Mikrodaten schützen“: die Zahlen kommen aus anonym.ts (gegen sdcMicro belegt, anonym.test.ts); hier wird geprüft, dass der Assistent sie unverändert
 * weitergibt, das Protokoll vollständig ist, das Original (s.zeilen) unberührt bleibt (Rückgängig stellt es über den Verlauf her) und „keine Angabe“-Werte bleiben. */
s.einst.sprache = 'de';
const sp = (name: string, art: 'zahl' | 'text' = 'zahl', rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art, niveau: 'nominal', format: art === 'zahl' ? 'F8.0' : 'A8', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const orte = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'D', 'A', 'B'];
const alter = [30, 30, 30, 40, 40, 40, 50, 99, 30, 40];
const einkommen = [10, 20, 30, 40, 50, 60, 70, 800, 90, 100];
beforeEach(() => {
  s.spalten = [sp('id', 'text'), sp('ort', 'text'), sp('alter', 'zahl', { fehlend: [-9] }), sp('einkommen')];
  s.zeilen = orte.map((o, i) => [`P${i}`, o, i === 1 ? -9 : alter[i]!, einkommen[i]!]);
  s.gewicht = undefined;
});
const plan = (x: Partial<SchutzPlan> = {}): SchutzPlan => ({ ...schutzStart(), schluessel: ['ort', 'alter'], ...x });

describe('Mikrodaten schützen', () => {
  it('Kennzahlen sind die aus anonym.ts (ohne Gewicht; „keine Angabe“ ist fehlend und passt überall)', () => {
    const z = schutzKennzahlen(plan())!;
    const soll = kennzahlen(haeufigkeiten([schutzWerte('ort'), schutzWerte('alter')]), 3);
    expect(z).toEqual(soll);
    expect(schutzWerte('alter')[1]).toBeNull();
    expect(z.unterK).toBeGreaterThan(0);
  });
  it('Schritte und Protokoll: kappen, lokal unterdrücken, Spalte entfernen; Merkmal und Zahl der Fälle stehen drin', () => {
    const p = plan({ kappen: [{ spalte: 'einkommen', seite: 'oben', modus: 'grenze', wert: 100 }], entfernen: ['id'] });
    const e = schutzRechnen(p);
    expect(e.ok).toBe(true); if (!e.ok) return;
    expect(e.protokoll.map(z => [z.art, z.merkmal])).toEqual([['oben', 'einkommen'], ['lokal', 'ort'], ['lokal', 'alter'], ['entfernen', 'id']]);
    expect(e.protokoll[0]!.faelle).toBe(1);
    expect(e.nachher.unterK).toBe(0);
    const direkt = anonymisieren({ ort: schutzWerte('ort'), alter: schutzWerte('alter'), einkommen: schutzWerte('einkommen'), id: schutzWerte('id') }, [{ art: 'oben', spalte: 'einkommen', grenze: 100 }, { art: 'lokal', k: 3, schluessel: ['ort', 'alter'] }, { art: 'entfernen', spalten: ['id'] }]);
    expect(direkt.ok && direkt.daten).toEqual(e.daten);
    const text = schutzProtokoll(p, e);
    expect(text).toContain('Protokoll: Mikrodaten schützen');
    expect(text).toContain('„einkommen“'); expect(text).toContain('Die Spalte „id“ wurde entfernt.');
    expect(text).toContain('Vorher:'); expect(text).toContain('Nachher:');
    expect(text).toContain('k-Anonymität schützt nicht vor allem. Vor der Weitergabe prüft die zuständige Stelle.');
  });
  it('Neue Fassung: Original bleibt, Spalte weg, unterdrückt = leer, „keine Angabe“ bleibt der Code', () => {
    const vorher = JSON.stringify(s.zeilen);
    const p = plan({ entfernen: ['id'] }), e = schutzRechnen(p);
    expect(e.ok).toBe(true); if (!e.ok) return;
    const f = schutzFassung(p, e);
    expect(f.spalten.map(c => c.name)).toEqual(['ort', 'alter', 'einkommen']);
    expect(f.zeilen).toHaveLength(10); expect(f.zeilen[0]).toHaveLength(3);
    expect(JSON.stringify(s.zeilen)).toBe(vorher);   // Rückgängig braucht das Original unverändert
    expect(f.zeilen[1]![1]).toBe(-9);                // war schon „keine Angabe“, bleibt
    const leer = f.zeilen.flat().filter(v => v === null).length;
    expect(leer).toBe(e.protokoll.filter(z => z.art === 'lokal').reduce((a, z) => a + z.faelle, 0));
    expect(f.zeilen[7]![0] === null || f.zeilen[7]![1] === null).toBe(true);   // der Einzelfall D/99 verliert eine Angabe
  });
  it('Fehler: ohne Schlüsselmerkmal ein Satz', () => {
    const e = schutzRechnen(plan({ schluessel: [] }));
    expect(e.ok).toBe(false); if (!e.ok) expect(e.satz).toContain('Schlüsselmerkmal');
  });
  it('Gewicht des Projekts geht in die Kennzahlen (Fk)', () => {
    s.spalten = [...s.spalten, sp('gewicht')]; s.zeilen = s.zeilen.map((z, i) => [...z, i === 7 ? 1000 : 1]);
    s.gewicht = { spalte: 'gewicht', art: 'umfrage' };
    const mit = schutzKennzahlen(plan())!, ohne = schutzKennzahlen(plan({ mitGewicht: false }))!;
    expect(mit.unterK).toBe(ohne.unterK);
    expect(mit.wiedererkennung).not.toBeCloseTo(ohne.wiedererkennung, 3);
  });
});
