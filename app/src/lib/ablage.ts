/**
 * Ablage im Browser (IndexedDB): mehrere Projekte, je eine id. Nichts verlässt das Gerät.
 * Zwei Speicher: `projekte` (id → ganzes Projekt mit Daten) und `liste` (id → kleiner Eintrag für die Startseite,
 * damit die Liste nicht alle Daten laden muss). Beide werden immer in einem Schritt beschrieben.
 * Bis Oktober 2026 gab es nur ein Projekt unter dem Schlüssel `zuletzt` - das wird beim ersten Lesen übernommen.
 */
import type { Blatt } from './sitzung.svelte';
import type { MehrfachSet } from './mehrfach';
import type { Skala } from './skalen';
import type { Gewicht } from './gewichte';
import type { ProtokollEintrag } from './protokoll';

export interface Projekt { id?: string; name: string; quelle: string; sav: Uint8Array; blaetter: Blatt[]; /** Mehrfachantworten-Sets; fehlt in älteren Projekten */ sets?: MehrfachSet[]; /** Festgelegte Skalen; fehlt in älteren Projekten */ skalen?: Skala[]; /** Fallgewicht (Spalte und Art); fehlt = ungewichtet (alle älteren Projekte). Die Art steht nicht im .sav, nur der Spaltenname. */ gewicht?: Gewicht; /** Namen der Spalten aus dem Import qualitativer Codierungen (0 = nicht erwähnt); fehlt in älteren Projekten = keine Code-Spalte. */ codeSpalten?: string[]; entscheid: Record<string, 'erledigt' | 'gelassen'>; zeit: number;
  /** Plausibilitätsregeln und Karte; fehlt in älteren Projekten. */ zusatz?: import('./zusatz').Zusatz;
  /** Integration der Daten (Mixed Methods, vier Fragen); fehlt, solange nichts eingetragen ist. */ integration?: import('./integration').Integration;
  /** Fragebogen-Pläne (Stufe 2, docs/erheben/ARCHITEKTUR-FRAGEBOGEN-PLAN.md); fehlt = keiner. Mit Plan schreibt die Projektdatei Fassung 2 (ZIP). */ fragebogen?: import('./fragebogenplan').FragebogenPlan[];
  /** Bilder der Pläne, Schlüssel `<plan-id>/<datei>`; im ZIP `fragebogen/<plan-id>/<datei>`. */ fragebogenBilder?: Record<string, Uint8Array>;
  /** Eingegebene Durchgänge je Plan-id (Paket 2F: Eingabemaske, doppelte Dateneingabe); nur mit Plan; im ZIP `fragebogen/<plan-id>/eingabe-A.json`, `-B.json`, `-einfach.json`. */ eingaben?: Record<string, import('./doppeleingabe').PlanEingaben>;
  /** Gesammelte Pretest-Kommentare je Plan-id (Paket 2G); nur mit Plan; im ZIP `fragebogen/<plan-id>/pretest.json`. */ pretest?: Record<string, import('./pretest').PretestPlan>;
  /** Interview-Leitfäden (Stufe 4, Paket 4D); fehlt = keine. Mit Leitfäden schreibt die Projektdatei Fassung 2 (ZIP), Eintrag `qualitativ/leitfaeden.json`. */ leitfaeden?: import('./leitfaden').Leitfaden[];
  /** Forschungsplanung (Stufe V2: Datenmanagementplan, Präregistrierung); fehlt = keine. Mit Planung schreibt die Projektdatei Fassung 2 (ZIP), Eintrag `planung/planung.json`. */ planung?: import('./planung').Planung[];
  /** Das qualitative Projekt (Stufe 4, Paket 4C: Transkripte, Codes, Fälle); fehlt = keins. Mit `qual` schreibt die Projektdatei Fassung 2: `qualitativ/projekt.json` und `qualitativ/quellen/<dokument-id>.txt`. */ qual?: import('./qualprojekt').QualProjekt;
  /** Offene Entscheidungen beim Konsens (Stufe 5, Paket 5E1); nur mit `qual`; im ZIP `qualitativ/konsens.json`. */ konsens?: import('./konsens-zustand').KonsensEntwurf;
  /** Aus der Fall-Code-Matrix wurden Zitate als Textspalten übernommen: das Projekt enthält Interviewtext (Hinweis beim Speichern, Paket 5C). */ enthaeltZitate?: boolean;
  /** Protokoll jeder Datenänderung (Abschnitt 6, Teil B); fehlt in älteren Projekten. */ protokoll?: ProtokollEintrag[];
  /** Das Protokoll begann erst mit der Fassung, die es eingeführt hat: frühere Änderungen stehen nicht darin. */ protokollLuecke?: boolean;
  /** Name und Prüfsumme (SHA-256 über die Bytes) der Datei, aus der die Daten eingelesen wurden; fehlt, wenn sie nicht bekannt ist. */ datei?: import('./protokoll').DatenDatei;
  /** Größe der Tabelle (für die Liste) */
  spalten?: number; faelle?: number;
  /** Seit dem letzten Speichern als Datei geändert (fehlt bei alter Ablage). Nur im Browser, nicht in der Datei. */
  ungesichert?: boolean }

/** Ein Eintrag der Liste „Zuletzt bearbeitet“. */
export interface Eintrag { id: string; name: string; zeit: number; spalten?: number; faelle?: number; blaetter: number; groesse: number; ungesichert?: boolean }

