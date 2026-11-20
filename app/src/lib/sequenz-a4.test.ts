/**
 * Stufe A4 (Feinstruktur für andere Sequenzverfahren öffnen): Pflichttests Fassung 3 (Architekturblatt Ausbau 4) für
 * `spaltensaetze`, `Sinneinheit.weitere` und `Sequenzanalyse.verfahren = 'sequenz'`; Einträge in frei definierten Spalten, Wechsel des
 * Spaltensatzes ohne Verlust, „Folgetext verdecken“ mit jedem Satz (nicht vorauslesen, B1), Gruppen-Austauschdatei mit eigenem Satz,
 * Zusammenführen, Word mit den Spaltennamen des Satzes, Methodenanhang, Pseudonymisieren der Einträge.
 */
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER, type QualProjekt, type Sequenzanalyse } from './qualprojekt';
import {
  beginneDeuten, einheitFertig, einheitSichtbar, entferneEintrag, aendereEintrag, fehlendeSpalten, folgetextVerdeckt, fuegeEintragHinzu,
  neueAnalyse, schalteGrenze, setzeFolgetextVerdeckt, setzeSpaltensatz, sichtbar, verfahrenZu,
} from './feinstruktur-analyse';
import {
  EINGEBAUT, SPALTENSAETZE, SPALTENSATZ_FEINSTRUKTUR, SPALTENSATZ_FREI, SPALTENSATZ_IPA, aendereEigeneSpalte, eigeneSpalte, eintraegeAn,
  neuerEigenerSatz, pruefeEigenenSatz, satzFuer, spaltensatz, type Spaltensatz,
} from './feinstruktur-spalten';
import { austauschText, leseAustausch, leseAustauschMitSatz, nimmSpaltensatzAuf, zumWeitergeben, zusammenfuehren, legeZusammen, AustauschFehler } from './feinstruktur-gruppe';
import { feinstrukturWord, methodenanhang } from './feinstruktur-word';
import { formhinweise, uebersicht, uebernimmDeutung } from './feinstruktur-pruefen';
import { ersetze, type Treffer } from './pseudonym';
import { methodenanhangWord } from './nachvollziehbarkeit';
import { EINHEITEN, MUSTER_GRENZEN, TEXT, mitMuster, projekt, rund } from './feinstruktur-muster.testhilfe';
import { cpLaenge } from './qualprojekt';

const wortlaut = (bytes: Uint8Array): string => {
  const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
  return [...doc.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]!).join(' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
};

/** Die Musterlösung eingeteilt, mit Spaltensatz `satz` (Kennung). */
function mitSatz(kennung: string): Sequenzanalyse {
  let sa = neueAnalyse({ start: 3, ende: 3 + cpLaenge(TEXT), text: TEXT, forschungsfrage: 'Wie?', name: 'IPA-Probe', jetzt: 1, spaltensatz: kennung });
  sa.dokument = 'd1';
  for (const g of MUSTER_GRENZEN) { const r = schalteGrenze(sa, g, 2); if (r.art !== 'geaendert') throw new Error(r.art); sa = r.analyse; }
  return sa;
}
const IPA_B = SPALTENSATZ_IPA.spalten[0]!, IPA_S = SPALTENSATZ_IPA.spalten[1]!, IPA_K = SPALTENSATZ_IPA.spalten[2]!;

/** Eigener Satz „Objektive Hermeneutik (eigene Spalten)“: Kontext (frei), Lesarten mit Prüfkriterium. */
function ohSatz(): Spaltensatz {
  const s = neuerEigenerSatz('Objektive Hermeneutik (meine Spalten)', 'Objektive Hermeneutik (Oevermann)', eigeneSpalte('Äußerer Kontext', 'Wer spricht zu wem?\nIn welcher Lage?'));
  return { ...s, spalten: [...s.spalten, eigeneSpalte('Lesarten', 'Welche Geschichten passen?', true)] };
}

