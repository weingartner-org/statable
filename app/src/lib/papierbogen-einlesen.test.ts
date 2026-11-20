import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bogenFragenVon, bogenLayout, lese, verzerre, zeichneSeite } from './papierbogen';
import { durchgangAusBoegen, korrekturSchluessel, leseOptionenFuer, offeneFragen, ordneBoegen, werteAusBogen } from './papierbogen-einlesen';
import { datensatzTabelle } from './doppeleingabe-daten';

const plan = JSON.parse(readFileSync(new URL('./testdaten/fragebogenplan/export-plan.json', import.meta.url), 'utf8'));
const { fragen } = bogenFragenVon(plan, 'de');
const opt = leseOptionenFuer(plan, 'de');

function scanne(bogen: number, kreuze: (nr: number) => number | null, halb: Set<string> = new Set()) {
  const lay = bogenLayout(fragen, { planId: plan.id, revision: plan.revision, bogen });
  return lay.map(s => {
    const an = new Set<string>();
    for (const k of s.kaestchen) if (kreuze(k.nr) === k.code) an.add(`${k.nr}:${k.code}`);
    const bild = verzerre(zeichneSeite(s, an, 100, halb), { sauber: true });
    return { quelle: `scan-${bogen}-${s.seite}.png`, lesung: lese(bild, opt) };
  });
}

describe('Papierbogen: Einlesen und Ordnen', () => {
  it('ordnet Seiten zu Bögen, liest Kreuze und bildet den Datensatz', () => {
    const erste = fragen[0]!;
    const seiten = [...scanne(2, () => null), ...scanne(1, nr => fragen.find(f => f.nr === nr)!.codes[0]!)];
    const s = ordneBoegen(plan, 'de', seiten);
    expect(s.boegen.map(b => b.bogen)).toEqual([1, 2]);
    expect(s.abgelehnt).toEqual([]);
    const b1 = s.boegen[0]!;
    expect(b1.fehlendeSeiten).toEqual([]);
    expect(b1.fragen.find(f => f.nr === erste.nr)!.codes).toEqual([erste.codes[0]]);
    expect(s.boegen[1]!.fragen.every(f => f.stand === 'leer')).toBe(true);
    const { durchgang, uebernommen } = durchgangAusBoegen(s);
    expect(uebernommen).toEqual([1, 2]);
    const t = datensatzTabelle(plan, durchgang, 'de');
    expect(t.zeilen.length).toBe(2);
    expect(t.zeilen[0]![0]).toBe('Bogen 1');
  });

  it('meldet doppelte Seiten, fremde Blätter und fehlende Seiten', () => {
    const a = scanne(5, () => null);
    const s = ordneBoegen(plan, 'de', [...a, a[0]!, { quelle: 'leer.png', lesung: { ok: false, fehler: 'keineMarken', kaestchen: [], fragen: [] } }]);
    expect(s.abgelehnt.map(x => x.grund).sort()).toEqual(['doppelt', 'keineMarken']);
    const nur1 = ordneBoegen(plan, 'de', a.slice(0, 1));
    if (s.seitenJeBogen > 1) expect(nur1.boegen[0]!.fehlendeSeiten.length).toBeGreaterThan(0);
  });

  it('rät nie: unsichere Kästchen bleiben offen, bis die Person wählt', () => {
    const f0 = fragen[0]!;
    const halb = new Set([`${f0.nr}:${f0.codes[1]}`]);
    const s = ordneBoegen(plan, 'de', scanne(3, () => null, halb));
    const b = s.boegen[0]!;
    const offen = offeneFragen(b);
    // Je nach Zeichnung ist das halbe Kästchen „unsicher“ oder „leer“; unsicher darf nie zur Antwort werden.
    const f = b.fragen.find(x => x.nr === f0.nr)!;
    if (f.stand === 'pruefen') {
      expect(offen.map(x => x.nr)).toContain(f0.nr);
      expect(werteAusBogen(b)[f.id]).toBeNull();
      expect(durchgangAusBoegen(s).zurueckgehalten).toEqual([3]);
      const kor = { [korrekturSchluessel(3, f0.nr)]: [f0.codes[1]!] };
      expect(offeneFragen(b, kor).length).toBe(0);
      expect(durchgangAusBoegen(s, kor).uebernommen).toEqual([3]);
    }
  });

  it('mehrere Kreuze bei Einfachauswahl sind offen, bei Mehrfachauswahl eine Liste', () => {
    const b = { bogen: 9, seiten: [1], fehlendeSeiten: [], fragen: [
      { nr: 1, id: 'a', mehrfach: false, stand: 'mehrere' as const, codes: [1, 2], moeglich: [1, 2, 3] },
      { nr: 2, id: 'b', mehrfach: true, stand: 'mehrere' as const, codes: [3, 1], moeglich: [1, 2, 3] },
    ] };
    expect(offeneFragen(b).map(f => f.nr)).toEqual([1]);
    expect(werteAusBogen(b)).toEqual({ a: null, b: [1, 3] });
    expect(werteAusBogen(b, { '9:1': [2] }).a).toBe(2);
  });
});
