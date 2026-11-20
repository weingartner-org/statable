/* Wächter für die Psychologie-Fragen psy2- (fragen-psychologie-2*.ts, Stufe 6.3 „nutzen“).
 * Sollwert-Wächter: Jede Zahl in Tabellen und Texten der Fallreihen muss in lib/testdaten/ueben-erwartet-psych.json stehen (R, vom Prüfer, scripts/ueben-erwartet-psych.R),
 * auf die gezeigten Stellen gerundet. Begriffsfragen haben keine gerechneten Zahlen. Dazu: Aufbau, Platz in den Einheiten (nie in „fragebogen“ und „regression-lesen“),
 * mindestens zwei Fehldeutungen je Fallreihe, die Lösung ist weder an Länge noch an Zahl der Zahlen zu erkennen, sachlicher Ton. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FAELLE, FRAGEN, FRAGEN_FAELLE, PSY2_FALL, PSY_JSON } from './fragen-psychologie-2';
import { FRAGEN as FRAGEN_PSY } from './fragen-psychologie';
import { THEMEN } from './fragen';
import { EINHEITEN, PFADE, themaDerFrage } from './lernplan';
import type { Frage, Tabelle } from './fragen';

const alle = (p: { de: string; en: string }) => [p.de, p.en];
const fallIds = Object.keys(PSY2_FALL);
const begriffe = FRAGEN.filter(f => !f.fall);

/** Zahlen aus der Beschreibung des Beispiels (nicht gerechnet) je Fallreihe, mit Grund. */
const AUS_BESCHREIBUNG: Record<string, number[]> = {
  'psy2-fe': [40],              // Liste von 40 Wörtern
  'psy2-sa': [700],             // 700 Personen im Beispiel
  'psy2-bf': [25, 2800],        // 25 Aussagen, 2800 Personen
  'psy2-fr': [1421],            // 1421 Personen
  'psy2-wo': [45, 180, 20]      // 45 Personen, 180 Zeilen, 20 lasen laut vor
};
/** Einfache Konstanten: Schranken und Grenzen des Fachs, kleine Zählwörter in Ziffern. */
const KONSTANT = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 80, 90, 95, 99, 100, 0.001, 0.01, 0.05, 0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 1.96, 99.9]);

const zahlen = (t: string): { s: string; v: number; st: number }[] =>
  [...t.matchAll(/(?<![\w.,])(\d+)(?:[.,](\d+))?(?![\w])/g)].map(m => ({ s: m[0], v: Number(m[2] !== undefined ? `${m[1]}.${m[2]}` : m[1]), st: m[2]?.length ?? 0 }));

const werteVon = (fall: string): number[] => Object.values(PSY_JSON[PSY2_FALL[fall]!]!);
const imSoll = (fall: string, v: number, st: number): boolean => {
  const gerundet = (x: number) => Number(Math.abs(x).toFixed(st));
  return werteVon(fall).some(w => gerundet(w) === v || gerundet(w * 100) === v);
};
const texteDerFrage = (f: Frage): { was: string; text: string }[] => [
  { was: 'Stamm', text: f.stamm.de }, { was: 'Stamm (en)', text: f.stamm.en },
  ...f.antworten.flatMap((a, i) => [{ was: `Antwort ${i + 1}`, text: a.text.de }, { was: `Antwort ${i + 1} (en)`, text: a.text.en }, { was: `Begründung ${i + 1}`, text: a.warum.de }, { was: `Begründung ${i + 1} (en)`, text: a.warum.en }])
];

