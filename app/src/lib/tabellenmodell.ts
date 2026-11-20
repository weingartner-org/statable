/**
 * „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1; Fachblatt docs/fachblaetter/SPAETER-C-TABELLEN-FRAGEBOGEN.md, Abschnitt 1 und „Entscheidungen Opus“).
 * Viele Fragen (Zeilen) mal eine Gruppenspalte (Spalten) in EINER Tabelle: Anzahl, Prozent, Mittelwert, Standardabweichung, Median, Top-Box, Mehrfachsets.
 * Statable rechnet das selbst in JavaScript - PSPP-CTABLES kann keine Mehrfachsets, hat leere Gesamtprozente und rundet Gewichte je Fall (Befunde F9 und F10).
 *
 * Regeln:
 *  - Alle Zahlen im Ergebnis sind UNGERUNDET. Gerundet wird erst bei der Anzeige (profil()).
 *  - Gesamtspalte = Summe der gezeigten Gruppen, nie „alle Fälle der Datei“. Fälle ohne gültige Gruppe fallen heraus und stehen im Fuß (`ohneGruppe`).
 *  - Häufigkeitsgewicht: n = Σw (ganzzahlig, kein Runden nötig), Kennwerte der erweiterten Menge. Ist das Gewicht nicht ganzzahlig, wirft es - es wird nie gerundet.
 *  - Umfragegewicht: nur beschreibend. n bleibt die Zahl der Befragten; Prozente und Mittel sind gewichtet; SD und Median rechnen mit auf Σw = Zahl der gültigen Zeilen
 *    normierten Gewichten (die Skala der Gewichte ändert nichts, Fachblatt T8). Mehrfachsets: Gewichte gelten für Fälle, nicht für Antworten (IBM).
 *  - Keine Tests, keine p-Werte, keine Buchstaben (Entscheidung Opus 2): die Zelle kennt nur n, Prozent, Wert und Basis.
 *  - Top-Box nur mit ausdrücklich gewählten Stufen. Statable rät die Richtung nie.
 * ⚠ Satzvorlagen (lib/tabellensaetze.ts) und die Wahl der Voreinstellungen von der Statistik-Fachperson abzunehmen.
 */
import { istFehlend } from './fehlend';
import { L } from './sitzung.svelte';
import { GewichtFehler, normiere, pruefeGewicht, wMittel, wQuantil, wSD, type GewichtArt } from './gewichte';
import { optionsNamenAus, type MehrfachSet } from './mehrfach';
import type { Daten } from './umformen';
import { lesbar, type Spalte } from './verzeichnis';

export type Block =
  | { art: 'kategorial'; spalte: string }
  | { art: 'metrisch'; spalte: string; kennwerte?: Kennwert[] }
  | { art: 'mehrfach'; set: string; mitNull?: boolean }
  | { art: 'top'; spalte: string; stufen: number[] };
export type Kennwert = 'n' | 'mw' | 'sd' | 'median';
export interface TabellenSpec {
  /** Gruppenspalte (Spalten der Tabelle); Fälle ohne Gruppe fallen heraus */
  spalte: string;
  /** Gesamtspalte, Voreinstellung true; Gesamt = SUMME der gezeigten Gruppen */
  gesamt?: boolean;
  bloecke: Block[];
  /** Voreinstellung 'spalte' (Anteil innerhalb der Gruppe) */
  prozentBasis?: 'spalte' | 'zeile' | 'gesamt';
  /** Voreinstellung 'gueltig'; 'alle' = Nenner alle Fälle der Gruppe, dazu EINE Zeile „keine Angabe“ (schluessel 'keine') */
  fehlend?: 'gueltig' | 'alle';
  /** Voreinstellung 'faelle' */
  mehrfachBasis?: 'faelle' | 'antworten';
  gewicht?: { spalte: string; art: GewichtArt };
  sets?: MehrfachSet[];
}
export interface TabellenSpalte { schluessel: string; label: string; n: number; summeGewichte?: number; antworten?: number }
export interface TabellenZelle { n: number | null; prozent: number | null; wert: number | null; basis: number | null }
export interface TabellenZeile { block: number; spalte: string; schluessel: string; art: 'stufe' | 'keineAngabe' | 'kennwert' | 'option' | 'top'; label: string; zellen: TabellenZelle[] }
export type TabellenHinweis = { art: 'kleineGruppe'; gruppe: string; n: number } | { art: 'vieleGruppen'; n: number } | { art: 'vieleFehlend'; block: number; gruppe: string; anteil: number };
export interface TabellenBlockInfo { art: Block['art']; /** Beschriftung der Frage (Bezeichnung oder Name der Spalte, Bezeichnung des Sets) */ titel: string; spalte: string }
export interface TabellenErgebnis {
  spalten: TabellenSpalte[];
  zeilen: TabellenZeile[];
  /** Fälle ohne gültige Gruppe (Fuß) */
  ohneGruppe: number;
  hinweise: TabellenHinweis[];
  gewicht?: { spalte: string; art: GewichtArt };
  /** Je Block der Spezifikation die Frage (für Überschriften und Export) */
  bloecke: TabellenBlockInfo[];
}

