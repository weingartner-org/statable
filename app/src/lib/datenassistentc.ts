/**
 * Datenassistenten Später S-C: Zählen, Fehlendcodes setzen, Sortieren (Fachblatt 4.1 bis 4.3, Entscheidung Opus 5).
 * Reine Funktionen auf `Daten`; die Oberfläche führt den Befehl über `aendere()` aus (ein Rückgängig-Schritt). Rang, Datum und auffällige Fälle: rangbildung.ts, datumrechnen.ts, auffaellig.ts.
 *
 * „Fehlende Werte ersetzen“ gibt es bewusst NICHT (kein Spaltenmittel, keine Zeitreihenverfahren, keine Schätzung; PSPP hat RMV auch nicht): statt dessen „Fehlendcodes setzen“
 * (nur die Bedeutung ändert sich, nie ein Wert; umkehrbar) und „Skalenwert aus verfügbaren Items“ (datenassistent.ts).
 *
 * PSPP-Falle Zählen: `COUNT … (LO THRU 2)` zählt benutzerdefiniert fehlende Werte (-9) mit, ebenso ein ausdrücklich genannter Wert, der als fehlend gesetzt ist. Der Befehl hier zählt
 * darum mit `IF` je Spalte: ein fehlender Wert ist in einem Vergleich leer und trifft nie.
 */
import { AssistentFehler, istFehlend } from './datenassistent';
import { zit } from './befehlstext';
import { gueltigerName } from './skalabau';
import { fehlendBereichText, fehlendAlt } from './kodebuch';
import { L, Lp } from './sitzung.svelte';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

export type ZaehlWert = { wert: number } | { bereich: [number | 'LO', number | 'HI'] } | { fehlend: 'MISSING' | 'SYSMIS' };
export interface ZaehlOpt { spalten: string[]; ziel: string; zaehle: ZaehlWert[]; bezeichnung?: string; ueberschreiben?: boolean }

const finde = (d: Daten, n: string) => d.spalten.findIndex(s => s.name.toUpperCase() === n.toUpperCase());
const sysmis = (v: Wert | undefined) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) || (typeof v === 'string' && v.trim() === '');
const grenzeZahl = (g: number | 'LO' | 'HI') => (g === 'LO' ? -Infinity : g === 'HI' ? Infinity : g);

function pruefeZiel(d: Daten, ziel: string, ueberschreiben?: boolean) {
  if (!gueltigerName(ziel)) throw new AssistentFehler('name', ziel);
  if (finde(d, ziel) >= 0 && !ueberschreiben) throw new AssistentFehler('ueberschreiben', ziel);
}
function pruefeZaehlen(d: Daten, o: ZaehlOpt): number[] {
  if (!o.spalten.length) throw new AssistentFehler('leer');
  const idx = o.spalten.map(n => { const i = finde(d, n); if (i < 0 || d.spalten[i]!.art === 'text') throw new AssistentFehler('spalte', n); return i; });
  if (!o.zaehle.length) throw new AssistentFehler('regeln');
  for (const z of o.zaehle) if ('bereich' in z && grenzeZahl(z.bereich[0]) > grenzeZahl(z.bereich[1])) throw new AssistentFehler('bereich', z.bereich);
  return idx;
}

/** Je Fall, in wie vielen der Spalten einer der Werte steht. Bei `wert` und `bereich` zählen nur GÜLTIGE Werte; `MISSING` zählt benutzerdefiniert fehlende UND leere, `SYSMIS` nur leere. Nie fehlend (0 ohne Treffer). */
export function zaehlenWerte(d: Daten, o: ZaehlOpt): number[] {
  const idx = o.spalten.map(n => finde(d, n)).filter(i => i >= 0);
  return d.zeilen.map(z => {
    let n = 0;
    for (const i of idx) {
      const v = z[i] ?? null, sp = d.spalten[i]!;
      const leer = sysmis(v), benutzer = !leer && istFehlend(sp, v);
      const trifft = o.zaehle.some(w => 'fehlend' in w ? (w.fehlend === 'MISSING' ? leer || benutzer : leer)
        : !leer && !benutzer && typeof v === 'number' && ('wert' in w ? v === w.wert : v >= grenzeZahl(w.bereich[0]) && v <= grenzeZahl(w.bereich[1])));
      if (trifft) n++;
    }
    return n;
  });
}

