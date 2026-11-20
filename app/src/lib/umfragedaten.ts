/**
 * Später S-D2, Bauer A2: aus dem beschreibenden Ergebnis (lib/gewichtbeschreibend.ts) und den Daten der Sitzung den Auftrag an R (survey) machen und die Antwort lesen - Karte Verteilung
 * (Mittelwert mit Intervall und Test gegen einen Wert, Anteil mit Logit- und Korn-Graubard-Intervall) und Kreuztabelle (Rao-Scott). Rein, ohne R: der Aufruf von R steht in lib/umfragerechnen.ts.
 * Alle Texte und Zahlen der Antwort sind Ergebnisse von `sp_umfrage_*` in engine/statable-umfrage.R (Vertrag im Kopf von lib/umfrage.test.ts).
 * Selbstprüfung (Fachblatt 0.7, Entscheidung Opus): Mittel, Anteile und Zellanteile rechnet auch Statable selbst; weichen sie um mehr als 1e-8 (relativ) ab, wird nichts gezeigt.
 */
import type { RSpalte } from '../engine/webr';
import { werteVon, type GewichtetE, type Quelle } from './gewichtbeschreibend';
import { umfrageLesen, pruefePunktschaetzer, type UmfrageErgebnis } from './umfrage';
import { rIds, rQ, rZahl } from '../engine/rsicher';
import type { RepPlan } from './genauigkeit';
import { entwurfPlan, entwurfRTeil } from './umfrageentwurf';

/** Mehr Kategorien als dies zeigt die Tabelle mit Intervall nicht (Fachblatt 2.4); die übrigen stehen ohne Intervall in der Häufigkeitstabelle. */
export const UMFRAGE_MAX_KATEGORIEN = 30;

/** Was am Blatt gespeichert wird (nur Zahlen und Namen; Tabellen und Sätze entstehen bei jedem Aufruf neu und folgen so der Sprache). */
export interface DesignVerteilungE {
  art: 'verteilung';
  /** Testwert für den Mittelwert, sonst `null` */ mu0: number | null;
  /** Ergebnis von `sp_umfrage_mittel` (gelesen), `spalten` in der Reihenfolge von `ergebnisse` */ mittel: { spalten: string[]; e: UmfrageErgebnis } | null;
  /** je Kategorie-Spalte das Ergebnis von `sp_umfrage_anteil`; `werte`: die Kategorien der Spalte in der Reihenfolge der Codes 1, 2, …; `codes`: die Codes, für die R rechnete (höchstens 30) */
  anteile: { spalte: string; werte: (string | number)[]; codes: number[]; e: UmfrageErgebnis }[];
  /** Intervall der Anteile, das die Sätze und die Spalte nennen */ anteilKi: 'logit' | 'beta';
  /** Die Rechnung der ganzen Karte ging nicht (zu viele Zeilen, negative Gewichte, weniger als 2 Fälle …): Code und Zahlen; die beschreibenden Zahlen bleiben, der Satz steht statt der Intervalle */ fehler?: UmfrageErgebnis;
  survey: string;
}
/** `e` ist das Ergebnis von `sp_umfrage_kreuz`; trägt es `fehlerCode`, steht der Satz statt des Tests (die Zählungen und Prozente bleiben). */
export interface DesignKreuzE { art: 'kreuz'; zeile: string; spalte: string; e: UmfrageErgebnis; survey: string }
export type DesignE = DesignVerteilungE | DesignKreuzE;

/** Sicherheit: in den Aufrufen steht nur Festes - Wörter, eigene Namen (w, m1, a1, z, s) über rId/rQ/rIds und Zahlen über rZahl; Namen und Texte aus der Datei kommen nie in den Code (engine/rsicher.ts). */
export interface RPlan { spalten: RSpalte[]; /** Zeilen mit Gewicht über 0 (so viele gehen an R) */ zeilen: number; /** Zellen der Kreuztabelle (0 sonst) */ zellen: number }
/** Ein Aufruf an R: `schluessel` sagt, wohin die Antwort gehört ('mittel' oder der Name der Kategorie-Spalte in R, a1 …). */
export interface Auftrag { schluessel: string; art: 'mittel' | 'anteil'; aufruf: string }
export interface VerteilungPlan extends RPlan {
  auftraege: Auftrag[];
  mittel: string[];
  anteile: { spalte: string; r: string; werte: (string | number)[]; codes: number[]; abgeschnitten: boolean }[];
}
export interface KreuzPlan extends RPlan { aufruf: string; zeile: string; spalte: string; zeilenWerte: (string | number)[]; spaltenWerte: (string | number)[] }

