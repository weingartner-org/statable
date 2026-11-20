import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { VERFAHREN, type Ctx } from './verfahren';
import { nodeEngine } from './testengine';
import { finde } from './tabelle';
import type { OutputItem } from '../engine/types';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const fehler = (items: OutputItem[]) => items.filter(i => i.type === 'message' && i.severity !== 'note').map(i => (i as { text: string }).text);
const BEISPIEL = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));

describe('Frage „Unterscheiden sich Gruppen?“ (07.10.: ONEWAY ... WELCH war in PSPP 2.1.1 ein Syntaxfehler)', () => {
  it('drei und mehr Gruppen: ONEWAY läuft in der Engine ohne Fehler', () => {
    const gruppen = VERFAHREN.find(v => v.id === 'gruppen')!;
    const ctx: Ctx = { verschieden: () => 4, gueltig: () => 100, istZahl: () => true };
    const syntax = gruppen.syntax({ l1: ['konzentration'], l2: ['semester'], l3: [], l4: [] }, ctx);
    expect(syntax).toMatch(/^ONEWAY konzentration BY semester\n/);
    e.run('NEW FILE.\n' + BEISPIEL.syntax, { '/import.csv': BEISPIEL.csv });
    const r = e.run(syntax);
    expect(fehler(r)).toEqual([]);
    for (const t of [/^Descriptives$/, /^Test of Homogeneity of Variances$/, /^ANOVA$/]) expect(finde(r, t), String(t)).toBeTruthy();
  });
});

import { artikelListe } from '../hilfe/artikel';
describe('Hilfe am Blatt', () => {
  it('zu jeder Frageart gibt es einen Hilfe-Artikel frage-<id>', () => {
    const ids = new Set(artikelListe('de').map(a => a.id));
    for (const v of VERFAHREN) expect(ids.has(`frage-${v.id}`), v.id).toBe(true);
  });
});
