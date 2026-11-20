/**
 * Geführte evaluative und typenbildende qualitative Inhaltsanalyse (Stufe A1, nach Kuckartz und Rädiker 2022).
 * Reine Funktionen auf dem Projekt. Statable bildet keine Typen und schlägt keine Kategorien oder Ausprägungen vor:
 * Der Mensch stuft ein, bildet und benennt. Hier wird nur angeordnet, zugeordnet und gezählt.
 * Evaluative Kategorie = Code mit Untercodes; jeder direkte Untercode ist eine Ausprägung (so geht sie auch ins REFI-QDA-Format).
 * Word enthält nie Text aus Dokumenten, nur Namen, Ausprägungen und Zahlen.
 */
import { baumReihenfolge, codePfad, legeCodeAn, nachfahren } from './kodieren';
import { cpTeil, type Code, type QualProjekt, type Typ, type Variable } from './qualprojekt';

export type Sprache = 'de' | 'en';
const neueId = (): string => globalThis.crypto.randomUUID();

/* ------------------------------------------------------------------ Evaluativ */

export interface EvaluativeKategorie { id: string; name: string; pfad: string; auspraegungen: { id: string; name: string }[] }

const kinder = (codes: readonly Code[], id: string): Code[] => codes.filter(c => c.elternId === id).sort((a, b) => a.reihenfolge - b.reihenfolge);

/** Alle Codes mit mindestens einem Untercode, in der Reihenfolge des Codebaums. */
export function evaluativeKategorien(q: QualProjekt): EvaluativeKategorie[] {
  return baumReihenfolge(q.codes)
    .filter(e => kinder(q.codes, e.code.id).length > 0)
    .map(e => ({ id: e.code.id, name: e.code.name, pfad: codePfad(q.codes, e.code.id), auspraegungen: kinder(q.codes, e.code.id).map(c => ({ id: c.id, name: c.name })) }));
}

const eine = (q: QualProjekt, id: string): EvaluativeKategorie | undefined => evaluativeKategorien(q).find(k => k.id === id);

/** Legt Eltern-Code und Untercodes (in der Reihenfolge) an. Wirft 'name-leer', 'name-vergeben', 'auspraegung-fehlt', 'auspraegung-doppelt'. */
export function legeEvaluativeKategorieAn(q: QualProjekt, name: string, auspraegungen: string[]): { q: QualProjekt; id: string; auspraegungen: string[] } {
  const namen = auspraegungen.map(a => a.trim()).filter(a => a !== '');
  if (!namen.length) throw new Error('auspraegung-fehlt');
  if (new Set(namen.map(n => n.toLowerCase())).size !== namen.length) throw new Error('auspraegung-doppelt');
  let r = legeCodeAn(q, name);
  const eltern = r.id;
  const ids: string[] = [];
  let neu = r.q;
  for (const n of namen) { r = legeCodeAn(neu, n, eltern); neu = r.q; ids.push(r.id); }
  return { q: neu, id: eltern, auspraegungen: ids };
}

export type FallErgebnisArt = 'eine' | 'unterschiedlich' | 'nicht-eingestuft' | 'keine';
export interface FallErgebnis { art: FallErgebnisArt; auspraegung?: string }
export interface StellenEintrag {
  segment: string; dokument: string; start: number; ende: number; text: string;
  /** Ausprägungen aller Personen an der Stelle */
  auspraegungen: string[];
  /** nur bei `fallUebersicht(q, id, ich)`: Ausprägungen dieser Person und die der anderen (Ausprägung-id, Personen-id) */
  meine?: string[];
  andere?: { auspraegung: string; kodierende: string }[];
  kodierende?: string;
}
export interface FallZeile { fallId: string | null; name: string; stellen: StellenEintrag[]; ergebnis: FallErgebnis }

/** Welche Ausprägung (direkter Untercode) gehört zu diesem Code? */
function auspraegungVon(q: QualProjekt, kat: EvaluativeKategorie, codeId: string): string | null {
  for (const a of kat.auspraegungen) if (a.id === codeId || nachfahren(q.codes, a.id).has(codeId)) return a.id;
  return null;
}

function ergebnisAus(stellen: StellenEintrag[]): FallErgebnis {
  if (!stellen.length) return { art: 'keine' };
  if (stellen.some(s => s.auspraegungen.length === 0)) return { art: 'nicht-eingestuft' };
  const alle = new Set(stellen.flatMap(s => s.auspraegungen));
  if (alle.size === 1) return { art: 'eine', auspraegung: [...alle][0]! };
  return { art: 'unterschiedlich' };
}

