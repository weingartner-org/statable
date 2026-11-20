/* Prüfer-Test 3E/3F - der Bauer ändert diese Datei nicht.
 *
 * Paket 3E (Prüfer, ROTE TESTS vor dem Bau): Sammelimport. Neue Datei: lib/sammelimport.ts
 * Grundlage: docs/erheben/FACHBLATT-STUFE-3.md, Abschnitt „Entscheide 3E/3F vor den Prüfer-Tests“ (die Schnittstellen dort sind verbindlich).
 *
 * Zusätzliche Festlegungen des Prüfers (wo das Fachblatt offen lässt; steht auch im Bericht an Opus):
 *  - zerlegeEingaben: Dateien werden in Eingabereihenfolge zerlegt, danach der eingefügte Text. `quelle` eines Stücks aus einer Textdatei enthält den Dateinamen;
 *    mehrere Blöcke derselben Datei haben verschiedene `quelle`. Ein Eingabestück ohne gültigen age-Inhalt (Fremdtext, andere Binärdatei, leere Datei) ergibt GENAU EIN Stück mit daten === ''.
 *  - entschluesseleAlle wirft nie wegen eines einzelnen Stücks: jedes Stück ergibt genau einen Eingang (gleiche Reihenfolge, gleiche `quelle`), Fehler stehen in `fehler`.
 *    daten '' → 'keinAge'; Armor/Binär > 1 MB → 'zu-gross'; falscher Schlüssel → 'falsche-identitaet'; nicht lesbar → 'kaputt'.
 *    Fortschritt: fortschritt(fertig, gesamt) mit gesamt = Zahl der Stücke, fertig nie fallend, letzter Aufruf (gesamt, gesamt), bei leerer Liste kein Aufruf nötig.
 *  - pruefeEingaenge: Regeln 1-6 des Fachblatts in genau dieser Reihenfolge (Vorrang). zeilen in Eingangsreihenfolge, eine Zeile je Eingang. `saetze` = die Sätze der Zeilen mit uebernehmen === true (Reihenfolge der Eingänge).
 *    `zahlen` hat IMMER alle zehn Schlüssel (auch mit 0). `uebernehmen`: nur bei uebernommen, andereRevision, unbekannterCode, doppelterCode, ohneCode true.
 *    Doppelter Code: der ERSTE Satz mit dem Code bleibt 'uebernommen', erst der zweite und jeder weitere ist 'doppelterCode' („ab der zweiten“).
 *    `hinweis` der andereRevision nennt die Element-ids aus `werte`, die der Plan nicht kennt (Fragen und Block-Items), und nicht die bekannten.
 *  - durchgangAusSaetzen: { [antwortId]: werte }, Reihenfolge der Sätze.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Antwortliste, Block, Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';
import { verschluesseleAntwort, type Antwortsatz } from './antwortsatz';
import { neuesSchluesselpaar } from './schluessel';
import { datensatzTabelle } from './doppeleingabe-daten';
import { durchgangAusSaetzen, entschluesseleAlle, pruefeEingaenge, zerlegeEingaben, type Eingang, type Stueck } from './sammelimport';

const BEGIN = '-----BEGIN AGE ENCRYPTED FILE-----';
const END = '-----END AGE ENCRYPTED FILE-----';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bytesVon = (s: string) => new TextEncoder().encode(s);

/* ---------------------------------- Baukasten ---------------------------------- */
const lok = (t: string): Lok => ({ de: t, en: `${t} (en)` });
const liste: Antwortliste = { id: 'l', name: 'l', geordnet: true, optionen: [1, 2, 3].map(i => ({ id: `l:${i}`, wert: i, text: lok(`S${i}`) })) };
const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name: id, typ: 'zahl', text: lok(id), zahl: { ganz: true }, kodebuch: { niveau: 'skala' }, ...extra });
const seite = (id: string, elemente: Seite['elemente']): Seite => ({ art: 'seite', id, name: id, elemente });
const planMit = (id: string, revision: number, seiten: Seite[]): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id, revision, titel: lok('Test'), sprachen: ['de'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [liste], skalen: [], elemente: seiten, geaendert: 1,
});
const block: Block = { art: 'block', id: 'b', name: 'b', text: lok('B'), liste: 'l', kodebuch: { niveau: 'ordinal' }, items: ['i1', 'i2'].map(i => ({ id: i, name: i, text: lok(i) })) };
/** Plan für die Prüfregeln: Fragen q1, q2 und ein Block mit den Items i1, i2. */
const PLAN = planMit('p-1', 1, [seite('s1', [frage('q1'), frage('q2'), block])]);
/** Plan für die Tabelle: einfache Frage, Mehrfachfrage (3 Optionen), Zahl. */
const TABELLENPLAN = planMit('p-1', 1, [seite('s1', [
  frage('q1', { typ: 'einfach', liste: 'l', zahl: undefined, kodebuch: { niveau: 'ordinal' } }),
  frage('m', { typ: 'mehrfach', liste: 'l', zahl: undefined, kodebuch: { niveau: 'nominal' } }),
  frage('z'),
])]);

