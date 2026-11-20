/* Prüfer-Test 3E/3F - der Bauer ändert diese Datei nicht.
 *
 * Paket 3F (Prüfer, ROTE TESTS vor dem Bau): Erhebungsstation. Neue Datei: lib/station.ts
 * Grundlage: docs/erheben/FACHBLATT-STUFE-3.md, „Entscheide 3E/3F vor den Prüfer-Tests“ (Schnittstellen verbindlich); Tests mit fake-indexeddb.
 *
 * Zusätzliche Festlegungen des Prüfers:
 *  - Jeder Test bekommt eine frische `new IDBFactory()`; oeffneStation(planId, idb) benutzt sie. Datenbank `statable-station`, je Plan-id ein Objektspeicher.
 *    Ein zweiter Plan darf eine Versionsänderung der Datenbank auslösen (auch wenn die Station des ersten Plans geöffnet war); der Bauer muss das sicher behandeln.
 *  - Gespeichert wird je Eintrag NUR { id, armor, gesichert } (StationsEintrag). Nie `werte`, nie ein Klartext.
 *  - sicherungsText() liefert nur die UNGESICHERTEN Einträge; ids = ihre antwortIds (Reihenfolge nicht festgelegt); text = die Armor-Blöcke mit Leerzeilen dazwischen.
 *    Name: statable-sicherung-JJJJ-MM-TT-n.txt (Datum von heute, n = positive ganze Zahl; wie n gezählt wird, ist offen).
 *  - alsGesichertMarkieren löscht nichts; der Eintrag bleibt, zählt aber nicht mehr als ungesichert und kommt nicht mehr in die Sicherung.
 *  - leeren(): lehnt ab (Promise rejected), solange ungesichert() > 0; die Einträge bleiben dann unverändert. Sonst entfernt es alle Einträge dieses Plans (nur dieses Plans).
 *  - Dieselbe antwortId zweimal abgelegt = ein Eintrag.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { IDBFactory as FakeFactory } from 'fake-indexeddb';
import { verschluesseleAntwort, type Antwortsatz } from './antwortsatz';
import { neuesSchluesselpaar } from './schluessel';
import { entschluesseleAlle, zerlegeEingaben } from './sammelimport';
import { ERINNERN_ALLE, oeffneStation } from './station';

const BEGIN = '-----BEGIN AGE ENCRYPTED FILE-----';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const GEHEIM = 'Geheimer Antworttext 4711 über Gehalt';
const satz = (n: number, planId = 'p-1'): Antwortsatz => ({
  format: 'statable-antwort', version: 1, plan: { id: planId, revision: 1 }, antwortId: uid(n), werte: { q1: n, t: `${GEHEIM} ${n}` },
});

let paar: { identitaet: string; empfaenger: string };
beforeAll(async () => { paar = await neuesSchluesselpaar(); });
const frisch = () => new FakeFactory() as unknown as IDBFactory;
const armorVon = (s: Antwortsatz) => verschluesseleAntwort(s, paar.empfaenger, 'text');
async function ablegenSatz(st: { ablegen(a: string, id: string): Promise<void> }, n: number, planId = 'p-1') {
  const a = await armorVon(satz(n, planId));
  await st.ablegen(a, uid(n));
  return a;
}

/** Liest ALLE Datensätze aller Objektspeicher der Datenbank `statable-station` roh aus der IndexedDB. */
async function rohInhalt(idb: IDBFactory): Promise<{ speicher: string[]; saetze: unknown[] }> {
  const db = await new Promise<IDBDatabase>((ok, fehl) => { const r = idb.open('statable-station'); r.onsuccess = () => ok(r.result); r.onerror = () => fehl(r.error); });
  try {
    const speicher = Array.from(db.objectStoreNames);
    const saetze: unknown[] = [];
    for (const name of speicher) {
      const alle = await new Promise<unknown[]>((ok, fehl) => { const r = db.transaction(name, 'readonly').objectStore(name).getAll(); r.onsuccess = () => ok(r.result as unknown[]); r.onerror = () => fehl(r.error); });
      saetze.push(...alle);
    }
    return { speicher, saetze };
  } finally { db.close(); }
}

