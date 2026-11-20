import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { sprachteile } from './sprachteile';
import liste from './englische-klammern.json';

const dir = new URL('../hilfe/glossar/', import.meta.url);
const norm = (s: string) => s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
const alsText = (t: ReturnType<typeof sprachteile>) => t.map(x => x.t).join('');
const en = (t: string, sp = 'de') => sprachteile(t, sp).filter(x => x.en).map(x => x.t);

describe('Sprache von Teilen (WCAG 3.1.2)', () => {
  it('kennzeichnet englische Klammern, der sichtbare Text bleibt gleich', () => {
    for (const t of ['Faktorwert (Factor Score) misst ein Merkmal.', 'Der Test (Partial Least Squares)', 'Prüfung (Posterior Predictive Check)']) {
      expect(alsText(sprachteile(t, 'de'))).toBe(t);
      expect(en(t).length).toBe(1);
    }
    expect(en('Faktorwert (Factor Score)')).toEqual(['Factor Score']);
    expect(en('Verfahren (partial least squares).')).toEqual(['partial least squares']);
  });
  it('lässt deutsche und neutrale Klammern unberührt', () => {
    for (const t of ['Lage (Mittelwert)', 'Prüfung (Test)', 'Mitte (Median)', 'Maß (Norm)', 'Funktion (ACF)', 'Zeichen (α)', 'Stichprobe (n = 5)', 'ohne Ende (hier)', 'Maß (Dependency)', 'Regel (Streuung der Werte)'])
      expect(en(t), t).toEqual([]);
  });
  it('D1: englische Klammern mit Bindestrich („Confirmation-Bias“, „Case-cohort“) werden gekennzeichnet, Namen und deutsche Mischformen nicht', () => {
    expect(en('Bestätigungsfehler (Confirmation-Bias)')).toEqual(['Confirmation-Bias']);
    expect(en('Fall-Kohorten-Studie (Case-cohort)')).toEqual(['Case-cohort']);
    expect(en('FIML (Full-Information Maximum-Likelihood)')).toEqual(['Full-Information Maximum-Likelihood']);
    expect(en('Maß (Kaiser-Meyer-Olkin)')).toEqual([]);
    expect(en('Prüfung (Granger-Test)')).toEqual([]);
    expect(en('Verfahren (Lincoln-Petersen)')).toEqual([]);
    // deutsche Endung nach englischem Namen („Dunnett-Test“, „Random-Effects-Modell“): gemischt, bleibt unberührt
    expect(en('Vergleich (Dunnett-Test)')).toEqual([]);
    expect(en('Prüfung (Hosmer-Lemeshow-Test)')).toEqual([]);
    expect(en('Prüfung (Hosmer-Lemeshow test)')).toEqual(['Hosmer-Lemeshow test']);
  });
  it('kennzeichnet nichts, wenn die Seitensprache Englisch ist', () => {
    expect(en('Factor score (Factor Score)', 'en')).toEqual([]);
    expect(en('Faktorwert (Factor Score)', 'fr')).toEqual(['Factor Score']);
  });
  it('Liste: jeder Eintrag steht im englischen Glossar, ist mehrwortig oder ein genannter Einzelwort-Fall, kein Latein', () => {
    const e = JSON.parse(fs.readFileSync(new URL('en.json', dir), 'utf8')) as Record<string, { titel: string }>;
    const E = new Set<string>();
    for (const id in e) { const t = e[id]!.titel; E.add(norm(t)); for (const m of t.matchAll(/\(([^()]+)\)/g)) E.add(norm(m[1]!)); E.add(norm(t.replace(/\s*\([^()]*\)/g, ''))); const o = norm(t.replace(/\s*\([^()]*\)/g, '')); if (o.split(' ').length >= 3) E.add(o.split(' ').slice(0, -1).join(' ')); }
    const einzel = ['overfitting', 'underfitting', 'faking', 'shrinkage', 'surprisal', 'prewhitening', 'detrending', 'seed'];
    for (const k of liste as string[]) {
      expect(E.has(norm(k)), k).toBe(true);
      expect(norm(k).includes(' ') || einzel.includes(norm(k)), k).toBe(true);
      expect(['a priori', 'a posteriori', 'post hoc', 'per capita', 'per se', 'vice versa']).not.toContain(norm(k));
    }
    expect((liste as string[]).length).toBeGreaterThan(300);
  });
  it('Ausgabe: die Bausteine-Komponente setzt <span lang="en"> genau um den gekennzeichneten Teil und nutzt sprachteile()', () => {
    const q = fs.readFileSync(new URL('../bausteine/Sprachteile.svelte', import.meta.url), 'utf8');
    expect(q).toContain("sprachteile(text, aktuelleSprache())");
    expect(q).toMatch(/\{#if x\.en\}<span lang="en">\{x\.t\}<\/span>\{:else\}/);
  });
  it('Zahl: die Hilfe-Titel und Texte der deutschen Glossare enthalten mindestens 5 gekennzeichnete Klammern', () => {
    const de = JSON.parse(fs.readFileSync(new URL('de.json', dir), 'utf8')) as Record<string, { titel: string }>;
    const n = Object.values(de).filter(a => en(a.titel).length > 0).length;
    expect(n).toBeGreaterThanOrEqual(5);
  });
});
