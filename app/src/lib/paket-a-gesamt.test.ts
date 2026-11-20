/**
 * Stufe A6a Teil 2: Gesamtprüfung des qualitativen Datenmodells (Paket A + Feinstruktur).
 * (a) alle Felder zugleich: Lesen und Schreiben verlustfrei, Fassung 3, jedes Feld allein, unbekannte Felder bleiben;
 * (b) Pseudonymisieren über alle Freitextfelder; (c) Einzelfall-Sicht über alle Teile.
 */
import { describe, expect, it } from 'vitest';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER, type QualProjekt, type Sequenzanalyse, type Sinneinheit } from './qualprojekt';
import { ersetze, findeTreffer } from './pseudonym';
import { sichtbaresProjekt, starteEinzelfall } from './einzelfall-modus';

const NAME = 'Mareike Huber';
const GEHEIM = 'GEHEIM-BEN';
const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));
const klon = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const eintrag = (id: string, text: string) => ({ id, text });
const lesart = (id: string, text: string, bei: string) => ({ id, text, pruefung: `Prüfen: ${text}`, verlauf: [{ stand: 'haelt' as const, beiEinheit: bei, begruendung: `Weil ${text}`, zeit: 5 }] });
function einheit(id: string, von: number, bis: number, n: string): Sinneinheit {
  return {
    id, von, bis,
    paraphrase: [eintrag(id + 'p', `Paraphrase ${n}`)], intentionen: [eintrag(id + 'i', `Absicht ${n}`)],
    lesarten: [lesart(id + 'l', `Lesart ${n}`, id)], rollen: [eintrag(id + 'r', `Rolle ${n}`)], anschluss: [eintrag(id + 'a', `Anschluss ${n}`)],
    weitere: { 's-x': [eintrag(id + 'w', `Randnotiz ${n}`)] }, gedeutet: true,
  };
}

