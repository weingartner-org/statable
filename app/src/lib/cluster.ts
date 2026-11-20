/**
 * Clusteranalyse Ward und k-Means (Später, Welle S-E, Teil S2; Fachblatt SPAETER-E Abschnitt 4 und „Entscheidungen Opus (18.10.)“ 7).
 * Hier stehen die REINEN Teile in JavaScript: z-Werte, Silhouette, Streuung innerhalb, ARI, Nummerierung nach Größe, Profile mit η² (beschreibend, KEINE p-Werte), Ausreißer,
 * Schnitt aus der merge-Matrix von hclust, Stutzen des Dendrogramms, Prüfungen und Sätze. Ward (hclust ward.D2) und k-Means (Hartigan-Wong, 25 Starts) rechnet R:
 * engine/statable-zeitcluster.R, aufgerufen in lib/rverfahren.svelte.ts. Tests: cluster.test.ts (Sollwerte aus R 4.6.1).
 * Spalten sind Arrays je Merkmal (Merkmal × Fall); Cluster-Nummern sind beliebige positive Ganzzahlen.
 */
import { L, Lp, d } from './sitzung.svelte';
import { komma } from './ergebnis';

const sumq = (a: number[]) => a.reduce((s, v) => s + v, 0);

/* ---------------------------------------------------------------- z-Werte */
/** z-Standardisierung je Merkmal (sd mit n − 1, wie scale()). Eine konstante Spalte hat sd 0 und z = 0 (nie NaN). */
export function zStandardisieren(spalten: number[][]): { z: number[][]; mittel: number[]; sd: number[] } {
  const mittel = spalten.map(c => (c.length ? sumq(c) / c.length : 0));
  const sd = spalten.map((c, j) => (c.length > 1 ? Math.sqrt(sumq(c.map(v => (v - mittel[j]!) ** 2)) / (c.length - 1)) : 0));
  return { z: spalten.map((c, j) => c.map(v => (sd[j]! > 0 ? (v - mittel[j]!) / sd[j]! : 0))), mittel, sd };
}

/* ---------------------------------------------------------------- Nummerierung nach Größe */
/** 1 = größte Gruppe; bei gleicher Größe zuerst die Gruppe, deren erster Fall früher in der Tabelle steht. So bleibt die Nummerierung beim Wechsel des Startwerts gleich. */
export function clusterNachGroesse(zuordnung: number[]): number[] {
  const info = new Map<number, { n: number; erste: number }>();
  zuordnung.forEach((g, i) => { const e = info.get(g); if (e) e.n++; else info.set(g, { n: 1, erste: i }); });
  const reihe = [...info.entries()].sort((a, b) => b[1].n - a[1].n || a[1].erste - b[1].erste);
  const neu = new Map(reihe.map(([g], i) => [g, i + 1]));
  return zuordnung.map(g => neu.get(g)!);
}

