import { afterEach, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { s } from './sitzung.svelte';
import { freundlich } from './meldungen';

/**
 * Paket C (Befehlsfeld): `NONPAR CORR` und `GLM … WITH` kann PSPP nicht.
 * Vorher: NONPAR CORR fiel auf die allgemeine Meldung zurück; `GLM y BY g WITH x` mit einer Gruppen-Spalte aus Text meldete nur
 * „Eine Spalte wurde ausgelassen“ (PSPP wirft g als Text aus der Liste, WITH selbst wird nie gemeldet).
 */
const zahlen = Array.from({ length: 30 }, (_, i) => `${(i * 7) % 11} ${(i * 5) % 13} ${i % 3}`).join('\n');
const text = Array.from({ length: 30 }, (_, i) => `${(i * 7) % 11} ${(i * 5) % 13} ${'abc'[i % 3]}`).join('\n');
const MIT_ZAHL = `DATA LIST LIST /y (F8.0) x (F8.0) g (F8.0).\nBEGIN DATA\n${zahlen}\nEND DATA.\n`;
const MIT_TEXT = `DATA LIST LIST /y (F8.0) x (F8.0) g (A1).\nBEGIN DATA\n${text}\nEND DATA.\n`;

const vorher = s.einst.sprache, anredeVorher = s.einst.anrede;
afterEach(() => { s.einst.sprache = vorher; s.einst.anrede = anredeVorher; });

async function meldungen(daten: string, befehl: string, sprache: 'de' | 'en') {
  s.einst.sprache = sprache; s.einst.anrede = 'sie';
  const e = await nodeEngine();
  return e.run(daten + befehl).filter(i => i.type === 'message').map(i => freundlich((i as { text: string }).text, (i as { severity: string }).severity));
}

const TITEL = { de: 'Diesen Befehl kann die Engine nicht', en: 'The engine cannot run this command' };
const FAELLE: [string, string, string, 'de' | 'en', RegExp][] = [
  ['NONPAR CORR', MIT_ZAHL, 'NONPAR CORR /VARIABLES=y x.', 'de', /NONPAR CORR \(Spearman, Kendall\) kann PSPP nicht rechnen.*Hängen zwei Dinge zusammen\?.*An den Daten hat sich nichts geändert/s],
  ['NONPAR CORR', MIT_ZAHL, 'NONPAR CORR /VARIABLES=y x.', 'en', /PSPP cannot compute NONPAR CORR \(Spearman, Kendall\).*Are two things related\?.*Your data has not changed/s],
  ['GLM WITH, Gruppen als Zahl (PSPP: Syntaxfehler)', MIT_ZAHL, 'GLM y BY g WITH x /DESIGN=x g.', 'de', /GLM mit WITH \(Kovarianzanalyse\) kann PSPP nicht rechnen.*Unterscheiden sich Gruppen\?.*An den Daten hat sich nichts geändert/s],
  ['GLM WITH, Gruppen als Text (PSPP: Spalte ausgelassen)', MIT_TEXT, 'GLM y BY g WITH x /DESIGN=x g.', 'de', /GLM mit WITH \(Kovarianzanalyse\) kann PSPP nicht rechnen.*Unterscheiden sich Gruppen\?/s],
  ['GLM WITH, Gruppen als Text (PSPP: Spalte ausgelassen)', MIT_TEXT, 'GLM y BY g WITH x /DESIGN=x g.', 'en', /PSPP cannot compute GLM with WITH \(analysis of covariance\).*Do groups differ\?.*Your data has not changed/s],
  ['GLM WITH klein geschrieben', MIT_ZAHL, 'glm y by g with x.', 'en', /PSPP cannot compute GLM with WITH/]
];

describe('Befehlsfeld: Befehle, die PSPP nicht kann (Paket C)', () => {
  for (const [name, daten, befehl, sprache, erwartet] of FAELLE) {
    it(`${name} (${sprache}): eigene Meldung mit Verweis auf die Frage`, async () => {
      const f = await meldungen(daten, befehl, sprache);
      const treffer = f.find(x => x.titel === TITEL[sprache]);
      expect(treffer, JSON.stringify(f.map(x => x.titel))).toBeTruthy();
      expect(treffer!.text + ' ' + treffer!.tun).toMatch(erwartet);
      expect(f.map(x => x.titel)).not.toContain(sprache === 'de' ? 'Eine Spalte wurde ausgelassen' : 'A column was left out');
    });
  }
  it('GLM ohne WITH und andere Meldungen bleiben unverändert', async () => {
    const f = await meldungen(MIT_TEXT, 'GLM y BY g.', 'de');
    expect(f.map(x => x.titel)).toContain('Eine Spalte wurde ausgelassen');
    expect(f.map(x => x.titel)).not.toContain(TITEL.de);
  });
});
