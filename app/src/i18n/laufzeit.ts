/**
 * Texte in der gewählten Sprache (Bauplan Sprachen, Phase 0.1).
 * Deutsch und Englisch stehen im Code (L(de, en) …). Jede andere Sprache steht in sprachen/<code>.json als Schlüssel → Text;
 * den Schlüssel und die eingesetzten Werte hängt beim Bau i18n/auszug.mjs an jeden Aufruf an. Fehlt ein Text, gilt Englisch.
 * Bewusst ohne Abhängigkeiten: auch lib/mediation.ts u. a. (ohne Sitzung) nutzen es.
 */
import { isoliere, isoliereFormeln } from './bidi';
export type Sprache = 'de' | 'en' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'el' | 'hu' | 'sv' | 'pl' | 'uk' | 'ro' | 'cs' | 'bg' | 'id' | 'vi' | 'tr' | 'bn' | 'ar' | 'fa' | 'pt-BR' | 'xx' | 'xr';

/** Name jeder Sprache in ihr selbst (für die Auswahl). „xx“ ist die Prüfsprache: jeder Text in [Klammern], 40 % länger. */
export const SPRACHNAMEN: Record<Sprache, string> = {
  de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', el: 'Ελληνικά',
  hu: 'Magyar', sv: 'Svenska', pl: 'Polski', uk: 'Українська', ro: 'Română', cs: 'Čeština', bg: 'Български',
  id: 'Bahasa Indonesia', vi: 'Tiếng Việt', tr: 'Türkçe', bn: 'বাংলা', ar: 'العربية', fa: 'فارسی', 'pt-BR': 'Português (Brasil)', xx: '[Prüfsprache]', xr: '[ابت Prüfsprache RTL تبا]'
};
/** In den Einstellungen wählbar und vom System übernommen (alle seit 09.10.2026, Johannes: ohne Fachperson, Korrektur über Rückmeldungen).
 *  Die Prüfsprache xx nur über ?sprache=xx. Gleiche Liste in public/lade-sprache.js (Ladebildschirm) - ein Test hält beide gleich. */
