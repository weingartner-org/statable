// Wächter: Wo steckt jedes Beispiel? Lernplan (Einheiten und Pfade), Fragen, Rechenaufgaben, Hilfe.
// Bericht (nur mit NUTZEN_BERICHT=1): docs/nutzen/bestand-beispiele.json
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BEISPIELE, type Beispiel } from '../lib/beispiele';
import { VERFAHREN } from '../lib/verfahren';
import { EINHEITEN, PFADE } from './lernplan';

/** Diese Kennungen stehen heute in keiner Einheit. Die Liste darf nur kürzer werden. */
const NOCH_OHNE_EINHEIT: string[] = [];

/** Schrittkarten, die die App öffnen kann: Verfahren aus lib/verfahren.ts, dazu „planen“ und „meta“ (siehe beispielbegleiter bzw. beispieloeffnen). */
const ERLAUBTE_ARTEN = new Set<string>([...VERFAHREN.map(v => v.id), 'planen', 'meta']);

const SRC = new URL('../', import.meta.url);   // app/src/
const quellen = (ordner: string, muster: RegExp) =>
  readdirSync(new URL(ordner, SRC))
    .filter(f => muster.test(f) && !f.includes('.test.'))
    .map(f => ({ name: f, text: readFileSync(new URL(`${ordner}${f}`, SRC), 'utf8') }));

const FRAGEN = quellen('lernen/', /^(fragen|rechenaufgaben).*\.ts$/);
const HILFE = quellen('hilfe/', /^artikel.*\.ts$/);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Die Kennung steht als Textwert (in Anführungszeichen, in einem Pfad oder mit #) oder die CSV-Datei wird genannt. */
const nennt = (text: string, b: Beispiel) => {
  const kennung = new RegExp(`(['"\`/])${escape(b.id)}(['"\`/#?])`);
  if (kennung.test(text)) return true;
  return !!b.datei && new RegExp(`(?<![\\w-])${escape(b.datei)}\\.csv`).test(text);
};

/** Alle Einheiten, die ein Beispiel nennen (Kennung und Schrittnummer). */
const einheitenVon = (id: string) => EINHEITEN.filter(e => e.beispiele.some(x => x.id === id));

interface Messung {
  id: string; fach: string; echt: boolean; stufe: number;
  einheiten: string[]; pfade: string[]; fragen: number; hilfe: number;
}

const messung = (b: Beispiel): Messung => {
  const einheiten = einheitenVon(b.id).map(e => e.id);
  return {
    id: b.id,
    fach: b.fach,
    echt: !!b.echt,
    stufe: b.stufe,
    einheiten,
    pfade: PFADE.filter(p => p.einheiten.some(e => einheiten.includes(e))).map(p => p.id),
    fragen: FRAGEN.filter(f => nennt(f.text, b)).length,
    hilfe: HILFE.filter(h => nennt(h.text, b)).length
  };
};

const alle = BEISPIELE.map(messung);

describe('Beispiele in Lernplan, Fragen und Hilfe', () => {
  it('Kennungen sind eindeutig', () => {
    const ids = BEISPIELE.map(b => b.id);
    expect(new Set(ids).size, 'doppelte Kennung').toBe(ids.length);
  });

  it('jeder Verweis aus dem Lernplan zeigt auf ein Beispiel und einen vorhandenen Schritt', () => {
    const kaputt: string[] = [];
    for (const e of EINHEITEN) for (const { id, schritt } of e.beispiele) {
      const b = BEISPIELE.find(x => x.id === id);
      if (!b) kaputt.push(`${e.id}: unbekanntes Beispiel ${id}`);
      else if (!Number.isInteger(schritt) || schritt < 0 || schritt >= b.schritte.length)
        kaputt.push(`${e.id}: ${id} Schritt ${schritt} (hat ${b.schritte.length})`);
    }
    expect(kaputt).toEqual([]);
  });

  it('jede Schrittkarte (art) ist eine Karte, die die App öffnet', () => {
    const kaputt = BEISPIELE.flatMap(b => b.schritte.map((s, i) => ({ b, s, i })))
      .filter(({ s }) => !ERLAUBTE_ARTEN.has(s.art))
      .map(({ b, s, i }) => `${b.id} Schritt ${i}: art „${s.art}“`);
    expect(kaputt).toEqual([]);
  });

  it('NOCH_OHNE_EINHEIT: jedes Beispiel ohne Einheit steht in der Liste', () => {
    const fehlt = alle.filter(m => m.einheiten.length === 0).map(m => m.id).filter(id => !NOCH_OHNE_EINHEIT.includes(id));
    expect(fehlt, 'ohne Einheit, aber nicht in der Liste').toEqual([]);
  });

  it('NOCH_OHNE_EINHEIT: keine Kennung in der Liste hat schon eine Einheit', () => {
    const erledigt = NOCH_OHNE_EINHEIT.filter(id => einheitenVon(id).length > 0);
    expect(erledigt, 'aus NOCH_OHNE_EINHEIT streichen').toEqual([]);
  });

  it('NOCH_OHNE_EINHEIT ist sortiert und kennt nur vorhandene Beispiele', () => {
    expect(NOCH_OHNE_EINHEIT).toEqual([...NOCH_OHNE_EINHEIT].sort());
    const unbekannt = NOCH_OHNE_EINHEIT.filter(id => !BEISPIELE.some(b => b.id === id));
    expect(unbekannt).toEqual([]);
  });

  it('Bericht (nur mit NUTZEN_BERICHT=1)', () => {
    if (process.env.NUTZEN_BERICHT !== '1') return;
    const ordner = fileURLToPath(new URL('../../../docs/nutzen/', import.meta.url));
    mkdirSync(ordner, { recursive: true });
    const sortiert = [...alle].sort((a, b) => a.fach.localeCompare(b.fach) || a.id.localeCompare(b.id));
    writeFileSync(`${ordner}bestand-beispiele.json`, JSON.stringify(sortiert, null, 2) + '\n', 'utf8');
    expect(sortiert.length).toBe(BEISPIELE.length);
  });
});
