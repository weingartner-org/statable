import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { faktoren } from './ergebnis';
import { VERFAHREN } from './verfahren';
import { nodeEngine } from './testengine';
import { zuordnungAusFaktoren } from './rverfahren.svelte';
import { lesbar } from './verzeichnis';
import { itemKarte, itemNamen } from './itemnamen';

/** Abnahme 31.10. S4: „Aus der Faktorenanalyse übernehmen“ ließ Fragen mit Beschriftung bei „keinem“ (Matrix: PSPP-Text, Anzeige: gekürzt/anders). */
const BEZ: Record<string, string> = {
  pa1: 'Vor Prüfungen mache ich mir große Sorgen', pa2: 'Ich denke in Prüfungen ans Durchfallen', pa3: 'Ich gehe zuversichtlich in Prüfungen (umgekehrt)', pa4: 'Nach Prüfungen grüble ich über Fehler',
  pa5: 'Vor Prüfungen schlägt mein Herz schneller', pa6: 'Vor Prüfungen bin ich ruhig (umgekehrt)', pa7: 'In Prüfungen zittern meine Hände', pa8: 'Vor Prüfungen schlafe ich schlecht',
  selbstwirksamkeit: 'Selbstwirksamkeit (10-40)', lernzeit: 'Lernzeit (Stunden pro Woche)', pruefungsleistung: 'Prüfungsleistung (Punkte)'
};
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('Faktorenanalyse übernehmen (Prüfungsangst)', () => {
  it('ordnet jede Frage ihrem Faktor zu, auch mit Beschriftungen', () => {
    const z = readFileSync(new URL('../../public/beispiel/pruefungsangst.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(l => l.split(';'));
    const sp = Object.keys(BEZ);
    const daten = z.map(r => [...r.slice(2, 13)].join(' ')).join('\n');
    const labels = sp.map(n => `${n} '${BEZ[n]}'`).join('\n');
    e.run(`DATA LIST FREE /${sp.join(' ')}.\nBEGIN DATA.\n${daten}\nEND DATA.\nVARIABLE LABELS ${labels}.`);
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    const w = { l1: sp, l2: [], l3: [], l4: [] };
    const spalten = sp.map(n => ({ name: n, bezeichnung: BEZ[n] }));
    const kurz = (n: string) => lesbar(spalten.find(x => x.name === n) as never, true);
    const ik = itemKarte(spalten.map(x => ({ ...x, kurz: kurz(x.name) })));
    const r = faktoren(e.run(v.syntax(w, {} as never)), sp.map(n => [n, kurz(n)] as [string, string]), 3);
    // wie Blatt.svelte: die Namen im Ergebnis sind die Anzeige „pa1 · Text“
    for (const f of r.faktoren) for (const q of f.fragen) q.name = itemNamen([q.name], ik)[0]!;
    const out = zuordnungAusFaktoren(r.faktoren, sp, kurz, n => BEZ[n]);
    const erwartet = r.faktoren.filter(f => f.fragen.length >= 2).flatMap(f => f.fragen.length);
    expect(out.map(f => f.fragen.length)).toEqual(r.faktoren.filter(f => f.fragen.length >= 2).map(f => f.fragen.length));
    expect(out.flatMap(f => f.fragen).every(a => sp.includes(a))).toBe(true);
    expect(erwartet.length).toBe(3);
    expect(out[0]!.fragen.sort()).toEqual(['lernzeit', 'pa1', 'pa2', 'pa3', 'pa4']);
    expect(out[1]!.fragen.sort()).toEqual(['pa5', 'pa6', 'pa7', 'pa8']);
  });
});
