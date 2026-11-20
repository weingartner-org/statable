/** Zahlen für den Reiter „Verstehen“ (nur Anzeige): Wahrscheinlichkeiten dezimal und in Prozent, sehr kleine Werte nie als „0“, sondern in Exponentenschreibweise.
 *  Dezimalzeichen und Prozentzeichen kommen aus dem Sprachprofil (i18n/profil.ts), nie von Hand. */
import { zahlDe } from './format';
import { L } from './sitzung.svelte';
import { dezimal, proz } from '../i18n/profil';

const HOCH: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** 1,235 · 10⁻¹⁰ */
export function expSchreibweise(v: number, stellen = 3): string {
  const [m, e] = v.toExponential(stellen - 1).split('e');
  return `${zahlDe(Number(m), stellen - 1)} · 10${String(Number(e)).split('').map(c => HOCH[c] ?? c).join('')}`;
}

/** Wahrscheinlichkeit als Dezimalzahl: 0,0443 · 0,000123 · 1,5 · 10⁻⁹ (nie „0“ für einen kleinen, aber positiven Wert) · knapp unter 1 mit so vielen Stellen, dass man den Abstand zu 1 sieht. */
/** Unter dieser Grenze zeigt Statable „kleiner als“ statt 0, wenn ein möglicher Wert nur zu klein für die Zahlendarstellung ist (die Normalverteilung liefert ab |z| > 37 schon 0). */
export const UNTERLAUF = 1e-290;
/** `rest` = der DIREKT gerechnete Gegenschwanz (1 − p); nahe 1 wird „1 − …“ nur daraus gebildet, nie aus 1 − p (das verliert die letzten Stellen: 1 − P(X ≤ 8) bei N(0; 1) ist 6,22 · 10⁻¹⁶, nicht 6,66 · 10⁻¹⁶). */
export function wahrscheinlichkeit(p: number, unterlauf = false, rest?: number): string {
  if (!Number.isFinite(p)) return '-';
  if (p === 0 && unterlauf) return `${L('kleiner als', 'less than')} ${expSchreibweise(UNTERLAUF, 1)}`;
  if (p === 0) return '0';
  if (p === 1) return '1';
  if (p < 1e-6) return expSchreibweise(p);
  if (p < 0.01) return zahlDe(p, Math.min(9, 2 - Math.floor(Math.log10(p))));
  if (p <= 0.9999) return zahlDe(p, 4);
  const r = rest !== undefined && rest > 0 && rest < 1e-3 ? rest : 1 - p;
  if (r < 1e-8) return `1 − ${expSchreibweise(r)}`;
  return zahlDe(p, Math.min(9, 2 - Math.floor(Math.log10(r))));
}
/** Dieselbe Wahrscheinlichkeit in Prozent: 4,43 % · „< 0,01 %“ · „> 99,99 %“. */
export function prozent(p: number, unterlauf = false): string {
  if (!Number.isFinite(p)) return '-';
  if (p === 0 && unterlauf) return `${L('kleiner als', 'less than')} ${proz(expSchreibweise(UNTERLAUF * 100, 1))}`;
  if (p === 0) return proz('0');
  if (p === 1) return proz('100');
  if (p < 0.0001) return `< ${proz(zahlDe(0.01, 2))}`;
  if (p > 0.99995) return `> ${proz(zahlDe(99.99, 2))}`;
  return proz(zahlDe(p * 100, 2));
}
/** Eine Zahl für Quantile, Erwartungswerte und Grenzen: bis 7 gültige Stellen, sehr große und sehr kleine in Exponentenschreibweise. */
export function zahlKurz(v: number): string {
  if (Number.isNaN(v)) return '-';
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e9 || a < 1e-4)) return (v < 0 ? '−' : '') + expSchreibweise(a, 4);
  return zahlDe(Number(v.toPrecision(7)));
}
/** Voreingestellte Zahlen in Eingabefeldern (im Quelltext mit Komma) bekommen beim ersten Anzeigen das Dezimalzeichen der Sprache. */
export function lokalisiere(o: Record<string, unknown>, felder: string[]) {
  for (const f of felder) { const w = o[f]; if (typeof w === 'string' && /^-?\d+[.,]\d+$/.test(w)) o[f] = w.replace(/[.,]/, dezimal()); }
}
/** Ein Text mit Dezimalkomma im Quelltext in das Dezimalzeichen der Sprache. */
export const ortsZahl = (t: string) => t.replace(/(\d)[.,](\d)/, `$1${dezimal()}$2`);