/**
 * Je Fall die Textstellen der Kategorie mit der vergebenen Ausprägung und das Fall-Ergebnis. Alle Fälle stehen drin (auch ohne Textstelle);
 * Dokumente ohne Fall als eine eigene Zeile (`fallId: null`), nur wenn sie Textstellen haben.
 */
export function fallUebersicht(q: QualProjekt, kategorieId: string, ich?: string): FallZeile[] {
  const kat = eine(q, kategorieId);
  if (!kat) return [];
  const familie = new Set([kat.id, ...nachfahren(q.codes, kat.id)]);
  const dok = new Map(q.dokumente.map(d => [d.id, d]));
  const proFall = new Map<string | null, StellenEintrag[]>();
  for (const seg of q.segmente) {
    const ks = q.kodierungen.filter(k => k.segment === seg.id && familie.has(k.code));
    if (!ks.length) continue;
    const d = dok.get(seg.dokument);
    if (!d) continue;
    const ausp = [...new Set(ks.map(k => auspraegungVon(q, kat, k.code)).filter((x): x is string => x !== null))];
    const e: StellenEintrag = { segment: seg.id, dokument: d.id, start: seg.start, ende: seg.ende, text: cpTeil(d.text, seg.start, seg.ende), auspraegungen: ausp };
    if (ich !== undefined) {
      e.meine = [...new Set(ks.filter(k => k.kodierende === ich).map(k => auspraegungVon(q, kat, k.code)).filter((x): x is string => x !== null))];
      e.andere = ks.filter(k => k.kodierende !== ich).flatMap(k => { const a = auspraegungVon(q, kat, k.code); return a === null ? [] : [{ auspraegung: a, kodierende: k.kodierende }]; });
    }
    if (seg.kodierende !== undefined) e.kodierende = seg.kodierende;
    const f = d.fall !== undefined && q.faelle.some(x => x.id === d.fall) ? d.fall : null;
    (proFall.get(f) ?? proFall.set(f, []).get(f)!).push(e);
  }
  const reihenfolge = (a: StellenEintrag, b: StellenEintrag): number => q.dokumente.findIndex(x => x.id === a.dokument) - q.dokumente.findIndex(x => x.id === b.dokument) || a.start - b.start || a.ende - b.ende;
  const zeilen: FallZeile[] = q.faelle.map(f => { const s = (proFall.get(f.id) ?? []).sort(reihenfolge); return { fallId: f.id, name: f.name, stellen: s, ergebnis: ergebnisAus(s) }; });
  const ohne = (proFall.get(null) ?? []).sort(reihenfolge);
  if (ohne.length) zeilen.push({ fallId: null, name: '', stellen: ohne, ergebnis: ergebnisAus(ohne) });
  return zeilen;
}

/**
 * Setzt am Segment genau eine Ausprägung der Kategorie (`null`: keine, die Stelle bleibt in der Kategorie). Andere Ausprägungen derselben Kategorie an dieser Stelle fallen weg.
 * Die Stelle verschwindet nie: erst wird die neue Kodierung gesetzt, dann die alte entfernt.
 */
export function stufeEin(q: QualProjekt, segmentId: string, kategorieId: string, auspraegungId: string | null, kodierende: string): QualProjekt {
  const kat = eine(q, kategorieId);
  const seg = q.segmente.find(s => s.id === segmentId);
  if (!kat || !seg) return q;
  if (auspraegungId !== null && !kat.auspraegungen.some(a => a.id === auspraegungId)) return q;
  const familie = new Set([kat.id, ...nachfahren(q.codes, kat.id)]);
  const aus = new Set(kat.auspraegungen.flatMap(a => [a.id, ...nachfahren(q.codes, a.id)]));
  // Nur die eigenen Kodierungen dieser Person: Einstufungen anderer Kodierender bleiben unberührt (Abnahme Opus 13.11.)
  const vorhanden = q.kodierungen.filter(k => k.segment === segmentId && familie.has(k.code) && k.kodierende === kodierende);
  const jetzt = Date.now();
  let kodierungen = q.kodierungen;
  if (auspraegungId !== null) {
    const schon = vorhanden.filter(k => k.code === auspraegungId);
    const anderes = vorhanden.filter(k => aus.has(k.code) && k.code !== auspraegungId);
    if (schon.length === 1 && !anderes.length) return q;
    const weg = new Set(anderes.map(k => k.id));
    kodierungen = q.kodierungen.filter(k => !weg.has(k.id));
    if (!schon.length) kodierungen = [...kodierungen, { id: neueId(), segment: segmentId, code: auspraegungId, kodierende, erstellt: jetzt }];
  } else {
    const anderes = vorhanden.filter(k => aus.has(k.code));
    if (!anderes.length) return q;
    const weg = new Set(anderes.map(k => k.id));
    kodierungen = q.kodierungen.filter(k => !weg.has(k.id));
    if (!vorhanden.some(k => k.code === kat.id)) kodierungen = [...kodierungen, { id: neueId(), segment: segmentId, code: kat.id, kodierende, erstellt: jetzt }];
  }
  return { ...q, kodierungen };
}

