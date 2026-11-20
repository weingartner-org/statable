/**
 * Mixed Methods (Stufe A2): Verknüpfung qualitativer Fälle mit dem Datensatz, Gruppen, Zellen und Aufbau der Joint Displays.
 * Architekturblatt `docs/ausbau/ARCHITEKTUR-DATENMODELL-AUSBAU.md`, Abschnitt 6; Fachblatt `docs/ausbau/FACHBLATT-MIXED-METHODS.md`.
 *
 * Regeln: Statable zählt und rechnet nur. Belegstellen wählt die Person (nie automatisch „typisch“), Passung und Meta-Inferenz schreibt die Person.
 * Gezählt werden nur Fälle mit mindestens einem Dokument (ein Fall ohne Interview hätte immer „0“ und verzerrt „3 von 5“).
 * Kennwerte: n, fehlend, Mittelwert, SD (n − 1; bei n < 2 null), Median (Mittel der beiden mittleren Werte wie in R), kleinster und größter Wert;
 * bei Gruppen-Spalten Häufigkeiten mit Prozent der gültigen Werte. Sollwerte aus R: `scripts/ausbau-a2-erwartet.R`.
 * Text aus Dateien kommt nur als Text auf die Seite; nichts geht an R oder PSPP.
 */
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';
import { proz } from '../i18n/profil';
import { istFehlend, type FehlendBereich } from './fehlend';
import { nachfahren } from './kodieren';
import { themaSegmente } from './themen';
import { cpTeil, type JdBeleg, type JdGruppierung, type JdPassung, type JdZeile, type JointDisplay, type QualProjekt, type Verknuepfung } from './qualprojekt';

/* ---------- Datensatz (nur lesend) ---------- */

export type Zelle = string | number | null;
export interface DatenSpalte { name: string; bezeichnung?: string; art: 'zahl' | 'text' | 'datum'; niveau?: string; fehlend: number[]; fehlendBereich?: FehlendBereich; werteLabels: Record<string, string>; leerGueltig?: boolean }
export interface DatenSicht { spalten: DatenSpalte[]; zeilen: Zelle[][] }

/** Wert als Schlüssel: Text ohne Rand, Zahl als kürzeste Schreibweise, Ja/Nein als true/false; leer oder fehlend = null. */
export function schluessel(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const t = String(v).trim();
  return t === '' ? null : t;
}
/** Ein gültiger Wert der Datenspalte (fehlend-Codes und leerer Text → null). */
export function gueltig(sp: DatenSpalte, v: Zelle | undefined): Zelle {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return istFehlend(sp, v) ? null : v;
  if (v.trim() === '' && !sp.leerGueltig) return null;
  return v;
}

/* ---------- Verknüpfung ---------- */

export interface VerknuepfungErgebnis {
  /** Fall-id → Zeilenindex im Datensatz (nur eindeutige Treffer) */
  zuordnung: Record<string, number>;
  /** Fälle ohne Wert in der Fallvariable */
  ohneWert: string[];
  /** Fälle, deren Wert im Datensatz nicht vorkommt */
  ohneTreffer: string[];
  /** Fälle, deren Wert im Datensatz mehrmals vorkommt (nicht verknüpft) */
  mehrfach: string[];
  /** Fälle, die denselben Wert wie ein anderer Fall haben (beide verknüpft, aber mit derselben Zeile) */
  gleicheZeile: string[];
  /** Die Spalte gibt es im Datensatz nicht (mehr). */
  spalteFehlt: boolean;
}

