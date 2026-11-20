import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { nodeEngine } from './testengine';
import { planAusXlsform, variablenAusPlan, type FragebogenPlan, type Bedingung, type Element } from './fragebogenplan';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

/* ===== Paket 2E (Prüfer, ROTE TESTS vor dem Bau): Exporte aus dem Fragebogen-Plan =====
 * Grundlagen: docs/erheben/EXPORTFORMATE-BELEGE.md (Belege je Angabe mit URL), FACHBLATT-STUFE-2.md (Paket 2E), ARCHITEKTUR-FRAGEBOGEN-PLAN.md (Abschnitte 4 bis 6).
 * Testplan: testdaten/fragebogenplan/export-plan.json (alle Fragetypen, de+en, Filter einfach/gewaehlt/und, Block mit 3 Items, Skala mit Umpolung, Fehlendcodes, Anderes, Bild mit alt).
 * ERWARTETE DATEIEN (vom Prüfer aus den Belegen hergeleitet, NICHT durch einen Bau erzeugt): export-plan.xlsform.json, export-plan.limesurvey.txt (+ .namen.json),
 * export-plan.surveyjs.json, export-plan.sps. Der Block „Erwartungen sind in sich gültig“ unten ist von Anfang an grün: die Erwartungen laufen durch pyxform, die PSPP-Engine
 * und die Struktur-Prüfung nach dem LimeSurvey-Importer. Wer eine Erwartung für falsch hält, belegt es mit dem Werkzeug und ändert sie mit Begründung.
 *
 * ---------------------------------- Festlegungen für den Bauer (neue Datei lib/fragebogenexport.ts) ----------------------------------
 *  alsXlsform(plan): Promise<Uint8Array>              .xlsx über exceljs; Blätter in dieser Reihenfolge: survey, choices, settings, statable_skalen (Köpfe und Zeilen: export-plan.xlsform.json)
 *  alsLimeSurvey(plan): { text: string; namen: Record<string,string> }   text = Tabulator-Datei (UTF-8, OHNE BOM; die Oberfläche setzt beim Speichern ein BOM davor, wie LimeSurvey selbst), Zeilen mit \n, Datei endet mit \n
 *  alsSurveyJs(plan): object                           reines JSON-Objekt (JSON.stringify/parse ergibt dasselbe)
 *  alsPsppSyntax(plan): string                         Variablen- und Wertebeschriftung usw. in plan.sprachen[0]; setzt voraus, dass die Spalten aus variablenAusPlan schon da sind
 *  kodebuchWord(plan, sprache?): Promise<Uint8Array>   .docx; fragebogenWord(plan, opts?: { sprache?: string; codes?: boolean }): Promise<Uint8Array>   (codes: Standard true)
 *  fragebogenHtml(plan, sprache): string               eine vollständige HTML-Datei (nur lesen)
 *  Alle sieben SPERREN bei Fehlern aus planPruefen: werfen (die async: lehnen ab) einen Error, dessen message mit „planFehler“ beginnt.
 *  Alle sprachabhängigen Texte nehmen die Sprache aus dem Aufruf, sonst plan.sprachen[0]; es gibt nie einen stillen Rückfall auf eine andere Sprache.
 *
 *  XLSForm (Belege: xlsform.org, pyxform 4.5.0 am PC geprüft, siehe BELEGE):
 *    Sprachspalten `label::<Name> (<code>)`, Name: de → Deutsch, en → English, sonst der Code selbst; `hint::…`, `image::…`, Zusatzspalte `statable_alt::…` je Sprache. settings.default_language = `<Name> (<code>)` der ersten Sprache.
 *    Seite → begin_group/end_group (ohne appearance); Block → verschachtelte begin_group mit appearance `field-list`, darin eine Kopfzeile `select_one <liste>` namens `<block>_kopf` mit appearance `label`
 *    und je Item `select_one <liste>` namens `<block>_<item>` mit appearance `list-nolabel`; `required: yes` je Item. Anderes → Antwort `other` in die Liste (Text aus anders.text) UND eine Textfrage `<name>_anders`
 *    mit relevant `selected(${name}, 'other')` (NICHT or_other: pyxform schreibt dafür einen unübersetzten Text „Other“ und warnt). Antwortcodes = Code als Text („-9“ geht in pyxform).
 *    zahl → integer/decimal, Grenzen als constraint `. >= 16 and . <= 99`; regler → range mit parameters `start=0 end=12 step=1`; text mehrzeilig → appearance multiline; Hinweis → note (Bild: image::<Sprache>).
 *    Bedingungen: `${name} = 1` (ist: = != < <= > >=), `selected(${name}, '3')`, `${name} != ''` / `${name} = ''`, und → `and`, oder → `or`, nicht → `not(…)`; zusammengesetzte Teilbedingungen in Klammern, einfache ohne.
 *    pyxform ignoriert unbekannte Spalten in survey und settings; in choices schreibt es sie als Unterelemente der Antwort in die Instanz (harmlos). Keine pyxform-Warnung zulässig.
 *    Einleitung, Abschluss, einstellungen gibt XLSForm nicht her und gehen NICHT mit (der Bericht der Oberfläche sagt es).
 *  Rückweg: planAusXlsform (aus 1C) muss den Export lesen können: statable_*-Spalten, Block-Muster (field-list + Kopfzeile `label`), `<name>_anders` + `other`, relevant der obigen Schreibweise → Bedingung,
 *    settings (default_language, form_title), Blatt statable_skalen. Verglichen wird die Projektion `kern` unten (ohne Ids, Einleitung, Abschluss, Einstellungen, Bild-Datei-Alt zählt mit).
 *  LimeSurvey (Quelle: Handbuch + Quelltext TSVImportSurvey, siehe BELEGE): 19 Spalten (14 aus dem Handbuch + exclude_all_others, max_num_value_n, min_num_value_n, num_value_int_only, other_replace_text);
 *    Reihenfolge S-Zeilen, SL-Zeilen, dann je Sprache der ganze Block G/Q/SQ/A. Typen: einfach L, mehrfach M, zahl/regler N, text S (mehrzeilig T), datum D, rangfolge R, einwilligung M mit einer Teilfrage `1`,
 *    Block F, Hinweis X. Fragecodes: nur A-Za-z0-9, höchstens 20 Zeichen, mit Buchstabe am Anfang, ohne Unterstrich, eindeutig (bei Zusammenstoß 2, 3 …); Teilfragen- und Antwortcodes: A-Za-z0-9, höchstens 5 Zeichen,
 *    negative Codes → `M` + Betrag (-9 → M9). `namen` = Element-id (Frage, Block, Block-Item, Option) → Code im Zielwerkzeug, für ALLE Elemente (auch unveränderte).
 *    Texte HTML-maskiert (& < > "), Zeilenumbruch → `<br />`; Titel (surveyls_title) nur ohne Tabulator/Zeilenumbruch; Zelle mit `"` wird in Anführungszeichen gesetzt (CSV-Regel). Bedingungen: ExpressionScript mit `.NAOK`,
 *    Texte in einfachen Anführungszeichen (`'1'`, `'Y'`), und → `&&`, oder → `||`, nicht → `!(…)`, beantwortet → `!is_empty(x.NAOK)`; mehrfach: `<frage>_<teilfrage>.NAOK == 'Y'`.
 *  SurveyJS: lokalisierte Texte `{ default: <erste Sprache>, de: …, en: … }`, Regler als Zahlenfeld (text/number mit min/max/step; zusätzlich Zahlenfeld-Pflicht des Architekturblatts), einwilligung als checkbox mit einer Wahl,
 *    ausschließende Option als noneItem, Anderes als otherItem, Block als matrix (eachRowRequired bei Pflicht), Hinweis mit Bild als image, ohne Bild als html (maskiert). `nicht`: nicht belegt, der Bauer belegt es in der Doku oder lässt es weg und meldet es.
 *  PSPP-Syntax: Reihenfolge Kommentarzeile, VARIABLE LABELS (je Variable), VALUE LABELS (Werte aufsteigend), MISSING VALUES (aufsteigend, „, “), VARIABLE LEVEL (je Variable), FORMATS (Datum → DATE11), Umpolung
 *    (`<name>_u`), Skalen (MEAN.n / SUM.n über die Umgepolten), EXECUTE. Jeder Text über zit (Beschriftungen bis 250, Wertebeschriftungen bis 120), die Kommentarzeile über pk. Datum: ISO-Text wird mit SDATE10 gelesen.
 *  Word/HTML: Fragen laufend nummeriert „1. “ (als Text), Optionen „☐ Text (Code)“, Filtersatz enthält „wenn“ und „Frage <Nummer>“; Kodebuch: je Variable Name, Label, Werte, Fehlend, Niveau.
 *
 *  Gegenproben: pyxform (Python), survey-core (npm, MUSS als devDependency aufgenommen werden: `npm i -D survey-core`; bis dahin „übersprungen mit Meldung“), PSPP-Engine, docx-pruefen.mjs, LibreOffice
 *  (`soffice`, am PC meist nicht da), axe (Chromium über Playwright, sonst übersprungen). LimeSurvey selbst: GEGENPROBE AM MAC (kein Docker am PC).
 */

