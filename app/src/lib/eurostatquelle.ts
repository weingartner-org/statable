/**
 * Die Quelle von Daten aus Eurostat (Fachblatt SAISON-EUROSTAT, Abschnitt 2), ohne Texte und ohne Sitzung: die feste Adresse, ihre Prüfung und das Lesen der Quellenangabe aus einer Projektdatei.
 * Getrennt von eurostat.ts, damit Projektdatei und Protokoll sie laden können, ohne die Sitzung zu laden.
 */

/** Die eine feste Adresse. Es gibt keine frei eingebbare URL. */
export const EUROSTAT_ORIGIN = 'https://ec.europa.eu';
export const EUROSTAT_BASIS = `${EUROSTAT_ORIGIN}/eurostat/api/dissemination/statistics/1.0/data/`;
export const EUROSTAT_MAX_ADRESSE = 4000;
/** Muster für den Code des Datensatzes und die Namen der Filter. */
export const EUROSTAT_NAME = /^[A-Za-z0-9_]{1,40}$/;
// eslint-disable-next-line no-control-regex
export const EUROSTAT_STEUER = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

export const eurostatIstObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o);
/** Nur ein eigener Schlüssel zählt (`__proto__`, `constructor` … sind keine Schlüssel der Antwort, wenn sie nicht darin stehen). */
export const eurostatEigen = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
/** Text aus der Antwort: nur ein Text, ohne Steuer- und Richtungszeichen, gekürzt. Sonst ''. */
export const eurostatSauber = (t: unknown, max: number): string => (typeof t === 'string' ? t.replace(new RegExp(EUROSTAT_STEUER.source, 'g'), ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Ist das genau die feste Adresse (https, Host ec.europa.eu, Pfad unter der Basis, keine Zugangsdaten, kein Anker)? Gilt vor jedem Abruf. */
export function eurostatAdresseOk(adresse: string): boolean {
  if (typeof adresse !== 'string' || !adresse.startsWith(EUROSTAT_BASIS)) return false;
  try {
    const u = new URL(adresse);
    return u.origin === EUROSTAT_ORIGIN && u.username === '' && u.password === '' && u.hash === '' && u.pathname.startsWith('/eurostat/api/dissemination/statistics/1.0/data/');
  } catch { return false; }
}

/** Woher die Daten kommen: wird an den Daten gespeichert und in Protokoll und Bericht genannt. */
export interface EurostatQuelle { datensatz: string; /** Tag des Abrufs, JJJJ-MM-TT */ abruf: string; /** `updated` aus der Antwort ('' = nicht angegeben) */ aktualisiert: string; /** die genaue Abfrage-Adresse */ adresse: string }

/** Aus einer Projektdatei: nur, was dem Muster entspricht; die Adresse nur, wenn sie die feste Adresse ist. Sie wird nie abgerufen, nur angezeigt. */
export function eurostatQuelleLesen(o: unknown): EurostatQuelle | undefined {
  if (!eurostatIstObjekt(o)) return undefined;
  const datensatz = eurostatEigen(o, 'datensatz'), abruf = eurostatEigen(o, 'abruf'), adresse = eurostatEigen(o, 'adresse');
  if (typeof datensatz !== 'string' || !EUROSTAT_NAME.test(datensatz) || typeof abruf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(abruf) || typeof adresse !== 'string' || adresse.length > EUROSTAT_MAX_ADRESSE || !eurostatAdresseOk(adresse)) return undefined;
  return { datensatz, abruf, aktualisiert: eurostatSauber(eurostatEigen(o, 'aktualisiert'), 40), adresse };
}
