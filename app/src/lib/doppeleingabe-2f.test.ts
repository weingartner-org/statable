import { beforeAll, describe, expect, it } from 'vitest';
import type { Antwortliste, Bedingung, Element, Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';

/* ===== Paket 2F (Prüfer, ROTE TESTS vor dem Bau): doppelte Dateneingabe, Abgleich, Protokoll, Eingabeprüfung =====
 * Grundlagen: FACHBLATT-STUFE-2.md „Paket 2F“, ARCHITEKTUR-FRAGEBOGEN-PLAN.md 5.1 und 5.3. Belege: docs/fachblaetter/BELEGE-ERHEBEN.json (`ef-doppeleingabe-*`).
 * Die Datei lib/doppeleingabe.ts gibt es noch nicht; sie wird zur Laufzeit geladen (wie fragebogenexport-2e.test.ts), jeder Test ist rot, solange sie fehlt.
 *
 * ---------------------------------- Festlegungen für den Bauer (reine Funktionen, KEIN Svelte, nur `import type` aus fragebogenplan und `zeigen` aus fragebogenplan-bedingung) ----------------------------------
 *  Antworten = Typ `Antworten` aus fragebogenplan-bedingung (Schlüssel = Element-id; bei Blöcken je Item-id; Werte wie in der Bibliothek, siehe Kopf von ausfuellen.test.ts).
 *  type Durchgang = Record<string, Antworten>                    Bogen-Nummer (Text) → Antworten dieses Bogens; die Reihenfolge der Schlüssel ist die Reihenfolge der Eingabe
 *
 *  FELD  = eine Frage (Typ einfach, mehrfach, zahl, text, datum, regler, rangfolge, einwilligung) oder ein Block-Item. Schlüssel = Frage-id bzw. Item-id. Hinweise sind keine Felder.
 *          `:anders` und `:kommentar` sind KEINE eigenen Felder (sie werden beim Abgleich nicht verglichen).
 *  gezeigteFelder(plan, antworten): string[]                     Felder in Plan-Reihenfolge, deren Element laut `zeigen(el, antworten, plan)` gezeigt wird (Block-Items: wie der Block)
 *  mitFilterCodes(plan, antworten): Antworten                    Antworten für ALLE Felder: gezeigte Felder mit ihrem Wert (fehlt er: kein Schlüssel = gezeigt, nicht beantwortet, Architekturblatt 5.3 Nr. 2);
 *                                                                nicht gezeigte Felder: -7 bei einstellungen.fehlendFilter = 'code', sonst kein Schlüssel. Ein eingetippter Wert eines nicht gezeigten Feldes wird verworfen.
 *
 *  abgleich(plan, a: Durchgang, b: Durchgang): Abgleich
 *    interface Abweichung { bogen: string; feld: string; a: Wert; b: Wert }     Wert = number | number[] | string | undefined (undefined = leer)
 *    interface Abgleich { abweichungen: Abweichung[]; nurA: string[]; nurB: string[]; beide: string[]; felder: number; jeFeld: Record<string, number> }
 *    - `beide` = Bogen-Nummern, die in a UND b vorkommen (Reihenfolge wie in a); `nurA`/`nurB` = nur dort (Reihenfolge wie dort).
 *    - Verglichen werden nur Bögen in `beide`. Je Bogen und Durchgang wird mit `mitFilterCodes` aufgefüllt; ein Feld wird verglichen, wenn es in MINDESTENS EINEM der beiden Durchgänge gezeigt war
 *      (in beiden übersprungen: zählt nicht und ist keine Abweichung; in nur einem gezeigt: Vergleich mit dem Filter-Code des anderen, meist Folge einer Abweichung der Filterfrage).
 *    - `felder` = Summe über alle Bögen in `beide` der verglichenen Felder (DEFINITION der Rechengröße; Bögen nur in A oder nur in B und übersprungene Filterfelder zählen nicht).
 *    - Gleichheit: Zahl und Text streng (Text wird vorher mit trim() verglichen), Listen als Menge in Reihenfolge der Werte (rangfolge: Reihenfolge zählt; mehrfach ist schon geordnet).
 *    - Reihenfolge von `abweichungen`: nach Bogen wie in `beide`, dann Felder in Plan-Reihenfolge. `jeFeld`: Feld → Zahl der Abweichungen, nur Felder mit mindestens einer.
 *  fehlerJe1000(ab: Abgleich): number                           ab.abweichungen.length / ab.felder * 1000 (ungerundet); bei felder = 0: 0
 *  type Entscheidung = { bogen: string; feld: string; wahl: 'A' | 'B' | 'neu'; wert?: Wert }          `wert` nur bei 'neu'
 *  entscheide(plan, a, b, ab: Abgleich, entscheidungen: Entscheidung[]): { datensatz: Durchgang; protokoll: Protokoll }
 *    - wirft Error, dessen message mit „offen“ beginnt, solange eine Abweichung keine Entscheidung hat (der Datensatz entsteht erst danach); Entscheidungen für Unbekanntes werfen „unbekannt“.
 *    - `datensatz` = nur Bögen in `beide`, je Bogen `mitFilterCodes` des Durchgangs A mit den Entscheidungen eingesetzt (bei Abweichungen im Filter gilt danach erneut `mitFilterCodes`, d. h.
 *      Folgefelder werden nach dem entschiedenen Stand neu belegt - nur getestet, wo es eindeutig ist).
 *    - Protokoll: { boegen: number (= beide.length); nurA: number; nurB: number; felder; abweichungen; jeFeld; je1000; nachA; nachB; neu }
 *  protokollText(p: Protokoll, sprache: 'de' | 'en'): string     Satzvorschlag für den Methodenteil, Zahlen im Text (de: Dezimalkomma, eine Nachkommastelle bei „je 1.000 Felder“; en: Punkt).
 *
 *  pruefeFeld(plan, frage: Frage, wert, sprache = 'de'): { stufe: 'ok' | 'fehler' | 'rueckfrage'; text: string }
 *    wert: number | number[] | string | null | undefined; `text` ist bei 'ok' leer, sonst in der Sprache.
 *    - leer (undefined, null, '', []): Pflicht → 'rueckfrage' (KEIN Fehler: auf Papier kann eine Antwort fehlen); keine Pflicht → 'ok'.
 *    - einfach/rangfolge/mehrfach: jeder Code muss in der Liste der Frage stehen (Fehlendcodes der Liste eingeschlossen), sonst 'fehler'. Text aus der Zifferneingabe ('3') gilt wie 3, '3x' ist Fehler.
 *    - zahl/regler: Zahl, nicht kleiner als min, nicht größer als max (Grenzen gelten), sonst 'fehler'; kein Rechnen mit Text ('abc' → fehler).
 *    - text: nur `text_.maxZeichen` wird geprüft. -7 (Filter-Code) ist KEIN gültiger Eingabecode, sondern wird von mitFilterCodes gesetzt.
 *  pruefeBogenNummer(durchgang: Durchgang, nr: string): 'ok' | 'leer' | 'doppelt'      leer = nach trim() leer; doppelt = kommt in diesem Durchgang schon vor (Vergleich nach trim()).
 *
 * Belege: Doppeleingabe findet mehr Fehler als Einzeleingabe/Sichtprüfung und „Fehler je 1.000 Felder“ ist die übliche Angabe (Paulsen u. a. 2012; je 10.000: Garza u. a.) - siehe BELEGE.
 */

type Wert = number | number[] | string | undefined;
type Antworten = Record<string, Wert | null>;
type Durchgang = Record<string, Antworten>;
interface Abweichung { bogen: string; feld: string; a: Wert; b: Wert }
interface Abgleich { abweichungen: Abweichung[]; nurA: string[]; nurB: string[]; beide: string[]; felder: number; jeFeld: Record<string, number> }
interface Protokoll { boegen: number; nurA: number; nurB: number; felder: number; abweichungen: number; jeFeld: Record<string, number>; je1000: number; nachA: number; nachB: number; neu: number }
interface Entscheidung { bogen: string; feld: string; wahl: 'A' | 'B' | 'neu'; wert?: Wert }
interface Pruefung { stufe: 'ok' | 'fehler' | 'rueckfrage'; text: string }
type Mod = {
  gezeigteFelder?: (p: FragebogenPlan, a: Antworten) => string[];
  mitFilterCodes?: (p: FragebogenPlan, a: Antworten) => Antworten;
  abgleich?: (p: FragebogenPlan, a: Durchgang, b: Durchgang) => Abgleich;
  fehlerJe1000?: (ab: Abgleich) => number;
  entscheide?: (p: FragebogenPlan, a: Durchgang, b: Durchgang, ab: Abgleich, e: Entscheidung[]) => { datensatz: Durchgang; protokoll: Protokoll };
  protokollText?: (p: Protokoll, sprache: 'de' | 'en') => string;
  pruefeFeld?: (p: FragebogenPlan, f: Frage, wert: unknown, sprache?: string) => Pruefung;
  pruefeBogenNummer?: (d: Durchgang, nr: string) => 'ok' | 'leer' | 'doppelt';
};
let mod: Mod | null = null;
beforeAll(async () => { const pfad = './doppeleingabe'; mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null; });
function fn<K extends keyof Mod>(n: K): NonNullable<Mod[K]> {
  const f = mod?.[n];
  if (!f) throw new Error(`lib/doppeleingabe.ts: ${String(n)} fehlt (rot bis zum Bau)`);
  return f as NonNullable<Mod[K]>;
}

/* ---------------------------------- Baukasten ---------------------------------- */
const zw = (t: string): Lok => ({ de: t, en: t + ' (en)' });
const liste: Antwortliste = { id: 'l5', name: 'l5', geordnet: true, optionen: [
  ...[1, 2, 3, 4, 5].map(i => ({ id: `l5:${i}`, wert: i, text: zw(`Stufe ${i}`) })),
  { id: 'l5:m9', wert: -9, text: zw('keine Angabe'), fehlend: 'keineAngabe' as const }] };
const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name: id, typ: 'einfach', text: zw(id), liste: 'l5', kodebuch: { niveau: 'ordinal' }, ...extra });
const zahl = (id: string, extra: Partial<Frage> = {}): Frage => frage(id, { typ: 'zahl', liste: undefined, zahl: { min: 0, max: 120, ganz: true }, kodebuch: { niveau: 'skala' }, ...extra });
const seite = (id: string, elemente: Element[], wennGezeigt?: Bedingung): Seite => ({ art: 'seite', id, name: id, elemente, ...(wennGezeigt ? { wennGezeigt } : {}) });
const plan = (seiten: Seite[], fehlendFilter: 'code' | 'leer' = 'code'): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('T'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter }, antwortlisten: [liste], skalen: [], elemente: seiten, geaendert: 1 });
const A = (...paare: [string, Wert][]): Antworten => Object.fromEntries(paare);