const DIR = new URL('./testdaten/fragebogenplan/', import.meta.url);
const lies = (n: string) => readFileSync(new URL(n, DIR), 'utf8');
const planOriginal = (): FragebogenPlan => JSON.parse(lies('export-plan.json'));
const klon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const alleElemente = (p: FragebogenPlan): Element[] => p.elemente.flatMap(s => s.elemente);

type Mod = {
  alsXlsform?: (p: FragebogenPlan) => Promise<Uint8Array>;
  alsLimeSurvey?: (p: FragebogenPlan) => { text: string; namen: Record<string, string> };
  alsSurveyJs?: (p: FragebogenPlan) => object;
  alsPsppSyntax?: (p: FragebogenPlan) => string;
  kodebuchWord?: (p: FragebogenPlan, sprache?: string) => Promise<Uint8Array>;
  fragebogenWord?: (p: FragebogenPlan, o?: { sprache?: string; codes?: boolean }) => Promise<Uint8Array>;
  fragebogenHtml?: (p: FragebogenPlan, sprache: string) => string;
};
let mod: Mod | null = null;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => {
  const pfad = './fragebogenexport';
  mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null;
  e = await nodeEngine();
});
const bau = <K extends keyof Mod>(n: K): NonNullable<Mod[K]> => {
  const f = mod?.[n];
  if (typeof f !== 'function') throw new Error(`lib/fragebogenexport.ts: ${String(n)} fehlt (Bau)`);
  return f as NonNullable<Mod[K]>;
};