describe('A4 Fassung 3: Pflichttests (Architekturblatt Ausbau 4)', () => {
  it('1. Feinstruktur-Projekt (Fassung 2) bleibt Fassung 2 und unverändert; altes Projekt Fassung 1 bleibt 1', () => {
    const q = rund(projekt(mitMuster()));
    expect(q.version).toBe(2);
    expect(q.sequenzanalysen![0]!.verfahren).toBe('feinstruktur');
    expect(JSON.stringify(rund(q))).toBe(JSON.stringify(q));
    expect(rund(neuesQualProjekt('alt')).version).toBe(1);
  });
  it('2. nur Arbeitsweise „sequenzanalyse“: Fassung bleibt 1', () => {
    expect(rund({ ...neuesQualProjekt('a'), arbeitsweise: 'sequenzanalyse' }).version).toBe(1);
  });
  it('3. jedes neue Feld hebt auf 3 und übersteht Lesen und Schreiben verlustfrei', () => {
    expect(BEKANNTE_FELDER).toContain('spaltensaetze');
    const faelle: [string, QualProjekt][] = [];
    // (a) eigener Spaltensatz im Projekt, ohne Analyse
    faelle.push(['spaltensaetze', { ...neuesQualProjekt('s'), spaltensaetze: [ohSatz()] }]);
    // (b) Analyse mit eingebautem Satz IPA, noch ohne Einträge
    faelle.push(['verfahren sequenz', projekt(mitSatz('ipa'))]);
    // (c) Einträge in `weitere`
    const ipa = fuegeEintragHinzu(mitSatz('ipa'), 0, IPA_B, 'beschreibt', 3).analyse;
    faelle.push(['weitere', projekt(ipa)]);
    // (d) eigener Satz mit Analyse und Lesart
    let oh = mitSatz(ohSatz().kennung);
    const satz = ohSatz(); oh = { ...oh, spaltensatz: satz.kennung, verfahren: 'sequenz' };
    oh = fuegeEintragHinzu(oh, 0, satz.spalten[0]!, 'Kontext 1', 3).analyse;
    oh = fuegeEintragHinzu(oh, 0, satz.spalten[1]!, 'Lesart 1', 3, 'Prüfung 1').analyse;
    faelle.push(['eigener Satz mit Analyse', { ...projekt(oh), spaltensaetze: [satz] }]);
    for (const [name, p] of faelle) {
      expect(qualFassung(p), name).toBe(3);
      const r = rund(p);
      expect(r.version, name).toBe(3);
      expect(JSON.stringify(rund(r)), name).toBe(JSON.stringify(r));
      const { version: _v, ...ohneV } = r; const { version: _w, ...pohne } = JSON.parse(JSON.stringify(p)) as QualProjekt;
      expect(ohneV, name).toEqual(pohne);
    }
  });
  it('4. Fassung 4 wird laut abgelehnt', () => {
    expect(() => pruefeQualProjekt({ ...JSON.parse(JSON.stringify(neuesQualProjekt('x'))), version: 4 })).toThrow();
  });
  it('Leser: eigener Satz mit Kennung eines eingebauten, zwei Lesart-Spalten, Prüfkriterium ohne Lesarten, falsches Feld → laut', () => {
    const p = (s: unknown) => () => pruefeQualProjekt({ ...JSON.parse(JSON.stringify(neuesQualProjekt('x'))), spaltensaetze: [s] });
    const s = ohSatz();
    expect(p({ ...s, kennung: 'ipa' })).toThrow(/eingebauten/);
    expect(p({ ...s, spalten: [s.spalten[1], { ...s.spalten[1], kennung: 'z' }] })).toThrow(/höchstens eine Spalte mit Lesarten/);
    expect(p({ ...s, spalten: [{ ...s.spalten[0], mitPruefung: true }] })).toThrow(/Prüfkriterium nur bei Lesarten/);
    expect(p({ ...s, spalten: [{ ...s.spalten[0], feld: 'paraphrase' }] })).toThrow();
    expect(p({ ...s, spalten: [] })).toThrow();
    expect(p({ ...s, eigen: undefined })).toThrow();
    expect(p(s)).not.toThrow();
    const q = rund(projekt(mitSatz('ipa')));
    const roh = JSON.parse(JSON.stringify(q)); roh.sequenzanalysen[0].verfahren = 'oevermann';
    expect(() => pruefeQualProjekt(roh)).toThrow();
  });
  it('leere Listen in `weitere` fallen beim Lesen und beim Löschen weg (kein leeres Objekt)', () => {
    let sa = fuegeEintragHinzu(mitSatz('ipa'), 0, IPA_B, 'x', 3).analyse;
    const id = sa.einheiten[0]!.weitere!['ipa-beschreibend']![0]!.id;
    sa = entferneEintrag(sa, 0, IPA_B, id, 4);
    expect(sa.einheiten[0]!.weitere).toBeUndefined();
    const roh = JSON.parse(JSON.stringify(projekt(mitSatz('ipa'))));
    roh.sequenzanalysen[0].einheiten[0].weitere = { 'ipa-sprachlich': [] };
    expect(pruefeQualProjekt(roh).sequenzanalysen![0]!.einheiten[0]!.weitere).toBeUndefined();
  });
});