/* ====================================== HANDBEISPIEL (von Hand gerechnet) ======================================
 * Plan: 8 Fragen q1 bis q8 (einfach, Liste 1 bis 5 und -9), keine Filter.
 * Durchgang A: 5 Bögen b1 bis b5.   Durchgang B: 4 Bögen b1 bis b4 (b5 fehlt: „nur in A“).
 * Die Durchgänge sind bis auf drei Felder gleich: b2.q3 (A: 3, B: 4), b3.q6 (A: 5, B: 1), b4.q8 (A: 3, B: 5).
 *
 * Rechnung (nur Zählen):
 *   Bögen in beiden Durchgängen: b1, b2, b3, b4 = 4            (b5 zählt nicht)
 *   verglichene Felder:          4 Bögen × 8 Felder = 32       (die 8 Felder von b5 zählen nicht)
 *   Abweichungen:                3
 *   Abweichungen je 1.000 Felder = 3 / 32 × 1000 = 93,75       (de „93,8“, eine Nachkommastelle, kaufmännisch gerundet)
 *   Entscheidung: b2.q3 → A (3), b3.q6 → B (1), b4.q8 → neuer Wert 4  ⇒  nachA 1, nachB 1, neu 1.
 */
const q = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
const hand = plan([seite('s1', q.map(i => frage(i)))]);
const bogen = (...w: number[]): Antworten => A(...w.map((v, i): [string, Wert] => [q[i]!, v]));
const dA: Durchgang = { b1: bogen(1, 2, 3, 4, 5, 1, 2, 3), b2: bogen(2, 2, 3, 3, 4, 4, 5, 5), b3: bogen(5, 4, 3, 2, 1, 5, 4, 3), b4: bogen(1, 1, 1, 2, 2, 2, 3, 3), b5: bogen(3, 3, 3, 3, 3, 3, 3, 3) };
const dB: Durchgang = { b1: bogen(1, 2, 3, 4, 5, 1, 2, 3), b2: bogen(2, 2, 4, 3, 4, 4, 5, 5), b3: bogen(5, 4, 3, 2, 1, 1, 4, 3), b4: bogen(1, 1, 1, 2, 2, 2, 3, 5) };
const klon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('Handbeispiel: Abgleich und Fehlerrate', () => {
  it('Abweichungen (Bogen, Feld, Wert A, Wert B) in der festgelegten Reihenfolge', () => {
    const ab = fn('abgleich')(hand, klon(dA), klon(dB));
    expect(ab.abweichungen).toEqual([
      { bogen: 'b2', feld: 'q3', a: 3, b: 4 },
      { bogen: 'b3', feld: 'q6', a: 5, b: 1 },
      { bogen: 'b4', feld: 'q8', a: 3, b: 5 }]);
    expect(ab.jeFeld).toEqual({ q3: 1, q6: 1, q8: 1 });
  });
  it('Bögen nur in A oder nur in B werden gemeldet und nicht verglichen', () => {
    const ab = fn('abgleich')(hand, klon(dA), klon(dB));
    expect(ab.nurA).toEqual(['b5']);
    expect(ab.nurB).toEqual([]);
    expect(ab.beide).toEqual(['b1', 'b2', 'b3', 'b4']);
    const umgekehrt = fn('abgleich')(hand, klon(dB), klon(dA));
    expect(umgekehrt.nurA).toEqual([]);
    expect(umgekehrt.nurB).toEqual(['b5']);
    expect(umgekehrt.abweichungen.map(x => [x.bogen, x.feld, x.a, x.b])).toEqual([['b2', 'q3', 4, 3], ['b3', 'q6', 1, 5], ['b4', 'q8', 5, 3]]);
  });
  it('verglichene Felder: nur Bögen in beiden Durchgängen (4 × 8 = 32)', () => {
    expect(fn('abgleich')(hand, klon(dA), klon(dB)).felder).toBe(32);
  });
  it('Fehler je 1.000 Felder = 3 / 32 × 1000 = 93,75', () => {
    expect(fn('fehlerJe1000')(fn('abgleich')(hand, klon(dA), klon(dB)))).toBe(93.75);
  });
  it('keine Abweichung → 0; keine gemeinsamen Bögen (0 Felder) → 0 statt NaN', () => {
    const gleich = fn('abgleich')(hand, klon(dA), klon(dA));
    expect(gleich.abweichungen).toEqual([]);
    expect(fn('fehlerJe1000')(gleich)).toBe(0);
    const keine = fn('abgleich')(hand, { x: bogen(1, 1, 1, 1, 1, 1, 1, 1) }, { y: bogen(1, 1, 1, 1, 1, 1, 1, 1) });
    expect(keine.felder).toBe(0);
    expect(fn('fehlerJe1000')(keine)).toBe(0);
  });
  it('leer gegen Wert ist eine Abweichung (undefined), Leerzeichen im Text zählen nicht', () => {
    const p = plan([seite('s1', [frage('q1'), { ...frage('t'), typ: 'text', liste: undefined, kodebuch: { niveau: 'nominal' } }])]);
    const ab = fn('abgleich')(p, { x: A(['q1', 3], ['t', 'Hallo ']) }, { x: A(['t', 'Hallo']) });
    expect(ab.abweichungen).toEqual([{ bogen: 'x', feld: 'q1', a: 3, b: undefined }]);
    expect(ab.felder).toBe(2);
  });
  it('Mehrfachantwort: gleiche Liste gleich, andere Liste Abweichung', () => {
    const p = plan([seite('s1', [frage('m', { typ: 'mehrfach' })])]);
    const ab = fn('abgleich')(p, { x: A(['m', [1, 3]]), y: A(['m', [1, 3]]) }, { x: A(['m', [1, 3]]), y: A(['m', [1, 2]]) });
    expect(ab.abweichungen).toEqual([{ bogen: 'y', feld: 'm', a: [1, 3], b: [1, 2] }]);
  });
});

