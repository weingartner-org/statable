/**
 * S-G: Begriffe in Tabellenköpfen erklären (Johannes 18.10., wie SPSS „Was ist das?“). Der englische Kopf, den PSPP schreibt, führt zu einer Erklärung aus
 * `erklaerungen()` (Wortverzeichnis, alle 15 Sprachen): Titel und erster Satz als Tipp, Klick springt in die Hilfe. Nur Köpfe mit EINDEUTIGER Bedeutung;
 * Mehrdeutiges („F“, „t“, „Lower“, „Total“) bekommt keinen Tipp.
 */
import { erklaerungen } from './texte';

const KOPF: Record<string, string> = {
  'df': 'freiheitsgrade', 'sig.': 'p-wert', 'sig. (2-tailed)': 'p-wert', 'sig. (1-tailed)': 'p-wert', 'asymp. sig. (2-tailed)': 'p-wert', 'asymp. sig. (2-sided)': 'p-wert', 'exact sig. (2-sided)': 'p-wert',
  'std. error': 'standardfehler', 'std. error mean': 'standardfehler', 's.e. mean': 'standardfehler', 'std. error of mean': 'standardfehler', 'std. error of the estimate': 'standardfehler',
  'std. deviation': 'standardabweichung', 'mean': 'mittelwert', 'variance': 'streuung',
  'beta': 'beta', 'b': 'koeffizient-b', 'exp(b)': 'odds-ratio', 'r square': 'r-quadrat', 'adjusted r square': 'r-quadrat',
  'eigenvalue': 'eigenwert-rotation', "cronbach's alpha": 'reliabilitaet', 'pearson chi-square': 'chi-quadrat',
  'mean rank': 'rangtest', 'sum of ranks': 'rangtest', 'mann-whitney u': 'rangtest', 'wilcoxon w': 'rangtest',
  '95% confidence interval': 'konfidenzintervall', '95% confidence interval of the difference': 'konfidenzintervall', '95% confidence interval for mean': 'konfidenzintervall',
  "cohen's d": 'effektstaerke', 'eta squared': 'eta-quadrat',
};

const erster = (s: string) => { const m = s.match(/^.*?[.!?](?=\s|$)/); return (m ? m[0] : s).trim(); };

/** Tipp-Text und Hilfe-Id für einen Kopf, oder null. */
export function kopfTipp(kopf: string): { text: string; id: string } | null {
  const id = KOPF[kopf.trim().toLowerCase()];
  if (!id) return null;
  const e = (erklaerungen() as Record<string, { titel: string; kurz: string } | undefined>)[id];
  if (!e?.kurz) return null;
  return { text: `${e.titel}: ${erster(e.kurz)}`, id };
}
