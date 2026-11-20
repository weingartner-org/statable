/**
 * Import qualitativer Codierungen, Stufe 1 (Später S-C, G13; Fachblatt 3 und Entscheidung Opus 4): Code-Matrix (MAXQDA, ATLAS.ti, NVivo) und Segmenttabelle als Tabelle (Excel/CSV).
 * REFI-QDA (.qdpx) entfällt in dieser Welle. Der Text codierter Stellen wird NIE übernommen (er gehört den Teilnehmenden). Nichts wird still verändert:
 * Summenzeilen werden nur nach Nachrechnen UND auf Wunsch weggelassen, Doppelungen werden gemeldet, nicht entfernt (es sei denn, die Person wählt es).
 * Die Zahlen sind Zahlen codierter Stellen, nicht Zahlen von Personen (Sandelowski, Voils & Knafl 2009): für Vergleiche eher „kommt im Dokument vor“ (0/1).
 * Alle Layouts sind nach der Herstellerdokumentation nachgebaut, nicht an echten Exporten geprüft (testdaten/qda/LIESMICH.md).
 */
import { alsZahl, psppName, type Tabelle, type Zelle } from './einlesen';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import type { MehrfachSet } from './mehrfach';
import { freierName } from './skalabau';
import { L, Lp, d as anrede } from './sitzung.svelte';

export interface QdaCode { name: string; spalte: string }
export interface QdaSegment { dokument: string; code: string; beginn: number | null; ende: number | null; codierende: string | null }
export type QdaHinweisArt = 'mehrereCodierende' | 'relativ' | 'summeStimmtNicht' | 'doppelte' | 'elterncodes' | 'datenschutz' | 'doppelteDokumente' | 'faelleOhneCodierung' | 'moeglichProzent';
export interface QdaErgebnis {
  art: 'matrix' | 'segmente' | 'unbekannt';
  hersteller: 'maxqda' | 'atlasti' | 'nvivo' | 'unbekannt';
  dokumente: string[]; codes: QdaCode[]; zaehlung: number[][];
  relativ: false | 'anteil' | 'prozent';
  summen: { zeile: string | null; spalte: string | null; nachgerechnet: boolean | null; weggelassen: boolean };
  eltern: string[]; codierende: string[] | null;
  segmente?: QdaSegment[];
  doppelte: { dokument: string; code: string; beginn: number; ende: number; codierende: string | null; anzahl: number }[];
  hinweise: { art: QdaHinweisArt; spalten?: string[] }[];
  meldungen: { art: 'leer' | 'keineQdaTabelle'; satz: string }[];
}
export interface QdaOpt { summenWeglassen?: boolean; elternAuslassen?: boolean; doppelteEntfernen?: boolean }

const leer = (): QdaErgebnis => ({ art: 'unbekannt', hersteller: 'unbekannt', dokumente: [], codes: [], zaehlung: [], relativ: false, summen: { zeile: null, spalte: null, nachgerechnet: null, weggelassen: false }, eltern: [], codierende: null, doppelte: [], hinweise: [], meldungen: [] });
const text = (v: Zelle | undefined) => (v === null || v === undefined ? '' : v instanceof Date ? '' : String(v).trim());
const zahl = (v: Zelle | undefined): number | null => (v === null || v === undefined || v === '' ? null : typeof v === 'number' ? (Number.isFinite(v) ? v : null) : v instanceof Date ? null : alsZahl(String(v), true));
const SUMME = /^(summe|sum|total|totals|gesamt|insgesamt|σ)$/i;
const CODE_KOPF = /^(code|codes|codesystem|code-system|code system|codename|code name|codebezeichnung|codes\s*\/\s*dokumente|code\s*\/\s*document)$/i;
const SP = {
  dokument: /^(dokument|document|dokumentname|document name|quelle|source|datei|file|interview)$/i,
  code: /^(code|codes|codename|code name)$/i,
  beginn: /^(beginn|start|anfang|begin|von|from)$/i,
  ende: /^(ende|end|bis|to)$/i,
  codierende: /^(codierende|codierer|codiererin|coder|author|autor|benutzer|user|creator|erstellt von)$/i
};
const blattName = (quelle: string) => /Blatt „([^“]+)“|sheet "([^"]+)"/.exec(quelle)?.slice(1).find(Boolean) ?? '';