describe('Handbeispiel: Entscheiden, Datensatz und Protokoll', () => {
  const entscheidungen: Entscheidung[] = [
    { bogen: 'b2', feld: 'q3', wahl: 'A' }, { bogen: 'b3', feld: 'q6', wahl: 'B' }, { bogen: 'b4', feld: 'q8', wahl: 'neu', wert: 4 }];
  const lauf = () => { const a = klon(dA), b = klon(dB); const ab = fn('abgleich')(hand, a, b); return fn('entscheide')(hand, a, b, ab, entscheidungen); };
  it('Datensatz: nur Bögen in beiden Durchgängen, Entscheidungen eingesetzt, Rest wie A (= B)', () => {
    const { datensatz } = lauf();
    expect(Object.keys(datensatz)).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect(datensatz.b1).toEqual(dA.b1);
    expect(datensatz.b2).toEqual(bogen(2, 2, 3, 3, 4, 4, 5, 5));   // q3 = A = 3
    expect(datensatz.b3).toEqual(bogen(5, 4, 3, 2, 1, 1, 4, 3));   // q6 = B = 1
    expect(datensatz.b4).toEqual(bogen(1, 1, 1, 2, 2, 2, 3, 4));   // q8 = neu = 4
  });
  it('Protokoll zählt: 4 Bögen, 1 nur in A, 32 Felder, 3 Abweichungen, je 1.000 = 93,75, nach A 1, nach B 1, neu 1', () => {
    expect(lauf().protokoll).toEqual({ boegen: 4, nurA: 1, nurB: 0, felder: 32, abweichungen: 3, jeFeld: { q3: 1, q6: 1, q8: 1 }, je1000: 93.75, nachA: 1, nachB: 1, neu: 1 });
  });
  it('offene Abweichung: kein Datensatz (Fehler „offen…“); unbekannte Entscheidung: „unbekannt…“', () => {
    const a = klon(dA), b = klon(dB), ab = fn('abgleich')(hand, a, b);
    expect(() => fn('entscheide')(hand, a, b, ab, entscheidungen.slice(0, 2))).toThrow(/^offen/);
    expect(() => fn('entscheide')(hand, a, b, ab, [...entscheidungen, { bogen: 'b1', feld: 'q1', wahl: 'A' }])).toThrow(/^unbekannt/);
  });
  it('ohne Abweichung braucht es keine Entscheidung; Datensatz = A', () => {
    const a = klon(dA), ab = fn('abgleich')(hand, a, klon(dA));
    const { datensatz, protokoll } = fn('entscheide')(hand, a, klon(dA), ab, []);
    expect(datensatz).toEqual(dA);
    expect(protokoll).toMatchObject({ boegen: 5, nurA: 0, abweichungen: 0, je1000: 0, nachA: 0, nachB: 0, neu: 0, felder: 40 });
  });
});

