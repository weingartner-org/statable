import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-erheben';
import { EINHEITEN, PFADE } from './lernplan';

/* Wächter für Paket 1F (Erheben): Belege stehen in BELEGE-ERHEBEN.json, die Lösung ist an der Länge nicht zu erkennen, die vier Einheiten liegen in den neuen Pfaden. */
const BELEGE = JSON.parse(readFileSync(new URL('../../../docs/fachblaetter/BELEGE-ERHEBEN.json', import.meta.url), 'utf8')) as { id: string; aussage: { de: string; en: string }; quelle: { seite: string; url: string }; mc: boolean; fehldeutungen: unknown[] }[];
const laenge = (f: (typeof FRAGEN)[number], sp: 'de' | 'en') => f.antworten.map(a => a.text[sp].length);

describe('Erheben: Belege', () => {
  it('jeder Beleg hat Aussage de/en, Quelle mit Seite und Adresse, mc und Fehldeutungen', () => {
    expect(new Set(BELEGE.map(b => b.id)).size).toBe(BELEGE.length);
    for (const b of BELEGE) {
      if (b.mc) expect(b.fehldeutungen.length, `${b.id}: mc ohne Fehldeutungen`).toBeGreaterThan(0);   // Belege der Qualitätsprüfung (qp-*, ef-*) sind nur mc, wenn Fehldeutungen vorliegen (Paket 2H)
      expect(b.aussage.de.length, b.id).toBeGreaterThan(40); expect(b.aussage.en.length, b.id).toBeGreaterThan(40);
      expect(b.quelle.seite.length, b.id).toBeGreaterThan(5); expect(b.quelle.url, b.id).toMatch(/^https:\/\//);
    }
  });
  it('jede Frage nennt einen vorhandenen Beleg (Beleg:<id>) oder einen Hilfe-Artikel (Hilfe:<id>)', () => {
    const ids = new Set(BELEGE.map(b => b.id));
    for (const f of FRAGEN) {
      expect(f.belege.some(b => b.startsWith('Beleg:') || b.startsWith('Hilfe:')), f.id).toBe(true);
      for (const b of f.belege) if (b.startsWith('Beleg:')) {
        expect(ids.has(b.slice(6)), `${f.id}: ${b}`).toBe(true);
        expect(BELEGE.find(x => x.id === b.slice(6))!.mc, `${f.id}: ${b} ist nicht für Fragen freigegeben (mc)`).toBe(true);
      }
    }
  });
});

describe('Erheben: Fragen', () => {
  it('je Einheit vier bis sechs Fragen, drei bis fünf Antworten', () => {
    for (const id of ['erheben-methode-waehlen', 'daten-einlesen-pruefen', 'faelle-fuer-interviews', 'meta-inferenz', 'fragebogen-aufbau', 'antwortformate', 'fragebogen-pruefen', 'kodebuch', 'barrierefrei-befragen', 'papier-eingeben', 'online-oder-papier', 'ruecklauf', 'anonym-pseudonym']) {
      const e = EINHEITEN.find(x => x.id === id)!;
      expect(e.fragen.length, id).toBeGreaterThanOrEqual(4); expect(e.fragen.length, id).toBeLessThanOrEqual(6);
    }
    for (const f of FRAGEN) { expect(f.antworten.length, f.id).toBeGreaterThanOrEqual(3); expect(f.antworten.length, f.id).toBeLessThanOrEqual(5); }
  });
  it('die richtige Antwort ist höchstens ein Drittel länger als die längste falsche, die falschen sind mindestens 55 Prozent so lang', () => {
    for (const f of FRAGEN) for (const sp of ['de', 'en'] as const) {
      const l = laenge(f, sp); const r = f.antworten.findIndex(a => a.richtig);
      const andere = l.filter((_, i) => i !== r);
      expect(l[r]!, `${f.id} (${sp}): richtig ${l[r]}, längste falsche ${Math.max(...andere)}`).toBeLessThanOrEqual(Math.max(...andere) * 1.34);
      for (const x of andere) expect(x, `${f.id} (${sp})`).toBeGreaterThanOrEqual(l[r]! * 0.55);
    }
  });
  it('die richtige Antwort ist in höchstens zwei Fünfteln der Fragen die längste', () => {
    for (const sp of ['de', 'en'] as const) {
      const laengste = FRAGEN.filter(f => { const l = laenge(f, sp); return l[f.antworten.findIndex(a => a.richtig)] === Math.max(...l); }).length;
      expect(laengste, `${sp}: ${laengste} von ${FRAGEN.length}`).toBeLessThanOrEqual(Math.floor(FRAGEN.length * 0.4));
    }
  });
});

describe('Erheben: Pfade', () => {
  it('die vier Einheiten liegen in den neuen Pfaden „erheben“ und „mixed-methods“, die alten Pfade sind unverändert', () => {
    expect(PFADE.find(p => p.id === 'erheben')!.einheiten.slice(0, 8)).toEqual(['erheben-methode-waehlen', 'daten-einlesen-pruefen', 'fragebogen-aufbau', 'antwortformate', 'fragebogen-pruefen', 'kodebuch', 'barrierefrei-befragen', 'papier-eingeben']);
    expect(PFADE.find(p => p.id === 'mixed-methods')!.einheiten.slice(0, 2)).toEqual(['faelle-fuer-interviews', 'meta-inferenz']);
    expect(PFADE.find(p => p.id === 'fragebogen')!.einheiten).not.toContain('meta-inferenz');
    expect(PFADE.find(p => p.id === 'regression-lesen')!.einheiten).not.toContain('meta-inferenz');
  });
});