/** Namen eindeutig machen (nichts geht verloren): „Interview 1“, „Interview 1 (2)“ … */
function eindeutig(namen: string[]): { namen: string[]; doppelt: boolean } {
  const gesehen = new Map<string, number>(); let doppelt = false;
  const aus = namen.map(n => { const k = gesehen.get(n) ?? 0; gesehen.set(n, k + 1); if (k) { doppelt = true; return `${n} (${k + 1})`; } return n; });
  return { namen: aus, doppelt };
}
function codesVon(namen: string[]): QdaCode[] {
  const vergeben = new Set<string>();
  return namen.map((n, i) => ({ name: n, spalte: psppName(n, vergeben, i + 1) }));
}

export function liesQda(t: Tabelle, opt: QdaOpt = {}): QdaErgebnis {
  try { return liesIntern(t, opt); } catch { const e = leer(); e.meldungen.push({ art: 'keineQdaTabelle', satz: KEINE_SATZ() }); return e; }
}
const KEINE_SATZ = () => L('Das sieht nicht nach einer Tabelle mit qualitativen Codierungen aus: Es fehlt eine Code-Matrix (Codes in den Zeilen, Dokumente in den Spalten) oder eine Tabelle mit den Spalten Dokument und Code.', 'This does not look like a table of qualitative codings: a code matrix (codes in rows, documents in columns) or a table with the columns document and code is missing.');

function liesIntern(t: Tabelle, opt: QdaOpt): QdaErgebnis {
  const e = leer();
  if (!t.kopf.length) { e.meldungen.push({ art: 'leer', satz: L('Die Datei ist leer: Es gibt keine Spalten.', 'The file is empty: there are no columns.') }); return e; }
  const blatt = blattName(t.quelle), kopf = t.kopf.map(k => text(k));
  const docI = kopf.findIndex(k => SP.dokument.test(k)), codeI = kopf.findIndex(k => SP.code.test(k));
  if (docI >= 0 && codeI >= 0 && docI !== codeI) return liesSegmente(t, kopf, docI, codeI, blatt, opt);
  if (kopf.length >= 2 && (kopf[0] === '' || CODE_KOPF.test(kopf[0]!)) && t.zeilen.length >= 1) return liesMatrix(t, kopf, blatt, opt);
  e.meldungen.push({ art: 'keineQdaTabelle', satz: KEINE_SATZ() });
  return e;
}

