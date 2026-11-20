/**
 * Sollwerte F3c (Fachblatt Feinstruktur 8 und 9, Architekturblatt Datenmodell 2.5): Austauschdatei, Grenzen sperren, Zusammenführen nur
 * bei gleichen Grenzen, Herkunft, von Hand zusammenlegen, keine Übereinstimmungszahl; Word im Format der Abgabe, Methodenanhang.
 * Gegenprobe: die ganze Musterlösung als zwei Gruppen-Dateien, zusammengeführt, als Word geprüft mit scripts/docx-pruefen.mjs.
 */
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { qualFassung, type Lesart, type Sequenzanalyse } from './qualprojekt';
import { beginneDeuten, einheitFertig, fuegeEintragHinzu, schalteGrenze } from './feinstruktur-analyse';
import { setzeStand, standVon } from './feinstruktur-pruefen';
import {
  AustauschFehler, austauschBytes, austauschText, austauschVerschluesselt, entschluessele, legeZusammen, leseAustausch, setzePerson,
  setzeSchluesselentscheidungen, vergleicheGrenzen, vergleichSatz, zumWeitergeben, zusammenfuehren, einteilung,
} from './feinstruktur-gruppe';
import { ablauf, feinstrukturWord, methodenanhang, standText } from './feinstruktur-word';
import { muster, mitMuster, ganzesMuster, projekt, rund, EINHEITEN } from './feinstruktur-muster.testhilfe';

const wortlaut = (bytes: Uint8Array): string => {
  const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
  return [...doc.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]!).join(' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'");
};
const xml = (bytes: Uint8Array): string => strFromU8(unzipSync(bytes)['word/document.xml']!);

/** Eine Gruppe deutet die weitergegebene Analyse: je Einheit eine Paraphrase und eine Lesart mit Gruppennamen im Text. */
function gruppeDeutet(sa: Sequenzanalyse, g: string): Sequenzanalyse {
  let x = beginneDeuten(sa, 10);
  x.einheiten.forEach((_, k) => {
    x = fuegeEintragHinzu(x, k, 'paraphrase', `${g} Paraphrase ${k + 1}`, 11).analyse;
    x = fuegeEintragHinzu(x, k, 'lesarten', `${g} Lesart ${k + 1}`, 11, `${g} Prüfung ${k + 1}`).analyse;
    if (k === 1) x = setzeStand(x, x.einheiten[0]!.lesarten[0]!.id, 'verworfen', `${g} passt nicht`, 1, 12);
    x = einheitFertig(x, 13);
  });
  return x;
}

