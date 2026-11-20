/**
 * Messsystemanalyse (Gauge R&R, gekreuzt) mit der Varianzanalyse-Methode (S-I, 22.10.2026). Reine Rechnung.
 *   Teile (p) × Prüfende (o) × Wiederholungen (r), ausgewogen, r ≥ 2. Quadratsummen der zweifaktoriellen Varianzanalyse mit Wechselwirkung:
 *   σ²_Wdh = MS_Fehler;  σ²_Wechsel = max(0, (MS_TxP − MS_Fehler)/r);  σ²_Prüfende = max(0, (MS_P − MS_TxP)/(p·r));  σ²_Teile = max(0, (MS_T − MS_TxP)/(o·r)).
 *   Ist die Wechselwirkung nicht auffällig (p > 0,25, Minitab-Regel), wird sie in den Fehler eingerechnet (Fehler = (SS_TxP + SS_E)/(df_TxP + df_E)) und fällt weg.
 *   Wiederholpräzision = σ²_Wdh; Vergleichspräzision = σ²_Prüfende + σ²_Wechsel; R&R = beide zusammen; Gesamt = R&R + σ²_Teile; ndc = ⌊√2·σ_Teile/σ_R&R⌋ (1,41).
 *   Anteile an der Gesamtstreuung: %Beitrag = 100·σ²/σ²_gesamt, %Studienstreuung = 100·σ/σ_gesamt.
 * Sollwerte: R `SixSigma::ss.rr(alphaLim = 0.25)`, siehe messsystem.test.ts.
 * ⚠ Von der Fachperson abzunehmen: die Schwellen zur Beurteilung (R&R unter 10 % gut, 10 bis 30 % bedingt, über 30 % nicht brauchbar; ndc ab 5), Mindestzahl (10 Teile, 3 Prüfende, 2 bis 3 Wiederholungen), Zufallsauswahl der Teile.
 */
import { fOben } from './power';
export interface Komponente { name: 'wdh' | 'pruefende' | 'wechsel' | 'rr' | 'wiederhol' | 'vergleich' | 'teile' | 'gesamt'; var: number; sd: number; beitrag: number; studie: number }
export interface Messsystem {
  teile: number; pruefende: number; wdh: number;
  mitWechsel: boolean; pWechsel: number;
  /** Zeilen der Varianzanalyse (Teile, Prüfende, Wechselwirkung (falls im Modell), Fehler) */
  anova: { quelle: 'teile' | 'pruefende' | 'wechsel' | 'fehler'; df: number; ss: number; ms: number; f: number | null; p: number | null }[];
  komp: Komponente[];
  ndc: number;
}
export type MessFehler = { fehler: 'zu-wenig' | 'unausgewogen' | 'wenig-wiederholungen' | 'keine-streuung' };

