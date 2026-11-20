/**
 * Sprachprofil (Bauplan Sprachen, Phase 0.3): alles, was je Sprache anders geschrieben wird, aber kein Text ist -
 * Dezimalzeichen, Prozent, Anführungszeichen, Trenner im Intervall, Datum. Eine Stelle statt 7-10 Kopien in den Satz-Dateien.
 * Werte aus docs/sprachen/bericht-<code>.md (dort die Quellen); ⚠ für alle außer de/en von der Fachperson zu bestätigen.
 *
 * Dezimalzeichen: nach der Einstellung „Zahlen“ (wie die Sprache / Komma / Punkt; Johannes 09.10.) - in vielen Ländern
 * ist der Punkt in Statistikangaben üblich (APA), obwohl die Sprache das Komma hat.
 * Die APA-Regel „keine Null vor dem Komma bei Werten bis 1“ hängt am Maß, nicht an der Sprache (lib/ergebnis.ts ohneNull).
 */
import { s, aktuelleSprache, L } from '../lib/sitzung.svelte';
import { zahlHaken, type Sprache } from './laufzeit';
import { isoliere } from './bidi';

export interface Profil {
  /** Gebietsschema für Intl (Datum, Uhrzeit, große Zahlen, Sortierung) */
  ort: string;
  /** Dezimalzeichen der Sprache (Vorgabe für die Einstellung „wie die Sprache“) */
  dezimal: ',' | '.';
  /** zwischen Zahl und % ('' = „95%“, geschütztes Leerzeichen = „95 %“) */
  proz: string;
  /** Anführungszeichen für eingesetzte Namen („Alter“, "Age", « âge ») */
  zitat: readonly [string, string];
  /** Reihenfolge und Trenner beim Eingeben und Zeigen eines Datums */
  datum: { folge: 'TMJ' | 'MTJ' | 'JMT'; trenner: string };
  /** Vor dem Semikolon im Intervall bei Dezimalkomma (Französisch: schmales geschütztes Leerzeichen, „[0,19 ; 0,95]“) */
  vorSemikolon?: string;
  /** Prozentzeichen vor der Zahl (Türkisch „%95“) */
  prozVorn?: boolean;
  /** Schrift von rechts nach links (Arabisch, Persisch): `<html dir="rtl">`, Isolierung eingesetzter Werte (i18n/bidi.ts), Pfeile gespiegelt. Fehlt = links nach rechts. Gleiche Liste `RTL_SPRACHEN` in laufzeit.ts (ein Test hält sie gleich). */
  richtung?: 'rtl';
}

