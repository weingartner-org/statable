import { describe, expect, it } from 'vitest';
import type { Dokument } from './qualprojekt';
import { aendereBeitrag, fuegeBeitragEin, legeZusammen, teileBeitrag } from './transkript-bearbeiten';
import { inhaltVon } from './transkript-pruefen';

const cp = (s: string) => Array.from(s).length;
const sub = (d: Dokument, i: number) => Array.from(d.text).slice(d.transkript!.abschnitte[i]!.start, d.transkript!.abschnitte[i]!.ende).join('');

/** Strukturiertes Dokument (Quelle vtt): `Name: Inhalt`, Leerzeile dazwischen. */
function struktur(bs: { k: string; t: string; zeitMs?: number; bisMs?: number }[], quelle = 'vtt'): Dokument {
  let text = '', pos = 0;
  const abschnitte: NonNullable<Dokument['transkript']>['abschnitte'] = [];
  bs.forEach((b, i) => {
    if (i > 0) { text += '\n\n'; pos += 2; }
    const roh = `${b.k}: ${b.t}`, n = cp(roh);
    abschnitte.push({ start: pos, ende: pos + n, sprecher: b.k, ...(b.zeitMs !== undefined ? { zeitMs: b.zeitMs } : {}), ...(b.bisMs !== undefined ? { bisMs: b.bisMs } : {}) });
    text += roh; pos += n;
  });
  const ks = [...new Set(bs.map((b) => b.k))];
  return { id: 'd', name: 'T', art: 'audio', text, erstellt: 0, geaendert: 0, transkript: { sprecher: ks.map((k) => ({ id: k, name: k })), abschnitte, quelle } } as Dokument;
}
/** Konsistenz: Abschnitte liegen geordnet, überlappen nicht und passen in den Text. */
function istStimmig(d: Dokument) {
  const a = d.transkript!.abschnitte;
  let vor = -1;
  for (const x of a) { expect(x.start).toBeGreaterThanOrEqual(vor); expect(x.ende).toBeGreaterThanOrEqual(x.start); expect(x.ende).toBeLessThanOrEqual(cp(d.text)); vor = x.ende; }
}

const S = () => struktur([
  { k: 'I', t: 'Wie war das 😀?', zeitMs: 0, bisMs: 3000 },
  { k: 'B', t: 'Gut. Und dann kam der Zug 🚆 mit Wagen.', zeitMs: 3000, bisMs: 9000 },
  { k: 'I', t: 'Aha.', zeitMs: 9000, bisMs: 10000 },
]);
/** f4-Text: Der Text bleibt, wie er ist (mit Marken); Kennung `I:` bleibt im Text, der Name steht in `sprecher`. */
function f4(): Dokument {
  const d = struktur([{ k: 'I', t: 'Frage 😀? #00:00:03-0#' }, { k: 'I', t: 'Nochmal. #00:00:05-0#' }], 'f4');
  const t = d.transkript!;
  t.sprecher = [{ id: 'I', name: 'Interviewerin' }];
  // der Text ist wie in der Datei; abschnitte haben schon die Zeiten
  t.abschnitte[0] = { ...t.abschnitte[0]!, bisMs: 3000 }; t.abschnitte[1] = { ...t.abschnitte[1]!, zeitMs: 3000, bisMs: 5000 };
  return d;
}

describe('strukturierte Quelle: Text wird neu gebaut', () => {
  it('aendereBeitrag ändert nur diesen Inhalt; spätere Positionen rücken nach (Emoji in Codepoints)', () => {
    const d = S(), vorher = JSON.stringify(d);
    const n = aendereBeitrag(d, 1, 'Sehr gut 😀😀.');
    expect(JSON.stringify(d)).toBe(vorher);
    expect(n.text).toBe('I: Wie war das 😀?\n\nB: Sehr gut 😀😀.\n\nI: Aha.');
    expect(sub(n, 1)).toBe('B: Sehr gut 😀😀.');
    expect(sub(n, 2)).toBe('I: Aha.');
    expect(n.transkript!.abschnitte[1]!.zeitMs).toBe(3000);
    istStimmig(n);
  });
  it('mit neuem Sprecher: Kennung im Text wechselt', () => {
    const n = aendereBeitrag(S(), 2, 'Aha.', 'B');
    expect(sub(n, 2)).toBe('B: Aha.');
    expect(n.transkript!.abschnitte[2]!.sprecher).toBe('B');
  });
  it('Leerzeilen im Inhalt werden zu einem Zeilenumbruch (Beitragsgrenzen bleiben)', () => {
    const n = aendereBeitrag(S(), 0, 'a\n\n\nb');
    expect(sub(n, 0)).toBe('I: a\nb');
    expect(n.transkript!.abschnitte).toHaveLength(3);
  });
  it('teileBeitrag: zwei Beiträge derselben Person, Beginn beim ersten, Ende beim zweiten', () => {
    const d = S();
    const stelle = Array.from(d.text).indexOf('U', cp('I: Wie war das 😀?\n\nB: Gut. '));
    const n = teileBeitrag(d, 1, stelle);
    expect(n.transkript!.abschnitte).toHaveLength(4);
    expect(inhaltVon(n, 1)).toBe('Gut.');
    expect(inhaltVon(n, 2)).toBe('Und dann kam der Zug 🚆 mit Wagen.');
    expect(n.transkript!.abschnitte[1]).toMatchObject({ sprecher: 'B', zeitMs: 3000 });
    expect(n.transkript!.abschnitte[1]!.bisMs).toBeUndefined();
    expect(n.transkript!.abschnitte[2]).toMatchObject({ sprecher: 'B', bisMs: 9000 });
    expect(n.transkript!.abschnitte[2]!.zeitMs).toBeUndefined();
    expect(sub(n, 3)).toBe('I: Aha.');
    istStimmig(n);
  });
  it('legeZusammen: Inhalte mit Leerzeichen, Zeit von … bis …', () => {
    const d = teileBeitrag(S(), 1, Array.from(S().text).indexOf('U', 25));
    const n = legeZusammen(d, 1);
    expect(n.text).toBe(S().text);
    expect(n.transkript!.abschnitte[1]).toMatchObject({ zeitMs: 3000, bisMs: 9000 });
    istStimmig(n);
  });
  it('legeZusammen verschiedener Personen wirft', () => {
    expect(() => legeZusammen(S(), 0)).toThrow(/derselben Person/);
    expect(() => legeZusammen(S(), 2)).toThrow();
  });
  it('fuegeBeitragEin: mitten, am Anfang, am Ende', () => {
    const mitte = fuegeBeitragEin(S(), 0, 'B');
    expect(mitte.transkript!.abschnitte).toHaveLength(4);
    expect(sub(mitte, 1)).toBe('B: ');
    expect(sub(mitte, 2)).toBe('B: Gut. Und dann kam der Zug 🚆 mit Wagen.');
    const anfang = fuegeBeitragEin(S(), -1, 'B');
    expect(sub(anfang, 0)).toBe('B: ');
    expect(sub(anfang, 1)).toBe('I: Wie war das 😀?');
    const ende = fuegeBeitragEin(S(), 2, 'I');
    expect(sub(ende, 3)).toBe('I: ');
    for (const x of [mitte, anfang, ende]) istStimmig(x);
  });
  it('unbekannte Person und Stelle außerhalb werfen', () => {
    expect(() => fuegeBeitragEin(S(), 0, 'X')).toThrow(/gibt es in diesem/);
    expect(() => fuegeBeitragEin(S(), 7, 'I')).toThrow();
    expect(() => aendereBeitrag(S(), 9, 'x')).toThrow();
    expect(() => teileBeitrag(S(), 0, 0)).toThrow();
  });
});

