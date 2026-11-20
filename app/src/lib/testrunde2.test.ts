// Testrunde 24.10.2026 (pruefdaten/runde2/BEFUNDE.md): Behebungen mit nachgestelltem Fehler.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { IN_ARBEIT } from '../i18n/laufzeit';

const SPRACHEN = readdirSync(new URL('.', import.meta.url)).filter(f => /^messages\.[a-z]{2}\.json$/.test(f))
  // Sprachen in Arbeit (V6a) zählen erst nach dem Nachziehen (V6b) mit.
  .filter(f => !(IN_ARBEIT as string[]).includes(f.slice(9, -5)));

describe('G: I² ist ein Anteil, nicht die Größe der Unterschiede', () => {
  it('alle 15 Erklärtexte verweisen auf τ und das Prädiktionsintervall', () => {
    expect(SPRACHEN.length).toBe(15);
    for (const f of SPRACHEN) {
      const m = JSON.parse(readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')) as { erklaer: Record<string, { vorsicht: string }> };
      expect(m.erklaer['i-quadrat']!.vorsicht, f).toMatch(/τ/);
    }
  });
});

import { amtlichSatz, type AmtlichTabelle } from './amtlich';
import { genauigkeitFehlerSatz, kalibrierenPruefen } from './genauigkeit';

describe('H3: Satz im Bericht passt zu den „x“ der Tabelle', () => {
  it('nennt gesperrte Zellen und Zellen mit zu wenigen Fällen getrennt (T5: 4 + 5 = 9 „x“)', () => {
    const t = { einheit: 'altersgruppe nach bundesland', geheim: { gesamt: 4 }, anzahlGeheim: 4, anzahlKlein: 5 } as unknown as AmtlichTabelle;
    const s = amtlichSatz(t);
    expect(s).toContain('4 Zellen sind aus Gründen der Geheimhaltung gesperrt (x).');
    expect(s).toContain('5 Zellen haben zu wenige Fälle und sind nicht ausgewiesen (x).');
    expect(amtlichSatz({ ...t, anzahlKlein: 0 } as AmtlichTabelle)).not.toContain('zu wenige');
  });
});

describe('H5: Kalibrieren - Sollsummen passen nicht zusammen', () => {
  it('der Satz nennt die echten Summen statt zweimal 0', () => {
    const e = { merkmale: [{ spalte: 'bl', werte: [1, 2], summen: [3_000_000, 4_886_640] }, { spalte: 'g', werte: [1, 2], summen: [4_300_000, 4_500_000] }], gesamt: null, grenzen: null };
    const p = kalibrierenPruefen(e, 100)!;
    expect(p).toEqual({ problem: 'raender-summen', merkmal: 2, summe: 8_800_000, gesamt: 7_886_640 });
    const s = genauigkeitFehlerSatz({ fehlerCode: p.problem, ...p }, { merkmale: ['bundesland', 'geschlecht'] });
    expect(s).not.toMatch(/ergeben 0,/);
    expect(s).toMatch(/geschlecht ergeben 8\D?800\D?000, die Gesamtzahl ist 7\D?886\D?640/);
  });
});

import { schrittZahl } from './mikroschutz.svelte';

describe('H4: Meldung nach „Mikrodaten schützen“ zählt Schritte, nicht Protokollzeilen', () => {
  it('lokal unterdrücken mit 4 Schlüsselmerkmalen = 1 Schritt, mit Kappen = 2', () => {
    const lokal = ['bundesland', 'geschlecht', 'altersgruppe', 'bildung'].map(m => ({ art: 'lokal' as const, merkmal: m, faelle: 0, k: 3 }));
    expect(schrittZahl(lokal)).toBe(1);
    expect(schrittZahl([{ art: 'oben', merkmal: 'einkommen', faelle: 38, grenze: 6864.8, prozent: 99 }, ...lokal])).toBe(2);
  });
});

import { kennzahlenSatz } from './anonym';

describe('H4: Σ 1/Fk unter 10 mit zwei Stellen', () => {
  it('0,463 erscheint als 0,46, nicht als 0,5', () => {
    const s = kennzahlenSatz({ n: 8000, k: 3, unterK: 43, anteilUnterK: 43 / 8000, kleinsterFk: 1, wiedererkennung: 0.4631725, gewichtet: true });
    expect(s).toMatch(/1\/Fk\): 0[.,]46\./);
  });
});

import { leseSas } from './sas';
import { s } from './sitzung.svelte';

describe('H2: SAS-Hinweis zu eigenen Formaten in den Anführungszeichen der Sprache', () => {
  it('englisch "…", deutsch „…“', () => {
    const b = new Uint8Array(readFileSync(new URL('../../../pruefdaten/runde2/sas-eigenformat.sas7bdat', import.meta.url)));
    s.einst.sprache = 'en';
    try {
      const en = leseSas(b.slice()).hinweise.find(h => h.includes('.sas7bcat'))!;
      expect(en).toMatch(/custom format/); expect(en).not.toMatch(/„/);
    } finally { s.einst.sprache = 'de'; }
    const de = leseSas(b.slice()).hinweise.find(h => h.includes('.sas7bcat'))!;
    expect(de).toMatch(/„/);
  });
});
