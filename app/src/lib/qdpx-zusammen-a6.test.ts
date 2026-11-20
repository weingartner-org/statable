// Zusammenführen (Stufe A6): Sequenzanalysen, Spaltensätze, Selbstprüfung und Berichtshilfe.
import { describe, expect, it } from 'vitest';
import { neuesQualProjekt, pruefeQualProjekt, type Dokument, type QualProjekt } from './qualprojekt';
import { neueAnalyse } from './feinstruktur-analyse';
import { eigeneSpalte, neuerEigenerSatz, type Spaltensatz } from './feinstruktur-spalten';
import { fuehreZusammen } from './qdpx';

const klon = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const TEXT = 'Ich wollte es einfach versuchen.';
const dok = (id: string, name: string, text = TEXT): Dokument => ({ id, name, art: 'text', text, erstellt: 1, geaendert: 1 });
const analyse = (name: string, dokument?: string, spaltensatz?: string) => {
  const sa = neueAnalyse({ start: 0, ende: TEXT.length, text: TEXT, forschungsfrage: 'Wie?', name, jetzt: 1, ...(spaltensatz ? { spaltensatz } : {}) });
  if (dokument) sa.dokument = dokument;
  return sa;
};
const projekt = (name: string): QualProjekt => { const q = neuesQualProjekt(name); q.dokumente.push(dok('d-' + name, name, TEXT + ' ' + name)); return q; };
const rund = (q: QualProjekt) => pruefeQualProjekt(JSON.parse(JSON.stringify(q)));
const satzX = (kennung: string, name: string): Spaltensatz => { const s = neuerEigenerSatz(name, 'V', eigeneSpalte('Spalte A')); s.kennung = kennung; return s; };

describe('fuehreZusammen: Sequenzanalysen', () => {
  it('(a) Analyse aus b kommt mit, Dokument umgesetzt, Herkunft gesetzt, a unverändert', () => {
    const a = projekt('A'); a.sequenzanalysen = [analyse('Eins', 'd-A')];
    const b = projekt('B'); b.sequenzanalysen = [analyse('Zwei', 'd-B')];
    const z = fuehreZusammen(a, b, 'de');
    const sa = z.projekt.sequenzanalysen!;
    expect(sa).toHaveLength(2);
    expect(sa[0]).toEqual(a.sequenzanalysen![0]);
    expect(sa[1]!.id).not.toBe(sa[0]!.id);
    expect(sa[1]!.dokument).toBe(z.projekt.dokumente.find(x => x.name === 'B')!.id);
    expect(sa[1]!.herkunft!.art).toBe('zusammengefuehrt');
    expect(sa[1]!.herkunft!.quellen).toEqual(['B']);
    expect(z.projekt.version).toBe(2);
  });
  it('Dokument fehlt in der Zuordnung: Feld entfällt, Analyse bleibt', () => {
    const a = projekt('A'); const b = projekt('B');
    b.sequenzanalysen = [analyse('Zwei', 'gibt-es-nicht')];
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.sequenzanalysen![0]!.dokument).toBeUndefined();
  });
  it('(b) gleicher Name: Zusatz und Meldung', () => {
    const a = projekt('A'); a.sequenzanalysen = [analyse('Eins')];
    const b = projekt('B'); b.sequenzanalysen = [analyse('Eins')];
    const z = fuehreZusammen(a, b, 'en');
    expect(z.projekt.sequenzanalysen![1]!.name).toBe('Eins (from file 2)');
    expect(z.meldungen.filter(m => m.art === 'analyse-gleicher-name')).toHaveLength(1);
  });
});