describe('Erhebungsstation: Grundfunktionen', () => {
  it('ERINNERN_ALLE ist 5', () => { expect(ERINNERN_ALLE).toBe(5); });

  it('ablegen: ungesichert zählt mit; neue Station ohne Einträge hat 0', async () => {
    const st = await oeffneStation('p-1', frisch());
    expect(await st.ungesichert()).toBe(0);
    await ablegenSatz(st, 1);
    expect(await st.ungesichert()).toBe(1);
    await ablegenSatz(st, 2);
    await ablegenSatz(st, 3);
    expect(await st.ungesichert()).toBe(3);
  });

  it('die Einträge überleben ein erneutes Öffnen (Neustart des Browsers), auch mit demselben Plan', async () => {
    const idb = frisch();
    const a = await oeffneStation('p-1', idb);
    await ablegenSatz(a, 1); await ablegenSatz(a, 2);
    const b = await oeffneStation('p-1', idb);
    expect(await b.ungesichert()).toBe(2);
  });

  it('gleiche antwortId zweimal ablegen bleibt ein Eintrag (auch in der Sicherung)', async () => {
    const st = await oeffneStation('p-1', frisch());
    await ablegenSatz(st, 1); await ablegenSatz(st, 1);
    expect(await st.ungesichert()).toBe(1);
    const s = await st.sicherungsText();
    expect(s.ids).toEqual([uid(1)]);
    expect(s.text.split(BEGIN).length - 1).toBe(1);
  });
});

describe('Erhebungsstation: nur verschlüsselt im Gerät', () => {
  it('im Speicher stehen nur Armor-Text und id, nie der Klartext der Antworten', async () => {
    const idb = frisch();
    const st = await oeffneStation('p-1', idb);
    const armor = await ablegenSatz(st, 1);
    await ablegenSatz(st, 2);
    const roh = await rohInhalt(idb);
    expect(roh.speicher.length).toBeGreaterThanOrEqual(1);
    expect(roh.saetze).toHaveLength(2);
    const alles = JSON.stringify(roh.saetze);
    expect(alles).not.toContain(GEHEIM);
    expect(alles).not.toContain('Gehalt');
    expect(alles).not.toContain('werte');
    expect(alles).toContain(uid(1));
    expect(alles).toContain(BEGIN);
    const e = roh.saetze.find(x => (x as { id: string }).id === uid(1)) as Record<string, unknown>;
    expect(e.armor).toBe(armor);
    expect(Object.keys(e).sort()).toEqual(['armor', 'gesichert', 'id']);
    expect(e.gesichert).toBe(false);
  });

  it('die Datenbank heißt statable-station', async () => {
    const idb = frisch();
    await oeffneStation('p-1', idb);
    const namen = (await idb.databases()).map(d => d.name);
    expect(namen).toContain('statable-station');
  });
});

