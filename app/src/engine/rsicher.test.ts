import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { rId, rQ, rIds, rZahl, rGanz, rBool, rWahl, rArg, rListeIds, rIdsListe, rIdsListen, rAnzeigeName, rAnzeigeText, rAnzeigeZahl } from './rsicher';

/* SICHERHEIT: Regeln für R-Code (siehe engine/rsicher.ts) und der Wächter, der den Quelltext prüft.
 *
 * Die Regel, die der Wächter durchsetzt (eine gleichwertige, prüfbare Fassung von „kein ${…} in R-Code“):
 *  1. R wird nur in drei Dateien angesprochen: engine/webr.ts (der Motor), lib/rverfahren.svelte.ts (die Verfahren), seiten/RProbe.svelte (Entwicklerseite, nur feste Texte).
 *  2. In diesen und in den Dateien, die R-Aufrufe bauen (kategreg, cox, metaanalyse, mehrebenen), darf in einem Code-Text (Template-Literal, das nach R aussieht:
 *     sp_…(, tryCatch(, list(, library(, character(0)) mit ${…} NUR eingesetzt werden: ein Aufruf von rId, rQ, rIds, rZahl, rGanz, rBool, rWahl, rArg, rArgOderNull, rQOderNull,
 *     rQOderLeer, rListeIds - oder ein Teilstück, das selbst geprüft ist und rTeil… heißt, oder die festen Quelltexte STATABLE_R, R_START, p.code.
 *  3. Der R-Text, den die Person nur ANSIEHT (Funktionen …RCode), darf Namen und Texte aus den Daten nur über rAnzeigeName / rAnzeigeText / rAnzeigeZahl einsetzen.
 *  4. Beim Aufruf von rechne / evalR / evalRVoid wird der Code nicht mit + zusammengesetzt.
 *  Dazu die Läufe gegen echtes webR: engine/injektion.webr.test.ts. */

