/**
 * Streudiagramm nach Gruppe: Barrierefreiheit (Bildname, Textfassung als Tabelle) und Unterscheidbarkeit ohne Farbe (Form und Strichart je Gruppe).
 * Gerendert wird auf dem Server (svelte/server).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import GruppenStreudiagramm from './GruppenStreudiagramm.svelte';
import { loessLinie } from '../lib/loess';
import type { GruppenStreu } from '../lib/streugruppen';

const punkte: [number, number, number][] = [[1, 2, 0], [2, 4.2, 0], [3, 6, 0], [4, 7.9, 0], [5, 10.1, 0], [1, 9, 1], [2, 7.1, 1], [3, 5.2, 1], [4, 2.9, 1], [5, 1.2, 1]];
const d = (mitLoess = false): GruppenStreu => ({
  punkte, ausgelassen: 0,
  gruppen: [{ name: 'Kurs A', n: 5, a: 0, b: 2, r: 1 }, { name: 'Kurs B', n: 5, a: 11, b: -2, r: -1 }],
  loess: mitLoess ? loessLinie(punkte.map(p => [p[0], p[1]] as [number, number])) : []
});
const html = (g: GruppenStreu, loess = false) => render(GruppenStreudiagramm, { props: { d: g, xText: 'Lernzeit', yText: 'Punkte', loess } }).body.replace(/ ?svelte-\w+/g, '');

describe('GruppenStreudiagramm', () => {
  it('Bild mit Rolle img und Namen; Textfassung aufklappbar mit Tabelle je Gruppe und allen Punkten', () => {
    const h = html(d());
    expect(h).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Streudiagramm: Punkte gegen Lernzeit, n = 10 in 2 Gruppen/);
    expect(h).toMatch(/<summary[^>]*>Beschreibung und Daten<\/summary>/);
    expect(h).toMatch(/<caption[^>]*>Punkte gegen Lernzeit</);
    expect(h).toContain('Regressionsgerade');
    expect(h).toContain('Kurs A'); expect(h).toContain('Kurs B');
  });
  it('Gruppen unterscheiden sich in Form (Kreis gegen Quadrat) und Strichart, nicht nur in der Farbe', () => {
    const h = html(d());
    expect(h).toContain('<circle'); expect(h).toMatch(/<path d="M[\d. -]+L/);
    expect(h).toContain('stroke-dasharray="8 5"');
  });
  it('LOESS: Legendeneintrag, gepunktete Linie und Satz in der Textfassung', () => {
    const h = html(d(true), true);
    expect(h).toContain('LOESS-Linie (alle Punkte)');
    expect(h).toContain('stroke-dasharray="0.1 5"');
    expect(h).toMatch(/LOESS-Linie \(gepunktet, über alle Punkte\)/);
  });
  it('ohne Gruppe: keine Legende, Tabelle „alle“', () => {
    const g: GruppenStreu = { punkte: punkte.map(p => [p[0], p[1], 0]), ausgelassen: 0, gruppen: [{ name: '', n: 10, a: 5, b: 0, r: 0 }], loess: [] };
    const h = html(g);
    expect(h).toContain('Streudiagramm: Punkte gegen Lernzeit, n = 10'); expect(h).not.toContain('Kurs A');
  });
});

describe('GruppenStreudiagramm: Gruppenzentroide', () => {
  it('große Punkte, Legende „Gruppenzentroid“ und Tabelle in der Textfassung', () => {
    const g: GruppenStreu = { punkte, ausgelassen: 0, gruppen: [{ name: 'Kurs A', n: 5, a: null, b: null, r: null }, { name: 'Kurs B', n: 5, a: null, b: null, r: null }], loess: [] };
    const h = render(GruppenStreudiagramm, { props: { d: g, xText: 'Funktion 1', yText: 'Funktion 2', geraden: false, zentroide: [{ i: 0, x: 3, y: 6 }, { i: 1, x: 3, y: 5 }], zusatzTabellen: [{ titel: 'Gruppenzentroide', kopf: ['Gruppe', 'F1'], zeilen: [['Kurs A', '3']] }] } }).body.replace(/ ?svelte-\w+/g, '');
    expect(h).toContain('Gruppenzentroid (große Punkte)');
    expect(h).toMatch(/r="11"/);
    expect(h).toMatch(/<caption[^>]*>Gruppenzentroide</);
    expect(h).not.toMatch(/<caption[^>]*>Gerade je Gruppe</);
  });
});
