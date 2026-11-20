/* Eigene Tests des Bauers zu den Entscheiden 2, 3, 5, 6 und 8 (Fachblatt „Entscheide nach den Prüfer-Tests 3E/3F“). */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';
import type { Antwortsatz } from './antwortsatz';
import { neuesSchluesselpaar, KryptoFehler } from './schluessel';
import { entschluesseleAlle, pruefeEingaenge, type Eingang } from './sammelimport';

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const lok = (t: string): Lok => ({ de: t });
const frage = (id: string): Frage => ({ art: 'frage', id, name: id, typ: 'zahl', text: lok(id), zahl: { ganz: true }, kodebuch: { niveau: 'skala' } });
const seite: Seite = { art: 'seite', id: 's', name: 's', elemente: [frage('q1'), frage('q2')] };
const PLAN: FragebogenPlan = {
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: lok('T'), sprachen: ['de'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [], skalen: [], elemente: [seite], geaendert: 1,
};
const satz = (n: number, extra: Partial<Antwortsatz> = {}): Antwortsatz => ({ format: 'statable-antwort', version: 1, plan: { id: 'p-1', revision: 1 }, antwortId: uid(n), werte: { q1: 1 }, ...extra });
const ein = (s: Antwortsatz, quelle = `d${s.antwortId.slice(-2)}`): Eingang => ({ quelle, satz: s });
const zust = (e: Eingang[], codes?: { code: string; ausgegeben?: boolean }[]) => pruefeEingaenge(PLAN, e, codes).zeilen.map(z => z.zustand);

describe('Entscheid 2: Reihenfolge 1, 2, 4, 3, 5, 6', () => {
  it('dieselbe Datei zweimal mit anderer Revision: die zweite ist doppelt, nicht andereRevision', () => {
    const s = satz(1, { plan: { id: 'p-1', revision: 2 } });
    expect(zust([ein(s), ein(s, 'nochmal')])).toEqual(['andereRevision', 'doppelt']);
  });
  it('doppelt (4) kommt vor andereRevision (3) und vor den Codes (5)', () => {
    const codes = [{ code: 'AAAA-BBBB' }];
    const e = [ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(1, { code: 'ZZZZ-ZZZZ', plan: { id: 'p-1', revision: 9 } }), 'zweite')];
    expect(zust(e, codes)).toEqual(['uebernommen', 'doppelt']);
  });
});

describe('Entscheid 3: andererPlan und nicht entschlüsselbar gelten nicht als gesehen', () => {
  it('Satz mit fremdem Plan blockiert dieselbe antwortId im richtigen Plan nicht', () => {
    const e = [ein(satz(1, { plan: { id: 'fremd', revision: 1 } })), ein(satz(1), 'richtig')];
    expect(zust(e)).toEqual(['andererPlan', 'uebernommen']);
  });
  it('nicht entschlüsselbare Eingänge zählen nicht als gesehen', () => {
    const e: Eingang[] = [{ quelle: 'x', fehler: 'falsche-identitaet' }, ein(satz(1))];
    expect(zust(e)).toEqual(['nichtEntschluesselbar', 'uebernommen']);
  });
});

describe('Entscheid 5: Code mit ausgegeben: false ist unbekannt', () => {
  it('Code in der Liste, aber nicht ausgegeben → unbekannterCode, übernommen und markiert', () => {
    const codes = [{ code: 'AAAA-BBBB', ausgegeben: false }, { code: 'CCCC-DDDD', ausgegeben: true }];
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(2, { code: 'CCCC-DDDD' }))], codes);
    expect(p.zeilen.map(z => z.zustand)).toEqual(['unbekannterCode', 'uebernommen']);
    expect(p.zeilen[0]!.uebernehmen).toBe(true);
  });
});

describe('Entscheid 6: ungültige Identität wirft sofort', () => {
  let paar: { identitaet: string; empfaenger: string };
  beforeAll(async () => { paar = await neuesSchluesselpaar(); });
  it('KryptoFehler ungueltig, auch bei leerer Liste und bevor ein Fortschritt gemeldet wird', async () => {
    let aufrufe = 0;
    await expect(entschluesseleAlle([{ quelle: 'a', daten: 'x' }], 'kein-schluessel', () => { aufrufe++; })).rejects.toMatchObject({ code: 'ungueltig' });
    await expect(entschluesseleAlle([], 'AGE-SECRET-KEY-1ABC')).rejects.toBeInstanceOf(KryptoFehler);
    expect(aufrufe).toBe(0);
    await expect(entschluesseleAlle([], paar.identitaet)).resolves.toEqual([]);
  });
});

describe('Entscheid 8: Schlüssel element:teil zählen mit dem Teil vor dem ersten Doppelpunkt', () => {
  it('q1:anders und q1:kommentar sind bekannt, alt:anders nennt „alt“', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { plan: { id: 'p-1', revision: 2 }, werte: { q1: 1, 'q1:anders': 'x', 'q1:kommentar': 'y', 'alt:anders': 'z' } }))]);
    const h = p.zeilen[0]!.hinweis ?? '';
    expect(h).toContain('alt');
    expect(h).not.toContain('q1');
    expect(h).not.toContain('anders');
  });
});

// Opus, Abnahme 3E: Antworten anderer Revision melden ihren Code an; ein späterer Satz mit demselben Code ist doppelterCode.
import { pruefeEingaenge as pruefe2 } from './sammelimport';
describe('Abnahme 3E: Code bei andereRevision', () => {
  it('Code aus einer Antwort anderer Revision zählt für doppelte Codes', () => {
    const plan = { id: 'p', revision: 2, sprachen: ['de'], titel: { de: 'T' }, seiten: [], elemente: [] } as unknown as Parameters<typeof pruefe2>[0];
    const satz = (antwortId: string, revision: number) => ({ quelle: antwortId, satz: { format: 'statable-antwort' as const, version: 1 as const, plan: { id: 'p', revision }, antwortId, code: 'ABCD-EFGH', werte: {} } });
    const p = pruefe2(plan, [satz('11111111-1111-4111-8111-111111111111', 1), satz('22222222-2222-4222-8222-222222222222', 2)], [{ code: 'ABCDEFGH' }]);
    expect(p.zeilen.map(z => z.zustand)).toEqual(['andereRevision', 'doppelterCode']);
  });
});
