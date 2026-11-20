import { describe, expect, it } from 'vitest';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import type { Frage, FragebogenPlan, Seite } from './fragebogenplan';
import type { Antwortsatz } from './antwortsatz';
import { kategorisiere } from './ruecklauf';
import { pruefeEingaenge } from './sammelimport';
import { baueSammelWord, ruecklaufSaetze, sammelProtokollText } from './sammelimport-protokoll';

const frage = (id: string): Frage => ({ art: 'frage', id, name: id, typ: 'zahl', text: { de: id }, zahl: { ganz: true }, kodebuch: { niveau: 'skala' } });
const seite: Seite = { art: 'seite', id: 's', name: 's', elemente: [frage('q1')] };
const PLAN: FragebogenPlan = { format: 'statable-fragebogen', version: 1, id: 'p', revision: 1, titel: { de: 'Test' }, sprachen: ['de'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [], skalen: [], elemente: [seite], geaendert: 1 };
const satz = (n: number, code?: string): Antwortsatz => ({ format: 'statable-antwort', version: 1, plan: { id: 'p', revision: 1 }, antwortId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, werte: { q1: 1 }, ...(code ? { code } : {}) });

describe('Sammelimport-Protokoll', () => {
  const codes = [{ code: 'AAAA-BBBB' }, { code: 'CCCC-DDDD' }];
  const pruefung = pruefeEingaenge(PLAN, [{ quelle: 'a.age', satz: satz(1, 'AAAA-BBBB') }, { quelle: 'b.age', fehler: 'kaputt' }], codes);
  const kat = kategorisiere(PLAN, pruefung.saetze, codes, 0.8);
  const prot = { plan: PLAN, pruefung, kategorisierung: kat, grenze: 0.8, datum: '08.11.2026', uebernommen: pruefung.saetze.length };

  it('Text nennt Grenze, RR1 und RR2 mit Formel', () => {
    const t = sammelProtokollText(prot);
    expect(t).toMatch(/80,0 %/);
    expect(t).toMatch(/RR1 = I \/ \(I \+ P \+ NC\) = 1 \/ 2 = 0,500/);
    expect(t).toMatch(/RR2/);
  });
  it('ohne Codes: nur Zahl der Antworten, keine Quote', () => {
    const k = kategorisiere(PLAN, [satz(1)], undefined, 0.8);
    const s = ruecklaufSaetze(k, 0.8).join(' ');
    expect(s).toMatch(/keine Rücklaufquote/);
    expect(s).not.toMatch(/RR1/);
  });
  it('Word: docx-pruefen ohne Befund', async () => {
    const D = await import('docx');
    const bytes = new Uint8Array(await D.Packer.toArrayBuffer(baueSammelWord(D, prot, pruefung.zeilen)));
    expect(pruefeDocx(bytes)).toEqual([]);
  });
});
