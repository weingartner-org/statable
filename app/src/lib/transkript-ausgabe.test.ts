import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import type { Dokument } from './qualprojekt';
import { alsF4Text, alsVtt, redeanteileWord, transkriptWord } from './transkript-ausgabe';
import { redeanteile } from './redeanteile';
import { formatZeit, leseZeit, sprechZeit } from './zeitmarken';

/** Dokument aus Beiträgen (strukturierte Art: `Name: Inhalt`, Leerzeile dazwischen). */
function dok(bs: { k?: string; t: string; zeitMs?: number; bisMs?: number }[]): Dokument {
  let text = '', pos = 0;
  const abschnitte: NonNullable<Dokument['transkript']>['abschnitte'] = [];
  bs.forEach((b, i) => {
    if (i > 0) { text += '\n\n'; pos += 2; }
    const roh = b.k ? `${b.k}: ${b.t}` : b.t, n = Array.from(roh).length;
    abschnitte.push({ start: pos, ende: pos + n, ...(b.k ? { sprecher: b.k } : {}), ...(b.zeitMs !== undefined ? { zeitMs: b.zeitMs } : {}), ...(b.bisMs !== undefined ? { bisMs: b.bisMs } : {}) });
    text += roh; pos += n;
  });
  const ks = [...new Set(bs.map((b) => b.k).filter((k): k is string => !!k))];
  return { id: 'd', name: 'Interview 1', art: 'audio', text, erstellt: 0, geaendert: 0, transkript: { sprecher: ks.map((k) => ({ id: k, name: k })), abschnitte, regeln: 'einfach', quelle: 'vtt' } } as Dokument;
}
const BEISPIEL = dok([
  { k: 'Frage', t: 'Wie war das? 😀', zeitMs: 0, bisMs: 3200 },
  { k: 'Antwort', t: 'Gut, danke.\nUnd Ihnen?', zeitMs: 3200, bisMs: 12345 },
  { k: 'Frage', t: 'Auch gut.', zeitMs: 12345 },
]);

describe('sprechZeit', () => {
  it('Minuten und Sekunden zum Vorlesen', () => {
    expect(sprechZeit(83_000, 'de')).toBe('1 Minute 23');
    expect(sprechZeit(83_000, 'en')).toBe('1 minute 23');
    expect(sprechZeit(120_000, 'de')).toBe('2 Minuten');
    expect(sprechZeit(23_000, 'de')).toBe('23 Sekunden');
    expect(sprechZeit(3_723_000, 'en')).toBe('1 hour 2 minutes 3');
  });
});

describe('f4-Text', () => {
  it('Zeit = Ende des Beitrags (bisMs, sonst Beginn des nächsten); der letzte ohne Ende hat keine Marke', () => {
    const teile = alsF4Text(BEISPIEL).split('\n\n');
    expect(teile).toHaveLength(3);
    expect(teile[0]).toBe('Frage: Wie war das? 😀 #00:00:03-2#');
    expect(teile[1]).toBe('Antwort: Gut, danke.\nUnd Ihnen? #00:00:12-3#');
    expect(teile[2]).toBe('Frage: Auch gut.');
  });
  it('Umlauf: die Marken lesen sich über leseZeit zurück (Zehntel, abgerundet)', () => {
    const marken = alsF4Text(BEISPIEL).match(/#[\d:-]+#/g)!.map((m) => leseZeit(m));
    expect(marken).toEqual([3200, 12300]);
  });
  it('ohne Zeiten keine Marken', () => {
    expect(alsF4Text(dok([{ k: 'A', t: 'Eins.' }, { k: 'B', t: 'Zwei.' }]))).toBe('A: Eins.\n\nB: Zwei.');
  });
});

describe('WebVTT', () => {
  it('ein Cue je Beitrag mit <v Name>; Zeiten lesen sich zurück', () => {
    const v = alsVtt(BEISPIEL);
    expect(v.startsWith('WEBVTT\n\n')).toBe(true);
    const cues = [...v.matchAll(/^(\S+) --> (\S+)$/gm)].map((m) => [leseZeit(m[1]!), leseZeit(m[2]!)]);
    expect(cues).toEqual([[0, 3200], [3200, 12345], [12345, 13345]]);
    expect(v).toContain('<v Frage>Wie war das? 😀');
    expect(v).toContain('<v Antwort>Gut, danke.\nUnd Ihnen?');
  });
  it('maskiert < > & und keine Leerzeile im Cue', () => {
    const v = alsVtt(dok([{ k: 'A', t: 'a < b & c --> d\n\n\ne', zeitMs: 0, bisMs: 1000 }]));
    expect(v).toContain('a &lt; b &amp; c --&gt; d\ne');
    expect(v.split('\n\n')).toHaveLength(2);
  });
  it('ohne Zeiten: verständliche Fehlermeldung', () => {
    expect(() => alsVtt(dok([{ k: 'A', t: 'Eins.' }]))).toThrow(/Zeit/);
  });
  it('die Zeit im Cue ist formatZeit vtt', () => {
    expect(alsVtt(BEISPIEL)).toContain(`${formatZeit(3200, 'vtt')} --> ${formatZeit(12345, 'vtt')}`);
  });
});

describe('Word', () => {
  for (const sp of ['de', 'en'] as const) {
    for (const zeit of ['keine', 'anfang', 'f4'] as const) {
      it(`Transkript (${sp}, Zeit ${zeit}) ohne Befund`, async () => {
        const bytes = await transkriptWord(BEISPIEL, { zeit }, sp);
        expect(pruefeDocx(bytes)).toEqual([]);
        const x = strFromU8(unzipSync(bytes)['word/document.xml']!);
        expect(x).toContain(sp === 'de' ? 'Angaben zum Transkript' : 'About this transcript');
        expect(x).toContain('<w:b/>');
        expect(x).toContain('Frage:');
        if (zeit === 'anfang') expect(x).toContain('[00:00:03]');
        if (zeit === 'f4') expect(x).toContain('#00:00:03-2#');
        if (zeit === 'keine') expect(x).not.toContain('[00:00:03]');
      });
    }
    it(`Redeanteile (${sp}) ohne Befund, mit Kopfzeile`, async () => {
      const bytes = await redeanteileWord(redeanteile(BEISPIEL), 'Interview 1', sp);
      expect(pruefeDocx(bytes)).toEqual([]);
      const x = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(x).toContain('w:tblHeader');
      expect(x).toContain(sp === 'de' ? 'Anteil Wörter' : 'Share of words');
    });
  }
  it('Steuerzeichen im Text zerstören die Datei nicht', async () => {
    const d = dok([{ k: 'A', t: 'Text\u0001 mit Steuerzeichen' }]);
    expect(pruefeDocx(await transkriptWord(d, { zeit: 'keine' }, 'de'))).toEqual([]);
  });
});
