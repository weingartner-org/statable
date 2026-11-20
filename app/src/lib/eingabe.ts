/** Daten direkt eingeben: der Datensatz wird aus Spalten + Zeilen neu in der Engine aufgebaut.
 *  Alles, was zur Spalte gehört (Bezeichnung, Gruppen-Namen, „keine Angabe", Messniveau, Anzeigeformat), wird mitgegeben. */
import type { Spalte } from './verzeichnis';
import { zitWert } from './befehlstext';
import { psppName, profilDatum, einzeilig } from './einlesen';
import { L } from './sitzung.svelte';
import { dezimal, dez, profil } from '../i18n/profil';
import { kleinste, groesste } from './menge';
import { fehlendSyntax, hatFehlend, leseFehlendAnzeige, type FehlendQuelle } from './fehlend';

/** Die Codes einer Spalte; steht ein Bereich nur im Anzeigetext (Spalte von Hand gebaut), wird er von dort gelesen. */
const fehlendOhneText = (sp: Spalte): FehlendQuelle => (sp.fehlendBereich || !/THRU/i.test(sp.fehlendText) ? sp : { ...sp, ...leseFehlendAnzeige(sp.fehlendText) });

export type Wert = string | number | null;
export interface NeueSpalte { bezeichnung: string; art: 'zahl' | 'text' | 'datum'; gruppen?: string }