const NB = '\u00a0', SCHMAL = '\u202f';
const TMJ = (trenner: string) => ({ folge: 'TMJ' as const, trenner });
export const PROFILE: Record<Sprache, Profil> = {
  de: { ort: 'de-AT', dezimal: ',', proz: NB, zitat: ['„', '“'], datum: TMJ('.') },
  en: { ort: 'en-US', dezimal: '.', proz: '', zitat: ['"', '"'], datum: { folge: 'MTJ', trenner: '/' } },
  fr: { ort: 'fr-FR', dezimal: ',', proz: NB, zitat: ['«' + SCHMAL, SCHMAL + '»'], datum: TMJ('/'), vorSemikolon: SCHMAL },
  es: { ort: 'es-ES', dezimal: ',', proz: NB, zitat: ['«', '»'], datum: TMJ('/') },
  it: { ort: 'it-IT', dezimal: ',', proz: '', zitat: ['«', '»'], datum: TMJ('/') },
  pt: { ort: 'pt-PT', dezimal: ',', proz: '', zitat: ['«', '»'], datum: TMJ('/') },
  nl: { ort: 'nl-NL', dezimal: ',', proz: '', zitat: ['“', '”'], datum: TMJ('-') },
  el: { ort: 'el-GR', dezimal: ',', proz: '', zitat: ['«', '»'], datum: TMJ('/') },
  hu: { ort: 'hu-HU', dezimal: ',', proz: '', zitat: ['„', '”'], datum: { folge: 'JMT', trenner: '.' } },
  sv: { ort: 'sv-SE', dezimal: ',', proz: NB, zitat: ['”', '”'], datum: { folge: 'JMT', trenner: '-' } },
  pl: { ort: 'pl-PL', dezimal: ',', proz: '', zitat: ['„', '”'], datum: TMJ('.') },
  uk: { ort: 'uk-UA', dezimal: ',', proz: '', zitat: ['«', '»'], datum: TMJ('.') },
  ro: { ort: 'ro-RO', dezimal: ',', proz: '', zitat: ['„', '”'], datum: TMJ('.') },
  cs: { ort: 'cs-CZ', dezimal: ',', proz: NB, zitat: ['„', '“'], datum: TMJ('.') },
  bg: { ort: 'bg-BG', dezimal: ',', proz: '', zitat: ['„', '“'], datum: TMJ('.') },
  // Bauplan 7 Sprachen (11.11.2026): vorläufig, endgültig nach docs/sprachen/bericht-<code>.md
  id: { ort: 'id-ID', dezimal: ',', proz: '', zitat: ['“', '”'], datum: TMJ('/') },
  vi: { ort: 'vi-VN', dezimal: ',', proz: '', zitat: ['“', '”'], datum: TMJ('/') },
  tr: { ort: 'tr-TR', dezimal: ',', proz: '', prozVorn: true, zitat: ['“', '”'], datum: TMJ('.') },
  bn: { ort: 'bn-BD-u-nu-latn', dezimal: '.', proz: '', zitat: ['“', '”'], datum: TMJ('/') },
  ar: { ort: 'ar-EG-u-nu-latn', dezimal: '.', proz: '', zitat: ['«', '»'], datum: TMJ('/'), richtung: 'rtl' },
  fa: { ort: 'fa-IR-u-nu-latn', dezimal: '.', proz: '', zitat: ['«', '»'], datum: { folge: 'JMT', trenner: '/' }, richtung: 'rtl' },
  'pt-BR': { ort: 'pt-BR', dezimal: ',', proz: '', zitat: ['“', '”'], datum: TMJ('/') },
  // Prüfsprache: wie Englisch, aber mit eigenen Zeichen - so fällt auf, wo noch eine feste Weiche steht
  xx: { ort: 'en-US', dezimal: ',', proz: NB, zitat: ['«', '»'], datum: TMJ('.') },
  // Prüfsprache von rechts nach links: wie xx, aber mit RTL (ohne Übersetzung die Oberfläche in RTL prüfen)
  xr: { ort: 'en-US', dezimal: ',', proz: NB, zitat: ['«', '»'], datum: TMJ('.'), richtung: 'rtl' }
};

