/**
 * V3 Übungsblatt: Datenmodell (Link, Speicher, Pfad) und Druckansicht.
 * Die Druckseite muss dieselben Regeln für zugängliches HTML erfüllen wie der Bericht (`befunde`), und Blatt und Lösungsblatt müssen zueinander passen.
 */
import { describe, it, expect } from 'vitest';
import { kodiere, dekodiere, leseEigene, alsPfad, pruefeBlatt, startwertAus, MAX_FRAGEN, MAX_MINUTEN } from '../lernen/eigenepfade';
import { EINHEITEN, themaDerFrage } from '../lernen/lernplan';
import { ladeAuswahl, type Frage } from '../lernen/fragen';
import { blattFassung, blattDruckHtml, mischeMitFall, BUCHSTABEN } from './uebungsblatt';
import { zufall } from './zufall';
import { befunde } from './export-barrierefrei-html.test';

const zuCode = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const mitFragen = EINHEITEN.filter(e => e.fragen.length >= 3 && !e.abschlussVon).slice(0, 4);
const fragenIds = mitFragen.flatMap(e => e.fragen.slice(0, 3));

describe('V3 Übungsblatt: Modell', () => {
  it('pruefeBlatt: Kennungen geprüft, höchstens MAX_FRAGEN, Minuten nur ganz und im Rahmen', () => {
    expect(pruefeBlatt([])).toBeUndefined();
    expect(pruefeBlatt(['a', 'a', '../x', 'b'], 1, 20)).toEqual({ fragen: ['a', 'b'], mischen: true, minuten: 20 });
    expect(pruefeBlatt(['a'], false, 0)).toEqual({ fragen: ['a'] });
    expect(pruefeBlatt(['a'], 'ja', 2.5)).toEqual({ fragen: ['a'] });
    expect(pruefeBlatt(['a'], true, MAX_MINUTEN + 1)).toEqual({ fragen: ['a'], mischen: true });
    expect(pruefeBlatt(Array.from({ length: MAX_FRAGEN + 10 }, (_, i) => `f${i}`))!.fragen).toHaveLength(MAX_FRAGEN);
  });
  it('Link: Blatt hin und zurück; ohne Blatt kein f im Code (alte Links und alte Fassungen unverändert)', () => {
    const b = { fragen: fragenIds, mischen: true as const, minuten: 25 };
    expect(dekodiere(kodiere('Kurs', ['skalenniveau'], true, b))).toEqual({ name: 'Kurs', einheiten: ['skalenniveau'], pruefung: true, blatt: b });
    const ohne = kodiere('Kurs', ['skalenniveau']);
    expect(JSON.parse(atob(ohne.replace(/-/g, '+').replace(/_/g, '/')))).toEqual({ v: 1, n: 'Kurs', e: ['skalenniveau'] });
    expect(dekodiere(ohne)).toEqual({ name: 'Kurs', einheiten: ['skalenniveau'], pruefung: true });
  });
  it('Link aus fremder Hand: kaputtes Blatt fällt still weg, der Pfad bleibt', () => {
    expect(dekodiere(zuCode({ v: 1, n: 'X', e: ['a'], f: 'nicht-liste', m: 'ja', z: -3 }))).toEqual({ name: 'X', einheiten: ['a'], pruefung: true });
    expect(dekodiere(zuCode({ v: 1, n: 'X', e: ['a'], f: ['<script>', 'gut-1'], z: 9999 }))).toEqual({ name: 'X', einheiten: ['a'], pruefung: true, blatt: { fragen: ['gut-1'] } });
  });
  it('Speicher: Blatt bleibt erhalten, Kaputtes am Blatt fällt weg', () => {
    const json = JSON.stringify([{ id: 'mein-a1', name: 'A', einheiten: ['x'], blatt: { fragen: ['f1', 'f2'], mischen: true, minuten: 10 } }, { id: 'mein-a2', name: 'B', einheiten: ['x'], blatt: { fragen: 7 } }]);
    expect(leseEigene(json)).toEqual([{ id: 'mein-a1', name: 'A', einheiten: ['x'], blatt: { fragen: ['f1', 'f2'], mischen: true, minuten: 10 } }, { id: 'mein-a2', name: 'B', einheiten: ['x'] }]);
  });
  it('alsPfad: mit Blatt ist der Test das Übungsblatt mit genau diesen Fragen, auch wenn die Prüfung aus ist', () => {
    const p = alsPfad({ id: 'mein-v3a', name: 'Kurs', einheiten: ['skalenniveau'], pruefung: false, blatt: { fragen: ['f1', 'f2'], minuten: 15 } });
    expect(p.einheiten).toEqual(['skalenniveau', 'abschluss-mein-v3a']);
    expect(p.abschluss).toEqual(['f1', 'f2']);
    expect(p.uebung).toEqual({ mischen: false, minuten: 15 });
    expect(alsPfad({ id: 'mein-v3b', name: 'K', einheiten: ['skalenniveau'] }).uebung).toBeUndefined();
  });
  it('startwertAus ist fest (gleicher Text, gleicher Wert) und unterscheidet Texte', () => {
    expect(startwertAus('Kurs|a,b')).toBe(startwertAus('Kurs|a,b'));
    expect(startwertAus('Kurs|a,b')).not.toBe(startwertAus('Kurs|b,a'));
  });
});