describe('A4 Spaltensätze', () => {
  it('eingebaut: Feinstruktur (Vorgabe), IPA mit drei Schichten, eine freie Spalte; Kennungen fest', () => {
    expect(SPALTENSAETZE.map(s => s.kennung)).toEqual(['feinstruktur', 'ipa', 'frei']);
    expect(SPALTENSATZ_IPA.spalten.map(s => s.name.de)).toEqual(['Beschreibend', 'Sprachlich', 'Begrifflich']);
    expect(SPALTENSATZ_IPA.spalten.map(s => s.name.en)).toEqual(['Descriptive', 'Linguistic', 'Conceptual']);
    expect(SPALTENSATZ_IPA.spalten.every(s => s.feld === 'weitere')).toBe(true);
    expect(SPALTENSATZ_FREI.spalten).toHaveLength(1);
    expect([...EINGEBAUT]).toEqual(['feinstruktur', 'ipa', 'frei']);
    // je Sprache gleich viele Leitfragen, Texte nicht leer
    for (const s of SPALTENSAETZE) for (const sp of s.spalten) { expect(sp.name.de && sp.name.en).toBeTruthy(); for (const l of sp.leitfragen) expect(l.de && l.en).toBeTruthy(); }
    expect(spaltensatz(undefined)).toBe(SPALTENSATZ_FEINSTRUKTUR);
    expect(spaltensatz('ipa')).toBe(SPALTENSATZ_IPA);
    const oh = ohSatz();
    expect(spaltensatz(oh.kennung, [oh])).toBe(oh);
  });
  it('englische Bezeichnung der Feinstruktur bleibt die aus A0 (kein erfundener Name im Verfahren)', () => {
    expect(SPALTENSATZ_FEINSTRUKTUR.verfahren.en).toBe('sequential (line-by-line) hermeneutic interpretation (Froschauer and Lueger)');
  });
  it('neue Analyse: Spaltensatz und Verfahren; Vorgabe Feinstruktur mit verdecktem Folgetext', () => {
    const a = neueAnalyse({ start: 0, ende: 3, text: 'a b', forschungsfrage: '', name: 'n', jetzt: 1 });
    expect([a.spaltensatz, a.verfahren, folgetextVerdeckt(a)]).toEqual(['feinstruktur', 'feinstruktur', true]);
    const b = neueAnalyse({ start: 0, ende: 3, text: 'a b', forschungsfrage: '', name: 'n', jetzt: 1, spaltensatz: 'ipa', folgetextVerdecken: false });
    expect([b.spaltensatz, b.verfahren, folgetextVerdeckt(b), b.vorauslesenErlaubt]).toEqual(['ipa', 'sequenz', false, true]);
    expect(verfahrenZu('frei')).toBe('sequenz');
    expect(verfahrenZu(undefined)).toBe('feinstruktur');
  });
  it('eigener Satz: prüfen (Name, Spalten, doppelte Namen, höchstens eine Lesart-Spalte), ändern behält Kennung', () => {
    const s = ohSatz();
    expect(pruefeEigenenSatz(s, 'de')).toEqual([]);
    expect(s.eigen).toBe(true);
    expect(s.kennung).toMatch(/^eigen-/);
    expect(s.spalten[0]!.leitfragen.map(l => l.de)).toEqual(['Wer spricht zu wem?', 'In welcher Lage?']);
    expect(s.spalten[1]!.mitPruefung).toBe(true);
    expect(pruefeEigenenSatz({ ...s, spalten: [s.spalten[0]!, { ...s.spalten[0]!, kennung: 'x' }] }, 'de')).toContain('Zwei Spalten haben denselben Namen.');
    expect(pruefeEigenenSatz({ ...s, spalten: [] }, 'en')).toContain('The column set needs at least one column.');
    expect(pruefeEigenenSatz({ ...s, spalten: [s.spalten[1]!, { ...s.spalten[1]!, kennung: 'y', name: { de: 'L2', en: 'L2' } }] }, 'de')).toContain('Nur eine Spalte kann Lesarten mit Prüfkriterium enthalten.');
    const g = aendereEigeneSpalte(s.spalten[0]!, { name: 'Kontext', leitfragen: 'a\n\n b ' });
    expect([g.kennung, g.name.de, g.name.en, g.eintragName.de, g.leitfragen.map(l => l.en)]).toEqual([s.spalten[0]!.kennung, 'Kontext', 'Kontext', 'Kontext', ['a', 'b']]);
  });
  it('Einträge in frei definierten Spalten: hinzufügen, ändern, löschen; Lesart-Spalte eines eigenen Satzes nutzt `lesarten`', () => {
    let sa = mitSatz('ipa');
    sa = fuegeEintragHinzu(sa, 1, IPA_S, 'Wiederholung', 3).analyse;
    sa = fuegeEintragHinzu(sa, 1, IPA_S, 'Pause', 3).analyse;
    const [a] = eintraegeAn(sa.einheiten[1]!, IPA_S);
    sa = aendereEintrag(sa, 1, IPA_S, a!.id, { text: 'Wiederholung „ich“' }, 4);
    expect(eintraegeAn(sa.einheiten[1]!, IPA_S).map(x => x.text)).toEqual(['Wiederholung „ich“', 'Pause']);
    expect(sa.einheiten[1]!.paraphrase).toEqual([]);
    const s = ohSatz();
    let oh = { ...mitSatz(s.kennung), verfahren: 'sequenz' } as Sequenzanalyse;
    oh = fuegeEintragHinzu(oh, 0, s.spalten[1]!, 'L', 3, 'P').analyse;
    expect(oh.einheiten[0]!.lesarten[0]).toMatchObject({ text: 'L', pruefung: 'P', verlauf: [] });
  });
  it('Grenze ändern mit Einträgen in `weitere`: nichts geht verloren', () => {
    let sa = beginneDeuten(mitSatz('ipa'), 3);
    sa = fuegeEintragHinzu(sa, 1, IPA_K, 'begrifflich 2', 3).analyse;
    sa = fuegeEintragHinzu(sa, 2, IPA_K, 'begrifflich 3', 3).analyse;
    const r = schalteGrenze(sa, sa.einheiten[2]!.von, 4, true);
    if (r.art !== 'geaendert') throw new Error(r.art);
    expect(r.analyse.einheiten.flatMap(e => eintraegeAn(e, IPA_K).map(x => x.text))).toEqual(['begrifflich 2', 'begrifflich 3']);
  });
  it('Füllwort übernehmen kopiert auch `weitere` mit neuen Kennungen', () => {
    let sa = mitSatz('ipa');
    sa = fuegeEintragHinzu(sa, 0, IPA_B, 'b0', 3).analyse;
    const u = uebernimmDeutung(sa, 2, 0, 4);
    const [q, z] = [eintraegeAn(u.einheiten[0]!, IPA_B)[0]!, eintraegeAn(u.einheiten[2]!, IPA_B)[0]!];
    expect(z.text).toBe('b0'); expect(z.id).not.toBe(q.id);
  });
  it('Spaltensatz wechseln: geht ohne Einträge, wird verweigert, solange Einträge sonst unsichtbar würden; nichts wird gelöscht', () => {
    const sa = mitSatz('feinstruktur');
    const w = setzeSpaltensatz(sa, SPALTENSATZ_IPA, [], 5);
    expect(w.art).toBe('geaendert');
    if (w.art !== 'geaendert') return;
    expect([w.analyse.spaltensatz, w.analyse.verfahren]).toEqual(['ipa', 'sequenz']);
    const mit = fuegeEintragHinzu(w.analyse, 0, IPA_S, 'x', 6).analyse;
    expect(setzeSpaltensatz(mit, SPALTENSATZ_FEINSTRUKTUR, [], 7, 'de')).toEqual({ art: 'nicht-moeglich', spalten: ['Sprachlich'] });
    expect(fehlendeSpalten(mit, SPALTENSATZ_IPA, [], 'de')).toEqual([]);
    // von der Feinstruktur zum eigenen Satz mit Lesart-Spalte: Lesarten bleiben sichtbar, Paraphrasen nicht → verweigert
    const s = ohSatz();
    const fs = fuegeEintragHinzu(fuegeEintragHinzu(sa, 0, 'lesarten', 'L', 3).analyse, 0, 'paraphrase', 'P', 3).analyse;
    expect(setzeSpaltensatz(fs, s, [s], 8, 'en')).toEqual({ art: 'nicht-moeglich', spalten: ['Paraphrase'] });
    const nurL = fuegeEintragHinzu(sa, 0, 'lesarten', 'L', 3).analyse;
    expect(setzeSpaltensatz(nurL, s, [s], 8).art).toBe('geaendert');
  });
  it('satzFuer: unbekannte Kennung oder fehlende Spalte → Ersatzspalten, kein Eintrag wird unsichtbar', () => {
    let sa = fuegeEintragHinzu(mitSatz('eigen-fehlt'), 0, { feld: 'weitere', kennung: 's-abc' }, 'x', 3).analyse;
    sa = { ...sa, verfahren: 'sequenz' };
    const satz = satzFuer(sa, []);
    expect(satz.name.de).toBe('Unbekannter Spaltensatz');
    expect(satz.spalten.map(s => s.kennung)).toContain('s-abc');
    expect(uebersicht(sa)[0]!.spalten.find(s => s.kennung === 's-abc')!.eintraege.map(e => e.text)).toEqual(['x']);
    // IPA, aber eine Kennung, die IPA nicht hat (aus anderer Quelle): angehängt
    const ipa = fuegeEintragHinzu(mitSatz('ipa'), 0, { feld: 'weitere', kennung: 'fremd' }, 'y', 3).analyse;
    expect(satzFuer(ipa).spalten.map(s => s.kennung)).toEqual(['ipa-beschreibend', 'ipa-sprachlich', 'ipa-begrifflich', 'fremd']);
  });
  it('Formhinweise nennen leere Spalten mit dem Namen des Satzes', () => {
    let sa = beginneDeuten(mitSatz('ipa'), 3);
    sa = fuegeEintragHinzu(sa, 0, IPA_B, 'b', 3).analyse;
    sa = einheitFertig(sa, 4);
    const h = formhinweise(sa, 'de');
    expect(h).toContain('Sinneinheit 1: Die Spalte „Sprachlich“ ist leer.');
    expect(h.some(x => x.includes('Beschreibend'))).toBe(false);
  });
});