describe('rsicher: Bezeichner, Zahlen, Auswahl', () => {
  it('rId lässt nur /^[A-Za-z][A-Za-z0-9_.]*$/ durch und wirft sonst (kein Maskieren)', () => {
    for (const ok of ['y', 'p01', 'v12', 'zeit', 'ph.ecog', 'a_b', 'F2', 'x1.y_z']) expect(rId(ok)).toBe(ok);
    for (const nein of ['', 'a b', 'a`b', "a'b", 'a"b', 'a\nb', 'a\n', '1a', '.a', '_a', 'a-b', 'a;b', 'a)b', 'a#', 'a\\b', 'ä', 'system("x")', 'if', 'TRUE', 'NULL', 'function', 'a'.repeat(65)]) expect(() => rId(nein), JSON.stringify(nein)).toThrow(/Unsicher/);
    for (const n of [null, undefined, 5, {}, ['a']]) expect(() => rId(n)).toThrow();
    expect(rQ('p01')).toBe("'p01'"); expect(rIds(['a', 'b'])).toBe("c('a', 'b')"); expect(rIds([])).toBe('character(0)');
    expect(() => rIds(['a', "b'"])).toThrow();
    expect(rListeIds([['F1', ['v1', 'v2']], ['F2', ['v3']]])).toBe("list(F1 = c('v1', 'v2'), F2 = c('v3'))");
    expect(() => rListeIds([['F1`', ['v1']]])).toThrow();
  });
  it('rIdsListe und rIdsListen (Modelle aus Termen, Kurs-Paket): nur Bezeichner, verschachtelt', () => {
    expect(rIdsListe([['a', 'b'], ['c']])).toBe("list(c('a', 'b'), c('c'))");
    expect(rIdsListen([[['a'], ['a', 'b']], [['a']]])).toBe("list(list(c('a'), c('a', 'b')), list(c('a')))");
    expect(rIdsListen([])).toBe('list()');
    expect(() => rIdsListe([["a'); system('x'); ('"]])).toThrow(/Unsicher/); expect(() => rIdsListen([[['a`b']]])).toThrow(/Unsicher/);
  });
  it('rZahl, rGanz, rBool, rWahl, rArg', () => {
    expect(rZahl(1.5)).toBe('1.5'); expect(rZahl(-3)).toBe('-3'); expect(rZahl(1e-7)).toBe('1e-7');
    for (const x of [NaN, Infinity, -Infinity, '1', '1); x', null, undefined]) expect(() => rZahl(x)).toThrow();
    expect(rGanz(1000)).toBe('1000L'); expect(() => rGanz(1.5)).toThrow(); expect(() => rGanz('3' as unknown)).toThrow(); expect(() => rGanz(NaN)).toThrow();
    expect(rBool(true)).toBe('TRUE'); expect(rBool(false)).toBe('FALSE');
    for (const x of ['TRUE', 1, 0, null, undefined, 'x; y']) expect(() => rBool(x)).toThrow();
    expect(rWahl('efron', ['efron', 'breslow'] as const)).toBe("'efron'");
    for (const x of ["efron'); system('x'); ('", 'Efron', '', 5, null]) expect(() => rWahl(x, ['efron', 'breslow'] as const)).toThrow();
    expect(rArg('stufen')).toBe('.sp_arg$stufen'); expect(() => rArg('a$b')).toThrow(); expect(() => rArg('a`b')).toThrow();
  });
  it('Anzeige: Namen und Texte so maskiert, dass nichts ausbrechen kann', () => {
    expect(rAnzeigeName('alter')).toBe('alter'); expect(rAnzeigeName('ph.ecog')).toBe('ph.ecog'); expect(rAnzeigeName('a b')).toBe('`a b`'); expect(rAnzeigeName('if')).toBe('`if`');
    expect(rAnzeigeName('.5')).toBe('`.5`'); expect(rAnzeigeName('1a')).toBe('`1a`');
    expect(rAnzeigeName('x`\nassign(1)\n#')).toBe('`x\\`\\nassign(1)\\n#`');
    expect(rAnzeigeName('a\\b')).toBe('`a\\\\b`');
    expect(rAnzeigeText("O'Brien")).toBe("'O\\'Brien'"); expect(rAnzeigeText('a\\')).toBe("'a\\\\'"); expect(rAnzeigeText('x\ny\r\tz')).toBe("'x\\ny\\r\\tz'");
    expect(rAnzeigeText('\u0001\u007f')).toBe("'\\x01\\x7f'"); expect(rAnzeigeText('mäßig "ja"')).toBe(`'mäßig "ja"'`);
    for (const t of ["'); system('x'); ('", '`; system("x"); `', '\\\'); #']) {
      // nach dem Maskieren kommt in der Zeichenkette kein unmaskiertes Apostroph und kein Zeilenumbruch mehr vor
      const m = rAnzeigeText(t).slice(1, -1);
      expect(m.replace(/\\\\/g, '').replace(/\\'/g, '')).not.toContain("'");
    }
    // Zeilenumbrüche und Bidi-Zeichen: nie roh im Anzeigetext
    for (const z of ['\u0085', '\u2028', '\u2029', '\u202a', '\u202e', '\u2066', '\u2069', '\u200f']) {
      const h = '\\u' + z.charCodeAt(0).toString(16).padStart(4, '0');
      expect(rAnzeigeName('a' + z + 'b')).toBe('`a' + h + 'b`'); expect(rAnzeigeText('a' + z + 'b')).toBe("'a" + h + "b'");
    }
    expect(rAnzeigeZahl(1.5)).toBe('1.5'); expect(rAnzeigeZahl(NaN)).toBe('NA'); expect(rAnzeigeZahl('1); x' as unknown)).toBe('NA');
  });
});

/* ---------------------------------------------------------------- Wächter für den Quelltext */

const SRC = join(import.meta.dirname, '..');
function alleDateien(ordner: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (!['node_modules', 'i18n', 'hilfe', 'testdaten'].includes(n)) alleDateien(p, aus); }
    else if (/\.(ts|svelte)$/.test(n) && !/\.test\.ts$/.test(n)) aus.push(p);
  }
  return aus;
}
/** Nur der Teil zwischen <script …> und </script>; alles andere wird durch Leerzeichen ersetzt (Zeilen bleiben). */
function skript(datei: string, text: string): string {
  if (!datei.endsWith('.svelte')) return text;
  let aus = text.replace(/[^\n]/g, ' ');
  for (const m of text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) { const a = m.index! + m[0].indexOf('>') + 1; aus = aus.slice(0, a) + m[1] + aus.slice(a + m[1]!.length); }
  return aus;
}

