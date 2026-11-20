import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { mediation, mediationBefehl, type Mediation } from './mediation';
import { hilfsNamen, mittelwert, moderation, moderationBefehl, type Moderation } from './moderation';
import { saetzeMediation, saetzeModeration, tabellenMediation, tabellenModeration } from './medmodsaetze';

let med: Mediation, mod: Moderation;
beforeAll(async () => {
  const e = await nodeEngine();
  const text = readFileSync(new URL('./testdaten/mediation-moderation.csv', import.meta.url), 'utf8');
  const b = zurEngine(leseCsv(text));
  e.run(b.syntax, { '/import.csv': b.csv });
  const roh = leseCsv(text), zahl = (v: unknown) => Number(String(v).replace(',', '.'));
  const sp = (n: string[]) => roh.zeilen.map(r => n.map(k => (r[roh.kopf.indexOf(k)] == null ? NaN : zahl(r[roh.kopf.indexOf(k)])))).filter(r => r.every(Number.isFinite));
  const z = sp(['unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden']);
  med = await mediation(e.run(mediationBefehl('unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden')), 'unterstuetzung', 'selbstwirksamkeit', 'wohlbefinden', { x: z.map(r => r[0]!), m: z.map(r => r[1]!), y: z.map(r => r[2]!) }, 150);
  const q = sp(['unterstuetzung', 'belastung', 'leistung']), d = { x: q.map(r => r[0]!), w: q.map(r => r[1]!), y: q.map(r => r[2]!) };
  mod = moderation(e.run(moderationBefehl('unterstuetzung', 'belastung', 'leistung', mittelwert(d.x), mittelwert(d.w), hilfsNamen([]))), 'unterstuetzung', 'belastung', 'leistung', d, 150);
});

describe('Sätze Mediation', () => {
  it('Satz, APA-Zeile, Vorsicht', () => {
    const s = saetzeMediation(med);
    expect(s.haupt).toMatch(/^Der Einfluss von „unterstuetzung“ auf „wohlbefinden“ läuft zum Teil über „selbstwirksamkeit“\.$/);
    expect(s.apa).toMatch(/^ab = 0,42, 95 %-Bootstrap-KI \[0,2\d; 0,5\d\]; a = 0,47, p < ,001; b = 0,91, p < ,001; c′ = 0,42, p = ,002; c = 0,84, p < ,001$/);
    expect(s.zusatz).toContain('Rund 50\u00a0% des Gesamteffekts laufen über');
    expect(s.vorsicht).toContain('keine Kausalität');
    expect(s.vorsicht).toContain('3 ausgelassen');
    expect(s.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['mediation', 'bootstrap', 'p-wert', 'stichprobe']));
  });
  it('Tabellen: Pfade und indirekter Effekt', () => {
    const t = tabellenMediation(med);
    expect(t.map(x => x.label)).toEqual(['Mediation Paths', 'Indirect Effect']);
    expect(t[0]!.rows).toBe(5); expect(t[1]!.rows).toBe(4);
    expect(t[0]!.cells.find(c => c.r === 1 && c.c === 1)!.n).toBeCloseTo(0.465952, 5);
  });
  it('Intervall mit 0: kein indirekter Effekt belegt', () => {
    const s = saetzeMediation({ ...med, ab: 0.1, abLo: -0.2, abHi: 0.4 });
    expect(s.haupt).toContain('belegen die Daten nicht');
    expect(s.haupt).toContain('Das Intervall schließt 0 ein');
  });
});

describe('Sätze Moderation', () => {
  it('Satz, einfache Steigungen, Johnson-Neyman, APA', () => {
    const s = saetzeModeration(mod);
    expect(s.haupt).toBe('Der Zusammenhang von „unterstuetzung“ mit „leistung“ hängt von „belastung“ ab.');
    expect(s.apa).toContain('Wechselwirkung: B = 1,73, 95 %-KI [1,19; 2,28], p < ,001');   // die Kennwerte stehen nur einmal, in der Zeile für die Arbeit
    expect(s.zusatz).toContain('erklärt 17\u00a0% der Unterschiede zusätzlich (ΔR² = ,17');
    expect(s.zusatz).toMatch(/f² = 0,\d\d,/);   // B12: f² kann über 1 liegen - immer mit Null, wie im Englischen
    expect(s.zusatz).toContain('bei M − 1 SD 0,012 (p = ,977), bei M 2,11 (p < ,001) und bei M + 1 SD 4,20 (p < ,001)');
    expect(s.zusatz).toContain('Nach Johnson-Neyman ist die Steigung von unterstuetzung signifikant bei belastung bis 1,68 und ab 2,73, sonst nicht.');
    expect(s.apa).toBe('Wechselwirkung: B = 1,73, 95 %-KI [1,19; 2,28], p < ,001, ΔR² = ,17, F(1, 142) = 39,66; einfache Steigungen: M − 1 SD: b = 0,012, p = ,977; M: b = 2,11, p < ,001; M + 1 SD: b = 4,20, p < ,001');
  });
  it('Tabellen: Modell, einfache Steigungen, Johnson-Neyman', () => {
    const t = tabellenModeration(mod);
    expect(t.map(x => x.label)).toEqual(['Moderation Model', 'Simple Slopes', 'Johnson-Neyman']);
    expect(t[0]!.rows).toBe(5); expect(t[1]!.rows).toBe(4); expect(t[2]!.rows).toBe(4);
  });
});