/** Der PSPP-Befehl: eine IF-Zeile je Spalte (nicht COUNT, siehe oben). Format F8.0, Messniveau Skala. */
export function zaehlenBefehl(d: Daten, o: ZaehlOpt): { syntax: string; ziel: string; bezeichnung: string; format: string } {
  const idx = pruefeZaehlen(d, o);
  pruefeZiel(d, o.ziel, o.ueberschreiben);
  const bed = (n: string) => '(' + o.zaehle.map(w => 'fehlend' in w ? `${w.fehlend}(${n})` : 'wert' in w ? `${n} = ${w.wert}`
    : [w.bereich[0] === 'LO' ? '' : `${n} >= ${w.bereich[0]}`, w.bereich[1] === 'HI' ? '' : `${n} <= ${w.bereich[1]}`].filter(Boolean).join(' AND ') || `NOT SYSMIS(${n})`).map(t => (o.zaehle.length > 1 ? `(${t})` : t)).join(' OR ') + ')';
  const namen = idx.map(i => d.spalten[i]!.name);
  const bezeichnung = o.bezeichnung ?? Lp(namen.length, `Anzahl Treffer in ${namen.length} Spalte`, `Anzahl Treffer in ${namen.length} Spalten`, `Number of hits in ${namen.length} column`, `Number of hits in ${namen.length} columns`);
  const syntax = [
    `COMPUTE ${o.ziel} = 0.`,
    ...namen.map(n => `IF ${bed(n)} ${o.ziel} = ${o.ziel} + 1.`),
    `VARIABLE LABELS ${o.ziel} ${zit(bezeichnung.slice(0, 250))}.`,
    `FORMATS ${o.ziel} (F8.0).`,
    `VARIABLE LEVEL ${o.ziel} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel, bezeichnung, format: 'F8.0' };
}

/** Anzahl gültiger (NVALID) oder fehlender (NMISS) Antworten je Fall: zwei klare Namen; beide zusammen ergeben die Zahl der Spalten. */
export function anzahlBefehl(d: Daten, o: { art: 'gueltig' | 'fehlend'; spalten: string[]; ziel: string; bezeichnung?: string; ueberschreiben?: boolean }): { syntax: string; ziel: string; bezeichnung: string; format: string } {
  if (!o.spalten.length) throw new AssistentFehler('leer');
  const namen = o.spalten.map(n => { const i = finde(d, n); if (i < 0) throw new AssistentFehler('spalte', n); return d.spalten[i]!.name; });
  pruefeZiel(d, o.ziel, o.ueberschreiben);
  const bezeichnung = o.bezeichnung ?? (o.art === 'gueltig' ? Lp(namen.length, `Anzahl gültig (${namen.length} Spalte)`, `Anzahl gültig (${namen.length} Spalten)`, `Number valid (${namen.length} column)`, `Number valid (${namen.length} columns)`) : Lp(namen.length, `Anzahl fehlend (${namen.length} Spalte)`, `Anzahl fehlend (${namen.length} Spalten)`, `Number missing (${namen.length} column)`, `Number missing (${namen.length} columns)`));
  const syntax = [
    `COMPUTE ${o.ziel} = ${o.art === 'gueltig' ? 'NVALID' : 'NMISS'}(${namen.join(', ')}).`,
    `VARIABLE LABELS ${o.ziel} ${zit(bezeichnung.slice(0, 250))}.`,
    `FORMATS ${o.ziel} (F8.0).`,
    `VARIABLE LEVEL ${o.ziel} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel, bezeichnung, format: 'F8.0' };
}