describe('A4 Folgetext verdecken (nicht vorauslesen, B1) mit jedem Spaltensatz', () => {
  for (const k of ['feinstruktur', 'ipa', 'frei', 'eigen-x']) {
    it(`Satz ${k}: an = nur bis zur aktuellen Einheit; aus = ganzer Ausschnitt`, () => {
      let sa = beginneDeuten({ ...mitSatz(k), verfahren: verfahrenZu(k) }, 3);
      expect(folgetextVerdeckt(sa)).toBe(true);
      const bisEins = Array.from(TEXT).slice(0, sa.einheiten[0]!.bis).join('');
      expect(sichtbar(sa)).toBe(bisEins);
      expect(einheitSichtbar(sa, 1)).toBe('');
      expect(uebersicht(sa)).toHaveLength(1);
      sa = einheitFertig(sa, 4);
      expect(sichtbar(sa)).toBe(Array.from(TEXT).slice(0, sa.einheiten[1]!.bis).join(''));
      const aus = setzeFolgetextVerdeckt(sa, false, 5);
      expect(folgetextVerdeckt(aus)).toBe(false);
      expect(sichtbar(aus)).toBe(TEXT);
      expect(uebersicht(aus)).toHaveLength(EINHEITEN.length);
      expect(setzeFolgetextVerdeckt(aus, true, 6).vorauslesenErlaubt).toBe(false);
    });
  }
});

