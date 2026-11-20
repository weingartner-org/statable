import { istFehlend } from './fehlend';
import type { OutputItem } from '../engine/types';
import { finde, spalte } from './tabelle';
import { leseFehlendAnzeige, type FehlendBereich } from './fehlend';

/** Eine Spalte, wie die Engine sie kennt (aus DISPLAY DICTIONARY). */
export interface Spalte {
  name: string; bezeichnung: string; art: 'zahl' | 'text' | 'datum'; niveau: 'nominal' | 'ordinal' | 'metrisch';
  format: string; /** Einzelwerte für „keine Angabe“ */ fehlend: number[]; /** dazu bei Zahlen höchstens ein Bereich (S-F2 B); ±Infinity = offen. Auswerten nur über lib/fehlend.ts */ fehlendBereich?: FehlendBereich; fehlendText: string; werteLabels: Record<string, string>;
  /** Nur Text: der leere Text ist ein GÜLTIGER Wert (so kommt es aus einer .sav, wie in SPSS). Fehlt die Angabe oder ist sie false, gilt der leere Text als fehlend (CSV, Excel, Eingabe). Der Neuaufbau (eingabe.ts) erhält die Herkunft. */
  leerGueltig?: boolean;
  /** Die Spalte stammt aus dem Import qualitativer Codierungen (Code-Matrix, Segmenttabelle): 0 heißt dort „nicht erwähnt“. Fehlt = keine Code-Spalte. Im Projekt über `codeSpalten` gemerkt (lib/codespalten.ts). */
  herkunft?: 'codes';
}

/** Sondercodes für Stata-Fehlende (.a bis .z): stata.ts vergibt -9991, -9992, … als „fehlend“. Die Zahl soll nie in der Oberfläche stehen, nur die Beschriftung. */
export const istSondercode = (sp: Pick<Spalte, 'fehlend' | 'fehlendBereich'>, v: number | string) => typeof v === 'number' && v <= -9991 && v >= -9999 && istFehlend(sp, v);

/** Datums- und Zeitformate der Engine: die Engine liefert sie als Text ("01.09.2026"), nicht als Zahl. */
const DATUMSFORMAT = /^(DATE|ADATE|EDATE|JDATE|SDATE|QYR|MOYR|WKYR|DATETIME|YMDHMS|MTIME|TIME|DTIME|WKDAY|MONTH)/;

export function leseVerzeichnis(items: OutputItem[], nachfrage: Record<string, OutputItem[]> = {}): Spalte[] {
  const v = finde(items, /^Variables$/); if (!v) return [];
  const k = { name: spalte(v, /^Name$/), label: spalte(v, /^Label$/), niveau: spalte(v, /^Measurement Level$/), format: spalte(v, /^Print Format$/), fehl: spalte(v, /^Missing Values$/) };
  const spalten: Spalte[] = [];
  for (let i = v.tabelle.headRows[0] || 1; i < v.t.length; i++) {
    const z = v.t[i]!; const name = z[k.name]; if (!name) continue;
    const format = z[k.format] ?? '';
    // Leere Textzelle als fehlend (MISSING VALUES x ('')) zeigt PSPP als "    " - in der Oberfläche steht dann nichts.
    const roh = z[k.fehl] ?? '';
    const fehlendText = roh.split(/[;,]\s*/).filter(x => x.trim() && !/^"\s*"$/.test(x.trim())).join(roh.includes(';') ? '; ' : ', ');
    const leerFehlend = roh.split(/[;,]\s*/).some(x => /^"\s*"$/.test(x.trim()));
    const art = /^A/.test(format) ? 'text' : DATUMSFORMAT.test(format) ? 'datum' : 'zahl';
    const codes = art === 'zahl' && fehlendText !== '' ? leseFehlendAnzeige(fehlendText) : { fehlend: [] as number[] };
    spalten.push({
      name, bezeichnung: z[k.label] ?? '', format,
      art,
      niveau: /Scale/i.test(z[k.niveau] ?? '') ? 'metrisch' : /Ordinal/i.test(z[k.niveau] ?? '') ? 'ordinal' : 'nominal',
      fehlendText, ...codes,
      ...(art === 'text' ? { leerGueltig: !leerFehlend } : {}),
      werteLabels: {}
    });
  }
  // PSPP nennt in „Value Labels“ die Bezeichnung statt des Namens, wenn es eine gibt. Zugeordnet wird darum nur, wenn die Anzeige eindeutig ist; sonst (Bezeichnung der Spalte a =
  // Name oder Bezeichnung der Spalte b) fragt der Aufrufer je Spalte nach (`nachfrage[name]` = Ausgabe von DISPLAY DICTIONARY /VARIABLES=name) - nie über die Bezeichnung raten.
  const anzeige = (x: Spalte) => x.bezeichnung || x.name;
  const labelsLesen = (its: OutputItem[], nur?: Spalte) => {
    const wl = finde(its, /^Value Labels$/);
    if (!wl) return;
    let s: Spalte | undefined;
    for (let i = wl.tabelle.headRows[0] || 1; i < wl.t.length; i++) {
      const [var_, wert, label] = [wl.t[i]![0] ?? '', wl.t[i]![1] ?? '', wl.t[i]![2] ?? ''];
      if (var_) { const treffer = spalten.filter(x => anzeige(x) === var_); s = nur ?? (treffer.length === 1 ? treffer[0] : undefined); }
      if (s && wert !== '') {
        // D14: PSPP zeigt den Schlüssel im Format der Spalte („1.00“) - als Zahl ablegen, sonst findet ihn keine Tabelle und kein Export.
        const schluessel = wert.replace(/^"|"$/g, '');
        s.werteLabels[s.art === 'zahl' && schluessel.trim() !== '' && Number.isFinite(Number(schluessel)) ? String(Number(schluessel)) : schluessel] = label;
      }
    }
  };
  labelsLesen(items);
  for (const [name, its] of Object.entries(nachfrage)) { const sp = spalten.find(x => x.name === name); if (sp) labelsLesen(its, sp); }
  return spalten;
}

/** Name, wie Menschen ihn lesen: Bezeichnung, sonst Name. Lange Fragebogen-Texte werden gekürzt. */
export const lesbar = (s: Spalte | undefined, kurz = false) => {
  if (!s) return '';
  const b = s.bezeichnung || s.name;
  return kurz && b.length > 48 ? b.slice(0, 46).trimEnd() + ' …' : b;
};

/** Namen der Spalten, deren Anzeige in „Value Labels“ nicht eindeutig ist (zwei Spalten zeigen denselben Text als Bezeichnung oder Name): für sie braucht `leseVerzeichnis` eine Nachfrage je Spalte. */
export function mehrdeutigeSpalten(items: OutputItem[]): string[] {
  const sp = leseVerzeichnis(items);   // Namen und Bezeichnungen; Labels sind hier unwichtig
  const anzeige = (x: Spalte) => x.bezeichnung || x.name;
  const zaehl = new Map<string, number>();
  for (const x of sp) zaehl.set(anzeige(x), (zaehl.get(anzeige(x)) ?? 0) + 1);
  return sp.filter(x => (zaehl.get(anzeige(x)) ?? 0) > 1).map(x => x.name);
}
