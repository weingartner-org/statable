/**
 * Paket 1D (Fachblatt Stufe 1): Passung und Meta-Inferenz je Gruppe in „Fälle vergleichen“, Felder „Integration“ im Projekt und im Word-Bericht.
 * Quelle: Fetters, Curry & Creswell (2013): confirmation, expansion, discordance. Statable zählt nur.
 */
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import type { TableItem } from '../engine/types';
import type { Projekt } from './ablage';
import type { Blatt } from './sitzung.svelte';
import { baueFaelle, bildeGruppen, leererZustand, type FaelleZustand, setzeMetaInferenz, setzePassung, uebernimm, zaehlePassung, type Faelle, type RohSpalte, type Wert } from './faelle';
import { passungZaehlung, tabelleAlleFaelle, tabellenFaelle } from './faellesaetze';
import { leseProjektdatei, projektAlsDatei } from './projektdatei';
import { leseIntegration, integrationAusgefuellt } from './integration';
import { baueBerichtWord } from './export';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

const spalten: RohSpalte[] = [
  { name: 'note', bezeichnung: 'Note', art: 'zahl', fehlend: [], werteLabels: {}, niveau: 'metrisch' },
  { name: 'text', bezeichnung: 'Interview', art: 'text', fehlend: [], werteLabels: {} }
];
const zeilen: Wert[][] = [[1, 'gut'], [1.3, 'sehr gut'], [3, 'schwierig'], [3.3, 'anstrengend'], [2, 'mittel']];
const bauen = (bisher?: FaelleZustand): Faelle => baueFaelle(spalten, zeilen, { kennung: '', q: ['note'], t: ['text'] }, bisher);
const zellen = (t: TableItem) => t.cells.filter(c => c.r > 0).reduce<string[][]>((a, c) => { (a[c.r - 1] ??= [])[c.c] = c.t; return a; }, []);

describe('Passung und Meta-Inferenz je Gruppe', () => {
  it('Voreinstellung: alle Gruppen „offen“, Meta-Inferenz leer; Zählung nur offen', () => {
    const e = bauen(), g = bildeGruppen(e);
    expect(g.length).toBeGreaterThan(1);
    expect(g.every(x => x.passung === 'offen' && x.metaInferenz === '')).toBe(true);
    expect(zaehlePassung(g)).toEqual({ bestaetigung: 0, erweiterung: 0, widerspruch: 0, offen: g.length });
  });
  it('alte Blätter ohne die Felder bleiben lesbar (Zustand ohne passung/metaInferenz)', () => {
    const alt = { teilung: {}, eigene: [], namen: {}, notizen: {}, zuordnung: {}, zitate: {} };
    const e = bauen(alt);
    expect(bildeGruppen(e).every(x => x.passung === 'offen')).toBe(true);
    expect(uebernimm(e, alt).passung).toBeUndefined();
  });
  it('setzen, überschreiben, auf „offen“ zurück; unbekannte Werte aus fremden Dateien zählen als offen', () => {
    const e = bauen(), id = bildeGruppen(e)[0]!.id;
    setzePassung(e, id, 'widerspruch'); setzeMetaInferenz(e, id, 'Zahlen und Aussagen gehen auseinander');
    let g = bildeGruppen(e).find(x => x.id === id)!;
    expect([g.passung, g.metaInferenz]).toEqual(['widerspruch', 'Zahlen und Aussagen gehen auseinander']);
    setzePassung(e, id, 'offen'); setzeMetaInferenz(e, id, '  ');
    expect(e.zustand.passung).toBeUndefined(); expect(e.zustand.metaInferenz).toBeUndefined();
    (e.zustand as { passung?: Record<string, string> }).passung = { [id]: 'unsinn' };
    g = bildeGruppen(e).find(x => x.id === id)!;
    expect(g.passung).toBe('offen');
  });
  it('bleibt beim Neurechnen der Fälle erhalten (uebernimm)', () => {
    const e = bauen(), id = bildeGruppen(e)[0]!.id;
    setzePassung(e, id, 'erweiterung'); setzeMetaInferenz(e, id, 'Mehr als die Zahl');
    const neu = bauen(e.zustand);
    const g = bildeGruppen(neu).find(x => x.id === id)!;
    expect([g.passung, g.metaInferenz]).toEqual(['erweiterung', 'Mehr als die Zahl']);
  });
  it('Zählung als Text: „Bestätigung 2, Erweiterung 1, Widerspruch 1, offen n“, ohne Bewertung', () => {
    const e = bauen(), ids = bildeGruppen(e).filter(g => g.mitglieder.length).map(g => g.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    setzePassung(e, ids[0]!, 'bestaetigung'); setzePassung(e, ids[1]!, 'widerspruch');
    expect(passungZaehlung(bildeGruppen(e))).toBe(`Bestätigung 1, Erweiterung 0, Widerspruch 1, offen ${ids.length - 2}`);
  });
  it('Joint Display und volle Tabelle enthalten die zwei Spalten', () => {
    const e = bauen(), g0 = bildeGruppen(e).find(x => x.mitglieder.length)!;
    setzePassung(e, g0.id, 'erweiterung'); setzeMetaInferenz(e, g0.id, 'Neu: Zeitdruck');
    const [joint] = tabellenFaelle(e);
    expect(joint!.cells.filter(c => c.r === 0).map(c => c.t).slice(-2)).toEqual(['Passung', 'Meta-Inferenz']);
    const zeile = zellen(joint!).find(r => r[0] === g0.name)!;
    expect(zeile.slice(-2)).toEqual(['Erweiterung', 'Neu: Zeitdruck']);
    const alle = tabelleAlleFaelle(e);
    expect(alle.cells.filter(c => c.r === 0).map(c => c.t).slice(-2)).toEqual(['Passung', 'Meta-Inferenz']);
    const z = zellen(alle).find(r => r[1] === g0.name)!;
    expect(z.slice(-2)).toEqual(['Erweiterung', 'Neu: Zeitdruck']);
  });
  it('leererZustand bleibt schlank (keine neuen Pflichtfelder)', () => {
    expect(Object.keys(leererZustand()).sort()).toEqual(['eigene', 'namen', 'notizen', 'teilung', 'zitate', 'zuordnung']);
  });
});

describe('Integration auf Projektebene (Projektdatei Fassung 1)', () => {
  const projekt = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'P', quelle: 'q', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1, ...extra });
  it('Rundreise mit Integration', () => {
    const integration = { warum: 'Zahlen und Worte ergänzen sich', wo: 'In der Fälle-Tabelle', gelernt: 'Viel', widersprueche: 'Zwei Fälle passen nicht' };
    const text = projektAlsDatei(projekt({ integration }));
    expect(leseProjektdatei(text).integration).toEqual(integration);
  });
  it('ohne Integration: kein Feld in der Datei, nach dem Lesen auch keines; leere Felder zählen als nicht ausgefüllt', () => {
    expect(JSON.parse(new TextDecoder().decode(projektAlsDatei(projekt()))).integration).toBeUndefined();
    expect('integration' in leseProjektdatei(projektAlsDatei(projekt()))).toBe(false);
    expect(JSON.parse(new TextDecoder().decode(projektAlsDatei(projekt({ integration: { warum: '  ', wo: '' } })))).integration).toBeUndefined();
  });
  it('Lesen mit Prüfung: nur Texte, höchstens 10.000 Zeichen, Unbrauchbares fällt weg', () => {
    const roh = JSON.parse(new TextDecoder().decode(projektAlsDatei(projekt())));
    roh.integration = { warum: 'a'.repeat(10500), wo: 5, gelernt: { x: 1 }, widersprueche: 'ok', fremd: 'x' };
    const i = leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh))).integration!;
    expect(i.warum!.length).toBe(10000);
    expect(i).toEqual({ warum: 'a'.repeat(10000), widersprueche: 'ok' });
    roh.integration = 'text';
    expect('integration' in leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh)))).toBe(false);
    expect(leseIntegration([])).toBeUndefined();
    expect(integrationAusgefuellt({ wo: ' ' })).toBe(false);
  });
  it('Blatt mit und ohne passung/metaInferenz überlebt die Projektdatei', () => {
    const e = bauen(), id = bildeGruppen(e)[0]!.id;
    setzePassung(e, id, 'bestaetigung'); setzeMetaInferenz(e, id, 'Passt');
    const b = (faelle?: Blatt['faelle']) => ({ id: 'f', titel: 'Fälle', art: 'faelle', l1: null, l2: null, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0, ...(faelle ? { faelle } : {}) }) as unknown as Blatt;
    const mit = leseProjektdatei(projektAlsDatei(projekt({ blaetter: [b(e.zustand)] }))).blaetter[0]!;
    expect(mit.faelle).toMatchObject({ passung: { [id]: 'bestaetigung' }, metaInferenz: { [id]: 'Passt' } });
    const ohne = leseProjektdatei(projektAlsDatei(projekt({ blaetter: [b(leererZustand())] }))).blaetter[0]!;
    expect(ohne.faelle!.passung).toBeUndefined();
    expect(bildeGruppen(bauen(ohne.faelle)).every(x => x.passung === 'offen')).toBe(true);
  });
});

