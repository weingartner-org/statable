import { beforeAll, describe, expect, it } from 'vitest';
import { variablenAusPlan, type Block, type Element, type Frage, type FragebogenPlan, type Lok, type Seite } from './fragebogenplan';

/* ===== Paket 2G (Prüfer, ROTE TESTS vor dem Bau): Pretest-Kommentare aus Antworten lesen =====
 * Grundlagen: FACHBLATT-STUFE-2.md „Paket 2G“ (Pretest), ARCHITEKTUR-FRAGEBOGEN-PLAN.md 5.1 (Variable `<name>_kommentar`, bei Blöcken einer je Block, 5.2),
 * Kopf von app/src/ausfuellen/zeichnen.ts (Antwortschlüssel `<id>:kommentar`). Beleg zum Lehrbezug: `qp-pretest` (Lenzner, Neuert & Otto 2016) in BELEGE-ERHEBEN.json.
 * Die Datei lib/pretest.ts gibt es noch nicht; sie wird zur Laufzeit geladen, jeder Test ist rot, solange sie fehlt.
 *
 * ---------------------------------- Festlegungen für den Bauer (neue Datei lib/pretest.ts, reine Funktion, KEIN Svelte) ----------------------------------
 *  kommentareJeFrage(plan, antwortsaetze: Record<string, unknown>[]): Record<string, string[]>
 *    - Ergebnis hat einen Schlüssel für JEDE Frage und jeden Block des Plans (Element-id), Wert = Liste der Kommentare (leer, wenn keine). Hinweise und Seiten haben keinen Schlüssel.
 *    - Ein Antwortsatz ist ein Bogen/Befragter. Gelesen wird je Satz und Frage zuerst `<id>:kommentar` (Bibliothek, Vorschau und Eingabemaske), sonst die Variable `<name>_kommentar`
 *      (Datensatz, z. B. aus einer eingelesenen Tabelle; bei Blöcken `<blockname>_kommentar`). Sind beide da, zählt der Kommentar EINMAL (der Schlüssel `<id>:kommentar` gewinnt).
 *    - Reihenfolge der Kommentare = Reihenfolge der Antwortsätze. Text wird mit trim() gekürzt; leere und nur aus Leerraum bestehende Kommentare und Werte, die kein Text sind (Zahl, null), zählen nicht.
 *    - Der Plan-Schalter `einstellungen.pretest` ist für das LESEN ohne Bedeutung (Kommentare, die da sind, werden gezeigt); er steuert nur das Schreiben (Bibliothek) und die Variablen (variablenAusPlan).
 *    - Unbekannte Schlüssel (andere Variable, Frage mit anderer id) werden ignoriert; Groß-/Kleinschreibung der Namen zählt (Variablennamen sind in Statable nach der Namensregel eindeutig auch ohne Unterschied der Schreibweise).
 *    - Der Text wird nie als Befehl oder HTML ausgewertet (Rückgabe ist roher Text).
 *  anzahlKommentare(ergebnis: Record<string, string[]>): number       Summe aller Listen (für die Zahl im Gliederungsbaum und die Gesamtanzeige)
 */

type Mod = {
  kommentareJeFrage?: (p: FragebogenPlan, sets: Record<string, unknown>[]) => Record<string, string[]>;
  anzahlKommentare?: (e: Record<string, string[]>) => number;
};
let mod: Mod | null = null;
beforeAll(async () => { const pfad = './pretest'; mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null; });
function fn<K extends keyof Mod>(n: K): NonNullable<Mod[K]> {
  const f = mod?.[n];
  if (!f) throw new Error(`lib/pretest.ts: ${String(n)} fehlt (rot bis zum Bau)`);
  return f as NonNullable<Mod[K]>;
}

const zw = (t: string): Lok => ({ de: t, en: t + ' (en)' });
const frage = (id: string, name: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name, typ: 'text', text: zw(id), kodebuch: { niveau: 'nominal' }, ...extra });
const block = (id: string, name: string): Block => ({ art: 'block', id, name, text: zw(id), liste: 'l', items: [{ id: id + '-1', name: 'a', text: zw('a') }, { id: id + '-2', name: 'b', text: zw('b') }], kodebuch: { niveau: 'ordinal' } });
const seite = (id: string, elemente: Element[]): Seite => ({ art: 'seite', id, name: id, elemente });
// Element-id und Variablenname sind absichtlich verschieden (id „f-alter“, Name „alter“), damit beide Wege unterscheidbar sind.
const plan = (pretest: boolean): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p', revision: 1, titel: zw('T'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest, fehlendFilter: 'code' },
  antwortlisten: [{ id: 'l', name: 'l', geordnet: true, optionen: [1, 2].map(i => ({ id: `l:${i}`, wert: i, text: zw(`S${i}`) })) }], skalen: [],
  elemente: [seite('s1', [frage('f-alter', 'alter'), { art: 'hinweis', id: 'h', name: 'h', text: zw('Hinweis') }, frage('f-gruppe', 'gruppe')]), seite('s2', [block('b-zust', 'zust')])], geaendert: 1 });

