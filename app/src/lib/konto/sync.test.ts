import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ladeProjekt, listeProjekte, loescheProjekt, speichereProjekt, type Projekt } from '../ablage';
import { projektAlsDatei } from '../projektdatei';
import { gleicheAb, holeNurFern, loeseKonflikt, loescheImKonto, plane, type FernEintrag, type Gegenstelle, type Stand, type StandSpeicher } from './sync';

const projekt = (name: string, zeit: number): Projekt => ({ name, quelle: 'a.csv', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit, spalten: 2, faelle: 5 });

/** Ein Konto im Speicher. */
function fake() {
  const satz = new Map<string, { e: FernEintrag; text: Uint8Array }>(); let n = 0; const aufrufe: string[] = [];
  const g: Gegenstelle & { satz: typeof satz; aufrufe: string[]; aus: boolean } = {
    satz, aufrufe, aus: false,
    async liste() { if (g.aus) throw new TypeError('Failed to fetch'); aufrufe.push('liste'); return [...satz.values()].map(x => x.e); },
    async hoch(cid, text, meta, vorhanden) {
      if (g.aus) throw new TypeError('Failed to fetch'); aufrufe.push('hoch:' + cid);
      const e: FernEintrag = { cid, satzId: vorhanden?.satzId ?? 'r' + ++n, name: meta.name, zeit: meta.zeit, spalten: meta.spalten, faelle: meta.faelle };
      satz.set(cid, { e, text }); return e;
    },
    async runter(e) { aufrufe.push('runter:' + e.cid); return satz.get(e.cid)!.text; },
    async loesche(e) { satz.delete(e.cid); }
  };
  return g;
}
const merker = (anfang: Stand = {}): StandSpeicher & { s: Stand } => { const m = { s: anfang, lies: () => ({ ...m.s }), schreibe: (x: Stand) => { m.s = { ...x }; } }; return m; };

beforeEach(async () => { for (const e of await listeProjekte()) await loescheProjekt(e.id); });

describe('plane', () => {
  const l = (id: string, zeit: number) => ({ id, name: id, zeit, blaetter: 0, groesse: 3 });
  const f = (cid: string, zeit: number): FernEintrag => ({ cid, satzId: 'x', name: cid, zeit });
  it('trennt hoch, runter, gleich, Konflikt, nur im Konto', () => {
    const a = plane([l('neu', 5), l('gl', 3), l('lok', 9), l('fer', 4), l('kon', 8)], [f('gl', 3), f('lok', 5), f('fer', 7), f('kon', 6), f('nur', 1)], { gl: 3, lok: 5, fer: 4, kon: 5 });
    expect(Object.fromEntries(a.map(x => [x.cid, x.art]))).toEqual({ neu: 'hoch', gl: 'gleich', lok: 'hoch', fer: 'runter', kon: 'konflikt', nur: 'nurFern' });
  });
  it('ohne gemerkten Stand und mit verschiedenen Zeiten fragt es nach, statt zu überschreiben', () => {
    expect(plane([l('a', 2)], [f('a', 1)], {})[0]!.art).toBe('konflikt');
  });
});

describe('Abgleich', () => {
  it('lädt neue lokale Projekte hoch und merkt sich den Stand', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(), m = merker();
    const r = await gleicheAb(g, m);
    expect(r.hoch).toBe(1); expect(g.satz.get(id)?.e).toMatchObject({ name: 'A', zeit: 100 }); expect(m.s[id]).toBe(100);
    expect((await gleicheAb(g, m)).hoch).toBe(0);   // nichts Neues → nichts mehr hochgeladen
  });
  it('lädt Änderungen aus dem Konto herunter (Zeit und Inhalt), solange hier nichts geändert wurde', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(), m = merker();
    await gleicheAb(g, m);
    g.satz.set(id, { e: { ...g.satz.get(id)!.e, name: 'A neu', zeit: 200 }, text: projektAlsDatei({ ...projekt('A neu', 200) }) });
    const r = await gleicheAb(g, m);
    expect(r.runter).toBe(1); const p = await ladeProjekt(id); expect(p).toMatchObject({ name: 'A neu', zeit: 200 }); expect(m.s[id]).toBe(200);
  });
  it('überschreibt bei Änderung auf beiden Seiten nichts, sondern meldet einen Konflikt', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(), m = merker();
    await gleicheAb(g, m);
    await speichereProjekt({ ...projekt('A lokal', 300), id });
    g.satz.set(id, { e: { ...g.satz.get(id)!.e, name: 'A fern', zeit: 250 }, text: projektAlsDatei(projekt('A fern', 250)) });
    g.aufrufe.length = 0;
    const r = await gleicheAb(g, m);
    expect(r.konflikte).toHaveLength(1); expect(g.aufrufe.filter(a => a !== 'liste')).toEqual([]);
    expect((await ladeProjekt(id))?.name).toBe('A lokal');
    // Wahl „Konto“
    await loeseKonflikt(g, m, r.konflikte[0]!, 'fern'); expect(await ladeProjekt(id)).toMatchObject({ name: 'A fern', zeit: 250 });
  });
  it('Konflikt: „diese Version behalten“ lädt hoch; „beide“ legt eine Kopie an', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(), m = merker();
    await gleicheAb(g, m);
    await speichereProjekt({ ...projekt('A lokal', 300), id });
    g.satz.set(id, { e: { ...g.satz.get(id)!.e, name: 'A fern', zeit: 250 }, text: projektAlsDatei(projekt('A fern', 250)) });
    const k = (await gleicheAb(g, m)).konflikte[0]!;
    const kopie = await loeseKonflikt(g, m, k, 'beide');
    expect(kopie).toBeTruthy(); expect((await ladeProjekt(kopie!))?.name).toBe('A fern (Konto)');
    expect(g.satz.get(id)?.e.zeit).toBe(300); expect((await ladeProjekt(id))?.name).toBe('A lokal');
  });
  it('bietet Projekte nur im Konto an, lädt sie nicht von selbst; holen und löschen gehen einzeln', async () => {
    const g = fake(), m = merker();
    g.satz.set('abcdef1', { e: { cid: 'abcdef1', satzId: 'r9', name: 'Fern', zeit: 50, spalten: 1, faelle: 2 }, text: projektAlsDatei(projekt('Fern', 50)) });
    const r = await gleicheAb(g, m);
    expect(r.nurFern).toHaveLength(1); expect(await listeProjekte()).toHaveLength(0);
    await holeNurFern(g, m, r.nurFern[0]!); expect((await listeProjekte())[0]!).toMatchObject({ id: 'abcdef1', name: 'Fern', spalten: 1 });
    await loescheImKonto(g, m, r.nurFern[0]!); expect(g.satz.size).toBe(0);
  });
  it('ersetzt das gerade offene Projekt nicht', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(), m = merker();
    await gleicheAb(g, m);
    g.satz.set(id, { e: { ...g.satz.get(id)!.e, zeit: 200 }, text: projektAlsDatei(projekt('A fern', 200)) });
    const r = await gleicheAb(g, m, { istOffen: x => x === id });
    expect(r.uebersprungen).toEqual([id]); expect((await ladeProjekt(id))?.zeit).toBe(100);
  });
  it('ohne Netz: Fehler wird gemeldet, lokale Projekte bleiben unberührt', async () => {
    const id = await speichereProjekt(projekt('A', 100)); const g = fake(); g.aus = true;
    await expect(gleicheAb(g, merker())).rejects.toThrow('Failed to fetch');
    expect((await ladeProjekt(id))?.name).toBe('A');
  });
});
