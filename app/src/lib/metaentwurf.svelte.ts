/** Die Eingabetabelle der Meta-Analyse, solange die Frage noch nicht gerechnet ist (bleibt beim Hin- und Herwechseln der Frageart erhalten). */
import { L } from './sitzung.svelte';
import { metaSpaltenZahl, type MetaArt, type MetaEntwurf } from './metaanalyse';

/** Die Tür auf der Startseite („Studien zusammenfassen“) setzt dies: Das Blatt öffnet dann gleich die Meta-Analyse statt der Kartenwahl. */
export const metaDirekt = $state({ an: false });
const leer = (n: number) => Array.from({ length: n }, () => '');
export const leereZeilen = (art: MetaArt, modus: 'se' | 'ki', anzahl = 4, nMod = 0) => Array.from({ length: anzahl }, () => ({ name: '', w: leer(metaSpaltenZahl(art, modus)), ...(nMod ? { m: leer(nMod) } : {}) }));
/** Knapp-Hartung ist Standard (Abschlusstest F9: IntHout, Ioannidis & Borm 2014; Cochrane Handbook 6.4, Kap. 10.10.4); abschaltbar unter „Für Fachleute“. */
export const entwurf = $state<MetaEntwurf>({ art: 'es', modus: 'se', massName: '', verhaeltnis: false, kh: true, zeilen: leereZeilen('es', 'se'), modNamen: [] });

/** Art oder Modus ändert die Spalten: Namen bleiben, Zahlen werden leer, wenn die Spaltenzahl nicht passt. */
export function metaUmstellen(art: MetaArt, modus: 'se' | 'ki' = entwurf.modus) {
  const n = metaSpaltenZahl(art, modus), gleich = art === entwurf.art && n === metaSpaltenZahl(entwurf.art, entwurf.modus);
  entwurf.art = art; entwurf.modus = modus;
  entwurf.zeilen = entwurf.zeilen.map(z => ({ name: z.name, w: gleich ? z.w : leer(n), ...(z.m ? { m: z.m } : {}) }));
}
export function metaZeilenSetzen(zeilen: { name: string; w: string[]; m?: string[] }[]) { entwurf.zeilen = zeilen.length ? zeilen.map(z => ({ ...z, m: Array.from({ length: entwurf.modNamen?.length ?? 0 }, (_, j) => z.m?.[j] ?? '') })) : leereZeilen(entwurf.art, entwurf.modus, 4, entwurf.modNamen?.length ?? 0); }
/** Moderatoren (Meta-Regression): eine Spalte dazu oder weg; die Zeilen wachsen mit. */
export function modDazu() { entwurf.modNamen = [...(entwurf.modNamen ?? []), '']; entwurf.zeilen.forEach(z => { z.m = [...(z.m ?? []), '']; }); }
export function modWeg(j: number) { entwurf.modNamen = (entwurf.modNamen ?? []).filter((_, i) => i !== j); entwurf.zeilen.forEach(z => { z.m = (z.m ?? []).filter((_, i) => i !== j); }); }

/** Beispiel für Lehre und Ausprobieren: BCG-Impfung gegen Tuberkulose, 13 Studien (Colditz et al., 1994; R-Paket metadat, dat.bcg), log-Risikoverhältnis und SE auf acht Stellen (damit der R-Aufruf unter „Für Fachleute“ dieselbe Zahl liefert). */
export const BEISPIEL_BCG: [string, number, number][] = [
  ['Aronson 1948', -0.88931133, 0.57060035], ['Ferguson & Simes 1949', -1.58538866, 0.4411135], ['Rosenthal et al. 1960', -1.34807315, 0.64449047], ['Hart & Sutherland 1977', -1.44155119, 0.14145682],
  ['Frimodt-Moller et al. 1973', -0.21754732, 0.22629665], ['Stein & Aronson 1953', -0.78611559, 0.08310005], ['Vandiviere et al. 1973', -1.62089822, 0.47224702], ['TPT Madras 1980', 0.01195233, 0.06294108],
  ['Coetzee & Berjak 1968', -0.46941765, 0.23755886], ['Rosenthal et al. 1961', -1.3713448, 0.270231], ['Comstock et al. 1974', -0.33935883, 0.11141012], ['Comstock & Webster 1969', 0.4459134, 0.72972998], ['Comstock et al. 1976', -0.01731395, 0.2672165]
];
/** Breitengrad der 13 Studien (dat.bcg$ablat): der klassische Moderator - je weiter vom Äquator, desto besser wirkt die Impfung. */
export const BEISPIEL_BREITENGRAD = [44, 55, 42, 52, 13, 44, 19, 13, 27, 42, 18, 33, 33];
export function metaBeispiel(mitModerator = false) {
  entwurf.art = 'es'; entwurf.modus = 'se'; entwurf.verhaeltnis = true; entwurf.massName = L('Risikoverhältnis (RR)', 'Risk ratio (RR)'); entwurf.kh = true;
  entwurf.modNamen = mitModerator ? [L('Breitengrad', 'Latitude')] : [];
  entwurf.zeilen = BEISPIEL_BCG.map(([name, y, se], i) => ({ name, w: [String(y).replace('.', L(',', '.')), String(se).replace('.', L(',', '.'))], ...(mitModerator ? { m: [String(BEISPIEL_BREITENGRAD[i])] } : {}) }));
}
