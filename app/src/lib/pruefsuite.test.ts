/**
 * Prüf-Suite (Prüfrunde 07.10.2026): jedes Verfahren mit D1 (Lehrbuch), D2 (bfi) und D3 (Grenzfälle) durch den echten Weg
 * Datei (.csv und .xlsx) → einlesen → Engine → korrigiereAusgabe → Auslesen (ergebnis.ts) und gegen R (pruefdaten/erwartet.json).
 * Aufruf: node scripts/pruef-suite.mjs  (oder npx vitest run src/lib/pruefsuite.test.ts)
 * Neue Vergleichswerte: Rscript scripts/pruef-erwartet.R. Gleich heißt: höchstens 1/10 000 (relativ, mindestens absolut) entfernt.
 */
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { OutputItem } from '../engine/types';
import { korrigiereAusgabe } from '../engine/korrektur';
import { leseCsv, leseTabellenkalkulation, zurEngine } from './einlesen';
import { faktoren, kreuz, skala, verteilung, vorhersage, zusammenhang, zweiGruppen } from './ergebnis';
import { finde, spalte, type Raster } from './tabelle';
import { nodeEngine } from './testengine';

const ORDNER = new URL('../../../pruefdaten/', import.meta.url);
interface Fall { name: string; daten: string; art: string; syntax: string; werte: Record<string, number | null> }
const liste: Fall[] = existsSync(new URL('erwartet.json', ORDNER)) ? JSON.parse(readFileSync(new URL('erwartet.json', ORDNER), 'utf8')).faelle : [];

/** Zahl aus einer Zeile (erste Spalte beginnt mit `zeile`) und Spalte (Kopf passt). */
const zelle = (r: Raster | null, zeile: RegExp, kopf: RegExp, ab = 0) => {
  if (!r) return undefined;
  const i = r.t.findIndex((z, j) => j >= r.tabelle.headRows[0] && z.some(c => zeile.test(c)));
  return i < 0 ? undefined : r.n[i]![spalte(r, kopf, ab)];
};
const ersteZeile = (r: Raster | null, kopf: RegExp) => (r ? r.n[r.tabelle.headRows[0]]![spalte(r, kopf)] : undefined);
/** Wertnamen aus Häufigkeitstabellen kommen mit dem Dezimalzeichen des Sprachprofils („1,00“); als Schlüssel zählt die Zahl. */
const schluessel = (t: string) => (/^-?[\d.,]+$/.test(t) ? String(Number(t.replace(',', '.'))) : t);