/* ---------------------------------------------------------------- Abstände, Streuung, Silhouette */
const nummern = (zuordnung: number[]) => [...new Set(zuordnung)].sort((a, b) => a - b);
/** Summe der Quadratsummen zu den Clustermitteln (z = Merkmal × Fall). */
export function clusterWss(z: number[][], zuordnung: number[]): number {
  let wss = 0;
  for (const g of nummern(zuordnung)) {
    const ix = zuordnung.flatMap((x, i) => (x === g ? [i] : []));
    for (const col of z) { const m = ix.reduce((s, i) => s + col[i]!, 0) / ix.length; for (const i of ix) wss += (col[i]! - m) ** 2; }
  }
  return wss;
}
/** Silhouette (Rousseeuw 1987), euklidisch: s(i) = (b − a)/max(a, b); Cluster mit einem Fall: s = 0; je[j] = Mittel des Clusters mit der j-ten Nummer; weniger als 2 Cluster: alles 0. */
export function clusterSilhouette(z: number[][], zuordnung: number[]): { fall: number[]; mittel: number; je: number[] } {
  const n = zuordnung.length, nr = nummern(zuordnung), p = z.length;
  if (nr.length < 2 || !n) return { fall: Array(n).fill(0), mittel: 0, je: nr.map(() => 0) };
  const platz = new Map(nr.map((g, j) => [g, j])), gr = zuordnung.map(g => platz.get(g)!), groesse = Array(nr.length).fill(0) as number[];
  for (const g of gr) groesse[g]!++;
  const fall = Array(n).fill(0) as number[];
  const summe = new Float64Array(nr.length);
  for (let i = 0; i < n; i++) {
    summe.fill(0);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      let q = 0;
      for (let m = 0; m < p; m++) { const dd = z[m]![i]! - z[m]![j]!; q += dd * dd; }
      summe[gr[j]!]! += Math.sqrt(q);
    }
    const eigen = gr[i]!;
    if (groesse[eigen]! < 2) { fall[i] = 0; continue; }
    const a = summe[eigen]! / (groesse[eigen]! - 1);
    let b = Infinity;
    for (let g = 0; g < nr.length; g++) if (g !== eigen) b = Math.min(b, summe[g]! / groesse[g]!);
    fall[i] = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
  }
  const je = nr.map((_, g) => { let s = 0, c = 0; for (let i = 0; i < n; i++) if (gr[i] === g) { s += fall[i]!; c++; } return c ? s / c : 0; });
  return { fall, mittel: sumq(fall) / n, je };
}
/** Adjusted Rand Index (Hubert & Arabie 1985): 1 = gleiche Einteilung, 0 = so ähnlich wie Zufall. Nie NaN. */
export function clusterAri(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 1;
  const c2 = (x: number) => (x * (x - 1)) / 2, tab = new Map<string, number>(), za = new Map<number, number>(), zb = new Map<number, number>();
  for (let i = 0; i < n; i++) { const k = `${a[i]}|${b[i]}`; tab.set(k, (tab.get(k) ?? 0) + 1); za.set(a[i]!, (za.get(a[i]!) ?? 0) + 1); zb.set(b[i]!, (zb.get(b[i]!) ?? 0) + 1); }
  let sc = 0, sa = 0, sb = 0;
  for (const v of tab.values()) sc += c2(v);
  for (const v of za.values()) sa += c2(v);
  for (const v of zb.values()) sb += c2(v);
  const e = (sa * sb) / c2(n), nenner = (sa + sb) / 2 - e;
  return nenner === 0 ? 1 : (sc - e) / nenner;
}

/* ---------------------------------------------------------------- Profile (beschreibend; kein F, kein p) */
export interface ClusterProfil { n: number[]; mittel: number[][]; sd: number[][]; zMittel: number[][]; gesamtMittel: number[]; gesamtSd: number[]; eta2: number[] }
const sdVon = (a: number[], m: number) => (a.length > 1 ? Math.sqrt(sumq(a.map(v => (v - m) ** 2)) / (a.length - 1)) : 0);
/** Mittel, Streuung (n − 1) und z-Mittel je Cluster und Merkmal (Originaleinheiten), η² je Merkmal = SS_zwischen / SS_gesamt als BESCHREIBUNG der Trennschärfe. Es gibt kein p: die Cluster wurden so gewählt, dass sich die Merkmale unterscheiden. */
export function clusterProfil(roh: number[][], zuordnung: number[]): ClusterProfil {
  const nr = nummern(zuordnung), ix = nr.map(g => zuordnung.flatMap((x, i) => (x === g ? [i] : [])));
  const gesamtMittel = roh.map(c => (c.length ? sumq(c) / c.length : 0)), gesamtSd = roh.map((c, m) => sdVon(c, gesamtMittel[m]!));
  const mittel = ix.map(l => roh.map(c => (l.length ? l.reduce((s, i) => s + c[i]!, 0) / l.length : 0)));
  const sd = ix.map((l, j) => roh.map((c, m) => sdVon(l.map(i => c[i]!), mittel[j]![m]!)));
  const zMittel = mittel.map(row => row.map((v, m) => (gesamtSd[m]! > 0 ? (v - gesamtMittel[m]!) / gesamtSd[m]! : 0)));
  const eta2 = roh.map((c, m) => {
    const ssg = sumq(c.map(v => (v - gesamtMittel[m]!) ** 2));
    if (!(ssg > 0)) return 0;
    const ssb = ix.reduce((s, l, j) => s + l.length * (mittel[j]![m]! - gesamtMittel[m]!) ** 2, 0);
    return ssb / ssg;
  });
  return { n: ix.map(l => l.length), mittel, sd, zMittel, gesamtMittel, gesamtSd, eta2 };
}

