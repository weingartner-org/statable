/**
 * Paket 2A (Plan-Kern), rote Tests vom Prüfer. Die Funktionen unten gibt es noch nicht; die Tests laden sie dynamisch und sind darum rot, nicht kaputt.
 *
 * ===== Festlegungen für den Bauer (Datei `fragebogenplan.ts` oder aufgeteilt, Export aus `./fragebogenplan`) =====
 *
 * planPruefen(plan: FragebogenPlan): PlanBefund[]
 *   PlanBefund = { art: 'fehler' | 'hinweis'; regel: string; element?: string; text: string }
 *   `element` = id des betroffenen Elements (Seite, Frage, Block, Hinweis); bei `option-text` die id der Option, bei `item-text` die id des Block-Items,
 *   bei `name-*` die id des Elements, dessen Name beanstandet wird. `text` ist ein nicht leerer deutscher Satz.
 *   Ein gültiger Plan ergibt []. Regel-Kennungen:
 *     Fehler:  name-ungueltig    Name passt nicht zu ^[A-Za-z][A-Za-z0-9_]{0,31}$ (Seite, Frage, Block, Block-Item, Antwortliste zählen, sofern sie einen Variablennamen ergeben: Frage, Block, Block-Item)
 *              name-schluessel   Name ist PSPP-Schlüsselwort (ALL AND BY EQ GE GT LE LT NE NOT OR TO WITH, ohne Groß/klein), sonst gültig
 *              name-doppelt      zwei Namen sind ohne Unterschied von Groß/klein gleich (je Paar ein Befund, am späteren Element)
 *              name-zusammenstoss  ein abgeleiteter Variablenname (variablenAusPlan: q1_2, block_item, name_anders, name_kommentar bei pretest) stößt mit einem anderen Namen zusammen
 *              verweis-vorn      Bedingung (wennGezeigt oder gueltig.regel) verweist auf eine Frage, die in der Plan-Reihenfolge NACH dem Element kommt (oder es selbst ist)
 *              kreis             Bedingungen verweisen im Kreis (A auf B, B auf A; auch A auf A). Kommt zusätzlich zu verweis-vorn (siehe Unklarheiten)
 *              sprache-fehlt     ein Lok (Plan-Titel, Fragetext, Blocktext, Seitentitel falls gesetzt, Hinweistext) hat für eine Sprache in plan.sprachen keinen oder nur leeren Text
 *              bild-alt          Bild (Frage, Hinweis) ohne nicht leeren Alternativtext in jeder Sprache; gilt auch für Option.bild
 *              option-text       Option ohne Text in einer Sprache
 *              item-text         Block-Item ohne Text in einer Sprache
 *              regler-grenzen    Frage typ 'regler' ohne zahl.min oder ohne zahl.max (oder ohne `zahl`)
 *     Hinweise: block-items      Block mit mehr als 7 Items (genau 7 löst nicht aus)
 *              block-stufen      Block, dessen Antwortliste mehr als 7 Optionen hat (Optionen mit `fehlend` zählen NICHT mit; genau 7 löst nicht aus)
 *              hilfe-lang        hilfe (in irgendeiner Sprache) länger als 300 Zeichen (genau 300 löst nicht aus)
 *              rangfolge-lang    Frage typ 'rangfolge' mit mehr als 7 Optionen (genau 7 löst nicht aus)
 *
 * zeigen(element: Element | Seite, antworten: Antworten, plan?: FragebogenPlan): boolean
 *   Antworten = Record<string /* Frage-id *\/, number | number[] | string | null | undefined>   (einfach/zahl: Zahl; mehrfach: Liste der angekreuzten Codes; text: Text)
 *   Ohne `wennGezeigt` immer true. Vergleich (=, ≠, <, ≤, >, ≥) mit fehlender Antwort (undefined, null, leere Liste, leerer Text) ist FALSCH (auch ≠).
 *   `gewaehlt` ist wahr, wenn der Code in der Liste steht; fehlend = falsch. `beantwortet: true` = Antwort vorhanden (nicht undefined/null/''/[]), `false` = nicht vorhanden.
 *   nicht/und/oder nach der Logik. KASKADE: nur mit `plan`: Ist die verwiesene Frage selbst verborgen (ihr wennGezeigt ist falsch, rekursiv), gilt sie als unbeantwortet,
 *   auch wenn in `antworten` noch ein alter Wert steht. Ohne `plan` wird nicht kaskadiert (nur die direkte Bedingung).
 *
 * unerreichbar(plan: FragebogenPlan): string[]
 *   ids der Elemente (Seite, Frage, Block, Hinweis), deren wennGezeigt nie wahr werden kann. Genau die drei Fälle des Fachblatts 2A:
 *   (1) `und` mit Vergleichen auf dieselbe Frage, deren Wertebereich leer ist; (2) `gewaehlt` mit Code, der nicht in der Antwortliste der Frage steht;
 *   (3) Verweis auf eine Frage, die selbst unerreichbar ist (ergibt auch das Element unerreichbar). `oder` ist nur unerreichbar, wenn ALLE Zweige es sind;
 *   `nicht`: nicht untersucht (nie unerreichbar gemeldet). Reihenfolge der Ausgabe = Plan-Reihenfolge, keine Doppelten.
 *
 * namensVorschlag(text: string, vergeben: string[]): string
 *   Erste zwei Wörter des Fragetexts (Trennung an allem außer Buchstaben/Ziffern), klein, Umlaute ä→ae ö→oe ü→ue ß→ss (Großbuchstaben ebenso), nur [a-z0-9],
 *   mit `_` verbunden ("Wie zufrieden sind Sie?" → "wie_zufrieden"). Beginnt das Ergebnis nicht mit einem Buchstaben: `f` voranstellen. Leer: "frage".
 *   Auf 32 Zeichen gekürzt (die Nummer mitgerechnet). Ist der Name (ohne Groß/klein) in `vergeben` oder ein PSPP-Schlüsselwort: Nummer ohne Unterstrich anhängen,
 *   ab 2 ("wie_zufrieden2", "wie_zufrieden3" …). Ergebnis besteht immer planNameOk.
 *
 * Unklarheiten in den Blättern: siehe Bericht des Prüfers (u. a. Kreis ohne Vorwärtsverweis ist unmöglich; Verhalten in verborgener Seite nicht festgelegt).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { planNameOk, type Antwortliste, type Bedingung, type Block, type Element, type Frage, type FragebogenPlan, type Lok, type Seite } from './fragebogenplan';

interface PlanBefund { art: 'fehler' | 'hinweis'; regel: string; element?: string; text: string }
type Antworten = Record<string, number | number[] | string | null | undefined>;
interface Neu {
  planPruefen?: (p: FragebogenPlan) => PlanBefund[];
  zeigen?: (e: Element | Seite, a: Antworten, p?: FragebogenPlan) => boolean;
  unerreichbar?: (p: FragebogenPlan) => string[];
  namensVorschlag?: (t: string, vergeben: string[]) => string;
}
let neu: Neu = {};
beforeAll(async () => { neu = await import('./fragebogenplan').catch(() => ({})) as Neu; });
function fn<K extends keyof Neu>(k: K): NonNullable<Neu[K]> {
  const f = neu[k]; if (typeof f !== 'function') throw new Error(`${k} fehlt noch (Paket 2A)`);
  return f as NonNullable<Neu[K]>;
}
const pruefen = (p: FragebogenPlan) => fn('planPruefen')(p);

/* ------------------------------------------------------------------ Bausteine */
const de = (t: string): Lok => ({ de: t });
const zw = (t: string): Lok => ({ de: t, en: t + ' (en)' });
const liste = (id: string, n: number, geordnet = true): Antwortliste => ({ id, name: id, geordnet, optionen: Array.from({ length: n }, (_, i) => ({ id: `${id}:${i + 1}`, wert: i + 1, text: zw(`Stufe ${i + 1}`) })) });
const frage = (id: string, name: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name, typ: 'einfach', text: zw(`Text ${name}`), liste: 'l5', kodebuch: { niveau: 'ordinal' }, ...extra });
const zahl = (id: string, name: string, extra: Partial<Frage> = {}): Frage => frage(id, name, { typ: 'zahl', liste: undefined, zahl: { min: 0, max: 120, ganz: true }, kodebuch: { niveau: 'skala' }, ...extra });
const plan = (elemente: Element[], extra: Partial<FragebogenPlan> = {}, listen: Antwortliste[] = [liste('l5', 5)]): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('Test'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: listen, skalen: [], elemente: [{ art: 'seite', id: 's1', name: 'seite1', elemente }], geaendert: 1, ...extra
});
const eins = (e: Element[], extra?: Partial<FragebogenPlan>, listen?: Antwortliste[]) => plan(e, extra, listen);
const regeln = (b: PlanBefund[]) => b.map(x => x.regel);
const mit = (b: PlanBefund[], r: string) => b.filter(x => x.regel === r);
const block = (id: string, name: string, n: number, extra: Partial<Block> = {}): Block => ({ art: 'block', id, name, text: zw('Block'), liste: 'l5', kodebuch: { niveau: 'ordinal' },
  items: Array.from({ length: n }, (_, i) => ({ id: `${id}i${i + 1}`, name: `i${i + 1}`, text: zw(`Item ${i + 1}`) })), ...extra });