const satz = (n: number, extra: Partial<Antwortsatz> = {}): Antwortsatz => ({
  format: 'statable-antwort', version: 1, plan: { id: 'p-1', revision: 1 }, antwortId: uid(n), werte: { q1: 1, q2: 2 }, ...extra,
});
const ein = (s: Antwortsatz, quelle = `datei-${s.antwortId.slice(-3)}.age`): Eingang => ({ quelle, satz: s });
const CODES = [{ code: 'AAAA-BBBB' }, { code: 'CCCC-DDDD' }, { code: 'EEEE-FFFF' }];
const zustaende = (p: ReturnType<typeof pruefeEingaenge>) => p.zeilen.map(z => z.zustand);

let paar: { identitaet: string; empfaenger: string };
let fremd: { identitaet: string; empfaenger: string };
beforeAll(async () => { paar = await neuesSchluesselpaar(); fremd = await neuesSchluesselpaar(); });
const armorVon = (s: Antwortsatz) => verschluesseleAntwort(s, paar.empfaenger, 'text');
const binaerVon = (s: Antwortsatz) => verschluesseleAntwort(s, paar.empfaenger, 'binaer');

/* ---------------------------------- zerlegeEingaben ---------------------------------- */
describe('zerlegeEingaben', () => {
  it('Binärdatei (beginnt mit „age-encryption.org/v1“) → ein Stück mit den Bytes, quelle = Dateiname', async () => {
    const b = await binaerVon(satz(1));
    const r = zerlegeEingaben([{ name: 'antwort-1.age', bytes: b }]);
    expect(r).toHaveLength(1);
    expect(r[0]!.quelle).toBe('antwort-1.age');
    expect(r[0]!.daten).toBeInstanceOf(Uint8Array);
    expect(Array.from(r[0]!.daten as Uint8Array)).toEqual(Array.from(b));
  });

  it('Textdatei mit 3 Armor-Blöcken und Fremdtext dazwischen → 3 Stücke, Fremdtext fällt weg', async () => {
    const [a, b, c] = (await Promise.all([1, 2, 3].map(n => armorVon(satz(n))))) as [string, string, string];
    const text = `Hallo Johannes,\nanbei die ersten Antworten.\n\n${a}\nZwischentext FREMD-1\n\n${b}\n\n\nGrüße, Eva  FREMD-2\n${c}\nNachsatz FREMD-3\n`;
    const r = zerlegeEingaben([{ name: 'statable-sicherung-2026-11-08-1.txt', bytes: bytesVon(text) }]);
    expect(r).toHaveLength(3);
    r.forEach(s => {
      expect(typeof s.daten).toBe('string');
      const d = s.daten as string;
      expect(d.startsWith(BEGIN)).toBe(true);
      expect(d.trimEnd().endsWith(END)).toBe(true);
      expect(d).not.toMatch(/FREMD|Hallo|Grüße/);
      expect(s.quelle).toContain('statable-sicherung-2026-11-08-1.txt');
    });
    expect(new Set(r.map(s => s.quelle)).size).toBe(3);
    expect((r[0]!.daten as string).trim()).toBe(a.trim());
    expect((r[1]!.daten as string).trim()).toBe(b.trim());
    expect((r[2]!.daten as string).trim()).toBe(c.trim());
  });

  it('eingefügter Text (zweites Argument) mit 3 Blöcken → 3 Stücke; die Quelle des dritten nennt „3“; Dateien kommen vor dem Text', async () => {
    const [a, b, c, d] = (await Promise.all([1, 2, 3, 4].map(n => armorVon(satz(n))))) as [string, string, string, string];
    const r = zerlegeEingaben([{ name: 'eine.txt', bytes: bytesVon(d) }], `${a}\n\n${b}\n\n${c}`);
    expect(r).toHaveLength(4);
    expect(r[0]!.quelle).toContain('eine.txt');
    expect((r[1]!.daten as string).trim()).toBe(a.trim());
    expect((r[3]!.daten as string).trim()).toBe(c.trim());
    expect(r[3]!.quelle).toMatch(/3/);
    expect(new Set(r.map(s => s.quelle)).size).toBe(4);
  });

  it('nur eingefügter Text ohne Dateien geht', async () => {
    const a = await armorVon(satz(1));
    expect(zerlegeEingaben([], a)).toHaveLength(1);
    expect(zerlegeEingaben([], undefined)).toEqual([]);
    expect(zerlegeEingaben([])).toEqual([]);
  });

  it('Datei ohne age-Inhalt (Fremdtext, andere Binärdatei, leer) → genau ein Stück mit daten \'\', dann Zustand keinAge', async () => {
    const r = zerlegeEingaben([
      { name: 'brief.txt', bytes: bytesVon('Liebe Grüße, das ist kein age.') },
      { name: 'bild.png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]) },
      { name: 'leer.txt', bytes: new Uint8Array(0) },
    ]);
    expect(r).toHaveLength(3);
    expect(r.map(s => s.daten)).toEqual(['', '', '']);
    expect(r.map(s => s.quelle)).toEqual(['brief.txt', 'bild.png', 'leer.txt']);
    const e = await entschluesseleAlle(r, paar.identitaet);
    expect(e.map(x => x.fehler)).toEqual(['keinAge', 'keinAge', 'keinAge']);
    expect(e.every(x => x.satz === undefined)).toBe(true);
    const p = pruefeEingaenge(PLAN, e);
    expect(zustaende(p)).toEqual(['keinAge', 'keinAge', 'keinAge']);
    expect(p.saetze).toEqual([]);
  });

  it('Block über 1 MB wird als ein Stück geliefert und später als zu-gross gemeldet, die anderen Blöcke der Datei bleiben nutzbar', async () => {
    const gut = await armorVon(satz(1));
    const riesig = `${BEGIN}\n${`${'A'.repeat(64)}\n`.repeat(16_000)}${END}\n`;
    expect(riesig.length).toBeGreaterThan(1_000_000);
    const r = zerlegeEingaben([{ name: 'gross.txt', bytes: bytesVon(`${gut}\n${riesig}\n${gut}`) }]);
    expect(r).toHaveLength(3);
    expect((r[1]!.daten as string).length).toBeGreaterThan(1_000_000);
    const e = await entschluesseleAlle(r, paar.identitaet);
    expect(e[1]!.fehler).toBe('zu-gross');
    expect(e[0]!.satz?.antwortId).toBe(uid(1));
    expect(e[2]!.satz?.antwortId).toBe(uid(1));
  });

  it('Dateien und Text mischen: Binär und Armor in einem Aufruf, Reihenfolge bleibt', async () => {
    const r = zerlegeEingaben(
      [{ name: 'a.age', bytes: await binaerVon(satz(1)) }, { name: 'b.txt', bytes: bytesVon(await armorVon(satz(2))) }],
      await armorVon(satz(3)),
    );
    expect(r).toHaveLength(3);
    expect(r[0]!.daten).toBeInstanceOf(Uint8Array);
    expect(typeof r[1]!.daten).toBe('string');
    expect(typeof r[2]!.daten).toBe('string');
  });
});

/* ---------------------------------- entschluesseleAlle ---------------------------------- */
describe('entschluesseleAlle', () => {
  it('richtige Identität: Binär und Armor ergeben die Antwortsätze, quelle und Reihenfolge bleiben', async () => {
    const stuecke: Stueck[] = [
      { quelle: 'eins', daten: await binaerVon(satz(1)) },
      { quelle: 'zwei', daten: await armorVon(satz(2, { code: 'AAAA-BBBB', start: '2026-11-08', werte: { q1: 3, q2: null } })) },
    ];
    const e = await entschluesseleAlle(stuecke, paar.identitaet);
    expect(e.map(x => x.quelle)).toEqual(['eins', 'zwei']);
    expect(e[0]!.satz).toEqual(satz(1));
    expect(e[1]!.satz).toEqual(satz(2, { code: 'AAAA-BBBB', start: '2026-11-08', werte: { q1: 3, q2: null } }));
    expect(e.every(x => x.fehler === undefined)).toBe(true);
  });

  it('falsche Identität → fehler falsche-identitaet, kein Satz; der Rest bleibt unberührt', async () => {
    const stuecke: Stueck[] = [{ quelle: 'a', daten: await armorVon(satz(1)) }];
    const e = await entschluesseleAlle(stuecke, fremd.identitaet);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ quelle: 'a', fehler: 'falsche-identitaet' });
    expect(e[0]!.satz).toBeUndefined();
  });

  it('kaputte Blöcke (Armor ohne gültige Base64-Zeilen, abgeschnittene Binärdatei) → kaputt, andere Stücke werden trotzdem geöffnet', async () => {
    const b = await binaerVon(satz(2));
    const stuecke: Stueck[] = [
      { quelle: 'k1', daten: `${BEGIN}\n!!!! kein base64 !!!!\n${END}\n` },
      { quelle: 'gut', daten: await armorVon(satz(1)) },
      { quelle: 'k2', daten: b.slice(0, 30) },
    ];
    const e = await entschluesseleAlle(stuecke, paar.identitaet);
    expect(e.map(x => x.fehler)).toEqual(['kaputt', undefined, 'kaputt']);
    expect(e[1]!.satz?.antwortId).toBe(uid(1));
  });

  it('entschlüsselbar, aber kein Antwortsatz (anderer Inhalt) → kaputt', async () => {
    const { Encrypter } = await import('age-encryption');
    const x = new Encrypter(); x.addRecipient(paar.empfaenger);
    const bytes = await x.encrypt(JSON.stringify({ hallo: 'welt' }));
    const e = await entschluesseleAlle([{ quelle: 'f', daten: bytes }], paar.identitaet);
    expect(e[0]!.fehler).toBe('kaputt');
  });

  it('Fortschritt: (fertig, gesamt) mit gesamt = Zahl der Stücke, fertig steigt nie, zuletzt (gesamt, gesamt)', async () => {
    const stuecke: Stueck[] = [];
    for (let n = 1; n <= 5; n++) stuecke.push({ quelle: `s${n}`, daten: n % 2 ? await armorVon(satz(n)) : await binaerVon(satz(n)) });
    const aufrufe: [number, number][] = [];
    const e = await entschluesseleAlle(stuecke, paar.identitaet, (f, g) => aufrufe.push([f, g]));
    expect(e).toHaveLength(5);
    expect(aufrufe.length).toBeGreaterThanOrEqual(1);
    expect(aufrufe.every(([, g]) => g === 5)).toBe(true);
    expect(aufrufe.every(([f]) => f >= 0 && f <= 5)).toBe(true);
    for (let i = 1; i < aufrufe.length; i++) expect(aufrufe[i]![0]).toBeGreaterThanOrEqual(aufrufe[i - 1]![0]);
    expect(aufrufe[aufrufe.length - 1]).toEqual([5, 5]);
  });

  it('leere Liste → leeres Ergebnis', async () => {
    expect(await entschluesseleAlle([], paar.identitaet)).toEqual([]);
  });
});