describe('Protokolltext für den Methodenteil', () => {
  const p: Protokoll = { boegen: 4, nurA: 1, nurB: 0, felder: 32, abweichungen: 3, jeFeld: { q3: 1, q6: 1, q8: 1 }, je1000: 93.75, nachA: 1, nachB: 1, neu: 1 };
  it('de: sagt „doppelt und unabhängig eingegeben“ und nennt alle Zahlen (Dezimalkomma)', () => {
    const t = fn('protokollText')(p, 'de');
    expect(t).toContain('doppelt und unabhängig eingegeben');
    for (const s of ['4 Bögen', '32 Felder', '3 Abweichungen', '93,8', 'je 1.000 Felder']) expect(t).toContain(s);
    expect(t).toMatch(/nur in (einem|Durchgang A)/);   // der Bogen nur in A wird erwähnt
    expect(t).not.toMatch(/[ \t]\n|\t/);
  });
  it('en: „entered twice and independently“, Dezimalpunkt, andere Wörter als de', () => {
    const t = fn('protokollText')(p, 'en');
    expect(t).toContain('entered twice and independently');
    for (const s of ['4 questionnaires', '32 fields', '3 discrepancies', '93.8', 'per 1,000 fields']) expect(t).toContain(s);
    expect(t).not.toContain('Bögen');
  });
  it('0 Bögen nur in einem Durchgang: keine Erwähnung nötig; Zahlen ändern sich mit dem Protokoll', () => {
    const t = fn('protokollText')({ ...p, nurA: 0, abweichungen: 0, je1000: 0, nachA: 0, nachB: 0, neu: 0 }, 'de');
    expect(t).toContain('0 Abweichungen');
    expect(t).not.toMatch(/nur in (einem|Durchgang)/);
  });
});

