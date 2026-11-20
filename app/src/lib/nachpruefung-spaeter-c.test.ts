import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseCsv, zurEngine } from './einlesen';
import { neuAufbauen } from './eingabe';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import type { Daten } from './umformen';
import { zit } from './befehlstext';
import { liesSpssSyntax } from './spsssyntax';
import { kodebuchAusSyntax, wendeKodebuchAn, fehlendBereichText } from './kodebuch';
import { erkenneFragebogen, textRecodeBefehl, ordneTextZu, bekannteSkala } from './fragebogen';
import { FragebogenImport } from './fragebogenimport.svelte';
import { rangBefehl } from './rangbildung';
import { fehlendcodesBefehl, zaehlenBefehl } from './datenassistentc';
import { liesQda } from './qdaimport';
import { gewichtIds, gewichtStatus } from './gewichte';
import { ASSISTENTEN } from './datenassistenten';
import { s } from './sitzung.svelte';

/* ===== Später S-C, Nachprüfung (Fachprüfung + Haiku): Befunde 1 bis 13, eigene Tests ===== */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
const fehler = (items: any[]) => items.filter(i => i.type === 'message' && i.severity === 'error').map(i => i.text);
function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); expect(fehler(m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }))).toEqual([]); }
function spalte(name: string): (number | null)[] {
  m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const z = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), j = z[0]!.map(x => x.toLowerCase()).indexOf(name.toLowerCase());
  expect(j, `Spalte ${name}`).toBeGreaterThanOrEqual(0);
  return z.slice(1).map(r => (r[j]!.trim() === '' ? null : Number(r[j])));
}
const csvDatei = (t: string, name = 'x.csv') => new File([t], name, { type: 'text/csv' });

describe('Befund 2 (Sicherheit): Text aus Dateien schleust keinen Befehl ein', () => {
  const boese = "x'\n. DELETE VARIABLES ALL.\n'";
  it('zit: eine Zeile, Apostrophe verdoppelt, Steuerzeichen weg, Länge begrenzt', () => {
    const z = zit(boese); expect(z).not.toMatch(/[\n\r\t]/); expect(z.startsWith("'") && z.endsWith("'")).toBe(true);
    expect(zit('a\tb c\u0007d')).toBe("'a b c d'"); expect(zit("it's")).toBe("'it''s'"); expect(zit('x'.repeat(400), 100).length).toBe(102); expect(zit("'".repeat(400), 50)).toBe("'" + "''".repeat(50) + "'");
  });
  it('in der Engine: ein Beschriftungstext mit „. DELETE VARIABLES ALL.“ löscht nichts (Kodebuch: Variablenlabel und Wertelabel einer Textspalte)', () => {
    const d: Daten = { spalten: [sp('a'), sp('t', { art: 'text', format: 'A5', niveau: 'nominal' })], zeilen: [[1, 'ja'], [2, 'nein']] } as Daten; lade(d);
    const kb = kodebuchAusSyntax(liesSpssSyntax(''), 'sosci'); kb.spalten.a = { label: boese, werteLabels: { '1': boese } }; kb.spalten.t = { werteLabels: { ja: boese } };
    const r = wendeKodebuchAn(d, kb, { labels: true, wertelabels: true });
    for (const b of r.befehle) expect(b.split('\n').length, b).toBe(1);
    expect(fehler(m.run(r.befehle.join('\n')))).toEqual([]);
    const sps = leseVerzeichnis(m.run('DISPLAY DICTIONARY.')); expect(sps.map(x => x.name)).toEqual(['a', 't']); expect(sps[0]!.bezeichnung).toContain('DELETE VARIABLES ALL');
    expect(fehler(m.run(r.rueckgaengig.join('\n')))).toEqual([]); expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).length).toBe(2);
  });
  it('textRecodeBefehl mit einem bösen Text in den Daten bleibt ein Befehl je Zeile und löscht nichts', () => {
    const t = leseCsv('q\n"a\'\n. DELETE VARIABLES ALL.\n\'"\nb\n', 'e.csv'); const z = zurEngine(t); m.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv });
    const roh = [t.zeilen[0]![0] as string, 'b'], b = textRecodeBefehl('q', 'q_zahl', [roh[0]!, roh[1]!], roh);
    for (const x of b.split('\n')) expect(x).not.toMatch(/^\s*\.\s*DELETE/); expect(fehler(m.run(b))).toEqual([]); expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).map(x => x.name)).toEqual(['q', 'q_zahl']);
  });
  it('spsssyntax: ein zweiter Befehl in derselben Zeile wird gelesen und gemeldet, nicht verschluckt', () => {
    const r = liesSpssSyntax("VARIABLE LABELS a 'x'. DELETE VARIABLES ALL.\nVALUE LABELS a 1 'u'. HOST COMMAND=['y'].");
    expect(r.variablenlabels).toEqual({ a: 'x' }); expect(r.wertelabels).toEqual({ a: { '1': 'u' } }); expect(r.ignoriert.map(x => [x.befehl, x.zeile])).toEqual([['DELETE VARIABLES', 1], ['HOST', 2]]);
    expect(liesSpssSyntax("VARIABLE LABELS a 'Punkt. Und weiter. HOST x'.").ignoriert).toEqual([]);   // in der Zeichenkette gilt nichts
    expect(liesSpssSyntax('* z. B. ein Kommentar.').ignoriert).toEqual([]); expect(liesSpssSyntax('* Kommentar. HOST COMMAND=[x].').ignoriert.map(x => x.befehl)).toEqual(['HOST']);
  });
});