describe('Text-Quelle (f4): nur die Stelle ändert sich', () => {
  it('aendereBeitrag lässt Kennung und Marke stehen und verschiebt den Rest', () => {
    const d = f4();
    const n = aendereBeitrag(d, 0, 'Wie war es 😀😀?');
    expect(n.text).toBe('I: Wie war es 😀😀? #00:00:03-0#\n\nI: Nochmal. #00:00:05-0#');
    expect(sub(n, 1)).toBe('I: Nochmal. #00:00:05-0#');
    istStimmig(n);
  });
  it('Sprecherwechsel schreibt die Kennung im Stil des Textes (hier: Kennung aus der Datei)', () => {
    const d = f4(); d.transkript!.sprecher.push({ id: 'B', name: 'Befragte' });
    const n = aendereBeitrag(d, 1, 'Nochmal.', 'B');
    expect(n.text).toBe('I: Frage 😀? #00:00:03-0#\n\nB: Nochmal. #00:00:05-0#');
    expect(n.transkript!.abschnitte[1]!.sprecher).toBe('B');
    istStimmig(n);
  });
  it('teileBeitrag und legeZusammen: Hin und zurück ergibt den gleichen Text', () => {
    const d = f4();
    const stelle = cp('I: Nochmal') - 0 + cp('I: Frage 😀? #00:00:03-0#\n\n') - cp('I: Nochmal') + cp('I: Noch');
    const g = teileBeitrag(d, 1, stelle);
    expect(g.text).toBe('I: Frage 😀? #00:00:03-0#\n\nI: Noch\n\nI: mal. #00:00:05-0#');
    expect(g.transkript!.abschnitte).toHaveLength(3);
    istStimmig(g);
    // Leerzeichen entfernt ("Noch" + "mal.") ergibt zusammengelegt "Noch mal.": der Text ist ein anderer, aber Struktur und Marke bleiben
    const z = legeZusammen(g, 1);
    expect(z.text).toBe('I: Frage 😀? #00:00:03-0#\n\nI: Noch mal. #00:00:05-0#');
    expect(z.transkript!.abschnitte[1]).toMatchObject({ zeitMs: 3000, bisMs: 5000 });
    istStimmig(z);
  });
  it('fuegeBeitragEin verschiebt alle folgenden Positionen', () => {
    const d = f4();
    const n = fuegeBeitragEin(d, 0, 'I');
    expect(n.text).toBe('I: Frage 😀? #00:00:03-0#\n\nI: \n\nI: Nochmal. #00:00:05-0#');
    expect(sub(n, 2)).toBe('I: Nochmal. #00:00:05-0#');
    istStimmig(n);
    const a = fuegeBeitragEin(d, -1, 'I');
    expect(a.text.startsWith('I: \n\nI: Frage')).toBe(true);
    expect(sub(a, 1)).toBe('I: Frage 😀? #00:00:03-0#');
    istStimmig(a);
  });
});

describe('Sperre durch Segmente', () => {
  it('mit Segmenten wirft jede Funktion, das Dokument bleibt unverändert', () => {
    const d = S(), vorher = JSON.stringify(d), opt = { segmenteVorhanden: true };
    expect(() => aendereBeitrag(d, 0, 'x', undefined, opt)).toThrow(/gesperrt/);
    expect(() => teileBeitrag(d, 1, 25, opt)).toThrow(/gesperrt/);
    expect(() => legeZusammen(d, 1, opt)).toThrow(/gesperrt/);
    expect(() => fuegeBeitragEin(d, 0, 'I', opt)).toThrow(/gesperrt/);
    expect(JSON.stringify(d)).toBe(vorher);
  });
});
