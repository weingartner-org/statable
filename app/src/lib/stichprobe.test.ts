import { describe, expect, it } from 'vitest';
import { GRENZE, stichprobenIndex, zieheStichprobe, qqIndex } from './stichprobe';

describe('feste Stichprobe für Diagramme (Abschlusstest A3)', () => {
  it('bis zur Grenze bleibt alles, in der alten Reihenfolge', () => {
    const a = Array.from({ length: 500 }, (_, i) => i);
    const r = zieheStichprobe(a, 500);
    expect(r.gekuerzt).toBe(false); expect(r.auswahl).toEqual(a); expect(r.gesamt).toBe(500);
  });
  it('darüber höchstens die Grenze, jeder Wert höchstens einmal, Reihenfolge erhalten', () => {
    const a = Array.from({ length: 33000 }, (_, i) => i);
    const r = zieheStichprobe(a, 500);
    expect(r.gekuerzt).toBe(true); expect(r.auswahl.length).toBe(500); expect(r.gesamt).toBe(33000);
    expect(new Set(r.auswahl).size).toBe(500);
    expect([...r.auswahl].sort((x, y) => x - y)).toEqual(r.auswahl);
  });
  it('fest: gleiche Daten, gleiche Auswahl - bei jedem Aufruf', () => {
    expect(stichprobenIndex(100000, 500)).toEqual(stichprobenIndex(100000, 500));
  });
  it('gleichmäßig verteilt: jedes Fünftel der Reihe ist vertreten (keine Häufung am Anfang)', () => {
    const idx = stichprobenIndex(100000, 1000);
    for (let f = 0; f < 5; f++) { const n = idx.filter(i => i >= f * 20000 && i < (f + 1) * 20000).length; expect(n).toBeGreaterThan(130); expect(n).toBeLessThan(270); }
  });
  it('gleiche Indizes für mehrere Reihen: x und y bleiben Paare', () => {
    const x = Array.from({ length: 5000 }, (_, i) => i), y = x.map(v => v * 2);
    const idx = stichprobenIndex(x.length, 300);
    expect(idx.every(i => y[i] === x[i]! * 2)).toBe(true);
  });
  it('Grenzen: 500 je Gruppe', () => { expect(GRENZE.gruppe).toBe(500); });
  it('Q-Q: Enden bleiben vollständig, die Mitte gleichmäßig; höchstens die Grenze', () => {
    const idx = qqIndex(100000, 1000);
    expect(idx.length).toBeLessThanOrEqual(1000);
    expect(idx.slice(0, 20)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(idx.slice(-20)).toEqual(Array.from({ length: 20 }, (_, i) => 100000 - 20 + i));
    expect(new Set(idx).size).toBe(idx.length);
  });
});