describe('Befund 1: Text in Zahlen - alle Schreibweisen, nie still fehlend', () => {
  it('„Stimme zu“ gehört zur Stufe 4 (Stimme eher zu), „Stimme nicht zu“ zur Stufe 2', () => {
    const stufen = bekannteSkala(['Stimme zu', 'Stimme gar nicht zu'])!; expect(stufen[3]).toBe('Stimme eher zu');
    const z = ordneTextZu(stufen, ['Stimme zu', 'Stimme nicht zu', 'stimme VOLL zu', 'Stimme voll und ganz zu']);
    expect(Object.fromEntries(z.regeln)).toMatchObject({ 'Stimme zu': 4, 'Stimme nicht zu': 2, 'stimme VOLL zu': 5, 'Stimme voll und ganz zu': 5 }); expect(z.offen).toEqual([]);
  });
  it('in der Engine: 18 Antworten, keine wird still fehlend', () => {
    const w = ['Stimme gar nicht zu', 'Stimme eher nicht zu', 'Teils/teils', 'Stimme eher zu', 'Stimme zu', 'Stimme voll zu', 'Stimme zu'];
    const t = leseCsv('q\n' + w.join('\n') + '\n', 'e.csv'), z = zurEngine(t); m.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv });
    const stufen = bekannteSkala(w)!, b = textRecodeBefehl('q', 'q_zahl', stufen, w); expect(fehler(m.run(b))).toEqual([]);
    expect(spalte('q_zahl')).toEqual([1, 2, 3, 4, 4, 5, 4]);
  });
  it('ein Text ohne Stufe: Fehler `offeneTexte` statt still fehlend; mit Entscheidung der Person (Stufe oder bewusst leer) geht es', () => {
    const stufen = ['nie', 'selten', 'oft'];
    expect(ordneTextZu(stufen, ['nie', 'weiß nicht']).offen).toEqual(['weiß nicht']);
    expect(() => textRecodeBefehl('q', 'z', stufen, ['nie', 'weiß nicht'])).toThrow(/offeneTexte/);
    expect(textRecodeBefehl('q', 'z', stufen, ['weiß nicht'], { 'weiß nicht': null })).toContain("('weiß nicht'=SYSMIS)");
    expect(textRecodeBefehl('q', 'z', stufen, ['weiß nicht'], { 'weiß nicht': 2 })).toContain("('weiß nicht'=2)");
    // „als fehlend markieren“ geht auch für einen Text, der zu einer Stufe passen würde (die Entscheidung der Person geht vor)
    expect(textRecodeBefehl('q', 'z', stufen, ['oft', 'nie'], { oft: null })).toContain("('oft'=SYSMIS)");
    expect(ordneTextZu(stufen, ['oft']).regeln).toContainEqual(['oft', 3]);
  });
});

