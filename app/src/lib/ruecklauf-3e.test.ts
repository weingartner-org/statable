import { beforeAll, describe, expect, it } from 'vitest';
import type { Block, Element, Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';
import type { Antworten } from './fragebogenplan-bedingung';

/* ===== Paket 3E (Prüfer, ROTE TESTS vor dem Bau): Rücklauf nach AAPOR (Standard Definitions, 10. Ausgabe 2023, S. 85-88) =====
 * Grundlage: docs/erheben/FACHBLATT-STUFE-3.md (3E), docs/erheben/recherche-aapor.md. Neue Datei: lib/ruecklauf.ts
 * Sollwerte: scripts/ruecklauf-erwartet.R mit R-Paket `outcomerate` 1.1.0 (Ausgabe scripts/ruecklauf-erwartet.txt), 6 Stellen.
 *
 * ---------------------------------- Festlegungen für den Bauer (vom Prüfer) ----------------------------------
 *  interface AntwortsatzMin { antwortId: string; code?: string; werte: Antworten; abgebrochen?: boolean }   (der Antwortsatz aus Fachblatt 3B passt; weitere Felder werden durchgereicht)
 *  type Zustand = 'vollstaendig' | 'teilweise' | 'nichtZurueck' | 'unbekannt' | 'doppelt'
 *
 *  entdopple<S extends { antwortId: string }>(saetze: S[]): { saetze: S[]; doppelt: { antwortId: string; anzahl: number }[] }
 *      Behält je antwortId den ERSTEN Satz (Reihenfolge der Eingabe bleibt). doppelt = je mehrfach vorkommender antwortId ein Eintrag mit der Gesamtzahl (≥ 2), in Reihenfolge des ersten Vorkommens.
 *
 *  kategorisiere(plan, saetze, codes, grenze = 0.8): Kategorisierung
 *      codes: { code: string; ausgegeben?: boolean }[]  (plan.codes aus 3D). `ausgegeben !== false` zählt als ausgegeben (nur ein ausdrückliches false nimmt den Code aus der Rechnung).
 *      Zuerst entdopple (gleiche antwortId = dasselbe Ausfüllen, zählt einmal). Codes werden mit normalisiereCode (einmalcodes.ts) verglichen; in der Ausgabe steht die kanonische Form.
 *      anteil eines Satzes = beantwortete / gezeigte Pflichtfragen.
 *        - gezeigt: zeigen(element, satz.werte, plan) (mit Kaskade; verborgene Fragen zählen weder im Nenner noch als beantwortet, auch nicht mit altem Wert).
 *        - Pflichtfragen: Frage mit pflicht; ein Block mit pflicht zählt JEDEN Item (Schlüssel = item.id) einzeln. Hinweise zählen nie.
 *        - Gibt es keine gezeigte Pflichtfrage: Ersatz = alle gezeigten Fragen (Fragen und Block-Items); gibt es auch die nicht: anteil = 1.
 *        - beantwortet = Wert nicht undefined/null/''/[]/NaN (auch „keine Angabe“-Code oder 0 sind Antworten).
 *      Zustand je Code der Liste (nach entdopple):
 *        kein Satz → 'nichtZurueck' (anteil null); genau ein Satz → anteil ≥ grenze: 'vollstaendig'; 0 < anteil < grenze: 'teilweise'; anteil = 0 (leerer Bogen): 'nichtZurueck' (anteil 0).
 *        zwei oder mehr Sätze mit VERSCHIEDENER antwortId und demselben Code → 'doppelt' (Statable entscheidet nichts allein, Fachblatt 3D); `wertung` = die höchste Einstufung unter den Sätzen
 *        (AAPOR S. 10: bei mehreren Ergebnissen gilt die höchste), also vollstaendig vor teilweise vor nichtZurueck; anteil = der beste.
 *        Code nicht in der Liste oder mit ausgegeben === false → eigene Zeile mit zustand 'unbekannt' (hinter den Listen-Zeilen, in Reihenfolge des ersten Auftretens), wertung 'unbekannt', geht in KEINE Rate ein.
 *      Sätze ohne Code (undefined oder nach Normalisierung leer): erscheinen nur in `ohneCode` (antwortIds), nicht in `je`.
 *      Kategorisierung = {
 *        anzahl: number;                      // Zahl der Antworten nach entdopple (immer gesetzt)
 *        grenze: number;                      // die benutzte Grenze (kommt ins Protokoll)
 *        keineQuote: boolean; grund?: string; // true, wenn codes leer/undefiniert ist oder kein Code ausgegeben wurde; dann grund (de) mit dem Wort „Stichprobenrahmen“, sonst grund fehlt
 *        je: { code: string; zustand: Zustand; wertung: Zustand; anteil: number | null; antwortIds: string[] }[];   // bei keineQuote: []
 *        ohneCode: string[];
 *        zahlen: { ausgegeben: number; vollstaendig: number; teilweise: number; nichtZurueck: number; doppelt: number; unbekannt: number } | null;   // null bei keineQuote
 *      }
 *      zahlen: vollstaendig/teilweise/nichtZurueck zählen nach `wertung` und ergeben zusammen immer `ausgegeben`; `doppelt` = Zahl der Codes mit zustand 'doppelt' (zusätzliche Auskunft, schon mitgezählt); `unbekannt` = Zahl der unbekannten Codes (Zeilen).
 *
 *  AAPOR-Zuordnung (Kommentar in scripts/ruecklauf-erwartet.R): vollstaendig = I (1.1), teilweise = P (1.2), nichtZurueck = NC (2.20), R = O = UH = UR = UO = 0.
 *  rr1(k: Kategorisierung): number | null    = I / (I + P + NC)      (RR1 = I/(B+U), S. 85)
 *  rr2(k: Kategorisierung): number | null    = (I + P) / (I + P + NC) (RR2, S. 85)
 *      null bei keineQuote (und wenn ausgegeben = 0). Rohwert, nicht gerundet.
 */
interface Zeile { code: string; zustand: string; wertung: string; anteil: number | null; antwortIds: string[] }
interface Kat {
  anzahl: number; grenze: number; keineQuote: boolean; grund?: string; je: Zeile[]; ohneCode: string[];
  zahlen: { ausgegeben: number; vollstaendig: number; teilweise: number; nichtZurueck: number; doppelt: number; unbekannt: number } | null;
}
interface Satz { antwortId: string; code?: string; werte: Antworten; abgebrochen?: boolean }
interface CodeZ { code: string; ausgegeben?: boolean }
interface Mod {
  entdopple?: <S extends { antwortId: string }>(s: S[]) => { saetze: S[]; doppelt: { antwortId: string; anzahl: number }[] };
  kategorisiere?: (plan: FragebogenPlan, saetze: Satz[], codes: CodeZ[] | undefined, grenze?: number) => Kat;
  rr1?: (k: Kat) => number | null;
  rr2?: (k: Kat) => number | null;
}
let mod: Mod | null = null;
beforeAll(async () => { const pfad = './ruecklauf'; mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null; });
function fn<K extends keyof Mod>(n: K): NonNullable<Mod[K]> {
  const f = mod?.[n];
  if (!f) throw new Error(`lib/ruecklauf.ts: ${String(n)} fehlt (rot bis zum Bau)`);
  return f as NonNullable<Mod[K]>;
}

/* ---------------------------------- Baukasten ---------------------------------- */
const lok = (t: string): Lok => ({ de: t });
const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name: id, typ: 'zahl', text: lok(id), zahl: { ganz: true }, kodebuch: { niveau: 'skala' }, ...extra });
const pflicht = { an: true as const };
const seite = (id: string, elemente: Element[], extra: Partial<Seite> = {}): Seite => ({ art: 'seite', id, name: id, elemente, ...extra });
const plan = (seiten: Seite[]): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p1', revision: 1, titel: lok('T'), sprachen: ['de'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: [], skalen: [], elemente: seiten, geaendert: 0, ...{},
});
/** Fünf Pflichtfragen q1..q5 und eine freiwillige q6. */
const grundplan = () => plan([seite('s1', [...['q1', 'q2', 'q3', 'q4', 'q5'].map(i => frage(i, { pflicht })), frage('q6')])]);
const werte = (...ids: string[]): Antworten => Object.fromEntries(ids.map(i => [i, 1]));
const satz = (antwortId: string, code: string | undefined, ids: string[], extra: Partial<Satz> = {}): Satz => ({ antwortId, ...(code !== undefined ? { code } : {}), werte: werte(...ids), ...extra });
const ALLE = ['q1', 'q2', 'q3', 'q4', 'q5'];
const code = (i: number) => `0000-${String(i).padStart(4, '0')}`;
const codeListe = (n: number): CodeZ[] => Array.from({ length: n }, (_, i) => ({ code: code(i + 1), ausgegeben: true }));
const zeileZu = (k: Kat, c: string) => k.je.find(z => z.code === c);

