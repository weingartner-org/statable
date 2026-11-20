/**
 * Schöne Exporte: Excel (exceljs, nur bei Bedarf geladen) und Word (docx). Muster wie in Tastenflow
 * (Kopf mit Zeichen, Farben der App, Arial - auf Windows und Mac gleich), aber eigener Code (Entkopplung).
 */
import { teile as teileKursiv } from './kursiv';
import type * as ExcelJS from 'exceljs';
import type { Cell, OutputItem, TableItem } from '../engine/types';
import { localizeCell, isPValueHeader, translate, ERGAENZUNG_DE, type Dict } from '../output/format-de';
import { ladeWoerterbuch, woerterbuch, woerterbuchSprache } from '../output/woerterbuch.svelte';
import { STANDARD_ANSICHT, istGesamt as istGesamtWort, tonHex, tonFett, type Ansicht, type Ton } from './tabellenfarben';
import { s, melde, motor, L, d, Lp, aktuelleSprache, nutzbareSkalen, type Blatt } from './sitzung.svelte';
import { mitVariablensets } from './variablensets';
import { lesbar } from './verzeichnis';
import { diagrammBilder, type Png } from './diagrammbild';
import type { BildText } from './bildtext/typen';
import { sauber } from './bildtext/zahlen';
import { berichtSatz, berichtTabellen } from './berichtsatz';
import { rechenText } from './eigenercode';
import { dateiname } from './dateiname';
import { tabellenNummer } from './tabellennummer';
import { istVeraltet } from './blattstand';
import { gewichtFuss } from './gewichte';
import { kleinste, groesste } from './menge';
import { kopfTipp } from './kopftipps';
import { INTEGRATION_FELDER, integrationAusgefuellt, integrationFrage } from './integration';
import { istEinfach, pivotiere, tabellenSchluessel } from './pivot';
import { waehleStufe, breitenVerteilen, arialBreite, type Stufe } from './tabellenbreite';
import { wordFuss, excelFuss } from './dokumentmarke';
import { dezimal, ort, profil, mitNull, tausender } from '../i18n/profil';
/** Schriftstufen für Tabellen in Word: größte zuerst; Innenabstand der Zelle links plus rechts in Twips. */
const STUFEN_WORD: Stufe[] = [{ schrift: 10, polster: 216 }, { schrift: 9, polster: 160 }, { schrift: 8, polster: 120 }, { schrift: 7.5, polster: 100 }, { schrift: 7, polster: 80 }];

const FARBE = { akzent: '17756A', akzentHell: 'E2F0EC', tinte: '1D2530', tinte2: '4C5661', linie: 'DDD8CF', grund: 'F7F5F0', zebra: 'FBFAF7' };
const SCHRIFT = 'Arial';
const argb = (h: string) => `FF${h}`;
/** Heutiges Datum: Deutsch 09.10.2026, Englisch Oct 9, 2026, jede andere Sprache mit Monatsname in ihrem Gebietsschema. */
export const heute = () => new Date().toLocaleDateString(ort(), aktuelleSprache() === 'de' /* Sprache: Deutsch schreibt Tag und Monat als Zahl */ ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
/** Excel-Zahlenformat für Datumsspalten nach dem Sprachprofil: dd.mm.yyyy, mm/dd/yyyy, yyyy-mm-dd. */
const datumFormat = () => { const { folge, trenner } = profil().datum; return (folge === 'TMJ' ? ['dd', 'mm', 'yyyy'] : folge === 'MTJ' ? ['mm', 'dd', 'yyyy'] : ['yyyy', 'mm', 'dd']).join(trenner); };
/** Steht das Blatt auf alten Zahlen (Daten nach der Rechnung geändert)? Dann der Text, der im Export davorsteht; sonst ''. (Abnahme 4, B1) */
export const veraltetMarke = (b: Blatt) => (istVeraltet(b, s) ? L('veraltet - Daten wurden nach dieser Rechnung geändert', 'outdated - the data were changed after this calculation') : '');
export { dateiname };

export function herunterladen(bytes: ArrayBuffer | Uint8Array, name: string, typ: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: typ }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Neue Excel-Mappe mit Titel und Sprache (Barrierefreiheit, Welle 5). Kein Logo-Bild: Excel kennt für Bilder keinen Alternativtext, ein Bild ohne ihn ist ein Befund der Prüfung. */
async function neueMappe(titel: string) {
  const ExcelJSMod = (await import('exceljs')).default as unknown as typeof ExcelJS;
  const wb = new ExcelJSMod.Workbook(); wb.creator = 'Statable'; wb.created = new Date(); wb.title = titel; wb.subject = L('Erstellt mit Statable', 'Created with Statable');
  return { wb };
}

/** Blattname für Excel: höchstens 31 Zeichen, ohne die verbotenen Zeichen (: \ / ? * [ ]) und ohne Apostroph am Rand, eindeutig (Groß-/Kleinschreibung zählt nicht). */
export function blattName(wunsch: string, benutzt: Set<string>): string {
  let n = wunsch.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').replace(/^'+|'+$/g, '').trim() || L('Blatt', 'Sheet');
  const frei = (x: string) => !benutzt.has(x.toLowerCase());
  n = n.slice(0, 31).trim();
  for (let i = 2; !frei(n); i++) { const sfx = ` (${i})`; n = n.slice(0, 31 - sfx.length).trim() + sfx; }
  benutzt.add(n.toLowerCase());
  return n;
}

/** Titel und Untertitel in Zeile 1-2 (ohne verbundene Zellen: der Text läuft nach rechts über leere Nachbarn). Gibt die Zeile zurück, in der die Kopfzeile der Tabelle steht. */
function kopf(ws: ExcelJS.Worksheet, titel: string, unter: string): number {
  ws.getRow(1).height = 24; ws.getRow(2).height = 16;
  const t = ws.getCell(1, 1); t.value = `Statable · ${titel}`; t.font = { name: SCHRIFT, size: 14, bold: true, color: { argb: argb(FARBE.akzent) } }; t.alignment = { vertical: 'middle' };
  const u = ws.getCell(2, 1); u.value = unter; u.font = { name: SCHRIFT, size: 9, color: { argb: argb(FARBE.tinte2) } };
  return 3;
}
function kopfZelle(c: ExcelJS.Cell) {
  c.font = { name: SCHRIFT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(FARBE.akzent) } };
  c.alignment = { vertical: 'middle', wrapText: true };
  c.border = { bottom: { style: 'thin', color: { argb: argb(FARBE.akzent) } } };
}

/** Die Daten als gestaltete Excel-Datei: Blatt "Daten" und Blatt "Spalten" (Codebuch). */
/** "02.09.2026" → echtes Datum für Excel (ExcelJS rechnet in UTC). */
const alsDatum = (v: string | number | null) => {
  const m = typeof v === 'string' ? /^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(v) : null;
  return m ? new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))) : v;   // die Uhrzeit bleibt, wie sie dasteht (ExcelJS rechnet in UTC)
};

/** Daten als SPSS-Datei - mit allen Bezeichnungen, Gruppen und „keine Angabe". Öffnet in SPSS, PSPP, jamovi, JASP.
 *  Festgelegte Skalen gehen als SPSS-Variablensets mit (SPSS: Extras > Variablensets verwenden). */
export async function exportiereDatenSav() {
  if (!s.projekt) return;
  const { bytes } = await (await motor()).exportSav();
  const skalen = nutzbareSkalen();
  herunterladen(mitVariablensets(bytes, skalen.map(x => ({ name: x.name, spalten: x.fragen }))), `${s.projekt.name}.sav`, 'application/x-spss-sav');
  const nS = skalen.length;
  melde(nS ? Lp(nS, `SPSS-Datei gespeichert, mit ${nS} Skala als Variablenset. Sie liegt bei den Downloads.`, `SPSS-Datei gespeichert, mit ${nS} Skalen als Variablenset. Sie liegt bei den Downloads.`, `SPSS file saved, with ${nS} scale as variable sets. You will find it in your downloads.`, `SPSS file saved, with ${nS} scales as variable sets. You will find it in your downloads.`)
    : L('SPSS-Datei gespeichert. Sie liegt bei den Downloads.', 'SPSS file saved. You will find it in your downloads.'));
}