const GUT = () => eins([frage('q1', 'zufriedenheit'), zahl('q2', 'alter')]);

describe('planPruefen: Grundlage', () => {
  it('ein gültiger Plan ergibt keinen Befund', () => { expect(pruefen(GUT())).toEqual([]); });
  it('jeder Befund hat art, regel und einen Text', () => {
    const b = pruefen(eins([frage('q1', '1x')]));
    expect(b.length).toBeGreaterThan(0);
    for (const x of b) { expect(['fehler', 'hinweis']).toContain(x.art); expect(x.regel).toMatch(/^[a-z-]+$/); expect(x.text.length).toBeGreaterThan(5); }
  });
});

describe('planPruefen: Namen (Architekturblatt 5.2)', () => {
  it('name-ungueltig löst aus: Ziffer vorn, Leerzeichen, Umlaut, über 32 Zeichen', () => {
    for (const n of ['1alter', 'mein alter', 'größe', 'a'.repeat(33), '_x', '']) {
      const b = mit(pruefen(eins([frage('q1', n)])), 'name-ungueltig');
      expect(b.length, `Name „${n}“`).toBe(1);
      expect(b[0]!.art).toBe('fehler'); expect(b[0]!.element).toBe('q1');
    }
  });
  it('name-ungueltig löst nicht aus: gültige Namen, auch genau 32 Zeichen und Unterstrich innen', () => {
    for (const n of ['alter', 'A1', 'a_b_c', 'a'.repeat(32)]) expect(regeln(pruefen(eins([frage('q1', n)]))).includes('name-ungueltig'), n).toBe(false);
  });
  it('name-ungueltig gilt auch für Block und Block-Item', () => {
    expect(mit(pruefen(eins([block('b1', 'mein block', 3)])), 'name-ungueltig').map(x => x.element)).toEqual(['b1']);
    const b = block('b1', 'skala', 3); b.items[1]!.name = '2. Zeile';
    expect(mit(pruefen(eins([b])), 'name-ungueltig').map(x => x.element)).toEqual(['b1i2']);
  });
  it('name-schluessel löst aus (auch klein geschrieben) und ist nicht zugleich name-ungueltig', () => {
    for (const n of ['TO', 'and', 'With', 'not']) {
      const b = pruefen(eins([frage('q1', n)]));
      expect(mit(b, 'name-schluessel').length, n).toBe(1);
      expect(mit(b, 'name-ungueltig').length, n).toBe(0);
    }
  });
  it('name-schluessel löst nicht aus: Namen, die nur mit einem Schlüsselwort beginnen', () => {
    for (const n of ['total', 'andere', 'to_do', 'notiz']) expect(regeln(pruefen(eins([frage('q1', n)]))).includes('name-schluessel'), n).toBe(false);
  });
  it('name-doppelt löst aus, auch bei anderer Groß-/Kleinschreibung', () => {
    const b = mit(pruefen(eins([frage('q1', 'Alter'), frage('q2', 'alter')])), 'name-doppelt');
    expect(b.length).toBe(1); expect(b[0]!.art).toBe('fehler'); expect(b[0]!.element).toBe('q2');
  });
  it('name-doppelt löst nicht aus: verschiedene Namen', () => {
    expect(regeln(pruefen(eins([frage('q1', 'alter'), frage('q2', 'alter2')]))).includes('name-doppelt')).toBe(false);
  });
  it('name-doppelt: Name eines Block-Items und einer Frage zählt über den abgeleiteten Namen (block_i1 gegen Frage block_i1) als Zusammenstoß, nicht als Doppelt', () => {
    const b = pruefen(eins([block('b1', 'block', 2), frage('q1', 'block_i1')]));
    expect(mit(b, 'name-zusammenstoss').length).toBe(1);
  });
  it('name-zusammenstoss löst aus: Mehrfachfrage q1 (Option 2) gegen Frage q1_2', () => {
    const p = eins([frage('q1', 'q1', { typ: 'mehrfach', kodebuch: { niveau: 'nominal' } }), frage('q2', 'q1_2')]);
    const b = pruefen(p);
    expect(mit(b, 'name-zusammenstoss').length).toBeGreaterThanOrEqual(1);
    expect(mit(b, 'name-zusammenstoss')[0]!.art).toBe('fehler');
    expect(mit(b, 'name-doppelt').length).toBe(0);   // die Namen selbst sind verschieden
  });
  it('name-zusammenstoss löst aus: bei Pretest stößt `frage_kommentar` mit einer Frage `frage_kommentar` zusammen', () => {
    const p = eins([frage('q1', 'frage'), frage('q2', 'frage_kommentar')], { einstellungen: { fortschritt: true, zurueck: true, pretest: true, fehlendFilter: 'code' } });
    expect(mit(pruefen(p), 'name-zusammenstoss').length).toBeGreaterThanOrEqual(1);
  });
  it('name-zusammenstoss löst nicht aus: Mehrfachfrage q1 und Frage q2; ohne Pretest ist `x_kommentar` frei', () => {
    expect(mit(pruefen(eins([frage('q1', 'q1', { typ: 'mehrfach', kodebuch: { niveau: 'nominal' } }), frage('q2', 'q2')])), 'name-zusammenstoss')).toEqual([]);
    expect(mit(pruefen(eins([frage('q1', 'frage'), frage('q2', 'frage_kommentar')])), 'name-zusammenstoss')).toEqual([]);
  });
});