describe('Befunde 3 bis 5 und 8: Voreinstellungen des Import-Dialogs (nichts Zweifelhaftes vorangekreuzt)', () => {
  const sosciKopf = 'CASE;SERIAL;REF;QUESTNNR;MODE;STARTED;A001;A002_01;A002_02;A002_03;A003;TIME_SUM;TIME_RSI;MISSING;FINISHED';
  const zeile = (nr: number, a1: number, m1: number, m2: number, m3: number) => `${nr};;;"s";"interview";"2024-05-13 10:00:00";${a1};${m1};${m2};${m3};"ok";50;1.0;0;1`;
  it('Befund 3: SoSci-Block mit nur 1 und 2 wird vorgeschlagen, aber NICHT vorangekreuzt; mit Kodebuch („nicht gewählt/gewählt“) ja', async () => {
    const text = [sosciKopf, zeile(1, 4, 1, 2, 1), zeile(2, 5, 2, 1, 1), zeile(3, 3, 1, 1, 2), zeile(4, 2, 2, 2, 1)].join('\n') + '\n';
    const f = new FragebogenImport(); expect((await f.pruefe(csvDatei(text))).offen).toBe(true);
    const set = f.erk!.vorschlaege.find(v => v.art === 'mehrfachset')!; expect(set).toMatchObject({ quelle: 'hersteller' }); expect(f.wahl.haken[set.id]).toBe(false);
    const sps = "VALUE LABELS A002_01 A002_02 A002_03 1 'nicht gewählt' 2 'gewählt'.";
    f.kb = null; const erk = erkenneFragebogen(f.tabelle!, kodebuchAusSyntax(liesSpssSyntax(sps), 'sosci')); expect(erk.vorschlaege.find(v => v.art === 'mehrfachset')).toMatchObject({ quelle: 'kodebuch' });
  });
  it('Befund 4: die Beschriftungszeile von SoSci (zweite Zeile mit Fragetexten) ist keine Antwort - 6 Antworten, -9-Hinweis, Set, Beschriftung', () => {
    const label = 'Interview-Nummer;Serie;Ref;Fragebogen;Modus;Start;Wie zufrieden?;Fernsehen;Radio;Internet;Was fehlt?;Zeit;RSI;Fehlend;Beendet';
    const text = [sosciKopf, label, zeile(1, 4, 1, 2, 1), zeile(2, 5, 2, 1, 1), zeile(3, -9, 1, 1, 2), zeile(4, 3, 2, 2, 1), zeile(5, 2, 1, 1, 1), zeile(6, 4, 2, 1, 2)].join('\n') + '\n';
    const e = erkenneFragebogen(leseCsv(text, 'x.csv')); expect(e.kopfzeilen).toBe(2); expect(e.tabelle.zeilen.length).toBe(6); expect(e.beschriftungen.A001).toBe('Wie zufrieden?');
    expect(e.vorschlaege.find(v => v.art === 'fehlend')).toMatchObject({ spalte: 'A001', codes: [-9] }); expect(e.vorschlaege.some(v => v.art === 'mehrfachset')).toBe(true);
    // ohne Beschriftungszeile bleibt alles beim Alten
    expect(erkenneFragebogen(leseCsv([sosciKopf, zeile(1, 4, 1, 2, 1), zeile(2, 5, 2, 1, 1), zeile(3, 3, 1, 1, 2)].join('\n') + '\n', 'y.csv')).kopfzeilen).toBe(1);
  });
  it('Befund 5: Unipark - die 0 ist in einer 0/1-Spalte ein gültiger Wert (nur -77 vorgeschlagen); in der 1-bis-5-Skala wird sie vorgeschlagen, aber nicht vorangekreuzt', async () => {
    const text = 'lfdn;tid;dispcode;v_1;v_2\n1;"a";31;4;1\n2;"b";31;-77;-77\n3;"c";31;0;1\n4;"d";31;5;1\n5;"e";31;3;0\n6;"f";31;2;1\n';
    const f = new FragebogenImport(); expect((await f.pruefe(csvDatei(text, 'u.csv'))).offen).toBe(true);
    const fe = f.erk!.vorschlaege.filter((v): v is any => v.art === 'fehlend'), v1 = fe.find(v => v.spalte === 'v_1'), v2 = fe.find(v => v.spalte === 'v_2');
    expect(v1.codes).toEqual([-77, 0]); expect(f.wahl.haken[v1.id]).toBe(false); expect(v2.codes).toEqual([-77]); expect(f.wahl.haken[v2.id]).toBe(true);
    const nur01 = erkenneFragebogen(leseCsv('lfdn;tid;dispcode;v_2\n1;"a";31;1\n2;"b";31;-77\n3;"c";31;0\n4;"d";31;1\n5;"e";31;0\n', 'u.csv')).vorschlaege.find((v): v is any => v.art === 'fehlend'); expect(nur01.codes).toEqual([-77]);
  });
  it('Befund 8: die Summen weglassen ist in QdaDialog nicht vorangekreuzt (Voreinstellung aus)', async () => {
    const { readFileSync } = await import('node:fs'); const q = readFileSync(new URL('../bausteine/QdaDialog.svelte', import.meta.url), 'utf8'); expect(q).toMatch(/let summenWeg = \$state\(false\)/);
  });
});

