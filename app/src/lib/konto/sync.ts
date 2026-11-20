/**
 * Abgleich der Projekte im Browser mit dem Konto (PocketBase). Reine Logik ohne Netz: die Gegenstelle kommt von außen (`pb.ts`),
 * darum ist alles ohne Server testbar.
 *
 * Regeln:
 * - Jedes Projekt hat eine feste id (`cid`). Lokal zählt `zeit` = zuletzt geändert.
 * - Je Projekt merkt sich das Gerät den Stand beim letzten Abgleich (`stand[cid]` = zeit, auf die sich beide Seiten einigten).
 * - Nur lokal geändert → hochladen. Nur im Konto geändert → herunterladen. Beides geändert → KONFLIKT: nichts wird überschrieben,
 *   die Person entscheidet (hier behalten / Konto-Version / beide).
 * - Projekte, die es nur im Konto gibt, werden nur angeboten (nicht von selbst geladen: wer ein Projekt aus dem Browser entfernt hat, soll es nicht ungefragt zurückbekommen).
 * - Das gerade offene Projekt wird nie unter den Händen ersetzt.
 * - Ohne Netz: Fehler werden gemeldet, nichts geht verloren; lokal arbeitet alles wie vorher.
 */
import { ladeProjekt, listeProjekte, neueId, speichereProjekt, type Eintrag, type Projekt } from '../ablage';
import { leseProjektdatei, projektAlsDatei } from '../projektdatei';

export interface FernEintrag { cid: string; satzId: string; name: string; zeit: number; /** Zeit laut Server (Feld `updated`), nicht laut Geräteuhr */ aktualisiert?: number; groesse?: number; spalten?: number; faelle?: number; blaetter?: number }

/** Was die Gegenstelle (PocketBase) können muss. */
export interface Gegenstelle {
  liste(): Promise<FernEintrag[]>;
  /** Legt an oder ersetzt (mit `vorhanden`). Gibt den neuen Eintrag zurück. */
  hoch(cid: string, daten: Uint8Array, meta: { name: string; zeit: number; spalten?: number; faelle?: number; blaetter: number }, vorhanden?: FernEintrag): Promise<FernEintrag>;
  runter(e: FernEintrag): Promise<Uint8Array>;
  loesche(e: FernEintrag): Promise<void>;
}

export type Stand = Record<string, number>;
export interface StandSpeicher { lies(): Stand; schreibe(s: Stand): void }

export const standImBrowser = (schluessel: string): StandSpeicher => ({
  lies() { try { return JSON.parse(localStorage.getItem(schluessel) ?? '{}') as Stand; } catch { return {}; } },
  schreibe(s) { try { localStorage.setItem(schluessel, JSON.stringify(s)); } catch { /* ohne Speicher: beim nächsten Mal wird nachgefragt statt überschrieben */ } }
});

export type Aktion =
  | { art: 'gleich'; cid: string }
  | { art: 'hoch'; cid: string; fern?: FernEintrag }
  | { art: 'runter'; cid: string; fern: FernEintrag }
  | { art: 'konflikt'; cid: string; lokal: Eintrag; fern: FernEintrag }
  | { art: 'nurFern'; cid: string; fern: FernEintrag };

/** Entscheidet je Projekt, was zu tun ist. */
export function plane(lokal: Eintrag[], fern: FernEintrag[], stand: Stand): Aktion[] {
  const f = new Map(fern.map(e => [e.cid, e])), l = new Map(lokal.map(e => [e.id, e]));
  const aus: Aktion[] = [];
  for (const e of lokal) {
    const g = f.get(e.id);
    if (!g) { aus.push({ art: 'hoch', cid: e.id }); continue; }
    if (g.zeit === e.zeit) { aus.push({ art: 'gleich', cid: e.id }); continue; }
    const basis = stand[e.id];
    const lokalNeu = basis === undefined || e.zeit !== basis, fernNeu = basis === undefined || g.zeit !== basis;
    if (lokalNeu && !fernNeu) aus.push({ art: 'hoch', cid: e.id, fern: g });
    else if (fernNeu && !lokalNeu) aus.push({ art: 'runter', cid: e.id, fern: g });
    else aus.push({ art: 'konflikt', cid: e.id, lokal: e, fern: g });
  }
  for (const g of fern) if (!l.has(g.cid)) aus.push({ art: 'nurFern', cid: g.cid, fern: g });
  return aus;
}