describe('Word-Bericht: Abschnitt „Integration der Daten (Mixed Methods)“', () => {
  const blatt = { id: 'a', titel: 'Fälle', art: 'x', l1: null, l2: null, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0 } as unknown as Blatt;
  async function doc(opt = {}) {
    const D = await import('docx');
    const d = baueBerichtWord(D, [blatt], [{ titel: '', text: 'Es nahmen 5 Personen teil.' }], 'Testbericht', null, () => [], undefined, opt, () => []);
    return new Uint8Array(await D.Packer.toBuffer(d));
  }
  const xml = (b: Uint8Array) => strFromU8(unzipSync(b)['word/document.xml']!);
  it('ausgefüllt: Abschnitt mit den Fragen und Antworten; die Prüfung auf Barrierefreiheit bleibt ohne Befund', async () => {
    const b = await doc({ integration: { warum: 'Weil beides zusammen mehr sagt.', widersprueche: 'Fall S03 passt nicht.' } });
    const x = xml(b);
    expect(x).toContain('Integration der Daten (Mixed Methods)');
    expect(x).toContain('Warum verbinde ich Zahlen und Texte? (Begründung für Mixed Methods)');
    expect(x).toContain('Weil beides zusammen mehr sagt.');
    expect(x).toContain('Fall S03 passt nicht.');
    expect(x).not.toContain('Wo kommen die Daten zusammen?');   // nur ausgefüllte Fragen
    const befund = pruefeDocx(b);
    expect(befund, JSON.stringify(befund, null, 1)).toEqual([]);
  });
  it('leer oder fehlend: kein Abschnitt', async () => {
    expect(xml(await doc())).not.toContain('Integration der Daten');
    expect(xml(await doc({ integration: {} }))).not.toContain('Integration der Daten');
    expect(xml(await doc({ integration: { warum: '   ' } }))).not.toContain('Integration der Daten');
  });
});