describe('A4 Gruppenarbeit: Austauschdatei und Zusammenführen', () => {
  it('Feinstruktur bleibt Fassung 1 ohne Satz; IPA → Fassung 2 ohne Satz; eigener Satz → Fassung 2 mit Satz', () => {
    const j = (sa: Sequenzanalyse, eigene: Spaltensatz[] = []) => JSON.parse(austauschText(sa, 9, 'G', eigene));
    expect(j(mitMuster())).toMatchObject({ version: 1 }); expect(j(mitMuster()).spaltensatz).toBeUndefined();
    expect(j(mitSatz('ipa'))).toMatchObject({ version: 2 }); expect(j(mitSatz('ipa')).spaltensatz).toBeUndefined();
    const s = ohSatz();
    const oh = { ...mitSatz(s.kennung), verfahren: 'sequenz' } as Sequenzanalyse;
    expect(j(oh, [s])).toMatchObject({ version: 2, spaltensatz: { kennung: s.kennung } });
    const r = leseAustauschMitSatz(austauschText(oh, 9, 'G', [s]), 10);
    expect(r.spaltensatz).toEqual(s);
    expect(r.analyse.spaltensatz).toBe(s.kennung);
    expect(leseAustausch(austauschText(oh, 9, 'G', [s]), 10).grenzenGesperrt).toBe(true);
  });
  it('Austauschdatei: beigelegter Satz mit anderer Kennung oder mit eingebauter Kennung → beschädigt', () => {
    const s = ohSatz();
    const oh = { ...mitSatz(s.kennung), verfahren: 'sequenz' } as Sequenzanalyse;
    const o = JSON.parse(austauschText(oh, 9, 'G', [s]));
    const fehler = (x: unknown) => { try { leseAustauschMitSatz(JSON.stringify(x), 1); return null; } catch (e) { return e instanceof AustauschFehler ? e.grund : 'anders'; } };
    expect(fehler({ ...o, spaltensatz: { ...s, kennung: 'eigen-anders' } })).toBe('form');
    expect(fehler({ ...o, spaltensatz: { ...s, kennung: 'ipa' } })).toBe('form');
  });
  it('nimmSpaltensatzAuf: neu → angehängt; gleiche Kennung → nur fehlende Spalten dazu; eingebaut → nie', () => {
    const s = ohSatz();
    expect(nimmSpaltensatzAuf([], s)).toEqual([s]);
    const umbenannt = { ...s, spalten: [{ ...s.spalten[0]!, name: { de: 'Mein Name', en: 'Mein Name' } }] };
    const r = nimmSpaltensatzAuf([umbenannt], s);
    expect(r).toHaveLength(1);
    expect(r[0]!.spalten.map(x => x.name.de)).toEqual(['Mein Name', 'Lesarten']);
    expect(nimmSpaltensatzAuf([], { ...SPALTENSATZ_IPA, eigen: true })).toEqual([]);
  });
  it('Zusammenführen: Einträge in `weitere` beider Gruppen mit Herkunft; Verfahren bleibt; von Hand zusammenlegen in `weitere`', () => {
    const basis = zumWeitergeben(mitSatz('ipa'), 5);
    const deutet = (g: string) => { let x = beginneDeuten(basis, 6); x = fuegeEintragHinzu(x, 0, IPA_S, `${g} sprachlich`, 7).analyse; return x; };
    const z = zusammenfuehren(deutet('A'), deutet('B'), 8, { namen: ['A', 'B'] });
    expect([z.verfahren, z.spaltensatz]).toEqual(['sequenz', 'ipa']);
    const l = eintraegeAn(z.einheiten[0]!, IPA_S);
    expect(l.map(x => [x.text, x.gruppe])).toEqual([['A sprachlich', 'A'], ['B sprachlich', 'B']]);
    const zl = legeZusammen(z, 0, IPA_S, l.map(x => x.id), 'gemeinsam', 9);
    expect(eintraegeAn(zl.einheiten[0]!, IPA_S).map(x => [x.text, x.gruppe])).toEqual([['gemeinsam', 'A + B']]);
  });
});