export function verknuepfe(q: Pick<QualProjekt, 'faelle'>, daten: DatenSicht, v: Pick<Verknuepfung, 'variable' | 'spalte'>): VerknuepfungErgebnis {
  const r: VerknuepfungErgebnis = { zuordnung: {}, ohneWert: [], ohneTreffer: [], mehrfach: [], gleicheZeile: [], spalteFehlt: false };
  const si = daten.spalten.findIndex(s => s.name === v.spalte);
  if (si < 0) { r.spalteFehlt = true; return r; }
  const sp = daten.spalten[si]!;
  const zeilen = new Map<string, number[]>();
  daten.zeilen.forEach((z, i) => { const k = schluessel(gueltig(sp, z[si])); if (k !== null) { const l = zeilen.get(k); if (l) l.push(i); else zeilen.set(k, [i]); } });
  const proZeile = new Map<number, string[]>();
  for (const f of q.faelle) {
    const k = schluessel(f.werte[v.variable]);
    if (k === null) { r.ohneWert.push(f.id); continue; }
    const t = zeilen.get(k);
    if (!t) r.ohneTreffer.push(f.id);
    else if (t.length > 1) r.mehrfach.push(f.id);
    else { r.zuordnung[f.id] = t[0]!; const l = proZeile.get(t[0]!); if (l) l.push(f.id); else proZeile.set(t[0]!, [f.id]); }
  }
  for (const l of proZeile.values()) if (l.length > 1) r.gleicheZeile.push(...l);
  return r;
}

/* ---------- Fälle und Gruppen ---------- */

/** Fälle mit mindestens einem Dokument, in der Reihenfolge des Projekts. */
export function faelleMitDokument(q: Pick<QualProjekt, 'faelle' | 'dokumente'>): string[] {
  const mit = new Set(q.dokumente.map(d => d.fall).filter((f): f is string => !!f));
  return q.faelle.filter(f => mit.has(f.id)).map(f => f.id);
}

/** Segmente einer qualitativen Zeile: ein Code mit allen Untercodes, ein Thema über seine Codes (wie `themaSegmente`). */
export function zeilenSegmente(q: QualProjekt, z: JdZeile): Set<string> {
  if (z.art === 'thema') { const t = (q.themen ?? []).find(x => x.id === z.id); return new Set(t ? themaSegmente(q, t) : []); }
  const codes = new Set([z.id, ...nachfahren(q.codes, z.id)]);
  return new Set(q.kodierungen.filter(k => codes.has(k.code)).map(k => k.segment));
}
/** Fall-id je Segment (über das Dokument); Segmente in Dokumenten ohne Fall fehlen. */
function segmentFall(q: QualProjekt): Map<string, string> {
  const dokFall = new Map(q.dokumente.map(d => [d.id, d.fall]));
  const m = new Map<string, string>();
  for (const s of q.segmente) { const f = dokFall.get(s.dokument); if (f) m.set(s.id, f); }
  return m;
}

export const zeilenSchluessel = (z: JdZeile): string => `${z.art}:${z.id}`;
export const OHNE = 'ohne', NICHT_VERKNUEPFT = 'nv', MIT = 'mit', ALLE = 'alle';

export interface JdGruppe { schluessel: string; name: string; faelle: string[] }

const sortiereWerte = (a: string, b: string): number => {
  const x = Number(a), y = Number(b);
  if (a !== '' && b !== '' && Number.isFinite(x) && Number.isFinite(y)) return x - y;
  return a.localeCompare(b, 'de');
};
const wertName = (v: unknown): string => (typeof v === 'boolean' ? (v ? L('ja', 'yes') : L('nein', 'no')) : typeof v === 'number' ? zahlDe(v) : String(v).trim());

/** Name eines Werts aus der Datenspalte (Wertebeschriftung, sonst der Wert). */
export function datenWertName(sp: DatenSpalte, v: Zelle): string {
  if (v === null) return '';
  const lab = sp.werteLabels[String(v)];
  return lab ? (typeof v === 'number' ? `${lab}` : lab) : typeof v === 'number' ? zahlDe(v) : v;
}

/**
 * Gruppen der Fälle `faelle` nach `g`. Reihenfolge: Werte sortiert (Zahlen der Größe nach), Typen in ihrer Reihenfolge, „mit“ vor „ohne“;
 * „ohne Angabe“ und „nicht verknüpft“ zuletzt und nur, wenn es solche Fälle gibt. Leere Gruppen fallen weg (außer „mit“/„ohne“ bei Code und Thema).
 */
