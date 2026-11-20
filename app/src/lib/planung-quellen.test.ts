/**
 * Stufe V2 Teil 2b: „Statable weiß“ rechnet nur Zahlen aus dem Projekt (nie Text), und ohne Projekt gibt es keine Hinweise.
 */
import { describe, expect, it } from 'vitest';
import { planQuellen } from './planung-quellen';
import { planHinweise } from './planung';
import type { QualProjekt } from './qualprojekt';

const qual = (extra: Partial<QualProjekt> = {}): QualProjekt => ({
  format: 'statable-qualitativ', version: 1, id: 'q', name: 'Geheimer Name', kodierende: [{ id: 'k1', name: 'Frau Muster' }],
  dokumente: [{ id: 'd1', name: 'Interview Herr Beispiel', art: 'text', text: 'Ich heiße Herr Beispiel.' }, { id: 'd2', name: 'x', art: 'audio', text: '' }],
  codes: [], segmente: [], kodierungen: [], memos: [], faelle: [{ id: 'f1', name: 'Fall A' }] as never, variablen: [], protokoll: [],
  ...extra,
} as QualProjekt);

describe('planQuellen', () => {
  it('ohne Projektteile nichts', () => {
    expect(planQuellen({ fragebogen: [] })).toEqual({});
    expect(planHinweise(planQuellen({ fragebogen: [] }))['dmp-1-1']).toBeUndefined();
  });
  it('qualitativ: nur Zahlen, keine Namen oder Texte', () => {
    const r = planQuellen({ fragebogen: [], qual: qual({ kiNutzung: { genutzt: false, zwecke: [], geaendert: 1 } }) });
    expect(r.qual).toMatchObject({ dokumente: 2, transkripte: 1, faelle: 1, kodierende: 1, kiAngabe: 'nein' });
    const alles = JSON.stringify(planHinweise(r));
    expect(alles).not.toContain('Herr Beispiel');
    expect(alles).not.toContain('Frau Muster');
    expect(alles).not.toContain('Geheimer Name');
  });
  it('Datensatz: Zeilen, Spalten, Beschriftungen, Fehlend-Codes', () => {
    const r = planQuellen({ fragebogen: [], daten: { zeilen: 12, spalten: [{ bezeichnung: 'Alter', fehlend: [99] }, { bezeichnung: '', fehlend: [] }] } });
    expect(r.datensatz).toEqual({ zeilen: 12, spalten: 2, mitBeschriftung: 1, fehlendCodes: 1 });
  });
  it('leerer Datensatz gibt keinen Hinweis', () => {
    expect(planQuellen({ fragebogen: [], daten: { zeilen: 0, spalten: [] } }).datensatz).toBeUndefined();
  });
});