describe('planPruefen: Verweise (Architekturblatt 4)', () => {
  const nach = (id: string): Bedingung => ({ frage: id, ist: '=', wert: 1 });
  it('verweis-vorn löst aus: Frage 1 verweist auf Frage 2', () => {
    const b = mit(pruefen(eins([frage('q1', 'a', { wennGezeigt: nach('q2') }), frage('q2', 'b')])), 'verweis-vorn');
    expect(b.length).toBe(1); expect(b[0]!.art).toBe('fehler'); expect(b[0]!.element).toBe('q1');
  });
  it('verweis-vorn löst aus: Verweis auf sich selbst und tief in und/nicht verschachtelt; in gueltig.regel', () => {
    expect(mit(pruefen(eins([frage('q1', 'a', { wennGezeigt: nach('q1') })])), 'verweis-vorn').length).toBe(1);
    expect(mit(pruefen(eins([frage('q1', 'a', { wennGezeigt: { und: [{ nicht: { oder: [nach('q2')] } }] } }), frage('q2', 'b')])), 'verweis-vorn').length).toBe(1);
    expect(mit(pruefen(eins([zahl('q1', 'a', { gueltig: { regel: nach('q2'), meldung: de('x') } }), zahl('q2', 'b')])), 'verweis-vorn').length).toBe(1);
  });
  it('verweis-vorn löst nicht aus: Verweis nach hinten, auch über Seiten hinweg', () => {
    const p = eins([frage('q1', 'a')]);
    p.elemente.push({ art: 'seite', id: 's2', name: 'seite2', elemente: [frage('q2', 'b', { wennGezeigt: nach('q1') })] });
    expect(regeln(pruefen(p)).includes('verweis-vorn')).toBe(false);
  });
  it('kreis löst aus: A verweist auf B und B auf A', () => {
    const b = pruefen(eins([frage('q1', 'a', { wennGezeigt: nach('q2') }), frage('q2', 'b', { wennGezeigt: nach('q1') })]));
    expect(mit(b, 'kreis').length).toBeGreaterThanOrEqual(1); expect(mit(b, 'kreis')[0]!.art).toBe('fehler');
  });
  it('kreis löst nicht aus: Kette A ← B ← C ohne Rückverweis', () => {
    expect(regeln(pruefen(eins([frage('q1', 'a'), frage('q2', 'b', { wennGezeigt: nach('q1') }), frage('q3', 'c', { wennGezeigt: nach('q2') })]))).includes('kreis')).toBe(false);
  });
});

