import { describe, expect, it } from 'vitest';
import { FRAGEN } from './fragen-abschluss';
import { EINHEITEN, PFADE } from './lernplan';

/* Wächter für die Abschlusstests: Die Lösung darf nicht an der Länge der Antwort zu erkennen sein (Johannes 03.11.), jede Frage führt zu einer Einheit zurück,
 * und jede Frage steht in genau einem Abschlusstest. */
const einzel = FRAGEN.filter(f => !f.mehrfach);
const laenge = (f: (typeof FRAGEN)[number], sp: 'de' | 'en') => f.antworten.map(a => a.text[sp].length);

describe('Abschlusstests: Länge der Antworten', () => {
  it('die richtige Antwort ist in höchstens zwei Fünfteln der Fragen die längste (Zufall wäre ein Viertel bis ein Fünftel)', () => {
    for (const sp of ['de', 'en'] as const) {
      const laengste = einzel.filter(f => { const l = laenge(f, sp); return l[f.antworten.findIndex(a => a.richtig)] === Math.max(...l); }).length;
      expect(laengste, `${sp}: ${laengste} von ${einzel.length}`).toBeLessThanOrEqual(Math.floor(einzel.length * 0.4));
    }
  });
  it('die richtige Antwort nennt in höchstens zwei Fünfteln der Fragen allein die meisten Zahlen (sonst genügt es, die Zahlen zu zählen)', () => {
    const zahlen = (s: string) => (s.match(/\d+[.,]?\d*/g) ?? []).length;
    const alleinMeiste = einzel.filter(f => { const c = f.antworten.map(x => zahlen(x.text.de)); const r = f.antworten.findIndex(x => x.richtig); const max = Math.max(...c); return c[r] === max && c.filter(x => x === max).length === 1; }).length;
    expect(alleinMeiste, `${alleinMeiste} von ${einzel.length}`).toBeLessThanOrEqual(Math.floor(einzel.length * 0.4));
  });
  it('die richtige Antwort ist höchstens ein Drittel länger als die längste falsche', () => {
    for (const f of einzel) for (const sp of ['de', 'en'] as const) {
      const l = laenge(f, sp); const r = f.antworten.findIndex(a => a.richtig);
      const andere = Math.max(...l.filter((_, i) => i !== r));
      expect(l[r]!, `${f.id} (${sp}): richtig ${l[r]}, längste falsche ${andere}`).toBeLessThanOrEqual(andere * 1.34);
    }
  });
  it('die falschen Antworten sind nicht viel kürzer als die richtige (mindestens 55 Prozent)', () => {
    for (const f of einzel) {
      const l = laenge(f, 'de'); const r = f.antworten.findIndex(a => a.richtig);
      l.forEach((x, i) => { if (i !== r) expect(x, `${f.id}: Antwort ${i + 1} (${x}) gegen richtig (${l[r]})`).toBeGreaterThanOrEqual(l[r]! * 0.55); });
    }
  });
});

describe('Abschlusstests: Zuordnung', () => {
  it('jede Frage führt zu einer vorhandenen Einheit', () => {
    for (const f of FRAGEN) expect(EINHEITEN.some(e => e.id === f.zurueck), `${f.id}: ${f.zurueck}`).toBe(true);
  });
  it('jede Frage steht in genau einem Abschlusstest, und jeder Eintrag ist eine Frage', () => {
    const ids = new Set(FRAGEN.map(f => f.id));
    const zaehl = new Map<string, number>();
    for (const p of PFADE) for (const id of p.abschluss ?? []) { expect(ids.has(id), `${p.id}: ${id}`).toBe(true); zaehl.set(id, (zaehl.get(id) ?? 0) + 1); }
    for (const f of FRAGEN) expect(zaehl.get(f.id), f.id).toBe(1);
  });
  it('der Abschlusstest eines Pfads führt nur zu Einheiten dieses Pfads', () => {
    for (const p of PFADE.filter(x => x.abschluss)) for (const id of p.abschluss!) {
      const f = FRAGEN.find(x => x.id === id)!;
      expect(p.einheiten, `${p.id}: ${id} → ${f.zurueck}`).toContain(f.zurueck);
    }
  });
  it('Fragen einer Fallreihe stehen beieinander', () => {
    for (const p of PFADE.filter(x => x.abschluss)) {
      const gesehen = new Set<string>(); let letzter: string | undefined;
      for (const id of p.abschluss!) {
        const fall = FRAGEN.find(x => x.id === id)!.fall;
        if (fall && fall !== letzter) { expect(gesehen.has(fall), `${p.id}: Fallreihe ${fall} zerrissen`).toBe(false); gesehen.add(fall); }
        letzter = fall;
      }
    }
  });
});