/** Daten als CSV (UTF-8 mit Markierung, damit Excel die Umlaute richtig liest; Datum als JJJJ-MM-TT). Mit Dezimalkomma (Sprachprofil, Einstellung „Zahlen“): Semikolon als Trenner und Komma in den Zahlen, sonst Komma und Punkt.
 *  Mit Codes: so, wie die Zahlen in den Daten stehen. Mit Beschriftungen: „1“ wird zu „weiblich“. Die Kopfzeile trägt immer die Spaltennamen. */
/** Excel liest eine Zelle, die mit = + - @ (oder Tab/Zeilenumbruch) beginnt, als Formel: Text aus Dateien bekommt darum ein Apostroph davor (übliche Regel, OWASP „CSV injection“). Zahlen bleiben Zahlen. */
export const csvNeutral = (t: string): string => (/^[=+\-@\t\r\n]/.test(t) ? "'" + t : t);

export function datenAlsCsv(mitBeschriftungen: boolean): string {
  // D13: Mit Dezimalkomma (deutsches Excel) ist die Listentrennung ein Semikolon, sonst ein Komma.
  const komma = dezimal() === ',', trenner = komma ? ';' : ',';
  const feld = (t: string) => (t.includes(trenner) || /["\r\n]/.test(t) || /^\s|\s$/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
  const zeile = (z: string[]) => z.map(feld).join(trenner);
  const zahlText = (v: number) => (komma ? String(v).replace('.', ',') : String(v));
  const kopfzeile = zeile(s.spalten.map(sp => csvNeutral(sp.name)));
  const koerper = s.zeilen.map(z => zeile(s.spalten.map((sp, i) => {
    const v = z[i] ?? null;
    if (v === null) return '';
    if (sp.art === 'datum') { const m = typeof v === 'string' ? /^(\d{2})\.(\d{2})\.(\d{4})( \d{2}:\d{2}:\d{2})?$/.exec(v) : null; return m ? `${m[3]}-${m[2]}-${m[1]}${m[4] ?? ''}` : csvNeutral(String(v)); }
    if (typeof v === 'number') return mitBeschriftungen && sp.werteLabels[String(v)] ? csvNeutral(sp.werteLabels[String(v)]!) : zahlText(v);
    return csvNeutral(v);
  })));
  return [kopfzeile, ...koerper].join('\r\n') + '\r\n';
}

export function exportiereDatenCsv(mitBeschriftungen: boolean) {
  if (!s.projekt) return;
  const bytes = new TextEncoder().encode('\uFEFF' + datenAlsCsv(mitBeschriftungen));
  herunterladen(bytes, `${dateiname(s.projekt.name)}${mitBeschriftungen ? ' - Beschriftungen' : ''}.csv`, 'text/csv;charset=utf-8');
  melde(L('CSV-Datei gespeichert. Sie liegt bei den Downloads.', 'CSV file saved. You will find it in your downloads.'));
}

/** Eine Liste (Kopf und Zeilen aus Text) als CSV - gleiche Regeln wie die Daten: UTF-8 mit Markierung, Semikolon bei Dezimalkomma. Für die Abweichungsliste von „Datensätze vergleichen“ (S-F2 D6). */
export function listeAlsCsv(kopf: string[], zeilen: string[][]): string {
  const trenner = dezimal() === ',' ? ';' : ',';
  const feld = (t: string) => (t.includes(trenner) || /["\r\n]/.test(t) || /^\s|\s$/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
  return [kopf, ...zeilen].map(z => z.map(feld).join(trenner)).join('\r\n') + '\r\n';
}
export function exportiereListeCsv(kopf: string[], zeilen: string[][], name: string) {
  herunterladen(new TextEncoder().encode('\uFEFF' + listeAlsCsv(kopf, zeilen)), `${dateiname(name)}.csv`, 'text/csv;charset=utf-8');
  melde(L('CSV-Datei gespeichert. Sie liegt bei den Downloads.', 'CSV file saved. You will find it in your downloads.'));
}

export async function exportiereDatenExcel() {
  if (!s.projekt) return;
  melde(L('Excel-Datei wird erstellt …', 'Creating the Excel file …'));
  const { wb } = await neueMappe(s.projekt.name);
  const ws = wb.addWorksheet(L('Daten', 'Data'), { views: [{ state: 'frozen', ySplit: 3, xSplit: 1 }] }); excelFuss(ws);
  const z0 = kopf(ws, s.projekt.name, `${Lp(s.zeilen.length, `${s.zeilen.length} Zeile`, `${s.zeilen.length} Zeilen`, `${s.zeilen.length} row`, `${s.zeilen.length} rows`)} · ${Lp(s.spalten.length, `${s.spalten.length} Spalte`, `${s.spalten.length} Spalten`, `${s.spalten.length} column`, `${s.spalten.length} columns`)} · ${L('erstellt am', 'created on')} ${heute()} · ${L('Original', 'Original')}: ${s.projekt.quelle}`);
  const kopfZeile = ws.getRow(z0);
  // Kopf wie im Original ("Note Prä"), wenn die Bezeichnung kurz ist; lange Fragetexte kommen in die Notiz.
  const kopfText = (sp: typeof s.spalten[number]) => sp.bezeichnung && sp.bezeichnung.length <= 40 ? sp.bezeichnung : sp.name;
  s.spalten.forEach((sp, i) => { const c = kopfZeile.getCell(i + 1); c.value = kopfText(sp); if (sp.bezeichnung && kopfText(sp) === sp.name) c.note = sp.bezeichnung; kopfZelle(c); });
  kopfZeile.height = 22;
  s.zeilen.forEach((z, r) => {
    const row = ws.getRow(z0 + 1 + r);
    z.forEach((v, i) => { const c = row.getCell(i + 1); c.value = s.spalten[i]?.art === 'datum' ? alsDatum(v) : v; if (s.spalten[i]?.art === 'datum' && c.value instanceof Date) c.numFmt = datumFormat() + (c.value.getUTCHours() || c.value.getUTCMinutes() || c.value.getUTCSeconds() || /\d:\d{2}:\d{2}$/.test(String(v)) ? ' hh:mm:ss' : ''); c.font = { name: SCHRIFT, size: 10 }; if (r % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(FARBE.zebra) } }; });
  });
  s.spalten.forEach((sp, i) => {
    const lang = Math.max(kopfText(sp).length, groesste(s.zeilen.slice(0, 500).map(z => String(z[i] ?? '').length)));
    ws.getColumn(i + 1).width = Math.min(40, Math.max(8, lang + 2));
    if (sp.art === 'zahl') ws.getColumn(i + 1).alignment = { horizontal: 'right' };
  });
  ws.autoFilter = { from: { row: z0, column: 1 }, to: { row: z0 + s.zeilen.length, column: s.spalten.length } };

  const cb = wb.addWorksheet(L('Spalten', 'Columns'), { views: [{ state: 'frozen', ySplit: 3 }] }); excelFuss(cb);
  const c0 = kopf(cb, L('Beschreibung der Spalten', 'Description of the columns'), d('Was in jeder Spalte steht - für dich und alle, die mit der Datei weiterarbeiten.', 'Was in jeder Spalte steht - für Sie und alle, die mit der Datei weiterarbeiten.', 'What each column holds - for you and for anyone else who works with the file.'));
  const koepfe = [L('Spalte', 'Column'), L('Bezeichnung', 'Label'), L('Art', 'Type'), L('Werte und ihre Bedeutung', 'Values and their meaning'), L('„Keine Angabe“', '"No answer"')];
  cb.getRow(c0).values = koepfe;
  koepfe.forEach((_, i) => kopfZelle(cb.getRow(c0).getCell(i + 1)));
  s.spalten.forEach((sp, r) => {
    const row = cb.getRow(c0 + 1 + r);
    row.values = [sp.name, sp.bezeichnung, sp.art === 'text' ? L('Text/Gruppen', 'Text/groups') : sp.art === 'datum' ? L('Datum', 'Date') : sp.niveau === 'metrisch' ? L('Zahl', 'Number') : L('Zahl (Gruppen)', 'Number (groups)'), Object.entries(sp.werteLabels).map(([w, l]) => `${w} = ${l}`).join('; '), sp.fehlendText];
    row.eachCell(c => { c.font = { name: SCHRIFT, size: 10 }; c.alignment = { wrapText: true, vertical: 'top' }; });
  });
  cb.autoFilter = { from: { row: c0, column: 1 }, to: { row: c0 + s.spalten.length, column: koepfe.length } };
  [16, 48, 16, 48, 14].forEach((w, i) => (cb.getColumn(i + 1).width = w));
  herunterladen(await wb.xlsx.writeBuffer(), `${dateiname(s.projekt.name)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- Ergebnis-Tabellen (PSPP) als Raster in Zahlen und Köpfen der gewählten Sprache ---------- */
/** Das PSPP-Wörterbuch der gewählten Sprache (output/woerterbuch.svelte.ts, erst bei Bedarf geladen). Englisch und Sprachen ohne Wörterbuch: leer, dann bleibt das englische Original. Der Name stammt aus der Zeit, als es nur Deutsch gab. */
export const deDict = (): Promise<Dict> => ladeWoerterbuch(aktuelleSprache());

export interface TabelleDe {
  titel: string; kopfZeilen: number;
  /** Wie viele Spalten links Zeilenüberschriften sind - vom Programm festgelegt (PSPP: `headCols[0]`), nie geraten. 0 = keine Zeilenüberschriften, auch nicht die erste Spalte. */
  kopfSpalten: number;
  /** `rs`: Zeilenspanne (nur wenn über 1); `ueber`: leerer Platzhalter unter einer Zelle mit Zeilenspanne aus einer Zeile darüber; `fn`: Fußnotenmarken der Zelle (PSPP). */
  zeilen: { t: string; kopf: boolean; span: number; zahl: boolean; ton?: Ton; tipp?: { text: string; id: string }; rs?: number; ueber?: boolean; fn?: string[] }[][]; fuss: string[]; /** Fingerabdruck der Tabelle und ob sie sich umbauen lässt (lib/pivot.ts) */ schluessel?: string; einfach?: boolean }
const GESAMT = new Set(['Total', 'Gesamt', 'Gesamtsumme']);
/**
 * Doppeltes weglassen (Johannes 09.10.): SPSS/PSPP schreiben in Kreuztabellen die Frage links noch einmal hin, obwohl sie schon im Titel
 * steht („Frage 30 … × Geschlecht“) - das kostet eine breite leere Spalte. Eine Kopfspalte links, in der unten nur Text aus dem Titel und
 * „Gesamt“ steht, fällt weg; „Gesamt“ rückt in die nächste Spalte. Gilt für Anzeige, Word, Excel und PDF (alle über tabelleDe).
 */
export function ohneDoppelteSpalte(it: TableItem): TableItem {
  const titel = it.title?.t ?? '';
  if (!titel || it.headCols[0] < 2) return it;
  const k = 0, koerper = it.cells.filter(c => c.r >= it.headRows[0] && c.c === k);
  const imTitel = koerper.filter(c => c.t.trim() && !GESAMT.has(c.t.trim()));
  if (!imTitel.length || !imTitel.every(c => c.t.trim().length >= 3 && titel.includes(c.t.trim()))) return it;
  if (it.cells.some(c => c.r < it.headRows[0] && c.c === k && c.cs === 1 && c.t.trim())) return it;   // Kopf nennt etwas nur für diese Spalte
  const belegt = (r: number, c: number) => it.cells.some(x => x.r <= r && r < x.r + x.rs && x.c <= c && c < x.c + x.cs && x.t.trim());
  const cells: Cell[] = [];
  for (const c of it.cells) {
    if (c.c === k && c.cs === 1) {
      if (c.r >= it.headRows[0] && GESAMT.has(c.t.trim()) && !belegt(c.r, k + 1)) cells.push({ ...c, c: 0 });
      continue;
    }
    if (c.c <= k && k < c.c + c.cs) cells.push({ ...c, cs: c.cs - 1 });
    else cells.push({ ...c, c: c.c - 1 });
  }
  // Eine nach links gerückte „Gesamt“-Zelle ersetzt eine leere Zelle an derselben Stelle.
  const ohneLeer = cells.filter(c => !(c.t.trim() === '' && cells.some(x => x !== c && x.r === c.r && x.c === c.c && GESAMT.has(x.t.trim()))));
  return { ...it, cols: it.cols - 1, headCols: [it.headCols[0] - 1, it.headCols[1]], cells: ohneLeer };
}

/**
 * Dasselbe waagrecht: die oberste Kopfzeile nennt nur die Frage aus dem Titel (über allen Antworten) und „Gesamt“. Sie fällt weg; „Gesamt“
 * rückt in die Zeile darunter, wenn dort Platz ist (sonst bleibt die Zeile stehen).
 */
export function ohneDoppelteZeile(it: TableItem): TableItem {
  const titel = it.title?.t ?? '';
  if (!titel || it.headRows[0] < 2) return it;
  const oben = it.cells.filter(c => c.r === 0 && c.t.trim());
  const frage = oben.filter(c => !GESAMT.has(c.t.trim()));
  if (!frage.length || !frage.every(c => c.rs === 1 && c.t.trim().length >= 3 && titel.includes(c.t.trim()))) return it;
  const leerDarunter = (c: Cell) => c.rs > 1 || !it.cells.some(x => x.r === 1 && x.c < c.c + c.cs && c.c < x.c + x.cs && x.t.trim());
  if (!oben.filter(c => GESAMT.has(c.t.trim())).every(leerDarunter)) return it;
  const cells: Cell[] = [];
  for (const c of it.cells) {
    if (c.r === 0) { if (c.rs > 1) cells.push({ ...c, rs: c.rs - 1 }); else if (GESAMT.has(c.t.trim())) cells.push(c); continue; }
    if (c.r === 1 && !c.t.trim() && it.cells.some(x => x.r === 0 && x.rs === 1 && GESAMT.has(x.t.trim()) && x.c === c.c)) continue;
    cells.push({ ...c, r: c.r - 1 });
  }
  return { ...it, rows: it.rows - 1, headRows: [it.headRows[0] - 1, it.headRows[1]], cells };
}

/** Beides: was schon im Titel steht, kommt in der Tabelle nicht noch einmal (Johannes 09.10.). */
export const ohneDoppeltes = (it: TableItem) => ohneDoppelteZeile(ohneDoppelteSpalte(it));

/**
 * Darf die Tabelle jetzt gezeichnet werden? Erst wenn das Wörterbuch der gewählten Sprache da ist: Sonst trägt sie für einen Augenblick den englischen
 * PSPP-Titel („Descriptives“), und ein Screenreader behält ihn als Tabellennamen, obwohl der Rahmen ringsum schon den übersetzten trägt (NVDA-Messung 07.11.).
 */
export const woerterbuchBereit = (dc: Dict | null, sp: string = aktuelleSprache()): boolean => dc !== null && (woerterbuchSprache(dc) ?? sp) === sp;

export function tabelleDe(roh: TableItem, dc: Dict | null, ohnePivot = false): TabelleDe {
  const it = ohneDoppeltes(roh);
  // Sprache: Englisch hat kein Wörterbuch (PSPP-Original). Das übergebene Wörterbuch gilt nur für seine Sprache. Hält die Anzeige nach einem Sprachwechsel noch das alte, nehmen wir das der gewählten Sprache
  // (kommt es erst, zeichnet sich die Tabelle neu). Englisch übersetzt nichts; die Ergänzungen im Code sind deutsch.
  const sp = aktuelleSprache(), von = dc ? woerterbuchSprache(dc) : undefined;
  const wb = sp === 'en' ? null : von !== undefined && von !== sp ? woerterbuch(sp) : dc;
  const erg: Dict = sp === 'de' ? ERGAENZUNG_DE : {};
  const schrift = { dezimal: dezimal(), proz: profil().proz, gruppe: tausender() };
  const grid: (typeof it.cells[number] | undefined)[][] = Array.from({ length: it.rows }, () => Array(it.cols).fill(undefined));
  for (const c of it.cells) grid[c.r]![c.c] = c;
  const kopfText = (col: number) => { for (let r = it.headRows[0] - 1; r >= 0; r--) for (const c of grid[r] ?? []) if (c && col >= c.c && col < c.c + c.cs) return c.t; return ''; };
  const zeilenKopf = (r: number) => (grid[r] ?? []).filter(c => c?.h).map(c => c!.t).join(' ');
  // Korrelationsmatrix (eigene Tabellen): Köpfe sind nur Nummern, alle Zahlen sind Korrelationen oder ihre Grenzen - nach APA ohne Null (n ist ganzzahlig und bleibt).
  const nurBisEins = /^Correlation (Matrix|Pairs)$/.test(it.label);
  let zeilen = grid.map((row, r) => row.flatMap((c, k): TabelleDe['zeilen'][number] => {
    if (!c) {
      // Überdeckt von einer Zelle aus derselben Zeile: fällt weg (die Spanne zählt schon).
      // Überdeckt von einer Zelle aus einer früheren Zeile: bleibt als leere Zelle stehen, sonst rutscht die Zeile nach links.
      const x = it.cells.find(x => x.r <= r && r < x.r + x.rs && x.c <= k && k < x.c + x.cs);
      if (!x) return [{ t: '', kopf: r < it.headRows[0], span: 1, zahl: false }];
      return x.r === r || k !== x.c ? [] : [{ t: '', kopf: r < it.headRows[0], span: x.cs, zahl: false, ueber: true }];
    }
    // Zahlen: die Engine schreibt Englisch (Dezimalpunkt); Dezimalzeichen und Prozent nach dem Sprachprofil (localizeCell), p-Werte unter ,0005 als „< ,001“ (PSPP: „.000“).
    // Texte von PSPP (Köpfe, Titel): im Wörterbuch der Sprache nachgeschlagen, sonst bleibt das englische Original.
    let t = c.n !== undefined ? localizeCell(c, kopfText(c.c), schrift) : c.x ? translate(c.t, wb, erg) : c.t;
    // Einheitlich in jeder Sprache: echtes Minuszeichen „−“ statt Bindestrich.
    if (c.n !== undefined) {
      // Null vor dem Komma (Johannes 09.10.: „,44“ verwirrt). Ohne Null nur, was nie über 1 geht - p-Wert und Korrelation (APA); erkannt an Spalten- oder Zeilenkopf.
      // Einstellung „Null vor dem Komma“: dann auch p und r mit Null („< 0,001“).
      if (mitNull()) t = t.replace(/^(-?|[<>]\s?)([.,]\d)/, (_, a: string, b: string) => `${a}0${b}`);
      else if (!nurBisEins && !ohneNull(kopfText(c.c)) && !ohneNull(zeilenKopf(r))) t = t.replace(/^(-?)([.,]\d)/, '$10$2');
      t = t.replace(/^-(?=[\d.,])/, '\u2212');
    }
    const kopfZelle = c.n === undefined && (r < it.headRows[0]);
    const tipp = kopfZelle ? kopfTipp(c.t) ?? undefined : undefined;
    return [{ t, kopf: c.h || r < it.headRows[0], span: c.cs, zahl: c.n !== undefined, ...(tipp ? { tipp } : {}), ...(c.rs > 1 ? { rs: c.rs } : {}), ...(c.fn?.length ? { fn: c.fn } : {}) }];
  }));
  einheitlicheNullen(zeilen, it.headRows[0]);
  // Tabelle umbauen (S-G, lib/pivot.ts): die am Blatt gespeicherte Wahl zu genau dieser Tabelle (Fingerabdruck), dann erst die Farben.
  const schluessel = tabellenSchluessel(it.label, it.cells, it.rows, it.cols), einfach = istEinfach(zeilen, it.headRows[0]);
  let kopfZ = it.headRows[0];
  const pv = ohnePivot || !einfach ? undefined : s.blaetter.map(b => b.pivot?.[schluessel]).find(Boolean);
  let kopfSpalten = Math.max(0, Math.min(it.headCols[0] ?? 0, it.cols));
  if (pv) { const r = pivotiere(zeilen, kopfZ, pv); zeilen = r.zeilen; kopfZ = r.kopfZeilen; kopfSpalten = 1; }   // der Umbau macht die erste Spalte immer zur Zeilenüberschrift
  toene(zeilen, kopfZ, roh.ansicht ?? s.einst.tabAnsicht ?? STANDARD_ANSICHT, [translate('Total', wb, erg)]);
  return { titel: it.title ? (it.title.x ? translate(it.title.t, wb, erg) : it.title.t) : translate(it.label, wb, erg), kopfZeilen: kopfZ, kopfSpalten, zeilen, schluessel, einfach, fuss: [...it.footnotes.map(f => f.t), ...(it.gewicht ? [gewichtFuss(it.gewicht)] : [])] };
}

/** Werte, die nie über 1 gehen und darum nach APA ohne Null vor dem Komma stehen: p-Wert („Sig.“), Korrelation (r), Anteile erklärter Varianz (η², R²), Reliabilität (α, ω, ICC, κ), Mauchly-W und Epsilon; standardisiertes β (wie „Beta“ von PSPP). */
export const ohneNull = (kopf: string) => isPValueHeader(kopf) || BIS_EINS.test(kopf.trim());
// Griechische Zeichen (ε, η, α, κ, ω) nur als Formelzeichen, nicht mitten in einem griechischen Wort („Συγκέντρωση“ in Spaltennamen oder Köpfen).
const BIS_EINS = /^W$|(?<!\p{Script=Greek})[εηακωβ](?!\p{Script=Greek})|\bSig\b|Signifikanz|Korrelation|Correlation|^r$|^R$|\bPearson|\bSpearman|\bKendall|Mauchly|Epsilon|Greenhouse|Huynh|Untergrenze|Lower-bound|Eta|R-Quadrat|R Square|R²|Alpha|Kappa|Brennan|Lambda|\bGamma\b|\bSomers|Unsicherheitskoeffizient|Uncertainty Coefficient|\bUC\b|Cramer|Cramér|\bPhi\b|Omega|\bICC\b|Intraklassen|Intraclass/iu;

/**
 * Bereiche und Gesamt für die farbige Ansicht: Ein Bereich beginnt, wo in der ersten Spalte etwas steht („sehr selten“, darunter leere
 * Zellen für „Erwartet“, „Zeile %“). Ein Bereich „Gesamt“ und Spalten mit dem Kopf „Gesamt“ bekommen den Gesamt-Ton.
 */
export function toene(zeilen: TabelleDe['zeilen'], kopfZeilen: number, ansicht: Ansicht, gesamtWoerter: string[] = []) {
  // „Gesamt“ in der Sprache der Tabelle: das übersetzte PSPP-Wort „Total“ zählt dazu (Polnisch „Ogółem“ …).
  const gesamtWort = new Set(gesamtWoerter.map(w => w.trim().toLowerCase())), istGesamt = (x: string) => istGesamtWort(x) || gesamtWort.has(x.trim().toLowerCase());
  const anfang = (z: TabelleDe['zeilen'][number]) => { let k = 0; return z.map(c => { const a = k; k += Math.max(1, c.span); return a; }); };
  const gesamtSp = new Set<number>();
  for (const z of zeilen.slice(0, kopfZeilen)) anfang(z).forEach((a, i) => { if (istGesamt(z[i]!.t)) for (let k = a; k < a + Math.max(1, z[i]!.span); k++) gesamtSp.add(k); });
  const rumpf = zeilen.slice(kopfZeilen), bereich: { g: number; gesamt: boolean }[] = [];
  let g = -1, gesamt = false, n = 0;
  for (const z of rumpf) {
    const t = z[0]?.t.trim() ?? '';
    if (t || g < 0) { gesamt = istGesamt(t); if (!gesamt) { g = n; n++; } }
    bereich.push({ g: Math.max(0, g), gesamt });
  }
  zeilen.slice(0, kopfZeilen).forEach(z => anfang(z).forEach((a, i) => { if (gesamtSp.has(a)) z[i]!.ton = { ansicht, gruppe: 0, n: 1, gesamtZeile: false, gesamtSpalte: true, kopf: true }; }));
  rumpf.forEach((z, r) => anfang(z).forEach((a, i) => { z[i]!.ton = { ansicht, gruppe: bereich[r]!.g, n: Math.max(1, n), gesamtZeile: bereich[r]!.gesamt, gesamtSpalte: gesamtSp.has(a) }; }));
}

/** Steht in einer Spalte „0,47“ neben „,50“ (Anteil ohne führende Null), bekommt die ganze Spalte die Null: die Spalte mischt Größen, die über 1 gehen können. */
export function einheitlicheNullen(zeilen: TabelleDe['zeilen'], kopfZeilen: number) {
  const laenge = new Map<number, number>(); for (const z of zeilen.slice(kopfZeilen)) laenge.set(z.length, (laenge.get(z.length) ?? 0) + 1);
  const norm = [...laenge.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; if (norm === undefined) return;
  for (let k = 0; k < norm; k++) {
    const zellen = zeilen.slice(kopfZeilen).filter(z => z.length === norm).map(z => z[k]!).filter(c => c.zahl);
    if (zellen.some(c => /^\u2212?0[.,]\d/.test(c.t)) && zellen.some(c => /^\u2212?[.,]\d/.test(c.t))) for (const c of zellen) c.t = c.t.replace(/^(\u2212?)([.,]\d)/, '$10$2');
  }
}

/** "60,72" → 60.72 mit Format "0.00"; ",964" → 0.964 mit ".000" (APA: ohne führende Null). "<,001" bleibt Text. */
export function alsExcelZahl(t: string, deutsch = true): { wert: number; format: string } | null {
  // „35,1 %“ (deutsche Anzeige mit schmalem/geschütztem Leerzeichen) ist auch eine Prozentzahl - Prüfrunde 07.10.: wurde Text.
  const roh = t.trim().replace(/\u2212/g, '-').replace(/[\s\u00a0\u202f]+%$/, '%').replace(/(?<=\d)[\u00a0\u202f](?=\d)/g, '');   // Tausendertrenner als Leerzeichen (fr, sv, pl …)
  const m = /^(-?)(\d*)(?:\.(\d+))?(%?)$/.exec(deutsch ? roh.replace(/\./g, '').replace(',', '.') : roh.replace(/,/g, ''));
  if (!m || (!m[2] && !m[3])) return null;
  const dez = m[3]?.length ?? 0, prozent = m[4] === '%';
  const wert = Number(`${m[1]}${m[2] || '0'}.${m[3] ?? '0'}`) / (prozent ? 100 : 1);
  const tausend = (m[2]?.length ?? 0) > 3 ? '#,##' : '';
  return { wert, format: `${tausend}${m[2] ? '0' : '#'}${dez ? '.' + '0'.repeat(dez) : ''}${prozent ? '%' : ''}` };
}

/** Eine Tabelle mit genau einer Kopfzeile (Barrierefreiheit, Welle 5): mehrstufige Köpfe werden zu einem zusammengesetzten Text je Spalte („t-Test: Sig. (2-seitig)“), gleiche Teile stehen nicht doppelt;
 *  Zeilenspannen („ueber“-Platzhalter) wiederholen den Text der Gruppenzelle in jeder Zeile (so kennt jede Zeile ihren Zeilenkopf). Ohne Kopfzeile in der Tabelle gilt die erste Zeile als Kopf. */
export interface FlacheTabelle { kopf: { t: string; ton?: Ton }[]; rumpf: TabelleDe['zeilen']; nSp: number }
export function flacheTabelle(tb: TabelleDe): FlacheTabelle {
  const anfang = (z: TabelleDe['zeilen'][number]) => { let k = 0; return z.map(c => { const a = k; k += Math.max(1, c.span); return a; }); };
  const nSp = Math.max(1, groesste(tb.zeilen.map(z => z.reduce((a, c) => a + Math.max(1, c.span), 0))));
  const nKopf = tb.kopfZeilen > 0 ? tb.kopfZeilen : Math.min(1, tb.zeilen.length);
  const teile: { t: string; ton?: Ton }[][] = Array.from({ length: nSp }, () => []);
  tb.zeilen.slice(0, nKopf).forEach(z => anfang(z).forEach((a, i) => {
    const c = z[i]!; if (c.ueber || !c.t.trim()) return;
    for (let k = a; k < Math.min(nSp, a + Math.max(1, c.span)); k++) { const l = teile[k]!; if (l[l.length - 1]?.t !== c.t.trim()) l.push({ t: c.t.trim(), ton: c.ton }); }
  }));
  const kopf = teile.map(l => ({ t: l.map(x => x.t).join(': '), ton: l[l.length - 1]?.ton }));
  const offen = new Map<number, { c: TabelleDe['zeilen'][number][number]; rest: number }>();
  const rumpf = tb.zeilen.slice(nKopf).map(z => anfang(z).map((a, i) => {
    const c = z[i]!;
    if (c.ueber) { const o = offen.get(a); if (o) { o.rest--; if (o.rest <= 0) offen.delete(a); return { ...c, t: o.c.t, kopf: o.c.kopf, zahl: false, ueber: false }; } return c; }
    if ((c.rs ?? 1) > 1) offen.set(a, { c, rest: c.rs! - 1 });
    return c;
  }));
  return { kopf, rumpf, nSp };
}

/** Bericht oder Befehls-Ausgabe als Excel: eine Übersicht mit Hinweisen und Inhaltsverzeichnis, dann je Tabelle ein eigenes Blatt (sprechender Name, Titel in Zeile 1, eine fixierte Kopfzeile, echte Excel-Tabelle, keine verbundenen Zellen). */
export async function exportiereErgebnisseExcel(teile: { titel: string; text?: string; items: OutputItem[]; veraltet?: string }[], name: string, eigenerCode = 'GNU PSPP 2.1.3', art = L('Ergebnisse', 'Results')) {
  melde(L('Excel-Datei wird erstellt …', 'Creating the Excel file …'));
  const dc = await deDict();
  const { wb } = await neueMappe(name);
  const benutzt = new Set<string>();
  const uebersicht = wb.addWorksheet(blattName(L('Übersicht', 'Overview'), benutzt)); excelFuss(uebersicht);
  let z = kopf(uebersicht, name, `${L('Ergebnisse · erstellt am', 'Results · created on')} ${heute()} · ${L('gerechnet mit', 'calculated with')} ${eigenerCode}`);
  const absatz = (text: string, o: { fett?: boolean; farbe?: string; groesse?: number } = {}) => {
    const c = uebersicht.getCell(z, 1); c.value = text; c.font = { name: SCHRIFT, size: o.groesse ?? 10, bold: o.fett, ...(o.farbe ? { color: { argb: o.farbe } } : {}) }; c.alignment = { wrapText: true, vertical: 'top' }; z++;
  };
  const nV = teile.filter(t => t.veraltet).length;
  if (nV) absatz(Lp(nV, 'Achtung: Ein Ergebnis ist veraltet - die Daten wurden nach der Rechnung geändert. Neu rechnen und erneut exportieren.', `Achtung: ${nV} Ergebnisse sind veraltet - die Daten wurden nach der Rechnung geändert. Neu rechnen und erneut exportieren.`, 'Warning: one result is outdated - the data were changed after the calculation. Recalculate and export again.', `Warning: ${nV} results are outdated - the data were changed after the calculation. Recalculate and export again.`), { fett: true, farbe: 'FFB00020' });
  absatz(L('Diagramme stehen nicht in dieser Datei. Sie stehen mit Bildbeschreibung und Datentabelle im Word-Bericht.', 'Charts are not part of this file. You will find them, with a description and a data table, in the Word report.'));
  let nr = 0;
  for (const teil of teile) {
    z++;
    absatz(teil.titel, { fett: true, groesse: 12, farbe: argb(FARBE.tinte) });
    if (teil.veraltet) absatz(teil.veraltet, { fett: true, farbe: 'FFB00020' });
    if (teil.text) absatz(teil.text);
    for (const it of teil.items) {
      if (it.type !== 'table') continue;
      const tb = tabelleDe(it, dc), fl = flacheTabelle(tb); nr++;
      const blatt = blattName(`${nr} ${tb.titel}`, benutzt);
      const ws = wb.addWorksheet(blatt, { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      excelTabelle(ws, tb, fl, nr); excelFuss(ws);
      const l = uebersicht.getCell(z, 1); l.value = { text: `${L('Tabelle', 'Table')} ${nr}: ${tb.titel}`, hyperlink: `#'${blatt.split("'").join("'" + "'")}'!A1` };
      l.font = { name: SCHRIFT, size: 10, underline: true, color: { argb: argb(FARBE.akzent) } }; z++;
    }
  }
  uebersicht.getColumn(1).width = 110;
  herunterladen(await wb.xlsx.writeBuffer(), `${dateiname(name)} - ${art}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/** Ein Blatt für eine Ergebnistabelle: Titel in Zeile 1, fixierte Kopfzeile in Zeile 2, echte Excel-Tabelle (eindeutige Spaltennamen), Fußnoten darunter, Spaltenbreiten nach dem Inhalt. */
function excelTabelle(ws: ExcelJS.Worksheet, tb: TabelleDe, fl: FlacheTabelle, nr: number) {
  const dezKomma = dezimal() === ',';
  const tt = ws.getCell(1, 1); tt.value = `${L('Tabelle', 'Table')} ${nr}: ${tb.titel}`; tt.font = { name: SCHRIFT, size: 12, bold: true, color: { argb: argb(FARBE.tinte) } };
  ws.getRow(1).height = 22;
  // Spaltennamen einer Excel-Tabelle: Pflicht ist ein eindeutiger Text.
  const namen: string[] = [];
  fl.kopf.forEach((k, i) => { let n = k.t || `${L('Spalte', 'Column')} ${i + 1}`; const roh = n; for (let j = 2; namen.includes(n); j++) n = `${roh} (${j})`; namen.push(n); });
  type Z = TabelleDe['zeilen'][number][number];
  const zeilen = fl.rumpf.map(row => {
    const zellen: { c: Z; wert: string | number; fmt?: string }[] = [];
    for (const c of row) {
      const x = alsExcelZahl(c.t, dezKomma);
      zellen.push({ c, ...(c.zahl && x ? { wert: x.wert, fmt: x.format } : { wert: c.t }) });
      for (let k = 1; k < Math.max(1, c.span); k++) zellen.push({ c: { ...c, t: '', zahl: false }, wert: '' });
    }
    while (zellen.length < fl.nSp) zellen.push({ c: { t: '', kopf: false, span: 1, zahl: false }, wert: '' });
    return zellen.slice(0, fl.nSp);
  });
  const tabName = `T${nr}_${tb.titel.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40)}`.replace(/_+$/, '');
  ws.addTable({ name: tabName, ref: 'A2', headerRow: true, totalsRow: false, style: { theme: null, showRowStripes: false } as never, columns: namen.map(n => ({ name: n })), rows: zeilen.length ? zeilen.map(r => r.map(x => x.wert)) : [namen.map(() => '')] });
  const kopfZeile = ws.getRow(2); kopfZeile.height = 30;
  fl.kopf.forEach((_k, i) => {
    const c = kopfZeile.getCell(i + 1); c.font = { name: SCHRIFT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(FARBE.akzent) } }; c.alignment = { vertical: 'middle', wrapText: true, horizontal: i >= tb.kopfSpalten ? 'right' : 'left' };
  });
  zeilen.forEach((r, ri) => r.forEach((x, i) => {
    const zelle = ws.getCell(3 + ri, i + 1);
    if (x.fmt) zelle.numFmt = x.fmt;
    zelle.font = { name: SCHRIFT, size: 10, bold: tonFett(x.c.ton) || i < tb.kopfSpalten };
    const hg = tonHex(x.c.ton); if (hg) zelle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hg } };
    zelle.alignment = { horizontal: x.c.zahl ? 'right' : 'left', vertical: 'top', wrapText: !x.c.zahl };
  }));
  tb.fuss.forEach((f, i) => { const fz = ws.getCell(3 + zeilen.length + i, 1); fz.value = f; fz.font = { name: SCHRIFT, size: 9, color: { argb: argb(FARBE.tinte2) } }; });
  ws.views = [{ state: 'frozen', ySplit: 2, xSplit: tb.kopfSpalten > 0 ? tb.kopfSpalten : 0 }];
  namen.forEach((n, i) => {
    const lang = Math.max(...n.split(/\s+/).map(w => w.length), 0), inhalt = groesste(zeilen.slice(0, 500).map(r => String(r[i]?.wert ?? '').length));
    ws.getColumn(i + 1).width = Math.min(i === 0 ? 50 : 30, Math.max(i === 0 ? 14 : 10, lang + 2, Math.min(inhalt, 40) + 2));
  });
}

/** Einstellungen für den Word-Bericht. `bildbeschreibungen`: Beschreibung und Datentabelle stehen sichtbar nach jedem Diagramm (Vorgabe: an). Der Alternativtext am Bild bleibt immer. */
export interface WordOptionen { bildbeschreibungen?: boolean; /** Integration der Daten (Mixed Methods): eigener Abschnitt, nur wenn mindestens ein Feld ausgefüllt ist */ integration?: import('./integration').Integration; /** Logo als PNG für die Fußzeile (nur im Browser; ohne: nur Text) */ logo?: Uint8Array }

type Docx = typeof import('docx');
type Absatz = InstanceType<Docx['Paragraph']>;
type Tafel = InstanceType<Docx['Table']>;

/** Formatvorlagen für Word: Titel, Überschrift 1-3, Beschriftung, Bildbeschreibung (alle Arial wie der Text) und die Sprache des Dokuments. Der Name „caption“ ist die eingebaute Vorlage „Beschriftung“. */
export function wordStile(D: Docx, schrift = 'Arial') {
  const ueberschrift = (groesse: number, vor: number) => ({ run: { font: schrift, size: groesse, bold: true, color: '1D2530' }, paragraph: { keepNext: true, spacing: { before: vor, after: 120 } } });
  return {
    default: {
      document: { run: { font: schrift, size: 22, language: { value: ort() } } },
      title: { run: { font: schrift, size: 32, bold: true, color: '1D2530' }, paragraph: { spacing: { after: 240 } } },
      heading1: ueberschrift(26, 240), heading2: ueberschrift(23, 240), heading3: ueberschrift(22, 200)
    },
    paragraphStyles: [
      { id: 'Caption', name: 'caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: schrift, size: 22, color: '1D2530' }, paragraph: { keepNext: true, spacing: { before: 120, after: 160, line: 360 } } },
      { id: 'Bildbeschreibung', name: 'Bildbeschreibung', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: schrift, size: 20 }, paragraph: { spacing: { after: 120, line: 300 } } }
    ]
  } satisfies ConstructorParameters<Docx['Document']>[0]['styles'];
}

/** Alternativtext eines Diagramms in Word: Kurztext plus Beschreibung (nicht nur der Titel), ohne BookAccess-Zeichen; Titel des Bildes = Kurztext. Fehlt der Bildtext, sagt der Text wenigstens, wo das Diagramm steht. */
export function bildAltText(titel: string, text?: Pick<BildText, 'kurz' | 'beschreibung'>): { title: string; description: string } {
  const kurz = sauber(text?.kurz || titel).replace(/\s+/g, ' ').trim();
  const mitPunkt = (x: string) => (/[.!?:]$/.test(x) ? x : `${x}.`);
  const beschr = (text?.beschreibung ?? []).map(x => sauber(x)).filter(Boolean).map(mitPunkt).join(' ');
  let d = beschr ? `${mitPunkt(kurz)} ${beschr}` : `${mitPunkt(kurz)} ${L('Diagramm im Abschnitt', 'Chart in the section')} ${mitPunkt(sauber(titel))}`;
  if (d.length > 1200) { const k = d.slice(0, 1200); d = k.slice(0, Math.max(k.lastIndexOf('. '), 200) + 1); }
  return { title: kurz.slice(0, 200), description: d };
}

/** Bericht als Word-Datei, barrierefrei (Welle 5): echte Formatvorlagen, Titel und Sprache, Tabellen mit Kopfzeile, Diagramme mit Alternativtext, Bildbeschreibung und Datentabelle. Arial 11 pt (APA 7 erlaubt das), Tabellen im APA-Stil. */
export async function exportiereBerichtWord(blaetter: Blatt[], einleitung: { titel: string; text: string }[], name: string, datei = name, anhang?: import('./protokollsaetze').BerichtAnhang, opt: WordOptionen = {}) {
  melde(L('Word-Datei wird erstellt …', 'Creating the Word file …'));
  const dc = await deDict();
  const D = await import('docx');
  const logo = (await import('./dokumentmarke').then(m => m.logoPng(48)).catch(() => null))?.daten;
  opt = { ...opt, logo, bildbeschreibungen: opt.bildbeschreibungen ?? s.einst.wordBildbeschreibungen !== false };
  const bilder = new Map<Blatt, Png[]>();
  for (const b of blaetter) bilder.set(b, await diagrammBilder(b, spaltenText));
  const doc = baueBerichtWord(D, blaetter, einleitung, name, dc, b => bilder.get(b) ?? [], anhang, opt);
  herunterladen(await D.Packer.toArrayBuffer(doc), `${dateiname(datei)}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

/** Das Word-Dokument des Berichts; die Diagramme kommen fertig als PNG mit Bildtext (so ist der Bau ohne Browser prüfbar). */
export function baueBerichtWord(D: Docx, blaetter: Blatt[], einleitung: { titel: string; text: string }[], name: string, dc: Dict | null, bilderVon: (b: Blatt) => Png[], anhang?: import('./protokollsaetze').BerichtAnhang, opt: WordOptionen = {}, tabellenVon: (b: Blatt) => TableItem[] = berichtTabellen) {
  const schrift = 'Arial', mitBeschreibung = opt.bildbeschreibungen !== false;
  const absatz = (t: string, o: { kursiv?: boolean; fett?: boolean; groesse?: number; einzug?: boolean; zusammen?: boolean } = {}) =>
    new D.Paragraph({ keepNext: o.zusammen, spacing: { after: 160, line: 360 }, indent: o.einzug ? { firstLine: 360 } : undefined, children: [new D.TextRun({ text: t, font: schrift, size: o.groesse ?? 22, italics: o.kursiv, bold: o.fett })] });
  const beschriftung = (t: string, o: { fett?: boolean; kursiv?: boolean } = {}) => new D.Paragraph({ style: 'Caption', children: [new D.TextRun({ text: t, font: schrift, size: 22, bold: o.fett, italics: o.kursiv })] });
  const kinder: (Absatz | Tafel)[] = [
    new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [new D.TextRun({ text: name, font: schrift, size: 32, bold: true })] }),
    absatz(`${L('Erstellt mit Statable am', 'Created with Statable on')} ${heute()} · ${L('gerechnet mit', 'calculated with')} ${rechenText(blaetter)}`, { kursiv: true, groesse: 20 }),
    new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun({ text: L('Ergebnisse', 'Results'), font: schrift, size: 26, bold: true })] })
  ];
  for (const e of einleitung) kinder.push(new D.Paragraph({ spacing: { after: 160, line: 360 }, indent: { firstLine: 360 }, children: kursivLaeufe(D, e.text, schrift) }));
  let nr = 0, abb = 0;
  for (const b of blaetter) {
    kinder.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun({ text: b.titel, font: schrift, size: 23, bold: true })] }));
    const alt = veraltetMarke(b);
    if (alt) kinder.push(new D.Paragraph({ keepNext: true, spacing: { after: 120 }, children: [new D.TextRun({ text: alt.charAt(0).toUpperCase() + alt.slice(1) + '.', font: schrift, size: 22, bold: true, color: 'B00020' })] }));
    const satz = berichtSatz(b);
    if (satz) kinder.push(new D.Paragraph({ spacing: { after: 160, line: 360 }, indent: { firstLine: 360 }, children: kursivLaeufe(D, satz, schrift) }));
    if (b.notiz) kinder.push(absatz(b.notiz, { kursiv: true }));
    for (const bild of bilderVon(b)) {
      abb++;
      const w = b.dg?.breite === 'seite' ? 600 : 420, h = Math.round(w * bild.hoehe / bild.breite), hMax = 520, f = h > hMax ? hMax / h : 1;
      const at = bildAltText(b.titel, bild.text);
      // Titel und Bild zusammenhalten (keepNext): sonst steht „Abbildung 1“ am Seitenende, das Bild auf der nächsten Seite.
      kinder.push(beschriftung(`${L('Abbildung', 'Figure')} ${abb}`, { fett: true }), new D.Paragraph({ keepNext: mitBeschreibung, spacing: { after: 240 }, children: [new D.ImageRun({ type: 'png', data: bild.daten, transformation: { width: Math.round(w * f), height: Math.round(h * f) }, altText: { name: `${L('Abbildung', 'Figure')} ${abb}`, title: at.title, description: at.description } })] }));
      if (mitBeschreibung && bild.text) kinder.push(...bildBeschreibungWord(D, bild.text, schrift));
    }
    for (const it of tabellenVon(b).slice(0, 20)) {
      const tb = tabelleDe(it, dc); nr++;
      kinder.push(...wordTabelle(D, tb, nr, schrift));
    }
  }
  if (integrationAusgefuellt(opt.integration)) {
    kinder.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun({ text: L('Integration der Daten (Mixed Methods)', 'Integration of the data (mixed methods)'), font: schrift, size: 26, bold: true })] }));
    for (const f of INTEGRATION_FELDER) {
      const t = opt.integration![f]?.trim();
      if (!t) continue;
      kinder.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun({ text: integrationFrage(f), font: schrift, size: 23, bold: true })] }));
      for (const z of t.split(/\r?\n+/).filter(x => x.trim())) kinder.push(absatz(z));
    }
  }
  if (anhang) {
    kinder.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new D.TextRun({ text: anhang.titel, font: schrift, size: 26, bold: true })] }));
    const zelle = (t: string, fett = false) => new D.TableCell({ children: [new D.Paragraph({ children: [new D.TextRun({ text: t, font: schrift, size: 16, bold: fett })] })] });
    kinder.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, tableLook: { firstRow: true, noHBand: true, noVBand: true }, rows: [new D.TableRow({ tableHeader: true, children: anhang.kopf.map(h => zelle(h, true)) }), ...anhang.zeilen.map(z => new D.TableRow({ children: z.map(t => zelle(t)) }))] }));
  }
  if (kinder[kinder.length - 1] instanceof D.Table) kinder.push(absatz(L('Ende des Berichts.', 'End of the report.'), { kursiv: true, groesse: 20 }));
  return new D.Document({ creator: 'Statable', title: name, subject: L('Bericht, erstellt mit Statable', 'Report created with Statable'), styles: wordStile(D, schrift), sections: [{ footers: { default: wordFuss(D, heute(), opt.logo) }, children: kinder }] });
}

