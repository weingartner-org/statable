/** Wächter Usability Stufe 8 (Quelltext-Prüfung): Beispiele, Rechner und Regler, Einstellungen mit Sprungleiste. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const lies = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

describe('Beispiele', () => {
  const q = lies('seiten/Beispiele.svelte');
  it('genau ein Hauptknopf je Karte', () => {
    expect((q.match(/class="k haupt"/g) ?? []).length).toBe(1);
    expect(q).toContain('aria-describedby="t-{b.id}"');
  });
  it('Route beispiele/<id> und Lernsuche verlinkt darauf', () => {
    expect(lies('App.svelte')).toContain('<Beispiele {teil} />');
    expect(lies('lernen/lernsuche.ts')).toContain("'#beispiele/' + b.id");
  });
  it('Fächer als h2 mit Zahl, Kartentitel h3, Einstieg als Vorgabe', () => {
    expect(q).toMatch(/<h2 id="g-\{g\.f\.id\}"/);
    expect(q).toMatch(/<h3 id="t-\{b\.id\}"/);
    expect(q).toContain('s.einst.profi ? 0 : 1');
  });
});

describe('Rechner und Regler', () => {
  const q = lies('seiten/Verstehen.svelte');
  const ueb = q.slice(q.indexOf('<LernSuche'));
  it('11 Kachel-Links, zwei h2, kein Link „Öffnen“', () => {
    expect((ueb.match(/<h3><a href="#verstehen\//g) ?? []).length).toBe(11);
    expect((ueb.match(/<h2 id="vs-/g) ?? []).length).toBe(2);
    expect(ueb).not.toContain("L('Öffnen', 'Open')");
  });
});

describe('Einstellungen', () => {
  const q = lies('seiten/Einstellungen.svelte');
  it('nav mit 5 Einträgen, Überschriften fokussierbar', () => {
    expect((q.match(/<nav /g) ?? []).length).toBe(1);
    expect((q.match(/\{ id: 'ez-/g) ?? []).length).toBe(5);
    expect((q.match(/<h2 id="ez-[a-z]+" tabindex="-1">/g) ?? []).length).toBe(5);
    expect(q).toContain('e.preventDefault()');
  });
  it('Zahl der Einstellungen je Gruppe stimmt mit dem Markup', () => {
    const teile = q.split('<section class="ez-gruppe"').slice(1);
    const n = teile.slice(0, 5).map(x => (x.slice(0, x.indexOf('</section>')).match(/class="ez-zeile/g) ?? []).length);
    expect(n).toEqual([2, 3, 9, 2, 1]);
  });
});