export interface ErgebnisZeile { art: FallErgebnisArt; auspraegung?: string; anzahl: number; nachWert?: number[] }
export interface ErgebnisTabelle { zeilen: ErgebnisZeile[]; spalten?: { schluessel: string; name: string }[]; gesamt: number; nachWertGesamt?: number[] }

const FEHLT = { de: 'fehlt', en: 'missing' };

function wertText(w: Fall_Wert, sp: Sprache): string {
  if (w === null || w === undefined || w === '') return FEHLT[sp];
  if (typeof w === 'boolean') return sp === 'de' ? (w ? 'ja' : 'nein') : (w ? 'yes' : 'no');
  return String(w);
}
type Fall_Wert = string | number | boolean | null | undefined;

/** Sortierschlüssel eines Variablenwerts: Zahlen nach Größe, Text alphabetisch, fehlend zuletzt. */
function wertRang(w: Fall_Wert): [number, number | string] {
  if (w === null || w === undefined || w === '') return [2, 0];
  if (typeof w === 'number') return [0, w];
  if (typeof w === 'boolean') return [0, w ? 1 : 0];
  return [1, w];
}
const vergleicheRang = (a: [number, number | string], b: [number, number | string]): number => {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (typeof a[1] === 'number' && typeof b[1] === 'number') return a[1] - b[1];
  return String(a[1]).localeCompare(String(b[1]), 'de');
};

/**
 * Häufigkeit der Fall-Ergebnisse (nur echte Fälle; „Dokumente ohne Fall“ zählen nicht), in fester Reihenfolge: Ausprägungen im Codebaum, dann
 * „unterschiedlich“, „nicht eingestuft“, „keine Textstelle“. Mit `variableId` gekreuzt mit den Werten dieser Fallvariable (Spalten nach den Werten sortiert).
 */
export function ergebnisTabelle(q: QualProjekt, kategorieId: string, variableId?: string, sprache: Sprache = 'de'): ErgebnisTabelle {
  const kat = eine(q, kategorieId);
  if (!kat) return { zeilen: [], gesamt: 0 };
  const fz = fallUebersicht(q, kategorieId).filter(z => z.fallId !== null);
  const reihe: { art: FallErgebnisArt; auspraegung?: string }[] = [
    ...kat.auspraegungen.map(a => ({ art: 'eine' as const, auspraegung: a.id })),
    { art: 'unterschiedlich' }, { art: 'nicht-eingestuft' }, { art: 'keine' },
  ];
  const passt = (z: FallZeile, r: { art: FallErgebnisArt; auspraegung?: string }) => z.ergebnis.art === r.art && z.ergebnis.auspraegung === r.auspraegung;
  const v: Variable | undefined = variableId ? q.variablen.find(x => x.id === variableId) : undefined;
  if (!v) return { zeilen: reihe.map(r => ({ ...r, anzahl: fz.filter(z => passt(z, r)).length })), gesamt: fz.length };
  const wert = (fallId: string): Fall_Wert => q.faelle.find(f => f.id === fallId)?.werte[v.id];
  const spalten = new Map<string, { schluessel: string; name: string; rang: [number, number | string] }>();
  for (const z of fz) { const w = wert(z.fallId!), s = wertText(w, sprache); if (!spalten.has(s)) spalten.set(s, { schluessel: s, name: s, rang: wertRang(w) }); }
  const sp = [...spalten.values()].sort((a, b) => vergleicheRang(a.rang, b.rang));
  const zaehle = (liste: FallZeile[]) => sp.map(c => liste.filter(z => wertText(wert(z.fallId!), sprache) === c.schluessel).length);
  return {
    zeilen: reihe.map(r => { const l = fz.filter(z => passt(z, r)); return { ...r, anzahl: l.length, nachWert: zaehle(l) }; }),
    spalten: sp.map(c => ({ schluessel: c.schluessel, name: c.name })), gesamt: fz.length, nachWertGesamt: zaehle(fz),
  };
}

