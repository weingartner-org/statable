/**
 * Die Clusteranalyse rechnen (Später, Welle S-E, S2): Ward (hclust, ward.D2) und k-Means (Hartigan-Wong, 25 Starts) laufen in R (engine/statable-zeitcluster.R, aufgerufen über
 * lib/rverfahren.svelte.ts), alles andere (z-Werte, Streuung, Silhouette, Nummerierung nach Größe, Profile, η²) in JavaScript (cluster.ts).
 * Die Lösung wird für jede Zahl der Gruppen von 2 bis 8 gerechnet, damit Ellbogen und Silhouette gezeigt werden können; die Person wählt k.
 */
import { clusterRechnen, rSpaltenVon, Fertig } from './rverfahren.svelte';
import { s } from './sitzung.svelte';
import { zStandardisieren, clusterNachGroesse, kleineGruppe, clusterSilhouette, clusterWss, clusterProfil, clusterAusreisser, clusterCodeSatz, clusterFehlerSatz, SILHOUETTE_MAX } from './cluster';
import { clusterDaten, clusterVorschlagVon, clusterProfilFuer, K_MIN, K_MAX, NSTART, STARTWERT, type ClusterE, type ClusterKErgebnis } from './clusterblatt';

const liste = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const zahl = (x: unknown): number => { const v = Array.isArray(x) ? x[0] : x; return typeof v === 'number' ? v : NaN; };

export interface ClusterOpt { verfahren: 'ward' | 'kmeans'; standardisiert: boolean; startwert?: number; k?: number }

/** Rechnet die Clusteranalyse für die gewählten Merkmale (Spaltennamen). Wirft `Fertig` mit einem fertigen Satz, wenn R etwas nicht rechnen kann. */
export async function clusterBerechnen(merkmale: string[], opt: ClusterOpt, quelle: { spalten: typeof s.spalten; zeilen: typeof s.zeilen } = s): Promise<ClusterE> {
  const dt = clusterDaten(merkmale, quelle), n = dt.zeilen.length, startwert = opt.startwert ?? STARTWERT;
  if (dt.roh.length < 2 || n < 4) throw new Fertig(clusterCodeSatz('zu-wenig-faelle', { n, k: K_MIN }));
  const kMax = Math.min(K_MAX, dt.verschiedene - 1, n - 1), ks = Array.from({ length: Math.max(0, kMax - K_MIN + 1) }, (_, i) => K_MIN + i);
  if (!ks.length) throw new Fertig(clusterCodeSatz('k-zu-gross', { n, k: K_MIN }));
  const matrix = opt.standardisiert ? zStandardisieren(dt.roh).z : dt.roh;
  const zeilen = dt.zeilen.map(r => quelle.zeilen[r - 1]!);
  const spalten = rSpaltenVon(dt.gerechnet, zeilen, quelle.spalten);   // nur die vollständigen Fälle gehen an R; die Namen in R sind v1, v2 …
  const auftraege = opt.verfahren === 'ward'
    ? [{ art: 'ward' as const, standardisiert: opt.standardisiert, ks }]
    : ks.map(k => ({ art: 'kmeans' as const, standardisiert: opt.standardisiert, k, nstart: NSTART, startwert }));
  const antworten = await clusterRechnen(spalten, auftraege);
  const roh: { k: number; zu: number[]; besteX: number | null; starts: number | null; rueckfall: boolean }[] = [];
  let ward: ClusterE['ward'];
  if (opt.verfahren === 'ward') {
    const a = antworten[0]!;
    if (a.fehler != null) throw new Fertig(clusterFehlerSatz(String(liste(a.fehler)[0])));
    const zu = liste<unknown>(a.zuordnung).map(v => liste<number>(v)), kk = liste<number>(a.ks);
    kk.forEach((k, i) => roh.push({ k, zu: zu[i]!, besteX: null, starts: null, rueckfall: false }));
    ward = { mergeA: liste<number>(a.merge_a), mergeB: liste<number>(a.merge_b), hoehe: liste<number>(a.hoehe), order: liste<number>(a.order) };
  } else {
    for (const [i, a] of antworten.entries()) {
      if (a.fehler != null) { const m = String(liste(a.fehler)[0]); if (/distinct|not distinct/.test(m)) continue; throw new Fertig(clusterFehlerSatz(m)); }
      roh.push({ k: ks[i]!, zu: liste<number>(a.zuordnung), besteX: zahl(a.beste_x), starts: zahl(a.starts), rueckfall: liste<boolean>(a.rueckfall)[0] === true });
    }
  }
  if (!roh.length) throw new Fertig(clusterCodeSatz('k-zu-gross', { n, k: K_MIN }));
  const rechneSil = n <= SILHOUETTE_MAX;
  const ergebnisse: ClusterKErgebnis[] = roh.map(r => {
    const zu = clusterNachGroesse(r.zu), sil = rechneSil ? clusterSilhouette(matrix, zu) : null;
    const groesse = Array.from({ length: r.k }, (_, j) => zu.filter(x => x === j + 1).length);
    return { k: r.k, zuordnung: zu, wss: clusterWss(matrix, zu), groesse, silhouette: sil ? sil.mittel : null, silhouetteJe: sil ? sil.je : null, besteX: r.besteX, starts: r.starts, rueckfall: r.rueckfall };
  });
  const vorschlag = clusterVorschlagVon(ergebnisse, n);
  // Voreinstellung: der Vorschlag (ohne Lösungen mit Ausreißer-Gruppe), sonst 3, sonst die erste Lösung ohne sehr kleine Gruppe; eine gewählte Zahl bleibt
  const ohneKlein = ergebnisse.filter(x => !kleineGruppe(x.groesse, n));
  const k = ergebnisse.some(x => x.k === opt.k) ? opt.k! : (vorschlag ?? ohneKlein.find(x => x.k === 3)?.k ?? ohneKlein[0]?.k ?? ergebnisse.find(x => x.k === 3)?.k ?? ergebnisse[0]!.k);
  const gewaehlt = ergebnisse.find(x => x.k === k)!;
  const e: ClusterE = {
    merkmale, gerechnet: dt.gerechnet, konstante: dt.konstante, verfahren: opt.verfahren, standardisiert: opt.standardisiert, startwert, nstart: NSTART,
    zeilen: dt.zeilen, zeilenGesamt: dt.zeilenGesamt, ausgelassen: dt.ausgelassen, n, k, ks: ergebnisse, vorschlag, ...(ward ? { ward } : {}),
    tss: clusterWss(matrix, Array(n).fill(1)), nAusreisser: clusterAusreisser(zStandardisieren(dt.roh).z).length, maxKorr: dt.maxKorr,
    profil: clusterProfil(dt.roh, gewaehlt.zuordnung)
  };
  return e;
}

/** Eine andere Zahl der Gruppen wählen: die Lösung liegt schon vor, nur das Profil rechnet sich neu. */
export function clusterMitK(e: ClusterE, k: number): ClusterE {
  if (!e.ks.some(x => x.k === k)) return e;
  return { ...e, k, profil: clusterProfilFuer(e, k) };
}