interface Vorlage { start: number; zeile: number; teile: string[]; ausdruecke: string[]; ende: number }
/** Zerlegt Quelltext in Template-Literale (auch verschachtelte), ohne sich von Kommentaren, Zeichenketten und regulären Ausdrücken täuschen zu lassen. */
export function vorlagen(src: string): Vorlage[] {
  const aus: Vorlage[] = [];
  const zeileVon = (i: number) => src.slice(0, i).split('\n').length;
  /** Überspringt Kommentar, Zeichenkette oder regulären Ausdruck ab i; -1, wenn bei i keiner beginnt. */
  function ueberspringe(i: number): number {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1; return j + 1; }
    if (c === '/') {
      let k = i - 1; while (k >= 0 && /\s/.test(src[k]!)) k--;
      const vor = src[k];
      const kopf = src.slice(Math.max(0, k - 6), k + 1);
      if (k < 0 || '(,=:[!&|?{};'.includes(vor!) || /\breturn$/.test(kopf)) {
        let j = i + 1, klasse = false;
        while (j < src.length) { const d = src[j]; if (d === '\\') j += 2; else if (d === '[') { klasse = true; j++; } else if (d === ']') { klasse = false; j++; } else if (d === '/' && !klasse) break; else if (d === '\n') return -1; else j++; }
        j++; while (/[a-z]/.test(src[j] ?? '')) j++;
        return j;
      }
    }
    return -1;
  }
  function vorlage(i: number): number {
    const v: Vorlage = { start: i, zeile: zeileVon(i), teile: [], ausdruecke: [], ende: i };
    aus.push(v);
    let j = i + 1, teil = '';
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') { teil += src.slice(j, j + 2); j += 2; continue; }
      if (c === '`') { v.teile.push(teil); v.ende = j + 1; return j + 1; }
      if (c === '$' && src[j + 1] === '{') {
        v.teile.push(teil); teil = '';
        let k = j + 2, tiefe = 1; const a = k;
        while (k < src.length && tiefe > 0) {
          const u = ueberspringe(k);
          if (u >= 0) { k = u; continue; }
          if (src[k] === '`') { k = vorlage(k); continue; }
          if (src[k] === '{') tiefe++; else if (src[k] === '}') tiefe--;
          k++;
        }
        v.ausdruecke.push(src.slice(a, k - 1).trim());
        j = k; continue;
      }
      teil += c; j++;
    }
    return j;
  }
  let i = 0;
  while (i < src.length) {
    const u = ueberspringe(i);
    if (u >= 0) { i = u; continue; }
    if (src[i] === '`') { i = vorlage(i); continue; }
    i++;
  }
  return aus;
}
/** Steht der Ausdruck als ein einziger Aufruf `name(...)`, dessen Klammer erst am Ende schließt? */
function einAufruf(ausdruck: string, namen: string[]): boolean {
  const m = new RegExp(`^(${namen.join('|')})\\(`).exec(ausdruck);
  if (!m) return false;
  let tiefe = 0;
  for (let i = m[0].length - 1; i < ausdruck.length; i++) {
    const c = ausdruck[i];
    if (c === "'" || c === '"') { i++; while (i < ausdruck.length && ausdruck[i] !== c) i += ausdruck[i] === '\\' ? 2 : 1; continue; }
    if (c === '(') tiefe++; else if (c === ')') { tiefe--; if (tiefe === 0) return i === ausdruck.length - 1; }
  }
  return false;
}

