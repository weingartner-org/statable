/**
 * Das Ergebnis der Cluster-Karte am Blatt (Später, Welle S-E, S2): was gespeichert wird, die Daten der Sitzung dazu, Sätze und Tabellen für Blatt, Bericht und Export.
 * Rechnen: Ward und k-Means in R (clusterlauf.ts → rverfahren.svelte.ts → engine/statable-zeitcluster.R), Silhouette, Profile, η² in JavaScript (cluster.ts).
 * KEINE p-Werte zu Unterschieden zwischen den Gruppen (die Gruppen wurden so gebildet, dass sich die Merkmale unterscheiden); η² nur beschreibend.
 */
import { fehlendMenge, type Fehlmenge } from './fehlend';
import type { TableItem } from '../engine/types';
import { s, L } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import { zit } from './befehlstext';
import { gueltigerName } from './skalabau';
import { komma, ohneNull, type Saetze } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import {
  clusterProfil, kleineGruppe, clusterCodeSatz, clusterGerechnet, clusterBesteSatz, clusterSilhouetteSatz, clusterFussSatz, silhouetteVorschlag, clusterPruefung, zStandardisieren, clusterAusreisser,
  type ClusterProfil, type ClusterCode
} from './cluster';

const T = L;
/** Zahl bis 1 für Tabellenzellen: ohne führende Null, Dezimalzeichen nach Sprachprofil (wie r, p und R² im Satz). */
const ono = (v: number, d: number): Z => (Number.isFinite(v) ? { t: ohneNull(v, d), n: v } : '-');

export interface ClusterKErgebnis {
  k: number;
  /** Nummer der Gruppe je gerechnetem Fall (1 = größte Gruppe) */
  zuordnung: number[];
  wss: number; groesse: number[];
  /** mittlere Silhouette und je Gruppe (null: nicht gerechnet, mehr als 3000 Fälle) */
  silhouette: number | null; silhouetteJe: number[] | null;
  /** k-Means: in wie vielen der Starts die beste Lösung gefunden wurde, Zahl der Starts, Rückfall auf Lloyd */
  besteX: number | null; starts: number | null; rueckfall: boolean;
}
export interface ClusterE {
  /** die gewählten Merkmale (Spaltennamen) und die davon gerechneten (ohne konstante) */
  merkmale: string[]; gerechnet: string[]; konstante: string[];
  verfahren: 'ward' | 'kmeans'; standardisiert: boolean; startwert: number; nstart: number;
  /** 1-basierte Zeilennummern der gerechneten Fälle, Zahl der Zeilen der Tabelle, ausgeschlossene Fälle (fehlende Werte) */
  zeilen: number[]; zeilenGesamt: number; ausgelassen: number; n: number;
  /** die gewählte Zahl der Gruppen und die Ergebnisse je k (2 bis 8) */
  k: number; ks: ClusterKErgebnis[]; vorschlag: number | null;
  /** Ward: die merge-Matrix von hclust, die Höhen und die Reihenfolge der Blätter */
  ward?: { mergeA: number[]; mergeB: number[]; hoehe: number[]; order: number[] };
  tss: number;
  /** Hinweise zur Prüfung: Zahl der Werte mit |z| > 3,5, größte |r| zwischen zwei Merkmalen */
  nAusreisser: number; maxKorr: number;
  profil: ClusterProfil;
  /** die gespeicherte Zugehörigkeit (Name der neuen Spalte), wenn die Person sie gespeichert hat */
  gespeichert?: { spalte: string; k: number };
}
export const K_MIN = 2, K_MAX = 8, NSTART = 25, STARTWERT = 20261008;

