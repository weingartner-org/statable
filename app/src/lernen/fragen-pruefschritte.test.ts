/* Wächter für die vier Prüfschritte Messen (fragen-pruefschritte.ts, lernplan-pruefschritte.ts; Usability Stufe 6a, 10.11.2026).
 * Sollwerte: Jede Tabelle steht genau so in lib/testdaten/ueben-erwartet-pruefschritte.json (R: scripts/ueben-erwartet-pruefschritte.R), jede Dezimalzahl im Text kommt dort vor.
 * Fachregeln des Auftrags: Schritt 1 ohne Zahlen; Schritt 2 ohne Umpolen als richtige Antwort; Schritt 3 ohne Trennschärfe und korrigierte Item-Skala-Korrelation;
 * Reihenfolge Inhalt → Faktorenanalyse → Reliabilitätsanalyse → alles zusammen, im Pfad „fragebogen“ hintereinander. Die richtige Antwort ist nicht an der Länge zu erkennen. */
import { describe, expect, it } from 'vitest';
import { FAELLE, FRAGEN, PM_JSON, THEMA_PM } from './fragen-pruefschritte';
import { EINHEITEN_PM } from './lernplan-pruefschritte';
import { EINHEITEN, PFADE, themaDerFrage } from './lernplan';
import { THEMEN } from './fragen';
import { SEITE } from './fragen-seite';
import type { Frage, Tabelle } from './fragen';

const alle = (p: { de: string; en: string }) => [p.de, p.en];
const REIHE = ['pruefschritt-inhalt', 'pruefschritt-faktorenanalyse', 'pruefschritt-reliabilitaet', 'pruefschritte-zusammen'];
const texte = (f: Frage): string[] => [...alle(f.stamm), ...f.antworten.flatMap(a => [...alle(a.text), ...alle(a.warum)])];

describe('Prüfschritte Messen: Aufbau', () => {
  it('vier Einheiten im Bereich messen, je 6 bis 7 Fragen, jede Frage genau einmal, Thema stimmt', () => {
    expect(EINHEITEN_PM.map(e => e.id)).toEqual(REIHE);
    for (const e of EINHEITEN_PM) { expect(e.bereich).toBe('messen'); expect(e.fragen.length, e.id).toBeGreaterThanOrEqual(6); expect(e.fragen.length, e.id).toBeLessThanOrEqual(7); }
    const inEinheiten = EINHEITEN_PM.flatMap(e => e.fragen);
    expect([...inEinheiten].sort()).toEqual(FRAGEN.map(f => f.id).sort());
    for (const f of FRAGEN) { expect(f.thema).toBe(THEMA_PM); expect(themaDerFrage(f.id)).toBe(THEMA_PM); expect(SEITE[f.id], f.id).toBeTruthy(); }
    expect(THEMEN.find(t => t.id === THEMA_PM)?.n).toBe(FRAGEN.length);
    for (const id of inEinheiten) expect(EINHEITEN.filter(e => e.fragen.includes(id)).map(e => e.id), id).toHaveLength(1);
  });
  it('Reihenfolge im Pfad „fragebogen“: Inhalt, Faktorenanalyse, Reliabilitätsanalyse, alles zusammen; jeder Schritt nach den Einheiten seines Themas', () => {
    const p = PFADE.find(x => x.id === 'fragebogen')!.einheiten;
    const pos = REIHE.map(id => p.indexOf(id));
    expect(pos.every(i => i >= 0), String(pos)).toBe(true);
    expect([...pos].sort((x, y) => x - y)).toEqual(pos);
    expect(p.indexOf('validitaet-arten')).toBeLessThan(pos[0]!);
    for (const id of ['faktor-ladungen-lesen', 'faktor-gegenlaeufig-umpolen']) { expect(p.indexOf(id)).toBeGreaterThan(pos[0]!); expect(p.indexOf(id)).toBeLessThan(pos[1]!); }
    for (const id of ['skala-trennschaerfe-umpolen', 'skala-alpha-grenzen']) { expect(p.indexOf(id)).toBeGreaterThan(pos[1]!); expect(p.indexOf(id)).toBeLessThan(pos[2]!); }
    expect(p.indexOf('skalenwert-mittelwert')).toBeGreaterThan(pos[3]!);
  });
  it('jede Einheit hat ihre eigene Fallreihe; die Fragen einer Fallreihe stehen beieinander', () => {
    for (const e of EINHEITEN_PM) {
      const faelle = new Set(e.fragen.map(id => FRAGEN.find(f => f.id === id)!.fall));
      expect(faelle.size, e.id).toBe(1);
    }
  });
});