export function messsystem(teil: string[], pruefer: string[], y: number[], alphaWechsel = 0.25): Messsystem | MessFehler {
  const n = y.length;
  if (teil.length !== n || pruefer.length !== n || n < 6) return { fehler: 'zu-wenig' };
  const T = [...new Set(teil)], O = [...new Set(pruefer)], p = T.length, o = O.length;
  if (p < 2 || o < 2) return { fehler: 'zu-wenig' };
  const zellen = new Map<string, number[]>();
  for (let i = 0; i < n; i++) { const k = `${teil[i]}\u0000${pruefer[i]}`; (zellen.get(k) ?? zellen.set(k, []).get(k)!).push(y[i]!); }
  const r = zellen.get(`${T[0]}\u0000${O[0]}`)?.length ?? 0;
  if (zellen.size !== p * o || [...zellen.values()].some(v => v.length !== r)) return { fehler: 'unausgewogen' };
  if (r < 2) return { fehler: 'wenig-wiederholungen' };
  const mw = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const gm = mw(y), zm = (t: string, q: string) => mw(zellen.get(`${t}\u0000${q}`)!);
  const tm = T.map(t => mw(O.map(q => zm(t, q)))), om = O.map(q => mw(T.map(t => zm(t, q))));
  const ssT = o * r * tm.reduce((s, v) => s + (v - gm) ** 2, 0), ssO = p * r * om.reduce((s, v) => s + (v - gm) ** 2, 0);
  let ssW = 0, ssE = 0;
  T.forEach((t, i) => O.forEach((q, j) => { const z = zm(t, q); ssW += r * (z - tm[i]! - om[j]! + gm) ** 2; for (const v of zellen.get(`${t}\u0000${q}`)!) ssE += (v - z) ** 2; }));
  const dfT = p - 1, dfO = o - 1, dfW = dfT * dfO, dfE = p * o * (r - 1);
  const msT = ssT / dfT, msO = ssO / dfO, msW = ssW / dfW, msE = ssE / dfE;
  if (!(msT > 0) && !(msE > 0)) return { fehler: 'keine-streuung' };
  const fW = msE > 0 ? msW / msE : Infinity, pW = msE > 0 ? fOben(fW, dfW, dfE) : 0;
  const mitWechsel = pW <= alphaWechsel;
  let vWdh: number, vWechsel = 0, vO: number, vT: number;
  const anova: Messsystem['anova'] = [];
  if (mitWechsel) {
    vWdh = msE; vWechsel = Math.max(0, (msW - msE) / r); vO = Math.max(0, (msO - msW) / (p * r)); vT = Math.max(0, (msT - msW) / (o * r));
    anova.push({ quelle: 'teile', df: dfT, ss: ssT, ms: msT, f: msT / msW, p: fOben(msT / msW, dfT, dfW) }, { quelle: 'pruefende', df: dfO, ss: ssO, ms: msO, f: msO / msW, p: fOben(msO / msW, dfO, dfW) },
      { quelle: 'wechsel', df: dfW, ss: ssW, ms: msW, f: fW, p: pW }, { quelle: 'fehler', df: dfE, ss: ssE, ms: msE, f: null, p: null });
  } else {
    const dfR = dfW + dfE, msR = (ssW + ssE) / dfR;
    vWdh = msR; vO = Math.max(0, (msO - msR) / (p * r)); vT = Math.max(0, (msT - msR) / (o * r));
    anova.push({ quelle: 'teile', df: dfT, ss: ssT, ms: msT, f: msT / msR, p: fOben(msT / msR, dfT, dfR) }, { quelle: 'pruefende', df: dfO, ss: ssO, ms: msO, f: msO / msR, p: fOben(msO / msR, dfO, dfR) },
      { quelle: 'fehler', df: dfR, ss: ssW + ssE, ms: msR, f: null, p: null });
  }
  const vVergleich = vO + vWechsel, vRR = vWdh + vVergleich, vGes = vRR + vT;
  if (!(vGes > 0)) return { fehler: 'keine-streuung' };
  const k = (name: Komponente['name'], v: number): Komponente => ({ name, var: v, sd: Math.sqrt(v), beitrag: (100 * v) / vGes, studie: (100 * Math.sqrt(v)) / Math.sqrt(vGes) });
  const komp = [k('rr', vRR), k('wiederhol', vWdh), k('vergleich', vVergleich), k('pruefende', vO), ...(mitWechsel ? [k('wechsel', vWechsel)] : []), k('teile', vT), k('gesamt', vGes)];
  return { teile: p, pruefende: o, wdh: r, mitWechsel, pWechsel: pW, anova, komp, ndc: vRR > 0 ? Math.floor(Math.SQRT2 * Math.sqrt(vT / vRR)) : Infinity };
}
/** Urteil nach der üblichen Faustregel (AIAG): unter 10 % gut, bis 30 % bedingt, darüber nicht brauchbar (Studienstreuung R&R). */
export const urteilRR = (studie: number): 'gut' | 'bedingt' | 'nicht' => (studie < 10 ? 'gut' : studie <= 30 ? 'bedingt' : 'nicht');