describe('V3 Übungsblatt: Fassung und Druck', async () => {
  const themen = [...new Set(fragenIds.map(themaDerFrage).filter((t): t is string => !!t))];
  const modul = await ladeAuswahl(themen, fragenIds);
  const fragen = modul.FRAGEN;

  it('alle gewählten Fragen werden gefunden', () => { expect(fragen.map(f => f.id)).toEqual(fragenIds); });

  it('Fallreihen bleiben beim Mischen beieinander und in ihrer Reihenfolge', () => {
    const f = (id: string, fall?: string) => ({ id, fall }) as unknown as Frage;
    const liste = [f('a'), f('b', 'F'), f('c'), f('d', 'F'), f('e', 'G'), f('g', 'G')];
    for (let s = 1; s < 40; s++) {
      const m = mischeMitFall(liste, zufall(s)).map(x => x.id).join('');
      expect(m).toMatch(/bd/); expect(m).toMatch(/eg/); expect(m).toHaveLength(6);
    }
  });

  it('gleiche Startzahl, gleiche Fassung; ohne Mischen bleibt die Reihenfolge der Fragen', () => {
    const a = blattFassung(fragen, true, 42), b = blattFassung(fragen, true, 42);
    expect(a.map(e => [e.frage.id, e.reihenfolge])).toEqual(b.map(e => [e.frage.id, e.reihenfolge]));
    expect(blattFassung(fragen, false, 42).map(e => e.frage.id)).toEqual(fragenIds);
    for (const e of a) expect([...e.reihenfolge].sort()).toEqual(e.frage.antworten.map((_, i) => i));
  });

  it('Druckseiten (Blatt und Lösungen) erfüllen die Regeln für zugängliches HTML', () => {
    const eintraege = blattFassung(fragen, true, 7);
    for (const art of ['blatt', 'loesung'] as const) {
      const html = blattDruckHtml({ sprache: 'de', name: 'Kurs <A>', eintraege, faelle: modul.FAELLE, minuten: 20, datum: '14.11.2026', art });
      expect(befunde(html, { ganzeSeite: true })).toEqual([]);
      expect(html).not.toContain('<A>');
    }
  });

  it('das Lösungsblatt nennt für jede Frage den Buchstaben, an dem auf dem Blatt die richtige Antwort steht', () => {
    const eintraege = blattFassung(fragen, true, 11);
    const blatt = blattDruckHtml({ sprache: 'de', name: 'K', eintraege, faelle: modul.FAELLE, datum: 'x', art: 'blatt' });
    const loes = blattDruckHtml({ sprache: 'de', name: 'K', eintraege, faelle: modul.FAELLE, datum: 'x', art: 'loesung' });
    const einfach = eintraege.filter(e => !e.frage.mehrfach);
    expect(einfach.length).toBeGreaterThan(0);
    const punkte = [...loes.matchAll(/<li><b>([A-H])<\/b>: /g)].map(m => m[1]);
    expect(punkte).toEqual(einfach.map(e => BUCHSTABEN[e.reihenfolge.findIndex(k => e.frage.antworten[k]!.richtig)]));
    expect((blatt.match(/<section class="frage"/g) ?? []).length).toBe(eintraege.length);
    expect(blatt).not.toMatch(/Warum: /);
  });

  it('keine Noten und keine Punkte auf dem Blatt', () => {
    const html = blattDruckHtml({ sprache: 'de', name: 'K', eintraege: blattFassung(fragen, false, 1), faelle: modul.FAELLE, datum: 'x', art: 'blatt' });
    const rahmen = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<section class="frage"[\s\S]*?<\/section>/g, '');
    expect(rahmen).not.toMatch(/Note|Punkte|Punktzahl|Bewertung/);
    expect(rahmen + html.match(/<main>[\s\S]*<\/main>/)![0].replace(/<footer[\s\S]*<\/footer>/, '')).not.toMatch(/ {2}/);
  });
});
