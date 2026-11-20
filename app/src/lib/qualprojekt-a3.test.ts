/**
 * Stufe A3: Fassung 3 für Themen, Memo-Arten, Kodierphase, Einzelfall und Matrix mit Themen (Pflichttests Architekturblatt Ausbau 4),
 * Themen mit Verlauf (Abschnitt 1 und 2), Arbeitsweise als Voreinstellung (Fachblatt Arbeitsweisen 7), Einzelfall-Sicht (Prüfplan A-B8).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ARBEITSWEISEN, MEMO_ARTEN_A3, neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER, type QualProjekt } from './qualprojekt';
import { aendereCode, entferneCode, entferneFall, legeCodeAn } from './kodieren';
import { codeProtokoll } from './codebuch-protokoll';
import {
  benenneThemaUm, formhinweise, halteVerweise, legeThemaAn, legeThemenZusammen, ordneBelegZu, ordneCodeZu, setzeKonzept, setzeThemaEltern, setzeThemaFall,
  setzeThemaStand, teileThema, themaFaelle, themaSegmente, themenReihenfolge, verschiebeThema,
} from './themen';
import { arbeitsweise, bereiche, setzeArbeitsweise, teilSichtbar, VOREINSTELLUNGEN, ARBEITSWEISE_TEXT } from './arbeitsweise';
import { fallFertig, offeneFaelle, sichtbaresProjekt, starteEinzelfall, verlasseEinzelfall } from './einzelfall-modus';
import { ersetze, findeTreffer } from './pseudonym';

const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));
const sortiert = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(sortiert);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, sortiert((x as Record<string, unknown>)[k])]));
  return x;
};

function basis(): QualProjekt {
  const q = neuesQualProjekt('A3');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.ich = 'k1';
  q.faelle.push({ id: 'f1', name: 'Amira', werte: {} }, { id: 'f2', name: 'Ben', werte: {} });
  q.codes.push({ id: 'c1', name: 'Hilfe suchen', kodierbar: true, reihenfolge: 0 }, { id: 'c2', name: 'Scham', kodierbar: true, reihenfolge: 1 }, { id: 'c3', name: 'Familie', kodierbar: true, reihenfolge: 2 });
  q.dokumente.push(
    { id: 'd1', name: 'Interview Amira', art: 'text', text: 'Ich frage meine Tutorin. GEHEIM-AMIRA', erstellt: 1, geaendert: 1, fall: 'f1' },
    { id: 'd2', name: 'Interview Ben', art: 'text', text: 'Ich schäme mich zu fragen. GEHEIM-BEN', erstellt: 1, geaendert: 1, fall: 'f2' },
  );
  q.segmente.push({ id: 's1', dokument: 'd1', start: 0, ende: 24, erstellt: 1 }, { id: 's2', dokument: 'd2', start: 0, ende: 26, erstellt: 1 });
  q.kodierungen.push({ id: 'k1a', segment: 's1', code: 'c1', kodierende: 'k1', erstellt: 1 }, { id: 'k2a', segment: 's2', code: 'c2', kodierende: 'k1', erstellt: 1 });
  return q;
}

describe('Fassung 3 für A3 (Pflichttests 1-4)', () => {
  const alt = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
  it.skipIf(!existsSync(alt))('1. altes Projekt Fassung 1 bleibt Byte für Byte gleich (JSON sortiert)', () => {
    const j = JSON.parse(readFileSync(alt, 'utf8'));
    const r = pruefeQualProjekt(j);
    expect(r.version).toBe(1);
    expect(sortiert(JSON.parse(JSON.stringify(r)))).toEqual(sortiert(j));
  });
  it('1. Projekt Fassung 2 (Feldnotiz) bleibt 2', () => {
    const q = basis();
    q.memos.push({ id: 'm1', text: 'Notiz', art: 'feldnotiz-empirisch', bezug: [{ art: 'projekt' }], erstellt: 2 });
    expect(rund(q).version).toBe(2);
  });
  it('2. nur `arbeitsweise` (jede Kennung): Fassung bleibt 1, Angabe bleibt erhalten', () => {
    for (const a of ARBEITSWEISEN) {
      const r = rund({ ...basis(), arbeitsweise: a });
      expect(r.version).toBe(1);
      expect(r.arbeitsweise).toBe(a);
      expect(rund(r)).toEqual(r);
    }
  });
  it('2. unbekannte Arbeitsweise (neuere Fassung) gilt als allgemein, Projekt bleibt lesbar', () => {
    const r = rund({ ...basis(), arbeitsweise: 'diskursanalyse' });
    expect(r.arbeitsweise).toBeUndefined();
    expect(arbeitsweise(r)).toBe('allgemein');
  });
  it('3. Themen heben auf 3, verlustfrei hin und zurück', () => {
    let q = basis();
    q = legeThemaAn(q, 'Hilfe als Risiko', { konzept: 'Wer fragt, zeigt Schwäche.', codes: ['c1', 'c2'] }, 10).q;
    const id = q.themen![0]!.id;
    q = legeThemaAn(q, 'Unterthema', { elternId: id }, 11).q;
    q = ordneBelegZu(q, id, 's1', true, 12);
    q = legeThemaAn(q, 'PET Amira', { fall: 'f1' }, 13).q;
    expect(qualFassung(q)).toBe(3);
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.themen).toEqual(q.themen);
    expect(rund(r)).toEqual(r);
  });
  it('3. jede neue Memo-Art hebt auf 3 und bleibt erhalten; Bezug „thema“ ebenso', () => {
    for (const art of MEMO_ARTEN_A3) {
      const q = basis();
      q.memos.push({ id: 'm1', text: 'x', art, bezug: art === 'vergleich' ? [{ art: 'segment', id: 's1' }, { art: 'segment', id: 's2' }] : [{ art: 'projekt' }], erstellt: 2 });
      const r = rund(q);
      expect(r.version, art).toBe(3);
      expect(r.memos[0]).toEqual(q.memos[0]);
    }
    let q = basis();
    q = legeThemaAn(q, 'T', {}, 1).q;
    q.memos.push({ id: 'm2', text: 'x', bezug: [{ art: 'thema', id: q.themen![0]!.id }], erstellt: 2 });
    expect(rund(q).memos[0]!.bezug[0]!.art).toBe('thema');
  });
  it('3. Kodierphase hebt auf 3 und bleibt erhalten', () => {
    const q = aendereCode(basis(), 'c1', { phase: 'fokussiert' });
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.codes[0]!.phase).toBe('fokussiert');
  });
  it('3. Einzelfall hebt auf 3, auch wenn ausgeschaltet; tote Fälle fallen still weg', () => {
    const q = verlasseEinzelfall(fallFertig(starteEinzelfall(basis(), 'f1')));
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.einzelfall).toEqual({ an: false, fertig: ['f1'] });
    const r2 = rund({ ...q, einzelfall: { an: true, aktuell: 'weg', fertig: ['f1', 'weg'] } });
    expect(r2.einzelfall).toEqual({ an: true, fertig: ['f1'] });
  });
  it('3. Zusammenfassung mit art „thema“ hebt auf 3; ohne art bleibt 1', () => {
    const q = basis();
    q.zusammenfassungen = [{ zeile: 'f1', code: 'c1', text: 'kurz', geaendert: 1 }];
    expect(rund(q).version).toBe(1);
    q.zusammenfassungen.push({ zeile: 'f1', code: 't1', text: 'Thema', geaendert: 2, art: 'thema' });
    const q2 = legeThemaAn(q, 'T', {}, 1).q;
    q2.zusammenfassungen![1]!.code = q2.themen![0]!.id;
    const r = rund(q2);
    expect(r.version).toBe(3);
    expect(r.zusammenfassungen).toEqual(q2.zusammenfassungen);
  });
  it('4. Fassung 4 wird laut abgelehnt', () => {
    expect(() => rund({ ...basis(), version: 4 })).toThrow(/unbekannte Fassung/);
  });
  it('BEKANNTE_FELDER enthält die neuen Felder', () => {
    for (const f of ['arbeitsweise', 'themen', 'einzelfall']) expect(BEKANNTE_FELDER).toContain(f);
  });
  it('tote Verweise in Themen fallen beim Lesen still weg; Unterthema eines Unterthemas verliert den Eltern-Verweis', () => {
    let q = basis();
    q = legeThemaAn(q, 'A', { codes: ['c1'] }, 1).q;
    q = legeThemaAn(q, 'B', { elternId: q.themen![0]!.id }, 2).q;
    const roh = JSON.parse(JSON.stringify(q));
    roh.themen[0].codes.push('gibt-es-nicht');
    roh.themen[0].belege = ['gibt-es-nicht'];
    roh.themen[0].fall = 'gibt-es-nicht';
    roh.themen.push({ ...roh.themen[1], id: 'x', name: 'C', elternId: roh.themen[1].id });
    const r = pruefeQualProjekt(roh);
    expect(r.themen![0]!.codes).toEqual(['c1']);
    expect(r.themen![0]!.belege).toEqual([]);
    expect(r.themen![0]!.fall).toBeUndefined();
    expect(r.themen![2]!.elternId).toBeUndefined();
  });
});

describe('Themen mit Verlauf', () => {
  it('anlegen: Stand Kandidat, Schritt „angelegt“, Verweis im Protokoll; Name doppelt im gleichen Bereich abgelehnt', () => {
    const { q, id } = legeThemaAn(basis(), '  Hilfe als Risiko ', {}, 5);
    const t = q.themen![0]!;
    expect(t).toMatchObject({ id, name: 'Hilfe als Risiko', stand: 'kandidat', kodierende: 'k1' });
    expect(t.verlauf).toEqual([{ zeit: 5, was: 'angelegt', kodierende: 'k1', nachher: 'Hilfe als Risiko' }]);
    expect(q.protokoll.at(-1)).toMatchObject({ was: 'thema.angelegt', nachher: { thema: id } });
    expect(() => legeThemaAn(q, 'hilfe als risiko')).toThrow('name-vergeben');
    expect(() => legeThemaAn(q, ' ')).toThrow('name-leer');
    // gleicher Name als persönliches Thema eines Falls ist erlaubt (anderer Bereich)
    expect(() => legeThemaAn(q, 'Hilfe als Risiko', { fall: 'f1' })).not.toThrow();
  });
  it('umbenennen, Konzept (Tippen in 60 s = ein Schritt), Codes, Stand: alles im Verlauf, nie gekürzt', () => {
    let { q, id } = legeThemaAn(basis(), 'A', {}, 1);
    q = benenneThemaUm(q, id, 'B', 'klarer', 2);
    q = setzeKonzept(q, id, 'Ers', 3);
    q = setzeKonzept(q, id, 'Erster Satz.', 30);
    q = setzeKonzept(q, id, 'Erster Satz. Zweiter.', 200_000);   // mehr als 60 s später: neuer Schritt
    q = ordneCodeZu(q, id, 'c1', true, 210_000);
    q = ordneCodeZu(q, id, 'c1', true, 211_000);   // doppelt: nichts
    q = setzeThemaStand(q, id, 'aktiv', undefined, 220_000);
    q = setzeThemaStand(q, id, 'verworfen', 'trägt nicht', 230_000);
    q = setzeThemaStand(q, id, 'kandidat', undefined, 240_000);
    const t = q.themen![0]!;
    expect(t.verlauf.map(s => s.was)).toEqual(['angelegt', 'umbenannt', 'konzept', 'konzept', 'codes', 'stand', 'verworfen', 'wieder-aufgenommen']);
    expect(t.verlauf[1]).toMatchObject({ vorher: 'A', nachher: 'B', notiz: 'klarer' });
    expect(t.verlauf[6]).toMatchObject({ vorher: 'aktiv', nachher: 'verworfen', notiz: 'trägt nicht' });
    expect(t.konzept).toBe('Erster Satz. Zweiter.');
    expect(t.codes).toEqual(['c1']);
  });
  it('zusammenlegen: Ziel bekommt Codes und Belege, die anderen werden verworfen (nicht gelöscht), Unterthemen wandern mit', () => {
    let q = basis();
    q = legeThemaAn(q, 'A', { codes: ['c1'] }, 1).q;
    q = legeThemaAn(q, 'B', { codes: ['c1', 'c2'] }, 2).q;
    const [a, b] = q.themen!.map(t => t.id) as [string, string];
    q = legeThemaAn(q, 'B-Unter', { elternId: b }, 3).q;
    q = ordneBelegZu(q, b, 's2', true, 4);
    q = legeThemenZusammen(q, a, [b], 'gleiche Idee', 5);
    const ta = q.themen!.find(t => t.id === a)!, tb = q.themen!.find(t => t.id === b)!;
    expect(ta.codes).toEqual(['c1', 'c2']);
    expect(ta.belege).toEqual(['s2']);
    expect(ta.verlauf.at(-1)).toMatchObject({ was: 'zusammengelegt', vorher: 'B', nachher: 'A', notiz: 'gleiche Idee' });
    expect(tb.stand).toBe('verworfen');
    expect(tb.verlauf.at(-1)).toMatchObject({ was: 'zusammengelegt', nachher: 'A' });
    expect(q.themen!.find(t => t.name === 'B-Unter')!.elternId).toBe(a);
    expect(q.themen).toHaveLength(3);
  });
  it('teilen: neues Thema mit den gewählten Codes, beide mit Schritt „geteilt“', () => {
    let { q, id } = legeThemaAn(basis(), 'A', { codes: ['c1', 'c2', 'c3'] }, 1);
    const r = teileThema(q, id, 'A2', ['c2', 'c3'], undefined, 2);
    q = r.q;
    expect(q.themen!.find(t => t.id === id)!.codes).toEqual(['c1']);
    expect(q.themen!.find(t => t.id === r.id)!.codes).toEqual(['c2', 'c3']);
    expect(q.themen!.find(t => t.id === id)!.verlauf.at(-1)!.was).toBe('geteilt');
    expect(q.themen!.find(t => t.id === r.id)!.verlauf.map(s => s.was)).toEqual(['angelegt', 'geteilt']);
  });
  it('nur eine Ebene Unterthemen', () => {
    let q = basis();
    q = legeThemaAn(q, 'A', {}, 1).q;
    const a = q.themen![0]!.id;
    q = legeThemaAn(q, 'B', { elternId: a }, 2).q;
    const b = q.themen![1]!.id;
    expect(() => legeThemaAn(q, 'C', { elternId: b })).toThrow('eine-ebene');
    q = legeThemaAn(q, 'D', {}, 3).q;
    const d = q.themen![2]!.id;
    expect(() => setzeThemaEltern(q, a, d)).toThrow('eine-ebene');   // A hat schon ein Unterthema
    q = setzeThemaEltern(q, d, a, 4);
    expect(themenReihenfolge(q).map(x => [x.thema.name, x.ebene])).toEqual([['A', 0], ['B', 1], ['D', 1]]);
    q = verschiebeThema(q, d, -1);
    expect(themenReihenfolge(q).map(x => x.thema.name)).toEqual(['A', 'D', 'B']);
  });
  it('zählen ist erlaubt (Stellen, Fälle), Formhinweise nur zur Form', () => {
    const { q, id } = legeThemaAn(basis(), 'A', { codes: ['c1', 'c2'] }, 1);
    const t = q.themen!.find(x => x.id === id)!;
    expect(themaSegmente(q, t).sort()).toEqual(['s1', 's2']);
    expect(themaFaelle(q, t)).toEqual(['f1', 'f2']);
    expect(formhinweise(t)).toEqual(['kein-konzept']);
    expect(formhinweise({ ...t, codes: [] })).toEqual(['keine-codes', 'kein-konzept']);
    expect(formhinweise({ ...t, stand: 'verworfen', codes: [] })).toEqual([]);
  });
  it('halteVerweise: Code löschen nimmt ihn aus Themen mit Schritt; Fall löschen verwirft das persönliche Thema', () => {
    let q = basis();
    q = legeThemaAn(q, 'A', { codes: ['c1', 'c2'] }, 1).q;
    q = legeThemaAn(q, 'PET', { fall: 'f2', codes: ['c2'] }, 2).q;
    q = starteEinzelfall(q, 'f2');
    const n1 = halteVerweise(q, entferneCode(q, 'c2'), 9);
    const a = n1.themen!.find(t => t.name === 'A')!;
    expect(a.codes).toEqual(['c1']);
    expect(a.verlauf.at(-1)).toMatchObject({ was: 'codes', vorher: 'Scham' });
    const n2 = halteVerweise(q, entferneFall(q, 'f2'), 9);
    const pet = n2.themen!.find(t => t.name === 'PET')!;
    expect(pet.fall).toBeUndefined();
    expect(pet.stand).toBe('verworfen');
    expect(pet.verlauf.at(-1)!.notiz).toContain('Ben');
    expect(n2.einzelfall).toEqual({ an: true, fertig: [] });
    // ohne Themen: dasselbe Objekt
    const ohne = basis();
    expect(halteVerweise(ohne, ohne)).toBe(ohne);
    expect(halteVerweise(q, q)).toBe(q);
  });
  it('Kodierphase schreibt `code.phase` ins Änderungsprotokoll', () => {
    let q = basis();
    q = aendereCode(q, 'c1', { phase: 'offen' });
    q = aendereCode(q, 'c1', { phase: undefined });
    expect(q.codes[0]!.phase).toBeUndefined();
    expect(codeProtokoll(q)[0]).toMatchObject({ was: 'code.phase', nachher: { code: 'c1', text: '' } });
    q = legeCodeAn(q, 'Neu').q;
    expect(codeProtokoll(q)[0]!.was).toBe('code.neu');
  });
});

describe('Arbeitsweise: nur Voreinstellungen', () => {
  it('jede Kennung hat Name (de, en), Satz „Was ändert sich?“ und Voreinstellung; allgemein = heutiges Verhalten', () => {
    for (const a of ARBEITSWEISEN) {
      expect(ARBEITSWEISE_TEXT[a].name[0].length).toBeGreaterThan(5);
      expect(ARBEITSWEISE_TEXT[a].name[1].length).toBeGreaterThan(5);
      expect(ARBEITSWEISE_TEXT[a].aenderung[0].length).toBeGreaterThan(20);
      expect(VOREINSTELLUNGEN[a]).toBeDefined();
    }
    expect(VOREINSTELLUNGEN.allgemein).toEqual({ sichtbar: [], reihenfolge: ['baum', 'belege', 'memos', 'auswerten', 'nachv', 'faelle'] });
  });
  it('erwartete Voreinstellungen je Arbeitsweise (Fachblatt Abschnitt 7)', () => {
    const leer = new Set<never>();
    const mit = (a: (typeof ARBEITSWEISEN)[number]) => ({ arbeitsweise: a });
    expect(bereiche(mit('allgemein'), leer)).toEqual(['baum', 'belege', 'memos', 'auswerten', 'nachv', 'faelle']);
    expect(bereiche(mit('ta-reflexiv'), leer).slice(0, 2)).toEqual(['baum', 'themen']);
    expect(VOREINSTELLUNGEN['ta-reflexiv'].uebereinstimmungEingeklappt).toBe(true);
    expect(teilSichtbar(mit('ta-reflexiv'), 'tagebuch', leer)).toBe(true);
    expect(VOREINSTELLUNGEN.codebuch.nachvOffen).toBe(true);
    expect(VOREINSTELLUNGEN.codebuch.uebereinstimmungEingeklappt).toBeUndefined();
    expect(VOREINSTELLUNGEN.framework.startAuswerten).toBe('fk');
    expect(bereiche(mit('grounded-theory'), leer)[0]).toBe('memos');
    for (const t of ['gt-memos', 'phase', 'vergleich'] as const) expect(teilSichtbar(mit('grounded-theory'), t, leer)).toBe(true);
    expect(bereiche(mit('ipa'), leer)[0]).toBe('randnotizen');
    expect(VOREINSTELLUNGEN.ipa.einzelfallAnbieten).toBe(true);
    expect(VOREINSTELLUNGEN.sequenzanalyse.zumSequenzArbeitsplatz).toBe(true);
  });
  it('Strg+K öffnet jeden Teil bei jeder Wahl; vorhandene Themen bleiben bei „allgemein“ sichtbar', () => {
    for (const a of ARBEITSWEISEN) {
      const b = bereiche({ arbeitsweise: a }, new Set(['themen', 'vergleich', 'randnotizen'] as const));
      for (const x of ['themen', 'vergleich', 'randnotizen'] as const) expect(b, a).toContain(x);
    }
    const q = legeThemaAn(basis(), 'A', {}, 1).q;
    expect(teilSichtbar(q, 'themen', new Set())).toBe(true);
  });
  it('Wechsel ändert nichts außer der Angabe; zurück auf allgemein entfernt das Feld', () => {
    let q = legeThemaAn(basis(), 'A', {}, 1).q;
    const vorher = JSON.stringify(q);
    q = setzeArbeitsweise(q, 'grounded-theory');
    q = setzeArbeitsweise(q, 'allgemein');
    expect(JSON.stringify(q)).toBe(vorher);
    expect('arbeitsweise' in q).toBe(false);
  });
});

describe('Einzelfall-Modus: Sicht ohne verdeckte Fälle', () => {
  it('kein Text, Name, Memo oder persönliches Thema eines verdeckten Falls in der Sicht', () => {
    let q = basis();
    q.memos.push(
      { id: 'mb', text: 'Memo zu Ben GEHEIM-BEN', bezug: [{ art: 'segment', id: 's2' }], erstellt: 1 },
      { id: 'mc', text: 'Code-Memo', bezug: [{ art: 'code', id: 'c1' }], erstellt: 1 },
      { id: 'mv', text: 'Vergleich GEHEIM-BEN', art: 'vergleich', bezug: [{ art: 'segment', id: 's1' }, { art: 'segment', id: 's2' }], erstellt: 1 },
    );
    q = legeThemaAn(q, 'PET-Ben GEHEIM-BEN', { fall: 'f2' }, 1).q;
    q = legeThemaAn(q, 'PET-Amira', { fall: 'f1' }, 2).q;
    q = legeThemaAn(q, 'GET GEHEIM-BEN', {}, 3).q;
    q.zusammenfassungen = [{ zeile: 'f2', code: 'c2', text: 'GEHEIM-BEN', geaendert: 1 }, { zeile: 'f1', code: 'c1', text: 'Amira-Zusammenfassung', geaendert: 1 }];
    q = starteEinzelfall(q, 'f1');
    const s = sichtbaresProjekt(q);
    const json = JSON.stringify(s);
    expect(json).not.toContain('GEHEIM-BEN');
    expect(json).not.toContain('Ben');
    expect(s.dokumente.map(d => d.id)).toEqual(['d1']);
    expect(s.memos.map(m => m.id)).toEqual(['mc']);
    expect(s.themen!.map(t => t.name)).toEqual(['PET-Amira']);
    expect(s.faelle.map(f => f.id)).toEqual(['f1']);
    expect(json).toContain('GEHEIM-AMIRA');
  });
  it('fertig markieren, offene Fälle, ohne aktuellen Fall keine Dokumente, ohne Modus dasselbe Objekt', () => {
    let q = starteEinzelfall(basis(), 'f1');
    q = fallFertig(q);
    expect(q.einzelfall).toEqual({ an: true, fertig: ['f1'] });
    expect(offeneFaelle(q)).toEqual(['f2']);
    expect(sichtbaresProjekt(q).dokumente).toEqual([]);
    const aus = verlasseEinzelfall(q);
    expect(sichtbaresProjekt(aus)).toBe(aus);
  });
});

describe('Pseudonymisieren der neuen Freitext-Felder', () => {
  it('ersetzt Namen in Themen (Name, Konzept, Beschreibung, Notiz im Verlauf)', () => {
    let q = basis();
    q.dokumente[0]!.text = 'Anna Berger fragt ihre Tutorin.';
    q.segmente = []; q.kodierungen = [];
    const r = legeThemaAn(q, 'Wie Anna Berger fragt', { konzept: 'Anna Berger zeigt …' }, 1);
    q = setzeThemaStand(r.q, r.id, 'verworfen', 'Anna Berger passt nicht', 2);
    q = setzeKonzept(q, r.id, 'Anna Berger zeigt …', 3);
    q.themen![0]!.beschreibung = 'Bei Anna Berger';
    const t = findeTreffer(q, { namen: [{ text: 'Anna Berger', art: 'person' }], regeln: [], sprecherAlsPersonen: false }, 'de');
    const p = ersetze(q, t, 9).projekt;
    const json = JSON.stringify(p.themen);
    expect(json).not.toContain('Anna Berger');
    expect(json).toContain('[Person 1]');
  });
});

void setzeThemaFall;