/* ---------------------------------- pruefeEingaenge ---------------------------------- */
describe('pruefeEingaenge: Regel 1 (Fehler beim Entschlüsseln)', () => {
  it('falsche-identitaet → nichtEntschluesselbar, kaputt → kaputt, keinAge → keinAge; nie übernommen, nie in saetze', () => {
    const p = pruefeEingaenge(PLAN, [
      { quelle: 'a', fehler: 'falsche-identitaet' }, { quelle: 'b', fehler: 'kaputt' }, { quelle: 'c', fehler: 'keinAge' }, ein(satz(1)),
    ]);
    expect(zustaende(p)).toEqual(['nichtEntschluesselbar', 'kaputt', 'keinAge', 'uebernommen']);
    expect(p.zeilen.map(z => z.uebernehmen)).toEqual([false, false, false, true]);
    expect(p.zeilen.map(z => z.quelle)).toEqual(['a', 'b', 'c', 'datei-001.age']);
    expect(p.saetze).toEqual([satz(1)]);
    expect(p.zeilen[0]!.antwortId).toBeUndefined();
  });
});

describe('pruefeEingaenge: Regel 2 (anderer Plan) und Regel 3 (andere Revision)', () => {
  it('andere Plan-id → andererPlan, nicht übernommen', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { plan: { id: 'fremd', revision: 1 } }))]);
    expect(zustaende(p)).toEqual(['andererPlan']);
    expect(p.zeilen[0]).toMatchObject({ uebernehmen: false, antwortId: uid(1) });
    expect(p.saetze).toEqual([]);
  });

  it('Vorrang: dieselbe antwortId, aber fremder Plan → andererPlan (nicht doppelt)', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1)), ein(satz(1, { plan: { id: 'fremd', revision: 1 } }), 'zweite.age')]);
    expect(zustaende(p)).toEqual(['uebernommen', 'andererPlan']);
    expect(p.saetze).toHaveLength(1);
  });

  it('andere Revision (gleiche Plan-id) → andereRevision, WIRD übernommen; Hinweis nennt die Element-ids, die der Plan nicht kennt', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { plan: { id: 'p-1', revision: 2 }, werte: { q1: 1, i1: 2, 'frage-alt': 3, 'frage-alt-2': 'x' } }))]);
    expect(zustaende(p)).toEqual(['andereRevision']);
    expect(p.zeilen[0]!.uebernehmen).toBe(true);
    expect(p.saetze).toHaveLength(1);
    const h = p.zeilen[0]!.hinweis ?? '';
    expect(h).toContain('frage-alt');
    expect(h).toContain('frage-alt-2');
    expect(h).not.toMatch(/\bq1\b/);
    expect(h).not.toMatch(/\bi1\b/);
  });

  it('andere Revision ohne fehlende Element-ids: trotzdem andereRevision und übernommen; ältere Revision genauso', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { plan: { id: 'p-1', revision: 5 } })), ein(satz(2, { plan: { id: 'p-1', revision: 0 } }))]);
    expect(zustaende(p)).toEqual(['andereRevision', 'andereRevision']);
    expect(p.zeilen.every(z => z.uebernehmen)).toBe(true);
    expect(p.zeilen[0]!.hinweis ?? '').not.toContain('q2');
  });

  it('Vorrang: andereRevision (Regel 3) schlägt unbekannterCode (Regel 5), bleibt aber übernommen', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { plan: { id: 'p-1', revision: 2 }, code: 'GGGG-HHHH' }))], CODES);
    expect(zustaende(p)).toEqual(['andereRevision']);
    expect(p.zeilen[0]!.uebernehmen).toBe(true);
  });
});

