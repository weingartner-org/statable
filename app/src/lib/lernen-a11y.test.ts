import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Wächter Barrierefreiheit Welle 6 (Lernen, Üben, Hilfe):
 *  (a) In einer `.svelte`-Datei steht keine statische `id` zweimal (auch nicht in einander ausschließenden Zweigen: dann eine Konstante `id={…}` nehmen).
 *  (b) Jeder `<input type="range">` hat `aria-valuetext` oder `aria-label` (ein Regler braucht einen Wert in Worten oder einen Namen ohne Zahl).
 *  (c) `LernRing` hat eine Textalternative: mit Namen `role="img"` und `aria-label`, ohne Namen (Stand steht als Text daneben) versteckt;
 *      jede Verwendung übergibt `name=`.
 *  Gelesen werden die Dateien der Welle 6 (siehe `DATEIEN`). Die reinen Funktionen sind exportiert, damit die Gegenproben den Fehler einbauen können. */

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lies = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');

const DATEIEN = [
  'bausteine/VerstehenUeben.svelte', 'bausteine/RechenAufgabe.svelte', 'bausteine/KategorienZuordnen.svelte', 'bausteine/Reihenfolge.svelte',
  'bausteine/LernRing.svelte', 'bausteine/LernSuche.svelte', 'seiten/Hilfe.svelte', 'seiten/Lernen.svelte',
  ...readdirSync(join(SRC, 'bausteine')).filter((n) => /^Lernlabor.*\.svelte$/.test(n)).map((n) => `bausteine/${n}`),
];

/** Dateien, deren Regler einen Wert in Worten brauchen (`aria-valuetext`, mit Einheit): ein bloßer Name ohne Zahl genügt dort nicht (Befund 3 der Lernpfade). */
const WERTETEXT_DATEIEN = [
  'bausteine/VerstehenEffekt.svelte', 'bausteine/VerstehenGerade.svelte', 'bausteine/VerstehenKennlinie.svelte', 'bausteine/VerstehenProbieren.svelte',
  'bausteine/DiagrammGestalten.svelte', 'seiten/Planen.svelte'
];

/** Nur die Vorlage (ohne `<script>` und `<style>`). */
const vorlage = (svelte: string) => svelte.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');

/** Statische ids (ohne `{…}`), die mehr als einmal vorkommen. */
export function doppelteIds(svelte: string): string[] {
  const zaehl = new Map<string, number>();
  for (const m of vorlage(svelte).matchAll(/\sid=(?:"([^"{}]+)"|'([^'{}]+)')/g)) {
    const id = m[1] ?? m[2]!;
    zaehl.set(id, (zaehl.get(id) ?? 0) + 1);
  }
  return [...zaehl].filter(([, n]) => n > 1).map(([id]) => id);
}