/* ------------------------------------------------------------------ Fehlendcodes setzen */
const mw = (w: number[]) => (w.length ? w.reduce((a, b) => a + b, 0) / w.length : null);
/**
 * `MISSING VALUES a b (-9, -1).` für die gewählten Zahlenspalten. Bis zu drei Einzelwerte, sonst ein Bereich `lo THRU hi` - aber NUR, wenn zwischen lo und hi in dieser Spalte kein anderer Wert vorkommt
 * (sonst Meldung `zuVieleCodes`, die Spalte bleibt UNMARKIERT; PSPP würde den gültigen Wert still zu „fehlend“ machen). `codes: []` hebt die Markierung auf.
 * Werte werden nie verändert. `rueckgaengig` stellt die Markierung davor wieder her; `vorschau` zeigt den Mittelwert vor und nach der Markierung.
 */
export function fehlendcodesBefehl(d: Daten, o: { spalten: string[]; codes: number[] }): { syntax: string; rueckgaengig: string; meldungen: { art: 'zuVieleCodes'; spalte: string }[]; vorschau: { spalte: string; betroffen: number; mittelVorher: number | null; mittelNachher: number | null; n: number }[] } {
  const meldungen: { art: 'zuVieleCodes'; spalte: string }[] = [], vorschau: { spalte: string; betroffen: number; mittelVorher: number | null; mittelNachher: number | null; n: number }[] = [];
  const neu = new Map<string, string[]>(), alt = new Map<string, string[]>();
  for (const n of o.spalten) {
    const i = finde(d, n);
    if (i < 0 || d.spalten[i]!.art !== 'zahl') throw new AssistentFehler('spalte', n);
    const sp = d.spalten[i]!, werte = d.zeilen.map(z => z[i] ?? null);
    const t = fehlendBereichText(o.codes, werte);
    if (!t) { meldungen.push({ art: 'zuVieleCodes', spalte: sp.name }); continue; }
    (neu.get(t.text) ?? neu.set(t.text, []).get(t.text)!).push(sp.name);
    const vorher = fehlendAlt(sp);
    (alt.get(vorher) ?? alt.set(vorher, []).get(vorher)!).push(sp.name);
    const zahlen = werte.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const trifft = (v: number) => t.teile.some(c => (typeof c === 'number' ? c === v : v >= c.von && v <= c.bis));
    const gueltigVorher = zahlen.filter(v => !istFehlend(sp, v)), nachher = zahlen.filter(v => !trifft(v));
    vorschau.push({ spalte: sp.name, betroffen: zahlen.filter(trifft).length, mittelVorher: mw(gueltigVorher), mittelNachher: mw(nachher), n: nachher.length });
  }
  const zeilen = (m: Map<string, string[]>) => [...m].map(([text, namen]) => `MISSING VALUES ${namen.join(' ')} (${text}).`).join('\n');
  return { syntax: zeilen(neu), rueckgaengig: zeilen(alt), meldungen, vorschau };
}

/* ------------------------------------------------------------------ Sortieren */
export interface SortSchluessel { spalte: string; richtung: 'auf' | 'ab'; natuerlich?: boolean }
/** Datum als Sortierzahl: nach dem Format der Spalte (ADATE Monat zuerst, EDATE Tag zuerst, SDATE/ISO Jahr zuerst). */
function datumZahl(format: string, t: string): number | null {
  const s = t.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  let y: number, mo: number, da: number, zeit = 0;
  const f = format.toUpperCase();
  if (m) { [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])]; zeit = Number(m[4] ?? 0) * 3600 + Number(m[5] ?? 0) * 60 + Number(m[6] ?? 0); }
  else {
    m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
    if (!m) {
      const u = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);   // Uhrzeit allein (TIME): Sekunden seit Mitternacht
      return u ? Number(u[1]) * 3600 + Number(u[2]) * 60 + Number(u[3] ?? 0) : null;
    }
    const [a, b] = [Number(m[1]), Number(m[2])];
    [y, mo, da] = /^ADATE/.test(f) ? [Number(m[3]), a, b] : [Number(m[3]), b, a];
    zeit = Number(m[4] ?? 0) * 3600 + Number(m[5] ?? 0) * 60 + Number(m[6] ?? 0);
  }
  return Date.UTC(y, mo - 1, da) / 1000 + zeit;
}