/* ---------------------------------- entdopple ---------------------------------- */
describe('entdopple', () => {
  it('behält je antwortId den ersten Satz, Reihenfolge bleibt', () => {
    const a = { antwortId: 'a', n: 1 }, b = { antwortId: 'b', n: 2 }, a2 = { antwortId: 'a', n: 3 }, c = { antwortId: 'c', n: 4 };
    const r = fn('entdopple')([a, b, a2, c]);
    expect(r.saetze).toEqual([a, b, c]);
    expect(r.saetze[0]).toBe(a);
  });
  it('meldet mehrfach vorkommende antwortIds mit Anzahl, in Reihenfolge des ersten Vorkommens', () => {
    const s = ['x', 'y', 'x', 'z', 'y', 'x'].map(antwortId => ({ antwortId }));
    expect(fn('entdopple')(s).doppelt).toEqual([{ antwortId: 'x', anzahl: 3 }, { antwortId: 'y', anzahl: 2 }]);
  });
  it('ohne Dopplung: alles bleibt, doppelt ist leer; leere Liste geht', () => {
    const s = [{ antwortId: 'a' }, { antwortId: 'b' }];
    expect(fn('entdopple')(s)).toEqual({ saetze: s, doppelt: [] });
    expect(fn('entdopple')([])).toEqual({ saetze: [], doppelt: [] });
  });
  it('verändert die Eingabe nicht', () => {
    const s = [{ antwortId: 'a' }, { antwortId: 'a' }];
    fn('entdopple')(s);
    expect(s.length).toBe(2);
  });
});

