/**
 * V5 Teil 3: k-nächste Nachbarn mit eigenen Daten, als Block unter der Karte „Lässt sich etwas vorhersagen?“ (neben dem Entscheidungsbaum).
 * Rechenregeln wie im Lernlabor (docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md, Abschnitt 5 und 10): 70 % Training, 5-fache Kreuzvalidierung im Training,
 * Standardisieren mit Kennzahlen nur aus dem Training, k = kleinste Fehlerrate der Kreuzvalidierung (bei Gleichstand das größere k). Rechenkern: lib/ml.ts.
 *
 * R-Skript (Regel aus B1): Die Aufteilung zieht Statable mit seinem eigenen Zufallsgenerator; R könnte sie nicht nachziehen. Darum stehen Teil (training/test)
 * und Falte als zwei Spalten in der CSV, und das Skript rechnet mit derselben Aufteilung in Basis-R nach (eigene kNN-Funktion mit derselben Gleichstand-Regel;
 * class::knn entscheidet Gleichstände zufällig). Sicherheit wie lib/rskript.ts: Spaltennamen und Werte nur über rAnzeigeText / rAnzeigeZahl, Kommentare über kom.
 * FESTE OBJEKTNAMEN im Skript (Gegenprobe knnblock.test.ts): `y`, `X`, `tr`, `te`, `ks`, `fehler` (data.frame k, training, kreuzvalidierung, test), `bestes_k`,
 * `konfusion` (Matrix wahr × vorhergesagt), `trefferquote`, `richtig_erkannt`, `raten`.
 */
import { L } from './sitzung.svelte';
import { istFehlend } from './fehlend';
import { strom } from './lernlabor';
import { faltenEinteilung, konfusion, mlRechne, teile, type MlErgebnis } from './ml';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';

export const KNN_ANTEIL = 0.7;
export const KNN_FALTEN = 5;
export const KNN_MIN = 30;
export const KNN_MAX = 5000;

export interface KnnDaten {
  X: number[][]; y: number[];
  /** Anzeigenamen der Klassen (Wertebeschriftung oder Wert), Reihenfolge = Klassennummer. */
  klassen: string[];
  /** Die Werte der Klassen in der Datei (Code oder Text), gleiche Reihenfolge. */
  klassenWerte: (string | number)[];
  /** Zeilen der Datei, die eingehen (vollständige Fälle). */
  zeilen: number[];
  weg: number;
}
export type KnnFehler = { fehler: 'eine-klasse' | 'zu-viele-klassen' | 'zu-wenig-faelle' | 'zu-viele-faelle' | 'keine-merkmale' };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));

/** Vollständige Fälle für Ziel (2 bis 8 Gruppen) und Zahlen-Merkmale; Klassen wie Statable sortiert (Zahlen aufsteigend, Text nach dem Alphabet). */
export function knnDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], ziel: string, merkmale: string[]): KnnDaten | KnnFehler {
  const sz = spalten.find(c => c.name === ziel), sm = merkmale.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c && c.art === 'zahl');
  if (!sz || !sm.length) return { fehler: 'keine-merkmale' };
  const iz = spalten.indexOf(sz), im = sm.map(c => spalten.indexOf(c));
  const nimm: number[] = []; let weg = 0;
  zeilen.forEach((z, r) => { if (leer(sz, z[iz]) || sm.some((c, k) => leer(c, z[im[k]!]))) weg++; else nimm.push(r); });
  const werte = [...new Set(nimm.map(r => zeilen[r]![iz]!))];
  werte.sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
  if (werte.length < 2) return { fehler: 'eine-klasse' };
  if (werte.length > 8) return { fehler: 'zu-viele-klassen' };
  if (nimm.length < KNN_MIN) return { fehler: 'zu-wenig-faelle' };
  if (nimm.length > KNN_MAX) return { fehler: 'zu-viele-faelle' };
  const nr = new Map(werte.map((w, i) => [w, i]));
  return {
    X: nimm.map(r => im.map(i => zeilen[r]![i] as number)),
    y: nimm.map(r => nr.get(zeilen[r]![iz]!)!),
    klassen: werte.map(w => (typeof w === 'number' ? (sz.werteLabels[String(w)] ?? String(w)) : w)),
    klassenWerte: werte, zeilen: nimm, weg
  };
}

