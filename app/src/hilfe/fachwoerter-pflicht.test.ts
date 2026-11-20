import { describe, it, expect } from 'vitest';
import pflicht from './fachwoerter-pflicht.json';
import de from '../lib/messages.de.json';
import en from '../lib/messages.en.json';
import { artikelListe } from './artikel';

/**
 * Wächter zur Regel „Fachbegriffe bleiben“ (docs/fachblaetter/LEXIKON-STIL.md, Johannes 31.10.):
 * Jedes Wort der Pflichtliste stand im alten Text und muss im Begriff oder Artikel auf Deutsch vorkommen,
 * erklärt - bei Begriffen im Haupttext oder im Feld `fachwoerter`.
 */
const klein = (s: string) => s.toLowerCase();
const erkl = de.erklaer as Record<string, Record<string, unknown>>;
const erklEn = en.erklaer as Record<string, Record<string, unknown>>;

describe('Fachwörter-Pflicht', () => {
  it('Begriffe A-Z: jedes Pflichtwort steht im Text oder in den Fachwörtern (Deutsch)', () => {
    for (const [k, ws] of Object.entries(pflicht.begriffe)) {
      const e = erkl[k];
      expect(e, `Begriff ${k}`).toBeDefined();
      const text = klein(['titel', 'kurz', 'beispiel', 'vorsicht', 'fachwoerter'].map(f => String(e![f] ?? '')).join(' '));
      for (const w of ws) expect(text, `${k}: ${w}`).toContain(klein(w));
    }
  });
  it('Artikel: jedes Pflichtwort steht im Titel oder Text (Deutsch)', () => {
    const liste = artikelListe('de');
    for (const [id, ws] of Object.entries(pflicht.artikel)) {
      const a = liste.find(x => x.id === id);
      expect(a, `Artikel ${id}`).toBeDefined();
      const text = klein(a!.titel + ' ' + JSON.stringify(a!.inhalt));
      for (const w of ws) expect(text, `${id}: ${w}`).toContain(klein(w));
    }
  });
  it('Englisch hat `fachwoerter`, wo Deutsch eines hat (und umgekehrt), als nichtleere Zeichenkette', () => {
    for (const [k, e] of Object.entries(erkl)) {
      const hat = 'fachwoerter' in e;
      expect('fachwoerter' in erklEn[k]!, `${k}: Englisch`).toBe(hat);
      if (hat) for (const f of [e.fachwoerter, erklEn[k]!.fachwoerter]) expect(typeof f === 'string' && f.trim().length > 20, k).toBe(true);
    }
  });
  it('Die Pflichtliste nennt nur vorhandene Begriffe, und Fachwörter haben keine langen Striche', () => {
    for (const k of Object.keys(pflicht.begriffe)) expect(erkl[k], k).toBeDefined();
    for (const e of [...Object.values(erkl), ...Object.values(erklEn)]) if (e.fachwoerter) expect(String(e.fachwoerter)).not.toMatch(/[–—]/);
  });
});
