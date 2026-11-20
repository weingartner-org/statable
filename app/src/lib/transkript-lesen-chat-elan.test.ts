import { describe, expect, it } from 'vitest';
import { leseTranskript } from './transkript-lesen';

const kodiere = (s: string) => new TextEncoder().encode(s);

const CHAT = [
  '@UTF8',
  '@Begin',
  '@Participants:\tCHI Anna Child, MOT Mutter Mother',
  '*MOT:\tDa ist ein Hund . \u0015100_2500\u0015',
  '%mor:\tadv|da v|sein det|ein n|Hund .',
  '*CHI:\tWau wau',
  '\tund xxx . \u00152500_4000\u0015',
  '*MOT:\tJa &=lacht genau .',
  '@End',
].join('\n');

const EAF = `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT AUTHOR="" VERSION="3.0">
<HEADER TIME_UNITS="milliseconds"/>
<TIME_ORDER>
<TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
<TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="1500"/>
<TIME_SLOT TIME_SLOT_ID="ts3" TIME_VALUE="1500"/>
<TIME_SLOT TIME_SLOT_ID="ts4" TIME_VALUE="3200"/>
</TIME_ORDER>
<TIER LINGUISTIC_TYPE_REF="default" PARTICIPANT="Fr&amp;Herr" TIER_ID="B">
<ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a2" TIME_SLOT_REF1="ts3" TIME_SLOT_REF2="ts4"><ANNOTATION_VALUE>Ja, &lt;genau&gt;.</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION>
</TIER>
<TIER LINGUISTIC_TYPE_REF="default" TIER_ID="A">
<ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE>Guten Tag.</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION>
</TIER>
<TIER LINGUISTIC_TYPE_REF="gloss" PARENT_REF="A" TIER_ID="Gloss">
<ANNOTATION><REF_ANNOTATION ANNOTATION_ID="a3" ANNOTATION_REF="a1"><ANNOTATION_VALUE>hello</ANNOTATION_VALUE></REF_ANNOTATION></ANNOTATION>
</TIER>
</ANNOTATION_DOCUMENT>`;

describe('CHAT und ELAN lesen', () => {
  it('CHAT: Sprecher, Zeitbänder, Fortsetzungszeile, Hilfszeile gemeldet', async () => {
    const r = await leseTranskript('probe.cha', kodiere(CHAT));
    expect(r.quelle).toBe('chat');
    expect(r.beitraege.map(b => b.sprecher)).toEqual(['MOT', 'CHI', 'MOT']);
    expect(r.beitraege[0]).toMatchObject({ text: 'Da ist ein Hund .', zeitMs: 100, bisMs: 2500 });
    expect(r.beitraege[1]).toMatchObject({ text: 'Wau wau und xxx .', zeitMs: 2500, bisMs: 4000 });
    expect(r.beitraege[2]?.zeitMs).toBeUndefined();
    expect(r.beitraege[2]?.text).toBe('Ja &=lacht genau .');
    expect(r.meldungen.some(m => m.art === 'chat-hilfszeilen')).toBe(true);
  });

  it('ELAN: Zeit in Millisekunden, nach Zeit geordnet, Entities, Hilfsebene gemeldet', async () => {
    const r = await leseTranskript('probe.eaf', kodiere(EAF));
    expect(r.quelle).toBe('elan');
    expect(r.beitraege).toEqual([
      { sprecher: 'A', text: 'Guten Tag.', zeitMs: 0, bisMs: 1500 },
      { sprecher: 'Fr&Herr', text: 'Ja, <genau>.', zeitMs: 1500, bisMs: 3200 },
    ]);
    expect(r.meldungen.some(m => m.art === 'elan-hilfsebenen')).toBe(true);
  });

  it('leere oder fremde Dateien: Meldung statt Absturz', async () => {
    const r = await leseTranskript('leer.eaf', kodiere('<ANNOTATION_DOCUMENT></ANNOTATION_DOCUMENT>'));
    expect(r.beitraege).toEqual([]);
    expect(r.meldungen.some(m => m.art === 'elan-leer')).toBe(true);
    const c = await leseTranskript('leer.cha', kodiere('@UTF8\n@Begin\n@End'));
    expect(c.meldungen.some(m => m.art === 'chat-leer')).toBe(true);
  });
});