/* ---------------------------------------------------------------- Daten der Sitzung */
export interface ClusterDaten {
  /** die gerechneten (nicht konstanten) Merkmale und ihre Werte, Merkmal × Fall, für die vollständigen Fälle */
  gerechnet: string[]; konstante: string[]; roh: number[][]; zeilen: number[]; zeilenGesamt: number; ausgelassen: number; verschiedene: number; alleGleich: boolean;
  /** größte |r| zwischen zwei Merkmalen */
  maxKorr: number; nAusreisser: number;
}
const istZahl = (v: unknown, fe: Fehlmenge): v is number => typeof v === 'number' && Number.isFinite(v) && !fe.includes(v);
/** Die Daten der gewählten Merkmale aus der Sitzung: vollständige Fälle, konstante Merkmale herausgenommen. */
export function clusterDaten(merkmale: string[], quelle: { spalten: typeof s.spalten; zeilen: typeof s.zeilen } = s): ClusterDaten {
  const sp = merkmale.map(n => ({ i: quelle.spalten.findIndex(x => x.name === n), fe: fehlendMenge(quelle.spalten.find(x => x.name === n)) }));
  const zeilen: number[] = [], werte: number[][] = merkmale.map(() => []);
  quelle.zeilen.forEach((z, r) => {
    if (sp.every(c => c.i >= 0 && istZahl(z[c.i], c.fe))) { zeilen.push(r + 1); sp.forEach((c, m) => werte[m]!.push(z[c.i] as number)); }
  });
  const konstant = werte.map(c => c.length > 0 && c.every(v => v === c[0]));
  const gerechnet = merkmale.filter((_, m) => !konstant[m]), roh = werte.filter((_, m) => !konstant[m]);
  const keys = new Set<string>();
  if (roh.length) for (let i = 0; i < zeilen.length; i++) keys.add(roh.map(c => c[i]).join('|'));
  let maxKorr = 0;
  for (let a = 0; a < roh.length; a++) for (let b = a + 1; b < roh.length; b++) maxKorr = Math.max(maxKorr, Math.abs(pearson(roh[a]!, roh[b]!)));
  return { gerechnet, konstante: merkmale.filter((_, m) => konstant[m]), roh, zeilen, zeilenGesamt: quelle.zeilen.length, ausgelassen: quelle.zeilen.length - zeilen.length, verschiedene: roh.length ? keys.size : 0,
    alleGleich: merkmale.length > 0 && konstant.every(Boolean), maxKorr, nAusreisser: roh.length ? clusterAusreisser(zStandardisieren(roh).z).length : 0 };
}
function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 2) return 0;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i]! - ma) * (b[i]! - mb); saa += (a[i]! - ma) ** 2; sbb += (b[i]! - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
}
/** Die Rohwerte der gerechneten Fälle zu einem gespeicherten Ergebnis (Merkmal × Fall), für das Profil bei einem anderen k. */
export function clusterRoh(e: Pick<ClusterE, 'gerechnet' | 'zeilen'>): number[][] {
  const ix = e.gerechnet.map(n => s.spalten.findIndex(x => x.name === n));
  return ix.map(i => e.zeilen.map(r => { const v = s.zeilen[r - 1]?.[i]; return typeof v === 'number' ? v : NaN; }));
}

/** Die Prüfliste vor dem Rechnen: Sperren und Hinweise als Codes (cluster.ts) mit den Zahlen dazu. */
export function clusterVorpruefung(merkmale: string[], verfahren: 'ward' | 'kmeans', k: number, gewicht: boolean): { codes: ClusterCode[]; sperre: boolean; daten: ClusterDaten } {
  const dt = clusterDaten(merkmale);
  const textMerkmal = merkmale.some(n => { const sp = s.spalten.find(x => x.name === n); return !!sp && sp.art !== 'zahl'; });
  const p = clusterPruefung({ n: dt.zeilen.length, k, merkmale: dt.gerechnet.length, verschiedeneFaelle: dt.verschiedene, ausgeschlossen: dt.ausgelassen, verfahren, textMerkmal, konstante: dt.konstante.length, gewicht,
    alleGleich: dt.alleGleich, maxKorr: dt.maxKorr, ausreisser: dt.nAusreisser });
  return { ...p, daten: dt };
}

/* ---------------------------------------------------------------- Zugriff */
export const clusterFuerK = (e: ClusterE, k: number): ClusterKErgebnis | undefined => e.ks.find(x => x.k === k);
/** Die gerechnete Lösung zur gewählten Zahl der Gruppen. */
export const clusterGewaehlt = (e: ClusterE): ClusterKErgebnis | undefined => clusterFuerK(e, e.k) ?? e.ks[0];
/** Der Hinweis auf k: größte Silhouette, aber nur unter den Lösungen ohne sehr kleine Gruppe (ein Ausreißer als Einzelgruppe treibt die Silhouette hoch). */
export const clusterVorschlagVon = (ks: ClusterKErgebnis[], n: number): number | null => silhouetteVorschlag(ks.filter(x => x.silhouette !== null && !kleineGruppe(x.groesse, n)).map(x => ({ k: x.k, mittel: x.silhouette! })))?.k ?? null;
/** Das Profil zur Lösung mit k Gruppen. */
export const clusterProfilFuer = (e: ClusterE, k: number): ClusterProfil => { const r = clusterFuerK(e, k); return r ? clusterProfil(clusterRoh(e), r.zuordnung) : e.profil; };

