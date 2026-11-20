/**
 * Kreuzkorrelation zweier Zeitreihen (Später S-F2, Teil C.2; Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt C.2 und „Entscheidungen Opus (19.10.)“ 8).
 * Statable-Richtung: r(k) = Korrelation der ERSTEN Reihe zur Zeit t mit der ZWEITEN Reihe zur Zeit t + k. Positives k heißt: die erste Reihe liegt vorn.
 * R (`stats::ccf`) zählt umgekehrt: r_Statable(k) = r_R(−k). Nenner n wie in R; Lücken wie R mit na.action = na.pass (Summe der Paare / (Paare + |k|)).
 * Kein Vorweißen (Opus 8); bei starker Eigenabhängigkeit gibt es einen Hinweis. Sollwerte: scripts/spaeter-f2-erwartet.R; Tests: zeitreihe-ccf.test.ts.
 */
import { L, Lp } from './sitzung.svelte';
import { komma, ohneNull } from './ergebnis';

const QNORM_975 = 1.959963984540054;
const gut = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export interface CcfErgebnis { n: number; lags: number[]; r: (number | null)[]; grenze: number; luecken: number; paare: number[] }

/** Kreuzkorrelation für die Verzögerungen −lagMax … lagMax (aufsteigend). `lagMax` wird auf 1 … n − 1 begrenzt. */
export function zeitCcf(x: (number | null)[], y: (number | null)[], lagMax: number): CcfErgebnis {
  const n = Math.min(x.length, y.length);
  const lm = Math.max(1, Math.min(Math.floor(Number.isFinite(lagMax) ? lagMax : 1), n - 1));
  const xs = Array.from({ length: n }, (_, i) => (gut(x[i]) ? x[i]! : null)), ys = Array.from({ length: n }, (_, i) => (gut(y[i]) ? y[i]! : null));
  const nx = xs.filter(v => v !== null).length, ny = ys.filter(v => v !== null).length;
  const mx = nx ? xs.reduce<number>((s, v) => s + (v ?? 0), 0) / nx : 0, my = ny ? ys.reduce<number>((s, v) => s + (v ?? 0), 0) / ny : 0;
  const zx = xs.map(v => (v === null ? null : v - mx)), zy = ys.map(v => (v === null ? null : v - my));
  const vx = nx ? zx.reduce<number>((s, v) => s + (v === null ? 0 : v * v), 0) / nx : 0, vy = ny ? zy.reduce<number>((s, v) => s + (v === null ? 0 : v * v), 0) / ny : 0;
  const nenner = Math.sqrt(vx * vy);
  const luecken = xs.reduce<number>((s, v, i) => s + (v === null || ys[i] === null ? 1 : 0), 0);
  const lags: number[] = [], r: (number | null)[] = [], paare: number[] = [];
  for (let k = -lm; k <= lm; k++) {
    // k ≥ 0: Paare (x_t, y_{t+k}); k < 0: Paare (x_{t+|k|}, y_t)
    let summe = 0, p = 0;
    const a = Math.abs(k);
    for (let t = 0; t + a < n; t++) {
      const u = k >= 0 ? zx[t] : zx[t + a], w = k >= 0 ? zy[t + a] : zy[t];
      if (u !== null && u !== undefined && w !== null && w !== undefined) { p++; summe += u * w; }
    }
    lags.push(k); paare.push(p);
    r.push(p > 0 && nenner > 0 ? summe / (p + a) / nenner : null);
  }
  return { n, lags, r, grenze: QNORM_975 / Math.sqrt(n), luecken, paare };
}

export type CcfCode = 'laenge' | 'zu-kurz' | 'luecken' | 'konstant';
/** Prüfung vor dem Rechnen. Reihenfolge: Länge, zu kurz (unter 10 Plätzen), konstant, Lücken (über 10 % in einer der beiden). */
export function ccfKann(x: (number | null)[], y: (number | null)[]): { ok: true } | { ok: false; code: CcfCode } {
  if (x.length !== y.length) return { ok: false, code: 'laenge' };
  const n = x.length;
  if (n < 10) return { ok: false, code: 'zu-kurz' };
  const werte = (a: (number | null)[]) => a.filter(gut);
  for (const a of [x, y]) { const w = werte(a); if (w.length === 0 || w.every(v => v === w[0])) return { ok: false, code: 'konstant' }; }
  for (const a of [x, y]) if ((n - werte(a).length) / n > 0.1) return { ok: false, code: 'luecken' };
  return { ok: true };
}

/** Hinweis bei starker Eigenabhängigkeit: |r₁| > 0,5 in mindestens einer der beiden Reihen (genau 0,5 zählt nicht). */
export const ccfAutokorrHinweis = (r1x: number, r1y: number): boolean => Math.abs(r1x) > 0.5 || Math.abs(r1y) > 0.5;

const schritteT = (n: number) => Lp(n, `${n} Schritt`, `${n} Schritte`, `${n} step`, `${n} steps`);
const q = (t: string) => `‚${t}‘`;

export function ccfCodeSatz(code: CcfCode): string {
  switch (code) {
    case 'laenge': return L('Die beiden Reihen müssen gleich lang sein und dieselben Zeitpunkte haben.', 'The two series must be equally long and have the same points in time.');
    case 'zu-kurz': return L('Für die Kreuzkorrelation braucht jede Reihe mindestens 10 Plätze.', 'The cross-correlation needs at least 10 places in each series.');
    case 'konstant': return L('Eine der beiden Reihen hat nur einen Wert (alle Werte gleich); dafür gibt es keine Korrelation.', 'One of the two series has only one value (all values equal); there is no correlation for it.');
    case 'luecken': return L('In einer der beiden Reihen fehlen mehr als 10 % der Werte; die Kreuzkorrelation wird dann nicht gerechnet.', 'More than 10% of the values are missing in one of the two series; the cross-correlation is then not calculated.');
  }
}

