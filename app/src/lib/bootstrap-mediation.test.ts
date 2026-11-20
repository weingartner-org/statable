import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { mediation, mediationBefehl, mediationZiehung } from './mediation';
import { tabellenMediation, saetzeMediation } from './medmodsaetze';
import { bootstrapGerechnet, bootstrapHinweise, bootstrapKurz } from './bootstrapsaetze';
import { s } from './sitzung.svelte';

/* Eigene Tests des Baus (Welle S-A, Teil 2): die Mediation auf der gemeinsamen Bootstrap-Grundlage - BCa wählbar, Perzentil bleibt Voreinstellung, Sätze nennen Methode, B und Startwert. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
let e: Awaited<ReturnType<typeof nodeEngine>>;
let daten: { x: number[]; m: number[]; y: number[] };
beforeAll(async () => {
  e = await nodeEngine();
  const csv = readFileSync(new URL('./testdaten/mediation-moderation.csv', import.meta.url), 'utf8');
  const b = zurEngine(leseCsv(csv));
  e.run(b.syntax, { '/import.csv': b.csv });
  const roh = leseCsv(csv), sp = (n: string) => roh.kopf.indexOf(n);
  const zahl = (v: unknown) => (typeof v === 'string' ? Number(v.replace(',', '.')) : NaN);
  const z = roh.zeilen.map(r => [r[sp('unterstuetzung')], r[sp('selbstwirksamkeit')], r[sp('wohlbefinden')]].map(zahl)).filter(r => r.every(Number.isFinite));
  daten = { x: z.map(r => r[0]!), m: z.map(r => r[1]!), y: z.map(r => r[2]!) };
});
const lauf = (art: 'perzentil' | 'bca' | undefined, ziehungen = 2000) => {
  const items = e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden'));
  return mediation(items, 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', daten, 150, undefined, ziehungen, undefined, art);
};

describe('Mediation: Perzentil ist die Voreinstellung, BCa wählbar (Entscheidung Opus)', () => {
  it('ohne Angabe: Perzentil, B = 5000, Startwert 20261008, keine Warnung', async () => {
    const r = await lauf(undefined, 5000);
    expect(r.intervallArt).toBe('perzentil'); expect(r.intervallWunsch).toBe('perzentil'); expect(r.ziehungen).toBe(5000); expect(r.startwert).toBe(20261008);
    expect(r.ungueltig).toBe(0); expect(r.bootWarnungen).toEqual([]);
  });
  it('BCa: andere Grenzen als das Perzentil-Intervall, aber in der Nähe der R-Werte (Perzentil 0,2735 / 0,5840); der Punktschätzer bleibt', async () => {
    const p = await lauf('perzentil', 5000), b = await lauf('bca', 5000);
    expect(b.intervallArt).toBe('bca'); expect(b.ab).toBe(p.ab);
    expect(b.abLo).not.toBe(p.abLo); expect(Math.abs(b.abLo - 0.2735)).toBeLessThan(0.05); expect(Math.abs(b.abHi - 0.584)).toBeLessThan(0.05);
    expect(b.abLo).toBeLessThan(b.ab); expect(b.abHi).toBeGreaterThan(b.ab);
    expect(Number.isFinite(b.abStdLo) && Number.isFinite(b.abStdHi)).toBe(true);
  });
  it('gleiche Ziehungen für beide Arten: derselbe Startwert gibt dieselbe Verteilung', () => {
    const a = mediationZiehung(daten, 20261008, 300), c = mediationZiehung(daten, 20261008, 300);
    a.ziehung.weiter(300); c.ziehung.weiter(100); c.ziehung.weiter(200);
    expect(a.ziehung.t).toEqual(c.ziehung.t); expect(a.abStd).toEqual(c.abStd);
  });
});

describe('Sätze: „Gerechnet“ nennt Methode, B und Startwert', () => {
  it('Tabellenfuß der Mediation (Perzentil und BCa)', async () => {
    const p = tabellenMediation(await lauf('perzentil', 400)), b = tabellenMediation(await lauf('bca', 400));
    const textP = JSON.stringify(p), textB = JSON.stringify(b);
    expect(textP).toMatch(/Perzentil-Intervall, B = 400 Ziehungen/); expect(textP).toContain('Startwert 20261008');
    expect(textB).toMatch(/BCa-Intervall.*B = 400 Ziehungen/); expect(textB).toContain('Startwert 20261008');
  });
  it('alte Projekte ohne die neuen Felder lesen sich als Perzentil', async () => {
    const r = await lauf('perzentil', 300); const alt = { ...r } as Partial<typeof r>; delete alt.intervallArt; delete alt.intervallWunsch; delete alt.bootWarnungen; delete alt.ungueltig; delete alt.kleinN;
    expect(JSON.stringify(tabellenMediation(alt as typeof r))).toMatch(/Perzentil-Intervall/); expect(() => saetzeMediation(alt as typeof r)).not.toThrow();
  });
  it('Kurzform für die Zeile „Gerechnet“', () => {
    expect(bootstrapKurz({ intervallArt: 'bca', ziehungen: 5000, startwert: 20261008 })).toBe('Mediationsanalyse, indirekter Effekt mit Bootstrap (BCa-Intervall, B = 5000, Startwert 20261008)');
    expect(bootstrapKurz({ ziehungen: 5000, startwert: 1 })).toContain('Perzentil-Intervall');
  });
  it('Hinweise: Hesterberg unter 30, ungültige Ziehungen, Warnungen als Sätze - nie leer, nie NaN', () => {
    const basis = { art: 'bca' as const, ziehungen: 5000, startwert: 1, n: 40 };
    expect(bootstrapHinweise(basis)).toEqual([]);
    expect(bootstrapHinweise({ ...basis, n: 29 }).join(' ')).toMatch(/29 Personen.*zu schmal/);
    expect(bootstrapHinweise({ ...basis, ungueltig: 3 })[0]).toMatch(/^3 von 5000 Ziehungen/); expect(bootstrapHinweise({ ...basis, ungueltig: 3 })[0]).not.toMatch(/mehr als 1 %/);
    expect(bootstrapHinweise({ ...basis, ungueltig: 80 })[0]).toMatch(/mehr als 1 %/);
    for (const w of ['rand', 'z0unendlich', 'viele-gleiche', 'a-undefiniert'] as const) { const h = bootstrapHinweise({ ...basis, warnungen: [w] }); expect(h.length).toBe(1); expect(h[0]).not.toMatch(/NaN|undefined/); }
    expect(bootstrapGerechnet({ art: 'bca', ziehungen: 9999, startwert: 7, n: 12 })).toMatch(/BCa-Intervall.*B = 9999.*Startwert 7/);
  });
});
