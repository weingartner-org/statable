import { describe, it, expect } from 'vitest';
import de from './messages.de.json';
import en from './messages.en.json';
import { erklaerungen, meldungsRegeln, rueckfallText, ladeTexte, hatTexte } from './texte';
import { artikelListe } from '../hilfe/artikel';

type Datei = typeof de;
/** Alle weiteren Sprachdateien (messages.<code>.json), sobald es welche gibt. */
const fremd = import.meta.glob<Datei>(['./messages.*.json', '!./messages.de.json', '!./messages.en.json'], { eager: true, import: 'default' });
const texte = (x: unknown): string[] => (typeof x === 'string' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(texte) : []);

/** Gleicher Aufbau wie die deutsche Datei: dieselben Schlüssel, `muster` und `original` unverändert, jeder Text eine nichtleere Zeichenkette. */
function pruefeAufbau(name: string, f: Datei) {
  describe(name, () => {
    it('Erklärungen: dieselben Begriffe und Felder', () => {
      expect(Object.keys(f.erklaer)).toEqual(Object.keys(de.erklaer));
      for (const [k, e] of Object.entries(f.erklaer)) {
        const d = (de.erklaer as Record<string, Record<string, unknown>>)[k]!;
        // `fachwoerter` und `statable` sind in Fremdsprachen freiwillig (fehlt es, gilt die englische Fassung).
        const frei = (n: string) => n !== 'fachwoerter' && n !== 'statable';
        expect(Object.keys(e).filter(frei).sort(), k).toEqual(Object.keys(d).filter(frei).sort());
        for (const n of ['titel', 'kurz', 'beispiel', 'vorsicht']) if (n in d) expect(typeof (e as Record<string, unknown>)[n] === 'string' && ((e as unknown as Record<string, string>)[n]!).trim() !== '', `${k}.${n}`).toBe(true);
        if ('pruefen' in d) expect((e as Record<string, unknown>).pruefen, k).toBe(d.pruefen);
      }
    });
    it('Meldungen: gleiche Regeln in gleicher Reihenfolge, muster und original unverändert', () => {
      expect(f.meldung.map(m => m.id)).toEqual(de.meldung.map(m => m.id));
      f.meldung.forEach((m, i) => {
        const d = de.meldung[i]!;
        expect(m.muster, m.id).toBe(d.muster);
        expect(m.original, m.id).toBe(d.original);
        expect(m.art, m.id).toBe(d.art);
        expect(Object.keys(m).sort(), m.id).toEqual(Object.keys(d).sort());
        for (const x of texte({ t: m.titel, a: m.text, b: m.tun })) expect(x.trim(), m.id).not.toBe('');
        expect(Object.keys(m.text).sort(), m.id).toEqual(['du', 'sie']);
        expect(Object.keys(m.tun).sort(), m.id).toEqual(['du', 'sie']);
      });
    });
    it('Rückfall: dieselben Felder', () => {
      expect(Object.keys(f.rueckfall).sort()).toEqual(Object.keys(de.rueckfall).sort());
      for (const x of texte(f.rueckfall)) expect(x.trim()).not.toBe('');
    });
    it('Platzhalter {1}, {vorschlag} … kommen in beiden Fassungen gleich vor', () => {
      f.meldung.forEach((m, i) => {
        const platz = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
        const d = de.meldung[i]!;
        expect(platz(m.text.du + m.tun.du), m.id).toBe(platz(d.text.du + d.tun.du));
      });
    });
  });
}

pruefeAufbau('messages.en.json', en as unknown as Datei);
for (const [pfad, f] of Object.entries(fremd)) pruefeAufbau(pfad.replace('./', ''), f);

describe('Texte in der Sprache', () => {
  it('Deutsch und Englisch sind fest eingebunden', () => {
    expect(erklaerungen('de')).toBe(de.erklaer);
    expect(erklaerungen('en')).toBe(en.erklaer);
    expect(meldungsRegeln('de')).toBe(de.meldung);
    expect(rueckfallText('en')).toBe(en.rueckfall);
  });
  it('eine Sprache ohne Datei fällt auf Englisch zurück (auch nach dem Laden)', async () => {
    expect(hatTexte('xx')).toBe(false);
    await ladeTexte('xx');
    expect(erklaerungen('xx')).toBe(en.erklaer);
    expect(meldungsRegeln('xx')).toBe(en.meldung);
    expect(artikelListe('xx').length).toBe(artikelListe('en').length);
  });
});

describe('Lücken in einer Sprachdatei füllt das Englische', () => {
  it('fehlende Felder, Regeln und Anreden bleiben englisch, muster/original unverändert', async () => {
    const { mische } = await import('./texte');
    const k = Object.keys(en.erklaer)[0]!, m0 = en.meldung[0]!;
    const t = mische({ erklaer: { [k]: { titel: 'Titel' } as never }, meldung: [{ id: m0.id, muster: 'GEÄNDERT', titel: 'Meldung', text: 'Eine Fassung' }], rueckfall: { titel: 'Nichts' } });
    const e = (t.erklaer as unknown as Record<string, Record<string, string>>)[k]!;
    expect(e.titel).toBe('Titel');
    expect(e.kurz).toBe((en.erklaer as unknown as Record<string, Record<string, string>>)[k]!.kurz);
    expect(t.meldung[0]!.muster).toBe(m0.muster);
    expect(t.meldung[0]!.titel).toBe('Meldung');
    expect(t.meldung[0]!.text).toEqual({ du: 'Eine Fassung', sie: 'Eine Fassung' });
    expect(t.meldung[0]!.tun).toEqual(m0.tun);
    expect(t.meldung[1]).toEqual(en.meldung[1]);
    expect(t.rueckfall.titel).toBe('Nichts');
    expect(t.rueckfall.text).toEqual(en.rueckfall.text);
  });
});