/* ---------------------------------------------------------------- Sätze */
const zwei = (v: number) => komma(v, 2);
const mw = (v: number) => { const a = Math.abs(v); return komma(v, a >= 100 ? 0 : a >= 10 ? 1 : 2); };
/** Auffällige Merkmale einer Gruppe (|z| ≥ 0,5), die stärksten zuerst, höchstens 3. */
function gruppenSatz(e: ClusterE, p: ClusterProfil, j: number, name: (n: string) => string): string {
  const auf = p.zMittel[j]!.map((z, m) => ({ z, m })).filter(x => Math.abs(x.z) >= 0.5).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3);
  const teile = auf.map(x => (x.z > 0
    ? T(`hoch bei ${zitat(name(e.gerechnet[x.m]!))} (M = ${mw(p.mittel[j]![x.m]!)})`, `high on ${zitat(name(e.gerechnet[x.m]!))} (M = ${mw(p.mittel[j]![x.m]!)})`)
    : T(`niedrig bei ${zitat(name(e.gerechnet[x.m]!))} (M = ${mw(p.mittel[j]![x.m]!)})`, `low on ${zitat(name(e.gerechnet[x.m]!))} (M = ${mw(p.mittel[j]![x.m]!)})`)));
  const g = j + 1, n = p.n[j]!;
  return teile.length
    ? T(`Gruppe ${g} (n = ${n}): ${teile.join(', ')}`, `Group ${g} (n = ${n}): ${teile.join(', ')}`)
    : T(`Gruppe ${g} (n = ${n}): kein Merkmal weicht deutlich vom Gesamtmittel ab`, `Group ${g} (n = ${n}): no feature differs clearly from the overall mean`);
}
export function clusterGerechnetBlatt(e: ClusterE): string {
  return clusterGerechnet({ verfahren: e.verfahren, n: e.n, k: e.k, standardisiert: e.standardisiert, nstart: e.nstart, startwert: e.startwert });
}
export function saetzeCluster(e: ClusterE, name: (n: string) => string = x => x): Saetze {
  const r = clusterGewaehlt(e);
  if (!r) return { haupt: '', zusatz: '', vorsicht: clusterFussSatz(), apa: '', marken: [] };
  const p = clusterProfil(clusterRoh(e), r.zuordnung), groessen = r.groesse.join(', ');
  const std = e.standardisiert ? T('z-standardisierte Merkmale', 'z-standardized features') : T('rohe Merkmale', 'raw features');
  const haupt = e.verfahren === 'ward'
    ? T(`Die ${e.n} Fälle wurden mit dem Ward-Verfahren (euklidische Abstände, ${std}) in ${e.k} Gruppen eingeteilt (Größen ${groessen}).`, `The ${e.n} cases were divided into ${e.k} groups with Ward's method (Euclidean distances, ${std}) (sizes ${groessen}).`)
    : T(`Die ${e.n} Fälle wurden mit k-Means (k = ${e.k}, ${e.nstart} Starts, Startwert ${e.startwert}, ${std}) in ${e.k} Gruppen eingeteilt (Größen ${groessen}); die Streuung innerhalb der Gruppen ist ${zwei(r.wss)} von ${zwei(e.tss)}.`,
      `The ${e.n} cases were divided into ${e.k} groups with k-means (k = ${e.k}, ${e.nstart} starts, seed ${e.startwert}, ${std}) (sizes ${groessen}); the spread within the groups is ${zwei(r.wss)} of ${zwei(e.tss)}.`);
  const profile = p.n.map((_, j) => gruppenSatz({ ...e, gerechnet: e.gerechnet }, p, j, name)).join('. ') + '.';
  const teile: string[] = [profile];
  const klein = kleineGruppe(r.groesse, e.n);
  if (r.silhouette !== null) teile.push(clusterSilhouetteSatz(r.silhouette, e.k, klein));
  if (e.verfahren === 'kmeans' && r.besteX !== null && r.starts !== null) teile.push(clusterBesteSatz(r.besteX, r.starts));
  const codes: ClusterCode[] = [];
  if (klein) codes.push('kleine-gruppe');
  if (e.konstante.length) codes.push('konstant');
  if (e.ausgelassen > 0.2 * (e.n + e.ausgelassen)) codes.push('viele-fehlend');
  if (e.nAusreisser > 0) codes.push('ausreisser');
  if (Math.abs(e.maxKorr) > 0.9) codes.push('korreliert');
  if (e.n < 30) codes.push('wenig-faelle');
  if (e.k > e.n / 5) codes.push('k-gross');
  if (e.n > 3000) codes.push('silhouette-zu-gross');
  const ctx = { n: e.n, k: e.k, ausgeschlossen: e.ausgelassen, anzahl: codes.includes('konstant') ? e.konstante.length : e.nAusreisser };
  const vorsicht = [...codes.map(c => clusterCodeSatz(c, ctx)), clusterFussSatz()].join(' ');
  const apa = `${e.verfahren === 'ward' ? T('Ward-Verfahren (ward.D2, euklidisch', 'Ward\'s method (ward.D2, Euclidean') : T('k-Means (Hartigan-Wong', 'k-means (Hartigan-Wong')}, ${e.standardisiert ? T('z-standardisiert', 'z-standardized') : T('roh', 'raw')}), k = ${e.k} (n = ${groessen})${r.silhouette !== null && !klein ? `, ${T('mittlere Silhouette', 'mean silhouette')} = ${ohneNull(r.silhouette, 2)}` : ''}`;
  return { haupt, zusatz: teile.join(' '), vorsicht, apa, marken: [] };
}

