/* Wächter für die Fallreihen zu den echten Beispielen (fragen-beispiele-echt.ts, Stufe 2.3 „nutzen“).
 * Sollwert-Wächter: Jede Zahl, die eine Frage zeigt (Tabellenzelle, Stamm, Antwort, Begründung, Titel), muss in der Sollwert-Datei des Beispiels stehen
 * (lib/testdaten/ueben-erwartet-beispiele-echt.json, gerechnet von R durch den Prüfer), auf die gezeigten Stellen gerundet. Dazu: Deutsch und Englisch zeigen dieselben Zahlen,
 * keine Zahl von Hand in einer Tabellenzeile, und die Lösung ist weder an Länge noch an der Zahl der Zahlen zu erkennen. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FAELLE, FRAGEN, BX_FALL, BX_JSON } from './fragen-beispiele-echt';
import { THEMEN } from './fragen';
import { EINHEITEN, PFADE, themaDerFrage } from './lernplan';
import type { Frage, Tabelle } from './fragen';

const alle = (p: { de: string; en: string }) => [p.de, p.en];
const faelleIds = Object.keys(BX_FALL);

/** Zahlen, die nicht gerechnet sind, sondern aus der Beschreibung des Beispiels oder der Frage stammen (Anzahl Personen im Versuch, Jahre, Normen) - je Fallreihe, mit Grund. */
const AUS_BESCHREIBUNG: Record<string, number[]> = {
  'bx-her': [285],           // bis zu 285 Tage beobachtet (Beschreibung des Beispiels)
  'bx-sch': [18, 180],       // 18 Personen, 180 Zeilen (Beschreibung des Beispiels)
  'bx-dia': [30],            // 30 Patientinnen und Patienten
  'bx-lae': [2017],          // Länderspiele seit 2017
  'bx-woe': [21],            // 21 Personen
  'bx-ber': [1973],          // Berkeley 1973
  'bx-kal': [32645],         // DIN 32645
  'bx-co2': []
};
/** Einfache Konstanten: Schranken und Grenzen des Fachs, kleine Zählwörter in Ziffern. */
const KONSTANT = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 80, 90, 95, 99, 100, 0.001, 0.01, 0.05, 0.1, 0.5, 99.9]);

const zahlen = (t: string): { s: string; v: number; st: number }[] =>
  [...t.matchAll(/(?<![\w.,])(\d+)(?:[.,](\d+))?(?![\w])/g)].map(m => ({ s: m[0], v: Number(m[2] !== undefined ? `${m[1]}.${m[2]}` : m[1]), st: m[2]?.length ?? 0 }));

const werteVon = (fall: string): number[] => Object.values(BX_JSON[BX_FALL[fall]!]!);
const imSoll = (fall: string, v: number, st: number): boolean => {
  const gerundet = (x: number) => Number(Math.abs(x).toFixed(st));
  return werteVon(fall).some(w => gerundet(w) === v || gerundet(w * 100) === v);
};

const texteDerFrage = (f: Frage): { was: string; text: string }[] => [
  { was: 'Stamm', text: f.stamm.de }, { was: 'Stamm (en)', text: f.stamm.en },
  ...f.antworten.flatMap((a, i) => [{ was: `Antwort ${i + 1}`, text: a.text.de }, { was: `Antwort ${i + 1} (en)`, text: a.text.en }, { was: `Begründung ${i + 1}`, text: a.warum.de }, { was: `Begründung ${i + 1} (en)`, text: a.warum.en }])
];

describe('Fallreihen zu den echten Beispielen: Aufbau', () => {
  it('18 Beispiele, je 2 bis 4 Fragen, insgesamt 45 bis 60, Kennungen bx-<kurz>-…', () => {
    expect(faelleIds).toHaveLength(18);
    expect(FRAGEN.length).toBeGreaterThanOrEqual(45);
    expect(FRAGEN.length).toBeLessThanOrEqual(60);
    expect(new Set(FRAGEN.map(f => f.id)).size).toBe(FRAGEN.length);
    for (const fall of faelleIds) {
      const fs = FRAGEN.filter(f => f.fall === fall);
      expect(fs.length, fall).toBeGreaterThanOrEqual(2);
      expect(fs.length, fall).toBeLessThanOrEqual(4);
      for (const f of fs) expect(f.id.startsWith(`${fall}-`), f.id).toBe(true);
      expect(FAELLE[fall], fall).toBeTruthy();
      expect(BX_JSON[BX_FALL[fall]!], `Sollwerte für ${fall}`).toBeTruthy();
    }
    for (const f of FRAGEN) { expect(f.fall && BX_FALL[f.fall], f.id).toBeTruthy(); expect(f.thema, f.id).toBe('beispiele'); expect(themaDerFrage(f.id), f.id).toBe('beispiele'); }
    expect(Object.keys(FAELLE).sort()).toEqual([...faelleIds].sort());
  });
  it('die Themenliste kennt die Zahl der Fragen', () => {
    expect(THEMEN.find(t => t.id === 'beispiele')?.n).toBe(FRAGEN.length);
  });
  it('jede Fallreihe steht zusammenhängend in einer Einheit, und keine Einheit der Pfade „fragebogen“ und „regression-lesen“ ist dabei', () => {
    const gesperrt = new Set(PFADE.filter(p => p.id === 'fragebogen' || p.id === 'regression-lesen').flatMap(p => p.einheiten));
    for (const fall of faelleIds) {
      const ids = FRAGEN.filter(f => f.fall === fall).map(f => f.id);
      const einheiten = EINHEITEN.filter(e => e.fragen.some(x => ids.includes(x)));
      expect(einheiten.map(e => e.id), fall).toHaveLength(1);
      const e = einheiten[0]!;
      expect(gesperrt.has(e.id), `${fall} in ${e.id}`).toBe(false);
      const pos = ids.map(i => e.fragen.indexOf(i));
      expect(pos, fall).toEqual([...pos].sort((x, y) => x - y));
      expect(pos[pos.length - 1]! - pos[0]!, fall).toBe(ids.length - 1);
    }
  });
});

