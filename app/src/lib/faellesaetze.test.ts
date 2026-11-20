/** Fälle vergleichen (G1): Sätze, Prüfliste, Joint Display und volle Fall-Tabelle, Anbindung an Blatt, Bericht und Projektdatei. Daten: das Beispiel „Praktikum im Lehramt“. */
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s, type Blatt } from './sitzung.svelte';
import { baueFaelle, bildeGruppen, markiere, notiere, verschiebe, type Faelle, type RohSpalte, type Wert } from './faelle';
import { saetzeFaelle, tabellenFaelle, tabelleAlleFaelle, faellePruefliste, kennText, teilungSatz, bindungenHinweis } from './faellesaetze';
import { teilungInfo, kennwerte } from './faelle';
import { faelleAusDaten, faelleVonBlatt, ergebnisVon } from './faelledaten';
import { werteVon } from './blatttitel';
import { berichtSatz, berichtTabellen, excelTabellen, gerechneteN, saetzeZu } from './berichtsatz';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import { VERFAHREN } from './verfahren';
import type { Werte } from './verfahren';
import type { TableItem } from '../engine/types';
import { tabelleDe } from './export';

const csv = readFileSync(join(__dirname, '..', '..', 'public', 'beispiel', 'praktikum.csv'), 'utf-8').trim().split('\n').map(z => z.split(';'));
const KOPF = csv[0]!;
const zeilen: Wert[][] = csv.slice(1).map(z => z.map((v, i) => (i === 1 || i === 2 ? Number(v.replace(',', '.')) : v)));
const spalten = (): NonNullable<typeof s.spalten> => KOPF.map(name => ({
  name, bezeichnung: ({ kennung: 'Kennung', praktikumsnote: 'Praktikumsnote', selbstwirksamkeit: 'Selbstwirksamkeit', schulform: 'Schulform', interview: 'Interview' } as Record<string, string>)[name]!,
  art: name === 'praktikumsnote' || name === 'selbstwirksamkeit' ? 'zahl' as const : 'text' as const, niveau: 'metrisch' as const, format: '', fehlend: [], fehlendText: '', werteLabels: {}
}));
const W: Werte = { l1: ['praktikumsnote', 'selbstwirksamkeit'], l2: ['interview'], l3: ['kennung'], l4: [] };
const zellen = (t: TableItem) => t.cells.filter(c => c.r > 0).reduce<string[][]>((a, c) => { (a[c.r - 1] ??= [])[c.c] = c.t; return a; }, []);

beforeEach(() => { Object.assign(s, { spalten: spalten(), zeilen, sets: [] }); });

function blatt(w: Werte = W, extra: Partial<Blatt> = {}): Blatt {
  const e = faelleAusDaten(w);
  return { id: 'f1', titel: 'Fälle vergleichen', art: 'faelle', l1: w.l1[0] ?? null, l2: w.l2[0] ?? null, l3: [w.l3[0] ?? '', ...w.l1, '', ...w.l2], syntax: '', items: [], ergebnis: { typ: 'faelle', e: ergebnisVon(w, e) }, imBericht: true, notiz: '', zeit: 0, ...extra };
}