const SCHWELLE_KLEIN = 5;      // Gruppen mit weniger als 5 Fällen: Hinweis (IBM verwirft Spaltenanteile ab Σw < 2; Statable zeigt und warnt)
/** Ab so vielen Gruppen wird die Tabelle breit und unlesbar: Hinweis; über der Grenze rechnet Statable nicht (wie MH_MAX_SCHICHTEN bei den Schichten). */
export const GRUPPEN_HINWEIS = 8, GRUPPEN_MAX = 20;
export class TabellenFehler extends Error { constructor(public code: 'zu-viele-gruppen', public n = 0) { super(code); this.name = 'TabellenFehler'; } }
const SCHWELLE_FEHLEND = 0.2;  // mehr als 20 % ohne Antwort in einer Gruppe: Hinweis

/** Die Stellen der Sperrtabelle (lib/gewichte.ts), die diese Tabelle berührt. */
export function tabellenStellen(spec: TabellenSpec): string[] {
  return ['tabelle:zusammenstellen', ...(spec.bloecke.some(b => b.art === 'mehrfach') ? ['tabelle:mehrfach'] : [])];
}

const fehlt = (sp: Pick<Spalte, 'fehlend' | 'fehlendBereich'>, v: unknown): boolean =>
  v === null || v === undefined || v === '' || (typeof v === 'number' && (Number.isNaN(v) || istFehlend(sp, v))) || (typeof v === 'string' && v.trim() === '');
const endlich = (x: number): number | null => (Number.isFinite(x) ? x : null);
const schluesselVon = (v: string | number): string => String(v);
const vergleiche = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));
/** Der Code einer Wertebeschriftung: Zahl, wenn der Schlüssel eine Zahl ist. */
const codeVon = (k: string): string | number => { const x = Number(k); return k.trim() !== '' && Number.isFinite(x) ? x : k; };
const gleichWert = (z: unknown, w: number | string) => z !== null && z !== undefined && (typeof z === 'number' && typeof w === 'number' ? z === w : String(z).trim() === String(w).trim());
const zahlenListe = (l: number[]) => l.join(', ');

const leereZelle = (): TabellenZelle => ({ n: null, prozent: null, wert: null, basis: null });

