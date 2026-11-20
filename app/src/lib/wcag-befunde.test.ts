import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* Rücktests zu docs/WCAG-PRUEFUNG-2026-10-31.md. Das Verhalten selbst ist im Browser nachgemessen; hier soll nur nichts zurückfallen. */
const lies = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('WCAG-Befunde bleiben behoben', () => {
  it('2.5.8: das Schließen-Kreuz am Reiter hat mindestens 24 px, auch bei verkleinerter Schrift', () => {
    const zeile = lies('../stil/app.css').split('\n').find(z => z.startsWith('.reiter-zu{'))!;
    expect(zeile).toContain('width:max(1.5rem,24px)');
    expect(zeile).toContain('height:max(1.5rem,24px)');
  });
  it('1.4.13: die Hinweisblase nimmt die Maus an und verschwindet nicht sofort', () => {
    const t = lies('../bausteine/Tipp.svelte');
    expect(t).not.toContain('pointer-events: none');
    expect(t).toContain('blase?.contains(ev.target as Node)');
    expect(t).toContain('setTimeout(weg, NACHLAUF)');
  });
  it('2.1.4: die Hilfe hat kein Kürzel aus einer einzelnen Taste', () => {
    const t = lies('../seiten/Hilfe.svelte');
    expect(t).toContain("!(e.ctrlKey || e.metaKey)");
    expect(t).not.toContain('Taste „/“');
    expect(lies('../hilfe/artikel.ts')).not.toContain('Taste „/“');
  });
});

describe('WCAG-Befunde, zweite Runde (31.10.)', () => {
  it('1.3.1: die Daten-Tabelle hat einen Namen und weiß, dass nur ein Ausschnitt gezeichnet wird', () => {
    const t = lies('../seiten/Daten.svelte');
    expect(t).toContain('id="daten-region"');
    expect(t).toContain('aria-labelledby="daten-region"');
    expect(t).toContain('aria-rowcount={s.zeilen.length + 1}');
    expect(t).toContain('aria-rowindex={r + 2}');
    expect(t).toContain('<tr aria-rowindex={1}>');
  });
  it('1.3.1: im Kopf „Namen“ steht die lange Bezeichnung auch für Screenreader im Text, nicht nur im Hinweis', () => {
    expect(lies('../seiten/Daten.svelte')).toMatch(/<span class="nur-vorleser"> \{`\$\{lesbar\(sp\)\}/);
  });
  it('2.2.2: weniger Bewegung gilt zentral; nur die Lade-Punkte pulsieren ruhig weiter', () => {
    const css = lies('../stil/app.css');
    expect(css).toContain('@media (prefers-reduced-motion:reduce){*:not(.p)');
    expect(css).toContain('animation-duration:.01ms!important');
    expect(css).toContain('transition-duration:.01ms!important');
    expect(lies('../bausteine/Rechnet.svelte')).toContain('@keyframes still');
  });
  it('2.2.1: Fehlermeldungen bleiben, bis man sie schließt; die übrigen halten bei Maus und Fokus an', () => {
    const t = lies('../lib/sitzung.svelte.ts');
    expect(t).toContain('if (!bleibt) meldungStart(m.id');
    expect(t).toContain('export const meldeFehler');
    expect(t).toContain('?.bleibt) meldungStart(id, 5000)');
    const a = lies('../App.svelte');
    expect(a).toContain('onfocusin={() => haltMeldung(m.id, true)}');
    expect(a).toContain("e.key === 'Escape'");
    for (const d of ['../seiten/Beispiele.svelte', '../seiten/Umformen.svelte', '../bausteine/Projektmenue.svelte']) expect(lies(d)).toContain('meldeFehler(');
  });
  it('4.1.2: ein Element mit Hinweis verweist beim Fokus per aria-describedby auf denselben Text', () => {
    const t = lies('../bausteine/Tipp.svelte');
    expect(t).toContain("e.setAttribute('aria-describedby', BESCHR_ID)");
    expect(t).toContain("e.hasAttribute('aria-describedby')");
    expect(t).toContain('id="tipp-beschreibung" class="nur-vorleser"');
    expect(t).not.toMatch(/\btitle=/);
  });
  it('1.4.12: der Titel auf der Daten-Seite bricht um, statt mit „…“ abgeschnitten zu werden', () => {
    const z = lies('../stil/app.css').split('\n').find(x => x.startsWith('.daten-kopf h1{'))!;
    expect(z).toContain('overflow-wrap:anywhere');
    expect(z).not.toContain('text-overflow');
    expect(z).not.toContain('nowrap');
  });
});
