import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AblageKonflikt, benenneProjektUm, istSpeicherVoll, ladeProjekt, listeProjekte, loescheProjekt, speichereProjekt, type Projekt } from './ablage';

const projekt = (name: string, zeit: number, extra: Partial<Projekt> = {}): Projekt => ({ name, quelle: 'test.csv', sav: new Uint8Array([1, 2, 3, 4]), blaetter: [], entscheid: {}, zeit, spalten: 3, faelle: 10, ...extra });

beforeEach(async () => { for (const e of await listeProjekte()) await loescheProjekt(e.id); });

describe('Ablage mit mehreren Projekten', () => {
  it('legt Projekte unter eigener id ab, die Liste nennt das zuletzt bearbeitete zuerst', async () => {
    const a = await speichereProjekt(projekt('Beispiel', 1000));
    const b = await speichereProjekt(projekt('Umfrage', 2000, { blaetter: [{} as never, {} as never] }));
    expect(a).not.toBe(b);
    const liste = await listeProjekte();
    expect(liste.map(e => e.name)).toEqual(['Umfrage', 'Beispiel']);
    expect(liste[0]).toMatchObject({ id: b, blaetter: 2, spalten: 3, faelle: 10, groesse: 4 });
    expect((await ladeProjekt(a))?.sav).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
  it('überschreibt ein Projekt mit derselben id statt es zu verdoppeln', async () => {
    const id = await speichereProjekt(projekt('A', 1));
    await speichereProjekt({ ...projekt('A', 5), id });
    const liste = await listeProjekte();
    expect(liste).toHaveLength(1);
    expect(liste[0]!.zeit).toBe(5);
  });
  it('benennt um und löscht; das andere Projekt bleibt', async () => {
    const a = await speichereProjekt(projekt('A', 1)), b = await speichereProjekt(projekt('B', 2));
    await benenneProjektUm(a, 'Neu');
    expect((await ladeProjekt(a))?.name).toBe('Neu');
    expect((await listeProjekte()).map(e => e.name).sort()).toEqual(['B', 'Neu']);
    await loescheProjekt(b);
    expect((await listeProjekte()).map(e => e.name)).toEqual(['Neu']);
    expect(await ladeProjekt(b)).toBeUndefined();
  });
  it('übernimmt die frühere Einzel-Ablage (Schlüssel „zuletzt“) beim ersten Lesen - genau einmal', async () => {
    // Zustand vor der Umstellung: ein Projekt unter dem Schlüssel „zuletzt“, ohne id
    await new Promise<void>((ok, fehl) => {
      const r = indexedDB.open('statable', 2);
      r.onsuccess = () => { const t = r.result.transaction('projekte', 'readwrite'); t.objectStore('projekte').put(projekt('Altes Projekt', 3000, { blaetter: [{} as never], spalten: undefined, faelle: undefined }), 'zuletzt'); t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => fehl(t.error); };
    });
    const liste = await listeProjekte();
    expect(liste.map(e => e.name)).toEqual(['Altes Projekt']);
    expect(liste[0]!.blaetter).toBe(1);
    expect((await ladeProjekt(liste[0]!.id))?.id).toBe(liste[0]!.id);
    expect(await ladeProjekt('zuletzt')).toBeUndefined();
    expect(await listeProjekte()).toHaveLength(1);
  });
  it('erkennt „Speicher voll“', () => {
    expect(istSpeicherVoll(new DOMException('x', 'QuotaExceededError'))).toBe(true);
    expect(istSpeicherVoll(new Error('anderes'))).toBe(false);
    expect(istSpeicherVoll(undefined)).toBe(false);
  });

describe('Zwei Tabs mit demselben Projekt (Abschlusstest D16)', () => {
  it('überschreibt eine neuere Fassung aus einem anderen Tab nicht still', async () => {
    const id = await speichereProjekt(projekt('Fassung 1', 100));         // beide Tabs kennen Stand 100
    await speichereProjekt({ ...projekt('Tab B', 200), id }, 100);        // Tab B schreibt zuerst: erlaubt, B kannte 100
    await expect(speichereProjekt({ ...projekt('Tab A', 300), id }, 100)).rejects.toBeInstanceOf(AblageKonflikt);   // Tab A kennt nur 100
    expect((await ladeProjekt(id))?.name).toBe('Tab B');
    expect((await listeProjekte())[0]!.name).toBe('Tab B');               // die Liste bleibt mit dem Projekt im Einklang
  });
  it('meldet im Konflikt den gespeicherten Stand, damit „Hier weiterarbeiten“ ihn bewusst übernehmen kann', async () => {
    const id = await speichereProjekt(projekt('F1', 100));
    await speichereProjekt({ ...projekt('B', 200), id }, 100);
    const k = await speichereProjekt({ ...projekt('A', 300), id }, 100).catch(e => e);
    expect(k).toBeInstanceOf(AblageKonflikt);
    expect((k as AblageKonflikt).gespeichert).toBe(200);
    await speichereProjekt({ ...projekt('A', 300), id }, (k as AblageKonflikt).gespeichert);   // bewusst überschreiben
    expect((await ladeProjekt(id))?.name).toBe('A');
  });
  it('ohne Angabe des bekannten Stands (neues Projekt, Abgleich) wird wie bisher geschrieben', async () => {
    const id = await speichereProjekt(projekt('A', 100));
    await speichereProjekt({ ...projekt('B', 50), id });
    expect((await ladeProjekt(id))?.name).toBe('B');
    const neu = await speichereProjekt(projekt('Neu', 10), undefined);
    expect(await ladeProjekt(neu)).toBeDefined();
  });
  it('ein gelöschtes Projekt wird beim Speichern mit bekanntem Stand wieder angelegt (kein falscher Konflikt)', async () => {
    const id = await speichereProjekt(projekt('A', 100));
    await loescheProjekt(id);
    await speichereProjekt({ ...projekt('A', 200), id }, 100);
    expect((await ladeProjekt(id))?.zeit).toBe(200);
  });
});
});