export interface KnnErgebnis {
  training: number[]; test: number[]; falte: number[];
  erg: MlErgebnis;
  /** Stelle des gewählten k (= bestes k aus der Kreuzvalidierung) in erg.ks. */
  j: number;
  konf: number[][];
  trefferquote: number;
  /** Je Klasse: Anteil der Testfälle dieser Klasse, die richtig erkannt werden (Sensitivität dieser Klasse); NaN ohne Testfall. */
  richtig: number[];
  /** Trefferquote beim Raten der im Training häufigsten Klasse (auf den Testdaten). */
  raten: number; ratenKlasse: number;
}

/** Ganze Rechnung mit festem Startwert: Aufteilung (Strom 0), Falten (Strom 1), alle k, k aus der Kreuzvalidierung. */
export function knnRechne(d: KnnDaten, startwert: number, standardisieren: boolean): KnnErgebnis {
  const t = teile(d.X.length, KNN_ANTEIL, strom(startwert, 0));
  const falte = faltenEinteilung(t.training.length, KNN_FALTEN, strom(startwert, 1));
  const erg = mlRechne({ X: d.X, y: d.y, nKlassen: d.klassen.length, training: t.training, test: t.test, falte, K: KNN_FALTEN, standardisieren });
  const j = erg.ks.indexOf(erg.bestesK), yTest = t.test.map(i => d.y[i]!);
  const konf = konfusion(yTest, erg.vorhersageTest[j]!, d.klassen.length);
  const diag = konf.reduce((s, z, i) => s + z[i]!, 0);
  const haeufig = new Array<number>(d.klassen.length).fill(0); t.training.forEach(i => haeufig[d.y[i]!]!++);
  const ratenKlasse = haeufig.indexOf(Math.max(...haeufig));
  return {
    training: t.training, test: t.test, falte, erg, j, konf,
    trefferquote: yTest.length ? diag / yTest.length : NaN,
    richtig: konf.map((z, i) => { const n = z.reduce((a, b) => a + b, 0); return n ? z[i]! / n : NaN; }),
    raten: yTest.length ? yTest.filter(v => v === ratenKlasse).length / yTest.length : NaN, ratenKlasse
  };
}

/* ------------------------------------------------------------------ R-Skript */