/** Fehldeutungen aus Liste B (BELEGE-NUTZEN.json, nutzen-b-…) als falsche Antwort: Fallreihe → Fragen mit der Art der Fehldeutung. Mindestens zwei je Reihe. */
const FEHLDEUTUNG: Record<string, Record<string, string>> = {
  'psy2-fe': { 'psy2-fe-lesen': 'p-h0', 'psy2-fe-eta': 'signifikanz-effektgroesse', 'psy2-fe-welch': 'nichtsignifikant', 'psy2-fe-klein': 'nichtsignifikant', 'psy2-fe-kruskal': 'nichtsignifikant' },
  'psy2-an': { 'psy2-an-gepaart': 'korrelation-kausal', 'psy2-an-kontrolle': 'p-h0', 'psy2-an-steigung': 'interaktion-definition', 'psy2-an-signifikant': 'signifikant-vs-nichtsignifikant', 'psy2-an-mitte': 'regression-zur-mitte' },
  'psy2-sa': { 'psy2-sa-korr': 'korrelation-kausal', 'psy2-sa-anova': 'signifikanz-effektgroesse', 'psy2-sa-beta': 'signifikanz-effektgroesse' },
  'psy2-ko': { 'psy2-ko-alpha': 'alpha-eindimensional', 'psy2-ko-gueltig': 'alpha-eindimensional', 'psy2-ko-itemzahl': 'alpha-eindimensional' },
  'psy2-mod': { 'psy2-mod-gruppen': 'p-h0', 'psy2-mod-wechsel': 'interaktion-definition', 'psy2-mod-verdeckt': 'signifikant-vs-nichtsignifikant' },
  'psy2-med': { 'psy2-med-direkt': 'nichtsignifikant', 'psy2-med-bootstrap': 'ki-95', 'psy2-med-kausal': 'korrelation-kausal' },
  'psy2-fr': { 'psy2-fr-prozent': 'p-h0', 'psy2-fr-v': 'signifikanz-effektgroesse', 'psy2-fr-neuro': 'nichtsignifikant', 'psy2-fr-ursache': 'korrelation-kausal' },
  'psy2-bf': { 'psy2-bf-kmo': 'alpha-eindimensional', 'psy2-bf-omega': 'alpha-eindimensional', 'psy2-bf-fehlend': 'mehrfach-testen' },
  'psy2-wo': { 'psy2-wo-wort': 'signifikanz-effektgroesse', 'psy2-wo-haeufig': 'p-h0', 'psy2-wo-icc': 'kleine-zahlen' }
};

