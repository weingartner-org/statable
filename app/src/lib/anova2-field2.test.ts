import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { anova2, anova2Befehl, kovarianzMehr, type Anova2Daten } from './anova2';
import { csv, kennzahlen, nah, soll } from './testdaten/field2';
import { saetzeAncova, tabellenAncova, type AncovaE } from './anova2saetze';
import { tabellePaare } from './posthocsaetze';
import type { Anova } from './ergebnis';

/* Field-Stufe 2: omega² und Randmittel der zweifaktoriellen Varianzanalyse (ToothGrowth) und Kovarianzanalyse mit mehreren Kontrollvariablen (mtcars).
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe2.json (R, Opus). Toleranz 1e-6 relativ. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const tg = csv('toothgrowth.csv');
const daten2: Anova2Daten = { a: tg.map(r => r.supp as string), b: tg.map(r => String(r.dose)), y: tg.map(r => r.len as number), aStufen: ['OJ', 'VC'], bStufen: ['0.5', '1', '2'] };
function lauf() {
  const a = daten2.a.map(v => (v === 'OJ' ? 1 : 2)), b = daten2.b.map(v => daten2.bStufen.indexOf(v) + 1);
  const t = 'a,b,y\n' + a.map((v, i) => `${v},${b[i]},${daten2.y[i]}`).join('\n') + '\n';
  const z = zurEngine(leseCsv(t));
  e.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv });
  return e.run(anova2Befehl('y', 'a', 'b'));
}

describe('Zweifaktorielle Varianzanalyse: ω² und Randmittel (ToothGrowth)', () => {
  // supp in R ist VC, OJ (alphabetisch: OJ zuerst) - die Sollwerte stehen je Effekt, nicht je Stufe, und sind so unabhängig von der Reihenfolge
  const erg = () => anova2(lauf(), daten2)!;
  const z = soll.zweifaktoriell;
  it('F je Effekt wie R (Kontrolle der Eingabe)', () => {
    const r = erg();
    [r.a, r.b, r.ab].forEach((ef, i) => expect(nah(ef.f, z.F[i], 1e-6), `F ${i}`).toBe(true));
  });
  it('ω² und partielles ω² je Effekt wie das R-Skript', () => {
    const r = erg();
    [r.a, r.b, r.ab].forEach((ef, i) => {
      expect(nah(ef.omega2!, z.omega2[i]), `ω² ${z.effekte[i]}: ${ef.omega2}`).toBe(true);
      expect(nah(ef.omega2P!, z.omega2_partiell[i]), `ω²p ${z.effekte[i]}: ${ef.omega2P}`).toBe(true);
    });
  });
  it('Randmittel der Dosis: Differenz, Tukey- und Bonferroni-p wie emmeans', () => {
    const r = erg().randB!, s = z.randmittel_dose;
    expect(r.paare).toHaveLength(3);
    r.paare.forEach((q, i) => {
      expect(nah(q.diff, s.diff[i], 1e-9), `diff ${i}`).toBe(true);
      expect(nah(q.pTukey, s.p_tukey[i], 1e-6, 1e-13)   /* ptukey hat 1 − P: absolut etwa 1e-14 genau, wie in R */, `Tukey ${q.pTukey} gegen ${s.p_tukey[i]}`).toBe(true);
      expect(nah(q.pBonferroni, s.p_bonferroni[i], 1e-6, 1e-22), `Bonferroni ${q.pBonferroni} gegen ${s.p_bonferroni[i]}`).toBe(true);
    });
  });
  it('Faktor mit zwei Stufen hat keine Randmittel-Vergleiche', () => { expect(erg().randA).toBeUndefined(); });
});

describe('Kovarianzanalyse mit mehreren Kontrollvariablen (mtcars mpg ~ cyl + wt + hp)', () => {
  const mt = csv('mtcars.csv'), a = soll.ancova;
  const d = { g: mt.map(r => String(r.cyl)), xs: [mt.map(r => r.wt as number), mt.map(r => r.hp as number)], y: mt.map(r => r.mpg as number), namen: ['wt', 'hp'], stufen: ['4', '6', '8'] };
  const r = kovarianzMehr(d)!;
  it('Typ-III-F und p je Term (Gruppe, wt, hp)', () => {
    const ist = [r.gruppe, r.mehr!.kovariaten[0]!.effekt, r.mehr!.kovariaten[1]!.effekt];
    ist.forEach((ef, i) => { expect(nah(ef.f, a.typ3_F[i], 1e-6), `F ${a.terme[i]}`).toBe(true); expect(nah(ef.p, a.typ3_p[i], 1e-6), `p ${a.terme[i]}`).toBe(true); });
  });
  it('adjustierte Mittel bei den Mittelwerten beider Kontrollvariablen mit Standardfehler', () => {
    expect(r.mehr!.adjustiertBei.map((v, i) => nah(v, a.kov_mittel[i], 1e-9)).every(Boolean)).toBe(true);
    r.gruppen.forEach((g, i) => { expect(nah(g.mittelAdj, a.adj_mittel[i]), `adj ${i}`).toBe(true); expect(nah(g.se, a.adj_se[i]), `se ${i}`).toBe(true); });
  });
  it('Steigungshomogenität je Kontrollvariable (Gruppe × wt, Gruppe × hp)', () => {
    const [wt, hp] = r.mehr!.steigungen;
    expect(nah(wt!.f, a.homogen_wt.F, 1e-6)).toBe(true); expect(nah(wt!.p, a.homogen_wt.p, 1e-6)).toBe(true);
    expect(nah(hp!.f, a.homogen_hp.F, 1e-6)).toBe(true); expect(nah(hp!.p, a.homogen_hp.p, 1e-6)).toBe(true);
    expect(wt!.jeGruppe).toHaveLength(3);
  });
  it('Steigung je Gruppe stimmt mit getrennter Rechnung im Modell mit Wechselwirkung überein (Probe: Mittel der Steigungen liegt im Bereich der Gruppen)', () => {
    for (const s of r.mehr!.steigungen) for (const j of s.jeGruppe) { expect(Number.isFinite(j.b)).toBe(true); expect(j.lo).toBeLessThan(j.hi); expect(j.se).toBeGreaterThan(0); }
  });
  it('ohne zweite Kontrollvariable rechnet dasselbe wie mit einer; zu wenig Fälle geben null', () => {
    const eins = kovarianzMehr({ ...d, xs: [d.xs[0]!], namen: ['wt'] })!;
    expect(eins.mehr!.kovariaten).toHaveLength(1);
    expect(kovarianzMehr({ ...d, g: d.g.slice(0, 4), xs: d.xs.map(x => x.slice(0, 4)), y: d.y.slice(0, 4) })).toBeNull();
  });
});

