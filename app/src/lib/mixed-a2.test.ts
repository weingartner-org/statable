/**
 * Stufe A2 (Mixed Methods): Pflichttests Fassung 3 für die neuen Felder (Architekturblatt Ausbau 4), Rechnungen gegen R (scripts/ausbau-a2-erwartet.R →
 * lib/testdaten/ausbau-a2-erwartet.json, zweiter Weg über Segment → Dokument → Fall in R), Verweise, Einzelfall-Sicht, Design-Steckbrief, Selbstprüfung.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER, type QualProjekt } from './qualprojekt';
import {
  faelleMitDokument, halteMixed, jdAufbau, jdGruppen, kennwerte, legeJdAn, aendereJd, setzeBeleg, setzeJdMeta, setzeJdPassung, setzeVerknuepfung,
  spaltenErgebnis, verknuepfe, zeilenSchluessel, type DatenSicht,
} from './mixed';
import { umfrageDaten } from './mixed-beispiel';
import { codeAbstaende, mittlereVerknuepfung } from './kodieren-ansichten';
import { baumReihenfolge, entferneCode } from './kodieren';
import { itemAnalyse, itemsInPlan, legeItemAn } from './instrument';
import { ablauf, ablaufText, designFragen, designName, notation, setzeDesign } from './mm-design';
import { GRAMMS, MMAT, hinweise, punktStand, setzePunkt } from './mm-selbstpruefung';
import { sichtbaresProjekt, starteEinzelfall } from './einzelfall-modus';
import ERW from './testdaten/ausbau-a2-erwartet.json';

const pfad = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));
const beispiel = (): QualProjekt => pruefeQualProjekt(JSON.parse(readFileSync(pfad('public/beispiel/mixed/hilfe-projekt.json'), 'utf8')));
const daten = (): DatenSicht => umfrageDaten(readFileSync(pfad('public/beispiel/mixed/umfrage.csv'), 'utf8')) as unknown as DatenSicht;
const varId = (q: QualProjekt, n: string) => q.variablen.find(v => v.name === n)!.id;
const codeId = (q: QualProjekt, k: string) => q.codes.find(c => c.name.startsWith(k + ' '))!.id;
const verknuepft = (): QualProjekt => { const q = beispiel(); return setzeVerknuepfung(q, { variable: varId(q, 'survey_id'), spalte: 'survey_id' }, 5); };
const nah = (a: number | null | undefined, b: number | null | undefined) => { expect(a).not.toBeNull(); expect(Math.abs((a as number) - (b as number))).toBeLessThan(1e-9); };

describe('A2 Fassung 3: Pflichttests (Architekturblatt Ausbau 4)', () => {
  it('1. altes Projekt Fassung 1 bleibt Fassung 1 und unverändert', () => {
    const q = neuesQualProjekt('alt');
    const r = rund(q);
    expect(r.version).toBe(1);
    expect(JSON.stringify(rund(r))).toBe(JSON.stringify(r));
  });
  it('2. nur Arbeitsweise: Fassung bleibt 1', () => {
    expect(rund({ ...neuesQualProjekt('a'), arbeitsweise: 'ipa' }).version).toBe(1);
  });
  it('3. jedes neue Feld hebt auf 3 und übersteht Lesen und Schreiben verlustfrei', () => {
    const q = verknuepft();
    const felder: [string, QualProjekt][] = [];
    felder.push(['verknuepfung', { ...neuesQualProjekt('v'), variablen: [{ id: 'v1', name: 'id', typ: 'text' }], verknuepfung: { variable: 'v1', spalte: 'survey_id', geaendert: 1 } }]);
    const mitJd = aendereJd(legeJdAn(q, 'qual-nach-gruppen', 'JD', 7).q, q.jointDisplays?.[0]?.id ?? '', j => j, 7);
    const { q: q2, id } = legeJdAn(q, 'qual-nach-gruppen', 'Themen nach Erstperson', 7);
    const t1 = q.themen![0]!;
    let q3 = aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId(q, 'first_generation') }, zeilen: [{ art: 'thema', id: t1.id }, { art: 'code', id: codeId(q, 'B2') }] }), 8);
    q3 = setzeJdPassung(q3, id, `thema:${t1.id}`, 'erweiterung', 9);
    q3 = setzeJdMeta(q3, id, `thema:${t1.id}`, 'Meine Deutung', 9);
    felder.push(['jointDisplays', q3]);
    felder.push(['mmDesign', setzeDesign(neuesQualProjekt('d'), d => ({ ...d, reihenfolge: 'quan-zuerst', gewicht: 'quan', zwecke: ['ergaenzung'], integration: ['verbinden'], beschreibung: 'x' }), 3)]);
    felder.push(['selbstpruefung', setzePunkt(neuesQualProjekt('s'), 'mmat', 'mmat-5-1', { stand: 'ja', fundstelle: 'Kapitel 2', notiz: 'n' }, 4)]);
    felder.push(['instrument', legeItemAn(q, 'Asking for help makes me look weak.', { art: 'code', id: codeId(q, 'A1') }, { umgepolt: false }, 5).q]);
    void mitJd;
    for (const [feld, p] of felder) {
      const ohneFeld = { ...p } as Record<string, unknown>; delete ohneFeld[feld]; delete ohneFeld.themen;
      expect(qualFassung(p), feld).toBe(3);
      const r = rund(p);
      expect(r.version, feld).toBe(3);
      expect(JSON.parse(JSON.stringify((r as unknown as Record<string, unknown>)[feld])), feld).toEqual(JSON.parse(JSON.stringify((p as unknown as Record<string, unknown>)[feld])));
    }
    for (const f of ['verknuepfung', 'jointDisplays', 'mmDesign', 'selbstpruefung', 'instrument']) expect(BEKANNTE_FELDER).toContain(f);
  });
  it('4. Fassung 4 wird laut abgelehnt', () => {
    expect(() => pruefeQualProjekt({ ...neuesQualProjekt('x'), version: 4 })).toThrow(/Fassung/);
  });
  it('tote Verweise fallen beim Lesen still weg', () => {
    const q = verknuepft();
    const { q: q2, id } = legeJdAn(q, 'qual-nach-gruppen', 'JD', 7);
    const roh = JSON.parse(JSON.stringify(aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: 'weg' }, zeilen: [{ art: 'code', id: 'weg' }, { art: 'code', id: codeId(q, 'A1') }], belege: [{ zeile: 'code:x', gruppe: 'alle', segment: 'weg' }] }))));
    roh.verknuepfung.variable = 'weg';
    roh.instrument = [{ id: 'i1', text: 't', herkunft: { art: 'thema', id: 'weg' }, beleg: 'weg', erstellt: 1, geaendert: 1 }];
    const r = pruefeQualProjekt(roh);
    expect(r.verknuepfung).toBeUndefined();
    expect(r.jointDisplays![0]!.gruppierung).toBeUndefined();
    expect(r.jointDisplays![0]!.zeilen).toEqual([{ art: 'code', id: codeId(q, 'A1') }]);
    expect(r.jointDisplays![0]!.belege).toEqual([]);
    expect(r.instrument![0]!.herkunft).toBeUndefined();
    expect(r.instrument![0]!.beleg).toBeUndefined();
  });
  it('falsche Formen werden abgelehnt (Passung-Text unbekannt fällt weg, Stand unbekannt ist ein Fehler)', () => {
    const q = setzePunkt(neuesQualProjekt('s'), 'mmat', 'mmat-5-1', { stand: 'ja' }, 4);
    const roh = JSON.parse(JSON.stringify(q)); roh.selbstpruefung[0].punkte[0].stand = 'super';
    expect(() => pruefeQualProjekt(roh)).toThrow();
  });
});

describe('A2 Beispielprojekt und Verknüpfung', () => {
  it('Beispiel liest sich, Fassung 3 (Themen), 5 Fälle mit Dokument', () => {
    const q = beispiel();
    expect(q.version).toBe(3);
    expect(faelleMitDokument(q)).toHaveLength(5);
    expect(q.kodierungen).toHaveLength(27);
  });
  it('Verknüpfung über survey_id: 5 von 5, nichts doppelt', () => {
    const q = verknuepft();
    const v = verknuepfe(q, daten(), q.verknuepfung!);
    expect(Object.keys(v.zuordnung)).toHaveLength(ERW.verknuepft);
    expect(v.ohneTreffer).toEqual([]); expect(v.mehrfach).toEqual([]); expect(v.ohneWert).toEqual([]);
    expect(verknuepfe(q, daten(), { variable: varId(q, 'survey_id'), spalte: 'gibt-es-nicht' }).spalteFehlt).toBe(true);
  });
  it('Werte im Datensatz mehrfach: nicht verknüpft, gemeldet', () => {
    const q = verknuepft(); const d = daten();
    const i = d.spalten.findIndex(s => s.name === 'survey_id');
    d.zeilen = [...d.zeilen, d.zeilen.find(z => z[i] === 'S07')!.slice()];
    const v = verknuepfe(q, d, q.verknuepfung!);
    expect(v.mehrfach).toEqual([q.faelle.find(f => f.name.includes('C01'))!.id]);
    expect(Object.keys(v.zuordnung)).toHaveLength(4);
  });
  it('Gruppen nach Fallvariable first_generation wie in R', () => {
    const q = beispiel();
    const g = jdGruppen(q, { quelle: 'variable', id: varId(q, 'first_generation') }, faelleMitDokument(q));
    const namen = (ids: string[]) => ids.map(f => q.faelle.find(x => x.id === f)!.name).sort();
    expect(g.map(x => x.name)).toEqual(['no', 'yes']);
    expect(namen(g[0]!.faelle)).toEqual([...ERW.gruppenErstperson.no].sort());
    expect(namen(g[1]!.faelle)).toEqual([...ERW.gruppenErstperson.yes].sort());
  });
  it('Gruppen über eine Spalte des verknüpften Datensatzes (dieselben, weil die Werte gleich sind)', () => {
    const q = verknuepft(); const d = daten();
    const z = verknuepfe(q, d, q.verknuepfung!).zuordnung;
    const g = jdGruppen(q, { quelle: 'spalte', name: 'first_generation' }, faelleMitDokument(q), { daten: d, zuordnung: z });
    expect(g.map(x => [x.name, x.faelle.length])).toEqual([['no', 3], ['yes', 2]]);
    const ohneLink = jdGruppen(q, { quelle: 'spalte', name: 'first_generation' }, faelleMitDokument(q), { daten: d, zuordnung: {} });
    expect(ohneLink.map(x => x.schluessel)).toEqual(['nv']);
  });
});

describe('A2 Joint Displays gegen R', () => {
  it('Themen und Codes nach Erstperson: Zahl der Fälle je Zelle wie in R', () => {
    const q = beispiel();
    const { q: q2, id } = legeJdAn(q, 'qual-nach-gruppen', 'JD');
    const zeilen = [...q.themen!.map(t => ({ art: 'thema' as const, id: t.id })), { art: 'code' as const, id: codeId(q, 'A') }, { art: 'code' as const, id: codeId(q, 'B2') }];
    const q3 = aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId(q, 'first_generation') }, zeilen }));
    const a = jdAufbau(q3, q3.jointDisplays![0]!);
    expect(a.fehlt).toEqual([]);
    expect(a.kopf.map(k => [k.name, k.n])).toEqual([['no', 3], ['yes', 2]]);
    const soll = [...q.themen!.map(t => ERW.zellen[t.name as keyof typeof ERW.zellen]), ERW.zellen['A Barriers'], ERW.zellen.B2];
    a.zeilen.forEach((z, i) => {
      expect(z.zellen[0]!.anteil!.mit, z.name).toBe(soll[i]!.no);
      expect(z.zellen[1]!.anteil!.mit, z.name).toBe(soll[i]!.yes);
      expect(z.zellen.every(c => c.beleg === undefined), 'nie automatisch ein Beleg').toBe(true);
    });
    expect(a.zeilen[0]!.zellen[0]!.text).toMatch(/3 (von|of) 3/);
  });
  it('Belegstelle: nur, was die Person wählt; passt sie nicht mehr, wird sie als veraltet gemeldet', () => {
    const q = beispiel();
    const { q: q2, id } = legeJdAn(q, 'qual-nach-gruppen', 'JD');
    const t = q.themen![0]!;
    let q3 = aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId(q, 'first_generation') }, zeilen: [{ art: 'thema', id: t.id }] }));
    const vorher = jdAufbau(q3, q3.jointDisplays![0]!);
    const kand = vorher.zeilen[0]!.zellen[1]!.kandidaten!;
    expect(kand.length).toBeGreaterThan(0);
    q3 = setzeBeleg(q3, id, zeilenSchluessel({ art: 'thema', id: t.id }), vorher.kopf[1]!.schluessel, kand[0]!);
    const nach = jdAufbau(q3, q3.jointDisplays![0]!);
    expect(nach.zeilen[0]!.zellen[1]!.beleg!.text.length).toBeGreaterThan(5);
    expect(nach.zeilen[0]!.zellen[1]!.beleg!.quelle).toMatch(/Interview/);
    expect(nach.zeilen[0]!.zellen[0]!.beleg).toBeUndefined();
    // dieselbe Stelle in der anderen Gruppe passt nicht
    const falsch = setzeBeleg(q3, id, zeilenSchluessel({ art: 'thema', id: t.id }), vorher.kopf[0]!.schluessel, kand[0]!);
    expect(jdAufbau(falsch, falsch.jointDisplays![0]!).zeilen[0]!.zellen[0]!.belegVeraltet).toBe(true);
  });
  it('Zahlen nach qualitativen Gruppen (mit / ohne B2): Kennwerte der verknüpften Fälle wie in R', () => {
    const q = verknuepft(); const d = daten();
    const { q: q2, id } = legeJdAn(q, 'zahlen-nach-qual', 'Typologie');
    const q3 = aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'code', id: codeId(q, 'B2') }, spalten: ['gpa_first_term', 'belonging', 'used_tutoring'] }));
    const a = jdAufbau(q3, q3.jointDisplays![0]!, { daten: d });
    expect(a.fehlt).toEqual([]);
    expect(a.zeilen.map(z => z.n)).toEqual([ERW.gruppeB2.mit.n, ERW.gruppeB2.ohne.n]);
    const gpa = a.zeilen[0]!.zellen[0]!.kenn!;
    if (gpa.art !== 'zahl') throw new Error('Zahl erwartet');
    nah(gpa.m, ERW.gruppeB2.mit.gpa.m); nah(gpa.sd, ERW.gruppeB2.mit.gpa.sd); nah(gpa.median, ERW.gruppeB2.mit.gpa.median);
    nah(gpa.min, ERW.gruppeB2.mit.gpa.min); nah(gpa.max, ERW.gruppeB2.mit.gpa.max);
    const ohne = a.zeilen[1]!.zellen[0]!.kenn!;
    if (ohne.art !== 'zahl') throw new Error('Zahl erwartet');
    expect(ohne.n).toBe(1); expect(ohne.sd).toBeNull();
    const tut = a.zeilen[0]!.zellen[2]!.kenn!;
    if (tut.art !== 'gruppe') throw new Error('Gruppe erwartet');
    expect(tut.stufen.map(s => [s.wert, s.n])).toEqual(ERW.gruppeB2.mit.tutoring.stufen.map(s => [s.wert, s.n]));
    expect(a.kleineFallzahl).toBe(true);
  });
  it('Seite an Seite: Ergebnis einer Spalte über den ganzen Datensatz wie in R (mit fehlendem Wert)', () => {
    const d = daten();
    const hs2 = d.spalten.find(s => s.name === 'hs2')!;
    const i = d.spalten.indexOf(hs2);
    const k = kennwerte(hs2, d.zeilen.map(z => z[i] ?? null), 'zahl');
    if (k.art !== 'zahl') throw new Error();
    expect(k.n).toBe(ERW.gesamt.hs2.n); expect(k.fehlend).toBe(ERW.gesamt.hs2.fehlend);
    nah(k.m, ERW.gesamt.hs2.m); nah(k.sd, ERW.gesamt.hs2.sd); nah(k.median, ERW.gesamt.hs2.median);
    const gi = d.spalten.findIndex(s => s.name === 'gpa_first_term');
    const g = kennwerte(d.spalten[gi]!, d.zeilen.map(z => z[gi] ?? null));
    if (g.art !== 'zahl') throw new Error();
    nah(g.m, ERW.gesamt.gpa.m); nah(g.sd, ERW.gesamt.gpa.sd);
    const fg = spaltenErgebnis(d, 'first_generation')!;
    expect(fg).toContain(`n = ${ERW.gesamt.first_generation.n}`);
    for (const s of ERW.gesamt.first_generation.stufen) expect(fg).toContain(`${s.wert}: ${s.n}`);
    const q = beispiel();
    const { q: q2, id } = legeJdAn(q, 'seite-an-seite', 'SaS');
    const q3 = aendereJd(q2, id, j => ({ ...j, zeilen: [{ art: 'thema', id: q.themen![2]!.id }], zahlen: { [`thema:${q.themen![2]!.id}`]: fg } }));
    const a = jdAufbau(q3, q3.jointDisplays![0]!, { daten: d });
    expect(a.zeilen[0]!.zellen[0]!.text).toBe(fg);
    expect(a.zeilen[0]!.zellen[1]!.anteil).toEqual({ mit: ERW.zellen[q.themen![2]!.name as keyof typeof ERW.zellen].alle, n: 5 });
  });
  it('fehlende Teile werden genannt, nicht geraten', () => {
    const q = beispiel();
    const { q: q2 } = legeJdAn(q, 'zahlen-nach-qual', 'leer');
    expect(jdAufbau(q2, q2.jointDisplays![0]!).fehlt).toEqual(['gruppierung', 'spalten', 'daten', 'verknuepfung']);
  });
});

describe('A2 Code-Landkarte: Abstände und Clusteranalyse gegen R', () => {
  const q = beispiel();
  const codes = baumReihenfolge(q.codes).map(e => e.code.id).filter(id => q.codes.find(c => c.id === id)!.kodierbar);
  it('Jaccard und Simple Matching über Dokumente wie in R', () => {
    const j = codeAbstaende(q, { codes, kodierende: 'alle' });
    expect(j.codes.map(id => q.codes.find(c => c.id === id)!.name.split(' ')[0])).toEqual(ERW.codes);
    j.D.forEach((z, a) => z.forEach((v, b) => nah(v, ERW.jaccard[a]![b]!)));
    const sm = codeAbstaende(q, { codes, kodierende: 'alle', mass: 'sm' });
    expect(sm.einheiten).toBe(5);
    sm.D.forEach((z, a) => z.forEach((v, b) => nah(v, ERW.sm[a]![b]!)));
    // eine Einheit je Fall: über Fälle dasselbe wie über Dokumente
    expect(codeAbstaende(q, { codes, kodierende: 'alle', einheit: 'faelle' }).D).toEqual(j.D);
  });
  it('mittlere Verknüpfung: dieselben Höhen wie hclust(average)', () => {
    const j = codeAbstaende(q, { codes, kodierende: 'alle' });
    const v = mittlereVerknuepfung(j.D);
    expect(v).toHaveLength(codes.length - 1);
    v.forEach((s, i) => nah(s.hoehe, ERW.hclustHoehen[i]!));
  });
});

describe('A2 Instrumentenentwicklung: Item-Analyse gegen R', () => {
  it('hs1 bis hs6 mit hs3 und hs5 gedreht: n, Alpha, Trennschärfe, Alpha ohne Item', () => {
    const d = daten();
    const werte = [1, 2, 3, 4, 5, 6].map(k => { const i = d.spalten.findIndex(s => s.name === `hs${k}`); return d.zeilen.map(z => z[i] as number | null); });
    const a = itemAnalyse(werte, [false, false, true, false, true, false], { min: 1, max: 5 });
    expect(a.n).toBe(ERW.items.n);
    nah(a.alpha, ERW.items.alpha);
    a.items.forEach((it, j) => { nah(it.trennschaerfe, ERW.items.je[j]!.trennschaerfe); nah(it.alphaOhne, ERW.items.je[j]!.alphaOhne); nah(it.m, ERW.items.je[j]!.m); nah(it.sd, ERW.items.je[j]!.sd); });
    // ohne feste Grenzen: beobachtet 1 bis 5, dasselbe
    nah(itemAnalyse(werte, [false, false, true, false, true, false]).alpha, ERW.items.alpha);
  });
  it('zwei Items: Alpha ja, Alpha ohne Item nein', () => {
    const a = itemAnalyse([[1, 2, 3, 4], [2, 2, 4, 5]], [false, false]);
    expect(a.alpha).not.toBeNull();
    expect(a.items.every(i => i.alphaOhne === null)).toBe(true);
  });
  it('Items gehen wörtlich in einen neuen Plan, je Kategorie ein Block, Umpolung im Plan', () => {
    let q = beispiel();
    q = legeItemAn(q, 'I worry that asking makes me look weak.', { art: 'code', id: codeId(q, 'A1') }).q;
    q = legeItemAn(q, 'Asking for help is easy for me.', { art: 'code', id: codeId(q, 'A1') }, { umgepolt: true }).q;
    q = legeItemAn(q, 'My study group helps me.', { art: 'code', id: codeId(q, 'B1') }).q;
    const r = itemsInPlan(q, undefined, 'en', { de: 'Aus Interviews', en: 'From interviews' });
    expect(r.anzahl).toBe(3);
    const bloecke = r.plan.elemente.flatMap(s => s.elemente).filter(e => e.art === 'block');
    expect(bloecke).toHaveLength(2);
    const b0 = bloecke[0] as Extract<typeof bloecke[number], { art: 'block' }>;
    expect(b0.items.map(i => i.text.en)).toEqual(['I worry that asking makes me look weak.', 'Asking for help is easy for me.']);
    expect(b0.items[1]!.umgepolt).toBe(true);
    expect(Object.keys(r.zuordnung)).toHaveLength(3);
  });
});

describe('A2 Verweise und Einzelfall', () => {
  it('Code löschen: Zeile, Beleg und Item-Herkunft fallen weg (halteMixed)', () => {
    const q = verknuepft();
    const b2 = codeId(q, 'B2');
    const { q: q2, id } = legeJdAn(q, 'seite-an-seite', 'x');
    let q3 = aendereJd(q2, id, j => ({ ...j, zeilen: [{ art: 'code', id: b2 }] }));
    const kand = jdAufbau(q3, q3.jointDisplays![0]!).zeilen[0]!.zellen[1]!.kandidaten!;
    q3 = setzeBeleg(q3, id, `code:${b2}`, 'alle', kand[0]!);
    q3 = legeItemAn(q3, 'x', { art: 'code', id: b2 }).q;
    const ohne = halteMixed(entferneCode(q3, b2));
    expect(ohne.jointDisplays![0]!.zeilen).toEqual([]);
    expect(ohne.jointDisplays![0]!.belege).toEqual([]);
    expect(ohne.instrument![0]!.herkunft).toBeUndefined();
    expect(halteMixed(ohne)).toBe(ohne);
  });
  it('Variable löschen: Verknüpfung fällt weg', () => {
    const q = verknuepft();
    const r = halteMixed({ ...q, variablen: q.variablen.filter(v => v.name !== 'survey_id') });
    expect(r.verknuepfung).toBeUndefined();
  });
  it('Einzelfall-Modus: keine Joint Displays, Items, Selbstprüfung oder Design in der Sicht', () => {
    let q = verknuepft();
    q = legeJdAn(q, 'qual-nach-gruppen', 'JD').q;
    q = legeItemAn(q, 'GEHEIM-ITEM', undefined).q;
    q = setzePunkt(q, 'gramms', 'gramms-1', { stand: 'ja', notiz: 'GEHEIM-NOTIZ' });
    q = setzeDesign(q, d => ({ ...d, beschreibung: 'GEHEIM-DESIGN' }));
    const sicht = sichtbaresProjekt(starteEinzelfall(q, q.faelle[0]!.id));
    expect(JSON.stringify(sicht)).not.toMatch(/GEHEIM-(ITEM|NOTIZ|DESIGN)/);
    expect(sicht.jointDisplays).toEqual([]);
  });
});

describe('A2 Design-Steckbrief (fragt und benennt, empfiehlt nicht)', () => {
  it('Schreibweise nach Morse und Namen', () => {
    expect(notation({ reihenfolge: 'quan-zuerst', gewicht: 'quan' })).toBe('QUAN → qual');
    expect(notation({ reihenfolge: 'qual-zuerst', gewicht: 'qual' })).toBe('QUAL → quan');
    expect(notation({ reihenfolge: 'gleichzeitig', gewicht: 'gleich' })).toBe('QUAN + QUAL');
    expect(notation({ reihenfolge: 'gleichzeitig', gewicht: 'qual' })).toBe('QUAL + quan');
    expect(notation({ reihenfolge: 'quan-zuerst' })).toBe('quan → qual');
    expect(notation({ reihenfolge: 'mehrphasig', gewicht: 'gleich' })).toBeNull();
    expect(designName({ reihenfolge: 'quan-zuerst' })).toEqual({ en: 'explanatory sequential design', de: 'Vertiefungsdesign' });
    expect(designName({ reihenfolge: 'qual-zuerst' })!.de).toBe('Verallgemeinerungsdesign');
    expect(designName({ reihenfolge: 'mehrphasig' })).toBeNull();
  });
  it('Ablauf mit Textfassung, Fragen nur bei Unstimmigkeiten', () => {
    const s = ablauf({ reihenfolge: 'gleichzeitig', gewicht: 'gleich' });
    expect(s[0]).toHaveLength(2);
    expect(ablaufText(s)).toMatch(/1:.*2:.*3:/);
    expect(designFragen({ reihenfolge: 'quan-zuerst', zwecke: [], integration: [], geaendert: 0 }).map(f => f.kennung)).toEqual(['folge-ohne-aufbau']);
    expect(designFragen({ reihenfolge: 'quan-zuerst', zwecke: [], integration: ['verbinden'], geaendert: 0 })).toEqual([]);
    expect(designFragen({ reihenfolge: 'gleichzeitig', zwecke: ['entwicklung'], integration: [], geaendert: 0 }).map(f => f.kennung)).toEqual(['gleich-ohne-zusammen', 'entwicklung-gleichzeitig']);
    expect(designFragen({ reihenfolge: 'mehrphasig', zwecke: [], integration: [], geaendert: 0 }).map(f => f.kennung)).toEqual(['mehrphasig-ohne-text']);
  });
});

describe('A2 Selbstprüfung (keine Gesamtnote, Hinweise nie gespeichert)', () => {
  it('feste Kennungen', () => {
    expect(MMAT.map(p => p.kennung)).toEqual(['mmat-s1', 'mmat-s2', 'mmat-5-1', 'mmat-5-2', 'mmat-5-3', 'mmat-5-4', 'mmat-5-5']);
    expect(GRAMMS).toHaveLength(6);
  });
  it('setzen, ändern, entfernen; Fundstelle bleibt beim Wechsel des Stands', () => {
    let q = setzePunkt(neuesQualProjekt('s'), 'mmat', 'mmat-5-2', { stand: 'unklar', fundstelle: 'S. 4' });
    q = setzePunkt(q, 'mmat', 'mmat-5-2', { stand: 'ja' });
    expect(punktStand(q, 'mmat', 'mmat-5-2')).toMatchObject({ stand: 'ja', fundstelle: 'S. 4' });
    q = setzePunkt(q, 'mmat', 'mmat-5-2', { stand: null });
    expect(q.selbstpruefung).toBeUndefined();
  });
  it('Hinweise kommen aus dem Projekt und ändern nichts', () => {
    let q = verknuepft();
    const { q: q2, id } = legeJdAn(q, 'seite-an-seite', 'x');
    q = setzeJdPassung(q2, id, 'thema:a', 'widerspruch');
    q = setzeJdMeta(q, id, 'thema:a', 'Gelernt');
    const vorher = JSON.stringify(q);
    const h = hinweise(q, { warum: 'Weil' }, 60);
    expect(Object.keys(h).sort()).toEqual(['gramms-1', 'gramms-3', 'gramms-4', 'gramms-6', 'mmat-5-1', 'mmat-5-2', 'mmat-5-3', 'mmat-5-4']);
    expect(JSON.stringify(q)).toBe(vorher);
    expect(q.selbstpruefung).toBeUndefined();
  });
});

describe('A2 Pseudonymisieren der neuen Freitext-Felder', () => {
  it('ersetzt Namen in Joint Displays, Design, Selbstprüfung und Items', async () => {
    const { findeTreffer, ersetze } = await import('./pseudonym');
    let q = verknuepft();
    q.dokumente[0]!.text = 'Amira Klein fragt ihre Tutorin. ' + q.dokumente[0]!.text;
    q.segmente = []; q.kodierungen = []; q.themen = [];
    const { q: q2, id } = legeJdAn(q, 'seite-an-seite', 'Wie Amira Klein fragt');
    q = setzeJdMeta(q2, id, 'code:x', 'Bei Amira Klein anders');
    q = aendereJd(q, id, j => ({ ...j, zahlen: { 'code:x': 'Amira Klein: 4' } }));
    q = setzeDesign(q, d => ({ ...d, beschreibung: 'Erst Amira Klein' }));
    q = setzePunkt(q, 'gramms', 'gramms-5', { stand: 'ja', fundstelle: 'Amira Klein S. 3', notiz: 'Amira Klein' });
    q = legeItemAn(q, 'Wie Amira Klein: ich frage ungern.', undefined).q;
    const t = findeTreffer(q, { namen: [{ text: 'Amira Klein', art: 'person' }], regeln: [], sprecherAlsPersonen: false }, 'de');
    const p = ersetze(q, t, 9).projekt;
    const json = JSON.stringify([p.jointDisplays, p.mmDesign, p.selbstpruefung, p.instrument]);
    expect(json).not.toContain('Amira Klein');
    expect(json).toContain('[Person 1]');
  });
});

describe('A2 Methodenanhang mit Mixed Methods', () => {
  it('Design, Verknüpfung, Joint Displays (ohne Belegtext), Selbstprüfung; docx-pruefen grün', async () => {
    const { methodenanhangWord } = await import('./nachvollziehbarkeit');
    const { pruefeDocx } = await import('../../../scripts/docx-pruefen.mjs');
    const { strFromU8, unzipSync } = await import('fflate');
    let q = verknuepft();
    q = setzeDesign(q, d => ({ ...d, reihenfolge: 'quan-zuerst', gewicht: 'quan', zwecke: ['ergaenzung'], integration: ['verbinden'] }));
    const t = q.themen![0]!;
    const { q: q2, id } = legeJdAn(q, 'qual-nach-gruppen', 'Themen nach Erstperson');
    q = aendereJd(q2, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId(q2, 'first_generation') }, zeilen: [{ art: 'thema', id: t.id }] }));
    const kand = jdAufbau(q, q.jointDisplays![0]!).zeilen[0]!.zellen[0]!.kandidaten!;
    q = setzeBeleg(q, id, `thema:${t.id}`, jdAufbau(q, q.jointDisplays![0]!).kopf[0]!.schluessel, kand[0]!);
    q = setzeJdPassung(q, id, `thema:${t.id}`, 'widerspruch');
    q = setzeJdMeta(q, id, `thema:${t.id}`, 'Erstpersonen sprechen öfter von Scham.');
    q = setzePunkt(q, 'mmat', 'mmat-5-4', { stand: 'unklar', fundstelle: 'Kapitel 5' });
    const b = await methodenanhangWord(q, 'de');
    expect(pruefeDocx(b)).toEqual([]);
    const x = strFromU8(unzipSync(b)['word/document.xml']!);
    for (const s of ['Mixed Methods', 'QUAN → qual', 'explanatory sequential design', 'Vertiefungsdesign', 'survey_id', 'Themen nach Erstperson', 'Erstpersonen sprechen öfter von Scham.', 'Kann ich nicht sagen', 'Kapitel 5', 'ohne Gesamtnote']) expect(x, s).toContain(s);
    const belegText = q.segmente.find(s => s.id === kand[0])!;
    const dok = q.dokumente.find(d => d.id === belegText.dokument)!;
    expect(x).not.toContain([...dok.text].slice(belegText.start, belegText.ende).join('').slice(0, 30));
  });
});