/** Sichtbare Beschreibung nach einem Diagramm: Absätze in der Vorlage „Bildbeschreibung“ (Kurztext, Beschreibung, Liste) und die Daten als echte Tabelle mit Kopfzeile. */
export function bildBeschreibungWord(D: Docx, t: BildText, schrift = 'Arial'): (Absatz | Tafel)[] {
  const aus: (Absatz | Tafel)[] = [];
  const text = (x: string, o: { punkt?: boolean } = {}) => new D.Paragraph({ style: 'Bildbeschreibung', ...(o.punkt ? { bullet: { level: 0 } } : {}), children: [new D.TextRun({ text: x, font: schrift, size: 20 })] });
  for (const x of [t.kurz, ...t.beschreibung]) if (x.trim()) aus.push(text(x));
  for (const x of t.liste) if (x.trim()) aus.push(text(x, { punkt: true }));
  const tb = t.tabelle;
  if (tb.kopf.length && tb.zeilen.length) {
    const n = tb.kopf.length, breiten = Array.from({ length: n }, () => Math.floor(9000 / n));
    const linie = (st: 'single' | 'nil', sz = 6) => ({ style: st === 'nil' ? D.BorderStyle.NIL : D.BorderStyle.SINGLE, size: sz, color: '1D2530' });
    const zelle = (x: string | number, fett: boolean, rechts: boolean, unten: boolean) => new D.TableCell({
      width: { size: breiten[0]!, type: D.WidthType.DXA }, margins: { left: 80, right: 80 },
      borders: { bottom: unten ? linie('single') : linie('nil'), top: linie('nil'), left: linie('nil'), right: linie('nil') },
      children: [new D.Paragraph({ alignment: rechts ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({ text: String(x), font: schrift, size: 18, bold: fett })] })]
    });
    aus.push(new D.Paragraph({ style: 'Caption', children: [new D.TextRun({ text: tb.titel || L('Daten zum Diagramm', 'Data for the chart'), font: schrift, size: 22, italics: true })] }));
    aus.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE }, columnWidths: breiten, layout: D.TableLayoutType.FIXED, tableLook: { firstRow: true, firstColumn: tb.zeilenKopf, noHBand: true, noVBand: true },
      borders: { top: linie('single', 12), bottom: linie('single', 12), left: linie('nil'), right: linie('nil'), insideHorizontal: linie('nil'), insideVertical: linie('nil') },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: tb.kopf.map((k, i) => zelle(k || L('Name', 'Name'), true, i > 0, true)) }),
        ...tb.zeilen.map(z => new D.TableRow({ cantSplit: true, children: tb.kopf.map((_k, i) => zelle(z[i] ?? '', tb.zeilenKopf && i === 0, i > 0 || !tb.zeilenKopf, false)) }))
      ]
    }));
  }
  return aus;
}

