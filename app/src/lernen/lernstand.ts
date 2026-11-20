/**
 * Rechenlogik des Lernstands (rein, ohne Oberfläche): Welche Abschnitte einer Einheit sind durchgemacht, übersprungen oder noch offen,
 * und dasselbe für die Einheiten eines Lernpfads. Der Stand liegt nur im Browser (`lib/lernzustand.svelte.ts`), nie in der .statable-Datei.
 *
 * Regel für einen Abschnitt:
 *  - grün: durchgemacht
 *  - rot: nicht durchgemacht, aber man war schon bei einem späteren Abschnitt (übersprungen); wird er nachgeholt, ist er grün
 *  - grau: noch nicht erreicht (der aktuelle Abschnitt ist nur hervorgehoben, er zählt nicht als grün)
 * Einheiten eines Pfads: grün = alle Abschnitte grün, rot = die Einheit enthält übersprungene Abschnitte, grau = sonst. Eine nie geöffnete Einheit bleibt grau:
 * Wer über die Suche direkt zu einem Thema springt, soll nicht einen halben Pfad rot sehen.
 */
import type { Einheit } from './lernplan';

export type Farbe = 'gruen' | 'rot' | 'grau';
export type AbschnittsArt = 'erklaerung' | 'rechnen' | 'beispiel' | 'regler' | 'fragen';
export interface Abschnitt { schluessel: string; art: AbschnittsArt; /** Beispiel: Nummer des Schritts; Regler: Ziel nach `#verstehen/`; Selbst rechnen: Kennung der Aufgabe. */ ziel?: string; schritt?: number; beispiel?: string }

/** Ein vom Beispiel-Begleiter geöffneter Schritt: ab dann zählt ein Ergebnis im Projekt. */
export interface Geoeffnet { zeit: number; projekt: string; art: string }

export interface Stand {
  /** Durchgemachte Abschnitte je Einheit (Schlüssel der Abschnitte). Fragen zählen über `richtig`. */
  fertig: Record<string, string[]>;
  /** Höchster erreichter Abschnitt je Einheit (Nummer ab 0); fehlt = noch nicht besucht. */
  erreicht: Record<string, number>;
  /** Mindestens einmal richtig beantwortete Fragen. */
  richtig: string[];
  /** Geöffnete Beispiel-Schritte, Schlüssel `<einheit>|<abschnitt>`. */
  geoeffnet: Record<string, Geoeffnet>;
  /** Zuletzt besuchter Abschnitt (für „Weiterlernen“). */
  zuletzt?: { einheit: string; schluessel: string };
}
export const leererStand = (): Stand => ({ fertig: {}, erreicht: {}, richtig: [], geoeffnet: {} });

/** Die Abschnitte einer Einheit in fester Reihenfolge; nur was vorhanden ist. */
export function abschnitte(e: Einheit): Abschnitt[] {
  return [
    ...(e.hilfe.length ? [{ schluessel: 'erklaerung', art: 'erklaerung' as const }] : []),
    ...(e.rechnen ?? []).map((r): Abschnitt => ({ schluessel: `rechnen:${r}`, art: 'rechnen', ziel: r })),
    ...e.beispiele.map((b): Abschnitt => ({ schluessel: `beispiel:${b.id}:${b.schritt}`, art: 'beispiel', beispiel: b.id, schritt: b.schritt })),
    ...e.probieren.map((p): Abschnitt => ({ schluessel: `regler:${p}`, art: 'regler', ziel: p })),
    ...(e.fragen.length ? [{ schluessel: 'fragen', art: 'fragen' as const }] : [])
  ];
}

/** Fragen der Einheit: wie viele schon einmal richtig beantwortet sind. */
export function fragenStand(st: Stand, e: Einheit): { richtig: number; gesamt: number } {
  const ok = new Set(st.richtig);
  return { richtig: e.fragen.filter(f => ok.has(f)).length, gesamt: e.fragen.length };
}

export function istFertig(st: Stand, e: Einheit, a: Abschnitt): boolean {
  if (a.art === 'fragen') { const f = fragenStand(st, e); return f.gesamt > 0 && f.richtig === f.gesamt; }
  return !!st.fertig[e.id]?.includes(a.schluessel);
}

/** Farbe des Abschnitts mit der Nummer `i` (ab 0) einer Einheit. */
export function abschnittsFarbe(st: Stand, e: Einheit, i: number): Farbe {
  const a = abschnitte(e)[i];
  if (!a) return 'grau';
  if (istFertig(st, e, a)) return 'gruen';
  const erreicht = st.erreicht[e.id];
  return erreicht !== undefined && erreicht > i ? 'rot' : 'grau';
}
export const abschnittsFarben = (st: Stand, e: Einheit): Farbe[] => abschnitte(e).map((_, i) => abschnittsFarbe(st, e, i));

export const zaehleFarben = (f: readonly Farbe[]) => ({ gruen: f.filter(x => x === 'gruen').length, rot: f.filter(x => x === 'rot').length, grau: f.filter(x => x === 'grau').length });

/** Ein Stück des Fortschrittsrings: ein Abschnitt mit seiner Farbe und dem erledigten Anteil von 0 bis 1. */
export interface Stueck { farbe: Farbe; anteil: number }

/** Der Ring einer Einheit, ein Stück je Abschnitt. Fragen füllen ihr Stück anteilig, alles andere ganz oder gar nicht; alle Anteile 1 heißt: alles gemacht. */
export function ringStuecke(st: Stand, e: Einheit): Stueck[] {
  const f = fragenStand(st, e);
  return abschnitte(e).map((a, i) => {
    const farbe = abschnittsFarbe(st, e, i);
    return { farbe, anteil: farbe === 'gruen' ? 1 : a.art === 'fragen' && f.gesamt ? f.richtig / f.gesamt : 0 };
  });
}