describe('Sollwert-Wächter: jede gezeigte Zahl steht in ueben-erwartet-beispiele-echt.json', () => {
  const ziffer = /^<?-?\d*\.\d+$/;
  const zellenDerFaelle: [string, Tabelle][] = Object.entries(FAELLE).flatMap(([k, v]) => v.tabellen.map(t => [k, t] as [string, Tabelle]));
  it('Tabellenzellen: jede Zahl ist ein auf die gezeigten Stellen gerundeter Sollwert des Beispiels', () => {
    for (const [fall, t] of zellenDerFaelle) for (const z of t.zeilen) for (const [i, c] of z.entries()) {
      if (i === 0) { expect(typeof c, `${fall}: Zeilenkopf ${String(c)}`).toBe('string'); continue; }
      if (typeof c === 'number') { expect(imSoll(fall, c, 0) && werteVon(fall).some(w => Number(w.toFixed(0)) === c), `${fall}: Zelle ${c}`).toBe(true); continue; }
      if (c === '<0.001') { expect(werteVon(fall).some(w => w >= 0 && w < 0.001), `${fall}: p`).toBe(true); continue; }
      expect(ziffer.test(c), `${fall}: Zelle „${c}“ ist keine Zahl aus der Sollwert-Datei und kein Text für ZELLEN`).toBe(/^-?\d/.test(c) || ziffer.test(c));
      if (ziffer.test(c)) { const st = c.split('.')[1]!.length; expect(werteVon(fall).some(w => w.toFixed(st) === c), `${fall}: Zelle „${c}“`).toBe(true); }
    }
  });
  it('Quelltext: keine Tabellenzeile beginnt mit Beschriftung und handgeschriebener Zahl', () => {
    const q = readFileSync(new URL('./fragen-beispiele-echt.ts', import.meta.url), 'utf8');
    const tabellenTeil = q.slice(q.indexOf('export const FAELLE'), q.indexOf('export const FRAGEN'));
    expect(tabellenTeil.match(/\[\s*'[^'\n]*'\s*,\s*-?['"]?\d/g) ?? []).toEqual([]);
    expect(tabellenTeil.match(/,\s*-?\d+(\.\d+)?\s*[\],]/g) ?? []).toEqual([]);
  });
  it('Texte (Stamm, Antworten, Begründungen, Titel, Beschriftungen): jede Zahl ist ein Sollwert, eine einfache Konstante oder eine Angabe der Beispielbeschreibung', () => {
    const fehlt: string[] = [];
    const pruefe = (fall: string, wo: string, text: string) => {
      for (const z of zahlen(text)) {
        if (KONSTANT.has(z.v) || (AUS_BESCHREIBUNG[fall] ?? []).includes(z.v)) continue;
        if (!imSoll(fall, z.v, z.st)) fehlt.push(`${wo}: ${z.s}`);
      }
    };
    for (const f of FRAGEN) for (const t of texteDerFrage(f)) pruefe(f.fall!, `${f.id} ${t.was}`, t.text);
    for (const [fall, v] of Object.entries(FAELLE)) {
      for (const x of alle(v.titel)) pruefe(fall, `${fall} Titel`, x);
      for (const t of v.tabellen) for (const x of [...alle(t.quelle), ...(t.titel ? alle(t.titel) : []), ...t.kopf.flatMap(alle)]) pruefe(fall, `${fall} Tabelle`, x);
    }
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

describe('Fragen: Regeln (wie Abschlusstests, Johannes 03.11.)', () => {
  const einzel = FRAGEN.filter(f => !f.mehrfach);
  const laenge = (f: Frage, sp: 'de' | 'en') => f.antworten.map(a => a.text[sp].length);
  const warum = (f: Frage, sp: 'de' | 'en') => f.antworten.map(a => a.warum[sp].length);
  const richtig = (f: Frage) => f.antworten.findIndex(a => a.richtig);
  it('3 bis 5 Antworten, genau eine richtig, jede mit Begründung, mindestens eine typische Fehldeutung je Reihe (eine falsche Antwort mit Begründung „nicht“, „kein“ oder Gegenstück)', () => {
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
  it('Sachlicher Ton: kein Loben, kein Trösten, kein „sehr gut“; nur Bindestrich, keine Gedankenstriche', () => {
    for (const f of FRAGEN) for (const t of texteDerFrage(f)) {
      expect(t.text, `${f.id} ${t.was}`).not.toMatch(/\b(super|toll|prima|gut gemacht|keine Sorge|great|well done|don't worry)\b/i);
      expect(t.text, `${f.id} ${t.was}`).not.toMatch(/[–—]/);
    }
  });
});