describe('Befund 6: Rang BY Gruppe - Fälle ohne Gruppe bleiben leer', () => {
  it('numerische Gruppe mit leerer Zelle und „keine Angabe“, und eine Textgruppe mit leerer Zelle', () => {
    const d: Daten = { spalten: [sp('x'), sp('g', { niveau: 'nominal', fehlend: [-9] })], zeilen: [[5, 1], [3, 1], [7, null], [2, -9], [9, 2], [1, 2]] } as Daten; lade(d);
    expect(fehler(m.run(rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r', gruppe: 'g' }).syntax))).toEqual([]); expect(spalte('r')).toEqual([2, 1, null, null, 2, 1]);
    const t: Daten = { spalten: [sp('x'), sp('g', { art: 'text', format: 'A3', niveau: 'nominal' })], zeilen: [[5, 'a'], [3, 'a'], [7, null], [2, 'b']] } as Daten; lade(t);
    expect(fehler(m.run(rangBefehl(t, { art: 'rang', spalte: 'x', ziel: 'r', gruppe: 'g' }).syntax))).toEqual([]); expect(spalte('r')).toEqual([2, 1, null, 1]);
  });
});

describe('Befund 7: -9, -1, -77 und 99 - ein Bereich plus ein Einzelwert', () => {
  it('`-77 THRU -1, 99`, wenn der Bereich nichts Gültiges einfängt; sonst weiter die Meldung zuVieleCodes', () => {
    const werte = [1, 2, 3, 4, 5, -9, -1, -77, 99, 3];
    expect(fehlendBereichText([-9, -1, -77, 99], werte)!.text).toBe('-77 THRU -1, 99');
    const d: Daten = { spalten: [sp('q')], zeilen: werte.map(v => [v]) } as Daten, b = fehlendcodesBefehl(d, { spalten: ['q'], codes: [-9, -1, -77, 99] });
    expect(b.syntax).toBe('MISSING VALUES q (-77 THRU -1, 99).'); lade(d); expect(fehler(m.run(b.syntax))).toEqual([]);
    expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.'))[0]!.fehlendText).toMatch(/-77 THRU -1/);
    expect(fehlendBereichText([-9, -1, -77, 99], [...werte, -5])).toBeNull();
  });
});

describe('Befunde 9, 10, 12', () => {
  it('Befund 9: Prozente in ganzen Zahlen (jede Spalte 100) bekommen einen Hinweis', () => {
    const e = liesQda({ kopf: ['Code', 'D1', 'D2'], zeilen: [['A', 50, 25], ['B', 50, 75]], quelle: 'x.xlsx' });
    expect(e.relativ).toBe(false); expect(e.hinweise.map(h => h.art)).toContain('moeglichProzent');
    expect(liesQda({ kopf: ['Code', 'D1', 'D2'], zeilen: [['A', 3, 1], ['B', 1, 2]], quelle: 'x.xlsx' }).hinweise.map(h => h.art)).not.toContain('moeglichProzent');
    // gerundete Prozente: 33/33/33 (Summe 99) und 34/33/33 (100); mit Komma (99,7) ebenfalls; 90 nicht
    const dritt = (a: number, b: number, c: number, d: number, e2: number, f: number) => liesQda({ kopf: ['Code', 'D1', 'D2'], zeilen: [['A', a, d], ['B', b, e2], ['C', c, f]], quelle: 'x.xlsx' }).hinweise.map(h => h.art);
    expect(dritt(33, 33, 33, 33, 33, 33)).toContain('moeglichProzent'); expect(dritt(34, 33, 33, 34, 33, 33)).toContain('moeglichProzent'); expect(dritt(33.3, 33.3, 33.1, 33.3, 33.3, 33.1)).toContain('moeglichProzent');
    expect(dritt(30, 30, 30, 30, 30, 30)).not.toContain('moeglichProzent');
  });
  it('Befund 10: Mehrzahl über Lp - „1 Spalte“', () => {
    const d: Daten = { spalten: [sp('q1'), sp('q2')], zeilen: [[1, 2]] } as Daten;
    expect(zaehlenBefehl(d, { spalten: ['q1'], ziel: 'n', zaehle: [{ wert: 1 }] }).bezeichnung).toBe('Anzahl Treffer in 1 Spalte');
    expect(zaehlenBefehl(d, { spalten: ['q1', 'q2'], ziel: 'n', zaehle: [{ wert: 1 }] }).bezeichnung).toBe('Anzahl Treffer in 2 Spalten');
  });
  it('Befund 12: jeder neue Assistent hat einen Schlüssel in der Sperrtabelle; auffällige Fälle ignorieren das Gewicht (Hinweis)', () => {
    for (const id of ['zaehlen', 'fehlendcodes', 'sortieren', 'rang', 'datum', 'auffaellig']) { expect(ASSISTENTEN.map(a => a.id)).toContain(id); expect(gewichtIds()).toContain(`assistent:${id}`); }
    expect(gewichtStatus('assistent:auffaellig', 'haeufigkeit')).toBe('hinweis'); expect(gewichtStatus('assistent:auffaellig', 'umfrage')).toBe('hinweis');
  });
});
