/**
 * Stufe A5 (Berichtshilfe COREQ und SRQR): Pflichttests Fassung 3 für `berichtshilfe` (Architekturblatt Ausbau 4), Kennungen und Reader,
 * Setzen ohne Vorbefüllung, Zählung ohne Note, Hinweise aus dem Projekt (nie gespeichert, nie Dokumenttext), Word-Anhang mit `docx-pruefen`,
 * Methodenanhang, Pseudonymisieren, Einzelfall-Sicht, kein Wortlaut der Originallisten.
 */
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { s } from './sitzung.svelte';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER, type QualProjekt } from './qualprojekt';
import { COREQ, SRQR, berichtHinweise, berichtshilfeWord, punktStand, punkteDerListe, setzeBerichtPunkt, transkriptDauerMs, zaehlung } from './berichtshilfe';
import { methodenanhangWord } from './nachvollziehbarkeit';
import { ersetze, type Treffer } from './pseudonym';
import { sichtbaresProjekt, starteEinzelfall } from './einzelfall-modus';
import { NICHT_IN_QDPX } from './qdpx-schreiben';

s.einst.sprache = 'de';
const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));
const wortlaut = (bytes: Uint8Array): string => {
  const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
  return [...doc.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]!).join(' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
};

/** kleines Interview-Projekt mit allem, was die Hinweise lesen */
function projekt(): QualProjekt {
  const q = neuesQualProjekt('Studie');
  q.kodierende = [{ id: 'k1', name: 'Ana' }, { id: 'k2', name: 'Ben' }, { id: 'k3', name: 'Cem' }];
  q.faelle = [{ id: 'f1', name: 'B1', werte: {} }, { id: 'f2', name: 'B2', werte: {} }, { id: 'f3', name: 'B3', werte: {} }];
  q.variablen = [{ id: 'v1', name: 'Alter', typ: 'ganzzahl' }, { id: 'v2', name: 'Fach', typ: 'text' }];
  const tr = (id: string, fall: string, bisMs: number, regeln: 'einfach' | 'froschauer-lueger') => ({
    id, name: id, art: 'audio' as const, text: 'GEHEIMER INTERVIEWTEXT', fall, erstellt: 1, geaendert: 1,
    transkript: { sprecher: [], abschnitte: [{ start: 0, ende: 5, zeitMs: 0, bisMs: 1000 }, { start: 5, ende: 10, zeitMs: 1000, bisMs }], regeln, quelle: 'aTrain' },
  });
  q.dokumente = [tr('d1', 'f1', 22 * 60000, 'einfach'), tr('d2', 'f2', 41 * 60000, 'einfach'), tr('d3', 'f2', 30 * 60000, 'froschauer-lueger')];
  q.codes = [{ id: 'c1', name: 'Hilfe', kodierbar: true, reihenfolge: 0 }];
  q.segmente = [{ id: 's1', dokument: 'd1', start: 0, ende: 5, erstellt: 1 }];
  q.kodierungen = [{ id: 'x1', segment: 's1', code: 'c1', kodierende: 'k1', erstellt: 1 }, { id: 'x2', segment: 's1', code: 'c1', kodierende: 'k2', erstellt: 1 }];
  q.memos = [
    { id: 'm1', text: 'GEHEIMES TAGEBUCH', bezug: [{ art: 'projekt' }], art: 'tagebuch', erstellt: 1 },
    { id: 'm2', text: 'GEHEIME SÄTTIGUNG', bezug: [{ art: 'projekt' }], art: 'saettigung', erstellt: 1 },
  ];
  q.protokolle = [{ id: 'p1', art: 'interview', fall: 'f1', kopf: { ort: 'GEHEIMER ORT', kontaktweg: 'GEHEIMER WEG', dauerMin: 25 }, felder: {}, erstellt: 1, geaendert: 1 }];
  q.einwilligungen = [
    { id: 'e1', fall: 'f1', fassung: 'Infoblatt 1', form: 'schriftlich', punkte: [{ punkt: 'teilnahme', stand: 'erteilt' }, { punkt: 'zitate', stand: 'erteilt' }, { punkt: 'aufnahme', stand: 'erteilt' }], erstellt: 1, geaendert: 1 },
    { id: 'e2', fall: 'f3', fassung: 'Infoblatt 1', form: 'schriftlich', punkte: [{ punkt: 'teilnahme', stand: 'abgelehnt' }], erstellt: 1, geaendert: 1 },
  ];
  return q;
}