describe('Kommentare je Frage aus Antworten lesen', () => {
  it('Schlüssel für jede Frage und jeden Block, nicht für Hinweis und Seite; ohne Antworten alles leer', () => {
    expect(fn('kommentareJeFrage')(plan(true), [])).toEqual({ 'f-alter': [], 'f-gruppe': [], 'b-zust': [] });
  });
  it('Bibliotheksschlüssel `<id>:kommentar`, in Reihenfolge der Antwortsätze, Blöcke mit einem Kommentar', () => {
    const e = fn('kommentareJeFrage')(plan(true), [
      { 'f-alter': 'x', 'f-alter:kommentar': 'Wen meinen Sie mit „Sie“?', 'b-zust:kommentar': 'Skala unklar' },
      { 'f-alter:kommentar': 'Zu persönlich' },
      { 'f-gruppe:kommentar': 'ok' }]);
    expect(e['f-alter']).toEqual(['Wen meinen Sie mit „Sie“?', 'Zu persönlich']);
    expect(e['f-gruppe']).toEqual(['ok']);
    expect(e['b-zust']).toEqual(['Skala unklar']);
  });
  it('Datensatz-Variable `<name>_kommentar` (auch für Blöcke `<blockname>_kommentar`)', () => {
    const e = fn('kommentareJeFrage')(plan(true), [{ alter_kommentar: 'zu direkt', zust_kommentar: 'Items ähnlich' }, { alter_kommentar: 'unklar' }]);
    expect(e['f-alter']).toEqual(['zu direkt', 'unklar']);
    expect(e['b-zust']).toEqual(['Items ähnlich']);
  });
  it('beide Schreibweisen im selben Satz zählen einmal, `<id>:kommentar` gewinnt; in verschiedenen Sätzen mischen sie sich', () => {
    const e = fn('kommentareJeFrage')(plan(true), [{ 'f-alter:kommentar': 'A', alter_kommentar: 'B' }, { alter_kommentar: 'C' }]);
    expect(e['f-alter']).toEqual(['A', 'C']);
  });
  it('leer, nur Leerraum, Zahl, null zählen nicht; Text wird getrimmt', () => {
    const e = fn('kommentareJeFrage')(plan(true), [{ 'f-alter:kommentar': '   ' }, { 'f-alter:kommentar': '' }, { alter_kommentar: 5 }, { alter_kommentar: null }, { 'f-alter:kommentar': '  gut so \n' }]);
    expect(e['f-alter']).toEqual(['gut so']);
  });
  it('unbekannte Schlüssel und andere Namen werden ignoriert; Groß-/Kleinschreibung zählt', () => {
    const e = fn('kommentareJeFrage')(plan(true), [{ 'gibt-es-nicht:kommentar': 'x', Alter_kommentar: 'y', gruppe: 'z', 'f-alter': 'nur Antwort' }]);
    expect(e).toEqual({ 'f-alter': [], 'f-gruppe': [], 'b-zust': [] });
  });
  it('pretest = false im Plan: vorhandene Kommentare werden trotzdem gelesen', () => {
    expect(fn('kommentareJeFrage')(plan(false), [{ 'f-alter:kommentar': 'da' }])['f-alter']).toEqual(['da']);
  });
  it('Text bleibt roh (kein HTML, kein Befehl ausgewertet)', () => {
    const roh = '<b>fett</b> & `x` ; DELETE VARIABLES ALL.';
    expect(fn('kommentareJeFrage')(plan(true), [{ 'f-alter:kommentar': roh }])['f-alter']).toEqual([roh]);
  });
  it('anzahlKommentare = Summe der Listen', () => {
    const e = fn('kommentareJeFrage')(plan(true), [{ 'f-alter:kommentar': 'a', 'b-zust:kommentar': 'b' }, { alter_kommentar: 'c' }]);
    expect(fn('anzahlKommentare')(e)).toBe(3);
    expect(fn('anzahlKommentare')({})).toBe(0);
  });
});

describe('Pretest-Kommentare: hin und zurück mit den Variablen des Plans', () => {
  it('variablenAusPlan nennt bei pretest `<name>_kommentar` je Frage und je Block (Rolle text), ohne pretest keine', () => {
    const mit = variablenAusPlan(plan(true), 'de').filter(v => v.quelle.teil === 'kommentar');
    expect(mit.map(v => [v.name, v.quelle.element])).toEqual([['alter_kommentar', 'f-alter'], ['gruppe_kommentar', 'f-gruppe'], ['zust_kommentar', 'b-zust']]);
    expect(variablenAusPlan(plan(false), 'de').filter(v => v.quelle.teil === 'kommentar')).toEqual([]);
  });
  it('jede Kommentar-Variable des Plans wird von kommentareJeFrage unter der richtigen Frage gelesen', () => {
    const p = plan(true);
    const satz: Record<string, unknown> = {};
    for (const v of variablenAusPlan(p, 'de').filter(x => x.quelle.teil === 'kommentar')) satz[v.name] = `Kommentar zu ${v.quelle.element}`;
    const e = fn('kommentareJeFrage')(p, [satz]);
    for (const id of ['f-alter', 'f-gruppe', 'b-zust']) expect(e[id]).toEqual([`Kommentar zu ${id}`]);
  });
});
