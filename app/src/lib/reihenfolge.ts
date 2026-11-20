/**
 * Geordnete Kategorien als Text (Bildungsabschluss: kein Abschluss, Hauptschule, Realschule, Abitur, Hochschule) sortiert die Engine
 * alphabetisch, und für Spearman, Kreuztabellen und kumulierte Prozente ist das falsch (Prüfung A11).
 * Lösung wie bei einer SAV-Datei mit Wertelabels: die Person legt die Reihenfolge fest, die Spalte wird zu den Zahlen 1 … k
 * mit den Kategorien als Wertelabels (1 = kein Abschluss …). Alles Weitere (Häufigkeiten, Kreuztabelle, Diagramme, Spearman) kennt das schon.
 * Dieses Modul ist reine Rechnung ohne Oberfläche: Kategorien einer Spalte, Vorschlag der Reihenfolge, Umwandlung.
 */
import { istFehlend, fehlendAnzeige } from './fehlend';
import type { Spalte } from './verzeichnis';
import { ort } from '../i18n/profil';
import type { Wert } from './eingabe';
import { textCodes } from './eingabe';

/** Eine Kategorie der Liste: `schluessel` = Wert in der Spalte (Text, oder der Zahlen-Code als Text), `text` = was die Person liest. */
export interface Kategorie { schluessel: string; text: string; anzahl: number }

const leer = (v: Wert | undefined) => v === null || v === undefined || v === '';

/**
 * Die Kategorien einer Spalte, die sich ordnen lassen, in der heutigen Reihenfolge (Text: alphabetisch, Zahl: nach Code).
 * Leere Felder und „keine Angabe“-Werte gehören nicht dazu. Mehr als `GRENZE` Kategorien: keine Liste (das ist keine Gruppenspalte).
 */
export const GRENZE = 30;
export function kategorien(sp: Spalte, spaltenIndex: number, zeilen: Wert[][]): Kategorie[] | null {
  if (sp.art === 'datum') return null;
  const zaehl = new Map<string, number>();
  const fehlendText = sp.art === 'text' ? new Set(textCodes(sp.fehlendText)) : new Set<string>();
  for (const z of zeilen) {
    const v = z[spaltenIndex];
    if (leer(v)) continue;
    if (sp.art === 'zahl') { if (typeof v !== 'number' || istFehlend(sp, v)) continue; }
    else if (fehlendText.has(String(v).trimEnd())) continue;
    const k = String(v); zaehl.set(k, (zaehl.get(k) ?? 0) + 1);
  }
  if (sp.art === 'zahl') {
    // Auch benannte Codes, die in den Daten (noch) nicht vorkommen, bleiben in der Liste
    for (const w of Object.keys(sp.werteLabels)) { const n = Number(w); if (Number.isFinite(n) && !istFehlend(sp, n) && !zaehl.has(String(n))) zaehl.set(String(n), 0); }
  }
  if (zaehl.size < 2 || zaehl.size > GRENZE) return null;
  const liste = [...zaehl].map(([schluessel, anzahl]): Kategorie => ({ schluessel, anzahl, text: sp.art === 'zahl' ? (sp.werteLabels[schluessel] ?? schluessel) : schluessel }));
  return sp.art === 'zahl' ? liste.sort((a, b) => Number(a.schluessel) - Number(b.schluessel)) : liste.sort((a, b) => a.text.localeCompare(b.text, ort()));
}

/** Kann die Person die Reihenfolge dieser Spalte festlegen? Text, oder benannte Zahlen-Codes (Stufen). Nur bei „Gruppen mit Reihenfolge“. */
export function ordnenMoeglich(sp: Spalte, spaltenIndex: number, zeilen: Wert[][]): boolean {
  if (sp.niveau !== 'ordinal') return false;
  if (sp.art === 'text') return !!kategorien(sp, spaltenIndex, zeilen);
  if (sp.art !== 'zahl') return false;
  const benannt = Object.keys(sp.werteLabels).filter(w => !istFehlend(sp, Number(w)));
  return benannt.length >= 2 && !!kategorien(sp, spaltenIndex, zeilen);
}

/* ---------- Vorschlag der Reihenfolge ---------- */