/* ====================================== SPRUNGREGELN ====================================== */
describe('Sprungregeln: übersprungene Felder bekommen den Filter-Code und zählen nicht als Felder', () => {
  // q1 immer; q2 nur wenn q1 = 1; q3 immer
  const mk = (fehlend: 'code' | 'leer' = 'code') => plan([seite('s1', [frage('q1'), frage('q2', { wennGezeigt: { frage: 'q1', ist: '=', wert: 1 } }), frage('q3')])], fehlend);
  it('gezeigteFelder folgt den Antworten', () => {
    expect(fn('gezeigteFelder')(mk(), A(['q1', 1]))).toEqual(['q1', 'q2', 'q3']);
    expect(fn('gezeigteFelder')(mk(), A(['q1', 2]))).toEqual(['q1', 'q3']);
    expect(fn('gezeigteFelder')(mk(), {})).toEqual(['q1', 'q3']);   // q1 unbeantwortet: „= 1“ ist falsch (Fachblatt 2A)
  });
  it('mitFilterCodes: nicht gezeigt → -7 (Voreinstellung), bei fehlendFilter leer → kein Schlüssel; eingetippter Wert eines verborgenen Felds wird verworfen', () => {
    expect(fn('mitFilterCodes')(mk(), A(['q1', 2], ['q3', 4]))).toEqual({ q1: 2, q2: -7, q3: 4 });
    expect(fn('mitFilterCodes')(mk(), A(['q1', 2], ['q2', 5], ['q3', 4]))).toEqual({ q1: 2, q2: -7, q3: 4 });
    expect(fn('mitFilterCodes')(mk('leer'), A(['q1', 2], ['q3', 4]))).toEqual({ q1: 2, q3: 4 });
  });
  it('gezeigt, aber nicht beantwortet bleibt leer (kein -7)', () => {
    expect(fn('mitFilterCodes')(mk(), A(['q1', 1], ['q3', 4]))).toEqual({ q1: 1, q3: 4 });
  });
  it('Abgleich: in beiden übersprungen zählt nicht (x1: 2 Felder), gezeigt zählt (x2: 3 Felder); 1 Abweichung → 5 Felder → 200 je 1.000', () => {
    const p = mk();
    const a: Durchgang = { x1: A(['q1', 2], ['q3', 4]), x2: A(['q1', 1], ['q2', 3], ['q3', 4]) };
    const b: Durchgang = { x1: A(['q1', 2], ['q3', 4]), x2: A(['q1', 1], ['q2', 3], ['q3', 5]) };
    const ab = fn('abgleich')(p, a, b);
    expect(ab.felder).toBe(5);
    expect(ab.abweichungen).toEqual([{ bogen: 'x2', feld: 'q3', a: 4, b: 5 }]);
    expect(fn('fehlerJe1000')(ab)).toBe(200);
  });
  it('Abgleich: in nur einem Durchgang gezeigt → verglichen mit dem Filter-Code des anderen (Folge einer Abweichung der Filterfrage)', () => {
    const ab = fn('abgleich')(mk(), { x: A(['q1', 1], ['q2', 3], ['q3', 4]) }, { x: A(['q1', 2], ['q3', 4]) });
    expect(ab.felder).toBe(3);
    expect(ab.abweichungen).toEqual([{ bogen: 'x', feld: 'q1', a: 1, b: 2 }, { bogen: 'x', feld: 'q2', a: 3, b: -7 }]);
  });
  it('mit fehlendFilter leer: Folgefeld in nur einem Durchgang gezeigt → Abweichung Wert gegen leer', () => {
    const ab = fn('abgleich')(mk('leer'), { x: A(['q1', 1], ['q2', 3], ['q3', 4]) }, { x: A(['q1', 2], ['q3', 4]) });
    expect(ab.abweichungen).toEqual([{ bogen: 'x', feld: 'q1', a: 1, b: 2 }, { bogen: 'x', feld: 'q2', a: 3, b: undefined }]);
  });
  it('Datensatz belegt übersprungene Felder mit -7 (oder lässt sie leer)', () => {
    const a: Durchgang = { x: A(['q1', 2], ['q3', 4]) };
    const ab = fn('abgleich')(mk(), a, klon(a));
    expect(fn('entscheide')(mk(), a, klon(a), ab, []).datensatz).toEqual({ x: { q1: 2, q2: -7, q3: 4 } });
    const ab2 = fn('abgleich')(mk('leer'), a, klon(a));
    expect(fn('entscheide')(mk('leer'), a, klon(a), ab2, []).datensatz).toEqual({ x: { q1: 2, q3: 4 } });
  });
  it('Block-Items sind Felder; ein verborgener Block verbirgt alle Items; Hinweise sind keine Felder', () => {
    const block: Element = { art: 'block', id: 'blk', name: 'blk', text: zw('B'), liste: 'l5', items: [{ id: 'i1', name: 'i1', text: zw('1') }, { id: 'i2', name: 'i2', text: zw('2') }], kodebuch: { niveau: 'ordinal' }, wennGezeigt: { frage: 'q1', ist: '=', wert: 1 } };
    const p = plan([seite('s1', [frage('q1'), { art: 'hinweis', id: 'h', name: 'h', text: zw('Hinweis') }, block])]);
    expect(fn('gezeigteFelder')(p, A(['q1', 1]))).toEqual(['q1', 'i1', 'i2']);
    expect(fn('gezeigteFelder')(p, A(['q1', 2]))).toEqual(['q1']);
    expect(fn('mitFilterCodes')(p, A(['q1', 2]))).toEqual({ q1: 2, i1: -7, i2: -7 });
  });
});