/** Ein Projekt mit allen Feldern; `n` steht in jedem Freitextfeld, `ich` ist der Name des zweiten Falls (für den Einzelfall-Test). */
function voll(n: string, geheim = n): QualProjekt {
  const t1 = `${n} sagt: Ich wollte es versuchen.`;
  const t2 = `Das andere Interview. ${geheim} lacht.`;
  const q = neuesQualProjekt('Gesamt');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.ich = 'k1';
  q.faelle.push({ id: 'f1', name: `Fall ${n}`, werte: { v1: 'a' } }, { id: 'f2', name: 'Fall B', werte: { v1: 'b' } });
  q.variablen.push({ id: 'v1', name: 'gruppe', typ: 'text' });
  q.codes.push(
    { id: 'c1', name: 'Hilfe suchen', kodierbar: true, reihenfolge: 0, phase: 'offen', definition: `Definition ${n}`, anker: [{ segment: 's1', text: n }] },
    { id: 'c2', name: 'Scham', kodierbar: true, reihenfolge: 1, anker: [{ segment: 's2', text: geheim }] },
  );
  q.dokumente.push(
    { id: 'd1', name: `Interview ${n}`, datei: { name: `${n}.docx`, sha256: 'x' }, art: 'text', text: t1, erstellt: 1, geaendert: 1, fall: 'f1', transkript: { sprecher: [{ id: 'sp1', name: 'Befragte', rolle: 'befragt', fall: 'f1' }], abschnitte: [{ start: 0, ende: t1.length, sprecher: 'sp1' }], regeln: 'froschauer-lueger' } },
    { id: 'd2', name: 'Interview 2', art: 'text', text: t2, erstellt: 1, geaendert: 1, fall: 'f2' },
  );
  q.segmente.push({ id: 's1', dokument: 'd1', start: 0, ende: 5, erstellt: 1 }, { id: 's2', dokument: 'd2', start: 21, ende: 31, erstellt: 1 });
  q.kodierungen.push({ id: 'ko1', segment: 's1', code: 'c1', kodierende: 'k1', erstellt: 1 }, { id: 'ko2', segment: 's2', code: 'c2', kodierende: 'k1', erstellt: 1 });
  q.memos.push(
    { id: 'm1', titel: `Tagebuch ${n}`, text: `Notiz über ${n}`, bezug: [{ art: 'dokument', id: 'd1' }], art: 'tagebuch', erstellt: 1 },
    { id: 'm2', text: `Memo ${geheim}`, bezug: [{ art: 'dokument', id: 'd2' }], erstellt: 1 },
    { id: 'm3', text: `Memo zum Fall ${geheim}`, bezug: [{ art: 'fall', id: 'f2' }], erstellt: 1 },
    { id: 'm4', text: `Memo zum Segment ${geheim}`, bezug: [{ art: 'segment', id: 's2' }], erstellt: 1 },
    { id: 'm5', text: `Memo zum Protokoll ${geheim}`, bezug: [{ art: 'protokoll', id: 'p2' }], erstellt: 1 },
  );
  q.mengen = [{ id: 'me1', name: 'Alle', art: 'dokumente', mitglieder: ['d1', 'd2'] }];
  q.protokolle = [
    { id: 'p1', art: 'interview', fall: 'f1', dokument: 'd1', kopf: { ort: `Büro ${n}`, datum: '2026-01-01' }, felder: { verlauf: `Verlauf mit ${n}`, atmosphaere: `ruhig, ${n}` }, schwierigeStellen: [{ position: 0, text: `Stelle ${n}` }], erstellt: 1, geaendert: 1 },
    { id: 'p2', art: 'gedaechtnis', fall: 'f2', dokument: 'd2', kopf: { ort: `Café ${geheim}` }, felder: { verlauf: geheim }, schritte: { s1: { text: `Erinnert ${geheim}`, beginn: 1 }, s2: { text: `Zweiter Schritt ${geheim}`, notizen: geheim }, s3: { abschnitte: [{ beobachtung: geheim, ueberlegung: geheim }] } }, erstellt: 1, geaendert: 1 },
  ];
  q.einwilligungen = [
    { id: 'e1', fall: 'f1', fassung: 'V1', form: 'schriftlich', punkte: [{ punkt: 'teilnahme', stand: 'erteilt', datum: '2026-01-01', notiz: `Mit ${n} besprochen` }], widerrufe: [{ datum: '2026-02-01', punkte: ['zitate'], notiz: `Widerruf ${n}` }], wiedervorlage: [{ datum: '2026-03-01', anlass: `Nachfragen bei ${n}` }], loeschen: [{ was: 'aufnahme', bis: '2026-12-31' }], zugriffskreis: `nur ${n}`, erstellt: 1, geaendert: 1 },
    { id: 'e2', fall: 'f2', fassung: 'V1', form: 'digital', punkte: [{ punkt: 'teilnahme', stand: 'erteilt', notiz: geheim }], erstellt: 1, geaendert: 1 },
  ];
  const sa = (id: string, dok: string, text: string, name: string, ort: string): Sequenzanalyse => ({
    id, name, verfahren: 'sequenz', spaltensatz: 'eigen-1', dokument: dok, ausschnitt: { start: 0, ende: text.length, text, kontext: `Frage an ${ort}` }, forschungsfrage: `Wie spricht ${ort}?`,
    gruppe: { name: 'G' }, grenzenGesperrt: false, vorauslesenErlaubt: false, reflexionAlle: 4, phase: 'deuten', aktuelleEinheit: 1,
    einheiten: [einheit(id + 'e1', 0, 13, ort), einheit(id + 'e2', 13, text.length, ort)],
    reflexionen: [{ id: id + 'r', nachEinheit: id + 'e1', begriffe: `Begriffe ${ort}`, bisher: `Bisher ${ort}`, pruefen: `Prüfen ${ort}`, zeit: 3 }],
    fazit: { muster: [{ id: id + 'm', text: `Muster ${ort}`, belege: [{ einheit: id + 'e1', zitat: `Zitat ${ort}` }] }], bezugForschungsfrage: `Bezug ${ort}`, text: `Fazit ${ort}`, geaendert: 6 },
    schluesselentscheidungen: `Entscheidung ${ort}`, herkunft: { art: 'neu', zeit: 1 }, erstellt: 1, geaendert: 1,
  });
  q.sequenzanalysen = [sa('sa1', 'd1', t1, 'A1', n), sa('sa2', 'd2', t2, 'A2', geheim)];
  q.spaltensaetze = [{
    kennung: 'eigen-1', name: { de: 'Mein Satz', en: 'My set' }, verfahren: { de: 'V', en: 'V' }, eigen: true,
    spalten: [{ kennung: 's-x', feld: 'weitere', name: { de: 'Randnotiz', en: 'Margin' }, worum: { de: '', en: '' }, leitfragen: [], eintragName: { de: 'Randnotiz', en: 'Margin' } }],
  }];
  q.zusammenfassungen = [
    { zeile: 'f1', code: 'c1', text: `Zusammenfassung ${n}`, geaendert: 1, art: 'code' },
    { zeile: 'f2', code: 'c2', text: `Zusammenfassung ${geheim}`, geaendert: 1, art: 'code' },
    { zeile: 'dok:d2', code: 'c2', text: `Zusammenfassung Dokument ${geheim}`, geaendert: 1 },
  ];
  q.kiNutzung = { genutzt: true, zwecke: ['transkription'], text: `Transkription bei ${n}`, geaendert: 1 };
  q.typen = [{ id: 'ty1', name: `Typ ${n}`, beschreibung: `Beschreibung ${geheim}`, faelle: ['f1', 'f2'], merkmale: ['c1'] }];
  q.arbeitsweise = 'ipa';
  q.themen = [
    { id: 'th1', name: `Thema ${n}`, konzept: `Konzept ${n}`, beschreibung: `Beschreibung ${n}`, codes: ['c1'], belege: ['s1'], fall: 'f1', stand: 'aktiv', verlauf: [{ zeit: 1, was: 'angelegt', nachher: `Thema ${n}`, notiz: `Notiz ${n}` }, { zeit: 2, was: 'umbenannt', vorher: `Alt ${n}`, nachher: `Thema ${n}` }], reihenfolge: 0, erstellt: 1, geaendert: 1 },
    { id: 'th2', name: `Thema ${geheim}`, codes: ['c2'], fall: 'f2', stand: 'kandidat', verlauf: [{ zeit: 1, was: 'angelegt', nachher: `Thema ${geheim}` }], reihenfolge: 1, erstellt: 1, geaendert: 1 },
    { id: 'th3', name: 'Gruppenthema', konzept: `Gruppe ${geheim}`, codes: ['c1', 'c2'], aus: ['th1', 'th2'], stand: 'aktiv', verlauf: [{ zeit: 1, was: 'angelegt', nachher: 'Gruppenthema' }], reihenfolge: 2, erstellt: 1, geaendert: 1 },
  ];
  q.einzelfall = { an: false, fertig: [] };
  q.verknuepfung = { variable: 'v1', spalte: 'gruppe', geaendert: 1 };
  q.jointDisplays = [{
    id: 'jd1', name: `Joint Display ${n}`, art: 'seite-an-seite', zeilen: [{ art: 'code', id: 'c1' }, { art: 'thema', id: 'th1' }], spalten: ['x'],
    zahlen: { 'code:c1': `Zahlen ${n}` }, belege: [{ zeile: 'code:c1', gruppe: 'alle', segment: 's1' }, { zeile: 'code:c2', gruppe: 'alle', segment: 's2' }],
    passung: { 'code:c1': 'bestaetigung' }, metaInferenz: { 'code:c1': `Meta ${n} ${geheim}` }, erstellt: 1, geaendert: 1,
  }];
  q.mmDesign = { reihenfolge: 'qual-zuerst', gewicht: 'qual', zwecke: ['ergaenzung'], integration: ['verbinden'], beschreibung: `Design ${n} ${geheim}`, geaendert: 1 };
  q.selbstpruefung = [{ liste: 'mmat', punkte: [{ kennung: 'mmat-5-1', stand: 'ja', fundstelle: `Kapitel ${n}`, notiz: `Notiz ${n} ${geheim}`, geaendert: 1 }] }];
  q.instrument = [{ id: 'it1', text: `Ich spreche mit ${n} ${geheim}`, herkunft: { art: 'code', id: 'c1' }, beleg: 's1', spalte: 'it1', erstellt: 1, geaendert: 1 }];
  q.berichtshilfe = [{ liste: 'coreq', punkte: [{ kennung: 'coreq-01', stand: 'erfuellt', fundstelle: `Abschnitt ${n}`, notiz: `Notiz ${n} ${geheim}`, geaendert: 1 }] }];
  q.protokoll.push({ zeit: 1, was: 'code.angelegt', nachher: { code: 'c1' } });
  q.version = 3;
  return q;
}