describe('planPruefen: Barrierefreiheit und Sprachen (Architekturblatt 7)', () => {
  it('sprache-fehlt löst aus: Fragetext ohne en, mit leerem en, Plantitel, Seitentitel, Blocktext', () => {
    expect(mit(pruefen(eins([frage('q1', 'a', { text: de('nur de') })])), 'sprache-fehlt')[0]).toMatchObject({ art: 'fehler', element: 'q1' });
    expect(mit(pruefen(eins([frage('q1', 'a', { text: { de: 'x', en: '  ' } })])), 'sprache-fehlt').length).toBe(1);
    expect(mit(pruefen(eins([frage('q1', 'a')], { titel: de('nur de') })), 'sprache-fehlt').length).toBe(1);
    const p = eins([frage('q1', 'a')]); p.elemente[0]!.titel = de('Seite');
    expect(mit(pruefen(p), 'sprache-fehlt')[0]!.element).toBe('s1');
    expect(mit(pruefen(eins([block('b1', 'blk', 2, { text: de('nur de') })])), 'sprache-fehlt')[0]!.element).toBe('b1');
  });
  it('sprache-fehlt löst nicht aus: einsprachiger Plan mit nur de; zweisprachig vollständig', () => {
    expect(regeln(pruefen(eins([frage('q1', 'a', { text: de('nur de') })], { titel: de('T'), sprachen: ['de'] }, [{ ...liste('l5', 5), optionen: liste('l5', 5).optionen.map(o => ({ ...o, text: de(o.id) })) }]))).includes('sprache-fehlt')).toBe(false);
    expect(regeln(pruefen(GUT())).includes('sprache-fehlt')).toBe(false);
  });
  it('bild-alt löst aus: Bild ohne Alternativtext in en, mit leerem Text; Bild an einer Option', () => {
    expect(mit(pruefen(eins([frage('q1', 'a', { bild: { datei: 'a.png', alt: de('Ein Diagramm') } })])), 'bild-alt')[0]).toMatchObject({ art: 'fehler', element: 'q1' });
    expect(mit(pruefen(eins([frage('q1', 'a', { bild: { datei: 'a.png', alt: { de: '', en: '' } } })])), 'bild-alt').length).toBe(1);
    const l = liste('l5', 5); l.optionen[0]!.bild = { datei: 'o.png', alt: {} };
    expect(mit(pruefen(eins([frage('q1', 'a')], {}, [l])), 'bild-alt').length).toBe(1);
    const hinweis: Element = { art: 'hinweis', id: 'h1', name: 'hin', text: zw('Achtung'), bild: { datei: 'h.png', alt: de('x') } };
    expect(mit(pruefen(eins([hinweis])), 'bild-alt')[0]!.element).toBe('h1');
  });
  it('bild-alt löst nicht aus: Bild mit Alternativtext in jeder Sprache', () => {
    expect(regeln(pruefen(eins([frage('q1', 'a', { bild: { datei: 'a.png', alt: zw('Ein Diagramm') } })]))).includes('bild-alt')).toBe(false);
  });
  it('option-text löst aus: Option ohne Text in en; Option mit leerem Text', () => {
    const l = liste('l5', 5); l.optionen[2]!.text = de('nur de');
    const b = mit(pruefen(eins([frage('q1', 'a')], {}, [l])), 'option-text');
    expect(b.length).toBe(1); expect(b[0]).toMatchObject({ art: 'fehler', element: 'l5:3' });
    const l2 = liste('l5', 5); l2.optionen[0]!.text = { de: '', en: '' };
    expect(mit(pruefen(eins([frage('q1', 'a')], {}, [l2])), 'option-text').length).toBe(1);
  });
  it('option-text löst nicht aus: alle Optionen mit Text in jeder Sprache', () => { expect(regeln(pruefen(GUT())).includes('option-text')).toBe(false); });
  it('item-text löst aus: Block-Item ohne Text in en; nicht aus: vollständig', () => {
    const b = block('b1', 'blk', 3); b.items[1]!.text = de('nur de');
    expect(mit(pruefen(eins([b])), 'item-text')[0]).toMatchObject({ art: 'fehler', element: 'b1i2' });
    expect(regeln(pruefen(eins([block('b1', 'blk', 3)]))).includes('item-text')).toBe(false);
  });
  it('regler-grenzen löst aus: ohne min, ohne max, ohne zahl; nicht aus: mit beiden', () => {
    const r = (id: string, z?: Frage['zahl']) => frage(id, 'r' + id, { typ: 'regler', liste: undefined, zahl: z, kodebuch: { niveau: 'skala' } });
    for (const z of [{ max: 10, ganz: true }, { min: 0, ganz: true }, undefined] as (Frage['zahl'])[]) {
      expect(mit(pruefen(eins([r('q1', z)])), 'regler-grenzen')[0], JSON.stringify(z)).toMatchObject({ art: 'fehler', element: 'q1' });
    }
    expect(regeln(pruefen(eins([r('q1', { min: 0, max: 10, ganz: true })]))).includes('regler-grenzen')).toBe(false);
    expect(regeln(pruefen(eins([r('q1', { min: 0, max: 0, ganz: true })]))).includes('regler-grenzen')).toBe(false);   // 0 ist eine Grenze
  });
});