export function jdGruppen(q: QualProjekt, g: JdGruppierung, faelle: string[], ctx: { daten?: DatenSicht; zuordnung?: Record<string, number> } = {}): JdGruppe[] {
  const fallVon = new Map(q.faelle.map(f => [f.id, f]));
  const liste = faelle.filter(f => fallVon.has(f));
  const ohneName = L('ohne Angabe', 'not stated');
  if (g.quelle === 'variable') {
    const je = new Map<string, { name: string; faelle: string[] }>(); const ohne: string[] = [];
    for (const id of liste) {
      const v = fallVon.get(id)!.werte[g.id], k = schluessel(v);
      if (k === null) { ohne.push(id); continue; }
      const e = je.get(k); if (e) e.faelle.push(id); else je.set(k, { name: wertName(v), faelle: [id] });
    }
    const r: JdGruppe[] = [...je.entries()].sort((a, b) => sortiereWerte(a[0], b[0])).map(([k, e]) => ({ schluessel: `w:${k}`, name: e.name, faelle: e.faelle }));
    if (ohne.length) r.push({ schluessel: OHNE, name: ohneName, faelle: ohne });
    return r;
  }
  if (g.quelle === 'typen') {
    const r: JdGruppe[] = []; const drin = new Set<string>();
    for (const t of q.typen ?? []) {
      const f = liste.filter(id => t.faelle.includes(id));
      f.forEach(id => drin.add(id));
      if (f.length) r.push({ schluessel: `typ:${t.id}`, name: t.name, faelle: f });
    }
    const ohne = liste.filter(id => !drin.has(id));
    if (ohne.length) r.push({ schluessel: OHNE, name: L('ohne Typ', 'no type'), faelle: ohne });
    return r;
  }
  if (g.quelle === 'spalte') {
    const d = ctx.daten, z = ctx.zuordnung ?? {};
    const si = d ? d.spalten.findIndex(s => s.name === g.name) : -1;
    const je = new Map<string, { name: string; faelle: string[] }>(); const ohne: string[] = [], nv: string[] = [];
    for (const id of liste) {
      const zi = z[id];
      if (zi === undefined || !d || si < 0) { nv.push(id); continue; }
      const sp = d.spalten[si]!, v = gueltig(sp, d.zeilen[zi]?.[si]), k = schluessel(v);
      if (k === null) { ohne.push(id); continue; }
      const e = je.get(k); if (e) e.faelle.push(id); else je.set(k, { name: datenWertName(sp, v), faelle: [id] });
    }
    const r: JdGruppe[] = [...je.entries()].sort((a, b) => sortiereWerte(a[0], b[0])).map(([k, e]) => ({ schluessel: `w:${k}`, name: e.name, faelle: e.faelle }));
    if (ohne.length) r.push({ schluessel: OHNE, name: ohneName, faelle: ohne });
    if (nv.length) r.push({ schluessel: NICHT_VERKNUEPFT, name: L('nicht verknüpft', 'not linked'), faelle: nv });
    return r;
  }
  // mit / ohne einem Code oder Thema
  const segs = zeilenSegmente(q, { art: g.quelle, id: g.id });
  const sf = segmentFall(q), mit = new Set<string>();
  for (const s of segs) { const f = sf.get(s); if (f) mit.add(f); }
  const name = g.quelle === 'code' ? (q.codes.find(c => c.id === g.id)?.name ?? '') : ((q.themen ?? []).find(t => t.id === g.id)?.name ?? '');
  return [
    { schluessel: MIT, name: L(`mit „${name}“`, `with "${name}"`), faelle: liste.filter(id => mit.has(id)) },
    { schluessel: OHNE, name: L(`ohne „${name}“`, `without "${name}"`), faelle: liste.filter(id => !mit.has(id)) },
  ];
}

/* ---------- Qualitative Zellen ---------- */

