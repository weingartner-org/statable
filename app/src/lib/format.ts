import { dezimal } from '../i18n/profil';

/** Zahl für die Anzeige: Dezimalzeichen nach Sprachprofil und Einstellung „Zahlen“ (i18n/profil.ts); ganze Zahlen ohne Nachkommastellen. */
export function zahlDe(v: number, stellen?: number): string {
  const t = stellen === undefined ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : v.toFixed(stellen);
  const m = (/^-[0.]+$/.test(t) ? t.slice(1) : t).replace('-', '−');
  return dezimal() === '.' ? m : m.replace('.', ',');
}
