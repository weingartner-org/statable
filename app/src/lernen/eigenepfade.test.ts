import { describe, it, expect } from 'vitest';
import { kodiere, dekodiere, leseEigene, pruefeKennungen, bereinigeName, neueId, istEigeneId, alsPfad, MAX_NAME, MAX_EINHEITEN, MAX_PFADE } from './eigenepfade';
import { EINHEITEN, PFADE } from './lernplan';
import { stelleZusammen, MAX_AUTO } from './abschlusstest';
import { mitPruefung, einheitenMitFragen } from './eigenepfade';
import { zufall } from '../lib/zufall';

const zuCode = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('Eigene Pfade: Kennungen', () => {
  it('alle Einheiten des Lernplans haben eine gültige Kennung (sonst ginge keine in einen Link)', () => {
    const { gut } = pruefeKennungen(EINHEITEN.map(e => e.id));
    expect(gut).toHaveLength(EINHEITEN.length);
  });
  it('entfernt Doppelte und Ungültiges, behält die Reihenfolge', () => {
    expect(pruefeKennungen(['a', 'b', 'a', 'B', '../x', 3, 'c-d']).gut).toEqual(['a', 'b', 'c-d']);
  });
  it('trennt Unbekanntes ab', () => {
    expect(pruefeKennungen(['skalenniveau', 'gibt-es-nicht'], i => EINHEITEN.some(e => e.id === i))).toEqual({ gut: ['skalenniveau'], unbekannt: ['gibt-es-nicht'] });
  });
  it('höchstens so viele Einheiten wie erlaubt', () => {
    expect(pruefeKennungen(Array.from({ length: MAX_EINHEITEN + 20 }, (_, i) => `e${i}`)).gut).toHaveLength(MAX_EINHEITEN);
  });
  it('eine Nicht-Liste ergibt nichts', () => { expect(pruefeKennungen('x').gut).toEqual([]); });
});

describe('Eigene Pfade: Name', () => {
  it('kürzt, glättet Leerraum und nimmt Steuerzeichen und spitze Klammern weg', () => {
    expect(bereinigeName('  Mein\n  <b>Pfad</b>  ')).toBe('Mein b Pfad /b');
    expect(bereinigeName('x'.repeat(200))).toHaveLength(MAX_NAME);
    expect(bereinigeName(5)).toBe('');
  });
});

describe('Eigene Pfade: Link-Code', () => {
  it('Hin und zurück, auch mit Umlauten und Sonderzeichen', () => {
    const ids = PFADE[0]!.einheiten;
    const c = kodiere('Regression für BM6 – Übung ✓', ids);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(dekodiere(c)).toEqual({ name: 'Regression für BM6 – Übung ✓', einheiten: ids, pruefung: true });
  });
  it('ein Code mit 20 Einheiten bleibt kurz genug für eine Mail', () => {
    expect(kodiere('Ein Pfad', EINHEITEN.slice(0, 20).map(e => e.id)).length).toBeLessThan(800);
  });
  it('lehnt Kaputtes ab, ohne abzustürzen', () => {
    for (const c of ['', '!!!', 'abc', 'e30', zuCode(null), zuCode([]), zuCode({ v: 2, n: 'x', e: ['a'] }), zuCode({ v: 1, n: '', e: ['a'] }), zuCode({ v: 1, n: 'x', e: [] }), zuCode({ v: 1, n: 'x', e: 'a' }), 'a'.repeat(7000)])
      expect(dekodiere(c), c.slice(0, 20)).toBeNull();
    expect(dekodiere(undefined as unknown as string)).toBeNull();
  });
  it('Name und Kennungen aus fremdem Code werden bereinigt', () => {
    const r = dekodiere(zuCode({ v: 1, n: '<img src=x onerror=1>', e: ['gut-1', '<script>', 'gut-1'] }));
    expect(r).toEqual({ name: 'img src=x onerror=1', einheiten: ['gut-1'], pruefung: true });
  });
});

describe('Eigene Pfade: Speicher', () => {
  it('liest, was gespeichert wurde', () => {
    const id = neueId();
    expect(istEigeneId(id)).toBe(true);
    expect(leseEigene(JSON.stringify([{ id, name: 'A', einheiten: ['x', 'y'] }]))).toEqual([{ id, name: 'A', einheiten: ['x', 'y'] }]);
  });
  it('lässt Kaputtes, Doppelte und fremde Kennungen weg', () => {
    const j = JSON.stringify([{ id: 'mein-aaa', name: 'ok', einheiten: ['x'] }, { id: 'mein-aaa', name: 'doppelt', einheiten: ['x'] }, { id: 'grundlagen', name: 'fremd', einheiten: ['x'] }, { id: 'mein-b', name: '', einheiten: ['x'] }, { id: 'mein-c', name: 'leer', einheiten: [] }, 5, null]);
    expect(leseEigene(j).map(p => p.name)).toEqual(['ok']);
    for (const s of [null, '', 'kein json', '{}', '5']) expect(leseEigene(s)).toEqual([]);
  });
  it('höchstens so viele Pfade wie erlaubt', () => {
    const j = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ id: `mein-p${i}`, name: `P${i}`, einheiten: ['x'] })));
    expect(leseEigene(j)).toHaveLength(MAX_PFADE);
  });
  it('als Pfad des Lernplans: Name in beiden Sprachen gleich', () => {
    expect(alsPfad({ id: 'mein-a', name: 'Mein Pfad', einheiten: ['x'] })).toMatchObject({ id: 'mein-a', name: { de: 'Mein Pfad', en: 'Mein Pfad' }, einheiten: ['x'] });
  });
  it('eigene Kennungen kollidieren nie mit den festen Pfaden', () => {
    for (const p of PFADE) expect(istEigeneId(p.id)).toBe(false);
  });
});

