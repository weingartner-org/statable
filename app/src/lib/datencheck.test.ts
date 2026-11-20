import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten } from './einlesen';
import { pruefe, schreibweisen, type SpalteDaten } from './datencheck';

function spalten(datei: string): SpalteDaten[] {
  const t = leseCsv(readFileSync(new URL(datei, import.meta.url), 'utf8'));
  return planeSpalten(t).map((p, i) => ({
    name: p.name, bezeichnung: p.bezeichnung, art: p.art === 'zahl' ? 'zahl' : 'text', fehlend: [],
    werte: t.zeilen.map(z => (p.art === 'zahl' ? alsZahl(z[i] ?? null) : (z[i] as string | null)))
  }));
}

describe('Daten-Check mit den Beispieldaten', () => {
  const funde = pruefe(spalten('./testdaten/schlaf-und-konzentration-roh.csv'));
  it('findet genau die vier eingebauten Funde', () => {
    expect(funde.map(f => `${f.art}:${f.spalte}`)).toEqual(['schreibweise:geschlecht', 'platzhalter:schlaf_stunden', 'leer:schlaf_stunden', 'ausreisser:konzentration']);
  });
  it('ordnet die Schreibweisen richtig zu', () => {
    const f = funde[0]!; if (f.art !== 'schreibweise') throw new Error();
    expect(f.zuordnung).toEqual({ w: 'weiblich', Weiblich: 'weiblich', 'männl.': 'männlich', m: 'männlich' });
    expect(f.nachher).toEqual({ weiblich: 84, männlich: 35, divers: 1 });
  });
  it('erkennt 99 als Platzhalter und rechnet die Mittelwerte vorher/nachher', () => {
    const f = funde[1]!; if (f.art !== 'platzhalter') throw new Error();
    expect([f.wert, f.anzahl, f.mittelVorher.toFixed(2), f.mittelNachher.toFixed(2)]).toEqual([99, 2, '8.43', '6.86']);
  });
  it('meldet Nr. 76 (Zeile 75) als auffällig', () => {
    const f = funde[3]!; if (f.art !== 'ausreisser') throw new Error();
    expect([f.wert, f.zeile, f.spanne]).toEqual([9, 75, [26, 88]]);
  });
});

describe('Schreibweisen mit ae statt ä (Test 07.10.)', () => {
  it('„maennlich“ wird „männlich“ zugeordnet', () => {
    const werte = [...Array(15).fill('weiblich'), ...Array(15).fill('männlich'), 'maennlich', 'maennlich', 'm'];
    const f = schreibweisen({ name: 'g', bezeichnung: 'g', art: 'text', fehlend: [], werte });
    expect(f && f.art === 'schreibweise' ? f.zuordnung : null).toEqual({ maennlich: 'männlich', m: 'männlich' });
  });
});