describe('planPruefen: Hinweise (Export bleibt möglich)', () => {
  it('block-items: 8 Items lösen aus, 7 nicht', () => {
    expect(mit(pruefen(eins([block('b1', 'blk', 8)])), 'block-items')[0]).toMatchObject({ art: 'hinweis', element: 'b1' });
    expect(regeln(pruefen(eins([block('b1', 'blk', 7)]))).includes('block-items')).toBe(false);
  });
  it('block-stufen: Liste mit 8 Stufen lösen aus, 7 nicht; Fehlendcodes zählen nicht mit', () => {
    expect(mit(pruefen(eins([block('b1', 'blk', 3, { liste: 'l8' })], {}, [liste('l8', 8)])), 'block-stufen')[0]).toMatchObject({ art: 'hinweis', element: 'b1' });
    expect(regeln(pruefen(eins([block('b1', 'blk', 3, { liste: 'l7' })], {}, [liste('l7', 7)]))).includes('block-stufen')).toBe(false);
    const l = liste('l7', 7); l.optionen.push({ id: 'l7:m', wert: -8, text: zw('weiß nicht'), fehlend: 'weissNicht' }, { id: 'l7:k', wert: -9, text: zw('keine Angabe'), fehlend: 'keineAngabe' });
    expect(regeln(pruefen(eins([block('b1', 'blk', 3, { liste: 'l7' })], {}, [l]))).includes('block-stufen')).toBe(false);
  });
  it('hilfe-lang: 301 Zeichen lösen aus (Hinweis, Frage und Block), genau 300 nicht', () => {
    expect(mit(pruefen(eins([frage('q1', 'a', { hilfe: zw('x'.repeat(301)) })])), 'hilfe-lang')[0]).toMatchObject({ art: 'hinweis', element: 'q1' });
    expect(mit(pruefen(eins([block('b1', 'blk', 2, { hilfe: zw('x'.repeat(301)) })])), 'hilfe-lang')[0]!.element).toBe('b1');
    expect(regeln(pruefen(eins([frage('q1', 'a', { hilfe: { de: 'x'.repeat(300), en: 'y'.repeat(300) } })]))).includes('hilfe-lang')).toBe(false);
  });
  it('rangfolge-lang: 8 Optionen lösen aus, 7 nicht; andere Fragetypen mit 8 Optionen nicht', () => {
    const rang = (n: number) => eins([frage('q1', 'rang', { typ: 'rangfolge', liste: 'ln', kodebuch: { niveau: 'ordinal' } })], {}, [liste('ln', n, false)]);
    expect(mit(pruefen(rang(8)), 'rangfolge-lang')[0]).toMatchObject({ art: 'hinweis', element: 'q1' });
    expect(regeln(pruefen(rang(7))).includes('rangfolge-lang')).toBe(false);
    expect(regeln(pruefen(eins([frage('q1', 'a', { liste: 'ln' })], {}, [liste('ln', 8)]))).includes('rangfolge-lang')).toBe(false);
  });
});