const zit = (t: string) => zitWert(einzeilig(t));
/** Zeilenumbrüche in Zellen werden Leerzeichen: PSPP trennt Fälle an jedem Umbruch, auch in Anführungszeichen (Abschlusstest D1). */
const csvFeld = (t: string) => { const e = einzeilig(t); return /[",]/.test(e) ? `"${e.replace(/"/g, '""')}"` : e; };
const bytes = (t: string) => new TextEncoder().encode(t).length;
const nachkomma = (v: number) => { const t = String(v); return t.includes('.') && !t.includes('e') ? t.split('.')[1]!.length : 0; };
/** Datumsformate, deren Werte als TT.MM.JJJJ in der Tabelle stehen (siehe sitzung: aktualisiere). */
const TAG = /^(ADATE|EDATE)/;

/** Text aus einem Eingabefeld → Wert für die Spalte. Komma oder Punkt als Dezimalzeichen; leer = fehlt. */
export function leseEingabe(sp: Pick<Spalte, 'art'>, t: string): { wert: Wert } | { fehler: string } {
  const s = t.trim();
  if (s === '') return { wert: null };
  if (sp.art === 'zahl') {
    // Dezimalkomma-Sprachen: Komma oder Punkt als Dezimalzeichen. Dezimalpunkt-Sprachen: Punkt; ein Komma vor genau drei Ziffern gilt als Tausendertrennzeichen ("1,200").
    // D3: Leerraum zwischen Ziffern ist keine Zahl („21 22 23“ wurde 212223). Nur „1 000“ (genau drei Ziffern nach dem Leerzeichen) gilt als Tausender.
    const zwischen = /\d\s+\d/.test(s);
    if (zwischen && !/^[-+]?\d{1,3}([ \u00a0\u202f]\d{3})+([.,]\d+)?$/.test(s)) return { fehler: L(`Hier stehen Zahlen. Bitte eine Zahl eingeben, z. B. 3 oder ${dez('2.5')}.`, `This column holds numbers. Please enter a number, for example 3 or ${dez('2.5')}.`) };
    const roh = s.replace(/\s/g, '');
    const tausend = dezimal() === '.' && /^-?\d{1,3}(?:,\d{3})+(\.\d+)?$/.test(roh);
    const n = Number(tausend ? roh.replace(/,/g, '') : roh.replace(/^(-?\d+),(\d+)$/, '$1.$2'));
    return Number.isFinite(n) ? { wert: n } : { fehler: L(`Hier stehen Zahlen. Bitte eine Zahl eingeben, z. B. 3 oder ${dez('2.5')}.`, `This column holds numbers. Please enter a number, for example 3 or ${dez('2.5')}.`) };
  }
  if (sp.art === 'datum') {
    const { folge, trenner } = profil().datum;
    const bsp = (folge === 'TMJ' ? ['02', '09', '2026'] : folge === 'MTJ' ? ['09', '02', '2026'] : ['2026', '09', '02']).join(trenner) + (folge === 'JMT' && trenner === '.' ? '.' : '');
    const fehlerFormat = L(`Bitte ein Datum wie ${bsp} eingeben.`, `Please enter a date like ${bsp} or 2026-09-02.`);
    let tag: number, mon: number, jahr: number;
    const jj = (x: string) => (x.length === 2 ? 2000 + Number(x) : Number(x));
    // Reihenfolge der Sprache (Sprachprofil), TT.MM.JJJJ und JJJJ-MM-TT gehen immer.
    const punkt = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    const p = punkt || iso ? null : profilDatum(s, true);
    if (punkt) [tag, mon, jahr] = [Number(punkt[1]), Number(punkt[2]), jj(punkt[3]!)];
    else if (iso) [jahr, mon, tag] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else if (p) ({ tag, mon, jahr } = p);
    else return { fehler: fehlerFormat };
    const d = new Date(jahr, mon - 1, tag);
    if (d.getMonth() !== mon - 1 || d.getDate() !== tag) return { fehler: L('Dieses Datum gibt es nicht.', "That date doesn't exist.") };
    return { wert: `${String(tag).padStart(2, '0')}.${String(mon).padStart(2, '0')}.${jahr}` };
  }
  return { wert: s };
}

/** Zerlegt eingefügten Text (Tabulator zwischen Spalten, Zeilenumbruch zwischen Zeilen, Zellen in Anführungszeichen wie aus Excel) in Zeilen und Zellen. */
function zerlegeEinfuegen(text: string): string[][] {
  const zeilen: string[][] = [];
  let zeile: string[] = [], feld = '', inAnf = false, imFeld = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inAnf) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inAnf = false; } else feld += c; continue; }
    if (c === '"' && !imFeld) { inAnf = true; imFeld = true; }
    else if (c === '\t') { zeile.push(feld); feld = ''; imFeld = false; }
    else if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) { zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ''; imFeld = false; }
    else if (c !== '\r') { feld += c; imFeld = true; }
  }
  if (feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  return zeilen;
}

/**
 * Einfügen aus der Zwischenablage (Excel: Zellen mit Tabulator und Zeilenumbruch) ab einer Zelle: verteilt auf Zeilen und Spalten,
 * legt am Ende neue Zeilen an und prüft jeden Wert wie eine Eingabe (D3). null = ein einzelner Wert, den das Feld selbst einfügt.
 * Bei einem Fehler wird nichts eingefügt.
 */
export function leseEinfuegen(spalten: Pick<Spalte, 'art' | 'werteLabels'>[], zeilen: Wert[][], text: string, ab: { zeile: number; spalte: number }): { zeilen: Wert[][]; anzahl: number } | { fehler: string } | null {
  const bloecke = zerlegeEinfuegen(text);
  if (bloecke.length === 1 && bloecke[0]!.length === 1) return null;
  if (!bloecke.length) return null;
  const breit = Math.max(...bloecke.map(z => z.length));
  if (ab.spalte + breit > spalten.length) return { fehler: L(`Die eingefügten Daten haben ${breit} Spalten, ab hier sind aber nur ${spalten.length - ab.spalte} da. Es wurde nichts eingefügt.`, `The pasted data has ${breit} columns, but only ${spalten.length - ab.spalte} are left from here. Nothing was pasted.`) };
  const neu = zeilen.map(z => [...z]);
  let anzahl = 0;
  for (const [r, zl] of bloecke.entries()) {
    while (neu.length <= ab.zeile + r) neu.push(spalten.map(() => null));
    for (const [c, roh] of zl.entries()) {
      const i = ab.spalte + c, sp = spalten[i]!;
      let ein = einzeilig(roh);
      // Bei Gruppen mit Zahlen darf der Name stehen: „ja“ statt 1 (wie beim Tippen).
      if (sp.art === 'zahl') { const k = Object.entries(sp.werteLabels).find(([, l]) => l.toLowerCase() === ein.trim().toLowerCase()); if (k) ein = k[0]; }
      const w = leseEingabe(sp, ein);
      if ('fehler' in w) return { fehler: L(`Nichts eingefügt. Zeile ${ab.zeile + r + 1}, Spalte ${i + 1}: ${w.fehler}`, `Nothing pasted. Row ${ab.zeile + r + 1}, column ${i + 1}: ${w.fehler}`) };
      neu[ab.zeile + r]![i] = w.wert; anzahl++;
    }
  }
  return { zeilen: neu, anzahl };
}

/** „Keine Angabe steht für“: Codes trennen an Semikolon, Leerraum und am Komma, wenn nicht Ziffern auf beiden Seiten stehen („60,34“ ist eine Zahl). */
export function leseFehlendCodes(t: string): string[] {
  const aus: string[] = []; let teil = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    const komma = c === ',' && !(/\d/.test(t[i - 1] ?? '') && /\d/.test(t[i + 1] ?? ''));
    if (c === ';' || komma || /\s/.test(c)) { if (teil) aus.push(teil); teil = ''; } else teil += c;
  }
  if (teil) aus.push(teil);
  return aus.map(x => x.replace(/^(-?\d+),(\d+)$/, '$1.$2'));
}

/** Neue Spalte aus dem Formular → Spalte mit gültigem Namen. „gruppen": "1 = ja, 2 = nein" setzt Gruppen-Namen. */
export function baueSpalte(n: NeueSpalte, vorhandene: string[]): Spalte {
  const name = psppName(n.bezeichnung, new Set(vorhandene.map(x => x.toLowerCase())), vorhandene.length + 1);
  const werteLabels: Record<string, string> = {};
  for (const teil of (n.gruppen ?? '').split(/[,;\n]/)) {
    const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*=\s*(.+?)\s*$/.exec(teil);
    if (m) werteLabels[String(Number(m[1]!.replace(',', '.')))] = m[2]!;
  }
  const gruppen = Object.keys(werteLabels).length > 0;
  return {
    name, bezeichnung: n.bezeichnung.trim() === name ? '' : n.bezeichnung.trim(), art: n.art,
    niveau: n.art === 'zahl' && !gruppen ? 'metrisch' : 'nominal',
    format: n.art === 'zahl' ? 'F8.0' : n.art === 'datum' ? 'EDATE10' : 'A1',
    fehlend: [], fehlendText: '', werteLabels
  };
}

/** Text-Codes für „Keine Angabe“ aus der Anzeige von PSPP (`"k.A."; "n.a."`). */
export const textCodes = (t: string) => t.split(/[;,]\s*/).map(x => x.trim().replace(/^"(.*)"$/, '$1').trimEnd()).filter(Boolean);

/** Syntax + CSV, die den Datensatz genau so in der Engine anlegen. */
export function neuAufbauen(spalten: Spalte[], zeilen: Wert[][]): { syntax: string; csv: Uint8Array } {
  const plan = spalten.map((sp, i) => {
    const werte = zeilen.map(z => z[i] ?? null).filter(v => v !== null);
    if (sp.art === 'zahl') {
      const alt = /^[A-Z]+(\d+)\.(\d+)$/.exec(sp.format);
      const dez = Math.min(6, Math.max(alt ? Number(alt[2]) : 0, groesste(werte.map(v => (typeof v === 'number' ? nachkomma(v) : 0)))));
      const breite = Math.max(alt ? Number(alt[1]) : 8, dez + 3);
      return { sp, ein: 'F40.10', aus: `${/^(F|COMMA|DOT|DOLLAR|PCT|E|N)/.test(sp.format) ? sp.format.replace(/[\d.]+$/, '') : 'F'}${breite}.${dez}` };
    }
    // Datum mit Uhrzeit (S-F2 D3): die Engine schreibt „MM/TT/JJJJ hh:mm:ss“, die Tabelle zeigt „TT.MM.JJJJ hh:mm:ss“; zurück in die Engine geht es als „JJJJ-MM-TT hh:mm:ss“.
    if (sp.art === 'datum') return /^(YMDHMS|DATETIME)/i.test(sp.format) ? { sp, ein: 'YMDHMS20.0', aus: sp.format } : TAG.test(sp.format) ? { sp, ein: 'EDATE10', aus: sp.format } : { sp, ein: sp.format, aus: sp.format };
    const alt = /^A(\d+)$/.exec(sp.format);
    const breite = Math.min(32767, Math.max(alt ? Number(alt[1]) : 1, 1, groesste(werte.map(v => bytes(String(v))))));
    return { sp, ein: `A${breite}`, aus: `A${breite}` };
  });
  const text = [plan.map(p => p.sp.name).join(','), ...zeilen.map(z => plan.map((p, i) => {
    const v = z[i] ?? null;
    if (v === null) return '';
    if (p.sp.art === 'zahl') return typeof v === 'number' ? String(v) : '';
    if (p.ein === 'YMDHMS20.0') return String(v).replace(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}:\d{2}(?::\d{2})?))?$/, (_, t, m, j, z) => `${j}-${m}-${t} ${z ?? '00:00:00'}`);
    return csvFeld(String(v));
  }).join(','))].join('\n') + '\n';

  const zahl = (sp: Spalte) => sp.art === 'zahl';
  const zeilenSyntax = [
    `GET DATA /TYPE=TXT /FILE='/eingabe.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /QUALIFIER='"'`,
    `  /VARIABLES=${plan.map(p => `${p.sp.name} ${p.ein}`).join(' ')}.`,
    `FORMATS ${plan.map(p => `${p.sp.name} (${p.aus})`).join(' ')}.`,
    ...spalten.filter(sp => sp.bezeichnung).map(sp => `VARIABLE LABELS ${sp.name} ${zit(sp.bezeichnung.slice(0, 250))}.`),
    ...spalten.filter(sp => Object.keys(sp.werteLabels).length).map(sp =>
      `VALUE LABELS ${sp.name} ${Object.entries(sp.werteLabels).map(([w, l]) => `${zahl(sp) ? String(Number(w)) : zit(w)} ${zit(l.slice(0, 120))}`).join(' ')}.`),
    // Wie in SPSS: bis zu drei Einzelwerte ODER ein Bereich und höchstens ein Einzelwert (S-F2 B); der Bereich geht beim Neuaufbau nicht verloren.
    ...spalten.filter(sp => zahl(sp) && hatFehlend(fehlendOhneText(sp))).map(sp => `MISSING VALUES ${sp.name} (${fehlendSyntax(fehlendOhneText(sp))}).`),
    // Leere Textzellen sind fehlend, nicht eine eigene Kategorie (Prüfung A1: sonst χ²(4, N = 400) statt χ²(2, N = 380), und die Aussage dreht sich).
    // Eigene Text-Codes („k.A.“) bleiben beim Neuaufbau erhalten, die leere Zelle immer dabei (höchstens drei Werte).
    // Kam der Text aus einer .sav, in der der leere Text gültig ist (`leerGueltig`), bleibt er gültig (S-F2 D4); sonst ist die leere Zelle dabei.
    ...spalten.filter(sp => sp.art === 'text').flatMap(sp => {
      const codes = [...(sp.leerGueltig ? [] : ['']), ...textCodes(sp.fehlendText)].slice(0, 3);
      return codes.length ? [`MISSING VALUES ${sp.name} (${codes.map(zit).join(', ')}).`] : [];
    }),
    ...(['nominal', 'ordinal', 'metrisch'] as const).flatMap(n => {
      const v = spalten.filter(sp => sp.niveau === n && (n !== 'metrisch' || zahl(sp)));
      return v.length ? [`VARIABLE LEVEL ${v.map(sp => sp.name).join(' ')} (${n === 'metrisch' ? 'SCALE' : n.toUpperCase()}).`] : [];
    }),
    'EXECUTE.'
  ];
  return { syntax: zeilenSyntax.join('\n'), csv: new TextEncoder().encode(text) };
}