describe('A5 Fassung 3: Pflichttests (Architekturblatt Ausbau 4)', () => {
  it('1. altes Projekt Fassung 1 und 2 bleibt gleich (Bytes nach Lesen und Schreiben)', () => {
    const q1 = neuesQualProjekt('alt');
    expect(rund(q1).version).toBe(1);
    expect(JSON.stringify(rund(rund(q1)))).toBe(JSON.stringify(rund(q1)));
    const q2 = projekt();
    expect(qualFassung(q2)).toBe(3); // Tagebuch und Sättigung sind A3-Memo-Arten
    const ohneA3 = { ...q2, memos: [] };
    expect(qualFassung(ohneA3)).toBe(2);
    expect(JSON.stringify(rund(rund({ ...ohneA3, version: 2 })))).toBe(JSON.stringify(rund({ ...ohneA3, version: 2 })));
  });
  it('2. nur Arbeitsweise: Fassung bleibt 1; Berichtshilfe ohne gesetzten Punkt fehlt ganz', () => {
    expect(rund({ ...neuesQualProjekt('a'), arbeitsweise: 'ta-reflexiv' }).version).toBe(1);
    const q = setzeBerichtPunkt(setzeBerichtPunkt(neuesQualProjekt('b'), 'coreq', 'coreq-01', { stand: 'erfuellt' }, 2), 'coreq', 'coreq-01', { stand: null }, 3);
    expect(q.berichtshilfe).toBeUndefined();
    expect(qualFassung(q)).toBe(1);
  });
  it('3. berichtshilfe hebt auf 3 und übersteht Lesen und Schreiben verlustfrei', () => {
    let q = setzeBerichtPunkt(neuesQualProjekt('b'), 'srqr', 'srqr-21', { stand: 'nicht-zutreffend', notiz: 'keine Förderung' }, 5);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-12', { stand: 'erfuellt', fundstelle: 'S. 14' }, 6);
    expect(qualFassung(q)).toBe(3);
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.berichtshilfe).toEqual(q.berichtshilfe);
    expect(r.berichtshilfe!.map(x => x.liste)).toEqual(['coreq', 'srqr']);
    expect(BEKANNTE_FELDER).toContain('berichtshilfe');
  });
  it('4. Fassung 4 wird laut abgelehnt', () => {
    expect(() => pruefeQualProjekt({ ...neuesQualProjekt('x'), version: 4 })).toThrow(/Fassung/);
  });
  it('Leser lehnt laut ab: unbekannter Stand, falsche Kennung, Kennung der anderen Liste, doppelte Punkte und Listen', () => {
    const q = setzeBerichtPunkt(neuesQualProjekt('s'), 'coreq', 'coreq-01', { stand: 'offen' }, 4);
    const roh = () => JSON.parse(JSON.stringify(q));
    const a = roh(); a.berichtshilfe[0].punkte[0].stand = 'gut'; expect(() => pruefeQualProjekt(a)).toThrow();
    const b = roh(); b.berichtshilfe[0].punkte[0].kennung = 'coreq-33'; expect(() => pruefeQualProjekt(b)).toThrow(/unbekannter Punkt/);
    const c = roh(); c.berichtshilfe[0].punkte[0].kennung = 'srqr-01'; expect(() => pruefeQualProjekt(c)).toThrow(/unbekannter Punkt/);
    const d = roh(); d.berichtshilfe[0].punkte.push({ ...d.berichtshilfe[0].punkte[0] }); expect(() => pruefeQualProjekt(d)).toThrow();
    const e = roh(); e.berichtshilfe.push({ ...e.berichtshilfe[0] }); expect(() => pruefeQualProjekt(e)).toThrow();
    const f = roh(); f.berichtshilfe[0].liste = 'prisma'; expect(() => pruefeQualProjekt(f)).toThrow();
  });
});