/** Ganze Sätze unter dem Bild: größter Betrag mit Verzögerung und Richtung, Lücken, Eigenabhängigkeit mit Angebot „Veränderungen statt Werte“. */
export function ccfSaetze(e: CcfErgebnis, o: { namen: [string, string]; r1: [number, number] }): string[] {
  const aus: string[] = [];
  let besser = -1, bk = 0;
  e.r.forEach((v, i) => { if (v !== null && Math.abs(v) > bk + 1e-12) { bk = Math.abs(v); besser = i; } });
  const hinweisAktiv = ccfAutokorrHinweis(o.r1[0], o.r1[1]);
  if (besser >= 0) {
    const k = e.lags[besser]!, rv = e.r[besser]!, rt = ohneNull(rv, 2);
    if (Math.abs(rv) <= e.grenze) aus.push(L('Kein Ausschlag liegt außerhalb der Zufallsgrenzen; ein Vorlauf einer Reihe ist nicht erkennbar.', 'No bar lies outside the chance limits; a lead of one series is not recognizable.'));
    else {
      if (k === 0) aus.push(L(`Am größten bei Verzögerung 0 (r = ${rt}): Das spricht dafür, dass die beiden Reihen gleichzeitig verlaufen.`, `Largest at lag 0 (r = ${rt}): this suggests that the two series run at the same time (simultaneous).`));
      else {
        const vorn = q(k > 0 ? o.namen[0] : o.namen[1]), a = Math.abs(k), kt = komma(k, 0);
        aus.push(L(`Am größten bei Verzögerung ${kt} (r = ${rt}): Das spricht dafür, dass ${vorn} etwa ${schritteT(a)} vorn liegt.`, `Largest at lag ${kt} (r = ${rt}): this suggests that ${vorn} leads by about ${schritteT(a)}.`));
      }
      if (hinweisAktiv) aus.push(L('Das kann Zufall sein.', 'This can be chance.'));
    }
  }
  if (e.luecken > 0) aus.push(Lp(e.luecken, `${e.luecken} Platz hat in einer der beiden Reihen keinen Wert; die Kreuzkorrelation ist dann eine Näherung.`, `${e.luecken} Plätze haben in einer der beiden Reihen keinen Wert; die Kreuzkorrelation ist dann eine Näherung.`,
    `${e.luecken} place has no value in one of the two series; the cross-correlation is then an approximation.`, `${e.luecken} places have no value in one of the two series; the cross-correlation is then an approximation.`));
  const [a, b] = o.r1;
  if (ccfAutokorrHinweis(a, b)) {
    const ra = ohneNull(a, 2), rb = ohneNull(b, 2);
    const beide = Math.abs(a) > 0.5 && Math.abs(b) > 0.5;
    if (beide) aus.push(L(`Beide Reihen hängen stark von ihrer eigenen Vergangenheit ab (r₁ = ${ra} und ${rb}); einzelne Ausschläge außerhalb der Grenzen können Zufall sein.`, `Both series depend strongly on their own past (r₁ = ${ra} and ${rb}); single bars outside the limits can be chance.`));
    else {
      const name = q(Math.abs(a) > 0.5 ? o.namen[0] : o.namen[1]), rr = Math.abs(a) > 0.5 ? ra : rb;
      aus.push(L(`Die Reihe ${name} hängt stark von ihrer eigenen Vergangenheit ab (r₁ = ${rr}); einzelne Ausschläge außerhalb der Grenzen können Zufall sein.`, `The series ${name} depends strongly on its own past (r₁ = ${rr}); single bars outside the limits can be chance.`));
    }
    aus.push(L('Mit Veränderungen statt Werten (Daten-Assistent „Verschieben und glätten“, Veränderung zur vorigen Messung) gibt es meist deutlich weniger Fehlalarme (in einer Simulation mit stark abhängigen Reihen 5 % statt 33 %).', 'With changes instead of values (data assistant "Shift and smooth", change from the previous measurement) there are usually far fewer false alarms (in a simulation with strongly dependent series 5% instead of 33%).'));
  }
  return aus;
}

/** Text unter der Achse: links die zweite, rechts die erste Reihe (positive Verzögerung = erste Reihe liegt vorn). */
export const ccfAchsenText = (namen: [string, string]): string => L(`← ${namen[1]} liegt vorn | ${namen[0]} liegt vorn →`, `← ${namen[1]} leads | ${namen[0]} leads →`);

/** Hilfetext zur Richtung; sagt, wie R zählt. */
export const ccfHilfeText = (): string => L(
  'Statable zählt die Verzögerung k so: r(k) ist die Korrelation der ersten Reihe zur Zeit t mit der zweiten Reihe zur Zeit t + k. Positives k heißt: die erste Reihe liegt vorn, die zweite folgt k Schritte später. R (`ccf`) zählt die Verzögerung mit umgekehrtem Vorzeichen; wer Zahlen aus R vergleicht, dreht das Vorzeichen von k. Die Grenzen gelten für jede Verzögerung einzeln, nicht für alle zusammen.',
  'Statable counts the lag k like this: r(k) is the correlation of the first series at time t with the second series at time t + k. Positive k means: the first series leads, the second follows k steps later. R (`ccf`) counts the lag with the opposite sign; when comparing numbers from R, flip the sign of k. The limits apply to each lag separately, not to all lags together.');