/** Läufe für einen Satz: Statistik-Symbole kursiv (APA 7), Regel aus kursiv.ts. */
export function kursivLaeufe(D: Docx, text: string, schrift = 'Arial', size = 22) {
  return teileKursiv(text).map(st => new D.TextRun({ text: st.t, font: schrift, size, italics: st.stil === 'italic' }));
}
/** Eine Tabelle im APA-Stil für Word: „Tabelle n“ und Titel als Beschriftung, genau eine Kopfzeile (mehrstufige Köpfe zusammengesetzt, siehe `flacheTabelle`), erste Spalte als Zeilenkopf, nur waagrechte Linien, Anmerkung darunter. */
export function wordTabelle(D: Docx, tb: TabelleDe, nr: number, schrift = 'Arial'): (Absatz | Tafel)[] {
  const linie = (st: 'single' | 'nil', sz = 8) => ({ style: st === 'nil' ? D.BorderStyle.NIL : D.BorderStyle.SINGLE, size: sz, color: '1D2530' });
  const beschriftung = (t: string, o: { kursiv?: boolean; fett?: boolean } = {}) => new D.Paragraph({ style: 'Caption', children: [new D.TextRun({ text: t, font: schrift, size: 22, italics: o.kursiv, bold: o.fett })] });
  const fl = flacheTabelle(tb);
  type Z = TabelleDe['zeilen'][number][number];
  const kopfZeile: Z[] = fl.kopf.map(k => ({ t: k.t, kopf: true, span: 1, zahl: false, ton: k.ton }));
  const alle = [kopfZeile, ...fl.rumpf];
  const letzte = alle.length - 1;
  // Spaltenbreiten und Ausrichtung (Abnahme 3, M13): Die erste Spalte bekommt Platz nach ihrem längsten Wort-Rest (sonst bricht sie mitten im Wort um: „Risikoverhältn/is“),
  // die Zahlenspalten teilen den Rest; Überschrift und „-“ stehen in einer Zahlenspalte rechtsbündig wie die Zahlen.
  const nSp = fl.nSp;
  const anfang = (z: Z[]) => { let k = 0; return z.map(c => { const a = k; k += Math.max(1, c.span); return a; }); };
  const zahlSp = new Set<number>();
  for (const z of fl.rumpf) anfang(z).forEach((a, i) => { if (z[i]!.zahl && a > 0) zahlSp.add(a); });
  const laengste = Math.max(8, groesste(fl.rumpf.map(z => (z[0]?.t ?? '').length)), groesste(kopfZeile.slice(0, 1).flatMap(z => z.t.split(/\s+/).map(w => w.length))));
  const GESAMT = 9000, erste = nSp === 1 ? GESAMT : Math.min(Math.round(GESAMT * 0.45), Math.max(1700, laengste * 105 + 240)), rest = nSp === 1 ? 0 : Math.floor((GESAMT - erste) / (nSp - 1));
  const wunsch = Array.from({ length: nSp }, (_, k) => (k === 0 ? erste : rest));
  // G8: kein Wort und keine Zahl bricht um - Spalten wachsen auf ihr längstes Wort, reicht die Seite nicht, wird die Schrift kleiner (bis 7 Punkt).
  const { stufe, min } = waehleStufe(alle.map(z => z.map(c => ({ t: c.t, span: c.span, zahl: c.zahl }))), (t, pt) => arialBreite(t) * pt * 20 * 1.06, STUFEN_WORD, GESAMT);
  const breiten = breitenVerteilen(wunsch, min, GESAMT).map(Math.round);
  const zellRand = stufe.polster / 2, groesse = Math.round(stufe.schrift * 2);
  const nbsp = (c: { t: string; zahl?: boolean }) => (c.zahl ? c.t.replace(/ /g, ' ') : c.t);
  const aus: (Absatz | Tafel)[] = [
    beschriftung(`${L('Tabelle', 'Table')} ${nr}`, { fett: true }), beschriftung(tb.titel, { kursiv: true }),
    new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      columnWidths: breiten,
      layout: D.TableLayoutType.FIXED,
      tableLook: { firstRow: true, firstColumn: tb.kopfSpalten > 0, noHBand: true, noVBand: true },
      borders: { top: linie('single', 12), bottom: linie('single', 12), left: linie('nil'), right: linie('nil'), insideHorizontal: linie('nil'), insideVertical: linie('nil') },
      rows: alle.map((row, r) => new D.TableRow({ cantSplit: true, tableHeader: r === 0, children: row.map((c, i) => {
        const a0 = anfang(row)[i]!;
        return new D.TableCell({
          columnSpan: c.span > 1 ? c.span : undefined,
          width: { size: breiten.slice(a0, a0 + Math.max(1, c.span)).reduce((a, b) => a + b, 0), type: D.WidthType.DXA },
          borders: r === 0 ? { bottom: linie('single', 6), top: linie('nil'), left: linie('nil'), right: linie('nil') } : r === letzte ? { top: linie('nil'), left: linie('nil'), right: linie('nil'), bottom: linie('nil') } : undefined,
          shading: tonHex(c.ton) ? { fill: tonHex(c.ton)!, type: D.ShadingType.CLEAR, color: 'auto' } : undefined,
          margins: { left: zellRand, right: zellRand },
          children: [new D.Paragraph({ alignment: c.zahl || zahlSp.has(a0) ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [
            new D.TextRun({ text: nbsp(c), font: schrift, size: groesse, bold: r === 0 || tonFett(c.ton) || (a0 < tb.kopfSpalten && c.t.trim() !== '') }),
            ...(c.fn?.length ? [new D.TextRun({ text: c.fn.join(','), font: schrift, size: groesse, superScript: true })] : [])
          ] })]
        });
      }) }))
    })
  ];
  if (tb.fuss.length) aus.push(new D.Paragraph({ spacing: { before: 80, after: 160 }, children: [new D.TextRun({ text: L('Anmerkung. ', 'Note. '), font: schrift, size: 18, italics: true }), new D.TextRun({ text: tb.fuss.join(' '), font: schrift, size: 18 })] }));
  return aus;
}