describe('pruefeEingaenge: Regel 4 (doppelte antwortId)', () => {
  it('die erste bleibt übernommen, zweite und dritte sind doppelt und nicht übernommen', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1), 'x1'), ein(satz(2)), ein(satz(1, { werte: { q1: 9 } }), 'x2'), ein(satz(1), 'x3')]);
    expect(zustaende(p)).toEqual(['uebernommen', 'uebernommen', 'doppelt', 'doppelt']);
    expect(p.zeilen.map(z => z.uebernehmen)).toEqual([true, true, false, false]);
    expect(p.saetze.map(s => s.antwortId)).toEqual([uid(1), uid(2)]);
    expect(p.saetze[0]!.werte).toEqual({ q1: 1, q2: 2 });     // die erste bleibt, nicht die spätere
  });

  it('Vorrang: doppelte antwortId mit demselben Code ist doppelt, nicht doppelterCode', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(1, { code: 'AAAA-BBBB' }))], CODES);
    expect(zustaende(p)).toEqual(['uebernommen', 'doppelt']);
  });
});

describe('pruefeEingaenge: Regel 5 (Codes, nur wenn der Plan Codes hat)', () => {
  it('ohne Codes (undefined oder leere Liste) wird nichts markiert, auch nicht bei vorhandenem oder fehlendem Code', () => {
    const e = [ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(2)), ein(satz(3, { code: 'AAAA-BBBB' }))];
    expect(zustaende(pruefeEingaenge(PLAN, e))).toEqual(['uebernommen', 'uebernommen', 'uebernommen']);
    expect(zustaende(pruefeEingaenge(PLAN, e, []))).toEqual(['uebernommen', 'uebernommen', 'uebernommen']);
  });

  it('Code fehlt → ohneCode; Code nicht in der Liste → unbekannterCode; beide werden übernommen und nur markiert', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1)), ein(satz(2, { code: '' })), ein(satz(3, { code: 'GGGG-HHHH' })), ein(satz(4, { code: 'AAAA-BBBB' }))], CODES);
    expect(zustaende(p)).toEqual(['ohneCode', 'ohneCode', 'unbekannterCode', 'uebernommen']);
    expect(p.zeilen.every(z => z.uebernehmen)).toBe(true);
    expect(p.saetze).toHaveLength(4);
  });

  it('Codes werden normalisiert verglichen: klein, ohne Bindestrich, mit Leerzeichen sind gleich', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'aaaabbbb' })), ein(satz(2, { code: 'cccc dddd' })), ein(satz(3, { code: ' EEEE-ffff ' }))], CODES);
    expect(zustaende(p)).toEqual(['uebernommen', 'uebernommen', 'uebernommen']);
  });

  it('Codes in der Liste dürfen selbst klein oder ohne Bindestrich stehen', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'AAAA-BBBB' }))], [{ code: 'aaaabbbb' }]);
    expect(zustaende(p)).toEqual(['uebernommen']);
  });

  it('derselbe Code bei zwei verschiedenen antwortIds: der erste bleibt uebernommen, ab dem zweiten doppelterCode (auch bei anderer Schreibweise); übernommen und markiert', () => {
    const p = pruefeEingaenge(PLAN, [
      ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(2, { code: 'aaaabbbb' })), ein(satz(3, { code: 'AAAA BBBB' })), ein(satz(4, { code: 'CCCC-DDDD' })),
    ], CODES);
    expect(zustaende(p)).toEqual(['uebernommen', 'doppelterCode', 'doppelterCode', 'uebernommen']);
    expect(p.zeilen.every(z => z.uebernehmen)).toBe(true);
    expect(p.saetze.map(s => s.antwortId)).toEqual([uid(1), uid(2), uid(3), uid(4)]);
  });

  it('ein Eintrag der Liste mit ausgegeben-Angabe wird wie ein normaler Eintrag geprüft', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'AAAA-BBBB' }))], [{ code: 'AAAA-BBBB', ausgegeben: true }]);
    expect(zustaende(p)).toEqual(['uebernommen']);
  });
});