/** Wortlaut eines Fall-Ergebnisses für Anzeige und Word. */
export function ergebnisText(q: QualProjekt, kategorieId: string, e: FallErgebnis, sprache: Sprache = 'de'): string {
  const T = sprache === 'de' ? { u: 'unterschiedlich', n: 'nicht eingestuft', k: 'keine Textstelle' } : { u: 'differing', n: 'not rated', k: 'no passage' };
  if (e.art === 'eine') return q.codes.find(c => c.id === e.auspraegung)?.name ?? '';
  return e.art === 'unterschiedlich' ? T.u : e.art === 'nicht-eingestuft' ? T.n : T.k;
}

/* ------------------------------------------------------------------ Typenbildend */

export const MERKMALE_MAX = 3;

export interface MerkmalInfo { id: string; name: string; art: 'code' | 'auspraegung' | 'variable' }
export interface RaumZeile { werte: string[]; anzahl: number; faelle: { id: string; name: string }[] }
export interface Merkmalsraum { merkmale: MerkmalInfo[]; zeilen: RaumZeile[] }
type Zelle = { text: string; rang: [number, number | string] };

const JANEIN = { de: ['ja', 'nein'], en: ['yes', 'no'] };

/** Merkmalswerte je Fall (in der Reihenfolge der Merkmale); unbekannte Merkmals-ids fallen weg. */
function fallWerte(q: QualProjekt, merkmale: string[], sprache: Sprache): { info: MerkmalInfo[]; je: Map<string, Zelle[]> } {
  const kats = evaluativeKategorien(q);
  const info: MerkmalInfo[] = [];
  const je = new Map<string, Zelle[]>(q.faelle.map(f => [f.id, []]));
  for (const id of merkmale) {
    const kat = kats.find(k => k.id === id);
    const code = q.codes.find(c => c.id === id);
    const v = q.variablen.find(x => x.id === id);
    if (kat) {
      info.push({ id, name: kat.name, art: 'auspraegung' });
      const uebersicht = fallUebersicht(q, id);
      for (const f of q.faelle) {
        const z = uebersicht.find(x => x.fallId === f.id)!;
        const e = z.ergebnis;
        const rang = e.art === 'eine' ? kat.auspraegungen.findIndex(a => a.id === e.auspraegung) : kat.auspraegungen.length + (e.art === 'unterschiedlich' ? 0 : e.art === 'nicht-eingestuft' ? 1 : 2);
        je.get(f.id)!.push({ text: ergebnisText(q, id, e, sprache), rang: [0, rang] });
      }
    } else if (code) {
      info.push({ id, name: code.name, art: 'code' });
      const hat = new Set<string>();
      const dokFall = new Map(q.dokumente.map(d => [d.id, d.fall]));
      for (const s of q.segmente) if (q.kodierungen.some(k => k.segment === s.id && k.code === id)) { const f = dokFall.get(s.dokument); if (f !== undefined) hat.add(f); }
      for (const f of q.faelle) je.get(f.id)!.push(hat.has(f.id) ? { text: JANEIN[sprache][0]!, rang: [0, 0] } : { text: JANEIN[sprache][1]!, rang: [0, 1] });
    } else if (v) {
      info.push({ id, name: v.name, art: 'variable' });
      for (const f of q.faelle) { const w = f.werte[v.id]; je.get(f.id)!.push({ text: wertText(w, sprache), rang: wertRang(w) }); }
    }
  }
  return { info, je };
}

/**
 * Alle vorkommenden Kombinationen der Merkmale (1 bis 3), je mit Zahl und Namen der Fälle. Feste Reihenfolge nach den Werten (nicht nach Häufigkeit).
 * Code ohne Untercodes: Textstelle ja/nein; evaluative Kategorie: Ausprägung des Falls; Variable: Wert, fehlend als „fehlt“. Wirft 'zu-viele' bei mehr als drei Merkmalen.
 */