describe('F3c Austauschdatei (Architekturblatt 2.5)', () => {
  it('Weitergeben: Format und Fassung, ohne Dokument, Grenzen gesperrt, Phase Deuten; Text des Ausschnitts bleibt', () => {
    const sa = mitMuster();
    expect(sa.dokument).toBe('d1');
    const j = JSON.parse(austauschText(sa, 20, 'Gruppe A'));
    expect(j.format).toBe('statable-sequenzanalyse');
    expect(j.version).toBe(1);
    expect(j.analyse.dokument).toBeUndefined();
    expect(j.analyse.grenzenGesperrt).toBe(true);
    expect(j.analyse.phase).toBe('deuten');
    expect(j.analyse.gruppe).toEqual({ name: 'Gruppe A' });
    expect(j.analyse.ausschnitt.text).toBe(sa.ausschnitt.text);
    expect(j.analyse.einheiten.length).toBe(10);
  });

  it('Einlesen: neue Kennung, Herkunft „eingelesen“ mit Quelle, Grenzen bleiben gesperrt (schalteGrenze sagt „gesperrt“)', () => {
    const sa = mitMuster();
    const ein = leseAustausch(austauschText(sa, 20), 21);
    expect(ein.id).not.toBe(sa.id);
    expect(ein.herkunft).toEqual({ art: 'eingelesen', quellen: [sa.id], zeit: 21 });
    expect(ein.grenzenGesperrt).toBe(true);
    expect(schalteGrenze(ein, 5, 22).art).toBe('gesperrt');
    expect(ein.einheiten.map(e => [e.von, e.bis])).toEqual(sa.einheiten.map(e => [e.von, e.bis]));
    // übersteht Speichern im Projekt (Fassung 2)
    const q = rund(projekt(ein));
    expect(qualFassung(q)).toBe(2);
    expect(q.sequenzanalysen![0]).toEqual(ein);
  });

  it('Einlesen lehnt ab: kein JSON, falsches Format, neuere Fassung, Dokument-Bezug, beschädigte Form (mit Stelle)', () => {
    const sa = mitMuster();
    const grund = (t: string) => { try { leseAustausch(t, 1); return 'ok'; } catch (e) { return e instanceof AustauschFehler ? e.grund + (e.pfad ? `@${e.pfad}` : '') : 'anders'; } };
    expect(grund('kein json')).toBe('kein-json');
    expect(grund(JSON.stringify({ format: 'statable-projekt', version: 1 }))).toBe('format');
    // seit A4 ist Fassung 2 gültig (anderer Spaltensatz); neuer ist 3
    expect(grund(JSON.stringify({ format: 'statable-sequenzanalyse', version: 3, analyse: {} }))).toBe('version');
    expect(grund(JSON.stringify({ format: 'statable-sequenzanalyse', version: 1, analyse: { ...sa } }))).toBe('mit-dokument');
    const kaputt = JSON.parse(austauschText(sa, 1)); kaputt.analyse.einheiten[3].von += 1;
    expect(grund(JSON.stringify(kaputt))).toBe('form@analyse.einheiten[3]');
  });

  it('Passwort wie die Projektdatei: verschlüsselt erkennbar, mit Passwort lesbar, ohne Passwort nicht als JSON', async () => {
    const sa = mitMuster();
    const offen = await austauschBytes(sa, 20);
    expect(austauschVerschluesselt(offen)).toBe(false);
    const zu = await austauschBytes(sa, 20, { passwort: 'geheim-12345' });
    expect(austauschVerschluesselt(zu)).toBe(true);
    expect(() => leseAustausch(zu, 21)).toThrow(AustauschFehler);
    const ein = leseAustausch(await entschluessele(zu, 'geheim-12345'), 21);
    expect(ein.ausschnitt.text).toBe(sa.ausschnitt.text);
    await expect(entschluessele(zu, 'falsch-12345')).rejects.toThrow();
  }, 30_000);
});

