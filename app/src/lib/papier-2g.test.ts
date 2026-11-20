import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import type { FragebogenPlan, Element, Frage, Block } from './fragebogenplan';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

/* ===== Paket 2G (Prüfer, ROTE TESTS vor dem Bau): Papierfassungen aus dem Plan =====
 * Grundlagen: FACHBLATT-STUFE-2.md „Paket 2G“ (Papierfassungen 1 bis 3), Belege `ef-grossdruck-*` in docs/fachblaetter/BELEGE-ERHEBEN.json.
 * Die Datei lib/papier.ts gibt es noch nicht; sie wird zur Laufzeit geladen, jeder Test ist rot, solange sie fehlt.
 *
 * ---------------------------------- Festlegungen für den Bauer (neue Datei lib/papier.ts; Word über `docx` wie bei den anderen Word-Ausgaben) ----------------------------------
 *  papierStandard(plan, sprache): Promise<Uint8Array>      .docx, Standard-Papierbogen
 *  papierGrossdruck(plan, sprache): Promise<Uint8Array>    .docx, Großdruck
 *  papierTextfassung(plan, sprache): string                Braille-taugliche Textfassung (reiner Text, UTF-8; die Datei schreibt die Oberfläche; kein BOM im String)
 *  Alle drei SPERREN bei Fehlern aus planPruefen (Error mit message „planFehler…“) und nehmen die Sprache aus dem Aufruf (nie stiller Rückfall auf eine andere Sprache).
 *  Alle Word-Dateien: `pruefeDocx` (scripts/docx-pruefen.mjs) ohne Befund.
 *
 *  GEMEINSAM (alle drei): Bogen-Nummer-Feld oben (vor der ersten Frage), Fragen laufend nummeriert über Seiten hinweg (Fragen und Blöcke zählen je 1; Hinweise haben keine Nummer),
 *   Beschriftung deutsch „Bogen-Nummer:“, englisch „Questionnaire number:“.
 *  STANDARD:   Absatz je Frage beginnt mit „<Nr>. “ (als Text, nicht als automatische Nummerierung); Optionen mit Kästchen „☐“ (Mindestgröße 4 mm und Codes klein sind Gestaltung, hier nicht messbar);
 *              Filter als eigener Absatz „Weiter mit Frage <Nr>“ (en: „Go to question <Nr>“) bei der Frage, die den Sprung auslöst: Wird eine ganze Seite durch die Antwort auf eine Frage übersprungen,
 *              steht an dieser Frage der Hinweis auf die erste Frage danach. Alle genannten Nummern sind 1 bis Zahl der Fragen.
 *  GROSSDRUCK: Grundschrift (Formatvorlage Normal, sonst docDefaults) mindestens 18 pt (w:sz mindestens 36; RNIB: Großdruck ab 16 pt, 18 pt ist die gewählte Größe, Beleg ef-grossdruck-*),
 *              KEIN Lauftext (w:sz in document.xml) unter 18 pt, Überschrift 1 größer als die Grundschrift, Zeilenabstand mindestens 1,5 (w:spacing w:line mindestens 360 bei lineRule auto),
 *              keine Tabelle (w:tbl) und keine Spalten (w:cols w:num mindestens 2), keine Kursivschrift (CNIB: nicht empfohlen). Zeilenabstand 1,5 und eine Spalte sind eigene Festlegungen (Belege nennen weniger).
 *  TEXTFASSUNG: Zeilen mit \n; kein Tabulator, kein „☐“, keine Tabelle (keine Zeile mit „|“ am Anfang oder „+--“); Anweisung am Anfang (de „Schreiben Sie bei jeder Frage die Nummer Ihrer Antwort auf.“,
 *              en „Write down the number of your answer for each question.“); davor oder danach „Bogen-Nummer:“ vor der ersten Frage; jede Frage als eigene Zeile „<Nr>. <Fragetext>“, davor eine Leerzeile;
 *              jede Option als EINE eigene Zeile „<Code> = <Text>“ (ohne Einrückung, ohne Tabulator), auch Fehlendcodes; Filter ausgeschrieben („Wenn Sie … Frage <Nr>“, en „If you … question <Nr>“).
 */