const zz = (v: number, d = 4) => (Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');
const freierName = (spalten: RSpalte[], basis: string) => { let n = basis, i = 2; while (spalten.some(c => c.name === n)) n = `${basis}_${i++}`; return n; };

/** Skript und CSV zum Block. Die CSV hält Ziel, Merkmale und zwei Spalten mit Teil und Falte (leer bei Fällen mit Lücken). */
export function baueKnnSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; ziel: string; merkmale: string[]; d: KnnDaten; r: KnnErgebnis; standardisieren: boolean; startwert: number; titel: string; datum: string }): RSkript {
  const sz = o.spalten.find(c => c.name === o.ziel)!, sm = o.merkmale.map(n => o.spalten.find(c => c.name === n)!).filter(c => c.art === 'zahl');
  const nTeil = freierName(o.spalten, 'statable_teil'), nFalte = freierName([...o.spalten, { name: nTeil } as RSpalte], 'statable_falte');
  const spTeil: RSpalte = { name: nTeil, bezeichnung: '', art: 'text', werteLabels: {}, fehlend: [] };
  const spFalte: RSpalte = { name: nFalte, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] };
  const teil = new Map<number, string>(), falte = new Map<number, number>();
  o.r.training.forEach((i, q) => { teil.set(o.d.zeilen[i]!, 'training'); falte.set(o.d.zeilen[i]!, o.r.falte[q]! + 1); });
  o.r.test.forEach(i => teil.set(o.d.zeilen[i]!, 'test'));
  const benutzt = [sz, ...sm], ix = benutzt.map(c => o.spalten.indexOf(c));
  const zeilen = o.zeilen.map((z, r) => [...ix.map(i => z[i] ?? null), teil.get(r) ?? null, falte.get(r) ?? null]);
  const csv = datenCsv({ spalten: [...benutzt, spTeil, spFalte], zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, [...benutzt, spTeil, spFalte]);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText;
  const texte = [sz, spTeil].filter(c => c.art === 'text');
  const e = o.r.erg, k = e.bestesK;
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('k-nächste Nachbarn (k-nearest neighbours, kNN) mit Trainings- und Testdaten und 5-facher Kreuzvalidierung. Nur Basis-R.', 'k-nearest neighbours (kNN) with training and test data and 5-fold cross-validation. Base R only.')}`,
    `# ${L(`Statable hat die Fälle mit dem Startwert ${o.startwert} aufgeteilt. Teil und Falte stehen in der CSV (Spalten ${kom(nTeil)} und ${kom(nFalte)}), damit R mit derselben Aufteilung rechnet.`, `Statable split the cases with the seed ${o.startwert}. Part and fold are in the CSV (columns ${kom(nTeil)} and ${kom(nFalte)}), so that R calculates with the same split.`)}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to the folder in R with setwd() (in RStudio: Session > Set Working Directory > To Source File Location), then source() with the name of this file.')}`,
    '',
    `# ${L('Daten lesen (fehlende Werte als leere Zelle)', 'Read the data (missing values as an empty cell)')}`,
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = ""${texte.length ? `, colClasses = c(${texte.map(c => `${q(c.name)} = "character"`).join(', ')})` : ''})`,
    `teil <- daten[[${q(nTeil)}]]; falte_alle <- daten[[${q(nFalte)}]]`,
    `# ${L('Ziel: Klassen in der Reihenfolge von Statable (zählt beim Gleichstand der Stimmen)', 'Target: classes in the order used by Statable (matters when the votes are tied)')}`,
    `y <- factor(match(daten[[${q(sz.name)}]], c(${o.d.klassenWerte.map(w => (typeof w === 'number' ? rAnzeigeZahl(w) : q(w))).join(', ')})), levels = ${o.d.klassen.length > 0 ? `1:${o.d.klassen.length}` : '1'})`,
    `levels(y) <- c(${o.d.klassen.map(t => q(t)).join(', ')})`,
    `X <- as.matrix(daten[, c(${sm.map(c => q(c.name)).join(', ')}), drop = FALSE])`,
    'tr <- which(teil == "training"); te <- which(teil == "test")',
    'falte <- falte_alle[tr]',
    '',
    `# ${L('kNN wie Statable: die k nächsten Trainingsfälle (quadrierter Abstand), gleich weit wie der k-te zählt mit; Stimmengleichstand: Klasse mit dem nächsten Nachbarn, dann die erste Klasse.', 'kNN as in Statable: the k nearest training cases (squared distance), cases as far as the k-th count too; tied votes: class with the nearest neighbour, then the first class.')}`,
    'knn_statable <- function(trx, tex, cl, k) {',
    '  lv <- levels(cl); aus <- integer(nrow(tex))',
    '  for (i in seq_len(nrow(tex))) {',
    '    dd <- colSums((t(trx) - tex[i, ])^2)',
    '    grenze <- sort(dd)[min(k, length(dd))]',
    '    nimm <- which(dd <= grenze * (1 + 1e-4))',
    '    st <- tabulate(as.integer(cl[nimm]), nbins = length(lv))',
    '    beste <- which(st == max(st))',
    '    if (length(beste) > 1) {',
    '      naechst <- sapply(beste, function(b) min(dd[nimm][as.integer(cl[nimm]) == b]))',
    '      beste <- beste[naechst <= min(naechst) * (1 + 1e-4)][1]',
    '    }',
    '    aus[i] <- beste',
    '  }',
    '  factor(lv[aus], levels = lv)',
    '}',
    `# ${o.standardisieren ? L('Standardisieren mit Mittelwert und Standardabweichung NUR aus den Trainingsdaten (sonst sickert Wissen über die Testdaten ein).', 'Standardise with mean and standard deviation from the training data ONLY (otherwise knowledge about the test data leaks in).') : L('Ohne Standardisieren (wie in Statable gewählt).', 'Without standardising (as chosen in Statable).')}`,
    `standardisieren <- ${o.standardisieren ? 'TRUE' : 'FALSE'}`,
    'skaliere <- function(a, b) {',
    '  if (!standardisieren) return(list(a = a, b = b))',
    '  m <- colMeans(a); s <- apply(a, 2, sd); s[!is.finite(s) | s == 0] <- 1',
    '  list(a = sweep(sweep(a, 2, m), 2, s, "/"), b = sweep(sweep(b, 2, m), 2, s, "/"))',
    '}',
    '',
    `# ${L('Rechnung: Fehlerrate für jedes k auf Training, in der Kreuzvalidierung (nur im Training, je Falte neu standardisiert) und auf den Testdaten', 'Calculation: error rate for each k on training, in cross-validation (training only, standardised anew in each fold) and on the test data')}`,
    `ks <- c(${e.ks.join(', ')})`,
    's_tt <- skaliere(X[tr, , drop = FALSE], X[te, , drop = FALSE]); s_tr <- skaliere(X[tr, , drop = FALSE], X[tr, , drop = FALSE])',
    'fehler <- data.frame(k = ks, training = NA_real_, kreuzvalidierung = NA_real_, test = NA_real_)',
    'for (j in seq_along(ks)) {',
    '  k <- ks[j]',
    '  fehler$training[j] <- mean(knn_statable(s_tr$a, s_tr$b, y[tr], k) != y[tr])',
    '  fehler$test[j] <- mean(knn_statable(s_tt$a, s_tt$b, y[tr], k) != y[te])',
    '  falsch <- 0',
    `  for (f in seq_len(${KNN_FALTEN})) {`,
    '    a <- tr[falte != f]; b <- tr[falte == f]',
    '    s_f <- skaliere(X[a, , drop = FALSE], X[b, , drop = FALSE])',
    '    falsch <- falsch + sum(knn_statable(s_f$a, s_f$b, y[a], k) != y[b])',
    '  }',
    '  fehler$kreuzvalidierung[j] <- falsch / length(tr)',
    '}',
    `# ${L('Bestes k: kleinste Fehlerrate der Kreuzvalidierung, bei Gleichstand das größere k (einfacheres Modell)', 'Best k: smallest cross-validation error rate, if tied the larger k (simpler model)')}`,
    'bestes_k <- max(fehler$k[abs(fehler$kreuzvalidierung - min(fehler$kreuzvalidierung)) < 1e-12])',
    'vorhersage <- knn_statable(s_tt$a, s_tt$b, y[tr], bestes_k)',
    'konfusion <- table(wahr = y[te], vorhergesagt = vorhersage)',
    'trefferquote <- sum(diag(konfusion)) / length(te)',
    'richtig_erkannt <- diag(konfusion) / rowSums(konfusion)',
    'raten <- mean(y[te] == names(which.max(table(y[tr]))))',
    'print(fehler); print(konfusion)',
    '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`,
    `# ${kom(L(`Fälle: ${o.r.training.length} Training, ${o.r.test.length} Test; bestes k = ${k}`, `Cases: ${o.r.training.length} training, ${o.r.test.length} test; best k = ${k}`))}`,
    `# ${kom(L(`Fehlerrate bei k = ${k}: Training ${zz(e.fehlerTraining[o.r.j]!)}, Kreuzvalidierung ${zz(e.fehlerCV[o.r.j]!)}, Test ${zz(e.fehlerTest[o.r.j]!)}`, `Error rate at k = ${k}: training ${zz(e.fehlerTraining[o.r.j]!)}, cross-validation ${zz(e.fehlerCV[o.r.j]!)}, test ${zz(e.fehlerTest[o.r.j]!)}`))}`,
    `# ${kom(L(`Trefferquote Test ${zz(o.r.trefferquote)}, Raten der häufigsten Klasse ${zz(o.r.raten)}`, `Test accuracy ${zz(o.r.trefferquote)}, guessing the most frequent class ${zz(o.r.raten)}`))}`,
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