describe('F3c Zusammenführen (Fachblatt 8)', () => {
  it('nur bei gleichem Wortlaut und gleichen Grenzen; sonst Satz mit der abweichenden Sinneinheit; beide Einteilungen anzeigbar', () => {
    const a = leseAustausch(austauschText(mitMuster(), 1), 2);
    const b = leseAustausch(austauschText(mitMuster(), 1), 2);
    expect(vergleicheGrenzen(a, b)).toEqual({ gleich: true });
    const b2 = { ...b, grenzenGesperrt: false };
    const r = schalteGrenze(b2, b2.einheiten[2]!.von + 4, 3);
    if (r.art !== 'geaendert') throw new Error(r.art);
    const v = vergleicheGrenzen(a, r.analyse);
    expect(v).toEqual({ gleich: false, grund: 'grenze', einheit: 3 });
    expect(vergleichSatz(v, a, r.analyse, 'de')).toContain('Sinneinheit 3 endet an einer anderen Stelle');
    expect(() => zusammenfuehren(a, r.analyse, 4)).toThrow(/Sinneinheit 3/);
    expect(einteilung(r.analyse).length).toBe(11);
    expect(einteilung({ ...a, vorauslesenErlaubt: true })).toEqual(EINHEITEN);
    expect(einteilung(a)[2]).toBe(''); // beim Deuten bleibt Späteres verdeckt
    const c = { ...b, ausschnitt: { ...b.ausschnitt, text: b.ausschnitt.text.replace('Tischlerin', 'Tischlerei') } };
    expect(vergleicheGrenzen(a, c)).toEqual({ gleich: false, grund: 'text' });
  });

  it('neue Analyse mit Herkunft „zusammengefuehrt“, beide Quellen; Einträge mit Gruppe; Verläufe bleiben und zeigen auf die neuen Einheiten', () => {
    const basis = mitMuster();
    const a = gruppeDeutet(leseAustausch(austauschText(basis, 1, 'Gruppe A'), 2), 'A');
    const b = gruppeDeutet(leseAustausch(austauschText(basis, 1, 'Gruppe B'), 2), 'B');
    const z = zusammenfuehren(a, b, 30);
    expect(z.id).not.toBe(a.id);
    expect(z.herkunft).toEqual({ art: 'zusammengefuehrt', quellen: [a.id, b.id], zeit: 30 });
    expect(z.grenzenGesperrt).toBe(true);
    expect(z.einheiten.map(e => [e.von, e.bis])).toEqual(a.einheiten.map(e => [e.von, e.bis]));
    expect(z.einheiten[0]!.paraphrase.map(e => [e.text, e.gruppe])).toEqual([['A Paraphrase 1', 'Gruppe A'], ['B Paraphrase 1', 'Gruppe B']]);
    const l = z.einheiten[0]!.lesarten;
    expect(l.map(x => [x.text, x.gruppe, standVon(x)])).toEqual([['A Lesart 1', 'Gruppe A', 'verworfen'], ['B Lesart 1', 'Gruppe B', 'verworfen']]);
    expect(l[0]!.verlauf[0]!.beiEinheit).toBe(z.einheiten[1]!.id);
    expect(l[0]!.verlauf[0]!.begruendung).toBe('A passt nicht');
    expect(z.einheiten.every(e => e.gedeutet)).toBe(true);
    // keine Übereinstimmungszahl, nirgends
    const j = JSON.stringify(z);
    expect(j).not.toMatch(/uebereinstimm|kappa|prozent|anteil|agreement/i);
    // übersteht Speichern
    expect(rund(projekt(z)).sequenzanalysen![0]).toEqual(z);
  });

  it('gleiche Lesarten von Hand zusammenlegen: Herkunft „A + B“, Verlauf beider, nur bei gleichem Stand; zu wenige gewählt = Fehler', () => {
    const basis = mitMuster();
    const a = gruppeDeutet(leseAustausch(austauschText(basis, 1, 'A'), 2), 'A');
    const b = gruppeDeutet(leseAustausch(austauschText(basis, 1, 'B'), 2), 'B');
    let z = zusammenfuehren(a, b, 30);
    const [la, lb] = z.einheiten[0]!.lesarten as [Lesart, Lesart];
    z = legeZusammen(z, 0, 'lesarten', [la.id, lb.id], 'Gemeinsame Lesart', 31, 'Gemeinsame Prüfung');
    const n = z.einheiten[0]!.lesarten;
    expect(n.length).toBe(1);
    expect(n[0]!.text).toBe('Gemeinsame Lesart');
    expect(n[0]!.gruppe).toBe('A + B');
    expect(n[0]!.pruefung).toBe('Gemeinsame Prüfung');
    expect(n[0]!.verlauf.map(w => w.begruendung)).toEqual(['A passt nicht', 'B passt nicht']);
    // ungleicher Stand
    const p = z.einheiten[1]!.lesarten as Lesart[];
    const z2 = setzeStand(z, p[0]!.id, 'haelt', 'passt', 2, 32);
    expect(() => legeZusammen(z2, 1, 'lesarten', [p[0]!.id, p[1]!.id], 'x', 33)).toThrow(/verschiedene Stände/);
    expect(() => legeZusammen(z, 1, 'paraphrase', [z.einheiten[1]!.paraphrase[0]!.id], 'x', 33)).toThrow(/mindestens zwei/);
    // Paraphrasen: Stelle des ersten
    const pa = z.einheiten[1]!.paraphrase;
    const z3 = legeZusammen(z, 1, 'paraphrase', [pa[1]!.id, pa[0]!.id], 'Beide', 34);
    expect(z3.einheiten[1]!.paraphrase.map(e => [e.text, e.gruppe])).toEqual([['Beide', 'A + B']]);
    // unbekannte Kennung = Fehler
    expect(() => legeZusammen(z3, 1, 'paraphrase', [z3.einheiten[1]!.paraphrase[0]!.id, '__'], 'x', 36)).toThrow(/mindestens zwei/);
  });

  it('Person (Gruppenmodus) setzen und löschen; Schlüsselentscheidungen setzen und leeren', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    const r = fuegeEintragHinzu(sa, 0, 'paraphrase', 'P', 2); sa = r.analyse;
    sa = setzePerson(sa, 0, 'paraphrase', r.id, ' Ana ', 3);
    expect(sa.einheiten[0]!.paraphrase[0]!.person).toBe('Ana');
    sa = setzePerson(sa, 0, 'paraphrase', r.id, '', 4);
    expect('person' in sa.einheiten[0]!.paraphrase[0]!).toBe(false);
    sa = setzeSchluesselentscheidungen(sa, 'Ausschnitt gewählt, weil …', 5);
    expect(sa.schluesselentscheidungen).toBe('Ausschnitt gewählt, weil …');
    expect('schluesselentscheidungen' in setzeSchluesselentscheidungen(sa, '  ', 6)).toBe(false);
    expect(zumWeitergeben(sa, 7).dokument).toBeUndefined();
  });
});