describe('Erhebungsstation: Sicherungsdatei', () => {
  it('sicherungsText enthält alle ungesicherten Blöcke, ids stimmen, Name nach Muster', async () => {
    const st = await oeffneStation('p-1', frisch());
    const armors = [await ablegenSatz(st, 1), await ablegenSatz(st, 2), await ablegenSatz(st, 3)];
    const s = await st.sicherungsText();
    expect(s.name).toMatch(/^statable-sicherung-\d{4}-\d{2}-\d{2}-\d+\.txt$/);
    const datum = /(\d{4}-\d{2}-\d{2})/.exec(s.name)![1]!;
    const heute = new Date();
    const lokal = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-${String(heute.getDate()).padStart(2, '0')}`;
    expect([lokal, heute.toISOString().slice(0, 10)]).toContain(datum);
    expect([...s.ids].sort()).toEqual([uid(1), uid(2), uid(3)]);
    expect(s.text.split(BEGIN).length - 1).toBe(3);
    for (const a of armors) expect(s.text).toContain(a.trim());
    expect(s.text).not.toContain(GEHEIM);
  });

  it('Rundweg: zerlegeEingaben liest alle Blöcke des sicherungsText, entschluesseleAlle öffnet sie', async () => {
    const st = await oeffneStation('p-1', frisch());
    for (let n = 1; n <= 4; n++) await ablegenSatz(st, n);
    const s = await st.sicherungsText();
    const stuecke = zerlegeEingaben([{ name: s.name, bytes: new TextEncoder().encode(s.text) }]);
    expect(stuecke).toHaveLength(4);
    const e = await entschluesseleAlle(stuecke, paar.identitaet);
    expect(e.every(x => x.fehler === undefined)).toBe(true);
    expect(e.map(x => x.satz?.antwortId).sort()).toEqual([1, 2, 3, 4].map(uid));
    const eins = e.find(x => x.satz?.antwortId === uid(2))!.satz!;
    expect(eins).toEqual(satz(2));
  });

  it('ohne ungesicherte Einträge: keine Blöcke, keine ids', async () => {
    const st = await oeffneStation('p-1', frisch());
    const s = await st.sicherungsText();
    expect(s.ids).toEqual([]);
    expect(s.text).not.toContain(BEGIN);
  });

  it('alsGesichertMarkieren senkt den Zähler und nimmt die Einträge aus der nächsten Sicherung', async () => {
    const st = await oeffneStation('p-1', frisch());
    for (let n = 1; n <= 3; n++) await ablegenSatz(st, n);
    const s = await st.sicherungsText();
    await st.alsGesichertMarkieren([uid(1), uid(3)]);
    expect(await st.ungesichert()).toBe(1);
    const danach = await st.sicherungsText();
    expect(danach.ids).toEqual([uid(2)]);
    expect(danach.text.split(BEGIN).length - 1).toBe(1);
    await st.alsGesichertMarkieren(s.ids);
    expect(await st.ungesichert()).toBe(0);
  });

  it('ohne alsGesichertMarkieren ändert sicherungsText den Zähler nicht (erst NACH erfolgreichem Speichern markieren)', async () => {
    const st = await oeffneStation('p-1', frisch());
    await ablegenSatz(st, 1); await ablegenSatz(st, 2);
    await st.sicherungsText();
    expect(await st.ungesichert()).toBe(2);
  });

  it('nach dem Markieren abgelegte Antworten sind wieder ungesichert', async () => {
    const st = await oeffneStation('p-1', frisch());
    await ablegenSatz(st, 1);
    await st.alsGesichertMarkieren([uid(1)]);
    await ablegenSatz(st, 2);
    expect(await st.ungesichert()).toBe(1);
    expect((await st.sicherungsText()).ids).toEqual([uid(2)]);
  });
});

describe('Erhebungsstation: leeren', () => {
  it('wirft bei ungesicherten Einträgen und lässt alles unverändert', async () => {
    const idb = frisch();
    const st = await oeffneStation('p-1', idb);
    await ablegenSatz(st, 1); await ablegenSatz(st, 2);
    await st.alsGesichertMarkieren([uid(1)]);
    await expect(st.leeren()).rejects.toThrow();
    expect(await st.ungesichert()).toBe(1);
    expect((await rohInhalt(idb)).saetze).toHaveLength(2);
  });

  it('wenn alles gesichert ist, entfernt es alle Einträge; auf einer leeren Station geht es auch', async () => {
    const idb = frisch();
    const st = await oeffneStation('p-1', idb);
    await expect(st.leeren()).resolves.toBeUndefined();
    await ablegenSatz(st, 1); await ablegenSatz(st, 2);
    await st.alsGesichertMarkieren([uid(1), uid(2)]);
    await st.leeren();
    expect(await st.ungesichert()).toBe(0);
    expect((await rohInhalt(idb)).saetze).toHaveLength(0);
    expect((await st.sicherungsText()).ids).toEqual([]);
  });
});

describe('Erhebungsstation: mehrere Pläne', () => {
  it('zwei Pläne bleiben getrennt: Zähler, Sicherung und Leeren', async () => {
    const idb = frisch();
    const a = await oeffneStation('plan-a', idb);
    await ablegenSatz(a, 1, 'plan-a'); await ablegenSatz(a, 2, 'plan-a');
    const b = await oeffneStation('plan-b', idb);                    // zweiter Plan nach dem ersten: Versionswechsel der Datenbank
    await ablegenSatz(b, 3, 'plan-b');
    const a2 = await oeffneStation('plan-a', idb);
    const b2 = await oeffneStation('plan-b', idb);
    expect(await a2.ungesichert()).toBe(2);
    expect(await b2.ungesichert()).toBe(1);
    expect([...(await a2.sicherungsText()).ids].sort()).toEqual([uid(1), uid(2)]);
    expect((await b2.sicherungsText()).ids).toEqual([uid(3)]);
    await b2.alsGesichertMarkieren([uid(3)]);
    await b2.leeren();
    expect(await a2.ungesichert()).toBe(2);
    expect(await b2.ungesichert()).toBe(0);
  });

  it('dieselbe antwortId in zwei Plänen bleibt in beiden', async () => {
    const idb = frisch();
    const a = await oeffneStation('plan-a', idb);
    await a.ablegen(await armorVon(satz(1, 'plan-a')), uid(1));
    const b = await oeffneStation('plan-b', idb);
    await b.ablegen(await armorVon(satz(1, 'plan-b')), uid(1));
    expect(await (await oeffneStation('plan-a', idb)).ungesichert()).toBe(1);
    expect(await (await oeffneStation('plan-b', idb)).ungesichert()).toBe(1);
  });
});
