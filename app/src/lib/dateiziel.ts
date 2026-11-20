/**
 * Speichern in eine echte Datei (File System Access API, Chrome und Edge): einmal den Ort wählen, danach überschreibt Strg+S dieselbe Datei.
 * Der Dateizugriff (`FileSystemFileHandle`) wird je Projekt in IndexedDB gemerkt (eigene kleine Datenbank, getrennt von der Projekt-Ablage);
 * nach einem Neustart des Browsers muss der Zugriff meist neu bestätigt werden (`requestPermission`, nur nach einem Klick möglich).
 * Ohne die API (Safari, Firefox, Handy) bleibt es beim Herunterladen - der Zustand wird trotzdem gemerkt, damit die Anzeige ehrlich ist.
 * Nichts davon verlässt das Gerät.
 */

/** Was wir vom Datei-Zugriff brauchen (kleiner als der Typ der Bibliothek - und mit einem Ersatz testbar). */
export interface DateiZugriff {
  name: string;
  createWritable(): Promise<{ write(d: string | Uint8Array): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }>;
  queryPermission?(o: { mode: 'readwrite' }): Promise<string>;
  requestPermission?(o: { mode: 'readwrite' }): Promise<string>;
}
/** Wie ein Projekt zuletzt mit einer Datei zu tun hatte: `datei` = über den Zugriff überschrieben, `download` = heruntergeladen, `geoeffnet` = aus der Datei geöffnet (ohne Zugriff zum Zurückschreiben). */
export interface Ziel { name: string; zeit: number; art: 'datei' | 'download' | 'geoeffnet'; handle?: DateiZugriff }

export const apiDa = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

const TYPEN = [{ description: 'Statable', accept: { 'application/json': ['.statable'] } }];
/** Fragt nach Ort und Namen (Speichern unter). Bricht die Person ab, kommt `null`. */
export async function waehleSpeicherort(vorschlag: string): Promise<DateiZugriff | null> {
  try { return await (window as unknown as { showSaveFilePicker(o: unknown): Promise<DateiZugriff> }).showSaveFilePicker({ suggestedName: vorschlag, types: TYPEN }); }
  catch (e) { if ((e as { name?: string }).name === 'AbortError') return null; throw e; }
}
/** Öffnen über den Auswahldialog: Datei und Zugriff zugleich, damit „Speichern“ danach in dieselbe Datei geht. */
export async function waehleDatei(): Promise<{ datei: File; handle: DateiZugriff } | null> {
  try {
    const [h] = await (window as unknown as { showOpenFilePicker(o: unknown): Promise<(DateiZugriff & { getFile(): Promise<File> })[]> }).showOpenFilePicker({ types: TYPEN, multiple: false });
    return h ? { datei: await h.getFile(), handle: h } : null;
  } catch (e) { if ((e as { name?: string }).name === 'AbortError') return null; throw e; }
}

/** Hat die Seite Schreibrecht auf die Datei? `mitFrage`: darf nachfragen (nur direkt nach einem Klick oder einer Taste möglich). */
export async function holeZugriff(h: DateiZugriff, mitFrage: boolean): Promise<boolean> {
  try {
    let recht = h.queryPermission ? await h.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (recht !== 'granted' && mitFrage && h.requestPermission) recht = await h.requestPermission({ mode: 'readwrite' });
    return recht === 'granted';
  } catch { return false; }
}

export type Schreibergebnis = 'ok' | 'berechtigung' | 'weg';
/**
 * Schreibt den Text in die Datei (zuerst in eine Zwischendatei des Browsers, erst `close` ersetzt die Datei - ein Abbruch lässt die alte unberührt).
 * `berechtigung`: Zugriff fehlt oder wurde verweigert; `weg`: die Datei gibt es nicht mehr (verschoben, gelöscht).
 */
export async function schreibeInDatei(h: DateiZugriff, text: string | Uint8Array, mitFrage: boolean): Promise<Schreibergebnis> {
  if (!(await holeZugriff(h, mitFrage))) return 'berechtigung';
  try {
    const w = await h.createWritable();
    try { await w.write(text); await w.close(); }
    catch (e) { await w.abort?.().catch(() => {}); throw e; }
    return 'ok';
  } catch (e) {
    const n = (e as { name?: string }).name;
    if (n === 'NotFoundError') return 'weg';
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'berechtigung';
    throw e;
  }
}
/** Darf der Zugriff ohne Frage schreiben? (Für die Anzeige „Weiter in … speichern“.) */
export const zugriffGiltNoch = (h: DateiZugriff) => holeZugriff(h, false);

/* ---------- gemerkte Ziele (IndexedDB) ---------- */
function db(): Promise<IDBDatabase> {
  return new Promise((ok, fehl) => {
    const r = indexedDB.open('statable-dateien', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('ziele')) r.result.createObjectStore('ziele'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => fehl(r.error);
  });
}
async function mitSpeicher<T>(art: IDBTransactionMode, f: (st: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((ok, fehl) => {
    let erg: T | undefined;
    const t = d.transaction('ziele', art);
    const r = f(t.objectStore('ziele')); if (r) r.onsuccess = () => { erg = r.result; };
    t.oncomplete = () => { d.close(); ok(erg); };
    t.onabort = () => { d.close(); fehl(t.error ?? new Error('abgebrochen')); };
  });
}
/** Alles hier ist Zugabe: fehlt die Ablage (privates Fenster), geht es ohne Gedächtnis weiter. */
export const leseZiel = (projektId: string) => mitSpeicher<Ziel>('readonly', st => st.get(projektId) as IDBRequest<Ziel>).catch(() => undefined);
export const merkeZiel = (projektId: string, z: Ziel) => mitSpeicher('readwrite', st => { st.put(z, projektId); }).then(() => true).catch(() => false);
export const vergissZiel = (projektId: string) => mitSpeicher('readwrite', st => { st.delete(projektId); }).then(() => undefined).catch(() => undefined);
