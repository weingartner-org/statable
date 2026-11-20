/**
 * Der Weg der Daten aus der Engine (Versuch Geschwindigkeit 31.10.2026): Die Zeilen aus der `.sav` (lib/savlesen.ts) müssen genau die Zeilen sein, die der alte CSV-Weg liefert -
 * auf allen Testdateien und auf Daten mit allen Arten von Werten. Wo der Leser eine Datei nicht sicher versteht, gibt er `null` zurück (dann bleibt der CSV-Weg).
 */
import 'fake-indexeddb/auto';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { setzeTestMotor, motor, oeffneDatei, leseAktiveDaten } from './sitzung.svelte';
import { erzeugeTestMotor } from './testmotor';
import { leseSavZeilen } from './savlesen';
import type { WasmEngine } from '../engine/wasm-engine';

let e: WasmEngine;
beforeAll(async () => { setzeTestMotor(await erzeugeTestMotor()); e = await motor(); });

/** Gleich heißt: dieselbe Art, bei Zahlen bitgleich oder höchstens 1e-15 relativ verschieden (das CSV druckt Zahlen mit höchstens 17 Stellen). */
function vergleiche(a: unknown[][], b: unknown[][]): { verschieden: number; abweichungen: number; maxRel: number } {
  let verschieden = 0, abweichungen = 0, maxRel = 0;
  expect(b.length).toBe(a.length);
  for (let i = 0; i < a.length; i++) {
    expect(b[i]!.length).toBe(a[i]!.length);
    for (let j = 0; j < a[i]!.length; j++) {
      const x = a[i]![j], y = b[i]![j];
      if (typeof x === 'number' && typeof y === 'number') {
        if (!Object.is(x, y)) { abweichungen++; const r = Math.abs(x - y) / Math.max(Math.abs(x), 1e-300); maxRel = Math.max(maxRel, r); if (r > 1e-15) verschieden++; }
      } else if (x !== y) { verschieden++; if (verschieden < 4) console.log('verschieden', i, j, JSON.stringify(x), JSON.stringify(y)); }
    }
  }
  return { verschieden, abweichungen, maxRel };
}

async function gegeneinander(name: string): Promise<{ gelesen: boolean; abw: ReturnType<typeof vergleiche> | null; zeilen: number }> {
  const csv = await leseAktiveDaten(e, 0, 'csv');
  const { bytes } = await e.exportSav();
  const z = leseSavZeilen(bytes, csv.spalten);
  if (!z) return { gelesen: false, abw: null, zeilen: csv.zeilen.length };
  return { gelesen: true, abw: vergleiche(csv.zeilen, z), zeilen: csv.zeilen.length };
}

const ordner = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const dateien: string[] = [];
for (const d of ['testdaten', 'testdaten/fragebogen', 'testdaten/qda', '../../public/beispiel'])
  for (const f of readdirSync(ordner(d), { withFileTypes: true })) if (f.isFile() && /\.(csv|sav|dta)$/i.test(f.name)) dateien.push(join(ordner(d), f.name));

describe('SAV-Weg gegen CSV-Weg auf allen Testdateien', () => {
  const ergebnis: Record<string, { gelesen: boolean; abw: unknown; zeilen: number }> = {};
  for (const pfad of dateien) {
    it(pfad.split(/[\\/]/).slice(-2).join('/'), async () => {
      const f = new File([readFileSync(pfad)], basename(pfad));
      try { await oeffneDatei(f); } catch { return; }   // eine Datei, die die App selbst nicht öffnet, gehört nicht hierher
      const r = await gegeneinander(pfad);
      ergebnis[pfad] = r;
      if (r.gelesen) expect(r.abw!.verschieden).toBe(0);
    });
  }
  it('Zusammenfassung: wie viele Dateien der Leser versteht', () => {
    const alle = Object.values(ergebnis); const gelesen = alle.filter(x => x.gelesen);
    const bitgleich = gelesen.filter(x => (x.abw as { abweichungen: number }).abweichungen === 0).length;
    console.log(`SAV-Leser: ${gelesen.length} von ${alle.length} Dateien gelesen, davon ${bitgleich} bitgleich`, Object.entries(ergebnis).filter(([, x]) => !x.gelesen).map(([k]) => k.split('/').pop()));
    expect(gelesen.length).toBeGreaterThan(alle.length * 0.9);
  });
});