export interface Ergebnis { hoch: number; runter: number; konflikte: Extract<Aktion, { art: 'konflikt' }>[]; nurFern: FernEintrag[]; uebersprungen: string[]; fehler: unknown[] }
export interface Optionen { istOffen?: (id: string) => boolean }

async function ladeHoch(g: Gegenstelle, cid: string, vorhanden: FernEintrag | undefined): Promise<FernEintrag> {
  const p = await ladeProjekt(cid); if (!p) throw new Error('Projekt nicht gefunden: ' + cid);
  return g.hoch(cid, projektAlsDatei(p), { name: p.name, zeit: p.zeit, spalten: p.spalten, faelle: p.faelle, blaetter: p.blaetter.length }, vorhanden);
}
async function legeAb(daten: Uint8Array, id: string, fern: FernEintrag, name?: string): Promise<void> {
  const p = leseProjektdatei(daten);
  await speichereProjekt({ ...p, id, zeit: fern.zeit, name: name ?? p.name, ungesichert: false, spalten: fern.spalten, faelle: fern.faelle });
}

/** Gleicht alles ab, was ohne Rückfrage geht. Konflikte und Angebote kommen im Ergebnis zurück. */
export async function gleicheAb(g: Gegenstelle, speicher: StandSpeicher, opt: Optionen = {}): Promise<Ergebnis> {
  const r: Ergebnis = { hoch: 0, runter: 0, konflikte: [], nurFern: [], uebersprungen: [], fehler: [] };
  const stand = speicher.lies();
  const aktionen = plane(await listeProjekte(), await g.liste(), stand);
  for (const a of aktionen) {
    try {
      if (a.art === 'gleich') { /* Stand wird unten gemerkt */ }
      else if (a.art === 'hoch') { const n = await ladeHoch(g, a.cid, a.fern); stand[a.cid] = n.zeit; r.hoch++; continue; }
      else if (a.art === 'runter') {
        if (opt.istOffen?.(a.cid)) { r.uebersprungen.push(a.cid); continue; }
        await legeAb(await g.runter(a.fern), a.cid, a.fern); stand[a.cid] = a.fern.zeit; r.runter++; continue;
      }
      else if (a.art === 'konflikt') { r.konflikte.push(a); continue; }
      else { r.nurFern.push(a.fern); continue; }
      const z = (await ladeProjekt(a.cid))?.zeit; if (z !== undefined) stand[a.cid] = z;
    } catch (e) { r.fehler.push(e); }
  }
  speicher.schreibe(stand);
  return r;
}

export type Entscheidung = 'lokal' | 'fern' | 'beide';
/** Löst einen Konflikt nach der Wahl der Person. Gibt bei 'beide' die id der neuen Kopie zurück. */
export async function loeseKonflikt(g: Gegenstelle, speicher: StandSpeicher, k: Extract<Aktion, { art: 'konflikt' }>, wahl: Entscheidung, kopieName = (n: string) => n + ' (Konto)'): Promise<string | undefined> {
  const stand = speicher.lies(); let neu: string | undefined;
  if (wahl === 'beide') {
    neu = neueId(); await legeAb(await g.runter(k.fern), neu, k.fern, kopieName(k.fern.name));
  }
  if (wahl === 'fern') { await legeAb(await g.runter(k.fern), k.cid, k.fern); stand[k.cid] = k.fern.zeit; }
  else { const n = await ladeHoch(g, k.cid, k.fern); stand[k.cid] = n.zeit; }
  speicher.schreibe(stand);
  return neu;
}

/** Lädt ein Projekt, das es nur im Konto gibt, in den Browser. */
export async function holeNurFern(g: Gegenstelle, speicher: StandSpeicher, e: FernEintrag): Promise<void> {
  await legeAb(await g.runter(e), e.cid, e);
  const stand = speicher.lies(); stand[e.cid] = e.zeit; speicher.schreibe(stand);
}

/** Entfernt ein Projekt aus dem Konto (der Browser behält seine Kopie). */
export async function loescheImKonto(g: Gegenstelle, speicher: StandSpeicher, e: FernEintrag): Promise<void> {
  await g.loesche(e);
  const stand = speicher.lies(); delete stand[e.cid]; speicher.schreibe(stand);
}

export type { Projekt };