/* ------------------------------------------------------------------ Matrix */
function liesMatrix(t: Tabelle, kopf: string[], blatt: string, opt: QdaOpt): QdaErgebnis {
  const e = leer();
  e.art = 'matrix';
  // Dokumente (Spalten) und Codes (Zeilen); alles bleibt zunächst stehen
  const spaltenNamen = kopf.slice(1);
  const eind = eindeutig(spaltenNamen.map((n, i) => n || `Dokument ${i + 1}`));
  let dok = eind.namen;
  let zeilen = t.zeilen.filter(z => z.some(c => text(c) !== ''));
  let codeNamen = zeilen.map(z => text(z[0]));
  let werte: number[][] = zeilen.map(z => dok.map((_, j) => zahl(z[j + 1]) ?? 0));
  const sumSpaltenIdx = spaltenNamen.findIndex(n => SUMME.test(n)), sumZeileIdx = codeNamen.findIndex(n => SUMME.test(n));
  e.hersteller = /code-matrix|codematrix/i.test(blatt) || /^summe$/i.test(spaltenNamen[sumSpaltenIdx] ?? '') || /^summe$/i.test(codeNamen[sumZeileIdx] ?? '') ? 'maxqda'
    : /code-document|code-dokument/i.test(blatt) || /^totals?$/i.test(spaltenNamen[sumSpaltenIdx] ?? '') || /^totals?$/i.test(codeNamen[sumZeileIdx] ?? '') ? 'atlasti'
    : kopf[0] === '' || /^matrix$/i.test(blatt) ? 'nvivo' : 'unbekannt';
  // Summen nachrechnen
  const tol = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
  const rest = (i: number) => (w: number[]) => w.filter((_, k) => k !== i);
  const zeilenOhne = werte.map((r, i) => ({ r, i })).filter(x => x.i !== sumZeileIdx);
  let nachgerechnet: boolean | null = null;
  if (sumZeileIdx >= 0 || sumSpaltenIdx >= 0) {
    nachgerechnet = true;
    if (sumZeileIdx >= 0) for (let j = 0; j < dok.length; j++) { if (j === sumSpaltenIdx) continue; if (!tol(werte[sumZeileIdx]![j]!, zeilenOhne.reduce((a, x) => a + x.r[j]!, 0))) nachgerechnet = false; }
    if (sumSpaltenIdx >= 0) for (const x of zeilenOhne) if (!tol(x.r[sumSpaltenIdx]!, rest(sumSpaltenIdx)(x.r).reduce((a, b) => a + b, 0))) nachgerechnet = false;
    if (sumZeileIdx >= 0 && sumSpaltenIdx >= 0 && !tol(werte[sumZeileIdx]![sumSpaltenIdx]!, zeilenOhne.reduce((a, x) => a + x.r[sumSpaltenIdx]!, 0))) nachgerechnet = false;
  }
  e.summen = { zeile: sumZeileIdx >= 0 ? codeNamen[sumZeileIdx]! : null, spalte: sumSpaltenIdx >= 0 ? spaltenNamen[sumSpaltenIdx]! : null, nachgerechnet, weggelassen: false };
  if (nachgerechnet === false) e.hinweise.push({ art: 'summeStimmtNicht' });
  // Elterncodes: Zeile = Summe der direkten Kinder (Pfad `Eltern\Kind`) oder darüber, in ALLEN Dokumenten
  const dokOhneSumme = dok.map((_, j) => j).filter(j => j !== sumSpaltenIdx);
  const eltern: number[] = [];
  codeNamen.forEach((n, i) => {
    if (i === sumZeileIdx || n === '') return;
    const kinder = codeNamen.map((k, ki) => ({ k, ki })).filter(x => x.ki !== sumZeileIdx && x.k.startsWith(n + '\\') && !x.k.slice(n.length + 1).includes('\\'));
    if (!kinder.length) return;
    if (dokOhneSumme.every(j => werte[i]![j]! >= kinder.reduce((a, x) => a + werte[x.ki]![j]!, 0) - 1e-9)) eltern.push(i);
  });
  e.eltern = eltern.map(i => codeNamen[i]!);
  if (eltern.length) e.hinweise.push({ art: 'elterncodes' });
  // Summen weglassen (nur nach dem Nachrechnen), Eltern auslassen
  const wegZeilen = new Set<number>(), wegSpalten = new Set<number>();
  if (opt.summenWeglassen && nachgerechnet === true) { if (sumZeileIdx >= 0) wegZeilen.add(sumZeileIdx); if (sumSpaltenIdx >= 0) wegSpalten.add(sumSpaltenIdx); e.summen.weggelassen = true; }
  if (opt.elternAuslassen) for (const i of eltern) wegZeilen.add(i);
  const behaltenZ = codeNamen.map((_, i) => i).filter(i => !wegZeilen.has(i)), behaltenS = dok.map((_, j) => j).filter(j => !wegSpalten.has(j));
  werte = behaltenZ.map(i => behaltenS.map(j => werte[i]![j]!));
  codeNamen = behaltenZ.map(i => codeNamen[i]!);
  dok = behaltenS.map(j => dok[j]!);
  if (opt.elternAuslassen && eltern.length && !e.summen.weggelassen && nachgerechnet === true && (sumZeileIdx >= 0 || sumSpaltenIdx >= 0)) {
    // die Summen stimmen ohne die Elterncodes nicht mehr
    e.summen.nachgerechnet = false; if (!e.hinweise.some(h => h.art === 'summeStimmtNicht')) e.hinweise.push({ art: 'summeStimmtNicht' });
  }
  if (eind.doppelt) e.hinweise.push({ art: 'doppelteDokumente' });
  // Relative Werte: Spalten summieren sich zu 1 oder 100 (ATLAS.ti „Normalisieren“ / relative Häufigkeiten), mit Rundung der Anzeige
  const echteZeilen = codeNamen.map((n, i) => ({ n, i })).filter(x => !SUMME.test(x.n)), echteSpalten = dok.map((n, j) => ({ n, j })).filter(x => !SUMME.test(x.n));
  const summen = echteSpalten.map(s => echteZeilen.reduce((a, z) => a + werte[z.i]![s.j]!, 0));
  const nichtNull = summen.filter(x => x > 0), bruch = echteZeilen.some(z => echteSpalten.some(s => !Number.isInteger(werte[z.i]![s.j]!)));
  if (nichtNull.length && bruch) {
    if (nichtNull.every(x => Math.abs(x - 1) <= 0.001)) e.relativ = 'anteil';
    else if (nichtNull.every(x => Math.abs(x - 100) <= 0.1)) e.relativ = 'prozent';
  }
  if (e.relativ) e.hinweise.push({ art: 'relativ' });
  // Prozente in ganzen Zahlen sehen aus wie Zählungen: summieren sich mindestens zwei Spalten genau zu 100, ist das ein Hinweis (kein Beweis)
  else if (nichtNull.length >= 2 && nichtNull.every(x => Math.abs(x - 100) <= (bruch ? 0.5 : 2))) e.hinweise.push({ art: 'moeglichProzent' });   // gerundete Prozente (33/33/33 = 99) summieren sich nicht genau zu 100: ganze Zahlen 98 bis 102, mit Komma 99,5 bis 100,5
  e.dokumente = dok; e.codes = codesVon(codeNamen); e.zaehlung = werte;
  e.hinweise.push({ art: 'mehrereCodierende' }, { art: 'datenschutz' });
  const ohne = echteSpalten.filter(s => echteZeilen.every(z => werte[z.i]![s.j]! === 0)).map(s => s.n);
  if (ohne.length) e.hinweise.push({ art: 'faelleOhneCodierung', spalten: ohne });
  return e;
}