/* ---------------------------------- Zustand je Code ---------------------------------- */
describe('kategorisiere: vollständig / teilweise / nicht zurück', () => {
  it('Voreinstellung 0,8: 5 von 5 und 4 von 5 vollständig, 3 von 5 teilweise, 0 von 5 nicht zurück (leerer Bogen)', () => {
    const k = fn('kategorisiere')(grundplan(), [
      satz('a1', code(1), ALLE), satz('a2', code(2), ['q1', 'q2', 'q3', 'q4']), satz('a3', code(3), ['q1', 'q2', 'q3']), satz('a4', code(4), []),
    ], codeListe(5));
    expect(k.grenze).toBe(0.8);
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'vollstaendig', wertung: 'vollstaendig', anteil: 1, antwortIds: ['a1'] });
    expect(zeileZu(k, code(2))).toMatchObject({ zustand: 'vollstaendig', anteil: 0.8 });
    expect(zeileZu(k, code(3))).toMatchObject({ zustand: 'teilweise', wertung: 'teilweise' });
    expect(zeileZu(k, code(3))!.anteil).toBeCloseTo(0.6, 12);
    expect(zeileZu(k, code(4))).toMatchObject({ zustand: 'nichtZurueck', anteil: 0 });
    expect(zeileZu(k, code(5))).toMatchObject({ zustand: 'nichtZurueck', anteil: null, antwortIds: [] });
    expect(k.zahlen).toEqual({ ausgegeben: 5, vollstaendig: 2, teilweise: 1, nichtZurueck: 2, doppelt: 0, unbekannt: 0 });
    expect(k.anzahl).toBe(4);
    expect(k.keineQuote).toBe(false);
    expect(k.grund).toBeUndefined();
  });
  it('die Grenze ist einstellbar und gilt als „größer oder gleich“: 0,6 macht 3 von 5 vollständig, 1 macht 4 von 5 teilweise', () => {
    const s = [satz('a1', code(1), ['q1', 'q2', 'q3']), satz('a2', code(2), ['q1', 'q2', 'q3', 'q4'])];
    const k06 = fn('kategorisiere')(grundplan(), s, codeListe(2), 0.6);
    expect(k06.grenze).toBe(0.6);
    expect(k06.zahlen).toMatchObject({ vollstaendig: 2, teilweise: 0 });
    const k1 = fn('kategorisiere')(grundplan(), s, codeListe(2), 1);
    expect(k1.zahlen).toMatchObject({ vollstaendig: 0, teilweise: 2 });
  });
  it('nur Pflichtfragen zählen: die freiwillige q6 verändert den Anteil nicht', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(1), ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']), satz('a2', code(2), ['q6'])], codeListe(2));
    expect(zeileZu(k, code(1))!.anteil).toBe(1);
    expect(zeileZu(k, code(2))).toMatchObject({ zustand: 'nichtZurueck', anteil: 0 });
  });
  it('leere Antworten (leerer Text, leere Mehrfachauswahl, null) zählen nicht als beantwortet, 0 und „keine Angabe“-Code schon', () => {
    const p = plan([seite('s1', [frage('t', { typ: 'text', pflicht, zahl: undefined }), frage('m', { typ: 'mehrfach', pflicht, zahl: undefined }), frage('z', { pflicht }), frage('n', { pflicht })])]);
    const k = fn('kategorisiere')(p, [
      { antwortId: 'a', code: code(1), werte: { t: '', m: [], z: 0, n: null } },
      { antwortId: 'b', code: code(2), werte: { t: 'ja', m: [1, 3], z: 0, n: -9 } },
    ], codeListe(2));
    expect(zeileZu(k, code(1))!.anteil).toBe(0.25);
    expect(zeileZu(k, code(1))!.zustand).toBe('teilweise');
    expect(zeileZu(k, code(2))!.anteil).toBe(1);
  });
  it('„abgebrochen“ ändert nichts für sich: es entscheidet der Anteil', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(1), ['q1', 'q2'], { abgebrochen: true }), satz('a2', code(2), ALLE, { abgebrochen: true })], codeListe(2));
    expect(zeileZu(k, code(1))!.zustand).toBe('teilweise');
    expect(zeileZu(k, code(2))!.zustand).toBe('vollstaendig');
  });
});