type Mod = {
  papierStandard?: (p: FragebogenPlan, sprache: string) => Promise<Uint8Array>;
  papierGrossdruck?: (p: FragebogenPlan, sprache: string) => Promise<Uint8Array>;
  papierTextfassung?: (p: FragebogenPlan, sprache: string) => string;
};
let mod: Mod | null = null;
beforeAll(async () => { const pfad = './papier'; mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null; });
function fn<K extends keyof Mod>(n: K): NonNullable<Mod[K]> {
  const f = mod?.[n];
  if (!f) throw new Error(`lib/papier.ts: ${String(n)} fehlt (rot bis zum Bau)`);
  return f as NonNullable<Mod[K]>;
}

const DIR = new URL('./testdaten/fragebogenplan/', import.meta.url);
const planOriginal = (): FragebogenPlan => JSON.parse(readFileSync(new URL('export-plan.json', DIR), 'utf8'));
const alle = (p: FragebogenPlan): Element[] => p.elemente.flatMap(s => s.elemente);
const nummerierte = (p: FragebogenPlan) => alle(p).filter((e): e is Frage | Block => e.art !== 'hinweis');
const lok = (l: Record<string, string>, s: string) => l[s]!;
const listeVon = (p: FragebogenPlan, id: string | undefined) => p.antwortlisten.find(l => l.id === id)!;