/* ------------------------------------------------------------------ Hilfen: XLSX lesen, pyxform, PSPP, LimeSurvey-Struktur */
type Blatt = { kopf: string[]; zeilen: Record<string, string>[] };
async function liesXlsx(bytes: Uint8Array): Promise<{ namen: string[]; blaetter: Record<string, Blatt>; formeln: number }> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  const blaetter: Record<string, Blatt> = {};
  let formeln = 0;
  const text = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if ('formula' in o || 'sharedFormula' in o) { formeln++; return ''; }
      if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map(r => r.text).join('');
      if ('text' in o) return String(o.text);
      return String(v);
    }
    return String(v);
  };
  for (const ws of wb.worksheets) {
    const alle: string[][] = [];
    ws.eachRow({ includeEmpty: false }, row => { const z: string[] = []; for (let c = 1; c <= row.cellCount; c++) z.push(text(row.getCell(c).value)); alle.push(z); });
    const kopf = (alle[0] ?? []).map(k => k.trim());
    const zeilen = alle.slice(1).filter(z => z.some(x => x !== '')).map(z => Object.fromEntries(kopf.map((k, i) => [k, z[i] ?? '']).filter(([, v]) => v !== '')));
    blaetter[ws.name] = { kopf, zeilen };
  }
  return { namen: wb.worksheets.map(w => w.name), blaetter, formeln };
}
const erwartetXlsform = () => JSON.parse(lies('export-plan.xlsform.json')) as Record<string, { kopf: string[]; zeilen: Record<string, string>[] }>;
async function xlsxAusErwartung(): Promise<Uint8Array> {
  const t = erwartetXlsform();
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  for (const n of ['survey', 'choices', 'settings', 'statable_skalen']) {
    const ws = wb.addWorksheet(n); const b = t[n]!;
    ws.addRow(b.kopf);
    for (const z of b.zeilen) ws.addRow(b.kopf.map(k => z[k] ?? null));
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Python mit pyxform finden (py -3, python3, python); null, wenn keins da ist. */
function pythonMitPyxform(): string[] | null {
  for (const c of [['py', '-3'], ['python3'], ['python']]) {
    const r = spawnSync(c[0]!, [...c.slice(1), '-c', 'import pyxform'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}
const PY = pythonMitPyxform();
function pyxformLauf(bytes: Uint8Array): { status: number | null; text: string; xml: string } {
  const dir = mkdtempSync(join(tmpdir(), 'statable-xls-'));
  writeFileSync(join(dir, 'form.xlsx'), bytes);
  const r = spawnSync(PY![0]!, [...PY!.slice(1), '-m', 'pyxform.xls2xform', join(dir, 'form.xlsx'), join(dir, 'form.xml'), '--skip_validate'], { encoding: 'utf8', cwd: dir });
  return { status: r.status, text: `${r.stdout}\n${r.stderr}`, xml: existsSync(join(dir, 'form.xml')) ? readFileSync(join(dir, 'form.xml'), 'utf8') : '' };
}
const ohneWarnung = (t: string) => !/Warnings?:/i.test(t) && /Conversion complete/.test(t);

type Zahlen = Record<string, number | string>;
/** Datensatz aus variablenAusPlan (Zahl F8.0, Text A255, Datum SDATE10), gefüllt mit den Fällen; fehlt ein Wert: 1 / 'x' / 2026-11-08. */
function datensatz(plan: FragebogenPlan, faelle: Zahlen[] = [{}]): string {
  const v = variablenAusPlan(plan);
  const fmt = (x: (typeof v)[number]) => (x.typ === 'zahl' ? `${x.name} (F8.0)` : x.typ === 'text' ? `${x.name} (A255)` : `${x.name} (SDATE10)`);
  const wert = (x: (typeof v)[number], f: Zahlen) => { const w = f[x.name]; if (x.typ === 'zahl') return String(w ?? 1); if (x.typ === 'text') return `'${String(w ?? 'x')}'`; return String(w ?? '2026-11-08'); };
  return `NEW FILE.\nDATA LIST FREE /${v.map(fmt).join(' ')}.\nBEGIN DATA\n${faelle.map(f => v.map(x => wert(x, f)).join(' ')).join('\n')}\nEND DATA.`;
}
type Tab = { label?: string; cells: { r: number; c: number; t: string }[] };
const tabelle = (items: ReturnType<typeof e.run>, label: string) => items.find((i: any) => i.type === 'table' && i.label === label) as unknown as Tab | undefined;
function wörterbuch() {
  const d = e.run('DISPLAY DICTIONARY.');
  const vt = tabelle(d, 'Variables'), wt = tabelle(d, 'Value Labels');
  const zeilen = new Map<number, Map<number, string>>();
  for (const c of vt?.cells ?? []) { if (!zeilen.has(c.r)) zeilen.set(c.r, new Map()); zeilen.get(c.r)!.set(c.c, c.t); }
  const kopf = zeilen.get(0) ?? new Map();
  const spalte = (n: string) => [...kopf.entries()].find(([, t]) => t === n)?.[0] ?? -1;
  const vars = new Map<string, { label: string; niveau: string; fehlend: string }>();
  for (const [r, z] of zeilen) if (r > 0) vars.set(z.get(0)!, { label: z.get(spalte('Label')) ?? '', niveau: z.get(spalte('Measurement Level')) ?? '', fehlend: z.get(spalte('Missing Values')) ?? '' });
  const werte = new Map<string, Map<string, string>>();
  let aktuell = '';
  const wz = new Map<number, Map<number, string>>();
  for (const c of wt?.cells ?? []) { if (!wz.has(c.r)) wz.set(c.r, new Map()); wz.get(c.r)!.set(c.c, c.t); }
  for (const [r, z] of [...wz].sort((a, b) => a[0] - b[0])) {
    if (r === 0) continue;
    if (z.has(0)) { aktuell = z.get(0)!; werte.set(aktuell, new Map()); }
    werte.get(aktuell)!.set(z.get(1)!, z.get(2)!);
  }
  return { vars, werte };
}
const meldungen = (items: ReturnType<typeof e.run>) => items.filter((i: any) => i.type === 'message').map((i: any) => `${i.severity}: ${i.text}`);
const NIVEAU = { nominal: 'Nominal', ordinal: 'Ordinal', skala: 'Scale' } as const;

/** Prüft die DISPLAY-DICTIONARY-Ausgabe gegen variablenAusPlan (Label, Niveau, Fehlend, Wertelabels). */
function pruefeWoerterbuch(plan: FragebogenPlan, erwarteLabel = true): string[] {
  const { vars, werte } = wörterbuch(), probleme: string[] = [];
  for (const v of variablenAusPlan(plan)) {
    const w = vars.get(v.name);
    if (!w) { probleme.push(`${v.name}: fehlt im Wörterbuch`); continue; }
    if (erwarteLabel && w.label !== v.label) probleme.push(`${v.name}: Label ${JSON.stringify(w.label)} statt ${JSON.stringify(v.label)}`);
    const niv = v.niveau ? NIVEAU[v.niveau] : '';
    if (niv && w.niveau !== niv) probleme.push(`${v.name}: Niveau ${w.niveau} statt ${niv}`);
    for (const f of v.fehlend ?? []) if (!w.fehlend.split(/[\s,]+/).includes(String(f))) probleme.push(`${v.name}: Fehlend ${JSON.stringify(w.fehlend)} ohne ${String(f)}`);
    if (!(v.fehlend ?? []).length && w.fehlend !== '') probleme.push(`${v.name}: unerwartet Fehlend ${w.fehlend}`);
    const soll = erwarteLabel ? Object.entries(v.werteLabels ?? {}) : [];
    if (soll.length) {
      const ist = werte.get(w.label);
      for (const [k, t] of soll) if (ist?.get(k) !== t) probleme.push(`${v.name}: Wert ${k} hat ${JSON.stringify(ist?.get(k))} statt ${JSON.stringify(t)}`);
    }
  }
  return probleme;
}

/** LimeSurvey-Tabulator-Datei lesen (CSV-Regel mit "…", wie fgetcsv im Importer). */
function lsLesen(text: string): string[][] {
  const zeilen: string[][] = []; let z: string[] = [], zelle = '', imText = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (imText) { if (c === '"') { if (text[i + 1] === '"') { zelle += '"'; i++; } else imText = false; } else zelle += c; }
    else if (c === '"' && zelle === '') imText = true;
    else if (c === '\t') { z.push(zelle); zelle = ''; }
    else if (c === '\n') { z.push(zelle); zeilen.push(z); z = []; zelle = ''; }
    else zelle += c;
  }
  if (zelle !== '' || z.length) { z.push(zelle); zeilen.push(z); }
  return zeilen;
}
const LS_KOPF14 = ['id', 'related_id', 'class', 'type/scale', 'name', 'relevance', 'text', 'help', 'language', 'validation', 'mandatory', 'other', 'default', 'same_default'];
const LS_TYPEN = new Set(['1', '5', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'X', 'Y', '!', ':', ';', '|', '*']);
/** Struktur nach Handbuch und Importer; liefert die Verstöße als Sätze (leer = in Ordnung). */
function lsProbleme(text: string, plan: FragebogenPlan): string[] {
  const p: string[] = [];
  const t = lsLesen(text);
  const kopf = t[0] ?? [];
  if (JSON.stringify(kopf.slice(0, 14)) !== JSON.stringify(LS_KOPF14)) p.push('die ersten 14 Spalten sind nicht die des Handbuchs');
  if (text.charCodeAt(0) === 0xfeff) p.push('BOM im Text (die Oberfläche setzt es beim Speichern)');
  if (!text.endsWith('\n')) p.push('Datei endet nicht mit Zeilenumbruch');
  const zeilen = t.slice(1).filter(z => z.some(x => x !== '')).map(z => { if (z.length > kopf.length) p.push(`Zeile mit zu vielen Spalten: ${z[2]} ${z[4]}`); return Object.fromEntries(kopf.map((k, i) => [k, z[i] ?? ''])); });
  for (const z of zeilen) if (!['S', 'SL', 'G', 'Q', 'SQ', 'A'].includes(z.class!)) p.push(`Klasse ${z.class} nicht erlaubt`);
  const S = (n: string) => zeilen.find(z => z.class === 'S' && z.name === n)?.text;
  if (S('language') !== plan.sprachen[0]) p.push('S language fehlt oder ist nicht die Standardsprache');
  if (plan.sprachen.length > 1 && S('additional_languages') !== plan.sprachen.slice(1).join(' ')) p.push('S additional_languages stimmt nicht');
  for (const s of plan.sprachen) if (!zeilen.some(z => z.class === 'SL' && z.name === 'surveyls_title' && z.language === s)) p.push(`SL surveyls_title für ${s} fehlt`);
  const inhalt = zeilen.filter(z => ['G', 'Q', 'SQ', 'A'].includes(z.class!));
  const bloecke = plan.sprachen.map(s => inhalt.filter(z => z.language === s));
  if (inhalt.some(z => !plan.sprachen.includes(z.language!))) p.push('Zeile mit unbekannter Sprache');
  // Reihenfolge: der Block der Standardsprache zuerst, dann die übrigen; gleiche Zeilenfolge in jeder Sprache
  const folge = inhalt.map(z => z.language);
  const erwFolge = plan.sprachen.flatMap((s, i) => bloecke[i]!.map(() => s));
  if (JSON.stringify(folge) !== JSON.stringify(erwFolge)) p.push('Sprachblöcke stehen nicht nacheinander in der Reihenfolge der Sprachen');
  const sig = (b: Record<string, string>[]) => b.map(z => `${z.class}|${z['type/scale']}|${z.class === 'G' ? '' : z.name}|${z.relevance}`).join('\n');
  for (let i = 1; i < bloecke.length; i++) if (sig(bloecke[i]!) !== sig(bloecke[0]!)) p.push(`Block ${plan.sprachen[i]} hat nicht dieselben Zeilen wie ${plan.sprachen[0]} (Importer ordnet nach Reihenfolge)`);
  const codes = new Set<string>(); let q: Record<string, string> | null = null; const sub = new Set<string>(), ant = new Set<string>(); let nSq = 0, nA = 0;
  const abschluss = () => { if (!q) return; if (['F', 'M'].includes(q['type/scale']!) && !nSq) p.push(`${q.name}: Typ ${q['type/scale']} ohne Teilfragen`); if (['F', 'L', 'R'].includes(q['type/scale']!) && !nA) p.push(`${q.name}: Typ ${q['type/scale']} ohne Antworten`); };
  for (const z of bloecke[0] ?? []) {
    if (z.class === 'G') { abschluss(); q = null; continue; }
    if (z.class === 'Q') {
      abschluss(); q = z; sub.clear(); ant.clear(); nSq = 0; nA = 0;
      if (!/^[A-Za-z][A-Za-z0-9]{0,19}$/.test(z.name!)) p.push(`Fragecode ${JSON.stringify(z.name)} ungültig (nur Buchstaben und Ziffern, mit Buchstabe, höchstens 20)`);
      if (codes.has(z.name!.toLowerCase())) p.push(`Fragecode ${z.name} doppelt`); codes.add(z.name!.toLowerCase());
      if (!LS_TYPEN.has(z['type/scale']!)) p.push(`Fragetyp ${z['type/scale']} unbekannt`);
    } else if (z.class === 'SQ') {
      nSq++; if (!/^[A-Za-z0-9]{1,5}$/.test(z.name!)) p.push(`Teilfragencode ${JSON.stringify(z.name)} ungültig (höchstens 5 Zeichen, nur Buchstaben und Ziffern)`);
      if (sub.has(z.name!)) p.push(`Teilfragencode ${z.name} doppelt in ${q?.name}`); sub.add(z.name!);
    } else if (z.class === 'A') {
      nA++; if (!/^[A-Za-z0-9]{1,5}$/.test(z.name!)) p.push(`Antwortcode ${JSON.stringify(z.name)} ungültig (höchstens 5 Zeichen, nur Buchstaben und Ziffern)`);
      if (ant.has(z['type/scale'] + z.name!)) p.push(`Antwortcode ${z.name} doppelt in ${q?.name}`); ant.add(z['type/scale'] + z.name!);
    }
  }
  abschluss();
  return p;
}

/* ------------------------------------------------------------------ Erwartungen sind in sich gültig (von Anfang an grün) */
describe('Erwartungen (vom Prüfer hergeleitet) sind in sich gültig', () => {
  it('Testplan: alle Fragetypen, zwei Sprachen, Filterarten, Block, Skala mit Umpolung, Fehlendcodes, Anderes, Bild mit alt', () => {
    const p = planOriginal();
    const el = alleElemente(p);
    const typen = new Set(el.filter(x => x.art === 'frage').map(x => (x as { typ: string }).typ));
    expect([...typen].sort()).toEqual(['datum', 'einfach', 'einwilligung', 'mehrfach', 'rangfolge', 'regler', 'text', 'zahl']);
    expect(p.sprachen).toEqual(['de', 'en']);
    expect(el.some(x => x.art === 'block' && x.items.length === 3 && x.items.some(i => i.umgepolt))).toBe(true);
    expect(p.skalen.length).toBe(1);
    expect(p.antwortlisten.some(l => l.optionen.some(o => o.fehlend))).toBe(true);
    expect(el.some(x => x.art === 'frage' && x.anders?.an)).toBe(true);
    expect(el.some(x => x.art === 'hinweis' && x.bild?.alt.de && x.bild.alt.en)).toBe(true);
    const arten = new Set<string>();
    const sammle = (b: Bedingung | undefined) => { if (!b) return; if ('und' in b) { arten.add('und'); b.und.forEach(sammle); } else if ('oder' in b) b.oder.forEach(sammle); else if ('nicht' in b) sammle(b.nicht); else if ('gewaehlt' in b) arten.add('gewaehlt'); else if ('beantwortet' in b) arten.add('beantwortet'); else arten.add('ist'); };
    for (const s of p.elemente) { sammle(s.wennGezeigt); for (const x of s.elemente) sammle(x.wennGezeigt); }
    expect([...arten].sort()).toEqual(['beantwortet', 'gewaehlt', 'ist', 'und']);
  });
  it('XLSForm-Erwartung: pyxform nimmt sie ohne Fehler und ohne Warnung an (Gegenprobe zum Beleg)', async ctx => {
    if (!PY) { console.warn('ÜBERSPRUNGEN: Python/pyxform fehlt (py -3 -m pip install pyxform). Gegenprobe am Mac oder nach Installation nachholen.'); ctx.skip(); return; }
    const r = pyxformLauf(await xlsxAusErwartung());
    expect(r.status, r.text).toBe(0);
    expect(ohneWarnung(r.text), r.text).toBe(true);
    // Zusatzspalten stören nicht: das Formular ist das gleiche wie ohne sie (Beleg im Kopf)
    expect(r.xml).toContain('odk:rank');
    expect(r.xml).toContain('appearance="field-list"');
    expect(r.xml).toContain('<name>-9</name>');
  });
  it('PSPP-Erwartung (.sps) läuft auf dem Datensatz aus variablenAusPlan ohne Meldung; DISPLAY DICTIONARY zeigt Labels, Werte, Fehlend, Niveau; Skala rechnet', () => {
    const plan = planOriginal();
    const sps = lies('export-plan.sps');
    e.run(datensatz(plan, [
      { zust_z1: 2, zust_z2: 4, zust_z3: -8 },
      { zust_z1: 5, zust_z2: -8, zust_z3: 3 },
      { zust_z1: 1, zust_z2: -8, zust_z3: -8 }
    ]));
    expect(meldungen(e.run(sps))).toEqual([]);
    expect(pruefeWoerterbuch(plan)).toEqual([]);
    const { vars } = wörterbuch();
    expect(vars.get('zust_z2_u')?.label).toBe('Wie sehr stimmen Sie zu? - Ich bin oft müde. (umgepolt)');
    expect(vars.get('lernen')?.niveau).toBe('Scale');
    const liste = JSON.stringify(e.run('LIST zust_z1 zust_z2_u zust_z3 lernen geb.').filter((i: any) => i.type === 'table').map((i: any) => i.cells.map((c: any) => String(c.t).trim())));
    // Fall 1: 2, 6-4=2, -8 fehlend → Mittel aus 2 gültigen = 2.00; Fall 2: 5, Umgepolte fehlt (.), 3 → 4.00; Fall 3: nur ein gültiger Wert → fehlt (mindestens 2)
    expect(liste).toContain('"2","2.00","-8","2.00"');
    expect(liste).toContain('"5",".","3","4.00"');
    expect(liste).toContain('"1",".","-8","."');
    expect(liste).toContain('08-NOV-2026');
  });
  it('Datum: SDATE10 liest ISO 2026-11-08, DATE11 und ADATE10/EDATE10 lesen es nicht (Beleg)', () => {
    e.run('NEW FILE.\nDATA LIST FREE /d (SDATE10).\nBEGIN DATA\n2026-11-08\nEND DATA.\nFORMATS d (DATE11).');
    expect(JSON.stringify(e.run('LIST.'))).toContain('08-NOV-2026');
    e.run('NEW FILE.');
    const falsch = meldungen(e.run('DATA LIST FREE /d (DATE11).\nBEGIN DATA\n2026-11-08\nEND DATA.'));
    expect(falsch.join(' ')).toMatch(/not valid as format DATE/);
  });
  it('LimeSurvey-Erwartung: Struktur nach Handbuch und Importer ohne Verstoß; Namenstabelle passt zu den Codes', () => {
    const plan = planOriginal();
    const text = lies('export-plan.limesurvey.txt');
    expect(lsProbleme(text, plan)).toEqual([]);
    const namen = JSON.parse(lies('export-plan.limesurvey.namen.json')) as Record<string, string>;
    for (const x of alleElemente(plan)) expect(namen[x.id], x.id).toMatch(/^[A-Za-z][A-Za-z0-9]{0,19}$/);
    expect(namen.tv_nutzung).toBe('tvnutzung'); expect(namen['ja_nein:-9']).toBe('M9'); expect(namen.z2).toBe('z2');
    // Pflicht/Filter/Typen stichprobenhaft
    const t = lsLesen(text).slice(1).map(z => Object.fromEntries(LS_KOPF14.map((k, i) => [k, z[i] ?? ''])));
    expect(t.find(z => z.class === 'Q' && z.name === 'tvnutzung' && z.language === 'de')?.relevance).toBe("medien_3.NAOK == 'Y'");
    expect(t.find(z => z.class === 'Q' && z.name === 'zust' && z.language === 'en')?.['type/scale']).toBe('F');
  });
  it('SurveyJS-Erwartung: jedes Element hat type und name, Namen sind eindeutig, jede Wahl hat Text in jeder Sprache', () => {
    const j = JSON.parse(lies('export-plan.surveyjs.json'));
    const namen: string[] = [];
    for (const s of j.pages) for (const x of s.elements) {
      expect(typeof x.type, x.name).toBe('string'); namen.push(x.name);
      for (const w of [...(x.choices ?? []), ...(x.columns ?? [])]) { expect(w.text.de, `${x.name}`).toBeTruthy(); expect(w.text.en).toBeTruthy(); }
    }
    expect(new Set(namen).size).toBe(namen.length);
    expect(namen.length).toBe(11);
  });
});

/* ------------------------------------------------------------------ Bau: alle Exporte */
describe('Paket 2E: Modul lib/fragebogenexport.ts', () => {
  it('liefert die sieben Funktionen', () => {
    for (const n of ['alsXlsform', 'alsLimeSurvey', 'alsSurveyJs', 'alsPsppSyntax', 'kodebuchWord', 'fragebogenWord', 'fragebogenHtml'] as const) expect(typeof mod?.[n], `${n} fehlt (Bau)`).toBe('function');
  });
  it('alle sieben sperren bei Fehlern aus planPruefen (Fehlertext beginnt mit „planFehler“)', async () => {
    const schlecht = planOriginal();
    (alleElemente(schlecht).find(x => x.id === 'alter') as { name: string }).name = 'a b';
    const sync = [() => bau('alsLimeSurvey')(schlecht), () => bau('alsSurveyJs')(schlecht), () => bau('alsPsppSyntax')(schlecht), () => bau('fragebogenHtml')(schlecht, 'de')];
    for (const f of sync) expect(f).toThrow(/^planFehler/);
    for (const f of [() => bau('alsXlsform')(schlecht), () => bau('kodebuchWord')(schlecht), () => bau('fragebogenWord')(schlecht)]) await expect(f()).rejects.toThrow(/^planFehler/);
  });
});

describe('XLSForm', () => {
  it('Zeilen, Spalten und Blätter wie erwartet (aus xlsform.org hergeleitet)', async () => {
    const x = await liesXlsx(await bau('alsXlsform')(planOriginal()));
    expect(x.namen).toEqual(['survey', 'choices', 'settings', 'statable_skalen']);
    const soll = erwartetXlsform();
    for (const n of x.namen) {
      expect(x.blaetter[n]!.kopf, `Kopf ${n}`).toEqual(soll[n]!.kopf);
      expect(x.blaetter[n]!.zeilen, `Zeilen ${n}`).toEqual(soll[n]!.zeilen);
    }
    expect(x.formeln).toBe(0);
  });
  it('Gegenprobe pyxform: ohne Fehler und ohne Warnung', async ctx => {
    if (!PY) { console.warn('ÜBERSPRUNGEN: Python/pyxform fehlt.'); ctx.skip(); return; }
    const r = pyxformLauf(await bau('alsXlsform')(planOriginal()));
    expect(r.status, r.text).toBe(0);
    expect(ohneWarnung(r.text), r.text).toBe(true);
  });
  it('Rückweg: planAusXlsform liest den Export auf denselben Plan (Projektion kern, ohne Ids)', async () => {
    const plan = planOriginal();
    const { plan: zurueck } = await planAusXlsform(await bau('alsXlsform')(plan), 'export.xlsx');
    expect(kern(zurueck)).toEqual(kern(plan));
  });
  it('Bedingungen oder/nicht/verschachtelt und Namen mit Unterstrich (Kleinplan)', async () => {
    const x = await liesXlsx(await bau('alsXlsform')(kleinPlan()));
    const zeile = (n: string) => x.blaetter.survey!.zeilen.find(z => z.name === n)!;
    expect(zeile('v').relevant).toBe("not(${a} < 5 or selected(${c}, '2'))");
    expect(zeile('w').relevant).toBe("(${b} = 1 and ${a} >= 2) or ${b} = ''");
    expect(x.blaetter.settings!.zeilen[0]!.default_language).toBe('Deutsch (de)');
  });
  it('Sicherheit: Text wie =HYPERLINK(…) bleibt Text (keine Formel in der Zelle)', async () => {
    const p = planOriginal();
    (alleElemente(p).find(x => x.id === 'geb') as { text: Record<string, string> }).text.de = '=HYPERLINK("http://x.example","y")';
    p.antwortlisten[0]!.optionen[0]!.text.de = '+cmd|calc';
    const x = await liesXlsx(await bau('alsXlsform')(p));
    expect(x.formeln).toBe(0);
    expect(x.blaetter.survey!.zeilen.find(z => z.name === 'geb')!['label::Deutsch (de)']).toBe('=HYPERLINK("http://x.example","y")');
  });
});

describe('LimeSurvey (Gegenprobe mit echter LimeSurvey: AM MAC; hier nur Struktur nach Handbuch und Importer)', () => {
  it('Text gleich der erwarteten Datei, Namenstabelle gleich', () => {
    const r = bau('alsLimeSurvey')(planOriginal());
    expect(r.text).toBe(lies('export-plan.limesurvey.txt'));
    expect(r.namen).toEqual(JSON.parse(lies('export-plan.limesurvey.namen.json')));
  });
  it('Struktur ohne Verstoß (Klassen, Codes, Sprachblöcke)', () => {
    const plan = planOriginal();
    expect(lsProbleme(bau('alsLimeSurvey')(plan).text, plan)).toEqual([]);
  });
  it('Kleinplan: Unterstrich fällt weg, Zusammenstoß bekommt eine Nummer, nicht/oder/und als ExpressionScript', () => {
    const p = kleinPlan();
    const r = bau('alsLimeSurvey')(p);
    expect(r.namen.x_y).toBe('xy'); expect(r.namen.xy).toBe('xy2');
    expect(lsProbleme(r.text, p)).toEqual([]);
    const t = lsLesen(r.text).slice(1).map(z => Object.fromEntries(LS_KOPF14.map((k, i) => [k, z[i] ?? ''])));
    expect(t.find(z => z.class === 'Q' && z.name === 'v')?.relevance).toBe("!(a.NAOK < 5 || c_2.NAOK == 'Y')");
    expect(t.find(z => z.class === 'Q' && z.name === 'w')?.relevance).toBe("(b.NAOK == '1' && a.NAOK >= 2) || is_empty(b.NAOK)");
  });
  it('Sicherheit: Fragetext mit Zeilenumbruch, Tabulator, Anführungszeichen und <script> ergibt keine zusätzliche Zeile und keinen rohen HTML-Befehl', () => {
    const normal = lsLesen(bau('alsLimeSurvey')(planOriginal()).text).length;
    const p = boesPlan();
    const r = bau('alsLimeSurvey')(p);
    expect(lsLesen(r.text).length).toBe(normal);
    expect(lsProbleme(r.text, p)).toEqual([]);
    expect(r.text).not.toContain('<script');
    expect(r.text).toContain('&lt;script&gt;');
  });
});

describe('SurveyJS', () => {
  it('Struktur gleich der erwarteten Datei (aus der SurveyJS-Doku hergeleitet)', () => {
    const j = bau('alsSurveyJs')(planOriginal());
    expect(JSON.parse(JSON.stringify(j))).toEqual(JSON.parse(lies('export-plan.surveyjs.json')));
  });
  it('Gegenprobe survey-core: lädt ohne Fehler, zählt die Fragen gleich, Filter und Sprache wirken', async ctx => {
    const name = 'survey-core';
    const sc = (await import(/* @vite-ignore */ name).catch(() => null)) as null | { Model: new (j: unknown) => any };
    if (!sc) { console.warn('ÜBERSPRUNGEN: survey-core ist nicht installiert. Der Bauer nimmt es als devDependency auf (npm i -D survey-core); dann läuft dieser Test.'); ctx.skip(); return; }
    const plan = planOriginal();
    const m = new sc.Model(bau('alsSurveyJs')(plan));
    expect(m.jsonErrors ?? []).toEqual([]);
    expect(m.pages.length).toBe(plan.elemente.length);
    expect(m.getAllQuestions().length).toBe(alleElemente(plan).length);
    m.setValue('studium', 2); expect(m.getPageByName('s_medien').isVisible).toBe(false);
    m.setValue('studium', 1); expect(m.getPageByName('s_medien').isVisible).toBe(true);
    m.setValue('medien', [1]); expect(m.getQuestionByName('tv_nutzung').isVisible).toBe(false);
    m.setValue('medien', [3]); expect(m.getQuestionByName('tv_nutzung').isVisible).toBe(true);
    m.locale = 'en'; expect(m.title).toBe('Student survey');
  });
  it('Sicherheit: Text mit <script> im Hinweis (html-Element) ist maskiert', () => {
    const p = planOriginal();
    const h = alleElemente(p).find(x => x.id === 'h_bild') as { bild?: unknown; text: Record<string, string> };
    delete h.bild; h.text.de = '<script>alert(1)</script> & "x"';
    const s = JSON.stringify(bau('alsSurveyJs')(p));
    expect(s).not.toContain('<script>');
    expect(s).toContain('&lt;script&gt;');
  });
});

describe('PSPP-Syntax', () => {
  it('Text gleich der erwarteten Datei', () => {
    expect(bau('alsPsppSyntax')(planOriginal())).toBe(lies('export-plan.sps'));
  });
  it('läuft in der Engine ohne Meldung; DISPLAY DICTIONARY zeigt Labels, Werte, Fehlend, Niveau; Skala rechnet mit Umpolung', () => {
    const plan = planOriginal();
    e.run(datensatz(plan, [{ zust_z1: 2, zust_z2: 4, zust_z3: -8 }, { zust_z1: 5, zust_z2: -8, zust_z3: 3 }]));
    expect(meldungen(e.run(bau('alsPsppSyntax')(plan)))).toEqual([]);
    expect(pruefeWoerterbuch(plan)).toEqual([]);
    const liste = JSON.stringify(e.run('LIST lernen.').filter((i: any) => i.type === 'table').map((i: any) => i.cells.map((c: any) => String(c.t).trim())));
    expect(liste).toContain('"2.00"'); expect(liste).toContain('"4.00"');
  });
  it('Summe statt Mittelwert: SUM.n', () => {
    const p = planOriginal(); p.skalen[0]!.bildung = 'summe'; p.skalen[0]!.mindestens = 3;
    const s = bau('alsPsppSyntax')(p);
    expect(s).toContain('COMPUTE lernen = SUM.3(zust_z1, zust_z2_u, zust_z3).');
    expect(s).toContain("VARIABLE LABELS lernen 'Skala lernen (Summe)'.");
  });
  it('Sicherheit: böser Text in Titel, Fragetext, Wertebeschriftung und Item läuft durch zit/pk - keine neue Variable, keine Fehlermeldung', () => {
    const p = boesPlan();
    const s = bau('alsPsppSyntax')(p);
    e.run(datensatz(p));
    expect(meldungen(e.run(s))).toEqual([]);
    expect([...wörterbuch().vars.keys()]).not.toContain('inj');
    expect(pruefeWoerterbuch(p, false)).toEqual([]);
    for (const zeile of s.replace(/\n$/, '').split('\n')) expect(zeile, 'jede Zeile ist ein Befehl oder Kommentar').toMatch(/^(\*|VARIABLE|VALUE|MISSING|FORMATS|COMPUTE|EXECUTE)/);
  });
});

/* ------------------------------------------------------------------ Word und HTML */
const wordText = (bytes: Uint8Array): string[] => {
  const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
  const ent = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return [...doc.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(m => ent([...m[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(t => t[1]).join(''))).filter(Boolean);
};
describe('Word-Dateien', () => {
  it('Kodebuch: docx-pruefen.mjs ohne Befund; je Variable Name, Label, Werte, Fehlend, Niveau', async () => {
    const plan = planOriginal();
    const bytes = await bau('kodebuchWord')(plan);
    expect(pruefeDocx(bytes)).toEqual([]);
    const text = wordText(bytes).join('\n');
    expect(text).toContain('Studierendenbefragung');
    for (const v of variablenAusPlan(plan)) { expect(text, v.name).toContain(v.name); expect(text, v.name).toContain(v.label!); }
    expect(text).toContain('Keine Angabe'); expect(text).toContain('-9'); expect(text).toMatch(/ordinal/i); expect(text).toMatch(/wenn/i);
  });
  it('Fragebogen: ohne Befund; Überschrift je Seite, nummeriert, Optionen mit ☐ und Code, Filtersatz, Bild-Hinweis', async () => {
    const bytes = await bau('fragebogenWord')(planOriginal());
    expect(pruefeDocx(bytes)).toEqual([]);
    const z = wordText(bytes);
    for (const t of ['Zur Person', 'Mediennutzung', 'Haltungen']) expect(z, t).toContain(t);
    expect(z).toContain('1. Ich stimme der Teilnahme zu.');
    expect(z).toContain('4. Sind Sie eingeschrieben?');
    expect(z).toContain('☐ Ja (1)'); expect(z).toContain('☐ Keine Angabe (-9)');
    expect(z.some(x => /wenn/.test(x) && /Frage 4/.test(x))).toBe(true);
    expect(z.some(x => /wenn/.test(x) && /Frage 5/.test(x))).toBe(true);
    for (const t of ['Ich lerne gern.', 'Ich bin oft müde.', 'Prüfungen sind fair.']) expect(z.some(x => x.includes(t)), t).toBe(true);
  });
  it('Fragebogen ohne Codes und in Englisch (nie still Deutsch)', async () => {
    const bytes = await bau('fragebogenWord')(planOriginal(), { sprache: 'en', codes: false });
    expect(pruefeDocx(bytes)).toEqual([]);
    const text = wordText(bytes).join('\n');
    expect(text).toContain('Student survey'); expect(text).toContain('☐ Yes'); expect(text).not.toContain('(1)');
    expect(text).not.toContain('Sind Sie eingeschrieben');
    expect(pruefeDocx(await bau('kodebuchWord')(planOriginal(), 'en'))).toEqual([]);
  });
  it('Gegenprobe LibreOffice (soffice): öffnet die Dateien; sonst übersprungen mit Meldung', async ctx => {
    const so = ['soffice', 'libreoffice'].find(c => !spawnSync(c, ['--version'], { encoding: 'utf8' }).error);
    if (!so) { console.warn('ÜBERSPRUNGEN: LibreOffice (soffice) ist am PC nicht installiert. Gegenprobe am Mac.'); ctx.skip(); return; }
    const dir = mkdtempSync(join(tmpdir(), 'statable-docx-'));
    for (const [n, f] of [['kodebuch', 'kodebuchWord'], ['fragebogen', 'fragebogenWord']] as const) {
      writeFileSync(join(dir, `${n}.docx`), await (bau(f) as (p: FragebogenPlan) => Promise<Uint8Array>)(planOriginal()));
      const r = spawnSync(so, ['--headless', '--convert-to', 'pdf', '--outdir', dir, join(dir, `${n}.docx`)], { encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0); expect(existsSync(join(dir, `${n}.pdf`))).toBe(true);
    }
  });
});

describe('Fragebogen HTML (zum Lesen)', () => {
  it('lang, title, Überschriften, Listen, Bild mit alt, keine Skripte', () => {
    const h = bau('fragebogenHtml')(planOriginal(), 'de');
    expect(h).toMatch(/^<!doctype html>/i);
    expect(h).toMatch(/<html[^>]*\slang="de"/);
    expect(h).toContain('<title>Studierendenbefragung</title>');
    expect(h).toMatch(/<meta[^>]*charset/i);
    expect(h.match(/<h1[ >]/g)?.length).toBe(1);
    for (const t of ['Zur Person', 'Mediennutzung', 'Haltungen']) expect(h, t).toMatch(new RegExp(`<h2[^>]*>\\s*${t}\\s*</h2>`));
    expect(h).toMatch(/<ol[ >]/); expect(h).toMatch(/<ul[ >]/);
    expect(h).toMatch(/<img[^>]*alt="Foto der Mensa mit Tischen"/);
    expect(h).not.toMatch(/<script/i);
    expect(h).toContain('Sind Sie eingeschrieben?');
  });
  it('Englisch: lang="en", englische Texte, kein Deutsch', () => {
    const h = bau('fragebogenHtml')(planOriginal(), 'en');
    expect(h).toMatch(/<html[^>]*\slang="en"/); expect(h).toContain('<title>Student survey</title>'); expect(h).toContain('Are you enrolled?'); expect(h).not.toContain('Sind Sie');
  });
  it('Sicherheit: <script> im Titel und im Fragetext ist maskiert', () => {
    const p = boesPlan();
    const h = bau('fragebogenHtml')(p, 'de');
    expect(h).not.toMatch(/<script/i); expect(h).toContain('&lt;script&gt;');
  });
  it('Gegenprobe axe (Chromium über Playwright): 0 Verstöße als file://; sonst übersprungen mit Meldung', async ctx => {
    let browser: any = null;
    try { const { chromium } = await import('@playwright/test'); browser = await chromium.launch(); } catch { /* kein Browser */ }
    if (!browser) { console.warn('ÜBERSPRUNGEN: kein Chromium für Playwright startbar. axe läuft im E2E-Lauf (Paket 2E, Abnahme).'); ctx.skip(); return; }
    try {
      const AxeBuilder = (await import('@axe-core/playwright')).default;
      const dir = mkdtempSync(join(tmpdir(), 'statable-html-'));
      writeFileSync(join(dir, 'fragebogen.html'), bau('fragebogenHtml')(planOriginal(), 'de'));
      const page = await (await browser.newContext()).newPage();   // Opus 08.11.: newContext statt newPage (axe-core/playwright verlangt es)
      await page.goto(`file:///${join(dir, 'fragebogen.html').replace(/\\/g, '/')}`);
      const r = await new AxeBuilder({ page }).analyze();
      expect(r.violations.map((v: { id: string }) => v.id)).toEqual([]);
    } finally { await browser.close(); }
  });
});

/* ------------------------------------------------------------------ Testdaten-Bausteine */
/** Der Teil des Plans, den der XLSForm-Rückweg tragen muss (ohne Ids, Einleitung, Abschluss, Einstellungen, Herkunft; bei zahl nur `ganz`, ohne kurz/maxZeichen/einheit). */
function kern(p: FragebogenPlan) {
  const lok = (l: Record<string, string> | undefined) => (l ? Object.fromEntries(p.sprachen.map(s => [s, l[s]])) : undefined);
  return {
    sprachen: p.sprachen, titel: lok(p.titel),
    antwortlisten: p.antwortlisten.map(l => ({ name: l.name, geordnet: l.geordnet, optionen: l.optionen.map(o => ({ wert: o.wert, text: lok(o.text), fehlend: o.fehlend, ausschliessend: !!o.ausschliessend })) })),
    skalen: p.skalen.map(s => ({ name: s.name, items: s.items, bildung: s.bildung, mindestens: s.mindestens })),
    seiten: p.elemente.map(s => ({
      name: s.name, titel: lok(s.titel), wennGezeigt: s.wennGezeigt,
      elemente: s.elemente.map(x => {
        if (x.art === 'hinweis') return { art: x.art, name: x.name, text: lok(x.text), bild: x.bild ? { datei: x.bild.datei, alt: lok(x.bild.alt) } : undefined, wennGezeigt: x.wennGezeigt };
        if (x.art === 'block') return { art: x.art, name: x.name, text: lok(x.text), liste: x.liste, pflicht: !!x.pflicht, niveau: x.kodebuch.niveau, wennGezeigt: x.wennGezeigt, items: x.items.map(i => ({ name: i.name, text: lok(i.text), umgepolt: !!i.umgepolt })) };
        return {
          art: x.art, name: x.name, typ: x.typ, text: lok(x.text), hilfe: lok(x.hilfe), pflicht: !!x.pflicht, liste: x.liste, anders: x.anders ? lok(x.anders.text) : undefined,
          zahl: x.typ === 'regler' ? x.zahl : x.typ === 'zahl' ? { ganz: x.zahl?.ganz } : undefined, mehrzeilig: x.typ === 'text' ? !!x.text_?.mehrzeilig : undefined,
          niveau: x.kodebuch.niveau, wennGezeigt: x.wennGezeigt
        };
      })
    }))
  };
}

/** Kleiner Plan für Bedingungen mit oder/nicht/verschachtelt und für Namen, die sich nach dem Ableiten stoßen (x_y und xy bei LimeSurvey). */
function kleinPlan(): FragebogenPlan {
  const alle = planOriginal();
  const lok = (t: string) => ({ de: t });
  const f = (name: string, typ: string, extra: object = {}) => ({ art: 'frage', id: name, name, typ, text: lok(`Frage ${name}`), kodebuch: { niveau: 'nominal' }, ...extra });
  return {
    format: 'statable-fragebogen', version: 1, id: '0a1b2c3d-0000-4000-8000-000000000001', revision: 1, titel: lok('Klein'), sprachen: ['de'],
    einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
    antwortlisten: [alle.antwortlisten[0]!, { ...alle.antwortlisten[2]!, optionen: alle.antwortlisten[2]!.optionen.map(o => ({ ...o, text: lok(o.text.de!) })) }].map(l => ({ ...l, optionen: l.optionen.map(o => ({ ...o, text: lok(o.text.de!) })) })),
    skalen: [],
    elemente: [{
      art: 'seite', id: 'seite:s1', name: 's1', elemente: [
        f('a', 'zahl', { zahl: { ganz: true }, kodebuch: { niveau: 'skala' } }),
        f('b', 'einfach', { liste: 'ja_nein' }),
        f('c', 'mehrfach', { liste: 'medien' }),
        f('x_y', 'text', { text_: { mehrzeilig: false } }),
        f('xy', 'text', { text_: { mehrzeilig: false } }),
        f('v', 'einfach', { liste: 'ja_nein', wennGezeigt: { nicht: { oder: [{ frage: 'a', ist: '<', wert: 5 }, { frage: 'c', gewaehlt: 2 }] } } }),
        f('w', 'einfach', { liste: 'ja_nein', wennGezeigt: { oder: [{ und: [{ frage: 'b', ist: '=', wert: 1 }, { frage: 'a', ist: '≥', wert: 2 }] }, { frage: 'b', beantwortet: false }] } })
      ]
    }],
    geaendert: 1
  } as unknown as FragebogenPlan;
}

const BOES = `x'); DROP TABLE a; "q" \n* .\nCOMPUTE inj = 99.\n.\t<script>alert(1)</script> & *`;
/** Testplan mit bösem Text (Apostroph, Klammer, Anführungszeichen, Zeilenumbruch, Tabulator, Stern, Punkt, HTML) in Titel, Fragetext, Wertebeschriftung, Block-Item und Hinweis. */
function boesPlan(): FragebogenPlan {
  const p = planOriginal();
  p.titel.de = BOES;
  const el = alleElemente(p);
  (el.find(x => x.id === 'alter') as { text: Record<string, string> }).text.de = BOES;
  (el.find(x => x.id === 'zust') as { items: { text: Record<string, string> }[] }).items[0]!.text.de = BOES;
  p.antwortlisten[0]!.optionen[0]!.text.de = BOES;
  (el.find(x => x.id === 'h_bild') as { text: Record<string, string> }).text.de = BOES;
  return p;
}