describe('Fälle vergleichen: die Karte', () => {
  const v = VERFAHREN.find(x => x.id === 'faelle')!;
  it('Karte „Wie passen Zahlen und Aussagen zusammen?“ mit Zusatz, 1-4 Zahlen und 1-3 Texten, optionaler Kennung', () => {
    expect(v.titel).toBe('Wie passen Zahlen und Aussagen zusammen?');
    expect(v.zusatz).toBe('Fälle vergleichen, Mixed Methods');
    expect(v.luecken.map(l => [l.schluessel, l.mindestens ?? 1, l.hoechstens ?? null, !!l.weg])).toEqual([['l1', 1, 4, false], ['l2', 1, 3, false], ['l3', 0, null, true]]);
  });
  it('zu jeder Lücke passen die richtigen Spalten', () => {
    const ctx = { verschieden: (n: string) => new Set(zeilen.map(z => z[KOPF.indexOf(n)])).size, gueltig: (n: string) => zeilen.length } as Parameters<typeof v.luecken[0]['passt']>[1];
    const passt = (i: number) => spalten().filter(sp => v.luecken[i]!.passt(sp, ctx)).map(sp => sp.name);
    expect(passt(0)).toEqual(['praktikumsnote', 'selbstwirksamkeit', 'schulform']);
    expect(passt(1)).toEqual(['schulform', 'interview']);
    expect(passt(2)).toEqual(['kennung', 'interview']);
  });
  it('Blatt-Auswahl: Kennung, Zahlen und Gruppen, Texte kommen aus l3 zurück', () => {
    expect(werteVon(blatt())).toEqual(W);
    const ohne = blatt({ ...W, l3: [] });
    expect(ohne.l3).toEqual(['', 'praktikumsnote', 'selbstwirksamkeit', '', 'interview']);
    expect(werteVon(ohne)).toEqual({ l1: ['praktikumsnote', 'selbstwirksamkeit'], l2: ['interview'], l3: [], l4: [] });
  });
  it('Titel und Befehl nennen Statable als Rechner, keinen PSPP-Befehl', () => {
    expect(v.titelBlatt(W, n => spalten().find(x => x.name === n))).toBe('Fälle vergleichen: Praktikumsnote, Selbstwirksamkeit');
    expect(v.syntax(W, {} as never)).toMatch(/^\* Fälle vergleichen: Statable beschreibt die Fälle selbst/);
  });
});

describe('Fälle vergleichen: Sätze', () => {
  it('Zusammenfassung wie im Auftrag: „4 Gruppen, 16 Fälle. Die Gruppen sind ein Arbeitsstand deiner Deutung.“', () => {
    const e = faelleAusDaten(W), st = saetzeFaelle(e, bildeGruppen(e));
    expect(st.haupt).toBe('4 Gruppen, 16 Fälle. Die Gruppen sind ein Arbeitsstand deiner Deutung.');
    expect(st.zusatz).toBe('Die Tabelle beschreibt diese Fälle. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen.');
    expect(st.apa).toBe('');
  });
  it('Sie-Anrede und Einzahl als ganze Sätze', () => {
    const vorher = s.einst.anrede; s.einst.anrede = 'sie';
    const e = faelleAusDaten({ ...W, l1: ['praktikumsnote'] });
    s.einst.anrede = vorher;
    const e1 = baueFaelle(spalten(), zeilen.slice(0, 1), { kennung: '', q: ['schulform'], t: ['interview'] }, undefined);
    s.einst.anrede = 'sie';
    expect(saetzeFaelle(e1, bildeGruppen(e1)).haupt).toBe('1 Gruppe, 1 Fall. Die Gruppe ist ein Arbeitsstand Ihrer Deutung.');
    expect(saetzeFaelle(e, bildeGruppen(e)).haupt).toMatch(/Ihrer Deutung\.$/);
    s.einst.anrede = vorher;
  });
  it('kein Test, kein p: weder Sätze noch Tabellen sprechen von „zeigt“, „belegt“, „signifikant“ oder p-Werten', () => {
    const e = faelleAusDaten(W), g = bildeGruppen(e);
    const alles = [saetzeFaelle(e, g).haupt, saetzeFaelle(e, g).zusatz, ...tabellenFaelle(e, g).flatMap(t => [t.title!.t, ...t.cells.map(c => c.t), ...t.footnotes.map(f => f.t)])].join(' ');
    expect(alles).not.toMatch(/zeigt|belegt|signifikant|\bp\s*[=<]/);
  });
  it('Bindungen am Median: Hinweis mit beiden Größen (9 bis 2, 7 darüber)', () => {
    const e = faelleAusDaten(W), i = teilungInfo(e, 'praktikumsnote')!;
    expect(teilungSatz(i, 'Note')).toBe('Note: geteilt am Median 2. „bis 2“: 9 Fälle, „über 2“: 7 Fälle.');
    const h = bindungenHinweis(i, 'Note')!;
    expect(h.text).toBe('Note: 2 Fälle liegen genau auf 2');
    expect(h.klein).toContain('„bis 2“ hat 9 Fälle, „über 2“ hat 7 Fälle');
    expect(bindungenHinweis(teilungInfo(e, 'selbstwirksamkeit')!, 'SW')).toBeNull();
  });
});

