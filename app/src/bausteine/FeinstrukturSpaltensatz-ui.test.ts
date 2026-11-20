/** Stufe A4: Baustein Spaltensatz (auf dem Server gerendert): Auswahl, Schalter, Editor; keine eigene Live-Region. */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { iv } from '../lib/interviews.svelte';
import { neuesQualProjekt } from '../lib/qualprojekt';
import { eigeneSpalte, neuerEigenerSatz } from '../lib/feinstruktur-spalten';
import FeinstrukturSpaltensatz from './FeinstrukturSpaltensatz.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'sie';
const html = (props: Record<string, unknown> = {}): string =>
  (render(FeinstrukturSpaltensatz as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '').replace(/<!--[^>]*-->/g, '');

describe('Spaltensatz (Baustein)', () => {
  it('ohne Projekt: Legende, drei Radios, Kästchen mit Label, kein Live-Bereich', () => {
    iv.qualEntwurf = undefined;
    const h = html({ wahl: 'feinstruktur', verdecken: true });
    expect(h).toContain('<legend>Spalten der Deutung (Spaltensatz)</legend>');
    expect((h.match(/type="radio"/g) ?? []).length).toBe(3);
    expect(h).toMatch(/type="radio"[^>]*value="feinstruktur"[^>]*checked/);
    expect(h).toContain('Spalten: Paraphrase, Intentionen');
    expect(h).toMatch(/<input[^>]*type="checkbox"[^>]*id="[^"]*-verdecken"[^>]*checked/);
    expect(h).toContain('Folgetext verdecken (nicht vorauslesen)');
    expect(h).toContain('der Rest ist nicht auf der Seite');
    expect(h).toContain('Eigenen Spaltensatz anlegen oder bearbeiten');
    expect(h).toContain('<legend>Spalte 1</legend>');
    expect(h).toContain('Leitfragen (eine je Zeile, freiwillig)');
    expect(h).not.toContain('role="alert"');
    expect(h).not.toContain('role="status"');
    expect(h).not.toContain('aria-live');
  });
  it('verdecken aus: Kästchen nicht angehakt, ganzer Ausschnitt sichtbar', () => {
    iv.qualEntwurf = undefined;
    const h = html({ wahl: 'ipa', verdecken: false });
    expect(h).not.toMatch(/type="checkbox"[^>]*id="[^"]*-verdecken"[^>]*checked/);
    expect(h).toContain('Beim Deuten ist der ganze Ausschnitt sichtbar.');
    expect(h).toMatch(/type="radio"[^>]*value="ipa"[^>]*checked/);
  });
  it('mit eigenem Satz im Projekt: vierter Radio mit „(eigener Satz)“', () => {
    const sp = eigeneSpalte('Strukturhypothese', 'Was folgt?\nWas nicht?');
    const satz = neuerEigenerSatz('Meine Hermeneutik', 'Objektive Hermeneutik', sp);
    iv.qualEntwurf = { ...neuesQualProjekt('T'), spaltensaetze: [satz] };
    const h = html();
    expect((h.match(/type="radio"/g) ?? []).length).toBe(4);
    expect(h).toContain('Meine Hermeneutik (eigener Satz)');
    expect(h).toContain('Spalten: Strukturhypothese');
    expect(h).toContain('Spaltensatz</option>'.slice(0, 0) + 'Meine Hermeneutik</option>');
    iv.qualEntwurf = undefined;
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    iv.qualEntwurf = undefined;
    const h = html();
    s.einst.sprache = 'de';
    expect(h).toContain('Columns of the interpretation (column set)');
    expect(h).toContain('Hide the following text (do not read ahead)');
    expect(h).toContain('Create or edit your own column set');
    expect(h).toContain('<legend>Column 1</legend>');
    expect(h).not.toContain('aria-live');
  });
});
