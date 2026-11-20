/**
 * Streudiagramm in Üben-Fragen: Bild und Textfassung (Daten als Tabelle) sagen dasselbe; Barrierefreiheit; Wächter für künftige Diagramm-Fragen.
 * Gerendert wird auf dem Server (svelte/server), dort fehlt kein jsdom.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import FrageDiagramm from './FrageDiagramm.svelte';
import { THEMEN, ladeThema, type Diagramm, type Frage } from '../lernen/fragen';
import { diag } from '../lernen/fragen-bau';
import { P } from '../i18n/laufzeit';
import { bereiche, geradenEnden, textfassung, form, markenPfad, gruppenZahl } from '../lib/fragediagramm';

const bsp = (): Diagramm => ({
  art: 'streu', titel: P('Lernzeit und Note (Regression)', 'Study time and grade (regression)'),
  x: P('Lernzeit (Stunden)', 'Study time (hours)'), y: P('Punkte im Test', 'Test score'),
  gruppen: [P('Kurs A', 'Course A'), P('Kurs B', 'Course B')],
  punkte: [[1, 2.5, 0], [2, 3.5, 0], [3, 5, 0], [4, 5.5, 0], [1, 6, 1], [2, 5.5, 1], [3, 4, 1], [4, 3.5, 1]],
  geraden: [{ a: 1.5, b: 1, gruppe: 0 }, { a: 7.5, b: -1, gruppe: 1 }],
  kurz: P('Zwei Gruppen: in Kurs A steigen die Punkte mit der Lernzeit, in Kurs B fallen sie.', 'Two groups: in course A the scores rise with study time, in course B they fall.'),
  quelle: P('Beispieldaten, erfunden', 'Example data, made up')
});
const html = (d: Diagramm) => render(FrageDiagramm, { props: { d } }).body.replace(/ ?svelte-\w+/g, '').replace(/ class=""/g, '');

describe('FrageDiagramm', () => {
  it('Bild hat Rolle img und einen Namen; die Textfassung ist aufklappbar und kommt dazu', () => {
    const h = html(bsp());
    expect(h).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Streudiagramm: Punkte im Test gegen Lernzeit \(Stunden\), n = 8 in 2 Gruppen/);
    expect(h).toContain('<details');
    expect(h).toContain('Beschreibung und Daten</summary>');
    expect(h).toContain('Zwei Gruppen: in Kurs A steigen die Punkte mit der Lernzeit, in Kurs B fallen sie.');
    expect(h).toContain('<caption>Lernzeit und Note (Regression)</caption>');
    expect(h).toContain('Beispieldaten, erfunden');
  });
  it('die Tabelle hat Kopfzeilen mit scope und eine Zeile je Punkt, mit Gruppe', () => {
    const h = html(bsp());
    const tabelle = h.slice(h.indexOf('<table'), h.indexOf('</table>'));
    expect(tabelle.match(/<th scope="col">/g)).toHaveLength(3);
    expect(tabelle.match(/<th scope="row">/g)).toHaveLength(8);
    expect(tabelle).toMatch(/<th scope="col">(<!--\[\d-->)?Lernzeit \(Stunden\)(<!--\]-->)?<\/th>/);
    expect(tabelle).toContain('>Kurs B</th>');
    expect(tabelle).toContain('<td>5,5</td>');
  });
  it('Textfassung nennt Achsen, Gruppen, Zahl der Punkte und die Geraden mit Achsenabschnitt und Steigung', () => {
    const t = textfassung(bsp());
    const alles = t.saetze.join(' ');
    expect(alles).toContain('8 Punkten');
    expect(alles).toContain('Waagrechte Achse: Lernzeit (Stunden), Werte von 1 bis 4.');
    expect(alles).toContain('Senkrechte Achse: Punkte im Test, Werte von 2,5 bis 6.');
    expect(alles).toContain('Gruppe Kurs A: 4 Punkte.');
    expect(alles).toContain('Regressionsgerade (Gerade der besten Anpassung) für Gruppe Kurs B: Achsenabschnitt 7,50, Steigung −1,00.');
    expect(t.zeilen).toHaveLength(8);
    expect(t.kopf).toEqual(['Nr.', 'Gruppe', 'Lernzeit (Stunden)', 'Punkte im Test']);
  });
  it('Farbe steht nie allein: jede Gruppe hat eine andere Form, die Legende nennt Namen und Geraden', () => {
    const h = html(bsp());
    expect([0, 1, 2, 3].map(form)).toEqual(['kreis', 'quadrat', 'dreieck', 'raute']);
    expect(h).toContain('<circle');
    expect(h).toMatch(/<path d="M[^"]+Z"/);
    expect(h).toContain('aria-label="Legende"');
    expect(h).toContain('<span>Kurs A</span>');
    expect(h).toContain('<span>Regressionsgerade (Kurs B)</span>');
    expect(h).toContain('stroke-dasharray="8 5"');   // Gerade der zweiten Gruppe gestrichelt
    expect(markenPfad('quadrat', 10, 10, 5)).toMatch(/^M5\.00 5\.00L15\.00 5\.00/);
  });
  it('ohne Gruppen und Gerade: ein Kreis je Punkt, keine Legende, Tabelle ohne Gruppenspalte', () => {
    const d: Diagramm = { art: 'streu', x: P('Größe', 'Height'), y: P('Gewicht', 'Weight'), punkte: [[150, 50], [160, 58], [170, 66]], kurz: P('Drei Punkte steigen.', 'Three points rise.'), quelle: P('Beispiel', 'Example') };
    const h = html(d);
    expect(h.match(/<circle/g)).toHaveLength(3);
    expect(h).not.toContain('Legende');
    expect(textfassung(d).kopf).toEqual(['Nr.', 'Größe', 'Gewicht']);
    expect(gruppenZahl(d)).toBe(0);
  });
  it('Achsen umfassen alle Punkte und die Enden der Geraden; die Gerade reicht von der ersten bis zur letzten Stelle ihrer Gruppe', () => {
    const d = bsp();
    const b = bereiche(d);
    expect(b.xb[0]).toBeLessThanOrEqual(1); expect(b.xb[1]).toBeGreaterThanOrEqual(4);
    expect(b.yb[0]).toBeLessThanOrEqual(2.5); expect(b.yb[1]).toBeGreaterThanOrEqual(6);
    expect(geradenEnden(d)[1]).toEqual({ x0: 1, y0: 6.5, x1: 4, y1: 3.5, gruppe: 1 });
  });
  it('die Breite richtet sich nach dem Platz: viewBox statt fester Breite, keine Media Query, kein seitliches Scrollen des Bildes', () => {
    const quelle = readFileSync(new URL('./FrageDiagramm.svelte', import.meta.url), 'utf8');
    expect(quelle).not.toMatch(/@media|max-width\s*:\s*\d+px\)/);
    expect(quelle).toContain('class="diagramm"');
    expect(quelle).toContain('viewBox=');
    expect(html(bsp())).toMatch(/viewBox="0 0 560 \d+"/);
  });
});

describe('diag() in fragen-bau.ts', () => {
  it('unbekannter Schlüssel ist ein Fehler (keine Zahl von Hand)', () => {
    expect(() => diag('gibt-es-nicht', { x: P('a', 'a'), y: P('b', 'b'), kurz: P('k', 'k'), quelle: P('q', 'q') })).toThrow(/kein Diagramm/);
  });
});

describe('Wächter für künftige Diagramm-Fragen', () => {
  it('Gruppen höchstens 4, Punkte und Geraden gültig, Kurzbeschreibung und Quelle in beiden Sprachen mit Sprachschlüssel', async () => {
    const module = await Promise.all(THEMEN.filter(t => t.n > 0).map(t => ladeThema(t.id)));
    const alle: { id: string; d: Diagramm }[] = [];
    for (const m of module) {
      for (const f of m.FRAGEN as Frage[]) if (f.diagramm) alle.push({ id: f.id, d: f.diagramm });
      for (const [k, v] of Object.entries(m.FAELLE ?? {})) for (const d of v.diagramme ?? []) alle.push({ id: `Fall ${k}`, d });
    }
    for (const { id, d } of alle) {
      const n = gruppenZahl(d);
      expect(n, id).toBeLessThanOrEqual(4);
      expect(d.punkte.length, id).toBeGreaterThan(1);
      for (const z of d.punkte) { expect(z.length, id).toBe(n ? 3 : 2); expect(z.every(Number.isFinite), id).toBe(true); if (n) expect(z[2]! < n, id).toBe(true); }
      for (const g of d.geraden ?? []) { expect(Number.isFinite(g.a) && Number.isFinite(g.b), id).toBe(true); if (g.gruppe !== undefined) expect(g.gruppe < n, id).toBe(true); }
      for (const p of [d.x, d.y, d.kurz, d.quelle, ...(d.titel ? [d.titel] : []), ...(d.gruppen ?? [])]) { expect(p.k, `${id}: ${p.en}`).toBeTruthy(); expect(p.de.trim().length, id).toBeGreaterThan(1); expect(p.en.trim().length, id).toBeGreaterThan(1); }
      expect(html(d), id).toContain('<summary>');
    }
  });
});