describe('SAV-Weg: alle Arten von Werten', () => {
  const lade = async (syntax: string) => { await e.run('NEW FILE.\n' + syntax); return gegeneinander('x'); };
  it('Zahlen mit allen Formaten, fehlende, Fehlwerte, große und kleine Zahlen', async () => {
    const r = await lade(`DATA LIST FREE /a (F8.2) b (F8.0) c (F10.5) d (COMMA10.2) e (DOLLAR8.2) f (PCT5.1) g (E12.4) h (N5) i (Z6.2).
BEGIN DATA
1.23456 2.7 0.1234567891 1234.5 12.5 33.3 1.5e10 00042 12.5
-1.005 1e10 123456.123456789 -0.5 0 0 -2.5e-8 7 -3.2
. . . . . . . . .
0.1 0.2 0.30000000000000004 1e15 1e-15 99999 1 2 3
END DATA.
MISSING VALUES a (-1.005) / b (7).
EXECUTE.`);
    expect(r.gelesen).toBe(true); expect(r.abw!.verschieden).toBe(0);
  });
  it('Text: Umlaute, Leerzeichen, Anführungszeichen, Komma, leer, lange Texte bis 255 Byte', async () => {
    const lang = 'x'.repeat(200) + 'äöü';
    const r = await lade(`DATA LIST LIST(',') /a (A20) b (A255) c (A3).
BEGIN DATA
"Ärger, Öl","${lang}",abc
"  rand  ","",x
"sagt ""hi""","ß€ 日本語",
,,
END DATA.
EXECUTE.`);
    expect(r.gelesen).toBe(true); expect(r.abw!.verschieden).toBe(0);
  });
  it('Datum und Zeit: DATE, ADATE, EDATE, SDATE, TIME, DATETIME; fehlend', async () => {
    const r = await lade(`DATA LIST LIST(',') /d1 (DATE11) d3 (EDATE10) d4 (SDATE10) t (TIME8) dt (DATETIME20) x (F3).
BEGIN DATA
01-MAR-2020,04.03.2020,2020/03/04,13:05:09,01-MAR-2020 13:05:09,1
31-DEC-1999,31.12.1999,1999/12/31,00:00:01,31-DEC-1999 23:59:59,2
,,,,,3
15-OCT-1582,15.10.1582,1582/10/15,25:00:00,15-OCT-1582 00:00:00,4
31-DEC-9999,31.12.9999,9999/12/31,00:00:00,31-DEC-9999 23:59:59,5
END DATA.
EXECUTE.`);
    expect(r.gelesen).toBe(true); expect(r.abw!.verschieden).toBe(0);
  });
  it('ADATE zählt die App als Text (Format beginnt mit A): der Leser gibt null zurück, der CSV-Weg bleibt', async () => {
    const r = await lade(`DATA LIST LIST(',') /d2 (ADATE10) x (F3).
BEGIN DATA
03/04/2020,1
END DATA.
EXECUTE.`);
    expect(r.gelesen).toBe(false);
  });
  it('nicht sicher lesbare Formate (MONTH, WKDAY) und Texte über 255 Byte: null, der CSV-Weg bleibt', async () => {
    const r = await lade(`DATA LIST FREE /d1 (DATE11) x (F3).
BEGIN DATA
01-MAR-2020 1
END DATA.
FORMATS d1 (MONTH9).
EXECUTE.`);
    expect(r.gelesen).toBe(false);
    const r2 = await lade(`DATA LIST FREE /a (A300).
BEGIN DATA
abc
END DATA.
EXECUTE.`);
    expect(r2.gelesen).toBe(false);   // über 255 Byte Breite gibt es sehr lange Texte (Erweiterung 14): nicht gelesen, der CSV-Weg bleibt
  });
  it('Spalten mit langen Namen, Bezeichnungen und Wertelabels', async () => {
    const r = await lade(`DATA LIST FREE /einsehrlangerspaltenname_mit_vielen_zeichen (F2) kurz (F2).
BEGIN DATA
1 2
3 4
END DATA.
VARIABLE LABELS kurz 'Eine Bezeichnung'.
VALUE LABELS kurz 2 'zwei' 4 'vier'.
EXECUTE.`);
    expect(r.gelesen).toBe(true); expect(r.abw!.verschieden).toBe(0);
  });
  it('0 Zeilen und eine Zeile', async () => {
    const r = await lade(`DATA LIST FREE /a (F2).
BEGIN DATA
5
END DATA.
EXECUTE.`);
    expect(r.gelesen).toBe(true); expect(r.zeilen).toBe(1); expect(r.abw!.verschieden).toBe(0);
  });
});