describe('A5 Liste und Setzen', () => {
  it('32 COREQ- und 21 SRQR-Punkte mit festen Kennungen, Nummern und Fachbegriff', () => {
    expect(COREQ).toHaveLength(32); expect(SRQR).toHaveLength(21);
    expect(COREQ[0]).toMatchObject({ kennung: 'coreq-01', nummer: '1' });
    expect(COREQ[31]).toMatchObject({ kennung: 'coreq-32', nummer: '32', begriff: 'Clarity of minor themes' });
    expect(SRQR[20]).toMatchObject({ kennung: 'srqr-21', nummer: 'S21', begriff: 'Funding' });
    expect(COREQ[22]!.begriff).toBe('Transcripts returned');
    for (const p of [...COREQ, ...SRQR]) { expect(p.text().length).toBeGreaterThan(10); expect(p.text()).toMatch(/\?$/); }
  });
  it('kein Wortlaut der Originallisten: englische Kurzfassungen enthalten keine typischen Originalsätze', () => {
    s.einst.sprache = 'en';
    try {
      const alle = [...COREQ, ...SRQR].map(p => p.text()).join(' | ');
      for (const verboten of ['Which author/s', 'What were the researcher', 'Was the researcher a male or female', 'How were participants selected? e.g.', 'Concise description of the nature and significance']) expect(alle).not.toContain(verboten);
      expect(COREQ[0]!.text()).toBe('Who led the interviews or groups?');
    } finally { s.einst.sprache = 'de'; }
  });
  it('setzen, Fundstelle und Notiz bleiben beim Wechsel des Stands; ohne Stand wird nichts gespeichert; Reihenfolge der Liste', () => {
    let q = setzeBerichtPunkt(neuesQualProjekt('s'), 'coreq', 'coreq-05', { fundstelle: 'S. 3' }, 1);
    expect(q.berichtshilfe).toBeUndefined();
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-05', { stand: 'offen', fundstelle: '  S. 3 ', notiz: 'n' }, 2);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-02', { stand: 'erfuellt' }, 3);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-05', { stand: 'erfuellt' }, 4);
    expect(punktStand(q, 'coreq', 'coreq-05')).toEqual({ kennung: 'coreq-05', stand: 'erfuellt', fundstelle: 'S. 3', notiz: 'n', geaendert: 4 });
    expect(q.berichtshilfe![0]!.punkte.map(p => p.kennung)).toEqual(['coreq-02', 'coreq-05']);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-05', { notiz: '' }, 5);
    expect(punktStand(q, 'coreq', 'coreq-05')!.notiz).toBeUndefined();
    expect(() => setzeBerichtPunkt(q, 'coreq', 'srqr-01', { stand: 'offen' })).toThrow();
  });
  it('Zählung ohne Note: bearbeitet = mit Stand, noch offen = ohne Stand oder „offen“', () => {
    let q = neuesQualProjekt('z');
    expect(zaehlung(q, 'srqr')).toEqual({ n: 21, bearbeitet: 0, nochOffen: 21 });
    q = setzeBerichtPunkt(q, 'srqr', 'srqr-01', { stand: 'erfuellt' }, 1);
    q = setzeBerichtPunkt(q, 'srqr', 'srqr-02', { stand: 'offen' }, 1);
    q = setzeBerichtPunkt(q, 'srqr', 'srqr-03', { stand: 'nicht-zutreffend' }, 1);
    expect(zaehlung(q, 'srqr')).toEqual({ n: 21, bearbeitet: 3, nochOffen: 19 });
    expect(zaehlung(q, 'coreq')).toEqual({ n: 32, bearbeitet: 0, nochOffen: 32 });
  });
});