/** Werte mit |z| > grenze (Voreinstellung 3,5), 0-basiert nach Fall und Merkmal. Statable entfernt nichts. */
export function clusterAusreisser(z: number[][], grenze = 3.5): { zeile: number; spalte: number; z: number }[] {
  const aus: { zeile: number; spalte: number; z: number }[] = [];
  const n = z[0]?.length ?? 0;
  for (let i = 0; i < n; i++) z.forEach((col, m) => { if (Math.abs(col[i]!) > grenze) aus.push({ zeile: i, spalte: m, z: col[i]! }); });
  return aus;
}

/* ---------------------------------------------------------------- Hierarchie: Schnitt und Dendrogramm */
/** cutree aus der merge-Matrix von hclust (negative Zahl = Einzelfall, positive = frühere Verschmelzung); Nummern in der Reihenfolge des ersten Auftretens. */
export function clusterSchnitt(mergeA: number[], mergeB: number[], n: number, k: number): number[] {
  const eltern = Array.from({ length: n }, (_, i) => i);
  const wurzel = (x: number): number => { while (eltern[x] !== x) { eltern[x] = eltern[eltern[x]!]!; x = eltern[x]!; } return x; };
  const schritte = Math.max(0, Math.min(n - 1, n - Math.max(1, Math.min(n, Math.round(k)))));
  const vertreter: number[] = [];
  for (let s = 0; s < schritte; s++) {
    const a = mergeA[s]!, b = mergeB[s]!;
    const ra = wurzel(a < 0 ? -a - 1 : vertreter[a - 1]!), rb = wurzel(b < 0 ? -b - 1 : vertreter[b - 1]!);
    eltern[rb] = ra; vertreter[s] = ra;
  }
  const nummer = new Map<number, number>();
  return Array.from({ length: n }, (_, i) => { const r = wurzel(i); if (!nummer.has(r)) nummer.set(r, nummer.size + 1); return nummer.get(r)!; });
}

export interface DendroOpt { maxBlaetter?: number; aeste?: number }
/** Bis `maxBlaetter` (60) Fälle vollständig; darüber gestutzt: die obersten `aeste` (30) Verschmelzungen bleiben, die Blätter sind die aeste + 1 Gruppen darunter (mit Größe). */
export function dendrogrammGestutzt(mergeA: number[], mergeB: number[], hoehe: number[], n: number, opt: DendroOpt = {}): { gestutzt: boolean; blaetter: { groesse: number }[]; verschmelzungen: number } {
  const maxB = opt.maxBlaetter ?? 60, aeste = opt.aeste ?? 30;
  if (n <= maxB) return { gestutzt: false, blaetter: Array.from({ length: n }, () => ({ groesse: 1 })), verschmelzungen: Math.max(0, n - 1) };
  const gr = clusterSchnitt(mergeA, mergeB, n, aeste + 1), zaehl = new Map<number, number>();
  for (const g of gr) zaehl.set(g, (zaehl.get(g) ?? 0) + 1);
  void hoehe;
  return { gestutzt: true, blaetter: [...zaehl.values()].map(groesse => ({ groesse })), verschmelzungen: aeste };
}

export interface DendroKnoten { x: number; hoehe: number; blatt?: { fall: number; groesse: number }; kinder?: [number, number]; gruppe: number }
/**
 * Der Baum zum Zeichnen: Knoten (Blätter und Verschmelzungen) mit x-Platz (Blätter 0, 1, 2 … in der Reihenfolge des Baums, Verschmelzungen in der Mitte ihrer Kinder) und Höhe.
 * Vollständig bis `maxBlaetter`, sonst gestutzt (Blatt = Gruppe unter den obersten `aeste` Verschmelzungen, `fall` = erster Fall der Gruppe, `groesse` = Zahl der Fälle).
 * `gruppe`: Nummer des Clusters bei einem Schnitt in `k` Gruppen (0 = oberhalb des Schnitts).
 */