/* ---------------------------------------------------------------- Tabellen */
export function tabellenCluster(e: ClusterE, name: (n: string) => string = x => x): TableItem[] {
  const r = clusterGewaehlt(e);
  if (!r) return [];
  const p = clusterProfil(clusterRoh(e), r.zuordnung), aus: TableItem[] = [];
  const ueber: Z[][] = [
    [T('Verfahren', 'Method'), e.verfahren === 'ward' ? T('Ward-Verfahren (hclust, ward.D2)', 'Ward\'s method (hclust, ward.D2)') : T('k-Means (Hartigan-Wong)', 'k-means (Hartigan-Wong)')],
    [T('Abstand', 'Distance'), T('euklidisch', 'Euclidean')], [T('Merkmale', 'Features'), e.standardisiert ? T('z-standardisiert', 'z-standardized') : T('roh', 'raw')],
    [T('Gerechnete Fälle', 'Cases calculated'), String(e.n)], [T('Ausgeschlossen (fehlende Werte)', 'Excluded (missing values)'), String(e.ausgelassen)], [T('Zahl der Gruppen (k)', 'Number of groups (k)'), String(e.k)],
    [T('Streuung innerhalb der Gruppen', 'Spread within the groups'), fx(r.wss, 2)], [T('Gesamtstreuung', 'Total spread'), fx(e.tss, 2)], [T('Anteil zwischen den Gruppen', 'Share between the groups'), ono(e.tss > 0 ? 1 - r.wss / e.tss : 0, 3)]
  ];
  if (r.silhouette !== null) ueber.push([T('Mittlere Silhouette', 'Mean silhouette'), ono(r.silhouette, 3)]);
  if (e.verfahren === 'kmeans') {
    ueber.push([T('Starts', 'Starts'), String(e.nstart)], [T('Startwert', 'Seed'), String(e.startwert)]);
    if (r.besteX !== null && r.starts !== null) ueber.push([T('Beste Lösung gefunden in', 'Best solution found in'), `${r.besteX} ${T('von', 'of')} ${r.starts}`]);
  }
  aus.push(tabelle('Clusteranalyse', T('Clusteranalyse', 'Cluster analysis'), [T('Kennzahl', 'Measure'), T('Wert', 'Value')], ueber, [clusterGerechnetBlatt(e)]));
  const kopf = [T('Gruppe', 'Group'), 'n', T('Anteil', 'Share'), ...e.gerechnet.map(n => `${name(n)} (M, SD)`)];
  const ms = (m: number, sd: number): Z => ({ t: `${mw(m)} (${mw(sd)})`, n: m });
  const zeilen: Z[][] = p.n.map((n, j) => [T(`Gruppe ${j + 1}`, `Group ${j + 1}`), String(n), ono(n / e.n, 2), ...e.gerechnet.map((_, m) => ms(p.mittel[j]![m]!, p.sd[j]![m]!))]);
  zeilen.push([T('Alle', 'All'), String(e.n), '1', ...e.gerechnet.map((_, m) => ms(p.gesamtMittel[m]!, p.gesamtSd[m]!))]);
  zeilen.push(['η²', '-', '-', ...e.gerechnet.map((_, m) => ono(p.eta2[m]!, 2))]);
  aus.push(tabelle('Gruppenprofile', T('Profile der Gruppen (Mittelwert und Standardabweichung in den Einheiten der Merkmale)', 'Profiles of the groups (mean and standard deviation in the units of the features)'), kopf, zeilen,
    [T('η² ist der Anteil der Streuung eines Merkmals, den die Gruppen erklären. Es beschreibt nur; es gibt keine Tests zwischen den Gruppen, weil die Gruppen so gebildet wurden, dass sich die Merkmale unterscheiden.', 'η² is the share of the spread of a feature that the groups explain. It only describes; there are no tests between the groups because the groups were formed so that the features differ.')]));
  const zk = [T('Gruppe', 'Group'), ...e.gerechnet.map(n => name(n))];
  aus.push(tabelle('Gruppen z', T('Abweichung vom Gesamtmittel in Standardabweichungen (z)', 'Deviation from the overall mean in standard deviations (z)'), zk,
    p.zMittel.map((row, j) => [T(`Gruppe ${j + 1}`, `Group ${j + 1}`), ...row.map(v => fx(v, 2))])));
  const km = e.verfahren === 'kmeans';
  const kz: Z[][] = e.ks.map(x => [String(x.k), fx(x.wss, 2), x.silhouette !== null ? ono(x.silhouette, 3) : '-', x.groesse.join(', '), ...(km ? [x.besteX !== null && x.starts !== null ? `${x.besteX}/${x.starts}` : '-'] : [])]);
  aus.push(tabelle('Zahl der Gruppen', T('Zahl der Gruppen: Streuung und Silhouette', 'Number of groups: spread and silhouette'),
    [T('Gruppen (k)', 'Groups (k)'), T('Streuung innerhalb', 'Spread within'), T('Mittlere Silhouette', 'Mean silhouette'), T('Größen', 'Sizes'), ...(km ? [T('Beste Lösung in x Starts', 'Best solution in x starts')] : [])], kz,
    [e.vorschlag !== null ? T(`Die größte Silhouette hat k = ${e.vorschlag}; das ist ein Hinweis, die Person entscheidet.`, `The largest silhouette is at k = ${e.vorschlag}; this is a hint, the person decides.`) : (e.ks.some(x => x.silhouette !== null) ? T('Bei jeder Zahl der Gruppen steht mindestens eine sehr kleine Gruppe (vermutlich Ausreißer); einen Hinweis auf k gibt Statable dann nicht.', 'For every number of groups at least one very small group exists (probably outliers); Statable then gives no hint for k.') : T('Für diese Fallzahl wird keine Silhouette gerechnet.', 'No silhouette is calculated for this number of cases.'))]));
  return aus;
}

