import { describe, expect, it } from 'vitest';
import type { Dokument } from './qualprojekt';
import { inhaltVon, pruefeTranskript, uebernimmVorschlag } from './transkript-pruefen';

const cp = (s: string) => Array.from(s).length;

/** Beiträge `Kennung: Text`, Leerzeile dazwischen. */
function baue(bs: { k: string; t: string; name?: string }[]): Dokument {
  let text = '', pos = 0;
  const abschnitte: NonNullable<Dokument['transkript']>['abschnitte'] = [];
  bs.forEach((b, i) => {
    if (i > 0) { text += '\n\n'; pos += 2; }
    const roh = `${b.name ?? b.k}: ${b.t}`, n = cp(roh);
    abschnitte.push({ start: pos, ende: pos + n, sprecher: b.k });
    text += roh; pos += n;
  });
  const ks = [...new Set(bs.map((b) => b.k))];
  return { id: 'd', name: 'T', art: 'audio', text, erstellt: 0, geaendert: 0, transkript: { sprecher: ks.map((k) => ({ id: k, name: bs.find((b) => b.k === k)!.name ?? k })), abschnitte } } as Dokument;
}

describe('inhaltVon', () => {
  it('zieht Name und Rand-Zeitmarken ab', () => {
    const d = baue([{ k: 'B', t: '[00:00:01] Hallo #00:00:02-0#' }, { k: 'I', t: 'Wort (unv. #00:01:02-3#) Ende' }, { k: 'I', t: 'ohne Marke' }]);
    expect(inhaltVon(d, 0)).toBe('Hallo');
    expect(inhaltVon(d, 1)).toBe('Wort (unv. #00:01:02-3#) Ende');
    expect(inhaltVon(d, 2)).toBe('ohne Marke');
  });
  it('Name mit Klammer und Emoji; Kennung aus der Datei steht im Text, der Name nur in der Liste', () => {
    const d = baue([{ k: 'B2', t: '😀 Ja.', name: 'Befragte A (zweite Kennung)' }]);
    expect(inhaltVon(d, 0)).toBe('😀 Ja.');
    const d2 = baue([{ k: 'I', t: 'Frage?' }]);
    d2.transkript!.sprecher[0]!.name = 'Interviewerin';
    expect(inhaltVon(d2, 0)).toBe('Frage?');
  });
  it('Beitrag ohne Sprecher bleibt, wie er ist', () => {
    const d = baue([{ k: 'I', t: 'x' }]);
    d.text = 'Fazit: gut'; d.transkript!.abschnitte = [{ start: 0, ende: 10 }];
    expect(inhaltVon(d, 0)).toBe('Fazit: gut');
  });
});

describe('uebernimmVorschlag', () => {
  it('ersetzt nur die Stelle; spätere Beiträge rücken nach, das Original bleibt', () => {
    const d = baue([{ k: 'B', t: '😀 Also ... ja und [lacht] gut.' }, { k: 'I', t: 'Mhm, ja.' }]);
    const vorher = JSON.stringify(d);
    const hs = pruefeTranskript(d, 'einfach', 'de');
    const pause = hs.find((h) => h.art === 'pause-form')!;
    const n = uebernimmVorschlag(d, pause);
    expect(JSON.stringify(d)).toBe(vorher);
    expect(n.text.split('\n\n')[0]).toBe('B: 😀 Also (...) ja und [lacht] gut.');
    expect(n.transkript!.abschnitte[0]!.ende - n.transkript!.abschnitte[0]!.start).toBe(cp('B: 😀 Also (...) ja und [lacht] gut.'));
    expect(n.transkript!.abschnitte[1]!.start).toBe(cp(n.text.split('\n\n')[0]!) + 2);
    // Nach dem Übernehmen gibt es diesen Hinweis nicht mehr; die übrigen bleiben, mit neuen Positionen
    const nach = pruefeTranskript(n, 'einfach', 'de');
    expect(nach.filter((h) => h.art === 'pause-form')).toEqual([]);
    const laut = nach.find((h) => h.art === 'lautaeusserung-form')!;
    expect(Array.from(n.text).slice(laut.start, laut.ende).join('')).toBe('[lacht]');
    const n2 = uebernimmVorschlag(n, laut);
    expect(n2.text).toContain('(lacht)');
    const sw = pruefeTranskript(n2, 'einfach', 'de').find((h) => h.art === 'schreibweise')!;
    const n3 = uebernimmVorschlag(n2, sw);
    expect(n3.text.endsWith('I: Hm, ja.')).toBe(true);
    expect(n3.transkript!.abschnitte[1]!.ende).toBe(cp(n3.text));
  });
  it('Hinweis ohne Vorschlag oder mit falscher Stelle wirft', () => {
    const d = baue([{ k: 'B', t: 'Sor- Gedanken' }]);
    const h = pruefeTranskript(d, 'einfach', 'de').find((x) => x.art === 'wortabbruch')!;
    expect(() => uebernimmVorschlag(d, h)).toThrow(/Vorschlag/);
    expect(() => uebernimmVorschlag(d, { ...h, vorschlag: 'x', start: 500, ende: 501 })).toThrow(/Stelle/);
  });
  it('erweitert: Wortabbruch bekommt / statt -', () => {
    const d = baue([{ k: 'B', t: 'Ich habe Sor- Gedanken.' }]);
    const h = pruefeTranskript(d, 'erweitert', 'de').find((x) => x.art === 'wortabbruch')!;
    expect(uebernimmVorschlag(d, h).text).toBe('B: Ich habe Sor/ Gedanken.');
  });
});