describe('pruefeEingaenge: Regel 6, Zeilen und Zahlen', () => {
  it('ohne Auffälligkeit: uebernommen, antwortId und code stehen in der Zeile', () => {
    const p = pruefeEingaenge(PLAN, [ein(satz(1, { code: 'AAAA-BBBB' }), 'meine.age')], CODES);
    expect(p.zeilen).toHaveLength(1);
    expect(p.zeilen[0]).toMatchObject({ quelle: 'meine.age', antwortId: uid(1), zustand: 'uebernommen', uebernehmen: true });
    expect(p.zeilen[0]!.code).toBeTruthy();
  });

  it('leere Eingabe → leere Prüfung mit allen zehn Zählern 0', () => {
    const p = pruefeEingaenge(PLAN, []);
    expect(p.zeilen).toEqual([]);
    expect(p.saetze).toEqual([]);
    expect(p.zahlen).toEqual({
      uebernommen: 0, doppelt: 0, andererPlan: 0, andereRevision: 0, unbekannterCode: 0, doppelterCode: 0, ohneCode: 0, nichtEntschluesselbar: 0, kaputt: 0, keinAge: 0,
    });
  });

  it('zahlen zählt je Zustand; Summe = Zahl der Eingänge', () => {
    const p = pruefeEingaenge(PLAN, [
      ein(satz(1, { code: 'AAAA-BBBB' })), ein(satz(2, { code: 'CCCC-DDDD' })),                       // uebernommen x2
      ein(satz(1, { code: 'AAAA-BBBB' }), 'doppelt.age'),                                              // doppelt
      ein(satz(3, { plan: { id: 'fremd', revision: 1 }, code: 'AAAA-BBBB' })),                         // andererPlan
      ein(satz(4, { plan: { id: 'p-1', revision: 3 }, code: 'EEEE-FFFF' })),                           // andereRevision
      ein(satz(5, { code: 'GGGG-HHHH' })),                                                             // unbekannterCode
      ein(satz(6, { code: 'cccc-dddd' })),                                                             // doppelterCode (Code von antwortId 2)
      ein(satz(7)),                                                                                    // ohneCode
      { quelle: 'x', fehler: 'falsche-identitaet' }, { quelle: 'y', fehler: 'kaputt' }, { quelle: 'z', fehler: 'keinAge' },
    ], CODES);
    expect(p.zahlen).toEqual({
      uebernommen: 2, doppelt: 1, andererPlan: 1, andereRevision: 1, unbekannterCode: 1, doppelterCode: 1, ohneCode: 1, nichtEntschluesselbar: 1, kaputt: 1, keinAge: 1,
    });
    expect(Object.values(p.zahlen).reduce((a, b) => a + b, 0)).toBe(p.zeilen.length);
    // übernommen werden: 2 + andereRevision + unbekannterCode + doppelterCode + ohneCode
    expect(p.saetze.map(s => s.antwortId)).toEqual([uid(1), uid(2), uid(4), uid(5), uid(6), uid(7)]);
    expect(p.zeilen.filter(z => z.uebernehmen)).toHaveLength(6);
  });

  it('verändert die Eingaben nicht', () => {
    const e = [ein(satz(1)), ein(satz(1))];
    const kopie = JSON.stringify(e);
    pruefeEingaenge(PLAN, e, CODES);
    expect(JSON.stringify(e)).toBe(kopie);
  });
});

