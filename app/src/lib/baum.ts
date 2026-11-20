/**
 * Entscheidungsbaum für eine Gruppenzugehörigkeit (CART, Warteliste, 23.10.2026). Eigener Code, im Browser; gleiche Regeln wie R `rpart(…, method = "class")` mit den Voreinstellungen.
 *   Teilung: größte Gini-Verbesserung (Häufigkeiten als Vorannahmen); Zahlen am Mittelpunkt zwischen zwei Werten, Kategorien als Zweiteilung aller Stufen.
 *   Wachsen: mindestens `minSplit` (20) Fälle zum Teilen, mindestens `minBucket` (7) je Teil; dann Zurückschneiden nach Kosten und Komplexität (Schwelle cp = 0,01 des Fehlers der Wurzel).
 * Sollwerte: R `rpart` (Blätter und vorhergesagte Klasse je Fall), siehe baum.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Voreinstellungen (minSplit 20, minBucket 7, cp 0,01), Lesehinweise (Bäume sind instabil, Prüfdaten entscheiden).
 */

export type Merkmal = { name: string; art: 'zahl' | 'kategorie'; werte: (number | string)[] };
export interface BaumKnoten {
  n: number; zaehl: number[]; klasse: number; fehler: number;
  /** Teilung (fehlt im Blatt): Zahl `< schwelle` geht nach links; Kategorie: `links` hält die Stufen links */
  teilung?: { merkmal: number; schwelle?: number; links?: string[]; verbesserung: number };
  links?: BaumKnoten; rechts?: BaumKnoten;
}
export interface BaumOptionen { minSplit?: number; minBucket?: number; cp?: number; maxTiefe?: number }
export interface BaumErgebnis { wurzel: BaumKnoten; klassen: string[]; merkmale: string[]; blaetter: number; tiefe: number }
export type BaumFehler = { fehler: 'zu-wenig-faelle' | 'eine-klasse' | 'zu-viele-klassen' | 'kein-merkmal' | 'werte' };

const gini = (z: number[], n: number) => (n === 0 ? 0 : 1 - z.reduce((a, c) => a + (c / n) ** 2, 0));

function knoten(idx: number[], y: number[], K: number): BaumKnoten {
  const zaehl = new Array<number>(K).fill(0);
  for (const i of idx) zaehl[y[i]!]!++;
  let klasse = 0; for (let k = 1; k < K; k++) if (zaehl[k]! > zaehl[klasse]!) klasse = k;
  return { n: idx.length, zaehl, klasse, fehler: idx.length - zaehl[klasse]! };
}

/** Bester Schnitt eines Knotens: größte Gini-Verbesserung n·G − n_l·G_l − n_r·G_r über alle Merkmale. */
function besterSchnitt(idx: number[], y: number[], K: number, m: Merkmal[], minBucket: number) {
  const n = idx.length, gesamt = new Array<number>(K).fill(0);
  for (const i of idx) gesamt[y[i]!]!++;
  const g0 = n * gini(gesamt, n);
  type Schnitt = { merkmal: number; schwelle?: number; links?: string[]; verbesserung: number; linksIdx: number[]; rechtsIdx: number[] };
  const bestHalter: { best: Schnitt | null } = { best: null };
  const prüfe = (verb: number, merkmal: number, links: number[], rechts: number[], extra: { schwelle?: number; links?: string[] }) => {
    const b = bestHalter.best;
    if (verb > 1e-12 && (!b || verb > b.verbesserung + 1e-12)) bestHalter.best = { merkmal, verbesserung: verb, linksIdx: links, rechtsIdx: rechts, ...extra };
  };
  m.forEach((mm, j) => {
    if (mm.art === 'zahl') {
      const o = idx.slice().sort((a, b) => (mm.werte[a] as number) - (mm.werte[b] as number));
      const zl = new Array<number>(K).fill(0), zr = gesamt.slice();
      for (let t = 0; t < n - 1; t++) {
        const k = y[o[t]!]!; zl[k]!++; zr[k]!--;
        const v1 = mm.werte[o[t]!] as number, v2 = mm.werte[o[t + 1]!] as number;
        if (v1 === v2) continue;
        const nl = t + 1, nr = n - nl;
        if (nl < minBucket || nr < minBucket) continue;
        prüfe(g0 - nl * gini(zl, nl) - nr * gini(zr, nr), j, o.slice(0, nl), o.slice(nl), { schwelle: (v1 + v2) / 2 });
      }
    } else {
      const stufen = [...new Set(idx.map(i => String(mm.werte[i])))].sort();
      if (stufen.length < 2 || stufen.length > 10) return;
      const L = stufen.length - 1;  // die letzte Stufe bleibt immer rechts: jede Zweiteilung einmal
      for (let mask = 1; mask < 1 << L; mask++) {
        const links = stufen.filter((_, s) => s < L && (mask >> s) & 1), sl = new Set(links);
        const li = idx.filter(i => sl.has(String(mm.werte[i]))), ri = idx.filter(i => !sl.has(String(mm.werte[i])));
        if (li.length < minBucket || ri.length < minBucket) continue;
        const zl = new Array<number>(K).fill(0), zr = new Array<number>(K).fill(0);
        for (const i of li) zl[y[i]!]!++; for (const i of ri) zr[y[i]!]!++;
        prüfe(g0 - li.length * gini(zl, li.length) - ri.length * gini(zr, ri.length), j, li, ri, { links });
      }
    }
  });
  return bestHalter.best;
}