describe('Psychologie-Fragen psy2: Aufbau', () => {
  it('neun Fallreihen zu den acht Psychologie-Beispielen, je Beispiel 5 bis 7 Fragen, insgesamt mindestens 45 aus Fallreihen', () => {
    expect(fallIds).toHaveLength(9);
    expect(FRAGEN_FAELLE.length).toBeGreaterThanOrEqual(45);
    expect(new Set(FRAGEN.map(f => f.id)).size).toBe(FRAGEN.length);
    expect(new Set(Object.values(PSY2_FALL)).size).toBe(8);
    for (const bsp of new Set(Object.values(PSY2_FALL))) {
      const n = FRAGEN_FAELLE.filter(f => PSY2_FALL[f.fall!] === bsp).length;
      expect(n, bsp).toBeGreaterThanOrEqual(5);
      expect(n, bsp).toBeLessThanOrEqual(bsp === "woerter-personen-reize" ? 9 : 7); // Wörter: 6 + 3 Fragen zu gekreuzten Zufallseffekten (10.11.)
    }
    for (const fall of fallIds) {
      const fs = FRAGEN_FAELLE.filter(f => f.fall === fall);
      expect(fs.length, fall).toBeGreaterThanOrEqual(3);
      for (const f of fs) expect(f.id.startsWith(`${fall}-`), f.id).toBe(true);
      expect(FAELLE[fall], fall).toBeTruthy();
      expect(PSY_JSON[PSY2_FALL[fall]!], `Sollwerte für ${fall}`).toBeTruthy();
    }
    expect(Object.keys(FAELLE).sort()).toEqual([...fallIds].sort());
    for (const f of FRAGEN) { expect(f.thema, f.id).toBe('psychologie2'); expect(themaDerFrage(f.id), f.id).toBe('psychologie2'); }
  });
  it('Begriffsfragen (mindestens 25, Kennung psy2-be-) und offene Antworten (3 bis 4, Kennung psy2-oa-); zusammen mit psy- mindestens 80 Fragen', () => {
    const be = begriffe.filter(f => f.id.startsWith('psy2-be-')), oa = begriffe.filter(f => f.id.startsWith('psy2-oa-'));
    expect(be.length).toBeGreaterThanOrEqual(25);
    expect(oa.length).toBeGreaterThanOrEqual(3);
    expect(oa.length).toBeLessThanOrEqual(4);
    expect(be.length + oa.length).toBe(begriffe.length);
    expect(FRAGEN_PSY.length + FRAGEN.length).toBeGreaterThanOrEqual(80);
    for (const f of begriffe) { expect(f.tabelle, f.id).toBeUndefined(); expect(f.diagramm, f.id).toBeUndefined(); }
  });
  it('die Themenliste kennt die Zahl der Fragen, und das Thema ist verborgen', () => {
    const t = THEMEN.find(x => x.id === 'psychologie2')!;
    expect(t.n).toBe(FRAGEN.length);
    expect(t.verborgen).toBe(true);
  });
  it('jede Frage steht in genau einer Einheit, nie in einem der Pfade „fragebogen“ und „regression-lesen“; jede Fallreihe zusammenhängend', () => {
    const gesperrt = new Set(PFADE.filter(p => p.id === 'fragebogen' || p.id === 'regression-lesen').flatMap(p => p.einheiten));
    for (const f of FRAGEN) {
      const einheiten = EINHEITEN.filter(e => e.fragen.includes(f.id));
      expect(einheiten.map(e => e.id), f.id).toHaveLength(1);
      expect(gesperrt.has(einheiten[0]!.id), `${f.id} in ${einheiten[0]!.id}`).toBe(false);
    }
    for (const fall of fallIds) {
      const ids = FRAGEN_FAELLE.filter(f => f.fall === fall).map(f => f.id);
      const e = EINHEITEN.find(x => x.fragen.includes(ids[0]!))!;
      const pos = ids.map(i => e.fragen.indexOf(i));
      expect(pos, fall).toEqual([...pos].sort((x, y) => x - y));
      expect(pos[pos.length - 1]! - pos[0]!, fall).toBe(ids.length - 1);
    }
  });
  it('die Einheit „offene-antworten“ hat die Fragen psy2-oa- und steht in „bildung“, nicht in „fragebogen“ oder „regression-lesen“', () => {
    const e = EINHEITEN.find(x => x.id === 'offene-antworten')!;
    expect(e.fragen.filter(i => i.startsWith('psy2-oa-')).length).toBeGreaterThanOrEqual(3);
    expect(PFADE.find(p => p.id === 'bildung')!.einheiten).toContain('offene-antworten');
    for (const p of PFADE.filter(x => x.id === 'fragebogen' || x.id === 'regression-lesen')) expect(p.einheiten, p.id).not.toContain('offene-antworten');
  });
  it('mindestens zwei Fragen je Fallreihe haben eine Fehldeutung aus Liste B als falsche Antwort', () => {
    for (const fall of fallIds) {
      const m = FEHLDEUTUNG[fall] ?? {};
      expect(Object.keys(m).length, fall).toBeGreaterThanOrEqual(2);
      for (const id of Object.keys(m)) { const f = FRAGEN.find(x => x.id === id); expect(f?.fall, id).toBe(fall); }
    }
  });
  it('jede Fallreihe beginnt mit einer Frage aus der Psychologie (Titel enthält ein Fragezeichen)', () => {
    for (const [k, v] of Object.entries(FAELLE)) { expect(v.titel.de, k).toContain('?'); expect(v.titel.en, k).toContain('?'); }
  });
});