/* ---------------------------------- durchgangAusSaetzen + datensatzTabelle ---------------------------------- */
describe('durchgangAusSaetzen und datensatzTabelle', () => {
  it('Schlüssel = antwortId, Wert = werte, Reihenfolge der Sätze', () => {
    const d = durchgangAusSaetzen([satz(2, { werte: { q1: 2 } }), satz(1, { werte: { q1: 1 } })]);
    expect(Object.keys(d)).toEqual([uid(2), uid(1)]);
    expect(d[uid(2)]).toEqual({ q1: 2 });
    expect(durchgangAusSaetzen([])).toEqual({});
  });

  it('ergibt über datensatzTabelle richtige Zeilen: antwortId vorn, Mehrfach als 0/1, fehlende Werte null, unbekannte Element-ids fallen weg', () => {
    const d = durchgangAusSaetzen([
      satz(1, { werte: { q1: 2, m: [1, 3], z: 5 } }),
      satz(2, { werte: { q1: 1, m: [2], 'frage-alt': 9 } }),
      satz(3, { werte: { z: 7 } }),
    ]);
    const t = datensatzTabelle(TABELLENPLAN, d, 'de');
    expect(t.spalten.map(s => s.name)).toEqual(['bogen', 'q1', 'm_1', 'm_2', 'm_3', 'z']);
    expect(t.zeilen).toEqual([
      [uid(1), 2, 1, 0, 1, 5],
      [uid(2), 1, 0, 1, 0, null],
      [uid(3), null, null, null, null, 7],
    ]);
  });
});