export function merkmalsraum(q: QualProjekt, merkmale: string[], sprache: Sprache = 'de'): Merkmalsraum {
  const ids = [...new Set(merkmale)];
  if (ids.length > MERKMALE_MAX) throw new Error('zu-viele');
  const { info, je } = fallWerte(q, ids, sprache);
  if (!info.length) return { merkmale: [], zeilen: [] };
  const gruppen = new Map<string, { zellen: Zelle[]; faelle: { id: string; name: string }[] }>();
  for (const f of q.faelle) {
    const z = je.get(f.id)!;
    const k = JSON.stringify(z.map(x => x.text));
    const g = gruppen.get(k) ?? { zellen: z, faelle: [] };
    g.faelle.push({ id: f.id, name: f.name });
    gruppen.set(k, g);
  }
  const zeilen = [...gruppen.values()].sort((a, b) => {
    for (let i = 0; i < a.zellen.length; i++) { const c = vergleicheRang(a.zellen[i]!.rang, b.zellen[i]!.rang); if (c) return c; }
    return 0;
  }).map(g => ({ werte: g.zellen.map(z => z.text), anzahl: g.faelle.length, faelle: g.faelle }));
  return { merkmale: info, zeilen };
}

const typNameFrei = (q: QualProjekt, name: string, ausser?: string): boolean => !(q.typen ?? []).some(t => t.id !== ausser && t.name.trim().toLowerCase() === name.trim().toLowerCase());
const mitTypen = (q: QualProjekt, typen: Typ[]): QualProjekt => {
  const neu = { ...q, typen };
  if (!typen.length) delete (neu as { typen?: Typ[] }).typen;
  return neu;
};
const gueltigeMerkmale = (q: QualProjekt, m: string[]): string[] => [...new Set(m)].filter(id => q.codes.some(c => c.id === id) || q.variablen.some(v => v.id === id));

/** Legt einen Typ an (ohne Fälle). Wirft 'name-leer', 'name-vergeben'. */
export function legeTypAn(q: QualProjekt, name: string, merkmale: string[], beschreibung?: string): { q: QualProjekt; id: string } {
  const n = name.trim();
  if (!n) throw new Error('name-leer');
  if (!typNameFrei(q, n)) throw new Error('name-vergeben');
  const t: Typ = { id: neueId(), name: n, faelle: [], merkmale: gueltigeMerkmale(q, merkmale) };
  if (beschreibung?.trim()) t.beschreibung = beschreibung.trim();
  return { q: mitTypen(q, [...(q.typen ?? []), t]), id: t.id };
}

/** Ändert Name, Beschreibung (leer = entfernen) oder Merkmale. Wirft 'name-leer', 'name-vergeben'. */
export function aendereTyp(q: QualProjekt, id: string, felder: { name?: string; beschreibung?: string; merkmale?: string[] }): QualProjekt {
  if (!(q.typen ?? []).some(t => t.id === id)) return q;
  if (felder.name !== undefined) {
    if (!felder.name.trim()) throw new Error('name-leer');
    if (!typNameFrei(q, felder.name, id)) throw new Error('name-vergeben');
  }
  return mitTypen(q, (q.typen ?? []).map(t => {
    if (t.id !== id) return t;
    const neu: Typ = { ...t };
    if (felder.name !== undefined) neu.name = felder.name.trim();
    if (felder.beschreibung !== undefined) { if (felder.beschreibung.trim()) neu.beschreibung = felder.beschreibung.trim(); else delete neu.beschreibung; }
    if (felder.merkmale !== undefined) neu.merkmale = gueltigeMerkmale(q, felder.merkmale);
    return neu;
  }));
}

export function entferneTyp(q: QualProjekt, id: string): QualProjekt {
  if (!(q.typen ?? []).some(t => t.id === id)) return q;
  return mitTypen(q, (q.typen ?? []).filter(t => t.id !== id));
}

export interface Umgezogen { fallId: string; vonTypId: string; vonTyp: string }