/** Die Zeilen, die an R gehen: Gewicht über 0 (Zeilen ohne Gewicht zählen nicht, die Funktion in R löscht sie ohnehin vor `svydesign`). */
const zeilenMitGewicht = (w: number[]) => w.flatMap((g, i) => (g > 0 ? [i] : []));
const zahlOderNull = (v: string | number | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Karte Verteilung: Zahlenspalten (Mittelwert) und Kategorie-Spalten (Anteile) des beschreibenden Ergebnisses `e`. `mu0`: Test gegen einen Wert (nur Mittelwerte). */
/** `rep`: Replikationsgewichte (lib/genauigkeit.ts, `planRep`): dann rechnet R alle Schätzungen mit diesem Design. */
export function planVerteilung(e: GewichtetE, q: Quelle, mu0: number | null, rep?: RepPlan): VerteilungPlan {
  const idx = zeilenMitGewicht(q.w), spalten: RSpalte[] = [{ name: 'w', art: 'zahl', werte: idx.map(i => q.w[i]!) }];
  const mittel = e.zahlen.map(z => z.spalte);
  mittel.forEach((n, k) => { const v = werteVon(q, n); spalten.push({ name: `m${k + 1}`, art: 'zahl', werte: idx.map(i => zahlOderNull(v[i] ?? null)) }); });
  const anteile = e.kategorien.map((k, j) => {
    const v = werteVon(q, k.spalte), code = new Map(k.werte.map((x, i) => [x, i + 1] as const));
    spalten.push({ name: `a${j + 1}`, art: 'zahl', werte: idx.map(i => { const x = v[i]; return x === null || x === undefined ? null : code.get(x) ?? null; }) });
    const rang = k.summe.map((s, i) => [s, i + 1] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, UMFRAGE_MAX_KATEGORIEN).map(x => x[1]).sort((a, b) => a - b);
    return { spalte: k.spalte, r: `a${j + 1}`, werte: k.werte, codes: rang, abgeschnitten: k.werte.length > UMFRAGE_MAX_KATEGORIEN };
  });
  if (rep) spalten.push(...rep.spalten);
  const ent = rep ? null : entwurfPlan(q, e.gewicht?.entwurf, idx);   // Stichprobenplan der Person (Abschnitt 6): dieselbe Stelle für alle Karten, mit Replikationsgewichten ohne Wirkung
  if (ent) spalten.push(...ent.spalten);
  const rTeilMu0 = mu0 === null ? 'NULL' : rZahl(mu0);
  const rTeilRep = (rep ? `, ${rep.rTeil}` : '') + entwurfRTeil(ent);
  const auftraege: Auftrag[] = [];
  if (mittel.length) auftraege.push({ schluessel: 'mittel', art: 'mittel', aufruf: `sp_umfrage_mittel(d, ${rIds(mittel.map((_, k) => `m${k + 1}`))}, 'w', NULL, ${rTeilMu0}${rTeilRep})` });
  for (const a of anteile) { const rTeilCodes = `c(${a.codes.map(rZahl).join(', ')})`; auftraege.push({ schluessel: a.r, art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ(a.r)}, 'w', NULL, ${rTeilCodes}${rTeilRep})` }); }
  return { spalten, auftraege, zeilen: idx.length, zellen: 0, mittel, anteile };
}

/** Fehler, die für die ganze Karte gelten (nicht nur für eine Spalte). */
const GANZ = ['zu-viele-zeilen', 'zu-viele-zellen', 'gewicht-negativ', 'gewicht-fehlt', 'auswahl-passt-nicht', 'zu-wenig', 'entwurf-ungueltig', 'entwurf-luecken', 'entwurf-zu-wenig-klumpen', 'entwurf-fpc-klein', 'entwurf-fpc-uneinheitlich', 'einsamer-klumpen'];
/** Die Antwort von R in das, was am Blatt gespeichert wird. Ein Fehler von R selbst (Text) kommt als `{ fehler }` zurück; ein Fehler der Rechnung (Code) steht im Ergebnis. */
export function verteilungLesen(plan: VerteilungPlan, antwort: unknown, mu0: number | null, anteilKi: 'logit' | 'beta'): { ok: DesignVerteilungE } | { fehler: string } {
  const roh = (antwort ?? {}) as Record<string, unknown>, grund: DesignVerteilungE = { art: 'verteilung', mu0, mittel: null, anteile: [], anteilKi, survey: '4.5' };
  const mittel = plan.mittel.length ? umfrageLesen('mittel', roh.mittel) : null;
  if (mittel?.fehler) return { fehler: String(mittel.fehler) };
  if (mittel?.fehlerCode) return { ok: { ...grund, fehler: mittel } };
  const a = (roh.anteile ?? {}) as Record<string, unknown>, anteile: DesignVerteilungE['anteile'] = [];
  for (const p of plan.anteile) {
    const e = umfrageLesen('anteil', a[p.r]);
    if (e.fehler) return { fehler: String(e.fehler) };
    if (e.fehlerCode && GANZ.includes(String(e.fehlerCode)) && !anteile.length && !mittel) return { ok: { ...grund, fehler: e } };
    anteile.push({ spalte: p.spalte, werte: p.werte, codes: p.codes, e });
  }
  return { ok: { ...grund, mittel: mittel ? { spalten: plan.mittel, e: mittel } : null, anteile } };
}

/** Selbstprüfung der Karte Verteilung: gewichtetes Mittel und Anteile aus Statable gegen die aus R. `null` = gleich. */
export function pruefeVerteilung(e: GewichtetE, d: DesignVerteilungE): null | { was: string; js: number; r: number } {
  const js: number[] = [], r: number[] = [], was: string[] = [];
  d.mittel?.e.ergebnisse.forEach((x: UmfrageErgebnis, i: number) => {
    const z = e.zahlen.find(t => t.spalte === d.mittel!.spalten[i]);
    if (z && !x.fehlerCode) { js.push(z.b.mittel); r.push(x.mittel); was.push(d.mittel!.spalten[i]!); }
  });
  for (const a of d.anteile) {
    const k = e.kategorien.find(t => t.spalte === a.spalte);
    if (!k || a.e.fehlerCode) continue;
    for (const kat of a.e.kategorien as UmfrageErgebnis[]) { const pj = k.prozent[kat.wert - 1]; if (pj !== undefined) { js.push(pj / 100); r.push(kat.p); was.push(`${a.spalte} ${kat.wert}`); } }
  }
  const a = pruefePunktschaetzer(js, r);
  return a ? { was: was[a.index] ?? '', js: a.js, r: a.r } : null;
}

/** Karte Kreuztabelle: die beiden Spalten des beschreibenden Ergebnisses. Codes = Platz in der sortierten Liste der Werte (1, 2, …). */
export function planKreuz(e: GewichtetE, q: Quelle, rep?: RepPlan): KreuzPlan {
  const k = e.kreuz!, idx = zeilenMitGewicht(q.w), zv = werteVon(q, k.zeile), sv = werteVon(q, k.spalte);
  const zc = new Map(k.k.zeilen.map((x, i) => [x, i + 1] as const)), sc = new Map(k.k.spalten.map((x, i) => [x, i + 1] as const));
  const code = (m: Map<string | number, number>, v: string | number | null | undefined) => (v === null || v === undefined ? null : m.get(v) ?? null);
  const spalten: RSpalte[] = [
    { name: 'w', art: 'zahl', werte: idx.map(i => q.w[i]!) },
    { name: 'z', art: 'zahl', werte: idx.map(i => code(zc, zv[i])) },
    { name: 's', art: 'zahl', werte: idx.map(i => code(sc, sv[i])) }
  ];
  if (rep) spalten.push(...rep.spalten);
  const ent = rep ? null : entwurfPlan(q, e.gewicht?.entwurf, idx);
  if (ent) spalten.push(...ent.spalten);
  const rTeilRep = (rep ? `, ${rep.rTeil}` : '') + entwurfRTeil(ent);
  return { spalten, aufruf: `sp_umfrage_kreuz(d, ${rQ('z')}, ${rQ('s')}, ${rQ('w')}, NULL${rTeilRep})`, zeilen: idx.length, zellen: k.k.zeilen.length * k.k.spalten.length, zeile: k.zeile, spalte: k.spalte, zeilenWerte: k.k.zeilen, spaltenWerte: k.k.spalten };
}
export function kreuzLesen(plan: KreuzPlan, antwort: unknown): { ok: DesignKreuzE } | { fehler: string } {
  const e = umfrageLesen('kreuz', antwort);
  if (e.fehler) return { fehler: String(e.fehler) };
  return { ok: { art: 'kreuz', zeile: plan.zeile, spalte: plan.spalte, e, survey: '4.5' } };
}
/** Selbstprüfung der Kreuztabelle: die gewichteten Zellanteile aus Statable gegen die aus R (Zeilen laufen schnell: Zeile i, Spalte j an Platz i + Zeilen · j). */
export function pruefeKreuz(e: GewichtetE, d: DesignKreuzE): null | { was: string; js: number; r: number } {
  if (d.e.fehlerCode) return null;
  const k = e.kreuz!.k, ges = k.summe.flat().reduce((a, b) => a + b, 0), js: number[] = [];
  for (let j = 0; j < k.spalten.length; j++) for (let i = 0; i < k.zeilen.length; i++) js.push(k.summe[i]![j]! / ges);
  const a = pruefePunktschaetzer(js, (d.e.anteile ?? []) as number[]);
  return a ? { was: `${a.index}`, js: a.js, r: a.r } : null;
}
