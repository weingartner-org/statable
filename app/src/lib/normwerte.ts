/**
 * Normwerte als neue Spalten: z-Wert, T-Wert (50 ± 10), IQ-Skala (100 ± 15), Stanine, Prozentrang.
 * Wie Skala bilden/Umpolen als PSPP-Befehle gebaut, damit der Befehl im Verlauf steht und sich rückgängig machen lässt.
 *
 * Bezug (a) eigene Stichprobe, optional getrennt nach Gruppe:
 *   z = (x - M) / SD mit der Stichproben-SD (n - 1), wie DESCRIPTIVES /SAVE und R scale().
 *   Prozentrang = 100 · (R - 0,5) / n mit R = mittlerer Rang bei Bindungen (RANK, Voreinstellung TIES=MEAN).
 *   Das ist die Mittelrang-Methode: (Fälle darunter + halbe Fälle auf dem Wert) / n. Sie weicht von SPSS `RANK /PERCENT`
 *   (= R / n · 100) um 50 / n Prozentpunkte ab; die Mittelrang-Methode liegt für einen Wert in der Mitte bei 50 %.
 *   Stanine aus dem Prozentrang mit den Grenzen 4-11-23-40-60-77-89-96 %.
 * Bezug (b) Normtabelle: Mittelwert und SD der Norm von Hand.
 *   z = (x - M) / SD, Prozentrang = 100 · Φ(z) (CDF.NORMAL), Stanine = 2z + 5, gerundet und auf 1 bis 9 begrenzt
 *   (gleichwertig zu den Grenzen z = -1,75 … 1,75, also 4,0 / 10,6 / 22,7 / 40,1 / 59,9 / 77,3 / 89,4 / 96,0 %).
 * T = 50 + 10 z, IQ = 100 + 15 z werden aus z abgeleitet (lineare, nicht normalisierte Standardwerte).
 */
import { freierName } from './skalabau';
import { L, mitFlag } from './sitzung.svelte';
import { normal as phi } from './verteilung';
import type { Spalte } from './verzeichnis';
import { zit } from './befehlstext';

export type NormArt = 'z' | 't' | 'iq' | 'stanine' | 'pr';
export const NORM_ARTEN: NormArt[] = ['z', 't', 'iq', 'stanine', 'pr'];
/** `gruppeText`: die Gruppenspalte ist eine Textspalte (PSPP: `MISSING()` geht nur bei Zahlen, bei Text wird auf leer geprüft - Abschlusstest B2). */
export type NormBezug = { typ: 'stichprobe'; gruppe?: string; gruppeText?: boolean } | { typ: 'norm'; mw: number; sd: number };

/** Grenzen der Stanine-Stufen 2 … 9 als Prozentrang (Stufe 1 = unter 4 %). */
export const STANINE_GRENZEN = [4, 11, 23, 40, 60, 77, 89, 96] as const;

/** Zahl für die Syntax, nie in Exponentenschreibweise. */
const zahl = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(12).replace(/0+$/, '').replace(/\.$/, ''));

export const NORM_TEXT: Record<NormArt, { de: string; en: string; kurz: string; kuerzel: string; format: string; niveau: 'SCALE' | 'ORDINAL' }> = {
  z: { de: 'z-Wert', en: 'z score', kurz: 'z', kuerzel: 'z', format: 'F8.2', niveau: 'SCALE' },
  t: { de: 'T-Wert', en: 'T score', kurz: 'T', kuerzel: 'T', format: 'F8.1', niveau: 'SCALE' },
  iq: { de: 'IQ-Wert', en: 'IQ score', kurz: 'IQ', kuerzel: 'IQ', format: 'F8.1', niveau: 'SCALE' },
  stanine: { de: 'Stanine', en: 'Stanine', kurz: 'Stanine', kuerzel: 'Stanine', format: 'F8.0', niveau: 'ORDINAL' },
  pr: { de: 'Prozentrang', en: 'Percentile rank', kurz: 'PR', kuerzel: 'PR', format: 'F8.1', niveau: 'SCALE' }
};