/* ------------------------------------------------------------------ Segmente */
function liesSegmente(t: Tabelle, kopf: string[], docI: number, codeI: number, blatt: string, opt: QdaOpt): QdaErgebnis {
  const e = leer();
  e.art = 'segmente';
  const bI = kopf.findIndex(k => SP.beginn.test(k)), eI = kopf.findIndex(k => SP.ende.test(k)), cI = kopf.findIndex(k => SP.codierende.test(k));
  e.hersteller = /quotations|zitate/i.test(blatt) || kopf.some(k => /^quotation content$/i.test(k)) ? 'atlasti' : 'unbekannt';
  const alle: QdaSegment[] = [];
  for (const z of t.zeilen) {
    const dokument = text(z[docI]), code = text(z[codeI]);
    if (dokument === '' || code === '') continue;
    // KEIN Text der Stelle: nur diese fünf Angaben werden gelesen
    alle.push({ dokument, code, beginn: bI >= 0 ? zahl(z[bI]) : null, ende: eI >= 0 ? zahl(z[eI]) : null, codierende: cI >= 0 && text(z[cI]) !== '' ? text(z[cI]) : null });
  }
  // Doppelungen: gleiche Stelle, gleicher Code, gleiche Codierende, gleicher Anfang und Ende
  const zaehl = new Map<string, { s: QdaSegment; n: number }>();
  for (const s of alle) { if (s.beginn === null || s.ende === null) continue; const k = JSON.stringify([s.dokument, s.code, s.beginn, s.ende, s.codierende]); const x = zaehl.get(k); if (x) x.n++; else zaehl.set(k, { s, n: 1 }); }
  e.doppelte = [...zaehl.values()].filter(x => x.n > 1).map(x => ({ dokument: x.s.dokument, code: x.s.code, beginn: x.s.beginn!, ende: x.s.ende!, codierende: x.s.codierende, anzahl: x.n }));
  let segmente = alle;
  if (opt.doppelteEntfernen) { const gesehen = new Set<string>(); segmente = alle.filter(s => { if (s.beginn === null || s.ende === null) return true; const k = JSON.stringify([s.dokument, s.code, s.beginn, s.ende, s.codierende]); if (gesehen.has(k)) return false; gesehen.add(k); return true; }); }
  e.segmente = segmente;
  e.dokumente = [...new Set(alle.map(s => s.dokument))];
  const codeNamen = [...new Set(alle.map(s => s.code))];
  e.codes = codesVon(codeNamen);
  const cod = [...new Set(alle.map(s => s.codierende).filter((x): x is string => x !== null))];
  e.codierende = cod.length ? cod : null;
  e.zaehlung = zaehleSegmente(e);
  if (e.doppelte.length) e.hinweise.push({ art: 'doppelte' });
  if (!e.codierende) e.hinweise.push({ art: 'mehrereCodierende' });
  e.hinweise.push({ art: 'datenschutz' });
  return e;
}