describe('kategorisiere: nur gezeigte Pflichtfragen', () => {
  const bedingt = () => plan([
    seite('s1', [frage('geschlecht', { pflicht }), frage('schwanger', { pflicht, wennGezeigt: { frage: 'geschlecht', ist: '=', wert: 2 } }), frage('alter', { pflicht })]),
    seite('s2', [frage('beruf', { pflicht })], { wennGezeigt: { frage: 'alter', ist: '≥', wert: 18 } }),
  ]);
  it('eine verborgene Pflichtfrage steht weder im Nenner noch zählt sie als beantwortet (auch nicht mit altem Wert)', () => {
    const k = fn('kategorisiere')(bedingt(), [
      { antwortId: 'a', code: code(1), werte: { geschlecht: 1, alter: 20, beruf: 5 } },                  // schwanger verborgen → 3 von 3
      { antwortId: 'b', code: code(2), werte: { geschlecht: 1, schwanger: 1, alter: 20 } },              // schwanger verborgen (alter Wert), beruf fehlt → 2 von 3
    ], codeListe(2), 0.8);
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'vollstaendig', anteil: 1 });
    expect(zeileZu(k, code(2))!.anteil).toBeCloseTo(2 / 3, 12);
    expect(zeileZu(k, code(2))!.zustand).toBe('teilweise');
  });
  it('wird die Bedingung erfüllt, zählt die Frage mit: 4 Fragen, 3 beantwortet', () => {
    const k = fn('kategorisiere')(bedingt(), [{ antwortId: 'a', code: code(1), werte: { geschlecht: 2, alter: 20, beruf: 5 } }], codeListe(1));
    expect(zeileZu(k, code(1))!.anteil).toBeCloseTo(3 / 4, 12);
  });
  it('eine verborgene Seite nimmt ihre Fragen aus dem Nenner (alter < 18 → beruf nicht gezeigt)', () => {
    const k = fn('kategorisiere')(bedingt(), [{ antwortId: 'a', code: code(1), werte: { geschlecht: 1, alter: 15 } }], codeListe(1));
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'vollstaendig', anteil: 1 });
  });
  it('Block mit pflicht: jeder Item zählt einzeln (Schlüssel = item.id)', () => {
    const block: Block = {
      art: 'block', id: 'b', name: 'b', text: lok('b'), liste: 'l', pflicht, kodebuch: { niveau: 'ordinal' },
      items: ['i1', 'i2', 'i3', 'i4'].map(i => ({ id: i, name: i, text: lok(i) })),
    };
    const k = fn('kategorisiere')(plan([seite('s1', [block])]), [
      { antwortId: 'a', code: code(1), werte: { i1: 1, i2: 2, i3: 3, i4: 4 } },
      { antwortId: 'b', code: code(2), werte: { i1: 1, i2: 2 } },
    ], codeListe(2));
    expect(zeileZu(k, code(1))!.zustand).toBe('vollstaendig');
    expect(zeileZu(k, code(2))).toMatchObject({ zustand: 'teilweise', anteil: 0.5 });
  });
  it('Hinweise zählen nie; ohne Pflichtfragen zählen ersatzweise alle gezeigten Fragen', () => {
    const p = plan([seite('s1', [{ art: 'hinweis', id: 'h', name: 'h', text: lok('H') }, frage('a'), frage('b')])]);
    const k = fn('kategorisiere')(p, [
      { antwortId: 'x', code: code(1), werte: { a: 1, b: 1 } },
      { antwortId: 'y', code: code(2), werte: { a: 1 } },
    ], codeListe(2));
    expect(zeileZu(k, code(1))!.zustand).toBe('vollstaendig');
    expect(zeileZu(k, code(2))).toMatchObject({ zustand: 'teilweise', anteil: 0.5 });
  });
  it('Plan ganz ohne Fragen: anteil 1, ein vorhandener Satz ist vollständig', () => {
    const p = plan([seite('s1', [{ art: 'hinweis', id: 'h', name: 'h', text: lok('H') }])]);
    const k = fn('kategorisiere')(p, [{ antwortId: 'x', code: code(1), werte: {} }], codeListe(1));
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'vollstaendig', anteil: 1 });
  });
});