export const neueId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

export const eintragVon = (p: Projekt & { id: string }): Eintrag =>
  ({ id: p.id, name: p.name, zeit: p.zeit, spalten: p.spalten, faelle: p.faelle, blaetter: p.blaetter.length, groesse: p.sav.byteLength, ungesichert: p.ungesichert });

/** Ist der Speicher des Browsers voll? */
export const istSpeicherVoll = (e: unknown) => !!e && typeof e === 'object' && ((e as { name?: string }).name === 'QuotaExceededError' || (e as { code?: number }).code === 22);

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fehl) => {
    const r = indexedDB.open('statable', 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('projekte')) d.createObjectStore('projekte');
      if (!d.objectStoreNames.contains('liste')) d.createObjectStore('liste');
    };
    r.onsuccess = () => ok(r.result); r.onerror = () => fehl(r.error);
  });
}
/** Ein Schritt (Transaktion) über beide Speicher; fertig ist er erst, wenn der Browser wirklich geschrieben hat - ein voller Speicher meldet sich hier. */
async function schritt<T>(art: IDBTransactionMode, f: (projekte: IDBObjectStore, liste: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((ok, fehl) => {
    let ergebnis: T | undefined;
    const t = d.transaction(['projekte', 'liste'], art);
    try { const r = f(t.objectStore('projekte'), t.objectStore('liste')); if (r) r.onsuccess = () => { ergebnis = r.result; }; } catch (e) { t.abort(); d.close(); fehl(e); return; }
    t.oncomplete = () => { d.close(); ok(ergebnis); };
    t.onabort = () => { d.close(); fehl(t.error ?? new Error('abgebrochen')); };
    t.onerror = () => { /* onabort folgt */ };
  });
}

/** Wird nach jedem Speichern gerufen (das Konto hängt sich hier an, wenn es eingeschaltet und angemeldet ist). */
export const nachSpeichern: { f?: () => void } = {};
/** Im Browser steht eine neuere Fassung des Projekts als die, die dieser Tab zuletzt gelesen oder geschrieben hat (ein anderer Tab hat es geändert). */
export class AblageKonflikt extends Error {
  constructor(public gespeichert: number) { super('Das Projekt wurde in einem anderen Tab geändert.'); this.name = 'AblageKonflikt'; }
}
/**
 * Legt das Projekt ab (neu oder überschreibend). Ohne id wird eine vergeben; sie steht im Rückgabewert.
 * `bekannt`: der Stand (`zeit`), den dieser Tab zuletzt gelesen oder selbst geschrieben hat. Ist im Browser eine neuere Fassung gespeichert,
 * wird nichts geschrieben und `AblageKonflikt` geworfen (Prüfung und Schreiben in einer Transaktion, also auch gegen einen Tab, der gleichzeitig schreibt).
 * Ohne `bekannt` wird immer geschrieben (neues Projekt, Abgleich mit dem Konto, bewusstes Überschreiben).
 */
export async function speichereProjekt(p: Projekt, bekannt?: number): Promise<string> {
  const id = p.id ?? neueId();
  const voll = { ...p, id };
  let konflikt: number | undefined, putFehler: unknown;
  await schritt('readwrite', (pr, li) => {
    const alt = pr.get(id);
    alt.onsuccess = () => {
      const a = alt.result as Projekt | undefined;
      if (bekannt !== undefined && a && a.zeit > bekannt) { konflikt = a.zeit; return; }
      try { pr.put(voll, id); li.put(eintragVon(voll), id); } catch (e) { putFehler = e; }   // in diesem Rückruf würde der Fehler sonst verloren gehen und „gespeichert“ bliebe stehen
    };
  });
  if (putFehler !== undefined) throw putFehler;
  if (konflikt !== undefined) throw new AblageKonflikt(konflikt);
  try { nachSpeichern.f?.(); } catch { /* der Abgleich darf das Speichern nie stören */ }
  return id;
}
export const ladeProjekt = (id: string) => schritt<Projekt>('readonly', pr => pr.get(id) as IDBRequest<Projekt>);
export const loescheProjekt = (id: string) => schritt('readwrite', (pr, li) => { pr.delete(id); li.delete(id); }).then(() => undefined);

/** Ändert nur den Namen. */
export async function benenneProjektUm(id: string, name: string) {
  const p = await ladeProjekt(id); if (!p) return;
  await speichereProjekt({ ...p, id, name });
}

/** Die Liste, das zuletzt bearbeitete zuerst. Übernimmt dabei ein einzelnes Projekt der früheren Ablage (Schlüssel `zuletzt`). */
export async function listeProjekte(): Promise<Eintrag[]> {
  let alle: Eintrag[] = [];
  await schritt('readwrite', (pr, li) => {
    const alt = pr.get('zuletzt');
    alt.onsuccess = () => {
      const p = alt.result as Projekt | undefined;
      if (p) {
        const id = neueId(), voll = { ...p, id };
        pr.put(voll, id); li.put(eintragVon(voll), id); pr.delete('zuletzt');
      }
      const r = li.getAll();
      r.onsuccess = () => { alle = r.result as Eintrag[]; };
    };
  });
  return alle.sort((a, b) => b.zeit - a.zeit);
}
