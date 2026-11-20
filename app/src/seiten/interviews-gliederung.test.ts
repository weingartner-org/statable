/**
 * U1 Teil 2 (14.11.2026): Wächter für die Gliederung der Seite „Interviews“.
 * - Jedes Ziel der Sprungleiste und jedes Sprungziel aus dem Kodier-Arbeitsplatz (`#interviews/<id>`) gibt es auf der Seite.
 * - Die Sprungleiste bleibt kurz (höchstens vier Gruppen, R10).
 * - Alle elf Bereiche stehen in genau einer der vier Gruppen.
 * - Die Transkript-Zeile hat den Knopf „Kodieren“, und der Kodier-Arbeitsplatz versteht `#kodieren/dokument/<id>`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lies = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const seite = lies('./Interviews.svelte');
const kodieren = lies('./Kodieren.svelte');
const transkript = lies('../bausteine/TranskriptEinlesen.svelte');

const ids = new Set([...seite.matchAll(/\bid="([^"{]+)"/g)].map(m => m[1]));

describe('Seite „Interviews“: Gliederung (U1 Teil 2)', () => {
  it('jedes Ziel der Sprungleiste gibt es, und es sind höchstens vier', () => {
    const nav = seite.slice(seite.indexOf('<nav class="sprung"'), seite.indexOf('</nav>'));
    const ziele = [...nav.matchAll(/zuStelle\('([^']+)'\)/g)].map(m => m[1]);
    expect(ziele.length).toBeGreaterThan(0);
    expect(ziele.length).toBeLessThanOrEqual(4);
    for (const z of ziele) expect(ids.has(z), z).toBe(true);
  });

  it('Sprungziele aus dem Kodier-Arbeitsplatz gibt es auf der Seite und in SPRUNGZIELE', () => {
    const aus = [...kodieren.matchAll(/location\.hash = 'interviews\/([^']+)'/g)].map(m => m[1]);
    expect(aus.length).toBeGreaterThan(0);
    const liste = seite.match(/const SPRUNGZIELE = \[([^\]]*)\]/)![1];
    for (const z of aus) { expect(ids.has(z), z).toBe(true); expect(liste.includes(`'${z}'`), z).toBe(true); }
  });

  it('elf Bereiche in vier Gruppen, jeder genau einmal', () => {
    const gruppen = seite.split('<section class="gruppe"').slice(1);
    expect(gruppen.length).toBe(4);
    const bereiche = gruppen.flatMap(g => [...g.matchAll(/<h2 id="(iv-[a-z]+-t)"/g)].map(m => m[1]));
    expect(bereiche.length).toBe(11);
    expect(new Set(bereiche).size).toBe(11);
    for (const g of gruppen) expect(g).toMatch(/aria-labelledby="iv-g-[a-z]+"/);
  });

  it('Knopf „Kodieren“ je Transkript und Ziel #kodieren/dokument/<id>', () => {
    expect(transkript).toContain("location.hash = 'kodieren/dokument/' + encodeURIComponent(z.id)");
    expect(kodieren).toContain("teil.startsWith('dokument/')");
  });
});