export interface JdZelle {
  /** Fälle der Gruppe mit mindestens einer Stelle der Zeile */
  mit: string[];
  n: number;
  /** wählbare Belegstellen: Segmente der Zeile in Fällen der Gruppe (Reihenfolge: Dokumente, dann Position) */
  kandidaten: string[];
}
export function jdZelle(q: QualProjekt, z: JdZeile, faelle: string[]): JdZelle {
  const segs = zeilenSegmente(q, z), sf = segmentFall(q), gr = new Set(faelle);
  const dokPos = new Map(q.dokumente.map((d, i) => [d.id, i]));
  const kand = q.segmente.filter(s => segs.has(s.id) && gr.has(sf.get(s.id) ?? ''))
    .sort((a, b) => (dokPos.get(a.dokument)! - dokPos.get(b.dokument)!) || a.start - b.start || a.ende - b.ende);
  const mit = new Set(kand.map(s => sf.get(s.id)!));
  return { mit: faelle.filter(f => mit.has(f)), n: faelle.length, kandidaten: kand.map(s => s.id) };
}
/** „3 von 5 Fällen“ */
export const anteilText = (mit: number, n: number): string =>
  L(`${mit} von ${n} ${n === 1 ? 'Fall' : 'Fällen'}`, `${mit} of ${n} ${n === 1 ? 'case' : 'cases'}`);

/** Text und Quelle einer Belegstelle: „…“ (Dokument, Fall). */
export function belegText(q: QualProjekt, segment: string): { text: string; quelle: string } | null {
  const s = q.segmente.find(x => x.id === segment); if (!s) return null;
  const d = q.dokumente.find(x => x.id === s.dokument); if (!d) return null;
  const f = d.fall ? q.faelle.find(x => x.id === d.fall)?.name : undefined;
  return { text: cpTeil(d.text, s.start, s.ende).trim(), quelle: f ? `${d.name}, ${f}` : d.name };
}

/* ---------- Kennwerte ---------- */

export interface KennZahl { art: 'zahl'; n: number; fehlend: number; m: number | null; sd: number | null; median: number | null; min: number | null; max: number | null }
export interface KennGruppe { art: 'gruppe'; n: number; fehlend: number; stufen: { wert: string; name: string; n: number; prozent: number }[] }
export type Kenn = KennZahl | KennGruppe;

/** Gruppe oder Zahl? Text und Spalten mit höchstens zwei verschiedenen Werten oder nominale Zahlen mit Beschriftungen sind Gruppen (wie `qArt` in „Fälle vergleichen“). */
export function spaltenArt(sp: DatenSpalte, alle: Zelle[]): 'zahl' | 'gruppe' {
  if (sp.art !== 'zahl') return 'gruppe';
  const verschieden = new Set(alle.map(v => gueltig(sp, v)).filter(v => v !== null)).size;
  if (verschieden === 2) return 'gruppe';
  return sp.niveau === 'nominal' && Object.keys(sp.werteLabels).length > 0 ? 'gruppe' : 'zahl';
}

export function kennwerte(sp: DatenSpalte, werte: Zelle[], art: 'zahl' | 'gruppe' = spaltenArt(sp, werte)): Kenn {
  const g = werte.map(v => gueltig(sp, v));
  const da = g.filter((v): v is string | number => v !== null);
  const fehlend = g.length - da.length;
  if (art === 'gruppe') {
    const je = new Map<string, { v: string | number; n: number }>();
    for (const v of da) { const k = String(v); const e = je.get(k); if (e) e.n++; else je.set(k, { v, n: 1 }); }
    const stufen = [...je.entries()].sort((a, b) => sortiereWerte(a[0], b[0]))
      .map(([k, e]) => ({ wert: k, name: datenWertName(sp, e.v), n: e.n, prozent: da.length ? (100 * e.n) / da.length : 0 }));
    return { art: 'gruppe', n: da.length, fehlend, stufen };
  }
  const x = da.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  if (!n) return { art: 'zahl', n: 0, fehlend: g.length, m: null, sd: null, median: null, min: null, max: null };
  const m = x.reduce((a, b) => a + b, 0) / n;
  const sd = n < 2 ? null : Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const median = n % 2 ? x[(n - 1) / 2]! : (x[n / 2 - 1]! + x[n / 2]!) / 2;
  return { art: 'zahl', n, fehlend: g.length - n, m, sd, median, min: x[0]!, max: x[n - 1]! };
}

