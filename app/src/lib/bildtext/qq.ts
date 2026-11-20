/** Q-Q-Diagramm gegen die Normalverteilung (Schablone 5.9). Muster nach fester Regel: Der Abstand der äußersten Punkte (je 5 Prozent der Punkte, mindestens 1) von der Geraden,
 *  gemessen in Geradensteigungen (das ist die geschätzte Standardabweichung), über `ENDE_SCHWELLE` heißt „oberhalb“ bzw. „unterhalb“, sonst „nahe an der Geraden“. Ab 8 Punkten, sonst keine Aussage. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber } from './zahlen';
import { achsenSatz, titelOder, keineDaten, spanne } from './hilfen';
import type { BildText, QqDaten } from './typen';

export const ENDE_SCHWELLE = 0.5;
export const QQ_MIN_PUNKTE = 8;

/** Lage der beiden Enden zur Geraden; null, wenn die Regel nicht greift (zu wenige Punkte, Steigung nicht positiv). */
export function qqEnden(d: Pick<QqDaten, 'punkte' | 'steigung' | 'achsenabschnitt'>): { links: 'oberhalb' | 'unterhalb' | 'nahe'; rechts: 'oberhalb' | 'unterhalb' | 'nahe' } | null {
  const p = [...d.punkte].sort((a, b) => a[0] - b[0]), n = p.length;
  if (n < QQ_MIN_PUNKTE || !(d.steigung > 0) || !Number.isFinite(d.achsenabschnitt)) return null;
  const k = Math.max(1, Math.round(n * 0.05));
  const abw = (q: [number, number]) => (q[1] - (d.achsenabschnitt + d.steigung * q[0])) / d.steigung;
  const mittel = (s: [number, number][]) => s.reduce((a, q) => a + abw(q), 0) / s.length;
  const wort = (v: number) => (v > ENDE_SCHWELLE ? 'oberhalb' : v < -ENDE_SCHWELLE ? 'unterhalb' : 'nahe');
  return { links: wort(mittel(p.slice(0, k))), rechts: wort(mittel(p.slice(-k))) };
}
const wortText = (w: 'oberhalb' | 'unterhalb' | 'nahe') => (w === 'oberhalb' ? L('oberhalb der Geraden', 'above the line') : w === 'unterhalb' ? L('unterhalb der Geraden', 'below the line') : L('nahe an der Geraden', 'close to the line'));

export function qq(d: QqDaten): BildText {
  const name = sauber(d.name), titel = titelOder(d.titel, L(`Q-Q-Diagramm von ${name}`, `Q-Q plot of ${name}`));
  const p = d.punkte.filter(q => Number.isFinite(q[0]) && Number.isFinite(q[1])), n = p.length;
  if (n === 0) return keineDaten(titel, L(`Q-Q-Diagramm (Normalverteilung) von ${name}: keine Werte.`, `Q-Q plot (normal distribution) of ${name}: no values.`));
  const e = qqEnden({ ...d, punkte: p });
  const lage = !e ? '' : e.links === 'nahe' && e.rechts === 'nahe' ? L('die Punkte liegen an beiden Enden nahe an der Geraden', 'the points lie close to the line at both ends')
    : L(`das linke Ende liegt ${wortText(e.links)}, das rechte Ende ${wortText(e.rechts)}`, `the left end lies ${wortText(e.links)}, the right end ${wortText(e.rechts)}`);
  const kurz = lage ? L(`Q-Q-Diagramm (Normalverteilung) von ${name}, n = ${n}; ${lage}.`, `Q-Q plot (normal distribution) of ${name}, n = ${n}; ${lage}.`) : L(`Q-Q-Diagramm (Normalverteilung) von ${name}, n = ${n}.`, `Q-Q plot (normal distribution) of ${name}, n = ${n}.`);
  const sx = spanne(p.map(q => q[0])), sy = spanne(p.map(q => q[1]));
  const beschreibung = [
    L(`Q-Q-Diagramm (Normalverteilung) von ${name}.`, `Q-Q plot (normal distribution) of ${name}.`),
    achsenSatz(true, { name: L('erwartete Werte bei Normalverteilung (theoretische Quantile)', 'expected values under normal distribution (theoretical quantiles)') }, sx),
    achsenSatz(false, { name: L(`beobachtete Werte von ${name}`, `observed values of ${name}`) }, sy),
    Lp(n, `Es ist ${n} Punkt eingezeichnet.`, `Es sind ${n} Punkte eingezeichnet.`, `${n} point is drawn.`, `${n} points are drawn.`),
    Number.isFinite(d.steigung) && Number.isFinite(d.achsenabschnitt) ? L(`Bezugsgerade durch das erste und dritte Quartil: Punkte auf dieser Geraden entsprechen genau der Normalverteilung; Achsenabschnitt ${z(d.achsenabschnitt)}, Steigung ${z(d.steigung)}.`, `Reference line through the first and third quartile: points on this line match the normal distribution exactly; intercept ${z(d.achsenabschnitt)}, slope ${z(d.steigung)}.`) : '',
    lage ? L(`Lage: ${lage}.`, `Position: ${lage}.`) : ''
  ].filter(Boolean);
  const kopf = [L('theoretisches Quantil', 'theoretical quantile'), L('beobachteter Wert', 'observed value')];
  return { kurz, beschreibung, liste: [], tabelle: { titel, kopf, zeilen: p.map(q => [z(q[0], 2), z(q[1])]), zeilenKopf: false } };
}