export const FREIGEGEBEN: Sprache[] = ['de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'hu', 'sv', 'pl', 'uk', 'cs', 'ro', 'bg'];
/** In Arbeit (Bauplan 7 Sprachen, 11.11.2026): nur über ?sprache=<code>, nicht in den Einstellungen und nicht vom System. Bei Freigabe von hier nach FREIGEGEBEN (und lade-sprache.js). */
export const IN_ARBEIT: Sprache[] = ['id', 'vi', 'tr', 'bn', 'ar', 'fa', 'pt-BR'];
/** Sprachen mit Schrift von rechts nach links (Welle R): `<html dir="rtl">`, Isolierung eingesetzter Werte (i18n/bidi.ts).
 *  Gleiche Liste in public/lade-sprache.js und als `richtung: 'rtl'` in i18n/profil.ts - ein Test hält alle drei gleich.
 *  xr = Prüfsprache von rechts nach links (nur ?sprache=xr), so lässt sich die Oberfläche ohne Übersetzung prüfen. */
export const RTL_SPRACHEN: Sprache[] = ['ar', 'fa', 'xr'];
export const istRtl = (sp: string): boolean => (RTL_SPRACHEN as string[]).includes(sp);
export const istSprache =(x: unknown): x is Sprache => typeof x === 'string' && x in SPRACHNAMEN;

/** Ein Text, oder bei Mehrzahl ein Text je Form von Intl.PluralRules (one, few, many, other). */
export type Eintrag = string | Partial<Record<Intl.LDMLPluralRule, string>>;
const lader = import.meta.glob<Record<string, Eintrag>>('./sprachen/*.json', { import: 'default' });
/** Bereiche einer Sprache: „kern“ (sprachen/<code>.json, beim Wählen der Sprache) und „hilfe“ (sprachen/<code>.hilfe.json, erst mit der Hilfe). */
export type Bereich = 'kern' | 'hilfe';
const datei = (sp: Sprache, b: Bereich) => `./sprachen/${sp}${b === 'kern' ? '' : '.' + b}.json`;
const bereiche: Partial<Record<Sprache, Set<Bereich>>> = {};
/** Landesvariante erbt von der Grundsprache (Bauplan 7 Sprachen): pt-BR.json enthält nur, was von pt.json abweicht. */
export const BASIS: Partial<Record<Sprache, Sprache>> = { 'pt-BR': 'pt' };
const tabellen: Partial<Record<Sprache, Record<string, Eintrag>>> = {};

/** Gibt es für diese Sprache eine Datei (oder steht sie im Code)? */
export const vorhanden = (sp: Sprache) => sp === 'de' || sp === 'en' || datei(sp, 'kern') in lader;
export const geladen = (sp: Sprache, b: Bereich = 'kern') => sp === 'de' || sp === 'en' || !!bereiche[sp]?.has(b) || !(datei(sp, b) in lader) && b !== 'kern';

/** Lädt die Sprachdatei (eigener Baustein, erst bei Bedarf; danach offline im Service Worker). */
export async function ladeSprache(sp: Sprache, b: Bereich = 'kern'): Promise<void> {
  if (geladen(sp, b)) return;
  const f = lader[datei(sp, b)];
  if (!f) throw new Error(`Keine Sprachdatei für ${sp} (${b})`);
  const basis = BASIS[sp], fb = basis ? lader[datei(basis, b)] : undefined;
  tabellen[sp] = { ...tabellen[sp], ...(fb ? await fb() : {}), ...(await f()) };
  (bereiche[sp] ??= new Set()).add(b);
}

/** Textpaar als Wert, gewählt erst beim Anzeigen: für Listen und Daten (Hilfe-Artikel, Beispiele), die beim Laden des Bausteins entstehen. */
export interface Paar { de: string; en: string; k?: string; w?: unknown[] }
export const P = (de: string, en: string, k?: string, w?: unknown[]): Paar => ({ de, en, k, w });
/** Ein Paar in Sprache `sp`. */
export const paarText = (sp: Sprache | string, p: Paar) => text(sp, p.de, p.en, p.k, p.w);

/** Der Text in Sprache `sp`. `k` und `w` hängt der Bau an (fehlen bei Aufrufen ohne festen Text: dann Englisch). */
export function text(sp: Sprache | string, de: string, en: string | undefined, k?: string, w?: unknown[]): string {
  if (sp === 'de') return de;
  if (sp !== 'en' && k) {
    const t = tabellen[sp as Sprache]?.[k];
    if (typeof t === 'string') return einsetzen(t, w, sp);
  }
  return en ?? de;
}
/** Dezimalzeichen der Sprache für eingesetzte Zahlen: die Werte kommen im englischen Format („0.30“); i18n/profil.ts setzt die Umwandlung (Abnahme 31.10. F13: ukrainisch „0.30“). */
export const zahlHaken: { dez: (zahl: string, sp: string) => string } = { dez: z => z };
/** Werte in die Platzhalter {0} … setzen. In einer Sprache von rechts nach links (RTL) wird jeder Wert isoliert (U+2068 … U+2069, i18n/bidi.ts) und jede Formel-Angabe der Vorlage („d = {0}“, „p < ,001“) ebenso -
 *  so zerfallen „t(97) = 2,31“ oder ein eingesetzter Spaltenname aus lateinischen Buchstaben nicht. In allen anderen Sprachen unverändert. */
export const einsetzen = (t: string, w?: unknown[], sp: string = 'en') => {
  const rtl = istRtl(sp);
  if (rtl) t = isoliereFormeln(t);
  return w ? t.replace(/\{(\d+)\}/g, (_, i) => { const v = String(w[+i]); const z = /^-?\d+\.\d+$/.test(v) ? zahlHaken.dez(v, sp) : v; return rtl ? isoliere(z) : z; }) : t;
};

/** Mehrzahl: Deutsch und Englisch wie bisher (Einzahl nur bei genau 1), jede andere Sprache nach ihren Regeln (Polnisch: one, few, many …). */
export function mehrzahl(sp: Sprache | string, n: number, de1: string, deN: string, en1: string, enN: string, k?: string, w?: unknown[]): string {
  if (sp === 'de') return n === 1 ? de1 : deN;
  if (sp !== 'en' && k) {
    const t = tabellen[sp as Sprache]?.[k];
    if (t && typeof t === 'object') {
      // Portugiesisch aus Portugal: 0 ist Mehrzahl („0 linhas“), in Brasilien (Intl 'pt') Einzahl
      const form = new Intl.PluralRules(sp === 'xx' || sp === 'xr' ? 'en' : sp === 'pt' || sp === 'pt-BR' ? 'pt-PT' : sp).select(n); // pt-BR wie pt-PT: „0 linhas“ ist auch in Brasilien üblich
      const f = t[form] ?? t.other;
      if (f !== undefined) return einsetzen(f, w, sp);
    }
  }
  return n === 1 ? en1 : enN;
}