/** Regler ohne `aria-valuetext` und ohne `aria-label` (Tag als Text). */
export function reglerOhneText(svelte: string): string[] {
  return [...vorlage(svelte).matchAll(/<input\b[^>]*\btype=["']range["'][^>]*>/g)].map((m) => m[0]).filter((t) => !/aria-valuetext|aria-label(?!ledby)/.test(t));
}

/** Alle `<input type="range" …>`-Tags als Text; `{…}` (auch verschachtelt, mit `=>` darin) wird beim Suchen des Tag-Endes übersprungen. */
export function reglerTags(vorlageText: string): string[] {
  const aus: string[] = [];
  for (const m of vorlageText.matchAll(/<input\b/g)) {
    let tiefe = 0, i = m.index!;
    for (; i < vorlageText.length; i++) { const c = vorlageText[i]; if (c === '{') tiefe++; else if (c === '}') tiefe--; else if (c === '>' && tiefe === 0) break; }
    const tag = vorlageText.slice(m.index!, i + 1);
    if (/\btype=["']range["']/.test(tag)) aus.push(tag);
  }
  return aus;
}

/** Regler ohne `aria-valuetext` (Tag als Text). */
export function reglerOhneWertetext(svelte: string): string[] {
  return reglerTags(vorlage(svelte)).filter((tag) => !/aria-valuetext=/.test(tag));
}

/** Probleme von `LernRing.svelte` selbst und aller Verwendungen. */
export function ringProbleme(ring: string, verwendungen: Record<string, string>): string[] {
  const aus: string[] = [];
  const svg = /<svg\b[^>]*>/.exec(ring)?.[0] ?? '';
  if (!/role=\{[^}]*'img'[^}]*\}|role="img"/.test(svg)) aus.push('LernRing: role="img" fehlt');
  if (!/aria-label=/.test(svg)) aus.push('LernRing: aria-label fehlt');
  if (!/aria-hidden=/.test(svg)) aus.push('LernRing: ohne Namen nicht versteckt (aria-hidden fehlt)');
  for (const [datei, text] of Object.entries(verwendungen)) {
    for (const m of vorlage(text).matchAll(/<LernRing\b[^>]*>/g)) if (!/\bname=/.test(m[0])) aus.push(`${datei}: <LernRing> ohne name=`);
  }
  return aus;
}

const verwender = () => Object.fromEntries(DATEIEN.filter((d) => /<LernRing\b/.test(lies(d)) && !d.endsWith('LernRing.svelte')).map((d) => [d, lies(d)]));

describe('Wächter Lernen, Üben, Hilfe (Welle 6)', () => {
  it('Grundmenge: die Dateien gibt es und das Suchen sieht etwas', () => {
    expect(DATEIEN.length).toBeGreaterThan(15);
    expect(DATEIEN.some((d) => d.includes('LernlaborBayes'))).toBe(true);
    expect(Object.keys(verwender())).toContain('seiten/Lernen.svelte');
    expect(DATEIEN.flatMap((d) => [...vorlage(lies(d)).matchAll(/\sid="/g)]).length).toBeGreaterThan(50);
  });

  it('(a) keine doppelten statischen ids in einer Datei', () => {
    for (const d of DATEIEN) expect(doppelteIds(lies(d)), d).toEqual([]);
  });

  it('(b) jeder Regler hat aria-valuetext oder aria-label', () => {
    for (const d of DATEIEN) expect(reglerOhneText(lies(d)), d).toEqual([]);
    expect(DATEIEN.flatMap((d) => [...vorlage(lies(d)).matchAll(/type="range"/g)]).length).toBeGreaterThanOrEqual(9);
  });

  it('(b2) jeder Regler der Verstehen-, Gestalten- und Planen-Dateien hat aria-valuetext', () => {
    for (const d of WERTETEXT_DATEIEN) expect(reglerOhneWertetext(lies(d)), d).toEqual([]);
    expect(WERTETEXT_DATEIEN.flatMap((d) => [...vorlage(lies(d)).matchAll(/type="range"/g)]).length).toBeGreaterThanOrEqual(17);
  });

  it('Gegenprobe (b2): ein Regler mit Namen, aber ohne aria-valuetext wird gefunden', () => {
    expect(reglerOhneWertetext('<input type="range" aria-label="Stärke">')).toHaveLength(1);
    expect(reglerOhneWertetext('<input type="range" aria-valuetext="Stärke 3">')).toEqual([]);
    const quelle = lies('bausteine/VerstehenKennlinie.svelte');
    const von = quelle.indexOf(' aria-valuetext={');
    let tiefe = 0, bis = von + ' aria-valuetext='.length;
    do { const c = quelle[bis++]; if (c === '{') tiefe++; else if (c === '}') tiefe--; } while (tiefe > 0);
    const kaputt = quelle.slice(0, von) + quelle.slice(bis);
    expect(reglerOhneWertetext(kaputt).length).toBe(1);
  });

  it('(c) LernRing hat eine Textalternative, jede Verwendung gibt einen Namen an', () => {
    expect(ringProbleme(lies('bausteine/LernRing.svelte'), verwender())).toEqual([]);
  });

  // ---- Gegenproben: der Fehler wird absichtlich eingebaut, der Wächter muss ihn finden ----
  it('Gegenprobe (a): eine zweite gleiche id wird gefunden (so war hi-treffer in der Hilfe dreimal da)', () => {
    const kaputt = lies('seiten/Hilfe.svelte').replace('<ul class="bereiche" id="hi-bereiche">', '<ul class="bereiche" id="hi-treffer">').replace('<div id="hi-vorschlaege">', '<div id="hi-treffer">');
    expect(doppelteIds(kaputt)).toEqual(['hi-treffer']);
    expect(doppelteIds('<div id="a"></div><p id="b"></p><i id="a"></i>')).toEqual(['a']);
    expect(doppelteIds('<div id="a-{i}"></div><div id="a-{j}"></div>')).toEqual([]);
  });

  it('Gegenprobe (b): ein Regler ohne Wertetext und ohne Namen wird gefunden, aria-labelledby allein zählt nicht', () => {
    const kaputt = lies('bausteine/LernlaborBayes.svelte').replace(/ aria-valuetext=\{[^}]*\}/, '');
    expect(reglerOhneText(kaputt).length).toBe(1);
    expect(reglerOhneText('<input type="range" min="0" aria-labelledby="x">')).toHaveLength(1);
    expect(reglerOhneText('<input type="range" aria-label="Stärke">')).toEqual([]);
  });

  it('Gegenprobe (c): ein Ring ohne Textalternative und eine Verwendung ohne name= werden gefunden', () => {
    const ring = lies('bausteine/LernRing.svelte');
    const ohneName = ring.replace(/ aria-label=\{name \|\| undefined\}/, '');
    expect(ringProbleme(ohneName, verwender())).toContain('LernRing: aria-label fehlt');
    const ohneRolle = ring.replace(/role=\{name \? 'img' : undefined\}/, '');
    expect(ringProbleme(ohneRolle, verwender())).toContain('LernRing: role="img" fehlt');
    const ohneVersteck = ring.replace(/ aria-hidden=\{name \? undefined : 'true'\}/, '');
    expect(ringProbleme(ohneVersteck, verwender())).toContain('LernRing: ohne Namen nicht versteckt (aria-hidden fehlt)');
    const verw = { 'x.svelte': '<LernRing stuecke={s} />' };
    expect(ringProbleme(ring, verw)).toEqual(['x.svelte: <LernRing> ohne name=']);
  });
});