/** Die Zahlen eines Laufs unter denselben Schlüsseln wie in erwartet.json. */
function auslesen(f: Fall, items: OutputItem[]): Record<string, number | undefined> {
  const w: Record<string, number | undefined> = {};
  const m = /\/VARIABLES=(\w+)/.exec(f.syntax), g = /GROUPS=(\w+)/.exec(f.syntax);
  switch (f.art) {
    case 'zwei': {
      const e = zweiGruppen(items, m![1]!, g![1]!);
      Object.assign(w, { nA: e.a.n, nB: e.b.n, mA: e.a.m, mB: e.b.m, sdA: e.a.sd, sdB: e.b.sd, t: e.t, df: e.df, p: e.p, diffLo: e.diffLo, diffHi: e.diffHi,
        tKlassisch: e.tKlassisch, dfKlassisch: e.dfKlassisch, pKlassisch: e.pKlassisch, d: e.d, dLoExakt: e.dLo, dHiExakt: e.dHi });
      break;
    }
    case 'gepaart': {
      const t = finde(items, /^Paired Samples Test$/), c = finde(items, /^Paired Samples Correlations$/);
      Object.assign(w, { diff: ersteZeile(t, /^Mean$/), sd: ersteZeile(t, /^Std\. Deviation$/), lo: ersteZeile(t, /^Lower$/), hi: ersteZeile(t, /^Upper$/),
        t: ersteZeile(t, /^t$/), df: ersteZeile(t, /^df$/), p: ersteZeile(t, /^Sig\./), r: ersteZeile(c, /^Correlation$/) });
      break;
    }
    case 'eine': {
      const t = finde(items, /^One-Sample Test$/);
      Object.assign(w, { t: ersteZeile(t, /^t$/), df: ersteZeile(t, /^df$/), p: ersteZeile(t, /^Sig\./), diff: ersteZeile(t, /^Mean Difference$/), lo: ersteZeile(t, /^Lower$/), hi: ersteZeile(t, /^Upper$/) });
      break;
    }
    case 'oneway': {
      const a = finde(items, /^ANOVA$/), l = finde(items, /^Test of Homogeneity of Variances$/);
      Object.assign(w, { F: zelle(a, /^Between Groups$/, /^F$/), df1: zelle(a, /^Between Groups$/, /^df$/), df2: zelle(a, /^Within Groups$/, /^df$/), p: zelle(a, /^Between Groups$/, /^Sig\.$/),
        levene: ersteZeile(l, /^Levene Statistic$/), leveneP: ersteZeile(l, /^Sig\.$/) });
      break;
    }
    case 'mw': {
      const t = finde(items, /^Test Statistics$/);
      Object.assign(w, { U: ersteZeile(t, /^Mann-Whitney U$/), W: ersteZeile(t, /^Wilcoxon W$/), Z: ersteZeile(t, /^Z$/), p: ersteZeile(t, /^Asymp\. Sig\./) });
      break;
    }
    case 'wilcoxon': case 'kw': {
      const t = finde(items, /^Test Statistics$/), v = (re: RegExp) => { const i = t?.t.findIndex(z => re.test(z[0]!)) ?? -1; return i < 0 ? undefined : t!.n[i]![1]; };
      Object.assign(w, f.art === 'wilcoxon' ? { Z: v(/^Z$/), p: v(/^Asymp\. Sig\./) } : { chi2: v(/^Chi-Square$/), df: v(/^df$/), p: v(/^Asymp\. Sig\./) });
      break;
    }
    case 'korrelation': {
      const v = /VARIABLES=(\w+) (\w+)/.exec(f.syntax)!, e = zusammenhang(items, v[1]!, v[2]!);
      Object.assign(w, { r: e.r, p: e.p, n: e.n, kiLo: e.kiLo, kiHi: e.kiHi });
      break;
    }
    case 'kreuz': {
      const e = kreuz(items);
      Object.assign(w, { chi2: e.chi2, df: e.df, p: e.p, n: e.n, v: e.v, minErwartet: e.minErwartet });
      break;
    }
    case 'regression': {
      const e = vorhersage(items, '');
      Object.assign(w, { r2: e.r2, r2korr: e.r2korr, F: e.f, df1: e.df1, df2: e.df2, p: e.p });
      for (const x of e.praediktoren) Object.assign(w, { [`b_${x.name}`]: x.b, [`beta_${x.name}`]: x.beta, [`p_${x.name}`]: x.p, [`lo_${x.name}`]: x.lo, [`hi_${x.name}`]: x.hi });
      break;
    }
    case 'skala': {
      const e = skala(items);
      Object.assign(w, { alpha: e.alpha, n: e.n });
      for (const x of e.fragen) Object.assign(w, { [`r_${x.name}`]: x.trennschaerfe, [`ohne_${x.name}`]: x.alphaOhne });
      break;
    }
    case 'faktor': {
      const e = faktoren(items), tv = finde(items, /^Total Variance Explained$/), ko = finde(items, /^Communalities$/);
      const ev = (i: number) => tv?.n[tv.tabelle.headRows[0] + i]?.[1];
      Object.assign(w, { faktoren: e.faktoren.length, erklaert: e.erklaert, n: e.n, ev1: ev(0), ev2: ev(1), h2_erste: ko ? ko.n[ko.tabelle.headRows[0]]![spalte(ko, /^Extraction$/)] : undefined });
      break;
    }
    case 'beschreiben':
      for (const z of verteilung(items).zahlen) Object.assign(w, { [`n_${z.name}`]: z.n, [`m_${z.name}`]: z.m, [`sd_${z.name}`]: z.sd, [`min_${z.name}`]: z.min, [`max_${z.name}`]: z.max });
      break;
    case 'haeufig': {
      const h = verteilung(items).gruppen[0]!;
      Object.assign(w, { gueltig: h.n, fehlend: h.fehlend });
      for (const x of h.werte) w[`n_${schluessel(x.name)}`] = x.anzahl;
      break;
    }
    case 'examine': {
      // EXAMINE … BY druckt zwei Tabellen „Descriptives“: erst alle, dann je Gruppe.
      const it = items.filter(i => i.type === 'table' && (i.title?.t ?? i.label) === 'Descriptives').at(-1)!;
      const t = finde([it], /./)!, k = spalte(t, /^Statistic$/);
      for (let i = t.tabelle.headRows[0]; i < t.t.length; i++) {
        const [, gr, was] = t.t[i]!, key = { Mean: 'm', Median: 'median', 'Std. Deviation': 'sd', 'Interquartile Range': 'iqr' }[was!];
        if (key) w[`${key}_${schluessel(gr!)}`] = t.n[i]![k];
      }
      break;
    }
  }
  return w;
}

const nah = (ist: number | undefined, soll: number) => ist !== undefined && Number.isFinite(ist) && Math.abs(ist - soll) <= 1e-4 * Math.max(1, Math.abs(soll));

/** Bekannte, besprochene Abweichungen (Bericht PRUEFBERICHT-2026-10-07.md): Schlüssel → Grund. */
export const BEKANNT: Record<string, string> = {
};

for (const format of ['csv', 'xlsx'] as const) {
  describe(`Prüf-Suite (${format})`, () => {
    let e: Awaited<ReturnType<typeof nodeEngine>>;
    let geladen = '';
    beforeAll(async () => { e = await nodeEngine(); });
    const lade = async (daten: string) => {
      if (geladen === daten) return;
      const pfad = new URL(`${daten}.${format}`, ORDNER);
      const t = format === 'csv' ? leseCsv(readFileSync(pfad, 'utf8')) : await leseTabellenkalkulation(new Uint8Array(readFileSync(pfad)).buffer, daten);
      const { syntax, csv } = zurEngine(t);
      e.run(syntax, { '/import.csv': csv });
      geladen = daten;
    };
    for (const f of liste) {
      it(f.name, async () => {
        await lade(f.daten);
        const items = korrigiereAusgabe(e.run(f.syntax));
        const fehler = items.filter(i => i.type === 'message' && /error/i.test((i as { severity?: string }).severity ?? '')).map(i => (i as { text: string }).text.split('\n')[0]);
        const ist = auslesen(f, items);
        const abw = Object.entries(f.werte).filter(([k, soll]) => soll !== null && !BEKANNT[`${f.name}/${k}`] && !nah(ist[k], soll))
          .map(([k, soll]) => `${k}: Statable ${ist[k]} · R ${soll}`);
        expect({ fehler, abw }).toEqual({ fehler: [], abw: [] });
      });
    }
  });
}