/** [code][dokument] aus den Segmenten, in der Reihenfolge von `codes` und `dokumente`; optional nur eine Codierende und ohne Doppelungen. */
export function zaehleSegmente(e: QdaErgebnis, o: { codierende?: string; doppelteEntfernen?: boolean } = {}): number[][] {
  const z = e.codes.map(() => e.dokumente.map(() => 0));
  const ci = new Map(e.codes.map((c, i) => [c.name, i])), di = new Map(e.dokumente.map((d, i) => [d, i]));
  const gesehen = new Set<string>();
  for (const s of e.segmente ?? []) {
    if (o.codierende !== undefined && s.codierende !== o.codierende) continue;
    if (o.doppelteEntfernen && s.beginn !== null && s.ende !== null) { const k = JSON.stringify([s.dokument, s.code, s.beginn, s.ende, s.codierende]); if (gesehen.has(k)) continue; gesehen.add(k); }
    const i = ci.get(s.code), j = di.get(s.dokument);
    if (i !== undefined && j !== undefined) z[i]![j]!++;
  }
  return z;
}

/* ------------------------------------------------------------------ Ergebnisformen */
const sp = (name: string, rest: Partial<Spalte>): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
function alsTabelle(e: QdaErgebnis, f: (n: number) => number, mitLabels: boolean): Daten | null {
  if (e.relativ || e.art === 'unbekannt') return null;
  const breite = Math.max(1, ...e.dokumente.map(d => new TextEncoder().encode(d).length));
  const spalten: Spalte[] = [sp('dokument', { bezeichnung: L('Dokument', 'Document'), art: 'text', niveau: 'nominal', format: `A${breite}` }),
    ...e.codes.map(c => sp(c.spalte, { bezeichnung: c.name, herkunft: 'codes' as const, ...(mitLabels ? { niveau: 'nominal' as const, format: 'F1.0', werteLabels: { '0': L('nicht codiert', 'not coded'), '1': L('codiert', 'coded') } } : {}) }))];
  return { spalten, zeilen: e.dokumente.map((d, j) => [d, ...e.codes.map((_, i) => f(e.zaehlung[i]![j]!))]) };
}
/** Zeilen = Dokumente; `dokument` (Text) und je Code eine Zahlenspalte mit der Zahl der codierten Stellen. null bei relativen Werten (nie als Zählung ausgeben). */
export const alsHaeufigkeit = (e: QdaErgebnis): Daten | null => alsTabelle(e, n => n, false);
/** Dasselbe mit 0/1 („kommt im Dokument vor“). */
export const alsVorkommen = (e: QdaErgebnis): Daten | null => alsTabelle(e, n => (n > 0 ? 1 : 0), true);
/** Die 0/1-Spalten als Mehrfachset (für „Kategorisieren“ und „Tabelle zusammenstellen“: Themen nach Gruppe). */
export const alsMehrfachSet = (e: QdaErgebnis, name: string): MehrfachSet => ({ name, label: name, spalten: e.codes.map(c => c.spalte), zaehlwert: 1 });

