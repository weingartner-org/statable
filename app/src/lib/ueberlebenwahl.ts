/**
 * Später S-F (Bauer A): die Wahl am Blatt der Karte „Wie lange dauert es bis zu einem Ereignis?“ unter „Weitere Wege“:
 *  - Sterbetafel statt Kaplan-Meier-Kurve (Breite der Intervalle, Ende, Zeiteinheit für den Satz),
 *  - Cox-Regression mit zeitabhängiger Größe: die Tabelle ist in Intervall-Form (Kennung, Start, Stopp = Zeit, Ereignis, Wert) - die Spalten werden hier gewählt, die Prädiktoren stehen in der Lücke l4.
 * Reine Funktionen ohne Sitzung. Fehlt `ueberleben` (alte Blätter), ist alles aus.
 */
export interface UeberlebenWahl {
  /** Sterbetafel: `breite`/`ende` als Text aus dem Eingabefeld (leer = Voreinstellung: etwa zehn Intervalle), `einheit` für den Satz („Tagen“; leer = „Zeiteinheiten“) */
  sterbe: { an: boolean; breite: string; ende: string; einheit: string };
  /** Cox mit zeitabhängiger Größe: Spalte mit dem Start des Abschnitts, mit der Kennung der Person und die zeitabhängige Größe selbst (eine der Spalten in l4) */
  zeit: { an: boolean; start: string; kennung: string; wert: string };
  /** Später S-F2: AFT-Modell (Zeitverhältnis) neben der Cox-Regression; `dist` Weibull, exponential, lognormal oder loglogistic */
  aft: { an: boolean; dist: string };
  /** Später S-F2: Zeilen derselben Person oder Gruppe: `art` 'aus', 'cluster' (robuste Standardfehler) oder 'gamma' (Frailty); `spalte` die Kennung; `ties` 'efron' oder 'breslow' */
  kennung: { art: string; spalte: string; ties: string };
}
export const leereUeberleben = (): UeberlebenWahl => ({ sterbe: { an: false, breite: '', ende: '', einheit: '' }, zeit: { an: false, start: '', kennung: '', wert: '' }, aft: { an: false, dist: 'weibull' }, kennung: { art: 'aus', spalte: '', ties: 'efron' } });
export function kopiereUeberleben(u: Partial<UeberlebenWahl> | undefined): UeberlebenWahl {
  const l = leereUeberleben();
  if (!u) return l;
  const t = (x: unknown) => (typeof x === 'string' ? x : '');
  return {
    sterbe: { an: !!u.sterbe?.an, breite: t(u.sterbe?.breite), ende: t(u.sterbe?.ende), einheit: t(u.sterbe?.einheit) },
    zeit: { an: !!u.zeit?.an, start: t(u.zeit?.start), kennung: t(u.zeit?.kennung), wert: t(u.zeit?.wert) },
    aft: { an: !!u.aft?.an, dist: ['weibull', 'exponential', 'lognormal', 'loglogistic'].includes(t(u.aft?.dist)) ? t(u.aft?.dist) : 'weibull' },
    kennung: { art: ['cluster', 'gamma'].includes(t(u.kennung?.art)) ? t(u.kennung?.art) : 'aus', spalte: t(u.kennung?.spalte), ties: t(u.kennung?.ties) === 'breslow' ? 'breslow' : 'efron' }
  };
}
/** Ist etwas gewählt (dann wird die Wahl am Blatt gespeichert)? */
export const ueberlebenAn = (u: UeberlebenWahl | undefined): boolean => !!u && (u.sterbe.an || u.zeit.an || u.aft?.an || (!!u.kennung && u.kennung.art !== 'aus'));

/** Eine positive Zahl aus dem Eingabefeld (Komma oder Punkt); leer = `null` ohne Fehler, Unsinn = `NaN`. */
export function zahlFeld(t: string): number | null {
  const x = t.trim().replace(/−/g, '-');
  if (x === '') return null;
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(x)) return NaN;
  const v = Number(x.replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
}