describe('fuehreZusammen: Spaltensätze', () => {
  it('(c) gleicher Satz wird wiederverwendet', () => {
    const s = satzX('eigen-1', 'Mein Satz');
    const a = projekt('A'); a.spaltensaetze = [klon(s)];
    const b = projekt('B'); b.spaltensaetze = [klon(s)]; b.sequenzanalysen = [analyse('Zwei', undefined, 'eigen-1')];
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.spaltensaetze).toHaveLength(1);
    expect(z.projekt.sequenzanalysen![0]!.spaltensatz).toBe('eigen-1');
  });
  it('(c) verschiedener Satz mit gleicher Kennung kommt neu, Analyse zeigt auf neue Kennung', () => {
    const a = projekt('A'); a.spaltensaetze = [satzX('eigen-1', 'Mein Satz')];
    const sb = satzX('eigen-1', 'Mein Satz'); sb.spalten[0]!.name = { de: 'Anders', en: 'Anders' };
    const b = projekt('B'); b.spaltensaetze = [sb]; b.sequenzanalysen = [analyse('Zwei', undefined, 'eigen-1')];
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.spaltensaetze).toHaveLength(2);
    const neu = z.projekt.spaltensaetze![1]!;
    expect(neu.kennung).not.toBe('eigen-1');
    expect(neu.name.de).toBe('Mein Satz (aus Datei 2)');
    expect(z.projekt.sequenzanalysen![0]!.spaltensatz).toBe(neu.kennung);
    expect(z.projekt.version).toBe(3);
  });
  it('eingebaute Sätze bleiben Kennungen', () => {
    const a = projekt('A'); const b = projekt('B'); b.sequenzanalysen = [analyse('Zwei', undefined, 'ipa')];
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.sequenzanalysen![0]!.spaltensatz).toBe('ipa');
    expect(z.projekt.spaltensaetze).toBeUndefined();
  });
});

describe('fuehreZusammen: Berichtshilfe und Selbstprüfung', () => {
  it('(d) Berichtshilfe: nur in b übernommen, verschieden: a bleibt, eine Meldung, ganze Liste nur in b übernommen', () => {
    const a = projekt('A'); a.berichtshilfe = [{ liste: 'coreq', punkte: [
      { kennung: 'coreq-01', stand: 'erfuellt', geaendert: 1 }, { kennung: 'coreq-02', stand: 'offen', notiz: 'x', geaendert: 1 }, { kennung: 'coreq-03', stand: 'offen', geaendert: 1 }] }];
    const b = projekt('B'); b.berichtshilfe = [
      { liste: 'coreq', punkte: [{ kennung: 'coreq-01', stand: 'erfuellt', geaendert: 9 }, { kennung: 'coreq-02', stand: 'erfuellt', geaendert: 9 }, { kennung: 'coreq-03', stand: 'nicht-zutreffend', geaendert: 9 }, { kennung: 'coreq-04', stand: 'erfuellt', geaendert: 9 }] },
      { liste: 'srqr', punkte: [{ kennung: 'srqr-01', stand: 'erfuellt', geaendert: 9 }] }];
    const z = fuehreZusammen(a, b, 'de');
    const c = z.projekt.berichtshilfe!.find(x => x.liste === 'coreq')!;
    expect(c.punkte.find(x => x.kennung === 'coreq-02')!.stand).toBe('offen');
    expect(c.punkte.find(x => x.kennung === 'coreq-03')!.stand).toBe('offen');
    expect(c.punkte.find(x => x.kennung === 'coreq-04')!.stand).toBe('erfuellt');
    expect(z.projekt.berichtshilfe!.find(x => x.liste === 'srqr')!.punkte).toHaveLength(1);
    const m = z.meldungen.filter(x => x.art === 'pruefpunkt-verschieden');
    expect(m).toHaveLength(1);
    expect(m[0]!.satz).toBe('COREQ: Bei 2 Punkten stehen in den beiden Dateien verschiedene Angaben. Statable behält die Angaben der ersten Datei.');
  });
  it('(e) Selbstprüfung gleich', () => {
    const a = projekt('A'); a.selbstpruefung = [{ liste: 'mmat', punkte: [{ kennung: 'p1', stand: 'ja', geaendert: 1 }] }];
    const b = projekt('B'); b.selbstpruefung = [
      { liste: 'mmat', punkte: [{ kennung: 'p1', stand: 'nein', geaendert: 2 }, { kennung: 'p2', stand: 'unklar', geaendert: 2 }] },
      { liste: 'gramms', punkte: [{ kennung: 'g1', stand: 'ja', geaendert: 2 }] }];
    const z = fuehreZusammen(a, b, 'en');
    const m = z.projekt.selbstpruefung!.find(x => x.liste === 'mmat')!;
    expect(m.punkte.map(x => [x.kennung, x.stand])).toEqual([['p1', 'ja'], ['p2', 'unklar']]);
    expect(z.projekt.selbstpruefung!.some(x => x.liste === 'gramms')).toBe(true);
    const me = z.meldungen.filter(x => x.art === 'pruefpunkt-verschieden');
    expect(me).toHaveLength(1);
    expect(me[0]!.satz).toContain('MMAT: For 1 items');
  });
});