/** „Ansicht sortieren“: die Zeilennummern (0-basiert) in der neuen Reihenfolge; `d` bleibt unverändert. Fehlende (leer, NaN, benutzerdefiniert) IMMER ans Ende, auch absteigend; Text in deutscher Reihenfolge; Gleichstände stabil. */
export function sortiereReihenfolge(d: Daten, schluessel: SortSchluessel[]): number[] {
  if (!schluessel.length) throw new AssistentFehler('regeln');
  const spalten = schluessel.map(k => { const i = finde(d, k.spalte); if (i < 0) throw new AssistentFehler('spalte', k.spalte); return { i, sp: d.spalten[i]!, k }; });
  const koll = (natuerlich: boolean) => new Intl.Collator('de', { numeric: natuerlich });
  const kollator = [koll(false), koll(true)];
  const wert = (sp: Spalte, v: Wert | undefined): number | string | null => {
    if (sysmis(v) || istFehlend(sp, v ?? null)) return null;
    if (sp.art === 'datum' && typeof v === 'string') return datumZahl(sp.format, v) ?? v;
    return v as number | string;
  };
  const roh = d.zeilen.map((z, n) => ({ n, w: spalten.map(s => wert(s.sp, z[s.i])) }));
  roh.sort((a, b) => {
    for (const [j, s] of spalten.entries()) {
      const x = a.w[j]!, y = b.w[j]!;
      if (x === null || y === null) { if (x === y) continue; return x === null ? 1 : -1; }   // fehlend immer ans Ende
      let c = typeof x === 'number' && typeof y === 'number' ? x - y : kollator[s.k.natuerlich ? 1 : 0]!.compare(String(x), String(y));
      if (c === 0) continue;
      if (s.k.richtung === 'ab') c = -c;
      return c;
    }
    return a.n - b.n;
  });
  return roh.map(r => r.n);
}

/** „Dauerhaft sortieren“: die Zeilen der Datei neu ordnen - alle Spalten (auch das Fallgewicht) gehen mit; optional eine Spalte mit der alten Zeilennummer; ausgewählte Fälle behalten ihre Identität. */
export function sortiereDauerhaft(d: Daten, schluessel: SortSchluessel[], o: { altNummer?: string; auswahl?: number[] } = {}): { daten: Daten; reihenfolge: number[]; auswahl?: number[]; befehl: string; hinweis: string } {
  const reihenfolge = sortiereReihenfolge(d, schluessel);
  let spalten = d.spalten, zeilen = reihenfolge.map(i => d.zeilen[i]!);
  if (o.altNummer) {
    if (!gueltigerName(o.altNummer)) throw new AssistentFehler('name', o.altNummer);
    if (finde(d, o.altNummer) >= 0) throw new AssistentFehler('ueberschreiben', o.altNummer);
    spalten = [...spalten, { name: o.altNummer, bezeichnung: L('Zeilennummer vor dem Sortieren', 'Row number before sorting'), art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} }];
    zeilen = zeilen.map((z, k) => [...z, reihenfolge[k]! + 1]);
  }
  const liste = schluessel.map(k => (k.richtung === 'ab' ? L(`${k.spalte} (absteigend)`, `${k.spalte} (descending)`) : L(`${k.spalte} (aufsteigend)`, `${k.spalte} (ascending)`))).join(', ');
  return {
    daten: { spalten, zeilen }, reihenfolge,
    ...(o.auswahl ? { auswahl: o.auswahl.map(i => reihenfolge.indexOf(i)).filter(i => i >= 0).sort((a, b) => a - b) } : {}),
    befehl: L('Dauerhaft sortiert nach ', 'Permanently sorted by ') + liste,
    hinweis: L('Danach ändern sich die Zeilennummern.', 'Afterwards the row numbers change.')
  };
}