/** War die Einheit schon offen (irgendein Abschnitt besucht)? */
export const istBesucht = (st: Stand, e: Einheit): boolean => st.erreicht[e.id] !== undefined;

/** Farbe der Einheit mit der Nummer `i` in einer Liste von Einheiten (Pfad). */
export function einheitsFarbe(st: Stand, liste: readonly Einheit[], i: number): Farbe {
  const e = liste[i];
  if (!e) return 'grau';
  const f = abschnittsFarben(st, e);
  if (f.length && f.every(x => x === 'gruen')) return 'gruen';
  return f.includes('rot') ? 'rot' : 'grau';
}
export const einheitsFarben = (st: Stand, liste: readonly Einheit[]): Farbe[] => liste.map((_, i) => einheitsFarbe(st, liste, i));

// ---- Änderungen (rein: geben einen neuen Stand zurück) ----

/** Der Abschnitt `i` wird gezeigt: der erreichte Abschnitt steigt nie. */
export function besuche(st: Stand, e: Einheit, i: number): Stand {
  const a = abschnitte(e)[i];
  if (!a) return st;
  const alt = st.erreicht[e.id] ?? -1;
  if (alt >= i && st.zuletzt?.einheit === e.id && st.zuletzt.schluessel === a.schluessel) return st;
  return { ...st, erreicht: { ...st.erreicht, [e.id]: Math.max(alt, i) }, zuletzt: { einheit: e.id, schluessel: a.schluessel } };
}

/** Den Abschnitt als durchgemacht eintragen (Fragen zählen über `richtigBeantwortet`). */
export function machFertig(st: Stand, e: Einheit, schluessel: string): Stand {
  if (st.fertig[e.id]?.includes(schluessel)) return st;
  return { ...st, fertig: { ...st.fertig, [e.id]: [...(st.fertig[e.id] ?? []), schluessel] } };
}

export function richtigBeantwortet(st: Stand, frage: string): Stand {
  return st.richtig.includes(frage) ? st : { ...st, richtig: [...st.richtig, frage] };
}

export const geoeffnetSchluessel = (einheit: string, schluessel: string) => `${einheit}|${schluessel}`;
export function schrittGeoeffnet(st: Stand, einheit: string, schluessel: string, g: Geoeffnet): Stand {
  return { ...st, geoeffnet: { ...st.geoeffnet, [geoeffnetSchluessel(einheit, schluessel)]: g } };
}

/** Liegt nach dem Öffnen des Schritts ein Ergebnis dieser Art im Projekt vor? `zeit` eines Blatts ist der Moment, in dem es angelegt wurde. */
export function hatErgebnis(blaetter: readonly { art: string; zeit: number; gesperrt?: boolean; ergebnis: unknown }[], g: Geoeffnet, projekt: string | undefined): boolean {
  return projekt === g.projekt && blaetter.some(b => b.art === g.art && b.zeit >= g.zeit && !b.gesperrt && b.ergebnis !== null && b.ergebnis !== undefined);
}

/** Beispiel-Abschnitte, deren geöffneter Schritt inzwischen ein Ergebnis hat und die noch nicht fertig sind (Einheit, Abschnitt). */
export function neuFertigeBeispiele(st: Stand, einheiten: readonly Einheit[], blaetter: Parameters<typeof hatErgebnis>[0], projekt: string | undefined): { einheit: Einheit; schluessel: string }[] {
  const aus: { einheit: Einheit; schluessel: string }[] = [];
  for (const [k, g] of Object.entries(st.geoeffnet)) {
    const [id, schluessel] = k.split('|') as [string, string];
    const e = einheiten.find(x => x.id === id);
    if (e && !st.fertig[id]?.includes(schluessel) && hatErgebnis(blaetter, g, projekt)) aus.push({ einheit: e, schluessel });
  }
  return aus;
}

/** Nummer des ersten Abschnitts, der nicht grün ist (sonst 0): hier macht man weiter. */
export function ersterOffener(st: Stand, e: Einheit): number {
  const i = abschnittsFarben(st, e).findIndex(f => f !== 'gruen');
  return i < 0 ? 0 : i;
}

/** Aus dem gespeicherten Text einen Stand lesen; Unlesbares und Leeres gilt als Anfang. */
export function leseStand(roh: string | null): Stand {
  if (!roh) return leererStand();
  try {
    const x = JSON.parse(roh) as Partial<Stand> | null;
    if (!x || typeof x !== 'object') return leererStand();
    const reihe = (v: unknown): v is string[] => Array.isArray(v) && v.every(y => typeof y === 'string');
    const st = leererStand();
    if (x.fertig && typeof x.fertig === 'object') for (const [k, v] of Object.entries(x.fertig)) if (reihe(v)) st.fertig[k] = v;
    if (x.erreicht && typeof x.erreicht === 'object') for (const [k, v] of Object.entries(x.erreicht)) if (typeof v === 'number' && Number.isInteger(v) && v >= 0) st.erreicht[k] = v;
    if (reihe(x.richtig)) st.richtig = x.richtig;
    if (x.geoeffnet && typeof x.geoeffnet === 'object') for (const [k, g] of Object.entries(x.geoeffnet)) if (g && typeof g.zeit === 'number' && typeof g.projekt === 'string' && typeof g.art === 'string') st.geoeffnet[k] = { zeit: g.zeit, projekt: g.projekt, art: g.art };
    if (x.zuletzt && typeof x.zuletzt.einheit === 'string' && typeof x.zuletzt.schluessel === 'string') st.zuletzt = { einheit: x.zuletzt.einheit, schluessel: x.zuletzt.schluessel };
    return st;
  } catch { return leererStand(); }
}