/** G2 auf Dokument-Ebene: Einheit = Dokument × Code, Wert 0/1 je Codierende. null ohne mindestens zwei Codierende. */
export function dokumentEbene(e: QdaErgebnis): { einheiten: string[]; codierende: string[]; spalten: (0 | 1)[][] } | null {
  if (e.art !== 'segmente' || !e.codierende || e.codierende.length < 2) return null;
  const einheiten: string[] = [], hat = new Set(e.segmente!.map(s => JSON.stringify([s.dokument, s.code, s.codierende])));
  const spalten: (0 | 1)[][] = e.codierende.map(() => []);
  for (const d of e.dokumente) for (const c of e.codes) {
    einheiten.push(`${d}|${c.spalte}`);
    e.codierende.forEach((k, ki) => spalten[ki]!.push(hat.has(JSON.stringify([d, c.name, k])) ? 1 : 0));
  }
  return { einheiten, codierende: e.codierende, spalten };
}
export const dokumentEbeneHinweis = () => L('Das misst, ob zwei Personen ein Dokument gleich einordnen, nicht ob sie dieselben Textstellen markiert haben.', 'This measures whether two people classify a document in the same way, not whether they marked the same passages of text.');

/* ------------------------------------------------------------------ Zusammenführen */
/** Unicode NFC, Randleerraum weg, klein, Dateiendung (.docx .doc .pdf .txt .rtf .odt) weg. „Interview 1“ und „interview_1“ sind NICHT gleich. */
export function normalisiereDokumentName(n: string): string {
  return n.normalize('NFC').trim().replace(/\.(docx|doc|pdf|txt|rtf|odt)\s*$/i, '').trim().toLowerCase();
}
export function dokumenteAbgleichen(a: string[], b: string[]): { zugeordnet: { a: string; b: string }[]; nurA: string[]; nurB: string[] } {
  const bn = new Map<string, string>();
  for (const x of b) { const k = normalisiereDokumentName(x); if (!bn.has(k)) bn.set(k, x); }
  const zugeordnet: { a: string; b: string }[] = [], nurA: string[] = [], benutzt = new Set<string>();
  for (const x of a) { const k = normalisiereDokumentName(x), partner = bn.get(k); if (partner !== undefined && !benutzt.has(k)) { zugeordnet.push({ a: x, b: partner }); benutzt.add(k); } else nurA.push(x); }
  const nurB = b.filter(x => !benutzt.has(normalisiereDokumentName(x)));
  return { zugeordnet, nurA, nurB };
}
/** Spalten von `v` (außer dem Schlüssel) an `h` hängen; ohne Partner leer (null), nie geraten. */
export function verbindeMitVariablen(h: Daten, v: Daten, o: { dokument: string; schluessel: string }): { daten: Daten; nichtZugeordnet: { codes: string[]; variablen: string[] } } {
  const hi = h.spalten.findIndex(s => s.name === o.dokument), vi = v.spalten.findIndex(s => s.name === o.schluessel);
  if (hi < 0 || vi < 0) throw new Error('spalte');
  const index = new Map<string, number>();
  v.zeilen.forEach((z, i) => { const k = normalisiereDokumentName(String(z[vi] ?? '')); if (!index.has(k)) index.set(k, i); });
  const neueSpalten: { sp: Spalte; i: number }[] = [];
  const vergeben = h.spalten.map(s => s.name);
  v.spalten.forEach((s, i) => { if (i === vi) return; const name = freierName(s.name, vergeben); vergeben.push(name); neueSpalten.push({ sp: { ...s, name }, i }); });
  const benutzt = new Set<number>(), ohne: string[] = [];
  const zeilen = h.zeilen.map(z => {
    const name = String(z[hi] ?? ''), j = index.get(normalisiereDokumentName(name));
    if (j === undefined) { ohne.push(name); return [...z, ...neueSpalten.map(() => null)]; }
    benutzt.add(j);
    return [...z, ...neueSpalten.map(n => v.zeilen[j]![n.i] ?? null)];
  });
  const variablen = v.zeilen.flatMap((z, i) => (benutzt.has(i) ? [] : [String(z[vi] ?? '')]));
  return { daten: { spalten: [...h.spalten, ...neueSpalten.map(n => n.sp)], zeilen }, nichtZugeordnet: { codes: ohne, variablen } };
}