describe('Fälle vergleichen: Prüfliste', () => {
  const pruefe = (w: Werte, z = zeilen.length) => faellePruefliste(w, z, () => faelleAusDaten(w));
  it('in Ordnung: Zahl der Fälle und Gruppen, Teilung, Bindungen, Hinweis „Beschreibt nur“', () => {
    const p = pruefe(W);
    expect(p.some(x => x.art === 'sperre')).toBe(false);
    expect(p[0]).toMatchObject({ art: 'ok', text: '16 Fälle, 4 Gruppen vorgeschlagen' });
    expect(p.some(x => x.art === 'hinweis' && /2 Fälle liegen genau auf 2/.test(x.text))).toBe(true);
    expect(p.at(-1)!.text).toBe('Die Tabelle beschreibt diese Fälle. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen.');
    expect(p.some(x => /Ohne Kennung/.test(x.text))).toBe(false);
    expect(pruefe({ ...W, l3: [] }).some(x => /Ohne Kennung zählen die Zeilennummern/.test(x.text))).toBe(true);
  });
  it('Sperren: Spalte doppelt, zu viele Spalten, zu viele Zeilen, keine Zeile mit Angaben', () => {
    expect(pruefe({ ...W, l2: ['praktikumsnote'] })[0]).toMatchObject({ art: 'sperre', text: 'Eine Spalte steht mehrfach' });
    expect(pruefe({ l1: ['a', 'b', 'c', 'd', 'e'], l2: ['interview'], l3: [], l4: [] })[0]).toMatchObject({ art: 'sperre', text: 'Zu viele Spalten' });
    expect(pruefe({ l1: ['a'], l2: ['b', 'c', 'd', 'e'], l3: [], l4: [] })[0]).toMatchObject({ art: 'sperre', text: 'Zu viele Spalten' });
    expect(pruefe(W, 60000)[0]).toMatchObject({ art: 'sperre', text: 'Zu viele Zeilen: 60000' });
    Object.assign(s, { zeilen: zeilen.map(z => [z[0], null, null, null, '']) });
    expect(pruefe(W)[0]).toMatchObject({ art: 'sperre', text: 'Keine Zeile mit Angaben' });
  });
  it('mehr als 500 Fälle: Hinweis; mehr als 3000: Sperre', () => {
    const viele = (n: number) => Array.from({ length: n }, (_, i) => [`K${i}`, 1 + (i % 7) / 2, 3 + (i % 5) / 2, 'Primar', `Text ${i}`]);
    Object.assign(s, { zeilen: viele(600) });
    expect(pruefe(W).some(x => x.art === 'hinweis' && /600 Fälle/.test(x.text))).toBe(true);
    Object.assign(s, { zeilen: viele(3100) });
    expect(pruefe(W, 3100)[0]).toMatchObject({ art: 'sperre', text: 'Zu viele Fälle: 3100' });
  });
});

