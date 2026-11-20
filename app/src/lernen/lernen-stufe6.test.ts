import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { artikelModul } from '../hilfe/artikel-laden';
import { EINHEITEN, PFADE, BEREICHE_LERNEN, einheitNach, type Pfad } from './lernplan';
import { pfadGruppen } from './pfadgruppen';

/** Usability Stufe 6 (10.11.2026): Pfade in Gruppen, erst der Begriff dann die Bedienung, Start mit „Hier anfangen“. */
const PFAD_IDS = ['grundlagen', 'grundlagen-2', 'grundlagen-3', 'fragebogen', 'fragebogen-vertiefen', 'ergebnisse-lesen', 'wahrscheinlichkeit', 'gruppen', 'vorhersage', 'regression-lesen', 'lineares-modell', 'regression-pruefen', 'varianzanalyse-vertiefen', 'sauber-forschen', 'kategorien', 'studie-planen', 'daten', 'medizin', 'technik', 'psychologie', 'bildung', 'wirtschaft', 'natur'];
/** Hauptartikel mit „Kurz“, aber ohne „So geht es in Statable“: dort entfällt der Aufklapper. */
const OHNE_STATABLE = ['datum-zeit-verschieben', 'konfirmatorische-fa', 'fehlende-werte-imputation'];

describe('Stufe 6: Kennungen bleiben', () => {
  it('Pfade, Zahl der Einheiten und die Prüfschritte', () => {
    for (const id of PFAD_IDS) expect(PFADE.some(p => p.id === id), id).toBe(true);
    expect(PFADE.length).toBeGreaterThanOrEqual(PFAD_IDS.length);
    expect(EINHEITEN.length).toBeGreaterThanOrEqual(166);
    const fb = PFADE.find(p => p.id === 'fragebogen')!;
    for (const id of ['pruefschritt-inhalt', 'pruefschritt-faktorenanalyse', 'pruefschritt-reliabilitaet', 'pruefschritte-zusammen']) expect(fb.einheiten, id).toContain(id);
  });
  it('Pfad „gruppen“: eigener Name mit Fachbegriffen, anders als das Thema „vergleichen“', () => {
    const p = PFADE.find(x => x.id === 'gruppen')!, t = BEREICHE_LERNEN.find(b => b.id === 'vergleichen')!;
    expect(p.name.de).not.toBe(t.name.de);
    expect(p.name.de).toMatch(/t-Test/); expect(p.name.en).toMatch(/t-test/);
  });
});

describe('Stufe 6: pfadGruppen', () => {
  const g = pfadGruppen(PFADE);
  const ids = (n: string) => g.find(x => x.id === n)?.pfade.map(p => p.id) ?? [];
  it('jeder feste Pfad genau einmal', () => {
    const alle = g.flatMap(x => x.pfade.map(p => p.id));
    expect(alle.sort()).toEqual(PFADE.map(p => p.id).sort());
  });
  it('Grundlagen, Für dein Fach, Vertiefen', () => {
    expect(ids('grundlagen')).toEqual(['grundlagen', 'grundlagen-2', 'grundlagen-3']);
    expect(ids('fach')).toEqual(['medizin', 'technik', 'psychologie', 'bildung', 'wirtschaft', 'oekonometrie', 'natur']);
    expect(ids('vertiefen')).toContain('gruppen');
    expect(g.map(x => x.id)).toEqual(['grundlagen', 'fach', 'vertiefen']);
  });
  it('unbekannte Pfade kommen nach „Vertiefen“, eigene vorn in „Eigene Pfade“', () => {
    const neu: Pfad = { id: 'xyz', name: { de: 'Neu', en: 'New' }, einheiten: [] }, eig: Pfad = { id: 'eigen-1', name: { de: 'Mein', en: 'Mine' }, einheiten: [] };
    const h = pfadGruppen([eig, ...PFADE, neu], id => id === 'eigen-1');
    expect(h[0]!.id).toBe('eigene'); expect(h[0]!.pfade.map(p => p.id)).toEqual(['eigen-1']);
    expect(h.find(x => x.id === 'vertiefen')!.pfade.at(-1)!.id).toBe('xyz');
  });
});

describe('Stufe 6: artikelGliederung', () => {
  it('Hauptartikel außerhalb der Begriffe haben „Kurz“ und „So geht es in Statable“ (außer drei Ausnahmen), in jeder Sprache gleich viele', async () => {
    const de = await artikelModul('de'), en = await artikelModul('en');
    const liste = de.artikelListe('de');
    let geprueft = 0;
    for (const e of EINHEITEN) {
      const id = e.hilfe[0]; if (!id) continue;
      const a = liste.find(x => x.id === id); if (!a || a.bereich === 'begriffe') continue;
      const gd = de.artikelGliederung(id, 'de'), ge = en.artikelGliederung(id, 'en');
      expect(gd.kurz.length, `${e.id} kurz`).toBeGreaterThan(0);
      if (!OHNE_STATABLE.includes(e.id)) expect(gd.statable.length, `${e.id} statable`).toBeGreaterThan(0);
      expect(ge.kurz.length, `${e.id} en kurz`).toBe(gd.kurz.length);
      expect(ge.statable.length, `${e.id} en statable`).toBe(gd.statable.length);
      geprueft++;
    }
    expect(geprueft).toBeGreaterThan(50);
    expect(einheitNach('skalenniveau')).toBeTruthy();
  });
});

describe('Stufe 6: Quelltext Lernen.svelte', () => {
  const q = readFileSync('src/seiten/Lernen.svelte', 'utf8');
  it('Hier anfangen, Weiter mit, Was ist das?, So geht es in Statable zugeklappt', () => {
    expect(q).toMatch(/Hier anfangen/);
    expect(q).toMatch(/L\('Weiter mit', /);
    expect(q).toMatch(/Was ist das\?/);
    expect(q).toMatch(/<details[^>]*>\s*<summary>\{L\('So geht es in Statable'/);
    expect(q).not.toMatch(/<details[^>]*open[^>]*>\s*<summary>\{L\('So geht es in Statable'/);
  });
});