/* ---------------------------------- unbekannt / doppelt / ohne Code / Entdoppeln ---------------------------------- */
describe('kategorisiere: unbekannte, doppelte und fehlende Codes', () => {
  it('Code nicht in der Liste → Zeile „unbekannt“ hinter den Listen-Zeilen, geht in keine Rate ein', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(1), ALLE), satz('a2', 'ZZZZ-ZZZZ', ALLE)], codeListe(2));
    const u = zeileZu(k, 'ZZZZ-ZZZZ');
    expect(u).toMatchObject({ zustand: 'unbekannt', wertung: 'unbekannt', antwortIds: ['a2'] });
    expect(k.je.indexOf(u!)).toBe(k.je.length - 1);
    expect(k.zahlen).toEqual({ ausgegeben: 2, vollstaendig: 1, teilweise: 0, nichtZurueck: 1, doppelt: 0, unbekannt: 1 });
    expect(fn('rr1')(k)).toBeCloseTo(0.5, 12);
  });
  it('Code mit ausgegeben: false ist aus der Rechnung und gilt bei Eingang als unbekannt', () => {
    const codes: CodeZ[] = [{ code: code(1), ausgegeben: true }, { code: code(2), ausgegeben: false }, { code: code(3) }];
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(2), ALLE)], codes);
    expect(k.zahlen!.ausgegeben).toBe(2);                    // Code 3 ohne Angabe zählt als ausgegeben
    expect(zeileZu(k, code(2))!.zustand).toBe('unbekannt');
    expect(k.je.filter(z => z.code === code(2)).length).toBe(1);
    expect(zeileZu(k, code(3))!.zustand).toBe('nichtZurueck');
  });
  it('Codes werden normalisiert verglichen („0000 0001“, klein, O statt 0) und kanonisch ausgegeben', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', 'oooo 0oo1', ALLE)], codeListe(1));
    expect(zeileZu(k, '0000-0001')).toMatchObject({ zustand: 'vollstaendig', antwortIds: ['a1'] });
    expect(k.zahlen!.unbekannt).toBe(0);
  });
  it('derselbe Code von zwei VERSCHIEDENEN Antworten → „doppelt“, gewertet wird die höchste Einstufung (AAPOR S. 10)', () => {
    const k = fn('kategorisiere')(grundplan(), [
      satz('a1', code(1), ['q1']), satz('a2', code(1), ALLE), satz('b1', code(2), ['q1', 'q2']), satz('b2', code(2), []),
    ], codeListe(3));
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'doppelt', wertung: 'vollstaendig', anteil: 1, antwortIds: ['a1', 'a2'] });
    expect(zeileZu(k, code(2))).toMatchObject({ zustand: 'doppelt', wertung: 'teilweise' });
    expect(k.zahlen).toEqual({ ausgegeben: 3, vollstaendig: 1, teilweise: 1, nichtZurueck: 1, doppelt: 2, unbekannt: 0 });
    expect(k.anzahl).toBe(4);
  });
  it('dieselbe antwortId zweimal (doppelt eingelesen) zählt einmal und macht den Code NICHT „doppelt“', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(1), ALLE), satz('a1', code(1), ALLE)], codeListe(2));
    expect(zeileZu(k, code(1))).toMatchObject({ zustand: 'vollstaendig', antwortIds: ['a1'] });
    expect(k.anzahl).toBe(1);
    expect(k.zahlen!.doppelt).toBe(0);
  });
  it('Sätze ohne Code (fehlt, leer, nur Leerzeichen) stehen nur in ohneCode und nicht in je', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', undefined, ALLE), satz('a2', '', ALLE), satz('a3', '  ', ALLE), satz('a4', code(1), ALLE)], codeListe(2));
    expect(k.ohneCode).toEqual(['a1', 'a2', 'a3']);
    expect(k.je.map(z => z.code)).toEqual([code(1), code(2)]);
    expect(k.anzahl).toBe(4);
    expect(k.zahlen).toMatchObject({ vollstaendig: 1, nichtZurueck: 1, unbekannt: 0 });
  });
  it('je enthält die Listen-Codes in Listenreihenfolge', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(3), ALLE)], codeListe(3));
    expect(k.je.map(z => z.code)).toEqual([code(1), code(2), code(3)]);
  });
  it('die Summe vollstaendig + teilweise + nichtZurueck ergibt immer ausgegeben', () => {
    const s = [satz('a', code(1), ALLE), satz('b', code(2), ['q1']), satz('c', code(2), ['q1', 'q2']), satz('d', 'QQQQ-QQQQ', ALLE), satz('e', undefined, ALLE)];
    const k = fn('kategorisiere')(grundplan(), s, codeListe(6));
    const z = k.zahlen!;
    expect(z.vollstaendig + z.teilweise + z.nichtZurueck).toBe(z.ausgegeben);
  });
});