/* ------------------------------------------------------------------ zeigen */
describe('zeigen: Bedingungen auswerten (Architekturblatt 4, Fachblatt 2A Punkt 2)', () => {
  const el = (w?: Bedingung) => frage('x', 'x', { wennGezeigt: w });
  const ja = (w: Bedingung, a: Antworten) => fn('zeigen')(el(w), a);
  it('ohne wennGezeigt immer gezeigt', () => { expect(fn('zeigen')(el(), {})).toBe(true); });
  it('alle sechs Vergleiche', () => {
    const a: Antworten = { q: 3 };
    const t = (ist: '=' | '≠' | '<' | '≤' | '>' | '≥', wert: number) => ja({ frage: 'q', ist, wert }, a);
    expect([t('=', 3), t('=', 4)]).toEqual([true, false]);
    expect([t('≠', 4), t('≠', 3)]).toEqual([true, false]);
    expect([t('<', 4), t('<', 3)]).toEqual([true, false]);
    expect([t('≤', 3), t('≤', 2)]).toEqual([true, false]);
    expect([t('>', 2), t('>', 3)]).toEqual([true, false]);
    expect([t('≥', 3), t('≥', 4)]).toEqual([true, false]);
  });
  it('fehlende Antwort: jeder Vergleich ist falsch, auch ≠ und <', () => {
    for (const ist of ['=', '≠', '<', '≤', '>', '≥'] as const) {
      expect(ja({ frage: 'q', ist, wert: 3 }, {}), ist).toBe(false);
      expect(ja({ frage: 'q', ist, wert: 3 }, { q: null }), ist).toBe(false);
    }
    expect(ja({ frage: 'q', gewaehlt: 1 }, {})).toBe(false);
  });
  it('Antwort 0 ist eine Antwort (nicht fehlend)', () => {
    expect(ja({ frage: 'q', ist: '=', wert: 0 }, { q: 0 })).toBe(true);
    expect(ja({ frage: 'q', beantwortet: true }, { q: 0 })).toBe(true);
  });
  it('gewaehlt: Code in der Liste der angekreuzten Optionen', () => {
    expect(ja({ frage: 'q', gewaehlt: 2 }, { q: [1, 2] })).toBe(true);
    expect(ja({ frage: 'q', gewaehlt: 3 }, { q: [1, 2] })).toBe(false);
    expect(ja({ frage: 'q', gewaehlt: 1 }, { q: [] })).toBe(false);
  });
  it('beantwortet: true und false', () => {
    expect([ja({ frage: 'q', beantwortet: true }, { q: 1 }), ja({ frage: 'q', beantwortet: true }, {})]).toEqual([true, false]);
    expect([ja({ frage: 'q', beantwortet: false }, {}), ja({ frage: 'q', beantwortet: false }, { q: 1 })]).toEqual([true, false]);
    expect(ja({ frage: 'q', beantwortet: true }, { q: [] })).toBe(false);
    expect(ja({ frage: 'q', beantwortet: true }, { q: '' })).toBe(false);
    expect(ja({ frage: 'q', beantwortet: true }, { q: 'Text' })).toBe(true);
  });
  it('und, oder, nicht (auch leer und verschachtelt)', () => {
    const k1: Bedingung = { frage: 'a', ist: '=', wert: 1 }, k2: Bedingung = { frage: 'b', ist: '>', wert: 5 };
    const A = { a: 1, b: 9 }, B = { a: 1, b: 2 }, C = { a: 2, b: 2 };
    expect([A, B, C].map(x => ja({ und: [k1, k2] }, x))).toEqual([true, false, false]);
    expect([A, B, C].map(x => ja({ oder: [k1, k2] }, x))).toEqual([true, true, false]);
    expect([A, C].map(x => ja({ nicht: k1 }, x))).toEqual([false, true]);
    expect(ja({ nicht: { und: [k1, { nicht: k2 }] } }, B)).toBe(false);
    expect(ja({ nicht: k1 }, {})).toBe(true);        // nicht (falscher Vergleich ohne Antwort) = wahr
    expect(ja({ und: [] }, {})).toBe(true);          // leere Verknüpfung: und = wahr, oder = falsch
    expect(ja({ oder: [] }, {})).toBe(false);
  });
  it('gilt auch für Seiten', () => {
    const s: Seite = { art: 'seite', id: 's', name: 's', elemente: [], wennGezeigt: { frage: 'q', ist: '=', wert: 1 } };
    expect([fn('zeigen')(s, { q: 1 }), fn('zeigen')(s, { q: 2 })]).toEqual([true, false]);
  });
  it('Kaskade über drei Fragen: A blendet B aus, C hängt an B → C verborgen (mit plan)', () => {
    const A = frage('A', 'a'), B = frage('B', 'b', { wennGezeigt: { frage: 'A', ist: '=', wert: 1 } }), C = frage('C', 'c', { wennGezeigt: { frage: 'B', ist: '=', wert: 1 } });
    const p = eins([A, B, C]);
    const z = (e: Element, a: Antworten, mitPlan = true) => fn('zeigen')(e, a, mitPlan ? p : undefined);
    expect([z(B, { A: 1 }), z(C, { A: 1, B: 1 })]).toEqual([true, true]);             // alles sichtbar
    expect(z(B, { A: 2, B: 1 })).toBe(false);                                           // A=2 blendet B aus
    expect(z(C, { A: 2, B: 1 })).toBe(false);                                           // B hat noch einen alten Wert 1, zählt aber nicht
    expect(z(C, { A: 2, B: 1 }, false)).toBe(true);                                     // ohne plan: keine Kaskade (nur die direkte Bedingung)
  });
  it('Kaskade: verborgene Frage gilt als unbeantwortet, auch für beantwortet:false und nicht', () => {
    const A = frage('A', 'a'), B = frage('B', 'b', { wennGezeigt: { frage: 'A', ist: '=', wert: 1 } });
    const C = frage('C', 'c', { wennGezeigt: { frage: 'B', beantwortet: false } }), D = frage('D', 'd', { wennGezeigt: { nicht: { frage: 'B', beantwortet: true } } });
    const p = eins([A, B, C, D]);
    expect(fn('zeigen')(C, { A: 2, B: 7 }, p)).toBe(true);
    expect(fn('zeigen')(D, { A: 2, B: 7 }, p)).toBe(true);
    expect(fn('zeigen')(C, { A: 1, B: 7 }, p)).toBe(false);   // B sichtbar und beantwortet
  });
  it('Kaskade über vier Fragen (A → B → C → D)', () => {
    const A = frage('A', 'a'), B = frage('B', 'b', { wennGezeigt: { frage: 'A', ist: '=', wert: 1 } });
    const C = frage('C', 'c', { wennGezeigt: { frage: 'B', beantwortet: true } }), D = frage('D', 'd', { wennGezeigt: { frage: 'C', beantwortet: true } });
    const p = eins([A, B, C, D]);
    expect(fn('zeigen')(D, { A: 2, B: 1, C: 1 }, p)).toBe(false);
    expect(fn('zeigen')(D, { A: 1, B: 1, C: 1 }, p)).toBe(true);
  });
});