/** Name der Norm in der gewählten Sprache (für Spaltenköpfe und Beschriftungen). NORM_TEXT.de/.en bleiben für alte Aufrufer. */
export const normName = (a: NormArt): string => a === 'z' ? L('z-Wert', 'z score') : a === 't' ? L('T-Wert', 'T score') : a === 'iq' ? L('IQ-Wert', 'IQ score') : a === 'stanine' ? L('Stanine', 'Stanine') : L('Prozentrang', 'Percentile rank');

export interface NormBefehl { syntax: string; neu: { art: NormArt; name: string; label: string }[] }

/**
 * Baut die Befehle. `lang` = Bezeichnung der Quellspalte, `en` = Beschriftung englisch.
 * Hilfsspalten (nw_…) entstehen nur im Lauf und werden gelöscht.
 */
export function normBefehl(sp: Pick<Spalte, 'name' | 'bezeichnung'>, arten: NormArt[], bezug: NormBezug, vorhandene: string[], en = false): NormBefehl {   // en: true = Englisch, false = Deutsch, wenn gerade Englisch gilt, sonst die gewählte Sprache (mitFlag)
  const x = sp.name, quelle = (sp.bezeichnung || sp.name).slice(0, 200);
  const belegt = [...vorhandene];
  const hilfe = (n: string) => { const f = freierName(n, belegt); belegt.push(f); return f; };
  const gewaehlt = NORM_ARTEN.filter(a => arten.includes(a));
  const stamm = x.slice(0, 40);
  const neu = gewaehlt.map(art => {
    const name = freierName(`${NORM_TEXT[art].kuerzel}_${stamm}`, belegt); belegt.push(name);
    return { art, name, label: `${mitFlag(en, () => normName(art))} ${quelle}`.slice(0, 250) };
  });
  const nameVon = (a: NormArt) => neu.find(n => n.art === a)?.name;
  const z = hilfe('nw_z'), pr = hilfe('nw_pr');
  const g = bezug.typ === 'stichprobe' ? bezug.gruppe : undefined;
  const zeilen: string[] = [];
  const hilfen = [z, pr];
  const gruppeGueltig = g ? (bezug.typ === 'stichprobe' && bezug.gruppeText ? `${g} <> ''` : `NOT MISSING(${g})`) : '';
  const gueltig = `NOT MISSING(${x})${g ? ` AND ${gruppeGueltig}` : ''}`;
  if (bezug.typ === 'stichprobe') {
    const m = hilfe('nw_m'), sd = hilfe('nw_sd'), r = hilfe('nw_r'), n = hilfe('nw_n');
    hilfen.push(m, sd, r, n);
    // AGGREGATE /BREAK verlangt nach Gruppe geordnete Zeilen: kurz sortieren und danach die Reihenfolge wiederherstellen.
    const nr = g ? hilfe('nw_nr') : '';
    if (g) { hilfen.push(nr); zeilen.push(`COMPUTE ${nr} = $CASENUM.`, `SORT CASES BY ${g}.`); }
    zeilen.push(`AGGREGATE /OUTFILE=* MODE=ADDVARIABLES${g ? ` /BREAK=${g}` : ''} /${m}=MEAN(${x}) /${sd}=SD(${x}).`);
    if (g) zeilen.push(`SORT CASES BY ${nr}.`);
    zeilen.push(`RANK ${x}${g ? ` BY ${g}` : ''} /RANK INTO ${r} /N INTO ${n}.`);
    zeilen.push(`IF (${gueltig}) ${z} = (${x} - ${m}) / ${sd}.`);
    zeilen.push(`IF (${gueltig}) ${pr} = 100 * (${r} - 0.5) / ${n}.`);
  } else {
    zeilen.push(`IF (${gueltig}) ${z} = (${x} - ${zahl(bezug.mw)}) / ${zahl(bezug.sd)}.`);
    zeilen.push(`IF (NOT MISSING(${z})) ${pr} = 100 * CDF.NORMAL(${z}, 0, 1).`);
  }
  const t = nameVon('t'), iq = nameVon('iq'), zn = nameVon('z'), prn = nameVon('pr');
  if (zn) zeilen.push(`IF (NOT MISSING(${z})) ${zn} = ${z}.`);
  if (t) zeilen.push(`IF (NOT MISSING(${z})) ${t} = 50 + 10 * ${z}.`);
  if (iq) zeilen.push(`IF (NOT MISSING(${z})) ${iq} = 100 + 15 * ${z}.`);
  const stanine = nameVon('stanine');
  if (stanine) {
    if (bezug.typ === 'stichprobe') zeilen.push(`IF (NOT MISSING(${pr})) ${stanine} = 1${STANINE_GRENZEN.map(gr => ` + (${pr} >= ${gr})`).join('')}.`);
    else zeilen.push(`IF (NOT MISSING(${z})) ${stanine} = MIN(9, MAX(1, RND(2 * ${z} + 5))).`);
  }
  if (prn) zeilen.push(`IF (NOT MISSING(${pr})) ${prn} = ${pr}.`);
  zeilen.push('EXECUTE.');
  zeilen.push(`DELETE VARIABLES ${hilfen.join(' ')}.`);
  for (const nn of neu) {
    const t0 = NORM_TEXT[nn.art];
    zeilen.push(`VARIABLE LABELS ${nn.name} ${zit(nn.label)}.`, `FORMATS ${nn.name} (${t0.format}).`, `VARIABLE LEVEL ${nn.name} (${t0.niveau}).`);
  }
  zeilen.push('EXECUTE.');
  return { syntax: zeilen.join('\n'), neu };
}