export function rechneTabelle(d: Daten, spec: TabellenSpec): TabellenErgebnis {
  const nachName = (n: string) => d.spalten.findIndex(sp => sp.name === n);
  const gi = nachName(spec.spalte);
  if (gi < 0) throw new Error(`Gruppenspalte fehlt: ${spec.spalte}`);
  const gsp = d.spalten[gi]!;
  const basisArt = spec.prozentBasis ?? 'spalte', mitKeine = (spec.fehlend ?? 'gueltig') === 'alle', mfBasis = spec.mehrfachBasis ?? 'faelle';
  const art = spec.gewicht?.art ?? null;

  /* ------------------------------------------------------------------ Prüfen: lieber werfen als raten */
  const sets = spec.sets ?? [];
  const setVon = (name: string): MehrfachSet => {
    const roh = name.replace(/^\$/, ''), set = sets.find(x => x.name === roh);
    if (!set) throw new Error(`Set fehlt: ${name}`);
    if (set.spalten.some(n => nachName(n) < 0)) throw new Error(`Spalte des Sets fehlt: ${name}`);
    return set;
  };
  for (const b of spec.bloecke) {
    if (b.art === 'mehrfach') setVon(b.set);
    else {
      if (nachName(b.spalte) < 0) throw new Error(`Spalte fehlt: ${b.spalte}`);
      if (b.art === 'top' && (!Array.isArray(b.stufen) || !b.stufen.length)) throw new Error('Top-Box ohne gewählte Stufen: Statable rät die Richtung nie');
    }
  }

  /* ------------------------------------------------------------------ Gewicht */
  let w: number[] = d.zeilen.map(() => 1);
  if (spec.gewicht) {
    const wi = nachName(spec.gewicht.spalte);
    if (wi < 0) throw new Error(`Gewichtsspalte fehlt: ${spec.gewicht.spalte}`);
    const pr = pruefeGewicht(d.zeilen.map(z => (typeof z[wi] === 'number' ? (z[wi] as number) : null)), spec.gewicht.art);
    if (pr.fehler) throw new GewichtFehler(pr.fehler.code);
    w = pr.w;
  }
  /** Zählung: Häufigkeitsgewicht Σw, sonst die Zahl der Zeilen (Umfragegewicht: Befragte). */
  const zaehle = (W: number, N: number) => (art === 'haeufigkeit' ? W : N);

  /* ------------------------------------------------------------------ Gruppen */
  const ausserGruppe: number[] = [], gruppenWerte = new Map<string, { wert: string | number; zeilen: number[] }>();
  d.zeilen.forEach((z, i) => {
    if (!(w[i]! > 0)) return;
    const v = z[gi];
    if (fehlt(gsp, v)) { ausserGruppe.push(i); return; }
    const k = schluesselVon(v as string | number);
    const g = gruppenWerte.get(k) ?? { wert: v as string | number, zeilen: [] };
    g.zeilen.push(i); gruppenWerte.set(k, g);
  });
  const gruppen = [...gruppenWerte.entries()].sort((a, b) => vergleiche(a[1].wert, b[1].wert)).map(([schluessel, g]) => ({ schluessel, label: gsp.werteLabels[schluessel] ?? schluessel, zeilen: g.zeilen }));
  const alleZeilen = gruppen.flatMap(g => g.zeilen);
  const spaltenZeilen: number[][] = [...gruppen.map(g => g.zeilen), ...(spec.gesamt === false ? [] : [alleZeilen])];
  const J = spaltenZeilen.length, nGruppen = gruppen.length;
  if (nGruppen > GRUPPEN_MAX) throw new TabellenFehler('zu-viele-gruppen', nGruppen);
  const summeW = (zl: number[]) => zl.reduce((a, i) => a + w[i]!, 0);

  const spalten: TabellenSpalte[] = spaltenZeilen.map((zl, j) => {
    const sp: TabellenSpalte = { schluessel: j < nGruppen ? gruppen[j]!.schluessel : 'gesamt', label: j < nGruppen ? gruppen[j]!.label : L('Gesamt', 'Total'), n: zaehle(summeW(zl), zl.length) };
    if (art === 'umfrage') sp.summeGewichte = summeW(zl);
    return sp;
  });

  /* ------------------------------------------------------------------ Blöcke */
  const zeilen: TabellenZeile[] = [], hinweise: TabellenHinweis[] = [], bloeckeInfo: TabellenBlockInfo[] = [];
  const titelVon = (sp: Spalte) => lesbar(sp, true);
  const gemeldet = new Set<string>();   // dieselbe Spalte in zwei Blöcken (Anteile und Kennwerte): der Hinweis steht nur einmal
  const meldeFehlend = (nr: number, spalte: string, gruppe: string, anteil: number) => { const k = `${spalte}|${gruppe}`; if (gemeldet.has(k)) return; gemeldet.add(k); hinweise.push({ art: 'vieleFehlend', block: nr, gruppe, anteil }); };
  let mehrfachN: number[] | null = null, mehrfachAntworten: number[] | null = null;

  /** Wiederkehrende Zählung einer Zeile (Stufe, Top, Option) mit Prozent nach der gewählten Basis. */
  const zelleAus = (n: number | null, prozent: number | null, basis: number | null): TabellenZelle => ({ n, prozent: prozent === null ? null : endlich(prozent), wert: null, basis });

  spec.bloecke.forEach((b, bi) => {
    const nr = bi + 1;
    if (b.art === 'kategorial' || b.art === 'top') {
      const idx = nachName(b.spalte), sp = d.spalten[idx]!;
      bloeckeInfo.push({ art: b.art, titel: titelVon(sp), spalte: sp.name });
      // Stufen: die Wertebeschriftungen (auch ohne Fall, also 0 %), dazu jeder vorkommende Wert ohne Beschriftung - nichts fällt still weg.
      const werteIn = (zl: number[]) => zl.flatMap(i => { const v = d.zeilen[i]![idx]; return fehlt(sp, v) ? [] : [v as string | number]; });
      type Stufe = { schluessel: string; label: string; code: string | number };
      let stufen: Stufe[] = [];
      if (b.art === 'kategorial') {
        const codes = new Map<string, Stufe>();
        for (const [k, lab] of Object.entries(sp.werteLabels)) { const c = codeVon(k); if (typeof c === 'number' && istFehlend(sp, c)) continue; codes.set(schluesselVon(c), { schluessel: schluesselVon(c), label: lab, code: c }); }
        for (const v of werteIn(alleZeilen)) { const k = schluesselVon(v); if (!codes.has(k)) codes.set(k, { schluessel: k, label: k, code: v }); }
        stufen = [...codes.values()].sort((a, c) => vergleiche(a.code, c.code));
      } else {
        const namen = b.stufen.map(x => sp.werteLabels[String(x)] ?? '').filter(Boolean);
        const nums = zahlenListe(b.stufen);
        stufen = [{ schluessel: 'top', code: nums, label: namen.length === b.stufen.length ? `${namen.join(' / ')} (${nums})` : L(`Stufen ${nums}`, `Levels ${nums}`) }];
      }
      const topSet = b.art === 'top' ? new Set(b.stufen.map(String)) : null;
      const stufeVon = (v: string | number): number => (topSet ? (topSet.has(String(v)) ? 0 : -1) : stufen.findIndex(s0 => s0.schluessel === schluesselVon(v)));
      const stufenIndex = topSet ? null : new Map(stufen.map((s0, k) => [s0.schluessel, k]));
      // Pro Spalte: gewichtete und ungewichtete Summen je Stufe, gültig, fehlend.
      const L1 = stufen.length;
      const W = Array.from({ length: J }, () => Array<number>(L1).fill(0)), N = Array.from({ length: J }, () => Array<number>(L1).fill(0));
      const Wg = Array<number>(J).fill(0), Ng = Array<number>(J).fill(0), Wf = Array<number>(J).fill(0), Nf = Array<number>(J).fill(0);
      spaltenZeilen.forEach((zl, j) => {
        for (const i of zl) {
          const v = d.zeilen[i]![idx], g = w[i]!;
          if (fehlt(sp, v)) { Wf[j]! += g; Nf[j]!++; continue; }
          Wg[j]! += g; Ng[j]!++;
          const k = stufenIndex ? (stufenIndex.get(schluesselVon(v as string | number)) ?? -1) : stufeVon(v as string | number);
          if (k >= 0) { W[j]![k]! += g; N[j]![k]!++; }
        }
      });
      // Nenner je Spalte (Basis „Spalte“): gültig oder alle Fälle der Gruppe
      const basisW = (j: number) => (mitKeine ? Wg[j]! + Wf[j]! : Wg[j]!), basisN = (j: number) => (mitKeine ? Ng[j]! + Nf[j]! : Ng[j]!);
      // Zeilensummen über die Gruppen (nicht über die Gesamtspalte, die ja die Summe ist)
      const gruppenJ = Array.from({ length: nGruppen }, (_, j) => j);
      const summeUeber = (f: (j: number) => number) => gruppenJ.reduce((a, j) => a + f(j), 0);
      const grossW = summeUeber(basisW), grossN = summeUeber(basisN);
      const baueZeile = (schluessel: string, label: string, artZeile: TabellenZeile['art'], Wz: (j: number) => number, Nz: (j: number) => number) => {
        const zeileW = summeUeber(Wz), zeileN = summeUeber(Nz);
        const zellen = spaltenZeilen.map((_, j) => {
          const istGesamt = j >= nGruppen;
          const wz = istGesamt ? zeileW : Wz(j), nz = istGesamt ? zeileN : Nz(j);
          let nenner = 0, basis = 0;
          if (basisArt === 'spalte') { nenner = istGesamt ? grossW : basisW(j); basis = zaehle(nenner, istGesamt ? grossN : basisN(j)); }
          else if (basisArt === 'zeile') { nenner = zeileW; basis = zaehle(zeileW, zeileN); }
          else { nenner = grossW; basis = zaehle(grossW, grossN); }
          return zelleAus(zaehle(wz, nz), nenner > 0 ? (100 * wz) / nenner : null, basis);
        });
        zeilen.push({ block: nr, spalte: sp.name, schluessel, art: artZeile, label, zellen });
      };
      stufen.forEach((st, k) => baueZeile(st.schluessel, st.label, b.art === 'top' ? 'top' : 'stufe', j => W[j]![k]!, j => N[j]![k]!));
      if (mitKeine && b.art === 'kategorial') baueZeile('keine', L('keine Angabe', 'no answer'), 'keineAngabe', j => Wf[j]!, j => Nf[j]!);
      // Hinweis: viele Fälle ohne Antwort in einer Gruppe
      gruppen.forEach((g, j) => {
        const alle = zaehle(Wg[j]! + Wf[j]!, Ng[j]! + Nf[j]!), fehl = zaehle(Wf[j]!, Nf[j]!);
        if (alle > 0 && fehl / alle > SCHWELLE_FEHLEND) meldeFehlend(nr, sp.name, g.schluessel, fehl / alle);
      });
      return;
    }

    if (b.art === 'metrisch') {
      const idx = nachName(b.spalte), sp = d.spalten[idx]!;
      bloeckeInfo.push({ art: 'metrisch', titel: titelVon(sp), spalte: sp.name });
      const werte = spaltenZeilen.map(zl => {
        const y: number[] = [], ww: number[] = [];
        let fehl = 0, fehlN = 0;
        for (const i of zl) { const v = d.zeilen[i]![idx]; if (typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v)) { y.push(v); ww.push(w[i]!); } else { fehl += w[i]!; fehlN++; } }
        return { y, w: ww, fehl: zaehle(fehl, fehlN) };
      });
      const kennw = b.kennwerte ?? ['n', 'mw', 'sd', 'median'];
      const label: Record<Kennwert, string> = { n: 'n', mw: 'M', sd: 'SD', median: 'Median' };
      const rechne = (k: Kennwert, q: { y: number[]; w: number[] }): number | null => {
        const nn = zaehle(summeW2(q.w), q.y.length);
        if (k === 'n') return nn;
        if (!q.y.length) return null;
        const wq = art === 'umfrage' ? normiere(q.w) : q.w;
        if (k === 'mw') return endlich(wMittel(q.y, q.w));
        if (k === 'sd') return endlich(wSD(q.y, wq));
        const m = wQuantil(q.y, wq, 0.5);
        if (Number.isFinite(m)) return m;
        return q.y.every(x => x === q.y[0]) ? q.y[0]! : null;   // nur ein Wert (Σw ≤ 1): der Median ist dieser Wert
      };
      for (const k of kennw) {
        const zellen = werte.map(q => ({ n: null, prozent: null, wert: rechne(k, q), basis: zaehle(summeW2(q.w), q.y.length) }) as TabellenZelle);
        zeilen.push({ block: nr, spalte: sp.name, schluessel: k, art: 'kennwert', label: label[k], zellen });
      }
      gruppen.forEach((g, j) => {
        const q = werte[j]!, alle = zaehle(summeW2(q.w), q.y.length) + q.fehl;
        if (alle > 0 && q.fehl / alle > SCHWELLE_FEHLEND) meldeFehlend(nr, sp.name, g.schluessel, q.fehl / alle);
      });
      return;
    }

    // Mehrfachset: je Option eine Zeile; Gewichte gelten für Fälle, nicht für Antworten
    const set = setVon(b.set), mitNull = !!b.mitNull;
    const cols = set.spalten.map(n => nachName(n)), sps = cols.map(c => d.spalten[c]!);
    bloeckeInfo.push({ art: 'mehrfach', titel: set.label || set.name, spalte: '$' + set.name });
    const namen = optionsNamenAus(sps.map(x => x.bezeichnung), sps.map(x => x.name));
    const marken = (i: number) => cols.map((c, k) => { const v = d.zeilen[i]![c]; return !fehlt(sps[k]!, v) && gleichWert(v, set.zaehlwert); });
    const hatAngabe = (i: number) => cols.some((c, k) => !fehlt(sps[k]!, d.zeilen[i]![c]));
    const K = cols.length;
    const Wm = Array.from({ length: J }, () => Array<number>(K).fill(0)), Nm = Array.from({ length: J }, () => Array<number>(K).fill(0));
    const Wc = Array<number>(J).fill(0), Nc = Array<number>(J).fill(0);
    spaltenZeilen.forEach((zl, j) => {
      for (const i of zl) {
        const m = marken(i), gueltig = mitNull ? hatAngabe(i) : m.some(Boolean);
        if (!gueltig) continue;
        Wc[j]! += w[i]!; Nc[j]!++;
        m.forEach((x, k) => { if (x) { Wm[j]![k]! += w[i]!; Nm[j]![k]!++; } });
      }
    });
    const WA = Wm.map(r => r.reduce((a, x) => a + x, 0)), NA = Nm.map(r => r.reduce((a, x) => a + x, 0));
    if (!mehrfachN) { mehrfachN = Array.from({ length: J }, (_, j) => zaehle(Wc[j]!, Nc[j]!)); mehrfachAntworten = Array.from({ length: J }, (_, j) => zaehle(WA[j]!, NA[j]!)); }
    cols.forEach((_, k) => {
      const zellen = spaltenZeilen.map((__, j) => {
        const nenner = mfBasis === 'antworten' ? WA[j]! : Wc[j]!, basis = mfBasis === 'antworten' ? zaehle(WA[j]!, NA[j]!) : zaehle(Wc[j]!, Nc[j]!);
        return zelleAus(zaehle(Wm[j]![k]!, Nm[j]![k]!), nenner > 0 ? (100 * Wm[j]![k]!) / nenner : null, basis);
      });
      zeilen.push({ block: nr, spalte: sps[k]!.name, schluessel: sps[k]!.name, art: 'option', label: namen[k] ?? sps[k]!.name, zellen });
    });
  });

  /* ------------------------------------------------------------------ Kopf: Zahl der Fälle je Spalte */
  // Besteht die Tabelle NUR aus Mehrfach-Blöcken, ist n die Zahl der gültigen Fälle des ersten Sets (die Basis der Prozente).
  if (mehrfachN && spec.bloecke.every(x => x.art === 'mehrfach')) spalten.forEach((sp, j) => { sp.n = mehrfachN![j]!; });
  if (mehrfachAntworten) spalten.forEach((sp, j) => { sp.antworten = mehrfachAntworten![j]!; });
  gruppen.forEach((g, j) => { if (spalten[j]!.n < SCHWELLE_KLEIN) hinweise.unshift({ art: 'kleineGruppe', gruppe: g.schluessel, n: spalten[j]!.n }); });

  if (nGruppen > GRUPPEN_HINWEIS) hinweise.unshift({ art: 'vieleGruppen', n: nGruppen });
  const ohneGruppe = zaehle(summeW(ausserGruppe), ausserGruppe.length);
  return { spalten, zeilen, ohneGruppe, hinweise, ...(spec.gewicht ? { gewicht: { ...spec.gewicht } } : {}), bloecke: bloeckeInfo };

  function summeW2(ww: number[]) { return ww.reduce((a, x) => a + x, 0); }
}