/* ---- Word lesen (nur Regeln, keine Layoutberechnung) ---- */
let ladefehler: Error | null = null;
const teile = (bytes: Uint8Array) => { if (!bytes) throw ladefehler ?? new Error('keine Datei'); const z = unzipSync(bytes); const l = (n: string) => (z[n] ? strFromU8(z[n]) : ''); return { doc: l('word/document.xml'), stile: l('word/styles.xml') }; };
const entity = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const absaetze = (doc: string): string[] => [...doc.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(m => [...m[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(t => entity(t[1]!)).join(''));
const szWerte = (xml: string): number[] => [...xml.matchAll(/<w:sz\s+w:val="(\d+)"/g)].map(m => Number(m[1]));
/** Schriftgröße (halbe Punkt) der Formatvorlage Normal, sonst der Dokumentvorgabe. */
function grundschrift(stile: string): number | undefined {
  const normal = /<w:style\b[^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/.exec(stile)?.[0];
  const aus = (x: string | undefined) => (x ? /<w:sz\s+w:val="(\d+)"/.exec(x)?.[1] : undefined);
  const w = aus(normal) ?? aus(/<w:rPrDefault>[\s\S]*?<\/w:rPrDefault>/.exec(stile)?.[0]);
  return w === undefined ? undefined : Number(w);
}
function zeilenabstand(stile: string): { line: number; regel: string } | undefined {
  const quellen = [/<w:style\b[^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/.exec(stile)?.[0], /<w:pPrDefault>[\s\S]*?<\/w:pPrDefault>/.exec(stile)?.[0]];
  for (const x of quellen) { const m = x && /<w:spacing\b[^>]*w:line="(\d+)"[^>]*>/.exec(x); if (m) return { line: Number(m[1]), regel: /w:lineRule="(\w+)"/.exec(m[0])?.[1] ?? 'auto' }; }
  return undefined;
}

describe('Papier: Voraussetzungen und Sperre', () => {
  it('der Testplan hat Fragen, Filter, Block, Hinweis (sonst taugen die Tests nichts)', () => {
    const p = planOriginal();
    expect(nummerierte(p).length).toBeGreaterThanOrEqual(8);
    expect(alle(p).some(e => e.art === 'hinweis')).toBe(true);
    expect(p.elemente.some(s => s.wennGezeigt)).toBe(true);
  });
  it('alle drei sperren bei Fehlern aus planPruefen („planFehler…“)', async () => {
    const p = planOriginal(); const f = alle(p).find((e): e is Frage => e.art === 'frage' && !!e.liste)!;
    p.antwortlisten.find(l => l.id === f.liste)!.optionen[0]!.text = {};   // Option ohne Text: Fehler
    await expect(fn('papierStandard')(p, 'de')).rejects.toThrow(/^planFehler/);
    await expect(fn('papierGrossdruck')(p, 'de')).rejects.toThrow(/^planFehler/);
    expect(() => fn('papierTextfassung')(p, 'de')).toThrow(/^planFehler/);
  });
});

describe('Standard (Word)', () => {
  let bytes: Uint8Array;
  beforeAll(async () => { try { bytes = await fn('papierStandard')(planOriginal(), 'de'); } catch (e) { bytes = undefined as unknown as Uint8Array; ladefehler = e as Error; } });
  it('pruefeDocx ohne Befund', () => { teile(bytes); expect(pruefeDocx(bytes)).toEqual([]); });
  it('Bogen-Nummer-Feld oben, vor der ersten Frage', () => {
    const a = absaetze(teile(bytes).doc);
    const i = a.findIndex(t => t.includes('Bogen-Nummer:'));
    const e = a.findIndex(t => t.startsWith('1. '));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(e).toBeGreaterThan(i);
  });
  it('Fragen laufend nummeriert („1. “ bis „N. “ mit Fragetext), Hinweise ohne Nummer', () => {
    const p = planOriginal(); const a = absaetze(teile(bytes).doc);
    nummerierte(p).forEach((el, i) => {
      const treffer = a.filter(t => t.startsWith(`${i + 1}. `));
      expect(treffer.length, `Frage ${i + 1}`).toBe(1);
      expect(treffer[0]).toContain(lok(el.text, 'de'));
    });
    expect(a.some(t => t.startsWith(`${nummerierte(p).length + 1}. `))).toBe(false);
  });
  it('Optionen mit Kästchen „☐“ und Text', () => {
    const p = planOriginal(); const t = absaetze(teile(bytes).doc).join('\n');
    expect(t).toContain('☐');
    for (const o of listeVon(p, 'ja_nein').optionen) expect(t).toContain(lok(o.text, 'de'));
  });
  it('Filter: Absatz „Weiter mit Frage 9“ (Seite „Medien“ wird bei Nein übersprungen), alle Nummern gültig', () => {
    const p = planOriginal(); const a = absaetze(teile(bytes).doc);
    const alleSaetze = a.filter(t => /Weiter mit Frage \d+/.test(t));
    expect(a.some(t => /Weiter mit Frage 9\b/.test(t))).toBe(true);
    for (const t of alleSaetze) for (const m of t.matchAll(/Weiter mit Frage (\d+)/g)) { const n = Number(m[1]); expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(nummerierte(p).length); }
  });
  it('Sprache englisch: „Questionnaire number:“, „Go to question 9“, englische Fragetexte', async () => {
    const b = await fn('papierStandard')(planOriginal(), 'en');
    expect(pruefeDocx(b)).toEqual([]);
    const t = absaetze(teile(b).doc).join('\n');
    expect(t).toContain('Questionnaire number:');
    expect(t).toMatch(/Go to question 9\b/);
    expect(t).toContain('Are you enrolled?');
    expect(t).not.toContain('Bogen-Nummer');
  });
});

describe('Großdruck (Word)', () => {
  let bytes: Uint8Array;
  beforeAll(async () => { try { bytes = await fn('papierGrossdruck')(planOriginal(), 'de'); } catch (e) { bytes = undefined as unknown as Uint8Array; ladefehler = e as Error; } });
  it('pruefeDocx ohne Befund', () => { teile(bytes); expect(pruefeDocx(bytes)).toEqual([]); });
  it('Grundschrift mindestens 18 pt (w:sz mindestens 36 in styles.xml)', () => {
    const g = grundschrift(teile(bytes).stile);
    expect(g, 'keine Grundschrift in styles.xml gesetzt').toBeDefined();
    expect(g!).toBeGreaterThanOrEqual(36);
  });
  it('kein Lauftext unter 18 pt in document.xml', () => {
    const s = szWerte(teile(bytes).doc);
    expect(s.filter(w => w < 36)).toEqual([]);
  });
  it('Überschrift 1 größer als die Grundschrift', () => {
    const { stile } = teile(bytes);
    const h1 = /<w:style\b[^>]*w:styleId="(?:Heading1|berschrift1)"[\s\S]*?<\/w:style>/.exec(stile)?.[0];
    expect(h1, 'Formatvorlage Überschrift 1 fehlt').toBeDefined();
    const w = szWerte(h1!)[0];
    expect(w).toBeDefined();
    expect(w!).toBeGreaterThan(grundschrift(stile)!);
  });
  it('Zeilenabstand mindestens 1,5 (w:line mindestens 360, lineRule auto)', () => {
    const z = zeilenabstand(teile(bytes).stile);
    expect(z, 'kein Zeilenabstand in Normal oder docDefaults').toBeDefined();
    expect(z!.regel).toBe('auto');
    expect(z!.line).toBeGreaterThanOrEqual(360);
  });
  it('keine Tabellen für Antworten, keine Spalten, keine Kursivschrift', () => {
    const { doc, stile } = teile(bytes);
    expect(doc).not.toMatch(/<w:tbl[ >]/);
    expect(doc).not.toMatch(/<w:cols\b[^>]*w:num="([2-9]|\d\d)"/);
    expect(doc + stile).not.toMatch(/<w:i\s*\/>|<w:i\s+w:val="(1|true|on)"/);
  });
  it('gleiche Gliederung wie Standard: Bogen-Nummer oben, Fragen nummeriert, Optionen als eigene Absätze', () => {
    const p = planOriginal(); const a = absaetze(teile(bytes).doc);
    expect(a.findIndex(t => t.includes('Bogen-Nummer:'))).toBeLessThan(a.findIndex(t => t.startsWith('1. ')));
    nummerierte(p).forEach((el, i) => expect(a.filter(t => t.startsWith(`${i + 1}. `)).length, `Frage ${i + 1}`).toBe(1));
    for (const o of listeVon(p, 'ja_nein').optionen) expect(a.some(t => t.includes(lok(o.text, 'de')) && t.length < 80)).toBe(true);
  });
});

describe('Braille-taugliche Textfassung', () => {
  const text = () => fn('papierTextfassung')(planOriginal(), 'de');
  const zeilen = () => text().split('\n');
  it('ohne Tabulator, ohne „☐“, ohne Tabelle, ohne Ersatzzeichen, mit \\n', () => {
    const t = text();
    expect(t).not.toContain('\t');
    expect(t).not.toContain('☐');
    expect(t).not.toContain('\r');
    expect(t).not.toContain('�');
    expect(t.charCodeAt(0)).not.toBe(0xfeff);
    expect(zeilen().filter(z => /^\s*\|/.test(z) || /\+-{2,}/.test(z))).toEqual([]);
  });
  it('UTF-8: Umlaute bleiben erhalten, Hin- und Rückweg über Bytes ist gleich', () => {
    const t = text();
    expect(t).toMatch(/[äöüß]/);
    expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(t))).toBe(t);
  });
  it('Anweisung am Anfang (unter den ersten drei nicht leeren Zeilen)', () => {
    const erste = zeilen().filter(z => z.trim()).slice(0, 3).join('\n');
    expect(erste).toContain('Schreiben Sie bei jeder Frage die Nummer Ihrer Antwort auf.');
  });
  it('Bogen-Nummer vor der ersten Frage', () => {
    const z = zeilen();
    const i = z.findIndex(x => x.includes('Bogen-Nummer:'));
    const e = z.findIndex(x => x.startsWith('1. '));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(e).toBeGreaterThan(i);
  });
  it('Fragen als Zeile „<Nr>. <Text>“ mit einer Leerzeile davor', () => {
    const p = planOriginal(); const z = zeilen();
    nummerierte(p).forEach((el, i) => {
      const k = z.findIndex(x => x.startsWith(`${i + 1}. `));
      expect(k, `Frage ${i + 1}`).toBeGreaterThan(0);
      expect(z[k]).toContain(lok(el.text, 'de'));
      expect(z[k - 1]!.trim(), `Leerzeile vor Frage ${i + 1}`).toBe('');
    });
  });
  it('jede Option als eigene Zeile „<Code> = <Text>“ (auch Fehlendcodes, auch -9)', () => {
    const p = planOriginal(); const z = zeilen();
    const ids = new Set(alle(p).flatMap(e => (e.art === 'hinweis' ? [] : [e.liste])).filter((x): x is string => !!x));
    expect(ids.size).toBeGreaterThanOrEqual(4);
    for (const id of ids) for (const o of listeVon(p, id).optionen) expect(z, `${id}: ${o.wert}`).toContain(`${o.wert} = ${lok(o.text, 'de')}`);
  });
  it('Filter ausgeschrieben: „Wenn … Frage 9“ und jede genannte Nummer gültig', () => {
    const p = planOriginal(); const t = text();
    expect(t).toMatch(/[Ww]enn [^\n]*Frage 9\b/);
    for (const m of t.matchAll(/[Ww]enn [^\n]*Frage (\d+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(nummerierte(p).length);
  });
  it('englisch: Anweisung und Bogennummer englisch, Optionen „<Code> = <English text>“', () => {
    const p = planOriginal(); const t = fn('papierTextfassung')(p, 'en'); const z = t.split('\n');
    expect(t).toContain('Write down the number of your answer for each question.');
    expect(t).toContain('Questionnaire number:');
    expect(t).not.toContain('Bogen-Nummer');
    expect(z).toContain(`1 = ${lok(listeVon(p, 'ja_nein').optionen[0]!.text, 'en')}`);
    expect(t).toMatch(/[Ii]f [^\n]*question 9\b/);
  });
});
