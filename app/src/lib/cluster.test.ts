import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-e-erwartet.json';
import { s } from './sitzung.svelte';
import {
  zStandardisieren, clusterSilhouette, clusterWss, clusterAri, clusterNachGroesse, clusterProfil, clusterAusreisser, clusterSchnitt, dendrogrammGestutzt, silhouetteDeutung, silhouetteVorschlag,
  clusterPruefung, clusterCodeSatz, clusterFehlerSatz, clusterGerechnet, clusterBesteSatz, clusterSilhouetteSatz, clusterFussSatz, clusterSpalte, clusterWerteLabels, clusterSpaltenName, type ClusterCode
} from './cluster';

/* ===== Später, Welle S-E, Teil S2: Clusteranalyse Ward und k-Means (neue Karte „cluster“; Fachblatt SPAETER-E Abschnitt 4 und „Entscheidungen Opus (18.10.)“ 7 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. FESTGELEGT: die REINEN Teile rechnen in JS (`lib/cluster.ts`, hier getestet): z-Werte, Silhouette, Streuung,
 * ARI, Nummerierung nach Größe, Profile mit η², Ausreißer, Schnitt aus merge, Stutzen des Dendrogramms, Prüfungen, Sätze, Spalte speichern. Ward (hclust ward.D2 auf euklidischen z-Werten) und k-Means
 * (Hartigan-Wong, nstart 25, fester Startwert 20261008, „beste Lösung in x von 25“) rechnen in R (`engine/statable-zeitcluster.R`, geprüft in engine/spaeter-e.webr.test.ts) - R ist hier die Rechnung, JS nur die Auswertung.
 * Sollwerte: scripts/spaeter-e-erwartet.R (R 4.6.1: hclust, kmeans, cluster::silhouette; zweite Quellen: Ward nach Lance-Williams UND Brute-Force dESS, Lloyd-Gegenprobe, eigene Silhouette-Formel, eigenes ARI).
 * Opus: Zahl der Gruppen: Ellbogen und Silhouette, k mit größter Silhouette nur als Hinweis; Silhouette < 0,25 → „kaum Struktur“; Profile als Mittelwerte; KEINE p-Werte zu Clusterunterschieden, η² nur beschreibend;
 * Zugehörigkeit nur auf Wunsch als neue Spalte; `QUICK CLUSTER` nur als Hinweis in der Hilfe.
 *
 * SCHNITTSTELLE lib/cluster.ts (Spalten = Arrays je Merkmal; Cluster-Nummern beliebige positive Ganzzahlen, Silhouette/Profile ordnen aufsteigend nach Nummer)
 *   zStandardisieren(spalten: number[][]): { z: number[][]; mittel: number[]; sd: number[] }       sd mit n − 1; konstante Spalte: sd 0, z = 0 (nie NaN)
 *   clusterSilhouette(z, zuordnung): { fall: number[]; mittel: number; je: number[] }              euklidisch; Cluster mit einem Fall: s = 0; je[j] = Mittel des Clusters mit der j-ten Nummer; weniger als 2 Cluster: alles 0
 *   clusterWss(z, zuordnung): number                               Summe der Quadratsummen zu den Clustermitteln
 *   clusterAri(a, b): number                                       adjusted Rand index (Hubert & Arabie 1985)
 *   clusterNachGroesse(zuordnung): number[]                        1 = größte Gruppe; bei Gleichstand die mit dem kleinsten Zeilenindex eines Falls zuerst
 *   clusterProfil(roh, zuordnung): { n: number[]; mittel: number[][]; sd: number[][]; zMittel: number[][]; gesamtMittel: number[]; gesamtSd: number[]; eta2: number[] }       mittel[j][m] = Cluster j+1, Merkmal m;
 *        zMittel = (Clustermittel − Gesamtmittel)/Gesamt-sd (n − 1); eta2[m] = SS_zwischen / SS_gesamt; KEIN p-Wert, kein F (Feld gibt es nicht)
 *   clusterAusreisser(z, grenze = 3.5): { zeile: number; spalte: number; z: number }[]      0-basiert, |z| > grenze
 *   clusterSchnitt(mergeA, mergeB, n, k): number[]                 cutree aus der merge-Matrix von hclust (negative Zahl = Einzelfall, positive = frühere Verschmelzung); Nummern beliebig
 *   dendrogrammGestutzt(mergeA, mergeB, hoehe, n, opt?: { maxBlaetter?: number (60); aeste?: number (30) }): { gestutzt: boolean; blaetter: { groesse: number }[]; verschmelzungen: number }
 *        n <= maxBlaetter: vollständig (n Blätter der Größe 1, n − 1 Verschmelzungen); sonst gestutzt: die obersten `aeste` Verschmelzungen bleiben, Blätter = die aeste + 1 Gruppen darunter (mit Größe)
 *   silhouetteDeutung(m): 'stark' | 'vernuenftig' | 'schwach' | 'keine'       m > 0,70 stark · > 0,50 vernünftig · > 0,25 schwach · sonst keine (Kaufman & Rousseeuw; Opus: < 0,25 kaum Struktur)
 *   silhouetteVorschlag(werte: { k: number; mittel: number }[]): { k; mittel } | null       größte mittlere Silhouette unter 2 <= k <= 8 (bei Gleichstand das kleinere k), sonst null; nur ein Hinweis
 *   clusterPruefung(e: { n; k; merkmale; verschiedeneFaelle; ausgeschlossen; verfahren: 'ward' | 'kmeans'; textMerkmal?; konstante?; gewicht?; alleGleich?; maxKorr?; ausreisser? }) → { sperre: boolean; codes: ClusterCode[] }, Codes in dieser Reihenfolge:
 *        sperren: 'gewicht', 'text-merkmal', 'zu-wenig-merkmale' (merkmale < 2), 'zu-viele-merkmale' (> 30), 'alle-gleich', 'zu-wenig-faelle' (n < 10 oder n < 3·k), 'k-zu-gross' (k >= verschiedeneFaelle), 'ward-zu-gross' (ward und n > 3000)
 *        hinweise: 'wenig-faelle' (n < 30, nicht zusammen mit zu-wenig-faelle), 'k-gross' (k > n/5, ebenfalls nicht zusammen mit zu-wenig-faelle), 'konstant' (konstante >= 1), 'viele-fehlend' (ausgeschlossen > 20 % von n + ausgeschlossen), 'ausreisser' (ausreisser >= 1),
 *                  'korreliert' (maxKorr > 0,9), 'silhouette-zu-gross' (n > 3000)
 *   clusterCodeSatz(code, ctx?) · clusterFehlerSatz(meldung) („initial centers are not distinct“ und „more cluster centers than distinct data points.“ → Satz „weniger verschiedene Fälle als Gruppen“)
 *   clusterGerechnet({ verfahren; n; k; standardisiert; nstart?; startwert? }) · clusterBesteSatz(x, von) · clusterSilhouetteSatz(mittel, k) · clusterFussSatz()
 *   clusterSpalte(zeilen: number[] /* 1-basierte Zeilennummern der gerechneten Fälle *\/, zuordnung: number[], nGesamt: number): (number | null)[]       Zeilen ohne Zugehörigkeit (fehlende Werte) → null
 *   clusterWerteLabels(zuordnung): Record<string, string>          { '1': 'Cluster 1 (n = 43)', … } nach Nummer
 *   clusterSpaltenName(vorhanden: string[]): string                'Cluster', sonst mit Zähler; nie ein vorhandener Name, nie überschreiben
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const C = J.cluster_js as Z, CR = J.cluster_r as Z;
const arr = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const cols = (x: any): number[][] => arr(x).map(c => arr(c) as number[]);
const nm = (t: string) => t.replace(/[  ]/g, ' ');
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-12), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol);
const nahe = (ist: number[], soll: number[], tol: number, was: string) => { expect(ist.length, `${was}: Länge`).toBe(soll.length); soll.forEach((v, i) => nah(ist[i]!, v, tol, `${was}[${i}]`)); };
const gleichePartition = (a: number[], b: number[]) => expect(clusterAri(a, b)).toBeCloseTo(1, 12);

describe('z-Standardisierung (Voreinstellung, Milligan & Cooper 1988)', () => {
  for (const [name, d] of [['iris', C.iris], ['umfrage', C.umfrage]] as [string, Z][]) it(`${name}: z-Werte, Mittel und sd (n − 1) gleich R scale()`, () => {
    const o = zStandardisieren(cols(d.roh)); nahe(o.mittel, arr(d.mittel), 1e-12, 'Mittel'); nahe(o.sd, arr(d.sd), 1e-12, 'sd');
    cols(d.z).forEach((c, j) => nahe(o.z[j]!, c, 1e-10, `Spalte ${j}`));
  });
  it('Rand: konstante Spalte gibt 0 statt NaN; leere Eingabe wirft nicht', () => {
    const o = zStandardisieren([[1, 2, 3, 4], [5, 5, 5, 5]]); expect(o.sd[1]).toBe(0); expect(o.z[1]).toEqual([0, 0, 0, 0]); expect(o.z.flat().every(v => !Number.isNaN(v))).toBe(true); expect(() => zStandardisieren([])).not.toThrow();
  });
});

describe('Nummerierung nach Größe (bleibt gleich, gleichgültig wie R die Nummern vergibt)', () => {
  it('Ward: die rohen R-Nummern (cutree) ergeben die Soll-Nummerierung, k = 2 bis 8', () => {
    const rohe = arr(CR.iris_ward_z.soll.zuordnung) as number[][], ks = arr(CR.iris_ward_z.soll.ks) as number[];
    ks.forEach((k, i) => { const neu = clusterNachGroesse(arr(rohe[i])), soll = arr(C.iris.ward[i].zuordnung); expect(neu, `k = ${k}`).toEqual(soll); const gr = Array.from({ length: k }, (_, j) => neu.filter(x => x === j + 1).length); expect(gr).toEqual(arr(C.iris.ward[i].groesse)); });
  });
  it('Größen: Ward k = 2: 101/49; k = 3: 71/49/30; k = 4: 49/45/30/26 (Fachblatt 4.11 - dort Zahlen der Reihenfolge nach Größe)', () => {
    expect(arr(C.iris.ward[0].groesse)).toEqual([101, 49]); expect(arr(C.iris.ward[1].groesse)).toEqual([71, 49, 30]); expect(arr(C.iris.ward[2].groesse).slice().sort((a: number, b: number) => b - a)).toEqual([49, 45, 30, 26]);
    expect(arr(C.umfrage.ward[1].groesse)).toEqual([43, 39, 36]);
  });
  it('zwei Startwerte, dieselbe Lösung: andere rohe Nummern, gleiche Nummerierung', () => {
    const o = C.umfrage.kmeans_andere_startwerte as Z, a = arr(o.a) as number[], b = arr(o.b) as number[];
    expect(a).not.toEqual(b); expect(clusterNachGroesse(a)).toEqual(clusterNachGroesse(b)); expect(clusterNachGroesse(a)).toEqual(arr(o.nach_groesse));
  });
  it('Gleichstand der Größe: der Cluster mit dem früheren ersten Fall zuerst', () => { expect(clusterNachGroesse([7, 7, 3, 3, 9])).toEqual([1, 1, 2, 2, 3]); expect(clusterNachGroesse([3, 9, 9, 3, 5, 5, 5])).toEqual([2, 3, 3, 2, 1, 1, 1]); });
  it('Rand: leer, ein Cluster', () => { expect(clusterNachGroesse([])).toEqual([]); expect(clusterNachGroesse([5, 5, 5])).toEqual([1, 1, 1]); });
});

describe('Silhouette, Streuung innerhalb, ARI', () => {
  for (const [name, d, kmax] of [['iris', C.iris, 8], ['umfrage', C.umfrage, 6]] as [string, Z, number][]) {
    it(`${name}: Ward k = 2 bis ${kmax}: mittlere Silhouette, je Gruppe und je Fall gleich cluster::silhouette (und der eigenen Formel im Skript), WSS gleich R`, () => {
      const z = cols(d.z);
      for (const w of d.ward as Z[]) {
        const si = clusterSilhouette(z, arr(w.zuordnung)); nah(si.mittel, w.silhouette_mittel, 1e-9, `k=${w.k} mittel`); nahe(si.je, arr(w.silhouette_je), 1e-9, `k=${w.k} je Gruppe`); nahe(si.fall, arr(w.silhouette_fall), 1e-9, `k=${w.k} je Fall`);
        nah(clusterWss(z, arr(w.zuordnung)), w.wss, 1e-9, `k=${w.k} WSS`);
      }
    });
    it(`${name}: k-Means: Silhouette und WSS (Nummerierung nach Größe)`, () => {
      const z = cols(d.z); for (const w of d.kmeans as Z[]) { nah(clusterSilhouette(z, arr(w.zuordnung)).mittel, w.silhouette_mittel, 1e-9, `k=${w.k} Silhouette`); nah(clusterWss(z, arr(w.zuordnung)), w.wss, 1e-9, `k=${w.k} WSS`); }
    });
  }
  it('Fachblatt iris (z, Ward): Silhouette k = 2 bis 8 ,5770 / ,4467 / ,4006 / ,3306 / ,3149 / ,3170 / ,3109, WSS 227,1964 / 147,8837 / 116,0593 / 94,3733', () => {
    const z = cols(C.iris.z), soll = [0.577, 0.4467, 0.4006, 0.3306, 0.3149, 0.317, 0.3109]; (C.iris.ward as Z[]).forEach((w, i) => nah(clusterSilhouette(z, arr(w.zuordnung)).mittel, soll[i]!, 2e-3, `k=${i + 2}`));
    [227.1964, 147.8837, 116.0593, 94.3733].forEach((v, i) => nah(clusterWss(z, arr(C.iris.ward[i].zuordnung)), v, 1e-4, `WSS k=${i + 2}`));
  });
  it('Gesamtstreuung bei z-Werten = (n − 1)·p (iris 596 = 149·4); ein Cluster hat WSS = TSS', () => {
    const z = cols(C.iris.z); nah(clusterWss(z, Array(150).fill(1)), 596, 1e-10, 'TSS'); nah(C.iris.tss, 596, 1e-10, 'JSON');
  });
  it('Rand: Cluster mit einem Fall hat s = 0; ein einziges Cluster oder lauter Einzelfälle geben 0 statt NaN', () => {
    const o = clusterSilhouette([[0, 0.1, 5], [0, 0.1, 5]], [1, 1, 2]); expect(o.fall[2]).toBe(0); expect(o.je.length).toBe(2); expect(o.fall.every(v => !Number.isNaN(v))).toBe(true);
    expect(clusterSilhouette([[1, 2, 3], [1, 2, 3]], [1, 1, 1])).toEqual({ fall: [0, 0, 0], mittel: 0, je: [0] }); expect(clusterSilhouette([[1, 2, 3], [4, 5, 6]], [1, 2, 3]).mittel).toBe(0);
  });
  it('ARI (Hubert & Arabie): gleiche Partition 1, Etiketten egal; Soll aus R mit den wahren Gruppen (cluster_umfrage)', () => {
    expect(clusterAri([1, 1, 2, 2], [5, 5, 9, 9])).toBe(1); expect(clusterAri([1, 1, 2, 2], [1, 2, 1, 2])).toBeLessThan(0.01);
    const wahr = arr(C.umfrage.wahre_gruppe) as number[]; (C.umfrage.ward as Z[]).forEach((w, i) => nah(clusterAri(arr(w.zuordnung), wahr), arr(C.umfrage.ari_ward)[i], 1e-12, `ARI Ward k=${w.k}`));
    nah(clusterAri(arr(C.umfrage.kmeans[1].zuordnung), wahr), C.umfrage.ari_kmeans_z3, 1e-12, 'ARI k-Means z'); expect(C.umfrage.ari_kmeans_z3).toBeGreaterThan(C.umfrage.ari_kmeans_roh3 + 0.2);   // Skalierung ändert die Gruppen (0,788 gegen 0,469)
  });
  it('Rand: alles in einem Cluster und alles einzeln gibt kein NaN', () => { expect(Number.isNaN(clusterAri([1, 1, 1, 1], [1, 1, 1, 1]))).toBe(false); expect(Number.isNaN(clusterAri([1, 2, 3, 4], [1, 2, 3, 4]))).toBe(false); expect(Number.isNaN(clusterAri([], []))).toBe(false); });
});

describe('Profile: Mittelwerte, Streuung, z-Mittel, η² (keine p-Werte)', () => {
  const p = C.umfrage.profil_ward3 as Z;
  it('cluster_umfrage, Ward k = 3: n, Mittel, sd, z-Mittel, Gesamtmittel, η²', () => {
    const o = clusterProfil(cols(C.umfrage.roh), arr(C.umfrage.ward[1].zuordnung));
    expect(o.n).toEqual(arr(p.n)); arr(p.mittel).forEach((m: any, j: number) => nahe(o.mittel[j]!, arr(m), 1e-9, `Mittel ${j + 1}`)); arr(p.sd).forEach((m: any, j: number) => nahe(o.sd[j]!, arr(m), 1e-9, `sd ${j + 1}`));
    arr(p.z_mittel).forEach((m: any, j: number) => nahe(o.zMittel[j]!, arr(m), 1e-9, `z-Mittel ${j + 1}`)); nahe(o.gesamtMittel, arr(p.gesamt_mittel), 1e-12, 'Gesamtmittel'); nahe(o.gesamtSd, arr(p.gesamt_sd), 1e-12, 'Gesamt-sd'); nahe(o.eta2, arr(p.eta2), 1e-9, 'η²');
    expect(Object.keys(o).sort()).toEqual(['eta2', 'gesamtMittel', 'gesamtSd', 'mittel', 'n', 'sd', 'zMittel']);   // kein F, kein p
  });
  it('Fachblatt: Motivation je Gruppe 4,279 / 2,206 / 3,104 (n = 43 / 39 / 36)', () => { const o = clusterProfil(cols(C.umfrage.roh), arr(C.umfrage.ward[1].zuordnung)); [4.279, 2.206, 3.104].forEach((v, j) => nah(o.mittel[j]![0]!, v, 1e-3, `Gruppe ${j + 1}`)); expect(o.n).toEqual([43, 39, 36]); });
  it('η² liegt zwischen 0 und 1; ein Cluster gibt η² = 0', () => { const o = clusterProfil(cols(C.umfrage.roh), arr(C.umfrage.ward[1].zuordnung)); for (const v of o.eta2) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); } expect(clusterProfil([[1, 2, 3, 4]], [1, 1, 1, 1]).eta2).toEqual([0]); });
});

describe('Ausreißer (|z| > 3,5): Hinweis, nichts wird entfernt (Fachblatt 4.4)', () => {
  const a = C.ausreisser as Z;
  it('ein Fall mit z von etwa 6,4 (8 Standardabweichungen über dem Mittel der übrigen) in vier Merkmalen: genau seine vier Zellen, bildet bei k = 3 eine eigene Gruppe (Größe 1)', () => {
    const ord = (l: { zeile: number; spalte: number }[]) => [...l].sort((x, y) => x.zeile - y.zeile || x.spalte - y.spalte);
    const o = ord(clusterAusreisser(zStandardisieren(cols(a.roh)).z)) as { zeile: number; spalte: number; z: number }[]; const soll = ord(arr(a.flag_paare).map((p: Z) => ({ zeile: p.zeile - 1, spalte: p.spalte - 1, z: p.z }))) as { zeile: number; spalte: number; z: number }[];
    expect(o.length).toBe(soll.length); soll.forEach((p, i) => { expect(o[i]!.zeile).toBe(p.zeile); expect(o[i]!.spalte).toBe(p.spalte); nah(o[i]!.z, p.z, 1e-9, 'z'); });
    expect(new Set(o.map(x => x.zeile))).toEqual(new Set(arr(a.flag_zeilen).map((x: number) => x - 1))); expect(a.z_max_abs).toBeGreaterThan(6); expect(arr(a.groesse_ward3)[2]).toBe(1);
    expect(clusterNachGroesse(arr(CR.ausreisser_ward.soll.zuordnung[0]))).toEqual(arr(a.zuordnung_ward3));
  });
  it('ohne den Ausreißer: nur die Zeilen aus R (cluster_umfrage hat bei |z| > 3,5 …)', () => { const o = clusterAusreisser(zStandardisieren(cols(C.umfrage.roh)).z); expect(new Set(o.map(x => x.zeile + 1))).toEqual(new Set(arr(a.ohne_ausreisser_flag))); });
  it('Grenze einstellbar; Rand: leer', () => { const z = zStandardisieren(cols(a.roh)).z; expect(clusterAusreisser(z, 100)).toEqual([]); expect(clusterAusreisser(z, 2).length).toBeGreaterThan(clusterAusreisser(z).length); expect(clusterAusreisser([])).toEqual([]); });
});

describe('Schnitt aus der merge-Matrix und gestutztes Dendrogramm', () => {
  it('cutree: Ward-Schnitte k = 2 bis 8 gleich R (gleiche Partition)', () => {
    const a = arr(C.iris.ward_merge_a) as number[], b = arr(C.iris.ward_merge_b) as number[]; (C.iris.ward as Z[]).forEach(w => gleichePartition(clusterSchnitt(a, b, 150, w.k), arr(w.zuordnung)));
    const ua = arr(C.umfrage.ward_merge_a), ub = arr(C.umfrage.ward_merge_b); (C.umfrage.ward as Z[]).forEach(w => gleichePartition(clusterSchnitt(ua, ub, 118, w.k), arr(w.zuordnung)));
  });
  it('n = 200: Schnitt bei k = 4; k = 1 alles ein Cluster; k = n lauter Einzelfälle', () => {
    const d = C.dendrogramm as Z, a = arr(d.merge_a), b = arr(d.merge_b); gleichePartition(clusterSchnitt(a, b, 200, 4), arr(d.schnitt_k4));
    expect(new Set(clusterSchnitt(a, b, 200, 1)).size).toBe(1); expect(new Set(clusterSchnitt(a, b, 200, 200)).size).toBe(200);
  });
  it('Ward-Höhen aufsteigend, oberste sechs iris (z) 4,21292 / 4,22932 / 6,58575 / 7,97802 / 12,59465 / 27,15893', () => {
    const h = arr(C.iris.ward_hoehe) as number[]; expect(h.length).toBe(149); for (let i = 1; i < h.length; i++) expect(h[i]!).toBeGreaterThanOrEqual(h[i - 1]! - 1e-12);
    nahe(h.slice(-6), [4.21292, 4.22932, 6.58575, 7.97802, 12.59465, 27.15893], 1e-5, 'oberste Höhen');
  });
  it('iris Fälle 1 bis 12 (z): merge, order und Höhen aus dem Fachblatt (erste Zeilen (−1,−5), (−8,−12), (−2,−3), (−4,−9), (−11,1))', () => {
    const o = C.iris12 as Z, a = arr(o.merge_a), b = arr(o.merge_b); expect([0, 1, 2, 3, 4].map(i => [a[i], b[i]])).toEqual([[-1, -5], [-8, -12], [-2, -3], [-4, -9], [-11, 1]]); expect(arr(o.order)).toEqual([6, 7, 2, 3, 4, 9, 11, 1, 5, 10, 8, 12]);
    nah(Math.min(...arr(o.hoehe)), 0.4657, 2e-4, 'kleinste Höhe'); nah(Math.max(...arr(o.hoehe)), 6.1363, 2e-4, 'größte Höhe');
    const g = dendrogrammGestutzt(a, b, arr(o.hoehe), 12); expect(g.gestutzt).toBe(false); expect(g.blaetter.length).toBe(12); expect(g.verschmelzungen).toBe(11);
  });
  const kette = (n: number) => ({ a: Array.from({ length: n - 1 }, (_, i) => (i === 0 ? -1 : -(i + 2))), b: Array.from({ length: n - 1 }, (_, i) => (i === 0 ? -2 : i)), h: Array.from({ length: n - 1 }, (_, i) => i + 1) });
  it('bis 60 Blätter vollständig, ab 61 gestutzt: 30 Verschmelzungen, 31 Blätter, Größen summieren sich zu n', () => {
    const k60 = kette(60), g60 = dendrogrammGestutzt(k60.a, k60.b, k60.h, 60); expect(g60.gestutzt).toBe(false); expect(g60.blaetter.length).toBe(60);
    const k61 = kette(61), g61 = dendrogrammGestutzt(k61.a, k61.b, k61.h, 61); expect(g61.gestutzt).toBe(true); expect(g61.blaetter.length).toBe(31); expect(g61.verschmelzungen).toBe(30); expect(g61.blaetter.reduce((x, y) => x + y.groesse, 0)).toBe(61);
    expect(Math.max(...g61.blaetter.map(x => x.groesse))).toBe(31);       // Kette: eine große Gruppe aus den ersten 31 Fällen, 30 Einzelfälle
  });
  it('n = 200 (Rauschen): 31 Blätter mit den Größen aus cutree(k = 31); eigene Grenzen über opt', () => {
    const d = C.dendrogramm as Z, g = dendrogrammGestutzt(arr(d.merge_a), arr(d.merge_b), arr(d.hoehe), 200); expect(g.gestutzt).toBe(true); expect(g.blaetter.length).toBe(31);
    expect(g.blaetter.map(x => x.groesse).sort((x, y) => y - x)).toEqual(arr(d.blaetter_31_groessen)); expect(g.blaetter.reduce((x, y) => x + y.groesse, 0)).toBe(200);
    const kleiner = dendrogrammGestutzt(arr(d.merge_a), arr(d.merge_b), arr(d.hoehe), 200, { maxBlaetter: 100, aeste: 10 }); expect(kleiner.blaetter.length).toBe(11);
    expect(dendrogrammGestutzt(arr(d.merge_a), arr(d.merge_b), arr(d.hoehe), 200, { maxBlaetter: 300 }).gestutzt).toBe(false);
  });
});

describe('Zahl der Gruppen: Deutung und Vorschlag (Opus 7)', () => {
  it('Deutung nach Kaufman & Rousseeuw, Grenze 0,25 → keine Struktur', () => {
    const f = silhouetteDeutung; expect([f(0.9), f(0.71), f(0.7001)]).toEqual(['stark', 'stark', 'stark']); expect([f(0.7), f(0.55), f(0.5001)]).toEqual(['vernuenftig', 'vernuenftig', 'vernuenftig']);
    expect([f(0.5), f(0.41), f(0.2501)]).toEqual(['schwach', 'schwach', 'schwach']); expect([f(0.25), f(0.1), f(0), f(-0.2)]).toEqual(['keine', 'keine', 'keine', 'keine']);
  });
  it('Vorschlag: größte mittlere Silhouette - iris k = 2 (Ward), cluster_umfrage k = 2, obwohl k = 3 die wahren Gruppen besser trifft (ARI ,706 gegen ,539)', () => {
    const iris = (C.iris.ward as Z[]).map(w => ({ k: w.k as number, mittel: w.silhouette_mittel as number })), um = (C.umfrage.ward as Z[]).map(w => ({ k: w.k as number, mittel: w.silhouette_mittel as number }));
    expect(silhouetteVorschlag(iris)?.k).toBe(2); expect(silhouetteVorschlag(um)?.k).toBe(2); expect(arr(C.umfrage.ari_ward)[1]).toBeGreaterThan(arr(C.umfrage.ari_ward)[0]);
  });
  it('Gleichstand: kleineres k; nur k im Bereich 2 bis 8; leer → null', () => {
    expect(silhouetteVorschlag([{ k: 3, mittel: 0.4 }, { k: 2, mittel: 0.4 }])?.k).toBe(2); expect(silhouetteVorschlag([{ k: 1, mittel: 0.99 }, { k: 9, mittel: 0.99 }, { k: 4, mittel: 0.3 }])?.k).toBe(4); expect(silhouetteVorschlag([])).toBeNull();
  });
  it('reines Rauschen (200 × 3): mittlere Silhouette bei Ward für alle k = 2 bis 6 unter 0,25 → „keine“; k-Means k = 2 ebenfalls', () => {
    const r = C.rauschen as Z; for (const v of arr(r.silhouette_ward)) { expect(v).toBeLessThan(0.25); expect(silhouetteDeutung(v)).toBe('keine'); } expect(arr(r.silhouette_kmeans)[0]).toBeLessThan(0.25);
    expect(r.max_ward).toBeLessThan(0.25);
  });
});

describe('Prüfung der Eingabe (Fachblatt 4.1, 4.4, 4.10)', () => {
  const gut = { n: 118, k: 3, merkmale: 4, verschiedeneFaelle: 118, ausgeschlossen: 2, verfahren: 'ward' as const };
  it('gute Eingabe: nichts', () => { expect(clusterPruefung(gut)).toEqual({ sperre: false, codes: [] }); });
  it('Fallgewicht, Text-Merkmal, nur 1 Merkmal, über 30 Merkmale, alle Fälle gleich', () => {
    expect(clusterPruefung({ ...gut, gewicht: true })).toEqual({ sperre: true, codes: ['gewicht'] }); expect(clusterPruefung({ ...gut, textMerkmal: true })).toEqual({ sperre: true, codes: ['text-merkmal'] });
    expect(clusterPruefung({ ...gut, merkmale: 1 })).toEqual({ sperre: true, codes: ['zu-wenig-merkmale'] }); expect(clusterPruefung({ ...gut, merkmale: 2 }).sperre).toBe(false);
    expect(clusterPruefung({ ...gut, merkmale: 31 })).toEqual({ sperre: true, codes: ['zu-viele-merkmale'] }); expect(clusterPruefung({ ...gut, merkmale: 30 }).sperre).toBe(false); expect(clusterPruefung({ ...gut, alleGleich: true })).toEqual({ sperre: true, codes: ['alle-gleich'] });
  });
  it('wenige Fälle: n = 8 gesperrt, n < 3·k gesperrt, n < 30 Hinweis (instabil)', () => {
    expect(clusterPruefung({ ...gut, n: 8, verschiedeneFaelle: 8 })).toEqual({ sperre: true, codes: ['zu-wenig-faelle'] }); expect(clusterPruefung({ ...gut, n: 11, k: 4, verschiedeneFaelle: 11 })).toEqual({ sperre: true, codes: ['zu-wenig-faelle'] });
    expect(clusterPruefung({ ...gut, n: 29, verschiedeneFaelle: 29 })).toEqual({ sperre: false, codes: ['wenig-faelle'] }); expect(clusterPruefung({ ...gut, n: 30, verschiedeneFaelle: 30 }).codes).toEqual([]);
  });
  it('k größer als n/5: Hinweis; k gleich der Zahl verschiedener Fälle: gesperrt (R-Fehler abgefangen)', () => {
    expect(clusterPruefung({ ...gut, n: 40, verschiedeneFaelle: 40, k: 9 })).toEqual({ sperre: false, codes: ['k-gross'] }); expect(clusterPruefung({ ...gut, n: 40, verschiedeneFaelle: 40, k: 8 }).codes).toEqual([]);
    expect(clusterPruefung({ ...gut, n: 40, verschiedeneFaelle: 4, k: 5 })).toEqual({ sperre: true, codes: ['k-zu-gross'] });
    expect(clusterPruefung({ ...gut, n: 40, verschiedeneFaelle: 5, k: 5 }).codes).toContain('k-zu-gross'); expect(clusterPruefung({ ...gut, n: 40, verschiedeneFaelle: 6, k: 5 }).codes).not.toContain('k-zu-gross');
  });
  it('konstantes Merkmal (herausgenommen), viele fehlende Werte, Ausreißer, stark zusammenhängende Merkmale: Hinweise', () => {
    expect(clusterPruefung({ ...gut, konstante: 1 })).toEqual({ sperre: false, codes: ['konstant'] }); expect(clusterPruefung({ ...gut, ausgeschlossen: 29 }).codes).toEqual([]); expect(clusterPruefung({ ...gut, ausgeschlossen: 30 })).toEqual({ sperre: false, codes: ['viele-fehlend'] });
    expect(clusterPruefung({ ...gut, ausreisser: 4 })).toEqual({ sperre: false, codes: ['ausreisser'] }); expect(clusterPruefung({ ...gut, maxKorr: 0.9 }).codes).toEqual([]); expect(clusterPruefung({ ...gut, maxKorr: -0.95 })).toEqual({ sperre: false, codes: ['korreliert'] });
  });
  it('große Tabellen: Ward ab n > 3000 gesperrt, k-Means läuft; Silhouette dort nicht angeboten (Hinweis)', () => {
    expect(clusterPruefung({ ...gut, n: 3001, verschiedeneFaelle: 3001 })).toEqual({ sperre: true, codes: ['ward-zu-gross', 'silhouette-zu-gross'] }); expect(clusterPruefung({ ...gut, n: 3000, verschiedeneFaelle: 3000 }).codes).toEqual([]);
    expect(clusterPruefung({ ...gut, n: 50000, verschiedeneFaelle: 50000, verfahren: 'kmeans' })).toEqual({ sperre: false, codes: ['silhouette-zu-gross'] });
  });
  it('mehrere Gründe: sperren zuerst, Reihenfolge wie im Kopf', () => { const o = clusterPruefung({ ...gut, n: 8, verschiedeneFaelle: 8, gewicht: true, merkmale: 1, konstante: 1 }); expect(o.sperre).toBe(true); expect(o.codes).toEqual(['gewicht', 'zu-wenig-merkmale', 'zu-wenig-faelle', 'konstant']); });
  it('Rand: NaN wirft nicht', () => { expect(() => clusterPruefung({ n: NaN, k: NaN, merkmale: NaN, verschiedeneFaelle: NaN, ausgeschlossen: NaN, verfahren: 'ward' })).not.toThrow(); });
});

describe('Sätze', () => {
  const alle: ClusterCode[] = ['gewicht', 'text-merkmal', 'zu-wenig-merkmale', 'zu-viele-merkmale', 'alle-gleich', 'zu-wenig-faelle', 'k-zu-gross', 'ward-zu-gross', 'wenig-faelle', 'k-gross', 'konstant', 'viele-fehlend', 'ausreisser', 'korreliert', 'silhouette-zu-gross'];
  for (const c of alle) it(`${c}: ganzer Satz, englisch anders, ohne NaN`, () => {
    const ctx = { n: 8, k: 5, ausgeschlossen: 30, anzahl: 4, merkmale: 1 }; const de = clusterCodeSatz(c, ctx); s.einst.sprache = 'en';
    try { const en = clusterCodeSatz(c, ctx); expect(de.length).toBeGreaterThan(20); expect(en).not.toBe(de); for (const t of [de, en]) expect(t).not.toMatch(/NaN|undefined|\[object/); } finally { s.einst.sprache = 'de'; }
  });
  it('Inhalt: Gower bei Text, Klassen bei einem Merkmal, „Ausreißer bilden leicht eine eigene Gruppe“', () => {
    expect(clusterCodeSatz('text-merkmal')).toMatch(/Gower/); expect(clusterCodeSatz('zu-wenig-merkmale')).toMatch(/Klass/); expect(clusterCodeSatz('ausreisser', { anzahl: 4 })).toMatch(/eigene Gruppe/); expect(clusterCodeSatz('gewicht')).toMatch(/Fallgewicht/);
  });
  it('R-Fehler „k größer als verschiedene Fälle“ → ein Satz', () => {
    for (const m of arr(C.fehlermeldungen_k) as string[]) { const t = clusterFehlerSatz(m); expect(t).toMatch(/verschieden/); expect(t.length).toBeGreaterThan(20); }
    expect(clusterFehlerSatz('etwas anderes')).toContain('etwas anderes');
  });
  it('„beste Lösung in x von 25“: bei weniger als 10 von 25 der Hinweis auf Wiederholung mit anderem Startwert', () => {
    const gut = nm(clusterBesteSatz(22, 25)); expect(gut).toMatch(/22 von 25/); expect(gut).not.toMatch(/nicht eindeutig/); const schlecht = nm(clusterBesteSatz(9, 25)); expect(schlecht).toMatch(/9 von 25/); expect(schlecht).toMatch(/nicht eindeutig/); expect(schlecht).toMatch(/Startwert/);
    expect(clusterBesteSatz(10, 25)).not.toMatch(/nicht eindeutig/);
  });
  it('Silhouette-Satz: schwach bis mittel; ≤ 0,25 „keine deutliche Gruppenstruktur“ (Einteilung statt Entdeckung)', () => {
    expect(nm(clusterSilhouetteSatz(0.41, 3))).toMatch(/0,41|,41/); expect(clusterSilhouetteSatz(0.41, 3)).toMatch(/schwach/); const k = clusterSilhouetteSatz(0.21, 2); expect(k).toMatch(/keine deutliche Gruppenstruktur/); expect(k).toMatch(/Einteilung/);
    expect(clusterSilhouetteSatz(0.8, 2)).toMatch(/stark/);
  });
  it('Fußzeile: Cluster finden immer Gruppen, Tests zwischen den Gruppen sind nicht aussagekräftig', () => { const t = clusterFussSatz(); expect(t).toMatch(/immer Gruppen/); expect(t).toMatch(/Tests/); });
  it('Zeile „Gerechnet“ für Ward und k-Means', () => {
    const w = nm(clusterGerechnet({ verfahren: 'ward', n: 118, k: 3, standardisiert: true })); for (const x of ['Ward', 'ward.D2', 'euklidisch', 'z-standardisiert', '118']) expect(w, x).toContain(x);
    const k = nm(clusterGerechnet({ verfahren: 'kmeans', n: 118, k: 3, standardisiert: true, nstart: 25, startwert: 20261008 })); for (const x of ['k-Means', 'Hartigan-Wong', '25', '20261008', '118']) expect(k, x).toContain(x);
    expect(nm(clusterGerechnet({ verfahren: 'kmeans', n: 118, k: 3, standardisiert: false, nstart: 25, startwert: 1 }))).not.toContain('z-standardisiert');
  });
});

describe('Zugehörigkeit als neue Spalte (nur auf Wunsch; Fachblatt 4.9)', () => {
  const o = C.umfrage.kmeans_andere_startwerte as Z;
  it('Zeilen ohne Zugehörigkeit (fehlende Werte in Zeile 7 und 61) bekommen fehlend, die übrigen die Nummer nach Größe', () => {
    const sp = clusterSpalte(arr(o.zeilen), arr(o.nach_groesse), o.zeilen_gesamt); expect(sp.length).toBe(120); expect(sp[6]).toBeNull(); expect(sp[60]).toBeNull(); expect(sp.filter(v => v === null).length).toBe(2);
    expect(sp.filter(v => v !== null)).toEqual(arr(o.nach_groesse)); expect(sp[0]).toBe(arr(o.nach_groesse)[0]);
  });
  it('Wertebeschriftungen mit Größe: „Cluster 1 (n = 45)“ …', () => {
    const l = clusterWerteLabels(arr(o.nach_groesse)); expect(Object.keys(l)).toEqual(['1', '2', '3']); expect(nm(l['1']!)).toBe('Cluster 1 (n = 45)'); expect(nm(l['2']!)).toBe('Cluster 2 (n = 38)'); expect(nm(l['3']!)).toBe('Cluster 3 (n = 35)');
  });
  it('Spaltenname: „Cluster“, sonst mit Zähler, nie ein vorhandener Name', () => {
    expect(clusterSpaltenName([])).toBe('Cluster'); expect(clusterSpaltenName(['a', 'b'])).toBe('Cluster'); const z2 = clusterSpaltenName(['Cluster']); expect(z2).not.toBe('Cluster'); expect(z2).toMatch(/^Cluster/);
    const z3 = clusterSpaltenName(['Cluster', z2]); expect([ 'Cluster', z2 ]).not.toContain(z3); expect(z3).toMatch(/^Cluster/); expect(clusterSpaltenName(['cluster']).toLowerCase()).not.toBe('cluster');
  });
  it('Rand: nGesamt kleiner als eine Zeilennummer wirft nicht', () => { expect(() => clusterSpalte([1, 2, 3], [1, 1, 2], 2)).not.toThrow(); expect(clusterSpalte([], [], 3)).toEqual([null, null, null]); });
});