describe('Fälle vergleichen: Joint Display und volle Tabelle', () => {
  it('Joint Display: eine Zeile je Gruppe (Gruppe · n · Kennwerte · markierte Zitate · Notiz), n summiert zu 16', () => {
    const e = faelleAusDaten(W), g = bildeGruppen(e);
    const [t] = tabellenFaelle(e, g);
    expect(t!.title!.t).toBe('Gruppen im Vergleich (Joint Display)');
    expect(t!.cells.filter(c => c.r === 0).map(c => c.t)).toEqual(['Gruppe', 'n', 'Kennwerte', 'Markierte Zitate', 'Notiz', 'Passung', 'Meta-Inferenz']);
    const z = zellen(t!);
    expect(z.length).toBe(g.length);
    expect(z.reduce((a, r) => a + Number(r[1]), 0)).toBe(16);
    expect(z[0]![0]).toBe('Praktikumsnote bis 2 · Selbstwirksamkeit bis 3,75');
    expect(z[0]![2]).toMatch(/^Praktikumsnote: M = 1,43, SD = 0,34, Mdn = 1,5, Min bis Max 1 bis 1,7; Selbstwirksamkeit: M = /);
    expect(t!.footnotes[0]!.t).toBe('Die Tabelle beschreibt diese Fälle. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen.');
  });
  it('markierte Zitate (mit Kennung) und Notiz stehen in der Zeile ihrer Gruppe; verschobene Fälle zählen in der neuen Gruppe', () => {
    const e = faelleAusDaten(W), g0 = bildeGruppen(e);
    const f = e.faelle.find(x => x.kennung === 'S02')!, ziel = g0.find(x => x.mitglieder.length && !x.mitglieder.includes(e.faelle.indexOf(f)))!;
    markiere(e, f.schluessel, 'interview', 0, 16);
    notiere(e, g0.find(x => x.mitglieder.includes(e.faelle.indexOf(f)))!.id, 'Deutung A');
    const z = zellen(tabellenFaelle(e)[0]!);
    expect(z.find(r => /Deutung A/.test(r[4]!))![3]).toBe('„Die Note war gut“ (S02)');
    verschiebe(e, f.schluessel, ziel.id);
    expect(zellen(tabellenFaelle(e)[0]!).find(r => r[0] === ziel.name)![3]).toBe('„Die Note war gut“ (S02)');
  });
  it('Einzelner Fall: SD „-“ (nicht 0) im Text', () => {
    const e = faelleAusDaten(W), k = kennwerte(e, [0]);
    expect(kennText(k[0]!, 'Note')).toMatch(/^Note: M = 1,30, SD = -, Mdn = 1,3, Min bis Max 1,3 bis 1,3$/);
  });
  it('volle Tabelle: eine Zeile je Fall, Kennung, Gruppe, Zahlen als Zahlen, vollständiger Text', () => {
    const e = faelleAusDaten(W), t = tabelleAlleFaelle(e);
    expect(t.cells.filter(c => c.r === 0).map(c => c.t)).toEqual(['Kennung', 'Gruppe', 'Praktikumsnote', 'Selbstwirksamkeit', 'Interview', 'Passung', 'Meta-Inferenz']);
    const z = zellen(t);
    expect(z.length).toBe(16);
    expect(z[0]!.slice(0, 1)).toEqual(['S01']);
    expect(t.cells.find(c => c.r === 1 && c.c === 2)).toMatchObject({ t: '1.3', n: 1.3 });
    expect(z[0]![4]).toBe(zeilen[0]![4]);
    expect(t.cells.find(c => c.r === 1 && c.c === 1)!.t).toBe('Praktikumsnote bis 2 · Selbstwirksamkeit bis 3,75');
  });
});

describe('Fälle vergleichen: Ausgabe für Word, PDF und Excel (tabelleDe)', () => {
  it('beide Tabellen lassen sich wie die übrigen Tabellen in Zeilen und Zellen übersetzen; Texte bleiben unverändert, Zahlen als Zahlen', () => {
    const e = faelleAusDaten(W), joint = tabelleDe(tabellenFaelle(e)[0]!, null), alle = tabelleDe(tabelleAlleFaelle(e), null);
    expect(joint.kopfZeilen).toBe(1); expect(joint.zeilen.length).toBe(1 + 4);
    expect(joint.zeilen[1]![0]!.t).toBe('Praktikumsnote bis 2 · Selbstwirksamkeit bis 3,75');
    expect(joint.fuss[0]).toMatch(/^Die Tabelle beschreibt diese Fälle/);
    expect(alle.zeilen.length).toBe(1 + 16);
    expect(alle.zeilen[1]![4]!.t).toBe(zeilen[0]![4]);   // Text vollständig, unverändert
    expect(alle.zeilen[1]![2]).toMatchObject({ t: '1,3', zahl: true });   // Zahl: deutsches Komma
  });
});