function wachsen(idx: number[], y: number[], K: number, m: Merkmal[], o: Required<BaumOptionen>, tiefe: number): BaumKnoten {
  const k = knoten(idx, y, K);
  if (idx.length < o.minSplit || k.fehler === 0 || tiefe >= o.maxTiefe) return k;
  const b = besterSchnitt(idx, y, K, m, o.minBucket);
  if (!b) return k;
  k.teilung = { merkmal: b.merkmal, schwelle: b.schwelle, links: b.links, verbesserung: b.verbesserung };
  k.links = wachsen(b.linksIdx, y, K, m, o, tiefe + 1);
  k.rechts = wachsen(b.rechtsIdx, y, K, m, o, tiefe + 1);
  return k;
}

const blattFehler = (k: BaumKnoten): number => (k.links && k.rechts ? blattFehler(k.links) + blattFehler(k.rechts) : k.fehler);
const blattZahl = (k: BaumKnoten): number => (k.links && k.rechts ? blattZahl(k.links) + blattZahl(k.rechts) : 1);
const tiefeVon = (k: BaumKnoten): number => (k.links && k.rechts ? 1 + Math.max(tiefeVon(k.links), tiefeVon(k.rechts)) : 0);

/** Kosten-Komplexitäts-Zurückschneiden: Teilbäume, deren Fehlerrückgang je zusätzlichem Blatt höchstens `alpha` beträgt, werden zu einem Blatt (schwächstes Glied zuerst). */
function schneiden(wurzel: BaumKnoten, alpha: number) {
  for (;;) {
    let schwach: BaumKnoten | null = null, gMin = Infinity;
    const lauf = (k: BaumKnoten) => {
      if (!k.links || !k.rechts) return;
      lauf(k.links); lauf(k.rechts);
      const g = (k.fehler - blattFehler(k)) / (blattZahl(k) - 1);
      if (g < gMin - 1e-12) { gMin = g; schwach = k; }
    };
    lauf(wurzel);
    if (!schwach || gMin > alpha + 1e-12) return;
    const s = schwach as BaumKnoten; delete s.links; delete s.rechts; delete s.teilung;
  }
}

export function baum(klasse: string[], merkmale: Merkmal[], opt: BaumOptionen = {}): BaumErgebnis | BaumFehler {
  const o = { minSplit: 20, minBucket: 7, cp: 0.01, maxTiefe: 30, ...opt };
  const n = klasse.length;
  if (!merkmale.length) return { fehler: 'kein-merkmal' };
  if (merkmale.some(mm => mm.werte.length !== n || (mm.art === 'zahl' && mm.werte.some(v => typeof v !== 'number' || !Number.isFinite(v))))) return { fehler: 'werte' };
  const klassen = [...new Set(klasse)].sort();
  if (klassen.length < 2) return { fehler: 'eine-klasse' };
  if (klassen.length > 8) return { fehler: 'zu-viele-klassen' };
  if (n < 2 * o.minBucket) return { fehler: 'zu-wenig-faelle' };
  const y = klasse.map(k => klassen.indexOf(k)), idx = Array.from({ length: n }, (_, i) => i);
  const wurzel = wachsen(idx, y, klassen.length, merkmale, o, 0);
  schneiden(wurzel, o.cp * wurzel.fehler);
  return { wurzel, klassen, merkmale: merkmale.map(mm => mm.name), blaetter: blattZahl(wurzel), tiefe: tiefeVon(wurzel) };
}