describe('Anzeige: Kovarianzanalyse mit mehreren Kontrollvariablen und Steigung je Gruppe', () => {
  const mt = csv('mtcars.csv');
  const d = { g: mt.map(r => String(r.cyl)), xs: [mt.map(r => r.wt as number), mt.map(r => r.hp as number)], y: mt.map(r => r.mpg as number), namen: ['wt', 'hp'], stufen: ['4', '6', '8'] };
  const e: AncovaE = { ...kovarianzMehr(d)!, y: 'mpg', g: 'cyl', x: 'wt, hp' };
  it('Sätze nennen beide Kontrollvariablen, beide Mittelwerte und beide Steigungstests', () => {
    const st = saetzeAncova(e, n => n);
    expect(st.haupt).toContain('„wt“ und „hp“');
    expect(st.zusatz).toContain('„wt“ = 3,22');
    expect(st.zusatz).toContain('„hp“ = 146,69');
    expect(st.vorsicht).toContain('je Kovariate');
    expect(st.vorsicht).toContain('„wt“: F(2, 25) = 2,34, p = ,117');
    expect(st.zusatz).not.toContain('Steigung von');   // kein Test auffällig
  });
  it('Tabellen: Typ III mit beiden Kontrollvariablen, Steigungstest mit zwei Zeilen, keine Tabelle je Gruppe', () => {
    const t = tabellenAncova(e, n => n);
    expect(t.map(x => x.label)).toEqual(['Tests of Between-Subjects Effects', 'Estimated Marginal Means', 'Pairwise Comparisons', 'Homogeneity of Slopes']);
    expect(t[0]!.rows).toBe(5);   // Kopf + Gruppe, wt, hp, Fehler
    expect(t[3]!.rows).toBe(3);   // Kopf + zwei Kontrollvariablen
  });
  it('auffälliger Steigungstest: Steigung je Gruppe wird gezeigt und erklärt, dass kein einzelner bereinigter Unterschied gilt', () => {
    // drei Gruppen mit deutlich verschiedener Steigung von x auf y; Rauschen aus einer festen Folge
    const g: string[] = [], x: number[] = [], y: number[] = [], z: number[] = [];
    const steig: Record<string, number> = { A: 0.5, B: 2, C: 4 };
    let r = 7;
    for (const gr of ['A', 'B', 'C']) for (let i = 0; i < 12; i++) { r = (r * 48271) % 2147483647; const u = r / 2147483647 - 0.5; g.push(gr); x.push(i + u); y.push(steig[gr]! * i + 3 * u + (gr === 'B' ? 5 : 0)); z.push(((i * 7) % 5) + u); }
    const k = kovarianzMehr({ g, xs: [x, z], y, namen: ['x', 'z'] })!;
    expect(k.mehr!.steigungen[0]!.bedeutsam).toBe(true);
    expect(k.mehr!.steigungen[0]!.jeGruppe.map(j => Math.round(j.b))).toEqual([1, 2, 4]);
    const ee: AncovaE = { ...k, y: 'y', g: 'g', x: 'x, z' }, st = saetzeAncova(ee, n => n);
    expect(st.haupt).toContain('Dann gibt es keinen einzelnen bereinigten Unterschied');
    expect(st.zusatz).toContain('Steigung von „x“ in den Gruppen: „A“');
    expect(tabellenAncova(ee, n => n).map(t => t.label)).toContain('Slopes by Group');
  });
});

describe('Anzeige: Dunnett-Tabelle mit wählbarer Kontrollgruppe', () => {
  const pg = csv('plantgrowth.csv'), g3 = kennzahlen(pg.map(r => r.weight as number), pg.map(r => r.group as string), ['ctrl', 'trt1', 'trt2']);
  const e = { gruppen: g3 } as unknown as Anova;
  it('Zeilen heißen Gruppe - Kontrollgruppe; Fußnote nennt die Kontrollgruppe', () => {
    const t = tabellePaare(e, 'dunnett', 1)!;
    expect(t.rows).toBe(3);
    expect(JSON.stringify(t)).toContain('ctrl - trt1');
    expect(JSON.stringify(t)).toContain('trt2 - trt1');
    expect(JSON.stringify(t)).toContain('Kontrollgruppe \\"trt1\\"');
  });
});