describe('Fälle vergleichen: Blatt, Bericht, Excel, Projektdatei', () => {
  it('Satz im Bericht ohne Statistik-Zeile; Tabellen: Joint Display; Excel: Joint Display und volle Tabelle; Stichprobe „16 Fälle“', () => {
    const b = blatt();
    expect(saetzeZu(b)!.haupt).toBe('4 Gruppen, 16 Fälle. Die Gruppen sind ein Arbeitsstand deiner Deutung.');
    expect(berichtSatz(b)).toBe('4 Gruppen, 16 Fälle. Die Gruppen sind ein Arbeitsstand deiner Deutung.');
    expect(berichtTabellen(b).map(t => t.title!.t)).toEqual(['Gruppen im Vergleich (Joint Display)']);
    expect((excelTabellen(b) as TableItem[]).map(t => t.title!.t)).toEqual(['Gruppen im Vergleich (Joint Display)', 'Alle Fälle']);
    expect(gerechneteN(b)).toEqual({ n: 16, art: 'faelle' });
  });
  it('Zustand im Blatt (blatt.faelle): Gruppen, Notizen und Zitate wirken auf Sätze und Tabellen und überstehen die Projektdatei', () => {
    const e = faelleAusDaten(W), f = e.faelle[1]!;
    markiere(e, f.schluessel, 'interview', 4, 13); notiere(e, bildeGruppen(e)[0]!.id, 'Meine Deutung');
    const b = blatt(W, { faelle: e.zustand });
    expect(berichtTabellen(b)[0]!.cells.some(c => c.t === 'Meine Deutung')).toBe(true);
    expect(berichtTabellen(b)[0]!.cells.some(c => /\(S02\)$/.test(c.t))).toBe(true);
    const text = projektAlsDatei({ name: 'x', quelle: '', sav: new Uint8Array(), blaetter: [b], sets: [], skalen: [], entscheid: {}, zeit: 0 } as never);
    const zurueck = leseProjektdatei(text).blaetter[0]!;
    expect(zurueck.faelle).toEqual(e.zustand);
    const e2: Faelle = faelleVonBlatt(zurueck);
    expect(bildeGruppen(e2)[0]!.notiz).toBe('Meine Deutung');
  });
  it('Daten ändern sich (Zeilen umsortiert): Zuordnung bleibt über die Kennung', () => {
    const e = faelleAusDaten(W), f = e.faelle.find(x => x.kennung === 'S10')!, ziel = bildeGruppen(e).find(x => !x.mitglieder.includes(e.faelle.indexOf(f)) && x.mitglieder.length)!;
    verschiebe(e, f.schluessel, ziel.id);
    const b = blatt(W, { faelle: e.zustand });
    Object.assign(s, { zeilen: [...zeilen].reverse() });
    const e2 = faelleVonBlatt(b), g = bildeGruppen(e2).find(x => x.id === ziel.id)!;
    expect(g.mitglieder.map(i => e2.faelle[i]!.kennung)).toContain('S10');
  });
  it('baueFaelle über RohSpalte aus den Daten: Werte mit „keine Angabe“-Code zählen als fehlend', () => {
    const roh: RohSpalte[] = [{ name: 'a', bezeichnung: 'A', art: 'zahl', fehlend: [-99], werteLabels: {} }, { name: 't', bezeichnung: 'T', art: 'text', fehlend: [], werteLabels: {} }];
    const e = baueFaelle(roh, [[1, 'x'], [-99, 'y'], [3, 'z'], [4, 'w']], { kennung: '', q: ['a'], t: ['t'] });
    expect(e.faelle.map(f => f.q[0])).toEqual([1, null, 3, 4]);
    expect(bildeGruppen(e).map(g => g.name)).toEqual(['A bis 3', 'A über 3', 'ohne Angabe bei A']);
  });
});