describe('A6a Gesamt (a): alle Felder zugleich', () => {
  it('Lesen und Schreiben verlustfrei, Fassung 3, JSON gleich', () => {
    const p = voll(NAME);
    expect(qualFassung(p)).toBe(3);
    const r = rund(p);
    expect(r.version).toBe(3);
    expect(JSON.stringify(rund(r))).toBe(JSON.stringify(r));
    expect(r).toEqual(p);
    expect(qualFassung(r)).toBe(3);
    // jedes Feld der Datei ist ein bekanntes Feld
    for (const k of Object.keys(JSON.parse(JSON.stringify(p)))) expect(BEKANNTE_FELDER, k).toContain(k);
  });
  it('unbekanntes Feld bleibt erhalten', () => {
    const j = { ...JSON.parse(JSON.stringify(voll(NAME))), zukunft: { a: [1, 2] } };
    const r = pruefeQualProjekt(j);
    expect(r._unbekannt).toEqual({ zukunft: { a: [1, 2] } });
    // so schreibt die Projektdatei (lib/projektdatei.ts): unbekannte Felder wieder an ihren Platz
    const { _unbekannt, ...bekannt } = r;
    expect(JSON.parse(JSON.stringify({ ...(_unbekannt ?? {}), ...bekannt })).zukunft).toEqual({ a: [1, 2] });
  });
  it('jedes Feld allein hat die erwartete Fassung und überlebt den Rundweg', () => {
    const v = voll(NAME);
    // Grundlage: Fälle, Variablen, Codes (ohne Phase), Dokumente (ohne Transkript-Regeln), Segmente - Fassung 1, damit Verweise gültig sind
    const leer = (): QualProjekt => {
      const q = neuesQualProjekt('leer');
      q.kodierende = klon(v.kodierende); q.faelle = klon(v.faelle); q.variablen = klon(v.variablen);
      q.codes = klon(v.codes).map(c => { delete c.phase; return c; });
      q.dokumente = klon(v.dokumente).map(x => { delete x.transkript; return x; });
      q.segmente = klon(v.segmente); q.kodierungen = klon(v.kodierungen);
      return q;
    };
    expect(qualFassung(leer())).toBe(1);
    const erwartet: [string, (q: QualProjekt) => void, 1 | 2 | 3][] = [
      ['protokolle', q => { q.protokolle = klon(v.protokolle!); }, 2],
      ['einwilligungen', q => { q.einwilligungen = klon(v.einwilligungen!); q.faelle = klon(v.faelle); }, 2],
      ['sequenzanalysen (Feinstruktur)', q => { const s = klon(v.sequenzanalysen![0]!); s.verfahren = 'feinstruktur'; s.spaltensatz = 'feinstruktur'; for (const e of s.einheiten) delete e.weitere; q.sequenzanalysen = [s]; }, 2],
      ['sequenzanalysen (weitere)', q => { q.sequenzanalysen = klon(v.sequenzanalysen!); }, 3],
      ['spaltensaetze', q => { q.spaltensaetze = klon(v.spaltensaetze!); }, 3],
      ['kiNutzung', q => { q.kiNutzung = klon(v.kiNutzung!); }, 3],
      ['typen', q => { q.typen = klon(v.typen!); }, 3],
      ['arbeitsweise', q => { q.arbeitsweise = 'ipa'; }, 1],
      ['themen', q => { q.themen = klon(v.themen!); }, 3],
      ['einzelfall', q => { q.einzelfall = { an: false, fertig: [] }; }, 3],
      ['verknuepfung', q => { q.verknuepfung = klon(v.verknuepfung!); }, 3],
      ['jointDisplays', q => { q.themen = klon(v.themen!); q.jointDisplays = klon(v.jointDisplays!); }, 3],
      ['mmDesign', q => { q.mmDesign = klon(v.mmDesign!); }, 3],
      ['selbstpruefung', q => { q.selbstpruefung = klon(v.selbstpruefung!); }, 3],
      ['instrument', q => { q.instrument = klon(v.instrument!); }, 3],
      ['berichtshilfe', q => { q.berichtshilfe = klon(v.berichtshilfe!); }, 3],
      ['zusammenfassungen (art)', q => { q.zusammenfassungen = [klon(v.zusammenfassungen![0]!)]; }, 3],
      ['zusammenfassungen (ohne art)', q => { q.zusammenfassungen = [klon(v.zusammenfassungen![2]!)]; }, 1],
      ['mengen', q => { q.mengen = klon(v.mengen!); }, 1],
      ['code mit phase', q => { q.codes = klon(v.codes); }, 3],
      ['code mit definition und anker', q => { q.codes[0]!.definition = 'x'; q.codes[0]!.anker = [{ segment: 's1', text: 'y' }]; }, 1],
      ['memo mit art tagebuch', q => { q.memos = [klon(v.memos[0]!)]; }, 3],
      ['memo mit art Feldnotiz', q => { q.memos = [{ id: 'm', text: 'x', bezug: [{ art: 'projekt' }], art: 'feldnotiz-empirisch', erstellt: 1 }]; }, 2],
      ['transkript Froschauer-Lueger', q => { q.dokumente[0] = klon(v.dokumente[0]!); }, 2],
    ];
    for (const [name, setze, fassung] of erwartet) {
      const q = leer();
      setze(q);
      expect(qualFassung(q), name).toBe(fassung);
      q.version = fassung;
      const r = rund(q);
      expect(r.version, name).toBe(fassung);
      expect(JSON.stringify(rund(r)), name).toBe(JSON.stringify(r));
      const a = JSON.parse(JSON.stringify(q)) as Record<string, unknown>, b = JSON.parse(JSON.stringify(r)) as Record<string, unknown>;
      for (const k of Object.keys(a)) if (k !== 'herkunft') expect(b[k], `${name}: ${k}`).toEqual(a[k]);
    }
  });
});