export function dendrogrammBaum(mergeA: number[], mergeB: number[], hoehe: number[], n: number, k: number, opt: DendroOpt = {}): { knoten: DendroKnoten[]; wurzel: number; blaetter: number; hoeheMax: number; schnitt: number } {
  const maxB = opt.maxBlaetter ?? 60, aeste = opt.aeste ?? 30, gestutzt = n > maxB;
  const erstSchritt = gestutzt ? n - 1 - aeste : 0;   // Verschmelzungen ab diesem Schritt (0-basiert) bleiben
  const gruppeVon = clusterSchnitt(mergeA, mergeB, n, k);
  const knoten: DendroKnoten[] = [];
  const idSchritt = new Map<number, number>();   // Schritt -> Knoten
  const groesseSchritt: number[] = Array(Math.max(0, n - 1)).fill(0), ersterFall: number[] = Array(Math.max(0, n - 1)).fill(0), gruppeSchritt: number[] = Array(Math.max(0, n - 1)).fill(0);
  const groesseVon = (r: number) => (r < 0 ? 1 : groesseSchritt[r - 1]!), ersterVon = (r: number) => (r < 0 ? -r - 1 : ersterFall[r - 1]!);
  for (let s = 0; s < n - 1; s++) {
    const a = mergeA[s]!, b = mergeB[s]!;
    groesseSchritt[s] = groesseVon(a) + groesseVon(b); ersterFall[s] = Math.min(ersterVon(a), ersterVon(b));
    gruppeSchritt[s] = (a < 0 ? gruppeVon[-a - 1]! : gruppeSchritt[a - 1]!) === (b < 0 ? gruppeVon[-b - 1]! : gruppeSchritt[b - 1]!) ? (a < 0 ? gruppeVon[-a - 1]! : gruppeSchritt[a - 1]!) : 0;
  }
  let nextX = 0;
  const bauKind = (r: number): number => {
    const schritt = r < 0 ? -1 : r - 1;
    if (r > 0 && schritt >= erstSchritt) return bauSchritt(schritt);
    const fall = ersterVon(r), id = knoten.length;
    knoten.push({ x: nextX++, hoehe: 0, blatt: { fall, groesse: groesseVon(r) }, gruppe: r < 0 ? gruppeVon[-r - 1]! : gruppeSchritt[r - 1]! });
    return id;
  };
  const bauSchritt = (s: number): number => {
    const k1 = bauKind(mergeA[s]!), k2 = bauKind(mergeB[s]!), id = knoten.length;
    knoten.push({ x: (knoten[k1]!.x + knoten[k2]!.x) / 2, hoehe: hoehe[s]!, kinder: [k1, k2], gruppe: gruppeSchritt[s]! });
    idSchritt.set(s, id);
    return id;
  };
  const wurzel = n >= 2 ? bauSchritt(n - 2) : 0;
  if (n < 2) knoten.push({ x: 0, hoehe: 0, blatt: { fall: 0, groesse: 1 }, gruppe: 1 });
  // Schnitthöhe: zwischen der (n − k)-ten und der (n − k + 1)-ten Verschmelzung
  const kk = Math.max(1, Math.min(n, Math.round(k))), unten = kk < n ? hoehe[n - kk - 1]! : 0, oben = kk > 1 ? hoehe[n - kk]! : (hoehe[n - 2] ?? 0) * 1.05;
  return { knoten, wurzel, blaetter: nextX, hoeheMax: hoehe[n - 2] ?? 0, schnitt: kk <= 1 ? oben : (unten + oben) / 2 };
}

/** Besteht eine Gruppe aus sehr wenigen Fällen (unter 5 Fälle oder unter 5 % aller Fälle)? Dann ist sie meist ein Ausreißer, und die Silhouette sagt wenig. */
export const kleineGruppe = (groesse: number[], n: number): boolean => groesse.length > 0 && Math.min(...groesse) < Math.max(5, 0.05 * n);

/* ---------------------------------------------------------------- Zahl der Gruppen */
export type SilhouetteDeutung = 'stark' | 'vernuenftig' | 'schwach' | 'keine';
/** Deutung der mittleren Silhouette (Kaufman & Rousseeuw 1990; Opus: bis 0,25 „keine deutliche Struktur“). */
export const silhouetteDeutung = (m: number): SilhouetteDeutung => (m > 0.7 ? 'stark' : m > 0.5 ? 'vernuenftig' : m > 0.25 ? 'schwach' : 'keine');
/** Die Zahl der Gruppen mit der größten mittleren Silhouette unter 2 ≤ k ≤ 8 (bei Gleichstand die kleinere) - nur ein Hinweis, die Person entscheidet. */
export function silhouetteVorschlag(werte: { k: number; mittel: number }[]): { k: number; mittel: number } | null {
  let best: { k: number; mittel: number } | null = null;
  for (const w of werte) { if (w.k < 2 || w.k > 8 || !Number.isFinite(w.mittel)) continue; if (!best || w.mittel > best.mittel || (w.mittel === best.mittel && w.k < best.k)) best = w; }
  return best;
}

