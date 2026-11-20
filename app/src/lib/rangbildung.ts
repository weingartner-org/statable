/**
 * Rangbildung genau wie SPSS `RANK` (Später S-C; Fachblatt 4.4, Entscheidung Opus 5): Rang (Bindungen Mittel/niedrig/hoch/lückenlos), Rangprozent, Anteil,
 * Normalrang (Blom, Tukey, Rankit, Van der Waerden), Gruppen (NTILES) und Savage-Werte - nach IBM rank.pdf (Algorithms 14.0) und PSPP rank.c.
 *
 * Immer OHNE Fallgewicht: PSPP-`RANK` gewichtet von selbst, sobald `WEIGHT BY` aktiv ist (Ränge liefen bis 13 bei 9 Fällen). Der Befehl setzt darum `WEIGHT OFF.`
 * davor und stellt das Gewicht danach wieder her. Zwei Prozentränge mit zwei Namen: „Rangprozent (SPSS)“ = R/W · 100 (der höchste Wert immer 100) und
 * „Prozentrang (Mitte)“ der Normwert-Karte = 100 · (R − 0,5)/N.
 */
import { normal } from './verteilung';
import { zit } from './befehlstext';
import { textCodes } from './eingabe';
import { AssistentFehler } from './datenassistent';
import { gueltigerName } from './skalabau';
import { gewichtBefehl, type Gewicht } from './gewichte';
import type { Daten } from './umformen';
import { L } from './sitzung.svelte';

export interface RangOpt {
  art: 'rang' | 'rangprozent' | 'anteil' | 'normal' | 'gruppen' | 'savage';
  bindungen?: 'mean' | 'low' | 'high' | 'condense';
  richtung?: 'auf' | 'ab';
  formel?: 'blom' | 'tukey' | 'rankit' | 'vw';
  k?: number;
  fehlend?: 'ausschliessen' | 'einschliessen';
}

