/* Aufzählungen von Fragen mit Wortlaut werden zur Liste (Johannes 13.11.2026). */
import { describe, expect, it } from 'vitest';
import { teileItems } from './item-liste';
import { THEMEN, ladeThema } from '../lernen/fragen';

describe('teileItems', () => {
  it('Fall der Faktorenanalyse: elf Items als Liste, Text davor und danach bleibt', () => {
    const t = teileItems('Elf Items: A1 „Kalt“, A2 „Frage nach“, A3 „Trösten“ und O5 „Grund“. Geplant sind zwei Skalen.');
    expect(t).toEqual([{ art: 'text', t: 'Elf Items:' }, { art: 'liste', eintraege: ['A1 „Kalt“', 'A2 „Frage nach“', 'A3 „Trösten“', 'O5 „Grund“'] }, { art: 'text', t: 'Geplant sind zwei Skalen.' }]);
  });
  it('englisch, nummeriert ohne Komma, zwei Läufe', () => {
    expect(teileItems('Items: E1 "a", E2 "b" and E3 "c".')[1]).toEqual({ art: 'liste', eintraege: ['E1 "a"', 'E2 "b"', 'E3 "c"'] });
    expect(teileItems('Sechs Fragen: 1 „A.“ 2 „B.“ 3 „C.“ Was passt?')).toHaveLength(3);
    expect(teileItems('aus A1 „a“, A2 „b“ und A3 „c“; dazu N2 „d“, N3 „e“ und N4 „f“.').filter(x => x.art === 'liste')).toHaveLength(2);
  });
  it('zwei genannte Items bleiben Fließtext', () => {
    expect(teileItems('E1 lautet „redet wenig“, E3 „fesselt“.')).toHaveLength(1);
  });
  it('alle Fragen: nichts geht verloren', async () => {
    const mods = await Promise.all(THEMEN.filter(t => t.n > 0).map(t => ladeThema(t.id)));
    const texte = mods.flatMap(m => [...m.FRAGEN.map(f => f.stamm), ...Object.values(m.FAELLE ?? {}).map(x => x!.titel)]).flatMap(p => [p.de, p.en]);
    let listen = 0;
    const ohne = (s: string) => s.replace(/[\s.,;:]/gu, '');
    for (const s of texte) {
      const t = teileItems(s);
      listen += t.filter(x => x.art === 'liste').length;
      const zusammen = t.map(x => (x.art === 'text' ? x.t : x.eintraege.join(''))).join('');
      expect(ohne(zusammen).length, s).toBeGreaterThanOrEqual(ohne(s).length - 12);
    }
    expect(listen).toBeGreaterThan(5);
  });
});