/** Kennwerte als ein Satz für Zelle, Word und „Seite an Seite“ (die Person kann ihn danach ändern). */
export function kennText(k: Kenn): string {
  const fehl = k.fehlend ? L(`, ${k.fehlend} ohne Angabe`, `, ${k.fehlend} not stated`) : '';
  if (k.n === 0) return L(`keine gültigen Werte${fehl}`, `no valid values${fehl}`);
  if (k.art === 'gruppe') return `${k.stufen.map(s => `${s.name}: ${s.n} (${proz(zahlDe(s.prozent, 0))})`).join('; ')}; n = ${k.n}${fehl}`;
  const z = (v: number | null) => (v === null ? '-' : zahlDe(v, 2));
  return L(`M = ${z(k.m)}, SD = ${z(k.sd)}, Median = ${z(k.median)}, ${z(k.min)} bis ${z(k.max)}; n = ${k.n}${fehl}`, `M = ${z(k.m)}, SD = ${z(k.sd)}, median = ${z(k.median)}, ${z(k.min)} to ${z(k.max)}; n = ${k.n}${fehl}`);
}

/* ---------- Aufbau eines Joint Displays (für Seite, Word und HTML gleich) ---------- */

export interface JdZellAnzeige {
  text: string;
  anteil?: { mit: number; n: number };
  kenn?: Kenn;
  /** die gewählte Belegstelle (gilt nur, wenn sie noch zu den Kandidaten der Zelle gehört) */
  beleg?: { segment: string; text: string; quelle: string };
  /** eine gewählte Stelle passt nicht mehr zur Zelle (Code, Gruppe oder Kodierung geändert) */
  belegVeraltet?: boolean;
  kandidaten?: string[];
  /** Schlüssel für `setzeBeleg` */
  gruppe?: string;
}
export interface JdAufbauZeile { schluessel: string; name: string; n?: number; zellen: JdZellAnzeige[]; passung: JdPassung; meta: string; zahlen?: string }
export interface JdAufbau {
  kopf: { schluessel: string; name: string; n?: number }[];
  zeilen: JdAufbauZeile[];
  /** was fehlt, damit die Tabelle etwas zeigt */
  fehlt: ('gruppierung' | 'zeilen' | 'spalten' | 'verknuepfung' | 'daten' | 'faelle')[];
  /** Fälle, die nicht zählen (ohne Dokument; bei Zahlen: ohne Verknüpfung) */
  ausgelassen: number;
  /** Lesehinweis immer zeigen (kleine, gezielte Fallzahl; keine Tests) */
  kleineFallzahl: boolean;
}

export function zeilenName(q: QualProjekt, z: JdZeile): string {
  if (z.art === 'code') return q.codes.find(c => c.id === z.id)?.name ?? '';
  const t = (q.themen ?? []).find(x => x.id === z.id);
  return t ? L(`Thema: ${t.name}`, `Theme: ${t.name}`) : '';
}

function belegZelle(q: QualProjekt, jd: JointDisplay, zeile: string, gruppe: string, kand: string[]): Pick<JdZellAnzeige, 'beleg' | 'belegVeraltet'> {
  const b = jd.belege.find(x => x.zeile === zeile && x.gruppe === gruppe);
  if (!b) return {};
  if (!kand.includes(b.segment)) return { belegVeraltet: true };
  const t = belegText(q, b.segment);
  return t ? { beleg: { segment: b.segment, ...t } } : { belegVeraltet: true };
}

/**
 * Baut die Tabelle. `ctx.daten` ist der Datensatz des Statable-Projekts (fehlt er, gibt es keine Zahlen); die Verknüpfung kommt aus `q.verknuepfung`.
 * - qual-nach-gruppen: Kopf = Gruppen, Zeilen = Codes/Themen, Zelle = „k von n Fällen“ + gewählter Beleg.
 * - zahlen-nach-qual: Kopf = Spalten des Datensatzes, Zeilen = Gruppen (Typen, mit/ohne Code oder Thema, Fallvariable), Zelle = Kennwerte der verknüpften Fälle.
 * - seite-an-seite: Kopf = Zahlen | Interviews, Zeilen = Codes/Themen; Zahlen = Text der Person (`jd.zahlen`), Interviews = „k von n Fällen“ über alle Fälle + Beleg.
 */
