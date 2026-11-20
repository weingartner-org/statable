/* Wächter: Nennt eine Übungsfrage einen Knopf der Oberfläche in Anführungszeichen, muss auch das Englische genau diesen Knopf nennen. Sonst findet ihn niemand (gefunden 01.11.: „More routes“ statt „More options“). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const KATALOG = JSON.parse(readFileSync(new URL('../i18n/katalog.json', import.meta.url), 'utf8')) as Record<string, { de: unknown; en: unknown; orte: string[] }>;
const glatt = (s: string) => s.trim().replace(/[.:…]+$/, '').toLowerCase();
const zitate = (s: string) => [...s.matchAll(/"([^"]{2,90})"/g)].map(m => glatt(m[1]!));
const istFrage = (o: string) => /^lernen\/fragen-(?!seite)/.test(o);

const knoepfe = new Map<string, Set<string>>();
for (const v of Object.values(KATALOG)) {
  if (typeof v.de !== 'string' || typeof v.en !== 'string' || v.orte.every(o => o.startsWith('lernen/fragen') || o.startsWith('hilfe/'))) continue;
  const d = glatt(v.de);
  if (!knoepfe.has(d)) knoepfe.set(d, new Set());
  knoepfe.get(d)!.add(glatt(v.en));
}

describe('Knopfnamen in Übungsfragen', () => {
  it('das Englische nennt denselben Knopf wie das Deutsche', () => {
    const falsch: string[] = [];
    for (const [k, v] of Object.entries(KATALOG)) {
      if (!v.orte.some(istFrage) || typeof v.de !== 'string' || typeof v.en !== 'string') continue;
      const en = zitate(v.en);
      for (const d of zitate(v.de)) {
        const soll = knoepfe.get(d);
        if (soll && !en.some(e => soll.has(e))) falsch.push(`${k}: "${d}"`);
      }
    }
    expect(falsch).toEqual([]);
  });
});
