/**
 * Prüfrunde 07.10.2026 - Schicht 3 und 4 (eigene Rechnung, Sätze) an den Grenzfällen D3 (pruefdaten/d3-grenzfaelle.csv).
 * Vergleichswerte aus R 4.6 (psych::alpha, mean/length). Die Zahlen der Tabellen prüft pruefsuite.test.ts.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { korrigiereAusgabe } from '../engine/korrektur';
import { leseCsv, zurEngine } from './einlesen';
import { komma, konstant, kreuz, kurz, ohneNull, saetzeKreuz, saetzeOhneStreuung, saetzeSkala, saetzeVerteilung, saetzeZweiGruppen, skala, verteilung, zusammenhang, zweiGruppen } from './ergebnis';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
const r = (s: string) => korrigiereAusgabe(e.run(s));
beforeAll(async () => {
  e = await nodeEngine();
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('../../../pruefdaten/d3-grenzfaelle.csv', import.meta.url), 'utf8')));
  e.run(syntax, { '/import.csv': csv });
});

describe('Skala: Alpha ist kein Beleg für einen gemeinsamen Wert (Abschlusstest F7)', () => {
  it('α ≥ ,70: Satz nennt die interne Konsistenz und verweist für die Eindimensionalität auf die Faktorenanalyse', () => {
    const s = saetzeSkala({ art: 'skala', alpha: 0.81, fragen: ['a', 'b', 'c', 'd'].map(name => ({ name, trennschaerfe: 0.6, alphaOhne: 0.76 })), n: 120 });
    expect(s.haupt).toBe('Die Zuverlässigkeit der 4 Fragen (interne Konsistenz) ist gut: Cronbachs Alpha = ,81, 95 %-KI [,75; ,86].');
    expect(s.zusatz).not.toMatch(/zu einem Wert zusammenfassen|gemeinsam einheitlich/);
    expect(s.zusatz).toContain('Ob die Fragen ein gemeinsames Merkmal messen (Eindimensionalität), zeigt Alpha nicht - das prüft eine Faktorenanalyse.');
  });
});

describe('Skala an den Rändern', () => {
  it('zwei Fragen: Satz kommt (PSPP lässt „Alpha ohne Frage“ leer; vorher brach der Satz ab)', () => {
    const k = skala(r("RELIABILITY /VARIABLES=vorher nachher /SCALE('Skala') ALL /MODEL=ALPHA /SUMMARY=TOTAL."));
    expect(ohneNull(k.alpha)).toBe(',95');                                   // R: psych::alpha 0,9493
    const s = saetzeSkala(k);
    expect(s.apa).toBe('Cronbachs α = ,95, 95 %-KI [,90; ,97] (2 Items, n = 35)');
    expect(s.zusatz).not.toMatch(/NaN|Ohne/);
  });
  it('eine Frage ohne Streuung wird mitgezählt und genannt', () => {
    const s = saetzeSkala(skala(r("RELIABILITY /VARIABLES=vorher nachher konstant /SCALE('Skala') ALL /MODEL=ALPHA /SUMMARY=TOTAL.")));
    expect(s.apa).toBe('Cronbachs α = ,71, 95 %-KI [,50; ,84] (3 Items, n = 35)');                // vorher: „2 Items“
    expect(s.haupt).toMatch(/^Die Zuverlässigkeit der 3 Fragen \(interne Konsistenz\) ist akzeptabel/);
    expect(s.zusatz).toMatch(/„konstant“ hat bei allen Personen denselben Wert/);
  });
});

describe('Verteilung: die Marke „Personen mit Angabe“ gehört zur Spalte daneben', () => {
  it('9 fehlende (leer, 99, −9): 26 Personen, nicht 35 aus der nächsten Spalte', () => {
    const s = saetzeVerteilung(verteilung(r('MISSING VALUES mit_fehlend (99, -9).\nDESCRIPTIVES /VARIABLES=mit_fehlend konstant /STATISTICS=MEAN STDDEV MIN MAX.')));
    expect(s.marken.map(m => m.text)).toEqual(['Mittelwert 3,1', 'SD = 1,3', '26 Personen mit Angabe']);   // R: mean 3,115, n 26
  });
  it('„Valid N (listwise)“: 26, nicht 35 (Befund C5; SPSS zählt die fehlenden ab)', () => {
    const t = r('MISSING VALUES mit_fehlend (99, -9).\nDESCRIPTIVES /VARIABLES=mit_fehlend konstant /STATISTICS=MEAN STDDEV MIN MAX.').find(i => i.type === 'table' && /^Descriptive Statistics/.test(i.label));
    const c = t?.type === 'table' ? t.cells : [], zeile = c.find(x => x.t === 'Valid N (listwise)')!.r;
    expect(c.find(x => x.r === zeile && x.c === 1)!.n).toBe(26);
  });
});

describe('t-Test an den Rändern', () => {
  it('sehr großer Effekt: d und Richtung', () => {
    const z = zweiGruppen(r('T-TEST GROUPS=bin01(0 1) /VARIABLES=gross.'), 'gross', 'bin01');
    expect(komma(z.d)).toBe('−3,93');                                        // R: effsize::cohen.d −3,93
    const s = saetzeZweiGruppen(z, n => n);
    expect(s.haupt).toMatch(/^Die Gruppe „0“ .* weniger als „1“/);
    expect(s.apa).toMatch(/d = 3,93/);
  });
  it('Gruppen mit 2 und 3 Personen: Hinweis auf die kleine Gruppe', () => {
    const s = saetzeZweiGruppen(zweiGruppen(r("T-TEST GROUPS=gruppe3('A' 'B') /VARIABLES=messung."), 'messung', 'gruppe3'), n => n);
    expect(s.marken.at(-1)!.text).toBe('Kleine Gruppe (n = 2)');
  });
});

describe('Sätze an den Rändern (Befunde C6, C7, D2, D3)', () => {
  it('C6: kein Unterschied - „fast denselben Wert“ statt „0,0 weniger“', () => {
    const s = saetzeZweiGruppen(zweiGruppen(r('T-TEST GROUPS=bin01(0 1) /VARIABLES=kein_effekt.'), 'kein_effekt', 'bin01'), n => n);
    expect(s.haupt).toMatch(/^Die Gruppen „[01]“ und „[01]“ \(bin01\) hatten bei „kein_effekt“ im Schnitt fast denselben Wert: 52,2 gegen 52,2\.$/);
    expect(s.haupt).not.toMatch(/0,0 weniger/);
  });
  it('C7: Spalte ohne Streuung - t-Test und Korrelation geben keine Zahl, dafür einen kurzen Satz', () => {
    expect(() => zweiGruppen(r('T-TEST GROUPS=bin01(0 1) /VARIABLES=konstant.'), 'konstant', 'bin01')).toThrow();
    expect(() => zusammenhang(r('CORRELATIONS /VARIABLES=konstant messung.'), 'konstant', 'messung')).toThrow();
    expect(konstant([5, 5, null, 99, 5], [99])).toBe(true);
    expect(konstant([5, 5, 4], [])).toBe(false);
    expect(saetzeOhneStreuung('zwei-gruppen', 'konstant').haupt).toBe('„konstant“ hat bei allen Personen denselben Wert - so lässt sich nichts vergleichen.');
    expect(saetzeOhneStreuung('zusammenhang', 'konstant').haupt).toBe('„konstant“ hat bei allen Personen denselben Wert - so lässt sich nichts über einen Zusammenhang sagen.');
  });
  it('D2: Gleichstand in der Kreuztabelle - „gleich oft“', () => {
    const s = saetzeKreuz(kreuz(r('CROSSTABS /TABLES=geschlecht BY bin01 /STATISTICS=CHISQ PHI /CELLS=COUNT ROW EXPECTED.')));
    expect(s.haupt).toMatch(/in der Gruppe „divers“ „0“ und „1“ gleich oft \(je 50\u00a0%\)/);
  });
  it('Berichtsatz Kreuztabelle: die Klammer der letzten Gruppe bleibt, APA folgt als eigene Zeile „Statistik:“ (Export-Prüfung 07.10., Abnahme 3 M6)', async () => {
    const { berichtSatz } = await import('./berichtsatz');
    const items = r('CROSSTABS /TABLES=geschlecht BY bin01 /STATISTICS=CHISQ PHI /CELLS=COUNT ROW EXPECTED.');
    const satz = berichtSatz({ id: 'k', titel: 'k', art: 'kreuz', l1: 'bin01', l2: 'geschlecht', l3: [], syntax: '', items, ergebnis: { typ: 'kreuz', e: kreuz(items) }, imBericht: true, notiz: '', zeit: 0 } as never);
    expect(satz).toMatch(/in der Gruppe „männlich“ „0“ \(55\u00a0%\)\. Statistik: χ²\(2, N = 35\) = 0,06, p = ,969, V = ,04, 95 %-KI \[,00; ,11\]\.$/);   // vorher fehlte „(55 %)“, dann Klammer in Klammer
  });
  it('D3: Abkürzungen behalten den Punkt', () => {
    expect(kurz('k. A.')).toBe('k. A.');
    expect(kurz('Es fällt mir schwer.')).toBe('Es fällt mir schwer');
    expect(kurz('Note:')).toBe('Note');
  });
});

describe('Weitergabe (Schicht 5): Word, PDF und Excel bekommen dieselben Zahlen wie das Blatt', () => {
  it('jede Zahlzelle aller Prüf-Fälle: deutsche Anzeige → Excel-Zahl = PSPP-Zahl (auf die angezeigten Stellen)', async () => {
    const { tabelleDe, alsExcelZahl, deDict, ohneDoppeltes } = await import('./export');
    const dc = await deDict();
    const faelle: { daten: string; syntax: string }[] = JSON.parse(readFileSync(new URL('../../../pruefdaten/erwartet.json', import.meta.url), 'utf8')).faelle;
    const falsch: string[] = []; let geprueft = 0, geladen = '';
    for (const f of faelle) {
      if (geladen !== f.daten) { const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL(`../../../pruefdaten/${f.daten}.csv`, import.meta.url), 'utf8'))); e.run(syntax, { '/import.csv': csv }); geladen = f.daten; }
      for (const it of r(f.syntax)) {
        if (it.type !== 'table') continue;
        const tb = tabelleDe(it, dc), roh = new Map(ohneDoppeltes(it).cells.filter(c => c.n !== undefined).map(c => [`${c.r}/${c.c}`, c]));
        tb.zeilen.forEach((z, ri) => { let k = 0; for (const c of z) { const o = roh.get(`${ri}/${k}`); k += c.span;
          if (!o || !Number.isFinite(o.n!) || /^\s*\.?\s*$/.test(o.t) || /^</.test(c.t)) continue;   // „< ,001“ bleibt Text (APA)
          const x = alsExcelZahl(c.t); geprueft++;
          const stellen = (o.t.replace('%', '').split('.')[1] ?? '').length, soll = Number(o.t.replace('%', '')) / (o.t.includes('%') ? 100 : 1);
          if (!x || Math.abs(x.wert - soll) > 0.5 * 10 ** -(stellen + (o.t.includes('%') ? 2 : 0)) + 1e-12) falsch.push(`${f.daten} ${tb.titel}: „${o.t}“ → „${c.t}“ → ${x?.wert}`);
        } });
      }
    }
    expect(geprueft).toBeGreaterThan(1000);
    expect(falsch.slice(0, 10)).toEqual([]);
  });
});

describe('Bereich von d exakt (Befund C1): nichtzentrales t wie SPSS ab 27 und R MBESS::ci.smd', () => {
  it('sleep: [−1,74; 0,10] (vorher genähert [−1,75; 0,08])', () => {
    const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('../../../pruefdaten/d1-sleep-lang.csv', import.meta.url), 'utf8')));
    e.run(syntax, { '/import.csv': csv });
    const z = zweiGruppen(r('T-TEST GROUPS=gruppe(1 2) /VARIABLES=extra.'), 'extra', 'gruppe');
    expect([komma(z.dLo), komma(z.dHi)]).toEqual(['−1,74', '0,10']);
  });
});