export function jdAufbau(q: QualProjekt, jd: JointDisplay, ctx: { daten?: DatenSicht } = {}): JdAufbau {
  const fehlt: JdAufbau['fehlt'] = [];
  const mitDok = faelleMitDokument(q);
  const link = q.verknuepfung && ctx.daten ? verknuepfe(q, ctx.daten, q.verknuepfung) : undefined;
  const pass = (k: string): JdPassung => jd.passung[k] ?? 'offen';
  const meta = (k: string): string => jd.metaInferenz[k] ?? '';
  if (!q.faelle.length) fehlt.push('faelle');

  if (jd.art === 'zahlen-nach-qual') {
    if (!jd.gruppierung) fehlt.push('gruppierung');
    if (!jd.spalten.length) fehlt.push('spalten');
    if (!ctx.daten || !ctx.daten.spalten.length) fehlt.push('daten');
    if (!q.verknuepfung) fehlt.push('verknuepfung');
    const d = ctx.daten, z = link?.zuordnung ?? {};
    const verkn = q.faelle.map(f => f.id).filter(f => z[f] !== undefined);
    const spalten = d ? jd.spalten.map(n => d.spalten.find(s => s.name === n)).filter((s): s is DatenSpalte => !!s) : [];
    const kopf = spalten.map(s => ({ schluessel: s.name, name: s.bezeichnung && s.bezeichnung !== s.name ? `${s.bezeichnung} (${s.name})` : s.name }));
    const zeilen: JdAufbauZeile[] = [];
    if (jd.gruppierung && d && q.verknuepfung) {
      // Art je Spalte aus dem ganzen Datensatz (damit „ja/nein“ in jeder Gruppe gleich behandelt wird)
      const arten = spalten.map(s => { const i = d.spalten.indexOf(s); return spaltenArt(s, d.zeilen.map(r => r[i] ?? null)); });
      for (const g of jdGruppen(q, jd.gruppierung, verkn, { daten: d, zuordnung: z })) {
        if (g.schluessel === NICHT_VERKNUEPFT) continue;
        const zellen = spalten.map((s, j) => {
          const i = d.spalten.indexOf(s);
          const k = kennwerte(s, g.faelle.map(f => d.zeilen[z[f]!]?.[i] ?? null), arten[j]);
          return { text: kennText(k), kenn: k };
        });
        zeilen.push({ schluessel: g.schluessel, name: g.name, n: g.faelle.length, zellen, passung: pass(g.schluessel), meta: meta(g.schluessel) });
      }
    }
    return { kopf, zeilen, fehlt, ausgelassen: q.faelle.length - verkn.length, kleineFallzahl: true };
  }

  if (!jd.zeilen.length) fehlt.push('zeilen');
  if (jd.art === 'qual-nach-gruppen') {
    if (!jd.gruppierung) fehlt.push('gruppierung');
    if (jd.gruppierung?.quelle === 'spalte' && (!q.verknuepfung || !ctx.daten)) fehlt.push(!ctx.daten ? 'daten' : 'verknuepfung');
    const gruppen = jd.gruppierung ? jdGruppen(q, jd.gruppierung, mitDok, { daten: ctx.daten, zuordnung: link?.zuordnung }) : [];
    const kopf = gruppen.map(g => ({ schluessel: g.schluessel, name: g.name, n: g.faelle.length }));
    const zeilen = jd.zeilen.map(z => {
      const k = zeilenSchluessel(z);
      const zellen = gruppen.map(g => {
        const c = jdZelle(q, z, g.faelle);
        return { text: anteilText(c.mit.length, c.n), anteil: { mit: c.mit.length, n: c.n }, kandidaten: c.kandidaten, gruppe: g.schluessel, ...belegZelle(q, jd, k, g.schluessel, c.kandidaten) };
      });
      return { schluessel: k, name: zeilenName(q, z), zellen, passung: pass(k), meta: meta(k) };
    });
    return { kopf, zeilen, fehlt, ausgelassen: q.faelle.length - mitDok.length, kleineFallzahl: true };
  }

  // seite-an-seite
  const kopf = [{ schluessel: 'zahlen', name: L('Ergebnis aus den Zahlen', 'Result from the numbers') }, { schluessel: 'texte', name: L('Ergebnis aus den Interviews', 'Result from the interviews') }];
  const zeilen = jd.zeilen.map(z => {
    const k = zeilenSchluessel(z), c = jdZelle(q, z, mitDok), zahlen = jd.zahlen?.[k] ?? '';
    return {
      schluessel: k, name: zeilenName(q, z), passung: pass(k), meta: meta(k), zahlen,
      zellen: [{ text: zahlen }, { text: anteilText(c.mit.length, c.n), anteil: { mit: c.mit.length, n: c.n }, kandidaten: c.kandidaten, gruppe: ALLE, ...belegZelle(q, jd, k, ALLE, c.kandidaten) }],
    };
  });
  return { kopf, zeilen, fehlt, ausgelassen: q.faelle.length - mitDok.length, kleineFallzahl: true };
}