/* ---------------------------------- RR1, RR2 gegen R (outcomerate 1.1.0) ---------------------------------- */
/** n Codes, davon `i` vollständig, `p` teilweise (3 von 5), Rest nicht zurück. */
function lauf(n: number, i: number, p: number) {
  const s: Satz[] = [];
  for (let x = 1; x <= i; x++) s.push(satz(`v${x}`, code(x), ALLE));
  for (let x = 1; x <= p; x++) s.push(satz(`t${x}`, code(i + x), ['q1', 'q2', 'q3']));
  return fn('kategorisiere')(grundplan(), s, codeListe(n));
}
describe('rr1 und rr2: Sollwerte aus scripts/ruecklauf-erwartet.R (R-Paket outcomerate)', () => {
  it('Beispiel 2: 40 Codes, I=22, P=4, NC=14 → RR1 = 0,550000, RR2 = 0,650000', () => {
    const k = lauf(40, 22, 4);
    expect(k.zahlen).toMatchObject({ ausgegeben: 40, vollstaendig: 22, teilweise: 4, nichtZurueck: 14 });
    expect(fn('rr1')(k)).toBeCloseTo(0.55, 6);
    expect(fn('rr2')(k)).toBeCloseTo(0.65, 6);
  });
  it('Beispiel 4: 8 Codes, I=5, P=1, NC=2 → RR1 = 0,625000, RR2 = 0,750000', () => {
    const k = lauf(8, 5, 1);
    expect(fn('rr1')(k)).toBeCloseTo(0.625, 6);
    expect(fn('rr2')(k)).toBeCloseTo(0.75, 6);
  });
  it('Beispiel 3: 10 Codes, nichts zurück → RR1 = RR2 = 0 (nicht null: es gibt eine Quote)', () => {
    const k = lauf(10, 0, 0);
    expect(k.keineQuote).toBe(false);
    expect(fn('rr1')(k)).toBe(0);
    expect(fn('rr2')(k)).toBe(0);
  });
  it('RR2 ≥ RR1 und beide liegen in [0, 1]; alle zurück vollständig → 1', () => {
    const k = lauf(5, 5, 0);
    expect(fn('rr1')(k)).toBe(1);
    expect(fn('rr2')(k)).toBe(1);
    const m = lauf(7, 2, 3);
    expect(fn('rr2')(m)!).toBeGreaterThanOrEqual(fn('rr1')(m)!);
  });
  it('unbekannte Codes, Sätze ohne Code und doppelt eingelesene Dateien verändern die Raten nicht', () => {
    const plan0 = grundplan();
    const s: Satz[] = [];
    for (let x = 1; x <= 5; x++) s.push(satz(`v${x}`, code(x), ALLE));
    s.push(satz('t1', code(6), ['q1', 'q2', 'q3']));
    const rein = fn('kategorisiere')(plan0, s, codeListe(8));
    const dreck = fn('kategorisiere')(plan0, [...s, ...s, satz('u', 'QQQQ-QQQQ', ALLE), satz('o', undefined, ALLE)], codeListe(8));
    expect(fn('rr1')(dreck)).toBeCloseTo(fn('rr1')(rein)!, 12);
    expect(fn('rr2')(dreck)).toBeCloseTo(0.75, 6);
  });
  it('die Grenze wirkt auf die Raten: bei 0,5 wird aus P (3 von 5) ein I', () => {
    const s = [satz('a', code(1), ALLE), satz('b', code(2), ['q1', 'q2', 'q3'])];
    const k = fn('kategorisiere')(grundplan(), s, codeListe(4), 0.5);
    expect(fn('rr1')(k)).toBeCloseTo(0.5, 6);   // 2 von 4
    expect(fn('rr2')(k)).toBeCloseTo(0.5, 6);
  });
});