/* ---------------------------------------------------------------- Prüfung der Eingabe */
export type ClusterCode =
  | 'gewicht' | 'text-merkmal' | 'zu-wenig-merkmale' | 'zu-viele-merkmale' | 'alle-gleich' | 'zu-wenig-faelle' | 'k-zu-gross' | 'ward-zu-gross' | 'kmeans-zu-gross'
  | 'kleine-gruppe' | 'wenig-faelle' | 'k-gross' | 'konstant' | 'viele-fehlend' | 'ausreisser' | 'korreliert' | 'silhouette-zu-gross';
export interface ClusterEin { n: number; k: number; merkmale: number; verschiedeneFaelle: number; ausgeschlossen: number; verfahren: 'ward' | 'kmeans'; textMerkmal?: boolean; konstante?: number; gewicht?: boolean; alleGleich?: boolean; maxKorr?: number; ausreisser?: number }
/** Größte Fallzahl für Ward (Speicher der Abstände) und für die Silhouette; k-Means rechnet bis KMEANS_MAX Fälle. */
export const WARD_MAX = 3000, SILHOUETTE_MAX = 3000, KMEANS_MAX = 100_000;
/** Was gesperrt ist und was nur ein Hinweis ist. Die Reihenfolge ist fest: erst die Sperren, dann die Hinweise (Fachblatt 4.1, 4.4, 4.10). */
export function clusterPruefung(e: ClusterEin): { sperre: boolean; codes: ClusterCode[] } {
  const sperren: ClusterCode[] = [], hinweise: ClusterCode[] = [];
  const zuWenig = e.n < 10 || e.n < 3 * e.k;
  if (e.gewicht) sperren.push('gewicht');
  if (e.textMerkmal) sperren.push('text-merkmal');
  if (e.merkmale < 2) sperren.push('zu-wenig-merkmale');
  if (e.merkmale > 30) sperren.push('zu-viele-merkmale');
  if (e.alleGleich) sperren.push('alle-gleich');
  if (zuWenig) sperren.push('zu-wenig-faelle');
  if (e.k >= e.verschiedeneFaelle) sperren.push('k-zu-gross');
  if (e.verfahren === 'ward' && e.n > WARD_MAX) sperren.push('ward-zu-gross');
  if (e.verfahren === 'kmeans' && e.n > KMEANS_MAX) sperren.push('kmeans-zu-gross');
  if (e.n < 30 && !zuWenig) hinweise.push('wenig-faelle');
  if (e.k > e.n / 5 && !zuWenig) hinweise.push('k-gross');
  if ((e.konstante ?? 0) >= 1) hinweise.push('konstant');
  if (e.ausgeschlossen > 0.2 * (e.n + e.ausgeschlossen)) hinweise.push('viele-fehlend');
  if ((e.ausreisser ?? 0) >= 1) hinweise.push('ausreisser');
  if (Math.abs(e.maxKorr ?? 0) > 0.9) hinweise.push('korreliert');
  if (e.n > SILHOUETTE_MAX) hinweise.push('silhouette-zu-gross');
  return { sperre: sperren.length > 0, codes: [...sperren, ...hinweise] };
}