describe('fuehreZusammen: Unverändertheit und Gültigkeit', () => {
  it('(f)(g) a und b bleiben gleich, Ergebnis besteht den Leser nach JSON-Rundweg', () => {
    const a = projekt('A'); a.sequenzanalysen = [analyse('Eins', 'd-A')]; a.spaltensaetze = [satzX('eigen-1', 'S')];
    a.berichtshilfe = [{ liste: 'coreq', punkte: [{ kennung: 'coreq-01', stand: 'offen', geaendert: 1 }] }];
    const b = projekt('B'); b.sequenzanalysen = [analyse('Zwei', 'd-B', 'eigen-2')]; b.spaltensaetze = [satzX('eigen-2', 'T')];
    b.berichtshilfe = [{ liste: 'coreq', punkte: [{ kennung: 'coreq-01', stand: 'erfuellt', geaendert: 2 }] }];
    b.selbstpruefung = [{ liste: 'gramms', punkte: [{ kennung: 'g1', stand: 'ja', geaendert: 2 }] }];
    const a0 = klon(a), b0 = klon(b);
    const z = fuehreZusammen(a, b, 'de');
    expect(a).toEqual(a0); expect(b).toEqual(b0);
    const r = rund(z.projekt);
    expect(r.sequenzanalysen).toHaveLength(2);
    expect(r.version).toBe(3);
  });
});

/* ---- Stufe A6a Teil 2: Protokolle, Typen, Joint Displays, Instrument, Einzelangaben, Einwilligungen ---- */
const mitFall = (name: string, fallName = 'Fall X'): QualProjekt => {
  const q = projekt(name);
  q.faelle.push({ id: 'f-' + name, name: fallName, werte: {} });
  q.dokumente[0]!.fall = 'f-' + name;
  q.variablen.push({ id: 'v-' + name, name: 'gruppe', typ: 'text' });
  q.codes.push({ id: 'c-' + name, name: 'Hilfe', kodierbar: true, reihenfolge: 0 });
  q.segmente.push({ id: 's-' + name, dokument: 'd-' + name, start: 0, ende: 3, erstellt: 1 });
  return q;
};
const proto = (id: string, fall: string, dokument: string): NonNullable<QualProjekt['protokolle']>[number] =>
  ({ id, art: 'interview', fall, dokument, kopf: { ort: 'Büro' }, felder: { verlauf: 'v' }, erstellt: 1, geaendert: 1 });

describe('fuehreZusammen A6a: Protokolle', () => {
  it('Protokoll aus b kommt mit, Fall und Dokument umgesetzt, Memo auf das Protokoll bleibt erhalten, a unverändert', () => {
    const a = mitFall('A'); a.protokolle = [proto('p1', 'f-A', 'd-A')];
    const b = mitFall('B'); b.protokolle = [proto('p1', 'f-B', 'd-B')];
    b.memos.push({ id: 'm1', text: 'zum Protokoll', bezug: [{ art: 'protokoll', id: 'p1' }], erstellt: 1 });
    const a0 = klon(a);
    const z = fuehreZusammen(a, b, 'de');
    expect(a).toEqual(a0);
    const p = z.projekt.protokolle!;
    expect(p).toHaveLength(2);
    expect(p[0]).toEqual(a.protokolle![0]);
    expect(p[1]!.id).not.toBe('p1');                         // Kollision: neue Kennung
    expect(p[1]!.dokument).toBe(z.projekt.dokumente.find(x => x.name === 'B')!.id);
    expect(p[1]!.fall).toBe(z.projekt.faelle.find(f => f.name === 'Fall X')!.id);   // gleicher Fallname = derselbe Fall
    expect(z.projekt.memos.find(m => m.text === 'zum Protokoll')!.bezug).toEqual([{ art: 'protokoll', id: p[1]!.id }]);
    expect(rund(z.projekt).version).toBe(2);
  });
  it('Bezug ins Leere entfällt, Protokoll bleibt', () => {
    const a = mitFall('A'); const b = mitFall('B'); b.protokolle = [proto('p2', 'gibt-es-nicht', 'auch-nicht')];
    const x = fuehreZusammen(a, b, 'en').projekt.protokolle![0]!;
    expect(x.fall).toBeUndefined(); expect(x.dokument).toBeUndefined();
  });
});

