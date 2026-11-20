import { describe, expect, it } from 'vitest';
import { leseTranskript } from './transkript-lesen';

describe('RTF wird abgelehnt (Paket 4C)', () => {
  it('Datei mit RTF-Kopf: keine Beiträge, Meldung "Bitte in f4 als Word oder Text exportieren."', async () => {
    const roh = await leseTranskript('interview.rtf', new TextEncoder().encode(String.raw`{\rtf1\ansi\deff0 {\fonttbl{\f0 Arial;}} I: Hallo\par B: Guten Tag\par}`));
    expect(roh.beitraege).toEqual([]);
    expect(roh.meldungen.map(m => m.art)).toEqual(['rtf']);
    expect(roh.meldungen[0]!.satz).toContain('Bitte in f4 als Word oder Text exportieren.');
  });
  it('normaler Text mit geschweifter Klammer am Anfang ist kein RTF', async () => {
    const roh = await leseTranskript('x.txt', new TextEncoder().encode('{Anmerkung} hallo'));
    expect(roh.meldungen.map(m => m.art)).not.toContain('rtf');
  });
});
