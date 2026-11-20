/**
 * Sprache von Teilen (WCAG 3.1.2): Steht in einem nicht englischen Text ein englischer Fachbegriff in Klammern
 * („Faktorwert (Factor Score)“), bekommt er `lang="en"`, damit ein Screenreader ihn englisch ausspricht.
 *
 * Feste, nachprüfbare Regel (keine Ratelogik): Gekennzeichnet wird nur der Text einer Klammer `(…)`, der (ohne Groß-/Kleinschreibung)
 * in `englische-klammern.json` steht. Die Liste erzeugt `scripts/englische-klammern-erzeugen.mjs` aus dem englischen Glossar
 * (mindestens zwei Wörter oder ausdrücklich genannte Einzelwörter, kein Latein, keine Formeln); der Wächter `sprachteile.test.ts` prüft sie.
 * Deutsche Klammern („(Mittelwert)“, „(Test)“, „(ACF)“, „(α)“) stehen nicht darauf und bleiben unberührt.
 * Die Klammern selbst und der sichtbare Text bleiben unverändert; nur der Klammerinhalt kommt in ein `<span lang="en">`.
 */
import liste from './englische-klammern.json';

/** Bindestrich wie Leerzeichen: „Confirmation-Bias“ und „confirmation bias“ sind derselbe Begriff. */
const norm = (s: string) => s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
const ENGLISCH = new Set<string>((liste as string[]).map(norm));

/** Deutsche Endung mit großem Anfangsbuchstaben nach Bindestrich („Dunnett-Test“, „Random-Effects-Modell“): gemischte Form, nicht als Englisch kennzeichnen. */
const DEUTSCHE_ENDUNG = /-(Test|Tests|Modell|Modelle|Verfahren|Analyse|Index|Kriterium|Methode|Regression|Verteilung)$/;

export interface Sprachteil { t: string; en: boolean }

/** Zerlegt `text` in Teile; `en` ist wahr für einen englischen Klammerinhalt. Bei Seitensprache Englisch (oder ohne Treffer) bleibt der Text ein Teil. */
export function sprachteile(text: string, sprache: string): Sprachteil[] {
  if (!text || sprache === 'en' || !text.includes('(')) return [{ t: text, en: false }];
  const teile: Sprachteil[] = [];
  let pos = 0;
  for (const m of text.matchAll(/\(([^()]+)\)/g)) {
    if (!ENGLISCH.has(norm(m[1]!)) || DEUTSCHE_ENDUNG.test(m[1]!)) continue;
    const von = m.index! + 1, bis = von + m[1]!.length;
    if (von > pos) teile.push({ t: text.slice(pos, von), en: false });
    teile.push({ t: text.slice(von, bis), en: true });
    pos = bis;
  }
  if (!teile.length) return [{ t: text, en: false }];
  if (pos < text.length) teile.push({ t: text.slice(pos), en: false });
  return teile;
}