describe('fuehreZusammen A6a: Typen, Joint Displays, Instrument', () => {
  const baue = (): { a: QualProjekt; b: QualProjekt } => {
    const a = mitFall('A', 'Fall A'); const b = mitFall('B', 'Fall B');
    b.codes[0]!.name = 'Scham';   // anderer Pfad: kommt als neuer Code
    a.typen = [{ id: 'ty', name: 'Typ A', faelle: ['f-A'], merkmale: ['c-A'] }];
    b.typen = [{ id: 'ty', name: 'Typ B', faelle: ['f-B'], merkmale: ['c-B', 'v-B'] }];
    b.themen = [{ id: 'th', name: 'T', codes: ['c-B'], stand: 'aktiv', verlauf: [{ zeit: 1, was: 'angelegt', nachher: 'T' }], reihenfolge: 0, erstellt: 1, geaendert: 1 }];
    b.jointDisplays = [{
      id: 'jd', name: 'JD B', art: 'qual-nach-gruppen', gruppierung: { quelle: 'typen' }, zeilen: [{ art: 'code', id: 'c-B' }, { art: 'thema', id: 'th' }], spalten: [],
      belege: [{ zeile: 'code:c-B', gruppe: 'typ:ty', segment: 's-B' }], passung: { 'code:c-B': 'bestaetigung', 'thema:th': 'offen' }, metaInferenz: { 'thema:th': 'Meta' }, erstellt: 1, geaendert: 1,
    }];
    b.instrument = [{ id: 'it', text: 'Item', herkunft: { art: 'code', id: 'c-B' }, beleg: 's-B', plan: { plan: 'x', item: 'y' }, erstellt: 1, geaendert: 1 }];
    return { a, b };
  };
  it('alles kommt mit, Bezüge zeigen auf die Ziele im Ergebnis', () => {
    const { a, b } = baue();
    const z = fuehreZusammen(a, b, 'de');
    const p = z.projekt;
    const code = p.codes.find(c => c.name === 'Scham')!, thema = p.themen![0]!, fall = p.faelle.find(f => f.name === 'Fall B')!;
    const typ = p.typen![1]!;
    expect(p.typen).toHaveLength(2);
    expect(typ.id).not.toBe('ty');
    expect(typ.faelle).toEqual([fall.id]);
    expect(typ.merkmale).toEqual([code.id, p.variablen.find(v => v.name === 'gruppe')!.id]);
    const jd = p.jointDisplays![0]!;
    expect(jd.zeilen).toEqual([{ art: 'code', id: code.id }, { art: 'thema', id: thema.id }]);
    expect(jd.gruppierung).toEqual({ quelle: 'typen' });
    expect(jd.belege[0]).toEqual({ zeile: `code:${code.id}`, gruppe: `typ:${typ.id}`, segment: p.segmente.find(s => s.id !== 's-A' && s.dokument !== 'd-A')!.id });
    expect(Object.keys(jd.passung).sort()).toEqual([`code:${code.id}`, `thema:${thema.id}`].sort());
    expect(Object.keys(jd.metaInferenz)).toEqual([`thema:${thema.id}`]);
    const it = p.instrument![0]!;
    expect(it.herkunft).toEqual({ art: 'code', id: code.id });
    expect(it.plan).toBeUndefined();
    expect(it.beleg).toBe(jd.belege[0]!.segment);
    expect(rund(p).version).toBe(3);
    expect(a.typen).toHaveLength(1);
  });
  it('nicht sicher umsetzbarer Bezug: Element aus b bleibt weg, Meldung', () => {
    const { a, b } = baue();
    b.typen![0]!.faelle.push('fall-gibt-es-nicht');
    b.jointDisplays![0]!.zeilen.push({ art: 'code', id: 'code-gibt-es-nicht' });
    const z = fuehreZusammen(a, b, 'en');
    expect(z.projekt.typen).toHaveLength(1);
    expect(z.projekt.jointDisplays).toBeUndefined();
    const m = z.meldungen.filter(x => x.art === 'element-nicht-uebernommen');
    expect(m).toHaveLength(2);
    expect(m[0]!.satz).toBe('The type "Typ B" from file 2 was not taken over: a reference to cases, codes or themes could not be mapped safely.');
  });
  it('Joint Display, das auf einen weggelassenen Typ zeigt, verliert den Beleg mit dem Typ-Schlüssel', () => {
    const { a, b } = baue();
    b.typen![0]!.faelle.push('fall-gibt-es-nicht');
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.jointDisplays![0]!.belege).toEqual([]);
  });
});

