import { describe, it, expect } from 'vitest';
import { PFADE, EINHEITEN, pfadNach, einheitNach } from './lernplan';
import { stelleZusammen } from './abschlusstest';
import { zufall } from '../lib/zufall';
import { leererStand, besuche, einheitsFarben, ringStuecke, istBesucht } from './lernstand';

/** Die 43 Einheiten des früheren einen Pfads „Statistik von Anfang an“ (Stand vor der Teilung am 10.11.2026), in alter Reihenfolge. */
const ALT = ['skalenniveau', 'lagemasse-streuung', 'verteilung-diagramme', 'diagramme-ehrlich', 'standardisieren-z-wert', 'modell-und-fehler', 'wahrscheinlichkeit-regeln', 'bedingte-wahrscheinlichkeit', 'normalverteilung', 'stichprobenverteilung', 'freiheitsgrade', 'konfidenzintervall-bedeutung', 'p-wert-deuten', 'anteil-binomialtest', 'teststaerke-fehlerarten', 'effektstaerke', 'signal-und-rauschen', 't-test-zwei-gruppen', 'gepaarte-messung', 'anova-posthoc', 'rangtests', 'kreuztabelle-chi-quadrat', 'korrelation-lesen', 'korrelation-staerke-art', 'regression-einfach', 'regression-mehrere-dummy', 'logistische-regression-lesen', 'skala-trennschaerfe-umpolen', 'faktor-ladungen-lesen', 'anpassungstests', 'bayes-faktor', 'zufallsverfahren-bootstrap', 'korrelationsmatrix', 'hierarchische-regression', 'regression-quantil-strafe', 'regression-zielgroesse-kurve', 'vielfalt-mehrfachantworten', 'daten-zusammenfuehren-aggregieren', 'daten-doppelt-vergleichen-abgleichen', 'faelle-auswaehlen-sortieren', 'datum-zeit-verschieben', 'klassifikation-mikrodaten', 'befehle-syntax'];
const TEILE = ['grundlagen', 'grundlagen-2', 'grundlagen-3'];
const ohneAbschluss = (id: string) => pfadNach(id)!.einheiten.filter(x => !x.startsWith('abschluss-'));

describe('Statistik von Anfang an in drei Teilen', () => {
  it('die Vereinigung ist genau die alte Menge, ohne Doppelte', () => {
    const alle = TEILE.flatMap(ohneAbschluss);
    expect(alle).toHaveLength(43);
    expect(new Set(alle).size).toBe(43);
    expect([...alle].sort()).toEqual([...ALT].sort());
    expect(ohneAbschluss('grundlagen')).toHaveLength(17);
    expect(ohneAbschluss('grundlagen-2')).toHaveLength(13);
    expect(ohneAbschluss('grundlagen-3')).toHaveLength(13);
  });
  it('die alte Kennung führt zu Teil 1 (Adresse #lernen/pfad/grundlagen)', () => {
    const p = pfadNach('grundlagen')!;
    expect(p.name.de).toBe('Statistik von Anfang an 1: Beschreiben und Schließen');
    expect(p.einheiten[0]).toBe('skalenniveau');
    expect(ohneAbschluss('grundlagen').at(-1)).toBe('signal-und-rauschen');
  });
  it('Fortschritt hängt an den Einheiten: erledigte aus Teil 2 zählen nur dort', () => {
    const e2 = einheitNach('t-test-zwei-gruppen')!;
    let st = leererStand();
    st = besuche(st, e2, 0);
    expect(istBesucht(st, e2)).toBe(true);
    const liste = (id: string) => pfadNach(id)!.einheiten.map(x => einheitNach(x)!);
    const besucht = (id: string) => liste(id).filter(e => istBesucht(st, e)).length;
    expect(besucht('grundlagen-2')).toBe(1);
    expect(besucht('grundlagen')).toBe(0);
    expect(besucht('grundlagen-3')).toBe(0);
    expect(einheitsFarben(st, liste('grundlagen')).every(f => f === 'grau')).toBe(true);
    expect(ringStuecke(st, e2).length).toBeGreaterThan(0);
  });
  it('ein gespeicherter Stand zum Abschlusstest unter „grundlagen“ wird weiter gefunden', () => {
    const e = einheitNach('abschluss-grundlagen')!;
    expect(e.abschlussVon).toBe('grundlagen');
    expect(pfadNach('grundlagen')!.einheiten.at(-1)).toBe('abschluss-grundlagen');
    const st = { ...leererStand(), erreicht: { 'abschluss-grundlagen': 0 } };
    expect(istBesucht(st, e)).toBe(true);
    expect(istBesucht(st, einheitNach('abschluss-grundlagen-2')!)).toBe(false);
  });
  it('jeder Teil endet mit seinem Abschlusstest und bekommt Fragen', () => {
    for (const id of TEILE) {
      const p = pfadNach(id)!;
      expect(p.einheiten.at(-1), id).toBe(`abschluss-${id}`);
      expect(EINHEITEN.some(e => e.id === `abschluss-${id}` && e.abschlussVon === id), id).toBe(true);
      expect(stelleZusammen(p, zufall(7)).length, id).toBeGreaterThan(5);
    }
  });
  it('„weiter“ zeigt auf vorhandene Pfade, in Reihenfolge', () => {
    expect(pfadNach('grundlagen')!.weiter).toBe('grundlagen-2');
    expect(pfadNach('grundlagen-2')!.weiter).toBe('grundlagen-3');
    expect(pfadNach('grundlagen-3')!.weiter).toBeUndefined();
    for (const p of PFADE) if (p.weiter) expect(pfadNach(p.weiter), p.id).toBeDefined();
  });
});
