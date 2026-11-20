/**
 * Stufe 3F: Erhebungsstation. Ein Gerät, viele Befragte nacheinander. Jede Antwort liegt NUR verschlüsselt (age-Armor) in der IndexedDB
 * `statable-station` (ein Objektspeicher je Plan-id, Einträge `{ id, armor, gesichert }`), nie lesbar und nie `werte`.
 * Sicherungsdatei: Textdatei mit beliebig vielen Armor-Blöcken (Format wie der eingefügte Text im Sammelimport 3E).
 * Jede Operation öffnet die Datenbank selbst und schließt sie wieder; ein Versionswechsel (neuer Plan) wird nie durch ein offenes Handle blockiert
 * (`onversionchange` schließt zusätzlich).
 * Zähler für `n` im Dateinamen: je Plan in localStorage (nur wenn verfügbar; sonst 1), erhöht nach erfolgreichem Markieren als gesichert.
 */
export interface StationsEintrag { id: string; armor: string; gesichert: boolean }
export interface Station {
  ablegen(armor: string, antwortId: string): Promise<void>;
  ungesichert(): Promise<number>;
  sicherungsText(): Promise<{ name: string; text: string; ids: string[] }>;
  alsGesichertMarkieren(ids: string[]): Promise<void>;
  leeren(): Promise<void>;
}
export const ERINNERN_ALLE = 5;

const DB = 'statable-station';
const speicherName = (planId: string) => `plan:${planId}`;
const wait = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, fehl) => { r.onsuccess = () => ok(r.result); r.onerror = () => fehl(r.error); });
const fertig = (tx: IDBTransaction): Promise<void> => new Promise((ok, fehl) => { tx.oncomplete = () => ok(); tx.onerror = () => fehl(tx.error); tx.onabort = () => fehl(tx.error ?? new Error('abgebrochen')); });

/** Öffnet die Datenbank; legt den Objektspeicher des Plans an (Versionswechsel), wenn er fehlt. */
function oeffneDb(idb: IDBFactory, planId: string): Promise<IDBDatabase> {
  const name = speicherName(planId);
  return new Promise((ok, fehl) => {
    const a = idb.open(DB);
    a.onerror = () => fehl(a.error);
    a.onsuccess = () => {
      const db = a.result;
      db.onversionchange = () => db.close();
      if (db.objectStoreNames.contains(name)) { ok(db); return; }
      const v = db.version + 1;
      db.close();
      const b = idb.open(DB, v);
      b.onupgradeneeded = () => { if (!b.result.objectStoreNames.contains(name)) b.result.createObjectStore(name, { keyPath: 'id' }); };
      b.onblocked = () => { /* ein anderes Fenster hält die alte Version; es schließt sich über onversionchange */ };
      b.onerror = () => fehl(b.error);
      b.onsuccess = () => { b.result.onversionchange = () => b.result.close(); ok(b.result); };
    };
  });
}

const heute = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zaehlerSchluessel = (planId: string) => `statable-station-sicherungen:${planId}`;
function leseZaehler(planId: string): number { try { const n = Number(localStorage.getItem(zaehlerSchluessel(planId))); return Number.isInteger(n) && n >= 0 ? n : 0; } catch { return 0; } }
function erhoeheZaehler(planId: string): void { try { localStorage.setItem(zaehlerSchluessel(planId), String(leseZaehler(planId) + 1)); } catch { /* ohne Speicher bleibt n bei 1 */ } }

export async function oeffneStation(planId: string, idb: IDBFactory = indexedDB): Promise<Station> {
  (await oeffneDb(idb, planId)).close();   // Speicher des Plans sicher anlegen
  const name = speicherName(planId);
  async function mit<T>(modus: IDBTransactionMode, tue: (s: IDBObjectStore) => Promise<T>): Promise<T> {
    const db = await oeffneDb(idb, planId);
    try {
      const tx = db.transaction(name, modus);
      const erg = tue(tx.objectStore(name));
      const [r] = await Promise.all([erg, fertig(tx)]);
      return r;
    } finally { db.close(); }
  }
  const alle = () => mit('readonly', async s => (await wait(s.getAll())) as StationsEintrag[]);
  return {
    async ablegen(armor, antwortId) {
      await mit('readwrite', async s => { await wait(s.put({ id: antwortId, armor, gesichert: false } satisfies StationsEintrag)); });
    },
    async ungesichert() { return (await alle()).filter(e => !e.gesichert).length; },
    async sicherungsText() {
      const offen = (await alle()).filter(e => !e.gesichert);
      return {
        name: `statable-sicherung-${heute()}-${leseZaehler(planId) + 1}.txt`,
        text: offen.map(e => e.armor.trim()).join('\n\n') + (offen.length ? '\n' : ''),
        ids: offen.map(e => e.id),
      };
    },
    async alsGesichertMarkieren(ids) {
      const menge = new Set(ids);
      await mit('readwrite', async s => {
        for (const e of (await wait(s.getAll())) as StationsEintrag[]) if (menge.has(e.id) && !e.gesichert) await wait(s.put({ ...e, gesichert: true }));
      });
      if (menge.size) erhoeheZaehler(planId);
    },
    async leeren() {
      await mit('readwrite', async s => {
        const eintraege = (await wait(s.getAll())) as StationsEintrag[];
        if (eintraege.some(e => !e.gesichert)) throw new Error('Es gibt noch ungesicherte Antworten.');
        await wait(s.clear());
      });
    },
  };
}