describe('fuehreZusammen A6a: Einzelangaben und Einwilligungen', () => {
  it('erste Datei gewinnt, fehlt sie dort kommt sie aus b, verschieden: Meldung', () => {
    const a = mitFall('A'); const b = mitFall('B');
    a.kiNutzung = { genutzt: false, zwecke: [], geaendert: 1 };
    b.kiNutzung = { genutzt: true, zwecke: ['transkription'], geaendert: 2 };
    b.verknuepfung = { variable: 'v-B', spalte: 'id', geaendert: 2 };
    b.mmDesign = { zwecke: ['ergaenzung'], integration: [], geaendert: 2 };
    a.mmDesign = { zwecke: ['ergaenzung'], integration: [], geaendert: 9 };   // gleich bis auf `geaendert`: keine Meldung
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.kiNutzung).toEqual(a.kiNutzung);
    expect(z.projekt.verknuepfung!.variable).toBe(z.projekt.variablen.find(v => v.name === 'gruppe')!.id);
    expect(z.projekt.verknuepfung!.spalte).toBe('id');
    expect(z.projekt.mmDesign).toEqual(a.mmDesign);
    const m = z.meldungen.filter(x => x.art === 'einstellung-verschieden');
    expect(m).toHaveLength(1);
    expect(m[0]!.satz).toBe('Angabe zur KI-Nutzung: Die beiden Dateien haben verschiedene Angaben. Statable behält die Angabe der ersten Datei.');
    expect(rund(z.projekt).version).toBe(3);
  });
  it('Einwilligungen aus b werden nicht übernommen, die aus a bleiben, Meldung mit Zahl', () => {
    const a = mitFall('A'); a.einwilligungen = [{ id: 'e1', fall: 'f-A', fassung: 'V', form: 'digital', punkte: [], erstellt: 1, geaendert: 1 }];
    const b = mitFall('B'); b.einwilligungen = [
      { id: 'e1', fall: 'f-B', fassung: 'V', form: 'digital', punkte: [], erstellt: 1, geaendert: 1 },
      { id: 'e2', fall: 'f-B', fassung: 'V', form: 'digital', punkte: [], erstellt: 1, geaendert: 1 }];
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.einwilligungen).toEqual(a.einwilligungen);
    const m = z.meldungen.filter(x => x.art === 'einwilligungen-nicht-uebernommen');
    expect(m).toHaveLength(1);
    expect(m[0]!.anzahl).toBe(2);
    expect(m[0]!.satz).toBe('2 Einwilligungen aus Datei 2 wurden bewusst nicht übernommen: Einwilligungen gehören zu der Person, die sie eingeholt hat.');
    expect(fuehreZusammen(a, b, 'en').meldungen.find(x => x.art === 'einwilligungen-nicht-uebernommen')!.satz).toContain('2 consent records from file 2 were deliberately not taken over');
    // fehlt in a ganz: bleibt ebenfalls leer
    const a2 = mitFall('A');
    expect(fuehreZusammen(a2, b, 'de').projekt.einwilligungen).toBeUndefined();
  });
});