describe('F3c Word und Methodenanhang (Fachblatt 9)', () => {
  it('Methodenanhang nur mit Fakten des Ablaufs (Musterlösung: 10 Einheiten, 2 Reflexionen, 5 verworfene Lesarten)', () => {
    const sa = ganzesMuster();
    const a = ablauf(sa);
    expect(a).toMatchObject({ einheiten: 10, gedeutet: 10, reflexionen: 2, reflexionsStellen: 2, verworfen: 5, vorauslesenErlaubt: false });
    const t = methodenanhang(sa, 'de', { dokumentName: 'Interview B' }).join('\n');
    expect(t).toContain('in 10 Sinneinheiten');
    expect(t).toContain('Zwischenreflexionen: 2');
    expect(t).toContain('5 Lesarten verworfen');
    expect(t).toContain('ohne Vorauslesen');
    expect(t).toContain('„Interview B“');
    expect(t).not.toMatch(/Übereinstimm|Prozent|%|häufigst|meist/);
    expect(methodenanhang(sa, 'en').join(' ')).toContain('5 readings were rejected');
  });

  it('Gegenprobe: die ganze Musterlösung als Word - alle 10 Einheiten, alle Lesarten mit Stand, beide Reflexionen, Zwischenfazit; barrierefrei', async () => {
    const sa = setzeSchluesselentscheidungen(ganzesMuster(), 'Den Ausschnitt am Beginn der Antwort gewählt.', 9);
    const bytes = await feinstrukturWord(sa, { sprache: 'de', methodenanhang: true, dokumentName: 'Interview B' });
    expect(pruefeDocx(bytes)).toEqual([]);
    const w = wortlaut(bytes);
    for (const t of EINHEITEN) expect(w).toContain(t);
    for (const e of muster.sinneinheiten as { lesarten: { text: string; pruefung: string }[] }[])
      for (const l of e.lesarten) { expect(w).toContain(l.text); expect(w).toContain(l.pruefung); }
    expect((w.match(/verworfen an Sinneinheit \d+/g) ?? []).length).toBe(5);
    expect(w).toContain('Zwischenreflexion nach Sinneinheit 4');
    expect(w).toContain('Zwischenreflexion nach Sinneinheit 8');
    for (const r of muster.zwischenreflexionen as { begriffe: string }[]) expect(w).toContain(r.begriffe);
    expect(w).toContain('Zwischenfazit');
    expect(w).toContain(muster.zwischenfazit.text);
    expect(w).toContain('Schlüsselentscheidungen');
    expect(w).toContain('Methodenanhang');
    // je Sinneinheit eine Tabelle, Kopf wiederholt, Spalten aus dem Spaltensatz
    const x = xml(bytes);
    expect((x.match(/<w:tbl>/g) ?? []).length).toBe(10);
    expect((x.match(/<w:tblHeader\/>/g) ?? []).length).toBe(10);
    for (const s of ['Sinneinheit', 'Paraphrase', 'Latente Bedeutungen']) expect(w).toContain(s);
    expect(x).toContain('w:orient="landscape"');
  }, 30_000);

  it('wahlweise eine große Tabelle (10 Zeilen + Kopf) und Reflexionen als eigener Abschnitt; Englisch mit Sprache en', async () => {
    const sa = ganzesMuster();
    const bytes = await feinstrukturWord(sa, { sprache: 'en', form: 'eine-tabelle' });
    expect(pruefeDocx(bytes)).toEqual([]);
    const x = xml(bytes);
    expect((x.match(/<w:tbl>/g) ?? []).length).toBe(1);
    expect((x.match(/<w:tr[ >]/g) ?? []).length).toBe(11);
    const w = wortlaut(bytes);
    expect(w).toContain('Interim reflections');
    expect(w).toContain('rejected at unit');
    const stile = strFromU8(unzipSync(bytes)['word/styles.xml']!);
    expect(stile).toMatch(/w:lang w:val="en"/);
  }, 30_000);

  it('nicht vorauslesen: beim Deuten enthält Word nur Einheiten bis zur aktuellen; Text der nächsten fehlt', async () => {
    let sa = beginneDeuten(mitMuster(), 1);
    sa = einheitFertig(fuegeEintragHinzu(sa, 0, 'paraphrase', 'P1', 2).analyse, 3);
    expect(sa.aktuelleEinheit).toBe(1);
    const w = wortlaut(await feinstrukturWord(sa, { sprache: 'de', methodenanhang: true }));
    expect(w).toContain(EINHEITEN[0]!);
    expect(w).toContain(EINHEITEN[1]!);
    expect(w).not.toContain(EINHEITEN[2]!);
    expect(w).toContain('gedeutet bis Sinneinheit 2 von 10');
  }, 30_000);

  it('Stand als Text: offen, hält an k, verworfen an k mit Begründung', () => {
    const sa = ganzesMuster();
    const l = sa.einheiten[0]!.lesarten;
    expect(l.map(x => standText(sa, x, 'de').split(':')[0])).toEqual(['hält an Sinneinheit 10', 'verworfen an Sinneinheit 2', 'verworfen an Sinneinheit 4'].slice(0, l.length));
  });

  it('Abnahme: zwei Gruppen-Dateien aus der Musterlösung, zusammengeführt, als Word mit Herkunft und ohne Befund', async () => {
    const basis = ganzesMuster();
    const a = leseAustausch(austauschText(basis, 1, 'Gruppe A'), 2);
    const b = leseAustausch(austauschText(basis, 1, 'Gruppe B'), 2);
    const z = zusammenfuehren(a, b, 3);
    expect(z.einheiten.every((e, k) => e.lesarten.length === 2 * basis.einheiten[k]!.lesarten.length)).toBe(true);
    expect(ablauf(z).verworfen).toBe(10);
    expect(ablauf(z).gruppen).toEqual(['Gruppe A', 'Gruppe B']);
    const bytes = await feinstrukturWord(z, { sprache: 'de', methodenanhang: true });
    expect(pruefeDocx(bytes)).toEqual([]);
    const w = wortlaut(bytes);
    expect(w).toContain('(Gruppe A)');
    expect(w).toContain('(Gruppe B)');
    expect(w).toContain('2 Gruppen getrennt voneinander');
    expect(w).toContain('Gruppe A: ' + muster.zwischenfazit.text);
  }, 30_000);
});