/** Ordnet Fälle einem Typ zu oder nimmt sie heraus. Ein Fall ist in höchstens einem Typ: beim Zuordnen verlässt er den alten, das steht in `umgezogen`. */
export function ordneFaelleZu(q: QualProjekt, typId: string, fallIds: string[], an: boolean): { q: QualProjekt; umgezogen: Umgezogen[] } {
  const typen = q.typen ?? [];
  if (!typen.some(t => t.id === typId)) return { q, umgezogen: [] };
  const ids = [...new Set(fallIds)].filter(id => q.faelle.some(f => f.id === id));
  const umgezogen: Umgezogen[] = [];
  const neu = typen.map(t => {
    if (t.id === typId) {
      return { ...t, faelle: an ? [...t.faelle, ...ids.filter(f => !t.faelle.includes(f))] : t.faelle.filter(f => !ids.includes(f)) };
    }
    if (!an) return t;
    const weg = t.faelle.filter(f => ids.includes(f));
    for (const f of weg) umgezogen.push({ fallId: f, vonTypId: t.id, vonTyp: t.name });
    return weg.length ? { ...t, faelle: t.faelle.filter(f => !ids.includes(f)) } : t;
  });
  return { q: mitTypen(q, neu), umgezogen };
}

/** Fälle, die in keinem Typ sind (in der Reihenfolge der Fälle). */
export function faelleOhneTyp(q: QualProjekt): { id: string; name: string }[] {
  const belegt = new Set((q.typen ?? []).flatMap(t => t.faelle));
  return q.faelle.filter(f => !belegt.has(f.id)).map(f => ({ id: f.id, name: f.name }));
}

/** Typ, in dem der Fall liegt. */
export const typVonFall = (q: QualProjekt, fallId: string): Typ | undefined => (q.typen ?? []).find(t => t.faelle.includes(fallId));

/* ------------------------------------------------------------------ Word */

const W = {
  de: {
    typenTitel: 'Typen von Fällen (typenbildende Inhaltsanalyse)', typenHinweis: 'Die Typen wurden von der auswertenden Person gebildet und benannt. Statable hat keine Typen vorgeschlagen.',
    keineTypen: 'Es sind noch keine Typen angelegt.', merkmale: 'Merkmale', faelle: 'Fälle', beschreibung: 'Beschreibung', fall: 'Fall', keine: 'keine', ohneTyp: 'Fälle ohne Typ', anzahl: (n: number) => (n === 1 ? '1 Fall' : `${n} Fälle`),
    evTitel: (k: string) => `Fall-Übersicht: ${k} (evaluative Inhaltsanalyse)`, evHinweis: 'Die Ausprägungen wurden von der auswertenden Person vergeben. Statable hat nichts eingestuft. Es stehen keine Textstellen in dieser Datei, nur Zahlen.',
    uebersicht: 'Fall-Übersicht', ergebnis: 'Ergebnis', stellen: 'Textstellen', eingestuft: 'davon eingestuft', ohneFall: 'Dokumente ohne Fall', haeufig: 'Häufigkeit der Ergebnisse', zahl: 'Zahl der Fälle',
    ausp: 'Ausprägungen', erklaer: (a: string) => `Ausprägungen: ${a}.`,
  },
  en: {
    typenTitel: 'Types of cases (type-building content analysis)', typenHinweis: 'The types were formed and named by the person doing the analysis. Statable did not suggest any types.',
    keineTypen: 'No types have been created yet.', merkmale: 'Attributes', faelle: 'Cases', beschreibung: 'Description', fall: 'Case', keine: 'none', ohneTyp: 'Cases without a type', anzahl: (n: number) => (n === 1 ? '1 case' : `${n} cases`),
    evTitel: (k: string) => `Case overview: ${k} (evaluative content analysis)`, evHinweis: 'The ratings were assigned by the person doing the analysis. Statable rated nothing. This file contains no passages, only numbers.',
    uebersicht: 'Case overview', ergebnis: 'Result', stellen: 'Passages', eingestuft: 'of them rated', ohneFall: 'Documents without a case', haeufig: 'Frequency of the results', zahl: 'Number of cases',
    ausp: 'Ratings', erklaer: (a: string) => `Ratings: ${a}.`,
  },
};

// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');