/** Φ⁻¹(p) durch Halbieren auf `normal` (genau genug für 1e-9). */
function umkehrNormal(p: number): number {
  let lo = -40, hi = 40;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (normal(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const anteilNach = (formel: NonNullable<RangOpt['formel']>, r: number, w: number) =>
  formel === 'blom' ? (r - 3 / 8) / (w + 1 / 4) : formel === 'tukey' ? (r - 1 / 3) / (w + 1 / 3) : formel === 'rankit' ? (r - 1 / 2) / w : r / (w + 1);

/**
 * Die Werte der neuen Spalte, ohne Fallgewicht (jeder Fall zählt 1). Fehlende (null, NaN, Codes) und Fälle ohne gültige Gruppe → null. Wirft nie.
 * `W` ist die Zahl der gültigen Fälle der Rangbildung (je Gruppe).
 */
export function rangWerte(werte: (number | null)[], o: RangOpt, gruppen?: (string | number | null)[], fehlendCodes: number[] = []): (number | null)[] {
  const aus: (number | null)[] = werte.map(() => null);
  const ties = o.bindungen ?? 'mean', ab = (o.richtung ?? 'auf') === 'ab', formel = o.formel ?? 'blom', k = o.k ?? 4;
  const einschl = o.fehlend === 'einschliessen';
  const gueltig = (v: number | null) => typeof v === 'number' && Number.isFinite(v) && (einschl || !fehlendCodes.includes(v));
  const je = new Map<string, number[]>();
  werte.forEach((v, i) => {
    if (!gueltig(v)) return;
    const g = gruppen ? gruppen[i] : 'alle';
    if (g === null || g === undefined || (typeof g === 'string' && g.trim() === '')) return;
    const s = String(g);
    (je.get(s) ?? je.set(s, []).get(s)!).push(i);
  });
  for (const idx of je.values()) {
    const w = idx.length;
    // verschiedene Werte in der Reihenfolge des Rangs (aufsteigend oder absteigend) mit ihren Fällen
    const nachWert = new Map<number, number[]>();
    for (const i of idx) { const v = werte[i]!; (nachWert.get(v) ?? nachWert.set(v, []).get(v)!).push(i); }
    const geordnet = [...nachWert.entries()].sort((a, b) => (ab ? b[0] - a[0] : a[0] - b[0]));
    let vorher = 0;
    // l_j = Σ_{i ≤ j} 1/(W − i + 1) für Savage
    const l: number[] = [0];
    for (let j = 1; j <= w; j++) l[j] = l[j - 1]! + 1 / (w - j + 1);
    geordnet.forEach(([, faelle], gi) => {
      const c = faelle.length, cc = vorher + c;
      const r = ties === 'low' ? vorher + 1 : ties === 'high' ? cc : ties === 'condense' ? gi + 1 : vorher + (c + 1) / 2;
      let wert: number;
      switch (o.art) {
        case 'rang': wert = r; break;
        case 'rangprozent': wert = (r / w) * 100; break;
        case 'anteil': wert = r / w; break;
        case 'normal': wert = umkehrNormal(anteilNach(formel, r, w)); break;
        case 'gruppen': wert = Math.floor((r * k) / (w + 1)) + 1; break;
        case 'savage': { let s = 0; for (let j = vorher + 1; j <= cc; j++) s += l[j]!; wert = s / c - 1; break; }
      }
      for (const i of faelle) aus[i] = Number.isFinite(wert) ? wert : null;
      vorher = cc;
    });
  }
  return aus;
}

/* ------------------------------------------------------------------ Befehl */
/** Jede Angabe ist ein fester, ganzer Text (nichts wird per ${} aus Wörtern zusammengesetzt); die Bezeichnung hängt sie mit Komma aneinander. */
const BIND = () => ({ mean: L('Bindungen: Mittel', 'ties: mean'), low: L('Bindungen: niedrigster Rang', 'ties: lowest rank'), high: L('Bindungen: höchster Rang', 'ties: highest rank'), condense: L('Bindungen: lückenlos', 'ties: condensed') });
const FORMEL = () => ({ blom: 'Blom', tukey: 'Tukey', rankit: 'Rankit', vw: L('Van der Waerden', 'Van der Waerden') });

/** Bezeichnung der neuen Spalte, z. B. „Rang von x, aufsteigend, Bindungen: Mittel“. */
export function rangBezeichnung(spalte: string, o: RangOpt): string {
  const rich = (o.richtung ?? 'auf') === 'ab' ? L('absteigend', 'descending') : L('aufsteigend', 'ascending');
  const rest = `, ${rich}, ${BIND()[o.bindungen ?? 'mean']}`;
  switch (o.art) {
    case 'rang': return L(`Rang von ${spalte}`, `Rank of ${spalte}`) + rest;
    case 'rangprozent': return L(`Rangprozent (SPSS) von ${spalte}`, `Rank percent (SPSS) of ${spalte}`) + rest;
    case 'anteil': return L(`Rang-Anteil (Rang/N) von ${spalte}`, `Rank fraction (rank/N) of ${spalte}`) + rest;
    case 'normal': return L(`Normalrang (${FORMEL()[o.formel ?? 'blom']}) von ${spalte}`, `Normal score (${FORMEL()[o.formel ?? 'blom']}) of ${spalte}`) + rest;
    case 'gruppen': return L(`Gruppe (NTILES ${o.k ?? 4}) von ${spalte}`, `Group (NTILES ${o.k ?? 4}) of ${spalte}`) + rest;
    case 'savage': return L(`Savage-Wert von ${spalte}`, `Savage score of ${spalte}`) + rest;
  }
}

/** Fälle ohne gültige Gruppe (leer oder „keine Angabe“) bekommen keinen Rang: die Zeile setzt ihr Ergebnis auf leer. */
function gruppeLeer(d: Daten, gruppe: string, ziel: string): string {
  const sp = d.spalten.find(c => c.name.toUpperCase() === gruppe.toUpperCase())!;
  if (sp.art !== 'text') return `IF (MISSING(${sp.name})) ${ziel} = $SYSMIS.`;
  return `IF (${['', ...textCodes(sp.fehlendText)].map(c => `${sp.name} = ${zit(c)}`).join(' OR ')}) ${ziel} = $SYSMIS.`;
}
export function rangBefehl(d: Daten, o: RangOpt & { spalte: string; ziel: string; gruppe?: string; gewicht?: Gewicht | { spalte: string; art: 'haeufigkeit' | 'umfrage' } | null; ueberschreiben?: boolean }): { syntax: string; ziel: string; bezeichnung: string; format: string } {
  const finde = (n: string) => d.spalten.findIndex(s => s.name.toUpperCase() === n.toUpperCase());
  const i = finde(o.spalte);
  if (i < 0 || d.spalten[i]!.art === 'text') throw new AssistentFehler('spalte', o.spalte);
  if (o.gruppe !== undefined && finde(o.gruppe) < 0) throw new AssistentFehler('spalte', o.gruppe);
  if (!gueltigerName(o.ziel)) throw new AssistentFehler('name', o.ziel);
  if (finde(o.ziel) >= 0 && !o.ueberschreiben) throw new AssistentFehler('ueberschreiben', o.ziel);
  const ties = (o.bindungen ?? 'mean').toUpperCase();
  const art = { rang: '/RANK', rangprozent: '/PERCENT', anteil: '/RFRACTION', normal: '/NORMAL', gruppen: `/NTILES(${Math.max(2, Math.round(o.k ?? 4))})`, savage: '/SAVAGE' }[o.art];
  const bezeichnung = rangBezeichnung(d.spalten[i]!.name, o);
  const format = o.art === 'gruppen' || (o.art === 'rang' && (o.bindungen ?? 'mean') !== 'mean') ? 'F8.0' : 'F8.3';
  const syntax = [
    ...(o.gewicht ? ['WEIGHT OFF.'] : []),   // PSPP-RANK gewichtet von selbst: der Rang eines Falls ist seine eigene Eigenschaft
    `RANK VARIABLES=${d.spalten[i]!.name} (${(o.richtung ?? 'auf') === 'ab' ? 'D' : 'A'})${o.gruppe ? ` BY ${o.gruppe}` : ''} ${art} INTO ${o.ziel} /TIES=${ties}${o.art === 'normal' ? ` /FRACTION=${(o.formel ?? 'blom').toUpperCase()}` : ''} /MISSING=${o.fehlend === 'einschliessen' ? 'INCLUDE' : 'EXCLUDE'} /PRINT=NO.`,
    ...(o.gruppe ? [gruppeLeer(d, o.gruppe, o.ziel)] : []),   // PSPP-RANK gibt Fällen ohne Gruppe einen eigenen Rang: hier bleiben sie leer
    `VARIABLE LABELS ${o.ziel} ${zit(bezeichnung.slice(0, 250))}.`,
    `FORMATS ${o.ziel} (${format}).`,
    `VARIABLE LEVEL ${o.ziel} (${o.art === 'gruppen' ? 'ORDINAL' : 'SCALE'}).`,
    'EXECUTE.',
    ...(o.gewicht ? [gewichtBefehl(o.gewicht)] : [])
  ].join('\n');
  return { syntax, ziel: o.ziel, bezeichnung, format };
}