/** Ergebnis einer Datenspalte über den ganzen Datensatz als Satz (für „Seite an Seite“, Knopf „aus einer Spalte übernehmen“). */
export function spaltenErgebnis(daten: DatenSicht, name: string): string | null {
  const i = daten.spalten.findIndex(s => s.name === name); if (i < 0) return null;
  const sp = daten.spalten[i]!;
  const t = kennText(kennwerte(sp, daten.zeilen.map(r => r[i] ?? null)));
  return `${sp.bezeichnung && sp.bezeichnung !== sp.name ? `${sp.bezeichnung} (${sp.name})` : sp.name}: ${t}`;
}

/* ---------- Ändern (rein, geben ein neues Projekt zurück) ---------- */

const neueId = (): string => globalThis.crypto.randomUUID();

export function setzeVerknuepfung(q: QualProjekt, v: Pick<Verknuepfung, 'variable' | 'spalte'> | undefined, jetzt = Date.now()): QualProjekt {
  const r = { ...q };
  if (!v) delete r.verknuepfung;
  else r.verknuepfung = { variable: v.variable, spalte: v.spalte, geaendert: jetzt, ...(q.ich ? { kodierende: q.ich } : {}) };
  return r;
}

export function legeJdAn(q: QualProjekt, art: JointDisplay['art'], name: string, jetzt = Date.now()): { q: QualProjekt; id: string } {
  const id = neueId();
  const jd: JointDisplay = { id, name, art, zeilen: [], spalten: [], belege: [], passung: {}, metaInferenz: {}, erstellt: jetzt, geaendert: jetzt, ...(q.ich ? { kodierende: q.ich } : {}) };
  return { q: { ...q, jointDisplays: [...(q.jointDisplays ?? []), jd] }, id };
}
export function aendereJd(q: QualProjekt, id: string, f: (jd: JointDisplay) => JointDisplay, jetzt = Date.now()): QualProjekt {
  return { ...q, jointDisplays: (q.jointDisplays ?? []).map(j => (j.id === id ? { ...f(j), geaendert: jetzt } : j)) };
}
export function entferneJd(q: QualProjekt, id: string): QualProjekt {
  const r = { ...q, jointDisplays: (q.jointDisplays ?? []).filter(j => j.id !== id) };
  if (!r.jointDisplays.length) delete (r as Partial<QualProjekt>).jointDisplays;
  return r;
}
/** Belegstelle einer Zelle setzen (`segment` null = entfernen). */
export function setzeBeleg(q: QualProjekt, id: string, zeile: string, gruppe: string, segment: string | null, jetzt = Date.now()): QualProjekt {
  return aendereJd(q, id, j => {
    const belege: JdBeleg[] = j.belege.filter(b => !(b.zeile === zeile && b.gruppe === gruppe));
    if (segment) belege.push({ zeile, gruppe, segment });
    return { ...j, belege };
  }, jetzt);
}
export function setzeJdPassung(q: QualProjekt, id: string, schl: string, p: JdPassung, jetzt = Date.now()): QualProjekt {
  return aendereJd(q, id, j => { const passung = { ...j.passung }; if (p === 'offen') delete passung[schl]; else passung[schl] = p; return { ...j, passung }; }, jetzt);
}
export function setzeJdMeta(q: QualProjekt, id: string, schl: string, text: string, jetzt = Date.now()): QualProjekt {
  return aendereJd(q, id, j => { const metaInferenz = { ...j.metaInferenz }; if (text.trim() === '') delete metaInferenz[schl]; else metaInferenz[schl] = text; return { ...j, metaInferenz }; }, jetzt);
}
export function setzeJdZahlen(q: QualProjekt, id: string, schl: string, text: string, jetzt = Date.now()): QualProjekt {
  return aendereJd(q, id, j => { const zahlen = { ...(j.zahlen ?? {}) }; if (text.trim() === '') delete zahlen[schl]; else zahlen[schl] = text; return { ...j, zahlen }; }, jetzt);
}