const R_ERLAUBT = ['engine/webr.ts', 'lib/rverfahren.svelte.ts', 'seiten/RProbe.svelte'];
/** Dateien, die R-Aufrufe bauen oder abschicken. */
const R_DATEIEN = [...R_ERLAUBT, 'lib/kategreg.ts', 'lib/cox.ts', 'lib/metaanalyse.ts', 'lib/mehrebenen.ts', 'lib/verfahren.ts', 'lib/umfragedaten.ts', 'lib/genauigkeit.ts', 'lib/umfrage-gr-rechnen.ts', 'lib/quantil.ts', 'lib/quantilsaetze.ts', 'lib/strafreg.ts', 'lib/strafregsaetze.ts', 'lib/coxzeit.ts', 'lib/coxzeitsaetze.ts', 'lib/sterbetafel.ts', 'lib/sterbetafelsaetze.ts', 'lib/prognose.ts', 'lib/prognoseblatt.ts', 'lib/massnahme.ts', 'lib/ausreisserzeit.ts', 'lib/granger.ts', 'lib/modellneu.ts', 'lib/mehrere.ts', 'lib/kpdaten.ts', 'lib/diskriminanz.ts', 'lib/loglinear.ts', 'lib/manova.ts', 'lib/probit.ts', 'lib/wls.ts', 'lib/nls.ts', 'lib/armut.ts'];   // Kurs-Paket (Fachblatt KURSPAKET)   // Prognose der Zeitreihen   // Später S-E: Quantilregression und Strafregression   // verfahren.ts: nur der R-Text zum Ansehen (syntax)
const SICHER_CODE = ['rId', 'rQ', 'rIds', 'rZahl', 'rGanz', 'rBool', 'rWahl', 'rArg', 'rArgOderNull', 'rQOderNull', 'rQOderLeer', 'rListeIds'];
const FEST = /^(rTeil\w*|STATABLE_R|R_START|p\.code)$/;
/** Sieht der Text nach R-Code aus? */
const SIEHT_NACH_R = /\b(sp_[a-z0-9_]+\s*\(|tryCatch\s*\(|list\s*\(|library\s*\(|character\s*\(\s*0\s*\)|rm\s*\(|data\.frame\s*\(|stats::|assign\s*\(|globalenv\s*\()|\.sp_arg|<-\s|\s~\s|\bc\(\s*'/;
/** Aufrufe, die nur in R-Text zum Ansehen vorkommen (Modelle) - dort gilt die Anzeige-Regel, auch außerhalb von …RCode-Funktionen. */
const ANZEIGE_ZEICHEN = /\b(lmer|survfit|survdiff|coxph|Surv|polr|multinom|glm|rma|library)\s*\(/;
const ANZEIGE_SICHER = ['rAnzeigeName', 'rAnzeigeText', 'rAnzeigeZahl', 'rn', 'rs', 'rq', 'T', 'L', 'Math\\.max', 'rhs'];
/** Felder, in denen Text aus den Daten steht: im Anzeigecode nie roh einsetzen. */
const DATENFELD = /\b(name|ziel|zeit|ereignis|ereignisWert|gruppe|y|steigung|stufen|referenz|label|labels|fragen|massName|namen|l1|l2|l3|l4)\b/;

function deklaration(src: string, index: number): string {
  const kopf = src.slice(0, index).split('\n');
  for (let z = kopf.length - 1; z >= 0; z--) { const m = /^(?:export\s+)?(?:async\s+)?(?:function\s+|const\s+|let\s+|class\s+)([A-Za-z_$][\w$]*)/.exec(kopf[z]!); if (m) return m[1]!; }
  return '';
}
/** Entfernt aus einem Ausdruck, was für die Anzeige-Regel keine Rolle spielt: verschachtelte Texte (sie werden für sich geprüft), erlaubte Aufrufe `name(...)` und Ketten `x.map(rs)`,
 *  Zeichenketten, und die Bedingung vor einem `?` (sie wird nicht eingesetzt). */
function ohneErlaubtes(ausdruck: string): string {
  let t = ausdruck;
  const innen = vorlagen(t); let bis = -1;
  for (const v of innen.sort((x, y) => x.start - y.start)) { if (v.start < bis) continue; t = t.slice(0, v.start) + ' '.repeat(v.ende - v.start) + t.slice(v.ende); bis = v.ende; }
  for (const n of ANZEIGE_SICHER) {
    for (;;) {
      const m = new RegExp(`\\b${n}\\(`).exec(t);
      if (!m) break;
      let tiefe = 0, i = m.index + m[0].length - 1;
      for (; i < t.length; i++) { if (t[i] === '(') tiefe++; else if (t[i] === ')') { tiefe--; if (tiefe === 0) break; } }
      t = t.slice(0, m.index) + t.slice(i + 1);
    }
  }
  t = t.replace(/[\w.!]+\.map\((?:rn|rs|rq|rAnzeigeName|rAnzeigeText|(?:\w+) => (?:rn|rs|rq|rAnzeigeName|rAnzeigeText)\(\w+\.\w+\))\)/g, '');
  t = t.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
  const q = t.indexOf('?');
  return q >= 0 ? t.slice(q + 1) : t;
}

/** Prüft eine Datei; liefert die Verstöße als Texte. */
export function pruefeDatei(datei: string, quelle: string): string[] {
  const fehler: string[] = [];
  const src = skript(datei, quelle);
  for (const v of vorlagen(src)) {
    if (!v.ausdruecke.length) continue;
    const text = v.teile.join('\u0000').replace(/\\[nrt]/g, ' ');   // \n im Quelltext trennt Wörter
    if (!SIEHT_NACH_R.test(text)) continue;
    const anzeige = /RCode$/.test(deklaration(src, v.start)) || ANZEIGE_ZEICHEN.test(text);
    for (const a of v.ausdruecke) {
      if (anzeige) {
        const rest = ohneErlaubtes(a);
        if (DATENFELD.test(rest)) fehler.push(`${datei}:${v.zeile}: im Anzeigecode steht \${${a}} roh - Namen und Texte aus den Daten nur über rAnzeigeName/rAnzeigeText/rAnzeigeZahl`);
      } else if (!(einAufruf(a, SICHER_CODE) || FEST.test(a))) {
        fehler.push(`${datei}:${v.zeile}: im R-Code steht \${${a}} - erlaubt sind nur ${SICHER_CODE.join(', ')} (oder ein rTeil…-Stück)`);
      }
    }
  }
  // R-Text, der mit +, concat, replace oder join zusammengesetzt wird (auch in einer Variablen, die später an rechne geht). Der Anzeigecode (…RCode) ist ausgenommen.
  const ohneKommentar = src.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"`])\/\/[^\n]*/g, (m, v) => ' '.repeat(m.length));
  for (const m of ohneKommentar.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g)) {
    if (!SIEHT_NACH_R.test(m[0])) continue;
    if (/RCode$/.test(deklaration(src, m.index!))) continue;
    const davor = ohneKommentar.slice(Math.max(0, m.index! - 8), m.index!), danach = ohneKommentar.slice(m.index! + m[0].length, m.index! + m[0].length + 24);
    let inArray = false;   // steht das Literal in einem Array-Literal, das mit .join zusammengesetzt wird?
    for (let k = m.index! - 1, tiefe = 0; k >= Math.max(0, m.index! - 600); k--) { const c = ohneKommentar[k]; if (c === ']') tiefe++; else if (c === '[') { if (tiefe === 0) { let j = k + 1, t = 1; while (j < ohneKommentar.length && t > 0) { if (ohneKommentar[j] === '[') t++; else if (ohneKommentar[j] === ']') t--; j++; } inArray = /^\s*\.join\(/.test(ohneKommentar.slice(j, j + 12)); break; } tiefe--; } else if (c === ';' || c === '{' || c === '}') break; }
    if (/\+\s*$/.test(davor) || /^\s*(\+|\.concat\(|\.replace(All)?\(|\.join\()/.test(danach) || /\.concat\(\s*$/.test(davor) || inArray)
      fehler.push(`${datei}:${src.slice(0, m.index!).split('\n').length}: R-Text ${m[0].slice(0, 40)}… wird mit +, concat, replace oder join zusammengesetzt - Einsetzungen nur in einer Vorlage über rId/rQ/rIds/rZahl/rGanz/rBool/rWahl/rArg`);
  }
  // rechne/evalR/evalRVoid: der Code wird nicht mit + zusammengesetzt
  for (const m of src.matchAll(/\b(?:rechne|evalR|evalRVoid|evalRString)\s*(?:<[^(]*>)?\(/g)) {
    const a = m.index! + m[0].length; let tiefe = 0, i = a;
    for (; i < src.length; i++) {
      const u = (() => { const c = src[i]; if (c === "'" || c === '"') { let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1; return j + 1; } return -1; })();
      if (u >= 0) { i = u - 1; continue; }
      if (src[i] === '`') { const v = vorlagen(src.slice(i)); i += v[0]!.ende - 1; continue; }
      if ('([{'.includes(src[i]!)) tiefe++;
      else if (')]}'.includes(src[i]!)) { if (tiefe === 0) break; tiefe--; }
      else if (src[i] === ',' && tiefe === 0) break;
      else if (src[i] === '+' && tiefe === 0) { fehler.push(`${datei}:${src.slice(0, m.index).split('\n').length}: ${m[0]}…) setzt den Code mit + zusammen`); break; }
    }
    // Das Argument selbst: ein Text, eine Vorlage mit nur sicheren Einsetzungen (auch ohne R-Aussehen) oder ein bekannter, schon geprüfter Code-Lieferant
    const arg = src.slice(a, i).trim(), zeile = src.slice(0, m.index).split('\n').length;
    if (arg.startsWith('`')) { for (const ex of vorlagen(arg)[0]?.ausdruecke ?? []) if (!(einAufruf(ex, SICHER_CODE) || FEST.test(ex))) fehler.push(`${datei}:${zeile}: ${m[0]}…): in der Vorlage steht \${${ex.slice(0, 50)}}`); }
    else if (!/^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/.test(arg) && !/^(?:code|aufruf|aufruf\.code)$/.test(arg) && !/^rDataFrameCode\(/.test(arg) && arg !== '' && !/^\w+\??\s*:\s*\w/.test(arg)) fehler.push(`${datei}:${zeile}: ${m[0]}…): das Argument „${arg.slice(0, 50)}“ ist kein Text, keine Vorlage und kein geprüfter Code-Lieferant`);
  }
  return fehler;
}

/** PSPP-Kommentarzeilen (`* …`, `COMMENT …`) mit Einsetzung: jede Einsetzung auf der Zeile muss durch `pk(...)` laufen (lib/befehlstext.ts); sonst endet der Kommentar an einem Zeilenumbruch aus den Daten. */
export function pruefeKommentare(datei: string, quelle: string): string[] {
  const fehler: string[] = [];
  const src = skript(datei, quelle);
  for (const v of vorlagen(src)) {
    let amAnfang = true;   // steht die Stelle am Zeilenanfang?
    let kommentar = false;
    for (let i = 0; i < v.teile.length; i++) {
      const teil = v.teile[i]!.replace(/\\n/g, '\n');
      const zeilen = teil.split('\n');
      zeilen.forEach((z, k) => {
        if (k > 0) { amAnfang = true; kommentar = false; }
        if ((amAnfang || (i > 0 && k === 0)) && /^(\*\s|COMMENT\s)/i.test(z)) kommentar = true;   // auch direkt hinter einer Einsetzung: `${kopf}* …`
        if (z.length) amAnfang = false;
      });
      if (i < v.ausdruecke.length) {
        const a = v.ausdruecke[i]!;
        const festerText = /^(?:L|T|d)\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`$\\]|\\.)*`)(?:\s*,\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`$\\]|\\.)*`))*\s*\)$/.test(a) && einAufruf(a, ['L', 'T', 'd']);   // nur feste Wörter von uns, nichts aus Daten
        const nurVorlage = /^[^`'"?]*\?\s*`[\s\S]*`\s*:\s*(?:''|"")$/.test(a);   // `bedingung ? `…` : ''`: die Vorlage wird für sich geprüft
        if (kommentar && !festerText && !nurVorlage && !einAufruf(a, ['pk'])) fehler.push(`${datei}:${v.zeile}: in der Kommentarzeile steht \${${a.slice(0, 70)}} ohne pk(...)`);
        if (amAnfang && teil === '' ) { /* Ausdruck am Zeilenanfang: unbekannt, nicht Kommentar */ }
        amAnfang = false;
      }
    }
  }
  // Verkettungen: '* ' + x, "* " + x, '\n* ' + x
  src.split('\n').forEach((z, i) => { if (/(['"])(?:\\n)?\*\s\1\s*\+|\+\s*(['"])\\n\*\s\2\s*\+|(['"])COMMENT\s\3\s*\+/.test(z)) fehler.push(`${datei}:${i + 1}: Kommentarzeile durch + zusammengesetzt - pk(...) in einer Vorlage nehmen`); });
  return fehler;
}

describe('Wächter: kein Text aus den Daten im R-Code', () => {
  const dateien = alleDateien(SRC).map(f => ({ f, rel: relative(SRC, f).split('\\').join('/') }));

  it('R wird nur in den erlaubten Dateien angesprochen', () => {
    const treffer = dateien.filter(({ f, rel }) => rel !== 'engine/rsicher.ts' && /\b(rMotor|RMotor|evalR\w*|Shelter|globalEnv)\b/.test(skript(f, readFileSync(f, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''))).map(d => d.rel);
    expect(treffer.sort()).toEqual([...R_ERLAUBT].sort());
  });
  it('kein eval() und kein new Function() im Programm', () => {
    const bose = dateien.filter(({ f }) => /(?<![\w.])eval\s*\(|new\s+Function\s*\(/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''))).map(d => d.rel);
    expect(bose).toEqual([]);
  });
  it('in den R-Dateien wird in R-Code nur über rId/rQ/rIds/rZahl/rGanz/rBool/rWahl/rArg eingesetzt', () => {
    for (const rel of R_DATEIEN) {
      const f = join(SRC, rel);
      expect(pruefeDatei(rel, readFileSync(f, 'utf8')), rel).toEqual([]);
    }
  });
  it('PSPP: Zeichenketten für Befehle werden nur in lib/befehlstext.ts gebaut (zit, zitWert), nirgends mit eigenem Apostroph-Verdoppeln', () => {
    const treffer = dateien.filter(({ f, rel }) => rel !== 'lib/befehlstext.ts' && /replace\(\/'\/g,\s*"''"\)/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''))).map(d => d.rel);
    expect(treffer).toEqual([]);
  });
  it('PSPP-Kommentarzeilen: jede Einsetzung läuft über pk()', () => {
    const alle = dateien.flatMap(({ f, rel }) => pruefeKommentare(rel, readFileSync(f, 'utf8')));
    expect(alle).toEqual([]);
  });
  it('Messlatte: der Wächter erkennt unsichere Muster (sonst wäre er wertlos)', () => {
    const bose = [
      "const a = (n: string) => `tryCatch(sp_ordreg(d, '${n}'), error = function(e) 1)`;",
      "const a = (n: string[]) => `tryCatch(sp_ordreg(d, c(${n.map(x => `'${x}'`).join(', ')})), error = function(e) 1)`;",
      "async function f(m: any, ref: string) { return m.rechne(`sp_multreg(d, ${rq(ref)})`); }",
      "const a = (x: number) => `list(n = ${x})`;",
      "async function f(m: any, ref: string) { return m.rechne('sp_x(' + ref + ')'); }",
      "export function katRCode(e: any) { return `m <- polr(${e.ziel} ~ x)\\nlibrary(MASS)\\nc(1)`; }",
      "export function katRCode(e: any) { return `library(a)\\nm <- polr(${e.stufen.join(', ')} ~ x)`; }"
    ];
    for (const b of bose) expect(pruefeDatei('x.ts', b).length, b).toBeGreaterThan(0);
    const gut = [
      "const a = (n: string) => `tryCatch(sp_ordreg(d, ${rQ(n)}, ${rIds([n])}, ${rArg('stufen')}, ${rGanz(3)}L), error = function(e) 1)`;",
      "const a = () => `list(F1 = ${rTeilFaktoren})`;",
      "export function katRCode(e: any) { return `library(MASS)\\nm <- polr(${rn(e.ziel)} ~ x)\\n${p.stufen.map(rs).join(', ')}`; }",
      "const m = `Hallo ${name}, das ist ein Satz`.length;"
    ];
    for (const g of gut) expect(pruefeDatei('x.ts', g), g).toEqual([]);
  });
  it('Gegenbeispiele: neun unsichere Muster (nur als Testtext, nicht im echten Code) werden alle erkannt', () => {
    const bose: [string, string][] = [
      ['Vorlage mit rohem Namen', "const c = (n: string) => `tryCatch(sp_ordreg(d, '${n}', c('p01')), error = function(e) 1)`;"],
      ['Verkettung in einer Variablen, später an rechne', "async function f(m: any, n: string) { const code = 'tryCatch(sp_cox(d, ' + n + ')'; return m.rechne(code); }"],
      ['join über ein Array mit R-Teilen', "const c = (n: string) => ['tryCatch(sp_cox(d,', n, ')'].join(' ');"],
      ['replace in einer R-Vorlage', "const c = (n: string) => 'sp_meta(d, %s)'.replace('%s', n);"],
      ['concat', "const c = (n: string) => 'sp_meta(d, '.concat(n, ')');"],
      ['Vorlage ohne R-Aussehen direkt an rechne', 'async function f(m: any, n: string) { return m.rechne(`${n}`); }'],
      ['Vorlage mit Zuweisung <- ohne Aufruf', 'const c = (n: string) => `${n} <- 1`; async function f(m: any, n: string) { return m.rechne(c(n)); }'],
      ['unbekannter Code-Lieferant als Argument', 'async function f(m: any, n: string) { return m.rechne(bauCode(n)); }'],
      ['getaggte Vorlage mit Einsetzung und eigener Quote-Funktion', "const c = (n: string) => String.raw`sp_x(d, ${rq(n)})`;"]
    ];
    expect(bose.length).toBe(9);
    for (const [was, code] of bose) expect(pruefeDatei('x.ts', code).length, `${was}: ${code}`).toBeGreaterThan(0);
    // und das Gegenstück bleibt ruhig
    const gut = ["const c = (n: string) => `tryCatch(sp_ordreg(d, ${rQ(n)}, ${rIds([n])}), error = function(e) 1)`; async function f(m: any, n: string) { return m.rechne(c(n)); }".replace('m.rechne(c(n))', 'm.rechne(aufruf.code)')];
    for (const g of gut) expect(pruefeDatei('x.ts', g), g).toEqual([]);
  });
  it('der Zerleger kommt mit Kommentaren, Zeichenketten mit Backtick und regulären Ausdrücken zurecht', () => {
    const v = vorlagen("// ein `Kommentar ${x}`\nconst a = '`'; const b = /[`']/g; const c = `x ${f(`y ${z}`)} w`; /* `q` */ const d = `l`;");
    expect(v.length).toBe(3);
    expect(v[0]!.ausdruecke).toEqual(['f(`y ${z}`)']);
  });
});
