import { describe, expect, it } from 'vitest';
import { bogenLayout, kennBits, lese, verzerre, zeichneSeite, type BogenFrage } from './papierbogen';

const kennung = { planId: 'plan-abc-123', revision: 3, bogen: 4711 };
const fragen: BogenFrage[] = Array.from({ length: 30 }, (_, i) => ({ nr: i + 1, codes: i % 3 === 0 ? [1, 2, 3, 4, 5] : [1, 2, 3] }));
const seiten = bogenLayout(fragen, kennung);
const erwartet = (s: number) => seiten.find(x => x.seite === s)?.kaestchen ?? [];
// Antwort je Frage: (nr % codes.length) + 1
const antwort = (f: BogenFrage) => f.codes[f.nr % f.codes.length]!;
const kreuze = (s: number) => new Set(fragen.filter(f => erwartet(s).some(k => k.nr === f.nr)).map(f => `${f.nr}:${antwort(f)}`));

function pruefe(st: Parameters<typeof verzerre>[1], dpi = 100) {
  for (const s of seiten) {
    const l = lese(verzerre(zeichneSeite(s, kreuze(s.seite), dpi), st), { erwartet, kennung });
    expect(l.fehler).toBeUndefined();
    expect(l.kennung).toMatchObject({ revision: 3, bogen: 4711, seite: s.seite });
    for (const f of l.fragen) {
      expect(f.status, `Seite ${s.seite} Frage ${f.nr}`).toBe('eine');
      expect(f.code, `Frage ${f.nr}`).toBe(antwort(fragen[f.nr - 1]!));
    }
    expect(l.fragen.length).toBe(new Set(s.kaestchen.map(k => k.nr)).size);
  }
}

describe('Papierbogen: Aufbau', () => {
  it('teilt auf zwei Seiten (25 Zeilen je Seite) und schreibt die Seitenzahl in die Kennleiste', () => {
    expect(seiten.length).toBe(2);
    expect(seiten[0]!.kaestchen.at(-1)!.nr).toBe(25);
    expect(seiten[1]!.kaestchen[0]!.nr).toBe(26);
    expect(kennBits(kennung, 1)).not.toEqual(kennBits(kennung, 2));
    expect(kennBits(kennung, 1).length).toBe(39);
  });
  it('lehnt zu viele Antworten und falsche Nummern ab', () => {
    expect(() => bogenLayout([{ nr: 1, codes: Array.from({ length: 21 }, (_, i) => i) }], kennung)).toThrow('zuvieleAntworten');
    expect(() => kennBits({ ...kennung, bogen: 99999 }, 1)).toThrow('bogenNummer');
  });
});

describe('Papierbogen: Lesen künstlicher Scans', () => {
  it('sauberer Scan', () => pruefe({ sauber: true }));
  it('gedreht (3°), verschoben, verkleinert, mit Rauschen', () => pruefe({ drehung: 3, verschiebung: [12, -9], massstab: 0.96, rauschen: 25, unschaerfe: true }));
  it('Foto: Perspektive und stärkere Drehung', () => pruefe({ drehung: -6, perspektive: 0.04, massstab: 0.93, rauschen: 30, unschaerfe: true, verschiebung: [-10, 14] }));
  it('Blatt steht auf dem Kopf (180°)', () => pruefe({ drehung: 180, unschaerfe: true, rauschen: 10 }));
  it('höhere Auflösung (150 dpi)', () => pruefe({ drehung: 1.5, rauschen: 20, unschaerfe: true }, 150));
});

describe('Papierbogen: nie raten', () => {
  const s = seiten[0]!;
  it('mehrere Kreuze in einer Frage → „mehrere“', () => {
    const an = new Set(['1:1', '1:3', '2:2']);
    const l = lese(verzerre(zeichneSeite(s, an), { drehung: 1, unschaerfe: true }), { erwartet });
    expect(l.fragen.find(f => f.nr === 1)).toMatchObject({ status: 'mehrere', codes: [1, 3] });
    expect(l.fragen.find(f => f.nr === 2)).toMatchObject({ status: 'eine', code: 2 });
    expect(l.fragen.find(f => f.nr === 3)).toMatchObject({ status: 'leer' });
  });
  it('kleiner Punkt statt Kreuz → „prüfen“, nie geraten', () => {
    const l = lese(zeichneSeite(s, new Set(), 100, new Set(['4:2'])), { erwartet });
    expect(l.fragen.find(f => f.nr === 4)?.status).toBe('pruefen');
  });
  it('fehlende Eckmarke → Fehler statt Vermutung', () => {
    const b = zeichneSeite(s, new Set());
    const px = 100 / 25.4;
    for (let j = Math.round(277 * px); j < Math.round(289 * px); j++) for (let i = Math.round(190 * px); i < Math.round(202 * px); i++) b.grau[j * b.b + i] = 255;
    expect(lese(b, { erwartet }).fehler).toBe('keineMarken');
  });
  it('Blatt eines anderen Fragebogens → „kennungFremd“', () => {
    const l = lese(zeichneSeite(s, new Set()), { erwartet, kennung: { ...kennung, planId: 'ganz-anderer-plan' } });
    expect(l).toMatchObject({ ok: false, fehler: 'kennungFremd' });
  });
  it('andere Fassung → „kennungFremd“', () => {
    expect(lese(zeichneSeite(s, new Set()), { erwartet, kennung: { ...kennung, revision: 4 } }).fehler).toBe('kennungFremd');
  });
  it('leeres weißes Blatt → keine Marken', () => {
    expect(lese({ b: 400, h: 560, grau: new Uint8Array(400 * 560).fill(255) }).fehler).toBe('keineMarken');
  });
});

describe('Papierbogen: Fragen aus dem Plan', () => {
  it('übernimmt Fragen mit Codes, meldet nicht lesbare, und der Rundweg liest richtig', async () => {
    const { readFileSync } = await import('node:fs');
    const { bogenFragenVon } = await import('./papierbogen');
    const plan = JSON.parse(readFileSync(new URL('./testdaten/fragebogenplan/export-plan.json', import.meta.url), 'utf8'));
    const { fragen: f, nichtLesbar } = bogenFragenVon(plan, 'de');
    expect(f.length + nichtLesbar.length).toBeGreaterThan(0);
    expect(f.length).toBeGreaterThan(0);
    const lay = bogenLayout(f, { planId: plan.id, revision: plan.revision, bogen: 1 });
    const kr = new Set(f.map(x => `${x.nr}:${x.codes[0]}`));
    const l = lese(verzerre(zeichneSeite(lay[0]!, new Set([...kr].filter(k => lay[0]!.kaestchen.some(z => `${z.nr}:${z.code}` === k)))), { drehung: 2, unschaerfe: true }), { erwartet: s => lay.find(x => x.seite === s)?.kaestchen ?? [] });
    expect(l.ok).toBe(true);
    for (const fr of l.fragen) expect(fr).toMatchObject({ status: 'eine', code: f.find(x => x.nr === fr.nr)!.codes[0] });
  });
});