describe('A5 Hinweise aus dem Projekt', () => {
  it('liest Fälle, Transkripte, Dauer, Regeln, Kodierende, Einwilligung, Memos, Protokolle - nie Text aus Dokumenten oder Protokollen', () => {
    const q = projekt();
    const h = berichtHinweise(q, { leitfaeden: 1 });
    const t = (k: string) => (h[k] ?? []).map(x => x.text).join(' ');
    expect(t('coreq-12')).toContain('3 Fälle, 3 Transkripte, 3 Dokumente');
    expect(t('coreq-21')).toContain('22 bis 41 Minuten, im Mittel 31 Minuten');
    expect(t('coreq-18')).toContain('1 Fall hat mehr als ein Transkript');
    expect(t('srqr-13')).toContain('einfache Regeln (Dresing und Pehl) (2)');
    expect(t('srqr-13')).toContain('Froschauer und Lueger (1)');
    expect(t('srqr-11')).toContain('aTrain');
    expect(t('coreq-24')).toContain('2 Personen haben im Projekt kodiert: Ana, Ben');
    expect(t('coreq-22')).toContain('Sättigungs-Memo vorhanden');
    expect(t('coreq-08')).toContain('1 Eintrag im reflexiven Tagebuch');
    expect(t('coreq-13')).toContain('1 Fall mit Teilnahme abgelehnt');
    expect(t('coreq-29')).toContain('1 von 3 Fällen');
    expect(t('srqr-09')).toContain('2 Fälle von 3');
    expect(t('coreq-16')).toContain('Alter, Fach');
    expect(t('coreq-17')).toContain('1 Leitfaden');
    expect(t('coreq-19')).toContain('3 Dokumente haben eine Aufnahme');
    expect(t('coreq-14')).toContain('1 Interviewprotokoll');
    expect(h['coreq-23']).toBeUndefined(); // nichts bekannt: kein „unbekannt“
    expect(h['coreq-09']).toBeUndefined(); // keine Arbeitsweise gewählt
    const alles = JSON.stringify(h);
    for (const geheim of ['GEHEIM']) expect(alles).not.toContain(geheim);
    // nur Hinweise: das Projekt bleibt ohne Berichtshilfe
    expect(q.berichtshilfe).toBeUndefined();
  });
  it('reflexive TA: Punkt 24 und S15 bekommen den Satz zur Übereinstimmung; Arbeitsweise mit Sprung', () => {
    const q = { ...projekt(), arbeitsweise: 'ta-reflexiv' as const };
    const h = berichtHinweise(q);
    expect(h['coreq-24']!.map(x => x.text).join(' ')).toContain('kein Gütemaß (Braun und Clarke 2021)');
    expect(h['srqr-15']!.map(x => x.text).join(' ')).toContain('kein Gütemaß');
    expect(h['coreq-09']![0]).toMatchObject({ ziel: 'kodieren/arbeitsweise' });
    expect(h['coreq-09']![0]!.text).toContain('reflexive thematische Analyse');
  });
  it('Dauer aus Protokollen, wenn Transkripte keine Zeitmarken haben; leeres Projekt hat nur den Software-Hinweis', () => {
    const q = projekt();
    for (const d of q.dokumente) d.transkript!.abschnitte = d.transkript!.abschnitte.map(a => ({ start: a.start, ende: a.ende }));
    expect(transkriptDauerMs(q.dokumente[0]!)).toBe(0);
    expect(berichtHinweise(q)['coreq-21']![0]!.text).toContain('25 bis 25 Minuten');
    expect(Object.keys(berichtHinweise(neuesQualProjekt('leer')))).toEqual(['coreq-27']);
  });
  it('englische Hinweise', () => {
    s.einst.sprache = 'en';
    try { expect(berichtHinweise(projekt())['coreq-21']![0]!.text).toContain('22 to 41 minutes, on average 31 minutes'); } finally { s.einst.sprache = 'de'; }
  });
});