/* ---------------------------------------------------------------- Sätze */
export interface ClusterCtx { n?: number; k?: number; ausgeschlossen?: number; anzahl?: number; merkmale?: number }
const z0 = (x: number | undefined) => (typeof x === 'number' && Number.isFinite(x) ? komma(x, 0) : '?');
/** Der Satz zu einer Sperre oder einem Hinweis der Clusteranalyse. */
export function clusterCodeSatz(code: ClusterCode, ctx: ClusterCtx = {}): string {
  const n = z0(ctx.n), k = z0(ctx.k), aus = z0(ctx.ausgeschlossen), anz = ctx.anzahl ?? 0;
  switch (code) {
    case 'gewicht': return L('Die Clusteranalyse rechnet nicht mit Fallgewicht: Gewichtete Fälle würden zu Mehrfachfällen, die in einem Cluster stehen und das Ergebnis verzerren.', 'Cluster analysis does not calculate with a case weight: weighted cases would become multiple cases that sit in one cluster and distort the result.');
    case 'text-merkmal': return d('Für Merkmale aus Text oder Kategorien braucht es ein anderes Abstandsmaß (Gower), das Statable noch nicht rechnet. Wähle nur Spalten mit Zahlen.',
      'Für Merkmale aus Text oder Kategorien braucht es ein anderes Abstandsmaß (Gower), das Statable noch nicht rechnet. Wählen Sie nur Spalten mit Zahlen.', 'Features made of text or categories need another distance measure (Gower), which Statable does not calculate yet. Choose only columns with numbers.');
    case 'zu-wenig-merkmale': return L('Eine Clusteranalyse braucht mindestens zwei Merkmale. Gruppen aus einem einzigen Merkmal sind Klassen; dafür gibt es den Daten-Assistenten „Umkodieren“ (Wahl „Klassen bilden“).', 'A cluster analysis needs at least two features. Groups made from a single feature are classes; the data assistant "Recode" (option "Form classes") does that.');
    case 'zu-viele-merkmale': return L('Mehr als 30 Merkmale sind für diese Clusteranalyse zu viele.', 'More than 30 features are too many for this cluster analysis.');
    case 'alle-gleich': return L('Alle Fälle haben in allen Merkmalen dieselben Werte; da gibt es nichts zu gruppieren.', 'All cases have the same values in all features; there is nothing to group.');
    case 'zu-wenig-faelle': return L(`Zu wenige Fälle (${n}) für ${k} Gruppen: nötig sind mindestens 10 Fälle und mindestens 3 je Gruppe.`, `Too few cases (${n}) for ${k} groups: at least 10 cases and at least 3 per group are needed.`);
    case 'k-zu-gross': return d('Es gibt weniger verschiedene Fälle als Gruppen. Wähle weniger Gruppen.', 'Es gibt weniger verschiedene Fälle als Gruppen. Wählen Sie weniger Gruppen.', 'There are fewer distinct cases than groups. Choose fewer groups.');
    case 'ward-zu-gross': return L('Ward braucht alle Abstände zwischen den Fällen und rechnet nur bis 3 000 Fälle. Für mehr Fälle gibt es k-Means.', 'Ward needs all distances between the cases and only works up to 3,000 cases. For more cases there is k-means.');
    case 'kmeans-zu-gross': return L('k-Means rechnet im Browser bis 100 000 Fälle; mehr geht hier nicht.', 'k-means works in the browser up to 100,000 cases; more is not possible here.');
    case 'kleine-gruppe': return L('Eine Gruppe besteht aus sehr wenigen Fällen (vermutlich Ausreißer); die Silhouette sagt dann wenig.', 'One group consists of very few cases (probably outliers); the silhouette then says little.');
    case 'wenig-faelle': return L('Unter 30 Fälle: Die Gruppen sind dann instabil und ändern sich schon durch wenige Fälle.', 'Fewer than 30 cases: the groups are then unstable and change with just a few cases.');
    case 'k-gross': return L('Bei so vielen Gruppen hat jede im Mittel weniger als 5 Fälle.', 'With this many groups each has fewer than 5 cases on average.');
    case 'konstant': return Lp(anz, `${anz} Merkmal hat überall denselben Wert und ist nicht eingegangen.`, `${anz} Merkmale haben überall denselben Wert und sind nicht eingegangen.`, `${anz} feature has the same value everywhere and was left out.`, `${anz} features have the same value everywhere and were left out.`);
    case 'viele-fehlend': return L(`Mehr als 20 % der Fälle haben fehlende Werte in den Merkmalen (${aus} Fälle) und sind nicht eingegangen.`, `More than 20% of the cases have missing values in the features (${aus} cases) and were left out.`);
    case 'ausreisser': return Lp(anz, `${anz} Wert weicht um mehr als 3,5 Standardabweichungen ab. Solche Fälle bilden leicht eine eigene Gruppe. Statable entfernt nichts; wer ausschließen will, nutzt den Daten-Assistenten „Fälle auswählen“.`,
      `${anz} Werte weichen um mehr als 3,5 Standardabweichungen ab. Solche Fälle bilden leicht eine eigene Gruppe. Statable entfernt nichts; wer ausschließen will, nutzt den Daten-Assistenten „Fälle auswählen“.`,
      `${anz} value deviates by more than 3.5 standard deviations. Such cases easily form a group of their own. Statable removes nothing; to exclude them, use the data assistant "Select cases".`,
      `${anz} values deviate by more than 3.5 standard deviations. Such cases easily form a group of their own. Statable removes nothing; to exclude them, use the data assistant "Select cases".`);
    case 'korreliert': return L('Zwei Merkmale hängen sehr eng zusammen (|r| über ,9) und zählen damit doppelt in den Abständen.', 'Two features are very closely related (|r| above .9) and so count twice in the distances.');
    case 'silhouette-zu-gross': return L('Bei mehr als 3 000 Fällen rechnet Statable keine Silhouette; das Ellbogenbild bleibt.', 'With more than 3,000 cases Statable does not calculate a silhouette; the elbow plot remains.');
  }
}
/** Ein R-Fehler der Clusterrechnung als Satz; unbekannte Meldungen bleiben als Zusatz stehen. */
export function clusterFehlerSatz(meldung: string): string {
  if (/more cluster centers than distinct data points|initial centers are not distinct/i.test(meldung)) return d('Es gibt weniger verschiedene Fälle als Gruppen. Wähle weniger Gruppen.', 'Es gibt weniger verschiedene Fälle als Gruppen. Wählen Sie weniger Gruppen.', 'There are fewer distinct cases than groups. Choose fewer groups.');
  return L(`Die Clusteranalyse konnte nicht rechnen (${meldung}).`, `The cluster analysis could not calculate (${meldung}).`);
}
/** „Gerechnet“: Verfahren, Abstand, Standardisierung, Starts und Startwert. */
export function clusterGerechnet(e: { verfahren: 'ward' | 'kmeans'; n: number; k: number; standardisiert: boolean; nstart?: number; startwert?: number }): string {
  const n = z0(e.n), k = z0(e.k);
  const std = e.standardisiert ? L('Merkmale z-standardisiert', 'features z-standardized') : L('Merkmale roh (nicht standardisiert)', 'features raw (not standardized)');
  if (e.verfahren === 'ward') return L(`Clusteranalyse: Ward-Verfahren (hclust, ward.D2), euklidische Abstände, ${std}, ${n} Fälle, ${k} Gruppen (Murtagh und Legendre, 2014).`, `Cluster analysis: Ward's method (hclust, ward.D2), Euclidean distances, ${std}, ${n} cases, ${k} groups (Murtagh and Legendre, 2014).`);
  const ns = z0(e.nstart ?? 25), sw = e.startwert ?? 20261008;
  return L(`Clusteranalyse: k-Means (Hartigan-Wong), ${std}, ${n} Fälle, ${k} Gruppen, ${ns} Starts, Startwert ${sw} (Hartigan und Wong, 1979).`, `Cluster analysis: k-means (Hartigan-Wong), ${std}, ${n} cases, ${k} groups, ${ns} starts, seed ${sw} (Hartigan and Wong, 1979).`);
}
/** „Beste Lösung in x von n Starts“; unter 10 von 25 der Hinweis auf eine Wiederholung mit anderem Startwert. */
export function clusterBesteSatz(x: number, von: number): string {
  const a = L(`Die beste Lösung wurde in ${x} von ${von} Starts gefunden.`, `The best solution was found in ${x} of ${von} starts.`);
  if (x >= 10) return a;
  return `${a} ${d('Die Lösung ist nicht eindeutig; wiederhole die Rechnung mit einem anderen Startwert.', 'Die Lösung ist nicht eindeutig; wiederholen Sie die Rechnung mit einem anderen Startwert.', 'The solution is not unique; repeat the calculation with a different seed.')}`;
}
/** Satz zur mittleren Silhouette. */
export function clusterSilhouetteSatz(mittel: number, k: number, kleineGruppeDa = false): string {
  const m = komma(mittel, 2), deutung = silhouetteDeutung(mittel);
  if (kleineGruppeDa) return L(`Die mittlere Silhouette war ${m} (k = ${k}). Bei einer so kleinen Gruppe wird sie nicht als Gruppenstruktur gedeutet.`, `The mean silhouette was ${m} (k = ${k}). With such a small group it is not interpreted as group structure.`);
  if (deutung === 'stark') return L(`Die mittlere Silhouette war ${m} (k = ${k}); das spricht für eine starke Gruppenstruktur.`, `The mean silhouette was ${m} (k = ${k}); this points to a strong group structure.`);
  if (deutung === 'vernuenftig') return L(`Die mittlere Silhouette war ${m} (k = ${k}); das spricht für eine vernünftige Gruppenstruktur.`, `The mean silhouette was ${m} (k = ${k}); this points to a reasonable group structure.`);
  if (deutung === 'schwach') return L(`Die mittlere Silhouette war ${m} (k = ${k}); das spricht für eine schwache bis mittlere Gruppenstruktur.`, `The mean silhouette was ${m} (k = ${k}); this points to a weak to moderate group structure.`);
  return L(`Die mittlere Silhouette war ${m} (k = ${k}); die Daten zeigen keine deutliche Gruppenstruktur. Die Gruppen sind eher eine Einteilung als eine Entdeckung.`, `The mean silhouette was ${m} (k = ${k}); the data show no clear group structure. The groups are more a division than a discovery.`);
}
/** Fußzeile: Cluster finden immer etwas; Tests zwischen den Gruppen sind wertlos. */
export const clusterFussSatz = (): string => L('Clusteranalysen finden immer Gruppen, auch in Zufallsdaten. Ob die Gruppen sinnvoll sind, ist eine fachliche Frage; Tests zwischen den Gruppen sind nicht aussagekräftig.', 'Cluster analyses always find groups, even in random data. Whether the groups make sense is a question of the subject; tests between the groups are not meaningful.');
/** Hinweis nach dem Speichern der Zugehörigkeit. */
export const clusterGespeichertSatz = (): string => d('Die Gruppen stammen aus einem Verfahren, das immer Gruppen findet. Teste nicht mit diesen Gruppen, ob sie sich unterscheiden.', 'Die Gruppen stammen aus einem Verfahren, das immer Gruppen findet. Testen Sie nicht mit diesen Gruppen, ob sie sich unterscheiden.', 'The groups come from a method that always finds groups. Do not test with these groups whether they differ.');