describe('A4 Word, Methodenanhang, Pseudonymisieren', () => {
  it('Word: Tabellenkopf mit den Spaltennamen des Satzes (de/en), Einträge aus `weitere`; Datei barrierefrei', async () => {
    let sa = beginneDeuten(mitSatz('ipa'), 3);
    sa = fuegeEintragHinzu(sa, 0, IPA_B, 'Notiz-Beschreibend-1', 3).analyse;
    sa = fuegeEintragHinzu(sa, 0, IPA_K, 'Notiz-Begrifflich-1', 3).analyse;
    for (let k = 0; k < sa.einheiten.length; k++) sa = einheitFertig(sa, 4);
    for (const [sp, kopf] of [['de', ['Beschreibend', 'Sprachlich', 'Begrifflich']], ['en', ['Descriptive', 'Linguistic', 'Conceptual']]] as const) {
      const b = await feinstrukturWord(sa, { sprache: sp, methodenanhang: true });
      const t = wortlaut(b);
      for (const k of kopf) expect(t).toContain(k);
      expect(t).not.toContain('Paraphrase');
      expect(t).toContain('Notiz-Beschreibend-1');
      expect(t).toContain(sp === 'de' ? 'Interpretative Phänomenologische Analyse (IPA)' : 'interpretative phenomenological analysis (IPA)');
      expect(pruefeDocx(b)).toEqual([]);
    }
    // eigener Satz: Spaltennamen der Person
    const s = ohSatz();
    let oh = { ...mitSatz(s.kennung), verfahren: 'sequenz' } as Sequenzanalyse;
    oh = fuegeEintragHinzu(oh, 0, s.spalten[0]!, 'Kontext-Eins', 3).analyse;
    const t = wortlaut(await feinstrukturWord(oh, { sprache: 'de', eigene: [s] }));
    expect(t).toContain('Äußerer Kontext'); expect(t).toContain('Kontext-Eins');
  });
  it('Methodenanhang nennt Verfahren und Spalten (eingebaut und eigen); Feinstruktur unverändert', () => {
    const fs = methodenanhang(mitMuster(), 'de');
    expect(fs.some(t => t.startsWith('Spalten der Deutung'))).toBe(false);
    expect(methodenanhang(mitSatz('ipa'), 'de')).toContain('Spalten der Deutung: Beschreibend, Sprachlich, Begrifflich.');
    expect(methodenanhang(mitSatz('ipa'), 'en')).toContain('Columns of the interpretation: Descriptive, Linguistic, Conceptual.');
    const s = ohSatz();
    const oh = { ...mitSatz(s.kennung), verfahren: 'sequenz' } as Sequenzanalyse;
    const m = methodenanhang(oh, 'de', { eigene: [s] });
    expect(m[0]).toContain('Verfahren: Objektive Hermeneutik (Oevermann).');
    expect(m).toContain('Gedeutet wurde mit dem eigenen Spaltensatz „Objektive Hermeneutik (meine Spalten)“ (Spalten: Äußerer Kontext, Lesarten).');
    const aus = methodenanhang(setzeFolgetextVerdeckt(oh, false, 2), 'de', { eigene: [s] }).join(' ');
    expect(aus).toContain('mit Vorauslesen');
  });
  it('Methodenanhang des Projekts (Word): Überschrift „Sequenzanalysen“, sobald ein anderer Satz dabei ist', async () => {
    const q = { ...projekt(mitSatz('ipa')), sequenzanalysen: [mitMuster(), mitSatz('ipa')] };
    const b = await methodenanhangWord(q, 'de');
    const t = wortlaut(b);
    expect(t).toContain('Sequenzanalysen');
    expect(t).toContain('Spalten der Deutung: Beschreibend, Sprachlich, Begrifflich.');
  });
  it('Pseudonymisieren: Namen in Einträgen aller Spalten (fest und `weitere`) und im Prüfkriterium werden ersetzt', () => {
    let sa = mitSatz('ipa');
    sa = fuegeEintragHinzu(sa, 0, IPA_B, 'Amira spricht über Amira-Weg', 3).analyse;   // „Amira-Weg“: Bindestrich trennt, ersetzt
    let fs = mitMuster();
    fs = fuegeEintragHinzu(fs, 0, 'lesarten', 'Amira will stark sein', 3, 'Später sagt Amira etwas anderes').analyse;
    fs = fuegeEintragHinzu(fs, 0, 'paraphrase', 'Amiras Regel', 3).analyse;    // „Amiras“ ist ein anderes Wort, bleibt
    const q = { ...projekt(sa), sequenzanalysen: [sa, fs] };
    q.dokumente[0]!.text = 'B: Amira ' + q.dokumente[0]!.text.slice(3);
    const d = q.dokumente[0]!;
    const t: Treffer[] = [{ id: 't1', dokument: d.id, start: 3, ende: 8, text: 'Amira', art: 'person', ersatz: '[Person 1]', an: true }];
    const r = ersetze(q, t, 9).projekt;
    const [ipa, f] = r.sequenzanalysen!;
    expect(eintraegeAn(ipa!.einheiten[0]!, IPA_B)[0]!.text).toBe('[Person 1] spricht über [Person 1]-Weg');
    expect(f!.einheiten[0]!.lesarten[0]).toMatchObject({ text: '[Person 1] will stark sein', pruefung: 'Später sagt [Person 1] etwas anderes' });
    expect(f!.einheiten[0]!.paraphrase[0]!.text).toBe('Amiras Regel');
    expect(() => rund(r)).not.toThrow();
  });
});