async function werkzeug(sp: Sprache) {
  const D = await import('docx');
  const { wordStile } = await import('./export');
  const stile = wordStile(D);
  const styles = { ...stile, default: { ...stile.default, document: { run: { ...stile.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
  const ueb = (t: string, e: 'TITLE' | 'HEADING_1' | 'HEADING_2') => new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : e === 'HEADING_1' ? 26 : 24 })] });
  const absatz = (t: string, o: { bold?: boolean; italics?: boolean } = {}) => new D.Paragraph({ spacing: { after: 80 }, children: [lauf(t, o)] });
  const zelle = (t: string, fett: boolean) => new D.TableCell({ children: [new D.Paragraph({ children: [new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: 20, bold: fett })] })] });
  const tabelle = (kopf: string[], zeilen: string[][]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
    rows: [
      new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(x => zelle(x, true)) }),
      ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map((x, i) => zelle(x, i === 0)) })),
    ],
  });
  const dokument = async (titel: string, kinder: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[]) =>
    new Uint8Array(await D.Packer.toArrayBuffer(new D.Document({ creator: 'Statable', title: titel, styles, sections: [{ children: kinder }] })));
  return { ueb, absatz, tabelle, dokument };
}

/** Typen mit Beschreibung, Fällen, Merkmalen und je Typ die Merkmalswerte seiner Fälle als Tabelle. Keine Texte aus Dokumenten. */
export async function typenWord(q: QualProjekt, sprache: Sprache): Promise<Uint8Array> {
  const sp: Sprache = sprache === 'en' ? 'en' : 'de', w = W[sp];
  const t = await werkzeug(sp);
  const k: (ReturnType<typeof t.ueb> | ReturnType<typeof t.tabelle>)[] = [t.ueb(w.typenTitel, 'TITLE'), t.absatz(w.typenHinweis, { italics: true })];
  const typen = q.typen ?? [];
  if (!typen.length) k.push(t.absatz(w.keineTypen, { italics: true }));
  for (const typ of typen) {
    k.push(t.ueb(typ.name, 'HEADING_1'));
    if (typ.beschreibung) k.push(t.absatz(`${w.beschreibung}: ${typ.beschreibung}`));
    const faelle = typ.faelle.map(id => q.faelle.find(f => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
    const { info, je } = fallWerte(q, typ.merkmale, sp);
    k.push(t.absatz(`${w.merkmale}: ${info.length ? info.map(i => i.name).join(', ') : w.keine}`));
    k.push(t.absatz(`${w.faelle}: ${w.anzahl(faelle.length)}`));
    if (faelle.length) k.push(t.tabelle([w.fall, ...info.map(i => i.name)], faelle.map(f => [f.name, ...(je.get(f.id) ?? []).map(z => z.text)])));
  }
  const ohne = faelleOhneTyp(q);
  if (typen.length && ohne.length) { k.push(t.ueb(w.ohneTyp, 'HEADING_1')); k.push(t.absatz(ohne.map(f => f.name).join(', '))); }
  return t.dokument(w.typenTitel, k);
}

/** Fall - Ergebnis mit Zahlen der Textstellen und Häufigkeit der Ergebnisse. Keine Texte aus Dokumenten. */
export async function evaluativWord(q: QualProjekt, kategorieId: string, sprache: Sprache): Promise<Uint8Array> {
  const sp: Sprache = sprache === 'en' ? 'en' : 'de', w = W[sp];
  const kat = eine(q, kategorieId);
  const t = await werkzeug(sp);
  const name = kat?.name ?? '';
  const k: (ReturnType<typeof t.ueb> | ReturnType<typeof t.tabelle>)[] = [t.ueb(w.evTitel(name), 'TITLE'), t.absatz(w.evHinweis, { italics: true })];
  if (kat) {
    k.push(t.absatz(w.erklaer(kat.auspraegungen.map(a => a.name).join(', '))));
    k.push(t.ueb(w.uebersicht, 'HEADING_1'));
    const zeilen = fallUebersicht(q, kategorieId);
    k.push(t.tabelle([w.fall, w.ergebnis, w.stellen, w.eingestuft], zeilen.map(z => [z.fallId === null ? w.ohneFall : z.name, ergebnisText(q, kategorieId, z.ergebnis, sp), String(z.stellen.length), String(z.stellen.filter(s => s.auspraegungen.length > 0).length)])));
    k.push(t.ueb(w.haeufig, 'HEADING_1'));
    const h = ergebnisTabelle(q, kategorieId, undefined, sp);
    k.push(t.tabelle([w.ergebnis, w.zahl], h.zeilen.map(z => [ergebnisText(q, kategorieId, z, sp), String(z.anzahl)])));
  }
  return t.dokument(w.evTitel(name), k);
}