/* ---------- Verweise sauber halten (wie `halteVerweise` für Themen) ---------- */

/**
 * Nach jeder Änderung: Zeilen, Gruppierungen, Belege und Item-Herkünfte, die auf Gelöschtes zeigen, fallen weg; eine Verknüpfung mit gelöschter
 * Fallvariable fällt weg. Ohne Änderung: dasselbe Objekt (damit nichts unnötig neu gespeichert wird).
 */
export function halteMixed(q: QualProjekt): QualProjekt {
  if (!q.verknuepfung && !q.jointDisplays?.length && !q.instrument?.length) return q;
  const codes = new Set(q.codes.map(c => c.id)), themen = new Set((q.themen ?? []).map(t => t.id)), segs = new Set(q.segmente.map(s => s.id)), vars = new Set(q.variablen.map(v => v.id));
  const da = (art: string, id: string) => (art === 'code' ? codes.has(id) : themen.has(id));
  let geaendert = false;
  const r = { ...q };
  if (q.verknuepfung && !vars.has(q.verknuepfung.variable)) { delete r.verknuepfung; geaendert = true; }
  if (q.jointDisplays?.length) {
    const neu = q.jointDisplays.map(j => {
      const zeilen = j.zeilen.filter(z => da(z.art, z.id));
      const belege = j.belege.filter(b => segs.has(b.segment) && (b.zeile.startsWith('code:') ? codes.has(b.zeile.slice(5)) : b.zeile.startsWith('thema:') ? themen.has(b.zeile.slice(6)) : true));
      const g = j.gruppierung;
      const gWeg = !!g && ((g.quelle === 'variable' && !vars.has(g.id)) || ((g.quelle === 'code' || g.quelle === 'thema') && !da(g.quelle, g.id)));
      if (zeilen.length === j.zeilen.length && belege.length === j.belege.length && !gWeg) return j;
      geaendert = true;
      const x: JointDisplay = { ...j, zeilen, belege };
      if (gWeg) delete x.gruppierung;
      return x;
    });
    r.jointDisplays = neu;
  }
  if (q.instrument?.length) {
    r.instrument = q.instrument.map(it => {
      const hWeg = !!it.herkunft && !da(it.herkunft.art, it.herkunft.id), bWeg = it.beleg !== undefined && !segs.has(it.beleg);
      if (!hWeg && !bWeg) return it;
      geaendert = true;
      const x = { ...it };
      if (hWeg) delete x.herkunft;
      if (bWeg) delete x.beleg;
      return x;
    });
  }
  return geaendert ? r : q;
}

/** Hinweissatz zu kleinen, gezielten Fallzahlen (immer bei Joint Displays). */
export const kleineFallzahlSatz = (): string => L(
  'Die Fälle sind wenige und gezielt ausgewählt. Die Zahlen beschreiben nur diese Fälle; Tests oder Verallgemeinerungen sind hier nicht sinnvoll. „0“ heißt: nicht erwähnt, nicht „trifft nicht zu“.',
  'The cases are few and purposefully selected. The numbers describe only these cases; tests or generalisations make no sense here. "0" means: not mentioned, not "does not apply".');

export { Lp };