/* ---------------------------------------------------------------- Zugehörigkeit als neue Spalte */
/** Die Spalte für alle Zeilen der Tabelle: Zeilen ohne Zugehörigkeit (fehlende Werte) sind null. `zeilen`: 1-basierte Zeilennummern der gerechneten Fälle. */
export function clusterSpalte(zeilen: number[], zuordnung: number[], nGesamt: number): (number | null)[] {
  const aus: (number | null)[] = Array(Math.max(0, nGesamt)).fill(null);
  zeilen.forEach((r, i) => { if (r >= 1 && r <= aus.length && zuordnung[i] !== undefined) aus[r - 1] = zuordnung[i]!; });
  return aus;
}
/** Wertebeschriftungen „Cluster 1 (n = 43)“ nach Nummer. Das Leerzeichen in „n = 43“ ist geschützt. */
export function clusterWerteLabels(zuordnung: number[]): Record<string, string> {
  const n = new Map<number, number>();
  for (const g of zuordnung) n.set(g, (n.get(g) ?? 0) + 1);
  return Object.fromEntries([...n.entries()].sort((a, b) => a[0] - b[0]).map(([g, c]) => [String(g), L(`Cluster ${g} (n = ${c})`, `Cluster ${g} (n = ${c})`)]));
}
/** Name der neuen Spalte: „Cluster“, sonst mit Zähler („Cluster_2“); nie ein vorhandener Name (Groß/klein egal, wie in PSPP). */
export function clusterSpaltenName(vorhanden: string[]): string {
  const alle = new Set(vorhanden.map(x => x.toLowerCase()));
  if (!alle.has('cluster')) return 'Cluster';
  for (let i = 2; ; i++) if (!alle.has(`cluster_${i}`)) return `Cluster_${i}`;
}