export const profil = (): Profil => PROFILE[aktuelleSprache()] ?? PROFILE.en;
/** Schreibrichtung der gewählten Sprache (für `<html dir>`). */
export const richtung = (): 'ltr' | 'rtl' => (profil().richtung === 'rtl' ? 'rtl' : 'ltr');
/** Wert für eine Formel-Angabe im Satz: in RTL isoliert (bidi.ts), sonst unverändert. */
export const formel = (t: string): string => (richtung() === 'rtl' ? isoliere(t) : t);
/** Pfeil „von … nach …“ (Textpfeil in Aufzählungen, Pfaden): in RTL zeigt er nach links, weil dort die Leserichtung umgekehrt ist. Pfeile, die Zahlen- oder Achsenrichtung meinen, bleiben →. */
export const pfeil = (): string => (richtung() === 'rtl' ? '←' : '→');
/** Dezimalzeichen nach Einstellung „Zahlen“. */
export const dezimal = (): ',' | '.' => (s.einst.zahl === 'komma' ? ',' : s.einst.zahl === 'punkt' ? '.' : profil().dezimal);
/** Einstellung „Null vor dem Komma“: auch Werte bis 1 (p, r, α) mit Null. Standard aus (APA, wie im Deutschen). */
export const mitNull = () => s.einst.nullVorKomma === true;
/** Punkt einer Zahl als Dezimalzeichen setzen („1.5“ → „1,5“). */
export const dez = (t: string) => (dezimal() === '.' ? t : t.replace('.', ','));
/** In eingesetzten Zahlen eines übersetzten Textes steht das Dezimalzeichen der Sprache (laufzeit.ts `zahlHaken`); „Zahlen“ in den Einstellungen gilt auch hier. */
zahlHaken.dez = (z, sp) => { const komma = s.einst.zahl === 'komma' ? true : s.einst.zahl === 'punkt' ? false : (PROFILE[sp as Sprache] ?? PROFILE.en).dezimal === ','; return komma ? z.replace('.', ',') : z; };
/** Doppelpunkt nach einer Beschriftung: Französisch setzt davor ein geschütztes Leerzeichen („Exemple :“; Abnahme 31.10. F13). */
export const dp = () => (aktuelleSprache() === 'fr' ? NB + ':' : ':');
/** Intervall „[0,19; 0,95]“ (Semikolon bei Dezimalkomma) bzw. „[0.19, 0.95]“ (APA 7). */
export const iv = (lo: string, hi: string) => formel(dezimal() === ',' ? `[${lo}${profil().vorSemikolon ?? ''}; ${hi}]` : `[${lo}, ${hi}]`);
/** Freiheitsgrade „(2, 57)“. Hat einer Nachkommastellen (Welch, Greenhouse-Geisser) und gilt das Dezimalkomma: „(2; 76,4)“ - „(2, 76,4)“ wäre mehrdeutig (Johannes 09.10.). */
export const dfKlammer = (...df: string[]) => formel(`(${df.join(dezimal() === ',' && df.some(x => x.includes(',')) ? `${profil().vorSemikolon ?? ''}; ` : ', ')})`);
/** „95 %-KI [0,19; 0,95]“ / „95% CI [0.19, 0.95]“. `niveau` (in Prozent): erreichtes Niveau eines exakten Intervalls, das von 95 % abweicht („98,4 %-KI“), mit einer Nachkommastelle. */
export const ki = (lo: string, hi: string, niveau?: number) => {
  const n = niveau === undefined ? '' : dez(niveau.toFixed(1));
  return `${niveau === undefined ? L('95 %-KI', '95% CI') : L(`${n} %-KI`, `${n}% CI`)} ${iv(lo, hi)}`;
};
/** Zahl mit Prozentzeichen; `zahl` ist schon formatiert („34,5“). */
export const proz = (zahl: string) => (profil().prozVorn ? `%${zahl}` : `${zahl}${profil().proz}%`);
/** Eingesetzter Name in Anführungszeichen der Sprache. */
export const zitat = (t: string) => { const [a, b] = profil().zitat; return `${a}${t}${b}`; };
/** „a, b und c“ - das „und“ ist ein Text (übersetzt), die Kommas bleiben. */
export const aufzaehlung = (l: string[]) => (l.length < 2 ? (l[0] ?? '') : `${l.slice(0, -1).join(', ')} ${L('und', 'and')} ${l.at(-1)}`);
/** Gebietsschema für Intl. */
export const ort = () => profil().ort;
/** Ganze Zahl mit Tausendertrennung nach dem Sprachprofil („33.275“ / „33,275“). */
export const ganzZahl = (n: number): string => n.toLocaleString(profil().ort);

/** Tausendertrenner der Sprache für große ausgeschriebene Zahlen („.“ Deutsch, „,“ Englisch, schmales Leerzeichen Französisch …), aus Intl nach dem Gebietsschema des Profils.
 *  Fällt er mit dem gewählten Dezimalzeichen zusammen („Zahlen: Punkt“ in einer Sprache mit Punkt als Trenner), gilt das andere Zeichen. */
export const tausender = (): string => {
  const g = new Intl.NumberFormat(profil().ort).formatToParts(1e9).find(p => p.type === 'group')?.value ?? ',';
  return g === dezimal() ? (dezimal() === ',' ? '.' : ',') : g;
};