describe('A5 Word, Methodenanhang, Pseudonymisieren, Einzelfall', () => {
  it('Word-Anhang: Quellenhinweis, alle Punkte, Stand der Person, keine Hinweise; docx-pruefen grün (de und en)', async () => {
    let q = setzeBerichtPunkt(projekt(), 'coreq', 'coreq-21', { stand: 'erfuellt', fundstelle: 'S. 12', notiz: 'Dauer genannt' }, 1);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-23', { stand: 'nicht-zutreffend' }, 1);
    for (const sp of ['de', 'en'] as const) {
      s.einst.sprache = sp;
      try {
        const b = await berichtshilfeWord(q, 'coreq', sp);
        expect(pruefeDocx(b)).toEqual([]);
        const t = wortlaut(b);
        expect(t).toContain(sp === 'de' ? 'Eigene Kurzfassung nach Tong u. a. (2007)' : 'Own short version after Tong et al. (2007)');
        expect(t).toContain('10.1093/intqhc/mzm042');
        expect(t).toContain(sp === 'de' ? '2 von 32 Punkten bearbeitet' : '2 of 32 items worked on');
        expect(t).toContain('S. 12'); expect(t).toContain('Dauer genannt');
        expect(t).toContain(sp === 'de' ? 'Trifft nicht zu' : 'Not applicable');
        expect(t).toContain(sp === 'de' ? 'noch nicht gesetzt' : 'not set yet');
        expect(t).toContain('(Clarity of minor themes)');
        expect(t).not.toContain('Zeitmarken'); expect(t).not.toContain('time stamps');
        expect(t).not.toMatch(/\d+ ?%/);
      } finally { s.einst.sprache = 'de'; }
    }
    const srqr = wortlaut(await berichtshilfeWord(q, 'srqr', 'de'));
    expect(srqr).toContain("O'Brien u. a. (2014)"); expect(srqr).toContain('0 von 21');
  });
  it('Methodenanhang nennt die Zählung je Liste, ohne Note; REFI-QDA-Liste nennt die Berichtshilfe', async () => {
    const q = setzeBerichtPunkt(projekt(), 'srqr', 'srqr-04', { stand: 'erfuellt' }, 1);
    const t = wortlaut(await methodenanhangWord(q, 'de'));
    expect(t).toContain('SRQR: 1 von 21 Punkten bearbeitet');
    expect(t).not.toContain('COREQ:');
    expect(pruefeDocx(await methodenanhangWord(q, 'en'))).toEqual([]);
    expect(NICHT_IN_QDPX.de.join(' ')).toContain('Berichtshilfe');
  });
  it('Pseudonymisieren ersetzt Namen in Fundstelle und Notiz', () => {
    let q = projekt();
    q.dokumente[0]!.text = 'B: Amira sagt';
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-29', { stand: 'erfuellt', fundstelle: 'Zitat Amira S. 4', notiz: 'Amira will nicht zitiert werden' }, 1);
    const tr: Treffer[] = [{ id: 't1', dokument: 'd1', start: 3, ende: 8, text: 'Amira', art: 'person', ersatz: '[Person 1]', an: true }];
    const r = ersetze(q, tr, 9).projekt;
    expect(punktStand(r, 'coreq', 'coreq-29')).toMatchObject({ fundstelle: 'Zitat [Person 1] S. 4', notiz: '[Person 1] will nicht zitiert werden' });
    expect(() => rund(r)).not.toThrow();
  });
  it('Einzelfall-Modus: die Berichtshilfe ist in der Sicht leer', () => {
    let q = setzeBerichtPunkt(projekt(), 'coreq', 'coreq-01', { stand: 'erfuellt', notiz: 'B2 sagt viel' }, 1);
    q = starteEinzelfall(q, 'f1');
    const v = sichtbaresProjekt(q);
    expect(v.berichtshilfe).toEqual([]);
    expect(JSON.stringify(v)).not.toContain('B2 sagt viel');
  });
  it('jede Kennung der Liste ist im Leser gültig', () => {
    for (const l of ['coreq', 'srqr'] as const) {
      let q = neuesQualProjekt('k');
      for (const p of punkteDerListe(l)) q = setzeBerichtPunkt(q, l, p.kennung, { stand: 'offen' }, 1);
      expect(rund(q).berichtshilfe![0]!.punkte).toHaveLength(punkteDerListe(l).length);
    }
  });
});