/* ------------------------------------------------------------------ unerreichbar */
describe('unerreichbar: die drei Fälle des Fachblatts', () => {
  const alter = zahl('q1', 'alter');   // 0 bis 120
  it('Fall 1: und auf dieselbe Frage mit leerem Bereich (alter < 18 und alter > 65)', () => {
    const p = eins([alter, frage('q2', 'x', { wennGezeigt: { und: [{ frage: 'q1', ist: '<', wert: 18 }, { frage: 'q1', ist: '>', wert: 65 }] } })]);
    expect(fn('unerreichbar')(p)).toEqual(['q2']);
  });
  it('Fall 1 auch bei Codes: = 1 und = 2 auf dieselbe Frage; = 1 und ≠ 1; ≥ 5 und ≤ 4', () => {
    const q1 = frage('q1', 'a');
    const f = (b: Bedingung) => fn('unerreichbar')(eins([q1, frage('q2', 'x', { wennGezeigt: b })]));
    expect(f({ und: [{ frage: 'q1', ist: '=', wert: 1 }, { frage: 'q1', ist: '=', wert: 2 }] })).toEqual(['q2']);
    expect(f({ und: [{ frage: 'q1', ist: '=', wert: 1 }, { frage: 'q1', ist: '≠', wert: 1 }] })).toEqual(['q2']);
    expect(f({ und: [{ frage: 'q1', ist: '≥', wert: 5 }, { frage: 'q1', ist: '≤', wert: 4 }] })).toEqual(['q2']);
  });
  it('Fall 1 im und innerhalb eines und (tief), nicht aber in oder', () => {
    const leer: Bedingung = { und: [{ frage: 'q1', ist: '<', wert: 18 }, { frage: 'q1', ist: '>', wert: 65 }] };
    const g = (b: Bedingung) => fn('unerreichbar')(eins([alter, frage('q2', 'x', { wennGezeigt: b })]));
    expect(g({ und: [{ frage: 'q1', ist: '≥', wert: 0 }, leer] })).toEqual(['q2']);
    expect(g({ oder: [{ frage: 'q1', ist: '<', wert: 18 }, { frage: 'q1', ist: '>', wert: 65 }] })).toEqual([]);   // oder ist erreichbar
    expect(g({ oder: [leer, { frage: 'q1', ist: '>', wert: 30 }] })).toEqual([]);                                   // ein erreichbarer Zweig genügt
    expect(g({ oder: [leer, leer] })).toEqual(['q2']);                                                                // alle Zweige leer
  });
  it('Fall 2: gewaehlt mit Code, der nicht in der Liste steht', () => {
    const m = frage('q1', 'mehr', { typ: 'mehrfach', kodebuch: { niveau: 'nominal' } });   // Liste l5: Codes 1 bis 5
    expect(fn('unerreichbar')(eins([m, frage('q2', 'x', { wennGezeigt: { frage: 'q1', gewaehlt: 9 } })]))).toEqual(['q2']);
    expect(fn('unerreichbar')(eins([m, frage('q2', 'x', { wennGezeigt: { frage: 'q1', gewaehlt: 5 } })]))).toEqual([]);
  });
  it('Fall 3: Verweis auf eine unerreichbare Frage macht auch die Folgefrage unerreichbar (Kette)', () => {
    const bund: Bedingung = { und: [{ frage: 'q1', ist: '<', wert: 18 }, { frage: 'q1', ist: '>', wert: 65 }] };
    const p = eins([alter, frage('q2', 'b', { wennGezeigt: bund }), frage('q3', 'c', { wennGezeigt: { frage: 'q2', ist: '=', wert: 1 } }), frage('q4', 'd', { wennGezeigt: { frage: 'q3', beantwortet: true } }), frage('q5', 'e')]);
    expect(fn('unerreichbar')(p)).toEqual(['q2', 'q3', 'q4']);
  });
  it('Gegenbeispiel: erreichbare Bedingungen ergeben []', () => {
    const p = eins([alter, frage('q2', 'x', { wennGezeigt: { und: [{ frage: 'q1', ist: '≥', wert: 18 }, { frage: 'q1', ist: '≤', wert: 65 }] } }),
      frage('q3', 'y', { wennGezeigt: { frage: 'q2', ist: '=', wert: 3 } }),
      frage('q4', 'z', { wennGezeigt: { und: [{ frage: 'q1', ist: '>', wert: 18 }, { frage: 'q2', ist: '=', wert: 1 }] } })]);   // verschiedene Fragen: kein leerer Bereich
    expect(fn('unerreichbar')(p)).toEqual([]);
  });
  it('Randfall: ≥ 18 und ≤ 18 ist genau ein Wert, also erreichbar', () => {
    expect(fn('unerreichbar')(eins([alter, frage('q2', 'x', { wennGezeigt: { und: [{ frage: 'q1', ist: '≥', wert: 18 }, { frage: 'q1', ist: '≤', wert: 18 }] } })]))).toEqual([]);
  });
  it('Ohne Bedingungen: leere Liste; Block und Hinweis mit Bedingung werden mit ihrer id gemeldet', () => {
    expect(fn('unerreichbar')(GUT())).toEqual([]);
    const leer: Bedingung = { und: [{ frage: 'q1', ist: '<', wert: 18 }, { frage: 'q1', ist: '>', wert: 65 }] };
    const h: Element = { art: 'hinweis', id: 'h1', name: 'h', text: zw('x'), wennGezeigt: leer };
    expect(fn('unerreichbar')(eins([alter, block('b1', 'blk', 2, { wennGezeigt: leer }), h]))).toEqual(['b1', 'h1']);
  });
});