/* ---------------------------------------------------------------- Zugehörigkeit als neue Spalte (nur auf Wunsch) */
export const zeilenListe = (nummern: number[]): string => {
  const zeilen: string[] = []; let zeile = '';
  for (const n of nummern) { const teil = ',' + n; if (zeile.length + teil.length > 90) { zeilen.push(zeile); zeile = teil; } else zeile += teil; }
  zeilen.push(zeile);
  return zeilen.join('\n    ');
};
/**
 * PSPP-Befehl für die neue Spalte: `COMPUTE name = $SYSMIS.`, je Gruppe `IF (ANY($CASENUM, …)) name = Nummer.` (die Werte hängen an der Zeilennummer; Zeilen ohne Zugehörigkeit bleiben fehlend),
 * Format, Spaltenbeschriftung, Wertebeschriftungen und Niveau nominal. Beschriftungen laufen durch `zit` (ein Zeilenumbruch aus den Daten kann keinen Befehl einschleusen); der Name muss ein gültiger Name sein.
 */
export function clusterSpaltenBefehl(name: string, spalte: (number | null)[], labels: Record<string, string>, beschriftung: string): string {
  if (!gueltigerName(name)) throw new Error('Kein gültiger Spaltenname');
  const nach = new Map<number, number[]>();
  spalte.forEach((w, i) => { if (w !== null) (nach.get(w) ?? nach.set(w, []).get(w)!).push(i + 1); });
  const t: string[] = [`COMPUTE ${name} = $SYSMIS.`];
  for (const [w, nr] of [...nach].sort((x, y) => x[0] - y[0])) t.push(`IF (ANY($CASENUM${zeilenListe(nr)})) ${name} = ${Math.trunc(w)}.`);
  t.push('EXECUTE.', `FORMATS ${name} (F2.0).`, `VARIABLE LABELS ${name} ${zit(beschriftung)}.`);
  const vl = Object.entries(labels).map(([code, l]) => `${Math.trunc(Number(code))} ${zit(l, 120)}`);
  if (vl.length) t.push(`VALUE LABELS ${name} ${vl.join(' ')}.`);
  t.push(`VARIABLE LEVEL ${name} (NOMINAL).`, 'EXECUTE.');
  return t.join('\n');
}