/** Vorhergesagte Klasse (Index) und Blatt für einen Fall; `werte[j]` gehört zum Merkmal j. */
export function vorhersage(b: BaumErgebnis, merkmale: Merkmal[], i: number): { klasse: number; blatt: BaumKnoten } {
  let k = b.wurzel;
  while (k.teilung && k.links && k.rechts) {
    const t = k.teilung, v = merkmale[t.merkmal]!.werte[i]!;
    const links = t.schwelle !== undefined ? (v as number) < t.schwelle : t.links!.includes(String(v));
    k = links ? k.links : k.rechts;
  }
  return { klasse: k.klasse, blatt: k };
}

/* ---------- Regressionsbaum (Zahl als Ziel), wie R `rpart(…, method = "anova")` ---------- */
export interface RegKnoten {
  n: number; mittel: number; sse: number;
  teilung?: { merkmal: number; schwelle?: number; links?: string[]; verbesserung: number };
  links?: RegKnoten; rechts?: RegKnoten;
}
export interface RegBaumErgebnis { wurzel: RegKnoten; merkmale: string[]; blaetter: number; tiefe: number }

function regKnoten(idx: number[], y: number[]): RegKnoten {
  const n = idx.length, m = idx.reduce((a, i) => a + y[i]!, 0) / n;
  return { n, mittel: m, sse: idx.reduce((a, i) => a + (y[i]! - m) ** 2, 0) };
}

function regSchnitt(idx: number[], y: number[], m: Merkmal[], minBucket: number) {
  const n = idx.length, s0 = idx.reduce((a, i) => a + y[i]!, 0), q0 = idx.reduce((a, i) => a + y[i]! * y[i]!, 0), sse0 = q0 - s0 * s0 / n;
  type Schnitt = { merkmal: number; schwelle?: number; links?: string[]; verbesserung: number; linksIdx: number[]; rechtsIdx: number[] };
  const halter: { best: Schnitt | null } = { best: null };
  const prüfe = (verb: number, merkmal: number, links: number[], rechts: number[], extra: { schwelle?: number; links?: string[] }) => {
    const b = halter.best;
    if (verb > 1e-12 && (!b || verb > b.verbesserung + 1e-12)) halter.best = { merkmal, verbesserung: verb, linksIdx: links, rechtsIdx: rechts, ...extra };
  };
  const sseVon = (s: number, q: number, k: number) => q - s * s / k;
  m.forEach((mm, j) => {
    if (mm.art === 'zahl') {
      const o = idx.slice().sort((a, b) => (mm.werte[a] as number) - (mm.werte[b] as number));
      let sl = 0, ql = 0;
      for (let t = 0; t < n - 1; t++) {
        const v = y[o[t]!]!; sl += v; ql += v * v;
        const v1 = mm.werte[o[t]!] as number, v2 = mm.werte[o[t + 1]!] as number;
        if (v1 === v2) continue;
        const nl = t + 1, nr = n - nl;
        if (nl < minBucket || nr < minBucket) continue;
        prüfe(sse0 - sseVon(sl, ql, nl) - sseVon(s0 - sl, q0 - ql, nr), j, o.slice(0, nl), o.slice(nl), { schwelle: (v1 + v2) / 2 });
      }
    } else {
      // Stufen nach ihrem Mittelwert ordnen: die beste Zweiteilung liegt dann an einer Stelle der Reihenfolge (wie rpart)
      const stufen = [...new Set(idx.map(i => String(mm.werte[i])))];
      if (stufen.length < 2) return;
      const mw = new Map(stufen.map(s => { const ix = idx.filter(i => String(mm.werte[i]) === s); return [s, ix.reduce((a, i) => a + y[i]!, 0) / ix.length] as const; }));
      const ord = stufen.slice().sort((a, b) => mw.get(a)! - mw.get(b)! || a.localeCompare(b));
      for (let c = 1; c < ord.length; c++) {
        const links = ord.slice(0, c), sl = new Set(links);
        const li = idx.filter(i => sl.has(String(mm.werte[i]))), ri = idx.filter(i => !sl.has(String(mm.werte[i])));
        if (li.length < minBucket || ri.length < minBucket) continue;
        const a = li.reduce((s, i) => s + y[i]!, 0), aq = li.reduce((s, i) => s + y[i]! * y[i]!, 0);
        prüfe(sse0 - sseVon(a, aq, li.length) - sseVon(s0 - a, q0 - aq, ri.length), j, li, ri, { links: links.slice().sort() });
      }
    }
  });
  return halter.best;
}

function regWachsen(idx: number[], y: number[], m: Merkmal[], o: Required<BaumOptionen>, tiefe: number): RegKnoten {
  const k = regKnoten(idx, y);
  if (idx.length < o.minSplit || k.sse <= 1e-12 || tiefe >= o.maxTiefe) return k;
  const b = regSchnitt(idx, y, m, o.minBucket);
  if (!b) return k;
  k.teilung = { merkmal: b.merkmal, schwelle: b.schwelle, links: b.links, verbesserung: b.verbesserung };
  k.links = regWachsen(b.linksIdx, y, m, o, tiefe + 1);
  k.rechts = regWachsen(b.rechtsIdx, y, m, o, tiefe + 1);
  return k;
}