describe('Eigene Pfade: Grenzen passen zum Lernplan', () => {
  it('ein Pfad mit allen Einheiten geht noch durch Grenze und Link-Code', () => {
    const ids = EINHEITEN.map(e => e.id);
    expect(ids.length).toBeLessThanOrEqual(MAX_EINHEITEN);
    expect(dekodiere(kodiere('Alles', ids))?.einheiten).toEqual(ids);
  });
});

describe('Eigene Pfade: Abschlussprüfung', () => {
  const mitFragen = EINHEITEN.filter(e => e.fragen.length >= 2).slice(0, 4);
  const ids = mitFragen.map(e => e.id);

  it('Kodieren und Lesen: mit Prüfung (Standard) und ohne', () => {
    expect(dekodiere(kodiere('A', ids))?.pruefung).toBe(true);
    expect(dekodiere(kodiere('A', ids, true))?.pruefung).toBe(true);
    expect(dekodiere(kodiere('A', ids, false))?.pruefung).toBe(false);
  });
  it('ein alter Code ohne Angabe gilt als „an“', () => {
    const alt = zuCode({ v: 1, n: 'Alt', e: ids });
    expect(dekodiere(alt)).toEqual({ name: 'Alt', einheiten: ids, pruefung: true });
    expect(dekodiere(zuCode({ v: 1, n: 'Aus', e: ids, p: 0 }))?.pruefung).toBe(false);
    expect(dekodiere(zuCode({ v: 1, n: 'Quatsch', e: ids, p: 'x' }))?.pruefung).toBe(true);
  });
  it('gespeicherte Pfade: ohne Angabe an, nur ausdrücklich false aus', () => {
    const j = JSON.stringify([{ id: 'mein-a', name: 'A', einheiten: ids }, { id: 'mein-b', name: 'B', einheiten: ids, pruefung: false }, { id: 'mein-c', name: 'C', einheiten: ids, pruefung: 'nein' }]);
    expect(leseEigene(j).map(p => mitPruefung(p))).toEqual([true, false, true]);
  });
  it('alsPfad hängt die Prüfung als letzte Einheit an, nur mit Fragen und nur wenn an', () => {
    const an = alsPfad({ id: 'mein-p1', name: 'P', einheiten: ids });
    expect(an.einheiten).toEqual([...ids, 'abschluss-mein-p1']);
    expect(alsPfad({ id: 'mein-p2', name: 'P', einheiten: ids, pruefung: false }).einheiten).toEqual(ids);
    const leer = EINHEITEN.find(e => !e.fragen.length && !e.abschlussVon);
    if (leer) expect(alsPfad({ id: 'mein-p3', name: 'P', einheiten: [leer.id] }).einheiten).toEqual([leer.id]);
    expect(einheitenMitFragen(['gibt-es-nicht'])).toBe(0);
  });
  it('Zusammenstellung: je Einheit eine Frage aus genau dieser Einheit, nichts Fremdes', () => {
    const p = alsPfad({ id: 'mein-p4', name: 'P', einheiten: ids });
    for (let k = 1; k <= 5; k++) {
      const z = stelleZusammen(p, zufall(k));
      expect(z).toHaveLength(ids.length);
      z.forEach((f, i) => expect(mitFragen[i]!.fragen).toContain(f));
    }
  });
  it('Zusammenstellung: höchstens so viele Fragen wie bei den festen Pfaden', () => {
    const viele = EINHEITEN.filter(e => e.fragen.length).map(e => e.id).slice(0, 40);
    expect(stelleZusammen({ einheiten: viele }, zufall(7)).length).toBeLessThanOrEqual(MAX_AUTO);
  });
  it('Pfad ohne Fragen: keine Prüfung, keine Fragen', () => {
    const leer = EINHEITEN.filter(e => !e.fragen.length).slice(0, 3).map(e => e.id);
    expect(einheitenMitFragen(leer)).toBe(0);
    expect(stelleZusammen({ einheiten: leer }, zufall(1))).toEqual([]);
    expect(alsPfad({ id: 'mein-p5', name: 'P', einheiten: leer }).einheiten).toEqual(leer);
  });
});