/* ------------------------------------------------------------------ Sätze für den Dialog */
export function qdaHinweisSatz(h: { art: QdaHinweisArt; spalten?: string[] }, e: QdaErgebnis): string {
  switch (h.art) {
    case 'mehrereCodierende': return L('Waren mehrere Personen am Codieren? Dann stimmen die Häufigkeiten nicht.', 'Did several people do the coding? Then the frequencies are not correct.');
    case 'datenschutz': return anrede('Dokumentnamen sind oft Namen von Teilnehmenden. Für die Abgabe solltest du sie durch Kennungen ersetzen.', 'Dokumentnamen sind oft Namen von Teilnehmenden. Für die Abgabe sollten Sie sie durch Kennungen ersetzen.', 'Document names are often the names of participants. Before handing in, you should replace them with codes.');
    case 'relativ': return L('Die Zahlen sind Anteile oder Prozent, keine Zählungen. Sie werden nicht als Häufigkeiten übernommen.', 'The numbers are shares or percentages, not counts. They are not taken over as frequencies.');
    case 'summeStimmtNicht': return L('Die Summen in der Tabelle stimmen nicht mit den Zahlen überein. Deshalb lasse ich sie nicht weg.', 'The totals in the table do not match the numbers. That is why I do not leave them out.');
    case 'doppelte': { const n = e.doppelte.length; return Lp(n, `${n} Stelle kommt doppelt vor (gleicher Code, gleiche Codierende, gleicher Anfang und Ende). Sie ist mitgezählt; auf Wunsch zähle ich sie nur einmal.`, `${n} Stellen kommen doppelt vor (gleicher Code, gleiche Codierende, gleicher Anfang und Ende). Sie sind mitgezählt; auf Wunsch zähle ich sie nur einmal.`, `${n} passage appears twice (same code, same coder, same start and end). It is counted; if you wish I count it once.`, `${n} passages appear twice (same code, same coder, same start and end). They are counted; if you wish I count them once.`); }
    case 'elterncodes': return L('Manche Codes sind Oberbegriffe: ihre Zeile ist die Summe der Unterbegriffe. Sie lassen sich weglassen.', 'Some codes are parent codes: their row is the sum of their child codes. They can be left out.');
    case 'moeglichProzent': return L('Jede Spalte der Tabelle summiert sich zu (fast) genau 100. Das können Prozente statt Zählungen sein. Beim Export sollten Häufigkeiten statt Prozent gewählt werden; sonst sind die Zahlen keine Häufigkeiten.', 'Every column of the table adds up to (almost) exactly 100. These may be percentages instead of counts. When exporting, frequencies should be chosen instead of percent; otherwise the numbers are not frequencies.');
    case 'doppelteDokumente': return L('Ein Dokumentname kommt mehrfach vor. Ich habe die späteren mit einer Nummer versehen, nichts ist verloren gegangen.', 'A document name appears more than once. I numbered the later ones; nothing was lost.');
    case 'faelleOhneCodierung': return L(`Diese Dokumente haben keine einzige Codierung: ${(h.spalten ?? []).join(', ')}.`, `These documents have no coding at all: ${(h.spalten ?? []).join(', ')}.`);
  }
}
/** Immer anzeigen: Zahlen codierter Stellen sind keine Zahlen von Personen. */
export const stellenHinweis = () => L('Die Zahlen sind Zahlen codierter Stellen, nicht Zahlen von Personen. Für Vergleiche ist „kommt im Dokument vor“ (0/1) oft besser.', 'The numbers are numbers of coded passages, not numbers of people. For comparisons "occurs in the document" (0/1) is often better.');