/* ---------- Gleiche Rechnung in JavaScript: Vorschau für drei Personen und Prüfwerte ---------- */
export interface NormZeile { z: number; t: number; iq: number; stanine: number; pr: number }

/**
 * Normwerte je Zeile. `werte` und `gruppen` sind spaltengleich; null/NaN = fehlt. Ohne `bezug.gruppe` zählt `gruppen` nicht.
 * Ergebnis: null, wo der Wert (oder die Gruppe) fehlt oder keine Streuung berechnet werden kann.
 */
export function normRechnen(werte: (number | null)[], bezug: NormBezug, gruppen?: (string | number | null)[]): (NormZeile | null)[] {
  const gut = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v);
  const gruppeVon = (i: number) => (bezug.typ === 'stichprobe' && bezug.gruppe ? gruppen?.[i] ?? null : '');
  if (bezug.typ === 'norm') {
    return werte.map(v => {
      if (!gut(v) || !(bezug.sd > 0)) return null;
      const z = (v - bezug.mw) / bezug.sd;
      return { z, t: 50 + 10 * z, iq: 100 + 15 * z, stanine: Math.min(9, Math.max(1, Math.round(2 * z + 5))), pr: 100 * phi(z) };
    });
  }
  const je = new Map<string, number[]>();
  werte.forEach((v, i) => { const g = gruppeVon(i); if (gut(v) && g !== null && g !== undefined) (je.get(String(g)) ?? je.set(String(g), []).get(String(g))!).push(v); });
  return werte.map((v, i) => {
    const g = gruppeVon(i);
    if (!gut(v) || g === null || g === undefined) return null;
    const alle = je.get(String(g))!, n = alle.length;
    if (n < 2) return null;
    const m = alle.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(alle.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
    if (!(sd > 0)) return null;
    const z = (v - m) / sd;
    const darunter = alle.filter(a => a < v).length, gleich = alle.filter(a => a === v).length;
    const pr = (100 * (darunter + gleich / 2)) / n;
    return { z, t: 50 + 10 * z, iq: 100 + 15 * z, stanine: 1 + STANINE_GRENZEN.filter(gr => pr >= gr).length, pr };
  });
}