describe('Prüfschritte Messen: Sollwerte aus R', () => {
  const tabs: [string, Tabelle][] = [];
  for (const f of FRAGEN) if (f.tabelle) tabs.push([f.id, f.tabelle]);
  for (const [k, v] of Object.entries(FAELLE)) v.tabellen.forEach((tb, i) => tabs.push([`${k}.${i}`, tb]));
  it('jede Tabelle steht genau so in der Sollwert-Datei', () => {
    expect(tabs.length).toBeGreaterThanOrEqual(8);
    for (const [k, tb] of tabs) expect(tb.zeilen, k).toEqual(PM_JSON[k]);
  });
  it('jede Dezimalzahl in Stamm, Antworten, Erklärungen, Fall- und Tabellentiteln kommt in der Sollwert-Datei vor', () => {
    const bekannt: number[] = [];
    const sammle = (x: unknown): void => {
      if (typeof x === 'number') bekannt.push(Math.abs(x));
      else if (typeof x === 'string') { const m = /^-?(\d*\.\d+)$/.exec(x); if (m) bekannt.push(Math.abs(Number(x))); }
      else if (Array.isArray(x)) x.forEach(sammle);
      else if (x && typeof x === 'object') Object.values(x).forEach(sammle);
    };
    for (const [k, v] of Object.entries(PM_JSON)) if (k !== 'herkunft') sammle(v);
    const t: [string, string][] = [];
    for (const f of FRAGEN) { for (const x of texte(f)) t.push([f.id, x]); if (f.tabelle) for (const x of [...alle(f.tabelle.quelle), ...(f.tabelle.titel ? alle(f.tabelle.titel) : [])]) t.push([f.id, x]); }
    for (const [k, fall] of Object.entries(FAELLE)) { for (const x of alle(fall.titel)) t.push([k, x]); for (const tb of fall.tabellen) for (const x of [...alle(tb.quelle), ...(tb.titel ? alle(tb.titel) : [])]) t.push([k, x]); }
    for (const [id, x] of t) for (const m of x.matchAll(/(\d+)[.,](\d+)/g)) {
      const v = Number(`${m[1]}.${m[2]}`), st = m[2]!.length;
      expect(bekannt.some(b => Math.abs(b - v) < 1e-9 || Number(b.toFixed(st)) === v), `${id}: Zahl ${m[0]} fehlt in ueben-erwartet-pruefschritte.json`).toBe(true);
    }
  });
});

describe('Prüfschritte Messen: Fachregeln des Auftrags', () => {
  const von = (vorsilbe: string) => FRAGEN.filter(f => f.id.startsWith(vorsilbe));
  it('Schritt 1 (Inhalt): keine Zahlen außer den Nummern der Fragen und der Antwortstufen, keine Tabellen', () => {
    for (const f of von('pm-in-')) { expect(f.tabelle, f.id).toBeUndefined(); for (const x of texte(f)) expect(x, f.id).not.toMatch(/\d[.,]\d/); }
    expect(FAELLE['pm-in']!.tabellen).toEqual([]);
  });
  it('Schritt 2 (Faktorenanalyse): Umpolen ist nie die richtige Antwort; das Minus zählt mit dem Betrag', () => {
    for (const f of von('pm-fa-')) for (const a of f.antworten) if (a.richtig) for (const x of alle(a.text)) expect(x, f.id).not.toMatch(/umpol|umgepolt|reverse-cod/i);
    const falsch = FRAGEN.find(f => f.id === 'pm-fa-mehrfach')!.antworten.find(a => /umgepolt werden/.test(a.text.de))!;
    expect(falsch.richtig).toBeUndefined();
  });
  it('Schritt 3 (Reliabilität): ohne Trennschärfe und ohne korrigierte Item-Skala-Korrelation', () => {
    for (const f of von('pm-rel-')) for (const x of texte(f)) expect(x, f.id).not.toMatch(/trennsch|item-skala|item-total|korrigierte/i);
    for (const k of ['pm-rel', 'pm-ges']) for (const tb of FAELLE[k]!.tabellen) for (const kopf of tb.kopf) expect(alle(kopf).join(' '), k).not.toMatch(/trennsch|item-total|korrigiert/i);
  });
  it('Schritt 4: die gesetzte Regel steht im Stamm jeder Entscheidungsfrage', () => {
    for (const id of ['pm-ges-a1', 'pm-ges-e2', 'pm-ges-c2', 'pm-ges-n4']) expect(FRAGEN.find(f => f.id === id)!.stamm.de, id).toMatch(/^Angenommen, eine Frage wird entfernt, wenn mindestens zwei/);
  });
  it('die richtige Antwort ist höchstens 25 Zeichen länger als die längste falsche (beide Sprachen)', () => {
    for (const f of FRAGEN) if (!f.mehrfach) for (const sp of ['de', 'en'] as const) {
      const r = f.antworten.find(a => a.richtig)!.text[sp].length;
      const w = Math.max(...f.antworten.filter(a => !a.richtig).map(a => a.text[sp].length));
      expect(r - w, `${f.id} (${sp}): richtig ${r}, längste falsche ${w}`).toBeLessThanOrEqual(25);
    }
  });
  it('„Welche Aussagen stimmen?“: in jeder Einheit eine, zwei richtig und zwei falsch', () => {
    for (const e of EINHEITEN_PM) {
      const m = e.fragen.map(id => FRAGEN.find(f => f.id === id)!).filter(f => f.mehrfach);
      expect(m.length, e.id).toBe(1);
      expect(m[0]!.antworten.filter(a => a.richtig).length, e.id).toBe(2);
    }
  });
});