describe('Sollwert-Wächter: jede gezeigte Zahl der Fallreihen steht in ueben-erwartet-psych.json', () => {
  const ziffer = /^<?-?\d*\.\d+$/;
  const zellen: [string, Tabelle][] = Object.entries(FAELLE).flatMap(([k, v]) => v.tabellen.map(t => [k, t] as [string, Tabelle]));
  it('Tabellenzellen: jede Zahl ist ein auf die gezeigten Stellen gerundeter Sollwert des Beispiels', () => {
    for (const [fall, t] of zellen) for (const z of t.zeilen) for (const [i, c] of z.entries()) {
      if (i === 0) { expect(typeof c, `${fall}: Zeilenkopf ${String(c)}`).toBe('string'); continue; }
      if (typeof c === 'number') { expect(werteVon(fall).some(w => Number(w.toFixed(0)) === c), `${fall}: Zelle ${c}`).toBe(true); continue; }
      if (c === '' ) continue;
      if (c === '<0.001') { expect(werteVon(fall).some(w => w >= 0 && w < 0.001), `${fall}: p`).toBe(true); continue; }
      expect(ziffer.test(c), `${fall}: Zelle „${c}“ ist keine Zahl aus der Sollwert-Datei`).toBe(true);
      const st = c.split('.')[1]!.length;
      expect(werteVon(fall).some(w => w.toFixed(st) === c), `${fall}: Zelle „${c}“`).toBe(true);
    }
  });
  it('Quelltext: keine Tabellenzeile beginnt mit Beschriftung und handgeschriebener Zahl', () => {
    for (const x of ['a', 'b', 'c'] as const) {
      const q = readFileSync(new URL(`./fragen-psychologie-2-${x}.ts`, import.meta.url), 'utf8');
      const teil = q.slice(q.indexOf(`export const FAELLE_${x.toUpperCase()}`), q.indexOf(`export const FRAGEN_${x.toUpperCase()}`));
      expect(teil.match(/\[\s*'[^'\n]*'\s*,\s*-?['"]?\d/g) ?? [], x).toEqual([]);
      expect(teil.match(/,\s*-?\d+(\.\d+)?\s*[\],]/g) ?? [], x).toEqual([]);
    }
  });
  it('Texte der Fallreihen: jede Zahl ist ein Sollwert, eine einfache Konstante oder eine Angabe der Beispielbeschreibung', () => {
    const fehlt: string[] = [];
    const pruefe = (fall: string, wo: string, text: string) => {
      for (const z of zahlen(text)) {
        if (KONSTANT.has(z.v) || (AUS_BESCHREIBUNG[fall] ?? []).includes(z.v)) continue;
        if (!imSoll(fall, z.v, z.st)) fehlt.push(`${wo}: ${z.s}`);
      }
    };
    for (const f of FRAGEN_FAELLE) for (const t of texteDerFrage(f)) pruefe(f.fall!, `${f.id} ${t.was}`, t.text);
    for (const [fall, v] of Object.entries(FAELLE)) {
      for (const x of alle(v.titel)) pruefe(fall, `${fall} Titel`, x);
      for (const t of v.tabellen) for (const x of [...alle(t.quelle), ...(t.titel ? alle(t.titel) : []), ...t.kopf.flatMap(alle)]) pruefe(fall, `${fall} Tabelle`, x);
    }
    expect(fehlt).toEqual([]);
  });
  it('Begriffsfragen: keine gerechneten Zahlen, nur Schranken des Fachs und Zählwörter', () => {
    const fehlt: string[] = [];
    for (const f of begriffe) for (const t of texteDerFrage(f)) for (const z of zahlen(t.text)) if (!KONSTANT.has(z.v)) fehlt.push(`${f.id} ${t.was}: ${z.s}`);
    expect(fehlt).toEqual([]);
  });
  it('Deutsch und Englisch zeigen dieselben Zahlen in derselben Reihenfolge, deutsch mit Komma, englisch mit Punkt', () => {
    const paare: [string, { de: string; en: string }][] = [
      ...FRAGEN.flatMap(f => [[f.id, f.stamm] as [string, { de: string; en: string }], ...f.antworten.flatMap((a, i) => [[`${f.id} A${i + 1}`, a.text], [`${f.id} B${i + 1}`, a.warum]] as [string, { de: string; en: string }][])]),
      ...Object.entries(FAELLE).map(([k, v]) => [`${k} Titel`, v.titel] as [string, { de: string; en: string }])
    ];
    for (const [id, p] of paare) {
      expect(p.de, id).not.toMatch(/\d\.\d/);
      expect(p.en, id).not.toMatch(/\d,\d/);
      expect(zahlen(p.de).map(z => z.v), id).toEqual(zahlen(p.en).map(z => z.v));
    }
  });
});

describe('Psychologie-Fragen psy2: Regeln wie Abschlusstests (Johannes 03.11.)', () => {
  const einzel = FRAGEN.filter(f => !f.mehrfach);
  const laenge = (f: Frage, sp: 'de' | 'en') => f.antworten.map(a => a.text[sp].length);
  const warum = (f: Frage, sp: 'de' | 'en') => f.antworten.map(a => a.warum[sp].length);
  const richtig = (f: Frage) => f.antworten.findIndex(a => a.richtig);
  it('3 bis 5 Antworten, genau eine richtig, jede mit Begründung', () => {
    for (const f of FRAGEN) {
      expect(f.antworten.length, f.id).toBeGreaterThanOrEqual(3);
      expect(f.antworten.length, f.id).toBeLessThanOrEqual(5);
      expect(f.antworten.filter(a => a.richtig), f.id).toHaveLength(1);
      for (const a of f.antworten) { expect(a.warum.de.length, f.id).toBeGreaterThan(40); expect(a.warum.en.length, f.id).toBeGreaterThan(40); }
    }
  });
  it('die richtige Antwort ist in höchstens zwei Fünfteln der Fragen die längste (de und en)', () => {
    for (const sp of ['de', 'en'] as const) {
      const laengste = einzel.filter(f => laenge(f, sp)[richtig(f)] === Math.max(...laenge(f, sp))).length;
      expect(laengste, `${sp}: ${laengste} von ${einzel.length}`).toBeLessThanOrEqual(Math.floor(einzel.length * 0.4));
    }
  });
  it('die richtige Begründung ist in höchstens zwei Fünfteln der Fragen die längste', () => {
    for (const sp of ['de', 'en'] as const) {
      const laengste = einzel.filter(f => warum(f, sp)[richtig(f)] === Math.max(...warum(f, sp))).length;
      expect(laengste, `${sp}: ${laengste} von ${einzel.length}`).toBeLessThanOrEqual(Math.floor(einzel.length * 0.4));
    }
  });
  it('die richtige Antwort nennt in höchstens zwei Fünfteln der Fragen allein die meisten Zahlen', () => {
    const z = (s: string) => zahlen(s).length;
    const alleinMeiste = einzel.filter(f => { const c = f.antworten.map(x => z(x.text.de)); const max = Math.max(...c); return c[richtig(f)] === max && c.filter(x => x === max).length === 1 && max > 0; }).length;
    expect(alleinMeiste, `${alleinMeiste} von ${einzel.length}`).toBeLessThanOrEqual(Math.floor(einzel.length * 0.4));
  });
  it('die richtige Antwort ist höchstens ein Drittel länger als die längste falsche, und keine falsche ist viel kürzer (mindestens 55 Prozent)', () => {
    for (const f of einzel) for (const sp of ['de', 'en'] as const) {
      const l = laenge(f, sp); const r = richtig(f);
      expect(l[r]!, `${f.id} (${sp}): richtig ${l[r]}, längste falsche ${Math.max(...l.filter((_, i) => i !== r))}`).toBeLessThanOrEqual(Math.max(...l.filter((_, i) => i !== r)) * 1.34);
      l.forEach((x, i) => { if (i !== r) expect(x, `${f.id} (${sp}): Antwort ${i + 1} (${x}) gegen richtig (${l[r]})`).toBeGreaterThanOrEqual(l[r]! * 0.55); });
    }
  });
  it('die Begründungen sind gleich ausführlich: keine unter 55 Prozent der längsten, die richtige höchstens ein Drittel länger als die längste falsche', () => {
    for (const f of einzel) {
      const l = warum(f, 'de'); const r = richtig(f); const max = Math.max(...l);
      l.forEach((x, i) => expect(x, `${f.id}: Begründung ${i + 1} (${x}) gegen längste (${max})`).toBeGreaterThanOrEqual(max * 0.55));
      expect(l[r]!, `${f.id}: Begründung der richtigen (${l[r]}) gegen längste falsche`).toBeLessThanOrEqual(Math.max(...l.filter((_, i) => i !== r)) * 1.34);
    }
  });
  it('Sachlicher Ton: kein Loben, kein Trösten; nur Bindestrich, keine Gedankenstriche', () => {
    for (const f of FRAGEN) for (const t of texteDerFrage(f)) {
      expect(t.text, `${f.id} ${t.was}`).not.toMatch(/\b(super|toll|prima|gut gemacht|keine Sorge|great|well done|don't worry)\b/i);
      expect(t.text, `${f.id} ${t.was}`).not.toMatch(/[–—]/);
    }
  });
});