/* ---------------------------------- ohne Codes: keine Quote ---------------------------------- */
describe('ohne Codes (offener Link, Datei): keine Rücklaufquote', () => {
  it.each([['undefined', undefined], ['leere Liste', [] as CodeZ[]], ['kein Code ausgegeben', [{ code: code(1), ausgegeben: false }] as CodeZ[]]])(
    'codes = %s → keineQuote, Grund mit „Stichprobenrahmen“, nur die Anzahl, rr1 und rr2 null', (_n, codes) => {
      const k = fn('kategorisiere')(grundplan(), [satz('a1', undefined, ALLE), satz('a2', undefined, ['q1']), satz('a2', undefined, ['q1'])], codes);
      expect(k.keineQuote).toBe(true);
      expect(k.grund).toMatch(/Stichprobenrahmen/);
      expect(k.anzahl).toBe(2);
      expect(k.zahlen).toBeNull();
      expect(k.je).toEqual([]);
      expect(fn('rr1')(k)).toBeNull();
      expect(fn('rr2')(k)).toBeNull();
    });
  it('auch wenn die Sätze Codes tragen: ohne Liste gibt es keine Quote', () => {
    const k = fn('kategorisiere')(grundplan(), [satz('a1', code(1), ALLE)], []);
    expect(k.keineQuote).toBe(true);
    expect(fn('rr1')(k)).toBeNull();
    expect(k.anzahl).toBe(1);
  });
  it('ohne Antworten und ohne Codes: anzahl 0, keineQuote', () => {
    const k = fn('kategorisiere')(grundplan(), [], undefined);
    expect(k).toMatchObject({ anzahl: 0, keineQuote: true });
  });
  it('mit Codes gibt es weder keineQuote noch einen Grund', () => {
    const k = fn('kategorisiere')(grundplan(), [], codeListe(3));
    expect(k.keineQuote).toBe(false);
    expect('grund' in k && k.grund !== undefined).toBe(false);
    expect(k.zahlen).toMatchObject({ ausgegeben: 3, nichtZurueck: 3 });
  });
});