/** Nur diese eine Tabelle als Word-Datei. */
export async function exportiereTabelleWord(it: TableItem) {
  melde(L('Word-Datei wird erstellt …', 'Creating the Word file …'));
  const tb = tabelleDe(it, await deDict()), D = await import('docx'), nr = tabellenNummer(tb.titel, it);
  const kinder = wordTabelle(D, tb, nr);
  // Ein Dokument endet nicht mit einer Tabelle: Word legt sonst einen leeren Absatz an. Statt eines leeren steht hier der Vermerk.
  if (kinder[kinder.length - 1] instanceof D.Table) kinder.push(new D.Paragraph({ spacing: { before: 80 }, children: [new D.TextRun({ text: `${L('Erstellt mit Statable am', 'Created with Statable on')} ${heute()}`, font: 'Arial', size: 18, italics: true })] }));
  const logo = (await import('./dokumentmarke').then(m => m.logoPng(48)).catch(() => null))?.daten;
  const doc = new D.Document({ creator: 'Statable', title: tb.titel, styles: wordStile(D), sections: [{ footers: { default: wordFuss(D, heute(), logo) }, children: kinder }] });
  herunterladen(await D.Packer.toArrayBuffer(doc), `${dateiname(tb.titel)} - ${L('Tabelle', 'Table')} ${nr}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  melde(L('Word-Datei gespeichert. Sie liegt bei den Downloads.', 'Word file saved. You will find it in your downloads.'));
}
/** Nur diese eine Tabelle als Excel-Datei. */
export async function exportiereTabelleExcel(it: TableItem) {
  const tb = tabelleDe(it, await deDict());
  await exportiereErgebnisseExcel([{ titel: tb.titel, items: [it] }], tb.titel, undefined, `${L('Tabelle', 'Table')} ${tabellenNummer(tb.titel, it)}`);
  melde(L('Excel-Datei gespeichert. Sie liegt bei den Downloads.', 'Excel file saved. You will find it in your downloads.'));
}

export const spaltenText = (n: string) => lesbar(s.spalten.find(x => x.name === n));