/* ------------------------------------------------------------------ namensVorschlag */
describe('namensVorschlag', () => {
  const nv = (t: string, v: string[] = []) => fn('namensVorschlag')(t, v);
  it('erste zwei Wörter, klein, mit Unterstrich', () => {
    expect(nv('Wie zufrieden sind Sie mit Ihrem Studium?')).toBe('wie_zufrieden');
    expect(nv('Alter')).toBe('alter');
  });
  it('Umlaute und ß werden umgeschrieben (ä→ae ö→oe ü→ue ß→ss), auch groß', () => {
    expect(nv('Größe der Wohnung')).toBe('groesse_der');
    expect(nv('Älter als üblich?')).toBe('aelter_als');
    expect(nv('Öffentliche Straße')).toBe('oeffentliche_strasse');
    expect(nv('Müde Übung')).toBe('muede_uebung');
  });
  it('immer gültig nach 5.2 (Buchstabe vorn, höchstens 32 Zeichen, kein Schlüsselwort)', () => {
    for (const t of ['2 Kinder im Haushalt', '???', '', '   ', 'To', 'Not and', 'Frage (alt)', 'Ünglaublich-langes-Wort-das-viel-zu-lang-ist für einen Namen', '12345', 'a'.repeat(80) + ' ' + 'b'.repeat(80), '日本語 の 質問']) {
      const n = nv(t);
      expect(planNameOk(n), `„${t}“ → „${n}“`).toBe(true);
      expect(/[äöüÄÖÜß]/.test(n)).toBe(false);
    }
    expect(nv('To').toLowerCase()).not.toBe('to');
  });
  it('Ziffer vorn: f davor; leer: frage', () => {
    expect(nv('2 Kinder im Haushalt')).toBe('f2_kinder');
    expect(nv('')).toBe('frage');
    expect(nv('???')).toBe('frage');
  });
  it('eindeutig mit Nummer ab 2, ohne Unterschied von Groß/klein', () => {
    expect(nv('Wie zufrieden sind Sie?', ['wie_zufrieden'])).toBe('wie_zufrieden2');
    expect(nv('Wie zufrieden sind Sie?', ['wie_zufrieden', 'Wie_Zufrieden2'])).toBe('wie_zufrieden3');
    expect(nv('Wie zufrieden sind Sie?', ['WIE_ZUFRIEDEN'])).toBe('wie_zufrieden2');
    expect(nv('Wie zufrieden sind Sie?', ['anderer'])).toBe('wie_zufrieden');
  });
  it('lange Namen werden gekürzt, die Nummer passt noch hinein und bleibt eindeutig', () => {
    const lang = 'a'.repeat(40) + ' ' + 'b'.repeat(40);
    const erst = nv(lang);
    expect(erst.length).toBeLessThanOrEqual(32);
    const zweit = nv(lang, [erst]);
    expect(zweit.length).toBeLessThanOrEqual(32); expect(zweit).not.toBe(erst); expect(planNameOk(zweit)).toBe(true);
    const dritt = nv(lang, [erst, zweit]);
    expect(new Set([erst, zweit, dritt]).size).toBe(3); expect(dritt.length).toBeLessThanOrEqual(32);
  });
  it('rein: ändert die Liste der vergebenen Namen nicht', () => {
    const v = ['wie_zufrieden']; nv('Wie zufrieden sind Sie?', v); expect(v).toEqual(['wie_zufrieden']);
  });
});