const norm = (t: string) => t.toLowerCase().replace(/[.,;:!?"„“()]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Bekannte Antwortskalen. Jede Stufe hat Schreibweisen (normalisiert); die Reihenfolge der Stufen ist die Ordnung von klein nach groß.
 * Teilmengen sind erlaubt („nie, selten, oft, immer“); die Stufen einer Spalte müssen aber alle in EINER Skala vorkommen.
 */
const SKALEN: { name: string; stufen: string[][] }[] = [
  { name: 'Häufigkeit', stufen: [['nie', 'niemals'], ['sehr selten'], ['selten', 'fast nie'], ['gelegentlich', 'manchmal', 'ab und zu', 'hin und wieder'], ['oft', 'häufig', 'meistens', 'fast immer'], ['sehr oft', 'sehr häufig'], ['immer', 'ständig', 'stets']] },
  { name: 'Zustimmung', stufen: [['stimme gar nicht zu', 'stimme überhaupt nicht zu', 'stimme ganz und gar nicht zu', 'stimme absolut nicht zu', 'trifft gar nicht zu', 'trifft überhaupt nicht zu', 'lehne stark ab', 'lehne völlig ab', 'strongly disagree'], ['stimme nicht zu', 'trifft nicht zu', 'lehne ab', 'disagree'], ['stimme eher nicht zu', 'trifft eher nicht zu', 'stimme weniger zu', 'trifft weniger zu'], ['teils teils', 'teils/teils', 'weder noch', 'weder/noch', 'unentschieden', 'neutral', 'neither agree nor disagree'], ['stimme eher zu', 'trifft eher zu'], ['stimme zu', 'trifft zu', 'agree'], ['stimme voll zu', 'stimme völlig zu', 'stimme voll und ganz zu', 'stimme vollkommen zu', 'stimme ganz zu', 'stimme stark zu', 'trifft voll zu', 'trifft völlig zu', 'trifft voll und ganz zu', 'trifft genau zu', 'strongly agree']] },
  { name: 'Bewertung', stufen: [['sehr schlecht', 'sehr unzufrieden', 'sehr unwichtig', 'sehr unwahrscheinlich', 'very poor', 'very dissatisfied'], ['schlecht', 'unzufrieden', 'unwichtig', 'unwahrscheinlich', 'poor', 'dissatisfied'], ['eher schlecht', 'eher unzufrieden', 'eher unwichtig'], ['mittel', 'mittelmäßig', 'mäßig', 'geht so', 'teils teils', 'teils/teils', 'weder noch', 'neutral', 'okay', 'fair'], ['eher gut', 'eher zufrieden', 'eher wichtig'], ['gut', 'zufrieden', 'wichtig', 'wahrscheinlich', 'good', 'satisfied'], ['sehr gut', 'sehr zufrieden', 'sehr wichtig', 'sehr wahrscheinlich', 'ausgezeichnet', 'very good', 'very satisfied']] },
  { name: 'Ausmaß', stufen: [['gar nicht', 'überhaupt nicht', 'kein', 'keine', 'not at all'], ['kaum', 'sehr wenig', 'sehr gering'], ['wenig', 'gering', 'niedrig', 'a little'], ['etwas', 'ein wenig', 'teilweise', 'somewhat'], ['mittel', 'mittelmäßig', 'mäßig', 'moderate'], ['ziemlich', 'recht', 'deutlich', 'quite'], ['stark', 'sehr', 'hoch', 'groß', 'high'], ['sehr stark', 'sehr hoch', 'sehr groß', 'extrem', 'völlig', 'ganz', 'vollständig', 'extremely']] },
  { name: 'Größe', stufen: [['sehr klein', 'sehr niedrig', 'sehr gering', 'sehr kurz', 'sehr jung'], ['klein', 'niedrig', 'gering', 'kurz', 'jung', 'low', 'small'], ['mittel', 'mittelgroß', 'mittelhoch', 'durchschnittlich', 'medium'], ['groß', 'hoch', 'lang', 'alt', 'high', 'large'], ['sehr groß', 'sehr hoch', 'sehr lang', 'sehr alt']] },
  { name: 'Bildung', stufen: [['kein abschluss', 'ohne abschluss', 'kein schulabschluss', 'ohne schulabschluss', 'keiner', 'no degree'], ['hauptschule', 'hauptschulabschluss', 'volksschule', 'pflichtschule', 'mittelschule', 'primary'], ['realschule', 'realschulabschluss', 'mittlere reife', 'mittlerer abschluss', 'mittlere schule', 'secondary'], ['berufsausbildung', 'lehre', 'ausbildung'], ['abitur', 'matura', 'hochschulreife', 'fachhochschulreife', 'fachabitur', 'gymnasium', 'high school', 'a-level'], ['hochschule', 'universität', 'universitaet', 'studium', 'fachhochschule', 'bachelor', 'university'], ['master', 'diplom', 'magister', 'staatsexamen'], ['promotion', 'doktor', 'doktorat', 'phd']] },
  { name: 'Wochentag', stufen: [['montag'], ['dienstag'], ['mittwoch'], ['donnerstag'], ['freitag'], ['samstag', 'sonnabend'], ['sonntag']] },
  { name: 'Monat', stufen: [['januar'], ['februar'], ['märz'], ['april'], ['mai'], ['juni'], ['juli'], ['august'], ['september'], ['oktober'], ['november'], ['dezember']] }
];

/** Erste Zahl im Text („18-24“ → 18, „unter 18“ → 17,5, „1 = nie“ → 1), sonst null. „unter/bis/weniger“ steht vor der Zahl selbst. */
function ersteZahl(t: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(t); if (!m) return null;
  const z = Number(m[0].replace(',', '.'));
  return /^(unter|bis|weniger|max|<)/.test(norm(t)) ? z - 0.5 : z;
}

export type Vorschlag = { reihenfolge: string[]; grund: 'skala' | 'zahl'; skala?: string };

/**
 * Schlägt eine Reihenfolge vor, wo sie erkennbar ist: bekannte Antwortskalen (nie … immer, kein Abschluss … Hochschule),
 * sonst Zahlen am Anfang der Kategorie („1 = nie“, „18-24“, „unter 20“). Sonst null - dann rät Statable nicht.
 */
export function schlageVor(texte: string[]): Vorschlag | null {
  if (texte.length < 2) return null;
  const n = texte.map(norm);
  for (const sk of SKALEN) {
    const pos = n.map(t => sk.stufen.findIndex(st => st.includes(t)));
    if (pos.some(p => p < 0) || new Set(pos).size !== pos.length) continue;
    return { reihenfolge: texte.map((t, i) => ({ t, p: pos[i]! })).sort((a, b) => a.p - b.p).map(x => x.t), grund: 'skala', skala: sk.name };
  }
  const zahlen = texte.map(ersteZahl);
  if (zahlen.every(z => z !== null) && new Set(zahlen).size === zahlen.length) {
    return { reihenfolge: texte.map((t, i) => ({ t, z: zahlen[i]! })).sort((a, b) => a.z - b.z).map(x => x.t), grund: 'zahl' };
  }
  return null;
}

/* ---------- Umwandlung ---------- */

export interface Geordnet { spalte: Spalte; werte: Wert[]; /** Zellen, die auf „fehlend“ gesetzt wurden (Wert war nicht in der Liste) */ verworfen: number }

/**
 * Wandelt die Spalte in die Zahlen 1 … k um. `reihenfolge` enthält die `schluessel` der Kategorien, kleinster Wert zuerst.
 * Text → Zahl (Format F8.0, Wertelabels = die Kategorien); schon benannte Zahlen-Codes werden neu durchnummeriert.
 * Alles, was nicht in der Liste steht (leer, „keine Angabe“), wird zu einem leeren Feld. Name, Bezeichnung und Niveau (ordinal) bleiben.
 * Ein alter „keine Angabe“-Zahlenwert bleibt erhalten, wenn er nicht mit 1 … k zusammenfällt (sonst: leeres Feld).
 */
export function ordneSpalte(sp: Spalte, spaltenIndex: number, zeilen: Wert[][], reihenfolge: { schluessel: string; text: string }[]): Geordnet {
  const code = new Map(reihenfolge.map((k, i) => [k.schluessel, i + 1]));
  const k = reihenfolge.length;
  // Ein Fehlend-Bereich bleibt nur, wenn er die neuen Codes 1 … k nicht trifft.
  const bereich = sp.art === 'zahl' && sp.fehlendBereich && (sp.fehlendBereich.bis < 1 || sp.fehlendBereich.von > k) ? sp.fehlendBereich : undefined;
  const behalte = sp.art === 'zahl' ? sp.fehlend.filter(f => !(Number.isInteger(f) && f >= 1 && f <= k)) : [];
  let verworfen = 0;
  const werte = zeilen.map((z): Wert => {
    const v = z[spaltenIndex];
    if (leer(v)) return null;
    const c = code.get(String(v));
    if (c !== undefined) return c;
    if (typeof v === 'number' && (behalte.includes(v) || (bereich && v >= bereich.von && v <= bereich.bis))) return v;
    verworfen++; return null;
  });
  const werteLabels = Object.fromEntries(reihenfolge.map((x, i) => [String(i + 1), x.text]));
  const fehlend = behalte.slice(0, bereich ? 1 : 3);
  return {
    spalte: { ...sp, art: 'zahl', niveau: 'ordinal', format: 'F8.0', werteLabels, fehlend, fehlendBereich: bereich, fehlendText: fehlendAnzeige({ fehlend, fehlendBereich: bereich }) },
    werte, verworfen
  };
}