describe('A6a Gesamt (b): Pseudonymisieren über alle Freitextfelder', () => {
  it('der Klarname steht danach nirgends mehr im Projekt', () => {
    const q = voll(NAME);
    expect(JSON.stringify(q)).toContain(NAME);
    const treffer = findeTreffer(q, { namen: [{ text: NAME, art: 'person' }], regeln: [], sprecherAlsPersonen: false }, 'de');
    expect(treffer.length).toBeGreaterThan(0);
    const { projekt } = ersetze(q, treffer, 10);
    const rest = JSON.stringify(projekt);
    const stellen: string[] = [];
    let i = rest.indexOf(NAME);
    while (i >= 0) { stellen.push(rest.slice(Math.max(0, i - 60), i + 40)); i = rest.indexOf(NAME, i + 1); }
    expect(stellen).toEqual([]);
    // das Ergebnis bleibt ein gültiges Projekt
    expect(rund(projekt).version).toBe(3);
  });
});

describe('A6a Gesamt (c): Einzelfall-Sicht über alle Teile', () => {
  it('aus dem verdeckten Fall steht nichts in der Sicht', () => {
    let q = voll('Fall-A-Text', GEHEIM);
    q = starteEinzelfall(q, 'f1');
    const s = sichtbaresProjekt(q);
    const j = JSON.stringify(s);
    const stellen: string[] = [];
    let i = j.indexOf(GEHEIM);
    while (i >= 0) { stellen.push(j.slice(Math.max(0, i - 60), i + 40)); i = j.indexOf(GEHEIM, i + 1); }
    expect(stellen).toEqual([]);
    // der sichtbare Fall bleibt
    expect(j).toContain('Fall-A-Text');
    expect(s.einwilligungen?.map(e => e.fall)).toEqual(['f1']);
  });
  it('ohne aktuellen Fall: gar nichts aus Fällen', () => {
    let q = voll('Fall-A-Text', GEHEIM);
    q = { ...starteEinzelfall(q, 'f1'), einzelfall: { an: true, fertig: ['f1'] } };
    const j = JSON.stringify(sichtbaresProjekt(q));
    expect(j).not.toContain(GEHEIM);
    expect(JSON.stringify(sichtbaresProjekt(q).einwilligungen)).toBe('[]');
  });
});