/* ------------------------------------------------------------------ Hilfe für den Dialog: Dokumentvariablen aus Excel/CSV */
/** Eine eingelesene Tabelle (Excel/CSV) als `Daten`: Zahlen als Zahlen, alles andere als Text (Datumsangaben bleiben Text). */
export function tabelleAlsDaten(t: Tabelle): Daten {
  const vergeben = new Set<string>();
  const spalten = t.kopf.map((k, i) => {
    const werte = t.zeilen.map(z => z[i] ?? null).filter(v => v !== null && text(v) !== '');
    const zahlSpalte = werte.length > 0 && werte.every(v => zahl(v) !== null);
    const name = psppName(k, vergeben, i + 1);
    const breite = Math.max(1, ...werte.map(v => new TextEncoder().encode(text(v)).length));
    return sp(name, { bezeichnung: k && k !== name ? k : '', art: zahlSpalte ? 'zahl' : 'text', niveau: zahlSpalte ? 'metrisch' : 'nominal', format: zahlSpalte ? 'F8.0' : `A${Math.min(32767, breite)}` });
  });
  const zeilen = t.zeilen.map(z => spalten.map((c, i) => { const v = z[i] ?? null; if (v === null || text(v) === '') return null; return c.art === 'zahl' ? zahl(v) : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim(); }));
  return { spalten, zeilen };
}
/** Dokumentnamen durch Nummern ersetzen („Dokument 1“ …): für die Abgabe, wenn die Namen Personen verraten. */
export function dokumentePseudonym(h: Daten, spalte = 'dokument'): Daten {
  const i = h.spalten.findIndex(c => c.name === spalte);
  if (i < 0) return h;
  const breite = `Dokument ${h.zeilen.length}`.length;
  return { spalten: h.spalten.map((c, k) => (k === i ? { ...c, format: `A${breite}` } : c)), zeilen: h.zeilen.map((z, r) => z.map((v, k) => (k === i ? `${L('Dokument', 'Document')} ${r + 1}` : v))) };
}
/** G2 auf Dokument-Ebene als Daten für die Karte „Übereinstimmung“: eine Zeile je Einheit (Dokument × Code), je Codierende eine 0/1-Spalte. */
export function dokumentEbeneAlsDaten(e: QdaErgebnis): Daten | null {
  const d = dokumentEbene(e); if (!d) return null;
  const vergeben = new Set<string>(['einheit']);
  const cod = d.codierende.map((k, i) => sp(psppName(k, vergeben, i + 1), { bezeichnung: L(`Codiert von ${k}`, `Coded by ${k}`), niveau: 'nominal', format: 'F1.0', werteLabels: { '0': L('nicht codiert', 'not coded'), '1': L('codiert', 'coded') } }));
  const breite = Math.max(1, ...d.einheiten.map(x => new TextEncoder().encode(x).length));
  return { spalten: [sp('einheit', { bezeichnung: L('Einheit (Dokument | Code)', 'Unit (document | code)'), art: 'text', niveau: 'nominal', format: `A${breite}` }), ...cod], zeilen: d.einheiten.map((u, r) => [u, ...d.spalten.map(c => c[r]!)]) };
}