const regBlattSse = (k: RegKnoten): number => (k.links && k.rechts ? regBlattSse(k.links) + regBlattSse(k.rechts) : k.sse);
const regBlattZahl = (k: RegKnoten): number => (k.links && k.rechts ? regBlattZahl(k.links) + regBlattZahl(k.rechts) : 1);
const regTiefe = (k: RegKnoten): number => (k.links && k.rechts ? 1 + Math.max(regTiefe(k.links), regTiefe(k.rechts)) : 0);

function regSchneiden(wurzel: RegKnoten, alpha: number) {
  for (;;) {
    let schwach: RegKnoten | null = null, gMin = Infinity;
    const lauf = (k: RegKnoten) => {
      if (!k.links || !k.rechts) return;
      lauf(k.links); lauf(k.rechts);
      const g = (k.sse - regBlattSse(k)) / (regBlattZahl(k) - 1);
      if (g < gMin - 1e-12) { gMin = g; schwach = k; }
    };
    lauf(wurzel);
    if (!schwach || gMin > alpha + 1e-12) return;
    const s = schwach as RegKnoten; delete s.links; delete s.rechts; delete s.teilung;
  }
}

/** Regressionsbaum für eine Zahl als Ziel; Teilung nach größter Abnahme der Summe der quadrierten Abweichungen, Blatt = Mittelwert. */
export function regressionsbaum(y: number[], merkmale: Merkmal[], opt: BaumOptionen = {}): RegBaumErgebnis | BaumFehler {
  const o = { minSplit: 20, minBucket: 7, cp: 0.01, maxTiefe: 30, ...opt };
  const n = y.length;
  if (!merkmale.length) return { fehler: 'kein-merkmal' };
  if (y.some(v => !Number.isFinite(v)) || merkmale.some(mm => mm.werte.length !== n || (mm.art === 'zahl' && mm.werte.some(v => typeof v !== 'number' || !Number.isFinite(v))))) return { fehler: 'werte' };
  if (n < 2 * o.minBucket) return { fehler: 'zu-wenig-faelle' };
  const idx = Array.from({ length: n }, (_, i) => i), wurzel = regWachsen(idx, y, merkmale, o, 0);
  regSchneiden(wurzel, o.cp * wurzel.sse);
  return { wurzel, merkmale: merkmale.map(mm => mm.name), blaetter: regBlattZahl(wurzel), tiefe: regTiefe(wurzel) };
}

/** Vorhergesagter Mittelwert und Blatt für Fall `i`. */
export function regVorhersage(b: RegBaumErgebnis, merkmale: Merkmal[], i: number): { wert: number; blatt: RegKnoten } {
  let k = b.wurzel;
  while (k.teilung && k.links && k.rechts) {
    const t = k.teilung, v = merkmale[t.merkmal]!.werte[i]!;
    k = (t.schwelle !== undefined ? (v as number) < t.schwelle : t.links!.includes(String(v))) ? k.links : k.rechts;
  }
  return { wert: k.mittel, blatt: k };
}

/**
 * Wichtigkeit der Merkmale im fertigen Baum: Summe der Verbesserungen (Gini bzw. Quadratsumme) aller Teilungen, die ein Merkmal im Baum vornimmt, als Anteil an der Gesamtsumme.
 * Anders als `rpart` (variable.importance) zählen hier nur die tatsächlich gewählten Teilungen, keine Ersatz- und Konkurrenzteilungen; Merkmale ohne Teilung haben 0.
 * Ein Maß für diesen einen Baum, nicht für das Merkmal an sich; Bäume sind instabil.
 */
export function wichtigkeit(wurzel: { links?: unknown; rechts?: unknown; teilung?: { merkmal: number; verbesserung: number } }, anzahl: number): number[] {
  const s = new Array<number>(anzahl).fill(0);
  const gehe = (k: { links?: unknown; rechts?: unknown; teilung?: { merkmal: number; verbesserung: number } } | undefined) => {
    if (!k || !k.links || !k.rechts || !k.teilung) return;
    s[k.teilung.merkmal]! += k.teilung.verbesserung;
    gehe(k.links as typeof k); gehe(k.rechts as typeof k);
  };
  gehe(wurzel);
  const g = s.reduce((a, v) => a + v, 0);
  return g > 0 ? s.map(v => v / g) : s;
}