/* ====================================== EINGABEPRÜFUNG ====================================== */
describe('pruefeFeld: Fehler beim Tippen, Rückfrage statt Sperre', () => {
  const p = plan([seite('s1', [])]);
  const einfach = frage('e'), pflichtF = frage('ep', { pflicht: { an: true } });
  const z = zahl('z'), zPflicht = zahl('zp', { pflicht: { an: true } }), zOffen = zahl('zo', { zahl: { ganz: true } });
  it('einfach: Code in der Liste ok (auch Fehlendcode -9), nicht in der Liste Fehler mit Text', () => {
    expect(fn('pruefeFeld')(p, einfach, 3)).toEqual({ stufe: 'ok', text: '' });
    expect(fn('pruefeFeld')(p, einfach, -9).stufe).toBe('ok');
    const f = fn('pruefeFeld')(p, einfach, 7);
    expect(f.stufe).toBe('fehler');
    expect(f.text.length).toBeGreaterThan(0);
    expect(fn('pruefeFeld')(p, einfach, -7).stufe).toBe('fehler');   // Filter-Code ist keine Eingabe
    expect(fn('pruefeFeld')(p, einfach, 0).stufe).toBe('fehler');
  });
  it('Zifferneingabe als Text: „3“ wie 3, „3x“ und „abc“ Fehler', () => {
    expect(fn('pruefeFeld')(p, einfach, '3').stufe).toBe('ok');
    expect(fn('pruefeFeld')(p, einfach, '3x').stufe).toBe('fehler');
    expect(fn('pruefeFeld')(p, z, 'abc').stufe).toBe('fehler');
  });
  it('Zahl: Grenzen gelten (min und max inklusive), außerhalb Fehler, ohne Grenze alles ok', () => {
    for (const [w, st] of [[0, 'ok'], [120, 'ok'], [57, 'ok'], [121, 'fehler'], [-1, 'fehler'], [150, 'fehler']] as const) expect(fn('pruefeFeld')(p, z, w).stufe, String(w)).toBe(st);
    expect(fn('pruefeFeld')(p, zOffen, 100000).stufe).toBe('ok');
    expect(fn('pruefeFeld')(p, zOffen, -5).stufe).toBe('ok');
  });
  it('Pflicht und leer: Rückfrage (kein Fehler); ohne Pflicht und leer: ok', () => {
    for (const leer of [undefined, null, '', []]) {
      expect(fn('pruefeFeld')(p, pflichtF, leer).stufe, String(leer)).toBe('rueckfrage');
      expect(fn('pruefeFeld')(p, zPflicht, leer).stufe, String(leer)).toBe('rueckfrage');
      expect(fn('pruefeFeld')(p, einfach, leer)).toEqual({ stufe: 'ok', text: '' });
    }
    expect(fn('pruefeFeld')(p, pflichtF, undefined).text.length).toBeGreaterThan(0);
    expect(fn('pruefeFeld')(p, pflichtF, 2).stufe).toBe('ok');
  });
  it('Mehrfach: alle Codes müssen in der Liste stehen', () => {
    const m = frage('m', { typ: 'mehrfach' });
    expect(fn('pruefeFeld')(p, m, [1, 2]).stufe).toBe('ok');
    expect(fn('pruefeFeld')(p, m, [1, 9]).stufe).toBe('fehler');
  });
  it('Text: nur maxZeichen wird geprüft', () => {
    const t = frage('t', { typ: 'text', liste: undefined, text_: { mehrzeilig: false, maxZeichen: 5 }, kodebuch: { niveau: 'nominal' } });
    expect(fn('pruefeFeld')(p, t, 'abcde').stufe).toBe('ok');
    expect(fn('pruefeFeld')(p, t, 'abcdef').stufe).toBe('fehler');
  });
  it('Fehlertext in der gewählten Sprache (de und en verschieden)', () => {
    expect(fn('pruefeFeld')(p, einfach, 7, 'de').text).not.toBe(fn('pruefeFeld')(p, einfach, 7, 'en').text);
  });
});

describe('Bogen-Nummer: Pflicht und eindeutig je Durchgang', () => {
  it('leer, doppelt, ok', () => {
    const d: Durchgang = { b1: {}, ' b2 ': {} };
    expect(fn('pruefeBogenNummer')(d, '')).toBe('leer');
    expect(fn('pruefeBogenNummer')(d, '  ')).toBe('leer');
    expect(fn('pruefeBogenNummer')(d, 'b1')).toBe('doppelt');
    expect(fn('pruefeBogenNummer')(d, 'b2')).toBe('doppelt');
    expect(fn('pruefeBogenNummer')(d, 'b3')).toBe('ok');
  });
});
