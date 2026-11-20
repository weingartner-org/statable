import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { kreuz, saetzeKreuz, saetzeVerteilung, verteilung } from './ergebnis';
import { korrigiereAusgabe } from '../engine/korrektur';
import { teile } from './kursiv';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('Kreuztabelle: Sätze und Zeile für die Arbeit (Test 07.10.: bisher leer)', () => {
  it('Beispieldaten: χ²-Zeile wie in der Übergabe, Cramérs V dazu', () => {
    const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
    e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    const r = kreuz(korrigiereAusgabe(e.run('CROSSTABS /TABLES=geschlecht BY handy_im_bett /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.')));
    const st = saetzeKreuz(r);
    expect(st.apa).toMatch(/^χ²\(\d+, N = \d+\) = \d+,\d\d, p = ,\d{3}, V = ,\d\d, 95 %-KI \[,\d\d; ,\d\d\]$/);
    expect(teile(st.apa).filter(x => x.stil === 'italic').map(x => x.t)).toEqual(['N', 'p', 'V']);
  });
  it('Kursfall nachgestellt: 3 von 10 Zellen unter 5 erwartet → Hinweis', () => {
    // Geschlecht (24 / 171) × Beschäftigung (5 Stufen) wie im SPSS-Vergleich: χ² = 0,46, df 4, p = ,978.
    const z = [[5, 5, 8, 5, 1], [32, 40, 62, 28, 9]];
    const daten = z.flatMap((reihe, g) => reihe.flatMap((n, b) => Array.from({ length: n }, () => `${g} ${b + 1}`))).join('\n');
    const items = korrigiereAusgabe(e.run(`NEW FILE.
DATA LIST FREE /DA02 DA07.
BEGIN DATA
${daten}
END DATA.
VARIABLE LABELS DA02 'Geschlecht' /DA07 'Beschäftigung während des Studiums'.
VALUE LABELS DA02 0 'männlich' 1 'weiblich' /DA07 1 'nein' 2 'ja, Gelegenheitsjobs' 3 'ja, geringfügig' 4 'ja, teilzeit' 5 'ja, vollzeit'.
CROSSTABS /TABLES=DA02 BY DA07 /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.`));
    const r = kreuz(items);
    expect([r.unter5, r.zellen, r.df, r.n, r.gruppen, r.gezaehlt]).toEqual([3, 10, 4, 195, 'Geschlecht', 'Beschäftigung während des Studiums']);
    const st = saetzeKreuz(r);
    expect(st.apa).toBe('χ²(4, N = 195) = 0,46, p = ,978, V = ,05'); // V außerhalb des gestutzten KI → kein KI (ENTSCHEIDUNGEN Nr. 24)
    expect(st.haupt).toBe('In beiden Gruppen von „Geschlecht“ ist bei „Beschäftigung während des Studiums“ „ja, geringfügig“ am häufigsten (33 % und 36 %).');
    expect(st.zusatz).toContain('In 3 von 10 Zellen werden weniger als 5 Personen erwartet');
    expect(st.zusatz).toContain('belegen darum keinen Unterschied');
    expect(st.marken.some(m => m.hinweis && m.erklaer === 'chi-quadrat')).toBe(true);
  });
  it('2 × 2 mit kleinen Zellen: nennt den exakten Test nach Fisher', () => {
    const r = kreuz(korrigiereAusgabe(e.run(`NEW FILE.
DATA LIST FREE /a b.
BEGIN DATA
1 1 1 1 1 1 1 2 2 2 2 2 2 2 2 1
END DATA.
CROSSTABS /TABLES=a BY b /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.`)));
    expect(r.fisherP).toBeDefined();
    const st = saetzeKreuz(r);
    // T1: Fisher gilt dann für Satz und Marke, χ² steht zum Vergleich daneben.
    expect(st.zusatz).toMatch(/\(exakter Test nach Fisher, p [=<>] ,\d{3}\)/);
    expect(st.zusatz).toMatch(/darum gilt hier der exakte Test nach Fisher \(Chi-Quadrat zum Vergleich: p [=<>] ,\d{3}\)/);
    expect(st.marken.find(m => m.erklaer === 'p-wert')!.text).toMatch(/\(Fisher\)/);
  });
});

describe('Verteilung: Sätze und Zeile für die Arbeit', () => {
  it('Zahl und Gruppe zusammen, fehlende Angabe genannt', () => {
    const items = korrigiereAusgabe(e.run(`NEW FILE.
DATA LIST FREE /f g.
BEGIN DATA
1 0 2 1 3 1 4 1 5 1 3 0 2 -99
END DATA.
MISSING VALUES g (-99).
VARIABLE LABELS f 'Frage 22' /g 'Geschlecht'.
VALUE LABELS f 1 'sehr selten' 5 'sehr oft' /g 0 'männlich' 1 'weiblich'.
DESCRIPTIVES /VARIABLES=f /STATISTICS=MEAN STDDEV MIN MAX.
FREQUENCIES /VARIABLES=g /STATISTICS=NONE.`));
    const v = verteilung(items);
    expect(v.zahlen.map(z => [z.name, z.n, z.min, z.max])).toEqual([['Frage 22', 7, 1, 5]]);
    expect(v.gruppen.map(g => [g.name, g.n, g.fehlend])).toEqual([['Geschlecht', 6, 1]]);
    const st = saetzeVerteilung(v);
    expect(st.haupt).toBe('Bei „Frage 22“ liegt der Mittelwert bei 2,9; die Werte reichen von 1 bis 5.');
    expect(st.zusatz).toBe('Bei „Geschlecht“ ist „weiblich“ mit 67 % am häufigsten, dann „männlich“ mit 33 %. Bei „Geschlecht“ fehlt 1 Angabe.');
    expect(st.apa).toBe('Frage 22: M = 2,86, SD = 1,35, n = 7; Geschlecht: 33,3 % männlich, 66,7 % weiblich, n = 6');
  });
});
